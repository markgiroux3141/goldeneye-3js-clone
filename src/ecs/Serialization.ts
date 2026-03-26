import type { Component, TransformComponent, MeshComponent } from './Component';
import { serializeComponent } from './Component';
import type { ECSEntity, ECSWorld, EntityId } from './ECSWorld';
import type { PrefabRegistry } from './PrefabRegistry';

// ── Placement JSON format ────────────────────────────────────────────────────

export interface SerializedEntity {
  id: string;
  type: string;
  meshes: string[];
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

  return {
    id: entity.id,
    type: prefab?.prefabType ?? 'mesh',
    meshes: mesh?.meshPaths ?? [],
    position: transform ? [round4(transform.position[0]), round4(transform.position[1]), round4(transform.position[2])] : [0, 0, 0],
    rotation: transform ? [round2(transform.rotation[0]), round2(transform.rotation[1]), round2(transform.rotation[2])] : [0, 0, 0],
    scale: transform ? [round4(transform.scale[0]), round4(transform.scale[1]), round4(transform.scale[2])] : [1, 1, 1],
    properties,
  };
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

  // Override mesh paths
  const mesh = entity.components.get('Mesh') as MeshComponent;
  if (mesh) {
    mesh.meshPaths = [...data.meshes];
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
