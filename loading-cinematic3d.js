/**
 * MOD 374 — ABERTURA CINEMATOGRÁFICA DO CARREGAMENTO: "A MARCHA DOS PECADOS".
 *
 * Enquanto o loader (mod181-loader.js) baixa e monta o mundo, cinco SILHUETAS caminham na direção da câmera:
 * GANÂNCIA no centro (duas foices do arsenal real), VHAZRAEL e VORGAZHEK à esquerda, ZAR'KHAEL e VÉRAXION à direita
 * (VÉRAXION de mãos vazias). Atrás deles o mundo que acabaram de atravessar desmorona em três atos (vila em chamas,
 * arena/muralhas sob explosões e o vilarejo da neve queimando), ligados por paredes de fumaça. Duas vinhetas curtas:
 * VÉRAXION perfura um passante; a GANÂNCIA o decepa com um corte único.
 *
 * Regras de produção (ver docs/loading/LOADING-CINEMATICO-MOD374.md):
 *  • Modelos: versões de SILHUETA derivadas dos GLBs reais (tools/loading-cinematic/derive-silhouettes.mjs): mesma
 *    malha/esqueleto/clipes, sem texturas. Os GLBs e materiais do gameplay NUNCA são tocados.
 *  • Cada personagem = sombra quase preta + DOIS acentos: carmesim (olhos/sorriso/sangue) e um recorte próprio.
 *  • Esteira: os clipes nativos de caminhada têm o deslocamento horizontal do quadril removido; o chão e os cenários
 *    andam à velocidade medida do próprio clipe (timeScale por personagem iguala a passada à esteira → sem patinar).
 *  • Progresso continua 100% do loader real; esta cena só observa #loading e se desmonta quando ele some.
 *  • Desempenho: sem mapa de sombras (sombras de contato falsas), luzes mínimas, pools fixos de partículas/estilhaços,
 *    DPR limitado, 30 fps no celular, pausa com a aba oculta, descarte completo ao sair.
 */
import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';

export const LOADING_CINE_BUILD = '374-marcha-dos-pecados';
export const CYCLE = 36;                       // s: um ciclo = três atos de 12 s; repete sem salto
export const ACTS = [
  { id: 'vila', name: 'Vila em chamas', sky: [.30, .045, .02], glow: [1, .32, .08], fog: 0x1a0806 },
  { id: 'arena', name: 'Arena e muralhas', sky: [.22, .03, .05], glow: [1, .2, .12], fog: 0x170509 },
  { id: 'neve', name: 'Vilarejo da neve', sky: [.12, .1, .13], glow: [1, .42, .14], fog: 0x0f0c10 }
];
/** Elenco: arquivo de silhueta, lugar na formação (x lateral, z profundidade; retrato aproxima), altura-alvo, recorte. */
export const CAST = [
  { id: 'ganancia', name: 'Ganância', file: 'ganancia-silhueta.glb', x: 0, z: 0, h: 2.45, rim: 0xc08a3a, rimK: .5, rimDir: [0, 1], eyes: 'vortex', weapons: ['greedA', 'greedB'], phase: 0 },
  { id: 'bispo1', name: 'VHAZRAEL', file: 'bispo1-silhueta.glb', x: -1.25, z: -.72, h: 2.2, rim: 0x8a74ff, rimK: .34, rimDir: [-1, .3], eyes: 'xx', weapons: ['throne'], phase: .31 },
  { id: 'bispo2', name: 'VORGAZHEK', file: 'bispo2-silhueta.glb', x: -2.45, z: -1.38, h: 2.1, rim: 0x2fb3a6, rimK: .4, rimDir: [-1, .2], eyes: '++', weapons: ['axe'], phase: .64 },
  { id: 'bispo3', name: "ZAR'KHAEL", file: 'bispo3-silhueta.glb', x: 1.25, z: -.66, h: 2.15, rim: 0xc9c1b0, rimK: .42, rimDir: [1, .3], eyes: 'x+', weapons: ['scythe'], phase: .18 },
  { id: 'bispo4', name: 'VÉRAXION', file: 'bispo4-silhueta.glb', x: 2.5, z: -1.42, h: 2.05, rim: 0x6f93e6, rimK: .4, rimDir: [1, .2], eyes: 'orb', weapons: [], phase: .47 }
];
/** Vinhetas (tempo dentro do ciclo, em s). Uma vez por ciclo; nunca no primeiro segundo nem atravessando a troca de ato. */
export const VIGNETTES = [
  { id: 'perfuracao', who: 'bispo4', at: 7.2, clip: 'Charged_Upward_Slash', from: .35, to: 1.55, contact: .98, npcSide: 1 },
  { id: 'decapitacao', who: 'ganancia', at: 19.0, clip: 'Left_Slash', from: .45, to: 1.6, contact: .87, npcSide: -1, weapon: 'greedB' }
];

const CRIMSON = new T.Color(0xff1a2c);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k;
const smooth = k => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

const NOISE = `float h1(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h1(i),h1(i+vec2(1,0)),f.x),mix(h1(i+vec2(0,1)),h1(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*n2(p);p*=2.03;a*=.5;}return s;}`;
/* billboard esférico: o plano encara a câmera e mantém a escala do objeto */
const BB_V = `varying vec2 vUv; void main(){ vUv=uv; vec4 mv=modelViewMatrix*vec4(0.,0.,0.,1.); float s=length(modelMatrix[0].xyz); mv.xy+=position.xy*s; gl_Position=projectionMatrix*mv; }`;
const PLANE_V = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;

/* ---------------- olhos e sorrisos (carmesim) ---------------- */
// Olhos (refino 2A): traços de luz FINOS — núcleo nítido + halo curto; pulsação em camadas e microvariação de energia.
// uShape: 0 = X, 1 = cruz latina, 2 = vórtice (filamentos espirais girando em profundidade).
const EYE_F = `uniform float uShape,uT,uSeed; varying vec2 vUv;
float bar(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}
void main(){ vec2 p=vUv*2.-1.; float t=uT+uSeed*7.; float d;
 float wob=.012*sin(t*5.3+p.y*9.)+.008*sin(t*11.7+p.x*13.);
 if(uShape<.5){ float e=.56+.03*sin(t*1.7); d=min(bar(p,vec2(-e,-e),vec2(e,e)),bar(p,vec2(-e,e),vec2(e,-e)))+wob; }
 else if(uShape<1.5){ d=min(bar(p,vec2(0.,-.7),vec2(0.,.58)),bar(p,vec2(-.42,.2),vec2(.42,.2)))+wob; }
 else { float r=length(p),a=atan(p.y,p.x); float f=fract(a/6.2832*3.+log(r+.04)*1.35-t*.42); float fil=abs(f-.5);
   d=mix(fil*.55,1.,smoothstep(.92,1.,r))+smoothstep(.35,0.,r)*-.08; d=max(d,abs(r-.86)*.6-.0) ; d=min(d,abs(r-.9)+.03); d=min(d,r-.06); }
 float core=1.-smoothstep(.012,.038,d), line=1.-smoothstep(.03,.075,d), halo=exp(-d*16.)*.42+exp(-d*5.)*.12;
 float pulse=.78+.12*sin(t*2.3)+.06*sin(t*6.7+1.3)+.04*sin(t*17.+p.x*3.);
 vec3 c=vec3(1.,.02,.045)*(line*1.5+halo)+vec3(1.,.62,.55)*core*.9; c*=pulse;
 float a=clamp(line+halo,0.,1.); if(a<.008) discard; gl_FragColor=vec4(c*a,a); }`;
// Sorriso (refino 2A): fenda estreita e longa, assimétrica, com lábio carmesim fino, dentes individuais irregulares com
// esmalte claro e reflexo concentrado; fios de sangue nascem entre os dentes/cantos e escorrem até o queixo. Parâmetros
// por personagem: largura, curva, assimetria, espessura, nº de dentes, irregularidade, fios (x) e período do escorrer.
// Conceito de origem: a fenda curva de espaço negativo da Dimensão do Bispo 2 (vorgazhek-ultimate3d.js).
const GRIN_F = `uniform float uT,uW,uCurve,uAsym,uTh,uN,uJag,uSeed,uPer; uniform vec3 uStreak; varying vec2 vUv;
float h1(float n){return fract(sin(n*127.1+uSeed*31.7)*43758.5453);}
void main(){ vec2 p=vUv*2.-1.; float gx=p.x/uW; vec2 q=vec2(gx,p.y-.42);
 float inX=step(abs(gx),1.); float curve=uCurve*(gx*gx-1.)+uAsym*gx*(1.+gx)*.5; float th=uTh*pow(max(0.,1.-gx*gx),.65)+.004;
 float y=q.y-curve; float d=abs(y)-th; float inside=(1.-smoothstep(-.004,.006,d))*inX;
 float lip=(1.-smoothstep(.0,.018,abs(d)))*inX*smoothstep(1.,.9,abs(gx));
 float k=(gx*.5+.5)*uN, tid=floor(k), tx=fract(k), jag=1.+(h1(tid)-.5)*uJag, jag2=1.+(h1(tid+40.)-.5)*uJag;
 float tw=abs(tx-.5)*2.; float upT=step(th-th*1.35*jag*(1.-tw*tw),y)*step(.1,tx)*step(tx,.9);
 float loT=step(y,-th+th*1.05*jag2*(1.-tw*tw))*step(.16,tx)*step(tx,.84)*step(.25,h1(tid+7.));
 float teeth=clamp(upT+loT,0.,1.)*inside*smoothstep(.97,.75,abs(gx));
 float spec=teeth*smoothstep(.55,.0,abs(tx-.38))*smoothstep(.0,.6,abs(y)/max(th,.01));
 vec3 c=vec3(.01,0.,.002); c=mix(c,vec3(.92,.86,.76)*1.25,teeth); c+=vec3(1.,.96,.9)*spec*.9; c=mix(c,vec3(1.,.04,.08)*1.4,lip*(1.-teeth));
 float a=max(inside,lip);
 // sangue: até três fios (x em uStreak; <-1 = sem fio) que descem do lábio inferior até o queixo e reiniciam por período
 for(int i=0;i<3;i++){ float sx=uStreak[i]; if(sx<-1.) continue; float ph=fract(uT/uPer+h1(float(i)*3.)); float len=.15+ph*.85;
   float y0=.42+(uCurve*(sx*sx-1.)+uAsym*sx*(1.+sx)*.5)-uTh*pow(max(0.,1.-sx*sx),.65); float yy=y0-p.y;
   float px=p.x-sx*uW+.01*sin(p.y*20.+float(i)); float w=.018*(1.-smoothstep(0.,len,yy)*.6);
   float s=(1.-smoothstep(w*.5,w,abs(px)))*step(0.,yy)*step(yy,len); float drop=1.-smoothstep(.025,.04,length(vec2(px,(yy-len)*.8)));
   float b=max(s,drop*step(.2,ph)); c=mix(c,vec3(.55,0.,.03)+vec3(.35,0.,.02)*b,b*(1.-inside)); a=max(a,b*.95*(1.-inside)); }
 if(a<.01) discard; gl_FragColor=vec4(c,a); }`;

