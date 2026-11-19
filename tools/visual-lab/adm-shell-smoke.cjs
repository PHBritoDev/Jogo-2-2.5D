const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});
 try {
 for(const width of [1280,852]){
  const page=await browser.newPage({viewport:{width,height:width===852?393:720}});
  await page.goto(process.env.SHELL_URL || 'http://localhost:4201/index.html?treinoEspadas=1',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#primary-3d-frame[src*="treinoEspadas"]');
  await page.locator('#lab-test-entry').click({noWaitAfter:true});
  for(const key of ['bishop1','bishop2','vale','bishop4']){
   await page.locator('[data-dim="'+key+'"],[data-journey="'+key+'"]').click();
   const url=new URL(await page.locator('#game').getAttribute('src'),page.url());
   for(const name of ['adm','debug3d','treinoEspadas'])assert.equal(url.searchParams.get(name),'1');
   assert.equal(url.searchParams.get(key==='vale'?'jornadaInicio':'testeDimensao'),key==='vale'?'1':key);
   assert.equal(url.searchParams.get('refresh'),url.searchParams.get('build'));
  }
  await page.locator('#open').click();await page.waitForFunction(()=>!!document.fullscreenElement);
  await page.keyboard.press('Escape');
  if(await page.evaluate(()=>!!document.fullscreenElement))await page.locator('#open').click();
  await page.waitForFunction(()=>!document.fullscreenElement);
  assert.equal(page.context().pages().length,1);
  await page.screenshot({path:'docs/qa/adm-shell-'+width+'.png'});await page.close();
 }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
