import * as THREE from 'three';
import { WEAPONS } from '../data/weapons.js';
import { createWeaponModel } from '../models/weapon.js';
import { damp } from '../core/math.js';

export class WeaponSystem {
  constructor({ camera, input, player, enemies, effects, audio, events, world, view }) {
    Object.assign(this, { camera, input, player, enemies, effects, audio, events, world, view });
    this.group = new THREE.Group();
    this.group.rotation.order = 'YXZ';
    camera.add(this.group);
    this.ray = new THREE.Raycaster();
    this.fireClock = 0;
    this.reloading = 0;
    this.aim = 0;
    this.fireRateMultiplier = 1;
    this.critMultiplier = 1;
    this.recoilKick = 0;
    this.recoilYaw = 0;
    this.swayX = 0;
    this.swayY = 0;
    this.group.position.set(.27, -.27, -.66);
  }

  configure(classDef) {
    this.definition = WEAPONS[classDef.weapon];
    this.mag = this.definition.mag;
    this.reserve = this.definition.reserve;
    this.fireClock = 0;
    this.reloading = 0;
    this.aim = 0;
    this.recoilKick = 0;
    this.recoilYaw = 0;
    this.group.clear();
    const model = createWeaponModel(this.definition.id, classDef.color);
    model.scale.setScalar(.92);
    this.group.add(model);
    this.group.visible = true;
  }

  update(dt) {
    if (!this.definition) return;
    this.fireClock = Math.max(0, this.fireClock - dt);
    if (this.reloading > 0) {
      this.reloading -= dt;
      if (this.reloading <= 0) this.finishReload();
    }

    const ads = this.input.button(2) && this.reloading <= 0 && !this.player.isSprinting;
    this.aim = damp(this.aim, ads ? 1 : 0, 16, dt);

    const fovTarget = ads ? 54 : this.player.isSprinting ? 82 : 76;
    this.camera.fov = damp(this.camera.fov, fovTarget, ads ? 17 : 9, dt);
    this.camera.updateProjectionMatrix();

    const moving = Math.min(1, (this.player.moveSpeed || 0) / 7.5);
    const t = performance.now() * .001;
    const look = this.player.input?.lastLook || { x: 0, y: 0 };
    this.swayX = damp(this.swayX, Math.max(-.025, Math.min(.025, -(look?.x || 0) * .00012)), 9, dt);
    this.swayY = damp(this.swayY, Math.max(-.018, Math.min(.018, (look?.y || 0) * .0001)), 9, dt);

    this.recoilKick = damp(this.recoilKick, 0, 15, dt);
    this.recoilYaw = damp(this.recoilYaw, 0, 13, dt);

    let targetX = ads ? 0 : .285;
    let targetY = ads ? -.185 : -.285;
    let targetZ = ads ? -.54 : -.68;

    if (this.player.isSprinting) {
      targetX = .38;
      targetY = -.42;
      targetZ = -.56;
    } else if (this.reloading > 0) {
      targetX = .34;
      targetY = -.39;
      targetZ = -.62;
    }

    const walkBobX = Math.sin(t * (this.player.isSprinting ? 11 : 8.5)) * .008 * moving;
    const walkBobY = Math.abs(Math.cos(t * (this.player.isSprinting ? 11 : 8.5))) * .006 * moving;

    this.group.position.x = damp(this.group.position.x, targetX, 15, dt) + walkBobX + this.swayX;
    this.group.position.y = damp(this.group.position.y, targetY, 15, dt) - walkBobY + this.swayY + this.recoilKick * .18;
    this.group.position.z = damp(this.group.position.z, targetZ, 15, dt) + this.recoilKick;

    const roll = (this.player.strafeInput || 0) * -.014 + Math.sin(t * 4.2) * .006 * moving;
    this.group.rotation.z = damp(this.group.rotation.z, roll, 10, dt);
    this.group.rotation.x = damp(this.group.rotation.x, this.recoilKick * -.55 + (this.player.isSprinting ? .14 : 0), 15, dt);
    this.group.rotation.y = damp(this.group.rotation.y, this.recoilYaw + (this.player.isSprinting ? -.12 : 0), 15, dt);

    if (this.input.wasPressed('KeyR')) this.reload();
    const wants = this.input.button(0);
    if (wants && (this.definition.automatic || this.fireClock <= 0)) this.tryFire();
  }

  tryFire() {
    if (this.fireClock > 0 || this.reloading > 0 || this.player.isSprinting) return;
    if (this.mag <= 0) {
      this.reload();
      return;
    }

    this.mag--;
    this.fireClock = 1 / (this.definition.fireRate * this.fireRateMultiplier);
    const spread = (this.aim > .7 ? this.definition.adsSpread : this.definition.spread) *
      (1 + Math.hypot(this.player.velocity.x, this.player.velocity.z) * .045);

    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    dir.x += (Math.random() - .5) * spread;
    dir.y += (Math.random() - .5) * spread;
    dir.z += (Math.random() - .5) * spread;
    dir.normalize();

    this.ray.set(this.camera.position, dir);
    this.ray.far = this.definition.range;
    let hit = this.enemies.raycast(this.ray);
    if (hit && this.world?.segmentBlocked(this.camera.position, hit.point)) hit = null;

    const end = hit
      ? hit.point
      : this.camera.position.clone().add(dir.clone().multiplyScalar(this.definition.range));
    this.effects.tracer(this.camera.position.clone().add(dir.clone().multiplyScalar(.8)), end, 0x8edfff);

    if (hit) {
      const mult = hit.critical ? 2.0 * this.critMultiplier : 1;
      this.enemies.damage(hit.enemy, this.definition.damage * mult, hit.critical);
      this.effects.burst(hit.point, hit.critical ? 0x7ddcff : 0xff5a42, hit.critical ? 18 : 8);
    }

    const recoil = this.definition.recoil * (this.aim > .7 ? .62 : 1);
    this.player.pitch = Math.max(-1.45, this.player.pitch - recoil * (.65 + Math.random() * .4));
    this.player.yaw += (Math.random() - .5) * recoil * .34;
    this.recoilKick = Math.min(.115, this.recoilKick + recoil * 3.1);
    this.recoilYaw += (Math.random() - .5) * recoil * 1.6;

    this.audio.shot();
    this.events.emit('weapon:fired', { hit });
  }

  reload() {
    if (!this.definition || this.reloading > 0 || this.mag >= this.definition.mag || this.reserve <= 0) return;
    this.reloading = this.definition.reload / (this.fireRateMultiplier > 1 ? 1.2 : 1);
    this.audio.reload();
  }

  finishReload() {
    const n = Math.min(this.definition.mag - this.mag, this.reserve);
    this.mag += n;
    this.reserve -= n;
  }

  addAmmo(n) {
    this.reserve = Math.min(this.definition?.reserve ?? 999, this.reserve + n);
  }
}
