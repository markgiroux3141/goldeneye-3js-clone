import * as THREE from 'three';

export interface WeaponStats {
  name: string;
  fireCooldown: number;
  magazineSize: number;
  reloadTime: number;
  damage: number;
  range: number;
  modelPath: string;
  muzzleFlashPath: string;
  modelScale: number;
  modelOffset: THREE.Vector3;
  pivotOffset: THREE.Vector3;
  muzzleOffset: THREE.Vector3;
  modelRotation: THREE.Vector3; // radians (x, y, z)
  recoilZ: number; // kick-back distance on fire
  recoilRot: number; // pitch-up rotation on fire (radians, negative = up)
  zoomFOV: number; // camera FOV when zoomed (75 = no zoom)
  sounds: {
    fire: string;
    reload: string;
    empty: string;
  };
}

export const RCP90: WeaponStats = {
  name: 'RC-P90',
  fireCooldown: 0.07,
  magazineSize: 80,
  reloadTime: 2.0,
  damage: 10,
  range: 80,
  modelPath: '/models/weapons/rcp-90/gun.glb',
  muzzleFlashPath: '/models/weapons/rcp-90/muzzle.glb',
  modelScale: 0.0007,
  modelOffset: new THREE.Vector3(0.09, -0.12, 0.14),
  pivotOffset: new THREE.Vector3(0, 0, -0.06),
  muzzleOffset: new THREE.Vector3(0.05, 0.05, -0.3),
  modelRotation: new THREE.Vector3(0, Math.PI, 0),
  recoilZ: 0.02,
  recoilRot: 0.03,
  zoomFOV: 75,
  sounds: {
    fire: '/sounds/weapons/rcp90-fire.wav',
    reload: '/sounds/weapons/reload.wav',
    empty: '/sounds/weapons/empty.wav',
  },
};

export const AR33: WeaponStats = {
  name: 'AR33',
  fireCooldown: 0.1,
  magazineSize: 30,
  reloadTime: 2.0,
  damage: 15,
  range: 90,
  modelPath: '/models/weapons/ar33/gun.glb',
  muzzleFlashPath: '/models/weapons/ar33/muzzle.glb',
  modelScale: 0.0007,
  modelOffset: new THREE.Vector3(0.12, -0.11, -0.1),
  pivotOffset: new THREE.Vector3(0, 0, -0.06),
  muzzleOffset: new THREE.Vector3(0.05, 0.05, -0.3),
  modelRotation: new THREE.Vector3(0, Math.PI, 0),
  recoilZ: 0.02,
  recoilRot: 0.03,
  zoomFOV: 75,
  sounds: {
    fire: '/sounds/weapons/ar33-fire.wav',
    reload: '/sounds/weapons/reload.wav',
    empty: '/sounds/weapons/empty.wav',
  },
};

export const KF7: WeaponStats = {
  name: 'KF7 Soviet',
  fireCooldown: 0.12,
  magazineSize: 30,
  reloadTime: 2.0,
  damage: 15,
  range: 85,
  modelPath: '/models/weapons/kf7/gun.glb',
  muzzleFlashPath: '/models/weapons/kf7/muzzle.glb',
  modelScale: 0.0007,
  modelOffset: new THREE.Vector3(0.12, -0.12, -0.09),
  pivotOffset: new THREE.Vector3(0, 0, -0.06),
  muzzleOffset: new THREE.Vector3(0.05, 0.05, -0.3),
  modelRotation: new THREE.Vector3(0, Math.PI, 0),
  recoilZ: 0.02,
  recoilRot: 0.03,
  zoomFOV: 75,
  sounds: {
    fire: '/sounds/weapons/k47-fire.wav',
    reload: '/sounds/weapons/reload.wav',
    empty: '/sounds/weapons/empty.wav',
  },
};

