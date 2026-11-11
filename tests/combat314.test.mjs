import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { EnergyShield, SHIELD_SPECS, resolveHit } from '../combat-defense3d.js';
import { Mobility2, MOBILITY } from '../combat-mobility3d.js';
import { PROTA_DASH, PROTA_MOVES, protaMoveDef } from '../prota-combat3d.js';
import { makeEnergy, energyStep, energyTouches } from '../combat-energy3d.js';
import { SwordRites } from '../sword-rites3d.js';
import { Enemy1Squad, E1 } from '../enemy1-squad3d.js';
import { DEMON1_MOVES, DEMON1_LEAP, clawReaches } from '../demon1-combat3d.js';
import { createSlashVFX } from '../slash-vfx3d.js';
import { createShieldVFX } from '../shield-vfx3d.js';
const src = fs.readFileSync(new URL('../mundo-3d-prototype.js', import.meta.url), 'utf8');
// three.js real para os pools de VFX: o CI (combat314.yml) instala three@0.160.0 e aponta COMBAT_THREE_DIR
let THREE = null;
for (const dir of [process.env.COMBAT_THREE_DIR, process.env.AERIAL_THREE_DIR, new URL('../node_modules/three', import.meta.url).pathname]) {
  if (!dir) continue; try { THREE = await import(dir.replace(/\/$/, '') + '/build/three.module.js'); break; } catch { /* tenta o próximo */ }
}

