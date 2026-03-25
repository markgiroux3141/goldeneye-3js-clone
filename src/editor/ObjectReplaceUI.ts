import type { ObjectReplaceSystem, ReplaceSlot } from './ObjectReplaceSystem';
import type { FreeFlyCamera } from './FreeFlyCamera';
import type { PlaceableDefinition } from './PlaceableDefinition';
import {
  getAllDefinitions,
  getDefinition,
  serializeLevelData,
  saveLevelData,
} from './LevelData';

// ── Styles (matching EditorUI) ───────────────────────────────────────

const PANEL_BG = '#1a1a2e';
const PANEL_BG_LIGHT = '#222240';
const TEXT_COLOR = '#8877cc';
const TEXT_BRIGHT = '#ccbbff';
const ACCENT = '#6655aa';
const BORDER = '#333';
const FONT = '"Courier New", monospace';

const PANEL_WIDTH = 280;

export class ObjectReplaceUI {
  private container: HTMLElement;
  private collapsed = false;
  private statusText: HTMLElement;
  private slotListContainer: HTMLElement;
  private assignmentContainer: HTMLElement;
  private statusBar: HTMLElement;
  private filterUnassigned = false;
  private filterBtn: HTMLButtonElement | null = null;

  constructor(
    private replaceSystem: ObjectReplaceSystem,
    private flyCamera: FreeFlyCamera,
    private levelType: string,
    private spawn?: { x: number; y: number; z: number }
  ) {
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
    title.textContent = 'OBJECT REPLACE';
    titleBar.appendChild(title);

    const collapseBtn = this.makeBtn('—');
    collapseBtn.style.fontSize = '14px';
    collapseBtn.style.padding = '2px 8px';
    collapseBtn.addEventListener('click', () => this.toggleCollapse());
    titleBar.appendChild(collapseBtn);
    this.container.appendChild(titleBar);

    // ── Body ──
    const body = this.el('div', 'flex:1;overflow-y:auto;display:flex;flex-direction:column;');
    this.container.appendChild(body);

    // ── GLB section ──
    const glbSection = this.el('div', `padding:8px;border-bottom:1px solid ${BORDER};flex-shrink:0;`);
    body.appendChild(glbSection);

    const loadGlbBtn = this.makeBtn('LOAD GLB');
    loadGlbBtn.style.width = '100%';
    loadGlbBtn.style.marginBottom = '6px';
    loadGlbBtn.addEventListener('click', () => this.loadGLB());
    glbSection.appendChild(loadGlbBtn);

    this.statusText = this.el('div', `font-size:10px;color:${TEXT_COLOR};opacity:0.7;`);
    this.statusText.textContent = 'No GLB loaded';
    glbSection.appendChild(this.statusText);

    // ── Filter toggle ──
    const filterRow = this.el('div', `display:flex;gap:4px;margin-top:4px;`);
    this.filterBtn = this.makeBtn('SHOW ALL');
    this.filterBtn.style.flex = '1';
    this.filterBtn.addEventListener('click', () => this.toggleFilter());
    filterRow.appendChild(this.filterBtn);
    glbSection.appendChild(filterRow);

    // ── Slot list label ──
    const slotLabel = this.el('div',
      `padding:6px 12px 2px;color:${TEXT_COLOR};font-size:9px;letter-spacing:1px;opacity:0.6;`
    );
    slotLabel.textContent = 'OBJECTS';
    body.appendChild(slotLabel);

    // ── Slot list ──
    this.slotListContainer = this.el('div',
      `padding:0 8px 8px;display:flex;flex-direction:column;gap:1px;max-height:250px;overflow-y:auto;`
    );
    body.appendChild(this.slotListContainer);

    // ── Divider ──
    body.appendChild(this.el('div', `height:1px;background:${BORDER};margin:4px 0;flex-shrink:0;`));

    // ── Assignment panel label ──
    const assignLabel = this.el('div',
      `padding:6px 12px 2px;color:${TEXT_COLOR};font-size:9px;letter-spacing:1px;opacity:0.6;`
    );
    assignLabel.textContent = 'ASSIGNMENT';
    body.appendChild(assignLabel);

    // ── Assignment panel ──
    this.assignmentContainer = this.el('div', `padding:0 8px 8px;display:flex;flex-direction:column;gap:4px;`);
    body.appendChild(this.assignmentContainer);

    // ── Bottom toolbar ──
    const toolbar = this.el('div',
      `display:flex;gap:4px;padding:8px;background:${PANEL_BG_LIGHT};` +
      `border-top:1px solid ${BORDER};flex-shrink:0;flex-wrap:wrap;`
    );
    this.container.appendChild(toolbar);

    const saveJsonBtn = this.makeBtn('SAVE JSON');
    saveJsonBtn.addEventListener('click', () => this.saveJSON());
    toolbar.appendChild(saveJsonBtn);

    const saveMapBtn = this.makeBtn('SAVE MAP');
    saveMapBtn.style.fontSize = '8px';
    saveMapBtn.addEventListener('click', () => this.saveAssignments());
    toolbar.appendChild(saveMapBtn);

    const loadMapBtn = this.makeBtn('LOAD MAP');
    loadMapBtn.style.fontSize = '8px';
    loadMapBtn.addEventListener('click', () => this.loadAssignments());
    toolbar.appendChild(loadMapBtn);

    // ── Status bar ──
    this.statusBar = this.el('div',
      `padding:4px 12px;font-size:9px;color:${TEXT_COLOR};opacity:0.5;` +
      `background:${PANEL_BG_LIGHT};border-top:1px solid ${BORDER};flex-shrink:0;`
    );
    this.container.appendChild(this.statusBar);

    // ── Wire callbacks ──
    this.replaceSystem.onSlotsLoaded = () => {
      this.renderSlotList();
      this.updateStatusText();
    };
    this.replaceSystem.onSlotSelected = (slot) => {
      this.renderAssignmentPanel(slot);
      this.highlightSlotInList(slot);
    };
    this.replaceSystem.onSlotAssigned = () => {
      this.renderSlotList();
      this.updateStatusText();
    };

    // ── Keyboard ──
    document.addEventListener('keydown', this.onKeyDown);

    // Initial render
    this.renderAssignmentPanel(null);
  }

