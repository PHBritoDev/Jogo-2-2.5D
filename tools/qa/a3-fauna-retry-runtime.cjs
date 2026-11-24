'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');

const base = (process.env.VISUAL_BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const out = path.resolve(process.env.VISUAL_OUTPUT || 'visual-lab-results', 'a3-fauna-retry');
const viewport = { width: 852, height: 393 };
const report = {
  schema: 1,
  agent: 'A3',
  scenario: 'runtime-real / Coelhinho.glb',
  renderer: 'Chromium headless + SwiftShader (CPU); não representa FPS Android',
  requestedSha: process.env.GITHUB_SHA || null,
  branch: process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || null,
  testedSha: null,
  viewport,
  requests: [],
  responses: [],
  requestFailures: [],
  pageErrors: [],
  consoleErrors: [],
  firstAttemptAborted: false,
  firstFailureState: null,
  retryState: null,
  spawnedAnimal: null,
  screenshot: null,
  video: null,
  visualReviewRequired: true,
  limitations: ['Teste browser controlado com API de QA existente; não substitui caminhada manual nem Android físico.']
};

let browser;
let context;
let page;
let fatal = null;
let requestCount = 0;
let videoHandle = null;

function commitSha() {
  try { return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); }
  catch { return process.env.GITHUB_SHA || null; }
}

