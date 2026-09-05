import * as THREE from 'three';
import { TUNING } from '../config.js';

function rendererFailureMessage(error, contextErrors) {
  const probe = document.createElement('canvas');
  let webgl2 = false;
  let webgl1 = false;
  try { webgl2 = !!probe.getContext('webgl2'); } catch {}
  try { webgl1 = !!probe.getContext('webgl'); } catch {}
  const support = `WebGL2=${webgl2 ? 'yes' : 'no'}, WebGL1=${webgl1 ? 'yes' : 'no'}`;
  const details = contextErrors.length ? ` Context: ${contextErrors.join(' | ')}` : '';
  return `${error?.message || error}. ${support}.${details}`;
}

export function createRenderEnvironment(canvas) {
  const contextErrors = [];
  canvas.addEventListener('webglcontextcreationerror', event => {
    contextErrors.push(event.statusMessage || 'context creation failed');
  });

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      stencil: false,
      powerPreference: 'default',
      failIfMajorPerformanceCaveat: false
    });
  } catch (error) {
    throw new Error(rendererFailureMessage(error, contextErrors));
  }

  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, TUNING.renderer.pixelRatioCap));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87969d);
  scene.fog = new THREE.FogExp2(0x87969d, TUNING.renderer.fogDensity);

  const camera = new THREE.PerspectiveCamera(
    TUNING.renderer.fov,
    innerWidth / innerHeight,
    TUNING.renderer.near,
    TUNING.renderer.far
  );
  camera.rotation.order = 'YXZ';
  scene.add(camera);

  const hemi = new THREE.HemisphereLight(0xe8f3ff, 0x364138, 1.55);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff0d1, 2.15);
  sun.position.set(24, 38, 18);
  sun.castShadow = true;
  sun.shadow.mapSize.set(TUNING.renderer.shadowSize, TUNING.renderer.shadowSize);
  Object.assign(sun.shadow.camera, { left: -48, right: 48, top: 48, bottom: -48, near: 1, far: 110 });
  scene.add(sun);

  const resize = () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, TUNING.renderer.pixelRatioCap));
    renderer.setSize(innerWidth, innerHeight, false);
  };
  addEventListener('resize', resize);

  return {
    renderer,
    scene,
    camera,
    render: () => renderer.render(scene, camera),
    dispose: () => {
      removeEventListener('resize', resize);
      renderer.dispose();
    }
  };
}
