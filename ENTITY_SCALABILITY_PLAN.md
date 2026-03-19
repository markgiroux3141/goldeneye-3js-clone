# Entity System Scalability Refactor

## Problem

The current entity system is hardcoded around doors. Adding new object types (consoles, keycards, destructibles, drone guns, alarms, cameras, pickups) requires touching 5+ files and duplicating large chunks of DoorManager/DoorEntity logic. This plan refactors the system so adding a new object type is self-contained.

## Current State Assessment

### What's Already Generic (Keep As-Is)
- **`Entity.ts`** — Minimal base class (id, position, rotation, active, update, dispose)
- **`Actor.ts`** — Health/faction for living things. Doors correctly don't extend this.
- **`EntityManager.ts`** — Generic collection with collider registry, update loop, disposal
- **`EventBus.ts`** — Typed pub/sub. Door events are just interface entries, easy to extend.
- **`PlaceableDefinition.ts`** — Generic editor definition interface with spawn/remove callbacks
- **`LevelData.ts`** — Serialization is `{type: string, config: Record<string, unknown>}` — fully generic

### What's Hardcoded to Doors (Needs Refactoring)

| File | Problem |
|------|---------|
| `World.ts` | Has `readonly doorManager: DoorManager` as a direct field. `update()` calls `doorManager.updateAll()` with door-specific args. Each new type would need its own manager field. |
| `Game.ts` (lines ~273-304) | Object loading does `if (obj.type.startsWith('door-'))` with manual config casting. Each new type needs another if-block. |
| `DoorManager.ts` | Handles model caching, spawning, interaction detection (closest entity + E key), update loops — all door-specific. 70% would be duplicated per new type. |
| `DoorEntity.ts` | State machine, animation, physics sync, sound — all embedded in one 377-line class. No reusable patterns extracted. |

---

## Refactoring Plan

### Phase 1: InteractionSystem (Extract from DoorManager)

**Goal:** Generic "find closest interactable, press E" system that any entity can opt into.

**New file: `src/systems/InteractionSystem.ts`**

```typescript
export interface Interactable {
  readonly interactionRadius: number;
  getWorldPosition(): { x: number; y: number; z: number };
  canInteract(): boolean;  // e.g., door returns true when closed or open (not mid-animation)
  interact(): void;
}

export class InteractionSystem {
  private interactables = new Set<Interactable>();
  private prevInteract = false;

  register(obj: Interactable): void { ... }
  unregister(obj: Interactable): void { ... }

  update(playerPos: {x,y,z}, interactPressed: boolean): void {
    const justPressed = interactPressed && !this.prevInteract;
    this.prevInteract = interactPressed;
    if (!justPressed) return;

    // Find closest interactable within range
    let closest: Interactable | null = null;
    let closestDist = Infinity;
    for (const obj of this.interactables) {
      if (!obj.canInteract()) continue;
      const pos = obj.getWorldPosition();
      const dist = distance(playerPos, pos);
      if (dist < obj.interactionRadius && dist < closestDist) {
        closest = obj;
        closestDist = dist;
      }
    }
    if (closest) closest.interact();
  }
}
```

**Changes to DoorManager:** Remove `updateAll()`'s interaction detection logic (lines 85-113). DoorEntity implements `Interactable` interface instead.

**Changes to DoorEntity:** Add `implements Interactable`:
- `interactionRadius` → already has `triggerRadius`
- `getWorldPosition()` → return from pivot group world position
- `canInteract()` → `return this.state === 'closed' || this.state === 'open'`
- `interact()` → already exists

**Changes to World.ts:** Add `readonly interactionSystem = new InteractionSystem()`. In `update()`, call `this.interactionSystem.update(pos, interact)` instead of `this.doorManager.updateAll(pos, interact)`.

**Impact on DoorManager:** `updateAll()` becomes just the player position setter loop (for auto-close timer). Or remove it entirely and have DoorEntity query player position from World when needed.

---

### Phase 2: Generic Object Spawning (Refactor World + Game.ts)

**Goal:** `world.spawnObject(type, config)` that routes to the right factory, replacing hardcoded door dispatch.

**New file: `src/entities/ObjectRegistry.ts`**

