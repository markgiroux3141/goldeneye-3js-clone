import type { Entity } from '../entities/Entity';
import type { Actor } from '../entities/Actor';
import type { DestroyEffect } from '../entities/PropEntity';
import type { ConsoleAction } from '../entities/ConsoleEntity';

export interface GameEvents {
  'entity-damaged': { entity: Actor; damage: number; source?: Entity };
  'entity-killed': { entity: Actor; killer?: Entity };
  'weapon-fired': { shooter: Entity; weaponName: string };
  'weapon-switched': { entity: Entity; weaponName: string };
  'level-loaded': { levelId: string };
  'level-unloaded': { levelId: string };
  'door-opening': { door: Entity; doorId: string };
  'door-opened': { door: Entity; doorId: string };
  'door-closing': { door: Entity; doorId: string };
  'door-closed': { door: Entity; doorId: string };
  'prop-destroyed': { entity: Actor; effect: DestroyEffect };
  'player-detected': { detector: Entity; detectorId: string };
  'alarm-sounded': { alarm: Entity; alarmId: string };
  'alarm-stopped': { alarm: Entity; alarmId: string };
  'security-disabled': { targetId?: string };
  'security-destroyed': { entity: Entity };
  'console-used': { console: Entity; action: ConsoleAction };
  'enemy-alert': { enemy: Actor };
  'enemy-fired': { enemy: Actor; weaponId: string };
  'all-enemies-dead': {};
}

type EventCallback<T> = (data: T) => void;

export class EventBus {
  private listeners = new Map<string, Set<EventCallback<any>>>();

  on<K extends keyof GameEvents>(event: K, callback: EventCallback<GameEvents[K]>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off<K extends keyof GameEvents>(event: K, callback: EventCallback<GameEvents[K]>): void {
    this.listeners.get(event)?.delete(callback);
  }

  emit<K extends keyof GameEvents>(event: K, data: GameEvents[K]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      for (const cb of callbacks) {
        cb(data);
      }
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}
