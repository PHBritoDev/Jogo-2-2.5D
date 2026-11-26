"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { chromium } = require("playwright");

const OUT = path.resolve(process.env.VISUAL_OUTPUT || "visual-lab-results/a3-meadow");
const BASE_URL = (process.env.VISUAL_BASE_URL || "http://127.0.0.1:4173").replace(/\/$/, "");
const BASE_SHA = process.env.BASE_SHA || "";
const PR_HEAD_SHA = process.env.PR_HEAD_SHA || "";
const SEED = 0xA3C0FFEE;
const CHANGED_MODULES = ["eldoria-prologue-meadow.js", "eldoria-undergrowth.js"];
const VIEWPORTS = [
  { id: "mobile", width: 852, height: 393, isMobile: true, profile: "low" },
  { id: "mobile-portrait", width: 393, height: 852, isMobile: true, profile: "low" },
  { id: "desktop", width: 960, height: 540, isMobile: false, profile: "low" }
];
const SCENES = [
  { id: "prado-prologo", x: 54, z: 160, yaw: Math.PI, pitch: .12, distance: 6 },
  { id: "trilha-samambaias", x: -14, z: -105, yaw: -Math.PI / 2, pitch: .12, distance: 6 },
  // Vista lateral do mesmo ponto, mantendo o herói voltado para a estrada: expõe o ombro do prado no mobile.
  { id: "prado-ombro-lateral", x: 54, z: 160, yaw: Math.PI / 2, heroYaw: Math.PI, pitch: .12, distance: 8 }
];
const WALK_SCENES = new Set(["prado-prologo", "trilha-samambaias"]);

