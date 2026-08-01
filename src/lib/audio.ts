// Procedural space-ambient music + UI sounds, all synthesized in Web Audio.
// No audio assets: works offline, nothing to license, a few hundred bytes of
// code. Started only after a user gesture (browser autoplay policy).

let ctx: AudioContext | null = null;
let musicGain: GainNode | null = null;
let musicNodes: OscillatorNode[] = [];
let chordTimer: number | null = null;

// A slow cycle of open, hopeful chords (frequencies in Hz, low register).
const CHORDS: number[][] = [
  [110.0, 164.81, 220.0, 329.63], // Am add9-ish
  [87.31, 130.81, 174.61, 261.63], // F maj
  [98.0, 146.83, 196.0, 293.66], // G
  [82.41, 123.47, 164.81, 246.94], // E m
];

function ensureContext(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function startMusic(volume: number): void {
  const ac = ensureContext();
  if (musicGain) {
    setMusicVolume(volume);
    return;
  }

  musicGain = ac.createGain();
  musicGain.gain.value = 0;
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 900;
  filter.Q.value = 0.4;

  // Gentle echo tail makes the pad feel like a big room.
  const delay = ac.createDelay(1.5);
  delay.delayTime.value = 0.8;
  const feedback = ac.createGain();
  feedback.gain.value = 0.35;
  delay.connect(feedback).connect(delay);

  musicGain.connect(filter);
  filter.connect(ac.destination);
  filter.connect(delay);
  delay.connect(ac.destination);

  let chordIdx = 0;
  const playChord = () => {
    if (!musicGain) return;
    for (const o of musicNodes) {
      try {
        o.stop(ac.currentTime + 6);
      } catch {
        /* already stopped */
      }
    }
    musicNodes = [];
    const chord = CHORDS[chordIdx % CHORDS.length];
    chordIdx++;
    for (const freq of chord) {
      // Two slightly detuned oscillators per note = slow shimmering beat.
      for (const detune of [-4, 4]) {
        const osc = ac.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        osc.detune.value = detune;
        const g = ac.createGain();
        g.gain.setValueAtTime(0, ac.currentTime);
        g.gain.linearRampToValueAtTime(0.05, ac.currentTime + 4);
        g.gain.linearRampToValueAtTime(0.02, ac.currentTime + 14);
        osc.connect(g).connect(musicGain);
        osc.start();
        musicNodes.push(osc);
      }
    }
  };

  playChord();
  chordTimer = window.setInterval(playChord, 14_000);
  musicGain.gain.linearRampToValueAtTime(volume, ac.currentTime + 3);
}

export function stopMusic(): void {
  if (!ctx || !musicGain) return;
  musicGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
  if (chordTimer) window.clearInterval(chordTimer);
  chordTimer = null;
  const nodes = musicNodes;
  const gain = musicGain;
  musicNodes = [];
  musicGain = null;
  window.setTimeout(() => {
    for (const o of nodes) {
      try {
        o.stop();
      } catch {
        /* already stopped */
      }
    }
    gain.disconnect();
  }, 2_000);
}

export function setMusicVolume(v: number): void {
  if (ctx && musicGain) musicGain.gain.linearRampToValueAtTime(v, ctx.currentTime + 0.3);
}

/** Short console beep — countdown ticks, button feedback. */
export function beep(freq = 880, durationMs = 90, volume = 0.12): void {
  const ac = ensureContext();
  const osc = ac.createOscillator();
  osc.type = 'square';
  osc.frequency.value = freq;
  const g = ac.createGain();
  g.gain.setValueAtTime(volume, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(1e-4, ac.currentTime + durationMs / 1000);
  osc.connect(g).connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + durationMs / 1000);
}

/** Two-tone chime for mission events. */
export function chime(up = true): void {
  beep(up ? 660 : 880, 100, 0.1);
  window.setTimeout(() => beep(up ? 990 : 587, 140, 0.1), 110);
}

/** Speak a callout via the Web Speech API (optional, user-toggled). */
export function speak(text: string): void {
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1.05;
  u.pitch = 0.9;
  window.speechSynthesis.speak(u);
}
