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
const SEED = () => { let state = 0xA3D11A; Math.random = () => { state = (Math.imul(1664525, state) + 1013904223) >>> 0; return state / 4294967296; }; try { if (!sessionStorage.getItem('qa-seed')) { sessionStorage.setItem('qa-seed', '1'); localStorage.clear(); } } catch (e) {} };

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
  // Fase 2 — rio: Vau das Pedras (lâmina ~0,5 m, a pé), pedras-degrau acima da água e barranco em rampa
  ['vau-travessia', [19.2, -6, 19.2, -18.5, { seconds: 10 }], r => r.progress > .95 && !r.fell], // margem norte → margem sul pelo vau
  ['vau-travessia-volta', [19.2, -18.5, 19.2, -6, { seconds: 10 }], r => r.progress > .95 && !r.fell], // margem sul → margem norte
  ['vau-pedras-volta', [18.6, -17, 19.45, -9.4, { seconds: 2.4 }], r => r.end[2] > -13.4 && r.end[1] > -.55 && !r.fell],
  // Fase 2 — chegada e praça: Adro da Árvore (escadaria, escada norte, pódio e parapeito) e Rua da Entrada
  ['adro-atravessa', [-12.8, -48, -12.8, -61, { seconds: 8 }], r => r.progress > .95 && r.maxY > .55 && !r.fell],
  ['adro-volta', [-12.8, -61, -12.8, -47, { seconds: 8 }], r => r.progress > .95 && r.maxY > .55 && !r.fell],
  ['adro-lateral', [-18.5, -54.1, -12.8, -54.1, { seconds: 4 }], r => r.end[0] < -15.7 && r.pen === 0],
  ['rua-entrada', [-1.6, -30.2, -12, -41, { seconds: 8 }], r => r.progress > .95 && !r.fell],
  // Fase 2 — fachadas: as jardineiras/lenha não fecham a porta (aproximação de 2,2 m até a soleira)
  ['porta-casa-A4', [-9.07, -33.23, -11.08, -32.22, { seconds: 2.4 }], r => r.progress > .85 && r.pen === 0],
  ['porta-casa-B3', [-24.2, -35.98, -26.03, -34.68, { seconds: 2.4 }], r => r.progress > .85 && r.pen === 0],
  ['vau-pedras-degrau', [19.45, -9.4, 18.68, -16.9, { seconds: 2.1 }], r => r.end[2] < -13.4 && r.end[1] > -.55 && !r.fell], // no meio do rio, pés acima da lâmina (-0,5)
  ['margem-rampa', [48, -3, 48, -10.4, { seconds: 4 }], r => r.progress > .9 && !r.fell],
];
const SHOTS = [
  ['prado', 'D.teleport(54,158,Math.PI);D.view(Math.PI*.92,.18,7.5)'],
  ['estrada', 'D.teleport(53,60,Math.PI);D.view(Math.PI,.15,7)'],
  ['rio', 'D.teleport(30,-7,Math.PI);D.view(Math.PI*.95,.2,7.5)'],
  ['vau', 'D.teleport(19.2,-8.6,Math.PI);D.view(0,.3,5.5)'],
  ['adro', 'D.teleport(-12,-46,0);D.view(0,.2,8)'],
  ['ponte', 'D.teleport(-.4,-3.5,Math.PI);D.view(Math.PI*.9,.2,8)'],
  ['vista-eldoria', 'D.teleport(-.6,-20,Math.PI);D.view(Math.PI,.08,6)'],
  ['praca', 'D.teleport(-12,-40,Math.PI);D.view(Math.PI*1.1,.2,9)'],
];

const CLEARING_SHOTS = [
  { id: 'vigia', x: 29, z: 96.5, yaw: Math.PI / 2, pitch: .55, dist: 20 },
  { id: 'respiro-leste', x: 96, z: 70, yaw: Math.PI / 2, pitch: .55, dist: 20 },
  { id: 'respiro-oeste', x: 20, z: 128, yaw: Math.PI / 2, pitch: .55, dist: 18 },
  { id: 'garganta', x: 70, z: 200, yaw: 0, pitch: .55, dist: 16 },
];
const CAMERA_TRIES = [[0, 1], [.55, 1], [-.55, 1], [0, .7], [1.1, .85], [-1.1, .85], [Math.PI, 1]];

