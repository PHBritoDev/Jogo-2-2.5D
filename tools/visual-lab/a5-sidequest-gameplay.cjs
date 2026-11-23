'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const BASE = (process.env.VISUAL_BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const OUT = path.resolve(process.env.VISUAL_OUTPUT || 'visual-lab-results/a5-sidequests');
const VIEWPORT = { width: 852, height: 480 };
const FLOWER_SPOTS = [
  [-38, -20], [22, -30], [-44, -72], [30, -58], [-20, -108], [18, -128]
];
const WAYSTONES = [
  { id: 'abrigo-vila', x: -4.6, z: -36.5 },
  { id: 'abrigo-mata', x: 6.5, z: -79 },
  { id: 'abrigo-caverna', x: -40, z: -219 }
];
const report = {
  status: 'incomplete',
  commit: process.env.GITHUB_SHA || 'local',
  browser: 'Chromium + SwiftShader (CI; não representa Android físico)',
  viewport: VIEWPORT,
  scenarios: [],
  screenshots: [],
  pageErrors: [],
  consoleErrors: [],
  requestFailures: [],
  httpFailures: [],
  limitations: [
    'Os ganchos debug3d posicionam o herói para reproduzir interações; diálogos, coleta, waystones, saves e recompensas usam o runtime/UI reais.',
    'Chromium/SwiftShader valida comportamento, não FPS nem toque em Android físico.'
  ]
};

fs.mkdirSync(OUT, { recursive: true });

function seedCampaign() {
  if (sessionStorage.getItem('a5-sidequest-seeded') === '1') return;
  localStorage.clear();
  localStorage.setItem('sevenSins3DCampaignV6', JSON.stringify({
    version: 6,
    act1Rev: 2,
    act1Sub: 0,
    questStep: 2,
    coins: 100,
    playerName: 'Davi',
    captorsTaunted: false,
    childrenFreed: false,
    awakeningSeen: true,
    actCardSeen: true,
    wardenTaunted: false,
    wardenDefeated: false,
    portalOpened: false,
    portalRewardClaimed: false,
    bishopsDefeated: 0,
    vhazraelRewardClaimed: false,
    xp: 0,
    owned: [],
    sword: 'prota',
    stats: { kills: 0, rescues: 0, perfectBlocks: 0, flawless: 0, places: 0, ruins: 0, bishops: 0 },
    achievementsClaimed: [],
    bestiary: [],
    bestiaryRewarded: [],
    shopVisited: false,
    playSeconds: 0,
    ledgersFound: 0,
    vorgazhekRewardClaimed: false,
    lateFound: [],
    lateFoundStep: 0,
    lateFightIndex: 0,
    lateBossClaimed: {},
    gauntletIndex: 0,
    finaleClaimed: false,
    coatOwned: false,
    coatOn: false,
    zarkhaelClaimed: false,
    scrollOwned: false,
    veraxionClaimed: false
  }));
  sessionStorage.setItem('a5-sidequest-seeded', '1');
}

async function waitWorld(page) {
  await page.waitForFunction(
    () => !!window.SevenSinsDebug3D?.riteState?.().ready,
    null,
    { timeout: 240000 }
  );
  await page.waitForFunction(
    () => (window.SevenSinsDebug3D?.regressionState?.().vendors || []).length >= 3,
    null,
    { timeout: 90000 }
  );
}

async function snap(page, name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, animations: 'disabled', timeout: 60000 });
  report.screenshots.push(name);
}

async function readKey(page, key) {
  return page.evaluate((k) => {
    try { return JSON.parse(localStorage.getItem(k) || 'null'); }
    catch (_) { return null; }
  }, key);
}

async function readSide(page) {
  return (await readKey(page, 'seven-sins-3d-side')) || {};
}

async function readProgress(page) {
  return (await readKey(page, 'sevenSins3DCampaignV6')) || {};
}

