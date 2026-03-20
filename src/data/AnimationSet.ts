/**
 * Animation data ported from GoldenEye enemy system.
 * All paths updated to /models/enemies/animations/.
 * All speed values converted: GE units ÷ 1000 = meters.
 */

// ── Animation path manifest ────────────────────────────────────────

export const DEFAULT_ANIMATIONS: Record<string, string> = {
  // Locomotion
  idle:         '/models/enemies/animations/00-idle.glb',
  walk:         '/models/enemies/animations/28-walking.glb',
  jog:          '/models/enemies/animations/2A-jogging.glb',
  run:          '/models/enemies/animations/29-running.glb',

  // Combat - rifle
  fire:                '/models/enemies/animations/01-fire-standing.glb',
  fireFast:            '/models/enemies/animations/02-fire-standing-fast.glb',
  fireHip:             '/models/enemies/animations/03-fire-hip.glb',
  fireShoulderLeft:    '/models/enemies/animations/04-fire-shoulder-left.glb',
  fireTurnRight1:      '/models/enemies/animations/05-fire-turn-right-1.glb',
  fireTurnRight2:      '/models/enemies/animations/06-fire-turn-right-2.glb',
  fireKneelRightLeg:   '/models/enemies/animations/07-fire-kneel-right-leg.glb',
  fireKneelLeftLeg:    '/models/enemies/animations/08-fire-kneel-left-leg.glb',
  fireKneelLeft:       '/models/enemies/animations/09-fire-kneel-left.glb',
  fireKneelRight:      '/models/enemies/animations/0A-fire-kneel-right.glb',
  fireRollLeft:        '/models/enemies/animations/0B-fire-roll-left.glb',
  fireRollRight:       '/models/enemies/animations/0C-fire-roll-right-1.glb',

  // Combat - pistol
  firePistol:          '/models/enemies/animations/41-fire-standing-pistol.glb',
  firePistolDrawFast:  '/models/enemies/animations/42-fire-standing-draw-pistol-fast.glb',
  firePistolDrawSlow:  '/models/enemies/animations/43-fire-standing-draw-pistol-slow.glb',
  firePistolHipFast:   '/models/enemies/animations/44-fire-hip-pistol-fast.glb',
  firePistolHipSlow:   '/models/enemies/animations/45-fire-hip-pistol-slow.glb',
  firePistolHipFwd:    '/models/enemies/animations/46-fire-hip-forward-pistol.glb',

  // Combat - dual wield
  fireDualWalkR:       '/models/enemies/animations/6C-fire-walking-dual-wield.glb',
  fireDualWalkCross:   '/models/enemies/animations/6D-fire-walking-dual-wield-hands-crossed.glb',
  fireDualKneel:       '/models/enemies/animations/74-fire-kneel-dual-wield.glb',
  fireDualWield:       '/models/enemies/animations/7A-fire-standing-dual-wield.glb',
  fireDualWieldLeft:   '/models/enemies/animations/7B-fire-standing-dual-wield-left.glb',
  fireDualWieldRight:  '/models/enemies/animations/7C-fire-standing-dual-wield-right.glb',

  // Combat - movement (short loops for auto-fire)
  fireWalking:      '/models/enemies/animations/30-fire-walking.glb',
  fireJogging:      '/models/enemies/animations/31-fire-jogging.glb',
  fireJoggingDual:  '/models/enemies/animations/6E-fire-jogging-dual-wield.glb',
  fireRunningDual:  '/models/enemies/animations/70-fire-running-dual-wield.glb',

  // Evasion
  rollLeft:     '/models/enemies/animations/0B-fire-roll-left.glb',
  rollRight:    '/models/enemies/animations/0C-fire-roll-right-1.glb',
  slideLeft:    '/models/enemies/animations/3B-slide-left.glb',
  slideRight:   '/models/enemies/animations/3A-slide-right.glb',
  jumpLeft:     '/models/enemies/animations/34-fire-jump-to-side-left.glb',
  jumpRight:    '/models/enemies/animations/35-fire-jump-to-side-right.glb',
  sideStepLeft: '/models/enemies/animations/26-side-step-left.glb',

  // Hit reactions
  hitLeftShoulder:  '/models/enemies/animations/0E-hit-left-shoulder.glb',
  hitRightShoulder: '/models/enemies/animations/0F-hit-right-shoulder.glb',
  hitLeftArm:       '/models/enemies/animations/10-hit-left-arm.glb',
  hitRightArm:      '/models/enemies/animations/11-hit-right-arm.glb',
  hitLeftHand:      '/models/enemies/animations/12-hit-left-hand.glb',
  hitRightHand:     '/models/enemies/animations/13-hit-right-hand.glb',
  hitLeftLeg:       '/models/enemies/animations/14-hit-left-leg.glb',
  hitRightLeg:      '/models/enemies/animations/15-hit-right-leg.glb',
  hitNeck:          '/models/enemies/animations/17-hit-neck.glb',
  hitButtLong:      '/models/enemies/animations/36-hit-butt-long.glb',
  hitButtShort:     '/models/enemies/animations/37-hit-butt-short.glb',
  hitTaser:         '/models/enemies/animations/81-hit-taser.glb',

  // Deaths
  deathGenitalia:             '/models/enemies/animations/16-death-genitalia.glb',
  deathNeck:                  '/models/enemies/animations/18-death-neck.glb',
  deathStaggerToWall:         '/models/enemies/animations/19-death-stagger-back-to-wall.glb',
  deathForward:               '/models/enemies/animations/1A-death-forward-face-down.glb',
  deathForwardSpinFaceUp:     '/models/enemies/animations/1B-death-forward-spin-face-up.glb',
  deathBackward:              '/models/enemies/animations/1C-death-backward-fall-face-up-1.glb',
  deathSpinRight:             '/models/enemies/animations/1D-death-backward-spin-face-down-right.glb',
  deathBackwardSpinFaceUpR:   '/models/enemies/animations/1E-death-backward-spin-face-up-right.glb',
  deathSpinLeft:              '/models/enemies/animations/1F-death-backward-spin-face-down-left.glb',
  deathBackwardSpinFaceUpL:   '/models/enemies/animations/20-death-backward-spin-face-up-left.glb',
  deathForwardHard:           '/models/enemies/animations/21-death-forward-face-down-hard.glb',
  deathForwardSoft:           '/models/enemies/animations/22-death-forward-face-down-soft.glb',
  deathFetalRight:            '/models/enemies/animations/23-death-fetal-position-right.glb',
  deathFetalLeft:             '/models/enemies/animations/24-death-fetal-position-left.glb',
  deathBackwardFaceUp2:       '/models/enemies/animations/25-death-backward-fall-face-up-2.glb',
  deathHead:                  '/models/enemies/animations/38-death-head.glb',
  deathLeftLeg:               '/models/enemies/animations/39-death-left-leg.glb',
  deathExplosion:             '/models/enemies/animations/82-death-explosion-forward.glb',
  deathExplosionLeft1:        '/models/enemies/animations/83-death-explosion-left-1.glb',
  deathExplosionBackLeft:     '/models/enemies/animations/84-death-explosion-back-left.glb',
  deathExplosionBack1:        '/models/enemies/animations/85-death-explosion-back-1.glb',
  deathExplosionRight:        '/models/enemies/animations/86-death-explosion-right.glb',
  deathExplosionForwardR1:    '/models/enemies/animations/87-death-explosion-forward-right-1.glb',
  deathExplosionBack2:        '/models/enemies/animations/88-death-explosion-back-2.glb',
  deathExplosionForwardRoll:  '/models/enemies/animations/89-death-explosion-forward-roll.glb',
  deathExplosionFaceDown:     '/models/enemies/animations/8A-death-explosion-forward-face-down.glb',
  deathExplosionLeft2:        '/models/enemies/animations/8B-death-explosion-left-2.glb',
  deathExplosionForwardR2:    '/models/enemies/animations/8C-death-explosion-forward-right-2.glb',
  deathExplosionForwardR2a:   '/models/enemies/animations/8D-death-explosion-forward-right-2-alt.glb',
  deathExplosionForwardR3:    '/models/enemies/animations/8E-death-explosion-forward-right-3.glb',

  // Situational
  surrender:        '/models/enemies/animations/2E-surrendering-armed.glb',
  surrenderUnarmed: '/models/enemies/animations/A4-surrendering-unarmed.glb',
  lookAround:       '/models/enemies/animations/40-look-around.glb',
  conversation:     '/models/enemies/animations/98-conversation.glb',
  standUp:          '/models/enemies/animations/A8-standing-up.glb',

  // Idle variants
  idleUnarmed:  '/models/enemies/animations/6A-idle-unarmed.glb',
  yawning:      '/models/enemies/animations/9A-yawning.glb',
  scratching:   '/models/enemies/animations/9C-scratching-leg.glb',
  dancing:      '/models/enemies/animations/AA-dancing.glb',
};

