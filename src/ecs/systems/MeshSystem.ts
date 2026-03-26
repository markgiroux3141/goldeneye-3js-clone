import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { ECSWorld } from '../ECSWorld';
import type { ECSSystem } from '../System';
import type { TransformComponent, MeshComponent } from '../Component';

const DEG2RAD = Math.PI / 180;

export class MeshSystem implements ECSSystem {
  readonly name = 'MeshSystem';
  readonly requiredComponents = ['Transform', 'Mesh'];

  private scene: THREE.Scene;
  private loader = new GLTFLoader();
  private glbCache = new Map<string, THREE.Group>();
  private objectsPoolPath: string;
  private loadingPromises = new Map<string, Promise<THREE.Group>>();

  constructor(scene: THREE.Scene, objectsPoolPath: string) {
    this.scene = scene;
    this.objectsPoolPath = objectsPoolPath;
  }

  async onEntityAdded(entityId: string, world: ECSWorld): Promise<void> {
    const mesh = world.getComponent(entityId, 'Mesh') as MeshComponent | undefined;
    const transform = world.getComponent(entityId, 'Transform') as TransformComponent | undefined;
    if (!mesh || !transform || mesh.meshPaths.length === 0) return;

    // Already loaded?
    if (mesh._group) return;

    const group = new THREE.Group();
    group.name = entityId;

    for (const meshPath of mesh.meshPaths) {
      try {
        const loaded = await this.loadGLB(meshPath);
        const clone = loaded.clone(true);
        group.add(clone);
      } catch (err) {
        console.warn(`[MeshSystem] Failed to load ${meshPath}:`, err);
      }
    }

    // Apply transform
    group.position.set(transform.position[0], transform.position[1], transform.position[2]);
    group.rotation.set(
      transform.rotation[0] * DEG2RAD,
      transform.rotation[1] * DEG2RAD,
      transform.rotation[2] * DEG2RAD
    );
    group.scale.set(transform.scale[0], transform.scale[1], transform.scale[2]);

    // Shadow settings
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = mesh.castShadow;
        child.receiveShadow = mesh.receiveShadow;
      }
    });

    mesh._group = group;
    this.scene.add(group);
  }

  onEntityRemoved(entityId: string, world: ECSWorld): void {
    const mesh = world.getComponent(entityId, 'Mesh') as MeshComponent | undefined;
    if (mesh?._group) {
      this.scene.remove(mesh._group);
      mesh._group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material?.dispose();
          }
        }
      });
      mesh._group = undefined;
    }
  }

  update(_dt: number, world: ECSWorld): void {
    // Sync transform → Three.js group for all mesh entities
    const entities = world.query('Transform', 'Mesh');
    for (const id of entities) {
      const transform = world.getComponent(id, 'Transform') as TransformComponent;
      const mesh = world.getComponent(id, 'Mesh') as MeshComponent;
      if (!transform || !mesh?._group) continue;

      mesh._group.position.set(transform.position[0], transform.position[1], transform.position[2]);
      mesh._group.rotation.set(
        transform.rotation[0] * DEG2RAD,
        transform.rotation[1] * DEG2RAD,
        transform.rotation[2] * DEG2RAD
      );
      mesh._group.scale.set(transform.scale[0], transform.scale[1], transform.scale[2]);
    }
  }

  /** Get the Three.js group for an entity (for selection, raycasting, etc.) */
  getGroup(entityId: string, world: ECSWorld): THREE.Group | undefined {
    const mesh = world.getComponent(entityId, 'Mesh') as MeshComponent | undefined;
    return mesh?._group;
  }

  dispose(): void {
    this.glbCache.clear();
    this.loadingPromises.clear();
  }

  private async loadGLB(meshPath: string): Promise<THREE.Group> {
    if (this.glbCache.has(meshPath)) {
      return this.glbCache.get(meshPath)!;
    }

    // Deduplicate concurrent loads of the same file
    if (this.loadingPromises.has(meshPath)) {
      return this.loadingPromises.get(meshPath)!;
    }

    const promise = (async () => {
      const gltf = await this.loader.loadAsync(`${this.objectsPoolPath}/${meshPath}`);
      this.glbCache.set(meshPath, gltf.scene);
      this.loadingPromises.delete(meshPath);
      return gltf.scene;
    })();

    this.loadingPromises.set(meshPath, promise);
    return promise;
  }
}
