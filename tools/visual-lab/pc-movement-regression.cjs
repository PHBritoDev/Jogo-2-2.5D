const {chromium}=require('playwright'), assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({args:['--no-sandbox']});
 try{
 const page=await browser.newPage();
 await page.goto('http://localhost:4202/build-info.js');
 await page.evaluate(async()=>{document.body.innerHTML='<select><option>A</option><option>B</option></select>';window.movement=(await import('/desktop-movement.js')).bindMovementKeys(window,document);});
 await page.keyboard.down('ShiftLeft');await page.keyboard.down('ShiftRight');await page.keyboard.up('ShiftLeft');
 assert.equal(await page.evaluate(()=>movement.shift),true);await page.keyboard.up('ShiftRight');
 await page.keyboard.down('w');await page.keyboard.down('d');assert.ok(await page.evaluate(()=>movement.w&&movement.d));
 await page.locator('select').focus();assert.ok(await page.evaluate(()=>!movement.w&&!movement.d));
 await page.keyboard.press('ArrowDown');assert.equal(await page.locator('select').inputValue(),'B');
 await page.keyboard.up('w');await page.keyboard.up('d');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
