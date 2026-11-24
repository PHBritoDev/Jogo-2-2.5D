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
  method: 'batalha real bishop2; paisagem → rotação 393×852 + portrait inicial; pinch touch, roda e retorno 1ª/3ª pessoa',
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

async function openBattle(browser, url, stage, viewport) {
  const videoDir = path.join(out, 'videos', stage);
  fs.mkdirSync(videoDir, { recursive: true });
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, recordVideo: { dir: videoDir } });
  await installThreeRoutes(context);
  const page = await context.newPage();
  listen(page, stage.includes('base') ? 'baseline' : 'head');
  try {
    await page.goto(url + '/mundo-3d-prototype.html?testeDimensao=bishop2&debug3d=1', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    await page.waitForFunction(() => !!window.SevenSinsDebug3D, null, { timeout: 180000 });
    await page.waitForFunction(() => {
      const d = window.SevenSinsDebug3D;
      const s = d && d.dimState ? d.dimState() : null;
      const go = document.querySelector('#vs-go');
      return !!(s && s.battle && s.battle.key === 'bishop2' && s.vs && go && !go.disabled);
    }, null, { timeout: 180000, polling: 100 });
    let vsCard = null;
    if (viewport.width < viewport.height) {
      await page.waitForFunction(() => {
        const panel = document.querySelector('#vs-panel');
        const hero = document.querySelector('#vs-hero-img');
        const boss = document.querySelector('#vs-boss-img');
        return !!(panel && !panel.hidden && hero && boss && hero.complete && hero.naturalWidth > 0 && boss.complete && boss.naturalWidth > 0);
      }, null, { timeout: 120000, polling: 100 });
      await page.waitForTimeout(1500);
      vsCard = await inspectVsCard(page);
      assertVsPortrait(vsCard, stage + ' cartão VS portrait');
      await shot(page, stage + '-vs-retrato');
    }
    await page.evaluate(() => window.SevenSinsDebug3D.vsGo());
    await page.waitForFunction(() => {
      const d = window.SevenSinsDebug3D;
      const n = d && d.dimState ? d.dimState() : null;
      return !!(n && n.battle && n.battle.active && n.battle.key === 'bishop2' && !n.vs && n.voidMode && n.squad);
    }, null, { timeout: 180000, polling: 100 });
    await page.evaluate(() => {
      SevenSinsDebug3D.god();
      SevenSinsDebug3D.speed(1);
    });
    await page.waitForTimeout(7600);
    await page.addStyleTag({ content: '#dim-test-panel,#admin-panel,#adm-panel,[id^="adm-"],[id^="admin-"]{display:none!important}' });
    return { context, page, vsCard };
  } catch (err) {
    try { await page.close(); } catch (_) {}
    try { await context.close(); } catch (_) {}
    throw err;
  }
}

async function inspectVsCard(page) {
  return page.evaluate(() => {
    const rect = selector => {
      const el = document.querySelector(selector);
      if (!el) return null;
      const r = el.getBoundingClientRect(), style = getComputedStyle(el);
      return {
        display: style.display, visibility: style.visibility, opacity: style.opacity,
        left: +r.left.toFixed(1), top: +r.top.toFixed(1),
        right: +r.right.toFixed(1), bottom: +r.bottom.toFixed(1),
        width: +r.width.toFixed(1), height: +r.height.toFixed(1),
        scrollWidth: el.scrollWidth, clientWidth: el.clientWidth
      };
    };
    const image = selector => {
      const el = document.querySelector(selector);
      return el ? { complete: el.complete, naturalWidth: el.naturalWidth, naturalHeight: el.naturalHeight, aspect: el.naturalHeight ? +(el.naturalWidth / el.naturalHeight).toFixed(3) : 0 } : null;
    };
    const panel = document.querySelector('#vs-panel');
    const stage = document.querySelector('.vs-stage');
    return {
      viewport: { width: innerWidth, height: innerHeight },
      visible: !!(panel && !panel.hidden && getComputedStyle(panel).display !== 'none'),
      adminQuick: rect('#adm-tp-vulcao-ato2-quick'),
      panel: rect('#vs-panel'), kicker: rect('.vs-kicker'), stage: rect('.vs-stage'),
      hero: rect('.vs-hero'), heroFrame: rect('.vs-hero .vs-frame'), heroCaption: rect('.vs-hero figcaption'),
      boss: rect('.vs-boss'), bossFrame: rect('.vs-boss .vs-frame'), bossCaption: rect('.vs-boss figcaption'),
      mark: rect('.vs-mark'), line: rect('#vs-line'), go: rect('#vs-go'),
      images: { hero: image('#vs-hero-img'), boss: image('#vs-boss-img'), hudHero: image('#hero-portrait-img') },
      overflow: {
        panelScrollWidth: panel?.scrollWidth ?? 0, panelClientWidth: panel?.clientWidth ?? 0,
        stageScrollWidth: stage?.scrollWidth ?? 0, stageClientWidth: stage?.clientWidth ?? 0
      }
    };
  });
}

