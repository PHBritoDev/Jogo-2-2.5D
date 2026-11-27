/**
 * MOD 375 — efeitos da abertura (marcha + Campo da Última Guerra), todos em POOLS FIXOS e InstancedMesh:
 *  • createExplosions: explosão em camadas — núcleo branco-dourado curto → massas de fogo âmbar/laranja/vermelho
 *    turbulentas e alongadas (borda erodida por ruído) → filamentos finos direcionais saindo do ponto mais quente →
 *    fumaça escura secundária → brasas. Expansão, pico e dissipação legíveis; um draw call por camada para TODAS as
 *    explosões vivas. `reduceFlash` limita o pico.
 *  • createSmears: arcos crescentes de corte (núcleo claro, borda carmesim, cauda que some), presos ao plano do golpe.
 *  • createScrape: contato da lâmina arrastada no chão — sulco incandescente que esfria + poucas centelhas curtas.
 *  • createTitle: o título nasce de partículas que convergem para as letras.
 * Nada aqui aloca por quadro; tudo é descartável por dispose().
 */
const NOISE = `float h1(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h1(i),h1(i+vec2(1,0)),f.x),mix(h1(i+vec2(0,1)),h1(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*n2(p);p*=2.03;a*=.5;}return s;}`;
/* billboard instanciado: aData = (k 0..1, semente, alongamento, rotação na tela) */
const IBB_V = `attribute vec4 aData; varying vec2 vUv; varying vec4 vD;
void main(){ vUv=uv; vD=aData; vec4 c=viewMatrix*vec4(instanceMatrix[3].xyz,1.); float s=length(instanceMatrix[0].xyz);
 vec2 p=position.xy; p.y*=aData.z; float r=aData.w; p=mat2(cos(r),sin(r),-sin(r),cos(r))*p; c.xy+=p*s; gl_Position=projectionMatrix*c; }`;
const FIRE_F = `${NOISE} uniform float uT,uLow; varying vec2 vUv; varying vec4 vD;
void main(){ vec2 p=vUv*2.-1.; float k=vD.x, sd=vD.y*17.;
 float n=fbm(p*1.9+vec2(sd,-uT*1.3-k*1.8)), m=fbm(p*4.6-vec2(uT*.8,sd)), f=fbm(p*9.+vec2(sd*2.,-uT*2.));
 float r=length(p*vec2(1.,.8)); float edge=.86-.16*k; float body=smoothstep(edge,edge-.5,r+(n-.5)*.95+(m-.5)*.28);
 float ero=smoothstep(.25,1.,k); body*=smoothstep(ero-.1,ero+.22,n*.85+(1.-r)*.5+(f-.5)*.12);
 float heat=clamp((1.-k*1.7)*(1.1-r*.9)+(m-.5)*.35+(f-.5)*.15,0.,1.);
 vec3 c=mix(vec3(.09,.012,.006),vec3(.62,.07,.015),smoothstep(.02,.3,heat)); c=mix(c,vec3(1.,.36,.05),smoothstep(.28,.62,heat)); c=mix(c,vec3(1.,.72,.3),smoothstep(.6,.88,heat)); c=mix(c,vec3(1.,.93,.76),smoothstep(.88,1.,heat)*.8);
 float a=body*(1.-smoothstep(.78,1.,k)); if(a<.02) discard; gl_FragColor=vec4(c*(1.1+heat*1.3),min(1.,a*1.15)); }`;
const CORE_F = `uniform float uFlashMax; varying vec2 vUv; varying vec4 vD; void main(){ vec2 p=vUv*2.-1.; float r=length(p); float k=vD.x;
 float a=(exp(-r*r*16.)*1.1+exp(-r*r*4.)*.22)*(1.-smoothstep(.1,1.,k))*smoothstep(0.,.06,k+.02)*uFlashMax; if(a<.004) discard;
 vec3 c=mix(vec3(1.,.7,.25),vec3(1.,.98,.9),exp(-r*r*10.)); gl_FragColor=vec4(c*a,a); }`;
