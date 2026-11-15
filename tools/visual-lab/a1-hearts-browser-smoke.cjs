"use strict";
// Smoke real do HUD/persistência: executa o HTML 3D, não mocks de funções.
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({ headless: true, args: ["--enable-webgl", "--use-gl=angle", "--use-angle=swiftshader", "--disable-web-security"] });
  try {
    const context = await browser.newContext({ viewport: { width: 852, height: 393 } });
    await context.addInitScript(() => {
      localStorage.setItem("seven-sins-hearts", JSON.stringify({ hearts: 2, since: 0, explained: true }));
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.goto("http://127.0.0.1:4173/mundo-3d-prototype.html?debug3d=1", { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForFunction(() => document.getElementById("heart-count")?.textContent === "10" ||
      document.getElementById("loading")?.textContent?.includes("Falha ao montar o mundo 3D"), null, { timeout: 180000 });
    assert.equal(await page.locator("#heart-count").textContent(), "10", "HUD deve recuperar 10 corações do save antigo");
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("seven-sins-hearts")));
    assert.equal(stored?.hearts, 10, "regeneração offline deve ser persistida imediatamente, não só após novo tick");
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.getElementById("heart-count")?.textContent === "10", null, { timeout: 180000 });
    assert.equal(await page.locator("#heart-count").textContent(), "10");
    assert.deepEqual(errors, [], "sem erros JS não tratados");
    console.log("Smoke HUD/reload: PASS");
    await context.close();
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
