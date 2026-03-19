import type * as THREE from 'three';
import type { World } from '../core/World';
import type { AssetLoader } from '../core/AssetLoader';
import type { Entity } from '../entities/Entity';

// ── Property definitions for the editor UI ──────────────────────────

export interface PropertyOption {
  label: string;
  value: string | number | boolean;
}

export interface PropertyDef {
  key: string;
  label: string;
  type: 'number' | 'select' | 'boolean';
  options?: PropertyOption[];          // for 'select'
  min?: number; max?: number; step?: number;  // for 'number'
}

// ── Placeable definition (one per object template) ──────────────────

export interface PlaceableDefinition {
  category: string;           // 'doors' | 'enemies' | 'props'
  name: string;               // display name
  type: string;               // unique key for serialization
  defaultConfig: Record<string, unknown>;
  properties: PropertyDef[];

  /** Create a ghost preview mesh. Caller manages adding/removing from scene. */
  createPreview: (assetLoader: AssetLoader, modelScale: number) => Promise<THREE.Object3D>;

  /** Spawn the real entity in the world. Returns the entity for tracking. */
  spawn: (world: World, config: Record<string, unknown>) => Promise<Entity>;

  /** Remove a previously spawned entity. */
  remove: (world: World, entity: Entity) => void;
}

// ── Placed object (an instance in the scene) ────────────────────────

export interface PlacedObject {
  id: string;
  definition: PlaceableDefinition;
  config: Record<string, unknown>;
  sceneObject: THREE.Object3D;    // the visual mesh/group in the scene
  entity: Entity;                 // the game entity
  selectionHelper?: THREE.BoxHelper;
}
