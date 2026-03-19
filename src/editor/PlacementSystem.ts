import * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import type { PlaceableDefinition, PlacedObject } from './PlaceableDefinition';
import type { World } from '../core/World';
import type { AssetLoader } from '../core/AssetLoader';

type EditorState = 'idle' | 'placing';
type TransformMode = 'translate' | 'rotate' | 'scale';

const POSITION_STEPS = [0.001, 0.005, 0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.0];
const ROTATION_STEPS = [0.1, 0.5, 1, 5, 10, 15, 30, 45, 90];    // degrees
const SCALE_STEPS = [0.001, 0.005, 0.01, 0.05, 0.1, 0.25, 0.5, 1.0];

const DEFAULT_POS_IDX = 5;   // 0.25
const DEFAULT_ROT_IDX = 5;   // 15°
const DEFAULT_SCALE_IDX = 4; // 0.1

let nextId = 1;

export class PlacementSystem {
  private state: EditorState = 'idle';
  private placedObjects: PlacedObject[] = [];

  // Placing state
  private placingDef: PlaceableDefinition | null = null;
  private placingConfig: Record<string, unknown> = {};
  private previewObject: THREE.Object3D | null = null;
  private previewYOffset = 0;

  // Selection
  private selectedObject: PlacedObject | null = null;

  // Transform gizmo
  private transformControls: TransformControls;
  private _gizmoDragging = false;
  decalTaggingActive = false;
  private _transformMode: TransformMode = 'translate';
  private _scaleAtDragStart = new THREE.Vector3(1, 1, 1);
  private _uniformScaleDampen = 0.3; // Only apply 30% of uniform scale delta

  // Raycasting
  private raycaster = new THREE.Raycaster();
  private mouseNDC = new THREE.Vector2();
  private hitPoint = new THREE.Vector3();
  private hasHit = false;

  // Step size indices
  private _posStepIdx = DEFAULT_POS_IDX;
  private _rotStepIdx = DEFAULT_ROT_IDX;
  private _scaleStepIdx = DEFAULT_SCALE_IDX;

  // Callbacks for UI sync
  onSelectionChange: ((obj: PlacedObject | null) => void) | null = null;
  onPlacementEnd: (() => void) | null = null;
  onTransformModeChange: ((mode: TransformMode) => void) | null = null;
  onDataChanged: (() => void) | null = null;
  onStepChanged: (() => void) | null = null;

