'use strict';
/**
 * Controlled A/B of the production VORGAZHEK lighting preset.
 * Both pages use the exact base/head arena source, current squad GLB, same pose,
 * camera and clock. Water and horizon are sampled separately.
 */
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');

const baselineUrl=process.env.VISUAL_BASELINE_URL;
const branchUrl=process.env.VISUAL_BASE_URL||'http://127.0.0.1:4173';
const output=path.resolve(process.env.VISUAL_OUTPUT||'visual-lab-results','vorgazhek-lighting-ab');
const threeDir=path.dirname(require.resolve('three'));
const localThree=path.join(threeDir,'three.module.js');
const localLoader=path.resolve(threeDir,'../examples/jsm/loaders/GLTFLoader.js');
fs.mkdirSync(output,{recursive:true});
assert.ok(baselineUrl,'VISUAL_BASELINE_URL is required for a controlled A/B');
assert.ok(fs.existsSync(localThree),'local Three.js module missing');
assert.ok(fs.existsSync(localLoader),'local GLTFLoader module missing');

const report={
  ok:false,
  baseSha:process.env.VISUAL_BASE_SHA||null,
  headSha:process.env.VISUAL_BRANCH_SHA||null,
  method:'same preview source, production arena.env, NewBispo2 squad GLB, VG_idle pose, fixed actor positions and clock; compare side and grazing-angle water ROIs',
  proxy:'real current VORGAZHEK squad GLB + neutral 1.8m hero capsule; runtime gameplay capture separately validates the full game',
  baseline:null,
  branch:null,
  comparison:null
};

const rectsOverlap=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;

