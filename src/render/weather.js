import * as THREE from 'three';

export class Weather {
  constructor(scene,count=850){
    this.scene=scene;this.visible=true;this.range=42;const pos=new Float32Array(count*3);this.vel=new Float32Array(count);
    for(let i=0;i<count;i++){pos[i*3]=(Math.random()-.5)*this.range*2;pos[i*3+1]=Math.random()*28;pos[i*3+2]=(Math.random()-.5)*this.range*2;this.vel[i]=18+Math.random()*18;}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
    const mat=new THREE.PointsMaterial({color:0xaed6ff,size:.045,transparent:true,opacity:.45,depthWrite:false,blending:THREE.AdditiveBlending});
    this.points=new THREE.Points(geo,mat);this.points.frustumCulled=false;scene.add(this.points);
  }
  update(dt,center){this.points.visible=this.visible;if(!this.visible)return;const a=this.points.geometry.attributes.position.array;for(let i=0;i<this.vel.length;i++){a[i*3+1]-=this.vel[i]*dt;if(a[i*3+1]<0)a[i*3+1]=26+Math.random()*8;}this.points.position.set(center.x,0,center.z);this.points.geometry.attributes.position.needsUpdate=true;}
}
