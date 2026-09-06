import * as THREE from 'three';
import { EventBus } from './core/events.js';
import { Input } from './core/input.js';
import { GameLoop } from './core/loop.js';
import { createRenderer } from './core/renderer.js';
import { loadProfile, awardXP, saveProfile } from './core/storage.js';
import { World } from './world/world.js';
import { Player } from './gameplay/player.js';
import { WeaponSystem } from './gameplay/weapons.js';
import { EnemyDirector } from './gameplay/enemies.js';
import { Effects } from './gameplay/effects.js';
import { Pickups } from './gameplay/pickups.js';
import { ProjectileSystem } from './gameplay/projectiles.js';
import { AbilitySystem } from './gameplay/abilities.js';
import { MissionDirector } from './missions/director.js';
import { CinematicDirector } from './missions/cinematic.js';
import { HUD } from './ui/hud.js';
import { Menu } from './ui/menu.js';
import { AudioEngine } from './audio/audio.js';
import { operationById, ENDLESS_OPERATION } from './data/maps.js';
import { CLASSES } from './data/classes.js';

export class AshfallGame {
  constructor(canvas) {
    this.events = new EventBus(); this.input = new Input(canvas); this.view = createRenderer(canvas); this.profile = loadProfile();
    this.world = new World(this.view.scene, this.view.sun); this.effects = new Effects(this.view.scene); this.audio = new AudioEngine();
    this.player = new Player({ camera:this.view.camera, input:this.input, world:this.world, events:this.events });
    this.projectiles = new ProjectileSystem({ scene:this.view.scene, world:this.world, effects:this.effects });
    this.enemies = new EnemyDirector({ scene:this.view.scene, world:this.world, player:this.player, events:this.events, projectiles:this.projectiles, effects:this.effects });
    this.weapon = new WeaponSystem({ camera:this.view.camera, input:this.input, player:this.player, enemies:this.enemies, effects:this.effects, audio:this.audio, events:this.events });
    this.pickups = new Pickups({ scene:this.view.scene, player:this.player, weapon:this.weapon, events:this.events });
    this.abilities = new AbilitySystem({ scene:this.view.scene, input:this.input, player:this.player, weapon:this.weapon, enemies:this.enemies, effects:this.effects, events:this.events, audio:this.audio });
    this.missions = new MissionDirector({ events:this.events, player:this.player, enemies:this.enemies, world:this.world, effects:this.effects, audio:this.audio });
    this.cinematics = new CinematicDirector({ scene:this.view.scene, camera:this.view.camera, events:this.events, effects:this.effects, audio:this.audio });
    this.hud = new HUD({ events:this.events, player:this.player, weapon:this.weapon, abilities:this.abilities, missions:this.missions, profile:this.profile });
    this.menu = new Menu({ profile:this.profile }); this.loop = new GameLoop((dt,t) => this.update(dt,t)); this.active = false; this.score = 0; this.kills = 0;
    this.bind(); this.loop.start();
  }
  bind() {
    this.menu.onDeploy(({operationId,classId,endless}) => this.start(endless ? ENDLESS_OPERATION : operationById(operationId), classId));
    this.hud.onResume(() => this.input.lock()); this.hud.onReturn(() => this.returnToMenu());
    document.addEventListener('pointerlockchange', () => { if (this.active && !this.input.locked && !this.missions.complete) this.hud.showPause(); });
    this.events.on('enemy:killed', ({enemy, critical}) => { this.kills++; this.score += critical ? 180 : 100; this.hud.kill(enemy.name || 'HOSTILE'); this.audio[critical?'crit':'hit'](); });
    this.events.on('mission:complete', ({operation}) => { this.active=false; document.exitPointerLock?.(); const xp = 1000 + this.score + operation.difficulty*300; awardXP(this.profile, xp); this.profile.completed[operation.id] = (this.profile.completed[operation.id]||0)+1; saveProfile(this.profile); this.hud.showComplete(operation, this.score, this.kills, xp); });
    this.events.on('player:dead', () => { this.active=false; document.exitPointerLock?.(); this.hud.showComplete({name:'Combat Loss'}, this.score, this.kills, 0, true); });
  }
  start(operation, classId) {
    this.audio.start(); this.active=true; this.score=0; this.kills=0; this.profile.lastClass=classId; saveProfile(this.profile);
    this.world.build(operation); this.player.configure(CLASSES[classId]); this.weapon.configure(CLASSES[classId]); this.abilities.configure(CLASSES[classId]); this.enemies.reset(operation.difficulty); this.pickups.clear(); this.missions.start(operation); this.hud.enter(operation, CLASSES[classId]); this.input.lock();
  }
  returnToMenu(){ this.active=false; this.enemies.clear(); this.projectiles.clear(); this.pickups.clear(); this.world.clear(); this.hud.hidePause(); this.menu.show(); }
  update(dt, time) {
    if (this.active && this.input.locked) {
      this.player.update(dt); this.weapon.update(dt); this.abilities.update(dt); this.enemies.update(dt); this.projectiles.update(dt); this.pickups.update(dt); this.missions.update(dt); this.cinematics.update(dt); this.input.endFrame();
    }
    this.effects.update(dt); this.world.update(dt,time); this.hud.update(dt); this.view.render();
  }
}
