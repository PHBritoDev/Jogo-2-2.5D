/**
 * MOD 375 — ABERTURA: "A MARCHA DOS PECADOS" → "CAMPO DA ÚLTIMA GUERRA".
 *
 * Roda na etapa `cinematic` do fluxo (game-flow.js): depois da tela dos planetas, enquanto o mundo termina de subir texturas
 * e shaders. Nunca decide a entrada: só observa #cine (estado, progresso real) e se desmonta quando o jogador entra.
 *
 * MARCHA (21 s, três atos de 7 s: vila em chamas → arena/muralhas → vilarejo da neve):
 *  • Cinco SILHUETAS caminham devagar, pesadas, na direção da câmera: GANÂNCIA no centro (foice sanguínea arrastada pela mão
 *    esquerda, raspando o chão; a cósmica apoiada atrás do pescoço, lâmina para cima), VHAZRAEL e VORGAZHEK à esquerda
 *    (lâmina do trono pendendo da mão; machado do abismo atravessado no peito com as duas mãos), ZAR'KHAEL e VÉRAXION à
 *    direita (foice no ombro com a lâmina PARA BAIXO; mãos vazias).
 *  • Rostos: só olhos discretos, assinaturas distintas (loading-kit3d.js EYES). Nada de boca, dentes ou sangue.
 *  • Ameaça implícita: um adulto ajoelhado no caminho; a Ganância chega e para; o momento decisivo fica escondido por
 *    fumaça e contraluz (acento carmesim breve); o vulto cai inteiro; a formação segue sem olhar para trás.
 * CAMPO DA ÚLTIMA GUERRA (loading-battle3d.js): um pano rasgado atravessa a lente e revela o campo — céu vermelho, lua
 *  pálida (o MESMO Lua.glb do mundo), névoa baixa, bandeiras, árvores mortas e a espada monumental; três confrontos de
 *  Bispos, a Ganância no ar e o encerramento com o título formado por partículas. Depois a marcha recomeça.
 *
 * Produção (docs/loading/LOADING-CINEMATICO-MOD375.md): silhuetas derivadas dos GLBs reais (sem texturas); esteira com o
 * avanço do quadril removido e timeScale = velocidade do chão ÷ velocidade nativa do clipe (sem patinar); pools fixos;
 * sem mapa de sombras; DPR limitado; 30 fps no celular; pausa com a aba oculta; descarte completo ao sair.
 */
import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
// mesmos tokens de versão do módulo pai (?v=BUILD): os submódulos nunca vêm de um cache antigo
const VQ = (() => { try { const v = new URL(import.meta.url).searchParams.get('v'); return v ? '?v=' + encodeURIComponent(v) : ''; } catch (_) { return ''; } })();
const kit = await import('./loading-kit3d.js' + VQ), FX = await import('./loading-fx3d.js' + VQ);
const { NOISE, PLANE_V, clamp, lerp, smooth, hash, silhouetteMaterial, treadmill, dressEyes, twoBoneIK, bodyFrame, weaponQuat, weaponBuilders, grips, silhouetteWeapon } = kit;

export const LOADING_CINE_BUILD = '375-campo-da-ultima-guerra';
export const ACT_LEN = 7, MARCH = 21;           // s
export const MARCH_SPEED = .72;                  // m/s: passo lento e pesado (chão, cenários e passada sincronizados)
export const ACTS = [
  { id: 'vila', name: 'Vila em chamas', sky: [.26, .04, .02], glow: [1, .3, .08], fog: 0x150605 },
  { id: 'arena', name: 'Arena e muralhas', sky: [.2, .03, .045], glow: [1, .2, .12], fog: 0x130407 },
  { id: 'neve', name: 'Vilarejo da neve', sky: [.11, .09, .12], glow: [1, .4, .14], fog: 0x0d0a0e }
];
/** Elenco: arquivo de silhueta, lugar na formação (x lateral, z profundidade), altura-alvo, recorte e armas [arma, pose]. */
export const CAST = [
  { id: 'ganancia', name: 'Ganância', file: 'ganancia-silhueta.glb', x: 0, z: 0, h: 2.45, rim: 0xa8763a, rimK: .36, rimDir: [0, 1], weapons: [['greedA', 'yoke'], ['greedB', 'drag']], phase: 0 },
  { id: 'bispo1', name: 'VHAZRAEL', file: 'bispo1-silhueta.glb', x: -1.9, z: -.9, h: 2.2, rim: 0x7462d8, rimK: .28, rimDir: [-1, .3], weapons: [['throne', 'bone']], phase: .31, cadence: 1.03 },
  { id: 'bispo2', name: 'VORGAZHEK', file: 'bispo2-silhueta.glb', x: -3.7, z: -2.0, h: 2.1, rim: 0x2a968c, rimK: .3, rimDir: [-1, .2], weapons: [['axe', 'port']], phase: .64, cadence: .96 },
  { id: 'bispo3', name: "ZAR'KHAEL", file: 'bispo3-silhueta.glb', x: 1.9, z: -.85, h: 2.15, rim: 0xb2aa9a, rimK: .3, rimDir: [1, .3], weapons: [['scythe', 'shoulder']], phase: .18, cadence: 1.02 },
  { id: 'bispo4', name: 'VÉRAXION', file: 'bispo4-silhueta.glb', x: 3.6, z: -1.9, h: 2.05, rim: 0x5e7ec8, rimK: .3, rimDir: [1, .2], weapons: [], phase: .47, cadence: .98 }
];
/** Ameaça implícita (tempo da marcha, s): corte → aproximação → pausa → momento oculto → queda → a formação segue. */
export const VIGNETTE = { id: 'ameaca-implicita', who: 'ganancia', at: 7.6, approach: 2.3, hidden: [3.05, 3.95], fall: 3.7, resume: 4.6, end: 6.4 };

/* ---------------- céu, chão, partículas, fumaça, pano na lente ---------------- */
const SKY_V = `varying vec3 vD; void main(){ vD=normalize(position); vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position=p.xyww; }`;
const SKY_F = `${NOISE} uniform vec3 uSky,uGlow; uniform float uT,uFlash,uCloud; varying vec3 vD;
void main(){ float h=vD.y; vec3 top=vec3(.006,.003,.006); vec3 c=mix(uSky,top,smoothstep(-.02,.5+.2*uCloud,h));
 float az=atan(vD.x,-vD.z); float cl=fbm(vec2(az*2.6+uT*.012,h*5.-uT*.04)); float cl2=fbm(vec2(az*5.1-uT*.02,h*9.+3.));
 float smoke=smoothstep(.35-.12*uCloud,.85,cl)*smoothstep(.75+.2*uCloud,.02,h); c=mix(c,vec3(.02,.006,.005),smoke*.85);
 c+=uGlow*.06*uCloud*smoothstep(.45,.75,cl2)*smoothstep(.0,.25,h)*smoothstep(.7,.3,h); // bordas das nuvens pesadas lambidas de vermelho
 float band=exp(-max(h,0.)*9.)*(.55+.45*fbm(vec2(az*6.,uT*.08))); c+=uGlow*band*.42;
 c+=uGlow*uFlash*exp(-max(h,0.)*3.)*.45; gl_FragColor=vec4(c,1.); }`;
