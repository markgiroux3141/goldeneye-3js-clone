import * as THREE from 'three';

let nextId = 0;

export class Entity {
  readonly id: string;
  readonly position = new THREE.Vector3();
  readonly rotation = new THREE.Euler();
  active = true;

  constructor(id?: string) {
    this.id = id ?? `entity_${nextId++}`;
  }

  update(_dt: number): void {
    // Override in subclasses
  }

  dispose(): void {
    this.active = false;
  }
}
