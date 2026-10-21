/**
 * MOD 186 — Terreno contínuo da Galáxia 1.
 *
 * Funções puras (sem Three.js) para que o relevo, os limites físicos e a
 * malha visual usem exatamente a mesma fonte de verdade. O vale jogável fica
 * cercado por contrafortes e serras de verdade (com colisão), em vez de cones
 * soltos sobre um plano infinito que o jogador podia atravessar.
 */

// ---------- ruído determinístico ----------
function hash2(ix, iz, seed) {
  let h = (ix * 374761393 + iz * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}
function smooth(t) { return t * t * (3 - 2 * t); }
export function valueNoise(x, z, seed = 1) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = smooth(x - ix), fz = smooth(z - iz);
  const a = hash2(ix, iz, seed), b = hash2(ix + 1, iz, seed), c = hash2(ix, iz + 1, seed), d = hash2(ix + 1, iz + 1, seed);
  return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
}
export function fbm(x, z, octaves = 4, seed = 1) {
  let sum = 0, amp = .5, norm = 0, f = 1;
  for (let i = 0; i < octaves; i++) { sum += valueNoise(x * f, z * f, seed + i * 17) * amp; norm += amp; amp *= .5; f *= 2.03; }
  return sum / norm;
}
/** Ruído "ridged": cristas afiadas e vales em V, típico de cordilheiras. */
export function ridged(x, z, octaves = 5, seed = 7) {
  let sum = 0, amp = .5, norm = 0, f = 1, weight = 1;
  for (let i = 0; i < octaves; i++) {
    let n = 1 - Math.abs(valueNoise(x * f, z * f, seed + i * 31) * 2 - 1);
    n *= n; n *= weight; weight = Math.min(1, n * 1.6);
    sum += n * amp; norm += amp; amp *= .5; f *= 2.11;
  }
  return sum / norm;
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smoothstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

function distToPolyline(x, z, points) {
  let best = Infinity;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], len = dx * dx + dz * dz;
    const t = len > 0 ? clamp(((x - a[0]) * dx + (z - a[1]) * dz) / len, 0, 1) : 0;
    const ox = x - (a[0] + dx * t), oz = z - (a[1] + dz * t), d = ox * ox + oz * oz;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}

/** Área explorável: retângulo arredondado com borda orgânica. */
export const PLAY_AREA = { cx: 0, cz: -64, hx: 82, hz: 98, round: 30, wobble: 7 };

/**
 * Cria a descrição do terreno.
 * @param {object} opts
 * @param {(x:number,z:number)=>number} [opts.hill] relevo autoral já existente (subida do portal)
 * @param {Array<{x:number,z:number,r:number,fade?:number}>} [opts.keepouts] áreas que precisam ficar planas
 * @param {Array<{points:number[][],r:number,fade?:number}>} [opts.paths] trilhas que precisam ficar planas
 * @param {Array<{x:number,z:number,r:number,depth:number,level:number}>} [opts.ponds] lagos escavados no vale
 */
