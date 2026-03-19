import * as THREE from 'three';
import type { World } from '../core/World';
import type { AssetLoader } from '../core/AssetLoader';
import type { DoorConfig, DoorType } from '../entities/DoorEntity';
import type { DoorEntity } from '../entities/DoorEntity';

interface DoorPreset {
  name: string;
  type: DoorType;
  modelUrl: string;
}

const DOOR_PRESETS: DoorPreset[] = [
  { name: 'Grey Swinging', type: 'swinging', modelUrl: '/models/doors/grey-swinging-door.glb' },
  { name: 'Bathroom', type: 'swinging', modelUrl: '/models/doors/bathroom-door.glb' },
  { name: 'Brown Sliding', type: 'sliding', modelUrl: '/models/doors/brown-sliding-door.glb' },
];

const ROTATION_STEP = Math.PI / 12;  // 15 degrees

export class DoorPlacer {
  private active = false;
  private presetIndex = 0;
  private currentRotation = 0;
  private previewGroup: THREE.Group | null = null;
  private triggerHelper: THREE.Mesh | null = null;
  private previewReady = false;
  private previewYOffset = 0;
  private currentHingeSide: 'left' | 'right' = 'left';
  private currentSwingDirection: 1 | -1 = 1;
  private currentSlideDirection: 1 | -1 = -1;

  private placements: { config: DoorConfig; entity: DoorEntity }[] = [];
  private raycaster = new THREE.Raycaster();
  private screenCenter = new THREE.Vector2(0, 0);
  private hitPoint = new THREE.Vector3();
  private hasHit = false;

  // Cached model clones for preview
  private previewCache = new Map<string, THREE.Group>();

  // HUD
  private hudEl: HTMLElement | null = null;

  // Bound handler
  private onKeyDown: (e: KeyboardEvent) => void;

  constructor(
    private scene: THREE.Scene,
    private camera: THREE.PerspectiveCamera,
    private world: World,
    private assetLoader: AssetLoader,
    private modelScale = 1
  ) {
    this.onKeyDown = this.handleKeyDown.bind(this);
  }

  get isActive(): boolean {
    return this.active;
  }

  toggle(): void {
    if (this.active) {
      this.deactivate();
    } else {
      this.activate();
    }
  }

  private async activate(): Promise<void> {
    this.active = true;
    this.hasHit = false;
    window.addEventListener('keydown', this.onKeyDown);
    this.createHUD();
    await this.showPreview();
    console.log('[DoorPlacer] Activated. [ ] = rotate, T = cycle type, E = place, Backspace = undo, F9 = done');
  }

  private deactivate(): void {
    this.active = false;
    window.removeEventListener('keydown', this.onKeyDown);
    this.hidePreview();
    this.removeHUD();
    this.exportAll();
    console.log('[DoorPlacer] Deactivated.');
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.active) return;

