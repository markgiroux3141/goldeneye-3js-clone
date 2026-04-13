import type { CatalogPrefab, PrefabCatalog } from '../../ecs';

// ── Styles (matching EditorUI) ──────────────────────────────────────────────
const PANEL_BG = '#1a1a2e';
const PANEL_BG_LIGHT = '#222240';
const TEXT_COLOR = '#8877cc';
const TEXT_BRIGHT = '#ccbbff';
const ACCENT = '#6655aa';
const BORDER = '#333';
const FONT = '"Courier New", monospace';

const TYPE_TABS = ['all', 'door', 'console', 'pickup', 'prop', 'prop-destructible', 'prop-explosive', 'character', 'security-camera', 'drone-gun', 'environment', 'mesh'];

export class PrefabBrowserPanel {
  private container: HTMLElement;
  private searchInput: HTMLInputElement;
  private listContainer: HTMLElement;
  private tabButtons: HTMLButtonElement[] = [];
  private activeType = 'all';
  private selectedId: string | null = null;
  private catalog: PrefabCatalog | null = null;

  onPrefabSelected?: (prefab: CatalogPrefab) => void;

  constructor(parent: HTMLElement) {
    this.container = el('div', 'display:flex;flex-direction:column;flex:1;min-height:0;');
    parent.appendChild(this.container);

    // ── Search ──
    this.searchInput = document.createElement('input');
    this.searchInput.type = 'text';
    this.searchInput.placeholder = 'Search prefabs...';
    this.searchInput.style.cssText =
      `background:${PANEL_BG_LIGHT};color:${TEXT_BRIGHT};border:1px solid ${BORDER};` +
      `padding:4px 8px;font-family:${FONT};font-size:10px;margin:6px 8px;outline:none;`;
    this.searchInput.addEventListener('input', () => this.rebuildList());
    this.searchInput.addEventListener('keydown', (e) => e.stopPropagation());
    this.searchInput.addEventListener('keyup', (e) => e.stopPropagation());
    this.container.appendChild(this.searchInput);

    // ── Type tabs ──
    const tabBar = el('div',
      `display:flex;gap:2px;padding:4px 8px;flex-wrap:wrap;flex-shrink:0;`
    );
    for (const type of TYPE_TABS) {
      const btn = makeBtn(type === 'all' ? 'ALL' : type.toUpperCase().replace(/-/g, ' '));
      btn.style.fontSize = '8px';
      btn.style.padding = '2px 4px';
      btn.addEventListener('click', () => {
        this.activeType = type;
        this.updateTabHighlights();
        this.rebuildList();
      });
      tabBar.appendChild(btn);
      this.tabButtons.push(btn);
    }
    this.container.appendChild(tabBar);
    this.updateTabHighlights();

    // ── List ──
    this.listContainer = el('div',
      `flex:1;overflow-y:auto;padding:4px 8px;min-height:0;`
    );
    this.container.appendChild(this.listContainer);
  }

  setCatalog(catalog: PrefabCatalog): void {
    this.catalog = catalog;
    this.rebuildList();
  }

  getSelectedId(): string | null {
    return this.selectedId;
  }

  private rebuildList(): void {
    this.listContainer.innerHTML = '';
    if (!this.catalog) return;

    const search = this.searchInput.value.toLowerCase();
    let prefabs = this.activeType === 'all'
      ? this.catalog.getAll()
      : this.catalog.getByType(this.activeType);

    if (search) {
      prefabs = prefabs.filter(p =>
        p.id.toLowerCase().includes(search) ||
        (p.displayName?.toLowerCase().includes(search))
      );
    }

    // Sort by ID
    prefabs.sort((a, b) => a.id.localeCompare(b.id));

    // Show count
    const countLabel = el('div', `color:${TEXT_COLOR};font-size:9px;margin-bottom:4px;opacity:0.6;`);
    countLabel.textContent = `${prefabs.length} prefabs`;
    this.listContainer.appendChild(countLabel);

    for (const prefab of prefabs) {
      const item = el('div',
        `padding:3px 6px;cursor:pointer;font-size:10px;color:${TEXT_COLOR};` +
        `border-left:2px solid transparent;transition:background 0.1s;`
      );
      item.textContent = prefab.displayName || prefab.id;
      item.title = `${prefab.id} (${prefab.type})`;

      if (prefab.id === this.selectedId) {
        item.style.background = PANEL_BG_LIGHT;
        item.style.borderLeftColor = ACCENT;
        item.style.color = TEXT_BRIGHT;
      }

      item.addEventListener('mouseenter', () => {
        if (prefab.id !== this.selectedId) {
          item.style.background = '#1e1e36';
        }
      });
      item.addEventListener('mouseleave', () => {
        if (prefab.id !== this.selectedId) {
          item.style.background = 'transparent';
        }
      });
      item.addEventListener('click', () => {
        this.selectedId = prefab.id;
        this.rebuildList();
        this.onPrefabSelected?.(prefab);
      });

      this.listContainer.appendChild(item);
    }
  }

  private updateTabHighlights(): void {
    for (let i = 0; i < this.tabButtons.length; i++) {
      const btn = this.tabButtons[i];
      const type = TYPE_TABS[i];
      if (type === this.activeType) {
        btn.style.background = '#3a2a6e';
        btn.style.color = TEXT_BRIGHT;
        btn.style.borderColor = ACCENT;
      } else {
        btn.style.background = PANEL_BG;
        btn.style.color = TEXT_COLOR;
        btn.style.borderColor = BORDER;
      }
    }
  }
}

// ── DOM helpers (matching EditorUI pattern) ──────────────────────────────────

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
    if (!btn.dataset.active) {
      btn.style.background = PANEL_BG;
      btn.style.color = TEXT_COLOR;
    }
  });
  return btn;
}
