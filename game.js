import * as THREE from 'three';

const canvas = document.getElementById('game');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('start');
const overlayTitle = document.getElementById('overlay-title');
const introCopy = document.getElementById('intro-copy');
const healthEl = document.getElementById('health');
const healthFill = document.getElementById('health-fill');
const ammoEl = document.getElementById('ammo');
const reserveEl = document.getElementById('reserve');
const scoreEl = document.getElementById('score');
const waveEl = document.getElementById('wave');
const reloadState = document.getElementById('reload-state');
const messageEl = document.getElementById('message');
const reticle = document.getElementById('reticle');
const hitmarker = document.getElementById('hitmarker');
const damageVignette = document.getElementById('damage-vignette');
const webglError = document.getElementById('webgl-error');

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (err) {
  webglError.hidden = false;
  throw err;
}

renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
renderer.setSize(innerWidth, innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8fa0a8);
scene.fog = new THREE.FogExp2(0x8fa0a8, 0.014);

const camera = new THREE.PerspectiveCamera(74, innerWidth / innerHeight, 0.05, 220);
scene.add(camera);

const hemi = new THREE.HemisphereLight(0xdfeeff, 0x445040, 1.55);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff4d8, 2.25);
sun.position.set(24, 40, 14);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -50;
sun.shadow.camera.right = 50;
sun.shadow.camera.top = 50;
sun.shadow.camera.bottom = -50;
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 120;
scene.add(sun);

const clock = new THREE.Clock();
const keys = Object.create(null);
const colliders = [];
const enemies = [];
const shootables = [];
const effects = [];
const raycaster = new THREE.Raycaster();
const centerNdc = new THREE.Vector2(0, 0);
const up = new THREE.Vector3(0, 1, 0);

const player = {
  pos: new THREE.Vector3(0, 0, 18),
  yaw: Math.PI,
  pitch: 0,
  velY: 0,
  grounded: true,
  health: 100,
  ammo: 30,
  reserve: 120,
  score: 0,
  wave: 1,
  aiming: false,
  reloading: false,
  firing: false,
  gameOver: false,
  bob: 0,
  recoil: 0,
  radius: 0.42
};

const materials = {
  concrete: new THREE.MeshStandardMaterial({ color: 0x7d8586, roughness: 0.94, metalness: 0.02 }),
  concreteDark: new THREE.MeshStandardMaterial({ color: 0x50595b, roughness: 0.93 }),
  metal: new THREE.MeshStandardMaterial({ color: 0x434b4e, roughness: 0.58, metalness: 0.58 }),
  crate: new THREE.MeshStandardMaterial({ color: 0x6e624c, roughness: 0.92 }),
  ground: new THREE.MeshStandardMaterial({ color: 0x656b62, roughness: 1 }),
  target: new THREE.MeshStandardMaterial({ color: 0x596169, roughness: 0.75, metalness: 0.18 }),
  targetDark: new THREE.MeshStandardMaterial({ color: 0x23282d, roughness: 0.68 }),
  targetGlow: new THREE.MeshStandardMaterial({ color: 0xff593f, emissive: 0xff2316, emissiveIntensity: 2.2, roughness: 0.5 })
};

function box(x, y, z, w, h, d, material = materials.concrete, collidable = true, rotY = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotY;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  if (collidable && Math.abs(rotY) < 0.001) {
    colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, top: y + h / 2 });
  }
  return mesh;
}

function cylinder(x, y, z, r, h, material = materials.metal) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 16), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  colliders.push({ minX: x - r, maxX: x + r, minZ: z - r, maxZ: z + r, top: y + h / 2 });
  return mesh;
}

