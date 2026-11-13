/**
 * Renascimento de Eldória — Fase 2: o Vale do Despertar (do prado onde o herói acorda até a planície do rio).
 *
 * Antes, as encostas em volta da estrada eram morros lisos e vazios: quem saía do prado via só grama até a mata da
 * cidade. As encostas já eram caminháveis (o limite do mundo fica 45 m além da borda antiga) e não havia nada nelas.
 * Este módulo planeja a paisagem, em lógica pura e determinística, testável em Node:
 *  - Bosques: grupos naturais de 3 a 9 árvores nas meias-encostas. O fundo do vale fica aberto (alameda esparsa junto
 *    à estrada) e as cristas recebem silhuetas isoladas. Há clareiras intencionais e nada de grade.
 *  - Espécies pelo relevo: palmeira e embaúba no baixio úmido, copa-larga e figueira na meia-encosta, sumaúmas raras
 *    como marcos no alto.
 *  - Afloramentos de rocha musgosa: grupos meio enterrados que quebram a curva lisa dos morros.
 *  - Trilha do Vigia: sai da estrada, sobe a encosta oeste e termina numa clareira de topo com as ruínas de um posto
 *    de vigia (desvio opcional com recompensa, ver eldoria-valley-ruin3d.js).
 * Usa as mesmas espécies, materiais e LODs instanciados do cinturão (EldoriaArvoresTropicais.glb): mais instâncias,
 * nenhum material novo.
 */
export const VALLEY_AREA = Object.freeze({ x0: -14, x1: 132, z0: 30, z1: 214 });
export const VIGIA = Object.freeze({ x: 29, z: 96.5, r: 7.5, name: 'Posto do Vigia' });
export const VIGIA_TRAIL = Object.freeze({ id: 'vigia', name: 'Trilha do Vigia', width: 2.4, points: Object.freeze([[64.5, 109], [58.5, 108.2], [52.5, 106], [47, 103.2], [41.5, 100.4], [36.5, 98.6], [32.5, 97.4]]) });
/** Clareiras intencionais: ninguém planta nelas (mirantes e respiros da composição). */
export const VALLEY_CLEARINGS = Object.freeze([
  { id: 'vigia', x: VIGIA.x, z: VIGIA.z, r: VIGIA.r + 3 },
  { id: 'respiro-leste', x: 96, z: 70, r: 11 },   // vazio na encosta leste: a crista lê-se como silhueta
  { id: 'respiro-oeste', x: 20, z: 128, r: 9 },   // janela da borda do prado para o oeste
  { id: 'garganta', x: 70, z: 200, r: 7 },        // a carroça é vista saindo da garganta
]);
/** Marcos: sumaúmas isoladas nas cristas, vistas do prado (composição de horizonte). */
export const VALLEY_LANDMARKS = Object.freeze([
  { sp: 'sumauma', x: 6, z: 64, s: 1.05 }, { sp: 'sumauma', x: 108, z: 112, s: .95 }, { sp: 'sumauma', x: 2, z: 160, s: 1.1 },
  { sp: 'sumauma', x: 116, z: 168, s: 1 }, { sp: 'figueira', x: 42, z: 88, s: 1.15 },
]);

const hash = (i, s) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
function vnoise(x, z, seed) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz);
  const h = (a, b) => hash(a * 57 + b * 131, seed);
  return (h(ix, iz) * (1 - sx) + h(ix + 1, iz) * sx) * (1 - sz) + (h(ix, iz + 1) * (1 - sx) + h(ix + 1, iz + 1) * sx) * sz;
}
function distToPolyline(x, z, pts) {
  let best = 1e9;
  for (let i = 0; i < pts.length - 1; i++) { const [ax, az] = pts[i], [bx, bz] = pts[i + 1], dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz, t = L ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L)) : 0; best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t)); }
  return best;
}
const KINDS = { sumauma: { gap: 20, s: [.8, 1.05] }, figueira: { gap: 9, s: [.75, 1.12] }, copaLarga: { gap: 7, s: [.78, 1.2] }, embauba: { gap: 8.5, s: [.8, 1.18] }, palmeira: { gap: 4.4, s: [.8, 1.15] } };

/**
 * Plano das árvores do vale.
 * env: { height(x,z), boundary(x,z) (distância além da borda antiga; >45 = fora do mundo), water(x,z) (profundidade),
 *        road: polilinha, meadow(x,z,pad)->bool, keep(x,z,r)->bool (falso = proibido), seed, density }
 * Devolve [{sp,x,z,gap,rot,s,tint}] no mesmo formato de planTropicalBelt (eldoria-tropical-trees.js).
 */
