import { TUNING } from '../config.js';

export class Session {
  constructor({ events, player, weapon, enemies, pickups }) {
    this.events = events;
    this.player = player;
    this.weapon = weapon;
    this.enemies = enemies;
    this.pickups = pickups;
    this.running = false;
    this.gameOver = false;
    this.wave = 1;
    this.score = 0;
    this.kills = 0;
    this.transitionTimer = 0;
    this.transitioning = false;

    events.on('enemy:killed', data => {
      if (!this.running) return;
      this.kills += 1;
      this.score += data.headshot ? 160 : 100;
      this.events.emit('session:score', { score: this.score, kills: this.kills, headshot: data.headshot });
    });

    events.on('player:dead', () => {
      if (!this.running) return;
      this.running = false;
      this.gameOver = true;
      this.events.emit('session:gameover', { score: this.score, wave: this.wave, kills: this.kills });
    });
  }

  startFresh() {
    this.wave = 1;
    this.score = 0;
    this.kills = 0;
    this.transitionTimer = 0;
    this.transitioning = false;
    this.running = true;
    this.gameOver = false;
    this.player.reset();
    this.weapon.reset();
    this.pickups.clear();
    this.enemies.spawnWave(this.wave);
    this.events.emit('session:start', { wave: this.wave });
  }

  update(dt) {
    if (!this.running) return;

    if (!this.transitioning && this.enemies.aliveCount === 0) {
      this.transitioning = true;
      this.transitionTimer = TUNING.waves.transitionSeconds;
      this.events.emit('wave:cleared', { wave: this.wave });
    }

    if (this.transitioning) {
      this.transitionTimer -= dt;
      if (this.transitionTimer <= 0) {
        this.transitioning = false;
        this.wave += 1;
        this.player.heal(TUNING.waves.healBetweenWaves);
        this.weapon.addReserve(TUNING.waves.ammoBetweenWaves);
        this.enemies.spawnWave(this.wave);
      }
    }
  }
}
