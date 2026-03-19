import * as THREE from 'three';
import type RAPIER_API from '@dimforge/rapier3d-compat';
import { DoorEntity, type DoorConfig } from './DoorEntity';
import type { EventBus } from '../core/EventBus';
import type { EntityManager } from './EntityManager';
import type { InteractionSystem } from '../systems/InteractionSystem';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import type { AudioManager } from '../audio/AudioManager';
import type { ModelCache } from '../core/ModelCache';

// Default sound URLs used by DoorEntity when none specified in config
const DEFAULT_SOUNDS = [
  '/sounds/doors/swing-open.wav',
  '/sounds/doors/swing-close.wav',
  '/sounds/doors/slide-open.wav',
  '/sounds/doors/slide-close.wav',
];

export class DoorManager {
  private doors: DoorEntity[] = [];
  private defaultSoundsLoaded = false;

  constructor(
    private scene: THREE.Scene,
    private physicsWorld: PhysicsWorld,
    private RAPIER: typeof RAPIER_API,
    private eventBus: EventBus,
    private entityManager: EntityManager,
    private audioManager: AudioManager,
    private modelCache: ModelCache,
    private interactionSystem: InteractionSystem
  ) {}

  async preloadModels(urls: string[]): Promise<void> {
    await this.modelCache.preload(urls);
  }

  async preloadSounds(urls: string[]): Promise<void> {
    const unique = [...new Set(urls)];
    await Promise.all(unique.map((url) => this.audioManager.loadSound(url).catch(() => {
      // Sound file may not exist yet — user will supply later
    })));
  }

  private async ensureDefaultSounds(): Promise<void> {
    if (this.defaultSoundsLoaded) return;
    this.defaultSoundsLoaded = true;
    await this.preloadSounds(DEFAULT_SOUNDS);
  }

  async spawnDoor(config: DoorConfig): Promise<DoorEntity> {
    // Ensure default sounds are loaded
    await this.ensureDefaultSounds();

    // Ensure model is loaded
    if (!this.modelCache.has(config.modelUrl)) {
      await this.modelCache.preload([config.modelUrl]);
    }

    const model = this.modelCache.clone(config.modelUrl);

    const door = new DoorEntity(
      this.eventBus,
      this.scene,
      this.physicsWorld,
      this.RAPIER,
      this.audioManager,
      config,
      model
    );

    this.doors.push(door);
    this.entityManager.add(door);
    this.interactionSystem.register(door);
    return door;
  }

  removeDoor(door: DoorEntity): void {
    const idx = this.doors.indexOf(door);
    if (idx !== -1) {
      this.doors.splice(idx, 1);
      this.interactionSystem.unregister(door);
      this.entityManager.remove(door);
      door.dispose();
    }
  }

  disposeAll(): void {
    for (const door of this.doors) {
      this.interactionSystem.unregister(door);
      door.dispose();
    }
    this.doors.length = 0;
  }
}
