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
  const extraAreas = (opts.extraAreas || []).map(a => Object.assign({ round: 20, wobble: 5 }, a));
  const passes = opts.passes || [];
  const channels = opts.channels || [];
  const area = Object.assign({}, PLAY_AREA, opts.area || {});

  /** Distância assinada até a borda explorável (negativa dentro do vale). */
  function rectDistance(a, x, z) {
    const qx = Math.abs(x - a.cx) - (a.hx - a.round);
    const qz = Math.abs(z - a.cz) - (a.hz - a.round);
    const outside = Math.hypot(Math.max(qx, 0), Math.max(qz, 0));
    const inside = Math.min(Math.max(qx, qz), 0);
    return outside + inside - a.round;
  }
  /** União suave: vales e gargantas se encontram sem quina. */
  function smin(a, b, k) { const h = clamp(.5 + .5 * (b - a) / k, 0, 1); return b + (a - b) * h - k * h * (1 - h); }
  function boundaryDistance(x, z) {
    let d = rectDistance(area, x, z);
    for (const a of extraAreas) d = smin(d, rectDistance(a, x, z), 12);
    for (const p of passes) d = smin(d, distToPolyline(x, z, p.points) - p.r, 8);
    const wobble = (fbm(x * .021 + 40, z * .021 - 13, 3, 5) - .5) * 2 * area.wobble;
    return d + wobble;
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
    for (const c of channels) {
      const d = distToPolyline(x, z, c.points);
      if (d < c.width) cut = Math.max(cut, c.depth * smoothstep(c.width, c.width * .45, d));
    }
    for (const p of ponds) {
      const wob = (fbm(x * .09 + p.x, z * .09 + p.z, 2, 13) - .5) * p.r * (p.wobble ?? .35) + (fbm(x * .23 - p.z, z * .23 + p.x, 2, 29) - .5) * p.r * (p.wobble ? .18 : 0);
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
    for (const c of channels) if (distToPolyline(x, z, c.points) < c.width * 1.2) depth = Math.max(depth, c.level - height(x, z));
    return depth;
  }

  /** Limite físico: o jogador sobe o começo do contraforte e para onde a encosta fica íngreme. */
  const WALK_LIMIT = -5.5;
  function walkable(x, z) { return boundaryDistance(x, z) < WALK_LIMIT && waterDepth(x, z) < 1.25; }

  // Mod 291: sombra opcional do dossel (1 = sem sombra) usada só na cor do relevo.
  const shade = opts.shade || null;
  return { height, boundaryDistance, flatMask, relief, walkable, mountainHeight, waterDepth, ponds, channels, area, extraAreas, WALK_LIMIT, shade };
}

/**
 * Grade não uniforme: células finas no vale e progressivamente maiores até o
 * horizonte. Uma única malha contínua evita costuras, buracos e montanhas
 * flutuando.
 */
export function buildAxis(fineHalf, fineCell, outerSteps, growth) {
  const out = [];
  const fineSteps = Math.round(fineHalf / fineCell);
  // The fine grid ends at fineSteps * fineCell, which can differ from
  // fineHalf when the requested extent is not an exact cell multiple.
  // Using fineHalf for the exterior would stretch the first outer cell
  // (3.5 m instead of 2.5 m in the mobile preset); anchor to the real vertex.
  const fineEdge = fineSteps * fineCell;
  // Growth 1 defines an evenly spaced exterior; geometric-series division
  // would otherwise yield 0/0 and send NaN positions to WebGL.
  const outerOffset = k => growth === 1 ? fineCell * k : fineCell * (Math.pow(growth, k) - 1) / (growth - 1);
  for (let k = outerSteps; k >= 1; k--) out.push(-(fineEdge + outerOffset(k)));
  for (let i = -fineSteps; i <= fineSteps; i++) out.push(i * fineCell);
  for (let k = 1; k <= outerSteps; k++) out.push(fineEdge + outerOffset(k));
  return out;
}

