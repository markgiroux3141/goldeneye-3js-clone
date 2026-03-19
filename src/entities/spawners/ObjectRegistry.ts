import type { World } from '../../core/World';
import type { Entity } from '../Entity';
import type { PlacedObjectData } from '../../editor/LevelData';

export interface ObjectSpawner {
  /** Preload shared assets needed by objects of this type */
  preload?(world: World, objects: PlacedObjectData[]): Promise<void>;
  /** Spawn a single entity from level config */
  spawn(world: World, config: Record<string, unknown>): Promise<Entity>;
  /** Remove and dispose an entity of this type */
  remove(world: World, entity: Entity): void;
}

export class ObjectRegistry {
  private spawners = new Map<string, ObjectSpawner>();

  register(typePrefix: string, spawner: ObjectSpawner): void {
    this.spawners.set(typePrefix, spawner);
  }

  getSpawner(type: string): ObjectSpawner | undefined {
    // Exact match first
    const exact = this.spawners.get(type);
    if (exact) return exact;

    // Prefix match: "door-grey-swinging" matches "door-"
    for (const [prefix, spawner] of this.spawners) {
      if (prefix.endsWith('-') && type.startsWith(prefix)) {
        return spawner;
      }
    }
    return undefined;
  }

  async spawnAll(world: World, objects: PlacedObjectData[]): Promise<Entity[]> {
    // Group objects by spawner for batch preloading
    const groups = new Map<ObjectSpawner, PlacedObjectData[]>();
    for (const obj of objects) {
      const spawner = this.getSpawner(obj.type);
      if (!spawner) {
        console.warn(`[ObjectRegistry] No spawner for type: ${obj.type}`);
        continue;
      }
      let group = groups.get(spawner);
      if (!group) {
        group = [];
        groups.set(spawner, group);
      }
      group.push(obj);
    }

    // Preload all groups in parallel
    const preloadPromises: Promise<void>[] = [];
    for (const [spawner, group] of groups) {
      if (spawner.preload) {
        preloadPromises.push(spawner.preload(world, group));
      }
    }
    await Promise.all(preloadPromises);

    // Spawn all objects
    const entities: Entity[] = [];
    for (const [spawner, group] of groups) {
      for (const obj of group) {
        const entity = await spawner.spawn(world, obj.config);
        entities.push(entity);
      }
    }
    return entities;
  }
}
