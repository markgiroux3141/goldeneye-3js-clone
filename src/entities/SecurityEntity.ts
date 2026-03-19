import * as THREE from 'three';
import type RAPIER_API from '@dimforge/rapier3d-compat';
import { Actor } from './Actor';
import type { EventBus } from '../core/EventBus';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import type { EntityManager } from './EntityManager';
import type { AudioManager } from '../audio/AudioManager';

export type SecurityType = 'camera' | 'alarm';

export interface SecurityConfig {
  id?: string;
  securityType: SecurityType;
  modelUrl: string;
  position: { x: number; y: number; z: number };
  rotation: number;  // Y-axis radians (converted from degrees in spawner)
  modelScale?: number;
  health?: number;

  // Camera-specific
  detectionAngle?: number;    // half-angle in degrees (default 30)
  detectionRange?: number;    // meters (default 10)
  sweepSpeed?: number;        // degrees/sec for sweep animation (0 = no sweep)
  sweepAngle?: number;        // total sweep arc in degrees (default 60)

  // Alarm-specific
  alarmSound?: string;
  alarmRadius?: number;       // how far the alert reaches (default 20)
}

export class SecurityEntity extends Actor {
  readonly securityType: SecurityType;
  private meshGroup: THREE.Group;
  private rigidBody: RAPIER_API.RigidBody | null = null;
  private securityCollider: RAPIER_API.Collider | null = null;
  private disabled = false;

  // Camera detection
  private readonly detectionAngle: number;  // half-angle in radians
  private readonly detectionRange: number;
  private readonly detectionCos: number;    // cos(half-angle) for dot product check
  private readonly forward = new THREE.Vector3(0, 0, -1);  // local forward
  private readonly _worldForward = new THREE.Vector3();
  private readonly _toPlayer = new THREE.Vector3();
  private playerDetected = false;

  // Camera sweep
  private readonly sweepSpeed: number;      // radians/sec
  private readonly sweepAngle: number;      // half-arc in radians
  private readonly baseRotationY: number;
  private sweepTime = 0;

  // Alarm state
  private readonly alarmSound: string | undefined;
  private readonly alarmRadius: number;
  private alarmActive = false;

  // Player position tracking
  private readonly _playerPos = new THREE.Vector3();
  private hasPlayerPos = false;

  constructor(
    eventBus: EventBus,
    private scene: THREE.Scene,
    private physicsWorld: PhysicsWorld,
    private RAPIER: typeof RAPIER_API,
    private entityManager: EntityManager,
    private audioManager: AudioManager,
    config: SecurityConfig,
    model: THREE.Group
  ) {
    super(eventBus, {
      id: config.id,
      health: config.health ?? 50,
      maxHealth: config.health ?? 50,
      faction: 'neutral',
    });

    this.securityType = config.securityType;

    // Camera config
    const halfAngleDeg = config.detectionAngle ?? 30;
    this.detectionAngle = halfAngleDeg * Math.PI / 180;
    this.detectionRange = config.detectionRange ?? 10;
    this.detectionCos = Math.cos(this.detectionAngle);

    // Sweep config
    this.sweepSpeed = (config.sweepSpeed ?? 0) * Math.PI / 180;
    this.sweepAngle = ((config.sweepAngle ?? 60) / 2) * Math.PI / 180;
    this.baseRotationY = config.rotation;

    // Alarm config
    this.alarmSound = config.alarmSound;
    this.alarmRadius = config.alarmRadius ?? 20;

    const { x, y, z } = config.position;
    this.position.set(x, y, z);
    this.rotation.y = config.rotation;

    // Setup mesh
    this.meshGroup = model;
    if (config.modelScale) {
      this.meshGroup.scale.setScalar(config.modelScale);
    }
    this.meshGroup.position.set(x, y, z);
    this.meshGroup.rotation.y = config.rotation;

    // Enable shadows
    this.meshGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    this.scene.add(this.meshGroup);
    this.meshGroup.updateMatrixWorld(true);

    // Create physics collider
    const box = new THREE.Box3().setFromObject(this.meshGroup);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    this.rigidBody = physicsWorld.createFixedBody(center.x, center.y, center.z);
    const colliderDesc = RAPIER.ColliderDesc.cuboid(
      size.x / 2,
      size.y / 2,
      size.z / 2
    );
    this.securityCollider = physicsWorld.world.createCollider(colliderDesc, this.rigidBody);
    this.collider = this.securityCollider;
    entityManager.registerCollider(this.securityCollider.handle, this);

    // Listen for disable events from consoles
    this.eventBus.on('security-disabled', (data) => {
      if (!data.targetId || data.targetId === this.id) {
        this.disable();
      }
    });
  }

