import { softParticles, groundDecals, groundNormal, ribbons, lightningBolt, smooth, easeOut, hash } from './celestial-fxkit3d.js';
/**
 * MOD 247 — VFX do VHAZRAEL (só desenha o estado de vhazrael3d.js) e peças procedurais do encontro:
 *  • Lâmina do Trono (espada do bispo; o Bispo1-lod.glb não traz arma) e criaturas de muitas patas (lacaio e colossal).
 *  • Espinhos finos, longos e DIAGONAIS (pretos, arestas violeta), rachadura no chão antes de cada um.
 *  • Ruptura do Trono: fitas negras/carmim enroladas na lâmina, núcleo branco, cruz vermelha breve; onda ACHATADA e
 *    larga de borda irregular (não é tubo), domo denso, coluna e linhas radiais no impacto.
 *  • Entidade do Terror: silhueta colossal atrás do bispo, olhos vermelhos com centro claro, bocarra serrilhada que
 *    respira; mãos negras retorcidas com boca na palma saindo de rachaduras.
 *  • Extinção Orbital: cena orbital ISOLADA (planeta estilizado com ciclone vermelho e o meteoro vindo do espaço, sem
 *    renderizar um planeta no mapa), meteoro montanhoso com fendas de magma e plasma entrando no céu da arena e o
 *    impacto em hemisfério negro/carmim com núcleo branco. Estética: volumes recortados, três camadas, sem fumaça.
 */
const NOISE = `float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){return n2(p)*.5+n2(p*2.03+1.7)*.3+n2(p*4.1+3.1)*.2;}
float h3(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float n3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}`;
const TONE = `
 #include <tonemapping_fragment>
 #include <colorspace_fragment>`;
