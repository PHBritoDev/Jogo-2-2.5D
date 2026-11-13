// Renascimento de Eldória — Fase 1: clima e colisão de rochas (lógica pura + contrato de integração).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { WEATHER, TRANSITIONS, createWeatherDirector, weightsFor, applyWeatherToLight, celestialVisibility } from '../eldoria-weather.js';
import { createLightState, sampleTimeOfDay } from '../eldoria-nostalgic-light.js';
import { rockDomeHeight, rockBlocks, rockSupportAt, rocksBlock, isLowRock } from '../eldoria-rock-collider.js';

const world = fs.readFileSync(new URL('../mundo-3d-prototype.js', import.meta.url), 'utf8');

test('clima: sequência determinística, sem saltos bruscos e sem chuva constante', () => {
  const run = seed => { const d = createWeatherDirector({ seed }); const names = []; let last = { ...d.params }, maxJump = 0;
    for (let i = 0; i < 4 * 3600 * 4; i++) { const hour = (i * .25 * 24 / 960) % 24; d.update(.25, hour, { forest: .5 }); const p = d.params;
      for (const k of ['cover', 'rain', 'fog', 'sun']) maxJump = Math.max(maxJump, Math.abs(p[k] - last[k])); last = { ...p }; if (i % 40 === 0) names.push(d.name); }
    return { names, maxJump }; };
  const a = run(7), b = run(7);
  assert.deepEqual(a.names, b.names, 'mesma semente, mesmo clima');
  assert.ok(a.maxJump < .02, `transição suave por quadro (${a.maxJump.toFixed(4)})`);
  const rainy = a.names.filter(n => ['chuvisco', 'chuva', 'chuva-forte', 'tempestade'].includes(n)).length / a.names.length;
  assert.ok(rainy > .05 && rainy < .45, `chuva ocasional, não constante (${(rainy * 100).toFixed(1)}%)`);
});

test('clima: tempestade só nasce de chuva forte; neblina só de madrugada/amanhecer', () => {
  for (const [from, t] of Object.entries(TRANSITIONS)) if (from !== 'chuva-forte' && from !== 'tempestade') assert.ok(!('tempestade' in t.next), `${from} não salta para tempestade`);
  assert.equal(weightsFor('limpo', 13, {}).neblina, 0);
  assert.ok(weightsFor('limpo', 5.5, { forest: 1 }).neblina > weightsFor('limpo', 5.5, {}).neblina, 'a mata favorece a neblina de vale');
});

test('clima: relâmpago com trovão atrasado pela distância (343 m/s)', () => {
  const d = createWeatherDirector({ seed: 3, state: 'tempestade' });
  const strikes = new Map(); let pairs = 0, t = 0;
  for (let i = 0; i < 20000 && pairs < 5; i++) { t += .05; for (const e of d.update(.05, 23, {})) {
    if (e.type === 'strike') strikes.set(e.dist, t);
    if (e.type === 'thunder') { const t0 = strikes.get(e.dist); assert.ok(t0 !== undefined, 'trovão de um raio conhecido'); assert.ok(Math.abs((t - t0) - e.dist / 343) < .11, 'atraso = distância / velocidade do som'); pairs++; } } }
  assert.ok(pairs >= 3, 'houve raios e trovões');
});

test('clima: céu fechado escurece o sol, aproxima a névoa e a noite de tempestade continua legível', () => {
  const clear = sampleTimeOfDay(14, createLightState()), storm = sampleTimeOfDay(14, createLightState());
  applyWeatherToLight(clear, WEATHER.limpo, 0, 0); applyWeatherToLight(storm, WEATHER.tempestade, 0, 0);
  assert.ok(storm.sunInt < clear.sunInt * .3 && storm.fogFar < clear.fogFar * .5);
  const night = sampleTimeOfDay(23, createLightState()); applyWeatherToLight(night, WEATHER.tempestade, 1, 0);
  assert.ok(night.hemiInt >= .72, 'piso de luz ambiente à noite');
  const flash = sampleTimeOfDay(23, createLightState()); applyWeatherToLight(flash, WEATHER.tempestade, 1, 1);
  assert.ok(flash.hemiInt > night.hemiInt + 1, 'o clarão revela a paisagem');
  assert.ok(celestialVisibility(WEATHER.tempestade) === 0 && celestialVisibility(WEATHER.limpo) === 1, 'sol/lua somem sob céu fechado');
});

