/**
 * BISPO 4 (VÉRAXION) — VFX da Skill 2 "QUATRO VÓRTICES DO JUÍZO AZUL" (relógio e eventos: veraxion-blue-cyclone3d.js).
 * Módulo isolado da Skill 1: nenhum material/uniform da Skill 1 é tocado.
 *
 *  aura      línguas ciano presas aos ossos + casca azul/violeta no corpo (skinning)
 *  mandala   CanvasTexture autoral: R = traço, G/R = ordem do traço → o círculo é DESENHADO traço a traço por shader
 *            (contorno → runas → filigranas → flor central); quatro selos satélites com textura própria
 *  tornado   corpo torcido (raio por altura: base larga, cintura fina, topo alargado e rasgado, eixo em S) + lâminas
 *            helicoidais brilhantes + redemoinho de chão; destroços instanciados e faíscas; o MESMO corpo vira o mega
 *  fogo      chamas azuis em quads cruzados instanciados (nascimento/vida por instância, 4 s)
 *  final     sucção de fora para dentro → pausa → explosão em lóbulos ciano-brancos com veios, anel largo e ondas
 */
export const VERAXION_CYCLONE_VFX_BUILD = '286-quatro-vortices-vfx';
const clamp01 = x => Math.max(0, Math.min(1, x)), sm = x => { x = clamp01(x); return x * x * (3 - 2 * x); };
const R3 = i => { const s = Math.sin(i * 12.9898 + 4.1) * 43758.5453; return s - Math.floor(s); };
const NOISE = `float h1(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h1(i),h1(i+vec2(1,0)),f.x),mix(h1(i+vec2(0,1)),h1(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*n2(p);p*=2.03;a*=.5;}return s;}`;
const N3 = `float hs(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float n3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hs(i),hs(i+vec3(1,0,0)),f.x),mix(hs(i+vec3(0,1,0)),hs(i+vec3(1,1,0)),f.x),f.y),mix(mix(hs(i+vec3(0,0,1)),hs(i+vec3(1,0,1)),f.x),mix(hs(i+vec3(0,1,1)),hs(i+vec3(1,1,1)),f.x),f.y),f.z);}`;

