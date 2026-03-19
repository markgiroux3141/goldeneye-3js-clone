import * as THREE from 'three';
import type RAPIER_API from '@dimforge/rapier3d-compat';
import { Actor } from './Actor';
import type { EventBus } from '../core/EventBus';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import type { EntityManager } from './EntityManager';

export interface EnemySpawnConfig {
  position: { x: number; y: number; z: number };
  health?: number;
}

export class EnemyActor extends Actor {
  private mesh: THREE.Mesh;
  private rigidBody: RAPIER_API.RigidBody;

  constructor(
    eventBus: EventBus,
    private scene: THREE.Scene,
    private physicsWorld: PhysicsWorld,
    private entityManager: EntityManager,
    private RAPIER: typeof RAPIER_API,
    config: EnemySpawnConfig
  ) {
    super(eventBus, {
      health: config.health ?? 100,
      maxHealth: config.health ?? 100,
      faction: 'enemy',
    });

    const { x, y, z } = config.position;

    // Debug capsule mesh
    const geometry = new THREE.CapsuleGeometry(0.3, 1.0, 4, 8);
    const material = new THREE.MeshStandardMaterial({ color: 0xcc3333 });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(x, y + 0.8, z);
    this.mesh.castShadow = true;
    this.scene.add(this.mesh);

    // Physics body + collider
    this.rigidBody = physicsWorld.createFixedBody(x, y, z);
    const colliderDesc = RAPIER.ColliderDesc.capsule(0.5, 0.3);
    this.collider = physicsWorld.world.createCollider(colliderDesc, this.rigidBody);

    // Register in entity manager for collider lookups
    this.entityManager.registerCollider(this.collider.handle, this);

    this.position.set(x, y, z);
  }

  update(_dt: number): void {
    // Placeholder — future AI goes here
  }

  protected onKilled(killer?: import('./Entity').Entity): void {
    super.onKilled(killer);

    // Remove from scene
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();

    // Remove physics
    if (this.collider) {
      this.entityManager.unregisterCollider(this.collider.handle);
      this.physicsWorld.world.removeCollider(this.collider, true);
    }
    this.physicsWorld.world.removeRigidBody(this.rigidBody);

    this.entityManager.remove(this);
  }

  dispose(): void {
    if (this.active) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      (this.mesh.material as THREE.Material).dispose();

      if (this.collider) {
        this.entityManager.unregisterCollider(this.collider.handle);
        this.physicsWorld.world.removeCollider(this.collider, true);
      }
      this.physicsWorld.world.removeRigidBody(this.rigidBody);
    }
    super.dispose();
  }
}
