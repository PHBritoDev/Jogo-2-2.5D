'use strict';
/* Renascimento de Eldória — Fase 1: QA jogável repetível (Chromium + WebGL; em CI é SwiftShader, NÃO é Android).
 *
 *  1. Matriz de navegação. O controle é simulado quadro a quadro via SevenSinsDebug3D.navWalk, nas peças reais do
 *     mapa: rocha baixa/média/grande, dash, pulo, ponte, rio fora da ponte, escada, degraus do abrigo, aclive,
 *     paredes de casa, lago raso → fundo. Para cada caso: progresso, altura, penetração na rocha e tempo parado.
 *  2. Clima em movimento: vídeo do herói andando na ponte enquanto o céu vai de limpo a tempestade com relâmpago.
 *  3. Ângulos fixos (prado, estrada, rio, ponte, vista de Eldória, praça) ao meio-dia, na hora dourada e à noite.
 *  4. Custo: tempo de quadro p50/p95/p99, draw calls e triângulos no mesmo enquadramento, com céu limpo e com
 *     tempestade.
 * Saída: visual-lab-results/renascimento-f1/<perfil>/ e report.json.
 * Uso local: VISUAL_BASE_URL=http://127.0.0.1:8245 CHROME_PATH=/opt/pw-browsers/chromium node renascimento-f1-qa.cjs
 */
const fs = require('node:fs'), path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(process.env.QA_OUT || 'visual-lab-results/renascimento-f1');
fs.mkdirSync(root, { recursive: true });
const report = { status: 'incomplete', platform: 'Chromium WebGL (SwiftShader em CI) — não representa Android real', commit: process.env.GITHUB_SHA || 'local', profiles: {}, errors: [] };
const wait = ms => new Promise(r => setTimeout(r, ms));
const SEED = () => { try { if (!sessionStorage.getItem('qa-seed')) { sessionStorage.setItem('qa-seed', '1'); localStorage.clear(); } } catch (e) {} };

const NAV = [
  ['rocha-baixa', [33.66, 171.18, 39.66, 171.18, { seconds: 2.2 }], r => r.pen === 0 && !r.fell],
  ['rocha-media-andando', [75.6, 131.9, 81.6, 131.9, { seconds: 2.4 }], r => r.pen === 0 && r.end[0] < 77.6],
  ['rocha-media-correndo-pulo', [74.6, 131.9, 79.4, 131.9, { seconds: 1.6, sprint: true, jumpAt: .42 }], r => r.pen === 0 && r.end[0] > 79.5],
  ['rocha-grande', [62.5, 154, 75.5, 154, { seconds: 3 }], r => r.pen === 0 && r.maxY < .5],
  ['rocha-grande-dash', [62.5, 154, 75.5, 154, { seconds: 3, dashAt: .4 }], r => r.pen <= 2 && r.maxY < .5],
  ['ponte', [-.4, -2.5, -.4, -22, { seconds: 9 }], r => r.progress > .97 && !r.fell],
  ['rio-fora-da-ponte', [30, -6, 30, -21, { seconds: 4.5 }], r => r.end[2] > -13.5 && !r.fell],
  ['escada', [12.6, -46.4, 7.2, -46.6, { seconds: 2.6 }], r => r.maxY > 3.1],
  ['abrigo-degraus', [-4.6, -31.5, -4.6, -36.5, { seconds: 2.2 }], r => r.maxY > .4],
  ['casa-parede', [-13.2, -24, -13.2, -38, { seconds: 6 }], r => r.end[2] > -31],
  ['casa-grande', [-25, -45, -42, -45, { seconds: 6 }], r => r.end[0] > -31],
  ['lago-raso-fundo', [-27, -73, -27, -88, { seconds: 6 }], r => r.end[2] > -88 && !r.fell],
  // Fase 2 — Vale do Despertar
  ['vigia-trilha-1', [64.5, 109, 52.5, 106, { seconds: 6 }], r => r.progress > .9 && !r.fell],
  ['vigia-trilha-2', [52.5, 106, 41.5, 100.4, { seconds: 6 }], r => r.progress > .9 && !r.fell],
  ['vigia-trilha-3', [41.5, 100.4, 31.2, 97, { seconds: 6 }], r => r.progress > .75 && !r.fell && r.pen === 0],
];
const SHOTS = [
  ['prado', 'D.teleport(54,158,Math.PI);D.view(Math.PI*.92,.18,7.5)'],
  ['estrada', 'D.teleport(53,60,Math.PI);D.view(Math.PI,.15,7)'],
  ['rio', 'D.teleport(30,-7,Math.PI);D.view(Math.PI*.95,.2,7.5)'],
  ['ponte', 'D.teleport(-.4,-3.5,Math.PI);D.view(Math.PI*.9,.2,8)'],
  ['vista-eldoria', 'D.teleport(-.6,-20,Math.PI);D.view(Math.PI,.08,6)'],
  ['praca', 'D.teleport(-12,-40,Math.PI);D.view(Math.PI*1.1,.2,9)'],
];

