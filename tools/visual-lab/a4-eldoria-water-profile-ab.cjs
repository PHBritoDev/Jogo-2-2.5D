'use strict';
/* A4 — A/B real da água de Eldória: módulos da base vs. PR, mesma câmera/hora/perfil.
 * SwiftShader serve para inspeção visual comparativa; nunca é benchmark de Android físico.
 */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');
const sharp = require('sharp');

const baseSha = process.env.BASE_SHA || '';
const candidateSha = process.env.CANDIDATE_SHA || process.env.GITHUB_SHA || 'local';
const baseUrl = process.env.VISUAL_BASE_URL || 'http://127.0.0.1:4173';
const out = path.resolve('visual-lab-results/a4-water-profile-ab');
fs.mkdirSync(out, { recursive: true });
if (!/^[a-f0-9]{40}$/.test(baseSha)) throw new Error('BASE_SHA ausente ou inválido');

const baseModules = Object.fromEntries(['mundo-3d-prototype.js', 'aurora-luz3d.js', 'eldoria-water.js'].map(file => [
  file, execFileSync('git', ['show', baseSha + ':' + file], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
]));
const profiles = ['low', 'medium', 'high', 'max'];
const scenes = [
  {
    name: 'lago-dia', hour: 13, x: -27, z: -96, yaw: Math.PI, pitch: .5, distance: 5,
    // Faixa superior central: correnteza visível, fora do HUD, toast e jogador.
    waterRoi: { left: 320, top: 75, width: 140, height: 60 }
  },
  {
    name: 'lago-aurora', hour: 22, x: -27, z: -96, yaw: Math.PI, pitch: .08, distance: 10,
    // Faixa central-esquerda da água; y=310 era chão, não água.
    waterRoi: { left: 280, top: 235, width: 100, height: 40 }
  }
];
const report = {
  status: 'incomplete', baseSha, candidateSha,
  renderer: 'Chromium/WebGL SwiftShader 852x480 — não Android físico',
  profiles, scenes, cases: [], comparisons: [], errors: [], warnings: [], baselineRouteHits: { world: 0, aurora: 0, water: 0 }
};
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function captureSide(browser, side, baseline) {
  // Um contexto novo por perfil: a preferência é carregada antes do módulo da aurora
  // e não depende de uma troca de select depois que o relógio do shader for congelado.
  for (const profile of profiles) {
    const context = await browser.newContext({
      viewport: { width: 852, height: 480 }, deviceScaleFactor: 1,
      isMobile: true, hasTouch: true
    });
    await context.addInitScript(({ selectedProfile }) => {
      let seed = 0xA4E1D0;
      Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
      localStorage.setItem('seven-sins-3d-graphics', selectedProfile);
    }, { selectedProfile: profile });
    const page = await context.newPage();
    page.on('pageerror', e => report.errors.push(side + ' pageerror: ' + String(e.message || e).slice(0, 400)));
    page.on('console', msg => { if (msg.type() === 'error') report.errors.push(side + ' console: ' + msg.text().slice(0, 400)); });
    page.on('requestfailed', req => { const why = req.failure()?.errorText || ''; if (!/ERR_ABORTED|cancelled/i.test(why)) report.errors.push(side + ' requestfailed: ' + why + ' ' + req.url().slice(0, 180)); });
    page.on('response', r => {
      if (r.status() >= 400 && /\.(?:glb|js)(?:\?|$)/i.test(r.url()))
        report.errors.push(side + ' HTTP ' + r.status() + ' ' + r.url().slice(0, 220));
    });
    if (baseline) {
      await page.route(/\/(?:mundo-3d-prototype|aurora-luz3d|eldoria-water)\.js(?:\?.*)?$/, async route => {
        const name = path.basename(new URL(route.request().url()).pathname);
        if (name === 'mundo-3d-prototype.js') report.baselineRouteHits.world++;
        if (name === 'aurora-luz3d.js') report.baselineRouteHits.aurora++;
        if (name === 'eldoria-water.js') report.baselineRouteHits.water++;
        await route.fulfill({
          status: 200, contentType: 'text/javascript; charset=utf-8',
          body: baseModules[name]
        });
      });
    }
    try {
      await page.goto(baseUrl + '/mundo-3d-prototype.html?debug3d=1&a4WaterAB=' + side + '-' + profile, {
        waitUntil: 'domcontentloaded', timeout: 60000
      });
      await page.waitForFunction(() => window.SevenSinsDebug3D?.riteState?.().ready, null, { timeout: 240000 });
      await page.evaluate(() => window.SevenSinsDebug3D.freeRoam());
      await wait(1800);

      for (const scene of scenes) {
        await page.evaluate(s => {
          const d = window.SevenSinsDebug3D;
          d.setHour(s.hour);
          if (typeof d.weather === 'function') d.weather('limpo');
          d.teleport(s.x, s.z);
          d.fly(null);
          d.view(s.yaw, s.pitch, s.distance);
          // snapCam é o mesmo ajuste imediato usado pelo QA de dimensão/câmera do projeto.
          window.__a4SnapCamera = typeof d.snapCam === 'function' ? d.snapCam() : null;
          window.__a4CameraPrevious = null;
          window.__a4CameraStable = 0;
          window.__a4MetricsPrevious = null;
          window.__a4MetricsStable = 0;
        }, scene);
        await page.waitForFunction(s => {
          const d = window.SevenSinsDebug3D;
          const state = d?.state?.();
          return state && Number.isFinite(state.x) && Number.isFinite(state.z)
            && Math.hypot(state.x - s.x, state.z - s.z) < .25;
        }, scene, { timeout: 20000, polling: 100 });
        await page.waitForFunction(() => {
          const d = window.SevenSinsDebug3D;
          const camera = d?.cam?.();
          if (!Array.isArray(camera) || camera.length !== 3 || !camera.every(Number.isFinite)) return false;
          const previous = window.__a4CameraPrevious;
          window.__a4CameraPrevious = camera;
          const delta = previous ? Math.hypot(camera[0] - previous[0], camera[1] - previous[1], camera[2] - previous[2]) : Infinity;
          window.__a4CameraStable = delta < .015 ? (window.__a4CameraStable || 0) + 1 : 0;
          return window.__a4CameraStable >= 4;
        }, null, { timeout: 20000, polling: 100 });
        const metricsStable = await page.waitForFunction(() => {
          const d = window.SevenSinsDebug3D, state = d?.state?.() || {};
          const signature = [state.calls ?? state.drawCalls ?? null, state.triangles ?? null, d?.programList?.()?.length ?? null].join(':');
          const previous = window.__a4MetricsPrevious;
          window.__a4MetricsPrevious = signature;
          window.__a4MetricsStable = signature === previous ? (window.__a4MetricsStable || 0) + 1 : 0;
          return window.__a4MetricsStable >= 4;
        }, null, { timeout: 12000, polling: 250 }).then(() => true).catch(() => false);
        await page.evaluate(flag => { window.__a4MetricsStableFlag = flag; }, metricsStable);
        if (!metricsStable) report.warnings.push(side + '/' + profile + '/' + scene.name + ': métricas de render não estabilizaram em 12 s');
        await wait(1500);

        // Perfil já foi carregado no localStorage antes do boot. Congelar o tempo agora
        // mantém água/aurora no mesmo instante sem impedir a troca de perfil entre páginas.
        const frozenTime = await page.evaluate(s => {
          try {
            const fixed = 60000;
            Object.defineProperty(performance, 'now', { configurable: true, value: () => fixed });
            window.__a4FrozenTimeMs = fixed;
            // Reaplica a hora após congelar o relógio de animação: o frame anterior pode ter avançado gameClock.
            window.SevenSinsDebug3D.setHour(s.hour);
            return fixed;
          } catch (error) {
            return String(error?.message || error);
          }
        }, scene);
        if (frozenTime !== 60000) report.errors.push(side + '/' + profile + '/' + scene.name + ': não foi possível congelar o relógio A/B: ' + frozenTime);
        const expectedNightFactor = scene.hour >= 18 || scene.hour < 6 ? 1 : 0;
        await page.waitForFunction(s => {
          const d = window.SevenSinsDebug3D, state = d?.state?.() || {};
          const hour = state.dim?.hour, night = state.night, aurora = window.__aurora327U?.uAurK?.value;
          const expectedNight = s.hour >= 18 || s.hour < 6 ? 1 : 0;
          return Number.isFinite(hour) && Math.abs(hour - s.hour) <= .05
            && Number.isFinite(night) && Math.abs(night - expectedNight) <= .01
            && Number.isFinite(aurora) && (expectedNight ? aurora >= .5 : aurora <= .05);
        }, scene, { timeout: 8000, polling: 100 });
        await wait(120);
        const diagnostic = await page.evaluate(async () => {
          const d = window.SevenSinsDebug3D;
          const T = await import('three');
          const A = await import('./aurora-luz3d.js');
          const u = A.auroraUniforms(T);
          const state = d.state?.() || {};
          return {
            profile: document.querySelector('#graphics-profile-3d')?.value || null,
            status: document.querySelector('#graphics-status-3d')?.textContent || null,
            frozenTimeMs: window.__a4FrozenTimeMs ?? null,
            metricsStable: window.__a4MetricsStableFlag ?? false,
            player: [state.x, state.y, state.z],
            camera: d.cam?.() || null,
            snapCamera: window.__a4SnapCamera || null,
            calls: state.calls ?? state.drawCalls ?? null,
            triangles: state.triangles ?? null,
            programCount: d.programList?.()?.length ?? null,
            hour: state.dim?.hour ?? null,
            night: state.night ?? null,
            auroraK: u.uAurK?.value ?? null,
            awakeningActive: state.awakeningActive ?? null,
            dialogueOpen: state.dialogueOpen ?? null,
            namePromptOpen: state.namePromptOpen ?? null,
            lowUniform: u.uAurLow?.value ?? null
          };
        });
        if (!diagnostic.player.every(Number.isFinite)
          || Math.hypot(diagnostic.player[0] - scene.x, diagnostic.player[2] - scene.z) >= .25)
          report.errors.push(side + '/' + profile + '/' + scene.name + ': teleporte não estabilizou; player=' + JSON.stringify(diagnostic.player));
        if (!Number.isFinite(diagnostic.hour) || Math.abs(diagnostic.hour - scene.hour) > .05)
          report.errors.push(side + '/' + profile + '/' + scene.name + ': gameClock.hour divergente; esperado=' + scene.hour + ' real=' + diagnostic.hour);
        if (!Number.isFinite(diagnostic.night) || Math.abs(diagnostic.night - expectedNightFactor) > .01)
          report.errors.push(side + '/' + profile + '/' + scene.name + ': fase dia/noite divergente; esperado=' + expectedNightFactor + ' real=' + diagnostic.night);
        if (!Number.isFinite(diagnostic.auroraK) || (expectedNightFactor ? diagnostic.auroraK < .5 : diagnostic.auroraK > .05))
          report.errors.push(side + '/' + profile + '/' + scene.name + ': intensidade/uniforme da aurora incompatível com a hora; uAurK=' + diagnostic.auroraK);
        if (diagnostic.awakeningActive || diagnostic.dialogueOpen || diagnostic.namePromptOpen)
          report.errors.push(side + '/' + profile + '/' + scene.name + ': estado inicial/cinemática ainda ativo durante a captura');
        const file = side + '/' + profile + '-' + scene.name + '.png';
        await page.screenshot({ path: path.join(out, file), timeout: 90000, animations: 'disabled' });
        report.cases.push({ side, profile, scene: scene.name, hour: scene.hour, image: file, ...diagnostic });
        if (diagnostic.profile !== profile) report.errors.push(side + '/' + profile + ': seletor não confirmou perfil');
        if (!baseline) {
          const expected = profile === 'low' ? 1 : 0;
          if (diagnostic.lowUniform !== expected)
            report.errors.push(profile + '/' + scene.name + ': uAurLow=' + diagnostic.lowUniform + ', esperado ' + expected);
        }
      }
    } finally {
      await context.close();
    }
  }
}

async function imageDiff(a, b, region = null) {
  const input = file => { const img = sharp(file); return region ? img.extract(region) : img; };
  const [A, B] = await Promise.all([
    input(a).removeAlpha().raw().toBuffer({ resolveWithObject: true }),
    input(b).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  ]);
  if (A.info.width !== B.info.width || A.info.height !== B.info.height) throw new Error('A/B dimensions differ');
  let sum = 0, count = 0;
  const diffs = new Uint8Array(A.data.length);
  for (let i = 0; i < A.data.length; i++) {
    const d = Math.abs(A.data[i] - B.data[i]);
    diffs[i] = d; sum += d; if (d > 4) count++;
  }
  diffs.sort();
  return {
    meanAbsRGB: +(sum / diffs.length).toFixed(4),
    p95AbsChannel: diffs[Math.floor((diffs.length - 1) * .95)],
    changedChannelsOver4: +(count / diffs.length).toFixed(4)
  };
}

(async () => {
  let browser;
  try {
    browser = await chromium.launch({ headless: true, args: [
      '--no-sandbox', '--disable-dev-shm-usage', '--enable-webgl',
      '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader'
    ] });
    await captureSide(browser, 'baseline', true);
    await captureSide(browser, 'candidate', false);
    if (!report.baselineRouteHits.world || !report.baselineRouteHits.aurora || !report.baselineRouteHits.water)
      report.errors.push('Baseline inválido: não interceptou mundo + os dois módulos A4');
    for (const profile of profiles) for (const scene of scenes) {
      const a = report.cases.find(x => x.side === 'baseline' && x.profile === profile && x.scene === scene.name);
      const b = report.cases.find(x => x.side === 'candidate' && x.profile === profile && x.scene === scene.name);
      if (!a || !b) { report.errors.push('Captura ausente: ' + profile + '/' + scene.name); continue; }
      const cameraDelta = a.camera && b.camera && a.camera.length === b.camera.length
        ? +Math.max(...a.camera.map((v, i) => Math.abs(v - b.camera[i]))).toFixed(4) : null;
      const playerDelta = a.player && b.player && a.player.length === b.player.length
        ? +Math.max(...a.player.map((v, i) => Math.abs(v - b.player[i]))).toFixed(4) : null;
      const hourDelta = Number.isFinite(a.hour) && Number.isFinite(b.hour) ? +Math.abs(a.hour - b.hour).toFixed(3) : null;
      const nightDelta = Number.isFinite(a.night) && Number.isFinite(b.night) ? +Math.abs(a.night - b.night).toFixed(3) : null;
      const auroraDelta = Number.isFinite(a.auroraK) && Number.isFinite(b.auroraK) ? +Math.abs(a.auroraK - b.auroraK).toFixed(3) : null;
      const lightingStateComparable = hourDelta !== null && hourDelta <= .05
        && nightDelta !== null && nightDelta <= .01 && auroraDelta !== null && auroraDelta <= .05;
      if (cameraDelta !== null && cameraDelta > .02)
        report.errors.push(profile + '/' + scene.name + ': câmera A/B divergiu ' + cameraDelta);
      if (playerDelta !== null && playerDelta > .02)
        report.errors.push(profile + '/' + scene.name + ': jogador A/B divergiu ' + playerDelta);
      if (!lightingStateComparable)
        report.errors.push(profile + '/' + scene.name + ': estado de iluminação A/B divergiu (hour=' + hourDelta + ', night=' + nightDelta + ', aurora=' + auroraDelta + ')');
      const renderBudgetComparable = a.calls === b.calls && a.triangles === b.triangles;
      if (!renderBudgetComparable)
        report.warnings.push(profile + '/' + scene.name + ': orçamento de render variou entre boots; comparar como informativo (LOD/culling assíncrono)');
      const baselineImage = path.join(out, a.image), candidateImage = path.join(out, b.image);
      report.comparisons.push({
        profile, scene: scene.name, cameraDelta, playerDelta, hourDelta, nightDelta, auroraDelta, lightingStateComparable, renderBudgetComparable,
        baselineCalls: a.calls, candidateCalls: b.calls,
        baselineTriangles: a.triangles, candidateTriangles: b.triangles,
        pixels: await imageDiff(baselineImage, candidateImage),
        waterPixels: scene.waterRoi ? await imageDiff(baselineImage, candidateImage, scene.waterRoi) : null,
        skyPixels: scene.skyRoi ? await imageDiff(baselineImage, candidateImage, scene.skyRoi) : null
      });
    }
    report.status = report.errors.length ? 'failed' : 'captured';
  } catch (e) {
    report.status = 'failed';
    report.errors.push(String(e.stack || e).slice(0, 2400));
  } finally {
    if (browser) await browser.close().catch(() => {});
    fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({
      status: report.status, errors: report.errors, warnings: report.warnings,
      baselineRouteHits: report.baselineRouteHits,
      comparisons: report.comparisons
    }, null, 2));
    if (report.status !== 'captured') process.exitCode = 1;
  }
})();
