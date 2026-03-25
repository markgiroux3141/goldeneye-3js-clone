import type { WeaponEditorSystem } from './WeaponEditorSystem';

// ── Styles (matching EditorUI) ──────────────────────────────────
const PANEL_BG = '#1a1a2e';
const PANEL_BG_LIGHT = '#222240';
const TEXT_COLOR = '#8877cc';
const TEXT_BRIGHT = '#ccbbff';
const ACCENT = '#6655aa';
const BORDER = '#333';
const FONT = '"Courier New", monospace';
const PANEL_WIDTH = 280;

const STEP_SIZES = [0.001, 0.01, 0.1] as const;
const STEP_LABELS = ['FINE', 'NORMAL', 'COARSE'] as const;

type Vec3Prop = 'modelOffset' | 'pivotOffset' | 'muzzleOffset' | 'modelRotation';
type Axis = 'x' | 'y' | 'z';

export class WeaponEditorUI {
  private container: HTMLElement;
  private collapsed = false;
  private stepIndex = 1; // default to NORMAL (0.01)

  // UI elements that need updating
  private weaponNameEl!: HTMLElement;
  private stepButtons: HTMLButtonElement[] = [];
  private zoomBtn!: HTMLButtonElement;
  private aimBtn!: HTMLButtonElement;
  private aimLabel!: HTMLElement;
  private crosshairBtn!: HTMLButtonElement;
  private saveStatus!: HTMLElement;
  private inputs = new Map<string, HTMLInputElement>();

