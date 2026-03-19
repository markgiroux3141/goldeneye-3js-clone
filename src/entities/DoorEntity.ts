import * as THREE from 'three';
import type RAPIER_API from '@dimforge/rapier3d-compat';
import { Entity } from './Entity';
import type { Interactable } from '../systems/InteractionSystem';
import type { EventBus } from '../core/EventBus';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import type { AudioManager } from '../audio/AudioManager';

export type DoorType = 'swinging' | 'sliding';
export type DoorState = 'closed' | 'opening' | 'open' | 'closing';

const SWING_SPEED = Math.PI;  // rad/s — 90° in ~0.5s
const SLIDE_SPEED = 1.3;      // m/s

export interface DoorConfig {
  id?: string;
  type: DoorType;
  position: { x: number; y: number; z: number };
  rotation: number;  // Y-axis radians

  modelUrl: string;

  // Swinging
  openAngle?: number;
  pivotOffset?: { x: number; y: number; z: number };
  hingeSide?: 'left' | 'right';  // which edge the hinge is on
  swingDirection?: 1 | -1;  // 1 = CCW, -1 = CW (fixed per door)

  // Sliding
  slideDistance?: number;
  slideAxis?: 'x' | 'z';
  slideDirection?: 1 | -1;  // 1 = positive axis, -1 = negative axis

  // Shared
  triggerRadius?: number;
  openDuration?: number;
  animationSpeed?: number;
  colliderSize?: { x: number; y: number; z: number };

  // Model
  modelScale?: number;  // scale factor for the GLB model (e.g., 0.009375 to match facility level)

  // Audio (type-aware defaults if not provided)
  openSound?: string;
  closeSound?: string;

}

export class DoorEntity extends Entity implements Interactable {
  readonly doorType: DoorType;
  readonly triggerRadius: number;
  state: DoorState = 'closed';

  private pivotGroup: THREE.Group;
  private meshGroup: THREE.Group;
  private rigidBody: RAPIER_API.RigidBody;
  private collider: RAPIER_API.Collider;

  private openAngle: number;
  private pivotOffset: THREE.Vector3;
  private slideDistance: number;
  private slideAxis: 'x' | 'z';
  private openDuration: number;
  private animationSpeed: number;
  private hingeSide: 'left' | 'right';
  private swingDirection: 1 | -1;
  private slideDirection: 1 | -1;

  private openSound: string;
  private closeSound: string;

  // Animation state
  private currentAngle = 0;
  private currentSlideOffset = 0;
  private openTimer = 0;

  // Player tracking
  private readonly _playerPos = new THREE.Vector3();

  // Collider sync scratch
  private readonly _colliderPos = new THREE.Vector3();
  private readonly _colliderQuat = new THREE.Quaternion();

