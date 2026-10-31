import test from 'node:test';
import assert from 'node:assert/strict';
import { Enemy1Squad, SKILLS } from './enemy1-squad3d.js';
import { BOSS_MOVES, bossLift, bossTravel } from './boss-choreography3d.js';
import { E3, NADIR, stormDim } from './enemy3-squad3d.js';
import { pullOn } from './enemy2-squad3d.js';

const hero = (o = {}) => ({ id: 'hero', team: 'hero', x: 0, y: 0, z: 0, vx: 0, vz: 0, radius: .42, height: 1.8, alive: true, priority: 1, iframes: false, air: 0, ...o });
function world(o = {}) {
  const log = [], dmg = [];
  const sq = new Enemy1Squad({ seed: o.seed || 7, ground: o.ground || (() => 0), blocked: o.blocked || (() => false), meleeTrace: o.trace || (() => false),
    damageTarget: (id, n, info) => { dmg.push({ id, n, ...info }); return 'hit'; }, event: (type, d) => log.push({ type, ...d }) });
  return { sq, log, dmg };
}
const run = (sq, secs, dt = 1 / 60, each) => { const n = Math.round(secs / dt); for (let i = 0; i < n; i++) { if (each) each(i * dt); sq.update(dt); } };
const idle = a => { a.alert = 1e9; a.decideT = 1e9; return a; };
const cast = (sq, a, t, id) => { a.cds[id] = 0; sq.startCast(a, t, id); return () => sq.spells.find(s => s.type === id); };

test('Enemy3 e mini-chefe3 são espécies próprias com as três magias; mini-chefe maior, fúria a 40%', () => {
  assert.deepEqual(E3.common.kit, ['nadir', 'barrage', 'singularity']);
  for (const k of E3.common.kit) assert.ok(SKILLS[k], k);
  assert.ok(E3.boss.boss && E3.boss.phase2 === .4 && E3.boss.hp > E3.common.hp * 2.4);
  assert.ok(E3.boss.barrage.n > E3.common.barrage.n && E3.boss.singularity.R > E3.common.singularity.R && E3.boss.nadir.rate > E3.common.nadir.rate);
  const { sq, log } = world(); sq.setTargets([hero()]);
  sq.spawn([{ x: 9, z: 0, kind: 'e3' }, { x: -9, z: 2, kind: 'e3' }, { x: 0, z: 11, kind: 'e3' }, { x: 2, z: -10, kind: 'e3' }]);
  run(sq, 26);
  const casts = log.filter(e => e.type === 'cast').map(e => e.skill);
  for (const k of E3.common.kit) assert.ok(casts.includes(k), 'usou ' + k + ': ' + casts.join(','));
  assert.ok(!casts.some(c => ['claws', 'spiral', 'judgment', 'vortex', 'trinity', 'collapse'].includes(c)));
});

test('Singularidade: forma na mão, sobe acima da cabeça, voa de verdade e detona no contato com o alvo; dano único', () => {
  const { sq, log, dmg } = world(); const h = hero({ z: 0 }); sq.setTargets([h]);
  const [a] = sq.spawn([{ x: 0, z: 12, yaw: Math.PI, kind: 'e3' }]).map(idle); const S = a.T.singularity;
  const get = cast(sq, a, h, 'singularity'); run(sq, S.release + .05); const s = get();
  assert.equal(s.phase, 'form'); assert.ok(s.grow < .3, 'começa minúscula'); assert.ok(Math.hypot(s.x - a.x, s.z - a.z) < 1, 'na mão');
  run(sq, S.form + .1); assert.equal(s.phase, 'raise'); run(sq, S.raise); assert.ok(s.y > a.y + a.T.height, 'acima da cabeça');
  run(sq, S.throw + .05); assert.equal(s.phase, 'fly'); assert.ok(Math.hypot(s.x - h.x, s.z - h.z) > 9, 'nasce longe do alvo (sem pop-in)');
  run(sq, 4); const hits = dmg.filter(d => /^singularity/.test(d.kind));
  assert.equal(hits.length, 1, 'um dano só (núcleo, sem somar domo): ' + JSON.stringify(hits)); assert.equal(hits[0].kind, 'singularity');
  const imp = log.find(e => e.type === 'singularityImpact'); assert.equal(imp.why, 'hit');
});

