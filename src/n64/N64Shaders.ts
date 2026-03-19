export const n64VertexShader = /* glsl */ `
precision highp float;

attribute vec3 color;

uniform float u_jitter;
uniform float u_affine;
uniform float u_vertexLit;
uniform float u_snapGrid;
uniform vec3 u_lightDir;
uniform float u_useBakedLighting;
uniform float u_hasVertexColors;

varying vec2 vUv;
varying float vAffineW;
varying float vLighting;
varying float vFogDist;
varying vec3 vVertexColor;

void main() {
  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
  vec4 clipPos = projectionMatrix * mvPos;

  // Vertex snapping: snap clip-space XY to fixed-point grid
  if (u_jitter > 0.5) {
    clipPos.xy = floor(clipPos.xy / clipPos.w * u_snapGrid + 0.5) / u_snapGrid * clipPos.w;
  }

  // Affine texture mapping: multiply UVs by W to defeat perspective correction
  // Clamp W to prevent extreme distortion on large polygons (real N64 subdivided geometry)
  float w = clipPos.w;
  float affineW = clamp(w, 0.5, 2.0);
  vAffineW = mix(1.0, affineW, u_affine * 0.15);
  vUv = uv * vAffineW;

  // Per-vertex lighting (dynamic directional)
  vec3 worldNormal = normalize(normalMatrix * normal);
  float diff = max(dot(worldNormal, normalize(u_lightDir)), 0.0);
  float dynamicLit = 0.45 + 0.55 * diff;

  // Baked vertex colors (guard against missing attribute which defaults to black)
  vec3 vc = mix(vec3(1.0), color, u_hasVertexColors);
  vVertexColor = mix(vec3(1.0), vc, u_useBakedLighting);
  vLighting = mix(1.0, dynamicLit, u_vertexLit * (1.0 - u_useBakedLighting));

  // Fog distance (view-space depth)
  vFogDist = length(mvPos.xyz);

  gl_Position = clipPos;
}
`;

export const n64FragmentShader = /* glsl */ `
precision highp float;

uniform sampler2D u_texture;
uniform vec3 u_color;
uniform float u_opacity;
uniform float u_alphaTest;
uniform float u_hasTexture;

uniform float u_useFog;
uniform vec3 u_fogColor;
uniform float u_fogNear;
uniform float u_fogFar;

uniform float u_dither;
uniform float u_colorDepth;

varying vec2 vUv;
varying float vAffineW;
varying float vLighting;
varying float vFogDist;
varying vec3 vVertexColor;

float bayer4(vec2 p) {
  // 4x4 Bayer ordered dithering matrix
  int x = int(mod(p.x, 4.0));
  int y = int(mod(p.y, 4.0));
  int index = x + y * 4;
  float m;
  // Manual lookup (GLSL ES lacks variable array indexing)
  if (index == 0) m = 0.0;
  else if (index == 1) m = 8.0;
  else if (index == 2) m = 2.0;
  else if (index == 3) m = 10.0;
  else if (index == 4) m = 12.0;
  else if (index == 5) m = 4.0;
  else if (index == 6) m = 14.0;
  else if (index == 7) m = 6.0;
  else if (index == 8) m = 3.0;
  else if (index == 9) m = 11.0;
  else if (index == 10) m = 1.0;
  else if (index == 11) m = 9.0;
  else if (index == 12) m = 15.0;
  else if (index == 13) m = 7.0;
  else if (index == 14) m = 13.0;
  else m = 5.0;
  return m / 16.0;
}

void main() {
  vec2 correctedUv = vUv / vAffineW;
  vec3 col;

  if (u_hasTexture > 0.5) {
    vec4 texColor = texture2D(u_texture, correctedUv);
    if (texColor.a < u_alphaTest) discard;
    col = texColor.rgb * u_color;
  } else {
    col = u_color;
  }

  // Per-vertex lighting (dynamic directional + baked vertex colors)
  col *= vLighting * vVertexColor;

  // Distance fog
  if (u_useFog > 0.5) {
    float fogFactor = smoothstep(u_fogNear, u_fogFar, vFogDist);
    col = mix(col, u_fogColor, fogFactor);
  }

  // Ordered dithering + 15-bit color quantization
  float levels = 31.0;
  if (u_dither > 0.5) {
    float d = (bayer4(gl_FragCoord.xy) - 0.5) / levels;
    col += d;
  }
  if (u_colorDepth > 0.5) {
    col = floor(col * levels + 0.5) / levels;
  }

  col = clamp(col, 0.0, 1.0);
  gl_FragColor = vec4(col, u_opacity);
}
`;
