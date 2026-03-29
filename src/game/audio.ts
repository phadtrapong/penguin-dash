let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function playTone(freq: number, duration: number, type: OscillatorType = 'square', vol = 0.1) {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + duration);
}

function playNoise(duration: number, vol = 0.05) {
  const c = getCtx();
  const bufferSize = c.sampleRate * duration;
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const src = c.createBufferSource();
  src.buffer = buffer;
  const gain = c.createGain();
  gain.gain.setValueAtTime(vol, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
  src.connect(gain);
  gain.connect(c.destination);
  src.start();
}

export function playHop() {
  playTone(400, 0.08, 'square', 0.08);
  setTimeout(() => playTone(500, 0.06, 'square', 0.06), 30);
}

export function playSplash() {
  playNoise(0.3, 0.1);
  playTone(150, 0.2, 'sine', 0.05);
}

export function playSlide() {
  playNoise(0.1, 0.03);
  playTone(200, 0.15, 'sawtooth', 0.03);
}

export function playDeath() {
  playTone(300, 0.15, 'square', 0.1);
  setTimeout(() => playTone(200, 0.15, 'square', 0.1), 100);
  setTimeout(() => playTone(100, 0.3, 'square', 0.1), 200);
}

export function playFishCollect() {
  playTone(600, 0.08, 'square', 0.08);
  setTimeout(() => playTone(800, 0.08, 'square', 0.08), 60);
  setTimeout(() => playTone(1000, 0.12, 'square', 0.06), 120);
}

export function playNearMiss() {
  playTone(250, 0.1, 'sine', 0.06);
}

export function resumeAudio() {
  if (ctx?.state === 'suspended') ctx.resume();
}
