import { InputManager } from './InputManager';
import { PlayerController } from '../player/PlayerController';

// N64 button IDs (from USB adapter spec)
const BTN_C_LEFT = 0;
const BTN_B = 1;
const BTN_A = 2;
const BTN_C_DOWN = 3;
const BTN_L = 4;
const BTN_R = 5;
const BTN_Z = 6;
const BTN_C_RIGHT = 8;
const BTN_C_UP = 9;
const BTN_START = 12;

// Tuning
const STICK_DEADZONE = 0.15;
const TURN_SPEED = 1800;      // pixels-equivalent per second for camera turn
const AIM_MAX_RANGE = 0.6;        // max NDC offset from center
const AIM_SPRING = 10;            // spring stiffness (higher = snappier)
const RETURN_SPRING = 15;         // snap-back speed on release
const AIM_TURN_THRESHOLD = 0.85;  // stick magnitude where camera rotation begins
const AIM_TURN_SPEED = 600;       // camera rotation speed at full stick
const C_LOOK_SPEED = 300;     // pixels-equivalent per second for C-Up/C-Down

export class GamepadManager {
  private _isActive = false;
  private _aimMode = false;
  private _aimX = 0; // NDC -1 to 1
  private _aimY = 0; // NDC -1 to 1
  private prevStartPressed = false;
  private gamepadIndex = -1;

  constructor(
    private inputManager: InputManager,
    private playerController: PlayerController
  ) {
    window.addEventListener('gamepadconnected', this.onConnected);
    window.addEventListener('gamepaddisconnected', this.onDisconnected);
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get aimMode(): boolean {
    return this._aimMode;
  }

  get aimX(): number {
    return this._aimX;
  }

  get aimY(): number {
    return this._aimY;
  }

  poll(dt: number): void {
    const gamepads = navigator.getGamepads();
    const gp = this.gamepadIndex >= 0 ? gamepads[this.gamepadIndex] : null;
    if (!gp) {
      this._isActive = false;
      return;
    }

    this._isActive = true;

    // Read analog stick with radial deadzone (prevents diagonal snapping)
    let stickX = gp.axes[0] ?? 0;
    let stickY = gp.axes[1] ?? 0;
    const mag = Math.sqrt(stickX * stickX + stickY * stickY);
    if (mag < STICK_DEADZONE) {
      stickX = 0;
      stickY = 0;
    } else {
      const scale = (mag - STICK_DEADZONE) / (1 - STICK_DEADZONE) / mag;
      stickX *= scale;
      stickY *= scale;
    }

    // Read buttons
    const btnPressed = (id: number) => id < gp.buttons.length && gp.buttons[id].pressed;

    this._aimMode = btnPressed(BTN_R) || btnPressed(BTN_L);
    const zTrigger = btnPressed(BTN_Z);
    const aButton = btnPressed(BTN_A);
    const bButton = btnPressed(BTN_B);
    const cLeft = btnPressed(BTN_C_LEFT);
    const cRight = btnPressed(BTN_C_RIGHT);
    const cUp = btnPressed(BTN_C_UP);
    const cDown = btnPressed(BTN_C_DOWN);
    const startButton = btnPressed(BTN_START);

    // === GoldenEye 1.1 Solitaire Controls ===

    if (this._aimMode) {
      // R or L held: aim mode — stick moves crosshair with spring/rubber-band feel
      this.playerController.setAnalogMovement(0, 0);

      // Stick position = target offset; crosshair springs toward it
      const targetX = stickX * AIM_MAX_RANGE;
      const targetY = -stickY * AIM_MAX_RANGE;
      this._aimX += (targetX - this._aimX) * Math.min(AIM_SPRING * dt, 1);
      this._aimY += (targetY - this._aimY) * Math.min(AIM_SPRING * dt, 1);

      // Clamp to circular bounds
      const aimMag = Math.sqrt(this._aimX * this._aimX + this._aimY * this._aimY);
      if (aimMag > AIM_MAX_RANGE) {
        this._aimX *= AIM_MAX_RANGE / aimMag;
        this._aimY *= AIM_MAX_RANGE / aimMag;
      }

      // When stick is pushed past threshold, rotate camera
      const stickMag = Math.sqrt(stickX * stickX + stickY * stickY);
      if (stickMag > AIM_TURN_THRESHOLD) {
        const overflow = (stickMag - AIM_TURN_THRESHOLD) / (1 - AIM_TURN_THRESHOLD);
        const normX = stickX / stickMag;
        const normY = stickY / stickMag;
        this.inputManager.setMouseDelta(
          normX * overflow * AIM_TURN_SPEED * dt,
          -normY * overflow * AIM_TURN_SPEED * dt
        );
      }
    } else {
      // Normal mode: stick Y → move forward/back (analog), stick X → turn
      this.playerController.setAnalogMovement(-stickY, 0);
      this.inputManager.setMouseDelta(stickX * TURN_SPEED * dt, 0);

      // Spring crosshair back to center (smooth snap-back on release)
      this._aimX += (0 - this._aimX) * Math.min(RETURN_SPRING * dt, 1);
      this._aimY += (0 - this._aimY) * Math.min(RETURN_SPRING * dt, 1);
    }

    // C-buttons: strafe left/right
    this.inputManager.setKeyState('KeyA', cLeft);
    this.inputManager.setKeyState('KeyD', cRight);

    // C-Up/C-Down: look up/down
    if (cUp || cDown) {
      const pitchDelta = ((cDown ? 1 : 0) - (cUp ? 1 : 0)) * C_LOOK_SPEED * dt;
      this.inputManager.setMouseDelta(0, pitchDelta);
    }

    // Z trigger → fire (inject as mouse button 0)
    this.inputManager.setMouseButtonState(0, zTrigger);

    // A → cycle weapon
    this.inputManager.setKeyState('KeyQ', aButton);

    // B → reload
    this.inputManager.setKeyState('KeyR', bButton);
    this.inputManager.setKeyState('KeyB', bButton);

    // Start → toggle pause (edge-triggered)
    if (startButton && !this.prevStartPressed) {
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' }));
    }
    this.prevStartPressed = startButton;
  }

  private onConnected = (e: GamepadEvent): void => {
    console.log(`[Gamepad] Connected: "${e.gamepad.id}" (index ${e.gamepad.index})`);
    this.gamepadIndex = e.gamepad.index;
    this._isActive = true;
  };

  private onDisconnected = (e: GamepadEvent): void => {
    console.log(`[Gamepad] Disconnected: "${e.gamepad.id}"`);
    if (e.gamepad.index === this.gamepadIndex) {
      this.gamepadIndex = -1;
      this._isActive = false;
    }
  };

  dispose(): void {
    window.removeEventListener('gamepadconnected', this.onConnected);
    window.removeEventListener('gamepaddisconnected', this.onDisconnected);
  }
}