// ── Speed thresholds (meters/sec) ──────────────────────────────────

export const SPEED_THRESHOLDS = {
  walk: 1.5,
  jog:  3.5,
  run:  5.0,
};

// ── Fire timing windows (seconds into animation) ──────────────────

export interface FireTimingWindow {
  fireStart: number;
  fireEnd: number;
}

export const FIRE_TIMING: Record<string, FireTimingWindow> = {
  // Two-handed assault rifle
  '01': { fireStart: 0.9,  fireEnd: 2.67 },
  '02': { fireStart: 0.76, fireEnd: 1.77 },
  '03': { fireStart: 0.7,  fireEnd: 2.07 },
  '04': { fireStart: 0.5,  fireEnd: 2.1  },
  '05': { fireStart: 1.27, fireEnd: 3.13 },
  '06': { fireStart: 0.97, fireEnd: 2.5  },
  '07': { fireStart: 1.17, fireEnd: 2.5  },
  '08': { fireStart: 1.6,  fireEnd: 3.33 },
  '09': { fireStart: 1.13, fireEnd: 3.03 },
  '0A': { fireStart: 1.17, fireEnd: 2.87 },
  '0B': { fireStart: 3.53, fireEnd: 5.2  },
  '0C': { fireStart: 2.43, fireEnd: 3.63 },

  // Pistol — single shot
  '41': { fireStart: 2.1,  fireEnd: 2.2  },
  '42': { fireStart: 1.5,  fireEnd: 1.6  },
  '43': { fireStart: 1.67, fireEnd: 1.77 },
  '44': { fireStart: 1.07, fireEnd: 1.17 },
  '45': { fireStart: 0.8,  fireEnd: 0.9  },
  '46': { fireStart: 0.73, fireEnd: 0.83 },

  // Dual wield
  '6C': { fireStart: 0,    fireEnd: 1.1  },
  '6D': { fireStart: 0,    fireEnd: 1.1  },
  '74': { fireStart: 1,    fireEnd: 2.93 },
  '7A': { fireStart: 0.93, fireEnd: 2.17 },
  '7B': { fireStart: 1.4,  fireEnd: 2.9  },
  '7C': { fireStart: 1.87, fireEnd: 3.33 },
};

