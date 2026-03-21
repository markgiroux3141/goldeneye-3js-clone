import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import type RAPIER_API from '@dimforge/rapier3d-compat';
import { Actor } from './Actor';
import type { Entity } from './Entity';
import type { EventBus } from '../core/EventBus';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import type { EntityManager } from './EntityManager';
import type { AssetLoader } from '../core/AssetLoader';
import type { AudioManager } from '../audio/AudioManager';
import {
  DEFAULT_ANIMATIONS,
  SPEED_THRESHOLDS,
  FIRE_TIMING,
  FIRE_ANIMS_BY_TYPE,
  HIT_ANIMS,
  DEATH_ANIMS,
  getAnimIdFromPath,
} from '../data/AnimationSet';
import { ENEMY_WEAPONS, type EnemyWeaponDef } from '../data/EnemyWeaponConfig';

// ── Module-level animation clip cache (shared across all enemies) ──

const clipCache = new Map<string, THREE.AnimationClip | null>();

async function loadClip(
  animPath: string,
  assetLoader: AssetLoader
): Promise<THREE.AnimationClip | null> {
  if (clipCache.has(animPath)) return clipCache.get(animPath)!;
  try {
    // Must use loadGLTFRaw to get gltf.animations (loadGLTF strips them)
    const gltf = await assetLoader.loadGLTFRaw(animPath);
    const clip = gltf.animations[0] ?? null;
    clipCache.set(animPath, clip);
    return clip;
  } catch {
    console.warn(`EnemyCharacter: failed to load ${animPath}`);
    clipCache.set(animPath, null);
    return null;
  }
}

// ── Types ──────────────────────────────────────────────────────────

export type EnemyState = 'idle' | 'moving' | 'action' | 'dead';

export interface EnemyCharacterConfig {
  characterId: string;
  characterFile?: string;
  position: { x: number; y: number; z: number };
  rotation?: number;
  weaponId?: string;
  weaponOptions?: { dual?: boolean };
  health?: number;
  ai?: Record<string, unknown>;
}

// ── EnemyCharacter ─────────────────────────────────────────────────

export class EnemyCharacter extends Actor {
  readonly characterId: string;

  // Scene graph
  private group: THREE.Group | null = null;
  private model: THREE.Object3D | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private skeleton: THREE.Skeleton | null = null;

  // Physics
  private rigidBody: RAPIER_API.RigidBody | null = null;
  private enemyController: RAPIER_API.KinematicCharacterController | null = null;
  private verticalVelocity = 0;
  private readonly GRAVITY = -20;

  // Animation state
  private currentAction: THREE.AnimationAction | null = null;
  private currentLocomotion: string | null = null;
  private animations: Record<string, string> = { ...DEFAULT_ANIMATIONS };

  // Movement
  enemyState: EnemyState = 'idle';
  private moveTarget: THREE.Vector3 | null = null;
  private moveSpeed = 3.0;
  private rotateSpeed = 5;
  private readonly ARRIVAL_THRESHOLD = 0.1;

  // Weapon
  weaponId: string | null = null;
  weaponConfig: EnemyWeaponDef | null = null;
  private weaponModel: THREE.Object3D | null = null;
  private weaponModelLeft: THREE.Object3D | null = null;
  private muzzleFlash: THREE.Object3D | null = null;
  private muzzleFlashLeft: THREE.Object3D | null = null;
  isDualWield = false;
  private muzzleTimer = 0;

  // Hand bones
  private rightHand: THREE.Bone | null = null;
  private leftHand: THREE.Bone | null = null;

  // Firing state
  private isFiring = false;
  private fireElapsed = 0;
  private timeSinceLastShot = 0;
  private fireWindow: { fireStart: number; fireEnd: number } | null = null;
  private shotCallbacks: Array<() => void> = [];

  // Hit reaction
  private hitReactionFinishedListener: ((e: { action: THREE.AnimationAction }) => void) | null = null;

  // Fade-out
  private isFading = false;
  private fadeElapsed = 0;
  private readonly FADE_DURATION = 2.0;

  // Cleanup callback (set by EnemyManager)
  onCleanup: (() => void) | null = null;

