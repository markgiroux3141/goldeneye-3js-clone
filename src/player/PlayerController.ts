import * as THREE from 'three';
import type RAPIER_API from '@dimforge/rapier3d-compat';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { FPSCamera } from './FPSCamera';
import { InputManager } from '../core/InputManager';

const MOVE_SPEED = 8;
const JUMP_VELOCITY = 6;
const GRAVITY = -20;
const EYE_HEIGHT = 0.7;

export class PlayerController {
  private rigidBody: RAPIER_API.RigidBody;
  private collider: RAPIER_API.Collider;
  private verticalVelocity = 0;
  private isGrounded = false;
  private jumping = false;

  // Pre-allocated scratch vectors (F1: avoid per-frame allocation)
  private readonly _forward = new THREE.Vector3();
  private readonly _right = new THREE.Vector3();
  private readonly _move = new THREE.Vector3();
  private _movementOverride: { x: number; z: number } | null = null;
  private _analogForward = 0;
  private _analogStrafe = 0;

  constructor(
    private physicsWorld: PhysicsWorld,
    private fpsCamera: FPSCamera,
    private input: InputManager,
    private camera: THREE.PerspectiveCamera,
    private RAPIER: typeof RAPIER_API
  ) {
    this.rigidBody = physicsWorld.createKinematicBody(0, 2, 0);
    const colliderDesc = RAPIER.ColliderDesc.capsule(0.6, 0.3);
    this.collider = physicsWorld.world.createCollider(colliderDesc, this.rigidBody);
  }

  getPosition(): { x: number; y: number; z: number } {
    const pos = this.rigidBody.translation();
    return { x: pos.x, y: pos.y + EYE_HEIGHT, z: pos.z };
  }

  getRawBodyPosition(): { x: number; y: number; z: number } {
    const pos = this.rigidBody.translation();
    return { x: pos.x, y: pos.y, z: pos.z };
  }

  getGrounded(): boolean {
    return this.isGrounded;
  }

  getVerticalVelocity(): number {
    return this.verticalVelocity;
  }

  getCollider(): RAPIER_API.Collider {
    return this.collider;
  }

  setMovementOverride(dirX: number, dirZ: number): void {
    const len = Math.sqrt(dirX * dirX + dirZ * dirZ);
    if (len > 0) {
      this._movementOverride = { x: dirX / len, z: dirZ / len };
    } else {
      this._movementOverride = null;
    }
  }

  clearMovementOverride(): void {
    this._movementOverride = null;
  }

  setAnalogMovement(forward: number, strafe: number): void {
    this._analogForward = forward;
    this._analogStrafe = strafe;
  }

  teleportTo(x: number, y: number, z: number): void {
    this.rigidBody.setTranslation({ x, y, z }, true);
    this.verticalVelocity = 0;
    this.isGrounded = false;
  }

  update(dt: number): void {
    const yaw = this.fpsCamera.yaw;
    this._forward.set(-Math.sin(yaw), 0, -Math.cos(yaw));
    this._right.set(Math.cos(yaw), 0, -Math.sin(yaw));

    this._move.set(0, 0, 0);
    if (this._analogForward !== 0 || this._analogStrafe !== 0) {
      // Analog input: preserve magnitude for proportional speed
      this._move.addScaledVector(this._forward, this._analogForward);
      this._move.addScaledVector(this._right, this._analogStrafe);
      // Clamp to unit length max but don't normalize (preserve partial tilt)
      if (this._move.lengthSq() > 1) this._move.normalize();
      // Also apply digital strafe from C-buttons on top
      if (this.input.isKeyDown('KeyA')) this._move.sub(this._right);
      if (this.input.isKeyDown('KeyD')) this._move.add(this._right);
      if (this._move.lengthSq() > 1) this._move.normalize();
      this._analogForward = 0;
      this._analogStrafe = 0;
    } else if (this._movementOverride) {
      this._move.set(this._movementOverride.x, 0, this._movementOverride.z);
    } else {
      if (this.input.isKeyDown('KeyW')) this._move.add(this._forward);
      if (this.input.isKeyDown('KeyS')) this._move.sub(this._forward);
      if (this.input.isKeyDown('KeyA')) this._move.sub(this._right);
      if (this.input.isKeyDown('KeyD')) this._move.add(this._right);
      if (this._move.lengthSq() > 0) this._move.normalize();
    }
    this._move.multiplyScalar(MOVE_SPEED * dt);

    // Apply gravity
    this.verticalVelocity += GRAVITY * dt;

    // Jump
    if (this.input.isKeyDown('Space') && this.isGrounded) {
      this.verticalVelocity = JUMP_VELOCITY;
      this.isGrounded = false;
      this.jumping = true;
      this.physicsWorld.characterController.enableSnapToGround(0);
    }

    // Desired translation
    const desired = {
      x: this._move.x,
      y: this.verticalVelocity * dt,
      z: this._move.z,
    };

    this.physicsWorld.characterController.computeColliderMovement(
      this.collider,
      desired
    );

    const corrected = this.physicsWorld.characterController.computedMovement();
    const pos = this.rigidBody.translation();
    this.rigidBody.setNextKinematicTranslation({
      x: pos.x + corrected.x,
      y: pos.y + corrected.y,
      z: pos.z + corrected.z,
    });

    // F17: Use Rapier's built-in ground detection instead of magic epsilon
    const grounded = this.physicsWorld.characterController.computedGrounded();
    if (grounded && this.verticalVelocity <= 0) {
      this.isGrounded = true;
      this.verticalVelocity = 0;
      if (this.jumping) {
        this.jumping = false;
        this.physicsWorld.characterController.enableSnapToGround(0.5);
      }
    } else {
      this.isGrounded = false;
    }

    // Sync camera position to character body
    const bodyPos = this.rigidBody.translation();
    this.camera.position.set(bodyPos.x, bodyPos.y + EYE_HEIGHT, bodyPos.z);
  }
}
