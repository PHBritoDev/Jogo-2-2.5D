'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {walkYaw,SCENES} = require('./scene-capture-core.cjs');
const scenes = ['floresta-percurso', 'vila-praca', 'vila-vendedores'];

function request(env) {
  if (!/^A[1-5]$/.test(env.AGENT) || !scenes.includes(env.SCENARIO) ||
      !['true','false'].includes(env.VIDEO)) throw Error('Pedido de captura inválido');
  return [{scene: env.SCENARIO, video: env.VIDEO === 'true'}];
}

function measureWalkTrace(trace,start,end) {
  const fail = reason => ({valid:false,reason,samples:Array.isArray(trace)?trace.length:0,pathDistance:0,maxStep:0,maxSpeed:0,verticalTravel:0,maxVerticalStep:0,maxVerticalSpeed:0,groundedSamples:0,airborneSamples:0,finalGrounded:false,surfaceTransitions:0,surfaceKinds:[],surfaceMinY:null,surfaceMaxY:null,maxSurfaceStep:0,cameraSamples:0,offScreenSamples:0,blockedSamples:0});
  const finitePoint = p => p && Number.isFinite(p.x) && Number.isFinite(p.z);
  const finiteWorldPoint = p => finitePoint(p) && Number.isFinite(p.y);
  if (!Array.isArray(trace) || trace.length < 3) return fail("trace insuficiente");
  if (!finiteWorldPoint(start) || !finiteWorldPoint(end)) return fail("origem/fim 3D inválidos");
  if (trace.some(p => !p || !Number.isFinite(p.t) || !finitePoint(p) || !Number.isFinite(p.y) ||
      typeof p.grounded !== "boolean" || !Number.isFinite(p.terrainY) ||
      (p.grounded && p.surface != null &&
        (typeof p.surface !== "string" || !p.surface || !Number.isFinite(p.surfaceY))) ||
      !p.camera || typeof p.camera.onScreen !== "boolean")) {
    return fail("amostra sem posição 3D, apoio no solo ou telemetria de câmera");
  }
  if (trace[0].t < 0 || trace[0].t > 100 || Math.hypot(trace[0].x-start.x,trace[0].z-start.z) > .35 ||
      Math.abs(trace[0].y-start.y) > .35) return fail("trace não começa na posição 3D medida e no início da caminhada");
  const last = trace[trace.length-1];
  if (Math.hypot(last.x-end.x,last.z-end.z) > .5 || Math.abs(last.y-end.y) > .35) return fail("trace não termina na posição 3D medida");
  let pathDistance = 0, maxStep = 0, maxSpeed = 0, verticalTravel = 0, maxVerticalStep = 0, maxVerticalSpeed = 0;
  let groundedSamples = 0, airborneSamples = 0, surfaceTransitions = 0, maxSurfaceStep = 0;
  let surfaceMinY = Infinity, surfaceMaxY = -Infinity, previousSurface = null, previousSurfaceY = null;
  const surfaceKinds = [];
  let offScreenSamples = 0, blockedSamples = 0;
  for (let i = 1; i < trace.length; i++) {
    const a = trace[i-1], b = trace[i], dt = (b.t-a.t)/1000;
    if (!(dt > 0)) return fail("tempos do trace não são estritamente crescentes");
    if (dt > 2.5) return fail("lacuna de amostragem de "+dt.toFixed(2)+" s; continuidade não comprovada");
    const step = Math.hypot(b.x-a.x,b.z-a.z), speed = step/dt;
    const verticalStep = Math.abs(b.y-a.y), verticalSpeed = verticalStep/dt;
    // O preset usa KeyW sem sprint: 5 m/s cobre a caminhada antiga (4,3 m/s) com margem,
    // mas não aceita saltos curtos mascarados pela tolerância fixa por amostra.
    if (speed > 5) return fail("velocidade incompatível com caminhada: "+speed.toFixed(2)+" m/s");
    pathDistance += step; maxStep = Math.max(maxStep,step); maxSpeed = Math.max(maxSpeed,speed);
    verticalTravel += verticalStep; maxVerticalStep = Math.max(maxVerticalStep,verticalStep); maxVerticalSpeed = Math.max(maxVerticalSpeed,verticalSpeed);
  }
  for (const p of trace) {
    if (p.grounded) {
      groundedSamples++;
      // walkState() retorna surface=null no terreno comum; terrainY é a altura real de terrainHeightAt().
      const surface = p.surface == null ? 'terrain' : p.surface;
      const supportY = p.surface == null ? p.terrainY : p.surfaceY;
      if (previousSurface !== null && surface !== previousSurface) surfaceTransitions++;
      if (!surfaceKinds.includes(surface)) surfaceKinds.push(surface);
      surfaceMinY = Math.min(surfaceMinY,supportY); surfaceMaxY = Math.max(surfaceMaxY,supportY);
      if (Number.isFinite(previousSurfaceY)) maxSurfaceStep = Math.max(maxSurfaceStep,Math.abs(supportY-previousSurfaceY));
      previousSurface = surface; previousSurfaceY = supportY;
    } else {
      airborneSamples++; previousSurface = null; previousSurfaceY = null;
    }
    if (!p.camera.onScreen) offScreenSamples++;
    if (p.camera.blocked) blockedSamples++;
  }
  if (!last.grounded) return fail("segmento termina sem apoio no chão");
  return {valid:true,reason:null,samples:trace.length,pathDistance:+pathDistance.toFixed(3),maxStep:+maxStep.toFixed(3),
    maxSpeed:+maxSpeed.toFixed(3),verticalTravel:+verticalTravel.toFixed(3),maxVerticalStep:+maxVerticalStep.toFixed(3),
    maxVerticalSpeed:+maxVerticalSpeed.toFixed(3),groundedSamples,airborneSamples,finalGrounded:last.grounded,
    surfaceTransitions,surfaceKinds,surfaceMinY:+surfaceMinY.toFixed(3),surfaceMaxY:+surfaceMaxY.toFixed(3),
    maxSurfaceStep:+maxSurfaceStep.toFixed(3),cameraSamples:trace.length,offScreenSamples,blockedSamples};
}

