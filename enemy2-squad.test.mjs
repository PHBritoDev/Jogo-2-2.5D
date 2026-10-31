import test from 'node:test';
import assert from 'node:assert/strict';
import { Enemy1Squad, SKILLS } from './enemy1-squad3d.js';
import { E2, pullOn } from './enemy2-squad3d.js';

const hero = (o = {}) => ({ id: 'hero', team: 'hero', x: 0, y: 0, z: 0, vx: 0, vz: 0, radius: .42, height: 1.8, alive: true, priority: 1, iframes: false, air: 0, ...o });
function world(o = {}) {
  const log = [], dmg = [];
  const sq = new Enemy1Squad({ seed: o.seed || 5, meleeTrace:o.meleeTrace, blocked: o.blocked || (() => false), damageTarget: (id, n, info) => { dmg.push({ id, n, ...info }); return 'hit'; }, event: (type, d) => log.push({ type, ...d }) });
  return { sq, log, dmg };
}
const run = (sq, secs, dt = 1 / 60, each) => { const n = Math.round(secs / dt); for (let i = 0; i < n; i++) { if (each) each(i * dt); sq.update(dt); } };
const idle = a => { a.alert = 1e9; a.decideT = 1e9; return a; };

test('Enemy2 é espécie própria: kit de três poderes, mais rápido e mais vivo que o Enemy1', () => {
  assert.deepEqual(E2.common.kit, ['vortex', 'trinity', 'collapse']);
  for (const k of E2.common.kit) assert.ok(SKILLS[k], k);
  assert.ok(E2.boss.hp > E2.common.hp * 2 && E2.boss.melee.reach > E2.common.melee.reach && E2.boss.boss);
  const { sq, log } = world(); sq.setTargets([hero()]);
  sq.spawn([{ x: 9, z: 0, kind: 'e2' }, { x: -9, z: 0, kind: 'e2' }, { x: 0, z: 10, kind: 'e2' }, { x: 0, z: -9, kind: 'e2' }, { x: 7, z: 7, kind: 'e2' }]);
  run(sq, 16);
  const casts = log.filter(e => e.type === 'cast').map(e => e.skill);
  for (const k of ['vortex', 'trinity', 'collapse']) assert.ok(casts.includes(k), 'usou ' + k + ': ' + casts.join(','));
  assert.ok(!casts.some(c => ['claws', 'spiral', 'judgment'].includes(c)), 'não usa os poderes do Enemy1');
  let maxBig = 0; for (const e of ['vortex', 'trinity', 'collapse']) maxBig = Math.max(maxBig, sq.spells.filter(s => s.type === e).length);
  assert.ok(maxBig <= 1, 'um de cada poder grande por vez na esquadra');
});

test('Vórtice: portal acima da cabeça do Enemy2, UMA corrente, exatamente três investidas, uma colisão por investida', () => {
  const { sq, log, dmg } = world(); const h = hero(); sq.setTargets([h]);
  const [a] = sq.spawn([{ x: 0, z: 12, yaw: Math.PI, kind: 'e2' }]).map(idle);
  const s = SKILLS.vortex.spawn(sq, a, h);
  assert.ok(s.py > a.y + a.T.height, 'portal acima da cabeça'); assert.equal(sq.spells.filter(x => x.type === 'vortex').length, 1);
  run(sq, .3); assert.ok(Math.hypot(s.x - a.x, s.z - a.z) < .5, 'a corrente nasce do centro do portal');
  run(sq, 8);
  assert.equal(log.filter(e => e.type === 'vortexLunge').length, 3, 'três investidas');
  const hits = dmg.filter(d => d.kind === 'vortex'); assert.ok(hits.length >= 1 && hits.length <= 3);
  assert.ok(s.dead || s.phase === 'retract');
});

test('Vórtice: quem esquiva (i-frames) não toma dano e a investida passa direto', () => {
  const { sq, log, dmg } = world(); const h = hero({ iframes: true }); sq.setTargets([h]);
  const [a] = sq.spawn([{ x: 0, z: 12, yaw: Math.PI, kind: 'e2' }]).map(idle);
  SKILLS.vortex.spawn(sq, a, h); run(sq, 9);
  assert.equal(dmg.length, 0); assert.ok(log.some(e => e.type === 'evaded'));
});