/* ---------------- céu, chão, fogo, fumaça, explosões ---------------- */
const SKY_V = `varying vec3 vD; void main(){ vD=normalize(position); vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position=p.xyww; }`;
const SKY_F = `${NOISE} uniform vec3 uSky,uGlow; uniform float uT,uFlash; varying vec3 vD;
void main(){ float h=vD.y; vec3 top=vec3(.006,.004,.008); vec3 c=mix(uSky,top,smoothstep(-.02,.55,h));
 float az=atan(vD.x,-vD.z); float cl=fbm(vec2(az*2.6+uT*.012,h*5.-uT*.05)); float smoke=smoothstep(.35,.85,cl)*smoothstep(.65,.05,h);
 c=mix(c,vec3(.02,.008,.006),smoke*.85);
 float band=exp(-max(h,0.)*9.)*(.55+.45*fbm(vec2(az*6.,uT*.08))); c+=uGlow*band*.5;
 c+=uGlow*uFlash*exp(-max(h,0.)*3.)*.6; gl_FragColor=vec4(c,1.); }`;
const GROUND_F = `${NOISE} uniform float uScroll,uT; uniform vec3 uGlow; varying vec2 vUv; varying vec3 vW;
vec3 vor(vec2 p){ vec2 i=floor(p),f=fract(p); float d1=8.,d2=8.; vec2 id=vec2(0.); for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){ vec2 g=vec2(x,y); vec2 o=vec2(h1(i+g),h1(i+g+17.))*.85; vec2 r=g+o-f; float d=dot(r,r); if(d<d1){d2=d1;d1=d;id=i+g;}else if(d<d2)d2=d; } return vec3(sqrt(d2)-sqrt(d1),h1(id),h1(id+5.)); }
void main(){ vec2 p=vec2(vW.x,vW.z+uScroll); vec3 v=vor(p*vec2(1.7,1.35));
 float joint=smoothstep(.02,.14,v.x);
 float stone=.03+.03*v.y+.018*fbm(p*3.)-.012*smoothstep(.6,1.,v.z);
 float road=smoothstep(4.6,3.2,abs(vW.x)); vec3 c=mix(vec3(.018,.012,.01),vec3(stone*1.1,stone*.9,stone*.8),road)*mix(.45,1.,joint);
 float fc=fbm(p*.55+3.); float crack=smoothstep(.012,0.,abs(fc-.56))*(1.-joint*.4); float emb=crack*(.55+.45*sin(uT*2.+p.y*1.3))*step(.6,h1(floor(p*.25)));
 c+=uGlow*emb*.35*road; float dist=smoothstep(-10.,-55.,vW.z); c=mix(c,c*.4,dist);
 gl_FragColor=vec4(c,1.); }`;
const GROUND_V = `varying vec2 vUv; varying vec3 vW; void main(){ vUv=uv; vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
const FLAME_F = `${NOISE} uniform float uT,uSeed,uI; varying vec2 vUv;
void main(){ vec2 p=vUv; float y=p.y; float n=fbm(vec2(p.x*4.+uSeed,y*3.-uT*2.8)), m=fbm(vec2(p.x*9.-uSeed,y*6.-uT*4.6));
 float w=.4*pow(1.-y,1.2)*smoothstep(0.,.16,y)+.015; float x=abs(p.x-.5+(n-.5)*.38*y+(m-.5)*.08);
 float body=smoothstep(w,w*.15,x); float tongue=smoothstep(.98,.3,y+n*.5+m*.15); float a=body*tongue*uI;
 float core=smoothstep(w*.55,0.,x)*smoothstep(.65,.05,y+n*.2);
 vec3 c=mix(vec3(.9,.16,.02),vec3(1.,.55,.12),core); c=mix(c,vec3(1.,.92,.62),core*smoothstep(.45,.0,y)); c=mix(c,vec3(.25,.02,.01),smoothstep(.5,.95,y+n*.25));
 if(a<.01) discard; gl_FragColor=vec4(c*a*1.5,a); }`;
const SMOKE_F = `${NOISE} uniform float uT,uSeed,uA,uLit; uniform vec3 uGlow; varying vec2 vUv;
void main(){ vec2 p=vUv*2.-1.; float r=length(p); float n=fbm(p*1.6+vec2(uSeed,uT*.15)); float a=smoothstep(1.,.25,r+(n-.5)*.7)*uA;
 if(a<.01) discard; vec3 c=mix(vec3(.025,.018,.016),uGlow*.35,uLit*smoothstep(.2,-.8,p.y)*n); gl_FragColor=vec4(c,a*.85); }`;
const FIREBALL_F = `${NOISE} uniform float uT,uK,uSeed; varying vec2 vUv;
void main(){ vec2 p=vUv*2.-1.; float r=length(p); float n=fbm(p*2.2+vec2(uSeed,-uT*.9)); float edge=.35+.6*smoothstep(0.,.35,uK);
 float n2v=fbm(p*5.-vec2(uT*.6,uSeed)); float body=smoothstep(edge,edge-.3,r+(n-.5)*.8+(n2v-.5)*.25); float cool=smoothstep(.1,.85,uK);
 vec3 hot=mix(vec3(1.,.95,.75),vec3(1.,.45,.08),smoothstep(0.,.6,r+cool*.5)); vec3 c=mix(hot,vec3(.07,.02,.015),smoothstep(.25,.85,cool+n*.45+r*.2)); c*=.75+.5*n2v;
 float a=body*(1.-smoothstep(.7,1.,uK)); if(a<.01) discard; gl_FragColor=vec4(c*a*(1.6-cool),a); }`;
const FLASH_F = `uniform float uA; uniform vec3 uC; varying vec2 vUv; void main(){ vec2 p=vUv*2.-1.; float r=length(p); float a=exp(-r*r*5.)*uA; if(a<.004) discard; gl_FragColor=vec4(uC*a,a); }`;
const POINTS_V = `attribute float aSeed; uniform float uT,uScroll,uMode,uH; uniform float uPix; varying float vA; varying float vS;
void main(){ vS=aSeed; vec3 p=position; float life=fract(uT*(.06+.05*aSeed)+aSeed*7.13);
 if(uMode<.5){ p.y=life*uH; p.x+=sin(uT*.9+aSeed*30.)*.8*life; p.z=mod(p.z-uScroll+60.,70.)-60.; vA=sin(life*3.1416)*(.5+.5*sin(uT*9.+aSeed*50.)); }
 else { p.y=uH*(1.-life); p.x+=sin(uT*.5+aSeed*20.)*1.2; p.z=mod(p.z-uScroll+40.,50.)-40.; vA=smoothstep(0.,.15,life)*smoothstep(1.,.8,life)*.5; }
 vec4 mv=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv; gl_PointSize=uPix*(uMode<.5?(1.2+aSeed*1.8):(1.+aSeed*1.4))*12./-mv.z; }`;
const POINTS_F = `uniform float uMode; varying float vA; varying float vS; void main(){ vec2 p=gl_PointCoord*2.-1.; float r=dot(p,p); if(r>1.) discard;
 vec3 c=uMode<.5?mix(vec3(1.,.55,.15),vec3(1.,.25,.05),vS):vec3(.26,.24,.23); float a=(uMode<.5?(1.-r):(1.-r)*.8)*vA; gl_FragColor=vec4(c*(uMode<.5?a*1.5:1.),a); }`;
// arco do corte da Ganância: carmesim com poeira de estrelas (identidade cósmica/sangue das foices)
const ARC_F = `${NOISE} uniform float uK; varying vec2 vUv; void main(){ float u=vUv.x,v=vUv.y; float head=smoothstep(uK-.55,uK,u)*step(u,uK+.02);
 float thick=smoothstep(.0,.35,v)*smoothstep(1.,.55,v); float core=smoothstep(.62,.9,v)*smoothstep(1.,.92,v);
 float stars=step(.93,h1(floor(vec2(u*90.,v*12.))))*thick; vec3 c=mix(vec3(.35,.0,.03),vec3(1.,.08,.12),thick); c=mix(c,vec3(1.,.88,.86),core); c+=vec3(1.,.8,.95)*stars;
 float a=head*(thick*.8+core)*(1.-smoothstep(.85,1.,uK)); if(a<.01) discard; gl_FragColor=vec4(c*a*1.5,a); }`;

/** Material de silhueta: quase preto + recorte direcional (2º acento) injetado no emissivo. Clone exclusivo da cena. */
function silhouetteMaterial(rimHex, rimDir = [0, 1], k = 1, skinned = true) {
  const m = new T.MeshStandardMaterial({ color: 0x030304, roughness: 1, metalness: 0 });
  const rim = new T.Color(rimHex), dir = new T.Vector2(rimDir[0], rimDir[1]).normalize();
  m.userData.rim = { value: rim }; m.userData.rimK = { value: k }; m.userData.dir = { value: dir };
  m.onBeforeCompile = s => {
    s.uniforms.uRim = m.userData.rim; s.uniforms.uRimK = m.userData.rimK; s.uniforms.uRimDir = m.userData.dir;
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uRim; uniform float uRimK; uniform vec2 uRimDir;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      { vec3 vv=normalize(vViewPosition); float fr=1.-clamp(abs(dot(normal,vv)),0.,1.); float side=smoothstep(.15,.95,dot(normalize(normal.xy+1e-4),uRimDir)*.5+.5);
        totalEmissiveRadiance+=uRim*uRimK*pow(fr,5.)*side; }`);
  };
  m.customProgramCacheKey = () => 'lc-sil';
  return m;
}

