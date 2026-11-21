// Missão 19/11 — VORGAZHEK no motor da esquadra com o corpo novo (NewBispo2_Otimizado.glb).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Enemy1Squad, KINDS } from '../enemy1-squad3d.js';
import { VORG, VG_MOVES, VG_DASH, VG_ROLES, VG_FILE, vgPhaseOf } from '../vorgazhek3d.js';
import { BOSS_MOVES } from '../boss-choreography3d.js';
import '../vhazrael3d.js';

const glb = () => { const b = fs.readFileSync(new URL('../NewBispo2_Otimizado.glb', import.meta.url)); const len = b.readUInt32LE(12); return JSON.parse(b.slice(20, 20 + len).toString()); };
const hero = (o = {}) => ({ id: 'hero', team: 'hero', x: 0, y: 0, z: 0, vx: 0, vz: 0, radius: .42, height: 1.8, alive: true, priority: 1, ...o });
function world(seed = 3) { const ev = []; const sq = new Enemy1Squad({ seed, damageTarget: () => 'hit', event: (type, d) => ev.push({ type, ...d }) }); return { sq, ev }; }
const boss = (sq, z = 6) => { const a = sq.spawn([{ x: 0, z, yaw: Math.PI, kind: 'vorgazhek' }])[0]; a.alert = 0; return a; };

test('asset real: 23 ossos, 10 clipes; todo papel/golpe aponta para clipe existente ou pose recortada do próprio GLB', () => {
  const j = glb(), names = new Set(j.animations.map(a => a.name)); assert.equal(j.skins[0].joints.length, 23); assert.equal(j.animations.length, 10);
  assert.ok(VG_FILE.startsWith('./NewBispo2_Otimizado.glb'));
  for (const [role, clip] of Object.entries(VG_ROLES)) assert.ok(names.has(clip) || clip.startsWith('VG_'), role + ' → ' + clip);
  const dur = Object.fromEntries(j.animations.map(a => { let d = 0; for (const c of a.channels) d = Math.max(d, j.accessors[a.samplers[c.sampler].input].max[0]); return [a.name, d]; }));
  for (const m of VG_MOVES) { const clip = VG_ROLES[m.clip]; assert.ok(m.hits.at(-1) < dur[clip], m.id); assert.ok(m.duration <= dur[clip] + .01, m.id + ' cabe no clipe'); }
  assert.equal(BOSS_MOVES.vorgazhek.length, VG_MOVES.length); assert.ok(KINDS.vorgazhek === VORG.boss);
});

test('treino dos Bispos: nenhuma magia no kit; corpo a corpo, dash, salto e escudo próprios existem', () => {
  assert.deepEqual(VORG.boss.kit, []); assert.ok(VORG.boss.leap && VORG.boss.shield && VORG.boss.shield.skin === 'fenda');
  const { sq } = world(); boss(sq); const h = hero(); sq.setTargets([h]); for (let i = 0; i < 60 * 20; i++) sq.update(1 / 60); assert.equal(sq.spells.length, 0);
});

test('IA orgânica (sem comando de QA): sequências de 1–3 dashes com objetivo, salto + dash aéreo, investida, escudo/guarda e combos', () => {
  const seen = { chain: {}, n: new Set(), leap: 0, shield: 0, guard: 0, melee: new Set(), run: 0 };
  for (let seed = 1; seed <= 6; seed++) {
    const { sq, ev } = world(seed), a = boss(sq, 7), h = hero(); sq.setTargets([h]); let last = null;
    for (let i = 0; i < 60 * 30; i++) { const t = i / 60; h.attacking = (t % 3) < 1 && Math.hypot(a.x - h.x, a.z - h.z) < 3; h.dashing = (t % 5) < .15; if ((t % 9) > 6) h.z -= .07; sq.update(1 / 60);
      if (a.act && a.act !== last) { last = a.act; if (a.act.type === 'run') seen.run++; if (a.act.move) seen.melee.add(a.act.move.id); } }
    for (const e of ev) { if (e.type === 'vgChain') { seen.chain[e.goal] = (seen.chain[e.goal] || 0) + 1; seen.n.add(e.n); } if (e.type === 'leap') seen.leap++; if (e.type === 'shield') seen.shield++; if (e.type === 'guard') seen.guard++; }
  }
  for (const g of ['eclipse', 'crepusculo', 'aereo']) assert.ok(seen.chain[g] > 0, g + ' ' + JSON.stringify(seen.chain));
  assert.ok(seen.n.has(1) && seen.n.has(2) && seen.n.has(3), 'sequências de 1, 2 e 3 dashes: ' + [...seen.n]);
  assert.ok(seen.leap > 0 && seen.run > 0 && seen.shield + seen.guard > 0, JSON.stringify({ leap: seen.leap, run: seen.run, shield: seen.shield, guard: seen.guard }));
  assert.ok(seen.melee.size >= 5, 'golpes variados: ' + [...seen.melee]);
});

test('orçamento de dash e nunca dentro do corpo do herói', () => {
  const { sq } = world(9), a = boss(sq, 3), h = hero({ attacking: true }); sq.setTargets([h]); const at = []; let last = null, minD = 9;
  for (let i = 0; i < 60 * 25; i++) { h.dashing = (i % 120) < 8; sq.update(1 / 60); if (a.act && a.act !== last) { last = a.act; if (a.act.type === 'dodge') at.push(sq.time); } minD = Math.min(minD, Math.hypot(a.x - h.x, a.z - h.z)); assert.ok(Number.isFinite(a.x) && Number.isFinite(a.z)); }
  for (let i = 0; i < at.length; i++) assert.ok(at.filter(x => x >= at[i] && x < at[i] + VG_DASH.window).length <= VG_DASH.budget + 1);
  assert.ok(minD >= VORG.boss.radius + .42 - .05, 'distância mínima ' + minD.toFixed(2));
});

test('fases pela vida e cadência igual a 30/60 FPS', () => {
  assert.deepEqual([vgPhaseOf(100, 100), vgPhaseOf(60, 100), vgPhaseOf(30, 100), vgPhaseOf(10, 100)], [0, 1, 2, 3]);
  const run = fps => { const { sq, ev } = world(21); boss(sq, 2.4); sq.setTargets([hero()]); for (let i = 0; i < fps * 4; i++) sq.update(1 / fps); return ev.find(e => e.type === 'windup')?.kind; };
  assert.equal(run(30), run(60));
});

test('integração: dimensão II usa a esquadra com o rig novo só no treino dos Bispos; poderes completos mantêm o Bispo 2 clássico', () => {
  const m = fs.readFileSync(new URL('../mundo-3d-prototype.js', import.meta.url), 'utf8');
  assert.ok(/else if\(b\.key==='bishop2'&&BISHOP_DUEL_ONLY&&!SQUAD_LEGACY\)\{pack=\{squad:true,dim:true,rig:'bishop2n'/.test(m));
  assert.ok(/RIG_DEFS\.bishop2n=\{file:VG_FILE/.test(m) && /k==='vorgazhek'\?'bishop2n'/.test(m) && /P\.rig==='bishop2n'\?'vorgazhek'/.test(m));
  const r = fs.readFileSync(new URL('../enemy1-squad-runtime3d.js', import.meta.url), 'utf8');
  assert.ok(/if\(a\.kind==='vorgazhek'\)\{/.test(r) && /style: 'vorgazhek'/.test(r));
});
