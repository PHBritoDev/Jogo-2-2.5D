"use strict";

/**
 * Laboratorio visual real do jogo, sem mock: abre o HTML completo num
 * Chromium com WebGL por software, usa a API existente ?debug3d=1 e salva
 * screenshots, video WebM, capturas de estado e erros do navegador.
 *
 * Nao altera dano, IA, arquivos GLB nem salvamento real do usuario.
 * O objetivo e fornecer EVIDENCIA visual. Sem WebGL/sem batalha => falha.
 */

const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const out = path.resolve(process.env.VISUAL_OUTPUT || "visual-lab-results");
const pictures = path.join(out, "screenshots");
const videos = path.join(out, "videos");
const baseURL = (process.env.VISUAL_BASE_URL || "http://127.0.0.1:4173").replace(/\/$/, "");
const selected = (process.env.VISUAL_SCENARIO || "ambos").toLowerCase();
const scenes = {
  hidra: { query: "testHidra=1", skill: "s1", title: "Hidra do Juizo" },
  chamas: { query: "testLuaNegra=1", skill: "s2", title: "Chamas Negras" }
};

fs.mkdirSync(pictures, { recursive: true });
fs.mkdirSync(videos, { recursive: true });
const report = {
  origin: "Chromium + Playwright real, renderer WebGL (SwiftShader por software)",
  createdAt: new Date().toISOString(),
  build: process.env.GITHUB_SHA || "local",
  scenes: {},
  errors: []
};

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const saveReport = () => fs.writeFileSync(path.join(out, "relatorio.json"), JSON.stringify(report, null, 2) + "\n");

function sanitize(value) {
  return String(value || "desconhecido").replace(/[^a-z0-9_-]/gi, "-").slice(0, 55);
}
async function snap(page, name, data) {
  const filename = path.join(pictures, sanitize(name) + ".png");
  try {
    await page.screenshot({ path: filename, timeout: 20000, animations: "disabled" });
    data.screenshots.push(path.relative(out, filename));
  } catch (err) {
    data.errors.push("Falha screenshot " + name + ": " + err.message);
  }
}
async function state(page) {
  return page.evaluate(() => {
    const d = window.SevenSinsDebug3D;
    if (!d) return null;
    try {
      return { dim: d.dimState(), player: d.state() };
    } catch (err) {
      try { return { dim: d.dimState(), warning: String(err) }; }
      catch (e) { return { warning: String(e) }; }
    }
  });
}

