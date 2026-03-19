import * as THREE from 'three';
import type RAPIER_API from '@dimforge/rapier3d-compat';
import { PhysicsWorld } from './PhysicsWorld';

export class ColliderFactory {
  // F6: Single shared fixed body for all static level geometry
  private staticBody: RAPIER_API.RigidBody | null = null;

  constructor(
    private physicsWorld: PhysicsWorld,
    private RAPIER: typeof RAPIER_API
  ) {}

  private getStaticBody(): RAPIER_API.RigidBody {
    if (!this.staticBody) {
      this.staticBody = this.physicsWorld.createFixedBody(0, 0, 0);
    }
    return this.staticBody;
  }

  createTrimeshFromMesh(mesh: THREE.Mesh): void {
    const geometry = mesh.geometry.clone();
    geometry.applyMatrix4(mesh.matrixWorld);

    const positions = geometry.getAttribute('position');
    const vertices = new Float32Array(positions.array);

    let indices: Uint32Array;
    if (geometry.index) {
      indices = new Uint32Array(geometry.index.array);
    } else {
      indices = new Uint32Array(positions.count);
      for (let i = 0; i < positions.count; i++) {
        indices[i] = i;
      }
    }

    const body = this.getStaticBody();
    const colliderDesc = this.RAPIER.ColliderDesc.trimesh(vertices, indices);
    this.physicsWorld.world.createCollider(colliderDesc, body);

    // F5: Dispose cloned geometry to prevent GPU memory leak
    geometry.dispose();
  }

  // F11: Use cuboid colliders for box geometry (much cheaper than trimesh)
  createCuboidFromBox(
    halfExtents: { x: number; y: number; z: number },
    position: { x: number; y: number; z: number },
    rotation?: { x: number; y: number; z: number }
  ): void {
    const body = this.physicsWorld.createFixedBody(position.x, position.y, position.z);
    if (rotation) {
      const q = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(rotation.x, rotation.y, rotation.z)
      );
      body.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }, true);
    }
    const colliderDesc = this.RAPIER.ColliderDesc.cuboid(
      halfExtents.x,
      halfExtents.y,
      halfExtents.z
    );
    this.physicsWorld.world.createCollider(colliderDesc, body);
  }

  createTrimeshesFromScene(scene: THREE.Object3D): void {
    scene.updateMatrixWorld(true);
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        this.createTrimeshFromMesh(child);
      }
    });
  }
}
