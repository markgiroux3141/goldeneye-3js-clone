import * as THREE from 'three';
import type RAPIER_API from '@dimforge/rapier3d-compat';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import type { EntityManager } from '../entities/EntityManager';
import type { Entity } from '../entities/Entity';

export interface HitResult {
  point: THREE.Vector3;
  normal: THREE.Vector3;
  colliderHandle: number;
  distance: number;
}

export class ShootingSystem {
  // Pre-allocated scratch objects
  private readonly _origin = new THREE.Vector3();
  private readonly _dir = new THREE.Vector3();
  private readonly _screenPoint = new THREE.Vector3();
  private entityManager: EntityManager | null = null;

  constructor(
    private physicsWorld: PhysicsWorld,
    private RAPIER: typeof RAPIER_API,
    private camera: THREE.PerspectiveCamera,
    private playerCollider: RAPIER_API.Collider
  ) {}

  setEntityManager(em: EntityManager): void {
    this.entityManager = em;
  }

  getHitEntity(hit: HitResult): Entity | null {
    return this.entityManager?.getByCollider(hit.colliderHandle) ?? null;
  }

  fireAtScreen(ndcX: number, ndcY: number, range: number): HitResult | null {
    // Ray from camera through a screen point (NDC coordinates -1 to 1)
    this.camera.getWorldPosition(this._origin);
    this._screenPoint.set(ndcX, ndcY, 0.5);
    this._screenPoint.unproject(this.camera);
    this._dir.copy(this._screenPoint).sub(this._origin).normalize();
    return this.castRay(range);
  }

  fire(range: number): HitResult | null {
    // Ray from camera position in camera forward direction
    this.camera.getWorldPosition(this._origin);
    this._dir.set(0, 0, -1).applyQuaternion(this.camera.quaternion);
    return this.castRay(range);
  }

  private castRay(range: number): HitResult | null {
    const ray = new this.RAPIER.Ray(
      { x: this._origin.x, y: this._origin.y, z: this._origin.z },
      { x: this._dir.x, y: this._dir.y, z: this._dir.z }
    );

    const hit = this.physicsWorld.world.castRayAndGetNormal(
      ray,
      range,
      true, // solid
      undefined, // flags
      undefined, // groups
      this.playerCollider // exclude player
    );

    if (!hit) return null;

    const toi = hit.timeOfImpact;
    const hitPoint = new THREE.Vector3(
      this._origin.x + this._dir.x * toi,
      this._origin.y + this._dir.y * toi,
      this._origin.z + this._dir.z * toi
    );

    const n = hit.normal;
    const hitNormal = new THREE.Vector3(n.x, n.y, n.z);

    return {
      point: hitPoint,
      normal: hitNormal,
      colliderHandle: hit.collider.handle,
      distance: toi,
    };
  }
}
