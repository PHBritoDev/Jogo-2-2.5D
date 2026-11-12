'use strict';
/* Mod 316 — evidências visuais e métricas (Chromium SwiftShader 852×480; NÃO é Android real).
 * Gera em visual-lab-results/eldoria-mod316/:
 *  - âncoras fixas (prado, ponte, praça, lago, mata, gaiolas, serra) × 9/13/17,5/22 h  → anc_<lugar>_<h>.png
 *  - novidades: cachoeira (dia/dourada/noite), mirante, clareira, círculo de pedras, remanso, pássaros, ondulação,
 *    1ª pessoa, caverna (cristal, prisão, passagem do eco, ponte) → nov_*.png
 *  - vídeos (.webm): passeio de água (lago, ponte/rio, raso, cachoeira) dia/crepúsculo/noite e passagem pela caverna
 *  - report.json: frame time p50/p95/p99, quadros > 100/300 ms, programas de shader compilados DEPOIS do carregamento,
 *    número de PointLights no shader (deve ser constante = slots), câmera na caverna (quadros dentro da rocha),
 *    1ª × 3ª pessoa (velocidade real, altura dos olhos, FOV), erros de página.
 */
const fs = require('node:fs'), path = require('node:path');
const { chromium } = require('playwright');
const out = path.resolve('visual-lab-results/eldoria-mod316');
fs.mkdirSync(out, { recursive: true });
const report = { status: 'incomplete', platform: 'Chromium SwiftShader 852x480 (CI), não Android real', commit: process.env.GITHUB_SHA || 'local', errors: [], anchors: [], novelties: [], frame: [], camera: null, firstPerson: null, lights: null, latePrograms: [] };
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  let browser, ctx;
  try {
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    ctx = await browser.newContext({ viewport: { width: 852, height: 480 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, recordVideo: { dir: out, size: { width: 852, height: 480 } } });
    const page = await ctx.newPage();
    page.on('pageerror', e => report.errors.push(String(e.message || e).slice(0, 350)));
    page.on('response', r => { if (r.status() >= 400 && /\.(?:glb|js)(?:\?|$)/.test(r.url())) report.errors.push('HTTP ' + r.status() + ' ' + r.url().slice(0, 160)); });
    const base = process.env.VISUAL_BASE_URL || 'http://127.0.0.1:4173';
    await page.goto(base + '/mundo-3d-prototype.html?debug3d=1', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => window.SevenSinsDebug3D?.riteState?.().ready, null, { timeout: 240000 });
    await page.evaluate(() => { window.SevenSinsDebug3D.freeRoam(); window.SevenSinsDebug3D.setHour(10); });
    await wait(9000);
    const D = (fn, arg) => page.evaluate(fn, arg);
    const baseline = new Set(await D(() => window.SevenSinsDebug3D.programList()));
    const shot = async (name, js, arg = null, ms = 1700) => { await D(js, arg); await D(() => window.SevenSinsDebug3D.motionStep(.6, { x: 0, z: 0 })); await wait(ms); // câmera assentada (determinística)
      // SwiftShader pode levar >30 s num quadro pesado (caverna): espera longa e uma nova tentativa antes de falhar
      try { await page.screenshot({ path: path.join(out, name + '.png'), timeout: 150000 }); }
      catch (e) { await wait(3000); await page.screenshot({ path: path.join(out, name + '.png'), timeout: 150000 }); } };
    // ---------------- âncoras × horas
    const anchors = [['prado', 54, 160, 2.83, 6.0, .12, 7], ['ponte', 0, 12, 3.1416, 0, .1, 7], ['praca', -10, -36, 3.1416, 0, .14, 7], ['lago', -14, -80, -1.5708, 1.5708, .12, 8], ['mata', 20, -118, 3.1416, 0, .1, 6], ['gaiolas', 62, -58, 3.1416, 0, .14, 7], ['serra', -40, -232, -1.5708, 1.5708, .12, 7]];
    for (const h of [9, 13, 17.5, 22]) for (const [n, x, z, y, vy, vp, vd] of anchors) {
      await shot('anc_' + n + '_' + String(h).replace('.', 'h'), ([h, x, z, y, vy, vp, vd]) => { const a = window.SevenSinsDebug3D; a.setHour(h); a.teleport(x, z, y); a.view(vy, vp, vd); }, [h, x, z, y, vy, vp, vd]);
      report.anchors.push(n + '@' + h);
    }
    // ---------------- novidades
    const nov = [
      ['cachoeira_10h', () => { const a = window.SevenSinsDebug3D; a.setHour(10); a.teleport(66, -4); a.view(-1.75, .02, 7); }],
      ['cachoeira_17h', () => { const a = window.SevenSinsDebug3D; a.setHour(17.3); a.view(-1.75, .02, 7); }],
      ['cachoeira_21h', () => { const a = window.SevenSinsDebug3D; a.setHour(21); a.view(-1.75, .02, 7); }],
      ['mirante_17h', () => { const a = window.SevenSinsDebug3D; a.setHour(17.2); a.teleport(29, -127.5); a.view(-1.45, .06, 6); }],
      ['clareira_musgo_9h', () => { const a = window.SevenSinsDebug3D; a.setHour(9); a.teleport(-30, -123); a.view(-1.1, .12, 7); }],
      ['circulo_pedras_22h', () => { const a = window.SevenSinsDebug3D; a.setHour(22); a.teleport(-58, -137); a.view(2.4, .18, 7); }],
      ['remanso_13h', () => { const a = window.SevenSinsDebug3D; a.setHour(13); a.teleport(10, -118); a.view(-.9, .14, 7); }],
      ['trilha_samambaias_6h', () => { const a = window.SevenSinsDebug3D; a.setHour(6.6); a.teleport(-14, -105); a.view(-1.6, .08, 6); }],
      ['passaros_11h', () => { const a = window.SevenSinsDebug3D; a.setHour(11); a.teleport(54, 150); a.birdsNow(); }],
      ['lago_ondulacao_10h', () => { const a = window.SevenSinsDebug3D; a.setHour(10); a.teleport(-27, -96, Math.PI); a.view(Math.PI, .5, 5); a.rippleNow(); }],
      ['primeira_pessoa_mata_10h', () => { const a = window.SevenSinsDebug3D; a.setHour(10); a.teleport(20, -118); a.view(3.14, .02, .72); }],
    ];
    for (const [n, fn] of nov) { await shot('nov_' + n, fn, null, n.startsWith('passaros') ? 4200 : 1800); report.novelties.push(n); }
    // ---------------- frame time na mata (giro de câmera) + compilações tardias + luzes no shader
    for (const [x, z] of [[34, -56], [-52, -111], [-30, -123]]) {
      await D(([x, z]) => { const a = window.SevenSinsDebug3D; a.setHour(10); a.teleport(x, z); a.view(0, .12, 6); }, [x, z]); await wait(1200);
      report.frame.push({ spot: [x, z], ...(await D(async () => { const a = window.SevenSinsDebug3D, d = []; let last = null, n = 0; const start = performance.now();
        return new Promise(res => { function f(t) { if (last !== null) d.push(t - last); last = t; if (n++ % 3 === 0) a.view((t - start) * .0017, .1, 6);
          if (t - start > 7000) { d.sort((p, q) => p - q); const at = q => d[Math.min(d.length - 1, Math.floor(q * (d.length - 1)))]; res({ samples: d.length, p50: at(.5), p95: at(.95), p99: at(.99), max: at(1), over100: d.filter(v => v > 100).length, over300: d.filter(v => v > 300).length }); return; } requestAnimationFrame(f); } requestAnimationFrame(f); }); })) });
    }
    report.latePrograms = (await D(() => window.SevenSinsDebug3D.programList())).filter(p => !baseline.has(p));
    report.lights = await D(() => window.SevenSinsDebug3D.perfProbe ? (() => { const r = window.SevenSinsDebug3D.perfProbe(1); return { shaderPointLights: r.shaderPointLights, budget: r.lights }; })() : null);
    // ---------------- 1ª × 3ª pessoa: mesma velocidade real, olhos medidos, FOV
    report.firstPerson = await D(() => { const a = window.SevenSinsDebug3D, o = {}; for (const [mode, dist] of [['tp', 8.5], ['fp', .72], ['tp2', 8.5]]) { a.teleport(20, -118, 0); a.view(3.14, .1, dist); a.motionStep(.5, { x: 0, z: 0 }); const s0 = a.fpProbe(); a.motionStep(2, { x: 0, z: -1 }); const s1 = a.fpProbe(); a.motionStep(1.5, { x: 0, z: -1, sprint: true }); const s2 = a.fpProbe(); o[mode] = { eye: s0.eye, fov: s0.fov, walk: s1.speed, run: s2.speed, walked: +Math.hypot(s1.pos[0] - s0.pos[0], s1.pos[1] - s0.pos[1]).toFixed(2) }; } return o; });
    // ---------------- vídeo: água em três horários
    for (const h of [10, 18.3, 21.5]) for (const [x, z, vy, vp, vd] of [[-14, -80, 1.5708, .12, 8], [0, 12, 0, .1, 7], [-27, -96, Math.PI, .5, 5], [66, -4, -1.75, .02, 7]]) {
      await D(([h, x, z, vy, vp, vd]) => { const a = window.SevenSinsDebug3D; a.setHour(h); a.teleport(x, z); a.view(vy, vp, vd); }, [h, x, z, vy, vp, vd]);
      for (let i = 0; i < 12; i++) { await D(([vy, vp, vd, i]) => window.SevenSinsDebug3D.view(vy + i * .035, vp, vd), [vy, vp, vd, i]); await wait(160); }
    }
    // ---------------- caverna: câmera (quadros dentro da rocha) e câmaras novas
    await D(async () => { await window.SevenSinsDebug3D.ascension('cave'); }); await wait(2500);
    report.camera = await D(() => { const a = window.SevenSinsDebug3D, res = {}; let solid = 0, total = 0;
      for (const [n, x, z, yaw] of [['entrada', 0, -12, Math.PI], ['corredor', 0, -29, Math.PI], ['ponte', 0, -58, Math.PI], ['gruta', -24, -60.5, -Math.PI / 2], ['norte', -1.5, -98, Math.PI], ['eco', 24, -85, 2.6], ['leste', 34, -44.5, 1.1], ['eco-cristal', -30, -120, -2.1]]) {
        a.caveTo(x, z, yaw); let cy = yaw + Math.PI, s = 0; a.view(cy, .14, 8.5); a.motionStep(.4, { x: 0, z: 0 });
        for (let i = 0; i < 90; i++) { cy += Math.PI / 60; a.view(cy, .14 + .25 * Math.sin(i * .15), 8.5); a.motionStep(1 / 30, { x: 0, z: i < 45 ? 0 : -1 }); const c = a.camInfo(); if (c.solid) s++; total++; }
        res[n] = s; solid += s; }
      return { solidFrames: solid, total, perSpot: res }; });
    for (const [n, x, z, yaw] of [['caverna_cristal', -46, -114, -2.3], ['caverna_prisao', 48, -37, 1.3], ['caverna_eco_passagem', -26, -122, -2.1], ['caverna_ponte', 0, -52, Math.PI]]) {
      await shot('nov_' + n, ([x, z, yaw]) => { const a = window.SevenSinsDebug3D; a.caveTo(x, z, yaw); a.view(yaw + Math.PI, .16, 8.5); }, [x, z, yaw], 2400); report.novelties.push(n);
    }
    await shot('nov_caverna_ponte_1p', () => { const a = window.SevenSinsDebug3D; a.caveTo(0, -52, Math.PI); a.view(0, .05, .72); }, null, 2000);
    const fpTP = report.firstPerson; if (fpTP && Math.abs(fpTP.fp.walk - fpTP.tp.walk) > .01) report.errors.push('velocidade diferente entre 1ª e 3ª pessoa');
    if (report.camera && report.camera.solidFrames > 12) report.errors.push('câmera da caverna dentro da rocha em ' + report.camera.solidFrames + ' quadros');
    report.status = report.errors.length ? 'suspected_errors' : 'captured';
  } catch (e) { report.status = 'failed'; report.errors.push(String(e.stack || e).slice(0, 1700)); process.exitCode = 1; }
  finally {
    if (ctx) await ctx.close().catch(() => {}); if (browser) await browser.close().catch(() => {});
    report.videos = fs.readdirSync(out).filter(x => x.endsWith('.webm'));
    fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
    console.log('MOD316_QA ' + JSON.stringify({ status: report.status, frame: report.frame.map(f => [f.p50, f.p95, f.p99, f.over300]), late: report.latePrograms.length, camera: report.camera && report.camera.solidFrames, fp: report.firstPerson, errors: report.errors.slice(0, 5) }));
    if (report.status !== 'captured') process.exitCode = 1;
  }
})();