```typescript
export interface ObjectSpawner {
  /** Preload any shared assets (models, sounds) needed by this type */
  preload?(config: Record<string, unknown>, assetLoader: AssetLoader): Promise<void>;
  /** Create and return the entity */
  spawn(world: World, config: Record<string, unknown>): Promise<Entity>;
  /** Clean up an entity of this type */
  remove(world: World, entity: Entity): void;
}

const registry = new Map<string, ObjectSpawner>();

export function registerSpawner(typePrefix: string, spawner: ObjectSpawner): void { ... }
export function getSpawner(type: string): ObjectSpawner | undefined { ... }
```

**Door spawner registration (in a new `src/entities/spawners/DoorSpawner.ts`):**

```typescript
import { registerSpawner } from '../ObjectRegistry';

registerSpawner('door', {
  async preload(config, assetLoader) {
    // Preload model + sounds from config
  },
  async spawn(world, config) {
    return world.doorManager.spawnDoor(config as DoorConfig);
  },
  remove(world, entity) {
    world.doorManager.removeDoor(entity as DoorEntity);
  }
});
```

**Changes to Game.ts (lines ~273-304):** Replace the hardcoded door if-block:

```typescript
// BEFORE (hardcoded):
for (const obj of this.levelData.objects) {
  if (obj.type.startsWith('door-')) {
    // ... manual DoorConfig casting
  }
}

// AFTER (generic):
for (const obj of this.levelData.objects) {
  const spawner = getSpawner(obj.type);
  if (spawner) {
    if (spawner.preload) await spawner.preload(obj.config, assetLoader);
    await spawner.spawn(this.world, obj.config);
  }
}
```

**Changes to World.ts:** Add a generic spawn method:

```typescript
async spawnObject(type: string, config: Record<string, unknown>): Promise<Entity | null> {
  const spawner = getSpawner(type);
  if (!spawner) { console.warn(`Unknown object type: ${type}`); return null; }
  return spawner.spawn(this, config);
}
```

The existing `spawnDoor()` and `spawnDoors()` methods can stay as convenience wrappers during transition, but new code uses `spawnObject()`.

---

### Phase 3: Model Cache Service (Extract from DoorManager)

**Goal:** Shared model caching so any object type can preload and clone GLBs.

**New file: `src/core/ModelCache.ts`**

```typescript
export class ModelCache {
  private cache = new Map<string, THREE.Group>();

  constructor(private assetLoader: AssetLoader) {}

  async preload(urls: string[]): Promise<void> {
    await Promise.all(urls.map(async (url) => {
      if (this.cache.has(url)) return;
      this.cache.set(url, await this.assetLoader.loadGLTF(url));
    }));
  }

  clone(url: string): THREE.Group {
    const cached = this.cache.get(url);
    if (!cached) throw new Error(`Model not preloaded: ${url}`);
    return cached.clone();
  }

  clear(): void { this.cache.clear(); }
}
```

**Changes to DoorManager:** Replace private `modelCache` with shared `ModelCache` instance (injected via constructor or accessed from World).

**Impact:** Consoles, cameras, pickups, etc. all use the same cache. No duplicate preload logic.

---

### Phase 4: Event Wiring for Object Interactions

**Goal:** Data-driven connections like "console_001 activates → door_003 unlocks".

**Approach: Add a `triggers` field to LevelData objects:**

```json
{
  "id": "console_001",
  "type": "console",
  "config": { "position": {...} },
  "triggers": [
    { "event": "activated", "targetId": "door_003", "action": "unlock" }
  ]
}
```

**New file: `src/systems/TriggerSystem.ts`**

```typescript
export interface Triggerable {
  readonly entityId: string;
  onTrigger(action: string, sourceId: string): void;
}

export class TriggerSystem {
  private targets = new Map<string, Triggerable>();
  private bindings: { sourceId: string; event: string; targetId: string; action: string }[] = [];

  registerTarget(entity: Triggerable): void { ... }
  addBinding(sourceId, event, targetId, action): void { ... }

  // Called by source entities when they fire an event
  fire(sourceId: string, event: string): void {
    for (const b of this.bindings) {
      if (b.sourceId === sourceId && b.event === event) {
        this.targets.get(b.targetId)?.onTrigger(b.action, sourceId);
      }
    }
  }
}
```

**DoorEntity changes:** Implement `Triggerable` with `onTrigger('unlock', ...)` that changes a locked state.

This mirrors GoldenEye's setup file approach where objects reference each other by ID.

---

### Phase 5: Blender → JSON Pipeline (Object Placement Automation)

**Goal:** Auto-generate `level-*.json` object entries from named meshes in GLB files.

**New file: `scripts/extract-objects.mjs`**