const RAY_F = `varying vec2 vUv; varying vec4 vD; void main(){ vec2 p=vUv*2.-1.; float k=vD.x; float along=vUv.y;
 float w=(1.-abs(p.x))*smoothstep(0.,.25,along)*smoothstep(1.,.35,along); float life=smoothstep(0.,.08,k)*(1.-smoothstep(.25,.7,k));
 float a=pow(w,3.)*life; if(a<.004) discard; vec3 c=mix(vec3(1.,.55,.15),vec3(1.,.95,.8),pow(w,6.)); gl_FragColor=vec4(c*a*1.6,a); }`;
const SMOKE_F = `${NOISE} uniform float uT; varying vec2 vUv; varying vec4 vD; void main(){ vec2 p=vUv*2.-1.; float k=vD.x; float r=length(p);
 float n=fbm(p*1.5+vec2(vD.y*9.,uT*.12)); float a=smoothstep(1.,.2,r+(n-.5)*.8)*smoothstep(0.,.25,k)*(1.-smoothstep(.55,1.,k))*.72; if(a<.01) discard;
 vec3 c=mix(vec3(.03,.018,.014),vec3(.16,.05,.02),(1.-k)*smoothstep(.3,-.6,p.y)*n); gl_FragColor=vec4(c,a); }`;

function instancedBillboards(T, n, frag, uniforms, blending, keep) {
  const g = keep(new T.PlaneGeometry(1, 1)), data = new Float32Array(n * 4); const attr = new T.InstancedBufferAttribute(data, 4).setUsage(T.DynamicDrawUsage); g.setAttribute('aData', attr);
  const m = keep(new T.ShaderMaterial({ uniforms, vertexShader: IBB_V, fragmentShader: frag, transparent: true, depthWrite: false, blending, toneMapped: false }));
  const mesh = new T.InstancedMesh(g, m, n); mesh.frustumCulled = false; mesh.count = 0; mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
  return { mesh, data, attr, u: uniforms };
}

