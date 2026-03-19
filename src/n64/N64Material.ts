import * as THREE from 'three';
import { n64VertexShader, n64FragmentShader } from './N64Shaders';

const DEFAULT_LIGHT_DIR = new THREE.Vector3(0.5, 1.0, 0.3).normalize();
const DEFAULT_FOG_COLOR = new THREE.Vector3(0.1, 0.04, 0.18); // dark purple #1a0a2e

function cloneTextureNearest(tex: THREE.Texture): THREE.Texture {
  const clone = tex.clone();
  clone.magFilter = THREE.NearestFilter;
  clone.minFilter = THREE.NearestFilter;
  clone.generateMipmaps = false;
  clone.needsUpdate = true;
  return clone;
}

export function createN64Material(
  source: THREE.Material,
  fogColor?: THREE.Color
): THREE.ShaderMaterial {
  const std = source as THREE.MeshStandardMaterial;

  const hasTexture = !!(std.map);
  let texture: THREE.Texture | null = null;
  if (std.map) {
    texture = cloneTextureNearest(std.map);
  }

  const color = std.color ? std.color : new THREE.Color(1, 1, 1);
  const fog = fogColor
    ? new THREE.Vector3(fogColor.r, fogColor.g, fogColor.b)
    : DEFAULT_FOG_COLOR;

  const mat = new THREE.ShaderMaterial({
    vertexShader: n64VertexShader,
    fragmentShader: n64FragmentShader,
    uniforms: {
      u_texture: { value: texture },
      u_color: { value: new THREE.Vector3(color.r, color.g, color.b) },
      u_opacity: { value: std.opacity ?? 1.0 },
      u_alphaTest: { value: std.alphaTest ?? 0.0 },
      u_hasTexture: { value: hasTexture ? 1.0 : 0.0 },

      u_jitter: { value: 1.0 },
      u_affine: { value: 1.0 },
      u_vertexLit: { value: 1.0 },
      u_snapGrid: { value: 120.0 },
      u_lightDir: { value: DEFAULT_LIGHT_DIR.clone() },

      u_useBakedLighting: { value: 0.0 },
      u_hasVertexColors: { value: 0.0 },

      u_useFog: { value: 1.0 },
      u_fogColor: { value: fog },
      u_fogNear: { value: 15.0 },
      u_fogFar: { value: 50.0 },

      u_dither: { value: 1.0 },
      u_colorDepth: { value: 1.0 },
    },
    side: std.side ?? THREE.FrontSide,
    transparent: std.transparent ?? false,
    depthWrite: std.depthWrite ?? true,
    blending: std.blending ?? THREE.NormalBlending,
  });

  if ((std as any).depthFunc !== undefined) {
    mat.depthFunc = (std as any).depthFunc;
  }
  if (std.polygonOffset) {
    mat.polygonOffset = true;
    mat.polygonOffsetFactor = std.polygonOffsetFactor;
    mat.polygonOffsetUnits = std.polygonOffsetUnits;
  }

  return mat;
}

export function createN64MaterialFromArray(
  sources: THREE.Material[],
  fogColor?: THREE.Color
): THREE.ShaderMaterial[] {
  return sources.map((s) => createN64Material(s, fogColor));
}
