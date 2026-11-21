/**
 * MISSÃO 21/11 — ZAR'KHAEL (Bispo 3): a Espiral do Carrasco deixa de lançar a massa/cúpula reprovada e passa a
 * CONJURAR a “Fera dos Mil Olhos” — quadrúpede de lâminas negras e olhos vermelhos (ref. GIF do criador), com metade
 * da altura do Bispo 4. Este módulo é só a LÓGICA (determinística por dt, sem Three.js): o desenho fica em
 * zarkhael-beast-vfx3d.js e lê o estado público da fera a cada quadro.
 *
 * Ordem fixa: invoca → corre (interceptação moderada, aceleração crescente) → desacelera e para → abre a boca ao
 * máximo (direção travada no fim) → FECHA (mordida com bote curto) → só então desintegra e explode em cúpula.
 *  • Dano: UMA vez por invocação, no quadro em que os dentes se encontram, se a boca alcança cabeça/tronco do herói,
 *    com linha de visão e sem i-frames. Nada de dano por contato, rastro ou cúpula.
 *  • Mordida válida aplica no herói “Dano −20 %” por 30 s (renova, nunca acumula) — ver zkBeastBite/zkHeroDamageMul.
 *  • Magia do herói (qualquer poder ofensivo) mata a fera com um acerto → explode sem morder, sem dano e sem debuff.
 *  • Espada NÃO mata: um golpe físico válido provoca UM salto agressivo em direção ao herói, com antecipação visível.
 *  • Limites: corrida ≤ 2,4 s, vida ≤ 7 s, para em parede (sem atravessar), sem teleporte e sem perseguição eterna.
 */
export const ZK_BEAST_BUILD = '336-fera-mil-olhos';
export const ZK_BEAST = Object.freeze({
  summon: .5, vStart: 2.2, vMax: 6.9, accel: 7.5, turn: 3.4, lead: .45, runMax: 2.4, life: 7,
  stopAt: 2.6, stop: .18, open: .5, lockLead: .17, close: .24, lunge: 1.25, contactAt: .72,
  reach: .62, dmg: 26, burst: .34, dome: 1.05,
  leap: { prep: .22, air: .42, height: .95, max: 4.4, keep: 1.05 },
  debuff: Object.freeze({ mul: .8, dur: 30 }),
  len: 2.7, height: 1.12, mouth: 1.38 // focinho a partir do centro do peito (m); altura ≈ metade do VÉRAXION
});
const clamp = (v, a, b) => v < a ? a : v > b ? b : v, wrap = x => Math.atan2(Math.sin(x), Math.cos(x));
const ease = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };

/** Cria a fera na frente do conjurador (ponto navegável; recua até achar chão livre). */
export function zkBeastSpawn(sq, a, t, from) {
  const yaw = t ? Math.atan2(t.x - a.x, t.z - a.z) : a.yaw, fx = Math.sin(yaw), fz = Math.cos(yaw);
  let x = a.x + fx * 1.7, z = a.z + fz * 1.7;
  for (const k of [1.7, 1.3, .9]) { const px = a.x + fx * k, pz = a.z + fz * k; if (!sq.blocked(px, pz)) { x = px; z = pz; break; } }
  if (from) { x = from.x ?? x; z = from.z ?? z; }
  const b = { id: (sq._zkBeast = (sq._zkBeast || 0) + 1), owner: a.id, tid: t && t.id, x, z, y: sq.ground(x, z), yaw, v: 0,
    phase: 'summon', pt: 0, age: 0, run: 0, jaw: 0, neck: 0, crouch: 0, air: 0, gait: 0, burn: 0, dome: 0, alive: true,
    bitten: false, result: null, leapUsed: false, swordHits: 0, lockYaw: null, end: null, headY: .72 };
  a.zkBeast = b; sq.event('zkBeast', { actor: a, beast: b, phase: 'summon' }); return b;
}
function go(sq, a, b, phase, extra) { b.phase = phase; b.pt = 0; if (extra) Object.assign(b, extra); sq.event('zkBeast', { actor: a, beast: b, phase }); }
/** Ponto da boca no mundo (o VFX usa o mesmo cálculo para alinhar os dentes). */
export function zkBeastMouth(b) { const r = ZK_BEAST.mouth + b.neck * .32; return { x: b.x + Math.sin(b.yaw) * r, y: b.y + b.headY + b.air, z: b.z + Math.cos(b.yaw) * r }; }
function burst(sq, a, b, why) { if (b.phase === 'burst' || b.phase === 'dome' || b.phase === 'done') return; b.end = why; b.v = 0; go(sq, a, b, 'burst'); }

