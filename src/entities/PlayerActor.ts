import { Actor } from './Actor';
import type { EventBus } from '../core/EventBus';
import type { PlayerController } from '../player/PlayerController';
import type { FPSCamera } from '../player/FPSCamera';
import type { InputManager } from '../core/InputManager';

export class PlayerActor extends Actor {
  constructor(
    eventBus: EventBus,
    public readonly playerController: PlayerController,
    public readonly fpsCamera: FPSCamera,
    private inputManager: InputManager
  ) {
    super(eventBus, {
      id: 'player',
      health: 100,
      maxHealth: 100,
      faction: 'player',
    });

    this.collider = playerController.getCollider();
  }

  update(dt: number): void {
    if (!this.active) return;

    this.playerController.update(dt);

    // Sync entity position from controller
    const pos = this.playerController.getPosition();
    this.position.set(pos.x, pos.y, pos.z);
  }

  isMoving(): boolean {
    return (
      this.inputManager.isKeyDown('KeyW') ||
      this.inputManager.isKeyDown('KeyS') ||
      this.inputManager.isKeyDown('KeyA') ||
      this.inputManager.isKeyDown('KeyD')
    );
  }

  protected onKilled(killer?: import('./Entity').Entity): void {
    super.onKilled(killer);
    // Future: death screen, respawn logic
  }
}
