import * as THREE from 'three';
import { boxPart, cylPart } from './builder.js';

function mats(accent) {
  return {
    gun: new THREE.MeshStandardMaterial({ color: 0x26313a, metalness: .58, roughness: .28, envMapIntensity: 1.2 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x0e141a, metalness: .28, roughness: .58, envMapIntensity: .8 }),
    polymer: new THREE.MeshStandardMaterial({ color: 0x1a2026, metalness: .08, roughness: .78 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x53606b, metalness: .72, roughness: .24, envMapIntensity: 1.35 }),
    glow: new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 1.8, metalness: .15, roughness: .35 })
  };
}

function addRail(g, material, z = -.27, length = .5) {
  boxPart(g, [.08, .035, length], [0, .125, z], material);
  for (let i = 0; i < 6; i++) {
    boxPart(g, [.105, .025, .035], [0, .15, z - length / 2 + .05 + i * (length - .1) / 5], material);
  }
}

function addRifleCore(g, m) {
  boxPart(g, [.19, .2, .58], [0, 0, -.13], m.gun);
  boxPart(g, [.17, .16, .42], [0, .015, -.57], m.dark);
  boxPart(g, [.15, .15, .31], [0, -.01, .33], m.polymer);
  boxPart(g, [.115, .28, .16], [.01, -.245, .02], m.polymer, [0, 0, .16]);
  boxPart(g, [.12, .34, .18], [0, -.23, -.19], m.dark, [.13, 0, 0]);
  boxPart(g, [.07, .055, .15], [0, -.04, -.45], m.steel);
  cylPart(g, .03, .56, [0, .01, -.89], m.steel, [Math.PI / 2, 0, 0], 16);
  cylPart(g, .055, .12, [0, .01, -1.19], m.dark, [Math.PI / 2, 0, 0], 16);
  addRail(g, m.dark, -.37, .58);
  boxPart(g, [.035, .04, .5], [-.105, -.09, -.54], m.glow);
}

function addOptic(g, m, magnified = false) {
  if (magnified) {
    cylPart(g, .075, .3, [0, .18, -.26], m.dark, [Math.PI / 2, 0, 0], 20);
    cylPart(g, .052, .08, [0, .18, -.45], m.glow, [Math.PI / 2, 0, 0], 16);
  } else {
    boxPart(g, [.12, .1, .16], [0, .19, -.27], m.dark);
    boxPart(g, [.075, .055, .025], [0, .19, -.36], m.glow);
  }
}

export function createWeaponModel(type, accent = 0x34cfff) {
  const g = new THREE.Group();
  const m = mats(accent);
  addRifleCore(g, m);

  if (type === 'lmg') {
    boxPart(g, [.3, .22, .44], [0, -.03, -.37], m.gun);
    boxPart(g, [.24, .2, .18], [.16, -.19, -.38], m.dark);
    cylPart(g, .048, .68, [0, .02, -1.0], m.steel, [Math.PI / 2, 0, 0], 18);
    boxPart(g, [.08, .08, .33], [0, -.13, -.72], m.polymer);
  } else if (type === 'smg') {
    g.scale.set(.9, .9, .86);
    boxPart(g, [.16, .17, .24], [0, .01, -.58], m.gun);
    boxPart(g, [.1, .29, .13], [0, -.23, -.31], m.polymer, [.08, 0, 0]);
  } else if (type === 'dmr') {
    cylPart(g, .025, .82, [0, .015, -1.0], m.steel, [Math.PI / 2, 0, 0], 18);
    addOptic(g, m, true);
    boxPart(g, [.18, .055, .32], [0, -.12, .26], m.polymer);
  } else {
    addOptic(g, m, false);
  }

  // Keep the model centered at the camera origin. WeaponSystem owns all view offsets.
  g.rotation.order = 'YXZ';
  return g;
}