export const PISTOL: WeaponStats = {
  name: 'PP7',
  fireCooldown: 0.4,
  magazineSize: 7,
  reloadTime: 1.5,
  damage: 25,
  range: 100,
  modelPath: '/models/weapons/pp7/gun.glb',
  muzzleFlashPath: '/models/weapons/pp7/muzzle.glb',
  modelScale: 0.0007,
  modelOffset: new THREE.Vector3(0.1, -0.08, -0.14),
  pivotOffset: new THREE.Vector3(0, 0, -0.06),
  muzzleOffset: new THREE.Vector3(0.05, 0.05, -0.3),
  modelRotation: new THREE.Vector3(0, Math.PI, 0),
  recoilZ: 0.03,
  recoilRot: 0.26,
  zoomFOV: 75,
  sounds: {
    fire: '/sounds/weapons/pp7-fire.wav',
    reload: '/sounds/weapons/reload.wav',
    empty: '/sounds/weapons/empty.wav',
  },
};

// ─── Default position/rotation shared by new weapons (tuned later via weapon editor) ──

const DEFAULT_OFFSET = new THREE.Vector3(0.1, -0.1, -0.1);
const DEFAULT_PIVOT = new THREE.Vector3(0, 0, -0.06);
const DEFAULT_MUZZLE = new THREE.Vector3(0.05, 0.05, -0.3);
const DEFAULT_ROT = new THREE.Vector3(0, Math.PI, 0);
const DEFAULT_SCALE = 0.0007;

const RELOAD = '/sounds/weapons/reload.wav';
const EMPTY = '/sounds/weapons/empty.wav';

function snd(fire: string) {
  return { fire, reload: RELOAD, empty: EMPTY };
}

export const DD44: WeaponStats = {
  name: 'DD44 Dostovei',
  fireCooldown: 0.4,
  magazineSize: 8,
  reloadTime: 1.5,
  damage: 20,
  range: 80,
  modelPath: '/models/weapons/dd44/gun.glb',
  muzzleFlashPath: '/models/weapons/dd44/muzzle.glb',
  modelScale: DEFAULT_SCALE,
  modelOffset: DEFAULT_OFFSET.clone(),
  pivotOffset: DEFAULT_PIVOT.clone(),
  muzzleOffset: DEFAULT_MUZZLE.clone(),
  modelRotation: DEFAULT_ROT.clone(),
  recoilZ: 0.03,
  recoilRot: 0.26,
  zoomFOV: 75,
  sounds: snd('/sounds/weapons/dd44-fire.wav'),
};

export const KLOBB: WeaponStats = {
  name: 'Klobb',
  fireCooldown: 0.1,
  magazineSize: 20,
  reloadTime: 2.0,
  damage: 5,
  range: 50,
  modelPath: '/models/weapons/klobb/gun.glb',
  muzzleFlashPath: '/models/weapons/klobb/muzzle.glb',
  modelScale: DEFAULT_SCALE,
  modelOffset: DEFAULT_OFFSET.clone(),
  pivotOffset: DEFAULT_PIVOT.clone(),
  muzzleOffset: DEFAULT_MUZZLE.clone(),
  modelRotation: DEFAULT_ROT.clone(),
  recoilZ: 0.02,
  recoilRot: 0.03,
  zoomFOV: 75,
  sounds: snd('/sounds/weapons/klobb-fire.wav'),
};

export const DK5: WeaponStats = {
  name: 'D5K Deutsche',
  fireCooldown: 0.08,
  magazineSize: 30,
  reloadTime: 2.0,
  damage: 8,
  range: 60,
  modelPath: '/models/weapons/dk5/gun.glb',
  muzzleFlashPath: '/models/weapons/dk5/muzzle.glb',
  modelScale: DEFAULT_SCALE,
  modelOffset: DEFAULT_OFFSET.clone(),
  pivotOffset: DEFAULT_PIVOT.clone(),
  muzzleOffset: DEFAULT_MUZZLE.clone(),
  modelRotation: DEFAULT_ROT.clone(),
  recoilZ: 0.02,
  recoilRot: 0.03,
  zoomFOV: 75,
  sounds: snd('/sounds/weapons/dk5-fire.wav'),
};

