/**
 * Eldória — assa os impostores (LOD2) das 5 espécies a partir do LOD0 do próprio GLB (Mod 292).
 * Para cada espécie, 3 vistas ortográficas (frente +Z, lado +X, topo +Y) em células de 256 px de um atlas 1024²:
 *   impostor.png        cor (albedo × AO dos vértices), SEM luz: o jogo ilumina com o ciclo de dia/noite;
 *   impostor-normal.png normais no referencial da câmera = espaço tangente do plano (impostor com normal map);
 *   impostor.json       células e enquadramentos (tamanho, centro, topo) usados por build-trees.mjs.
 * Uso: node bake-impostors.mjs <url-do-glb-no-servidor-local> <pasta-build>   (servidor em http://localhost:8245)
 * Requer playwright-core + three@0.160 locais (o CDN é atendido por rota).
 */
import { chromium } from 'playwright-core'; import fs from 'fs'; import path from 'path';
const [glbUrl, dir = 'build', threeDir = '/tmp/claude-0/tools/node_modules/three', port = '8245'] = process.argv.slice(2);
const html = `<!doctype html><html><body style="margin:0;background:#000"><script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"}}</script>
<script type="module">import * as THREE from 'three';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const CELL=256,RS=512,r=new THREE.WebGLRenderer({antialias:false,alpha:true,preserveDrawingBuffer:true});r.setSize(RS,RS);r.setPixelRatio(1);r.outputColorSpace=THREE.SRGBColorSpace;r.setClearColor(0,0);
const atlas=[document.createElement('canvas'),document.createElement('canvas')];for(const c of atlas){c.width=c.height=1024;}
const ctx=atlas.map(c=>c.getContext('2d'));
const normalPass=map=>{const m=new THREE.MeshLambertMaterial({map,alphaTest:.5,side:THREE.DoubleSide});m.onBeforeCompile=sh=>{sh.fragmentShader=sh.fragmentShader.replace('#include <normal_fragment_begin>',THREE.ShaderChunk.normal_fragment_begin.replace('normal *= faceDirection;','')).replace('#include <dithering_fragment>','gl_FragColor=vec4(normalize(normal)*.5+.5,1.0);');};m.customProgramCacheKey=()=>'impN';return m;};
const noFlip=m=>{m.onBeforeCompile=sh=>{sh.fragmentShader=sh.fragmentShader.replace('#include <normal_fragment_begin>',THREE.ShaderChunk.normal_fragment_begin.replace('normal *= faceDirection;',''));};m.customProgramCacheKey=()=>'nf'+m.type;return m;};
new GLTFLoader().load('${glbUrl}',gl=>{
 const nodes={};for(const n of gl.scene.children)if(n.userData.lod===0)nodes[n.userData.especie]=n;
 const ids=Object.keys(nodes),cells={},frames={};let k=0;
 for(const id of ids){
  const n=nodes[id],meta=n.userData,src=n.clone(true);src.position.set(0,0,0);src.updateMatrixWorld(true);
  const b=meta.bounds,ext=[b.max[0]-b.min[0],b.max[1]-b.min[1],b.max[2]-b.min[2]];
  const S=Math.max(ext[1],ext[0],ext[2])*1.04,cy=(b.max[1]+b.min[1])/2,T=Math.max(ext[0],ext[2])*1.04,cx=(b.max[0]+b.min[0])/2,cz=(b.max[2]+b.min[2])/2;
  frames[id]={size:+S.toFixed(3),cy:+cy.toFixed(3),top:+T.toFixed(3),topY:meta.crownY,cx:+cx.toFixed(3),cz:+cz.toFixed(3)};
  const views={front:{pos:[0,cy,60],up:[0,1,0],half:S/2,c:[0,cy,0]},side:{pos:[60,cy,0],up:[0,1,0],half:S/2,c:[0,cy,0]},top:{pos:[0,80,0],up:[0,0,-1],half:T/2,c:[0,0,0]}};
  cells[id]={};
  for(const [vn,v] of Object.entries(views)){
   const cx0=(k%4)*CELL,cy0=Math.floor(k/4)*CELL;k++;
   cells[id][vn]=[(cx0+1)/1024,(cy0+1)/1024,(cx0+CELL-1)/1024,(cy0+CELL-1)/1024];
   const cam=new THREE.OrthographicCamera(-v.half,v.half,v.half,-v.half,.1,200);cam.position.set(...v.pos);cam.up.set(...v.up);cam.lookAt(...v.c);
   for(let pass=0;pass<2;pass++){
    const sc=new THREE.Scene(),m=src.clone(true);
    m.traverse(o=>{if(o.isMesh){const om=o.material;o.material=pass===0?new THREE.MeshBasicMaterial({map:om.map,vertexColors:true,alphaTest:.5,side:THREE.DoubleSide}):normalPass(om.map);}});
    sc.add(m);r.setClearColor(0,0);r.render(sc,cam);
    ctx[pass].imageSmoothingEnabled=true;ctx[pass].imageSmoothingQuality='high';ctx[pass].drawImage(r.domElement,0,0,RS,RS,cx0,cy0,CELL,CELL);
   }
  }
 }
 window.out={cells,frames,albedo:atlas[0].toDataURL('image/png'),normal:atlas[1].toDataURL('image/png')};window.done=1;
});</script></body></html>`;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 600, height: 600 } }); p.on('pageerror', e => console.log('PE', e.message));
await p.route(/cdn\.jsdelivr\.net\/npm\/three@0\.160\.0\/(.*)/, async r => { const rel = r.request().url().split('three@0.160.0/')[1].split('?')[0]; await r.fulfill({ path: path.join(threeDir, rel), contentType: 'text/javascript' }); });
await p.route(`http://localhost:${port}/__bake.html`, r => r.fulfill({ body: html, contentType: 'text/html' }));
await p.goto(`http://localhost:${port}/__bake.html`); await p.waitForFunction(() => window.done, null, { timeout: 180000 });
const o = await p.evaluate(() => window.out); await b.close();
fs.writeFileSync(path.join(dir, 'impostor-raw.png'), Buffer.from(o.albedo.split(',')[1], 'base64'));
fs.writeFileSync(path.join(dir, 'impostor-normal-raw.png'), Buffer.from(o.normal.split(',')[1], 'base64'));
fs.writeFileSync(path.join(dir, 'impostor.json'), JSON.stringify({ cells: o.cells, frames: o.frames }, null, 1));
console.log(JSON.stringify(o.frames));