async function main() {
  fs.mkdirSync(path.join(out, 'videos'), { recursive: true });
  report.testedSha = commitSha();
  assert.equal(report.testedSha, report.requestedSha, 'o artifact precisa corresponder ao SHA solicitado pelo evento PR');

  browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-webgl', '--ignore-gpu-blocklist',
      '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
  });
  context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    recordVideo: { dir: path.join(out, 'videos'), size: viewport }
  });
  page = await context.newPage();
  videoHandle = page.video();
  page.setDefaultTimeout(30000);
  page.on('pageerror', e => report.pageErrors.push(String(e.message || e).slice(0, 500)));
  page.on('console', m => {
    if (m.type() === 'error') report.consoleErrors.push(m.text().slice(0, 500));
  });
  page.on('requestfailed', r => {
    if (r.url().endsWith('/Coelhinho.glb')) report.requestFailures.push({
      url: r.url(), error: (r.failure() || {}).errorText || 'request failed'
    });
  });
  page.on('response', r => {
    if (r.url().endsWith('/Coelhinho.glb')) report.responses.push({ status: r.status(), url: r.url() });
  });

  await page.route('**/Coelhinho.glb', async route => {
    requestCount++;
    report.requests.push({ attempt: requestCount, url: route.request().url() });
    if (requestCount === 1) {
      report.firstAttemptAborted = true;
      await route.abort('failed');
    } else {
      await route.continue();
    }
  });

  await page.goto(base + '/mundo-3d-prototype.html?debug3d=1&a3FaunaRetryQA=1', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });
  await page.waitForFunction(() => {
    const D = window.SevenSinsDebug3D;
    return D && typeof D.faunaState === 'function' && typeof D.faunaSpawn === 'function' &&
      typeof D.faunaBiome === 'function' && typeof D.teleport === 'function' &&
      typeof D.freeze === 'function' && D.faunaState();
  }, null, { timeout: 240000 });

  // Freeze the simulation clock while the first request is deliberately failed.
  await page.evaluate(() => {
    const D = window.SevenSinsDebug3D;
    D.freeRoam();
    D.setHour(10); // coelho ativo
    D.freeze(true);
    D.teleport(-14, -105, 0);
  });

  let state = await page.evaluate(() => window.SevenSinsDebug3D.faunaState());
  if (!state.loaded.includes('coelho') && state.loadFailures === 0) {
    await page.evaluate(async () => {
      const D = window.SevenSinsDebug3D;
      await D.faunaSpawn('coelho', -14, -105, 0);
    });
    await page.waitForFunction(() => {
      const s = window.SevenSinsDebug3D?.faunaState?.();
      return s && s.loadFailures >= 1;
    }, null, { timeout: 30000 });
  }

  state = await page.evaluate(() => window.SevenSinsDebug3D.faunaState());
  report.firstFailureState = state;
  assert.ok(report.firstAttemptAborted, 'a primeira requisição real do GLB precisa ter sido abortada');
  assert.ok(state.loadFailures >= 1, 'a falha precisa chegar ao catch de produção');
  assert.ok(!state.loaded.includes('coelho'), 'o GLB não pode aparecer como carregado após a falha');

  // Restore real time. The next load must respect retryAt, then recover through the same GLTFLoader path.
  await page.evaluate(() => window.SevenSinsDebug3D.realtime());
  let retrySpawn = false;
  for (let i = 0; i < 14; i++) {
    await page.waitForTimeout(400);
    state = await page.evaluate(() => window.SevenSinsDebug3D.faunaState());
    if (state.loaded.includes('coelho')) break;
    retrySpawn = await page.evaluate(async () => {
      const D = window.SevenSinsDebug3D;
      return D.faunaSpawn('coelho', -14, -105, 0);
    });
  }
  await page.waitForFunction(() => {
    const s = window.SevenSinsDebug3D?.faunaState?.();
    return s && s.loaded.includes('coelho');
  }, null, { timeout: 30000 });

  state = await page.evaluate(() => window.SevenSinsDebug3D.faunaState());
  report.retryState = state;
  assert.ok(state.loadRetries >= 1, 'a segunda tentativa precisa ser contabilizada como retry');
  assert.ok(state.loadFailures >= 1, 'a falha inicial deve permanecer no diagnóstico');
  assert.ok(report.responses.some(r => r.status === 200), 'a segunda requisição precisa receber HTTP 200');
  assert.ok(requestCount >= 2, 'deve existir ao menos uma requisição após a falha inicial');

  // The real model is loaded. Find a safe meadow/forest point and use the existing QA spawn hook.
  const spawn = await page.evaluate(async () => {
    const D = window.SevenSinsDebug3D;
    const anchors = [[-14, -105], [-30, -120], [-20, -135], [-42, -105]];
    const offsets = [0, 3, -3, 6, -6, 9, -9, 12, -12];
    for (const [ax, az] of anchors) {
      for (const dx of offsets) for (const dz of offsets) {
        const x = ax + dx, z = az + dz;
        const biome = D.faunaBiome(x, z);
        if (!['prado', 'floresta', 'vale'].includes(biome)) continue;
        const ok = await D.faunaSpawn('coelho', x, z, 0);
        if (!ok) continue;
        const animal = D.faunaState().list.find(a => a.kind === 'coelho' && a.qa);
        if (animal) return { biome, animal };
      }
    }
    return null;
  });
  assert.ok(spawn?.animal, 'o Coelhinho.glb carregado precisa gerar uma entidade viva em habitat válido');
  report.spawnedAnimal = { biome: spawn.biome, ...spawn.animal };
  assert.ok(report.spawnedAnimal.qa, 'a entidade capturada deve ser o spawn de QA identificado');

  await page.addStyleTag({
    content: 'body *{visibility:hidden!important}canvas#scene{visibility:visible!important}'
  });
  await page.evaluate(a => {
    const D = window.SevenSinsDebug3D;
    D.freeRoam();
    D.fly([a.x + 2.8, a.y + 1.5, a.z + 2.8], [a.x, a.y + 0.2, a.z]);
  }, report.spawnedAnimal);
  await page.waitForTimeout(1400);
  const screenshot = path.join(out, 'coelho-apos-retry.png');
  await page.screenshot({ path: screenshot, fullPage: false });
  report.screenshot = path.basename(screenshot);
  await page.waitForTimeout(4000);

  const finalState = await page.evaluate(() => window.SevenSinsDebug3D.faunaState());
  assert.ok(finalState.list.some(a => a.kind === 'coelho'), 'o coelho deve permanecer vivo após a captura');
  report.finalState = finalState;
  report.status = 'PASS';
}

(async () => {
  try {
    await main();
  } catch (e) {
    fatal = String(e && e.stack || e);
    report.status = 'FAIL';
    report.fatal = String(e && e.message || e);
  } finally {
    if (context) {
      await context.close().catch(() => {});
      if (videoHandle) {
        try {
          const src = await videoHandle.path();
          const dest = path.join(out, 'videos', 'a3-fauna-retry.webm');
          if (fs.existsSync(src)) {
            if (path.resolve(src) !== path.resolve(dest)) fs.copyFileSync(src, dest);
            report.video = path.relative(out, dest);
          }
        } catch (e) {
          report.videoError = String(e.message || e);
        }
      }
    }
    await browser?.close().catch(() => {});
    report.requestCount = requestCount;
    report.finishedAt = new Date().toISOString();
    report.fatal = report.fatal || fatal;
    fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
    console.log('A3 fauna runtime: ' + report.status + ' · requests=' + requestCount +
      ' · retries=' + (report.retryState?.loadRetries ?? 0) + ' · artifact=' + out);
  }
  if (fatal) process.exitCode = 1;
})();
