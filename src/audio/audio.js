const finite = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export class AudioEngine {
  constructor() { this.ctx = null; this.master = null; }
  start() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume?.().catch?.(() => {});
      return;
    }
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return;
    this.ctx = new AudioContextCtor();
    this.master = this.ctx.createGain();
    this.setMasterVolume(.18);
    this.master.connect(this.ctx.destination);
  }
  setMasterVolume(value) {
    if (!this.master) return;
    this.master.gain.value = clamp(finite(value, .18), 0, 1);
  }
  tone(freq = 120, duration = .08, type = 'sawtooth', gain = .15, end = null) {
    if (!this.ctx || !this.master) return;
    const safeFreq = clamp(finite(freq, 120), 1, 24000);
    const safeDuration = clamp(finite(duration, .08), .005, 10);
    const safeGain = clamp(finite(gain, .15), .0001, 1);
    const safeEnd = end == null ? null : clamp(finite(end, safeFreq), 1, 24000);
    const t = this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = ['sine', 'square', 'sawtooth', 'triangle'].includes(type) ? type : 'sawtooth';
    o.frequency.setValueAtTime(safeFreq, t);
    if (safeEnd != null) o.frequency.exponentialRampToValueAtTime(safeEnd, t + safeDuration);
    g.gain.setValueAtTime(safeGain, t);
    g.gain.exponentialRampToValueAtTime(.001, t + safeDuration);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + safeDuration);
  }
  noise(duration = .08, gain = .12) {
    if (!this.ctx || !this.master) return;
    const safeDuration = clamp(finite(duration, .08), .005, 10);
    const safeGain = clamp(finite(gain, .12), 0, 1);
    const length = Math.max(1, Math.ceil(this.ctx.sampleRate * safeDuration));
    const buf = this.ctx.createBuffer(1, length, this.ctx.sampleRate), data = buf.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource(), g = this.ctx.createGain();
    src.buffer = buf; g.gain.value = safeGain; src.connect(g); g.connect(this.master); src.start();
  }
  shot() { this.noise(.055, .18); this.tone(95, .07, 'square', .11, 45); }
  hit() { this.tone(520, .04, 'sine', .08, 260); }
  crit() { this.tone(920, .06, 'triangle', .1, 480); }
  reload() { this.tone(180, .04, 'square', .04); setTimeout(() => this.tone(260, .05, 'square', .04), 320); }
  ability() { this.tone(220, .3, 'sawtooth', .08, 880); }
  explosion() { this.noise(.8, .42); this.tone(58, 1.1, 'sawtooth', .25, 24); }
  step() { this.noise(.025, .025); }
}
