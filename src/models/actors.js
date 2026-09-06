import * as THREE from 'three';

const armorMat = (color, metalness = .34, roughness = .48) => new THREE.MeshStandardMaterial({
  color,
  roughness,
  metalness,
  envMapIntensity: 1.05
});

const glowMat = color => new THREE.MeshStandardMaterial({
  color,
  emissive: color,
  emissiveIntensity: 2.4,
  roughness: .32,
  metalness: .18
});

function addMesh(group, geometry, material, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...pos);
  mesh.rotation.set(...rot);
  mesh.scale.set(...scale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function box(group, size, pos, material, rot = [0, 0, 0]) {
  return addMesh(group, new THREE.BoxGeometry(...size, 2, 2, 2), material, pos, rot);
}

function cyl(group, radius, height, pos, material, rot = [0, 0, 0], segments = 14) {
  return addMesh(group, new THREE.CylinderGeometry(radius, radius, height, segments), material, pos, rot);
}

function sphere(group, radius, pos, material, segments = 18) {
  return addMesh(group, new THREE.SphereGeometry(radius, segments, Math.max(10, Math.floor(segments * .65))), material, pos);
}

function makeArm(side, materials) {
  const arm = new THREE.Group();
  arm.position.set(side * .5, 1.53, 0);
  sphere(arm, .12, [0, 0, 0], materials.joint, 12);
  cyl(arm, .105, .46, [0, -.25, 0], materials.undersuit, [0, 0, side * .06]);
  box(arm, [.22, .3, .18], [0, -.18, -.01], materials.armor, [0, 0, side * .04]);
  cyl(arm, .09, .38, [0, -.62, -.05], materials.undersuit, [side * .12, 0, 0]);
  box(arm, [.16, .24, .17], [0, -.58, -.08], materials.dark);
  box(arm, [.12, .1, .18], [0, -.84, -.11], materials.dark);
  return arm;
}

function makeLeg(side, materials) {
  const leg = new THREE.Group();
  leg.position.set(side * .19, .98, 0);
  sphere(leg, .115, [0, 0, 0], materials.joint, 12);
  cyl(leg, .115, .52, [0, -.28, 0], materials.undersuit);
  box(leg, [.26, .4, .25], [0, -.23, -.015], materials.armor);
  sphere(leg, .105, [0, -.57, -.015], materials.joint, 12);
  cyl(leg, .095, .46, [0, -.8, .015], materials.undersuit);
  box(leg, [.23, .34, .24], [0, -.8, .02], materials.dark);
  box(leg, [.24, .12, .38], [0, -1.03, -.065], materials.boot);
  return leg;
}

function addRifle(root, materials) {
  const weapon = new THREE.Group();
  weapon.position.set(.18, 1.35, -.42);
  weapon.rotation.set(-.08, -.08, -.04);
  box(weapon, [.16, .16, .7], [0, 0, -.16], materials.weapon);
  box(weapon, [.12, .12, .4], [0, .01, -.66], materials.weaponDark);
  cyl(weapon, .028, .52, [0, .01, -1.05], materials.weapon, [Math.PI / 2, 0, 0], 12);
  box(weapon, [.1, .22, .14], [0, -.17, -.18], materials.weaponDark, [.12, 0, 0]);
  box(weapon, [.09, .08, .14], [0, .14, -.25], materials.weaponDark);
  root.add(weapon);
  return weapon;
}

export function createSoldier() {
  const root = new THREE.Group();
  const materials = {
    armor: armorMat(0x40505e, .3, .48),
    armorDark: armorMat(0x27323c, .36, .44),
    dark: armorMat(0x171d24, .18, .62),
    undersuit: armorMat(0x20272e, .06, .8),
    joint: armorMat(0x10151a, .12, .72),
    boot: armorMat(0x0c1015, .08, .84),
    weapon: armorMat(0x38444f, .55, .3),
    weaponDark: armorMat(0x10161c, .28, .58),
    glow: glowMat(0xff3642)
  };

  const pelvis = new THREE.Group();
  pelvis.position.y = .98;
  box(pelvis, [.48, .28, .34], [0, 0, 0], materials.armorDark);
  box(pelvis, [.32, .12, .38], [0, .13, -.02], materials.dark);
  root.add(pelvis);

  const torso = new THREE.Group();
  torso.position.y = 1.48;
  box(torso, [.72, .72, .38], [0, 0, 0], materials.undersuit);
  box(torso, [.76, .42, .44], [0, .12, -.035], materials.armor);
  box(torso, [.55, .2, .48], [0, .32, -.02], materials.armorDark);
  box(torso, [.18, .26, .5], [-.29, .08, 0], materials.armorDark);
  box(torso, [.18, .26, .5], [.29, .08, 0], materials.armorDark);
  box(torso, [.22, .08, .05], [0, .16, -.235], materials.glow);
  box(torso, [.48, .5, .18], [0, .05, .26], materials.dark);
  root.add(torso);

  const headGroup = new THREE.Group();
  headGroup.position.y = 2.03;
  const helmet = sphere(headGroup, .28, [0, 0, 0], materials.armorDark, 20);
  helmet.scale.set(1, .96, 1.05);
  helmet.userData.head = true;
  const face = box(headGroup, [.34, .16, .12], [0, -.02, -.245], materials.dark);
  face.userData.head = true;
  const visor = box(headGroup, [.27, .075, .035], [0, .015, -.315], materials.glow);
  visor.userData.head = true;
  box(headGroup, [.09, .2, .08], [-.25, 0, -.04], materials.armor);
  box(headGroup, [.09, .2, .08], [.25, 0, -.04], materials.armor);
  root.add(headGroup);

  const leftArm = makeArm(-1, materials);
  const rightArm = makeArm(1, materials);
  leftArm.rotation.x = -.28;
  rightArm.rotation.x = -.42;
  root.add(leftArm, rightArm);

  const leftLeg = makeLeg(-1, materials);
  const rightLeg = makeLeg(1, materials);
  root.add(leftLeg, rightLeg);

  const rifle = addRifle(root, materials);

  root.userData.rig = {
    torso,
    head: headGroup,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    rifle
  };
  root.userData.walkPhase = Math.random() * Math.PI * 2;
  return root;
}

export function createBrute() {
  const root = createSoldier();
  root.scale.set(1.42, 1.42, 1.42);
  const core = new THREE.Mesh(
    new THREE.OctahedronGeometry(.18, 1),
    glowMat(0xff5a39)
  );
  core.position.set(0, 1.62, -.28);
  root.add(core);
  const shoulderMat = armorMat(0x59636c, .42, .34);
  box(root, [.38, .25, .52], [-.52, 1.7, .02], shoulderMat, [0, 0, -.12]);
  box(root, [.38, .25, .52], [.52, 1.7, .02], shoulderMat, [0, 0, .12]);
  return root;
}

export function createDrone() {
  const root = new THREE.Group();
  const shell = armorMat(0x33404b, .48, .32);
  const dark = armorMat(0x141a20, .22, .62);
  const glow = glowMat(0xff3440);

  const body = sphere(root, .42, [0, 1.62, 0], shell, 20);
  body.scale.set(1.25, .72, 1.05);
  box(root, [.7, .16, .52], [0, 1.62, 0], dark);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    const arm = new THREE.Group();
    arm.position.set(Math.cos(a) * .5, 1.62, Math.sin(a) * .5);
    arm.rotation.y = -a;
    box(arm, [.66, .09, .14], [0, 0, 0], shell);
    cyl(arm, .16, .06, [.29, .02, 0], dark, [Math.PI / 2, 0, 0], 16);
    root.add(arm);
  }
  const eye = sphere(root, .1, [0, 1.62, -.46], glow, 12);
  eye.userData.head = true;
  box(root, [.22, .08, .12], [0, 1.42, -.36], dark);
  root.userData.rig = { body };
  root.userData.walkPhase = Math.random() * Math.PI * 2;
  return root;
}
