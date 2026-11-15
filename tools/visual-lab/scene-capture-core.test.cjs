"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const core = require("./scene-capture-core.cjs"), { judgeCapture, parseShots } = require("./photographer.cjs");
const img = (w, h, fn) => { const b = new Uint8Array(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const [r, g, bl] = fn(x, y), i = (y * w + x) * 4; b[i] = r; b[i + 1] = g; b[i + 2] = bl; b[i + 3] = 255; } return b; };
const W = 96, H = 48, cls = buf => core.classifyFrame(core.pixelStats(buf, W, H));

test("classifica preto, branco e uniforme como suspeita e cena variada como ok", () => {
  assert.match(cls(img(W, H, () => [0, 0, 0])).reason, /preto/);
  assert.match(cls(img(W, H, () => [255, 255, 255])).reason, /branco/);
  assert.match(cls(img(W, H, () => [90, 110, 120])).reason, /uniforme/);
  const scene = cls(img(W, H, (x, y) => [40 + x, 60 + y * 2, 90 + ((x * y) % 50)]));
  assert.equal(scene.status, "ok"); assert.match(scene.reason, /não semântico/);
});
test("cena escura legítima vira suspeita sem insistir; preto repete até o limite e para", () => {
  const dark = cls(img(W, H, (x, y) => [3 + (x % 20) * 2, 4 + (y % 18) * 1.6, 8 + ((x + y) % 22)]));
  assert.equal(dark.status, "suspeita"); assert.equal(core.shouldRetry(dark, 0), false);
  const black = cls(img(W, H, () => [0, 0, 0]));
  assert.equal(core.shouldRetry(black, 0, 5), true); assert.equal(core.shouldRetry(black, 4, 5), false, "sem laço infinito");
  assert.equal(core.shouldRetry({ status: "ok", reason: "" }, 0), false);
});
test("assinatura detecta quadros quase idênticos e distingue cenas diferentes", () => {
  const a = img(W, H, (x, y) => [x * 2, y * 4, 80]), b = img(W, H, (x, y) => [x * 2 + 1, y * 4, 80]), c = img(W, H, (x, y) => [200 - x, 30, y * 5]);
  assert.ok(core.signatureDistance(core.signature(a, W, H), core.signature(b, W, H)) < 1.5);
  assert.ok(core.signatureDistance(core.signature(a, W, H), core.signature(c, W, H)) > 20);
  assert.equal(core.signatureDistance(null, [1]), Infinity);
});
test("cenas reutilizáveis: vila, floresta, mundo, caverna (só leitura) e NPCs; pedido inválido explica as opções", () => {
  const all = core.validateRequest(Object.keys(core.SCENES));
  const kinds = new Set(all.map(s => s.kind)); for (const k of ["mundo", "caverna", "npc"]) assert.ok(kinds.has(k));
  for (const s of all) for (const t of s.shots) assert.ok(["camera-do-jogo", "camera-do-jogo-caverna", "camera-livre-qa", "close-up-npc"].includes(t.mode));
  assert.ok(all.some(s => s.id.startsWith("floresta")) && all.some(s => s.id.startsWith("vila")));
  assert.equal(core.validateRequest([{ scene: "caverna-salao", video: true }])[0].video, true);
  assert.throws(() => core.validateRequest(["bispo-3"]), /disponíveis: .*caverna-salao/);
  assert.throws(() => core.validateShot({ name: "x" }), /at, cave, fly ou npc/);
  assert.throws(() => core.validateRequest(Array(9).fill("vila-praca")), /1 a 8/);
});
test("índice e relatório separam observado de inferido e apontam cada arquivo", () => {
  const shots = [{ scene: "vila-praca", name: "a", file: "vila-praca/01-a.png", status: "ok", reason: "r", attempts: 1, pixels: { mean: 90, stdev: 30 }, stateSummary: "jogador 1,2,3" },
    { scene: "caverna-salao", name: "b", file: "caverna-salao/01-b.png", status: "suspeita", reason: "quase todo preto", attempts: 5, pixels: { mean: 2, stdev: 1 } }];
  const sum = core.summarize(shots, null); assert.deepEqual([sum.status, sum.exitCode, sum.counts.suspeita], ["suspeita", 0, 1]);
  assert.equal(core.summarize([{ status: "falha" }], null).exitCode, 1); assert.equal(core.summarize([], "browser").status, "falha");
  const { html, md } = core.buildIndex({ commit: "abc1234", build: "modX", viewport: { width: 852, height: 393 }, renderer: "SwiftShader", startedAt: "t", shots, videos: [{ scene: "caverna-salao", file: "videos/caverna-salao.webm", format: "webm", bytes: 9999 }], pageErrors: [], failedRequests: [], ...sum });
  for (const f of ["vila-praca/01-a.png", "caverna-salao/01-b.png", "videos/caverna-salao.webm"]) { assert.ok(html.includes(f)); assert.ok(md.includes(f)); }
  assert.match(md, /Inferido = nenhum/); assert.match(html, /não reconhece objetos/); assert.match(html, /class="suspeita"/);
});
test("regressão do fotógrafo: quadro preto ou duplicado não aborta o lote (vira suspeita)", () => {
  assert.doesNotThrow(() => judgeCapture({ spread: 0.5, hash: "a", seen: new Set(), cameraError: 0 }));
  assert.equal(judgeCapture({ spread: 0.5, hash: "a", seen: new Set(), cameraError: 0 }).status, "suspeita");
  assert.match(judgeCapture({ spread: 30, hash: "a", seen: new Set(["a"]), cameraError: 0 }).reason, /identica/);
  assert.match(judgeCapture({ spread: 30, hash: "b", seen: new Set(["a"]), cameraError: 5 }).reason, /sobrescrita/);
  assert.equal(judgeCapture({ spread: 30, hash: "b", seen: new Set(["a"]), cameraError: 0 }).status, "ok");
  const floresta = parseShots('[{"preset":"floresta"}]')[0]; assert.deepEqual([floresta.x, floresta.z], [-36, -126], "preset da floresta na Clareira do Musgo real");
});
test("camView: sonda de enquadramento só de leitura dentro da API de debug, ignorando o próprio herói", () => {
  const src = require("node:fs").readFileSync(require("node:path").join(__dirname, "../../mundo-3d-prototype.js"), "utf8");
  const i = src.indexOf(" camView(to){"); assert.ok(i > 0 && src.lastIndexOf("cam(){return camera.position", i) > 0, "ao lado de cam() na SevenSinsDebug3D");
  const body = src.slice(i, src.indexOf("},\n", i));
  assert.match(body, /player\.traverse\(o=>mine\.add\(o\)\)/); assert.match(body, /traverseVisible/); assert.match(body, /L-\(to\?\.3:1\.25\)/);
  assert.doesNotMatch(body, /camera\.position\.set|player\.position\.set|cameraYaw=|debugCameraOverride=/, "não move câmera nem herói");
});
