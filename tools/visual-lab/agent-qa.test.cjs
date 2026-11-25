'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const {classify,request,measureWalkTrace} = require('./agent-qa.cjs');
const {SCENES,walkYaw} = require('./scene-capture-core.cjs');
const configuredWalk = SCENES['floresta-percurso'].walk;
const configuredSegments = configuredWalk.segments;
const sha = 'b'.repeat(40);
const env = {AGENT:'A1', SCENARIO:'floresta-percurso', VIDEO:'true', SETUP:'success',CAPTURE:'success',GITHUB_SHA:sha};
const cam = () => ({onScreen:true,blocked:null});
const makeTrace = rows => rows.map(([t,x,z,y=0,grounded=true,surface=null,surfaceY=null,terrainY=y]) => ({t,x,z,y,grounded,surface,surfaceY,terrainY,camera:cam()}));
const start1={x:-14,y:0,z:-82}, end1={x:-14,y:0,z:-105};
const start2={x:-14,y:0,z:-105}, end2={x:-19,y:0,z:-76};
const start3={x:-19,y:0,z:-76}, end3={x:-14.2,y:0,z:-42.8};
const trace1=makeTrace([[0,-14,-82],[2000,-14,-86.6],[4000,-14,-91.2],[6000,-14,-95.8],[8000,-14,-100.4],[9800,-14,-105]]);
const trace2=makeTrace([[0,-14,-105],[2000,-15,-99.2],[4000,-16,-93.4],[6000,-17,-87.6],[8000,-18,-81.8],[10000,-19,-76],[10800,-19,-76]]);
const trace3=makeTrace([[0,-19,-76],[2000,-18.2,-70.4667],[4000,-17.4,-64.9333],[6000,-16.6,-59.4],[8000,-15.8,-53.8667],[10000,-15,-48.3333],[12000,-14.2,-42.8],[12800,-14.2,-42.8]]);
const metrics1=measureWalkTrace(trace1,start1,end1), metrics2=measureWalkTrace(trace2,start2,end2), metrics3=measureWalkTrace(trace3,start3,end3);
const makeSegment=(i,start,end,trace,traceMetrics,elapsedMs)=>{
  const rule=configuredSegments[i],distance=Math.hypot(end.x-start.x,end.z-start.z);
  return {name:rule.name,key:rule.key,yaw:walkYaw(start,rule.target),start,end,target:rule.target,distance,
    remaining:Math.hypot(end.x-rule.target[0],end.z-rule.target[1]),elapsedMs,cameraSettleMs:1200,
    steeringUpdates:20,steeringIntervalMs:750,finalYaw:walkYaw(end,rule.target),timeoutMs:rule.timeoutMs,
    minTravel:rule.minTravel,tolerance:rule.tolerance,reached:true,trace,traceMetrics};
};
const summarizeSegments=segments=>({
  totalDistance:+segments.reduce((sum,s)=>sum+s.distance,0).toFixed(2),
  totalPathDistance:+segments.reduce((sum,s)=>sum+s.traceMetrics.pathDistance,0).toFixed(2),
  cameraTelemetry:segments.reduce((acc,s)=>{
    const m=s.traceMetrics;acc.samples+=m.cameraSamples;acc.offScreenSamples+=m.offScreenSamples;acc.blockedSamples+=m.blockedSamples;return acc;
  },{samples:0,offScreenSamples:0,blockedSamples:0})
});
const routeSegments=[makeSegment(0,start1,end1,trace1,metrics1,9000),makeSegment(1,start2,end2,trace2,metrics2,10000),makeSegment(2,start3,end3,trace3,metrics3,12000)];
const route={scene:env.SCENARIO,completed:true,
  startReset:{expected:{x:-14,z:-82,yaw:0},actual:{x:-14,y:0,z:-82},verified:true},
  ...summarizeSegments(routeSegments),
  captureQuality:{requested:configuredWalk.captureQuality,applied:true,previous:'auto',selected:configuredWalk.captureQuality},segments:routeSegments};
