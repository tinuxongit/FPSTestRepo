import * as THREE from 'three';
import { TUNING } from '../config.js';

export class Weapon {
  constructor({ camera, input, player, events, resolveShot, materials }) {
    this.camera = camera;
    this.input = input;
    this.player = player;
    this.events = events;
    this.resolveShot = resolveShot;
    this.materials = materials;

    this.ammo = TUNING.weapon.magazineSize;
    this.reserve = TUNING.weapon.startingReserve;
    this.cooldown = 0;
    this.reloadTimer = 0;
    this.reloading = false;
    this.aiming = false;
    this.visualKick = 0;
    this.spread = TUNING.weapon.hipSpread;
    this.raycaster = new THREE.Raycaster();
    this.ndc = new THREE.Vector2();
    this.group = this.buildViewModel();
    this.camera.add(this.group);
  }

  buildViewModel() {
    const group = new THREE.Group();
    const dark = this.materials.metalDark;
    const metal = this.materials.metal;

    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.18, 0.62), dark);
    receiver.position.z = -0.04;
    group.add(receiver);

    const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.5), metal);
    handguard.position.z = -0.49;
    group.add(handguard);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.55, 10), dark);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.01, -0.84);
    group.add(barrel);

    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 0.34), dark);
    stock.position.set(0, -0.02, 0.39);
    group.add(stock);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.105, 0.29, 0.14), dark);
    grip.position.set(0, -0.22, 0.02);
    grip.rotation.x = -0.18;
    group.add(grip);

    const sight = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.075, 0.16), dark);
    sight.position.set(0, 0.14, -0.2);
    group.add(sight);

    this.muzzleLight = new THREE.PointLight(0xffb454, 0, 5, 2);
    this.muzzleLight.position.set(0, 0.01, -1.13);
    group.add(this.muzzleLight);

    group.position.set(0.34, -0.31, -0.72);
    group.rotation.set(-0.04, -0.04, 0);
    return group;
  }

  reset() {
    this.ammo = TUNING.weapon.magazineSize;
    this.reserve = TUNING.weapon.startingReserve;
    this.cooldown = 0;
    this.reloadTimer = 0;
    this.reloading = false;
    this.aiming = false;
    this.visualKick = 0;
  }

  addReserve(amount) {
    const before = this.reserve;
    this.reserve = Math.min(240, this.reserve + amount);
    return this.reserve - before;
  }

  startReload() {
    if (this.reloading || this.ammo >= TUNING.weapon.magazineSize || this.reserve <= 0) return;
    this.reloading = true;
    this.reloadTimer = TUNING.weapon.reloadSeconds;
    this.events.emit('weapon:reload', { seconds: this.reloadTimer });
  }

  finishReload() {
    const needed = TUNING.weapon.magazineSize - this.ammo;
    const moved = Math.min(needed, this.reserve);
    this.ammo += moved;
    this.reserve -= moved;
    this.reloading = false;
    this.events.emit('weapon:reload-complete');
  }

  fire() {
    if (this.reloading || this.cooldown > 0) return;
    if (this.ammo <= 0) {
      this.events.emit('weapon:empty');
      this.startReload();
      this.cooldown = 0.18;
      return;
    }

    this.ammo -= 1;
    this.cooldown = TUNING.weapon.fireInterval;
    this.visualKick = Math.min(1, this.visualKick + 0.75);
    this.muzzleLight.intensity = 11;

    const movingPenalty = this.player.isMoving ? TUNING.weapon.moveSpread : 0;
    const baseSpread = this.aiming ? TUNING.weapon.adsSpread : TUNING.weapon.hipSpread;
    this.spread = baseSpread + movingPenalty * (this.aiming ? 0.28 : 1);
    this.ndc.set((Math.random() - 0.5) * this.spread, (Math.random() - 0.5) * this.spread);
    this.raycaster.setFromCamera(this.ndc, this.camera);

    const result = this.resolveShot(this.raycaster, TUNING.weapon.damage, TUNING.weapon.headMultiplier);
    const from = new THREE.Vector3();
    this.muzzleLight.getWorldPosition(from);
    const to = result?.point?.clone() || this.raycaster.ray.origin.clone().add(this.raycaster.ray.direction.clone().multiplyScalar(90));

    this.player.addRecoil(
      TUNING.weapon.recoilPitch * (this.aiming ? 0.68 : 1),
      (Math.random() - 0.5) * TUNING.weapon.recoilYaw
    );

    this.events.emit('weapon:shot', { from, to, result });
    if (result?.enemy) this.events.emit('combat:hit', result);
  }

  update(dt) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.visualKick = Math.max(0, this.visualKick - dt * 8.5);
    this.muzzleLight.intensity = Math.max(0, this.muzzleLight.intensity - dt * 120);

    this.aiming = this.input.isButtonDown(2) && !this.player.isSprinting && !this.reloading;

    if (this.input.wasPressed('KeyR')) this.startReload();
    if (this.reloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) this.finishReload();
    } else if (this.input.isButtonDown(0)) {
      this.fire();
    }

    const targetFov = this.aiming ? TUNING.weapon.adsFov : TUNING.renderer?.fov || 76;
    const nextFov = THREE.MathUtils.lerp(this.camera.fov, targetFov, 1 - Math.exp(-13 * dt));
    if (Math.abs(nextFov - this.camera.fov) > 0.01) {
      this.camera.fov = nextFov;
      this.camera.updateProjectionMatrix();
    }

    const hip = new THREE.Vector3(0.34, -0.31, -0.72);
    const ads = new THREE.Vector3(0, -0.145, -0.52);
    const sprint = new THREE.Vector3(0.48, -0.42, -0.58);
    const target = this.player.isSprinting ? sprint : this.aiming ? ads : hip;
    this.group.position.lerp(target, 1 - Math.exp(-15 * dt));

    const swayX = THREE.MathUtils.clamp(this.player.lastLookDelta.x * 0.00014, -0.018, 0.018);
    const swayY = THREE.MathUtils.clamp(this.player.lastLookDelta.y * 0.00012, -0.014, 0.014);
    const kick = this.visualKick * 0.055;
    this.group.rotation.x = THREE.MathUtils.lerp(this.group.rotation.x, -0.035 + kick + swayY, 1 - Math.exp(-18 * dt));
    this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, -0.035 + swayX, 1 - Math.exp(-18 * dt));
    this.group.rotation.z = THREE.MathUtils.lerp(this.group.rotation.z, this.player.isSprinting ? -0.25 : 0, 1 - Math.exp(-11 * dt));

    const movingPenalty = this.player.isMoving ? TUNING.weapon.moveSpread : 0;
    this.spread = (this.aiming ? TUNING.weapon.adsSpread : TUNING.weapon.hipSpread) + movingPenalty * (this.aiming ? 0.28 : 1);
  }
}