async function session(browser, viewport, mobile, out, rec) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, ...(rec ? { recordVideo: { dir: out, size: viewport } } : {}) });
  await ctx.addInitScript(SEED);
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(String(e.message || e).slice(0, 300)));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
  page.on('response', r => { if (r.status() >= 400 && /\.(?:glb|js|png|jpg|webp)(?:\?|$)/.test(r.url())) errs.push('HTTP ' + r.status() + ' ' + r.url().slice(0, 140)); });
  if (process.env.THREE_LOCAL) await page.route(/cdn\.jsdelivr\.net\/npm\/three@0\.160\.0\/(.*)/, async r => { const rel = r.request().url().split('three@0.160.0/')[1].split('?')[0]; await r.fulfill({ path: path.join(process.env.THREE_LOCAL, rel), contentType: 'text/javascript' }); });
  const base = process.env.VISUAL_BASE_URL || 'http://127.0.0.1:4173';
  await page.goto(base + '/mundo-3d-prototype.html?debug3d=1&build=r' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.SevenSinsDebug3D?.riteState?.().ready, null, { timeout: 300000 });
  await wait(2500); await page.evaluate(() => window.SevenSinsDebug3D.freeRoam());
  return { ctx, page, errs };
}
const frames = (page, ms) => page.evaluate(async ms => { const d = []; let last = null; const t0 = performance.now(); return new Promise(res => { function f(t) { if (last !== null) d.push(t - last); last = t; if (t - t0 > ms) { d.sort((a, b) => a - b); const q = x => +d[Math.min(d.length - 1, Math.floor(d.length * x))].toFixed(1); const r = window.SevenSinsDebug3D.combatReport().draw; res({ n: d.length, p50: q(.5), p95: q(.95), p99: q(.99), max: +d[d.length - 1].toFixed(1), calls: r.calls, tris: r.triangles }); } else requestAnimationFrame(f); } requestAnimationFrame(f); }); }, ms);
const snap = async (page, file) => { try { await page.screenshot({ path: file, timeout: 150000 }); } catch (e) { await wait(3000); await page.screenshot({ path: file, timeout: 150000 }); } };