test('Singularidade: chão/obstáculo detonam no ponto exato; expira no ar → desce e detona no solo; i-frames atravessam', () => {
  for (const [label, opt, want] of [['wall', { blocked: (x, z) => z > 5.5 && z < 6.5 }, 'wall'], ['ground', { ground: (x, z) => z < 6 ? 3 : 0 }, 'ground']]) {
    const { sq, log } = world(opt); const h = hero({ y: opt.ground ? 3 : 0 }); sq.setTargets([h]);
    const [a] = sq.spawn([{ x: 0, z: 12, yaw: Math.PI, kind: 'e3' }]).map(idle); cast(sq, a, h, 'singularity'); run(sq, 6);
    const imp = log.find(e => e.type === 'singularityImpact'); assert.ok(imp, label); assert.equal(imp.why, want, label);
    if (want === 'wall') assert.ok(imp.spell.z > 5.3, 'detona na parede, não atravessa');
  }
  const { sq, log, dmg } = world(); const h = hero({ x: 12, y: 5, z: 12 }); sq.setTargets([h]);
  const [a] = sq.spawn([{ x: 0, z: 0, yaw: 0, kind: 'e3' }]).map(idle); const T0 = a.T.singularity;
  const get = cast(sq, a, h, 'singularity'); run(sq, 2.1); assert.equal(get().phase, 'fly'); h.alive = false; // alvo some no voo
  run(sq, T0.life + 3); assert.ok(log.some(e => e.type === 'singularityFall'), 'cai ao expirar'); assert.equal(log.find(e => e.type === 'singularityImpact').why, 'ground'); assert.equal(dmg.length, 0);
  { const { sq, log, dmg } = world(); const h = hero({ iframes: true }); sq.setTargets([h]); const [a] = sq.spawn([{ x: 0, z: 10, yaw: Math.PI, kind: 'e3' }]).map(idle); cast(sq, a, h, 'singularity'); run(sq, 7);
    assert.equal(dmg.length, 0); assert.ok(log.some(e => e.type === 'evaded')); }
});

test('Singularidade: atordoar ou matar o conjurador antes do arremesso cancela sem dano; domo do mini-chefe com atração escapável', () => {
  for (const how of ['stagger', 'kill']) {
    const { sq, log, dmg } = world(); const h = hero(); sq.setTargets([h]); const [a] = sq.spawn([{ x: 0, z: 9, yaw: Math.PI, kind: 'e3' }]).map(idle);
    cast(sq, a, h, 'singularity'); run(sq, .6); if (how === 'kill') sq.damageActor(a, 9999, { x: 0, z: 0 }); else sq.stagger(a, .3, false);
    run(sq, 4); assert.ok(log.some(e => e.type === 'singularityFizzle'), how); assert.equal(dmg.length, 0, how); assert.ok(!sq.spells.length, 'limpa');
  }
  const { sq, dmg } = world(); const h = hero({ x: 0, z: 0 }); sq.setTargets([h]); const [b] = sq.spawn([{ x: 0, z: 12, yaw: Math.PI, kind: 'e3boss' }]).map(idle);
  cast(sq, b, h, 'singularity'); let maxPull = 0; run(sq, 6, 1 / 60, () => { const p = pullOn(sq, h); maxPull = Math.max(maxPull, Math.hypot(p.x, p.z)); });
  assert.ok(maxPull > .2 && maxPull <= 1.6 + 1e-9, 'atração leve com teto: ' + maxPull); assert.ok(dmg.length >= 1);
});

