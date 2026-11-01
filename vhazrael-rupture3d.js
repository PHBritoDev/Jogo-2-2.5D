import { smooth, easeOut, hash, groundNormal } from './celestial-fxkit3d.js';
import { thronePose } from './vhazrael-choreo3d.js';
/**
 * MOD 249 — RUPTURA DO TRONO ABISSAL refeita do zero (só desenha o estado de vhazrael3d.js; nenhum dano aqui).
 * Linguagem visual de anime de alta energia com assets 100% originais e procedurais: cores em FAIXAS DURAS (cel/toon),
 * branco-quente no núcleo, vermelho/carmim, casca preta/violeta OPACA (preto não some como em blending aditivo).
 *
 *  A · Erguer (0–1 s): vento convergente de filamentos negros/violeta, brasas douradas subindo, veios negro/carmim
 *      enrolando a lâmina a partir da guarda, detritos levantando do chão e a luz da arena caindo.
 *  B · Carga (1–2,3 s): pilar de ~58 m saindo da ponta da espada em TRÊS camadas deformadas por ruído advectado (núcleo
 *      branco aditivo, chama carmim/magenta em faixas, casca negra/violeta rasgada com buracos), espirais helicoidais,
 *      línguas de chama negra/vermelha na base, anel de ignição, pedras subindo e a trilha de aviso no chão.
 *  C · Corte (2,43–2,62 s): o pilar acompanha a lâmina (mesma curva da pose) e desaba para a frente; leque de rastro
 *      gigante, flare em cruz vermelho no instante do corte (o jogo faz o impact frame curtíssimo, com opção de reduzir).
 *  D · Feixe: tubo elíptico que alarga para a frente (núcleo branco + bainha vermelho/negra rasgada que escoa), parede de
 *      massa carmim na frente, línguas de chama abrindo em V, gavinhas negras nos flancos; o chão RACHA progressivamente
 *      atrás da frente (fissura de magma, placas angulares que se erguem, detritos balísticos lançados pela frente).
 *  E · Colisão em fases: implosão → clarão → choque vermelho/negro com anéis supersônicos → domo roxo/magenta com rasgos
 *      negros e coluna → explosão SECUNDÁRIA amarelo-branco/laranja com fogo em camadas, fumaça e blocos de rocha →
 *      dissipação por erosão/fragmentação. Cratera e fissura esfriam devagar.
 * Por dentro (câmera no meio do efeito) as superfícies opacas se recortam perto da lente, então a tela nunca fica toda
 * branca/vermelha e o jogador continua lendo o combate.
 */
