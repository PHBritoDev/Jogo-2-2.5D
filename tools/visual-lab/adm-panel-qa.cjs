'use strict';
/** Capturas PC/móvel, acessibilidade e prova de clique do ADM.
 * Rodar: NODE_PATH=work/qa/node_modules node tools/visual-lab/adm-panel-qa.cjs
 * Servidor local na porta 4176, grava em work/evidence/adm-panel/. */
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=process.env.VISUAL_BASE_URL||'http://127.0.0.1:4176',dir=path.resolve(process.env.VISUAL_OUTPUT||'work/evidence','adm-panel');
fs.mkdirSync(dir,{recursive:true});
async function main(){
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const data={screens:[],errors:[],checks:[]};
 try{
  for(const item of [{name:'pc',w:1440,h:900},{name:'mobile-portrait',w:393,h:852},{name:'mobile-landscape',w:852,h:393}]){
   const page=await browser.newPage({viewport:{width:item.w,height:item.h},deviceScaleFactor:1});
   page.on('pageerror',e=>data.errors.push({screen:item.name,message:e.message}));
   await page.goto(root+'/mundo-3d-prototype.html?adm=1&debug3d=1',{waitUntil:'domcontentloaded',timeout:60000});
   await page.locator('#adm-toggle').waitFor({timeout:120000});
   const toggle=page.locator('#adm-toggle');await toggle.click();
   assert.equal(await toggle.getAttribute('aria-expanded'),'true',item.name+' aberto');
   const panel=page.locator('#adm-content');assert.ok(await panel.isVisible(),item.name+' visível');
   for(const [tab,label] of [['ganancia','⚔ Ganância'],['dimensoes','Dimensões'],['viagem','Viagem']]){
    await page.getByRole('button',{name:label,exact:true}).click();
    const selected=await page.getByRole('button',{name:label,exact:true}).getAttribute('aria-selected');
    assert.equal(selected,'true',item.name+' / '+tab);
   }
   await page.getByRole('button',{name:'⚔ Ganância',exact:true}).click();
   assert.ok(await page.getByRole('button',{name:/ATIVAR ULTIMATE/}).isVisible());
   const pause=page.getByRole('button',{name:'⏸ PAUSAR INIMIGOS',exact:true});assert.ok(await pause.isVisible(),item.name+' pausa visível');
   await pause.click();assert.ok(await page.getByRole('button',{name:'▶ RETOMAR INIMIGOS',exact:true}).isVisible(),item.name+' pausa ativada');
   await page.getByRole('button',{name:'▶ RETOMAR INIMIGOS',exact:true}).click();assert.ok(await page.getByRole('button',{name:'⏸ PAUSAR INIMIGOS',exact:true}).isVisible(),item.name+' pausa desativada');
   const bounds=await panel.boundingBox();
   const scroll=await page.locator('.adm-scroll').evaluate(el=>({clientHeight:el.clientHeight,scrollHeight:el.scrollHeight,scrollWidth:el.scrollWidth,clientWidth:el.clientWidth}));
   assert.ok(bounds && bounds.x>=-1 && bounds.x+bounds.width<=item.w+1,'painel contido na largura');
   assert.ok(bounds.y>=-1&&bounds.y+bounds.height<=item.h+1,'painel contido na altura');
   assert.ok(scroll.scrollWidth<=scroll.clientWidth+2,'sem scroll horizontal');
   await page.getByRole('button',{name:/ATIVAR ULTIMATE/}).click();
   assert.match(await page.locator('.adm-status').innerText(),/Dimensão V|fase III|Aguarde|solicitada|execução/i,'feedback de contexto');
   await page.screenshot({path:path.join(dir,item.name+'.png'),timeout:60000});
   data.screens.push({name:item.name,bounds,scroll});
   await page.close();
  }
  assert.deepEqual(data.errors,[],'sem pageerrors');
  data.checks.push('3 resoluções, abas, botão, feedback, sem overflow');
 }finally{fs.writeFileSync(path.join(dir,'resultado.json'),JSON.stringify(data,null,2));await browser.close();}
 console.log(JSON.stringify({screens:data.screens.map(x=>x.name),checks:data.checks,errors:data.errors}));
}
main().catch(e=>{console.error(e);process.exitCode=1});
