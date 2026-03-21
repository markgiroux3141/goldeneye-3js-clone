import * as THREE from 'three';
import { Engine } from '../core/Engine';
import { AssetLoader } from '../core/AssetLoader';
import { WeaponViewmodel } from './WeaponViewmodel';
import type { WeaponStats } from './WeaponConfig';

export interface WeaponEditState {
  modelOffset: THREE.Vector3;
  pivotOffset: THREE.Vector3;
  muzzleOffset: THREE.Vector3;
  modelScale: number;
  modelRotation: THREE.Vector3;
  zoomFOV: number;
}

const DEFAULT_FOV = 75;
const AIM_MAX_RANGE = 0.6; // matching GamepadManager — max NDC offset before character turns
const AIM_DIRECTIONS: [number, number][] = [
  [0, 0],                    // center
  [AIM_MAX_RANGE, 0],        // right
  [0, AIM_MAX_RANGE],        // up
  [-AIM_MAX_RANGE, 0],       // left
  [0, -AIM_MAX_RANGE],       // down
];
const AIM_DIRECTION_LABELS = ['CENTER', 'RIGHT', 'UP', 'LEFT', 'DOWN'];

export class WeaponEditorSystem {
  private weaponScene: THREE.Scene;
  private weaponCamera: THREE.PerspectiveCamera;
  private viewmodel!: WeaponViewmodel;
  private assetLoader: AssetLoader;

  private configs: WeaponStats[];
  private editStates: WeaponEditState[];
  private currentIndex = 0;
  private zoomPreview = false;

  // Aim preview
  private aimPreview = false;
  private aimPreviewDirection = 0;

  // Callback for UI refresh
  onChange: (() => void) | null = null;

  constructor(
    private engine: Engine,
    assetLoader: AssetLoader,
    configs: WeaponStats[]
  ) {
    this.assetLoader = assetLoader;
    this.configs = configs;

    // Create weapon scene + camera (same pattern as WeaponSystem)
    this.weaponScene = new THREE.Scene();
    this.weaponCamera = new THREE.PerspectiveCamera(
      DEFAULT_FOV,
      window.innerWidth / window.innerHeight,
      0.01,
      10
    );
    this.weaponScene.add(this.weaponCamera);

    // Lighting for weapon scene
    this.weaponScene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(1, 2, 1);
    this.weaponScene.add(dirLight);

    // Initialize edit states from config defaults
    this.editStates = configs.map((cfg) => ({
      modelOffset: cfg.modelOffset.clone(),
      pivotOffset: cfg.pivotOffset.clone(),
      muzzleOffset: cfg.muzzleOffset.clone(),
      modelScale: cfg.modelScale,
      modelRotation: cfg.modelRotation.clone(),
      zoomFOV: cfg.zoomFOV,
    }));

    window.addEventListener('resize', this.onResize);
  }

  async init(): Promise<void> {
    await this.loadCurrentWeapon();
  }

  get currentConfig(): WeaponStats {
    return this.configs[this.currentIndex];
  }

  get currentState(): WeaponEditState {
    return this.editStates[this.currentIndex];
  }

  get weaponCount(): number {
    return this.configs.length;
  }

  get currentWeaponIndex(): number {
    return this.currentIndex;
  }

  get isZoomPreview(): boolean {
    return this.zoomPreview;
  }

  get isAimPreview(): boolean {
    return this.aimPreview;
  }

  get aimPreviewLabel(): string {
    return this.aimPreview ? AIM_DIRECTION_LABELS[this.aimPreviewDirection] : '';
  }

  // ── Weapon cycling ───────────────────────────────────────────

  async cycleWeapon(direction: 1 | -1): Promise<void> {
    this.viewmodel.dispose();
    this.currentIndex =
      (this.currentIndex + direction + this.configs.length) % this.configs.length;
    await this.loadCurrentWeapon();
    this.onChange?.();
  }

  // ── Value setters ────────────────────────────────────────────

  setModelOffset(x: number, y: number, z: number): void {
    this.currentState.modelOffset.set(x, y, z);
    this.viewmodel.setModelOffset(this.currentState.modelOffset);
  }

  setPivotOffset(x: number, y: number, z: number): void {
    this.currentState.pivotOffset.set(x, y, z);
    this.viewmodel.setPivotOffset(this.currentState.pivotOffset);
  }

  setMuzzleOffset(x: number, y: number, z: number): void {
    this.currentState.muzzleOffset.set(x, y, z);
    this.viewmodel.setMuzzleOffset(this.currentState.muzzleOffset);
  }

  setModelScale(s: number): void {
    this.currentState.modelScale = s;
    this.viewmodel.setModelScale(s);
  }

  setModelRotation(x: number, y: number, z: number): void {
    this.currentState.modelRotation.set(x, y, z);
    this.viewmodel.setModelRotation(x, y, z);
  }

  setZoomFOV(fov: number): void {
    this.currentState.zoomFOV = Math.max(10, Math.min(75, fov));
    if (this.zoomPreview) {
      this.weaponCamera.fov = this.currentState.zoomFOV;
      this.weaponCamera.updateProjectionMatrix();
      this.engine.camera.fov = this.currentState.zoomFOV;
      this.engine.camera.updateProjectionMatrix();
    }
  }

  // ── Actions ──────────────────────────────────────────────────

  toggleAimPreview(): void {
    this.aimPreview = !this.aimPreview;
    if (!this.aimPreview) {
      this.aimPreviewDirection = 0;
      this.viewmodel.setAimOffset(0, 0);
    }
    this.onChange?.();
  }

