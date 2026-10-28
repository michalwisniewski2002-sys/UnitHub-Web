// Each skin's sounds, synthesised in code (no sound files): a port of the Mac app's Sound.swift. A sound is a few
// "voices" (a waveform gliding between two pitches with a fast attack and decay, optional bit-crush and sample-hold),
// rendered once into an AudioBuffer and cached per pack.

const V = (wave, hz, at, length, gain, o = {}) => ({ wave, from: hz, to: o.to ?? hz, at, length, gain,
  crush: o.crush ?? null, hold: Math.max(1, o.hold ?? 1), lowpass: o.lowpass ?? null, fadeIn: o.fadeIn ?? false });
const N = (at, length, gain, o = {}) => V("noise", 0, at, length, gain, o);
const C = (at, length, gain) => V("click", 0, at, length, gain);
const range = (n) => [...Array(n).keys()];

/// Netrunner's sounds: the base every other pack reshapes.
const BASE = {
  tick: [C(0, 0.008, 0.5), V("square", 1320, 0, 0.045, 0.55, { crush: 6 }), V("square", 1980, 0.045, 0.075, 0.55, { crush: 6 }),
         V("sine", 3960, 0.045, 0.09, 0.18)],
  blip: [C(0, 0.006, 0.6), V("square", 2350, 0, 0.028, 0.45, { to: 1900, crush: 5 })],
  glitch: [N(0, 0.018, 0.55, { crush: 4, hold: 6 }), V("square", 3100, 0.02, 0.012, 0.35, { crush: 4 }),
           N(0.036, 0.012, 0.45, { crush: 4, hold: 10 }), V("square", 820, 0.05, 0.02, 0.3, { crush: 4 })],
  command: [...[880, 1175, 1568, 2093].map((hz, i) => V("square", hz, i * 0.024, 0.026, 0.5, { crush: 6 })), C(0, 0.006, 0.5), V("sine", 4186, 0.1, 0.08, 0.15)],
  print: [C(0, 0.005, 0.7), V("square", 1600, 0.004, 0.018, 0.3, { crush: 5 }), N(0.01, 0.02, 0.12, { crush: 5, hold: 4 })],
  boot: [V("saw", 55, 0, 0.42, 0.4, { to: 440, crush: 7, lowpass: 0.25 }), N(0, 0.42, 0.08, { crush: 6, hold: 3, fadeIn: true }),
         ...range(10).map((i) => V("square", [1046, 1568, 1318, 2093, 1760][i % 5], 0.12 + i * 0.026, 0.016, 0.22, { crush: 5 })),
         V("square", 1760, 0.44, 0.05, 0.4, { crush: 6 }), V("triangle", 2637, 0.49, 0.22, 0.35)],
  alert: [...range(3).flatMap((i) => [V("square", 1568, i * 0.18, 0.06, 0.5, { crush: 5 }), V("square", 2093, i * 0.18 + 0.065, 0.07, 0.5, { crush: 5 })]),
          N(0, 0.025, 0.25, { crush: 4, hold: 6 }), V("triangle", 3136, 0.56, 0.3, 0.25)],
  levelUp: [...[392, 523, 659, 784, 1047, 1319].map((hz, i) => V("square", hz, i * 0.06, 0.07, 0.42, { crush: 6 })),
            N(0, 0.36, 0.07, { crush: 5, hold: 4, fadeIn: true }), V("triangle", 1047, 0.36, 0.5, 0.35), V("triangle", 1319, 0.36, 0.5, 0.3),
            V("triangle", 1568, 0.36, 0.5, 0.28), V("square", 2093, 0.36, 0.12, 0.15, { crush: 5 })],
};

const VOLUME = { command: 0.24, tick: 0.32, blip: 0.18, glitch: 0.16, print: 0.14, boot: 0.26, alert: 0.34, levelUp: 0.3 };

const pluck = (hz, at, length) => [V("triangle", hz, at, length, 0.4), V("sine", hz * 2, at, length * 0.4, 0.12), C(at, 0.004, 0.15)];
function dice(at, count) {
  let t = at, gap = 0.07;
  const knocks = [];
  for (let i = 0; i < count; i++) {
    knocks.push(C(t, 0.006, 0.7 - i * 0.04), V("triangle", 1900 + (i % 3) * 260, t, 0.02, 0.18));
    t += gap;
    gap *= 0.82;
  }
  return knocks;
}

