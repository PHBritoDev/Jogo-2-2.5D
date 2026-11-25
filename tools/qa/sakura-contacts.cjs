// Each checkpoint sets up the camera and starting position. Movement, jumps,
// dash and landing all go through the normal keyboard handlers.
module.exports=async function testContacts(page,out,touch=false){
 const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
 const frames=n=>page.evaluate(async count=>{for(let i=0;i<count;i++)await new Promise(requestAnimationFrame);},n);
 const pose=()=>page.evaluate(()=>SevenSinsDebug3D.walkState());
 const report={};
 const start=async(x,z,yaw)=>{
  await page.evaluate(([x,z,yaw])=>{const d=SevenSinsDebug3D;d.placeAt(x,d.groundAt(x,z),z);d.viewQA(true,yaw,0);},[x,z,yaw]);
  await frames(12);
 };
 let pressedStick=null;
 const cdp=touch?await page.context().newCDPSession(page):null;
 async function touchPoints(type,points){await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points});}
 async function hold(key){
  if(!touch)return page.keyboard.down(key);
  const box=await page.locator('#stick').boundingBox();
  pressedStick={id:0,x:box.x+box.width/2,y:box.y+box.height/2};
  await touchPoints('touchStart',[pressedStick]);
  pressedStick.y+=(key==='w'?-1:1)*box.height*.4;
  await touchPoints('touchMove',[pressedStick]);
 }
 async function release(key){
  if(!touch)return page.keyboard.up(key);
  await touchPoints('touchEnd',[]);pressedStick=null;
 }
 async function action(key,id){
  if(!touch)return page.keyboard.press(key);
  const b=await page.locator(id).boundingBox();
  await touchPoints('touchStart',[pressedStick,{id:1,x:b.x+b.width/2,y:b.y+b.height/2}]);
 }
 async function move(key,n){await hold(key);try{await frames(n);}finally{await release(key);}await frames(5);}
 const deck=await page.evaluate(async()=>{
  const {TRAIL_SITES}=await import('/sakura-route3d.js'),p=TRAIL_SITES[1];
  return {...p,y:SevenSinsDebug3D.groundAt(p.x,p.z)};
 });
 const sx=Math.sin(.4),cz=Math.cos(.4),along=p=>(p.x-deck.x)*sx+(p.z-deck.z)*cz;
 await start(deck.x-3*sx,deck.z-3*cz,.4+Math.PI);
 await hold('w');
 try{
  await page.waitForFunction(([x,z,s,c])=>{const p=SevenSinsDebug3D.walkState();return (p.x-x)*s+(p.z-z)*c>.85;},[deck.x,deck.z,sx,cz],{timeout:40000});
  await frames(9);
 }finally{await release('w');}
 report.deck=await pose();
 assert.ok(Math.abs(report.deck.y-(deck.y+.405))<.08&&along(report.deck)<1.3,'apoio no tablado e lateral do banco '+JSON.stringify(report.deck));
 await hold('w');
 try{
  await action('Space','#jump');
  await page.waitForFunction(([x,z,s,c])=>{const p=SevenSinsDebug3D.walkState();return (p.x-x)*s+(p.z-z)*c>1.50;},[deck.x,deck.z,sx,cz],{timeout:40000});
 }finally{await release('w');}
 await page.waitForFunction(()=>SevenSinsDebug3D.walkState().grounded,null,{timeout:30000});report.bench=await pose();
 assert.ok(report.bench.grounded&&Math.abs(report.bench.y-(deck.y+.965))<.07,'pouso no assento '+JSON.stringify(report.bench));
 await page.screenshot({path:path.join(out,'banco.jpg')});
 await hold('s');
 try{await page.waitForFunction(y=>SevenSinsDebug3D.walkState().y<y-.45,report.bench.y,{timeout:30000});}finally{await release('s');}
 await frames(8);report.descent=await pose();
 assert.ok(report.descent.grounded&&report.descent.y<report.bench.y-.45,'descida do banco');
 await start(-1034,-1602,Math.PI);
 await move('w',48);report.wall=await pose();await hold('w');
 try{await action('f','#dash');await frames(16);}finally{await release('w');}
 report.dash=await pose();
 assert.ok(report.wall.z<-1599.5&&report.wall.z>-1601&&report.dash.z<=report.wall.z+.12,'parede do dojo '+JSON.stringify(report));
 fs.writeFileSync(path.join(out,'contacts.json'),JSON.stringify({deck,report},null,2));
 console.log('CONTACTS',JSON.stringify(report));
};