test('Mod 314: dash com recarga ÚNICA de 0,50 s contada desde a ativação (herói e jogo real)', () => {
  assert.equal(MOBILITY.dashCooldown, .5); assert.equal(PROTA_DASH.cooldown, .5);
  const m = new Mobility2();
  assert.equal(m.dash(10), true); assert.equal(m.dash(10.25), false); assert.equal(m.dash(10.499), false);
  assert.equal(m.dash(10.5), true, 'libera exatamente 0,50 s depois da ativação');
  assert.ok(Math.abs(m.dashReadiness(10.75) - .5) < 1e-9 && Math.abs(m.dashLeft(10.75) - .25) < 1e-9, 'HUD lê o progresso');
  assert.match(src, /if\(kind==='dash'\)\{if\(!heroMob\.canDash\(combatClock\)/);
  assert.doesNotMatch(src, /PROTA_DASH\.cooldown\*1000/, 'nenhum caminho paralelo de recarga');
  assert.match(src, /bindInstantAction\('dash','dash'\)/);
});

test('Mod 314: dois saltos por sequência aérea, nunca um terceiro; o dash não gasta salto; reset só no pouso', () => {
  const m = new Mobility2();
  assert.equal(m.jump(true, 0), 1); assert.equal(m.dash(.1), true, 'dash entre os saltos');
  assert.equal(m.jump(false, .3), 2, 'segundo salto no ar'); assert.equal(m.dash(.65), true, 'dash depois do segundo');
  assert.equal(m.jump(false, .8), 0, 'sem terceiro salto'); assert.equal(m.jump(false, 1.5), 0);
  m.land(); assert.equal(m.jump(true, 2), 1, 'pouso real devolve os saltos');
  // borda/declive: caiu sem pular → só o aéreo depois da tolerância; dentro da tolerância ainda vale o do chão
  const e = new Mobility2(); e.leaveGround(5); assert.equal(e.jump(false, 5.05), 1); assert.equal(e.jump(false, 5.3), 2); assert.equal(e.jump(false, 5.4), 0);
  const f = new Mobility2(); f.leaveGround(5); assert.equal(f.jump(false, 5.5), 2, 'queda longa: resta só um salto'); assert.equal(f.jump(false, 5.6), 0);
  assert.match(src, /if\(grounded&&heroMob\.airborne\)heroMob\.land\(\);else if\(!grounded&&!heroMob\.airborne\)heroMob\.leaveGround\(combatClock\)/);
});

test('Mod 314: escudo dura no máximo 2,7 s e a recarga de 8 s começa quando ele SOME', () => {
  const s = new EnergyShield(SHIELD_SPECS.hero);
  assert.equal(s.activate(0), true); assert.equal(s.activate(1), false);
  s.update(2.69); assert.equal(s.state, 'active'); s.update(2.7); assert.equal(s.state, 'cooldown'); assert.equal(s.endedAt, 2.7);
  assert.equal(s.canActivate(10.69), false, 'recarga não começou na ativação'); assert.equal(s.canActivate(10.7), true);
  const b = new EnergyShield(SHIELD_SPECS.hero); b.activate(0); b.absorb({ dmg: 60, kind: 'melee' }, 1);
  assert.equal(b.state, 'cooldown'); assert.equal(b.endReason, 'broken'); assert.equal(b.canActivate(8.99), false); assert.equal(b.canActivate(9), true, 'quebra em 1 s → pronto em 9 s');
});

test('Mod 314: golpe extremo rompe na hora e passa o dano INTEGRAL; golpes normais drenam e são mitigados', () => {
  const s = new EnergyShield(SHIELD_SPECS.hero); s.activate(0);
  const n = s.absorb({ dmg: 20, kind: 'melee' }, .2); assert.equal(n.broke, false); assert.equal(n.passed, Math.round(20 * (1 - SHIELD_SPECS.hero.mitigation))); assert.ok(s.hp < SHIELD_SPECS.hero.durability && s.damage > 0);
  const x = s.absorb({ dmg: 80, kind: 'melee' }, .4); assert.equal(x.broke, true); assert.equal(x.passed, 80, 'dano integral'); assert.equal(s.active, false);
  let hp = 100; const body = { invulnerable: () => false, apply: d => { hp -= d; } };
  const t = new EnergyShield(SHIELD_SPECS.hero); t.activate(0); const r = resolveHit({ dmg: 90, kind: 'spiral' }, .1, { shield: t, body }); assert.equal(r.result, 'broke'); assert.equal(hp, 10);
  // i-frames têm prioridade: o escudo não é drenado por quem não acertaria; desativado não absorve nada (sem invulnerabilidade fantasma)
  const u = new EnergyShield(SHIELD_SPECS.hero); u.activate(0); resolveHit({ dmg: 30 }, .1, { shield: u, body: { invulnerable: () => true, apply() {} } }); assert.equal(u.hp, SHIELD_SPECS.hero.durability);
  const v = new EnergyShield(SHIELD_SPECS.hero); assert.equal(v.absorb({ dmg: 30 }, 0).passed, 30);
  assert.match(src, /if\(heroShield\.active\)\{const sh=heroShieldAbsorb\(raw,info\);/);
});

test('Mod 314: magia em área drena por tiques deduplicados — o mesmo total a 30 e a 144 FPS', () => {
  const run = fps => { const s = new EnergyShield(SHIELD_SPECS.hero); s.activate(0); let passed = 0; for (let t = 0; t < 2.6; t += 1 / fps) passed += s.absorb({ dmg: 6, kind: 'area', source: 'juizo-1' }, t).passed; return { hp: s.hp, passed, state: s.state }; };
  const a = run(30), b = run(144); assert.equal(a.hp, b.hp); assert.equal(a.passed, b.passed);
  assert.ok(a.hp > 0, 'tiques limitados não quebram o escudo em um quadro');
  const s = new EnergyShield(SHIELD_SPECS.hero); s.activate(0); s.absorb({ dmg: 6, kind: 'area', source: 'A' }, 0); const k = s.absorb({ dmg: 6, kind: 'area', source: 'B' }, .01); assert.equal(k.ignored, false, 'fontes diferentes contam separado');
});

test('Mod 314: espada + onda acertam o mesmo alvo uma vez por golpe; onda acerta sem toque físico', () => {
  const target = { id: 'e1', x: 0, y: .9, z: 4.2, radius: .45, height: 1.8, alive: true };
  const def = protaMoveDef('ground', 0); assert.ok(def.energy && def.hit === 'hybrid', 'Fenda diagonal agora solta onda');
  for (const blade of [{ base: { x: 0, y: 1.1, z: 3.5 }, tip: { x: 0, y: 1.2, z: 4.4 } }, { base: { x: 0, y: 1.1, z: .4 }, tip: { x: 0, y: 1.2, z: 1.1 } }]) {
    const hits = [];
    const r = new SwordRites({ choreography: true, moveset: (s, m, st) => protaMoveDef(m, st), drive: () => {}, pose: () => blade, hit: (d, id, k) => hits.push([id, k]), blocked: () => false });
    r.attack('prota', { damage: 20, yaw: 0, target, mode: 'ground' });
    for (let i = 0; i < 120; i++) r.update(1 / 60, { valid: true, grounded: true, from: { x: 0, y: 0, z: 0 }, target, sword: 'prota' });
    assert.equal(hits.filter(h => h[0] === 'e1').length, 1, 'um só dano por golpe');
  }
  // alturas: a onda passa a 1,0 m; alvo voando a 4 m não é atingido; alvo no chão à frente sim; atrás nunca
  const e = makeEnergy({ kind: 'wave', roll: .2, radius: 1.2, speed: 20, range: 6, band: .7, life: .4 }, { x: 0, y: 1, z: 0 }, 0, 0);
  for (let i = 0; i < 12; i++) energyStep(e, 1 / 60, null);
  assert.equal(energyTouches(e, { x: 0, y: .9, z: e.travel, radius: .45, height: 1.8 }), true);
  assert.equal(energyTouches(e, { x: 0, y: 4.2, z: e.travel, radius: .45, height: 1.8 }), false);
  assert.equal(energyTouches(e, { x: 0, y: .9, z: -e.travel, radius: .45, height: 1.8 }), false);
  assert.equal(energyTouches(e, { x: 0, y: .9, z: e.travel, radius: .45, height: 1.8 }, () => true), false, 'parede bloqueia');
  for (const m of [...PROTA_MOVES.ground, PROTA_MOVES.run, PROTA_MOVES.dash, PROTA_MOVES.air, PROTA_MOVES.plunge]) assert.ok(m.energy, m.name + ' tem onda');
});

test('Mod 314: VFX com pools fixos — sem crescer, sem vazar, limpos ao cancelar', { skip: !THREE && !process.env.CI && 'three.js indisponível (defina COMBAT_THREE_DIR)' }, () => {
  assert.ok(THREE, 'CI precisa de three.js (COMBAT_THREE_DIR)');
  const scene = new THREE.Scene(), v = createSlashVFX(THREE, scene), cam = new THREE.PerspectiveCamera();
  const count = () => { let n = 0; scene.traverse(() => n++); return n; }, before = count();
  for (let k = 0; k < 200; k++) { for (let i = 0; i < 30; i++) v.sample(k, { x: 0, y: 1, z: 0 }, { x: Math.sin(i * .1), y: 1.2, z: Math.cos(i * .1) }); v.impact({ x: 0, y: 1, z: 0 }, undefined, { power: 1 }); v.update(1 / 60, cam); }
  const st = v.stats(); assert.ok(st.slashes <= st.capacity.slashes && st.sparks <= st.capacity.sparks && st.stars <= st.capacity.stars);
  assert.equal(count(), before, 'nenhum objeto novo na cena durante o combate');
  v.clear(); const c = v.stats(); assert.equal(c.slashes + c.waves + c.sparks + c.stars, 0);
  const sh = createShieldVFX(THREE, scene), s = new EnergyShield(SHIELD_SPECS.demon1); s.activate(0); sh.sync('a', s, { x: 0, y: 0, z: 0 }, 1.85, .1, 'abismo', .1);
  assert.ok(sh.stats().tris < 6000 && sh.stats().visible === 1); sh.release('a'); assert.equal(sh.stats().pool, 0);
});

const wallAt = x => x > 3 && x < 3.6;
function squad(opts = {}) {
  const hits = []; const sq = new Enemy1Squad({ seed: opts.seed || 7, blocked: (x, z) => (opts.wall ? wallAt(x) : false) || Math.abs(x) > 40 || Math.abs(z) > 40, los: (ax, az, bx, bz) => !opts.wall || !((ax < 3.3) !== (bx < 3.3)), damageTarget: (id, d, i) => { hits.push({ id, d, i }); return 'hit'; }, event: opts.event || (() => {}) });
  sq.spawn(opts.spots || [{ x: 0, z: -6, kind: 'common' }]); return { sq, hits };
}
test('Mod 314: Demônio1 luta com garras (clipes reais), sem espada, alcança o alvo e não é invencível', () => {
  assert.ok(E1.demon1.native && !E1.common.native, 'só o Demônio1 ganha o repertório (as outras espécies herdam o tuning base)');
  for (const m of Object.values(DEMON1_MOVES)) assert.ok(['attack', 'attack2', 'combo', 'sweep'].includes(m.role), 'papel de clipe real do Demonio1.glb');
  const ev = [], { sq, hits } = squad({ event: (t, d) => ev.push([t, d && d.kind || d && d.move]) });
  const hero = { id: 'hero', team: 'hero', x: 0, y: 0, z: 0, vx: 0, vz: 0, radius: .45, height: 1.85, alive: true };
  sq.setTargets([hero]);
  for (let i = 0; i < 60 * 25; i++) { sq.update(1 / 60); }
  assert.ok(hits.some(h => h.i.kind === 'melee'), 'as garras acertam');
  assert.ok(ev.some(([t, k]) => t === 'windup' && DEMON1_MOVES[k]), 'golpes nativos de garra');
  const a = sq.actors[0]; for (let i = 0; i < 40 && a.alive; i++) sq.damageActor(a, 30, { x: hero.x, z: hero.z, kind: 'melee' }); assert.equal(a.alive, false, 'morre');
  assert.equal(clawReaches({ x: 0, z: 0, y: 0, yaw: 0 }, { x: 0, z: 2, y: 0, radius: .45 }, { arc: .3 }, 2.3), true);
  assert.equal(clawReaches({ x: 0, z: 0, y: 0, yaw: 0 }, { x: 0, z: -2, y: 0, radius: .45 }, { arc: .3 }, 2.3), false, 'não acerta atrás');
  assert.equal(clawReaches({ x: 0, z: 0, y: 0, yaw: 0 }, { x: 0, z: 2, y: 2.5, radius: .45 }, { arc: .3 }, 2.3), false, 'não acerta alvo no alto');
});
test('Mod 314: IA do Demônio1 — salto duplo + dash aéreo, escudo e dash sem spam, nunca atravessa parede', () => {
  const ev = [], { sq } = squad({ wall: true, spots: [{ x: 0, z: -6, kind: 'common' }, { x: -4, z: -5, kind: 'common' }], event: (t, d) => ev.push(t) });
  const hero = { id: 'hero', team: 'hero', x: 6, y: 0, z: 0, vx: 0, vz: 0, radius: .45, height: 1.85, alive: true, attacking: false, casting: false };
  sq.setTargets([hero]); let maxJ = 0, inWall = 0, t = 0;
  for (let i = 0; i < 60 * 60; i++) {
    t += 1 / 60; hero.x = 6 * Math.cos(t * .4); hero.z = 6 * Math.sin(t * .4); hero.attacking = (i % 150) < 20; hero.casting = (i % 400) > 380;
    sq.update(1 / 60); for (const a of sq.actors) { maxJ = Math.max(maxJ, a.jumps || 0); if (wallAt(a.x)) inWall++; }
  }
  const n = k => ev.filter(e => e === k).length;
  assert.equal(inWall, 0, 'nunca dentro da parede'); assert.ok(maxJ <= 2, 'no máximo 2 saltos');
  assert.ok(n('leap') >= 1 && n('jump') >= 2 && n('airDash') >= 1, 'salto predatório com 2º salto e dash aéreo aconteceu');
  assert.ok(n('leap') <= 60 / DEMON1_LEAP.cd * 2 + 2, 'salto com recarga');
  assert.ok(n('shield') >= 1 && n('shield') <= 2 * (60 / (2.7 + SHIELD_SPECS.demon1.cooldown) + 1), 'escudo sem spam');
  assert.ok(n('dodge') <= 2 * (60 / E1.demon1.dodge.cd + 6), 'dash/esquiva sem spam');
  for (const a of sq.actors) assert.equal(a.airY, 0, 'não flutua eternamente');
});
test('Mod 314: escudo do Demônio1 usa a mesma resolução (mitiga, rompe com golpe extremo)', () => {
  const { sq } = squad(); const a = sq.actors[0]; a.shield.activate(sq.time);
  const hp0 = a.hp, d = sq.damageActor(a, 10, { x: 0, z: 0, kind: 'melee' }); assert.ok(d < 10 && a.shield.active);
  const big = sq.damageActor(a, 60, { x: 0, z: 0, kind: 'melee' }); assert.ok(!a.shield.active && a.shield.endReason === 'broken'); assert.ok(hp0 - a.hp >= 60 + d - 1, 'dano integral ao romper');
});
test('Mod 314: integração real (HUD, teclado, mundo e esquadra)', () => {
  const html = fs.readFileSync(new URL('../mundo-3d-prototype.html', import.meta.url), 'utf8');
  assert.match(html, /<button id="shield" type="button" data-key="G"/);
  assert.match(src, /if\(e\.code==='KeyG'\)\{action\('shield'\);return;\}/);
  assert.match(src, /bindInstantAction\('shield','shield'\)/);
  assert.match(src, /slash:slashVFX,shields:shieldVFX,/);
  assert.match(src, /updateCombat314\(dt\);/);
  const rt = fs.readFileSync(new URL('../enemy1-squad-runtime3d.js', import.meta.url), 'utf8');
  assert.match(rt, /attachDemonClaws\(b\)/); assert.match(rt, /demonSlashes\(b, a\)/);
});
