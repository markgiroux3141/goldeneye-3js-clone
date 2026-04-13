// ── Styles ──────────────────────────────────────────────────────────────────
const PANEL_BG_LIGHT = '#222240';
const TEXT_COLOR = '#8877cc';
const TEXT_BRIGHT = '#ccbbff';
const BORDER = '#333';
const FONT = '"Courier New", monospace';

/** Known enum-like fields and their options */
const ENUM_FIELDS: Record<string, Record<string, string[]>> = {
  PhysicsBody: {
    bodyType: ['fixed', 'kinematic', 'dynamic'],
    colliderShape: ['auto-trimesh', 'auto-box', 'none'],
  },
  Faction: {
    faction: ['player', 'enemy', 'neutral'],
  },
  Destructible: {
    destroyEffect: ['break', 'shatter', 'explode', 'none'],
  },
  Pickup: {
    itemType: ['weapon', 'ammo', 'armor', 'key', 'document', 'part'],
  },
  Turret: {
    mode: ['sweep', 'track-player', 'fixed'],
  },
  Interactable: {},
  Detection: {},
  Alarm: {},
  Audio: {},
  VariableSetter: {},
  VariableListener: {},
};

/** Fields to skip (internal/transient) */
const SKIP_FIELDS = new Set(['_type']);

/**
 * Auto-generates property input fields for any component type.
 * Handles numbers, strings, booleans, and known enums.
 */
export class GenericComponentPanel {
  readonly componentType: string;
  private data: Record<string, unknown>;
  private container: HTMLElement;

  onChange?: () => void;

  constructor(parent: HTMLElement, componentType: string, data: Record<string, unknown>) {
    this.componentType = componentType;
    this.data = { ...data };
    this.container = parent;
    this.build();
  }

  getData(): Record<string, unknown> {
    return { ...this.data };
  }

