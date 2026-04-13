import { PrefabCatalog, createDefaultRegistry } from '../ecs';
import type { PrefabsFile } from '../ecs';
import { PrefabPreviewScene } from './PrefabPreviewScene';
import { PrefabEditorUI } from './PrefabEditorUI';

/**
 * Entry point for the Prefab Editor mode (?mode=prefab-editor).
 * Sets up the 3D preview scene, loads the prefab catalog, and builds the sidebar UI.
 */
export async function launchPrefabEditor(): Promise<void> {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  const overlay = document.getElementById('overlay') as HTMLDivElement;
  overlay.style.display = 'none';

  // Push canvas to the right to make room for the sidebar
  canvas.style.position = 'fixed';
  canvas.style.left = '280px';
  canvas.style.top = '0';
  canvas.style.width = `${window.innerWidth - 280}px`;
  canvas.style.height = '100vh';

  window.addEventListener('resize', () => {
    canvas.style.width = `${window.innerWidth - 280}px`;
  });

  // ── Load prefab catalog ──
  const registry = createDefaultRegistry();
  const catalog = new PrefabCatalog();

  try {
    const resp = await fetch('/data/prefabs.json');
    const data: PrefabsFile = await resp.json();
    catalog.loadFromJSON(data);
    console.log(`[PrefabEditor] Loaded ${catalog.size} prefabs`);
  } catch (err) {
    console.error('[PrefabEditor] Failed to load prefabs.json:', err);
  }

  // ── 3D Preview ──
  const preview = new PrefabPreviewScene(canvas);
  preview.setCatalog(catalog);

  // ── UI ──
  new PrefabEditorUI(catalog, registry, preview);
}
