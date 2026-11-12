'use strict';
/* Mod 317 — evidências do prólogo jogável (Chromium SwiftShader; NÃO é o Samsung A55).
 * Percurso: céu (guardiões) → despertar (POV deitado, piscadas, levantar, Anjo já presente) → asas recolhidas →
 * carroça vinda da garganta → Teren sentado → lona → embarque → interior → "3 horas depois" → emboscada com 5 bandidos
 * → vila (vendedores, tocha à noite, água rasa) → abrigos rituais. Em paisagem mobile (852×393) e desktop (1280×720).
 * Saída: visual-lab-results/prologue-mod317/<perfil>/*.png, vídeos .webm e report.json (erros, esquadra, draw calls,
 * frame time p50/p95/p99 no prado, na estrada e na vila).
 */
const fs = require('node:fs'), path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve('visual-lab-results/prologue-mod317');
fs.mkdirSync(root, { recursive: true });
const report = { status: 'incomplete', platform: 'Chromium SwiftShader (CI) — não representa Android real', commit: process.env.GITHUB_SHA || 'local', profiles: {}, errors: [] };
const wait = ms => new Promise(r => setTimeout(r, ms));
const SEED = () => { try { if (!sessionStorage.getItem('qa-seed')) { sessionStorage.setItem('qa-seed', '1'); localStorage.clear(); } } catch (e) {} };
const SEED_ROAD = () => { try { if (!sessionStorage.getItem('qa-seed')) { sessionStorage.setItem('qa-seed', '1'); localStorage.clear();
  localStorage.setItem('sevenSins3DCampaignV6', JSON.stringify({ version: 6, act1Rev: 2, act1Sub: 0, questStep: 1, coins: 8, playerName: 'Davi', awakeningSeen: true, actCardSeen: true }));
  localStorage.setItem('seven-sins-3d-road', '0'); localStorage.setItem('seven-sins-3d-guide-wings', '1'); localStorage.setItem('seven-sins-3d-prologo-ceu', '1'); localStorage.setItem('seven-sins-3d-clock', '17.2'); } } catch (e) {} };

async function session(browser, viewport, mobile, seed, out, rec) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, ...(rec ? { recordVideo: { dir: out, size: viewport } } : {}) });
  await ctx.addInitScript(seed);
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(String(e.message || e).slice(0, 300)));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
  page.on('response', r => { if (r.status() >= 400 && /\.(?:glb|js)(?:\?|$)/.test(r.url())) errs.push('HTTP ' + r.status() + ' ' + r.url().slice(0, 140)); });
  const base = process.env.VISUAL_BASE_URL || 'http://127.0.0.1:4173';
  await page.goto(base + '/mundo-3d-prototype.html?debug3d=1', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.SevenSinsDebug3D?.riteState?.().ready, null, { timeout: 240000 });
  return { ctx, page, errs };
}
const helpers = (page, out) => {
  const st = () => page.evaluate(() => window.SevenSinsDebug3D.cineState());
  const rs = () => page.evaluate(() => window.SevenSinsDebug3D.roadState());
  const snap = async n => { try { await page.screenshot({ path: path.join(out, n + '.png'), timeout: 150000 }); } catch (e) { await wait(3000); await page.screenshot({ path: path.join(out, n + '.png'), timeout: 150000 }); } };
  const tapUntil = async (pred, max = 80) => { for (let i = 0; i < max; i++) { const s = await st(); if (pred(s)) return s; if (s.waitingTap) await page.evaluate(() => document.getElementById('cine-continue').click()); await wait(450); } return st(); };
  const frames = async (ms = 6000) => page.evaluate(async ms => { const d = []; let last = null; const t0 = performance.now(); return new Promise(res => { function f(t) { if (last !== null) d.push(t - last); last = t; if (t - t0 > ms) { d.sort((a, b) => a - b); const q = x => d[Math.min(d.length - 1, Math.floor(x * (d.length - 1)))]; const p = window.SevenSinsDebug3D.perfProbe ? window.SevenSinsDebug3D.perfProbe(1) : {}; res({ n: d.length, p50: q(.5), p95: q(.95), p99: q(.99), max: q(1), calls: p.calls, tris: p.tris }); return; } requestAnimationFrame(f); } requestAnimationFrame(f); }); }, ms);
  return { st, rs, snap, tapUntil, frames };
};

