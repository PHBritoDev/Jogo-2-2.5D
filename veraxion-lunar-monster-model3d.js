/**
 * BISPO 4 (VÉRAXION) · ULTIMATE — "O DEVORADOR LUNAR": modelo 3D autoral com esqueleto e animações (gera o GLB).
 *
 * Fera quadrúpede cósmica da referência: cabeça caprina baixa entre as patas dianteiras, focinho longo voltado para
 * baixo, mandíbula separada cheia de dentes finos, DOIS chifres colossais em meia-lua que saem do crânio, abrem para os
 * lados e se curvam para cima até quase se tocarem acima da corcova; dorso alto e arqueado, patas finas e longas com
 * cotovelos abertos e garras, cauda longa que se enrola. Geometria por "loft" (tubos com seção variável) presa a ossos
 * com pesos suaves; COLOR_0.r = parte (0 corpo, .25 chifre, .5 dente, .75 olho, 1 garra), COLOR_0.g = posição ao longo
 * da parte (para o shader de hachuras). Cabeça voltada para +Z; ~10 m de comprimento; pés em y=0.
 * Clipes: lunar_idle (respira), jaw_charge (abre a boca e ergue a cabeça), launch (arremesso), recoil (recuo).
 */
export const MONSTER_BUILD = '293-anatomical-cosmic-goat';

/* ---------- esqueleto (posições de mundo em repouso; rotações de repouso = identidade) ---------- */
export const BONES = [
  ['root', null, [0, 0, 0]], ['hips', 'root', [0, 3.3, -3.0]], ['spine', 'hips', [0, 4.2, -1.3]], ['chest', 'spine', [0, 4.5, .5]],
  ['neck', 'chest', [0, 3.7, 2.1]], ['head', 'neck', [0, 3.0, 3.0]], ['jaw', 'head', [0, 2.55, 3.35]],
  ['hornL', 'head', [.45, 3.25, 3.05]], ['hornR', 'head', [-.45, 3.25, 3.05]],
  ['flU', 'chest', [1.2, 3.8, 1.3]], ['flL', 'flU', [3.0, 2.3, 2.3]], ['flF', 'flL', [3.6, .35, 3.0]],
  ['frU', 'chest', [-1.2, 3.8, 1.3]], ['frL', 'frU', [-3.0, 2.3, 2.3]], ['frF', 'frL', [-3.6, .35, 3.0]],
  ['blU', 'hips', [1.05, 3.2, -3.1]], ['blL', 'blU', [2.0, 1.7, -3.5]], ['blF', 'blL', [1.9, .3, -4.4]],
  ['brU', 'hips', [-1.05, 3.2, -3.1]], ['brL', 'brU', [-2.0, 1.7, -3.5]], ['brF', 'brL', [-1.9, .3, -4.4]],
  ['tail0', 'hips', [0, 3.3, -4.0]], ['tail1', 'tail0', [.5, 2.7, -5.6]], ['tail2', 'tail1', [1.8, 1.9, -6.7]], ['tail3', 'tail2', [3.2, 2.2, -7.3]]
];
const BI = Object.fromEntries(BONES.map((b, i) => [b[0], i]));

/* ---------- utilitários vetoriais ---------- */
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const R3 = i => { const s = Math.sin(i * 12.9898 + 4.1) * 43758.5453; return s - Math.floor(s); };
function catmull(P, t) { const n = P.length - 1, x = Math.min(n - 1e-6, Math.max(0, t * n)), i = Math.floor(x), f = x - i; const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(n, i + 2)];
  const f2 = f * f, f3 = f2 * f; return [0, 1, 2].map(k => .5 * (2 * p1[k] + (-p0[k] + p2[k]) * f + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * f2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * f3)); }

