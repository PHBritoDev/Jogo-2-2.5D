"use strict";
/** Mobile-friendly static HTML evidence bundle, no network or API key required. */
const fs=require("node:fs"),path=require("node:path");
const {summarizeRun}=require("./agent-perception.cjs");
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function issuesFor(log){
 const summary=summarizeRun(log),issues=[];
 for(const [type,count] of Object.entries(summary.flagCounts)){
   if(count>=2)issues.push({type,count,severity:count>=5?"atencao":"observacao",detail:"Suspeita de pixels; requer inspecao das capturas"});
 }
 for(const warn of summary.structuralWarnings)issues.push({type:warn.type,count:1,severity:"atencao",detail:warn.detail});
 if(log.errors?.length)issues.unshift({type:"erros_execucao",count:log.errors.length,severity:"erro",detail:"Consultar log do Chromium"});
 return {summary,issues};
}
function writeReport(log,dir){
 fs.mkdirSync(dir,{recursive:true});
 const {summary,issues}=issuesFor(log);
 const video=(log.videoFile||"").replace(/^agente\//,"").replace(/\.webm$/,"");
 const gallery=(log.captures||[]).map((file,i)=>{
   const rel=String(file).replace(/^agente\//,"");
   return '<a href="'+esc(rel)+'"><img alt="Quadro '+(i+1)+'" loading="lazy" src="'+esc(rel)+'"><small>'+esc(path.basename(rel))+'</small></a>';
 }).join("");
 const issueHtml=issues.length?issues.map(x=>'<li><b>'+esc(x.type)+'</b> ('+x.count+' ocorrencias) — '+esc(x.detail)+'</li>').join(""):"<li>Nenhum alerta recorrente. Ainda é necessário conferir as capturas.</li>";
 const rows=(log.decisions||[]).map(r=>'<tr><td>'+r.tick+'</td><td>'+esc(r.phase)+'</td><td>'+esc(r.vision?.quality??"—")+'</td><td>'+esc(r.vision?.flags?.join(", ")||"—")+'</td><td>'+esc(r.executed?.buttons?.join(", ")||"—")+'</td><td>'+esc(r.decision?.reason?.join(", ")||"—")+'</td></tr>').join("");
 const css=':root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#0d1220;color:#f1f4fb;font:15px system-ui,sans-serif;line-height:1.5}main{max-width:1150px;margin:auto;padding:22px 14px 65px}h1{font-size:clamp(24px,5vw,35px);line-height:1.2}h2{margin:30px 0 10px}p,small{color:#afbdd3}.panel{background:#182033;border:1px solid #34435f;border-radius:12px;padding:15px;margin:12px 0}.nums{display:grid;grid-template-columns:repeat(auto-fit,minmax(135px,1fr));gap:10px}.num{background:#1d2a3f;border-radius:12px;border:1px solid #34435f;padding:14px}.num strong{display:block;font-size:25px}.gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(220px,46vw),1fr));gap:10px}.gallery a{display:block;border:1px solid #33415a;border-radius:9px;overflow:hidden;text-decoration:none;color:#bbdfff}.gallery img{width:100%;aspect-ratio:16/9;object-fit:contain;display:block}.gallery small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:6px}video{width:100%;max-width:900px;background:black;border-radius:12px}.scroll{overflow:auto}table{border-collapse:collapse;width:100%;min-width:820px;font-size:12px}th,td{border:1px solid #33435c;text-align:left;vertical-align:top;padding:8px}th{background:#293955}';
 const html=[
  '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Agente Visual: relatório</title><style>',css,'</style></head><body><main>',
  '<h1>🎮 Agente Visual — batalha 3D</h1><p>Status: ',esc(log.status),' · commit ',esc(log.commit),' · ',esc(log.date),'</p>',
  '<div class="nums"><div class="num"><strong>',summary.steps,'</strong><small>decisões</small></div><div class="num"><strong>',summary.framesExamined,'</strong><small>imagens analisadas</small></div><div class="num"><strong>',esc(summary.averageVisibility??"—"),'/100</strong><small>visibilidade média</small></div><div class="num"><strong>',(log.captures||[]).length,'</strong><small>capturas</small></div></div>',
  '<div class="panel">As imagens são reais do Chromium/SwiftShader, mas as detecções são <b>heurísticas, não uma IA que entende objetos</b>. A aprovação visual requer assistir aos vídeos. Não mede FPS do Android.</div>',
  '<h2>🎥 Gravação completa</h2><video controls playsinline preload="metadata"><source src="',esc(video),'.mp4" type="video/mp4"><source src="',esc(video),'.webm" type="video/webm"></video>',
  '<h2>🔍 Suspeitas visuais</h2><div class="panel"><ul>',issueHtml,'</ul></div>',
  '<h2>📸 Galeria</h2><div class="gallery">',gallery,'</div>',
  '<h2>🧠 Decisões por etapa</h2><div class="scroll"><table><thead><tr><th>Passo</th><th>Fase</th><th>Visibilidade</th><th>Alertas</th><th>Comandos</th><th>Motivo</th></tr></thead><tbody>',rows,'</tbody></table></div>',
  '<h2>Erros</h2><div class="panel"><pre style="white-space:pre-wrap;overflow-wrap:anywhere">',esc((log.errors||[]).join("\n")||"Nenhum erro registrado."),'</pre></div></main></body></html>'
 ].join("");
 fs.writeFileSync(path.join(dir,"ver-analise.html"),html);
 const md=[
  '# Agente Visual — diagnóstico\n',
  '- Status: '+log.status,
  '- Commit: '+log.commit,
  '- Decisões: '+summary.steps,
  '- Quadros: '+summary.framesExamined,
  '- Visibilidade média (heurística): '+summary.averageVisibility,
  '- Fases: '+summary.distinctPhases.join(", "),
  '\n## Suspeitas — não são bugs confirmados\n',
  ...(issues.length?issues.map(x=>'- '+x.type+': '+x.count+' ('+x.severity+')'):['- Nenhuma suspeita recorrente. Revisar o vídeo.']),
  '\nAbra ver-analise.html após extrair o ZIP. O HTML contém galeria, vídeo e decisões. Nunca marque qualidade visual aprovada sem observar PNG/MP4.'
 ].join("\n")+"\n";
 fs.writeFileSync(path.join(dir,"DIAGNOSTICO.md"),md);
 return {summary,issues};
}
module.exports={writeReport,issuesFor};
