import { sweptCapsule } from './skill-x-rupture3d.js';
/**
 * MOD 233 — Portais da Perseguição (lógica de combate, passo fixo de 120 Hz).
 *
 * open (um portal RUBRO à esquerda e um VIOLETA à direita do herói) → fire (oito fios com rotas próprias e tempos
 * diferentes: de frente, por trás, por cima, volta completa, em S, em espiral, rasante e mergulho) → burst (explosão
 * rubro-violeta no alvo depois da convergência) → close.
 *
 * As rotas são Catmull-Rom com pontos de controle presos ao referencial do alvo, recalculados a cada passo: se o alvo
 * anda, o final da rota se reajusta suavemente (sem teleporte). Colisão contínua do segmento percorrido; cada fio acerta
 * no máximo uma vez; fio que encontra obstáculo baixo explode nele e não atravessa. Sem alvo, os fios terminam num ponto
 * finito à frente e se dissipam sem dano.
 */
export const PORTALS = Object.freeze({ open: .6, hit: 5, finisher: 18, burst: .9, close: .55, side: 2.1, height: 2.1, radius: .3 });
// lado: -1 = portal rubro (esquerda), 1 = portal violeta (direita)
export const THREADS = Object.freeze([
  { pattern: 'front', side: -1, born: 0, dur: .5 },
  { pattern: 'behind', side: 1, born: .18, dur: 1.35 },
  { pattern: 'over', side: -1, born: .42, dur: 1.25 },
  { pattern: 'loop', side: 1, born: .6, dur: 1.85 },
  { pattern: 'sflank', side: -1, born: .85, dur: 1.15 },
  { pattern: 'spiral', side: 1, born: 1.05, dur: 1.2 },
  { pattern: 'skim', side: -1, born: 1.3, dur: .95 },
  { pattern: 'dive', side: 1, born: 1.5, dur: 1.3 }
]);
const lerp = (a, b, k) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: a.z + (b.z - a.z) * k });
const add = (a, ...vs) => { const o = { ...a }; for (const [v, k] of vs) { o.x += v.x * k; o.y += v.y * k; o.z += v.z * k; } return o; };
/** Catmull-Rom uniforme por uma lista de pontos (u em 0..1, segmentos iguais). */
export function catmull(pts, u) {
  const n = pts.length - 1, f = Math.min(n - 1e-6, Math.max(0, u * n)), i = Math.floor(f), t = f - i;
  const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n, i + 2)], t2 = t * t, t3 = t2 * t;
  const c = k => .5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
  return { x: c('x'), y: c('y'), z: c('z') };
}
/** Ponto da rota `pattern` em u, do portal P até o centro do alvo T, no referencial f (frente) / r (direita). */
export function threadPoint(pattern, u, P, T, f, r, side, groundY = 0) {
  const up = { x: 0, y: 1, z: 0 }, s = side;
  switch (pattern) {
    case 'front': return catmull([P, add(lerp(P, T, .5), [up, .7]), T], u);
    case 'behind': return catmull([P, add(T, [r, s * 5], [f, -1.2], [up, .4]), add(T, [r, s * 2.4], [f, 3.6], [up, .8]), add(T, [f, 2.2], [up, .3]), T], u);
    case 'over': return catmull([P, add(lerp(P, T, .4), [up, 5]), add(T, [up, 6.5], [f, -.5]), add(T, [up, 2.2]), T], u);
    case 'loop': { const R = 3.1, pts = [P, add(T, [f, -R], [r, s * .8], [up, .6])];
      for (let k = 1; k <= 8; k++) { const a = Math.PI + s * k / 8 * Math.PI * 2; pts.push(add(T, [f, Math.cos(a) * R], [r, Math.sin(a) * R], [up, .6 + Math.sin(k) * .25])); }
      pts.push(add(T, [f, -1.1], [up, .2])); pts.push(T); return catmull(pts, u); }
    case 'sflank': return catmull([P, add(lerp(P, T, .3), [r, s * 3.4]), add(lerp(P, T, .62), [r, -s * 3.2], [up, .5]), add(T, [r, s * 1.2], [f, -1.2]), T], u);
    case 'spiral': { const b = lerp(P, T, u), k = (1 - u) * 1.6 * Math.min(1, u * 6), a = u * Math.PI * 6 * s; return add(b, [r, Math.cos(a) * k], [up, Math.sin(a) * k]); }
    case 'skim': { const A = add(lerp(P, T, .35), [r, s * 2.2]), B = add(T, [f, -2.2], [r, -s * 1.2]); A.y = Math.max(groundY + .45, A.y - 1.6); B.y = groundY + .55; return catmull([P, A, B, T], u); }
    case 'dive': return catmull([P, add(P, [up, 4.5], [r, s * 1.5]), add(T, [up, 8.5], [f, -2.5]), add(T, [up, 3]), T], u);
  }
  return lerp(P, T, u);
}

