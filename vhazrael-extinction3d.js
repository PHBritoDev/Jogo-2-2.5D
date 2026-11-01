import { smooth, easeOut, hash, groundNormal } from './celestial-fxkit3d.js';
/**
 * MOD 253 — EXTINÇÃO ORBITAL do VHAZRAEL refeita como cutscene (só desenha o estado de vhazrael3d.js; dano é da lógica).
 * Tudo procedural e original (shaders + geometria gerada no carregamento; nenhuma textura externa).
 *
 *  SHOT 1 awaken  — close baixo e frontal; bispo em silhueta (luz da arena cai) contra aura carmim estruturada em lâminas e
 *                   linhas verticais; X de luz rubra ancorado no osso Head do GLB (não é decal: duas fitas finas + halo).
 *  SHOT 2/3 orbit — cena ISOLADA: Terra procedural (continentes, oceano com brilho especular, gelo, nuvens com parallax,
 *                   terminador dia/noite, luzes urbanas, limbo atmosférico azul) ocupando a metade de baixo, céu estrelado
 *                   e o sol estourando no horizonte; um ponto quente surge LONGE e cresce (é o meteoro, não um orbe).
 *  SHOT 4 entry   — montagem guiada pelo MESMO caminho do meteoro: tracking 3/4 → rente à crosta → plano aberto mirando a
 *                   Terra → horizonte/atmosfera comprimida → câmera distal vendo a chegada.
 *  SHOT 5 arrival — arena aberta: o meteoro entra pelo céu na direção do estado, sombra crescendo, luz quente.
 *  SHOT 6 choice  — over-the-shoulder na altura dos olhos do herói olhando para cima; controles/DEF ativos (o jogo).
 *  SHOT 7 impact  — contato → núcleo branco-amarelo com casca laranja/negra recortada → anel de choque com espessura varrendo
 *                   o chão → fissuras, placas e detritos irradiando do epicentro; câmera aberta fora do domo.
 *  SHOT 8 after   — tudo erode/esfria e a câmera devolve ao jogador (blend).
 * Meteoro: rocha irregular (ruído + crateras) com fendas profundas incandescentes e face de ataque fundida; camada de
 * choque/plasma aderente e caudas em envelope alongadas SEMPRE opostas à velocidade (vértices empurrados no shader).
 */
