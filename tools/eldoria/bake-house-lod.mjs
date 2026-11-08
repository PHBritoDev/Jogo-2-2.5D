/**
 * MOD 292 — LOD1 das casas COM TEXTURA PRÓPRIA (sem reaproveitar material do LOD0, sem reassociação nenhuma).
 *
 * Por que: o atlas assado das casas tem costura de UV em quase todo vértice; simplificar preservando costuras só
 * tira 15–31 % dos triângulos, e soldar as costuras (Mod 291) borrava a UV (cor errada ao longe). Aqui o LOD1 é
 * uma malha simplificada (≈16 %) que recebe UV NOVA por projeção ortográfica em 5 direções (±X, ±Z, topo), e a
 * textura dessa UV é ASSADA do próprio modelo completo (renders sem luz, só albedo). Perto o jogo usa o LOD0
 * original; longe, esta malha com a sua própria textura — mesmas cores, ~6× menos triângulos.
 *
 * Uso (fora do repositório; playwright-core + three@0.160 locais e servidor estático na raiz do repo):
 *   node bake-house-lod.mjs <raiz-do-repo> <pasta-tmp> CasaEldoria01 CasaEldoria02 ...
 * Gera <Nome>-lod1.glb (malha + textura JPEG 1024², material próprio "LOD1_<Nome>").
 */
import fs from 'fs'; import path from 'path';
import { chromium } from 'playwright-core';
import { NodeIO, Document } from '@gltf-transform/core';
import { MeshoptSimplifier } from 'meshoptimizer';
import { execFileSync } from 'child_process';

const [root = '.', tmp = '/tmp/bake-house', ...names] = process.argv.slice(2);
fs.mkdirSync(tmp, { recursive: true });
await MeshoptSimplifier.ready;
const io = new NodeIO();
// direções de projeção: [nome, eixo da normal, vetor "direita" R, vetor "cima" U, posição da câmera]
const VIEWS = [
  ['px', [1, 0, 0], [0, 0, -1], [0, 1, 0]], ['nx', [-1, 0, 0], [0, 0, 1], [0, 1, 0]],
  ['pz', [0, 0, 1], [1, 0, 0], [0, 1, 0]], ['nz', [0, 0, -1], [-1, 0, 0], [0, 1, 0]],
  ['py', [0, 1, 0], [1, 0, 0], [0, 0, -1]],
];
const CELLS = { px: [0, 0], nx: [1, 0], pz: [2, 0], nz: [0, 1], py: [1, 1] }; // grade 3×2 no atlas
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

