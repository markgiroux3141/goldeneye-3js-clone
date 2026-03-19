# Enemy System Port Plan

Porting the GoldenEye enemy system from `D:\Claude Code Projects\Goldeneye Character Animations`
into the 3DS FPS project. This covers what needs to change, what maps to what, and the
complexity of each piece.

---

## Source → Target Architecture Comparison

| Aspect | GoldenEye Source | 3DS FPS Target |
|--------|-----------------|----------------|
| Language | JavaScript (ES6 modules) | TypeScript (ES6 + Vite) |
| Renderer | Three.js 0.170.0 (CDN) | Three.js 0.182.0 (npm) |
| Physics | Custom raycasting (`Collision.js`) | Rapier3D WASM physics engine |
| Scale | 1000 units = 1 meter | 1 unit = 1 meter |
| Audio | Three.js PositionalAudio | Web Audio API (AudioManager) |
| Entity system | None (loose classes) | Entity → Actor hierarchy + EntityManager |
| Module format | Plain JS, no bundler | TypeScript, Vite bundler |
| Asset loading | GLTFLoader direct | AssetLoader wrapper around GLTFLoader |
| Events | Callback functions on instances | Typed EventBus pub/sub |

---

## What Gets Ported (7 files)

### Direct ports (rewrite to TypeScript, adapt to target architecture)

| Source File | Lines | Target File | Complexity |
|-------------|-------|-------------|------------|
| `Enemy.js` | 1072 | `src/entities/EnemyCharacter.ts` | **High** — largest file, most adaptation needed |
| `EnemyAI.js` | 256 | `src/ai/EnemyAI.ts` | **Medium** — collision/LOS swaps to Rapier |
| `EnemyManager.js` | 280 | `src/entities/EnemyManager.ts` | **Medium** — replaces current `World.spawnEnemy()` |
| `AnimationSet.js` | ~200 | `src/data/AnimationSet.ts` | **Low** — pure data, just add types |
| `WeaponConfig.js` | ~100 | `src/data/EnemyWeaponConfig.ts` | **Low** — pure data, rename to avoid clash |

### Already exist in target (merge/extend, don't duplicate)

| Source Concept | Target Equivalent | Action |
|---------------|-------------------|--------|
| `Collision.js` (slideMove, getGroundHeight, hasLineOfSight) | `PhysicsWorld.ts` + Rapier | **Rewrite** — replace all 3 functions with Rapier raycasts |
| `Level.js` (enemyPlacements) | Level JSON files in `public/levels/` | **Extend** — add enemy placements to existing level data format |
| Enemy health/death | `Actor.ts` (takeDamage, onKilled) | **Reuse** — Actor base class already handles this |
| Entity lifecycle | `EntityManager.ts` | **Reuse** — register/unregister already works |
| Hit detection | `ShootingSystem.ts` | **Reuse** — already raycasts and looks up entities by collider |
| Damage application | `DamageSystem.ts` | **Reuse** — already calls `actor.takeDamage()` |
| Game events | `EventBus.ts` | **Extend** — add enemy-specific event types |

---

## The 6 Major Adaptation Challenges

### 1. Scale Conversion (affects everything)

GoldenEye uses 1000 units = 1 meter. 3DS FPS uses 1 unit = 1 meter.

**Every constant must be divided by 1000:**

| Constant | GoldenEye | 3DS FPS |
|----------|-----------|---------|
| Character height | 1800 | 1.8 |
| Ground offset | 1080 | 1.08 |
| Eye height | 1600 | 1.6 |
| Walk speed | 1500/sec | 1.5/sec |
| Run speed | 4000/sec | 4.0/sec |
| Detection range | 12000 | 12.0 |
| Attack range | 6000 | 6.0 |
| Wall collision radius | 200 | 0.2 |
| Arrival threshold | 100 | 0.1 |
| Damage paint radius | 300 | 0.3 |

**Approach:** Create a `SCALE` constant (0.001) and apply it during the port. Do NOT try to do runtime conversion — just convert all the hardcoded values once.

