import type { CatalogPrefab, PrefabCatalog } from '../ecs';
import type { PrefabRegistry } from '../ecs';
import type { PrefabPreviewScene } from './PrefabPreviewScene';
import { PrefabBrowserPanel } from './panels/PrefabBrowserPanel';
import { GenericComponentPanel } from './panels/GenericComponentPanel';
import { StateMachinePanel } from './panels/StateMachinePanel';
import { KeyframePanel } from './panels/KeyframePanel';
import { PivotPanel } from './panels/PivotPanel';
import { saveToProject, isDevServer } from '../utils/editorApi';

// ── Styles (matching EditorUI) ──────────────────────────────────────────────
const PANEL_BG = '#1a1a2e';
const PANEL_BG_LIGHT = '#222240';
const TEXT_COLOR = '#8877cc';
const TEXT_BRIGHT = '#ccbbff';
const ACCENT = '#6655aa';
const BORDER = '#333';
const FONT = '"Courier New", monospace';
const PANEL_WIDTH = 280;

/** Component types that get specialized panels */
const SPECIALIZED_COMPONENTS = new Set(['StateMachine', 'KeyframeAnimation', 'Pivot']);

/** Which component types to show per prefab type */
const TYPE_PANELS: Record<string, string[]> = {
  'door':              ['StateMachine', 'KeyframeAnimation', 'Pivot', 'Interactable', 'Audio', 'PhysicsBody'],
  'console':           ['StateMachine', 'VariableSetter', 'Interactable', 'Audio'],
  'pickup':            ['Pickup'],
  'drone-gun':         ['StateMachine', 'Detection', 'Turret', 'Destructible', 'Health', 'Audio', 'PhysicsBody'],
  'security-camera':   ['Detection', 'Alarm', 'PhysicsBody'],
  'prop':              ['PhysicsBody'],
  'prop-destructible':  ['Destructible', 'Health', 'PhysicsBody'],
  'prop-explosive':     ['Destructible', 'Health', 'Audio', 'PhysicsBody'],
  'character':         ['Health', 'Faction'],
  'environment':       [],
  'mesh':              [],
};

export class PrefabEditorUI {
  private container: HTMLElement;
  private browserPanel: PrefabBrowserPanel;
  private propertiesContainer: HTMLElement;
  private statusBar: HTMLElement;
  private catalog: PrefabCatalog;
  private registry: PrefabRegistry;
  private preview: PrefabPreviewScene;
  private selectedPrefab: CatalogPrefab | null = null;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  // Specialized panels (reused across selections)
  private stateMachinePanel: StateMachinePanel | null = null;
  private keyframePanel: KeyframePanel | null = null;
  private pivotPanel: PivotPanel | null = null;
  private genericPanels: GenericComponentPanel[] = [];

  constructor(
    catalog: PrefabCatalog,
    registry: PrefabRegistry,
    preview: PrefabPreviewScene,
  ) {
    this.catalog = catalog;
    this.registry = registry;
    this.preview = preview;

    // ── Main panel container ──
    this.container = el('div',
      `position:fixed;top:0;left:0;width:${PANEL_WIDTH}px;height:100vh;` +
      `background:${PANEL_BG};color:${TEXT_COLOR};font-family:${FONT};font-size:11px;` +
      `z-index:200;display:flex;flex-direction:column;border-right:1px solid ${BORDER};` +
      `user-select:none;overflow:hidden;`
    );
    document.body.appendChild(this.container);

    // ── Title bar ──
    const titleBar = el('div',
      `display:flex;align-items:center;justify-content:space-between;` +
      `padding:8px 12px;background:${PANEL_BG_LIGHT};border-bottom:1px solid ${BORDER};` +
      `flex-shrink:0;`
    );
    const title = el('span', `color:${TEXT_BRIGHT};font-size:12px;font-weight:bold;letter-spacing:1px;`);
    title.textContent = 'PREFAB EDITOR';
    titleBar.appendChild(title);
    this.container.appendChild(titleBar);

    // ── Body ──
    const body = el('div', 'flex:1;overflow-y:auto;display:flex;flex-direction:column;min-height:0;');
    this.container.appendChild(body);

    // ── Browser panel (top half) ──
    const browserSection = el('div', 'flex:1;display:flex;flex-direction:column;min-height:200px;max-height:45vh;');
    body.appendChild(browserSection);
    this.browserPanel = new PrefabBrowserPanel(browserSection);
    this.browserPanel.setCatalog(catalog);
    this.browserPanel.onPrefabSelected = (prefab) => this.selectPrefab(prefab);

    // ── Divider ──
    const divider = el('div', `height:1px;background:${BORDER};flex-shrink:0;margin:0 8px;`);
    body.appendChild(divider);

    // ── Properties panel (bottom half) ──
    this.propertiesContainer = el('div', 'flex:1;overflow-y:auto;padding:8px;min-height:0;');
    body.appendChild(this.propertiesContainer);

    // ── Status / toolbar ──
    const toolbar = el('div',
      `display:flex;gap:4px;padding:6px 8px;background:${PANEL_BG_LIGHT};` +
      `border-top:1px solid ${BORDER};flex-shrink:0;align-items:center;`
    );

    if (isDevServer()) {
      const saveBtn = makeBtn('SAVE');
      saveBtn.addEventListener('click', () => this.save());
      toolbar.appendChild(saveBtn);

      const revertBtn = makeBtn('REVERT');
      revertBtn.addEventListener('click', () => this.revert());
      toolbar.appendChild(revertBtn);
    }

    this.statusBar = el('span', `flex:1;text-align:right;font-size:9px;color:${TEXT_COLOR};`);
    toolbar.appendChild(this.statusBar);
    this.container.appendChild(toolbar);
  }

