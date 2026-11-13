/**
 * Renascimento de Eldória — Fase 1: clima do mundo aberto (lógica pura, sem THREE; testável em Node).
 *
 * O clima é uma cadeia de estados com durações e transições suaves:
 *  - nunca troca de forma brusca;
 *  - a tempestade só nasce de chuva forte;
 *  - a chuva não é constante;
 *  - a neblina de vale aparece de madrugada e ao amanhecer.
 *
 * Ele não substitui o ciclo de luz (eldoria-nostalgic-light.js): modula a amostra da hora
 * (`applyWeatherToLight`) depois da nota por região. O céu fica mais cinza com nuvens, o sol perde força e a
 * névoa se aproxima. O relâmpago acende a cena por um instante e o trovão chega atrasado pela distância
 * (343 m/s).
 *
 * Tudo aqui é determinístico por semente: os testes e o QA reproduzem a mesma sequência.
 */

/** Parâmetros por estado.
 * - cover: cobertura de nuvens;
 * - dark: base escura das nuvens;
 * - rain: intensidade da chuva (0..1);
 * - wind: vento 0..1;
 * - fog: fração do alcance da névoa (1 = sem mudança);
 * - sun: fator da luz direta;
 * - sat: saturação do céu;
 * - bolts: relâmpagos por minuto. */
export const WEATHER = Object.freeze({
  limpo:        Object.freeze({ cover: .12, dark: 0,   rain: 0,   wind: .22, fog: 1,   sun: 1,   sat: 1,   bolts: 0 }),
  nuvens:       Object.freeze({ cover: .42, dark: .08, rain: 0,   wind: .34, fog: .95, sun: .9,  sat: .95, bolts: 0 }),
  encoberto:    Object.freeze({ cover: .78, dark: .3,  rain: 0,   wind: .42, fog: .78, sun: .52, sat: .72, bolts: 0 }),
  neblina:      Object.freeze({ cover: .55, dark: .12, rain: 0,   wind: .08, fog: .36, sun: .62, sat: .7,  bolts: 0 }),
  chuvisco:     Object.freeze({ cover: .82, dark: .36, rain: .28, wind: .38, fog: .66, sun: .45, sat: .64, bolts: 0 }),
  chuva:        Object.freeze({ cover: .9,  dark: .52, rain: .62, wind: .55, fog: .52, sun: .32, sat: .56, bolts: 0 }),
  'chuva-forte':Object.freeze({ cover: .96, dark: .68, rain: .9,  wind: .74, fog: .4,  sun: .22, sat: .48, bolts: .9 }),
  tempestade:   Object.freeze({ cover: 1,   dark: .84, rain: 1,   wind: 1,   fog: .34, sun: .14, sat: .4,  bolts: 4.2 }),
});
export const WEATHER_KEYS = Object.freeze(Object.keys(WEATHER));
const PARAMS = ['cover', 'dark', 'rain', 'wind', 'fog', 'sun', 'sat', 'bolts'];

/** Cadeia de transições (pesos) e faixa de duração em segundos reais. O relógio do jogo tem 24 h = 960 s, então
 *  uma chuva dura de 1,5 a 6 h de jogo e a tempestade raramente passa de 3 min reais. */
export const TRANSITIONS = Object.freeze({
  limpo:        { next: { limpo: 3, nuvens: 5, encoberto: 1.2, neblina: 0 }, dur: [120, 260] },
  nuvens:       { next: { limpo: 3, nuvens: 1.5, encoberto: 3, chuvisco: .8, neblina: 0 }, dur: [90, 200] },
  encoberto:    { next: { nuvens: 3, chuvisco: 2.4, chuva: 1.3, neblina: 0 }, dur: [70, 160] },
  neblina:      { next: { nuvens: 3, limpo: 2, encoberto: 1 }, dur: [80, 170] },
  chuvisco:     { next: { encoberto: 2.2, chuva: 1.6, nuvens: 1 }, dur: [60, 150] },
  chuva:        { next: { chuvisco: 2, encoberto: 1.6, 'chuva-forte': 1.1 }, dur: [70, 170] },
  'chuva-forte':{ next: { chuva: 2.2, tempestade: 1.2, encoberto: .6 }, dur: [50, 110] },
  tempestade:   { next: { 'chuva-forte': 2.4, chuva: 1 }, dur: [55, 120] },
});

