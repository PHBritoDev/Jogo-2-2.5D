import { softParticles, groundDecals, groundNormal, ribbons, smooth, easeOut, hash } from './celestial-fxkit3d.js';
/**
 * MOD 233 — Ruptura em X (VFX). Duas lâminas de energia 3D (malha com espessura e curvatura, não um sprite) se cruzam
 * num X: núcleo branco-quente, corpo carmesim, bordas magenta e filamentos pretos finos que correm pela lâmina.
 * cast: partículas são puxadas para o centro e as lâminas crescem do cruzamento para as pontas, com clarão ao completar.
 * travel: o X fica de frente para a direção do voo (o plano do X é perpendicular à velocidade, horizontal) com rastro
 * bifurcado saindo das quatro pontas e do núcleo, e faíscas que ficam para trás.
 * impact: dois cortes cruzados se abrem no ponto de contato, ruptura (casca), faíscas direcionais ao longo dos cortes,
 * onda de choque e marca no chão. wall: o mesmo contra o obstáculo, menor. fade: o X perde coesão e se desfaz.
 */
const BLADE_VERT = `varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv=uv; vec4 w=modelMatrix*vec4(position,1.); vN=normalize(mat3(modelMatrix)*normal); vV=normalize(cameraPosition-w.xyz); gl_Position=projectionMatrix*viewMatrix*w; }`;
const BLADE_FRAG = `varying vec2 vUv; varying vec3 vN; varying vec3 vV; uniform float time, alpha, grow, seed;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7))+seed)*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
void main(){
 float x=abs(vUv.x*2.-1.); if(x>grow) discard;                      // cresce do cruzamento para as pontas
 float y=abs(vUv.y*2.-1.), w=1.-x*x;                                   // perfil: grosso no meio, afiado nas pontas
 if(y>w) discard;
 float e=y/max(w,.001);
 float core=exp(-e*e*28.)*(1.-x*.5);                                   // filete branco-quente
 float flow=n2(vec2(vUv.x*14.-time*9.,vUv.y*3.)), flow2=n2(vec2(vUv.x*31.+time*5.,vUv.y*7.+seed));
 float fil=smoothstep(.06,.0,abs(flow-.5)-.02)*smoothstep(.15,.6,e);  // filamentos pretos finos
 vec3 crimson=vec3(.85,.02,.08), magenta=vec3(1.,.2,.55);
 vec3 c=mix(crimson,magenta,smoothstep(.45,1.,e)+flow2*.25);
 c=mix(c,vec3(1.,.93,.9),core); c*=1.6+.6*flow;
 c=mix(c,vec3(.02,0.,.02),fil*.85);
 float rim=pow(1.-abs(dot(normalize(vN),vV)),2.)*.4;
 float a=alpha*(smoothstep(1.,.75,e)*.9+core)*(1.-smoothstep(grow-.08,grow,x)*.6);
 gl_FragColor=vec4((c+rim)*a,a);
}`;
/** Lâmina: faixa ao longo de X (−1..1), largura em Y, levemente arqueada para trás em Z e com espessura (duas faces). */
function bladeGeometry(T) {
  const nx = 28, pos = [], uv = [], idx = [];
  for (const side of [1, -1]) for (let i = 0; i <= nx; i++) for (let j = 0; j <= 1; j++) {
    const u = i / nx, x = u * 2 - 1, y = (j * 2 - 1) * .23 * (1 - x * x), z = -x * x * .22 + side * .012 * (1 - x * x);
    pos.push(x, y, z); uv.push(u, j);
  }
  for (let s = 0; s < 2; s++) { const o = s * (nx + 1) * 2; for (let i = 0; i < nx; i++) { const a = o + i * 2; if (s) idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); else idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}

export function createXRuptureVFX(T, scene, { ground = () => 0 } = {}) {
  const root = new T.Group(); root.name = 'RupturaEmX'; root.visible = false; scene.add(root);
  const geo = bladeGeometry(T);
  const mk = seed => new T.ShaderMaterial({ vertexShader: BLADE_VERT, fragmentShader: BLADE_FRAG, transparent: true, depthWrite: false, side: T.DoubleSide, toneMapped: false, fog: false,
    blending: T.CustomBlending, blendSrc: T.OneFactor, blendDst: T.OneMinusSrcAlphaFactor, uniforms: { time: { value: 0 }, alpha: { value: 1 }, grow: { value: 1 }, seed: { value: seed } } });
  const X = new T.Group(); root.add(X);
  const blades = [mk(1), mk(2)].map((m, i) => { const b = new T.Mesh(geo, m); b.rotation.z = i ? -Math.PI / 4 : Math.PI / 4; b.scale.set(1.55, 1.55, 1.55); X.add(b); return b; });
  const cutMats = [mk(5), mk(9)], cuts = cutMats.map((m, i) => { const b = new T.Mesh(geo, m); b.rotation.z = i ? -Math.PI / 4 : Math.PI / 4; root.add(b); return b; });
  const cutGroup = new T.Group(); root.add(cutGroup); for (const c of cuts) cutGroup.add(c);
  const shellGeo = new T.IcosahedronGeometry(1, 2), shellMat = new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false, fog: false, uniforms: { alpha: { value: 0 } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 w=modelMatrix*vec4(position,1.); vN=normalize(mat3(modelMatrix)*normal); vV=normalize(cameraPosition-w.xyz); gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader: 'varying vec3 vN; varying vec3 vV; uniform float alpha; void main(){ float f=pow(1.-abs(dot(normalize(vN),vV)),1.8); gl_FragColor=vec4(vec3(1.,.15,.35)*(.3+f*1.4),(.1+f)*alpha); }' });
  const shell = new T.Mesh(shellGeo, shellMat); root.add(shell);
  const glow = softParticles(T, 700), decals = groundDecals(T, 6), rib = ribbons(T, 900, { flow: 22 }); root.add(glow.mesh, decals.mesh, rib.mesh);
  const HN = 26, hist = Array.from({ length: HN }, () => ({ x: 0, y: 0, z: 0, t: -9 })); let hi = 0, lastT = -1;
  const q = new T.Quaternion(), fwd = new T.Vector3(), tip = new T.Vector3(), nrm = [0, 1, 0], UP = new T.Vector3(0, 1, 0), m4 = new T.Matrix4(), side = new T.Vector3(), upv = new T.Vector3();
  const CR = [1, .1, .2, 1], MG = [1, .35, .7, 1], WH = [1, .95, .92, 1], c4 = (c, a) => [c[0], c[1], c[2], a];
  function orient(obj, dx, dz) { fwd.set(dx, 0, dz).normalize(); side.crossVectors(UP, fwd).normalize(); upv.crossVectors(fwd, side); m4.makeBasis(side, upv, fwd); q.setFromRotationMatrix(m4); obj.quaternion.copy(q); }
  function update(s, camera, quality = 1) {
    root.visible = s.active; if (!s.active) { lastT = -1; return; }
    const t = s.time, A = s.age, ph = s.phase, low = quality === 0;
    for (const m of [...blades.map(b => b.material), ...cutMats]) m.uniforms.time.value = t;
    rib.begin(camera, t); glow.begin(); decals.begin();
    // ---- o X
    X.visible = ph === 'cast' || ph === 'travel' || (ph === 'fade' && A < .6);
    X.position.set(s.p.x, s.p.y, s.p.z); orient(X, s.dir.x, s.dir.z);
    const grow = ph === 'cast' ? easeOut((A - .12) / .28) : 1, fade = ph === 'fade' ? 1 - A / .6 : 1, pulse = 1 + .04 * Math.sin(t * 40);
    for (const b of blades) { b.material.uniforms.grow.value = Math.max(.02, grow); b.material.uniforms.alpha.value = fade; b.scale.setScalar(1.55 * pulse * (ph === 'fade' ? 1 + A * .6 : 1)); }
    if (ph === 'cast') { // energia sugada para o centro
      const n = low ? 24 : 60;
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
    if (ph === 'travel' || ph === 'fade') {
      if (t !== lastT) { hi = (hi + 1) % HN; Object.assign(hist[hi], { x: s.p.x, y: s.p.y, z: s.p.z, t }); lastT = t; }
      const tips = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
      for (let k = 0; k < HN - 1; k++) {
        const a = hist[(hi - k + HN) % HN], b = hist[(hi - k - 1 + HN) % HN]; if (b.t < 0 || t - b.t > .32) break;
        const fa = 1 - (t - a.t) / .32, fb = 1 - (t - b.t) / .32;
        rib.seg(a.x, a.y, a.z, b.x, b.y, b.z, .22 * fa, .22 * fb, c4(WH, fa * fade), c4(CR, fb * .8 * fade), k / 12, (k + 1) / 12);
        if (!low) for (const [sx, sy] of tips) { const off = 1.0 * (1 - k / HN * .5);
          tip.set(sx * off * .707, sy * off * .707, 0).applyQuaternion(X.quaternion);
          rib.seg(a.x + tip.x, a.y + tip.y, a.z + tip.z, b.x + tip.x, b.y + tip.y, b.z + tip.z, .06 * fa, .06 * fb, c4(MG, fa * .9 * fade), c4(CR, fb * .5 * fade), k / 12, (k + 1) / 12); }
      }
      for (let i = 0; i < (low ? 6 : 16); i++) { const age = (t * 3 + hash(i)) % 1, k = 1 - age, back = age * 2.6;
        glow.add(s.p.x - s.dir.x * back + (hash(i * 3) - .5) * .9 * age, s.p.y + (hash(i * 7) - .5) * .9 * age, s.p.z - s.dir.z * back + (hash(i * 5) - .5) * .9 * age, .05, .28, 1, .3, .5, k * fade, 3, Math.atan2(s.dir.x, s.dir.z) + Math.PI / 2, i); }
    }
    // ---- impacto: dois cortes cruzados no ponto de contato, ruptura e faíscas direcionais
    cutGroup.visible = shell.visible = false;
    if (ph === 'impact' || ph === 'wall') {
      const sc = ph === 'wall' ? .75 : 1, P = s.at; cutGroup.visible = true; cutGroup.position.set(P.x, P.y, P.z); orient(cutGroup, s.dir.x, s.dir.z);
      const open = easeOut(A / .12), out = 1 - smooth((A - .25) / .45);
      cuts.forEach((c, i) => { c.scale.set(2.6 * sc * (1 + .15 * open), 1.6 * sc, 1.6 * sc); c.material.uniforms.grow.value = Math.max(.02, open); c.material.uniforms.alpha.value = out * 1.2; });
      if (A < .35) { shell.visible = true; shell.position.set(P.x, P.y, P.z); shell.scale.setScalar(.4 + 2.6 * easeOut(A / .35) * sc); shellMat.uniforms.alpha.value = 1 - A / .35; }
      if (A < .12) { const k = 1 - A / .12; glow.add(P.x, P.y, P.z, 5 * k * sc + .5, 5 * k * sc + .5, 1, .85, .9, k, 0); glow.add(P.x, P.y, P.z, 7 * k * sc, .35, 1, 1, 1, k, 2, Math.PI / 4); }
      const nS = low ? 18 : 46;
      for (let i = 0; i < nS && A < .6; i++) { // faíscas saindo ao longo das duas diagonais do X e de volta pelo caminho
        const diag = i % 2 ? 1 : -1, along = (i % 4 < 2 ? 1 : -1), sp = (5 + hash(i) * 7) * sc, d = sp * A;
        tip.set(along * .707, diag * .707, -(hash(i * 3) * .6)).applyQuaternion(cutGroup.quaternion);
        glow.add(P.x + tip.x * d, P.y + tip.y * d - 4 * A * A, P.z + tip.z * d, .06, .45, 1, .4 + .4 * hash(i + 9), .6, 1 - A / .6, 3, Math.atan2(tip.y, tip.x) + Math.PI / 2, i);
      }
      const gy = ground(P.x, P.z), n = groundNormal(ground, P.x, P.z, nrm);
      if (P.y - gy < 3) { decals.add(P.x, gy, P.z, (1 + 4.5 * easeOut(A / .45)) * sc, 1, .2, .45, (1 - A / .75) * .9, 0, A / .45, 3, n); decals.add(P.x, gy, P.z, 1.6 * sc, 1, .15, .35, (1 - A / .75) * .8, 1, A, 4, n, Math.atan2(s.dir.x, s.dir.z)); }
    }
    if (ph === 'fade') for (let i = 0; i < (low ? 14 : 34); i++) { const a = i * 2.4, r = A * (2 + hash(i) * 2); glow.add(s.p.x + Math.cos(a) * r, s.p.y + Math.sin(a * 1.3) * r * .6, s.p.z + Math.sin(a) * r, .05, .25, 1, .3, .55, 1 - A / .6, 3, a, i); }
    rib.end(); glow.end(); decals.end(t);
  }
  return { root, update, clear() { root.visible = false; lastT = -1; for (const h of hist) h.t = -9; },
    dispose() { scene.remove(root); geo.dispose(); shellGeo.dispose(); shellMat.dispose(); for (const b of blades) b.material.dispose(); for (const m of cutMats) m.dispose(); glow.dispose(); decals.dispose(); rib.dispose(); } };
}
