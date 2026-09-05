import { TUNING, VERSION } from '../config.js';

export class HUD {
  constructor({ events, player, weapon, session }) {
    this.events = events;
    this.player = player;
    this.weapon = weapon;
    this.session = session;
    this.damageFlash = 0;
    this.messageTimer = 0;
    this.killFeed = [];
    this.startHandler = null;

    this.health = document.getElementById('health');
    this.healthFill = document.getElementById('health-fill');
    this.ammo = document.getElementById('ammo');
    this.reserve = document.getElementById('reserve');
    this.score = document.getElementById('score');
    this.wave = document.getElementById('wave');
    this.weaponState = document.getElementById('weapon-state');
    this.message = document.getElementById('message');
    this.reticle = document.getElementById('reticle');
    this.hitmarker = document.getElementById('hitmarker');
    this.damageVignette = document.getElementById('damage-vignette');
    this.killFeedEl = document.getElementById('kill-feed');
    this.overlay = document.getElementById('overlay');
    this.overlayTitle = document.getElementById('overlay-title');
    this.overlayCopy = document.getElementById('overlay-copy');
    this.startButton = document.getElementById('start-button');
    this.version = document.getElementById('version');
    this.version.textContent = VERSION;

    this.startButton.addEventListener('click', () => this.startHandler?.());

    events.on('combat:hit', data => this.showHitmarker(data.headshot));
    events.on('player:damage', () => { this.damageFlash = 1; });
    events.on('weapon:empty', () => this.showMessage('EMPTY — RELOADING', 0.8));
    events.on('weapon:reload', () => this.showMessage('RELOADING', 0.7));
    events.on('wave:spawned', data => this.showMessage(`WAVE ${data.wave} — ${data.count} TARGETS`, 1.3));
    events.on('wave:cleared', data => this.showMessage(`WAVE ${data.wave} CLEAR`, 1.5));
    events.on('pickup:collected', data => this.showMessage(`${data.type.toUpperCase()} +${Math.round(data.amount)}`, 0.65));
    events.on('enemy:killed', data => this.addKillFeed(data.headshot ? 'HEADSHOT // TARGET DOWN' : 'TARGET DOWN'));
  }

  onStart(handler) { this.startHandler = handler; }

  showOverlay({ title, copy, button = 'DEPLOY' }) {
    this.overlayTitle.textContent = title;
    this.overlayCopy.innerHTML = copy;
    this.startButton.textContent = button;
    this.overlay.hidden = false;
  }

  hideOverlay() { this.overlay.hidden = true; }

  showMessage(text, seconds = 1) {
    this.message.textContent = text;
    this.messageTimer = seconds;
  }

  showHitmarker(headshot) {
    this.hitmarker.style.filter = headshot ? 'drop-shadow(0 0 4px #ffca54)' : '';
    this.hitmarker.classList.remove('show');
    void this.hitmarker.offsetWidth;
    this.hitmarker.classList.add('show');
  }

  addKillFeed(text) {
    const line = document.createElement('div');
    line.className = 'kill-line';
    line.textContent = text;
    this.killFeedEl.prepend(line);
    this.killFeed.push({ line, life: 2.6 });
    while (this.killFeed.length > 4) this.killFeed.pop().line.remove();
  }

  update(dt) {
    this.health.textContent = Math.round(this.player.health);
    this.healthFill.style.transform = `scaleX(${Math.max(0, this.player.health / TUNING.player.maxHealth)})`;
    this.ammo.textContent = this.weapon.ammo;
    this.reserve.textContent = this.weapon.reserve;
    this.score.textContent = this.session.score;
    this.wave.textContent = this.session.wave;

    this.weaponState.textContent = this.weapon.reloading
      ? 'RELOADING'
      : this.player.slideTimer > 0
        ? 'SLIDE'
        : this.player.isSprinting
          ? 'SPRINT'
          : this.weapon.aiming
            ? 'ADS'
            : 'AUTO';

    const visualSpread = 3 + Math.min(14, this.weapon.spread * 650);
    this.reticle.style.setProperty('--spread', `${visualSpread}px`);
    this.reticle.classList.toggle('ads', this.weapon.aiming);

    this.damageFlash = Math.max(0, this.damageFlash - dt * 2.8);
    this.damageVignette.style.opacity = this.damageFlash.toFixed(3);

    if (this.messageTimer > 0) {
      this.messageTimer -= dt;
      if (this.messageTimer <= 0) this.message.textContent = '';
    }

    for (let i = this.killFeed.length - 1; i >= 0; i--) {
      this.killFeed[i].life -= dt;
      if (this.killFeed[i].life <= 0) {
        this.killFeed[i].line.remove();
        this.killFeed.splice(i, 1);
      }
    }
  }
}
