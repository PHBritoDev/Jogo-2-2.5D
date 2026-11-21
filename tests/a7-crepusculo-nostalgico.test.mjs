/**
 * A7 — crepúsculo nostálgico: o pôr não cai de laranja chapado para azul-cinza num salto,
 * e as nuvens da hora dourada ganham barriga âmbar / topo malva sem luz extra nem segundo disco.
 * Referência do criador (16/11/2026): fotos de entardecer (horizonte coral, zênite malva, nuvens em volume).
 * Não cobre aurora (Mod 326) nem o interior do vulcão.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { TOD_KEYS, sampleTimeOfDay, createLightState } from '../eldoria-nostalgic-light.js';
import { goldenFactor, auroraLevel } from '../ceu-atmosfera3d.js';

const warmth = c => c[0] - c[2];
const sky = fs.readFileSync(new URL('../ceu-atmosfera3d.js', import.meta.url), 'utf8');
const weather = fs.readFileSync(new URL('../eldoria-weather3d.js', import.meta.url), 'utf8');

test('crepúsculo: horizonte continua coral enquanto o zênite já é mais frio, sem salto de sol', () => {
  for (let i = 1; i < TOD_KEYS.length; i++) assert.ok(TOD_KEYS[i].h > TOD_KEYS[i - 1].h);
  assert.ok(TOD_KEYS.some(k => k.h === 18.95), 'chave de crepúsculo entre o pôr e a noite');
  const late = sampleTimeOfDay(18.4, createLightState());
  assert.ok(late.elev > 0, '18h24 o sol ainda está acima do horizonte');
  assert.ok(warmth(late.skyH) > 0.45, 'horizonte quente: ' + warmth(late.skyH).toFixed(3));
  assert.ok(warmth(late.skyZ) < 0.05, 'zênite não acompanha o laranja do horizonte');
  assert.ok(warmth(late.skyH) > warmth(late.skyZ) + 0.35, 'separação horizonte/zênite');
  const shelf = sampleTimeOfDay(18.95, createLightState());
  assert.ok(shelf.elev < 0 && warmth(shelf.sun) > 0.35, 'sol já baixo ainda âmbar, não luar azul');
  assert.ok(warmth(shelf.skyH) > 0.25, 'horizonte ainda coral no fim do crepúsculo');
  const night = sampleTimeOfDay(23, createLightState());
  assert.ok(warmth(night.sun) < 0, 'noite continua luar frio');
  let prev = sampleTimeOfDay(0, createLightState()).sunInt;
  for (let h = 0.05; h < 24; h += 0.05) {
    const s = sampleTimeOfDay(h, createLightState()).sunInt;
    assert.ok(Math.abs(s - prev) < 0.08, 'salto de luz às ' + h.toFixed(2));
    prev = s;
  }
});

test('hora dourada e aurora noturna não mudam de regra', () => {
  assert.equal(goldenFactor(50), 0);
  assert.ok(goldenFactor(3) > 0.9);
  assert.equal(goldenFactor(-20), 0);
  assert.equal(auroraLevel(0, 1), 0);
  assert.ok(auroraLevel(1, 1) > 0.99);
  assert.equal(auroraLevel(1, 0), 0);
});

test('nuvens: volume no mesmo draw; céu não ganha disco nem luz', () => {
  assert.match(weather, /float belly = thick/);
  assert.match(weather, /float crown = \(1\. - thick\)/);
  assert.match(weather, /Math\.max\(W\.cover, \.5 \* gold\)/);
  assert.doesNotMatch(weather, /new THREE\.PointLight|new THREE\.SpotLight/);
  assert.match(sky, /coroa ZENITAL/);
  assert.match(sky, /vec2 q = d\.xz \/ d\.y/);
  assert.match(sky, /for \(int i = 0; i < 2; i\+\+\)/);
  assert.match(sky, /float win = \.3 \+ \.7 \*/);
  assert.match(sky, /sem segundo disco/);
  assert.equal((sky.match(/new THREE\.SphereGeometry/g) || []).length, 1, 'a atmosfera continua uma esfera só');
  assert.doesNotMatch(sky, /PointLight|SpotLight/);
});
