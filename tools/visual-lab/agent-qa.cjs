'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const scenes = ['floresta-percurso', 'vila-praca', 'vila-vendedores'];

function request(env) {
  if (!/^A[1-5]$/.test(env.AGENT) || !scenes.includes(env.SCENARIO) ||
      !['true','false'].includes(env.VIDEO)) throw Error('Pedido de captura inválido');
  return [{scene: env.SCENARIO, video: env.VIDEO === 'true'}];
}

function classify(env, report, head, valid) {
  if (env.SETUP !== 'success') return 'environment_error';
  if (!report) return 'environment_error';
  if (head !== env.GITHUB_SHA || !/^[a-f0-9]{40}$/.test(head) || report.commit !== head) return 'environment_error';
  if (report.fatal || report.shots?.some(s => /WebGL.*(unavailable|unsupported|indisponível)|browser.*(closed|executable)/i.test(s.reason))) return 'environment_error';
  if (env.EXPECTED_BUILD && report.build !== env.EXPECTED_BUILD) return 'environment_error';
  if (!report.build || !report.shots?.length || env.CAPTURE !== 'success' ||
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
    trace: null, console_errors: [...(report?.pageErrors || []), ...(report?.consoleErrors || [])],
    failed_requests: report?.failedRequests || [], telemetry:{build:report?.build, timings:report?.timings, report:report?'scene-agent/report.json':null},
    regressions: shots.filter(s => s.status !== 'ok').map(s => ({angle:s.name, reason:s.reason})),
    limitations: ['SwiftShader em CPU. Revisão visual pendente. O recibo de upload contém ID e URL.'],
    manual_visual_review_required:true, diagnostic:report?.fatal || readError || null
  };
  fs.writeFileSync(path.join(out,'manifest.json'), JSON.stringify(manifest,null,2)+'\n');
  const index = ['# QA '+env.AGENT, '', status+' • '+(head || 'SHA indisponível'),'',manifest.run_url,'',
    ...manifest.screenshots.map(s => '['+s.angle+'](../'+s.file+')'), ...manifest.video.map(v => '[Vídeo](../'+v.file+')'),
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
module.exports = {request,classify,checkpoint};
