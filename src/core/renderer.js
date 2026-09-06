import * as THREE from 'three';

export function createRenderer(canvas,initialQuality='high') {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', alpha: false });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(76, innerWidth / innerHeight, .05, 900);camera.rotation.order='YXZ';
  const hemi = new THREE.HemisphereLight(0xaec9ff, 0x11161d, 1.15);scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xc9ddff, 2.7);sun.position.set(45,85,20);scene.add(sun);
  let quality='high';
  function setQuality(next='high'){
    quality=['low','medium','high'].includes(next)?next:'high';
    renderer.setPixelRatio(Math.min(devicePixelRatio,quality==='high'?1.55:quality==='medium'?1.25:1));
    renderer.shadowMap.enabled=quality!=='low';renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    sun.castShadow=quality!=='low';sun.shadow.mapSize.set(quality==='high'?2048:1024,quality==='high'?2048:1024);
    sun.shadow.camera.left=-115;sun.shadow.camera.right=115;sun.shadow.camera.top=115;sun.shadow.camera.bottom=-115;sun.shadow.camera.near=.5;sun.shadow.camera.far=260;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.setSize(innerWidth,innerHeight,false);
  }
  setQuality(initialQuality);
  const resize=()=>{renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();};addEventListener('resize',resize);
  return {renderer,scene,camera,sun,get quality(){return quality;},setQuality,render:()=>renderer.render(scene,camera)};
}
