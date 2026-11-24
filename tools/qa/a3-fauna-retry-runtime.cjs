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
  requestedSha: process.env.PR_HEAD_SHA || process.env.GITHUB_SHA || null,
  workflowSha: process.env.GITHUB_SHA || null,
  branch: process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || null,
  testedSha: null,
  viewport,
  requests: [],
  responses: [],
  requestFailures: [],
  unexpectedRequestFailures: [],
  pageErrors: [],
  consoleErrors: [],
  expectedConsoleErrors: [],
  triggerCandidate: null,
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
let expectedAbortConsolePending = false;
let expectedAbortConsoleDeadline = 0;
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
  await page.addInitScript(() => {
    localStorage.setItem('seven-sins-3d-prologo-ceu', '1');
    localStorage.setItem('seven-sins-3d-graphics', 'low');
    localStorage.setItem('sevenSins3DCampaignV6', JSON.stringify({ version: 6, act1Rev: 2, questStep: 1, awakeningSeen: true, playerName: 'A3 QA', actCardSeen: true }));
  });
  videoHandle = page.video();
  page.setDefaultTimeout(30000);
  page.on('pageerror', e => report.pageErrors.push(String(e.message || e).slice(0, 500)));
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const message = m.text().slice(0, 500);
    if (expectedAbortConsolePending && Date.now() <= expectedAbortConsoleDeadline && /net::ERR_FAILED/i.test(message)) {
      expectedAbortConsolePending = false;
      report.expectedConsoleErrors.push(message);
      return;
    }
    report.consoleErrors.push(message);
  });
  page.on('requestfailed', r => {
    const failure = { url: r.url(), error: (r.failure() || {}).errorText || 'request failed' };
    if (r.url().endsWith('/Coelhinho.glb') && report.firstAttemptAborted && requestCount === 1) report.requestFailures.push(failure);
    else report.unexpectedRequestFailures.push(failure);
  });
  page.on('response', r => {
    if (r.url().endsWith('/Coelhinho.glb')) report.responses.push({ status: r.status(), url: r.url() });
  });

  await page.route('**/Coelhinho.glb', async route => {
    requestCount++;
    report.requests.push({ attempt: requestCount, url: route.request().url() });
    if (requestCount === 1) {
      report.firstAttemptAborted = true;
      expectedAbortConsolePending = true;
      expectedAbortConsoleDeadline = Date.now() + 1000;
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
      typeof D.camFix === 'function' && typeof D.groundAt === 'function' &&
      typeof D.speed === 'function' && typeof D.setHour === 'function' &&
      typeof D.freeRoam === 'function' && D.faunaState();
  }, null, { timeout: 240000 });

  // Find a real coelho cell. Trigger the first failure once, then leave the player near it
  // so the production proximity scanner—not a second debug call—performs the retry and spawn.
  const trigger = await page.evaluate(async () => {
    const D = window.SevenSinsDebug3D;
    const { FAUNA, cellCandidate, FAUNA_CELL } = await import('./fauna3d.js');
    D.freeRoam();
    D.speed(3);
    D.setHour(5.5); // coelho ativo; demais aves diurnas e grilos inativos

    const candidates = [];
    const c0x = Math.floor(-1460 / FAUNA_CELL), c1x = Math.floor(-160 / FAUNA_CELL);
    const c0z = Math.floor(-165 / FAUNA_CELL), c1z = Math.floor(50 / FAUNA_CELL);
    for (let cx = c0x; cx <= c1x; cx++) for (let cz = c0z; cz <= c1z; cz++) {
      const c = cellCandidate('coelho', cx, cz);
      if (c && FAUNA.coelho.biomes.includes(D.faunaBiome(c.x, c.z))) candidates.push(c);
    }

    for (const c of candidates) {
      const px = c.x, pz = c.z - 11, y = D.groundAt(px, pz) + 1.5;
      D.teleport(px, pz);
      D.camFix([px, y, pz], [px, y, pz - 2]); // candidato fica atrás da câmera, a 11 m
      for (let i = 0; i < 12; i++) await new Promise(requestAnimationFrame);

      let state = D.faunaState();
      if (state.loaded.includes('coelho')) return { candidate: c, state, alreadyLoaded: true };
      if (state.loadFailures > 0 && state.lastLoadError?.kind === 'coelho') {
        return { candidate: c, state, waitingForRetry: true };
      }

      const beforeLoads = state.loads;
      await D.faunaSpawn('coelho', c.x, c.z, 0);
      state = D.faunaState();
      if (state.loadFailures > 0 && state.lastLoadError?.kind === 'coelho') return { candidate: c, state };
      if (state.loaded.includes('coelho')) return { candidate: c, state, alreadyLoaded: true };

      if (state.loads > beforeLoads) {
        for (let i = 0; i < 90; i++) {
          await new Promise(requestAnimationFrame);
          state = D.faunaState();
          if (state.loadFailures > 0 && state.lastLoadError?.kind === 'coelho') return { candidate: c, state };
          if (state.loaded.includes('coelho')) return { candidate: c, state, alreadyLoaded: true };
        }
      }
    }
    return null;
  });

  assert.ok(trigger?.candidate, 'o QA precisa encontrar um candidato real de coelho em habitat');
  report.triggerCandidate = trigger.candidate;
  let state = await page.evaluate(() => window.SevenSinsDebug3D.faunaState());
  report.firstFailureState = state;
  assert.ok(report.firstAttemptAborted, 'a primeira requisição real do GLB precisa ter sido abortada');
  assert.ok(state.loadFailures >= 1, 'a falha precisa chegar ao catch de produção');
  assert.ok(!state.loaded.includes('coelho'), 'o GLB não pode aparecer como carregado após a falha');
  assert.equal(requestCount, 1, 'somente a tentativa inicial deve ter ocorrido antes do retry');

  // Keep the player at the same valid cell; update()/scan() must retry automatically after backoff.
  await page.waitForFunction(() => {
    const s = window.SevenSinsDebug3D?.faunaState?.();
    return s && s.loaded.includes('coelho') && s.loadRetries >= 1 &&
      s.list.some(a => a.kind === 'coelho' && !a.qa);
  }, null, { timeout: 30000 });

  state = await page.evaluate(() => window.SevenSinsDebug3D.faunaState());
  report.retryState = state;
  assert.ok(state.loadRetries >= 1, 'o scanner precisa contabilizar o retry');
  assert.ok(state.lastLoadRecovery?.kind === 'coelho', 'a recuperação precisa ser identificada no diagnóstico');
  assert.ok(report.responses.some(r => r.status === 200), 'a segunda requisição precisa receber HTTP 200');
  assert.equal(requestCount, 2, 'o retry deve ser a segunda e única requisição adicional');
  assert.equal(report.requestFailures.length, 1, 'somente a falha deliberada deve ocorrer');
  const animal = state.list.find(a => a.kind === 'coelho' && !a.qa);
  assert.ok(animal, 'o scanner de proximidade deve criar um coelho natural após recuperar o GLB');
  report.spawnedAnimal = { biome: await page.evaluate(({ x, z }) => window.SevenSinsDebug3D.faunaBiome(x, z), animal), ...animal };
  assert.equal(report.spawnedAnimal.qa, false, 'o animal capturado precisa vir do scanner normal, não do spawn forçado de QA');

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
  assert.ok(finalState.list.some(a => a.kind === 'coelho' && !a.qa), 'o coelho natural deve permanecer vivo após a captura');
  report.finalState = finalState;
  assert.deepEqual(report.pageErrors, [], 'não pode haver exceção no runtime');
  assert.deepEqual(report.consoleErrors, [], 'não pode haver erro inesperado no console');
  assert.deepEqual(report.unexpectedRequestFailures, [], 'não pode haver falha de rede além do abort deliberado do Coelhinho.glb');
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
            if (path.resolve(src) !== path.resolve(dest)) fs.renameSync(src, dest);
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