  constructor(
    private eventBus: EventBus,
    private scene: THREE.Scene,
    private physicsWorld: PhysicsWorld,
    private RAPIER: typeof RAPIER_API,
    private audioManager: AudioManager,
    config: DoorConfig,
    model: THREE.Group
  ) {
    super(config.id);

    this.doorType = config.type;
    this.openAngle = config.openAngle ?? Math.PI / 2;
    this.pivotOffset = new THREE.Vector3(
      config.pivotOffset?.x ?? 0,
      config.pivotOffset?.y ?? 0,
      config.pivotOffset?.z ?? 0
    );
    this.hingeSide = config.hingeSide ?? 'left';
    this.swingDirection = config.swingDirection ?? 1;
    this.slideDirection = config.slideDirection ?? 1;
    this.slideDistance = config.slideDistance ?? 2.0;
    this.slideAxis = config.slideAxis ?? 'x';
    this.triggerRadius = config.triggerRadius ?? 3.0;
    this.openDuration = config.openDuration ?? 3.0;
    this.animationSpeed = config.animationSpeed ?? 1.0;

    // Type-aware sound defaults
    if (config.type === 'swinging') {
      this.openSound = config.openSound ?? '/sounds/doors/swing-open.wav';
      this.closeSound = config.closeSound ?? '/sounds/doors/swing-close.wav';
    } else {
      this.openSound = config.openSound ?? '/sounds/doors/slide-open.wav';
      this.closeSound = config.closeSound ?? '/sounds/doors/slide-close.wav';
    }

    const { x, y, z } = config.position;
    this.position.set(x, y, z);
    this.rotation.y = config.rotation;

    // Setup scene hierarchy: pivotGroup at door position, mesh inside offset for hinge
    this.pivotGroup = new THREE.Group();
    this.pivotGroup.position.set(x, y, z);
    this.pivotGroup.rotation.y = config.rotation;

    this.meshGroup = model;
    if (config.modelScale) {
      this.meshGroup.scale.setScalar(config.modelScale);
    }

    // Mirror mesh for right-hinge doors
    if (this.doorType === 'swinging' && this.hingeSide === 'right') {
      this.meshGroup.scale.x *= -1;
    }

    this.meshGroup.position.copy(this.pivotOffset);
    this.pivotGroup.add(this.meshGroup);
    this.scene.add(this.pivotGroup);

    // Enable shadows on all door meshes
    this.meshGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // Ensure world matrices are current after auto-adjustments
    this.pivotGroup.updateMatrixWorld(true);

    // Compute collider size from bounding box if not provided
    const box = new THREE.Box3().setFromObject(this.meshGroup);
    const size = new THREE.Vector3();
    box.getSize(size);
    const halfExtents = config.colliderSize ?? {
      x: size.x / 2,
      y: size.y / 2,
      z: size.z / 2,
    };

    // Kinematic body for animated door
    this.rigidBody = physicsWorld.createKinematicBody(x, y, z);
    const colliderDesc = RAPIER.ColliderDesc.cuboid(
      halfExtents.x,
      halfExtents.y,
      halfExtents.z
    );
    this.collider = physicsWorld.world.createCollider(colliderDesc, this.rigidBody);

    // Sync collider to initial position (setTranslation for immediate effect)
    this.syncPhysics();
    this.rigidBody.setTranslation(
      { x: this._colliderPos.x, y: this._colliderPos.y, z: this._colliderPos.z },
      true
    );
  }

  setPlayerPosition(pos: { x: number; y: number; z: number }): void {
    this._playerPos.set(pos.x, pos.y, pos.z);
  }

  getDistanceToPlayer(): number {
    return this._playerPos.distanceTo(this.position);
  }

  canInteract(): boolean {
    return this.state === 'closed' || this.state === 'open';
  }

  /** Called when player presses interact (B) near this door */
  interact(): void {
    if (!this.active) return;

    if (this.state === 'closed') {
      this.state = 'opening';
      console.log(`[Door ${this.id}] opening (sound: ${this.openSound})`);
      this.playSound(this.openSound);
      this.eventBus.emit('door-opening', { door: this, doorId: this.id });
    } else if (this.state === 'open') {
      this.state = 'closing';
      console.log(`[Door ${this.id}] closing via interact (sound: ${this.closeSound})`);
      this.playSound(this.closeSound);
      this.eventBus.emit('door-closing', { door: this, doorId: this.id });
    }
  }

  update(dt: number): void {
    if (!this.active) return;

    const dist = this.getDistanceToPlayer();

    switch (this.state) {
      case 'closed':
        // Doors only open via interact() — no auto-open
        break;

      case 'opening':
        this.animateOpen(dt);
        break;

      case 'open':
        if (dist < this.triggerRadius) {
          this.openTimer = this.openDuration;
        } else {
          this.openTimer -= dt;
          if (this.openTimer <= 0) {
            this.state = 'closing';
            console.log(`[Door ${this.id}] closing (dist: ${dist.toFixed(2)})`);
            this.playSound(this.closeSound);
            this.eventBus.emit('door-closing', { door: this, doorId: this.id });
          }
        }
        break;

      case 'closing':
        this.animateClose(dt);
        break;
    }
  }