function buildWorld() {
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), materials.ground);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const grid = new THREE.GridHelper(120, 60, 0x68736c, 0x5d665f);
  grid.position.y = 0.008;
  grid.material.opacity = 0.24;
  grid.material.transparent = true;
  scene.add(grid);

  box(0, 2.5, -31, 64, 5, 1.2, materials.concreteDark);
  box(0, 2.5, 31, 64, 5, 1.2, materials.concreteDark);
  box(-31, 2.5, 0, 1.2, 5, 64, materials.concreteDark);
  box(31, 2.5, 0, 1.2, 5, 64, materials.concreteDark);

  box(0, 2.2, 0, 12, 4.4, 4, materials.concrete);
  box(-18, 1.6, -8, 8, 3.2, 5, materials.concreteDark);
  box(17, 1.8, 8, 9, 3.6, 5, materials.concreteDark);
  box(-12, 1.2, 15, 4, 2.4, 9, materials.crate);
  box(11, 1.2, -16, 4, 2.4, 9, materials.crate);
  box(21, 1.0, -10, 6, 2, 3, materials.crate);
  box(-22, 1.0, 9, 6, 2, 3, materials.crate);

  box(-7, 0.65, -12, 2.2, 1.3, 2.2, materials.crate);
  box(-4.5, 1.15, -12, 2.2, 2.3, 2.2, materials.crate);
  box(-2, 1.65, -12, 2.2, 3.3, 2.2, materials.crate);

  box(8, 0.6, 14, 3.2, 1.2, 3.2, materials.metal);
  box(11.3, 1.1, 14, 3.2, 2.2, 3.2, materials.metal);
  box(14.6, 1.6, 14, 3.2, 3.2, 3.2, materials.metal);

  cylinder(-9, 1.0, -22, 1.0, 2, materials.metal);
  cylinder(-6.7, 1.0, -22, 1.0, 2, materials.metal);
  cylinder(18, 1.0, 21, 1.0, 2, materials.metal);
  cylinder(20.3, 1.0, 21, 1.0, 2, materials.metal);

  for (let i = -24; i <= 24; i += 8) {
    const post = box(i, 3.2, -28.5, 0.32, 6.4, 0.32, materials.metal, false);
    post.castShadow = false;
  }

  const tower = box(22, 4.1, -22, 5.5, 8.2, 5.5, materials.concreteDark);
  tower.material = materials.concreteDark;
  box(22, 8.55, -22, 7, 0.5, 7, materials.metal, false);

  const beacon = new THREE.PointLight(0xff6040, 12, 12, 2);
  beacon.position.set(22, 9.4, -22);
  scene.add(beacon);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), new THREE.MeshBasicMaterial({ color: 0xff3e2d }));
  lamp.position.copy(beacon.position);
  scene.add(lamp);
}

buildWorld();

const weapon = new THREE.Group();
camera.add(weapon);
weapon.position.set(0.34, -0.31, -0.72);

const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.16, 0.62), new THREE.MeshStandardMaterial({ color: 0x22282b, roughness: 0.48, metalness: 0.65 }));
gunBody.position.set(0, 0, -0.05);
weapon.add(gunBody);
const stock = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.18, 0.31), new THREE.MeshStandardMaterial({ color: 0x151a1c, roughness: 0.8 }));
stock.position.set(0, -0.025, 0.39);
weapon.add(stock);
const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.62, 10), new THREE.MeshStandardMaterial({ color: 0x101416, roughness: 0.35, metalness: 0.85 }));
barrel.rotation.x = Math.PI / 2;
barrel.position.set(0, 0.02, -0.45);
weapon.add(barrel);
const sight = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.14), new THREE.MeshStandardMaterial({ color: 0x0b0f11, roughness: 0.45, metalness: 0.7 }));
sight.position.set(0, 0.12, -0.16);
weapon.add(sight);

const muzzle = new THREE.PointLight(0xffb24e, 0, 5, 2);
muzzle.position.set(0, 0.02, -0.79);
weapon.add(muzzle);

function addEnemy(x, z, hp) {
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  root.userData.enemy = true;
  root.userData.hp = hp;
  root.userData.maxHp = hp;
  root.userData.cooldown = 0.4 + Math.random() * 1.0;
  root.userData.speed = 1.25 + Math.random() * 0.55;
  root.userData.alive = true;

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.05, 0.42), materials.target);
  torso.position.y = 1.32;
  torso.castShadow = true;
  torso.userData.enemyRoot = root;
  root.add(torso);

  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.22, 0.47), materials.targetDark);
  chest.position.set(0, 1.53, -0.01);
  chest.userData.enemyRoot = root;
  root.add(chest);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 14, 10), materials.targetDark);
  head.position.y = 2.02;
  head.castShadow = true;
  head.userData.enemyRoot = root;
  head.userData.headshot = true;
  root.add(head);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.09, 0.05), materials.targetGlow);
  visor.position.set(0, 2.02, -0.255);
  visor.userData.enemyRoot = root;
  visor.userData.headshot = true;
  root.add(visor);

  const legMat = materials.targetDark;
  for (const sx of [-0.2, 0.2]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.86, 0.26), legMat);
    leg.position.set(sx, 0.52, 0);
    leg.userData.enemyRoot = root;
    root.add(leg);
  }

  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.82, 0.2), materials.target);
  armL.position.set(-0.48, 1.37, 0);
  armL.rotation.z = -0.09;
  armL.userData.enemyRoot = root;
  root.add(armL);
  const armR = armL.clone();
  armR.position.x = 0.48;
  armR.rotation.z = 0.09;
  armR.userData.enemyRoot = root;
  root.add(armR);

  root.traverse(obj => { if (obj.isMesh) shootables.push(obj); });
  scene.add(root);
  enemies.push(root);
}