**Complexity:** Low per-value, but high risk of missing one. There are ~30 numeric constants scattered across Enemy.js, EnemyAI.js, and AnimationSet.js.

---

### 2. Physics: Custom Raycasting → Rapier3D

The source uses `Collision.js` (custom Three.js raycasting). The target uses Rapier3D.

**Three functions to replace:**

**a) `Collision.slideMove(position, velocity, wallMeshes, radius)` → Rapier character controller**

Source does dual-height raycasting + axis decomposition for wall sliding. The target already has a `KinematicCharacterController` that handles this natively.

- Current enemies use `Fixed` rigid bodies (can't move)
- Need to change to `KinematicPositionBased` rigid bodies
- Use `physicsWorld.characterController.computeColliderMovement()` or create a second character controller for enemies
- Then `rigidBody.setNextKinematicTranslation()`

**Complexity:** Medium. The character controller API is already used by `PlayerController.ts` — follow the same pattern. May need one character controller per enemy, or a shared one updated sequentially.

**b) `Collision.getGroundHeight(position, groundMeshes)` → Rapier raycast down**

Source raycasts down from above the character. In Rapier:
```typescript
const ray = new RAPIER.Ray({ x, y: y + 1, z }, { x: 0, y: -1, z: 0 });
const hit = world.castRay(ray, 5.0, true);
if (hit) groundY = y + 1 - hit.timeOfImpact;
```

**Complexity:** Low — straightforward Rapier raycast.

**c) `Collision.hasLineOfSight(from, to, wallMeshes)` → Rapier raycast**

Source raycasts between two points checking for wall occlusion. In Rapier:
```typescript
const dir = to.clone().sub(from).normalize();
const dist = from.distanceTo(to);
const ray = new RAPIER.Ray(from, dir);
const hit = world.castRay(ray, dist, true, undefined, undefined, enemyCollider);
return !hit || hit.timeOfImpact >= dist - 0.1;
```

**Complexity:** Low — but need to exclude the enemy's own collider from the raycast.

---

### 3. Audio: Three.js PositionalAudio → AudioManager

The source uses Three.js `PositionalAudio` (spatial, WebAudio-backed, attached to 3D objects). The target uses a flat `AudioManager` (no spatial positioning).

**What changes:**

| Source Pattern | Target Pattern |
|---------------|----------------|
| `new THREE.PositionalAudio(listener)` | `audioManager.play(url, volume)` |
| `sound.setRefDistance(2000)` | Not needed (no spatial audio) |
| Audio pool of 3 sounds per weapon | Just call `audioManager.play()` (creates new source each time) |
| `this.group.add(sound)` | Not needed |
| `sound.isPlaying` / `sound.stop()` | Not tracked |
| `_painAudioPool[]` / `_impactAudioPool[]` | Just play directly, no pool needed |

**Approach:** Replace all PositionalAudio code with `audioManager.play(url)` calls. The AudioManager is simpler — no pooling, no spatial, just fire-and-forget.

**Future:** Could upgrade AudioManager to support spatial audio later (Web Audio API panner nodes), but that's out of scope for the port.

**Complexity:** Low — the target API is simpler, so this is a removal of complexity.

**Asset paths:** Sound files need to be copied to `public/sounds/enemies/` and referenced with `/sounds/enemies/` paths (Vite serves from `public/`).

---

### 4. Entity Architecture: Standalone → Actor Hierarchy

The source `Enemy.js` is a standalone class managing its own health, state, death, and cleanup. The target has an `Actor` base class that already handles health, damage, death events, and faction.

**What to reuse from Actor:**
- `health`, `maxHealth`, `takeDamage(amount, source)` — already works
- `onKilled(killer)` — already emits `entity-killed` event
- `isDead()` — already works
- `faction: 'enemy'` — already works
- `collider` reference — already works with EntityManager collider lookups
- `eventBus` — for game-wide events

