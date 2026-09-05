export class Input {
  constructor(canvas, events) {
    this.canvas = canvas;
    this.events = events;
    this.keys = new Set();
    this.pressedKeys = new Set();
    this.buttons = new Set();
    this.pressedButtons = new Set();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.pointerLocked = false;

    addEventListener('keydown', event => {
      if (!this.keys.has(event.code)) this.pressedKeys.add(event.code);
      this.keys.add(event.code);
      if (['Space', 'ArrowUp', 'ArrowDown'].includes(event.code)) event.preventDefault();
    });
    addEventListener('keyup', event => this.keys.delete(event.code));
    addEventListener('blur', () => this.resetTransient());

    addEventListener('mousemove', event => {
      if (!this.pointerLocked) return;
      this.mouseDX += event.movementX;
      this.mouseDY += event.movementY;
    });

    canvas.addEventListener('mousedown', event => {
      if (!this.pointerLocked) return;
      if (!this.buttons.has(event.button)) this.pressedButtons.add(event.button);
      this.buttons.add(event.button);
    });
    addEventListener('mouseup', event => this.buttons.delete(event.button));
    canvas.addEventListener('contextmenu', event => event.preventDefault());

    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === canvas;
      this.events.emit('input:pointerlock', { locked: this.pointerLocked });
      if (!this.pointerLocked) this.resetTransient();
    });
  }

  isDown(code) { return this.keys.has(code); }
  isButtonDown(button) { return this.buttons.has(button); }

  wasPressed(code) {
    const value = this.pressedKeys.has(code);
    this.pressedKeys.delete(code);
    return value;
  }

  wasButtonPressed(button) {
    const value = this.pressedButtons.has(button);
    this.pressedButtons.delete(button);
    return value;
  }

  consumeMouseDelta() {
    const delta = { x: this.mouseDX, y: this.mouseDY };
    this.mouseDX = 0;
    this.mouseDY = 0;
    return delta;
  }

  async requestLock() {
    try {
      const result = this.canvas.requestPointerLock({ unadjustedMovement: false });
      if (result?.then) await result;
    } catch {
      this.canvas.requestPointerLock();
    }
  }

  resetTransient() {
    this.buttons.clear();
    this.pressedButtons.clear();
    this.pressedKeys.clear();
    this.mouseDX = 0;
    this.mouseDY = 0;
  }
}
