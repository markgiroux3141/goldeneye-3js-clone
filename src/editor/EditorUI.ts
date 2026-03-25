import type { PlacementSystem } from './PlacementSystem';
import type { FreeFlyCamera } from './FreeFlyCamera';
import type { PlaceableDefinition, PlacedObject } from './PlaceableDefinition';
import type { DecalTaggingMode } from '../tools/DecalTaggingMode';
import {
  getCategories,
  getDefinitionsByCategory,
  getDefinition,
  serializeLevelData,
  saveLevelData,
  loadLevelDataFromFile,
  clearAutoSave,
} from './LevelData';

// ── Styles ──────────────────────────────────────────────────────────

const PANEL_BG = '#1a1a2e';
const PANEL_BG_LIGHT = '#222240';
const TEXT_COLOR = '#8877cc';
const TEXT_BRIGHT = '#ccbbff';
const ACCENT = '#6655aa';
const BORDER = '#333';
const FONT = '"Courier New", monospace';

const PANEL_WIDTH = 280;

export class EditorUI {
  private container: HTMLElement;
  private collapsed = false;
  private paletteContainer: HTMLElement;
  private propertiesContainer: HTMLElement;
  private statusBar: HTMLElement;
  private activeCategory = '';
  private categoryButtons: HTMLButtonElement[] = [];
  private transformModeButtons: HTMLButtonElement[] = [];

  private levelSpawn?: { x: number; y: number; z: number };

  private decalTagging: DecalTaggingMode | null;
  private decalBtn: HTMLButtonElement | null = null;

  constructor(
    private placement: PlacementSystem,
    private flyCamera: FreeFlyCamera,
    private levelType: string,
    spawn?: { x: number; y: number; z: number },
    decalTagging?: DecalTaggingMode
  ) {
    this.decalTagging = decalTagging ?? null;
    this.levelSpawn = spawn;
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
      `padding:8px 12px;background:${PANEL_BG_LIGHT};border-bottom:1px solid ${BORDER};` +
      `flex-shrink:0;`
    );
    const title = this.el('span', `color:${TEXT_BRIGHT};font-size:12px;font-weight:bold;letter-spacing:1px;`);
    title.textContent = 'LEVEL EDITOR';
    titleBar.appendChild(title);

    const collapseBtn = this.makeBtn('—');
    collapseBtn.style.fontSize = '14px';
    collapseBtn.style.padding = '2px 8px';
    collapseBtn.addEventListener('click', () => this.toggleCollapse());
    titleBar.appendChild(collapseBtn);
    this.container.appendChild(titleBar);

    // ── Body (everything below title, scrollable) ──
    const body = this.el('div', 'flex:1;overflow-y:auto;display:flex;flex-direction:column;');
    this.container.appendChild(body);

    // ── Category tabs ──
    const tabBar = this.el('div',
      `display:flex;gap:2px;padding:6px 8px;background:${PANEL_BG_LIGHT};` +
      `border-bottom:1px solid ${BORDER};flex-shrink:0;flex-wrap:wrap;`
    );
    body.appendChild(tabBar);

    // We'll populate tabs after definitions are registered
    // For now create the container reference
    this.categoryButtons = [];
    const cats = getCategories();
    for (const cat of cats) {
      const btn = this.makeBtn(cat.toUpperCase());
      btn.addEventListener('click', () => this.setCategory(cat));
      tabBar.appendChild(btn);
      this.categoryButtons.push(btn);
    }
    if (cats.length > 0) {
      this.activeCategory = cats[0];
    }

    // ── Object palette ──
    const paletteLabel = this.el('div',
      `padding:6px 12px 2px;color:${TEXT_COLOR};font-size:9px;letter-spacing:1px;opacity:0.6;`
    );
    paletteLabel.textContent = 'OBJECTS';
    body.appendChild(paletteLabel);

    this.paletteContainer = this.el('div', `padding:0 8px 8px;display:flex;flex-direction:column;gap:2px;`);
    body.appendChild(this.paletteContainer);

    // ── Divider ──
    body.appendChild(this.el('div', `height:1px;background:${BORDER};margin:4px 0;flex-shrink:0;`));

    // ── Properties panel ──
    const propsLabel = this.el('div',
      `padding:6px 12px 2px;color:${TEXT_COLOR};font-size:9px;letter-spacing:1px;opacity:0.6;`
    );
    propsLabel.textContent = 'PROPERTIES';
    body.appendChild(propsLabel);

    this.propertiesContainer = this.el('div', `padding:0 8px 8px;display:flex;flex-direction:column;gap:4px;`);
    body.appendChild(this.propertiesContainer);