/** Explosões em camadas. pool = nº de explosões simultâneas. Chamar update(dt, camera, groundScroll) por quadro. */
export function createExplosions(T, parent, { pool = 5, low = false, reduceFlash = false, keep = o => o } = {}) {
  const FM = low ? 6 : 9, RY = low ? 8 : 14, SM = low ? 3 : 5, EM = low ? 10 : 18;
  const uT = { value: 0 };
  const fire = instancedBillboards(T, pool * FM, FIRE_F, { uT, uLow: { value: low ? 1 : 0 } }, T.NormalBlending, keep);
  const core = instancedBillboards(T, pool, CORE_F, { uFlashMax: { value: reduceFlash ? .45 : 1 } }, T.AdditiveBlending, keep);
  const rays = instancedBillboards(T, pool * RY, RAY_F, {}, T.AdditiveBlending, keep);
  const smoke = instancedBillboards(T, pool * SM, SMOKE_F, { uT }, T.NormalBlending, keep);
  smoke.mesh.renderOrder = 4; fire.mesh.renderOrder = 5; rays.mesh.renderOrder = 6; core.mesh.renderOrder = 7;
  for (const L of [smoke, fire, rays, core]) parent.add(L.mesh);
  const eg = keep(new T.BufferGeometry()), eP = new Float32Array(pool * EM * 3), eA = new Float32Array(pool * EM);
  eg.setAttribute('position', new T.BufferAttribute(eP, 3).setUsage(T.DynamicDrawUsage)); eg.setAttribute('aA', new T.BufferAttribute(eA, 1).setUsage(T.DynamicDrawUsage));
  const em = keep(new T.ShaderMaterial({ uniforms: { uPix: { value: 1 } }, vertexShader: 'attribute float aA; uniform float uPix; varying float vA; void main(){ vA=aA; vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv; gl_PointSize=uPix*14./-mv.z*(.6+aA); }',
    fragmentShader: 'varying float vA; void main(){ vec2 p=gl_PointCoord*2.-1.; float r=dot(p,p); if(r>1.||vA<.01) discard; float a=(1.-r)*vA; gl_FragColor=vec4(vec3(1.,.5,.12)*a*1.5,a); }', transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false }));
  const embers = new T.Points(eg, em); embers.frustumCulled = false; embers.renderOrder = 6; parent.add(embers);
  const R = (a, b) => a + Math.random() * (b - a);
  const list = Array.from({ length: pool }, () => ({ t: -1, dur: 2.6, p: new T.Vector3(), size: 1, masses: [], rays: [], smoke: [], emb: [] }));
  for (const e of list) {
    for (let i = 0; i < FM; i++) e.masses.push({ o: new T.Vector3(), v: new T.Vector3(), s: 1, st: 1, rot: 0, seed: 0, d: 0 });
    for (let i = 0; i < RY; i++) e.rays.push({ dir: new T.Vector3(), len: 1, w: 1, seed: 0, d: 0 });
    for (let i = 0; i < SM; i++) e.smoke.push({ o: new T.Vector3(), v: new T.Vector3(), s: 1, seed: 0, d: 0 });
    for (let i = 0; i < EM; i++) e.emb.push({ p: new T.Vector3(), v: new T.Vector3(), d: 0 });
  }
  const M = new T.Matrix4(), Q = new T.Quaternion(), S = new T.Vector3(), P = new T.Vector3(), A = new T.Vector3(), B = new T.Vector3();
  /** Dispara uma explosão em p (mundo). size ≈ raio do pico em metros/2. dir: viés dos filamentos (ex.: para cima). */
  function burst(p, size = 1, { dir = null, dur = 2.6 } = {}) {
    const e = list.find(x => x.t < 0) || list.reduce((a, b) => (a.t > b.t ? a : b)); e.t = 0; e.dur = dur; e.p.copy(p); e.size = size;
    e.masses.forEach((m, i) => { const sec = i >= e.masses.length - 2; // os dois últimos são volumes SECUNDÁRIOS: atrasados, mais longe, menores
      m.o.set(R(-.4, .4), R(-.05, .5), R(-.4, .4)).multiplyScalar(size * (sec ? 1.8 : 1)); m.v.set(R(-1, 1), R(.5, 1.9), R(-1, 1)).multiplyScalar(size * (sec ? .7 : 1.25));
      m.s = size * (sec ? R(.45, .7) : R(.55, 1.05)); m.st = R(1.2, 2.1); m.rot = Math.atan2(m.v.x, m.v.y) * .8 + R(-.3, .3); m.seed = Math.random(); m.d = sec ? R(.22, .42) : R(0, .12); });
    for (const r of e.rays) { r.dir.set(R(-1, 1), R(-.15, 1), R(-1, 1)); if (dir) r.dir.addScaledVector(dir, .8); r.dir.normalize(); r.len = size * R(2.6, 5.4); r.w = size * R(.03, .07); r.seed = Math.random(); r.d = R(0, .1); }
    for (const s of e.smoke) { s.o.set(R(-.5, .5), R(.2, .8), R(-.5, .5)).multiplyScalar(size); s.v.set(R(-.4, .4), R(.6, 1.2), R(-.4, .4)).multiplyScalar(size * .6); s.s = size * R(1.5, 2.4); s.seed = Math.random(); s.d = R(.25, .55); }
    for (const b of e.emb) { b.p.copy(p); b.v.set(R(-1, 1), R(.6, 2), R(-1, 1)).normalize().multiplyScalar(size * R(3, 9)); b.d = R(0, .25); }
    return e;
  }
  function update(dt, camera, scroll = 0) {
    uT.value += dt; let nf = 0, nr = 0, ns = 0, nc = 0, ne = 0; camera.updateMatrixWorld();
    for (const e of list) {
      if (e.t < 0) continue; e.t += dt; e.p.z -= scroll; const T0 = e.t;
      if (T0 > e.dur + .8) { e.t = -1; continue; }
      // núcleo: pico curto
      { const k = T0 / .38; if (k < 1) { M.compose(e.p, Q.identity(), S.setScalar(e.size * (.9 + 1.6 * Math.sqrt(k)))); core.mesh.setMatrixAt(nc, M); core.data.set([k, 0, 1, 0], nc * 4); nc++; } }
      // massas de fogo: crescem rápido, sobem, alongam e erodem
      for (const m of e.masses) { const lt = T0 - m.d; if (lt < 0) continue; const k = lt / (e.dur * .9); if (k >= 1) continue;
        const grow = 1 - Math.pow(1 - Math.min(1, lt / .4), 3); P.copy(e.p).add(m.o).addScaledVector(m.v, Math.min(lt, .9) * (1 - Math.min(lt, .9) * .45) + Math.max(0, lt - .9) * .12);
        M.compose(P, Q.identity(), S.setScalar(m.s * (.3 + 1.5 * grow) * (1 + k * .5))); fire.mesh.setMatrixAt(nf, M); fire.data.set([k, m.seed, m.st * (1 + k * .5), m.rot + k * .3], nf * 4); nf++; }
      // filamentos: saem do ponto mais quente, finos e longos, curtos no tempo
      for (const r of e.rays) { const lt = T0 - r.d; if (lt < 0 || lt > .9) continue; const k = lt / .9;
        const L = r.len * (.4 + .6 * Math.min(1, lt / .22)); P.copy(e.p).addScaledVector(r.dir, L * .5);
        A.copy(e.p).applyMatrix4(camera.matrixWorldInverse); B.copy(e.p).addScaledVector(r.dir, L).applyMatrix4(camera.matrixWorldInverse);
        const ang = Math.atan2(B.y - A.y, B.x - A.x) - Math.PI / 2, scr = Math.max(.05, Math.hypot(B.x - A.x, B.y - A.y));
        M.compose(P, Q.identity(), S.setScalar(r.w)); rays.mesh.setMatrixAt(nr, M); rays.data.set([k, r.seed, scr / r.w, ang], nr * 4); nr++; }
      // fumaça escura: chega depois, separa os planos e some
      for (const s of e.smoke) { const lt = T0 - s.d; if (lt < 0) continue; const k = lt / (e.dur + .4); if (k >= 1) continue;
        P.copy(e.p).add(s.o).addScaledVector(s.v, lt); M.compose(P, Q.identity(), S.setScalar(s.s * (.6 + k * 1.1))); smoke.mesh.setMatrixAt(ns, M); smoke.data.set([k, s.seed, 1, 0], ns * 4); ns++; }
      // brasas
      for (const b of e.emb) { const lt = T0 - b.d; const i3 = ne * 3; if (lt < 0 || lt > 1.8) { eA[ne] = 0; ne++; continue; } b.v.y -= 9.8 * dt * .55; b.v.multiplyScalar(1 - dt * .9); b.p.addScaledVector(b.v, dt); b.p.z -= scroll;
        eP[i3] = b.p.x; eP[i3 + 1] = Math.max(.02, b.p.y); eP[i3 + 2] = b.p.z; eA[ne] = (1 - lt / 1.8) * .9; ne++; }
    }
    for (let i = ne; i < eA.length; i++) eA[i] = 0;
    fire.mesh.count = nf; rays.mesh.count = nr; smoke.mesh.count = ns; core.mesh.count = nc;
    for (const L of [fire, rays, smoke, core]) { L.mesh.instanceMatrix.needsUpdate = true; L.attr.needsUpdate = true; }
    eg.attributes.position.needsUpdate = true; eg.attributes.aA.needsUpdate = true;
  }
  return { burst, update, list, setPixelRatio(pr) { em.uniforms.uPix.value = pr; }, setReduceFlash(v) { core.u.uFlashMax.value = v ? .45 : 1; }, active() { return list.filter(e => e.t >= 0).length; } };
}