**What to bring from Enemy.js (build on top of Actor):**
- GLB model loading + SkeletonUtils cloning
- Skeletal animation (AnimationMixer, clip caching, crossfading)
- Weapon attachment to bones
- Fire timing system (FIRE_TIMING windows)
- Movement state machine (idle/moving/action/dead)
- Vertex color damage painting
- Death animation + fade-out sequence
- Muzzle flash

**What to adapt:**
- `Enemy.health` → use `Actor.health` (inherited)
- `Enemy.die()` → override `Actor.onKilled()` to play death animation, then call cleanup
- `Enemy.takeDamage(intersection)` → split into two:
  - `Actor.takeDamage(amount)` handles the health math (already exists)
  - New `onHit(hitPoint, hitNormal)` method handles zone detection, damage painting, hit reaction animation
- Shot callbacks (`onShot`) → emit via EventBus instead of callback arrays
- Death callbacks (`onDeath`) → already handled by EventBus `entity-killed`

**The tricky part:** Enemy.js `takeDamage` takes a Three.js raycast intersection (with face/bone data for hit zones). But the 3DS FPS uses Rapier raycasts which return `HitResult { point, normal, colliderHandle, distance }` — no bone/face information.

**Options for hit zones:**
1. **Skip hit zones initially** — all hits do base damage. Simplest port.
2. **Secondary Three.js raycast** — after Rapier confirms a hit on an enemy collider, do a Three.js `Raycaster.intersectObject()` on the enemy's SkinnedMesh to get bone data. This preserves the full zone system.
3. **Height-based zones** — use `hitPoint.y - enemy.position.y` to estimate head/torso/legs. Approximate but simple.

**Recommendation:** Option 1 for initial port, then add option 2 later.

**Complexity:** High — this is the most architectural work. Need to carefully split Enemy.js responsibilities between the Actor base class and the new EnemyCharacter class.

---

### 5. Physics Bodies: Fixed → Kinematic