export function createTerrain(opts = {}) {
  const hill = opts.hill || (() => 0);
  const keepouts = opts.keepouts || [];
  const paths = opts.paths || [];
  const ponds = opts.ponds || [];
  const area = Object.assign({}, PLAY_AREA, opts.area || {});

  /** Distância assinada até a borda explorável (negativa dentro do vale). */
  function boundaryDistance(x, z) {
    const qx = Math.abs(x - area.cx) - (area.hx - area.round);
    const qz = Math.abs(z - area.cz) - (area.hz - area.round);
    const outside = Math.hypot(Math.max(qx, 0), Math.max(qz, 0));
    const inside = Math.min(Math.max(qx, qz), 0);
    const wobble = (fbm(x * .021 + 40, z * .021 - 13, 3, 5) - .5) * 2 * area.wobble;
    return outside + inside - area.round + wobble;
  }

  /** 0 perto de trilhas, vila, clareiras e portal; 1 na mata livre. */
  function flatMask(x, z) {
    let m = 1;
    for (const k of keepouts) {
      const d = Math.hypot(x - k.x, z - k.z);
      m = Math.min(m, smoothstep(k.r, k.r + (k.fade || 6), d));
      if (m <= 0) return 0;
    }
    for (const p of paths) {
      const d = distToPolyline(x, z, p.points);
      m = Math.min(m, smoothstep(p.r, p.r + (p.fade || 5), d));
      if (m <= 0) return 0;
    }
    return m;
  }

  /** Elevação das montanhas a partir da distância à borda (s = d + 12). */
  function mountainHeight(x, z, d) {
    const s = d + 12;
    if (s <= 0) return 0;
    // Contraforte suave que vira encosta íngreme logo depois da borda.
    const foot = 7.5 * smoothstep(0, 15, s) + Math.max(0, s - 12) * .2;
    // Amplitude varia ao redor do vale para não formar uma parede uniforme.
    const massif = .55 + 1.05 * fbm(x * .0065 + 9, z * .0065 - 4, 3, 11);
    const r = ridged(x * .0105, z * .0105, 5, 23);
    const range = 56 * massif * smoothstep(6, 130, s) * (.35 + r * 1.05);
    // Picos distantes mais altos (silhuetas do horizonte).
    const far = 58 * smoothstep(120, 330, s) * ridged(x * .0042 + 3, z * .0042 + 7, 4, 41);
    // Detalhe rochoso fino só fora da área caminhável.
    const detail = (fbm(x * .09, z * .09, 3, 77) - .5) * 3.2 * smoothstep(4, 22, s);
    return foot + range + far + detail;
  }

  function relief(x, z) {
    const m = flatMask(x, z);
    if (m <= 0) return 0;
    const n = (fbm(x * .034 + 2, z * .034 - 6, 3, 3) - .5) * 2.6 + (valueNoise(x * .11, z * .11, 9) - .5) * .35;
    return n * m;
  }

  /** Bacia do lago: margem orgânica, fundo suave. */
  function pondCut(x, z) {
    let cut = 0;
    for (const p of ponds) {
      const wob = (fbm(x * .09 + p.x, z * .09 + p.z, 2, 13) - .5) * p.r * .35;
      const d = Math.hypot(x - p.x, z - p.z) - wob;
      if (d < p.r) cut = Math.max(cut, p.depth * smoothstep(p.r, p.r * .35, d));
    }
    return cut;
  }
  function height(x, z) {
    const d = boundaryDistance(x, z);
    return hill(x, z) + relief(x, z) + mountainHeight(x, z, d) - pondCut(x, z);
  }
  /** Altura da lâmina d'água acima do chão (negativa = seco; -99 longe de lagos). */
  function waterDepth(x, z) {
    let depth = -99;
    for (const p of ponds) if (Math.hypot(x - p.x, z - p.z) < p.r * 1.4) depth = Math.max(depth, p.level - height(x, z));
    return depth;
  }

  /** Limite físico: o jogador sobe o começo do contraforte e para onde a encosta fica íngreme. */
  const WALK_LIMIT = -5.5;
  function walkable(x, z) { return boundaryDistance(x, z) < WALK_LIMIT && waterDepth(x, z) < .38; }

  return { height, boundaryDistance, flatMask, relief, walkable, mountainHeight, waterDepth, ponds, area, WALK_LIMIT };
}

/**
 * Grade não uniforme: células finas no vale e progressivamente maiores até o
 * horizonte. Uma única malha contínua evita costuras, buracos e montanhas
 * flutuando.
 */
export function buildAxis(fineHalf, fineCell, outerSteps, growth) {
  const out = [];
  const fineSteps = Math.round(fineHalf / fineCell);
  for (let k = outerSteps; k >= 1; k--) out.push(-(fineHalf + fineCell * (Math.pow(growth, k) - 1) / (growth - 1)));
  for (let i = -fineSteps; i <= fineSteps; i++) out.push(i * fineCell);
  for (let k = 1; k <= outerSteps; k++) out.push(fineHalf + fineCell * (Math.pow(growth, k) - 1) / (growth - 1));
  return out;
}

/** Gera posições, cores e índices do terreno. */
export function buildTerrainArrays(terrain, { cx = 0, cz = -64, fineHalf = 124, fineCell = 2, outerSteps = 40, growth = 1.075 } = {}) {
  const ax = buildAxis(fineHalf, fineCell, outerSteps, growth).map(v => v + cx);
  const az = buildAxis(fineHalf, fineCell, outerSteps, growth).map(v => v + cz);
  const nx = ax.length, nz = az.length;
  const positions = new Float32Array(nx * nz * 3);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const k = (j * nx + i) * 3, x = ax[i], z = az[j];
    positions[k] = x; positions[k + 1] = terrain.height(x, z); positions[k + 2] = z;
  }
  const indices = new Uint32Array((nx - 1) * (nz - 1) * 6);
  let t = 0;
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
    // Alterna a diagonal para não criar serrilhado direcional nas encostas.
    if ((i + j) & 1) { indices[t++] = a; indices[t++] = c; indices[t++] = b; indices[t++] = b; indices[t++] = c; indices[t++] = d; }
    else { indices[t++] = a; indices[t++] = c; indices[t++] = d; indices[t++] = a; indices[t++] = d; indices[t++] = b; }
  }
  return { positions, indices, nx, nz, ax, az };
}

