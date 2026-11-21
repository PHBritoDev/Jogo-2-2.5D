'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const {classify,request} = require('./agent-qa.cjs');
const sha = 'b'.repeat(40);
const env = {AGENT:'A1', SCENARIO:'floresta-percurso', VIDEO:'true', SETUP:'success',CAPTURE:'success',GITHUB_SHA:sha};
const report = {commit:sha,build:'Mod',shots:[{scene:env.SCENARIO,status:'ok',file:'a.png'}],videos:[{scene:env.SCENARIO,bytes:4100,file:'a.webm'}]};
const run = (r,e={},valid=()=>true)=>classify({...env,...e},r,sha,valid);
test('pedido dirigido e entradas inválidas',()=>{
  assert.deepEqual(request(env),[{scene:'floresta-percurso',video:true}]);
  for (const bad of [{SCENARIO:'$(id)'},{AGENT:'A6'},{VIDEO:'yes'}]) assert.throws(()=>request({...env,...bad}));
});
test('estados de captura distinguem ambiente, arquivo, script e revisão',()=>{
  assert.equal(run(report),'game_ran');
  for (const r of [null,{...report,fatal:'browser missing'},{...report,commit:'abc1234'},
    {...report,shots:[{reason:'WebGL unavailable'}]}]) assert.equal(run(r),'environment_error');
  assert.equal(run(report,{SETUP:'failure'}),'environment_error');
  assert.equal(run(report,{CAPTURE:'failure'}),'game_failed');
  assert.equal(run(report,{},()=>false),'game_failed');
  assert.equal(run({...report,videos:[]}),'game_failed');
  assert.equal(run({...report,shots:[{...report.shots[0],status:'suspeita'}]}),'game_ran');
});
const workflow = fs.readFileSync(path.join(__dirname,'../../.github/workflows/agente-cenas.yml'),'utf8');
const script = workflow.split('          script: |\n')[1].split('\n  evidencia:')[0];
const gate = new (Object.getPrototypeOf(async()=>{}).constructor)('context','github','process',script);
const ctx = {repo:{owner:'me',repo:'game'},sha,runId:100};
const branch = 'codex/prova';
function check({input={},prs,runs=[],jobs=[],apiError}={}) {
  const api = {rest:{pulls:{list:async()=>{if(apiError) throw Error(String(apiError));return {data:prs||[{head:{repo:{full_name:'me/game'},sha},number:12}]};}},
    actions:{listJobsForWorkflowRun:async()=>({data:{jobs}}),listWorkflowRuns:async()=>({data:{total_count:runs.length,workflow_runs:runs}})}}};
  return gate(ctx,api,{env:{GITHUB_REF_TYPE:'branch',GITHUB_REF_NAME:branch,TARGET:'12',AGENT:'A1',GITHUB_RUN_ATTEMPT:'1',...input}});
}
test('preflight real do YAML, escopo e economia',async()=>{
  for (const a of ['A1','A2','A3','A4','A5']) assert.equal(await check({input:{AGENT:a}}),12);
  const prior = {id:90,head_sha:sha,display_title:'QA/A1/'+branch+'/'+sha,status:'in_progress'};
  for (const opts of [{prs:[]},{apiError:403},{apiError:429},{input:{TARGET:'$(id)'}},
    {input:{GITHUB_REF_NAME:'main'}},{input:{GITHUB_REF_TYPE:'tag'}},{runs:[prior]},
    {runs:[{...prior,head_sha:'old'},{...prior,head_sha:'older'}]}]) await assert.rejects(check(opts));
  assert.equal(await check({runs:[{...prior,head_sha:'old'}]}),12);
  assert.doesNotMatch(workflow,/^  (push|schedule|pull_request|workflow_run)/m);
  assert.match(workflow,/group: evidencia-\$\{\{ github.ref \}\}-\$\{\{ inputs.agent \}\}/);
  assert.match(workflow,/group: evidencia-\$\{\{ github.ref \}\}-\$\{\{ inputs.agent \}\}\n      cancel-in-progress: false/);
});
test('retomada sem repetição cega ou aprovação por metadados',()=>{
  const {checkpoint} = require('./agent-qa.cjs');
  const args = {sha,runSha:sha,runStatus:'completed',artifact:{expired:false}};
  for (const [patch,state] of [[{runSha:'old'},'QA_SOLICITADO'],[{http:403},'BLOQUEADO'],
    [{http:429},'BLOQUEADO'],[{runStatus:'in_progress'},'QA_EXECUTANDO'],[{artifact:null},'ANALISE_VISUAL_PENDENTE'],
    [{artifact:{expired:true}},'ANALISE_VISUAL_PENDENTE'],[{},'ANALISE_VISUAL_PENDENTE'],
    [{reviewed:true},'EVIDENCIA_PRONTA']]) assert.equal(checkpoint({...args,...patch}),state);
});

test('rejeição antes da gravação permite corrigir o mesmo SHA',async()=>{
  const runs=[{id:90,head_sha:sha,display_title:'QA/A1/'+branch+'/'+sha,status:'completed',conclusion:'failure'}];
  const input={TARGET:' '};
  assert.equal(await check({input,runs,jobs:[{name:'evidencia',conclusion:'skipped'}]}),12);
  await assert.rejects(check({input,runs,jobs:[{name:'evidencia',conclusion:'failure'}]}));
  await assert.rejects(check({input:{TARGET:branch+'.'}}));
});
