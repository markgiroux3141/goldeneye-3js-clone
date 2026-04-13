import * as THREE from 'three';
import type { ECSWorld } from '../ECSWorld';
import type { ECSSystem } from '../System';
import type {
  KeyframeAnimationComponent,
  PivotComponent,
  MeshComponent,
  AnimationTrack,
  AnimationClip,
} from '../Component';

const DEG2RAD = Math.PI / 180;

/** Easing functions mapping normalized t (0–1) to eased t */
const EASING: Record<string, (t: number) => number> = {
  'linear': (t) => t,
  'ease-in': (t) => t * t,
  'ease-out': (t) => t * (2 - t),
  'ease-in-out': (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
};

/**
 * Evaluates a track's keyframes at a given normalized time (0–1).
 * Linearly interpolates between the two surrounding keyframes.
 */
function evaluateTrack(track: AnimationTrack, t: number): number {
  const kfs = track.keyframes;
  if (kfs.length === 0) return 0;
  if (kfs.length === 1) return kfs[0].value;

  // Clamp
  if (t <= kfs[0].time) return kfs[0].value;
  if (t >= kfs[kfs.length - 1].time) return kfs[kfs.length - 1].value;

  // Find surrounding keyframes
  for (let i = 0; i < kfs.length - 1; i++) {
    if (t >= kfs[i].time && t <= kfs[i + 1].time) {
      const segLen = kfs[i + 1].time - kfs[i].time;
      const localT = segLen > 0 ? (t - kfs[i].time) / segLen : 0;
      return kfs[i].value + (kfs[i + 1].value - kfs[i].value) * localT;
    }
  }

  return kfs[kfs.length - 1].value;
}

/**
 * Drives KeyframeAnimation components, applying animated property values
 * to mesh transforms each frame. Supports per-mesh targeting and pivot points.
 *
 * When an animation clip completes, it fires an 'animation-complete' event
 * on the entity's StateMachine (if present) via StateMachineSystem.
 */
export class AnimationSystem implements ECSSystem {
  readonly name = 'AnimationSystem';
  readonly requiredComponents = ['KeyframeAnimation', 'Mesh'];

  /** Reference to StateMachineSystem for firing animation-complete events */
  private stateMachineSystem: { fireEvent(entityId: string, trigger: string): void } | null = null;

  /** Provide a reference to the StateMachineSystem so we can fire events */
  setStateMachineSystem(sms: { fireEvent(entityId: string, trigger: string): void }): void {
    this.stateMachineSystem = sms;
  }

  update(dt: number, world: ECSWorld): void {
    const entities = world.query('KeyframeAnimation', 'Mesh');

    for (const id of entities) {
      const anim = world.getComponent(id, 'KeyframeAnimation') as KeyframeAnimationComponent;
      const mesh = world.getComponent(id, 'Mesh') as MeshComponent;
      if (!anim || !mesh?._group || !anim._playing || !anim._activeClip) continue;

      const clip = anim.clips[anim._activeClip];
      if (!clip) continue;

      // Advance time
      const speed = anim._clipSpeed ?? 1;
      anim._clipTime = (anim._clipTime ?? 0) + dt * speed;

      // Normalized progress
      const duration = clip.duration;
      let progress = duration > 0 ? anim._clipTime / duration : 1;
      const completed = progress >= 1;
      progress = Math.min(progress, 1);

      // Reverse if specified
      const t = clip.reverse ? 1 - progress : progress;

      // Get pivot if present
      const pivot = world.getComponent(id, 'Pivot') as PivotComponent | undefined;

      // Apply each track in the clip
      for (const trackIdx of clip.tracks) {
        const track = anim.tracks[trackIdx];
        if (!track) continue;

        // Evaluate with easing
        const easeFn = EASING[track.easing] || EASING['linear'];
        const easedT = easeFn(t);
        const value = evaluateTrack(track, easedT);

        this.applyTrackValue(track, value, mesh._group, pivot);
      }

      // Handle completion
      if (completed) {
        anim._playing = false;
        anim._clipTime = 0;

        // Notify state machine
        if (this.stateMachineSystem) {
          this.stateMachineSystem.fireEvent(id, 'animation-complete');
        }
      }
    }
  }

  /**
   * Apply a single track's computed value to the appropriate Three.js object.
   */
  private applyTrackValue(
    track: AnimationTrack,
    value: number,
    group: THREE.Group,
    pivot?: PivotComponent,
  ): void {
    // Determine target: -1 means the root group, otherwise a child mesh by index
    let target: THREE.Object3D = group;
    if (track.targetMesh >= 0) {
      const child = group.children[track.targetMesh];
      if (!child) return;
      target = child;
    }

    // Parse property path (e.g., "rotation.y", "position.x", "scale.z")
    const [obj, axis] = track.property.split('.');
    if (!obj || !axis) return;

    const axisKey = axis as 'x' | 'y' | 'z';

    if (obj === 'rotation') {
      const radValue = value * DEG2RAD;

      // If there's a pivot and this mesh is affected, apply rotation around pivot
      if (pivot && this.isPivotAffected(track.targetMesh, pivot)) {
        this.applyPivotRotation(target, pivot, axisKey, radValue);
      } else {
        (target.rotation as any)[axisKey] = radValue;
      }
    } else if (obj === 'position') {
      (target.position as any)[axisKey] = value;
    } else if (obj === 'scale') {
      (target.scale as any)[axisKey] = value;
    }
  }

  /**
   * Check if a mesh index is affected by a pivot.
   */
  private isPivotAffected(meshIndex: number, pivot: PivotComponent): boolean {
    return pivot.affectsMeshes.includes(-1) || pivot.affectsMeshes.includes(meshIndex);
  }

  /**
   * Apply rotation around a pivot point.
   * Translates to pivot, rotates, translates back.
   */
  private applyPivotRotation(
    target: THREE.Object3D,
    pivot: PivotComponent,
    axis: 'x' | 'y' | 'z',
    angle: number,
  ): void {
    const px = pivot.offset[0];
    const py = pivot.offset[1];
    const pz = pivot.offset[2];

    // Reset to identity, then apply pivot-based rotation
    target.position.set(0, 0, 0);
    target.rotation.set(0, 0, 0);

    // Move to pivot, rotate, move back
    target.position.set(-px, -py, -pz);
    const euler = new THREE.Euler();
    (euler as any)[axis] = angle;
    target.position.applyEuler(euler);
    target.position.set(target.position.x + px, target.position.y + py, target.position.z + pz);
    (target.rotation as any)[axis] = angle;
  }

  dispose(): void {
    this.stateMachineSystem = null;
  }
}
