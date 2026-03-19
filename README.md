# 3DS FPS

A browser-based first-person shooter with N64/GoldenEye-style retro graphics. Built with Three.js + Rapier3D + TypeScript + Vite. Features hitscan weapons, kinematic character physics, swinging/sliding doors, custom GLSL shaders for N64 graphical effects (affine texturing, vertex jitter, color quantization), CRT post-processing, and N64 USB controller support.

> **Note:** Despite the repo name, this is not a Nintendo 3DS project. It's a browser-based 3D FPS inspired by N64-era shooters.

## Quick Start

```bash
npm install
npm run dev        # Dev server with HMR
npm run build      # TypeScript + Vite production build
npm run preview    # Preview production build
```

**Level modes via URL params:**
- `http://localhost:5173/` — Procedural starter room (default)
- `http://localhost:5173/?level=facility` — Load facility level
- `http://localhost:5173/?level=sandbox` — Flat plane with all door variants (testing)

## Tech Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| 3D Rendering | Three.js | 0.182.0 |
| Physics | Rapier3D (WASM) | 0.19.3 |
| Language | TypeScript (strict) | 5.7.0 |
| Bundler | Vite | 6.0.0 |
| Shaders | Custom GLSL | — |
| Audio | Web Audio API | Native |
| Input | Keyboard/Mouse + Gamepad API | Native |

## Project Structure

```
src/
├── main.ts                          Entry point: RAPIER init → Game creation → start
├── Game.ts                          Main orchestrator: wires all subsystems, runs game loop
│
├── core/
│   ├── Engine.ts                    Three.js WebGLRenderer wrapper (scene, camera, shadows)
│   ├── GameLoop.ts                  Fixed-timestep loop at 60 Hz (accumulator-based)
│   ├── InputManager.ts              Keyboard/mouse state tracking, pointer lock
│   ├── GamepadManager.ts            N64 USB controller: analog stick, C-buttons, aim mode
│   ├── AssetLoader.ts               GLTF and texture loading wrappers
│   ├── EventBus.ts                  Typed pub/sub event system
│   └── World.ts                     Entity + door management, per-frame update orchestration
│
├── player/
│   ├── FPSCamera.ts                 Mouse-look with YXZ Euler rotation, pointer lock
│   └── PlayerController.ts          WASD movement, jumping, gravity, Rapier kinematic capsule
│
├── physics/
│   ├── PhysicsWorld.ts              Rapier3D world wrapper, character controller config
│   └── ColliderFactory.ts           Trimesh (GLB) and cuboid (procedural) collider generation
│
├── entities/
│   ├── Entity.ts                    Base: id, position, rotation, active flag
│   ├── Actor.ts                     Extends Entity: health, faction, takeDamage()
│   ├── PlayerActor.ts               Player entity binding PlayerController + FPSCamera
│   ├── EnemyActor.ts                Enemy with red capsule mesh (placeholder AI)
│   ├── EntityManager.ts             Entity registry + collider-handle-to-entity mapping
│   ├── DoorEntity.ts                Swinging/sliding door with state machine + physics sync
│   └── DoorManager.ts               Door spawning, model/sound caching, proximity triggers
│
├── weapons/
│   ├── WeaponConfig.ts              4 weapon stat definitions (PP7, RCP90, AR33, KF7)
│   ├── WeaponSystem.ts              Weapon switching, ammo, reload state, HUD updates
│   ├── WeaponViewmodel.ts           First-person gun model: bob, sway, recoil, reload anim
│   ├── ShootingSystem.ts            Raycast firing, hit detection, damage + decal spawning
│   └── BulletDecalManager.ts        Bullet hole decals (ring buffer, atlas variants)
│
├── n64/
│   ├── N64GraphicsSystem.ts         N64 effect orchestrator: material swap, render targets
│   ├── N64Material.ts               Converts Three.js materials → N64 shader materials
│   ├── N64Shaders.ts                Vertex/fragment GLSL: affine UV, vertex jitter, dither
│   ├── CRTPostProcess.ts            CRT scanline + curvature post-processing
│   ├── CRTShaders.ts                CRT distortion GLSL shaders
│   └── N64SettingsUI.ts             Toggle panel for 9 individual N64 effects
│
├── world/
│   ├── LevelLoader.ts               GLB loading + procedural generation + trimesh colliders
│   ├── Lighting.ts                  Ambient + directional + hemisphere light setup
│   └── StarterRoomMaterials.ts      PBR material definitions for procedural room
│
├── systems/
│   └── DamageSystem.ts              Damage application logic
│
├── audio/
│   └── AudioManager.ts              Web Audio API: load, cache, play sounds
│
├── ui/
│   └── HUD.ts                       DOM-based ammo counter + reload indicator
│
└── tools/
    ├── DoorPlacer.ts                F9: interactive door placement/config tool
    └── DecalFixer.ts                Console tools for z-fighting decal repair

public/
├── models/
│   ├── doors/                       Door GLB models (grey-swinging, brown-sliding, bathroom)
│   ├── levels/                      Level GLB models (facility-old-sep.glb)
│   └── weapons/                     Weapon + muzzle flash GLBs per weapon type
├── textures/misc/crosshairs.png     Crosshair sprite
├── sounds/                          WAV: gunshots, reload, empty click, door sounds
└── music/                           Background music (102 Facility.mp3)
```