/** Gera posições, cores e índices do terreno. */
export function buildTerrainArrays(terrain, { cx = 0, cz = -64, fineHalf = 124, fineHalfZ = fineHalf, fineCell = 2, outerSteps = 40, growth = 1.075, holes = [] } = {}) {
  const ax = buildAxis(fineHalf, fineCell, outerSteps, growth).map(v => v + cx);
  const az = buildAxis(fineHalfZ, fineCell, outerSteps, growth).map(v => v + cz);
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
    // Mod 291: células cobertas por um retalho fino (prado do prólogo) saem da malha principal.
    if (holes.length) { const mx = (ax[i] + ax[i + 1]) * .5, mz = (az[j] + az[j + 1]) * .5; if (holes.some(h => mx > h.x0 && mx < h.x1 && mz > h.z0 && mz < h.z1)) continue; }
    if ((i + j) & 1) { indices[t++] = a; indices[t++] = c; indices[t++] = b; indices[t++] = b; indices[t++] = c; indices[t++] = d; }
    else { indices[t++] = a; indices[t++] = c; indices[t++] = d; indices[t++] = a; indices[t++] = d; indices[t++] = b; }
  }
  return { positions, indices: t < indices.length ? indices.slice(0, t) : indices, nx, nz, ax, az };
}

/**
 * Mod 291 — retalho de terreno com células finas para uma região fora da grade fina principal
 * (o prado da queda e a estrada de Teren ficam ao sul). Usa a MESMA função de altura; a borda
 * encostada na malha principal compartilha os vértices e as outras bordas ganham uma saia para
 * esconder frestas de T-junction nas encostas.
 */
export function buildTerrainPatch(terrain, { x0, x1, z0, z1, cell = 2.5, skirt = 4, skirtEdges = ['x0', 'x1', 'z1'] } = {}) {
  // Invalid exterior patch extents used to create degenerate triangles or
  // unbounded allocations; fail at the caller instead of corrupting WebGL.
  if (![x0, x1, z0, z1, cell, skirt].every(Number.isFinite) ||
      !(x1 > x0) || !(z1 > z0) || !(cell > 0) || skirt < 0) {
    throw new RangeError('buildTerrainPatch: invalid exterior patch bounds or resolution');
  }
  // Preserve the requested world-space edges even when a span is not a multiple
  // of cell. Ceil keeps every actual grid interval <= the requested cell size;
  // rounding could silently stretch outer trail cells by nearly 50%.
  const nx = Math.max(2, Math.ceil((x1 - x0) / cell) + 1);
  const nz = Math.max(2, Math.ceil((z1 - z0) / cell) + 1);
  // A corrupted resolution can otherwise allocate millions of vertices and
  // lock up mobile browsers before the geometry is even sent to WebGL.
  // Normal exterior patches are orders of magnitude smaller than this guard.
  // Count the skirt vertices as well: a long/thin patch can have few
  // surface vertices but a large boundary buffer. Reject unknown edges and
  // duplicates before allocating the arrays or creating degenerate walls.
  const edgeNames = ['x0', 'x1', 'z0', 'z1'];
  if (!Array.isArray(skirtEdges) || new Set(skirtEdges).size !== skirtEdges.length ||
      skirtEdges.some(name => !edgeNames.includes(name))) {
    throw new RangeError('buildTerrainPatch: invalid skirt edges');
  }
  // A zero-depth skirt has no surface: omit its degenerate walls entirely.
  // This also avoids wasting index/vertex bandwidth in low-detail exterior patches.
  const activeSkirtEdges = skirt === 0 ? [] : skirtEdges;
  const skirtVertices = activeSkirtEdges.reduce((count, name) =>
    count + (name === 'x0' || name === 'x1' ? nz : nx), 0);
  if (!Number.isSafeInteger(nx) || !Number.isSafeInteger(nz) ||
      nx * nz + skirtVertices > 1_000_000) {
    throw new RangeError('buildTerrainPatch: exterior patch exceeds vertex budget');
  }
  const dx = (x1 - x0) / (nx - 1), dz = (z1 - z0) / (nz - 1);
  // Report out-of-range world coordinates before testing cell collapse:
  // Infinity from Float32 conversion is a different defect than zero width.
  if (![x0, x1, z0, z1].every(v => Number.isFinite(Math.fround(v)))) {
    throw new RangeError('buildTerrainPatch: exterior position exceeds Float32 range');
  }
  // World coordinates can be finite and within Float32 range yet round to
  // the same GPU coordinate. A collapsed strip has zero-area triangles and
  // cannot form a traversable exterior surface. Validate before allocating.
  const distinctGpuCells = (start, end, count, step) => {
    let previous = Math.fround(start);
    for (let i = 1; i < count; i++) {
      const current = Math.fround(i === count - 1 ? end : start + i * step);
      if (!(current > previous)) return false;
      previous = current;
    }
    return true;
  };
  if (!distinctGpuCells(x0, x1, nx, dx) || !distinctGpuCells(z0, z1, nz, dz)) {
    throw new RangeError('buildTerrainPatch: exterior cells collapse in Float32');
  }
  const pos = [], idx = [];
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const x = i === nx - 1 ? x1 : x0 + i * dx;
    const z = j === nz - 1 ? z1 : z0 + j * dz;
    const y = terrain.height(x, z);
    // A broken height sampler must not send NaN/Infinity into GPU buffers.
    // Reject the affected exterior patch before constructing its triangles.
    if (!Number.isFinite(y)) {
      throw new RangeError('buildTerrainPatch: non-finite terrain height');
    }
    // WebGL positions are Float32: finite doubles beyond this range become
    // Infinity during conversion, creating broken exterior triangles.
    if (![x, y, z].every(v => Number.isFinite(Math.fround(v)))) {
      throw new RangeError('buildTerrainPatch: exterior position exceeds Float32 range');
    }
    pos.push(x, y, z);
  }
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
    if ((i + j) & 1) idx.push(a, c, b, b, c, d); else idx.push(a, c, d, a, d, b);
  }
  const edge = (name) => {
    const ids = [];
    if (name === 'x0') for (let j = 0; j < nz; j++) ids.push(j * nx);
    if (name === 'x1') for (let j = nz - 1; j >= 0; j--) ids.push(j * nx + nx - 1);
    if (name === 'z0') for (let i = nx - 1; i >= 0; i--) ids.push(i);
    if (name === 'z1') for (let i = 0; i < nx; i++) ids.push((nz - 1) * nx + i);
    return ids;
  };
  for (const name of activeSkirtEdges) {
    const ids = edge(name), base = pos.length / 3;
    for (const id of ids) {
      const skirtY = pos[id * 3 + 1] - skirt;
      // The surface may fit Float32 while lowering the skirt overflows it.
      // Fail before uploading an infinite vertex to the GPU.
      if (!Number.isFinite(skirtY) || !Number.isFinite(Math.fround(skirtY))) {
        throw new RangeError('buildTerrainPatch: exterior skirt exceeds Float32 range');
      }
      // Even a positive skirt can disappear when quantized to GPU Float32,
      // leaving zero-area triangles at high world elevations. Reject such
      // geometry instead of uploading degenerate walls along the route edge.
      if (!(Math.fround(skirtY) < Math.fround(pos[id * 3 + 1]))) {
        throw new RangeError('buildTerrainPatch: exterior skirt collapses in Float32');
      }
      pos.push(pos[id * 3], skirtY, pos[id * 3 + 2]);
    }
    for (let k = 0; k < ids.length - 1; k++) { const a = ids[k], b = ids[k + 1], c = base + k, d = base + k + 1; idx.push(a, b, c, b, d, c, a, c, b, b, c, d); }
  }
  return { positions: new Float32Array(pos), indices: new Uint32Array(idx), nx, nz };
}