async function prologue(browser, name, viewport, mobile) {
  const out = path.join(root, name); fs.mkdirSync(out, { recursive: true }); const R = report.profiles[name] = { shots: [], errors: [], metrics: {} };
  // ---- 1) céu e despertar (jogo novo)
  { const { ctx, page, errs } = await session(browser, viewport, mobile, SEED, out, name === 'mobile'); const H = helpers(page, out);
    await page.evaluate(() => window.SevenSinsDebug3D.cine('ceu'));
    for (const id of ['ceu-panorama', 'ceu-caminhada', 'ceu-trono']) { const t0 = Date.now(); while (Date.now() - t0 < 90000) { const s = await H.st(); if (s.shot === id && s.u >= .5) break; await wait(400); } await H.snap('1-' + id); R.shots.push(id); }
    await H.tapUntil(s => !s.active, 60);
    await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => window.SevenSinsDebug3D?.riteState?.().ready, null, { timeout: 240000 });
    await page.evaluate(() => window.SevenSinsDebug3D.cine('despertar')); await wait(1300); await H.snap('2-despertar-palpebras'); await wait(2400); await H.snap('2-despertar-ceu-pov');
    await H.tapUntil(s => s.shot === 'levantar'); await wait(1000); await H.snap('2-levantando'); await wait(1600); await H.snap('2-de-pe-anjo-presente');
    await H.tapUntil(s => s.waitingAsk, 30); if (await page.$('#name-input')) { await page.fill('#name-input', 'Davi').catch(() => {}); await page.click('#name-confirm').catch(() => {}); }
    await H.tapUntil(s => s.shot === 'olhar-em-volta'); await wait(1800); await H.snap('2-olhar-garganta');
    await H.tapUntil(s => s.waitingAsk, 30); await page.click('#mission-accept').catch(() => {}); await wait(3500);
    R.metrics.prado = await H.frames(5000);
    for (let i = 0; i < 10; i++) await page.evaluate(() => window.SevenSinsDebug3D.motionStep(.5, { x: 0, z: -1 }));
    await wait(1500); await H.snap('3-asas-pergunta'); await H.tapUntil(s => s.shot === 'asas-recolher'); await wait(900); await H.snap('3-asas-recolhendo');
    await H.tapUntil(s => !s.active, 120); await wait(1500); await H.snap('3-asas-recolhidas');
    R.wingsSaved = await page.evaluate(() => localStorage.getItem('seven-sins-3d-guide-wings'));
    R.errors.push(...errs); await ctx.close(); }
  // ---- 2) estrada, carroça e emboscada (save no prólogo)
  { const { ctx, page, errs } = await session(browser, viewport, mobile, SEED_ROAD, out, false); const H = helpers(page, out);
    await wait(3000); await page.evaluate(() => { const D = window.SevenSinsDebug3D; D.teleport(56, 150, Math.PI); D.view(Math.PI, .08, 7); }); await wait(5000); await H.snap('4-carroca-na-garganta');
    R.roadStart = await H.rs(); await page.evaluate(() => window.SevenSinsDebug3D.cartArrive()); await wait(1500);
    await page.evaluate(() => window.SevenSinsDebug3D.teleport(58, 140)); await wait(2500); await H.tapUntil(s => s.active, 20); await H.snap('4-teren-chega');
    await H.tapUntil(s => s.type === 'say' && /Teren/.test(s.id || ''), 20); await H.snap('4-teren-sentado-fala');
    await H.tapUntil(s => !s.active, 160); await page.evaluate(() => window.SevenSinsDebug3D.interact()); await wait(1500); await H.tapUntil(s => !s.active, 160);
    await page.evaluate(() => window.SevenSinsDebug3D.interact()); await wait(2400); await H.snap('5-embarque'); await wait(2800); await H.snap('5-sentados');
    await H.tapUntil(s => s.type === 'say', 30); await H.snap('5-interior-conversa'); R.seated = await H.rs();
    R.metrics.estrada = await H.frames(4000);
    await H.tapUntil(s => s.scene === 'emboscada', 200); await wait(800); await H.snap('6-tres-horas-acordar');
    await H.tapUntil(s => s.shot === 'cerco', 30); await wait(1400); await H.snap('6-cerco-5-bandidos');
    await H.tapUntil(s => !s.active, 120); await wait(4000); await H.snap('6-luta-5-simultaneos'); R.squad = await page.evaluate(() => window.SevenSinsDebug3D.squadInfo());
    let maxMelee = 0; for (let i = 0; i < 12; i++) { const q = await page.evaluate(() => window.SevenSinsDebug3D.squadInfo()); if (q) maxMelee = Math.max(maxMelee, q.acts.filter(a => a === 'melee').length); await wait(500); }
    R.squad.maxMeleeObserved = maxMelee;
    R.errors.push(...errs); await ctx.close(); }
  // ---- 3) vila e abrigos
  { const { ctx, page, errs } = await session(browser, viewport, mobile, SEED, out, false); const H = helpers(page, out);
    await page.evaluate(() => window.SevenSinsDebug3D.freeRoam());
    const go = async (n, f, ms = 1500) => { await page.evaluate(f); await page.evaluate(() => window.SevenSinsDebug3D.motionStep(.6, { x: 0, z: 0 })); await wait(ms); await H.snap(n); };
    await go('7-banca-frente', () => { const D = window.SevenSinsDebug3D; D.setHour(10); D.teleport(-16.2, -36.3); D.view(0, .12, 4.2); });
    await go('7-tocha-noite', () => { const D = window.SevenSinsDebug3D; D.setHour(22); D.teleport(-19.2, -44.3); D.view(-1.3, .25, 3.2); });
    await go('7-agua-rasa', () => { const D = window.SevenSinsDebug3D; D.setHour(10); D.teleport(-27, -96, Math.PI); D.view(1.9, .18, 4.5); });
    await go('8-abrigo-vila', () => { const D = window.SevenSinsDebug3D; D.setHour(16.5); D.teleport(-4.6, -31.5); D.view(0, .32, 8); });
    await go('8-abrigo-caverna', () => { const D = window.SevenSinsDebug3D; D.setHour(17.4); D.teleport(-40, -213); D.view(0, .3, 8); });
    R.metrics.vila = await (async () => { await page.evaluate(() => { const D = window.SevenSinsDebug3D; D.setHour(11); D.teleport(-12, -40); D.view(3.14, .2, 9); }); await wait(1500); return H.frames(5000); })();
    R.errors.push(...errs); await ctx.close(); }
  R.videos = fs.readdirSync(out).filter(x => x.endsWith('.webm'));
}

