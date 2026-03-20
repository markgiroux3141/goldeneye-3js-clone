export class HUD {
  private ammoEl: HTMLElement;
  private reloadEl: HTMLElement;
  private hitMarkerEl: HTMLElement;
  private hitMarkerTimer = 0;

  constructor() {
    this.ammoEl = document.createElement('div');
    this.ammoEl.style.cssText =
      'position:fixed;bottom:32px;right:32px;color:#fff;font:bold 28px monospace;' +
      'text-shadow:2px 2px 4px rgba(0,0,0,0.8);pointer-events:none;z-index:20';
    document.body.appendChild(this.ammoEl);

    this.reloadEl = document.createElement('div');
    this.reloadEl.style.cssText =
      'position:fixed;bottom:68px;right:32px;color:#ff0;font:bold 18px monospace;' +
      'text-shadow:1px 1px 3px rgba(0,0,0,0.8);pointer-events:none;z-index:20;display:none';
    this.reloadEl.textContent = 'RELOADING...';
    document.body.appendChild(this.reloadEl);

    // Hit marker (white X at crosshair)
    this.hitMarkerEl = document.createElement('div');
    this.hitMarkerEl.style.cssText =
      'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);' +
      'color:#fff;font:bold 24px monospace;pointer-events:none;z-index:25;display:none;' +
      'text-shadow:1px 1px 2px rgba(0,0,0,0.9)';
    this.hitMarkerEl.textContent = 'X';
    document.body.appendChild(this.hitMarkerEl);
  }

  updateAmmo(current: number, max: number): void {
    this.ammoEl.textContent = `${current} / ${max}`;
    this.ammoEl.style.color = current === 0 ? '#f44' : '#fff';
  }

  showReloading(): void {
    this.reloadEl.style.display = 'block';
  }

  hideReloading(): void {
    this.reloadEl.style.display = 'none';
  }

  showHitMarker(): void {
    this.hitMarkerEl.style.display = 'block';
    this.hitMarkerTimer = 0.1;
  }

  update(dt: number): void {
    if (this.hitMarkerTimer > 0) {
      this.hitMarkerTimer -= dt;
      if (this.hitMarkerTimer <= 0) {
        this.hitMarkerEl.style.display = 'none';
      }
    }
  }

  dispose(): void {
    this.ammoEl.remove();
    this.reloadEl.remove();
    this.hitMarkerEl.remove();
  }
}
