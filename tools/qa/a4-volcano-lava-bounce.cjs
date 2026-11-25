const fs = require('node:fs');
const path = require('node:path');
const { spawn, execFileSync } = require('node:child_process');
const { chromium } = require('playwright');
const { PNG } = require('pngjs');

const baseDir = process.env.BASE_DIR;
const candidateDir = process.env.CANDIDATE_DIR;
const outputDir = process.env.OUTPUT_DIR || path.join(candidateDir, 'artifacts', 'a4-volcano-lava-bounce');
if (!baseDir || !candidateDir) throw new Error('BASE_DIR e CANDIDATE_DIR são obrigatórios.');
fs.mkdirSync(outputDir, { recursive: true });
const videoDir = path.join(outputDir, 'video');
fs.mkdirSync(videoDir, { recursive: true });

const harness = path.join(candidateDir, 'tools', 'qa', 'a4-volcano-lava-bounce.html');
const baselineHarness = path.join(baseDir, 'tools', 'qa', 'a4-volcano-lava-bounce.html');
fs.mkdirSync(path.dirname(baselineHarness), { recursive: true });
fs.copyFileSync(harness, baselineHarness);

function startServer(directory, port) {
  const child = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1', '--directory', directory], { stdio: 'ignore' });
  child.on('error', error => { throw error; });
  return child;
}
async function waitForServer(url) {
  for (let i = 0; i < 80; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 125));
  }
  throw new Error('Servidor local não iniciou: ' + url);
}
function imageDiff(aPath, bPath) {
  const a = PNG.sync.read(fs.readFileSync(aPath));
  const b = PNG.sync.read(fs.readFileSync(bPath));
  if (a.width !== b.width || a.height !== b.height) throw new Error('Resoluções A/B diferentes.');
  const values = new Float32Array(a.width * a.height);
  let sum = 0, max = 0, changed = 0;
  for (let p = 0, i = 0; p < a.data.length; p += 4, i++) {
    const d = (Math.abs(a.data[p] - b.data[p]) + Math.abs(a.data[p + 1] - b.data[p + 1]) + Math.abs(a.data[p + 2] - b.data[p + 2])) / 3;
    values[i] = d;
    sum += d;
    if (d > 1) changed++;
    if (d > max) max = d;
  }
  values.sort();
  return {
    meanRGB: Number((sum / values.length).toFixed(5)),
    p95RGB: Number(values[Math.floor(values.length * .95)].toFixed(3)),
    maxRGB: Number(max.toFixed(3)),
    changedPixelsPct: Number((changed / values.length * 100).toFixed(3))
  };
}
async function runVersion(browser, label, port, threeRoot) {
  const context = await browser.newContext({
    viewport: { width: 960, height: 540 },
    recordVideo: { dir: videoDir, size: { width: 960, height: 540 } }
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('requestfailed', request => {
    const failure = request.failure();
    if (failure && failure.errorText && !failure.errorText.includes('ERR_ABORTED')) errors.push(request.url() + ' — ' + failure.errorText);
  });
  const prefix = 'https://cdn.jsdelivr.net/npm/three@0.160.0/';
  await page.route(prefix + '**', route => {
    const url = new URL(route.request().url());
    const relative = url.pathname.split('/three@0.160.0/')[1];
    const file = path.join(threeRoot, relative || '');
    if (!relative || !fs.existsSync(file)) {
      errors.push('Three.js local asset ausente: ' + relative);
      return route.abort();
    }
    return route.fulfill({ path: file, contentType: relative.endsWith('.js') ? 'text/javascript' : 'application/octet-stream' });
  });
  const video = page.video();
  try {
    await page.goto('http://127.0.0.1:' + port + '/tools/qa/a4-volcano-lava-bounce.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.a4VolcanoReady === true || !!window.a4VolcanoError, null, { timeout: 60000 });
    const harnessError = await page.evaluate(() => window.a4VolcanoError);
    if (harnessError) throw new Error(label + ' harness: ' + harnessError);
    const captured = await page.evaluate(() => window.a4VolcanoCaptureFrames());
    const metrics = [];
    for (const frame of captured.frames) {
      const file = path.join(outputDir, label + '-' + frame.key + '-' + frame.now + '.png');
      fs.writeFileSync(file, Buffer.from(frame.data.split(',')[1], 'base64'));
      metrics.push({ key: frame.key, now: frame.now, file, metrics: frame.metrics });
    }
    await page.evaluate(() => window.a4VolcanoAnimate(2400));
    return { label, report: captured.report, frames: metrics, errors };
  } finally {
    await context.close();
    if (video) await video.saveAs(path.join(outputDir, label + '.webm'));
  }
}
async function main() {
  const baseSha = process.env.BASE_SHA && process.env.BASE_SHA !== 'main' ? process.env.BASE_SHA : execFileSync('git', ['-C', baseDir, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const candidateSha = process.env.CANDIDATE_SHA || execFileSync('git', ['-C', candidateDir, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const baseServer = startServer(baseDir, 4263);
  const candidateServer = startServer(candidateDir, 4264);
  let browser;
  try {
    await Promise.all([
      waitForServer('http://127.0.0.1:4263/tools/qa/a4-volcano-lava-bounce.html'),
      waitForServer('http://127.0.0.1:4264/tools/qa/a4-volcano-lava-bounce.html')
    ]);
    const threeRoot = path.resolve(path.dirname(require.resolve('three')), '..');
    browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    const baseline = await runVersion(browser, 'baseline', 4263, threeRoot);
    const candidate = await runVersion(browser, 'candidate', 4264, threeRoot);
    const comparisons = {};
    const budget = {};
    for (const key of ['overlook-1000', 'overlook-1500', 'upper-gallery-2000', 'grove-2500', 'spine-3000']) {
      const a = baseline.frames.find(frame => frame.key + '-' + frame.now === key);
      const b = candidate.frames.find(frame => frame.key + '-' + frame.now === key);
      if (!a || !b) throw new Error('Captura A/B ausente: ' + key);
      comparisons[key] = imageDiff(a.file, b.file);
      budget[key] = {
        callsEqual: a.metrics.calls === b.metrics.calls,
        trianglesEqual: a.metrics.triangles === b.metrics.triangles,
        geometriesEqual: a.metrics.geometries === b.metrics.geometries,
        texturesEqual: a.metrics.textures === b.metrics.textures,
        baseline: a.metrics,
        candidate: b.metrics
      };
      if (!budget[key].callsEqual || !budget[key].trianglesEqual || !budget[key].geometriesEqual || !budget[key].texturesEqual) {
        throw new Error('Orçamento de renderização mudou em ' + key + ': ' + JSON.stringify(budget[key]));
      }
    }
    const temporal = {
      baseline: imageDiff(
        baseline.frames.find(frame => frame.key === 'overlook' && frame.now === 1000).file,
        baseline.frames.find(frame => frame.key === 'overlook' && frame.now === 1500).file
      ),
      candidate: imageDiff(
        candidate.frames.find(frame => frame.key === 'overlook' && frame.now === 1000).file,
        candidate.frames.find(frame => frame.key === 'overlook' && frame.now === 1500).file
      )
    };
    const temporalGainRGB = Number((temporal.candidate.meanRGB - temporal.baseline.meanRGB).toFixed(5));
    if (comparisons['overlook-1000'].meanRGB < 1.5 || comparisons['overlook-1000'].changedPixelsPct < 15) {
      throw new Error('Bounce localizado ainda pouco legível no Santuário: ' + JSON.stringify(comparisons['overlook-1000']));
    }
    if (comparisons['upper-gallery-2000'].meanRGB < 1.0 || comparisons['upper-gallery-2000'].changedPixelsPct < 8) {
      throw new Error('Bounce insuficiente na galeria superior: ' + JSON.stringify(comparisons['upper-gallery-2000']));
    }
    if (comparisons['grove-2500'].meanRGB > .05 || comparisons['grove-2500'].changedPixelsPct > .1 ||
        comparisons['spine-3000'].meanRGB > .05 || comparisons['spine-3000'].changedPixelsPct > .1) {
      throw new Error('Bounce escapou do Santuário: ' + JSON.stringify({ grove: comparisons['grove-2500'], spine: comparisons['spine-3000'] }));
    }
    if (temporalGainRGB < .03) {
      throw new Error('Pulsação dinâmica insuficiente frente ao baseline: ' + temporalGainRGB);
    }
    const report = {
      baseSha,
      candidateSha,
      renderer: 'Chromium WebGL / SwiftShader',
      viewport: '960x540',
      baseline: { report: baseline.report, errors: baseline.errors },
      candidate: { report: candidate.report, errors: candidate.errors },
      imageDelta: comparisons,
      temporalDelta: temporal,
      temporalGainRGB,
      renderBudget: budget
    };
    fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    if (baseline.errors.length || candidate.errors.length) throw new Error('Erros de browser/GLSL: ' + JSON.stringify({ baseline: baseline.errors, candidate: candidate.errors }));
  } finally {
    if (browser) await browser.close();
    baseServer.kill();
    candidateServer.kill();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
