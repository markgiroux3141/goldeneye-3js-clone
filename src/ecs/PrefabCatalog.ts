import type { SerializedMeshOffset } from './Serialization';

// ── Catalog prefab definition (loaded from prefabs.json) ──────────────────────

export interface CatalogPrefab {
  id: string;
  /** PrefabRegistry type key (e.g., "door", "character", "prop") */
  type: string;
  /** GLB filenames from the objects pool */
  meshes: string[];
  /** Per-mesh local offsets, parallel to meshes */
  meshOffsets?: (SerializedMeshOffset | null)[];
  /** Human-readable name for editor UI */
  displayName?: string;
  /** Component overrides layered on top of type defaults. Keyed by component type. */
  defaults?: Record<string, Record<string, unknown>>;
}

export interface PrefabsFile {
  version: number;
  prefabs: Record<string, Omit<CatalogPrefab, 'id'>>;
}

// ── Catalog class ─────────────────────────────────────────────────────────────

export class PrefabCatalog {
  private prefabs = new Map<string, CatalogPrefab>();

  /** Load from parsed prefabs.json */
  loadFromJSON(data: PrefabsFile): void {
    for (const [id, def] of Object.entries(data.prefabs)) {
      this.prefabs.set(id, { id, ...def });
    }
  }

  get(id: string): CatalogPrefab | undefined {
    return this.prefabs.get(id);
  }

  getAll(): CatalogPrefab[] {
    return Array.from(this.prefabs.values());
  }

  getByType(type: string): CatalogPrefab[] {
    return this.getAll().filter(p => p.type === type);
  }

  get size(): number {
    return this.prefabs.size;
  }

  /** Update mesh offsets for a prefab (in-memory) */
  updateMeshOffsets(prefabId: string, offsets: (SerializedMeshOffset | null | undefined)[]): void {
    const prefab = this.prefabs.get(prefabId);
    if (!prefab) return;

    // Clean: convert undefined to null, strip trailing nulls
    const cleaned = offsets.map(o => o ?? null);
    const hasNonNull = cleaned.some(o => o !== null);
    prefab.meshOffsets = hasNonNull ? cleaned : undefined;
  }

  /** Update component defaults for a prefab (in-memory, replaces all defaults) */
  updateDefaults(prefabId: string, defaults: Record<string, Record<string, unknown>>): void {
    const prefab = this.prefabs.get(prefabId);
    if (!prefab) return;
    const hasEntries = Object.keys(defaults).length > 0;
    prefab.defaults = hasEntries ? defaults : undefined;
  }

  /** Update a single component's defaults for a prefab */
  updateComponentDefault(prefabId: string, componentType: string, data: Record<string, unknown>): void {
    const prefab = this.prefabs.get(prefabId);
    if (!prefab) return;
    if (!prefab.defaults) prefab.defaults = {};
    prefab.defaults[componentType] = data;
  }

  /** Add a new prefab entry to the catalog */
  addPrefab(id: string, data: Omit<CatalogPrefab, 'id'>): void {
    this.prefabs.set(id, { id, ...data });
  }

  /** Serialize catalog back to PrefabsFile format for saving */
  toJSON(): PrefabsFile {
    const prefabs: Record<string, Omit<CatalogPrefab, 'id'>> = {};
    for (const [id, prefab] of this.prefabs) {
      const { id: _id, ...rest } = prefab;
      // Only include meshOffsets if present
      if (!rest.meshOffsets) {
        delete rest.meshOffsets;
      }
      prefabs[id] = rest;
    }
    return { version: 1, prefabs };
  }
}
