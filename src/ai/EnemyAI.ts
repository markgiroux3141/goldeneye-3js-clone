import * as THREE from 'three';
import type RAPIER_API from '@dimforge/rapier3d-compat';
import { AI_FIRE_ANIMS_BY_TYPE } from '../data/AnimationSet';
import type { EnemyCharacter } from '../entities/EnemyCharacter';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import type { DamageSystem } from '../systems/DamageSystem';
import type { Actor } from '../entities/Actor';
import type { EventBus } from '../core/EventBus';
import type { NavMeshSystem, NavPoint } from '../navigation/NavMeshSystem';

/**
 * AI state machine for enemy characters.
 * States: idle → alert → chase → attack ↔ cooldown
 *
 * Uses Rapier raycasts for line-of-sight and attack hit detection.
 */

export type AIState = 'idle' | 'alert' | 'chase' | 'attack' | 'cooldown';

export interface AIConfig {
  detectionRange?: number;    // meters (default 12)
  detectionCone?: number;     // degrees (default 120)
  attackRange?: number;       // meters (default 6)
  chaseSpeed?: number;        // m/s (default 4)
  cooldownDuration?: number;  // seconds (default 1.5)
  accuracy?: number;          // base accuracy 0-1 (default 0.4)
  accuracyCone?: number;      // degrees spread (default 15)
  maxRange?: number;          // max effective range meters (default 15)
  damage?: number;            // per hit (default 10)
}

// Reusable temp vectors
const _tmpFrom = { x: 0, y: 0, z: 0 };
const _tmpDir = { x: 0, y: 0, z: 0 };

export class EnemyAI {
  aiState: AIState = 'idle';

  // Config (all in meters)
  private detectionRange: number;
  private detectionCone: number;   // radians
  private attackRange: number;
  private chaseSpeed: number;
  private cooldownDuration: number;
  private accuracy: number;
  private accuracyCone: number;    // radians
  private maxRange: number;
  private damage: number;

  // Timers
  private alertTimer = 0;
  private chaseTimer = 0;
  private cooldownTimer = 0;
  private readonly ALERT_DURATION = 0.5;
  private readonly CHASE_UPDATE_INTERVAL = 0.4;

  // Attack tracking
  private isAttacking = false;
  private fireAnimStarted = false;

  // Target (set each frame)
  private target: THREE.Vector3 | null = null;

  // Navmesh pathfinding
  private navMeshSystem: NavMeshSystem | null = null;
  private currentPath: NavPoint[] = [];
  private pathIndex = 0;

  constructor(
    private enemy: EnemyCharacter,
    private physicsWorld: PhysicsWorld,
    private RAPIER: typeof RAPIER_API,
    private damageSystem: DamageSystem,
    private playerActor: Actor,
    private eventBus: EventBus,
    config: AIConfig = {},
    navMeshSystem: NavMeshSystem | null = null
  ) {
    this.detectionRange = config.detectionRange ?? 12;
    this.detectionCone = ((config.detectionCone ?? 120) * Math.PI) / 180;
    this.attackRange = config.attackRange ?? 6;
    this.chaseSpeed = config.chaseSpeed ?? 4;
    this.cooldownDuration = config.cooldownDuration ?? 1.5;
    this.accuracy = config.accuracy ?? 0.4;
    this.accuracyCone = ((config.accuracyCone ?? 15) * Math.PI) / 180;
    this.maxRange = config.maxRange ?? 15;
    this.damage = config.damage ?? 10;
    this.navMeshSystem = navMeshSystem;
  }

  update(dt: number, playerPos: THREE.Vector3): void {
    if (this.enemy.isDead()) return;
    this.target = playerPos;

    switch (this.aiState) {
      case 'idle':
        this.updateIdle();
        break;
      case 'alert':
        this.updateAlert(dt);
        break;
      case 'chase':
        this.updateChase(dt);
        break;
      case 'attack':
        this.updateAttack();
        break;
      case 'cooldown':
        this.updateCooldown(dt);
        break;
    }
  }

  // ── State updates ────────────────────────────────────────────────

