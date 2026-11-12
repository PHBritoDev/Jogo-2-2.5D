/**
 * Mod 316 — Luz nostálgica de Eldória (Ato I): paleta por HORA e por REGIÃO, sem pós-processamento.
 *
 * Antes: dois presets (dia ↔ noite) lineares; 9 h, 13 h e 17 h eram a mesma luz branca e chapada, o sol nunca
 * baixava e a noite era um azul uniforme. Agora:
 *  - 11 chaves de horário (madrugada, aurora, nascer, manhã, meio-dia, tarde, hora dourada, pôr do sol, crepúsculo,
 *    noite) interpoladas suavemente: sol quente e baixo de manhã/fim de tarde (sombras longas), preenchimento frio e
 *    suave do céu, chão devolvendo luz morna (hemisfério), névoa/perspectiva atmosférica que muda com a hora (bruma
 *    da manhã, ar limpo ao meio-dia, poeira dourada no fim da tarde) e luar azul legível à noite.
 *  - Sem filtro amarelo global, sem bloom, sem neon: as cores saem da física aproximada (altura do sol × atmosfera).
 *  - Regiões (pesos contínuos, sem trocas bruscas): mata fechada (luz filtrada esverdeada, névoa mais próxima e
 *    úmida), vila (preenchimento mais morno), lago (ar mais claro e frio), serra (bruma azul de distância) e prado.
 *
 * Tudo aqui é aritmética pura (sem Three): o jogo copia os números para as luzes. Nenhum material recompila — só
 * cores/intensidades/distâncias de névoa mudam (uniforms), então não há travadas ao trocar de hora ou região.
 */

/** Chaves de horário. h em horas; cores em hex sRGB; elev = elevação do sol em graus (negativa = abaixo do horizonte). */
export const TOD_KEYS = Object.freeze([
  { h: 0, skyH: 0x22324c, skyZ: 0x070d1c, fog: 0x1f3048, fogNear: 30, fogFar: 280, hemiSky: 0x5d7fb4, hemiGround: 0x2b3424, hemiInt: 1.16, sun: 0xa9c3ff, sunInt: .92, fill: 0x7f9fd0, fillInt: .26, exposure: 1.1, elev: -30 },
  { h: 4.6, skyH: 0x2c3a58, skyZ: 0x0b1428, fog: 0x2a3a56, fogNear: 26, fogFar: 260, hemiSky: 0x6680b0, hemiGround: 0x2d3426, hemiInt: 1.14, sun: 0xa9bcf4, sunInt: .86, fill: 0x7f9ad0, fillInt: .26, exposure: 1.1, elev: -14 },
  { h: 5.5, skyH: 0x7a7e9c, skyZ: 0x23345a, fog: 0x5c6680, fogNear: 18, fogFar: 230, hemiSky: 0x8f9cc4, hemiGround: 0x3b4234, hemiInt: 1.18, sun: 0xc6b8dc, sunInt: .72, fill: 0x8ca2d4, fillInt: .3, exposure: 1.08, elev: -4 },
  { h: 6.5, skyH: 0xf0c4a0, skyZ: 0x6d9cce, fog: 0xd8bea8, fogNear: 24, fogFar: 270, hemiSky: 0xf0dcca, hemiGround: 0x5a5242, hemiInt: 1.3, sun: 0xffb27a, sunInt: 1.65, fill: 0x9fb8e0, fillInt: .5, exposure: 1.05, elev: 6 },
  { h: 8.6, skyH: 0xd6e3d8, skyZ: 0x6aa5d3, fog: 0xc7d3cb, fogNear: 46, fogFar: 345, hemiSky: 0xf2f2e4, hemiGround: 0x5e6a48, hemiInt: 1.45, sun: 0xffdfae, sunInt: 2.0, fill: 0xa8c9e4, fillInt: .48, exposure: 1.02, elev: 26 },
  { h: 12.5, skyH: 0xd0e0e0, skyZ: 0x5e9dcf, fog: 0xbccdcd, fogNear: 50, fogFar: 360, hemiSky: 0xeef5fb, hemiGround: 0x616b4c, hemiInt: 1.5, sun: 0xfff0d8, sunInt: 2.12, fill: 0xadcde6, fillInt: .45, exposure: 1.0, elev: 52 },
  { h: 15.6, skyH: 0xe0dccb, skyZ: 0x679fcc, fog: 0xcfcdbd, fogNear: 46, fogFar: 340, hemiSky: 0xf6eedd, hemiGround: 0x67664a, hemiInt: 1.45, sun: 0xffdba8, sunInt: 2.05, fill: 0xa6c4e2, fillInt: .46, exposure: 1.02, elev: 31 },
  { h: 17.2, skyH: 0xf4c894, skyZ: 0x7ca2c6, fog: 0xe0c39e, fogNear: 36, fogFar: 300, hemiSky: 0xf5d8b6, hemiGround: 0x6b5a40, hemiInt: 1.32, sun: 0xffb469, sunInt: 1.95, fill: 0x9cb4dc, fillInt: .5, exposure: 1.04, elev: 10 },
  { h: 18.25, skyH: 0xee9e78, skyZ: 0x5f6a9c, fog: 0xc59a86, fogNear: 30, fogFar: 280, hemiSky: 0xd8b2a8, hemiGround: 0x4b4038, hemiInt: 1.24, sun: 0xff8a52, sunInt: 1.3, fill: 0x8c9ad0, fillInt: .42, exposure: 1.07, elev: 1.5 },
  { h: 19.3, skyH: 0x5f6290, skyZ: 0x1f2b52, fog: 0x454b6c, fogNear: 30, fogFar: 270, hemiSky: 0x8288bc, hemiGround: 0x33342c, hemiInt: 1.18, sun: 0xb0b8ff, sunInt: .95, fill: 0x7f90d0, fillInt: .3, exposure: 1.1, elev: -8 },
  { h: 21, skyH: 0x22324c, skyZ: 0x070d1c, fog: 0x1f3048, fogNear: 30, fogFar: 280, hemiSky: 0x5d7fb4, hemiGround: 0x2b3424, hemiInt: 1.16, sun: 0xa9c3ff, sunInt: .92, fill: 0x7f9fd0, fillInt: .26, exposure: 1.1, elev: -30 },
  { h: 24, skyH: 0x22324c, skyZ: 0x070d1c, fog: 0x1f3048, fogNear: 30, fogFar: 280, hemiSky: 0x5d7fb4, hemiGround: 0x2b3424, hemiInt: 1.16, sun: 0xa9c3ff, sunInt: .92, fill: 0x7f9fd0, fillInt: .26, exposure: 1.1, elev: -30 },
]);

