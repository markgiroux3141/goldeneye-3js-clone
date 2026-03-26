import type * as THREE from 'three';

// ── Base ─────────────────────────────────────────────────────────────────────

export interface Component {
  readonly _type: string;
}

// ── Core Components ──────────────────────────────────────────────────────────

export interface TransformComponent extends Component {
  _type: 'Transform';
  position: [number, number, number];
  rotation: [number, number, number]; // degrees XYZ
  scale: [number, number, number];
}

export interface MeshComponent extends Component {
  _type: 'Mesh';
  meshPaths: string[];
  castShadow: boolean;
  receiveShadow: boolean;
  /** Transient runtime ref — not serialized */
  _group?: THREE.Group;
}

export interface PrefabComponent extends Component {
  _type: 'Prefab';
  prefabType: string;
}

// ── Physics ──────────────────────────────────────────────────────────────────

export interface PhysicsBodyComponent extends Component {
  _type: 'PhysicsBody';
  bodyType: 'fixed' | 'kinematic' | 'dynamic';
  colliderShape: 'auto-trimesh' | 'auto-box' | 'none';
  colliderSize?: [number, number, number];
  /** Transient runtime refs */
  _rigidBody?: unknown;
  _collider?: unknown;
}

// ── Health & Damage ──────────────────────────────────────────────────────────

export interface HealthComponent extends Component {
  _type: 'Health';
  health: number;
  maxHealth: number;
  armor: number;
  maxArmor: number;
  invincible: boolean;
}

export interface FactionComponent extends Component {
  _type: 'Faction';
  faction: 'player' | 'enemy' | 'neutral';
}

export interface DestructibleComponent extends Component {
  _type: 'Destructible';
  destroyEffect: 'break' | 'shatter' | 'explode' | 'none';
  destroySound?: string;
  debrisCount: number;
  /** Transient runtime state */
  _destroying?: boolean;
  _destroyTimer?: number;
}

// ── Door ─────────────────────────────────────────────────────────────────────

export type DoorState = 'closed' | 'opening' | 'open' | 'closing';

export interface DoorComponent extends Component {
  _type: 'Door';
  doorType: 'swinging' | 'sliding';
  hingeSide: 'left' | 'right';
  swingDirection: 1 | -1;
  openAngle: number; // degrees
  slideDistance: number;
  slideAxis: 'x' | 'z';
  slideDirection: 1 | -1;
  triggerRadius: number;
  openDuration: number; // seconds before auto-close
  animationSpeed: number;
  pivotOffset: [number, number, number];
  /** Transient runtime state */
  _state?: DoorState;
  _currentAngle?: number;
  _currentSlideOffset?: number;
  _openTimer?: number;
}

// ── Interaction ──────────────────────────────────────────────────────────────

export interface InteractableComponent extends Component {
  _type: 'Interactable';
  triggerRadius: number;
  promptText?: string;
  singleUse: boolean;
  /** Transient runtime state */
  _used?: boolean;
}

export interface ConsoleActionComponent extends Component {
  _type: 'ConsoleAction';
  actionType: 'unlock-door' | 'disable-security' | 'emit-event';
  targetId?: string;
  eventName?: string;
}

// ── Security ─────────────────────────────────────────────────────────────────

export interface DetectionComponent extends Component {
  _type: 'Detection';
  detectionAngle: number; // half-angle in degrees
  detectionRange: number;
  sweepSpeed: number;
  sweepAngle: number;
  baseRotationY: number;
  /** Transient runtime state */
  _sweepTime?: number;
  _playerDetected?: boolean;
}

export interface AlarmComponent extends Component {
  _type: 'Alarm';
  alarmSound?: string;
  alarmRadius: number;
  /** Transient runtime state */
  _alarmActive?: boolean;
}

// ── Audio ────────────────────────────────────────────────────────────────────

export interface AudioComponent extends Component {
  _type: 'Audio';
  sounds: Record<string, string>; // event name → sound URL
}

// ── Component type registry (for type-safe access) ───────────────────────────

export interface ComponentTypeMap {
  Transform: TransformComponent;
  Mesh: MeshComponent;
  Prefab: PrefabComponent;
  PhysicsBody: PhysicsBodyComponent;
  Health: HealthComponent;
  Faction: FactionComponent;
  Destructible: DestructibleComponent;
  Door: DoorComponent;
  Interactable: InteractableComponent;
  ConsoleAction: ConsoleActionComponent;
  Detection: DetectionComponent;
  Alarm: AlarmComponent;
  Audio: AudioComponent;
}

export type ComponentType = keyof ComponentTypeMap;

/** All transient (runtime-only) fields start with underscore — strip for serialization */
export function serializeComponent(comp: Component): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(comp)) {
    if (!key.startsWith('_') || key === '_type') {
      result[key] = value;
    }
  }
  return result;
}
