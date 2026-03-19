export interface Interactable {
  readonly active: boolean;
  readonly triggerRadius: number;
  canInteract(): boolean;
  interact(): void;
  setPlayerPosition(pos: { x: number; y: number; z: number }): void;
  getDistanceToPlayer(): number;
}

export class InteractionSystem {
  private interactables = new Set<Interactable>();
  private prevInteract = false;

  register(obj: Interactable): void {
    this.interactables.add(obj);
  }

  unregister(obj: Interactable): void {
    this.interactables.delete(obj);
  }

  update(playerPos: { x: number; y: number; z: number }, interactPressed: boolean): void {
    // Update player position on all interactables (needed for auto-close timers etc.)
    for (const obj of this.interactables) {
      if (obj.active) {
        obj.setPlayerPosition(playerPos);
      }
    }

    const justPressed = interactPressed && !this.prevInteract;
    this.prevInteract = interactPressed;

    if (!justPressed) return;

    // Find closest interactable within range
    let closest: Interactable | null = null;
    let closestDist = Infinity;

    for (const obj of this.interactables) {
      if (!obj.active) continue;
      if (!obj.canInteract()) continue;
      const dist = obj.getDistanceToPlayer();
      if (dist < obj.triggerRadius && dist < closestDist) {
        closest = obj;
        closestDist = dist;
      }
    }

    if (closest) {
      closest.interact();
    }
  }
}
