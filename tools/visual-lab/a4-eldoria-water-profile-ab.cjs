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

const baseModules = Object.fromEntries(['mundo-3d-prototype.js', 'aurora-luz3d.js', 'eldoria-water.js', 'ceu-atmosfera3d.js'].map(file => [
  file, execFileSync('git', ['show', baseSha + ':' + file], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
]));
const profiles = ['low', 'medium', 'high', 'max'];
const scenes = [
  {
    name: 'lago-dia', hour: 13, x: -27, z: -96, yaw: Math.PI, pitch: .5, distance: 5,
    // Miolo da lâmina, afastado da margem e do jogador; validado por waterCoverage.
    waterRoi: { left: 320, top: 105, width: 140, height: 60 }
  },
  {
    name: 'lago-aurora', hour: 22, x: -27, z: -96, yaw: Math.PI, pitch: .08, distance: 10,
    // Lâmina + reflexo turquesa à esquerda do jogador; validado por waterCoverage.
    waterRoi: { left: 270, top: 250, width: 120, height: 18 }
  },
  {
    name: 'aurora-ceu', hour: 22, x: 0, z: -29,
    camera: { from: [0, 2, -29], to: [0, 22, -15] },
    // Faixa central do céu, sem copas laterais; overlays DOM são ocultados antes do PNG.
    skyRoi: { left: 220, top: 75, width: 450, height: 190 }
  }
];
const report = {
  status: 'incomplete', baseSha, candidateSha,
  renderer: 'Chromium/WebGL SwiftShader 852x480 — não Android físico',
  profiles, scenes, cases: [], comparisons: [], motion: {}, errors: [], warnings: [], baselineRouteHits: { world: 0, aurora: 0, water: 0, sky: 0 }
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
      await page.route(/\/(?:mundo-3d-prototype|aurora-luz3d|eldoria-water|ceu-atmosfera3d)\.js(?:\?.*)?$/, async route => {
        const name = path.basename(new URL(route.request().url()).pathname);
        if (name === 'mundo-3d-prototype.js') report.baselineRouteHits.world++;
        if (name === 'aurora-luz3d.js') report.baselineRouteHits.aurora++;
        if (name === 'eldoria-water.js') report.baselineRouteHits.water++;
        if (name === 'ceu-atmosfera3d.js') report.baselineRouteHits.sky++;
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
          if (s.camera) {
            if (typeof d.fly !== 'function') throw new Error('fly indisponível para a câmera fixa do céu');
            d.fly(s.camera.from, s.camera.to);
          } else d.view(s.yaw, s.pitch, s.distance);
          // A câmera livre não chama snapCam: esse helper reposiciona pela câmera de gameplay.
          window.__a4SnapCamera = s.camera ? null : (typeof d.snapCam === 'function' ? d.snapCam() : null);
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
        const diagnostic = await page.evaluate(async s => {
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
            cameraTarget: s.camera?.to || null,
            cameraTargetView: s.camera && typeof d.camView === 'function' ? d.camView(s.camera.to) : null,
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
        }, scene);
        if (scene.camera && (!diagnostic.cameraTargetView?.onScreen || diagnostic.cameraTargetView?.blocked))
          report.errors.push(side + '/' + profile + '/' + scene.name + ': alvo da câmera no céu fora do quadro ou obstruído=' + JSON.stringify(diagnostic.cameraTargetView));
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
        const canvasInfo = await page.evaluate(() => {
          const canvas = document.getElementById('scene');
          if (!(canvas instanceof HTMLCanvasElement)) throw new Error('canvas WebGL #scene não encontrado');
          const rect = canvas.getBoundingClientRect();
          return {
            width: canvas.width, height: canvas.height, cssWidth: rect.width, cssHeight: rect.height,
            backingScaleX: +(canvas.width / Math.max(1, rect.width)).toFixed(3),
            backingScaleY: +(canvas.height / Math.max(1, rect.height)).toFixed(3)
          };
        });
        if (canvasInfo.cssWidth < 800 || canvasInfo.cssHeight < 400)
          report.errors.push(side + '/' + profile + '/' + scene.name + ': canvas #scene fora do viewport esperado=' + JSON.stringify(canvasInfo));
        if (!(canvasInfo.width > 0) || !(canvasInfo.height > 0)
          || !(canvasInfo.backingScaleX > 0) || !(canvasInfo.backingScaleY > 0))
          report.errors.push(side + '/' + profile + '/' + scene.name + ': backing WebGL ou escala inválida=' + JSON.stringify(canvasInfo));
        diagnostic.canvas = canvasInfo;
        // locator.screenshot recorta a caixa do canvas e também inclui irmãos DOM sobrepostos.
        // Esconda todos os filhos diretos do body, exceto o canvas WebGL, para não medir HUD/toast.
        const captureInfo = await page.evaluate(() => {
          const canvas = document.getElementById('scene');
          if (!(canvas instanceof HTMLCanvasElement)) throw new Error('canvas WebGL #scene não encontrado na captura');
          const siblings = Array.from(document.body.children).filter(node => node !== canvas);
          for (const node of siblings) node.style.setProperty('visibility', 'hidden', 'important');
          return {
            canvasTag: canvas.tagName.toLowerCase(),
            canvasVisible: getComputedStyle(canvas).visibility === 'visible',
            hiddenBodySiblings: siblings.length,
            visibleBodySiblings: siblings.filter(node => getComputedStyle(node).visibility !== 'hidden').length
          };
        });
        diagnostic.capture = captureInfo;
        if (captureInfo.canvasTag !== 'canvas' || !captureInfo.canvasVisible || captureInfo.visibleBodySiblings !== 0)
          report.errors.push(side + '/' + profile + '/' + scene.name + ': screenshot não isolou o canvas=' + JSON.stringify(captureInfo));
        const file = side + '/' + profile + '-' + scene.name + '.png';
        await page.locator('#scene').screenshot({ path: path.join(out, file), timeout: 90000, animations: 'disabled', scale: 'css' });
        report.cases.push({ side, profile, scene: scene.name, hour: scene.hour, image: file, ...diagnostic });
        if (diagnostic.profile !== profile) report.errors.push(side + '/' + profile + ': seletor não confirmou perfil');
        const expectedLow = profile === 'low' ? 1 : 0;
        if (diagnostic.lowUniform !== expectedLow)
          report.errors.push(side + '/' + profile + '/' + scene.name + ': uAurLow=' + diagnostic.lowUniform + ', esperado ' + expectedLow);
      }
    } finally {
      await context.close();
    }
  }
}


