import * as THREE from 'three';
import type { PlaceableDefinition, PropertyDef } from '../PlaceableDefinition';
import type { AssetLoader } from '../../core/AssetLoader';
import type { World } from '../../core/World';
import type { Entity } from '../../entities/Entity';

// ── Shared property definitions ─────────────────────────────────────

const SHARED_PROPS: PropertyDef[] = [
  { key: 'triggerRadius', label: 'Trigger Radius', type: 'number', min: 0.5, max: 10, step: 0.5 },
  {
    key: 'singleUse', label: 'Single Use', type: 'boolean',
  },
];

// ── Preview factory ─────────────────────────────────────────────────

async function createConsolePreview(
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

async function spawnConsole(world: World, config: Record<string, unknown>): Promise<Entity> {
  const spawner = world.objectRegistry.getSpawner('console-');
  if (!spawner) throw new Error('No console spawner registered');
  return spawner.spawn(world, config);
}

function removeConsole(world: World, entity: Entity): void {
  const spawner = world.objectRegistry.getSpawner('console-');
  if (spawner) {
    spawner.remove(world, entity);
  }
}

// ── Console definitions ─────────────────────────────────────────────

function makeConsoleDef(
  name: string,
  type: string,
  modelUrl: string,
  extraDefaults: Record<string, unknown>,
  extraProps: PropertyDef[] = []
): PlaceableDefinition {
  return {
    category: 'consoles',
    name,
    type,
    defaultConfig: {
      modelUrl,
      rotation: 0,
      triggerRadius: 2.0,
      singleUse: true,
      ...extraDefaults,
    },
    properties: [...extraProps, ...SHARED_PROPS],
    createPreview: (assetLoader, modelScale) =>
      createConsolePreview(assetLoader, modelUrl, modelScale),
    spawn: spawnConsole,
    remove: removeConsole,
  };
}

export const CONSOLE_DEFINITIONS: PlaceableDefinition[] = [
  makeConsoleDef(
    'Door Unlock Console',
    'console-door-unlock',
    '/models/consoles/panel-basic.glb',
    { action: { type: 'unlock-door', targetId: '' } }
  ),
  makeConsoleDef(
    'Security Disable Console',
    'console-security-disable',
    '/models/consoles/panel-basic.glb',
    { action: { type: 'disable-security' } }
  ),
];