export const DK5_SILENCER: WeaponStats = {
  name: 'D5K (Silenced)',
  fireCooldown: 0.08,
  magazineSize: 30,
  reloadTime: 2.0,
  damage: 8,
  range: 60,
  modelPath: '/models/weapons/dk5-silencer/gun.glb',
  muzzleFlashPath: '/models/weapons/dk5-silencer/muzzle.glb',
  modelScale: DEFAULT_SCALE,
  modelOffset: DEFAULT_OFFSET.clone(),
  pivotOffset: DEFAULT_PIVOT.clone(),
  muzzleOffset: DEFAULT_MUZZLE.clone(),
  modelRotation: DEFAULT_ROT.clone(),
  recoilZ: 0.02,
  recoilRot: 0.03,
  zoomFOV: 75,
  sounds: snd('/sounds/weapons/silencer-pistol.wav'),
};

export const PHANTOM: WeaponStats = {
  name: 'Phantom',
  fireCooldown: 0.06,
  magazineSize: 50,
  reloadTime: 2.0,
  damage: 8,
  range: 60,
  modelPath: '/models/weapons/phantom/gun.glb',
  muzzleFlashPath: '/models/weapons/phantom/muzzle.glb',
  modelScale: DEFAULT_SCALE,
  modelOffset: DEFAULT_OFFSET.clone(),
  pivotOffset: DEFAULT_PIVOT.clone(),
  muzzleOffset: DEFAULT_MUZZLE.clone(),
  modelRotation: DEFAULT_ROT.clone(),
  recoilZ: 0.02,
  recoilRot: 0.03,
  zoomFOV: 75,
  sounds: snd('/sounds/weapons/k47-fire.wav'),
};

export const AUTO_SHOTGUN: WeaponStats = {
  name: 'Auto Shotgun',
  fireCooldown: 0.25,
  magazineSize: 5,
  reloadTime: 2.5,
  damage: 40,
  range: 30,
  modelPath: '/models/weapons/auto-shotgun/gun.glb',
  muzzleFlashPath: '/models/weapons/auto-shotgun/muzzle.glb',
  modelScale: DEFAULT_SCALE,
  modelOffset: DEFAULT_OFFSET.clone(),
  pivotOffset: DEFAULT_PIVOT.clone(),
  muzzleOffset: DEFAULT_MUZZLE.clone(),
  modelRotation: DEFAULT_ROT.clone(),
  recoilZ: 0.04,
  recoilRot: 0.06,
  zoomFOV: 75,
  sounds: snd('/sounds/weapons/auto-shotgun-fire.wav'),
};

export const SHOTGUN: WeaponStats = {
  name: 'Shotgun',
  fireCooldown: 0.8,
  magazineSize: 5,
  reloadTime: 3.0,
  damage: 50,
  range: 25,
  modelPath: '/models/weapons/shotgun/gun.glb',
  muzzleFlashPath: '/models/weapons/shotgun/muzzle.glb',
  modelScale: DEFAULT_SCALE,
  modelOffset: DEFAULT_OFFSET.clone(),
  pivotOffset: DEFAULT_PIVOT.clone(),
  muzzleOffset: DEFAULT_MUZZLE.clone(),
  modelRotation: DEFAULT_ROT.clone(),
  recoilZ: 0.04,
  recoilRot: 0.06,
  zoomFOV: 75,
  sounds: snd('/sounds/weapons/shotgun-fire.wav'),
};

export const SNIPER: WeaponStats = {
  name: 'Sniper Rifle',
  fireCooldown: 1.2,
  magazineSize: 8,
  reloadTime: 2.5,
  damage: 100,
  range: 200,
  modelPath: '/models/weapons/sniper/gun.glb',
  muzzleFlashPath: '',
  modelScale: DEFAULT_SCALE,
  modelOffset: DEFAULT_OFFSET.clone(),
  pivotOffset: DEFAULT_PIVOT.clone(),
  muzzleOffset: DEFAULT_MUZZLE.clone(),
  modelRotation: DEFAULT_ROT.clone(),
  recoilZ: 0.02,
  recoilRot: 0.03,
  zoomFOV: 25,
  sounds: snd('/sounds/weapons/silencer-pistol.wav'),
};