async function session(browser, viewport, mobile, out, rec, baseUrl = process.env.VISUAL_BASE_URL || 'http://127.0.0.1:4173') {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, ...(rec ? { recordVideo: { dir: out, size: viewport } } : {}) });
  await ctx.addInitScript(SEED);
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(String(e.message || e).slice(0, 300)));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
  page.on('response', r => { if (r.status() >= 400 && /\.(?:glb|js|png|jpg|webp)(?:\?|$)/.test(r.url())) errs.push('HTTP ' + r.status() + ' ' + r.url().slice(0, 140)); });
  if (process.env.THREE_LOCAL) await page.route(/cdn\.jsdelivr\.net\/npm\/three@0\.160\.0\/(.*)/, async r => { const rel = r.request().url().split('three@0.160.0/')[1].split('?')[0]; await r.fulfill({ path: path.join(process.env.THREE_LOCAL, rel), contentType: 'text/javascript' }); });
  await page.goto(baseUrl + '/mundo-3d-prototype.html?debug3d=1&build=r' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.SevenSinsDebug3D?.riteState?.().ready, null, { timeout: 300000 });
  await wait(2500); await page.evaluate(() => window.SevenSinsDebug3D.freeRoam());
  return { ctx, page, errs };
}
const frames = (page, ms) => page.evaluate(async ms => { const d = []; let last = null; const t0 = performance.now(); return new Promise(res => { function f(t) { if (last !== null) d.push(t - last); last = t; if (t - t0 > ms) { d.sort((a, b) => a - b); const q = x => +d[Math.min(d.length - 1, Math.floor(d.length * x))].toFixed(1); const r = window.SevenSinsDebug3D.combatReport().draw; res({ n: d.length, p50: q(.5), p95: q(.95), p99: q(.99), max: +d[d.length - 1].toFixed(1), calls: r.calls, tris: r.triangles }); } else requestAnimationFrame(f); } requestAnimationFrame(f); }); }, ms);
const snap = async (page, file) => { try { await page.screenshot({ path: file, timeout: 150000 }); } catch (e) { await wait(3000); await page.screenshot({ path: file, timeout: 150000 }); } };

// Não basta esperar um tempo fixo: SwiftShader pode renderizar poucos frames em 1,8 s.
// O A/B só é válido quando a câmera real parou e pode ser comparada entre os dois servidores.
async function waitCameraStable(page, maxMs = 9000, expectDist = null) {
  const started = Date.now();
  let previous = null, stableSamples = 0, camera = null;
  while (Date.now() - started < maxMs) {
    const sample = await page.evaluate(expected => {
      const D = window.SevenSinsDebug3D, camera = D.cam();
      const framing = typeof D.camView === 'function' ? D.camView() : null;
      const near = expected == null || !framing || !Number.isFinite(framing.camToHero)
        || Math.abs(framing.camToHero - expected) < Math.max(1.2, expected * .35);
      return { camera, near };
    }, expectDist);
    camera = sample.camera;
    const valid = Array.isArray(camera) && camera.length === 3 && camera.every(Number.isFinite);
    const delta = valid && previous ? Math.hypot(...camera.map((v, i) => v - previous[i])) : Infinity;
    if (valid && sample.near && delta < .03) {
      if (++stableSamples >= 2) return { stable: true, camera, elapsedMs: Date.now() - started };
    } else stableSamples = 0;
    previous = valid ? camera : null;
    await wait(400);
  }
  return { stable: false, camera, elapsedMs: Date.now() - started };
}

function isOccluded(framing) {
  return !!(framing?.blocked && Number.isFinite(framing.blocked.dist)
    && Number.isFinite(framing.camToHero) && framing.blocked.dist < framing.camToHero - 1.5);
}