  private updateIdle(): void {
    if (!this.target) return;

    const dist = this.distToTarget();
    if (
      dist < this.detectionRange &&
      this.isTargetInCone() &&
      this.hasLineOfSight()
    ) {
      this.aiState = 'alert';
      this.alertTimer = 0;
      this.eventBus.emit('enemy-alert', { enemy: this.enemy });
    }
  }

  private updateAlert(dt: number): void {
    if (!this.target) return;
    this.enemy.faceTarget(this.target);
    this.alertTimer += dt;

    if (this.alertTimer >= this.ALERT_DURATION) {
      this.aiState = 'chase';
      this.chaseTimer = 0;
    }
  }

  private updateChase(dt: number): void {
    if (!this.target) return;
    const dist = this.distToTarget();

    // In attack range with LOS → attack
    if (
      dist <= this.attackRange &&
      this.enemy.enemyState !== 'action' &&
      this.hasLineOfSight()
    ) {
      this.enemy.stop();
      this.currentPath = [];
      this.aiState = 'attack';
      this.isAttacking = false;
      return;
    }

    // Lost target → idle
    if (dist > this.detectionRange * 1.5) {
      this.enemy.stop();
      this.currentPath = [];
      this.aiState = 'idle';
      return;
    }

    // Recompute path periodically
    this.chaseTimer += dt;
    if (this.chaseTimer >= this.CHASE_UPDATE_INTERVAL) {
      this.chaseTimer = 0;

      // LOS shortcut: if we can see the player, go direct
      if (this.hasLineOfSight() && dist < this.attackRange * 2) {
        this.currentPath = [];
        this.enemy.moveTo(this.target.clone(), this.chaseSpeed);
        return;
      }

      // Use navmesh pathfinding
      if (this.navMeshSystem) {
        const pos = this.enemy.position;
        const path = this.navMeshSystem.computePath(
          { x: pos.x, y: pos.y, z: pos.z },
          { x: this.target.x, y: this.target.y, z: this.target.z }
        );
        if (path && path.length > 0) {
          this.currentPath = path;
          this.pathIndex = 0;
        } else {
          // Fallback: direct movement
          this.currentPath = [];
          this.enemy.moveTo(this.target.clone(), this.chaseSpeed);
          return;
        }
      } else {
        // No navmesh: direct movement
        this.enemy.moveTo(this.target.clone(), this.chaseSpeed);
        return;
      }
    }

    // Follow current path waypoints
    if (this.currentPath.length > 0 && this.pathIndex < this.currentPath.length) {
      const wp = this.currentPath[this.pathIndex];
      const pos = this.enemy.position;
      const dx = wp.x - pos.x;
      const dz = wp.z - pos.z;
      const waypointDist = Math.sqrt(dx * dx + dz * dz);

      if (waypointDist < 0.3) {
        // Arrived at waypoint, advance
        this.pathIndex++;
        if (this.pathIndex < this.currentPath.length) {
          const next = this.currentPath[this.pathIndex];
          this.enemy.moveTo(new THREE.Vector3(next.x, next.y, next.z), this.chaseSpeed);
        }
      } else {
        this.enemy.moveTo(new THREE.Vector3(wp.x, wp.y, wp.z), this.chaseSpeed);
      }
    }
  }

  private updateAttack(): void {
    if (!this.target) return;
    const dist = this.distToTarget();

    // Target moved out of range or lost LOS → chase
    if (dist > this.attackRange * 1.3 || !this.hasLineOfSight()) {
      this.aiState = 'chase';
      this.chaseTimer = 0;
      this.isAttacking = false;
      return;
    }

    // Face target
    this.enemy.faceTarget(this.target);

    // Fire if not already in a fire animation
    if (this.enemy.enemyState !== 'action' && !this.isAttacking) {
      this.isAttacking = true;
      this.fireAnimStarted = false;

      const type = this.enemy.isDualWield
        ? 'dual'
        : (this.enemy.weaponConfig?.type ?? 'rifle');
      const available = AI_FIRE_ANIMS_BY_TYPE[type];
      if (!available || available.length === 0) return;

      const animId =
        available[Math.floor(Math.random() * available.length)];

      // Register shot callback for hit detection
      this.enemy.clearShotCallbacks();
      this.enemy.onShot(() => this.onShotFired());

      this.enemy.fire(animId);
    }

    // Track when the fire animation actually starts (after async clip load)
    if (this.isAttacking && !this.fireAnimStarted && this.enemy.enemyState === 'action') {
      this.fireAnimStarted = true;
    }

    // Check if fire animation completed → cooldown (only after it has started)
    if (this.isAttacking && this.fireAnimStarted && this.enemy.enemyState !== 'action') {
      this.enemy.clearShotCallbacks();
      this.isAttacking = false;
      this.aiState = 'cooldown';
      this.cooldownTimer = 0;
    }
  }

