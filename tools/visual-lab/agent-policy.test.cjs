"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzePixels, decide } = require("./agent-policy.cjs");

function frame(r, g, b, w = 12, h = 8) {
  const result = Buffer.alloc(w * h * 3);
  for (let i = 0; i < w * h; i++) {
    result[i * 3] = r;
    result[i * 3 + 1] = g;
    result[i * 3 + 2] = b;
  }
  return result;
}
const world = (overrides = {}) => ({
  dim: { battle: { active: true }, visible: true, profile: "zarkhael", hp: 90, ...overrides.dim },
  player: { x: 0, y: 0, z: 9, enemy: { x: 0, z: 0, visible: true }, ...overrides.player }
});
const normal = analyzePixels(frame(60, 100, 90), 12, 8);
const whiteout = analyzePixels(frame(255, 255, 255), 12, 8);
const dark = analyzePixels(frame(0, 0, 0), 12, 8);

test("visao: analisa pixels reais, identifica escuro e luz excessiva", () => {
  assert.ok(dark.flags.includes("quadro_escuro"));
  assert.ok(whiteout.flags.includes("brilho_encobrindo_tela"));
  assert.equal(normal.brightness > dark.brightness, true);
});
test("visao: diferenca de frames identifica imagem estavel", () => {
  const a = frame(60, 120, 40);
  assert.ok(analyzePixels(a, 12, 8, a).flags.includes("imagem_quase_estatica"));
  assert.ok(analyzePixels(frame(90, 100, 30), 12, 8, a).change > .04);
});
test("decisao: inicia Hidra, depois Chamas quando Hidra terminou", () => {
  assert.equal(decide({ tick: 0, vision: normal, state: world() }).bossSkill, "s1");
  assert.equal(decide({ tick: 10, vision: normal, state: world(), seen: { s1: true, hydraFinished: true } }).bossSkill, "s2");
  assert.equal(decide({ tick: 10, vision: normal, state: world(), seen: { s1: true, s2: true, hydraFinished: true } }).bossSkill, null);
});
test("decisao: responde aos pixels mudando camera, a vida baixa, e projeteis ativos", () => {
  const s = world({dim:{hp:30,hydra:{phase:"charge"}}});
  const p = decide({ tick: 4, vision: whiteout, state: s, seen: {s1:true} });
  assert.equal(p.heal, true);
  assert.equal(p.camera.distance, 24);
  assert.ok(["a","d"].includes(p.move));
});
test("decisao: luta nao iniciada nao aciona poderes", () => {
  const a = decide({tick:0,vision:normal,state:world({dim:{battle:{active:false}}})});
  assert.equal(a.bossSkill, null);
  assert.equal(a.move, null);
});
test("visao: rejeita buffer invalido", () => {
  assert.throws(() => analyzePixels(Buffer.alloc(2), 10, 10), /invalida/);
});
