export type { Component, ComponentType, ComponentTypeMap } from './Component';
export type {
  TransformComponent, MeshComponent, PrefabComponent,
  PhysicsBodyComponent, HealthComponent, FactionComponent,
  DestructibleComponent, DoorComponent, InteractableComponent,
  ConsoleActionComponent, DetectionComponent, AlarmComponent,
  AudioComponent,
} from './Component';
export { serializeComponent } from './Component';
export { ECSWorld, createEntity } from './ECSWorld';
export type { ECSEntity, EntityId } from './ECSWorld';
export type { ECSSystem } from './System';
export { PrefabRegistry, createDefaultRegistry } from './PrefabRegistry';
export type { PrefabDefinition } from './PrefabRegistry';
export { serializeEntity, deserializeEntity, serializeWorld, deserializeWorld } from './Serialization';
export type { SerializedEntity, PlacementsFile } from './Serialization';
export { MeshSystem } from './systems/MeshSystem';
