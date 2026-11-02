import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createPortalSwords, PORTAL_SWORDS } from './vorgazhek-portal-swords3d.js';
import { KITS, kitFor, pickMove } from './powers3d.js';
import { ultimateFor, ultimateDue } from './ultimates3d.js';

const rng = s => () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
const ARENA = { x: 800, z: 0, r: 30 }, ground = (x, z) => -2000 + .15 * Math.sin(x * .3) + .1 * Math.cos(z * .2);
/** Roda a skill inteira. move(hero, t, dt) muda o herói; devolve registro detalhado. */
function run(seed, move = () => {}, o = {}) {
  const hero = { x: 800, z: 6, y: undefined, vx: 0, vz: 0, iframes: false }, boss = { x: 800, z: -6 };
  const ps = createPortalSwords({ rand: rng(seed), ground, ...o }).start(hero, boss, ARENA);
  const log = { fires: [], hits: [], impacts: [], draws: [], closes: [], end: null, maxArmedPerPortal: 0, maxFly: 0, tipFirst: true, frozen: true, layout: ps.st.portals.map(p => ({ ...p })) };
  const dt = 1 / 60; let t = 0;
  for (let i = 0; i < 60 * 30 && !ps.done; i++) {
    t = i * dt; move(hero, t, dt); hero.y = ground(hero.x, hero.z);
    const flyBefore = new Map(ps.st.swords.filter(s => s.state === 'fly').map(s => [s, [s.vx, s.vy, s.vz]]));
    const ev = ps.step(dt, hero);
    for (const [s, v] of flyBefore) if (s.vx !== v[0] || s.vy !== v[1] || s.vz !== v[2]) log.frozen = false; // rumo travado depois do lançamento
    const per = new Map(); for (const s of ps.st.swords) if (s.state === 'draw' || s.state === 'ready' || s.state === 'fly') per.set(s.portal, (per.get(s.portal) || 0) + 1);
    for (const v of per.values()) log.maxArmedPerPortal = Math.max(log.maxArmedPerPortal, v);
    log.maxFly = Math.max(log.maxFly, ps.st.swords.filter(s => s.state === 'fly').length);
    for (const s of ps.st.swords) if (s.state === 'draw' && s.draw > .1 && s.draw < .9) { const p = ps.st.portals[s.portal], side = (x, y, z) => (x - p.x) * p.nx + (y - p.y) * p.ny + (z - p.z) * p.nz;
      const tip = side(s.x + s.dx * PORTAL_SWORDS.len, s.y + s.dy * PORTAL_SWORDS.len, s.z + s.dz * PORTAL_SWORDS.len), base = side(s.x, s.y, s.z); if (!(tip > 0 && base < 0)) log.tipFirst = false; }
    for (const e of ev) { e.t = t; if (e.type === 'fire') log.fires.push(e); else if (e.type === 'hit') log.hits.push(e); else if (e.type === 'impact') log.impacts.push(e); else if (e.type === 'draw') log.draws.push(e); else if (e.type === 'close') log.closes.push(e); else if (e.type === 'end') log.end = e; }
  }
  log.ps = ps; log.t = t; return log;
}
const circle = (R, w) => (h, t) => { const a = t * w; h.x = 800 + Math.cos(a) * R; h.z = Math.sin(a) * R; h.vx = -Math.sin(a) * R * w; h.vz = Math.cos(a) * R * w; };

test('Mod 260 — 20–24 portais no alto (6–14 m), em camadas, distribuídos e dentro da arena', () => {
  for (const seed of [1, 7, 42, 99, 1234]) {
    const { layout } = run(seed, () => {}, {});
    assert.ok(layout.length >= 20 && layout.length <= 24, 'quantidade ' + layout.length);
    const hs = layout.map(p => p.y - ground(p.x, p.z)); assert.ok(hs.every(h => h >= 6 && h <= 14), 'alturas ' + hs.map(h => h.toFixed(1)));
    assert.ok(new Set(layout.map(p => p.layer)).size === 3, 'três camadas de altura');
    for (const p of layout) assert.ok(Math.hypot(p.x - ARENA.x, p.z - ARENA.z) <= ARENA.r - 2.9, 'dentro da arena');
    for (let i = 0; i < layout.length; i++) for (let j = i + 1; j < layout.length; j++) { const a = layout[i], b = layout[j]; assert.ok(Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) >= 2.8, 'portais não se atravessam'); }
    // em volta: atrás do bispo (z<-6), atrás do herói (z>6), e dos dois lados
    assert.ok(layout.some(p => p.z < -7) && layout.some(p => p.z > 7) && layout.some(p => p.x < 796) && layout.some(p => p.x > 804), 'distribuídos à volta, não um anel plano');
    for (const p of layout) assert.ok(p.ny < 0 && Math.abs(Math.hypot(p.nx, p.ny, p.nz) - 1) < 1e-6, 'olha para baixo, para a arena');
  }
});

