export class AudioManager {
  constructor(events) {
    this.events = events;
    this.context = null;
    this.master = null;
    this.noiseBuffer = null;

    events.on('weapon:shot', () => this.gunshot());
    events.on('weapon:empty', () => this.tone(120, 0.045, 0.035, 'square'));
    events.on('weapon:reload', () => this.reload());
    events.on('combat:hit', data => this.hit(data.headshot));
    events.on('enemy:shot', () => this.enemyShot());
    events.on('player:damage', () => this.damage());
    events.on('player:step', data => this.step(data.sprinting));
    events.on('pickup:collected', () => this.pickup());
  }

  start() {
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = 0.55;
      this.master.connect(this.context.destination);
      this.noiseBuffer = this.makeNoiseBuffer(0.8);
    }
    if (this.context.state === 'suspended') this.context.resume();
  }

  makeNoiseBuffer(seconds) {
    const length = Math.floor(this.context.sampleRate * seconds);
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  noise(duration = 0.1, gain = 0.1, frequency = 1200) {
    if (!this.context) return;
    const source = this.context.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = frequency;
    const amp = this.context.createGain();
    const now = this.context.currentTime;
    amp.gain.setValueAtTime(gain, now);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter).connect(amp).connect(this.master);
    source.start(now);
    source.stop(now + duration);
  }

  tone(frequency, duration, gain = 0.03, type = 'sine', endFrequency = null) {
    if (!this.context) return;
    const oscillator = this.context.createOscillator();
    const amp = this.context.createGain();
    const now = this.context.currentTime;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, now + duration);
    amp.gain.setValueAtTime(gain, now);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(amp).connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  gunshot() {
    this.noise(0.085, 0.19, 2400);
    this.tone(92, 0.07, 0.08, 'triangle', 52);
  }

  enemyShot() {
    this.noise(0.065, 0.055, 1600);
    this.tone(125, 0.055, 0.018, 'square', 78);
  }

  hit(headshot) {
    this.tone(headshot ? 980 : 720, 0.045, 0.025, 'sine', headshot ? 620 : 520);
  }

  reload() {
    this.tone(310, 0.04, 0.018, 'square');
    setTimeout(() => this.tone(230, 0.05, 0.018, 'square'), 420);
  }

  damage() {
    this.noise(0.12, 0.045, 560);
  }

  step(sprinting) {
    this.noise(0.045, sprinting ? 0.025 : 0.018, 280);
  }

  pickup() {
    this.tone(520, 0.07, 0.025, 'sine', 860);
  }
}
