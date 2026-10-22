/**
 * MOD 186 — Áudio procedural do mundo 3D (Web Audio, sem arquivos novos).
 * Ambiente (vento, folhas, grilos/pássaros, água, portal) e efeitos (passos por superfície,
 * espada, impacto, dano, magias). Inicia só após o primeiro toque/tecla (política de autoplay
 * do celular), pausa quando a aba some e guarda os volumes do jogador.
 */
const STORE_KEY = 'seven-sins-3d-audio';

export function createWorldAudio() {
  let ctx = null, master = null, ambBus = null, sfxBus = null, musicBus = null, music = null, noiseBuf = null, ready = false;
  const settings = { ambient: .7, sfx: .8, music: .55, muted: false };
  try { Object.assign(settings, JSON.parse(localStorage.getItem(STORE_KEY) || '{}')); } catch (_) {}
  const layers = {};
  let insectTimer = 0, birdTimer = 2, gustTimer = 0, stepDistance = 0, lastStepAt = 0;

  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(settings)); } catch (_) {} }
  function applyVolumes() {
    if (!ctx) return;
    const t = ctx.currentTime;
    master.gain.setTargetAtTime(settings.muted ? 0 : 1, t, .08);
    ambBus.gain.setTargetAtTime(settings.ambient, t, .1);
    if (musicBus) musicBus.gain.setTargetAtTime(settings.music, t, .2);
    sfxBus.gain.setTargetAtTime(settings.sfx, t, .05);
  }
  function makeNoise() {
    const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    let b = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b = .97 * b + .03 * w; d[i] = w * .55 + b * 2.2; }
    return buf;
  }
  function loopNoise(filterType, freq, q, out) {
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true; src.loopStart = Math.random();
    const f = ctx.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.value = 0;
    src.connect(f); f.connect(g); g.connect(out); src.start(0, Math.random() * 1.5);
    return { src, f, g };
  }
  function unlock() {
    if (ready) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try { ctx = new AC(); } catch (_) { return; }
    master = ctx.createGain(); master.connect(ctx.destination);
    // Compressor suave evita picos quando vários efeitos coincidem.
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(master);
    ambBus = ctx.createGain(); sfxBus = ctx.createGain(); ambBus.connect(comp); sfxBus.connect(comp);
    musicBus = ctx.createGain(); musicBus.connect(comp); music = createMusic();
    noiseBuf = makeNoise();
    layers.wind = loopNoise('bandpass', 380, .55, ambBus);
    layers.leaves = loopNoise('highpass', 3200, .4, ambBus);
    layers.water = loopNoise('lowpass', 900, .3, ambBus);
    // Zumbido grave do portal (duas senoides levemente desafinadas).
    const hum = ctx.createGain(); hum.gain.value = 0; hum.connect(ambBus);
    for (const [fr, det] of [[55, 0], [82.4, 4], [110, -6]]) { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = fr; o.detune.value = det; const g = ctx.createGain(); g.gain.value = fr === 55 ? .55 : .22; o.connect(g); g.connect(hum); o.start(); }
    layers.portal = { g: hum };
    layers.rain = loopNoise('highpass', 1800, .3, ambBus);
    layers.rainLow = loopNoise('lowpass', 420, .5, ambBus);
    ready = true; applyVolumes();
    document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend(); else ctx.resume(); });
  }
  /* MOD 194 — trilha procedural própria (sem amostras de outras obras): exploração em pad modal (ré dórico,
     calma de dia, mais grave à noite) e combate com tambores graves e ostinato; troca com fade, sem sobrepor loops. */
  function createMusic() {
    const explore = ctx.createGain(), combat = ctx.createGain(); explore.gain.value = 0; combat.gain.value = 0;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400; explore.connect(lp); lp.connect(musicBus); combat.connect(musicBus);
    const chords = [[146.8, 220, 261.6, 349.2], [130.8, 196, 261.6, 329.6], [116.5, 174.6, 233.1, 293.7], [130.8, 196, 246.9, 329.6]];
    let chordAt = 0, chordIdx = 0, beatAt = 0, beat = 0, mode = 'explore';
    function pad(freqs, dur) {
      const t = ctx.currentTime;
      for (const f of freqs) for (const det of [-6, 5]) {
        const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = f; o.detune.value = det;
        o.connect(g); g.connect(explore); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(.022, t + dur * .35);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 1.05); o.start(t); o.stop(t + dur * 1.1);
      }
      // Sino distante, esparso.
      if (Math.random() < .55) { const f = freqs[1 + (Math.random() * 3 | 0)] * 2; const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f; o.connect(g); g.connect(explore); g.gain.setValueAtTime(0.0001, t + 1.2); g.gain.exponentialRampToValueAtTime(.03, t + 1.22); g.gain.exponentialRampToValueAtTime(0.0001, t + 4.5); o.start(t + 1.2); o.stop(t + 4.6); }
    }
    function drum(t, f0, peak) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * .45, t + .25); o.connect(g); g.connect(combat); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + .01); g.gain.exponentialRampToValueAtTime(0.0001, t + .4); o.start(t); o.stop(t + .45); }
    function pluck(t, f) { const o = ctx.createOscillator(), g = ctx.createGain(), fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 900; o.type = 'sawtooth'; o.frequency.value = f; o.connect(fl); fl.connect(g); g.connect(combat); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(.05, t + .01); g.gain.exponentialRampToValueAtTime(0.0001, t + .22); o.start(t); o.stop(t + .25); }
    return {
      set(next, night) {
        if (next !== mode) { mode = next; }
        const t = ctx.currentTime;
        explore.gain.setTargetAtTime(mode === 'explore' ? .9 : mode === 'silent' ? 0 : .15, t, 1.2);
        combat.gain.setTargetAtTime(mode === 'combat' ? .9 : 0, t, mode === 'combat' ? .5 : 1.4);
        lp.frequency.setTargetAtTime(night > .5 ? 800 : 1500, t, 2);
      },
      tick(dt, night) {
        const t = ctx.currentTime;
        if (t >= chordAt) { const c = chords[chordIdx++ % chords.length]; pad(night > .5 ? c.map(f => f * .75) : c, 7.5); chordAt = t + 7.5; }
        if (mode === 'combat' && t >= beatAt) {
          const step = .2, b = beat++ % 16;
          if (b % 4 === 0) drum(t + .02, 70, .5); if (b === 6 || b === 14) drum(t + .02, 95, .28);
          if (b % 2 === 0) pluck(t + .02, [146.8, 174.6, 146.8, 196, 146.8, 174.6, 220, 196][(b / 2) % 8]);
          beatAt = t + step;
        } else if (mode !== 'combat') beatAt = t;
      }
    };
  }
  function env(g, t, a, peak, dec) { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); }
  function burst(type, freq, q, peak, dur, bus = sfxBus, sweepTo = 0) {
    const t = ctx.currentTime, src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = ctx.createGain(); src.connect(f); f.connect(g); g.connect(bus);
    env(g, t, Math.min(.012, dur * .2), peak, dur); src.start(t, Math.random() * 1.6); src.stop(t + dur + .05);
  }
  function tone(type, f0, f1, peak, dur, bus = sfxBus, delay = 0) {
    const t = ctx.currentTime + delay, o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain(); o.connect(g); g.connect(bus); env(g, t, .008, peak, dur); o.start(t); o.stop(t + dur + .05);
  }
  function cricket(level) {
    const base = 4300 + Math.random() * 700, n = 2 + (Math.random() * 3 | 0);
    for (let i = 0; i < n; i++) tone('triangle', base, 0, .03 * level, .028, ambBus, i * .055);
  }
  function bird(level) {
    const f = 2200 + Math.random() * 1600, n = 2 + (Math.random() * 3 | 0);
    for (let i = 0; i < n; i++) tone('sine', f * (1 + Math.random() * .15), f * (1.25 + Math.random() * .3), .022 * level, .09, ambBus, i * .13);
  }

  return {
    unlock,
    get settings() { return { ...settings }; },
    get state() { return ctx ? ctx.state : 'locked'; },
    setVolume(kind, value) { if (kind in settings) { settings[kind] = kind === 'muted' ? !!value : Math.max(0, Math.min(1, Number(value) || 0)); save(); applyVolumes(); } },
    /** Chamado a cada quadro com o estado do mundo. */
    update(dt, s) {
      if (!ready || ctx.state !== 'running') return;
      const t = ctx.currentTime, night = s.night || 0;
      if (music) { music.set(s.music || 'explore', night); music.tick(dt, night); }
      gustTimer -= dt; if (gustTimer <= 0) { gustTimer = 3 + Math.random() * 6; layers.wind.f.frequency.setTargetAtTime(260 + Math.random() * 380, t, 1.4); }
      const height = Math.max(0, s.altitude || 0);
      layers.wind.g.gain.setTargetAtTime((.16 + Math.min(.14, height * .02)) * (1 + .5 * Math.sin(t * .23)), t, .8);
      layers.leaves.g.gain.setTargetAtTime(.018 + .014 * Math.max(0, Math.sin(t * .41 + Math.sin(t * .13) * 2)), t, .6);
      layers.water.g.gain.setTargetAtTime(.22 * Math.max(0, 1 - (s.pondDistance || 99) / 26), t, .5);
      layers.portal.g.gain.setTargetAtTime(.09 * Math.max(0, 1 - (s.portalDistance || 99) / 30) * (s.portalReady ? 1.6 : 1), t, .5);
      if (night > .4) { insectTimer -= dt; if (insectTimer <= 0) { insectTimer = .25 + Math.random() * .9; cricket(night); } }
      else { birdTimer -= dt; if (birdTimer <= 0) { birdTimer = 2.5 + Math.random() * 7; bird(1 - night); } }
      // Passos: um a cada ~0,65 m percorridos no chão; superfície muda o timbre.
      if (s.grounded && s.speed > .4) {
        stepDistance += s.speed * dt;
        if (stepDistance > .66 && performance.now() - lastStepAt > 180) {
          stepDistance = 0; lastStepAt = performance.now();
          if (s.surface === 'path') burst('bandpass', 1500 + Math.random() * 400, 1.1, .12, .07);
          else if (s.surface === 'water') burst('lowpass', 900, .6, .14, .16);
          else burst('lowpass', 650 + Math.random() * 200, .7, .1, .09);
        }
      } else stepDistance = .5;
    },
    swing() { if (!ready) return; burst('bandpass', 700, 1.4, .16, .2, sfxBus, 2600); },
    hit() { if (!ready) return; tone('sine', 150, 48, .38, .18); burst('lowpass', 1800, .7, .22, .08); },
    hurt() { if (!ready) return; tone('triangle', 110, 70, .26, .22); burst('bandpass', 500, .9, .16, .14); },
    whoosh() { if (!ready) return; burst('bandpass', 400, .8, .12, .26, sfxBus, 1300); },
    land() { if (!ready) return; burst('lowpass', 420, .6, .16, .12); },
    magic(kind) {
      if (!ready) return;
      const roots = { magic: 523.3, magic2: 440, magic3: 349.2, ultimate: 261.6 }, r = roots[kind] || 440;
      [1, 1.5, 2, 2.52].forEach((m, i) => tone('sine', r * m, r * m * 1.01, .07, .7 + i * .12, sfxBus, i * .045));
      burst('highpass', 4000, .5, .06, .5);
      if (kind === 'ultimate') tone('sawtooth', 65, 40, .12, 1.2);
    },
    /** Pausa todo o som enquanto a dimensão do Bispo está aberta por cima do mundo. */
    pause(on) { if (!ctx) return; if (on) ctx.suspend(); else ctx.resume(); },
    portalEnter() { if (!ready) return; tone('sine', 220, 55, .2, 1.4); burst('bandpass', 300, .6, .18, 1.3, sfxBus, 3000); },
    shieldUp() { if (!ready) return; tone('sine', 660, 990, .05, .18); },
    block() { if (!ready) return; tone('triangle', 320, 180, .2, .16); burst('bandpass', 2400, 2, .14, .1); },
    parry() { if (!ready) return; [1318, 1760, 2637].forEach((f, i) => tone('sine', f, f * 1.02, .11, .5, sfxBus, i * .03)); burst('highpass', 5000, .7, .12, .25); },
    lockOn() { if (!ready) return; tone('sine', 880, 1320, .06, .12); },
    /** Chuva do Ato II (0..1): chiado agudo + rumor grave. */
    setRain(level) { if (!ready) return; const t = ctx.currentTime; layers.rain.g.gain.setTargetAtTime(.2 * level, t, .8); layers.rainLow.g.gain.setTargetAtTime(.14 * level, t, .8); },
    thunder() { if (!ready) return; const t = ctx.currentTime + .4 + Math.random() * 1.2; const src = ctx.createBufferSource(); src.buffer = noiseBuf; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(380, t); f.frequency.exponentialRampToValueAtTime(70, t + 2.6); const g = ctx.createGain(); src.connect(f); f.connect(g); g.connect(ambBus); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(.55, t + .08); g.gain.exponentialRampToValueAtTime(0.0001, t + 3); src.start(t); src.stop(t + 3.1); },
    reveal() { if (!ready) return; [784, 988, 1175, 1568].forEach((f, i) => tone('sine', f, 0, .06, .5, sfxBus, i * .09)); }
  };
}
