/**
 * MOD 186 — Áudio procedural do mundo 3D (Web Audio, sem arquivos novos).
 * Ambiente (vento, folhas, grilos/pássaros, água, portal) e efeitos (passos por superfície,
 * espada, impacto, dano, magias). Inicia só após o primeiro toque/tecla (política de autoplay
 * do celular), pausa quando a aba some e guarda os volumes do jogador.
 */
import { createSampleBank } from './audio-banco3d.js';
const STORE_KEY = 'seven-sins-3d-audio';

export function createWorldAudio() {
  let ctx = null, master = null, ambBus = null, sfxBus = null, musicBus = null, music = null, noiseBuf = null, ready = false;
  let cinematicGain=1;
  let pausedByGame=false;
  const settings = { ambient: .7, sfx: .8, music: .55, muted: false };
  try { Object.assign(settings, JSON.parse(localStorage.getItem(STORE_KEY) || '{}')); } catch (_) {}
  const layers = {};
  let bank = null; // missão combate/áudio: banco de amostras reais (audio-banco3d.js); o procedural fica só de reserva
  let insectTimer = 0, birdTimer = 2, gustTimer = 0, stepDistance = 0, lastStepAt = 0, dripTimer = 1, caveVerb = null, caveSend = null;

  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(settings)); } catch (_) {} }
  function applyVolumes() {
    if (!ctx) return;
    const t = ctx.currentTime;
    master.gain.setTargetAtTime(settings.muted ? 0 : cinematicGain, t, .08);
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
    if (ready) { if (!pausedByGame && !document.hidden && ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try { ctx = new AC(); } catch (_) { return; }
    master = ctx.createGain(); master.connect(ctx.destination);
    // Compressor suave evita picos quando vários efeitos coincidem.
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(master);
    ambBus = ctx.createGain(); sfxBus = ctx.createGain(); ambBus.connect(comp); sfxBus.connect(comp);
    musicBus = ctx.createGain(); musicBus.connect(comp); music = createMusic();
    noiseBuf = makeNoise();
    try { bank = createSampleBank(ctx); bank.preload((ev, a) => a.categoria !== 'ambiente' && a.categoria !== 'clima' && a.categoria !== 'musica'); } catch (_) { bank = null; }
    layers.wind = loopNoise('lowpass', 240, .35, ambBus);
    layers.leaves = loopNoise('highpass', 3200, .4, ambBus);
    layers.water = loopNoise('lowpass', 900, .3, ambBus);
    // Renascimento F2 — rio: correnteza grave perto da margem e marulho claro das pedras no vau (posicional por distância)
    layers.river = loopNoise('lowpass', 620, .5, ambBus); layers.riffle = loopNoise('bandpass', 1900, 1.1, ambBus);
    // Mod 316 — cachoeira: rumor grave + chiado da água branca (posicional por distância, ver update)
    layers.falls = loopNoise('lowpass', 1100, .45, ambBus); layers.fallsHi = loopNoise('bandpass', 2700, .8, ambBus);
    // Zumbido grave do portal (duas senoides levemente desafinadas).
    const hum = ctx.createGain(); hum.gain.value = 0; hum.connect(ambBus);
    for (const [fr, det] of [[55, 0], [82.4, 4], [110, -6]]) { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = fr; o.detune.value = det; const g = ctx.createGain(); g.gain.value = fr === 55 ? .55 : .22; o.connect(g); g.connect(hum); o.start(); }
    layers.portal = { g: hum };
    layers.rain = loopNoise('highpass', 1800, .3, ambBus);
    // Caverna C4 — eco por câmara: resposta de sala procedural (ruído com decaimento de 2,6 s, sem arquivo de áudio).
    // Passos, golpes e gotas vão à sala por um envio cujo nível segue o tamanho da câmara. Fora da caverna o envio é 0.
    try { const n = Math.floor(ctx.sampleRate * 2.6), ir = ctx.createBuffer(2, n, ctx.sampleRate);
      for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < n; i++) { const t = i / n; d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 3.2) * (i < 900 ? i / 900 : 1); } }
      caveVerb = ctx.createConvolver(); caveVerb.buffer = ir; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
      caveSend = ctx.createGain(); caveSend.gain.value = 0; sfxBus.connect(caveSend); ambBus.connect(caveSend); caveSend.connect(lp); lp.connect(caveVerb); caveVerb.connect(comp);
    } catch (_) { caveVerb = caveSend = null; }
    layers.cave = loopNoise('lowpass', 110, .6, ambBus); // tom de sala: o "peso" do ar da caverna
    layers.rainLow = loopNoise('lowpass', 420, .5, ambBus);
    // MOD 208 — multidão do coliseu: murmúrio de vozes (ruído em banda de fala com leve vibrato).
    layers.cart = loopNoise('lowpass', 150, .8, sfxBus); layers.cartHi = loopNoise('bandpass', 900, 4, sfxBus); // MOD 291: rodas na terra + madeira rangendo
    layers.crowd = loopNoise('bandpass', 620, .55, ambBus); layers.crowdHi = loopNoise('bandpass', 1500, 1.2, ambBus);
    ready = true; applyVolumes();
    document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend(); else if (!pausedByGame) ctx.resume(); });
    if (pausedByGame || document.hidden) ctx.suspend();
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
        if (mode === 'silent') {
          // Não sintetizar pads inaudíveis em cenas silenciosas; retomar sem atraso ao sair.
          chordAt = t;
        } else if (t >= chordAt) { const c = chords[chordIdx++ % chords.length]; pad(night > .5 ? c.map(f => f * .75) : c, 7.5); chordAt = t + 7.5; }
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
    // O buffer de ruído dura 2 s: repetir evita truncar explosões longas ou iniciadas perto do fim.
    // A duração continua sendo limitada por stop(); não são criados buffers adicionais.
    src.loop = true;
    env(g, t, Math.min(.012, dur * .2), peak, dur); src.start(t, Math.random() * 1.6); src.stop(t + dur + .05);
  }
  function tone(type, f0, f1, peak, dur, bus = sfxBus, delay = 0) {
    const t = ctx.currentTime + delay, o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain(); o.connect(g); g.connect(bus); env(g, t, .008, peak, dur); o.start(t); o.stop(t + dur + .05);
  }
  /** Nota longa com ataque lento (coro/pad), para cenas. */
  function pad(f, peak, attack, hold, rel, delay = 0, type = 'sine', detune = 0) {
    const t = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = detune; o.connect(g); g.connect(sfxBus);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.setValueAtTime(peak, t + attack + hold); g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + rel);
    o.start(t); o.stop(t + attack + hold + rel + .05);
  }
  function cricket(level) {
    const base = 4300 + Math.random() * 700, n = 2 + (Math.random() * 3 | 0);
    for (let i = 0; i < n; i++) tone('triangle', base, 0, .03 * level, .028, ambBus, i * .055);
  }
  function bird(level) {
    const f = 2200 + Math.random() * 1600, n = 2 + (Math.random() * 3 | 0);
    for (let i = 0; i < n; i++) tone('sine', f * (1 + Math.random() * .15), f * (1.25 + Math.random() * .3), .022 * level, .09, ambBus, i * .13);
  }

  /** Passos: um a cada ~0,65 m percorridos no chão; superfície muda o timbre (usado dentro e fora da caverna). */
  function stepsOnly(dt, s) {
    if (s.grounded && s.speed > .4) {
      stepDistance += s.speed * dt;
      if (stepDistance > .66 && performance.now() - lastStepAt > 180) {
        stepDistance = 0; lastStepAt = performance.now();
        const sk = s.surface === 'path' || s.surface === 'stone' ? 'step:path' : s.surface === 'water' ? 'step:water' : s.biome === 'cinzas' || s.biome === 'vulcao' ? 'step:ash' : 'step:grass';
        if (bank && bank.play(sk, sfxBus, { gain: s.speed > 5 ? .55 : .38, rate: s.speed > 5 ? 1.06 : 1 })) {} // passos reais por superfície (corrida um pouco mais forte)
        else if (s.surface === 'path') burst('bandpass', 1500 + Math.random() * 400, 1.1, .12, .07);
        else if (s.surface === 'water') burst('lowpass', 900, .6, .14, .16);
        else burst('lowpass', 650 + Math.random() * 200, .7, .1, .09);
      }
    } else stepDistance = .5;
  }

  return {
    unlock,
    setCinematicGain(value){cinematicGain=Math.max(0,Math.min(1,value));applyVolumes();},
    get settings() { return { ...settings }; },
    get state() { return ctx ? ctx.state : 'locked'; },
    setVolume(kind, value) { if (kind in settings) { settings[kind] = kind === 'muted' ? !!value : Math.max(0, Math.min(1, Number(value) || 0)); save(); applyVolumes(); } },
    /** Chamado a cada quadro com o estado do mundo. */
    update(dt, s) {
      if (!ready || ctx.state !== 'running') return;
      const t = ctx.currentTime, night = s.night || 0;
      // missão áudio: trilha REAL de batalha por dimensão de Bispo (audio/musica); onde existe, a música sintética se cala
      let realMusic = false;
      if (bank && bank.ready) for (const k of ['bishop1', 'bishop2', 'bishop3', 'bishop4']) { const on = s.dimension === k; if (bank.has('mus:' + k) && bank.loop('mus:' + k, musicBus, on ? .9 : 0, { release: true }) && on) realMusic = true; }
      if (music) { music.set(realMusic ? 'silent' : (s.music || 'explore'), night); music.tick(dt, night); }
      gustTimer -= dt; if (gustTimer <= 0) { gustTimer = 3 + Math.random() * 6; layers.wind.f.frequency.setTargetAtTime(180 + Math.random() * 140, t, 1.4); }
      const height = Math.max(0, s.altitude || 0);
      // Mod 316 — transição suave mata ↔ campo aberto: dentro da mata o vento baixa e as folhas sobem.
      const forest = Math.max(0, Math.min(1, s.forest || 0));
      layers.wind.g.gain.setTargetAtTime((.035 + Math.min(.025, Math.max(0, height) * .003)) * (1 + .25 * Math.sin(t * .23)) * (1 - .38 * forest), t, .8);
      layers.leaves.g.gain.setTargetAtTime((.018 + .014 * Math.max(0, Math.sin(t * .41 + Math.sin(t * .13) * 2))) * (1 + .9 * forest), t, .6);
      const falls = Math.pow(Math.max(0, 1 - (s.fallsDistance ?? 999) / 44), 1.6);
      layers.falls.g.gain.setTargetAtTime(.3 * falls, t, .4); layers.fallsHi.g.gain.setTargetAtTime(.07 * falls * (1 + .15 * Math.sin(t * 1.7)), t, .3);
      layers.water.g.gain.setTargetAtTime(.22 * Math.max(0, 1 - (s.pondDistance || 99) / 26), t, .5);
      const river = Math.pow(Math.max(0, 1 - (s.riverDistance ?? 99) / 24), 1.4), ford = Math.max(0, Math.min(1, s.fordNear || 0));
      layers.river.g.gain.setTargetAtTime(.16 * river * (1 + .12 * Math.sin(t * .37 + Math.sin(t * .11) * 2)), t, .6);
      layers.river.f.frequency.setTargetAtTime(560 + 160 * river, t, .8);
      layers.riffle.g.gain.setTargetAtTime(.05 * ford * (.8 + .2 * Math.sin(t * 2.3) * Math.sin(t * .7)), t, .3);
      layers.portal.g.gain.setTargetAtTime(.09 * Math.max(0, 1 - (s.portalDistance || 99) / 30) * (s.portalReady ? 1.6 : 1), t, .5);
      // Caverna C4: sem pássaros, grilos nem folhas; eco pelo tamanho da câmara, gotas perto das poças, corrente de ar na boca.
      const cv = s.cave || null;
      // missão combate/áudio — ambientes REAIS por bioma (loops gerados, audio/amb), calando o procedural equivalente
      // assim que a amostra está tocando; dimensões têm paisagem própria (VHAZRAEL: salão do trono).
      let sampledBirds = false, sampledCrickets = false;
      if (bank && bank.ready) {
        const b = s.biome || null, dim = s.dimension || null, open = cv ? 0 : 1, outdoor = !dim;
        const green = outdoor && (b === 'vale' || b === 'prado' || b === 'floresta') ? 1 : 0, L = (ev, lv) => bank.loop(ev, ambBus, lv);
        sampledBirds = L('amb:forestDay', .5 * green * (1 - night) * open); sampledCrickets = L('amb:forestNight', .45 * green * night * open * Math.max(.4, s.insects ?? 1));
        const windOn = L('amb:wind', outdoor ? (b === 'serra' ? .45 : b === 'abismo' ? .22 : .12) * open : 0), riverOn = L('amb:river', .55 * river), fallsOn = L('amb:falls', .7 * falls);
        L('amb:volcano', outdoor && b === 'vulcao' ? .5 * open : 0); L('amb:ash', outdoor && b === 'cinzas' ? .4 * open : 0);
        L('amb:village', outdoor && b === 'cidade' ? .35 * (1 - .6 * night) * open : 0); L('amb:abyss', outdoor && b === 'abismo' ? .45 : 0);
        const caveOn = L('amb:cave', cv ? .5 + .2 * (cv.room || 0) : 0); L('amb:dim:bishop1', dim === 'bishop1' ? .5 : 0);
        if (windOn) layers.wind.g.gain.setTargetAtTime(0, t, .5);
        if (sampledBirds || sampledCrickets) layers.leaves.g.gain.setTargetAtTime(0, t, .5);
        if (riverOn) { layers.river.g.gain.setTargetAtTime(0, t, .5); layers.riffle.g.gain.setTargetAtTime(0, t, .5); }
        if (fallsOn) { layers.falls.g.gain.setTargetAtTime(0, t, .5); layers.fallsHi.g.gain.setTargetAtTime(0, t, .5); }
        if (caveOn && layers.cave) layers.cave.g.gain.setTargetAtTime(0, t, .5);
      }
      if (layers.cave) layers.cave.g.gain.setTargetAtTime(cv ? .05 + .04 * cv.room : 0, t, .8);
      if (caveSend) caveSend.gain.setTargetAtTime(cv ? .16 + .34 * cv.room : 0, t, .5);
      if (cv) { layers.leaves.g.gain.setTargetAtTime(0, t, .4); layers.wind.g.gain.setTargetAtTime(.012 + .03 * (cv.draft || 0), t, .8);
        dripTimer -= dt; if (dripTimer <= 0) { dripTimer = (.35 + Math.random() * 1.6) / Math.max(.15, cv.drip); const f = 1300 + Math.random() * 1400, k = .35 + .65 * cv.drip;
          tone('sine', f, f * .55, .05 * k, .06, ambBus); if (Math.random() < .5) tone('sine', f * 1.5, f * .8, .02 * k, .05, ambBus, .03); }
        return stepsOnly(dt, s); }
      // Mod 327: grilos só do anoitecer à madrugada e só onde há habitat (fauna3d.insectLevel); coro intermitente com pausas, baixo
      const ins = s.insects ?? (night > .4 ? 1 : 0);
      if (sampledBirds || sampledCrickets) { /* o loop real já traz pássaros/grilos */ }
      else if (night > .4 && ins > .05) { insectTimer -= dt; if (insectTimer <= 0) { insectTimer = (.3 + Math.random() * 1.1) / Math.max(.35, ins) + (Math.random() < .14 ? 2.5 + Math.random() * 4 : 0); cricket(night * (.35 + .5 * ins)); } }
      else { birdTimer -= dt; if (birdTimer <= 0) { birdTimer = (2.5 + Math.random() * 7) * (1 - .35 * forest); bird(1 - night); } }
      stepsOnly(dt, s);
    },
    swing(step=0, sword='') { if (!ready) return; if (bank && bank.play('swing:' + (Math.abs(step) % 3), sfxBus, { gain: .85, rate: sword === 'aurora' ? .9 : 1 })) return; const n=Math.abs(step)%3, dark=sword==='aurora'?.82:1; burst('bandpass', [700,920,540][n]*dark, 1.4, [.16,.13,.20][n], .2, sfxBus, [2600,3100,2100][n]*dark); },
    /** Mod 316 — bando de pássaros passando (chamado pelo sistema de pássaros quando um bando cruza perto). */
    flock(level = 1) { if (!ready) return; const f = 2600 + Math.random() * 900; for (let i = 0; i < 5; i++) tone('sine', f * (1 + Math.random() * .2), f * (1.3 + Math.random() * .3), .016 * level, .07, ambBus, i * .09 + Math.random() * .05); burst('bandpass', 1800, 1.2, .025 * level, .35, ambBus); },
    hit() { if (!ready) return; if (bank && bank.play('hit', sfxBus)) return; tone('sine', 150, 48, .38, .18); burst('lowpass', 1800, .7, .22, .08); },
    energyImpact(strength=1) { if(!ready)return;const k=Math.max(.2,Math.min(1,strength));tone('sine',90,32,.28*k,.4);burst('lowpass',850,.65,.18*k,.22,sfxBus,180); },
    hurt() { if (!ready) return; if (bank && bank.play('hurt', sfxBus)) return; tone('triangle', 110, 70, .26, .22); burst('bandpass', 500, .9, .16, .14); },
    whoosh() { if (!ready) return; if (bank && bank.play('whoosh', sfxBus, { gain: .8 })) return; burst('bandpass', 400, .8, .12, .26, sfxBus, 1300); },
    land() { if (!ready) return; if (bank && bank.play('land', sfxBus, { gain: .7 })) return; burst('lowpass', 420, .6, .16, .12); },
    magic(kind) {
      if (!ready) return;
      const roots = { magic: 523.3, magic2: 440, magic3: 349.2, ultimate: 261.6 }, r = roots[kind] || 440;
      [1, 1.5, 2, 2.52].forEach((m, i) => tone('sine', r * m, r * m * 1.01, .07, .7 + i * .12, sfxBus, i * .045));
      burst('highpass', 4000, .5, .06, .5);
      if (kind === 'ultimate') tone('sawtooth', 65, 40, .12, 1.2);
    },
    /** Pausa todo o som enquanto a dimensão do Bispo está aberta por cima do mundo. */
    pause(on) { pausedByGame=!!on; if (!ctx) return; if (pausedByGame || document.hidden) ctx.suspend(); else ctx.resume(); },
    portalEnter() { if (!ready) return; tone('sine', 220, 55, .2, 1.4); burst('bandpass', 300, .6, .18, 1.3, sfxBus, 3000); },
    shieldUp() { if (!ready) return; tone('sine', 660, 990, .05, .18); },
    block() { if (!ready) return; if (bank && bank.play('block', sfxBus)) return; tone('triangle', 320, 180, .2, .16); burst('bandpass', 2400, 2, .14, .1); },
    parry() { if (!ready) return; if (bank && bank.play('parry', sfxBus)) return; [1318, 1760, 2637].forEach((f, i) => tone('sine', f, f * 1.02, .11, .5, sfxBus, i * .03)); burst('highpass', 5000, .7, .12, .25); },
    lockOn() { if (!ready) return; if (bank && bank.play('lockOn', sfxBus, { gain: .35 })) return; tone('sine', 880, 1320, .06, .12); },
    /* missão combate/áudio: eventos novos com amostra própria (sem procedural antigo correspondente) */
    jump() { if (!ready) return; if (!(bank && bank.play('jump', sfxBus, { gain: .7 }))) burst('bandpass', 400, .8, .12, .26, sfxBus, 1300); },
    bodyFall() { if (ready && bank) bank.play('death', sfxBus, { gain: .8 }); },
    bossSwing(heavy = false) { if (ready && bank) bank.play(heavy ? 'vz:heavy' : 'vz:light', sfxBus, { gain: .9 }); },
    bossHit() { if (!ready) return; if (!(bank && bank.play('vz:hit', sfxBus))) tone('sine', 120, 40, .4, .2); },
    bankStats() { return bank ? bank.stats() : null; },
    /** Chuva do Ato II (0..1): chiado agudo + rumor grave. */
    /** MOD 208 — torcida do coliseu (0..1): murmúrio contínuo; roar() é a explosão de gritos pedindo morte. */
    /** MOD 291 — carroça de Teren: rolamento grave das rodas e rangido de madeira (0 = parada). */
    setCart(level) { if (!ready || !layers.cart) return; const t = ctx.currentTime, k = Math.max(0, Math.min(1, level)); layers.cart.g.gain.setTargetAtTime(.34 * k, t, .5); layers.cartHi.g.gain.setTargetAtTime(.05 * k, t, .6); if (k > 0) layers.cartHi.f.frequency.setTargetAtTime(760 + Math.random() * 260, t, .3); },
    setCrowd(level) { if (!ready || !layers.crowd) return; const t = ctx.currentTime; layers.crowd.g.gain.setTargetAtTime(.26 * level, t, .6); layers.crowdHi.g.gain.setTargetAtTime(.09 * level, t, .6); layers.crowd.f.frequency.setTargetAtTime(560 + Math.random() * 160, t, .5); },
    roar() { if (!ready) return; burst('bandpass', 700, .5, .3, 1.8, ambBus, 260); burst('bandpass', 1400, .9, .14, 1.5, ambBus, 500); [0, .35, .7].forEach(d => tone('sawtooth', 140 + Math.random() * 30, 120, .03, .3, ambBus, d)); },
    setRain(level) { if (!ready) return; if (bank && bank.loop('amb:rain', ambBus, .6 * Math.max(0, level))) { const tt = ctx.currentTime; layers.rain.g.gain.setTargetAtTime(0, tt, .5); layers.rainLow.g.gain.setTargetAtTime(0, tt, .5); return; } const t = ctx.currentTime; layers.rain.g.gain.setTargetAtTime(.2 * level, t, .8); layers.rainLow.g.gain.setTargetAtTime(.14 * level, t, .8); },
    thunder() { if (!ready) return; if (bank && bank.play('thunder', sfxBus, { gain: .9, when: .4 + Math.random() * 1.2 })) return; const t = ctx.currentTime + .4 + Math.random() * 1.2; const src = ctx.createBufferSource(); src.buffer = noiseBuf; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(380, t); f.frequency.exponentialRampToValueAtTime(70, t + 2.6); const g = ctx.createGain(); src.connect(f); f.connect(g); g.connect(ambBus); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(.55, t + .08); g.gain.exponentialRampToValueAtTime(0.0001, t + 3); src.loop = true; src.start(t); src.stop(t + 3.1); },
    /** MOD 203 — coro celeste (acorde maior com leve desafinação) para o prólogo no céu. */
    celestial() { if (!ready) return; [[261.6, 0], [329.6, .4], [392, .8], [523.3, 1.4], [659.3, 2.2]].forEach(([f, d]) => { pad(f, .045, 1.6, 4.5, 3, d); pad(f * 1.003, .03, 1.8, 4.5, 3, d + .05, 'triangle', 6); }); },
    /** Asas que se desfazem: brilho descendente. */
    dissolve() { if (!ready) return; if (bank && bank.play('dissolve', sfxBus, { gain: .8 })) return; for (let i = 0; i < 9; i++) tone('sine', 2093 - i * 140, 1046 - i * 60, .035, .9, sfxBus, i * .12); burst('highpass', 6000, .5, .05, 2.2); },
    /** Novo capítulo ("Ato 1"): tambor grave, acorde que cresce e um brilho no fim. */
    chapter() { if (!ready) return; tone('sine', 110, 42, .5, 1.6); burst('lowpass', 180, .8, .35, 1.4); [146.8, 220, 293.7, 440].forEach((f, i) => pad(f, .06, 1.1, 1.2, 1.6, .15 + i * .05, i % 2 ? 'triangle' : 'sine')); [1174.7, 1568, 2349].forEach((f, i) => tone('sine', f, 0, .04, 1.2, sfxBus, 1.3 + i * .08)); },
    /** MOD 204 — som de descoberta/conquista (chegada a uma cidade, algo novo): fanfarra curta de metais e sino. */
    discovery() { if (!ready) return; [[392, 0], [523.3, .18], [659.3, .36], [784, .54]].forEach(([f, d]) => { tone('sawtooth', f, f * 1.002, .035, .55, sfxBus, d); tone('sine', f * 2, 0, .03, .7, sfxBus, d); }); pad(523.3, .05, .5, .9, 1.4, .7); pad(659.3, .04, .5, .9, 1.4, .72, 'triangle'); pad(784, .035, .5, .9, 1.4, .74); tone('sine', 1568, 0, .05, 1.8, sfxBus, 1.1); },
    /** Saco de moedas trocando de mão. */
    coins() { if (!ready) return; if (bank && bank.play('coins', sfxBus, { gain: .7 })) return; for (let i = 0; i < 7; i++) tone('triangle', 2600 + Math.random() * 1400, 0, .03, .12, sfxBus, i * .06 + Math.random() * .03); burst('bandpass', 3400, 2, .05, .25); },
    /** Choro de criança ao longe (soluços em glissando, abafados). */
    sob() { if (!ready) return; for (let i = 0; i < 4; i++) { const f = 520 + Math.random() * 80; tone('triangle', f, f * .72, .025, .45, ambBus, i * .55 + Math.random() * .15); } },
    /** Clarão de transformação/possessão: grave descendente e chiado. */
    corrupt() { if (!ready) return; tone('sawtooth', 220, 40, .12, 1.4); burst('bandpass', 260, .7, .2, 1.2, sfxBus, 90); },
    reveal() { if (!ready) return; [784, 988, 1175, 1568].forEach((f, i) => tone('sine', f, 0, .06, .5, sfxBus, i * .09)); },
    /** MOD 210 — ultimates dos chefes: buraco negro (zumbido grave que sobe e sopro sugado), fogo abissal,
     *  e a Supernova da Ganância (carga com coro dissonante, silêncio curto e estrondo longo com brilho). */
    voidCharge() { if (!ready) return; tone('sine', 38, 96, .3, 5.6); tone('sawtooth', 55, 30, .06, 5.2); burst('bandpass', 180, 1.2, .16, 5.5, sfxBus, 1400); pad(110, .04, 1.5, 2.5, 1.5, 0, 'triangle'); pad(116.5, .035, 1.5, 2.5, 1.5, .1, 'triangle'); },
    abyss() { if (!ready) return; burst('lowpass', 420, .7, .22, 1.4, sfxBus, 120); tone('sawtooth', 90, 45, .07, 1.2); },
    /** MOD 237 — poderes sombrios do Enemy1: garras que rasgam o chão, espiral que ruge, juízo que trava e cai. */
    dark(kind) {
      if (!ready) return;
      if (kind === 'claws') { tone('sawtooth', 70, 38, .08, 1.1); burst('lowpass', 300, .7, .16, 1, sfxBus, 90); }
      else if (kind === 'rise') { burst('lowpass', 600, .8, .3, .55, sfxBus, 140); tone('triangle', 120, 55, .14, .5); }
      else if (kind === 'spiral') { burst('bandpass', 380, 1.1, .14, .9, sfxBus, 1500); tone('sawtooth', 110, 220, .05, .9); }
      else if (kind === 'impact') { tone('sine', 120, 40, .3, .5); burst('lowpass', 1400, .7, .24, .4); }
      else if (kind === 'judgment') { pad(98, .04, .4, 1.2, .6, 0, 'sawtooth'); pad(103.8, .03, .4, 1.2, .6, .05, 'triangle'); }
      else if (kind === 'lock') { tone('sine', 880, 1760, .05, .25); tone('sine', 1320, 2640, .03, .25, sfxBus, .04); }
      else if (kind === 'beam') { burst('highpass', 3000, .6, .14, .35); tone('sawtooth', 300, 60, .08, .4); }
      else if (kind === 'blast') { tone('sine', 62, 24, .5, 1.6); burst('lowpass', 900, .6, .4, 1.3, sfxBus, 80); burst('bandpass', 2600, .9, .1, .7, sfxBus, 500); }
    },
    /** MOD 245 — Enemy3: carga gravitacional grave, rasgo espacial, disparo de espada, aviso elétrico, trovão e impacto.
     *  gain (0..1) vem da distância até o herói; cada chamada varia o tom um pouco para não soar repetido. */
    abyss3(kind, gain = 1) {
      if (!ready) return; const g = Math.max(.05, Math.min(1, gain)), v = .9 + Math.random() * .2;
      if (kind === 'gravity') { tone('sine', 34 * v, 82 * v, .26 * g, 2.1); tone('sawtooth', 52 * v, 30, .05 * g, 1.9); burst('bandpass', 160, 1.3, .12 * g, 1.9, sfxBus, 900); }
      else if (kind === 'storm') { tone('sawtooth', 48 * v, 36, .08 * g, 2.4); burst('lowpass', 300, .7, .22 * g, 2.6, ambBus, 90); burst('highpass', 2600, .8, .04 * g, 2.2, sfxBus, 6000); }
      else if (kind === 'tear') { burst('bandpass', 900 * v, 2.2, .14 * g, .7, sfxBus, 180); tone('triangle', 420 * v, 70, .05 * g, .6); }
      else if (kind === 'warn') { burst('highpass', 5200 * v, 1.4, .05 * g, .28, sfxBus, 9000); tone('square', 1900 * v, 2600, .012 * g, .18); }
      else if (kind === 'thunder') { burst('lowpass', 2400 * v, .6, .3 * g, .45, sfxBus, 120); tone('sine', 90 * v, 30, .22 * g, .6); }
      else if (kind === 'heavy') { burst('lowpass', 1800 * v, .5, .42 * g, .9, sfxBus, 60); tone('sine', 60 * v, 22, .4 * g, 1.2); burst('highpass', 3800, .7, .08 * g, .4); }
      else if (kind === 'blade') { burst('bandpass', 1500 * v, 1.6, .1 * g, .22, sfxBus, 4200); tone('triangle', 780 * v, 1240, .02 * g, .12); }
      else if (kind === 'stick') { tone('triangle', 260 * v, 90, .1 * g, .2); burst('lowpass', 1200 * v, .8, .1 * g, .18); }
      else if (kind === 'launch') { burst('bandpass', 420 * v, .9, .16 * g, .7, sfxBus, 1600); tone('sawtooth', 70 * v, 140, .06 * g, .6); }
      else if (kind === 'boom') { tone('sine', 58 * v, 20, .55 * g, 1.6); burst('lowpass', 1000 * v, .6, .4 * g, 1.3, sfxBus, 70); burst('bandpass', 2800, .9, .1 * g, .6, sfxBus, 500); }
    },
    novaCharge() { if (!ready) return; tone('sine', 55, 220, .22, 2.9); [196, 207.7, 293.7, 311.1].forEach((f, i) => pad(f, .035, 1.2, 1.4, .4, i * .15, i % 2 ? 'sawtooth' : 'triangle')); burst('highpass', 1800, .6, .08, 2.8, sfxBus, 7000); },
    novaBlast() { if (!ready) return; tone('sine', 70, 22, .7, 3.4); burst('lowpass', 900, .6, .6, 2.8, sfxBus, 60); burst('bandpass', 3200, .8, .12, 1.6, sfxBus, 600); [1046.5, 1318.5, 1568].forEach((f, i) => tone('sine', f, f * .5, .04, 2.2, sfxBus, .25 + i * .07)); }
  };
}
