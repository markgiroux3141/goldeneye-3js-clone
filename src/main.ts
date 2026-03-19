import RAPIER from '@dimforge/rapier3d-compat';
import { Game } from './Game';
import { getValidLevels, type LevelType } from './levels/LevelRegistry';

let game: Game | null = null;

const params = new URLSearchParams(window.location.search);
const validLevels = getValidLevels();
const rawLevel = params.get('level') ?? 'procedural';
if (!validLevels.includes(rawLevel)) {
  console.warn(`[Game] Unknown level type "${rawLevel}", falling back to procedural`);
}
const levelType: LevelType = validLevels.includes(rawLevel)
  ? (rawLevel as LevelType)
  : 'procedural';
const mode = (params.get('mode') ?? 'gameplay') as 'gameplay' | 'editor' | 'object-replace';

async function main(): Promise<void> {
  await RAPIER.init();
  game = new Game(RAPIER, levelType, mode);
  await game.init();
  game.start();
}

main().catch((err) => {
  console.error('Failed to start game:', err);
});

// F14: Vite HMR cleanup to prevent leaked instances during development
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    game?.dispose();
    game = null;
  });
}
