import * as THREE from 'three';
import { detectDecalMesh, DEFAULT_DECAL_PARAMS } from './DecalFixer';
import type { DecalDetectParams } from './DecalFixer';

// ── Styling constants (match EditorUI) ─────────────────────────────
const PANEL_BG = '#1a1a2e';
const TEXT_COLOR = '#8877cc';
const TEXT_BRIGHT = '#ccbbff';
const FONT = '"Courier New", monospace';

const COLOR_AUTO = 0xff00ff;     // magenta — auto-detected
const COLOR_MANUAL = 0x00ffff;   // cyan — manually tagged
const COLOR_EXCLUDED = 0xff0000; // red — excluded auto-detection
const COLOR_HOVER = 0x00ff00;    // green — hover highlight

const OVERLAY_PREFIX = '__decalTag';

export class DecalTaggingMode {
  private _active = false;

  // Detection state
  private autoDetectedNames = new Set<string>();
  private manualIncludes = new Set<string>();
  private manualExcludes = new Set<string>();

  // Overlays keyed by mesh name
  private overlays = new Map<string, THREE.Mesh>();
  private hoverOverlay: THREE.Mesh | null = null;
  private hoveredMeshName = '';

  // Picking
  private raycaster = new THREE.Raycaster();
  private mouseNDC = new THREE.Vector2();

  // Detection params (editor-tunable)
  private params: DecalDetectParams = { ...DEFAULT_DECAL_PARAMS };

  // UI
  private infoPanel: HTMLElement | null = null;
  private tooltip: HTMLElement | null = null;

  // Bound handlers (for removal)
  private _onClick: (e: MouseEvent) => void;
  private _onMouseMove: (e: MouseEvent) => void;

  constructor(
    private scene: THREE.Scene,
    private camera: THREE.PerspectiveCamera,
    private canvas: HTMLElement,
    private levelType: string
  ) {
    this._onClick = this.onClick.bind(this);
    this._onMouseMove = this.onMouseMove.bind(this);
  }

  get active(): boolean {
    return this._active;
  }

  // ── Enter / Exit ──────────────────────────────────────────────────

  enter(): void {
    if (this._active) return;
    this._active = true;

    this.rescan();

    // Load saved overrides from localStorage
    this.loadFromStorage();

    // Create overlays for all categorised meshes
    this.rebuildOverlays();

    // Attach event listeners
    this.canvas.addEventListener('click', this._onClick);
    this.canvas.addEventListener('mousemove', this._onMouseMove);

    // Create UI
    this.createInfoPanel();
    this.createTooltip();

    console.log(`[DecalTag] Entered — ${this.autoDetectedNames.size} auto-detected, ${this.manualIncludes.size} manual includes, ${this.manualExcludes.size} excludes`);
  }

  exit(): void {
    if (!this._active) return;
    this._active = false;

    // Remove overlays
    this.clearOverlays();
    this.removeHoverOverlay();

    // Detach listeners
    this.canvas.removeEventListener('click', this._onClick);
    this.canvas.removeEventListener('mousemove', this._onMouseMove);

    // Remove UI
    this.infoPanel?.remove();
    this.infoPanel = null;
    this.tooltip?.remove();
    this.tooltip = null;

    console.log('[DecalTag] Exited');
  }

  toggle(): void {
    if (this._active) this.exit();
    else this.enter();
  }

