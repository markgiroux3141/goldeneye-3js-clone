import type { Component, TransformComponent, MeshComponent, MeshOffset, PrefabComponent } from './Component';
import { serializeComponent } from './Component';
import type { ECSEntity, ECSWorld, EntityId } from './ECSWorld';
import type { PrefabRegistry } from './PrefabRegistry';
import type { PrefabCatalog } from './PrefabCatalog';

// ── Placement JSON format ────────────────────────────────────────────────────

export interface SerializedMeshOffset {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
}

export interface SerializedEntity {
  id: string;
  type: string;
  meshes: string[];
  meshOffsets?: (SerializedMeshOffset | null)[];
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  properties: Record<string, unknown>;
}

export interface PlacementsFile {
  objects: SerializedEntity[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function round4(n: number): number { return Math.round(n * 10000) / 10000; }
function round2(n: number): number { return Math.round(n * 100) / 100; }

// ── Serialize: ECSEntity → placement JSON ────────────────────────────────────

export function serializeEntity(entity: ECSEntity): SerializedEntity {
  const prefab = entity.components.get('Prefab') as { prefabType: string } | undefined;
  const transform = entity.components.get('Transform') as TransformComponent | undefined;
  const mesh = entity.components.get('Mesh') as MeshComponent | undefined;

  // Collect non-core component properties as overrides
  const properties: Record<string, unknown> = {};
  for (const [type, comp] of entity.components) {
    if (type === 'Transform' || type === 'Mesh' || type === 'Prefab') continue;
    const serialized = serializeComponent(comp);
    // Store under the component type key, minus the _type field
    const { _type, ...data } = serialized;
    if (Object.keys(data).length > 0) {
      properties[type] = data;
    }
  }

  const result: SerializedEntity = {
    id: entity.id,
    type: prefab?.prefabType ?? 'mesh',
    meshes: mesh?.meshPaths ?? [],
    position: transform ? [round4(transform.position[0]), round4(transform.position[1]), round4(transform.position[2])] : [0, 0, 0],
    rotation: transform ? [round2(transform.rotation[0]), round2(transform.rotation[1]), round2(transform.rotation[2])] : [0, 0, 0],
    scale: transform ? [round4(transform.scale[0]), round4(transform.scale[1]), round4(transform.scale[2])] : [1, 1, 1],
    properties,
  };

  // Only write meshOffsets when any entry has non-default values
  if (mesh?.meshOffsets) {
    const hasNonDefault = mesh.meshOffsets.some(o => o && (o.position || o.rotation || o.scale));
    if (hasNonDefault) {
      result.meshOffsets = mesh.meshOffsets.map(o => {
        if (!o || (!o.position && !o.rotation && !o.scale)) return null;
        const entry: SerializedMeshOffset = {};
        if (o.position) entry.position = o.position.map(round4) as [number, number, number];
        if (o.rotation) entry.rotation = o.rotation.map(round2) as [number, number, number];
        if (o.scale) entry.scale = o.scale.map(round4) as [number, number, number];
        return entry;
      });
    }
  }

  return result;
}

// ── Deserialize: placement JSON → ECSEntity ──────────────────────────────────

export function deserializeEntity(data: SerializedEntity, registry: PrefabRegistry): ECSEntity {
  // Create from prefab (gets default components)
  const entity = registry.instantiate(data.type, data.id);

  // Override transform
  const transform = entity.components.get('Transform') as TransformComponent;
  if (transform) {
    transform.position = [...data.position] as [number, number, number];
    transform.rotation = [...data.rotation] as [number, number, number];
    transform.scale = [...data.scale] as [number, number, number];
  }

  // Override mesh paths and offsets
  const mesh = entity.components.get('Mesh') as MeshComponent;
  if (mesh) {
    mesh.meshPaths = [...data.meshes];
    if (data.meshOffsets) {
      mesh.meshOffsets = data.meshOffsets.map(o =>
        o ? { ...o } as MeshOffset : undefined
      );
    }
  }

  // Merge property overrides into components
  for (const [compType, overrides] of Object.entries(data.properties)) {
    const existing = entity.components.get(compType);
    if (existing && typeof overrides === 'object' && overrides !== null) {
      Object.assign(existing, overrides);
    } else if (typeof overrides === 'object' && overrides !== null) {
      // Component doesn't exist from prefab defaults — create it
      entity.components.set(compType, { _type: compType, ...overrides } as Component);
    }
  }

  return entity;
}

// ── Serialize entire world for a level ───────────────────────────────────────

export function serializeWorld(world: ECSWorld): PlacementsFile {
  const objects: SerializedEntity[] = [];
  for (const id of world.getAllEntityIds()) {
    const entity = world.getEntity(id);
    if (entity) objects.push(serializeEntity(entity));
  }
  return { objects };
}

// ── Deserialize placements file into world ───────────────────────────────────

export function deserializeWorld(
  data: PlacementsFile,
  world: ECSWorld,
  registry: PrefabRegistry
): void {
  for (const obj of data.objects) {
    const entity = deserializeEntity(obj, registry);
    world.addEntity(entity);
  }
}

// ── V2 format (prefab-based) ────────────────────────────────────────────────

export interface SerializedEntityV2 {
  id: string;
  prefab: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  overrides?: Record<string, unknown>;
}

export interface PlacementsFileV2 {
  version: 2;
  objects: SerializedEntityV2[];
}

export type AnyPlacementsFile = PlacementsFile | PlacementsFileV2;

function isV2Format(data: unknown): data is PlacementsFileV2 {
  return !!data && typeof data === 'object' && 'version' in (data as Record<string, unknown>)
    && (data as PlacementsFileV2).version === 2;
}

// ── Deserialize V2: prefab-based ────────────────────────────────────────────

export function deserializeEntityV2(
  data: SerializedEntityV2,
  catalog: PrefabCatalog,
  registry: PrefabRegistry
): ECSEntity {
  const catalogPrefab = catalog.get(data.prefab);
  if (!catalogPrefab) {
    console.warn(`[Serialization] Unknown prefab: "${data.prefab}", creating as mesh`);
  }

  // 1. Instantiate with type-level default components
  const typeKey = catalogPrefab?.type ?? 'mesh';
  const entity = registry.instantiate(typeKey, data.id);

  // 2. Apply prefab meshes + offsets
  const mesh = entity.components.get('Mesh') as MeshComponent;
  if (mesh && catalogPrefab) {
    mesh.meshPaths = [...catalogPrefab.meshes];
    if (catalogPrefab.meshOffsets) {
      mesh.meshOffsets = catalogPrefab.meshOffsets.map(o =>
        o ? { ...o } as MeshOffset : undefined
      );
    }
  }

  // 3. Apply prefab component defaults (override type defaults)
  if (catalogPrefab?.defaults) {
    for (const [compType, overrides] of Object.entries(catalogPrefab.defaults)) {
      const existing = entity.components.get(compType);
      if (existing) {
        Object.assign(existing, overrides);
      } else {
        entity.components.set(compType, { _type: compType, ...overrides } as Component);
      }
    }
  }

  // 4. Apply instance transform
  const transform = entity.components.get('Transform') as TransformComponent;
  if (transform) {
    transform.position = [...data.position] as [number, number, number];
    transform.rotation = [...data.rotation] as [number, number, number];
    transform.scale = [...data.scale] as [number, number, number];
  }

  // 5. Apply per-instance overrides (rare)
  if (data.overrides) {
    for (const [compType, overrides] of Object.entries(data.overrides)) {
      const existing = entity.components.get(compType);
      if (existing && typeof overrides === 'object' && overrides !== null) {
        Object.assign(existing, overrides);
      } else if (typeof overrides === 'object' && overrides !== null) {
        entity.components.set(compType, { _type: compType, ...overrides } as Component);
      }
    }
  }

  // 6. Store prefab reference
  const prefabComp = entity.components.get('Prefab') as PrefabComponent | undefined;
  if (prefabComp) {
    prefabComp.prefabId = data.prefab;
  }

  return entity;
}

// ── Serialize V2: prefab-based ──────────────────────────────────────────────

export function serializeEntityV2(entity: ECSEntity): SerializedEntityV2 {
  const prefabComp = entity.components.get('Prefab') as PrefabComponent | undefined;
  const transform = entity.components.get('Transform') as TransformComponent | undefined;

  // Collect non-core component overrides
  const overrides: Record<string, unknown> = {};
  for (const [type, comp] of entity.components) {
    if (type === 'Transform' || type === 'Mesh' || type === 'Prefab') continue;
    const serialized = serializeComponent(comp);
    const { _type, ...data } = serialized;
    if (Object.keys(data).length > 0) {
      overrides[type] = data;
    }
  }

  const result: SerializedEntityV2 = {
    id: entity.id,
    prefab: prefabComp?.prefabId ?? prefabComp?.prefabType ?? 'mesh',
    position: transform ? [round4(transform.position[0]), round4(transform.position[1]), round4(transform.position[2])] : [0, 0, 0],
    rotation: transform ? [round2(transform.rotation[0]), round2(transform.rotation[1]), round2(transform.rotation[2])] : [0, 0, 0],
    scale: transform ? [round4(transform.scale[0]), round4(transform.scale[1]), round4(transform.scale[2])] : [1, 1, 1],
  };

  if (Object.keys(overrides).length > 0) {
    result.overrides = overrides;
  }

  return result;
}

export function serializeWorldV2(world: ECSWorld): PlacementsFileV2 {
  const objects: SerializedEntityV2[] = [];
  for (const id of world.getAllEntityIds()) {
    const entity = world.getEntity(id);
    if (entity) objects.push(serializeEntityV2(entity));
  }
  return { version: 2, objects };
}

// ── Format-detecting deserializer ───────────────────────────────────────────

export function deserializeWorldAny(
  data: AnyPlacementsFile,
  world: ECSWorld,
  registry: PrefabRegistry,
  catalog?: PrefabCatalog
): void {
  if (isV2Format(data) && catalog) {
    for (const obj of data.objects) {
      world.addEntity(deserializeEntityV2(obj, catalog, registry));
    }
  } else if ('objects' in data && Array.isArray(data.objects)) {
    // V1 format
    for (const obj of (data as PlacementsFile).objects) {
      world.addEntity(deserializeEntity(obj, registry));
    }
  }
}
