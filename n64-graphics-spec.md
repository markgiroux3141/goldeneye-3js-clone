# N64 Graphics Engine — Three.js Implementation Spec

## Goal

Build a real-time Three.js scene that faithfully reproduces Nintendo 64 era graphics, including all hardware quirks, rendering limitations, and the CRT television display they were viewed on. Every effect should be independently toggleable via UI buttons so the user can see what each contributes.

## Architecture Overview

The engine has two rendering stages:

1. **Scene Pass** — Renders a 3D scene to a low-resolution render target using custom vertex/fragment shaders that emulate N64 hardware behavior.
2. **CRT Post-Processing Pass** — Takes the low-res texture and renders it to a full-screen quad with CRT television simulation shaders.

Use Three.js r128 via CDN (`https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js`). No other dependencies. Single HTML file output.

---

## Stage 1: N64 Hardware Emulation

### 1.1 Low-Resolution Render Target

The N64 typically rendered at 320×240. Create a `WebGLRenderTarget` at this resolution with `NearestFilter` for both min and mag filters. This is the single most important visual element — everything rendered here gets upscaled with no interpolation, producing the chunky pixel look.

```
Resolution: 320×240
Aspect ratio: 4:3
Filter: THREE.NearestFilter (both min and mag)
Antialiasing: disabled on the renderer
```

### 1.2 Vertex Snapping (Jitter)

The N64's Reality Signal Processor had no sub-pixel vertex precision. Vertices snapped to a fixed-point grid, causing geometry to "wobble" and "shimmer" as the camera moved.

**Implementation:** In the vertex shader, after computing clip-space position, snap XY coordinates to a grid:

```glsl
// After projectionMatrix * modelViewMatrix * position:
float grid = 120.0;  // Controls snap resolution. Lower = more jitter.
clipPos.xy = floor(clipPos.xy / clipPos.w * grid + 0.5) / grid * clipPos.w;
```

The grid value of ~120 produces visible jitter without being extreme. This should be a uniform so it can be toggled.

### 1.3 Affine Texture Mapping

The N64's RSP did not perform perspective-correct texture interpolation across all geometry. UVs were linearly interpolated in screen space, causing textures to "swim" and warp on angled or large surfaces.

**Implementation:** Multiply UVs by clip-space W before the vertex shader outputs them, then divide by W in the fragment shader:

```glsl
// Vertex shader:
float w = clipPos.w;
vAffineW = mix(1.0, w, u_affine);  // u_affine toggles the effect (0.0 or 1.0)
vUv = uv * vAffineW;

// Fragment shader:
vec2 correctedUv = vUv / vAffineW;
vec4 texColor = texture2D(u_texture, correctedUv);
```

When `u_affine = 1.0`, the perspective division happens after interpolation (wrong = N64 style). When `0.0`, standard perspective-correct mapping.

### 1.4 Vertex Lighting

The N64 computed lighting per-vertex, not per-pixel. This produces flat, faceted shading with visible color banding across polygons.

**Implementation:** Compute diffuse lighting in the vertex shader using the normal and a fixed light direction. Pass the result as a `varying vec3 vColor` to the fragment shader.

```glsl
// Vertex shader:
vec3 lightDir = normalize(vec3(0.5, 1.0, 0.3));
float diff = max(dot(normalize(normalMatrix * normal), lightDir), 0.0);
vColor = vec3(0.25) + vec3(0.75) * diff;  // Ambient + diffuse

// Fragment shader:
col *= mix(vec3(1.0), vColor, u_vertexLit);  // Toggle via uniform
```

### 1.5 Distance Fog

N64 games used linear fog extensively to hide draw distance limitations (Ocarina of Time, Mario 64, etc.). The fog color matched the sky/background.

**Implementation:** Use `THREE.Fog` on the scene with near ~8 and far ~38. Also compute fog factor in the vertex shader for the custom material:

```glsl
float fogDist = length(mvPos.xyz);
vFogFactor = smoothstep(8.0, 38.0, fogDist);

// Fragment shader:
col = mix(col, u_fogColor, vFogFactor * u_useFog);
```

Set `scene.background` and `scene.fog` color to the same value (dark purple `#1a0a2e` for a dusk/night mood, or sky blue for daytime).

### 1.6 15-Bit Color Quantization

The N64 framebuffer was 16-bit (5 bits per R/G/B channel + 1 alpha bit = 32 color levels per channel). This creates visible color banding, especially in gradients and fog.

**Implementation:** In the fragment shader, quantize each channel to 32 levels:

```glsl
float levels = 31.0;
col = floor(col * levels + 0.5) / levels;
```

### 1.7 Ordered Dithering (Bayer Matrix)

The N64's RDP used ordered dithering to smooth color banding from the limited color depth. This produces a characteristic crosshatch pattern.

**Implementation:** Apply a 4×4 Bayer dithering matrix BEFORE color quantization:

