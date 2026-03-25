import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import type RAPIER_API from '@dimforge/rapier3d-compat';
import { EnemyCharacter, type EnemyCharacterConfig } from './EnemyCharacter';
import { EnemyAI, type AIConfig } from '../ai/EnemyAI';
import type { EventBus } from '../core/EventBus';
import type { EntityManager } from './EntityManager';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import type { AudioManager } from '../audio/AudioManager';
import type { ModelCache } from '../core/ModelCache';
import type { AssetLoader } from '../core/AssetLoader';
import type { DamageSystem } from '../systems/DamageSystem';
import type { Actor } from './Actor';
import type { NavMeshSystem } from '../navigation/NavMeshSystem';

/**
 * Enemy placement descriptor from level JSON.
 */
export interface EnemyPlacement {
  characterId: string;
  characterFile?: string;
  position: { x: number; y: number; z: number };
  rotation?: number;
  weaponId?: string;
  weaponOptions?: { dual?: boolean };
  health?: number;
  ai?: Partial<AIConfig> | false;
}

type EntryState = 'alive' | 'dying' | 'dead';

interface EnemyEntry {
  enemy: EnemyCharacter;
  ai: EnemyAI | null;
  placement: EnemyPlacement;
  state: EntryState;
}

/**
 * Manages enemy lifecycle for a level: spawning, updating, death cleanup,
 * model caching, and budget enforcement.
 *
 * Mirrors GoldenEye N64 design: enemies are pre-placed in level data,
 * loaded at level start, and stay dead when killed.
 */
export class EnemyManager {
  private entries: EnemyEntry[] = [];
  private dormant: EnemyPlacement[] = [];
  private maxActive: number;
  private navMeshSystem: NavMeshSystem | null = null;

  // Default AI config (merged with per-placement overrides)
  private defaultAI: Partial<AIConfig> = {
    detectionRange: 12,
    attackRange: 6,
    damage: 8,
  };

  constructor(
    private scene: THREE.Scene,
    private physicsWorld: PhysicsWorld,
    private RAPIER: typeof RAPIER_API,
    private eventBus: EventBus,
    private entityManager: EntityManager,
    private audioManager: AudioManager,
    private modelCache: ModelCache,
    private assetLoader: AssetLoader,
    private damageSystem: DamageSystem,
    private playerActor: Actor,
    maxActive = 12
  ) {
    this.maxActive = maxActive;
  }

  setNavMeshSystem(navMeshSystem: NavMeshSystem): void {
    this.navMeshSystem = navMeshSystem;
  }

  // ── Model preloading ─────────────────────────────────────────────

  async preloadModels(placements: EnemyPlacement[]): Promise<void> {
    const urls = [
      ...new Set(
        placements.map(
          (p) =>
            p.characterFile ??
            `/models/enemies/characters/${p.characterId}.glb`
        )
      ),
    ];
    await this.modelCache.preload(urls);
  }

  private async preloadSounds(placements: EnemyPlacement[]): Promise<void> {
    const sounds = new Set<string>();

    // Weapon fire sounds from placed enemies
    for (const p of placements) {
      if (p.weaponId) {
        const { ENEMY_WEAPONS } = await import('../data/EnemyWeaponConfig');
        const wep = ENEMY_WEAPONS[p.weaponId];
        if (wep) sounds.add(wep.soundFile);
      }
    }

    // Pain sounds (1-26) and impact sound
    for (let i = 1; i <= 26; i++) {
      sounds.add(`/sounds/enemies/pain-${i}.wav`);
    }
    sounds.add('/sounds/enemies/bullet-hit.wav');

    await Promise.all(
      [...sounds].map((url) => this.audioManager.loadSound(url))
    );
  }

  // ── Level loading ────────────────────────────────────────────────

  async loadPlacements(placements: EnemyPlacement[]): Promise<void> {
    if (placements.length === 0) return;

    // Preload all enemy sounds (weapon fire, pain, impact)
    await this.preloadSounds(placements);

    // Split into active vs dormant based on budget
    const budget =
      this.maxActive > 0 ? this.maxActive : placements.length;
    const active = placements.slice(0, budget);
    const dormant = placements.slice(budget);

    // Spawn active enemies
    await Promise.all(active.map((p) => this.spawnFromPlacement(p)));

    // Store dormant placements
    this.dormant = dormant.map((p) => ({ ...p }));
  }

  // ── Per-frame update ─────────────────────────────────────────────

  update(dt: number, playerPos: THREE.Vector3): void {
    for (const entry of this.entries) {
      if (entry.state === 'dead') continue;

      entry.enemy.tick(dt);

      if (entry.ai && entry.state === 'alive') {
        entry.ai.update(dt, playerPos);
      }
    }
  }

  // ── Queries ──────────────────────────────────────────────────────

  getAlive(): EnemyEntry[] {
    return this.entries.filter((e) => e.state === 'alive');
  }

  getAliveEnemies(): EnemyCharacter[] {
    return this.getAlive().map((e) => e.enemy);
  }

