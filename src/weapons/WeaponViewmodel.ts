import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { AssetLoader } from '../core/AssetLoader';
import type { WeaponStats } from './WeaponConfig';

const DEBUG_STEP = 0.01;

export class WeaponViewmodel {
  private model: THREE.Group | null = null;
  private gunGltf: THREE.Group | null = null;
  private flashGltf: THREE.Group | null = null;
  private baseOffset = new THREE.Vector3();
  private bobTimer = 0;
  private swayX = 0;

  // Muzzle flash (from GLB model)
  private muzzleFlashMeshes: THREE.Object3D[] = [];
  private muzzleLight: THREE.PointLight | null = null;
  private flashTimer = 0;

  // Recoil
  private recoilZ = 0;
  private recoilRot = 0;

  // Aim offset (gun tilts toward crosshair)
  private _aimX = 0;
  private _aimY = 0;

  // Reload animation
  private reloadProgress = -1; // -1 = not reloading
  private reloadDuration = 1.5;
  private onLowered: (() => void) | null = null;

  // Debug positioning mode
  private debugMode = false;
  private debugOffset = new THREE.Vector3();
  private debugPivot = new THREE.Vector3();

  constructor(
    private weaponCamera: THREE.PerspectiveCamera,
    private config: WeaponStats
  ) {
    this.baseOffset.copy(config.modelOffset);
    this.reloadDuration = config.reloadTime;
  }

