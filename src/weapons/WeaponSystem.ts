import * as THREE from 'three';
import type RAPIER_API from '@dimforge/rapier3d-compat';
import { Engine } from '../core/Engine';
import { InputManager } from '../core/InputManager';
import { AssetLoader } from '../core/AssetLoader';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { FPSCamera } from '../player/FPSCamera';
import { PlayerController } from '../player/PlayerController';
import { WeaponViewmodel } from './WeaponViewmodel';
import { ShootingSystem } from './ShootingSystem';
import { AudioManager } from '../audio/AudioManager';
import { BulletDecalManager } from './BulletDecalManager';
import { HUD } from '../ui/HUD';
import type { WeaponStats } from './WeaponConfig';
import type { GamepadManager } from '../core/GamepadManager';
import { EnemyCharacter } from '../entities/EnemyCharacter';
import type { World } from '../core/World';
import { Actor } from '../entities/Actor';

export interface WeaponSlot {
  config: WeaponStats;
  magazineAmmo: number;
  reserveAmmo: number;
}

export class WeaponSystem {
  private weaponScene: THREE.Scene;
  private weaponCamera: THREE.PerspectiveCamera;
  private viewmodel!: WeaponViewmodel;
  private shooting!: ShootingSystem;
  private decalManager!: BulletDecalManager;
  private audio: AudioManager;
  private hud: HUD;
  private assetLoader!: AssetLoader;

  private crosshairEl: HTMLElement;
  private gamepadManager: GamepadManager | null = null;
  private world: World | null = null;

  // Inventory
  private slots: WeaponSlot[];
  private currentSlotIndex = 0;
  private prevCyclePressed = false;
  private switching = false;

  // State
  private reloading = false;
  private reloadTimer = 0;
  private gameTime = 0;
  private lastFireTime = -Infinity;

  // Zoom/ADS
  private static readonly DEFAULT_FOV = 75;
  private static readonly ZOOM_LERP_SPEED = 10;
  private currentFOV = 75;

  constructor(
    private engine: Engine,
    private physicsWorld: PhysicsWorld,
    private inputManager: InputManager,
    private fpsCamera: FPSCamera,
    private playerController: PlayerController,
    private RAPIER: typeof RAPIER_API,
    slots: WeaponSlot[]
  ) {
    this.slots = slots;
    this.weaponScene = new THREE.Scene();
    this.weaponCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 10);
    this.weaponScene.add(this.weaponCamera);

