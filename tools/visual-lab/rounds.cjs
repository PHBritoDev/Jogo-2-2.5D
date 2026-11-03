"use strict";
/**
 * Agente V5: executa rodadas REAIS consecutivas no mesmo job GitHub Actions.
 * Nao espera cron nem mensagens: termina uma gravacao e comeca a proxima.
 * Os angulos mudam por rodada. Limites impedem recursao, gasto e loops infinitos.
 * Este orquestrador NAO e um agente que reescreve codigo ou faz commits.
 */
const fs=require("node:fs");
const path=require("node:path");
const {spawnSync}=require("node:child_process");
const root=path.resolve(process.env.VISUAL_OUTPUT||"visual-lab-results");
const roundsDir=path.join(root,"rodadas");
const script=path.join(__dirname,"agent-run.cjs");
const profiles=["padrao","proximidade","alternativo"];
const MAX_ROUNDS=3;
const RUN_TIMEOUT=180000; // Tres minutos por rodada, mais que o suficiente para o teste padrao.
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

function statusOf(record){
  return !!(record&&record.code===0&&record.report?.status==="capturado_com_decisoes_adaptativas"&&
    (record.report?.captures?.length||0)>=3);
}
function visualWarnings(record){
  const counts=record?.report?.summary?.diagnostic?.flagCounts||
    record?.report?.diagnostic?.summary?.flagCounts||{};
  return Object.entries(counts).filter(([name,number])=>
    Number(number)>=4&&[
      "quadro_escuro","brilho_encobrindo_tela","centro_sem_visibilidade",
      "possivel_objeto_escuro_obstruindo_camera","baixo_detalhe_espacial"
    ].includes(name)).map(([name,count])=>({name,count}));
}
function shouldRunThird(results){
  if(results.length<2)return false;
  return results.some(r=>!statusOf(r)||visualWarnings(r).length>0);
}
function summarize(results){
  const passed=results.filter(statusOf).length;
  return {
    schema:1,date:new Date().toISOString(),commit:process.env.GITHUB_SHA||"local",
    maxRounds:MAX_ROUNDS,roundsExecuted:results.length,roundsPassed:passed,
    status:passed===results.length&&passed>=2?"aprovado":"requer_investigacao",
    profiles:results.map(r=>({round:r.round,profile:r.profile,passed:statusOf(r),
      exitCode:r.code,elapsedMs:r.elapsedMs,warningFlags:visualWarnings(r),
      captureCount:r.report?.captures?.length||0,
      observations:r.report?.decisions?.length||0,
      errors:(r.report?.errors||[]).slice(0,3).map(e=>String(e).slice(0,200)),
      path:"rodadas/rodada-"+r.round+"/agente/ver-analise.html"})),
    note:"Cada rodada testa o jogo 3D no Chromium/SwiftShader em angulos diferentes. "+
      "Rodadas sucessivas NAO comprovam qualidade artistica nem FPS Android. "+
      "Uma falha em qualquer rodada deve ser investigada, nao escondida."
  };
}
function runOne(round,profile){
  const dir=path.join(roundsDir,"rodada-"+round);
  fs.mkdirSync(dir,{recursive:true});
  const start=Date.now();
  const child=spawnSync(process.execPath,[script],{
    cwd:path.resolve(__dirname,"../.."),
    env:{...process.env,VISUAL_OUTPUT:dir,AGENT_ROUND_PROFILE:profile},
    encoding:"utf8",timeout:RUN_TIMEOUT,maxBuffer:8*1024*1024
  });
  fs.writeFileSync(path.join(dir,"executor.log"),
    "Rodada "+round+" | perfil "+profile+"\n"+
    "Exit: "+String(child.status)+" signal: "+String(child.signal)+"\n"+
    (child.stdout||"")+"\n"+(child.stderr||""));
  let report=null;
  const file=path.join(dir,"agente","agente-relatorio.json");
  if(fs.existsSync(file))try{report=JSON.parse(fs.readFileSync(file,"utf8"));}catch{}
  const item={round,profile,code:typeof child.status==="number"?child.status:124,
    elapsedMs:Date.now()-start,report,spawnError:child.error?.message||null};
  process.stdout.write("[RODADA "+round+"/"+MAX_ROUNDS+"] "+profile+
    " | "+(statusOf(item)?"aprovada":"falhou")+
    " | "+item.elapsedMs+" ms\n");
  return item;
}
function writeIndex(summary){
  const rows=summary.profiles.map(x=>"<tr><td>"+x.round+"</td><td>"+esc(x.profile)+
    "</td><td>"+(x.passed?"PASSOU":"FALHOU")+"</td><td>"+x.observations+
    "</td><td>"+esc(x.warningFlags.map(w=>w.name+" ("+w.count+")").join(", ")||"—")+
    '</td><td><a href="../'+esc(x.path)+'">abrir evidências</a></td></tr>').join("");
  const text='<!doctype html><html lang="pt-BR"><meta charset="utf-8">'+
    '<meta name="viewport" content="width=device-width,initial-scale=1">'+
    '<title>Agente V5: rodadas</title><style>body{font:16px system-ui;background:#111827;color:#e5e7eb;'+
    'max-width:900px;margin:24px auto;padding:0 14px}table{border-collapse:collapse;width:100%}'+
    'td,th{padding:10px;border:1px solid #475569;text-align:left}a{color:#7dd3fc}'+
    'p{line-height:1.6}</style><h1>Rodadas consecutivas do agente 3D</h1><p>'+
    esc(summary.status)+" · "+summary.roundsPassed+"/"+summary.roundsExecuted+
    " rodadas aprovadas. A próxima começa assim que a anterior acaba, até no máximo 3.</p>"+
    '<p>'+esc(summary.note)+'</p><div style="overflow:auto"><table><thead><tr>'+
    "<th>Rodada</th><th>Câmera</th><th>Estado</th><th>Decisões</th><th>Alertas</th>"+
    "<th>Capturas / vídeo</th></tr></thead><tbody>"+rows+"</tbody></table></div></html>";
  fs.writeFileSync(path.join(roundsDir,"abrir-rodadas.html"),text);
  const md="# V5 — rodadas consecutivas\n\n"+
    "- Estado: "+summary.status+"\n- Aprovadas: "+summary.roundsPassed+"/"+summary.roundsExecuted+
    "\n- Primeiro perfil é referência para comparação histórica; outras rodadas ficam preservadas no ZIP.\n\n"+
    summary.profiles.map(x=>"- Rodada "+x.round+" ("+x.profile+"): "+(x.passed?"PASSOU":"FALHOU")+
      ", "+x.observations+" decisões, "+x.captureCount+" prints, "+x.warningFlags.length+" alertas recorrentes").join("\n")+
    "\n\nAbrir abrir-rodadas.html. Toda falha deve ser investigada; não houve correção de código automática.\n";
  fs.writeFileSync(path.join(roundsDir,"RESUMO.md"),md);
}
function publishCanonical(results,summary){
  // Compara com a mesma camera padrao de execucoes anteriores sempre que houver.
  const selected=results.find(r=>r.profile==="padrao"&&statusOf(r))||
    results.find(statusOf)||results[0];
  if(!selected)return;
  const src=path.join(roundsDir,"rodada-"+selected.round,"agente");
  const dest=path.join(root,"agente");
  if(!fs.existsSync(src))return;
  fs.rmSync(dest,{recursive:true,force:true});
  fs.cpSync(src,dest,{recursive:true});
  const panel=path.join(dest,"ver-analise.html");
  if(fs.existsSync(panel)){
    const msg='<div class="panel"><h2>🔁 Rodadas consecutivas V5</h2>'+
      '<p>'+esc(summary.roundsPassed)+"/"+esc(summary.roundsExecuted)+
      ' aprovadas. Todas as evidências (inclusive falhas) estão em '+
      '<a href="../rodadas/abrir-rodadas.html">abrir-rodadas.html</a>.</p>'+
      '<p>Este painel mostra apenas o perfil selecionado: '+esc(selected.profile)+
      '. Compare as outras perspectivas antes de aprovar VFX.</p></div>';
    fs.writeFileSync(panel,fs.readFileSync(panel,"utf8").replace("</main>",msg+"</main>"));
  }
}
function runAll(exec=runOne){
  fs.mkdirSync(roundsDir,{recursive:true});
  const results=[];
  // Um ciclo consecutivo curto, SEM aguardar chat, cron ou interacao externa.
  for(let i=0;i<MAX_ROUNDS;i++){
    if(i===2&&!shouldRunThird(results))break;
    results.push(exec(i+1,profiles[i]));
  }
  const summary=summarize(results);
  fs.writeFileSync(path.join(roundsDir,"rodadas.json"),JSON.stringify(summary,null,2)+"\n");
  writeIndex(summary);
  publishCanonical(results,summary);
  process.stdout.write("[V5] "+summary.roundsPassed+"/"+summary.roundsExecuted+
    " rodadas aprovadas | estado: "+summary.status+"\n");
  return summary;
}
if(require.main===module){
  try{
    const summary=runAll();
    if(summary.status!=="aprovado")process.exitCode=1;
  }catch(e){console.error("[V5] Erro estrutural: "+(e.stack||e));process.exitCode=1;}
}
module.exports={statusOf,visualWarnings,shouldRunThird,summarize,runAll};
