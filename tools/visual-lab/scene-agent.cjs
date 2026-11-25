"use strict";
/**
 * Agente de cenas — fotos e vídeos do JOGO REAL para QA visual (humano ou IA multimodal).
 *
 *   SCENE_AGENT_SCENES='["vila-praca",{"scene":"caverna-salao","video":true},"npc-cabelos"]' \
 *   VISUAL_BASE_URL=http://127.0.0.1:4173 node tools/visual-lab/scene-agent.cjs
 *
 * Saída em $VISUAL_OUTPUT/scene-agent/: PNGs, vídeos (WebM; MP4 se houver ffmpeg), report.json, index.html, index.md.
 * Regras: só API de debug existente (?debug3d=1); nunca aborta todas as fotos por um quadro ruim — repete até obter um
 * quadro válido e, se não conseguir, registra a foto como 'suspeita' com o motivo e segue para a próxima.
 * THREE_LOCAL=/caminho/node_modules/three serve o three@0.160.0 localmente (ambientes sem CDN).
 */
const fs = require("node:fs"), path = require("node:path"), { execFileSync, spawnSync } = require("node:child_process");
const core = require("./scene-capture-core.cjs");
const { measureWalkTrace } = require("./agent-qa.cjs");

const out = path.resolve(process.env.VISUAL_OUTPUT || "visual-lab-results", "scene-agent");
const base = (process.env.VISUAL_BASE_URL || "http://127.0.0.1:4173").replace(/\/$/, "");
const viewport = { width: +(process.env.SCENE_AGENT_W || 852), height: +(process.env.SCENE_AGENT_H || 393) };
const MAX_ATTEMPTS = 5;

function gitCommit() { try { return execFileSync("git", ["rev-parse", process.env.AGENT ? "--verify" : "--short", "HEAD"], { encoding: "utf8" }).trim(); } catch { return process.env.GITHUB_SHA ? process.env.GITHUB_SHA.slice(0, 7) : "desconhecido"; } }
function ffmpegPath() { const r = spawnSync("ffmpeg", ["-version"], { encoding: "utf8" }); return r.status === 0 ? "ffmpeg" : null; }

async function decode(sharp, png) { const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { data, w: info.width, h: info.height }; }

async function openPage(browser, scene, log) {
  const ctxOpts = { viewport, deviceScaleFactor: 1 };
  if (scene.video) ctxOpts.recordVideo = { dir: path.join(out, "videos", "_tmp"), size: viewport };
  const context = await browser.newContext(ctxOpts), page = await context.newPage();
  page.setDefaultTimeout(30000);
  page.on("pageerror", e => log.pageErrors.push({ scene: scene.id, message: String(e.message).slice(0, 300) }));
  page.on("console", m => { if (m.type() === "error") log.consoleErrors.push({ scene: scene.id, text: m.text().slice(0, 300) }); });
  page.on("requestfailed", r => log.failedRequests.push({ scene: scene.id, url: r.url().slice(0, 200), error: (r.failure() || {}).errorText || "" }));
  page.on("response", r => { if (r.status() >= 400) log.failedRequests.push({ scene: scene.id, url: r.url().slice(0, 200), error: "HTTP " + r.status() }); });
  if (process.env.THREE_LOCAL) await page.route(/cdn\.jsdelivr\.net\/npm\/three@0\.160\.0\/(.*)/, async r => {
    const rel = r.request().url().split("three@0.160.0/")[1].split("?")[0]; await r.fulfill({ path: path.join(process.env.THREE_LOCAL, rel), contentType: "text/javascript" }); });
  const t0 = Date.now();
  if (scene.kind === "npc") {
    await page.goto(base + "/npc-visual-qa.html?sceneAgent=1", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.qaReady === true, null, { timeout: 90000 });
  } else {
    await page.goto(base + "/mundo-3d-prototype.html?debug3d=1&sceneAgent=1", { waitUntil: "domcontentloaded", timeout: 60000 });
    const ready = await page.waitForFunction(() => {
      if ((document.getElementById("loading")?.textContent || "").includes("Falha ao montar o mundo 3D")) return "falhou";
      const D = window.SevenSinsDebug3D; return D && typeof D.fly === "function" && (!D.riteState || D.riteState().ready) ? "pronto" : false;
    }, null, { timeout: 240000 }).then(h => h.jsonValue());
    if (ready !== "pronto") throw Error("Mundo não montou: " + ready);
    await page.evaluate(h => { const D = window.SevenSinsDebug3D; D.freeRoam(); if (Number.isFinite(h)) D.setHour(h); if (D.weather) D.weather("limpo"); }, scene.hour);
    if (scene.kind === "caverna") { // entra pela API existente e espera o véu de transição sumir (senão a foto sai preta)
      await page.evaluate(() => window.SevenSinsDebug3D.ascension("cave"));
      await page.waitForFunction(() => { const s = window.SevenSinsDebug3D.ascState(); return s.key === "cave" && !s.busy && (+s.veil || 0) < .05; }, null, { timeout: 120000 });
    }
    // HUD/avisos cobrem a ação: por padrão só o canvas aparece na foto (CSS da captura; o jogo continua igual)
    if (scene.hud !== true) await page.addStyleTag({ content: "body *{visibility:hidden!important}canvas#scene{visibility:visible!important}" });
  }
  return { context, page, loadMs: Date.now() - t0 };
}

