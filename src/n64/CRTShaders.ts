export const crtVertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const crtFragmentShader = /* glsl */ `
precision highp float;

uniform sampler2D tDiffuse;
uniform vec2 u_resolution;      // screen resolution
uniform vec2 u_sourceResolution; // render target resolution (320x240)
uniform float u_time;
uniform float u_crt;        // barrel + vignette + phosphor + flicker
uniform float u_scanlines;

varying vec2 vUv;

vec2 curveUV(vec2 uv) {
  uv = uv * 2.0 - 1.0;
  vec2 offset = abs(uv.yx) / vec2(5.0, 5.0);
  uv = uv + uv * offset * offset;
  uv = uv * 0.5 + 0.5;
  return uv;
}

void main() {
  vec2 uv = vUv;

  // Barrel distortion
  if (u_crt > 0.5) {
    uv = curveUV(uv);
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }
  }

  // Chromatic aberration
  vec3 col;
  if (u_crt > 0.5) {
    float caStr = 0.003;
    float r = texture2D(tDiffuse, vec2(uv.x + caStr, uv.y)).r;
    float g = texture2D(tDiffuse, uv).g;
    float b = texture2D(tDiffuse, vec2(uv.x - caStr, uv.y)).b;
    col = vec3(r, g, b);
  } else {
    col = texture2D(tDiffuse, uv).rgb;
  }

  // Scanlines
  if (u_scanlines > 0.5) {
    float scanline = sin(uv.y * u_sourceResolution.y * 3.14159) * 0.5 + 0.5;
    scanline = pow(scanline, 1.5);
    col *= 0.8 + 0.2 * scanline;
  }

  // RGB phosphor sub-pixels
  if (u_crt > 0.5) {
    float px = mod(gl_FragCoord.x, 3.0);
    if (px < 1.0) col *= vec3(1.1, 0.9, 0.9);
    else if (px < 2.0) col *= vec3(0.9, 1.1, 0.9);
    else col *= vec3(0.9, 0.9, 1.1);
  }

  // Vignette
  if (u_crt > 0.5) {
    float vig = length(vUv - 0.5);
    col *= 1.0 - vig * vig * 0.5;
  }

  // Flicker + rolling bar
  if (u_crt > 0.5) {
    col *= 0.98 + 0.02 * sin(u_time * 60.0);
    col *= 0.97 + 0.03 * (sin(uv.y * 2.0 + u_time * 1.5) * 0.5 + 0.5);
  }

  // Gamma correction (linear -> sRGB)
  col = pow(col, vec3(1.0 / 2.2));

  gl_FragColor = vec4(col, 1.0);
}
`;