    // ── Bottom toolbar ──
    const toolbar = this.el('div',
      `display:flex;gap:4px;padding:8px;background:${PANEL_BG_LIGHT};` +
      `border-top:1px solid ${BORDER};flex-shrink:0;flex-wrap:wrap;`
    );
    this.container.appendChild(toolbar);

    const saveBtn = this.makeBtn('SAVE');
    saveBtn.addEventListener('click', () => this.save());
    toolbar.appendChild(saveBtn);

    const loadBtn = this.makeBtn('LOAD');
    loadBtn.addEventListener('click', () => this.load());
    toolbar.appendChild(loadBtn);

    const clearBtn = this.makeBtn('CLEAR ALL');
    clearBtn.style.color = '#cc4444';
    clearBtn.addEventListener('click', () => {
      if (this.placement.objects.length === 0) return;
      this.placement.clearAll();
      clearAutoSave(this.levelType);
      this.renderProperties(null);
    });
    toolbar.appendChild(clearBtn);

    if (this.decalTagging) {
      this.decalBtn = this.makeBtn('DECALS');
      this.decalBtn.style.color = '#00cccc';
      this.decalBtn.addEventListener('click', () => this.toggleDecalMode());
      toolbar.appendChild(this.decalBtn);
    }

    // ── Status bar ──
    this.statusBar = this.el('div',
      `padding:4px 12px;font-size:9px;color:${TEXT_COLOR};opacity:0.5;` +
      `background:${PANEL_BG_LIGHT};border-top:1px solid ${BORDER};flex-shrink:0;`
    );
    this.container.appendChild(this.statusBar);

    // ── Wire up callbacks ──
    this.placement.onSelectionChange = (obj) => this.renderProperties(obj);
    this.placement.onPlacementEnd = () => this.syncCategoryButtons();
    this.placement.onTransformModeChange = () => this.syncTransformModeButtons();
    this.placement.onStepChanged = () => this.updateStatus();

    // ── Keyboard ──
    document.addEventListener('keydown', this.onKeyDown);

