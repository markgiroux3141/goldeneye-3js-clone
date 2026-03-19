import * as THREE from 'three';
import type { InputManager } from '../core/InputManager';

const SENSITIVITY = 0.002;
const DEFAULT_SPEED = 8;

export class FreeFlyCamera {
  private _yaw = 0;
  private _pitch = 0;
  private _speed = DEFAULT_SPEED;
  private readonly _euler = new THREE.Euler(0, 0, 0, 'YXZ');
  private readonly _forward = new THREE.Vector3();
  private readonly _right = new THREE.Vector3();
  private readonly _move = new THREE.Vector3();

  // Right-click drag state
  private _looking = false;
  private _prevMouseX = 0;
  private _prevMouseY = 0;

  constructor(
    private camera: THREE.PerspectiveCamera,
    private canvas: HTMLElement,
    private input: InputManager
  ) {
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    document.addEventListener('mouseup', this.onMouseUp);
    document.addEventListener('mousemove', this.onMouseMove);
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  get speed(): number {
    return this._speed;
  }

  get yaw(): number {
    return this._yaw;
  }

  get pitch(): number {
    return this._pitch;
  }

  get isLooking(): boolean {
    return this._looking;
  }

  /** Set camera to a world position */
  setPosition(x: number, y: number, z: number): void {
    this.camera.position.set(x, y, z);
  }

  update(dt: number): void {
    // Build movement vectors from yaw + pitch (true fly mode)
    this._forward.set(
      -Math.sin(this._yaw) * Math.cos(this._pitch),
      Math.sin(this._pitch),
      -Math.cos(this._yaw) * Math.cos(this._pitch)
    );
    this._right.set(Math.cos(this._yaw), 0, -Math.sin(this._yaw));

    this._move.set(0, 0, 0);

    if (this.input.isKeyDown('KeyW')) this._move.add(this._forward);
    if (this.input.isKeyDown('KeyS')) this._move.sub(this._forward);
    if (this.input.isKeyDown('KeyA')) this._move.sub(this._right);
    if (this.input.isKeyDown('KeyD')) this._move.add(this._right);
    if (this.input.isKeyDown('Space')) this._move.y += 1;
    if (this.input.isKeyDown('ShiftLeft') || this.input.isKeyDown('ShiftRight')) this._move.y -= 1;

    if (this._move.lengthSq() > 0) {
      this._move.normalize();
    }

    this._move.multiplyScalar(this._speed * dt);
    this.camera.position.add(this._move);
  }

  getPosition(): { x: number; y: number; z: number } {
    return {
      x: this.camera.position.x,
      y: this.camera.position.y,
      z: this.camera.position.z,
    };
  }

  dispose(): void {
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    document.removeEventListener('mouseup', this.onMouseUp);
    document.removeEventListener('mousemove', this.onMouseMove);
  }

  // ── Event handlers ────────────────────────────────────────────────

  private onMouseDown = (e: MouseEvent): void => {
    if (e.button === 2) {  // right click
      this._looking = true;
      this.canvas.requestPointerLock();
    }
  };

  private onMouseUp = (e: MouseEvent): void => {
    if (e.button === 2) {
      this._looking = false;
      document.exitPointerLock();
    }
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this._looking) return;

    const dx = e.movementX;
    const dy = e.movementY;

    this._yaw -= dx * SENSITIVITY;
    this._pitch -= dy * SENSITIVITY;

    this._euler.set(this._pitch, this._yaw, 0);
    this.camera.quaternion.setFromEuler(this._euler);
  };
}