Current `EnemyActor.ts` creates a `Fixed` rigid body (can't move). The ported enemies need to walk around with collision.

**Changes needed:**
- Change `physicsWorld.createFixedBody()` → `physicsWorld.createKinematicBody()`
- Each frame, compute desired movement, then call `rigidBody.setNextKinematicTranslation(newPos)`
- For wall collision during movement, either:
  - **(a)** Create a character controller per enemy (expensive but accurate) — same as player
  - **(b)** Use `world.castRay()` to check movement direction before applying (simpler)
  - **(c)** Use `world.moveCharacter()` with the existing character controller sequentially per enemy

**Recommendation:** Option (c) — reuse the physics world's character controller. Update each enemy sequentially in the update loop. The player controller already does exactly this pattern. For 10-12 enemies at 60Hz this is fine.

**Complexity:** Medium — need to understand Rapier's kinematic body + character controller interaction.

---

### 6. Animation System: Already Built, Just Needs Wiring

The Three.js `AnimationMixer` / `AnimationAction` system used in Enemy.js works identically in the target project (same Three.js, same GLB format). The animation code can transfer almost 1:1.

**What transfers directly:**
- `_clipCache` (module-level animation cache)
- `_loadClip()` (load GLB, extract clip, cache it)
- `_playClip()` (create action, crossfade from previous)
- `_playLocomotion()` / `_playIdle()` (speed-based animation selection)
- `FIRE_TIMING` windows and fire-during-animation logic
- Death animation + fade-out

**What needs minor adaptation:**
- Asset paths: `assets/animations/XX.glb` → `/models/enemies/animations/XX.glb`
- The `SkeletonUtils.clone()` import path changes slightly (npm vs CDN)

**Complexity:** Low — this is the most direct part of the port.

---

## Proposed File Structure in 3DS FPS

```
src/
├── entities/
│   ├── EnemyCharacter.ts      # Port of Enemy.js (extends Actor)
│   ├── EnemyManager.ts        # Port of EnemyManager.js
│   └── EnemyActor.ts          # DELETE (replaced by EnemyCharacter)
│
├── ai/
│   └── EnemyAI.ts             # Port of EnemyAI.js
│
├── data/
│   ├── AnimationSet.ts        # Port of AnimationSet.js (pure data + types)
│   └── EnemyWeaponConfig.ts   # Port of WeaponConfig.js enemy weapon stats
│
└── core/
    └── World.ts               # Modify: use EnemyManager instead of direct spawning

public/
├── models/
│   └── enemies/
│       ├── characters/        # 45 character GLBs (copy from GoldenEye assets/)
│       ├── animations/        # 170+ animation GLBs
│       └── weapons/           # 4 weapon sets (gun.glb + muzzle.glb each)
│
├── sounds/
│   └── enemies/
│       ├── pain-1.wav ... pain-26.wav
│       └── bullet-hit.wav
│
└── levels/
    └── level-facility.json    # Extend with enemyPlacements[]
```

---

## Implementation Order (8 phases)

### Phase 1: Assets & Data (Low complexity)
Copy assets and port pure data files.

1. Copy character GLBs, animation GLBs, enemy weapon GLBs, and sound files to `public/models/enemies/` and `public/sounds/enemies/`
2. Port `AnimationSet.js` → `src/data/AnimationSet.ts` (add TypeScript types, update paths from `assets/` to `/models/enemies/`)
3. Port `WeaponConfig.js` → `src/data/EnemyWeaponConfig.ts` (add types, scale weapon positions by 0.001)
4. Update all scale constants (÷1000)

**Estimated effort:** Small. Mostly copy-paste + find-replace on paths and scale values.

---

### Phase 2: EnemyCharacter base (High complexity)
Port the core Enemy class onto the Actor hierarchy.

1. Create `src/entities/EnemyCharacter.ts` extending `Actor`
2. Port model loading: `spawn()` and `spawnFromClone()` using `AssetLoader` / `SkeletonUtils`
3. Port animation system: `_clipCache`, `_loadClip`, `_playClip`, crossfading, `AnimationMixer`
4. Port movement state machine: `idle` / `moving` / `action` / `dead`
5. Port weapon attachment: bone finding, GLB loading for guns + muzzle flash
6. Port fire timing: `FIRE_TIMING` windows, shot callbacks → EventBus events
7. Port death sequence: death animation + fade-out, override `onKilled()`
8. Replace `Collision.slideMove()` with Rapier kinematic body movement
9. Replace `Collision.getGroundHeight()` with Rapier downward raycast
10. Replace Three.js PositionalAudio with AudioManager calls
11. Wire up Rapier collider (kinematic capsule) + register with EntityManager

**Key decisions:**
- `takeDamage()`: Use Actor's health system. Add `onHit()` for visual effects (damage paint, hit reaction anim). Skip bone-based hit zones initially.
- Movement: Use kinematic body + character controller (follow PlayerController pattern)
- Audio: Simple `audioManager.play()` calls, no pooling

**Estimated effort:** Large. This is the bulk of the work — ~600-700 lines of TypeScript adapting the 1072-line Enemy.js.

---

### Phase 3: EnemyAI (Medium complexity)
Port the AI state machine.

1. Create `src/ai/EnemyAI.ts`
2. Port state machine: idle → alert → chase → attack → cooldown
3. Replace `Collision.hasLineOfSight()` with Rapier raycast (exclude enemy's own collider)
4. Port detection cone, accuracy roll, distance falloff
5. Adapt `_distToTarget()` and `_angleToTarget()` (these transfer directly, just scale)
6. Wire `onHit` / `onAlert` to EventBus events instead of direct callbacks
7. AI fire command: call `enemyCharacter.fire(animId)` same as source

**Estimated effort:** Medium. The state machine logic is clean and mostly transfers. The main work is swapping collision queries to Rapier.

---

### Phase 4: EnemyManager (Medium complexity)
Port the manager with model cache and budget.

1. Create `src/entities/EnemyManager.ts`
2. Port model pre-loading cache (`SkeletonUtils.clone()` pattern)
3. Port budget system (`maxActive`, dormant placements)
4. Port `loadLevel()` — reads placement data, spawns enemies
5. Port `update()` — single-call update loop for all enemies + AIs
6. Port query helpers: `getAlive()`, `getNearest()`, `getInRadius()`
7. Port death cleanup + dormant activation
8. Integrate with existing `EntityManager` (register each enemy on spawn)

**Estimated effort:** Medium. The manager logic is straightforward. Main adaptation is wiring into World.ts and EntityManager.

---

### Phase 5: Level Integration (Low complexity)
Add enemy placements to level data.

1. Extend level JSON format with `enemyPlacements[]` array
2. Add placement data to `level-facility.json` (and other levels as desired)
3. Modify `World.ts` to create `EnemyManager` and call `loadLevel()`
4. Wire EnemyManager into `World.update()` loop
5. Extend `EventBus` `GameEvents` with enemy-specific events:
   - `'enemy-alert'`: enemy spotted player
   - `'enemy-attack'`: enemy firing
   - `'all-enemies-dead'`: level clear

**Estimated effort:** Small. Mostly config/wiring.

---

### Phase 6: Shooting Integration (Low complexity)
Connect player shooting to the new enemy system.

1. `ShootingSystem` already raycasts and returns `HitResult`
2. `WeaponSystem` already calls `damageSystem.applyDamage()` on hit actors
3. `EnemyCharacter` extends `Actor` so `takeDamage()` already works
4. Add visual hit feedback: on `entity-damaged` event, call `enemy.onHit(point)` for damage paint + hit reaction animation
5. On `entity-killed`, the death animation + fade-out triggers automatically

**This should mostly work out of the box** since EnemyCharacter extends Actor and is registered with EntityManager. The existing weapon → damage → entity pipeline handles it.

**Estimated effort:** Small. May need a listener on `entity-damaged` to trigger visual effects.

---

### Phase 7: HUD & Feedback (Low complexity)

1. Add enemy health bar to HUD (optional — GoldenEye didn't show enemy health)
2. Add hit marker flash on successful hits
3. Add "enemy spotted you" alert
4. Wire `entity-killed` event to kill counter or level-clear logic

**Estimated effort:** Small. DOM overlay work.

---

### Phase 8: Polish & Testing

1. Tune scale values (movement speeds, detection ranges) for the levels
2. Test pathfinding through doors and corridors
3. Tune AI accuracy and damage for difficulty
4. Test model cache: verify only 1 GLB load per unique character
5. Test budget: spawn more enemies than budget, verify dormant system works
6. Test death: animation plays, fade-out, cleanup, no memory leaks
7. Performance profiling: 10-12 enemies with animations + physics at 60fps

---

## Complexity Summary

| Phase | Description | Complexity | Estimated Lines |
|-------|-------------|------------|----------------|
| 1 | Assets & Data | Low | ~300 (data files) |
| 2 | EnemyCharacter | **High** | ~700 |
| 3 | EnemyAI | Medium | ~300 |
| 4 | EnemyManager | Medium | ~350 |
| 5 | Level Integration | Low | ~50 (config + wiring) |
| 6 | Shooting Integration | Low | ~30 |
| 7 | HUD & Feedback | Low | ~50 |
| 8 | Polish & Testing | Medium | ~0 (tuning) |
| **Total** | | | **~1,780 new lines** |

---

## Risk Areas

1. **SkeletonUtils.clone() + Rapier** — Cloned skinned meshes need their own physics colliders. Need to verify that collider creation works with cloned geometry.

2. **Character controller sharing** — Using one Rapier `KinematicCharacterController` for N enemies sequentially may have ordering issues. If so, need one controller per enemy (~small memory cost).

3. **Animation mixer + N64 shader system** — The N64 graphics system (`N64Material.ts`) swaps materials to custom shaders. Need to verify this works with SkinnedMesh + vertex colors for damage painting. May need to add vertex color support to the N64 shader.

4. **Scale errors** — Missing a ÷1000 somewhere will cause enemies to be invisible (too tiny) or giant, or move at wrong speeds. Need systematic conversion.

5. **Asset size** — 45 character GLBs + 170 animation GLBs = significant download. For web delivery, may want to only include a subset initially (e.g., 5-6 characters + the animations actually used by AI).
