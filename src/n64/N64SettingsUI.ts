import { N64GraphicsSystem, N64EffectToggles } from './N64GraphicsSystem';

interface ToggleButton {
  key: keyof N64EffectToggles;
  label: string;
  el: HTMLButtonElement;
}

export class N64SettingsUI {
  private container: HTMLElement;
  private masterBtn: HTMLButtonElement;
  private togglesContainer: HTMLElement;
  private buttons: ToggleButton[] = [];

  constructor(private system: N64GraphicsSystem) {
    // Main container
    this.container = document.createElement('div');
    this.container.style.cssText =
      'position:fixed;top:8px;right:8px;z-index:100;display:flex;flex-direction:column;gap:4px;' +
      'font-family:"Courier New",monospace;user-select:none;';
    document.body.appendChild(this.container);

    // Master toggle button
    this.masterBtn = this.createButton('N64 MODE');
    this.masterBtn.style.cssText += 'font-size:11px;font-weight:bold;letter-spacing:1px;';
    this.masterBtn.addEventListener('click', () => this.toggleMaster());
    this.container.appendChild(this.masterBtn);

    // Sub-toggles container (hidden when master is off)
    this.togglesContainer = document.createElement('div');
    this.togglesContainer.style.cssText = 'display:none;flex-direction:column;gap:2px;';
    this.container.appendChild(this.togglesContainer);

    // Create 9 effect toggles
    const effects: { key: keyof N64EffectToggles; label: string }[] = [
      { key: 'crt', label: 'CRT' },
      { key: 'scanlines', label: 'SCANLINES' },
      { key: 'lowRes', label: 'LOW-RES' },
      { key: 'fog', label: 'FOG' },
      { key: 'dither', label: 'DITHER' },
      { key: 'vertexLit', label: 'VERTEX LIT' },
      { key: 'bakedLit', label: 'BAKED LIT' },
      { key: 'affine', label: 'AFFINE WARP' },
      { key: 'vertJitter', label: 'VERT JITTER' },
      { key: 'colorDepth', label: '15-BIT COLOR' },
    ];

    for (const effect of effects) {
      const btn = this.createButton(effect.label);
      btn.addEventListener('click', () => this.toggleEffect(effect.key));
      this.togglesContainer.appendChild(btn);
      this.buttons.push({ key: effect.key, label: effect.label, el: btn });
    }

    // Keyboard shortcut: N to toggle master
    document.addEventListener('keydown', this.onKeyDown);

    this.syncUI();
  }

  private createButton(label: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.style.cssText =
      'background:#1a1a2e;color:#8877cc;border:1px solid #333;padding:4px 10px;' +
      'font-family:"Courier New",monospace;font-size:9px;cursor:pointer;text-align:left;' +
      'letter-spacing:0.5px;transition:background 0.15s,color 0.15s;';
    return btn;
  }

  private setActive(btn: HTMLButtonElement, active: boolean): void {
    if (active) {
      btn.style.background = '#3a2a6e';
      btn.style.color = '#ccbbff';
      btn.style.borderColor = '#6655aa';
    } else {
      btn.style.background = '#1a1a2e';
      btn.style.color = '#554477';
      btn.style.borderColor = '#333';
    }
  }

  private toggleMaster(): void {
    this.system.toggle();
    this.syncUI();
  }

  private toggleEffect(key: keyof N64EffectToggles): void {
    const toggles = this.system.getToggles();
    this.system.setEffect(key, !toggles[key]);
    this.syncUI();
  }

  private syncUI(): void {
    const enabled = this.system.isEnabled();
    this.setActive(this.masterBtn, enabled);
    this.togglesContainer.style.display = enabled ? 'flex' : 'none';

    if (enabled) {
      const toggles = this.system.getToggles();
      for (const btn of this.buttons) {
        this.setActive(btn.el, toggles[btn.key]);
      }
    }
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.code === 'KeyN' && !e.repeat && !e.ctrlKey && !e.altKey && !e.metaKey) {
      this.toggleMaster();
    }
  };

  dispose(): void {
    document.removeEventListener('keydown', this.onKeyDown);
    this.container.remove();
  }
}