async function captureAuroraMotion(browser, side, baseline) {
  const motionDir = path.join(out, 'motion');
  fs.mkdirSync(motionDir, { recursive: true });
  const context = await browser.newContext({
    viewport: { width: 852, height: 480 }, deviceScaleFactor: 1,
    isMobile: true, hasTouch: true, acceptDownloads: true
  });
  await context.addInitScript(({ selectedProfile }) => {
    let seed = 0xA4E1D0;
    Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    localStorage.setItem('seven-sins-3d-graphics', selectedProfile);
  }, { selectedProfile: 'low' });
  const page = await context.newPage();
  page.on('pageerror', e => report.errors.push(side + ' motion pageerror: ' + String(e.message || e).slice(0, 400)));
  page.on('console', msg => { if (msg.type() === 'error') report.errors.push(side + ' motion console: ' + msg.text().slice(0, 400)); });
  page.on('requestfailed', req => {
    const why = req.failure()?.errorText || '';
    if (!/ERR_ABORTED|cancelled/i.test(why)) report.errors.push(side + ' motion requestfailed: ' + why + ' ' + req.url().slice(0, 180));
  });
  page.on('response', r => {
    if (r.status() >= 400 && /\.(?:glb|js)(?:\?|$)/i.test(r.url()))
      report.errors.push(side + ' motion HTTP ' + r.status() + ' ' + r.url().slice(0, 220));
  });
  if (baseline) {
    await page.route(/\/(?:mundo-3d-prototype|aurora-luz3d|eldoria-water|ceu-atmosfera3d)\.js(?:\?.*)?$/, async route => {
      const name = path.basename(new URL(route.request().url()).pathname);
      if (name === 'mundo-3d-prototype.js') report.baselineRouteHits.world++;
      if (name === 'aurora-luz3d.js') report.baselineRouteHits.aurora++;
      if (name === 'eldoria-water.js') report.baselineRouteHits.water++;
      if (name === 'ceu-atmosfera3d.js') report.baselineRouteHits.sky++;
      await route.fulfill({ status: 200, contentType: 'text/javascript; charset=utf-8', body: baseModules[name] });
    });
  }
  let contextClosed = false;
  try {
    await page.goto(baseUrl + '/mundo-3d-prototype.html?debug3d=1&a4AuroraMotion=' + side, {
      waitUntil: 'domcontentloaded', timeout: 60000
    });
    await page.waitForFunction(() => window.SevenSinsDebug3D?.riteState?.().ready, null, { timeout: 240000 });
    await page.evaluate(() => window.SevenSinsDebug3D.freeRoam());
    await wait(1800);
    await page.evaluate(() => {
      const d = window.SevenSinsDebug3D;
      d.setHour(22);
      if (typeof d.weather === 'function') d.weather('limpo');
      d.teleport(0, -29);
      d.fly(null);
      d.fly([0, 2, -29], [0, 22, -15]);
      window.__a4MotionCameraPrevious = null;
      window.__a4MotionCameraStable = 0;
    });
    await page.waitForFunction(() => {
      const d = window.SevenSinsDebug3D, s = d?.state?.() || {}, u = window.__aurora327U || {};
      const view = d?.camView?.([0, 22, -15]);
      return Number.isFinite(s.x) && Number.isFinite(s.z) && Math.hypot(s.x, s.z + 29) < .25
        && Number.isFinite(s.night) && s.night >= .99
        && Number.isFinite(u.uAurK?.value) && u.uAurK.value >= .5
        && u.uAurLow?.value === 1 && view?.onScreen && !view?.blocked;
    }, null, { timeout: 30000, polling: 100 });
    await page.waitForFunction(() => {
      const camera = window.SevenSinsDebug3D?.cam?.();
      if (!Array.isArray(camera) || camera.length !== 3 || !camera.every(Number.isFinite)) return false;
      const previous = window.__a4MotionCameraPrevious;
      window.__a4MotionCameraPrevious = camera;
      const delta = previous ? Math.hypot(camera[0] - previous[0], camera[1] - previous[1], camera[2] - previous[2]) : Infinity;
      window.__a4MotionCameraStable = delta < .015 ? (window.__a4MotionCameraStable || 0) + 1 : 0;
      return window.__a4MotionCameraStable >= 4;
    }, null, { timeout: 20000, polling: 100 });
    const captureInfo = await page.evaluate(() => {
      const canvas = document.getElementById('scene');
      if (!(canvas instanceof HTMLCanvasElement)) throw new Error('canvas WebGL #scene ausente no vídeo temporal');
      const siblings = Array.from(document.body.children).filter(node => node !== canvas);
      for (const node of siblings) node.style.setProperty('visibility', 'hidden', 'important');
      return {
        canvasVisible: getComputedStyle(canvas).visibility === 'visible',
        visibleBodySiblings: siblings.filter(node => getComputedStyle(node).visibility !== 'hidden').length
      };
    });
    if (!captureInfo.canvasVisible || captureInfo.visibleBodySiblings !== 0)
      report.errors.push(side + ' motion: overlays DOM não foram isolados=' + JSON.stringify(captureInfo));

    const recordingStart = await page.evaluate(() => {
      const canvas = document.getElementById('scene');
      if (!(canvas instanceof HTMLCanvasElement) || typeof canvas.captureStream !== 'function')
        throw new Error('canvas#scene não suporta captureStream');
      const mimeType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
        .find(type => MediaRecorder.isTypeSupported(type));
      if (!mimeType) throw new Error('MediaRecorder WebM indisponível');
      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2400000 });
      const chunks = [];
      window.__a4MotionRecordError = null;
      recorder.addEventListener('dataavailable', event => {
        if (event.data?.size) chunks.push(event.data);
      });
      recorder.addEventListener('error', event => {
        window.__a4MotionRecordError = String(event.error?.message || event.message || event);
      });
      recorder.start(250);
      window.__a4MotionRecording = { stream, recorder, chunks, startedAt: performance.now(), mimeType };
      return { mimeType, width: canvas.width, height: canvas.height, fps: 30 };
    });

    const frames = [];
    for (let i = 0; i < 5; i++) {
      if (i > 0) await page.evaluate(async targetMs => {
        const startedAt = window.__a4MotionRecording?.startedAt;
        if (!Number.isFinite(startedAt)) throw new Error('relógio do vídeo temporal ausente');
        const remaining = targetMs - (performance.now() - startedAt);
        if (remaining > 0) await new Promise(resolve => setTimeout(resolve, remaining));
      }, i * 2000);
      const diagnostic = await page.evaluate(() => {
        const d = window.SevenSinsDebug3D, state = d?.state?.() || {}, u = window.__aurora327U || {};
        return {
          hour: state.dim?.hour ?? null, night: state.night ?? null,
          auroraK: u.uAurK?.value ?? null, lowUniform: u.uAurLow?.value ?? null,
          player: [state.x, state.y, state.z], camera: d?.cam?.() || null,
          targetView: d?.camView?.([0, 22, -15]) || null
        };
      });
      if (!Number.isFinite(diagnostic.hour) || !(diagnostic.hour >= 18 || diagnostic.hour < 6)
        || !Number.isFinite(diagnostic.night) || diagnostic.night < .99
        || !Number.isFinite(diagnostic.auroraK) || diagnostic.auroraK < .5
        || diagnostic.lowUniform !== 1)
        report.errors.push(side + ' motion frame ' + i + ': aurora saiu do estado noturno/baixo=' + JSON.stringify(diagnostic));
      if (!diagnostic.player.every(Number.isFinite) || Math.hypot(diagnostic.player[0], diagnostic.player[2] + 29) >= .25)
        report.errors.push(side + ' motion frame ' + i + ': jogador saiu da pose=' + JSON.stringify(diagnostic.player));
      if (!diagnostic.targetView?.onScreen || diagnostic.targetView?.blocked)
        report.errors.push(side + ' motion frame ' + i + ': alvo da câmera ficou obstruído=' + JSON.stringify(diagnostic.targetView));
      const tMs = await page.evaluate(() => Math.round(performance.now() - window.__a4MotionRecording.startedAt));
      const image = 'motion/' + side + '-low-aurora-' + String(i).padStart(2, '0') + '.png';
      await page.locator('#scene').screenshot({ path: path.join(out, image), timeout: 90000, animations: 'disabled', scale: 'css' });
      frames.push({ tMs, image, ...diagnostic });
    }

    const videoPath = path.join(motionDir, side + '-low-aurora-ceu.webm');
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
    const videoMeta = await page.evaluate(async () => {
      const state = window.__a4MotionRecording;
      if (!state?.recorder || state.recorder.state === 'inactive')
        throw new Error('MediaRecorder temporal não está ativo');
      const durationMs = Math.round(performance.now() - state.startedAt);
      const stopped = new Promise((resolve, reject) => {
        state.recorder.addEventListener('stop', resolve, { once: true });
        state.recorder.addEventListener('error', event => reject(new Error(String(event.error?.message || event.message || event))), { once: true });
      });
      state.recorder.stop();
      await stopped;
      state.stream.getTracks().forEach(track => track.stop());
      if (window.__a4MotionRecordError) throw new Error('MediaRecorder: ' + window.__a4MotionRecordError);
      const blob = new Blob(state.chunks, { type: state.recorder.mimeType || state.mimeType });
      if (blob.size < 50000) throw new Error('vídeo temporal vazio ou incompleto: ' + blob.size + ' bytes');
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = 'aurora-motion.webm';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      return { durationMs, bytes: blob.size, mimeType: blob.type, objectUrl };
    });
    const download = await downloadPromise;
    await download.saveAs(videoPath);
    await page.evaluate(url => URL.revokeObjectURL(url), videoMeta.objectUrl);
    await context.close();
    contextClosed = true;
    const frameDeltas = [];
    for (let i = 1; i < frames.length; i++) {
      frameDeltas.push({
        fromMs: frames[i - 1].tMs, toMs: frames[i].tMs,
        ...(await imageDiff(path.join(out, frames[i - 1].image), path.join(out, frames[i].image),
          { left: 220, top: 75, width: 450, height: 190 }))
      });
    }
    report.motion[side] = {
      profile: 'low', scene: 'aurora-ceu', sampleWindowMs: 8000,
      videoDurationMs: videoMeta.durationMs, videoBytes: videoMeta.bytes,
      videoMimeType: videoMeta.mimeType, videoSource: 'canvas.captureStream/MediaRecorder (canvas only; no boot or HUD)',
      recordingStart, video: path.relative(out, videoPath).replace(/\\/g, '/'),
      captureInfo, frames, frameDeltas
    };
    if (frameDeltas.every(delta => delta.changedChannelsOver4 < .001))
      report.warnings.push(side + ' motion: variação temporal abaixo de 0,1% dos canais do ROI do céu; inspecionar o WebM antes de concluir');
  } finally {
    if (!contextClosed) await context.close().catch(() => {});
  }
}