  constructor(private system: WeaponEditorSystem) {
    // Wire up onChange for auto-refresh
    this.system.onChange = () => this.refreshAllValues();

    // ── Main panel container ──
    this.container = document.createElement('div');
    this.container.style.cssText =
      `position:fixed;top:0;left:0;width:${PANEL_WIDTH}px;height:100vh;` +
      `background:${PANEL_BG};color:${TEXT_COLOR};font-family:${FONT};font-size:11px;` +
      `z-index:200;display:flex;flex-direction:column;border-right:1px solid ${BORDER};` +
      `user-select:none;overflow:hidden;`;
    document.body.appendChild(this.container);

    // ── Title bar ──
    const titleBar = this.el('div',
      `display:flex;align-items:center;justify-content:space-between;` +
      `padding:8px 12px;background:${PANEL_BG_LIGHT};border-bottom:1px solid ${BORDER};flex-shrink:0;`
    );
    const title = this.el('span', `color:${TEXT_BRIGHT};font-size:12px;font-weight:bold;letter-spacing:1px;`);
    title.textContent = 'WEAPON EDITOR';
    titleBar.appendChild(title);

    const collapseBtn = this.makeBtn('—');
    collapseBtn.style.fontSize = '14px';
    collapseBtn.style.padding = '2px 8px';
    collapseBtn.addEventListener('click', () => this.toggleCollapse());
    titleBar.appendChild(collapseBtn);
    this.container.appendChild(titleBar);

    // ── Scrollable body ──
    const body = this.el('div', 'flex:1;overflow-y:auto;display:flex;flex-direction:column;');
    this.container.appendChild(body);

    // ── Weapon selector ──
    const weaponRow = this.el('div',
      `display:flex;align-items:center;justify-content:space-between;padding:8px 12px;` +
      `background:${PANEL_BG_LIGHT};border-bottom:1px solid ${BORDER};flex-shrink:0;`
    );
    const prevBtn = this.makeBtn('< [');
    prevBtn.addEventListener('click', () => this.system.cycleWeapon(-1));
    weaponRow.appendChild(prevBtn);

    this.weaponNameEl = this.el('span', `color:${TEXT_BRIGHT};font-size:12px;font-weight:bold;flex:1;text-align:center;`);
    this.weaponNameEl.textContent = this.system.currentConfig.name;
    weaponRow.appendChild(this.weaponNameEl);

    const nextBtn = this.makeBtn('] >');
    nextBtn.addEventListener('click', () => this.system.cycleWeapon(1));
    weaponRow.appendChild(nextBtn);
    body.appendChild(weaponRow);

    // ── Step size selector ──
    const stepRow = this.el('div',
      `display:flex;gap:2px;padding:6px 8px;background:${PANEL_BG_LIGHT};` +
      `border-bottom:1px solid ${BORDER};flex-shrink:0;align-items:center;`
    );
    const stepLabel = this.el('span', `color:${TEXT_COLOR};font-size:9px;margin-right:4px;opacity:0.6;`);
    stepLabel.textContent = 'STEP:';
    stepRow.appendChild(stepLabel);

    for (let i = 0; i < STEP_LABELS.length; i++) {
      const btn = this.makeBtn(STEP_LABELS[i]);
      const idx = i;
      btn.addEventListener('click', () => this.setStepSize(idx));
      stepRow.appendChild(btn);
      this.stepButtons.push(btn);
    }
    this.highlightStepButton();
    body.appendChild(stepRow);

    // ── Position section ──
    this.addSection(body, 'POSITION', 'modelOffset');

    // ── Rotation section ──
    this.addSection(body, 'ROTATION', 'modelRotation', true);

    // ── Scale section ──
    this.addScalarSection(body, 'SCALE', 'modelScale');

    // ── Pivot depth section ──
    this.addPivotDepthSection(body);

    // ── Muzzle Offset section ──
    this.addSection(body, 'MUZZLE', 'muzzleOffset');

    // ── Zoom FOV section ──
    this.addScalarSection(body, 'ZOOM FOV', 'zoomFOV');

    // ── Bottom toolbar ──
    const toolbar = this.el('div',
      `display:flex;gap:4px;padding:8px;background:${PANEL_BG_LIGHT};` +
      `border-top:1px solid ${BORDER};flex-shrink:0;flex-wrap:wrap;`
    );
    this.container.appendChild(toolbar);

    this.zoomBtn = this.makeBtn('ZOOM PREVIEW [Z]');
    this.zoomBtn.addEventListener('click', () => this.toggleZoom());
    toolbar.appendChild(this.zoomBtn);

    this.aimBtn = this.makeBtn('AIM [A]');
    this.aimBtn.addEventListener('click', () => this.toggleAim());
    toolbar.appendChild(this.aimBtn);

    const aimPrevBtn = this.makeBtn('< Q');
    aimPrevBtn.style.padding = '2px 6px';
    aimPrevBtn.addEventListener('click', () => this.system.cycleAimDirection(-1));
    toolbar.appendChild(aimPrevBtn);

    this.aimLabel = this.el('span',
      `color:${TEXT_BRIGHT};font-size:9px;min-width:50px;text-align:center;display:none;line-height:22px;`
    );
    toolbar.appendChild(this.aimLabel);

    const aimNextBtn = this.makeBtn('E >');
    aimNextBtn.style.padding = '2px 6px';
    aimNextBtn.addEventListener('click', () => this.system.cycleAimDirection(1));
    toolbar.appendChild(aimNextBtn);

    this.crosshairBtn = this.makeBtn('CROSSHAIR [X]');
    this.crosshairBtn.addEventListener('click', () => this.toggleCrosshair());
    toolbar.appendChild(this.crosshairBtn);

    const fireBtn = this.makeBtn('FIRE [F]');
    fireBtn.addEventListener('click', () => this.system.fireTest());
    toolbar.appendChild(fireBtn);

    const copyBtn = this.makeBtn('COPY [C]');
    copyBtn.addEventListener('click', () => this.copyConfig());
    toolbar.appendChild(copyBtn);

    const copyAllBtn = this.makeBtn('COPY ALL');
    copyAllBtn.addEventListener('click', () => this.copyAllConfigs());
    toolbar.appendChild(copyAllBtn);

    const resetBtn = this.makeBtn('RESET');
    resetBtn.style.color = '#cc4444';
    resetBtn.addEventListener('click', () => this.system.resetCurrent());
    toolbar.appendChild(resetBtn);

    const saveJsonBtn = this.makeBtn('SAVE JSON');
    saveJsonBtn.style.color = '#44cc88';
    saveJsonBtn.addEventListener('click', () => this.saveJSON());
    toolbar.appendChild(saveJsonBtn);

    const loadJsonBtn = this.makeBtn('LOAD JSON');
    loadJsonBtn.style.color = '#44cc88';
    loadJsonBtn.addEventListener('click', () => this.loadJSON());
    toolbar.appendChild(loadJsonBtn);

    this.saveStatus = this.el('div', `color:${TEXT_COLOR};font-size:9px;padding:2px 6px;opacity:0.8;`);
    toolbar.appendChild(this.saveStatus);

    // ── Keyboard shortcuts ──
    document.addEventListener('keydown', this.onKeyDown);
  }

