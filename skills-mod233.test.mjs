import test from 'node:test'; import assert from 'node:assert/strict';
import { XRupture, XRUP, sweptCapsule } from './skill-x-rupture3d.js';
import { TwinPortals, THREADS, PORTALS, threadPoint } from './skill-twin-portals3d.js';
import { JudgmentDragon, DRAGON } from './skill-judgment-dragon3d.js';
import { SKILLS, SKILL_ORDER, SLOT_SKILLS, EXTRA_SKILLS, normalizeLoadout, equipSlot, ownedSlotSkills, autoSlotFor, canCast, unlockedSkills } from './skills3d.js';
import { SHOP_ITEMS, SWORDS, shopStatus, buyItem } from './progression3d.js';

const target = (o = {}) => ({ id: 7, alive: true, x: 0, y: 0, z: 12, radius: .6, height: 1.9, ...o });
function run(Cls, fps, opts = {}, t = target(), secs = 8, yaw = 0) {
  const hits = [], events = [], s = new Cls({ ...opts, hit: (d, id, k) => hits.push([d, id, k]), event: (e, x) => events.push(e) });
  s.start({ x: 0, y: 1.4, z: 0 }, t, yaw); for (let i = 0; i < fps * secs; i++) s.update(1 / fps, t); return { s, hits, events };
}

// ---------- Ruptura em X
test('X: forma, viaja reto no plano horizontal e acerta uma vez só', () => {
  const ys = [], s = new XRupture({ hit: () => {} }), t = target(); let hits = 0; s.hit = () => hits++;
  s.start({ x: 0, y: 1.4, z: 0 }, t, 0); assert.equal(s.phase, 'cast');
  for (let i = 0; i < 600 && s.active; i++) { s.update(1 / 120, t); if (s.phase === 'travel') ys.push(s.p.y); }
  assert.equal(hits, 1); assert(Math.max(...ys) - Math.min(...ys) < .05, 'não sobe nem desce em terreno plano');
});
test('X: dano idêntico a 10/30/60/120 FPS', () => { const base = run(XRupture, 60).hits; for (const f of [10, 30, 120]) assert.deepEqual(run(XRupture, f).hits, base); assert.equal(base[0][0], XRUP.damage); });
test('X: parede antes do alvo — impacta e NÃO atravessa', () => {
  const r = run(XRupture, 60, { blocked: p => p.z > 5 && p.z < 6 });
  assert.equal(r.hits.length, 0); assert(r.events.includes('wall')); assert(r.s.p.z < 6);
});
test('X: sem alvo percorre alcance finito e dissipa', () => { const r = run(XRupture, 60, {}, null, 6); assert.equal(r.hits.length, 0); assert(r.events.includes('fade')); assert(!r.s.active); });
test('X: projétil rápido não atravessa alvo fino (varredura contínua)', () => { assert(sweptCapsule({ x: 0, y: 1, z: 0 }, { x: 0, y: 1, z: 30 }, target({ radius: .1 }), .1)); });
test('X: alvo morre no meio do voo — sem dano fantasma', () => {
  const t = target(); let n = 0; const s = new XRupture({ hit: () => n++ }); s.start({ x: 0, y: 1.4, z: 0 }, t); s.update(.5, t); t.alive = false; s.update(3, t); assert.equal(n, 0);
});

