import * as THREE from 'three';
/** Objective state is simulation-time based. Pause/retry cannot leave old callbacks running. */
export class MissionDirector {
  constructor({events,player,enemies,world,effects,audio,input}){Object.assign(this,{events,player,enemies,world,effects,audio,input});this.operation=null;this.complete=false;this.actIndex=0;this.progress=0;this.marker=null;events.on('enemy:killed',p=>this.onKill(p));}
  get act(){return this.operation?.acts[this.actIndex];}
  start(op,fromAct=0){this.operation=op;this.actIndex=fromAct;this.complete=false;this.kills=0;this.beginAct();}
  beginAct(){
    this.progress=0;this.interact=0;this.boss=null;this.containmentTimer=0;
    if(this.marker){this.world.removeMarker(this.marker);this.marker=null;}
    if(!this.act)return this.finish();
    this.marker=this.world.createObjectiveMarker(this.world.objectivePoint(this.actIndex));
    if(this.act.spawn){for(const p of this.act.spawn)this.enemies.spawn('soldier',{x:p[0],z:p[1]});}
    else{const count=this.act.type==='eliminate'?Math.min(this.act.amount,16):4;for(let i=0;i<count;i++)this.enemies.spawn();}
    if(this.act.type==='hunt')this.boss=this.enemies.spawnBoss({x:this.marker.position.x,z:this.marker.position.z});
    if(this.act.type==='endless')this.enemies.endless=true;
    this.events.emit('mission:act',{act:this.act,index:this.actIndex,total:this.operation.acts.length});
    if(this.act.radio)this.events.emit('radio',{text:this.act.radio});
    this.events.emit('checkpoint',{index:this.actIndex});
  }
  update(dt){
    if(this.complete||!this.act)return;
    const act=this.act,d=this.player.position.distanceTo(this.marker.position),need=act.hold||3;
    if(['uplink','sabotage','extraction','containment'].includes(act.type)){
      if(this.containmentTimer>0){this.containmentTimer-=dt;if(this.containmentTimer<=0)this.advance();return;}
      if(d<3){this.events.emit('interaction',{text:`HOLD E · ${act.type==='extraction'?'BOARD EXTRACTION':'INTERACT'} · ${Math.floor(this.interact/need*100)}%`});this.interact=this.input.down('KeyE')?this.interact+dt:Math.max(0,this.interact-dt*2);
        if(this.interact>=need){if(act.type==='containment'){this.events.emit('cinematic:detonation',{position:this.marker.position.clone()});this.containmentTimer=6;}else if(act.type==='sabotage'&&++this.progress<act.amount){this.interact=0;this.marker.position.copy(this.world.objectivePoint((this.actIndex+this.progress)%this.operation.acts.length));}else this.advance();}}
      else this.interact=0;
    }else if(act.type==='defense'){
      const contested=this.enemies.list.some(e=>e.position.distanceTo(this.marker.position)<8);this.contested=contested;
      if(d<10&&!contested)this.progress+=dt;
      this.events.emit('interaction',{text:d>=10?'RETURN TO THE UPLINK':contested?'UPLINK CONTESTED · CLEAR HOSTILES':`TRANSMITTING · ${Math.floor(this.progress/act.amount*100)}%`});
      if(this.progress>=act.amount)this.advance();
    }
  }
  onKill({enemy}){if(this.complete||!this.act)return;this.kills++;if(this.act.type==='eliminate'&&++this.progress>=this.act.amount)this.advance();else if(this.act.type==='hunt'&&enemy===this.boss)this.advance();else if(this.act.type==='endless')this.progress=this.kills;}
  advance(){if(this.complete)return;this.actIndex++;this.player.heal(20);this.events.emit('mission:resupply');this.beginAct();}
  finish(){if(this.complete)return;this.complete=true;if(this.marker){this.world.removeMarker(this.marker);this.marker=null;}this.events.emit('mission:complete',{operation:this.operation});}
  clear(){this.operation=null;this.complete=false;if(this.marker){this.world.removeMarker(this.marker);this.marker=null;}}
}
