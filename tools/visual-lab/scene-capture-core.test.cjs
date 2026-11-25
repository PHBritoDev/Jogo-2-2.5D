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
test("floresta-percurso contorna a árvore colossal pelo corredor oeste antes de chegar à abertura sul", async () => {
  const scene = core.validateRequest(["floresta-percurso"])[0];
  assert.deepEqual(scene.shots[0].at, [-14, -82, 0], "começa no campo exterior");
  assert.deepEqual(scene.shots.map(s => s.name), ["campo-inicio", "vau-lago-camera"]);
  assert.deepEqual(scene.shots[1].at, [-28.815, -94.586, 0], "repete a posição de água observada no artifact A4");
  assert.equal(scene.shots[1].pitch, 0); assert.equal(scene.shots[1].dist, 6);
  assert.deepEqual(scene.walk.start, [-14, -82, 0], "a caminhada retorna ao campo depois da tomada do vau");
  assert.deepEqual(scene.walk.segments.map(s => s.name), ["bosque-entrada", "contorno-arvore-oeste", "vila-praca-entrada"]);
  assert.deepEqual(scene.walk.segments.map(s => s.target), [[-14, -105], [-20.5, -76], [-13, -49.5]]);
  assert.deepEqual(scene.walk.segments.map(s => s.timeoutMs), [100000,120000,180000]);
  assert.deepEqual(scene.walk.segments.map(s => [s.key,s.minTravel,s.tolerance]), [['KeyW',18,2.5],['KeyW',24,1],['KeyW',26,3]]);
  assert.equal(scene.walk.captureQuality, "low", "movimento usa perfil baixo para reduzir o custo do SwiftShader");
  const [{ELDORIA_CENTER}, {ELDORIA_MAIN_TREE}, {ELDORIA_PROPS}] = await Promise.all([
    import("../../act1-world-layout.js"), import("../../eldoria-city-layout.js"), import("../../eldoria-live-village3d.js")
  ]);
  const treeProp = ELDORIA_PROPS.find(p => p[0] === ELDORIA_MAIN_TREE.file && p[1] === ELDORIA_MAIN_TREE.x && p[2] === ELDORIA_MAIN_TREE.z);
  assert.ok(treeProp && Number.isFinite(treeProp[5]), "a árvore colossal precisa expor seu colisor real");
  const mainTree = {x:ELDORIA_CENTER.x+ELDORIA_MAIN_TREE.x,z:ELDORIA_CENTER.z+ELDORIA_MAIN_TREE.z,radius:treeProp[5]};
  const pointSegmentDistance = (p,a,b) => {
    const dx=b[0]-a[0], dz=b[1]-a[1], den=dx*dx+dz*dz;
    const t=Math.max(0,Math.min(1,((p.x-a[0])*dx+(p.z-a[1])*dz)/den));
    return Math.hypot(p.x-(a[0]+dx*t),p.z-(a[1]+dz*t));
  };
  const path=[scene.walk.start.slice(0,2),...scene.walk.segments.map(s=>s.target)];
  for(let i=1;i<path.length;i++) assert.ok(pointSegmentDistance(mainTree,path[i-1],path[i])>mainTree.radius+.7,
    "cada trecho real mantém 0,7 m além do colisor da árvore colossal");
  const waypoint=scene.walk.segments[1],finalTarget=scene.walk.segments[2].target;
  for(const radius of [0,.25,.5,.75,1]) for(let i=0;i<72;i++){
    const a=i*Math.PI/36,start=[waypoint.target[0]+Math.cos(a)*waypoint.tolerance*radius,waypoint.target[1]+Math.sin(a)*waypoint.tolerance*radius];
    assert.ok(pointSegmentDistance(mainTree,start,finalTarget)>mainTree.radius+.7,
      "a tolerância do desvio não pode permitir aproximação excessiva do tronco");
  }
  assert.throws(() => core.validateWalk({captureQuality:"ultra",segments:[{name:"perfil-invalido",target:[0,1]}]}), /Perfil de captura inválido/);
  assert.throws(() => core.validateWalk({segments:[{name:"timeout-excessivo",target:[0,1],timeoutMs:300001}]}), /Timeout inválido/);
  assert.ok(Math.abs(core.walkYaw({x:-14,z:-82}, {x:-14,z:-105})) < 1e-12, "W segue para sul no primeiro trecho");
  const westYaw = core.walkYaw({x:-14,z:-105}, {x:-20.5,z:-76});
  assert.ok(westYaw > 2.9 && westYaw < Math.PI, "W vira para noroeste e contorna a árvore pelo oeste");
  const plazaYaw = core.walkYaw({x:-20.5,z:-76}, {x:-13,z:-49.5});
  assert.ok(plazaYaw < -2.8 && plazaYaw > -Math.PI, "W aponta para a abertura sul da praça sem tentar atravessar o poço central");
  assert.deepEqual(core.measureWalk({x:0,z:0}, {x:3,z:4}, [3,8]), {distance:5,remaining:4});
  assert.throws(() => core.validateWalk({segments:[{name:"alvo-invalido",target:[0],timeoutMs:5000}]}), /Alvo inválido/);
  assert.throws(() => core.validateWalk({segments:[{name:"tecla-invalida",target:[0,1],key:"KeyQ",timeoutMs:5000}]}), /Tecla inválida/);
  assert.throws(() => core.validateWalk({segments:[{name:"timeout-invalido",target:[0,1],timeoutMs:999999}]}), /Timeout inválido/);
  assert.throws(() => core.validateWalk({start:[0,1],segments:[{name:"origem-invalida",target:[0,1]}]}), /Origem inválida/);
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


test("alvo final fica dentro da abertura sul da praça, antes do poço central", async () => {
  const { PLAZA, insidePlaza, plazaPolar, openingAt } = await import("../../eldoria-city-plaza.js");
  const scene = core.validateRequest(["floresta-percurso"])[0];
  const [x, z] = scene.walk.segments[2].target;
  const polar = plazaPolar(x, z);
  assert.ok(insidePlaza(x, z), "alvo precisa estar dentro da borda calçada");
  assert.equal(openingAt(polar.theta)?.id, "adro", "alvo precisa usar a abertura sul do adro");
  assert.ok(Math.hypot(x - PLAZA.x, z - PLAZA.z) > 5, "não exigir o centro ocupado da praça");
});