  private animateOpen(dt: number): void {
    const speed = this.animationSpeed;

    if (this.doorType === 'swinging') {
      this.currentAngle += this.swingDirection * SWING_SPEED * speed * dt;
      const target = this.swingDirection * this.openAngle;
      if (Math.abs(this.currentAngle) >= Math.abs(target)) {
        this.currentAngle = target;
        this.transitionToOpen();
      }
      this.pivotGroup.rotation.y = this.rotation.y + this.currentAngle;
    } else {
      // Sliding
      this.currentSlideOffset += this.slideDirection * SLIDE_SPEED * speed * dt;
      if (Math.abs(this.currentSlideOffset) >= this.slideDistance) {
        this.currentSlideOffset = this.slideDirection * this.slideDistance;
        this.transitionToOpen();
      }
      if (this.slideAxis === 'x') {
        this.meshGroup.position.x = this.pivotOffset.x + this.currentSlideOffset;
      } else {
        this.meshGroup.position.z = this.pivotOffset.z + this.currentSlideOffset;
      }
    }

    this.syncPhysics();
  }

  private animateClose(dt: number): void {
    const speed = this.animationSpeed;

    if (this.doorType === 'swinging') {
      const step = SWING_SPEED * speed * dt;
      if (this.currentAngle > 0) {
        this.currentAngle = Math.max(0, this.currentAngle - step);
      } else {
        this.currentAngle = Math.min(0, this.currentAngle + step);
      }
      if (this.currentAngle === 0) {
        this.transitionToClosed();
      }
      this.pivotGroup.rotation.y = this.rotation.y + this.currentAngle;
    } else {
      const step = SLIDE_SPEED * speed * dt;
      if (this.currentSlideOffset > 0) {
        this.currentSlideOffset = Math.max(0, this.currentSlideOffset - step);
      } else {
        this.currentSlideOffset = Math.min(0, this.currentSlideOffset + step);
      }
      if (this.currentSlideOffset === 0) {
        this.transitionToClosed();
      }
      if (this.slideAxis === 'x') {
        this.meshGroup.position.x = this.pivotOffset.x + this.currentSlideOffset;
      } else {
        this.meshGroup.position.z = this.pivotOffset.z + this.currentSlideOffset;
      }
    }

    this.syncPhysics();
  }

  private transitionToOpen(): void {
    this.state = 'open';
    this.openTimer = this.openDuration;
    console.log(`[Door ${this.id}] fully open, timer: ${this.openDuration}s`);
    this.eventBus.emit('door-opened', { door: this, doorId: this.id });
  }

  private transitionToClosed(): void {
    this.state = 'closed';
    console.log(`[Door ${this.id}] fully closed`);
    this.eventBus.emit('door-closed', { door: this, doorId: this.id });
  }

  private syncPhysics(): void {
    // Get the world-space center of the door mesh for the collider
    const box = new THREE.Box3().setFromObject(this.meshGroup);
    box.getCenter(this._colliderPos);

    // Get the world quaternion of the pivot group
    this.pivotGroup.getWorldQuaternion(this._colliderQuat);

    this.rigidBody.setNextKinematicTranslation(
      { x: this._colliderPos.x, y: this._colliderPos.y, z: this._colliderPos.z }
    );
    this.rigidBody.setNextKinematicRotation(
      { x: this._colliderQuat.x, y: this._colliderQuat.y, z: this._colliderQuat.z, w: this._colliderQuat.w }
    );
  }

  private playSound(url: string): void {
    this.audioManager.play(url, 0.6);
  }

  dispose(): void {
    this.scene.remove(this.pivotGroup);
    this.meshGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
    this.physicsWorld.world.removeCollider(this.collider, true);
    this.physicsWorld.world.removeRigidBody(this.rigidBody);
    super.dispose();
  }
}
