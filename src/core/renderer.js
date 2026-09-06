import * as THREE from 'three';

function makeEnvironmentMap() {
  const face = (top, bottom) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 64);
    gradient.addColorStop(0, top);
    gradient.addColorStop(1, bottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    return canvas;
  };

  const texture = new THREE.CubeTexture([
    face('#9ec8ea', '#293947'),
    face('#8db8dc', '#253440'),
    face('#d7e7f2', '#425361'),
    face('#394751', '#111820'),
    face('#a8cce7', '#2b3d4b'),
    face('#93bbd8', '#243642')
  ]);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function createRenderer(canvas, initialQuality = 'high') {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
    alpha: false
  });

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(76, innerWidth / innerHeight, .035, 900);
  camera.rotation.order = 'YXZ';
  scene.add(camera);

  scene.environment = makeEnvironmentMap();

  const ambient = new THREE.AmbientLight(0xb8cee0, .55);
  scene.add(ambient);

  const hemi = new THREE.HemisphereLight(0xd7ebff, 0x33404a, 1.75);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff1dc, 3.35);
  sun.position.set(45, 85, 20);
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0x8fc9ff, 1.1);
  fill.position.set(-35, 28, -45);
  scene.add(fill);

  // A restrained camera-space fill keeps the weapon readable without making it glow.
  const viewLight = new THREE.PointLight(0xdcecff, .9, 6, 2);
  viewLight.position.set(.2, .45, .35);
  camera.add(viewLight);

  let quality = 'high';
  function setQuality(next = 'high') {
    quality = ['low', 'medium', 'high', 'ultra'].includes(next) ? next : 'high';
    const ratio = quality === 'ultra' ? 1.8 : quality === 'high' ? 1.55 : quality === 'medium' ? 1.25 : 1;
    renderer.setPixelRatio(Math.min(devicePixelRatio, ratio));
    renderer.shadowMap.enabled = quality !== 'low';
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    sun.castShadow = quality !== 'low';
    const shadowSize = quality === 'ultra' ? 3072 : quality === 'high' ? 2048 : 1024;
    sun.shadow.mapSize.set(shadowSize, shadowSize);
    sun.shadow.camera.left = -115;
    sun.shadow.camera.right = 115;
    sun.shadow.camera.top = 115;
    sun.shadow.camera.bottom = -115;
    sun.shadow.camera.near = .5;
    sun.shadow.camera.far = 260;
    sun.shadow.bias = -.00015;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = quality === 'low' ? 1.2 : 1.28;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setSize(innerWidth, innerHeight, false);
  }

  setQuality(initialQuality);

  const resize = () => {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  };
  addEventListener('resize', resize);

  return {
    renderer,
    scene,
    camera,
    sun,
    get quality() { return quality; },
    setQuality,
    render: () => renderer.render(scene, camera)
  };
}