/* recorte "raio-X": some o que estiver entre a câmera e o herói (cone com borda irregular) + perto da lente */
const CUT = `uniform vec4 hole; bool cutAway(vec3 V, float near){ if(length(V)<near) return true; if(hole.w<=0.) return false; vec3 P=-V, H=hole.xyz-cameraPosition; float hh=dot(H,H), t=dot(P,H)/hh; if(t<=.05||t>=.97) return false; vec3 d=P-H*t; return length(d)<hole.w*t*(.85+.3*fract(sin(dot(floor(P*3.),vec3(12.9,78.2,37.7)))*4375.5)); }`;
const NOISE = `float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){return n2(p)*.5+n2(p*2.03+1.7)*.3+n2(p*4.1+3.1)*.2;}
float h3(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float n3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}`;
/* pilar/coluna: cilindro unitário deformado no vertex (perfil + ruído que sobe), layer 0 núcleo, 1 chama, 2 casca */
const PIL_V = `${NOISE} uniform float time, k, len, rad, layer, wob, flare; varying vec2 vA; varying vec3 vN; varying vec3 vV; varying float vY;
void main(){ float y=position.y; vec2 q=position.xz; float ang=atan(q.y,q.x); vY=y;
 float prof=(.12+.88*smoothstep(0.,.14,y))*(1.+flare*y)*(1.-.85*smoothstep(.82,1.,y));
 float n=fbm(vec2(ang*1.6+layer*2.3, y*len*.07-time*(4.5+layer*1.5)));
 float r=rad*prof*(1.+wob*(n-.45)*1.4); vA=vec2(ang,y*len);
 vec4 w=modelMatrix*vec4(q.x*r,y*len,q.y*r,1.); vN=normalize(mat3(modelMatrix)*vec3(q.x,0.,q.y)); vV=cameraPosition-w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
const PIL_F = `${NOISE}${CUT} uniform float time, k, layer, erode, near; varying vec2 vA; varying vec3 vN; varying vec3 vV; varying float vY;
void main(){ if(cutAway(vV,near)) discard; float f=abs(dot(normalize(vN),normalize(vV)));
 float n=fbm(vec2(vA.x*5.5+layer*5.,vA.y*.025-time*(3.+layer))), top=k-.07*n2(vec2(vA.x*3.,time*3.));
 if(vY>top) discard; if(n<erode) discard;
 if(layer<.5){ float a=pow(f,1.6)*(.75+.5*n); vec3 c=mix(vec3(1.,.45,.75),vec3(1.,.97,1.),smoothstep(.45,.85,f)); gl_FragColor=vec4(c*a*1.6,a); return; }
 vec3 c;
 if(layer<1.5){ float v=f*1.05+(n-.5)*.75; if(v<.2) discard;
  c=v>.9?vec3(1.,.93,.97):v>.68?vec3(1.,.1,.38):v>.45?vec3(.85,0.,.09):v>.3?vec3(.36,0.,.06):vec3(.05,0.,.04); }
 else { float hole=fbm(vec2(vA.x*2.6+time*.5,vA.y*.05-time*3.2)); if(hole<.5||f>.42+.35*hole) discard; float rim=pow(1.-f,2.5);
  c=mix(vec3(.012,0.,.02),vec3(.42,.06,.75),rim*.9); c=mix(c,vec3(.9,.05,.3),smoothstep(.5,.47,hole-.03)*.9); }
 gl_FragColor=vec4(c,1.); }`;
/* feixe: o mesmo cilindro unitário com seção elíptica (largura w, altura h) que alarga para a frente; local Y = direção */
const BEAM_V = `${NOISE} uniform float time, len, w0, w1, h0, h1, layer; varying vec2 vA; varying vec3 vN; varying vec3 vV; varying float vY; varying vec2 vQ;
void main(){ float y=position.y; vec2 q=position.xz; float ang=atan(q.y,q.x); vY=y;
 float g=smoothstep(0.,.45,y), cap=sqrt(max(0.,1.-smoothstep(.84,1.,y)))*.85+.15, n=fbm(vec2(ang*2.+layer*3.,y*len*.12-time*13.));
 float W=mix(w0,w1,g)*cap*(1.+.45*(n-.45)), H=mix(h0,h1,g)*cap*(1.+.6*(n-.45))*(1.+.25*sin(y*len*.35-time*20.));
 vec3 p=vec3(q.x*W, y*len, q.y*H+H*.28); vA=vec2(ang,y*len); vQ=q;
 vec4 w=modelMatrix*vec4(p,1.); vN=normalize(mat3(modelMatrix)*vec3(q.x/W,0.,q.y/H)); vV=cameraPosition-w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
const BEAM_F = `${NOISE}${CUT} uniform float time, layer, erode, near; varying vec2 vA; varying vec3 vN; varying vec3 vV; varying float vY; varying vec2 vQ;
void main(){ if(cutAway(vV,near)) discard; float f=abs(dot(normalize(vN),normalize(vV)));
 float n=fbm(vec2(vA.x*2.2+layer*4.,vA.y*.16-time*15.)); if(n<erode) discard;
 if(layer<.5){ float a=pow(f,1.3)*(.8+.4*n); gl_FragColor=vec4(mix(vec3(1.,.5,.8),vec3(1.,.98,1.),f)*a*1.7,a); return; }
 float v=(1.-abs(vQ.y))*.9+f*.32+(n-.5)*.75-smoothstep(.85,1.,vY)*.25; if(v<.22) discard;
 vec3 c=v>.97?vec3(1.,.95,.98):v>.66?vec3(1.,.08,.2):v>.42?vec3(.66,0.,.07):v>.3?vec3(.2,0.,.06):vec3(.03,0.,.05);
 gl_FragColor=vec4(c,1.); }`;
/* massas instanciadas (fogo/energia em faixas, contorno escuro de anime): aP = (calor, paleta, dissolução, semente) */
const PUFF_V = `${NOISE} attribute vec4 aP; uniform float time; varying vec4 vP; varying vec3 vN; varying vec3 vV; varying vec3 vO;
void main(){ vP=aP; vO=position; float d=1.+.26*(n3(position*2.3+aP.w*7.+vec3(0.,time*.9,0.))-.5)+.12*(n3(position*5.1-aP.w*3.)-.5);
 vec4 w=modelMatrix*instanceMatrix*vec4(position*d,1.); vN=normalize(mat3(modelMatrix)*mat3(instanceMatrix)*position); vV=cameraPosition-w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
const PUFF_F = `${NOISE}${CUT} uniform float time, near; varying vec4 vP; varying vec3 vN; varying vec3 vV; varying vec3 vO;
void main(){ if(cutAway(vV,near)) discard; float f=abs(dot(normalize(vN),normalize(vV))); float n=n3(vO*1.4+vP.w*11.+vec3(0.,-time*1.2,0.));
 if(n3(vO*2.2+vP.w*5.)<vP.z) discard; float v=vP.x*(.22+.95*f)+(n-.5)*.24; vec3 c;
 if(vP.y<.5) c=v>.82?vec3(1.,.98,.86):v>.64?vec3(1.,.84,.24):v>.47?vec3(1.,.48,.07):v>.31?vec3(.78,.14,.03):v>.18?vec3(.24,.05,.03):vec3(.16,.12,.17);
 else c=v>.9?vec3(1.,.93,.95):v>.7?vec3(1.,.16,.3):v>.5?vec3(.82,0.,.07):v>.33?vec3(.32,0.,.05):vec3(.025,0.,.03);
 c*=mix(.3,1.,smoothstep(.1,.28,f)); gl_FragColor=vec4(c,1.); }`;
/* línguas de chama: lâmina plana recortada, núcleo branco → vermelho → carmim escuro na borda */
const TONG_V = `attribute vec4 aP; varying vec4 vP; varying vec2 vU; varying vec3 vV; void main(){ vP=aP; vU=uv; vec4 w=modelMatrix*instanceMatrix*vec4(position,1.); vV=cameraPosition-w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
const TONG_F = `${NOISE}${CUT} uniform float time, near; varying vec4 vP; varying vec2 vU; varying vec3 vV;
void main(){ if(cutAway(vV,near)) discard; float n=n2(vec2(vU.y*7.-time*9.+vP.w*13.,vU.x*2.)); float d=abs(vU.x)+(n-.5)*.42+vU.y*.18; if(d>.98||n2(vU*6.+vP.w*3.)<vP.z) discard;
 vec3 c=vP.y<.5?(d<.22*vP.x?vec3(1.,.95,.98):d<.55?vec3(1.,.08,.24):d<.8?vec3(.55,0.,.07):vec3(.05,0.,.05)):vP.y<1.5?(d<.4?vec3(.5,.06,.85):vec3(.015,0.,.02)):(d<.2*vP.x?vec3(1.,.98,.86):d<.45?vec3(1.,.78,.2):d<.7?vec3(1.,.36,.05):d<.86?vec3(.45,.05,.02):vec3(.03,0.,.02));
 gl_FragColor=vec4(c,1.); }`;
/* domo de energia: roxo profundo → magenta em faixas, borda clara, RASGOS negros verticais que escorrem; erode por ruído */
const DOME_V = `varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vP=position; vec4 w=modelMatrix*vec4(position,1.); vN=normalize(mat3(modelMatrix)*normal); vV=cameraPosition-w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
const DOME_F = `${NOISE}${CUT} uniform float time, erode, near, heat; varying vec3 vN; varying vec3 vV; varying vec3 vP;
void main(){ if(cutAway(vV,near)) discard; float lat=clamp(vP.y,0.,1.), ang=atan(vP.z,vP.x); float er=fbm(vec2(ang*3.,lat*5.-time*.6)); if(er<erode) discard;
 float f=abs(dot(normalize(vN),normalize(vV))), sw=fbm(vec2(ang*2.2+lat*3.+time*.9,lat*4.-time*1.5));
 float rip=smoothstep(.62,.66,n2(vec2(ang*9.+sin(lat*6.)*.6,lat*1.4-time*.8)))*smoothstep(.1,.35,lat);
 float v=(1.-f)*.9+sw*.45+heat*.2; vec3 c=v>1.05?vec3(1.,.82,.98):v>.82?vec3(.95,.12,.62):v>.58?vec3(.6,.03,.55):vec3(.2,.01,.33);
 c=mix(c,vec3(.015,0.,.025),rip); c=mix(c,vec3(1.,.3,.8),smoothstep(erode+.06,erode,er)*step(.01,erode)); gl_FragColor=vec4(c,1.); }`;
/* fitas de tinta (blending normal: preto e violeta escuros APARECEM) */
const INK_V = `attribute vec4 aColor; attribute vec2 aUv2; varying vec4 vC; varying vec2 vU; varying vec3 vV; void main(){ vC=aColor; vU=aUv2; vec4 w=modelMatrix*vec4(position,1.); vV=cameraPosition-w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
const INK_F = `${CUT} uniform float near; varying vec4 vC; varying vec2 vU; varying vec3 vV; void main(){ if(cutAway(vV,near)) discard; float e=abs(vU.y*2.-1.); float a=vC.a*(1.-smoothstep(.55,1.,e)); if(a<.02) discard; gl_FragColor=vec4(vC.rgb,a); }`;
/* leque do rastro do golpe (aditivo): forte na borda externa e no ângulo mais recente */
const FAN_F = `varying vec4 vC; varying vec2 vU; void main(){ float a=vC.a*smoothstep(0.,.35,vU.y)*(.35+.65*vU.y); vec3 c=mix(vec3(1.,.08,.25),vec3(1.,.95,1.),smoothstep(.55,1.,vU.x)*smoothstep(.6,1.,vU.y)); gl_FragColor=vec4(c*a,a); }`;

function tongueGeo(T) { // lâmina de chama: base estreita, barriga, ponta recurvada; bordas serrilhadas; uv.x ∈ [-1,1]
  const pos = [], uv = [], idx = [], N = 9;
  for (let j = 0; j <= N; j++) { const y = j / N, w = .5 * (y < .28 ? y / .28 : (1 - y) / .72) * (j % 2 ? .62 : 1) + .01, bend = y * y * .3;
    pos.push(-w + bend, y, 0, bend, y, 0, w + bend, y, 0); uv.push(-1, y, 0, y, 1, y); if (j < N) { const a = j * 3, b = a + 3; idx.push(a, b, a + 1, a + 1, b, b + 1, a + 1, b + 1, a + 2, a + 2, b + 1, b + 2); } }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); return g;
}
/** Fitas com blending escolhido (tinta = normal, leque = aditivo); buffers fixos, sem alocação por quadro. */
function strips(T, max, frag, additive, hole) {
  const pos = new Float32Array(max * 12), col = new Float32Array(max * 16), uv = new Float32Array(max * 8), idx = new Uint32Array(max * 6);
  for (let i = 0; i < max; i++) idx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 2, i * 4 + 1, i * 4 + 3], i * 6);
  const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3).setUsage(T.DynamicDrawUsage)); geo.setAttribute('aColor', new T.BufferAttribute(col, 4).setUsage(T.DynamicDrawUsage));
  geo.setAttribute('aUv2', new T.BufferAttribute(uv, 2).setUsage(T.DynamicDrawUsage)); geo.setIndex(new T.BufferAttribute(idx, 1));
  const mat = new T.ShaderMaterial({ vertexShader: INK_V, fragmentShader: frag, uniforms: { near: { value: 1.2 }, hole }, transparent: true, depthWrite: false, side: T.DoubleSide, toneMapped: false, fog: false,
    blending: additive ? T.CustomBlending : T.NormalBlending, blendSrc: T.OneFactor, blendDst: T.OneFactor });
  if (!additive) mat.blending = T.NormalBlending;
  const mesh = new T.Mesh(geo, mat); mesh.frustumCulled = false; mesh.renderOrder = additive ? 6 : 3;
  const eye = new T.Vector3(), d = new T.Vector3(), v = new T.Vector3(), s0 = new T.Vector3(), s1 = new T.Vector3(); let q = 0;
  const side = (out, ax, ay, az, bx, by, bz, w) => { d.set(bx - ax, by - ay, bz - az); v.set(ax - eye.x, ay - eye.y, az - eye.z); out.crossVectors(d, v); const l = out.length(); if (l < 1e-6) out.set(w, 0, 0); else out.multiplyScalar(w / l); };
  return { mesh, mat, geo,
    begin(cam) { q = 0; eye.copy(cam); },
    seg(ax, ay, az, bx, by, bz, wa, wb, ca, cb) { if (q >= max) return; side(s0, ax, ay, az, bx, by, bz, wa); side(s1, ax, ay, az, bx, by, bz, wb); const o = q * 12;
      pos.set([ax - s0.x, ay - s0.y, az - s0.z, ax + s0.x, ay + s0.y, az + s0.z, bx - s1.x, by - s1.y, bz - s1.z, bx + s1.x, by + s1.y, bz + s1.z], o); col.set(ca, q * 16); col.set(ca, q * 16 + 4); col.set(cb, q * 16 + 8); col.set(cb, q * 16 + 12); uv.set([0, 0, 0, 1, 1, 0, 1, 1], q * 8); q++; },
    /** quadrilátero livre (4 cantos) com uv por canto (leque do golpe) */
    quad(p0, p1, p2, p3, c0, c1, c2, c3, u0, u1, u2, u3) { if (q >= max) return; const o = q * 12; pos.set([...p0, ...p1, ...p2, ...p3], o); col.set(c0, q * 16); col.set(c1, q * 16 + 4); col.set(c2, q * 16 + 8); col.set(c3, q * 16 + 12); uv.set([...u0, ...u1, ...u2, ...u3], q * 8); q++; },
    end() { geo.setDrawRange(0, q * 6); geo.attributes.position.needsUpdate = geo.attributes.aColor.needsUpdate = geo.attributes.aUv2.needsUpdate = true; },
    dispose() { geo.dispose(); mat.dispose(); } };
}