```glsl
// Bayer 4x4 matrix lookup
float bayer4(vec2 p) {
    // 4x4 threshold matrix values: 0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5
    // Divided by 16.0 to normalize to [0,1)
    int x = int(mod(p.x, 4.0));
    int y = int(mod(p.y, 4.0));
    // Manual lookup since GLSL ES doesn't support array indexing by variable
    ...
    return m[index] / 16.0;
}

// Apply before quantization:
float d = (bayer4(gl_FragCoord.xy) - 0.5) / levels;
col = floor((col + d) * levels + 0.5) / levels;
```

### 1.8 Low-Poly Geometry

All geometry should use intentionally low polygon counts. Use low segment counts on all Three.js primitives:

- `CylinderGeometry` — 5-6 radial segments
- `ConeGeometry` — 5-6 radial segments
- `SphereGeometry` — 4-6 segments each axis (if used)
- `BoxGeometry` — 1-2 subdivisions max
- `PlaneGeometry` — 8×8 subdivisions (enough for vertex jitter to show)

### 1.9 Textures

N64 textures were tiny (typically 32×32 or 64×64) and heavily reused with tiling. Generate textures procedurally on small canvases.

**Rules:**
- Canvas size: 8×8 to 32×32 pixels
- `magFilter: THREE.NearestFilter` — always. No bilinear smoothing.
- `minFilter: THREE.NearestFilter` — always.
- `wrapS / wrapT: THREE.RepeatWrapping` — for tiled surfaces
- Use `.repeat.set(tilesX, tilesY)` to tile across geometry

**Texture types to create:**
- Grass (green with scattered darker/lighter pixels)
- Brick (brown with mortar lines)
- Stone (gray with noise)
- Checkerboard patterns (for roofs, clothing, decorative surfaces)

---

## Stage 2: CRT Post-Processing

After rendering the scene to the low-res target, render a full-screen quad with the result texture and apply CRT effects in the fragment shader.

### 2.1 Barrel Distortion

CRT screens had curved glass that warped the image outward at the edges.

```glsl
vec2 curveUV(vec2 uv) {
    uv = uv * 2.0 - 1.0;
    vec2 offset = abs(uv.yx) / vec2(5.0, 5.0);
    uv = uv + uv * offset * offset;
    uv = uv * 0.5 + 0.5;
    return uv;
}
// Discard fragments where uv < 0 or uv > 1 (black corners)
```

### 2.2 Scanlines

CRT displays drew alternating bright/dark horizontal lines as the electron beam swept.

```glsl
float scanline = sin(uv.y * resolution.y * 3.14159) * 0.5 + 0.5;
scanline = pow(scanline, 1.5);
col *= 0.7 + 0.3 * scanline;
```

### 2.3 Chromatic Aberration

Analog video signals produced slight color fringing, especially toward screen edges.

```glsl
float caStr = 0.003;
float r = texture2D(tDiffuse, vec2(uv.x + caStr, uv.y)).r;
float g = texture2D(tDiffuse, uv).g;
float b = texture2D(tDiffuse, vec2(uv.x - caStr, uv.y)).b;
```

### 2.4 RGB Phosphor Sub-Pixels

CRT screens had R, G, B phosphor stripes or dots. Simulate by tinting every 3rd pixel column:

```glsl
float px = mod(gl_FragCoord.x, 3.0);
if (px < 1.0) col *= vec3(1.1, 0.9, 0.9);
else if (px < 2.0) col *= vec3(0.9, 1.1, 0.9);
else col *= vec3(0.9, 0.9, 1.1);
```

### 2.5 Vignette

Electron gun intensity drops off toward screen corners:

```glsl
float vig = length(vUv - 0.5);
col *= 1.0 - vig * vig * 0.8;
```

### 2.6 Flicker & Rolling Bar

CRT refresh was visible as subtle brightness variation and a slow-moving horizontal brightness band:

```glsl
col *= 0.98 + 0.02 * sin(u_time * 60.0);           // Flicker
col *= 0.97 + 0.03 * (sin(uv.y * 2.0 + u_time * 1.5) * 0.5 + 0.5);  // Rolling bar
```

---

## Scene Content

Build a scene that showcases all the effects. Think "N64 platformer hub world":

### Castle / Fortress
- Main cylindrical tower (6 radial segments) with brick texture, cone roof
- Two smaller side towers with different colored roofs
- Stone wall connecting them with a dark archway/doorway

### Environment
- Large tiled grass ground plane
- 10-12 scattered trees (cylinder trunk + cone canopy, 4-5 segments each)
- Stepping stone path leading to the castle archway

### Collectible Star
- Floating `OctahedronGeometry` with gold checkerboard texture
- Bobbing up/down with sine wave, spinning on Y axis