function validContinuousRoute(route) {
  const segments = route?.segments;
  const walkConfig = SCENES['floresta-percurso']?.walk;
  const configured = walkConfig?.segments;
  if (!Array.isArray(configured) || configured.length < 2 || configured.length > 8) return false;
  const requiredQuality = walkConfig.captureQuality;
  if (requiredQuality && (!route.captureQuality || route.captureQuality.requested !== requiredQuality ||
      route.captureQuality.applied !== true || route.captureQuality.selected !== requiredQuality)) return false;
  const expected = configured.map(s => ({
    name:s.name, target:s.target, minTravel:s.minTravel, tolerance:s.tolerance, timeoutMs:s.timeoutMs
  }));
  const origin = {x:-14,z:-82};
  const finitePoint = p => p && Number.isFinite(p.x) && Number.isFinite(p.z);
  const finiteWorldPoint = p => finitePoint(p) && Number.isFinite(p.y);
  if (route?.scene !== 'floresta-percurso' || route.completed !== true ||
      !Array.isArray(segments) || segments.length !== expected.length) return false;
  if (!finiteWorldPoint(segments[0]?.start) || Math.hypot(segments[0].start.x-origin.x,segments[0].start.z-origin.z)>1.5) return false;
  let total = 0, totalPath = 0, cameraSamples = 0, offScreenSamples = 0, blockedSamples = 0;
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i], rule = expected[i];
    if (!s || s.name !== rule.name || s.reached !== true ||
        !finiteWorldPoint(s.start) || !finiteWorldPoint(s.end) ||
        !Array.isArray(s.target) || s.target.length !== 2 || !s.target.every(Number.isFinite) ||
        !Number.isFinite(s.distance) || s.distance <= 0 ||
        !Number.isFinite(s.remaining) || !Number.isFinite(s.elapsedMs) || s.elapsedMs <= 0 ||
        !Number.isFinite(s.cameraSettleMs) || s.cameraSettleMs < 0 || s.cameraSettleMs > 9000 ||
        !Number.isFinite(s.yaw) || s.key !== 'KeyW' || !Number.isFinite(s.timeoutMs) || s.timeoutMs !== rule.timeoutMs || s.elapsedMs > rule.timeoutMs ||
        Math.hypot(s.target[0]-rule.target[0],s.target[1]-rule.target[1]) > .05 ||
        !Number.isFinite(s.minTravel) || Math.abs(s.minTravel-rule.minTravel) > .01 ||
        !Number.isFinite(s.tolerance) || Math.abs(s.tolerance-rule.tolerance) > .01) return false;
    const expectedYaw = walkYaw(s.start,rule.target);
    const yawError = Math.atan2(Math.sin(s.yaw-expectedYaw),Math.cos(s.yaw-expectedYaw));
    if (Math.abs(yawError) > .03) return false;
    const measured = Math.hypot(s.end.x - s.start.x, s.end.z - s.start.z);
    const remaining = Math.hypot(s.end.x - s.target[0], s.end.z - s.target[1]);
    const traceMetrics = measureWalkTrace(s.trace,s.start,s.end), stored = s.traceMetrics;
    // A caminhada só aprova com o herói no quadro; tolera no máximo uma obstrução transitória por segmento.
    if (traceMetrics.offScreenSamples !== 0 || traceMetrics.blockedSamples > 1) return false;
    if (!traceMetrics.valid || s.trace[s.trace.length-1].t > rule.timeoutMs+1500 || !stored || stored.valid !== true ||
        stored.samples !== traceMetrics.samples || !Number.isFinite(stored.pathDistance) ||
        Math.abs(stored.pathDistance-traceMetrics.pathDistance) > .05 ||
        !Number.isFinite(stored.maxStep) || Math.abs(stored.maxStep-traceMetrics.maxStep) > .05 ||
        !Number.isFinite(stored.maxSpeed) || Math.abs(stored.maxSpeed-traceMetrics.maxSpeed) > .05 ||
        !Number.isFinite(stored.verticalTravel) || Math.abs(stored.verticalTravel-traceMetrics.verticalTravel) > .05 ||
        !Number.isFinite(stored.maxVerticalStep) || Math.abs(stored.maxVerticalStep-traceMetrics.maxVerticalStep) > .05 ||
        !Number.isFinite(stored.maxVerticalSpeed) || Math.abs(stored.maxVerticalSpeed-traceMetrics.maxVerticalSpeed) > .05 ||
        stored.groundedSamples !== traceMetrics.groundedSamples || stored.airborneSamples !== traceMetrics.airborneSamples ||
        stored.finalGrounded !== true || traceMetrics.finalGrounded !== true ||
        stored.surfaceTransitions !== traceMetrics.surfaceTransitions ||
        JSON.stringify(stored.surfaceKinds) !== JSON.stringify(traceMetrics.surfaceKinds) ||
        !Number.isFinite(stored.surfaceMinY) || Math.abs(stored.surfaceMinY-traceMetrics.surfaceMinY) > .05 ||
        !Number.isFinite(stored.surfaceMaxY) || Math.abs(stored.surfaceMaxY-traceMetrics.surfaceMaxY) > .05 ||
        !Number.isFinite(stored.maxSurfaceStep) || Math.abs(stored.maxSurfaceStep-traceMetrics.maxSurfaceStep) > .05 ||
        Math.abs(s.trace[s.trace.length-1].t-(s.elapsedMs+800)) > 1500 ||
        stored.cameraSamples !== traceMetrics.cameraSamples ||
        stored.offScreenSamples !== traceMetrics.offScreenSamples ||
        stored.blockedSamples !== traceMetrics.blockedSamples) return false;
    if (Math.abs(measured - s.distance) > .5 ||
        Math.abs(remaining - s.remaining) > .5 ||
        s.distance + .01 < rule.minTravel ||
        s.remaining > s.tolerance + .25) return false;
    if (i > 0) {
      const previous = segments[i - 1];
      const gap = Math.hypot(s.start.x - previous.end.x, s.start.y - previous.end.y, s.start.z - previous.end.z);
      if (gap > 1) return false;
    }
    total += s.distance; totalPath += traceMetrics.pathDistance;
    cameraSamples += traceMetrics.cameraSamples;
    offScreenSamples += traceMetrics.offScreenSamples;
    blockedSamples += traceMetrics.blockedSamples;
  }
  const camera = route.cameraTelemetry;
  return Number.isFinite(route.totalDistance) && route.totalDistance >= 60 &&
    Math.abs(total - route.totalDistance) <= .5 &&
    Number.isFinite(route.totalPathDistance) && Math.abs(totalPath-route.totalPathDistance) <= .05 &&
    camera && camera.samples === cameraSamples &&
    camera.offScreenSamples === offScreenSamples && camera.blockedSamples === blockedSamples;
}
function classify(env, report, head, valid) {
  if (env.SETUP !== 'success') return 'environment_error';
  if (!report) return 'environment_error';
  if (head !== env.GITHUB_SHA || !/^[a-f0-9]{40}$/.test(head) || report.commit !== head) return 'environment_error';
  if (report.fatal || report.shots?.some(s => /WebGL.*(unavailable|unsupported|indisponível)|browser.*(closed|executable)/i.test(s.reason))) return 'environment_error';
  if (env.EXPECTED_BUILD && report.build !== env.EXPECTED_BUILD) return 'environment_error';
  const routes = env.SCENARIO === 'floresta-percurso' && Array.isArray(report.routes)
    ? report.routes.filter(r => r?.scene === env.SCENARIO) : [];
  const routeValid = env.SCENARIO !== 'floresta-percurso' ||
    (routes.length === 1 && validContinuousRoute(routes[0]));
  if (!report.build || !report.shots?.length || env.CAPTURE !== 'success' || !routeValid ||
      report.shots.some(s => s.scene !== env.SCENARIO || s.status === 'falha' || !valid(s.file)) ||
      (env.VIDEO === 'true' && !report.videos?.some(v => v.scene === env.SCENARIO && v.bytes > 2048 && valid(v.file)))) return 'game_failed';
  return 'game_ran';
}

