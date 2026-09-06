import * as THREE from 'three';
function noisyTexture(base,accent='255,255,255',size=128){const c=document.createElement('canvas');c.width=c.height=size;const x=c.getContext('2d');x.fillStyle=base;x.fillRect(0,0,size,size);for(let i=0;i<1800;i++){const v=Math.random()*.11;x.fillStyle=`rgba(${accent},${v})`;x.fillRect(Math.random()*size,Math.random()*size,1+Math.random()*3,1+Math.random()*3);}const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(4,4);t.colorSpace=THREE.SRGBColorSpace;return t;}
export function createMaterials(biome){
  const asphalt=noisyTexture('#171d24','180,205,225'), concrete=noisyTexture('#4b535d','255,255,255'), wall=noisyTexture('#26313b','160,190,220');
  return {
    ground:new THREE.MeshStandardMaterial({color:biome.ground,map:asphalt,roughness:.88,metalness:.05}),
    road:new THREE.MeshPhysicalMaterial({color:0x171e26,map:asphalt,roughness:.22,metalness:.18,clearcoat:.7,clearcoatRoughness:.25}),
    concrete:new THREE.MeshStandardMaterial({map:concrete,color:0x68737f,roughness:.78,metalness:.08}),
    wall:new THREE.MeshStandardMaterial({map:wall,color:0x313d49,roughness:.62,metalness:.28}),
    metal:new THREE.MeshStandardMaterial({color:0x242c35,roughness:.33,metalness:.84}),
    steel:new THREE.MeshStandardMaterial({color:0x55626f,roughness:.34,metalness:.9}),
    dark:new THREE.MeshStandardMaterial({color:0x10161d,roughness:.48,metalness:.62}),
    rubber:new THREE.MeshStandardMaterial({color:0x090b0e,roughness:.9,metalness:.02}),
    glass:new THREE.MeshPhysicalMaterial({color:0x24445f,roughness:.16,metalness:.08,transparent:true,opacity:.56,transmission:.12}),
    window:new THREE.MeshStandardMaterial({color:0x183148,roughness:.2,metalness:.35,emissive:0x0b1e34,emissiveIntensity:.85}),
    accent:new THREE.MeshStandardMaterial({color:biome.accent,emissive:biome.accent,emissiveIntensity:2.5}),
    cyan:new THREE.MeshBasicMaterial({color:0x62dfff,toneMapped:false}),
    orange:new THREE.MeshBasicMaterial({color:0xff9d4d,toneMapped:false}),
    red:new THREE.MeshBasicMaterial({color:0xff4b4b,toneMapped:false}),
    green:new THREE.MeshStandardMaterial({color:0x2d6f48,roughness:.8}),
    blue:new THREE.MeshStandardMaterial({color:0x203a55,roughness:.32,metalness:.62}),
    white:new THREE.MeshBasicMaterial({color:0xe8f5ff,toneMapped:false})
  };
}
