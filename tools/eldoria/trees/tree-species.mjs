/**
 * Eldória — as 5 espécies tropicais autorais (Mod 292) e seus níveis de detalhe.
 *  sumauma   — emergente monumental (~30 m): sapopemas altas, fuste liso cinza, copa plana em guarda-chuva, cipós.
 *  copaLarga — árvore de copa arredondada em tufos (referência dos adesivos do criador), raízes em leque.
 *  figueira  — mata-pau: quatro caules entrelaçados, copa larga e escura, raízes aéreas que descem dos galhos.
 *  palmeira  — palmeira de estipe anelado e esguio, ~13 frondes arqueadas (+2 secas pendentes).
 *  embauba   — embaúba: tronco claro anelado em candelabro, guarda-chuvas de folhas palmadas prateadas.
 * buildSpecies(id, lod) → { bark: MeshBuilder, leaves: MeshBuilder, meta } — LOD0 detalhado, LOD1 com o MESMO
 * esqueleto e os MESMOS tufos (silhueta preservada), menos cartões/segmentos. O LOD2 (impostor) é assado do LOD0.
 */
import { MeshBuilder, tube, bezierPath, clumpCards, frond, rng, LEAF_CELL } from './tree-geometry.mjs';

const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k], lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

export const SPECIES = ['sumauma', 'copaLarga', 'figueira', 'palmeira', 'embauba'];
export const SPECIES_INFO = {
  sumauma: { nome: 'Sumaúma', seed: 1101 },
  copaLarga: { nome: 'Copa-larga', seed: 2203 },
  figueira: { nome: 'Figueira mata-pau', seed: 3307 },
  palmeira: { nome: 'Palmeira', seed: 4409 },
  embauba: { nome: 'Embaúba', seed: 5501 },
};

/** Cor da casca: musgo na base, escurecimento nas axilas, variação por anel. */
function barkColor(tint, moss = .6, mossH = 2.2) {
  return (t, a, p) => {
    const m = Math.max(0, 1 - p[1] / mossH) * moss * (.6 + .4 * Math.max(0, Math.cos(a)));
    return [tint[0] * (1 - m * .45), tint[1] * (1 - m * .12), tint[2] * (1 - m * .5)];
  };
}
const vs = r => 1 / (8 * 2 * Math.PI * Math.max(.05, r));

/** Tronco principal como lista de pontos com curvatura suave. */
function trunkPath(R, from, to, r0, r1, steps, bend = .25) {
  const pts = [], ph = R() * 6.28, ph2 = R() * 6.28;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, p = lerp3(from, to, t);
    p[0] += Math.sin(t * 2.3 + ph) * bend * t; p[2] += Math.sin(t * 1.9 + ph2) * bend * t;
    pts.push({ p, r: r0 + (r1 - r0) * Math.pow(t, .7) });
  }
  return pts;
}

/** Galhos: do tronco até o centro de cada setor da copa e daí um ramo até cada tufo (termina dentro dele). */
function limbsToClumps(R, M, clumps, { attachY, trunkR, sectors, limbR, twigR, col, color, seg, steps, twigs = true, spread = .55 }) {
  const groups = Array.from({ length: sectors }, () => []);
  for (const c of clumps) { if (c.leader) continue; const a = (Math.atan2(c.c[2], c.c[0]) + Math.PI * 2) % (Math.PI * 2); groups[Math.floor(a / (Math.PI * 2) * sectors) % sectors].push(c); }
  groups.forEach((g, gi) => {
    if (!g.length) return;
    const hub = mul(g.reduce((s, c) => add(s, c.c), [0, 0, 0]), 1 / g.length);
    const ay = attachY[0] + R() * (attachY[1] - attachY[0]), dir = norm([hub[0], 0, hub[2]]);
    const start = [dir[0] * trunkR * .5, ay, dir[2] * trunkR * .5];
    const hubP = lerp3(start, hub, twigs ? spread : .92);
    const ctrl = add(lerp3(start, hubP, .5), [0, (hubP[1] - start[1]) * .35, 0]);
    tube(M, bezierPath(start, ctrl, hubP, limbR, twigs ? limbR * .62 : twigR, steps, .12, R), { seg, col, vScale: vs(limbR), color });
    if (!twigs) return;
    for (const c of g) {
      const end = lerp3(c.c, hubP, .42);
      const mid = add(lerp3(hubP, end, .5), [(R() - .5) * .6, .5 + R() * .6, (R() - .5) * .6]);
      tube(M, bezierPath(hubP, mid, end, limbR * .6, twigR, Math.max(3, steps - 2), .08, R), { seg: Math.max(4, seg - 2), col, vScale: vs(twigR * 2), color });
    }
  });
}