// Decisão para a próxima rodada; nunca dispara nova execução por conta própria.
function checkpoint({sha, runSha, http, runStatus, artifact, reviewed = false}) {
  if (!/^[a-f0-9]{40}$/.test(sha) || sha !== runSha) return 'QA_SOLICITADO';
  if (http === 403 || http === 429) return 'BLOQUEADO';
  if (runStatus !== 'completed') return 'QA_EXECUTANDO';
  if (!artifact || artifact.expired) return 'ANALISE_VISUAL_PENDENTE';
  return reviewed ? 'EVIDENCIA_PRONTA' : 'ANALISE_VISUAL_PENDENTE';
}

function finish(env) {
  const root = path.resolve(env.VISUAL_OUTPUT), source = path.join(root,'scene-agent'), out = path.join(root,'agent-qa');
  fs.mkdirSync(out,{recursive:true});
  let report, readError, head;
  try { report = JSON.parse(fs.readFileSync(path.join(source,'report.json'),'utf8')); }
  catch (e) { readError = e.code || e.name; }
  try { head = execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(); } catch {}
  function valid(file) {
    if (typeof file !== 'string' || !file || path.isAbsolute(file)) return false;
    try {
      const real = fs.realpathSync(path.resolve(source,file));
      return real.startsWith(source+path.sep) && fs.statSync(real).isFile() && fs.statSync(real).size > 0;
    } catch { return false; }
  }
  const status = classify(env,report,head,valid);
  const shots = report?.shots || [], videos = report?.videos || [];
  const manifest = {
    schema_version: 1, agent: env.AGENT, pr: Number(env.PR), branch: env.GITHUB_REF_NAME,
    tested_sha: head || null, requested_sha: env.GITHUB_SHA, scenario: env.SCENARIO, run_id: env.GITHUB_RUN_ID,
    run_url: env.GITHUB_SERVER_URL+'/'+env.GITHUB_REPOSITORY+'/actions/runs/'+env.GITHUB_RUN_ID,
    artifact_id: null, artifact_name: env.ARTIFACT_NAME, artifact_url: null,
    started: report?.startedAt || null, ended: report?.finishedAt || new Date().toISOString(),
    renderer: report?.renderer || null, status,
    screenshots: shots.filter(s => valid(s.file)).map(s => ({file:'scene-agent/'+s.file, angle:s.name, time:s.capturedAt, status:s.status})),
    video: videos.filter(v => valid(v.file)).map(v => ({file:'scene-agent/'+v.file, seconds:v.durationS, bytes:v.bytes})),
    trace: null, routes: report?.routes || [], console_errors: [...(report?.pageErrors || []), ...(report?.consoleErrors || [])],
    failed_requests: report?.failedRequests || [], telemetry:{build:report?.build, timings:report?.timings, report:report?'scene-agent/report.json':null},
    regressions: shots.filter(s => s.status !== 'ok').map(s => ({angle:s.name, reason:s.reason})),
    limitations: ['SwiftShader em CPU. Revisão visual pendente. O recibo de upload contém ID e URL.'],
    manual_visual_review_required:true, diagnostic:report?.fatal || readError || null
  };
  fs.writeFileSync(path.join(out,'manifest.json'), JSON.stringify(manifest,null,2)+'\n');
  const routeLines = manifest.routes.flatMap(r => {
    const c = r.cameraTelemetry || {};
    return [
      'Percurso '+r.scene+': '+Number(r.totalDistance || 0).toFixed(1)+' m líquidos / '+Number(r.totalPathDistance || 0).toFixed(1)+' m amostrados',
      'Vertical: '+(r.segments || []).reduce((sum,s)=>sum+Number(s.traceMetrics?.verticalTravel || 0),0).toFixed(2)+' m acumulados; pico '+Math.max(0,...(r.segments || []).map(s=>Number(s.traceMetrics?.maxVerticalSpeed || 0))).toFixed(2)+' m/s',
      'Solo: '+(r.segments || []).reduce((sum,s)=>sum+Number(s.traceMetrics?.groundedSamples || 0),0)+' amostras apoiadas; '+(r.segments || []).reduce((sum,s)=>sum+Number(s.traceMetrics?.airborneSamples || 0),0)+' no ar; superfícies '+[...new Set((r.segments || []).flatMap(s=>s.traceMetrics?.surfaceKinds || []))].join(', '),
      'Câmera: '+(c.samples || 0)+' amostras; '+(c.blockedSamples || 0)+' bloqueadas; '+(c.offScreenSamples || 0)+' fora do quadro',
      ...(r.segments || []).map(s => '  '+s.name+': '+Number(s.traceMetrics?.pathDistance || 0).toFixed(1)+' m amostrados, '+(s.traceMetrics?.samples || 0)+' pontos; variação vertical '+Number(s.traceMetrics?.verticalTravel || 0).toFixed(2)+' m; grounded '+(s.traceMetrics?.groundedSamples || 0)+'/'+(s.traceMetrics?.samples || 0))
    ];
  });
  const index = ['# QA '+env.AGENT, '', status+' • '+(head || 'SHA indisponível'),'',manifest.run_url,'',
    ...routeLines, ...manifest.screenshots.map(s => '['+s.angle+'](../'+s.file+')'), ...manifest.video.map(v => '[Vídeo](../'+v.file+')'),
    '',...manifest.limitations].join('\n\n');
  fs.writeFileSync(path.join(out,'index.md'),index);
  if (env.GITHUB_STEP_SUMMARY) fs.appendFileSync(env.GITHUB_STEP_SUMMARY,index+'\n');
  return status === 'game_ran' ? 0 : 1;
}
if (require.main === module) {
  if (process.argv[2] === 'request') console.log(JSON.stringify(request(process.env)));
  else if (process.argv[2] === 'checkpoint') console.log(checkpoint(JSON.parse(fs.readFileSync(0,'utf8'))));
  else process.exitCode = finish(process.env);
}
module.exports = {request,classify,checkpoint,validContinuousRoute,measureWalkTrace};