async function waterCoverage(file, region) {
  const { data, info } = await sharp(file).extract(region).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let water = 0, pixels = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    if (g > r * 1.2 && b > r * 1.3 && b > g * .9 && max - min > 18) water++;
    pixels++;
  }
  return pixels ? +(water / pixels).toFixed(4) : 0;
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
    await captureAuroraMotion(browser, 'baseline', true);
    await captureAuroraMotion(browser, 'candidate', false);
    if (!report.baselineRouteHits.world || !report.baselineRouteHits.aurora || !report.baselineRouteHits.water || !report.baselineRouteHits.sky)
      report.errors.push('Baseline inválido: não interceptou mundo + os dois módulos A4');
    for (const profile of profiles) for (const scene of scenes) {
      const a = report.cases.find(x => x.side === 'baseline' && x.profile === profile && x.scene === scene.name);
      const b = report.cases.find(x => x.side === 'candidate' && x.profile === profile && x.scene === scene.name);
      if (!a || !b) { report.errors.push('Captura ausente: ' + profile + '/' + scene.name); continue; }
      const cameraA = [...(a.camera || []), ...(a.cameraTarget || [])];
      const cameraB = [...(b.camera || []), ...(b.cameraTarget || [])];
      const cameraDelta = cameraA.length && cameraA.length === cameraB.length
        ? +Math.max(...cameraA.map((v, i) => Math.abs(v - cameraB[i]))).toFixed(4) : null;
      const playerDelta = a.player && b.player && a.player.length === b.player.length
        ? +Math.max(...a.player.map((v, i) => Math.abs(v - b.player[i]))).toFixed(4) : null;
      const hourDelta = Number.isFinite(a.hour) && Number.isFinite(b.hour) ? +Math.abs(a.hour - b.hour).toFixed(3) : null;
      const nightDelta = Number.isFinite(a.night) && Number.isFinite(b.night) ? +Math.abs(a.night - b.night).toFixed(3) : null;
      const auroraDelta = Number.isFinite(a.auroraK) && Number.isFinite(b.auroraK) ? +Math.abs(a.auroraK - b.auroraK).toFixed(3) : null;
      const lowUniformDelta = Number.isFinite(a.lowUniform) && Number.isFinite(b.lowUniform) ? +Math.abs(a.lowUniform - b.lowUniform).toFixed(3) : null;
      const lightingStateComparable = hourDelta !== null && hourDelta <= .05
        && nightDelta !== null && nightDelta <= .01 && auroraDelta !== null && auroraDelta <= .05
        && lowUniformDelta !== null && lowUniformDelta <= .01;
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
      let waterCoverageBaseline = null, waterCoverageCandidate = null;
      if (scene.waterRoi) {
        waterCoverageBaseline = await waterCoverage(baselineImage, scene.waterRoi);
        waterCoverageCandidate = await waterCoverage(candidateImage, scene.waterRoi);
        if (waterCoverageBaseline < .6 || waterCoverageCandidate < .6)
          report.errors.push(profile + '/' + scene.name + ': ROI não contém água suficiente (baseline=' + waterCoverageBaseline + ', candidate=' + waterCoverageCandidate + ')');
      }
      report.comparisons.push({
        profile, scene: scene.name, cameraDelta, playerDelta, hourDelta, nightDelta, auroraDelta, lowUniformDelta, lightingStateComparable, renderBudgetComparable,
        baselineCalls: a.calls, candidateCalls: b.calls,
        baselineTriangles: a.triangles, candidateTriangles: b.triangles,
        pixels: await imageDiff(baselineImage, candidateImage),
        waterPixels: scene.waterRoi ? await imageDiff(baselineImage, candidateImage, scene.waterRoi) : null,
        waterCoverage: scene.waterRoi ? { baseline: waterCoverageBaseline, candidate: waterCoverageCandidate } : null,
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