async function capture(browser,label,baseUrl){
  const context=await browser.newContext({viewport:{width:960,height:540},deviceScaleFactor:1});
  const page=await context.newPage();
  const errors=[],networkFailures=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'&&/shader|WebGL|compile|INVALID/i.test(m.text()))errors.push(m.text());});
  page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))networkFailures.push({status:r.status(),url:r.url()});});
  try{
    await page.route(/^https:\/\/esm\.sh\/three@0\.160\.0(?:\?.*)?$/,r=>r.fulfill({path:localThree,contentType:'text/javascript'}));
    await page.route(/^https:\/\/esm\.sh\/three@0\.160\.0\/examples\/jsm\/loaders\/GLTFLoader\.js(?:\?.*)?$/,r=>r.fulfill({path:localLoader,contentType:'text/javascript'}));
    await page.goto(baseUrl+'/tools/visual-lab/vorgazhek-abyss-preview.html',{waitUntil:'networkidle',timeout:60000});
    await page.waitForFunction(()=>window.ready&&window.abyssQA,null,{timeout:60000});
    const data=await page.evaluate(async()=>{
      const q=window.abyssQA;
      const THREE=await import('three');
      const {GLTFLoader}=await import('https://esm.sh/three@0.160.0/examples/jsm/loaders/GLTFLoader.js');
      const {VG_FILE,vgSynthClips}=await import('/vorgazhek3d.js');
      const {inPlaceClip}=await import('/vhazrael-rig3d.js');
      const env=q.arena.env;
      if(!env||!Array.isArray(env.hemi)||!Array.isArray(env.sun)||!Array.isArray(env.light))throw Error('production arena.env is incomplete');

      // Replace hand-authored preview lights with the exact production preset.
      for(const child of [...q.scene.children])if(child.isLight)q.scene.remove(child);
      q.scene.background=new THREE.Color(env.bg);
      q.scene.fog=new THREE.Fog(env.fog,env.fogNear,env.fogFar);
      q.renderer.toneMappingExposure=env.exposure;
      q.scene.add(new THREE.HemisphereLight(...env.hemi));
      const sun=new THREE.DirectionalLight(...env.sun);
      sun.position.set(14,32,18);
      q.scene.add(sun);
      const point=new THREE.PointLight(env.light[0],env.light[1],env.light[2],1.1);
      point.position.set(...env.light[3]);
      q.scene.add(point);

      // Standardized neutral hero proxy; use the actual default squad rig for VORGAZHEK.
      q.hero.geometry.dispose();
      q.hero.geometry=new THREE.CapsuleGeometry(.32,1.16,6,12);
      q.hero.material.color.set(0xe8e2d0);
      q.hero.position.set(-3,.9,10);
      q.scene.remove(q.boss);
      q.boss.geometry.dispose();
      q.boss.material.dispose();

      const modelPath='/'+VG_FILE.replace(/^\.\//,'').split('?')[0];
      const gltf=await new GLTFLoader().loadAsync(modelPath);
      const model=gltf.scene;
      model.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;o.frustumCulled=false;}});
      const clips=gltf.animations.concat(vgSynthClips(THREE,gltf.animations));
      const idle=clips.find(a=>a.name==='VG_idle');
      if(!idle)throw Error('VG_idle could not be synthesized from the current VORGAZHEK GLB');
      const mixer=new THREE.AnimationMixer(model);
      mixer.clipAction(inPlaceClip(idle)).play();
      mixer.setTime(0);
      model.updateMatrixWorld(true);
      let head=null,foot=null;
      model.traverse(o=>{if(o.isBone&&o.name==='head_end')head=o;if(o.isBone&&o.name==='LeftToes')foot=o;});
      if(!head||!foot)throw Error('current VORGAZHEK rig is missing head_end/LeftToes');
      const hy=head.getWorldPosition(new THREE.Vector3()).y;
      const fy=foot.getWorldPosition(new THREE.Vector3()).y;
      const rawHeight=hy-fy;
      const scale=2.15/Math.max(.2,rawHeight);
      model.scale.setScalar(scale);
      model.position.y=-fy*scale;
      model.updateMatrixWorld(true);
      const bossRoot=new THREE.Group();
      bossRoot.name='A4LightingABRealVorgazhek';
      bossRoot.position.set(-.7,0,7.6);
      bossRoot.add(model);
      q.scene.add(bossRoot);
      window.__a4BossMixer=mixer;
      window.__a4BossModel=model;

      q.cam.fov=56;
      q.cam.updateProjectionMatrix();
      q.cam.position.set(18,3.4,15);
      q.cam.lookAt(-.35,1.1,8.8);
      const metrics=q.frame(2000);
      q.scene.updateMatrixWorld(true);
      q.cam.updateMatrixWorld(true);

      const canvas=document.createElement('canvas');
      canvas.width=q.renderer.domElement.width;
      canvas.height=q.renderer.domElement.height;
      const ctx=canvas.getContext('2d');
      ctx.drawImage(q.renderer.domElement,0,0);
      const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
      function rectFor(object){
        const box=new THREE.Box3().setFromObject(object),pts=[];
        for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
          const p=new THREE.Vector3(x,y,z).project(q.cam);
          if(p.z>=-1&&p.z<=1)pts.push({x:(p.x*.5+.5)*canvas.width,y:(-.5*p.y+.5)*canvas.height});
        }
        if(!pts.length)throw Error('actor projected outside the camera');
        const x0=clamp(Math.floor(Math.min(...pts.map(p=>p.x))-5),0,canvas.width-1);
        const x1=clamp(Math.ceil(Math.max(...pts.map(p=>p.x))+5),x0+1,canvas.width);
        const y0=clamp(Math.floor(Math.min(...pts.map(p=>p.y))-5),0,canvas.height-1);
        const y1=clamp(Math.ceil(Math.max(...pts.map(p=>p.y))+5),y0+1,canvas.height);
        return {x:x0,y:y0,width:x1-x0,height:y1-y0};
      }
      function stats(rect){
        const d=ctx.getImageData(rect.x,rect.y,rect.width,rect.height).data;
        const values=[];
        let sum=0,bright=0;
        for(let i=0;i<d.length;i+=4){
          const l=.2126*d[i]+.7152*d[i+1]+.0722*d[i+2];
          values.push(l);sum+=l;if(l>20)bright++;
        }
        values.sort((a,b)=>a-b);
        return {mean:+(sum/values.length).toFixed(3),p95:+values[Math.floor((values.length-1)*.95)].toFixed(3),visiblePct:+(100*bright/values.length).toFixed(2)};
      }
      const bossRect=rectFor(bossRoot),heroRect=rectFor(q.hero);
      const waterRect={x:40,y:430,width:880,height:100};
      const horizonRect={x:40,y:20,width:880,height:120};
      return {
        env,
        metrics,
        lights:q.scene.children.filter(o=>o.isLight).length,
        model:{source:VG_FILE,rawHeight:+rawHeight.toFixed(4),scaledHeight:2.15,animation:'VG_idle@0'},
        rects:{boss:bossRect,hero:heroRect,water:waterRect,horizon:horizonRect},
        roi:{boss:stats(bossRect),hero:stats(heroRect),water:stats(waterRect),horizon:stats(horizonRect)}
      };
    });
    await page.screenshot({path:path.join(output,label+'-side.png'),timeout:60000});
    const obliqueRoi=await page.evaluate(()=>{
      const q=window.abyssQA;
      q.cam.position.set(12,3.5,18);
      q.cam.lookAt(-.35,1.2,8.8);
      q.frame(2000);
      const canvas=document.createElement('canvas');
      canvas.width=q.renderer.domElement.width;canvas.height=q.renderer.domElement.height;
      const ctx=canvas.getContext('2d');ctx.drawImage(q.renderer.domElement,0,0);
      const stats=rect=>{
        const d=ctx.getImageData(rect.x,rect.y,rect.width,rect.height).data,values=[];
        let sum=0,bright=0;
        for(let i=0;i<d.length;i+=4){const l=.2126*d[i]+.7152*d[i+1]+.0722*d[i+2];values.push(l);sum+=l;if(l>20)bright++;}
        values.sort((a,b)=>a-b);
        return {mean:+(sum/values.length).toFixed(3),p95:+values[Math.floor((values.length-1)*.95)].toFixed(3),visiblePct:+(100*bright/values.length).toFixed(2)};
      };
      return {
        water:stats({x:40,y:430,width:880,height:100}),
        horizon:stats({x:40,y:20,width:880,height:120})
      };
    });
    await page.screenshot({path:path.join(output,label+'-oblique.png'),timeout:60000});
    assert.deepEqual(errors,[]);
    assert.deepEqual(networkFailures,[]);
    return {...data,obliqueRoi,errors,networkFailures};
  }finally{
    await context.close();
  }
}