  // ── Selection ──────────────────────────────────────────────────

  private async selectPrefab(prefab: CatalogPrefab): Promise<void> {
    this.selectedPrefab = prefab;
    this.rebuildProperties();
    await this.preview.loadPrefab(prefab);
  }

  // ── Properties ─────────────────────────────────────────────────

  private rebuildProperties(): void {
    this.propertiesContainer.innerHTML = '';
    this.stateMachinePanel = null;
    this.keyframePanel = null;
    this.pivotPanel = null;
    this.genericPanels = [];

    if (!this.selectedPrefab) {
      const msg = el('div', `color:${TEXT_COLOR};font-size:10px;opacity:0.5;padding:8px;`);
      msg.textContent = 'Select a prefab to edit';
      this.propertiesContainer.appendChild(msg);
      return;
    }

    const prefab = this.selectedPrefab;
    const typeDef = this.registry.get(prefab.type);

    // Header
    const header = el('div', `margin-bottom:8px;`);
    const nameLabel = el('div', `color:${TEXT_BRIGHT};font-size:11px;font-weight:bold;`);
    nameLabel.textContent = prefab.displayName || prefab.id;
    header.appendChild(nameLabel);
    const typeLabel = el('div', `color:${TEXT_COLOR};font-size:9px;opacity:0.6;`);
    typeLabel.textContent = `Type: ${prefab.type} | Meshes: ${prefab.meshes.length}`;
    header.appendChild(typeLabel);
    this.propertiesContainer.appendChild(header);

    // Mesh list
    if (prefab.meshes.length > 0) {
      const meshSection = this.makeCollapsible('MESHES');
      for (let i = 0; i < prefab.meshes.length; i++) {
        const meshLabel = el('div', `color:${TEXT_COLOR};font-size:9px;padding:1px 0;`);
        meshLabel.textContent = `[${i}] ${prefab.meshes[i]}`;
        meshSection.appendChild(meshLabel);
      }
      this.propertiesContainer.appendChild(meshSection);
    }

    // Determine which component panels to show
    const panelTypes = TYPE_PANELS[prefab.type] || [];

    // Get merged component data: type defaults + catalog overrides
    const componentData = this.getMergedComponentData(prefab, typeDef);

    for (const compType of panelTypes) {
      const data = componentData[compType] || {};

      if (compType === 'StateMachine') {
        const section = this.makeCollapsible('STATE MACHINE');
        this.stateMachinePanel = new StateMachinePanel(section, data, this.getClipNames(componentData));
        this.stateMachinePanel.onChange = () => this.onComponentChanged(compType);
        this.propertiesContainer.appendChild(section);
      } else if (compType === 'KeyframeAnimation') {
        const section = this.makeCollapsible('ANIMATION');
        this.keyframePanel = new KeyframePanel(section, data, prefab.meshes, this.preview);
        this.keyframePanel.onChange = () => this.onComponentChanged(compType);
        this.propertiesContainer.appendChild(section);
      } else if (compType === 'Pivot') {
        const section = this.makeCollapsible('PIVOT');
        this.pivotPanel = new PivotPanel(section, data, prefab.meshes, this.preview);
        this.pivotPanel.onChange = () => this.onComponentChanged(compType);
        this.propertiesContainer.appendChild(section);
      } else {
        const section = this.makeCollapsible(compType.toUpperCase());
        const panel = new GenericComponentPanel(section, compType, data);
        panel.onChange = () => this.onComponentChanged(compType);
        this.genericPanels.push(panel);
        this.propertiesContainer.appendChild(section);
      }
    }
  }

  /**
   * Merge PrefabRegistry type defaults with catalog-level overrides.
   */
  private getMergedComponentData(
    prefab: CatalogPrefab,
    typeDef?: { defaultComponents: { _type: string; [key: string]: unknown }[] },
  ): Record<string, Record<string, unknown>> {
    const result: Record<string, Record<string, unknown>> = {};

    // Start with type defaults
    if (typeDef) {
      for (const comp of typeDef.defaultComponents) {
        result[comp._type] = { ...comp };
      }
    }

    // Apply catalog overrides
    if (prefab.defaults) {
      for (const [compType, overrides] of Object.entries(prefab.defaults)) {
        if (result[compType]) {
          result[compType] = { ...result[compType], ...overrides };
        } else {
          result[compType] = { _type: compType, ...overrides };
        }
      }
    }

    return result;
  }

