"use strict";
// Smoke real do HUD/persistência: executa o HTML 3D, não mocks de funções.
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
(async () => {
  const browser = await chromium.launch({ headless: true, args: ["--enable-webgl", "--use-gl=angle", "--use-angle=swiftshader", "--disable-web-security"] });
  try {
    const context = await browser.newContext({ viewport: { width: 852, height: 393 } });
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:4173/", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => localStorage.setItem("seven-sins-hearts", JSON.stringify({ hearts: 2, since: 0, explained: true })));
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.goto("http://127.0.0.1:4173/mundo-3d-prototype.html?debug3d=1", { waitUntil: "domcontentloaded", timeout: 60000 });
    // O HTML começa com 10 no HUD antes de o controlador carregar o save!
    // Esperar a montagem real do mundo evita o falso negativo observado no CI.
    const ready = await page.waitForFunction(() => {
      if (document.getElementById("loading")?.textContent?.includes("Falha ao montar o mundo 3D")) return "falhou";
      const D = window.SevenSinsDebug3D;
      return D && typeof D.fly === "function" && (!D.riteState || D.riteState().ready) ? "pronto" : false;
    }, null, { timeout: 240000 }).then(h => h.jsonValue());
    assert.equal(ready, "pronto", "o jogo precisa montar antes de examinar HUD e persistência");
    assert.equal(await page.locator("#heart-count").textContent(), "10", "HUD deve recuperar 10 corações do save antigo");
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("seven-sins-hearts")));
    const evidence = path.resolve("visual-lab-results/a1-hearts");
    fs.mkdirSync(evidence, { recursive: true });
    await page.screenshot({ path: path.join(evidence, "before-reload.png"), fullPage: true });
    fs.writeFileSync(path.join(evidence, "state-before-reload.json"), JSON.stringify({ hud: await page.locator("#heart-count").textContent(), stored, errors }, null, 2));
    assert.equal(stored?.hearts, 10, "regeneração offline deve ser persistida imediatamente, não só após novo tick");
    await page.reload({ waitUntil: "domcontentloaded" });
    const reopenedReady = await page.waitForFunction(() => {
      if (document.getElementById("loading")?.textContent?.includes("Falha ao montar o mundo 3D")) return "falhou";
      const D=window.SevenSinsDebug3D;
      return D && typeof D.fly === "function" && (!D.riteState || D.riteState().ready) ? "pronto" : false;
    }, null, { timeout: 240000 }).then(h => h.jsonValue());
    assert.equal(reopenedReady, "pronto", "jogo real deve reabrir antes da leitura pós-reload");
    assert.equal(await page.locator("#heart-count").textContent(), "10");
    const storedAfterReload = await page.evaluate(() => JSON.parse(localStorage.getItem("seven-sins-hearts")));
    assert.equal(storedAfterReload?.hearts, 10, "reload deve preservar os corações regenerados no armazenamento");
    assert.ok(Number.isFinite(storedAfterReload?.since), "timestamp persistido deve continuar válido");
    await page.screenshot({ path: path.join(evidence, "after-reload.png"), fullPage: true });
    fs.writeFileSync(path.join(evidence, "state-after-reload.json"), JSON.stringify({ hud: await page.locator("#heart-count").textContent(), stored: await page.evaluate(() => JSON.parse(localStorage.getItem("seven-sins-hearts"))), errors }, null, 2));
    assert.deepEqual(errors, [], "sem erros JS não tratados");
    console.log("Smoke HUD/reload: PASS");
    await context.close();
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
