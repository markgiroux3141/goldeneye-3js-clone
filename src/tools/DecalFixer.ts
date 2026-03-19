import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

const MAX_DECAL_VERTICES = 12;
const FLATNESS_RATIO = 0.15;
const MAX_DECAL_SIZE = 64.1; // largest bounding-box axis in model space

/** Tunable detection parameters (editor sliders override these defaults). */
export interface DecalDetectParams {
  maxVertices: number;
  flatnessRatio: number;
  maxSize: number;
}

export const DEFAULT_DECAL_PARAMS: DecalDetectParams = {
  maxVertices: MAX_DECAL_VERTICES,
  flatnessRatio: FLATNESS_RATIO,
  maxSize: MAX_DECAL_SIZE,
};

/** Decal override data loaded from per-level JSON. */
export interface DecalOverrides {
  include: Set<string>;
  exclude: Set<string>;
}

/**
 * Compute the average surface normal for a mesh (for nudging decals off walls).
 * Works on any mesh regardless of vertex count or flatness.
 */
export function computeDecalNormal(mesh: THREE.Mesh): THREE.Vector3 {
  const geom = mesh.geometry;
  const normal = new THREE.Vector3();
  if (!geom) return normal.set(0, 1, 0);

  geom.computeBoundingBox();
  const size = new THREE.Vector3();
  geom.boundingBox!.getSize(size);

  const normalAttr = geom.getAttribute('normal') as THREE.BufferAttribute | null;
  if (normalAttr) {
    for (let i = 0; i < normalAttr.count; i++) {
      normal.x += normalAttr.getX(i);
      normal.y += normalAttr.getY(i);
      normal.z += normalAttr.getZ(i);
    }
    normal.divideScalar(normalAttr.count);
    if (normal.length() > 0.001) {
      normal.normalize();
      return normal;
    }
  }
  // Fallback: use thin axis direction
  if (size.x <= size.y && size.x <= size.z) normal.set(1, 0, 0);
  else if (size.y <= size.x && size.y <= size.z) normal.set(0, 1, 0);
  else normal.set(0, 0, 1);
  return normal;
}

/**
 * Detect whether a mesh is likely a decal/overlay (flat, low-vertex surface
 * sitting on a wall). Returns the surface normal for nudging, or null.
 */
export function detectDecalMesh(
  mesh: THREE.Mesh,
  params: DecalDetectParams = DEFAULT_DECAL_PARAMS
): { normal: THREE.Vector3 } | null {
  const geom = mesh.geometry;
  if (!geom) return null;
  const posAttr = geom.getAttribute('position') as THREE.BufferAttribute;
  if (!posAttr || posAttr.count > params.maxVertices) return null;

  geom.computeBoundingBox();
  const size = new THREE.Vector3();
  geom.boundingBox!.getSize(size);

  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim < 0.001 || maxDim > params.maxSize) return null;

  const minDim = Math.min(size.x, size.y, size.z);
  if (minDim / maxDim >= params.flatnessRatio) return null;

  return { normal: computeDecalNormal(mesh) };
}

interface MeshStats {
  mesh: THREE.Mesh;
  name: string;
  vertexCount: number;
  size: THREE.Vector3;
  thinAxis: 'x' | 'y' | 'z';
  thinSize: number;
  maxDim: number;
  flatnessRatio: number;
  normal: THREE.Vector3;
  isDecal: boolean;
}

