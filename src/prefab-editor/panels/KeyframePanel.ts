import type { PrefabPreviewScene } from '../PrefabPreviewScene';
import type { AnimationTrack, AnimationClip, Keyframe } from '../../ecs';

// ── Styles ──────────────────────────────────────────────────────────────────
const PANEL_BG = '#1a1a2e';
const PANEL_BG_LIGHT = '#222240';
const TEXT_COLOR = '#8877cc';
const TEXT_BRIGHT = '#ccbbff';
const ACCENT = '#6655aa';
const BORDER = '#333';
const FONT = '"Courier New", monospace';

const PROPERTIES = [
  'rotation.x', 'rotation.y', 'rotation.z',
  'position.x', 'position.y', 'position.z',
  'scale.x', 'scale.y', 'scale.z',
];

const EASINGS = ['linear', 'ease-in', 'ease-out', 'ease-in-out'];

const TIMELINE_HEIGHT = 30;
const TIMELINE_PADDING = 8;
const DIAMOND_SIZE = 6;

/**
 * Editor panel for KeyframeAnimation components.
 * Provides tracks editing, mini-timeline canvases, clips, and playback controls.
 */
export class KeyframePanel {
  private container: HTMLElement;
  private data: {
    _type: string;
    tracks: AnimationTrack[];
    clips: Record<string, AnimationClip>;
  };
  private meshNames: string[];
  private preview: PrefabPreviewScene;
  private selectedTrack = -1;
  private selectedKeyframe = -1;
  private activeClip = '';

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

    this.data = {
      _type: 'KeyframeAnimation',
      tracks: JSON.parse(JSON.stringify(rawData.tracks || [])),
      clips: JSON.parse(JSON.stringify(rawData.clips || {})),
    };

    // Default active clip
    const clipNames = Object.keys(this.data.clips);
    if (clipNames.length > 0) this.activeClip = clipNames[0];

