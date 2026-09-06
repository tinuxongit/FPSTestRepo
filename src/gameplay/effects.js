import * as THREE from 'three';
export class Effects {
  constructor(scene){this.scene=scene;this.items=[];}
  tracer(from,to,color=0x62dcff){const geo=new THREE.BufferGeometry().setFromPoints([from,to]);const line=new THREE.Line(geo,new THREE.LineBasicMaterial({color,transparent:true,opacity:.85}));line.userData.life=.065;this.scene.add(line);this.items.push(line);}
  burst(pos,color=0xff6a3a,count=12){for(let i=0;i<count;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(.035,.035,.18),new THREE.MeshBasicMaterial({color}));m.position.copy(pos);m.userData={life:.3,vel:new THREE.Vector3((Math.random()-.5)*5,Math.random()*4,(Math.random()-.5)*5)};this.scene.add(m);this.items.push(m);}}
  explosion(pos,color=0xff7d35){const s=new THREE.Mesh(new THREE.SphereGeometry(1,16,10),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.7,blending:THREE.AdditiveBlending,depthWrite:false}));s.position.copy(pos);s.userData={life:.7,explosion:true};this.scene.add(s);this.items.push(s);this.burst(pos,color,32);}
  update(dt){for(let i=this.items.length-1;i>=0;i--){const o=this.items[i];o.userData.life-=dt;if(o.userData.vel){o.position.addScaledVector(o.userData.vel,dt);o.userData.vel.y-=8*dt;}if(o.userData.explosion){const p=1-o.userData.life/.7;o.scale.setScalar(1+p*8);o.material.opacity=Math.max(0,.7-p*.7);}else if(o.material?.opacity!==undefined)o.material.opacity=Math.min(o.material.opacity,o.userData.life*10);if(o.userData.life<=0){o.geometry?.dispose();o.material?.dispose();this.scene.remove(o);this.items.splice(i,1);}}}
}
