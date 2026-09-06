import * as THREE from 'three';
import { damp } from '../core/math.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class Player {
  constructor({ camera, input, world, events, settings = {} }) {
    Object.assign(this, { camera, input, world, events, settings });
    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.slideDirection = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.health = 100;
    this.armor = 100;
    this.maxHealth = 100;
    this.maxArmor = 100;
    this.vertical = 0;
    this.grounded = true;
    this.eye = 1.72;
    this.speedMultiplier = 1;
    this.damageMultiplier = 1;
    this.bob = 0;
    this.stepTimer = 0;
    this.slide = 0;
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.cameraRoll = 0;
    this.landingKick = 0;
    this.isSprinting = false;
    this.isCrouching = false;
    this.isMoving = false;
    this.strafeInput = 0;
    this.moveSpeed = 0;
    this.configure({ health: 110, armor: 80, speed: 1 });
  }

  configure(def, start = { x: 0, z: 20 }) {
    this.classDef = def;
    this.maxHealth = def.health;
    this.maxArmor = def.armor;
    this.health = this.maxHealth;
    this.armor = this.maxArmor;
    this.position.set(start?.x ?? 0, 0, start?.z ?? 20);
    this.velocity.set(0, 0, 0);
    this.slideDirection.set(0, 0, 0);
    this.yaw = Math.PI;
    this.pitch = 0;
    this.vertical = 0;
    this.grounded = true;
    this.eye = 1.72;
    this.slide = 0;
    this.coyote = .1;
    this.jumpBuffer = 0;
    this.cameraRoll = 0;
    this.landingKick = 0;
    this.speedMultiplier = 1;
    this.damageMultiplier = 1;
    this.updateCamera();
  }

  update(dt) {
    const look = this.input.consumeLook();
    const sensitivity = clamp(Number(this.settings?.sensitivity) || .0019, .0003, .01);
    this.yaw -= look.x * sensitivity;
    this.pitch = clamp(this.pitch - look.y * sensitivity, -1.45, 1.45);

    let forwardInput = (this.input.down('KeyW') ? 1 : 0) - (this.input.down('KeyS') ? 1 : 0);
    let strafeInput = (this.input.down('KeyD') ? 1 : 0) - (this.input.down('KeyA') ? 1 : 0);
    const inputLength = Math.hypot(forwardInput, strafeInput) || 1;
    forwardInput /= inputLength;
    strafeInput /= inputLength;
    this.strafeInput = strafeInput;

    this.isCrouching = this.input.down('ControlLeft') || this.input.down('ControlRight');
    this.isSprinting = this.input.down('ShiftLeft') && forwardInput > .25 && !this.isCrouching && this.slide <= 0;

    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const wish = forward.multiplyScalar(forwardInput).add(right.multiplyScalar(strafeInput));
    if (wish.lengthSq() > 0) wish.normalize();

    const horizontalSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    if (this.input.wasPressed('ControlLeft') && this.grounded && horizontalSpeed > 6.2) {
      this.slide = .78;
      this.slideDirection.set(this.velocity.x, 0, this.velocity.z).normalize();
      if (this.slideDirection.lengthSq() < .1) this.slideDirection.copy(wish);
      this.events.emit('player:slide');
    }

    let targetX = 0;
    let targetZ = 0;
    let response = this.grounded ? 17 : 3.2;

    if (this.slide > 0) {
      this.slide = Math.max(0, this.slide - dt);
      this.isCrouching = true;
      this.isSprinting = false;
      const slideT = this.slide / .78;
      const slideSpeed = 7.4 + 4.8 * slideT;
      targetX = this.slideDirection.x * slideSpeed;
      targetZ = this.slideDirection.z * slideSpeed;
      response = 7;
    } else {
      const baseSpeed = this.isCrouching ? 3.55 : this.isSprinting ? 9.25 : 6.15;
      const speed = baseSpeed * this.classDef.speed * this.speedMultiplier;
      targetX = wish.x * speed;
      targetZ = wish.z * speed;
    }

    if (wish.lengthSq() === 0 && this.grounded && this.slide <= 0) response = 11;
    this.velocity.x = damp(this.velocity.x, targetX, response, dt);
    this.velocity.z = damp(this.velocity.z, targetZ, response, dt);

    this.world.moveObject(
      { position: this.position },
      new THREE.Vector3(this.velocity.x * dt, 0, this.velocity.z * dt),
      .43
    );

    if (this.input.wasPressed('Space')) this.jumpBuffer = .12;
    else this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);

    if (this.grounded) this.coyote = .1;
    else this.coyote = Math.max(0, this.coyote - dt);

    if (this.jumpBuffer > 0 && this.coyote > 0 && this.slide <= .08) {
      this.vertical = 7.35;
      this.grounded = false;
      this.coyote = 0;
      this.jumpBuffer = 0;
      this.events.emit('player:jump');
    }

    const wasGrounded = this.grounded;
    const previousVertical = this.vertical;
    this.vertical -= 20.5 * dt;
    this.position.y += this.vertical * dt;
    if (this.position.y <= 0) {
      this.position.y = 0;
      if (!wasGrounded && previousVertical < -3.5) {
        this.landingKick = Math.min(.085, Math.abs(previousVertical) * .006);
        this.events.emit('player:land', { speed: Math.abs(previousVertical) });
      }
      this.vertical = 0;
      this.grounded = true;
    }

    this.moveSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    this.isMoving = this.moveSpeed > .35;
    if (this.isMoving && this.grounded) {
      this.bob += dt * (this.isSprinting ? 12.5 : this.isCrouching ? 7.2 : 9.4);
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        this.stepTimer = this.isSprinting ? .29 : this.isCrouching ? .5 : .4;
        this.events.emit('player:step', { sprinting: this.isSprinting });
      }
    } else {
      this.stepTimer = Math.min(this.stepTimer, .12);
    }

    this.eye = damp(this.eye, this.isCrouching || this.slide > 0 ? 1.2 : 1.72, 11, dt);
    this.landingKick = damp(this.landingKick, 0, 13, dt);
    const rollTarget = -this.strafeInput * (this.isSprinting ? .018 : .011) + (this.slide > 0 ? -.012 * this.strafeInput : 0);
    this.cameraRoll = damp(this.cameraRoll, rollTarget, 10, dt);

    this.updateCamera();
  }

  updateCamera() {
    const movement = this.isMoving && this.grounded ? Math.min(1, this.moveSpeed / 7.5) : 0;
    const bobY = Math.abs(Math.sin(this.bob)) * .018 * movement;
    const bobX = Math.sin(this.bob * .5) * .022 * movement;
    const sprintDrop = this.isSprinting ? -.015 : 0;
    this.camera.position.set(
      this.position.x + Math.cos(this.yaw) * bobX,
      this.position.y + this.eye + bobY - this.landingKick + sprintDrop,
      this.position.z - Math.sin(this.yaw) * bobX
    );
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch - this.landingKick * .35;
    this.camera.rotation.z = this.cameraRoll;
  }

  damage(amount) {
    amount *= this.damageMultiplier;
    const absorbed = Math.min(this.armor, amount * .7);
    this.armor -= absorbed;
    this.health -= amount - absorbed;
    this.events.emit('player:damage', { health: this.health, armor: this.armor });
    if (this.health <= 0) {
      this.health = 0;
      this.events.emit('player:dead');
    }
  }

  heal(v) {
    this.health = Math.min(this.maxHealth, this.health + v);
  }
}
