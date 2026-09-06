import * as THREE from 'three';
import { createSoldier, createBrute, createDrone } from '../models/actors.js';

export class EnemyDirector {
  constructor({ scene, world, player, events, projectiles, effects }) {
    Object.assign(this, { scene, world, player, events, projectiles, effects });
    this.list = [];
    this.difficulty = 1;
    this.spawnClock = 0;
    this.revealTime = 0;
    this.maxAlive = 14;
  }

  reset(difficulty = 1) {
    this.clear();
    this.difficulty = difficulty;
    this.spawnClock = .2;
    this.maxAlive = 12 + difficulty * 3;
  }

  clear() {
    for (const e of this.list) this.scene.remove(e);
    this.list = [];
  }

  spawn(type = null, point = null) {
    if (!type) {
      const r = Math.random();
      type = r > .91 ? 'brute' : r > .78 ? 'drone' : 'soldier';
    }

    const p = point || this.world.randomSpawn(this.player.position, 16);
    const e = type === 'brute' ? createBrute() : type === 'drone' ? createDrone() : createSoldier();
    e.position.set(p.x, 0, p.z);
    e.userData.type = type;
    e.userData.hp = type === 'brute' ? 340 : type === 'drone' ? 75 : 105;
    e.userData.maxHp = e.userData.hp;
    e.userData.speed = (type === 'brute' ? 2.15 : type === 'drone' ? 4.4 : 3.0) * (1 + .06 * this.difficulty);
    e.userData.cooldown = Math.random();
    e.userData.strafe = Math.random() > .5 ? 1 : -1;
    e.userData.name = type === 'brute' ? 'WARDEN HEAVY' : type === 'drone' ? 'HUNTER DRONE' : 'WARDEN TROOPER';
    e.userData.walkPhase = e.userData.walkPhase || Math.random() * Math.PI * 2;
    e.userData.hitFlash = 0;
    e.traverse(o => {
      if (o.isMesh) o.userData.enemy = e;
    });
    this.scene.add(e);
    this.list.push(e);
    return e;
  }

  animateEnemy(e, dt, moving, dist) {
    const rig = e.userData.rig;
    if (!rig) return;
    e.userData.walkPhase += dt * (moving ? e.userData.speed * 3.2 : 1.4);
    const phase = e.userData.walkPhase;

    if (e.userData.type === 'drone') {
      e.position.y = 1.05 + Math.sin(phase * 1.7) * .12;
      if (rig.body) {
        rig.body.rotation.y += dt * 1.4;
        rig.body.rotation.z = Math.sin(phase * .8) * .06;
      }
      return;
    }

    const stride = moving ? Math.min(.52, .16 + e.userData.speed * .08) : .035;
    const swing = Math.sin(phase) * stride;
    if (rig.leftLeg) rig.leftLeg.rotation.x = swing;
    if (rig.rightLeg) rig.rightLeg.rotation.x = -swing;
    if (rig.leftArm) rig.leftArm.rotation.x = -.3 - swing * .32;
    if (rig.rightArm) rig.rightArm.rotation.x = -.45 + swing * .24;
    if (rig.torso) {
      rig.torso.rotation.z = Math.sin(phase * .5) * .018 * (moving ? 1 : .35);
      rig.torso.rotation.x = dist < 8 ? -.055 : -.018;
    }
    if (rig.head) rig.head.rotation.y = Math.sin(phase * .35) * .025;
    if (rig.rifle) {
      rig.rifle.rotation.x = -.08 + (dist < 18 ? -.035 : 0);
      rig.rifle.rotation.z = Math.sin(phase) * .012 * (moving ? 1 : .2);
    }
  }