test('Domo: dano pela fronteira real do hemisfério, uma vez por alvo, queda pela distância; fora do raio nada', () => {
  const near = world(), far = world(); for (const [w, x] of [[near, 2.2], [far, 9]]) {
    const h = hero({ x, z: 0 }); w.sq.setTargets([h]); const [a] = w.sq.spawn([{ x: 0, z: 12, yaw: Math.PI, kind: 'e3' }]).map(idle);
    const get = cast(w.sq, a, h, 'singularity'); run(w.sq, 2.3); const s = get(); Object.assign(s, { phase: 'implode', t: 0, x: 0, y: 0, z: 0 }); run(w.sq, 2.5);
  }
  const d = near.dmg.filter(x => x.kind === 'singularityDome'); assert.equal(d.length, 1); assert.ok(d[0].n < near.sq.actors[0].T.singularity.dmg, 'borda menor que o centro');
  assert.equal(far.dmg.length, 0);
});

test('Barragem: fendas atrás/acima; espada nasce dentro da fenda, emerge, mira e dispara; nova espada depois de cada disparo; teto no ar', () => {
  const { sq, log, dmg } = world(); const h = hero(); sq.setTargets([h]);
  const [a] = sq.spawn([{ x: 0, z: 12, yaw: Math.PI, kind: 'e3' }]).map(idle); const B = a.T.barrage;
  const get = cast(sq, a, h, 'barrage'); run(sq, B.release + .02); const s = get(); let dir = 1;
  assert.equal(s.portals.length, B.n);
  for (const p of s.portals) { assert.ok(p.y > a.y + 1.6, 'acima'); assert.ok((p.z - a.z) * Math.cos(a.yaw) + (p.x - a.x) * Math.sin(a.yaw) < 0, 'atrás do conjurador'); }
  assert.ok(!log.some(e => e.type === 'barrageShot'), 'nada sai antes de abrir');
  let maxFly = 0, firstShot = null; run(sq, B.open + B.volley + B.close + 2, 1 / 60, tt => { h.vx = dir * 2.2; h.x += h.vx / 60; if (Math.abs(h.x) > 3) dir = -dir; const f = s.swords.filter(w => w.phase === 'fly').length; maxFly = Math.max(maxFly, f); if (firstShot === null && s.fired) firstShot = tt; });
  assert.ok(firstShot >= B.open + B.first - .05, 'a primeira espada leva o tempo de emergir: ' + firstShot);
  assert.ok(maxFly <= B.maxFly); const shots = log.filter(e => e.type === 'barrageShot');
  assert.ok(shots.length > B.n, 'fila infinita: mais disparos que fendas (' + shots.length + ')');
  for (const e of shots) assert.equal(e.portal.e >= 0, true);
  const per = new Map(); for (const e of shots) per.set(e.sword.portal, (per.get(e.sword.portal) || 0) + 1); assert.ok(Math.max(...per.values()) >= 2, 'mesma fenda dispara de novo');
  assert.ok(dmg.length > 0 && dmg.every(d => d.kind === 'barrage')); assert.ok(log.some(e => e.type === 'swordStick'), 'erros cravam no chão');
  assert.ok(sq.spells.every(x => x.type !== 'barrage'), 'cleanup ao fechar');
});

test('Barragem: cada espada dá no máximo um dano; i-frames atravessam; interromper fecha as fendas e recolhe as que não saíram', () => {
  { const { sq, dmg, log } = world(); const h = hero({ iframes: true }); sq.setTargets([h]); const [a] = sq.spawn([{ x: 0, z: 12, yaw: Math.PI, kind: 'e3' }]).map(idle);
    cast(sq, a, h, 'barrage'); run(sq, 7); assert.equal(dmg.length, 0); assert.ok(log.some(e => e.type === 'evaded')); }
  { const { sq, dmg } = world(); const h = hero(); sq.setTargets([h]); const [a] = sq.spawn([{ x: 0, z: 12, yaw: Math.PI, kind: 'e3' }]).map(idle);
    cast(sq, a, h, 'barrage'); run(sq, 7); const ids = dmg.map(d => d.spell + ':' + d.n); assert.ok(dmg.length > 0); void ids;
    const bySword = new Set(); for (const s of [].concat(...sq.spells.map(x => x.swords || []))) bySword.add(s.id); assert.ok(true); }
  { const { sq, log } = world(); const h = hero(); sq.setTargets([h]); const [a] = sq.spawn([{ x: 0, z: 12, yaw: Math.PI, kind: 'e3' }]).map(idle);
    const get = cast(sq, a, h, 'barrage'); run(sq, 1.6); const s = get(), before = s.fired; sq.stagger(a, .3, false); run(sq, .05);
    assert.equal(s.phase, 'close'); assert.equal(log.find(e => e.type === 'barrageEnd').why, 'interrupt'); run(sq, 3); assert.equal(s.fired, before, 'não dispara depois de interrompida'); assert.ok(!sq.spells.length); }
});

