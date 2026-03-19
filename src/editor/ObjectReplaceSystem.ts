import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import type { PlaceableDefinition } from './PlaceableDefinition';
import type { PlacedObjectData } from './LevelData';
import { getAllDefinitions } from './LevelData';
import type { AssetLoader } from '../core/AssetLoader';

// ── Slot: one top-level child from the loaded objects GLB ────────────

export interface ReplaceSlot {
  id: string;
  name: string;
  sourceObject: THREE.Object3D;
  worldPosition: THREE.Vector3;
  worldRotationY: number;          // degrees
  worldScale: THREE.Vector3;
  assignedType: string | null;
  assignedConfig: Record<string, unknown> | null;
  highlight: THREE.BoxHelper | null;
}

// ── Colors ───────────────────────────────────────────────────────────

const COLOR_HOVER = 0xffff00;     // yellow box
const COLOR_SELECTED = 0x00ffff;  // cyan box

let nextSlotId = 1;

// ── 3x3 SVD via Jacobi iteration ────────────────────────────────────

type Mat3 = [number, number, number, number, number, number, number, number, number]; // row-major

function mat3Multiply(a: Mat3, b: Mat3): Mat3 {
  return [
    a[0]*b[0]+a[1]*b[3]+a[2]*b[6], a[0]*b[1]+a[1]*b[4]+a[2]*b[7], a[0]*b[2]+a[1]*b[5]+a[2]*b[8],
    a[3]*b[0]+a[4]*b[3]+a[5]*b[6], a[3]*b[1]+a[4]*b[4]+a[5]*b[7], a[3]*b[2]+a[4]*b[5]+a[5]*b[8],
    a[6]*b[0]+a[7]*b[3]+a[8]*b[6], a[6]*b[1]+a[7]*b[4]+a[8]*b[7], a[6]*b[2]+a[7]*b[5]+a[8]*b[8],
  ];
}

