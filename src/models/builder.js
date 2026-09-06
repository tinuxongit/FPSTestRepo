import * as THREE from 'three';
export const mesh = (geometry,material,cast=true,receive=true)=>{const m=new THREE.Mesh(geometry,material);m.castShadow=cast;m.receiveShadow=receive;return m;};
export function boxPart(group,size,pos,material,rot=[0,0,0]){const m=mesh(new THREE.BoxGeometry(...size),material);m.position.set(...pos);m.rotation.set(...rot);group.add(m);return m;}
export function cylPart(group,r,h,pos,material,rot=[0,0,0],segments=12){const m=mesh(new THREE.CylinderGeometry(r,r,h,segments),material);m.position.set(...pos);m.rotation.set(...rot);group.add(m);return m;}
