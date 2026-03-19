export interface LevelConfig {
  type: 'glb' | 'procedural' | 'sandbox';
  modelPath?: string;
  modelScale?: number;
  spawn: { x: number; y: number; z: number };
  doorScale?: number;
  fog?: { color: number; near: number; far: number };
}

const DEFAULT_DOOR_SCALE = 0.0014;

export const LEVELS: Record<string, LevelConfig> = {
  procedural: {
    type: 'procedural',
    spawn: { x: 0, y: 1, z: 0 },
  },
  sandbox: {
    type: 'sandbox',
    spawn: { x: 0, y: 1, z: 5 },
  },
  facility: {
    type: 'glb',
    modelPath: '/models/levels/facility.glb',
    modelScale: 0.009375,
    spawn: { x: -10.1, y: -3.3, z: -5.6 },
  },
  dam: {
    type: 'glb',
    modelPath: '/models/levels/dam.glb',
    modelScale: 0.04841,
    spawn: { x: 0, y: 1, z: 0 },
  },
  bunker: {
    type: 'glb',
    modelPath: '/models/levels/bunker.glb',
    modelScale: 0.020973,
    spawn: { x: 0, y: 1, z: 0 },
  },
  aztec: {
    type: 'glb',
    modelPath: '/models/levels/aztec.glb',
    modelScale: 0.032036,
    spawn: { x: 0, y: 1, z: 0 },
  },
  caverns: {
    type: 'glb',
    modelPath: '/models/levels/caverns.glb',
    modelScale: 0.042157,
    spawn: { x: 0, y: 1, z: 0 },
  },
  complex: {
    type: 'glb',
    modelPath: '/models/levels/complex.glb',
    modelScale: 0.011996,
    spawn: { x: 0, y: 1, z: 0 },
  },
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
