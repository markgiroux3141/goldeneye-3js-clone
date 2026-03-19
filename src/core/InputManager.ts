// F12: Game-relevant keys to preventDefault on
const GAME_KEYS = new Set(['Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyR', 'KeyB', 'KeyE', 'Tab']);

export class InputManager {
  private keys = new Map<string, boolean>();
  private mouseButtons = new Map<number, boolean>();
  private mouseDX = 0;
  private mouseDY = 0;
  // F3: Pre-allocate reusable delta object
  private readonly _delta = { dx: 0, dy: 0 };

  constructor(private element: HTMLElement) {
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mousedown', this.onMouseDown);
    document.addEventListener('mouseup', this.onMouseUp);
  }

  isKeyDown(code: string): boolean {
    return this.keys.get(code) ?? false;
  }

  isMouseDown(button: number): boolean {
    return this.mouseButtons.get(button) ?? false;
  }

  consumeMouseDelta(): { dx: number; dy: number } {
    this._delta.dx = this.mouseDX;
    this._delta.dy = this.mouseDY;
    this.mouseDX = 0;
    this.mouseDY = 0;
    return this._delta;
  }

  setKeyState(code: string, down: boolean): void {
    this.keys.set(code, down);
  }

  setMouseButtonState(button: number, down: boolean): void {
    this.mouseButtons.set(button, down);
  }

  setMouseDelta(dx: number, dy: number): void {
    this.mouseDX += dx;
    this.mouseDY += dy;
  }

  clearAllKeys(): void {
    this.keys.clear();
  }

  dispose(): void {
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mousedown', this.onMouseDown);
    document.removeEventListener('mouseup', this.onMouseUp);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    this.keys.set(e.code, true);
    if (GAME_KEYS.has(e.code)) e.preventDefault();
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.set(e.code, false);
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (document.pointerLockElement === this.element) {
      this.mouseDX += e.movementX;
      this.mouseDY += e.movementY;
    }
  };

  private onMouseDown = (e: MouseEvent): void => {
    if (document.pointerLockElement === this.element) {
      this.mouseButtons.set(e.button, true);
    }
  };

  private onMouseUp = (e: MouseEvent): void => {
    this.mouseButtons.set(e.button, false);
  };
}