(async () => {
  let browser;
  try {
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    await prologue(browser, 'mobile', { width: 852, height: 393 }, true);
    if (!process.env.MOD317_ONLY_MOBILE) await prologue(browser, 'desktop', { width: 1280, height: 720 }, false);
    for (const [k, P] of Object.entries(report.profiles)) {
      const real = P.errors.filter(e => !/KHR_parallel|PropertyBinding|WebGL/.test(e)); P.realErrors = real;
      if (real.length) report.errors.push(k + ': ' + real.slice(0, 3).join(' | '));
      if (!P.squad || P.squad.n !== 5 || P.squad.kinds.join() !== 'bandit' || P.squad.spells) report.errors.push(k + ': esquadra de bandidos inesperada ' + JSON.stringify(P.squad));
      if (P.squad && P.squad.maxMeleeObserved > 2) report.errors.push(k + ': mais de 2 golpes simultâneos');
      if (P.wingsSaved !== '1') report.errors.push(k + ': estado das asas não salvo');
    }
    report.status = report.errors.length ? 'suspected_errors' : 'captured';
  } catch (e) { report.status = 'failed'; report.errors.push(String(e.stack || e).slice(0, 1500)); process.exitCode = 1; }
  finally {
    if (browser) await browser.close().catch(() => {});
    fs.writeFileSync(path.join(root, 'report.json'), JSON.stringify(report, null, 2));
    console.log('MOD317_QA ' + JSON.stringify({ status: report.status, errors: report.errors.slice(0, 6), metrics: Object.fromEntries(Object.entries(report.profiles).map(([k, p]) => [k, p.metrics])), squad: Object.fromEntries(Object.entries(report.profiles).map(([k, p]) => [k, p.squad])) }));
    if (report.status !== 'captured') process.exitCode = 1;
  }
})();