test('Mod 260 — exatamente 3 espadas por portal (60–72), fila global sequencial, nunca 2 armadas no mesmo portal', () => {
  for (const seed of [3, 11, 77]) {
    const L = run(seed);
    const n = L.layout.length; assert.equal(L.fires.length, n * 3); assert.ok(L.fires.length >= 60 && L.fires.length <= 72);
    assert.ok(L.ps.st.portals.every(p => p.fired === 3), 'cada portal fez 3 e nenhum fez a 4ª');
    const per = {}; for (const f of L.fires) per[f.i] = (per[f.i] || 0) + 1; assert.ok(Object.values(per).every(v => v === 3));
    for (let i = 1; i < L.fires.length; i++) assert.ok(L.fires[i].t - L.fires[i - 1].t >= .09 - 1e-6, 'uma espada por vez (cadência ≥ 0,09 s)');
    assert.ok(L.maxArmedPerPortal <= 1, 'nunca duas espadas armadas no mesmo portal');
    assert.ok(L.maxFly <= 8, 'no máximo 8 espadas em voo: ' + L.maxFly);
    // a ordem alterna: lançamentos consecutivos vêm de portais diferentes e não da mesma camada sempre
    let same = 0; for (let i = 1; i < 24; i++) if (L.fires[i].i === L.fires[i - 1].i) same++; assert.equal(same, 0);
    // a próxima espada do mesmo portal só nasce depois que a anterior se resolveu
    for (const p of L.ps.st.portals) { const fs2 = L.fires.filter(f => f.i === p.i), ds = L.draws.filter(d => d.i === p.i), imp = L.impacts.filter(e => e.i === p.i);
      assert.equal(ds.length, 3); for (let k = 1; k < 3; k++) assert.ok(ds[k].t > fs2[k - 1].t, 'recarga só depois do disparo anterior'); assert.ok(imp.length <= 3); }
    assert.equal(L.closes.length, n, 'todos os portais fecham depois da 3ª'); assert.ok(L.end && L.end.fired === n * 3);
    assert.ok(L.t > 6 && L.t < 16, 'duração razoável: ' + L.t.toFixed(1));
  }
});

test('Mod 260 — a espada atravessa o portal com a PONTA primeiro; mira travada no lançamento', () => {
  const L = run(5, circle(7, .7)); assert.ok(L.tipFirst, 'ponta à frente do plano do portal e corpo atrás durante a extração'); assert.ok(L.frozen, 'rumo não muda depois do lançamento');
  // a mira é a previsão limitada do herói, não teleguiada
  const ps = createPortalSwords({ rand: rng(2), ground }).start({ x: 800, z: 6 }, { x: 800, z: -6 }, ARENA); const h = { x: 800, z: 6, vx: 6, vz: 0 };
  let s = null; for (let i = 0; i < 600 && !s; i++) { ps.step(1 / 60, h); s = ps.st.swords.find(o => o.state === 'fly'); }
  assert.ok(s && s.target); const lead = Math.hypot(s.target.x - h.x, s.target.z - h.z); assert.ok(lead <= PORTAL_SWORDS.leadCap + 1e-6 && lead > .3, 'antecipação curta e limitada: ' + lead.toFixed(2));
});

test('Mod 260 — dano: parado é punido, correndo e com dash dá para escapar; um acerto por espada, sem empilhar', () => {
  const still = run(8), runL = run(8, circle(9, 1.1)), dash = run(8, () => {}, {}); // dash = i-frames o tempo todo
  const dashL = (() => { const hero = { x: 800, z: 6, vx: 0, vz: 0, iframes: true }; const ps = createPortalSwords({ rand: rng(8), ground }).start(hero, { x: 800, z: -6 }, ARENA); let hits = 0; while (!ps.done) for (const e of ps.step(1 / 60, hero)) if (e.type === 'hit') hits++; return hits; })();
  assert.ok(still.hits.length >= 8, 'parado: ' + still.hits.length); assert.ok(runL.hits.length < still.hits.length / 2, 'correndo: ' + runL.hits.length + ' vs ' + still.hits.length); assert.equal(dashL, 0, 'i-frames ignoram todas');
  for (let i = 1; i < still.hits.length; i++) assert.ok(still.hits[i].t - still.hits[i - 1].t >= PORTAL_SWORDS.minHitGap - 1e-6, 'sem acertos empilhados no mesmo instante');
  const dmg = still.hits.reduce((a, e) => a + e.dmg, 0); assert.ok(dmg < 100, 'parado não morre de uma vez (' + dmg + ')');
  const heroImp = still.impacts.filter(e => e.kind === 'hero'); assert.ok(heroImp.length >= still.hits.length && heroImp.length <= still.fires.length, 'um impacto por espada');
  void dash;
});