## Architecture Overview

### Initialization Flow

```
index.html
  └── <script src="/src/main.ts">
        ├── Parse URL params (?level=procedural|facility|sandbox)
        ├── RAPIER.init() — initialize WASM physics
        ├── new Game()
        ├── game.init()
        │     ├── Engine (Three.js renderer, scene, camera)
        │     ├── InputManager (keyboard/mouse)
        │     ├── GamepadManager (N64 controller)
        │     ├── PhysicsWorld (Rapier3D)
        │     ├── FPSCamera (pointer lock, mouse-look)
        │     ├── PlayerController (capsule, movement)
        │     ├── LevelLoader (load level geometry + colliders)
        │     ├── World (entity manager, door manager)
        │     ├── WeaponSystem (4 weapons, viewmodels, ammo)
        │     ├── N64GraphicsSystem (shader effects)
        │     └── EventBus listeners (damage, kills)
        └── game.start() → GameLoop begins
```

### Per-Frame Update Order

```
requestAnimationFrame →
  ├── Poll input (keyboard, mouse, gamepad)
  ├── [Fixed timestep loop @ 60 Hz, accumulator-based]
  │     ├── FPSCamera.update(mouseDX, mouseDY)
  │     ├── PlayerController.update(dt)  — movement, jumping, gravity
  │     ├── World.update(dt)             — entities + doors
  │     ├── WeaponSystem.update(dt)      — fire, reload, animation
  │     ├── PhysicsWorld.step()          — Rapier simulation
  │     └── DamageSystem / EventBus      — process events
  └── Render
        ├── N64GraphicsSystem.render() OR Engine.render()
        │     (low-res target → N64 shaders → CRT post-process → screen)
        └── WeaponViewmodel rendered as overlay (separate scene + camera)
```

### Entity Hierarchy

```
Entity (base: id, position, rotation, active)
├── Actor (health, maxHealth, faction, takeDamage())
│   ├── PlayerActor — wraps PlayerController + FPSCamera
│   └── EnemyActor — red capsule mesh, static physics body
└── DoorEntity — swinging/sliding state machine, kinematic physics body
```

## Core Systems

### Player Controller (`src/player/PlayerController.ts`)
- **Collider:** Kinematic capsule — 0.3m radius, 0.6m half-height
- **Movement:** 8 m/s (WASD or analog stick)
- **Jump:** 6 m/s initial velocity, custom gravity -20 m/s²
- **Eye height:** 0.7m above capsule center
- **Grounding:** Rapier's `computedGrounded()` after `computeColliderMovement()`

### FPS Camera (`src/player/FPSCamera.ts`)
- **Rotation order:** YXZ Euler (yaw on Y, pitch on X)
- **Sensitivity:** 0.002 rad/pixel
- **Pitch clamp:** ±90 degrees
- **Auto-level:** Smooth pitch return toward zero while moving (GoldenEye-style)
- **Pointer lock:** Requested on mouse click, input only processed while locked

### Physics (`src/physics/PhysicsWorld.ts`)
- **World gravity:** (0, -9.81, 0)
- **Character controller:** auto-step 0.4m height, max slope 50°, min slide slope 30°, snap-to-ground 0.5m
- **Level colliders:** Trimesh from GLB geometry, cuboids for procedural boxes — all on a single shared static rigid body
- **Player collider:** Kinematic position-based
- **Enemy colliders:** Fixed rigid bodies with capsules (0.5m radius, 0.3m height)
- **Door colliders:** Kinematic rigid bodies synced to animation state

### Weapons (`src/weapons/`)

| Weapon | Fire Rate | Magazine | Damage | Range | Model Path |
|--------|-----------|----------|--------|-------|------------|
| PP7 Pistol | 0.4s | 7 | 25 | 100m | `weapons/pp7/` |
| RC-P90 | 0.07s | 80 | 10 | 80m | `weapons/rcp90/` |
| AR33 | 0.1s | 30 | 15 | 100m | `weapons/ar33/` |
| KF7 Soviet | 0.12s | 30 | 15 | 100m | `weapons/kf7/` |

- **Firing:** Hitscan raycast from camera origin through scene
- **Hit detection:** Rapier `castRayAndGetNormal()`, collider handle mapped to entity via EntityManager
- **Viewmodel:** Rendered in separate Three.js scene/camera as overlay (depth-only clear between passes)
- **Weapon switching:** Number keys 1-4, smooth cross-fade
- **Reload:** R key, timer-based with lower/raise animation