async function vendorPosition(page, index) {
  const v = await page.evaluate((i) => window.SevenSinsDebug3D.regressionState().vendors[i], index);
  assert.ok(v && Array.isArray(v.pos) && v.pos.length === 3, 'vendedor ' + index + ' precisa ter posição real');
  return { name: v.name || ('vendor-' + index), x: v.pos[0], z: v.pos[2] };
}

async function interactVendor(page, index) {
  const v = await vendorPosition(page, index);
  // Ficar fora do pivô do NPC evita sobreposição do herói e da câmera.
  const offsets = [[1.5, 0], [-1.5, 0], [0, 1.5], [0, -1.5], [0, 0]];
  for (const offset of offsets) {
    await page.evaluate(({ x, z }) => {
      const d = window.SevenSinsDebug3D;
      d.teleport(x, z);
      d.interact();
    }, { x: v.x + offset[0], z: v.z + offset[1] });
    try {
      await page.waitForFunction(() => {
        const p = document.getElementById('dialog-panel');
        return !!p && !p.classList.contains('hidden');
      }, null, { timeout: 3500 });
      const who = (await page.locator('#dialog-who').textContent() || '').trim();
      if (/Bento|Téo|Lia/.test(who)) return { ...v, who };
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
      await waitWorld(page);
    } catch (_) {
      // Tenta o próximo ponto de aproximação do mesmo vendedor.
    }
  }
  throw new Error('Não abriu diálogo de vendedor no índice ' + index + ' (' + v.name + ')');
}

async function drainDialogue(page, expected, screenshotName) {
  await page.waitForFunction(() => {
    const p = document.getElementById('dialog-panel');
    return !!p && !p.classList.contains('hidden');
  }, null, { timeout: 15000 });
  // O teleporte QA move o ator imediatamente; aguardar a câmera real acompanhar antes da foto.
  await page.waitForTimeout(750);
  const pages = [];
  for (let i = 0; i < 20; i++) {
    const hidden = await page.evaluate(() => {
      const p = document.getElementById('dialog-panel');
      return !p || p.classList.contains('hidden');
    });
    if (hidden) break;
    const who = (await page.locator('#dialog-who').textContent() || '').trim();
    const text = (await page.locator('#dialog-text').textContent() || '').trim();
    pages.push({ who, text });
    if (i === 0 && screenshotName) await snap(page, screenshotName);
    const button = page.locator('#dialog-continue');
    assert.ok(await button.isVisible(), 'diálogo de missão precisa manter o botão Continuar visível');
    await button.click({ timeout: 10000 });
    await page.waitForTimeout(140);
  }
  await page.waitForFunction(() => {
    const p = document.getElementById('dialog-panel');
    return !p || p.classList.contains('hidden');
  }, null, { timeout: 15000 });
  const joined = pages.map((p) => p.who + ': ' + p.text).join(' ');
  if (expected) assert.match(joined, expected);
  return pages;
}

async function waitSideProgress(page, id, minimum, timeout = 6000) {
  await page.waitForFunction(({ questId, count }) => {
    try {
      const s = JSON.parse(localStorage.getItem('seven-sins-3d-side') || '{}');
      return !!s[questId] && Number(s[questId].progress) >= count;
    } catch (_) { return false; }
  }, { questId: id, count: minimum }, { timeout });
}

async function flowerCandidates(page, base) {
  const raw = await page.evaluate(({ x, z }) => window.SevenSinsDebug3D.objectsNear(x, z, 5), base);
  const points = [];
  for (const entry of raw || []) {
    const match = /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(entry);
    if (!match) continue;
    const point = { x: Number(match[1]), z: Number(match[2]) };
    if (Math.hypot(point.x - base.x, point.z - base.z) <= 5.2) points.push(point);
  }
  const candidates = [];
  for (const point of points) {
    const near = points.filter((other) => Math.hypot(other.x - point.x, other.z - point.z) <= 0.24);
    if (near.length < 6) continue;
    const candidate = {
      x: near.reduce((sum, p) => sum + p.x, 0) / near.length,
      z: near.reduce((sum, p) => sum + p.z, 0) / near.length,
      count: near.length
    };
    candidate.distance = Math.hypot(candidate.x - base.x, candidate.z - base.z);
    if (!candidates.some((c) => Math.hypot(c.x - candidate.x, c.z - candidate.z) < 0.28)) {
      candidates.push(candidate);
    }
  }
  return candidates.sort((a, b) => b.count - a.count || a.distance - b.distance).slice(0, 8);
}

