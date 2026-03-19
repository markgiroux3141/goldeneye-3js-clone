import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { BakeLight } from '../editor/LevelData';

export interface BakeConfig {
  ambientLevel: number;
  skyColor: THREE.Color;
  groundColor: THREE.Color;
  aoSamples: number;
  aoRadius: number;
  aoStrength: number;
  lights: BakeLight[];
  normalBias: number;
}

const DEFAULTS: BakeConfig = {
  ambientLevel: 0.15,
  skyColor: new THREE.Color(0.5, 0.48, 0.52),
  groundColor: new THREE.Color(0.08, 0.06, 0.05),
  aoSamples: 32,
  aoRadius: 3.0,
  aoStrength: 0.7,
  lights: [],
  normalBias: 0.02,
};

const UP = new THREE.Vector3(0, 1, 0);

/**
 * Generate evenly-distributed hemisphere sample directions using Fibonacci sphere.
 * Returns unit vectors in the +Y hemisphere (will be rotated to vertex normal later).
 */
function generateHemisphereSamples(count: number): THREE.Vector3[] {
  const samples: THREE.Vector3[] = [];
  const goldenRatio = (1 + Math.sqrt(5)) / 2;
  // Generate twice as many on full sphere, keep upper hemisphere
  for (let i = 0; samples.length < count; i++) {
    const theta = 2 * Math.PI * i / goldenRatio;
    const phi = Math.acos(1 - 2 * (i + 0.5) / (count * 2));
    const x = Math.sin(phi) * Math.cos(theta);
    const y = Math.cos(phi);
    const z = Math.sin(phi) * Math.sin(theta);
    if (y >= 0) {
      samples.push(new THREE.Vector3(x, y, z));
    }
  }
  return samples;
}

/**
 * Build a rotation quaternion that rotates +Y to the given normal direction.
 */
function rotationFromYToNormal(normal: THREE.Vector3): THREE.Quaternion {
  const q = new THREE.Quaternion();
  q.setFromUnitVectors(UP, normal);
  return q;
}

/**
 * Collect all mesh geometries in the group, baked into world space,
 * and merge them into a single geometry for efficient raycasting.
 */
function buildRaycastMesh(group: THREE.Group): THREE.Mesh {
  const geometries: THREE.BufferGeometry[] = [];

  group.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const mesh = child as THREE.Mesh;
    const geo = mesh.geometry.clone();
    geo.applyMatrix4(mesh.matrixWorld);
    geometries.push(geo);
  });

  if (geometries.length === 0) {
    throw new Error('[VertexColorBaker] No meshes found in level group');
  }

  const merged = mergeGeometries(geometries, false);
  if (!merged) {
    throw new Error('[VertexColorBaker] Failed to merge geometries');
  }

  // Clean up cloned geometries
  for (const g of geometries) g.dispose();

  const mat = new THREE.MeshBasicMaterial({ visible: false });
  return new THREE.Mesh(merged, mat);
}

/**
 * Bake vertex colors onto all meshes in the level group.
 * Computes ambient occlusion, hemisphere sky lighting, and point light
 * illumination with shadow rays.
 */
