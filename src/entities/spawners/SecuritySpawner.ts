import type { World } from '../../core/World';
import type { Entity } from '../Entity';
import { SecurityEntity } from '../SecurityEntity';
import type { SecurityConfig } from '../SecurityEntity';
import type { ObjectSpawner } from './ObjectRegistry';
import type { PlacedObjectData } from '../../editor/LevelData';

export function createSecuritySpawner(defaultScale: number): ObjectSpawner {
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

      const securityConfig: SecurityConfig = {
        id: config.id as string | undefined,
        securityType: config.securityType as SecurityConfig['securityType'],
        modelUrl,
        position: config.position as { x: number; y: number; z: number },
        rotation: (config.rotation as number) * Math.PI / 180,
        modelScale,
        health: config.health as number | undefined,
        detectionAngle: config.detectionAngle as number | undefined,
        detectionRange: config.detectionRange as number | undefined,
        sweepSpeed: config.sweepSpeed as number | undefined,
        sweepAngle: config.sweepAngle as number | undefined,
        alarmSound: config.alarmSound as string | undefined,
        alarmRadius: config.alarmRadius as number | undefined,
      };

      const entity = new SecurityEntity(
        world.eventBus,
        world.scene,
        world.physicsWorld,
        world.RAPIER,
        world.entityManager,
        world.audioManager,
        securityConfig,
        model
      );

      world.entityManager.add(entity);
      return entity;
    },

    remove(world: World, entity: Entity): void {
      world.entityManager.remove(entity);
      entity.dispose();
    },
  };
}