export function planValleyForest(env) {
  const { height, boundary, water, road, meadow, keep = () => true, seed = 31761, density = 1 } = env;
  const A = VALLEY_AREA, out = [], cell = 4, grid = new Map(), key = (x, z) => Math.floor(x / cell) + ',' + Math.floor(z / cell);
  let s = seed >>> 0; const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const fits = (x, z, gap, sp) => {
    const r = Math.ceil(22 / cell), gx = Math.floor(x / cell), gz = Math.floor(z / cell);
    for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) { const l = grid.get((gx + i) + ',' + (gz + j)); if (!l) continue;
      for (const o of l) { const need = o.sp === sp ? Math.max(gap, o.gap) * .82 : (gap + o.gap) * .32 + 1.2; if ((o.x - x) ** 2 + (o.z - z) ** 2 < need * need) return false; } }
    return true;
  };
  const add = (sp, x, z, scale) => {
    const k = KINDS[sp], gap = k.gap * (.85 + rnd() * .3), v = .88 + rnd() * .18, warm = rnd() < .3 ? .07 : 0;
    const o = { sp, x, z, gap, rot: rnd() * Math.PI * 2, s: scale ?? (k.s[0] + rnd() * (k.s[1] - k.s[0])), tint: sp === 'embauba' ? [v * .78, v * .86, v * .76] : [v * (1 + warm), v, v * (1 - warm * .8)] };
    out.push(o); const kk = key(x, z); if (!grid.has(kk)) grid.set(kk, []); grid.get(kk).push(o); return o;
  };
  const slope = (x, z) => { const h = height(x, z); return Math.max(Math.abs(height(x + 1.5, z) - h), Math.abs(height(x, z + 1.5) - h)) / 1.5; };
  const roadDist = (x, z) => distToPolyline(x, z, road);
  const clearOf = (x, z, r) => VALLEY_CLEARINGS.every(c => Math.hypot(x - c.x, z - c.z) > c.r + r) && distToPolyline(x, z, VIGIA_TRAIL.points) > VIGIA_TRAIL.width * .5 + 1.4 + r;
  const ok = (x, z, r) => x > A.x0 && x < A.x1 && z > A.z0 && z < A.z1 && boundary(x, z) < 40 && water(x, z) < -.15 && !meadow(x, z, 3 + r) && slope(x, z) < 1.05 && clearOf(x, z, r) && keep(x, z, r);
  // relevo: altura relativa ao leito da estrada mais próximo (baixio, meia-encosta, crista)
  const roadFloor = (x, z) => { let best = 1e9, bp = road[0]; for (let i = 0; i < road.length - 1; i++) { const [ax, az] = road[i], [bx, bz] = road[i + 1], dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz, t = L ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L)) : 0, px = ax + dx * t, pz = az + dz * t, d = Math.hypot(x - px, z - pz); if (d < best) { best = d; bp = [px, pz]; } } return height(bp[0], bp[1]); };
  const zoneSpecies = (rel, x, z) => {
    const u = rnd(), damp = rel < 3.5;
    if (damp) return u < .42 ? 'palmeira' : u < .64 ? 'embauba' : u < .88 ? 'copaLarga' : 'figueira';
    if (rel < 11) return u < .46 ? 'copaLarga' : u < .78 ? 'figueira' : u < .92 ? 'palmeira' : 'embauba';
    return u < .5 ? 'figueira' : u < .9 ? 'copaLarga' : 'palmeira';
  };
  // 1) marcos de horizonte
  for (const m of VALLEY_LANDMARKS) if (ok(m.x, m.z, 3)) add(m.sp, m.x, m.z, m.s);
  // 2) bosques: centros por Poisson grosso numa máscara de ruído baixo (manchas de mata e de campo alternadas)
  const centers = [], cMin = 15.5 / Math.sqrt(density);
  for (let t = 0; t < 2600; t++) {
    const x = A.x0 + rnd() * (A.x1 - A.x0), z = A.z0 + rnd() * (A.z1 - A.z0);
    const mask = vnoise(x / 38, z / 38, seed + 7) * .65 + vnoise(x / 15, z / 15, seed + 19) * .35;
    if (mask < .37) continue;                                   // campo aberto entre os bosques
    if (!ok(x, z, 4) || roadDist(x, z) < 9.5) continue;
    if (centers.some(c => Math.hypot(c.x - x, c.z - z) < cMin)) continue;
    centers.push({ x, z, mask });
  }
  for (const c of centers) {
    const rel = height(c.x, c.z) - roadFloor(c.x, c.z), n = 4 + Math.floor(rnd() * 7 * Math.min(1.3, c.mask + .3) * density), R = 6 + rnd() * 8;
    for (let i = 0, placed = 0; i < n * 6 && placed < n; i++) {
      const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * R, x = c.x + Math.cos(a) * d, z = c.z + Math.sin(a) * d;
      const sp = zoneSpecies(height(x, z) - roadFloor(x, z), x, z), gap = KINDS[sp].gap;
      if (!ok(x, z, gap * .3) || roadDist(x, z) < 7.5 || !fits(x, z, gap, sp)) continue;
      add(sp, x, z); placed++;
    }
    c.rel = rel;
  }
  // 3) alameda esparsa junto à estrada (sombra e moldura, nunca túnel): 1 árvore a cada ~26 m, alternando os lados
  for (let i = 0; i < road.length - 1; i++) {
    const [ax, az] = road[i], [bx, bz] = road[i + 1], L = Math.hypot(bx - ax, bz - az);
    for (let d = 6; d < L; d += 15 + rnd() * 9) {
      const t = d / L, px = ax + (bx - ax) * t, pz = az + (bz - az) * t, nx = -(bz - az) / L, nz = (bx - ax) / L, side = rnd() < .5 ? -1 : 1, off = 8 + rnd() * 4;
      const x = px + nx * side * off, z = pz + nz * side * off, sp = rnd() < .55 ? 'copaLarga' : 'figueira';
      if (ok(x, z, 2) && fits(x, z, KINDS[sp].gap, sp)) add(sp, x, z);
    }
  }
  const orla = { low: 0, ok: 0, fit: 0, added: 0 }; Object.defineProperty(out, 'orla', { value: orla });
  // 4) orla: árvores jovens e palmeiras baixas nas meias-encostas logo acima da estrada (5–9 m), para o vale não ser
  //    um corredor de grama pelada entre bosques distantes; nunca no leito, sempre deixando janelas de vista
  for (let i = 0; i < road.length - 1; i++) {
    const [ax, az] = road[i], [bx, bz] = road[i + 1], L = Math.hypot(bx - ax, bz - az);
    for (let d = 2; d < L; d += 4 + rnd() * 3.5) for (const side of [-1, 1]) {
      const t = d / L, px = ax + (bx - ax) * t, pz = az + (bz - az) * t, nx = -(bz - az) / L, nz = (bx - ax) / L, off = 4.6 + rnd() * 5.5;
      if (vnoise(px / 24 + side * 3.1, pz / 24, seed + 41) < .3) continue; // janelas de vista (alternadas por lado)
      const x = px + nx * side * off, z = pz + nz * side * off, sp = rnd() < .5 ? 'palmeira' : 'copaLarga';
      if (height(x, z) - height(px, pz) < .12) { orla.low++; continue; } if (!ok(x, z, 1.2)) { orla.ok++; continue; } if (!fits(x, z, KINDS[sp].gap * .8, sp)) { orla.fit++; continue; }
      add(sp, x, z, sp === 'palmeira' ? .62 + rnd() * .22 : .56 + rnd() * .16); orla.added++;
    }
  }
  return out;
}

