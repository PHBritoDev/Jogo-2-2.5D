import {FLOW_NOISE,energyMaterial} from './vfx-flow3d.js';
import {volumeTrail} from './vfx-trail3d.js';
import {impactDirector} from './vfx-impact3d.js';
import { softParticles, groundDecals, groundNormal, ribbons, smooth, easeOut, hash } from './celestial-fxkit3d.js';
/**
 * MOD 233 — Ruptura em X (VFX). Duas lâminas de energia 3D (malha com espessura e curvatura, não um sprite) se cruzam
 * num X: núcleo branco-quente, corpo carmesim, bordas magenta e filamentos pretos finos que correm pela lâmina.
 * cast: partículas são puxadas para o centro e as lâminas crescem do cruzamento para as pontas, com clarão ao completar.
 * travel: o X fica de frente para a direção do voo (o plano do X é perpendicular à velocidade, horizontal) com rastro
 * bifurcado saindo das quatro pontas e do núcleo, e faíscas que ficam para trás.
 * impact: dois cortes cruzados se abrem no ponto de contato, ruptura (casca), faíscas direcionais ao longo dos cortes,
 * onda de choque e marca no chão. wall: o mesmo contra o obstáculo, menor. fade: o X perde coesão e se desfaz.
 *
 * MOD 238 — o X da Mod 236 lia como "rabisco" (lâminas planas finas + linhas). Agora cada lâmina é um CRESCENTE
 * VOLUMÉTRICO: seção elíptica varrida ao longo de um arco curvado para trás, grossa no meio e afiada nas pontas, com
 * corpo de energia carmesim (material da VFX Engine 2.0, legível de qualquer ângulo, inclusive de lado) e núcleo
 * incandescente por dentro. Rastros volumétricos saem do cruzamento e das pontas; sem linhas finas soltas.
 */
const BLADE_VERT = `varying vec2 vUv; varying vec3 vN; varying vec3 vV; uniform float time; void main(){ vUv=uv;vec3 p=position;p.z+=sin(p.x*19.-time*14.)*.035*(1.-abs(p.x));p.y+=sin(p.x*23.+time*11.)*.018;vec4 w=modelMatrix*vec4(p,1.); vN=normalize(mat3(modelMatrix)*normal); vV=normalize(cameraPosition-w.xyz); gl_Position=projectionMatrix*viewMatrix*w; }`;
const BLADE_FRAG = `varying vec2 vUv; varying vec3 vN; varying vec3 vV; uniform float time, alpha, grow, seed, detail;
${FLOW_NOISE}
void main(){
 float x=abs(vUv.x*2.-1.); if(x>grow) discard;                      // cresce do cruzamento para as pontas
 float y=abs(vUv.y*2.-1.), w=1.-x*x;                                   // perfil: grosso no meio, afiado nas pontas
 if(y>w) discard;
 float e=y/max(w,.001);
 float core=exp(-e*e*28.)*(1.-x*.5);                                   // filete branco-quente
 float flow=flowNoise(vec2(vUv.x*14.,vUv.y*3.+seed),time*1.8,detail), flow2=flowNoise(vec2(vUv.x*31.,vUv.y*7.+seed),-time,detail);
 float fil=smoothstep(.06,.0,abs(flow-.5)-.02)*smoothstep(.15,.6,e);  // filamentos pretos finos
 vec3 crimson=vec3(.85,.02,.08), magenta=vec3(1.,.2,.55);
 vec3 c=mix(crimson,magenta,smoothstep(.45,1.,e)+flow2*.25);
 c=mix(c,vec3(1.,.93,.9),core); c*=.9+.25*flow;
 c=mix(c,vec3(.02,0.,.02),fil*.85);
 float rim=pow(1.-abs(dot(normalize(vN),vV)),2.)*.4;
 float a=alpha*(smoothstep(1.,.75,e)*.9+core)*(1.-smoothstep(grow-.08,grow,x)*.6);
 gl_FragColor=vec4((c+rim)*a,a);
}`;
/** Lâmina: faixa ao longo de X (−1..1), largura em Y, levemente arqueada para trás em Z e com espessura (duas faces). */
function bladeGeometry(T) {
  const nx=32,ny=6,pos=[],uv=[],idx=[];
  for(const side of [1,-1])for(let i=0;i<=nx;i++)for(let j=0;j<=ny;j++){
   const u=i/nx,x=u*2-1,v=j/ny*2-1,w=1-x*x;pos.push(x,v*.23*w,-x*x*.22+side*.17*w*(1-v*v));uv.push(u,j/ny);
  }
  for(let face=0;face<2;face++)for(let i=0;i<nx;i++)for(let j=0;j<ny;j++){const a=face*(nx+1)*(ny+1)+i*(ny+1)+j,b=a+ny+1;idx.push(a,b,a+1,a+1,b,b+1);}

  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}