  update(dt) {
    this.revealTime = Math.max(0, this.revealTime - dt);
    this.spawnClock -= dt;
    if (this.spawnClock <= 0 && this.list.length < this.maxAlive) {
      this.spawn();
      this.spawnClock = Math.max(.45, 1.7 - .13 * this.difficulty);
    }

    for (const e of [...this.list]) {
      const to = this.player.position.clone().sub(e.position);
      const dist = to.length();
      const los = this.world.hasLineOfSight(
        e.position.clone().add(new THREE.Vector3(0, 1.3, 0)),
        this.player.position.clone().add(new THREE.Vector3(0, 1.2, 0))
      );

      let moving = false;
      if (dist > 6) {
        const dir = to.setY(0).normalize();
        if (los && dist < 22) {
          const side = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(e.userData.strafe * .42);
          dir.add(side).normalize();
        }
        this.world.moveObject(e, dir.multiplyScalar(e.userData.speed * dt), .45);
        moving = true;
      }

      if (e.userData.type !== 'drone') {
        e.lookAt(this.player.position.x, e.position.y, this.player.position.z);
        // Object3D.lookAt points +Z at the target; our characters are authored facing -Z.
        e.rotateY(Math.PI);
      } else {
        e.lookAt(this.player.position.x, e.position.y, this.player.position.z);
        e.rotateY(Math.PI);
      }

      this.animateEnemy(e, dt, moving, dist);

      e.userData.cooldown -= dt;
      if (los && dist < 30 && e.userData.cooldown <= 0) {
        const delay = e.userData.type === 'brute' ? .55 : e.userData.type === 'drone' ? .8 : 1.0;
        e.userData.cooldown = delay * (1 - .05 * this.difficulty) + Math.random() * .35;
        const origin = e.position.clone().add(new THREE.Vector3(0, e.userData.type === 'drone' ? 1.6 : 1.35, 0));
        const target = this.player.position.clone().add(new THREE.Vector3(
          (Math.random() - .5) * 1.3,
          1.1 + (Math.random() - .5) * .8,
          (Math.random() - .5) * 1.3
        ));
        this.projectiles.fire(origin, target, 9 + this.difficulty * 1.7, e);
      }
    }
  }

  raycast(raycaster) {
    const meshes = [];
    for (const e of this.list) e.traverse(o => {
      if (o.isMesh) meshes.push(o);
    });
    const hits = raycaster.intersectObjects(meshes, false);
    if (!hits.length) return null;
    const hit = hits[0];
    const enemy = hit.object.userData.enemy;
    return {
      enemy,
      point: hit.point,
      critical: hit.object.userData.head === true,
      distance: hit.distance
    };
  }

  damage(enemy, amount, critical = false) {
    if (!enemy || !this.list.includes(enemy)) return false;
    enemy.userData.hp -= amount;
    if (enemy.userData.hp <= 0) {
      this.events.emit('enemy:killed', { enemy, critical });
      this.effects.explosion(
        enemy.position.clone().add(new THREE.Vector3(0, 1, 0)),
        enemy.userData.type === 'drone' ? 0xff4545 : 0x39bfff
      );
      this.scene.remove(enemy);
      this.list.splice(this.list.indexOf(enemy), 1);
      return true;
    }

    const rig = enemy.userData.rig;
    if (rig?.torso) rig.torso.rotation.x -= critical ? .09 : .045;
    return false;
  }

  radialDamage(pos, radius, damage) {
    for (const e of [...this.list]) {
      const d = e.position.distanceTo(pos);
      if (d < radius) this.damage(e, damage * (1 - d / radius), false);
    }
  }

  nearest(pos, radius) {
    let best = null;
    let bestD = radius;
    for (const e of this.list) {
      const d = e.position.distanceTo(pos);
      if (d < bestD) {
        best = e;
        bestD = d;
      }
    }
    return best;
  }

  reveal(seconds) {
    this.revealTime = seconds;
    for (const e of this.list) e.traverse(o => {
      if (o.material?.emissive) o.material.emissive.setHex(0x5522aa);
    });
  }

  spawnBoss(point = null) {
    return this.spawn('brute', point);
  }
}
