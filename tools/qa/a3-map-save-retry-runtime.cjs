'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');

const base = (process.env.VISUAL_BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const out = path.resolve(process.env.VISUAL_OUTPUT || 'visual-lab-results', 'a3-map-save-retry');
const mapSource = fs.readFileSync(path.resolve(__dirname, '../../map3d.js'), 'utf8');
const mapKeyMatch = mapSource.match(/export const MAP_STORE_KEY\s*=\s*['"]([^'"]+)['"]/);
assert.ok(mapKeyMatch, 'map3d.js precisa expor MAP_STORE_KEY');
const mapKey = mapKeyMatch[1];
const eventsKey = '__a3_map_save_events';
const failKey = '__a3_map_save_fail_once';
const viewport = { width: 393, height: 852 };
const report = {
  schema: 1,
  agent: 'A3',
  scenario: 'runtime-real / map save quota retry + reload',
  renderer: 'Chromium headless + SwiftShader (CPU); não representa FPS Android',
  requestedSha: process.env.PR_HEAD_SHA || process.env.GITHUB_SHA || null,
  workflowSha: process.env.GITHUB_SHA || null,
  branch: process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || null,
  testedSha: null,
  viewport,
  mapStoreKey: mapKey,
  firstPage: null,
  afterReload: null,
  pageErrors: [],
  consoleErrors: [],
  requestFailures: [],
  status: 'PENDING',
  fatal: null,
  limitations: ['Teste real do runtime e reload em Chromium; não substitui aparelho Android físico.']
};

let browser;
let context;
let page;
let fatal = null;

async function waitForWorld() {
  await page.waitForFunction(() => {
    const loading = document.getElementById('loading');
    return !!window.SevenSinsDebug3D && !!document.querySelector('canvas#scene') &&
      (!loading || loading.classList.contains('hidden'));
  }, null, { timeout: 240000 });
}

async function hideQaAdminOverlay() {
  // ?debug3d=1 injeta um atalho ADM de teleporte que cobre o botão de mapa no viewport mobile.
  // Ele não pertence à UI do jogador; removê-lo do hit-testing mantém o toque real no botão de mapa.
  await page.addStyleTag({
    content: '#adm-tp-vulcao-ato2-quick { display: none !important; }'
  });
}

async function captureMap(label) {
  const toggle = page.locator('#map-toggle-3d');
  await toggle.waitFor({ state: 'visible' });
  const hitTarget = await toggle.evaluate(element => {
    const rect = element.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return hit?.id || hit?.parentElement?.id || hit?.tagName || null;
  });
  assert.equal(hitTarget, 'map-toggle-3d', 'o botão real do mapa precisa ser o alvo de toque após isolar controles ADM de QA');
  await toggle.tap();
  const panel = page.locator('#world-map');
  await panel.waitFor({ state: 'visible' });
  const canvas = page.locator('#world-map-canvas');
  await canvas.waitFor({ state: 'visible' });
  const dimensions = await canvas.evaluate(element => ({ width: element.width, height: element.height }));
  assert.ok(dimensions.width > 0 && dimensions.height > 0, 'o canvas do mapa precisa ter dimensões reais');
  await page.screenshot({ path: path.join(out, `map-${label}.png`), fullPage: true });
  await page.locator('#world-map-close').tap();
  await panel.waitFor({ state: 'hidden' });
  return dimensions;
}

async function main() {
  fs.mkdirSync(out, { recursive: true });
  report.testedSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  assert.equal(report.testedSha, report.requestedSha, 'o relatório precisa corresponder ao SHA solicitado');

  browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-webgl', '--ignore-gpu-blocklist',
      '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
  });
  context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true
  });
  page = await context.newPage();
  page.setDefaultTimeout(30000);
  page.on('pageerror', error => report.pageErrors.push(String(error.message || error).slice(0, 500)));
  page.on('console', message => {
    if (message.type() === 'error') report.consoleErrors.push(message.text().slice(0, 500));
  });
  page.on('requestfailed', request => report.requestFailures.push({
    url: request.url(),
    error: (request.failure() || {}).errorText || 'request failed'
  }));

  await page.addInitScript(({ mapKey, eventsKey, failKey }) => {
    const originalSetItem = Storage.prototype.setItem;
    if (!localStorage.getItem(mapKey)) {
      originalSetItem.call(localStorage, mapKey, JSON.stringify({
        cells: '',
        pois: [],
        waystones: []
      }));
    }
    originalSetItem.call(localStorage, 'seven-sins-3d-prologo-ceu', '1');
    originalSetItem.call(localStorage, 'seven-sins-3d-graphics', 'low');
    originalSetItem.call(localStorage, 'sevenSins3DCampaignV6', JSON.stringify({
      version: 6,
      act1Rev: 2,
      questStep: 1,
      act1Sub: 1,
      awakeningSeen: true,
      playerName: 'A3 QA',
      actCardSeen: true
    }));

    Storage.prototype.setItem = function(key, value) {
      if (this === localStorage && key === mapKey) {
        const events = JSON.parse(sessionStorage.getItem(eventsKey) || '[]');
        if (sessionStorage.getItem(failKey) === 'armed') {
          originalSetItem.call(sessionStorage, failKey, '1');
          events.push({ attempt: events.length + 1, outcome: 'quota', key, phase: 'after-gameplay-setup' });
          originalSetItem.call(sessionStorage, eventsKey, JSON.stringify(events));
          throw new DOMException('A3 injected quota failure', 'QuotaExceededError');
        }
        const snapshot = JSON.parse(value);
        const result = originalSetItem.call(this, key, value);
        events.push({
          attempt: events.length + 1,
          outcome: 'stored',
          key,
          pois: snapshot.pois,
          waystones: snapshot.waystones,
          cellsLength: snapshot.cells ? snapshot.cells.length : 0
        });
        originalSetItem.call(sessionStorage, eventsKey, JSON.stringify(events));
        return result;
      }
      return originalSetItem.call(this, key, value);
    };
  }, { mapKey, eventsKey, failKey });

  await page.goto(base + '/mundo-3d-prototype.html?debug3d=1&a3MapSaveRetryQA=1', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });
  await waitForWorld();
  await hideQaAdminOverlay();

  const initialMap = await page.evaluate(({ mapKey }) => {
    const snapshot = JSON.parse(localStorage.getItem(mapKey) || 'null');
    return { pois: snapshot?.pois || [], waystones: snapshot?.waystones || [] };
  }, { mapKey });
  assert.ok(!initialMap.pois.includes('vila'), 'o POI não pode estar pré-semeado pelo harness');
  assert.ok(!initialMap.waystones.includes('abrigo-vila'), 'o abrigo não pode estar pré-semeado pelo harness');
  const preArmEventCount = await page.evaluate(({ eventsKey }) =>
    JSON.parse(sessionStorage.getItem(eventsKey) || '[]').length, { eventsKey });

  // A falha é armada somente depois do carregamento inicial. O mapa começa vazio:
  // a vila precisa ser descoberta e o abrigo registrado pelo fluxo real do jogo.
  await page.evaluate(({ failKey }) => sessionStorage.setItem(failKey, 'armed'), { failKey });
  await page.evaluate(() => {
    const api = window.SevenSinsDebug3D;
    if (!api || typeof api.teleport !== 'function') throw new Error('API QA teleport indisponível');
    api.teleport(-4.6, -36.5, Math.PI);
  });
  await page.waitForFunction(() => {
    const toast = document.getElementById('quest-toast');
    return toast?.textContent?.includes('LOCAL DESCOBERTO') &&
      toast.textContent.includes('VILA DA CLAREIRA');
  }, null, { timeout: 45000 });
  // A interação exige estar sobre o piso superior do abrigo, não no terreno sob a plataforma.
  // teleport(x,z) posiciona os pés no terreno; a plataforma tem dois degraus caminháveis de 0,22 m.
  const platformPlacement = await page.evaluate(() => {
    const api = window.SevenSinsDebug3D;
    if (!api || typeof api.navCatalog !== 'function' || typeof api.placeAt !== 'function') {
      throw new Error('APIs QA de superfície caminhável indisponíveis');
    }
    const surfaces = api.navCatalog(-4.6, -36.5, 6).surfaces;
    const top = surfaces.find(surface => surface.n === 'abrigo-degrau2' &&
      Math.hypot(surface.x + 4.6, surface.z + 36.5) < .2);
    if (!top || !Number.isFinite(top.y)) {
      throw new Error('Piso superior do Abrigo da Vila não encontrado: ' +
        JSON.stringify(surfaces.filter(surface => String(surface.n).startsWith('abrigo-'))));
    }
    const walkState = api.placeAt(-4.6, top.y, -36.5, Math.PI);
    return { surface: top, walkState };
  });
  assert.equal(platformPlacement.walkState.surface, 'abrigo-degrau2',
    'o herói precisa apoiar os pés no anel superior real do abrigo');
  assert.ok(Math.abs(platformPlacement.walkState.y - platformPlacement.walkState.surfaceY) < .01,
    'os pés precisam coincidir com a altura da superfície caminhável');
  assert.ok(platformPlacement.walkState.y > platformPlacement.walkState.terrain,
    'o herói precisa estar acima do terreno, sobre a plataforma elevada');
  report.platformPlacement = platformPlacement;
  // Sub 1 representa a chegada à vila já concluída; sub 0 dispara a cutscene de chegada
  // ao entrar no raio da praça e mantém o botão contextual oculto.
  await page.waitForTimeout(250);
  report.registrationProbe = await page.evaluate(() => {
    const button = document.getElementById('talk-button');
    const api = window.SevenSinsDebug3D;
    let campaign = null;
    try { campaign = JSON.parse(localStorage.getItem('sevenSins3DCampaignV6') || 'null'); } catch (_) {}
    return {
      label: button?.textContent || null,
      hidden: !!button?.classList.contains('hidden'),
      state: api.state(),
      walkState: api.walkState(),
      campaign,
      cineSkipHidden: !!document.getElementById('cine-skip')?.hidden,
      cineSayHidden: !!document.getElementById('cine-say')?.hidden,
      dialogueHidden: !!document.getElementById('dialog-panel')?.classList.contains('hidden')
    };
  });

  await page.waitForFunction(() => {
    const button = document.getElementById('talk-button');
    return button && !button.classList.contains('hidden') &&
      button.textContent.includes('REGISTRAR ESTE ABRIGO');
  }, null, { timeout: 30000 });
  report.registrationProbe = await page.evaluate(() => {
    const button = document.getElementById('talk-button');
    const api = window.SevenSinsDebug3D;
    return {
      label: button?.textContent || null,
      hidden: !!button?.classList.contains('hidden'),
      state: api.state(),
      walkState: api.walkState()
    };
  });
  const registrationLabel = await page.locator('#talk-button').innerText();
  await page.locator('#talk-button').tap();
  await page.waitForFunction(() => {
    const toast = document.getElementById('quest-toast');
    return toast?.textContent?.includes('ABRIGO REGISTRADO') &&
      toast.textContent.includes('ABRIGO DA VILA');
  }, null, { timeout: 15000 });
  report.gameplayInteraction = {
    initialMap,
    preArmEventCount,
    teleportedTo: [-4.6, -36.5],
    discoveredPoi: 'vila',
    registrationLabel,
    registeredWaystone: 'abrigo-vila'
  };

  await page.waitForFunction(({ eventsKey, preArmEventCount }) => {
    const events = JSON.parse(sessionStorage.getItem(eventsKey) || '[]').slice(preArmEventCount);
    return events.some(event => event.outcome === 'quota') &&
      events.some(event => event.outcome === 'stored' &&
        event.pois?.includes('vila') &&
        event.waystones?.includes('abrigo-vila') &&
        event.cellsLength > 0);
  }, { eventsKey, preArmEventCount }, { timeout: 45000 });

  report.firstPage = await page.evaluate(({ mapKey, eventsKey }) => ({
    events: JSON.parse(sessionStorage.getItem(eventsKey) || '[]'),
    snapshot: JSON.parse(localStorage.getItem(mapKey) || 'null')
  }), { mapKey, eventsKey });
  const postArmEvents = report.firstPage.events.slice(report.gameplayInteraction.preArmEventCount);
  assert.equal(postArmEvents[0]?.outcome, 'quota', 'a primeira escrita após armar a falha deve falhar por quota');
  assert.ok(postArmEvents.some(event => event.outcome === 'stored' &&
    event.pois?.includes('vila') &&
    event.waystones?.includes('abrigo-vila') &&
    event.cellsLength > 0), 'o retry precisa persistir POI, abrigo e névoa descobertos no gameplay');
  assert.ok(report.firstPage.snapshot?.pois?.includes('vila'), 'o POI precisa permanecer no snapshot');
  assert.ok(report.firstPage.snapshot?.waystones?.includes('abrigo-vila'), 'o abrigo precisa permanecer no snapshot');
  assert.ok(report.firstPage.snapshot?.cells?.length > 0, 'a névoa revelada precisa ser persistida');
  report.firstPage.mapCanvas = await captureMap('before-reload');

  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitForWorld();
  await hideQaAdminOverlay();
  report.afterReload = await page.evaluate(({ mapKey, eventsKey }) => ({
    events: JSON.parse(sessionStorage.getItem(eventsKey) || '[]'),
    snapshot: JSON.parse(localStorage.getItem(mapKey) || 'null')
  }), { mapKey, eventsKey });
  assert.ok(report.afterReload.snapshot?.pois?.includes('vila'), 'o POI deve continuar após recarregar o mundo');
  assert.ok(report.afterReload.snapshot?.waystones?.includes('abrigo-vila'), 'o abrigo deve continuar após recarregar o mundo');
  assert.ok(report.afterReload.snapshot?.cells?.length > 0, 'a névoa deve continuar após recarregar o mundo');
  report.afterReload.mapCanvas = await captureMap('after-reload');
  assert.deepEqual(report.pageErrors, [], 'o runtime não pode lançar exceções');
  assert.deepEqual(report.consoleErrors, [], 'o runtime não pode emitir erros no console');
  assert.deepEqual(report.requestFailures, [], 'o runtime não pode falhar requisições');
  report.visualEvidence = ['map-before-reload.png', 'map-after-reload.png'];
  report.status = 'PASS';
}

(async () => {
  try {
    await main();
  } catch (error) {
    fatal = String(error && error.stack || error);
    report.status = 'FAIL';
    report.fatal = String(error && error.message || error);
  } finally {
    await context?.close().catch(() => {});
    await browser?.close().catch(() => {});
    report.finishedAt = new Date().toISOString();
    report.fatal = report.fatal || fatal;
    fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
    console.log('A3 map save runtime: ' + report.status + ' · events=' +
      (report.firstPage?.events?.length || 0) + ' · artifact=' + out);
  }
  if (fatal) process.exitCode = 1;
})();
