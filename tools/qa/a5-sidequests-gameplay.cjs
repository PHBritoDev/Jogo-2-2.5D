'use strict';
/* QA A5 — interação real com as três missões laterais de Eldória.
 * Chromium/SwiftShader em viewport mobile landscape; não é benchmark nem aparelho Android.
 * O debug hook é somente leitura. Oferta, coleta, registro de abrigos, entrega e reload usam o runtime/UI do jogo.
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const OUT = path.resolve('visual-lab-results/a5-sidequests');
fs.mkdirSync(OUT, { recursive: true });
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const report = {
  status: 'incomplete',
  platform: 'Chromium SwiftShader · mobile landscape 852×393 · não representa Android físico',
  commit: process.env.GITHUB_SHA || 'local',
  startedAt: new Date().toISOString(),
  missions: {},
  screenshots: [],
  errors: [],
  consoleErrors: [],
  httpErrors: []
};

let browser = null, context = null, page = null, video = null;
let fatal = null;

function shot(name) {
  return page.screenshot({ path: path.join(OUT, name + '.png'), timeout: 120000 })
    .then(() => report.screenshots.push(name + '.png'));
}
async function qaState() {
  return page.evaluate(() => window.SevenSinsDebug3D.sideQuestQA());
}
async function sideState() {
  return page.evaluate(() => JSON.parse(localStorage.getItem('seven-sins-3d-side') || '{}'));
}
async function talkTo(shortName) {
  const qa = await qaState();
  const vendor = qa.vendors.find(v => v.shortName === shortName);
  assert.ok(vendor, 'vendedor não encontrado no runtime: ' + shortName);
  const firstName = vendor.name.split(' ·')[0].toUpperCase();
  await page.evaluate(({ x, z }) => window.SevenSinsDebug3D.teleport(x, z), { x: vendor.x, z: vendor.z });
  await page.waitForFunction(name => {
    const b = document.getElementById('talk-button');
    return b && !b.classList.contains('hidden') && b.textContent.includes(name);
  }, firstName, { timeout: 30000 });
  await wait(850);
  await page.locator('#talk-button').click();
  await page.waitForSelector('#dialog-panel:not(.hidden)', { timeout: 20000 });
  return vendor;
}
async function readDialogue(max = 12) {
  const pages = [];
  for (let i = 0; i < max; i++) {
    if (!(await page.locator('#dialog-panel').isVisible())) break;
    const who = (await page.locator('#dialog-who').textContent() || '').trim();
    const text = (await page.locator('#dialog-text').textContent() || '').trim();
    pages.push({ who, text });
    const options = page.locator('#dialog-options:not([hidden]) button');
    if (await options.count()) await options.first().click();
    else await page.locator('#dialog-continue').click();
    await wait(120);
  }
  await page.waitForFunction(() => {
    const p = document.getElementById('dialog-panel');
    return !p || p.classList.contains('hidden');
  }, null, { timeout: 30000 });
  return pages;
}
async function waitSideProgress(id, minimum, timeout = 30000) {
  await page.waitForFunction(({ id, minimum }) => {
    const s = JSON.parse(localStorage.getItem('seven-sins-3d-side') || '{}')[id];
    return !!s && s.progress >= minimum;
  }, { id, minimum }, { timeout });
}
async function acceptMission({ id, giver, title, phrase, screenshot, definition }) {
  const vendor = await talkTo(giver);
  await shot(screenshot + '-offer');
  const pages = await readDialogue();
  const allText = pages.map(p => p.text).join(' ');
  assert.ok(allText.includes(phrase), id + ': fala de oferta ausente: ' + allText);
  assert.ok(pages.every(p => p.who === vendor.name), id + ': falante não corresponde ao NPC: ' + JSON.stringify(pages));
  assert.equal(pages.length, definition.offer.length, id + ': quantidade de páginas da oferta divergente');
  assert.deepEqual(pages.map(p => p.text.replace(/\s+/g, ' ').trim()), definition.offer.map(p => p.text.replace(/\s+/g, ' ').trim()), id + ': texto da oferta diverge do módulo');
  const state = await sideState();
  assert.equal(state[id]?.state, 'active', id + ': missão não foi aceita ao fechar o diálogo');
  report.missions[id] = { title, giver, offerPages: pages, accepted: true };
  return vendor;
}
async function deliverMission({ id, giver, title, reward, goalCount, screenshot, definition }) {
  const before = await qaState();
  const vendor = await talkTo(giver);
  await shot(screenshot + '-ready-dialogue');
  const pages = await readDialogue();
  assert.ok(pages.length > 0, id + ': diálogo de entrega vazio');
  assert.ok(pages.every(p => p.who === vendor.name), id + ': falante de entrega incorreto');
  assert.equal(pages.length, definition.turnIn.length, id + ': quantidade de páginas da entrega divergente');
  assert.deepEqual(pages.map(p => p.text.replace(/\s+/g, ' ').trim()), definition.turnIn.map(p => p.text.replace(/\s+/g, ' ').trim()), id + ': texto da entrega diverge do módulo');
  await page.waitForFunction(id => JSON.parse(localStorage.getItem('seven-sins-3d-side') || '{}')[id]?.state === 'done', id, { timeout: 20000 });
  const after = await qaState();
  assert.equal(after.side[id].progress, goalCount, id + ': progresso final divergente');
  assert.equal(after.side[id].state, 'done', id + ': missão não foi concluída');
  assert.equal(after.coins - before.coins, reward.coins, id + ': recompensa de moedas divergente');
  assert.equal(after.xp - before.xp, reward.xp, id + ': recompensa de XP divergente');
  await shot(screenshot + '-done');
  report.missions[id] = { ...report.missions[id], deliveryPages: pages, finalState: after.side[id], reward };
}
async function collectFlowers() {
  const qa = await qaState();
  const flowers = qa.items.filter(i => i.item === 'flor');
  assert.equal(flowers.length, 6, 'runtime deve criar seis flores');
  assert.ok(flowers.every(i => i.visible && !i.taken), 'flores devem aparecer após aceitar a missão');
  for (const item of flowers) {
    const current = (await sideState()).ervas.progress;
    if (current >= 4) break;
    await page.evaluate(({ x, z }) => window.SevenSinsDebug3D.teleport(x, z), { x: item.x, z: item.z });
    await waitSideProgress('ervas', current + 1, 20000);
    const now = await qaState();
    await shot('bento-flor-' + now.side.ervas.progress);
  }
  const final = await qaState();
  assert.equal(final.side.ervas.progress, 4, 'quatro flores não foram coletadas');
  assert.equal(final.side.ervas.state, 'ready');
  await shot('bento-flores-prontas');
  report.missions.ervas.collection = final.side.ervas;
}
async function registerShelters(requiredIds, mapStoreKey) {
  const qa = await qaState();
  for (const id of requiredIds) {
    const stone = qa.waystones.find(w => w.id === id);
    assert.ok(stone, 'abrigo ausente no runtime: ' + id);
    const current = (await sideState()).abrigos.progress;
    await page.evaluate(({ x, z }) => window.SevenSinsDebug3D.teleport(x, z), { x: stone.x, z: stone.z });
    await page.waitForFunction(() => {
      const b = document.getElementById('talk-button');
      return b && !b.classList.contains('hidden') && b.textContent.includes('REGISTRAR ESTE ABRIGO');
    }, null, { timeout: 30000 });
    await page.locator('#talk-button').click();
    await page.waitForFunction(({ id, key }) => {
      const m = JSON.parse(localStorage.getItem(key) || '{}');
      return Array.isArray(m.waystones) && m.waystones.includes(id);
    }, { id, key: mapStoreKey }, { timeout: 20000 });
    await waitSideProgress('abrigos', current + 1, 20000);
    const now = await qaState();
    await shot('teo-abrigo-' + now.side.abrigos.progress);
  }
  const final = await qaState();
  assert.equal(final.side.abrigos.progress, 3);
  assert.equal(final.side.abrigos.state, 'ready');
  await shot('teo-tres-abrigos-prontos');
  report.missions.abrigos.collection = final.side.abrigos;
}
async function collectPendant() {
  const qa = await qaState();
  const item = qa.items.find(i => i.item === 'pingente');
  assert.ok(item && item.visible && !item.taken, 'pingente não ficou visível após aceitar');
  await page.evaluate(({ x, z }) => window.SevenSinsDebug3D.teleport(x, z), { x: item.x, z: item.z });
  await waitSideProgress('pingente', 1, 20000);
  const final = await qaState();
  assert.equal(final.side.pingente.state, 'ready');
  await shot('lia-pingente-encontrado');
  report.missions.pingente.collection = final.side.pingente;
}

(async () => {
  try {
    const { SIDE_QUESTS, SIDE_QUEST_WAYSTONES } = await import('../../sidequests3d.js');
    const { MAP_STORE_KEY } = await import('../../map3d.js');
    const byId = Object.fromEntries(SIDE_QUESTS.map(q => [q.id, q]));
    assert.deepEqual(SIDE_QUESTS.map(q => q.giver).sort(), ['ALIMENTOS', 'FRUTAS', 'PROVISÕES'].sort());

    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
    });
    context = await browser.newContext({
      viewport: { width: 852, height: 393 },
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true,
      recordVideo: { dir: OUT, size: { width: 852, height: 393 } }
    });
    await context.addInitScript(() => {
      try {
        if (!sessionStorage.getItem('__a5_sidequests_seeded')) {
          localStorage.clear();
          sessionStorage.setItem('__a5_sidequests_seeded', '1');
        }
      } catch (_) {}
    });
    page = await context.newPage();
    page.setDefaultTimeout(30000);
    video = page.video();
    page.on('pageerror', e => report.errors.push(String(e.message || e).slice(0, 500)));
    page.on('console', m => { if (m.type() === 'error') report.consoleErrors.push(m.text().slice(0, 500)); });
    page.on('response', r => {
      if (r.status() >= 400 && /\.(?:glb|js)(?:\?|$)/i.test(r.url())) report.httpErrors.push('HTTP ' + r.status() + ' ' + r.url().slice(0, 180));
    });

    const base = process.env.VISUAL_BASE_URL || 'http://127.0.0.1:4173';
    await page.goto(base + '/mundo-3d-prototype.html?debug3d=1&a5sidequests=1', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForFunction(() => window.SevenSinsDebug3D?.riteState?.().ready, null, { timeout: 240000 });
    await page.waitForFunction(() => !!window.SevenSinsDebug3D?.sideQuestQA, null, { timeout: 30000 });
    await wait(2500);
    await page.evaluate(() => { window.SevenSinsDebug3D.realtime(); window.SevenSinsDebug3D.act1(2, 0); });
    await wait(1500);

    const initial = await qaState();
    assert.equal(initial.questStep, 2, 'campanha precisa estar no passo 2 para habilitar as três missões');
    for (const q of SIDE_QUESTS) assert.equal(initial.side[q.id].state, 'available', q.id + ' não foi desbloqueada');

    await acceptMission({ id: 'ervas', giver: 'ALIMENTOS', title: byId.ervas.title, phrase: 'Flor de Vigília', screenshot: 'bento', definition: byId.ervas });
    await collectFlowers();
    await deliverMission({ id: 'ervas', giver: 'ALIMENTOS', title: byId.ervas.title, reward: byId.ervas.reward, goalCount: byId.ervas.goal.count, screenshot: 'bento', definition: byId.ervas });

    await acceptMission({ id: 'abrigos', giver: 'PROVISÕES', title: byId.abrigos.title, phrase: 'pedras de abrigo', screenshot: 'teo', definition: byId.abrigos });
    await registerShelters(SIDE_QUEST_WAYSTONES, MAP_STORE_KEY);
    await deliverMission({ id: 'abrigos', giver: 'PROVISÕES', title: byId.abrigos.title, reward: byId.abrigos.reward, goalCount: byId.abrigos.goal.count, screenshot: 'teo', definition: byId.abrigos });

    await acceptMission({ id: 'pingente', giver: 'FRUTAS', title: byId.pingente.title, phrase: 'Meu filho', screenshot: 'lia', definition: byId.pingente });
    await collectPendant();
    await deliverMission({ id: 'pingente', giver: 'FRUTAS', title: byId.pingente.title, reward: byId.pingente.reward, goalCount: byId.pingente.goal.count, screenshot: 'lia', definition: byId.pingente });

    const beforeReload = await qaState();
    assert.ok(SIDE_QUESTS.every(q => beforeReload.side[q.id].state === 'done'));
    await shot('tres-missoes-concluidas');
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForFunction(() => window.SevenSinsDebug3D?.riteState?.().ready && window.SevenSinsDebug3D?.sideQuestQA, null, { timeout: 240000 });
    await wait(2500);
    const afterReload = await qaState();
    for (const q of SIDE_QUESTS) {
      assert.equal(afterReload.side[q.id].state, 'done', q.id + ' não persistiu como concluída');
      assert.equal(afterReload.side[q.id].progress, q.goal.count, q.id + ' perdeu progresso após reload');
    }
    assert.equal(afterReload.coins, beforeReload.coins, 'moedas mudaram durante reload');
    assert.equal(afterReload.xp, beforeReload.xp, 'XP mudou durante reload');
    for (const id of SIDE_QUEST_WAYSTONES) assert.ok(afterReload.registeredWaystones.includes(id), 'abrigo não persistiu: ' + id);
    await shot('save-reload-tres-missoes');

    // Reinteragir com cada vendedor depois do reload não pode pagar a mesma recompensa novamente.
    for (const q of SIDE_QUESTS) {
      const vendor = afterReload.vendors.find(v => v.shortName === q.giver);
      await page.evaluate(({ x, z }) => window.SevenSinsDebug3D.teleport(x, z), { x: vendor.x, z: vendor.z });
      await page.waitForFunction(name => {
        const b = document.getElementById('talk-button');
        return b && !b.classList.contains('hidden') && b.textContent.includes(name);
      }, vendor.name.split(' ·')[0].toUpperCase(), { timeout: 30000 });
      await page.locator('#talk-button').click();
      await page.waitForSelector('#dialog-panel:not(.hidden)', { timeout: 20000 });
      const firstText = (await page.locator('#dialog-text').textContent() || '').trim();
      const who = (await page.locator('#dialog-who').textContent() || '').trim();
      assert.equal(who, vendor.name, q.id + ': conversa pós-reload com falante incorreto');
      assert.ok(!q.turnIn.some(line => line.text === firstText), q.id + ': diálogo de entrega reapareceu após conclusão');
      const afterTalk = await qaState();
      assert.equal(afterTalk.coins, beforeReload.coins, q.id + ': recompensa duplicada após reload');
      assert.equal(afterTalk.side[q.id].state, 'done');
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 90000 });
      await page.waitForFunction(() => window.SevenSinsDebug3D?.riteState?.().ready && window.SevenSinsDebug3D?.sideQuestQA, null, { timeout: 240000 });
      const reloaded = await qaState();
      assert.equal(reloaded.side[q.id].state, 'done', q.id + ': estado mudou após nova recarga');
      assert.equal(reloaded.coins, beforeReload.coins, q.id + ': moedas mudaram após nova recarga');
    }
    await shot('sem-recompensa-duplicada');
    report.final = await qaState();
    const criticalConsole = report.consoleErrors.filter(e => !/WebGL|KHR_parallel|PropertyBinding|Shader Error/i.test(e));
    assert.equal(report.errors.length, 0, 'erros JavaScript no navegador: ' + report.errors.join(' | '));
    assert.equal(report.httpErrors.length, 0, 'falha ao carregar asset JS/GLB: ' + report.httpErrors.join(' | '));
    assert.equal(criticalConsole.length, 0, 'erros de console: ' + criticalConsole.join(' | '));
    report.status = 'passed';
  } catch (e) {
    fatal = e;
    report.status = 'failed';
    report.errors.push(String(e.stack || e).slice(0, 2500));
    process.exitCode = 1;
  } finally {
    try { if (context) await context.close(); } catch (_) {}
    try {
      if (video) {
        const p = await video.path();
        if (fs.existsSync(p)) fs.copyFileSync(p, path.join(OUT, 'a5-sidequests-gameplay.webm'));
      }
    } catch (e) { report.errors.push('video: ' + String(e.message || e)); }
    try { if (browser) await browser.close(); } catch (_) {}
    report.finishedAt = new Date().toISOString();
    const realErrors = report.errors.filter(Boolean);
    report.filteredConsoleErrors = report.consoleErrors.filter(e => !/WebGL|KHR_parallel|PropertyBinding|Shader Error/i.test(e));
    fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
    console.log('A5_SIDEQUESTS_QA ' + JSON.stringify({
      status: report.status,
      commit: report.commit,
      missions: Object.fromEntries(Object.entries(report.missions).map(([k, v]) => [k, v.finalState || v.collection || v.accepted])),
      screenshots: report.screenshots.length,
      errors: realErrors.slice(0, 4),
      consoleErrors: report.filteredConsoleErrors.slice(0, 4),
      httpErrors: report.httpErrors.slice(0, 4)
    }));
    if (fatal) process.exitCode = 1;
  }
})();