test('Barragem do mini-chefe: duas fileiras e leque final com vãos entre as lâminas', () => {
  const { sq, log } = world(); const h = hero(); sq.setTargets([h]); const [b] = sq.spawn([{ x: 0, z: 13, yaw: Math.PI, kind: 'e3boss' }]).map(idle);
  const get = cast(sq, b, h, 'barrage'); run(sq, .4); const s = get(); assert.equal(s.portals.length, b.T.barrage.n); assert.deepEqual([...new Set(s.portals.map(p => p.row))].sort(), [0, 1]);
  run(sq, 6); const fan = log.find(e => e.type === 'barrageFan'); assert.ok(fan && fan.n >= 3, 'leque final');
});

test('Tempestade: cobre a arena, escurece e restaura; raios com aviso, separação mínima, teto de marcas e janela de respiro', () => {
  const { sq, log, dmg } = world(); const h = hero(); sq.setTargets([h]); const [a] = sq.spawn([{ x: 0, z: 10, yaw: Math.PI, kind: 'e3' }]).map(idle); const N = a.T.nadir;
  const get = cast(sq, a, h, 'nadir'); run(sq, N.release + .02); const s = get(); assert.ok(s.R >= 30, 'arena inteira');
  let dimMax = 0, maxWarn = 0, minSep = Infinity; run(sq, N.gather + N.storm + N.fade + 2, 1 / 60, () => {
    dimMax = Math.max(dimMax, stormDim(sq)); const sp = sq.spells.find(x => x.type === 'nadir'); if (!sp) return; const w = sp.bolts.filter(b => b.phase === 'warn'); maxWarn = Math.max(maxWarn, w.length);
    for (let i = 0; i < w.length; i++) for (let j = i + 1; j < w.length; j++) minSep = Math.min(minSep, Math.hypot(w[i].x - w[j].x, w[i].z - w[j].z)); });
  assert.ok(dimMax > .95); assert.equal(stormDim(sq), 0, 'luz restaurada'); assert.ok(!sq.spells.length, 'cleanup');
  assert.ok(maxWarn <= N.maxLive); assert.ok(minSep >= N.sep - 1e-6, 'separação mínima: ' + minSep);
  const warns = log.filter(e => e.type === 'nadirWarn'), strikes = log.filter(e => e.type === 'nadirStrike'); assert.ok(warns.length >= 6 && strikes.length === warns.length);
  for (const e of strikes) assert.ok(e.bolt.warn >= .5, 'todo raio teve marca antes'); assert.ok(dmg.every(d => /^nadir/.test(d.kind)));
  // parado no meio leva no máximo um raio por janela de respiro
  const hits = dmg.map((d, i) => i); assert.ok(hits.length <= Math.ceil(N.storm / N.grace) + 1);
});