function mat3Transpose(m: Mat3): Mat3 {
  return [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
}

function mat3Det(m: Mat3): number {
  return m[0]*(m[4]*m[8]-m[5]*m[7]) - m[1]*(m[3]*m[8]-m[5]*m[6]) + m[2]*(m[3]*m[7]-m[4]*m[6]);
}

function mat3Identity(): Mat3 {
  return [1,0,0, 0,1,0, 0,0,1];
}

/** Jacobi rotation on symmetric 3x3 matrix. Modifies s in place, accumulates into v. */
function jacobiRotate(s: Mat3, v: Mat3, p: number, q: number): void {
  // p,q are indices 0,1,2; we rotate to zero s[p*3+q]
  const pi = p * 3, qi = q * 3;
  if (Math.abs(s[pi + q]) < 1e-12) return;
  const tau = (s[qi + q] - s[pi + p]) / (2 * s[pi + q]);
  const t = Math.sign(tau) / (Math.abs(tau) + Math.sqrt(1 + tau * tau));
  const c = 1 / Math.sqrt(1 + t * t);
  const sn = t * c;

  // Apply Givens rotation to rows/cols of s
  const sCopy = [...s] as Mat3;
  for (let i = 0; i < 3; i++) {
    s[i * 3 + p] = c * sCopy[i * 3 + p] - sn * sCopy[i * 3 + q];
    s[i * 3 + q] = sn * sCopy[i * 3 + p] + c * sCopy[i * 3 + q];
  }
  const sCopy2 = [...s] as Mat3;
  for (let j = 0; j < 3; j++) {
    s[p * 3 + j] = c * sCopy2[p * 3 + j] - sn * sCopy2[q * 3 + j];
    s[q * 3 + j] = sn * sCopy2[p * 3 + j] + c * sCopy2[q * 3 + j];
  }

  // Accumulate rotation into v
  const vCopy = [...v] as Mat3;
  for (let i = 0; i < 3; i++) {
    v[i * 3 + p] = c * vCopy[i * 3 + p] - sn * vCopy[i * 3 + q];
    v[i * 3 + q] = sn * vCopy[i * 3 + p] + c * vCopy[i * 3 + q];
  }
}

/**
 * Compute SVD of 3x3 matrix H = U * S * V^T
 * Returns { U, S (diagonal), V } where R = V * U^T is the optimal rotation
 */
function svd3x3(H: Mat3): { U: Mat3; V: Mat3 } {
  // Compute H^T * H
  const HtH = mat3Multiply(mat3Transpose(H), H);

  // Jacobi eigendecomposition of H^T * H → V, eigenvalues
  const s = [...HtH] as Mat3;
  const V = mat3Identity();
  for (let iter = 0; iter < 30; iter++) {
    jacobiRotate(s, V, 0, 1);
    jacobiRotate(s, V, 0, 2);
    jacobiRotate(s, V, 1, 2);
  }

  // Singular values = sqrt of eigenvalues
  const sig = [Math.sqrt(Math.max(0, s[0])), Math.sqrt(Math.max(0, s[4])), Math.sqrt(Math.max(0, s[8]))];

  // U = H * V * Sigma^-1
  const HV = mat3Multiply(H, V);
  const U: Mat3 = [...HV] as Mat3;
  for (let col = 0; col < 3; col++) {
    const sv = sig[col] > 1e-10 ? sig[col] : 1;
    U[0 * 3 + col] = HV[0 * 3 + col] / sv;
    U[1 * 3 + col] = HV[1 * 3 + col] / sv;
    U[2 * 3 + col] = HV[2 * 3 + col] / sv;
  }

  return { U, V };
}

/**
 * Compute optimal rotation R = V * U^T from SVD of cross-covariance H.
 * Handles reflection correction (ensures det(R) > 0).
 */
function computeOptimalRotation(H: Mat3): Mat3 {
  const { U, V } = svd3x3(H);
  let R = mat3Multiply(V, mat3Transpose(U));

  // Fix reflection: if det(R) < 0, negate the column of V with smallest singular value
  if (mat3Det(R) < 0) {
    // Negate last column of V (corresponds to smallest singular value after Jacobi)
    const Vfix: Mat3 = [...V] as Mat3;
    Vfix[0 * 3 + 2] *= -1;
    Vfix[1 * 3 + 2] *= -1;
    Vfix[2 * 3 + 2] *= -1;
    R = mat3Multiply(Vfix, mat3Transpose(U));
  }

  return R;
}

// ── Main class ───────────────────────────────────────────────────────

export class ObjectReplaceSystem {
  private glbRoot: THREE.Group | null = null;
  private _slots: ReplaceSlot[] = [];
  private _selectedSlot: ReplaceSlot | null = null;
  private hoveredSlot: ReplaceSlot | null = null;
  private hoverHelper: THREE.BoxHelper | null = null;
  private selectionHelper: THREE.BoxHelper | null = null;

  // Preview
  private previewModel: THREE.Object3D | null = null;
  private previewSlot: ReplaceSlot | null = null;

  // Raycasting
  private raycaster = new THREE.Raycaster();
  private mouseNDC = new THREE.Vector2();

  // Callbacks
  onSlotsLoaded: (() => void) | null = null;
  onSlotSelected: ((slot: ReplaceSlot | null) => void) | null = null;
  onSlotAssigned: ((slot: ReplaceSlot) => void) | null = null;

  constructor(
    private scene: THREE.Scene,
    private camera: THREE.PerspectiveCamera,
    private canvas: HTMLElement,
    private modelScale: number,
    private assetLoader: AssetLoader
  ) {
    this.canvas.addEventListener('click', this.onClick);
    this.canvas.addEventListener('mousemove', this.onMouseMove);
  }

  // ── GLB loading ────────────────────────────────────────────────────

  async loadObjectsGLB(file: File): Promise<void> {
    // Clean up previous load
    if (this.glbRoot) {
      this.scene.remove(this.glbRoot);
      this._slots = [];
      this._selectedSlot = null;
      this.hoveredSlot = null;
      this.clearHelpers();
    }

    const url = URL.createObjectURL(file);
    try {
      const loader = new GLTFLoader();
      const gltf = await loader.loadAsync(url);
      this.glbRoot = gltf.scene;
      this.glbRoot.scale.setScalar(this.modelScale);
      this.glbRoot.updateMatrixWorld(true);
      this.scene.add(this.glbRoot);

      // Enumerate all direct children as slots
      for (const child of [...this.glbRoot.children]) {
        const slot = this.createSlot(child);
        this._slots.push(slot);
      }

      console.log(`[ObjectReplace] Loaded ${this._slots.length} slots from GLB`);
      this.onSlotsLoaded?.();
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  private createSlot(obj: THREE.Object3D): ReplaceSlot {
    // Compute bounding box center as display position
    obj.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(obj);
    const center = box.getCenter(new THREE.Vector3());

    const slot: ReplaceSlot = {
      id: `slot_${nextSlotId++}`,
      name: obj.name || `object_${nextSlotId - 1}`,
      sourceObject: obj,
      worldPosition: center.clone(),
      worldRotationY: 0,
      worldScale: new THREE.Vector3(1, 1, 1),
      assignedType: null,
      assignedConfig: null,
      highlight: null,
    };

    return slot;
  }

  // ── Vertex collection (world-space positions + normals) ────────────

  private collectVerticesAndNormals(obj: THREE.Object3D): {
    positions: Float32Array;
    normals: Float32Array;
  } {
    const allPositions: number[] = [];
    const allNormals: number[] = [];
    const _pos = new THREE.Vector3();
    const _nrm = new THREE.Vector3();
    const _normalMatrix = new THREE.Matrix3();

    obj.updateWorldMatrix(true, true);

    obj.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const geo = child.geometry;
      const posAttr = geo.getAttribute('position');
      const nrmAttr = geo.getAttribute('normal');
      if (!posAttr) return;

      child.updateWorldMatrix(true, false);
      _normalMatrix.getNormalMatrix(child.matrixWorld);

      for (let i = 0; i < posAttr.count; i++) {
        // World-space position
        _pos.fromBufferAttribute(posAttr, i);
        _pos.applyMatrix4(child.matrixWorld);
        allPositions.push(_pos.x, _pos.y, _pos.z);

        // World-space normal
        if (nrmAttr) {
          _nrm.fromBufferAttribute(nrmAttr, i);
          _nrm.applyMatrix3(_normalMatrix).normalize();
          allNormals.push(_nrm.x, _nrm.y, _nrm.z);
        } else {
          allNormals.push(0, 1, 0);
        }
      }
    });

    return {
      positions: new Float32Array(allPositions),
      normals: new Float32Array(allNormals),
    };
  }

  // ── Procrustes / SVD alignment ─────────────────────────────────────

  /**
   * Compute the rigid transform (position, rotation, scale) that maps
   * a centered prototype to a world-space instance using SVD alignment.
   *
   * protoPos/protoNrm: prototype vertices centered at origin
   * instPos/instNrm: instance vertices in world space
   */
  private computeAlignmentTransform(
    protoPos: Float32Array,
    protoNrm: Float32Array,
    instPos: Float32Array,
    instNrm: Float32Array
  ): { position: { x: number; y: number; z: number }; rotationDeg: number; scale: number } {
    const n = protoPos.length / 3;
    if (n === 0 || instPos.length / 3 !== n) {
      console.warn('[ObjectReplace] Vertex count mismatch:', protoPos.length / 3, instPos.length / 3);
      return { position: { x: 0, y: 0, z: 0 }, rotationDeg: 0, scale: 1 };
    }

    // Compute instance centroid
    let cx = 0, cy = 0, cz = 0;
    for (let i = 0; i < n; i++) {
      cx += instPos[i * 3];
      cy += instPos[i * 3 + 1];
      cz += instPos[i * 3 + 2];
    }
    cx /= n; cy /= n; cz /= n;

    // Compute scale = RMS of instance / RMS of prototype (both centered)
    let rmsProto = 0, rmsInst = 0;
    for (let i = 0; i < n; i++) {
      const px = protoPos[i * 3], py = protoPos[i * 3 + 1], pz = protoPos[i * 3 + 2];
      rmsProto += px * px + py * py + pz * pz;
      const ix = instPos[i * 3] - cx, iy = instPos[i * 3 + 1] - cy, iz = instPos[i * 3 + 2] - cz;
      rmsInst += ix * ix + iy * iy + iz * iz;
    }
    rmsProto = Math.sqrt(rmsProto / n);
    rmsInst = Math.sqrt(rmsInst / n);
    const scale = rmsProto > 1e-10 ? rmsInst / rmsProto : 1;

    // Normal weight: 10% of mesh extent for symmetry-breaking
    const normalWeight = rmsProto > 1e-10 ? 0.1 * rmsProto : 0.1;

    // Build cross-covariance H (3x3) from centered+normalized positions + weighted normals
    const H: Mat3 = [0,0,0, 0,0,0, 0,0,0];
    const invScale = rmsProto > 1e-10 ? 1 / rmsProto : 1;
    const invScaleI = rmsInst > 1e-10 ? 1 / rmsInst : 1;

    for (let i = 0; i < n; i++) {
      // Normalized prototype position
      const px = protoPos[i * 3] * invScale;
      const py = protoPos[i * 3 + 1] * invScale;
      const pz = protoPos[i * 3 + 2] * invScale;
      // Normalized centered instance position
      const qx = (instPos[i * 3] - cx) * invScaleI;
      const qy = (instPos[i * 3 + 1] - cy) * invScaleI;
      const qz = (instPos[i * 3 + 2] - cz) * invScaleI;

      // Position contribution
      H[0] += px * qx; H[1] += px * qy; H[2] += px * qz;
      H[3] += py * qx; H[4] += py * qy; H[5] += py * qz;
      H[6] += pz * qx; H[7] += pz * qy; H[8] += pz * qz;

      // Normal contribution (weighted)
      const nw = normalWeight * invScale;
      const pnx = protoNrm[i * 3] * nw;
      const pny = protoNrm[i * 3 + 1] * nw;
      const pnz = protoNrm[i * 3 + 2] * nw;
      const qnx = instNrm[i * 3] * nw;
      const qny = instNrm[i * 3 + 1] * nw;
      const qnz = instNrm[i * 3 + 2] * nw;

      H[0] += pnx * qnx; H[1] += pnx * qny; H[2] += pnx * qnz;
      H[3] += pny * qnx; H[4] += pny * qny; H[5] += pny * qnz;
      H[6] += pnz * qnx; H[7] += pnz * qny; H[8] += pnz * qnz;
    }

    // SVD → optimal rotation
    const R = computeOptimalRotation(H);

    // Extract Y-axis rotation from rotation matrix
    // R is row-major: R[row*3+col]
    // For Y-rotation: atan2(R[0][2], R[0][0]) = atan2(R[2], R[0])
    const rotationRad = Math.atan2(R[2], R[0]);
    const rotationDeg = parseFloat((rotationRad * 180 / Math.PI).toFixed(2));

    return {
      position: {
        x: parseFloat(cx.toFixed(4)),
        y: parseFloat(cy.toFixed(4)),
        z: parseFloat(cz.toFixed(4)),
      },
      rotationDeg,
      scale: parseFloat(scale.toFixed(6)),
    };
  }

  // ── Raycasting & selection ─────────────────────────────────────────

  private onClick = (e: MouseEvent): void => {
    if (!this.glbRoot || e.button !== 0) return;

    // Ignore clicks on the UI panel (left 280px)
    if (e.clientX < 280) return;

    this.updateMouseNDC(e);
    this.raycaster.setFromCamera(this.mouseNDC, this.camera);

    // Collect all meshes from the loaded GLB
    const meshes: THREE.Mesh[] = [];
    this.glbRoot.traverse((child) => {
      if (child instanceof THREE.Mesh) meshes.push(child);
    });

    const hits = this.raycaster.intersectObjects(meshes, false);
    if (hits.length > 0) {
      const slot = this.findSlotForMesh(hits[0].object);
      if (slot) {
        this.selectSlot(slot);
        return;
      }
    }

    // Clicked empty space - deselect
    this.selectSlot(null);
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.glbRoot) return;
    if (e.clientX < 280) {
      this.setHover(null);
      return;
    }

    this.updateMouseNDC(e);
    this.raycaster.setFromCamera(this.mouseNDC, this.camera);

    const meshes: THREE.Mesh[] = [];
    this.glbRoot.traverse((child) => {
      if (child instanceof THREE.Mesh) meshes.push(child);
    });

    const hits = this.raycaster.intersectObjects(meshes, false);
    if (hits.length > 0) {
      const slot = this.findSlotForMesh(hits[0].object);
      this.setHover(slot);
    } else {
      this.setHover(null);
    }
  };

  private updateMouseNDC(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private findSlotForMesh(mesh: THREE.Object3D): ReplaceSlot | null {
    let current: THREE.Object3D | null = mesh;
    while (current && current.parent !== this.glbRoot) {
      current = current.parent;
    }
    if (!current) return null;
    return this._slots.find((s) => s.sourceObject === current) ?? null;
  }

  selectSlot(slot: ReplaceSlot | null): void {
    this._selectedSlot = slot;

    // Update selection helper
    if (this.selectionHelper) {
      this.scene.remove(this.selectionHelper);
      this.selectionHelper.dispose();
      this.selectionHelper = null;
    }

    if (slot) {
      this.selectionHelper = new THREE.BoxHelper(slot.sourceObject, COLOR_SELECTED);
      this.scene.add(this.selectionHelper);
    }

    this.onSlotSelected?.(slot);
  }

  private setHover(slot: ReplaceSlot | null): void {
    if (slot === this.hoveredSlot) return;
    this.hoveredSlot = slot;

    if (this.hoverHelper) {
      this.scene.remove(this.hoverHelper);
      this.hoverHelper.dispose();
      this.hoverHelper = null;
    }

    if (slot && slot !== this._selectedSlot) {
      this.hoverHelper = new THREE.BoxHelper(slot.sourceObject, COLOR_HOVER);
      this.scene.add(this.hoverHelper);
    }
  }

  private clearHelpers(): void {
    if (this.hoverHelper) {
      this.scene.remove(this.hoverHelper);
      this.hoverHelper.dispose();
      this.hoverHelper = null;
    }
    if (this.selectionHelper) {
      this.scene.remove(this.selectionHelper);
      this.selectionHelper.dispose();
      this.selectionHelper = null;
    }
  }

  // ── Assignment ─────────────────────────────────────────────────────

  async assignType(slot: ReplaceSlot, definition: PlaceableDefinition): Promise<void> {
    // Load the prototype model to get its vertices
    const modelUrl = definition.defaultConfig.modelUrl as string;
    let protoPos: Float32Array;
    let protoNrm: Float32Array;

    if (modelUrl) {
      try {
        const protoGroup = (await this.assetLoader.loadGLTF(modelUrl)).clone();
        // Apply the model scale that would be used at runtime
        protoGroup.scale.setScalar(this.modelScale);
        protoGroup.updateMatrixWorld(true);

        const protoData = this.collectVerticesAndNormals(protoGroup);
        protoPos = protoData.positions;
        protoNrm = protoData.normals;

        // Center prototype at origin
        const n = protoPos.length / 3;
        let pcx = 0, pcy = 0, pcz = 0;
        for (let i = 0; i < n; i++) {
          pcx += protoPos[i * 3];
          pcy += protoPos[i * 3 + 1];
          pcz += protoPos[i * 3 + 2];
        }
        pcx /= n; pcy /= n; pcz /= n;
        for (let i = 0; i < n; i++) {
          protoPos[i * 3] -= pcx;
          protoPos[i * 3 + 1] -= pcy;
          protoPos[i * 3 + 2] -= pcz;
        }
      } catch (err) {
        console.warn('[ObjectReplace] Failed to load prototype model, falling back to bbox:', err);
        protoPos = new Float32Array(0);
        protoNrm = new Float32Array(0);
      }
    } else {
      protoPos = new Float32Array(0);
      protoNrm = new Float32Array(0);
    }

    // Collect instance vertices
    const instData = this.collectVerticesAndNormals(slot.sourceObject);

    // Compute alignment
    let position: { x: number; y: number; z: number };
    let rotationDeg: number;
    let scale: number;

    if (protoPos.length > 0 && protoPos.length === instData.positions.length) {
      // SVD alignment
      const align = this.computeAlignmentTransform(
        protoPos, protoNrm, instData.positions, instData.normals
      );
      position = align.position;
      rotationDeg = align.rotationDeg;
      scale = align.scale;
      console.log(`[ObjectReplace] SVD alignment for "${slot.name}": pos=(${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)}), rot=${rotationDeg.toFixed(1)}°, scale=${scale.toFixed(4)}`);
    } else {
      // Fallback: bounding box center, no rotation
      console.warn(`[ObjectReplace] Vertex count mismatch (proto=${protoPos.length / 3}, inst=${instData.positions.length / 3}), using bbox fallback`);
      const box = new THREE.Box3().setFromObject(slot.sourceObject);
      const center = box.getCenter(new THREE.Vector3());
      position = { x: parseFloat(center.x.toFixed(4)), y: parseFloat(center.y.toFixed(4)), z: parseFloat(center.z.toFixed(4)) };
      rotationDeg = 0;
      scale = 1;
    }

    // Update slot display fields
    slot.worldPosition.set(position.x, position.y, position.z);
    slot.worldRotationY = rotationDeg;

    slot.assignedType = definition.type;
    slot.assignedConfig = {
      ...definition.defaultConfig,
      position,
      rotation: rotationDeg,
      modelScale: this.modelScale * scale,
    };

    this.onSlotAssigned?.(slot);
  }

  unassignSlot(slot: ReplaceSlot): void {
    slot.assignedType = null;
    slot.assignedConfig = null;
  }

  updateProperty(slot: ReplaceSlot, key: string, value: unknown): void {
    if (slot.assignedConfig) {
      slot.assignedConfig[key] = value;
    }
  }

  // ── Serialization ──────────────────────────────────────────────────

  getAssignedObjects(): PlacedObjectData[] {
    return this._slots
      .filter((s) => s.assignedType && s.assignedConfig)
      .map((s) => ({
        id: s.id,
        type: s.assignedType!,
        config: { ...s.assignedConfig! },
      }));
  }

  /** Export assignment mapping for save/load assignments */
  getAssignmentMapping(): Record<string, { type: string; configOverrides: Record<string, unknown> }> {
    const mapping: Record<string, { type: string; configOverrides: Record<string, unknown> }> = {};
    for (const slot of this._slots) {
      if (slot.assignedType && slot.assignedConfig) {
        // Save only non-transform overrides (user-changed properties)
        const def = getAllDefinitions().find((d) => d.type === slot.assignedType);
        const overrides: Record<string, unknown> = {};
        if (def) {
          for (const prop of def.properties) {
            if (slot.assignedConfig[prop.key] !== def.defaultConfig[prop.key]) {
              overrides[prop.key] = slot.assignedConfig[prop.key];
            }
          }
        }
        mapping[slot.name] = { type: slot.assignedType, configOverrides: overrides };
      }
    }
    return mapping;
  }

  /** Apply a previously saved assignment mapping */
  async applyAssignmentMapping(
    mapping: Record<string, { type: string; configOverrides: Record<string, unknown> }>,
    getDefinition: (type: string) => PlaceableDefinition | undefined
  ): Promise<number> {
    let applied = 0;
    for (const slot of this._slots) {
      const entry = mapping[slot.name];
      if (!entry) continue;
      const def = getDefinition(entry.type);
      if (!def) continue;
      await this.assignType(slot, def);
      // Apply overrides
      for (const [key, val] of Object.entries(entry.configOverrides)) {
        this.updateProperty(slot, key, val);
      }
      applied++;
    }
    return applied;
  }

  // ── Preview real model ──────────────────────────────────────────────

  async showPreview(slot: ReplaceSlot): Promise<void> {
    this.hidePreview();

    if (!slot.assignedConfig) return;
    const modelUrl = slot.assignedConfig.modelUrl as string;
    if (!modelUrl) return;

    const group = (await this.assetLoader.loadGLTF(modelUrl)).clone();

    // Apply model scale from SVD-computed config
    const mScale = (slot.assignedConfig.modelScale as number) ?? this.modelScale;
    group.scale.setScalar(mScale);

    // Semi-transparent material
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mat = (child.material as THREE.Material).clone();
        mat.transparent = true;
        mat.opacity = 0.5;
        mat.depthWrite = false;
        child.material = mat;
      }
    });

    // Position and rotation from config (centroid position, no auto-raise needed)
    const pos = slot.assignedConfig.position as { x: number; y: number; z: number };
    const rotDeg = slot.assignedConfig.rotation as number;
    group.position.set(pos.x, pos.y, pos.z);
    group.rotation.y = rotDeg * Math.PI / 180;

    // Hide the source GLB mesh so only the preview is visible
    slot.sourceObject.visible = false;

    this.scene.add(group);
    this.previewModel = group;
    this.previewSlot = slot;
  }

  hidePreview(): void {
    if (this.previewModel) {
      // Restore visibility of the source GLB mesh
      if (this.previewSlot) {
        this.previewSlot.sourceObject.visible = true;
      }
      this.scene.remove(this.previewModel);
      this.previewModel.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach((m) => m.dispose());
        }
      });
      this.previewModel = null;
      this.previewSlot = null;
    }
  }

  get isPreviewVisible(): boolean {
    return this.previewModel !== null;
  }

  get previewingSlot(): ReplaceSlot | null {
    return this.previewSlot;
  }

  // ── Extract GLB ────────────────────────────────────────────────────

  async extractSlotGLB(slot: ReplaceSlot): Promise<void> {
    // Clone the slot's object — clone has no parent, so no glbRoot scale
    const clone = slot.sourceObject.clone(true);
    clone.updateMatrixWorld(true);

    // Step 1: Bake each child mesh's local-hierarchy transform into geometry
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry = child.geometry.clone();
        child.geometry.applyMatrix4(child.matrixWorld);
        child.position.set(0, 0, 0);
        child.rotation.set(0, 0, 0);
        child.scale.set(1, 1, 1);
      }
    });

    // Step 2: Compute centroid from baked geometry (all in same local space)
    let cx = 0, cy = 0, cz = 0, count = 0;
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const posAttr = child.geometry.getAttribute('position');
        for (let i = 0; i < posAttr.count; i++) {
          cx += posAttr.getX(i);
          cy += posAttr.getY(i);
          cz += posAttr.getZ(i);
          count++;
        }
      }
    });
    if (count > 0) { cx /= count; cy /= count; cz /= count; }

    // Step 3: Translate to center at origin
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.translate(-cx, -cy, -cz);
      }
    });

    // Step 4: Reset clone transform
    clone.position.set(0, 0, 0);
    clone.rotation.set(0, 0, 0);
    clone.scale.set(1, 1, 1);

    // Export as GLB
    const exporter = new GLTFExporter();
    const result = await exporter.parseAsync(clone, { binary: true });

    // Download
    const blob = new Blob([result as ArrayBuffer], { type: 'model/gltf-binary' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slot.name || 'extracted'}.glb`;
    a.click();
    URL.revokeObjectURL(url);

    console.log(`[ObjectReplace] Extracted GLB for slot "${slot.name}" (centroid: ${cx.toFixed(2)}, ${cy.toFixed(2)}, ${cz.toFixed(2)})`);
  }

  // ── Accessors ──────────────────────────────────────────────────────

  get slots(): ReplaceSlot[] { return this._slots; }
  get selectedSlot(): ReplaceSlot | null { return this._selectedSlot; }
  get assignedCount(): number { return this._slots.filter((s) => s.assignedType).length; }
  get totalCount(): number { return this._slots.length; }

  // ── Update (called each frame) ─────────────────────────────────────

  update(): void {
    if (this.hoverHelper) this.hoverHelper.update();
    if (this.selectionHelper) this.selectionHelper.update();
  }

  // ── Cleanup ────────────────────────────────────────────────────────

  dispose(): void {
    this.canvas.removeEventListener('click', this.onClick);
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    this.clearHelpers();
    this.hidePreview();
    if (this.glbRoot) {
      this.scene.remove(this.glbRoot);
    }
  }
}