function randomSpawn(minDist = 12) {
  for (let i = 0; i < 100; i++) {
    const x = THREE.MathUtils.randFloat(-26, 26);
    const z = THREE.MathUtils.randFloat(-26, 26);
    if (Math.hypot(x - player.pos.x, z - player.pos.z) < minDist) continue;
    const blocked = colliders.some(c => x > c.minX - 1 && x < c.maxX + 1 && z > c.minZ - 1 && z < c.maxZ + 1);
    if (!blocked) return { x, z };
  }
  return { x: -20, z: -20 };
}

function spawnWave() {
  for (const enemy of enemies.splice(0)) scene.remove(enemy);
  shootables.length = 0;
  const count = Math.min(4 + player.wave * 2, 20);
  const hp = 2 + Math.floor((player.wave - 1) / 3);
  for (let i = 0; i < count; i++) {
    const p = randomSpawn(11);
    addEnemy(p.x, p.z, hp);
  }
  flashMessage(`WAVE ${player.wave}`);
  updateHud();
}

function updateHud() {
  healthEl.textContent = Math.max(0, Math.round(player.health));
  healthFill.style.transform = `scaleX(${THREE.MathUtils.clamp(player.health / 100, 0, 1)})`;
  ammoEl.textContent = player.ammo;
  reserveEl.textContent = player.reserve;
  scoreEl.textContent = player.score;
  waveEl.textContent = player.wave;
  reloadState.textContent = player.reloading ? 'RELOADING' : player.aiming ? 'ADS' : 'AUTO';
}

let messageTimer = 0;
function flashMessage(text, seconds = 1.15) {
  messageEl.textContent = text;
  messageTimer = seconds;
}

function showHitmarker() {
  hitmarker.classList.remove('show');
  void hitmarker.offsetWidth;
  hitmarker.classList.add('show');
}

function canOccupy(x, z) {
  const r = player.radius;
  if (x < -29.5 || x > 29.5 || z < -29.5 || z > 29.5) return false;
  return !colliders.some(c => x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ && c.top > 0.25);
}

function resetGame() {
  player.pos.set(0, 0, 18);
  player.yaw = Math.PI;
  player.pitch = 0;
  player.velY = 0;
  player.grounded = true;
  player.health = 100;
  player.ammo = 30;
  player.reserve = 120;
  player.score = 0;
  player.wave = 1;
  player.aiming = false;
  player.reloading = false;
  player.firing = false;
  player.gameOver = false;
  player.recoil = 0;
  overlayTitle.textContent = 'Gun FPS Test';
  introCopy.innerHTML = 'A full 3D browser FPS prototype. Move with <b>WASD</b>, look freely with the mouse, sprint with <b>Shift</b>, jump with <b>Space</b>, aim with <b>right click</b>, fire with <b>left click</b>, and reload with <b>R</b>.';
  startBtn.textContent = 'ENTER TRAINING YARD';
  spawnWave();
  updateHud();
}

function reload() {
  if (player.reloading || player.ammo === 30 || player.reserve <= 0 || player.gameOver) return;
  player.reloading = true;
  updateHud();
  flashMessage('RELOADING', 1.05);
  setTimeout(() => {
    if (player.gameOver) return;
    const need = 30 - player.ammo;
    const moved = Math.min(need, player.reserve);
    player.ammo += moved;
    player.reserve -= moved;
    player.reloading = false;
    updateHud();
  }, 1050);
}