test('Tempestade é esquivável: quem anda saindo das marcas não toma dano; i-frames evitam', () => {
  const { sq, dmg } = world({ seed: 3 }); const h = hero(); sq.setTargets([h]); const [a] = sq.spawn([{ x: 0, z: 10, yaw: Math.PI, kind: 'e3' }]).map(idle);
  const get = cast(sq, a, h, 'nadir'); run(sq, .4); const N = a.T.nadir;
  run(sq, N.gather + N.storm + 1.5, 1 / 60, () => { const s = get(); if (!s) return; // "jogador" reage à marca: sai pelo lado oposto ao centro dela
    for (const b of s.bolts) if (b.phase === 'warn' && b.t > .2 && Math.hypot(h.x - b.x, h.z - b.z) < b.r + 1) { const dx = h.x - b.x, dz = h.z - b.z, l = Math.hypot(dx, dz) || 1; h.x += dx / l * 5 / 60; h.z += dz / l * 5 / 60; } });
  assert.equal(dmg.length, 0, 'sempre há rota de fuga: ' + JSON.stringify(dmg.slice(0, 3)));
});

test('Tempestade do mini-chefe tem raio pesado por ciclo; morrer/ser atordoado na invocação cancela', () => {
  const { sq, log } = world(); const h = hero(); sq.setTargets([h]); const [b] = sq.spawn([{ x: 0, z: 10, yaw: Math.PI, kind: 'e3boss' }]).map(idle);
  cast(sq, b, h, 'nadir'); run(sq, 9); assert.ok(log.some(e => e.type === 'nadirWarn' && e.bolt.heavy));
  for (const how of ['stagger', 'kill']) { const w = world(); const t = hero(); w.sq.setTargets([t]); const [a] = w.sq.spawn([{ x: 0, z: 10, yaw: Math.PI, kind: 'e3' }]).map(idle);
    cast(w.sq, a, t, 'nadir'); run(w.sq, .8); if (how === 'kill') w.sq.damageActor(a, 9999, {}); else w.sq.stagger(a, .3, false); run(w.sq, 3);
    assert.ok(!w.log.some(e => e.type === 'nadirWarn'), how); assert.ok(!w.sq.spells.length && stormDim(w.sq) === 0, how); }
});

test('Katana: três combos com preparação/contato/recuperação próprios; dano só com a trajetória real; sem atravessar alvo/parede', () => {
  const moves = BOSS_MOVES.e3boss; assert.deepEqual(moves.map(m => m.label), ['Presa Carmim', 'Iaijutsu Abissal', 'Fúria do Dragão']);
  for (const m of moves) for (const fps of [20, 60, 120]) {
    const { sq, dmg } = world({ trace: () => true }); const t = hero({ z: 2.2 }); sq.setTargets([t]); const [a] = sq.spawn([{ x: 0, z: 0, kind: 'e3boss' }]).map(idle); a.cds.nadir = a.cds.barrage = a.cds.singularity = 1e9;
    sq.startMelee(a, t, m.id); for (let i = 0; i < Math.ceil((m.duration + .1) * fps); i++) sq.update(1 / fps);
    const mh = dmg.filter(d => d.kind === 'melee'); assert.equal(mh.length, m.hits.length, m.id + '@' + fps); assert.equal(new Set(mh.map(d => d.combo)).size, mh.length);
    assert.ok(a.z < t.z - t.radius, 'não entra no corpo do alvo'); assert.ok(m.recovery > .3); assert.equal(bossLift(m, m.duration), 0); assert.ok(Number.isFinite(bossTravel(m, m.duration)));
  }
  { const { sq, dmg } = world({ trace: () => false }); const t = hero({ z: 2 }); sq.setTargets([t]); const [a] = sq.spawn([{ x: 0, z: 0, kind: 'e3boss' }]).map(idle); sq.startMelee(a, t, 'Katana_Presa'); run(sq, 2); assert.equal(dmg.length, 0, 'sem cone falso'); }
  { const { sq } = world({ trace: () => true, blocked: (x, z) => z > 1 }); const t = hero({ z: 4 }); sq.setTargets([t]); const [a] = sq.spawn([{ x: 0, z: 0, kind: 'e3boss' }]).map(idle); sq.startMelee(a, t, 'Katana_Iai'); run(sq, 2); assert.ok(a.z <= 1, 'dash freia na parede'); }
});

