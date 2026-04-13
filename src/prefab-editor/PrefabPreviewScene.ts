import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { ECSWorld, MeshSystem, createDefaultRegistry } from '../ecs';
import { AnimationSystem } from '../ecs/systems/AnimationSystem';
import { StateMachineSystem } from '../ecs/systems/StateMachineSystem';
import type { CatalogPrefab } from '../ecs';
import type { PrefabRegistry, PrefabDefinition } from '../ecs';
import type { MeshComponent, KeyframeAnimationComponent, PivotComponent } from '../ecs';
import { deserializeEntityV2 } from '../ecs';
import type { PrefabCatalog } from '../ecs';

const DEG2RAD = Math.PI / 180;

export class PrefabPreviewScene {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private orbitControls: OrbitControls;
  private transformControls: TransformControls;
  private ecsWorld: ECSWorld;
  private meshSystem: MeshSystem;
  private animSystem: AnimationSystem;
  private smSystem: StateMachineSystem;
  private gridHelper: THREE.GridHelper;
  private pivotHelper: THREE.Mesh;
  private pivotVisible = false;
  private currentEntityId: string | null = null;
  private animating = false;
  private animFrameId = 0;
  private lastTime = 0;
  private registry: PrefabRegistry;
  private catalog: PrefabCatalog | null = null;

  /** Callback when pivot is dragged in 3D */
  onPivotDragged?: (offset: [number, number, number]) => void;

  constructor(canvas: HTMLCanvasElement) {
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor(0x1a1a2e);

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);

    // Lighting
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(2, 3, 1);
    this.scene.add(dirLight);

    // Grid
    this.gridHelper = new THREE.GridHelper(20, 40, 0x333355, 0x222244);
    this.scene.add(this.gridHelper);