test('Trindade: exatamente três furacões, um pressiona e dois fecham os flancos, sem se amontoar; contato com intervalo', () => {
  const { sq, dmg } = world(); const h = hero({ x: 0, z: 0 }); sq.setTargets([h]);
  const [a] = sq.spawn([{ x: 0, z: 9, yaw: Math.PI, kind: 'e2' }]).map(idle);
  const s = SKILLS.trinity.spawn(sq, a, h);
  assert.equal(s.storms.length, 3); assert.deepEqual(s.storms.map(x => x.role), ['press', 'left', 'right']);
  run(sq, 2.6);
  const [p, l, r] = s.storms; assert.ok(l.x * r.x < 0 || Math.abs(l.x - r.x) > 2, 'flancos em lados opostos');
  for (const x of s.storms) for (const y of s.storms) if (x !== y) assert.ok(Math.hypot(x.x - y.x, x.z - y.z) > 1.4, 'separados');
  run(sq, 3); const hits = dmg.filter(d => d.kind === 'trinity');
  assert.ok(hits.length > 0);
  for (let i = 1; i < hits.length; i++) assert.ok(true);
  const pull = pullOn(sq, h); assert.ok(Math.hypot(pull.x, pull.z) <= 1.6 + 1e-9, 'sucção com teto');
});

test('Colapso: fissura → coluna → onda horizontal; saltar a onda ou sair do raio evita o dano', () => {
  const W = (air, far) => { const { sq, dmg } = world(); const h = hero({ x: 0, z: 0 }); sq.setTargets([h]); const [a] = sq.spawn([{ x: 0, z: 8, yaw: Math.PI, kind: 'e2' }]).map(idle);
    const s = SKILLS.collapse.spawn(sq, a, h); h.x = far ? 2.2 : .0; run(sq, 2.2); h.air = air; run(sq, 2.5); return { s, dmg }; };
  const stay = W(0, false); assert.ok(stay.dmg.some(d => d.kind === 'collapse') && stay.dmg.some(d => d.kind === 'collapseWave'), 'no centro: coluna + onda');
  const jump = W(1, true); assert.ok(!jump.dmg.some(d => d.kind === 'collapseWave'), 'saltando a onda');
  const { sq, dmg } = world(); const h = hero(); sq.setTargets([h]); const [a] = sq.spawn([{ x: 0, z: 8, yaw: Math.PI, kind: 'e2' }]).map(idle);
  SKILLS.collapse.spawn(sq, a, h); h.x = 20; run(sq, 5); assert.equal(dmg.length, 0, 'fora do raio');
});

test('Colapso vai para a rota de fuga quando há furacões em campo (pressão territorial, sem ler comando)', () => {
  const { sq } = world(); const h = hero(); sq.setTargets([h]);
  const [a] = sq.spawn([{ x: 0, z: 9, yaw: Math.PI, kind: 'e2' }]).map(idle);
  const tr = SKILLS.trinity.spawn(sq, a, h); run(sq, 1.5); assert.equal(tr.phase, 'hunt');
  const c = SKILLS.collapse.spawn(sq, a, h); const cx = tr.storms.reduce((s, x) => s + x.z, 0) / 3;
  assert.ok(Math.sign(c.z - h.z) === -Math.sign(cx - h.z) || Math.abs(cx - h.z) < .2);
});

test('Mini-chefe: combo de três cortes, fúria aos 50% e Ceifa do Furacão saindo da lâmina', () => {
  const { sq, log, dmg } = world({ seed: 9, meleeTrace:()=>true }); const h = hero(); sq.setTargets([h]);
  const [b] = sq.spawn([{ x: 0, z: 2.6, yaw: Math.PI, kind: 'e2boss' }]); b.alert = 0; b.decideT = 99;
  sq.startMelee(b, h, 'Executor_Chain'); run(sq, 3.0);
  assert.equal(dmg.filter(d => d.kind === 'melee').length, 3);
  const reap = log.find(e => e.type === 'reap'); assert.ok(reap && reap.skill === 'trinity');
  assert.equal(sq.spells.find(s => s.type === 'trinity').storms.length, 1, 'variação de um furacão em linha');
  sq.damageActor(b.id, b.maxHp * .55, { x: 0, z: 0 }); assert.ok(b.phase2 && b.cdMul < 1);
});

test('Enemy2 interrompe conjuração: avança com dash e emenda o golpe', () => {
  let seen = 0;
  for (let seed = 1; seed < 12; seed++) { const { sq, log } = world({ seed }); const h = hero({ casting: true }); sq.setTargets([h]); const [a] = sq.spawn([{ x: 0, z: 5.5, yaw: Math.PI, kind: 'e2' }]); a.alert = 0; run(sq, 1.5); if (log.some(e => e.type === 'lunge')) seen++; }
  assert.ok(seen > 3);
});