function crownClumps(R, rings, opts = {}) {
  const out = [];
  for (const ring of rings) {
    const off = R() * Math.PI * 2;
    for (let i = 0; i < ring.n; i++) {
      const a = off + i / ring.n * Math.PI * 2 + (R() - .5) * .45, d = ring.d * (.88 + R() * .24);
      out.push({ c: [Math.cos(a) * d, ring.y + (R() - .5) * (ring.jy || .8), Math.sin(a) * d], r: ring.r * (.88 + R() * .25), v: .9 + R() * .18, warm: R() < .3 ? .6 + R() * .4 : R() * .2, leader: !!ring.leader });
    }
  }
  return out;
}

/** Cipó/raiz pendente em catenária: de um ponto do galho até perto do chão. */
function hanging(R, M, from, toY, { r = .05, seg = 4, col = 0, color, sway = .8, steps = 8 }) {
  const end = [from[0] + (R() - .5) * sway, toY, from[2] + (R() - .5) * sway];
  const ctrl = [lerp3(from, end, .5)[0] + (R() - .5) * sway, from[1] - (from[1] - toY) * .7, lerp3(from, end, .5)[2] + (R() - .5) * sway];
  tube(M, bezierPath(from, ctrl, end, r, r * .7, steps, .05, R), { seg, col, vScale: vs(r * 3), color, cap: false });
}