async function runScene(browser, key) {
  const cfg = scenes[key];
  const data = report.scenes[key] = {
    title: cfg.title, status: "iniciando", screenshots: [],
    observations: [], errors: [], warnings: [], requestsFailed: [],
    actions: [], context: "Chromium headless, sem GPU dedicada"
  };
  let ctx, page;
  const started = Date.now();
  try {
    ctx = await browser.newContext({
      viewport: { width: 852, height: 480 },
      deviceScaleFactor: 1,
      hasTouch: true,
      isMobile: true,
      reducedMotion: "reduce",
      recordVideo: { dir: videos, size: { width: 852, height: 480 } }
    });
    page = await ctx.newPage();
    page.on("pageerror", error => data.errors.push("JS: " + error.message));
    page.on("console", msg => {
      if (msg.type() === "error") data.errors.push("Console: " + msg.text().slice(0, 320));
      else if (msg.type() === "warning" && data.warnings.length < 40) data.warnings.push(msg.text().slice(0, 320));
    });
    page.on("requestfailed", req => {
      if (data.requestsFailed.length < 40) {
        data.requestsFailed.push(req.url().slice(0, 230) + ": " + (req.failure()?.errorText || "request failed"));
      }
    });
    const url = baseURL + "/mundo-3d-prototype.html?testeDimensao=bishop3&debug3d=1&" + cfg.query + "&build=visual-lab";
    data.url = url;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });

    // O loader dinamico importa o jogo inteiro e seus modelos.
    // A API QA so existe quando o modulo principal realmente terminou o import.
    await page.waitForFunction(() => typeof window.SevenSinsDebug3D?.dimState === "function", null, { timeout: 115000 });
    data.webgl = await page.evaluate(() => {
      const canvas = document.getElementById("scene");
      const gl = canvas?.getContext("webgl2") || canvas?.getContext("webgl");
      return {
        valid: !!gl,
        canvasWidth: canvas?.width || 0,
        canvasHeight: canvas?.height || 0,
        version: gl ? gl.getParameter(gl.VERSION) : null
      };
    });
    await snap(page, key + "-00-carregado", data);
    if (!data.webgl.valid) throw Error("WebGL nao iniciou no Chromium: a captura nao prova o visual 3D");

    // Inicia a batalha real pelo modo de teste (sem salvar progresso).
    let ready = false;
    const until = Date.now() + 95000;
    while (Date.now() < until) {
      const current = await state(page);
      if (current?.dim?.vs) {
        try {
          const label = await page.evaluate(() => window.SevenSinsDebug3D.vsGo());
          data.actions.push({ action: "vsGo", label });
        } catch (e) {
          data.warnings.push("VS: " + e.message);
        }
      }
      if (current?.dim?.battle?.active && current?.dim?.visible &&
          current?.dim?.profile === "zarkhael") {
        ready = true;
        break;
      }
      await delay(1750);
    }
    if (!ready) {
      data.lastState = await state(page);
      await snap(page, key + "-erro-sem-batalha", data);
      throw Error("Dimensao do Bispo 3 nao entrou em combate real: verificar loading/VS/modelos");
    }

    const begin = await page.evaluate(skill => {
      const d = window.SevenSinsDebug3D;
      d.god();                      // vida efetivamente protegida na sessao QA
      d.skills();                   // habilidades do protagonista liberadas
      d.speed(5);                  // avanca o relogio em renderizacao de software lenta
      d.power();                    // zera cooldowns apenas em debug
      const s = d.state();
      const e = s.enemy || {};
      const y = s.y || 0;
      const dx = (s.x - e.x) || 1, dz = (s.z - e.z) || 1;
      const length = Math.hypot(dx, dz) || 1;
      const ux = dx / length, uz = dz / length;
      d.fly([e.x + ux * 16, y + 8, e.z + uz * 16], [e.x, y + 3.2, e.z]);
      const power = d.kitMove(skill);
      return { power, profile: d.dimState().profile, hero: { x: s.x, y, z: s.z }, enemy: e };
    }, cfg.skill);
    data.actions.push({ action: "god + skills + speed(5) + camera + kitMove(" + cfg.skill + ")", result: begin });
    if (!begin.power) throw Error("Nao foi possivel ativar o poder " + cfg.skill + " via debug QA");
    await snap(page, key + "-01-poder-iniciado", data);

    let lastPhase = "";
    let lastShotAt = 0;
    const t0 = Date.now();
    const maxSeconds = 78;
    for (let i = 0; Date.now() - t0 < maxSeconds * 1000; i++) {
      await delay(2400);
      const current = await state(page);
      const relevant = key === "hidra" ? current?.dim?.hydra : current?.dim?.moonFlames;
      const phase = relevant?.phase || (current?.dim?.battle?.active ? "entre-poderes" : "sem-batalha");
      const seconds = +((Date.now() - t0) / 1000).toFixed(1);
      data.observations.push({ seconds, phase, power: relevant || null,
        hp: current?.dim?.hp ?? null, calls: current?.player?.calls ?? null });

      // Capturas em fases diferentes e periodicamente: nao so prints do menu.
      if ((phase !== lastPhase || Date.now() - lastShotAt > 12500) && data.screenshots.length < 16) {
        await snap(page, key + "-" + String(i + 2).padStart(2, "0") + "-" + phase, data);
        lastShotAt = Date.now();
        lastPhase = phase;
      }
      // Simula controle real do protagonista: movimento e um poder.
      if (i === 3) {
        await page.keyboard.down("a");
        await delay(1000);
        await page.keyboard.up("a");
        const cast = await page.evaluate(() => {
          try { return window.SevenSinsDebug3D.cast("magic"); }
          catch (e) { return String(e); }
        });
        data.actions.push({ action: "andar esquerda + magia do protagonista", result: cast });
      }
      // Muda o angulo da camera para observar se o efeito flutua.
      if (i === 8) {
        await page.evaluate(() => {
          const d = window.SevenSinsDebug3D, s = d.state(), e = s.enemy;
          if (e) d.fly([e.x + 13, s.y + 6, e.z - 14], [e.x, s.y + 2.4, e.z]);
        });
        data.actions.push({ action: "segunda camera lateral" });
      }
      if (i > 12 && !relevant && data.observations.some(o => o.power)) break;
    }
    data.finalState = await state(page);
    await snap(page, key + "-99-final", data);
    data.status = "capturado";
    data.durationSeconds = +((Date.now() - started) / 1000).toFixed(1);
  } catch (error) {
    data.status = "falhou";
    data.errors.push(error.stack || String(error));
    if (page && !page.isClosed()) await snap(page, key + "-erro", data);
  } finally {
    if (ctx) {
      try {
        const video = page && page.video();
        await ctx.close();
        if (video) data.videoFile = path.relative(out, await video.path());
      } catch (err) { data.errors.push("Fechar video: " + err.message); }
    }
    data.durationSeconds = +((Date.now() - started) / 1000).toFixed(1);
    saveReport();
  }
  console.log("VISUAL LAB " + key + ": " + data.status +
      " | frames=" + data.screenshots.length + " | erros=" + data.errors.length);
  return data.status === "capturado";
}

(async () => {
  const list = selected === "ambos" ? ["hidra", "chamas"] : [selected];
  if (list.some(k => !scenes[k])) throw Error("Cenario invalido: " + selected);
  let browser;
  let ok = true;
  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox", "--disable-dev-shm-usage", "--enable-webgl",
        "--ignore-gpu-blocklist", "--use-gl=angle",
        "--use-angle=swiftshader", "--enable-unsafe-swiftshader"
      ]
    });
    for (const key of list) if (!(await runScene(browser, key))) ok = false;
  } catch (error) {
    report.errors.push(error.stack || String(error));
    ok = false;
  } finally {
    if (browser) await browser.close();
    saveReport();
  }
  console.log("Relatorio: " + path.join(out, "relatorio.json"));
  if (!ok) process.exitCode = 1;
})();
