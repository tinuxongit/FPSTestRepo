export class GameLoop {
  constructor(update) { this.updateFn = update; this.last = performance.now(); this.running = false; this.bound = t => this.tick(t); }
  start() { if (this.running) return; this.running = true; this.last = performance.now(); requestAnimationFrame(this.bound); }
  tick(now) { if (!this.running) return; const dt = Math.min((now - this.last) / 1000, .05); this.last = now; this.updateFn(dt, now / 1000); requestAnimationFrame(this.bound); }
}
