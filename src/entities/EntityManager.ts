import { Entity } from './Entity';

export class EntityManager {
  private entities = new Map<string, Entity>();
  private colliderToEntity = new Map<number, Entity>();

  add(entity: Entity): void {
    this.entities.set(entity.id, entity);
  }

  remove(entity: Entity): void {
    this.entities.delete(entity.id);
    // Clean up any collider mappings for this entity
    for (const [handle, e] of this.colliderToEntity) {
      if (e === entity) {
        this.colliderToEntity.delete(handle);
      }
    }
  }

  getById(id: string): Entity | undefined {
    return this.entities.get(id);
  }

  registerCollider(handle: number, entity: Entity): void {
    this.colliderToEntity.set(handle, entity);
  }

  unregisterCollider(handle: number): void {
    this.colliderToEntity.delete(handle);
  }

  getByCollider(handle: number): Entity | null {
    return this.colliderToEntity.get(handle) ?? null;
  }

  updateAll(dt: number): void {
    for (const entity of this.entities.values()) {
      if (entity.active) {
        entity.update(dt);
      }
    }
  }

  getAll(): IterableIterator<Entity> {
    return this.entities.values();
  }

  disposeAll(): void {
    for (const entity of this.entities.values()) {
      entity.dispose();
    }
    this.entities.clear();
    this.colliderToEntity.clear();
  }
}