async function tryCollectFlowerAt(page, x, z, before) {
  await page.evaluate(({ px, pz }) => window.SevenSinsDebug3D.teleport(px, pz), { px: x, pz: z });
  try {
    await page.waitForFunction((previous) => {
      try {
        const s = JSON.parse(localStorage.getItem('seven-sins-3d-side') || '{}');
        return Number(s.ervas?.progress || 0) > previous;
      } catch (_) { return false; }
    }, before, { timeout: 1100 });
    await page.waitForTimeout(350);
    return true;
  } catch (_) {
    return false;
  }
}

async function collectFlowersTo(page, target) {
  const bases = FLOWER_SPOTS.map(([x, z]) => ({ x, z }));
  let attempts = 0;
  while (Number((await readSide(page)).ervas?.progress || 0) < target) {
    const before = Number((await readSide(page)).ervas?.progress || 0);
    let collected = false;
    for (const base of bases) {
      const candidates = await flowerCandidates(page, base);
      for (const candidate of candidates) {
        attempts++;
        if (await tryCollectFlowerAt(page, candidate.x, candidate.z, before)) {
          collected = true;
          break;
        }
      }
      if (collected) break;
    }
    if (!collected) {
      outer: for (const base of bases) {
        for (const dx of [-4, -2, 0, 2, 4]) {
          for (const dz of [-4, -2, 0, 2, 4]) {
            attempts++;
            if (await tryCollectFlowerAt(page, base.x + dx, base.z + dz, before)) {
              collected = true;
              break outer;
            }
          }
        }
      }
    }
    assert.ok(collected, 'não foi possível coletar a próxima Flor de Vigília; progresso atual ' + before + '/' + target);
  }
  report.flowerSearchAttempts = (report.flowerSearchAttempts || 0) + attempts;
}

async function registerWaystone(page, stone) {
  await page.evaluate(({ x, z }) => {
    const d = window.SevenSinsDebug3D;
    d.teleport(x, z);
    const ground = d.walkState().terrain;
    d.placeAt(x, ground + 3, z);
    d.interact();
  }, stone);
  await page.waitForFunction((id) => {
    try {
      const map = JSON.parse(localStorage.getItem('seven-sins-3d-map-v4') || '{}');
      return Array.isArray(map.waystones) && map.waystones.includes(id);
    } catch (_) { return false; }
  }, stone.id, { timeout: 12000 });
}

async function reloadAndWait(page) {
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitWorld(page);
  await page.evaluate(() => {
    const d = window.SevenSinsDebug3D;
    d.freeRoam();
    d.setHour(10);
  });
}

async function assertNoDuplicateAfterReload(page, vendorIndex, questId, expectedCoins, expectedXp) {
  const before = await readProgress(page);
  assert.equal(before.coins, expectedCoins, questId + ' deve manter moedas após reload');
  assert.equal(before.xp, expectedXp, questId + ' deve manter XP após reload');
  const side = await readSide(page);
  assert.equal(side[questId]?.state, 'done', questId + ' deve permanecer concluída após reload');
  await page.evaluate((index) => {
    const d = window.SevenSinsDebug3D;
    const v = d.regressionState().vendors[index];
    d.teleport(v.pos[0], v.pos[2]);
    d.interact();
  }, vendorIndex);
  await page.waitForTimeout(600);
  const after = await readProgress(page);
  assert.equal(after.coins, expectedCoins, questId + ' não pode pagar moedas novamente');
  assert.equal(after.xp, expectedXp, questId + ' não pode pagar XP novamente');
  await reloadAndWait(page);
}