const COLOR_KEYS = ['skyH', 'skyZ', 'fog', 'hemiSky', 'hemiGround', 'sun', 'fill'];
const NUM_KEYS = ['fogNear', 'fogFar', 'hemiInt', 'sunInt', 'fillInt', 'exposure', 'elev'];
const sm = t => t * t * (3 - 2 * t);
/** hex sRGB → [r,g,b] 0..1 (cache). */
const rgbCache = new Map();
export function hexRgb(h) { let c = rgbCache.get(h); if (!c) { c = [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255]; rgbCache.set(h, c); } return c; }

/** Estado de saída reutilizado (sem alocação por quadro). Cores em [r,g,b] sRGB 0..1. */
export function createLightState() {
  const s = { hour: 0 }; for (const k of COLOR_KEYS) s[k] = [0, 0, 0]; for (const k of NUM_KEYS) s[k] = 0; s.sunAz = 0; return s;
}

/**
 * Amostra a paleta para a hora `hour` (0..24) em `out`. Interpolação suavizada entre chaves vizinhas.
 * Azimute do sol: nasce a leste da trilha e se põe a oeste, em torno do azimute de composição original (`baseAz`).
 */
export function sampleTimeOfDay(hour, out = createLightState(), { baseAz = Math.atan2(-.12, -.86), sweep = 1.25 } = {}) {
  const h = ((hour % 24) + 24) % 24;
  let i = 0; while (i < TOD_KEYS.length - 2 && TOD_KEYS[i + 1].h <= h) i++;
  const a = TOD_KEYS[i], b = TOD_KEYS[i + 1], t = sm(Math.min(1, Math.max(0, (h - a.h) / Math.max(1e-6, b.h - a.h))));
  for (const k of COLOR_KEYS) { const ca = hexRgb(a[k]), cb = hexRgb(b[k]), o = out[k]; o[0] = ca[0] + (cb[0] - ca[0]) * t; o[1] = ca[1] + (cb[1] - ca[1]) * t; o[2] = ca[2] + (cb[2] - ca[2]) * t; }
  for (const k of NUM_KEYS) out[k] = a[k] + (b[k] - a[k]) * t;
  // azimute: 6 h → leste da composição, 18 h → oeste (meio-dia = azimute original que enquadra o sol sobre a trilha)
  const dayU = Math.min(1, Math.max(0, (h - 6) / 12));
  out.sunAz = baseAz + (dayU - .5) * 2 * sweep * .5;
  out.hour = h;
  return out;
}

/** Direção unitária do sol (x,y,z) a partir de elevação (graus) e azimute (rad); elevação mínima para iluminar. */
export function sunDirection(elevDeg, az, out = [0, 0, 0], minElev = 4) {
  const e = Math.max(minElev, elevDeg) * Math.PI / 180, c = Math.cos(e);
  out[0] = Math.sin(az) * c; out[1] = Math.sin(e); out[2] = Math.cos(az) * c; return out;
}

