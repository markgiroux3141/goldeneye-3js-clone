import * as THREE from 'three';

/**
 * Enemy weapon definitions ported from GoldenEye WeaponConfig.js.
 * Position/rotation offsets are in bone-local space (GE scale),
 * since the model is scaled 0.001 at the group level.
 * Bone_9 = right hand, Bone_8 = left hand.
 */

export interface EnemyWeaponDef {
  name: string;
  type: 'pistol' | 'rifle';
  auto: boolean;
  fireRate: number;        // shots per second
  fireDelay: number;       // seconds before first shot
  fireDuration: number;    // seconds of sustained fire
  accuracy: number;        // base hit chance 0-1
  range: number;           // effective range in meters
  gunFile: string;
  muzzleFile: string;
  soundFile: string;
  position: THREE.Vector3;       // right hand offset
  rotation: THREE.Euler;         // right hand rotation
  leftPosition: THREE.Vector3;   // left hand offset (dual wield)
  leftRotation: THREE.Euler;     // left hand rotation (dual wield)
}

export const ENEMY_WEAPONS: Record<string, EnemyWeaponDef> = {
  pp7: {
    name: 'PP7 (Pistol)',
    type: 'pistol',
    auto: false,
    fireRate: 2,
    fireDelay: 0.4,
    fireDuration: 0.1,
    accuracy: 0.85,
    range: 8.0,
    gunFile: '/models/weapons/pp7/gun.glb',
    muzzleFile: '/models/weapons/pp7/muzzle.glb',
    soundFile: '/sounds/weapons/pp7-fire.wav',
    position: new THREE.Vector3(-150, 30, 115),
    rotation: new THREE.Euler(-0.39, -1.49, -1.84),
    leftPosition: new THREE.Vector3(175, -30, 115),
    leftRotation: new THREE.Euler(3.11, 1.66, -1.49),
  },
  kf7: {
    name: 'KF7 Soviet',
    type: 'rifle',
    auto: true,
    fireRate: 8,
    fireDelay: 0.3,
    fireDuration: 1.5,
    accuracy: 0.75,
    range: 12.0,
    gunFile: '/models/weapons/kf7/gun.glb',
    muzzleFile: '/models/weapons/kf7/muzzle.glb',
    soundFile: '/sounds/weapons/k47-fire.wav',
    position: new THREE.Vector3(-90, 0, 145),
    rotation: new THREE.Euler(0, -1.49, -1.69),
    leftPosition: new THREE.Vector3(0, 0, 0),
    leftRotation: new THREE.Euler(0, 0, 0),
  },
  ar33: {
    name: 'AR33 Assault Rifle',
    type: 'rifle',
    auto: true,
    fireRate: 6,
    fireDelay: 0.3,
    fireDuration: 1.5,
    accuracy: 0.8,
    range: 10.0,
    gunFile: '/models/weapons/ar33/gun.glb',
    muzzleFile: '/models/weapons/ar33/muzzle.glb',
    soundFile: '/sounds/weapons/ar33-fire.wav',
    position: new THREE.Vector3(-90, 0, 145),
    rotation: new THREE.Euler(0, -1.49, -1.69),
    leftPosition: new THREE.Vector3(0, 0, 0),
    leftRotation: new THREE.Euler(0, 0, 0),
  },
  rcp90: {
    name: 'RC-P90',
    type: 'rifle',
    auto: true,
    fireRate: 12,
    fireDelay: 0.2,
    fireDuration: 2.0,
    accuracy: 0.7,
    range: 8.0,
    gunFile: '/models/weapons/rcp-90/gun.glb',
    muzzleFile: '/models/weapons/rcp-90/muzzle.glb',
    soundFile: '/sounds/weapons/rcp90-fire.wav',
    position: new THREE.Vector3(145, 0, 0),
    rotation: new THREE.Euler(0, -1.59, -1.59),
    leftPosition: new THREE.Vector3(-145, 0, 0),
    leftRotation: new THREE.Euler(0.26, 1.56, 1.26),
  },
};