### N64 Graphics System (`src/n64/`)
- **Resolution:** 320x240 render target with nearest-neighbor filtering
- **Vertex shader effects:** Affine texture mapping (UV * W), vertex jitter/snapping, per-vertex Gouraud lighting
- **Fragment shader effects:** 4x4 Bayer dithering, 15-bit color quantization (31 levels/channel), distance fog
- **CRT post-process:** Scanlines, barrel distortion, composite video simulation
- **Aspect ratio:** Enforced 4:3 with pillarbox/letterbox
- **Toggle:** 9 individual effect toggles via N64SettingsUI panel
- **Material swapping:** On enable, replaces all MeshStandardMaterial with custom ShaderMaterial; originals stored for restore

### Door System (`src/entities/DoorEntity.ts`, `src/entities/DoorManager.ts`)
- **Types:** Swinging (rotate around hinge) and sliding (translate along axis)
- **State machine:** closed → opening → open → closing → closed
- **Trigger:** Auto-open when player enters radius (default 3m), or manual with B key
- **Physics:** Kinematic rigid body, collider position synced each frame via `setNextKinematicTranslation()`
- **Audio:** Per-door open/close sounds, preloaded and cached

### Audio (`src/audio/AudioManager.ts`)
- Web Audio API with AudioContext + GainNode
- `loadSound(url)` → fetch + decodeAudioData → cached AudioBuffer
- `play(url, volume)` → new AudioBufferSourceNode per call
- Auto-resumes suspended context on user interaction
- No 3D/spatial audio — all sounds play at uniform volume
- Background music via separate HTMLAudioElement (loops, 0.4 volume)

### Event System (`src/core/EventBus.ts`)
Typed pub/sub bus used for decoupling systems:
- `entity-damaged` — when an actor takes damage
- `entity-killed` — when an actor's health reaches zero
- `weapon-fired` — on each weapon discharge
- `door-opened` / `door-closed` — door state transitions

### Input (`src/core/InputManager.ts`, `src/core/GamepadManager.ts`)
- **Keyboard:** Key state map, `isKeyDown(code)`, prevents default on game keys (WASD, Space, R, B, E, Tab)
- **Mouse:** Button state + delta tracking, `consumeMouseDelta()` returns {dx, dy} and resets
- **N64 gamepad:** Analog stick with 0.15 radial deadzone, C-button aim mode with spring physics, stick magnitude > 0.85 triggers camera rotation. Buttons: A=jump, B=fire, Z=reload, R/L=aim toggle

### Level Loading (`src/world/LevelLoader.ts`)
- **Facility mode:** Loads `facility-old-sep.glb` at 0.009375 scale, generates trimesh colliders from all meshes, applies smooth shading via mergeVertices + computeVertexNormals
- **Procedural mode:** Generates a starter room from `StarterRoomMaterials` definitions, cuboid colliders
- **Sandbox mode:** 50x50 flat plane + all 6 door variants in a line

### HUD (`src/ui/HUD.ts`)
- DOM-based (no canvas UI framework)
- Ammo display: bottom-right, "magazine / reserve" format, red when empty
- Reload indicator: yellow "RELOADING..." text
- Debug position: top-left green text showing player XYZ
- Crosshair: static HTML image element at screen center

## Dev Tools

- **Door Placer (F9):** Interactive tool to position/configure doors, exports config objects
- **Decal Fixer (console):** `__scanDecals(offset?)` / `__fixDecals(offset?)` / `__clearDebug()` — find and fix z-fighting bullet decals on GLB levels
- **Window globals:** `__doorPlacer` for door tool access

## Other Documentation

- **[PROJECT-GUIDE.md](PROJECT-GUIDE.md)** — Detailed architecture reference + AI agent HTTP bridge API docs
- **[N64_CONTROLLER_SPEC.md](N64_CONTROLLER_SPEC.md)** — N64 USB adapter button/axis mapping specification
- **[n64-graphics-spec.md](n64-graphics-spec.md)** — Technical breakdown of N64 graphical effects and shader implementation

## Current Limitations

- **No enemy AI** — EnemyActor is a static red capsule placeholder
- **No networking/multiplayer** — single-player only
- **No pause system**
- **No test framework** — testing is manual play-testing
- **No spatial audio** — all sounds play at uniform volume
- **No projectile simulation** — all weapons are instant hitscan

## URL Parameters

```
http://localhost:5173/?level=<level>&mode=<mode>
```

| Parameter | Values | Default | Description |
|-----------|--------|---------|-------------|
| `level` | `procedural`, `sandbox`, `facility`, `dam`, `bunker`, `aztec`, `caverns`, `complex` | `procedural` | Level to load |
| `mode` | `editor` | *(none)* | Enables the level editor |

**Examples:**
```
localhost:5173/                          # Procedural starter room (play mode)
localhost:5173/?level=facility            # Facility level (play mode)
localhost:5173/?level=dam                 # Dam level (play mode)
localhost:5173/?level=sandbox            # Flat sandbox with test doors (play mode)
localhost:5173/?level=facility&mode=editor # Facility level in editor mode
localhost:5173/?level=sandbox&mode=editor # Sandbox in editor mode
```