/// Each pack's own signature sounds; anything missing is the base sound reshaped by `reshape`.
const SIGNATURES = {
  corporate: {
    tick: [V("sine", 880, 0, 0.07, 0.6), V("sine", 1320, 0.06, 0.16, 0.55), V("triangle", 2640, 0.06, 0.08, 0.08)],
    alert: [...range(3).flatMap((i) => [V("sine", 660, i * 0.26, 0.11, 0.55), V("sine", 880, i * 0.26 + 0.11, 0.14, 0.55)]),
            V("sine", 110, 0, 0.8, 0.25, { fadeIn: true })],
  },
  distorted: {
    tick: [V("saw", 620, 0, 0.09, 0.7, { to: 140, crush: 3, hold: 3 }), N(0, 0.05, 0.45, { crush: 3, hold: 6 }), V("square", 1240, 0.03, 0.02, 0.3, { crush: 3 })],
    alert: range(3).flatMap((i) => [V("saw", 200, i * 0.22, 0.16, 0.6, { to: 1200, crush: 3, hold: 3 }), N(i * 0.22 + 0.16, 0.04, 0.4, { crush: 3, hold: 8 })]),
  },
  bard: {
    tick: [...dice(0, 3), ...pluck(1175, 0.09, 0.4)],
    alert: [587, 659, 740, 880, 988, 1175, 1319, 1480].flatMap((hz, i) => [...pluck(hz, i * 0.05, 0.45), ...pluck(hz * 2, 0.6 + i * 0.045, 0.35)]),
    boot: [...dice(0, 9), ...[294, 440, 587, 740, 880].flatMap((hz, i) => pluck(hz, 0.5 + i * 0.035, 0.9))],
    levelUp: [...[587, 740, 880, 1175].flatMap((hz, i) => pluck(hz, i * 0.1, 0.5)), ...[587, 880, 1175, 1480].flatMap((hz) => pluck(hz, 0.45, 1.1))],
  },
  bubbly: {
    tick: [V("sine", 700, 0, 0.06, 0.6, { to: 1400 }), V("triangle", 2093, 0.06, 0.22, 0.45), V("sine", 4186, 0.06, 0.06, 0.08)],
    alert: [1047, 1319, 1568, 2093, 1568, 2093].flatMap((hz, i) => [V("triangle", hz, i * 0.1, 0.25, 0.5), V("sine", hz * 4, i * 0.1, 0.04, 0.08)]),
    levelUp: [...[1047, 1319, 1568, 2093, 2637].map((hz, i) => V("triangle", hz, i * 0.08, 0.35, 0.45)), V("sine", 600, 0.42, 0.15, 0.4, { to: 1800 })],
  },
  minimal: {
    tick: [C(0, 0.004, 0.3), V("sine", 520, 0, 0.07, 0.55, { to: 480 })],
    alert: [[784, 0], [659, 0.18], [784, 0.6], [659, 0.78]].map(([hz, at]) => V("sine", hz, at, 0.3, 0.5)),
    boot: [V("sine", 392, 0, 0.5, 0.35, { fadeIn: true }), V("sine", 587, 0.25, 0.5, 0.3)],
  },
  woodland: {
    tick: [V("triangle", 260, 0, 0.05, 0.5, { to: 200 }), C(0, 0.005, 0.3), V("sine", 880, 0.06, 0.35, 0.45, { to: 932 }), N(0.06, 0.2, 0.04, { fadeIn: true })],
    alert: [...[3136, 2637, 2349, 1976, 2637, 1760, 2093].map((hz, i) => V("sine", hz, i * 0.09 + (i % 2 ? 0.03 : 0), 0.6, 0.32)), N(0, 0.8, 0.05, { fadeIn: true })],
    boot: [N(0, 0.7, 0.06, { fadeIn: true }), ...[587, 659, 784, 988].map((hz, i) => V("sine", hz, 0.2 + i * 0.14, 0.4, 0.4, { to: hz * 1.02 }))],
  },
  aero: {
    tick: [V("sine", 900, 0, 0.08, 0.55, { to: 1800 }), V("sine", 2637, 0.07, 0.3, 0.3), V("sine", 5274, 0.07, 0.1, 0.08)],
    alert: [...[523, 659, 784, 1047].map((hz) => V("sine", hz, 0, 0.9, 0.3, { fadeIn: true })),
            V("sine", 2093, 0.6, 0.25, 0.25, { to: 3136 }), V("sine", 1200, 0.85, 0.12, 0.3, { to: 2400 })],
    boot: [...[523, 784, 1047, 1568].map((hz, i) => V("sine", hz, i * 0.12, 0.7, 0.3)), V("sine", 600, 0.5, 0.2, 0.25, { to: 2400 })],
  },
  chiptune: {
    tick: [V("square", 988, 0, 0.06, 0.45), V("square", 1319, 0.06, 0.22, 0.45)],
    alert: [...range(3).flatMap((i) => [V("square", 1568, i * 0.24, 0.08, 0.45), V("square", 1175, i * 0.24 + 0.09, 0.08, 0.45)]), V("triangle", 196, 0, 0.7, 0.3)],
    levelUp: [...[523, 659, 784, 1047, 784, 1047].map((hz, i) => V("square", hz, i * 0.08, 0.09, 0.42)), V("square", 1319, 0.5, 0.5, 0.4), V("triangle", 330, 0.5, 0.5, 0.35)],
    boot: [...[262, 330, 392, 523, 659, 784, 1047].map((hz, i) => V("square", hz, i * 0.05, 0.06, 0.4)), N(0.38, 0.05, 0.25, { hold: 4 }), V("square", 1047, 0.42, 0.35, 0.4)],
  },
};

const LOUDNESS = { netrunner: 1, corporate: 1.25, bard: 1.25, bubbly: 1.25, woodland: 1.25, aero: 1.25, minimal: 1.15, distorted: 0.85, chiptune: 0.85 };