for (const name of names) {
  const doc = await io.read(path.join(root, name + '.glb'));
  // 1) malha completa no espaço do modelo (aplica a matriz do nó)
  const P = [], I = [];
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh(); if (!mesh) continue; const W = node.getWorldMatrix();
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION'), idx = prim.getIndices(), base = P.length / 3, v = [0, 0, 0];
      for (let i = 0; i < pos.getCount(); i++) { pos.getElement(i, v); P.push(W[0] * v[0] + W[4] * v[1] + W[8] * v[2] + W[12], W[1] * v[0] + W[5] * v[1] + W[9] * v[2] + W[13], W[2] * v[0] + W[6] * v[1] + W[10] * v[2] + W[14]); }
      for (const k of idx.getArray()) I.push(base + k);
    }
  }
  // 2) simplificação com solda por posição (a UV antiga não importa: vamos assar uma nova)
  const key = new Map(), wpos = [], wid = new Uint32Array(P.length / 3);
  for (let i = 0; i < P.length / 3; i++) { const k = Math.round(P[i * 3] * 1e4) + ',' + Math.round(P[i * 3 + 1] * 1e4) + ',' + Math.round(P[i * 3 + 2] * 1e4); let w = key.get(k); if (w === undefined) { w = wpos.length / 3; key.set(k, w); wpos.push(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); } wid[i] = w; }
  const WI = new Uint32Array(I.map(i => wid[i])), WP = new Float32Array(wpos);
  const [S] = MeshoptSimplifier.simplify(WI, WP, 3, Math.floor(WI.length * .16 / 3) * 3, .015, []);
  // caixa do modelo
  const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9]; for (let i = 0; i < WP.length; i += 3) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], WP[i + k]); mx[k] = Math.max(mx[k], WP[i + k]); }
  const corners = []; for (const x of [mn[0], mx[0]]) for (const y of [mn[1], mx[1]]) for (const z of [mn[2], mx[2]]) corners.push([x, y, z]);
  const frames = {}; for (const [n, , R, U] of VIEWS) { const rs = corners.map(c => dot(c, R)), us = corners.map(c => dot(c, U)), pad = .01; frames[n] = { r0: Math.min(...rs) - pad, r1: Math.max(...rs) + pad, u0: Math.min(...us) - pad, u1: Math.max(...us) + pad }; }
  // 3) cada triângulo vai para a direção de projeção mais alinhada à sua normal (faces para baixo: lateral mais próxima)
  const out = { pos: [], nrm: [], uv: [], idx: [] }, vmap = new Map();
  for (let t = 0; t < S.length; t += 3) {
    const a = S[t], b = S[t + 1], c = S[t + 2], A = [WP[a * 3], WP[a * 3 + 1], WP[a * 3 + 2]], B = [WP[b * 3], WP[b * 3 + 1], WP[b * 3 + 2]], C = [WP[c * 3], WP[c * 3 + 1], WP[c * 3 + 2]];
    const e1 = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], e2 = [C[0] - A[0], C[1] - A[1], C[2] - A[2]], n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]], nl = Math.hypot(...n) || 1;
    const N = n.map(v => v / nl); let best = null, bd = -2;
    for (const V of VIEWS) { const d = dot(N, V[1]); if (d > bd) { bd = d; best = V; } }
    const [vn, , R, U] = best, f = frames[vn], [cx, cy] = CELLS[vn];
    for (const [vi, p] of [[a, A], [b, B], [c, C]]) {
      const k = vn + ':' + vi; let id = vmap.get(k);
      if (id === undefined) {
        id = out.pos.length / 3; vmap.set(k, id); out.pos.push(...p); out.nrm.push(...N);
        const u = (dot(p, R) - f.r0) / (f.r1 - f.r0), v = (f.u1 - dot(p, U)) / (f.u1 - f.u0);
        out.uv.push((cx + .015 + u * .97) / 3, (cy + .015 + v * .97) / 2);
      } else { const o = id * 3; out.nrm[o] += N[0]; out.nrm[o + 1] += N[1]; out.nrm[o + 2] += N[2]; }
      out.idx.push(id);
    }
  }
  for (let i = 0; i < out.nrm.length; i += 3) { const l = Math.hypot(out.nrm[i], out.nrm[i + 1], out.nrm[i + 2]) || 1; out.nrm[i] /= l; out.nrm[i + 1] /= l; out.nrm[i + 2] /= l; }
  fs.writeFileSync(path.join(tmp, name + '-frames.json'), JSON.stringify({ frames, views: VIEWS, cells: CELLS }));
  // 4) assar as 5 vistas ortográficas sem luz no navegador
  const html = `<!doctype html><html><body style="margin:0"><script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"}}</script>
<script type="module">import * as THREE from 'three';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const F=${JSON.stringify({ frames, views: VIEWS, cells: CELLS })},CW=1024/3,CH=512,r=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});r.setPixelRatio(1);r.outputColorSpace=THREE.SRGBColorSpace;r.setClearColor(0,0);
const atlas=document.createElement('canvas');atlas.width=1024;atlas.height=1024;const g=atlas.getContext('2d');
new GLTFLoader().load('./${name}.glb',gl=>{gl.scene.traverse(o=>{if(o.isMesh){const m=o.material;o.material=new THREE.MeshBasicMaterial({map:m.map,color:m.color,side:THREE.DoubleSide});}});const sc=new THREE.Scene();sc.add(gl.scene);
 for(const [n,N,R,U] of F.views){const f=F.frames[n],w=f.r1-f.r0,h=f.u1-f.u0,W=Math.round(CW*2),H=Math.round(CH*2);r.setSize(W,H);
  const cam=new THREE.OrthographicCamera(-w/2,w/2,h/2,-h/2,.01,100);const cR=(f.r0+f.r1)/2,cU=(f.u0+f.u1)/2;
  const ctr=new THREE.Vector3().addScaledVector(new THREE.Vector3(...R),cR).addScaledVector(new THREE.Vector3(...U),cU);cam.position.copy(ctr).addScaledVector(new THREE.Vector3(...N),20);cam.up.set(...U);cam.lookAt(ctr);cam.updateProjectionMatrix();
  r.render(sc,cam);const [cx,cy]=F.cells[n];g.drawImage(r.domElement,0,0,W,H,cx*CW+.015*CW,cy*CH+.015*CH,CW*.97,CH*.97);}
 window.out=atlas.toDataURL('image/png');window.done=1;});</script></body></html>`;
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await br.newPage(); await pg.route(/cdn\.jsdelivr\.net\/npm\/three@0\.160\.0\/(.*)/, async r => { const rel = r.request().url().split('three@0.160.0/')[1].split('?')[0]; await r.fulfill({ path: path.join('/tmp/claude-0/tools/node_modules/three', rel), contentType: 'text/javascript' }); });
  await pg.route('http://localhost:8245/__bh.html', r => r.fulfill({ body: html, contentType: 'text/html' }));
  await pg.goto('http://localhost:8245/__bh.html'); await pg.waitForFunction(() => window.done, null, { timeout: 120000 });
  const png = Buffer.from((await pg.evaluate(() => window.out)).split(',')[1], 'base64'); await br.close();
  fs.writeFileSync(path.join(tmp, name + '-atlas-raw.png'), png);
  fs.writeFileSync(path.join(tmp, name + '-geo.json'), JSON.stringify({ tris: out.idx.length / 3, src: I.length / 3 }));
  fs.writeFileSync(path.join(tmp, name + '-geo.bin'), Buffer.from(new Float32Array([...out.pos, ...out.nrm, ...out.uv]).buffer));
  fs.writeFileSync(path.join(tmp, name + '-idx.bin'), Buffer.from(new Uint32Array(out.idx).buffer));
  // 5) sangria da cor para fora das silhuetas (sem halo no mipmap) e JPEG
  const jpg = path.join(tmp, name + '-atlas.jpg');
  execFileSync('python3', ['-I', '-c', `
import sys, numpy as np
from PIL import Image, ImageFilter
im=Image.open(sys.argv[1]).convert('RGBA');a=np.array(im).astype(np.float32);al=a[...,3:4]/255;have=al[...,0]>.5;cur=a[...,:3].copy()
for r in (1,2,4,8,16,32):
  w=np.array(Image.fromarray((have*255).astype(np.uint8)).filter(ImageFilter.BoxBlur(r)),dtype=np.float32)/255
  c=np.stack([np.array(Image.fromarray((cur[...,k]*have).astype(np.uint8)).filter(ImageFilter.BoxBlur(r)),dtype=np.float32) for k in range(3)],-1)
  grow=(~have)&(w>.01);cur[grow]=(c/np.maximum(w,1e-3)[...,None])[grow];have=have|grow
Image.fromarray(np.clip(cur,0,255).astype(np.uint8)).save(sys.argv[2],quality=86)`, path.join(tmp, name + '-atlas-raw.png'), jpg]);
  // 6) GLB do LOD1 com material próprio
  const d2 = new Document(), buf = d2.createBuffer(), acc = (t, a) => d2.createAccessor().setType(t).setArray(a).setBuffer(buf);
  const tex = d2.createTexture('lod1-' + name).setImage(fs.readFileSync(jpg)).setMimeType('image/jpeg');
  const mat = d2.createMaterial('LOD1_' + name).setBaseColorTexture(tex).setRoughnessFactor(.95).setMetallicFactor(0);
  const prim = d2.createPrimitive().setMaterial(mat).setAttribute('POSITION', acc('VEC3', new Float32Array(out.pos))).setAttribute('NORMAL', acc('VEC3', new Float32Array(out.nrm)))
    .setAttribute('TEXCOORD_0', acc('VEC2', new Float32Array(out.uv))).setIndices(acc('SCALAR', out.pos.length / 3 > 65535 ? new Uint32Array(out.idx) : new Uint16Array(out.idx)));
  const node = d2.createNode(name + '_LOD1').setMesh(d2.createMesh(name + '_LOD1').addPrimitive(prim)); d2.createScene().addChild(node);
  node.setExtras({ lod: 1, fonte: name + '.glb', metodo: 'projeção ortográfica em 5 vistas do modelo completo (albedo sem luz)', triangulosLOD0: I.length / 3 });
  await io.write(path.join(root, name + '-lod1.glb'), d2);
  console.log(name, 'tri', I.length / 3, '->', out.idx.length / 3, 'verts', out.pos.length / 3, 'kb', Math.round(fs.statSync(path.join(root, name + '-lod1.glb')).size / 1024));
}