async function captureClearingsAB(browser, profileName, viewport, mobile) {
  const baselineUrl = process.env.VISUAL_BASELINE_URL;
  if (!baselineUrl) return null;
  const candidateUrl = process.env.VISUAL_BASE_URL || 'http://127.0.0.1:4173';
  const out = path.join(root, profileName, 'clearings-ab');
  fs.mkdirSync(out, { recursive: true });
  const result = { baseline: { shots: [] }, candidate: { shots: [] } };

  for (const [variant, url] of [['baseline', baselineUrl], ['candidate', candidateUrl]]) {
    const { ctx, page, errs } = await session(browser, viewport, mobile, out, false, url);
    await page.addStyleTag({ content: 'body *{visibility:hidden!important}canvas#scene{visibility:visible!important}' });
    await page.evaluate(() => { const D = window.SevenSinsDebug3D; D.setHour(15); D.weather('limpo'); });
    await page.waitForFunction(() => window.SevenSinsValleyReport?.groundCover?.tufts > 0, null, { timeout: 120000 });
    const groundCover = await page.evaluate(() => window.SevenSinsValleyReport.groundCover);
    result[variant].groundCover = groundCover;
    if (groundCover.tufts < 800 || groundCover.flowers < 230) {
      const msg = profileName + '/' + variant + ': cobertura do vale ausente ou insuficiente ' + JSON.stringify(groundCover);
      result[variant].error = msg;
      report.errors.push(msg);
    }

    for (const shot of CLEARING_SHOTS) {
      await page.evaluate(s => {
        const D = window.SevenSinsDebug3D;
        D.teleport(s.x, s.z, s.yaw);
        D.fly(null);
        D.motionStep(.4, { x: 0, z: 0 });
      }, shot);

      const baseline = variant === 'candidate' ? result.baseline.shots.find(x => x.id === shot.id) : null;
      const views = baseline?.cameraSettings
        ? [baseline.cameraSettings]
        : CAMERA_TRIES.map(([dy, scale]) => ({
            yaw: shot.yaw + dy,
            pitch: shot.pitch,
            distance: +(shot.dist * scale).toFixed(2),
          }));
      let selectedView = null, cameraStability = null, diagnostics = null;
      const cameraAttempts = [];
      for (const view of views) {
        await page.evaluate(v => {
          const D = window.SevenSinsDebug3D;
          D.view(v.yaw, v.pitch, v.distance);
          D.snapCam();
        }, view);
        cameraStability = await waitCameraStable(page, 9000, view.distance);
        await wait(400);
        diagnostics = await page.evaluate(() => {
          const D = window.SevenSinsDebug3D, state = D.state();
          return {
            state,
            camera: D.cam(),
            framing: typeof D.camView === 'function' ? D.camView() : null,
          };
        });
        const cameraValid = Array.isArray(diagnostics.camera) && diagnostics.camera.length === 3 && diagnostics.camera.every(Number.isFinite);
        const visible = diagnostics.framing?.onScreen === true;
        const blocked = isOccluded(diagnostics.framing);
        cameraAttempts.push({
          yaw: +view.yaw.toFixed(3), pitch: view.pitch, distance: view.distance,
          stable: cameraStability.stable, onScreen: visible, blocked: blocked ? diagnostics.framing.blocked : null,
        });
        selectedView = view;
        if (cameraStability.stable && cameraValid && visible && !blocked) break;
        if (variant === 'candidate') break;
      }

      const state = diagnostics?.state || {};
      const rawPosition = [state.x, state.y, state.z].map(Number);
      const position = rawPosition.map(v => Number.isFinite(v) ? +v.toFixed(3) : null);
      const file = variant + '-' + shot.id + '.png';
      await snap(page, path.join(out, file));
      const cameraValid = Array.isArray(diagnostics?.camera) && diagnostics.camera.length === 3 && diagnostics.camera.every(Number.isFinite);
      const entry = {
        id: shot.id, file, walkable: !!state.walkable,
        position,
        camera: diagnostics?.camera || null,
        cameraStable: !!cameraStability?.stable,
        cameraStableMs: cameraStability?.elapsedMs ?? null,
        framing: diagnostics?.framing || null,
        cameraSettings: selectedView,
        cameraAttempts,
      };
      result[variant].shots.push(entry);
      if (!entry.cameraStable || !cameraValid) {
        const msg = profileName + '/' + variant + '/' + shot.id + ': câmera inválida, instável ou fora da distância esperada';
        report.errors.push(msg);
      }
      if (!entry.framing) {
        const msg = profileName + '/' + variant + '/' + shot.id + ': camView indisponível; enquadramento não verificável';
        report.errors.push(msg);
      } else {
        if (entry.framing.onScreen !== true) {
          const msg = profileName + '/' + variant + '/' + shot.id + ': protagonista fora do quadro';
          report.errors.push(msg);
        }
        if (isOccluded(entry.framing)) {
          const msg = profileName + '/' + variant + '/' + shot.id + ': linha de visão bloqueada por ' +
            (entry.framing.blocked.name || 'objeto') + ' a ' + entry.framing.blocked.dist.toFixed(2) + ' m';
          report.errors.push(msg);
        }
      }
      if (variant === 'candidate') {
        if (baseline?.camera && cameraValid) {
          const delta = Math.hypot(...diagnostics.camera.map((v, i) => v - baseline.camera[i]));
          entry.cameraDeltaFromBaseline = +delta.toFixed(3);
          if (delta > .5) {
            const msg = profileName + '/' + shot.id + ': câmera A/B divergiu ' + delta.toFixed(2) + ' m';
            report.errors.push(msg);
          }
        } else {
          const msg = profileName + '/' + shot.id + ': não foi possível comparar a câmera A/B';
          report.errors.push(msg);
        }
        if (baseline?.position?.every(Number.isFinite) && position.every(Number.isFinite)) {
          const delta = Math.hypot(...position.map((v, i) => v - baseline.position[i]));
          entry.playerDeltaFromBaseline = +delta.toFixed(3);
          if (delta > .05) {
            const msg = profileName + '/' + shot.id + ': posição XYZ do jogador divergiu ' + delta.toFixed(3) + ' m';
            report.errors.push(msg);
          }
        } else {
          const msg = profileName + '/' + shot.id + ': não foi possível comparar a posição XYZ do jogador';
          report.errors.push(msg);
        }
        if (baseline?.framing?.onScreen !== true || entry.framing?.onScreen !== true) {
          const msg = profileName + '/' + shot.id + ': protagonista não ficou enquadrado nos dois lados do A/B';
          report.errors.push(msg);
        }
        if (!entry.walkable && baseline?.walkable) {
          const msg = profileName + '/candidate/' + shot.id + ': perdeu walkability em relação à main';
          result[variant].error = result[variant].error ? result[variant].error + '; ' + msg : msg;
          report.errors.push(msg);
        }
      }
    }
    if (errs.length) {
      result[variant].pageErrors = errs;
      const real = errs.filter(e => !/KHR_parallel|PropertyBinding|WebGL/.test(e));
      if (real.length) report.errors.push(profileName + '/' + variant + ': ' + real.slice(0, 3).join(' | '));
    }
    await ctx.close();
  }
  return result;
}

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
    if (process.env.VISUAL_BASELINE_URL) {
      report.clearingsAB = {
        baselineSha: process.env.PR_BASE_SHA || null,
        candidateSha: process.env.PR_HEAD_SHA || process.env.GITHUB_SHA || null,
        conditions: { hour: 15, weather: 'limpo', randomSeed: '0xA3D11A', sameViewportAndCamera: false, samePlayerPosition: false, allActorsFramed: false },
        profiles: {},
      };
      report.clearingsAB.profiles.mobile = await captureClearingsAB(browser, 'mobile', { width: 852, height: 393 }, true);
      if (!process.env.QA_ONLY_MOBILE) report.clearingsAB.profiles.desktop = await captureClearingsAB(browser, 'desktop', { width: 1280, height: 720 }, false);
      const abProfiles = Object.values(report.clearingsAB.profiles).filter(Boolean);
      const allAbShots = abProfiles.flatMap(p => [...p.baseline.shots, ...p.candidate.shots]);
      const candidateShots = abProfiles.flatMap(p => p.candidate.shots);
      const expectedPairs = abProfiles.length * CLEARING_SHOTS.length;
      const allStable = allAbShots.length === expectedPairs * 2 && allAbShots.every(s => s.cameraStable === true && Array.isArray(s.camera) && s.camera.length === 3 && s.camera.every(Number.isFinite));
      const sameCamera = candidateShots.length === expectedPairs && candidateShots.every(s => Number.isFinite(s.cameraDeltaFromBaseline) && s.cameraDeltaFromBaseline <= .5);
      const samePlayer = candidateShots.length === expectedPairs && candidateShots.every(s => Number.isFinite(s.playerDeltaFromBaseline) && s.playerDeltaFromBaseline <= .05);
      const allFramed = allAbShots.length === expectedPairs * 2 && allAbShots.every(s => s.framing?.onScreen === true && !isOccluded(s.framing));
      report.clearingsAB.conditions.sameViewportAndCamera = allStable && sameCamera;
      report.clearingsAB.conditions.samePlayerPosition = samePlayer;
      report.clearingsAB.conditions.allActorsFramed = allFramed;
      if (!allStable) report.errors.push('A/B: pelo menos uma câmera não estabilizou na distância esperada ou não foi medida');
      if (!sameCamera) report.errors.push('A/B: câmera candidata não corresponde à câmera baseline em todos os pontos');
      if (!samePlayer) report.errors.push('A/B: posição XYZ do jogador não corresponde à baseline em todos os pontos');
      if (!allFramed) report.errors.push('A/B: protagonista fora do quadro ou obstruído em pelo menos um enquadramento');
      report.clearingsAB.status = report.errors.length ? 'failed' : 'captured';
    }
    for (const [k, P] of Object.entries(report.profiles)) {
      const real = P.errors.filter(e => !/KHR_parallel|PropertyBinding|WebGL/.test(e)); if (real.length) report.errors.push(k + ': ' + real.slice(0, 3).join(' | '));
      const bad = P.nav.filter(n => !n.ok).map(n => n.id); if (bad.length) report.errors.push(k + ': navegação falhou em ' + bad.join(', '));
    }
    report.status = report.errors.length ? 'failed' : 'captured';
  } catch (e) { report.status = 'failed'; report.errors.push(String(e && e.stack || e).slice(0, 600)); }
  finally { if (browser) await browser.close(); fs.writeFileSync(path.join(root, 'report.json'), JSON.stringify(report, null, 2)); console.log('RENASCIMENTO_F1_QA', JSON.stringify({ status: report.status, errors: report.errors, nav: Object.fromEntries(Object.entries(report.profiles).map(([k, P]) => [k, P.nav.map(n => n.id + ':' + (n.ok ? 'ok' : 'FALHA'))])), perf: Object.fromEntries(Object.entries(report.profiles).map(([k, P]) => [k, P.perf])) })); process.exitCode = report.status === 'captured' ? 0 : 1; }
})();
