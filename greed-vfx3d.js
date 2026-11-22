/**
 * MISSÃO 21/11 — VFX da GANÂNCIA (só desenho; a lógica decide posições, acertos e tempos).
 *  • MINI-SÓIS (ref. 1000366121 e vídeo de 8,3 s, paleta SOLAR): esfera de plasma turbulento com núcleo branco-amarelo,
 *    borda laranja, coroa de chamas deslocada por ruído e dois arcos de plasma girando. Explosão: pré-brilho → flash curto
 *    controlado → núcleo que se expande → casca de plasma com rasgos → anel no chão → filamentos e brasas → dissipação.
 *  • ESFERA DO ABISMO (ref. 1000366140 + vídeo de 4,8 s): núcleo vermelho com rachaduras roxo-negras vivas, anéis
 *    orbitais instáveis, carga lenta na boca; explosão vermelha pulsante com centro violeta, raios negro-magenta e
 *    estilhaços de vidro energético que se expandem e colapsam (NÃO é o sol repintado).
 *  • RESSURREIÇÃO (ref. vídeo de 23,9 s): halo no chão, coluna vermelha que sobe, estilhaços que se juntam e explosão
 *    centrada no CORPO do chefe.
 *  • Auras próprias das armas autônomas (estrelas, gotas, centelhas solares, lascas douradas), troca de armas, choque
 *    de lâminas, queda da foice, sangue com física até o chão, penas que planam.
 * Tudo em pools fixos, shaders com uniform de tempo, sem luzes dinâmicas, sem alocação por quadro.
 */
const NOISE = `float h31(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float vn(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x),mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y),mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x),mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){return vn(p)*.55+vn(p*2.1)*.3+vn(p*4.3)*.15;}`;
const SV = `uniform float uT,uDisp;varying vec3 vP,vN,vW;${NOISE}void main(){vec3 p=position;float n=fbm(p*2.2+vec3(0.,uT*1.4,uT*.7));p*=1.+(n-.5)*uDisp;vP=position;vN=normalize(mat3(modelMatrix)*normal);vec4 w=modelMatrix*vec4(p,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`;
const SUN_F = `uniform float uT,uK;varying vec3 vP,vN,vW;${NOISE}void main(){vec3 V=normalize(cameraPosition-vW);float f=abs(dot(normalize(vN),V));float n=fbm(vP*3.+vec3(uT*.9,-uT*.6,uT*.4));
vec3 c=mix(vec3(1.,.42,.05),vec3(1.,.82,.32),smoothstep(.25,.75,n));c=mix(c,vec3(1.,.98,.88),pow(f,2.2)*.9);c*=1.+smoothstep(.62,.8,n)*.5;gl_FragColor=vec4(c*uK*1.25,1.);}`;
const CORONA_F = `uniform float uT,uK;varying vec3 vP,vN,vW;${NOISE}void main(){vec3 V=normalize(cameraPosition-vW);float f=1.-abs(dot(normalize(vN),V));float n=fbm(vP*4.+vec3(0.,-uT*2.2,uT));
float a=pow(f,1.6)*smoothstep(.3,.75,n+f*.3)*uK;if(a<.01)discard;gl_FragColor=vec4(mix(vec3(1.,.5,.08),vec3(1.,.85,.4),n)*a*1.4,a);}`;
const SHELL_F = `uniform float uT,uK,uHot;varying vec3 vP,vN,vW;${NOISE}void main(){vec3 V=normalize(cameraPosition-vW);float f=abs(dot(normalize(vN),V));float n=fbm(vP*3.5+vec3(uT*2.,uT,-uT*1.5));
float tear=smoothstep(.36,.5,n);vec3 c=mix(vec3(1.,.35,.04),vec3(1.,.9,.6),pow(f,1.5)*n);c=mix(c,vec3(1.),uHot*pow(f,3.));float a=uK*tear*(.35+.65*f);if(a<.01)discard;gl_FragColor=vec4(c*a*1.5,a);}`;
const RING_F = `uniform float uK,uT;uniform vec3 uC;varying vec2 vUv;${NOISE}void main(){vec2 p=vUv*2.-1.;float r=length(p),a=atan(p.y,p.x);float band=smoothstep(.12,.0,abs(r-.82))*(.6+.4*vn(vec3(a*6.,r*4.,uT*3.)));float a2=band*uK;if(a2<.01)discard;gl_FragColor=vec4(uC*a2*1.4,a2);}`;
const ABY_F = `uniform float uT,uK,uP;varying vec3 vP,vN,vW;${NOISE}void main(){vec3 V=normalize(cameraPosition-vW);float f=abs(dot(normalize(vN),V));vec3 q=vP*2.6+vec3(uT*.5,uT*.3,-uT*.4);
float n=fbm(q),cr=abs(vn(q*1.7)-.5)*2.,cr2=abs(vn(q*3.9+3.)-.5)*2.;float crack=smoothstep(.1,.0,cr)+smoothstep(.07,.0,cr2)*.6;
vec3 c=mix(vec3(.45,.0,.02),vec3(1.,.08,.06),smoothstep(.3,.8,n)*pow(f,.7));c=mix(c,vec3(.035,0.,.05),clamp(crack,0.,1.)*.95);c+=vec3(.42,.04,.62)*smoothstep(.25,.05,cr)*(1.-smoothstep(.06,0.,cr))*.6;
c+=vec3(1.,.1,.18)*pow(1.-f,2.5)*.5; /* ref.: vermelho-sangue, rachaduras roxo-negras (menos rosa) */c*=.8+.4*sin(uT*7.+uP*3.);gl_FragColor=vec4(c*uK,1.);}`;
// estouro do abismo: mesma esfera + miolo quente branco-laranja voltado à câmera (ref. 4,8 s), que esfria conforme uK cai
const ABY_BOOM_F = ABY_F.replace('gl_FragColor=vec4(c*uK,1.);', 'c+=vec3(1.,.62,.36)*pow(f,2.6)*clamp(uK-.25,0.,1.)*2.2+vec3(1.,.15,.55)*pow(1.-f,1.5)*.6;gl_FragColor=vec4(c*uK,1.);');
const PILLAR_F = `uniform float uK,uT;varying vec2 vUv;${NOISE}void main(){float x=abs(vUv.x-.5)*2.;float n=vn(vec3(vUv.x*8.,vUv.y*3.-uT*2.5,uT));float a=(1.-x*x)*smoothstep(1.,.0,vUv.y)*(.5+.5*n)*uK;if(a<.01)discard;gl_FragColor=vec4(mix(vec3(.9,.05,.1),vec3(1.,.45,.6),n)*a*1.5,a);}`;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v, ease = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }, out3 = x => 1 - Math.pow(1 - clamp(x, 0, 1), 3);