/** Crescente volumétrico ao longo de X (−1..1): seção elíptica (largura em Y, espessura em Z) que afina nas pontas. */
function slashGeometry(T, { nx = 36, ns = 12 } = {}) {
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= nx; i++) { const u = i / nx, x = u * 2 - 1, k = Math.pow(Math.max(0, 1 - x * x), .75), cz = -x * x * .38;
    for (let j = 0; j <= ns; j++) { const a = j / ns * Math.PI * 2; pos.push(x, Math.cos(a) * .17 * k, cz + Math.sin(a) * .11 * k - .03 * k); uv.push(u, j / ns);
      if (i < nx && j < ns) { const p = i * (ns + 1) + j, q = p + ns + 1; idx.push(p, q, p + 1, p + 1, q, q + 1); } } }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
const CORE_FRAG = `varying vec3 vN; varying vec3 vV; uniform float alpha; void main(){ float f=abs(dot(normalize(vN),normalize(vV))); float a=alpha*pow(f,1.5); vec3 c=mix(vec3(1.,.25,.45),vec3(1.,.96,.92),pow(f,3.)); gl_FragColor=vec4(c*a,a); }`;
const CORE_VERT = `varying vec3 vN; varying vec3 vV; void main(){ vec4 w=modelMatrix*vec4(position,1.); vN=normalize(mat3(modelMatrix)*normal); vV=cameraPosition-w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
export function createXRuptureVFX(T, scene, { ground = () => 0 } = {}) {
  const root = new T.Group(); root.name = 'RupturaEmX'; root.visible = false; scene.add(root);
  const geo = bladeGeometry(T);
  const mk = seed => new T.ShaderMaterial({ vertexShader: BLADE_VERT, fragmentShader: BLADE_FRAG, transparent: true, depthWrite: false, side: T.DoubleSide, toneMapped: false, fog: false,
    blending: T.CustomBlending, blendSrc: T.OneFactor, blendDst: T.OneMinusSrcAlphaFactor, uniforms: { time: { value: 0 }, alpha: { value: 1 }, grow: { value: 1 }, seed: { value: seed }, detail:{value:1} } });
  const X = new T.Group(); root.add(X);
  // cada lâmina: grupo inclinado ±45° com corpo volumétrico (energia carmesim) + núcleo incandescente + filete (shader antigo)
  const sgeo = slashGeometry(T), coreMat = () => new T.ShaderMaterial({ vertexShader: CORE_VERT, fragmentShader: CORE_FRAG, transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false, fog: false, uniforms: { alpha: { value: 1 } } });
  const makeSlash = (parent, i, seed) => { const g = new T.Group(); g.rotation.z = i ? -Math.PI / 4 : Math.PI / 4; parent.add(g);
    const bm = energyMaterial(T, 'crimson', { alpha: .97, warp: .025, seed, frequency: 2.2 }); bm.uniforms.deep.value.setRGB(.06, 0, .012); bm.uniforms.body.value.setRGB(.62, .0, .05); bm.uniforms.hot.value.setRGB(1, .18, .28);
    const body = new T.Mesh(sgeo, bm), core = new T.Mesh(sgeo, coreMat()), edge = new T.Mesh(geo, mk(seed));
    core.scale.set(.97, .55, .55); edge.scale.set(1, 1.05, 1); g.add(body, core, edge); for (const m of [body, core, edge]) m.frustumCulled = false;
    return { g, body, core, edge, material: edge.material }; };
  const blades = [0, 1].map(i => makeSlash(X, i, i + 1));
  const cutGroup0 = new T.Group(); root.add(cutGroup0);
  const cutSl = [0, 1].map(i => makeSlash(cutGroup0, i, 5 + i * 4)), cutMats = cutSl.map(c => c.material), cuts = cutSl.map(c => c.g);
  const cutGroup = cutGroup0;
  const glow = softParticles(T, 180), decals = groundDecals(T, 6), rib = ribbons(T, 900, { flow: 22 }); root.add(glow.mesh, decals.mesh, rib.mesh);
  const impacts=impactDirector(T,root,ground,{capacity:2}),volume=volumeTrail(T,root,'crimson',{radius:.6,life:.45}),tipTrails=[0,1].map(()=>volumeTrail(T,root,'crimson',{radius:.32,life:.35,capacity:24}));
  const arcGeo=new T.BufferGeometry(),arcPos=new Float32Array(80*6);arcGeo.setAttribute('position',new T.BufferAttribute(arcPos,3));const arcMat=new T.LineBasicMaterial({color:0x050008}),arcs=new T.LineSegments(arcGeo,arcMat);arcs.frustumCulled=false;arcs.visible=false;// MOD 238: sem linhas soltas

  const HN = 26, hist = Array.from({ length: HN }, () => ({ x: 0, y: 0, z: 0, t: -9 })); let hi = 0, lastT = -1;
  const q = new T.Quaternion(), fwd = new T.Vector3(), tip = new T.Vector3(), nrm = [0, 1, 0], UP = new T.Vector3(0, 1, 0), m4 = new T.Matrix4(), side = new T.Vector3(), upv = new T.Vector3();
  const CR = [1, .1, .2, 1], MG = [1, .35, .7, 1], WH = [1, .95, .92, 1], c4 = (c, a) => [c[0], c[1], c[2], a];
  function orient(obj, dx, dz) { fwd.set(dx, 0, dz).normalize(); side.crossVectors(UP, fwd).normalize(); upv.crossVectors(fwd, side); m4.makeBasis(side, upv, fwd); q.setFromRotationMatrix(m4); obj.quaternion.copy(q); }
  function update(s, camera, quality = 1) {
    root.visible = s.active; if (!s.active) { lastT = -1;volume.clear();for(const v of tipTrails)v.clear();impacts.clear();return; }
    const t = s.time, A = s.age, ph = s.phase, low = quality === 0;
    for (const m of [...blades.map(b => b.material), ...cutMats]) m.uniforms.time.value = t;
    for(const m of [...blades.map(b=>b.material),...cutMats])m.uniforms.detail.value=quality===0?.65:1;
    rib.begin(camera, t); glow.begin(); decals.begin();if(t<lastT){volume.clear();impacts.clear();}
    // ---- o X
    X.visible = ph === 'cast' || ph === 'travel' || ph==='impact' || (ph === 'fade' && A < .6);
    X.position.set(s.p.x, s.p.y, s.p.z); orient(X, s.dir.x, s.dir.z);
    const grow = ph === 'cast' ? easeOut((A - .12) / .28) : 1, fade = ph === 'fade' ? 1 - A / .6 : 1, pulse = 1 + .04 * Math.sin(t * 40);
    for (const [i,b] of blades.entries()) { const gk = Math.max(.02,ph==='cast'?easeOut((A-.08-i*.12)/.25):1); b.material.uniforms.grow.value = gk; b.material.uniforms.alpha.value = fade*.8; const sc = 3.7 * pulse * (ph === 'fade' ? 1 + A * .6 : 1); b.g.scale.set(sc * gk, sc * (.6 + .4 * gk), sc);
      b.body.material.uniforms.time.value = t; b.body.material.uniforms.alpha.value = .95 * fade; b.body.material.uniforms.dissolve.value = ph === 'fade' ? A / .6 * .9 : 0; b.body.material.uniforms.detail.value = low ? .65 : 1; b.core.material.uniforms.alpha.value = fade * (ph === 'cast' ? gk : 1); }
    if (ph === 'cast') { // energia sugada para o centro
      const n = low ? 24 : quality===1?40:60;
      for (let i = 0; i < n; i++) { const u = ((i / n) + A * 2.2) % 1, a = i * 2.39996, r = (1 - u) * 2.4, y = Math.sin(i * 1.7) * (1 - u) * 1.4;
        glow.add(s.p.x + Math.cos(a) * r, s.p.y + y, s.p.z + Math.sin(a) * r, .07, .32, 1, .25 + .3 * u, .45, u, 3, a + Math.PI / 2, i); }
      glow.add(s.p.x, s.p.y, s.p.z, .6 + 1.6 * grow, .6 + 1.6 * grow, 1, .3, .5, .7, 0);
      if (A > .38) { const k = 1 - (A - .38) / .07; glow.add(s.p.x, s.p.y, s.p.z, 4 * Math.max(0, k), 4 * Math.max(0, k), 1, .85, .9, Math.max(0, k), 2, 0); }
    }
    if (X.visible) {
      glow.add(s.p.x, s.p.y, s.p.z, 1.4, 1.4, 1, .25, .45, .55 * fade, 0);
      glow.add(s.p.x, s.p.y, s.p.z, .45, .45, 1, .95, .95, .9 * fade, 0);
    }
    // ---- rastro bifurcado (quatro pontas + núcleo), só no voo
    if (ph === 'travel' || ph==='impact' || ph === 'fade') {
      if (t !== lastT) { hi = (hi + 1) % HN; Object.assign(hist[hi], { x: s.p.x, y: s.p.y, z: s.p.z, t }); lastT = t; }
      for (let k = 0; k < HN - 1; k++) {
        const a = hist[(hi - k + HN) % HN], b = hist[(hi - k - 1 + HN) % HN]; if (b.t < 0 || t - b.t > .32) break;
        const fa = 1 - (t - a.t) / .32, fb = 1 - (t - b.t) / .32;
        rib.seg(a.x, a.y, a.z, b.x, b.y, b.z, .5 * fa, .5 * fb, c4(WH, fa * fade * .8), c4(CR, fb * .7 * fade), k / 12, (k + 1) / 12);
      }
      // rastros volumétricos das duas pontas superiores do X (seguem a lâmina de verdade)
      [[1, 1], [-1, 1]].forEach(([sx, sy], i) => { tip.set(sx * 2.2 * .707, sy * 2.2 * .707, -.6).applyQuaternion(X.quaternion).add(X.position); tipTrails[i].update(t, tip, ph === 'travel', quality); });
      for (let i = 0; i < (low ? 6 : 16); i++) { const age = (t * 3 + hash(i)) % 1, k = 1 - age, back = age * 2.6;
        glow.add(s.p.x - s.dir.x * back + (hash(i * 3) - .5) * .9 * age, s.p.y + (hash(i * 7) - .5) * .9 * age, s.p.z - s.dir.z * back + (hash(i * 5) - .5) * .9 * age, .05, .28, 1, .3, .5, k * fade, 3, Math.atan2(s.dir.x, s.dir.z) + Math.PI / 2, i); }
    }
    // ---- impacto: dois cortes cruzados no ponto de contato, ruptura e faíscas direcionais
    cutGroup.visible = false;
    const impactAge=s.hitAtTime<0?-1:t-s.hitAtTime;
    if (impactAge>=0&&impactAge<1.8) {
      const A=impactAge;
      const sc = ph === 'wall' ? .75 : 1, P = s.at; cutGroup.visible = true; cutGroup.position.set(P.x, P.y, P.z); orient(cutGroup, s.dir.x, s.dir.z);
      const open = easeOut(A / .12), out = 1 - smooth((A - .25) / .45);
      cutSl.forEach((c, i) => { c.g.scale.set(3.6 * sc * (.25 + .9 * open), 2.2 * sc * (1 + A * .8), 2.2 * sc); c.material.uniforms.grow.value = Math.max(.02, open); c.material.uniforms.alpha.value = out; c.body.material.uniforms.time.value = t; c.body.material.uniforms.alpha.value = out; c.body.material.uniforms.dissolve.value = smooth((A - .2) / .6) * .9; c.core.material.uniforms.alpha.value = out * (1 - smooth(A / .35)); });
      if (A < .5) { glow.add(P.x, P.y, P.z, 5 * sc * (1 - A), 5 * sc * (1 - A), 1, .3, .45, .7 * (1 - A * 2), 0); const gy = ground(P.x, P.z); if (P.y - gy < 2.5) { groundNormal(ground, P.x, P.z, nrm); decals.add(P.x, gy, P.z, (1.5 + easeOut(A / .5) * 5) * sc, 1, .25, .4, 1 - A * 2, 0, A * 2, 7, nrm); } }
      const nS = low ? 18 : quality===1?30:46;
      for (let i = 0; i < nS && A < .6; i++) { // faíscas saindo ao longo das duas diagonais do X e de volta pelo caminho
        const diag = i % 2 ? 1 : -1, along = (i % 4 < 2 ? 1 : -1), sp = (5 + hash(i) * 7) * sc, d = sp * A;
        tip.set(along * .707, diag * .707, -(hash(i * 3) * .6)).applyQuaternion(cutGroup.quaternion);
        glow.add(P.x + tip.x * d, P.y + tip.y * d - 4 * A * A, P.z + tip.z * d, .06, .45, 1, .4 + .4 * hash(i + 9), .6, 1 - A / .6, 3, Math.atan2(tip.y, tip.x) + Math.PI / 2, i);
      }
      impacts.emit({id:'x'+s.hitAtTime,time:s.hitAtTime,point:P,size:3.8,preset:'crimson',kind:'x',dir:{x:s.dir.x,y:0,z:s.dir.z}});
    }
    let ac=0;for(let branch=0;branch<4;branch++){let px=0,py=0,pz=0;for(let j=1;j<=12;j++){const u=j/12,a=branch*Math.PI/2+Math.PI/4,r=u*3.5,x=Math.cos(a)*r+Math.sin(j*3+t*16+branch)*.13,y=Math.sin(a)*r+Math.cos(j*4+t*13)*.14,z=.25+Math.sin(u*8+t*6)*.2;arcPos.set([px,py,pz,x,y,z],ac++*6);px=x;py=y;pz=z;}}arcGeo.setDrawRange(0,ac*2);arcGeo.attributes.position.needsUpdate=true;
    if (ph === 'fade') for (let i = 0; i < (low ? 14 : quality===1?24:34); i++) { const a = i * 2.4, r = A * (2 + hash(i) * 2); glow.add(s.p.x + Math.cos(a) * r, s.p.y + Math.sin(a * 1.3) * r * .6, s.p.z + Math.sin(a) * r, .05, .25, 1, .3, .55, 1 - A / .6, 3, a, i); }
    volume.update(t,s.p,ph==='travel'||ph==='impact',quality);impacts.update(t,quality);rib.end(); glow.end(); decals.end(t);
  }
  return { root, update, clear() { root.visible = false; lastT = -1;volume.clear();impacts.clear(); for (const h of hist) h.t = -9; },
    dispose() { scene.remove(root);volume.dispose();for(const v of tipTrails)v.dispose();sgeo.dispose();impacts.dispose();arcGeo.dispose();arcMat.dispose(); geo.dispose(); for (const b of blades) b.material.dispose(); for (const m of cutMats) m.dispose(); glow.dispose(); decals.dispose(); rib.dispose(); } };
}