function readBaseModules() {
  if (!/^[a-f0-9]{40}$/.test(BASE_SHA)) throw new Error("BASE_SHA ausente ou inválido");
  const result = {};
  for (const file of CHANGED_MODULES) {
    result[file] = execFileSync("git", ["show", BASE_SHA + ":" + file], { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
    if (!result[file]) throw new Error("Baseline vazio: " + file);
  }
  return result;
}

function distance3(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length < 3 || b.length < 3) return Infinity;
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function heroDelta(a, b) {
  const x = a && a.hero, y = b && b.hero;
  if (!x || !y || ![x.x, x.z, y.x, y.z].every(Number.isFinite)) return Infinity;
  return Math.hypot(x.x - y.x, x.z - y.z);
}

function heroPositionDelta(a, b) {
  const x = a && a.hero, y = b && b.hero;
  if (!x || !y || ![x.x, x.y, x.z, y.x, y.y, y.z].every(Number.isFinite)) return Infinity;
  return Math.hypot(x.x - y.x, x.y - y.y, x.z - y.z);
}

function cameraClear(state) {
  const view = state && state.camView;
  return !!view && view.onScreen === true && !view.blocked;
}

async function readState(page) {
  return page.evaluate(() => {
    const D = window.SevenSinsDebug3D;
    const s = D.state ? D.state() : {};
    return {
      hero: { x: s.x, y: s.y, z: s.z },
      camera: D.cam ? D.cam() : null,
      camView: D.camView ? D.camView() : null,
      render: D.rinfo ? D.rinfo() : null
    };
  });
}

async function waitCameraStable(page, expectedDistance, timeoutMs = 22000) {
  const started = Date.now();
  let previous = null, stable = 0, last = null;
  while (Date.now() - started < timeoutMs) {
    last = await readState(page);
    const camera = last.camera;
    const cameraStable = previous && distance3(camera, previous) < .035;
    const actualDistance = last.camView && last.camView.camToHero;
    const near = Number.isFinite(actualDistance) &&
      Math.abs(actualDistance - expectedDistance) < Math.max(1.2, expectedDistance * .35);
    stable = cameraStable && near ? stable + 1 : 0;
    if (stable >= 2) return { ...last, settled: true, settleMs: Date.now() - started };
    previous = camera;
    await page.waitForTimeout(400);
  }
  return { ...(last || {}), settled: false, settleMs: Date.now() - started };
}

async function setPose(page, scene) {
  await page.evaluate(s => {
    const D = window.SevenSinsDebug3D;
    // Reposiciona o jogador antes de reativar o follow-camera; esta é a ordem usada
    // pelos outros laboratórios do projeto e evita conservar a câmera do spawn.
    D.teleport(s.x, s.z, s.heroYaw ?? s.yaw);
    D.fly(null);
    D.view(s.yaw, s.pitch, s.distance);
    // snapCam é o preset de câmera determinístico usado pelos laboratórios do projeto;
    // evita capturar a interpolação antiga do spawn, sobretudo no viewport desktop.
    D.snapCam();
  }, scene);
  await page.waitForTimeout(800);
  return waitCameraStable(page, scene.distance);
}

async function capture(page, viewport, variant, scene, state) {
  const file = viewport.id + "-" + variant + "-" + scene.id + ".png";
  const full = path.join(OUT, file);
  await page.locator("#scene").screenshot({ path: full, timeout: 90000 });
  return { viewport: viewport.id, variant, scene: scene.id, file, state };
}

async function walkForward(page, scene) {
  const start = await readState(page);
  const startedAt = Date.now();
  let movementReached = false, movementError = null;
  await page.evaluate(() => window.focus());
  try {
    await page.keyboard.down("KeyW");
    // Aguarda deslocamento físico do controlador, não uma janela fixa que pode
    // terminar antes de haver frames suficientes no renderer SwiftShader.
    await page.waitForFunction(({ x, z }) => {
      const D = window.SevenSinsDebug3D, s = D && D.state();
      return !!s && Math.hypot(s.x - x, s.z - z) >= 2;
    }, { x: start.hero.x, z: start.hero.z }, { timeout: 15000, polling: 200 });
    movementReached = true;
  } catch (error) {
    movementError = String(error.message || error).slice(0, 250);
  } finally {
    await page.keyboard.up("KeyW").catch(() => {});
  }
  await page.waitForTimeout(500);
  const settled = await waitCameraStable(page, scene.distance, 9000);
  const end = await readState(page);
  const distance = heroDelta(start, end);
  const blockers = await page.evaluate(() => {
    const D = window.SevenSinsDebug3D, s = D.state();
    const offsets = [[0, 0], [.5, 0], [-.5, 0], [0, .5], [0, -.5], [1, 0], [-1, 0], [0, 1], [0, -1]];
    return {
      current: D.whyBlocked?.(s.x, s.z) ?? null,
      probes: offsets.map(([dx, dz]) => ({ dx, dz, reason: D.whyBlocked?.(s.x + dx, s.z + dz) ?? null }))
    };
  });
  return {
    seconds: +((Date.now() - startedAt) / 1000).toFixed(2),
    start, end, distance, settled: settled.settled,
    movementReached, movementError, blockers,
    onScreen: end.camView ? end.camView.onScreen : null
  };
}

async function openSession(browser, viewport, variant, baselineModules) {
  const errors = { page: [], console: [], requests: [] };
  const moduleHits = {};
  for (const file of CHANGED_MODULES) moduleHits[file] = 0;
  const videoDir = path.join(OUT, "tmp", viewport.id, variant);
  fs.mkdirSync(videoDir, { recursive: true });
  const contextOptions = {
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    isMobile: viewport.isMobile,
    hasTouch: viewport.isMobile
  };
  if (variant === "candidate") contextOptions.recordVideo = { dir: videoDir, size: { width: viewport.width, height: viewport.height } };
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  page.on("pageerror", e => errors.page.push(String(e.message || e).slice(0, 400)));
  page.on("request", request => {
    const pathname = new URL(request.url()).pathname;
    for (const file of CHANGED_MODULES) if (pathname.endsWith("/" + file)) moduleHits[file]++;
  });
  page.on("console", msg => { if (msg.type() === "error") errors.console.push(msg.text().slice(0, 400)); });
  page.on("response", response => {
    if (response.status() >= 400 && /\.(?:js|glb)(?:[?#]|$)/i.test(response.url())) {
      errors.requests.push({ status: response.status(), url: response.url().slice(0, 240) });
    }
  });
  page.on("requestfailed", request => {
    if (/\.(?:js|glb)(?:[?#]|$)/i.test(request.url())) errors.requests.push({ failed: request.failure()?.errorText || "failed", url: request.url().slice(0, 240) });
  });
  await page.addInitScript(({ profile, seed }) => {
    try { localStorage.setItem("seven-sins-3d-graphics", profile); } catch {}
    let state = seed >>> 0;
    Math.random = () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }, { profile: viewport.profile, seed: SEED });

  if (variant === "baseline") {
    for (const file of CHANGED_MODULES) {
      await page.route("**/" + file + "*", async route => {
        await route.fulfill({
          status: 200,
          contentType: "text/javascript; charset=utf-8",
          body: baselineModules[file]
        });
      });
    }
  }

  await page.goto(BASE_URL + "/mundo-3d-prototype.html?debug3d=1&a3MeadowQA=1", {
    waitUntil: "domcontentloaded",
    timeout: 60000
  });
  await page.waitForFunction(() => {
    const D = window.SevenSinsDebug3D;
    return D && typeof D.teleport === "function" && typeof D.view === "function" &&
      (!D.riteState || D.riteState().ready);
  }, null, { timeout: 240000 });
  await page.evaluate(() => {
    const D = window.SevenSinsDebug3D;
    D.freeRoam();
    D.setHour(15);
    if (D.weather) D.weather("limpo");
  });
  await page.waitForTimeout(6500);
  await page.addStyleTag({ content: "body *{visibility:hidden!important}canvas#scene{visibility:visible!important}" });

  const tropicalStats = await page.evaluate(() => window.SevenSinsTropicalReport || null);
  return { context, page, errors, moduleHits, tropicalStats, video: page.video() };
}

async function runSession(browser, viewport, variant, baselineModules) {
  const session = await openSession(browser, viewport, variant, baselineModules);
  const captures = [], walks = [];
  if (variant === "candidate") {
    const stats = session.tropicalStats;
    if (!stats || stats.vines <= 0 || stats.finiteVines !== stats.vines || stats.invalidVines !== 0) {
      session.errors.page.push(viewport.id + ": cipós tropicais ausentes ou com transformação não finita (" + JSON.stringify(stats) + ")");
    }
  }
  try {
    // Primeira passada: todos os pares estáticos A/B usam o mesmo estado inicial.
    // Caminhar antes da última cena pode alterar LOD/culling e contaminar a comparação.
    for (const scene of SCENES) {
      const state = await setPose(session.page, scene);
      captures.push(await capture(session.page, viewport, variant, scene, state));
      if (!state.settled) session.errors.page.push(viewport.id + " " + variant + ": câmera não assentou em " + scene.id);
      if (!cameraClear(state)) session.errors.page.push(viewport.id + " " + variant + ": protagonista fora do quadro ou encoberto em " + scene.id);
    }

    // Segunda passada: somente depois das fotos equivalentes, executa as caminhadas reais.
    if (variant === "candidate") {
      for (const scene of SCENES.filter(scene => WALK_SCENES.has(scene.id))) {
        const pose = await setPose(session.page, scene);
        if (!pose.settled) session.errors.page.push(viewport.id + ": câmera não assentou antes da caminhada em " + scene.id);
        if (!cameraClear(pose)) session.errors.page.push(viewport.id + ": protagonista fora do quadro antes da caminhada em " + scene.id);
        const walk = await walkForward(session.page, scene);
        const walkFile = viewport.id + "-candidate-" + scene.id + "-apos-caminhada.png";
        await session.page.locator("#scene").screenshot({ path: path.join(OUT, walkFile), timeout: 90000 });
        walks.push({ viewport: viewport.id, scene: scene.id, ...walk, file: walkFile });
        const routeArticle = scene.id === "trilha-samambaias" ? "na" : "no";
        const routeLabel = scene.id === "trilha-samambaias" ? "trilha" : "prado";
        if (!walk.settled) session.errors.page.push(viewport.id + ": câmera não assentou após caminhada " + routeArticle + " " + routeLabel);
        if (walk.distance < 2) session.errors.page.push(viewport.id + ": caminhada " + routeArticle + " " + routeLabel + " avançou menos de 2 m");
        if (!cameraClear(walk.end)) session.errors.page.push(viewport.id + ": protagonista fora do quadro ou encoberto após caminhada " + routeArticle + " " + routeLabel);
      }
    }
  } finally {
    await session.context.close().catch(() => {});
  }

  let videoFile = null;
  if (variant === "candidate" && session.video) {
    try {
      const source = await session.video.path();
      videoFile = viewport.id + "-candidate-prado-walk.webm";
      fs.copyFileSync(source, path.join(OUT, videoFile));
    } catch (e) {
      session.errors.page.push(viewport.id + ": vídeo não foi finalizado: " + String(e.message || e));
    }
  }
  return { viewport: viewport.id, variant, captures, walks, errors: session.errors, moduleHits: session.moduleHits, tropicalStats: session.tropicalStats, video: videoFile };
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const checkoutSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  if (!/^[a-f0-9]{40}$/.test(PR_HEAD_SHA) || checkoutSha !== PR_HEAD_SHA) {
    throw new Error("Checkout não corresponde ao HEAD da PR: " + checkoutSha + " / " + PR_HEAD_SHA);
  }
  const baselineModules = readBaseModules();
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--enable-webgl", "--ignore-gpu-blocklist", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
  });
  const sessions = [], pairs = [], fatal = [];
  try {
    for (const viewport of VIEWPORTS) {
      const baseline = await runSession(browser, viewport, "baseline", baselineModules);
      const candidate = await runSession(browser, viewport, "candidate", baselineModules);
      sessions.push(baseline, candidate);
      for (const file of CHANGED_MODULES) {
        if (baseline.moduleHits[file] < 1) fatal.push(viewport.id + ": baseline não interceptou " + file);
        if (candidate.moduleHits[file] < 1) fatal.push(viewport.id + ": candidata não carregou " + file);
      }
      for (const session of [baseline, candidate]) {
        if (session.errors.page.length || session.errors.console.length || session.errors.requests.length) {
          fatal.push(viewport.id + " " + session.variant + ": erros de página/console/requisição");
        }
      }
      for (const scene of SCENES) {
        const b = baseline.captures.find(c => c.scene === scene.id);
        const c = candidate.captures.find(c => c.scene === scene.id);
        const h = b && c ? heroPositionDelta(b.state, c.state) : Infinity;
        const cam = b && c ? distance3(b.state.camera, c.state.camera) : Infinity;
        const pair = { viewport: viewport.id, scene: scene.id, heroDelta: h, cameraDelta: cam, baseline: b?.file || null, candidate: c?.file || null };
        pairs.push(pair);
        if (h > .2) fatal.push(viewport.id + " " + scene.id + ": posição 3D do herói divergiu " + h.toFixed(3) + " m");
        if (cam > .25) fatal.push(viewport.id + " " + scene.id + ": câmera A/B divergiu " + cam.toFixed(3) + " m");
        if (!cameraClear(b?.state) || !cameraClear(c?.state)) fatal.push(viewport.id + " " + scene.id + ": protagonista não está totalmente visível no par A/B");
      }
      for (const sceneId of WALK_SCENES) {
        const walk = candidate.walks.find(w => w.scene === sceneId);
        if (!walk || walk.distance < 2) fatal.push(viewport.id + ": caminhada candidata não comprovada em " + sceneId);
      }
    }
  } finally {
    await browser.close();
  }

  const report = {
    schema: "a3-meadow-visibility/v1",
    baseSha: BASE_SHA,
    headSha: PR_HEAD_SHA,
    checkoutSha,
    renderer: "Chromium headless + SwiftShader (CPU); não representa FPS Android",
    viewports: VIEWPORTS,
    scenes: SCENES,
    pairs,
    sessions,
    errors: fatal,
    limitations: [
      "A captura usa a câmera real de acompanhamento e teleporte de QA para posições canônicas.",
      "O vídeo registra caminhada real por teclado após posicionar o protagonista; o teleporte entre cenas é apenas diagnóstico.",
      "SwiftShader não mede desempenho nem FPS em GPU Android física."
    ],
    ok: fatal.length === 0
  };
  fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2) + "\n");
  const summary = [
    "# A3 — A/B de vegetação",
    "",
    "Base: " + BASE_SHA,
    "HEAD: " + PR_HEAD_SHA,
    "Resultado: " + (report.ok ? "PASS" : "PENDENTE/FAIL"),
    "",
    ...pairs.map(p => "- " + p.viewport + " / " + p.scene + ": herói Δ " + p.heroDelta.toFixed(3) + " m; câmera Δ " + p.cameraDelta.toFixed(3) + " m; " + p.baseline + " × " + p.candidate),
    "",
    ...sessions.flatMap(s => s.walks.map(w => "- Caminhada " + w.viewport + ": " + w.distance.toFixed(2) + " m; vídeo " + (s.video || "não disponível"))),
    "",
    ...fatal.map(e => "- ERRO: " + e),
    "",
    "SwiftShader não é FPS Android."
  ].join("\n");
  fs.writeFileSync(path.join(OUT, "index.md"), summary + "\n");
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary + "\n");
  console.log(summary);
  if (!report.ok) process.exitCode = 1;
}

main().catch(error => {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "fatal.txt"), String(error.stack || error) + "\n");
  console.error(error.stack || error);
  process.exitCode = 1;
});