const LIT_V = `varying vec3 vN; varying vec3 vV; varying vec3 vP; varying vec2 vUv; void main(){ vUv=uv; vP=position; vec4 w=modelMatrix*vec4(position,1.); vN=normalize(mat3(modelMatrix)*normal); vV=cameraPosition-w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
// hemisfério do impacto (espada e meteoro): casca negra rasgada, corpo carmim, núcleo branco; erosão por limiar
const DOME_F = `${NOISE} uniform float time, erode, heat; varying vec3 vN; varying vec3 vV; varying vec3 vP;
void main(){ float lat=clamp(vP.y,0.,1.), ang=atan(vP.z,vP.x); float er=fbm(vec2(ang*3.,lat*5.-time*.5)); if(er<erode) discard;
 float f=1.-abs(dot(normalize(vN),normalize(vV))), body=fbm(vec2(ang*2.6+time*.7+lat*2.,lat*3.6-time*1.2));
 float ink=smoothstep(.79,.85,1.-abs(fbm(vec2(ang*3.4+lat*4.2,lat*1.5+time*.3)*vec2(1.2,5.))*2.-1.));
 vec3 c=mix(vec3(.35,0.,.02),vec3(1.,.04,.08),smoothstep(.35,.62,body)); c=mix(c,vec3(1.,.55,.4),pow(1.-f,4.)*heat); c=mix(c,vec3(1.,.97,.92),pow(1.-f,10.)*heat);
 c=mix(c,vec3(.01,0.,.008),ink); c+=vec3(1.,.2,.5)*smoothstep(erode+.07,erode,er)*step(.01,erode)*1.5; gl_FragColor=vec4(c,1.);${TONE}
}`;
// onda achatada: parede baixa de energia com topo irregular (uv.x ao longo da largura, uv.y altura)
const WAVE_F = `${NOISE} uniform float time, alpha; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main(){ float x=vUv.x, y=vUv.y; float top=.55+.45*fbm(vec2(x*7.-time*4.,time)); float edge=smoothstep(0.,.06,x)*smoothstep(1.,.94,x); if(y>top*edge*alpha) discard;
 float rim=smoothstep(top*edge*alpha-.12,top*edge*alpha,y); float streak=smoothstep(.75,.8,n2(vec2(x*20.,y*3.-time*10.)));
 vec3 c=vec3(.012,0.,.02); c=mix(c,vec3(.85,.05,.55),rim); c=mix(c,vec3(1.,.9,1.),streak*.6*(1.-rim)); c=mix(c,vec3(1.,.95,1.),smoothstep(.04,0.,y)*.8);
 gl_FragColor=vec4(c,1.);${TONE}
}`;
// planeta estilizado da cena orbital: nuvens em rotação, atmosfera e o ciclone vermelho sobre a dimensão
const PLANET_F = `${NOISE} uniform float time, storm; varying vec3 vN; varying vec3 vV; varying vec3 vP;
void main(){ vec3 p=normalize(vP); float lon=atan(p.z,p.x), lat=asin(p.y); vec2 eye=vec2(1.8,.62); vec2 q=vec2(lon,lat)-eye; float r=length(q);
 float sw=atan(q.y,q.x)+r*14.-time*.6; float cl=fbm(vec2(lon*5.+time*.03,lat*7.)+vec2(cos(sw),sin(sw))*smoothstep(.6,0.,r)*1.4);
 vec3 c=mix(vec3(.04,.1,.32),vec3(.92,.94,1.),smoothstep(.42,.7,cl)); float red=smoothstep(.34,.0,r+(cl-.5)*.15)*storm;
 c=mix(c,mix(vec3(.55,0.,.02),vec3(.95,.05,.08),smoothstep(.2,.7,cl)),red); c=mix(c,vec3(.04,0.,0.),smoothstep(.035,0.,r)*storm);
 float ring=exp(-pow((r-.12-fract(time*.3)*.18)/.006,2.))*storm; c+=vec3(1.,.15,.15)*ring;
 float f=1.-abs(dot(normalize(vN),normalize(vV))); c+=vec3(.25,.55,1.)*pow(f,3.)*1.4; gl_FragColor=vec4(c,1.);${TONE}
}`;
// meteoro: rocha com fendas de magma; plasma (aditivo) na frente durante a entrada
const ROCK_F = `${NOISE} uniform float time, heat; varying vec3 vN; varying vec3 vV; varying vec3 vP;
void main(){ float c1=n3(vP*1.6), cr=smoothstep(.06,.0,abs(n3(vP*2.4+3.)-.5))+smoothstep(.04,.0,abs(n3(vP*5.)-.5))*.6; float l=max(0.,dot(normalize(vN),normalize(vec3(.4,1.,.3))));
 vec3 c=vec3(.05,.03,.035)+vec3(.12,.07,.06)*l*c1; c=mix(c,vec3(1.,.35,.05)*(1.+heat),clamp(cr,0.,1.)*(.4+.6*heat)); gl_FragColor=vec4(c,1.);${TONE}
}`;
const PLASMA_F = `uniform float heat; varying vec3 vN; varying vec3 vV; void main(){ float f=1.-abs(dot(normalize(vN),normalize(vV))); float a=pow(f,1.5)*heat; vec3 c=mix(vec3(1.,.45,.08),vec3(1.,.95,.85),pow(1.-f,2.)); gl_FragColor=vec4(c*a,a); }`;

/* ---------------- peças procedurais ---------------- */
/** Lâmina do Trono: montante reto negro, sulco carmim aceso, guarda em auréola de espinhos (eco da auréola do bispo). +Y = lâmina. */
export function buildThroneBlade(T) {
  const root = new T.Group(); root.name = 'LaminaDoTrono'; const geos = [], mats = [];
  const black = new T.MeshStandardMaterial({ color: 0x0c0608, metalness: .8, roughness: .28, emissive: 0x1a0204, flatShading: true, side: T.DoubleSide });
  const red = new T.MeshBasicMaterial({ color: 0xff1030, toneMapped: false }), gold = new T.MeshStandardMaterial({ color: 0x4a2a10, metalness: .9, roughness: .3, emissive: 0x3a0806, flatShading: true });
  mats.push(black, red, gold);
  const sh = new T.Shape(); sh.moveTo(-.07, 0); sh.lineTo(-.075, 1.15); sh.lineTo(-.03, 1.45); sh.lineTo(0, 1.55); sh.lineTo(.03, 1.45); sh.lineTo(.075, 1.15); sh.lineTo(.07, 0); sh.lineTo(-.07, 0);
  const bg = new T.ExtrudeGeometry(sh, { depth: .03, bevelEnabled: true, bevelThickness: .012, bevelSize: .012, bevelSegments: 1 }); bg.translate(0, .1, -.015); geos.push(bg); root.add(new T.Mesh(bg, black));
  const fg = new T.BoxGeometry(.018, 1.2, .05); fg.translate(0, .72, 0); geos.push(fg); root.add(new T.Mesh(fg, red));
  const halo = new T.TorusGeometry(.15, .018, 5, 18); geos.push(halo); const hm = new T.Mesh(halo, gold); hm.position.y = .06; root.add(hm);
  const sp = new T.ConeGeometry(.018, .12, 4); geos.push(sp); for (let i = 0; i < 10; i++) { const m = new T.Mesh(sp, gold), a = i / 10 * Math.PI * 2; m.position.set(Math.cos(a) * .19, .06 + Math.sin(a) * .19, 0); m.rotation.z = a - Math.PI / 2; root.add(m); }
  const grip = new T.CylinderGeometry(.025, .028, .42, 7); grip.translate(0, -.19, 0); geos.push(grip); root.add(new T.Mesh(grip, black));
  const pm = new T.OctahedronGeometry(.05, 0); geos.push(pm); const p = new T.Mesh(pm, red); p.position.y = -.42; root.add(p);
  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
  Object.assign(root.userData, { tipA: new T.Vector3(0, .15, 0), tipB: new T.Vector3(0, 1.6, 0), fx: new T.Group(), tick(time, fury = 0, swing = 0) { red.color.setRGB(1, .04 + .05 * Math.sin(time * 6) + fury * .05, .12 + swing * .1); }, updateFx(time, fury, low, visible) { root.userData.fx.visible = visible; },
    dispose() { for (const g of geos) g.dispose(); for (const m of mats) m.dispose(); } });
  return root;
}
/** Criatura de muitas patas: corpo achatado e angular, oito patas articuladas em garra, boca central em losango com
    dentes serrilhados e dois pontos brancos de olhos. update(dt, a) anima a marcha pela velocidade e o bote pelo golpe. */
export function buildCrawler(T, colossal = false) {
  const g = new T.Group(); g.name = colossal ? 'CrawlerColossal' : 'Crawler'; const geos = [], mats = [];
  const skin = new T.MeshStandardMaterial({ color: 0x050304, roughness: .5, metalness: .2, emissive: 0x1a0104, emissiveIntensity: .6, flatShading: true }); mats.push(skin);
  const mouthM = new T.MeshBasicMaterial({ color: 0x3a0006, toneMapped: false }), toothM = new T.MeshStandardMaterial({ color: 0xe8c6c0, roughness: .5, flatShading: true }), eyeM = new T.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }); mats.push(mouthM, toothM, eyeM);
  const body = new T.Mesh(new T.OctahedronGeometry(.55, 0), skin); body.scale.set(1.1, .42, .95); body.position.y = .55; g.add(body); geos.push(body.geometry);
  const head = new T.Group(); head.position.set(0, .55, .42); g.add(head);
  const mouth = new T.Mesh(new T.CircleGeometry(.24, 4), mouthM); mouth.scale.set(1.4, .55, 1); mouth.position.z = .12; head.add(mouth); geos.push(mouth.geometry);
  const tg = new T.ConeGeometry(.018, .07, 3); geos.push(tg); for (let i = 0; i < 18; i++) { const top = i % 2, u = Math.floor(i / 2) / 8 - .5, t = new T.Mesh(tg, toothM); t.position.set(u * .55, (top ? .06 : -.06) * (1 - Math.abs(u) * 1.6), .13); t.rotation.z = top ? Math.PI : 0; head.add(t); }
  for (const sx of [-1, 1]) { const e = new T.Mesh(new T.SphereGeometry(.022, 6, 4), eyeM); e.position.set(sx * .06, 0, .14); head.add(e); geos.push(e.geometry); }
  const legs = [], segG = new T.CylinderGeometry(.035, .022, 1, 4); segG.translate(0, -.5, 0); geos.push(segG); const clawG = new T.ConeGeometry(.04, .2, 4); clawG.translate(0, -.1, 0); geos.push(clawG);
  for (let i = 0; i < 8; i++) { const side = i < 4 ? -1 : 1, k = i % 4, hip = new T.Group(); hip.position.set(side * .38, .55, .3 - k * .22); hip.rotation.y = side * (.4 + k * .35); g.add(hip);
    const up = new T.Mesh(segG, skin); up.scale.set(1, .55, 1); const knee = new T.Group(); knee.position.y = -.55; up.add(knee); const lo = new T.Mesh(segG, skin); lo.scale.set(1, .65, 1); knee.add(lo); const claw = new T.Mesh(clawG, skin); claw.position.y = -.65; lo.add(claw);
    const thigh = new T.Group(); thigh.add(up); hip.add(thigh); legs.push({ thigh, knee, side, k, ph: (k % 2) * Math.PI + (side > 0 ? Math.PI / 2 : 0) }); }
  g.scale.setScalar(colossal ? 3.2 : 1); g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
  let gait = 0;
  return { group: g, mats: [skin], update(dt, a) {
    const sp = a.speed || 0, atk = a.act && a.act.type === 'melee' ? Math.sin(Math.min(1, a.act.t / a.act.dur) * Math.PI) : 0; gait += dt * (2 + sp * 2.6);
    for (const L of legs) { const s = Math.sin(gait + L.ph); L.thigh.rotation.z = L.side * (1.05 - .25 * Math.max(0, s) * Math.min(1, sp)) ; L.thigh.rotation.x = Math.cos(gait + L.ph) * .45 * Math.min(1, sp / 2) - atk * (L.k < 2 ? .9 : 0); L.knee.rotation.z = -L.side * (1.4 + .3 * s * Math.min(1, sp)); }
    body.position.y = .55 + Math.abs(Math.sin(gait * 2)) * .03 * Math.min(1, sp) + atk * .18; head.position.y = body.position.y; head.position.z = .42 + atk * .25; mouth.scale.y = .55 + atk * .5 + .05 * Math.sin(gait * 3);
  }, dispose() { for (const x of geos) x.dispose(); for (const m of mats) m.dispose(); } };
}

/* ---------------- VFX do encontro ---------------- */
export function createVhazraelVFX(T, scene, { ground = () => 0 } = {}) {
  const root = new T.Group(); root.name = 'VhazraelVFX'; scene.add(root); const uTime = { value: 0 }, geos = [], mats = [];
  const M = new T.Matrix4(), Q = new T.Quaternion(), S = new T.Vector3(), P = new T.Vector3(), E = new T.Euler(), up = new T.Vector3(0, 1, 0), D = new T.Vector3(), cam = new T.Vector3(), nrm = [0, 1, 0];
  const glow = softParticles(T, 900), rib = ribbons(T, 1200, { flow: 14 }), decals = groundDecals(T, 48); root.add(glow.mesh, rib.mesh, decals.mesh);
  const inst = (geo, mat, n) => { const m = new T.InstancedMesh(geo, mat, n); m.frustumCulled = false; m.count = 0; root.add(m); geos.push(geo); mats.push(mat); return m; };
  const spikeG = new T.ConeGeometry(.11, 1, 4); spikeG.translate(0, .5, 0); const spikes = inst(spikeG, new T.MeshStandardMaterial({ color: 0x040006, roughness: .25, metalness: .5, emissive: 0x3a0858, emissiveIntensity: .7, flatShading: true }), 140);
  const shardG = new T.OctahedronGeometry(1, 0); shardG.scale(.5, 1.2, .5); const shards = inst(shardG, new T.MeshStandardMaterial({ color: 0x0a0608, roughness: .5, metalness: .3, emissive: 0x2a0410, emissiveIntensity: .7, flatShading: true }), 300);
  const domeMat = new T.ShaderMaterial({ vertexShader: LIT_V, fragmentShader: DOME_F, uniforms: { time: uTime, erode: { value: 0 }, heat: { value: 1 } }, side: T.DoubleSide, toneMapped: false, fog: false }); mats.push(domeMat);
  const domeG = new T.SphereGeometry(1, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2); geos.push(domeG); const dome = new T.Mesh(domeG, domeMat); dome.frustumCulled = false; dome.visible = false; root.add(dome);
  const megaMat = domeMat.clone(); megaMat.uniforms = { time: uTime, erode: { value: 0 }, heat: { value: 1 } }; mats.push(megaMat); const mega = new T.Mesh(domeG, megaMat); mega.frustumCulled = false; mega.visible = false; root.add(mega);
  // onda achatada: tira vertical dinâmica (colunas pela largura), reconstruída na frente real da onda
  const WC = 16, wPos = new Float32Array((WC + 1) * 2 * 3), wUv = new Float32Array((WC + 1) * 2 * 2), wIdx = []; for (let i = 0; i < WC; i++) { const a = i * 2; wIdx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  for (let i = 0; i <= WC; i++) wUv.set([i / WC, 0, i / WC, 1], i * 4);
  const waveG = new T.BufferGeometry(); waveG.setAttribute('position', new T.BufferAttribute(wPos, 3).setUsage(T.DynamicDrawUsage)); waveG.setAttribute('uv', new T.BufferAttribute(wUv, 2)); waveG.setIndex(wIdx); geos.push(waveG);
  const waveMat = new T.ShaderMaterial({ vertexShader: LIT_V, fragmentShader: WAVE_F, uniforms: { time: uTime, alpha: { value: 1 } }, side: T.DoubleSide, toneMapped: false, fog: false }); mats.push(waveMat);
  const wave = new T.Mesh(waveG, waveMat); wave.frustumCulled = false; wave.visible = false; root.add(wave);
  // entidade do terror (silhueta colossal) e mãos dentadas
  const ink = new T.MeshBasicMaterial({ color: 0x020001, fog: false }), eyeR = new T.MeshBasicMaterial({ color: 0xff1a1a, toneMapped: false, fog: false }), eyeW = new T.MeshBasicMaterial({ color: 0xfff4f0, toneMapped: false, fog: false }), toothM = new T.MeshBasicMaterial({ color: 0xff5a6a, toneMapped: false, fog: false }); mats.push(ink, eyeR, eyeW, toothM);
  const ent = new T.Group(); ent.visible = false; root.add(ent);
  { const hd = new T.Mesh(new T.IcosahedronGeometry(1, 1), ink); hd.scale.set(3.4, 2.6, 1.6); ent.add(hd); geos.push(hd.geometry);
    for (let i = 0; i < 9; i++) { const sp = new T.Mesh(new T.ConeGeometry(.35, 3 + (i % 3), 4), ink); const a = -1.2 + i * .3; sp.position.set(Math.sin(a) * 3, 2 + Math.cos(a) * 1.4, -.4); sp.rotation.z = -a; ent.add(sp); geos.push(sp.geometry); }
    for (const sx of [-1, 1]) { const ring = new T.Mesh(new T.TorusGeometry(.55, .16, 6, 20), eyeR); ring.position.set(sx * 1.35, .7, 1.45); ent.add(ring); const c = new T.Mesh(new T.CircleGeometry(.22, 12), eyeW); c.position.set(sx * 1.35, .7, 1.52); ent.add(c); geos.push(ring.geometry, c.geometry); }
    const jaw = new T.Group(); jaw.position.set(0, -.7, 1.2); ent.add(jaw); ent.userData.jaw = jaw; const tg = new T.ConeGeometry(.12, .7, 4); geos.push(tg);
    for (let r = 0; r < 2; r++) for (let i = 0; i < 13; i++) { const t = new T.Mesh(tg, toothM), u = i / 12 - .5; t.position.set(u * 4, r ? -.55 : .35, .2 - Math.abs(u) * .6); t.rotation.z = r ? 0 : Math.PI; (r ? jaw : ent).add(t); if (!r) t.position.y -= .7; } }
  const handG = (() => { const g = new T.Group(); const palm = new T.Mesh(new T.OctahedronGeometry(.32, 0), ink); palm.scale.set(1, 1.3, .55); g.add(palm); geos.push(palm.geometry);
    const fg = new T.ConeGeometry(.07, .7, 4); fg.translate(0, .35, 0); geos.push(fg); g.userData.f = [];
    for (let i = 0; i < 5; i++) { const piv = new T.Group(); piv.position.set(-.24 + i * .12, .35, 0); piv.rotation.z = (i - 2) * -.18; const f = new T.Mesh(fg, ink); piv.add(f); const f2 = new T.Mesh(fg, ink); f2.position.y = .66; f2.scale.setScalar(.8); f.add(f2); g.add(piv); g.userData.f.push(piv); }
    const m = new T.Mesh(new T.CircleGeometry(.14, 4), toothM); m.scale.set(1.5, .5, 1); m.position.set(0, .05, .19); g.add(m); geos.push(m.geometry); return g; })();
  const hands = Array.from({ length: 8 }, () => { const h = handG.clone(); h.userData.f = h.children.filter(c => c.isGroup); h.visible = false; root.add(h); return h; });
  // cena orbital isolada
  const oScene = new T.Scene(), oCam = new T.PerspectiveCamera(46, 1, .5, 6000); oScene.background = new T.Color(0x01010a);
  const planetMat = new T.ShaderMaterial({ vertexShader: LIT_V, fragmentShader: PLANET_F, uniforms: { time: uTime, storm: { value: 0 } }, toneMapped: false }); mats.push(planetMat);
  const planet = new T.Mesh(new T.SphereGeometry(400, 64, 40), planetMat); oScene.add(planet); geos.push(planet.geometry);
  { const n = 1600, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const a = hash(i) * 6.283, b = Math.acos(2 * hash(i + 99) - 1), r = 3000; pos.set([Math.sin(b) * Math.cos(a) * r, Math.cos(b) * r, Math.sin(b) * Math.sin(a) * r], i * 3); }
    const sg = new T.BufferGeometry(); sg.setAttribute('position', new T.BufferAttribute(pos, 3)); geos.push(sg); const sm = new T.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false }); mats.push(sm); oScene.add(new T.Points(sg, sm)); }
  const rockG = new T.IcosahedronGeometry(1, 3); { const p = rockG.attributes.position, v = new T.Vector3(); for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const k = 1 + (hash(Math.floor(v.x * 3) * 7 + Math.floor(v.y * 3) * 13 + Math.floor(v.z * 3) * 29) - .5) * .35 + Math.sin(v.x * 4) * .06; v.multiplyScalar(k); v.y *= .85; p.setXYZ(i, v.x, v.y, v.z); } rockG.computeVertexNormals(); } geos.push(rockG);
  const rockMat = new T.ShaderMaterial({ vertexShader: LIT_V, fragmentShader: ROCK_F, uniforms: { time: uTime, heat: { value: 0 } }, toneMapped: false, fog: false }); mats.push(rockMat);
  const plasmaMat = new T.ShaderMaterial({ vertexShader: LIT_V, fragmentShader: PLASMA_F, uniforms: { heat: { value: 0 } }, transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false, fog: false }); mats.push(plasmaMat);
  const mkMeteor = () => { const g = new T.Group(); g.add(new T.Mesh(rockG, rockMat)); const pl = new T.Mesh(rockG, plasmaMat); pl.scale.setScalar(1.18); g.add(pl); const tr = new T.Mesh(new T.ConeGeometry(.95, 6, 16, 1, true), plasmaMat); tr.position.y = 3.4; g.add(tr); geos.push(tr.geometry); g.traverse(o => { o.frustumCulled = false; }); return g; };
  const meteorO = mkMeteor(); meteorO.scale.setScalar(26); oScene.add(meteorO); const meteor = mkMeteor(); meteor.visible = false; root.add(meteor);
  oScene.add(new T.AmbientLight(0xffffff, .4));
  const bolt = Array.from({ length: 30 }, () => [0, 0, 0, 0, 0, 0, 0]); let time = 0, low = false, sn = 0, kn = 0, hn = 0;
  const MAG = [1, .2, .8], RED = [1, .05, .12], VIO = [.6, .25, 1], WHT = [1, .95, 1], c4 = (c, a) => [c[0], c[1], c[2], a];
  function spike(x, y, z, lx, lz, h, k, w = 1) { if (kn >= 140 || k <= .01) return; D.set(lx * .62, 1, lz * .62).normalize(); Q.setFromUnitVectors(up, D); P.set(x, y, z); S.set(w, h * k, w); M.compose(P, Q, S); spikes.setMatrixAt(kn++, M); }
  function shard(x, y, z, s, rx, ry, rz, sy) { if (sn >= 300 || s <= .005) return; P.set(x, y, z); Q.setFromEuler(E.set(rx, ry, rz)); S.set(s, sy || s, s); M.compose(P, Q, S); shards.setMatrixAt(sn++, M); }
  function boltRib(seed, ax, ay, az, bx, by, bz, w, col, a) { const n = lightningBolt(seed, ax, ay, az, bx, by, bz, bolt, { depth: 1, jag: .4, branches: .3 }); for (let i = 0; i < n; i++) { const q = bolt[i]; rib.seg(q[0], q[1], q[2], q[3], q[4], q[5], w * q[6], w * q[6] * .8, c4(col, a), c4(col, a * .8)); } }

  function drawThorns(s) {
    for (const p of s.spikes) {
      const lx = p.lx, lz = p.lz, gy = p.y;
      if (p.phase === 'warn') { const k = p.t / p.warn; groundNormal(ground, p.x, p.z, nrm); decals.add(p.x, gy, p.z, .55 + k * .2, .7, .1, 1, .6 + .4 * k, 1, k, p.id, nrm); // rachadura no chão mostra posição e direção
        rib.seg(p.x, gy + .05, p.z, p.x + lx * s.T.len * k, gy + .05, p.z + lz * s.T.len * k, .07, .03, c4(MAG, .9), c4(MAG, .5)); if (k > .6) shard(p.x, gy + .05, p.z, .07, k * 4, p.id, 0); continue; }
      const k = p.phase === 'active' ? easeOut(Math.min(1, p.t / .12)) : p.phase === 'retract' ? 1 - smooth(p.t / .35) : 1;
      spike(p.x, gy - .1, p.z, lx, lz, p.h, k); if (!low && k > .5) spike(p.x + lz * .25, gy - .1, p.z - lx * .25, lx * .7 - lz * .4, lz * .7 + lx * .4, p.h * .6, k, .7); // espinho irmão entrecruzado
      const tx = p.x + lx * .62 * p.h * k * .55, tz = p.z + lz * .62 * p.h * k * .55, ty = gy + p.h * k * .85; rib.seg(p.x, gy, p.z, tx, ty, tz, .03, .005, c4(VIO, .8 * k), c4(MAG, .6 * k)); // aresta acesa
      if (p.phase === 'active' && p.t < .2) for (let i = 0; i < (low ? 2 : 5); i++) { const a = i * 2.3 + p.id, u = p.t / .2; shard(p.x + Math.cos(a) * u * .7, gy + Math.sin(u * 3.14) * .5, p.z + Math.sin(a) * u * .7, .08 * (1 - u * .4), a, u * 5, i); }
    }
  }
  function drawThrone(s, blade) {
    const T0 = s.T;
    if ((s.phase === 'charge' || s.phase === 'raise') && blade) {
      const k = s.phase === 'charge' ? s.t / T0.charge : 1, a = blade.a, b = blade.b;
      for (let r = 0; r < (low ? 2 : 4); r++) { let px = a.x, py = a.y, pz = a.z; for (let i = 1; i <= 10; i++) { const u = i / 10, ang = u * 9 + time * (6 + r) + r * 1.57, rr = .12 + .1 * Math.sin(u * 3.14), x = a.x + (b.x - a.x) * u + Math.cos(ang) * rr, y = a.y + (b.y - a.y) * u + Math.sin(ang) * rr * .5, z = a.z + (b.z - a.z) * u + Math.sin(ang) * rr;
        if (u <= k) rib.seg(px, py, pz, x, y, z, .04, .04, c4(r % 2 ? RED : [.05, 0, .05], .95), c4(r % 2 ? RED : [.05, 0, .05], .95)); px = x; py = y; pz = z; } }
      rib.seg(a.x, a.y, a.z, b.x, b.y, b.z, .06 + .06 * k, .04, c4(WHT, .9 * k), c4(WHT, .9 * k)); glow.add((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2, 1.4 * k, 2.2 * k, 1, .15, .7, .55 * k, 0);
      if (s.phase === 'raise' && s.t < .12) { const c = b; rib.seg(c.x - 1.4, c.y, c.z, c.x + 1.4, c.y, c.z, .03, .03, c4(RED, 1), c4(RED, 1)); rib.seg(c.x, c.y - 1.4, c.z, c.x, c.y + 1.4, c.z, .03, .03, c4(RED, 1), c4(RED, 1)); } // cruz breve
      for (let i = 0; i < (low ? 3 : 8); i++) { const an = i * 2.4 + time * 3, rr = 1.2 * (1 - ((time + i / 8) % 1)); glow.add(a.x + Math.cos(an) * rr, a.y + .3, a.z + Math.sin(an) * rr, .04, .3, 1, .1, .4, .8 * k, 3, an, i); }
    }
    if (s.phase === 'wave') { // onda achatada larga rente ao chão, frente irregular
      const fx = s.x + s.dx * s.front, fz = s.z + s.dz * s.front, px = -s.dz, pz = s.dx, W = T0.w * 1.15;
      for (let i = 0; i <= WC; i++) { const u = i / WC * 2 - 1, back = (1 - u * u) * -.6, x = fx + px * u * W + s.dx * back, z = fz + pz * u * W + s.dz * back, gy = ground(x, z); wPos.set([x, gy, z, x, gy + T0.h * 1.35, z], i * 6); }
      waveG.attributes.position.needsUpdate = true; waveG.computeVertexNormals(); wave.visible = true; waveMat.uniforms.alpha.value = 1;
      groundNormal(ground, fx, fz, nrm); decals.add(fx - s.dx * .8, ground(fx, fz), fz - s.dz * .8, W * 1.1, .9, .05, .4, .7, 1, 1, s.id, nrm);
      for (let i = 0; i < (low ? 3 : 7); i++) { const u = hash(i + Math.floor(time * 20)) * 2 - 1, x = fx + px * u * W, z = fz + pz * u * W; shard(x, ground(x, z) + .3 + hash(i) * .6, z, .08, i, time * 6, i); }
    }
    if (s.phase === 'impact' || (s.phase === 'fade' && s.ix !== undefined)) {
      const k = s.phase === 'impact' ? s.t / .5 : 1, er = s.phase === 'fade' ? smooth(s.t / T0.fade) : 0, R = T0.endR * (s.phase === 'impact' ? easeOut(k) : 1);
      dome.visible = true; dome.position.set(s.ix, s.iy - .05, s.iz); dome.scale.set(R, R * .9, R); domeMat.uniforms.erode.value = er; domeMat.uniforms.heat.value = 1 - er * .6;
      if (s.phase === 'impact') { rib.seg(s.ix, s.iy, s.iz, s.ix, s.iy + 9 * (1 - k * .5), s.iz, .5 * (1 - k), .1, c4(WHT, 1 - k), c4(MAG, .6 * (1 - k))); for (let i = 0; i < (low ? 6 : 12); i++) { const a = i / 12 * 6.283, L = R * 2.4 * easeOut(k); rib.seg(s.ix, s.iy + .1, s.iz, s.ix + Math.cos(a) * L, s.iy + .1, s.iz + Math.sin(a) * L, .06, .01, c4(MAG, .8 * (1 - k)), c4(MAG, 0)); } }
      groundNormal(ground, s.ix, s.iz, nrm); decals.add(s.ix, s.iy, s.iz, R * (1.4 + k), 1, .1, .5, .9 * (1 - er), 0, k, s.id + 7, nrm);
    }
  }
  function drawTerror(s) {
    const T0 = s.T, age = s.age || s.t, rise = smooth(age / T0.rise), out = s.phase === 'fade' ? 1 - smooth(s.t / T0.fade) : 1, k = rise * out;
    if (k > .01) { ent.visible = true; const br = 1 + Math.sin(time * 1.6) * .04; ent.position.set(s.ex, s.ey + 5.5 * k - 1, s.ez); ent.rotation.y = s.eyaw; ent.scale.set(1.6 * k * br, 1.6 * k * (2 - br), 1.6 * k);
      ent.userData.jaw.position.y = -.7 - (.4 + .35 * Math.sin(time * 2.3)) * k; for (let i = 0; i < 2; i++) glow.add(s.ex + Math.cos(s.eyaw) * (i ? 2.2 : -2.2) + Math.sin(s.eyaw) * 2.3, s.ey + 5.5 * k + .2, s.ez - Math.sin(s.eyaw) * (i ? 2.2 : -2.2) + Math.cos(s.eyaw) * 2.3, 1.6 * k, 1.6 * k, 1, .05, .05, .7 * k, 0); }
    for (const h of s.hands) { if (hn >= hands.length) break; const g = hands[hn]; groundNormal(ground, h.x, h.z, nrm);
      if (h.phase === 'warn') { decals.add(h.x, h.y, h.z, .9 + .3 * (h.t / T0.warn), .6, .02, .1, .9, 1, h.t / T0.warn, h.i, nrm); for (let i = 0; i < 2; i++) boltRib(h.i * 9 + i + Math.floor(time * 14), h.x, h.y + .03, h.z, h.x + (hash(i + h.i) - .5) * 1.4, h.y + .03, h.z + (hash(i * 3 + h.i) - .5) * 1.4, .05, RED, .8); continue; }
      if (h.phase !== 'grab' && h.phase !== 'sink') continue; hn++;
      const held = s.held && s.held.hand === h.i, e = h.phase === 'grab' ? easeOut(Math.min(1, h.t / .25)) : 1 - smooth(h.t / .4), curl = held ? 1.1 + .15 * Math.sin(time * 14) : Math.min(1, h.t / .35) * .9;
      g.visible = true; g.position.set(held ? s.held.ax : h.x, h.y - 1.3 + e * 1.6, held ? s.held.az : h.z); g.rotation.set(0, h.seed, (hash(h.i) - .5) * .5); g.scale.setScalar(h.s * 1.25);
      for (const f of g.userData.f) f.rotation.x = curl; if (h.t < .2) for (let i = 0; i < 4; i++) shard(h.x + Math.cos(i * 1.6) * .5, h.y + .1, h.z + Math.sin(i * 1.6) * .5, .07, i, h.t * 9, 0);
    }
  }
  function drawBrood(s) { for (const r of s.rifts) { groundNormal(ground, r.x, r.z, nrm); const k = s.phase === 'open' ? s.t / s.T.open : s.phase === 'emerge' ? 1 : 1 - s.t / .6, big = r.kind === 'colossus' ? 3 : 1;
    decals.add(r.x, r.y, r.z, 1.1 * big * Math.max(.1, k), .02, 0, .02, .95 * k, 1, k, s.id, nrm); decals.add(r.x, r.y, r.z, 1.3 * big * k, .9, .05, .15, .8 * k, 0, k, s.id + 3, nrm);
    for (let i = 0; i < (low ? 4 : 9); i++) { const a = i / 9 * 6.283 + s.id, rr = (.6 + hash(i) * .4) * big; spike(r.x + Math.cos(a) * rr, r.y - .1, r.z + Math.sin(a) * rr, -Math.cos(a) * .4, -Math.sin(a) * .4, (.5 + hash(i * 3) * .6) * big, k * (s.phase === 'emerge' ? 1 : .6), .8 * big); } } }
  function drawStomp(s) { groundNormal(ground, s.x, s.z, nrm); if (s.phase === 'warn') decals.add(s.x, s.y, s.z, s.T.r, 1, .05, .15, .75, 0, s.t / s.T.warn, s.id, nrm); else { const k = s.t / .6; decals.add(s.x, s.y, s.z, s.T.r * (1 + k), 1, .1, .3, 1 - k, 0, k, s.id + 1, nrm); for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283; shard(s.x + Math.cos(a) * s.T.r * k, s.y + .2, s.z + Math.sin(a) * s.T.r * k, .2 * (1 - k), a, a, 0, .4); } } }
  /** Extinção Orbital: devolve o que o jogo precisa para câmera/render (cena orbital, pose de câmera, meteoro). */
  let orbitInfo = null;
  function drawOrbital(s, boss) {
    const T0 = s.T, ph = s.phase; orbitInfo = { phase: ph, t: s.t, s };
    const cx = s.x, cz = s.z, gy = ground(cx, cz);
    if (ph === 'awaken') { const k = s.t / T0.awaken; for (let i = 0; i < (low ? 6 : 14); i++) { const a = i * 2.4 + time * 2, rr = 1.6 + hash(i) * 1.2, u = (time * .8 + hash(i * 3)) % 1; shard(cx + Math.cos(a) * rr, gy + u * 4 * k, cz + Math.sin(a) * rr, .1, a, u * 6, i); }
      if (boss) { rib.seg(boss.x, gy, boss.z, boss.x, gy + 10 * k, boss.z, 1.2 * k, .3 * k, c4([.08, 0, .02], .9), c4(RED, .7)); glow.add(boss.x, gy + 2, boss.z, 3 * k, 5 * k, .9, .02, .05, .6 * k, 0); } }
    if (ph === 'orbit') { const k = s.t / T0.orbit; planetMat.uniforms.storm.value = smooth(k * 2); meteorO.position.set(420 - 480 * k, 1000 - 700 * k, 700 - 370 * k); meteorO.lookAt(-60, 300, 330); meteorO.rotateX(-Math.PI / 2); rockMat.uniforms.heat.value = k * .3; plasmaMat.uniforms.heat.value = .2 + k * .4;
      oCam.position.set(-260, 900, 1150); oCam.lookAt(40, 520, 300); planet.rotation.y = 0; }
    const entry = ph === 'entry' || ph === 'choice' || ph === 'impact';
    meteor.visible = entry; if (entry) { const kk = ph === 'entry' ? s.t / T0.entry : ph === 'choice' ? 1 + s.t / T0.choice * .6 : 1.6 + s.t / T0.impact * .4, y = ph === 'entry' ? 700 - 440 * kk : ph === 'choice' ? 260 - 150 * (s.t / T0.choice) : 110 * (1 - s.t / T0.impact), R = 30 + 50 * Math.min(1, kk / 1.6);
      meteor.position.set(cx + 160 * (1 - Math.min(1, kk / 1.6)), gy + Math.max(R * .6, y), cz - 120 * (1 - Math.min(1, kk / 1.6))); meteor.scale.setScalar(R); meteor.lookAt(cx, gy, cz); meteor.rotateX(-Math.PI / 2); rockMat.uniforms.heat.value = .4 + .6 * Math.min(1, kk); plasmaMat.uniforms.heat.value = .7 + .3 * Math.min(1, kk);
      for (let i = 0; i < (low ? 6 : 16); i++) { const a = hash(i) * 6.283, d = R * (1.1 + hash(i * 3) * .6), u = (time * 1.5 + hash(i * 7)) % 1; glow.add(meteor.position.x + Math.cos(a) * d, meteor.position.y + R * (.6 + u * 3), meteor.position.z + Math.sin(a) * d, R * .12, R * .12, 1, .45, .1, (1 - u) * .9, 0); } }
    if (ph === 'impact' || ph === 'after') { const k = ph === 'impact' ? s.t / T0.impact : 1, er = ph === 'after' ? smooth(s.t / T0.after) : 0, R = 46 * (ph === 'impact' ? easeOut(k) : 1);
      if (s.result !== 'duel') { mega.visible = true; mega.position.set(cx, gy - .5, cz); mega.scale.set(R, R * .75, R); megaMat.uniforms.erode.value = er; megaMat.uniforms.heat.value = 1 - er * .7;
        groundNormal(ground, cx, cz, nrm); decals.add(cx, gy, cz, 30 * (1 + k), 1, .2, .3, (1 - er) * .9, 0, Math.min(1, k + er), s.id, nrm); }
      else if (ph === 'impact') for (let i = 0; i < (low ? 10 : 30); i++) { const a = hash(i) * 6.283, b = hash(i * 3), d = 60 * easeOut(k); glow.add(cx + Math.cos(a) * d, gy + 120 + b * 60, cz + Math.sin(a) * d, 6, 6, 1, .7, .9, 1 - k, 2, a, i); } // duelo: o meteoro estilhaça no céu
    }
  }
  return {
    root, orbitalScene: oScene, orbitalCamera: oCam, meteor,
    /** blades: {id → {a,b}} pontas da Lâmina do Trono em mundo (para as fitas da carga). */
    update(dt, camera, spells, actors = [], quality = 1, blades = {}) {
      time += dt; uTime.value = time; low = quality === 0; cam.copy(camera.position); sn = kn = hn = 0; orbitInfo = null;
      dome.visible = mega.visible = wave.visible = ent.visible = false; for (const h of hands) h.visible = false; meteor.visible = false;
      glow.begin(); rib.begin(camera, time); decals.begin(); const boss = actors.find(a => a.alive && a.kind === 'vhazrael');
      for (const s of spells) { if (s.type === 'thorns') drawThorns(s); else if (s.type === 'throne') drawThrone(s, blades[s.owner]); else if (s.type === 'terror') drawTerror(s); else if (s.type === 'brood') drawBrood(s); else if (s.type === 'stomp') drawStomp(s); else if (s.type === 'orbital') drawOrbital(s, boss); }
      if (boss && boss.phase2 && !low) for (let i = 0; i < 6; i++) { const a = i * 1.05 + time * 1.3, u = (time * .7 + i / 6) % 1; glow.add(boss.x + Math.cos(a) * .7, boss.y + u * 2.6, boss.z + Math.sin(a) * .7, .25, .5, 1, .03, .06, (1 - u) * .7, 0); } // aura carmim da fúria
      spikes.count = kn; spikes.instanceMatrix.needsUpdate = true; shards.count = sn; shards.instanceMatrix.needsUpdate = true; glow.end(); rib.end(); decals.end(time);
      return orbitInfo;
    },
    clear() { dome.visible = mega.visible = wave.visible = ent.visible = meteor.visible = false; for (const h of hands) h.visible = false; spikes.count = shards.count = 0; },
    dispose() { scene.remove(root); for (const g of geos) g.dispose(); for (const m of mats) m.dispose(); glow.dispose(); rib.dispose(); decals.dispose(); spikes.dispose(); shards.dispose(); }
  };
}
