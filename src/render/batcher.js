import * as THREE from 'three';

const UNIT = {
  box: new THREE.BoxGeometry(1,1,1),
  cylinder: new THREE.CylinderGeometry(.5,.5,1,12),
  sphere: new THREE.SphereGeometry(.5,10,8)
};

export class Batcher {
  constructor(root){this.root=root;this.groups=new Map();}
  _key(type,mat){if(!mat.userData.__batchId)mat.userData.__batchId=`m${Math.random().toString(36).slice(2)}`;return `${type}:${mat.userData.__batchId}`;}
  add(type,mat,x,y,z,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0){
    const key=this._key(type,mat);if(!this.groups.has(key))this.groups.set(key,{type,mat,items:[]});
    this.groups.get(key).items.push({x,y,z,sx,sy,sz,rx,ry,rz});return this;
  }
  box(mat,x,y,z,w,h,d,ry=0){return this.add('box',mat,x,y,z,w,h,d,0,ry,0);}
  pole(mat,x,y,z,r,h){return this.add('cylinder',mat,x,y,z,r*2,h,r*2);}
  ball(mat,x,y,z,r,sy=1){return this.add('sphere',mat,x,y,z,r*2,r*2*sy,r*2);}
  beam(mat,a,b,r=.03){
    const mid=a.clone().add(b).multiplyScalar(.5),len=a.distanceTo(b);
    const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,len,6),mat);mesh.position.copy(mid);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize());mesh.castShadow=false;this.root.add(mesh);return mesh;
  }
  flush(){
    const dummy=new THREE.Object3D();
    for(const {type,mat,items} of this.groups.values()){
      if(!items.length)continue;
      const mesh=new THREE.InstancedMesh(UNIT[type]||UNIT.box,mat,items.length);mesh.castShadow=true;mesh.receiveShadow=true;
      items.forEach((it,i)=>{dummy.position.set(it.x,it.y,it.z);dummy.rotation.set(it.rx,it.ry,it.rz);dummy.scale.set(it.sx,it.sy,it.sz);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});
      mesh.instanceMatrix.needsUpdate=true;this.root.add(mesh);
    }
    this.groups.clear();
  }
}