async function frame(page, shot, kind) {
  if (shot.npc) {
    const m = await page.evaluate(r => window.mountNpc(r), shot.npc);
    const close = await page.evaluate(() => typeof window.closeup === "function" ? (window.closeup("front"), true) : false); // close-up existe a partir da página com métricas de cabelo
    return { controls: ["mountNpc(" + shot.npc + ")", close ? "closeup(front)" : "vista padrão da página (sem closeup)"], extra: { clips: (m && m.clips || []).length } };
  }
  if (shot.none) { // fim de percurso: não reposiciona, só confere se o herói ficou visível
    await waitCameraStable(page, 6000);
    const v = await page.evaluate(() => window.SevenSinsDebug3D.camView ? window.SevenSinsDebug3D.camView() : null);
    return { controls: [], framing: [{ view: v }], framingIssue: v && (!v.onScreen || v.blocked) ? "herói encoberto ao fim do percurso" + (v.blocked ? " por " + v.blocked.name + " a " + v.blocked.dist + " m" : "") : null };
  }
  if (shot.fly) { // câmera livre: confere se há algo (copa, telhado) entre a câmera e o ponto mirado
    await page.evaluate(f => { const D = window.SevenSinsDebug3D; D.fly(f[0], f[1]); }, shot.fly);
    await page.waitForTimeout(600);
    const v = await page.evaluate(to => window.SevenSinsDebug3D.camView ? window.SevenSinsDebug3D.camView(to) : null, shot.fly[1]);
    return { controls: ["fly(" + JSON.stringify(shot.fly) + ")"], framing: [{ view: v }],
      framingIssue: v && v.blocked && v.blocked.dist < v.camToHero - 1.5 ? "câmera livre tapada por " + v.blocked.name + " a " + v.blocked.dist + " m (alvo a " + v.camToHero + " m)" : null };
  }
  // câmera REAL do jogo: põe o herói, espera a câmera assentar e confere se ele aparece; se algo o encobre (tronco,
  // parede), gira/aproxima a câmera — mesma posição do herói, outro ângulo — antes de aceitar a foto.
  const a = shot.at || shot.cave, fn = shot.cave ? "caveTo" : "teleport", pitch = shot.pitch ?? .1, dist = shot.dist ?? 6;
  await page.evaluate(([fn, a]) => { const D = window.SevenSinsDebug3D; D.fly(null); D[fn](a[0], a[1], a[2]); }, [fn, a]);
  const tries = [[0, 1], [.55, 1], [-.55, 1], [0, .7], [1.1, .85], [-1.1, .85], [Math.PI, 1]], framing = [];
  for (const [dy, k] of tries) {
    const yaw = a[2] + dy, d = +(dist * k).toFixed(2);
    await page.evaluate(([yaw, pitch, d]) => window.SevenSinsDebug3D.view(yaw, pitch, d), [yaw, pitch, d]);
    const settle = await waitCameraStable(page, 25000, d); // teleporte longo: a câmera atravessa o mapa suavizando
    const v = await page.evaluate(() => window.SevenSinsDebug3D.camView ? window.SevenSinsDebug3D.camView() : null);
    framing.push({ yaw: +yaw.toFixed(3), dist: d, settleMs: settle, view: v });
    if (settle >= 0 && (!v || (v.onScreen && !v.blocked))) break;
  }
  const last = framing[framing.length - 1];
  return { controls: [fn + "(" + a.map(v => +v.toFixed(3)).join(",") + ")", "view(" + [last.yaw, pitch, last.dist].join(",") + ")"], framing,
    framingIssue: last.settleMs < 0 ? "câmera não assentou na distância pedida (foto pode estar no meio do trajeto)" : last.view && (!last.view.onScreen || last.view.blocked) ? "herói fora do quadro ou encoberto" + (last.view.blocked ? " por " + last.view.blocked.name + " a " + last.view.blocked.dist + " m" : "") + " após " + framing.length + " ângulos" : null };
}
/** O screenshot não pode sair antes de a câmera parar (o jogo suaviza a câmera; no SwiftShader são poucos quadros/s).
 *  Com expectDist, também exige a câmera a essa distância do herói (logo após teleportar ela ainda está longe e parada). */