function fire() {
  if (player.firing || player.reloading || player.gameOver || document.pointerLockElement !== canvas) return;
  if (player.ammo <= 0) { reload(); return; }
  player.firing = true;
  player.ammo -= 1;
  player.recoil = Math.min(player.recoil + (player.aiming ? 0.018 : 0.032), 0.09);
  muzzle.intensity = 18;
  updateHud();
  setTimeout(() => { player.firing = false; }, 82);
  setTimeout(() => { muzzle.intensity = 0; }, 45);

  raycaster.setFromCamera(centerNdc, camera);
  const hits = raycaster.intersectObjects(shootables, false);
  if (!hits.length) return;
  const hit = hits[0];
  const enemy = hit.object.userData.enemyRoot;
  if (!enemy || !enemy.userData.alive) return;

  const damage = hit.object.userData.headshot ? 2 : 1;
  enemy.userData.hp -= damage;
  showHitmarker();
  player.score += hit.object.userData.headshot ? 40 : 20;

  const spark = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffd49a }));
  spark.position.copy(hit.point);
  scene.add(spark);
  effects.push({ mesh: spark, life: 0.12 });

  if (enemy.userData.hp <= 0) {
    enemy.userData.alive = false;
    player.score += 100;
    player.reserve = Math.min(180, player.reserve + 8);
    enemy.traverse(o => { if (o.isMesh) o.material = new THREE.MeshStandardMaterial({ color: 0x30363a, roughness: 1 }); });
    setTimeout(() => scene.remove(enemy), 350);
  }
  updateHud();
}

function damagePlayer(amount) {
  player.health -= amount;
  damageVignette.style.opacity = '1';
  setTimeout(() => { damageVignette.style.opacity = '0'; }, 110);
  updateHud();
  if (player.health <= 0) endGame();
}

function endGame() {
  player.gameOver = true;
  document.exitPointerLock?.();
  overlay.style.display = 'grid';
  overlayTitle.textContent = 'TRAINING FAILED';
  introCopy.innerHTML = `Score: <b>${player.score}</b> · Wave: <b>${player.wave}</b><br><br>Re-enter the yard to try again.`;
  startBtn.textContent = 'RESTART';
}

function updatePlayer(dt) {
  const fwd = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  const right = new THREE.Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
  const move = new THREE.Vector3();
  if (keys.KeyW) move.add(fwd);
  if (keys.KeyS) move.sub(fwd);
  if (keys.KeyD) move.add(right);
  if (keys.KeyA) move.sub(right);
  if (move.lengthSq() > 0) move.normalize();

  const sprinting = keys.ShiftLeft && !player.aiming;
  const speed = player.aiming ? 3.1 : sprinting ? 7.4 : 4.9;
  const dx = move.x * speed * dt;
  const dz = move.z * speed * dt;
  if (canOccupy(player.pos.x + dx, player.pos.z)) player.pos.x += dx;
  if (canOccupy(player.pos.x, player.pos.z + dz)) player.pos.z += dz;

  if (player.grounded && keys.Space) {
    player.velY = 6.6;
    player.grounded = false;
  }
  player.velY -= 18.5 * dt;
  player.pos.y += player.velY * dt;
  if (player.pos.y <= 0) {
    player.pos.y = 0;
    player.velY = 0;
    player.grounded = true;
  }

  if (move.lengthSq() > 0 && player.grounded) player.bob += dt * (sprinting ? 13 : 9);
  const bobX = Math.sin(player.bob) * (sprinting ? 0.025 : 0.015);
  const bobY = Math.abs(Math.cos(player.bob * 2)) * (sprinting ? 0.018 : 0.011);

  player.recoil *= Math.pow(0.05, dt);
  camera.position.set(player.pos.x, player.pos.y + 1.68 + bobY, player.pos.z);
  camera.rotation.order = 'YXZ';
  camera.rotation.y = player.yaw;
  camera.rotation.x = player.pitch - player.recoil;

  const targetFov = player.aiming ? 56 : sprinting ? 80 : 74;
  camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 1 - Math.pow(0.0008, dt));
  camera.updateProjectionMatrix();

  const weaponTarget = player.aiming ? new THREE.Vector3(0, -0.255, -0.61) : new THREE.Vector3(0.34 + bobX, -0.31 - bobY, -0.72);
  weapon.position.lerp(weaponTarget, 1 - Math.pow(0.0002, dt));
  weapon.rotation.x = player.recoil * 4;
  reticle.classList.toggle('ads', player.aiming);
  reticle.style.setProperty('--spread', `${player.aiming ? 2 : sprinting ? 11 : move.lengthSq() ? 8 : 5}px`);
}