async function profile(browser, name, viewport, mobile) {
  const out = path.join(root, name); fs.mkdirSync(out, { recursive: true });
  const R = report.profiles[name] = { viewport, nav: [], perf: {}, errors: [] };
  // 1) navegação + 4) custo (mesma sessão, sem vídeo)
  { const { ctx, page, errs } = await session(browser, viewport, mobile, out, false);
    for (const [id, args, ok] of NAV) { const r = await page.evaluate(a => window.SevenSinsDebug3D.navWalk(...a), args); delete r.trace; R.nav.push({ id, ok: !!ok(r), ...r }); }
    // relicário do Posto do Vigia: recompensa única, salva no aparelho
    R.vigia = await page.evaluate(async () => { const D = window.SevenSinsDebug3D; let before = null; try { before = localStorage.getItem('seven-sins-3d-posto-vigia'); } catch (e) {}
      D.teleport(26.9, 96.9, Math.PI / 2); let after = null; // o gatilho roda no laço do jogo: no SwiftShader do desktop um quadro pode levar >1 s
      for (let i = 0; i < 60 && after !== '1'; i++) { await new Promise(r => setTimeout(r, 500)); try { after = localStorage.getItem('seven-sins-3d-posto-vigia'); } catch (e) {} }
      return { before, after, status: (document.getElementById('status') || {}).textContent || '' }; });
    if (R.vigia.after !== '1') R.errors.push('relicário do Vigia não abriu');
    await page.evaluate(() => { const D = window.SevenSinsDebug3D; D.setHour(15); D.teleport(-.4, -3.5, Math.PI); D.view(Math.PI * .9, .2, 8); D.weather('limpo'); });
    await wait(2500); R.perf.limpo = await frames(page, 6000);
    await page.evaluate(() => window.SevenSinsDebug3D.weather('tempestade')); await wait(2500); R.perf.tempestade = await frames(page, 6000);
    R.weatherState = await page.evaluate(() => window.SevenSinsDebug3D.weatherState());
    // 3) ângulos fixos
    for (const [hour, tag] of [[12.5, '12h'], [17.7, '18h'], [22.5, '22h']]) for (const [sid, js] of SHOTS) {
      await page.evaluate(new Function('h', `const D=window.SevenSinsDebug3D;D.setHour(h);D.weather('nuvens');${js};D.motionStep(.4,{x:0,z:0});`), hour); await wait(1800); await snap(page, path.join(out, `fixo-${tag}-${sid}.png`)); }
    R.errors.push(...errs); await ctx.close(); }
  // 2) clima em movimento (vídeo): andar na ponte enquanto o céu fecha e cai um raio
  { const { ctx, page, errs } = await session(browser, viewport, mobile, out, true);
    // a transição suave do clima é provada nos testes (passo por quadro < 2%); aqui cada estado é mostrado com o herói andando
    // pela ponte (-z), câmera atrás e levemente acima, olhando para Eldória
    await page.evaluate(() => { const D = window.SevenSinsDebug3D; D.setHour(16.2); D.teleport(-.4, 1.5, 0); D.view(0, .16, 7); D.weather('limpo'); });
    for (const st of ['nuvens', 'encoberto', 'chuva', 'tempestade']) {
      await page.evaluate(s => window.SevenSinsDebug3D.weather(s), st);
      for (let i = 0; i < 4; i++) await page.evaluate(() => window.SevenSinsDebug3D.motionStep(.3, { x: 0, z: -1 }));
      await wait(1500); await snap(page, path.join(out, `movimento-${st}.png`)); }
    await page.evaluate(() => window.SevenSinsDebug3D.strikeNow(450)); await wait(120); await snap(page, path.join(out, 'movimento-raio.png')); await wait(3500);
    R.errors.push(...errs); await ctx.close(); }
}

(async () => {
  let browser;
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}), args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    await profile(browser, 'mobile', { width: 852, height: 393 }, true);
    if (!process.env.QA_ONLY_MOBILE) await profile(browser, 'desktop', { width: 1280, height: 720 }, false);
    for (const [k, P] of Object.entries(report.profiles)) {
      const real = P.errors.filter(e => !/KHR_parallel|PropertyBinding|WebGL/.test(e)); if (real.length) report.errors.push(k + ': ' + real.slice(0, 3).join(' | '));
      const bad = P.nav.filter(n => !n.ok).map(n => n.id); if (bad.length) report.errors.push(k + ': navegação falhou em ' + bad.join(', '));
    }
    report.status = report.errors.length ? 'failed' : 'captured';
  } catch (e) { report.status = 'failed'; report.errors.push(String(e && e.stack || e).slice(0, 600)); }
  finally { if (browser) await browser.close(); fs.writeFileSync(path.join(root, 'report.json'), JSON.stringify(report, null, 2)); console.log('RENASCIMENTO_F1_QA', JSON.stringify({ status: report.status, errors: report.errors, nav: Object.fromEntries(Object.entries(report.profiles).map(([k, P]) => [k, P.nav.map(n => n.id + ':' + (n.ok ? 'ok' : 'FALHA'))])), perf: Object.fromEntries(Object.entries(report.profiles).map(([k, P]) => [k, P.perf])) })); process.exitCode = report.status === 'captured' ? 0 : 1; }
})();
