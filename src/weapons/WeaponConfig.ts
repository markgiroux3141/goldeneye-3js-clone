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
  modelPath: '/models/weapons/rcp90/gun.glb',
  muzzleFlashPath: '/models/weapons/rcp90/muzzle.glb',
  modelScale: 0.0007,
  modelOffset: new THREE.Vector3(0.09, -0.12, 0.14),
  pivotOffset: new THREE.Vector3(0, 0, -0.06),
  muzzleOffset: new THREE.Vector3(0.05, 0.05, -0.3),
  sounds: {
    fire: '/sounds/rifle9.wav',
    reload: '/sounds/reload.wav',
    empty: '/sounds/empty.wav',
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
  sounds: {
    fire: '/sounds/rifle9.wav',
    reload: '/sounds/reload.wav',
    empty: '/sounds/empty.wav',
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
  sounds: {
    fire: '/sounds/rifle9.wav',
    reload: '/sounds/reload.wav',
    empty: '/sounds/empty.wav',
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
  sounds: {
    fire: '/sounds/gunshot2.wav',
    reload: '/sounds/reload.wav',
    empty: '/sounds/empty.wav',
  },
};