const GROUND_V = `varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
const GROUND_F = `${NOISE} uniform float uScroll,uT,uRoad; uniform vec3 uGlow; varying vec3 vW;
vec3 vor(vec2 p){ vec2 i=floor(p),f=fract(p); float d1=8.,d2=8.; vec2 id=vec2(0.); for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){ vec2 g=vec2(x,y); vec2 o=vec2(h1(i+g),h1(i+g+17.))*.85; vec2 r=g+o-f; float d=dot(r,r); if(d<d1){d2=d1;d1=d;id=i+g;}else if(d<d2)d2=d; } return vec3(sqrt(d2)-sqrt(d1),h1(id),h1(id+5.)); }
void main(){ vec2 p=vec2(vW.x,vW.z+uScroll); vec3 v=vor(p*vec2(1.7,1.35)); float joint=smoothstep(.02,.14,v.x);
 float stone=.03+.03*v.y+.018*fbm(p*3.)-.012*smoothstep(.6,1.,v.z);
 float road=smoothstep(4.6,3.2,abs(vW.x))*uRoad; vec3 c=mix(vec3(.018,.012,.01),vec3(stone*1.1,stone*.9,stone*.8),road)*mix(.45,1.,mix(1.,joint,uRoad));
 float mud=fbm(p*.35); c=mix(c,vec3(.028,.014,.011)*(.6+mud),(1.-uRoad)*(.7+.3*fbm(p*2.1))); // campo: terra escura irregular
 float fc=fbm(p*.55+3.); float crack=smoothstep(.012,0.,abs(fc-.56))*(1.-joint*.4*uRoad); float emb=crack*(.55+.45*sin(uT*2.+p.y*1.3))*step(.6,h1(floor(p*.25)));
 c+=uGlow*emb*(.35*road+.12*(1.-uRoad)); float dist=smoothstep(-10.,-55.,vW.z); c=mix(c,c*.4,dist*uRoad);
 gl_FragColor=vec4(c,1.); }`;
const FLAME_F = `${NOISE} uniform float uT,uSeed,uI; varying vec2 vUv;
void main(){ vec2 p=vUv; float y=p.y; float n=fbm(vec2(p.x*4.+uSeed,y*3.-uT*2.8)), m=fbm(vec2(p.x*9.-uSeed,y*6.-uT*4.6));
 float w=.4*pow(1.-y,1.2)*smoothstep(0.,.16,y)+.015; float x=abs(p.x-.5+(n-.5)*.38*y+(m-.5)*.08);
 float body=smoothstep(w,w*.15,x); float tongue=smoothstep(.98,.3,y+n*.5+m*.15); float a=body*tongue*uI;
 float core=smoothstep(w*.55,0.,x)*smoothstep(.65,.05,y+n*.2);
 vec3 c=mix(vec3(.9,.16,.02),vec3(1.,.55,.12),core); c=mix(c,vec3(1.,.9,.6),core*smoothstep(.45,.0,y)*.8); c=mix(c,vec3(.25,.02,.01),smoothstep(.5,.95,y+n*.25));
 if(a<.01) discard; gl_FragColor=vec4(c*a*1.35,a); }`;
const SMOKE_F = `${NOISE} uniform float uT,uSeed,uA,uLit; uniform vec3 uGlow; varying vec2 vUv;
void main(){ vec2 p=vUv*2.-1.; float r=length(p); float n=fbm(p*1.6+vec2(uSeed,uT*.15)); float a=smoothstep(1.,.25,r+(n-.5)*.7)*uA;
 if(a<.01) discard; vec3 c=mix(vec3(.022,.016,.014),uGlow*.3,uLit*smoothstep(.2,-.8,p.y)*n); gl_FragColor=vec4(c,a*.88); }`;
const BB_V = `varying vec2 vUv; void main(){ vUv=uv; vec4 mv=modelViewMatrix*vec4(0.,0.,0.,1.); float s=length(modelMatrix[0].xyz); float sy=length(modelMatrix[1].xyz); mv.xy+=position.xy*vec2(s,sy); gl_Position=projectionMatrix*mv; }`;
const POINTS_V = `attribute float aSeed; uniform float uT,uScroll,uMode,uH; uniform float uPix; varying float vA; varying float vS;
void main(){ vS=aSeed; vec3 p=position; float life=fract(uT*(.06+.05*aSeed)+aSeed*7.13);
 if(uMode<.5){ p.y=life*uH; p.x+=sin(uT*.9+aSeed*30.)*.8*life; p.z=mod(p.z-uScroll+60.,70.)-60.; vA=sin(life*3.1416)*(.5+.5*sin(uT*9.+aSeed*50.)); }
 else { p.y=uH*(1.-life); p.x+=sin(uT*.5+aSeed*20.)*1.2; p.z=mod(p.z-uScroll+40.,50.)-40.; vA=smoothstep(0.,.15,life)*smoothstep(1.,.8,life)*.5; }
 vec4 mv=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv; gl_PointSize=uPix*(uMode<.5?(1.2+aSeed*1.8):(1.+aSeed*1.4))*12./-mv.z; }`;
const POINTS_F = `uniform float uMode; varying float vA; varying float vS; void main(){ vec2 p=gl_PointCoord*2.-1.; float r=dot(p,p); if(r>1.) discard;
 vec3 c=uMode<.5?mix(vec3(1.,.55,.15),vec3(1.,.25,.05),vS):vec3(.26,.24,.23); float a=(uMode<.5?(1.-r):(1.-r)*.8)*vA; gl_FragColor=vec4(c*(uMode<.5?a*1.5:1.),a); }`;
// pano rasgado que atravessa a lente (transição motivada) + escurecimento breve
const LENS_F = `${NOISE} uniform float uK,uDim,uAsp; varying vec2 vUv; void main(){ vec2 p=vec2((vUv.x*2.-1.)*uAsp,vUv.y*2.-1.);
 float e=-1.25*uAsp+uK*(2.5*uAsp+3.4); float lead=e+(fbm(vec2(p.y*2.3,uK*3.))-.5)*.55, tail=e-3.1+(fbm(vec2(p.y*1.7+4.,uK*2.))-.5)*.7;
 float cloth=smoothstep(lead+.02,lead-.04,p.x)*smoothstep(tail-.04,tail+.04,p.x); float holes=smoothstep(.72,.8,fbm(p*3.1+vec2(uK*2.,0.)))*smoothstep(lead-.9,lead,p.x);
 cloth*=1.-holes; float fold=.5+.5*sin(p.x*5.+fbm(p*2.)*4.+p.y*1.3); vec3 c=mix(vec3(.05,.008,.008),vec3(.17,.03,.025),fold*.7)*(.7+.6*fbm(p*7.));
 c+=vec3(.6,.12,.04)*smoothstep(.06,0.,abs(p.x-lead))*.35; float a=max(cloth,uDim); gl_FragColor=vec4(mix(vec3(0.),c,cloth/max(a,.001)),a); }`;

/* ---------------- montagem ---------------- */
export function startLoadingCinematic({ host, base = new URL('./', import.meta.url).href, build = '', onFail } = {}) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches, mem = navigator.deviceMemory || 4, cores = navigator.hardwareConcurrency || 4;
  const low = coarse && (mem <= 3 || cores <= 4);
  const canvas = document.createElement('canvas'); canvas.className = 'lc-canvas'; canvas.setAttribute('aria-hidden', 'true');
  let renderer;
  try { renderer = new T.WebGLRenderer({ canvas, antialias: !coarse, alpha: false, powerPreference: 'high-performance' }); }
  catch (e) { onFail && onFail(e); return null; }
  host.prepend(canvas);
  const dprMax = coarse ? (low ? 1 : 1.25) : 1.5; let dpr = Math.min(devicePixelRatio || 1, dprMax);
  renderer.setPixelRatio(dpr); renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
  const scene = new T.Scene(), camera = new T.PerspectiveCamera(40, 1, .1, 420); scene.add(camera);
  scene.fog = new T.FogExp2(ACTS[0].fog, .022);
  const trash = new Set(), keep = o => (trash.add(o), o);
  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  const url = f => new URL(f, base).href + (build ? (f.includes('?') ? '&' : '?') + 'v=' + encodeURIComponent(build) : '');
  const state = { t: 0, real: 0, scroll: 0, V: MARCH_SPEED, vk: 1, seg: 'march', segT: 0, act: -1, flash: 0, portrait: false, disposed: false, fps: 0, frames: 0, log: [], wipe: -1, wipeTo: null, slow: 1 };

  /* luzes: contraluz de fogo + uma pálida da lua por trás; quase nada pela frente (rostos nunca iluminados) */
  const hemi = new T.HemisphereLight(0x2a1410, 0x040203, .2); scene.add(hemi);
  const back = new T.DirectionalLight(0xff3a16, .45); back.position.set(0, 6, -20); scene.add(back);
  const moonKey = new T.DirectionalLight(0xb8a88a, .3); moonKey.position.set(-8, 14, -18); scene.add(moonKey);
  const fill = new T.DirectionalLight(0x3a4668, .08); fill.position.set(3, 4, 12); scene.add(fill);
  /** Luz por segmento: marcha (fogo atrás) ou campo (lua pálida atrás, um pouco mais de recorte para separar as silhuetas). */
  function lights(seg) { if (seg === 'battle') { back.color.setHex(0xff4420); back.intensity = .5; moonKey.intensity = .55; moonKey.position.set(-10, 16, -22); hemi.intensity = .24; renderer.toneMappingExposure = 1.08; }
    else { back.color.setHex(0xff3a16); moonKey.intensity = .28; moonKey.position.set(-8, 14, -18); hemi.intensity = .2; renderer.toneMappingExposure = 1; } }

  /* céu */
  const skyU = { uSky: { value: new T.Vector3(...ACTS[0].sky) }, uGlow: { value: new T.Vector3(...ACTS[0].glow) }, uT: { value: 0 }, uFlash: { value: 0 }, uCloud: { value: 0 } };
  const sky = new T.Mesh(keep(new T.SphereGeometry(300, 32, 16)), keep(new T.ShaderMaterial({ uniforms: skyU, vertexShader: SKY_V, fragmentShader: SKY_F, side: T.BackSide, depthWrite: false, fog: false })));
  sky.renderOrder = -10; scene.add(sky);
  /* chão: estrada de pedra queimada (marcha, corre como esteira) ou terra escura do campo (batalha, parado) */
  const groundU = { uScroll: { value: 0 }, uT: { value: 0 }, uGlow: skyU.uGlow, uRoad: { value: 1 } };
  const ground = new T.Mesh(keep(new T.PlaneGeometry(160, 180).rotateX(-Math.PI / 2)), keep(new T.ShaderMaterial({ uniforms: groundU, vertexShader: GROUND_V, fragmentShader: GROUND_F })));
  ground.position.z = -60; scene.add(ground);

  /* partículas: brasas subindo e cinzas caindo (um único Points cada) */
  function points(n, mode, h, spread) {
    const g = keep(new T.BufferGeometry()), p = new Float32Array(n * 3), s = new Float32Array(n);
    for (let i = 0; i < n; i++) { p[i * 3] = (hash(i + mode * 99) - .5) * spread; p[i * 3 + 1] = 0; p[i * 3 + 2] = -hash(i * 3.1 + mode) * 60 + 8; s[i] = hash(i * 7.7 + mode * 3); }
    g.setAttribute('position', new T.BufferAttribute(p, 3)); g.setAttribute('aSeed', new T.BufferAttribute(s, 1));
    const u = { uT: { value: 0 }, uScroll: { value: 0 }, uMode: { value: mode }, uH: { value: h }, uPix: { value: 1 } };
    const m = keep(new T.ShaderMaterial({ uniforms: u, vertexShader: POINTS_V, fragmentShader: POINTS_F, transparent: true, depthWrite: false, blending: mode ? T.NormalBlending : T.AdditiveBlending }));
    const o = new T.Points(g, m); o.frustumCulled = false; scene.add(o); return u;
  }
  const emberU = points(low ? 140 : 280, 0, 12, 46), ashU = points(low ? 110 : 220, 1, 14, 40);

  /* ---------- VFX em pools fixos ---------- */
  const explosions = FX.createExplosions(T, scene, { pool: low ? 4 : 6, low, reduceFlash: reduced, keep });
  const smears = FX.createSmears(T, scene, { pool: 10, keep });
  const scrape = FX.createScrape(T, scene, { pool: low ? 60 : 90, keep });
  const bbGeo = keep(new T.PlaneGeometry(1, 1)), flameGeo = keep(new T.PlaneGeometry(1, 1).translate(0, .5, 0));
  const mkBB = (frag, uniforms, additive, geo = bbGeo) => { const m = keep(new T.ShaderMaterial({ uniforms, vertexShader: BB_V, fragmentShader: frag, transparent: true, depthWrite: false, blending: additive ? T.AdditiveBlending : T.NormalBlending })); const o = new T.Mesh(geo, m); o.frustumCulled = false; return o; };
  /* estilhaços escuros (um InstancedMesh) */
  const SH = low ? 40 : 80, shardGeo = keep(new T.TetrahedronGeometry(.18).scale(1, 2.2, .6)), shardMat = keep(silhouetteMaterial(T, 0xff6a2a, [0, 1], .5));
  const shards = new T.InstancedMesh(shardGeo, shardMat, SH); shards.frustumCulled = false; shards.count = SH; scene.add(shards);
  const shardS = Array.from({ length: SH }, () => ({ on: false, p: new T.Vector3(), v: new T.Vector3(), r: new T.Euler(), w: new T.Vector3(), s: 1 })); let shardNext = 0;
  const _m = new T.Matrix4(), _q = new T.Quaternion(), _v = new T.Vector3(), _v2 = new T.Vector3(), _s = new T.Vector3();
  function boom(x, y, z, size = 1, opts) {
    explosions.burst(_v.set(x, y, z), size, opts || { dir: _v2.set(0, 1, 0) });
    for (let i = 0; i < (low ? 6 : 11); i++) { const s = shardS[shardNext++ % SH]; s.on = true; s.p.set(x, y, z); const a = Math.random() * Math.PI * 2, up = 4 + Math.random() * 7;
      s.v.set(Math.cos(a) * (3 + Math.random() * 6) * size * .7, up * size * .6, -Math.abs(Math.sin(a)) * (3 + Math.random() * 5) * size * .7); s.r.set(Math.random() * 6, Math.random() * 6, Math.random() * 6); s.w.set(Math.random() * 8, Math.random() * 8, Math.random() * 8); s.s = (.5 + Math.random() * 1.4) * size; }
  }
  /* cortinas de fumaça (troca de ato, ameaça implícita, transições): 3 billboards grandes reaproveitados */
  const curtains = [0, 1, 2].map(i => { const o = mkBB(SMOKE_F, { uT: { value: 0 }, uSeed: { value: i * 4.3 + 1 }, uA: { value: 0 }, uLit: { value: .6 }, uGlow: skyU.uGlow }, false); o.renderOrder = 15; o.visible = false; scene.add(o); return o; });
  /* contraluz do momento oculto: um brilho quente atrás da Ganância recorta a silhueta através da fumaça */
  const flare = mkBB('uniform float uA; varying vec2 vUv; void main(){ vec2 p=vUv*2.-1.; float r=length(p*vec2(.8,1.)); float a=(exp(-r*r*3.)*.7+exp(-r*r*18.)*.5)*uA; if(a<.004) discard; gl_FragColor=vec4(vec3(1.,.32,.1)*a,a); }', { uA: { value: 0 } }, true); flare.renderOrder = -3; flare.visible = false; scene.add(flare);
  /* pano rasgado preso à câmera */
  const lensU = { uK: { value: 0 }, uDim: { value: 0 }, uAsp: { value: 1 } };
  const lens = new T.Mesh(bbGeo, keep(new T.ShaderMaterial({ uniforms: lensU, vertexShader: PLANE_V, fragmentShader: LENS_F, transparent: true, depthTest: false, depthWrite: false, fog: false })));
  lens.renderOrder = 50; lens.frustumCulled = false; lens.visible = false; lens.position.z = -.4; camera.add(lens);

  /* ---------- lua: o MESMO Lua.glb do mundo (mesma URL → mesmo cache), pálida e amarelada, atrás de nuvens ---------- */
  const moon = new T.Group(); moon.visible = false; scene.add(moon); const moonClouds = [];
  new GLTFLoader().load(new URL('./Lua.glb?v=mod181-moon', base).href, g => {
    if (state.disposed) return; const m = g.scene; const bb = new T.Box3().setFromObject(m), sz = bb.getSize(new T.Vector3()), c = bb.getCenter(new T.Vector3()), k = 1 / Math.max(.001, sz.y);
    m.traverse(o => { if (o.isMesh) { keep(o.geometry); const map = o.material && o.material.map; if (map) keep(map); o.material = keep(new T.MeshBasicMaterial({ map: map || null, color: 0xb8ad8c, fog: false, toneMapped: false })); o.frustumCulled = false; } });
    m.scale.setScalar(k); m.position.set(-c.x * k, -c.y * k, -c.z * k); const face = new T.Group(); face.rotation.y = -Math.PI / 4; face.add(m); moon.add(face);
    const halo = mkBB('varying vec2 vUv; void main(){ vec2 p=vUv*2.-1.; float r=length(p); float a=exp(-r*r*3.2)*.22*smoothstep(1.,.5,r); gl_FragColor=vec4(vec3(.55,.12,.06)*a,a); }', {}, true); halo.scale.setScalar(3.4); halo.position.z = -.6; halo.renderOrder = -6; moon.add(halo);
    moon.traverse(o => { if (o.isMesh && o !== halo) o.renderOrder = -7; });
    for (let i = 0; i < 3; i++) { const cl = mkBB(SMOKE_F, { uT: { value: 0 }, uSeed: { value: 7 + i * 3 }, uA: { value: .9 }, uLit: { value: .45 }, uGlow: skyU.uGlow }, false); cl.renderOrder = -5; cl.material.fog = false; moonClouds.push(cl); scene.add(cl); }
    state.log.push('lua pronta');
  }, undefined, () => state.log.push('lua indisponível'));
  function placeMoon(x, y, z, size) { moon.visible = moon.children.length > 0; moon.position.set(x, y, z); moon.scale.setScalar(size); moon.lookAt(camera.position);
    moonClouds.forEach((c, i) => { const ph = state.real * .012 + i * .37; c.position.set(x + Math.sin(ph * 2.1 + i) * size * .7 + (i - 1) * size * .5, y - size * (.15 + .22 * i) + Math.sin(ph + i) * size * .08, z + size * .4); c.scale.set(size * (1.9 + .4 * i), size * .55, 1);
      c.material.uniforms.uT.value = state.real; c.visible = moon.visible; }); }

  /* ---------- cenários da marcha: três atos de peças reais ---------- */
  const bMat = keep(silhouetteMaterial(T, 0xff4a14, [0, 1], .14)); bMat.color.setHex(0x050303);
  const kits = {};
  const kitFiles = { vila: './VilaKit.glb', casa1: './CasaEldoria01-lod1.glb', casa2: './CasaEldoria02-lod1.glb', ferreiro: './FerreiroEldoria-lod1.glb', torre: './TorreKit.glb?v=mod207', coliseu: './Coliseu.glb?v=mod208', neve: './NeveKit.glb?v=mod206' };
  const loadKit = k => kits[k] || (kits[k] = new Promise(res => new GLTFLoader().load(new URL(kitFiles[k], base).href, g => res(g.scene), undefined, () => res(null))));
  const pieceSrc = (kit, name) => { if (!kit) return null; if (!name) return kit; let f = null; kit.traverse(o => { if (!f && o.name === name) f = o; }); return f; };
  function makePiece(src, height, side) {
    const g = new T.Group(), c = src.clone(true); c.position.set(0, 0, 0); c.rotation.set(0, 0, 0); c.scale.set(1, 1, 1);
    c.traverse(o => { if (o.isMesh) { o.material = bMat; o.castShadow = o.receiveShadow = false; o.frustumCulled = false; } });
    const box = new T.Box3().setFromObject(c), size = box.getSize(new T.Vector3()), k = height / Math.max(.01, size.y);
    c.scale.setScalar(k); c.position.set(-(box.min.x + box.max.x) / 2 * k, -box.min.y * k, -(box.min.z + box.max.z) / 2 * k);
    const pivot = new T.Group(); pivot.add(c); g.add(pivot); g.userData = { pivot, w: size.x * k, h: height, d: size.z * k, side, flames: [], smokes: [], collapse: -1, boomed: false };
    const nf = low ? 2 : 3, fs = Math.min(height * .42, Math.max(1.4, size.x * k * .32)); for (let i = 0; i < nf; i++) {
      const f = mkBB(FLAME_F, { uT: { value: 0 }, uSeed: { value: Math.random() * 10 }, uI: { value: 0 } }, true, flameGeo);
      f.position.set((i / Math.max(1, nf - 1) - .5) * size.x * k * .55, height * (.72 + .12 * Math.random()), 0); f.scale.setScalar(fs * (.75 + Math.random() * .5)); g.add(f); g.userData.flames.push(f);
    }
    const sm = mkBB(SMOKE_F, { uT: { value: 0 }, uSeed: { value: Math.random() * 10 }, uA: { value: .35 }, uLit: { value: 1 }, uGlow: skyU.uGlow }, false);
    sm.position.set(0, height + fs * 1.4, 0); sm.scale.setScalar(Math.max(fs * 3.2, height * .9)); g.add(sm); g.userData.smokes.push(sm);
    return g;
  }
  const ACT_LAYOUT = [
    [['vila', 'CasaB', 7.4, -10.5, 0], ['casa1', null, 8, 10.8, 1.2], ['vila', 'CasaA', 5.8, -12.5, 3], ['ferreiro', null, 6.5, 11.5, 4.2], ['vila', 'Poco', 2.6, -8.6, 5.4], ['casa2', null, 8.6, -11.4, 6.5], ['vila', 'CasaC', 3.6, 9.4, 7], ['vila', 'Barraca', 2.4, 8.2, 2.4], ['casa1', null, 9, -14, 8.5, 1], ['casa2', null, 9.5, 16, 6, 1]],
    [['torre', 'Torre', 34, -22, 2, 1], ['coliseu', 'Coliseu', 22, 34, 2.6, 1], ['coliseu', 'Estandarte', 4.6, -9.2, 0.6], ['coliseu', 'Estandarte', 4.6, 9.4, 2.2], ['torre', 'Braseiro', 1.6, -8, 3.6], ['coliseu', 'Braseiro', 2.1, 8.2, 5], ['coliseu', 'Estandarte', 4.6, -10, 6.4], ['torre', 'Torre', 28, 20, 8, 1]],
    [['neve', 'Estalagem', 9, -12.5, .3], ['neve', 'CasaNeve', 6.2, 11.2, 1.6], ['neve', 'Pinheiro', 6.5, -9.2, 3], ['neve', 'CasaNeveB', 7.6, 12, 4.4], ['neve', 'Guilhotina', 5.2, -8.8, 5.8], ['neve', 'Pinheiro', 7, 9.8, 7], ['neve', 'Lanterna', 2.6, 7.6, 2.2], ['neve', 'Estalagem', 10, 15, 6, 1]]
  ];
  const sets = ACT_LAYOUT.map(() => ({ group: new T.Group(), pieces: [], built: false }));
  sets.forEach(s => { s.group.visible = false; scene.add(s.group); });
  async function buildAct(i) {
    const S = sets[i]; if (S.built || S.building) return; S.building = true;
    const need = [...new Set(ACT_LAYOUT[i].map(r => r[0]))], got = {}; for (const k of need) got[k] = await loadKit(k);
    if (state.disposed) return;
    for (const [k, name, h, x, along, far] of ACT_LAYOUT[i]) {
      const src = pieceSrc(got[k], name); if (!src) continue; const p = makePiece(src, h, Math.sign(x));
      p.userData.x = x; p.userData.along = along; p.userData.far = !!far; p.rotation.y = x < 0 ? Math.PI / 2 * (.7 + Math.random() * .3) : -Math.PI / 2 * (.7 + Math.random() * .3);
      S.group.add(p); S.pieces.push(p);
    }
    S.built = true; state.log.push('ato ' + ACTS[i].id + ' pronto');
  }
  /** Peças entram por trás da câmera e recuam com o chão (paralaxe ×1,9); atrás da formação desabam e explodem. */
  function updateSets(mt, dt) {
    for (let i = 0; i < sets.length; i++) {
      const S = sets[i]; if (!S.built) continue;
      const local = ((mt - i * ACT_LEN) % MARCH + MARCH) % MARCH, on = state.seg === 'march' && local < ACT_LEN + 4.5; S.group.visible = on;
      // deslocamento INTEGRADO do chão desde o início do ato (a formação pode parar: os cenários param junto)
      if (S.last == null || local < S.last) S.s0 = state.scroll - MARCH_SPEED * local; S.last = local;
      if (!on) { for (const p of S.pieces) { p.userData.collapse = -1; p.userData.boomed = false; } continue; }
      for (const p of S.pieces) {
        const u = p.userData, travel = (state.scroll - S.s0) * 1.9 * 1.45; let z = -1.5 - travel + u.along * 1.6 - 3;
        if (z > -1.5) { p.visible = false; continue; } p.visible = true;
        if (u.far) z = -46 - local * .55 - u.along;
        const half = Math.max(u.w, u.d) / 2; p.position.set(Math.sign(u.x) * Math.max(Math.abs(u.x) * (u.far ? 1 : state.setSpread || 1), 7.5 + half), 0, u.far ? z - half : z);
        if (u.collapse < 0 && !u.far && z < -14 - (u.along % 4) * 1.5) u.collapse = 0;
        if (u.collapse >= 0) { u.collapse += dt; const k = smooth(u.collapse / 2.4);
          u.pivot.rotation.z = -u.side * k * (.35 + .2 * (u.along % 1)); u.pivot.position.y = -k * u.h * .35;
          if (!u.boomed && u.collapse > .15) { u.boomed = true; boom((u.x - u.side * 1.2) * (state.setSpread || 1), u.h * .3, z, Math.min(1.4, u.h / 6)); state.flash = Math.max(state.flash, .25); } }
        else { u.pivot.rotation.z = 0; u.pivot.position.y = 0; }
        if (u.far && !u.boomed && local > 3.5 + (u.along % 3)) { u.boomed = true; boom(u.x * .9, u.h * .3, z + 4, 2); state.flash = Math.max(state.flash, .35); }
        const fireK = clamp((-1.5 - z) / 6, 0, 1) * (u.collapse >= 0 ? 1 - smooth((u.collapse - 2) / 3) * .5 : 1);
        for (const f of u.flames) { f.material.uniforms.uT.value = state.real; f.material.uniforms.uI.value = fireK; }
        for (const s of u.smokes) { s.material.uniforms.uT.value = state.real; s.material.uniforms.uA.value = .36 * fireK; s.userData.y0 = s.userData.y0 ?? s.position.y; s.position.y = s.userData.y0 + Math.sin(state.real * .3 + u.along) * .4; }
      }
    }
  }

  /* ---------- personagens ---------- */
  const actors = [], byId = {}; const blobGeo = keep(new T.CircleGeometry(.62, 24).rotateX(-Math.PI / 2));
  const blobMat = keep(new T.ShaderMaterial({ vertexShader: PLANE_V, fragmentShader: 'varying vec2 vUv; void main(){ float r=length(vUv*2.-1.); float a=smoothstep(1.,.1,r)*.75; gl_FragColor=vec4(0.,0.,0.,a); }', transparent: true, depthWrite: false }));
  const eyeGeo = keep(new T.PlaneGeometry(1, 1));
  /** Carrega uma silhueta: esteira em todos os clipes, escala pela altura-alvo, sombra de contato, olhos (só antagonistas). */
  async function loadActor(def, { npc = false, dissolve = false, src = null, clone = !!src, mill = !src, like = null } = {}) {
    const g = src || await loader.loadAsync(url('assets/loading/' + def.file)); if (state.disposed) return null;
    const model = clone ? cloneSkinned(g.scene) : g.scene, holder = new T.Group(); holder.add(model);
    const bones = {}; model.traverse(o => { if (o.isBone) bones[o.name] = o; if (o.isMesh) o.frustumCulled = false; });
    const mat = keep(silhouetteMaterial(T, def.rim || 0x5a6070, def.rimDir || [0, 1], def.rimK || .5, { dissolve }));
    model.traverse(o => { if (o.isMesh) { o.material = mat; trash.add(o.geometry); } });
    const hips = bones.Hips || bones.mixamorigHips, clips = {}; for (const c of g.animations) clips[c.name] = c;
    if (mill) { for (const c of g.animations) { const v = hips ? treadmill(T, c, model, hips) : 0; c.userData = { natural: v }; } }
    const walk = clips.Walking || clips.Walk, natural = (walk && walk.userData && walk.userData.natural) || 1;
    const mixer = new T.AnimationMixer(model);
    const a = { def, holder, model, bones, mixer, clips, walk: walk ? mixer.clipAction(walk) : null, natural, mat, eyes: [], weapons: [], head: bones.Head, npc, gltf: g, mode: 'march', act: null };
    if (a.walk) { a.walk.play(); a.walk.time = (def.phase || 0) * walk.duration; }
    mixer.setTime(0); model.updateMatrixWorld(true);
    if (like) { model.scale.copy(like.model.scale); model.position.y = like.model.position.y; a.scale = like.scale; a.H = like.H; } // mesmo rig, mesma escala (fase II)
    else { const box = new T.Box3().setFromObject(model), H = box.max.y - box.min.y, k = (def.h || 1.8) / Math.max(.01, H);
      model.scale.multiplyScalar(k); model.position.y -= box.min.y * k; a.scale = k; a.H = def.h || 1.8; }
    const blob = new T.Mesh(blobGeo, blobMat); blob.scale.setScalar(a.H / 2.1); blob.position.y = .012; holder.add(blob); a.blob = blob;
    scene.add(holder); holder.updateMatrixWorld(true);
    if (!npc) dressEyes(T, a, keep, eyeGeo);
    return a;
  }
  /** Ação única de clipe com mistura (a esteira já removeu o avanço do quadril). */
  function play(a, name, { fade = .25, loop = false, from = 0, speed = 1, clamp: cl = true } = {}) {
    const c = a.clips[name]; if (!c) return null; const act = a.mixer.clipAction(c); if (a.act === act && act.isRunning()) return act;
    act.reset(); act.setLoop(loop ? T.LoopRepeat : T.LoopOnce, Infinity); act.clampWhenFinished = cl; act.time = from; act.timeScale = speed; act.enabled = true; act.setEffectiveWeight(1); act.play();
    const prev = a.act || a.walk; if (prev && prev !== act) act.crossFadeFrom(prev, fade, false); a.act = act; return act;
  }
  const builders = weaponBuilders(T, base), GRIPS = grips(T);
  async function arm(a) {
    for (const [key, pose] of a.def.weapons) {
      let w; try { w = await builders[key](); } catch (e) { state.log.push('arma ' + key + ' falhou: ' + e.message); continue; }
      if (state.disposed || !w) return; const info = silhouetteWeapon(T, w, key, a, keep);
      const handName = key === 'greedB' ? 'LeftHand' : 'RightHand', hand = a.bones[handName]; if (!hand) continue;
      const root = new T.Group(); root.add(w); scene.add(root);
      let grip = GRIPS[key]; if (!grip) { // VHAZRAEL: mesma calibração do jogo (vhazrael-rig3d.js calibrateGrip)
        try { const m = await import(new URL('./vhazrael-rig3d.js', base).href); grip = m.calibrateGrip(T, a.model, cloneSkinned, a.walk && a.walk.getClip()); } catch (e) { grip = new T.Quaternion(); } }
      // palma: do pulso (origem do osso da mão) até o meio dos dedos, no referencial da mão
      const kid = hand.children.find(c => c.isBone); const palm = kid ? kid.position.clone().normalize() : new T.Vector3(0, 1, 0), palmLen = (kid ? kid.getWorldPosition(new T.Vector3()).distanceTo(hand.getWorldPosition(new T.Vector3())) : .08 * a.H / 1.8) * .55;
      a.weapons.push({ root, w, key, pose, hand, side: handName.startsWith('Left') ? 'Left' : 'Right', grip, gripInv: grip.clone().invert(), s: info.s, tip: info.tip, mat: info.mat, palm, palmLen, bone: pose === 'bone' ? 1 : 0, boneWant: pose === 'bone' ? 1 : 0, scrape: 0 });
    }
  }

  /* ---------- poses de carregar (IK de dois ossos + arma orientada pelo corpo) ---------- */
  const BF = { LS: new T.Vector3(), RS: new T.Vector3(), Rt: new T.Vector3(), Lt: new T.Vector3(), F: new T.Vector3(), U: new T.Vector3(), N: new T.Vector3(), C: new T.Vector3(), P: new T.Vector3() };
  const cHor = new T.Vector3(), cH = new T.Vector3(), cB = new T.Vector3(), cG = new T.Vector3(), cG2 = new T.Vector3(), cW = new T.Vector3(), cPole = new T.Vector3(), cTip = new T.Vector3(), cTx = new T.Vector3(), cTz = new T.Vector3(), cM = new T.Matrix4();
  const cQ = new T.Quaternion(), cHQ = new T.Quaternion(), cBQ = new T.Quaternion(), cBP = new T.Vector3(), cQ2 = new T.Quaternion();
  const armOf = (a, side) => [a.bones[side + 'UpperArm'], a.bones[side + 'LowerArm'], a.bones[side + 'Hand']];
  /** Posiciona a arma a partir do ponto de pega G (mundo), quaternion Q e coordenada local yG da pega no cabo. */
  function placeWeapon(w, G, Q, yG) { w.root.quaternion.copy(Q); w.root.position.copy(G).sub(cW.set(0, yG * w.s, 0).applyQuaternion(Q)); }
  /** Mão até a pega: pulso = G − palma (no referencial da mão desejada); a mão fica orientada pela empunhadura do jogo. */
  function handTo(a, w, side, G, Q, pole, weight, orient = true) {
    const [u, l, h] = armOf(a, side); if (!u || !l || !h) return; cHQ.copy(Q).multiply(w.gripInv);
    cW.copy(w.palm).applyQuaternion(cHQ).multiplyScalar(w.palmLen); cG2.copy(G).sub(cW);
    twoBoneIK(T, u, l, h, cG2, pole, orient ? cHQ : null, weight);
  }
  const tipY = (w, G, Q, yG) => cTip.copy(w.tip).sub(cW.set(0, yG, 0)).multiplyScalar(w.s).applyQuaternion(Q).add(G).y;
  function carry(a, w, dt) {
    const k = 1 - w.bone; // 1 = pose de carregar; 0 = a arma segue o osso da mão (golpes)
    if (k > .001 && w.pose !== 'bone') {
      const B = bodyFrame(T, a, BF), H = a.H;
      if (w.pose === 'drag') { // foice sanguínea arrastada: mão esquerda ao lado do quadril, ponta tocando o chão atrás e por fora
        const yG = -.55; cG.copy(B.P).addScaledVector(B.Lt, .22 * H).addScaledVector(B.U, .02 * H).addScaledVector(B.F, -.03 * H);
        cB.set(0, -1, 0).addScaledVector(B.Lt, .28).addScaledVector(B.F, -.12).normalize(); const hor = cHor.copy(B.F).multiplyScalar(-1).addScaledVector(B.Lt, 1.05).normalize();
        // inclinação do cabo resolvida por bisseção: a PONTA da lâmina fica rente ao chão (nem afunda, nem flutua), com o corpo balançando
        let lo = .05, hi = 1.45; for (let i = 0; i < 12; i++) { const th = (lo + hi) / 2; cH.copy(hor).multiplyScalar(Math.cos(th)).addScaledVector(B.U, -Math.sin(th)).normalize(); weaponQuat(T, cH, cB, cQ, cTx, cTz, cM);
          if (tipY(w, cG, cQ, yG) > .012) lo = th; else hi = th; }
        const th = (lo + hi) / 2; cH.copy(hor).multiplyScalar(Math.cos(th)).addScaledVector(B.U, -Math.sin(th)).normalize(); weaponQuat(T, cH, cB, cQ, cTx, cTz, cM);
        handTo(a, w, 'Left', cG, cQ, cPole.copy(B.F).multiplyScalar(-1).addScaledVector(B.Lt, .5).normalize(), k); placeWeapon(w, cG, cQ, yG); w.yG = yG;
        w.tipWorld = w.tipWorld || new T.Vector3(); w.tipWorld.copy(cTip.copy(w.tip).sub(cW.set(0, yG, 0)).multiplyScalar(w.s).applyQuaternion(cQ).add(cG));
      } else if (w.pose === 'yoke') { // foice cósmica atrás do pescoço, sobre os ombros; mão direita perto do ombro; lâmina para cima sobre o ombro oposto
        const yG = -.3; cH.copy(B.Lt).addScaledVector(B.U, .07).addScaledVector(B.F, -.12).normalize(); cB.copy(B.U).addScaledVector(B.F, -.2).normalize(); weaponQuat(T, cH, cB, cQ, cTx, cTz, cM);
        cG.copy(B.N).addScaledVector(B.F, -.05 * H).addScaledVector(B.U, -.005 * H).addScaledVector(cH, -.15 * H);
        handTo(a, w, 'Right', cG, cQ, cPole.copy(B.U).multiplyScalar(-1).addScaledVector(B.F, .55).addScaledVector(B.Rt, .35).normalize(), k); placeWeapon(w, cG, cQ, yG);
      } else if (w.pose === 'shoulder') { // ZAR'KHAEL: cabo apoiado no ombro direito, cabeça da foice atrás e acima, lâmina PARA BAIXO
        const yG = -.15; cH.copy(B.F).multiplyScalar(-.72).addScaledVector(B.U, .6).addScaledVector(B.Rt, .26).normalize(); cB.set(0, -1, 0).addScaledVector(B.Rt, .85).normalize(); weaponQuat(T, cH, cB, cQ, cTx, cTz, cM);
        cG.copy(B.RS).addScaledVector(B.U, .03 * H).addScaledVector(cH, -.2 * H);
        handTo(a, w, 'Right', cG, cQ, cPole.set(0, -1, 0).addScaledVector(B.Rt, .6).addScaledVector(B.F, -.15).normalize(), k); placeWeapon(w, cG, cQ, yG);
      } else if (w.pose === 'port') { // VORGAZHEK: machado pesado atravessado no peito, duas mãos (direita baixa no cabo, esquerda sob a cabeça)
        const yC = -.15, yR = -.6, yL = .12; cH.copy(B.Lt).multiplyScalar(.85).addScaledVector(B.U, .62).addScaledVector(B.F, .16).normalize(); cB.crossVectors(cH, B.F).normalize(); weaponQuat(T, cH, cB, cQ, cTx, cTz, cM);
        const C = cTip.copy(B.C).addScaledVector(B.F, .2 * H).addScaledVector(B.U, -.07 * H);
        cG.copy(C).addScaledVector(cH, (yR - yC) * w.s); cG2.copy(C).addScaledVector(cH, (yL - yC) * w.s); const gL = cBP.copy(cG2);
        handTo(a, w, 'Right', cG, cQ, cPole.copy(B.F).multiplyScalar(-.5).addScaledVector(B.Rt, 1).addScaledVector(B.U, -.4).normalize(), k);
        const [u, l, h] = armOf(a, 'Left'); if (u) twoBoneIK(T, u, l, h, gL, cPole.set(0, -1, 0).addScaledVector(B.Lt, .55).addScaledVector(B.F, .3).normalize(), null, k);
        placeWeapon(w, cG, cQ, yR);
      }
    }
    if (w.bone > .001) { w.hand.updateWorldMatrix(true, false); w.hand.getWorldQuaternion(cBQ).multiply(w.grip); w.hand.getWorldPosition(cBP);
      if (k > .001 && w.pose !== 'bone') { w.root.quaternion.slerp(cBQ, w.bone); w.root.position.lerp(cBP, w.bone); } else { w.root.quaternion.copy(cBQ); w.root.position.copy(cBP); } }
  }
  function updateWeapons(a, dt) { for (const w of a.weapons) { w.bone += (w.boneWant - w.bone) * Math.min(1, dt * 6); if (Math.abs(w.bone - w.boneWant) < .002) w.bone = w.boneWant; carry(a, w, dt); } }

  /* ---------- passante ajoelhado (ameaça implícita) ---------- */
  let kneeler = null;
  async function loadKneeler() { const n = await loadActor({ id: 'npc', file: 'npc-adulto-silhueta.glb', h: 1.76, rim: 0x8c8a90, rimK: .32, rimDir: [1, .4] }, { npc: true }); if (!n) return; n.holder.visible = false; kneeler = n; }

  /* ---------- miniatura do protagonista na faixa da barra ---------- */
  const pre = host.id || 'cine', lane = document.getElementById(pre + '-runner-lane'), prog = document.getElementById(pre + '-progress');
  const runScene = new T.Scene(), runCam = new T.OrthographicCamera(0, 1, 1, 0, -10, 10); let runner = null, laneRect = null, runP = 0;
  runScene.add(new T.HemisphereLight(0xffe6c8, 0x201010, 1.6)); const runKey = new T.DirectionalLight(0xffc890, 1.4); runKey.position.set(-1, 2, 3); runScene.add(runKey);
  async function loadRunner() {
    const g = await loader.loadAsync(url('assets/loading/protagonista-mini.glb')); if (state.disposed) return;
    const m = g.scene, mat = keep(silhouetteMaterial(T, 0xffd08a, [0, 1], 1.1)); mat.color.setHex(0x2a2018);
    m.traverse(o => { if (o.isMesh) { o.material = mat; o.frustumCulled = false; trash.add(o.geometry); } });
    const bones = {}; m.traverse(o => { if (o.isBone) bones[o.name] = o; }); const hips = bones.Hips || bones.mixamorigHips, clip = g.animations[0];
    if (clip && hips) treadmill(T, clip, m, hips); const mixer = new T.AnimationMixer(m); if (clip) mixer.clipAction(clip).play(); mixer.setTime(0); m.updateMatrixWorld(true);
    const box = new T.Box3().setFromObject(m), H = box.max.y - box.min.y, k = .86 / Math.max(.01, H); m.scale.multiplyScalar(k); m.position.y = -box.min.y * k + .06;
    const holder = new T.Group(); holder.add(m); holder.rotation.y = Math.PI / 2; runScene.add(holder); runner = { holder, mixer };
  }
  function laneLayout() { if (!lane) return; const r = lane.getBoundingClientRect(), hr = host.getBoundingClientRect(); laneRect = { x: r.left - hr.left, y: hr.bottom - r.bottom, w: r.width, h: r.height, H: hr.height }; }
  function drawRunner(dt) {
    if (!runner || !laneRect || laneRect.w < 10) return;
    const target = host.dataset.state === 'ready' || host.dataset.state === 'entering' ? 100 : +(prog && prog.getAttribute('aria-valuenow')) || 0; // só o progresso real
    runP = Math.min(target, runP + Math.max(0, target - runP) * Math.min(1, dt * 2.5) + (target > runP ? dt * 4 : 0));
    const asp = laneRect.w / laneRect.h; runCam.left = 0; runCam.right = asp; runCam.top = 1; runCam.bottom = 0; runCam.updateProjectionMatrix();
    runner.holder.position.x = .3 + (asp - .6) * runP / 100; runner.mixer.update(dt);
    const pr = renderer.getPixelRatio(); renderer.autoClear = false; renderer.clearDepth(); renderer.setScissorTest(true);
    renderer.setViewport(laneRect.x, laneRect.y, laneRect.w, laneRect.h); renderer.setScissor(laneRect.x, laneRect.y, laneRect.w, laneRect.h);
    renderer.render(runScene, runCam); renderer.setScissorTest(false); renderer.setViewport(0, 0, renderer.domElement.width / pr, renderer.domElement.height / pr); renderer.autoClear = true;
  }

  /* ---------- enquadramento ---------- */
  const camBase = new T.Vector3(), camLook = new T.Vector3();
  function layout() {
    const w = host.clientWidth || innerWidth, h = host.clientHeight || innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h;
    state.portrait = w / h < .9; state.fov = state.portrait ? 46 : 38; camera.fov = state.fov; lensU.uAsp.value = w / h;
    // retrato: o trio central inteiro e as pontas cortadas pela borda (silhuetas legíveis em vez de miniaturas)
    const spread = state.portrait ? .48 : 1, halfW = state.portrait ? 1.65 : 3.7 + .55; state.spread = spread; state.setSpread = state.portrait ? .62 : 1; const hfov2 = 2 * Math.atan(Math.tan(camera.fov * Math.PI / 360) * camera.aspect);
    const dist = clamp(halfW / Math.tan(hfov2 / 2), 7, 15.5); camBase.set(0, state.portrait ? .8 : .95, dist); camLook.set(0, state.portrait ? 2.35 : 1.62, -2);
    lens.scale.set(.4 * Math.tan(camera.fov * Math.PI / 360) * 2 * camera.aspect * 1.02, .4 * Math.tan(camera.fov * Math.PI / 360) * 2 * 1.02, 1);
    for (const a of actors) { a.home = a.def.x * spread; if (a.mode === 'march' && !a.vig) a.holder.position.x = a.home; }
    camera.updateProjectionMatrix(); laneLayout(); if (battle && battle.layout) battle.layout(state.portrait);
  }

  /* ---------- ameaça implícita ---------- */
  const VG = { t: -1, phase: 'off' };
  /** Fator de marcha (0..1): a FORMAÇÃO INTEIRA desacelera e para junto da Ganância; chão, cenários e passadas seguem o
      mesmo fator (sem patinar). Depois retoma sem ninguém olhar para trás. */
  function marchFactor(mt) { const V = VIGNETTE, lt = mt - V.at; if (lt < 0 || lt > V.end) return 1;
    return lt < V.resume ? 1 - smooth((lt - (V.approach - .8)) / .8) : smooth((lt - V.resume) / 1.1); }
  function vignette(mt, dt) {
    const V = VIGNETTE, g = byId[V.who], n = kneeler, lt = mt - V.at; if (!g || !n) return;
    if (lt < 0 || lt > V.end) { if (VG.phase !== 'off') { VG.phase = 'off'; n.holder.visible = false; g.vig = false; if (g.paused) { g.paused = false; play(g, 'Walking', { fade: .4, loop: true }); g.act = null; } for (const c of curtains) c.visible = false; flare.visible = false; } return; }
    if (VG.phase === 'off') { // começa num corte: o adulto já está ajoelhado na estrada, ao lado do caminho da Ganância
      VG.phase = 'approach'; g.vig = true; n.holder.visible = true; n.mixer.stopAllAction(); n.act = null; const ar = play(n, 'Arise', { fade: 0, from: .62 }); if (ar) ar.timeScale = 0;
      n.holder.position.set(g.home - .95, 0, g.def.z + 1.2 + MARCH_SPEED * (V.approach - .4)); n.holder.rotation.y = Math.PI * .9; n.fell = false; n.model.rotation.set(0, 0, 0); }
    n.holder.position.z -= state.V * dt; // o chão o traz (e para quando a formação para)
    if (lt >= V.approach - .5 && !g.paused && lt < V.resume) { g.paused = true; play(g, 'Idle_14', { fade: .6, loop: true, from: 1.2 }); }
    if (!n.fell) { n.model.rotation.z = Math.sin(state.real * 23) * .012 + Math.sin(state.real * 7.1) * .01; n.model.rotation.x = Math.sin(state.real * 17.3) * .008; } // tremor contido
    // momento oculto: fumaça baixa entre a câmera e os dois + contraluz quente + acento carmesim breve (os olhos acendem um instante)
    const [h0, h1] = V.hidden, occ = smooth((lt - h0 + .35) / .35) * (1 - smooth((lt - h1) / .55));
    curtains.forEach((c, i) => { c.visible = occ > .01; if (!c.visible) return; const gz = g.holder.position.z; c.position.set(g.holder.position.x - .2 - (lt - h0) * (1.3 + i * .35) + (i - 1) * 1.1 + 1.2, .55 + i * .38, gz + 1.5 + i * .5);
      c.scale.set(2.8 + i * .6, 1.5 + i * .35, 1); c.material.uniforms.uA.value = occ * (.8 - i * .14); c.material.uniforms.uT.value = state.real; c.material.uniforms.uLit.value = 1; });
    const fl = smooth((lt - h0 + .5) / .5) * (1 - smooth((lt - h1) / .7)); flare.visible = fl > .01; if (flare.visible) { flare.position.set(g.holder.position.x - .3, 1.7, g.holder.position.z - 5.5); flare.scale.set(7.5, 5.5, 1); flare.material.uniforms.uA.value = fl * (reduced ? .5 : .95); }
    if (lt >= h0 + .28 && !VG.accent) { VG.accent = true; const np = n.holder.position; smears.fire(_v2.set(np.x + .2, 1.2, np.z - .2), _s.set(.3, .2, 1), 2.4, -1.5, .8, 0xb01020, .16, .24); boom(g.holder.position.x + 3.5, 3.2, g.holder.position.z - 18, 1.4); state.flash = Math.max(state.flash, .4); }
    if (lt < h0) VG.accent = false;
    for (const e of g.eyes) e.material.uniforms.uI.value = (e.userData.i0 = e.userData.i0 ?? e.material.uniforms.uI.value) * (1 + 1.3 * (lt > h0 && lt < h1 ? smooth((lt - h0) / .2) * (1 - smooth((lt - h1 + .3) / .3)) : 0));
    if (lt >= V.fall && !n.fell) { n.fell = true; n.model.rotation.set(0, 0, 0); const f = play(n, 'falling_down', { fade: .2, from: .75 }); if (f) f.timeScale = .9; }
    if (n.fell && n.act && n.act.time > n.act.getClip().duration * .9) n.act.paused = true;
    if (lt >= V.resume && g.paused) { g.paused = false; play(g, 'Walking', { fade: .6, loop: true }); g.act = null; }
    n.mixer.update(dt);
  }

  /* ---------- batalha (carregada sem pressa durante a marcha) ---------- */
  let battle = null, battleLoading = null;
  function prepareBattle() {
    if (battleLoading) return battleLoading;
    battleLoading = import('./loading-battle3d.js' + VQ).then(m => m.createBattle({ T, scene, camera, renderer, keep, lights, url, base, loader, low, reduced, coarse, state, byId, actors, kit, FX, explosions, smears, boom, loadActor, play, updateWeapons, placeMoon, skyU, groundU, curtains, cloneSkinned, log: s => state.log.push(s) }))
      .then(b => { if (state.disposed || !b) return null; battle = b; b.layout(state.portrait); state.log.push('batalha pronta'); return b; })
      .catch(e => { state.log.push('batalha indisponível: ' + (e && e.message)); console.warn('[abertura] batalha indisponível:', e); return null; });
    return battleLoading;
  }

  /* ---------- quadro ---------- */
  let raf = 0, last = 0, accum = 0; const step = reduced ? .5 : coarse ? 1 / 30 : 0;
  function frame(now) {
    raf = requestAnimationFrame(frame); if (document.hidden) { last = now; return; }
    let dt = last ? (now - last) / 1000 : 1 / 60; last = now; if (step) { accum += dt; if (accum < step * .92) return; dt = accum; accum = 0; }
    const rdt = Math.min(dt, .1); if (!state.paused) update(reduced ? 0 : rdt); renderer.render(scene, camera); drawRunner(reduced ? 0 : rdt); state.frames++;
  }
  function startWipe(to) { if (state.wipe >= 0) return; state.wipe = 0; state.wipeTo = to; lens.visible = true; }
  function update(dt) {
    const gdt = dt * (state.slow || 1); state.t += dt; state.segT += dt; state.real += dt;
    // pano na lente: a troca de segmento acontece com a tela coberta
    if (state.wipe >= 0) { state.wipe += dt / (reduced ? 1.6 : 1.05); const k = state.wipe; lensU.uK.value = k; lensU.uDim.value = .55 * Math.sin(Math.PI * clamp(k, 0, 1));
      const th = .4 * Math.tan(camera.fov * Math.PI / 360) * 2 * 1.04; lens.scale.set(th * camera.aspect, th, 1);
      if (k >= .5 && state.wipeTo) { const to = state.wipeTo; state.wipeTo = null; switchSegment(to); }
      if (k >= 1) { state.wipe = -1; lens.visible = false; lensU.uDim.value = 0; } }
    if (state.seg === 'march') {
      const mt = state.segT % MARCH;
      if (state.segT >= MARCH - .5 && state.wipe < 0 && battle && battle.ready) startWipe('battle');
      else if (state.segT >= MARCH - .5 && !battle) prepareBattle();
      updateMarch(mt, dt);
    } else if (battle) { const r = battle.update(state.segT, gdt, dt) || {}; state.slow = r.slow || 1; if (r.done && state.wipe < 0) startWipe('march'); }
    explosions.update(gdt, camera, state.seg === 'march' ? state.V * gdt : 0); smears.update(gdt, state.seg === 'march' ? state.V * gdt : 0); scrape.update(gdt, state.seg === 'march' ? state.V * gdt : 0);
    for (let i = 0; i < SH; i++) { const s = shardS[i]; if (s.on) { s.v.y -= 15 * gdt; s.p.addScaledVector(s.v, gdt); if (state.seg === 'march') s.p.z -= state.V * gdt; s.r.x += s.w.x * gdt; s.r.y += s.w.y * gdt; if (s.p.y < 0) { s.p.y = 0; s.v.multiplyScalar(.3); s.v.y = Math.abs(s.v.y) * .2; s.w.multiplyScalar(.4); }
        if (s.p.z < -70 || s.p.z > 40) s.on = false; } _m.compose(s.on ? s.p : _v.set(0, -99, 0), _q.setFromEuler(s.r), _s.setScalar(s.on ? s.s : 0)); shards.setMatrixAt(i, _m); }
    shards.instanceMatrix.needsUpdate = true;
    state.flash = Math.max(0, state.flash - dt * 1.6); skyU.uFlash.value = state.flash * (reduced ? .4 : 1); skyU.uT.value = state.real; groundU.uT.value = state.real;
    for (const u of [emberU, ashU]) { u.uT.value = state.real; u.uPix.value = renderer.getPixelRatio() * (state.portrait ? 1.3 : 1); }
    explosions.setPixelRatio(renderer.getPixelRatio());
  }
  function switchSegment(to) {
    state.seg = to; state.segT = 0; state.slow = 1;
    if (to === 'battle') { for (const s of sets) s.group.visible = false; if (kneeler) kneeler.holder.visible = false; VG.phase = 'off'; for (const c of curtains) c.visible = false; battle.begin(); }
    else { if (battle) battle.end(); lights('march'); groundU.uRoad.value = 1; skyU.uCloud.value = 0; scene.fog.density = .022; for (const a of actors) { a.mode = 'march'; a.holder.visible = true; a.holder.rotation.set(0, 0, 0); a.holder.position.set(a.home, 0, a.def.z); a.mixer.stopAllAction(); a.act = null; a.paused = false; a.catchUp = false; a.vig = false; if (a.walk) { a.walk.reset().play(); a.walk.time = (a.def.phase || 0) * a.walk.getClip().duration; } for (const w of a.weapons) { w.boneWant = w.pose === 'bone' ? 1 : 0; w.bone = w.boneWant; } } state.act = -1; }
    state.log.push('segmento ' + to);
  }
  function updateMarch(mt, dt) {
    state.vk = marchFactor(mt); state.V = MARCH_SPEED * state.vk; state.scroll += state.V * dt; groundU.uScroll.value = state.scroll; groundU.uRoad.value = 1;
    for (const u of [emberU, ashU]) u.uScroll.value = state.scroll;
    const act = Math.floor(mt / ACT_LEN) % 3, inAct = mt % ACT_LEN, trans = smooth(1 - Math.abs(inAct - 0) / 1.2) + smooth(1 - Math.abs(inAct - ACT_LEN) / 1.2);
    if (act !== state.act) { state.act = act; buildAct(act); buildAct((act + 1) % 3); if (mt > .5) { boom(0, 3.4, -26, 2.4); state.flash = Math.max(state.flash, .6); } }
    const A = ACTS[act], B = ACTS[(act + 1) % 3], kb = smooth((inAct - (ACT_LEN - 1.3)) / 1.3);
    skyU.uSky.value.set(lerp(A.sky[0], B.sky[0], kb), lerp(A.sky[1], B.sky[1], kb), lerp(A.sky[2], B.sky[2], kb)); skyU.uGlow.value.set(lerp(A.glow[0], B.glow[0], kb), lerp(A.glow[1], B.glow[1], kb), lerp(A.glow[2], B.glow[2], kb)); skyU.uCloud.value = 0;
    scene.fog.color.setHex(A.fog).lerp(_c.setHex(B.fog), kb); scene.fog.density = .02 + .045 * trans; // parede de fumaça esconde a troca de ato
    back.intensity = .42 + state.flash * 1.1 + Math.sin(state.real * 7.3) * .04; hemi.intensity = .18 + state.flash * .25;
    placeMoon(-26, 34, -175, state.portrait ? 15 : 17);
    updateSets(mt, dt);
    vignette(mt, dt);
    for (const a of actors) {
      if (a.mode !== 'march') continue;
      if (a.walk && !a.paused) a.walk.timeScale = clamp(MARCH_SPEED / Math.max(.2, a.natural), .5, 1.2) * (a.def.cadence || 1) * state.vk; // passada ∝ chão: para junto, sem patinar
      a.holder.position.z = a.def.z;
      a.holder.position.x += (a.home - a.holder.position.x) * Math.min(1, dt * 2); a.holder.rotation.y *= 1 - Math.min(1, dt * 3);
      a.mixer.update(dt); a.model.updateMatrixWorld(true);
      for (const e of a.eyes) e.material.uniforms.uT.value = state.real;
      updateWeapons(a, dt);
      // contato da lâmina arrastada: sulco + centelhas só enquanto o corpo anda sobre o chão
      if (!a.paused) for (const w of a.weapons) if (w.pose === 'drag' && w.tipWorld && w.bone < .2) scrape.add(w.tipWorld, 1, _v2.set(0, 0, -1));
    }
    // câmera
    const sway = Math.sin(state.real * .17) * .2, bob = Math.sin(state.real * .31) * .05, push = Math.sin(mt / MARCH * Math.PI * 2) * .45;
    const V = VIGNETTE, lt = mt - V.at, g = byId.ganancia;
    if (state.qaCam) { camera.position.set(...state.qaCam[0]); camera.lookAt(...state.qaCam[1]); camera.fov = state.qaCam[2] || camera.fov; camera.updateProjectionMatrix(); }
    else if (state.qa) { const a = byId[state.qa] || (kneeler && kneeler.holder.visible ? kneeler : null); if (a && a.head) { a.head.getWorldPosition(_v); const fy = a.holder.rotation.y; camera.position.set(_v.x + Math.sin(fy) * a.H * .45, _v.y + .02, _v.z + Math.cos(fy) * a.H * .45); camera.lookAt(_v.x, _v.y - .03 * a.H, _v.z); } }
    else if (g && kneeler && lt >= 0 && lt < V.resume + .3) {
      const gz = g.holder.position.z, gx = g.holder.position.x, P = state.portrait;
      const nx = kneeler.holder.position.x, nz = kneeler.holder.position.z;
      if (lt < V.approach + .25) { // V1: lateral baixa 3/4 — a Ganância vem; o ajoelhado ao lado do caminho
        const k = smooth(lt / (V.approach + .25)); camera.position.set(gx + (P ? 3.2 : 4.4) - k * .5, .72, gz + (P ? 5.2 : 4.0) + k * .2); camera.lookAt((gx + nx) / 2, 1.15, (gz + nz) / 2);
      } else { // V2: atrás do ajoelhado, contra a luz: o rosto nunca aparece; a fumaça cobre o instante
        const k = smooth((lt - V.approach) / 2); camera.position.set(nx + .85 + k * .15, .95, nz + (P ? 5.6 : 4.4) - k * .35); camera.lookAt(gx - .25, 1.45, gz);
      }
      camera.fov = P ? 50 : 34; camera.updateProjectionMatrix();
    } else { camera.position.set(camBase.x + sway, camBase.y + bob, camBase.z + push); camera.lookAt(camLook.x + sway * .35, camLook.y, camLook.z); camera.fov = state.fov; camera.updateProjectionMatrix(); }
  }
  const _c = new T.Color();

  /* ---------- ciclo de vida ---------- */
  const ro = new ResizeObserver(() => layout()); ro.observe(host); if (lane && lane.parentElement) ro.observe(lane.parentElement);
  // sai só quando o jogador entrou (.cine-leaving, game-flow.js) ou quando a etapa foi escondida; READY sozinho não interrompe a cena
  const mo = new MutationObserver(() => { if (host.classList.contains('cine-leaving') || host.hidden || host.style.display === 'none') leave(); });
  mo.observe(host, { attributes: true, attributeFilter: ['class', 'hidden', 'style'] });
  function leave() { if (state.leaving) return; state.leaving = true; setTimeout(dispose, 900); }
  function dispose() {
    if (state.disposed) return; state.disposed = true; cancelAnimationFrame(raf); ro.disconnect(); mo.disconnect();
    for (const a of [...actors, ...(kneeler ? [kneeler] : [])]) { a.mixer.stopAllAction(); a.mixer.uncacheRoot(a.model); }
    if (battle) { try { battle.dispose(); } catch (_) {} }
    if (runner) { runner.mixer.stopAllAction(); runScene.traverse(o => { if (o.geometry) trash.add(o.geometry); }); }
    scene.traverse(o => { if (o.geometry) trash.add(o.geometry); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { trash.add(m); for (const k in m) { const v = m[k]; if (v && v.isTexture) trash.add(v); } }); });
    for (const d of trash) { try { d.dispose && d.dispose(); } catch (_) {} }
    renderer.dispose(); try { renderer.forceContextLoss(); } catch (_) {} canvas.remove(); state.log.push('descartado'); if (window.__loadingCine === api) window.__loadingCine = null;
  }

  const api = { state, scene, camera, renderer, actors, byId, sets, dispose, leave, get battle() { return battle; }, get kneeler() { return kneeler; }, prepareBattle,
    /** QA: avança o relógio (s, absoluto desde o início) em passos de 1/sub s e desenha. */
    seek(t, sub = 12) { const d = t - state.t; if (d > 0) { const n = Math.max(1, Math.ceil(d * sub)); for (let i = 0; i < n; i++) update(d / n); } renderer.render(scene, camera); return state.t; },
    /** QA: pula direto para a batalha (com o pano na lente). */
    toBattle(at = 0) { if (!(battle && battle.ready)) return false; if (state.seg !== 'battle') switchSegment('battle'); if (at > 0) { const n = Math.ceil(at * 12); for (let i = 0; i < n; i++) update(at / n); } renderer.render(scene, camera); return true; },
    pause(v = true) { state.paused = v; }, focus(id = null) { state.qa = id; update(0); renderer.render(scene, camera); }, render() { renderer.render(scene, camera); },
    cam(pos = null, look = null, fov = 0) { state.qaCam = pos ? [pos, look, fov] : null; if (battle) battle.qaCam = state.qaCam; update(0); renderer.render(scene, camera); },
    stats() { const i = renderer.info; return { draws: i.render.calls, tris: i.render.triangles, geos: i.memory.geometries, tex: i.memory.textures, programs: (i.programs || []).length, t: state.t, seg: state.seg, segT: state.segT, fps: state.fps, actors: actors.length, battle: battle ? battle.stats() : null, explosions: explosions.active(), sets: sets.map(s => s.built), log: state.log.slice(-24) }; } };
  window.__loadingCine = api;

  (async () => {
    layout(); raf = requestAnimationFrame(frame);
    buildAct(0);
    const loaded = await Promise.all(CAST.map(d => loadActor(d).catch(e => { state.log.push(d.id + ' falhou: ' + e.message); return null; })));
    if (state.disposed) return; for (const a of loaded) if (a) { actors.push(a); byId[a.def.id] = a; }
    layout(); host.classList.add('lc-ready'); state.ready = performance.now(); state.log.push('elenco pronto ' + actors.length);
    await Promise.all(actors.map(a => arm(a)));
    loadKneeler().catch(e => state.log.push('passante falhou: ' + e.message));
    loadRunner().catch(e => state.log.push('miniatura falhou: ' + e.message));
    setTimeout(() => { if (!state.disposed) prepareBattle(); }, reduced ? 0 : 1500); // a batalha carrega sem disputar com o elenco
    let f0 = state.frames, t0 = performance.now(); const fpsTimer = setInterval(() => { if (state.disposed) return clearInterval(fpsTimer); const now = performance.now(); state.fps = Math.round((state.frames - f0) * 1000 / (now - t0)); f0 = state.frames; t0 = now;
      if (state.fps && state.fps < (coarse ? 22 : 34) && dpr > .75) { dpr = Math.max(.75, dpr * .8); renderer.setPixelRatio(dpr); layout(); } }, 2000);
  })();
  return api;
}