  private updateCooldown(dt: number): void {
    if (this.target) this.enemy.faceTarget(this.target);
    this.cooldownTimer += dt;

    if (this.cooldownTimer >= this.cooldownDuration) {
      const dist = this.distToTarget();
      if (dist <= this.attackRange && this.hasLineOfSight()) {
        this.aiState = 'attack';
        this.isAttacking = false;
      } else if (dist <= this.detectionRange) {
        this.aiState = 'chase';
        this.chaseTimer = 0;
      } else {
        this.aiState = 'idle';
      }
    }
  }

  // ── Probability-based shot hit detection (GoldenEye style) ──────

  private onShotFired(): void {
    if (!this.target) return;

    // Must have line of sight (walls block shots)
    if (!this.hasLineOfSight()) return;

    // Distance-based hit probability
    const dist = this.distToTarget();
    const distFactor = Math.max(0, 1 - dist / this.maxRange);

    // Hit chance = accuracy * distance falloff
    const hitChance = this.accuracy * distFactor;

    if (Math.random() < hitChance) {
      this.damageSystem.applyDamage(this.playerActor, this.damage, this.enemy);
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────

  private distToTarget(): number {
    if (!this.target) return Infinity;
    const pos = this.enemy.getWorldPosition();
    const dx = this.target.x - pos.x;
    const dz = this.target.z - pos.z;
    return Math.sqrt(dx * dx + dz * dz);
  }

  private angleToTarget(): number {
    if (!this.target) return Math.PI;
    const pos = this.enemy.getWorldPosition();
    const toTarget = new THREE.Vector3(
      this.target.x - pos.x,
      0,
      this.target.z - pos.z
    ).normalize();
    const forward = this.enemy.getForwardDirection();
    return forward.angleTo(toTarget);
  }

  private isTargetInCone(): boolean {
    return this.angleToTarget() < this.detectionCone / 2;
  }

  private hasLineOfSight(): boolean {
    if (!this.target) return false;

    const pos = this.enemy.getWorldPosition();
    // Cast from chest height
    _tmpFrom.x = pos.x;
    _tmpFrom.y = pos.y + 1.0;
    _tmpFrom.z = pos.z;

    const to = this.target.clone();
    to.y += 0.8; // target chest

    const dir = new THREE.Vector3(
      to.x - _tmpFrom.x,
      to.y - _tmpFrom.y,
      to.z - _tmpFrom.z
    );
    const dist = dir.length();
    dir.normalize();

    _tmpDir.x = dir.x;
    _tmpDir.y = dir.y;
    _tmpDir.z = dir.z;

    const ray = new this.RAPIER.Ray(_tmpFrom, _tmpDir);
    const hit = this.physicsWorld.world.castRay(
      ray,
      dist,
      true,
      undefined,
      undefined,
      this.enemy.collider! // exclude self
    );

    if (!hit) return true; // no hit = clear LOS

    // Check if the first thing hit is the player (or nothing blocking)
    const hitCollider = hit.collider;
    const playerCollider = this.playerActor.collider;
    if (playerCollider && hitCollider.handle === playerCollider.handle) {
      return true; // hit player = clear LOS
    }

    // Hit a wall before reaching the player
    return hit.timeOfImpact >= dist - 0.1;
  }
}
