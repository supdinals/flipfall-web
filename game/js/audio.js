// Procedural WebAudio sound for FLIPFALL: no audio files, every effect is
// synthesized from oscillators and filtered noise at play time. The context
// is created lazily on the first user gesture, as browsers require.

export function createAudio() {
  let context = null;
  let master = null;

  function ensureContext() {
    if (context) {
      if (context.state === 'suspended') context.resume();
      return context;
    }
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return null;
    context = new AudioCtor();
    master = context.createGain();
    master.gain.value = 0.32;
    master.connect(context.destination);
    return context;
  }

  function tone({ type = 'sine', from = 440, to = from, start = 0, duration = 0.15, volume = 0.5 }) {
    const ctx = ensureContext();
    if (!ctx) return;
    const t0 = ctx.currentTime + start;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, to), t0 + duration);
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(gain).connect(master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  function noise({ start = 0, duration = 0.2, volume = 0.4, from = 400, to = 2400 }) {
    const ctx = ensureContext();
    if (!ctx) return;
    const t0 = ctx.currentTime + start;
    const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1.1;
    filter.frequency.setValueAtTime(from, t0);
    filter.frequency.exponentialRampToValueAtTime(to, t0 + duration);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    source.connect(filter).connect(gain).connect(master);
    source.start(t0);
  }

  return {
    /** Call from any key or pointer handler so the context may start. */
    unlock() {
      ensureContext();
    },
    flipWhoosh() {
      noise({ duration: 0.22, volume: 0.5, from: 500, to: 2600 });
      tone({ type: 'sine', from: 300, to: 640, duration: 0.16, volume: 0.18 });
    },
    landThud() {
      tone({ type: 'sine', from: 150, to: 55, duration: 0.11, volume: 0.55 });
      noise({ duration: 0.06, volume: 0.2, from: 300, to: 120 });
    },
    starChime() {
      tone({ type: 'triangle', from: 1180, to: 1180, duration: 0.1, volume: 0.4 });
      tone({ type: 'triangle', from: 1770, to: 1770, start: 0.07, duration: 0.16, volume: 0.35 });
    },
    deathBuzz() {
      tone({ type: 'sawtooth', from: 220, to: 48, duration: 0.34, volume: 0.5 });
      noise({ duration: 0.25, volume: 0.3, from: 900, to: 150 });
    },
    portalFanfare() {
      const notes = [523, 659, 784, 1046];
      notes.forEach((note, i) => {
        tone({ type: 'triangle', from: note, to: note, start: i * 0.09, duration: 0.22, volume: 0.4 });
      });
    },
    selectTick() {
      tone({ type: 'square', from: 740, to: 740, duration: 0.05, volume: 0.16 });
    },
    startJingle() {
      tone({ type: 'triangle', from: 392, to: 392, duration: 0.1, volume: 0.35 });
      tone({ type: 'triangle', from: 587, to: 587, start: 0.09, duration: 0.18, volume: 0.35 });
    },
  };
}