export class DecalFixer {
  /**
   * Scan a GLB and log stats for ALL meshes so we can tune heuristics.
   * Also highlights detected decals in the live scene with colored wireframes.
   */
  async scan(glbPath: string, liveScene?: THREE.Scene, nudgeOffset?: number): Promise<void> {
    console.log(`[DecalFixer] Scanning ${glbPath}...`);

    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(glbPath);
    const scene = gltf.scene;

    const allStats = this.analyzeAllMeshes(scene);

    // Sort: decals first, then by vertex count
    allStats.sort((a, b) => {
      if (a.isDecal !== b.isDecal) return a.isDecal ? -1 : 1;
      return a.vertexCount - b.vertexCount;
    });

    const decals = allStats.filter((s) => s.isDecal);
    const nonDecals = allStats.filter((s) => !s.isDecal);

    console.log(`\n[DecalFixer] === DETECTED DECALS (${decals.length}) ===`);
    for (const s of decals) {
      console.log(
        `  ✓ "${s.name}" | ${s.vertexCount} verts | size: (${s.size.x.toFixed(1)}, ${s.size.y.toFixed(1)}, ${s.size.z.toFixed(1)}) | thin: ${s.thinAxis}=${s.thinSize.toFixed(3)} | ratio: ${s.flatnessRatio.toFixed(3)}`
      );
    }

    console.log(`\n[DecalFixer] === NON-DECALS (${nonDecals.length}) ===`);
    for (const s of nonDecals) {
      const reason =
        s.vertexCount > MAX_DECAL_VERTICES
          ? `too many verts (${s.vertexCount})`
          : `not flat enough (ratio: ${s.flatnessRatio.toFixed(3)})`;
      console.log(
        `  ✗ "${s.name}" | ${s.vertexCount} verts | size: (${s.size.x.toFixed(1)}, ${s.size.y.toFixed(1)}, ${s.size.z.toFixed(1)}) | ${reason}`
      );
    }

    console.log(`\n[DecalFixer] Total: ${allStats.length} meshes, ${decals.length} decals detected`);
    console.log(`[DecalFixer] Heuristics: maxVerts=${MAX_DECAL_VERTICES}, flatnessRatio=${FLATNESS_RATIO}`);

    // If a live scene was provided, highlight decals and optionally nudge them
    if (liveScene && decals.length > 0) {
      this.highlightDecalsInScene(liveScene, decals);
      if (nudgeOffset !== undefined) {
        this.nudgeDecalsInScene(liveScene, decals, nudgeOffset);
      }
    }
  }

  /**
   * Fix decals and export a new GLB.
   */
  async run(glbPath: string, offset = 0.5): Promise<void> {
    console.log(`[DecalFixer] Loading ${glbPath}...`);

    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(glbPath);
    const scene = gltf.scene;

    const allStats = this.analyzeAllMeshes(scene);
    const decals = allStats.filter((s) => s.isDecal);
    console.log(`[DecalFixer] Found ${decals.length} decal meshes to fix.`);

    for (const info of decals) {
      console.log(
        `  Nudging "${info.name}" along ${info.thinAxis} by ${offset}`
      );
      this.nudgeDecal(info, offset);
    }

    const filename = glbPath.replace(/\.glb$/, '-fixed.glb').replace(/^.*\//, '');
    await this.exportGLB(scene, filename);
    console.log(`[DecalFixer] Done! Downloaded ${filename}`);
  }

  private analyzeAllMeshes(scene: THREE.Group): MeshStats[] {
    const results: MeshStats[] = [];

    scene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const mesh = obj as THREE.Mesh;
      const geom = mesh.geometry;
      if (!geom) return;

      const posAttr = geom.getAttribute('position') as THREE.BufferAttribute;
      if (!posAttr) return;

      const vertexCount = posAttr.count;

      // Compute local bounding box
      geom.computeBoundingBox();
      const box = geom.boundingBox!;
      const size = new THREE.Vector3();
      box.getSize(size);

      const maxDim = Math.max(size.x, size.y, size.z);
      if (maxDim < 0.001) return; // degenerate

      // Find the thinnest axis
      let thinAxis: 'x' | 'y' | 'z';
      let thinSize: number;

      if (size.x <= size.y && size.x <= size.z) {
        thinAxis = 'x';
        thinSize = size.x;
      } else if (size.y <= size.x && size.y <= size.z) {
        thinAxis = 'y';
        thinSize = size.y;
      } else {
        thinAxis = 'z';
        thinSize = size.z;
      }

      const flatnessRatio = thinSize / maxDim;

      // Compute average normal
      const normal = new THREE.Vector3();
      const normalAttr = geom.getAttribute('normal') as THREE.BufferAttribute | null;

      if (normalAttr) {
        for (let i = 0; i < normalAttr.count; i++) {
          normal.x += normalAttr.getX(i);
          normal.y += normalAttr.getY(i);
          normal.z += normalAttr.getZ(i);
        }
        normal.divideScalar(normalAttr.count);
        if (normal.length() > 0.001) {
          normal.normalize();
        } else {
          normal.set(
            thinAxis === 'x' ? 1 : 0,
            thinAxis === 'y' ? 1 : 0,
            thinAxis === 'z' ? 1 : 0
          );
        }
      } else {
        normal.set(
          thinAxis === 'x' ? 1 : 0,
          thinAxis === 'y' ? 1 : 0,
          thinAxis === 'z' ? 1 : 0
        );
      }

      const isDecal =
        vertexCount <= MAX_DECAL_VERTICES && flatnessRatio < FLATNESS_RATIO;

      results.push({
        mesh,
        name: mesh.name || `(unnamed @ ${mesh.uuid.slice(0, 8)})`,
        vertexCount,
        size,
        thinAxis,
        thinSize,
        maxDim,
        flatnessRatio,
        normal,
        isDecal,
      });
    });