/** Paleta por altitude/inclinação. normals: Float32Array alinhado às posições. */
export function colorTerrain(terrain, positions, normals) {
  const colors = new Float32Array(positions.length);
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const grass = [.30, .41, .22], grassDark = [.19, .29, .17], moss = [.33, .38, .26], dirt = [.39, .33, .24];
  const rock = [.42, .41, .39], rockDark = [.27, .27, .28], rockWarm = [.47, .42, .36], snow = [.86, .89, .92];
  for (let k = 0; k < positions.length; k += 3) {
    const x = positions[k], y = positions[k + 1], z = positions[k + 2], ny = normals[k + 1];
    const slope = 1 - clamp(ny, 0, 1); // 0 plano, ~0.3 = 45°
    const n1 = fbm(x * .05, z * .05, 3, 91), n2 = valueNoise(x * .21, z * .21, 92);
    let c = mix(grassDark, grass, smoothstep(.3, .7, n1));
    c = mix(c, moss, smoothstep(.62, .82, n2) * .5);
    c = mix(c, dirt, smoothstep(.72, .9, n1) * .35);
    const wet = terrain.waterDepth ? terrain.waterDepth(x, z) : -1;
    if (wet > -.5) c = mix(c, [.33, .3, .22], smoothstep(-.5, .05, wet));
    const d = terrain.boundaryDistance(x, z);
    // Encostas: musgo -> rocha conforme inclinação e altitude.
    const rocky = clamp(smoothstep(.12, .3, slope) + smoothstep(14, 40, y) * .6, 0, 1) * smoothstep(-14, -2, d);
    const stone = mix(mix(rockDark, rock, n2), rockWarm, smoothstep(.55, .85, n1) * .6);
    c = mix(c, stone, rocky);
    // Neve só em altitude e onde a encosta segura a neve.
    const snowLine = 62 + (n1 - .5) * 22;
    const snowy = smoothstep(snowLine, snowLine + 14, y) * (1 - smoothstep(.22, .42, slope));
    c = mix(c, snow, snowy);
    // Paleta escrita em sRGB; o renderizador espera cores de vértice lineares.
    colors[k] = Math.pow(c[0], 2.2); colors[k + 1] = Math.pow(c[1], 2.2); colors[k + 2] = Math.pow(c[2], 2.2);
  }
  return colors;
}

/**
 * Distribuição natural de árvores: manchas de mata densa e clareiras guiadas
 * por ruído, em vez de sorteio uniforme. Retorna especificações puras.
 */
export function scatterForest(terrain, { seed = 9137, attempts = 2600, isFree = () => true, lowSpec = false } = {}) {
  let s = seed >>> 0;
  const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  const area = terrain.area, specs = [];
  const span = { x0: area.cx - area.hx - 70, x1: area.cx + area.hx + 70, z0: area.cz - area.hz - 70, z1: area.cz + area.hz + 70 };
  const total = lowSpec ? Math.round(attempts * .6) : attempts;
  for (let i = 0; i < total; i++) {
    const x = span.x0 + rnd() * (span.x1 - span.x0), z = span.z0 + rnd() * (span.z1 - span.z0);
    const d = terrain.boundaryDistance(x, z);
    const density = fbm(x * .028 + 31, z * .028 - 17, 3, 61);
    if (d < -11) {
      // Vale: bosques em manchas, com clareiras naturais.
      if (rnd() > smoothstep(.34, .62, density) * .95) continue;
      if (!isFree(x, z) || terrain.waterDepth(x, z) > -.25) continue;
      const kind = density > .6 && rnd() < .45 ? 'conifer' : (rnd() < .52 ? 'oak' : 'round');
      specs.push({ x, z, kind, s: .8 + rnd() * .75, rot: rnd() * Math.PI * 2, tint: rnd(), collide: true });
    } else if (d > 5 && d < 62) {
      // Encostas: coníferas rareando com a altitude (linha das árvores). A faixa do contraforte
      // fica aberta (pedras e capim) para a câmera não ficar presa dentro da mata no limite.
      const y = terrain.height(x, z);
      if (y > 38 + density * 12) continue;
      if (rnd() > (.78 - smoothstep(10, 46, y) * .7) * smoothstep(.22, .5, density + .12)) continue;
      specs.push({ x, z, kind: 'conifer', s: .85 + rnd() * .9, rot: rnd() * Math.PI * 2, tint: rnd(), collide: false });
    }
  }
  return specs;
}
