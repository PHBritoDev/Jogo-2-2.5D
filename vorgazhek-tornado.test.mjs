import test from 'node:test';
import assert from 'node:assert/strict';
import { createTornadoRitual, TORNADO } from './vorgazhek-tornado3d.js';
import { KITS } from './powers3d.js';
import fs from 'node:fs';

const rng = s => () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
function run(seed, move = () => {}, o = {}) {
  const r = createTornadoRitual({ rand: rng(seed), dmg: 8, ...o }), p = { x: 0, z: 0, iframes: false, radius: .4 }; r.start(p);
  const log = { waves: [], hits: [], counts: [], layouts: [], states: new Set(), end: null }; let t = 0, prevWave = 0;
  for (let i = 0; i < 60 * 20 && !r.done; i++) { t = i / 60; move(p, t); const ev = r.step(1 / 60, p);
    for (const o2 of r.st.tornados) log.states.add(o2.state);
    if (r.st.wave !== prevWave && r.st.tornados.length) { prevWave = r.st.wave; log.layouts.push(r.st.tornados.map(o2 => [o2.x, o2.z])); }
    for (const e of ev) { if (e.type === 'wave') { log.waves.push(t); log.counts.push(e.count); } if (e.type === 'hit') log.hits.push(t); if (e.type === 'end') log.end = t; } }
  return { r, log };
}

test('Mod 256 — Vórtices do Pacto Escarlate: exatamente 2 ondas de 5 tornados, posições novas só entre ondas, fim limpo', () => {
  for (const seed of [1, 2, 3, 7, 11, 19]) {
    const { r, log } = run(seed, (p, t) => { p.x = Math.cos(t * .5) * 6; p.z = Math.sin(t * .5) * 6; });
    assert.equal(log.waves.length, 2, 'duas ondas'); for (const c of log.counts) assert.ok(c === 5, 'contagem ' + c);
    assert.ok(log.layouts[0].some(([x, z], i) => Math.hypot(x - log.layouts[1][i]?.[0], z - log.layouts[1][i]?.[1]) > .5), 'segunda onda em posições novas');
    assert.ok(log.end !== null && r.done && r.st.tornados.length === 0, 'termina e limpa');
    assert.ok(log.waves[1] - log.waves[0] >= TORNADO.form + TORNADO.hold + TORNADO.dissolve, 'a onda 2 só começa depois que todos os da onda 1 sumiram');
    for (const s of ['seal', 'form', 'hold', 'dissolve', 'gone']) assert.ok(log.states.has(s), 'estado ' + s);
  }
});

test('Mod 256 — tempos: 1,3 s de formação, 1,3 s cheio; dano só com tamanho relevante, tique sem acumular, i-frames', () => {
  const r = createTornadoRitual({ rand: rng(5), dmg: 8 }); const p = { x: 0, z: 0, iframes: false, radius: .4 }; r.start(p);
  let formT = null, holdT = null, disT = null, t = 0, firstActive = null;
  for (let i = 0; i < 60 * 8; i++) { t = i / 60; const ev = r.step(1 / 60, p); const o = r.st.tornados[0]; if (!o) continue;
    if (o.state === 'form' && formT === null) formT = t; if (o.state === 'hold' && holdT === null) holdT = t; if (o.state === 'dissolve' && disT === null) disT = t;
    for (const e of ev) if (e.type === 'active' && firstActive === null) firstActive = t; }
  assert.ok(Math.abs(holdT - formT - 1.3) < .05, 'formação ' + (holdT - formT)); assert.ok(Math.abs(disT - holdT - 1.3) < .05, 'plenitude ' + (disT - holdT));
  assert.ok(firstActive - formT > .45, 'perigo só depois de ~40% da formação');
  // parado sobre todos os tornados ao mesmo tempo: tiques espaçados, nunca vários no mesmo quadro
  const { log } = run(3, (pl) => { pl.x = 0; pl.z = 0; }, { T: { near: [0, .1], ring: [.2, .4] } });
  for (let i = 1; i < log.hits.length; i++) assert.ok(log.hits[i] - log.hits[i - 1] >= TORNADO.tick - 1e-6, 'tique espaçado');
  assert.ok(log.hits.length >= 2 && log.hits.length <= 14);
  const dash = run(3, (pl) => { pl.x = 0; pl.z = 0; pl.iframes = true; }, { T: { near: [0, .1], ring: [.2, .4] } }); assert.equal(dash.log.hits.length, 0, 'i-frames do dash');
  const flee = run(4, (pl, tt) => { pl.x = tt * 5.5; }); assert.ok(flee.log.hits.length <= 1, 'correndo dá para escapar: ' + flee.log.hits.length);
});

test('Mod 256 — interrupção sistêmica (morte, saída) desfaz sem dano nem nova onda; kit e integração', () => {
  const r = createTornadoRitual({ rand: rng(9), dmg: 8 }); const p = { x: 0, z: 0, iframes: false, radius: .4 }; r.start(p);
  for (let i = 0; i < 60 * 2; i++) r.step(1 / 60, p); r.abort(); let hits = 0, waves = 0;
  for (let i = 0; i < 60 * 3; i++) for (const e of r.step(1 / 60, p)) { if (e.type === 'hit') hits++; if (e.type === 'wave') waves++; }
  assert.equal(hits, 0); assert.equal(waves, 0); assert.ok(r.done && !r.st.tornados.length);
  assert.equal(KITS.vorgazhek.skills[0].type, 'tornadoes'); assert.equal(KITS.vorgazhek.skills[0].name, 'Vórtices do Pacto Escarlate');
  const src = fs.readFileSync(new URL('./mundo-3d-prototype.js', import.meta.url), 'utf8');
  assert.ok(src.includes("case 'tornadoes':startTornadoRitual(m);break;") && src.includes('stopTornadoRitual();useRig'), 'ligado ao motor real do Bispo 2 e limpo ao sair da dimensão');
  assert.ok(src.includes("test:!!opts.test") && src.includes('if(!b.test)registerEnemyDefeat(b.profile)') && src.includes("if(b.test){showCombatCallout('DERROTA — TESTE"), 'modo teste não toca progresso');
  assert.ok(src.includes('const localStorage=DIM_TEST?isolatedSwordStorage(window.localStorage,true)'), 'armazenamento isolado no teste');
  assert.ok(fs.existsSync(new URL('./vorgazhek-selo-ritual.png', import.meta.url)), 'textura do selo versionada');
  const lab = fs.readFileSync(new URL('./laboratorio-inimigos.html', import.meta.url), 'utf8'); assert.ok(lab.includes("testeDimensao='+k") && lab.includes('Dimensão de VHAZRAEL') && lab.includes('Dimensão de VORGAZHEK'));
});