async function main(){
  const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try{
    report.baseline=await capture(browser,'baseline',baselineUrl);
    report.branch=await capture(browser,'branch',branchUrl);
    const b=report.baseline,h=report.branch;
    assert.equal(b.env.hemi[2],.8,'baseline hemisphere intensity must match main');
    assert.equal(b.env.sun[1],.38,'baseline directional intensity must match main');
    assert.equal(b.env.light[1],1.2,'baseline local fill must match main');
    assert.equal(h.env.hemi[2],1.1,'branch hemisphere intensity must match PR');
    assert.equal(h.env.sun[1],.48,'branch directional intensity must match PR');
    assert.deepEqual(h.env.light,[0xe7e7ec,8,170,[0,8,7]],'branch local fill must match PR');
    assert.equal(b.lights,3);assert.equal(h.lights,3);
    assert.ok(!rectsOverlap(b.rects.boss,b.rects.hero),'baseline boss/hero ROIs must not overlap');
    assert.ok(!rectsOverlap(h.rects.boss,h.rects.hero),'branch boss/hero ROIs must not overlap');
    assert.equal(b.metrics.calls,h.metrics.calls,'draw calls must remain unchanged');
    assert.equal(b.metrics.triangles,h.metrics.triangles,'triangle count must remain unchanged');
    assert.ok(h.roi.boss.mean>b.roi.boss.mean+2,'real VORGAZHEK squad model must gain a meaningful luminance increase');
    assert.ok(h.roi.boss.p95>b.roi.boss.p95+8,'armor highlights must gain a meaningful upper-tail luminance increase');
    assert.ok(h.roi.boss.visiblePct>b.roi.boss.visiblePct+3,'more of the real VORGAZHEK squad model must clear the visible-pixel threshold');
    assert.ok(h.roi.hero.mean>b.roi.hero.mean-.5,'hero proxy must not become darker');
    assert.ok(h.roi.water.mean>=b.roi.water.mean-.5,'side-view water must not become darker');
    assert.ok(h.obliqueRoi.water.mean>b.obliqueRoi.water.mean+.8,'grazing-angle water ROI must gain the camera-aware silver sheen');
    assert.ok(h.obliqueRoi.water.p95>b.obliqueRoi.water.p95+2,'grazing-angle silver highlights must remain visible');
    assert.ok(Math.abs(h.obliqueRoi.horizon.mean-b.obliqueRoi.horizon.mean)<1.5,'black horizon must remain stable');
    report.comparison={
      bossMeanDelta:+(h.roi.boss.mean-b.roi.boss.mean).toFixed(3),
      bossP95Delta:+(h.roi.boss.p95-b.roi.boss.p95).toFixed(3),
      bossVisiblePctDelta:+(h.roi.boss.visiblePct-b.roi.boss.visiblePct).toFixed(2),
      heroMeanDelta:+(h.roi.hero.mean-b.roi.hero.mean).toFixed(3),
      waterMeanDelta:+(h.roi.water.mean-b.roi.water.mean).toFixed(3),
      obliqueWaterMeanDelta:+(h.obliqueRoi.water.mean-b.obliqueRoi.water.mean).toFixed(3),
      obliqueWaterP95Delta:+(h.obliqueRoi.water.p95-b.obliqueRoi.water.p95).toFixed(3),
      obliqueHorizonMeanDelta:+(h.obliqueRoi.horizon.mean-b.obliqueRoi.horizon.mean).toFixed(3),
      drawCallsDelta:h.metrics.calls-b.metrics.calls,
      trianglesDelta:h.metrics.triangles-b.metrics.triangles
    };
    report.ok=true;
  }catch(err){
    report.failure={name:err.name||'Error',message:err.message||String(err)};
    throw err;
  }finally{
    await browser.close();
    fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
  }
  console.log(JSON.stringify({ok:report.ok,baseSha:report.baseSha,headSha:report.headSha,comparison:report.comparison},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
