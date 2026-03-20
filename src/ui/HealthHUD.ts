import type { EventBus } from '../core/EventBus';
import type { Actor } from '../entities/Actor';
import type { AudioManager } from '../audio/AudioManager';

const DEPLETED_BRIGHTNESS = 0.15;
const DEPLETED_ALPHA = 0.2;
const BLACK_THRESHOLD = 30;
const BLUR_WIDTH = 0.08; // width of the smooth depletion transition

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * GoldenEye-style health/armor HUD.
 *
 * Loads the health graphic, converts black to transparent, and renders
 * with per-segment depletion: top bars darken first as health drops.
 * Left arc = health, right arc = armor.
 */
export class HealthHUD {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private sourceData!: ImageData;
  private angleMap!: Float32Array;     // per-pixel normalized angle (0=bottom, 1=top, -1=transparent)
  private sideMap!: Uint8Array;        // 0=health(left), 1=armor(right), 255=transparent
  private srcWidth = 0;
  private srcHeight = 0;

  private lastHealth = -1;
  private lastArmor = -1;

  // Show/hide timer — HUD is normally invisible, pops up on damage
  private showTimer = 0;

  // Damage flash
  private damageFlashEl!: HTMLElement;
  private damageFlashAlpha = 0;

  // Death screen
  private deathEl!: HTMLElement;
  private isDead = false;

  private static readonly HIT_SOUND = '/sounds/breathe.wav';

  constructor(
    private eventBus: EventBus,
    private player: Actor,
    private audioManager: AudioManager
  ) {}

  async init(): Promise<void> {
    // Preload hit sound
    await this.audioManager.loadSound(HealthHUD.HIT_SOUND);

    // Load and process the health image
    const img = await this.loadImage('/textures/hud/goldeneye-health.jpg');
    this.processImage(img);

    // Create visible canvas overlay
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.srcWidth;
    this.canvas.height = this.srcHeight;
    this.canvas.style.cssText =
      'position:fixed;inset:0;width:100%;height:100%;' +
      'pointer-events:none;z-index:20;opacity:0';
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;

    // Damage flash overlay
    this.damageFlashEl = document.createElement('div');
    this.damageFlashEl.style.cssText =
      'position:fixed;inset:0;background:red;pointer-events:none;z-index:19;opacity:0';
    document.body.appendChild(this.damageFlashEl);

    // Death screen overlay (hidden)
    this.deathEl = document.createElement('div');
    this.deathEl.style.cssText =
      'position:fixed;inset:0;background:rgba(0,0,0,0.85);pointer-events:none;z-index:30;' +
      'display:none;justify-content:center;align-items:center;flex-direction:column';
    this.deathEl.innerHTML =
      '<div style="color:#c00;font:bold 64px monospace;text-shadow:0 0 20px #f00">YOU DIED</div>' +
      '<div style="color:#888;font:24px monospace;margin-top:24px">Press R to restart</div>';
    document.body.appendChild(this.deathEl);

    // Subscribe to events
    this.eventBus.on('entity-damaged', ({ entity, damage }) => {
      if (entity === this.player) {
        this.audioManager.play(HealthHUD.HIT_SOUND, 0.7);
        this.triggerDamageFlash(damage);
        this.showTimer = 1.5;
        this.canvas.style.opacity = '1';
        this.renderHealth();
      }
    });

    this.eventBus.on('entity-killed', ({ entity }) => {
      if (entity === this.player) {
        this.showDeathScreen();
      }
    });

    // Pre-render at full health (hidden until damage)
    this.renderHealth();
  }

  update(dt: number): void {
    // Decay damage flash
    if (this.damageFlashAlpha > 0) {
      this.damageFlashAlpha = Math.max(0, this.damageFlashAlpha - dt * 2.5);
      this.damageFlashEl.style.opacity = String(this.damageFlashAlpha);
    }

    // Decay health HUD show timer
    if (this.showTimer > 0) {
      this.showTimer = Math.max(0, this.showTimer - dt);
      const FADE_DURATION = 0.5;
      if (this.showTimer > FADE_DURATION) {
        this.canvas.style.opacity = '1';
      } else if (this.showTimer > 0) {
        this.canvas.style.opacity = String(this.showTimer / FADE_DURATION);
      } else {
        this.canvas.style.opacity = '0';
      }
    }
  }

  private triggerDamageFlash(damage: number): void {
    this.damageFlashAlpha = Math.min(0.5, damage / 40);
    this.damageFlashEl.style.opacity = String(this.damageFlashAlpha);
  }