/** Notas de grade por região: multiplicadores/misturas aplicados por cima da paleta horária. */
export const REGION_GRADES = Object.freeze({
  // mata fechada: luz filtrada pelas copas (verde-musgo suave), névoa úmida mais próxima, sol um pouco mais baixo de força
  forest: { fogMix: 0x8ea488, fogMixNight: 0x1b2b2a, fogMixK: .28, fogNearK: .62, fogFarK: .78, hemiK: .9, sunK: .9, fillK: 1.08, exposureAdd: .04 },
  // vila: ar morno (fumaça de fogão, telhados), preenchimento levemente quente
  village: { fogMix: 0xd8c8b0, fogMixNight: 0x2d2f3e, fogMixK: .14, fogNearK: .92, fogFarK: .95, hemiK: 1.0, sunK: 1.0, fillK: 1.0, fillWarm: .12, exposureAdd: 0 },
  // lago: ar aberto, mais claro e frio (reflexo do céu)
  lake: { fogMix: 0xc4d8dc, fogMixNight: 0x22344c, fogMixK: .16, fogNearK: 1.05, fogFarK: 1.04, hemiK: 1.04, sunK: 1.0, fillK: 1.06, exposureAdd: -.01 },
  // serra: bruma azul de distância (perspectiva atmosférica)
  serra: { fogMix: 0xa9bccd, fogMixNight: 0x22304a, fogMixK: .24, fogNearK: .85, fogFarK: .9, hemiK: 1.0, sunK: 1.0, fillK: 1.04, exposureAdd: 0 },
});

/**
 * Aplica pesos regionais (0..1 cada, somados ≤ 1) sobre um estado já amostrado. `night` 0..1 escolhe o tom noturno.
 * Modifica `s` no lugar e devolve `s`.
 */
export function applyRegionGrade(s, weights, night = 0) {
  for (const key in weights) {
    const w = weights[key]; const g = REGION_GRADES[key]; if (!g || !(w > 0)) continue;
    const mix = hexRgb(g.fogMix), mixN = hexRgb(g.fogMixNight), k = g.fogMixK * w;
    for (let i = 0; i < 3; i++) { const target = mix[i] + (mixN[i] - mix[i]) * night; s.fog[i] += (target - s.fog[i]) * k; }
    s.fogNear *= 1 + (g.fogNearK - 1) * w; s.fogFar *= 1 + (g.fogFarK - 1) * w;
    s.hemiInt *= 1 + (g.hemiK - 1) * w; s.sunInt *= 1 + (g.sunK - 1) * w; s.fillInt *= 1 + (g.fillK - 1) * w;
    s.exposure += g.exposureAdd * w;
    if (g.fillWarm) { const f = s.fill, wk = g.fillWarm * w * (1 - night); f[0] = Math.min(1, f[0] + wk * .5); f[2] = Math.max(0, f[2] - wk * .4); }
  }
  return s;
}

/**
 * Sonda de região com grade de densidade de árvores pré-calculada (uma vez) — consulta O(1), sem alocação.
 * trees: [{x,z}], village/pond: {x,z,r}, serraZ: limite sul da serra.
 */
export function createRegionProbe({ trees = [], village, pond, serraZ = -190, cell = 8, extent = 360 } = {}) {
  const n = Math.ceil(extent * 2 / cell), grid = new Float32Array(n * n);
  for (const t of trees) { const i = Math.floor((t.x + extent) / cell), j = Math.floor((t.z + extent) / cell); if (i >= 0 && j >= 0 && i < n && j < n) grid[i + j * n]++; }
  const dens = (x, z) => { const fi = (x + extent) / cell - .5, fj = (z + extent) / cell - .5, i = Math.floor(fi), j = Math.floor(fj), u = fi - i, v = fj - j;
    const g = (a, b) => (a >= 0 && b >= 0 && a < n && b < n) ? grid[a + b * n] : 0;
    return (g(i, j) * (1 - u) + g(i + 1, j) * u) * (1 - v) + (g(i, j + 1) * (1 - u) + g(i + 1, j + 1) * u) * v; };
  const out = { forest: 0, village: 0, lake: 0, serra: 0 };
  const near = (x, z, c, r0, r1) => { if (!c) return 0; const d = Math.hypot(x - c.x, z - c.z); return d <= r0 ? 1 : d >= r1 ? 0 : sm(1 - (d - r0) / (r1 - r0)); };
  return function probe(x, z) {
    // densidade média de troncos por célula de 8 m: ≥ 3 = mata fechada
    const d = (dens(x, z) * 2 + dens(x + cell, z) + dens(x - cell, z) + dens(x, z + cell) + dens(x, z - cell)) / 6;
    out.village = near(x, z, village, village ? village.r : 0, village ? village.r + 18 : 1);
    out.lake = near(x, z, pond, pond ? pond.r + 2 : 0, pond ? pond.r + 16 : 1);
    out.serra = z < serraZ ? Math.min(1, (serraZ - z) / 30) : 0;
    out.forest = Math.max(0, Math.min(1, (d - 1) / 2.5)) * (1 - out.village) * (1 - out.lake * .6);
    const sum = out.forest + out.village + out.lake + out.serra; if (sum > 1) { out.forest /= sum; out.village /= sum; out.lake /= sum; out.serra /= sum; }
    return out;
  };
}
