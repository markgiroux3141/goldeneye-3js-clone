import * as THREE from 'three';

const SENSITIVITY = 0.002;

export class FPSCamera {
  private _yaw = 0;
  private _pitch = 0;
  // F2: Pre-allocate Euler to avoid per-frame allocation
  private readonly _euler = new THREE.Euler(0, 0, 0, 'YXZ');

  public onLockChange: ((locked: boolean) => void) | null = null;

  constructor(
    private camera: THREE.PerspectiveCamera,
    private element: HTMLElement
  ) {
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
  }

  get yaw(): number {
    return this._yaw;
  }

  get pitch(): number {
    return this._pitch;
  }

  get isLocked(): boolean {
    return document.pointerLockElement === this.element;
  }

  // F10: Handle pointer lock promise rejection
  lock(): void {
    this.element.requestPointerLock().catch(() => {
      this.onLockChange?.(false);
    });
  }

  unlock(): void {
    document.exitPointerLock();
  }

  rotateBy(yawDelta: number, pitchDelta: number): void {
    this._yaw += yawDelta;
    this._pitch += pitchDelta;
    this._pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this._pitch));
    this._euler.set(this._pitch, this._yaw, 0);
    this.camera.quaternion.setFromEuler(this._euler);
  }

  setYawPitch(yaw: number, pitch: number): void {
    this._yaw = yaw;
    this._pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
    this._euler.set(this._pitch, this._yaw, 0);
    this.camera.quaternion.setFromEuler(this._euler);
  }

  autoLevel(dt: number, speed: number): void {
    if (Math.abs(this._pitch) > 0.001) {
      this._pitch += (0 - this._pitch) * Math.min(speed * dt, 1);
      this._euler.set(this._pitch, this._yaw, 0);
      this.camera.quaternion.setFromEuler(this._euler);
    }
  }

  update(mouseDX: number, mouseDY: number): void {
    this._yaw -= mouseDX * SENSITIVITY;
    this._pitch -= mouseDY * SENSITIVITY;
    this._pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this._pitch));

    this._euler.set(this._pitch, this._yaw, 0);
    this.camera.quaternion.setFromEuler(this._euler);
  }

  // F15: Emit event via callback instead of DOM coupling
  private onPointerLockChange = (): void => {
    this.onLockChange?.(this.isLocked);
  };

  dispose(): void {
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
  }
}