/** Passo da fera. Retorna false quando terminou (pode ser removida). */
export function zkBeastStep(sq, a, b, dt, t) {
  const B = ZK_BEAST; if (!b || b.phase === 'done') return false;
  b.age += dt; b.pt += dt;
  if (!a.alive && b.phase !== 'burst' && b.phase !== 'dome') burst(sq, a, b, 'owner');
  if (b.age > B.life && !/burst|dome|close/.test(b.phase)) burst(sq, a, b, 'life');
  const tgt = t && t.alive !== false ? t : null;
  const face = (want, rate) => { b.yaw = wrap(b.yaw + clamp(wrap(want - b.yaw), -rate * dt, rate * dt)); };
  const toward = () => tgt ? Math.atan2(tgt.x - b.x, tgt.z - b.z) : b.yaw;
  const headH = () => tgt ? clamp((tgt.y || 0) + (tgt.height || 1.8) * .78 - b.y, .7, 1.45) : .72;
  const slide = (dx, dz) => { // anda com colisão: desliza na parede, nunca atravessa
    if (!sq.blocked(b.x + dx, b.z + dz)) { b.x += dx; b.z += dz; return true; }
    if (!sq.blocked(b.x + dx, b.z)) { b.x += dx; return true; } if (!sq.blocked(b.x, b.z + dz)) { b.z += dz; return true; } return false; };
  switch (b.phase) {
    case 'summon': b.crouch = 1 - ease(b.pt / B.summon); if (tgt) face(toward(), 6); if (b.pt >= B.summon) go(sq, a, b, 'run', { v: B.vStart }); break;
    case 'run': {
      b.run += dt; b.crouch = 0;
      if (tgt) { const d = Math.hypot(tgt.x - b.x, tgt.z - b.z), k = Math.min(B.lead, d / Math.max(1, b.v) * .5); // interceptação moderada
        face(Math.atan2(tgt.x + (tgt.vx || 0) * k - b.x, tgt.z + (tgt.vz || 0) * k - b.z), B.turn); }
      b.v = Math.min(B.vMax, b.v + B.accel * dt); const st = b.v * dt;
      const ok = slide(Math.sin(b.yaw) * st, Math.cos(b.yaw) * st); b.y = sq.ground(b.x, b.z); b.gait += st;
      const m = zkBeastMouth(b), dm = tgt ? Math.hypot(tgt.x - m.x, tgt.z - m.z) : 99;
      if (dm <= B.stopAt || !ok || b.run >= B.runMax) go(sq, a, b, 'stop', { missRun: dm > B.stopAt + .5 });
      break; }
    case 'stop': { const u = b.pt / B.stop; b.v = Math.max(0, b.v * (1 - u)); const st = b.v * dt; slide(Math.sin(b.yaw) * st, Math.cos(b.yaw) * st); b.y = sq.ground(b.x, b.z); b.gait += st;
      if (tgt) face(toward(), 4); b.crouch = ease(u) * .35; if (b.pt >= B.stop) go(sq, a, b, 'open'); break; }
    case 'open': { const dur = b.leapOpen ? B.open * .6 : B.open, u = b.pt / dur;
      b.jaw = ease(u * 1.15); b.neck = ease(u); b.crouch = .35 - .25 * ease(u); b.headY = .72 + (headH() - .72) * ease(u);
      if (u < 1 - B.lockLead / dur) { if (tgt) face(toward(), 5); } else if (b.lockYaw === null) { b.lockYaw = b.yaw; sq.event('zkBeast', { actor: a, beast: b, phase: 'lock' }); }
      if (b.pt >= dur) { const m = zkBeastMouth(b), dm = tgt ? Math.hypot(tgt.x - m.x, tgt.z - m.z) : B.lunge; go(sq, a, b, 'close', { x0: b.x, z0: b.z, lungeD: clamp(dm + .05, .15, B.lunge) }); } break; } // bote proporcional: a boca para NO alvo travado (não passa por ele)
    case 'close': { const u = b.pt / B.close, prev = b.lastU || 0; b.lastU = u;
      b.jaw = 1 - ease(u * 1.25); const lunge = (b.lungeD ?? B.lunge) * ease(u * 1.3), want = { x: b.x0 + Math.sin(b.yaw) * lunge, z: b.z0 + Math.cos(b.yaw) * lunge };
      slide(want.x - b.x, want.z - b.z); b.y = sq.ground(b.x, b.z);
      if (!b.bitten && prev < B.contactAt && u >= B.contactAt) { b.bitten = true; b.result = 'miss'; // dentes se encontram: único teste de dano
        const m = zkBeastMouth(b);
        for (const tg of sq.enemyTargets()) { if (!tg.alive) continue;
          const head = (tg.y || 0) + (tg.height || 1.8) * .85, chest = (tg.y || 0) + (tg.height || 1.8) * .55, dy = m.y < chest ? chest - m.y : m.y > head ? m.y - head : 0;
          const dh = Math.hypot(tg.x - m.x, tg.z - m.z); if (Math.hypot(dh, dy) > B.reach + (tg.radius || .4) * .7) continue;
          if (!sq.los(b.x, b.z, tg.x, tg.z)) { b.result = 'wall'; continue; }
          if (tg.iframes) { b.result = 'evaded'; sq.event('evaded', { spell: { type: 'zkBeast' }, target: tg.id }); break; }
          const r = sq.damageTarget(tg.id, B.dmg, { kind: 'bite', actor: a.id, x: m.x, z: m.z, knock: .7, combo: 1, beast: b.id });
          b.result = r === 'hit' ? 'hit' : r === 'blocked' ? 'blocked' : 'evaded'; if (b.result === 'hit') zkBeastBite(sq, tg.id);
          sq.event('meleeHit', { actor: a, target: tg.id, result: r, n: 1, move: 'mordida' }); break; }
        const S = a.zkStats; if (S) { S.bite = (S.bite || 0) + 1; S['bite_' + b.result] = (S['bite_' + b.result] || 0) + 1; }
        sq.event('zkBeast', { actor: a, beast: b, phase: 'bite', result: b.result, mouth: m }); }
      if (b.pt >= B.close + .08) burst(sq, a, b, b.result || 'miss'); break; }
    case 'leap': { const L = B.leap;
      if (b.leapT === undefined) { b.leapT = 0; b.crouch = 0; }
      b.leapT += dt;
      if (b.leapT < L.prep) { b.crouch = ease(b.leapT / L.prep); b.jaw = .25 * ease(b.leapT / L.prep); if (tgt) face(toward(), 8); break; } // antecipação legível
      if (!b.lx) { const d = tgt ? Math.hypot(tgt.x - b.x, tgt.z - b.z) : 2, dist = clamp(d - L.keep - B.mouth * .6, .6, L.max); b.lx = { x0: b.x, z0: b.z, dist }; b.crouch = 0; sq.event('zkBeast', { actor: a, beast: b, phase: 'leapAir' }); }
      const u = clamp((b.leapT - L.prep) / L.air, 0, 1), want = b.lx.dist * ease(u);
      slide(b.lx.x0 + Math.sin(b.yaw) * want - b.x, b.lx.z0 + Math.cos(b.yaw) * want - b.z); b.y = sq.ground(b.x, b.z); b.air = Math.sin(Math.PI * u) * L.height; b.gait += dt * 3;
      if (u >= 1) { b.air = 0; b.lx = null; b.leapT = undefined; go(sq, a, b, 'open', { leapOpen: true }); }
      break; }
    case 'burst': b.burn = clamp(b.pt / B.burst, 0, 1); b.jaw *= Math.exp(-dt * 6); if (b.pt >= B.burst) go(sq, a, b, 'dome'); break;
    case 'dome': b.dome = clamp(b.pt / B.dome, 0, 1); if (b.pt >= B.dome) { b.phase = 'done'; b.alive = false; return false; } break;
  }
  return true;
}
/** Magia do herói: um acerto confirmado mata a fera (sem mordida, sem dano, sem debuff). */
export function zkBeastMagicHit(sq, a, b) {
  if (!b || !(/summon|run|stop|open|leap/.test(b.phase) || (b.phase === 'close' && !b.bitten))) return false; // até os dentes se encontrarem
  const S = a && a.zkStats; if (S) S.beastMagic = (S.beastMagic || 0) + 1; b.killedBy = 'magic'; b.jaw = Math.min(b.jaw, .3); burst(sq, a, b, 'magic'); return true;
}
/** Espada do herói: não mata; um golpe válido provoca UM salto agressivo (com antecipação) em direção ao herói. */
export function zkBeastSwordHit(sq, a, b) {
  if (!b || b.leapUsed || !/run|stop|open/.test(b.phase)) return false;
  b.swordHits++; b.leapUsed = true; b.jaw = 0; b.neck = 0; b.lockYaw = null; b.v = 0; const S = a && a.zkStats; if (S) S.beastLeap = (S.beastLeap || 0) + 1; go(sq, a, b, 'leap'); return true;
}
/** Debuff da mordida: dano CAUSADO pelo herói × 0,8 por 30 s de jogo (relógio da esquadra, pausa junto). Renova, não acumula. */
export function zkBeastBite(sq, id) { const D = ZK_BEAST.debuff, h = sq.heroDebuff || (sq.heroDebuff = {}); h[id] = { mul: D.mul, until: sq.time + D.dur, label: 'Dano −20 %' }; sq.event('heroDebuff', { target: id, until: h[id].until }); }
export function zkHeroDamageMul(sq, id = 'hero') { const h = sq && sq.heroDebuff && sq.heroDebuff[id]; return h && sq.time < h.until ? h.mul : 1; }
export function zkHeroDebuffLeft(sq, id = 'hero') { const h = sq && sq.heroDebuff && sq.heroDebuff[id]; return h ? Math.max(0, h.until - sq.time) : 0; }
export function zkClearDebuff(sq, id = 'hero') { if (sq && sq.heroDebuff) delete sq.heroDebuff[id]; }
/** Fera viva (para magia/espada do herói e QA). */
export function zkBeastOf(sq) { if (!sq) return null; for (const a of sq.actors) { const b = a.zkBeast; if (b && b.alive && /summon|run|stop|open|leap|close/.test(b.phase)) return { a, b }; } return null; }
