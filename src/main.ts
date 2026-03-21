import RAPIER from '@dimforge/rapier3d-compat';
import { Game } from './Game';
import { getValidLevels, type LevelType } from './levels/LevelRegistry';

let game: Game | null = null;

const LEVEL_DISPLAY_NAMES: Record<string, string> = {
  dam: 'Dam',
  facility: 'Facility',
  runway: 'Runway',
  surface1: 'Surface 1',
  bunker1: 'Bunker 1',
  silo: 'Silo',
  frigate: 'Frigate',
  surface2: 'Surface 2',
  bunker2: 'Bunker 2',
  statue: 'Statue',
  archives: 'Archives',
  streets: 'Streets',
  depot: 'Depot',
  train: 'Train',
  jungle: 'Jungle',
  control: 'Control',
  caverns: 'Caverns',
  cradle: 'Cradle',
  aztec: 'Aztec',
  egyptian: 'Egyptian',
  complex: 'Complex',
};

// Mission order for display
const MISSION_ORDER = [
  'dam', 'facility', 'runway', 'surface1', 'bunker1', 'silo', 'frigate',
  'surface2', 'bunker2', 'statue', 'archives', 'streets', 'depot', 'train',
  'jungle', 'control', 'caverns', 'cradle', 'aztec', 'egyptian', 'complex',
];

function showLevelSelect(): void {
  // Hide canvas and game overlay
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  const overlay = document.getElementById('overlay') as HTMLDivElement;
  canvas.style.display = 'none';
  overlay.style.display = 'none';

  const menu = document.createElement('div');
  menu.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: #111; color: #fff; font-family: Arial, sans-serif;
    display: flex; flex-direction: column; align-items: center;
    overflow-y: auto; z-index: 20;
  `;

  const title = document.createElement('h1');
  title.textContent = 'GoldenEye 007';
  title.style.cssText = 'font-size: 2.2rem; margin: 2rem 0 0.5rem; color: #d4af37;';
  menu.appendChild(title);

  const subtitle = document.createElement('p');
  subtitle.textContent = 'Select Mission';
  subtitle.style.cssText = 'font-size: 1rem; opacity: 0.6; margin-bottom: 2rem;';
  menu.appendChild(subtitle);

  const grid = document.createElement('div');
  grid.style.cssText = `
    display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 12px; width: 100%; max-width: 900px; padding: 0 2rem 3rem;
  `;

  for (const slug of MISSION_ORDER) {
    const name = LEVEL_DISPLAY_NAMES[slug] || slug;
    const btn = document.createElement('button');
    btn.textContent = name;
    btn.style.cssText = `
      padding: 1rem; font-size: 1.1rem; font-family: Arial, sans-serif;
      background: #222; color: #fff; border: 1px solid #444;
      cursor: pointer; transition: background 0.15s, border-color 0.15s;
    `;
    btn.addEventListener('mouseenter', () => {
      btn.style.background = '#333';
      btn.style.borderColor = '#d4af37';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = '#222';
      btn.style.borderColor = '#444';
    });
    btn.addEventListener('click', () => {
      window.location.href = `?level=${slug}`;
    });
    grid.appendChild(btn);
  }

  menu.appendChild(grid);
  document.body.appendChild(menu);
}

const params = new URLSearchParams(window.location.search);
const rawLevel = params.get('level');

if (!rawLevel) {
  showLevelSelect();
} else {
  const validLevels = getValidLevels();
  if (!validLevels.includes(rawLevel)) {
    console.warn(`[Game] Unknown level type "${rawLevel}", falling back to procedural`);
  }
  const levelType: LevelType = validLevels.includes(rawLevel)
    ? (rawLevel as LevelType)
    : 'procedural';
  const mode = (params.get('mode') ?? 'gameplay') as 'gameplay' | 'editor' | 'object-replace' | 'weapon-editor';

  async function main(): Promise<void> {
    await RAPIER.init();
    game = new Game(RAPIER, levelType, mode);
    await game.init();
    game.start();
  }

  main().catch((err) => {
    console.error('Failed to start game:', err);
  });
}

// F14: Vite HMR cleanup to prevent leaked instances during development
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    game?.dispose();
    game = null;
  });
}