    // Camera
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.01, 1000);
    this.camera.position.set(2, 2, 2);

    // Orbit controls
    this.orbitControls = new OrbitControls(this.camera, canvas);
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.1;

    // Transform controls (for pivot editing)
    this.transformControls = new TransformControls(this.camera, canvas);
    this.transformControls.setMode('translate');
    this.transformControls.setSize(0.5);
    this.transformControls.addEventListener('dragging-changed', (e) => {
      this.orbitControls.enabled = !e.value;
    });
    this.transformControls.addEventListener('objectChange', () => {
      if (this.pivotVisible) {
        const pos = this.pivotHelper.position;
        this.onPivotDragged?.([
          Math.round(pos.x * 10000) / 10000,
          Math.round(pos.y * 10000) / 10000,
          Math.round(pos.z * 10000) / 10000,
        ]);
      }
    });
    this.scene.add(this.transformControls.getHelper());

    // Pivot helper (small sphere)
    const pivotGeo = new THREE.SphereGeometry(0.05, 16, 16);
    const pivotMat = new THREE.MeshBasicMaterial({ color: 0xff4488, depthTest: false });
    this.pivotHelper = new THREE.Mesh(pivotGeo, pivotMat);
    this.pivotHelper.renderOrder = 999;
    this.pivotHelper.visible = false;
    this.scene.add(this.pivotHelper);

    // ECS
    this.registry = createDefaultRegistry();
    this.ecsWorld = new ECSWorld();
    this.meshSystem = new MeshSystem(this.scene, '/models/objects');
    this.smSystem = new StateMachineSystem();
    this.animSystem = new AnimationSystem();
    this.animSystem.setStateMachineSystem(this.smSystem);

    this.ecsWorld.addSystem(this.meshSystem);
    this.ecsWorld.addSystem(this.smSystem);
    this.ecsWorld.addSystem(this.animSystem);

    // Resize
    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());

    // Start render loop
    this.lastTime = performance.now();
    this.animate();
  }

  setCatalog(catalog: PrefabCatalog): void {
    this.catalog = catalog;
  }

  private handleResize(): void {
    // Account for sidebar (280px)
    const w = window.innerWidth - 280;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  /**
   * Load a prefab into the preview scene.
   */
  async loadPrefab(prefab: CatalogPrefab): Promise<void> {
    // Clear previous
    if (this.currentEntityId) {
      this.ecsWorld.removeEntity(this.currentEntityId);
      this.currentEntityId = null;
    }

    // Create entity via deserialization (applies full 3-tier defaults)
    const entityId = `preview_${prefab.id}`;
    const entity = deserializeEntityV2(
      {
        id: entityId,
        prefab: prefab.id,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      },
      this.catalog!,
      this.registry,
    );

    if (entity) {
      this.ecsWorld.addEntity(entity);
      this.currentEntityId = entityId;

      // Wait for meshes to load, then frame
      await new Promise(r => setTimeout(r, 100));
      this.framePrefab();
    }
  }

  /**
   * Frame the camera to fit the loaded prefab.
   */
  private framePrefab(): void {
    if (!this.currentEntityId) return;
    const mesh = this.ecsWorld.getComponent(this.currentEntityId, 'Mesh') as MeshComponent | undefined;
    if (!mesh?._group) return;

    const box = new THREE.Box3().setFromObject(mesh._group);
    if (box.isEmpty()) return;

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const dist = maxDim * 2;

    this.orbitControls.target.copy(center);
    this.camera.position.set(center.x + dist, center.y + dist * 0.6, center.z + dist);
    this.orbitControls.update();
  }

  // ── Pivot ──────────────────────────────────────────────────────

  showPivot(offset: [number, number, number]): void {
    this.pivotHelper.position.set(offset[0], offset[1], offset[2]);
    this.pivotHelper.visible = true;
    this.pivotVisible = true;
    this.transformControls.attach(this.pivotHelper);
  }

  hidePivot(): void {
    this.pivotHelper.visible = false;
    this.pivotVisible = false;
    this.transformControls.detach();
  }

  updatePivotPosition(offset: [number, number, number]): void {
    this.pivotHelper.position.set(offset[0], offset[1], offset[2]);
  }

  // ── Animation preview ─────────────────────────────────────────

  playAnimation(clipName: string): void {
    if (!this.currentEntityId) return;
    const anim = this.ecsWorld.getComponent(this.currentEntityId, 'KeyframeAnimation') as KeyframeAnimationComponent | undefined;
    if (!anim) return;

    anim._activeClip = clipName;
    anim._clipTime = 0;
    anim._clipSpeed = 1;
    anim._playing = true;
    this.animating = true;
  }

  stopAnimation(): void {
    if (!this.currentEntityId) return;
    const anim = this.ecsWorld.getComponent(this.currentEntityId, 'KeyframeAnimation') as KeyframeAnimationComponent | undefined;
    if (anim) {
      anim._playing = false;
    }
    this.animating = false;
  }

  setAnimationProgress(clipName: string, t: number): void {
    if (!this.currentEntityId) return;
    const anim = this.ecsWorld.getComponent(this.currentEntityId, 'KeyframeAnimation') as KeyframeAnimationComponent | undefined;
    if (!anim) return;
    const clip = anim.clips[clipName];
    if (!clip) return;

    anim._activeClip = clipName;
    anim._clipTime = t * clip.duration;
    anim._clipSpeed = 0; // paused, just seeking
    anim._playing = true;
  }

  isAnimationPlaying(): boolean {
    return this.animating;
  }

  getCurrentEntityId(): string | null {
    return this.currentEntityId;
  }

  getECSWorld(): ECSWorld {
    return this.ecsWorld;
  }

  // ── Test rotation for pivot ───────────────────────────────────

  testPivotRotation(): void {
    if (!this.currentEntityId) return;
    const pivot = this.ecsWorld.getComponent(this.currentEntityId, 'Pivot') as PivotComponent | undefined;
    if (!pivot) return;

    // Temporarily set up a rotation animation and play it
    const anim = this.ecsWorld.getComponent(this.currentEntityId, 'KeyframeAnimation') as KeyframeAnimationComponent | undefined;
    if (anim) {
      // Save existing clips, add a test clip
      const testTrack = {
        targetMesh: 0,
        property: 'rotation.y',
        keyframes: [{ time: 0, value: 0 }, { time: 1, value: 90 }],
        easing: 'ease-in-out' as const,
      };
      const testIdx = anim.tracks.length;
      anim.tracks.push(testTrack);
      anim.clips['__test_pivot'] = { tracks: [testIdx], duration: 1.0 };
      this.playAnimation('__test_pivot');

      // Clean up after completion
      setTimeout(() => {
        anim.tracks.splice(testIdx, 1);
        delete anim.clips['__test_pivot'];
      }, 1200);
    }
  }

  // ── Render loop ───────────────────────────────────────────────

  private animate = (): void => {
    this.animFrameId = requestAnimationFrame(this.animate);

    const now = performance.now();
    const dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    this.orbitControls.update();
    this.ecsWorld.update(dt);
    this.renderer.render(this.scene, this.camera);
  };

  dispose(): void {
    cancelAnimationFrame(this.animFrameId);
    this.ecsWorld.dispose();
    this.orbitControls.dispose();
    this.transformControls.dispose();
    this.renderer.dispose();
  }
}
