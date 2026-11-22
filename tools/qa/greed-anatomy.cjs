// Validates the rendered mesh using the same Three.js revision as the game.
const {chromium}=require('playwright'), assert=require('node:assert/strict'),path=require('node:path');
(async()=>{
  const browser=await chromium.launch({args:['--no-sandbox']});
  try{
    for (const hasTouch of [true,false]){
      const page=await browser.newPage({hasTouch});
      if(process.env.THREE_ROOT)await page.route('https://cdn.jsdelivr.net/npm/three@0.160.0/**',r=>r.fulfill({
        path:path.join(process.env.THREE_ROOT,new URL(r.request().url()).pathname.split('/three@0.160.0/')[1]),contentType:'application/javascript'}));
      await page.goto(new URL('build-info.js',process.env.GAME_URL).href);
      const metrics=await page.evaluate(async()=>{
        const T=await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');
        const {createGreedAbyss}=await import('/greed-abyss3d.js');
        const parent=new T.Group(),a=createGreedAbyss(T,parent,30),skull=parent.getObjectByName('ganancia-colosso');
        if(!skull)throw Error('Colosso ausente');
        const box=new T.Box3().setFromObject(skull),size=box.getSize(new T.Vector3());
        let invalid=0,vertices=0;
        skull.traverse(o=>{if(!o.geometry)return;const {position,normal}=o.geometry.attributes;
          vertices+=position.count;
          for(const attr of [position,normal])for(const value of attr.array)if(!Number.isFinite(value))invalid++;
        });
        a.update(2,.016,new T.PerspectiveCamera(),{player:{x:0,z:0}});
        a.dispose();
        return {size:size.toArray(),maxZ:box.max.z,minY:box.min.y,invalid,vertices,remaining:parent.children.length};
      });
      assert.equal(metrics.invalid,0);assert.equal(metrics.remaining,0);
      assert.ok(metrics.size[0]>54 && metrics.size[1]>45 && metrics.size[2]>30);
      assert.ok(metrics.maxZ < -30); // Geometry stays beyond the walkable arena.
      console.log(hasTouch?'touch':'desktop',metrics);await page.close();
    }
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