  dispose(): void {
    document.removeEventListener('keydown', this.onKeyDown);
    this.container.remove();
  }

  // ── Section builders ─────────────────────────────────────────

  private addSection(parent: HTMLElement, label: string, prop: Vec3Prop, isDegrees = false): void {
    const sectionLabel = this.el('div',
      `padding:6px 12px 2px;color:${TEXT_COLOR};font-size:9px;letter-spacing:1px;opacity:0.6;`
    );
    sectionLabel.textContent = label;
    parent.appendChild(sectionLabel);

    const section = this.el('div', `padding:0 8px 4px;display:flex;flex-direction:column;gap:2px;`);
    for (const axis of ['x', 'y', 'z'] as Axis[]) {
      section.appendChild(this.makeVec3Row(prop, axis, isDegrees));
    }
    parent.appendChild(section);

    parent.appendChild(this.el('div', `height:1px;background:${BORDER};margin:2px 0;flex-shrink:0;`));
  }

  private addScalarSection(parent: HTMLElement, label: string, prop: 'modelScale' | 'zoomFOV'): void {
    const sectionLabel = this.el('div',
      `padding:6px 12px 2px;color:${TEXT_COLOR};font-size:9px;letter-spacing:1px;opacity:0.6;`
    );
    sectionLabel.textContent = label;
    parent.appendChild(sectionLabel);

    const section = this.el('div', `padding:0 8px 4px;`);
    section.appendChild(this.makeScalarRow(prop));
    parent.appendChild(section);

    parent.appendChild(this.el('div', `height:1px;background:${BORDER};margin:2px 0;flex-shrink:0;`));
  }

  private addPivotDepthSection(parent: HTMLElement): void {
    const sectionLabel = this.el('div',
      `padding:6px 12px 2px;color:${TEXT_COLOR};font-size:9px;letter-spacing:1px;opacity:0.6;`
    );
    sectionLabel.textContent = 'PIVOT DEPTH';
    parent.appendChild(sectionLabel);

    const section = this.el('div', `padding:0 8px 4px;`);
    const row = this.el('div', `display:flex;align-items:center;gap:4px;`);

    const minusBtn = this.makeBtn('-');
    minusBtn.style.padding = '2px 6px';
    minusBtn.addEventListener('click', () => {
      this.system.adjustPivotDepth(-this.step());
      this.refreshPivotDepth();
      this.refreshVec3Inputs('modelOffset');
    });
    row.appendChild(minusBtn);

    const input = this.makeInput('number', '0');
    input.style.width = '100px';
    this.inputs.set('pivotDepth', input);
    input.addEventListener('change', () => {
      const target = parseFloat(input.value) || 0;
      const current = this.system.currentState.modelOffset.z;
      this.system.adjustPivotDepth(target - current);
      this.refreshPivotDepth();
      this.refreshVec3Inputs('modelOffset');
    });
    row.appendChild(input);

    const plusBtn = this.makeBtn('+');
    plusBtn.style.padding = '2px 6px';
    plusBtn.addEventListener('click', () => {
      this.system.adjustPivotDepth(this.step());
      this.refreshPivotDepth();
      this.refreshVec3Inputs('modelOffset');
    });
    row.appendChild(plusBtn);

    section.appendChild(row);
    parent.appendChild(section);
    parent.appendChild(this.el('div', `height:1px;background:${BORDER};margin:2px 0;flex-shrink:0;`));
  }

  private refreshPivotDepth(): void {
    const input = this.inputs.get('pivotDepth');
    if (!input) return;
    input.value = this.system.currentState.modelOffset.z.toFixed(4);
  }

  private refreshVec3Inputs(prop: Vec3Prop): void {
    const isDeg = prop === 'modelRotation';
    for (const axis of ['x', 'y', 'z'] as Axis[]) {
      this.updateVec3Input(prop, axis, isDeg);
    }
  }

