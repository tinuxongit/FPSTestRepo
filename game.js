(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false });
  const overlay = document.getElementById('overlay');
  const startBtn = document.getElementById('start');
  const introCopy = document.getElementById('intro-copy');
  const gun = document.getElementById('gun');
  const healthEl = document.getElementById('health');
  const ammoEl = document.getElementById('ammo');
  const scoreEl = document.getElementById('score');
  const waveEl = document.getElementById('wave');
  const messageEl = document.getElementById('message');

  const MAP = [
    '1111111111111111',
    '1000000000000001',
    '1000100000100001',
    '1000100000100001',
    '1000000000000001',
    '1000001111000001',
    '1000001001000001',
    '1000001001000001',
    '1000000000000001',
    '1001000000001001',
    '1001000000001001',
    '1000000000000001',
    '1000011001100001',
    '1000000000000001',
    '1000000000000001',
    '1111111111111111'
  ];

  const MAP_W = MAP[0].length;
  const MAP_H = MAP.length;
  const FOV = Math.PI / 3;
  const MAX_DIST = 20;
  const MAG_SIZE = 12;

  let width = 0;
  let height = 0;
  let dpr = 1;
  let last = performance.now();
  let enemies = [];
  let gameOver = false;
  let shooting = false;
  let reloading = false;
  let hitFlash = 0;
  let damageFlash = 0;
  let walkBob = 0;
  let nextWaveTimer = null;
  let msgTimer = null;

  const keys = Object.create(null);
  const player = {
    x: 2.5,
    y: 2.5,
    angle: 0,
    health: 100,
    ammo: MAG_SIZE,
    reserve: 60,
    score: 0,
    wave: 1,
    speed: 3.2
  };

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function wallAt(x, y) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    return iy < 0 || iy >= MAP_H || ix < 0 || ix >= MAP_W || MAP[iy][ix] === '1';
  }

  function normalizeAngle(angle) {
    while (angle < -Math.PI) angle += Math.PI * 2;
    while (angle > Math.PI) angle -= Math.PI * 2;
    return angle;
  }

  function lineOfSight(x1, y1, x2, y2) {
    const dist = Math.hypot(x2 - x1, y2 - y1);
    const steps = Math.ceil(dist * 14);
    for (let i = 1; i < steps; i += 1) {
      const t = i / steps;
      if (wallAt(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t)) return false;
    }
    return true;
  }

  function freeSpawn(minDistance = 4) {
    for (let tries = 0; tries < 250; tries += 1) {
      const x = 1.5 + Math.random() * (MAP_W - 3);
      const y = 1.5 + Math.random() * (MAP_H - 3);
      if (!wallAt(x, y) && Math.hypot(x - player.x, y - player.y) > minDistance) {
        return { x, y };
      }
    }
    return { x: 13.5, y: 13.5 };
  }

  function flashMessage(text, duration = 1100) {
    messageEl.textContent = text;
    clearTimeout(msgTimer);
    msgTimer = setTimeout(() => { messageEl.textContent = ''; }, duration);
  }

  function updateHud() {
    healthEl.textContent = Math.max(0, Math.round(player.health));
    ammoEl.textContent = `${player.ammo} / ${player.reserve}`;
    scoreEl.textContent = player.score;
    waveEl.textContent = player.wave;
  }

  function spawnWave() {
    clearTimeout(nextWaveTimer);
    enemies = [];
    const count = Math.min(3 + player.wave * 2, 18);
    for (let i = 0; i < count; i += 1) {
      const pos = freeSpawn(4);
      enemies.push({
        x: pos.x,
        y: pos.y,
        hp: 2 + Math.floor(player.wave / 3),
        alive: true,
        cooldown: 0.55 + Math.random() * 1.25,
        phase: Math.random() * Math.PI * 2
      });
    }
    flashMessage(`WAVE ${player.wave}`);
    updateHud();
  }

  function reset() {
    Object.assign(player, {
      x: 2.5,
      y: 2.5,
      angle: 0,
      health: 100,
      ammo: MAG_SIZE,
      reserve: 60,
      score: 0,
      wave: 1
    });
    gameOver = false;
    shooting = false;
    reloading = false;
    hitFlash = 0;
    damageFlash = 0;
    clearTimeout(nextWaveTimer);
    startBtn.textContent = 'CLICK TO PLAY';
    introCopy.innerHTML = 'Move with <b>WASD</b>, aim with the mouse, click to shoot, press <b>R</b> to reload, and survive waves of fictional training drones.';
    spawnWave();
    updateHud();
  }

  function tryReload() {
    if (gameOver || reloading || player.ammo === MAG_SIZE || player.reserve <= 0) return;
    reloading = true;
    flashMessage('RELOADING', 850);
    setTimeout(() => {
      if (gameOver) return;
      const needed = MAG_SIZE - player.ammo;
      const moved = Math.min(needed, player.reserve);
      player.ammo += moved;
      player.reserve -= moved;
      reloading = false;
      updateHud();
    }, 850);
  }

  function shoot() {
    if (gameOver || document.pointerLockElement !== canvas) return;
    if (reloading || shooting) return;
    if (player.ammo <= 0) {
      tryReload();
      return;
    }

    shooting = true;
    player.ammo -= 1;
    gun.classList.add('fire');
    updateHud();

    setTimeout(() => {
      gun.classList.remove('fire');
      shooting = false;
    }, 85);

    let best = null;
    let closest = Infinity;

    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const dist = Math.hypot(dx, dy);
      const angleToEnemy = Math.atan2(dy, dx);
      const delta = Math.abs(normalizeAngle(angleToEnemy - player.angle));
      const hitWindow = Math.min(0.105, 0.31 / Math.max(dist, 0.6));

      if (delta < hitWindow && dist < closest && lineOfSight(player.x, player.y, enemy.x, enemy.y)) {
        best = enemy;
        closest = dist;
      }
    }

    if (!best) return;

    best.hp -= 1;
    hitFlash = 0.11;
    if (best.hp <= 0) {
      best.alive = false;
      player.score += 100;
      player.reserve = Math.min(96, player.reserve + 3);
    } else {
      player.score += 25;
    }
    updateHud();
  }

  function movePlayer(dt) {
    let forward = 0;
    let strafe = 0;
    if (keys.KeyW || keys.ArrowUp) forward += 1;
    if (keys.KeyS || keys.ArrowDown) forward -= 1;
    if (keys.KeyD) strafe += 1;
    if (keys.KeyA) strafe -= 1;

    const len = Math.hypot(forward, strafe) || 1;
    forward /= len;
    strafe /= len;

    const step = player.speed * dt;
    const dx = (Math.cos(player.angle) * forward + Math.cos(player.angle + Math.PI / 2) * strafe) * step;
    const dy = (Math.sin(player.angle) * forward + Math.sin(player.angle + Math.PI / 2) * strafe) * step;
    const pad = 0.18;

    if (!wallAt(player.x + dx + Math.sign(dx) * pad, player.y) && !wallAt(player.x + dx - Math.sign(dx) * pad, player.y)) {
      player.x += dx;
    }
    if (!wallAt(player.x, player.y + dy + Math.sign(dy) * pad) && !wallAt(player.x, player.y + dy - Math.sign(dy) * pad)) {
      player.y += dy;
    }

    if (Math.abs(forward) + Math.abs(strafe) > 0) walkBob += dt * 10;
    else walkBob *= 0.92;
  }

  function updateEnemies(dt) {
    let alive = 0;

    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      alive += 1;
      enemy.phase += dt * 2;

      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const dist = Math.hypot(dx, dy);
      const seesPlayer = dist < 8.5 && lineOfSight(enemy.x, enemy.y, player.x, player.y);

      if (!seesPlayer) continue;

      if (dist > 1.55) {
        const enemySpeed = (0.7 + player.wave * 0.035) * dt;
        const nx = enemy.x + (dx / dist) * enemySpeed;
        const ny = enemy.y + (dy / dist) * enemySpeed;
        if (!wallAt(nx, enemy.y)) enemy.x = nx;
        if (!wallAt(enemy.x, ny)) enemy.y = ny;
      }

      enemy.cooldown -= dt;
      if (dist < 6.6 && enemy.cooldown <= 0) {
        enemy.cooldown = Math.max(0.55, 1.35 - player.wave * 0.04) + Math.random() * 0.55;
        const accuracy = Math.max(0.18, 0.62 - dist * 0.055);
        if (Math.random() < accuracy) {
          player.health -= 4 + Math.random() * 5 + player.wave * 0.25;
          damageFlash = 0.16;
          updateHud();
          if (player.health <= 0) endGame();
        }
      }
    }

    if (alive === 0 && !gameOver && !nextWaveTimer) {
      player.wave += 1;
      player.health = Math.min(100, player.health + 18);
      player.reserve = Math.min(96, player.reserve + 18);
      updateHud();
      nextWaveTimer = setTimeout(() => {
        nextWaveTimer = null;
        spawnWave();
      }, 550);
    }
  }

  function endGame() {
    gameOver = true;
    reloading = false;
    document.exitPointerLock?.();
    overlay.style.display = 'grid';
    startBtn.textContent = 'PLAY AGAIN';
    introCopy.innerHTML = `Score: <b>${player.score}</b> &nbsp; Wave: <b>${player.wave}</b><br><br>Click below to restart the training run.`;
  }

  function raycast(angle) {
    const step = 0.025;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    for (let dist = 0; dist < MAX_DIST; dist += step) {
      const x = player.x + cos * dist;
      const y = player.y + sin * dist;
      if (wallAt(x, y)) {
        const fx = x - Math.floor(x);
        const fy = y - Math.floor(y);
        const edge = Math.min(fx, 1 - fx, fy, 1 - fy);
        return { dist, edge };
      }
    }
    return { dist: MAX_DIST, edge: 0 };
  }

  function renderWorld() {
    const sky = ctx.createLinearGradient(0, 0, 0, height / 2);
    sky.addColorStop(0, '#07101b');
    sky.addColorStop(1, '#263b52');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height / 2);

    const floor = ctx.createLinearGradient(0, height / 2, 0, height);
    floor.addColorStop(0, '#272c31');
    floor.addColorStop(1, '#07090b');
    ctx.fillStyle = floor;
    ctx.fillRect(0, height / 2, width, height / 2);

    const cols = Math.max(180, Math.floor(width / 4));
    const sliceWidth = width / cols + 1;
    const zBuffer = new Float32Array(cols);

    for (let i = 0; i < cols; i += 1) {
      const u = i / (cols - 1);
      const angle = player.angle + (u - 0.5) * FOV;
      const hit = raycast(angle);
      const corrected = hit.dist * Math.cos(angle - player.angle);
      zBuffer[i] = corrected;
      const wallHeight = Math.min(height * 1.8, height / (corrected * 0.72 + 0.001));
      const top = height / 2 - wallHeight / 2;
      const shade = Math.max(24, 185 - corrected * 14);
      const edgeDarken = hit.edge < 0.03 ? 0.62 : 1;

      ctx.fillStyle = `rgb(${shade * 0.42 * edgeDarken},${shade * 0.56 * edgeDarken},${shade * 0.68 * edgeDarken})`;
      ctx.fillRect(i * sliceWidth, top, sliceWidth + 1, wallHeight);
      ctx.fillStyle = 'rgba(255,255,255,.025)';
      ctx.fillRect(i * sliceWidth, top + wallHeight * 0.3, sliceWidth + 1, 1);
      ctx.fillRect(i * sliceWidth, top + wallHeight * 0.7, sliceWidth + 1, 1);
    }

    return { cols, zBuffer };
  }

  function renderEnemies(cols, zBuffer) {
    const sprites = [];

    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const dist = Math.hypot(dx, dy);
      const delta = normalizeAngle(Math.atan2(dy, dx) - player.angle);
      if (Math.abs(delta) < FOV * 0.7 && dist > 0.2) sprites.push({ enemy, dist, delta });
    }

    sprites.sort((a, b) => b.dist - a.dist);

    for (const sprite of sprites) {
      const screenX = (0.5 + sprite.delta / FOV) * width;
      const size = Math.min(height * 0.8, height / (sprite.dist * 0.72));
      const col = Math.max(0, Math.min(cols - 1, Math.floor((screenX / width) * cols)));
      if (sprite.dist > zBuffer[col] + 0.2) continue;

      const x = screenX - size * 0.32;
      const y = height / 2 - size * 0.5 + Math.sin(sprite.enemy.phase) * 3;

      const glow = ctx.createRadialGradient(screenX, y + size * 0.32, 2, screenX, y + size * 0.32, size * 0.5);
      glow.addColorStop(0, 'rgba(255,90,60,.22)');
      glow.addColorStop(1, 'rgba(255,90,60,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(x - size * 0.3, y - size * 0.2, size * 1.2, size * 1.2);

      ctx.fillStyle = '#b9c0c7';
      ctx.fillRect(x, y, size * 0.64, size * 0.34);
      ctx.fillStyle = '#5b6169';
      ctx.fillRect(x + size * 0.08, y - size * 0.12, size * 0.48, size * 0.18);
      ctx.fillStyle = '#1b2026';
      ctx.fillRect(x + size * 0.11, y + size * 0.34, size * 0.12, size * 0.16);
      ctx.fillRect(x + size * 0.41, y + size * 0.34, size * 0.12, size * 0.16);
      ctx.fillStyle = '#ff493d';
      ctx.fillRect(x + size * 0.25, y + size * 0.08, size * 0.14, size * 0.09);

      for (let pip = 0; pip < sprite.enemy.hp; pip += 1) {
        ctx.fillStyle = '#ffdf68';
        ctx.fillRect(x + pip * 5, y - 7, 3, 3);
      }
    }
  }

  function renderEffects() {
    const vignette = ctx.createRadialGradient(
      width / 2, height / 2, Math.min(width, height) * 0.2,
      width / 2, height / 2, Math.max(width, height) * 0.72
    );
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,.58)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    if (hitFlash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${Math.min(0.22, hitFlash)})`;
      ctx.fillRect(0, 0, width, height);
    }

    if (damageFlash > 0) {
      ctx.fillStyle = `rgba(255,30,20,${Math.min(0.24, damageFlash)})`;
      ctx.fillRect(0, 0, width, height);
    }

    gun.style.marginBottom = `${Math.sin(walkBob) * 4}px`;
  }

  function render() {
    const { cols, zBuffer } = renderWorld();
    renderEnemies(cols, zBuffer);
    renderEffects();
  }

  function loop(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;

    if (!gameOver && document.pointerLockElement === canvas) {
      movePlayer(dt);
      updateEnemies(dt);
    }

    hitFlash = Math.max(0, hitFlash - dt);
    damageFlash = Math.max(0, damageFlash - dt);
    render();
    requestAnimationFrame(loop);
  }

  window.addEventListener('resize', resize);
  window.addEventListener('keydown', (event) => {
    keys[event.code] = true;
    if (event.code === 'KeyR') tryReload();
    if (event.code === 'Space') {
      event.preventDefault();
      shoot();
    }
  });
  window.addEventListener('keyup', (event) => { keys[event.code] = false; });
  window.addEventListener('mousedown', (event) => {
    if (event.button === 0 && document.pointerLockElement === canvas) shoot();
  });
  window.addEventListener('mousemove', (event) => {
    if (document.pointerLockElement === canvas && !gameOver) {
      player.angle += event.movementX * 0.0025;
    }
  });

  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === canvas) {
      overlay.style.display = 'none';
    } else if (!gameOver) {
      overlay.style.display = 'grid';
      startBtn.textContent = 'RESUME';
    }
  });

  startBtn.addEventListener('click', () => {
    if (gameOver) reset();
    canvas.requestPointerLock();
  });

  canvas.addEventListener('click', () => {
    if (document.pointerLockElement !== canvas && !gameOver) canvas.requestPointerLock();
  });

  resize();
  reset();
  requestAnimationFrame(loop);
})();