const NOISE = `float h3(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float n3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}
float f3(vec3 p){return n3(p)*.5+n3(p*2.03+7.1)*.25+n3(p*4.07+3.3)*.15+n3(p*8.1+1.7)*.1;}
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}`;
const W_V = `varying vec3 vN; varying vec3 vV; varying vec3 vP; varying vec3 vW; void main(){ vP=position; vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal); vV=cameraPosition-w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
/* Terra: tudo em espaço de objeto (a esfera não gira; a luz é sunDir) */
const EARTH_F = `${NOISE} uniform vec3 sunDir; uniform float time; varying vec3 vN; varying vec3 vV; varying vec3 vP;
void main(){ vec3 p=normalize(vP), n=normalize(vN), v=normalize(vV); float c=f3(p*2.1+vec3(3.,1.,7.)), land=smoothstep(.505,.53,c), coast=smoothstep(.47,.505,c)*(1.-land);
 float dl=dot(n,sunDir), day=smoothstep(-.12,.3,dl); float rough=f3(p*9.);
 vec3 ocean=mix(vec3(.004,.018,.06),vec3(.02,.09,.2),coast*.8+.2*rough), ground=mix(vec3(.07,.1,.04),vec3(.24,.2,.12),smoothstep(.4,.7,rough)); ground=mix(ground,vec3(.32,.27,.17),smoothstep(.62,.8,c));
 vec3 col=mix(ocean,ground,land); float ice=smoothstep(.8,.9,abs(p.y)+.06*rough); col=mix(col,vec3(.75,.8,.86),ice);
 col=col*(.05+1.2*day)+mix(ground,ocean,.5)*vec3(.35,.55,1.)*.55*(1.-day); float spec=pow(max(0.,dot(reflect(-v,n),sunDir)),36.)*day*(1.-land)*(1.-ice); col+=vec3(.55,.62,.7)*spec;
 float city=land*(1.-day)*smoothstep(.72,.86,n3(p*70.))*smoothstep(.45,.75,n3(p*13.)); col+=vec3(1.,.72,.38)*city*2.2;
 float f=1.-abs(dot(n,v)); col+=vec3(.18,.42,.95)*pow(f,2.2)*(.35+.9*smoothstep(-.25,.4,dl)); col=mix(col,vec3(.5,.62,.85)*day,smoothstep(.75,1.,f)*.25);
 gl_FragColor=vec4(col,1.); }`;
const CLOUD_F = `${NOISE} uniform vec3 sunDir; uniform float time; varying vec3 vN; varying vec3 vV; varying vec3 vP;
void main(){ vec3 p=normalize(vP); float c=f3(p*3.3+vec3(time*.006,0.,time*.004)), w=f3(p*11.+c*2.); float a=smoothstep(.58,.78,c+.12*(w-.5)); if(a<.01) discard;
 float day=smoothstep(-.1,.35,dot(normalize(vN),sunDir)); vec3 col=vec3(.86,.9,.96)*(.02+.85*day); gl_FragColor=vec4(col,a*(.25+.6*day)); }`;
const ATMO_F = `uniform vec3 sunDir; varying vec3 vN; varying vec3 vV; void main(){ vec3 n=normalize(vN), v=normalize(vV); float f=1.-abs(dot(n,v)); float lit=.35+.65*smoothstep(-.35,.45,dot(n,sunDir));
 float a=pow(f,4.)*2.*lit; vec3 c=mix(vec3(.12,.35,1.),vec3(.55,.8,1.),pow(f,9.)); c=mix(c,vec3(1.,.45,.18),exp(-pow(dot(n,sunDir)*5.,2.))*.55); gl_FragColor=vec4(c*a,a); }`; // limbo avermelha no terminador (espalhamento)
const SKY_F = `${NOISE} varying vec3 vP; void main(){ vec3 p=normalize(vP); float band=exp(-pow(dot(p,normalize(vec3(.3,.5,-.8)))*3.2,2.)); float n=f3(p*5.)*band; vec3 c=vec3(.004,.008,.025)+vec3(.05,.08,.2)*n*n*1.6; gl_FragColor=vec4(c,1.); }`;
const FLARE_F = `uniform float k; varying vec2 vU; void main(){ vec2 p=vU*2.-1.; float d=length(p); vec2 q=abs(p); float rays=max(0.,1.-q.x*q.y*90.)*pow(max(0.,1.-max(q.x,q.y)),2.)+max(0.,1.-abs(p.y)*22.)*pow(max(0.,1.-q.x),3.)*.9;
 float a=(exp(-d*d*28.)*1.6+exp(-d*d*4.)*.35+rays)*k; vec3 c=mix(vec3(.35,.6,1.),vec3(1.,.98,.95),exp(-d*d*12.)); gl_FragColor=vec4(c*a,a); }`;
/* meteoro: rocha carvão com fendas profundas incandescentes; face de ataque fundida (vel em mundo) */
const ROCK_F = `${NOISE} uniform float heat, time; uniform vec3 vel, key; varying vec3 vN; varying vec3 vV; varying vec3 vP; varying vec3 vW;
void main(){ vec3 p=vP*1.0, n=normalize(vN); float bmp=f3(p*7.)*.6+n3(p*19.)*.4; vec3 dx=dFdx(vW), dy=dFdy(vW); float bx=dFdx(bmp), by=dFdy(bmp); vec3 r1v=cross(dy,n), r2v=cross(n,dx); float det=dot(dx,r1v); n=normalize(abs(det)*n-sign(det)*(bx*r1v+by*r2v)*2.2);
 float l=max(0.,dot(n,key))*.95+.06;
 vec3 q=p*2.1+1.6*vec3(n3(p*1.5),n3(p*1.5+5.),n3(p*1.5+9.)); float r1=1.-abs(n3(q)*2.-1.), r2=1.-abs(n3(q*2.3+4.)*2.-1.); float crack=smoothstep(.955,.992,r1)+smoothstep(.97,.995,r2)*.55; float core=smoothstep(.985,.998,r1);
 float lead=smoothstep(.25,.9,dot(n,vel)), melt=lead*heat*(.55+.45*f3(p*3.+vec3(0.,time*.6,0.)));
 vec3 c=vec3(.05,.042,.038)*(.4+.9*f3(p*6.))*l*1.3; c=mix(c,vec3(.55,.08,.02),smoothstep(.15,.5,melt)); c=mix(c,vec3(1.,.42,.06),smoothstep(.45,.8,melt)); c=mix(c,vec3(1.,.9,.62),smoothstep(.8,1.05,melt));
 vec3 hot=mix(vec3(1.,.35,.04),vec3(1.,.95,.72),core); c=mix(c,hot,clamp(crack,0.,1.)*(.35+.75*heat)); gl_FragColor=vec4(c,1.); }`;
/* envelope de plasma/cauda: esfera cuja metade de trás é empurrada contra a velocidade (len raios) */
const ENV_V = `${NOISE} uniform vec3 vel; uniform float len, time, wob; varying vec3 vN; varying vec3 vV; varying float vS; varying vec3 vO;
void main(){ vec3 d=normalize((inverse(modelMatrix)*vec4(vel,0.)).xyz); float s=dot(normal,-d); vS=s; vO=position; vec3 p=position;
 if(s>0.){ float t=pow(s,1.6); p+= -d*len*t; p+=normal*wob*(n3(position*3.+vec3(time*3.))-.5)*t; p+=(normal+d*s)*(-.55*t); }
 vec4 w=modelMatrix*vec4(p,1.); vN=normalize(mat3(modelMatrix)*normal); vV=cameraPosition-w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
const ENV_F = `${NOISE} uniform float heat, time, layer; uniform vec3 c1, c2; varying vec3 vN; varying vec3 vV; varying float vS; varying vec3 vO;
void main(){ float f=abs(dot(normalize(vN),normalize(vV))); float fil=n3(vO*vec3(6.,6.,6.)+vec3(0.,0.,time*9.)+vS*4.); float along=max(vS,0.);
 float lead=smoothstep(.25,.85,-vS); float a=(layer<.5?(pow(1.-f,3.)*1.2*lead+pow(f,2.)*.22*lead):pow(f,1.6))*(1.-smoothstep(.55,1.,along))*heat*(.65+.6*fil); if(layer>1.5) a=pow(f,1.2)*(1.-smoothstep(.3,1.,along))*smoothstep(.05,.3,along)*heat*.55;
 vec3 c=mix(c1,c2,clamp(along*1.4+fil*.3,0.,1.)); if(layer>1.5){ gl_FragColor=vec4(c,a); return; } gl_FragColor=vec4(c*a,a); }`;
/* aura do despertar: fundo carmim estruturado (linhas verticais, cortes negros), recortado em volta da silhueta pela câmera */
const AURA_F = `${NOISE} uniform float time, k; varying vec2 vU; void main(){ vec2 p=vU*2.-1.; float d=length(p*vec2(.8,1.));
 float lines=smoothstep(.55,.62,n2(vec2(p.x*38.,time*.4)))*smoothstep(.2,.9,n2(vec2(p.x*9.,p.y*2.-time*1.5)));
 float flame=f3(vec3(p.x*3.,p.y*2.2-time*1.1,time*.2)); float cut=smoothstep(.6,.64,f3(vec3(p.x*5.,p.y*1.4-time*.8,3.)));
 vec3 c=mix(vec3(.85,.02,.05),vec3(.25,0.,.02),smoothstep(.15,1.,d)); c=mix(c,vec3(1.,.35,.25),exp(-d*d*6.)*.55); c=mix(c,vec3(.03,0.,.005),lines*.8); c=mix(c,vec3(.01,0.,0.),cut*smoothstep(.1,.6,d));
 c=mix(c,vec3(.008,0.,0.),smoothstep(.62,.66,flame-p.y*.35)*step(p.y,.1)); float a=k*(1.-smoothstep(.85,1.,d)); gl_FragColor=vec4(c,a); }`;
/* lâmina de energia (aura e choque): núcleo, corpo e casca negra recortada; aP=(calor, paleta, dissolução, semente) */
const BLADE_V = `attribute vec4 aP; varying vec4 vP; varying vec2 vU; void main(){ vP=aP; vU=uv; gl_Position=projectionMatrix*viewMatrix*modelMatrix*instanceMatrix*vec4(position,1.); }`;
const BLADE_F = `${NOISE} uniform float time; varying vec4 vP; varying vec2 vU;
void main(){ float n=n2(vec2(vU.y*7.-time*8.+vP.w*13.,vU.x*2.)); float d=abs(vU.x)+(n-.5)*.4+vU.y*.15; if(d>.98||n2(vU*6.+vP.w*3.)<vP.z) discard;
 vec3 c=vP.y<.5?(d<.18*vP.x?vec3(1.,.9,.86):d<.5?vec3(.9,.03,.08):d<.78?vec3(.38,0.,.03):vec3(.02,0.,.01)):(d<.22*vP.x?vec3(1.,.98,.86):d<.48?vec3(1.,.72,.18):d<.72?vec3(1.,.32,.04):d<.86?vec3(.35,.05,.02):vec3(.03,.01,.01));
 gl_FragColor=vec4(c,1.); }`;
/* núcleo do impacto: domo de fogo em faixas, casca negra recortada na borda; erode no fim */
const CORE_F = `${NOISE} uniform float time, heat, erode; varying vec3 vN; varying vec3 vV; varying vec3 vP;
void main(){ vec3 n=normalize(vN); float f=abs(dot(n,normalize(vV))); float lat=clamp(vP.y,0.,1.), ang=atan(vP.z,vP.x); float nn=f3(vec3(ang*2.,lat*4.-time*1.3,time*.3));
 if(f3(vec3(ang*3.,lat*5.,1.))<erode) discard; float v=heat*(.25+.95*f)+(nn-.5)*.35-lat*.15; vec3 c=v>.95?vec3(1.,.98,.88):v>.75?vec3(1.,.8,.3):v>.55?vec3(1.,.42,.06):v>.38?vec3(.6,.1,.02):vec3(.05,.02,.02);
 c*=mix(.28,1.,smoothstep(.08,.26,f)); gl_FragColor=vec4(c,1.); }`;
/* anel de choque com aresta e espessura: borda interna incandescente, corpo laranja, poeira escura por fora */
const SHOCK_F = `${NOISE} uniform float time, k; varying vec3 vN; varying vec3 vV; varying vec3 vP; varying vec3 vW;
void main(){ float ang=atan(vP.z,vP.x); float r=length(vP.xz); float inner=smoothstep(1.02,.96,r); float n=n2(vec2(ang*24.,time*2.)); if(n<k*.85-.1) discard;
 float up=clamp(vP.y*8.+.5,0.,1.); vec3 c=mix(vec3(.12,.08,.07),vec3(1.,.5,.1),inner*(1.-k)); c=mix(c,vec3(1.,.95,.8),inner*up*(1.-k)*.8); gl_FragColor=vec4(c,1.); }`;
const SHADOW_F = `varying vec2 vU; uniform float k; void main(){ float d=length(vU*2.-1.); float a=k*(1.-smoothstep(.2,1.,d))*.75; if(a<.01) discard; gl_FragColor=vec4(0.,0.,0.,a); }`;
const INK_V = `attribute vec4 aColor; attribute vec2 aUv2; varying vec4 vC; varying vec2 vU; void main(){ vC=aColor; vU=aUv2; gl_Position=projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.); }`;
const INK_F = `varying vec4 vC; varying vec2 vU; void main(){ float e=abs(vU.y*2.-1.); float a=vC.a*(1.-smoothstep(.55,1.,e)); if(a<.02) discard; gl_FragColor=vec4(vC.rgb,a); }`;

/* ruído de valor em JS (só no carregamento) para esculpir a rocha */
const jh = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
const jn = (x, y, z) => { const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = x - ix, fy = y - iy, fz = z - iz, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
  const L = (a, b, t) => a + (b - a) * t; return L(L(L(jh(ix, iy, iz), jh(ix + 1, iy, iz), u), L(jh(ix, iy + 1, iz), jh(ix + 1, iy + 1, iz), u), v), L(L(jh(ix, iy, iz + 1), jh(ix + 1, iy, iz + 1), u), L(jh(ix, iy + 1, iz + 1), jh(ix + 1, iy + 1, iz + 1), u), v), w); };
function rockGeo(T, detail) {
  const g = new T.IcosahedronGeometry(1, detail), p = g.attributes.position, v = new T.Vector3(), craters = [];
  for (let i = 0; i < 9; i++) craters.push([new T.Vector3(jh(i, 1, 2) - .5, jh(i, 3, 4) - .5, jh(i, 5, 6) - .5).normalize(), .18 + .22 * jh(i, 7, 8), .06 + .08 * jh(i, 9, 1)]);
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const d = v.clone();
    let r = 1 + (jn(d.x * 1.3 + 5, d.y * 1.3, d.z * 1.3) - .5) * .75 + (jn(d.x * 3.1, d.y * 3.1 + 2, d.z * 3.1) - .5) * .26 + (jn(d.x * 7, d.y * 7, d.z * 7 + 9) - .5) * .06;
    for (const [c, rad, dep] of craters) { const a = d.angleTo(c); if (a < rad) { const k = a / rad; r -= dep * (1 - k * k) - (k > .75 ? dep * .6 * (1 - k) * 4 : 0); } }
    v.copy(d).multiplyScalar(r); v.x *= 1.25; v.y *= .82; p.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals(); return g;
}
function bladeGeo(T) { const pos = [], uv = [], idx = [], N = 9;
  for (let j = 0; j <= N; j++) { const y = j / N, w = .5 * (y < .25 ? y / .25 : (1 - y) / .75) * (j % 2 ? .6 : 1) + .01, b = y * y * .25; pos.push(-w + b, y, 0, b, y, 0, w + b, y, 0); uv.push(-1, y, 0, y, 1, y); if (j < N) { const a = j * 3, c = a + 3; idx.push(a, c, a + 1, a + 1, c, c + 1, a + 1, c + 1, a + 2, a + 2, c + 1, c + 2); } }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); return g; }