export function bakeVertexColors(
  levelGroup: THREE.Group,
  config?: Partial<BakeConfig>
): void {
  const cfg: BakeConfig = { ...DEFAULTS, ...config };
  const startTime = performance.now();

  // Ensure world matrices are up to date
  levelGroup.updateMatrixWorld(true);

  // Build merged mesh for raycasting
  const rayMesh = buildRaycastMesh(levelGroup);
  const raycaster = new THREE.Raycaster();

  // Pre-compute hemisphere samples
  const hemiSamples = generateHemisphereSamples(cfg.aoSamples);

  // Pre-compute light colors (normalize from 0-255 to 0-1)
  const lightsNormalized = cfg.lights.map((light) => ({
    position: new THREE.Vector3(light.position.x, light.position.y, light.position.z),
    color: light.color
      ? new THREE.Color(light.color.r / 255, light.color.g / 255, light.color.b / 255)
      : new THREE.Color(1.0, 0.94, 0.86), // warm white default
    intensity: light.intensity ?? 1.0,
    radius: light.radius ?? 10.0,
    falloff: light.falloff ?? 2.0,
  }));

  // Reusable vectors
  const worldPos = new THREE.Vector3();
  const worldNormal = new THREE.Vector3();
  const rayDir = new THREE.Vector3();
  const toLight = new THREE.Vector3();
  const normalMatrix = new THREE.Matrix3();

  let totalVertices = 0;

  // Process each mesh in the level
  levelGroup.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const mesh = child as THREE.Mesh;
    const geometry = mesh.geometry;

    const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const normalAttr = geometry.getAttribute('normal') as THREE.BufferAttribute;
    if (!posAttr || !normalAttr) return;

    const vertexCount = posAttr.count;
    totalVertices += vertexCount;
    const colors = new Float32Array(vertexCount * 3);

    // Compute normal matrix for this mesh
    normalMatrix.getNormalMatrix(mesh.matrixWorld);

    for (let i = 0; i < vertexCount; i++) {
      // Get world-space position and normal
      worldPos.fromBufferAttribute(posAttr, i);
      worldPos.applyMatrix4(mesh.matrixWorld);

      worldNormal.fromBufferAttribute(normalAttr, i);
      worldNormal.applyMatrix3(normalMatrix).normalize();

      // Offset ray origin along normal to avoid self-intersection
      const origin = worldPos.clone().addScaledVector(worldNormal, cfg.normalBias);

      // ── 1. Hemisphere sky lighting (based on normal orientation) ──
      const hemisphereT = worldNormal.dot(UP) * 0.5 + 0.5; // 0 = down, 1 = up
      const hemiR = THREE.MathUtils.lerp(cfg.groundColor.r, cfg.skyColor.r, hemisphereT);
      const hemiG = THREE.MathUtils.lerp(cfg.groundColor.g, cfg.skyColor.g, hemisphereT);
      const hemiB = THREE.MathUtils.lerp(cfg.groundColor.b, cfg.skyColor.b, hemisphereT);

      // ── 2. Ambient Occlusion ──
      let occluded = 0;
      const rotQ = rotationFromYToNormal(worldNormal);

      for (let s = 0; s < hemiSamples.length; s++) {
        rayDir.copy(hemiSamples[s]).applyQuaternion(rotQ);
        raycaster.set(origin, rayDir);
        raycaster.far = cfg.aoRadius;
        raycaster.near = 0;
        const hits = raycaster.intersectObject(rayMesh, false);
        if (hits.length > 0) {
          occluded++;
        }
      }
      const aoFactor = 1 - cfg.aoStrength * (occluded / hemiSamples.length);

      // ── 3. Point lights ──
      let lightR = 0, lightG = 0, lightB = 0;

      for (const light of lightsNormalized) {
        toLight.copy(light.position).sub(worldPos);
        const dist = toLight.length();
        if (dist > light.radius) continue;

        toLight.normalize();

        // Lambert diffuse
        const lambert = Math.max(0, worldNormal.dot(toLight));
        if (lambert <= 0) continue;

        // Distance attenuation
        const attenuation = Math.pow(Math.max(0, 1 - dist / light.radius), light.falloff) * light.intensity;

        // Shadow ray: check if anything blocks the path to the light
        raycaster.set(origin, toLight);
        raycaster.far = dist - cfg.normalBias;
        raycaster.near = 0;
        const shadowHits = raycaster.intersectObject(rayMesh, false);
        if (shadowHits.length > 0) continue; // in shadow

        const contribution = attenuation * lambert;
        lightR += light.color.r * contribution;
        lightG += light.color.g * contribution;
        lightB += light.color.b * contribution;
      }

      // ── 4. Combine ──
      const baseR = cfg.ambientLevel + hemiR;
      const baseG = cfg.ambientLevel + hemiG;
      const baseB = cfg.ambientLevel + hemiB;

      colors[i * 3 + 0] = Math.min(1, aoFactor * baseR + lightR);
      colors[i * 3 + 1] = Math.min(1, aoFactor * baseG + lightG);
      colors[i * 3 + 2] = Math.min(1, aoFactor * baseB + lightB);
    }

    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  });

  // Clean up
  rayMesh.geometry.dispose();
  (rayMesh.material as THREE.Material).dispose();

  const elapsed = (performance.now() - startTime).toFixed(0);
  console.log(`[VertexColorBaker] Baked ${totalVertices} vertices in ${elapsed}ms`);
}
