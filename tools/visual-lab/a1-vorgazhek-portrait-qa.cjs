'use strict';
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const headUrl = (process.env.VISUAL_BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const baselineUrl = (process.env.VISUAL_BASELINE_URL || '').replace(/\/$/, '');
const out = path.resolve(process.env.VISUAL_OUTPUT || 'visual-lab-results/a1-vorgazhek-portrait');
fs.mkdirSync(out, { recursive: true });
const report = {
  ok: false,
  method: 'batalha real bishop2; sem SevenSinsDebug3D.view; paisagem → rotação 393×852 + portrait inicial',
  renderer: 'Chromium SwiftShader — não representa FPS Android',
  screenshots: [],
  errors: { baseline: [], head: [] },
  networkFailures: { baseline: [], head: [] },
  baseline: null,
  head: null
};

function listen(page, stage) {
  page.on('pageerror', err => report.errors[stage].push(err.message));
  page.on('console', msg => {
    if (msg.type() === 'error' && /shader|WebGL|compile|INVALID/i.test(msg.text())) report.errors[stage].push(msg.text());
  });
  page.on('response', res => {
    if (res.status() >= 400 && !res.url().endsWith('favicon.ico')) {
      report.networkFailures[stage].push({ status: res.status(), url: res.url() });
    }
  });
}

async function installThreeRoutes(context) {
  const threeRoot = path.resolve(path.dirname(require.resolve('three')), '..');
  await context.route(/^https:\/\/cdn\.jsdelivr\.net\/npm\/three@0\.160\.0\//, async route => {
    const pathname = new URL(route.request().url()).pathname;
    const relative = pathname.split('/three@0.160.0/')[1];
    const file = path.join(threeRoot, relative || '');
    if (relative && fs.existsSync(file)) {
      await route.fulfill({ path: file, contentType: 'text/javascript' });
    } else {
      await route.continue();
    }
  });
}

async function openBattle(url, stage, viewport) {
  const videoDir = path.join(out, 'videos', stage);
  fs.mkdirSync(videoDir, { recursive: true });
  const context = await chromium.launchPersistentContext
    ? null
    : await chromium.newContext({ viewport, deviceScaleFactor: 1, recordVideo: { dir: videoDir } });
  await installThreeRoutes(context);
  const page = await context.newPage();
  listen(page, stage.startsWith('base') ? 'baseline' : 'head');
  try {
    await page.goto(url + '/mundo-3d-prototype.html?testeDimensao=bishop2&debug3d=1', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    await page.waitForFunction(() => !!window.SevenSinsDebug3D, null, { timeout: 180000 });
    await page.waitForFunction(() => {
      const d = window.SevenSinsDebug3D;
      const s = d && d.dimState ? d.dimState() : null;
      if (s && s.vs && d.vsGo) d.vsGo();
      const n = d && d.dimState ? d.dimState() : null;
      return !!(n && n.battle && n.battle.active && n.battle.key === 'bishop2' && !n.vs && n.voidMode && n.squad);
    }, null, { timeout: 180000, polling: 100 });
    await page.evaluate(() => {
      SevenSinsDebug3D.god();
      SevenSinsDebug3D.speed(1);
    });
    await page.waitForTimeout(7600);
    await page.addStyleTag({ content: '#dim-test-panel,#admin-panel,#adm-panel{display:none!important}' });
    return { context, page };
  } catch (err) {
    try { await page.close(); } catch (_) {}
    try { await context.close(); } catch (_) {}
    throw err;
  }
}

async function inspect(page) {
  return page.evaluate(() => {
    const rect = selector => {
      const el = document.querySelector(selector);
      if (!el) return null;
      const r = el.getBoundingClientRect(), s = getComputedStyle(el);
      return {
        display: s.display, visibility: s.visibility, opacity: s.opacity,
        left: +r.left.toFixed(1), top: +r.top.toFixed(1),
        right: +r.right.toFixed(1), bottom: +r.bottom.toFixed(1),
        width: +r.width.toFixed(1), height: +r.height.toFixed(1),
        scrollWidth: el.scrollWidth, clientWidth: el.clientWidth
      };
    };
    const d = window.SevenSinsDebug3D;
    return {
      viewport: { width: innerWidth, height: innerHeight, aspect: +(innerWidth / innerHeight).toFixed(4) },
      bodyClass: document.body.classList.contains('bishop2-battle'),
      dimension: d && d.dimState ? d.dimState() : null,
      player: d && d.state ? d.state() : null,
      camera: d && d.cam ? d.cam() : null,
      bossName: document.querySelector('#enemy-name')?.textContent?.trim() || null,
      hud: {
        enemy: rect('#enemy-hud'),
        actions: rect('#actions'),
        stick: rect('#stick'),
        quest: rect('#quest-box'),
        top: rect('#top'),
        topRight: rect('#top-right'),
        player: rect('#player-hud'),
        coins: rect('#coin-pill'),
        hearts: rect('#heart-pill'),
        objective: rect('#objective-arrow')
      }
    };
  });
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(out, name + '.png'), timeout: 60000 });
  report.screenshots.push(name + '.png');
}