function makeMesh() { const P = [], N = [], C = [], U = [], J = [], W = [], I = []; return { P, N, C, U, J, W, I }; }
/** tubo: pts (curva), rad(t)→[rx,ry], bones: [[t, boneIdx], ...] crescentes; part, opts {sides, seg, up, cap, wob} */
function loft(M, pts, rad, bones, part, o = {}) {
  const S = o.sides || 14, G = o.seg || 24, base = M.P.length / 3; let prevN = null;
  for (let j = 0; j <= G; j++) { const t = j / G, c = catmull(pts, t), c2 = catmull(pts, Math.min(1, t + .01)), c0 = catmull(pts, Math.max(0, t - .01)); const T = norm(sub(c2, c0));
    let up = o.up || [0, 1, 0]; if (Math.abs(dot(up, T)) > .92) up = [0, 0, 1]; let Nn = norm(cross(cross(T, up), T)); if (prevN && dot(prevN, Nn) < 0) Nn = mul(Nn, -1); prevN = Nn; const B = norm(cross(T, Nn));
    const [rx, ry] = rad(t); let bw = [[bones[0][1], 1]]; for (let k = 0; k < bones.length - 1; k++) if (t >= bones[k][0] && t <= bones[k + 1][0]) { const f = (t - bones[k][0]) / Math.max(1e-6, bones[k + 1][0] - bones[k][0]), s = f * f * (3 - 2 * f); bw = [[bones[k][1], 1 - s], [bones[k + 1][1], s]]; }
    if (t > bones[bones.length - 1][0]) bw = [[bones[bones.length - 1][1], 1]];
    for (let i = 0; i <= S; i++) { const a = i / S * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a); const wob = o.wob ? 1 + o.wob * (Math.sin(a * 5 + t * 23) * .5 + Math.sin(a * 11 - t * 37) * .3) : 1;
      const dir = add(mul(Nn, ca * ry), mul(B, sa * rx)), p = add(c, mul(dir, wob)), n = norm(add(mul(Nn, ca / Math.max(ry, 1e-3)), mul(B, sa / Math.max(rx, 1e-3))));
      M.P.push(...p); M.N.push(...n); M.C.push(part, t, (rx + ry) * .5); M.U.push(i / S, t);
      const jj = [0, 0, 0, 0], ww = [0, 0, 0, 0]; bw.forEach(([b, w], k) => { jj[k] = b; ww[k] = w; }); M.J.push(...jj); M.W.push(...ww); } }
  for (let j = 0; j < G; j++) for (let i = 0; i < S; i++) { const a = base + j * (S + 1) + i, b = a + S + 1; M.I.push(a, a + 1, b, a + 1, b + 1, b); } /* winding anti-horário visto de fora */
  if (o.cap !== false) { const last = catmull(pts, 1), ci = M.P.length / 3; M.P.push(...last); M.N.push(...norm(sub(last, catmull(pts, .97)))); M.C.push(part, 1, 0); M.U.push(.5, 1); const lb = bones[bones.length - 1][1]; M.J.push(lb, 0, 0, 0); M.W.push(1, 0, 0, 0);
    for (let i = 0; i < S; i++) { const a = base + G * (S + 1) + i; M.I.push(a, ci, a + 1); } }
}
/** cone curvo (dente/garra/espinho) preso a um osso só */
function spike(M, a, b, r, bone, part, bend = [0, 0, 0]) { const mid = add(mul(add(a, b), .5), bend); loft(M, [a, mid, b], t => { const k = Math.max(.02, (1 - t)); return [r * k, r * k]; }, [[0, bone], [1, bone]], part, { sides: 6, seg: 5 }); }

