import type { Component } from './Component';
import { createEntity, type ECSEntity } from './ECSWorld';

/** Component data as plain JSON — must have _type field */
type ComponentData = { _type: string; [key: string]: unknown };

export interface PrefabDefinition {
  type: string;
  category: string;
  displayName: string;
  defaultComponents: ComponentData[];
  /** Glob-style patterns for auto-detecting this type from GLB filenames */
  namePatterns: string[];
}

let nextEntityCounter = 1;

export class PrefabRegistry {
  private prefabs = new Map<string, PrefabDefinition>();

  register(prefab: PrefabDefinition): void {
    this.prefabs.set(prefab.type, prefab);
  }

  get(type: string): PrefabDefinition | undefined {
    return this.prefabs.get(type);
  }

  getAll(): PrefabDefinition[] {
    return Array.from(this.prefabs.values());
  }

  getByCategory(category: string): PrefabDefinition[] {
    return this.getAll().filter(p => p.category === category);
  }

  getCategories(): string[] {
    const cats = new Set<string>();
    for (const p of this.prefabs.values()) cats.add(p.category);
    return Array.from(cats);
  }

  /** Infer prefab type from a GLB filename using name patterns */
  inferType(filename: string): string {
    const lower = filename.toLowerCase();
    for (const [type, prefab] of this.prefabs) {
      for (const pattern of prefab.namePatterns) {
        if (lower.includes(pattern.toLowerCase())) {
          return type;
        }
      }
    }
    return 'mesh'; // default: raw mesh, no behavior
  }

  /** Create a new entity from a prefab with default components */
  instantiate(type: string, id?: string): ECSEntity {
    const prefab = this.prefabs.get(type);
    const entityId = id ?? `${type}_${String(nextEntityCounter++).padStart(3, '0')}`;
    const entity = createEntity(entityId);

    // Add prefab component
    entity.components.set('Prefab', { _type: 'Prefab', prefabType: type } as Component);

    // Add default components (deep clone to avoid shared state)
    if (prefab) {
      for (const comp of prefab.defaultComponents) {
        entity.components.set(comp._type, JSON.parse(JSON.stringify(comp)) as Component);
      }
    }

    // Ensure Transform exists
    if (!entity.components.has('Transform')) {
      entity.components.set('Transform', {
        _type: 'Transform', position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1],
      } as Component);
    }

    // Ensure Mesh exists
    if (!entity.components.has('Mesh')) {
      entity.components.set('Mesh', {
        _type: 'Mesh', meshPaths: [], castShadow: true, receiveShadow: true,
      } as Component);
    }

    return entity;
  }
}