  constructor(
    private scene: THREE.Scene,
    private camera: THREE.PerspectiveCamera,
    private canvas: HTMLElement,
    private world: World,
    private assetLoader: AssetLoader,
    private modelScale: number
  ) {
    this.canvas.addEventListener('click', this.onClick);
    document.addEventListener('keydown', this.onKeyDown);
    this.canvas.addEventListener('mousemove', this.onMouseMove);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });

    // TransformControls gizmo
    this.transformControls = new TransformControls(this.camera, this.canvas);
    this.transformControls.setMode('translate');
    this.transformControls.setSize(0.8);
    this.scene.add(this.transformControls.getHelper());

    this.updateGizmoSnap();
    this.transformControls.addEventListener('dragging-changed', (e: any) => {
      this._gizmoDragging = e.value;
      // Capture scale when drag starts so we can dampen uniform scaling
      if (e.value && this._transformMode === 'scale' && this.selectedObject) {
        this._scaleAtDragStart.copy(this.selectedObject.sceneObject.scale);
      }
    });
    this.transformControls.addEventListener('objectChange', () => {
      // Dampen uniform scaling (center node) to prevent aggressive jumps
      if (this._transformMode === 'scale' && this.selectedObject) {
        const scl = this.selectedObject.sceneObject.scale;
        const sx = scl.x, sy = scl.y, sz = scl.z;
        const start = this._scaleAtDragStart;
        // Detect uniform scaling: all axes changed by same ratio from start
        const dx = sx - start.x, dy = sy - start.y, dz = sz - start.z;
        const isUniform = Math.abs(dx - dy) < 0.001 && Math.abs(dy - dz) < 0.001;
        if (isUniform && Math.abs(dx) > 0.001) {
          // Apply dampening: only move a fraction of the delta
          scl.set(
            start.x + (sx - start.x) * this._uniformScaleDampen,
            start.y + (sy - start.y) * this._uniformScaleDampen,
            start.z + (sz - start.z) * this._uniformScaleDampen
          );
        }
      }
      this.syncTransformToConfig();
    });
  }

  get currentState(): EditorState {
    return this.state;
  }

  get selected(): PlacedObject | null {
    return this.selectedObject;
  }

  get objects(): PlacedObject[] {
    return this.placedObjects;
  }

  get isGizmoDragging(): boolean {
    return this._gizmoDragging;
  }

  get transformMode(): TransformMode {
    return this._transformMode;
  }

  // ── Transform mode ────────────────────────────────────────────────

  setTransformMode(mode: TransformMode): void {
    this._transformMode = mode;
    this.transformControls.setMode(mode);
    this.updateGizmoSnap();
    this.onTransformModeChange?.(mode);
  }

  // ── Step sizes ─────────────────────────────────────────────────────

  get positionStep(): number { return POSITION_STEPS[this._posStepIdx]; }
  get rotationStepDeg(): number { return ROTATION_STEPS[this._rotStepIdx]; }
  get rotationStep(): number { return this.rotationStepDeg * Math.PI / 180; }
  get scaleStep(): number { return SCALE_STEPS[this._scaleStepIdx]; }

  /** Cycles the step size for the active transform mode. */
  cycleStep(direction: 1 | -1): void {
    switch (this._transformMode) {
      case 'translate':
        this._posStepIdx = Math.max(0, Math.min(POSITION_STEPS.length - 1, this._posStepIdx + direction));
        break;
      case 'rotate':
        this._rotStepIdx = Math.max(0, Math.min(ROTATION_STEPS.length - 1, this._rotStepIdx + direction));
        break;
      case 'scale':
        this._scaleStepIdx = Math.max(0, Math.min(SCALE_STEPS.length - 1, this._scaleStepIdx + direction));
        break;
    }
    this.updateGizmoSnap();
    this.onStepChanged?.();
  }

  private updateGizmoSnap(): void {
    this.transformControls.setTranslationSnap(this.positionStep);
    this.transformControls.setRotationSnap(this.rotationStep);
    this.transformControls.setScaleSnap(this.scaleStep);
  }

  // ── Placement flow ────────────────────────────────────────────────

  async startPlacing(def: PlaceableDefinition, config?: Record<string, unknown>): Promise<void> {
    this.cancelPlacing();
    this.deselect();

    this.placingDef = def;
    this.placingConfig = config ? { ...config } : { ...def.defaultConfig };
    this.state = 'placing';
    this.hasHit = false;

    // Create preview
    this.previewObject = await def.createPreview(this.assetLoader, this.modelScale);
    this.previewYOffset = (this.previewObject.userData._previewYOffset as number) ?? 0;
    this.previewObject.visible = false;
    this.scene.add(this.previewObject);
  }

  cancelPlacing(): void {
    if (this.state !== 'placing') return;
    this.cleanupPreview();
    this.state = 'idle';
    this.placingDef = null;
    this.onPlacementEnd?.();
  }

  // ── Selection ─────────────────────────────────────────────────────

  selectObject(obj: PlacedObject): void {
    this.deselect();
    this.selectedObject = obj;

    // BoxHelper for selection highlight
    const helper = new THREE.BoxHelper(obj.sceneObject, 0x00ff00);
    this.scene.add(helper);
    obj.selectionHelper = helper;

    // Attach transform gizmo
    this.transformControls.attach(obj.sceneObject);

    this.onSelectionChange?.(obj);
  }

  deselect(): void {
    if (this.selectedObject?.selectionHelper) {
      this.scene.remove(this.selectedObject.selectionHelper);
      this.selectedObject.selectionHelper.dispose();
      this.selectedObject.selectionHelper = undefined;
    }

    // Detach transform gizmo
    this.transformControls.detach();

    this.selectedObject = null;
    this.onSelectionChange?.(null);
  }

  // ── Property updates ──────────────────────────────────────────────

  /** Update a property on the selected object. Returns true if the object needs respawn. */
  async updateProperty(key: string, value: unknown): Promise<void> {
    if (!this.selectedObject) return;

    const obj = this.selectedObject;
    obj.config[key] = value;

    // For structural changes (hinge, type, etc.) we need to respawn the entity
    // Position/rotation can be updated directly
    if (key === 'rotation') {
      const rot = value as number;
      obj.sceneObject.rotation.y = (rot * Math.PI) / 180;
      return;
    }

    // Respawn for other property changes
    await this.respawnObject(obj);
    this.onDataChanged?.();
  }

  /** Update position of the selected object */
  updatePosition(x: number, y: number, z: number): void {
    if (!this.selectedObject) return;
    const obj = this.selectedObject;
    obj.config.position = { x, y, z };
    obj.sceneObject.position.set(x, y, z);
    if (obj.selectionHelper) obj.selectionHelper.update();
    this.onDataChanged?.();
  }

  // ── Delete / duplicate ────────────────────────────────────────────

  deleteSelected(): void {
    if (!this.selectedObject) return;
    const obj = this.selectedObject;
    this.deselect();

    // Remove from world
    obj.definition.remove(this.world, obj.entity);

    // Remove from tracking
    const idx = this.placedObjects.indexOf(obj);
    if (idx !== -1) this.placedObjects.splice(idx, 1);
    this.onDataChanged?.();
  }

  async duplicateSelected(): Promise<void> {
    if (!this.selectedObject) return;
    const obj = this.selectedObject;
    const pos = obj.config.position as { x: number; y: number; z: number };

    // Offset the duplicate slightly
    const newConfig = {
      ...obj.config,
      position: { x: pos.x + 1, y: pos.y, z: pos.z + 1 },
    };

    const placed = await this.spawnObject(obj.definition, newConfig);
    this.selectObject(placed);
    this.onDataChanged?.();
  }

  // ── Update (call each frame) ──────────────────────────────────────

  update(): void {
    if (this.state === 'placing' && this.previewObject) {
      // Raycast from mouse position
      this.raycaster.setFromCamera(this.mouseNDC, this.camera);

      const meshes: THREE.Object3D[] = [];
      this.scene.traverse((child) => {
        if (child instanceof THREE.Mesh && !child.userData._editorPreview && !this.isPreviewChild(child)) {
          meshes.push(child);
        }
      });

      const intersects = this.raycaster.intersectObjects(meshes, false);
      if (intersects.length > 0) {
        this.hitPoint.copy(intersects[0].point);
        this.hasHit = true;
      }

      this.previewObject.visible = this.hasHit;
      if (this.hasHit) {
        const rotation = ((this.placingConfig.rotation as number) ?? 0) * Math.PI / 180;
        this.previewObject.position.set(
          this.hitPoint.x,
          this.hitPoint.y + this.previewYOffset,
          this.hitPoint.z
        );
        this.previewObject.rotation.y = rotation;
      }
    }

    // Update selection helper
    if (this.selectedObject?.selectionHelper) {
      this.selectedObject.selectionHelper.update();
    }
  }

  // ── Bulk operations ───────────────────────────────────────────────

  clearAll(): void {
    this.deselect();
    this.cancelPlacing();
    for (const obj of [...this.placedObjects]) {
      obj.definition.remove(this.world, obj.entity);
    }
    this.placedObjects.length = 0;
    this.onDataChanged?.();
  }

  async loadObjects(
    objectsData: { type: string; config: Record<string, unknown> }[],
    definitionLookup: (type: string) => PlaceableDefinition | undefined
  ): Promise<void> {
    for (const data of objectsData) {
      const def = definitionLookup(data.type);
      if (!def) {
        console.warn(`[PlacementSystem] Unknown type: ${data.type}`);
        continue;
      }
      await this.spawnObject(def, data.config);
    }
    this.onDataChanged?.();
  }

  // ── Internals ─────────────────────────────────────────────────────

  /** Sync gizmo transform changes back to the config object */
  private syncTransformToConfig(): void {
    if (!this.selectedObject) return;
    const obj = this.selectedObject;
    const pos = obj.sceneObject.position;
    const rot = obj.sceneObject.rotation;
    const scl = obj.sceneObject.scale;

    obj.config.position = {
      x: parseFloat(pos.x.toFixed(4)),
      y: parseFloat(pos.y.toFixed(4)),
      z: parseFloat(pos.z.toFixed(4)),
    };
    obj.config.rotation = parseFloat(((rot.y * 180) / Math.PI).toFixed(2));
    obj.config.scale = {
      x: parseFloat(scl.x.toFixed(4)),
      y: parseFloat(scl.y.toFixed(4)),
      z: parseFloat(scl.z.toFixed(4)),
    };

    if (obj.selectionHelper) obj.selectionHelper.update();
    // Refresh properties panel
    this.onSelectionChange?.(obj);
    this.onDataChanged?.();
  }

  private async spawnObject(
    def: PlaceableDefinition,
    config: Record<string, unknown>
  ): Promise<PlacedObject> {
    // Build the full spawn config: convert degrees→radians for rotation,
    // derive modelScale from editor scale object if present
    const scale = config.scale as { x: number } | undefined;
    const spawnConfig = {
      ...config,
      rotation: ((config.rotation as number) ?? 0) * Math.PI / 180,
      modelScale: scale
        ? scale.x * this.modelScale
        : (config.modelScale as number | undefined) ?? this.modelScale,
    };

    const entity = await def.spawn(this.world, spawnConfig);

    // Find the scene object (for doors, it's the pivotGroup on the entity)
    const sceneObject = (entity as any).pivotGroup ?? (entity as any).mesh ?? new THREE.Object3D();

    const placed: PlacedObject = {
      id: `obj_${nextId++}`,
      definition: def,
      config: { ...config },
      sceneObject,
      entity,
    };

    this.placedObjects.push(placed);
    return placed;
  }

  private async respawnObject(obj: PlacedObject): Promise<void> {
    const wasSelected = this.selectedObject === obj;
    if (wasSelected) this.deselect();

    // Remove old entity
    obj.definition.remove(this.world, obj.entity);
    const idx = this.placedObjects.indexOf(obj);
    if (idx !== -1) this.placedObjects.splice(idx, 1);

    // Respawn with updated config
    const newObj = await this.spawnObject(obj.definition, obj.config);
    if (wasSelected) this.selectObject(newObj);
  }

  private cleanupPreview(): void {
    if (this.previewObject) {
      this.scene.remove(this.previewObject);
      this.previewObject.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          (child.material as THREE.Material).dispose();
        }
      });
      this.previewObject = null;
    }
  }

  private isPreviewChild(obj: THREE.Object3D): boolean {
    let current: THREE.Object3D | null = obj;
    while (current) {
      if (current === this.previewObject) return true;
      current = current.parent;
    }
    return false;
  }

  // ── Event handlers ────────────────────────────────────────────────

  private onClick = (e: MouseEvent): void => {
    // Ignore right clicks (camera look) and clicks on UI
    if (e.button !== 0) return;
    if ((e.target as HTMLElement) !== this.canvas) return;
    // Skip when user is dragging the transform gizmo or tagging decals
    if (this._gizmoDragging || this.decalTaggingActive) return;

    if (this.state === 'placing') {
      this.confirmPlacement();
    } else {
      this.trySelect(e);
    }
  };

  private onMouseMove = (e: MouseEvent): void => {
    // Convert mouse to NDC
    const rect = this.canvas.getBoundingClientRect();
    this.mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.code === 'Escape') {
      if (this.state === 'placing') {
        this.cancelPlacing();
      } else {
        this.deselect();
      }
      return;
    }

    if (e.code === 'Delete' || e.code === 'Backspace') {
      this.deleteSelected();
      return;
    }

    if (e.ctrlKey && e.code === 'KeyD') {
      e.preventDefault();
      this.duplicateSelected();
      return;
    }

    // Transform mode shortcuts (only when object is selected, not placing)
    if (this.selectedObject && this.state !== 'placing') {
      if (e.code === 'KeyQ') { this.setTransformMode('translate'); return; }
      if (e.code === 'KeyR') { this.setTransformMode('rotate'); return; }
      if (e.code === 'KeyF') { this.setTransformMode('scale'); return; }
    }

    // Rotation
    if (e.code === 'BracketRight') {
      this.rotateCurrentOrSelected(this.rotationStep);
      return;
    }
    if (e.code === 'BracketLeft') {
      this.rotateCurrentOrSelected(-this.rotationStep);
      return;
    }

    // Nudge
    if (this.selectedObject) {
      const pos = this.selectedObject.config.position as { x: number; y: number; z: number };
      const step = this.positionStep;
      if (e.code === 'ArrowRight') this.updatePosition(pos.x + step, pos.y, pos.z);
      if (e.code === 'ArrowLeft') this.updatePosition(pos.x - step, pos.y, pos.z);
      if (e.code === 'ArrowUp') this.updatePosition(pos.x, pos.y, pos.z - step);
      if (e.code === 'ArrowDown') this.updatePosition(pos.x, pos.y, pos.z + step);
      if (e.code === 'PageUp') this.updatePosition(pos.x, pos.y + step, pos.z);
      if (e.code === 'PageDown') this.updatePosition(pos.x, pos.y - step, pos.z);
    }
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const dir: 1 | -1 = e.deltaY < 0 ? 1 : -1;
    this.cycleStep(dir);
  };

  private rotateCurrentOrSelected(delta: number): void {
    if (this.state === 'placing') {
      const current = (this.placingConfig.rotation as number) ?? 0;
      this.placingConfig.rotation = current + (delta * 180) / Math.PI;
    } else if (this.selectedObject) {
      const current = (this.selectedObject.config.rotation as number) ?? 0;
      const newRot = current + (delta * 180) / Math.PI;
      this.selectedObject.config.rotation = newRot;
      this.selectedObject.sceneObject.rotation.y = (newRot * Math.PI) / 180;
      if (this.selectedObject.selectionHelper) this.selectedObject.selectionHelper.update();
      this.onSelectionChange?.(this.selectedObject);
    }
  }

  private async confirmPlacement(): Promise<void> {
    if (!this.hasHit || !this.placingDef) return;

    const config: Record<string, unknown> = {
      ...this.placingConfig,
      position: {
        x: parseFloat(this.hitPoint.x.toFixed(4)),
        y: parseFloat(this.hitPoint.y.toFixed(4)),
        z: parseFloat(this.hitPoint.z.toFixed(4)),
      },
    };

    const placed = await this.spawnObject(this.placingDef, config);
    console.log('[Editor] Placed:', placed.definition.name, config.position);

    // Stay in placing mode, don't select — cleaner for rapid placement
    this.onDataChanged?.();
  }

  private trySelect(e: MouseEvent): void {
    // Raycast against placed objects' meshes
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );

    this.raycaster.setFromCamera(ndc, this.camera);

    // Collect all meshes from placed objects
    const meshToObj = new Map<THREE.Object3D, PlacedObject>();
    for (const obj of this.placedObjects) {
      obj.sceneObject.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          meshToObj.set(child, obj);
        }
      });
    }

    const meshes = [...meshToObj.keys()];
    if (meshes.length === 0) {
      this.deselect();
      return;
    }

    const intersects = this.raycaster.intersectObjects(meshes, false);
    if (intersects.length > 0) {
      const hit = meshToObj.get(intersects[0].object as THREE.Mesh);
      if (hit) {
        this.selectObject(hit);
        return;
      }
    }

    this.deselect();
  }

  dispose(): void {
    this.cancelPlacing();
    this.deselect();
    this.transformControls.detach();
    this.transformControls.dispose();
    this.canvas.removeEventListener('click', this.onClick);
    document.removeEventListener('keydown', this.onKeyDown);
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('wheel', this.onWheel);
  }
}