/** Afloramentos de rocha musgosa (RochedoMusgoEldoria.glb): grupos de 1–3 blocos meio enterrados nas encostas. */
export function planValleyOutcrops(env, count = 14) {
  const { height, boundary, water, road, meadow, keep = () => true, seed = 4417 } = env, A = VALLEY_AREA, out = [];
  let s = seed >>> 0; const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  for (let t = 0; t < 4000 && out.length < count; t++) {
    const x = A.x0 + rnd() * (A.x1 - A.x0), z = A.z0 + rnd() * (A.z1 - A.z0);
    const h = height(x, z), sl = Math.max(Math.abs(height(x + 2, z) - h), Math.abs(height(x, z + 2) - h)) / 2;
    if (sl < .25 || sl > 1.2 || boundary(x, z) > 36 || water(x, z) > -.2 || meadow(x, z, 2) || distToPolyline(x, z, road) < 9 || !keep(x, z, 4)) continue;
    if (VALLEY_CLEARINGS.some(c => Math.hypot(x - c.x, z - c.z) < c.r + 2) || distToPolyline(x, z, VIGIA_TRAIL.points) < 4) continue;
    if (out.some(o => Math.hypot(o.x - x, o.z - z) < 24)) continue;
    const n = 1 + Math.floor(rnd() * 3), down = Math.atan2(height(x - 2, z) - height(x + 2, z), height(x, z - 2) - height(x, z + 2));
    const g = { x, z, parts: [] };
    for (let i = 0; i < n; i++) { const a = down + (rnd() - .5) * 2.4, d = i ? 2.2 + rnd() * 2 : 0, px = x + Math.sin(a) * d, pz = z + Math.cos(a) * d, sc = (i ? 2 : 3.2) + rnd() * 1.6;
      g.parts.push({ x: px, z: pz, s: sc, yaw: rnd() * Math.PI * 2, sink: .32 + rnd() * .14 }); }
    out.push(g);
  }
  return out;
}

export { distToPolyline };