### Low-Poly Character
- Simple blocky figure: box body, box head, cone hat, box legs
- Idle bounce animation
- Slowly rotating

### Camera
- Automatic orbit around the scene center
- Gentle vertical bob with sine wave
- Looking slightly above ground toward the castle

### Lighting
- Single `AmbientLight` (dim, bluish tint, intensity ~0.6)
- Single `DirectionalLight` (warm, intensity ~0.8) — this drives the vertex lighting shader

---

## UI Controls

### HUD Overlay
- Position: top-left of the render container
- Font: `Press Start 2P` (Google Fonts, pixel-perfect)
- Show FPS counter (updated every 0.5s)
- Show current resolution label ("320×240" or "HI-RES")
- White text with black text-shadow for readability

### Toggle Buttons
- Row of buttons below the render container
- One button per effect (9 total):
  1. **CRT** — barrel distortion + vignette + phosphor + flicker + rolling bar
  2. **SCANLINES** — CRT scanline overlay
  3. **LOW-RES** — 320×240 render target vs native resolution
  4. **FOG** — distance fog on/off
  5. **DITHER** — Bayer ordered dithering
  6. **VERTEX LIT** — per-vertex vs uniform lighting
  7. **AFFINE WARP** — affine vs perspective-correct textures
  8. **VERT JITTER** — vertex snapping on/off
  9. **15-BIT COLOR** — color quantization on/off

- All start as "active" (enabled)
- Toggle on click, visual active/inactive state
- Font: `Press Start 2P`, small size (~8px)

### Container
- 4:3 aspect ratio box, max-width 800px
- Dark border, subtle purple glow box-shadow
- `image-rendering: pixelated` on the container
- Dark background page (#0a0a0a)

---

## Shader Uniform Summary

### N64 Material Uniforms
| Uniform | Type | Purpose |
|---------|------|---------|
| `u_texture` | sampler2D | Object texture |
| `u_jitter` | float | Vertex snapping on (1.0) / off (0.0) |
| `u_affine` | float | Affine texture warp on (1.0) / off (0.0) |
| `u_snapGrid` | float | Vertex snap grid resolution (~120.0) |
| `u_fogColor` | vec3 | Fog color (match scene background) |
| `u_useFog` | float | Fog on (1.0) / off (0.0) |
| `u_vertexLit` | float | Vertex lighting on (1.0) / off (0.0) |
| `u_dither` | float | Ordered dithering on (1.0) / off (0.0) |
| `u_colorDepth` | float | 15-bit color quantization on (1.0) / off (0.0) |

### CRT Uniforms
| Uniform | Type | Purpose |
|---------|------|---------|
| `tDiffuse` | sampler2D | Scene render target texture |
| `u_resolution` | vec2 | Render target resolution |
| `u_time` | float | Elapsed time (for flicker/rolling bar) |
| `u_crt` | float | CRT effects on (1.0) / off (0.0) |
| `u_scanlines` | float | Scanlines on (1.0) / off (0.0) |

---

## Material System

Create a factory function `makeN64Mat(texture, tileX, tileY)` that returns a `THREE.ShaderMaterial` with the N64 vertex/fragment shaders and all uniforms pre-configured. Keep an array of all created materials so uniforms can be bulk-updated each frame based on toggle state.

Set `side: THREE.DoubleSide` on all materials.

---

## Render Loop

Each frame:

1. Read toggle states from button UI
2. Update all N64 material uniforms
3. Update CRT shader uniforms (time, toggle states)
4. Animate camera orbit, star bob/spin, character bounce
5. If LOW-RES enabled:
   - `renderer.setRenderTarget(rtLow)` → render scene at 320×240
   - `renderer.setRenderTarget(null)` → render CRT quad at container size
6. If LOW-RES disabled:
   - Create temporary full-res render target
   - Render scene to it
   - Swap CRT shader's `tDiffuse` to the hi-res texture
   - Render CRT quad
   - Dispose temporary target
   - Restore `tDiffuse` back to low-res target

---

## Key Technical Notes

- Set `renderer.setPixelRatio(1)` — never use device pixel ratio
- Set `renderer.outputEncoding = THREE.LinearEncoding` — no gamma correction
- Disable shadow maps
- Camera FOV: 60°, near: 0.5, far: 50
- All textures must use NearestFilter — this is non-negotiable for the N64 look
- The Bayer dither matrix must use manual for-loop lookup in GLSL ES (no variable array indexing)
- The "HI-RES" path (LOW-RES off) still applies CRT effects, just at native resolution

---

## Styling

- Background: `#0a0a0a`
- Title bar above render container: `Press Start 2P` font, purple (#8877cc), letter-spacing
- Buttons: dark blue-purple background (#1a1a2e), subtle border, purple text
- Active buttons: brighter background (#3a2a6e), brighter text, accent border (#6655aa)
- The whole page should feel like staring at an old TV in a dark room
