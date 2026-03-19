import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { Engine } from '../core/Engine';
import { AssetLoader } from '../core/AssetLoader';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { ColliderFactory } from '../physics/ColliderFactory';
import { detectDecalMesh, computeDecalNormal } from '../tools/DecalFixer';
import type { DecalOverrides } from '../tools/DecalFixer';
import type { StarterRoomMaterials } from './StarterRoomMaterials';

function isSecondary(obj: THREE.Object3D): boolean {
  let current: THREE.Object3D | null = obj;
  while (current) {
    if (current.name.toLowerCase().startsWith('secondary')) return true;
    current = current.parent;
  }
  return false;
}

export class LevelLoader {
  constructor(
    private engine: Engine,
    private physicsWorld: PhysicsWorld,
    private colliderFactory: ColliderFactory,
    private assetLoader: AssetLoader
  ) {}

  async loadLevel(url: string, scale = 1, decalOverrides?: DecalOverrides): Promise<THREE.Group> {
    const group = await this.assetLoader.loadGLTF(url);
    if (scale !== 1) {
      group.scale.setScalar(scale);
    }
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Smooth shading (N64-style Gouraud)
        child.geometry = mergeVertices(child.geometry, 1e-3);
        child.geometry.computeVertexNormals();
        child.castShadow = true;
        child.receiveShadow = true;
        const secondary = isSecondary(child);
        const meshName = child.name;
        const isExcluded = decalOverrides?.exclude.has(meshName) ?? false;
        const isForceIncluded = decalOverrides?.include.has(meshName) ?? false;

        let decalInfo: { normal: THREE.Vector3 } | null = null;
        if (!secondary) {
          if (isForceIncluded) {
            decalInfo = { normal: computeDecalNormal(child) };
          } else if (!isExcluded) {
            decalInfo = detectDecalMesh(child);
          }
        }
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        for (const mat of materials) {
          // Strip PBR properties for N64-authentic flat diffuse look
          if (mat instanceof THREE.MeshStandardMaterial) {
            mat.roughness = 1.0;
            mat.metalness = 0.0;
            mat.normalMap = null;
            mat.roughnessMap = null;
            mat.metalnessMap = null;
            mat.aoMap = null;
            mat.needsUpdate = true;
          }
          if (mat.map?.image || mat.alphaMap) {
            mat.alphaTest = 0.5;
            mat.transparent = true;
            mat.depthWrite = true;
          }
          if (secondary || decalInfo) {
            child.renderOrder = 1;
            mat.depthFunc = THREE.LessEqualDepth;
            mat.polygonOffset = true;
            mat.polygonOffsetFactor = -4;
            mat.polygonOffsetUnits = -4;
          }
        }
        // Geometric nudge: offset decal mesh along its surface normal
        // to create real depth separation (invisible at typical model scales).
        // Transform normal from geometry-local space to parent space via the
        // mesh's own quaternion so the nudge direction is correct regardless
        // of whether rotation is baked into vertices or on the object.
        if (decalInfo) {
          const parentNormal = decalInfo.normal.clone().applyQuaternion(child.quaternion);
          child.position.addScaledVector(parentNormal, 0.1);
          console.log(`[Decal] "${child.name}" nudged along normal`);
        }
      }
    });
    this.engine.scene.add(group);
    this.colliderFactory.createTrimeshesFromScene(group);
    return group;
  }

  private addBox(
    group: THREE.Group,
    material: THREE.Material,
    width: number,
    height: number,
    depth: number,
    x: number,
    y: number,
    z: number,
    rotation?: { x: number; y: number; z: number }
  ): THREE.Mesh {
    const geom = new THREE.BoxGeometry(width, height, depth);

    // Scale UVs by world dimensions so textures tile at consistent density.
    // BoxGeometry face order: +X, -X, +Y, -Y, +Z, -Z (4 verts each)
    const uv = geom.getAttribute('uv') as THREE.BufferAttribute;
    const arr = uv.array as Float32Array;
    for (let i = 0; i < 48; i += 2) {
      const face = Math.floor(i / 8);
      if (face < 2) {        // ±X faces: U=depth, V=height
        arr[i] *= depth;
        arr[i + 1] *= height;
      } else if (face < 4) { // ±Y faces: U=width, V=depth
        arr[i] *= width;
        arr[i + 1] *= depth;
      } else {               // ±Z faces: U=width, V=height
        arr[i] *= width;
        arr[i + 1] *= height;
      }
    }
    uv.needsUpdate = true;

    const mesh = new THREE.Mesh(geom, material);
    mesh.position.set(x, y, z);
    if (rotation) {
      mesh.rotation.set(rotation.x, rotation.y, rotation.z);
    }
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    this.colliderFactory.createCuboidFromBox(
      { x: width / 2, y: height / 2, z: depth / 2 },
      { x, y, z },
      rotation
    );
    return mesh;
  }

  private addFloor(
    group: THREE.Group,
    material: THREE.Material,
    width: number,
    depth: number,
    x: number,
    z: number
  ): void {
    const mesh = this.addBox(group, material, width, 0.5, depth, x, -0.25, z);
    mesh.castShadow = false;
  }

  private addCeiling(
    group: THREE.Group,
    material: THREE.Material,
    width: number,
    depth: number,
    x: number,
    z: number,
    ceilingHeight: number
  ): void {
    const mesh = this.addBox(group, material, width, 0.5, depth, x, ceilingHeight + 0.25, z);
    mesh.castShadow = false;
  }

  private addWallX(
    group: THREE.Group,
    material: THREE.Material,
    width: number,
    wallHeight: number,
    x: number,
    z: number
  ): void {
    this.addBox(group, material, width, wallHeight, 0.5, x, wallHeight / 2, z);
  }

  private addWallZ(
    group: THREE.Group,
    material: THREE.Material,
    depth: number,
    wallHeight: number,
    x: number,
    z: number
  ): void {
    this.addBox(group, material, 0.5, wallHeight, depth, x, wallHeight / 2, z);
  }

  private addWallXWithDoorway(
    group: THREE.Group,
    wallMat: THREE.Material,
    frameMat: THREE.Material,
    totalWidth: number,
    wallHeight: number,
    wallX: number,
    wallZ: number,
    doorCenterX: number,
    doorWidth: number,
    doorHeight: number
  ): void {
    const wallLeft = wallX - totalWidth / 2;
    const doorLeft = doorCenterX - doorWidth / 2;
    const doorRight = doorCenterX + doorWidth / 2;
    const wallRight = wallX + totalWidth / 2;

    // Left wall segment (full height)
    const leftWidth = doorLeft - wallLeft;
    if (leftWidth > 0.01) {
      this.addBox(group, wallMat, leftWidth, wallHeight, 0.5, wallLeft + leftWidth / 2, wallHeight / 2, wallZ);
    }
    // Right wall segment (full height)
    const rightWidth = wallRight - doorRight;
    if (rightWidth > 0.01) {
      this.addBox(group, wallMat, rightWidth, wallHeight, 0.5, doorRight + rightWidth / 2, wallHeight / 2, wallZ);
    }
    // Wall segment above door
    const aboveHeight = wallHeight - doorHeight;
    if (aboveHeight > 0.01) {
      this.addBox(group, wallMat, doorWidth, aboveHeight, 0.5, doorCenterX, doorHeight + aboveHeight / 2, wallZ);
    }
    // Door frame inset 0.02m from wall edges to avoid coplanar z-fighting
    this.addBox(group, frameMat, 0.2, doorHeight, 0.6, doorLeft - 0.08, doorHeight / 2, wallZ);
    this.addBox(group, frameMat, 0.2, doorHeight, 0.6, doorRight + 0.08, doorHeight / 2, wallZ);
    this.addBox(group, frameMat, doorWidth + 0.36, 0.2, 0.6, doorCenterX, doorHeight + 0.08, wallZ);
  }

  private addWallZWithDoorway(
    group: THREE.Group,
    wallMat: THREE.Material,
    frameMat: THREE.Material,
    totalDepth: number,
    wallHeight: number,
    wallX: number,
    wallZ: number,
    doorCenterZ: number,
    doorWidth: number,
    doorHeight: number
  ): void {
    const wallTop = wallZ - totalDepth / 2;
    const doorTop = doorCenterZ - doorWidth / 2;
    const doorBottom = doorCenterZ + doorWidth / 2;
    const wallBottom = wallZ + totalDepth / 2;

    // Top (north) segment
    const topDepth = doorTop - wallTop;
    if (topDepth > 0.01) {
      this.addBox(group, wallMat, 0.5, wallHeight, topDepth, wallX, wallHeight / 2, wallTop + topDepth / 2);
    }
    // Bottom (south) segment
    const bottomDepth = wallBottom - doorBottom;
    if (bottomDepth > 0.01) {
      this.addBox(group, wallMat, 0.5, wallHeight, bottomDepth, wallX, wallHeight / 2, doorBottom + bottomDepth / 2);
    }
    // Above door
    const aboveHeight = wallHeight - doorHeight;
    if (aboveHeight > 0.01) {
      this.addBox(group, wallMat, 0.5, aboveHeight, doorWidth, wallX, doorHeight + aboveHeight / 2, doorCenterZ);
    }
    // Door frame inset 0.02m from wall edges to avoid coplanar z-fighting
    this.addBox(group, frameMat, 0.6, doorHeight, 0.2, wallX, doorHeight / 2, doorTop - 0.08);
    this.addBox(group, frameMat, 0.6, doorHeight, 0.2, wallX, doorHeight / 2, doorBottom + 0.08);
    this.addBox(group, frameMat, 0.6, 0.2, doorWidth + 0.36, wallX, doorHeight + 0.08, doorCenterZ);
  }

  createLevel(materials: StarterRoomMaterials): void {
    const g = new THREE.Group();
    const wallMat = materials.wall;
    const floorMat = materials.floor;
    const metalMat = materials.ramp;
    const woodMat = materials.stair;
    const doorW = 2;
    const doorH = 2.5;

    // ── Room 1: Main Hall (20×20, ceiling 6m) ──
    // Bounds: X[-10..10], Z[-10..10]
    this.addFloor(g, floorMat, 20, 20, 0, 0);
    this.addCeiling(g, floorMat, 20, 20, 0, 0, 6);
    // North wall (Z=-10) — full
    this.addWallX(g, wallMat, 20, 6, 0, -9.75);
    // East wall (X=10) — full
    this.addWallZ(g, wallMat, 20, 6, 9.75, 0);
    // West wall (X=-10) — full
    this.addWallZ(g, wallMat, 20, 6, -9.75, 0);
    // South wall (Z=10) — doorway at X=0
    this.addWallXWithDoorway(g, wallMat, metalMat, 20, 6, 0, 9.75, 0, doorW, doorH);
    // Features: 3 crates near north wall
    this.addBox(g, woodMat, 1, 1, 1, 5, 0.5, -7);
    this.addBox(g, woodMat, 1, 1, 1, 6.2, 0.5, -7);
    this.addBox(g, woodMat, 1, 1, 1, 5.6, 1.5, -7); // stacked
    // Raised platform NW corner
    this.addBox(g, metalMat, 4, 0.5, 4, -7, 0.25, -7);

    // ── Room 2: Corridor (4×12, ceiling 3.5m) ──
    // Bounds: X[-2..2], Z[10..22]
    this.addFloor(g, floorMat, 4, 12, 0, 16);
    this.addCeiling(g, floorMat, 4, 12, 0, 16, 3.5);
    // East wall (X=2)
    this.addWallZ(g, wallMat, 12, 3.5, 1.75, 16);
    // West wall (X=-2)
    this.addWallZ(g, wallMat, 12, 3.5, -1.75, 16);
    // South end (Z=22) — doorway at X=0
    this.addWallXWithDoorway(g, wallMat, metalMat, 4, 3.5, 0, 21.75, 0, doorW, doorH);

    // ── Room 3: Storage Hall (16×16, ceiling 4.5m) ──
    // Bounds: X[-8..8], Z[22..38]
    this.addFloor(g, floorMat, 16, 16, 0, 30);
    this.addCeiling(g, floorMat, 16, 16, 0, 30, 4.5);
    // North wall (Z=22) — doorway at X=0 (from corridor)
    this.addWallXWithDoorway(g, wallMat, metalMat, 16, 4.5, 0, 22.25, 0, doorW, doorH);
    // South wall (Z=38) — full
    this.addWallX(g, wallMat, 16, 4.5, 0, 37.75);
    // East wall (X=8) — doorway at Z=30 (to Room 4)
    this.addWallZWithDoorway(g, wallMat, metalMat, 16, 4.5, 7.75, 30, 30, doorW, doorH);
    // West wall (X=-8) — doorway at Z=30 (to Room 5)
    this.addWallZWithDoorway(g, wallMat, metalMat, 16, 4.5, -7.75, 30, 30, doorW, doorH);
    // Features: crate stacks in SE area
    this.addBox(g, woodMat, 1.2, 1.2, 1.2, 4, 0.6, 34);
    this.addBox(g, woodMat, 1.2, 1.2, 1.2, 5.5, 0.6, 35);
    this.addBox(g, woodMat, 1.2, 1.2, 1.2, 4, 1.8, 34); // stacked
    this.addBox(g, woodMat, 1.2, 1.2, 1.2, 6.5, 0.6, 33.5);
    // Low metal platform along south wall
    this.addBox(g, metalMat, 6, 0.4, 3, 0, 0.2, 36);

    // ── Room 4: Catwalk Room (16×12, ceiling 8m) ──
    // Bounds: X[8..24], Z[24..36]
    this.addFloor(g, floorMat, 16, 12, 16, 30);
    this.addCeiling(g, floorMat, 16, 12, 16, 30, 8);
    // North wall (Z=24) — full
    this.addWallX(g, wallMat, 16, 8, 16, 24.25);
    // South wall (Z=36) — full
    this.addWallX(g, wallMat, 16, 8, 16, 35.75);
    // East wall (X=24) — full
    this.addWallZ(g, wallMat, 12, 8, 23.75, 30);
    // West wall (X=8) — doorway at Z=30 (to Room 3)
    this.addWallZWithDoorway(g, wallMat, metalMat, 12, 8, 8.25, 30, 30, doorW, doorH);
    // Pillars (0.5×8×0.5 concrete, floor to ceiling)
    this.addBox(g, floorMat, 0.5, 8, 0.5, 12, 4, 27);
    this.addBox(g, floorMat, 0.5, 8, 0.5, 20, 4, 27);
    this.addBox(g, floorMat, 0.5, 8, 0.5, 12, 4, 33);
    this.addBox(g, floorMat, 0.5, 8, 0.5, 20, 4, 33);
    // Catwalk platform at y=3m (12×8×0.3)
    this.addBox(g, metalMat, 12, 0.3, 8, 16, 3, 30);
    // Ramp from floor to catwalk (~23° angle)
    // Rise 3m over run 7m: angle = atan(3/7) ≈ 0.4049 rad
    const rampAngle = Math.atan(3 / 7);
    // Ramp slab length along hypotenuse ≈ sqrt(49+9) ≈ 7.62m
    const rampLen = Math.sqrt(49 + 9);
    this.addBox(g, metalMat, 3, 0.3, rampLen, 22, 1.5, 31.5, { x: rampAngle, y: 0, z: 0 });

    // ── Room 5: Utility Room (8×8, ceiling 3m) ──
    // Bounds: X[-16..-8], Z[26..34]
    this.addFloor(g, floorMat, 8, 8, -12, 30);
    this.addCeiling(g, floorMat, 8, 8, -12, 30, 3);
    // North wall (Z=26) — full
    this.addWallX(g, wallMat, 8, 3, -12, 26.25);
    // South wall (Z=34) — full
    this.addWallX(g, wallMat, 8, 3, -12, 33.75);
    // East wall (X=-8) — doorway at Z=30 (to Room 3)
    this.addWallZWithDoorway(g, wallMat, metalMat, 8, 3, -8.25, 30, 30, doorW, doorH);
    // West wall (X=-16) — full
    this.addWallZ(g, wallMat, 8, 3, -15.75, 30);
    // Stairs along west wall (4 steps)
    for (let i = 0; i < 4; i++) {
      this.addBox(g, woodMat, 2, 0.3, 0.4, -14, 0.15 + i * 0.3, 28 + i * 0.4);
    }
    // Small crates
    this.addBox(g, woodMat, 0.8, 0.8, 0.8, -10, 0.4, 32);
    this.addBox(g, woodMat, 0.8, 0.8, 0.8, -13.5, 0.4, 27.5);

    this.engine.scene.add(g);
  }
}