/** PRNG pequeno e estável (mulberry32). */
export function rng(seed = 1) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** Pesos ajustados pela hora e pela região: neblina só de madrugada/amanhecer (mais na mata e no lago); a serra
 *  junta nuvens; à tarde quente a chance de chuva cresce um pouco (convecção). */
export function weightsFor(state, hour, region = {}) {
  const base = TRANSITIONS[state] ? TRANSITIONS[state].next : TRANSITIONS.limpo.next, out = {};
  const dawn = hour >= 3.8 && hour <= 7.6, afternoon = hour >= 13 && hour <= 18.5, forest = (region.forest || 0) + (region.lake || 0) * .8;
  for (const k in base) {
    let w = base[k];
    if (k === 'neblina') w = dawn ? 2.4 + forest * 3 : 0;
    if (afternoon && (k === 'chuvisco' || k === 'chuva' || k === 'encoberto')) w *= 1.25;
    if ((region.serra || 0) > .3 && (k === 'nuvens' || k === 'encoberto')) w *= 1.3;
    out[k] = w;
  }
  return out;
}
export function pickWeighted(weights, r) {
  let total = 0; for (const k in weights) total += Math.max(0, weights[k]);
  if (total <= 0) return 'limpo';
  let x = r * total; for (const k in weights) { x -= Math.max(0, weights[k]); if (x <= 0) return k; }
  return Object.keys(weights)[0];
}

/** Parâmetros misturados atuais (objeto reutilizado). */
export function createWeatherParams(from = WEATHER.limpo) { const p = {}; for (const k of PARAMS) p[k] = from[k]; return p; }

/**
 * Diretor de clima. `update(dt, hour, region)` avança, sorteia o próximo estado quando o atual acaba e aproxima os
 * parâmetros do alvo (constante de tempo ~ `blend` s; a chuva começa e para um pouco mais devagar).
 * Retorna eventos do quadro: `strike` com { az, dist, power, thunderIn } quando cai um relâmpago.
 */
export function createWeatherDirector({ seed = 20261113, state = 'limpo', blend = 28, elapsed = 0 } = {}) {
  const R = rng(seed);
  const cur = createWeatherParams(WEATHER[state] || WEATHER.limpo);
  let name = WEATHER[state] ? state : 'limpo', left = durFor(name), held = 0, boltClock = 4 + R() * 6;
  const pendingThunder = [];
  let wetness = 0, gustT = R() * 100, gust = 0, time = elapsed;
  function durFor(n) { const d = (TRANSITIONS[n] || TRANSITIONS.limpo).dur; return d[0] + R() * (d[1] - d[0]); }
  function setState(n, holdSeconds = 0) { if (!WEATHER[n]) return false; name = n; left = durFor(n); held = Math.max(0, holdSeconds); return true; }
  function update(dt, hour = 12, region = {}) {
    dt = Math.max(0, Math.min(.25, dt)); time += dt;
    const events = [];
    if (held > 0) held -= dt; else { left -= dt; if (left <= 0) { name = pickWeighted(weightsFor(name, hour, region), R()); left = durFor(name); } }
    const tgt = WEATHER[name];
    for (const k of PARAMS) {
      const tau = k === 'rain' ? (tgt.rain > cur.rain ? blend * 1.25 : blend * .8) : k === 'bolts' ? 6 : blend;
      cur[k] += (tgt[k] - cur[k]) * (1 - Math.exp(-dt / tau));
    }
    // rajadas: ruído lento + picos raros (não sincronizado com nada)
    gustT += dt * (.35 + cur.wind * .8);
    gust = Math.max(0, Math.sin(gustT * 1.3) * .5 + Math.sin(gustT * .47 + 1.7) * .35 + Math.sin(gustT * 2.9 + .4) * .15);
    // superfícies molhadas: molham rápido sob chuva, secam devagar
    wetness += (cur.rain > .08 ? cur.rain * .045 : -.006) * dt; wetness = Math.max(0, Math.min(1, wetness));
    // relâmpagos (processo de Poisson pela taxa atual)
    if (cur.bolts > .05) {
      boltClock -= dt * cur.bolts / 60;
      if (boltClock <= 0) {
        boltClock = -Math.log(1 - R() * .999);
        const dist = 260 + Math.pow(R(), 1.4) * 2600, az = R() * Math.PI * 2;
        const s = { az, dist, power: Math.min(1, 1.25 - dist / 3200), thunderIn: dist / 343, at: time };
        pendingThunder.push(s); events.push({ type: 'strike', ...s });
      }
    }
    for (let i = pendingThunder.length - 1; i >= 0; i--) { const s = pendingThunder[i]; if (time - s.at >= s.thunderIn) { pendingThunder.splice(i, 1); events.push({ type: 'thunder', dist: s.dist, power: s.power }); } }
    return events;
  }
  return {
    update, setState,
    get name() { return name; }, get params() { return cur; }, get wetness() { return wetness; }, get gust() { return gust; },
    get remaining() { return held > 0 ? held : left; },
    /** vento efetivo 0..~1.4 (com rajada) */
    get windNow() { return cur.wind * (.75 + gust * .65); },
    snapshot() { return { name, left: Math.round(left), wet: +wetness.toFixed(3) }; },
    restore(s) { if (s && WEATHER[s.name]) { name = s.name; left = Math.max(20, +s.left || durFor(name)); for (const k of PARAMS) cur[k] = WEATHER[name][k]; wetness = Math.max(0, Math.min(1, +s.wet || 0)); } },
  };
}

