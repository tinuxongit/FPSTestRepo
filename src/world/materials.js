import * as THREE from 'three';

function noisyTexture(base, flecks, repeat = 8) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 900; i++) {
    const a = 0.035 + Math.random() * 0.08;
    ctx.fillStyle = `${flecks}${Math.round(a * 255).toString(16).padStart(2, '0')}`;
    const s = Math.random() < 0.8 ? 1 : 2;
    ctx.fillRect(Math.random() * 128, Math.random() * 128, s, s);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.anisotropy = 4;
  return texture;
}

export function createMaterials() {
  const concreteMap = noisyTexture('#747c7d', '#d2d8d8', 2.4);
  const groundMap = noisyTexture('#5d635b', '#a2aa9d', 14);
  const crateMap = noisyTexture('#645844', '#c0a777', 1.5);

  return {
    concrete: new THREE.MeshStandardMaterial({ map: concreteMap, color: 0x8a9292, roughness: 0.96 }),
    concreteDark: new THREE.MeshStandardMaterial({ map: concreteMap, color: 0x586062, roughness: 0.95 }),
    ground: new THREE.MeshStandardMaterial({ map: groundMap, color: 0x778071, roughness: 1 }),
    crate: new THREE.MeshStandardMaterial({ map: crateMap, color: 0x87745a, roughness: 0.93 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x3e484d, roughness: 0.48, metalness: 0.64 }),
    metalDark: new THREE.MeshStandardMaterial({ color: 0x151b1e, roughness: 0.42, metalness: 0.72 }),
    enemy: new THREE.MeshStandardMaterial({ color: 0x56616a, roughness: 0.72, metalness: 0.2 }),
    enemyDark: new THREE.MeshStandardMaterial({ color: 0x20262b, roughness: 0.68 }),
    enemyGlow: new THREE.MeshStandardMaterial({ color: 0xff5d3f, emissive: 0xff2415, emissiveIntensity: 2.1 }),
    ammo: new THREE.MeshStandardMaterial({ color: 0xb8ff55, emissive: 0x4f8d13, emissiveIntensity: 1.1, roughness: 0.45 }),
    health: new THREE.MeshStandardMaterial({ color: 0x5fe4ff, emissive: 0x16788c, emissiveIntensity: 1.2, roughness: 0.35 })
  };
}
