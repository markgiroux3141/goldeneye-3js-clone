import * as THREE from 'three';
import type RAPIER_API from '@dimforge/rapier3d-compat';
import { EventBus } from './EventBus';
import { EntityManager } from '../entities/EntityManager';
import { PlayerActor } from '../entities/PlayerActor';
import { EnemyActor, type EnemySpawnConfig } from '../entities/EnemyActor';
import { DoorManager } from '../entities/DoorManager';
import type { DoorConfig } from '../entities/DoorEntity';
import { DamageSystem } from '../systems/DamageSystem';
import { InteractionSystem } from '../systems/InteractionSystem';
import { ModelCache } from './ModelCache';
import { ObjectRegistry } from '../entities/spawners/ObjectRegistry';
import type { PlayerController } from '../player/PlayerController';
import type { FPSCamera } from '../player/FPSCamera';
import type { InputManager } from '../core/InputManager';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import type { AudioManager } from '../audio/AudioManager';
import type { AssetLoader } from '../core/AssetLoader';

export class World {
  readonly eventBus = new EventBus();
  readonly entityManager = new EntityManager();
  readonly damageSystem = new DamageSystem();
  readonly modelCache: ModelCache;
  readonly interactionSystem = new InteractionSystem();
  readonly objectRegistry = new ObjectRegistry();
  readonly doorManager: DoorManager;
  player!: PlayerActor;
  private inputManager!: InputManager;

  constructor(
    private scene: THREE.Scene,
    private physicsWorld: PhysicsWorld,
    private RAPIER: typeof RAPIER_API,
    readonly audioManager: AudioManager,
    readonly assetLoader: AssetLoader
  ) {
    this.modelCache = new ModelCache(assetLoader);
    this.doorManager = new DoorManager(
      scene, physicsWorld, RAPIER,
      this.eventBus, this.entityManager,
      audioManager, this.modelCache,
      this.interactionSystem
    );
  }

  spawnPlayer(
    playerController: PlayerController,
    fpsCamera: FPSCamera,
    inputManager: InputManager
  ): PlayerActor {
    this.inputManager = inputManager;
    this.player = new PlayerActor(
      this.eventBus,
      playerController,
      fpsCamera,
      inputManager
    );
    this.entityManager.add(this.player);
    this.entityManager.registerCollider(this.player.collider!.handle, this.player);
    return this.player;
  }

  spawnEnemy(config: EnemySpawnConfig): EnemyActor {
    const enemy = new EnemyActor(
      this.eventBus,
      this.scene,
      this.physicsWorld,
      this.entityManager,
      this.RAPIER,
      config
    );
    this.entityManager.add(enemy);
    return enemy;
  }

  async spawnDoor(config: DoorConfig) {
    return this.doorManager.spawnDoor(config);
  }

  async spawnDoors(configs: DoorConfig[]): Promise<void> {
    // Preload all unique models first
    const urls = [...new Set(configs.map((c) => c.modelUrl))];
    await this.doorManager.preloadModels(urls);

    // Preload sounds
    const sounds = new Set<string>();
    for (const c of configs) {
      if (c.openSound) sounds.add(c.openSound);
      if (c.closeSound) sounds.add(c.closeSound);
    }
    if (sounds.size > 0) {
      await this.doorManager.preloadSounds([...sounds]);
    }

    for (const config of configs) {
      await this.doorManager.spawnDoor(config);
    }
  }

  update(dt: number): void {
    // Pass player position and interact state to interactables
    if (this.player) {
      const pos = this.player.playerController.getPosition();
      const interact = this.inputManager.isKeyDown('KeyB');
      this.interactionSystem.update(pos, interact);
    }
    this.entityManager.updateAll(dt);
  }

  dispose(): void {
    this.doorManager.disposeAll();
    this.entityManager.disposeAll();
    this.eventBus.clear();
    this.modelCache.clear();
  }
}