  getNearest(
    pos: THREE.Vector3
  ): { enemy: EnemyCharacter; ai: EnemyAI | null; distance: number } | null {
    let best: EnemyEntry | null = null;
    let bestDist = Infinity;
    for (const entry of this.entries) {
      if (entry.state !== 'alive') continue;
      const d = entry.enemy.getWorldPosition().distanceTo(pos);
      if (d < bestDist) {
        bestDist = d;
        best = entry;
      }
    }
    return best
      ? { enemy: best.enemy, ai: best.ai, distance: bestDist }
      : null;
  }

  getInRadius(
    pos: THREE.Vector3,
    radius: number
  ): Array<{ enemy: EnemyCharacter; ai: EnemyAI | null; distance: number }> {
    const results: Array<{
      enemy: EnemyCharacter;
      ai: EnemyAI | null;
      distance: number;
    }> = [];
    for (const entry of this.entries) {
      if (entry.state !== 'alive') continue;
      const d = entry.enemy.getWorldPosition().distanceTo(pos);
      if (d <= radius) {
        results.push({ enemy: entry.enemy, ai: entry.ai, distance: d });
      }
    }
    return results;
  }

  get aliveCount(): number {
    let count = 0;
    for (const entry of this.entries) {
      if (entry.state === 'alive') count++;
    }
    return count;
  }

  // ── Spawning ─────────────────────────────────────────────────────

  async spawnSingle(placement: EnemyPlacement): Promise<EnemyCharacter | null> {
    if (this.maxActive > 0 && this.aliveCount >= this.maxActive) {
      this.dormant.push({ ...placement });
      return null;
    }

    // Ensure model is cached
    const url =
      placement.characterFile ??
      `/models/enemies/characters/${placement.characterId}.glb`;
    if (!this.modelCache.has(url)) {
      await this.modelCache.preload([url]);
    }

    const entry = await this.spawnFromPlacement(placement);
    return entry?.enemy ?? null;
  }

  private async spawnFromPlacement(
    placement: EnemyPlacement
  ): Promise<EnemyEntry | null> {
    const {
      characterId,
      characterFile,
      position,
      rotation = 0,
      weaponId,
      weaponOptions,
      health,
      ai: aiConfig,
    } = placement;

    const url =
      characterFile ?? `/models/enemies/characters/${characterId}.glb`;

    // Create enemy character
    const config: EnemyCharacterConfig = {
      characterId,
      characterFile: url,
      position,
      rotation,
      health,
    };

    const enemy = new EnemyCharacter(
      this.eventBus,
      this.scene,
      this.physicsWorld,
      this.entityManager,
      this.RAPIER,
      this.audioManager,
      this.assetLoader,
      config
    );

    // Spawn from cached model clone
    const baseModel = this.modelCache.getOriginal(url);
    await enemy.spawnFromClone(baseModel, position, rotation);

    // Register with entity manager
    this.entityManager.add(enemy);

    // Equip weapon
    if (weaponId) {
      await enemy.equip(weaponId, weaponOptions);
    }

    // Set up AI
    let ai: EnemyAI | null = null;
    if (aiConfig !== false) {
      const mergedConfig: Partial<AIConfig> = {
        ...this.defaultAI,
        ...(typeof aiConfig === 'object' ? aiConfig : {}),
      };

      // Pull accuracy/range from weapon config if not specified
      if (mergedConfig.accuracy === undefined && enemy.weaponConfig) {
        mergedConfig.accuracy = enemy.weaponConfig.accuracy;
      }
      if (mergedConfig.maxRange === undefined && enemy.weaponConfig) {
        mergedConfig.maxRange = enemy.weaponConfig.range;
      }

      ai = new EnemyAI(
        enemy,
        this.physicsWorld,
        this.RAPIER,
        this.damageSystem,
        this.playerActor,
        this.eventBus,
        mergedConfig,
        this.navMeshSystem
      );
    }

    const entry: EnemyEntry = {
      enemy,
      ai,
      placement,
      state: 'alive',
    };

    // Wire death handling: fade-out cleanup → activate dormant
    enemy.onCleanup = () => {
      entry.state = 'dead';
      this.tryActivateDormant();
      this.checkAllDead();
    };

    // Listen for entity-killed to mark dying
    this.eventBus.on('entity-killed', ({ entity }) => {
      if (entity === enemy && entry.state === 'alive') {
        entry.state = 'dying';
      }
    });

    this.entries.push(entry);
    return entry;
  }

  // ── Dormant activation ───────────────────────────────────────────

  private tryActivateDormant(): void {
    if (this.dormant.length === 0) return;
    if (this.maxActive > 0 && this.aliveCount >= this.maxActive) return;

    const placement = this.dormant.shift()!;
    this.spawnFromPlacement(placement);
  }

  private checkAllDead(): void {
    if (this.aliveCount === 0 && this.dormant.length === 0) {
      this.eventBus.emit('all-enemies-dead', {});
    }
  }

  // ── Cleanup ──────────────────────────────────────────────────────

  dispose(): void {
    for (const entry of this.entries) {
      entry.enemy.dispose();
    }
    this.entries = [];
    this.dormant = [];
  }
}