    return results;
  }

  /**
   * Find matching meshes in the live scene by name and add colored wireframe overlays.
   */
  private highlightDecalsInScene(
    liveScene: THREE.Scene,
    decals: MeshStats[]
  ): void {
    const decalNames = new Set(decals.map((d) => d.name));
    let highlighted = 0;

    liveScene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      if (!decalNames.has(obj.name)) return;

      // Add a bright wireframe overlay
      const wireGeo = obj.geometry.clone();
      const wireMat = new THREE.MeshBasicMaterial({
        color: 0xff00ff,
        wireframe: true,
        depthTest: false,
        transparent: true,
        opacity: 0.8,
      });
      const wireMesh = new THREE.Mesh(wireGeo, wireMat);
      wireMesh.renderOrder = 999;
      wireMesh.name = '__decalDebug';
      obj.add(wireMesh);
      highlighted++;
    });

    console.log(
      `[DecalFixer] Highlighted ${highlighted} decals in live scene (magenta wireframe). Run __clearDebug() to remove.`
    );
  }

  /**
   * Remove debug overlays from a scene.
   */
  static clearDebug(scene: THREE.Scene): void {
    const toRemove: THREE.Object3D[] = [];
    scene.traverse((obj) => {
      if (obj.name === '__decalDebug') toRemove.push(obj);
    });
    for (const obj of toRemove) {
      obj.parent?.remove(obj);
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        (obj.material as THREE.Material).dispose();
      }
    }
    console.log(`[DecalFixer] Removed ${toRemove.length} debug overlays.`);
  }

  private nudgeDecalsInScene(
    liveScene: THREE.Scene,
    decals: MeshStats[],
    offset: number
  ): void {
    const decalNames = new Set(decals.map((d) => d.name));
    const decalMap = new Map(decals.map((d) => [d.name, d]));
    let nudged = 0;

    liveScene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      if (!decalNames.has(obj.name)) return;
      const info = decalMap.get(obj.name);
      if (!info) return;
      obj.position.addScaledVector(info.normal, offset);
      nudged++;
    });

    console.log(`[DecalFixer] Nudged ${nudged} decals in live scene by ${offset}. Try different values until z-fighting is gone.`);
  }

  private nudgeDecal(info: MeshStats, offset: number): void {
    info.mesh.position.addScaledVector(info.normal, offset);
  }

  private async exportGLB(
    scene: THREE.Group,
    filename: string
  ): Promise<void> {
    const exporter = new GLTFExporter();
    const result = await exporter.parseAsync(scene, {
      binary: true,
    });

    const blob = new Blob([result as ArrayBuffer], {
      type: 'application/octet-stream',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }
}
