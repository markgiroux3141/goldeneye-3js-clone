import type { StateTransition } from '../../ecs';

// ── Styles ──────────────────────────────────────────────────────────────────
const PANEL_BG = '#1a1a2e';
const PANEL_BG_LIGHT = '#222240';
const TEXT_COLOR = '#8877cc';
const TEXT_BRIGHT = '#ccbbff';
const BORDER = '#333';
const FONT = '"Courier New", monospace';

const TRIGGER_TYPES: StateTransition['trigger'][] = [
  'interact', 'proximity', 'variable', 'timer', 'animation-complete', 'damage', 'destroy',
];

/**
 * Editor panel for StateMachine components.
 * Provides list-based editing of states and transitions.
 */
export class StateMachinePanel {
  private container: HTMLElement;
  private data: {
    _type: string;
    states: string[];
    initialState: string;
    transitions: Record<string, StateTransition>;
  };
  private clipNames: string[];

  onChange?: () => void;

  constructor(parent: HTMLElement, rawData: Record<string, unknown>, clipNames: string[]) {
    this.container = parent;
    this.clipNames = clipNames;

    // Deep clone the data
    this.data = {
      _type: 'StateMachine',
      states: [...((rawData.states as string[]) || ['idle'])],
      initialState: (rawData.initialState as string) || 'idle',
      transitions: JSON.parse(JSON.stringify(rawData.transitions || {})),
    };

    this.build();
  }

  getData(): Record<string, unknown> {
    return JSON.parse(JSON.stringify(this.data));
  }

  private build(): void {
    this.container.innerHTML = '';

    // ── States section ──
    const statesHeader = el('div', `color:${TEXT_BRIGHT};font-size:10px;font-weight:bold;margin-bottom:4px;`);
    statesHeader.textContent = 'States';
    this.container.appendChild(statesHeader);

    for (let i = 0; i < this.data.states.length; i++) {
      const state = this.data.states[i];
      const row = el('div', `display:flex;align-items:center;gap:4px;margin-bottom:2px;`);

      // Radio for initial state
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'initialState';
      radio.checked = state === this.data.initialState;
      radio.title = 'Initial state';
      radio.addEventListener('change', () => {
        this.data.initialState = state;
        this.onChange?.();
      });
      row.appendChild(radio);

      // State name input
      const input = makeInput('text', state);
      input.style.width = '80px';
      input.addEventListener('change', () => {
        const oldName = this.data.states[i];
        const newName = input.value.trim();
        if (!newName || (newName !== oldName && this.data.states.includes(newName))) return;

        // Rename in transitions
        const newTransitions: Record<string, StateTransition> = {};
        for (const [key, trans] of Object.entries(this.data.transitions)) {
          const newKey = key.replace(oldName, newName);
          newTransitions[newKey] = trans;
        }
        this.data.transitions = newTransitions;
        this.data.states[i] = newName;
        if (this.data.initialState === oldName) this.data.initialState = newName;
        this.onChange?.();
        this.build();
      });
      row.appendChild(input);

      // Delete button
      if (this.data.states.length > 1) {
        const delBtn = el('span', `color:#cc4444;cursor:pointer;font-size:14px;`);
        delBtn.textContent = '\u00d7';
        delBtn.addEventListener('click', () => {
          const removed = this.data.states[i];
          this.data.states.splice(i, 1);
          // Remove transitions referencing this state
          for (const key of Object.keys(this.data.transitions)) {
            const [from, to] = key.split('\u2192');
            if (from === removed || to === removed) {
              delete this.data.transitions[key];
            }
          }
          if (this.data.initialState === removed) {
            this.data.initialState = this.data.states[0];
          }
          this.onChange?.();
          this.build();
        });
        row.appendChild(delBtn);
      }

      this.container.appendChild(row);
    }

    // Add state button
    const addStateBtn = makeSmallBtn('+ State');
    addStateBtn.addEventListener('click', () => {
      let name = 'state';
      let n = 1;
      while (this.data.states.includes(name)) { name = `state${n++}`; }
      this.data.states.push(name);
      this.onChange?.();
      this.build();
    });
    this.container.appendChild(addStateBtn);

    // ── Transitions section ──
    const transHeader = el('div',
      `color:${TEXT_BRIGHT};font-size:10px;font-weight:bold;margin:8px 0 4px 0;`
    );
    transHeader.textContent = 'Transitions';
    this.container.appendChild(transHeader);

    const transEntries = Object.entries(this.data.transitions);
    for (const [key, transition] of transEntries) {
      const [fromState, toState] = key.split('\u2192');
      this.addTransitionRow(fromState, toState, transition, key);
    }

    // Add transition button
    const addTransBtn = makeSmallBtn('+ Transition');
    addTransBtn.addEventListener('click', () => {
      const from = this.data.states[0] || 'idle';
      const to = this.data.states[1] || this.data.states[0] || 'idle';
      let key = `${from}\u2192${to}`;
      // Avoid duplicate keys
      let n = 1;
      while (this.data.transitions[key]) { key = `${from}\u2192${to}_${n++}`; }
      this.data.transitions[key] = { trigger: 'interact' };
      this.onChange?.();
      this.build();
    });
    this.container.appendChild(addTransBtn);
  }

