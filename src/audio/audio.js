export class AudioEngine {
  constructor() { this.ctx = null; this.master = null; }
  start() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = this.ctx.createGain(); this.master.gain.value = 0.18; this.master.connect(this.ctx.destination);
  }
  tone(freq = 120, duration = .08, type = 'sawtooth', gain = .15, end = null) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); if (end) o.frequency.exponentialRampToValueAtTime(end, t + duration);
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(.001, t + duration);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + duration);
  }
  noise(duration = .08, gain = .12) {
    if (!this.ctx) return;
    const length = Math.ceil(this.ctx.sampleRate * duration), buf = this.ctx.createBuffer(1, length, this.ctx.sampleRate), data = buf.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource(), g = this.ctx.createGain(); src.buffer = buf; g.gain.value = gain; src.connect(g); g.connect(this.master); src.start();
  }
  shot() { this.noise(.055, .18); this.tone(95, .07, 'square', .11, 45); }
  hit() { this.tone(520, .04, 'sine', .08, 260); }
  crit() { this.tone(920, .06, 'triangle', .1, 480); }
  reload() { this.tone(180, .04, 'square', .04); setTimeout(() => this.tone(260, .05, 'square', .04), 320); }
  ability() { this.tone(220, .3, 'sawtooth', .08, 880); }
  explosion() { this.noise(.8, .42); this.tone(58, 1.1, 'sawtooth', .25, 24); }
  step() { this.noise(.025, .025); }
}
