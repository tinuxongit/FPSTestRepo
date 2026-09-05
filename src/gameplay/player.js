import * as THREE from 'three';
import { TUNING } from '../config.js';

export class Player {
  constructor({ camera, input, world, events }) {
    this.camera = camera;
    this.input = input;
    this.world = world;
    this.events = events;

    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.verticalVelocity = 0;
    this.grounded = true;
    this.health = TUNING.player.maxHealth;
    this.alive = true;
    this.eyeHeight = TUNING.player.standingEye;
    this.bob = 0;
    this.stepClock = 0;
    this.slideTimer = 0;
    this.slideDirection = new THREE.Vector3();
    this.isMoving = false;
    this.isSprinting = false;
    this.isCrouching = false;
    this.lastLookDelta = { x: 0, y: 0 };
    this.reset();
  }

  reset() {
    this.position.set(0, 0, 18);
    this.velocity.set(0, 0, 0);
    this.yaw = 0;
    this.pitch = 0;
    this.verticalVelocity = 0;
    this.grounded = true;
    this.health = TUNING.player.maxHealth;
    this.alive = true;
    this.eyeHeight = TUNING.player.standingEye;
    this.bob = 0;
    this.stepClock = 0;
    this.slideTimer = 0;
    this.updateCamera(0);
  }

  update(dt) {
    if (!this.alive) return;

    const look = this.input.consumeMouseDelta();
    this.lastLookDelta = look;
    this.yaw -= look.x * TUNING.player.mouseSensitivity;
    this.pitch -= look.y * TUNING.player.mouseSensitivity;
    this.pitch = THREE.MathUtils.clamp(this.pitch, -1.42, 1.42);

    let forwardInput = 0;
    let strafeInput = 0;
    if (this.input.isDown('KeyW')) forwardInput += 1;
    if (this.input.isDown('KeyS')) forwardInput -= 1;
    if (this.input.isDown('KeyD')) strafeInput += 1;
    if (this.input.isDown('KeyA')) strafeInput -= 1;

    const inputLength = Math.hypot(forwardInput, strafeInput) || 1;
    forwardInput /= inputLength;
    strafeInput /= inputLength;

    this.isCrouching = this.input.isDown('ControlLeft') || this.input.isDown('ControlRight');
    this.isSprinting = this.input.isDown('ShiftLeft') && forwardInput > 0.25 && !this.isCrouching && this.slideTimer <= 0;

    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const wish = forward.multiplyScalar(forwardInput).add(right.multiplyScalar(strafeInput));
    if (wish.lengthSq() > 0) wish.normalize();

    if (this.input.wasPressed('ControlLeft') && this.grounded && this.velocity.length() > 5.5) {
      this.slideTimer = TUNING.player.slideDuration;
      this.slideDirection.copy(this.velocity).setY(0).normalize();
      if (this.slideDirection.lengthSq() < 0.1) this.slideDirection.copy(wish);
      this.events.emit('player:slide');
    }

    let targetVelocity = new THREE.Vector3();
    if (this.slideTimer > 0) {
      this.slideTimer = Math.max(0, this.slideTimer - dt);
      const factor = 0.55 + 0.45 * (this.slideTimer / TUNING.player.slideDuration);
      targetVelocity.copy(this.slideDirection).multiplyScalar(TUNING.player.slideSpeed * factor);
      this.isCrouching = true;
    } else {
      const speed = this.isCrouching
        ? TUNING.player.crouchSpeed
        : this.isSprinting
          ? TUNING.player.sprintSpeed
          : TUNING.player.walkSpeed;
      targetVelocity.copy(wish).multiplyScalar(speed);
    }

    const blend = 1 - Math.exp(-TUNING.player.acceleration * dt);
    this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, targetVelocity.x, blend);
    this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, targetVelocity.z, blend);
    this.isMoving = Math.hypot(this.velocity.x, this.velocity.z) > 0.35;

    this.world.moveWithCollision(
      this.position,
      new THREE.Vector3(this.velocity.x * dt, 0, this.velocity.z * dt),
      TUNING.player.radius
    );

    if (this.grounded && this.input.wasPressed('Space') && this.slideTimer <= 0.05) {
      this.verticalVelocity = TUNING.player.jumpVelocity;
      this.grounded = false;
      this.events.emit('player:jump');
    }

    this.verticalVelocity -= TUNING.player.gravity * dt;
    this.position.y += this.verticalVelocity * dt;
    if (this.position.y <= 0) {
      if (!this.grounded && this.verticalVelocity < -6) this.events.emit('player:land', { speed: -this.verticalVelocity });
      this.position.y = 0;
      this.verticalVelocity = 0;
      this.grounded = true;
    }

    const targetEye = this.isCrouching ? TUNING.player.crouchingEye : TUNING.player.standingEye;
    this.eyeHeight = THREE.MathUtils.lerp(this.eyeHeight, targetEye, 1 - Math.exp(-12 * dt));

    const moveSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    if (this.grounded && this.isMoving) {
      this.bob += dt * (this.isSprinting ? 13.5 : 10.5);
      this.stepClock -= dt;
      if (this.stepClock <= 0) {
        this.stepClock = this.isSprinting ? 0.29 : 0.39;
        this.events.emit('player:step', { sprinting: this.isSprinting });
      }
    } else {
      this.stepClock = Math.min(this.stepClock, 0.12);
    }

    this.updateCamera(moveSpeed);
  }

  updateCamera(moveSpeed = 0) {
    const bobAmount = this.grounded && this.isMoving ? Math.min(moveSpeed / 8, 1) : 0;
    const bobY = Math.sin(this.bob * 2) * 0.026 * bobAmount;
    const bobX = Math.sin(this.bob) * 0.018 * bobAmount;
    this.camera.position.set(this.position.x + bobX, this.position.y + this.eyeHeight + bobY, this.position.z);
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }

  addRecoil(pitch, yaw = 0) {
    this.pitch = THREE.MathUtils.clamp(this.pitch - pitch, -1.42, 1.42);
    this.yaw += yaw;
  }

  damage(amount, source = 'enemy') {
    if (!this.alive) return;
    this.health = Math.max(0, this.health - amount);
    this.events.emit('player:damage', { amount, source, health: this.health });
    if (this.health <= 0) {
      this.alive = false;
      this.events.emit('player:dead', { source });
    }
  }

  heal(amount) {
    if (!this.alive) return 0;
    const before = this.health;
    this.health = Math.min(TUNING.player.maxHealth, this.health + amount);
    return this.health - before;
  }
}