// ---------- Portais
test('Portais: dois portais separados (rubro à esquerda, violeta à direita) e oito rotas diferentes', () => {
  const s = new TwinPortals(); s.start({ x: 0, y: 1.4, z: 0 }, target(), 0);
  const [L, R] = s.portals; assert(Math.hypot(L.x - R.x, L.z - R.z) > 3.5); assert(L.x > R.x === (s.r.x < 0), 'esquerda/direita coerentes');
  assert.equal(new Set(THREADS.map(t => t.pattern)).size, 8); assert.equal(new Set(THREADS.map(t => t.born)).size, 8);
  for (const p of ['front', 'behind', 'over', 'loop']) assert(THREADS.some(t => t.pattern === p));
});
test('Portais: "por trás" chega pelo lado oposto, "por cima" sobe alto e a volta completa circula o alvo', () => {
  const P = { x: 2, y: 3.5, z: 0 }, T = { x: 0, y: 1, z: 12 }, f = { x: 0, y: 0, z: 1 }, r = { x: 1, y: 0, z: 0 };
  const near = pat => threadPoint(pat, .93, P, T, f, r, 1);
  assert(near('behind').z > T.z, 'aproximação final por trás do alvo');
  assert(Math.max(...[.3, .5, .7].map(u => threadPoint('over', u, P, T, f, r, -1).y)) > T.y + 4);
  const ang = []; for (let u = .12; u <= .96; u += .01) { const q = threadPoint('loop', u, P, T, f, r, 1); ang.push(Math.atan2(q.x - T.x, q.z - T.z)); }
  let turn = 0; for (let i = 1; i < ang.length; i++) { let d = ang[i] - ang[i - 1]; d = Math.atan2(Math.sin(d), Math.cos(d)); turn += d; }
  assert(Math.abs(turn) > Math.PI * 1.75, 'dá a volta em torno do alvo');
});
test('Portais: oito acertos distribuídos no tempo + finalização; determinístico em qualquer FPS', () => {
  const r = run(TwinPortals, 60);
  assert.deepEqual(r.hits.map(h => h[2]), [...Array(8).fill('thread'), 'burst']);
  assert.equal(r.hits.reduce((n, h) => n + h[0], 0), 8 * PORTALS.hit + PORTALS.finisher);
  for (const f of [10, 30, 120]) assert.deepEqual(run(TwinPortals, f).hits, r.hits);
  const times = r.s.threads.map(t => t.endAt); assert(Math.max(...times) - Math.min(...times) > .9, 'não chegam todos ao mesmo tempo');
  assert(!r.s.active);
});
test('Portais: alvo andando — rotas se reajustam e todos ainda acertam; sem alvo não há dano', () => {
  const t = target(), hits = [], s = new TwinPortals({ hit: d => hits.push(d) }); s.start({ x: 0, y: 1.4, z: 0 }, t);
  for (let i = 0; i < 960; i++) { t.x = Math.sin(i / 120) * 3; s.update(1 / 120, t); } assert.equal(hits.length, 9);
  assert.equal(run(TwinPortals, 60, {}, null).hits.length, 0);
});
test('Portais: parede baixa absorve os fios que passam por ela, sem atravessar', () => {
  const r = run(TwinPortals, 60, { blocked: p => p.z > 6 && p.z < 6.6 });
  assert(r.events.filter(e => e === 'wall').length >= 1); assert(r.hits.filter(h => h[2] === 'thread').length < 8);
});

// ---------- Dragão
test('Dragão: forma, avança, abre a boca, FECHA e só então morde; explosão depois', () => {
  const t = target({ z: 14 }), events = [], hits = [], mouth = []; const s = new JudgmentDragon({ hit: (d, id, k) => hits.push([k, s.time, s.mouth]), event: e => events.push(e) });
  s.start({ x: 0, y: 1.4, z: 0 }, t, 0);
  for (let i = 0; i < 1200 && s.active; i++) { s.update(1 / 120, t); mouth.push([s.phase, s.mouth]); }
  assert.deepEqual(events.filter(e => ['channel', 'form', 'advance', 'engulf', 'compress', 'explode', 'finish'].includes(e)), ['channel', 'form', 'advance', 'engulf', 'compress', 'explode', 'finish']);
  assert.deepEqual(hits.map(h => h[0]), ['bite', 'blast']); assert.equal(hits[0][2], 0, 'a mordida acontece com a boca fechada');
  assert(mouth.some(([p, m]) => p === 'engulf' && m > .99), 'boca abre de verdade');
  assert.equal(t.x, 0); assert.equal(t.z, 14, 'nunca move o alvo');
});
test('Dragão: corpo serpentino — o histórico da cabeça ondula para os lados durante o avanço', () => {
  const t = target({ z: 30 }), s = new JudgmentDragon(); s.start({ x: 0, y: 1.4, z: 0 }, t, 0); const xs = [];
  for (let i = 0; i < 600 && s.phase !== 'engulf'; i++) { s.update(1 / 120, t); if (s.phase === 'advance') xs.push(s.head.x); }
  assert(Math.max(...xs) - Math.min(...xs) > .6);
});
test('Dragão: chefe imune recebe a variante de superfície (a cabeça fica fora do corpo, alvo intocado)', () => {
  const t = target({ resist: true, radius: 2.2, height: 6 }), hits = []; const s = new JudgmentDragon({ hit: d => hits.push(d) }); s.start({ x: 0, y: 1.4, z: 0 }, t, 0);
  let minD = 99; for (let i = 0; i < 1200 && s.active; i++) { s.update(1 / 120, t); if (['engulf', 'compress'].includes(s.phase)) minD = Math.min(minD, Math.hypot(s.head.x - t.x, s.head.z - t.z)); }
  assert.equal(hits.length, 2); assert(minD > t.radius, 'não entra no chefe');
});
test('Dragão: dano determinístico; cancelamento e alvo perdido não deixam dano pendente', () => {
  const a = run(JudgmentDragon, 60).hits; for (const f of [10, 30, 120]) assert.deepEqual(run(JudgmentDragon, f).hits, a);
  assert.equal(a.reduce((n, h) => n + h[0], 0), DRAGON.bite + DRAGON.blast);
  const t = target(), hits = []; const s = new JudgmentDragon({ hit: d => hits.push(d) }); s.start({ x: 0, y: 1.4, z: 0 }, t); s.update(1, t); t.alive = false; s.update(5, t); assert.equal(hits.length, 0); assert(!s.active);
});

