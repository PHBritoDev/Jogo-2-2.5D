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

const baseModules = Object.fromEntries(['aurora-luz3d.js', 'eldoria-water.js'].map(file => [
  file, execFileSync('git', ['show', baseSha + ':' + file], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
]));
const profiles = ['low', 'medium', 'high', 'max'];
const scenes = [
  { name: 'lago-dia', hour: 13, x: -27, z: -96, yaw: Math.PI, pitch: .5, distance: 5 },
  { name: 'lago-aurora', hour: 22, x: -14, z: -80, yaw: -Math.PI / 2, pitch: .12, distance: 8 }
];
const report = {
  status: 'incomplete', baseSha, candidateSha,
  renderer: 'Chromium/WebGL SwiftShader 852x480 — não Android físico',
  profiles, scenes, cases: [], comparisons: [], errors: [], baselineRouteHits: { aurora: 0, water: 0 }
};
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function captureSide(browser, side, baseline) {
  const dir = path.join(out, side);
  fs.mkdirSync(dir, { recursive: true });
  const context = await browser.newContext({
    viewport: { width: 852, height: 480 }, deviceScaleFactor: 1,
    isMobile: true, hasTouch: true
  });
  const page = await context.newPage();
  page.on('pageerror', e => report.errors.push(side + ' pageerror: ' + String(e.message || e).slice(0, 400)));
  page.on('response', r => {
    if (r.status() >= 400 && /\.(?:glb|js)(?:\?|$)/i.test(r.url()))
      report.errors.push(side + ' HTTP ' + r.status() + ' ' + r.url().slice(0, 220));
  });
  if (baseline) {
    await page.route(/\/(?:aurora-luz3d|eldoria-water)\.js(?:\?.*)?$/, async route => {
      const name = path.basename(new URL(route.request().url()).pathname);
      if (name === 'aurora-luz3d.js') report.baselineRouteHits.aurora++;
      if (name === 'eldoria-water.js') report.baselineRouteHits.water++;
      await route.fulfill({
        status: 200, contentType: 'text/javascript; charset=utf-8',
        body: baseModules[name]
      });
    });
  }
  try {
    await page.goto(baseUrl + '/mundo-3d-prototype.html?debug3d=1&a4WaterAB=' + side, {
      waitUntil: 'domcontentloaded', timeout: 60000
    });
    await page.waitForFunction(() => window.SevenSinsDebug3D?.riteState?.().ready, null, { timeout: 240000 });
    await page.evaluate(() => window.SevenSinsDebug3D.freeRoam());

    for (const profile of profiles) {
      await page.evaluate(mode => {
        const select = document.querySelector('#graphics-profile-3d');
        if (!select) throw new Error('Seletor de qualidade não encontrado');
        select.value = mode;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }, profile);
      await wait(1100);

      for (const scene of scenes) {
        await page.evaluate(s => {
          const d = window.SevenSinsDebug3D;
          d.setHour(s.hour);
          d.teleport(s.x, s.z, s.yaw);
          d.view(s.yaw, s.pitch, s.distance);
        }, scene);
        await wait(1400);
        const diagnostic = await page.evaluate(async () => {
          const d = window.SevenSinsDebug3D;
          const T = await import('three');
          const A = await import('./aurora-luz3d.js');
          const u = A.auroraUniforms(T);
          const state = d.state?.() || {};
          return {
            profile: document.querySelector('#graphics-profile-3d')?.value || null,
            status: document.querySelector('#graphics-status-3d')?.textContent || null,
            camera: d.cam?.() || null,
            calls: state.calls ?? state.drawCalls ?? null,
            triangles: state.triangles ?? null,
            programCount: d.programList?.()?.length ?? null,
            lowUniform: u.uAurLow?.value ?? null
          };
        });
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
    }
  } finally {
    await context.close();
  }
}

async function imageDiff(a, b) {
  const [A, B] = await Promise.all([
    sharp(a).removeAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(b).removeAlpha().raw().toBuffer({ resolveWithObject: true })
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
    if (!report.baselineRouteHits.aurora || !report.baselineRouteHits.water)
      report.errors.push('Baseline inválido: não interceptou os dois módulos A4');
    for (const profile of profiles) for (const scene of scenes) {
      const a = report.cases.find(x => x.side === 'baseline' && x.profile === profile && x.scene === scene.name);
      const b = report.cases.find(x => x.side === 'candidate' && x.profile === profile && x.scene === scene.name);
      if (!a || !b) { report.errors.push('Captura ausente: ' + profile + '/' + scene.name); continue; }
      report.comparisons.push({
        profile, scene: scene.name,
        cameraDelta: a.camera && b.camera && a.camera.length === b.camera.length
          ? +Math.max(...a.camera.map((v, i) => Math.abs(v - b.camera[i]))).toFixed(4) : null,
        baselineCalls: a.calls, candidateCalls: b.calls,
        baselineTriangles: a.triangles, candidateTriangles: b.triangles,
        pixels: await imageDiff(path.join(out, a.image), path.join(out, b.image))
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
      status: report.status, errors: report.errors,
      baselineRouteHits: report.baselineRouteHits,
      comparisons: report.comparisons
    }, null, 2));
    if (report.status !== 'captured') process.exitCode = 1;
  }
})();
