export const VERSION = '2.0.0-modular';

export const TUNING = Object.freeze({
  renderer: {
    fov: 76,
    near: 0.05,
    far: 220,
    pixelRatioCap: 1.6,
    fogDensity: 0.011,
    shadowSize: 1024
  },
  player: {
    walkSpeed: 5.4,
    sprintSpeed: 8.3,
    crouchSpeed: 3.5,
    acceleration: 12,
    jumpVelocity: 6.6,
    gravity: 18.5,
    mouseSensitivity: 0.0019,
    radius: 0.42,
    standingEye: 1.72,
    crouchingEye: 1.12,
    maxHealth: 100,
    slideDuration: 0.62,
    slideSpeed: 10.5
  },
  weapon: {
    magazineSize: 30,
    startingReserve: 150,
    fireInterval: 0.087,
    reloadSeconds: 1.35,
    damage: 34,
    headMultiplier: 2.15,
    hipSpread: 0.010,
    adsSpread: 0.0022,
    moveSpread: 0.008,
    recoilPitch: 0.011,
    recoilYaw: 0.0045,
    adsFov: 58
  },
  enemies: {
    baseCount: 5,
    maxCount: 22,
    baseHp: 72,
    baseSpeed: 1.65,
    engageDistance: 28,
    attackDistance: 18,
    preferredDistance: 8
  },
  waves: {
    transitionSeconds: 2.1,
    healBetweenWaves: 15,
    ammoBetweenWaves: 30
  }
});
