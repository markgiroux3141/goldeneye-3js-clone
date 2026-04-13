import type { ECSWorld } from '../ECSWorld';
import type { ECSSystem } from '../System';
import type {
  VariableSetterComponent,
  VariableListenerComponent,
  StateMachineComponent,
} from '../Component';

/**
 * Manages world-level variables that allow entities to communicate.
 *
 * VariableSetter components publish variables when their entity's StateMachine
 * enters a specified state. VariableListener components watch for variable
 * changes and fire events on their entity's StateMachine.
 *
 * This enables patterns like: console activates → sets "lab_unlocked" → door listens → unlocks.
 */
export class VariableSystem implements ECSSystem {
  readonly name = 'VariableSystem';
  readonly requiredComponents = [] as string[]; // Processes both setters and listeners

  /** World variables: key → value */
  private variables = new Map<string, string | number | boolean>();

  /** Reference to StateMachineSystem for firing events on listeners */
  private stateMachineSystem: { fireEvent(entityId: string, trigger: string): void } | null = null;

  setStateMachineSystem(sms: { fireEvent(entityId: string, trigger: string): void }): void {
    this.stateMachineSystem = sms;
  }

  /** Get a world variable value */
  getVariable(key: string): string | number | boolean | undefined {
    return this.variables.get(key);
  }

  /** Set a world variable directly (for scripting/debugging) */
  setVariable(key: string, value: string | number | boolean): void {
    this.variables.set(key, value);
  }

  update(_dt: number, world: ECSWorld): void {
    // ── Phase 1: Process setters ─────────────────────────────────
    // Check entities with VariableSetter + StateMachine.
    // When the state machine is in the setter's onState, publish variables.
    const setterEntities = world.query('VariableSetter', 'StateMachine');
    for (const id of setterEntities) {
      const setter = world.getComponent(id, 'VariableSetter') as VariableSetterComponent;
      const sm = world.getComponent(id, 'StateMachine') as StateMachineComponent;
      if (!setter || !sm) continue;

      if (sm._currentState === setter.onState) {
        for (const [key, value] of Object.entries(setter.sets)) {
          this.variables.set(key, value);
        }
      }
    }

    // ── Phase 2: Process listeners ───────────────────────────────
    // Check entities with VariableListener + StateMachine.
    // When a watched variable matches, fire an event on the state machine.
    const listenerEntities = world.query('VariableListener', 'StateMachine');
    for (const id of listenerEntities) {
      const listener = world.getComponent(id, 'VariableListener') as VariableListenerComponent;
      const sm = world.getComponent(id, 'StateMachine') as StateMachineComponent;
      if (!listener || !sm) continue;

      // Already triggered (one-shot)
      if (listener._triggered) continue;

      const currentValue = this.variables.get(listener.watches);

      // Check match
      let matches = false;
      if (listener.expectedValue !== undefined) {
        matches = currentValue === listener.expectedValue;
      } else {
        // Truthy check
        matches = currentValue !== undefined && currentValue !== false && currentValue !== 0 && currentValue !== '';
      }

      if (matches && currentValue !== listener._lastValue) {
        listener._lastValue = currentValue;
        listener._triggered = true;

        if (this.stateMachineSystem) {
          this.stateMachineSystem.fireEvent(id, 'variable');
        }
      }
    }
  }

  dispose(): void {
    this.variables.clear();
    this.stateMachineSystem = null;
  }
}