export const MAGNUM: WeaponStats = {
  name: 'Cougar Magnum',
  fireCooldown: 0.6,
  magazineSize: 6,
  reloadTime: 1.5,
  damage: 50,
  range: 100,
  modelPath: '/models/weapons/magnum/gun.glb',
  muzzleFlashPath: '/models/weapons/magnum/muzzle.glb',
  modelScale: DEFAULT_SCALE,
  modelOffset: DEFAULT_OFFSET.clone(),
  pivotOffset: DEFAULT_PIVOT.clone(),
  muzzleOffset: DEFAULT_MUZZLE.clone(),
  modelRotation: DEFAULT_ROT.clone(),
  recoilZ: 0.03,
  recoilRot: 0.26,
  zoomFOV: 75,
  sounds: snd('/sounds/weapons/magnum-fire.wav'),
};

export const GOLDEN_GUN: WeaponStats = {
  name: 'Golden Gun',
  fireCooldown: 1.0,
  magazineSize: 1,
  reloadTime: 1.0,
  damage: 999,
  range: 200,
  modelPath: '/models/weapons/golden-gun/gun.glb',
  muzzleFlashPath: '/models/weapons/golden-gun/muzzle.glb',
  modelScale: DEFAULT_SCALE,
  modelOffset: DEFAULT_OFFSET.clone(),
  pivotOffset: DEFAULT_PIVOT.clone(),
  muzzleOffset: DEFAULT_MUZZLE.clone(),
  modelRotation: DEFAULT_ROT.clone(),
  recoilZ: 0.03,
  recoilRot: 0.26,
  zoomFOV: 75,
  sounds: snd('/sounds/weapons/pp7-fire.wav'),
};

export const GOLD_PP7: WeaponStats = {
  name: 'Gold PP7',
  fireCooldown: 0.4,
  magazineSize: 7,
  reloadTime: 1.5,
  damage: 25,
  range: 100,
  modelPath: '/models/weapons/gold-pp7/gun.glb',
  muzzleFlashPath: '/models/weapons/gold-pp7/muzzle.glb',
  modelScale: DEFAULT_SCALE,
  modelOffset: DEFAULT_OFFSET.clone(),
  pivotOffset: DEFAULT_PIVOT.clone(),
  muzzleOffset: DEFAULT_MUZZLE.clone(),
  modelRotation: DEFAULT_ROT.clone(),
  recoilZ: 0.03,
  recoilRot: 0.26,
  zoomFOV: 75,
  sounds: snd('/sounds/weapons/pp7-fire.wav'),
};

export const SILVER_PP7: WeaponStats = {
  name: 'Silver PP7',
  fireCooldown: 0.4,
  magazineSize: 7,
  reloadTime: 1.5,
  damage: 25,
  range: 100,
  modelPath: '/models/weapons/silver-pp7/gun.glb',
  muzzleFlashPath: '/models/weapons/silver-pp7/muzzle.glb',
  modelScale: DEFAULT_SCALE,
  modelOffset: DEFAULT_OFFSET.clone(),
  pivotOffset: DEFAULT_PIVOT.clone(),
  muzzleOffset: DEFAULT_MUZZLE.clone(),
  modelRotation: DEFAULT_ROT.clone(),
  recoilZ: 0.03,
  recoilRot: 0.26,
  zoomFOV: 75,
  sounds: snd('/sounds/weapons/pp7-fire.wav'),
};

export const PP7_SILENCER: WeaponStats = {
  name: 'PP7 (Silenced)',
  fireCooldown: 0.4,
  magazineSize: 7,
  reloadTime: 1.5,
  damage: 25,
  range: 100,
  modelPath: '/models/weapons/pp7-silencer/gun.glb',
  muzzleFlashPath: '/models/weapons/pp7-silencer/muzzle.glb',
  modelScale: DEFAULT_SCALE,
  modelOffset: DEFAULT_OFFSET.clone(),
  pivotOffset: DEFAULT_PIVOT.clone(),
  muzzleOffset: DEFAULT_MUZZLE.clone(),
  modelRotation: DEFAULT_ROT.clone(),
  recoilZ: 0.03,
  recoilRot: 0.26,
  zoomFOV: 75,
  sounds: snd('/sounds/weapons/silencer-pistol.wav'),
};