test('rochas: pedrinha se pisa, rocha média bloqueia andando, rocha alta não se escala aos poucos', () => {
  const low = { x: 0, z: 0, radius: .5, height: .32, base: 0 }, mid = { x: 0, z: 0, radius: 1.29, height: .95, base: -.12 }, big = { x: 0, z: 0, radius: 4.68, height: 3.74, base: -1.06 };
  assert.ok(isLowRock(low) && !isLowRock(mid));
  // caminhada quadro a quadro com aceleração a partir do zero (o caso que permitia "subir de milímetro em milímetro")
  const walk = (r, steps = 400) => { let x = -r.radius - .5, y = 0, v = 0; for (let i = 0; i < steps; i++) { v = Math.min(.06, v + .004); const nx = x + v;
      if (rockBlocks(r, nx, 0, y, () => 0, x, 0)) { v = 0; continue; } x = nx; const s = rockSupportAt([r], x, 0, y, () => 0); y = Math.max(0, s ? s.y : 0); } return { x, y }; };
  const a = walk(low); assert.ok(a.x > low.radius, 'passa por cima da pedrinha');
  const b = walk(mid); assert.ok(b.x < -mid.radius * .9 && b.y < .05, `para na rocha média (x=${b.x.toFixed(2)}, y=${b.y.toFixed(2)})`);
  const c = walk(big); assert.ok(c.y < .05, 'não escala a rocha grande');
  assert.equal(rockBlocks(mid, -.3, 0, 1.0, () => 0), false, 'com os pés acima do domo (pulo) não há parede');
  assert.equal(rockBlocks(mid, -1.0, 0, 0, () => 0, -.8, 0), false, 'quem ficou dentro sempre consegue sair');
  assert.ok(rocksBlock([low, mid], -1.2, 0, 0, () => 0));
  assert.ok(Math.abs(rockDomeHeight(mid, 0, 0) - .83) < 1e-9);
});

test('integração: herói usa domos de rocha, água funda explícita, clima no ciclo e vento pelo clima', () => {
  assert.match(world, /function playerBlockedAt\(x,z\)\{\n if\(!voidMode&&!bridgeDeck\(x,z\)\)\{const w=terrain3D\.waterDepth\(x,z\);if\(w>=PLAYER_WADE_MAX&&[\s\S]{0,400}?\n if\(blockedAt\(x,z,!voidMode\)\)return true;/);
  assert.match(world, /rocksBlock\(rockObstacles,x,z,player\.position\.y,terrainHeightAt,player\.position\.x,player\.position\.z\)/);
  assert.match(world, /function dashBlockedAt\(x,z\)\{\n if\(blockedAt\(x,z,!voidMode\)\)return true;\n if\(!voidMode&&rocksBlock/);
  assert.match(world, /rockSupportAt\(rockObstacles,player\.position\.x,player\.position\.z/);
  assert.match(world, /const PLAYER_WADE_MAX=1\.25;/, 'mesma profundidade do contrato water-wade (margens até 1,25 m atravessáveis)');
  assert.match(world, /applyWeatherToLight\(L,Wp,p,wFlash\)/);
  assert.match(world, /gameClock\.hour=\(gameClock\.hour\+dt\*24\/GAME_DAY_SECONDS\)%24;updateWeather\(dt\);/);
  assert.match(world, /forestWindUniforms\)uniform\.value=weatherWindPhase;/);
  assert.match(world, /for\(const c of movingClouds\)c\.group\.visible=false;/);
  // NPCs/câmera/IA mantêm o teste antigo de rochas (sem mudança de comportamento)
  assert.match(world, /if\(!skipRocks\)for\(const rock of rockObstacles\)\{if\(rock\.height<=\.68\)continue;/);
});
