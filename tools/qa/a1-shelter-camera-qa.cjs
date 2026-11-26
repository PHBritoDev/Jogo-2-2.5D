'use strict';
/* A1 — comparação visual A/B do braço da câmera no abrigo da Mata.
 * A telemetria usa um pose fixo de QA (debug-only) para manter posição, yaw,
 * pitch e distância idênticos entre main e PR. Não substitui a caminhada touch
 * completa executada pelo workflow A5.
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { isRuntimeAssetUrl } = require('./a5-waystone-qa-utils.cjs');

const OUT = path.resolve(process.env.VISUAL_OUTPUT || 'work/a1-shelter-camera');
const BASE = (process.env.A1_BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const CANDIDATE = (process.env.A1_CANDIDATE_URL || 'http://127.0.0.1:4174').replace(/\/$/, '');
const POSE = Object.freeze({ x: 6.659, y: 1.32837, z: -78.854, yaw: -0.2629, pitch: 0.12, distance: 6 });
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const report = {
  status: 'incomplete',
  scenario: 'A/B do braço da câmera no abrigo da Mata',
  method: 'mesma posição/yaw/pitch/distância em main e PR; pose fixo somente via API debug; captura curta, sem caminhada ou teleporte de gameplay',
  platform: 'Chromium SwiftShader · 852×393 · viewport móvel simulado · não certifica Android físico',
  baseSha: process.env.A1_BASE_SHA || 'unknown',
  candidateSha: process.env.A1_CANDIDATE_SHA || process.env.GITHUB_SHA || 'unknown',
  pose: POSE,
  startedAt: new Date().toISOString(),
  baseline: null,
  candidate: null,
  errors: [],
  consoleErrors: [],
  httpErrors: []
};

function installThreeRoutes(context) {
  const threeRoot = path.resolve(path.dirname(require.resolve('three')), '..');
  return context.route(/^https:\/\/cdn\.jsdelivr\.net\/npm\/three@0\.160\.0\//, async route => {
    const pathname = new URL(route.request().url()).pathname;
    const relative = pathname.split('/three@0.160.0/')[1];
    const file = path.join(threeRoot, relative || '');
    if (relative && fs.existsSync(file)) await route.fulfill({ path: file, contentType: 'text/javascript' });
    else await route.continue();
  });
}

async function capture(label, url, browser) {
  const context = await browser.newContext({
    viewport: { width: 852, height: 393 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    recordVideo: { dir: OUT, size: { width: 852, height: 393 } }
  });
  await installThreeRoutes(context);
  const page = await context.newPage();
  const video = page.video();
  page.setDefaultTimeout(30000);
  page.on('pageerror', error => report.errors.push(label + ': ' + String(error.message || error).slice(0, 800)));
  page.on('console', message => {
    if (message.type() === 'error') report.consoleErrors.push(label + ': ' + message.text().slice(0, 800));
  });
  page.on('response', response => {
    if (response.status() >= 400 && isRuntimeAssetUrl(response.url())) {
      report.httpErrors.push(label + ': HTTP ' + response.status() + ' ' + response.url().slice(0, 240));
    }
  });
  page.on('requestfailed', request => {
    if (isRuntimeAssetUrl(request.url())) {
      report.httpErrors.push(label + ': FAILED ' + request.url().slice(0, 240) + ' ' + (request.failure()?.errorText || ''));
    }
  });

  let snapshot;
  try {
    await page.goto(url + '/mundo-3d-prototype.html?debug3d=1&a1shelter=1', {
      waitUntil: 'domcontentloaded',
      timeout: 120000
    });
    await page.waitForFunction(() => {
      const api = window.SevenSinsDebug3D;
      return !!api && typeof api.state === 'function' && typeof api.viewQA === 'function';
    }, null, { timeout: 120000 });
    await page.waitForTimeout(1200);
    await page.evaluate(() => {
      const api = window.SevenSinsDebug3D;
      api.realtime();
      api.act1(1, 1);
    });
    await page.waitForTimeout(350);
    await page.evaluate(pose => {
      const api = window.SevenSinsDebug3D;
      api.teleport(pose.x, pose.z, pose.yaw, pose.y);
      api.viewQA(false, pose.yaw, pose.pitch);
    }, POSE);
    await page.waitForTimeout(2600);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));

    snapshot = await page.evaluate(() => {
      const api = window.SevenSinsDebug3D;
      const state = api.state();
      const rite = api.riteState();
      const camera = api.cam();
      const yaw = rite.camera.yaw;
      const focus = {
        x: state.x + Math.cos(yaw) * 0.42,
        y: state.y + 1.15,
        z: state.z - Math.sin(yaw) * 0.42
      };
      const arm = Math.hypot(camera[0] - focus.x, camera[1] - focus.y, camera[2] - focus.z);
      const diagnostics = typeof api.shelterCameraState === 'function' ? api.shelterCameraState() : null;
      return {
        player: { x: state.x, y: state.y, z: state.z },
        camera: { yaw: rite.camera.yaw, pitch: rite.camera.pitch, requestedDistance: rite.camera.distance, position: camera },
        focus,
        actualArm: diagnostics?.actualDistance ?? arm,
        diagnostics,
        calls: state.calls,
        triangles: state.triangles,
        objective: state.objective
      };
    });
    await page.screenshot({ path: path.join(OUT, label + '.png'), timeout: 120000 });
    await page.waitForTimeout(1200);
  } finally {
    await page.close().catch(() => {});
    await context.close().catch(() => {});
    if (video) {
      try {
        const videoPath = await video.path();
        if (fs.existsSync(videoPath)) fs.copyFileSync(videoPath, path.join(OUT, label + '.webm'));
      } catch (error) {
        report.errors.push(label + ' video: ' + String(error.message || error).slice(0, 500));
      }
    }
  }
  return snapshot;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist']
  });
  try {
    report.baseline = await capture('baseline-main', BASE, browser);
    report.candidate = await capture('candidate-pr', CANDIDATE, browser);

    const a = report.baseline, b = report.candidate;
    assert.ok(a && b, 'capturas A/B incompletas');
    for (const key of ['x', 'y', 'z']) {
      assert.ok(Math.abs(a.player[key] - b.player[key]) < 0.02, 'posição A/B divergiu em ' + key);
    }
    assert.ok(Math.abs(a.camera.yaw - b.camera.yaw) < 0.002, 'yaw A/B divergiu');
    assert.ok(Math.abs(a.camera.pitch - b.camera.pitch) < 0.002, 'pitch A/B divergiu');
    assert.ok(Math.abs(a.camera.requestedDistance - b.camera.requestedDistance) < 0.02, 'distância solicitada A/B divergiu');
    assert.ok(a.actualArm < 4.2, 'baseline não reproduziu compressão do braço: ' + a.actualArm.toFixed(2) + ' m');
    assert.ok(b.diagnostics?.active, 'diagnóstico do abrigo não foi ativado na PR');
    assert.equal(b.diagnostics.triggerBlocker, 'abrigo-pilar', 'o raio direto não identificou o pilar que dispara o desvio');
    assert.ok(Math.abs(b.diagnostics.shoulderYawOffset) >= 0.02, 'nenhum desvio lateral foi aplicado');
    assert.ok(b.actualArm >= Math.max(4.0, a.actualArm + 1.2),
      'braço não recuperou distância suficiente: baseline=' + a.actualArm.toFixed(2) + ' m, PR=' + b.actualArm.toFixed(2) + ' m');
    assert.ok(b.diagnostics.finalLimit >= 0.65, 'colisão posterior ainda comprime o braço: limit=' + b.diagnostics.finalLimit);
    assert.ok(b.diagnostics.chosenClearance >= b.diagnostics.minClearance,
      'o candidato selecionado não atingiu a folga mínima');
    const criticalConsole = report.consoleErrors.filter(error => !/KHR_parallel|PropertyBinding/i.test(error));
    assert.equal(report.errors.length, 0, 'erros JavaScript: ' + report.errors.join(' | '));
    assert.equal(report.httpErrors.length, 0, 'falhas de assets: ' + report.httpErrors.join(' | '));
    assert.equal(criticalConsole.length, 0, 'erros de console: ' + criticalConsole.join(' | '));
    report.status = 'passed';
  } catch (error) {
    report.status = 'failed';
    report.errors.push(String(error.stack || error).slice(0, 5000));
    throw error;
  } finally {
    report.finishedAt = new Date().toISOString();
    report.filteredConsoleErrors = report.consoleErrors.filter(error => !/KHR_parallel|PropertyBinding/i.test(error));
    fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
    await browser.close();
  }
}

main().catch(error => {
  process.stderr.write(String(error.stack || error) + '\n');
  process.exitCode = 1;
});