/** Paleta por altitude/inclinação. normals: Float32Array alinhado às posições. */
export function colorTerrain(terrain, positions, normals) {
  const colors = new Float32Array(positions.length);
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const grass = [.30, .41, .22], grassDark = [.19, .29, .17], moss = [.33, .38, .26], dirt = [.39, .33, .24];
  const rock = [.42, .41, .39], rockDark = [.27, .27, .28], rockWarm = [.47, .42, .36], snow = [.86, .89, .92];
  // Keep valid regional tints, but ignore corrupted optional map data.
  // Recompute the filter once, not for each terrain vertex.
  const tintAreas = Array.isArray(terrain.extraAreas)
    ? terrain.extraAreas.filter(e => e && [e.cx, e.cz, e.hx, e.hz].every(Number.isFinite) && e.hx >= 0 && e.hz >= 0)
    : [];
  const validColor = v => Array.isArray(v) && v.length === 3 && v.every(n => Number.isFinite(n) && n >= 0 && n <= 1);
  const resolvedTints = tintAreas.map(e => {
    const tint = Array.isArray(e.tint) && e.tint.length === 2 &&
      e.tint.every(validColor) ? e.tint : [[.27, .22, .17], [.36, .3, .24]];
    const strength = Number.isFinite(e.tintStrength) && e.tintStrength >= 0 && e.tintStrength <= 1
      ? e.tintStrength : .9;
    return { ...e, tint, strength };
  });
  for (let k = 0; k < positions.length; k += 3) {
    const x = positions[k], y = positions[k + 1], z = positions[k + 2], ny = normals[k + 1];
    const slope = 1 - clamp(ny, 0, 1); // 0 plano, ~0.3 = 45°
    const n1 = fbm(x * .05, z * .05, 3, 91), n2 = valueNoise(x * .21, z * .21, 92);
    let c = mix(grassDark, grass, smoothstep(.3, .7, n1));
    c = mix(c, moss, smoothstep(.62, .82, n2) * .5);
    c = mix(c, dirt, smoothstep(.72, .9, n1) * .35);
    // Regiões extras (Distrito da Ferrugem): lama, pedra gasta e ferrugem no lugar da grama.
    for (const e of resolvedTints) {
      const qx = Math.abs(x - e.cx) - e.hx + 8, qz = Math.abs(z - e.cz) - e.hz + 8, inside = -Math.max(qx, qz);
      if (inside > -10) c = mix(c, mix(e.tint[0], e.tint[1], n2), smoothstep(-10, 6, inside) * e.strength);
    }
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
    if (terrain.shade) { const sh = terrain.shade(x, z); if (sh < 1) c = mix(c, [c[0] * .62, c[1] * .78, c[2] * .6], 1 - sh); } // chão musgoso sob a mata fechada
    colors[k] = Math.pow(c[0], 2.2); colors[k + 1] = Math.pow(c[1], 2.2); colors[k + 2] = Math.pow(c[2], 2.2);
  }
  return colors;
}