  async load(assetLoader: AssetLoader): Promise<void> {
    this.model = new THREE.Group();
    this.model.position.copy(this.baseOffset);

    // Load gun model
    this.gunGltf = await assetLoader.loadGLTF(this.config.modelPath);
    this.gunGltf.scale.setScalar(this.config.modelScale);
    this.gunGltf.rotation.y = Math.PI; // Flip 180° so barrel faces forward
    this.gunGltf.position.copy(this.config.pivotOffset);
    this.model.add(this.gunGltf);

    // Smooth shading on all gun meshes + strip PBR for N64-authentic look
    this.gunGltf.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry = mergeVertices(child.geometry, 1e-3);
        child.geometry.computeVertexNormals();
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        for (const mat of mats) {
          if (mat instanceof THREE.MeshStandardMaterial) {
            mat.roughness = 1.0;
            mat.metalness = 0.0;
            mat.normalMap = null;
            mat.roughnessMap = null;
            mat.metalnessMap = null;
            mat.aoMap = null;
            mat.needsUpdate = true;
          }
        }
      }
    });

    // Load muzzle flash from separate GLB
    this.flashGltf = await assetLoader.loadGLTF(this.config.muzzleFlashPath);
    this.flashGltf.scale.setScalar(this.config.modelScale);
    this.flashGltf.rotation.y = Math.PI;
    this.flashGltf.position.copy(this.config.pivotOffset);
    this.model.add(this.flashGltf);

    // Collect top-level children as flash variants (start hidden)
    for (const child of [...this.flashGltf.children]) {
      child.visible = false;
      this.muzzleFlashMeshes.push(child);
    }

    // Set up additive blending on all flash meshes
    this.flashGltf.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        for (const mat of mats) {
          mat.transparent = true;
          mat.blending = THREE.AdditiveBlending;
          mat.depthWrite = false;
          mat.side = THREE.DoubleSide;
        }
      }
    });

    // Point light for muzzle flash dynamic lighting
    this.muzzleLight = new THREE.PointLight(0xffaa00, 3, 2);
    this.muzzleLight.position.copy(this.config.muzzleOffset);
    this.muzzleLight.visible = false;
    this.model.add(this.muzzleLight);

    this.weaponCamera.add(this.model);

    // Debug positioning mode
    this.debugOffset.copy(this.config.modelOffset);
    this.debugPivot.copy(this.config.pivotOffset);
    document.addEventListener('keydown', this.onDebugKey);
  }

  update(dt: number, isMoving: boolean, isGrounded: boolean, mouseDX: number): void {
    if (!this.model) return;

    // In debug mode, freeze all animation and use debug values
    if (this.debugMode) {
      this.model.position.copy(this.debugOffset);
      if (this.gunGltf) this.gunGltf.position.copy(this.debugPivot);
      if (this.flashGltf) this.flashGltf.position.copy(this.debugPivot);
      this.model.rotation.x = 0;
      this.model.rotation.y = 0;
      return;
    }

    // Weapon bob
    if (isMoving && isGrounded) {
      this.bobTimer += dt * 10;
    } else {
      // Smoothly return to center
      this.bobTimer += dt * 2;
    }

    const bobAmplitude = isMoving && isGrounded ? 1.0 : 0.0;
    const bobX = Math.sin(this.bobTimer) * 0.012 * bobAmplitude;
    const bobY = Math.sin(this.bobTimer * 2) * 0.008 * bobAmplitude;

    // Weapon sway from mouse
    const targetSway = -mouseDX * 0.0015;
    this.swayX += (targetSway - this.swayX) * Math.min(dt * 15, 1);

    // Reload animation (2x speed)
    let reloadOffsetY = 0;
    if (this.reloadProgress >= 0) {
      this.reloadProgress += dt / (this.reloadDuration * 0.5);
      if (this.onLowered && this.reloadProgress >= 0.5) {
        // Weapon switch: freeze at bottom, fire callback
        reloadOffsetY = -0.3;
        const cb = this.onLowered;
        this.onLowered = null;
        cb();
      } else if (this.reloadProgress >= 1) {
        this.reloadProgress = -1;
      } else {
        // Down then up
        reloadOffsetY = -Math.sin(this.reloadProgress * Math.PI) * 0.3;
      }
    }

    // Recoil decay — snaps back quickly
    this.recoilZ *= Math.max(0, 1 - dt * 15);
    this.recoilRot *= Math.max(0, 1 - dt * 15);

    this.model.position.set(
      this.baseOffset.x + bobX + this.swayX,
      this.baseOffset.y + bobY + reloadOffsetY,
      this.baseOffset.z + this.recoilZ
    );

    if (this._aimX !== 0 || this._aimY !== 0) {
      // Compute aim direction from camera center using FOV
      // (ignore gun offset — the ray fires from camera center, gun just visually tracks)
      const halfTan = Math.tan(this.weaponCamera.fov * 0.5 * Math.PI / 180);
      const aspect = this.weaponCamera.aspect;
      const yaw = Math.atan(this._aimX * halfTan * aspect);
      const pitch = Math.atan(-this._aimY * halfTan);
      this.model.rotation.y = -yaw;
      this.model.rotation.x = pitch + this.recoilRot;
    } else {
      this.model.rotation.x = this.recoilRot;
      this.model.rotation.y = 0;
    }

    // Muzzle flash timer
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) {
        for (const flash of this.muzzleFlashMeshes) flash.visible = false;
        if (this.muzzleLight) this.muzzleLight.visible = false;
      }
    }
  }

  setAimOffset(x: number, y: number): void {
    this._aimX = x;
    this._aimY = y;
  }

  playRecoil(): void {
    this.recoilZ = 0.04;   // kick back
    this.recoilRot = -0.06; // pitch up slightly
  }

  playMuzzleFlash(): void {
    for (const flash of this.muzzleFlashMeshes) flash.visible = true;
    if (this.muzzleLight) this.muzzleLight.visible = true;
    this.flashTimer = 0.12;
  }

  playReloadAnimation(): void {
    this.reloadProgress = 0;
  }

  playLowerAnimation(onComplete: () => void): void {
    this.reloadProgress = 0;
    this.onLowered = onComplete;
  }

  playRaiseAnimation(): void {
    this.reloadProgress = 0.5;
  }

  dispose(): void {
    document.removeEventListener('keydown', this.onDebugKey);
    if (this.model) {
      this.weaponCamera.remove(this.model);
      this.model.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
    }
  }

  private onDebugKey = (e: KeyboardEvent): void => {
    if (e.code === 'Backquote') {
      this.debugMode = !this.debugMode;
      console.log(`[WeaponDebug] ${this.debugMode ? 'ON' : 'OFF'}`);
      if (this.debugMode) this.logDebugValues();
      return;
    }

    if (!this.debugMode) return;

    const sign = e.shiftKey ? -1 : 1;
    const step = DEBUG_STEP * sign;

    switch (e.code) {
      case 'KeyI': this.debugOffset.x += step; break;
      case 'KeyO': this.debugOffset.y += step; break;
      case 'KeyP': this.debugOffset.z += step; break;
      case 'KeyJ': this.debugPivot.x += step; break;
      case 'KeyK': this.debugPivot.y += step; break;
      case 'KeyL': this.debugPivot.z += step; break;
      default: return;
    }

    this.logDebugValues();
  };

  private logDebugValues(): void {
    const o = this.debugOffset;
    const p = this.debugPivot;
    console.log(
      `[WeaponDebug] modelOffset: (${o.x.toFixed(3)}, ${o.y.toFixed(3)}, ${o.z.toFixed(3)})  ` +
      `pivotOffset: (${p.x.toFixed(3)}, ${p.y.toFixed(3)}, ${p.z.toFixed(3)})`
    );
  }
}