  cycleAimDirection(dir: 1 | -1): void {
    if (!this.aimPreview) return;
    this.aimPreviewDirection =
      (this.aimPreviewDirection + dir + AIM_DIRECTIONS.length) % AIM_DIRECTIONS.length;
    this.onChange?.();
  }

  toggleZoomPreview(): void {
    this.zoomPreview = !this.zoomPreview;
    const fov = this.zoomPreview ? this.currentState.zoomFOV : DEFAULT_FOV;
    this.weaponCamera.fov = fov;
    this.weaponCamera.updateProjectionMatrix();
    this.engine.camera.fov = fov;
    this.engine.camera.updateProjectionMatrix();
  }

  fireTest(): void {
    this.viewmodel.playMuzzleFlash();
    this.viewmodel.playRecoil();
  }

  resetCurrent(): void {
    const cfg = this.configs[this.currentIndex];
    const state = this.currentState;
    state.modelOffset.copy(cfg.modelOffset);
    state.pivotOffset.copy(cfg.pivotOffset);
    state.muzzleOffset.copy(cfg.muzzleOffset);
    state.modelScale = cfg.modelScale;
    state.modelRotation.copy(cfg.modelRotation);
    state.zoomFOV = cfg.zoomFOV;
    this.applyState();
    this.onChange?.();
  }

  // ── Export ────────────────────────────────────────────────────

  getExportString(index?: number): string {
    const i = index ?? this.currentIndex;
    const s = this.editStates[i];
    const cfg = this.configs[i];
    const v3 = (v: THREE.Vector3) =>
      `new THREE.Vector3(${v.x.toFixed(4)}, ${v.y.toFixed(4)}, ${v.z.toFixed(4)})`;
    return (
      `// ${cfg.name}\n` +
      `modelScale: ${s.modelScale.toFixed(6)},\n` +
      `modelOffset: ${v3(s.modelOffset)},\n` +
      `pivotOffset: ${v3(s.pivotOffset)},\n` +
      `muzzleOffset: ${v3(s.muzzleOffset)},\n` +
      `modelRotation: ${v3(s.modelRotation)},\n` +
      `zoomFOV: ${s.zoomFOV},`
    );
  }

  getExportAllString(): string {
    return this.configs
      .map((_, i) => this.getExportString(i))
      .join('\n\n');
  }

  getExportJSON(): string {
    const data: Record<string, unknown> = {};
    for (let i = 0; i < this.configs.length; i++) {
      const s = this.editStates[i];
      const v3 = (v: THREE.Vector3) => [v.x, v.y, v.z];
      data[this.configs[i].name] = {
        modelScale: s.modelScale,
        modelOffset: v3(s.modelOffset),
        pivotOffset: v3(s.pivotOffset),
        muzzleOffset: v3(s.muzzleOffset),
        modelRotation: v3(s.modelRotation),
        zoomFOV: s.zoomFOV,
      };
    }
    return JSON.stringify(data, null, 2);
  }

  importJSON(json: string): void {
    const data = JSON.parse(json) as Record<string, Record<string, unknown>>;
    for (let i = 0; i < this.configs.length; i++) {
      const entry = data[this.configs[i].name];
      if (!entry) continue;
      const s = this.editStates[i];
      if (Array.isArray(entry.modelOffset)) s.modelOffset.set(...(entry.modelOffset as [number, number, number]));
      if (Array.isArray(entry.pivotOffset)) s.pivotOffset.set(...(entry.pivotOffset as [number, number, number]));
      if (Array.isArray(entry.muzzleOffset)) s.muzzleOffset.set(...(entry.muzzleOffset as [number, number, number]));
      if (Array.isArray(entry.modelRotation)) s.modelRotation.set(...(entry.modelRotation as [number, number, number]));
      if (typeof entry.modelScale === 'number') s.modelScale = entry.modelScale;
      if (typeof entry.zoomFOV === 'number') s.zoomFOV = entry.zoomFOV;
    }
    this.applyState();
    this.onChange?.();
  }

  // ── Update / Render ──────────────────────────────────────────

  update(dt: number): void {
    // Aim preview — apply current direction offset
    if (this.aimPreview) {
      const [x, y] = AIM_DIRECTIONS[this.aimPreviewDirection];
      const aspect = window.innerHeight / window.innerWidth;
      this.viewmodel.setAimOffset(x * aspect, y);
    }

    this.viewmodel.update(dt, false, true, 0);

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

  dispose(): void {
    window.removeEventListener('resize', this.onResize);
    this.viewmodel.dispose();
  }

  // ── Private ──────────────────────────────────────────────────

  private async loadCurrentWeapon(): Promise<void> {
    this.viewmodel = new WeaponViewmodel(this.weaponCamera, this.configs[this.currentIndex]);
    await this.viewmodel.load(this.assetLoader);
    this.viewmodel.setFrozen(true);
    this.applyState();

    // Reset zoom preview when switching weapons
    if (this.zoomPreview) {
      this.zoomPreview = false;
      this.weaponCamera.fov = DEFAULT_FOV;
      this.weaponCamera.updateProjectionMatrix();
      this.engine.camera.fov = DEFAULT_FOV;
      this.engine.camera.updateProjectionMatrix();
    }
  }

  private applyState(): void {
    const s = this.currentState;
    this.viewmodel.setModelOffset(s.modelOffset);
    this.viewmodel.setPivotOffset(s.pivotOffset);
    this.viewmodel.setMuzzleOffset(s.muzzleOffset);
    this.viewmodel.setModelScale(s.modelScale);
    this.viewmodel.setModelRotation(s.modelRotation.x, s.modelRotation.y, s.modelRotation.z);
  }

  private onResize = (): void => {
    this.weaponCamera.aspect = window.innerWidth / window.innerHeight;
    this.weaponCamera.updateProjectionMatrix();
  };
}
