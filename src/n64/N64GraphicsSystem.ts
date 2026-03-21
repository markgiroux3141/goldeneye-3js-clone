import * as THREE from 'three';
import { Engine } from '../core/Engine';
import { createN64Material } from './N64Material';
import { CRTPostProcess } from './CRTPostProcess';

const N64_WIDTH = 320;
const N64_HEIGHT = 240;
const TARGET_ASPECT = 4 / 3;

export interface N64EffectToggles {
  crt: boolean;
  scanlines: boolean;
  lowRes: boolean;
  fog: boolean;
  dither: boolean;
  vertexLit: boolean;
  bakedLit: boolean;
  affine: boolean;
  vertJitter: boolean;
  colorDepth: boolean;
}

const DEFAULT_TOGGLES: N64EffectToggles = {
  crt: true,
  scanlines: true,
  lowRes: true,
  fog: true,
  dither: true,
  vertexLit: true,
  bakedLit: false,
  affine: true,
  vertJitter: true,
  colorDepth: true,
};

export class N64GraphicsSystem {
  private enabled = false;
  private toggles: N64EffectToggles = { ...DEFAULT_TOGGLES };
  private elapsedTime = 0;

  // Render pipeline
  private renderTarget: THREE.WebGLRenderTarget;
  private crtPass: CRTPostProcess;

  // Material tracking
  private materialMap = new Map<THREE.Material, THREE.ShaderMaterial>();
  private swappedMeshes = new Set<THREE.Mesh>();

  // Scenes to manage
  private mainScene: THREE.Scene;
  private mainCamera: THREE.PerspectiveCamera;
  private weaponScene: THREE.Scene;
  private weaponCamera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  // Original state for restore
  private originalCameraAspect = 1;

  constructor(
    private engine: Engine,
    weaponScene: THREE.Scene,
    weaponCamera: THREE.PerspectiveCamera
  ) {
    this.mainScene = engine.scene;
    this.mainCamera = engine.camera;
    this.weaponScene = weaponScene;
    this.weaponCamera = weaponCamera;
    this.renderer = engine.renderer;

    // Low-res render target (320x240, nearest filter, no AA)
    this.renderTarget = new THREE.WebGLRenderTarget(N64_WIDTH, N64_HEIGHT, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      depthBuffer: true,
    });

    this.crtPass = new CRTPostProcess(new THREE.Vector2(N64_WIDTH, N64_HEIGHT));
    this.crtPass.setTexture(this.renderTarget.texture);

    window.addEventListener('resize', this.onResize);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getToggles(): N64EffectToggles {
    return { ...this.toggles };
  }

  enable(): void {
    if (this.enabled) return;
    this.enabled = true;
    this.originalCameraAspect = this.mainCamera.aspect;

    // Swap materials on all meshes
    this.swapMaterials(this.mainScene, true);
    this.swapMaterials(this.weaponScene, true);

    // Force 4:3 camera
    this.mainCamera.aspect = TARGET_ASPECT;
    this.mainCamera.updateProjectionMatrix();
    this.weaponCamera.aspect = TARGET_ASPECT;
    this.weaponCamera.updateProjectionMatrix();

    // Sync all toggle uniforms
    this.syncAllUniforms();
  }

  disable(): void {
    if (!this.enabled) return;
    this.enabled = false;

    // Restore materials
    this.swapMaterials(this.mainScene, false);
    this.swapMaterials(this.weaponScene, false);
    this.swappedMeshes.clear();

    // Restore camera
    this.mainCamera.aspect = window.innerWidth / window.innerHeight;
    this.mainCamera.updateProjectionMatrix();
    this.weaponCamera.aspect = window.innerWidth / window.innerHeight;
    this.weaponCamera.updateProjectionMatrix();

    // Restore viewport
    this.renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
    this.renderer.setScissor(0, 0, window.innerWidth, window.innerHeight);
    this.renderer.setScissorTest(false);
  }

  toggle(): void {
    if (this.enabled) this.disable();
    else this.enable();
  }

