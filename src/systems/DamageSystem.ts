import { Actor } from '../entities/Actor';
import type { Entity } from '../entities/Entity';

export class DamageSystem {
  applyDamage(target: Actor, amount: number, source?: Entity): void {
    target.takeDamage(amount, source);
  }
}