  /** Re-scan scene with current params and rebuild overlays. */
  rescan(): void {
    this.autoDetectedNames.clear();
    this.scene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      if (obj.name.startsWith(OVERLAY_PREFIX)) return;
      if (detectDecalMesh(obj, this.params)) {
        this.autoDetectedNames.add(obj.name);
      }
    });
    this.rebuildOverlays();
    this.updateInfoPanel();
    console.log(`[DecalTag] Rescan — ${this.autoDetectedNames.size} auto-detected (maxVerts=${this.params.maxVertices}, flatness=${this.params.flatnessRatio}, maxSize=${this.params.maxSize})`);
  }

  // ── Click: tag / untag ────────────────────────────────────────────

  private onClick(e: MouseEvent): void {
    const mesh = this.pickMesh(e);
    if (!mesh || !mesh.name) return;

    const name = mesh.name;

    if (this.autoDetectedNames.has(name)) {
      // Toggle exclude on auto-detected mesh
      if (this.manualExcludes.has(name)) {
        this.manualExcludes.delete(name);
      } else {
        this.manualExcludes.add(name);
      }
    } else {
      // Toggle manual include on non-detected mesh
      if (this.manualIncludes.has(name)) {
        this.manualIncludes.delete(name);
      } else {
        this.manualIncludes.add(name);
      }
    }

    this.saveToStorage();
    this.rebuildOverlays();
    this.updateInfoPanel();
  }

  // ── Hover highlight ───────────────────────────────────────────────

  private onMouseMove(e: MouseEvent): void {
    this.updateMouseNDC(e);
    this.raycaster.setFromCamera(this.mouseNDC, this.camera);

    const meshes = this.getSceneMeshes();
    const hits = this.raycaster.intersectObjects(meshes, false);

    const hit = this.preferSmallest(hits);
    if (hit) {
      if (hit.name !== this.hoveredMeshName) {
        this.removeHoverOverlay();
        this.hoveredMeshName = hit.name;
        this.hoverOverlay = this.createWireframe(hit, COLOR_HOVER, 1.0);
        hit.add(this.hoverOverlay);
      }
      this.showTooltip(e.clientX, e.clientY, hit.name);
    } else {
      this.removeHoverOverlay();
      this.hoveredMeshName = '';
      this.hideTooltip();
    }
  }

  // ── Export ─────────────────────────────────────────────────────────

  exportOverrides(): void {
    const data = {
      version: 1,
      levelType: this.levelType,
      include: [...this.manualIncludes].sort(),
      exclude: [...this.manualExcludes].sort(),
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `level-${this.levelType}-decals.json`;
    a.click();
    URL.revokeObjectURL(url);

    // Also copy to clipboard
    navigator.clipboard.writeText(json).catch(() => {});
    console.log(`[DecalTag] Exported ${this.manualIncludes.size} includes, ${this.manualExcludes.size} excludes`);
  }

  // ── Overlay management ────────────────────────────────────────────

  private rebuildOverlays(): void {
    this.clearOverlays();

    this.scene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      if (obj.name.startsWith(OVERLAY_PREFIX)) return;
      const name = obj.name;
      if (!name) return;

      let color: number | null = null;
      let opacity = 0.8;

      if (this.manualIncludes.has(name)) {
        color = COLOR_MANUAL;
      } else if (this.manualExcludes.has(name)) {
        color = COLOR_EXCLUDED;
        opacity = 0.3;
      } else if (this.autoDetectedNames.has(name)) {
        color = COLOR_AUTO;
      }

      if (color !== null) {
        const overlay = this.createWireframe(obj, color, opacity);
        obj.add(overlay);
        this.overlays.set(name, overlay);
      }
    });
  }

  private clearOverlays(): void {
    for (const overlay of this.overlays.values()) {
      overlay.parent?.remove(overlay);
      overlay.geometry.dispose();
      (overlay.material as THREE.Material).dispose();
    }
    this.overlays.clear();
  }

  private createWireframe(source: THREE.Mesh, color: number, opacity: number): THREE.Mesh {
    const geo = source.geometry.clone();
    const mat = new THREE.MeshBasicMaterial({
      color,
      wireframe: true,
      depthTest: false,
      transparent: true,
      opacity,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 999;
    mesh.name = OVERLAY_PREFIX;
    return mesh;
  }

  private removeHoverOverlay(): void {
    if (this.hoverOverlay) {
      this.hoverOverlay.parent?.remove(this.hoverOverlay);
      this.hoverOverlay.geometry.dispose();
      (this.hoverOverlay.material as THREE.Material).dispose();
      this.hoverOverlay = null;
    }
  }

  // ── Raycasting ────────────────────────────────────────────────────

  private pickMesh(e: MouseEvent): THREE.Mesh | null {
    this.updateMouseNDC(e);
    this.raycaster.setFromCamera(this.mouseNDC, this.camera);
    const hits = this.raycaster.intersectObjects(this.getSceneMeshes(), false);
    return this.preferSmallest(hits);
  }

  /**
   * From a set of raycast hits, pick the smallest mesh among those at
   * roughly the same depth. Decals sit on walls so both get hit at nearly
   * the same distance — choosing fewest vertices selects the decal.
   */
  private preferSmallest(hits: THREE.Intersection[]): THREE.Mesh | null {
    if (hits.length === 0) return null;
    const DEPTH_TOLERANCE = 0.5;
    const nearest = hits[0].distance;
    let best: THREE.Mesh = hits[0].object as THREE.Mesh;
    let bestVerts = this.vertexCount(best);
    for (let i = 1; i < hits.length; i++) {
      if (hits[i].distance - nearest > DEPTH_TOLERANCE) break;
      const mesh = hits[i].object as THREE.Mesh;
      const verts = this.vertexCount(mesh);
      if (verts < bestVerts) {
        best = mesh;
        bestVerts = verts;
      }
    }
    return best;
  }

  private vertexCount(mesh: THREE.Mesh): number {
    const pos = mesh.geometry?.getAttribute('position') as THREE.BufferAttribute | null;
    return pos ? pos.count : Infinity;
  }

  private getSceneMeshes(): THREE.Mesh[] {
    const meshes: THREE.Mesh[] = [];
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && !obj.name.startsWith(OVERLAY_PREFIX)) {
        meshes.push(obj);
      }
    });
    return meshes;
  }

  private updateMouseNDC(e: MouseEvent): void {
    this.mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }

  // ── localStorage persistence ──────────────────────────────────────

  private get storageKey(): string {
    return `decal-overrides-${this.levelType}`;
  }

  private saveToStorage(): void {
    const data = {
      include: [...this.manualIncludes],
      exclude: [...this.manualExcludes],
    };
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return;
      const data = JSON.parse(raw);
      this.manualIncludes = new Set(data.include ?? []);
      this.manualExcludes = new Set(data.exclude ?? []);
    } catch { /* ignore corrupt data */ }
  }

  // ── Info panel UI ─────────────────────────────────────────────────

  private createInfoPanel(): void {
    const panel = document.createElement('div');
    panel.style.cssText =
      `position:fixed;top:10px;right:10px;width:240px;padding:12px;` +
      `background:${PANEL_BG};color:${TEXT_COLOR};font-family:${FONT};font-size:11px;` +
      `border:1px solid #333;border-radius:4px;z-index:300;line-height:1.6;`;
    this.infoPanel = panel;
    document.body.appendChild(panel);
    this.updateInfoPanel();
  }

  private updateInfoPanel(): void {
    if (!this.infoPanel) return;
    const effectiveCount = this.autoDetectedNames.size - this.manualExcludes.size + this.manualIncludes.size;

    const inputStyle =
      `width:100%;background:#111;color:${TEXT_BRIGHT};border:1px solid #444;` +
      `padding:2px 4px;font-family:${FONT};font-size:10px;border-radius:2px;`;
    const labelStyle = `display:flex;justify-content:space-between;align-items:center;margin-top:6px;`;
    const btnStyle =
      `flex:1;padding:6px;border:none;cursor:pointer;` +
      `font-family:${FONT};font-size:10px;font-weight:bold;border-radius:2px;`;

    this.infoPanel.innerHTML =
      `<div style="color:${TEXT_BRIGHT};font-size:13px;font-weight:bold;margin-bottom:8px">DECAL TAGGING MODE</div>` +
      `<div>Auto-detected: <span style="color:#ff00ff">${this.autoDetectedNames.size}</span></div>` +
      `<div>Manual includes: <span style="color:#00ffff">${this.manualIncludes.size}</span></div>` +
      `<div>Excludes: <span style="color:#ff4444">${this.manualExcludes.size}</span></div>` +
      `<div style="margin-top:4px">Effective total: <span style="color:${TEXT_BRIGHT}">${effectiveCount}</span></div>` +
      `<div style="margin-top:10px;font-size:10px;color:#666">` +
        `<span style="color:#ff00ff">■</span> auto &nbsp; ` +
        `<span style="color:#00ffff">■</span> manual &nbsp; ` +
        `<span style="color:#ff4444">■</span> excluded</div>` +
      // ── Tuning sliders ──
      `<div style="margin-top:12px;border-top:1px solid #333;padding-top:8px;font-size:10px">` +
        `<div style="color:${TEXT_BRIGHT};font-weight:bold;margin-bottom:4px">DETECTION PARAMS</div>` +
        `<div style="${labelStyle}"><span>Max Vertices</span><span id="__dt_verts_val">${this.params.maxVertices}</span></div>` +
        `<input id="__dt_verts" type="range" min="4" max="512" step="1" value="${this.params.maxVertices}" style="${inputStyle}">` +
        `<div style="${labelStyle}"><span>Flatness Ratio</span><span id="__dt_flat_val">${this.params.flatnessRatio.toFixed(2)}</span></div>` +
        `<input id="__dt_flat" type="range" min="0.01" max="0.5" step="0.01" value="${this.params.flatnessRatio}" style="${inputStyle}">` +
        `<div style="${labelStyle}"><span>Max Size</span><span id="__dt_size_val">${this.params.maxSize.toFixed(1)}</span></div>` +
        `<input id="__dt_size" type="range" min="0.1" max="500" step="0.5" value="${this.params.maxSize}" style="${inputStyle}">` +
      `</div>` +
      // ── Buttons ──
      `<div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap"></div>`;

    // Wire up slider live-update labels
    const wireSlider = (id: string, valId: string, fmt: (v: number) => string, setter: (v: number) => void) => {
      const input = this.infoPanel!.querySelector(`#${id}`) as HTMLInputElement;
      const valEl = this.infoPanel!.querySelector(`#${valId}`)!;
      if (input) {
        input.oninput = () => {
          const v = parseFloat(input.value);
          valEl.textContent = fmt(v);
          setter(v);
        };
      }
    };
    wireSlider('__dt_verts', '__dt_verts_val', (v) => String(v), (v) => { this.params.maxVertices = v; });
    wireSlider('__dt_flat', '__dt_flat_val', (v) => v.toFixed(2), (v) => { this.params.flatnessRatio = v; });
    wireSlider('__dt_size', '__dt_size_val', (v) => v.toFixed(1), (v) => { this.params.maxSize = v; });

    // Buttons
    const btnRow = this.infoPanel.querySelector('div:last-child')!;

    const rescanBtn = document.createElement('button');
    rescanBtn.textContent = 'RESCAN';
    rescanBtn.style.cssText = `${btnStyle}background:#8866cc;color:#fff;`;
    rescanBtn.onclick = () => this.rescan();
    btnRow.appendChild(rescanBtn);

    const exportBtn = document.createElement('button');
    exportBtn.textContent = 'EXPORT';
    exportBtn.style.cssText = `${btnStyle}background:#00aaaa;color:#000;`;
    exportBtn.onclick = () => this.exportOverrides();
    btnRow.appendChild(exportBtn);

    const exitBtn = document.createElement('button');
    exitBtn.textContent = 'EXIT';
    exitBtn.style.cssText = `${btnStyle}background:#aa4444;color:#fff;`;
    exitBtn.onclick = () => this.exit();
    btnRow.appendChild(exitBtn);
  }

  // ── Tooltip ───────────────────────────────────────────────────────

  private createTooltip(): void {
    const tip = document.createElement('div');
    tip.style.cssText =
      `position:fixed;padding:4px 8px;background:#000c;color:#fff;` +
      `font-family:${FONT};font-size:10px;pointer-events:none;` +
      `z-index:400;border-radius:2px;display:none;white-space:nowrap;`;
    this.tooltip = tip;
    document.body.appendChild(tip);
  }

  private showTooltip(x: number, y: number, name: string): void {
    if (!this.tooltip) return;
    let label = name;
    if (this.manualIncludes.has(name)) label += ' [manual]';
    else if (this.manualExcludes.has(name)) label += ' [excluded]';
    else if (this.autoDetectedNames.has(name)) label += ' [auto]';
    this.tooltip.textContent = label;
    this.tooltip.style.left = `${x + 14}px`;
    this.tooltip.style.top = `${y + 14}px`;
    this.tooltip.style.display = 'block';
  }

  private hideTooltip(): void {
    if (this.tooltip) this.tooltip.style.display = 'none';
  }
}