/** Create default registry with all known prefab types */
export function createDefaultRegistry(): PrefabRegistry {
  const reg = new PrefabRegistry();

  reg.register({
    type: 'mesh',
    category: 'general',
    displayName: 'Mesh',
    defaultComponents: [],
    namePatterns: [],
  });

  reg.register({
    type: 'door',
    category: 'doors',
    displayName: 'Door',
    defaultComponents: [
      {
        _type: 'StateMachine',
        states: ['closed', 'opening', 'open', 'closing'],
        initialState: 'closed',
        transitions: {
          'closed→opening': { trigger: 'interact', animation: 'open' },
          'opening→open': { trigger: 'animation-complete' },
          'open→closing': { trigger: 'timer', delay: 3, animation: 'close' },
          'closing→closed': { trigger: 'animation-complete' },
        },
      },
      {
        _type: 'KeyframeAnimation',
        tracks: [
          { targetMesh: 0, property: 'rotation.y', keyframes: [{ time: 0, value: 0 }, { time: 1, value: 90 }], easing: 'ease-in-out' },
        ],
        clips: {
          open: { tracks: [0], duration: 0.5 },
          close: { tracks: [0], duration: 0.5, reverse: true },
        },
      },
      { _type: 'Pivot', offset: [0, 0, 0], affectsMeshes: [0] },
      { _type: 'Interactable', triggerRadius: 3, singleUse: false },
      { _type: 'Audio', sounds: {} },
      { _type: 'PhysicsBody', bodyType: 'kinematic', colliderShape: 'auto-box' },
    ],
    namePatterns: ['door', 'sliding', 'blast_door', 'hatch'],
  });

  reg.register({
    type: 'prop',
    category: 'props',
    displayName: 'Prop',
    defaultComponents: [
      { _type: 'PhysicsBody', bodyType: 'fixed', colliderShape: 'auto-box' },
    ],
    namePatterns: ['crate', 'barrel', 'table', 'chair', 'box', 'shelf', 'desk', 'cabinet', 'locker'],
  });

  reg.register({
    type: 'prop-destructible',
    category: 'props',
    displayName: 'Destructible Prop',
    defaultComponents: [
      { _type: 'Health', health: 50, maxHealth: 50, armor: 0, maxArmor: 0, invincible: false },
      {
        _type: 'Destructible', destroyEffect: 'break', debrisCount: 5,
        explosionRadius: 0, chainReaction: false,
      },
      { _type: 'PhysicsBody', bodyType: 'fixed', colliderShape: 'auto-box' },
    ],
    namePatterns: ['explosive_barrel', 'glass', 'window_glass'],
  });

  reg.register({
    type: 'prop-explosive',
    category: 'props',
    displayName: 'Explosive Prop',
    defaultComponents: [
      { _type: 'Health', health: 30, maxHealth: 30, armor: 0, maxArmor: 0, invincible: false },
      {
        _type: 'Destructible', destroyEffect: 'explode', debrisCount: 8,
        explosionRadius: 5, chainReaction: true,
      },
      { _type: 'PhysicsBody', bodyType: 'fixed', colliderShape: 'auto-box' },
      { _type: 'Audio', sounds: {} },
    ],
    namePatterns: ['explosive', 'fuel_tank', 'gas_tank', 'propane'],
  });

  reg.register({
    type: 'character',
    category: 'characters',
    displayName: 'Character',
    defaultComponents: [
      { _type: 'Health', health: 100, maxHealth: 100, armor: 0, maxArmor: 0, invincible: false },
      { _type: 'Faction', faction: 'enemy' },
    ],
    namePatterns: [
      'guard', 'scientist', 'natalia', 'trevelyn', 'boris', 'xenia',
      'orumov', 'baron', 'jaws', 'natalya', 'mishkin', 'valentin',
    ],
  });

  reg.register({
    type: 'console',
    category: 'interactive',
    displayName: 'Console',
    defaultComponents: [
      { _type: 'Interactable', triggerRadius: 2, singleUse: true },
      {
        _type: 'StateMachine',
        states: ['inactive', 'activated'],
        initialState: 'inactive',
        transitions: {
          'inactive→activated': { trigger: 'interact', sound: 'activate' },
        },
      },
      { _type: 'VariableSetter', onState: 'activated', sets: {} },
      { _type: 'Audio', sounds: {} },
    ],
    namePatterns: ['console', 'mainframe', 'keyboard', 'computer'],
  });

  reg.register({
    type: 'security-camera',
    category: 'security',
    displayName: 'Security Camera',
    defaultComponents: [
      { _type: 'Detection', detectionAngle: 45, detectionRange: 15, sweepSpeed: 1, sweepAngle: 60, baseRotationY: 0 },
      { _type: 'Alarm', alarmRadius: 20 },
      { _type: 'PhysicsBody', bodyType: 'fixed', colliderShape: 'auto-box' },
    ],
    namePatterns: ['security_camera', 'camera_primary', 'camera_secondary', 'alarm'],
  });

  reg.register({
    type: 'pickup',
    category: 'pickups',
    displayName: 'Pickup',
    defaultComponents: [
      {
        _type: 'Pickup', itemType: 'weapon', itemId: '', quantity: 1,
        respawn: false, bobAnimation: true, collectRadius: 1.5,
      },
    ],
    namePatterns: ['body_armor', 'ammo_crate', 'ammo_box', 'key', 'pp7', 'rcp90', 'ar33', 'kf7'],
  });

  reg.register({
    type: 'drone-gun',
    category: 'security',
    displayName: 'Drone Gun',
    defaultComponents: [
      { _type: 'Health', health: 80, maxHealth: 80, armor: 0, maxArmor: 0, invincible: false },
      {
        _type: 'StateMachine',
        states: ['idle', 'tracking', 'firing', 'destroyed'],
        initialState: 'idle',
        transitions: {
          'idle→tracking': { trigger: 'proximity', radius: 15 },
          'tracking→firing': { trigger: 'timer', delay: 0.5 },
          'firing→tracking': { trigger: 'timer', delay: 0.3 },
          'tracking→idle': { trigger: 'timer', delay: 3 },
          'idle→destroyed': { trigger: 'destroy' },
          'tracking→destroyed': { trigger: 'destroy' },
          'firing→destroyed': { trigger: 'destroy' },
        },
      },
      { _type: 'Detection', detectionAngle: 60, detectionRange: 15, sweepSpeed: 1, sweepAngle: 90, baseRotationY: 0 },
      { _type: 'Turret', mode: 'track-player', fireRate: 2, projectileSpeed: 50, damage: 10, rotationSpeed: 90 },
      {
        _type: 'Destructible', destroyEffect: 'explode', debrisCount: 4,
        explosionRadius: 0, chainReaction: false,
      },
      { _type: 'PhysicsBody', bodyType: 'fixed', colliderShape: 'auto-box' },
      { _type: 'Audio', sounds: {} },
    ],
    namePatterns: ['drone_gun', 'ceiling_gun', 'auto_gun', 'turret'],
  });

  reg.register({
    type: 'environment',
    category: 'environment',
    displayName: 'Environment',
    defaultComponents: [],
    namePatterns: [
      'fence', 'lamp', 'tree', 'bush', 'rock', 'truck', 'tank', 'plane',
      'satellite', 'satelite', 'dish', 'barricade', 'railing', 'sign',
    ],
  });

  return reg;
}