/* ---------------- arcos de corte (crescentes) ---------------- */
const SMEAR_F = `uniform float uK; uniform vec3 uEdge; varying vec2 vUv; void main(){ float u=vUv.x, v=vUv.y; // u: ao longo do arco (0 cauda → 1 frente); v: 0 dentro → 1 borda
 float head=smoothstep(uK-.75,uK,u)*(1.-smoothstep(uK,uK+.04,u)); float thick=sin(clamp(u,0.,1.)*3.1416); float body=smoothstep(0.,.25,v)*smoothstep(1.,.7,v)*thick;
 float core=smoothstep(.55,.85,v)*smoothstep(1.,.88,v); vec3 c=mix(vec3(.75,.72,.74),uEdge,smoothstep(.6,1.,v)); c=mix(c,vec3(1.),core*.6);
 float a=head*body*(1.-smoothstep(1.05,1.4,uK)); if(a<.01) discard; gl_FragColor=vec4(c*a*1.25,a*.9); }`;
/** Pool de arcos crescentes. fire(center, axisNormal, startAngle, sweep, radius, edgeColor) — o arco vive ~.32 s. */
export function createSmears(T, parent, { pool = 8, keep = o => o } = {}) {
  const N = 40, mk = () => { const pos = new Float32Array((N + 1) * 2 * 3), uv = new Float32Array((N + 1) * 2 * 2), idx = [];
    for (let i = 0; i <= N; i++) { uv.set([i / N, 0, i / N, 1], i * 4); if (i < N) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } }
    const g = keep(new T.BufferGeometry()); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('uv', new T.BufferAttribute(uv, 2)); g.setIndex(idx); return g; };
  const items = Array.from({ length: pool }, () => { const g = mk(), u = { uK: { value: 0 }, uEdge: { value: new T.Color(0xff2030) } };
    const m = new T.Mesh(g, keep(new T.ShaderMaterial({ uniforms: u, vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }', fragmentShader: SMEAR_F, transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending, toneMapped: false })));
    m.frustumCulled = false; m.visible = false; m.renderOrder = 9; parent.add(m); return { m, g, u, t: -1, life: .34 }; });
  const X = new T.Vector3(), Y = new T.Vector3(), Z = new T.Vector3(), P = new T.Vector3();
  /** xAxis (opcional): direção do ângulo 0 no plano do arco (ex.: a frente do atacante). */
  function fire(center, normal, a0, sweep, radius, edge = 0xff2030, width = .32, life = .34, xAxis = null) {
    const it = items.find(x => x.t < 0) || items.reduce((a, b) => (a.t > b.t ? a : b)); it.t = 0; it.life = life; it.u.uEdge.value.setHex(edge); it.m.position.set(0, 0, 0);
    Z.copy(normal).normalize(); if (xAxis) X.copy(xAxis); else { X.set(1, 0, 0); if (Math.abs(Z.dot(X)) > .9) X.set(0, 1, 0); } X.addScaledVector(Z, -X.dot(Z)).normalize(); Y.crossVectors(Z, X);
    const pos = it.g.attributes.position.array;
    for (let i = 0; i <= N; i++) { const u = i / N, a = a0 + sweep * u, w = width * radius * Math.sin(u * Math.PI) + .01;
      for (const [j, r] of [[0, radius - w], [1, radius + w * .25]]) { P.copy(center).addScaledVector(X, Math.cos(a) * r).addScaledVector(Y, Math.sin(a) * r); pos.set([P.x, P.y, P.z], (i * 2 + j) * 3); } }
    it.g.attributes.position.needsUpdate = true; it.m.visible = true; return it;
  }
  function update(dt, scroll = 0) { for (const it of items) { if (it.t < 0) continue; it.t += dt; it.u.uK.value = it.t / it.life * 1.15; if (scroll) it.m.position.z -= scroll; if (it.t > it.life * 1.25) { it.t = -1; it.m.visible = false; it.m.position.set(0, 0, 0); } } }
  return { fire, update };
}

/* ---------------- raspagem da lâmina no chão ---------------- */
/** Sulco incandescente que esfria + centelhas curtas. add(p, intensity) a cada quadro de contato; o chão corre com `scroll`. */
export function createScrape(T, parent, { pool = 90, keep = o => o } = {}) {
  const g = keep(new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)), data = new Float32Array(pool * 4); g.setAttribute('aData', new T.InstancedBufferAttribute(data, 4).setUsage(T.DynamicDrawUsage));
  const m = keep(new T.ShaderMaterial({ vertexShader: 'attribute vec4 aData; varying vec2 vUv; varying vec4 vD; void main(){ vUv=uv; vD=aData; gl_Position=projectionMatrix*viewMatrix*modelMatrix*instanceMatrix*vec4(position,1.); }',
    fragmentShader: 'varying vec2 vUv; varying vec4 vD; void main(){ vec2 p=vUv*2.-1.; float k=vD.x; float a=(1.-smoothstep(.2,1.,abs(p.x)))*(1.-smoothstep(.6,1.,abs(p.y)))*(1.-k)*vD.y; if(a<.01) discard; vec3 c=mix(vec3(1.,.55,.2),vec3(.5,.04,.02),smoothstep(0.,.5,k)); gl_FragColor=vec4(c*a*1.2,a); }',
    transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false }));
  const mesh = new T.InstancedMesh(g, m, pool); mesh.frustumCulled = false; mesh.count = pool; mesh.renderOrder = 3; parent.add(mesh);
  const marks = Array.from({ length: pool }, () => ({ p: new T.Vector3(0, -50, 0), t: 9, life: 1.4, s: 1, yaw: 0, a: 0 })); let next = 0, last = null;
  const spk = createSparks(T, parent, 40, keep);
  const M = new T.Matrix4(), Q = new T.Quaternion(), S = new T.Vector3(), E = new T.Euler();
  function add(p, intensity = 1, dir = null) {
    if (last && last.distanceToSquared(p) < .0016) return; const mk = marks[next++ % pool]; mk.p.copy(p); mk.p.y = .012; mk.t = 0; mk.life = 1.1 + Math.random() * .5; mk.a = intensity;
    mk.yaw = dir ? Math.atan2(dir.x, dir.z) : 0; mk.s = .05 + Math.random() * .03; last = last || new T.Vector3(); last.copy(p);
    if (Math.random() < .22 * intensity) spk.emit(p, 2);
  }
  function update(dt, scroll = 0) {
    for (let i = 0; i < pool; i++) { const mk = marks[i]; mk.t += dt; mk.p.z -= scroll; const k = Math.min(1, mk.t / mk.life);
      M.compose(mk.p, Q.setFromEuler(E.set(0, mk.yaw, 0)), S.set(mk.s, 1, mk.s * 3.2)); mesh.setMatrixAt(i, M); data.set([k, k >= 1 ? 0 : mk.a, 0, 0], i * 4); }
    if (last) last.z -= scroll; mesh.instanceMatrix.needsUpdate = true; g.attributes.aData.needsUpdate = true; spk.update(dt, scroll);
  }
  return { add, update };
}
function createSparks(T, parent, n, keep) {
  const g = keep(new T.BufferGeometry()), P = new Float32Array(n * 3), A = new Float32Array(n); g.setAttribute('position', new T.BufferAttribute(P, 3).setUsage(T.DynamicDrawUsage)); g.setAttribute('aA', new T.BufferAttribute(A, 1).setUsage(T.DynamicDrawUsage));
  const m = keep(new T.ShaderMaterial({ vertexShader: 'attribute float aA; varying float vA; void main(){ vA=aA; vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv; gl_PointSize=6./-mv.z*(.5+aA); }',
    fragmentShader: 'varying float vA; void main(){ vec2 p=gl_PointCoord*2.-1.; float r=dot(p,p); if(r>1.||vA<.02) discard; gl_FragColor=vec4(vec3(1.,.7,.35)*vA*(1.-r)*1.4,vA*(1.-r)); }', transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false }));
  const pts = new T.Points(g, m); pts.frustumCulled = false; parent.add(pts);
  const s = Array.from({ length: n }, () => ({ p: { x: 0, y: -50, z: 0 }, v: { x: 0, y: 0, z: 0 }, t: 9 })); let k = 0;
  return { emit(p, c) { for (let i = 0; i < c; i++) { const q = s[k++ % n]; q.p.x = p.x; q.p.y = p.y + .02; q.p.z = p.z; q.v.x = (Math.random() - .5) * 1.2; q.v.y = .6 + Math.random() * 1.2; q.v.z = -.5 - Math.random(); q.t = 0; } },
    update(dt, scroll) { for (let i = 0; i < n; i++) { const q = s[i]; q.t += dt; q.v.y -= 9.8 * dt; q.p.x += q.v.x * dt; q.p.y = Math.max(.01, q.p.y + q.v.y * dt); q.p.z += q.v.z * dt - scroll; P.set([q.p.x, q.p.y, q.p.z], i * 3); A[i] = q.t < .35 ? 1 - q.t / .35 : 0; } g.attributes.position.needsUpdate = true; g.attributes.aA.needsUpdate = true; } };
}

/* ---------------- título por partículas ---------------- */
/** As letras são amostradas de um canvas 2D (fonte já disponível no sistema) e cada ponto viaja de uma posição dispersa
    até sua letra. progress 0..1 controla a convergência; glow 0..1 o brilho final. */
export function createTitle(T, parent, text, { width = 9, low = false, keep = o => o, lines: nl = 2, font = '600 92px Georgia, "Times New Roman", serif' } = {}) {
  const cv = document.createElement('canvas'), W = nl > 2 ? 900 : 1400, H = nl > 2 ? 360 : 260; cv.width = W; cv.height = H; const g2 = cv.getContext('2d');
  g2.fillStyle = '#000'; g2.fillRect(0, 0, W, H); g2.fillStyle = '#fff'; g2.textAlign = 'center'; g2.textBaseline = 'middle';
  const lines = text.split('\n'); g2.font = font; lines.forEach((l, i) => g2.fillText(l, W / 2, H / 2 + (i - (lines.length - 1) / 2) * 104));
  const img = g2.getImageData(0, 0, W, H).data, pts = [], step = low ? 5 : 3;
  for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) if (img[(y * W + x) * 4] > 128) pts.push([(x / W - .5) * width, (.5 - y / H) * width * H / W]);
  const n = pts.length, P = new Float32Array(n * 3), F = new Float32Array(n * 3), S = new Float32Array(n);
  for (let i = 0; i < n; i++) { F.set([pts[i][0], pts[i][1], 0], i * 3); const a = Math.random() * 6.283, r = 3 + Math.random() * 9; S[i] = Math.random(); P.set([pts[i][0] * .2 + Math.cos(a) * r, pts[i][1] - 2 - Math.random() * 5, Math.sin(a) * r * .6 - 2], i * 3); }
  const g = keep(new T.BufferGeometry()); g.setAttribute('position', new T.BufferAttribute(P, 3)); g.setAttribute('aTo', new T.BufferAttribute(F, 3)); g.setAttribute('aS', new T.BufferAttribute(S, 1));
  const u = { uP: { value: 0 }, uG: { value: 0 }, uT: { value: 0 }, uPix: { value: 1 } };
  const m = keep(new T.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false,
    vertexShader: `attribute vec3 aTo; attribute float aS; uniform float uP,uT,uPix; varying float vA; void main(){ float k=clamp((uP*1.35-aS*.35),0.,1.); k=k*k*(3.-2.*k);
      vec3 p=mix(position,aTo,k); p.x+=sin(uT*1.7+aS*40.)*.05*(1.-k); p.y+=cos(uT*1.3+aS*30.)*.05*(1.-k); vA=mix(.3,1.,k)*smoothstep(0.,.12,uP+aS*.05);
      vec4 mv=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv; gl_PointSize=uPix*(2.6+2.2*(1.-k))*10./-mv.z; }`,
    fragmentShader: `uniform float uG; varying float vA; void main(){ vec2 p=gl_PointCoord*2.-1.; float r=dot(p,p); if(r>1.) discard; vec3 c=mix(vec3(1.,.28,.1),vec3(1.,.86,.62),uG); float a=(exp(-r*5.)*1.15+(1.-r)*.25)*vA; gl_FragColor=vec4(c*a*(1.5+.9*uG),a); }` }));
  const o = new T.Points(g, m); o.frustumCulled = false; o.renderOrder = 20; parent.add(o);
  return { object: o, u, count: n, set(progress, glow, t, pr = 1) { u.uP.value = progress; u.uG.value = glow; u.uT.value = t; u.uPix.value = pr; } };
}