  private makeVec3Row(prop: Vec3Prop, axis: Axis, isDegrees: boolean): HTMLElement {
    const row = this.el('div', `display:flex;align-items:center;gap:4px;`);

    const axisLabel = this.el('span', `color:${TEXT_COLOR};width:14px;font-size:10px;`);
    axisLabel.textContent = axis.toUpperCase();
    row.appendChild(axisLabel);

    const minusBtn = this.makeBtn('-');
    minusBtn.style.padding = '2px 6px';
    minusBtn.addEventListener('click', () => {
      const step = isDegrees ? this.stepDegrees() : this.step();
      this.adjustVec3(prop, axis, -step);
    });
    row.appendChild(minusBtn);

    const input = this.makeInput('number', '0');
    input.style.width = '80px';
    const key = `${prop}.${axis}`;
    this.inputs.set(key, input);
    input.addEventListener('change', () => {
      let val = parseFloat(input.value) || 0;
      if (isDegrees) val = val * Math.PI / 180;
      this.setVec3Component(prop, axis, val);
    });
    row.appendChild(input);

    const plusBtn = this.makeBtn('+');
    plusBtn.style.padding = '2px 6px';
    plusBtn.addEventListener('click', () => {
      const step = isDegrees ? this.stepDegrees() : this.step();
      this.adjustVec3(prop, axis, step);
    });
    row.appendChild(plusBtn);

    // Set initial value
    this.updateVec3Input(prop, axis, isDegrees);

    return row;
  }

  private makeScalarRow(prop: 'modelScale' | 'zoomFOV'): HTMLElement {
    const row = this.el('div', `display:flex;align-items:center;gap:4px;`);

    const minusBtn = this.makeBtn('-');
    minusBtn.style.padding = '2px 6px';
    minusBtn.addEventListener('click', () => {
      const step = prop === 'zoomFOV' ? 1 : this.step();
      this.adjustScalar(prop, -step);
    });
    row.appendChild(minusBtn);

    const input = this.makeInput('number', '0');
    input.style.width = '100px';
    this.inputs.set(prop, input);
    input.addEventListener('change', () => {
      const val = parseFloat(input.value) || 0;
      if (prop === 'modelScale') this.system.setModelScale(val);
      else this.system.setZoomFOV(val);
      this.refreshScalarInput(prop);
    });
    row.appendChild(input);

    const plusBtn = this.makeBtn('+');
    plusBtn.style.padding = '2px 6px';
    plusBtn.addEventListener('click', () => {
      const step = prop === 'zoomFOV' ? 1 : this.step();
      this.adjustScalar(prop, step);
    });
    row.appendChild(plusBtn);

    // Set initial value
    this.refreshScalarInput(prop);

    return row;
  }

  // ── Value manipulation ───────────────────────────────────────

  private step(): number {
    return STEP_SIZES[this.stepIndex];
  }

  private stepDegrees(): number {
    // For rotation: fine=0.1°, normal=1°, coarse=5°
    return [0.1, 1, 5][this.stepIndex] * Math.PI / 180;
  }

  private adjustVec3(prop: Vec3Prop, axis: Axis, delta: number): void {
    const state = this.system.currentState;
    const vec = state[prop];
    vec[axis] += delta;
    this.applyVec3(prop);
    this.updateVec3Input(prop, axis, prop === 'modelRotation');
  }

  private setVec3Component(prop: Vec3Prop, axis: Axis, value: number): void {
    const state = this.system.currentState;
    state[prop][axis] = value;
    this.applyVec3(prop);
    this.updateVec3Input(prop, axis, prop === 'modelRotation');
  }

  private applyVec3(prop: Vec3Prop): void {
    const s = this.system.currentState;
    switch (prop) {
      case 'modelOffset':
        this.system.setModelOffset(s.modelOffset.x, s.modelOffset.y, s.modelOffset.z);
        break;
      case 'pivotOffset':
        this.system.setPivotOffset(s.pivotOffset.x, s.pivotOffset.y, s.pivotOffset.z);
        break;
      case 'muzzleOffset':
        this.system.setMuzzleOffset(s.muzzleOffset.x, s.muzzleOffset.y, s.muzzleOffset.z);
        break;
      case 'modelRotation':
        this.system.setModelRotation(s.modelRotation.x, s.modelRotation.y, s.modelRotation.z);
        break;
    }
  }