/**
 * kit: { root, glow, rib, decals, shard, plate, ring, boltRib, dome, ground } — sistemas já existentes do VFX do VHAZRAEL.
 * Devolve { draw(s, blade, boss, ctx), begin(cam, time, low), end(), clear(), dispose(), camHint }.
 */
export function createRuptureVFX(T, kit) {
  const { root, glow, rib, decals, shard, plate, ring, boltRib, ground } = kit; const geos = [], mats = [], uTime = { value: 0 }, uHole = { value: new T.Vector4(0, 0, 0, 0) };
  const up = new T.Vector3(0, 1, 0), A = new T.Vector3(), B = new T.Vector3(), C = new T.Vector3(), D = new T.Vector3(), E = new T.Vector3(), Fv = new T.Vector3(), Q = new T.Quaternion(), M = new T.Matrix4(), S = new T.Vector3(), X = new T.Vector3(), Z = new T.Vector3(), nrm = [0, 1, 0];
  const cam = new T.Vector3(), AX = new T.Vector3(), AZ = new T.Vector3(); let time = 0, low = false;
  /* pilar em 3 camadas (também é a coluna do impacto: nunca estão vivos ao mesmo tempo) */
  const cyl = new T.CylinderGeometry(1, 1, 1, 30, 44, true); cyl.translate(0, .5, 0); geos.push(cyl);
  const pilU = l => ({ time: uTime, k: { value: 1 }, len: { value: 50 }, rad: { value: 1 }, layer: { value: l }, wob: { value: .5 }, flare: { value: .5 }, erode: { value: 0 }, near: { value: 2.6 }, hole: uHole });
  const pillar = [0, 1, 2].map(l => { const m = new T.ShaderMaterial({ vertexShader: PIL_V, fragmentShader: PIL_F, uniforms: pilU(l), side: l ? T.FrontSide : T.DoubleSide, toneMapped: false, fog: false, transparent: l === 0, depthWrite: l !== 0,
    blending: l === 0 ? T.CustomBlending : T.NormalBlending, blendSrc: T.OneFactor, blendDst: T.OneFactor }); if (l) m.blending = T.NormalBlending; mats.push(m); const o = new T.Mesh(cyl, m); o.frustumCulled = false; o.visible = false; o.renderOrder = l === 0 ? 5 : 1; root.add(o); return o; });
  const beamU = l => ({ time: uTime, len: { value: 1 }, w0: { value: 1 }, w1: { value: 3 }, h0: { value: 1 }, h1: { value: 3 }, layer: { value: l }, erode: { value: 0 }, near: { value: 2.6 }, hole: uHole });
  const beam = [0, 1].map(l => { const m = new T.ShaderMaterial({ vertexShader: BEAM_V, fragmentShader: BEAM_F, uniforms: beamU(l), side: l ? T.FrontSide : T.DoubleSide, toneMapped: false, fog: false, transparent: !l, depthWrite: !!l,
    blending: l ? T.NormalBlending : T.CustomBlending, blendSrc: T.OneFactor, blendDst: T.OneFactor }); if (l) m.blending = T.NormalBlending; mats.push(m); const o = new T.Mesh(cyl, m); o.frustumCulled = false; o.visible = false; o.renderOrder = l ? 1 : 5; root.add(o); return o; });
  /* massas de fogo/energia e línguas de chama instanciadas */
  const mkInst = (geo, vs, fs, n) => { const a = new Float32Array(n * 4); geo.setAttribute('aP', new T.InstancedBufferAttribute(a, 4).setUsage(T.DynamicDrawUsage)); const m = new T.ShaderMaterial({ vertexShader: vs, fragmentShader: fs, uniforms: { time: uTime, near: { value: 3 }, hole: uHole }, side: T.DoubleSide, toneMapped: false, fog: false });
    mats.push(m); geos.push(geo); const o = new T.InstancedMesh(geo, m, n); o.frustumCulled = false; o.count = 0; root.add(o); return { o, a, n: 0, max: n }; };
  const puffs = mkInst(new T.IcosahedronGeometry(1, 2), PUFF_V, PUFF_F, 60), tongues = mkInst(tongueGeo(T), TONG_V, TONG_F, 220);
  const putI = (I, p, q, sx, sy, sz, a, b, c, d) => { if (I.n >= I.max) return; S.set(sx, sy, sz); M.compose(p, q, S); I.o.setMatrixAt(I.n, M); I.a.set([a, b, c, d], I.n * 4); I.n++; };
  /** massa: centro, raio, calor 0–1, paleta (0 fogo, 1 carmim), dissolução 0–1, semente */
  const puff = (x, y, z, r, heat, pal, dis, seed) => { if (r <= .02 || dis >= 1) return; A.set(x, y, z); Q.setFromAxisAngle(up, seed * 6.283); putI(puffs, A, Q, r, r * .92, r, heat, pal, dis, seed); };
  /** língua de chama de p na direção dir (comprimento L, largura W), virada para a câmera em torno do próprio eixo */
  const tongue = (px, py, pz, dx, dy, dz, L, W, core, pal, dis, seed) => { if (L <= .05 || dis >= 1) return; D.set(dx, dy, dz).normalize(); E.set(cam.x - px, cam.y - py, cam.z - pz); X.crossVectors(D, E).normalize(); Z.crossVectors(X, D);
    M.makeBasis(X, D, Z); Q.setFromRotationMatrix(M); A.set(px, py, pz); putI(tongues, A, Q, W, L, W, core, pal, dis, seed); };
  const domeG = new T.SphereGeometry(1, 36, 14, 0, Math.PI * 2, 0, Math.PI / 2); geos.push(domeG);
  const domeM = new T.ShaderMaterial({ vertexShader: DOME_V, fragmentShader: DOME_F, uniforms: { time: uTime, erode: { value: 0 }, near: { value: 2.6 }, heat: { value: 1 }, hole: uHole }, side: T.DoubleSide, toneMapped: false, fog: false }); mats.push(domeM);
  const dome = new T.Mesh(domeG, domeM); dome.frustumCulled = false; dome.visible = false; root.add(dome);
  const ink = strips(T, 900, INK_F, false, uHole), fan = strips(T, 64, FAN_F, true, uHole); mats.push(ink.mat, fan.mat); geos.push(ink.geo, fan.geo); root.add(ink.mesh, fan.mesh);
  const INK = [.02, 0, .03], VIOL = [.36, .08, .7], CRIM = [.75, 0, .08], c4 = (c, a) => [c[0], c[1], c[2], a];
  const RED = [1, .05, .14], WHITE = [1, .95, 1], GOLD = [1, .62, .18], HOTV = [.62, .22, 1];
  let hint = null, tint = 0;

  /* ---------- auxiliares ---------- */
  function setPillar(px, py, pz, dir, len, rad, k, erode, swell) {
    Q.setFromUnitVectors(up, dir); const R = [rad * .38, rad * 1.15, rad * 1.6], W = [.12, .3, .45], FL = [.05, .1, .14];
    for (let l = 0; l < 3; l++) { const o = pillar[l], u = o.material.uniforms; o.visible = true; o.position.set(px, py, pz); o.quaternion.copy(Q); u.len.value = len; u.rad.value = R[l] * swell; u.wob.value = W[l]; u.flare.value = FL[l]; u.k.value = k; u.erode.value = erode; }
  }
  /** espiral helicoidal (tinta + linha quente) em torno do eixo p + dir*t */
  function helix(px, py, pz, dir, len, rad, turns, phase, hot, w, alpha) {
    X.set(1, 0, 0); if (Math.abs(dir.x) > .9) X.set(0, 0, 1); Z.crossVectors(dir, X).normalize(); X.crossVectors(Z, dir).normalize(); const N = low ? 14 : 26; let ox, oy, oz;
    for (let i = 0; i <= N; i++) { const u = i / N, a = u * turns * 6.283 + phase, r = rad * (.7 + .5 * u), x = px + dir.x * len * u + (X.x * Math.cos(a) + Z.x * Math.sin(a)) * r, y = py + dir.y * len * u + (X.y * Math.cos(a) + Z.y * Math.sin(a)) * r, z = pz + dir.z * len * u + (X.z * Math.cos(a) + Z.z * Math.sin(a)) * r;
      if (i) { if (hot) rib.seg(ox, oy, oz, x, y, z, w * .45, w * .45, c4(RED, alpha), c4(WHITE, alpha * .7)); else ink.seg(ox, oy, oz, x, y, z, w, w, c4(INK, alpha), c4(VIOL, alpha * .9)); } ox = x; oy = y; oz = z; }
  }
  /** fissura em zigue-zague de a até b no chão (borda negra larga + magma), largura w */
  function crack(seed, ax, az, bx, bz, w, heat, alpha) {
    const L = Math.hypot(bx - ax, bz - az); if (L < .2) return; const n = Math.max(2, Math.round(L / 1.1)), px = -(bz - az) / L, pz = (bx - ax) / L; let ox = ax, oz = az, oy = ground(ax, az) + .04;
    for (let i = 1; i <= n; i++) { const u = i / n, j = i === n ? 0 : (hash(seed + i * 3.1) - .5) * w * 1.6, x = ax + (bx - ax) * u + px * j, z = az + (bz - az) * u + pz * j, y = ground(x, z) + .04;
      ink.seg(ox, oy, oz, x, y, z, w, w, c4(INK, alpha), c4(INK, alpha)); if (heat > .01) rib.seg(ox, oy + .02, oz, x, y + .02, z, w * .34, w * .3, c4([1, .32 + .2 * heat, .05], heat), c4([1, .5, .1], heat)); ox = x; oy = y; oz = z; }
  }
  const world = (b, f, u, r, out) => { const fy = Math.sin(b.yaw), fz = Math.cos(b.yaw); return out.set(fy * f + fz * r, u, fz * f - fy * r).normalize(); };

  /* ---------- A/B/C: erguer, carga e corte ---------- */
  function drawCharge(s, blade, boss) {
    const T0 = s.T, age = s.age, gy = ground(boss.x, boss.z), bx = boss.x, bz = boss.z, rise = smooth(age / T0.raise), chg = smooth((age - T0.raise) / (T0.charge - T0.raise)), lit = smooth((age - T0.raise) / .5);
    const tip = blade.b, base = blade.a; D.subVectors(tip, base).normalize();
    // brasas douradas subindo em espiral (o ar "acende" ao redor)
    for (let i = 0; i < (low ? 10 : 28); i++) { const a = hash(i) * 6.283 + time * (.3 + hash(i + 7) * .5), u = (time * (.18 + hash(i + 3) * .2) + hash(i + 9)) % 1, r = 1.4 + hash(i + 5) * 5.5 * (1 - .5 * chg);
      glow.add(bx + Math.cos(a) * r, gy + .2 + u * (3 + 6 * chg), bz + Math.sin(a) * r, .1 + .08 * hash(i), .1 + .08 * hash(i), GOLD[0], GOLD[1], GOLD[2], Math.sin(u * 3.14) * (.5 + .5 * rise), 0); }
    // filamentos negros/violeta convergindo em espiral para a guarda da espada
    for (let i = 0; i < (low ? 4 : 10); i++) { const u = (time * .55 + i / 10) % 1, a0 = i * 2.39 + time * .4; let ox, oy, oz;
      for (let j = 0; j <= 7; j++) { const uu = Math.max(0, u - j * .035), r = .4 + 9 * (1 - uu) ** 1.6, a = a0 + uu * 5.5, x = base.x + Math.cos(a) * r, y = base.y + (1 - uu) * (hash(i + 4) - .3) * 5, z = base.z + Math.sin(a) * r;
        if (j) { const al = (1 - j / 8) * (.25 + .75 * rise) * Math.sin(u * 3.14); ink.seg(ox, oy, oz, x, y, z, .07 * (1 - j / 9), .07 * (1 - j / 9), c4(INK, al), c4(VIOL, al)); rib.seg(ox, oy, oz, x, y, z, .02, .02, c4(HOTV, al * .8), c4(HOTV, al * .5)); } ox = x; oy = y; oz = z; } }
    // linhas de velocidade do vento convergente rente ao chão
    for (let i = 0; i < (low ? 4 : 12); i++) { const a = hash(i * 7) * 6.283, u = (time * 1.4 + hash(i)) % 1, r = 11 * (1 - u) + 1.2, r2 = r + 2.2 * (1 - u); rib.seg(bx + Math.cos(a) * r2, gy + .3 + hash(i + 2) * 2, bz + Math.sin(a) * r2, bx + Math.cos(a) * r, gy + .3 + hash(i + 2) * 2, bz + Math.sin(a) * r, .025, .01, c4(WHITE, .35 * rise), c4(HOTV, .2 * rise)); }
    // veios negro/carmim enrolando a lâmina da guarda até a ponta
    const L = base.distanceTo(tip); helix(base.x, base.y, base.z, D, L * Math.min(1, rise * 1.3), .09, 3, time * 9, false, .05, .95); helix(base.x, base.y, base.z, D, L * Math.min(1, rise * 1.3), .11, 3, time * 9 + 3.1, true, .07, .9);
    glow.add(base.x, base.y, base.z, .5 + .5 * rise, .5 + .5 * rise, 1, .1, .3, .7 * rise, 0);
    // pedras negras angulares sugadas em espiral para o pilar, girando (tamanhos e formas variados)
    for (let i = 0; i < (low ? 8 : 22); i++) { const a = hash(i * 3) * 6.283 + time * (.6 + hash(i + 2) * .9) * (1 + chg), r = (2 + hash(i * 5) * 7) * (1 - .55 * chg), u = (time * (.2 + .2 * hash(i)) + hash(i * 9)) % 1, sc = .08 + .5 * hash(i + 1) ** 2;
      shard(bx + Math.cos(a) * r, gy + .3 + u * (2 + 9 * chg) * rise, bz + Math.sin(a) * r, sc, a * 2 + time * (2 + hash(i + 4) * 3), u * 7 + i, i * 1.3, sc * (.6 + hash(i + 5) * 1.6)); }
    groundNormal(ground, bx, bz, nrm); decals.add(bx, gy, bz, 2.2 + 3.5 * chg + 1.5 * rise, .9, .02, .2, .55 * rise, 2, 0, s.id + 3, nrm);
    // pilar colossal a partir da ponta (mesma direção da lâmina), cresce em massa, altura e turbulência
    const swing = age > T0.charge, cutK = smooth((age - T0.cut) / .16);
    if (age >= T0.raise) {
      const ign = smooth((age - T0.raise) / .55), len = 58 * ign * (1 - cutK), swell = (.75 + .55 * chg) * (1 + .12 * Math.sin(time * 23)); Fv.copy(D); if (Fv.y < -.04) { Fv.y = -.04; Fv.normalize(); }
      if (len > .5) { setPillar(tip.x - Fv.x * .3, tip.y - Fv.y * .3, tip.z - Fv.z * .3, Fv, len, 2.7, 1, cutK * .9, swell);
        // lascas de chama vermelha e negra que espirram do pilar ao longo da altura (massa e turbulência)
        X.set(1, 0, 0); if (Math.abs(Fv.x) > .9) X.set(0, 0, 1); Z.crossVectors(Fv, X).normalize(); X.crossVectors(Z, Fv).normalize(); const ax = AX.copy(X), az = AZ.copy(Z);
        for (let i = 0; i < (low ? 6 : 16); i++) { const hh = (hash(i + 60) * .85 + .04) * len, an = hash(i + 61) * 6.283 + time * (hash(i + 62) - .5) * 3, ca = Math.cos(an), sa = Math.sin(an), r0 = 1.4 * swell, fl = .6 + .4 * Math.sin(time * 15 + i * 1.7);
          const ox = ax.x * ca + az.x * sa, oy = ax.y * ca + az.y * sa, oz = ax.z * ca + az.z * sa; tongue(tip.x + Fv.x * hh + ox * r0, tip.y + Fv.y * hh + oy * r0, tip.z + Fv.z * hh + oz * r0, ox + Fv.x * .9, oy + Fv.y * .9, oz + Fv.z * .9, (3 + 5 * hash(i + 63)) * fl * ign, 1 + .8 * hash(i + 64), .8, i % 3 === 0 ? 1 : 0, 0, hash(i + 65)); }
        if (!low) for (let i = 0; i < 2; i++) { const sd = i ? 1 : -1, sw = Math.floor(time * 16 + i * 3); E.set(cam.x - tip.x, 0, cam.z - tip.z).normalize(); const rx = -E.z * sd, rz = E.x * sd, rr = 3.6 * swell; // raios brancos verticais nas laterais
          boltRib(s.id * 3 + sw + i, tip.x + rx * rr, tip.y + 2, tip.z + rz * rr, tip.x + rx * rr * 1.3, tip.y + len * .7, tip.z + rz * rr * 1.3, .1, [1, .92, 1], .95 * lit); }
        if (age > T0.raise + .35) { E.set(cam.x - tip.x, 0, cam.z - tip.z).normalize(); const rx = -E.z, rz = E.x, bw = 14 * smooth((age - (T0.raise + .35)) / .3); for (const hb of [.3, .52]) { const y = tip.y + len * hb; ink.seg(tip.x - rx * bw, y, tip.z - rz * bw, tip.x + rx * bw, y, tip.z + rz * bw, .5, .5, c4(INK, .92), c4(INK, .92)); } } // duas faixas escuras cruzando o pilar
        for (let h = 0; h < (low ? 2 : 4); h++) helix(tip.x, tip.y, tip.z, Fv, len * .92, 2.6 * swell, 2.2 + h * .3, time * (h % 2 ? -3 : 4) + h * 1.6, h % 2 === 0, .16 + .06 * (h % 2), .9 * lit); }
      // ignição: anel de choque + chuva de lascas negras/vermelhas na base (línguas de chama abrindo)
      if (!swing) { const n = low ? 6 : 14; for (let i = 0; i < n; i++) { const a = i / n * 6.283 + hash(i) * .5 + time * .4, fl = .7 + .3 * Math.sin(time * 17 + i * 2.1), Lh = (2.4 + 2.2 * hash(i + 3)) * ign * fl * (.8 + .5 * chg);
          tongue(bx + Math.cos(a) * .7, gy + .1, bz + Math.sin(a) * .7, Math.cos(a), 1.1 + hash(i) * .8, Math.sin(a), Lh * .8, .6 + .4 * hash(i + 6), .9, i % 4 ? 0 : 1, 0, hash(i + 11)); }
        const ik = (age - T0.raise) / .5; if (ik < 1) { ring(bx, gy + .25, bz, 1.5 + 9 * easeOut(ik), 1 + 3 * (1 - ik)); decals.add(bx, gy, bz, 3 + 10 * easeOut(ik), 1, .1, .35, 1 - ik, 0, ik, s.id + 9, nrm); }
        if (!low) for (let i = 0; i < 10; i++) { const a = hash(i + 40) * 6.283, u = ((age - T0.raise) * 1.3 + hash(i + 41)) % 1, r = 1 + u * 4; shard(bx + Math.cos(a) * r, gy + u * 9 * ign, bz + Math.sin(a) * r, .14 * (1 - u) + .04, a, u * 9, i, 1.8); } }
      glow.add(tip.x, tip.y, tip.z, 2.4 * ign, 2.4 * ign, 1, .35, .7, .9 * ign * (1 - cutK), 2, time);
      // trilha de aviso: rachadura fina que se estende na direção do olhar do bispo
      if (age < T0.cut) { const fx = Math.sin(boss.yaw), fz = Math.cos(boss.yaw), Lw = Math.min(s.len || 20, 6 + 26 * chg); crack(s.id * 7, bx + fx * 1.5, bz + fz * 1.5, bx + fx * Lw, bz + fz * Lw, .14 + .1 * chg, .25 + .45 * chg * (.6 + .4 * Math.sin(time * 14)), .8 * lit); }
    }
    // leque do golpe: a curva da própria pose, da posição de preparo até agora, com o raio do pilar
    if (age > T0.charge + .31 && age < T0.cut + .24) { const t1 = Math.min(age, T0.cut), t0 = Math.max(T0.charge + .31, t1 - .25), fade = 1 - smooth((age - T0.cut) / .24), N = 10, Rf = 58;
      const P = (t, out) => { const p = thronePose(t); world(boss, p.blade[0], p.blade[1], p.blade[2], out); if (out.y < -.04) { out.y = -.04; out.normalize(); } return out; };
      for (let i = 0; i < N; i++) { const ta = t0 + (t1 - t0) * i / N, tb = t0 + (t1 - t0) * (i + 1) / N; P(ta, A); P(tb, B); const ua = i / N, ub = (i + 1) / N;
        fan.quad([base.x + A.x * 24, base.y + A.y * 24, base.z + A.z * 24], [base.x + A.x * Rf, base.y + A.y * Rf, base.z + A.z * Rf], [base.x + B.x * 24, base.y + B.y * 24, base.z + B.z * 24], [base.x + B.x * Rf, base.y + B.y * Rf, base.z + B.z * Rf],
          c4(RED, .4 * fade), c4(RED, .4 * fade), c4(RED, .4 * fade), c4(RED, .4 * fade), [0, ua], [1, ua], [0, ub], [1, ub]); } }
    // flare em cruz vermelho no instante do corte
    const fk = (age - T0.cut) / .35; if (fk >= 0 && fk < 1) { const fx = Math.sin(boss.yaw), fz = Math.cos(boss.yaw), cx = bx + fx * 2.5, cy = gy + 1.6, cz = bz + fz * 2.5, Lx = 26 * easeOut(Math.min(1, fk * 3)), Ly = 34 * easeOut(Math.min(1, fk * 3)), w = .55 * (1 - fk), a = 1 - fk * fk;
      rib.seg(cx - fz * Lx, cy, cz + fx * Lx, cx + fz * Lx, cy, cz - fx * Lx, w, w, c4(RED, a), c4(RED, a)); rib.seg(cx, cy - 2, cz, cx, cy + Ly, cz, w, w * .3, c4(RED, a), c4(RED, a));
      rib.seg(cx - fz * Lx * .7, cy, cz + fx * Lx * .7, cx + fz * Lx * .7, cy, cz - fx * Lx * .7, w * .3, w * .3, c4(WHITE, a), c4(WHITE, a)); glow.add(cx, cy, cz, 9 * (1 - fk * .5), 9 * (1 - fk * .5), 1, .25, .45, a, 2, .78); glow.add(cx, cy, cz, 4, 4, 1, 1, 1, a, 0); }
    if (age > T0.raise && age < T0.cut + .35) hint = { look: [bx, gy + 12 * lit, bz], k: lit * (1 - cutK), fov: 10 * lit * (1 - cutK), back: 5, lift: 2.5 }; // o jogo abre o plano e inclina para revelar a escala
  }

  /* ---------- D: feixe e chão rasgado ---------- */
  function drawBeam(s, boss) {
    const T0 = s.T, sp = T0.speed, ba = s.age - T0.cut, front = s.phase === 'wave' ? s.front : s.len, it = s.phase === 'wave' ? -1 : s.phase === 'impact' ? s.t : T0.impact + s.t, gy = ground(s.x, s.z);
    const ero = smooth((it - .1) / .6), alive = it < .75, px = -s.dz, pz = s.dx, w1 = 4.6, sx = s.x, sz = s.z;
    if (alive && front > .6) { Fv.set(s.dx, 0, s.dz); Q.setFromUnitVectors(up, Fv); X.set(px, 0, pz); Z.set(0, 1, 0); M.makeBasis(X, Fv, Z); Q.setFromRotationMatrix(M);
      for (let l = 0; l < 2; l++) { const o = beam[l], u = o.material.uniforms, k = l ? 1 : .5; o.visible = true; o.position.set(sx - s.dx * .6, gy + .05, sz - s.dz * .6); o.quaternion.copy(Q); u.len.value = front + .6; u.w0.value = .45 * k; u.w1.value = w1 * k; u.h0.value = .8 * k; u.h1.value = 5.4 * k; u.erode.value = ero; }
      // parede de massa carmim e línguas na FRENTE (só enquanto avança)
      if (s.phase === 'wave') { const fx = sx + s.dx * front, fz = sz + s.dz * front, fy = ground(fx, fz);
        for (let i = 0; i < (low ? 2 : 3); i++) { const j = hash(i * 5.3) - .5, r = .8 + hash(i + 2) * .6; puff(fx + px * j * 5 + s.dx * (hash(i + 8) - .3) * 2, fy + .8 + hash(i + 4) * 3.2, fz + pz * j * 5 + s.dz * (hash(i + 8) - .3) * 2, r * (.85 + .15 * Math.sin(time * 19 + i)), .95, 1, 0, hash(i + 13 + Math.floor(time * 8))); }
        for (let i = 0; i < (low ? 6 : 16); i++) { const sd = i % 2 ? 1 : -1, a = .2 + hash(i + 3) * 1.1; tongue(fx + px * sd * (.6 + hash(i + 7) * 1.6), fy + .3 + hash(i + 9) * 2.5, fz + pz * sd * (.6 + hash(i + 7) * 1.6), s.dx * (.9 - .4 * hash(i)) + px * sd * Math.sin(a), Math.cos(a) * .9, s.dz * (.9 - .4 * hash(i)) + pz * sd * Math.sin(a), 5 + hash(i) * 6, 1.6 + hash(i + 1) * 1.4, .9, i % 5 === 0 ? 1 : 0, 0, hash(i + Math.floor(time * 12))); }
        glow.add(fx, fy + 2, fz, 7, 5, 1, .2, .4, .8, 0); }
      // línguas abrindo em V nos flancos e gavinhas negras
      for (let d = 2; d < front - 1; d += low ? 4 : 2.2) { const tp = ba - d / sp, fl = .75 + .25 * Math.sin(time * 21 + d), dis = Math.max(ero, smooth((tp - .9) / .5)), x = sx + s.dx * d, z = sz + s.dz * d, y = ground(x, z), wd = 1.1 + (w1 - 1.1) * smooth(d / (front * .45 + 1));
        for (const sd of [-1, 1]) tongue(x + px * sd * wd * .7, y + .4, z + pz * sd * wd * .7, -s.dx * .55 + px * sd * .8, .55 + .3 * hash(d * 3 + sd), -s.dz * .55 + pz * sd * .8, (2.5 + 3.5 * hash(d + sd)) * fl, 1.2 + .8 * hash(d * 7 + sd), .7, hash(d + sd * 3) > .78 ? 1 : 0, dis, hash(d * 11 + sd));
        tongue(x + px * (hash(d * 5) - .5) * 2, y + 3.5 * smooth(d / (front * .45 + 1)) + 1.5, z + pz * (hash(d * 5) - .5) * 2, -s.dx * .5 + px * (hash(d * 9) - .5), 1, -s.dz * .5 + pz * (hash(d * 9) - .5), (2 + 3 * hash(d * 13)) * fl, 1 + .6 * hash(d * 17), .75, 0, dis, hash(d * 19)); }
      for (const sd of [-1, 1]) for (let l = 0; l < 2; l++) { let ox, oy, oz; for (let d = 0; d <= front; d += 1.5) { const wd = (1.2 + (w1 - 1.2) * smooth(d / (front * .45 + 1))) * (1.05 + l * .25), wv = Math.sin(d * .7 - time * 11 + l * 2 + sd) * .5, x = sx + s.dx * d + px * sd * (wd + wv), z = sz + s.dz * d + pz * sd * (wd + wv), y = ground(x, z) + 1.2 + l * 1.4 + Math.sin(d * .5 + time * 7) * .6;
        if (d) ink.seg(ox, oy, oz, x, y, z, .2, .2, c4(INK, .9 * (1 - ero)), c4(VIOL, .8 * (1 - ero))); ox = x; oy = y; oz = z; } }
    }
    // chão: fissura que se abre atrás da frente, placas angulares que se erguem e detritos lançados pela frente de choque
    const cool = s.phase === 'fade' ? 1 - smooth(s.t / s.T.fade) : 1, heat = Math.max(.25, 1 - smooth((it - .4) / 2)) * cool;
    crack(s.id * 13, sx, sz, sx + s.dx * front, sz + s.dz * front, .55, heat, .95 * cool); crack(s.id * 17, sx + px * 1.6, sz + pz * 1.6, sx + s.dx * front * .85 + px * 2.6, sz + s.dz * front * .85 + pz * 2.6, .22, heat * .7, .85 * cool); crack(s.id * 19, sx - px * 1.4, sz - pz * 1.4, sx + s.dx * front * .9 - px * 2.8, sz + s.dz * front * .9 - pz * 2.8, .24, heat * .7, .85 * cool);
    for (let d = 1.5; d < front; d += low ? 2.4 : 1.25) { const tp = ba - d / sp, lift = smooth(tp / .22) * cool, sd0 = s.id + Math.floor(d * 7);
      for (const sd of [-1, 1]) { const off = 1 + hash(sd0 + sd) * 1.6, x = sx + s.dx * d + px * sd * off, z = sz + s.dz * d + pz * sd * off; if (lift > .02) plate(x, ground(x, z) - .25 + .45 * lift, z, (.55 + hash(sd0 + 2 + sd) * .55) * Math.min(1, lift * 1.4), sd * (.35 + .4 * hash(sd0 + sd * 5)) * lift, Math.atan2(s.dx, s.dz) + (hash(sd0 + 9) - .5), (hash(sd0 + 4) - .5) * .6 * lift); }
      if (tp > 0 && tp < 1.3 && !low || (low && tp > 0 && tp < 1 && d % 3 < 1.3)) for (let i = 0; i < 2; i++) { const sd = i ? 1 : -1, vx = sd * (2.5 + 4 * hash(sd0 + i)), vy = 6 + 6 * hash(sd0 + i + 3), vf = 2 + 3 * hash(sd0 + i + 6), y = vy * tp - 4.9 * tp * tp; if (y < 0) continue;
        const x = sx + s.dx * (d + vf * tp) + px * vx * tp, z = sz + s.dz * (d + vf * tp) + pz * vx * tp; shard(x, ground(x, z) + y, z, .12 + .16 * hash(sd0 + i + 9), tp * 7 + i, tp * 5, i, 1.2); }
      if (tp > 0 && tp < 1.6 && !low && hash(sd0) > .75) { const k = tp / 1.6, x = sx + s.dx * d + px * (hash(sd0 + 1) - .5) * 3, z = sz + s.dz * d + pz * (hash(sd0 + 1) - .5) * 3; puff(x, ground(x, z) + .6 + k * 3.4, z, .7 + 1.3 * k, .14 * (1 - k), 0, smooth((k - .45) / .55), hash(sd0 + 2)); } // fumaça escura que sobe da fissura
    }
  }

  /* ---------- E: colisão e explosão em várias fases ---------- */
  function drawImpact(s) {
    const T0 = s.T, it = s.phase === 'impact' ? s.t : T0.impact + s.t, cx = s.ix, cy = s.iy, cz = s.iz, tb = it - T0.blast, end = T0.impact + T0.fade, er = smooth((it - 1.5) / (end - 1.7));
    groundNormal(ground, cx, cz, nrm);
    { const dc = Math.hypot(cam.x - cx, cam.z - cz); if (dc < 16 && it < 3.6) { const k = smooth(it / .85) * (1 - smooth((it - 2.8) / .8)); hint = { look: [cx, cy + 4, cz], k, fov: 14 * k, back: 10, lift: 4.5 }; } } // recua para mostrar a explosão inteira
    // 1) implosão brevíssima
    if (it < .18) { const k = it / .18; puff(cx, cy + 1.6, cz, 3.2 * (1 - k) + .6, 1, 1, 0, .3); ring(cx, cy + .4, cz, 7 * (1 - k) + .5, 2); }
    // 2) clarão branco-quente curto (o jogo atenua com "reduzir flashes")
    if (it > .12 && it < .65) { const k = (it - .12) / .53; glow.add(cx, cy + 3, cz, 34 * (1 - k * .4), 34 * (1 - k * .4), 1, .92, .95, (1 - k) * .95, 0); glow.add(cx, cy + 3, cz, 22, 22, 1, .4, .6, (1 - k), 2, .3); }
    // 3) choque vermelho/negro e anéis supersônicos
    for (let i = 0; i < 4; i++) { const k = (it - .18 - i * .22) / 1.4; if (k < 0 || k > 1) continue; ring(cx, cy + .3 + i * 1.3, cz, 3 + 24 * easeOut(k), (1 - k) * 3 + .5); }
    if (it < 1) { const k = it; decals.add(cx, cy, cz, 3 + 22 * easeOut(k), 1, .05, .2, 1 - k, 0, k, s.id + 21, nrm); }
    for (let i = 0; i < (low ? 8 : 18); i++) { const k = (it - .05) / .7; if (k < 0 || k > 1) break; const a = hash(i + 50) * 6.283, r = 2 + 13 * easeOut(k); tongue(cx + Math.cos(a) * r * .4, cy + .2, cz + Math.sin(a) * r * .4, Math.cos(a), .35 + hash(i) * .5, Math.sin(a), (3 + 4 * hash(i + 2)) * (1 - k * .6), 1.5, .8, i % 3 ? 0 : 1, smooth((k - .5) / .5), hash(i + 51)); }
    // 4) domo roxo/magenta com rasgos negros (erode por dentro e no fim) + coluna vertical
    const Rd = 7 * easeOut(Math.min(1, it / .45)) * (1 + .08 * er), dC = Math.hypot(cam.x - cx, cam.z - cz), inD = dC < Rd && cam.y - cy < Rd, prox = .3 * (1 - smooth((dC - Rd) / 9));
    if (it > .08 && er < .995) { dome.visible = true; dome.position.set(cx, cy - .1, cz); dome.scale.set(Rd, Rd * .9, Rd); domeM.uniforms.erode.value = Math.min(1, er + (inD ? .45 : prox)); domeM.uniforms.heat.value = 1 - smooth(it / 1.8); }
    if (it > .1 && it < end - .3) { const ck = smooth((it - .1) / .3), ce = smooth((it - 1.3) / 1.4); setPillar(cx, cy - .2, cz, up, 44 * ck, .8, 1, ce, 1 + .4 * Math.sin(time * 9) * (1 - ce)); }
    if (!low && it > .1 && it < 1.8) for (let i = 0; i < 5; i++) { const an = hash(i + Math.floor(time * 14)) * 6.283; boltRib(s.id + i + Math.floor(time * 14), cx, cy + Rd * .85, cz, cx + Math.cos(an) * Rd * 2, cy + .2, cz + Math.sin(an) * Rd * 2, .12, i % 2 ? [1, .2, .8] : [.6, .25, 1], .95 * (1 - er)); }
    // massa carmim que explode para fora logo no início
    if (it < 1.8) for (let i = 0; i < (low ? 8 : 20); i++) { const k = it / 1.8, a = hash(i + 70) * 6.283, el = .35 + hash(i + 71) * 1.05, g = easeOut(Math.min(1, k * 3)), L = (5 + 7 * hash(i + 72)) * g; // lâminas carmim oblíquas abrindo em V
      tongue(cx + Math.cos(a) * .8, cy + .2, cz + Math.sin(a) * .8, Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el), L, 1.4 + 1.2 * hash(i + 74), .9, i % 4 === 0 ? 1 : 0, smooth((k - .5) / .5), hash(i + 73)); }
    if (it < .5) puff(cx, cy + 1.2, cz, 1.6 + 1.4 * easeOut(it / .5), 1, 1, smooth((it - .25) / .25), .4); // núcleo compacto
    // 5) explosão SECUNDÁRIA amarelo-branco/laranja: fogo em camadas, cogumelo que sobe, fumaça e rochas
    if (tb > 0) { const n = low ? 12 : 32;
      for (let i = 0; i < n; i++) { const a = hash(i + 90) * 6.283, el = .45 + hash(i + 91) * 1.05, k = tb - hash(i + 97) * .35; if (k <= 0) continue; // lâminas de fogo direcionais em leque (não bolas)
        const g = easeOut(Math.min(1, k / .65)), L = (6 + 9 * hash(i + 92)) * g * (1 + .25 * smooth((k - .6) / 1)), dis = smooth((k - .8 - hash(i + 95) * .5) / .7);
        tongue(cx + Math.cos(a) * 1.2, cy + .3, cz + Math.sin(a) * 1.2, Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el), L, 1.6 + 1.6 * hash(i + 93), 1, 2, dis, hash(i + 96)); }
      for (let i = 0; i < (low ? 3 : 6); i++) { const k = tb, a = hash(i + 30) * 6.283, r = (1 + .7 * hash(i + 31)) * (.6 + .6 * easeOut(Math.min(1, k / .4))); puff(cx + Math.cos(a) * 1.6, cy + 1 + i * .9 + k * 1.5, cz + Math.sin(a) * 1.6, r, 1 - .5 * smooth(k / 1.4), 0, smooth((k - .7 - i * .06) / .6), hash(i + 32)); } // núcleo incandescente de apoio
      for (let i = 0; i < (low ? 8 : 26); i++) { const a = hash(i + 110) * 6.283, v = 8 + 9 * hash(i + 111), vy = 6 + 10 * hash(i + 112), k = tb, y = vy * k - 4.9 * k * k; if (y < 0) continue; shard(cx + Math.cos(a) * v * k, cy + 1 + y, cz + Math.sin(a) * v * k, .25 + .4 * hash(i + 113), k * 6 + i, k * 4, i, 1.1); }
      for (let i = 0; i < (low ? 0 : 3); i++) { const k = (tb - .1 - i * .12) / 1; if (k < 0 || k > 1) continue; const R = 9 + 7 * easeOut(k) + i * 2, tilt = .25 + i * .2, sp0 = i * 2.1 + time * .3, a = (1 - k) * .9; let ox, oy, oz; // arcos crescentes brancos
        for (let j = 0; j <= 22; j++) { const t = sp0 + j / 22 * 3.6, x = cx + Math.cos(t) * R, z = cz + Math.sin(t) * R, y = cy + 3 + i * 1.5 + Math.sin(t) * R * tilt * .3; if (j) rib.seg(ox, oy, oz, x, y, z, .18 * Math.sin(j / 22 * 3.14), .18 * Math.sin((j + 1) / 22 * 3.14), c4(WHITE, a), c4([1, .6, .85], a)); ox = x; oy = y; oz = z; } }
      if (!low && tb < 2.4) for (let i = 0; i < 14; i++) { const k = (tb + hash(i + 120)) % 1, a = hash(i + 121) * 6.283; glow.add(cx + Math.cos(a) * (3 + 6 * k), cy + 1 + k * 8, cz + Math.sin(a) * (3 + 6 * k), .16, .5, 1, .7, .2, (1 - k) * (1 - er), 3, a, i); } }
    // cratera: rachaduras e brasa no chão que esfriam
    decals.add(cx, cy, cz, 11 + 2 * er, 1, .18, .06, .95 * (1 - er * .8), 1, Math.min(1, it), s.id + 23, nrm); decals.add(cx, cy, cz, 7, 1, .3, .05, .8 * (1 - er), 2, 0, s.id + 24, nrm);
    for (let i = 0; i < (low ? 6 : 12); i++) { const an = i / 12 * 6.283 + hash(i + 140), u = easeOut(Math.min(1, it / .4)), r = 3 + 5.5 * u * (.8 + .4 * hash(i + 141)); plate(cx + Math.cos(an) * r, cy - .2 + .5 * (1 - er) + Math.sin(Math.min(1, it / .4) * 3.14) * 1.4, cz + Math.sin(an) * r, (.7 + .5 * hash(i + 142)) * (1 - er * .5), (hash(i + 143) - .5) * 1.2, an, .5 + hash(i + 144) * .6); }
  }

  return {
    get camHint() { return hint; }, get tint() { return tint; },
    begin(camera, t, q, target) { time = t; uTime.value = t; low = q === 0; cam.copy(camera.position); hint = null; tint = 0; dome.visible = false;
      if (target && target.alive !== false) uHole.value.set(target.x, ground(target.x, target.z) + 1, target.z, 1.7); else uHole.value.w = 0; /* o herói nunca some dentro do efeito */ for (const o of pillar) o.visible = false; for (const o of beam) o.visible = false; puffs.n = tongues.n = 0; ink.begin(cam); fan.begin(cam); },
    /** blade: {a,b} em mundo (guarda e ponta); boss: ator dono (pode faltar depois do corte) */
    draw(s, blade, boss) {
      if (s.cancel) return; const T0 = s.T; tint = Math.max(tint, Math.min(1, (s.dim || 0) / .75)); /* céu, terreno e bispo em carmim na carga/disparo */
      if ((s.phase === 'raise' || s.phase === 'charge' || s.phase === 'slash' || (s.phase === 'wave' && s.age < T0.cut + .25)) && blade && boss) drawCharge(s, blade, boss);
      if (s.phase === 'wave' || s.phase === 'impact' || s.phase === 'fade') drawBeam(s, boss);
      if ((s.phase === 'impact' || s.phase === 'fade') && s.ix !== undefined) drawImpact(s);
    },
    end() { for (const I of [puffs, tongues]) { I.o.count = I.n; I.o.instanceMatrix.needsUpdate = true; I.o.geometry.attributes.aP.needsUpdate = true; } ink.end(); fan.end(); },
    clear() { dome.visible = false; for (const o of pillar) o.visible = false; for (const o of beam) o.visible = false; puffs.o.count = tongues.o.count = 0; ink.geo.setDrawRange(0, 0); fan.geo.setDrawRange(0, 0); hint = null; },
    dispose() { for (const g of geos) g.dispose(); for (const m of mats) m.dispose(); }
  };
}