async function waitCameraStable(page, maxMs = 9000, expectDist = null) {
  const t0 = Date.now(); let prev = null, still = 0;
  while (Date.now() - t0 < maxMs) {
    const c = await page.evaluate(() => window.SevenSinsDebug3D.cam());
    const near = expectDist == null || await page.evaluate(d => { const v = window.SevenSinsDebug3D.camView && window.SevenSinsDebug3D.camView(); return !v || Math.abs(v.camToHero - d) < Math.max(1.2, d * .35); }, expectDist);
    if (near && prev && Math.hypot(c[0] - prev[0], c[1] - prev[1], c[2] - prev[2]) < .03) { if (++still >= 2) return Date.now() - t0; } else still = 0;
    prev = c; await page.waitForTimeout(400);
  }
  return -1; // não assentou: registrado no relatório
}

async function readState(page, kind) {
  return page.evaluate(k => {
    if (k === "npc") return { hairFit: window.hairFit ? window.hairFit() : null };
    const D = window.SevenSinsDebug3D, r = { state: D.state ? D.state() : null, camera: D.cam ? D.cam() : null, render: D.rinfo ? D.rinfo() : null };
    if (k === "caverna" && D.ascState) r.cave = D.ascState();
    return r;
  }, kind);
}
function stateSummary(st, kind) {
  if (!st) return "";
  if (kind === "npc") { const h = st.hairFit; return h ? `cabelo×crânio pior ${h.topToHairWorst ?? "?"} m` : "sem métrica de cabelo"; }
  const s = st.state || {}, c = st.camera || [];
  return `jogador ${[s.x, s.y, s.z].map(v => Number.isFinite(v) ? v.toFixed(1) : "?").join(",")} · câmera ${c.join(",")}` + (st.cave ? ` · ${st.cave.key || ""}` : "");
}

async function shoot(page, sharp, scene, shot, prevSig, i) {
  const dir = path.join(out, scene.id); fs.mkdirSync(dir, { recursive: true });
  const file = path.join(scene.id, String(i + 1).padStart(2, "0") + "-" + shot.name + ".png");
  const res = { scene: scene.id, name: shot.name, mode: shot.mode, file, attempts: 0, controls: [] };
  try {
    const f = await frame(page, shot, scene.kind); res.controls = f.controls; if (f.extra) res.extra = f.extra; if (f.framing) res.framing = f.framing;
    if (shot.fly) res.cameraSettleMs = await waitCameraStable(page, 4000);
    await page.waitForTimeout(scene.settle || (scene.kind === "npc" ? 600 : 900));
    let cls, stats, png, sig;
    for (let attempt = 0; ; attempt++) {
      res.attempts = attempt + 1;
      png = await page.screenshot({ type: "png" });
      const img = await decode(sharp, png); stats = core.pixelStats(img.data, img.w, img.h); sig = core.signature(img.data, img.w, img.h); cls = core.classifyFrame(stats);
      if (!core.shouldRetry(cls, attempt, MAX_ATTEMPTS)) break;
      await page.waitForTimeout(1200 * (attempt + 1)); // o WebGL pode ainda não ter desenhado o quadro
    }
    if (cls.status === "ok" && f.framingIssue) cls = { status: "suspeita", reason: f.framingIssue };
    if (cls.status === "ok" && prevSig && core.signatureDistance(sig, prevSig) < 1.5) cls = { status: "suspeita", reason: "quase idêntico à foto anterior (câmera não mudou ou render parado)" };
    fs.writeFileSync(path.join(out, file), png);
    const st = await readState(page, scene.kind);
    Object.assign(res, { capturedAt: new Date().toISOString(), status: cls.status, reason: cls.reason, pixels: stats, signature: sig, observed: st, stateSummary: stateSummary(st, scene.kind) });
    return { res, sig };
  } catch (e) {
    Object.assign(res, { status: "falha", reason: "erro na tomada: " + String(e.message || e).slice(0, 240), pixels: { mean: 0, stdev: 0 } });
    return { res, sig: prevSig };
  }
}