/* ---------- mandala: desenho procedural (CanvasTexture) ---------- */
function drawMandala(T, size, kind) {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'), S = size / 2, CX = S, CY = S;
  g.fillStyle = '#000'; g.fillRect(0, 0, size, size); g.lineCap = 'round'; g.lineJoin = 'round';
  let ord = 0, B = 1, WM = 1; const col = () => `rgb(${Math.round(255 * B)},${Math.round(clamp01(ord) * 255 * B)},0)`; /* G/R = ordem do traço; R = brilho */
  const glow = w => { g.shadowColor = col(); g.shadowBlur = w * size / 1024; };
  const circle = (r, w, o) => { ord = o; g.strokeStyle = col(); glow(10); g.lineWidth = w * WM * size / 1024; g.beginPath(); g.arc(CX, CY, r * S, 0, 6.2832); g.stroke(); };
  const arcSeg = (r, a0, a1, w, o0, o1, n = 24) => { for (let k = 0; k < n; k++) { ord = o0 + (o1 - o0) * k / n; g.strokeStyle = col(); glow(8); g.lineWidth = w * WM * size / 1024; g.beginPath(); g.arc(CX, CY, r * S, a0 + (a1 - a0) * k / n, a0 + (a1 - a0) * (k + 1) / n + .002); g.stroke(); } };
  const P = (r, a) => [CX + Math.cos(a) * r * S, CY + Math.sin(a) * r * S];
  const glyph = (r, a, h, o, seed) => { ord = o; g.strokeStyle = col(); glow(5); g.lineWidth = 1.7 * WM * size / 1024; const [x, y] = P(r, a); g.save(); g.translate(x, y); g.rotate(a + Math.PI / 2); const s = h * S; g.beginPath();
    const k = Math.floor(R3(seed) * 6); /* glifos autorais: hastes, ganchos, losangos e arcos */
    if (k === 0) { g.moveTo(0, -s / 2); g.lineTo(0, s / 2); g.moveTo(-s * .3, -s * .1); g.lineTo(s * .3, -s * .3); }
    else if (k === 1) { g.moveTo(-s * .3, s / 2); g.lineTo(0, -s / 2); g.lineTo(s * .3, s / 2); g.moveTo(-s * .2, s * .1); g.lineTo(s * .2, s * .1); }
    else if (k === 2) { g.arc(0, 0, s * .32, .4, 5.6); g.moveTo(0, -s / 2); g.lineTo(0, s / 2); }
    else if (k === 3) { g.moveTo(0, -s / 2); g.lineTo(s * .3, 0); g.lineTo(0, s / 2); g.lineTo(-s * .3, 0); g.closePath(); }
    else if (k === 4) { g.moveTo(-s * .3, -s / 2); g.quadraticCurveTo(s * .5, 0, -s * .3, s / 2); g.moveTo(s * .25, -s * .4); g.lineTo(s * .25, s * .4); }
    else { g.moveTo(-s * .3, -s * .4); g.lineTo(s * .3, -s * .4); g.moveTo(0, -s * .4); g.lineTo(0, s * .5); g.moveTo(-s * .25, s * .2); g.lineTo(s * .25, s * .45); }
    g.stroke(); g.restore(); };
  const petal = (r0, r1, a, wAng, o, w = 2.4) => { ord = o; g.strokeStyle = col(); glow(9); g.lineWidth = w * WM * size / 1024; const [x0, y0] = P(r0, a), [x1, y1] = P(r1, a), [cl, cl2] = P((r0 + r1) / 2, a - wAng), [cr, cr2] = P((r0 + r1) / 2, a + wAng);
    g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(cl, cl2, x1, y1); g.quadraticCurveTo(cr, cr2, x0, y0); g.stroke(); };
  const fpetal = (r0, r1, a, wAng, o, b = .35) => { const ob = B; B = b; ord = o; g.fillStyle = col(); g.shadowColor = col(); g.shadowBlur = 14 * size / 1024; const [x0, y0] = P(r0, a), [x1, y1] = P(r1, a), [cl, cl2] = P((r0 + r1) / 2, a - wAng), [cr, cr2] = P((r0 + r1) / 2, a + wAng); g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(cl, cl2, x1, y1); g.quadraticCurveTo(cr, cr2, x0, y0); g.fill(); B = ob; };
  const spoke = (r0, r1, a, o, w = 2) => { ord = o; g.strokeStyle = col(); glow(6); g.lineWidth = w * WM * size / 1024; const [x0, y0] = P(r0, a), [x1, y1] = P(r1, a); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
  const star = (r, n, step, rot, o, w = 2) => { ord = o; g.strokeStyle = col(); glow(8); g.lineWidth = w * WM * size / 1024; g.beginPath(); for (let k = 0; k <= n; k++) { const [x, y] = P(r, rot + (k * step % n) / n * 6.2832); k ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); };
  const leaf = (r0, r1, a, o) => { /* filigrana de chama/folha em espinhos, como nas seis pontas da referência */
    for (let s of [-1, 1]) for (let k = 0; k < 4; k++) { ord = o + k * .01; g.strokeStyle = col(); glow(7); g.lineWidth = 2 * WM * size / 1024; const rr = r0 + (r1 - r0) * (k / 4), [x0, y0] = P(rr, a), [xc, yc] = P(rr + (r1 - r0) * .2, a + s * (.11 - k * .02)), [x1, y1] = P(rr + (r1 - r0) * .32, a + s * (.05 - k * .012)); g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(xc, yc, x1, y1); g.stroke(); }
    spoke(r0, r1 + .02, a, o, 2.6); petal(r1 - .06, r1 + .05, a, .025, o + .04, 2); };
  const branch = (r0, r1, a, o0, o1, n, w = 2.2, spread = .16) => { /* galho de cristal: haste + farpas em V ao longo dela */
    spoke(r0, r1, a, o0, w + .6); for (let k = 1; k <= n; k++) { const f = k / (n + 1), rr = r0 + (r1 - r0) * f, len = (r1 - r0) * (.22 + .18 * Math.sin(f * 3.1)) * (1 - f * .35);
      for (const sg of [-1, 1]) { ord = o0 + (o1 - o0) * f; g.strokeStyle = col(); glow(6); g.lineWidth = w * WM * .8 * size / 1024; const [x0, y0] = P(rr, a), [x1, y1] = P(rr + len * .7, a + sg * spread * (1 - f * .4)); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); } }
    petal(r1 - (r1 - r0) * .18, r1 + (r1 - r0) * .06, a, .03, o1, w); };
  const dots = (r, n, o, rad = 2.2) => { for (let k = 0; k < n; k++) { ord = o + .02 * k / n; g.fillStyle = col(); g.shadowColor = col(); g.shadowBlur = 6 * size / 1024; const [x, y] = P(r, k / n * 6.2832); g.beginPath(); g.arc(x, y, rad * size / 1024, 0, 6.2832); g.fill(); } };
  if (kind === 'main') {
    // 1) contorno fino traçado em volta + faixa de runas (mais tênue, como na referência)
    B = .62; WM = .7;
    arcSeg(.985, -Math.PI / 2, Math.PI * 1.5, 2.6, .0, .14, 48); arcSeg(.962, Math.PI * 1.5, -Math.PI / 2, 1.4, .02, .16, 48);
    for (let k = 0; k < 110; k++) { const a = -Math.PI / 2 + k / 110 * 6.2832; glyph(.93, a, .036, .08 + .14 * k / 110, k * 3.7); }
    arcSeg(.895, -Math.PI / 2, Math.PI * 1.5, 1.6, .14, .22, 48);
    B = .85; WM = 1;
    // 2) seis grandes filigranas de espinhos (como as pontas da referência) entre o anel e a mandala central
    for (let k = 0; k < 6; k++) { const a = -Math.PI / 2 + k / 6 * 6.2832; leaf(.56, .86, a, .22 + k * .01); for (const sg of [-1, 1]) { petal(.6, .76, a + sg * .16, .04, .26 + k * .01, 1.8); petal(.62, .7, a + sg * .3, .035, .28 + k * .01, 1.4); } }
    for (let k = 0; k < 6; k++) { const a = -Math.PI / 2 + (k + .5) / 6 * 6.2832; for (let q = 0; q < 5; q++) glyph(.7 + q * .035, a, .028, .3 + q * .01, k * 13 + q); spoke(.6, .66, a, .3, 1.4); }
    // 3) mandala central densa e brilhante (floco de cristal)
    B = 1; WM = 1.35; for (let k = 0; k < 6; k++) { const a = -Math.PI / 2 + k / 6 * 6.2832; fpetal(.06, .5, a, .34, .5, .07); petal(.06, .5, a, .34, .52, 2.6); petal(.12, .44, a, .22, .54, 1.6); petal(.18, .4, a, .14, .55, 1.4); petal(.06, .38, a + Math.PI / 6, .3, .56, 2); petal(.12, .32, a + Math.PI / 6, .18, .57, 1.3); for (let q = 0; q < 4; q++) { const rr = .16 + q * .08; for (const sg of [-1, 1]) petal(rr, rr + .07, a + sg * (.16 - q * .02), .05, .58 + q * .01, 1.2); } petal(.06, .38, a + Math.PI / 6, .3, .56, 2); } for (let k = 0; k < 12; k++) fpetal(.04, .26, k / 12 * 6.2832, .13, .6, .06); for (let k = 0; k < 6; k++) fpetal(.45, .58, -Math.PI / 2 + k / 6 * 6.2832, .06, .4, .35);
    circle(.585, 2.6, .34); circle(.565, 1.4, .35); dots(.545, 72, .36, 1.8); for (let k = 0; k < 48; k++) glyph(.515, k / 48 * 6.2832, .026, .38 + .06 * k / 48, k * 7.3); circle(.485, 2, .45);
    for (let k = 0; k < 6; k++) branch(.08, .4, -Math.PI / 2 + k / 6 * 6.2832, .48, .62, 5, 2.2, .28);
    for (let k = 0; k < 6; k++) branch(.1, .3, -Math.PI / 2 + (k + .5) / 6 * 6.2832, .5, .64, 3, 1.6, .24);
    for (let k = 0; k < 12; k++) petal(.16, .46, k / 12 * 6.2832 - Math.PI / 2, .085, .62 + k * .005, 2.2); for (let k = 0; k < 12; k++) petal(.1, .32, (k + .5) / 12 * 6.2832 - Math.PI / 2, .1, .68 + k * .004, 2);
    star(.44, 6, 2, -Math.PI / 2, .72, 2); star(.44, 6, 2, -Math.PI / 2 + Math.PI / 6, .73, 2); star(.3, 12, 5, 0, .76, 1.4);
    for (let k = 0; k < 72; k++) spoke(.2, k % 2 ? .27 : .31, k / 72 * 6.2832, .78 + k / 7200, 1.1);
    circle(.2, 2.2, .8); circle(.13, 1.6, .82); for (let k = 0; k < 8; k++) petal(.02, .19, k / 8 * 6.2832, .16, .84 + k * .006, 2.4); star(.12, 8, 3, 0, .88, 1.6); circle(.035, 4, .9); dots(.075, 16, .9, 2);
    B = .7; WM = .8;
    // 4) por último, as quatro ligações em arco (texto rúnico) entre os selos diagonais
    for (let d = 0; d < 4; d++) { const a0 = Math.PI / 4 + d * Math.PI / 2 + .3, a1 = a0 + Math.PI / 2 - .6; for (let k = 0; k < 30; k++) glyph(1.03, a0 + (a1 - a0) * k / 30, .03, .9 + .1 * k / 30, d * 40 + k); arcSeg(1.07, a0, a1, 1.2, .9, .99, 12); }
  } else {
    WM = 1.6; for (let k = 0; k < 8; k++) { fpetal(.06, .58, k / 8 * 6.2832, .18, .5, .4); fpetal(.06, .45, (k + .5) / 8 * 6.2832, .16, .55, .32); fpetal(.6, .92, k / 8 * 6.2832, .08, .3, .3); }
    arcSeg(.97, -Math.PI / 2, Math.PI * 1.5, 3.2, 0, .2, 32); arcSeg(.9, Math.PI * 1.5, -Math.PI / 2, 1.8, .08, .24, 32); for (let k = 0; k < 40; k++) glyph(.935, k / 40 * 6.2832, .035, .2 + .1 * k / 40, k * 5.1);
    for (let k = 0; k < 8; k++) { const a = k / 8 * 6.2832; petal(.6, .9, a, .075, .3 + k * .015, 2.4); petal(.66, .84, a + Math.PI / 8, .05, .34 + k * .01, 1.8); }
    star(.86, 8, 3, 0, .42, 2); star(.86, 8, 3, Math.PI / 8, .46, 2); circle(.6, 2.6, .5); dots(.56, 40, .52, 2.4);
    for (let k = 0; k < 8; k++) branch(.06, .52, k / 8 * 6.2832, .55, .72, 4, 2.4, .22);
    for (let k = 0; k < 8; k++) petal(.12, .5, (k + .5) / 8 * 6.2832, .14, .7 + k * .012, 2.2); for (let k = 0; k < 16; k++) petal(.08, .3, k / 16 * 6.2832, .1, .8 + k * .006, 1.6);
    star(.36, 8, 3, Math.PI / 16, .86, 1.6); circle(.14, 2.4, .9); circle(.05, 5, .95);
  }
  /* brilho: cópia borrada somada (a razão G/R continua sendo a ordem) */
  g.shadowBlur = 0; g.globalCompositeOperation = 'lighter'; g.globalAlpha = .38; g.filter = `blur(${Math.round(7 * size / 1024)}px)`; g.drawImage(c, 0, 0); g.filter = 'none'; g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  const t = new T.CanvasTexture(c); t.anisotropy = 4; t.needsUpdate = true; return t;
}
const SEAL_V = `varying vec2 vU; void main(){ vU=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const SEAL_F = `uniform sampler2D uTex; uniform float uProg,uA,time,uPulse; varying vec2 vU;
void main(){ vec4 s=texture2D(uTex,vU); float I=s.r; if(I<.01) discard; float ord=s.g/max(I,.004); float vis=smoothstep(ord-.012,ord+.002,uProg); float front=smoothstep(.05,0.,abs(ord-uProg))*step(.02,uProg)*step(uProg,.995);
 float a=(I*vis*(.9+.1*sin(time*3.+vU.x*20.))+front*I*.9)*uA*1.35; if(a<.01) discard; vec3 c=mix(vec3(.12,.42,1.),vec3(.86,.97,1.),smoothstep(.45,1.,I))+vec3(.6,.9,1.)*front; c+=vec3(.3,.6,1.)*uPulse*I;
 gl_FragColor=vec4(c*a,1.); }`;

/* ---------- tornado: corpo torcido ---------- */
const TOR_COMMON = `uniform float time,uH,uRad,uSeed,uSpin,uGrow,uWob,uShell;
float prof(float v){ return .6+1.35*exp(-v*6.5)+1.5*pow(v,2.2)+.1*sin(v*14.+uSeed)+.06*sin(v*31.-uSeed); } /* base larga, cintura fina, topo alargado */
vec2 axis(float v){ return vec2(sin(v*2.8-time*1.25+uSeed),cos(v*2.3-time*1.05+uSeed*1.7))*.42*v*uWob; } /* eixo em S que ondula */`;
const CORE_V = `${TOR_COMMON} varying vec2 vU; varying vec3 vN,vW; varying float vR;
void main(){ float u=uv.x, v=uv.y*uGrow; float a=u*6.2832+v*2.2*uShell-time*uSpin*(.6+.35*(uShell-1.)*5.); float r=prof(v)*uRad*(.75+.25*uGrow)*uShell; vec2 ax=axis(v)*uRad;
 vec3 p=vec3(cos(a)*r+ax.x,v*uH,sin(a)*r+ax.y); vU=vec2(u,v); vR=r; vec4 w=modelMatrix*vec4(p,1.); vW=w.xyz; vN=normalize(mat3(modelMatrix)*vec3(cos(a),-.25,sin(a))); gl_Position=projectionMatrix*viewMatrix*w; }`;
const CORE_F = `${NOISE} uniform float time,uSpin,uA,uSeed,uHot,uShell; varying vec2 vU; varying vec3 vN,vW; varying float vR;
void main(){ float u=vU.x,v=vU.y; vec3 V=normalize(cameraPosition-vW); float ndv=abs(dot(normalize(vN),V)), rim=pow(1.-ndv,1.6);
 vec2 q=vec2(u*3.+v*6.5-time*uSpin*.9,v*8.-time*1.8); float w=fbm(q*1.4+uSeed), w2=fbm(q*3.1-uSeed); float str=sin((u*6.2832*2.+v*56.-time*uSpin*3.)+w*7.+w2*3.), str2=sin(u*6.2832*3.+v*90.-time*uSpin*4.+w2*5.);
 float bright=smoothstep(.3,.95,str)*(.5+.5*w), fine=smoothstep(.7,1.,str2)*.6, dark=smoothstep(-.15,-.75,str)*(.6+.4*w2);
 float edgeTop=smoothstep(.99,.86,v+.14*(n2(vec2(u*22.,time*1.5))-.5)), edgeBot=smoothstep(0.,.04,v);
 vec3 c=mix(vec3(.02,.07,.28),vec3(.06,.36,1.),.3+.7*w); c=mix(c,vec3(.22,.78,1.),bright); c=mix(c,vec3(.86,.98,1.),bright*bright*bright*.8+fine*.35+rim*.25); c=mix(c,vec3(.004,.012,.06),dark*.92);
 c+=vec3(.45,.25,.95)*smoothstep(.78,.95,fbm(q*2.+3.))*.4; /* acento violeta discreto */ c*=1.+.6*uHot;
 float near=smoothstep(2.,7.,length(cameraPosition-vW)); float shell=uShell>1.05?(.35+.65*smoothstep(.2,.9,bright+fine)):1.; float a=uA*edgeTop*edgeBot*(.66+.3*bright+.3*rim+.1*dark)*(.12+.88*near)*shell; /* casca externa: só os veios claros, dá profundidade de volume */ if(a<.02) discard; /* por dentro do vórtice a câmera continua enxergando */ gl_FragColor=vec4(c,clamp(a,0.,1.)); }`;
/* lâminas helicoidais: fitas que giram mais rápido que o corpo, borda superior brilhante, inferior escura */
const BAND_V = `${TOR_COMMON} attribute vec4 aB; attribute vec2 aS; varying vec2 vS; varying float vV,vE,vNear;
void main(){ float s=aS.x, side=aS.y; float v0=aB.x, span=aB.y, ph=aB.z, sp=aB.w; float v=clamp((v0+s*.13)*uGrow,0.,1.);
 float a=ph+s*span-time*uSpin*sp; float r=prof(v)*uRad*1.06+uRad*.1; vec2 ax=axis(v)*uRad; float wy=(side-.5)*uH*(.045+.025*sin(ph*3.));
 vec3 p=vec3(cos(a)*r+ax.x,v*uH+wy,sin(a)*r+ax.y)+vec3(cos(a),0.,sin(a))*(side-.5)*uRad*.22; vS=vec2(s,side); vV=v; vE=ph; vec4 w=modelMatrix*vec4(p,1.); vNear=smoothstep(2.,7.,length(cameraPosition-w.xyz)); gl_Position=projectionMatrix*viewMatrix*w; }`;
const BAND_F = `${NOISE} uniform float time,uA,uHot; varying vec2 vS; varying float vV,vE,vNear;
void main(){ float s=vS.x, y=vS.y; float ends=smoothstep(0.,.18,s)*smoothstep(1.,.62,s); float n=fbm(vec2(s*9.-time*3.+vE*5.,y*3.));
 float top=smoothstep(.5,.95,y), low=smoothstep(.45,.0,y); vec3 c=mix(vec3(.06,.4,1.),vec3(.7,.95,1.),top*(.55+.45*n)); c=mix(c,vec3(.0,.02,.09),low*.85); float darkBand=step(.62,fract(vE*3.7)); c=mix(c,vec3(.01,.03,.1)+vec3(.2,.6,1.)*top*.35,darkBand); /* algumas lâminas escuras, como as fendas pretas do GIF */
 float a=uA*ends*(.55+.45*n)*(1.-smoothstep(.97,1.,vV))*(.85+.15*top)*(.1+.9*vNear); if(a<.03) discard; gl_FragColor=vec4(c*(1.+.5*uHot),min(1.,a)); }`;
/* redemoinho de chão */
const BASE_V = `varying vec2 vP; void main(){ vP=position.xz; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const BASE_F = `${NOISE} uniform float time,uA,uSpin,uSeed; varying vec2 vP;
void main(){ float r=length(vP), ang=atan(vP.y,vP.x); if(r>1.) discard; float sw=ang*3.+log(r+.05)*7.-time*uSpin*1.6+uSeed;
 float arm=smoothstep(.35,.95,sin(sw)*.5+.5+(fbm(vec2(ang*2.+uSeed,r*6.-time))-.5)*.6); float dark=smoothstep(.2,.0,sin(sw+1.3)*.5+.5);
 float fall=smoothstep(1.,.45,r)*smoothstep(.02,.12,r); vec3 c=mix(vec3(.05,.3,.95),vec3(.3,.85,1.),arm); c=mix(c,vec3(.85,.98,1.),arm*arm*arm*.7); c=mix(c,vec3(.0,.03,.12),dark*.9);
 float a=uA*fall*(.3+.55*arm+.45*dark); if(a<.02) discard; gl_FragColor=vec4(c,a); }`;

/* ---------- aura ciano (mesma família da aura rubra, cores próprias) ---------- */
const HULL_V = `#include <common>
#include <skinning_pars_vertex>
uniform float uThick,uShift,time; varying vec3 vN,vV; varying float vY;
void main(){
 #include <skinbase_vertex>
 #include <beginnormal_vertex>
 #include <skinnormal_vertex>
 vec3 transformed=vec3(position);
 #include <skinning_vertex>
 float wob=.75+.25*sin(position.y*9.+time*4.)+.2*sin(position.x*13.-time*5.);
 transformed+=normalize(objectNormal)*uThick*wob; vec4 mv=modelViewMatrix*vec4(transformed,1.); vN=normalize(normalMatrix*objectNormal); vV=-mv.xyz; vY=(modelMatrix*vec4(transformed,1.)).y;
 gl_Position=projectionMatrix*mv; gl_Position.x+=uShift*gl_Position.w; }`;
const HULL_F = `uniform vec3 uCol; uniform float uInt,time; varying vec3 vN,vV; varying float vY;
void main(){ float f=pow(1.-abs(dot(normalize(vN),normalize(vV))),3.2); float fl=.6+.4*sin(vY*7.-time*6.)*sin(vY*3.1+time*2.3);
 float a=f*uInt*fl; if(a<.01) discard; gl_FragColor=vec4(uCol*a,1.); }`;
const TONGUE_V = `uniform vec3 uAnchor[14]; uniform float time,uInt; attribute vec4 aF; attribute vec4 aA; varying vec2 vU; varying float vS;
void main(){ vU=uv; vS=aF.z; int idx=int(aA.x+.5); vec3 base=uAnchor[0];
 for(int i=0;i<14;i++){ if(i==idx) base=uAnchor[i]; }
 vec3 off=vec3(aA.y,0.,aA.z)*aA.w; float h=uv.y, L=aF.x*(.55+.45*uInt), t=time*(1.3+.6*aF.w);
 vec3 V=normalize(cameraPosition-base); vec3 side=normalize(cross(vec3(0.,1.,0.),V)); vec3 fw=normalize(cross(side,vec3(0.,1.,0.)));
 float sway=(sin(h*3.4-t*2.2+aF.z*6.)*.32+sin(h*7.-t*3.4+aF.z*11.)*.1)*h*L, curl=sin(h*2.6-t*1.5+aF.z*3.)*.22*h*L;
 float w=aF.y*pow(1.-h,1.1)*(.6+.4*smoothstep(0.,.15,h))*(.7+.3*uInt);
 vec3 p=base+off*(1.+h*.6)+vec3(0.,h*L,0.)+side*(sway+(uv.x-.5)*2.*w)+fw*curl+normalize(off+vec3(1e-4))*h*h*L*.25;
 gl_Position=projectionMatrix*viewMatrix*vec4(p,1.); }`;
const TONGUE_F = `${NOISE} uniform float time,uInt; varying vec2 vU; varying float vS;
void main(){ float h=vU.y, x=vU.x*2.-1.; float n=fbm(vec2(x*2.+vS*7.,h*4.-time*2.4));
 float e=abs(x)+.14*(n-.5); if(e>1.) discard; float a=uInt*(1.-smoothstep(.65,1.,h))*(.6+.4*smoothstep(0.,.08,h)); if(a<.02) discard;
 vec3 c=vec3(.01,.03,.09); float rim=smoothstep(.4,.97,e); c=mix(c,vec3(.25,.78,1.),rim*.9); c=mix(c,vec3(.85,.97,1.),smoothstep(.85,.98,e)*.6);
 c=mix(c,vec3(.6,.4,1.),smoothstep(.86,.99,e)*step(0.,x)*.35); gl_FragColor=vec4(c,a*mix(.36,.85,rim)*(1.-smoothstep(.9,1.,e))); }`;
const AXB_V = `uniform vec3 uC,uAx; uniform vec2 uSz; varying vec2 vU;
void main(){ vU=uv; vec3 V=normalize(cameraPosition-uC); vec3 side=normalize(cross(uAx,V)); vec3 p=uC+side*(uv.x-.5)*uSz.x+uAx*(uv.y-.5)*uSz.y; gl_Position=projectionMatrix*viewMatrix*vec4(p,1.); }`;
const GLOW_F = `uniform float uA; uniform vec3 uCol; varying vec2 vU; void main(){ vec2 q=(vU-.5)*2.; float r=length(q); float a=uA*exp(-r*r*4.)*smoothstep(1.,.75,r); if(a<.01) discard; gl_FragColor=vec4(uCol*a,1.); }`;

/* ---------- fogo azul (quads cruzados instanciados) ---------- */
const FIRE_V = `attribute vec3 aF; uniform float time; varying vec2 vU; varying float vK,vSeed; void main(){ vU=uv; float age=time-aF.x; vK=clamp(age/aF.y,0.,1.); vSeed=aF.z;
 vec3 p=position; float grow=smoothstep(0.,.18,age/max(.01,aF.y)*4.)*(1.-smoothstep(.72,1.,vK)); p.y*=grow*(.85+.3*sin(time*7.+aF.z*20.)); p.x*=.75+.25*grow;
 gl_Position=projectionMatrix*viewMatrix*modelMatrix*instanceMatrix*vec4(p,1.); }`;
const FIRE_F = `${NOISE} uniform float time; varying vec2 vU; varying float vK,vSeed;
void main(){ if(vK>=1.) discard; float x=vU.x*2.-1., y=vU.y; float tt=time*1.1+vSeed*30.;
 float xs=x+sin(y*6.-tt*4.)*.08*y+(fbm(vec2(y*3.-tt*2.,vSeed*5.))-.5)*.3*y; /* línguas que dançam e se curvam */
 float hgt=(.35+.65*fbm(vec2(xs*2.4+vSeed*9.,tt*.55)))*(1.-.55*x*x); float tongues=.5+.5*sin(xs*9.+fbm(vec2(xs*3.,tt))*4.); hgt*=.7+.45*tongues;
 float body=smoothstep(hgt,hgt-.22,y); float holes=smoothstep(.62,.8,fbm(vec2(xs*5.,y*4.-tt*3.)))*smoothstep(.25,.6,y/max(hgt,.05)); body*=1.-holes;
 if(body<.02) discard; float k=y/max(.05,hgt); vec3 c=mix(vec3(.75,.95,1.),vec3(.15,.6,1.),smoothstep(.05,.45,k)); c=mix(c,vec3(.03,.12,.6),smoothstep(.45,1.,k));
 float a=body*smoothstep(0.,.04,y)*(1.-smoothstep(.7,1.,vK))*smoothstep(1.,.75,abs(x)); gl_FragColor=vec4(c*a,1.); }`;

/* ---------- explosão final (lóbulos ciano-brancos com veios escuros) ---------- */
const BLB_V = `${N3} attribute float aSeed; attribute float aHeat; uniform float time; varying float vSeed,vHeat; varying vec3 vN,vV,vP;
void main(){ vSeed=aSeed; vHeat=aHeat; vec3 p=position; float d=n3(p*2.4+aSeed*7.+vec3(0.,-time*.6,0.))*.5+n3(p*5.-aSeed*3.)*.25; p*=.8+d*.45; vP=p;
 vec4 w=modelMatrix*instanceMatrix*vec4(p,1.); vN=normalize(mat3(modelMatrix*instanceMatrix)*position); vV=cameraPosition-w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
const BLB_F = `${N3} uniform float time; varying float vSeed,vHeat; varying vec3 vN,vV,vP;
float dith(vec2 c){return fract(52.9829189*fract(dot(c,vec2(.06711056,.00583715))));}
void main(){ vec3 N=normalize(vN),V=normalize(vV); float ndv=clamp(dot(N,V),0.,1.);
 if(vHeat<.02) discard; if(dith(gl_FragCoord.xy)>smoothstep(2.,6.5,length(vV))*1.02) discard; float n=n3(vP*3.6+vSeed*4.), n2v=n3(vP*8.-vSeed*2.+time*.3); float vein=smoothstep(.07,0.,abs(n-.5))*(.45+.55*n2v);
 float lobe=smoothstep(.0,.75,ndv); /* cada lóbulo: centro claro, borda azul mais escura (as dobras entre lóbulos) */
 vec3 c=mix(vec3(.02,.14,.45),vec3(.2,.75,1.),pow(lobe,.8)); c=mix(c,vec3(.86,.99,1.),pow(lobe,2.6)*smoothstep(.55,1.1,vHeat)+smoothstep(.8,1.,n2v)*.25*lobe); c=mix(c,vec3(.0,.07,.25),vein*.75);
 c*=.55+.6*vHeat; gl_FragColor=vec4(c,1.); }`;
const RING_V = `varying vec2 vU; void main(){ vU=uv*2.-1.; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const RING_F = `${NOISE} uniform float uK,uA,uW,time,uWarm; varying vec2 vU; void main(){ float r=length(vU); if(r>1.) discard; float ang=atan(vU.y,vU.x);
 float edge=1.-uW*1.2, d=r-edge-.02*(fbm(vec2(ang*4.,time))-.5); float b=smoothstep(uW,0.,abs(d)); float a=uA*b*(.7+.3*fbm(vec2(ang*10.,time*2.))); if(a<.01) discard;
 vec3 c=mix(vec3(.15,.6,1.),vec3(.9,.99,1.),smoothstep(.5,1.,b)); c=mix(c,vec3(1.,.55,.2),uWarm*smoothstep(.2,1.,d/uW)*.9); c=mix(c,vec3(.95,.25,.5),uWarm*smoothstep(-.2,-1.,d/uW)*.5); /* franja cromática laranja/magenta como na referência */ gl_FragColor=vec4(c*a,1.); }`;
const PT_V = `attribute vec4 aC; varying vec4 vC; void main(){ vC=aC; vec4 mv=viewMatrix*vec4(position,1.); gl_PointSize=clamp(150./-mv.z,1.5,9.); gl_Position=projectionMatrix*mv; }`;
const PT_F = `varying vec4 vC; void main(){ vec2 p=gl_PointCoord*2.-1.; float d=dot(p,p); if(d>1.||vC.a<.01) discard; gl_FragColor=vec4(vC.rgb*vC.a*(1.-d),1.); }`;
const SHARD_V = `attribute vec4 aD; varying float vA; varying vec3 vN,vV; void main(){ vA=aD.x; vec4 w=modelMatrix*instanceMatrix*vec4(position,1.); vN=normalize(mat3(instanceMatrix)*normal); vV=cameraPosition-w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
const SHARD_F = `varying float vA; varying vec3 vN,vV; void main(){ if(vA<.05) discard; float rim=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.); gl_FragColor=vec4(vec3(.01,.02,.06)+vec3(.3,.75,1.)*rim*.8,1.); }`;

function strip(T, N, M) { const g = new T.BufferGeometry(), U = [], I = []; for (let j = 0; j <= N; j++) for (let i = 0; i <= M; i++) U.push(i / M, j / N); for (let j = 0; j < N; j++) for (let i = 0; i < M; i++) { const a = j * (M + 1) + i, b = a + M + 1; I.push(a, b, a + 1, a + 1, b, b + 1); } g.setAttribute('uv', new T.Float32BufferAttribute(U, 2)); g.setAttribute('position', new T.Float32BufferAttribute(new Float32Array(U.length / 2 * 3), 3)); g.setIndex(I); return g; }

export function createBlueCycloneVFX(T, scene, opts = {}) {
  const low = !!opts.low, root = new T.Group(); root.name = 'VeraxionQuatroVortices'; scene.add(root); const geos = [], mats = [], uTime = { value: 0 }, texs = [];
  const mat = o => { const m = new T.ShaderMaterial({ toneMapped: false, fog: false, ...o, uniforms: { time: uTime, ...(o.uniforms || {}) } }); mats.push(m); return m; };
  const add = (m, ro = 4) => { m.frustumCulled = false; m.visible = false; m.renderOrder = ro; root.add(m); return m; };
  /* mandala + selos */
  const mainTex = drawMandala(T, low ? 1024 : 1536, 'main'), satTex = drawMandala(T, low ? 384 : 512, 'sat'); if (mainTex) texs.push(mainTex); if (satTex) texs.push(satTex);
  const planeG = new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2); geos.push(planeG);
  const mainU = { uTex: { value: mainTex }, uProg: { value: 0 }, uA: { value: 0 }, uPulse: { value: 0 } };
  const mandala = add(new T.Mesh(planeG, mat({ vertexShader: SEAL_V, fragmentShader: SEAL_F, transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: mainU })), 2);
  const sats = [0, 1, 2, 3].map(() => { const u = { uTex: { value: satTex }, uProg: { value: 0 }, uA: { value: 0 }, uPulse: { value: 0 } }; return { m: add(new T.Mesh(planeG, mat({ vertexShader: SEAL_V, fragmentShader: SEAL_F, transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: u })), 2), u }; });
  const GG_F = `uniform float uA; varying vec2 vU; void main(){ float r=length(vU); if(r>1.) discard; float a=uA*(exp(-r*r*2.2)*.55+.25*smoothstep(1.,.85,r)*smoothstep(.7,.85,r)); gl_FragColor=vec4(mix(vec3(.25,.12,.75),vec3(.1,.35,1.),exp(-r*r*3.))*a,1.); }`;
  const UND_F = `uniform float uA; varying vec2 vU; void main(){ float r=length(vU); if(r>1.) discard; float a=uA*smoothstep(1.,.86,r); gl_FragColor=vec4(vec3(.03,.02,.12),a); }`;
  const undU = { uA: { value: 0 } }; const under = add(new T.Mesh(planeG, mat({ vertexShader: `varying vec2 vU; void main(){ vU=uv*2.-1.; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`, fragmentShader: UND_F, transparent: true, depthWrite: false, uniforms: undU })), 1); /* escurece o chão sob o círculo: as linhas ciano leem em qualquer piso */
  const ggU = { uA: { value: 0 } }; const groundGlow = add(new T.Mesh(planeG, mat({ vertexShader: `varying vec2 vU; void main(){ vU=uv*2.-1.; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`, fragmentShader: GG_F, transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: ggU })), 1);
  const groundGlowU = { uC: { value: new T.Vector3() }, uAx: { value: new T.Vector3(0, 0, 1) }, uSz: { value: new T.Vector2(1, 1) }, uA: { value: 0 }, uCol: { value: new T.Color(0x2a3cff) } };
  /* tornados (4 + mega reaproveitando o mesmo tipo) */
  const coreG = strip(T, low ? 30 : 44, low ? 22 : 32); geos.push(coreG);
  const NBAND = low ? 6 : 9, BS = 30, bandG = (() => { const g = new T.BufferGeometry(), B = [], S = [], I = []; for (let b = 0; b < NBAND; b++) { const o = S.length / 2, v0 = .02 + .84 * (b / NBAND) + .03 * R3(b), span = 3.6 + 1.8 * R3(b + 3), ph = R3(b + 7) * 6.283, sp = 1.4 + .9 * R3(b + 11);
      for (let j = 0; j <= BS; j++) for (let k = 0; k < 2; k++) { S.push(j / BS, k); B.push(v0, span, ph, sp); } for (let j = 0; j < BS; j++) { const a = o + j * 2; I.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } }
    g.setAttribute('aS', new T.Float32BufferAttribute(S, 2)); g.setAttribute('aB', new T.Float32BufferAttribute(B, 4)); g.setAttribute('position', new T.Float32BufferAttribute(new Float32Array(S.length / 2 * 3), 3)); g.setIndex(I); return g; })(); geos.push(bandG);
  const discG = new T.CircleGeometry(1, 48).rotateX(-Math.PI / 2); geos.push(discG);
  const torU = () => ({ uShell: { value: 1 }, uH: { value: 9 }, uRad: { value: 1 }, uSeed: { value: 0 }, uSpin: { value: 3 }, uGrow: { value: 1 }, uWob: { value: 1 }, uA: { value: 1 }, uHot: { value: 0 } });
  const tors = Array.from({ length: 5 }, (_, i) => { const u = torU(); u.uSeed.value = i * 1.73 + .4;
    const core = add(new T.Mesh(coreG, mat({ vertexShader: CORE_V, fragmentShader: CORE_F, transparent: true, depthWrite: false, side: T.DoubleSide, uniforms: u })), 5);
    const shellU = { ...u, uShell: { value: 1.16 }, uSeed: { value: i * 1.73 + 2.9 } }; const shell = add(new T.Mesh(coreG, mat({ vertexShader: CORE_V, fragmentShader: CORE_F, transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending, uniforms: shellU })), 6);
    const band = add(new T.Mesh(bandG, mat({ vertexShader: BAND_V, fragmentShader: BAND_F, transparent: true, depthWrite: false, side: T.DoubleSide, uniforms: u })), 6);
    const bu = { uA: { value: 1 }, uSpin: { value: 3 }, uSeed: { value: i * 2.1 } }; const base = add(new T.Mesh(discG, mat({ vertexShader: BASE_V, fragmentShader: BASE_F, transparent: true, depthWrite: false, uniforms: bu })), 3);
    const glowU = { uC: { value: new T.Vector3() }, uAx: { value: new T.Vector3(0, 1, 0) }, uSz: { value: new T.Vector2(1, 1) }, uA: { value: 0 }, uCol: { value: new T.Color(0x1a6cff) } };
    const glow = add(new T.Mesh(new T.PlaneGeometry(1, 1), mat({ vertexShader: AXB_V, fragmentShader: GLOW_F, transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: glowU })), 2); geos.push(glow.geometry);
    return { core, shell, band, base, u, bu, glow, glowU }; });
  /* destroços e faíscas */
  const SH = low ? 60 : 130, shardG = new T.TetrahedronGeometry(.16, 0); geos.push(shardG); const shD = new Float32Array(SH * 4); shardG.setAttribute('aD', new T.InstancedBufferAttribute(shD, 4).setUsage(T.DynamicDrawUsage));
  const shards = add(new T.InstancedMesh(shardG, mat({ vertexShader: SHARD_V, fragmentShader: SHARD_F }), SH), 5); shards.instanceMatrix.setUsage(T.DynamicDrawUsage);
  const PN = low ? 300 : 620, pP = new Float32Array(PN * 3), pC = new Float32Array(PN * 4), pV = new Float32Array(PN * 3), pL = new Float32Array(PN * 2);
  const ptG = new T.BufferGeometry(); ptG.setAttribute('position', new T.BufferAttribute(pP, 3).setUsage(T.DynamicDrawUsage)); ptG.setAttribute('aC', new T.BufferAttribute(pC, 4).setUsage(T.DynamicDrawUsage)); geos.push(ptG);
  const pts = add(new T.Points(ptG, mat({ vertexShader: PT_V, fragmentShader: PT_F, transparent: true, depthWrite: false, blending: T.AdditiveBlending })), 9); pts.visible = true; let pI = 0;
  const emit = (x, y, z, vx, vy, vz, r, g, b, life) => { const i = pI++ % PN; pP.set([x, y, z], i * 3); pV.set([vx, vy, vz], i * 3); pC.set([r, g, b, 1], i * 4); pL[i * 2] = life; pL[i * 2 + 1] = life; };
  /* fogo azul */
  const FN = 180, fireG = (() => { const g = new T.BufferGeometry(), P = [], U = [], I = []; for (let q = 0; q < 3; q++) { const a = q * Math.PI / 3, c = Math.cos(a), s = Math.sin(a), o = P.length / 3; for (const [x, y] of [[-1, 0], [1, 0], [1, 1], [-1, 1]]) { P.push(x * c * .5, y, x * s * .5); U.push((x + 1) / 2, y); } I.push(o, o + 1, o + 2, o, o + 2, o + 3); }
    g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(U, 2)); g.setIndex(I); return g; })(); geos.push(fireG);
  const fA = new Float32Array(FN * 3); fireG.setAttribute('aF', new T.InstancedBufferAttribute(fA, 3).setUsage(T.DynamicDrawUsage));
  const fire = add(new T.InstancedMesh(fireG, mat({ vertexShader: FIRE_V, fragmentShader: FIRE_F, transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending }), FN), 7); fire.instanceMatrix.setUsage(T.DynamicDrawUsage);
  const fireSlots = new Map(); let fireNext = 0;
  /* explosão */
  const BL = low ? 44 : 84, ico = new T.IcosahedronGeometry(1, low ? 1 : 2); geos.push(ico); const blSeed = new Float32Array(BL), blHeat = new Float32Array(BL); for (let i = 0; i < BL; i++) blSeed[i] = R3(i * 2.3);
  ico.setAttribute('aSeed', new T.InstancedBufferAttribute(blSeed, 1)); ico.setAttribute('aHeat', new T.InstancedBufferAttribute(blHeat, 1).setUsage(T.DynamicDrawUsage));
  const blobs = add(new T.InstancedMesh(ico, mat({ vertexShader: BLB_V, fragmentShader: BLB_F }), BL), 6); blobs.instanceMatrix.setUsage(T.DynamicDrawUsage);
  const NCOL = Math.round(BL * .3), NDOME = BL - NCOL; const blLayout = Array.from({ length: BL }, (_, i) => { if (i >= NDOME) { const k = i - NDOME; return { col: true, a: k / NCOL * 6.2832 + .2 * R3(k), el: 0, r: 1, s: .15 + .05 * R3(i + 5) }; } const ga = i * 2.39996, yy = 1 - (i + .5) / NDOME; const r = Math.sqrt(1 - yy * yy); return { a: ga, el: Math.asin(yy), r, s: .2 + .1 * R3(i + 5) }; });
  const BLG_V = `uniform float time; varying vec3 vN,vV; void main(){ vec4 w=modelMatrix*instanceMatrix*vec4(position*1.22,1.); vN=normalize(mat3(modelMatrix*instanceMatrix)*position); vV=cameraPosition-w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
  const BLG_F = `uniform float uA; varying vec3 vN,vV; void main(){ float f=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.5); float a=uA*f*.55; gl_FragColor=vec4(vec3(.2,.7,1.)*a,1.); }`;
  const blobGlowU = { uA: { value: 0 } }, blobGlow = add(new T.InstancedMesh(ico, mat({ vertexShader: BLG_V, fragmentShader: BLG_F, transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: blobGlowU }), BL), 7); blobGlow.instanceMatrix = blobs.instanceMatrix; /* halo luminoso dos lóbulos (mesmas matrizes) */
  const ringU = { uK: { value: 0 }, uA: { value: 0 }, uW: { value: .05 }, uWarm: { value: 1 } }, ring = add(new T.Mesh(planeG, mat({ vertexShader: RING_V, fragmentShader: RING_F, transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, uniforms: ringU })), 7);
  const ring2U = { uK: { value: 0 }, uA: { value: 0 }, uW: { value: .12 }, uWarm: { value: 0 } }, ring2 = add(new T.Mesh(planeG, mat({ vertexShader: RING_V, fragmentShader: RING_F, transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: ring2U })), 3);
  const flashU = { uC: { value: new T.Vector3() }, uAx: { value: new T.Vector3(0, 1, 0) }, uSz: { value: new T.Vector2(1, 1) }, uA: { value: 0 }, uCol: { value: new T.Color(0x7fd8ff) } };
  const flash = add(new T.Mesh(new T.PlaneGeometry(1, 1), mat({ vertexShader: AXB_V, fragmentShader: GLOW_F, transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: flashU })), 8); geos.push(flash.geometry);
  /* aura ciano */
  const ANCH = 14, tongueG = (() => { const g = new T.BufferGeometry(), N = 9, P = [], U = [], F = [], AA = [], I = []; let o = 0; const W = [3, 3, 2, 2, 2, 2, 1, 1, 1, 1, 2, 2, 1, 1], RAD = [.3, .3, .14, .16, .12, .12, .1, .1, .07, .07, .16, .16, .11, .11];
    let id = 0; for (let a = 0; a < ANCH; a++) for (let q = 0; q < W[a] + (a < 2 ? 1 : 0); q++) { const ang = (q / W[a] + .17 * R3(id)) * 6.283, rr = RAD[a] * (.85 + .3 * R3(id + 7)), len = (a < 4 ? .85 : .55) + .6 * R3(id + 11), w = (a < 4 ? .28 : .17) + .1 * R3(id + 13);
      for (let j = 0; j <= N; j++) for (let k = 0; k < 2; k++) { P.push(0, 0, 0); U.push(k, j / N); F.push(len, w, R3(id + 17), R3(id + 19)); AA.push(a, Math.cos(ang), Math.sin(ang), rr); }
      for (let j = 0; j < N; j++) { const b = o + j * 2; I.push(b, b + 2, b + 1, b + 1, b + 2, b + 3); } o += (N + 1) * 2; id++; }
    g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(U, 2)); g.setAttribute('aF', new T.Float32BufferAttribute(F, 4)); g.setAttribute('aA', new T.Float32BufferAttribute(AA, 4)); g.setIndex(I); return g; })(); geos.push(tongueG);
  const anchorU = Array.from({ length: ANCH }, () => new T.Vector3()), auraU = { uAnchor: { value: anchorU }, uInt: { value: 0 } };
  const tongues = add(new T.Mesh(tongueG, mat({ vertexShader: TONGUE_V, fragmentShader: TONGUE_F, transparent: true, depthWrite: false, side: T.DoubleSide, uniforms: auraU })), 5);
  const bodyGlowU = { uC: { value: new T.Vector3() }, uAx: { value: new T.Vector3(0, 1, 0) }, uSz: { value: new T.Vector2(1, 1) }, uA: { value: 0 }, uCol: { value: new T.Color(0x2a8cff) } };
  const bodyGlow = add(new T.Mesh(new T.PlaneGeometry(1, 1), mat({ vertexShader: AXB_V, fragmentShader: GLOW_F, transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: bodyGlowU })), 2); geos.push(bodyGlow.geometry);
  let hulls = [], hullRoot = null, anchorBones = [];
  const hullMat = (col, shift, thick) => mat({ vertexShader: HULL_V, fragmentShader: HULL_F, transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: { uCol: { value: new T.Color(col) }, uInt: { value: 0 }, uShift: { value: shift }, uThick: { value: thick } } });
  function attachBoss(bossRoot) { if (hullRoot === bossRoot) return; detachBoss(); if (!bossRoot) return; hullRoot = bossRoot;
    const names = ['mixamorigSpine1', 'mixamorigSpine2', 'mixamorigNeck', 'mixamorigHead', 'mixamorigLeftArm', 'mixamorigRightArm', 'mixamorigLeftForeArm', 'mixamorigRightForeArm', 'mixamorigLeftHand', 'mixamorigRightHand', 'mixamorigLeftUpLeg', 'mixamorigRightUpLeg', 'mixamorigLeftLeg', 'mixamorigRightLeg'];
    anchorBones = names.map(n => bossRoot.getObjectByName(n) || null);
    bossRoot.traverse(o => { if (o.isSkinnedMesh && hulls.length < 4) { o.updateWorldMatrix(true, false); const ws = new T.Vector3(); o.getWorldScale(ws); const sc = Math.max(1e-4, (ws.x + ws.y + ws.z) / 3);
      for (const [col, sh, th] of [[0x1a9cff, .0025, .05], [0x9a6cff, -.0025, .032]]) { if (low && sh < 0) continue; const h = new T.SkinnedMesh(o.geometry, hullMat(col, sh, th / sc)); h.bind(o.skeleton, o.bindMatrix); h.bindMode = o.bindMode; h.frustumCulled = false; h.renderOrder = 5; h.visible = false; h.position.copy(o.position); h.quaternion.copy(o.quaternion); h.scale.copy(o.scale); o.parent.add(h); hulls.push(h); } } }); }
  function detachBoss() { for (const h of hulls) { h.parent && h.parent.remove(h); h.material.dispose(); } hulls = []; hullRoot = null; anchorBones = []; }
  const M4 = new T.Matrix4(), Q = new T.Quaternion(), SV = new T.Vector3(), PV = new T.Vector3(), UP = new T.Vector3(0, 1, 0); let time = 0, shardT = 0; const cam = new T.Vector3();
  for (let i = 0; i < FN; i++) { M4.makeScale(0, 0, 0); fire.setMatrixAt(i, M4); fA[i * 3] = -99; fA[i * 3 + 1] = 1; }
  for (let i = 0; i < BL; i++) blobs.setMatrixAt(i, M4); for (let i = 0; i < SH; i++) shards.setMatrixAt(i, M4);
  const shardSt = Array.from({ length: SH }, (_, i) => ({ owner: i % 5, a: R3(i) * 6.283, h: R3(i + 3), r: .8 + R3(i + 5) * .9, sp: 1.5 + R3(i + 7) * 2.5, rise: .25 + R3(i + 9) * .5 }));
  function setTornado(k, x, y, z, rad, H, alpha, grow, spin, hot, wob) { const O = tors[k], on = alpha > .01; for (const m of [O.core, O.shell, O.band, O.base, O.glow]) m.visible = on; if (!on) return; O.shell.visible = !low;
    for (const m of [O.core, O.shell, O.band]) m.position.set(x, y, z); O.u.uRad.value = rad; O.u.uH.value = H; O.u.uA.value = alpha; O.u.uGrow.value = Math.max(.02, grow); O.u.uSpin.value = spin; O.u.uHot.value = hot; O.u.uWob.value = wob;
    O.base.position.set(x, y + .06, z); O.base.scale.setScalar(rad * 6.5 * (.5 + .5 * grow)); O.bu.uA.value = alpha * Math.min(1, grow * 1.4); O.bu.uSpin.value = spin;
    O.glow.visible = !low; O.glowU.uC.value.set(x, y + H * .45 * grow, z); O.glowU.uSz.value.set(rad * 8.5, H * 1.2 * grow + 1.5); O.glowU.uA.value = .34 * alpha; }
  const api = {
    root, attachBoss, detachBoss,
    /** ctx {camera, boss:{x,y,z,h}, low} */
    update(seq, ctx, dt) {
      time += dt; uTime.value = time; cam.copy(ctx.camera.position); const st = seq && seq.st, T2 = seq ? seq.T : null, live = !!(st && !st.done);
      // aura
      const ai = live ? st.aura : 0; auraU.uInt.value = ai; tongues.visible = ai > .02 && anchorBones.length > 0;
      if (tongues.visible) anchorBones.forEach((b, k) => { if (b) b.getWorldPosition(anchorU[k]); else anchorU[k].set(ctx.boss.x, ctx.boss.y + ctx.boss.h * .6, ctx.boss.z); });
      for (const h of hulls) { h.visible = ai > .02; h.material.uniforms.uInt.value = ai * (h.material.uniforms.uShift.value < 0 ? .35 : .75); }
      bodyGlow.visible = ai > .02; if (bodyGlow.visible) { bodyGlowU.uC.value.set(ctx.boss.x, ctx.boss.y + ctx.boss.h * .55, ctx.boss.z); bodyGlowU.uSz.value.set(ctx.boss.h * 1.3, ctx.boss.h * 1.55); bodyGlowU.uA.value = .26 * ai; }
      if (!live) { mandala.visible = false; groundGlow.visible = false; under.visible = false; for (const s of sats) s.m.visible = false; for (let k = 0; k < 5; k++) setTornado(k, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0); shards.visible = blobs.visible = blobGlow.visible = ring.visible = ring2.visible = flash.visible = false; }
      else {
        const t = st.t, p0 = st.p0, fadeAll = 1 - sm((t - T2.blastAt + .05) / .25) * (t < T2.blastAt + .3 ? 1 : 1);
        // mandala: desenhada e depois sustentada; some na explosão
        const prog = st.draw, mandA = Math.min(1, prog * 3) * (1 - sm((t - T2.megaEnd) / (T2.implodeEnd - T2.megaEnd)) * .85) * (t > T2.blastAt ? 0 : 1);
        mandala.visible = mandA > .01; mandala.position.set(p0.x, p0.y + .05, p0.z); const MS = T2.R / .985 * 2; mandala.scale.set(MS, 1, MS); mandala.rotation.y = time * .03; mainU.uProg.value = prog; mainU.uA.value = mandA * (1 - .45 * sm((t - T2.spawnEnd) / 1.2)); under.visible = mandA > .01; under.position.set(p0.x, p0.y + .025, p0.z); under.scale.set(MS * 1.18, 1, MS * 1.18); undU.uA.value = .72 * Math.min(1, mandA * 1.5) * Math.min(1, prog * 3); groundGlow.visible = mandA > .01; groundGlow.position.set(p0.x, p0.y + .03, p0.z); groundGlow.scale.set(MS * 1.25, 1, MS * 1.25); ggU.uA.value = .5 * mandA * prog;
        mainU.uPulse.value = t > T2.implodeEnd ? sm((t - T2.implodeEnd) / (T2.blastAt - T2.implodeEnd)) * (t < T2.blastAt ? 1 : 0) : 0;
        st.sats.forEach((s, i) => { const S2 = sats[i], k = clamp01((prog - .55) / .45); S2.m.visible = mandA > .01 && k > 0; S2.m.position.set(s.x, p0.y + .06, s.z); S2.m.scale.set(T2.satR * 2, 1, T2.satR * 2); S2.m.rotation.y = -time * .25 + i; S2.u.uProg.value = k; S2.u.uA.value = mandA * (1 - .55 * sm((t - T2.approachAt) / 1.5)); S2.u.uPulse.value = st.torn[i] ? (st.torn[i].grow > 0 && st.torn[i].grow < 1 ? .6 : 0) : 0; });
        // tornados
        st.torn.forEach((o, k) => { const H = T2.tornH * (.35 + .65 * o.grow) * o.scale, rad = .95 * o.scale; setTornado(k, o.x, o.y, o.z, rad, H, o.alpha * Math.min(1, o.grow * 2), o.grow, 3.2 + 1.2 * (t > T2.approachAt ? 1 : 0), t > T2.approachEnd ? .3 : 0, 1); });
        const M = st.mega, im = st.implode, mA = M.alpha * (1 - sm((im - .75) / .25)); setTornado(4, p0.x, p0.y, p0.z, .95 * M.scale * (1 - .7 * im), T2.tornH * (.6 + .4 * M.scale / T2.megaScale) * 2.5 * (1 - .85 * im), mA, 1, 3 + 3 * clamp01((t - T2.mergeEnd) / 2.6) + 6 * im, .2 + .8 * im, .8);
        // destroços orbitando (cada lote segue seu tornado)
        shards.visible = true; for (let i = 0; i < SH; i++) { const s = shardSt[i]; let ox, oz, oy, rad, H, al; if (s.owner < 4) { const o = st.torn[s.owner]; ox = o.x; oz = o.z; oy = o.y; rad = o.scale; H = T2.tornH * o.grow; al = o.alpha * o.grow; } else { ox = p0.x; oz = p0.z; oy = p0.y; rad = M.scale * (1 - im); H = T2.tornH * 2.2 * (1 - im); al = mA; }
          s.a += dt * s.sp * (1 + 2 * im); s.h = (s.h + dt * s.rise * .18) % 1; const r = (s.r + 1.6 * s.h) * rad * (1 - .6 * im); if (al < .1) { M4.makeScale(0, 0, 0); shards.setMatrixAt(i, M4); shD[i * 4] = 0; continue; }
          M4.compose(PV.set(ox + Math.cos(s.a) * r, oy + .2 + s.h * H, oz + Math.sin(s.a) * r), Q.setFromAxisAngle(SV.set(R3(i), 1, R3(i + 1)).normalize(), time * 3 + i), SV.setScalar(.6 + R3(i + 2) * 1.2)); shards.setMatrixAt(i, M4); shD[i * 4] = al; }
        shards.instanceMatrix.needsUpdate = true; shardG.attributes.aD.needsUpdate = true;
        // faíscas e poeira
        st.torn.forEach((o, k) => { if (o.alpha * o.grow > .3 && R3(time * 31 + k) > (low ? .6 : .3)) { const a = R3(time * 7 + k) * 6.283, r = 1.2 + R3(time * 3 + k) * 1.5; emit(o.x + Math.cos(a) * r, o.y + .3 + R3(time * 5) * T2.tornH * o.grow, o.z + Math.sin(a) * r, -Math.sin(a) * 4, 1.5 + R3(time) * 2, Math.cos(a) * 4, .5, .85, 1, .8); } });
        if (mA > .2) for (let q = 0; q < (low ? 2 : 5); q++) { const a = R3(time * 17 + q) * 6.283, r = 3 + R3(time * 19 + q) * 9; emit(p0.x + Math.cos(a) * r, p0.y + .3 + R3(time * 23 + q) * 2, p0.z + Math.sin(a) * r, (-Math.cos(a) * 1.5 - Math.sin(a)) * r * .6, 1.5 + 4 * im, (-Math.sin(a) * 1.5 + Math.cos(a)) * r * .6, .45, .8, 1, .9); }
        // explosão (UM evento): lóbulos, anel largo, onda no chão, flash contido
        const age = t - T2.blastAt;
        if (age >= 0 && age < 2.2) { const g = sm(age / .5), fade = 1 - sm((age - .9) / 1.2), R = T2.blastR * .62; blobs.visible = true;
          for (let i = 0; i < BL; i++) { const b = blLayout[i], rr = R * (.35 + .75 * g) * (1 + .06 * Math.sin(age * 3 + i)), sy = Math.sin(b.el), y = R * (.2 + .75 * g) * (.5 + .5 * sy) + sy * rr * .35; const wide = 1.05 + .35 * sy; /* copa mais larga que a base */ const hx = Math.cos(b.a) * b.r * rr * wide, hz = Math.sin(b.a) * b.r * rr * wide;
            let px = hx, py = Math.max(.2, y), pz = hz, heat = fade * (1.1 - .3 * sm((age - .3) / 1)) * (.7 + .55 * (1 - b.r) + .25 * Math.max(0, Math.cos(b.a - Math.atan2(cam.x - p0.x, cam.z - p0.z) + Math.PI / 2))); /* centro e frente mais quentes */
            if (b.col) { const cr = R * (.5 + .8 * g) * 1.2; px = Math.cos(b.a + age * .2) * cr; pz = Math.sin(b.a + age * .2) * cr; py = R * (.3 + .82 * g) + Math.sin(b.a * 3) * R * .05; heat *= .9; } /* colarinho de lóbulos na copa */
            M4.compose(PV.set(p0.x + px, p0.y + py, p0.z + pz), Q.identity(), SV.setScalar(R * b.s * (.45 + .85 * g) * (1 - .45 * sm((age - 1) / 1.1)))); blobs.setMatrixAt(i, M4); blHeat[i] = heat; }
          blobs.instanceMatrix.needsUpdate = true; ico.attributes.aHeat.needsUpdate = true; blobGlow.visible = !low; blobGlowU.uA.value = fade;
          ring.visible = true; ring.position.set(p0.x, p0.y + R * 1.05, p0.z); ring.rotation.set(.22, 0, .1); const rk = sm(age / .6); ring.scale.set(R * (2.4 + 3.2 * rk), 1, R * (2.4 + 3.2 * rk)); ringU.uA.value = (1 - sm((age - .55) / .9)) * 1.3; ringU.uW.value = .06 + .03 * rk;
          ring2.visible = true; ring2.position.set(p0.x, p0.y + .08, p0.z); const r2 = sm(age / .9); ring2.scale.set(R * (1 + 4.5 * r2), 1, R * (1 + 4.5 * r2)); ring2U.uA.value = (1 - sm((age - .3) / .9)) * .8;
          flash.visible = age < 1.8; flashU.uC.value.set(p0.x, p0.y + R * .9, p0.z); const fsz = R * (4 + 2.5 * sm(age / .6)); flashU.uSz.value.set(fsz * 1.3, fsz); flashU.uA.value = age < .25 ? .65 : .42 * (1 - sm((age - .9) / .9)); /* halo ciano em volta da massa */
          if (st._boomEmit !== true) { st._boomEmit = true; for (let q = 0; q < (low ? 60 : 140); q++) { const a = R3(q * 1.3) * 6.283, el = R3(q * 2.7) * 1.3, sp = 8 + R3(q * 3.1) * 16; emit(p0.x, p0.y + 1, p0.z, Math.cos(a) * Math.cos(el) * sp, Math.sin(el) * sp, Math.sin(a) * Math.cos(el) * sp, .6, .9, 1, 1 + R3(q) * .9); } } }
        else { blobs.visible = blobGlow.visible = ring.visible = ring2.visible = flash.visible = false; }
      }
      // fogo azul: cada segmento tem um slot; some exatamente no fim da vida (mesmo instante em que perde o dano)
      const fs = live ? st.fires : [], seen = new Set();
      for (const f of fs) { seen.add(f.id); if (!fireSlots.has(f.id)) { let slot = fireNext++ % FN; fireSlots.set(f.id, slot); const s = f.big ? 2.4 + R3(f.id) * 1.4 : 1.7 + R3(f.id) * .9;
          for (const [k, v] of fireSlots) if (v === slot && k !== f.id) fireSlots.delete(k);
          M4.compose(PV.set(f.x, f.y, f.z), Q.setFromAxisAngle(UP, R3(f.id * 3) * 3), SV.set(s * (f.big ? 1.9 : 1.5), s, s * (f.big ? 1.9 : 1.5))); fire.setMatrixAt(slot, M4); fA.set([time - (st.t - f.born), f.life, R3(f.id)], slot * 3); } }
      for (const [id, slot] of fireSlots) if (!seen.has(id)) { fA[slot * 3] = -99; M4.makeScale(0, 0, 0); fire.setMatrixAt(slot, M4); fireSlots.delete(id); }
      fire.visible = fireSlots.size > 0; fire.instanceMatrix.needsUpdate = true; fireG.attributes.aF.needsUpdate = true;
      for (let i = 0; i < PN; i++) { if (pL[i * 2] <= 0) { pC[i * 4 + 3] = 0; continue; } pL[i * 2] -= dt; const k = pL[i * 2] / pL[i * 2 + 1]; pV[i * 3 + 1] -= 3 * dt; for (let q = 0; q < 3; q++) pP[i * 3 + q] += pV[i * 3 + q] * dt; pV[i * 3] *= .97; pV[i * 3 + 2] *= .97; pC[i * 4 + 3] = Math.max(0, k); }
      ptG.attributes.position.needsUpdate = true; ptG.attributes.aC.needsUpdate = true;
    },
    clear() { mandala.visible = false; groundGlow.visible = false; under.visible = false; for (const s of sats) s.m.visible = false; for (let k = 0; k < 5; k++) setTornado(k, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0); shards.visible = blobs.visible = blobGlow.visible = ring.visible = ring2.visible = flash.visible = fire.visible = tongues.visible = bodyGlow.visible = false; for (const h of hulls) h.visible = false;
      for (const [, slot] of fireSlots) { M4.makeScale(0, 0, 0); fire.setMatrixAt(slot, M4); } fireSlots.clear(); pL.fill(0); pC.fill(0); },
    dispose() { detachBoss(); scene.remove(root); for (const g of geos) g.dispose(); for (const m of mats) m.dispose(); for (const t of texs) t.dispose(); }
  };
  return api;
}