  private adjustScalar(prop: 'modelScale' | 'zoomFOV', delta: number): void {
    const state = this.system.currentState;
    if (prop === 'modelScale') {
      this.system.setModelScale(state.modelScale + delta);
    } else {
      this.system.setZoomFOV(state.zoomFOV + delta);
    }
    this.refreshScalarInput(prop);
  }

  // ── Input refresh ────────────────────────────────────────────

  private updateVec3Input(prop: Vec3Prop, axis: Axis, isDegrees: boolean): void {
    const input = this.inputs.get(`${prop}.${axis}`);
    if (!input) return;
    let val = this.system.currentState[prop][axis];
    if (isDegrees) val = val * 180 / Math.PI;
    input.value = isDegrees ? val.toFixed(1) : val.toFixed(4);
  }

  private refreshScalarInput(prop: 'modelScale' | 'zoomFOV'): void {
    const input = this.inputs.get(prop);
    if (!input) return;
    const state = this.system.currentState;
    if (prop === 'modelScale') {
      input.value = state.modelScale.toFixed(6);
    } else {
      input.value = state.zoomFOV.toFixed(0);
    }
  }

  private refreshAllValues(): void {
    this.weaponNameEl.textContent = this.system.currentConfig.name;

    for (const prop of ['modelOffset', 'muzzleOffset', 'modelRotation'] as Vec3Prop[]) {
      const isDeg = prop === 'modelRotation';
      for (const axis of ['x', 'y', 'z'] as Axis[]) {
        this.updateVec3Input(prop, axis, isDeg);
      }
    }
    this.refreshScalarInput('modelScale');
    this.refreshScalarInput('zoomFOV');
    this.refreshPivotDepth();
    this.updateZoomButton();
    this.updateAimButton();
  }

  // ── Actions ──────────────────────────────────────────────────

  private toggleZoom(): void {
    this.system.toggleZoomPreview();
    this.updateZoomButton();
  }

  private updateZoomButton(): void {
    this.zoomBtn.style.background = this.system.isZoomPreview ? ACCENT : PANEL_BG;
    this.zoomBtn.style.color = this.system.isZoomPreview ? TEXT_BRIGHT : TEXT_COLOR;
  }

  private toggleAim(): void {
    this.system.toggleAimPreview();
    this.updateAimButton();
  }

  private toggleCrosshair(): void {
    this.system.toggleCrosshair();
    this.updateCrosshairButton();
  }

  private updateCrosshairButton(): void {
    this.crosshairBtn.style.background = this.system.isCrosshairVisible ? ACCENT : PANEL_BG;
    this.crosshairBtn.style.color = this.system.isCrosshairVisible ? TEXT_BRIGHT : TEXT_COLOR;
  }

  private updateAimButton(): void {
    this.aimBtn.style.background = this.system.isAimPreview ? ACCENT : PANEL_BG;
    this.aimBtn.style.color = this.system.isAimPreview ? TEXT_BRIGHT : TEXT_COLOR;
    if (this.system.isAimPreview) {
      this.aimLabel.style.display = 'block';
      this.aimLabel.textContent = this.system.aimPreviewLabel;
    } else {
      this.aimLabel.style.display = 'none';
    }
  }