function overlaps(a, b) {
  if (!a || !b || a.width <= 0 || a.height <= 0 || b.width <= 0 || b.height <= 0) return false;
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function assertPortrait(state, label) {
  assert.equal(state.dimension?.battle?.key, 'bishop2', label + ': batalha correta');
  assert.equal(state.dimension?.battle?.active, true, label + ': batalha ativa');
  assert.equal(state.dimension?.squad, true, label + ': VORGAZHEK no fluxo de esquadra');
  assert.equal(state.dimension?.voidMode, true, label + ': dimensão ativa');
  assert.equal(state.bodyClass, true, label + ': escopo visual ativado');
  assert.equal(state.bossName, 'VORGAZHEK', label + ': nome do chefe');
  const h = state.hud, w = state.viewport.width, height = state.viewport.height;
  assert.ok(h.enemy && h.enemy.display !== 'none' && h.enemy.visibility !== 'hidden', label + ': barra do Bispo visível');
  assert.ok(h.enemy.width >= 200 && h.enemy.top >= 0 && h.enemy.bottom <= 150, label + ': barra do Bispo no topo');
  assert.equal(h.quest.display, 'none', label + ': missão recolhida');
  assert.equal(h.top.display, 'none', label + ': status inferior recolhido');
  assert.equal(h.coins.display, 'none', label + ': moedas recolhidas');
  assert.equal(h.hearts.display, 'none', label + ': corações recolhidos');
  assert.equal(h.objective.display, 'none', label + ': seta recolhida');
  assert.ok(h.actions.left >= 0 && h.actions.right <= w && h.actions.top >= height * .70 && h.actions.bottom <= height + 1, label + ': ações dentro da borda inferior direita');
  assert.ok(h.stick.left >= 0 && h.stick.right <= w && h.stick.top >= height * .70 && h.stick.bottom <= height + 1, label + ': joystick dentro da borda inferior esquerda');
  assert.ok(!overlaps(h.actions, h.stick), label + ': joystick e ações separados');
  assert.ok(!overlaps(h.enemy, h.actions) && !overlaps(h.enemy, h.stick), label + ': barra não cobre controles');
  assert.ok(!overlaps(h.enemy, h.player), label + ': barra não cobre vida do protagonista');
  assert.ok(h.topRight.right <= w + 1, label + ': menu dentro do viewport');
}

async function finish(context, page) {
  const video = page.video();
  await page.close();
  const videoPath = video ? await video.path() : null;
  await context.close();
  return videoPath;
}

async function runLandscapeThenPortrait(url, stage, assertHead) {
  const { context, page } = await openBattle(url, stage, { width: 960, height: 540 });
  let videoPath = null;
  try {
    const landscape = await inspect(page);
    await shot(page, stage + '-paisagem');
    await page.setViewportSize({ width: 393, height: 852 });
    await page.waitForTimeout(1900);
    const portrait = await inspect(page);
    await shot(page, stage + '-retrato-rotacao');
    if (assertHead) assertPortrait(portrait, stage + ' retrato após rotação');
    return { landscape, portrait, videoPath: null };
  } finally {
    videoPath = await finish(context, page);
    if (assertHead && report.head) report.head.video = videoPath;
    else if (report.baseline) report.baseline.video = videoPath;
  }
}

async function runFreshPortrait(url, stage) {
  const { context, page } = await openBattle(url, stage, { width: 393, height: 852 });
  let videoPath = null;
  try {
    const portrait = await inspect(page);
    await shot(page, stage + '-retrato-inicial');
    assertPortrait(portrait, stage + ' retrato inicial');
    return portrait;
  } finally {
    videoPath = await finish(context, page);
    if (report.head) report.head.portraitVideo = videoPath;
  }
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
  });
  try {
    if (baselineUrl) {
      report.baseline = {};
      report.baseline = await runLandscapeThenPortrait(baselineUrl, '01-base', false);
    }
    report.head = {};
    report.head = await runLandscapeThenPortrait(headUrl, '03-head', true);
    report.head.freshPortrait = await runFreshPortrait(headUrl, '05-head');
    assert.deepEqual(report.errors.head, [], 'sem erros JS/WebGL no HEAD');
    assert.deepEqual(report.networkFailures.head, [], 'sem falhas de rede no HEAD');
    report.ok = true;
  } catch (err) {
    report.failure = { name: err.name || 'Error', message: err.message || String(err), stack: err.stack || null };
    throw err;
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(out, 'resultado.json'), JSON.stringify(report, null, 2) + '\n');
  }
  console.log(JSON.stringify({ ok: report.ok, screenshots: report.screenshots, head: report.head, errors: report.errors, networkFailures: report.networkFailures }, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
