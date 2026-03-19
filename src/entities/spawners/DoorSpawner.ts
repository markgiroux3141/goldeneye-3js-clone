import type { World } from '../../core/World';
import type { Entity } from '../Entity';
import type { DoorConfig } from '../DoorEntity';
import type { DoorEntity } from '../DoorEntity';
import type { ObjectSpawner } from './ObjectRegistry';
import type { PlacedObjectData } from '../../editor/LevelData';

export function createDoorSpawner(doorScale: number): ObjectSpawner {
  return {
    async preload(world: World, objects: PlacedObjectData[]): Promise<void> {
      // Preload unique models
      const modelUrls = [...new Set(
        objects.map((o) => o.config.modelUrl as string).filter(Boolean)
      )];
      if (modelUrls.length > 0) {
        await world.modelCache.preload(modelUrls);
      }

      // Preload unique sounds
      const sounds = new Set<string>();
      for (const o of objects) {
        if (o.config.openSound) sounds.add(o.config.openSound as string);
        if (o.config.closeSound) sounds.add(o.config.closeSound as string);
      }
      if (sounds.size > 0) {
        await world.doorManager.preloadSounds([...sounds]);
      }
    },

    async spawn(world: World, config: Record<string, unknown>): Promise<Entity> {
      const scale = config.scale as { x: number } | undefined;
      const doorConfig: DoorConfig = {
        ...config,
        rotation: (config.rotation as number) * Math.PI / 180,
        modelScale: scale
          ? scale.x * doorScale
          : (config.modelScale as number | undefined) ?? doorScale,
      } as unknown as DoorConfig;
      return world.spawnDoor(doorConfig);
    },

    remove(world: World, entity: Entity): void {
      world.doorManager.removeDoor(entity as DoorEntity);
    },
  };
}