  /**
   * Get animation clip names for populating StateMachine transition dropdowns.
   */
  private getClipNames(componentData: Record<string, Record<string, unknown>>): string[] {
    const animData = componentData['KeyframeAnimation'];
    if (!animData?.clips) return [];
    return Object.keys(animData.clips as Record<string, unknown>);
  }

  /**
   * Called when any component panel changes data.
   */
  private onComponentChanged(componentType: string): void {
    if (!this.selectedPrefab) return;

    // Get the updated data from the appropriate panel
    let data: Record<string, unknown> | null = null;

    if (componentType === 'StateMachine' && this.stateMachinePanel) {
      data = this.stateMachinePanel.getData();
    } else if (componentType === 'KeyframeAnimation' && this.keyframePanel) {
      data = this.keyframePanel.getData();
    } else if (componentType === 'Pivot' && this.pivotPanel) {
      data = this.pivotPanel.getData();
    } else {
      const panel = this.genericPanels.find(p => p.componentType === componentType);
      if (panel) data = panel.getData();
    }

    if (data) {
      // Update catalog defaults
      if (!this.selectedPrefab.defaults) {
        this.selectedPrefab.defaults = {};
      }
      this.selectedPrefab.defaults[componentType] = data;
      this.markDirty();
    }
  }

  // ── Save ───────────────────────────────────────────────────────

  private markDirty(): void {
    this.statusBar.textContent = 'Unsaved changes';
    this.statusBar.style.color = '#cccc44';

    // Auto-save debounce
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.save(), 1000);
  }

  private async save(): Promise<void> {
    try {
      const json = JSON.stringify(this.catalog.toJSON(), null, 2);
      const result = await saveToProject('/data/prefabs.json', json);
      if (result.ok) {
        this.statusBar.textContent = 'Saved';
        this.statusBar.style.color = '#44cc44';
      } else {
        this.statusBar.textContent = 'Save failed';
        this.statusBar.style.color = '#cc4444';
      }
    } catch {
      this.statusBar.textContent = 'Save error';
      this.statusBar.style.color = '#cc4444';
    }
    setTimeout(() => {
      this.statusBar.style.color = TEXT_COLOR;
    }, 2000);
  }

  private async revert(): Promise<void> {
    try {
      const resp = await fetch('/data/prefabs.json');
      const data = await resp.json();
      this.catalog.loadFromJSON(data);
      this.browserPanel.setCatalog(this.catalog);

      // Re-select current if still valid
      if (this.selectedPrefab) {
        const refreshed = this.catalog.get(this.selectedPrefab.id);
        if (refreshed) {
          this.selectPrefab(refreshed);
        }
      }

      this.statusBar.textContent = 'Reverted';
      this.statusBar.style.color = '#44cc44';
    } catch {
      this.statusBar.textContent = 'Revert failed';
      this.statusBar.style.color = '#cc4444';
    }
    setTimeout(() => { this.statusBar.style.color = TEXT_COLOR; }, 2000);
  }

  // ── Helpers ────────────────────────────────────────────────────

  private makeCollapsible(title: string): HTMLElement {
    const section = el('div', 'margin-bottom:8px;');
    const header = el('div',
      `display:flex;align-items:center;cursor:pointer;padding:4px 0;` +
      `border-bottom:1px solid ${BORDER};margin-bottom:4px;`
    );
    const arrow = el('span', `color:${TEXT_COLOR};font-size:10px;margin-right:4px;`);
    arrow.textContent = '\u25BE'; // ▾
    header.appendChild(arrow);

    const label = el('span', `color:${TEXT_BRIGHT};font-size:10px;font-weight:bold;letter-spacing:0.5px;`);
    label.textContent = title;
    header.appendChild(label);
    section.appendChild(header);

    const content = el('div', 'padding-left:4px;');
    section.appendChild(content);

    let collapsed = false;
    header.addEventListener('click', () => {
      collapsed = !collapsed;
      content.style.display = collapsed ? 'none' : '';
      arrow.textContent = collapsed ? '\u25B8' : '\u25BE'; // ▸ or ▾
    });

    // Return the content div so panels attach to it
    return content;
  }
}

// ── DOM helpers ──────────────────────────────────────────────────────────────

function el(tag: string, css: string): HTMLElement {
  const e = document.createElement(tag);
  e.style.cssText = css;
  return e;
}

function makeBtn(label: string): HTMLButtonElement {
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
    btn.style.background = PANEL_BG;
    btn.style.color = TEXT_COLOR;
  });
  return btn;
}