  setEffect(name: keyof N64EffectToggles, enabled: boolean): void {
    this.toggles[name] = enabled;
    if (!this.enabled) return;

    // Update CRT pass uniforms
    if (name === 'crt' || name === 'scanlines') {
      this.crtPass.setEffect(name, enabled);
      return;
    }

    // Update N64 material uniforms
    const uniformMap: Record<string, string> = {
      fog: 'u_useFog',
      dither: 'u_dither',
      vertexLit: 'u_vertexLit',
      bakedLit: 'u_useBakedLighting',
      affine: 'u_affine',
      vertJitter: 'u_jitter',
      colorDepth: 'u_colorDepth',
    };

    const uniformName = uniformMap[name];
    if (!uniformName) return;

    const val = enabled ? 1.0 : 0.0;
    for (const mat of this.materialMap.values()) {
      if (mat.uniforms[uniformName]) {
        mat.uniforms[uniformName].value = val;
      }
    }
  }

  update(dt: number): void {
    if (!this.enabled) return;
    this.elapsedTime += dt;
  }

  render(): void {
    if (!this.enabled) return;

    // Catch any new meshes added since last frame (e.g. bullet decals)
    this.swapNewMeshes(this.mainScene);
    this.swapNewMeshes(this.weaponScene);

    const renderer = this.renderer;

    // Determine render target resolution
    const useLowRes = this.toggles.lowRes;
    let targetWidth: number;
    let targetHeight: number;

    if (useLowRes) {
      targetWidth = N64_WIDTH;
      targetHeight = N64_HEIGHT;
    } else {
      // Use native resolution but still go through render target for CRT
      const vp = this.calc43Viewport();
      targetWidth = Math.floor(vp.width * window.devicePixelRatio);
      targetHeight = Math.floor(vp.height * window.devicePixelRatio);
    }

    // Resize render target if needed
    if (this.renderTarget.width !== targetWidth || this.renderTarget.height !== targetHeight) {
      this.renderTarget.setSize(targetWidth, targetHeight);
      this.crtPass.setSourceResolution(targetWidth, targetHeight);
    }

    // Pass 1: Render main scene to render target
    renderer.setRenderTarget(this.renderTarget);
    renderer.clear();
    renderer.render(this.mainScene, this.mainCamera);

    // Pass 2: Render weapon overlay to same target
    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(this.weaponScene, this.weaponCamera);
    renderer.autoClear = true;

    // Pass 3: Render CRT quad to screen with 4:3 viewport
    renderer.setRenderTarget(null);

    // Clear full screen to black
    renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
    renderer.setScissor(0, 0, window.innerWidth, window.innerHeight);
    renderer.setScissorTest(true);
    renderer.setClearColor(0x000000, 1);
    renderer.clear();

    // Set 4:3 viewport
    const vp = this.calc43Viewport();
    renderer.setViewport(vp.x, vp.y, vp.width, vp.height);
    renderer.setScissor(vp.x, vp.y, vp.width, vp.height);

    // Update CRT uniforms
    this.crtPass.setTime(this.elapsedTime);
    this.crtPass.setResolution(vp.width, vp.height);
    this.crtPass.setTexture(this.renderTarget.texture);

    // Render CRT pass
    this.crtPass.render(renderer);
  }

  private calc43Viewport(): { x: number; y: number; width: number; height: number } {
    const windowAspect = window.innerWidth / window.innerHeight;
    let vpWidth: number, vpHeight: number, vpX: number, vpY: number;

    if (windowAspect > TARGET_ASPECT) {
      // Pillarbox (black bars on sides)
      vpHeight = window.innerHeight;
      vpWidth = Math.floor(vpHeight * TARGET_ASPECT);
      vpX = Math.floor((window.innerWidth - vpWidth) / 2);
      vpY = 0;
    } else {
      // Letterbox (black bars top/bottom)
      vpWidth = window.innerWidth;
      vpHeight = Math.floor(vpWidth / TARGET_ASPECT);
      vpX = 0;
      vpY = Math.floor((window.innerHeight - vpHeight) / 2);
    }

    return { x: vpX, y: vpY, width: vpWidth, height: vpHeight };
  }

