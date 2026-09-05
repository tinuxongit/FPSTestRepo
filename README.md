# FPSTestRepo

A fully modular, true-3D browser FPS prototype built with Three.js and native ES modules.

## Play

GitHub Pages: `https://tinuxongit.github.io/FPSTestRepo/`

## Controls

- **WASD** — movement
- **Shift** — sprint
- **Ctrl** — crouch / slide while moving fast
- **Space** — jump
- **Mouse** — look
- **Left mouse** — automatic fire
- **Right mouse** — ADS
- **R** — reload
- **Esc** — release pointer / pause

## Architecture

The game intentionally has no monolithic engine file. Systems communicate through explicit dependencies and a small event bus.

```text
src/
  main.js                 composition root / game loop
  config.js               tuning constants
  core/
    events.js             event bus
    input.js              keyboard, mouse, pointer lock
    renderer.js           Three.js renderer, scene, camera, lighting
  world/
    materials.js          procedural textures/materials
    world.js              level geometry, collisions, LOS, spawns
  gameplay/
    player.js             movement, jump, crouch, slide, health
    weapon.js             viewmodel, ADS, recoil, firing, reload
    enemies.js            waves, humanoid targets, AI, hitboxes
    effects.js            tracers, sparks, impact effects
    pickups.js            health/ammo drops
  game/
    session.js            score, wave progression, game-over state
  audio/
    audio.js              procedural WebAudio effects
  ui/
    hud.js                HUD, menu, hitmarkers, messages, kill feed
styles/
  app.css                 CSS composition entry
  tokens.css              design tokens
  base.css                document/canvas reset
  hud.css                 in-game HUD
  overlay.css             menus/errors
```

## Design goals

- Real WebGL 3D with perspective projection, shadows, lighting and fog.
- No copyrighted game assets: geometry, textures and sound effects are generated locally.
- Clear module ownership so movement, AI, weapons or UI can be replaced independently.
- No build step. GitHub Pages serves the ES modules directly.
- Three.js is pinned to r162 for broader WebGL compatibility.