/// The base voice changed to fit a pack (null drops it).
function reshape(pack, v) {
  v = { ...v };
  const scale = (f) => { v.from *= f; v.to *= f; };
  const clean = () => { v.crush = null; v.hold = 1; };
  switch (pack) {
    case "corporate": if (v.wave === "noise") v.gain *= 0.25; if (v.wave === "square" || v.wave === "saw") v.wave = "triangle"; clean(); scale(0.75); break;
    case "distorted": if (v.wave === "square" || v.wave === "triangle") v.wave = "saw"; v.crush = 3; v.hold = Math.max(v.hold, 3); scale(0.8); break;
    case "bard": if (v.wave === "noise") v.gain *= 0.2; if (v.wave === "square" || v.wave === "saw") v.wave = "triangle"; clean(); v.length *= 1.3; break;
    case "bubbly": if (v.wave === "noise") return null; if (v.wave === "square" || v.wave === "saw") v.wave = "triangle"; clean(); scale(1.3); break;
    case "minimal": if (v.wave === "noise") return null; if (v.wave !== "click") v.wave = "sine"; clean(); v.gain *= 0.7; scale(0.85); break;
    case "woodland": if (v.wave === "noise") v.gain *= 0.3; if (v.wave === "square") v.wave = "sine"; if (v.wave === "saw") v.wave = "triangle"; clean(); v.length *= 1.5; break;
    case "aero": if (v.wave === "noise") return null; if (v.wave !== "click") v.wave = "sine"; clean(); scale(1.2); v.length *= 1.3; break;
    case "chiptune": if (v.wave === "saw" || v.wave === "sine") v.wave = "square"; clean(); break;
  }
  return v;
}

function voicesFor(pack, sound) {
  return SIGNATURES[pack]?.[sound] ?? BASE[sound].map((v) => reshape(pack, v)).filter(Boolean);
}

/// Mixes the voices into samples. Lengths are whole frames and every write is bounds-checked.
function render(voices, rate) {
  const starts = voices.map((v) => Math.round(v.at * rate));
  const lengths = voices.map((v) => Math.max(1, Math.round(v.length * rate)));
  const total = Math.max(0, ...starts.map((s, i) => s + lengths[i]));
  const mix = new Float32Array(total);
  voices.forEach((v, index) => {
    const start = starts[index], frames = lengths[index];
    let phase = 0, held = 0, smoothed = 0;
    for (let f = 0; f < frames; f++) {
      const t = f / rate, progress = f / frames;
      phase += (v.from + (v.to - v.from) * progress) / rate;
      phase -= Math.floor(phase);
      let value;
      switch (v.wave) {
        case "sine": value = Math.sin(2 * Math.PI * phase); break;
        case "square": value = phase < 0.5 ? 0.8 : -0.8; break;
        case "saw": value = 2 * phase - 1; break;
        case "triangle": value = 1 - 4 * Math.abs(phase - 0.5); break;
        default: value = Math.random() * 2 - 1;
      }
      if (f % v.hold === 0) held = value;
      value = held;
      if (v.lowpass) { smoothed += v.lowpass * (value - smoothed); value = smoothed; }
      if (v.crush) { const levels = 1 << v.crush; value = Math.round(value * levels) / levels; }
      const attack = v.fadeIn ? progress : Math.min(1, t / 0.002);
      const decay = v.wave === "click" ? Math.exp(-t / 0.0015) : v.fadeIn ? 1 : Math.exp(-4 * progress);
      const target = start + f;
      if (target < total) mix[target] += value * attack * decay * v.gain;
    }
  });
  // Normalise so layered sounds never clip.
  let peak = 0;
  for (const s of mix) peak = Math.max(peak, Math.abs(s));
  if (peak > 0.9) for (let i = 0; i < mix.length; i++) mix[i] *= 0.9 / peak;
  return mix;
}

let context = null;
const cache = new Map();

/// Plays a sound in the given pack. Browsers only allow audio after the first click or key press.
export function play(sound, pack, enabled) {
  if (!enabled || !BASE[sound]) return;
  try {
    context ??= new AudioContext();
    if (context.state === "suspended") context.resume();
    const key = `${pack}.${sound}`;
    if (!cache.has(key)) {
      const samples = render(voicesFor(pack, sound), context.sampleRate);
      const buffer = context.createBuffer(1, Math.max(1, samples.length), context.sampleRate);
      buffer.copyToChannel(samples, 0);
      cache.set(key, buffer);
    }
    const source = context.createBufferSource();
    const gain = context.createGain();
    gain.gain.value = Math.min(1, VOLUME[sound] * (LOUDNESS[pack] ?? 1));
    source.buffer = cache.get(key);
    source.connect(gain).connect(context.destination);
    source.start();
  } catch {
    // No audio available: carry on silently.
  }
}

export const PACK_NAMES = { netrunner: "Terminal", corporate: "Corporate", distorted: "Distorted", bard: "Bard", bubbly: "Bubbly",
                            minimal: "Minimal", woodland: "Woodland", aero: "Glassy", chiptune: "Chiptune" };