  private swapMaterials(scene: THREE.Scene, toN64: boolean): void {
    scene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const mesh = obj as THREE.Mesh;

      if (toN64) {
        // Skip additive-blended meshes (muzzle flash) — N64 RDP handled these differently
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        const isAdditive = mats.some((m: THREE.Material) => m.blending === THREE.AdditiveBlending);
        if (isAdditive) {
          this.swappedMeshes.add(mesh);
          return;
        }

        if (Array.isArray(mesh.material)) {
          const originals = mesh.material;
          mesh.userData._originalMaterial = originals;
          mesh.material = originals.map((m) => this.getOrCreateN64Mat(m));
        } else {
          mesh.userData._originalMaterial = mesh.material;
          mesh.material = this.getOrCreateN64Mat(mesh.material);
        }
        this.applyVertexColorFlag(mesh);
        this.swappedMeshes.add(mesh);
      } else {
        if (mesh.userData._originalMaterial) {
          mesh.material = mesh.userData._originalMaterial;
          delete mesh.userData._originalMaterial;
        }
        this.swappedMeshes.delete(mesh);
      }
    });
  }

  private swapNewMeshes(scene: THREE.Scene): void {
    scene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      if (this.swappedMeshes.has(obj)) return;
      // New mesh found — swap it
      const mesh = obj as THREE.Mesh;

      // Skip additive-blended meshes (muzzle flash)
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const isAdditive = mats.some((m: THREE.Material) => m.blending === THREE.AdditiveBlending);
      if (isAdditive) {
        this.swappedMeshes.add(mesh);
        return;
      }

      if (Array.isArray(mesh.material)) {
        mesh.userData._originalMaterial = mesh.material;
        mesh.material = mesh.material.map((m: THREE.Material) => this.getOrCreateN64Mat(m));
      } else {
        mesh.userData._originalMaterial = mesh.material;
        mesh.material = this.getOrCreateN64Mat(mesh.material);
      }
      this.applyVertexColorFlag(mesh);
      this.swappedMeshes.add(mesh);
    });
  }

  private applyVertexColorFlag(mesh: THREE.Mesh): void {
    const hasColors = mesh.geometry.hasAttribute('color') ? 1.0 : 0.0;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of materials) {
      const sm = mat as THREE.ShaderMaterial;
      if (sm.uniforms?.u_hasVertexColors) {
        sm.uniforms.u_hasVertexColors.value = hasColors;
      }
    }
  }

  private getOrCreateN64Mat(original: THREE.Material): THREE.ShaderMaterial {
    let n64Mat = this.materialMap.get(original);
    if (!n64Mat) {
      n64Mat = createN64Material(original);
      this.materialMap.set(original, n64Mat);
      // Apply current toggle state
      this.applyToggles(n64Mat);
    }
    return n64Mat;
  }

  private applyToggles(mat: THREE.ShaderMaterial): void {
    const u = mat.uniforms;
    u.u_jitter.value = this.toggles.vertJitter ? 1.0 : 0.0;
    u.u_affine.value = this.toggles.affine ? 1.0 : 0.0;
    u.u_vertexLit.value = this.toggles.vertexLit ? 1.0 : 0.0;
    u.u_useBakedLighting.value = this.toggles.bakedLit ? 1.0 : 0.0;
    u.u_useFog.value = this.toggles.fog ? 1.0 : 0.0;
    u.u_dither.value = this.toggles.dither ? 1.0 : 0.0;
    u.u_colorDepth.value = this.toggles.colorDepth ? 1.0 : 0.0;
  }

  private syncAllUniforms(): void {
    for (const mat of this.materialMap.values()) {
      this.applyToggles(mat);
    }
    this.crtPass.setEffect('crt', this.toggles.crt);
    this.crtPass.setEffect('scanlines', this.toggles.scanlines);
  }

  private onResize = (): void => {
    if (!this.enabled) return;
    this.mainCamera.aspect = TARGET_ASPECT;
    this.mainCamera.updateProjectionMatrix();
    this.weaponCamera.aspect = TARGET_ASPECT;
    this.weaponCamera.updateProjectionMatrix();
  };

  dispose(): void {
    window.removeEventListener('resize', this.onResize);
    this.renderTarget.dispose();
    this.crtPass.dispose();
    for (const mat of this.materialMap.values()) {
      mat.dispose();
    }
    this.materialMap.clear();
    this.swappedMeshes.clear();
  }
}