  // ── GLB loading ────────────────────────────────────────────────────

  private loadGLB(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.glb';
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      this.statusText.textContent = 'Loading...';
      try {
        await this.replaceSystem.loadObjectsGLB(file);
      } catch (err) {
        console.error('[ObjectReplaceUI] Failed to load GLB:', err);
        this.statusText.textContent = 'Load failed!';
      }
    });
    input.click();
  }

  // ── Filter ─────────────────────────────────────────────────────────

  private toggleFilter(): void {
    this.filterUnassigned = !this.filterUnassigned;
    if (this.filterBtn) {
      this.filterBtn.textContent = this.filterUnassigned ? 'UNASSIGNED ONLY' : 'SHOW ALL';
      this.setActive(this.filterBtn, this.filterUnassigned);
    }
    this.renderSlotList();
  }

  // ── Slot list ──────────────────────────────────────────────────────

  private renderSlotList(): void {
    this.slotListContainer.innerHTML = '';
    const slots = this.replaceSystem.slots;

    const filtered = this.filterUnassigned
      ? slots.filter((s) => !s.assignedType)
      : slots;

    for (let i = 0; i < filtered.length; i++) {
      const slot = filtered[i];
      const row = this.el('div',
        `display:flex;align-items:center;padding:3px 6px;cursor:pointer;` +
        `border:1px solid ${BORDER};border-radius:2px;transition:background 0.1s;font-size:10px;`
      );

      const isSelected = this.replaceSystem.selectedSlot === slot;
      const assigned = !!slot.assignedType;

      // Index
      const idx = this.el('span', `width:24px;color:${TEXT_COLOR};opacity:0.5;flex-shrink:0;`);
      idx.textContent = `${slots.indexOf(slot) + 1}`;
      row.appendChild(idx);

      // Status dot
      const dot = this.el('span', `width:8px;height:8px;border-radius:50%;flex-shrink:0;margin-right:4px;`);
      dot.style.background = assigned ? '#44aa44' : '#aa6622';
      row.appendChild(dot);

      // Name + type
      const label = this.el('span', `flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;`);
      label.textContent = assigned
        ? `${slot.name} → ${slot.assignedType}`
        : slot.name;
      label.style.color = assigned ? TEXT_BRIGHT : TEXT_COLOR;
      row.appendChild(label);

      if (isSelected) {
        row.style.background = '#3a2a6e';
        row.style.borderColor = ACCENT;
      }

      row.dataset.slotId = slot.id;
      row.addEventListener('mouseenter', () => { if (!isSelected) row.style.background = PANEL_BG_LIGHT; });
      row.addEventListener('mouseleave', () => { if (!isSelected) row.style.background = ''; });
      row.addEventListener('click', () => {
        this.replaceSystem.selectSlot(slot);
      });

      this.slotListContainer.appendChild(row);
    }

    if (filtered.length === 0 && slots.length > 0) {
      const empty = this.el('div', `padding:4px 8px;opacity:0.4;font-style:italic;`);
      empty.textContent = 'All objects assigned!';
      this.slotListContainer.appendChild(empty);
    } else if (slots.length === 0) {
      const empty = this.el('div', `padding:4px 8px;opacity:0.4;font-style:italic;`);
      empty.textContent = 'Load a GLB to begin';
      this.slotListContainer.appendChild(empty);
    }
  }

  private highlightSlotInList(slot: ReplaceSlot | null): void {
    // Re-render to update selection highlight
    this.renderSlotList();
    // Scroll selected into view
    if (slot) {
      const row = this.slotListContainer.querySelector(`[data-slot-id="${slot.id}"]`);
      row?.scrollIntoView({ block: 'nearest' });
    }
  }

  // ── Assignment panel ───────────────────────────────────────────────

  private renderAssignmentPanel(slot: ReplaceSlot | null): void {
    this.assignmentContainer.innerHTML = '';

    if (!slot) {
      const empty = this.el('div', `padding:4px 0;opacity:0.4;font-style:italic;`);
      empty.textContent = 'Click an object to select it';
      this.assignmentContainer.appendChild(empty);
      return;
    }

    // Slot name header
    const header = this.el('div', `color:${TEXT_BRIGHT};font-size:11px;font-weight:bold;padding:4px 0;`);
    header.textContent = slot.name;
    this.assignmentContainer.appendChild(header);

    // Read-only position
    const posText = this.el('div', `font-size:9px;color:${TEXT_COLOR};opacity:0.7;`);
    posText.textContent = `Pos: ${slot.worldPosition.x.toFixed(2)}, ${slot.worldPosition.y.toFixed(2)}, ${slot.worldPosition.z.toFixed(2)}`;
    this.assignmentContainer.appendChild(posText);

    // Read-only rotation
    const rotText = this.el('div', `font-size:9px;color:${TEXT_COLOR};opacity:0.7;margin-bottom:6px;`);
    rotText.textContent = `Rot: ${slot.worldRotationY.toFixed(1)}°`;
    this.assignmentContainer.appendChild(rotText);

    // ── Type dropdown ──
    const typeLabel = this.el('div', `font-size:9px;color:${TEXT_COLOR};letter-spacing:0.5px;margin-bottom:2px;`);
    typeLabel.textContent = 'ASSIGN TYPE';
    this.assignmentContainer.appendChild(typeLabel);

    const select = document.createElement('select');
    select.style.cssText =
      `width:100%;background:${PANEL_BG_LIGHT};color:${TEXT_BRIGHT};border:1px solid ${BORDER};` +
      `padding:4px 6px;font-family:${FONT};font-size:10px;cursor:pointer;margin-bottom:6px;`;

    // Empty option
    const emptyOpt = document.createElement('option');
    emptyOpt.value = '';
    emptyOpt.textContent = '— Select type —';
    select.appendChild(emptyOpt);

    // Group by category
    const allDefs = getAllDefinitions();
    const categories = new Map<string, PlaceableDefinition[]>();
    for (const def of allDefs) {
      if (!categories.has(def.category)) categories.set(def.category, []);
      categories.get(def.category)!.push(def);
    }

    for (const [cat, defs] of categories) {
      const group = document.createElement('optgroup');
      group.label = cat.toUpperCase();
      for (const def of defs) {
        const option = document.createElement('option');
        option.value = def.type;
        option.textContent = def.name;
        if (slot.assignedType === def.type) option.selected = true;
        group.appendChild(option);
      }
      select.appendChild(group);
    }

    // Prevent keyboard from reaching game
    select.addEventListener('keydown', (e) => e.stopPropagation());

    select.addEventListener('change', async () => {
      if (!select.value) {
        this.replaceSystem.unassignSlot(slot);
        this.renderAssignmentPanel(slot);
        this.renderSlotList();
        this.updateStatusText();
        return;
      }
      const def = getDefinition(select.value);
      if (def) {
        await this.replaceSystem.assignType(slot, def);
        this.renderAssignmentPanel(slot);
      }
    });

    this.assignmentContainer.appendChild(select);

    // ── Type-specific properties (if assigned) ──
    if (slot.assignedType && slot.assignedConfig) {
      const def = getDefinition(slot.assignedType);
      if (def) {
        for (const prop of def.properties) {
          const value = slot.assignedConfig[prop.key];
          if (prop.type === 'select' && prop.options) {
            this.addSelectRow(prop.label, value, prop.options, (v) => {
              this.replaceSystem.updateProperty(slot, prop.key, v);
            });
          } else if (prop.type === 'number') {
            this.addNumberRow(
              prop.label,
              value as number,
              prop.min ?? 0,
              prop.max ?? 100,
              prop.step ?? 1,
              (v) => { this.replaceSystem.updateProperty(slot, prop.key, v); }
            );
          } else if (prop.type === 'boolean') {
            this.addBoolRow(prop.label, value as boolean, (v) => {
              this.replaceSystem.updateProperty(slot, prop.key, v);
            });
          }
        }

        // Action buttons row
        const actionRow = this.el('div', `display:flex;gap:4px;margin-top:6px;`);

        // Preview toggle button
        const isPreviewing = this.replaceSystem.previewingSlot === slot && this.replaceSystem.isPreviewVisible;
        const previewBtn = this.makeBtn(isPreviewing ? 'HIDE MODEL' : 'SHOW MODEL');
        previewBtn.style.flex = '1';
        previewBtn.style.color = '#44aacc';
        if (isPreviewing) {
          this.setActive(previewBtn, true);
          previewBtn.style.color = TEXT_BRIGHT;
        }
        previewBtn.addEventListener('click', async () => {
          if (this.replaceSystem.isPreviewVisible && this.replaceSystem.previewingSlot === slot) {
            this.replaceSystem.hidePreview();
          } else {
            await this.replaceSystem.showPreview(slot);
          }
          this.renderAssignmentPanel(slot);
        });
        actionRow.appendChild(previewBtn);

        // Unassign button
        const unassignBtn = this.makeBtn('UNASSIGN');
        unassignBtn.style.color = '#cc4444';
        unassignBtn.style.flex = '1';
        unassignBtn.addEventListener('click', () => {
          this.replaceSystem.hidePreview();
          this.replaceSystem.unassignSlot(slot);
          this.renderAssignmentPanel(slot);
          this.renderSlotList();
          this.updateStatusText();
        });
        actionRow.appendChild(unassignBtn);

        this.assignmentContainer.appendChild(actionRow);
      }
    }

    // Extract GLB button (available for any selected slot, assigned or not)
    const extractBtn = this.makeBtn('EXTRACT GLB');
    extractBtn.style.marginTop = '6px';
    extractBtn.style.width = '100%';
    extractBtn.style.color = '#ccaa44';
    extractBtn.addEventListener('click', async () => {
      await this.replaceSystem.extractSlotGLB(slot);
    });
    this.assignmentContainer.appendChild(extractBtn);
  }

  // ── Property row builders (mirrored from EditorUI) ─────────────────

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
    this.assignmentContainer.appendChild(row);
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

    select.addEventListener('keydown', (e) => e.stopPropagation());
    select.addEventListener('change', () => {
      const raw = select.value;
      const asNum = Number(raw);
      onChange(isNaN(asNum) ? raw : asNum);
    });

    row.appendChild(select);
    this.assignmentContainer.appendChild(row);
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
    this.assignmentContainer.appendChild(row);
  }

  // ── Save / Load ────────────────────────────────────────────────────

  private async saveJSON(): Promise<void> {
    const objects = this.replaceSystem.getAssignedObjects();
    if (objects.length === 0) {
      console.warn('[ObjectReplace] No assigned objects to save');
      return;
    }
    const data = serializeLevelData(this.levelType, [], this.spawn);
    data.objects = objects;
    const savedToDisk = await saveLevelData(data);
    this.showSaveFeedback(savedToDisk, `${objects.length} objects`);
  }

  private async saveAssignments(): Promise<void> {
    const mapping = this.replaceSystem.getAssignmentMapping();
    const json = JSON.stringify({ assignments: mapping }, null, 2);

    const { saveToProject } = await import('../utils/editorApi');
    const result = await saveToProject(`assignments/assignments-${this.levelType}.json`, json);
    if (result.ok) {
      console.log(`[ObjectReplace] Saved assignment mapping to disk`);
      this.showSaveFeedback(true, 'assignments');
      return;
    }

    // Fallback: download
    console.warn('[ObjectReplace] Direct save failed, falling back to download:', result.error);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assignments-${this.levelType}.json`;
    a.click();
    URL.revokeObjectURL(url);

    navigator.clipboard.writeText(json).catch(() => {});
    this.showSaveFeedback(false, 'assignments');
  }

  private showSaveFeedback(savedToDisk: boolean, what: string): void {
    this.statusBar.textContent = savedToDisk
      ? `✓ Saved ${what} to disk`
      : `⬇ Downloaded ${what} (dev server unavailable)`;
    this.statusBar.style.color = savedToDisk ? '#44cc44' : '#cccc44';
    setTimeout(() => { this.statusBar.style.color = ''; }, 2000);
  }

  private loadAssignments(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const data = JSON.parse(reader.result as string);
          if (!data.assignments) {
            console.error('[ObjectReplace] Invalid assignment file');
            return;
          }
          const count = await this.replaceSystem.applyAssignmentMapping(data.assignments, getDefinition);
          console.log(`[ObjectReplace] Applied ${count} assignments`);
          this.renderSlotList();
          this.updateStatusText();
          this.renderAssignmentPanel(this.replaceSystem.selectedSlot);
        } catch (err) {
          console.error('[ObjectReplace] Failed to load assignments:', err);
        }
      };
      reader.readAsText(file);
    });
    input.click();
  }

  // ── Status ─────────────────────────────────────────────────────────

  private updateStatusText(): void {
    const total = this.replaceSystem.totalCount;
    const assigned = this.replaceSystem.assignedCount;
    if (total === 0) {
      this.statusText.textContent = 'No GLB loaded';
    } else {
      this.statusText.textContent = `${assigned} / ${total} assigned`;
    }
  }

  updateStatus(): void {
    const p = this.flyCamera.getPosition();
    this.statusBar.textContent =
      `Pos: ${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)} | ` +
      `${this.replaceSystem.assignedCount}/${this.replaceSystem.totalCount}`;
  }

  // ── Collapse ───────────────────────────────────────────────────────

  private toggleCollapse(): void {
    this.collapsed = !this.collapsed;
    this.container.style.width = this.collapsed ? '32px' : `${PANEL_WIDTH}px`;
  }

  // ── Keyboard ───────────────────────────────────────────────────────

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.code === 'Tab' && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      this.toggleCollapse();
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────

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