  /** Set player position for detection checks */
  setPlayerPosition(pos: { x: number; y: number; z: number }): void {
    this._playerPos.set(pos.x, pos.y, pos.z);
    this.hasPlayerPos = true;
  }

  update(dt: number): void {
    if (!this.active || this.disabled) return;

    if (this.securityType === 'camera') {
      this.updateCamera(dt);
    }
  }

  private updateCamera(dt: number): void {
    // Sweep animation
    if (this.sweepSpeed > 0) {
      this.sweepTime += dt;
      const sweepOffset = Math.sin(this.sweepTime * this.sweepSpeed) * this.sweepAngle;
      this.meshGroup.rotation.y = this.baseRotationY + sweepOffset;
    }

    if (!this.hasPlayerPos) return;

    // Cone-of-vision detection
    // Get world-space forward direction of the camera
    this.meshGroup.updateMatrixWorld(true);
    this._worldForward.copy(this.forward).applyQuaternion(this.meshGroup.quaternion).normalize();

    // Direction to player
    this._toPlayer.copy(this._playerPos).sub(this.position);
    const distance = this._toPlayer.length();

    if (distance > this.detectionRange) {
      this.playerDetected = false;
      return;
    }

    this._toPlayer.normalize();

    // Dot product check: is player within the cone?
    const dot = this._worldForward.dot(this._toPlayer);
    const wasDetected = this.playerDetected;
    this.playerDetected = dot >= this.detectionCos;

    if (this.playerDetected && !wasDetected) {
      console.log(`[Security ${this.id}] player detected!`);
      this.eventBus.emit('player-detected', { detector: this, detectorId: this.id });
    }
  }

  /** Trigger the alarm (called externally or by detection events) */
  triggerAlarm(): void {
    if (this.alarmActive || this.disabled || !this.active) return;
    this.alarmActive = true;

    if (this.alarmSound) {
      this.audioManager.play(this.alarmSound, 1.0);
    }

    this.eventBus.emit('alarm-sounded', { alarm: this, alarmId: this.id });
    console.log(`[Security ${this.id}] alarm triggered!`);
  }

  /** Stop the alarm */
  stopAlarm(): void {
    if (!this.alarmActive) return;
    this.alarmActive = false;
    this.eventBus.emit('alarm-stopped', { alarm: this, alarmId: this.id });
  }

  /** Disable without destroying (e.g., from console) */
  disable(): void {
    this.disabled = true;
    this.playerDetected = false;
    this.stopAlarm();

    // Visual feedback — dim the emissive
    this.meshGroup.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
        child.material.emissive.setHex(0x000000);
        child.material.emissiveIntensity = 0;
      }
    });

    console.log(`[Security ${this.id}] disabled`);
  }

  protected onKilled(killer?: import('./Entity').Entity): void {
    this.stopAlarm();
    this.disabled = true;
    this.playerDetected = false;

    this.eventBus.emit('security-destroyed', { entity: this });

    // Remove physics
    if (this.securityCollider) {
      this.entityManager.unregisterCollider(this.securityCollider.handle);
      this.physicsWorld.world.removeCollider(this.securityCollider, true);
      this.securityCollider = null;
      this.collider = null;
    }
    if (this.rigidBody) {
      this.physicsWorld.world.removeRigidBody(this.rigidBody);
      this.rigidBody = null;
    }

    // Hide mesh
    this.meshGroup.visible = false;

    super.onKilled(killer);
  }

  dispose(): void {
    if (this.securityCollider) {
      this.entityManager.unregisterCollider(this.securityCollider.handle);
      this.physicsWorld.world.removeCollider(this.securityCollider, true);
      this.securityCollider = null;
    }
    if (this.rigidBody) {
      this.physicsWorld.world.removeRigidBody(this.rigidBody);
      this.rigidBody = null;
    }
    this.scene.remove(this.meshGroup);
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
    super.dispose();
  }
}
