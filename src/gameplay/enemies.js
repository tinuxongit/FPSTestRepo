import * as THREE from 'three';
import { TUNING } from '../config.js';

export class EnemyManager {
  constructor({ scene, world, materials, events, player }) {
    this.scene = scene;
    this.world = world;
    this.materials = materials;
    this.events = events;
    this.player = player;
    this.enemies = [];
    this.shootables = [];
    this.wave = 1;
  }

  get aliveCount() {
    return this.enemies.reduce((sum, enemy) => sum + (enemy.alive ? 1 : 0), 0);
  }

  clear() {
    for (const enemy of this.enemies) this.scene.remove(enemy.root);
    this.enemies.length = 0;
    this.shootables.length = 0;
  }

  spawnWave(wave) {
    this.clear();
    this.wave = wave;
    const count = Math.min(TUNING.enemies.baseCount + wave * 2, TUNING.enemies.maxCount);
    const hp = TUNING.enemies.baseHp + Math.max(0, wave - 1) * 12;
    for (let i = 0; i < count; i++) this.spawnEnemy(this.world.randomSpawn(this.player.position, 11), hp, i);
    this.events.emit('wave:spawned', { wave, count });
  }

  makePart(enemy, geometry, material, position, { headshot = false, name = '' } = {}) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.castShadow = true;
    mesh.userData.kind = 'enemy';
    mesh.userData.enemy = enemy;
    mesh.userData.headshot = headshot;
    mesh.name = name;
    enemy.root.add(mesh);
    enemy.parts.push(mesh);
    this.shootables.push(mesh);
    return mesh;
  }

  spawnEnemy(position, hp, index) {
    const root = new THREE.Group();
    root.position.copy(position);
    root.userData.kind = 'enemy-root';
    this.scene.add(root);

    const enemy = {
      id: `${this.wave}-${index}-${Math.random().toString(36).slice(2, 7)}`,
      root,
      parts: [],
      hp,
      maxHp: hp,
      alive: true,
      deadTimer: 0,
      attackCooldown: 0.4 + Math.random() * 0.9,
      speed: TUNING.enemies.baseSpeed + Math.random() * 0.55 + this.wave * 0.025,
      phase: Math.random() * Math.PI * 2,
      strafeSign: Math.random() < 0.5 ? -1 : 1,
      legs: [],
      arms: []
    };

    this.makePart(enemy, new THREE.BoxGeometry(0.74, 1.05, 0.42), this.materials.enemy, new THREE.Vector3(0, 1.32, 0), { name: 'torso' });
    this.makePart(enemy, new THREE.BoxGeometry(0.8, 0.22, 0.47), this.materials.enemyDark, new THREE.Vector3(0, 1.55, -0.015), { name: 'plate' });
    this.makePart(enemy, new THREE.SphereGeometry(0.27, 14, 10), this.materials.enemyDark, new THREE.Vector3(0, 2.02, 0), { headshot: true, name: 'head' });
    this.makePart(enemy, new THREE.BoxGeometry(0.34, 0.09, 0.05), this.materials.enemyGlow, new THREE.Vector3(0, 2.02, -0.255), { headshot: true, name: 'visor' });

    for (const sx of [-0.2, 0.2]) {
      const leg = this.makePart(enemy, new THREE.BoxGeometry(0.24, 0.86, 0.26), this.materials.enemyDark, new THREE.Vector3(sx, 0.52, 0), { name: 'leg' });
      enemy.legs.push(leg);
    }

    const armL = this.makePart(enemy, new THREE.BoxGeometry(0.18, 0.82, 0.2), this.materials.enemy, new THREE.Vector3(-0.48, 1.37, 0), { name: 'arm-left' });
    armL.rotation.z = -0.09;
    enemy.arms.push(armL);
    const armR = this.makePart(enemy, new THREE.BoxGeometry(0.18, 0.82, 0.2), this.materials.enemy, new THREE.Vector3(0.48, 1.37, 0), { name: 'arm-right' });
    armR.rotation.z = 0.09;
    enemy.arms.push(armR);

    const rifle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.72), this.materials.metalDark);
    rifle.position.set(0.25, 1.34, -0.38);
    rifle.rotation.x = -0.08;
    root.add(rifle);
    enemy.rifle = rifle;

    this.enemies.push(enemy);
  }

  resolveShot(raycaster, baseDamage, headMultiplier) {
    const targets = [...this.world.occluders, ...this.shootables];
    const hits = raycaster.intersectObjects(targets, false);
    for (const hit of hits) {
      if (hit.object.userData.kind === 'world') return { point: hit.point.clone(), world: true };
      if (hit.object.userData.kind !== 'enemy') continue;
      const enemy = hit.object.userData.enemy;
      if (!enemy?.alive) continue;
      const headshot = !!hit.object.userData.headshot;
      const damage = baseDamage * (headshot ? headMultiplier : 1);
      enemy.hp -= damage;
      const killed = enemy.hp <= 0;
      const result = { point: hit.point.clone(), enemy, headshot, killed, damage };
      if (killed) this.killEnemy(enemy, headshot);
      return result;
    }
    return null;
  }

  killEnemy(enemy, headshot) {
    if (!enemy.alive) return;
    enemy.alive = false;
    enemy.deadTimer = 0.48;
    const position = enemy.root.position.clone();
    this.events.emit('enemy:killed', { enemy, position, headshot });
  }

  update(dt) {
    const playerPos = this.player.position;
    for (const enemy of this.enemies) {
      if (!enemy.alive) {
        enemy.deadTimer -= dt;
        enemy.root.rotation.z = THREE.MathUtils.lerp(enemy.root.rotation.z, 1.35, 1 - Math.exp(-8 * dt));
        enemy.root.position.y = Math.max(-0.55, enemy.root.position.y - dt * 0.8);
        if (enemy.deadTimer <= 0 && enemy.root.parent) this.scene.remove(enemy.root);
        continue;
      }

      enemy.phase += dt * (4 + enemy.speed);
      const dx = playerPos.x - enemy.root.position.x;
      const dz = playerPos.z - enemy.root.position.z;
      const distance = Math.hypot(dx, dz);
      const seesPlayer = distance < TUNING.enemies.engageDistance && this.world.hasLineOfSight(enemy.root.position, playerPos, 1.35);

      enemy.root.rotation.y = Math.atan2(-dx, -dz);

      if (seesPlayer) {
        const forward = new THREE.Vector3(dx, 0, dz).normalize();
        const side = new THREE.Vector3(-forward.z, 0, forward.x).multiplyScalar(enemy.strafeSign);
        const delta = new THREE.Vector3();
        if (distance > TUNING.enemies.preferredDistance + 2) {
          delta.copy(forward).multiplyScalar(enemy.speed * dt);
        } else if (distance < TUNING.enemies.preferredDistance - 1.5) {
          delta.copy(forward).multiplyScalar(-enemy.speed * 0.55 * dt);
        } else {
          delta.copy(side).multiplyScalar(enemy.speed * 0.58 * dt);
          if (Math.random() < dt * 0.45) enemy.strafeSign *= -1;
        }
        this.world.moveWithCollision(enemy.root.position, delta, 0.48);

        enemy.attackCooldown -= dt;
        if (distance < TUNING.enemies.attackDistance && enemy.attackCooldown <= 0) {
          enemy.attackCooldown = Math.max(0.42, 1.05 - this.wave * 0.025) + Math.random() * 0.55;
          const accuracy = THREE.MathUtils.clamp(0.72 - distance * 0.022 + this.wave * 0.008, 0.22, 0.82);
          const from = enemy.root.position.clone().add(new THREE.Vector3(0.25, 1.35, 0));
          const target = this.player.camera.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.35, (Math.random() - 0.5) * 0.6));
          this.events.emit('enemy:shot', { from, to: target, enemy });
          if (Math.random() < accuracy) this.player.damage(5.5 + Math.random() * 5 + this.wave * 0.2, 'training-target');
        }
      }

      const walk = Math.sin(enemy.phase) * (seesPlayer ? 0.45 : 0.12);
      if (enemy.legs[0]) enemy.legs[0].rotation.x = walk;
      if (enemy.legs[1]) enemy.legs[1].rotation.x = -walk;
      if (enemy.arms[0]) enemy.arms[0].rotation.x = -walk * 0.55;
      if (enemy.arms[1]) enemy.arms[1].rotation.x = walk * 0.55;
    }
  }
}