export function createGreedVFX(T, scene) {
  const root = new T.Group(); root.name = 'GananciaVFX'; scene.add(root); let time = 0, low = false; const mats = [], geos = [];
  const keep = m => (mats.push(m), m), keepG = g => (geos.push(g), g);
  const sm = (F, U, add = true, V = SV) => keep(new T.ShaderMaterial({ uniforms: U, vertexShader: V, fragmentShader: F, transparent: add, depthWrite: !add, blending: add ? T.AdditiveBlending : T.NormalBlending, toneMapped: false }));
  const sph = keepG(new T.IcosahedronGeometry(1, 4)), sphLo = keepG(new T.IcosahedronGeometry(1, 2)), plane = keepG(new T.PlaneGeometry(2, 2)); plane.rotateX(-Math.PI / 2);
  const UV = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
  const _v = new T.Vector3(), _m = new T.Matrix4(), _q = new T.Quaternion(), _s = new T.Vector3(), _e = new T.Euler(), _c = new T.Color();
  /* ---------- partículas genéricas (brasas, estrelas, gotas, lascas) ---------- */
  const PN = 220, pGeo = keepG(new T.OctahedronGeometry(1, 0)), pMat = keep(new T.MeshBasicMaterial({ toneMapped: false, transparent: true, blending: T.AdditiveBlending, depthWrite: false }));
  const parts = new T.InstancedMesh(pGeo, pMat, PN); parts.instanceColor = new T.InstancedBufferAttribute(new Float32Array(PN * 3), 3); parts.instanceMatrix.setUsage(T.DynamicDrawUsage); parts.frustumCulled = false; parts.renderOrder = 14; root.add(parts);
  const P = Array.from({ length: PN }, () => ({ on: false, p: new T.Vector3(), v: new T.Vector3(), age: 0, life: 1, s: .03, g: 0, drag: 1, str: 1 })); let pc = 0;
  function emit(p, v, life, s, color, g = 0, drag = 1, str = 1) { const q = P[pc]; parts.instanceColor.setXYZ(pc, ...color); pc = (pc + 1) % PN; q.on = true; q.p.copy(p); q.v.copy(v); q.age = 0; q.life = life; q.s = s; q.g = g; q.drag = drag; q.str = str; }
  const DARK = keep(new T.MeshBasicMaterial({ color: 0x0a0208, transparent: true, depthWrite: false }));
  const SN = 60, shardGeo = keepG((() => { const g = new T.ConeGeometry(.5, 1, 3, 1); g.translate(0, .5, 0); return g; })()), shardMat = keep(new T.MeshStandardMaterial({ color: 0x12030c, metalness: .6, roughness: .25, emissive: 0x7a0a40, emissiveIntensity: 1.2, transparent: true, depthWrite: false }));
  const shards = new T.InstancedMesh(shardGeo, shardMat, SN); shards.instanceMatrix.setUsage(T.DynamicDrawUsage); shards.frustumCulled = false; root.add(shards);
  const SH = Array.from({ length: SN }, () => ({ on: false, p: new T.Vector3(), v: new T.Vector3(), r: new T.Vector3(), w: new T.Vector3(), age: 0, life: 1, s: .2, collapse: null })); let sc = 0;
  function shard(p, v, life, s, collapse) { const q = SH[sc]; sc = (sc + 1) % SN; q.on = true; q.p.copy(p); q.v.copy(v); q.age = 0; q.life = life; q.s = s; q.r.set(Math.random() * 6, Math.random() * 6, Math.random() * 6); q.w.set(Math.random() * 8 - 4, Math.random() * 8 - 4, Math.random() * 8 - 4); q.collapse = collapse ? collapse.clone() : null; }
  /* ---------- MINI-SÓIS ---------- */
  const suns = Array.from({ length: 8 }, () => { const g = new T.Group(); g.visible = false; root.add(g); const U = { uT: { value: 0 }, uK: { value: 1 }, uDisp: { value: .12 } }, U2 = { uT: U.uT, uK: { value: .9 }, uDisp: { value: .35 } };
    const core = new T.Mesh(sph, sm(SUN_F, U, false)), cor = new T.Mesh(sph, sm(CORONA_F, U2)); cor.scale.setScalar(1.55); cor.renderOrder = 13; g.add(core, cor);
    const arcs = [0, 1].map(i => { const m = new T.Mesh(keepG(new T.TorusGeometry(1.25, .045, 5, 40, Math.PI * (1.1 + i * .3))), keep(new T.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: .85, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }))); m.renderOrder = 13; g.add(m); return m; });
    return { g, U, U2, arcs, ref: null }; });
  const booms = Array.from({ length: 6 }, () => { const g = new T.Group(); g.visible = false; root.add(g); const UC = { uT: { value: 0 }, uK: { value: 1 }, uDisp: { value: .05 } }, US = { uT: { value: 0 }, uK: { value: 1 }, uHot: { value: 1 }, uDisp: { value: .3 } }, UR = { uT: US.uT, uK: { value: 1 }, uC: { value: new T.Color(1, .72, .25) } };
    const core = new T.Mesh(sphLo, sm(SUN_F, UC, true)), shell = new T.Mesh(sph, sm(SHELL_F, US)) /* 22/11: núcleo aditivo — ao esfriar some em luz, nunca vira bola preta */, ring = new T.Mesh(plane, sm(RING_F, UR, true, UV)); shell.renderOrder = 13; ring.renderOrder = 12; g.add(core, shell, ring); return { g, UC, US, UR, core, shell, ring, t: 9, gy: 0 }; });
  let bc = 0;
  function solarBoom(x, y, z, gy, power = 1) { const B = booms[bc++ % booms.length]; B.g.position.set(x, y, z); B.t = 0; B.gy = gy; B.p = power; B.g.visible = true;
    for (let i = 0; i < (low ? 10 : 22); i++) { _v.set(Math.random() - .5, Math.random() * .8, Math.random() - .5).normalize().multiplyScalar(5 + Math.random() * 6); emit(B.g.position, _v, .5 + Math.random() * .5, .05 + Math.random() * .05, i % 3 ? [1, .7, .2] : [1, .95, .7], -6, 1.8, 2.5); } }
  /* ---------- ESFERA DO ABISMO ---------- */
  const AU = { uT: { value: 0 }, uK: { value: 1 }, uP: { value: 0 }, uDisp: { value: .16 } }, aby = new T.Group(); aby.visible = false; root.add(aby);
  const abyCore = new T.Mesh(sph, sm(ABY_F, AU, false)); aby.add(abyCore);
  const abyRings = [0, 1, 2].map(i => { const m = new T.Mesh(keepG(new T.TorusGeometry(1.5 + i * .25, .035, 5, 48)), keep(new T.MeshBasicMaterial({ color: i === 1 ? 0x1a0028 : 0xb43aff, transparent: true, opacity: .8, blending: i === 1 ? T.NormalBlending : T.AdditiveBlending, depthWrite: false, toneMapped: false }))); aby.add(m); return m; });
  const abyHalo = new T.Mesh(sph, sm(CORONA_F.replace('mix(vec3(1.,.5,.08),vec3(1.,.85,.4),n)', 'mix(vec3(.9,.05,.2),vec3(.7,.15,1.),n)'), { uT: AU.uT, uK: { value: .8 }, uDisp: { value: .4 } })); abyHalo.scale.setScalar(1.6); aby.add(abyHalo);
  let abyRef = null;
  const abyBoom = (() => { const g = new T.Group(); g.visible = false; root.add(g); const U = { uT: { value: 0 }, uK: { value: 1 }, uP: { value: 0 }, uDisp: { value: .35 } }; const core = new T.Mesh(sph, sm(ABY_BOOM_F, U, true)); /* aditivo: o estouro esmaece em luz (sem esfera escura) */
    const vU = { uT: U.uT, uK: { value: 1 }, uDisp: { value: .1 } }, vio = new T.Mesh(sphLo, sm('uniform float uT,uK;varying vec3 vP,vN,vW;void main(){vec3 V=normalize(cameraPosition-vW);float f=abs(dot(normalize(vN),V));gl_FragColor=vec4(vec3(.75,.2,1.)*pow(f,2.)*uK*1.8,pow(f,2.)*uK);}', vU));
    const RN = 18, rays = new T.InstancedMesh(keepG((() => { const c = new T.ConeGeometry(.12, 1, 4); c.translate(0, .5, 0); return c; })()), keep(new T.MeshBasicMaterial({ color: 0x14000e, transparent: true, depthWrite: false })), RN);
    const raysGlow = new T.InstancedMesh(rays.geometry, keep(new T.MeshBasicMaterial({ color: 0xff3ad0, transparent: true, opacity: .55, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false })), RN);
    const UR = { uT: U.uT, uK: { value: 1 }, uC: { value: new T.Color(1, .15, .35) } }, ring = new T.Mesh(plane, sm(RING_F, UR, true, UV));
    for (const m of [rays, raysGlow]) { m.instanceMatrix.setUsage(T.DynamicDrawUsage); m.frustumCulled = false; } g.add(core, vio, rays, raysGlow, ring);
    const dirs = Array.from({ length: RN }, () => new T.Vector3(Math.random() - .5, Math.random() * .9 - .15, Math.random() - .5).normalize());
    return { g, U, vU, UR, core, vio, rays, raysGlow, ring, dirs, t: 9, gy: 0, big: 1 }; })();
  function abyssBoom(x, y, z, gy, big = 1) { const B = abyBoom; B.g.position.set(x, y, z); B.t = 0; B.gy = gy; B.big = big; B.g.visible = true;
    for (let i = 0; i < (low ? 14 : 30) * big; i++) { _v.set(Math.random() - .5, Math.random() - .25, Math.random() - .5).normalize().multiplyScalar((4 + Math.random() * 6) * big); shard(B.g.position, _v, .8 + Math.random() * .6, (.12 + Math.random() * .22) * big, i % 3 === 0 ? B.g.position : null); }
    for (let i = 0; i < (low ? 8 : 18); i++) { _v.set(Math.random() - .5, Math.random() - .3, Math.random() - .5).normalize().multiplyScalar(6 + Math.random() * 5); emit(B.g.position, _v, .45 + Math.random() * .4, .05, i % 2 ? [1, .15, .5] : [.7, .2, 1], 0, 2.5, 3); } }
  /* ---------- ressurreição ---------- */
  const PU = { uT: { value: 0 }, uK: { value: 0 } }, pillar = new T.Mesh(keepG(new T.CylinderGeometry(.9, 1.3, 9, 24, 1, true)), sm(PILLAR_F, PU, true, UV)); pillar.geometry.translate(0, 4.5, 0); pillar.visible = false; pillar.renderOrder = 11; root.add(pillar);
  // gaiola de vidro fraturado (ref. ressurreição): dois dodecaedros de arestas neon giram na subida e estilhaçam no estouro
  const cage = new T.Group(); cage.visible = false; root.add(cage);
  const cageA = new T.LineSegments(keepG(new T.EdgesGeometry(new T.DodecahedronGeometry(1.35))), keep(new T.LineBasicMaterial({ color: 0xff2030, transparent: true, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false })));
  const cageB = new T.LineSegments(keepG(new T.EdgesGeometry(new T.IcosahedronGeometry(.85))), keep(new T.LineBasicMaterial({ color: 0x9a6bff, transparent: true, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false })));
  const cageCore = new T.Mesh(keepG(new T.SphereGeometry(.42, 16, 12)), keep(new T.MeshBasicMaterial({ color: 0xff7a8a, transparent: true, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false })));
  cage.add(cageA, cageB, cageCore); cageA.renderOrder = cageB.renderOrder = cageCore.renderOrder = 12;
  const haloU = { uT: { value: 0 }, uK: { value: 0 }, uC: { value: new T.Color(.9, .05, .2) } }, halo = new T.Mesh(plane, sm(RING_F, haloU, true, UV)); halo.visible = false; root.add(halo);
  let rev = null;
  /* ---------- sangue e penas ---------- */
  const BN = 16, dropGeo = keepG(new T.SphereGeometry(1, 6, 4)), drops = new T.InstancedMesh(dropGeo, keep(new T.MeshStandardMaterial({ color: 0x5a0006, roughness: .2, metalness: .1, emissive: 0x2a0002 })), BN), splats = new T.InstancedMesh(keepG(new T.CircleGeometry(1, 10).rotateX(-Math.PI / 2)), keep(new T.MeshBasicMaterial({ color: 0x3a0004, transparent: true, opacity: .85, depthWrite: false })), BN);
  for (const m of [drops, splats]) { m.instanceMatrix.setUsage(T.DynamicDrawUsage); m.frustumCulled = false; root.add(m); }
  const D = Array.from({ length: BN }, () => ({ on: false, p: new T.Vector3(), vy: 0, gy: 0, splat: -1, s: 1 })); let dc = 0;
  const FN = 24, fGeo = keepG((() => { const s = new T.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(.05, .12, 0, .3); s.quadraticCurveTo(-.04, .12, 0, 0); return new T.ShapeGeometry(s, 4); })()), feathers = new T.InstancedMesh(fGeo, keep(new T.MeshStandardMaterial({ color: 0x0c0a0c, side: T.DoubleSide, roughness: .6, emissive: 0x200408 })), FN);
  feathers.instanceMatrix.setUsage(T.DynamicDrawUsage); feathers.frustumCulled = false; root.add(feathers); const F = Array.from({ length: FN }, () => ({ on: false, p: new T.Vector3(), v: new T.Vector3(), r: 0, age: 0 })); let fc = 0;
  /* ---------- auras das armas ---------- */
  const TINT = { A: [[.75, .55, 1], [1, 1, 1]], B: [[1, .1, .06], [.5, 0, .02]], C: [[1, .85, .4], [1, .55, .1]], D: [[1, .78, .35], [.6, .2, 1]] };
  let auraAcc = 0;
  function api() {}
  return {
    weaponAura(k, r, mode, dt) { auraAcc += dt * (low ? 10 : 24); if (auraAcc < 1) return; auraAcc -= 1; const c = TINT[k][Math.random() < .5 ? 0 : 1];
      _v.set((Math.random() - .5) * .5, .7 + Math.random() * .7, (Math.random() - .5) * .5).applyMatrix4(r.matrixWorld);
      if (k === 'A') emit(_v, _s.set((Math.random() - .5) * .8, Math.random() * .6, (Math.random() - .5) * .8), .8, .02 + Math.random() * .025, c, 0, .6, 1);
      else if (k === 'B') emit(_v, _s.set(0, -.5, 0), 1, .025, [.6, 0, .02], -5, .3, 2.2);
      else if (k === 'C') emit(_v, _s.set((Math.random() - .5) * 1.5, 1 + Math.random(), (Math.random() - .5) * 1.5), .5, .02, c, 0, 1.2, 2);
      else emit(_v, _s.set((Math.random() - .5) * 2, Math.random(), (Math.random() - .5) * 2), .6, .03, c, -2, .8, 1); },
    flashWeapon(k, p, on) { const c = TINT[k][0]; for (let i = 0; i < (low ? 6 : 12); i++) { _v.set(Math.random() - .5, Math.random() - .2, Math.random() - .5).normalize().multiplyScalar(on ? -2 : 3); emit(_s.copy(p).addScaledVector(_v, on ? -.5 : 0).setY(p.y + .5 + Math.random()), _v, .35, .035, c, 0, 2, 2); } },
    feather(p, phase) { const f = F[fc]; fc = (fc + 1) % FN; f.on = true; f.p.copy(p); f.v.set((Math.random() - .5) * 1.2, -.3, (Math.random() - .5) * 1.2); f.r = Math.random() * 6; f.age = 0; },
    blood(p, gy) { const d = D[dc]; dc = (dc + 1) % BN; d.on = true; d.p.copy(p); d.vy = 0; d.gy = gy ?? (p.y - 1.6); d.splat = -1; d.s = .7 + Math.random() * .5; },
    burstAt(p, what) { for (let i = 0; i < 14; i++) { _v.set(Math.random() - .5, Math.random() * .5, Math.random() - .5).normalize().multiplyScalar(3); emit(p, _v, .6, .04, [1, .1, .2], 0, 2, 2); } },
    event(type, d, bodies) {
      if (type === 'gkSuns') { if (d.phase === 'summon') for (const s of d.suns) { const S = suns.find(x => !x.ref) || suns[0]; S.ref = s; S.g.visible = true; }
        if (d.phase === 'boom') { const S = suns.find(x => x.ref === d.sun); if (S) { S.ref = null; S.g.visible = false; } solarBoom(d.sun.x, d.sun.y, d.sun.z, d.gy ?? d.sun.y - .3, 1.9); } }
      if (type === 'gkAbyss') { if (d.phase === 'charge') { abyRef = d.sphere; aby.visible = true; } if (d.phase === 'boom') { aby.visible = false; const gy = d.gy ?? d.sphere.y - .5; abyssBoom(d.sphere.x, d.sphere.y, d.sphere.z, gy, 2.2 + (d.sphere.power || 0) * .6); solarBoom(d.sphere.x, d.sphere.y, d.sphere.z, gy, .9); /* ref.: miolo laranja/branco dentro do estouro magenta */ abyRef = null; } }
      if (type === 'gkPhase') { const a = d.actor, B = bodies && bodies.get(a.id), cy = a.y + 1.2;
        if (d.stage === 'fall') { for (let i = 0; i < 24; i++) { _v.set(Math.random() - .5, Math.random() * .7, Math.random() - .5).normalize().multiplyScalar(2 + Math.random() * 3); emit(_s.set(a.x, cy, a.z), _v, 1, .05, [.9, .05, .1], -3, 1, 1.5); } }
        if (d.stage === 'arise') { abyssBoom(a.x, cy, a.z, a.y, .7); for (let i = 0; i < 10; i++) this.feather(_s.set(a.x + (Math.random() - .5), cy + Math.random(), a.z + (Math.random() - .5)), 2); }
        if (d.stage === 'die') { rev = { a, t: 0, stage: 'die' }; halo.visible = true; halo.position.set(a.x, a.y + .05, a.z); }
        if (d.stage === 'rise' && rev) { rev.stage = 'rise'; rev.t = 0; pillar.visible = true; pillar.position.set(a.x, a.y, a.z); cage.visible = true; }
        if (d.stage === 'burst') { abyssBoom(a.x, cy, a.z, a.y, .75); cage.visible = false; for (let i = 0; i < (low ? 18 : 40); i++) { _v.set(Math.random() - .5, Math.random() - .35, Math.random() - .5).normalize().multiplyScalar(5 + Math.random() * 7); shard(_s.set(a.x, cy + .6, a.z), _v, .9 + Math.random() * .6, .16 + Math.random() * .2, null); } if (rev) { rev.stage = 'burst'; rev.t = 0; } }
        if (d.stage === 'done' && rev) rev.stage = 'end'; }
      // 22/11 — diretor II→III: CARGA (fonte → compressão sobre o corpo caído) e REVELAÇÃO (estilhaços remanescentes)
      if (type === 'gkCine') { const a = d.actor; if (d.stage === 'charge') { if (!rev) rev = { a, t: 0, stage: 'charge' }; rev.stage = 'charge'; rev.t = 0; cage.visible = true; halo.visible = true; }
        if (d.stage === 'reveal' && rev) { rev.stage = 'reveal'; rev.t = 0; } }
      if (type === 'gkBlade') { const e = d.ent; if (d.phase === 'clash') for (let i = 0; i < (low ? 10 : 20); i++) { _v.set(Math.random() - .5, Math.random() - .3, Math.random() - .5).normalize().multiplyScalar(4 + Math.random() * 4); emit(_s.set(d.x, d.y, d.z), _v, .3, .035, i % 2 ? [1, .9, .6] : TINT[e.key][0], -4, 1.5, 3); }
        if (d.phase === 'hit') for (let i = 0; i < 8; i++) { _v.set(Math.random() - .5, Math.random() * .6, Math.random() - .5).normalize().multiplyScalar(3); emit(_s.set(d.x, e.y, d.z), _v, .3, .03, TINT[e.key][0], -3, 1.5, 2.5); }
        if (d.phase === 'land' || d.phase === 'gone') this.flashWeapon(e.key, _s.set(e.x, e.y, e.z), false); }
      if (type === 'gkSpear' && d.phase === 'end') solarBoom(d.spear.x, d.spear.y, d.spear.z, d.spear.y - 1, .45);
      if (type === 'gkFly' && d.phase === 'impact') { const a = d.actor; for (let i = 0; i < 16; i++) { _v.set(Math.random() - .5, .2 + Math.random() * .5, Math.random() - .5).normalize().multiplyScalar(4); emit(_s.set(a.x, a.y + .2, a.z), _v, .5, .05, [.35, .3, .32], -8, 1.2, 1.2); } }
    },
    update(dt, quality = 1, camera) { time += dt; low = quality === 0;
      for (const S of suns) { if (!S.ref) continue; const s = S.ref; if (s.state === 'done' || (s.owner && !s.owner.alive)) { S.ref = null; S.g.visible = false; continue; } /* 22/11: sol cancelado (troca de fase/morte/reset) some — nada de bola parada no ar */ S.g.position.set(s.x, s.y, s.z); const r = (s.state === 'forming' ? out3(s.r) : 1) * 1.7; /* 22/11: raio visual = raio de acerto (1,7 m) */ S.g.scale.setScalar(Math.max(.001, r)); S.U.uT.value = time + s.i; S.U.uK.value = s.state === 'forming' ? .6 + .4 * s.r : 1 + .15 * Math.sin(time * 9 + s.i);
        S.arcs[0].rotation.set(time * 2.1 + s.i, time * 1.3, 0); S.arcs[1].rotation.set(-time * 1.7, s.i + time * .9, time); }
      for (const B of booms) { if (!B.g.visible) continue; B.t += dt; const t = B.t, p = B.p || 1; B.US.uT.value = time; B.UC.uT.value = time;
        const pre = clamp(t / .07, 0, 1), core = t < .07 ? .3 * pre : .3 + out3((t - .07) / .25) * 1.25 * p; B.core.scale.setScalar(core * (1 - ease((t - .35) / .4))); B.UC.uK.value = t < .14 ? 1.6 : 1.2 * (1 - ease((t - .2) / .4));
        B.shell.scale.setScalar(.2 + out3((t - .05) / .5) * 2.6 * p); B.US.uK.value = (1 - ease((t - .25) / .7)); B.US.uHot.value = 1 - ease(t / .25);
        B.ring.position.y = B.gy - B.g.position.y + .04; B.ring.scale.setScalar(.3 + out3(t / .6) * 3.6 * p); B.UR.uK.value = 1 - ease((t - .15) / .6); B.UR.uT.value = time;
        if (t > 1.15) B.g.visible = false; }
      if (abyRef && (abyRef.state === 'done' || (abyRef.owner && !abyRef.owner.alive))) { abyRef = null; aby.visible = false; }
      if (abyRef) { const s = abyRef; aby.position.set(s.x, s.y, s.z); const q = s.k, k = s.state === 'charge' ? (q < .88 ? .05 + .95 * Math.pow(q / .88, 1.7) : 1 - .13 * Math.sin((q - .88) / .12 * Math.PI)) : 1; aby.scale.setScalar(Math.max(.001, 2.6 * k * (1 + (s.power || 0) * .25))); /* 22/11: semente → acúmulo → rachaduras → ~3× → compressão e disparo */ AU.uT.value = time; AU.uP.value = s.k; AU.uK.value = .7 + .6 * k;
        abyRings.forEach((m, i) => { m.rotation.set(time * (1.2 + i * .5) + i, time * (.7 - i * .4), i * 1.1); m.scale.setScalar(.9 + .08 * Math.sin(time * 6 + i)); });
        if (s.state === 'charge' && Math.random() < dt * (low ? 8 : 20)) { _v.set(Math.random() - .5, Math.random() - .5, Math.random() - .5).normalize().multiplyScalar(2.2 + aby.scale.x * 1.5); emit(_s.copy(aby.position).add(_v), _v.multiplyScalar(-1.6), .55, .06, Math.random() < .5 ? [.7, .1, 1] : [1, .1, .2], 0, 0, 2); } }
      { const B = abyBoom; if (B.g.visible) { B.t += dt; const t = B.t, k = B.big; B.U.uT.value = time;
          const pulse = t < .5 ? out3(t / .2) * (1 + .15 * Math.sin(t * 40)) : 1 - ease((t - .5) / .4) * .85; B.core.scale.setScalar(Math.max(.01, 1.6 * k * pulse)); B.U.uK.value = 1.3 - ease((t - .55) / .45);
          B.vio.scale.setScalar(.6 * k * (1 + t * 2)); B.vU.uK.value = 1 - ease(t / .5);
          B.ring.position.y = B.gy - B.g.position.y + .05; B.ring.scale.setScalar(.5 + out3(t / .7) * 4.2 * k); B.UR.uK.value = 1 - ease((t - .2) / .6);
          const L = (t < .35 ? out3(t / .35) : 1 - ease((t - .5) / .5)) * 3.2 * k; for (let i = 0; i < B.dirs.length; i++) { _q.setFromUnitVectors(_s.set(0, 1, 0), B.dirs[i]); _m.compose(_v.set(0, 0, 0), _q, _s.set(1 + k * .3, Math.max(.001, L * (.6 + (i % 3) * .25)), 1 + k * .3)); B.rays.setMatrixAt(i, _m); _m.compose(_v, _q, _s.set(1.8 + k * .3, Math.max(.001, L * (.65 + (i % 3) * .25)), 1.8 + k * .3)); B.raysGlow.setMatrixAt(i, _m); }
          B.rays.instanceMatrix.needsUpdate = B.raysGlow.instanceMatrix.needsUpdate = true; if (t > 1.2) B.g.visible = false; } }
      if (rev) { rev.t += dt; const a = rev.a; haloU.uT.value = PU.uT.value = time; halo.position.set(a.x, a.y + .05, a.z);
        if (rev.stage === 'die') { haloU.uK.value = ease(rev.t / 1.5) * .8; halo.scale.setScalar(1.5 + rev.t * .5); }
        if (rev.stage === 'charge') { const k = ease(rev.t / 1.4); haloU.uK.value = .8 + .2 * k; halo.scale.setScalar(Math.max(.6, 2.6 - 1.8 * k));
          if (Math.random() < dt * (low ? 18 : 42)) { _v.set(Math.random() - .5, Math.random() * .7 - .1, Math.random() - .5).normalize(); const R = 3.2 + Math.random() * 2; emit(_s.set(a.x, a.y + .6, a.z).addScaledVector(_v, R), _v.multiplyScalar(-R * 1.9), .5, .04, Math.random() < .5 ? [1, .12, .2] : [.6, .2, 1], 0, .2, 3); } }
        if (rev.stage === 'reveal' && Math.random() < dt * (low ? 6 : 14)) { _v.set(Math.random() - .5, .4 + Math.random() * .6, Math.random() - .5).normalize().multiplyScalar(1.2); emit(_s.set(a.x + (Math.random() - .5) * 2, a.y + .4 + Math.random() * 2.4, a.z + (Math.random() - .5) * 2), _v, 1.2, .03, [1, .2, .25], .4, .6, 2); }
        if (cage.visible && rev.stage === 'charge') { const k = ease(rev.t / 1.4); cage.position.set(a.x, a.y + .55, a.z); cage.scale.setScalar(.22 + .38 * k); cageA.rotation.set(time * 2.2, time * 2.9, 0); cageB.rotation.set(-time * 3.1, time * 1.4, time * 2); cageA.material.opacity = .25 + .6 * k; cageB.material.opacity = .5 * k; cageCore.material.opacity = .35 + .5 * k; cageCore.scale.setScalar(.15 + .35 * k * (1 + .15 * Math.sin(time * 40))); }
        else if (cage.visible) { const k = ease(rev.t / 1.4); cage.position.set(a.x, a.y + .8 + 1.1 * k, a.z); cage.scale.setScalar(.6 + .9 * k); cageA.rotation.set(time * .9, time * 1.3, 0); cageB.rotation.set(-time * 1.6, time * .7, time); cageA.material.opacity = .35 + .65 * k * (.75 + .25 * Math.sin(time * 30)); cageB.material.opacity = .6 * k; cageCore.material.opacity = .25 + .45 * k; cageCore.scale.setScalar(.25 + k * (.45 + .1 * Math.sin(time * 25))); }
        if (rev.stage === 'rise') { haloU.uK.value = 1; PU.uK.value = ease(rev.t / .8); pillar.scale.set(1, ease(rev.t / 1.2), 1); if (Math.random() < dt * 30) { _v.set(Math.random() - .5, Math.random() * .2, Math.random() - .5).normalize().multiplyScalar(4); shard(_s.set(a.x, a.y + .5, a.z).add(_v), _v.multiplyScalar(-.9), .9, .12 + Math.random() * .1, null); } }
        if (rev.stage === 'burst' || rev.stage === 'end' || rev.stage === 'reveal') { PU.uK.value = Math.max(0, PU.uK.value - dt * 1.6); haloU.uK.value = Math.max(0, haloU.uK.value - dt); if (PU.uK.value <= 0 && haloU.uK.value <= 0) { pillar.visible = halo.visible = false; rev = null; } } }
      // partículas
      for (let i = 0; i < PN; i++) { const q = P[i]; if (!q.on) { _m.makeScale(0, 0, 0); parts.setMatrixAt(i, _m); continue; } q.age += dt; if (q.age >= q.life) { q.on = false; _m.makeScale(0, 0, 0); parts.setMatrixAt(i, _m); continue; }
        q.v.y += q.g * dt; q.v.multiplyScalar(Math.exp(-q.drag * dt)); q.p.addScaledVector(q.v, dt); const k = 1 - q.age / q.life, sp = q.v.length(); _q.setFromUnitVectors(_s.set(0, 1, 0), sp > .01 ? _v.copy(q.v).divideScalar(sp) : _v.set(0, 1, 0));
        _m.compose(q.p, _q, _s.set(q.s * k, q.s * k * (1 + sp * .08 * q.str), q.s * k)); parts.setMatrixAt(i, _m); }
      parts.instanceMatrix.needsUpdate = true; parts.instanceColor.needsUpdate = true;
      for (let i = 0; i < SN; i++) { const q = SH[i]; if (!q.on) { _m.makeScale(0, 0, 0); shards.setMatrixAt(i, _m); continue; } q.age += dt; if (q.age >= q.life) { q.on = false; _m.makeScale(0, 0, 0); shards.setMatrixAt(i, _m); continue; }
        const u = q.age / q.life; if (q.collapse && u > .55) q.p.lerp(q.collapse, Math.min(1, dt * 8)); else { q.v.multiplyScalar(Math.exp(-2.2 * dt)); q.p.addScaledVector(q.v, dt); } q.r.addScaledVector(q.w, dt); _e.set(q.r.x, q.r.y, q.r.z); _q.setFromEuler(_e);
        const s = q.s * (u < .1 ? u / .1 : 1 - ease((u - .6) / .4)); _m.compose(q.p, _q, _s.set(s * .5, s * 1.6, s * .5)); shards.setMatrixAt(i, _m); }
      shards.instanceMatrix.needsUpdate = true; shardMat.emissiveIntensity = 1 + .4 * Math.sin(time * 20);
      for (let i = 0; i < BN; i++) { const d = D[i]; if (!d.on) { _m.makeScale(0, 0, 0); drops.setMatrixAt(i, _m); splats.setMatrixAt(i, _m); continue; }
        if (d.splat < 0) { d.vy -= 9.8 * dt; d.p.y += d.vy * dt; if (d.p.y <= d.gy + .01) { d.p.y = d.gy + .012; d.splat = 0; } _m.compose(d.p, _q.identity(), _s.set(.012 * d.s, .02 * d.s * (1 + Math.min(2, -d.vy * .1)), .012 * d.s)); drops.setMatrixAt(i, _m); _m.makeScale(0, 0, 0); splats.setMatrixAt(i, _m); }
        else { d.splat += dt; const k = d.splat < .15 ? d.splat / .15 : 1; _m.makeScale(0, 0, 0); drops.setMatrixAt(i, _m); _m.compose(d.p, _q.identity(), _s.set(.05 * d.s * k, 1, .05 * d.s * k)); splats.setMatrixAt(i, _m); if (d.splat > 3.5) d.on = false; } }
      drops.instanceMatrix.needsUpdate = splats.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < FN; i++) { const f = F[i]; if (!f.on) { _m.makeScale(0, 0, 0); feathers.setMatrixAt(i, _m); continue; } f.age += dt; f.v.y = Math.max(-.7, f.v.y - dt * .6); f.p.x += (f.v.x + Math.sin(time * 2 + i) * .4) * dt; f.p.y += f.v.y * dt; f.p.z += (f.v.z + Math.cos(time * 1.7 + i) * .4) * dt; f.r += dt * 2;
        if (f.age > 4) f.on = false; _e.set(Math.sin(f.r) * .8, f.r, Math.cos(f.r * .7) * .6); _q.setFromEuler(_e); const s = f.age > 3.4 ? (4 - f.age) / .6 : 1; _m.compose(f.p, _q, _s.set(s, s, s)); feathers.setMatrixAt(i, _m); }
      feathers.instanceMatrix.needsUpdate = true; },
    stats() { return { suns: suns.filter(s => s.ref).length, booms: booms.filter(b => b.g.visible).length, abyss: aby.visible, abyBoom: abyBoom.g.visible, parts: P.filter(p => p.on).length, shards: SH.filter(s => s.on).length, drops: D.filter(d => d.on).length, feathers: F.filter(f => f.on).length, rev: !!rev }; },
    clear() { cage.visible = false; for (const S of suns) { S.ref = null; S.g.visible = false; } for (const B of booms) B.g.visible = false; aby.visible = false; abyRef = null; abyBoom.g.visible = false; for (const q of P) q.on = false; for (const q of SH) q.on = false; for (const d of D) d.on = false; for (const f of F) f.on = false; rev = null; pillar.visible = halo.visible = false; },
    dispose() { this.clear(); scene.remove(root); for (const g of geos) g.dispose(); for (const m of mats) m.dispose(); for (const m of [parts, shards, drops, splats, feathers, abyBoom.rays, abyBoom.raysGlow]) m.dispose?.(); },
    solarBoom, abyssBoom
  };
}
