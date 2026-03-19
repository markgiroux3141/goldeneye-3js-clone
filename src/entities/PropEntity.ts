import * as THREE from 'three';
import type RAPIER_API from '@dimforge/rapier3d-compat';
import { Actor } from './Actor';
import type { EventBus } from '../core/EventBus';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import type { EntityManager } from './EntityManager';
import type { AudioManager } from '../audio/AudioManager';

export type DestroyEffect = 'break' | 'shatter' | 'explode' | 'none';

export interface PropConfig {
  id?: string;
  modelUrl: string;
  position: { x: number; y: number; z: number };
  rotation: number;  // Y-axis radians (converted from degrees in spawner)
  modelScale?: number;
  health?: number;              // 0 or undefined = indestructible
  destroyEffect?: DestroyEffect;
  destroySound?: string;
  colliderType?: 'auto' | 'none';
}

export class PropEntity extends Actor {
  private meshGroup: THREE.Group;
  private rigidBody: RAPIER_API.RigidBody | null = null;
  private propCollider: RAPIER_API.Collider | null = null;
  private readonly destroyEffect: DestroyEffect;
  private readonly destroySound: string | undefined;
  private destroying = false;
  private destroyTimer = 0;
  private debrisMeshes: THREE.Object3D[] = [];

  constructor(
    eventBus: EventBus,
    private scene: THREE.Scene,
    private physicsWorld: PhysicsWorld,
    private RAPIER: typeof RAPIER_API,
    private entityManager: EntityManager,
    private audioManager: AudioManager,
    config: PropConfig,
    model: THREE.Group
  ) {
    super(eventBus, {
      id: config.id,
      health: config.health || 0,
      maxHealth: config.health || 0,
      faction: 'neutral',
    });

    this.destroyEffect = config.destroyEffect ?? 'none';
    this.destroySound = config.destroySound;

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

    // Create physics collider (fixed body)
    if (config.colliderType !== 'none') {
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
      this.propCollider = physicsWorld.world.createCollider(colliderDesc, this.rigidBody);
      this.collider = this.propCollider;

      entityManager.registerCollider(this.propCollider.handle, this);
    }
  }

  /** Indestructible props ignore damage */
  takeDamage(amount: number, source?: import('./Entity').Entity): void {
    if (this.maxHealth <= 0) return;  // indestructible
    super.takeDamage(amount, source);
  }

  protected onKilled(killer?: import('./Entity').Entity): void {
    if (this.destroying) return;
    this.destroying = true;

    // Play destroy sound
    if (this.destroySound) {
      this.audioManager.play(this.destroySound, 0.7);
    }

    // Emit event
    this.eventBus.emit('prop-destroyed', { entity: this, effect: this.destroyEffect });

    // Run destroy effect
    switch (this.destroyEffect) {
      case 'shatter':
        this.effectShatter();
        break;
      case 'explode':
        this.effectExplode();
        break;
      case 'break':
        this.effectBreak();
        break;
      case 'none':
      default:
        this.cleanup();
        break;
    }

    super.onKilled(killer);
  }

  update(dt: number): void {
    if (!this.destroying) return;

    // Update debris
    if (this.debrisMeshes.length > 0) {
      this.destroyTimer += dt;
      for (const debris of this.debrisMeshes) {
        // Apply gravity-like fall
        debris.position.y -= 4.0 * dt;
        // Move outward
        debris.position.add(
          (debris.userData.velocity as THREE.Vector3).clone().multiplyScalar(dt)
        );
        // Spin
        debris.rotation.x += dt * 5;
        debris.rotation.z += dt * 3;
        // Fade out
        debris.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
            child.material.opacity = Math.max(0, 1 - this.destroyTimer / 1.5);
          }
        });
      }

      if (this.destroyTimer >= 1.5) {
        this.cleanupDebris();
      }
    }
  }

  private effectBreak(): void {
    // Quick scale-down fade
    this.meshGroup.visible = false;
    this.removePhysics();
    this.cleanup();
  }

  private effectShatter(): void {
    // Hide original mesh, spawn small debris pieces
    this.meshGroup.visible = false;
    this.removePhysics();

    const box = new THREE.Box3().setFromObject(this.meshGroup);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const size = new THREE.Vector3();
    box.getSize(size);

    const debrisCount = 5 + Math.floor(Math.random() * 4);
    const debrisGeo = new THREE.BoxGeometry(
      size.x * 0.15,
      size.y * 0.15,
      size.z * 0.15
    );

    // Sample color from original mesh
    let color = 0x888888;
    this.meshGroup.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
        color = child.material.color.getHex();
      }
    });

    for (let i = 0; i < debrisCount; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color,
        transparent: true,
        opacity: 1,
      });
      const debris = new THREE.Mesh(debrisGeo, mat);
      debris.position.copy(center);
      debris.position.x += (Math.random() - 0.5) * size.x * 0.5;
      debris.position.y += (Math.random() - 0.5) * size.y * 0.5;
      debris.position.z += (Math.random() - 0.5) * size.z * 0.5;
      debris.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      debris.userData.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        Math.random() * 2 + 1,
        (Math.random() - 0.5) * 3
      );
      debris.castShadow = true;
      this.scene.add(debris);
      this.debrisMeshes.push(debris);
    }
  }

  private effectExplode(): void {
    // Brief flash + remove
    this.meshGroup.visible = false;
    this.removePhysics();

    // Create flash light
    const box = new THREE.Box3().setFromObject(this.meshGroup);
    const center = new THREE.Vector3();
    box.getCenter(center);

    const flash = new THREE.PointLight(0xff6600, 5, 10);
    flash.position.copy(center);
    this.scene.add(flash);

    // Remove flash after brief moment
    setTimeout(() => {
      this.scene.remove(flash);
      flash.dispose();
    }, 150);

    this.cleanup();
  }

  private removePhysics(): void {
    if (this.propCollider) {
      this.entityManager.unregisterCollider(this.propCollider.handle);
      this.physicsWorld.world.removeCollider(this.propCollider, true);
      this.propCollider = null;
      this.collider = null;
    }
    if (this.rigidBody) {
      this.physicsWorld.world.removeRigidBody(this.rigidBody);
      this.rigidBody = null;
    }
  }

  private cleanupDebris(): void {
    for (const debris of this.debrisMeshes) {
      this.scene.remove(debris);
      if (debris instanceof THREE.Mesh) {
        debris.geometry.dispose();
        (debris.material as THREE.Material).dispose();
      }
    }
    this.debrisMeshes = [];
    this.cleanup();
  }

  private cleanup(): void {
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
  }

  dispose(): void {
    this.removePhysics();
    this.cleanupDebris();
    this.cleanup();
    super.dispose();
  }
}