const report={commit:sha,build:'Mod',shots:[{scene:env.SCENARIO,status:'ok',file:'a.png'}],videos:[{scene:env.SCENARIO,bytes:4100,file:'a.webm'}],routes:[route]};
const run=(r,e={},valid=()=>true)=>classify({...env,...e},r,sha,valid);
const withSegments=segments=>({...route,segments,...summarizeSegments(segments)});
const withSegment=(index,patch)=>withSegments(route.segments.map((s,i)=>i===index?{...s,...patch}:s));
const reportWithFirstTrace=trace=>{
  const metrics=measureWalkTrace(trace,start1,end1);
  const segments=[makeSegment(0,start1,end1,trace,metrics,9000),...route.segments.slice(1)];
  return {...report,routes:[withSegments(segments)]};
};
test('trace de posição/câmera rejeita teleporte e conserva sinais de enquadramento',()=>{
  assert.equal(metrics1.valid,true);
  assert.equal(metrics2.valid,true);
  assert.equal(metrics1.cameraSamples,trace1.length);
  assert.deepEqual(metrics1.surfaceKinds,['terrain'],'terreno comum sem walkable customizado usa terrainY');
  assert.equal(metrics1.surfaceMinY,0);
  const missingTerrain=trace1.map((p,i)=>i===1?{...p,terrainY:null}:p);
  assert.equal(measureWalkTrace(missingTerrain,start1,end1).valid,false,'altura base do terreno precisa ser medida em cada amostra');
  const runnerSource=fs.readFileSync(path.join(__dirname,'scene-agent.cjs'),'utf8');
  assert.equal(runnerSource.split('terrainY:Number.isFinite(w?.terrain)').length - 1, 2,
    'o runner precisa preservar a altura numérica de terrainHeightAt nos dois pontos de captura');
  const elevationTrace=makeTrace([[0,-14,-82,0],[500,-14,-84,.5],[1000,-14,-86.3,.25]]);
  const elevation=measureWalkTrace(elevationTrace,start1,{x:-14,y:.25,z:-86.3});
  assert.equal(elevation.valid,true);
  assert.equal(elevation.verticalTravel,.75);
  assert.equal(elevation.maxVerticalStep,.5);
  assert.equal(elevation.maxVerticalSpeed,1);
  const transitionTrace=makeTrace([[0,-14,-82,0,true,'terrain',0,0],[500,-14,-84,.5,true,'bridge',.5,0],[1000,-14,-86.3,.25,true,'bridge',.5,0]]);
  const transition=measureWalkTrace(transitionTrace,start1,{x:-14,y:.25,z:-86.3});
  assert.equal(transition.valid,true);
  assert.equal(transition.surfaceTransitions,1);
  assert.deepEqual(transition.surfaceKinds,['terrain','bridge']);
  assert.equal(transition.maxSurfaceStep,.5);
  const briefAir=makeTrace([[0,-14,-82,0,true,'terrain',0,0],[500,-14,-84,.2,false,null,null,0],[1000,-14,-86.3,.1,true,'terrain',0,0]]);
  const air=measureWalkTrace(briefAir,start1,{x:-14,y:.1,z:-86.3});
  assert.equal(air.valid,true,'amostra aérea intermediária fica visível para revisão');
  assert.equal(air.airborneSamples,1);
  assert.equal(air.finalGrounded,true);
  const airborneEnd=makeTrace([[0,-14,-82,0,true,'terrain',0,0],[500,-14,-84,.2,true,'terrain',0,0],[1000,-14,-86.3,.1,false,null,null,0]]);
  assert.equal(measureWalkTrace(airborneEnd,start1,{x:-14,y:.1,z:-86.3}).valid,false,'segmento não pode terminar sem apoio');
  const badGround=trace1.map((p,i)=>i===1?{...p,grounded:null}:p);
  assert.equal(measureWalkTrace(badGround,start1,end1).valid,false,'apoio no solo precisa ser medido em cada amostra');
  const badSurface=trace1.map((p,i)=>i===1?{...p,surface:'bridge',surfaceY:NaN}:p);
  assert.equal(measureWalkTrace(badSurface,start1,end1).valid,false,'altura do piso precisa ser finita quando grounded');
  const badHeight=trace1.map((p,i)=>i===1?{...p,y:NaN}:p);
  assert.equal(measureWalkTrace(badHeight,start1,end1).valid,false,'altura não finita não pode desaparecer do trace');
  const verticalStart=trace1.map((p,i)=>i===0?{...p,y:.6}:p);
  assert.equal(measureWalkTrace(verticalStart,start1,end1).valid,false,'trace não pode começar em outro nível vertical');
  const verticalEnd=trace1.map((p,i)=>i===trace1.length-1?{...p,y:.6}:p);
  assert.equal(measureWalkTrace(verticalEnd,start1,end1).valid,false,'trace não pode terminar em outro nível vertical');
  const jump=makeTrace([[0,-14,-82],[500,-14,-60],[1000,-14,-105]]);
  assert.equal(measureWalkTrace(jump,start1,end1).valid,false,'teleporte entre amostras não é caminhada');
  const badTime=makeTrace([[0,-14,-82],[0,-14,-90],[1000,-14,-105]]);
  assert.equal(measureWalkTrace(badTime,start1,end1).valid,false,'amostras precisam ter tempo crescente');
  const fast=makeTrace([[0,-14,-82],[200,-14,-84],[1000,-14,-105]]);
  assert.equal(measureWalkTrace(fast,start1,end1).valid,false,'teleporte de poucos metros em intervalo curto não pode passar');
  const legacyWalk=makeTrace([[0,-14,-82],[500,-14,-84.15],[1000,-14,-86.3]]);
  assert.equal(measureWalkTrace(legacyWalk,start1,{x:-14,y:0,z:-86.3}).valid,true,'caminhada antiga de 4,3 m/s continua dentro do limite');
  const longGap=makeTrace([[0,-14,-82],[3000,-14,-89.67],[6000,-14,-97.33],[9800,-14,-105]]);
  assert.equal(measureWalkTrace(longGap,start1,end1).valid,false,'lacuna longa não comprova caminhada contínua');

  const noCamera=trace1.map((p,i)=>i===1?{...p,camera:null}:p);
  assert.equal(measureWalkTrace(noCamera,start1,end1).valid,false,'cada amostra precisa de telemetria de câmera');
  const obstructed=trace1.map((p,i)=>i===1?{...p,camera:{onScreen:false,blocked:{name:'copa',dist:1.2}}}:p);
  const risk=measureWalkTrace(obstructed,start1,end1);
  assert.equal(risk.valid,true,'oclusão é sinal para revisão visual, não falsifica a continuidade');
  assert.equal(risk.offScreenSamples,1);
  assert.equal(risk.blockedSamples,1);
});
test('preset e validador compartilham os timeouts reais da captura',()=>{
  assert.deepEqual(route.segments.map(s=>s.timeoutMs),configuredSegments.map(s=>s.timeoutMs));
  assert.equal(run(report),'game_ran');
  for (let i=0;i<configuredSegments.length;i++) {
    const changed={...route,segments:route.segments.map((s,j)=>j===i?{...s,timeoutMs:configuredSegments[i].timeoutMs+1000}:s)};
    assert.equal(run({...report,routes:[changed]}),'game_failed','timeout adulterado no relatório deve ser rejeitado');
  }
});
test('trace de câmera usa o alvo padrão do protagonista nos dois extremos',()=>{
  const source=fs.readFileSync(path.join(__dirname,'scene-agent.cjs'),'utf8');
  const start=source.indexOf('const cap = {active:true');
  const end=source.indexOf('const r = await shoot(page, sharp, scene, { name: segment.name',start);
  assert.ok(start>=0&&end>start,'bloco de captura do percurso precisa existir');
  const block=source.slice(start,end);
  assert.equal(block.split('D.camView()').length-1,2,'uma sonda no início e outra no fim usam o jogador como alvo');
  assert.equal(block.replaceAll('D.camView()','').includes('D.camView('),false,'não passa argumento de tipo incerto para a sonda do protagonista');
});
test('percurso restaura a origem depois das tomadas e rejeita reset divergente',()=>{
  assert.equal(run(report),'game_ran');
  assert.equal(run({...report,routes:[{...route,startReset:{...route.startReset,verified:false}}]}),'game_failed');
  assert.equal(run({...report,routes:[{...route,startReset:{...route.startReset,actual:{x:-28.815,y:0,z:-94.586}}}]}),'game_failed');
  const runner=fs.readFileSync(path.join(__dirname,'scene-agent.cjs'),'utf8');
  const shotsAt=runner.indexOf('for (let i = 0; i < scene.shots.length; i++)');
  const resetAt=runner.indexOf('D.teleport(x, z, yaw)',shotsAt);
  const walkAt=runner.indexOf('for (let j = 0; j < scene.walk.segments.length; j++)',resetAt);
  assert.ok(shotsAt>=0 && resetAt>shotsAt && walkAt>resetAt,'a origem é restaurada após a última tomada e antes da caminhada');
});
test('o percurso recalcula o rumo durante o movimento e reserva tempo para a praça',()=>{
  assert.equal(configuredSegments[2].timeoutMs,180000);
  assert.equal(run(report),'game_ran');
  assert.equal(run({...report,routes:[withSegment(2,{steeringUpdates:0})]}),'game_failed');
  assert.equal(run({...report,routes:[withSegment(2,{steeringIntervalMs:500})]}),'game_failed');
  const runner=fs.readFileSync(path.join(__dirname,'scene-agent.cjs'),'utf8');
  assert.match(runner,/window\.__a1RouteSteer=\{updates:0,lastAt:performance\.now\(\),lastYaw:null,intervalMs:750\}/);
  assert.match(runner,/Math\.atan2\(-\(target\[0\] - now\.x\), -\(target\[1\] - now\.z\)\)/);
  assert.match(runner,/D\.view\(yaw, \.12, 5\.5\)/);
});
test('câmera de acompanhamento precisa estabilizar antes de cada trecho',()=>{
  assert.equal(run(report),'game_ran');
  assert.equal(run({...report,routes:[withSegment(0,{cameraSettleMs:-1})]}),'game_failed','timeout de estabilização reprova a captura');
  assert.equal(run({...report,routes:[withSegment(0,{cameraSettleMs:9001})]}),'game_failed','tempo fora do limite não aprova');
  const runner=fs.readFileSync(path.join(__dirname,'scene-agent.cjs'),'utf8');
  const viewAt=runner.indexOf('window.SevenSinsDebug3D.view(yaw, .12, 5.5)');
  const settleAt=runner.indexOf('const cameraSettleMs = await waitCameraStable(page, 9000, 5.5)',viewAt);
  const keyAt=runner.indexOf('await page.keyboard.down(segment.key)',viewAt);
  assert.ok(viewAt>=0 && settleAt>viewAt && keyAt>settleAt,'a câmera termina a curva e confirma a distância de acompanhamento antes de receber KeyW');
  assert.match(runner,/cameraSettleMs, trace,|cameraSettleMs/);
});
test('percurso exige o perfil de captura configurado realmente aplicado',()=>{
  assert.equal(run(report),'game_ran');
  for (const captureQuality of [null,
    {requested:configuredWalk.captureQuality,applied:false,previous:'auto',selected:'auto'},
    {requested:configuredWalk.captureQuality,applied:true,previous:'auto',selected:'high'}]) {
    assert.equal(run({...report,routes:[{...route,captureQuality}]}),'game_failed','perfil não aplicado não pode aprovar percurso lento');
  }
});
test('pedido dirigido e entradas inválidas',()=>{
  assert.deepEqual(request(env),[{scene:'floresta-percurso',video:true}]);
  for (const bad of [{SCENARIO:'$(id)'},{AGENT:'A6'},{VIDEO:'yes'}]) assert.throws(()=>request({...env,...bad}));
});
test('estados de captura distinguem ambiente, arquivo, script e revisão',()=>{
  assert.equal(run(report),'game_ran');
  assert.equal(route.segments.length,3,'o percurso exige bosque, desvio oeste e chegada à praça');
  assert.equal(run({...report,routes:[]}),'game_failed','captura sem percurso contínuo não aprova floresta-percurso');
  assert.equal(run({...report,routes:[{...report.routes[0],completed:false}]}),'game_failed','percurso interrompido não aprova');
  assert.equal(run({...report,routes:[{...route,totalDistance:2.5}]}),'game_failed','movimento curto não aprova o trajeto completo');
  assert.equal(run({...report,routes:[withSegments(route.segments.slice(0,2))]}),'game_failed','omitir o contorno ou a chegada não aprova');
  const gapStart={x:-14,y:0,z:-100};
  const gapTrace=makeTrace([[0,-14,-100],[2000,-15,-95.2],[4000,-16,-90.4],[6000,-17,-85.6],[8000,-18,-80.8],[10000,-19,-76],[10800,-19,-76]]);
  const gapMetrics=measureWalkTrace(gapTrace,gapStart,end2);
  const gapSegment=makeSegment(1,gapStart,end2,gapTrace,gapMetrics,10000);
  const teleported=withSegments([route.segments[0],gapSegment,route.segments[2]]);
  assert.equal(run({...report,routes:[teleported]}),'game_failed','lacuna horizontal entre segmentos não aprova');
  const raisedStart={...start2,y:4},raisedEnd={...end2,y:4};
  const raisedTrace=trace2.map(p=>({...p,y:p.y+4,terrainY:p.terrainY+4,surfaceY:Number.isFinite(p.surfaceY)?p.surfaceY+4:null}));
  const raisedMetrics=measureWalkTrace(raisedTrace,raisedStart,raisedEnd);
  const raisedSegment=makeSegment(1,raisedStart,raisedEnd,raisedTrace,raisedMetrics,10000);
  const verticalTeleport=withSegments([route.segments[0],raisedSegment,route.segments[2]]);
  assert.equal(run({...report,routes:[verticalTeleport]}),'game_failed','segmentos separados por teleporte vertical não aprovam');
  assert.equal(run({...report,routes:[{...route,totalDistance:90}]}),'game_failed','soma divergente dos segmentos não aprova');
  assert.equal(run({...report,routes:[withSegment(1,{minTravel:2.5})]}),'game_failed','limite mínimo de cada trecho não pode ser reduzido no relatório');
  assert.equal(run({...report,routes:[withSegment(0,{start:{x:-10,z:-82}})]}),'game_failed','a caminhada precisa começar no campo configurado');
  assert.equal(run({...report,routes:[withSegment(0,{target:[-14,-100]})]}),'game_failed','o primeiro alvo precisa ser a entrada real do bosque');
  assert.equal(run({...report,routes:[withSegment(0,{yaw:.2})]}),'game_failed','a câmera precisa apontar para o alvo antes de segurar W');
  assert.equal(run({...report,routes:[withSegment(0,{key:'KeyS'})]}),'game_failed','o percurso dirigido usa W nos três segmentos');
  assert.equal(run({...report,routes:[withSegment(0,{tolerance:6})]}),'game_failed','o relatório não pode ampliar a tolerância de chegada');
  assert.equal(run({...report,routes:[withSegment(0,{elapsedMs:0})]}),'game_failed','cada segmento precisa registrar tempo real de movimento');
  assert.equal(run({...report,routes:[withSegment(0,{elapsedMs:route.segments[0].timeoutMs+1})]}),'game_failed','tempo não pode ultrapassar o timeout do segmento');
  assert.equal(run({...report,routes:[withSegment(0,{timeoutMs:route.segments[0].timeoutMs+1000})]}),'game_failed','timeout não pode ser ampliado no relatório');
  assert.equal(run({...report,routes:[withSegment(0,{traceMetrics:{...metrics1,pathDistance:NaN}})]}),'game_failed','métrica de caminho precisa ser finita');
  assert.equal(run({...report,routes:[withSegment(0,{traceMetrics:{...metrics1,maxSpeed:0}})]}),'game_failed','velocidade máxima armazenada precisa corresponder às amostras');
  assert.equal(run({...report,routes:[withSegment(0,{traceMetrics:{...metrics1,verticalTravel:99}})]}),'game_failed','variação vertical armazenada precisa corresponder às amostras');
  assert.equal(run({...report,routes:[withSegment(0,{traceMetrics:{...metrics1,groundedSamples:0}})]}),'game_failed','amostras grounded armazenadas precisam corresponder ao trace');
  assert.equal(run({...report,routes:[withSegment(0,{traceMetrics:{...metrics1,surfaceTransitions:2}})]}),'game_failed','transições de superfície armazenadas precisam corresponder ao trace');
  assert.equal(run({...report,routes:[withSegment(0,{elapsedMs:3000})]}),'game_failed','tempo declarado precisa corresponder ao trace e à janela pós-tecla');
  assert.equal(run({...report,routes:[withSegment(0,{trace:undefined})]}),'game_failed','sem amostras contínuas não aprova');
  const jump=makeTrace([[0,-14,-82],[500,-14,-60],[1000,-14,-105]]);
  assert.equal(run({...report,routes:[withSegment(0,{trace:jump,traceMetrics:measureWalkTrace(jump,start1,end1)})]}),'game_failed','teleporte dentro do trecho não aprova');
  assert.equal(run({...report,routes:[{...route,cameraTelemetry:{...route.cameraTelemetry,blockedSamples:1}}]}),'game_failed','resumo de câmera precisa corresponder às amostras');
  const oneTransientBlock=trace1.map((p,i)=>i===2?{...p,camera:{onScreen:true,blocked:{name:'folha',dist:1.2}}}:p);
  assert.equal(run(reportWithFirstTrace(oneTransientBlock)),'game_ran','uma obstrução isolada não reprova sozinha');
  const persistentBlock=trace1.map((p,i)=>i===2||i===3?{...p,camera:{onScreen:true,blocked:{name:'copa',dist:1.1}}}:p);
  assert.equal(run(reportWithFirstTrace(persistentBlock)),'game_failed','obstrução persistente da câmera reprova o percurso');
  const offscreen=trace1.map((p,i)=>i===2?{...p,camera:{onScreen:false,blocked:null}}:p);
  assert.equal(run(reportWithFirstTrace(offscreen)),'game_failed','personagem fora do quadro reprova o percurso');
  assert.equal(run({...report,routes:[route,route]}),'game_failed','relatórios duplicados do mesmo percurso não aprovam');
  const runner=fs.readFileSync(path.join(__dirname,'scene-agent.cjs'),'utf8');
  assert.match(runner,/route\.segments\.push\(record\);\s*if \(!record\.reached\) break;/,'falha no primeiro trecho interrompe o percurso sem seguir de uma posição incorreta');
  for(const r of [null,{...report,fatal:'browser missing'},{...report,commit:'abc1234'},
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
