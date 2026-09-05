import * as THREE from 'three';
import { EventBus } from './core/events.js';
import { Input } from './core/input.js';
import { createRenderEnvironment } from './core/renderer.js';
import { createMaterials } from './world/materials.js';
import { World } from './world/world.js';
import { Player } from './gameplay/player.js';
import { Weapon } from './gameplay/weapon.js';
import { EnemyManager } from './gameplay/enemies.js';
import { Effects } from './gameplay/effects.js';
import { Pickups } from './gameplay/pickups.js';
import { AudioManager } from './audio/audio.js';
import { Session } from './game/session.js';
import { HUD } from './ui/hud.js';

const canvas = document.getElementById('game');
const events = new EventBus();
const environment = createRenderEnvironment(canvas);
const input = new Input(canvas, events);
const materials = createMaterials();
const world = new World(environment.scene, materials);
const audio = new AudioManager(events);
const player = new Player({ camera: environment.camera, input, world, events });
const enemies = new EnemyManager({ scene: environment.scene, world, materials, events, player });
const weapon = new Weapon({
  camera: environment.camera,
  input,
  player,
  events,
  materials,
  resolveShot: (raycaster, damage, headMultiplier) => enemies.resolveShot(raycaster, damage, headMultiplier)
});
const effects = new Effects(environment.scene, events);
const pickups = new Pickups({ scene: environment.scene, materials, events, player, weapon });
const session = new Session({ events, player, weapon, enemies, pickups });
const hud = new HUD({ events, player, weapon, session });
const clock = new THREE.Clock();

function initialMenu() {
  hud.showOverlay({
    title: 'Gun FPS Test',
    copy: 'A modular true-3D WebGL training FPS. <b>WASD</b> move, <b>Shift</b> sprint, <b>Ctrl</b> crouch/slide, <b>Space</b> jump, <b>RMB</b> aim, <b>LMB</b> fire, <b>R</b> reload.',
    button: 'ENTER TRAINING YARD'
  });
}

hud.onStart(async () => {
  audio.start();
  if (!session.running || session.gameOver) session.startFresh();
  await input.requestLock();
});

events.on('input:pointerlock', ({ locked }) => {
  if (locked) {
    hud.hideOverlay();
  } else if (session.running && !session.gameOver) {
    hud.showOverlay({
      title: 'Paused',
      copy: 'Training is paused. Your current wave and score are preserved.',
      button: 'RESUME'
    });
  }
});

events.on('session:gameover', ({ score, wave, kills }) => {
  document.exitPointerLock?.();
  hud.showOverlay({
    title: 'Run complete',
    copy: `Score <b>${score}</b> · Wave <b>${wave}</b> · Targets <b>${kills}</b><br><br>Restart for a fresh run.`,
    button: 'RESTART'
  });
});

initialMenu();

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  const active = session.running && input.pointerLocked && player.alive;

  if (active) {
    player.update(dt);
    weapon.update(dt);
    enemies.update(dt);
    pickups.update(dt);
    session.update(dt);
  }

  effects.update(dt);
  hud.update(dt);
  environment.render();
}

frame();
