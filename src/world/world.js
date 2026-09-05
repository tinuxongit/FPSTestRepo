import * as THREE from 'three';

export class World {
  constructor(scene, materials) {
    this.scene = scene;
    this.materials = materials;
    this.colliders = [];
    this.occluders = [];
    this.spawnPoints = [
      [-25, -25], [-18, -26], [-8, -25], [8, -25], [20, -25], [25, -16],
      [25, 2], [25, 20], [16, 25], [2, 25], [-14, 25], [-25, 20], [-25, 4], [-25, -14]
    ];
    this.build();
  }

  addBox(x, y, z, w, h, d, material, { collidable = true, shadow = true } = {}) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    mesh.userData.kind = 'world';
    this.scene.add(mesh);
    this.occluders.push(mesh);
    if (collidable) this.colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, top: y + h / 2 });
    return mesh;
  }

  addBarrel(x, z) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 1.45, 18), this.materials.metal);
    mesh.position.set(x, 0.725, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.kind = 'world';
    this.scene.add(mesh);
    this.occluders.push(mesh);
    this.colliders.push({ minX: x - 0.72, maxX: x + 0.72, minZ: z - 0.72, maxZ: z + 0.72, top: 1.45 });
  }

  build() {
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), this.materials.ground);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.userData.kind = 'world';
    this.scene.add(ground);
    this.occluders.push(ground);

    const m = this.materials;
    this.addBox(0, 2.5, -31, 64, 5, 1.2, m.concreteDark);
    this.addBox(0, 2.5, 31, 64, 5, 1.2, m.concreteDark);
    this.addBox(-31, 2.5, 0, 1.2, 5, 64, m.concreteDark);
    this.addBox(31, 2.5, 0, 1.2, 5, 64, m.concreteDark);

    this.addBox(0, 2.2, 0, 12, 4.4, 4, m.concrete);
    this.addBox(-18, 1.6, -8, 8, 3.2, 5, m.concreteDark);
    this.addBox(17, 1.8, 8, 9, 3.6, 5, m.concreteDark);
    this.addBox(-12, 1.2, 15, 4, 2.4, 9, m.crate);
    this.addBox(11, 1.2, -16, 4, 2.4, 9, m.crate);
    this.addBox(21, 1.0, -10, 6, 2, 3, m.crate);
    this.addBox(-22, 1.0, 9, 6, 2, 3, m.crate);

    for (const [x, z, s] of [[-8,-14,2.4],[-5,-14,1.9],[-2,-14,1.4],[8,15,2.7],[12,15,2.1],[16,15,1.5]]) {
      this.addBox(x, s / 2, z, 2.5, s, 2.5, x < 0 ? m.crate : m.metal);
    }

    this.addBarrel(-9, -22);
    this.addBarrel(-6.8, -22);
    this.addBarrel(18, 21);
    this.addBarrel(20.1, 21);

    this.addBox(22, 4.1, -22, 5.5, 8.2, 5.5, m.concreteDark);
    this.addBox(22, 8.5, -22, 7.2, 0.45, 7.2, m.metal, { collidable: false });

    const beacon = new THREE.PointLight(0xff6a42, 12, 13, 2);
    beacon.position.set(22, 9.35, -22);
    this.scene.add(beacon);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), new THREE.MeshBasicMaterial({ color: 0xff4a2e }));
    lamp.position.copy(beacon.position);
    this.scene.add(lamp);

    for (let x = -24; x <= 24; x += 8) {
      this.addBox(x, 3.2, -28.6, 0.25, 6.4, 0.25, m.metal, { collidable: false, shadow: false });
    }
  }

  canOccupy(x, z, radius = 0.4) {
    return !this.colliders.some(c =>
      x + radius > c.minX && x - radius < c.maxX && z + radius > c.minZ && z - radius < c.maxZ
    );
  }

  moveWithCollision(position, delta, radius = 0.4) {
    const nextX = position.x + delta.x;
    if (this.canOccupy(nextX, position.z, radius)) position.x = nextX;
    const nextZ = position.z + delta.z;
    if (this.canOccupy(position.x, nextZ, radius)) position.z = nextZ;
  }

  hasLineOfSight(from, to, eyeHeight = 1.3) {
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const distance = Math.hypot(dx, dz);
    const steps = Math.max(1, Math.ceil(distance / 0.55));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const x = from.x + dx * t;
      const z = from.z + dz * t;
      if (this.colliders.some(c => c.top > eyeHeight && x > c.minX && x < c.maxX && z > c.minZ && z < c.maxZ)) return false;
    }
    return true;
  }

  randomSpawn(origin, minDistance = 11) {
    const shuffled = [...this.spawnPoints].sort(() => Math.random() - 0.5);
    for (const [x, z] of shuffled) {
      if (Math.hypot(x - origin.x, z - origin.z) >= minDistance && this.canOccupy(x, z, 0.7)) {
        return new THREE.Vector3(x + (Math.random() - 0.5) * 2, 0, z + (Math.random() - 0.5) * 2);
      }
    }
    return new THREE.Vector3(-24, 0, -24);
  }
}