async function main() {
  let browser;
  let page;
  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--enable-webgl',
        '--ignore-gpu-blocklist',
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader'
      ]
    });
    const context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true
    });
    await context.addInitScript(seedCampaign);
    page = await context.newPage();
    page.on('pageerror', (error) => report.pageErrors.push(String(error)));
    page.on('console', (message) => {
      if (message.type() === 'error') report.consoleErrors.push(message.text());
    });
    page.on('requestfailed', (request) => report.requestFailures.push({
      url: request.url(),
      failure: request.failure()?.errorText || 'unknown'
    }));
    page.on('response', (response) => {
      if (response.status() >= 400 && /\.(?:js|mjs|glb)(?:\?|$)/i.test(response.url())) {
        report.httpFailures.push({ status: response.status(), url: response.url() });
      }
    });

    await page.goto(BASE + '/mundo-3d-prototype.html?debug3d=1&a5SidequestQA=1', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    await waitWorld(page);
    await page.evaluate(() => {
      const d = window.SevenSinsDebug3D;
      d.freeRoam();
      d.act1(2, 0);
      d.setHour(10);
    });
    await snap(page, '00-eldoria-inicial.png');

    // Bento — quatro flores, com save/reload após duas coletas.
    const bento = await interactVendor(page, 0);
    assert.match(bento.who, /Bento/);
    const bentoOffer = await drainDialogue(page, /Flor de Vigília|Traz quatro/, '01-bento-oferta.png');
    await waitSideProgress(page, 'ervas', 0);
    assert.equal((await readSide(page)).ervas.state, 'active');
    await collectFlowersTo(page, 2);
    assert.equal((await readSide(page)).ervas.progress, 2);
    await snap(page, '02-bento-duas-flores.png');
    await reloadAndWait(page);
    assert.equal((await readSide(page)).ervas.progress, 2, 'save/reload deve preservar 2/4 flores');
    await snap(page, '03-bento-reload-2-de-4.png');
    await collectFlowersTo(page, 4);
    assert.equal((await readSide(page)).ervas.progress, 4);
    assert.equal((await readSide(page)).ervas.state, 'ready');
    await snap(page, '04-bento-pronta.png');
    const bentoBefore = await readProgress(page);
    const bentoTalk = await interactVendor(page, 0);
    assert.match(bentoTalk.who, /Bento/);
    const bentoTurnIn = await drainDialogue(page, /Quatro|frescas/, '05-bento-entrega.png');
    const bentoAfter = await readProgress(page);
    assert.equal(bentoAfter.coins, bentoBefore.coins + 10);
    assert.equal(bentoAfter.xp, bentoBefore.xp + 30);
    assert.equal((await readSide(page)).ervas.state, 'done');
    report.scenarios.push({ id: 'ervas', vendor: bento.who, offer: bentoOffer, turnIn: bentoTurnIn, reward: { coins: 10, xp: 30 } });
    await reloadAndWait(page);
    await assertNoDuplicateAfterReload(page, 0, 'ervas', bentoAfter.coins, bentoAfter.xp);

    // Téo — três waystones reais; o progresso 2/3 precisa sobreviver ao reload.
    const teo = await interactVendor(page, 1);
    assert.match(teo.who, /Téo/);
    const teoOffer = await drainDialogue(page, /pedras de abrigo|Registre as três/i, '06-teo-oferta.png');
    assert.equal((await readSide(page)).abrigos.state, 'active');
    await registerWaystone(page, WAYSTONES[0]);
    await registerWaystone(page, WAYSTONES[1]);
    const mapBeforeReload = await readKey(page, 'seven-sins-3d-map-v4');
    assert.deepEqual(mapBeforeReload.waystones.slice().sort(), ['abrigo-mata', 'abrigo-vila'].sort());
    await reloadAndWait(page);
    const mapAfterReload = await readKey(page, 'seven-sins-3d-map-v4');
    assert.deepEqual(mapAfterReload.waystones.slice().sort(), ['abrigo-mata', 'abrigo-vila'].sort());
    const teoProgress = await interactVendor(page, 1);
    assert.match(teoProgress.who, /Téo/);
    const teoProgressPages = await drainDialogue(page, /2\/3/, '07-teo-progresso-2-de-3.png');
    await registerWaystone(page, WAYSTONES[2]);
    const teoReady = await interactVendor(page, 1);
    assert.match(teoReady.who, /Téo/);
    const teoTurnIn = await drainDialogue(page, /As três acenderam/, '08-teo-entrega.png');
    const teoAfter = await readProgress(page);
    assert.equal(teoAfter.coins, bentoAfter.coins + 12);
    assert.equal(teoAfter.xp, bentoAfter.xp + 40);
    assert.equal((await readSide(page)).abrigos.state, 'done');
    report.scenarios.push({ id: 'abrigos', vendor: teo.who, offer: teoOffer, progress: teoProgressPages, turnIn: teoTurnIn, reward: { coins: 12, xp: 40 } });
    await reloadAndWait(page);
    await assertNoDuplicateAfterReload(page, 1, 'abrigos', teoAfter.coins, teoAfter.xp);

    // Lia — o pingente precisa continuar coletado depois de recarregar.
    const lia = await interactVendor(page, 2);
    assert.match(lia.who, /Lia/);
    const liaOffer = await drainDialogue(page, /Meu filho estava|pingente da mãe dele/, '09-lia-oferta.png');
    assert.equal((await readSide(page)).pingente.state, 'active');
    await page.evaluate(() => window.SevenSinsDebug3D.teleport(-14.2, -84.5));
    await waitSideProgress(page, 'pingente', 1, 10000);
    assert.equal((await readSide(page)).pingente.progress, 1);
    await snap(page, '10-lia-pingente-coletado.png');
    await reloadAndWait(page);
    assert.equal((await readSide(page)).pingente.progress, 1, 'save/reload deve preservar o pingente coletado');
    const liaReady = await interactVendor(page, 2);
    assert.match(liaReady.who, /Lia/);
    const liaTurnIn = await drainDialogue(page, /É ele|nome dele/, '11-lia-entrega.png');
    const liaAfter = await readProgress(page);
    assert.equal(liaAfter.coins, teoAfter.coins + 14);
    assert.equal(liaAfter.xp, teoAfter.xp + 35);
    assert.equal((await readSide(page)).pingente.state, 'done');
    report.scenarios.push({ id: 'pingente', vendor: lia.who, offer: liaOffer, turnIn: liaTurnIn, reward: { coins: 14, xp: 35 } });
    await reloadAndWait(page);
    await assertNoDuplicateAfterReload(page, 2, 'pingente', liaAfter.coins, liaAfter.xp);
    await snap(page, '12-eldoria-missoes-concluidas.png');

    assert.equal(liaAfter.coins, 136, 'total esperado: 100 + 10 + 12 + 14 moedas');
    assert.equal(liaAfter.xp, 105, 'total esperado: 30 + 40 + 35 XP');
    assert.equal(report.pageErrors.length, 0, 'nenhum erro JavaScript no gameplay de missões');
    report.final = {
      coins: liaAfter.coins,
      xp: liaAfter.xp,
      quests: await readSide(page),
      map: await readKey(page, 'seven-sins-3d-map-v4')
    };
    report.status = 'passed';
  } catch (error) {
    report.status = 'failed';
    report.errors = report.errors || [];
    report.errors.push(String(error && error.stack || error));
    if (page && !page.isClosed()) {
      try { await snap(page, '99-falha.png'); } catch (_) {}
    }
    throw error;
  } finally {
    fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
    if (browser) await browser.close();
  }
}

main().then(() => {
  console.log('A5 sidequest gameplay: PASS');
}).catch((error) => {
  console.error('A5 sidequest gameplay: FAIL', error && error.stack || error);
  process.exitCode = 1;
});
