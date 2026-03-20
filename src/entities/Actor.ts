import type RAPIER_API from '@dimforge/rapier3d-compat';
import { Entity } from './Entity';
import type { EventBus } from '../core/EventBus';

export type Faction = 'player' | 'enemy' | 'neutral';

export class Actor extends Entity {
  health: number;
  maxHealth: number;
  armor: number;
  maxArmor: number;
  faction: Faction;
  collider: RAPIER_API.Collider | null = null;

  constructor(
    protected eventBus: EventBus,
    options: {
      id?: string;
      health?: number;
      maxHealth?: number;
      armor?: number;
      maxArmor?: number;
      faction?: Faction;
    } = {}
  ) {
    super(options.id);
    this.maxHealth = options.maxHealth ?? 100;
    this.health = options.health ?? this.maxHealth;
    this.maxArmor = options.maxArmor ?? 100;
    this.armor = options.armor ?? 0;
    this.faction = options.faction ?? 'neutral';
  }

  takeDamage(amount: number, source?: Entity): void {
    if (!this.active || this.health <= 0) return;

    let remaining = amount;

    // Armor absorbs damage first
    if (this.armor > 0) {
      const absorbed = Math.min(this.armor, remaining);
      this.armor -= absorbed;
      remaining -= absorbed;
    }

    if (remaining > 0) {
      this.health = Math.max(0, this.health - remaining);
    }

    this.eventBus.emit('entity-damaged', { entity: this, damage: amount, source });

    if (this.health <= 0) {
      this.onKilled(source);
    }
  }

  isDead(): boolean {
    return this.health <= 0;
  }

  protected onKilled(killer?: Entity): void {
    this.eventBus.emit('entity-killed', { entity: this, killer });
    this.active = false;
  }
}
