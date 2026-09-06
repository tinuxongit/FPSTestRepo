import { AshfallGame } from './game.js';

const canvas = document.getElementById('game');
try {
  const game = new AshfallGame(canvas);
  window.__ashfall = game;
  window.__ashfallPlayer = game.player;
} catch (error) {
  console.error(error);
  const panel = document.getElementById('boot-error');
  document.getElementById('boot-error-text').textContent = `${error?.stack || error}`;
  panel.hidden = false;
  panel.classList.add('show');
}
