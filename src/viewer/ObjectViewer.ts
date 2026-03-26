import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { renameFile, saveToProject, isDevServer } from '../utils/editorApi';

export async function launchObjectViewer(basePath: string): Promise<void> {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  const overlay = document.getElementById('overlay') as HTMLDivElement;
  overlay.style.display = 'none';

  // Renderer
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(0x1a1a2e);

  // Scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);

  // Camera
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.001, 100);
  camera.position.set(1, 0.8, 1.5);

  // Controls
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;

  // Axes helper
  const axes = new THREE.AxesHelper(0.5);
  scene.add(axes);

  // Grid helper
  const grid = new THREE.GridHelper(2, 20, 0x444466, 0x333355);
  scene.add(grid);

  // Lighting
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(2, 3, 1);
  scene.add(dirLight);

  // Resize handler
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Detect group mode: check for groups.json
  let groups: string[] | null = null;
  let currentGroupIdx = 0;
  let currentBasePath = basePath;

  try {
    const resp = await fetch(`/${basePath}/groups.json`);
    if (resp.ok) {
      groups = await resp.json();
    }
  } catch {
    // Not a group folder, that's fine
  }

  // Load manifest for current path
  async function loadManifest(folderPath: string): Promise<string[]> {
    try {
      const resp = await fetch(`/${folderPath}/manifest.json`);
      return await resp.json();
    } catch {
      console.error(`Failed to load manifest from /${folderPath}/manifest.json`);
      return [];
    }
  }

  // UI
  const ui = document.createElement('div');
  ui.style.cssText = `
    position: fixed; top: 12px; left: 12px; z-index: 10;
    font-family: monospace; font-size: 13px; color: #fff;
    display: flex; flex-direction: column; gap: 8px;
  `;

  const title = document.createElement('div');
  title.style.cssText = 'font-size: 15px; font-weight: bold; color: #d4af37;';
  ui.appendChild(title);

  // "View in Level" link — extract level slug from basePath (e.g. "models/objects/frigate" → "frigate")
  const levelSlug = basePath.split('/').pop() || '';
  if (levelSlug) {
    const levelLink = document.createElement('a');
    levelLink.textContent = 'View in Level →';
    levelLink.href = `?mode=level-viewer&level=${levelSlug}`;
    levelLink.style.cssText = `
      color: #88aaff; font-size: 12px; text-decoration: none;
      font-family: monospace;
    `;
    levelLink.addEventListener('mouseenter', () => { levelLink.style.color = '#bbddff'; });
    levelLink.addEventListener('mouseleave', () => { levelLink.style.color = '#88aaff'; });
    ui.appendChild(levelLink);
  }

  // Group navigation (only shown when groups exist)
  const groupNav = document.createElement('div');
  groupNav.style.cssText = 'display: flex; align-items: center; gap: 8px;';

  const btnStyle = `
    padding: 4px 12px; font-family: monospace; font-size: 13px;
    background: #333; color: #fff; border: 1px solid #555;
    cursor: pointer;
  `;

  const prevBtn = document.createElement('button');
  prevBtn.textContent = 'Prev';
  prevBtn.style.cssText = btnStyle;

  const groupLabel = document.createElement('span');
  groupLabel.style.cssText = 'color: #ccc;';

  const nextBtn = document.createElement('button');
  nextBtn.textContent = 'Next';
  nextBtn.style.cssText = btnStyle;

  groupNav.appendChild(prevBtn);
  groupNav.appendChild(groupLabel);
  groupNav.appendChild(nextBtn);
  ui.appendChild(groupNav);

  if (!groups) {
    groupNav.style.display = 'none';
  }

  // Select row: dropdown + rename button (or rename input + confirm/cancel)
  const selectRow = document.createElement('div');
  selectRow.style.cssText = 'display: flex; align-items: center; gap: 6px;';

  const select = document.createElement('select');
  select.style.cssText = `
    padding: 6px 8px; font-family: monospace; font-size: 13px;
    background: #222; color: #fff; border: 1px solid #555;
    max-width: 300px; flex: 1;
  `;
  selectRow.appendChild(select);

  // Rename UI elements (dev-only)
  const renameBtn = document.createElement('button');
  renameBtn.textContent = 'Rename';
  renameBtn.style.cssText = btnStyle;

  const renameInput = document.createElement('input');
  renameInput.type = 'text';
  renameInput.style.cssText = `
    padding: 6px 8px; font-family: monospace; font-size: 13px;
    background: #222; color: #fff; border: 1px solid #d4af37;
    flex: 1; display: none;
  `;

  const extLabel = document.createElement('span');
  extLabel.textContent = '.glb';
  extLabel.style.cssText = 'color: #888; display: none;';

  const confirmBtn = document.createElement('button');
  confirmBtn.textContent = '✓';
  confirmBtn.style.cssText = btnStyle + ' display: none; color: #4f4;';

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = '✗';
  cancelBtn.style.cssText = btnStyle + ' display: none; color: #f44;';

  if (isDevServer()) {
    selectRow.appendChild(renameBtn);
    selectRow.appendChild(renameInput);
    selectRow.appendChild(extLabel);
    selectRow.appendChild(confirmBtn);
    selectRow.appendChild(cancelBtn);
  }

  ui.appendChild(selectRow);

  const info = document.createElement('div');
  info.style.cssText = 'color: #aaa; font-size: 11px;';
  ui.appendChild(info);

  document.body.appendChild(ui);

  // Model management
  const loader = new GLTFLoader();
  let currentModel: THREE.Group | null = null;
  let currentFiles: string[] = [];
  let currentRenames: Record<string, string> = {};

  // Rename mode helpers
  function enterRenameMode(): void {
    const currentName = select.value;
    if (!currentName) return;
    renameInput.value = currentName.replace(/\.glb$/i, '');
    select.style.display = 'none';
    renameBtn.style.display = 'none';
    renameInput.style.display = '';
    extLabel.style.display = '';
    confirmBtn.style.display = '';
    cancelBtn.style.display = '';
    renameInput.focus();
    renameInput.select();
  }

  function exitRenameMode(): void {
    select.style.display = '';
    renameBtn.style.display = '';
    renameInput.style.display = 'none';
    extLabel.style.display = 'none';
    confirmBtn.style.display = 'none';
    cancelBtn.style.display = 'none';
  }

  async function confirmRename(): Promise<void> {
    const rawName = renameInput.value.trim();
    if (!rawName || rawName.includes('/') || rawName.includes('\\')) {
      info.textContent = 'Invalid name';
      return;
    }
    let newFilename = rawName + '.glb';
    const oldFilename = select.value;

    // Auto-index if name already taken by a different file
    if (newFilename !== oldFilename && currentFiles.includes(newFilename)) {
      let i = 1;
      while (currentFiles.includes(`${rawName}_${i}.glb`)) i++;
      newFilename = `${rawName}_${i}.glb`;
    }

    if (newFilename === oldFilename) {
      exitRenameMode();
      return;
    }

    const oldPath = `${currentBasePath}/${oldFilename}`;
    const newPath = `${currentBasePath}/${newFilename}`;

    info.textContent = 'Renaming...';
    const result = await renameFile(oldPath, newPath);
    if (!result.ok) {
      info.textContent = `Rename failed: ${result.error}`;
      return;
    }

    // Update manifest
    const idx = currentFiles.indexOf(oldFilename);
    if (idx !== -1) currentFiles[idx] = newFilename;
    const manifestPath = `${currentBasePath}/manifest.json`;
    await saveToProject(manifestPath, JSON.stringify(currentFiles, null, 2));

    // Update renames mapping (always chain back to the original name)
    const originalName = currentRenames[oldFilename] || oldFilename;
    delete currentRenames[oldFilename];
    currentRenames[newFilename] = originalName;
    await saveToProject(`${currentBasePath}/renames.json`, JSON.stringify(currentRenames, null, 2));

    // Update dropdown option in place
    const opt = select.options[select.selectedIndex];
    opt.value = newFilename;
    opt.textContent = newFilename;

    info.textContent = `Renamed → ${newFilename}`;
    exitRenameMode();
  }

  renameBtn.addEventListener('click', enterRenameMode);
  cancelBtn.addEventListener('click', exitRenameMode);
  confirmBtn.addEventListener('click', confirmRename);
  renameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); confirmRename(); }
    if (e.key === 'Escape') { e.preventDefault(); exitRenameMode(); }
  });

  async function loadModel(filename: string): Promise<void> {
    if (currentModel) {
      scene.remove(currentModel);
      currentModel.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m: THREE.Material) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
      currentModel = null;
    }

    const url = `/${currentBasePath}/${filename}`;
    try {
      const gltf = await loader.loadAsync(url);
      currentModel = gltf.scene;
      scene.add(currentModel);

      // Compute bounding box and fit camera
      const box = new THREE.Box3().setFromObject(currentModel);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());

      controls.target.copy(center);

      const maxDim = Math.max(size.x, size.y, size.z);
      const dist = maxDim * 2.5;
      camera.position.set(center.x + dist * 0.6, center.y + dist * 0.4, center.z + dist * 0.6);
      controls.update();

      axes.scale.setScalar(Math.max(maxDim * 0.5, 0.1));

      info.textContent = `Size: ${size.x.toFixed(3)} x ${size.y.toFixed(3)} x ${size.z.toFixed(3)}`;
    } catch (err) {
      console.error(`Failed to load ${url}:`, err);
      info.textContent = `Error loading ${filename}`;
    }
  }

  async function showFolder(folderPath: string, files: string[]): Promise<void> {
    currentBasePath = folderPath;
    currentFiles = files;

    // Load renames mapping
    try {
      const resp = await fetch(`/${folderPath}/renames.json`);
      currentRenames = resp.ok ? await resp.json() : {};
    } catch {
      currentRenames = {};
    }

    // Update title
    title.textContent = `Object Viewer — ${folderPath}`;

    // Update dropdown
    select.innerHTML = '';
    for (const file of files) {
      const opt = document.createElement('option');
      opt.value = file;
      opt.textContent = file;
      select.appendChild(opt);
    }

    // Load first model
    if (files.length > 0) {
      await loadModel(files[0]);
    }
  }

  async function navigateToGroup(idx: number): Promise<void> {
    if (!groups || idx < 0 || idx >= groups.length) return;
    currentGroupIdx = idx;
    const groupFolder = `${basePath}/${groups[idx]}`;
    const files = await loadManifest(groupFolder);

    groupLabel.textContent = `Group ${idx + 1} / ${groups.length} (${files.length} objects)`;
    prevBtn.style.opacity = idx === 0 ? '0.4' : '1';
    nextBtn.style.opacity = idx === groups.length - 1 ? '0.4' : '1';

    await showFolder(groupFolder, files);
  }

  select.addEventListener('change', () => {
    loadModel(select.value);
  });

  prevBtn.addEventListener('click', () => {
    if (currentGroupIdx > 0) navigateToGroup(currentGroupIdx - 1);
  });

  nextBtn.addEventListener('click', () => {
    if (groups && currentGroupIdx < groups.length - 1) navigateToGroup(currentGroupIdx + 1);
  });

  // Keyboard navigation for groups
  window.addEventListener('keydown', (e) => {
    if (!groups) return;
    if (e.key === 'ArrowLeft' || e.key === '[') {
      if (currentGroupIdx > 0) navigateToGroup(currentGroupIdx - 1);
    } else if (e.key === 'ArrowRight' || e.key === ']') {
      if (currentGroupIdx < groups.length - 1) navigateToGroup(currentGroupIdx + 1);
    }
  });

  // Initialize
  if (groups && groups.length > 0) {
    await navigateToGroup(0);
  } else {
    const files = await loadManifest(basePath);
    title.textContent = `Object Viewer — ${basePath}`;
    await showFolder(basePath, files);
  }

  // Render loop
  function animate(): void {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();
}
