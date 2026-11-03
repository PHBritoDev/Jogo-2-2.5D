"use strict";
/**
 * QA real da Ruptura do Bispo1 em Chromium SwiftShader. Não confunde presença
 * de mesh com fidelidade ao vídeo; compara o MESMO frame com camada on/off,
 * registra vídeo/captura e falha quando o shader não compila.
 */
const fs=require("node:fs"),path=require("node:path");
const {chromium}=require("playwright"),sharp=require("sharp");
const out=path.resolve(process.env.VISUAL_OUTPUT||"visual-lab-results","vhazrael-mod275");
const host=(process.env.VISUAL_BASE_URL||"http://127.0.0.1:4173").replace(/\/$/,"");
fs.mkdirSync(out,{recursive:true});
const stages=[
  {key:"carga",t:3.2,cam:"back",wing:true,core:true},
  {key:"corte",t:5.05,cam:"hero",core:true},
  {key:"impacto",t:5.9,cam:"wide",impact:true},
  {key:"pos-impacto",t:6.7,cam:"hero",impact:true},
];
async function pixels(file) {
 return sharp(file).resize(128,72).removeAlpha().raw().toBuffer();
}
function difference(a,b) {
 if(a.length!==b.length)throw Error("dimensões de imagem diferentes");
 let sum=0;for(let i=0;i<a.length;i++)sum+=Math.abs(a[i]-b[i]);
 return sum/(a.length*255);
}
async function run(){
 const result={status:"incompleto",profiles:[],errors:[],source:"Playwright Chromium SwiftShader",limitations:
 "Comparação de pixels prova diferença de quadros, não identidade artística nem FPS Android."};
 let browser;
 try{
  browser=await chromium.launch({headless:true,args:[
    "--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
    "--ignore-gpu-blocklist","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
  for(const low of [false,true]){
   for(const stage of low?[stages[0],stages[2]]:stages){
    const id=(low?"low-":"high-")+stage.key;
    const context=await browser.newContext({
      viewport:{width:852,height:480},deviceScaleFactor:1,isMobile:true,hasTouch:true});
    const page=await context.newPage(),errors=[];
    page.on("pageerror",e=>errors.push(e.message.slice(0,400)));
    page.on("console",m=>{if(m.type()==="error"&&/shader|compile|WebGLProgram/i.test(m.text()))
      errors.push(m.text().slice(0,600));});
    try{
      const url=host+"/vhazrael-preview.html?k=throne&t="+stage.t+"&cam="+stage.cam+
        "&d=9"+(low?"&low=1":"")+"&qa=275";
      await page.goto(url,{waitUntil:"domcontentloaded",timeout:45000});
      await page.waitForFunction(()=>window.__ready===true&&window.__qa?.rt,null,{timeout:115000});
      const data=await page.evaluate(()=>{
        const qa=window.__qa,rt=qa.rt,fx=rt.vhazraelVFX;
        const spell=rt.squad.spells.find(x=>x.type==="throne");
        const mesh=qa.scene.getObjectByName("VhazraelRupturaReferenciaMod275");
        return {phase:spell?.phase??null,spellAge:spell?.age??null,stats:fx.throneReferenceStats,
          exists:!!mesh,webgl:!!qa.renderer.getContext(),calls:qa.renderer.info.render.calls,
          tilt:qa.qa.tilt,heroHP:qa.hero?.alive};
      });
      if(!data.webgl||!data.exists)throw Error(id+": VFX não entrou na cena 3D");
      if(!(data.calls>0))throw Error(id+": nenhum drawcall WebGL");
      if(!data.phase)throw Error(id+": Ruptura não ativou no motor");
      if(stage.wing&&!data.stats?.wings)throw Error(id+": não gerou massas laterais");
      if(stage.core&&!data.stats?.core)throw Error(id+": não apareceu o núcleo branco");
      if(stage.impact&&data.stats?.impact<=.01)throw Error(id+": impacto sem energia");
      if(stage.impact&&data.stats.rocks===0&&data.stats.lightning===0)
       throw Error(id+": sem detritos ou raios");
      if(errors.length)throw Error(id+": WebGL/JS "+errors.join(" | ").slice(0,420));
      // Cena congelada no mesmo instante: a única diferença é esconder a Mod 275.
      await page.evaluate(()=>{
        const qa=window.__qa,mesh=qa.scene.getObjectByName("VhazraelRupturaReferenciaMod275");
        mesh.visible=false;qa.draw();
      });
      const off=path.join(out,id+"-anterior.png");
      await page.screenshot({path:off,animations:"disabled",timeout:22000});
      await page.evaluate(()=>{
        const qa=window.__qa,mesh=qa.scene.getObjectByName("VhazraelRupturaReferenciaMod275");
        mesh.visible=true;qa.draw();
      });
      const on=path.join(out,id+"-novo.png");
      await page.screenshot({path:on,animations:"disabled",timeout:22000});
      const diff=difference(await pixels(on),await pixels(off));
      const minDifference=stage.key==="pos-impacto"?.0015:.003; // dissipação tardia tem menos área visível
      if(diff<minDifference)throw Error(id+": diferença de pixels insuficiente ("+diff.toFixed(4)+")");
      result.profiles.push({...data,id,url,difference:+diff.toFixed(4),on:path.basename(on),off:path.basename(off)});
      process.stdout.write("[BISPO1] "+id+" | "+data.phase+" | "+diff.toFixed(3)+
        " | core="+data.stats.core+" wings="+data.stats.wings+" stones="+data.stats.rocks+"\n");
    }finally{await context.close().catch(()=>{});}
   }
  }
  // Movimento completo: além dos instantes congelados, reproduz uma gravação
  // contínua REAL do ataque, sem mudar animação ou acelerar o jogo.
  const movieCtx=await browser.newContext({viewport:{width:852,height:480},
    deviceScaleFactor:1,isMobile:true,hasTouch:true,
    recordVideo:{dir:out,size:{width:852,height:480}}});
  const movie=await movieCtx.newPage(),movieErrors=[];
  movie.on("pageerror",e=>movieErrors.push(e.message.slice(0,250)));
  try{
    await movie.goto(host+"/vhazrael-preview.html?k=throne&cam=wide&d=9&qa=275-movie",
      {waitUntil:"domcontentloaded",timeout:45000});
    await movie.waitForFunction(()=>!!window.__qa?.rt?.squad?.spells?.some(s=>s.type==="throne"),
      null,{timeout:115000});
    const phases=new Set();let reachedImpact=false,reachedRecovery=false;
    const deadline=Date.now()+105000; // no SwiftShader o tempo do jogo passa mais devagar
    while(Date.now()<deadline){
      const phase=await movie.evaluate(()=>
        window.__qa?.rt?.squad?.spells?.find(s=>s.type==="throne")?.phase||null);
      if(phase)phases.add(phase);
      if(phase==="impact")reachedImpact=true;
      if(reachedImpact&&(phase==="fade"||phase===null)){
        reachedRecovery=true;break;
      }
      await movie.waitForTimeout(600);
    }
    result.moviePhases=[...phases];
    result.movieFinished={impact:reachedImpact,recovery:reachedRecovery};
    if(!reachedImpact||!reachedRecovery)
      throw Error("Video nao registrou o golpe completo ate a recuperacao: "+[...phases].join(","));
    if(movieErrors.length)throw Error("Erro JS durante vídeo: "+movieErrors.join(" | "));
  }finally{
    const original=movie.video();
    await movieCtx.close().catch(()=>{});
    try{
      if(original){
        const file=await original.path(),target=path.join(out,"ataque-bispo1-mod275.webm");
        if(file!==target)fs.renameSync(file,target);
        result.video=path.basename(target);
      }
    }catch(e){result.videoError=String(e.message);}
  }
  result.status="capturado_para_revisao";
 }catch(e){result.status="falhou";result.errors.push(String(e.stack||e));}
 finally{
  if(browser)await browser.close().catch(()=>{});
  fs.writeFileSync(path.join(out,"relatorio.json"),JSON.stringify(result,null,2)+"\n");
  const rows=result.profiles.map(f=>'<h3>'+f.id+' · '+f.phase+' · diferença '+f.difference+
    '</h3><div style="display:flex;gap:8px"><img width="48%" src="'+f.off+
    '"><img width="48%" src="'+f.on+'"></div>').join("\n");
  fs.writeFileSync(path.join(out,"comparacao.html"),
   '<meta name="viewport" content="width=device-width,initial-scale=1"><title>Bispo 1 Mod275</title>'+
   '<style>body{background:#0f172a;color:#fff;font:16px system-ui}img{object-fit:contain;max-width:100%}</style>'+
   '<h1>Bispo 1 — ANTES vs DEPOIS (mesmo quadro)</h1><p>Vídeo real da animação completa: <a style="color:#9cf" href="ataque-bispo1-mod275.webm">reproduzir WebM</a>. '+
   'Esquerda: VFX original. Direita: VFX reforçado. '+
   'Não equivale a fidelidade perfeita à referência de animação.</p>'+rows);
 }
 if(result.status!=="capturado_para_revisao")process.exitCode=1;
}
if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={difference};