export function createExtinctionVFX(T, kit) {
  const { root, glow, rib, decals, shard, plate, ring, ground } = kit; const geos = [], mats = [], uTime = { value: 0 };
  const up = new T.Vector3(0, 1, 0), A = new T.Vector3(), B = new T.Vector3(), C = new T.Vector3(), D = new T.Vector3(), E = new T.Vector3(), Fv = new T.Vector3(), V = new T.Vector3(), Q = new T.Quaternion(), M = new T.Matrix4(), S = new T.Vector3(), X = new T.Vector3(), Z = new T.Vector3();
  const cam = new T.Vector3(), EU = new T.Euler(); let time = 0, low = false, shot = null, tint = 0, tintHex = 0x9a0618, info = null;
  const sm = (vs, fs, u, o = {}) => { const m = new T.ShaderMaterial({ vertexShader: vs, fragmentShader: fs, uniforms: { time: uTime, ...u }, toneMapped: false, fog: false, ...o }); mats.push(m); return m; };
  const add = (parent, geo, mat, ro = 0) => { geos.push(geo); const o = new T.Mesh(geo, mat); o.frustumCulled = false; o.renderOrder = ro; parent.add(o); return o; };
  const ADD = { transparent: true, depthWrite: false, blending: T.AdditiveBlending };
  /* ---------- cena orbital isolada ---------- */
  const oScene = new T.Scene(), oCam = new T.PerspectiveCamera(42, 1, 5, 90000); oScene.background = new T.Color(0x000004);
  /* composição orbital (estilo da referência 2): câmera alta sobre o lado NOTURNO, Terra na metade de baixo com o limbo
     cortando o meio da tela, o sol escondido logo atrás do limbo acendendo uma lâmina de dia e o horizonte azul */
  const R = 1000, AX = new T.Vector3(.35, .55, .75).normalize(), TX = new T.Vector3().crossVectors(AX, new T.Vector3(0, 1, 0)).normalize(), BX = new T.Vector3().crossVectors(AX, TX).normalize();
  const PD = R * 2.3, RHO = Math.asin(R / PD), PHI = Math.acos(R / PD), dirAt = (a, out) => out.copy(AX).multiplyScalar(-Math.cos(a)).addScaledVector(TX, Math.sin(a)).normalize();
  const SUN = dirAt(RHO - .05, new T.Vector3()), sunU = { value: SUN };
  add(oScene, new T.SphereGeometry(60000, 32, 16), sm(W_V, SKY_F, {}, { side: T.BackSide, depthWrite: false }), -5);
  { const n = 3200, pos = new Float32Array(n * 3), col = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const a = hash(i) * 6.283, b = Math.acos(2 * hash(i + 99) - 1), r = 50000, k = .35 + .65 * hash(i + 7) ** 3, t = hash(i + 3);
      pos.set([Math.sin(b) * Math.cos(a) * r, Math.cos(b) * r, Math.sin(b) * Math.sin(a) * r], i * 3); col.set([k * (.8 + .2 * t), k * (.85 + .1 * t), k], i * 3); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('color', new T.BufferAttribute(col, 3)); geos.push(g);
    const m = new T.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, toneMapped: false, fog: false }); mats.push(m); const pts = new T.Points(g, m); pts.frustumCulled = false; pts.renderOrder = -4; oScene.add(pts); }
  const earth = add(oScene, new T.SphereGeometry(R, 160, 110), sm(W_V, EARTH_F, { sunDir: sunU }));
  const clouds = add(oScene, new T.SphereGeometry(R * 1.008, 128, 80), sm(W_V, CLOUD_F, { sunDir: sunU }, { transparent: true, depthWrite: false }), 1);
  add(oScene, new T.SphereGeometry(R * 1.045, 96, 64), sm(W_V, ATMO_F, { sunDir: sunU }, { ...ADD, side: T.BackSide }), 2);
  const flareM = sm(`varying vec2 vU; void main(){ vU=uv; vec4 c=modelViewMatrix*vec4(0.,0.,0.,1.); c.xy+=position.xy*vec2(length(modelMatrix[0].xyz),length(modelMatrix[1].xyz)); gl_Position=projectionMatrix*c; }`, FLARE_F, { k: { value: 1 } }, ADD);
  const flare = add(oScene, new T.PlaneGeometry(1, 1), flareM, 6);
  /* ---------- meteoro (um construtor, duas instâncias: espaço e arena) ---------- */
  const rockG = rockGeo(T, 5), envG = new T.SphereGeometry(1, 48, 32); geos.push(rockG, envG);
  function mkMeteor(parent, arena) {
    const g = new T.Group(); parent.add(g); const vel = { value: new T.Vector3(0, -1, 0) }, key = { value: SUN.clone() }, heat = { value: 1 };
    const rock = new T.Mesh(rockG, sm(W_V, ROCK_F, { vel, key, heat })); rock.frustumCulled = false; g.add(rock);
    const env = (layer, c1, c2, len, sc, blend) => { const u = { vel, len: { value: len }, heat: { value: 1 }, wob: { value: .25 }, layer: { value: layer }, c1: { value: new T.Color(...c1) }, c2: { value: new T.Color(...c2) } };
      const m = sm(ENV_V, ENV_F, u, blend ? { transparent: true, depthWrite: false, side: T.DoubleSide } : { ...ADD, side: T.DoubleSide }); const o = new T.Mesh(envG, m); o.scale.setScalar(sc); o.frustumCulled = false; o.renderOrder = 4 + layer; g.add(o); return o; };
    const sheath = env(0, [1, .97, .82], [1, .45, .08], 2.2, 1.16), tail = env(1, [1, .62, .18], [.85, .12, .03], 7, 1.45), smoke = env(2, [.3, .27, .26], [.12, .1, .1], 16, 1.7, true);
    if (arena) { smoke.visible = false; sheath.scale.setScalar(1.1); } // na arena a cauda de fumaça cruzaria o céu inteiro sobre a câmera: só plasma e cauda quente
    const frags = new T.InstancedMesh(rockG, rock.material, 26); frags.frustumCulled = false; frags.count = 0; parent.add(frags);
    return { g, rock, sheath, tail, smoke, frags, vel, heat,
      set(p, dir, r, h, show = true) { g.visible = show; frags.visible = show; if (!show) return; g.position.copy(p); g.scale.setScalar(r); vel.value.copy(dir); heat.value = h; g.rotation.set(time * .21, time * .37, time * .13);
        for (const o of [sheath, tail, smoke]) o.material.uniforms.heat.value = h; sheath.material.uniforms.len.value = 1.6 + 1.6 * h; tail.material.uniforms.len.value = 5 + 7 * h; smoke.material.uniforms.len.value = 10 + 12 * h;
        const n = low ? 10 : 26; frags.count = n; for (let i = 0; i < n; i++) { const u = (time * (.9 + hash(i) * .5) + hash(i + 3)) % 1, s = r * (.04 + .08 * hash(i + 5)) * (1 - u * .6);
          A.copy(dir).multiplyScalar(-r * (1.2 + 9 * u)); X.set(hash(i + 7) - .5, hash(i + 9) - .5, hash(i + 11) - .5).multiplyScalar(r * 1.6 * (.4 + u)); A.add(X).add(p); Q.setFromEuler(EU.set(i + time * 3, i * 2, time)); S.setScalar(s); M.compose(A, Q, S); frags.setMatrixAt(i, M); }
        frags.instanceMatrix.needsUpdate = true; } };
  }
  const mSpace = mkMeteor(oScene), mArena = mkMeteor(root, true); mArena.set(null, up, 1, 0, false);
  const beaconM = sm(`varying vec2 vU; void main(){ vU=uv; vec4 c=modelViewMatrix*vec4(0.,0.,0.,1.); c.xy+=position.xy*vec2(length(modelMatrix[0].xyz),length(modelMatrix[1].xyz)); gl_Position=projectionMatrix*c; }`, FLARE_F.replace('mix(vec3(.35,.6,1.),vec3(1.,.98,.95)','mix(vec3(1.,.5,.12),vec3(1.,.96,.8)'), { k: { value: 1 } }, ADD);
  const beacon = add(oScene, new T.PlaneGeometry(1, 1), beaconM, 7); // o ponto quente que surge longe e cresce
  /* ---------- arena: aura, X, sombra, núcleo, anel, lâminas, fissuras ---------- */
  const auraM = sm(`varying vec2 vU; void main(){ vU=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`, AURA_F, { k: { value: 0 } }, { transparent: true, depthWrite: false });
  const aura = add(root, new T.PlaneGeometry(1, 1), auraM, -2); aura.visible = false;
  const blades = new T.InstancedMesh(bladeGeo(T), sm(BLADE_V, BLADE_F, {}, { side: T.DoubleSide }), 140); geos.push(blades.geometry); const bP = new Float32Array(140 * 4); blades.geometry.setAttribute('aP', new T.InstancedBufferAttribute(bP, 4).setUsage(T.DynamicDrawUsage)); blades.frustumCulled = false; blades.count = 0; root.add(blades); let bn = 0;
  const blade = (px, py, pz, dx, dy, dz, L, W, core, pal, dis, seed) => { if (bn >= 140 || L < .05 || dis >= 1) return; D.set(dx, dy, dz).normalize(); E.set(cam.x - px, cam.y - py, cam.z - pz); X.crossVectors(D, E).normalize(); Z.crossVectors(X, D); M.makeBasis(X, D, Z); Q.setFromRotationMatrix(M); A.set(px, py, pz); S.set(W, L, W); M.compose(A, Q, S); blades.setMatrixAt(bn, M); bP.set([core, pal, dis, seed], bn * 4); bn++; };
  const shadow = add(root, new T.PlaneGeometry(2, 2).rotateX(-Math.PI / 2), sm(`varying vec2 vU; void main(){ vU=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`, SHADOW_F, { k: { value: 0 } }, { transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 }), 1); shadow.visible = false;
  const coreG = new T.SphereGeometry(1, 64, 24, 0, Math.PI * 2, 0, Math.PI / 2); const CORE_V = `${NOISE} uniform float time; varying vec3 vN; varying vec3 vV; varying vec3 vP; varying vec3 vW; void main(){ vP=position; float a=atan(position.z,position.x); float d=1.+.16*(f3(vec3(a*2.,position.y*3.-time*.8,time*.25))-.5)+.08*sin(a*9.+position.y*6.)*position.y; vec4 w=modelMatrix*vec4(position*vec3(d,d*(1.+.1*position.y),d),1.); vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal); vV=cameraPosition-w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
  const core = add(root, coreG, sm(CORE_V, CORE_F, { heat: { value: 1 }, erode: { value: 0 } }, { side: T.DoubleSide })); core.visible = false;
  const shockG = new T.TorusGeometry(1, .045, 10, 96); shockG.rotateX(Math.PI / 2); shockG.scale(1, 3.2, 1); const shock = add(root, shockG, sm(W_V, SHOCK_F, { k: { value: 0 } }, { side: T.DoubleSide })); shock.visible = false;
  const inkPos = new Float32Array(600 * 12), inkCol = new Float32Array(600 * 16), inkUv = new Float32Array(600 * 8), inkIdx = new Uint32Array(600 * 6); for (let i = 0; i < 600; i++) inkIdx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 2, i * 4 + 1, i * 4 + 3], i * 6);
  const inkG = new T.BufferGeometry(); inkG.setAttribute('position', new T.BufferAttribute(inkPos, 3).setUsage(T.DynamicDrawUsage)); inkG.setAttribute('aColor', new T.BufferAttribute(inkCol, 4).setUsage(T.DynamicDrawUsage)); inkG.setAttribute('aUv2', new T.BufferAttribute(inkUv, 2)); inkG.setIndex(new T.BufferAttribute(inkIdx, 1));
  for (let i = 0; i < 600; i++) inkUv.set([0, 0, 0, 1, 1, 0, 1, 1], i * 8);
  const ink = add(root, inkG, sm(INK_V, INK_F, {}, { transparent: true, depthWrite: false, side: T.DoubleSide }), 3); let iq = 0;
  const inkSeg = (ax, ay, az, bx, by, bz, w, c) => { if (iq >= 600) return; D.set(bx - ax, 0, bz - az); const l = Math.hypot(D.x, D.z) || 1; const px = -D.z / l * w, pz = D.x / l * w, o = iq * 12;
    inkPos.set([ax - px, ay, az - pz, ax + px, ay, az + pz, bx - px, by, bz - pz, bx + px, by, bz + pz], o); for (let k = 0; k < 4; k++) inkCol.set(c, iq * 16 + k * 4); iq++; };
  const crack = (seed, ax, az, bx, bz, w, heat, a) => { const L = Math.hypot(bx - ax, bz - az); if (L < .3) return; const n = Math.max(2, Math.round(L / 1.6)), px = -(bz - az) / L, pz = (bx - ax) / L; let ox = ax, oz = az, oy = ground(ax, az) + .06;
    for (let i = 1; i <= n; i++) { const u = i / n, j = i === n ? 0 : (hash(seed + i * 3.1) - .5) * w * 2.2, x = ax + (bx - ax) * u + px * j, z = az + (bz - az) * u + pz * j, y = ground(x, z) + .06;
      inkSeg(ox, oy, oz, x, y, z, w, [.02, .01, .01, a]); if (heat > .01) rib.seg(ox, oy + .03, oz, x, y + .03, z, w * .35, w * .3, [1, .4 + .3 * heat, .08, heat * a], [1, .55, .12, heat * a]); ox = x; oy = y; oz = z; } };
  const c4 = (c, a) => [c[0], c[1], c[2], a];

  /* ---------- caminhos e tomadas ---------- */
  const SITE = AX.clone().multiplyScalar(Math.cos(.8)).addScaledVector(TX, Math.sin(.8)).addScaledVector(BX, .12).normalize(); // ponto da arena (no disco visível)
  const pathStart = AX.clone().multiplyScalar(PD).addScaledVector(dirAt(RHO, new T.Vector3()).addScaledVector(AX, .2).addScaledVector(BX, .3).normalize(), R * 6), pathEnd = SITE.clone().multiplyScalar(R);
  const meteorAt = (k, out) => out.copy(pathStart).lerp(pathEnd, k); // k 0..1 sobre orbit+entry inteiros (mesma linha do tempo)
  const VDIR = pathEnd.clone().sub(pathStart).normalize(), LOOK0 = dirAt(RHO, new T.Vector3()), CAM0 = AX.clone().multiplyScalar(PD);
  const LIMB = AX.clone().multiplyScalar(Math.cos(PHI)).addScaledVector(TX, Math.sin(PHI)).multiplyScalar(R * 1.004);
  function spaceShot(s, T0) {
    const ph = s.phase, tAll = ph === 'orbit' ? s.t : T0.orbit + s.t, total = T0.orbit + T0.entry, kk = tAll / total, k = kk < .4 ? .05 * (kk / .4) ** 2 : .05 + .95 * smooth((kk - .4) / .6) ** 1.3;
    meteorAt(k, C); const r = 16, alt = C.length() - R, heat = .5 + .5 * smooth(1 - alt / (R * 1.4)); mSpace.set(C, VDIR, r, heat);
    X.crossVectors(VDIR, AX).normalize(); Z.crossVectors(X, VDIR).normalize(); // eixos do caminho
    const pos = new T.Vector3(), look = new T.Vector3(), upv = new T.Vector3().copy(AX); let fov = 46;
    if (ph === 'orbit') { // SHOT 2/3: revelação da Terra (dolly lento) e o ponto quente que surge longe e cresce
      const u = s.t / T0.orbit; pos.copy(CAM0).multiplyScalar(1 - .04 * u).addScaledVector(BX, R * .06 * u); look.copy(pos).addScaledVector(LOOK0, R); fov = 46 - 3 * u;
    } else { const u = s.t / T0.entry, sub = Math.min(4, Math.floor(u * 5)), w = u * 5 - sub; // SHOT 4: montagem guiada pelo mesmo caminho
      if (sub === 0) { pos.copy(C).addScaledVector(X, r * 7).addScaledVector(VDIR, -r * 9 + r * 3 * w).addScaledVector(Z, r * 2.5); look.copy(C).addScaledVector(VDIR, r * 3); fov = 44; upv.copy(Z); }
      else if (sub === 1) { pos.copy(C).addScaledVector(X, r * 2.1).addScaledVector(VDIR, r * (1.2 - .7 * w)).addScaledVector(Z, r * .6); look.copy(C).addScaledVector(VDIR, -r * .3); fov = 50; upv.copy(Z); }
      else if (sub === 2) { pos.copy(CAM0).multiplyScalar(.8).addScaledVector(BX, R * .35); look.copy(pathEnd).lerp(C, .45); fov = 44; }
      else if (sub === 3) { meteorAt(.9, V); pos.copy(V).normalize().multiplyScalar(R).addScaledVector(BX, R * .1).addScaledVector(TX, -R * .06).normalize().multiplyScalar(R * 1.025); upv.copy(pos).normalize(); E.copy(C).sub(pos); E.addScaledVector(upv, -E.dot(upv)).normalize(); look.copy(pos).addScaledVector(E, R * .6).lerp(C, .45); fov = 54; }
      else { pos.copy(pathEnd).addScaledVector(BX, R * .05).addScaledVector(TX, -R * .06).normalize().multiplyScalar(R * 1.006); upv.copy(pos).normalize(); E.copy(C).sub(pos); E.addScaledVector(upv, -E.dot(upv)).normalize(); look.copy(pos).addScaledVector(E, R * .3).lerp(C, .7); fov = 64 - 8 * w; }
    }
    flare.position.copy(LIMB); const fd = pos.distanceTo(LIMB); flare.scale.set(fd * .55, fd * .55, 1); flareM.uniforms.k.value = ph === 'orbit' ? .7 + .3 * smooth(s.t / 1.2) : .8;
    { const bd = pos.distanceTo(C); beacon.position.copy(C).addScaledVector(VDIR, r * .6); const bs = Math.max(r * 5, bd * .05) * (ph === 'orbit' ? .6 + 1.1 * smooth((s.t / T0.orbit - .4) / .6) : .9); beacon.scale.set(bs, bs, 1); beaconM.uniforms.k.value = ph === 'orbit' ? smooth((s.t / T0.orbit - .35) / .3) : 1 - .75 * smooth((r * 40 - bd) / (r * 25)); }
    clouds.rotation.y = time * .003; oCam.position.copy(pos); oCam.up.copy(upv); oCam.lookAt(look); oCam.fov = fov; oCam.updateProjectionMatrix();
    return { space: true };
  }
  /** direção de chegada do meteoro na arena: de trás do bispo (visto do herói), descendo; mesma em arrival/choice/impact */
  function arenaGeom(s, target) { const hx = target ? target.x : s.x + 8, hz = target ? target.z : s.z + 8, tx = s.x - hx, tz = s.z - hz, l = Math.hypot(tx, tz) || 1;
    return { hx, hz, fx: tx / l, fz: tz / l, ex: s.x, ez: s.z, ey: ground(s.x, s.z) }; }
  function drawArena(s, T0, target, boss, head) {
    const ph = s.phase, G = arenaGeom(s, target), Rm = 30; D.set(-G.fx * .85 - G.fz * .25, -.62, -G.fz * .85 + G.fx * .25).normalize(); // velocidade do meteoro (desce rumo ao epicentro)
    let dist = 0; if (ph === 'arrival') dist = 640 - 300 * smooth(s.t / T0.arrival); else if (ph === 'choice') { const u = s.t / T0.choice; dist = 340 - 320 * u ** 1.5; } // sempre dentro do far da câmera do jogo (760 m) else if (ph === 'impact') dist = Math.max(0, 50 * (1 - s.t / .12));
    const show = ph === 'arrival' || ph === 'choice' || (ph === 'impact' && s.t < .14);
    if (show) { C.set(G.ex, G.ey, G.ez).addScaledVector(D, -dist - Rm * .9); mArena.set(C, D, Rm, ph === 'arrival' ? .85 : 1); } else mArena.set(null, D, 1, 0, false);
    const near = ph === 'arrival' ? .25 * smooth(s.t / T0.arrival) : ph === 'choice' ? .25 + .75 * smooth(s.t / T0.choice) : ph === 'impact' ? 1 - smooth(s.t / 1.2) : 0;
    tint = Math.max(tint, near * .85); tintHex = 0xff6a1a;
    if (ph === 'arrival' || ph === 'choice') { shadow.visible = true; shadow.position.set(G.ex, G.ey + .08, G.ez); const sr = 30 + 40 * near; shadow.scale.set(sr, 1, sr); shadow.material.uniforms.k.value = near;
      for (let i = 0; i < (low ? 10 : 26); i++) { const a = hash(i) * 6.283, u = (time * (.6 + hash(i + 1)) + hash(i + 2)) % 1, rr = 4 + 30 * u; glow.add(G.ex + Math.cos(a) * rr, G.ey + .3 + u * 3 * near, G.ez + Math.sin(a) * rr, .1, .5, 1, .55, .2, near * (1 - u), 3, a, i); } // brasas/vento empurrados
      for (let i = 0; i < (low ? 4 : 12); i++) { const a = hash(i + 40) * 6.283, u = (time * .5 + hash(i + 41)) % 1, rr = 6 + 22 * hash(i + 42); shard(G.ex + Math.cos(a) * rr, G.ey + .2 + u * 2.5 * near, G.ez + Math.sin(a) * rr, .08 + .25 * hash(i + 43), u * 7, i, a); } }
    // câmeras da arena
    if (ph === 'arrival') { const u = s.t / T0.arrival; A.set(G.hx - G.fx * (3 + 2 * u) - G.fz * 7, ground(G.hx, G.hz) + 3.2 + 1.5 * u, G.hz - G.fz * (3 + 2 * u) + G.fx * 7); /* ao lado do herói, na área aberta da luta (longe de copas e telhados) */ B.copy(C).lerp(V.set(G.ex, G.ey + 2, G.ez), .5); shot = { pos: A.toArray(), look: B.toArray(), fov: 64, blend: 1 }; }
    else if (ph === 'choice') { const u = s.t / T0.choice, hy = ground(G.hx, G.hz); A.set(G.hx - G.fx * .95 + G.fz * .38, hy + 1.72, G.hz - G.fz * .95 - G.fx * .38); B.copy(C).lerp(V.set(G.ex, G.ey + 3, G.ez), .38 + .22 * u);
      shot = { pos: A.toArray(), look: B.toArray(), fov: 66 + 8 * u, blend: smooth(s.t / .25) }; }
    else if (ph === 'impact' || ph === 'after') { const it = ph === 'impact' ? s.t : T0.impact + s.t, back = smooth((it - 1.35) / 1.1), hy = ground(G.hx, G.hz);
      A.set(G.hx - G.fx * 24 - G.fz * 8, hy + 21, G.hz - G.fz * 24 + G.fx * 8); /* alto e afastado: fora do domo e acima das copas */ B.set(G.ex, G.ey + 5, G.ez); shot = { pos: A.toArray(), look: B.toArray(), fov: 66, blend: (1 - back) * smooth(it / .05) }; if (shot.blend < .01) shot = null; }
    // SHOT 7: impacto com massa (todos os secundários irradiam do epicentro)
    if (ph === 'impact' || ph === 'after') { const it = ph === 'impact' ? s.t : T0.impact + s.t, cx = G.ex, cz = G.ez, cy = G.ey, er = smooth((it - .95) / 1.9), duel = s.result === 'duel';
      groundNormal(ground, cx, cz, nrm3);
      if (it < .25) glow.add(cx, cy + 8, cz, 90 * (1 - it * 2), 70 * (1 - it * 2), 1, .9, .7, (1 - it / .25), 0);
      if (!duel && er < .995) { const Rc = (8 + 14 * easeOut(Math.min(1, it / .35))) * (1 - .25 * er); core.visible = true; core.position.set(cx, cy - .3, cz); core.scale.set(Rc, Rc * (.8 + .4 * smooth(it / .6)), Rc); core.material.uniforms.heat.value = 1.05 - .7 * smooth((it - .3) / 1.6); core.material.uniforms.erode.value = er; }
      const sk = Math.min(1, it / 1.3); if (sk < 1) { shock.visible = true; const sr = 6 + 70 * easeOut(sk); shock.position.set(cx, cy + .2, cz); shock.scale.set(sr, 1.8 * (1 - sk) + .4, sr); shock.material.uniforms.k.value = sk; decals.add(cx, cy, cz, sr * 1.05, 1, .5, .15, (1 - sk) * .9, 0, sk, s.id + 3, nrm3); }
      for (let i = 0; i < 3; i++) { const k = (it - .05 - i * .12) / 1.1; if (k > 0 && k < 1) ring(cx, cy + .6 + i * 2.5, cz, 10 + 60 * easeOut(k), (1 - k) * 5 + 1); }
      const Rb = (8 + 14 * easeOut(Math.min(1, it / .35))) * .85; for (let i = 0; i < (low ? 12 : 34); i++) { const k = it - hash(i + 60) * .3; if (k <= 0) continue; const a = hash(i + 61) * 6.283, el = .2 + hash(i + 62) * 1.1, g = easeOut(Math.min(1, k / .3)), L = (12 + 20 * hash(i + 63)) * g; // lâminas de fogo direcionais saindo da casca
        blade(cx + Math.cos(a) * Math.cos(el) * Rb, cy + .3 + Math.sin(el) * Rb * .9, cz + Math.sin(a) * Math.cos(el) * Rb, Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el), L, 3 + 3 * hash(i + 64), 1, 1, smooth((k - .9 - hash(i + 65) * .5) / .7), hash(i + 66)); }
      const cool = 1 - smooth((it - 1) / 3.2); for (let i = 0; i < (low ? 8 : 16); i++) { const a = i / 16 * 6.283 + hash(i + 70) * .3, L = (16 + 22 * hash(i + 71)) * easeOut(Math.min(1, it / .5)); crack(s.id * 7 + i * 31, cx + Math.cos(a) * 3, cz + Math.sin(a) * 3, cx + Math.cos(a) * L, cz + Math.sin(a) * L, .5 + .4 * hash(i + 72), cool, .95 * (1 - er * .6)); }
      for (let i = 0; i < (low ? 10 : 24); i++) { const an = hash(i + 80) * 6.283, u = easeOut(Math.min(1, it / .45)), r = 8 + 20 * hash(i + 81) * u; plate(cx + Math.cos(an) * r, cy - .3 + (1 - er) * (.6 + Math.sin(Math.min(1, it / .45) * 3.14) * 2.5), cz + Math.sin(an) * r, (1.2 + 1.4 * hash(i + 82)) * (1 - er * .5), (hash(i + 83) - .5) * 1.4, an, .4 + hash(i + 84) * .7); }
      for (let i = 0; i < (low ? 10 : 30); i++) { const a = hash(i + 90) * 6.283, v = 12 + 18 * hash(i + 91), vy = 10 + 16 * hash(i + 92), k = it, y = vy * k - 4.9 * k * k; if (y < 0) continue; const x = cx + Math.cos(a) * v * k, z = cz + Math.sin(a) * v * k; shard(x, cy + 1 + y, z, .35 + .7 * hash(i + 93), k * 5 + i, k * 3, i, 1.2); if (!low && k < 1.4) glow.add(x, cy + 1 + y, z, 1.4, 1.4, 1, .45, .1, .8 * (1 - k / 1.4), 0); }
      decals.add(cx, cy, cz, 34, 1, .25, .05, .9 * cool, 1, Math.min(1, it), s.id + 5, nrm3); decals.add(cx, cy, cz, 20, 1, .45, .08, .85 * cool, 2, 0, s.id + 6, nrm3);
      if (duel && it < 1.2) for (let i = 0; i < (low ? 10 : 30); i++) { const a = hash(i) * 6.283, b = hash(i * 3), d = 80 * easeOut(it); glow.add(cx + Math.cos(a) * d, cy + 140 + b * 70, cz + Math.sin(a) * d, 8, 8, 1, .7, .9, 1 - it / 1.2, 2, a, i); } // duelo: o meteoro se parte no alto
    }
  }
  const nrm3 = [0, 1, 0];
  function drawAwaken(s, T0, boss, head) { // SHOT 1: close do tirano em silhueta contra a aura; X de luz no rosto
    const u = s.t / T0.awaken, e = smooth(u), fy = Math.sin(boss.yaw), fz = Math.cos(boss.yaw), rx = fz, rz = -fy, hp = head ? head.p : V.set(boss.x, boss.y + 2.05, boss.z), hh = head ? head.h : 2.05;
    tint = Math.max(tint, .9 * smooth(u / .3)); tintHex = 0x5a0008;
    // aura atrás do bispo, de frente para a câmera
    aura.visible = true; E.set(cam.x - boss.x, 0, cam.z - boss.z).normalize(); aura.position.set(boss.x - E.x * 3, boss.y + hh * .62, boss.z - E.z * 3); aura.lookAt(cam.x, aura.position.y, cam.z); aura.scale.set(9 + 2 * e, 9.5 + 2 * e, 1); auraM.uniforms.k.value = smooth(u / .25);
    const ex0 = E.x, ez0 = E.z; for (let i = 0; i < (low ? 6 : 14); i++) { const sd = (hash(i + 1) - .5) * 2, bx = boss.x - ex0 * (.7 + hash(i + 2) * 1.2) - ez0 * sd * 1.6, bz = boss.z - ez0 * (.7 + hash(i + 2) * 1.2) + ex0 * sd * 1.6, fl = .7 + .3 * Math.sin(time * 9 + i * 1.7), L = (1.2 + 2.4 * hash(i + 3)) * fl * smooth(u / .4); // lâminas carmim/negras subindo ATRÁS da silhueta
      blade(bx, boss.y + .05, bz, -ez0 * sd * .35, 1, ex0 * sd * .35, L, .35 + .35 * hash(i + 4), .8, 0, 0, hash(i + 5)); }
    // X de luz rubra: duas diagonais finas + núcleo + halo, presas ao osso da cabeça
    const k = smooth((u - .2) / .3); if (k > .01) { const hu = head ? head.up : up, ex = hp.x + hu.x * .085 + fy * .13, ey = hp.y + hu.y * .085 + .0, ez = hp.z + hu.z * .085 + fz * .13, s0 = .085 * k, a = .95 * k;
      rib.seg(ex - rx * s0, ey + s0, ez - rz * s0, ex + rx * s0, ey - s0, ez + rz * s0, .012, .012, [1, .05, .08, a], [1, .05, .08, a]); rib.seg(ex - rx * s0, ey - s0, ez - rz * s0, ex + rx * s0, ey + s0, ez + rz * s0, .012, .012, [1, .05, .08, a], [1, .05, .08, a]);
      rib.seg(ex - rx * s0 * .55, ey + s0 * .55, ez - rz * s0 * .55, ex + rx * s0 * .55, ey - s0 * .55, ez + rz * s0 * .55, .005, .005, [1, .9, .9, a], [1, .9, .9, a]); rib.seg(ex - rx * s0 * .55, ey - s0 * .55, ez - rz * s0 * .55, ex + rx * s0 * .55, ey + s0 * .55, ez + rz * s0 * .55, .005, .005, [1, .9, .9, a], [1, .9, .9, a]);
      glow.add(ex, ey, ez, .32 * k, .32 * k, 1, .05, .08, .9 * k, 0); glow.add(ex, ey, ez, .9 * k, .22 * k, 1, .02, .05, .45 * k, 0); }
    // câmera: close baixo e frontal aproximando do rosto e da lâmina
    A.set(boss.x + fy * (4 - 2.1 * e) + rx * .7 * (1 - e), boss.y + .35 + hh * .35 * e, boss.z + fz * (4 - 2.1 * e) + rz * .7 * (1 - e)); B.set(hp.x, hp.y - .25 + .2 * e, hp.z);
    shot = { pos: A.toArray(), look: B.toArray(), fov: 42 - 10 * e, blend: 1 };
  }
  return {
    oScene, oCam, meteor: mArena.g,
    get shot() { return shot; }, get tint() { return tint; }, get tintHex() { return tintHex; }, get info() { return info; },
    begin(camera, t, q) { time = t; uTime.value = t; low = q === 0; cam.copy(camera.position); shot = null; tint = 0; info = null; aura.visible = shadow.visible = core.visible = shock.visible = false; bn = 0; iq = 0; mArena.set(null, up, 1, 0, false); },
    draw(s, boss, target, head) { const T0 = s.T, ph = s.phase; info = { phase: ph, t: s.t, s };
      if (ph === 'awaken' && boss) drawAwaken(s, T0, boss, head);
      else if (ph === 'orbit' || ph === 'entry') shot = spaceShot(s, T0);
      else drawArena(s, T0, target, boss, head); },
    end() { blades.count = bn; blades.instanceMatrix.needsUpdate = true; blades.geometry.attributes.aP.needsUpdate = true; inkG.setDrawRange(0, iq * 6); inkG.attributes.position.needsUpdate = inkG.attributes.aColor.needsUpdate = true; },
    clear() { shot = null; tint = 0; info = null; aura.visible = shadow.visible = core.visible = shock.visible = false; blades.count = 0; inkG.setDrawRange(0, 0); mArena.set(null, up, 1, 0, false); },
    dispose() { for (const g of geos) g.dispose(); for (const m of mats) m.dispose(); }
  };
}
