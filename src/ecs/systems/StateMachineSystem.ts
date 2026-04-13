import type { ECSWorld } from '../ECSWorld';
import type { ECSSystem } from '../System';
import type {
  StateMachineComponent,
  InteractableComponent,
  HealthComponent,
} from '../Component';

/**
 * Drives StateMachine components through their state transitions.
 *
 * Handles timer-based, animation-complete, and damage/destroy triggers.
 * Proximity and interact triggers are meant to be fired externally
 * (e.g., by a player controller) via `fireEvent()`.
 * Variable triggers are handled by VariableSystem.
 */
export class StateMachineSystem implements ECSSystem {
  readonly name = 'StateMachineSystem';
  readonly requiredComponents = ['StateMachine'];

  /** Pending events queued from external code: entityId → trigger type */
  private pendingEvents = new Map<string, string>();

  onEntityAdded(entityId: string, world: ECSWorld): void {
    const sm = world.getComponent(entityId, 'StateMachine') as StateMachineComponent;
    if (sm && sm._currentState === undefined) {
      sm._currentState = sm.initialState;
    }
  }

  /**
   * Fire an external event on an entity's state machine.
   * Used by player interaction, variable system, proximity checks, etc.
   */
  fireEvent(entityId: string, trigger: string): void {
    this.pendingEvents.set(entityId, trigger);
  }

  /**
   * Get the current state of an entity's state machine.
   */
  getState(entityId: string, world: ECSWorld): string | undefined {
    const sm = world.getComponent(entityId, 'StateMachine') as StateMachineComponent | undefined;
    return sm?._currentState;
  }

  update(dt: number, world: ECSWorld): void {
    const entities = world.query('StateMachine');

    for (const id of entities) {
      const sm = world.getComponent(id, 'StateMachine') as StateMachineComponent;
      if (!sm) continue;

      // Ensure initialized
      if (sm._currentState === undefined) {
        sm._currentState = sm.initialState;
      }

      const currentState = sm._currentState!;

      // ── Check timer transitions ──────────────────────────────────
      if (sm._timer !== undefined && sm._timerTarget) {
        sm._timer -= dt;
        if (sm._timer <= 0) {
          const target = sm._timerTarget;
          sm._timer = undefined;
          sm._timerTarget = undefined;
          this.transitionTo(id, sm, currentState, target, world);
          continue;
        }
      }

      // ── Check pending external events ────────────────────────────
      const pendingTrigger = this.pendingEvents.get(id);
      if (pendingTrigger) {
        this.pendingEvents.delete(id);
        this.tryTransition(id, sm, currentState, pendingTrigger, world);
        continue;
      }

      // ── Check damage trigger (health dropped to 0) ──────────────
      const health = world.getComponent(id, 'Health') as HealthComponent | undefined;
      if (health && health.health <= 0) {
        this.tryTransition(id, sm, currentState, 'destroy', world);
      }
    }
  }

  /**
   * Try to find and execute a transition from `currentState` with the given trigger.
   */
  private tryTransition(
    entityId: string,
    sm: StateMachineComponent,
    currentState: string,
    trigger: string,
    world: ECSWorld,
  ): boolean {
    for (const [key, transition] of Object.entries(sm.transitions)) {
      const [from, to] = key.split('→');
      if (from !== currentState || transition.trigger !== trigger) continue;

      // Check condition (variable must be truthy — evaluated by VariableSystem before firing)
      // Conditions on 'variable' triggers are pre-checked by VariableSystem,
      // but we skip condition checks here since the event was already validated.

      this.transitionTo(entityId, sm, currentState, to, world);
      return true;
    }
    return false;
  }

  /**
   * Execute a state transition.
   */
  private transitionTo(
    entityId: string,
    sm: StateMachineComponent,
    _fromState: string,
    toState: string,
    world: ECSWorld,
  ): void {
    sm._currentState = toState;

    // Find the transition definition for side effects
    const transKey = `${_fromState}→${toState}`;
    const transition = sm.transitions[transKey];

    if (transition) {
      // Start timer if the next outgoing transition is timer-based
      this.checkForTimerTransition(sm, toState);

      // Start animation if specified
      if (transition.animation) {
        const anim = world.getComponent(entityId, 'KeyframeAnimation');
        if (anim) {
          // AnimationSystem will pick this up
          (anim as any)._activeClip = transition.animation;
          (anim as any)._clipTime = 0;
          (anim as any)._clipSpeed = 1;
          (anim as any)._playing = true;
        }
      }

      // TODO: trigger sound via Audio component
    }
  }

  /**
   * After entering a new state, check if there's a timer-based outgoing transition
   * and start the timer.
   */
  private checkForTimerTransition(sm: StateMachineComponent, state: string): void {
    for (const [key, transition] of Object.entries(sm.transitions)) {
      const [from, to] = key.split('→');
      if (from === state && transition.trigger === 'timer' && transition.delay !== undefined) {
        sm._timer = transition.delay;
        sm._timerTarget = to;
        return;
      }
    }
  }

  dispose(): void {
    this.pendingEvents.clear();
  }
}