// ── Fire animation groups ──────────────────────────────────────────

export const FIRE_ANIMS_BY_TYPE: Record<string, string[]> = {
  rifle:  ['01', '02', '03', '04', '05', '06', '07', '08', '09', '0A', '0B', '0C'],
  pistol: ['41', '42', '43', '44', '45', '46'],
  dual:   ['6C', '6D', '74', '7A', '7B', '7C'],
};

/** Forward-facing only — excludes turn/roll for AI combat */
export const AI_FIRE_ANIMS_BY_TYPE: Record<string, string[]> = {
  rifle:  ['01', '02', '03', '04', '07', '08', '09', '0A'],
  pistol: ['41', '42', '43', '44', '45', '46'],
  dual:   ['6C', '6D', '74', '7A'],
};

/** Fire animation mappings per weapon type and fire mode */
export const FIRE_ANIM_MAP: Record<string, { semi: string; auto: string }> = {
  rifle:  { semi: 'fire',          auto: 'fireJogging'      },
  pistol: { semi: 'firePistol',    auto: 'fireJogging'      },
  dual:   { semi: 'fireDualWield', auto: 'fireJoggingDual'  },
};

// ── Hit reaction and death animation sets ──────────────────────────

export const HIT_ANIMS: string[] = [
  'hitLeftShoulder', 'hitRightShoulder', 'hitLeftArm', 'hitRightArm',
  'hitLeftHand', 'hitRightHand', 'hitLeftLeg', 'hitRightLeg',
  'hitNeck', 'hitButtLong', 'hitButtShort', 'hitTaser',
];

export const DEATH_ANIMS: string[] = [
  'deathForward', 'deathForwardHard', 'deathForwardSoft',
  'deathForwardSpinFaceUp',
  'deathBackward', 'deathBackwardFaceUp2',
  'deathSpinRight', 'deathSpinLeft',
  'deathBackwardSpinFaceUpR', 'deathBackwardSpinFaceUpL',
  'deathHead', 'deathNeck', 'deathGenitalia',
  'deathStaggerToWall', 'deathFetalRight', 'deathFetalLeft',
  'deathLeftLeg',
];

// ── Bone-to-zone damage system (for future hit zone support) ──────

export const BONE_ZONE_MAP: Record<number, string> = {
  3: 'head',
  1: 'torso',
  2: 'torso',
  4: 'legs',
  5: 'legs',
  6: 'arms',
  7: 'arms',
  8: 'arms',
  9: 'arms',
};

export const ZONE_DAMAGE_MULTIPLIER: Record<string, number> = {
  head:  4.0,
  torso: 1.0,
  arms:  0.6,
  legs:  0.6,
};

// ── Utilities ──────────────────────────────────────────────────────

/** Extract hex animation ID from a GLB file path */
export function getAnimIdFromPath(path: string): string | null {
  const match = path.match(/animations\/([0-9A-Fa-f]+)-/);
  return match ? match[1] : null;
}