export function buildSpecies(id, lod = 0) {
  const info = SPECIES_INFO[id]; if (!info) throw new Error('espécie desconhecida ' + id);
  const R = rng(info.seed), bark = new MeshBuilder(), leaves = new MeshBuilder(), L0 = lod === 0;
  const cardK = L0 ? 1 : .42, sizeK = L0 ? 1 : 1.32, seg = L0 ? 8 : 5, core = L0 ? 1 : 0;
  let meta;
  if (id === 'copaLarga') {
    const trunkTop = [.3, 5.4, -.15], crown = { c: [0, 9.2, 0], r: [6.2, 3.7, 6.2] };
    const tp = trunkPath(R, [0, -.35, 0], trunkTop, .62, .4, L0 ? 10 : 5, .3);
    tube(bark, tp, { seg: L0 ? 14 : 8, col: 0, vScale: vs(.5), color: barkColor([1, 1, 1], .55, 1.6), flare: (t, a, s) => { const k = Math.pow(Math.max(0, 1 - s / 2.1), 2), lobe = .5 + .5 * Math.cos(5 * a + 1.3); return 1 + 2.1 * k * lobe * lobe; } });
    const clumps = crownClumps(R, [{ n: 1, d: 0, y: 11.6, r: 3.1, leader: true }, { n: 6, d: 4.1, y: 9.6, r: 2.9 }, { n: 5, d: 4.9, y: 7.9, r: 2.5 }]);
    // líder central até o tufo do topo
    tube(bark, bezierPath(trunkTop, add(trunkTop, [0, 2.4, 0]), lerp3(clumps[0].c, trunkTop, .3), .3, .09, L0 ? 6 : 3, .1, R), { seg: Math.max(4, seg - 1), col: 0, vScale: vs(.3), color: barkColor([1, 1, 1], 0) });
    limbsToClumps(R, bark, clumps, { attachY: [4.4, 5.3], trunkR: .42, sectors: 5, limbR: .24, twigR: .05, col: 0, color: barkColor([1, 1, 1], 0), seg, steps: L0 ? 7 : 4, twigs: L0 });
    for (const c of clumps) clumpCards(leaves, c, crown, { cards: Math.round(22 * cardK), size: 1.1 * sizeK, cell: 0, tint: [1, 1, 1], core, R });
    meta = { height: 14.6, crownRadius: 6.4, crownY: 9.4, trunkRadius: .62, collision: .72 };
  } else if (id === 'sumauma') {
    const H = 22.5, trunkTop = [.4, H, .25], crown = { c: [0, 26.6, 0], r: [11, 2.9, 11] };
    const tp = trunkPath(R, [0, -.4, 0], trunkTop, 1.05, .55, L0 ? 18 : 8, .35);
    // sapopemas: 6 aletas tabulares altas que se abrem até ~4 m do eixo
    tube(bark, tp, { seg: L0 ? 30 : 18, col: 1, vScale: vs(1.05), color: barkColor([1, 1, 1], .7, 3.2), flare: (t, a, s) => { const k = Math.pow(Math.max(0, 1 - s / 5.5), 1.5), fin = Math.pow(Math.max(0, Math.cos(3 * (a + .2))), 16) + .6 * Math.pow(Math.max(0, Math.cos(3 * (a + .2) + Math.PI)), 12); return 1 + .22 * k + 4.2 * k * fin; } });
    const clumps = crownClumps(R, [{ n: 3, d: 2.4, y: 27.8, r: 3.2 }, { n: 7, d: 6.4, y: 27, r: 3.3 }, { n: 7, d: 9.6, y: 25.8, r: 2.9 }], {});
    limbsToClumps(R, bark, clumps, { attachY: [20.6, 22.3], trunkR: .6, sectors: 6, limbR: .38, twigR: .08, col: 1, color: barkColor([.96, .96, .96], 0), seg, steps: L0 ? 8 : 4, twigs: L0, spread: .62 });
    for (const c of clumps) clumpCards(leaves, c, crown, { cards: Math.round(26 * cardK), size: 1.12 * sizeK, cell: 1, tint: [1.02, 1.03, .9], core, R, flat: .55, upBias: .15 });
    // cipós pendentes dos galhos (identidade de floresta úmida)
    const nL = L0 ? 9 : 3;
    for (let i = 0; i < nL; i++) { const a = i / nL * Math.PI * 2 + R(), d = 3 + R() * 5.5; hanging(R, bark, [Math.cos(a) * d, 23.6 + R() * 1.5, Math.sin(a) * d], 2 + R() * 8, { r: .045, seg: L0 ? 4 : 3, col: 0, color: () => [.55, .5, .4], sway: 1.2, steps: L0 ? 9 : 4 }); }
    meta = { height: 30.4, crownRadius: 11.5, crownY: 26.6, trunkRadius: 1.05, collision: 1.5 };
  } else if (id === 'figueira') {
    const crown = { c: [0, 10.6, 0], r: [8.6, 3.6, 8.6] }, topY = 7.4, stems = 4;
    for (let k = 0; k < stems; k++) {
      const pts = [], ph = k / stems * Math.PI * 2, n = L0 ? 14 : 6;
      for (let i = 0; i <= n; i++) { const t = i / n, a = ph + t * Math.PI * 1.15, rad = .62 * (1 - t * .55); pts.push({ p: [Math.cos(a) * rad, -.3 + t * (topY + .3), Math.sin(a) * rad], r: .3 - t * .1 }); }
      tube(bark, pts, { seg: L0 ? 9 : 5, col: 0, vScale: vs(.3), color: barkColor([.78, .74, .7], .7, 2.4), flare: (t, a, s) => 1 + 1.6 * Math.pow(Math.max(0, 1 - s / 1.2), 2) * (.5 + .5 * Math.cos(2 * a + k)) });
    }
    const clumps = crownClumps(R, [{ n: 2, d: 1.8, y: 12.6, r: 3.1 }, { n: 6, d: 5, y: 11.2, r: 3 }, { n: 7, d: 7.6, y: 9.6, r: 2.7 }]);
    limbsToClumps(R, bark, clumps, { attachY: [6.6, 7.4], trunkR: .5, sectors: 6, limbR: .26, twigR: .06, col: 0, color: barkColor([.78, .74, .7], 0), seg, steps: L0 ? 7 : 4, twigs: L0, spread: .7 });
    for (const c of clumps) clumpCards(leaves, c, crown, { cards: Math.round(22 * cardK), size: 1.1 * sizeK, cell: 0, tint: [.84, .94, .84], core, R });
    // raízes aéreas: descem dos galhos até o chão (algumas viram escoras)
    const nR = L0 ? 11 : 4;
    for (let i = 0; i < nR; i++) { const a = i / nR * Math.PI * 2 + R() * .4, d = 2.6 + R() * 3.4; hanging(R, bark, [Math.cos(a) * d, 7.6 + R() * 1.2, Math.sin(a) * d], i % 2 ? -.25 : 1.5 + R() * 2.5, { r: i % 2 ? .07 : .045, seg: L0 ? 5 : 3, col: 0, color: () => [.72, .68, .62], sway: .5, steps: L0 ? 8 : 4 }); }
    meta = { height: 14.4, crownRadius: 8.8, crownY: 10.6, trunkRadius: .9, collision: 1.15 };
  } else if (id === 'palmeira') {
    const top = [1.1, 11.4, .55];
    const pts = []; const n = L0 ? 12 : 6;
    for (let i = 0; i <= n; i++) { const t = i / n; pts.push({ p: [top[0] * t * t, -.25 + t * (top[1] + .25), top[2] * t * t], r: .2 - .05 * t + .08 * Math.max(0, 1 - t * 6) }); }
    tube(bark, pts, { seg: L0 ? 9 : 6, col: 3, vScale: vs(.2) * .6, color: barkColor([1, 1, 1], .5, 1.4) });
    // palmito (bainha verde) acima do estipe
    tube(bark, [{ p: top, r: .17 }, { p: add(top, [.06, .7, .03]), r: .2 }, { p: add(top, [.1, 1.3, .05]), r: .13 }], { seg: L0 ? 9 : 6, col: 1, vScale: vs(.2), color: () => [.55, .78, .45] });
    const crownBase = add(top, [.1, 1.25, .05]), nF = L0 ? 16 : 10;
    for (let i = 0; i < nF; i++) {
      const a = i / nF * Math.PI * 2 + (R() - .5) * .3, el = i % 3 === 0 ? 1.8 : i % 3 === 1 ? 1.2 : .7;
      frond(leaves, crownBase, [Math.cos(a), 0, Math.sin(a)], { length: 4.1 + R() * .9, width: 2.3, arch: el, droop: 2.4 + R() * .9 + (1.8 - el), segs: L0 ? 7 : 4, cell: 2, tint: [1, 1, 1], R });
    }
    for (let i = 0; i < (L0 ? 2 : 1); i++) { const a = R() * Math.PI * 2; frond(leaves, add(crownBase, [0, -.4, 0]), [Math.cos(a), 0, Math.sin(a)], { length: 3, width: 1.2, arch: -.3, droop: 3.6, segs: L0 ? 5 : 3, cell: 2, tint: [.86, .62, .34], R }); }
    meta = { height: 14.5, crownRadius: 4.2, crownY: 12.6, trunkRadius: .24, collision: .32 };
  } else if (id === 'embauba') {
    const top = [.35, 10.2, -.2];
    const tp = trunkPath(R, [0, -.3, 0], top, .23, .15, L0 ? 10 : 5, .3);
    tube(bark, tp, { seg: L0 ? 9 : 6, col: 2, vScale: vs(.23), color: barkColor([1, 1, 1], .35, 1.2), flare: (t, a, s) => 1 + .9 * Math.pow(Math.max(0, 1 - s / .9), 2) * (.5 + .5 * Math.cos(4 * a)) });
    const tips = [add(top, [0, 3.4, 0])];
    tube(bark, bezierPath(top, add(top, [0, 1.8, 0]), tips[0], .15, .07, L0 ? 5 : 3, .05, R), { seg: L0 ? 7 : 5, col: 2, vScale: vs(.15) });
    const nB = 4;
    for (let i = 0; i < nB; i++) {
      const a = i / nB * Math.PI * 2 + R() * .6, y = 7.2 + i * .7, st = [Math.cos(a) * .12, y, Math.sin(a) * .12], out = 2.2 + R() * 1.2;
      const tip = [Math.cos(a) * out, y + 2.6 + R() * 1.6, Math.sin(a) * out];
      tube(bark, bezierPath(st, [Math.cos(a) * out * .9, y + .3, Math.sin(a) * out * .9], tip, .11, .06, L0 ? 7 : 4, .05, R), { seg: L0 ? 7 : 4, col: 2, vScale: vs(.11) });
      tips.push(tip);
    }
    const crown = { c: [0, 12.4, 0], r: [4.4, 2.6, 4.4] };
    const [a0, b0, a1, b1] = LEAF_CELL(3);
    for (const tip of tips) {
      const nC = L0 ? 9 : 5;
      for (let i = 0; i < nC; i++) {
        const a = i / nC * Math.PI * 2 + R() * .5, tilt = .45 + R() * .5, s = (1.9 + R() * .5) * (L0 ? 1 : 1.2);
        const dirOut = [Math.cos(a), 0, Math.sin(a)], nrm = norm([dirOut[0] * Math.sin(tilt), Math.cos(tilt), dirOut[2] * Math.sin(tilt)]);
        const c = add(tip, [dirOut[0] * (.6 + R() * .5), .2 - R() * .5, dirOut[2] * (.6 + R() * .5)]);
        const t1 = norm([-dirOut[2], 0, dirOut[0]]), t2 = norm([nrm[1] * t1[2] - nrm[2] * t1[1], nrm[2] * t1[0] - nrm[0] * t1[2], nrm[0] * t1[1] - nrm[1] * t1[0]]);
        const ids = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => {
          const p = add(c, add(mul(t1, x * s * .5), mul(t2, y * s * .5))), h = Math.max(0, Math.min(1, (p[1] - 9.5) / 5));
          const vn = norm(add(mul(norm(sub(p, crown.c)), .6), mul(nrm, .4))), ao = .62 + .4 * h;
          return leaves.v(p, vn, [x < 0 ? a0 : a1, y < 0 ? b1 : b0], [ao, ao, ao]);
        });
        leaves.quad(ids[0], ids[1], ids[2], ids[3]);
      }
    }
    meta = { height: 15.6, crownRadius: 4.8, crownY: 12.4, trunkRadius: .3, collision: .38 };
  }
  const bb = { bark: bark.bounds(), leaves: leaves.bounds() };
  meta.bounds = { min: bb.bark.min.map((v, i) => Math.min(v, bb.leaves.min[i])), max: bb.bark.max.map((v, i) => Math.max(v, bb.leaves.max[i])) };
  meta.triangles = bark.triangles + leaves.triangles;
  return { bark, leaves, meta };
}
