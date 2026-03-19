import * as THREE from 'three';
import type { PlaceableDefinition, PropertyDef } from '../PlaceableDefinition';
import type { AssetLoader } from '../../core/AssetLoader';
import type { World } from '../../core/World';
import type { Entity } from '../../entities/Entity';

// ── Shared property definitions ─────────────────────────────────────

const CAMERA_PROPS: PropertyDef[] = [
  { key: 'detectionAngle', label: 'Detection Angle (deg)', type: 'number', min: 10, max: 90, step: 5 },
  { key: 'detectionRange', label: 'Detection Range (m)', type: 'number', min: 2, max: 30, step: 1 },
  { key: 'sweepSpeed', label: 'Sweep Speed (deg/s)', type: 'number', min: 0, max: 90, step: 5 },
  { key: 'sweepAngle', label: 'Sweep Arc (deg)', type: 'number', min: 0, max: 180, step: 10 },
];

const ALARM_PROPS: PropertyDef[] = [
  { key: 'alarmRadius', label: 'Alarm Radius (m)', type: 'number', min: 5, max: 50, step: 5 },
];

const SHARED_PROPS: PropertyDef[] = [
  { key: 'health', label: 'Health', type: 'number', min: 1, max: 200, step: 5 },
];

// ── Preview factory ─────────────────────────────────────────────────

async function createSecurityPreview(
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

async function spawnSecurity(world: World, config: Record<string, unknown>): Promise<Entity> {
  const spawner = world.objectRegistry.getSpawner('security-');
  if (!spawner) throw new Error('No security spawner registered');
  return spawner.spawn(world, config);
}

function removeSecurity(world: World, entity: Entity): void {
  const spawner = world.objectRegistry.getSpawner('security-');
  if (spawner) {
    spawner.remove(world, entity);
  }
}

// ── Security definitions ────────────────────────────────────────────

function makeSecurityDef(
  name: string,
  type: string,
  securityType: 'camera' | 'alarm',
  modelUrl: string,
  extraDefaults: Record<string, unknown>,
  extraProps: PropertyDef[]
): PlaceableDefinition {
  return {
    category: 'security',
    name,
    type,
    defaultConfig: {
      securityType,
      modelUrl,
      rotation: 0,
      health: 50,
      ...extraDefaults,
    },
    properties: [...extraProps, ...SHARED_PROPS],
    createPreview: (assetLoader, modelScale) =>
      createSecurityPreview(assetLoader, modelUrl, modelScale),
    spawn: spawnSecurity,
    remove: removeSecurity,
  };
}

export const SECURITY_DEFINITIONS: PlaceableDefinition[] = [
  makeSecurityDef(
    'Ceiling Camera',
    'security-camera-ceiling',
    'camera',
    '/models/security/camera-ceiling.glb',
    { detectionAngle: 30, detectionRange: 10, sweepSpeed: 0, sweepAngle: 60 },
    CAMERA_PROPS
  ),
  makeSecurityDef(
    'Wall Alarm',
    'security-alarm-wall',
    'alarm',
    '/models/security/alarm-wall.glb',
    { alarmRadius: 20 },
    ALARM_PROPS
  ),
];