export class TwinPortals {
  constructor({ hit = () => {}, blocked = () => false, ground = () => 0, event = () => {} } = {}) {
    Object.assign(this, { hit, blocked, ground, event, active: false, phase: 'idle', time: 0, age: 0, portals: [{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }], center: { x: 0, y: 0, z: 0 } });
    this.threads = THREADS.map((d, i) => ({ ...d, i, phase: 'waiting', u: 0, p: { x: 0, y: 0, z: 0 }, at: { x: 0, y: 0, z: 0 }, endAt: -1 }));
  }
  start(source, target, yaw = 0, mul = 1) {
    if (this.active) return false;
    this.active = true; this.time = this.age = this.acc = 0; this.phase = 'open'; this.mul = mul; this.hits = 0;
    this.id = target?.alive ? target.id : null;
    let fx = Math.sin(yaw), fz = Math.cos(yaw);
    if (target?.alive) { const dx = target.x - source.x, dz = target.z - source.z, d = Math.hypot(dx, dz); if (d > .3) { fx = dx / d; fz = dz / d; } }
    this.f = { x: fx, y: 0, z: fz }; this.r = { x: fz, y: 0, z: -fx };              // direita do herói olhando para o alvo
    const gy = this.ground(source.x, source.z);
    this.portals = [-1, 1].map(s => ({ x: source.x + this.r.x * s * PORTALS.side - fx * .5, y: gy + PORTALS.height, z: source.z + this.r.z * s * PORTALS.side - fz * .5 }));
    this.fallback = { x: source.x + fx * 14, y: gy + 1.2, z: source.z + fz * 14 };
    for (const t of this.threads) { t.phase = 'waiting'; t.u = 0; t.endAt = -1; }
    this.event('open'); return true;
  }
  cancel() { if (!this.active) return; this.active = false; this.phase = 'idle'; for (const t of this.threads) t.phase = 'gone'; this.event('cancel'); }
  phaseTo(p) { this.phase = p; this.age = 0; this.event(p, this); }
  update(dt, target, { valid = true, paused = false } = {}) {
    if (!this.active || paused) return;
    if (!valid) { this.cancel(); return; }
    const t = this.id !== null && target?.alive && target.id === this.id ? target : null;
    this.acc += Math.max(0, dt);
    while (this.acc >= 1 / 120 && this.active) { this.acc -= 1 / 120; this.step(1 / 120, t); }
  }
  aimPoint(t) { return t ? { x: t.x, y: t.y + (t.height || 1.8) * .55, z: t.z } : this.fallback; }
  step(dt, tg) {
    this.time += dt; this.age += dt;
    if (this.phase === 'open') { if (this.age >= PORTALS.open) this.phaseTo('fire'); return; }
    if (this.phase === 'fire') {
      const T = this.aimPoint(tg); Object.assign(this.center, T); let live = 0;
      for (const th of this.threads) {
        if (th.phase === 'waiting' && this.age >= th.born) { th.phase = 'flight'; th.u = 0; Object.assign(th.p, this.portals[th.side < 0 ? 0 : 1]); this.event('thread', th); }
        if (th.phase === 'waiting') { live++; continue; }
        if (th.phase !== 'flight') continue; live++;
        const P = this.portals[th.side < 0 ? 0 : 1], prev = { ...th.p };
        th.u = Math.min(1, th.u + dt / th.dur);
        const q = threadPoint(th.pattern, th.u, P, T, this.f, this.r, th.side, this.ground(T.x, T.z));
        Object.assign(th.p, q);
        const hitAt = tg && sweptCapsule(prev, q, tg, PORTALS.radius);
        if (hitAt) { th.phase = 'hit'; th.endAt = this.time; Object.assign(th.at, hitAt); this.hits++; this.hit(Math.round(PORTALS.hit * this.mul), this.id, 'thread'); this.event('impact', th); continue; }
        if (q.y < this.ground(q.x, q.z) + 2.4 && this.blocked(q)) { th.phase = 'wall'; th.endAt = this.time; Object.assign(th.at, prev); this.event('wall', th); continue; }
        if (th.u >= 1) { th.phase = 'spent'; th.endAt = this.time; Object.assign(th.at, q); this.event('spent', th); }
      }
      if (!live) { if (tg && this.hits > 0) { this.hit(Math.round(PORTALS.finisher * this.mul), this.id, 'burst'); this.phaseTo('burst'); } else this.phaseTo('close'); }
      return;
    }
    if (this.phase === 'burst') { if (tg) Object.assign(this.center, this.aimPoint(tg)); if (this.age >= PORTALS.burst) this.phaseTo('close'); return; }
    if (this.phase === 'close' && this.age >= PORTALS.close) { this.active = false; this.phase = 'idle'; this.event('finish'); }
  }
}