    // Initial render
    this.syncCategoryButtons();
    this.renderPalette();
    this.renderProperties(null);
  }

  // ── Category tabs ─────────────────────────────────────────────

  private setCategory(cat: string): void {
    this.activeCategory = cat;
    this.syncCategoryButtons();
    this.renderPalette();
  }

  private syncCategoryButtons(): void {
    const cats = getCategories();
    for (let i = 0; i < cats.length; i++) {
      const active = cats[i] === this.activeCategory;
      this.setActive(this.categoryButtons[i], active);
    }
  }

  private syncTransformModeButtons(): void {
    const currentMode = this.placement.transformMode;
    for (const btn of this.transformModeButtons) {
      this.setActive(btn, btn.dataset.mode === currentMode);
    }
  }

  // ── Object palette ────────────────────────────────────────────

  private renderPalette(): void {
    this.paletteContainer.innerHTML = '';
    const defs = getDefinitionsByCategory(this.activeCategory);

    for (const def of defs) {
      const row = this.el('div',
        `display:flex;align-items:center;padding:4px 8px;cursor:pointer;` +
        `border:1px solid ${BORDER};border-radius:2px;transition:background 0.1s;`
      );
      row.textContent = `▸ ${def.name}`;
      row.addEventListener('mouseenter', () => { row.style.background = PANEL_BG_LIGHT; });
      row.addEventListener('mouseleave', () => { row.style.background = ''; });
      row.addEventListener('click', () => this.startPlacing(def));
      this.paletteContainer.appendChild(row);
    }

    if (defs.length === 0) {
      const empty = this.el('div', `padding:4px 8px;opacity:0.4;font-style:italic;`);
      empty.textContent = 'No objects in this category';
      this.paletteContainer.appendChild(empty);
    }
  }

  private startPlacing(def: PlaceableDefinition): void {
    this.placement.startPlacing(def);
  }

  // ── Properties panel ──────────────────────────────────────────

  private renderProperties(obj: PlacedObject | null): void {
    this.propertiesContainer.innerHTML = '';

    if (!obj) {
      const empty = this.el('div', `padding:4px 0;opacity:0.4;font-style:italic;`);
      empty.textContent = 'Select an object to edit';
      this.propertiesContainer.appendChild(empty);
      this.updateStatus();
      return;
    }

    // Object name header
    const header = this.el('div', `color:${TEXT_BRIGHT};font-size:11px;font-weight:bold;padding:4px 0;`);
    header.textContent = obj.definition.name;
    this.propertiesContainer.appendChild(header);

    // Transform mode buttons
    const modeBar = this.el('div', `display:flex;gap:2px;margin-bottom:6px;`);
    const modes: { label: string; mode: 'translate' | 'rotate' | 'scale'; key: string }[] = [
      { label: 'MOVE', mode: 'translate', key: 'Q' },
      { label: 'ROTATE', mode: 'rotate', key: 'R' },
      { label: 'SCALE', mode: 'scale', key: 'F' },
    ];
    this.transformModeButtons = [];
    for (const m of modes) {
      const btn = this.makeBtn(`${m.label} (${m.key})`);
      btn.style.flex = '1';
      btn.style.textAlign = 'center';
      btn.addEventListener('click', () => this.placement.setTransformMode(m.mode));
      btn.dataset.mode = m.mode;
      modeBar.appendChild(btn);
      this.transformModeButtons.push(btn);
    }
    this.propertiesContainer.appendChild(modeBar);
    this.syncTransformModeButtons();

    // Position fields
    const pos = obj.config.position as { x: number; y: number; z: number };
    this.addPositionRow('X', pos.x, (v) => {
      pos.x = v;
      this.placement.updatePosition(pos.x, pos.y, pos.z);
    });
    this.addPositionRow('Y', pos.y, (v) => {
      pos.y = v;
      this.placement.updatePosition(pos.x, pos.y, pos.z);
    });
    this.addPositionRow('Z', pos.z, (v) => {
      pos.z = v;
      this.placement.updatePosition(pos.x, pos.y, pos.z);
    });

    // Rotation
    const rot = (obj.config.rotation as number) ?? 0;
    this.addNumberRow('Rotation °', rot, -360, 360, this.placement.rotationStepDeg, (v) => {
      this.placement.updateProperty('rotation', v);
    });

    // Type-specific properties
    for (const prop of obj.definition.properties) {
      const value = obj.config[prop.key];
      if (prop.type === 'select' && prop.options) {
        this.addSelectRow(prop.label, value, prop.options, (v) => {
          obj.config[prop.key] = v;
          this.placement.updateProperty(prop.key, v);
        });
      } else if (prop.type === 'number') {
        this.addNumberRow(
          prop.label,
          value as number,
          prop.min ?? 0,
          prop.max ?? 100,
          prop.step ?? 1,
          (v) => {
            obj.config[prop.key] = v;
            this.placement.updateProperty(prop.key, v);
          }
        );
      } else if (prop.type === 'boolean') {
        this.addBoolRow(prop.label, value as boolean, (v) => {
          obj.config[prop.key] = v;
          this.placement.updateProperty(prop.key, v);
        });
      }
    }

    // Action buttons
    const actions = this.el('div', `display:flex;gap:4px;margin-top:8px;`);

    const delBtn = this.makeBtn('DELETE');
    delBtn.style.color = '#cc4444';
    delBtn.addEventListener('click', () => {
      this.placement.deleteSelected();
      this.renderProperties(null);
    });
    actions.appendChild(delBtn);

    const dupBtn = this.makeBtn('DUPLICATE');
    dupBtn.addEventListener('click', () => this.placement.duplicateSelected());
    actions.appendChild(dupBtn);

    this.propertiesContainer.appendChild(actions);
    this.updateStatus();
  }

  // ── Property row builders ─────────────────────────────────────

  private addPositionRow(label: string, value: number, onChange: (v: number) => void): void {
    const row = this.el('div', `display:flex;align-items:center;gap:4px;`);
    const lbl = this.el('span', `width:16px;color:${TEXT_COLOR};font-size:9px;`);
    lbl.textContent = label;
    row.appendChild(lbl);

    const input = this.makeInput('number', value.toFixed(3));
    input.step = '0.25';
    input.style.flex = '1';
    input.addEventListener('change', () => {
      const v = parseFloat(input.value);
      if (!isNaN(v)) onChange(v);
    });
    row.appendChild(input);
    this.propertiesContainer.appendChild(row);
  }

  private addNumberRow(
    label: string, value: number, min: number, max: number, step: number,
    onChange: (v: number) => void
  ): void {
    const row = this.el('div', `display:flex;align-items:center;gap:4px;`);
    const lbl = this.el('span', `flex:1;color:${TEXT_COLOR};font-size:10px;`);
    lbl.textContent = label;
    row.appendChild(lbl);

    const input = this.makeInput('number', String(value));
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.style.width = '60px';
    input.addEventListener('change', () => {
      const v = parseFloat(input.value);
      if (!isNaN(v)) onChange(v);
    });
    row.appendChild(input);
    this.propertiesContainer.appendChild(row);
  }

  private addSelectRow(
    label: string,
    value: unknown,
    options: { label: string; value: string | number | boolean }[],
    onChange: (v: string | number | boolean) => void
  ): void {
    const row = this.el('div', `display:flex;align-items:center;gap:4px;`);
    const lbl = this.el('span', `flex:1;color:${TEXT_COLOR};font-size:10px;`);
    lbl.textContent = label;
    row.appendChild(lbl);

    const select = document.createElement('select');
    select.style.cssText =
      `background:${PANEL_BG_LIGHT};color:${TEXT_BRIGHT};border:1px solid ${BORDER};` +
      `padding:2px 4px;font-family:${FONT};font-size:10px;cursor:pointer;`;

    for (const opt of options) {
      const option = document.createElement('option');
      option.value = String(opt.value);
      option.textContent = opt.label;
      if (String(opt.value) === String(value)) option.selected = true;
      select.appendChild(option);
    }

    select.addEventListener('change', () => {
      // Try to preserve numeric types
      const raw = select.value;
      const asNum = Number(raw);
      onChange(isNaN(asNum) ? raw : asNum);
    });

    row.appendChild(select);
    this.propertiesContainer.appendChild(row);
  }

  private addBoolRow(label: string, value: boolean, onChange: (v: boolean) => void): void {
    const row = this.el('div', `display:flex;align-items:center;gap:4px;cursor:pointer;`);
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = value;
    checkbox.addEventListener('change', () => onChange(checkbox.checked));
    row.appendChild(checkbox);

    const lbl = this.el('span', `color:${TEXT_COLOR};font-size:10px;`);
    lbl.textContent = label;
    row.appendChild(lbl);
    this.propertiesContainer.appendChild(row);
  }

  // ── Save / Load ───────────────────────────────────────────────

  private async save(): Promise<void> {
    const data = serializeLevelData(this.levelType, this.placement.objects, this.levelSpawn);
    const savedToDisk = await saveLevelData(data);
    this.statusBar.textContent = savedToDisk ? '✓ Saved to disk' : '⬇ Downloaded (dev server unavailable)';
    this.statusBar.style.color = savedToDisk ? '#44cc44' : '#cccc44';
    setTimeout(() => { this.statusBar.style.color = ''; }, 2000);
  }

  private async load(): Promise<void> {
    try {
      const data = await loadLevelDataFromFile();
      this.placement.clearAll();
      await this.placement.loadObjects(data.objects, getDefinition);
      console.log(`[Editor] Loaded ${data.objects.length} objects`);
    } catch (err) {
      console.error('[Editor] Load failed:', err);
    }
  }

  // ── Decal tagging mode ───────────────────────────────────────

  private toggleDecalMode(): void {
    if (!this.decalTagging) return;
    this.decalTagging.toggle();
    this.placement.decalTaggingActive = this.decalTagging.active;
    if (this.decalBtn) {
      this.decalBtn.style.background = this.decalTagging.active ? '#00aaaa' : '';
      this.decalBtn.style.color = this.decalTagging.active ? '#000' : '#00cccc';
    }
  }

  // ── Collapse ──────────────────────────────────────────────────

  private toggleCollapse(): void {
    this.collapsed = !this.collapsed;
    if (this.collapsed) {
      this.container.style.width = '32px';
      this.container.style.overflow = 'hidden';
    } else {
      this.container.style.width = `${PANEL_WIDTH}px`;
      this.container.style.overflow = 'hidden';
    }
  }

  // ── Status bar ────────────────────────────────────────────────

  updateStatus(): void {
    const p = this.flyCamera.getPosition();
    const count = this.placement.objects.length;
    const posStep = this.placement.positionStep;
    const rotStep = this.placement.rotationStepDeg;
    const sclStep = this.placement.scaleStep;
    this.statusBar.textContent =
      `Pos: ${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)} | Obj: ${count}\n` +
      `Step: Pos ${posStep}m  Rot ${rotStep}°  Scl ${sclStep}`;
    this.statusBar.style.whiteSpace = 'pre-line';
  }

  // ── Keyboard ──────────────────────────────────────────────────

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.code === 'Tab' && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      this.toggleCollapse();
    }
  };

  // ── Helpers ───────────────────────────────────────────────────

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
    input.style.cssText =
      `background:${PANEL_BG_LIGHT};color:${TEXT_BRIGHT};border:1px solid ${BORDER};` +
      `padding:2px 4px;font-family:${FONT};font-size:10px;width:60px;`;
    // Prevent keyboard input from reaching the game's InputManager while typing
    input.addEventListener('keydown', (e) => e.stopPropagation());
    input.addEventListener('keyup', (e) => e.stopPropagation());
    return input;
  }

  private setActive(btn: HTMLButtonElement, active: boolean): void {
    if (active) {
      btn.style.background = '#3a2a6e';
      btn.style.color = TEXT_BRIGHT;
      btn.style.borderColor = ACCENT;
      btn.dataset.active = '1';
    } else {
      btn.style.background = PANEL_BG;
      btn.style.color = TEXT_COLOR;
      btn.style.borderColor = BORDER;
      delete btn.dataset.active;
    }
  }

  dispose(): void {
    document.removeEventListener('keydown', this.onKeyDown);
    this.container.remove();
  }
}