  private addTransitionRow(from: string, to: string, transition: StateTransition, key: string): void {
    const block = el('div',
      `border:1px solid ${BORDER};padding:4px;margin-bottom:4px;background:${PANEL_BG};`
    );

    // From → To row
    const headerRow = el('div', `display:flex;align-items:center;gap:2px;margin-bottom:3px;`);

    const fromSelect = makeSelect(this.data.states, from);
    fromSelect.style.width = '60px';
    headerRow.appendChild(fromSelect);

    const arrow = el('span', `color:${TEXT_COLOR};font-size:10px;`);
    arrow.textContent = ' \u2192 ';
    headerRow.appendChild(arrow);

    const toSelect = makeSelect(this.data.states, to);
    toSelect.style.width = '60px';
    headerRow.appendChild(toSelect);

    // Delete transition
    const delBtn = el('span', `color:#cc4444;cursor:pointer;font-size:14px;margin-left:auto;`);
    delBtn.textContent = '\u00d7';
    delBtn.addEventListener('click', () => {
      delete this.data.transitions[key];
      this.onChange?.();
      this.build();
    });
    headerRow.appendChild(delBtn);

    block.appendChild(headerRow);

    // Trigger type
    const triggerRow = el('div', `display:flex;align-items:center;gap:4px;margin-bottom:2px;`);
    const triggerLabel = el('span', `color:${TEXT_COLOR};font-size:9px;width:40px;`);
    triggerLabel.textContent = 'trigger';
    triggerRow.appendChild(triggerLabel);
    const triggerSelect = makeSelect(TRIGGER_TYPES, transition.trigger);
    triggerSelect.style.width = '110px';
    triggerRow.appendChild(triggerSelect);
    block.appendChild(triggerRow);

    // Conditional fields based on trigger type
    const condContainer = el('div', '');
    block.appendChild(condContainer);

    const rebuildCondFields = (trigger: string) => {
      condContainer.innerHTML = '';

      if (trigger === 'timer') {
        const delayRow = this.makeFieldRow('delay (s)', String(transition.delay ?? 1), (v) => {
          transition.delay = parseFloat(v) || 0;
          this.onChange?.();
        });
        condContainer.appendChild(delayRow);
      }

      if (trigger === 'proximity') {
        const radiusRow = this.makeFieldRow('radius', String(transition.radius ?? 3), (v) => {
          transition.radius = parseFloat(v) || 0;
          this.onChange?.();
        });
        condContainer.appendChild(radiusRow);
      }

      if (trigger === 'variable') {
        const condRow = this.makeFieldRow('condition', transition.condition ?? '', (v) => {
          transition.condition = v;
          this.onChange?.();
        });
        condContainer.appendChild(condRow);
      }

      // Animation clip (for any trigger)
      const animRow = el('div', `display:flex;align-items:center;gap:4px;margin-top:2px;`);
      const animLabel = el('span', `color:${TEXT_COLOR};font-size:9px;width:40px;`);
      animLabel.textContent = 'anim';
      animRow.appendChild(animLabel);
      const animSelect = makeSelect(['(none)', ...this.clipNames], transition.animation ?? '(none)');
      animSelect.style.width = '80px';
      animSelect.addEventListener('change', () => {
        transition.animation = animSelect.value === '(none)' ? undefined : animSelect.value;
        this.onChange?.();
      });
      animRow.appendChild(animSelect);
      condContainer.appendChild(animRow);

      // Sound
      const soundRow = this.makeFieldRow('sound', transition.sound ?? '', (v) => {
        transition.sound = v || undefined;
        this.onChange?.();
      });
      condContainer.appendChild(soundRow);
    };

    rebuildCondFields(transition.trigger);

    // Update when from/to/trigger changes
    const updateKey = () => {
      const newFrom = fromSelect.value;
      const newTo = toSelect.value;
      const newKey = `${newFrom}\u2192${newTo}`;
      delete this.data.transitions[key];
      this.data.transitions[newKey] = transition;
      this.onChange?.();
      this.build();
    };
    fromSelect.addEventListener('change', updateKey);
    toSelect.addEventListener('change', updateKey);
    triggerSelect.addEventListener('change', () => {
      transition.trigger = triggerSelect.value as StateTransition['trigger'];
      this.onChange?.();
      rebuildCondFields(transition.trigger);
    });

    this.container.appendChild(block);
  }

  private makeFieldRow(label: string, value: string, onChange: (v: string) => void): HTMLElement {
    const row = el('div', `display:flex;align-items:center;gap:4px;margin-top:2px;`);
    const lbl = el('span', `color:${TEXT_COLOR};font-size:9px;width:40px;`);
    lbl.textContent = label;
    row.appendChild(lbl);

    const input = makeInput('text', value);
    input.style.width = '80px';
    input.style.fontSize = '9px';
    input.addEventListener('change', () => onChange(input.value));
    row.appendChild(input);
    return row;
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

function makeSelect(options: string[], selected: string): HTMLSelectElement {
  const select = document.createElement('select');
  select.style.cssText =
    `background:${PANEL_BG_LIGHT};color:${TEXT_BRIGHT};border:1px solid ${BORDER};` +
    `padding:2px 4px;font-family:${FONT};font-size:9px;cursor:pointer;`;
  for (const opt of options) {
    const option = document.createElement('option');
    option.value = opt;
    option.textContent = opt;
    if (opt === selected) option.selected = true;
    select.appendChild(option);
  }
  return select;
}

function makeSmallBtn(label: string): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.textContent = label;
  btn.style.cssText =
    `background:${PANEL_BG};color:#44cc44;border:1px solid ${BORDER};` +
    `padding:2px 6px;font-family:${FONT};font-size:9px;cursor:pointer;margin-top:2px;`;
  btn.addEventListener('mouseenter', () => { btn.style.background = PANEL_BG_LIGHT; });
  btn.addEventListener('mouseleave', () => { btn.style.background = PANEL_BG; });
  return btn;
}