export const LASER: WeaponStats = {
  name: 'Moonraker Laser',
  fireCooldown: 0.05,
  magazineSize: 800,
  reloadTime: 3.0,
  damage: 5,
  range: 150,
  modelPath: '/models/weapons/laser/gun.glb',
  muzzleFlashPath: '/models/weapons/laser/muzzle.glb',
  modelScale: DEFAULT_SCALE,
  modelOffset: DEFAULT_OFFSET.clone(),
  pivotOffset: DEFAULT_PIVOT.clone(),
  muzzleOffset: DEFAULT_MUZZLE.clone(),
  modelRotation: DEFAULT_ROT.clone(),
  recoilZ: 0.02,
  recoilRot: 0.03,
  zoomFOV: 75,
  sounds: snd('/sounds/weapons/laser-fire.wav'),
};

export const ZMG: WeaponStats = {
  name: 'ZMG 9mm',
  fireCooldown: 0.06,
  magazineSize: 32,
  reloadTime: 2.0,
  damage: 8,
  range: 60,
  modelPath: '/models/weapons/zmgobj/gun.glb',
  muzzleFlashPath: '/models/weapons/zmgobj/muzzle.glb',
  modelScale: DEFAULT_SCALE,
  modelOffset: DEFAULT_OFFSET.clone(),
  pivotOffset: DEFAULT_PIVOT.clone(),
  muzzleOffset: DEFAULT_MUZZLE.clone(),
  modelRotation: DEFAULT_ROT.clone(),
  recoilZ: 0.02,
  recoilRot: 0.03,
  zoomFOV: 75,
  sounds: snd('/sounds/weapons/k47-fire.wav'),
};

// All weapon configs in one array for easy iteration
export const ALL_WEAPONS: WeaponStats[] = [
  PISTOL, DD44, MAGNUM, GOLDEN_GUN,       // pistols
  GOLD_PP7, SILVER_PP7, PP7_SILENCER,     // pp7 variants
  KLOBB, DK5, DK5_SILENCER, PHANTOM, ZMG, // smgs
  RCP90, AR33, KF7,                        // rifles
  SHOTGUN, AUTO_SHOTGUN,                   // shotguns
  SNIPER, LASER,                           // special
];

/**
 * Load weapon visual overrides from /config/weapon-config.json (if it exists).
 * Silently skips if the file is missing (404).
 */
export async function loadWeaponOverrides(): Promise<void> {
  try {
    const res = await fetch('/config/weapon-config.json');
    if (!res.ok) return;
    const data = await res.json() as Record<string, Record<string, unknown>>;
    for (const weapon of ALL_WEAPONS) {
      const entry = data[weapon.name];
      if (!entry) continue;
      if (Array.isArray(entry.modelOffset)) weapon.modelOffset.set(...(entry.modelOffset as [number, number, number]));
      if (Array.isArray(entry.pivotOffset)) weapon.pivotOffset.set(...(entry.pivotOffset as [number, number, number]));
      if (Array.isArray(entry.muzzleOffset)) weapon.muzzleOffset.set(...(entry.muzzleOffset as [number, number, number]));
      if (Array.isArray(entry.modelRotation)) weapon.modelRotation.set(...(entry.modelRotation as [number, number, number]));
      if (typeof entry.modelScale === 'number') weapon.modelScale = entry.modelScale;
      if (typeof entry.zoomFOV === 'number') weapon.zoomFOV = entry.zoomFOV;
    }
    console.log('[WeaponConfig] Loaded overrides from weapon-config.json');
  } catch {
    // Network error or parse error — silently use defaults
  }
}