  private showDeathScreen(): void {
    if (this.isDead) return;
    this.isDead = true;
    this.deathEl.style.display = 'flex';
    this.deathEl.style.pointerEvents = 'auto';
    document.exitPointerLock();

    // Listen for R to restart
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyR') {
        window.removeEventListener('keydown', onKey);
        location.reload();
      }
    };
    window.addEventListener('keydown', onKey);
  }

  // ── Image processing ─────────────────────────────────────────────

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  private processImage(img: HTMLImageElement): void {
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    this.srcWidth = w;
    this.srcHeight = h;

    // Draw image to offscreen canvas
    const offscreen = document.createElement('canvas');
    offscreen.width = w;
    offscreen.height = h;
    const offCtx = offscreen.getContext('2d')!;
    offCtx.drawImage(img, 0, 0);

    const imgData = offCtx.getImageData(0, 0, w, h);
    const px = imgData.data;

    // Convert black pixels to transparent
    for (let i = 0; i < px.length; i += 4) {
      if (px[i] + px[i + 1] + px[i + 2] < BLACK_THRESHOLD) {
        px[i + 3] = 0;
      }
    }

    this.sourceData = imgData;

    // Build angle and side maps using radial angle from center
    this.angleMap = new Float32Array(w * h).fill(-1);
    this.sideMap = new Uint8Array(w * h).fill(255);

    const cx = w / 2;
    const cy = h / 2;

    // First pass: find angle range for each side
    let healthMinAngle = Infinity, healthMaxAngle = -Infinity;
    let armorMinAngle = Infinity, armorMaxAngle = -Infinity;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (px[idx * 4 + 3] === 0) continue;

        const angle = Math.atan2(Math.abs(x - cx), y - cy);

        if (x < cx) {
          healthMinAngle = Math.min(healthMinAngle, angle);
          healthMaxAngle = Math.max(healthMaxAngle, angle);
        } else {
          armorMinAngle = Math.min(armorMinAngle, angle);
          armorMaxAngle = Math.max(armorMaxAngle, angle);
        }
      }
    }

    // Second pass: store continuous normalized angle (0 = bottom, 1 = top)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (px[idx * 4 + 3] === 0) continue;

        const isHealth = x < cx;
        const angle = Math.atan2(Math.abs(x - cx), y - cy);
        const minA = isHealth ? healthMinAngle : armorMinAngle;
        const maxA = isHealth ? healthMaxAngle : armorMaxAngle;
        const range = maxA - minA;
        if (range <= 0) continue;

        this.angleMap[idx] = (angle - minA) / range;
        this.sideMap[idx] = isHealth ? 0 : 1;
      }
    }
  }

  // ── Rendering ─────────────────────────────────────────────────────

  private renderHealth(): void {
    const health = this.player.health;
    const maxHealth = this.player.maxHealth;
    const armor = this.player.armor;
    const maxArmor = this.player.maxArmor;

    // Skip if nothing changed
    if (health === this.lastHealth && armor === this.lastArmor) return;
    this.lastHealth = health;
    this.lastArmor = armor;

    const healthPct = maxHealth > 0 ? health / maxHealth : 0;
    const armorPct = maxArmor > 0 ? armor / maxArmor : 0;

    const w = this.srcWidth;
    const h = this.srcHeight;
    const src = this.sourceData.data;

    // Create working copy
    const out = new ImageData(w, h);
    const dst = out.data;

    for (let i = 0, pixelIdx = 0; i < src.length; i += 4, pixelIdx++) {
      const alpha = src[i + 3];
      if (alpha === 0) continue;

      const t = this.angleMap[pixelIdx];
      const side = this.sideMap[pixelIdx];
      if (t < 0) continue;

      const pct = side === 0 ? healthPct : armorPct;

      // Smooth depletion: depletionPoint is where the line sits along the arc
      // t=0 is bottom (depletes last), t=1 is top (depletes first)
      const depletionPoint = pct;
      const fade = smoothstep(depletionPoint - BLUR_WIDTH, depletionPoint + BLUR_WIDTH, t);

      // fade: 0 = fully lit, 1 = fully depleted
      const brightness = 1 - fade * (1 - DEPLETED_BRIGHTNESS);
      const alphaScale = 1 - fade * (1 - DEPLETED_ALPHA);

      dst[i] = Math.round(src[i] * brightness);
      dst[i + 1] = Math.round(src[i + 1] * brightness);
      dst[i + 2] = Math.round(src[i + 2] * brightness);
      dst[i + 3] = Math.round(alpha * alphaScale);
    }

    this.ctx.clearRect(0, 0, w, h);
    this.ctx.putImageData(out, 0, 0);
  }

  dispose(): void {
    this.canvas.remove();
    this.damageFlashEl.remove();
    this.deathEl.remove();
  }
}