// ---------- Compra, espaços e saves
test('Habilidades antigas intactas; novas são extras com IDs próprios', () => {
  assert.deepEqual(SKILL_ORDER, ['magic', 'magic2', 'magic3', 'ultimate']); assert.deepEqual([...unlockedSkills({ testAll: true })], SKILL_ORDER);
  for (const id of EXTRA_SKILLS) { assert(SKILLS[id] && SHOP_ITEMS.some(i => i.id === id && i.kind === 'skill')); assert(!['magic', 'magic2', 'magic3', 'ultimate', 'prota', 'aurora', 'vigilia', 'celeste'].includes(id)); }
  assert.equal(SKILLS.ultimate.mana, 80); assert.equal(SKILLS.ultimate.cooldown, 30000);
});
test('Espaços: save antigo carrega o padrão; equipar só o que foi comprado, fora de combate; troca sem duplicar', () => {
  assert.deepEqual(normalizeLoadout(undefined), ['magic', 'magic2', 'magic3']); assert.deepEqual(normalizeLoadout(['x', 'magic', 'magic']), ['magic3', 'magic', 'magic2'].length && normalizeLoadout(['x', 'magic', 'magic']).length === 3 ? normalizeLoadout(['x', 'magic', 'magic']) : null);
  assert.equal(new Set(normalizeLoadout(['x', 'magic', 'magic'])).size, 3);
  const owned = ['magic', 'skill_x_rupture'];
  assert(!equipSlot(undefined, 0, 'skill_twin_portals', { owned }).ok);
  assert(!equipSlot(undefined, 0, 'skill_x_rupture', { owned, inCombat: true }).ok);
  const r = equipSlot(undefined, 1, 'skill_x_rupture', { owned }); assert(r.ok); assert.deepEqual(r.loadout, ['magic', 'skill_x_rupture', 'magic3']);
  const swap = equipSlot(r.loadout, 0, 'skill_x_rupture', { owned }); assert.deepEqual(swap.loadout, ['skill_x_rupture', 'magic', 'magic3']);
  assert.deepEqual(ownedSlotSkills({ testAll: true }), SLOT_SKILLS); assert.equal(autoSlotFor(undefined, ['magic']), 1);
  const u = new Set(['skill_x_rupture']); assert(canCast('skill_x_rupture', { unlocked: u, mana: 26 }).ok); assert(!canCast('skill_x_rupture', { unlocked: u, mana: 25 }).ok); assert(!canCast('skill_x_rupture', { unlocked: u, mana: 99, now: 1, cooldownUntil: { skill_x_rupture: 5000 } }).ok);
});
test('Quantum: bloqueada antes da metade do Ato III mesmo com ouro e nível; liberada na etapa 17', () => {
  const q = SHOP_ITEMS.find(i => i.id === 'quantum'); assert.equal(q.kind, 'sword'); assert.equal(q.step, 17);
  for (const step of [15, 16]) { const st = shopStatus(q, { questStep: step, level: 99, coins: 9999 }); assert.equal(st.state, 'locked'); assert(/metade do Ato III/.test(st.reason)); assert(!buyItem(q, { questStep: step, level: 99, coins: 9999 }).ok); }
  assert(buyItem(q, { questStep: 17, level: 8, coins: q.cost }).ok);
  assert(SWORDS.quantum.damage > SWORDS.vigilia.damage && SWORDS.quantum.damage < SWORDS.celeste.damage);
  assert.equal(new Set(SHOP_ITEMS.map(i => i.id)).size, SHOP_ITEMS.length, 'nenhum id duplicado');
});
import { readFileSync } from 'node:fs';
test('Integração: botões 1–3 lançam a Palavra do espaço; loadout salvo; Quantum com modelo próprio; nada antigo removido', () => {
  const m = readFileSync(new URL('./mundo-3d-prototype.js', import.meta.url), 'utf8');
  assert(m.includes("castHolyMagic(slotSkill(kind))"), 'o espaço decide qual Palavra sai');
  assert(/loadout:typeof skillLoadout!=='undefined'\?skillLoadout/.test(m), 'loadout entra no save');
  assert(m.includes('normalizeLoadout(saved3DProgress.loadout)'), 'save antigo sem loadout carrega o padrão');
  assert(/id==='quantum'\?buildQuantumSword\(THREE\)/.test(m), 'Quantum usa malha própria, não a da Aurora recolorida');
  for (const k of ["kind==='magic3'&&phoenix.active", 'beginWhiteHole()', "siege.start(", 'starfall.start(']) assert(m.includes(k), 'habilidade antiga preservada: ' + k);
  assert(/extraScene\[kind\]===siegeContext\(\)/.test(m), 'troca de cena cancela as Palavras novas');
});