    this.build();
  }

  getData(): Record<string, unknown> {
    return JSON.parse(JSON.stringify(this.data));
  }

  private build(): void {
    this.container.innerHTML = '';

    // ── Tracks section ──
    const tracksHeader = el('div', `color:${TEXT_BRIGHT};font-size:10px;font-weight:bold;margin-bottom:4px;`);
    tracksHeader.textContent = 'Tracks';
    this.container.appendChild(tracksHeader);

    for (let i = 0; i < this.data.tracks.length; i++) {
      this.addTrackBlock(i);
    }

    const addTrackBtn = makeSmallBtn('+ Track');
    addTrackBtn.addEventListener('click', () => {
      this.data.tracks.push({
        targetMesh: 0,
        property: 'rotation.y',
        keyframes: [{ time: 0, value: 0 }, { time: 1, value: 90 }],
        easing: 'ease-in-out',
      });
      this.onChange?.();
      this.build();
    });
    this.container.appendChild(addTrackBtn);

    // ── Clips section ──
    const clipsHeader = el('div',
      `color:${TEXT_BRIGHT};font-size:10px;font-weight:bold;margin:8px 0 4px 0;`
    );
    clipsHeader.textContent = 'Clips';
    this.container.appendChild(clipsHeader);

    for (const [name, clip] of Object.entries(this.data.clips)) {
      this.addClipBlock(name, clip);
    }

    const addClipBtn = makeSmallBtn('+ Clip');
    addClipBtn.addEventListener('click', () => {
      let name = 'clip';
      let n = 1;
      while (this.data.clips[name]) { name = `clip${n++}`; }
      this.data.clips[name] = { tracks: [0], duration: 0.5 };
      this.onChange?.();
      this.build();
    });
    this.container.appendChild(addClipBtn);

    // ── Playback ──
    const playbackHeader = el('div',
      `color:${TEXT_BRIGHT};font-size:10px;font-weight:bold;margin:8px 0 4px 0;`
    );
    playbackHeader.textContent = 'Preview';
    this.container.appendChild(playbackHeader);

    const playbackRow = el('div', `display:flex;align-items:center;gap:4px;`);

    const clipSelect = makeSelect(Object.keys(this.data.clips), this.activeClip);
    clipSelect.style.width = '70px';
    clipSelect.addEventListener('change', () => {
      this.activeClip = clipSelect.value;
    });
    playbackRow.appendChild(clipSelect);

    const playBtn = makeSmallBtn('\u25B6 Play');
    playBtn.addEventListener('click', () => {
      if (this.activeClip) {
        this.preview.playAnimation(this.activeClip);
      }
    });
    playbackRow.appendChild(playBtn);

    const stopBtn = makeSmallBtn('\u25A0 Stop');
    stopBtn.addEventListener('click', () => {
      this.preview.stopAnimation();
    });
    playbackRow.appendChild(stopBtn);

    this.container.appendChild(playbackRow);

    // Scrubber
    const scrubberRow = el('div', `display:flex;align-items:center;gap:4px;margin-top:4px;`);
    const scrubber = document.createElement('input');
    scrubber.type = 'range';
    scrubber.min = '0';
    scrubber.max = '100';
    scrubber.value = '0';
    scrubber.style.cssText = `flex:1;cursor:pointer;`;
    scrubber.addEventListener('input', () => {
      if (this.activeClip) {
        this.preview.setAnimationProgress(this.activeClip, parseInt(scrubber.value) / 100);
      }
    });
    scrubberRow.appendChild(scrubber);
    this.container.appendChild(scrubberRow);
  }

  private addTrackBlock(index: number): void {
    const track = this.data.tracks[index];
    const block = el('div',
      `border:1px solid ${BORDER};padding:4px;margin-bottom:4px;background:${PANEL_BG};`
    );

    // Header row
    const headerRow = el('div', `display:flex;align-items:center;gap:2px;margin-bottom:3px;`);

    const trackLabel = el('span', `color:${TEXT_COLOR};font-size:9px;`);
    trackLabel.textContent = `[${index}]`;
    headerRow.appendChild(trackLabel);

    // Target mesh
    const meshOptions = [{ label: 'root', value: '-1' }];
    for (let i = 0; i < this.meshNames.length; i++) {
      const name = this.meshNames[i].replace(/\.glb$/i, '').split('/').pop() || `mesh${i}`;
      meshOptions.push({ label: `[${i}] ${name}`, value: String(i) });
    }
    const meshSelect = makeSelect(meshOptions.map(o => o.label), meshOptions.find(o => o.value === String(track.targetMesh))?.label || 'root');
    meshSelect.style.width = '60px';
    meshSelect.style.fontSize = '8px';
    meshSelect.addEventListener('change', () => {
      const opt = meshOptions.find(o => o.label === meshSelect.value);
      track.targetMesh = opt ? parseInt(opt.value) : 0;
      this.onChange?.();
    });
    headerRow.appendChild(meshSelect);

    // Property
    const propSelect = makeSelect(PROPERTIES, track.property);
    propSelect.style.width = '65px';
    propSelect.style.fontSize = '8px';
    propSelect.addEventListener('change', () => {
      track.property = propSelect.value;
      this.onChange?.();
    });
    headerRow.appendChild(propSelect);

    // Easing
    const easingSelect = makeSelect(EASINGS, track.easing);
    easingSelect.style.width = '55px';
    easingSelect.style.fontSize = '8px';
    easingSelect.addEventListener('change', () => {
      track.easing = easingSelect.value as AnimationTrack['easing'];
      this.onChange?.();
    });
    headerRow.appendChild(easingSelect);

    // Delete track
    const delBtn = el('span', `color:#cc4444;cursor:pointer;font-size:14px;margin-left:auto;`);
    delBtn.textContent = '\u00d7';
    delBtn.addEventListener('click', () => {
      this.data.tracks.splice(index, 1);
      // Update clip track indices
      for (const clip of Object.values(this.data.clips)) {
        clip.tracks = clip.tracks
          .map(t => t > index ? t - 1 : t)
          .filter(t => t !== index);
      }
      this.onChange?.();
      this.build();
    });
    headerRow.appendChild(delBtn);

    block.appendChild(headerRow);

    // Timeline canvas
    const timeline = this.createTimeline(track, index);
    block.appendChild(timeline);

    // Keyframe value inputs
    const kfContainer = el('div', `margin-top:2px;`);
    for (let k = 0; k < track.keyframes.length; k++) {
      const kf = track.keyframes[k];
      const kfRow = el('div', `display:flex;align-items:center;gap:2px;margin-bottom:1px;`);

      const timeInput = makeInput('number', String(kf.time));
      timeInput.style.width = '40px';
      timeInput.style.fontSize = '9px';
      timeInput.min = '0';
      timeInput.max = '1';
      timeInput.step = '0.01';
      timeInput.title = 'Time (0-1)';
      timeInput.addEventListener('change', () => {
        kf.time = Math.max(0, Math.min(1, parseFloat(timeInput.value) || 0));
        this.onChange?.();
        this.build();
      });
      kfRow.appendChild(timeInput);

      const valInput = makeInput('number', String(kf.value));
      valInput.style.width = '50px';
      valInput.style.fontSize = '9px';
      valInput.step = '1';
      valInput.title = 'Value';
      valInput.addEventListener('change', () => {
        kf.value = parseFloat(valInput.value) || 0;
        this.onChange?.();
        this.build();
      });
      kfRow.appendChild(valInput);

      // Delete keyframe
      if (track.keyframes.length > 1) {
        const delKf = el('span', `color:#cc4444;cursor:pointer;font-size:12px;`);
        delKf.textContent = '\u00d7';
        delKf.addEventListener('click', () => {
          track.keyframes.splice(k, 1);
          this.onChange?.();
          this.build();
        });
        kfRow.appendChild(delKf);
      }

      kfContainer.appendChild(kfRow);
    }

    // Add keyframe
    const addKfBtn = makeSmallBtn('+ Keyframe');
    addKfBtn.style.fontSize = '8px';
    addKfBtn.addEventListener('click', () => {
      // Insert at midpoint
      const last = track.keyframes[track.keyframes.length - 1];
      track.keyframes.push({ time: Math.min(1, (last?.time ?? 0) + 0.5), value: last?.value ?? 0 });
      track.keyframes.sort((a, b) => a.time - b.time);
      this.onChange?.();
      this.build();
    });
    kfContainer.appendChild(addKfBtn);

    block.appendChild(kfContainer);
    this.container.appendChild(block);
  }

  private createTimeline(track: AnimationTrack, _trackIndex: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const width = 240;
    canvas.width = width;
    canvas.height = TIMELINE_HEIGHT;
    canvas.style.cssText = `width:${width}px;height:${TIMELINE_HEIGHT}px;cursor:pointer;`;

    const draw = () => {
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, width, TIMELINE_HEIGHT);

      // Background
      ctx.fillStyle = '#111122';
      ctx.fillRect(0, 0, width, TIMELINE_HEIGHT);

      // Track line
      const lineY = TIMELINE_HEIGHT / 2;
      ctx.strokeStyle = '#333355';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(TIMELINE_PADDING, lineY);
      ctx.lineTo(width - TIMELINE_PADDING, lineY);
      ctx.stroke();

      // Keyframe diamonds
      for (let i = 0; i < track.keyframes.length; i++) {
        const kf = track.keyframes[i];
        const x = TIMELINE_PADDING + kf.time * (width - 2 * TIMELINE_PADDING);
        const selected = this.selectedTrack === _trackIndex && this.selectedKeyframe === i;

        ctx.fillStyle = selected ? '#ff4488' : ACCENT;
        ctx.beginPath();
        ctx.moveTo(x, lineY - DIAMOND_SIZE);
        ctx.lineTo(x + DIAMOND_SIZE, lineY);
        ctx.lineTo(x, lineY + DIAMOND_SIZE);
        ctx.lineTo(x - DIAMOND_SIZE, lineY);
        ctx.closePath();
        ctx.fill();
      }
    };

    draw();

    // Click to select keyframe
    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const usableWidth = width - 2 * TIMELINE_PADDING;

      for (let i = 0; i < track.keyframes.length; i++) {
        const kfX = TIMELINE_PADDING + track.keyframes[i].time * usableWidth;
        if (Math.abs(x - kfX) < DIAMOND_SIZE + 2) {
          this.selectedTrack = _trackIndex;
          this.selectedKeyframe = i;
          draw();
          return;
        }
      }
    });

    return canvas;
  }

  private addClipBlock(name: string, clip: AnimationClip): void {
    const block = el('div',
      `border:1px solid ${BORDER};padding:4px;margin-bottom:4px;background:${PANEL_BG};`
    );

    // Name row
    const nameRow = el('div', `display:flex;align-items:center;gap:4px;margin-bottom:2px;`);
    const nameInput = makeInput('text', name);
    nameInput.style.width = '80px';
    nameInput.addEventListener('change', () => {
      const newName = nameInput.value.trim();
      if (!newName || newName === name) return;
      if (this.data.clips[newName]) return; // duplicate
      this.data.clips[newName] = clip;
      delete this.data.clips[name];
      if (this.activeClip === name) this.activeClip = newName;
      this.onChange?.();
      this.build();
    });
    nameRow.appendChild(nameInput);

    // Duration
    const durLabel = el('span', `color:${TEXT_COLOR};font-size:9px;`);
    durLabel.textContent = 'dur:';
    nameRow.appendChild(durLabel);
    const durInput = makeInput('number', String(clip.duration));
    durInput.style.width = '40px';
    durInput.step = '0.1';
    durInput.addEventListener('change', () => {
      clip.duration = Math.max(0.01, parseFloat(durInput.value) || 0.5);
      this.onChange?.();
    });
    nameRow.appendChild(durInput);

    // Delete clip
    const delBtn = el('span', `color:#cc4444;cursor:pointer;font-size:14px;margin-left:auto;`);
    delBtn.textContent = '\u00d7';
    delBtn.addEventListener('click', () => {
      delete this.data.clips[name];
      this.onChange?.();
      this.build();
    });
    nameRow.appendChild(delBtn);

    block.appendChild(nameRow);

    // Tracks checkboxes
    const tracksRow = el('div', `display:flex;align-items:center;gap:4px;flex-wrap:wrap;`);
    const tracksLabel = el('span', `color:${TEXT_COLOR};font-size:9px;`);
    tracksLabel.textContent = 'tracks:';
    tracksRow.appendChild(tracksLabel);

    for (let i = 0; i < this.data.tracks.length; i++) {
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = clip.tracks.includes(i);
      cb.addEventListener('change', () => {
        if (cb.checked) {
          if (!clip.tracks.includes(i)) clip.tracks.push(i);
        } else {
          clip.tracks = clip.tracks.filter(t => t !== i);
        }
        this.onChange?.();
      });
      const cbLabel = el('span', `color:${TEXT_COLOR};font-size:9px;`);
      cbLabel.textContent = String(i);
      tracksRow.appendChild(cb);
      tracksRow.appendChild(cbLabel);
    }
    block.appendChild(tracksRow);

    // Reverse checkbox
    const revRow = el('div', `display:flex;align-items:center;gap:4px;margin-top:2px;`);
    const revCb = document.createElement('input');
    revCb.type = 'checkbox';
    revCb.checked = clip.reverse ?? false;
    revCb.addEventListener('change', () => {
      clip.reverse = revCb.checked || undefined;
      this.onChange?.();
    });
    revRow.appendChild(revCb);
    const revLabel = el('span', `color:${TEXT_COLOR};font-size:9px;`);
    revLabel.textContent = 'reverse';
    revRow.appendChild(revLabel);
    block.appendChild(revRow);

    this.container.appendChild(block);
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