/**
 * Distribuição natural de árvores: manchas de mata densa e clareiras guiadas
 * por ruído, em vez de sorteio uniforme. Retorna especificações puras.
 */
export function scatterForest(terrain, { seed = 9137, attempts, isFree = () => true, lowSpec = false } = {}) {
  let s = seed >>> 0;
  const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  const area = terrain.area, specs = [];
  // Keep neighboring tree trunks from occupying the same patch of earth.
  // Spatial buckets avoid an O(n²) scan while preserving the forest's density
  // noise, clearings, path exclusions, species and per-tree randomness.
  const minSpacing = 2.25;
  const buckets = new Map();
  const bucketKey = (ix, iz) => `${ix}:${iz}`;
  const canPlant = (x, z) => {
    const ix = Math.floor(x / minSpacing), iz = Math.floor(z / minSpacing);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const neighbors = buckets.get(bucketKey(ix + dx, iz + dz));
      if (!neighbors) continue;
      for (const tree of neighbors) {
        if ((x - tree.x) ** 2 + (z - tree.z) ** 2 < minSpacing ** 2) return false;
      }
    }
    return true;
  };
  // Trees on near-vertical ground visibly hang over the downhill edge.
  // Sample the same terrain height used by the rendered mesh, only for
  // accepted planting candidates, keeping the mobile startup cost bounded.
  const stableGround = (x, z, centerY) => {
    const step = 1.25;
    const left = terrain.height(x - step, z), right = terrain.height(x + step, z);
    const back = terrain.height(x, z - step), front = terrain.height(x, z + step);
    if (![left, right, back, front].every(Number.isFinite)) return false;
    const grade = Math.hypot((right - left) / (2 * step), (front - back) / (2 * step));
    // A symmetric gradient can miss a sharp ledge: both sides can be at
    // equal heights while the trunk center sits on a narrow raised shelf.
    // Require the sampled root footprint to remain supported as well.
    const maxDrop = Math.max(Math.abs(left - centerY), Math.abs(right - centerY),
      Math.abs(back - centerY), Math.abs(front - centerY));
    return Number.isFinite(centerY) && grade <= 0.85 && maxDrop <= 1.25;
  };
  const rememberTree = (x, z) => {
    const key = bucketKey(Math.floor(x / minSpacing), Math.floor(z / minSpacing));
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push({ x, z });
  };
  // Invalid primary bounds must not reverse the forest span or poison sampling.
  if (![area?.cx, area?.cz, area?.hx, area?.hz].every(Number.isFinite) || area.hx < 0 || area.hz < 0) return specs;
  // Sample each playable forest region instead of its combined bounding box.
  // A distant side region used to expand the rectangle into empty wilderness,
  // wasting attempts and visibly thinning the original forest.
  const regions = [];
  const addRegion = (cx, cz, hx, hz, margin = 70) => {
    const x0 = cx - hx - margin, x1 = cx + hx + margin;
    const z0 = cz - hz - margin, z1 = cz + hz + margin;
    const width = x1 - x0, depth = z1 - z0;
    if (![x0, x1, z0, z1, width, depth].every(v => Number.isFinite(Math.fround(v)))) return;
    const weight = width * depth;
    if (!Number.isFinite(weight) || weight <= 0) return;
    regions.push({ x0, x1, z0, z1, weight });
  };
  addRegion(area.cx, area.cz, area.hx, area.hz);
  const forestExtras = Array.isArray(terrain.extraAreas) ? terrain.extraAreas : [];
  for (const e of forestExtras) {
    if (![e?.cx, e?.cz, e?.hx, e?.hz].every(Number.isFinite) || e.hx < 0 || e.hz < 0) continue;
    // Avoid wasting side-region attempts far outside its actual playable bounds.
    addRegion(e.cx, e.cz, e.hx, e.hz, 35);
  }
  if (!regions.length) return specs;
  const totalWeight = regions.reduce((sum, region) => sum + region.weight, 0);
  if (!Number.isFinite(totalWeight)) return specs;
  // A malformed or unbounded sample budget must never stall the mobile main thread.
  // Extend the full-detail sequence after slope and footprint exclusions.
  // Low detail keeps its original 1,560 candidates and explicit budgets take precedence.
  const defaultBudget = lowSpec ? 2600 : 2650;
  const budget = Number.isFinite(attempts) ? Math.min(10000, Math.max(0, Math.trunc(attempts))) : defaultBudget;
  const total = lowSpec ? Math.round(budget * .6) : budget;
  for (let i = 0; i < total; i++) {
    let region = regions[0];
    if (regions.length > 1) {
      // Keep the original valley populated when a far-off side area is added.
      // Reserve at least 85% of the existing fixed mobile sampling budget for it.
      const mainShare = Math.max(.85, regions[0].weight / totalWeight);
      if (rnd() >= mainShare) {
        const extraWeight = totalWeight - regions[0].weight;
        let pick = rnd() * extraWeight;
        for (let j = 1; j < regions.length; j++) {
          pick -= regions[j].weight;
          region = regions[j];
          if (pick < 0) break;
        }
      }
    }
    const x = region.x0 + rnd() * (region.x1 - region.x0);
    const z = region.z0 + rnd() * (region.z1 - region.z0);
    const d = terrain.boundaryDistance(x, z);
    // Invalid boundary samples must not classify a cell as a walkable forest slope.
    if (!Number.isFinite(d)) continue;
    const density = fbm(x * .028 + 31, z * .028 - 17, 3, 61);
    if (d < -11) {
      // Vale: bosques em manchas, com clareiras naturais.
      if (rnd() > smoothstep(.34, .62, density) * .95) continue;
      if (!isFree(x, z)) continue;
      const water = terrain.waterDepth(x, z);
      if (!Number.isFinite(water) || water > -.25) continue;
      // Valley tree placement also depends on terrain elevation downstream.
      // Reject invalid height samples before producing a world-space instance.
      if (!Number.isFinite(Math.fround(terrain.height(x, z)))) continue;
      const kind = density > .6 && rnd() < .45 ? 'conifer' : (rnd() < .52 ? 'oak' : 'round');
      if (!canPlant(x, z) || !stableGround(x, z, terrain.height(x, z))) continue;
      specs.push({ x, z, kind, s: .8 + rnd() * .75, rot: rnd() * Math.PI * 2, tint: rnd(), collide: true });
      rememberTree(x, z);
    } else if (d > 5 && d < 62) {
      // Encostas: coníferas rareando com a altitude (linha das árvores). A faixa do contraforte
      // fica aberta (pedras e capim) para a câmera não ficar presa dentro da mata no limite.
      const y = terrain.height(x, z);
      // Keep the same route/mission clearance on the foothills as in the valley.
      // Previously the hillside branch bypassed isFree and could spawn trees
      // over reserved exterior paths despite having collision disabled.
      if (!isFree(x, z)) continue;
      const water = terrain.waterDepth(x, z);
      if (!Number.isFinite(water) || water > -.25) continue;
      if (!Number.isFinite(Math.fround(y)) || y > 38 + density * 12) continue;
      if (rnd() > (.78 - smoothstep(10, 46, y) * .7) * smoothstep(.22, .5, density + .12)) continue;
      if (!canPlant(x, z) || !stableGround(x, z, y)) continue;
      specs.push({ x, z, kind: 'conifer', s: .85 + rnd() * .9, rot: rnd() * Math.PI * 2, tint: rnd(), collide: false });
      rememberTree(x, z);
    }
  }
  return specs;
}
