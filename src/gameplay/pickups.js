import * as THREE from 'three';

export class Pickups {
  constructor({ scene, materials, events, player, weapon }) {
    this.scene = scene;
    this.materials = materials;
    this.events = events;
    this.player = player;
    this.weapon = weapon;
    this.items = [];
    events.on('enemy:killed', data => this.maybeDrop(data.position));
  }

  maybeDrop(position) {
    const roll = Math.random();
    if (roll < 0.30) this.spawn('ammo', position);
    else if (roll < 0.45) this.spawn('health', position);
  }

  spawn(type, position) {
    const group = new THREE.Group();
    group.position.copy(position).setY(0.55);
    const material = type === 'ammo' ? this.materials.ammo : this.materials.health;
    const body = new THREE.Mesh(new THREE.BoxGeometry(type === 'ammo' ? 0.58 : 0.46, 0.34, 0.42), material);
    group.add(body);
    if (type === 'health') {
      const a = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.46, 0.08), material);
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.12, 0.08), material);
      a.position.z = b.position.z = -0.24;
      group.add(a, b);
    } else {
      for (let i = -1; i <= 1; i++) {
        const round = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.28, 7), material);
        round.rotation.z = Math.PI / 2;
        round.position.set(i * 0.13, 0.24, -0.08);
        group.add(round);
      }
    }
    this.scene.add(group);
    this.items.push({ type, group, baseY: group.position.y, phase: Math.random() * Math.PI * 2, life: 22 });
  }

  clear() {
    for (const item of this.items) this.scene.remove(item.group);
    this.items.length = 0;
  }

  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.life -= dt;
      item.phase += dt * 2.4;
      item.group.rotation.y += dt * 1.4;
      item.group.position.y = item.baseY + Math.sin(item.phase) * 0.12;

      if (item.group.position.distanceTo(this.player.position) < 1.45) {
        let amount = 0;
        if (item.type === 'ammo') amount = this.weapon.addReserve(36);
        else amount = this.player.heal(28);
        if (amount > 0) {
          this.events.emit('pickup:collected', { type: item.type, amount });
          this.scene.remove(item.group);
          this.items.splice(i, 1);
          continue;
        }
      }

      if (item.life <= 0) {
        this.scene.remove(item.group);
        this.items.splice(i, 1);
      }
    }
  }
}