  private async copyConfig(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.system.getExportString());
      console.log('[WeaponEditor] Config copied to clipboard');
    } catch {
      console.log('[WeaponEditor] Config:\n' + this.system.getExportString());
    }
  }

  private async copyAllConfigs(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.system.getExportAllString());
      console.log('[WeaponEditor] All configs copied to clipboard');
    } catch {
      console.log('[WeaponEditor] All configs:\n' + this.system.getExportAllString());
    }
  }

  // ── JSON save/load ──────────────────────────────────────────

  private async saveJSON(): Promise<void> {
    const json = this.system.getExportJSON();

    // Try saving directly to disk via dev server API
    const { saveToProject } = await import('../utils/editorApi');
    const result = await saveToProject('config/weapon-config.json', json);
    if (result.ok) {
      console.log('[WeaponEditor] Saved to disk: config/weapon-config.json');
      this.showSaveStatus(true);
      return;
    }

    // Fallback: download
    console.warn('[WeaponEditor] Direct save failed, falling back to download:', result.error);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'weapon-config.json';
    a.click();
    URL.revokeObjectURL(url);
    this.showSaveStatus(false);
  }

  private showSaveStatus(savedToDisk: boolean): void {
    this.saveStatus.textContent = savedToDisk ? '✓ Saved to disk' : '⬇ Downloaded';
    this.saveStatus.style.color = savedToDisk ? '#44cc44' : '#cccc44';
    setTimeout(() => { this.saveStatus.textContent = ''; }, 2000);
  }

  private loadJSON(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          this.system.importJSON(reader.result as string);
          console.log('[WeaponEditor] JSON loaded');
        } catch (err) {
          console.error('[WeaponEditor] Failed to load JSON:', err);
        }
      };
      reader.readAsText(file);
    });
    input.click();
  }

  // ── Step size ────────────────────────────────────────────────

  private setStepSize(index: number): void {
    this.stepIndex = index;
    this.highlightStepButton();
  }

  private highlightStepButton(): void {
    for (let i = 0; i < this.stepButtons.length; i++) {
      this.stepButtons[i].style.background = i === this.stepIndex ? ACCENT : PANEL_BG;
      this.stepButtons[i].style.color = i === this.stepIndex ? TEXT_BRIGHT : TEXT_COLOR;
    }
  }

  // ── Collapse ─────────────────────────────────────────────────

  private toggleCollapse(): void {
    this.collapsed = !this.collapsed;
    this.container.style.width = this.collapsed ? '40px' : `${PANEL_WIDTH}px`;
  }

  // ── Keyboard ─────────────────────────────────────────────────

  private onKeyDown = (e: KeyboardEvent): void => {
    // Don't handle shortcuts when typing in an input field
    if (e.target instanceof HTMLInputElement) return;

    switch (e.code) {
      case 'BracketLeft':
        this.system.cycleWeapon(-1);
        break;
      case 'BracketRight':
        this.system.cycleWeapon(1);
        break;
      case 'KeyZ':
        this.toggleZoom();
        break;
      case 'KeyA':
        this.toggleAim();
        break;
      case 'KeyQ':
        this.system.cycleAimDirection(-1);
        break;
      case 'KeyE':
        this.system.cycleAimDirection(1);
        break;
      case 'KeyF':
        this.system.fireTest();
        break;
      case 'KeyX':
        this.toggleCrosshair();
        break;
      case 'KeyC':
        this.copyConfig();
        break;
    }
  };

  // ── DOM helpers (matching EditorUI) ──────────────────────────

  private el(tag: string, css: string): HTMLElement {
    const el = document.createElement(tag);
    el.style.cssText = css;
    return el;
  }

  private makeBtn(label: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.style.cssText =
      `background:${PANEL_BG};color:${TEXT_COLOR};border:1px solid ${BORDER};` +
      `padding:4px 8px;font-family:${FONT};font-size:9px;cursor:pointer;` +
      `letter-spacing:0.5px;transition:background 0.15s,color 0.15s;`;
    btn.addEventListener('mouseenter', () => {
      btn.style.background = PANEL_BG_LIGHT;
      btn.style.color = TEXT_BRIGHT;
    });
    btn.addEventListener('mouseleave', () => {
      // Don't reset if this is an active toggle button
      if (!btn.dataset.active) {
        btn.style.background = PANEL_BG;
        btn.style.color = TEXT_COLOR;
      }
    });
    return btn;
  }

  private makeInput(type: string, value: string): HTMLInputElement {
    const input = document.createElement('input');
    input.type = type;
    input.value = value;
    input.step = 'any';
    input.style.cssText =
      `background:${PANEL_BG_LIGHT};color:${TEXT_BRIGHT};border:1px solid ${BORDER};` +
      `padding:2px 4px;font-family:${FONT};font-size:10px;width:60px;`;
    // Prevent keyboard input from reaching the game while typing
    input.addEventListener('keydown', (e) => e.stopPropagation());
    input.addEventListener('keyup', (e) => e.stopPropagation());
    return input;
  }
}
