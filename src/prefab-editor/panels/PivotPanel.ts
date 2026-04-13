import type { PrefabPreviewScene } from '../PrefabPreviewScene';

// ── Styles ──────────────────────────────────────────────────────────────────
const PANEL_BG = '#1a1a2e';
const PANEL_BG_LIGHT = '#222240';
const TEXT_COLOR = '#8877cc';
const TEXT_BRIGHT = '#ccbbff';
const BORDER = '#333';
const FONT = '"Courier New", monospace';

/**
 * Editor panel for Pivot components.
 * Provides offset [x,y,z] inputs and affectsMeshes checkboxes.
 * Wires into the PrefabPreviewScene for visual pivot editing.
 */
export class PivotPanel {
  private container: HTMLElement;
  private data: {
    _type: string;
    offset: [number, number, number];
    affectsMeshes: number[];
  };
  private meshNames: string[];
  private preview: PrefabPreviewScene;
  private offsetInputs: HTMLInputElement[] = [];

  onChange?: () => void;

  constructor(
    parent: HTMLElement,
    rawData: Record<string, unknown>,
    meshNames: string[],
    preview: PrefabPreviewScene,
  ) {
    this.container = parent;
    this.meshNames = meshNames;
    this.preview = preview;

    const offset = (rawData.offset as number[]) || [0, 0, 0];
    this.data = {
      _type: 'Pivot',
      offset: [offset[0] ?? 0, offset[1] ?? 0, offset[2] ?? 0],
      affectsMeshes: [...((rawData.affectsMeshes as number[]) || [0])],
    };

    // Wire up 3D pivot dragging
    this.preview.onPivotDragged = (newOffset) => {
      this.data.offset = newOffset;
      this.updateInputValues();
      this.onChange?.();
    };

    this.build();
    this.preview.showPivot(this.data.offset);
  }

  getData(): Record<string, unknown> {
    return JSON.parse(JSON.stringify(this.data));
  }

  private build(): void {
    this.container.innerHTML = '';
    this.offsetInputs = [];

    // ── Offset inputs ──
    const offsetLabel = el('div', `color:${TEXT_BRIGHT};font-size:10px;font-weight:bold;margin-bottom:4px;`);
    offsetLabel.textContent = 'Offset';
    this.container.appendChild(offsetLabel);

    const axes = ['X', 'Y', 'Z'] as const;
    for (let i = 0; i < 3; i++) {
      const row = el('div', `display:flex;align-items:center;gap:4px;margin-bottom:2px;`);
      const lbl = el('span', `color:${TEXT_COLOR};font-size:10px;width:14px;`);
      lbl.textContent = axes[i];
      row.appendChild(lbl);

      const input = makeInput('number', String(this.data.offset[i]));
      input.style.width = '80px';
      input.step = '0.01';
      input.addEventListener('change', () => {
        this.data.offset[i] = parseFloat(input.value) || 0;
        this.preview.updatePivotPosition(this.data.offset);
        this.onChange?.();
      });
      row.appendChild(input);
      this.offsetInputs.push(input);
      this.container.appendChild(row);
    }

    // ── Affects meshes ──
    const meshLabel = el('div',
      `color:${TEXT_BRIGHT};font-size:10px;font-weight:bold;margin:8px 0 4px 0;`
    );
    meshLabel.textContent = 'Affects Meshes';
    this.container.appendChild(meshLabel);

    // "All" checkbox
    const allRow = el('div', `display:flex;align-items:center;gap:4px;margin-bottom:2px;`);
    const allCb = document.createElement('input');
    allCb.type = 'checkbox';
    allCb.checked = this.data.affectsMeshes.includes(-1);
    allCb.addEventListener('change', () => {
      if (allCb.checked) {
        this.data.affectsMeshes = [-1];
      } else {
        this.data.affectsMeshes = [0];
      }
      this.onChange?.();
      this.build();
    });
    allRow.appendChild(allCb);
    const allLabel = el('span', `color:${TEXT_COLOR};font-size:10px;`);
    allLabel.textContent = 'All meshes';
    allRow.appendChild(allLabel);
    this.container.appendChild(allRow);

    // Per-mesh checkboxes (only shown if "all" is not checked)
    if (!this.data.affectsMeshes.includes(-1)) {
      for (let i = 0; i < this.meshNames.length; i++) {
        const row = el('div', `display:flex;align-items:center;gap:4px;margin-bottom:1px;`);
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = this.data.affectsMeshes.includes(i);
        cb.addEventListener('change', () => {
          if (cb.checked) {
            if (!this.data.affectsMeshes.includes(i)) this.data.affectsMeshes.push(i);
          } else {
            this.data.affectsMeshes = this.data.affectsMeshes.filter(m => m !== i);
          }
          this.onChange?.();
        });
        row.appendChild(cb);

        const meshLbl = el('span', `color:${TEXT_COLOR};font-size:9px;`);
        const name = this.meshNames[i].replace(/\.glb$/i, '').split('/').pop() || `mesh${i}`;
        meshLbl.textContent = `[${i}] ${name}`;
        row.appendChild(meshLbl);
        this.container.appendChild(row);
      }
    }

    // ── Test rotation button ──
    const testBtn = document.createElement('button');
    testBtn.textContent = '\u21bb Test Rotate';
    testBtn.style.cssText =
      `background:${PANEL_BG};color:#44aacc;border:1px solid ${BORDER};` +
      `padding:4px 8px;font-family:${FONT};font-size:9px;cursor:pointer;margin-top:8px;`;
    testBtn.addEventListener('mouseenter', () => { testBtn.style.background = PANEL_BG_LIGHT; });
    testBtn.addEventListener('mouseleave', () => { testBtn.style.background = PANEL_BG; });
    testBtn.addEventListener('click', () => {
      this.preview.testPivotRotation();
    });
    this.container.appendChild(testBtn);
  }

  /** Update offset input values from data (called when pivot is dragged in 3D) */
  private updateInputValues(): void {
    for (let i = 0; i < 3; i++) {
      if (this.offsetInputs[i]) {
        this.offsetInputs[i].value = String(this.data.offset[i]);
      }
    }
  }
}

// ── DOM helpers ──────────────────────────────────────────────────────────────

function el(tag: string, css: string): HTMLElement {
  const e = document.createElement(tag);
  e.style.cssText = css;
  return e;
}

function makeInput(type: string, value: string): HTMLInputElement {
  const input = document.createElement('input');
  input.type = type;
  input.value = value;
  input.style.cssText =
    `background:${PANEL_BG_LIGHT};color:${TEXT_BRIGHT};border:1px solid ${BORDER};` +
    `padding:2px 4px;font-family:${FONT};font-size:10px;width:60px;`;
  input.addEventListener('keydown', (e) => e.stopPropagation());
  input.addEventListener('keyup', (e) => e.stopPropagation());
  return input;
}
