import * as THREE from 'three';
import type { PointLightData } from '../editor/LevelData';

export function setupLighting(scene: THREE.Scene): void {
  const ambient = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(ambient);

  const directional = new THREE.DirectionalLight(0xffffff, 0.6);
  directional.position.set(10, 20, 10);
  directional.target.position.set(0, 0, 0);
  scene.add(directional);
  scene.add(directional.target);
}

// The GoldenEye Level Editor authors positions/ranges in "WT" (world tile)
// units. Its GLB exporter bakes geometry at WT × EDITOR_WORLD_SCALE meters,
// but the .lights.json keeps the raw WT values — so we apply this factor
// ourselves when loading lights. See editor's src/core/constants.js.
const EDITOR_WORLD_SCALE = 0.25;

// Raw format exported by the GoldenEye Level Editor (<slug>.lights.json)
export interface EditorLightsFile {
  version: number;
  ambient?: { intensity?: number };
  pointLights?: Array<{
    id?: number;
    x: number;
    y: number;
    z: number;
    color?: { r: number; g: number; b: number };  // 0-1 floats
    intensity?: number;
    range?: number;
    enabled?: boolean;
    castShadow?: boolean;
  }>;
}

// Convert editor-exported lights into our canonical PointLightData format.
// Spatial quantities go WT → meters (× EDITOR_WORLD_SCALE) then × modelScale
// to match the in-game level scale. Intensity × modelScale² compensates for
// inverse-square falloff on the upscaled geometry (keeping perceived brightness
// the same as at 1× modelScale).
export function convertEditorPointLights(
  source: EditorLightsFile,
  scale: number
): PointLightData[] {
  const spatial = EDITOR_WORLD_SCALE * scale;
  const intensityScale = scale * scale;
  const out: PointLightData[] = [];
  for (const l of source.pointLights ?? []) {
    if (l.enabled === false) continue;
    out.push({
      position: { x: l.x * spatial, y: l.y * spatial, z: l.z * spatial },
      color: l.color
        ? { r: l.color.r * 255, g: l.color.g * 255, b: l.color.b * 255 }
        : undefined,
      intensity: (l.intensity ?? 1.0) * intensityScale,
      distance: (l.range ?? 15) * spatial,
      decay: 2,
      castShadow: l.castShadow !== false,
    });
  }
  return out;
}

// Replace the default ambient/directional lights with the designer-specified
// ambient from a custom lights file. Called when a level has a sidecar
// <slug>.lights.json so the point lights drive the look, not the defaults.
export function applyCustomAmbient(scene: THREE.Scene, source: EditorLightsFile): void {
  // Remove default lights added by setupLighting
  const toRemove: THREE.Object3D[] = [];
  scene.traverse((obj) => {
    if (obj instanceof THREE.AmbientLight || obj instanceof THREE.DirectionalLight) {
      toRemove.push(obj);
    }
  });
  for (const obj of toRemove) scene.remove(obj);

  const intensity = source.ambient?.intensity ?? 0.2;
  scene.add(new THREE.AmbientLight(0xffffff, intensity));
}

// Apply real-time point lights from a custom level's JSON config.
// Enables the renderer's shadow map on first call (lazy — levels without
// pointLights pay no shadow-pass cost). Relies on meshes already having
// castShadow/receiveShadow set by LevelLoader, and alphaTest > 0 on
// transparent materials (for cutout shadows through railings, etc.).
export function applyPointLights(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  lights: PointLightData[],
  opts: { debugHelpers?: boolean } = {}
): THREE.PointLight[] {
  if (lights.length === 0) return [];

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const created: THREE.PointLight[] = [];
  for (const data of lights) {
    const color = data.color
      ? new THREE.Color(data.color.r / 255, data.color.g / 255, data.color.b / 255)
      : new THREE.Color(0xffffff);
    const intensity = data.intensity ?? 1.0;
    const distance = data.distance ?? 15;
    const decay = data.decay ?? 2;

    const light = new THREE.PointLight(color, intensity, distance, decay);
    light.position.set(data.position.x, data.position.y, data.position.z);

    if (data.castShadow !== false) {
      light.castShadow = true;
      light.shadow.mapSize.set(512, 512);
      light.shadow.bias = -0.002;
      light.shadow.normalBias = 0.02;
      light.shadow.camera.near = 0.1;
      light.shadow.camera.far = Math.max(distance, 1);
    }

    scene.add(light);
    if (opts.debugHelpers) {
      const helper = new THREE.PointLightHelper(light, 2.0);
      // Render on top of everything so we can see lights through walls
      const mat = helper.material as THREE.Material;
      mat.depthTest = false;
      mat.depthWrite = false;
      mat.transparent = true;
      helper.renderOrder = 999;
      scene.add(helper);
    }
    created.push(light);
  }
  return created;
}