function assertVsPortrait(state, label) {
  const { width, height } = state.viewport;
  assert.ok(width < height, label + ': viewport portrait');
  assert.equal(state.visible, true, label + ': cartão VS visível');
  assert.ok(state.adminQuick && (state.adminQuick.display === 'none' || state.adminQuick.visibility === 'hidden' || Number(state.adminQuick.opacity) === 0), label + ': atalho ADM oculto enquanto o cartão VS está aberto');
  const within = box => !!(box && box.width > 0 && box.height > 0 && box.left >= -1 && box.top >= -1 && box.right <= width + 1 && box.bottom <= height + 1);
  for (const key of ['panel','kicker','stage','hero','heroFrame','heroCaption','boss','bossFrame','bossCaption','mark','line','go']) {
    assert.ok(within(state[key]), label + ': ' + key + ' inteiro dentro do viewport');
  }
  assert.ok(state.images.hero?.complete && state.images.hero.naturalWidth >= 480 && state.images.hero.naturalHeight >= 720, label + ': retrato VS do protagonista em alta resolução 480×720');
  assert.ok(state.images.boss?.complete && state.images.boss.naturalWidth > 0, label + ': arte do Bispo carregada');
  assert.ok(Math.abs(state.images.hero.aspect - 2 / 3) < .005, label + ': retrato VS usa proporção nativa 2:3, sem corte lateral por cover');
  assert.ok(state.images.hudHero?.complete && state.images.hudHero.naturalWidth > 0, label + ': avatar do HUD continua carregado');
  assert.ok(Math.abs(state.images.hudHero.aspect - 1) < .005, label + ': avatar circular do HUD continua quadrado');
  assert.ok(state.overflow.panelScrollWidth <= state.overflow.panelClientWidth + 1, label + ': painel sem overflow horizontal');
  assert.ok(state.overflow.stageScrollWidth <= state.overflow.stageClientWidth + 1, label + ': cartões sem overflow horizontal');
  assert.ok(state.hero.right <= state.mark.left + 1, label + ': protagonista antes do VS');
  assert.ok(state.mark.right <= state.boss.left + 1, label + ': VS antes do Bispo');
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
      actors: d && d.actorScreen ? d.actorScreen() : null,
      bossName: document.querySelector('#enemy-name')?.textContent?.trim() || null,
      hud: {
        enemy: rect('#enemy-hud'),
        actions: rect('#actions'),
        stick: rect('#stick'),
        quest: rect('#quest-box'),
        top: rect('#top'),
        topRight: rect('#top-right'),
        player: rect('#player-hud'),
        playerHp: rect('#player-hp-track'),
        cameraToggle: rect('#camera-toggle-3d'),
        inventory: rect('#inventory-btn'),
        map: rect('#map-toggle-3d'),
        pauseControls: {
          graphics: (() => { const e=document.querySelector('#graphics-toggle-3d'); return e ? { display:getComputedStyle(e).display, visibility:getComputedStyle(e).visibility } : null; })(),
          daynight: (() => { const e=document.querySelector('#daynight-toggle-3d'); return e ? { display:getComputedStyle(e).display, visibility:getComputedStyle(e).visibility } : null; })()
        },
        coins: rect('#coin-pill'),
        hearts: rect('#heart-pill'),
        objective: rect('#objective-arrow'),
        actionButtons: Array.from(document.querySelectorAll('#actions button')).map(el => {
          const r = el.getBoundingClientRect(), s = getComputedStyle(el);
          return {
            id: el.id, display: s.display, visibility: s.visibility, opacity: s.opacity,
            left: +r.left.toFixed(1), top: +r.top.toFixed(1),
            right: +r.right.toFixed(1), bottom: +r.bottom.toFixed(1),
            width: +r.width.toFixed(1), height: +r.height.toFixed(1)
          };
        })
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

function assertCompactPortrait(state, label) {
  assertPortrait(state, label);
  assert.ok(state.hud.stick.width <= 92, label + ': joystick compacto não invade a coluna de ações');
  assert.equal(state.hud.inventory?.display, 'none', label + ': inventário recolhido em viewport estreito');
  assert.equal(state.hud.map?.display, 'none', label + ': mapa recolhido em viewport estreito');
}

function assertPortrait(state, label) {
  assert.equal(state.dimension?.battle?.key, 'bishop2', label + ': batalha correta');
  assert.equal(state.dimension?.battle?.active, true, label + ': batalha ativa');
  assert.equal(state.dimension?.squad, true, label + ': VORGAZHEK no fluxo de esquadra');
  assert.equal(state.dimension?.voidMode, true, label + ': dimensão ativa');
  assert.equal(state.bodyClass, true, label + ': escopo visual ativado');
  assert.ok(String(state.bossName || '').includes('VORGAZHEK'), label + ': nome do chefe');
  const h = state.hud, w = state.viewport.width, height = state.viewport.height;
  const visibleButtons = Object.fromEntries((h.actionButtons || [])
    .filter(button => button.display !== 'none' && button.visibility !== 'hidden' && Number(button.opacity) > 0)
    .map(button => [button.id, button]));
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
  assert.ok(visibleButtons.shield && !overlaps(visibleButtons.shield, h.stick), label + ': escudo não cobre joystick');
  assert.ok(visibleButtons.run && !overlaps(visibleButtons.run, h.stick), label + ': corrida não cobre joystick');
  if (visibleButtons.aim) assert.ok(!overlaps(visibleButtons.aim, visibleButtons.shield), label + ': mira não cobre escudo');
  assert.ok(!overlaps(h.enemy, h.actions) && !overlaps(h.enemy, h.stick), label + ': barra não cobre controles');
  assert.ok(!overlaps(h.enemy, h.topRight), label + ': barra do Bispo não cobre controles superiores');
  assert.ok(!overlaps(h.enemy, h.player), label + ': barra não cobre vida do protagonista');
  assert.ok(h.cameraToggle && h.cameraToggle.display !== 'none' && h.cameraToggle.visibility !== 'hidden', label + ': alternância 1ª/3ª pessoa acessível');
  assert.ok(h.pauseControls?.graphics?.display !== 'none' && h.pauseControls?.daynight?.display !== 'none', label + ': ajustes continuam acessíveis no menu de pausa');
  assert.ok(!overlaps(h.topRight, h.playerHp), label + ': botões do topo não cobrem a barra de vida');
  assert.ok(h.topRight.right <= w + 1, label + ': menu dentro do viewport');
  assert.ok(Array.isArray(state.camera) && Number.isFinite(state.player?.x) && Math.abs(state.camera[0] - state.player.x) >= 1.1, label + ': câmera oblíqua separa os atores em retrato');
  assert.equal(state.actors?.enemy?.source, 'squad-body', label + ': projeção usa o corpo real do alvo da esquadra');
  assert.equal(state.actors?.enemy?.visible, true, label + ': modelo do alvo da esquadra está visível');
  assert.ok(state.actors?.enemy?.visibleMeshes > 0, label + ': ao menos uma malha do Bispo está realmente visível');
  assert.ok(state.actors?.enemy?.id, label + ': alvo da esquadra identificado');
  assert.ok(state.actors?.player?.center?.onScreen && state.actors?.enemy?.center?.onScreen, label + ': ambos os combatentes dentro do quadro');
  assert.ok(state.actors.player.head.onScreen && state.actors.enemy.head.onScreen, label + ': cabeças dos dois combatentes dentro do quadro');
  const worldSeparation = Math.hypot(state.player.enemy.x - state.player.x, state.player.enemy.z - state.player.z);
  const minProjectedSeparation = worldSeparation < 1.3 ? .17 : worldSeparation < 2 ? .22 : worldSeparation < 3 ? .34 : .42;
  assert.ok(Math.abs(state.actors.player.center.x - state.actors.enemy.center.x) >= minProjectedSeparation, label + ': silhuetas dos combatentes separadas horizontalmente no quadro');
}

async function finish(context, page) {
  const video = page.video();
  await page.close();
  const videoPath = video ? await video.path() : null;
  await context.close();
  return videoPath;
}

async function runLandscapeThenPortrait(browser, url, stage, assertHead) {
  const { context, page } = await openBattle(browser, url, stage, { width: 960, height: 540 });
  let result = null;
  try {
    const landscape = await inspect(page);
    await shot(page, stage + '-paisagem');
    await page.setViewportSize({ width: 393, height: 852 });
    await page.waitForTimeout(1900);
    const portrait = await inspect(page);
    await shot(page, stage + '-retrato-rotacao');
    if (assertHead) assertPortrait(portrait, stage + ' retrato após rotação');
    await page.setViewportSize({ width: 320, height: 852 });
    await page.waitForTimeout(900);
    const compactPortrait = await inspect(page);
    await shot(page, stage + '-retrato-compacto');
    if (assertHead) assertCompactPortrait(compactPortrait, stage + ' retrato compacto 320×852');
    result = { landscape, portrait, compactPortrait };
  } finally {
    const videoPath = await finish(context, page);
    if (result) result.videoPath = videoPath;
  }
  return result;
}

async function assertManualZoom(page, label) {
  const box = await page.locator('#look-area').boundingBox();
  assert.ok(box && box.width > 100 && box.height > 100, label + ': área real de câmera disponível');
  const pitchBefore = await page.evaluate(() => window.SevenSinsDebug3D.actorScreen());
  // Arraste vertical touch real do handler: o fit precisa considerar a profundidade projetada pelo pitch.
  await page.evaluate(() => {
    const area = document.querySelector('#look-area'), rect = area.getBoundingClientRect();
    const x = rect.left + rect.width * .55, startY = rect.top + rect.height * .18, endY = Math.min(rect.bottom - 24, startY + 220);
    const fire = (type, clientY) => area.dispatchEvent(new PointerEvent(type, {
      pointerId: 103, pointerType: 'touch', isPrimary: true, clientX: x, clientY, bubbles: true, cancelable: true
    }));
    fire('pointerdown', startY); fire('pointermove', endY); fire('pointerup', endY);
  });
  await page.waitForTimeout(400);
  const afterTilt = await page.evaluate(() => window.SevenSinsDebug3D.actorScreen());
  assert.ok(afterTilt.cameraPitch > pitchBefore.cameraPitch + .35, label + ': arraste vertical inclinou a câmera');
  assert.ok(Math.max(Math.abs(afterTilt.player.center.x), Math.abs(afterTilt.enemy.center.x)) <= .76, label + ': inclinação mantém ambos dentro da margem horizontal');
  assert.ok(afterTilt.player.center.onScreen && afterTilt.enemy.center.onScreen, label + ': centros continuam visíveis após inclinar');
  assert.ok(afterTilt.player.head.onScreen && afterTilt.enemy.head.onScreen, label + ': cabeças continuam visíveis após inclinar');
  assert.ok(Math.abs(afterTilt.player.center.x - afterTilt.enemy.center.x) >= .22, label + ': separação continua legível após inclinar');
  const before = afterTilt;

  // Dois PointerEvents touch reproduzem a pinça no mesmo handler usado pelo celular.
  await page.evaluate(() => {
    const area = document.querySelector('#look-area');
    const rect = area.getBoundingClientRect();
    const y = rect.top + rect.height * .55;
    const firstX = rect.left + 60;
    const fire = (type, pointerId, clientX) => area.dispatchEvent(new PointerEvent(type, {
      pointerId, pointerType: 'touch', isPrimary: pointerId === 101,
      clientX, clientY: y, bubbles: true, cancelable: true
    }));
    fire('pointerdown', 101, firstX);
    fire('pointerdown', 102, rect.right - 60);
    fire('pointermove', 101, firstX + 20);
    fire('pointermove', 102, firstX + 40);
    fire('pointerup', 102, firstX + 40);
    fire('pointerup', 101, firstX + 20);
  });
  await page.waitForTimeout(1500);
  const afterPinch = await page.evaluate(() => window.SevenSinsDebug3D.actorScreen());
  assert.equal(afterPinch.manualZoomOverride, true, label + ': pinça touch ativa override do duelo');
  assert.ok(afterPinch.requestedDistance >= before.requestedDistance + 4.5, label + ': pinça altera distância solicitada');
  assert.ok(afterPinch.distance >= before.distance + 1.6, label + ': câmera acompanha a pinça após interpolação');

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, -600);
  await page.waitForTimeout(1500);
  const afterWheel = await page.evaluate(() => window.SevenSinsDebug3D.actorScreen());
  assert.equal(afterWheel.manualZoomOverride, true, label + ': roda mantém override manual');
  assert.ok(afterWheel.requestedDistance <= afterPinch.requestedDistance - 4.5, label + ': roda aproxima a câmera');
  assert.ok(afterWheel.distance <= afterPinch.distance - 1.6, label + ': câmera acompanha a roda após interpolação');

  await page.locator('#camera-toggle-3d').click();
  await page.waitForTimeout(350);
  const firstPerson = await page.evaluate(() => window.SevenSinsDebug3D.actorScreen());
  assert.ok(firstPerson.requestedDistance < 1.05, label + ': alternância entrou em primeira pessoa');
  await page.locator('#camera-toggle-3d').click();
  await page.waitForTimeout(2000);
  const afterReturn = await page.evaluate(() => window.SevenSinsDebug3D.actorScreen());
  assert.equal(afterReturn.manualZoomOverride, false, label + ': retorno limpa o override antigo');
  assert.equal(afterReturn.requestedDistance, 8.5, label + ': terceira pessoa restaura a distância-base solicitada');
  assert.ok(afterReturn.distance >= 10.2, label + ': fit adaptativo volta a afastar a câmera no duelo');
  return { pitch: { before: pitchBefore, after: afterTilt }, before, afterPinch, afterWheel, perspectiveRoundTrip: { firstPerson, afterReturn } };
}

async function runFreshPortrait(browser, url, stage) {
  const { context, page, vsCard } = await openBattle(browser, url, stage, { width: 393, height: 852 });
  let portrait = null, videoPath = null, manualZoom = null;
  try {
    portrait = await inspect(page);
    await shot(page, stage + '-retrato-inicial');
    assertPortrait(portrait, stage + ' retrato inicial');
    manualZoom = await assertManualZoom(page, stage + ' zoom manual');
  } finally {
    videoPath = await finish(context, page);
  }
  return { portrait, vsCard, manualZoom, videoPath };
}

async function runCompactVsPortrait(browser, url, stage) {
  const { context, page, vsCard } = await openBattle(browser, url, stage, { width: 320, height: 852 });
  let portrait = null, videoPath = null;
  try {
    portrait = await inspect(page);
    await shot(page, stage + '-retrato-compacto');
    assertPortrait(portrait, stage + ' retrato compacto');
  } finally {
    videoPath = await finish(context, page);
  }
  return { portrait, vsCard, videoPath };
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
  });
  try {
    if (baselineUrl) {
      report.baseline = {};
      report.baseline = await runLandscapeThenPortrait(browser, baselineUrl, '01-base', false);
    }
    report.head = {};
    report.head = await runLandscapeThenPortrait(browser, headUrl, '03-head', true);
    report.head.freshPortrait = await runFreshPortrait(browser, headUrl, '05-head');
    report.head.compactVsPortrait = await runCompactVsPortrait(browser, headUrl, '06-head');
    assert.deepEqual(report.errors.head, [], 'sem erros JS/WebGL no HEAD');
    assert.deepEqual(report.networkFailures.head, [], 'sem falhas de rede no HEAD');
    assert.deepEqual(report.errors.baseline, [], 'sem erros JS/WebGL na base');
    assert.deepEqual(report.networkFailures.baseline, [], 'sem falhas de rede na base');
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