test('Mod 260 — impacto no chão e no herói ancorado no ponto real; colisão por segmento sem atravessar', () => {
  const L = run(13, circle(8, .9)); const g = L.impacts.filter(e => e.kind === 'ground'), h = run(13).impacts.filter(e => e.kind === 'hero');
  assert.ok(g.length > 10 && h.length > 5); for (const e of g) assert.ok(Math.abs(e.y - ground(e.x, e.z)) < .05, 'impacto no chão real');
  // espada rápida contra um herói fino: o segmento pega mesmo com passo grande
  const ps = createPortalSwords({ rand: rng(4), ground, T: { speed: 120 } }).start({ x: 800, z: 6 }, { x: 800, z: -6 }, ARENA); const hero = { x: 800, z: 6, vx: 0, vz: 0 }; let hit = 0, tun = 0;
  while (!ps.done) for (const e of ps.step(1 / 20, hero)) { if (e.type === 'impact' && e.kind === 'hero') hit++; if (e.type === 'impact' && e.kind === 'ground' && Math.hypot(e.x - 800, e.z - 6) < .3) tun++; }
  assert.ok(hit > 20 && tun === 0, 'sem túnel: ' + hit + '/' + tun);
});

test('Mod 260 — rastros terminam e nada sobra; interrupção limpa sem dano', () => {
  const L = run(21); assert.ok(L.ps.done && L.ps.st.swords.length === 0 && L.ps.st.portals.every(p => p.state === 'gone'));
  const ps = createPortalSwords({ rand: rng(21), ground }).start({ x: 800, z: 6 }, { x: 800, z: -6 }, ARENA); const hero = { x: 800, z: 6, vx: 0, vz: 0 };
  for (let i = 0; i < 60 * 2.5; i++) ps.step(1 / 60, hero); const firedAtAbort = ps.st.fired; ps.abort(); let hits = 0, fires = 0;
  for (let i = 0; i < 60 * 2 && !ps.done; i++) for (const e of ps.step(1 / 60, hero)) { if (e.type === 'hit') hits++; if (e.type === 'fire') fires++; }
  assert.equal(hits, 0); assert.equal(fires, 0); assert.ok(ps.done && ps.st.swords.length === 0 && firedAtAbort > 0);
});

test('Mod 260/261 — kit do Bispo 2: s1 (tornados), s3 (portais) e espada (Eclipse, Mod 261); s2/ultimate reservados; outros perfis intactos', () => {
  const k = kitFor('vorgazhek'); assert.equal(k, kitFor('fallen2'));
  assert.equal(k.skills[0].type, 'tornadoes'); assert.equal(k.skills[2].type, 'portal_swords'); assert.equal(k.skills[2].name, 'DOMÍNIO DAS LÂMINAS ENDIVIDADAS');
  assert.ok(k.skills[1].disabled); assert.equal(k.ult.type, 'vorgazhek_cosmic_judgment'); assert.equal(k.sword.type, 'vorgazhek_eclipse_sword'); // MOD 261 ativou só o slot da espada
  const names = JSON.stringify(k); for (const old of ['Lâminas de Metal Líquido', 'Golpe da Forja', 'FORNALHA DA DÍVIDA', 'Explosões da Forja', "'forge'"]) assert.ok(!names.includes(old), 'removido: ' + old);
  const seen = new Set(); for (const prof of ['vorgazhek', 'fallen2']) for (const d of [1, 2, 4, 6, 10, 15]) for (const cds of [{ sw: 9 }, { sw: 9, s1: 5 }, { sw: 9, s3: 5 }, { sw: 9, s1: 5, s3: 5 }]) { const m = pickMove(prof, cds, d, ''); if (m) seen.add(m.id); }
  assert.deepEqual([...seen].sort(), ['s1', 's3']); // com a espada em recarga, só as duas magias
  assert.equal(ultimateFor('vorgazhek').kind, 'vorgazhek_cosmic_judgment'); assert.equal(ultimateFor('fallen2').kind, 'vorgazhek_cosmic_judgment'); assert.equal(ultimateDue('vorgazhek', .9, 0), -1); // MOD 262
  for (const p of ['vhazrael', 'zarkhael', 'greed3', 'fallen1', 'fallen3']) { assert.ok(ultimateFor(p), 'ultimate de ' + p); assert.ok(pickMove(p, {}, 4, ''), 'kit de ' + p); }
  assert.equal(KITS.vhazrael.sword.disabled, undefined);
  const src = fs.readFileSync(new URL('./mundo-3d-prototype.js', import.meta.url), 'utf8');
  assert.ok(src.includes("case 'portal_swords':startPortalSwords(m);break;") && src.includes('updatePortalSwords(dt);') && src.includes('stopPortalSwords();stopTornadoRitual();useRig'), 'ligado ao motor real e limpo ao sair');
  assert.ok(!src.includes('BOSS_POWERS.vorgazhek') && !src.includes('BOSS_POWERS.fallen2') && !src.includes("kind==='forge'"), 'sem rota secundária antiga');
  assert.ok(src.includes('if(portalSwords||tornadoRitual||eclipseSword)return;') && src.includes('if(tornadoRitual||portalSwords||eclipseSword){kitState.t'), 'não empilha com os Vórtices e o bispo espera');
});