  private build(): void {
    const enums = ENUM_FIELDS[this.componentType] || {};

    for (const [key, value] of Object.entries(this.data)) {
      if (SKIP_FIELDS.has(key) || key.startsWith('_')) continue;

      // Known enum field
      if (enums[key]) {
        this.addSelectRow(key, String(value), enums[key]);
        continue;
      }

      // Boolean
      if (typeof value === 'boolean') {
        this.addBoolRow(key, value);
        continue;
      }

      // Number
      if (typeof value === 'number') {
        this.addNumberRow(key, value);
        continue;
      }

      // String
      if (typeof value === 'string') {
        this.addStringRow(key, value);
        continue;
      }

      // Record<string, string> (like Audio.sounds, VariableSetter.sets)
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        this.addRecordRow(key, value as Record<string, unknown>);
        continue;
      }

      // Array of strings (like dropItems, replacementMeshes)
      if (Array.isArray(value) && value.every(v => typeof v === 'string')) {
        this.addStringListRow(key, value as string[]);
        continue;
      }
    }
  }

  private addNumberRow(key: string, value: number): void {
    const row = el('div', `display:flex;align-items:center;gap:4px;margin-bottom:2px;`);
    const lbl = el('span', `flex:1;color:${TEXT_COLOR};font-size:10px;`);
    lbl.textContent = key;
    row.appendChild(lbl);

    const input = makeInput('number', String(value));
    input.style.width = '60px';
    input.addEventListener('change', () => {
      const v = parseFloat(input.value);
      if (!isNaN(v)) {
        this.data[key] = v;
        this.onChange?.();
      }
    });
    row.appendChild(input);
    this.container.appendChild(row);
  }

  private addStringRow(key: string, value: string): void {
    const row = el('div', `display:flex;align-items:center;gap:4px;margin-bottom:2px;`);
    const lbl = el('span', `flex:1;color:${TEXT_COLOR};font-size:10px;`);
    lbl.textContent = key;
    row.appendChild(lbl);

    const input = makeInput('text', value);
    input.style.width = '100px';
    input.addEventListener('change', () => {
      this.data[key] = input.value;
      this.onChange?.();
    });
    row.appendChild(input);
    this.container.appendChild(row);
  }

  private addBoolRow(key: string, value: boolean): void {
    const row = el('div', `display:flex;align-items:center;gap:4px;margin-bottom:2px;cursor:pointer;`);
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = value;
    checkbox.addEventListener('change', () => {
      this.data[key] = checkbox.checked;
      this.onChange?.();
    });
    row.appendChild(checkbox);

    const lbl = el('span', `color:${TEXT_COLOR};font-size:10px;`);
    lbl.textContent = key;
    row.appendChild(lbl);
    this.container.appendChild(row);
  }

  private addSelectRow(key: string, value: string, options: string[]): void {
    const row = el('div', `display:flex;align-items:center;gap:4px;margin-bottom:2px;`);
    const lbl = el('span', `flex:1;color:${TEXT_COLOR};font-size:10px;`);
    lbl.textContent = key;
    row.appendChild(lbl);

    const select = document.createElement('select');
    select.style.cssText =
      `background:${PANEL_BG_LIGHT};color:${TEXT_BRIGHT};border:1px solid ${BORDER};` +
      `padding:2px 4px;font-family:${FONT};font-size:10px;cursor:pointer;`;

    for (const opt of options) {
      const option = document.createElement('option');
      option.value = opt;
      option.textContent = opt;
      if (opt === value) option.selected = true;
      select.appendChild(option);
    }

    select.addEventListener('change', () => {
      this.data[key] = select.value;
      this.onChange?.();
    });

    row.appendChild(select);
    this.container.appendChild(row);
  }

  private addRecordRow(key: string, value: Record<string, unknown>): void {
    const section = el('div', `margin-bottom:4px;`);
    const lbl = el('div', `color:${TEXT_COLOR};font-size:10px;margin-bottom:2px;`);
    lbl.textContent = `${key}:`;
    section.appendChild(lbl);

    const entriesContainer = el('div', `padding-left:8px;`);

    const rebuildEntries = () => {
      entriesContainer.innerHTML = '';
      const currentRecord = (this.data[key] || {}) as Record<string, unknown>;
      for (const [k, v] of Object.entries(currentRecord)) {
        const entryRow = el('div', `display:flex;align-items:center;gap:2px;margin-bottom:1px;`);
        const keyInput = makeInput('text', k);
        keyInput.style.width = '60px';
        keyInput.style.fontSize = '9px';
        const valInput = makeInput('text', String(v));
        valInput.style.width = '60px';
        valInput.style.fontSize = '9px';
        const delBtn = el('span', `color:#cc4444;cursor:pointer;font-size:12px;padding:0 2px;`);
        delBtn.textContent = '\u00d7'; // ×

        const oldKey = k;
        const updateRecord = () => {
          const record = (this.data[key] || {}) as Record<string, unknown>;
          delete record[oldKey];
          if (keyInput.value) record[keyInput.value] = valInput.value;
          this.data[key] = record;
          this.onChange?.();
        };
        keyInput.addEventListener('change', updateRecord);
        valInput.addEventListener('change', updateRecord);
        delBtn.addEventListener('click', () => {
          const record = (this.data[key] || {}) as Record<string, unknown>;
          delete record[oldKey];
          this.data[key] = record;
          this.onChange?.();
          rebuildEntries();
        });

        entryRow.appendChild(keyInput);
        entryRow.appendChild(valInput);
        entryRow.appendChild(delBtn);
        entriesContainer.appendChild(entryRow);
      }

      // Add button
      const addBtn = el('span', `color:#44cc44;cursor:pointer;font-size:10px;`);
      addBtn.textContent = '+ add';
      addBtn.addEventListener('click', () => {
        const record = (this.data[key] || {}) as Record<string, unknown>;
        record[`key${Object.keys(record).length}`] = '';
        this.data[key] = record;
        this.onChange?.();
        rebuildEntries();
      });
      entriesContainer.appendChild(addBtn);
    };

    rebuildEntries();
    section.appendChild(entriesContainer);
    this.container.appendChild(section);
  }

  private addStringListRow(key: string, value: string[]): void {
    const section = el('div', `margin-bottom:4px;`);
    const lbl = el('div', `color:${TEXT_COLOR};font-size:10px;margin-bottom:2px;`);
    lbl.textContent = `${key}:`;
    section.appendChild(lbl);

    const listContainer = el('div', `padding-left:8px;`);

    const rebuildList = () => {
      listContainer.innerHTML = '';
      const currentList = (this.data[key] || []) as string[];
      for (let i = 0; i < currentList.length; i++) {
        const row = el('div', `display:flex;align-items:center;gap:2px;margin-bottom:1px;`);
        const input = makeInput('text', currentList[i]);
        input.style.width = '120px';
        input.style.fontSize = '9px';
        input.addEventListener('change', () => {
          currentList[i] = input.value;
          this.data[key] = currentList;
          this.onChange?.();
        });
        const delBtn = el('span', `color:#cc4444;cursor:pointer;font-size:12px;padding:0 2px;`);
        delBtn.textContent = '\u00d7';
        delBtn.addEventListener('click', () => {
          currentList.splice(i, 1);
          this.data[key] = currentList;
          this.onChange?.();
          rebuildList();
        });
        row.appendChild(input);
        row.appendChild(delBtn);
        listContainer.appendChild(row);
      }

      const addBtn = el('span', `color:#44cc44;cursor:pointer;font-size:10px;`);
      addBtn.textContent = '+ add';
      addBtn.addEventListener('click', () => {
        currentList.push('');
        this.data[key] = currentList;
        this.onChange?.();
        rebuildList();
      });
      listContainer.appendChild(addBtn);
    };

    rebuildList();
    section.appendChild(listContainer);
    this.container.appendChild(section);
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
