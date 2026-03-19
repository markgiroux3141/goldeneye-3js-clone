import * as THREE from 'three';
import type { PlaceableDefinition, PropertyDef } from '../PlaceableDefinition';
import type { AssetLoader } from '../../core/AssetLoader';
import type { World } from '../../core/World';
import type { DoorConfig } from '../../entities/DoorEntity';
import type { Entity } from '../../entities/Entity';
import type { DoorEntity } from '../../entities/DoorEntity';

// ── Shared property definitions ─────────────────────────────────────

const SWINGING_PROPS: PropertyDef[] = [
  {
    key: 'hingeSide', label: 'Hinge Side', type: 'select',
    options: [
      { label: 'Left', value: 'left' },
      { label: 'Right', value: 'right' },
    ],
  },
  {
    key: 'swingDirection', label: 'Swing Direction', type: 'select',
    options: [
      { label: 'CCW', value: 1 },
      { label: 'CW', value: -1 },
    ],
  },
];

const SLIDING_PROPS: PropertyDef[] = [
  {
    key: 'slideDirection', label: 'Slide Direction', type: 'select',
    options: [
      { label: 'Positive', value: 1 },
      { label: 'Negative', value: -1 },
    ],
  },
];

const SHARED_PROPS: PropertyDef[] = [
  { key: 'triggerRadius', label: 'Trigger Radius', type: 'number', min: 0.5, max: 15, step: 0.5 },
  { key: 'openDuration', label: 'Open Duration (s)', type: 'number', min: 0.5, max: 30, step: 0.5 },
];

// ── Preview factory (ghost door model) ──────────────────────────────

async function createDoorPreview(
  assetLoader: AssetLoader,
  modelUrl: string,
  modelScale: number
): Promise<THREE.Object3D> {
  const group = (await assetLoader.loadGLTF(modelUrl)).clone();
  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const mat = (child.material as THREE.Material).clone();
      mat.transparent = true;
      mat.opacity = 0.4;
      mat.depthWrite = false;
      child.material = mat;
      child.userData._editorPreview = true;
    }
  });
  if (modelScale !== 1) {
    group.scale.setScalar(modelScale);
  }
  // Compute Y offset so door bottom sits at placement point
  group.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(group);
  const yOffset = box.min.y < 0 ? -box.min.y : 0;
  group.userData._previewYOffset = yOffset;
  return group;
}

// ── Spawn / remove helpers ──────────────────────────────────────────

async function spawnDoor(world: World, config: Record<string, unknown>): Promise<Entity> {
  const doorConfig = config as unknown as DoorConfig;
  return world.spawnDoor(doorConfig);
}

function removeDoor(world: World, entity: Entity): void {
  world.doorManager.removeDoor(entity as DoorEntity);
}

// ── Door definitions ────────────────────────────────────────────────

function makeDoorDef(
  name: string,
  type: string,
  doorType: 'swinging' | 'sliding',
  modelUrl: string,
  extraDefaults: Record<string, unknown>,
  extraProps: PropertyDef[]
): PlaceableDefinition {
  return {
    category: 'doors',
    name,
    type,
    defaultConfig: {
      type: doorType,
      modelUrl,
      rotation: 0,
      triggerRadius: 3.0,
      openDuration: 3.0,
      ...extraDefaults,
    },
    properties: [...extraProps, ...SHARED_PROPS],
    createPreview: (assetLoader, modelScale) =>
      createDoorPreview(assetLoader, modelUrl, modelScale),
    spawn: spawnDoor,
    remove: removeDoor,
  };
}

export const DOOR_DEFINITIONS: PlaceableDefinition[] = [
  makeDoorDef(
    'Grey Swinging Door',
    'door-grey-swinging',
    'swinging',
    '/models/doors/grey-swinging-door.glb',
    { hingeSide: 'left', swingDirection: 1 },
    SWINGING_PROPS
  ),
  makeDoorDef(
    'Bathroom Door',
    'door-bathroom',
    'swinging',
    '/models/doors/bathroom-door.glb',
    { hingeSide: 'left', swingDirection: 1 },
    SWINGING_PROPS
  ),
  makeDoorDef(
    'Brown Sliding Door',
    'door-brown-sliding',
    'sliding',
    '/models/doors/brown-sliding-door.glb',
    { slideDirection: -1 },
    SLIDING_PROPS
  ),
];
