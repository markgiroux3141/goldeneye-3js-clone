import type { World } from '../../core/World';
import type { Entity } from '../Entity';
import { ConsoleEntity } from '../ConsoleEntity';
import type { ConsoleConfig } from '../ConsoleEntity';
import type { Interactable } from '../../systems/InteractionSystem';
import type { ObjectSpawner } from './ObjectRegistry';
import type { PlacedObjectData } from '../../editor/LevelData';

export function createConsoleSpawner(defaultScale: number): ObjectSpawner {
  return {
    async preload(world: World, objects: PlacedObjectData[]): Promise<void> {
      const modelUrls = [...new Set(
        objects.map((o) => o.config.modelUrl as string).filter(Boolean)
      )];
      if (modelUrls.length > 0) {
        await world.modelCache.preload(modelUrls);
      }
    },

    async spawn(world: World, config: Record<string, unknown>): Promise<Entity> {
      const scale = config.scale as { x: number } | undefined;
      const modelScale = scale
        ? scale.x * defaultScale
        : (config.modelScale as number | undefined) ?? defaultScale;

      const modelUrl = config.modelUrl as string;
      const model = world.modelCache.clone(modelUrl);

      const consoleConfig: ConsoleConfig = {
        id: config.id as string | undefined,
        modelUrl,
        position: config.position as { x: number; y: number; z: number },
        rotation: (config.rotation as number) * Math.PI / 180,
        modelScale,
        triggerRadius: config.triggerRadius as number | undefined,
        action: config.action as ConsoleConfig['action'],
        singleUse: config.singleUse as boolean | undefined,
      };

      const entity = new ConsoleEntity(
        world.eventBus,
        world.entityManager,
        world.scene,
        consoleConfig,
        model
      );

      world.entityManager.add(entity);
      world.interactionSystem.register(entity as unknown as Interactable);
      return entity;
    },

    remove(world: World, entity: Entity): void {
      world.interactionSystem.unregister(entity as unknown as Interactable);
      world.entityManager.remove(entity);
      entity.dispose();
    },
  };
}
