import * as THREE from 'three';
import type { PlaceableDefinition, PropertyDef } from '../PlaceableDefinition';
import type { AssetLoader } from '../../core/AssetLoader';
import type { World } from '../../core/World';
import type { Entity } from '../../entities/Entity';
import type { PropEntity } from '../../entities/PropEntity';

// ── Shared property definitions ─────────────────────────────────────

const DESTROY_EFFECT_PROPS: PropertyDef[] = [
  {
    key: 'destroyEffect', label: 'Destroy Effect', type: 'select',
    options: [
      { label: 'Break', value: 'break' },
      { label: 'Shatter', value: 'shatter' },
      { label: 'Explode', value: 'explode' },
      { label: 'None', value: 'none' },
    ],
  },
];

const SHARED_PROPS: PropertyDef[] = [
  { key: 'health', label: 'Health', type: 'number', min: 0, max: 500, step: 5 },
  ...DESTROY_EFFECT_PROPS,
];

// ── Preview factory ─────────────────────────────────────────────────

async function createPropPreview(
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
  group.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(group);
  const yOffset = box.min.y < 0 ? -box.min.y : 0;
  group.userData._previewYOffset = yOffset;
  return group;
}

// ── Spawn / remove helpers ──────────────────────────────────────────

async function spawnProp(world: World, config: Record<string, unknown>): Promise<Entity> {
  const spawner = world.objectRegistry.getSpawner('prop-');
  if (!spawner) throw new Error('No prop spawner registered');
  return spawner.spawn(world, config);
}

function removeProp(world: World, entity: Entity): void {
  const spawner = world.objectRegistry.getSpawner('prop-');
  if (spawner) {
    spawner.remove(world, entity);
  }
}

// ── Prop definitions ────────────────────────────────────────────────

function makePropDef(
  name: string,
  type: string,
  modelUrl: string,
  extraDefaults: Record<string, unknown>,
  extraProps: PropertyDef[] = []
): PlaceableDefinition {
  return {
    category: 'props',
    name,
    type,
    defaultConfig: {
      modelUrl,
      rotation: 0,
      health: 30,
      destroyEffect: 'break',
      ...extraDefaults,
    },
    properties: [...extraProps, ...SHARED_PROPS],
    createPreview: (assetLoader, modelScale) =>
      createPropPreview(assetLoader, modelUrl, modelScale),
    spawn: spawnProp,
    remove: removeProp,
  };
}

export const PROP_DEFINITIONS: PlaceableDefinition[] = [
  makePropDef(
    'Wooden Crate',
    'prop-crate-wooden',
    '/models/props/crate-wooden.glb',
    { health: 30, destroyEffect: 'break' }
  ),
  makePropDef(
    'Explosive Barrel',
    'prop-barrel-explosive',
    '/models/props/barrel-explosive.glb',
    { health: 15, destroyEffect: 'explode' }
  ),
  makePropDef(
    'Table',
    'prop-table',
    '/models/props/table.glb',
    { health: 50, destroyEffect: 'break' }
  ),
  makePropDef(
    'Chair',
    'prop-chair',
    '/models/props/chair.glb',
    { health: 20, destroyEffect: 'break' }
  ),
  makePropDef(
    'Glass Panel',
    'prop-glass-panel',
    '/models/props/glass-panel.glb',
    { health: 5, destroyEffect: 'shatter' }
  ),
];