async function main() {
  const { chromium } = require("playwright"), sharp = require("sharp");
  fs.mkdirSync(out, { recursive: true });
  const t0 = Date.now(), scenes = core.validateRequest(process.env.SCENE_AGENT_SCENES);
  const log = { pageErrors: [], consoleErrors: [], failedRequests: [] }, shots = [], videos = [], timings = [], routes = [];
  const report = { schema: core.SCHEMA, startedAt: new Date().toISOString(), commit: gitCommit(), base, viewport, renderer: "Chromium headless + SwiftShader (CPU) — não representa FPS de celular",
    request: scenes.map(s => ({ id: s.id, video: s.video })), howToReproduce: "SCENE_AGENT_SCENES='" + JSON.stringify(scenes.map(s => s.video ? { scene: s.id, video: true } : s.id)) + "' node tools/visual-lab/scene-agent.cjs" };
  let browser, fatal = null;
  try {
    browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage", "--enable-webgl", "--ignore-gpu-blocklist", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
    for (const scene of scenes) {
      const ts = Date.now(); let ctx = null;
      try {
        ctx = await openPage(browser, scene, log);
        if (!report.build) report.build = await ctx.page.evaluate(() => import("./build-info.js").then(m => m.BUILD + " (Mod " + m.MOD + ")")).catch(() => null);
        let prev = null;
        for (let i = 0; i < scene.shots.length; i++) { const r = await shoot(ctx.page, sharp, scene, scene.shots[i], prev, i); shots.push(r.res); prev = r.sig; }
        if (scene.walk && scene.kind !== "npc") {
          const {page} = ctx;
          if (Array.isArray(scene.walk.segments)) {
            const route = { scene: scene.id, segments: [], completed: true, startedAt: new Date().toISOString() };
            const requestedQuality = scene.walk.captureQuality || null;
            if (requestedQuality) {
              route.captureQuality = await page.evaluate(quality => {
                const select = document.getElementById("graphics-profile-3d");
                const fps = document.getElementById("fps-badge")?.textContent?.trim() || null;
                if (!select || !Array.from(select.options).some(option => option.value === quality)) {
                  return { requested: quality, applied: false, previous: null, fpsBefore: fps, reason: "perfil indisponível" };
                }
                const previous = select.value;
                select.value = quality;
                select.dispatchEvent(new Event("change", { bubbles: true }));
                return { requested: quality, applied: select.value === quality, previous, selected: select.value, fpsBefore: fps };
              }, requestedQuality);
              if (route.captureQuality.applied) {
                await page.waitForTimeout(1200);
                route.captureQuality.fpsAfter = await page.evaluate(() => document.getElementById("fps-badge")?.textContent?.trim() || null);
                route.captureQuality.status = await page.evaluate(() => document.getElementById("graphics-status-3d")?.textContent?.trim() || null);
              }
            }
            for (let j = 0; j < scene.walk.segments.length; j++) {
              const segment = scene.walk.segments[j];
              const start = await page.evaluate(() => window.SevenSinsDebug3D.state());
              const yaw = core.walkYaw(start, segment.target);
              await page.evaluate(({yaw}) => window.SevenSinsDebug3D.view(yaw, .12, 5.5), {yaw});
              await page.waitForTimeout(500);
              // Sem argumento, camView() verifica o protagonista; o argumento opcional é reservado a alvos de cenas livres.
              await page.evaluate(() => {
                const D = window.SevenSinsDebug3D;
                const cap = {active:true,started:performance.now(),last:0,samples:[]};
                const capture = t => {
                  const s = D.state(); let v = null, w = null;
                  try { v = typeof D.camView === "function" ? D.camView() : null; } catch {}
                  try { w = typeof D.walkState === "function" ? D.walkState() : null; } catch {}
                  cap.samples.push({t:+(t-cap.started).toFixed(1),x:+s.x.toFixed(2),z:+s.z.toFixed(2),y:+s.y.toFixed(2),
                    grounded:typeof w?.grounded === "boolean" ? w.grounded : null,
                    surface:typeof w?.surface === "string" ? w.surface : null,
                    surfaceY:Number.isFinite(w?.surfaceY) ? +w.surfaceY.toFixed(2) : null,
                    terrainY:Number.isFinite(w?.terrain) ? +w.terrain.toFixed(3) : null,
                    camera:v && typeof v.onScreen === "boolean" ? {onScreen:v.onScreen,blocked:v.blocked ? {
                      name:String(v.blocked.name || ""),dist:Number.isFinite(v.blocked.dist) ? +v.blocked.dist.toFixed(2) : null
                    } : null} : null});
                };
                capture(cap.started); cap.last=cap.started;
                function tick(t) { if (!cap.active) return; if (t-cap.last >= 500) { capture(t); cap.last=t; } requestAnimationFrame(tick); }
                window.__a1RouteTrace=cap; requestAnimationFrame(tick);
              });
              const begin = Date.now(); let reached = true;
              await page.keyboard.down(segment.key);
              try {
                await page.waitForFunction(({target, tolerance}) => {
                  const now = window.SevenSinsDebug3D.state();
                  return Math.hypot(now.x - target[0], now.z - target[1]) <= tolerance;
                }, {target: segment.target, tolerance: segment.tolerance}, {polling:250, timeout:segment.timeoutMs}).catch(e => {
                  if (e.name !== "TimeoutError") throw e;
                  reached = false;
                });
              } finally { await page.keyboard.up(segment.key); }
              const elapsedMs = Date.now() - begin;
              await page.waitForTimeout(800);
              const captured = await page.evaluate(() => {
                const cap=window.__a1RouteTrace,D=window.SevenSinsDebug3D;
                if (!cap) return null;
                cap.active=false;
                const s=D.state(); let v=null,w=null;
                try { v=typeof D.camView === "function" ? D.camView() : null; } catch {}
                try { w=typeof D.walkState === "function" ? D.walkState() : null; } catch {}
                const t=performance.now()-cap.started;
                cap.samples.push({t:+t.toFixed(1),x:+s.x.toFixed(2),z:+s.z.toFixed(2),y:+s.y.toFixed(2),
                  grounded:typeof w?.grounded === "boolean" ? w.grounded : null,
                  surface:typeof w?.surface === "string" ? w.surface : null,
                  surfaceY:Number.isFinite(w?.surfaceY) ? +w.surfaceY.toFixed(2) : null,
                  terrainY:Number.isFinite(w?.terrain) ? +w.terrain.toFixed(3) : null,
                  camera:v && typeof v.onScreen === "boolean" ? {onScreen:v.onScreen,blocked:v.blocked ? {
                    name:String(v.blocked.name || ""),dist:Number.isFinite(v.blocked.dist) ? +v.blocked.dist.toFixed(2) : null
                  } : null} : null});
                return {end:{x:s.x,y:s.y,z:s.z},trace:cap.samples};
              });
              const end = captured?.end || await page.evaluate(() => window.SevenSinsDebug3D.state());
              const trace = captured?.trace || [];
              const measured = core.measureWalk(start, end, segment.target);
              const traceMetrics = measureWalkTrace(trace,start,end);
              const metricsForReport = {
                valid:traceMetrics.valid,samples:traceMetrics.samples,
                pathDistance:+Number(traceMetrics.pathDistance || 0).toFixed(2),
                maxStep:+Number(traceMetrics.maxStep || 0).toFixed(2),
                maxSpeed:+Number(traceMetrics.maxSpeed || 0).toFixed(2),
                verticalTravel:+Number(traceMetrics.verticalTravel || 0).toFixed(2),
                maxVerticalStep:+Number(traceMetrics.maxVerticalStep || 0).toFixed(2),
                maxVerticalSpeed:+Number(traceMetrics.maxVerticalSpeed || 0).toFixed(2),
                groundedSamples:traceMetrics.groundedSamples || 0,
                airborneSamples:traceMetrics.airborneSamples || 0,
                finalGrounded:traceMetrics.finalGrounded === true,
                surfaceTransitions:traceMetrics.surfaceTransitions || 0,
                surfaceKinds:traceMetrics.surfaceKinds || [],
                surfaceMinY:Number.isFinite(traceMetrics.surfaceMinY) ? +traceMetrics.surfaceMinY.toFixed(2) : null,
                surfaceMaxY:Number.isFinite(traceMetrics.surfaceMaxY) ? +traceMetrics.surfaceMaxY.toFixed(2) : null,
                maxSurfaceStep:+Number(traceMetrics.maxSurfaceStep || 0).toFixed(2),
                cameraSamples:traceMetrics.cameraSamples || 0,
                offScreenSamples:traceMetrics.offScreenSamples || 0,
                blockedSamples:traceMetrics.blockedSamples || 0,
                reason:traceMetrics.reason || null
              };
              const record = {
                name: segment.name, key: segment.key, target: segment.target, yaw: +yaw.toFixed(3),
                start: {x: +start.x.toFixed(2), y: +start.y.toFixed(2), z: +start.z.toFixed(2)},
                end: {x: +end.x.toFixed(2), y: +end.y.toFixed(2), z: +end.z.toFixed(2)},
                distance: +measured.distance.toFixed(2), remaining: +measured.remaining.toFixed(2), elapsedMs,
                minTravel: segment.minTravel, tolerance: segment.tolerance, timeoutMs: segment.timeoutMs,
                trace, traceMetrics:metricsForReport,
                reached: reached && traceMetrics.valid && measured.remaining <= segment.tolerance + .25 && measured.distance >= segment.minTravel
              };
              const willContinue = record.reached && j < scene.walk.segments.length - 1;
              if (!willContinue && route.captureQuality?.applied && route.captureQuality.previous) {
                route.captureQuality.restored = await page.evaluate(previous => {
                  const select = document.getElementById("graphics-profile-3d");
                  if (!select || !Array.from(select.options).some(option => option.value === previous)) return false;
                  select.value = previous;
                  select.dispatchEvent(new Event("change", { bubbles: true }));
                  return select.value === previous;
                }, route.captureQuality.previous);
                await page.waitForTimeout(900);
                route.captureQuality.fpsAfterRestore = await page.evaluate(() => document.getElementById("fps-badge")?.textContent?.trim() || null);
              }
              const r = await shoot(page, sharp, scene, { name: segment.name, mode: "camera-do-jogo", none: true }, prev, scene.shots.length + j);
              r.res.controls = ["keyboard " + segment.key + " " + elapsedMs + " ms", "camera yaw " + yaw.toFixed(3)];
              r.res.extra = { ...(r.res.extra || {}), walk: record };
              if (!record.reached) {
                route.completed = false;
                r.res.status = "falha";
                r.res.reason = "Percurso " + segment.name + " não alcançou alvo: " + record.distance + " m percorridos, " + record.remaining + " m restantes; mínimo " + segment.minTravel + " m";
              }
              shots.push(r.res); prev = r.sig; route.segments.push(record);
              if (!record.reached) break; // falha no primeiro trecho: preservar a causa, sem seguir de um ponto incorreto
            }
            route.totalDistance = +route.segments.reduce((sum, s) => sum + s.distance, 0).toFixed(2);
            route.totalPathDistance = +route.segments.reduce((sum, s) => sum + (s.traceMetrics?.pathDistance || 0), 0).toFixed(2);
            route.cameraTelemetry = route.segments.reduce((acc, s) => {
              const m=s.traceMetrics || {};
              acc.samples += m.cameraSamples || 0;
              acc.offScreenSamples += m.offScreenSamples || 0;
              acc.blockedSamples += m.blockedSamples || 0;
              return acc;
            }, {samples:0,offScreenSamples:0,blockedSamples:0});
            route.finishedAt = new Date().toISOString();
            routes.push(route);
          } else {
            const {key, ms, distance} = scene.walk;
            const start = distance ? await page.evaluate(() => window.SevenSinsDebug3D.state()) : null;
            const begin = Date.now(); let reached = true;
            await page.keyboard.down(key);
            try {
              if (distance) {
                await page.waitForFunction(({x, z, distance}) => {
                  const now = window.SevenSinsDebug3D.state();
                  return Math.hypot(now.x - x, now.z - z) >= distance;
                }, {x:start.x, z:start.z, distance}, {polling:250, timeout:ms}).catch(e => {
                  if (e.name !== "TimeoutError") throw e;
                  reached = false;
                });
              } else await page.waitForTimeout(ms);
            } finally { await page.keyboard.up(key); }
            const elapsed = Date.now() - begin;
            await page.waitForTimeout(800);
            const r = await shoot(page, sharp, scene, { name: "apos-percurso", mode: "camera-do-jogo", none: true }, prev, scene.shots.length);
            r.res.controls = ["keyboard " + key + " " + elapsed + " ms"];
            if (!reached) Object.assign(r.res, {status:"falha", reason:"Percurso abaixo de " + distance + " unidades no tempo limite"});
            shots.push(r.res);
          }
        }
      } catch (e) {
        shots.push({ scene: scene.id, name: "cena", file: "", status: "falha", reason: "cena não abriu: " + String(e.message || e).slice(0, 240), attempts: 0, pixels: { mean: 0, stdev: 0 } });
      } finally {
        const video = ctx && scene.video ? ctx.page.video() : null;
        if (ctx) await ctx.context.close().catch(() => {});
        if (video) videos.push(await finishVideo(video, scene.id).catch(e => ({ scene: scene.id, format: "falha", file: "", bytes: 0, error: String(e.message || e) })));
        timings.push({ scene: scene.id, ms: Date.now() - ts, loadMs: ctx ? ctx.loadMs : null });
      }
    }
  } catch (e) { fatal = String(e.message || e); } finally { await browser?.close().catch(() => {}); }
  fs.rmSync(path.join(out, "videos", "_tmp"), { recursive: true, force: true });
  Object.assign(report, core.summarize(shots, fatal), { fatal, shots, videos, timings, routes, totalMs: Date.now() - t0, ...log,
    observedVsInferred: { observed: "arquivos PNG/WebM/MP4, métricas de pixels (média, desvio, frações preto/branco), estado do debug (posição, câmera, render.info, caverna, métricas de cabelo), erros e requisições", inferred: "nenhum — nada aqui reconhece objetos; 'ok' só quer dizer que o quadro não é preto/branco/uniforme" } });
  report.finishedAt = new Date().toISOString();
  const idx = core.buildIndex(report);
  fs.writeFileSync(path.join(out, "report.json"), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(out, "index.html"), idx.html); fs.writeFileSync(path.join(out, "index.md"), idx.md);
  console.log(`AGENTE DE CENAS: ${report.status} — ok ${report.counts.ok}, suspeita ${report.counts.suspeita}, falha ${report.counts.falha}, vídeos ${videos.filter(v => v.bytes > 0).length}, ${(report.totalMs / 1000).toFixed(0)} s → ${path.relative(process.cwd(), out)}/index.md`);
  process.exitCode = report.exitCode;
}