/** Remove o avanço horizontal do quadril do clipe (esteira) e devolve a velocidade NATIVA medida (m/s no mundo). */
function treadmill(clip, root, hips) {
  const tr = clip.tracks.find(t => t.name === hips.name + '.position'); if (!tr) return 0;
  const mixer = new T.AnimationMixer(root), a = mixer.clipAction(clip); a.play();
  const p0 = new T.Vector3(), p1 = new T.Vector3(); mixer.setTime(0); root.updateMatrixWorld(true); hips.getWorldPosition(p0);
  mixer.setTime(clip.duration - 1e-3); root.updateMatrixWorld(true); hips.getWorldPosition(p1); mixer.stopAllAction(); mixer.uncacheRoot(root);
  const v = tr.values, x0 = v[0], z0 = v[2]; for (let i = 0; i < v.length; i += 3) { v[i] = x0; v[i + 2] = z0; }
  return Math.hypot(p1.x - p0.x, p1.z - p0.z) / clip.duration;
}

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
  renderer.setPixelRatio(dpr); renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const scene = new T.Scene(), camera = new T.PerspectiveCamera(40, 1, .1, 400);
  scene.fog = new T.FogExp2(ACTS[0].fog, .022);
  const trash = new Set(), keep = o => (trash.add(o), o);
  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  const url = f => new URL(f, base).href + (build ? (f.includes('?') ? '&' : '?') + 'v=' + encodeURIComponent(build) : '');
  const state = { t: 0, real: 0, scroll: 0, V: 1.05, act: 0, actBlend: 0, ready: 0, flash: 0, portrait: false, disposed: false, fps: 0, frames: 0, vignette: null, log: [] };

  /* luzes: uma contraluz quente (fogo atrás) e um hemisférico mínimo. Nada de sombras dinâmicas. */
  const hemi = new T.HemisphereLight(0x2a1410, 0x050303, .25); scene.add(hemi);
  const back = new T.DirectionalLight(0xff3c18, .55); back.position.set(0, 6, -20); scene.add(back);
  const fill = new T.DirectionalLight(0x40507a, .18); fill.position.set(3, 4, 12); scene.add(fill);

  /* céu */
  const skyU = { uSky: { value: new T.Vector3(...ACTS[0].sky) }, uGlow: { value: new T.Vector3(...ACTS[0].glow) }, uT: { value: 0 }, uFlash: { value: 0 } };
  const sky = new T.Mesh(keep(new T.SphereGeometry(300, 32, 16)), keep(new T.ShaderMaterial({ uniforms: skyU, vertexShader: SKY_V, fragmentShader: SKY_F, side: T.BackSide, depthWrite: false, fog: false })));
  sky.renderOrder = -10; scene.add(sky);
  /* chão de pedra queimada que corre (esteira) */
  const groundU = { uScroll: { value: 0 }, uT: { value: 0 }, uGlow: skyU.uGlow };
  const ground = new T.Mesh(keep(new T.PlaneGeometry(140, 160).rotateX(-Math.PI / 2)), keep(new T.ShaderMaterial({ uniforms: groundU, vertexShader: GROUND_V, fragmentShader: GROUND_F })));
  ground.position.z = -60; scene.add(ground);

  /* partículas: brasas subindo e cinzas caindo (um único Points cada, sem alocação por quadro) */
  function points(n, mode, h, spread) {
    const g = keep(new T.BufferGeometry()), p = new Float32Array(n * 3), s = new Float32Array(n);
    for (let i = 0; i < n; i++) { p[i * 3] = (hash(i + mode * 99) - .5) * spread; p[i * 3 + 1] = 0; p[i * 3 + 2] = -hash(i * 3.1 + mode) * 60 + 8; s[i] = hash(i * 7.7 + mode * 3); }
    g.setAttribute('position', new T.BufferAttribute(p, 3)); g.setAttribute('aSeed', new T.BufferAttribute(s, 1));
    const u = { uT: { value: 0 }, uScroll: { value: 0 }, uMode: { value: mode }, uH: { value: h }, uPix: { value: 1 } };
    const m = keep(new T.ShaderMaterial({ uniforms: u, vertexShader: POINTS_V, fragmentShader: POINTS_F, transparent: true, depthWrite: false, blending: mode ? T.NormalBlending : T.AdditiveBlending }));
    const o = new T.Points(g, m); o.frustumCulled = false; scene.add(o); return u;
  }
  const emberU = points(low ? 160 : 320, 0, 12, 46), ashU = points(low ? 120 : 240, 1, 14, 40);

  /* ---------- pools de VFX ---------- */
  const bbGeo = keep(new T.PlaneGeometry(1, 1)), flameGeo = keep(new T.PlaneGeometry(1, 1).translate(0, .5, 0));
  const mkBB = (frag, uniforms, additive, geo = bbGeo) => { const m = keep(new T.ShaderMaterial({ uniforms, vertexShader: BB_V, fragmentShader: frag, transparent: true, depthWrite: false, blending: additive ? T.AdditiveBlending : T.NormalBlending })); const o = new T.Mesh(geo, m); o.frustumCulled = false; return o; };
  const explosions = [];
  for (let i = 0; i < (low ? 3 : 5); i++) {
    const g = new T.Group(); g.visible = false; scene.add(g);
    const fb = mkBB(FIREBALL_F, { uT: { value: 0 }, uK: { value: 0 }, uSeed: { value: i * 3.7 } }, true), fl = mkBB(FLASH_F, { uA: { value: 0 }, uC: { value: new T.Vector3(1, .7, .45) } }, true);
    const sm = mkBB(SMOKE_F, { uT: { value: 0 }, uSeed: { value: i * 5.1 }, uA: { value: 0 }, uLit: { value: 1 }, uGlow: skyU.uGlow }, false);
    sm.renderOrder = 1; fb.renderOrder = 2; fl.renderOrder = 3; g.add(sm, fb, fl);
    explosions.push({ g, fb, fl, sm, t: -1, size: 1, z: 0, x: 0, y: 0 });
  }
  /* estilhaços: um InstancedMesh com lascas pontudas (tetraedros alongados) */
  const SH = low ? 48 : 96, shardGeo = keep(new T.TetrahedronGeometry(.18).scale(1, 2.2, .6)), shardMat = keep(silhouetteMaterial(0xff6a2a, [0, 1], .6, false));
  const shards = new T.InstancedMesh(shardGeo, shardMat, SH); shards.frustumCulled = false; shards.count = SH; scene.add(shards);
  const shardS = Array.from({ length: SH }, () => ({ on: false, p: new T.Vector3(), v: new T.Vector3(), r: new T.Euler(), w: new T.Vector3(), s: 1 })); let shardNext = 0;
  const _m = new T.Matrix4(), _q = new T.Quaternion(), _v = new T.Vector3(), _v2 = new T.Vector3(), _s = new T.Vector3();
  function boom(x, y, z, size = 1) {
    const e = explosions.find(e => e.t < 0) || explosions[0]; e.t = 0; e.x = x; e.y = y; e.z = z; e.size = size; e.g.visible = true;
    for (let i = 0; i < (low ? 8 : 14); i++) { const s = shardS[shardNext++ % SH]; s.on = true; s.p.set(x, y + .5 * size, z); const a = Math.random() * Math.PI * 2, up = 4 + Math.random() * 7;
      s.v.set(Math.cos(a) * (3 + Math.random() * 6) * size, up * size * .8, -Math.abs(Math.sin(a)) * (3 + Math.random() * 5) * size); s.r.set(Math.random() * 6, Math.random() * 6, Math.random() * 6); s.w.set(Math.random() * 8, Math.random() * 8, Math.random() * 8); s.s = (.6 + Math.random() * 1.6) * size; }
  }

  /* clarão carmesim do contato (vinhetas) */
  const hit = mkBB(FLASH_F, { uA: { value: 0 }, uC: { value: new T.Vector3(1, .06, .1) } }, true); hit.renderOrder = 14; scene.add(hit); let hitT = -1;
  function hitFlash(p, size) { hit.position.copy(p); hit.scale.setScalar(size); hitT = 0; }
  /* arco do corte da Ganância: fita entre a ponta e o meio da lâmina REAL, gravada quadro a quadro na janela do golpe */
  const AN = 28, arcPos = new Float32Array(AN * 2 * 3), arcUv = new Float32Array(AN * 2 * 2), arcIdx = [];
  for (let i = 0; i < AN; i++) { arcUv.set([i / (AN - 1), 0, i / (AN - 1), 1], i * 4); if (i < AN - 1) { const k = i * 2; arcIdx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } }
  const arcGeo = keep(new T.BufferGeometry()); arcGeo.setAttribute('position', new T.BufferAttribute(arcPos, 3)); arcGeo.setAttribute('uv', new T.BufferAttribute(arcUv, 2)); arcGeo.setIndex(arcIdx);
  const arcU = { uK: { value: 0 } }, arc = new T.Mesh(arcGeo, keep(new T.ShaderMaterial({ uniforms: arcU, vertexShader: PLANE_V, fragmentShader: ARC_F, transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending })));
  arc.frustumCulled = false; arc.visible = false; arc.renderOrder = 13; scene.add(arc); const arcPts = []; let arcLife = -1;
  function arcRecord(w) { const ud = w.root.children[0].userData, tip = ud.tip ? ud.tip.clone() : new T.Vector3(0, 1.5, 0), mid = tip.clone().lerp(new T.Vector3(0, (ud.len || 1.6) * .62, 0), .55);
    const wObj = w.root.children[0]; wObj.updateWorldMatrix(true, false); arcPts.push([wObj.localToWorld(tip), wObj.localToWorld(mid)]); if (arcPts.length > AN) arcPts.shift(); }
  function arcDraw() { const n = arcPts.length; if (n < 2) { arc.visible = false; return; } arc.visible = true;
    for (let i = 0; i < AN; i++) { const src = arcPts[Math.max(0, Math.min(n - 1, Math.round(i / (AN - 1) * (n - 1))))]; arcPos.set([src[1].x, src[1].y, src[1].z, src[0].x, src[0].y, src[0].z], i * 6); }
    arcGeo.attributes.position.needsUpdate = true; }
  /* ---------- sangue (gotas com gravidade + respingo no chão) ---------- */
  const DR = 40, dropGeo = keep(new T.SphereGeometry(.011, 6, 5).scale(1, 2.4, 1)), dropMat = keep(new T.MeshBasicMaterial({ color: 0x9a0010, toneMapped: false }));
  const drops = new T.InstancedMesh(dropGeo, dropMat, DR); drops.frustumCulled = false; scene.add(drops);
  const splatGeo = keep(new T.CircleGeometry(.05, 10).rotateX(-Math.PI / 2)), splatMat = keep(new T.MeshBasicMaterial({ color: 0x4a0008, transparent: true, opacity: .85, depthWrite: false }));
  const splats = new T.InstancedMesh(splatGeo, splatMat, DR); splats.frustumCulled = false; scene.add(splats);
  const dropS = Array.from({ length: DR }, () => ({ on: false, p: new T.Vector3(), v: new T.Vector3(), splat: -1, sp: new T.Vector3(), ss: 1 })); let dropNext = 0;
  function bleed(p, vx = 0, vz = 0, n = 1, spread = .4) {
    for (let i = 0; i < n; i++) { const d = dropS[dropNext++ % DR]; d.on = true; d.splat = -1; d.p.copy(p); d.v.set(vx + (Math.random() - .5) * spread, Math.random() * spread * .8, vz + (Math.random() - .5) * spread); }
  }

  /* ---------- cenários: três atos de peças reais (VilaKit, CasaEldoria, Coliseu, TorreKit, NeveKit) ---------- */
  const bMat = keep(silhouetteMaterial(0xff4a14, [0, 1], .16, false)); bMat.color.setHex(0x050303);
  const kits = {};
  const kitFiles = { vila: './VilaKit.glb', casa1: './CasaEldoria01-lod1.glb', casa2: './CasaEldoria02-lod1.glb', ferreiro: './FerreiroEldoria-lod1.glb', torre: './TorreKit.glb?v=mod207', coliseu: './Coliseu.glb?v=mod208', neve: './NeveKit.glb?v=mod206' };
  const loadKit = k => kits[k] || (kits[k] = new Promise(res => new GLTFLoader().load(new URL(kitFiles[k], base).href, g => res(g.scene), undefined, () => res(null))));
  const pieceSrc = (kit, name) => { if (!kit) return null; if (!name) return kit; let f = null; kit.traverse(o => { if (!f && o.name === name) f = o; }); return f; };
  /** Peça: clone da malha original com o material de silhueta, base no chão, altura-alvo; fogos/fumaça presos a ela. */
  function makePiece(src, height, side) {
    const g = new T.Group(), c = src.clone(true); c.position.set(0, 0, 0); c.rotation.set(0, 0, 0); c.scale.set(1, 1, 1);
    c.traverse(o => { if (o.isMesh) { o.material = bMat; o.castShadow = o.receiveShadow = false; o.frustumCulled = false; } });
    const box = new T.Box3().setFromObject(c), size = box.getSize(new T.Vector3()), k = height / Math.max(.01, size.y);
    c.scale.setScalar(k); c.position.set(-(box.min.x + box.max.x) / 2 * k, -box.min.y * k, -(box.min.z + box.max.z) / 2 * k);
    const pivot = new T.Group(); pivot.add(c); g.add(pivot); g.userData = { pivot, w: size.x * k, h: height, d: size.z * k, side, flames: [], smokes: [], collapse: -1, boomed: false };
    // chamas no alto da peça (telhado/topo), proporcionais à largura e nunca soltas no céu
    const nf = low ? 2 : 3, fs = Math.min(height * .42, Math.max(1.4, size.x * k * .32)); for (let i = 0; i < nf; i++) {
      const f = mkBB(FLAME_F, { uT: { value: 0 }, uSeed: { value: Math.random() * 10 }, uI: { value: 0 } }, true, flameGeo);
      f.position.set((i / Math.max(1, nf - 1) - .5) * size.x * k * .55, height * (.72 + .12 * Math.random()), 0); f.scale.setScalar(fs * (.75 + Math.random() * .5)); g.add(f); g.userData.flames.push(f);
    }
    const sm = mkBB(SMOKE_F, { uT: { value: 0 }, uSeed: { value: Math.random() * 10 }, uA: { value: .35 }, uLit: { value: 1 }, uGlow: skyU.uGlow }, false);
    sm.position.set(0, height + fs * 1.4, 0); sm.scale.setScalar(Math.max(fs * 3.2, height * .9)); g.add(sm); g.userData.smokes.push(sm);
    return g;
  }
  /* cada ato = lista de peças (kit, nome, altura, x, distância dentro do ato) + peças distantes do horizonte */
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
  /** Posição das peças: entram por trás da câmera e recuam com o chão; atrás da formação desabam e explodem. */
  function updateSets(tc, dt) {
    for (let i = 0; i < sets.length; i++) {
      const S = sets[i]; if (!S.built) continue;
      const start = i * 12, local = ((tc - start) % CYCLE + CYCLE) % CYCLE; // s desde o início do ato
      const on = local < 18; S.group.visible = on; if (!on) { for (const p of S.pieces) { p.userData.collapse = -1; p.userData.boomed = false; } continue; }
      for (const p of S.pieces) {
        const u = p.userData, travel = state.V * local * 1.9; let z = -1.5 - travel + u.along * 1.9 - 4;
        if (z > -1.5) { p.visible = false; continue; } p.visible = true;
        if (u.far) z = -46 - local * .55 - u.along;
        const half = Math.max(u.w, u.d) / 2; p.position.set(Math.sign(u.x) * Math.max(Math.abs(u.x) * (u.far ? 1 : state.setSpread || 1), 7 + half), 0, u.far ? z - half : z); // a borda interna nunca invade a estrada nem a câmera
        if (u.collapse < 0 && !u.far && z < -15 - (u.along % 4) * 1.5) { u.collapse = 0; }
        if (u.collapse >= 0) { u.collapse += dt; const k = smooth(u.collapse / 2.4);
          u.pivot.rotation.z = -u.side * k * (.35 + .2 * (u.along % 1)); u.pivot.position.y = -k * u.h * .35;
          if (!u.boomed && u.collapse > .15) { u.boomed = true; boom((u.x - u.side * 1.2) * (state.setSpread || 1), u.h * .55, z, Math.min(2.2, u.h / 4.5)); state.flash = Math.max(state.flash, .35); } }
        else { u.pivot.rotation.z = 0; u.pivot.position.y = 0; }
        if (u.far && !u.boomed && local > 6 + (u.along % 4)) { u.boomed = true; boom(u.x * .9, u.h * .5, z + 4, 3.2); state.flash = Math.max(state.flash, .5); }
        const fireK = clamp((-1.5 - z) / 6, 0, 1) * (u.collapse >= 0 ? 1 - smooth((u.collapse - 2) / 3) * .5 : 1);
        for (const f of u.flames) { f.material.uniforms.uT.value = state.real; f.material.uniforms.uI.value = fireK; }
        for (const s of u.smokes) { s.material.uniforms.uT.value = state.real; s.material.uniforms.uA.value = .38 * fireK; s.userData.y0 = s.userData.y0 ?? s.position.y; s.position.y = s.userData.y0 + Math.sin(state.real * .3 + u.along) * .4; }
      }
    }
  }

  /* ---------- personagens ---------- */
  const actors = []; const blobGeo = keep(new T.CircleGeometry(.62, 24).rotateX(-Math.PI / 2));
  const blobMat = keep(new T.ShaderMaterial({ vertexShader: PLANE_V, fragmentShader: 'varying vec2 vUv; void main(){ float r=length(vUv*2.-1.); float a=smoothstep(1.,.1,r)*.75; gl_FragColor=vec4(0.,0.,0.,a); }', transparent: true, depthWrite: false }));
  const eyeGeo = keep(new T.PlaneGeometry(1, 1));
  function eyeMat(shape, seed) { return keep(new T.ShaderMaterial({ uniforms: { uShape: { value: shape }, uT: { value: 0 }, uSeed: { value: seed } }, vertexShader: PLANE_V, fragmentShader: EYE_F, transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false })); }
  /** Orbe pontiagudo do VÉRAXION: icosaedro + espinhos, contrai/expande e gira. */
  function spikyOrb() {
    const g = new T.Group(), core = new T.Mesh(keep(new T.IcosahedronGeometry(.26, 2)), keep(new T.MeshBasicMaterial({ color: 0xffb0a0, toneMapped: false })));
    const ico = new T.IcosahedronGeometry(1, 0), pos = ico.attributes.position, spikes = [], cone = new T.ConeGeometry(.035, 1.05, 4).translate(0, .66, 0);
    const seen = new Set(); for (let i = 0; i < pos.count; i++) { const d = new T.Vector3().fromBufferAttribute(pos, i).normalize(), key = d.toArray().map(x => x.toFixed(2)).join(); if (seen.has(key)) continue; seen.add(key);
      const c = cone.clone().applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), d)); spikes.push(c); }
    ico.dispose(); cone.dispose();
    const merged = keep(new T.BufferGeometry()); { let n = 0; for (const s of spikes) n += s.index ? s.index.count : s.attributes.position.count; const P = new Float32Array(n * 3); let o = 0;
      for (const s of spikes) { const nn = s.toNonIndexed(); P.set(nn.attributes.position.array, o); o += nn.attributes.position.array.length; nn.dispose(); s.dispose(); } merged.setAttribute('position', new T.BufferAttribute(P, 3)); }
    const sp = new T.Mesh(merged, keep(new T.MeshBasicMaterial({ color: 0xff1a2a, toneMapped: false, transparent: true, opacity: .9, blending: T.AdditiveBlending, depthWrite: false }))); const shell = new T.Mesh(keep(new T.IcosahedronGeometry(.42, 1)), keep(new T.MeshBasicMaterial({ color: 0xff0820, toneMapped: false, wireframe: true, transparent: true, opacity: .55, blending: T.AdditiveBlending, depthWrite: false }))); g.add(core, sp, shell); g.userData.shell = shell;
    const glow = new T.Mesh(eyeGeo, keep(new T.ShaderMaterial({ uniforms: { uA: { value: .9 }, uC: { value: new T.Vector3(1, .05, .08) } }, vertexShader: PLANE_V, fragmentShader: FLASH_F, transparent: true, depthWrite: false, blending: T.AdditiveBlending })));
    glow.scale.setScalar(2.2); glow.position.z = -.2; g.add(glow); g.userData.spikes = sp; return g;
  }
  const weaponBuilders = {
    greedA: () => import(new URL('./greed-weapons3d.js?v=mod342', base).href).then(m => m.buildCosmicScythe(T)),
    greedB: () => import(new URL('./greed-weapons3d.js?v=mod342', base).href).then(m => m.buildBloodScythe(T)),
    throne: () => import(new URL('./vhazrael-vfx3d.js', base).href).then(m => m.buildThroneBlade(T)),
    axe: () => import(new URL('./vorgazhek-axe3d.js?v=mod331', base).href).then(m => m.buildAbyssAxe(T)),
    scythe: () => import(new URL('./zarkhael-scythe3d.js?v=mod332', base).href).then(m => m.buildExecutionerScythe(T))
  };
  /* empunhaduras medidas no jogo (mesmas bases de zarkhael-squad3d.js zkGrip, vorgazhek3d.js vgGrip e greed-runtime3d.js) */
  const basis = (x, y, z) => new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(new T.Vector3(...x), new T.Vector3(...y), new T.Vector3(...z)));
  const GRIPS = { greedA: basis([0, 1, 0], [0, 0, 1], [1, 0, 0]), greedB: basis([0, 1, 0], [0, 0, 1], [1, 0, 0]), scythe: basis([0, 1, 0], [0, 0, 1], [1, 0, 0]), axe: basis([0, 1, 0], [0, 0, -1], [-1, 0, 0]) };
  /* ajuste de rosto por personagem (unidades relativas à altura): olhos (separação, altura, frente, tamanho) e boca */
  const FACE = { // olhos (sep/up/fwd/size em fração da altura) + sorriso (y, tamanho, w, curva, assimetria, espessura, dentes, irregular, fios, período)
    ganancia: { sep: .0135, up: .018, fwd: .006, size: .03, my: -.02, ms: .07, w: .58, curve: .07, asym: .05, th: .045, n: 12, jag: .55, streaks: [-.62, .12, .7], per: 3.2 },
    bispo1: { sep: .0135, up: .012, fwd: .012, size: .024, my: -.024, ms: .066, w: .52, curve: .11, asym: -.06, th: .04, n: 10, jag: .4, streaks: [.55, -9, -9], per: 4.1 },
    bispo2: { sep: .017, up: .008, fwd: .012, size: .03, my: -.025, ms: .064, w: .64, curve: .05, asym: .03, th: .035, n: 14, jag: .3, streaks: [-.4, .45, -9], per: 3.6 },
    bispo3: { sep: .015, up: .012, fwd: .022, size: .03, my: -.024, ms: .066, w: .5, curve: .13, asym: .09, th: .05, n: 9, jag: .7, streaks: [-.55, -9, -9], per: 2.8 },
    bispo4: { sep: 0, up: .014, fwd: .016, size: .034, my: -.026, ms: .07, w: .6, curve: .09, asym: -.08, th: .042, n: 13, jag: .5, streaks: [.6, -.2, -9], per: 3.9 }
  };

  async function loadActor(def, isNpc = false) {
    const g = await loader.loadAsync(url('assets/loading/' + def.file)); if (state.disposed) return null;
    const model = g.scene, holder = new T.Group(); holder.add(model);
    const bones = {}; model.traverse(o => { if (o.isBone) bones[o.name] = o; if (o.isMesh) { o.frustumCulled = false; } });
    const mat = keep(silhouetteMaterial(def.rim || 0x5a6070, def.rimDir || [0, 1], def.rimK || .6));
    model.traverse(o => { if (o.isMesh) { o.material = mat; trash.add(o.geometry); } });
    const hips = bones.Hips || bones.mixamorigHips, clips = {}; for (const c of g.animations) clips[c.name] = c;
    const walk = clips.Walking || clips.Walk, natural = walk && hips ? treadmill(walk, model, hips) : 1;
    for (const c of g.animations) if (c !== walk && hips) treadmill(c, model, hips);
    const mixer = new T.AnimationMixer(model);
    const a = { def, holder, model, bones, mixer, clips, walk: walk ? mixer.clipAction(walk) : null, natural, mat, eyes: [], grin: null, weapons: [], mouthAt: null, head: bones.Head, isNpc, drip: 1 + Math.random() * 2 };
    if (a.walk) { a.walk.play(); a.walk.time = (def.phase || 0) * walk.duration; }
    mixer.setTime(0); model.updateMatrixWorld(true);
    const box = new T.Box3().setFromObject(model), H = box.max.y - box.min.y, k = (def.h || 1.8) / Math.max(.01, H);
    model.scale.multiplyScalar(k); model.position.y -= box.min.y * k; a.scale = k; a.H = def.h || 1.8;
    const blob = new T.Mesh(blobGeo, blobMat); blob.scale.setScalar(a.H / 2.1); blob.position.y = .012; holder.add(blob); a.blob = blob;
    scene.add(holder); holder.updateMatrixWorld(true);
    if (!isNpc) dressFace(a);
    return a;
  }
  /** Olhos e sorriso presos ao osso da cabeça (posição medida a partir de headfront → frente real do rosto). */
  function dressFace(a) {
    const F = FACE[a.def.id], head = a.bones.Head, hf = a.bones.headfront; if (!F || !head) return;
    a.model.updateMatrixWorld(true); const hp = head.getWorldPosition(new T.Vector3()), fp = (hf || head).getWorldPosition(new T.Vector3());
    const fwd = new T.Vector3().subVectors(fp, hp).setY(0); if (fwd.lengthSq() < 1e-6) fwd.set(0, 0, 1); fwd.normalize();
    const right = new T.Vector3(fwd.z, 0, -fwd.x), up = new T.Vector3(0, 1, 0), H = a.H, hs = head.getWorldScale(new T.Vector3()).x;
    const at = (dx, dy, dz) => fp.clone().addScaledVector(right, dx * H).addScaledVector(up, dy * H).addScaledVector(fwd, dz * H);
    const place = (o, wp, size) => { head.worldToLocal(o.position.copy(wp)); o.scale.setScalar(size * H / hs); const look = wp.clone().add(fwd); const hq = head.getWorldQuaternion(new T.Quaternion()).invert();
      o.quaternion.copy(hq).multiply(new T.Quaternion().setFromRotationMatrix(new T.Matrix4().lookAt(look, wp, up))); head.add(o); };
    const shapes = { xx: [0, 0], '++': [1, 1], 'x+': [0, 1], vortex: [2, 2] }[a.def.eyes];
    if (a.def.eyes === 'orb') { const o = spikyOrb(); place(o, at(0, F.up, F.fwd + .006), F.size * .5); a.orb = o; a.eyes.push(o); }
    else for (const s of [-1, 1]) { const m = eyeMat(shapes[s < 0 ? 0 : 1], s * 1.7 + a.def.x); const e = new T.Mesh(eyeGeo, m); e.renderOrder = 12; place(e, at(s * F.sep, F.up, F.fwd), F.size); a.eyes.push(e); }
    const st = F.streaks;
    const grinM = keep(new T.ShaderMaterial({ uniforms: { uT: { value: 0 }, uW: { value: F.w }, uCurve: { value: F.curve }, uAsym: { value: F.asym }, uTh: { value: F.th }, uN: { value: F.n }, uJag: { value: F.jag }, uSeed: { value: a.def.x * 3.1 + 1 }, uPer: { value: F.per }, uStreak: { value: new T.Vector3(st[0], st[1], st[2]) } },
      vertexShader: PLANE_V, fragmentShader: GRIN_F, transparent: true, depthWrite: false, toneMapped: false }));
    const grin = new T.Mesh(eyeGeo, grinM); grin.renderOrder = 11; place(grin, at(0, F.my - F.ms * .29, F.fwd + .003), F.ms); a.grin = grin; a.face = F;
    a.dripT = st.map(() => 0);
  }
  async function arm(a) {
    for (const key of a.def.weapons) {
      let w; try { w = await weaponBuilders[key](); } catch (e) { state.log.push('arma ' + key + ' falhou: ' + e.message); continue; }
      if (state.disposed || !w) return; const wm = keep(silhouetteMaterial(a.def.rim, a.def.rimDir, .9, false));
      w.traverse(o => { if (o.isMesh || o.isLine || o.isPoints) { trash.add(o.geometry); if (o.isMesh) o.material = wm; else o.visible = false; o.frustumCulled = false; } });
      if (w.userData.fx) w.userData.fx.visible = false;
      const hand = a.bones[key === 'greedB' ? 'LeftHand' : 'RightHand'] || a.bones[key === 'greedB' ? 'mixamorigLeftHand' : 'mixamorigRightHand']; if (!hand) continue;
      // tamanho relativo ao corpo da silhueta (as armas do jogo foram feitas para a escala do combate)
      const bb = new T.Box3().setFromObject(w), L = Math.max(...bb.getSize(new T.Vector3()).toArray()), kind = /greed|scythe/.test(key) ? 'staff' : 'hang';
      w.scale.setScalar((a.H * (kind === 'staff' ? .92 : key === 'axe' ? .6 : .56)) / Math.max(.01, L));
      const root = new T.Group(); root.add(w); scene.add(root);
      let grip = GRIPS[key]; if (!grip) { // VHAZRAEL: mesma calibração do jogo (vhazrael-rig3d.js calibrateGrip — lâmina baixa à frente na pose neutra)
        try { const m = await import(new URL('./vhazrael-rig3d.js', base).href); grip = m.calibrateGrip(T, a.model, cloneSkinned, a.walk && a.walk.getClip()); } catch (e) { grip = new T.Quaternion(); } }
      a.weapons.push({ root, hand, grip, key, kind, side: key === 'greedB' ? 1 : -1, bone: 0, shoulder: hand.parent && hand.parent.parent ? hand.parent.parent : hand.parent });
    }
  }
  const npcs = [];
  async function loadNpcs() {
    for (let i = 0; i < 2; i++) { const n = await loadActor({ id: 'npc', file: 'npc-adulto-silhueta.glb', h: 1.78, rim: 0x8c96a8, rimK: .55, rimDir: [i ? -1 : 1, .4] }, true); if (!n) return; n.holder.visible = false; n.fall = n.clips.falling_down ? n.mixer.clipAction(n.clips.falling_down) : null; if (n.fall) { n.fall.setLoop(T.LoopOnce); n.fall.clampWhenFinished = true; } npcs.push(n); }
    // cabeça separada da vinheta B: um clone do 2º passante em que só o osso da cabeça mantém escala (o resto colapsa no pescoço)
    const src = npcs[1]; if (src) { const hc = cloneSkinned(src.model); hc.traverse(o => { if (o.isMesh) o.material = src.mat; if (o.isBone && o.name !== 'Head' && !/^Head/i.test(o.name) && !o.name.includes('headfront')) o.scale.setScalar(1e-3); });
      const hb = new T.Group(); hb.add(hc); hb.visible = false; scene.add(hb); src.headPiece = { group: hb, model: hc }; }
  }

  /** Arma em marcha: foices em pé ao lado do corpo (haste segue o balanço do braço), lâminas/machado pendendo à frente.
      No golpe da vinheta a foice volta a seguir o osso com a empunhadura do jogo (mistura de .15 s). */
  const _fw = new T.Vector3(), _out = new T.Vector3(), _dir = new T.Vector3(), _x = new T.Vector3(), _z = new T.Vector3(), _sh = new T.Vector3(), _hq = new T.Quaternion(), _cq = new T.Quaternion();
  function poseWeapon(a, w, dt) {
    w.hand.updateWorldMatrix(true, false); w.hand.getWorldPosition(w.root.position);
    const yaw = a.holder.rotation.y; _fw.set(Math.sin(yaw), 0, Math.cos(yaw)); _out.set(Math.cos(yaw) * w.side, 0, -Math.sin(yaw) * w.side);
    if (w.shoulder) { w.shoulder.getWorldPosition(_sh); _sh.subVectors(w.root.position, _sh).setY(0); } else _sh.set(0, 0, 0);
    if (w.kind === 'staff') _dir.set(0, 1, 0).addScaledVector(_out, .16).addScaledVector(_sh, .55).normalize();
    else _dir.set(0, -1, 0).addScaledVector(_fw, .38).addScaledVector(_out, .22).addScaledVector(_sh, .4).normalize();
    if (w.kind === 'staff') _x.copy(_out).multiplyScalar(-1).addScaledVector(_fw, .25); else _x.copy(_fw); _x.addScaledVector(_dir, -_x.dot(_dir)).normalize(); _z.crossVectors(_x, _dir);
    _cq.setFromRotationMatrix(_m.makeBasis(_x, _dir, _z));
    const want = a.striking && w.key === a.strikeWeapon ? 1 : 0; w.bone += (want - w.bone) * Math.min(1, dt * 7);
    if (w.bone > .001) { w.hand.getWorldQuaternion(_hq).multiply(w.grip); _cq.slerp(_hq, w.bone); }
    w.root.quaternion.copy(_cq);
    if (w.kind === 'hang') w.root.position.addScaledVector(_dir, -.04 * a.H);
  }

  /* ---------- protagonista em miniatura na faixa da barra (segundo passe do MESMO renderer, recortado) ---------- */
  const lane = document.getElementById('loading-runner-lane'), prog = document.getElementById('loading-progress');
  const runScene = new T.Scene(), runCam = new T.OrthographicCamera(0, 1, 1, 0, -10, 10); let runner = null, laneRect = null, runP = 0;
  runScene.add(new T.HemisphereLight(0xffe6c8, 0x201010, 1.6)); const runKey = new T.DirectionalLight(0xffc890, 1.4); runKey.position.set(-1, 2, 3); runScene.add(runKey);
  async function loadRunner() {
    const g = await loader.loadAsync(url('assets/loading/protagonista-mini.glb')); if (state.disposed) return;
    const m = g.scene, mat = keep(silhouetteMaterial(0xffd08a, [0, 1], 1.1)); mat.color.setHex(0x2a2018);
    m.traverse(o => { if (o.isMesh) { o.material = mat; o.frustumCulled = false; trash.add(o.geometry); } });
    const bones = {}; m.traverse(o => { if (o.isBone) bones[o.name] = o; }); const hips = bones.Hips || bones.mixamorigHips, clip = g.animations[0];
    if (clip && hips) treadmill(clip, m, hips); const mixer = new T.AnimationMixer(m); if (clip) mixer.clipAction(clip).play(); mixer.setTime(0); m.updateMatrixWorld(true);
    const box = new T.Box3().setFromObject(m), H = box.max.y - box.min.y, k = .86 / Math.max(.01, H); m.scale.multiplyScalar(k); m.position.y = -box.min.y * k + .06;
    const holder = new T.Group(); holder.add(m); holder.rotation.y = Math.PI / 2; runScene.add(holder); runner = { holder, mixer };
  }
  function laneLayout() { if (!lane) return; const r = lane.getBoundingClientRect(), hr = host.getBoundingClientRect(); laneRect = { x: r.left - hr.left, y: hr.bottom - r.bottom, w: r.width, h: r.height, H: hr.height }; }
  function drawRunner(dt) {
    if (!runner || !laneRect || laneRect.w < 10) return;
    const target = loading && loading.dataset.state === 'ready' ? 100 : +(prog && prog.getAttribute('aria-valuenow')) || 0; // só o progresso real
    runP = Math.min(target, runP + Math.max(0, target - runP) * Math.min(1, dt * 2.5) + (target > runP ? dt * 4 : 0));
    const asp = laneRect.w / laneRect.h; runCam.left = 0; runCam.right = asp; runCam.top = 1; runCam.bottom = 0; runCam.updateProjectionMatrix();
    runner.holder.position.x = .3 + (asp - .6) * runP / 100; runner.mixer.update(dt);
    const pr = renderer.getPixelRatio(); renderer.autoClear = false; renderer.clearDepth(); renderer.setScissorTest(true);
    renderer.setViewport(laneRect.x, laneRect.y, laneRect.w, laneRect.h); renderer.setScissor(laneRect.x, laneRect.y, laneRect.w, laneRect.h);
    renderer.render(runScene, runCam); renderer.setScissorTest(false); renderer.setViewport(0, 0, renderer.domElement.width / pr, renderer.domElement.height / pr); renderer.autoClear = true;
  }

  /* ---------- enquadramento ---------- */
  const camBase = new T.Vector3(), camLook = new T.Vector3(); let camAlt = 0;
  function layout() {
    const w = host.clientWidth || innerWidth, h = host.clientHeight || innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h;
    state.portrait = w / h < .9; camera.fov = state.portrait ? 50 : 38;
    const spread = state.portrait ? .5 : 1, halfW = 3.1 * spread + .45; state.setSpread = state.portrait ? .62 : 1; const hfov2 = 2 * Math.atan(Math.tan(camera.fov * Math.PI / 360) * camera.aspect);
    const dist = clamp(halfW / Math.tan(hfov2 / 2), 6.2, 14.5); camBase.set(0, state.portrait ? .8 : .9, dist); camLook.set(0, state.portrait ? 3.1 : 1.62, -2);
    for (const a of actors) { a.holder.position.x = a.def.x * spread; a.home = a.holder.position.x; }
    camera.updateProjectionMatrix(); laneLayout();
  }

  /* ---------- vinhetas ---------- */
  function vignetteUpdate(tc, dt) {
    for (const V of VIGNETTES) {
      const a = actors.find(x => x.def.id === V.who), n = npcs[V.id === 'perfuracao' ? 0 : 1]; if (!a || !n) continue;
      const dur = V.to - V.from, lead = 2.6, t0 = V.at - lead, local = tc - t0;
      if (local < 0 || local > lead + dur + 4.5) { if (n.vig === V.id) { n.holder.visible = false; n.vig = null; if (n.headPiece) n.headPiece.group.visible = false; a.striking = false; } continue; }
      if (n.vig !== V.id) { // início: passante entra pelo lado, já andando
        n.vig = V.id; n.holder.visible = true; n.state = 'walk'; n.mixer.stopAllAction(); n.walk.reset().play(); n.walk.timeScale = 1.05; n.model.traverse(o => { if (o.isBone && o.name === 'Head') o.scale.setScalar(1); });
        n.cross = { side: V.npcSide, x0: a.home + V.npcSide * 3.4, z: a.holder.position.z + (V.who === 'ganancia' ? 1.35 : 1.05) };
        a.striking = false; a.strikeDone = false;
      }
      // passante: atravessa na frente do alvo; o chão o leva junto (z decresce com a esteira até o contato)
      const cr = n.cross, speed = 1.3;
      if (n.state === 'walk') { const k = clamp(local / lead, 0, 1); n.holder.position.set(lerp(cr.x0, a.home + cr.side * .25, k), 0, cr.z); n.holder.rotation.y = -cr.side * Math.PI / 2; }
      // golpe: o antagonista sai da esteira (carregado pelo chão) e volta à formação ao terminar
      if (local >= lead && !a.striking && !a.strikeDone) { a.striking = true; a.strikeT = 0; a.strikeClip = a.mixer.clipAction(a.clips[V.clip]); a.strikeClip.reset(); a.strikeClip.setLoop(T.LoopOnce); a.strikeClip.clampWhenFinished = true; a.strikeClip.time = V.from; a.strikeClip.play(); a.strikeClip.crossFadeFrom(a.walk, .18, false); a.holder.rotation.y = cr.side * .35; a.strikeWeapon = V.weapon || null; a.lunge = { x: n.holder.position.x, z: n.holder.position.z }; }
      if (a.striking) { a.strikeT += dt; const ct = V.from + a.strikeT;
        if (V.weapon) { const w = a.weapons.find(x => x.key === V.weapon); if (w && ct > V.contact - .3 && ct < V.contact + .2) { if (arcLife < 0) { arcPts.length = 0; arcLife = 0; } arcRecord(w); arcDraw(); arcU.uK.value = clamp((ct - (V.contact - .3)) / .5, 0, 1) * .9; } }
        if (n.state === 'walk' && ct >= V.contact) { n.state = 'down'; n.downT = 0; n.walk.fadeOut(.12); if (n.fall) { n.fall.reset().play(); n.fall.time = .25; }
          const neck = n.bones.Head.getWorldPosition(new T.Vector3()); if (V.id === 'perfuracao') { const belly = n.bones.Hips.getWorldPosition(new T.Vector3()); belly.y += .22; bleed(belly, 0, -.4, 6, .9); hitFlash(belly, 1.6); }
          else { bleed(neck, cr.side * .6, -.3, 9, 1.1); hitFlash(neck, 2.4); n.bones.Head.scale.setScalar(1e-3); if (n.headPiece) { n.headPiece.group.visible = true; n.headPiece.t = 0; n.headPiece.from = neck.clone(); } state.cut = .9; state.flash = Math.max(state.flash, .9); }
          boom(a.holder.position.x * 1.6 + cr.side * 1.5, 3.2, a.holder.position.z - 16, 2.6); state.flash = Math.max(state.flash, .8);
          state.log.push('vinheta ' + V.id + ' contato ' + ct.toFixed(2)); }
        if (ct >= V.to) { a.striking = false; a.strikeDone = true; a.lunge = null; a.mat.userData.rimK.value = a.def.rimK || .6; a.walk.reset().play(); a.walk.crossFadeFrom(a.strikeClip, .3, false); a.catchUp = true; }
      }
      const glow = n.state === 'walk' ? smooth(local / 1.2) : Math.max(0, 1 - (n.downT || 0) / 2.5); n.mat.userData.rimK.value = .3 + .45 * glow; a.mat.userData.rimK.value = (a.def.rimK || .6) * (1 + .9 * glow * (a.striking ? 1 : .4));
      if (n.state === 'down') { n.downT += dt; n.holder.position.z -= state.V * dt; if (n.fall && n.fall.time > n.fall.getClip().duration * .82) n.fall.paused = true; }
      if (n.headPiece && n.headPiece.group.visible) { const hp = n.headPiece; hp.t += dt; hp.from.z -= state.V * dt; const k = clamp(hp.t / .9, 0, 1);
        const target = _v.set(hp.from.x + cr.side * 1.1 * k, Math.max(.12, hp.from.y * (1 - k * k) + .12 * k), hp.from.z - .4 * k);
        hp.model.position.set(0, 0, 0); hp.model.scale.copy(n.model.scale); hp.group.position.copy(n.holder.position); hp.group.rotation.copy(n.holder.rotation); hp.group.updateMatrixWorld(true);
        const hb = hp.model.getObjectByName('Head'); if (hb) { const cur = hb.getWorldPosition(_v2); hp.group.position.add(_s.subVectors(target, cur)); hp.group.rotation.x = -k * 2.4 * cr.side; } }
      n.mixer.update(dt);
    }
  }

  /* ---------- quadro ---------- */
  let raf = 0, last = 0, accum = 0; const step = reduced ? .5 : coarse ? 1 / 30 : 0;
  function frame(now) {
    raf = requestAnimationFrame(frame); if (document.hidden) { last = now; return; }
    let dt = last ? (now - last) / 1000 : 1 / 60; last = now; if (step) { accum += dt; if (accum < step * .92) return; dt = accum; accum = 0; }
    const rdt = Math.min(dt, .1); dt = reduced ? 0 : rdt; update(dt); renderer.render(scene, camera); drawRunner(reduced ? 0 : rdt); state.frames++;
  }
  function update(dt) {
    if (!state.paused) state.t += dt; state.real += dt; const tc = state.t % CYCLE;
    state.scroll += state.V * dt * (state.paused ? 0 : 1);
    const act = Math.floor(tc / 12) % 3, inAct = tc % 12, trans = smooth(1 - Math.abs(inAct - 0) / 1.4) + smooth(1 - Math.abs(inAct - 12) / 1.4);
    if (act !== state.act) { state.act = act; buildAct(act); buildAct((act + 1) % 3); boom(0, 4, -26, 3.4); state.flash = 1; }
    const A = ACTS[act], B = ACTS[(act + 1) % 3], kb = smooth((inAct - 10.6) / 1.4);
    skyU.uSky.value.set(lerp(A.sky[0], B.sky[0], kb), lerp(A.sky[1], B.sky[1], kb), lerp(A.sky[2], B.sky[2], kb)); skyU.uGlow.value.set(lerp(A.glow[0], B.glow[0], kb), lerp(A.glow[1], B.glow[1], kb), lerp(A.glow[2], B.glow[2], kb));
    scene.fog.color.setHex(A.fog).lerp(new T.Color(B.fog), kb); scene.fog.density = .02 + .05 * trans; // parede de fumaça esconde a troca de ato
    state.flash = Math.max(0, state.flash - dt * 1.6); skyU.uFlash.value = state.flash; skyU.uT.value = state.real; groundU.uT.value = state.real; groundU.uScroll.value = state.scroll;
    back.intensity = .5 + state.flash * 1.4 + Math.sin(state.real * 7.3) * .05; hemi.intensity = .22 + state.flash * .3;
    for (const u of [emberU, ashU]) { u.uT.value = state.real; u.uScroll.value = state.scroll; u.uPix.value = renderer.getPixelRatio() * (state.portrait ? 1.3 : 1); }
    updateSets(tc, dt);
    for (const a of actors) {
      if (a.walk && !a.striking) a.walk.timeScale = clamp(state.V / Math.max(.2, a.natural), .7, 1.35) * (a.catchUp ? 1.18 : 1);
      if (a.striking) { a.holder.position.z -= state.V * dt; if (a.lunge) { const k = clamp(a.strikeT / .45, 0, 1); a.holder.position.x = lerp(a.home, a.lunge.x, smooth(k) * .55); a.holder.position.z += (a.lunge.z - .55 - a.holder.position.z) * Math.min(1, dt * 4) * (1 - k * .5); } } // fora da esteira: o chão o leva para trás
      else if (a.catchUp) { a.holder.position.z += (a.def.z - a.holder.position.z) * Math.min(1, dt * .9) + state.V * .18 * dt; a.holder.rotation.y *= 1 - Math.min(1, dt * 3); a.holder.position.x += (a.home - a.holder.position.x) * Math.min(1, dt * 1.5); if (a.holder.position.z >= a.def.z - .02) { a.holder.position.z = a.def.z; a.catchUp = false; } }
      else { a.holder.position.z = a.def.z; a.holder.rotation.y *= 1 - Math.min(1, dt * 3); }
      a.mixer.update(dt);
      const tt = state.real; for (const e of a.eyes) if (e.material && e.material.uniforms) e.material.uniforms.uT.value = tt;
      if (a.orb) { const s = 1 + .2 * Math.sin(tt * 3.4) + .07 * Math.sin(tt * 11.3); a.orb.userData.spikes.scale.setScalar(s); a.orb.userData.shell.scale.setScalar(1.15 - .18 * Math.sin(tt * 3.4)); a.orb.userData.shell.rotation.y = -tt * 2.1; a.orb.rotation.z = tt * 1.1; a.orb.rotation.y = Math.sin(tt * .7) * .5; }
      if (a.grin) a.grin.material.uniforms.uT.value = tt;
      for (const w of a.weapons) poseWeapon(a, w, dt);
      if (a.grin && a.face) { const F = a.face; for (let i = 0; i < 3; i++) { if (F.streaks[i] < -1) continue; const ph = (state.real / F.per + hash(i * 3 + a.def.x * 3.1 + 1)) % 1;
          if (ph < a.dripT[i]) { const sx = F.streaks[i] * F.w; _v.set(sx * .5, -.3, .01); a.grin.localToWorld(_v); bleed(_v, 0, .12, 1, .03); } a.dripT[i] = ph; } }
    }
    vignetteUpdate(tc, dt);
    // corte de câmera da vinheta B: plano lateral baixo por ~1 s, depois volta
    state.cut = Math.max(0, (state.cut || 0) - dt);
    const sway = Math.sin(state.real * .21) * .22, bob = Math.sin(state.real * .37) * .06, push = Math.sin(tc / CYCLE * Math.PI * 2) * .5;
    if (state.qaCam) { camera.position.set(...state.qaCam[0]); camera.lookAt(...state.qaCam[1]); }
    else if (state.qa) { const a = actors.find(x => x.def.id === state.qa) || npcs.find(x => x.holder.visible); if (a && a.head) { a.head.getWorldPosition(_v); const fy = a.holder.rotation.y; camera.position.set(_v.x + Math.sin(fy) * a.H * .45, _v.y + .02, _v.z + Math.cos(fy) * a.H * .45); camera.lookAt(_v.x, _v.y - .03 * a.H, _v.z); } }
    else if (state.cut > 0) { const g = actors.find(a => a.def.id === 'ganancia'), gz = g ? g.holder.position.z : 0; camera.position.set(-.5, .62, gz + (state.portrait ? 5.2 : 3.5)); camera.lookAt(-.35, 1.28, gz + 1.0); }
    else {
      // vinheta: a MESMA câmera aproxima e enquadra o agressor (sem corte), depois volta à formação
      let fk = 0, fx = 0, fz = 0; for (const V of VIGNETTES) { const a = actors.find(x => x.def.id === V.who); if (!a) continue; const l = tc - (V.at - 2.2), d = 2.2 + (V.to - V.from) + 1.6;
        const k = l < 0 || l > d ? 0 : smooth(l / 1.1) * (1 - smooth((l - d + 1.2) / 1.2)); if (k > fk) { fk = k; fx = a.home + (V.npcSide || 0) * .5; fz = a.def.z + .6; } }
      fk *= state.portrait ? .55 : .7;
      camera.position.set(lerp(camBase.x + sway, fx * .55, fk), lerp(camBase.y + bob, 1.05, fk), lerp(camBase.z + push, fz + camBase.z * .5, fk));
      camera.lookAt(lerp(camLook.x + sway * .35, fx, fk), lerp(camLook.y, 1.25, fk), lerp(camLook.z, fz - 1, fk)); }
    if (arcLife >= 0) { arcLife += dt; if (arcLife > .55) { const k = (arcLife - .55) / .4; arcU.uK.value = .9 + k * .1; if (k >= 1) { arcLife = -1; arc.visible = false; arcPts.length = 0; } } for (const p of arcPts) { p[0].z -= 0; } }
    if (hitT >= 0) { hitT += dt; hit.material.uniforms.uA.value = Math.max(0, 1.8 * (1 - hitT / .45)); hit.position.z -= state.V * dt; if (hitT > .45) { hitT = -1; hit.material.uniforms.uA.value = 0; } }
    // explosões
    for (const e of explosions) { if (e.t < 0) continue; e.t += dt; const k = e.t / 2.6; const z = e.z - state.V * e.t; e.g.position.set(e.x, e.y, z);
      const ant = smooth(e.t / .25); e.fb.scale.setScalar(e.size * (.6 + 3.2 * smooth(k * 1.6)) * ant); e.fb.material.uniforms.uK.value = k; e.fb.material.uniforms.uT.value = state.real;
      e.fl.scale.setScalar(e.size * 7); e.fl.material.uniforms.uA.value = e.t < .25 ? smooth(e.t / .25) * 1.6 : Math.max(0, 1.6 - (e.t - .25) * 4);
      e.sm.scale.setScalar(e.size * (2 + 4 * smooth(k))); e.sm.position.y = e.size * 1.5 * k; e.sm.material.uniforms.uA.value = smooth(k * 3) * (1 - smooth((k - .5) * 2)) * .9; e.sm.material.uniforms.uT.value = state.real;
      if (k >= 1) { e.t = -1; e.g.visible = false; } }
    for (let i = 0; i < SH; i++) { const s = shardS[i]; if (s.on) { s.v.y -= 15 * dt; s.p.addScaledVector(s.v, dt); s.p.z -= state.V * dt; s.r.x += s.w.x * dt; s.r.y += s.w.y * dt; if (s.p.y < 0) { s.p.y = 0; s.v.multiplyScalar(.3); s.v.y = Math.abs(s.v.y) * .2; s.w.multiplyScalar(.4); }
        if (s.p.z < -70) s.on = false; } _m.compose(s.on ? s.p : _v.set(0, -99, 0), _q.setFromEuler(s.r), _s.setScalar(s.on ? s.s : 0)); shards.setMatrixAt(i, _m); }
    shards.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < DR; i++) { const d = dropS[i];
      if (d.on) { d.v.y -= 9.8 * dt; d.p.addScaledVector(d.v, dt); d.p.z -= 0; if (d.p.y <= .01) { d.on = false; d.splat = 0; d.sp.set(d.p.x, .006, d.p.z); d.ss = .5 + Math.random() * .9; } }
      if (d.splat >= 0) { d.splat += dt; d.sp.z -= state.V * dt; if (d.splat > 3.5) d.splat = -1; }
      _m.compose(d.on ? d.p : _v.set(0, -99, 0), _q.identity(), _s.setScalar(d.on ? 1 : 0)); drops.setMatrixAt(i, _m);
      const sk = d.splat >= 0 ? d.ss * (.4 + .6 * smooth(d.splat / .12)) * (1 - smooth((d.splat - 2.5))) : 0; _m.compose(d.splat >= 0 ? d.sp : _v.set(0, -99, 0), _q.identity(), _s.set(sk, 1, sk * .8)); splats.setMatrixAt(i, _m); }
    drops.instanceMatrix.needsUpdate = true; splats.instanceMatrix.needsUpdate = true;
  }

  /* ---------- ciclo de vida ---------- */
  const ro = new ResizeObserver(() => layout()); ro.observe(host); if (lane && lane.parentElement) ro.observe(lane.parentElement); // a faixa sobe quando o convite aparece
  const loading = document.getElementById('loading');
  // sai só quando o jogador entrou (.lc-entered) ou quando outro fluxo removeu a tela; .hidden sozinho = READY (a cena continua)
  const mo = new MutationObserver(() => { if (!loading || loading.classList.contains('lc-entered') || loading.hidden || loading.style.display === 'none') leave(); });
  if (loading) mo.observe(loading, { attributes: true, attributeFilter: ['class', 'hidden', 'style'] });
  function leave() { if (state.leaving) return; state.leaving = true; setTimeout(dispose, 900); }
  function dispose() {
    if (state.disposed) return; state.disposed = true; cancelAnimationFrame(raf); ro.disconnect(); mo.disconnect();
    for (const a of [...actors, ...npcs]) { a.mixer.stopAllAction(); a.mixer.uncacheRoot(a.model); }
    if (runner) { runner.mixer.stopAllAction(); runScene.traverse(o => { if (o.geometry) trash.add(o.geometry); }); }
    scene.traverse(o => { if (o.geometry) trash.add(o.geometry); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => trash.add(m)); });
    for (const d of trash) { try { d.dispose && d.dispose(); } catch (_) {} }
    renderer.dispose(); try { renderer.forceContextLoss(); } catch (_) {} canvas.remove(); state.log.push('descartado');
  }

  const api = { state, scene, camera, renderer, actors, npcs, sets, dispose, leave,
    /** QA: posiciona o relógio do ciclo (s) e atualiza um quadro. */
    seek(t, sub = 12) { const wasPaused = state.paused; state.paused = false; const target = ((t % CYCLE) + CYCLE) % CYCLE; const tc = state.t % CYCLE; let d = target - tc; if (d < 0) d += CYCLE; const n = Math.max(1, Math.ceil(d / (1 / sub))); for (let i = 0; i < n; i++) update(d / n); state.paused = wasPaused; renderer.render(scene, camera); return state.t; },
    pause(v = true) { state.paused = v; }, focus(id = null) { state.qa = id; update(0); renderer.render(scene, camera); }, cam(pos = null, look = null) { state.qaCam = pos ? [pos, look] : null; update(0); renderer.render(scene, camera); }, stats() { return { draws: renderer.info.render.calls, tris: renderer.info.render.triangles, geos: renderer.info.memory.geometries, tex: renderer.info.memory.textures, t: state.t, fps: state.fps, actors: actors.length, npcs: npcs.length, sets: sets.map(s => s.built), log: state.log.slice(-20) }; } };
  window.__loadingCine = api;

  (async () => {
    layout(); raf = requestAnimationFrame(frame);
    buildAct(0);
    const loaded = await Promise.all(CAST.map(d => loadActor(d).catch(e => { state.log.push(d.id + ' falhou: ' + e.message); return null; })));
    if (state.disposed) return; for (const a of loaded) if (a) actors.push(a);
    layout(); host.classList.add('lc-ready'); state.ready = performance.now(); state.log.push('elenco pronto ' + actors.length);
    for (const a of actors) arm(a);
    loadNpcs().catch(e => state.log.push('npc falhou: ' + e.message));
    loadRunner().catch(e => state.log.push('miniatura falhou: ' + e.message));
    // fps medido (relógio real), para QA e para baixar a resolução se o aparelho não acompanhar
    let f0 = state.frames, t0 = performance.now(); const fpsTimer = setInterval(() => { if (state.disposed) return clearInterval(fpsTimer); const now = performance.now(); state.fps = Math.round((state.frames - f0) * 1000 / (now - t0)); f0 = state.frames; t0 = now;
      if (state.fps && state.fps < (coarse ? 22 : 34) && dpr > .75) { dpr = Math.max(.75, dpr * .8); renderer.setPixelRatio(dpr); layout(); } }, 2000);
  })();
  return api;
}
