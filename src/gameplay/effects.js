import * as THREE from 'three';

export class Effects {
  constructor(scene, events) {
    this.scene = scene;
    this.events = events;
    this.items = [];
    this.sparkGeometry = new THREE.SphereGeometry(0.025, 5, 4);

    events.on('weapon:shot', data => this.onShot(data));
    events.on('enemy:shot', data => this.spawnTracer(data.from, data.to, 0xff7652, 0.07));
    events.on('combat:hit', data => this.spawnImpact(data.point, data.headshot ? 0xffdd77 : 0xffffff));
  }

  spawnTracer(from, to, color = 0xffd28a, lifetime = 0.055) {
    const geometry = new THREE.BufferGeometry().setFromPoints([from, to]);
    const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85 });
    const line = new THREE.Line(geometry, material);
    this.scene.add(line);
    this.items.push({ object: line, life: lifetime, maxLife: lifetime, type: 'tracer' });
  }

  spawnImpact(point, color = 0xffffff) {
    for (let i = 0; i < 7; i++) {
      const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
      const mesh = new THREE.Mesh(this.sparkGeometry, material);
      mesh.position.copy(point);
      this.scene.add(mesh);
      const velocity = new THREE.Vector3((Math.random() - 0.5) * 3.3, Math.random() * 2.8, (Math.random() - 0.5) * 3.3);
      this.items.push({ object: mesh, velocity, life: 0.25 + Math.random() * 0.18, maxLife: 0.43, type: 'spark' });
    }
  }

  onShot({ from, to, result }) {
    this.spawnTracer(from, to, result?.enemy ? 0xfff3c1 : 0xffc66d, 0.055);
    if (result?.point && !result.enemy) this.spawnImpact(result.point, 0xffc584);
  }

  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.life -= dt;
      if (item.type === 'spark') {
        item.velocity.y -= 7.5 * dt;
        item.object.position.addScaledVector(item.velocity, dt);
        item.object.material.opacity = Math.max(0, item.life / item.maxLife);
      } else if (item.type === 'tracer') {
        item.object.material.opacity = Math.max(0, item.life / item.maxLife);
      }
      if (item.life <= 0) {
        this.scene.remove(item.object);
        item.object.geometry?.dispose?.();
        item.object.material?.dispose?.();
        this.items.splice(i, 1);
      }
    }
  }
}
