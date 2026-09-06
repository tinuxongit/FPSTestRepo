export class Input {
  constructor(canvas) {
    this.canvas = canvas; this.keys = new Set(); this.pressed = new Set(); this.buttons = new Set(); this.mouseDX = 0; this.mouseDY = 0;
    window.addEventListener('keydown', e => { if (!this.keys.has(e.code)) this.pressed.add(e.code); this.keys.add(e.code); });
    window.addEventListener('keyup', e => this.keys.delete(e.code));
    window.addEventListener('mousedown', e => this.buttons.add(e.button)); window.addEventListener('mouseup', e => this.buttons.delete(e.button));
    window.addEventListener('mousemove', e => { if (document.pointerLockElement === canvas) { this.mouseDX += e.movementX; this.mouseDY += e.movementY; } });
    window.addEventListener('contextmenu', e => e.preventDefault());
  }
  down(code) { return this.keys.has(code); }
  wasPressed(code) { return this.pressed.has(code); }
  button(index) { return this.buttons.has(index); }
  consumeLook() { const d = { x: this.mouseDX, y: this.mouseDY }; this.mouseDX = this.mouseDY = 0; return d; }
  endFrame() { this.pressed.clear(); }
  lock() { return this.canvas.requestPointerLock(); }
  get locked() { return document.pointerLockElement === this.canvas; }
}
