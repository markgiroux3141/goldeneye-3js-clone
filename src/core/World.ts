import * as THREE from 'three';
import type RAPIER_API from '@dimforge/rapier3d-compat';
import { EventBus } from './EventBus';
import { EntityManager } from '../entities/EntityManager';
import { PlayerActor } from '../entities/PlayerActor';
import { DoorManager } from '../entities/DoorManager';
import type { DoorConfig } from '../entities/DoorEntity';
import { DamageSystem } from '../systems/DamageSystem';
import { InteractionSystem } from '../systems/InteractionSystem';
import { ModelCache } from './ModelCache';
import { ObjectRegistry } from '../entities/spawners/ObjectRegistry';
import { EnemyManager, type EnemyPlacement } from '../entities/EnemyManager';
import type { PlayerController } from '../player/PlayerController';
import type { FPSCamera } from '../player/FPSCamera';
import type { InputManager } from '../core/InputManager';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import type { AudioManager } from '../audio/AudioManager';
import type { AssetLoader } from '../core/AssetLoader';
import type { NavMeshSystem } from '../navigation/NavMeshSystem';
import { SecurityEntity } from '../entities/SecurityEntity';

export class World {
  readonly eventBus = new EventBus();
  readonly entityManager = new EntityManager();
  readonly damageSystem = new DamageSystem();
  readonly modelCache: ModelCache;
  readonly interactionSystem = new InteractionSystem();
  readonly objectRegistry = new ObjectRegistry();
  readonly doorManager: DoorManager;
  enemyManager!: EnemyManager;
  player!: PlayerActor;
  private inputManager!: InputManager;

  constructor(
    readonly scene: THREE.Scene,
    readonly physicsWorld: PhysicsWorld,
    readonly RAPIER: typeof RAPIER_API,
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

  initEnemyManager(): void {
    this.enemyManager = new EnemyManager(
      this.scene,
      this.physicsWorld,
      this.RAPIER,
      this.eventBus,
      this.entityManager,
      this.audioManager,
      this.modelCache,
      this.assetLoader,
      this.damageSystem,
      this.player
    );
  }

  setNavMeshSystem(navMeshSystem: NavMeshSystem): void {
    if (this.enemyManager) {
      this.enemyManager.setNavMeshSystem(navMeshSystem);
    }
  }

  async loadEnemyPlacements(placements: EnemyPlacement[]): Promise<void> {
    if (!this.enemyManager) this.initEnemyManager();
    await this.enemyManager.preloadModels(placements);
    await this.enemyManager.loadPlacements(placements);
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

      // Update security entities with player position (for camera detection)
      for (const entity of this.entityManager.getAll()) {
        if (entity instanceof SecurityEntity && entity.active) {
          entity.setPlayerPosition(pos);
        }
      }

      // Update enemies with player position
      if (this.enemyManager) {
        const playerVec = new THREE.Vector3(pos.x, pos.y, pos.z);
        this.enemyManager.update(dt, playerVec);
      }
    }
    this.entityManager.updateAll(dt);
  }

  dispose(): void {
    this.enemyManager?.dispose();
    this.doorManager.disposeAll();
    this.entityManager.disposeAll();
    this.eventBus.clear();
    this.modelCache.clear();
  }
}