  constructor(
    eventBus: EventBus,
    private scene: THREE.Scene,
    private physicsWorld: PhysicsWorld,
    private entityManager: EntityManager,
    private RAPIER: typeof RAPIER_API,
    private audioManager: AudioManager,
    private assetLoader: AssetLoader,
    config: EnemyCharacterConfig
  ) {
    super(eventBus, {
      health: config.health ?? 100,
      maxHealth: config.health ?? 100,
      faction: 'enemy',
    });

    this.characterId = config.characterId;
  }

  // ── Spawning ─────────────────────────────────────────────────────

  async spawn(
    pos: { x: number; y: number; z: number },
    rotation = 0
  ): Promise<void> {
    const characterFile =
      `/models/enemies/characters/${this.characterId}.glb`;
    const gltf = await this.assetLoader.loadGLTF(characterFile);
    await this.initFromModel(gltf, pos, rotation);
  }

  async spawnFromClone(
    baseModel: THREE.Object3D,
    pos: { x: number; y: number; z: number },
    rotation = 0
  ): Promise<void> {
    const cloned = SkeletonUtils.clone(baseModel) as THREE.Group;
    await this.initFromModel(cloned, pos, rotation, true);
  }

  private async initFromModel(
    modelOrGltf: THREE.Object3D,
    pos: { x: number; y: number; z: number },
    rotation: number,
    isClone = false
  ): Promise<void> {
    this.model = isClone ? modelOrGltf : modelOrGltf;

    // Clone geometry per-instance for independent vertex colors (damage painting)
    this.model.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        if (isClone) child.geometry = child.geometry.clone();
        const geo = child.geometry;
        const count = geo.attributes.position.count;
        const colors = new Float32Array(count * 3).fill(1.0);
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        // Clone material per-instance and enable double-sided + vertex colors
        child.material = child.material.clone();
        child.material.side = THREE.DoubleSide;
        child.material.vertexColors = true;
        child.material.needsUpdate = true;
      }
    });

    // Find skeleton and hand bones
    this.model.traverse((child) => {
      if (child instanceof THREE.SkinnedMesh && !this.skeleton) {
        this.skeleton = child.skeleton;
      }
      if ((child as THREE.Bone).isBone) {
        if (child.name === 'Bone_9') this.rightHand = child as THREE.Bone;
        if (child.name === 'Bone_8') this.leftHand = child as THREE.Bone;
      }
    });

    // Scale model from GoldenEye scale (1000 units = 1m) to project scale (1 unit = 1m)
    // 0.0013 = base 0.001 + 30% larger to match level proportions
    this.model.scale.setScalar(0.00104);
    // Offset model upward so feet touch ground (model origin is at character center)
    this.model.position.y = 1080 * 0.00104 - 0.9; // GE groundOffset, feet at capsule bottom

    // Wrap in group for world positioning
    this.group = new THREE.Group();
    this.group.position.set(pos.x, pos.y, pos.z);
    this.group.rotation.y = rotation;
    this.group.add(this.model);
    this.scene.add(this.group);

    // Physics: kinematic body + capsule collider (capsule half-height 0.5 + radius 0.3)
    this.rigidBody = this.physicsWorld.createKinematicBody(pos.x, pos.y, pos.z);
    const colliderDesc = this.RAPIER.ColliderDesc.capsule(0.6, 0.3);
    this.collider = this.physicsWorld.world.createCollider(
      colliderDesc,
      this.rigidBody
    );
    this.entityManager.registerCollider(this.collider.handle, this);

    // Character controller for wall sliding
    this.enemyController = this.physicsWorld.createEnemyCharacterController();

    // Animation mixer
    this.mixer = new THREE.AnimationMixer(this.model);

    // Start idle
    const idleClip = await loadClip(this.animations.idle, this.assetLoader);
    if (idleClip) this.playClip(idleClip, true);
    this.enemyState = 'idle';

    // Sync entity position
    this.position.set(pos.x, pos.y, pos.z);
  }

  // ── Weapon equipping ─────────────────────────────────────────────

  async equip(weaponId: string, options?: { dual?: boolean }): Promise<void> {
    const config = ENEMY_WEAPONS[weaponId];
    if (!config) {
      console.warn(`EnemyCharacter: unknown weapon "${weaponId}"`);
      return;
    }

    this.unequip();
    this.weaponId = weaponId;
    this.weaponConfig = config;
    this.isDualWield = options?.dual ?? false;

    if (this.rightHand) {
      this.weaponModel = await this.attachWeapon(
        config,
        this.rightHand,
        'right'
      );
      this.muzzleFlash = await this.attachMuzzle(
        config,
        this.rightHand,
        'right'
      );
    }

    if (this.isDualWield && this.leftHand) {
      this.weaponModelLeft = await this.attachWeapon(
        config,
        this.leftHand,
        'left'
      );
      this.muzzleFlashLeft = await this.attachMuzzle(
        config,
        this.leftHand,
        'left'
      );
    }
  }

  unequip(): void {
    for (const obj of [
      this.weaponModel,
      this.muzzleFlash,
      this.weaponModelLeft,
      this.muzzleFlashLeft,
    ]) {
      if (obj?.parent) obj.parent.remove(obj);
    }
    this.weaponModel = null;
    this.weaponModelLeft = null;
    this.muzzleFlash = null;
    this.muzzleFlashLeft = null;
    this.weaponId = null;
    this.weaponConfig = null;
    this.isDualWield = false;
  }

  private async attachWeapon(
    config: EnemyWeaponDef,
    bone: THREE.Bone,
    hand: 'left' | 'right'
  ): Promise<THREE.Object3D> {
    const group = await this.assetLoader.loadGLTF(config.gunFile);
    const model = group;
    const offsets = hand === 'left' ? config.leftPosition : config.position;
    const rot = hand === 'left' ? config.leftRotation : config.rotation;
    model.position.copy(offsets);
    model.rotation.copy(rot);
    bone.add(model);
    return model;
  }

  private async attachMuzzle(
    config: EnemyWeaponDef,
    bone: THREE.Bone,
    hand: 'left' | 'right'
  ): Promise<THREE.Object3D> {
    const group = await this.assetLoader.loadGLTF(config.muzzleFile);
    const model = group;
    model.visible = false;

    // Additive blending for muzzle flash
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = child.material.clone();
        child.material.transparent = true;
        child.material.blending = THREE.AdditiveBlending;
        child.material.depthWrite = false;
      }
    });

    const offsets = hand === 'left' ? config.leftPosition : config.position;
    const rot = hand === 'left' ? config.leftRotation : config.rotation;
    model.position.copy(offsets);
    model.rotation.copy(rot);
    bone.add(model);
    return model;
  }

  // ── Per-frame update ─────────────────────────────────────────────

  /** No-op: EnemyManager drives updates via tick() to avoid double-update from entityManager */
  update(_dt: number): void {}

  /** Called by EnemyManager each frame (not entityManager) */
  tick(dt: number): void {
    if (!this.mixer) return;
    this.mixer.update(dt);

    // Death fade-out runs even while dead
    if (this.isFading) {
      this.updateFadeOut(dt);
    }

    if (this.enemyState === 'dead') return;

    // Muzzle flash timer
    if (this.muzzleTimer > 0) {
      this.muzzleTimer -= dt;
      if (this.muzzleTimer <= 0) {
        if (this.muzzleFlash) this.muzzleFlash.visible = false;
        if (this.muzzleFlashLeft) this.muzzleFlashLeft.visible = false;
      }
    }

    // Fire timing window
    if (this.isFiring && this.fireWindow) {
      this.fireElapsed += dt;
      this.timeSinceLastShot += dt;

      const { fireStart, fireEnd } = this.fireWindow;
      const interval = 1 / (this.weaponConfig?.fireRate ?? 4);

      if (this.fireElapsed >= fireEnd) {
        this.isFiring = false;
        if (this.muzzleFlash) this.muzzleFlash.visible = false;
        if (this.muzzleFlashLeft) this.muzzleFlashLeft.visible = false;
      } else if (
        this.fireElapsed >= fireStart &&
        this.timeSinceLastShot >= interval
      ) {
        this.onShotFired();
        this.timeSinceLastShot = 0;
      }
    }

    // Movement
    if (this.enemyState === 'moving' && this.moveTarget) {
      this.updateMovement(dt);
    }

    // Apply gravity via character controller
    this.updatePhysics(dt);
  }

  // ── Movement ─────────────────────────────────────────────────────

  moveTo(targetPos: THREE.Vector3, speed?: number): void {
    if (this.enemyState === 'dead') return;
    if (this.isFiring) this.stopFireState();

    this.moveTarget = targetPos.clone();
    if (speed !== undefined) this.moveSpeed = speed;

    if (this.enemyState !== 'moving') {
      this.setEnemyState('moving');
      this.playLocomotion();
    }
  }

  faceTarget(targetPos: THREE.Vector3): void {
    if (!this.group) return;
    const dir = new THREE.Vector3()
      .subVectors(targetPos, this.group.position)
      .setY(0);
    if (dir.lengthSq() > 0.0001) {
      this.group.rotation.y = Math.atan2(dir.x, dir.z);
    }
  }

  stop(): void {
    if (this.enemyState === 'dead') return;
    if (this.isFiring) this.stopFireState();
    this.moveTarget = null;
    if (this.enemyState === 'moving') {
      this.setEnemyState('idle');
      this.playIdle();
    }
  }

  private updateMovement(dt: number): void {
    if (!this.group || !this.moveTarget) return;

    const pos = this.group.position;
    const dir = new THREE.Vector3(
      this.moveTarget.x - pos.x,
      0,
      this.moveTarget.z - pos.z
    );
    const dist = dir.length();

    if (dist < this.ARRIVAL_THRESHOLD) {
      this.moveTarget = null;
      this.setEnemyState('idle');
      if (this.enemyState === 'idle') this.playIdle();
      return;
    }

    dir.normalize();

    // Smooth rotation toward target
    const targetAngle = Math.atan2(dir.x, dir.z);
    let angleDiff = targetAngle - this.group.rotation.y;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    const maxRot = this.rotateSpeed * dt;
    this.group.rotation.y += Math.max(-maxRot, Math.min(maxRot, angleDiff));

    // Move forward along facing direction
    const facing = new THREE.Vector3(0, 0, 1).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      this.group.rotation.y
    );
    const moveAmount = Math.min(this.moveSpeed * dt, dist);

    // Store desired horizontal movement for physics step
    this.horizontalMovement.copy(facing).multiplyScalar(moveAmount);
  }

  private horizontalMovement = new THREE.Vector3();

  private updatePhysics(dt: number): void {
    if (!this.rigidBody || !this.collider || !this.enemyController) return;

    // Gravity
    this.verticalVelocity += this.GRAVITY * dt;

    const desired = {
      x: this.horizontalMovement.x,
      y: this.verticalVelocity * dt,
      z: this.horizontalMovement.z,
    };

    this.enemyController.computeColliderMovement(this.collider, desired);
    const corrected = this.enemyController.computedMovement();

    const pos = this.rigidBody.translation();
    const newPos = {
      x: pos.x + corrected.x,
      y: pos.y + corrected.y,
      z: pos.z + corrected.z,
    };
    this.rigidBody.setNextKinematicTranslation(newPos);

    // Check grounded
    if (this.enemyController.computedGrounded()) {
      this.verticalVelocity = 0;
    }

    // Sync scene group to physics body
    if (this.group) {
      this.group.position.set(newPos.x, newPos.y, newPos.z);
    }

    // Sync entity position
    this.position.set(newPos.x, newPos.y, newPos.z);

    // Clear movement for next frame
    this.horizontalMovement.set(0, 0, 0);
  }

  // ── Firing ───────────────────────────────────────────────────────

  async fire(animId?: string): Promise<void> {
    if (this.enemyState === 'dead' || this.enemyState === 'action') return;

    const type = this.isDualWield
      ? 'dual'
      : (this.weaponConfig?.type ?? 'rifle');

    if (!animId) {
      const available = FIRE_ANIMS_BY_TYPE[type];
      animId = available ? available[0] : '01';
    }

    const timing = FIRE_TIMING[animId];
    if (!timing) return;

    // Find animation path by hex ID
    let animPath: string | null = null;
    for (const path of Object.values(this.animations)) {
      const id = getAnimIdFromPath(path);
      if (id && id.toUpperCase() === animId.toUpperCase()) {
        animPath = path;
        break;
      }
    }
    if (!animPath) return;

    const clip = await loadClip(animPath, this.assetLoader);
    if (!clip) return;

    // Set up fire window
    this.fireWindow = timing;
    this.fireElapsed = 0;
    this.timeSinceLastShot = 0;
    this.isFiring = true;

    this.moveTarget = null;
    this.setEnemyState('action');
    this.playClip(clip, false);

    const onFinished = (e: { action: THREE.AnimationAction }) => {
      if (e.action === this.currentAction) {
        this.mixer!.removeEventListener('finished', onFinished);
        this.isFiring = false;
        this.fireWindow = null;
        if (this.muzzleFlash) this.muzzleFlash.visible = false;
        if (this.muzzleFlashLeft) this.muzzleFlashLeft.visible = false;
        if (this.enemyState !== 'dead') {
          this.setEnemyState('idle');
          this.playIdle();
        }
      }
    };
    this.mixer!.addEventListener('finished', onFinished);
  }

  stopFiring(): void {
    if (!this.isFiring) return;
    this.stopFireState();
    if (this.enemyState !== 'dead') {
      this.setEnemyState('idle');
      this.playIdle();
    }
  }

  private stopFireState(): void {
    this.isFiring = false;
    this.fireWindow = null;
    if (this.muzzleFlash) this.muzzleFlash.visible = false;
    if (this.muzzleFlashLeft) this.muzzleFlashLeft.visible = false;
  }

  /** Register callback for each shot fired (used by AI for damage rolls) */
  onShot(callback: () => void): void {
    this.shotCallbacks.push(callback);
  }

  /** Clear shot callbacks (called by AI between fire sequences) */
  clearShotCallbacks(): void {
    this.shotCallbacks = [];
  }

  private onShotFired(): void {
    // Muzzle flash
    if (this.muzzleFlash) {
      this.muzzleFlash.visible = true;
      this.muzzleTimer = 0.1;
    }
    if (this.isDualWield && this.muzzleFlashLeft) {
      this.muzzleFlashLeft.visible = true;
    }

    // Gun sound
    if (this.weaponConfig) {
      this.audioManager.play(this.weaponConfig.soundFile, 0.7);
    }

    // Notify listeners (AI uses this for damage raycasts)
    for (const cb of this.shotCallbacks) cb();
  }

  // ── Hit feedback (called externally when player shoots this enemy) ──

  onHit(hitPoint?: THREE.Vector3): void {
    if (this.enemyState === 'dead') return;

    // Damage painting at hit point
    if (hitPoint) this.paintDamage(hitPoint);

    // Play pain sound
    const painIdx = Math.floor(Math.random() * 26) + 1;
    this.audioManager.play(`/sounds/enemies/pain-${painIdx}.wav`, 0.8);

    // Play impact sound
    this.audioManager.play('/sounds/enemies/bullet-hit.wav', 0.5);

    // Hit reaction animation — always interrupt current animation (GoldenEye spaz out)
    this.playHitReaction();
  }

  private async playHitReaction(): Promise<void> {
    if (this.enemyState === 'dead') return;

    const animName = HIT_ANIMS[Math.floor(Math.random() * HIT_ANIMS.length)];
    const animPath = this.animations[animName];
    if (!animPath) return;

    const clip = await loadClip(animPath, this.assetLoader);
    if (!clip) return;

    // Remove previous hit reaction listener so it doesn't fire stale callbacks
    if (this.hitReactionFinishedListener && this.mixer) {
      this.mixer.removeEventListener('finished', this.hitReactionFinishedListener);
    }

    if (this.isFiring) this.stopFireState();
    this.moveTarget = null;
    this.setEnemyState('action');
    this.playClip(clip, false);

    const onFinished = (e: { action: THREE.AnimationAction }) => {
      if (e.action === this.currentAction) {
        this.mixer!.removeEventListener('finished', onFinished);
        this.hitReactionFinishedListener = null;
        if (this.enemyState !== 'dead') {
          this.setEnemyState('idle');
          this.playIdle();
        }
      }
    };
    this.hitReactionFinishedListener = onFinished;
    this.mixer!.addEventListener('finished', onFinished);
  }

  // ── Damage painting ──────────────────────────────────────────────

  private paintDamage(hitPoint: THREE.Vector3): void {
    if (!this.model) return;
    // Radius in GE units (model local space is GE scale due to 0.001 group scale)
    const radius = 300;
    const intensity = 0.5;

    this.model.traverse((child) => {
      if (
        !(child instanceof THREE.Mesh) ||
        !child.geometry.attributes.color
      )
        return;

      const geo = child.geometry;
      const pos = geo.attributes.position;
      const col = geo.attributes.color;

      const localHit = child.worldToLocal(hitPoint.clone());

      for (let i = 0; i < pos.count; i++) {
        const dx = pos.getX(i) - localHit.x;
        const dy = pos.getY(i) - localHit.y;
        const dz = pos.getZ(i) - localHit.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < radius) {
          const falloff = 1 - dist / radius;
          const blend = intensity * falloff;

          const r = Math.min(1, col.getX(i) + blend * 0.8);
          const g = Math.max(0, col.getY(i) - blend);
          const b = Math.max(0, col.getZ(i) - blend);
          col.setXYZ(i, r, g, b);
        }
      }

      col.needsUpdate = true;

      // Update N64 shader vertex color flag
      const mats = Array.isArray(child.material)
        ? child.material
        : [child.material];
      for (const mat of mats) {
        const sm = mat as THREE.ShaderMaterial;
        if (sm.uniforms?.u_hasVertexColors) {
          sm.uniforms.u_hasVertexColors.value = 1.0;
        }
      }
    });
  }

  // ── Death ────────────────────────────────────────────────────────

  protected onKilled(killer?: Entity): void {
    if (this.enemyState === 'dead') return;

    // Let Actor emit the event
    super.onKilled(killer);

    // Stop all current activity
    this.moveTarget = null;
    if (this.hitReactionFinishedListener && this.mixer) {
      this.mixer.removeEventListener('finished', this.hitReactionFinishedListener);
      this.hitReactionFinishedListener = null;
    }
    if (this.isFiring) this.stopFireState();

    this.setEnemyState('dead');

    // Play random death animation
    const deathName =
      DEATH_ANIMS[Math.floor(Math.random() * DEATH_ANIMS.length)];
    const animPath = this.animations[deathName];
    if (!animPath) {
      this.startFadeOut();
      return;
    }

    loadClip(animPath, this.assetLoader).then((clip) => {
      if (!clip || !this.mixer) {
        this.startFadeOut();
        return;
      }

      this.playClip(clip, false);

      const onFinished = (e: { action: THREE.AnimationAction }) => {
        if (e.action === this.currentAction) {
          this.mixer!.removeEventListener('finished', onFinished);
          this.startFadeOut();
        }
      };
      this.mixer.addEventListener('finished', onFinished);
    });
  }

  private startFadeOut(): void {
    this.isFading = true;
    this.fadeElapsed = 0;

    // Mark all materials transparent for opacity lerp
    const makeTransparent = (obj: THREE.Object3D | null) => {
      if (!obj) return;
      obj.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const mats = Array.isArray(child.material)
            ? child.material
            : [child.material];
          for (const mat of mats) {
            mat.transparent = true;
          }
        }
      });
    };
    makeTransparent(this.model);
    makeTransparent(this.weaponModel);
    makeTransparent(this.weaponModelLeft);
  }

  private updateFadeOut(dt: number): void {
    this.fadeElapsed += dt;
    const t = Math.min(this.fadeElapsed / this.FADE_DURATION, 1);
    const opacity = 1 - t;

    const setOpacity = (obj: THREE.Object3D | null) => {
      if (!obj) return;
      obj.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const mats = Array.isArray(child.material)
            ? child.material
            : [child.material];
          for (const mat of mats) {
            // Support both regular materials and N64 ShaderMaterial
            const sm = mat as THREE.ShaderMaterial;
            if (sm.uniforms?.u_opacity) {
              sm.uniforms.u_opacity.value = opacity;
            } else {
              mat.opacity = opacity;
            }
          }
        }
      });
    };
    setOpacity(this.model);
    setOpacity(this.weaponModel);
    setOpacity(this.weaponModelLeft);

    if (t >= 1) {
      this.isFading = false;
      // Remove from scene
      if (this.group && this.scene) {
        this.scene.remove(this.group);
      }
      // Notify manager for cleanup
      this.onCleanup?.();
    }
  }

  // ── Animation helpers ────────────────────────────────────────────

  private playClip(clip: THREE.AnimationClip, loop: boolean): void {
    if (!this.mixer) return;
    const prevAction = this.currentAction;
    const newAction = this.mixer.clipAction(clip);

    if (loop) {
      newAction.setLoop(THREE.LoopRepeat, Infinity);
    } else {
      newAction.setLoop(THREE.LoopOnce, 1);
      newAction.clampWhenFinished = true;
    }

    newAction.reset();
    newAction.play();

    if (prevAction) {
      newAction.crossFadeFrom(prevAction, 0.15, true);
    }

    this.currentAction = newAction;
  }

  private playLocomotion(): void {
    let animName: string;
    if (this.moveSpeed >= SPEED_THRESHOLDS.run) {
      animName = 'run';
    } else if (this.moveSpeed >= SPEED_THRESHOLDS.jog) {
      animName = 'jog';
    } else {
      animName = 'walk';
    }

    if (animName === this.currentLocomotion) return;
    this.currentLocomotion = animName;

    const animPath = this.animations[animName];
    loadClip(animPath, this.assetLoader).then((clip) => {
      if (clip && this.enemyState === 'moving') {
        this.playClip(clip, true);
      }
    });
  }

  private playIdle(): void {
    this.currentLocomotion = null;
    loadClip(this.animations.idle, this.assetLoader).then((clip) => {
      if (clip && this.enemyState === 'idle') {
        this.playClip(clip, true);
      }
    });
  }

  // ── State management ─────────────────────────────────────────────

  private setEnemyState(newState: EnemyState): void {
    if (this.enemyState === newState) return;
    if (this.enemyState === 'moving' && newState !== 'moving') {
      this.currentLocomotion = null;
    }
    this.enemyState = newState;
  }

  // ── Accessors ────────────────────────────────────────────────────

  /** Get world position of the enemy (from physics body) */
  getWorldPosition(): THREE.Vector3 {
    if (this.rigidBody) {
      const t = this.rigidBody.translation();
      return new THREE.Vector3(t.x, t.y, t.z);
    }
    return this.position.clone();
  }

  /** Get the muzzle world position (for AI raycast origin) */
  getMuzzleWorldPosition(): THREE.Vector3 {
    if (this.muzzleFlash) {
      const worldPos = new THREE.Vector3();
      this.muzzleFlash.getWorldPosition(worldPos);
      return worldPos;
    }
    // Fallback: estimate from body position + forward offset
    const pos = this.getWorldPosition();
    pos.y += 1.0; // chest height
    return pos;
  }

  /** Get forward direction */
  getForwardDirection(): THREE.Vector3 {
    const yaw = this.group?.rotation.y ?? 0;
    return new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  }

  // ── Cleanup ──────────────────────────────────────────────────────

  dispose(): void {
    if (this.mixer) this.mixer.stopAllAction();

    // Remove from scene
    if (this.group && this.scene) {
      this.scene.remove(this.group);
    }

    // Dispose geometry and materials
    if (this.model) {
      this.model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          const mats = Array.isArray(child.material)
            ? child.material
            : [child.material];
          for (const mat of mats) mat.dispose();
        }
      });
    }

    // Remove physics
    if (this.collider) {
      this.entityManager.unregisterCollider(this.collider.handle);
      this.physicsWorld.world.removeCollider(this.collider, true);
      this.collider = null;
    }
    if (this.rigidBody) {
      this.physicsWorld.world.removeRigidBody(this.rigidBody);
      this.rigidBody = null;
    }
    if (this.enemyController) {
      this.enemyController.free();
      this.enemyController = null;
    }

    this.entityManager.remove(this);

    this.group = null;
    this.model = null;
    this.mixer = null;
    this.skeleton = null;

    super.dispose();
  }
}