export function buildMonsterData() {
  const M = makeMesh(), B = n => BI[n];
  // tronco: do pescoço (frente, baixo) subindo à corcova e descendo ao quadril
  loft(M, [[0, 3.55, 2.3], [0, 4.4, 1.0], [0, 4.85, -.4], [0, 4.6, -1.8], [0, 3.9, -3.1], [0, 3.35, -4.0]],
    t => { const hump = Math.sin(Math.min(1, t * 1.2) * Math.PI); return [1.02 + 1.5 * hump - .31 * t, .9 + 1.22 * hump - .27 * t]; },
    [[0, B('neck')], [.25, B('chest')], [.55, B('spine')], [1, B('hips')]], 0, { sides: 20, seg: 34, wob: .07, cap: false });
  // pescoço → cabeça: crânio longo que desce para o focinho (voltado para baixo/frente)
  loft(M, [[0, 3.96, 1.9], [0, 3.63, 2.67], [0, 3.12, 3.3], [0, 2.48, 3.88], [0, 1.73, 4.43], [0, 1.14, 4.75]],
    t => { const w = 1.16 - .84 * Math.pow(t, 1.28), h = .98 - .68 * Math.pow(t, 1.17);
      return [w*(1+.035*Math.sin(t*29)), h]; },
    [[0, B('neck')], [.27, B('head')], [1, B('head')]], 0, { sides: 22, seg: 36, wob: .06 });
  // A ponte estreita do focinho acentua a face triangular, não um crânio arredondado.
  loft(M, [[0,3.33,3.28],[0,2.94,3.66],[0,2.35,4.16],[0,1.62,4.54]],
    t => [.22*(1-t)+.055,.21*(1-t)+.04], [[0,B('head')],[1,B('head')]],0,{sides:10,seg:18,wob:.03});
  // Maçãs do rosto descem como cristas ósseas e sombreiam a órbita.
  for(const side of [-1,1])loft(M, [[side*.49,3.34,3.22],[side*.77,3.06,3.55],[side*.74,2.56,4.01],[side*.43,2.08,4.42]],
    t=>[.31*(1-.63*t),.27*(1-.7*t)],[[0,B('head')],[1,B('head')]],0,{sides:10,seg:16,wob:.05});
  // arcadas das órbitas (sobrancelhas fundas)
  for (const s of [1, -1]) loft(M, [[.2 * s, 3.35, 3.2], [.55 * s, 3.25, 3.35], [.72 * s, 3.0, 3.42]], t => [.17 * (1 - .5 * t), .14 * (1 - .5 * t)], [[0, B('head')], [1, B('head')]], 0, { sides: 8, seg: 6 });
  // mandíbula separada
  loft(M, [[0, 2.65, 3.25], [0, 2.25, 3.65], [0, 1.75, 4.05], [0, 1.35, 4.35]], t => [(.78 - .55 * t), (.34 - .22 * t)], [[0, B('jaw')], [1, B('jaw')]], 0, { sides: 12, seg: 14 });
  // dentes finos e irregulares: fileira superior (crânio) e inferior (mandíbula)
  for (let k = 0; k < 22; k++) { const f = k / 21, side = (k % 2 ? 1 : -1) * (.1 + .42 * (1 - f)), y = 2.55 - 1.1 * f, z = 3.75 + .78 * f, len = .3 + .22 * R3(k);
    spike(M, [side, y, z + .08], [side * .92, y - len, z + .14], .055, B('head'), .5); }
  for (let k = 0; k < 18; k++) { const f = k / 17, side = (k % 2 ? 1 : -1) * (.1 + .4 * (1 - f)), y = 2.2 - 1.0 * f, z = 3.8 + .6 * f, len = .26 + .2 * R3(k + 40);
    spike(M, [side, y, z + .05], [side * .9, y + len, z + .12], .05, B('jaw'), .5); }
  // olhos
  for (const s of [1, -1]) loft(M, [[.52 * s, 3.08, 3.45], [.58 * s, 3.04, 3.52]], () => [.1, .1], [[0, B('head')], [1, B('head')]], .75, { sides: 8, seg: 2 });
  // CHIFRES em meia-lua: saem do crânio, abrem para os lados e sobem curvando para dentro até quase se tocarem
  for (const s of [1, -1]) { const bone = B(s > 0 ? 'hornL' : 'hornR');
    loft(M, [[.42 * s, 3.3, 3.0], [1.5 * s, 3.05, 3.15], [2.85 * s, 3.45, 3.05], [3.35 * s, 5.0, 2.8], [3.3 * s, 6.6, 2.45], [2.55 * s, 7.95, 2.1], [1.35 * s, 8.75, 1.85], [.35 * s, 9.05, 1.75]],
      t => { const r = .5 * Math.pow(1 - t, .8) + .02; return [r, r * (1.05 + .05 * Math.sin(t * 60))]; }, [[0, bone], [1, bone]], .25, { sides: 14, seg: 60, wob: 0 }); }
  // patas: coxa → canela → pé, cotovelos abertos para fora; garras
  const leg = (s, u, l, f, z, clawDir) => { loft(M, [u, add(mul(add(u, l), .5), [s * .35, .35, 0]), l, f], t => { const r = .98 - .62 * t; return [r * (t < .5 ? 1.22 : .9), r]; }, [[0, B(z + 'U')], [.45, B(z + 'L')], [.9, B(z + 'F')], [1, B(z + 'F')]], 0, { sides: 12, seg: 20, wob: .08 });
    for (let c = 0; c < 4; c++) { const a = (c - 1.5) * .35; spike(M, add(f, [s * .1 + Math.sin(a) * .2, .05, .1]), add(f, [s * .25 + Math.sin(a) * .65, -.32, .55 * clawDir + Math.cos(a) * .1]), .08, B(z + 'F'), 1, [0, -.15, 0]); } };
  for (const s of [1, -1]) { const L = s > 0 ? 'l' : 'r'; leg(s, [1.2 * s, 3.9, 1.3], [3.0 * s, 2.4, 2.3], [3.6 * s, .35, 3.0], 'f' + L, 1); leg(s, [1.05 * s, 3.4, -3.1], [2.0 * s, 1.7, -3.5], [1.9 * s, .3, -4.4], 'b' + L, -.5); }
  // cauda longa que se enrola
  loft(M, [[0, 3.4, -3.9], [.2, 3.0, -4.9], [.7, 2.5, -5.8], [1.6, 1.9, -6.6], [2.8, 1.9, -7.2], [3.5, 2.6, -7.3], [3.3, 3.2, -6.9]], t => { const r = .45 * (1 - t) + .04; return [r, r]; },
    [[0, B('tail0')], [.3, B('tail1')], [.6, B('tail2')], [1, B('tail3')]], 0, { sides: 10, seg: 30, wob: .06 });
  // espinhos/crostas ao longo da corcova (silhueta de pelagem eriçada)
  for (let k = 0; k < 18; k++) { const f = k / 17, p = catmull([[0, 3.55, 2.3], [0, 4.4, 1.0], [0, 4.85, -.4], [0, 4.6, -1.8], [0, 3.9, -3.1], [0, 3.35, -4.0]], .08 + .85 * f), hump = Math.sin(Math.min(1, (.08 + .85 * f) * 1.25) * Math.PI);
    const top = add(p, [(R3(k) - .5) * .6, .82 + 1.0 * hump, 0]); spike(M, top, add(top, [(R3(k + 3) - .5) * .3, .14 + .1 * R3(k + 5), -.3]), .14, B(f < .35 ? 'chest' : f < .7 ? 'spine' : 'hips'), 0); }
  return M;
}