function lineBlocked(a, b) {
  const dir = b.clone().sub(a);
  const dist = dir.length();
  dir.normalize();
  raycaster.set(a, dir);
  raycaster.far = dist;
  const worldMeshes = scene.children.filter(o => o.isMesh && !shootables.includes(o) && !weapon.children.includes(o));
  return raycaster.intersectObjects(worldMeshes, false).length > 0;
}

function updateEnemies(dt) {
  let alive = 0;
  for (const enemy of enemies) {
    if (!enemy.userData.alive) continue;
    alive += 1;
    const toPlayer = new THREE.Vector3(player.pos.x - enemy.position.x, 0, player.pos.z - enemy.position.z);
    const dist = toPlayer.length();
    if (dist > 26) continue;
    enemy.lookAt(player.pos.x, enemy.position.y + 1.2, player.pos.z);

    if (dist > 5.4) {
      toPlayer.normalize();
      const step = enemy.userData.speed * dt;
      const nx = enemy.position.x + toPlayer.x * step;
      const nz = enemy.position.z + toPlayer.z * step;
      const blocked = colliders.some(c => nx + 0.35 > c.minX && nx - 0.35 < c.maxX && nz + 0.35 > c.minZ && nz - 0.35 < c.maxZ);
      if (!blocked) enemy.position.set(nx, 0, nz);
    }

    enemy.userData.cooldown -= dt;
    if (dist < 18 && enemy.userData.cooldown <= 0) {
      enemy.userData.cooldown = Math.max(0.52, 1.15 - player.wave * 0.025) + Math.random() * 0.45;
      const eye = enemy.position.clone().add(new THREE.Vector3(0, 1.8, 0));
      const target = player.pos.clone().add(new THREE.Vector3(0, 1.4, 0));
      if (!lineBlocked(eye, target)) {
        const accuracy = THREE.MathUtils.clamp(0.72 - dist * 0.025, 0.22, 0.68);
        if (Math.random() < accuracy) damagePlayer(5 + Math.random() * 4 + player.wave * 0.25);
      }
    }
  }

  if (alive === 0 && !player.gameOver) {
    player.wave += 1;
    player.health = Math.min(100, player.health + 22);
    player.reserve = Math.min(180, player.reserve + 36);
    updateHud();
    spawnWave();
  }
}

function updateEffects(dt) {
  for (let i = effects.length - 1; i >= 0; i--) {
    effects[i].life -= dt;
    if (effects[i].life <= 0) {
      scene.remove(effects[i].mesh);
      effects.splice(i, 1);
    }
  }
  if (messageTimer > 0) {
    messageTimer -= dt;
    if (messageTimer <= 0) messageEl.textContent = '';
  }
}

addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'KeyR') reload();
  if (e.code === 'Space') e.preventDefault();
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('contextmenu', e => e.preventDefault());
addEventListener('mousedown', e => {
  if (document.pointerLockElement !== canvas) return;
  if (e.button === 0) fire();
  if (e.button === 2) { player.aiming = true; updateHud(); }
});
addEventListener('mouseup', e => {
  if (e.button === 2) { player.aiming = false; updateHud(); }
});
addEventListener('mousemove', e => {
  if (document.pointerLockElement !== canvas || player.gameOver) return;
  const sens = player.aiming ? 0.00125 : 0.0019;
  player.yaw -= e.movementX * sens;
  player.pitch -= e.movementY * sens;
  player.pitch = THREE.MathUtils.clamp(player.pitch, -1.35, 1.35);
});

startBtn.addEventListener('click', () => {
  if (player.gameOver) resetGame();
  canvas.requestPointerLock();
});
canvas.addEventListener('click', () => {
  if (document.pointerLockElement !== canvas && !player.gameOver) canvas.requestPointerLock();
});
document.addEventListener('pointerlockchange', () => {
  overlay.style.display = document.pointerLockElement === canvas ? 'none' : 'grid';
});

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
});

resetGame();

function animate() {
  const dt = Math.min(clock.getDelta(), 0.033);
  if (!player.gameOver && document.pointerLockElement === canvas) {
    updatePlayer(dt);
    updateEnemies(dt);
  } else {
    camera.position.set(player.pos.x, player.pos.y + 1.68, player.pos.z);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = player.yaw;
    camera.rotation.x = player.pitch;
  }
  updateEffects(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();