    // Lighting for weapon scene (kept low so N64 vertex colors dominate)
    this.weaponScene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.45);
    dirLight.position.set(1, 2, 1);
    this.weaponScene.add(dirLight);

    this.audio = new AudioManager();
    this.hud = new HUD();
    this.crosshairEl = document.getElementById('crosshair')!;

    window.addEventListener('resize', this.onResize);
  }

  private get slot(): WeaponSlot {
    return this.slots[this.currentSlotIndex];
  }

  private get config(): WeaponStats {
    return this.slot.config;
  }

  async init(assetLoader: AssetLoader): Promise<void> {
    this.assetLoader = assetLoader;

    this.shooting = new ShootingSystem(
      this.physicsWorld,
      this.RAPIER,
      this.engine.camera,
      this.playerController.getCollider()
    );

    // Load sounds for ALL weapons upfront
    const allSounds = new Set<string>();
    for (const s of this.slots) {
      allSounds.add(s.config.sounds.fire);
      allSounds.add(s.config.sounds.reload);
      allSounds.add(s.config.sounds.empty);
    }
    await Promise.all([...allSounds].map((url) => this.audio.loadSound(url)));

    this.decalManager = new BulletDecalManager(this.engine.scene);
    await this.decalManager.init(assetLoader);

    // Load first weapon viewmodel
    await this.loadCurrentWeapon();
  }

  setGamepadManager(gpm: GamepadManager): void {
    this.gamepadManager = gpm;
  }

  setWorld(world: World): void {
    this.world = world;
    this.shooting.setEntityManager(world.entityManager);
  }

  update(dt: number, mouseDX: number): void {
    this.gameTime += dt;

    // Weapon cycle input (edge-triggered)
    const cyclePressed = this.inputManager.isKeyDown('KeyQ');
    if (cyclePressed && !this.prevCyclePressed && this.slots.length > 1 && !this.switching) {
      this.cycleWeapon();
    }
    this.prevCyclePressed = cyclePressed;

    // Handle reload
    if (this.reloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        this.finishReload();
      }
    }

    // Fire input
    if (this.inputManager.isMouseDown(0) && !this.reloading && !this.switching) {
      if (this.slot.magazineAmmo > 0 && this.gameTime - this.lastFireTime >= this.config.fireCooldown) {
        this.fire();
      } else if (this.slot.magazineAmmo === 0) {
        // Auto-reload on empty
        if (!this.reloading && this.slot.reserveAmmo > 0) {
          this.audio.play(this.config.sounds.empty, 0.5);
          this.startReload();
        }
      }
    }

    // Manual reload
    if (this.inputManager.isKeyDown('KeyR') && !this.reloading &&
        this.slot.magazineAmmo < this.config.magazineSize && this.slot.reserveAmmo > 0) {
      this.startReload();
    }

    // Determine if player is moving for weapon bob
    const isMoving =
      this.inputManager.isKeyDown('KeyW') ||
      this.inputManager.isKeyDown('KeyS') ||
      this.inputManager.isKeyDown('KeyA') ||
      this.inputManager.isKeyDown('KeyD');

    // Aim mode: compute aspect-corrected NDC for crosshair, gun, and bullet
    if (this.gamepadManager?.aimMode) {
      const aspect = window.innerHeight / window.innerWidth;
      const screenX = this.gamepadManager.aimX * aspect; // aspect-corrected NDC
      const screenY = this.gamepadManager.aimY;

      this.viewmodel.setAimOffset(screenX, screenY);
      this.crosshairEl.style.display = 'block';
      this.crosshairEl.style.left = `${(0.5 + screenX * 0.5) * 100}%`;
      this.crosshairEl.style.top = `${(0.5 + screenY * 0.5) * 100}%`;
    } else {
      this.viewmodel.setAimOffset(0, 0);
      this.crosshairEl.style.display = 'none';
    }

    // Zoom/ADS — lerp FOV when aiming with a weapon that has zoom
    const targetFOV = this.gamepadManager?.aimMode && this.config.zoomFOV < WeaponSystem.DEFAULT_FOV
      ? this.config.zoomFOV
      : WeaponSystem.DEFAULT_FOV;
    if (this.currentFOV !== targetFOV) {
      this.currentFOV += (targetFOV - this.currentFOV) * Math.min(dt * WeaponSystem.ZOOM_LERP_SPEED, 1);
      // Snap when close enough
      if (Math.abs(this.currentFOV - targetFOV) < 0.1) this.currentFOV = targetFOV;
      this.weaponCamera.fov = this.currentFOV;
      this.weaponCamera.updateProjectionMatrix();
      this.engine.camera.fov = this.currentFOV;
      this.engine.camera.updateProjectionMatrix();
    }

    this.viewmodel.update(dt, isMoving, this.playerController.getGrounded(), mouseDX);
    this.hud.update(dt);

    // Sync weapon camera to main camera
    this.weaponCamera.position.copy(this.engine.camera.position);
    this.weaponCamera.quaternion.copy(this.engine.camera.quaternion);
  }

  render(): void {
    this.engine.renderOverlay(this.weaponScene, this.weaponCamera);
  }

  getWeaponScene(): THREE.Scene {
    return this.weaponScene;
  }

  getWeaponCamera(): THREE.PerspectiveCamera {
    return this.weaponCamera;
  }

  private fire(): void {
    this.lastFireTime = this.gameTime;
    this.slot.magazineAmmo--;

    this.audio.play(this.config.sounds.fire, 0.6);
    this.viewmodel.playMuzzleFlash();
    this.viewmodel.playRecoil();

    const hit = this.gamepadManager?.aimMode
      ? (() => {
          const aspect = window.innerHeight / window.innerWidth;
          return this.shooting.fireAtScreen(
            this.gamepadManager!.aimX * aspect,
            -this.gamepadManager!.aimY,
            this.config.range
          );
        })()
      : this.shooting.fire(this.config.range);
    if (hit) {
      // Check if we hit an entity (enemy, etc.)
      const hitEntity = this.shooting.getHitEntity(hit);
      if (hitEntity instanceof Actor && this.world) {
        this.world.damageSystem.applyDamage(hitEntity, this.config.damage, this.world.player);
        // Trigger visual hit feedback on enemy characters
        if (hitEntity instanceof EnemyCharacter) {
          hitEntity.onHit(hit.point);
          this.hud.showHitMarker();
        }
      } else {
        // Only add bullet decals to static geometry, not actors
        this.decalManager.addDecal(hit.point, hit.normal);
      }
    }

    this.hud.updateAmmo(this.slot.magazineAmmo, this.slot.reserveAmmo);
  }

  private startReload(): void {
    this.reloading = true;
    this.reloadTimer = this.config.reloadTime;
    this.audio.play(this.config.sounds.reload, 0.7);
    this.viewmodel.playReloadAnimation();
    this.hud.showReloading();
  }

  private finishReload(): void {
    const needed = this.config.magazineSize - this.slot.magazineAmmo;
    const toLoad = Math.min(needed, this.slot.reserveAmmo);
    this.slot.magazineAmmo += toLoad;
    this.slot.reserveAmmo -= toLoad;
    this.reloading = false;
    this.hud.hideReloading();
    this.hud.updateAmmo(this.slot.magazineAmmo, this.slot.reserveAmmo);
  }

  private cycleWeapon(): void {
    this.switching = true;
    this.reloading = false;
    this.hud.hideReloading();

    // Lower current weapon, then swap
    this.viewmodel.playLowerAnimation(async () => {
      this.viewmodel.dispose();
      this.currentSlotIndex = (this.currentSlotIndex + 1) % this.slots.length;
      await this.loadCurrentWeapon();
      this.viewmodel.playRaiseAnimation();
      this.switching = false;
    });
  }

  private async loadCurrentWeapon(): Promise<void> {
    this.viewmodel = new WeaponViewmodel(this.weaponCamera, this.config);
    await this.viewmodel.load(this.assetLoader);
    this.lastFireTime = -Infinity;
    this.audio.play(this.config.sounds.reload, 0.7);
    this.hud.updateAmmo(this.slot.magazineAmmo, this.slot.reserveAmmo);
  }

  private onResize = (): void => {
    this.weaponCamera.aspect = window.innerWidth / window.innerHeight;
    this.weaponCamera.updateProjectionMatrix();
  };

  dispose(): void {
    window.removeEventListener('resize', this.onResize);
    this.viewmodel.dispose();
    this.decalManager.dispose();
    this.audio.dispose();
    this.hud.dispose();
  }
}
