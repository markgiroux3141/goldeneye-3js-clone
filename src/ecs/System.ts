import type { ECSWorld } from './ECSWorld';

export interface ECSSystem {
  readonly name: string;
  readonly requiredComponents: string[];
  init?(world: ECSWorld): void;
  update(dt: number, world: ECSWorld): void;
  onEntityAdded?(entityId: string, world: ECSWorld): void;
  onEntityRemoved?(entityId: string, world: ECSWorld): void;
  dispose?(): void;
}
