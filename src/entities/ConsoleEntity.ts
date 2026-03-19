import * as THREE from 'three';
import { Entity } from './Entity';
import type { Interactable } from '../systems/InteractionSystem';
import type { EventBus } from '../core/EventBus';
import type { EntityManager } from './EntityManager';
import type { DoorEntity } from './DoorEntity';

export type ConsoleAction =
  | { type: 'unlock-door'; targetId: string }
  | { type: 'disable-security'; targetId?: string }
  | { type: 'emit-event'; event: string; data?: Record<string, unknown> };

export interface ConsoleConfig {
  id?: string;
  modelUrl: string;
  position: { x: number; y: number; z: number };
  rotation: number;  // Y-axis radians (converted from degrees in spawner)
  modelScale?: number;
  triggerRadius?: number;
  action: ConsoleAction;
  singleUse?: boolean;
}

export class ConsoleEntity extends Entity implements Interactable {
  readonly triggerRadius: number;
  private readonly action: ConsoleAction;
  private readonly singleUse: boolean;
  private used = false;
  private meshGroup: THREE.Group;
  private readonly _playerPos = new THREE.Vector3();

  constructor(
    private eventBus: EventBus,
    private entityManager: EntityManager,
    private scene: THREE.Scene,
    config: ConsoleConfig,
    model: THREE.Group
  ) {
    super(config.id);

    this.triggerRadius = config.triggerRadius ?? 2.0;
    this.action = config.action;
    this.singleUse = config.singleUse ?? true;

    const { x, y, z } = config.position;
    this.position.set(x, y, z);
    this.rotation.y = config.rotation;

    // Setup mesh
    this.meshGroup = model;
    if (config.modelScale) {
      this.meshGroup.scale.setScalar(config.modelScale);
    }
    this.meshGroup.position.set(x, y, z);
    this.meshGroup.rotation.y = config.rotation;

    // Enable shadows
    this.meshGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    this.scene.add(this.meshGroup);
  }

  setPlayerPosition(pos: { x: number; y: number; z: number }): void {
    this._playerPos.set(pos.x, pos.y, pos.z);
  }

  getDistanceToPlayer(): number {
    return this._playerPos.distanceTo(this.position);
  }

  canInteract(): boolean {
    if (this.singleUse && this.used) return false;
    return true;
  }

  interact(): void {
    if (!this.active) return;
    if (this.singleUse && this.used) return;

    this.executeAction(this.action);
    this.used = true;

    // Visual feedback — change emissive to dim green
    this.meshGroup.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
        child.material.emissive.setHex(0x004400);
        child.material.emissiveIntensity = 0.5;
      }
    });

    this.eventBus.emit('console-used', { console: this, action: this.action });
    console.log(`[Console ${this.id}] used, action: ${this.action.type}`);
  }

  private executeAction(action: ConsoleAction): void {
    switch (action.type) {
      case 'unlock-door': {
        const target = this.entityManager.getById(action.targetId);
        if (target && 'interact' in target) {
          (target as DoorEntity).interact();
        } else {
          console.warn(`[Console ${this.id}] target not found: ${action.targetId}`);
        }
        break;
      }
      case 'disable-security': {
        this.eventBus.emit('security-disabled', { targetId: action.targetId });
        break;
      }
      case 'emit-event': {
        // Generic event emission — cast needed since event name is dynamic
        (this.eventBus as any).emit(action.event, action.data ?? {});
        break;
      }
    }
  }

  dispose(): void {
    this.scene.remove(this.meshGroup);
    this.meshGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
    super.dispose();
  }
}
