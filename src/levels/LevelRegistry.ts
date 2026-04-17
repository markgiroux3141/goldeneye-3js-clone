export interface LevelConfig {
  type: 'glb' | 'procedural' | 'sandbox';
  modelPath?: string;
  modelScale?: number;
  spawn: { x: number; y: number; z: number };
  doorScale?: number;
  fog?: { color: number; near: number; far: number };
}

const DEFAULT_DOOR_SCALE = 0.0014;

// Scale applied to GLB levels exported from the GoldenEye Level Editor.
// These exports share a consistent export scale, so one value covers all of them.
export const CUSTOM_LEVEL_SCALE = 1.5;

// Build a LevelConfig for a GoldenEye-Level-Editor export. GLB is expected at
// /models/levels/<slug>.glb. Adding a new custom level = one line in LEVELS.
export function customLevel(
  slug: string,
  spawn: { x: number; y: number; z: number } = { x: 0, y: 1, z: 0 }
): LevelConfig {
  return {
    type: 'glb',
    modelPath: `/models/levels/${slug}.glb`,
    modelScale: CUSTOM_LEVEL_SCALE,
    spawn,
  };
}

export const LEVELS: Record<string, LevelConfig> = {
  procedural: {
    type: 'procedural',
    spawn: { x: 0, y: 1, z: 0 },
  },
  sandbox: {
    type: 'sandbox',
    spawn: { x: 0, y: 1, z: 5 },
  },
  dam: {
    type: 'glb',
    modelPath: '/models/levels/dam.glb',
    modelScale: 1,
    spawn: { x: 0, y: 1, z: 0 },
  },
  facility: {
    type: 'glb',
    modelPath: '/models/levels/facility.glb',
    modelScale: 1,
    spawn: { x: -10.1, y: -3.3, z: -5.6 },
  },
  runway: {
    type: 'glb',
    modelPath: '/models/levels/runway.glb',
    modelScale: 1,
    spawn: { x: 0, y: 1, z: 0 },
  },
  surface1: {
    type: 'glb',
    modelPath: '/models/levels/surface1.glb',
    modelScale: 1,
    spawn: { x: 0, y: 1, z: 0 },
  },
  bunker1: {
    type: 'glb',
    modelPath: '/models/levels/bunker1.glb',
    modelScale: 1,
    spawn: { x: 0, y: 1, z: 0 },
  },
  silo: {
    type: 'glb',
    modelPath: '/models/levels/silo.glb',
    modelScale: 1,
    spawn: { x: 0, y: 1, z: 0 },
  },
  frigate: {
    type: 'glb',
    modelPath: '/models/levels/frigate.glb',
    modelScale: 1,
    spawn: { x: 0, y: 1, z: 0 },
  },
  surface2: {
    type: 'glb',
    modelPath: '/models/levels/surface2.glb',
    modelScale: 1,
    spawn: { x: 0, y: 1, z: 0 },
  },
  bunker2: {
    type: 'glb',
    modelPath: '/models/levels/bunker2.glb',
    modelScale: 1,
    spawn: { x: 0, y: 1, z: 0 },
  },
  statue: {
    type: 'glb',
    modelPath: '/models/levels/statue.glb',
    modelScale: 1,
    spawn: { x: 0, y: 1, z: 0 },
  },
  archives: {
    type: 'glb',
    modelPath: '/models/levels/archives.glb',
    modelScale: 1,
    spawn: { x: 0, y: 1, z: 0 },
  },
  streets: {
    type: 'glb',
    modelPath: '/models/levels/streets.glb',
    modelScale: 1,
    spawn: { x: 0, y: 1, z: 0 },
  },
  depot: {
    type: 'glb',
    modelPath: '/models/levels/depot.glb',
    modelScale: 1,
    spawn: { x: 0, y: 1, z: 0 },
  },
  train: {
    type: 'glb',
    modelPath: '/models/levels/train.glb',
    modelScale: 1,
    spawn: { x: 0, y: 1, z: 0 },
  },
  jungle: {
    type: 'glb',
    modelPath: '/models/levels/jungle.glb',
    modelScale: 1,
    spawn: { x: 0, y: 1, z: 0 },
  },
  control: {
    type: 'glb',
    modelPath: '/models/levels/control.glb',
    modelScale: 1,
    spawn: { x: 0, y: 1, z: 0 },
  },
  caverns: {
    type: 'glb',
    modelPath: '/models/levels/caverns.glb',
    modelScale: 1,
    spawn: { x: 0, y: 1, z: 0 },
  },
  cradle: {
    type: 'glb',
    modelPath: '/models/levels/cradle.glb',
    modelScale: 1,
    spawn: { x: 0, y: 1, z: 0 },
  },
  aztec: {
    type: 'glb',
    modelPath: '/models/levels/aztec.glb',
    modelScale: 1,
    spawn: { x: 0, y: 1, z: 0 },
  },
  egyptian: {
    type: 'glb',
    modelPath: '/models/levels/egyptian.glb',
    modelScale: 1,
    spawn: { x: 0, y: 1, z: 0 },
  },
  complex: {
    type: 'glb',
    modelPath: '/models/levels/complex.glb',
    modelScale: 1,
    spawn: { x: 0, y: 1, z: 0 },
  },
  level1: customLevel('level1'),
  testlevel: customLevel('testlevel'),
  testlights: customLevel('testlights'),
};

export type LevelType = keyof typeof LEVELS;

export function getLevelConfig(level: string): LevelConfig | undefined {
  return LEVELS[level];
}

export function getValidLevels(): string[] {
  return Object.keys(LEVELS);
}

export function getDoorScale(config: LevelConfig): number {
  return config.doorScale ?? DEFAULT_DOOR_SCALE;
}
