import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { LEVELS } from '../levels/LevelRegistry';
import { FreeFlyCamera } from '../editor/FreeFlyCamera';
import { InputManager } from '../core/InputManager';
import { renameFile, saveToProject, isDevServer } from '../utils/editorApi';
import {
  ECSWorld, createDefaultRegistry, MeshSystem,
  deserializeWorld, serializeWorld,
} from '../ecs';
import type { TransformComponent, MeshComponent, PrefabComponent, EntityId } from '../ecs';

// ── Step constants (matching PlacementSystem) ────────────────────────────────
const POSITION_STEPS = [0.001, 0.005, 0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.0];
const ROTATION_STEPS = [0.1, 0.5, 1, 5, 10, 15, 30, 45, 90]; // degrees
const SCALE_STEPS = [0.001, 0.005, 0.01, 0.05, 0.1, 0.25, 0.5, 1.0];
const DEFAULT_POS_IDX = 5;   // 0.25
const DEFAULT_ROT_IDX = 5;   // 15°
const DEFAULT_SCALE_IDX = 4; // 0.1
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

function round4(n: number): number { return Math.round(n * 10000) / 10000; }

export async function launchLevelViewer(levelSlug: string): Promise<void> {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  const overlay = document.getElementById('overlay') as HTMLDivElement;
  overlay.style.display = 'none';

  // ── Level config ─────────────────────────────────────────────────────
  const config = LEVELS[levelSlug];
  if (!config || config.type !== 'glb' || !config.modelPath) {
    document.body.innerHTML = `<div style="color:#fff;font-family:monospace;padding:2rem;">
      Unknown or non-GLB level: "${levelSlug}"</div>`;
    return;
  }

  // ── Renderer ─────────────────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(0x1a1a2e);

  // ── Scene ────────────────────────────────────────────────────────────
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);

  // ── Camera ───────────────────────────────────────────────────────────
  const camera = new THREE.PerspectiveCamera(
    60, window.innerWidth / window.innerHeight, 0.01, 1000
  );

  // ── Lighting ─────────────────────────────────────────────────────────
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(2, 3, 1);
  scene.add(dirLight);

  // ── Resize ───────────────────────────────────────────────────────────
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // ── Controls ─────────────────────────────────────────────────────────
  const input = new InputManager(canvas);
  const flyCamera = new FreeFlyCamera(camera, canvas, input);

  // ── ECS ──────────────────────────────────────────────────────────────
  const objectsPoolPath = '/models/objects';
  const levelDataPath = `/data/levels/${levelSlug}`;
  const registry = createDefaultRegistry();
  const ecsWorld = new ECSWorld();
  const meshSystem = new MeshSystem(scene, objectsPoolPath);
  ecsWorld.addSystem(meshSystem);

  // ── Transform controls ─────────────────────────────────────────────
  type TransformMode = 'translate' | 'rotate' | 'scale';
  let transformMode: TransformMode = 'translate';
  let gizmoDragging = false;
  const scaleAtDragStart = new THREE.Vector3(1, 1, 1);
  const UNIFORM_SCALE_DAMPEN = 0.3;

  let posStepIdx = DEFAULT_POS_IDX;
  let rotStepIdx = DEFAULT_ROT_IDX;
  let scaleStepIdx = DEFAULT_SCALE_IDX;

  const transformControls = new TransformControls(camera, canvas);
  transformControls.setMode('translate');
  transformControls.setSize(0.8);
  scene.add(transformControls.getHelper());

  function currentStep(): number {
    switch (transformMode) {
      case 'translate': return POSITION_STEPS[posStepIdx];
      case 'rotate': return ROTATION_STEPS[rotStepIdx];
      case 'scale': return SCALE_STEPS[scaleStepIdx];
    }
  }

  function updateGizmoSnap(): void {
    transformControls.setTranslationSnap(POSITION_STEPS[posStepIdx]);
    transformControls.setRotationSnap(ROTATION_STEPS[rotStepIdx] * DEG2RAD);
    transformControls.setScaleSnap(SCALE_STEPS[scaleStepIdx]);
  }
  updateGizmoSnap();

  function setTransformMode(mode: TransformMode): void {
    transformMode = mode;
    transformControls.setMode(mode);
    updateGizmoSnap();
    updateTransformUI();
  }

  function cycleStep(dir: 1 | -1): void {
    switch (transformMode) {
      case 'translate':
        posStepIdx = Math.max(0, Math.min(POSITION_STEPS.length - 1, posStepIdx + dir));
        break;
      case 'rotate':
        rotStepIdx = Math.max(0, Math.min(ROTATION_STEPS.length - 1, rotStepIdx + dir));
        break;
      case 'scale':
        scaleStepIdx = Math.max(0, Math.min(SCALE_STEPS.length - 1, scaleStepIdx + dir));
        break;
    }
    updateGizmoSnap();
    updateTransformUI();
  }

  // ── Selection state ──────────────────────────────────────────────────
  let selectedEntityId: EntityId | null = null;
  let selectionHelper: THREE.BoxHelper | null = null;
  const raycaster = new THREE.Raycaster();
  const mouseNDC = new THREE.Vector2();

  // ── Search state ─────────────────────────────────────────────────────
  const searchHighlights = new Set<THREE.BoxHelper>();

  /** Sync a THREE.Group's transform back to the entity's TransformComponent */
  function syncGroupToComponent(entityId: EntityId): void {
    const group = meshSystem.getGroup(entityId, ecsWorld);
    const transform = ecsWorld.getComponent(entityId, 'Transform') as TransformComponent | undefined;
    if (!group || !transform) return;
    transform.position = [round4(group.position.x), round4(group.position.y), round4(group.position.z)];
    transform.rotation = [
      round4(group.rotation.x * RAD2DEG),
      round4(group.rotation.y * RAD2DEG),
      round4(group.rotation.z * RAD2DEG),
    ];
    transform.scale = [round4(group.scale.x), round4(group.scale.y), round4(group.scale.z)];
  }

  // Gizmo events
  transformControls.addEventListener('dragging-changed', (e: any) => {
    gizmoDragging = e.value;
    if (e.value && transformMode === 'scale' && selectedEntityId) {
      const group = meshSystem.getGroup(selectedEntityId, ecsWorld);
      if (group) scaleAtDragStart.copy(group.scale);
    }
  });

  transformControls.addEventListener('objectChange', () => {
    if (!selectedEntityId) return;

    // Dampen uniform scaling
    if (transformMode === 'scale') {
      const group = meshSystem.getGroup(selectedEntityId, ecsWorld);
      if (group) {
        const scl = group.scale;
        const start = scaleAtDragStart;
        const dx = scl.x - start.x, dy = scl.y - start.y, dz = scl.z - start.z;
        const isUniform = Math.abs(dx - dy) < 0.001 && Math.abs(dy - dz) < 0.001;
        if (isUniform && Math.abs(dx) > 0.001) {
          scl.set(
            start.x + dx * UNIFORM_SCALE_DAMPEN,
            start.y + dy * UNIFORM_SCALE_DAMPEN,
            start.z + dz * UNIFORM_SCALE_DAMPEN
          );
        }
      }
    }

    // Sync THREE.Group → TransformComponent
    syncGroupToComponent(selectedEntityId);
    markDirty();
  });

  // ── Dirty / save state ─────────────────────────────────────────────
  let placementsDirty = false;
  let saveTimeout: ReturnType<typeof setTimeout> | null = null;

  function markDirty(): void {
    placementsDirty = true;
    updateSaveStatus();
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => savePlacements(), 500);
  }

  // Scroll to adjust speed (Alt+scroll for step cycling)
  let flySpeed = 4;
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (e.altKey && selectedEntityId) {
      const dir: 1 | -1 = e.deltaY < 0 ? 1 : -1;
      cycleStep(dir);
      return;
    }
    flySpeed *= e.deltaY < 0 ? 1.2 : 0.833;
    flySpeed = Math.max(0.5, Math.min(100, flySpeed));
    speedLabel.textContent = `Speed: ${flySpeed.toFixed(1)}`;
  }, { passive: false });

  // ── UI ───────────────────────────────────────────────────────────────
  const btnStyle = `
    padding: 4px 12px; font-family: monospace; font-size: 13px;
    background: #333; color: #fff; border: 1px solid #555;
    cursor: pointer; pointer-events: auto;
  `;

  const ui = document.createElement('div');
  ui.style.cssText = `
    position: fixed; top: 12px; left: 12px; z-index: 10;
    font-family: monospace; font-size: 13px; color: #fff;
    display: flex; flex-direction: column; gap: 6px;
    pointer-events: none;
  `;

  const title = document.createElement('div');
  title.style.cssText = 'font-size: 15px; font-weight: bold; color: #d4af37;';
  title.textContent = `Level Viewer — ${levelSlug}`;
  ui.appendChild(title);

  const statusLabel = document.createElement('div');
  statusLabel.style.cssText = 'color: #aaa;';
  statusLabel.textContent = 'Loading level...';
  ui.appendChild(statusLabel);

  // ── Search bar ───────────────────────────────────────────────────────
  const searchRow = document.createElement('div');
  searchRow.style.cssText = 'display: flex; align-items: center; gap: 6px; pointer-events: auto;';

  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Search objects...';
  searchInput.style.cssText = `
    padding: 5px 8px; font-family: monospace; font-size: 13px;
    background: #222; color: #fff; border: 1px solid #555;
    width: 200px; pointer-events: auto;
  `;
  searchRow.appendChild(searchInput);

  const searchCount = document.createElement('span');
  searchCount.style.cssText = 'color: #4f4; font-size: 11px;';
  searchRow.appendChild(searchCount);

  ui.appendChild(searchRow);

  // ── Selection UI ─────────────────────────────────────────────────────
  const selectionRow = document.createElement('div');
  selectionRow.style.cssText = 'display: flex; align-items: center; gap: 6px; pointer-events: auto; display: none;';

  const selectionLabel = document.createElement('span');
  selectionLabel.style.cssText = 'color: #00ffff; font-size: 13px; max-width: 250px; overflow: hidden; text-overflow: ellipsis;';
  selectionRow.appendChild(selectionLabel);

  ui.appendChild(selectionRow);

  // ── Rename UI (dev-only) ─────────────────────────────────────────────
  const renameRow = document.createElement('div');
  renameRow.style.cssText = 'display: flex; align-items: center; gap: 6px; pointer-events: auto; display: none;';

  const renameBtn = document.createElement('button');
  renameBtn.textContent = 'Rename';
  renameBtn.style.cssText = btnStyle;

  const renameInput = document.createElement('input');
  renameInput.type = 'text';
  renameInput.style.cssText = `
    padding: 5px 8px; font-family: monospace; font-size: 13px;
    background: #222; color: #fff; border: 1px solid #d4af37;
    width: 180px; display: none; pointer-events: auto;
  `;

  const extLabel = document.createElement('span');
  extLabel.textContent = '.glb';
  extLabel.style.cssText = 'color: #888; display: none;';

  const confirmBtn = document.createElement('button');
  confirmBtn.textContent = '\u2713';
  confirmBtn.style.cssText = btnStyle + ' display: none; color: #4f4;';

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = '\u2717';
  cancelBtn.style.cssText = btnStyle + ' display: none; color: #f44;';

  renameRow.appendChild(renameBtn);
  renameRow.appendChild(renameInput);
  renameRow.appendChild(extLabel);
  renameRow.appendChild(confirmBtn);
  renameRow.appendChild(cancelBtn);

  if (isDevServer()) {
    ui.appendChild(renameRow);
  }

  // ── Transform UI (dev-only) ────────────────────────────────────────
  const transformRow = document.createElement('div');
  transformRow.style.cssText = 'display: flex; align-items: center; gap: 4px; pointer-events: auto; display: none;';

  const modeBtnStyle = (active: boolean) => `
    padding: 3px 8px; font-family: monospace; font-size: 11px;
    background: ${active ? '#555' : '#222'}; color: ${active ? '#fff' : '#888'};
    border: 1px solid ${active ? '#d4af37' : '#444'};
    cursor: pointer; pointer-events: auto;
  `;

  const moveModeBtn = document.createElement('button');
  moveModeBtn.textContent = 'Q Move';
  moveModeBtn.style.cssText = modeBtnStyle(true);

  const rotateModeBtn = document.createElement('button');
  rotateModeBtn.textContent = 'R Rotate';
  rotateModeBtn.style.cssText = modeBtnStyle(false);

  const scaleModeBtn = document.createElement('button');
  scaleModeBtn.textContent = 'F Scale';
  scaleModeBtn.style.cssText = modeBtnStyle(false);

  const stepLabel = document.createElement('span');
  stepLabel.style.cssText = 'color: #aaa; font-size: 11px; margin-left: 6px;';
  stepLabel.textContent = `Step: ${currentStep()}`;

  transformRow.appendChild(moveModeBtn);
  transformRow.appendChild(rotateModeBtn);
  transformRow.appendChild(scaleModeBtn);
  transformRow.appendChild(stepLabel);

  if (isDevServer()) {
    ui.appendChild(transformRow);
  }

  // ── Save status (dev-only) ─────────────────────────────────────────
  const saveStatusLabel = document.createElement('div');
  saveStatusLabel.style.cssText = 'color: #4f4; font-size: 11px; display: none;';
  if (isDevServer()) {
    ui.appendChild(saveStatusLabel);
  }

  function updateTransformUI(): void {
    moveModeBtn.style.cssText = modeBtnStyle(transformMode === 'translate');
    rotateModeBtn.style.cssText = modeBtnStyle(transformMode === 'rotate');
    scaleModeBtn.style.cssText = modeBtnStyle(transformMode === 'scale');
    const unit = transformMode === 'rotate' ? '°' : '';
    stepLabel.textContent = `Step: ${currentStep()}${unit}`;
  }

  function updateSaveStatus(): void {
    if (!isDevServer()) return;
    if (placementsDirty) {
      saveStatusLabel.style.display = '';
      saveStatusLabel.style.color = '#ff8';
      saveStatusLabel.textContent = 'Unsaved changes...';
    }
  }

  // Mode button click handlers
  moveModeBtn.addEventListener('click', () => setTransformMode('translate'));
  rotateModeBtn.addEventListener('click', () => setTransformMode('rotate'));
  scaleModeBtn.addEventListener('click', () => setTransformMode('scale'));

  const infoLabel = document.createElement('div');
  infoLabel.style.cssText = 'color: #aaa; font-size: 11px;';
  ui.appendChild(infoLabel);

  const speedLabel = document.createElement('div');
  speedLabel.style.cssText = 'color: #888; font-size: 11px;';
  speedLabel.textContent = `Speed: ${flySpeed.toFixed(1)}`;
  ui.appendChild(speedLabel);

  const controlsLabel = document.createElement('div');
  controlsLabel.style.cssText = 'color: #666; font-size: 11px; margin-top: 4px;';
  controlsLabel.textContent = isDevServer()
    ? 'RMB+drag look | WASD move | Space/Shift up/down | Scroll=speed | Q/R/F=transform | Alt+Scroll=step | Del=delete'
    : 'Right-click + drag to look | WASD move | Space/Shift up/down | Scroll = speed';
  ui.appendChild(controlsLabel);

  document.body.appendChild(ui);

  // ── Progress bar ─────────────────────────────────────────────────────
  const progressBar = document.createElement('div');
  progressBar.style.cssText = `
    position: fixed; bottom: 0; left: 0; height: 3px;
    background: #d4af37; width: 0%; z-index: 10;
    transition: width 0.1s;
  `;
  document.body.appendChild(progressBar);

  // ── Rename logic ─────────────────────────────────────────────────────
  // Renames mapping loaded alongside placements
  let renames: Record<string, string> = {};
  let manifest: string[] = [];

  function getSelectedMeshFile(): string | null {
    if (!selectedEntityId) return null;
    const mesh = ecsWorld.getComponent(selectedEntityId, 'Mesh') as MeshComponent | undefined;
    return mesh?.meshPaths[0] ?? null;
  }

  function enterRenameMode(): void {
    const meshFile = getSelectedMeshFile();
    if (!meshFile) return;
    renameInput.value = meshFile.replace(/\.glb$/i, '');
    renameBtn.style.display = 'none';
    renameInput.style.display = '';
    extLabel.style.display = '';
    confirmBtn.style.display = '';
    cancelBtn.style.display = '';
    renameInput.focus();
    renameInput.select();
  }

  function exitRenameMode(): void {
    renameBtn.style.display = '';
    renameInput.style.display = 'none';
    extLabel.style.display = 'none';
    confirmBtn.style.display = 'none';
    cancelBtn.style.display = 'none';
  }

  async function confirmRenameAction(): Promise<void> {
    const meshFile = getSelectedMeshFile();
    if (!selectedEntityId || !meshFile) return;
    const rawName = renameInput.value.trim();
    if (!rawName || rawName.includes('/') || rawName.includes('\\')) {
      infoLabel.textContent = 'Invalid name';
      return;
    }
    let newFilename = rawName + '.glb';
    const oldFilename = meshFile;

    // Auto-index if name already taken by a different file
    if (newFilename !== oldFilename && manifest.includes(newFilename)) {
      let i = 1;
      while (manifest.includes(`${rawName}_${i}.glb`)) i++;
      newFilename = `${rawName}_${i}.glb`;
    }

    if (newFilename === oldFilename) {
      exitRenameMode();
      return;
    }

    const oldPath = `${objectsPoolPath}/${oldFilename}`;
    const newPath = `${objectsPoolPath}/${newFilename}`;

    infoLabel.textContent = 'Renaming...';
    const result = await renameFile(oldPath, newPath);
    if (!result.ok) {
      infoLabel.textContent = `Rename failed: ${result.error}`;
      return;
    }

    // Update manifest
    const idx = manifest.indexOf(oldFilename);
    if (idx !== -1) manifest[idx] = newFilename;
    await saveToProject(`${objectsPoolPath}/manifest.json`, JSON.stringify(manifest, null, 2));

    // Update renames mapping (chain back to original name)
    const originalName = renames[oldFilename] || oldFilename;
    delete renames[oldFilename];
    renames[newFilename] = originalName;
    await saveToProject(`${levelDataPath}/renames.json`, JSON.stringify(renames, null, 2));

    // Update mesh path in all entities that reference this file
    for (const id of ecsWorld.getAllEntityIds()) {
      const mesh = ecsWorld.getComponent(id, 'Mesh') as MeshComponent | undefined;
      if (mesh) {
        mesh.meshPaths = mesh.meshPaths.map(p => p === oldFilename ? newFilename : p);
      }
    }

    selectionLabel.textContent = `${selectedEntityId} (${newFilename})`;
    infoLabel.textContent = `Renamed → ${newFilename}`;
    exitRenameMode();
    markDirty();

    // Refresh search highlights if active
    updateSearchHighlights();
  }

  renameBtn.addEventListener('click', enterRenameMode);
  cancelBtn.addEventListener('click', exitRenameMode);
  confirmBtn.addEventListener('click', confirmRenameAction);
  renameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); confirmRenameAction(); }
    else if (e.key === 'Escape') { e.preventDefault(); exitRenameMode(); }
    e.stopPropagation();
  });

  // ── Selection logic ──────────────────────────────────────────────────
  function findEntityForMesh(mesh: THREE.Object3D): EntityId | null {
    let current: THREE.Object3D | null = mesh;
    while (current) {
      if (current.parent === scene && ecsWorld.getEntity(current.name)) {
        return current.name;
      }
      current = current.parent;
    }
    return null;
  }

  function selectObject(entityId: EntityId | null): void {
    // Clear old selection helper
    if (selectionHelper) {
      scene.remove(selectionHelper);
      selectionHelper.dispose();
      selectionHelper = null;
    }

    selectedEntityId = entityId;
    exitRenameMode();

    if (entityId) {
      const group = meshSystem.getGroup(entityId, ecsWorld);
      if (group) {
        selectionHelper = new THREE.BoxHelper(group, 0x00ffff);
        scene.add(selectionHelper);
        transformControls.attach(group);
      }
      const prefab = ecsWorld.getComponent(entityId, 'Prefab') as PrefabComponent | undefined;
      const typeStr = prefab?.prefabType ?? 'mesh';
      selectionLabel.textContent = `${entityId} (${typeStr})`;
      selectionRow.style.display = 'flex';
      renameRow.style.display = isDevServer() ? 'flex' : 'none';
      transformRow.style.display = isDevServer() ? 'flex' : 'none';
    } else {
      transformControls.detach();
      selectionLabel.textContent = '';
      selectionRow.style.display = 'none';
      renameRow.style.display = 'none';
      transformRow.style.display = 'none';
      infoLabel.textContent = '';
    }
  }

  canvas.addEventListener('click', (e) => {
    // Don't select while looking around or dragging gizmo
    if (flyCamera.isLooking) return;
    if (gizmoDragging) return;
    if (e.button !== 0) return;

    const rect = canvas.getBoundingClientRect();
    mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouseNDC, camera);

    // Collect meshes from ECS entities only (not level geometry)
    const meshes: THREE.Mesh[] = [];
    for (const id of ecsWorld.getAllEntityIds()) {
      const group = meshSystem.getGroup(id, ecsWorld);
      if (group) {
        group.traverse((child) => {
          if (child instanceof THREE.Mesh) meshes.push(child);
        });
      }
    }

    const hits = raycaster.intersectObjects(meshes, false);
    if (hits.length > 0) {
      const entityId = findEntityForMesh(hits[0].object);
      if (entityId) {
        selectObject(entityId);
        return;
      }
    }
    selectObject(null);
  });

  // ── Keyboard shortcuts ─────────────────────────────────────────────
  function isInputFocused(): boolean {
    const active = document.activeElement;
    return active === searchInput || active === renameInput;
  }

  document.addEventListener('keydown', (e) => {
    if (isInputFocused()) return;

    // Delete selected entity
    if ((e.code === 'Delete' || e.code === 'Backspace') && selectedEntityId && isDevServer()) {
      const id = selectedEntityId;
      selectObject(null);
      ecsWorld.removeEntity(id);
      markDirty();
      infoLabel.textContent = `Deleted ${id}`;
      return;
    }

    // Transform mode switching (only when object selected)
    if (selectedEntityId && isDevServer()) {
      if (e.code === 'KeyQ') { setTransformMode('translate'); return; }
      if (e.code === 'KeyR') { setTransformMode('rotate'); return; }
      if (e.code === 'KeyF') { setTransformMode('scale'); return; }

      // Bracket rotation
      if (e.code === 'BracketRight' || e.code === 'BracketLeft') {
        const group = meshSystem.getGroup(selectedEntityId, ecsWorld);
        if (group) {
          const step = ROTATION_STEPS[rotStepIdx] * DEG2RAD;
          const delta = e.code === 'BracketRight' ? step : -step;
          group.rotation.y += delta;
          syncGroupToComponent(selectedEntityId);
          if (selectionHelper) selectionHelper.update();
          markDirty();
        }
        return;
      }

      // Arrow key nudging
      const group = meshSystem.getGroup(selectedEntityId, ecsWorld);
      if (group) {
        const step = POSITION_STEPS[posStepIdx];
        let nudged = false;
        if (e.code === 'ArrowRight') { group.position.x += step; nudged = true; }
        if (e.code === 'ArrowLeft') { group.position.x -= step; nudged = true; }
        if (e.code === 'ArrowUp') { group.position.z -= step; nudged = true; }
        if (e.code === 'ArrowDown') { group.position.z += step; nudged = true; }
        if (e.code === 'PageUp') { group.position.y += step; nudged = true; }
        if (e.code === 'PageDown') { group.position.y -= step; nudged = true; }
        if (nudged) {
          syncGroupToComponent(selectedEntityId);
          if (selectionHelper) selectionHelper.update();
          markDirty();
          return;
        }
      }
    }

    // Escape to deselect
    if (e.code === 'Escape' && selectedEntityId) {
      selectObject(null);
    }
  });

  // ── Search logic ─────────────────────────────────────────────────────
  function clearSearchHighlights(): void {
    for (const helper of searchHighlights) {
      scene.remove(helper);
      helper.dispose();
    }
    searchHighlights.clear();
    searchCount.textContent = '';
  }

  function updateSearchHighlights(): void {
    clearSearchHighlights();
    const query = searchInput.value.trim().toLowerCase();
    if (!query) return;

    let count = 0;
    for (const id of ecsWorld.getAllEntityIds()) {
      const prefab = ecsWorld.getComponent(id, 'Prefab') as PrefabComponent | undefined;
      const matchTarget = `${id} ${prefab?.prefabType || ''}`.toLowerCase();
      if (matchTarget.includes(query)) {
        const group = meshSystem.getGroup(id, ecsWorld);
        if (group) {
          const helper = new THREE.BoxHelper(group, 0x00ff00);
          helper.renderOrder = 999;
          helper.material.depthTest = false;
          (helper.material as THREE.Material).transparent = true;
          scene.add(helper);
          searchHighlights.add(helper);
          count++;
        }
      }
    }
    searchCount.textContent = count > 0 ? `${count} match${count !== 1 ? 'es' : ''}` : 'no matches';
  }

  searchInput.addEventListener('input', updateSearchHighlights);
  // Prevent WASD from moving camera while typing in search
  searchInput.addEventListener('keydown', (e) => e.stopPropagation());

  // ── Load level geometry ──────────────────────────────────────────────
  const loader = new GLTFLoader();
  let levelGroup: THREE.Group | null = null;

  try {
    const gltf = await loader.loadAsync(config.modelPath);
    levelGroup = gltf.scene;

    // Strip PBR for flat N64 look
    levelGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material as THREE.MeshStandardMaterial;
        if (mat.isMeshStandardMaterial) {
          mat.roughness = 1.0;
          mat.metalness = 0;
          mat.normalMap = null;
          mat.aoMap = null;
          mat.envMap = null;
        }
      }
    });

    scene.add(levelGroup);
    statusLabel.textContent = 'Level loaded. Loading objects...';
  } catch (err) {
    statusLabel.textContent = `Failed to load level: ${err}`;
    console.error('Level load error:', err);
    startRenderLoop();
    return;
  }

  // ── Position camera at level center ──────────────────────────────────
  levelGroup.updateMatrixWorld(true);
  const levelBox = new THREE.Box3().setFromObject(levelGroup);
  const levelCenter = levelBox.getCenter(new THREE.Vector3());
  const levelSize = levelBox.getSize(new THREE.Vector3());
  const maxExtent = Math.max(levelSize.x, levelSize.y, levelSize.z);

  if (config.spawn.x !== 0 || config.spawn.y !== 0 || config.spawn.z !== 0) {
    flyCamera.setPosition(config.spawn.x, config.spawn.y, config.spawn.z);
  } else {
    flyCamera.setPosition(levelCenter.x, levelCenter.y + maxExtent * 0.3, levelCenter.z);
  }

  flySpeed = Math.max(1, maxExtent * 0.1);
  speedLabel.textContent = `Speed: ${flySpeed.toFixed(1)}`;

  // ── Load placement data via ECS ────────────────────────────────────
  try {
    const [placementsResp, renamesResp, manifestResp] = await Promise.all([
      fetch(`${levelDataPath}/placements.json`),
      fetch(`${levelDataPath}/renames.json`),
      fetch(`${objectsPoolPath}/manifest.json`),
    ]);

    if (!placementsResp.ok) {
      statusLabel.textContent = 'No placements.json found.';
      startRenderLoop();
      return;
    }

    const data = await placementsResp.json();
    renames = renamesResp.ok ? await renamesResp.json() : {};
    manifest = manifestResp.ok ? await manifestResp.json() : [];

    // Deserialize into ECS world — MeshSystem will load GLBs via onEntityAdded
    deserializeWorld(data, ecsWorld, registry);

    // Wait for all meshes to finish loading
    // MeshSystem.onEntityAdded is async — we need to wait for all entities
    const entityIds = ecsWorld.getAllEntityIds();
    const totalEntities = entityIds.length;

    // Poll for loaded meshes to show progress
    const checkInterval = setInterval(() => {
      let loaded = 0;
      for (const id of entityIds) {
        const mesh = ecsWorld.getComponent(id, 'Mesh') as MeshComponent | undefined;
        if (mesh?._group) loaded++;
      }
      const pct = totalEntities > 0 ? (loaded / totalEntities) * 100 : 100;
      progressBar.style.width = `${pct}%`;
      statusLabel.textContent = `Loading objects: ${loaded}/${totalEntities}...`;
      if (loaded >= totalEntities) {
        clearInterval(checkInterval);
        progressBar.style.width = '100%';
        setTimeout(() => { progressBar.style.display = 'none'; }, 500);
        statusLabel.textContent = `${totalEntities} objects placed`;
      }
    }, 100);
  } catch (err) {
    statusLabel.textContent = `Failed to load placement data: ${err}`;
    startRenderLoop();
    return;
  }

  // ── Save placements back to disk ─────────────────────────────────────
  async function savePlacements(): Promise<void> {
    if (!isDevServer() || !placementsDirty) return;

    const saveData = JSON.stringify(serializeWorld(ecsWorld), null, 2);

    try {
      await saveToProject(`${levelDataPath}/placements.json`, saveData);
      placementsDirty = false;
      saveStatusLabel.style.display = '';
      saveStatusLabel.style.color = '#4f4';
      saveStatusLabel.textContent = 'Saved \u2713';
      setTimeout(() => { saveStatusLabel.style.display = 'none'; }, 2000);
    } catch (err) {
      saveStatusLabel.style.display = '';
      saveStatusLabel.style.color = '#f44';
      saveStatusLabel.textContent = `Save failed: ${err}`;
    }
  }

  // ── Render loop ──────────────────────────────────────────────────────
  startRenderLoop();

  function startRenderLoop(): void {
    let lastTime = performance.now();
    function animate(): void {
      requestAnimationFrame(animate);
      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      (flyCamera as unknown as { _speed: number })._speed = flySpeed;
      flyCamera.update(dt);

      // Update helpers
      if (selectionHelper) selectionHelper.update();
      for (const h of searchHighlights) h.update();

      renderer.render(scene, camera);
    }
    animate();
  }
}
