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

export interface MeshOffset {
  position?: [number, number, number];
  rotation?: [number, number, number]; // degrees XYZ
  scale?: [number, number, number];
}

export interface MeshComponent extends Component {
  _type: 'Mesh';
  meshPaths: string[];
  /** Per-mesh local offsets, parallel to meshPaths. Optional — omit for identity. */
  meshOffsets?: (MeshOffset | undefined)[];
  castShadow: boolean;
  receiveShadow: boolean;
  /** Transient runtime ref — not serialized */
  _group?: THREE.Group;
}

export interface PrefabComponent extends Component {
  _type: 'Prefab';
  prefabType: string;
  /** Catalog prefab ID (e.g., "facility_guard") — set when loaded from prefabs.json */
  prefabId?: string;
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

// ── State Machine ────────────────────────────────────────────────────────────

export interface StateTransition {
  /** Trigger type: what causes this transition */
  trigger: 'interact' | 'proximity' | 'variable' | 'timer' | 'animation-complete' | 'damage' | 'destroy';
  /** For 'timer' trigger — delay in seconds before transitioning */
  delay?: number;
  /** For 'variable' trigger — world variable that must be truthy */
  condition?: string;
  /** For 'proximity' trigger — radius in world units */
  radius?: number;
  /** Animation name to play when entering the target state (from KeyframeAnimation) */
  animation?: string;
  /** Sound event key to play (from Audio component) */
  sound?: string;
}

export interface StateMachineComponent extends Component {
  _type: 'StateMachine';
  /** All valid state names */
  states: string[];
  /** Initial state */
  initialState: string;
  /** Transitions keyed as "fromState→toState" */
  transitions: Record<string, StateTransition>;
  /** Transient runtime state */
  _currentState?: string;
  _timer?: number;
  _timerTarget?: string;
}

// ── Keyframe Animation ──────────────────────────────────────────────────────

export interface Keyframe {
  time: number;           // normalized 0–1
  value: number;
}

export interface AnimationTrack {
  /** Which mesh index to animate, or -1 for entity root */
  targetMesh: number;
  /** Property path to animate (e.g., "rotation.y", "position.x") */
  property: string;
  /** Keyframe values — time is normalized 0–1 */
  keyframes: Keyframe[];
  /** Easing function */
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

export interface AnimationClip {
  /** Track indices into the tracks array */
  tracks: number[];
  /** Duration of the clip in seconds */
  duration: number;
  /** If true, play tracks in reverse */
  reverse?: boolean;
}

export interface KeyframeAnimationComponent extends Component {
  _type: 'KeyframeAnimation';
  /** All animation tracks */
  tracks: AnimationTrack[];
  /** Named clips referencing tracks */
  clips: Record<string, AnimationClip>;
  /** Transient runtime state */
  _activeClip?: string;
  _clipTime?: number;
  _clipSpeed?: number;
  _playing?: boolean;
}

// ── Pivot ───────────────────────────────────────────────────────────────────

export interface PivotComponent extends Component {
  _type: 'Pivot';
  /** Local-space offset from entity origin to pivot point */
  offset: [number, number, number];
  /** Which mesh indices rotate around this pivot (-1 = all) */
  affectsMeshes: number[];
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

// ── World Variables ─────────────────────────────────────────────────────────

export interface VariableSetterComponent extends Component {
  _type: 'VariableSetter';
  /** When the entity's StateMachine enters this state, set the variables */
  onState: string;
  /** Variables to set: key → value */
  sets: Record<string, string | number | boolean>;
}

export interface VariableListenerComponent extends Component {
  _type: 'VariableListener';
  /** World variable name to watch */
  watches: string;
  /** Value to compare against (truthy check if omitted) */
  expectedValue?: string | number | boolean;
  /** State machine event to fire when condition is met */
  onMatch: string;
  /** Transient runtime state */
  _lastValue?: unknown;
  _triggered?: boolean;
}

// ── Pickup ──────────────────────────────────────────────────────────────────

export interface PickupComponent extends Component {
  _type: 'Pickup';
  itemType: 'weapon' | 'ammo' | 'armor' | 'key' | 'document' | 'part';
  itemId: string;
  quantity: number;
  respawn: boolean;
  respawnDelay?: number;     // seconds
  bobAnimation: boolean;
  collectRadius: number;
}

// ── Turret ──────────────────────────────────────────────────────────────────

export interface TurretComponent extends Component {
  _type: 'Turret';
  mode: 'sweep' | 'track-player' | 'fixed';
  fireRate: number;          // shots per second
  projectileSpeed: number;
  damage: number;
  rotationSpeed: number;     // degrees per second
  /** Transient runtime state */
  _fireCooldown?: number;
  _targetRotation?: number;
}

// ── Destructible (enhanced) ─────────────────────────────────────────────────

export interface DestructibleComponent extends Component {
  _type: 'Destructible';
  destroyEffect: 'break' | 'shatter' | 'explode' | 'none';
  destroySound?: string;
  debrisCount: number;
  /** Replacement mesh paths to swap to on destruction */
  replacementMeshes?: string[];
  /** Prefab IDs to spawn on destruction (e.g., ammo drops) */
  dropItems?: string[];
  /** Explosion damage radius (0 = no splash damage) */
  explosionRadius: number;
  /** Can be set off by nearby explosions */
  chainReaction: boolean;
  /** Transient runtime state */
  _destroying?: boolean;
  _destroyTimer?: number;
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
  StateMachine: StateMachineComponent;
  KeyframeAnimation: KeyframeAnimationComponent;
  Pivot: PivotComponent;
  Interactable: InteractableComponent;
  VariableSetter: VariableSetterComponent;
  VariableListener: VariableListenerComponent;
  Pickup: PickupComponent;
  Turret: TurretComponent;
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