    switch (e.code) {
      case 'BracketRight':
        this.currentRotation += ROTATION_STEP;
        break;
      case 'BracketLeft':
        this.currentRotation -= ROTATION_STEP;
        break;
      case 'KeyT':
        this.cyclePreset();
        break;
      case 'KeyE':
        e.preventDefault();
        this.place();
        break;
      case 'Backspace':
        this.undo();
        break;
      case 'KeyH': {
        const preset = DOOR_PRESETS[this.presetIndex];
        if (preset.type === 'swinging') {
          this.currentHingeSide = this.currentHingeSide === 'left' ? 'right' : 'left';
          this.updateHUD();
          console.log(`[DoorPlacer] Hinge: ${this.currentHingeSide}`);
        }
        break;
      }
      case 'KeyG': {
        const preset = DOOR_PRESETS[this.presetIndex];
        if (preset.type === 'swinging') {
          this.currentSwingDirection = this.currentSwingDirection === 1 ? -1 : 1;
          this.updateHUD();
          console.log(`[DoorPlacer] Swing: ${this.currentSwingDirection === 1 ? 'CCW' : 'CW'}`);
        } else {
          this.currentSlideDirection = this.currentSlideDirection === -1 ? 1 : -1;
          this.updateHUD();
          console.log(`[DoorPlacer] Slide: ${this.currentSlideDirection === -1 ? 'left' : 'right'}`);
        }
        break;
      }
    }
  }

  private async cyclePreset(): Promise<void> {
    this.presetIndex = (this.presetIndex + 1) % DOOR_PRESETS.length;
    // Reset direction/hinge to defaults for new preset
    this.currentHingeSide = 'left';
    this.currentSwingDirection = 1;
    this.currentSlideDirection = -1;
    this.hidePreview();
    await this.showPreview();
    this.updateHUD();
    console.log(`[DoorPlacer] Switched to: ${DOOR_PRESETS[this.presetIndex].name}`);
  }

  private async showPreview(): Promise<void> {
    this.previewReady = false;
    const preset = DOOR_PRESETS[this.presetIndex];

    // Load model if not cached
    if (!this.previewCache.has(preset.modelUrl)) {
      const group = await this.assetLoader.loadGLTF(preset.modelUrl);
      this.previewCache.set(preset.modelUrl, group);
    }

    const cloned = this.previewCache.get(preset.modelUrl)!.clone();

    // Make semi-transparent ghost material
    cloned.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material as THREE.Material;
        const ghostMat = mat.clone();
        ghostMat.transparent = true;
        ghostMat.opacity = 0.4;
        ghostMat.depthWrite = false;
        child.material = ghostMat;
        // Mark so N64 system doesn't swap these
        child.userData._doorPlacerPreview = true;
      }
    });

    this.previewGroup = cloned;
    if (this.modelScale !== 1) {
      this.previewGroup.scale.setScalar(this.modelScale);
    }
    // Compute Y offset so the bottom of the door sits at the placement point
    this.previewGroup.position.set(0, 0, 0);
    this.previewGroup.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(this.previewGroup);
    this.previewYOffset = box.min.y < 0 ? -box.min.y : 0;

    // Start hidden until raycast finds a hit point
    this.previewGroup.visible = this.hasHit;
    this.scene.add(this.previewGroup);

    // Trigger radius wireframe sphere
    const triggerGeo = new THREE.SphereGeometry(3.0, 16, 8);
    const triggerMat = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      wireframe: true,
      transparent: true,
      opacity: 0.15,
    });
    this.triggerHelper = new THREE.Mesh(triggerGeo, triggerMat);
    this.triggerHelper.visible = this.hasHit;
    this.triggerHelper.userData._doorPlacerPreview = true;
    this.scene.add(this.triggerHelper);

    this.previewReady = true;
    this.updateHUD();
  }

  private hidePreview(): void {
    this.previewReady = false;
    if (this.previewGroup) {
      this.scene.remove(this.previewGroup);
      this.previewGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          (child.material as THREE.Material).dispose();
        }
      });
      this.previewGroup = null;
    }
    if (this.triggerHelper) {
      this.scene.remove(this.triggerHelper);
      (this.triggerHelper.material as THREE.Material).dispose();
      this.triggerHelper.geometry.dispose();
      this.triggerHelper = null;
    }
  }

  update(): void {
    if (!this.active || !this.previewReady || !this.previewGroup) return;

    // Raycast from screen center
    this.raycaster.setFromCamera(this.screenCenter, this.camera);

    // Only test against scene meshes (not the preview itself)
    const meshes: THREE.Object3D[] = [];
    this.scene.traverse((child) => {
      if (child instanceof THREE.Mesh && !child.userData._doorPlacerPreview && !this.isPreviewChild(child)) {
        meshes.push(child);
      }
    });

    const intersects = this.raycaster.intersectObjects(meshes, false);
    if (intersects.length > 0) {
      this.hitPoint.copy(intersects[0].point);
      this.hasHit = true;
    }

    this.previewGroup.visible = this.hasHit;
    if (this.hasHit) {
      this.previewGroup.position.set(this.hitPoint.x, this.hitPoint.y + this.previewYOffset, this.hitPoint.z);
      this.previewGroup.rotation.y = this.currentRotation;
    }

    if (this.triggerHelper) {
      this.triggerHelper.visible = this.hasHit;
      if (this.hasHit) {
        this.triggerHelper.position.copy(this.hitPoint);
      }
    }
  }

  private isPreviewChild(obj: THREE.Object3D): boolean {
    let current: THREE.Object3D | null = obj;
    while (current) {
      if (current === this.previewGroup || current === this.triggerHelper) return true;
      current = current.parent;
    }
    return false;
  }

  private async place(): Promise<void> {
    if (!this.hasHit) return;

    const preset = DOOR_PRESETS[this.presetIndex];
    const config: DoorConfig = {
      type: preset.type,
      position: {
        x: parseFloat(this.hitPoint.x.toFixed(4)),
        y: parseFloat(this.hitPoint.y.toFixed(4)),
        z: parseFloat(this.hitPoint.z.toFixed(4)),
      },
      rotation: parseFloat(this.currentRotation.toFixed(4)),
      modelUrl: preset.modelUrl,
      modelScale: this.modelScale !== 1 ? this.modelScale : undefined,
      ...(preset.type === 'swinging' ? {
        hingeSide: this.currentHingeSide,
        swingDirection: this.currentSwingDirection,
      } : {
        slideDirection: this.currentSlideDirection,
      }),
    };

    const entity = await this.world.spawnDoor(config);
    this.placements.push({ config, entity });

    console.log('[DoorPlacer] Placed door:', JSON.stringify(config, null, 2));
    this.updateHUD();
  }

  private undo(): void {
    const last = this.placements.pop();
    if (last) {
      this.world.doorManager.removeDoor(last.entity);
      console.log('[DoorPlacer] Undone last placement');
      this.updateHUD();
    }
  }

  exportAll(): void {
    const configs = this.placements.map((p) => p.config);
    if (configs.length > 0) {
      console.log('[DoorPlacer] All placements:');
      console.log(JSON.stringify(configs, null, 2));
    } else {
      console.log('[DoorPlacer] No placements to export.');
    }
  }

  private createHUD(): void {
    this.hudEl = document.createElement('div');
    this.hudEl.style.cssText =
      'position:fixed;top:8px;right:8px;color:#0f0;font:14px monospace;' +
      'background:rgba(0,0,0,0.7);padding:8px 12px;z-index:1000;pointer-events:none;' +
      'border:1px solid #0f0;max-width:300px;';
    document.body.appendChild(this.hudEl);
    this.updateHUD();
  }

  private updateHUD(): void {
    if (!this.hudEl) return;
    const preset = DOOR_PRESETS[this.presetIndex];
    const rot = ((this.currentRotation * 180) / Math.PI).toFixed(0);

    let directionInfo = '';
    if (preset.type === 'swinging') {
      const swing = this.currentSwingDirection === 1 ? 'CCW' : 'CW';
      directionInfo =
        `Hinge: ${this.currentHingeSide}<br>` +
        `Swing: ${swing}<br>`;
    } else {
      const slide = this.currentSlideDirection === -1 ? 'left' : 'right';
      directionInfo = `Slide: ${slide}<br>`;
    }

    this.hudEl.innerHTML =
      `<b>DOOR PLACER</b><br>` +
      `Type: ${preset.name} (${preset.type})<br>` +
      `Rotation: ${rot}°<br>` +
      directionInfo +
      `Placed: ${this.placements.length}<br>` +
      `<br>` +
      `[ ] Rotate | T Cycle<br>` +
      `H Hinge | G Direction<br>` +
      `E Place | Bksp Undo<br>` +
      `F9 Done + Export`;
  }

  private removeHUD(): void {
    this.hudEl?.remove();
    this.hudEl = null;
  }

  dispose(): void {
    this.deactivate();
    this.previewCache.clear();
  }
}
