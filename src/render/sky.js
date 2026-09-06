import * as THREE from 'three';

export function addCloudSky(root){
  const group=new THREE.Group();
  const dome=new THREE.Mesh(new THREE.SphereGeometry(520,24,16),new THREE.MeshBasicMaterial({color:0x263447,side:THREE.BackSide,fog:false}));group.add(dome);
  const cloudMat=new THREE.MeshBasicMaterial({color:0x9fb0c2,transparent:true,opacity:.11,depthWrite:false,fog:false});
  for(let i=0;i<22;i++){
    const cloud=new THREE.Mesh(new THREE.SphereGeometry(1,10,7),cloudMat);const a=i/22*Math.PI*2,r=160+(i%5)*18;
    cloud.position.set(Math.cos(a)*r,62+(i%4)*14,Math.sin(a)*r);cloud.scale.set(24+(i%7)*5,5+(i%3)*2,12+(i%5)*3);group.add(cloud);
  }
  root.add(group);
  return {update(t){group.rotation.y=t*.0025;},dispose(){root.remove(group);dome.geometry.dispose();dome.material.dispose();cloudMat.dispose();}};
}