/* ---------- animações (quaternions por osso) ---------- */
const qx = a => [Math.sin(a / 2), 0, 0, Math.cos(a / 2)], qy = a => [0, Math.sin(a / 2), 0, Math.cos(a / 2)], qz = a => [0, 0, Math.sin(a / 2), Math.cos(a / 2)];
const qmul = (a, b) => [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
const euler = (x = 0, y = 0, z = 0) => qmul(qmul(qy(y), qx(x)), qz(z));
/** clipes: {nome: {dur, loop, keys: {osso: t=>[x,y,z] (euler)}, scale?: {osso: t=>s}}} amostrados a 15 fps */
export const CLIPS = {
  lunar_idle: { dur: 4, keys: { chest: t => [.035 * Math.sin(t * Math.PI * .5 * 2), 0, 0], neck: t => [-.04 * Math.sin(t * Math.PI * .5 * 2 + .6), .03 * Math.sin(t * .8), 0], head: t => [.03 * Math.sin(t * Math.PI + 1), .05 * Math.sin(t * Math.PI * .5), 0],
    jaw: t => [.06 + .05 * Math.sin(t * Math.PI), 0, 0], tail1: t => [0, .18 * Math.sin(t * Math.PI * .5), 0], tail2: t => [0, .22 * Math.sin(t * Math.PI * .5 - .7), 0], tail3: t => [0, .25 * Math.sin(t * Math.PI * .5 - 1.4), 0],
    flU: t => [0, 0, .02 * Math.sin(t * Math.PI)], frU: t => [0, 0, -.02 * Math.sin(t * Math.PI)] }, scale: { chest: t => 1 + .035 * (.5 - .5 * Math.cos(t * Math.PI)) } },
  jaw_charge: { dur: 2, keys: { neck: t => [-.22 * sm(t / 1.4), 0, 0], head: t => [-.38 * sm(t / 1.6), 0, 0], jaw: t => [.12 + .95 * sm(t / 1.5) + .05 * Math.sin(t * 25) * sm(t / 1.5), 0, 0], chest: t => [-.08 * sm(t / 1.5), 0, 0],
    flU: t => [0, 0, .08 * sm(t / 1.2)], frU: t => [0, 0, -.08 * sm(t / 1.2)], flL: t => [.12 * sm(t / 1.2), 0, 0], frL: t => [.12 * sm(t / 1.2), 0, 0] }, scale: { chest: t => 1 + .07 * sm(t / 1.5) } },
  launch: { dur: .8, keys: { neck: t => [-.22 + .55 * sm(t / .25), 0, 0], head: t => [-.38 + .75 * sm(t / .22), 0, 0], jaw: t => [1.07 + .2 * sm(t / .15) - .3 * sm((t - .3) / .5), 0, 0], chest: t => [-.08 + .22 * sm(t / .3), 0, 0],
    flL: t => [.12 - .3 * sm(t / .3), 0, 0], frL: t => [.12 - .3 * sm(t / .3), 0, 0] }, scale: { chest: t => 1.07 - .1 * sm(t / .25) } },
  recoil: { dur: 1.2, keys: { neck: t => [.33 - .45 * sm(t / .5) + .12 * sm((t - .5) / .7), 0, 0], head: t => [.37 - .62 * sm(t / .45) + .25 * sm((t - .5) / .7), 0, 0], jaw: t => [.97 - .8 * sm(t / 1.1), 0, 0], chest: t => [.14 - .26 * sm(t / .5) + .12 * sm((t - .5) / .7), 0, 0],
    flL: t => [-.18 + .18 * sm(t / 1), 0, 0], frL: t => [-.18 + .18 * sm(t / 1), 0, 0] }, scale: { chest: t => .97 + .03 * sm(t / 1) } }
};
function sm(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }

/* ---------- GLB 2.0 com skin e animações ---------- */
export function monsterGLB(M = buildMonsterData()) {
  const nB = BONES.length, world = BONES.map(b => b[2]), local = BONES.map(([n, p, w]) => p ? sub(w, world[BI[p]]) : w);
  const ibm = new Float32Array(nB * 16); for (let i = 0; i < nB; i++) { const w = world[i]; ibm.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -w[0], -w[1], -w[2], 1], i * 16); }
  const bufs = [], views = [], acc = []; let off = 0; const pad = n => (n + 3) & ~3;
  const push = (arr, target) => { views.push({ buffer: 0, byteOffset: off, byteLength: arr.byteLength, ...(target ? { target } : {}) }); bufs.push(arr); off += pad(arr.byteLength); return views.length - 1; };
  const n = M.P.length / 3, P = new Float32Array(M.P), mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9]; for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], P[i * 3 + k]); mx[k] = Math.max(mx[k], P[i * 3 + k]); }
  const ix = n > 65535 ? new Uint32Array(M.I) : new Uint16Array(M.I);
  acc.push({ bufferView: push(P, 34962), componentType: 5126, count: n, type: 'VEC3', min: mn, max: mx });
  acc.push({ bufferView: push(new Float32Array(M.N), 34962), componentType: 5126, count: n, type: 'VEC3' });
  acc.push({ bufferView: push(new Float32Array(M.U), 34962), componentType: 5126, count: n, type: 'VEC2' });
  acc.push({ bufferView: push(new Float32Array(M.C), 34962), componentType: 5126, count: n, type: 'VEC3' });
  acc.push({ bufferView: push(new Uint16Array(M.J), 34962), componentType: 5123, count: n, type: 'VEC4' });
  acc.push({ bufferView: push(new Float32Array(M.W), 34962), componentType: 5126, count: n, type: 'VEC4' });
  acc.push({ bufferView: push(ix, 34963), componentType: ix instanceof Uint32Array ? 5125 : 5123, count: ix.length, type: 'SCALAR' });
  acc.push({ bufferView: push(ibm), componentType: 5126, count: nB, type: 'MAT4' });
  const animations = [];
  for (const [name, c] of Object.entries(CLIPS)) { const fps = 15, nk = Math.round(c.dur * fps) + 1, times = new Float32Array(nk); for (let k = 0; k < nk; k++) times[k] = k / fps;
    const ti = acc.length; acc.push({ bufferView: push(times), componentType: 5126, count: nk, type: 'SCALAR', min: [0], max: [times[nk - 1]] }); const samplers = [], channels = [];
    for (const [bone, f] of Object.entries(c.keys)) { const q = new Float32Array(nk * 4); for (let k = 0; k < nk; k++) q.set(euler(...f(times[k])), k * 4); const oi = acc.length; acc.push({ bufferView: push(q), componentType: 5126, count: nk, type: 'VEC4' }); samplers.push({ input: ti, output: oi, interpolation: 'LINEAR' }); channels.push({ sampler: samplers.length - 1, target: { node: 1 + BI[bone], path: 'rotation' } }); }
    for (const [bone, f] of Object.entries(c.scale || {})) { const s = new Float32Array(nk * 3); for (let k = 0; k < nk; k++) { const v = f(times[k]); s.set([v, v * .985 + .015, v], k * 3); } const oi = acc.length; acc.push({ bufferView: push(s), componentType: 5126, count: nk, type: 'VEC3' }); samplers.push({ input: ti, output: oi, interpolation: 'LINEAR' }); channels.push({ sampler: samplers.length - 1, target: { node: 1 + BI[bone], path: 'scale' } }); }
    animations.push({ name, samplers, channels }); }
  const nodes = [{ name: 'DevoradorLunar', mesh: 0, skin: 0 }, ...BONES.map(([nm, p], i) => ({ name: nm, translation: local[i], children: BONES.map((b, j) => b[1] === nm ? 1 + j : -1).filter(x => x >= 0) }))];
  for (const nd of nodes) if (nd.children && !nd.children.length) delete nd.children;
  const json = { asset: { version: '2.0', generator: 'veraxion-lunar-monster-model3d.js ' + MONSTER_BUILD }, scene: 0, scenes: [{ nodes: [0, 1] }], nodes,
    meshes: [{ name: 'DevoradorLunar', primitives: [{ attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2, COLOR_0: 3, JOINTS_0: 4, WEIGHTS_0: 5 }, indices: 6, material: 0 }] }],
    materials: [{ name: 'ObsidianaLunar', pbrMetallicRoughness: { baseColorFactor: [.05, .02, .09, 1], metallicFactor: .1, roughnessFactor: .8 } }],
    skins: [{ joints: BONES.map((_, i) => 1 + i), inverseBindMatrices: 7, skeleton: 1 }], animations, accessors: acc, bufferViews: views, buffers: [{ byteLength: off }] };
  const bin = new Uint8Array(off); let o2 = 0; for (const b of bufs) { bin.set(new Uint8Array(b.buffer, b.byteOffset, b.byteLength), o2); o2 += pad(b.byteLength); }
  const enc = new TextEncoder().encode(JSON.stringify(json)), jl = pad(enc.length), total = 28 + jl + off, out = new Uint8Array(total), dv = new DataView(out.buffer);
  dv.setUint32(0, 0x46546C67, true); dv.setUint32(4, 2, true); dv.setUint32(8, total, true); dv.setUint32(12, jl, true); dv.setUint32(16, 0x4E4F534A, true); out.fill(0x20, 20, 20 + jl); out.set(enc, 20);
  dv.setUint32(20 + jl, off, true); dv.setUint32(24 + jl, 0x004E4942, true); out.set(bin, 28 + jl); return out;
}