async function finishVideo(video, id) {
  const src = await video.path(), dir = path.join(out, "videos"); fs.mkdirSync(dir, { recursive: true });
  const webm = path.join(dir, id + ".webm"); fs.renameSync(src, webm);
  const bytes = fs.statSync(webm).size; if (bytes < 2048) throw Error("vídeo vazio/truncado (" + bytes + " bytes)");
  const v = { scene: id, format: "webm", file: path.relative(out, webm), bytes };
  const ff = ffmpegPath();
  if (ff) { const mp4 = webm.replace(/\.webm$/, ".mp4"), r = spawnSync(ff, ["-y", "-loglevel", "error", "-i", webm, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "veryfast", "-crf", "28", "-movflags", "+faststart", mp4], { encoding: "utf8", timeout: 180000 });
    v.mp4 = r.status === 0 && fs.existsSync(mp4) && fs.statSync(mp4).size > 2048 ? { file: path.relative(out, mp4), bytes: fs.statSync(mp4).size } : { error: (r.stderr || "ffmpeg falhou").slice(0, 200) };
    const probe = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", webm], { encoding: "utf8" });
    if (probe.status === 0) v.durationS = +(+probe.stdout.trim()).toFixed(2); }
  return v;
}
if (require.main === module) main();
module.exports = { main };