const lum = c => c[0] * .2126 + c[1] * .7152 + c[2] * .0722;
function toGrey(c, k, tint = 1) { const l = lum(c) * tint; c[0] += (l - c[0]) * k; c[1] += (l - c[1]) * k; c[2] += (l * 1.04 - c[2]) * k; }

/**
 * Modula a amostra da hora (estado de eldoria-nostalgic-light, cores sRGB [r,g,b]) pelo clima, em lugar.
 * `night` 0..1, `flash` 0..1 (clarão do relâmpago). A noite de tempestade fica ameaçadora, mas nunca ilegível:
 * o hemisfério tem piso e o clarão revela a paisagem.
 */
export function applyWeatherToLight(L, W, night = 0, flash = 0) {
  const c = W.cover, grey = Math.min(1, (1 - W.sat) * 1.15 + Math.max(0, c - .6) * .8);
  for (const k of ['skyH', 'skyZ', 'fog', 'hemiSky']) toGrey(L[k], grey * (k === 'skyZ' ? .9 : 1), 1 - W.dark * .42);
  // céu encoberto: o zênite desce ao tom do horizonte (o céu vira uma tampa de nuvens)
  const lid = Math.max(0, c - .55) / .45 * .7; for (let i = 0; i < 3; i++) L.skyZ[i] += (L.skyH[i] - L.skyZ[i]) * lid;
  L.sunInt *= W.sun; L.fillInt *= .85 + .15 * W.sun;
  L.hemiInt *= 1 - c * .18 + (1 - W.sun) * .08;
  L.fogFar *= W.fog; L.fogNear *= .55 + .45 * W.fog;
  L.exposure *= 1 - W.dark * .07 * (1 - night * .5);
  const floor = .72 + .2 * (1 - night); if (L.hemiInt < floor) L.hemiInt = floor;
  if (flash > 0) {
    const f = Math.min(1, flash);
    L.hemiInt += f * 1.6; L.exposure *= 1 + f * .16;
    for (const k of ['skyH', 'skyZ', 'fog', 'hemiSky']) { const o = L[k]; o[0] += (.8 - o[0]) * f * .4; o[1] += (.83 - o[1]) * f * .4; o[2] += (.95 - o[2]) * f * .4; }
  }
  return L;
}

/** Quanto do disco do sol/lua aparece através das nuvens (para ocultar astros sob céu fechado). */
export function celestialVisibility(W) { return Math.max(0, 1 - Math.max(0, W.cover - .35) / .5); }
