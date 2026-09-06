import * as THREE from 'three';
import { operationBiome } from '../data/maps.js';
import { generateLayout } from './layout.js';
import { createMaterials } from './materials.js';
import { addBiomeProps } from './props.js';
import { createSky } from './sky.js';
import { circleAabb,segmentAabb } from './collision.js';
import { NavigationGrid } from './navigation.js';
import { mulberry32 } from '../core/math.js';
import { CITY_OPERATION,createCityLayout } from '../levels/city-layout.js';
import { buildCity } from '../levels/city-scene.js';

export class World {
  constructor(scene,sun){this.scene=scene;this.sun=sun;this.root=new THREE.Group();scene.add(this.root);this.colliders=[];this.city=null;this.quality='high';}
  clear(){this.city?.dispose?.();this.city=null;while(this.root.children.length)this.root.remove(this.root.children[0]);this.scene.background=null;this.scene.fog=null;}
  build(op,quality='high'){
    this.clear();this.operation=op;this.quality=quality||'high';this.biome=operationBiome(op);this.materials=createMaterials(this.biome);
    if(op.id===CITY_OPERATION.id){
      this.layout=createCityLayout();this.colliders=this.layout.colliders;this.nav=new NavigationGrid(this.layout);this.scene.background=new THREE.Color(0x1a2635);this.scene.fog=new THREE.FogExp2(0x253649,.0044);this.city=buildCity(this.root,this.layout,this.materials,this.quality);this.sun.color.setHex(0xbfd6ff);this.sun.intensity=2.5;return;
    }
    this.layout=generateLayout(op.seed,op.biome);this.layout.start={x:0,z:20};this.colliders=this.layout.colliders;this.nav=new NavigationGrid(this.layout);this.scene.background=new THREE.Color(this.biome.sky);this.scene.fog=new THREE.FogExp2(this.biome.fog,.009);
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(80,80),this.materials.ground);ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;this.root.add(ground);
    for(const s of this.layout.structures){const m=new THREE.Mesh(new THREE.BoxGeometry(s.w,s.h,s.d),s.variant===0?this.materials.metal:this.materials.concrete);m.position.set(s.x,s.h/2,s.z);m.castShadow=m.receiveShadow=true;this.root.add(m);if(s.h>5){const strip=new THREE.Mesh(new THREE.BoxGeometry(s.w*.72,.12,s.d+.03),this.materials.accent);strip.position.set(s.x,s.h*.72,s.z-s.d/2-.03);this.root.add(strip);}}
    const rng=mulberry32(op.seed+77);this.props=addBiomeProps(this.root,this.biome,rng,70*this.biome.density);this.sky=createSky(this.root,this.biome);this.sun.color.setHex(op.biome==='foundry'?0xff9d5c:op.biome==='glacier'?0xd9f2ff:0xffe2bd);this.sun.intensity=op.biome==='orbital'?1.25:2.8;
  }
  moveObject(obj,delta,r=.4){let nx=obj.position.x+delta.x,nz=obj.position.z;if(!this.colliders.some(c=>circleAabb(nx,nz,r,c)))obj.position.x=nx;nx=obj.position.x;nz=obj.position.z+delta.z;if(!this.colliders.some(c=>circleAabb(nx,nz,r,c)))obj.position.z=nz;}
  segmentBlocked(a,b){return this.colliders.some(c=>segmentAabb(a,b,c));}
  hasLineOfSight(a,b){return !this.segmentBlocked(a,b);}
  randomSpawn(away,min=12){const list=this.layout.spawn.filter(p=>Math.hypot(p.x-away.x,p.z-away.z)>min);return list[Math.floor(Math.random()*list.length)]||{x:-20,z:-20};}
  objectivePoint(i){const act=this.operation?.acts?.[i];if(act?.point)return new THREE.Vector3(act.point[0],0,act.point[1]);const list=this.layout.spawn;return new THREE.Vector3(list[(i*7+3)%list.length]?.x||15,0,list[(i*7+3)%list.length]?.z||-15);}
  createObjectiveMarker(pos){const g=new THREE.Group();const ring=new THREE.Mesh(new THREE.TorusGeometry(.8,.05,8,28),new THREE.MeshBasicMaterial({color:0x5de7ff}));ring.rotation.x=Math.PI/2;ring.position.y=.08;const beam=new THREE.Mesh(new THREE.CylinderGeometry(.04,.12,12,8),new THREE.MeshBasicMaterial({color:0x57cfff,transparent:true,opacity:.25,blending:THREE.AdditiveBlending}));beam.position.y=6;g.add(ring,beam);g.position.copy(pos);this.root.add(g);return g;}
  removeMarker(m){this.root.remove(m);}
  update(dt,t){this.city?.update?.(dt,t);if(this.props)this.props.rotation.y=Math.sin(t*.04)*.003;}
}