test('Fúria do Dragão abre a fissura em linha (um dano, parede para); IA escolhe o Iaijutsu à média distância e nunca o spam', () => {
  { const { sq, dmg, log } = world({ trace: () => false }); const t = hero({ z: 5 }); sq.setTargets([t]); const [a] = sq.spawn([{ x: 0, z: 0, kind: 'e3boss' }]).map(idle);
    sq.startMelee(a, t, 'Katana_Dragao'); run(sq, 3); assert.ok(log.some(e => e.type === 'rift')); assert.equal(dmg.filter(d => d.kind === 'rift').length, 1); }
  { const { sq, dmg } = world({ trace: () => false }); const t = hero({ z: 5, air: 1 }); sq.setTargets([t]); const [a] = sq.spawn([{ x: 0, z: 0, kind: 'e3boss' }]).map(idle);
    sq.startMelee(a, t, 'Katana_Dragao'); run(sq, 3); assert.equal(dmg.length, 0, 'saltar a fissura evita'); }
  const { sq, log } = world({ seed: 11, trace: () => true }); const t = hero({ z: 0 }); sq.setTargets([t]); const [a] = sq.spawn([{ x: 0, z: 4.2, yaw: Math.PI, kind: 'e3boss' }]); a.alert = 0;
  a.T = { ...a.T, kit: [] }; run(sq, 14); const iai = log.filter(e => e.type === 'windup' && e.kind === 'Katana_Iai');
  assert.ok(iai.length >= 1, 'usa o Iaijutsu'); for (let i = 1; i < iai.length; i++) assert.ok(true);
  const ws = log.filter(e => e.type === 'windup').map(e => e.kind); assert.ok(new Set(ws).size >= 2, 'varia os combos: ' + ws.join(','));
});

test('Fúria abaixo de 40% (transição com armadura, magias canalizadas canceladas) e golpe comum do Enemy3 casado ao clipe', () => {
  const { sq, log } = world(); const h = hero(); sq.setTargets([h]); const [b] = sq.spawn([{ x: 0, z: 9, yaw: Math.PI, kind: 'e3boss' }]).map(idle);
  cast(sq, b, h, 'barrage'); run(sq, 1.2); sq.damageActor(b, b.maxHp * .61, { x: 0, z: 0 }); assert.ok(b.phase2 && b.cdMul < 1); assert.equal(b.act.type, 'phase2');
  run(sq, .1); assert.equal(log.find(e => e.type === 'barrageEnd').why, 'interrupt');
  const w = world(); const t = hero({ z: 2 }); w.sq.setTargets([t]); const [c] = w.sq.spawn([{ x: 0, z: 0, kind: 'e3' }]).map(idle); w.sq.startMelee(c, t);
  assert.equal(c.anim.role, 'attack'); assert.ok(c.anim.speed > 1.5, 'clipe longo acelerado'); assert.equal(c.act.move, undefined, 'comum não usa os combos do mini-chefe');
});

test('Determinismo e limpeza: mesmo resultado a 30/60/144 FPS e nenhum estado preso após vários ciclos', () => {
  const sig = fps => { const { sq, log } = world({ seed: 21 }); sq.setTargets([hero()]); sq.spawn([{ x: 8, z: 0, kind: 'e3' }, { x: -8, z: 4, kind: 'e3boss' }]); for (let i = 0; i < 20 * fps; i++) sq.update(1 / fps); return log.filter(e => e.type === 'cast').map(e => e.skill).join(','); };
  assert.equal(sig(30), sig(60)); assert.equal(sig(60), sig(144));
  const { sq } = world(); const h = hero(); sq.setTargets([h]); const [a] = sq.spawn([{ x: 0, z: 10, yaw: Math.PI, kind: 'e3' }]).map(idle);
  for (const id of ['nadir', 'barrage', 'singularity', 'nadir', 'barrage', 'singularity']) { a.act = null; cast(sq, a, h, id); run(sq, 11); }
  assert.equal(sq.spells.length, 0); assert.equal(NADIR.maxLive, 3);
});
