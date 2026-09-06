import * as THREE from 'three';
import { EventBus } from './core/events.js';
import { Input } from './core/input.js';
import { GameLoop } from './core/loop.js';
import { createRenderer } from './core/renderer.js';
import { loadProfile,awardXP,saveProfile } from './core/storage.js';
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
import { Weather } from './render/weather.js';
import { HUD } from './ui/hud.js';
import { Menu } from './ui/menu.js';
import { AudioEngine } from './audio/audio.js';
import { operationById,ENDLESS_OPERATION } from './data/maps.js';
import { CLASSES } from './data/classes.js';
import { CITY_OPERATION } from './levels/city-layout.js';

/** Composition root only: systems own their state, assets and responsibilities. */
export class AshfallGame {
  constructor(canvas){
    this.profile=loadProfile();this.events=new EventBus();this.input=new Input(canvas);this.view=createRenderer(canvas,this.profile.settings.quality);
    this.world=new World(this.view.scene,this.view.sun);this.effects=new Effects(this.view.scene);this.audio=new AudioEngine();
    this.player=new Player({camera:this.view.camera,input:this.input,world:this.world,events:this.events,settings:this.profile.settings});
    this.projectiles=new ProjectileSystem({scene:this.view.scene,world:this.world,effects:this.effects});
    this.enemies=new EnemyDirector({scene:this.view.scene,world:this.world,player:this.player,events:this.events,projectiles:this.projectiles,effects:this.effects});
    this.weapon=new WeaponSystem({camera:this.view.camera,input:this.input,player:this.player,enemies:this.enemies,effects:this.effects,audio:this.audio,events:this.events,view:this.view,world:this.world});
    this.pickups=new Pickups({scene:this.view.scene,player:this.player,weapon:this.weapon,events:this.events});
    this.abilities=new AbilitySystem({scene:this.view.scene,input:this.input,player:this.player,weapon:this.weapon,enemies:this.enemies,effects:this.effects,events:this.events,audio:this.audio});
    this.missions=new MissionDirector({events:this.events,player:this.player,enemies:this.enemies,world:this.world,effects:this.effects,audio:this.audio,input:this.input});
    this.cinematics=new CinematicDirector({scene:this.view.scene,camera:this.view.camera,events:this.events,effects:this.effects,audio:this.audio});
    this.weather=new Weather(this.view.scene);
    this.hud=new HUD({events:this.events,player:this.player,weapon:this.weapon,abilities:this.abilities,missions:this.missions,profile:this.profile,world:this.world,enemies:this.enemies});
    this.menu=new Menu({profile:this.profile});this.active=false;this.score=this.kills=0;this.checkpoint=0;this.elapsed=0;this.fps=60;this.bind();this.preview();
    this.loop=new GameLoop((dt,t)=>this.update(dt,t));this.loop.start();document.body.dataset.ready='true';
  }
  setState(s){this.state=s;document.body.dataset.state=s;}
  bind(){
    this.menu.onDeploy(({operationId,classId,endless,quality})=>{quality=quality||this.profile.settings.quality||'high';this.profile.settings.quality=quality;this.view.setQuality(quality);this.start(endless?ENDLESS_OPERATION:operationId===CITY_OPERATION.id?CITY_OPERATION:operationById(operationId),classId);});
    this.hud.onResume(()=>this.input.lock());this.hud.onReturn(()=>this.returnToMenu());
    document.getElementById('retry-button').onclick=()=>this.start(this.operation,this.classId,this.checkpoint);
    document.getElementById('continue-button').onclick=()=>this.returnToMenu();
    document.addEventListener('pointerlockchange',()=>{if(!this.active)return;if(this.input.locked){this.setState('playing');this.hud.hidePause();}else{this.setState('paused');this.hud.showPause();}});
    this.events.on('enemy:killed',({enemy,critical})=>{this.kills++;this.score+=critical?180:100;this.hud.kill(enemy.userData.name);if(this.kills%3===0)this.pickups.spawn(enemy.position,this.kills%6===0?'health':'ammo');});
    this.events.on('mission:resupply',()=>this.weapon.addAmmo(50));
    this.events.on('checkpoint',({index})=>{this.checkpoint=index;});
    this.events.on('player:step',()=>this.audio.step());
    this.events.on('mission:complete',({operation})=>{this.active=false;this.setState('complete');document.exitPointerLock?.();this.hud.hidePause();const xp=1000+this.score;awardXP(this.profile,xp);this.profile.completed[operation.id]=(this.profile.completed[operation.id]||0)+1;saveProfile(this.profile);this.hud.showComplete(operation,this.score,this.kills,xp);});
    this.events.on('player:dead',()=>{this.active=false;this.setState('failed');document.exitPointerLock?.();this.hud.hidePause();this.hud.showComplete(this.operation,this.score,this.kills,0,true);});
  }
  preview(){if(this.world.operation?.id!==CITY_OPERATION.id||this.world.quality!==this.view.quality)this.world.build(CITY_OPERATION,this.view.quality);this.player.configure(CLASSES.vanguard,this.world.layout.start);this.player.pitch=.12;this.player.updateCamera();this.weapon.group.visible=false;this.setState('menu');}
  start(operation,classId,fromAct=0){
    this.clearSession();this.audio.start();if(this.audio.master)this.audio.master.gain.value=this.profile.settings.volume*.35;
    this.operation=operation;this.classId=CLASSES[classId]?classId:'vanguard';this.profile.lastClass=this.classId;saveProfile(this.profile);
    if(this.world.operation?.id!==operation.id||this.world.quality!==this.view.quality)this.world.build(operation,this.view.quality);const start=fromAct>0&&operation.acts[fromAct-1]?.point?{x:operation.acts[fromAct-1].point[0],z:operation.acts[fromAct-1].point[1]}:this.world.layout.start;
    this.player.configure(CLASSES[this.classId],start);this.weapon.configure(CLASSES[this.classId]);this.abilities.configure(CLASSES[this.classId]);this.enemies.reset(operation.difficulty);
    this.weapon.group.visible=true;this.active=true;this.score=this.kills=this.elapsed=0;this.hud.enter(operation,CLASSES[this.classId]);this.missions.start(operation,fromAct);this.setState('playing');
    if(!this.input.testLocked)this.input.lock().then(ok=>{if(!ok&&this.active){this.setState('paused');this.hud.showPause();}});
  }
  clearSession(){this.active=false;this.input.clear();this.missions.clear();this.enemies.clear();this.projectiles.clear();this.pickups.clear();this.abilities.clear();this.effects.clear();this.cinematics.clear?.();this.hud.hidePause();document.getElementById('mission-complete').classList.remove('show');}
  returnToMenu(){this.clearSession();document.exitPointerLock?.();this.preview();this.menu.show();}
  update(dt,time){
    if(this.active&&this.input.locked){this.elapsed+=dt;this.player.update(dt);this.weapon.update(dt);this.abilities.update(dt);this.enemies.update(dt);this.projectiles.update(dt,this.player);this.pickups.update(dt);if(this.active)this.missions.update(dt);this.cinematics.update(dt);this.effects.update(dt);}
    this.input.endFrame();this.world.update(dt,time);this.weather.visible=this.operation?.biome==='metropolis'||this.state==='menu';this.weather.update(dt,this.player.position);this.hud.update(dt);this.fps=this.fps*.95+(1/Math.max(.001,dt))*.05;this.view.render();
  }
}
