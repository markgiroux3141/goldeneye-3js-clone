import type { PlaceableDefinition, PlacedObject } from './PlaceableDefinition';

// ── Serialized formats ──────────────────────────────────────────────

export interface PlacedObjectData {
  id: string;
  type: string;               // matches PlaceableDefinition.type
  config: Record<string, unknown>;
}

export interface BakeLight {
  position: { x: number; y: number; z: number };
  color?: { r: number; g: number; b: number };  // 0-255, default warm white (255, 240, 220)
  intensity?: number;    // multiplier, default 1.0
  radius?: number;       // max range in world units, default 10.0
  falloff?: number;      // attenuation exponent, default 2.0
}

export interface EnemyPlacementData {
  characterId: string;
  characterFile?: string;
  position: { x: number; y: number; z: number };
  rotation?: number;
  weaponId?: string;
  weaponOptions?: { dual?: boolean };
  health?: number;
  ai?: Record<string, unknown> | false;
}

export interface LevelData {
  version: 1;
  levelType: string;
  spawn?: { x: number; y: number; z: number };
  music?: string;
  fog?: { color: { r: number; g: number; b: number }; near: number; far: number };
  lights?: BakeLight[];
  objects: PlacedObjectData[];
  enemyPlacements?: EnemyPlacementData[];
}

// ── Serialization ───────────────────────────────────────────────────

export function serializeLevelData(
  levelType: string,
  placedObjects: PlacedObject[],
  spawn?: { x: number; y: number; z: number },
  music?: string
): LevelData {
  return {
    version: 1,
    levelType,
    ...(spawn ? { spawn } : {}),
    ...(music ? { music } : {}),
    objects: placedObjects.map((obj) => ({
      id: obj.id,
      type: obj.definition.type,
      config: { ...obj.config },
    })),
  };
}

// ── Save (download as JSON + copy to clipboard) ─────────────────────

export function saveLevelData(data: LevelData): void {
  const json = JSON.stringify(data, null, 2);

  // Download as file
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `level-${data.levelType}.json`;
  a.click();
  URL.revokeObjectURL(url);

  // Also copy to clipboard
  navigator.clipboard.writeText(json).then(
    () => console.log('[LevelData] Copied to clipboard'),
    () => console.log('[LevelData] Clipboard copy failed')
  );

  console.log('[LevelData] Saved:', json);
}

// ── Load (from file input) ──────────────────────────────────────────

export function loadLevelDataFromFile(): Promise<LevelData> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string) as LevelData;
          if (data.version !== 1) {
            reject(new Error(`Unsupported level version: ${data.version}`));
            return;
          }
          resolve(data);
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsText(file);
    });
    input.click();
  });
}

// ── Definition registry ─────────────────────────────────────────────

const definitionRegistry = new Map<string, PlaceableDefinition>();

export function registerDefinitions(defs: PlaceableDefinition[]): void {
  for (const def of defs) {
    definitionRegistry.set(def.type, def);
  }
}

export function getDefinition(type: string): PlaceableDefinition | undefined {
  return definitionRegistry.get(type);
}

export function getAllDefinitions(): PlaceableDefinition[] {
  return [...definitionRegistry.values()];
}

export function getDefinitionsByCategory(category: string): PlaceableDefinition[] {
  return [...definitionRegistry.values()].filter((d) => d.category === category);
}

export function getCategories(): string[] {
  const cats = new Set<string>();
  for (const def of definitionRegistry.values()) {
    cats.add(def.category);
  }
  return [...cats];
}

// ── localStorage auto-save / auto-load ─────────────────────────────

const STORAGE_PREFIX = 'editor-level-';

export function autoSave(levelType: string, placedObjects: PlacedObject[], spawn?: { x: number; y: number; z: number }): void {
  const data = serializeLevelData(levelType, placedObjects, spawn);
  localStorage.setItem(STORAGE_PREFIX + levelType, JSON.stringify(data));
}

export function autoLoad(levelType: string): LevelData | null {
  const raw = localStorage.getItem(STORAGE_PREFIX + levelType);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as LevelData;
    return data.version === 1 ? data : null;
  } catch {
    return null;
  }
}

export function clearAutoSave(levelType: string): void {
  localStorage.removeItem(STORAGE_PREFIX + levelType);
}

// ── Fetch level data for gameplay ──────────────────────────────────

export async function fetchLevelData(levelType: string): Promise<LevelData | null> {
  try {
    const resp = await fetch(`/levels/level-${levelType}.json`);
    if (!resp.ok) return null;
    const data = (await resp.json()) as LevelData;
    return data.version === 1 ? data : null;
  } catch {
    return null;
  }
}