This Node.js script:
1. Loads a GLB (like `facility test objects.glb`) using `@gltf-transform/core`
2. Iterates all nodes, matching names against conventions:
   - `door_sliding_*` → door-brown-sliding config
   - `door_swinging_*` → door-grey-swinging config
   - `console_*` → console config
   - `guard_*` → enemy-guard config
   - `pickup_*` → pickup config
3. Extracts world position, rotation, scale from each node's transform
4. Applies the level's modelScale conversion
5. Outputs JSON matching the `PlacedObjectData[]` format
6. Merges into existing `level-*.json` or writes a new one

**Naming convention table:**

| Blender Name Prefix | Maps To Type | Config Extracted |
|---------------------|-------------|-----------------|
| `door_sliding` | `door-brown-sliding` | position, Y rotation, scale |
| `door_swinging` | `door-grey-swinging` | position, Y rotation, hingeSide from X-flip |
| `door_bathroom` | `door-bathroom` | position, Y rotation, scale |
| `console` | `console` | position, Y rotation |
| `guard` | `enemy-guard` | position, Y rotation |
| `camera` | `security-camera` | position, rotation (full) |
| `alarm` | `alarm` | position |
| `pickup_pp7` | `pickup-pp7` | position |
| `pickup_ammo` | `pickup-ammo` | position |
| `destructible` | `destructible` | position, scale |

**Usage:**
```bash
node scripts/extract-objects.mjs --input "glb-objects/facility test objects/facility test objects.glb" --scale 0.009375 --output public/levels/level-facility.json
```

---

## Implementation Order

The phases are independent but build on each other. Recommended order:

1. **Phase 3: ModelCache** — Small, self-contained, immediately useful. Cleans up DoorManager.
2. **Phase 1: InteractionSystem** — Enables any entity to be interactable. Prerequisite for consoles, pickups, etc.
3. **Phase 2: ObjectRegistry + Generic Spawn** — The big payoff. After this, adding a new type is: write entity class + register spawner + done.
4. **Phase 5: Blender Extract Script** — Automates placement from your test objects GLB. Can be done any time.
5. **Phase 4: TriggerSystem** — Only needed once you have objects that interact with each other (console unlocks door). Can defer until consoles are implemented.

## Adding a New Object Type (Post-Refactor)

After all phases, adding e.g. a security camera requires:

1. **`src/entities/SecurityCameraEntity.ts`** — Extends Entity, implements Interactable + Triggerable
2. **`src/entities/spawners/CameraSpawner.ts`** — Registers with ObjectRegistry, handles preload/spawn/remove
3. **`src/editor/definitions/CameraDefinitions.ts`** — Editor UI properties and preview
4. **Name it in Blender** — `camera_001`, run extract script

No changes to World.ts, Game.ts, or any other existing files.

## Files Summary

### New Files
| File | Purpose |
|------|---------|
| `src/systems/InteractionSystem.ts` | Generic "closest interactable + E key" |
| `src/entities/ObjectRegistry.ts` | Type→spawner registry + generic spawn dispatch |
| `src/entities/spawners/DoorSpawner.ts` | Door-specific spawner (extracted from Game.ts) |
| `src/core/ModelCache.ts` | Shared GLB preload + clone cache |
| `src/systems/TriggerSystem.ts` | Data-driven inter-object event wiring |
| `scripts/extract-objects.mjs` | Blender GLB → level JSON object extraction |

### Modified Files
| File | Change |
|------|--------|
| `src/core/World.ts` | Add InteractionSystem + TriggerSystem. Add generic `spawnObject()`. Keep DoorManager for now. |
| `src/Game.ts` | Replace hardcoded door if-block with ObjectRegistry loop |
| `src/entities/DoorManager.ts` | Remove interaction detection (moved to InteractionSystem). Use shared ModelCache. |
| `src/entities/DoorEntity.ts` | Implement `Interactable` + `Triggerable` interfaces |
| `src/editor/LevelData.ts` | Add optional `triggers` field to `PlacedObjectData` |
| `src/core/EventBus.ts` | Add new event types as needed (console-activated, alarm-triggered, etc.) |

### Unchanged Files
| File | Why |
|------|-----|
| `src/entities/Entity.ts` | Already generic |
| `src/entities/Actor.ts` | Already generic (health/faction for living things) |
| `src/entities/EntityManager.ts` | Already generic |
| `src/editor/PlaceableDefinition.ts` | Already generic |
| `src/editor/PlacementSystem.ts` | Already generic |
