import type { Component, ComponentType, ComponentTypeMap } from './Component';
import type { ECSSystem } from './System';

export type EntityId = string;

export interface ECSEntity {
  readonly id: EntityId;
  readonly components: Map<string, Component>;
}

export function createEntity(id: EntityId): ECSEntity {
  return { id, components: new Map() };
}

export class ECSWorld {
  private entities = new Map<EntityId, ECSEntity>();
  private componentIndex = new Map<string, Set<EntityId>>();
  private systems: ECSSystem[] = [];

  // ── Entity management ────────────────────────────────────────────────

  addEntity(entity: ECSEntity): void {
    this.entities.set(entity.id, entity);
    // Index existing components
    for (const [type] of entity.components) {
      this.indexAdd(type, entity.id);
    }
    // Notify systems
    for (const system of this.systems) {
      if (this.entityMatchesSystem(entity.id, system)) {
        system.onEntityAdded?.(entity.id, this);
      }
    }
  }

  removeEntity(id: EntityId): void {
    const entity = this.entities.get(id);
    if (!entity) return;

    // Notify systems before removal
    for (const system of this.systems) {
      if (this.entityMatchesSystem(id, system)) {
        system.onEntityRemoved?.(id, this);
      }
    }

    // Remove from index
    for (const [type] of entity.components) {
      this.indexRemove(type, id);
    }
    this.entities.delete(id);
  }

  getEntity(id: EntityId): ECSEntity | undefined {
    return this.entities.get(id);
  }

  getAllEntityIds(): EntityId[] {
    return Array.from(this.entities.keys());
  }

  get entityCount(): number {
    return this.entities.size;
  }

  // ── Component management ─────────────────────────────────────────────

  addComponent<K extends ComponentType>(entityId: EntityId, component: ComponentTypeMap[K]): void;
  addComponent(entityId: EntityId, component: Component): void;
  addComponent(entityId: EntityId, component: Component): void {
    const entity = this.entities.get(entityId);
    if (!entity) return;
    entity.components.set(component._type, component);
    this.indexAdd(component._type, entityId);

    // Check if entity now matches any system it didn't before
    for (const system of this.systems) {
      if (this.entityMatchesSystem(entityId, system)) {
        system.onEntityAdded?.(entityId, this);
      }
    }
  }

  removeComponent(entityId: EntityId, componentType: string): void {
    const entity = this.entities.get(entityId);
    if (!entity) return;

    // Notify systems before removal
    for (const system of this.systems) {
      if (this.entityMatchesSystem(entityId, system)) {
        system.onEntityRemoved?.(entityId, this);
      }
    }

    entity.components.delete(componentType);
    this.indexRemove(componentType, entityId);
  }

  getComponent<K extends ComponentType>(entityId: EntityId, type: K): ComponentTypeMap[K] | undefined;
  getComponent(entityId: EntityId, type: string): Component | undefined;
  getComponent(entityId: EntityId, type: string): Component | undefined {
    return this.entities.get(entityId)?.components.get(type);
  }

  hasComponent(entityId: EntityId, type: string): boolean {
    return this.entities.get(entityId)?.components.has(type) ?? false;
  }

  // ── Query ────────────────────────────────────────────────────────────

  /** Returns entity IDs that have ALL of the given component types */
  query(...componentTypes: string[]): EntityId[] {
    if (componentTypes.length === 0) return this.getAllEntityIds();

    // Find the smallest set for intersection
    let smallest: Set<EntityId> | undefined;
    for (const type of componentTypes) {
      const set = this.componentIndex.get(type);
      if (!set || set.size === 0) return [];
      if (!smallest || set.size < smallest.size) smallest = set;
    }

    if (!smallest) return [];

    // Intersect: check that each entity in the smallest set has all types
    const result: EntityId[] = [];
    for (const id of smallest) {
      let hasAll = true;
      for (const type of componentTypes) {
        if (type === componentTypes[componentTypes.indexOf(type)] && smallest === this.componentIndex.get(type)) continue;
        if (!this.componentIndex.get(type)?.has(id)) { hasAll = false; break; }
      }
      if (hasAll) result.push(id);
    }
    return result;
  }

  // ── Systems ──────────────────────────────────────────────────────────

  addSystem(system: ECSSystem): void {
    this.systems.push(system);
    system.init?.(this);
  }

  update(dt: number): void {
    for (const system of this.systems) {
      system.update(dt, this);
    }
  }

  dispose(): void {
    for (const system of this.systems) {
      system.dispose?.();
    }
    this.systems.length = 0;
    this.entities.clear();
    this.componentIndex.clear();
  }

  // ── Index helpers ────────────────────────────────────────────────────

  private indexAdd(type: string, id: EntityId): void {
    let set = this.componentIndex.get(type);
    if (!set) {
      set = new Set();
      this.componentIndex.set(type, set);
    }
    set.add(id);
  }

  private indexRemove(type: string, id: EntityId): void {
    this.componentIndex.get(type)?.delete(id);
  }

  private entityMatchesSystem(entityId: EntityId, system: ECSSystem): boolean {
    return system.requiredComponents.every(type => this.hasComponent(entityId, type));
  }
}
