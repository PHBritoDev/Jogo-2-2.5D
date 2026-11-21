/**
 * MISSÃO 21/11 — desenho da “Fera dos Mil Olhos” (ZAR'KHAEL) e da CÚPULA de energia rasgada. Só visual: a lógica
 * (zarkhael-beast3d.js) decide fases, dano e debuff; aqui cada quadro lê o estado público da fera.
 *
 * Fera (ref. GIF do criador): quadrúpede alongado de lâminas negras. Tudo é malha 3D real, sem sprite/imagem:
 *  • corpo: massas orgânicas deformadas ao longo de uma coluna procedural (ondulação lateral + galope);
 *  • ~46 placas-lâmina pontiagudas com gume prateado (instanciadas), quase todas com um OLHO convexo;
 *  • olhos: calota amendoada com shader polar — íris rubi com ESPIRAL lenta (sin(nθ + fr − vt)), pupila em fenda,
 *    contorno claro; fase própria por instância, sem luz dinâmica;
 *  • cabeça: crânio + maxila e mandíbula SEPARADAS com dobradiça (abrem ~95°), palato/língua vermelhos, membranas
 *    laterais e garganta que fecham a cavidade, 2 arcadas de dentes finos instanciados (2 fileiras + caninos);
 *  • 4 patas de 3 segmentos com IK de 2 ossos e garras; marcha de galope pela distância realmente percorrida;
 *  • fitas de sombra rasgadas presas ao corpo (histórico de posições), nunca um plano fixo.
 * Cúpula (ref. foto do criador): hemisfério deslocado por ruído, rampa coral/laranja → rosa → lilás/azul no Fresnel,
 * rasgos negros anisotrópicos que crescem, núcleo quente, anel de estilhaços negros e chamas lilases no chão.
 * Orçamento: 12 draws na fera, 4 na cúpula; zero alocação por quadro; descarte completo em dispose().
 */
const NOISE = `
float h31(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float vnoise(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
 return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x),mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y),
            mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x),mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x),f.y),f.z);}`;
const FLESH_V = `attribute float aEdge;attribute float aRed;varying vec3 vN,vW,vL;varying float vEdge,vRed,vSeed;
void main(){mat4 im=mat4(1.);
#ifdef USE_INSTANCING
im=instanceMatrix;
#endif
vec4 wp=modelMatrix*im*vec4(position,1.);vN=normalize(mat3(modelMatrix)*mat3(im)*normal);vW=wp.xyz;vL=position;vEdge=aEdge;vRed=aRed;
vSeed=fract((im[3].x+im[3].z)*3.17);gl_Position=projectionMatrix*viewMatrix*wp;}`;
const FLESH_F = `uniform float uBurn,uTime,uGlow;uniform vec3 uRim;varying vec3 vN,vW,vL;varying float vEdge,vRed,vSeed;${NOISE}
void main(){vec3 V=normalize(cameraPosition-vW),N=normalize(vN);if(!gl_FrontFacing)N=-N;vec3 Ld=normalize(vec3(.35,.9,.25));
float ndl=max(dot(N,Ld),0.),fr=pow(1.-max(dot(N,V),0.),3.);vec3 H=normalize(V+Ld);float sp=pow(max(dot(N,H),0.),46.);
float fr2=pow(1.-max(dot(N,V),0.),2.2);vec3 col=vec3(.03,.024,.036)+vec3(.085,.07,.1)*ndl+sp*vec3(.7,.64,.78)+fr2*uRim*.75;
col+=smoothstep(.74,1.,vEdge)*vec3(.85,.82,.9)*(.45+.55*ndl+fr); // gume prateado das lâminas (ref.: contorno claro)
float rg=.55+.45*smoothstep(.2,.8,abs(fract(vL.z*16.+vL.x*3.)-.5)*2.);vec3 mouth=vec3(.16,.004,.014)*(.35+.65*ndl)*rg+vec3(.42,.02,.04)*fr*.8+vec3(.6,.05,.06)*sp+uGlow*vec3(.1,0.,.01);col=mix(col,mouth,vRed); // boca/garganta: carne escura com sulcos
float n=vnoise(vL*7.+vSeed*19.)*.7+vnoise(vL*19.)*.3;
if(uBurn>0.){if(n<uBurn*1.12-.04)discard;col=mix(col,vec3(1.,.16,.08)*1.7,smoothstep(uBurn*1.12+.1,uBurn*1.12-.04,n));}
gl_FragColor=vec4(col,1.);}`;
const EYE_V = `attribute float aPhase;varying vec2 vP;varying float vPh;varying vec3 vL;
void main(){mat4 im=mat4(1.);
#ifdef USE_INSTANCING
im=instanceMatrix;
#endif
vP=position.xy;vL=position;vPh=fract((im[3].x*7.1+im[3].y*3.3+im[3].z*5.7));gl_Position=projectionMatrix*viewMatrix*modelMatrix*im*vec4(position,1.);}`;
const EYE_F = `uniform float uTime,uBurn,uLid;varying vec2 vP;varying float vPh;varying vec3 vL;${NOISE}
void main(){vec2 p=vP;float r=length(p),a=atan(p.y,p.x);
float sw=sin(5.*a+15.*r-uTime*1.7+vPh*6.283);float sw2=sin(3.*a-9.*r+uTime*.9+vPh*4.);
float iris=1.-smoothstep(.6,.66,r),rim=smoothstep(.84,.94,r);
vec3 scl=vec3(.03,.0,.006)+vec3(.22,0.,.01)*pow(1.-r,2.)*.6;
vec3 ir=mix(vec3(.28,0.,.02),vec3(1.,.06,.07),smoothstep(-.25,.7,sw))*(1.25-r*.7);ir=mix(ir,ir*.45,smoothstep(.5,1.,sw2)*.6);
vec3 col=mix(scl,ir,iris);col+=vec3(1.,.4,.36)*(1.-smoothstep(0.,.2,r))*.65; // centro rubi
col+=vec3(.55,0.,.03)*smoothstep(.66,.74,r)*(1.-smoothstep(.74,.86,r))*.5; // halo discreto
float pup=1.-smoothstep(.055,.1,length(vec2(p.x*2.8,p.y*.85)));col=mix(col,vec3(.0),pup*.92);
col=mix(col,vec3(.8,.76,.82),rim);if(abs(p.y)>uLid)discard;
if(uBurn>0.){float n=vnoise(vL*12.+vPh*30.);if(n<uBurn*1.1)discard;}
gl_FragColor=vec4(col,1.);}`;
const TOOTH_F = `uniform float uBurn;varying vec3 vN,vW,vL;varying float vEdge,vRed,vSeed;${NOISE}
void main(){vec3 N=normalize(vN),V=normalize(cameraPosition-vW);float ndl=max(dot(N,normalize(vec3(.35,.9,.25))),0.),fr=pow(1.-abs(dot(N,V)),2.);
vec3 bone=mix(vec3(.42,.05,.06),vec3(.93,.9,.84),smoothstep(.05,.45,vL.y));vec3 col=bone*(.35+.65*ndl)+fr*vec3(.25,.2,.2);
if(uBurn>0.&&vnoise(vL*30.+vSeed*9.)<uBurn*1.1)discard;gl_FragColor=vec4(col,1.);}`;
const TRAIL_V = `attribute float aU;attribute float aA;varying float vU,vA;varying vec3 vW;void main(){vU=aU;vA=aA;vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`;
const TRAIL_F = `uniform float uTime;varying float vU,vA;varying vec3 vW;${NOISE}
void main(){float side=abs(vA*2.-1.);float n=vnoise(vec3(vU*9.-uTime*2.,vA*5.,vW.y*3.))*.65+vnoise(vec3(vU*27.,vA*13.,uTime))*.35;
float a=(1.-vU)*(1.-smoothstep(.35,1.,side+n*.55))*.82;if(a<.04)discard;
vec3 col=vec3(.012,.008,.014)+vec3(.55,.02,.03)*smoothstep(.82,.95,n)*(1.-vU);gl_FragColor=vec4(col,a);}`;
const DOME_V = `uniform float uR,uTime,uSeed;varying vec3 vP,vN,vW;${NOISE}
void main(){vec3 p=position;float n=vnoise(p*2.3+vec3(0.,uTime*.7,uSeed))*.6+vnoise(p*5.7-uTime*.9)*.4;
vec3 q=p*(1.+(n-.45)*.17*smoothstep(0.,.15,p.y));q.y*=.84;vec4 w=modelMatrix*vec4(q*uR,1.);vP=p;vN=normalize(mat3(modelMatrix)*normal);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`;
const DOME_F = `uniform float uTime,uRip,uDis,uAlpha,uHot,uSeed;varying vec3 vP,vN,vW;${NOISE}
void main(){vec3 V=normalize(cameraPosition-vW),N=normalize(vN);float fr=pow(1.-abs(dot(N,V)),1.7);float ang=atan(vP.z,vP.x),h=vP.y;
float u=ang+h*1.9+uTime*.3,v=ang-h*2.7;float warp=vnoise(vP*3.+uSeed+uTime*.25);
float st=vnoise(vec3(u*1.3,v*8.5+warp*2.6,uSeed)),jag=vnoise(vec3(u*15.,v*34.,uSeed+1.)),seg=vnoise(vec3(u*2.4,v*1.8,uSeed+3.));
float rips=st*.72+jag*.22+(seg-.5)*.38;float th=.69-uRip;float black=smoothstep(th,th+.018,rips); // pinceladas negras diagonais
float pz=vnoise(vP*3.4+uSeed*2.+uTime*.2),n3=vnoise(vP*14.-uTime*.7);
vec3 inner=mix(vec3(.42,.2,.92),vec3(.95,.3,.68),smoothstep(.38,.6,pz));inner=mix(inner,vec3(1.,.5,.26),smoothstep(.64,.8,pz)*(1.-h*.6));
float core=(1.-fr)*smoothstep(.7,.0,h);vec3 col=mix(inner,vec3(1.,.55,.25)*1.2,core*.6);
col=mix(col,vec3(.6,.45,1.)*1.05,smoothstep(.45,.84,fr));col=mix(col,vec3(.62,.72,1.)*1.3,smoothstep(.86,1.,fr));
col+=vec3(1.,.8,.95)*smoothstep(.66,.82,n3)*.14*(1.-fr);col*=1.+uHot*.45*(1.-fr);col=min(col,vec3(1.));col+=vec3(.75,.66,1.)*smoothstep(.16,0.,h)*.75;
float edge=smoothstep(th-.07,th,rips)*(1.-black);col=mix(col,vec3(.025,.0,.04),black)+edge*vec3(1.,.5,1.)*.5;
if(uDis>0.&&(pz*.5+n3*.25+jag*.25)<uDis)discard;gl_FragColor=vec4(col,uAlpha*mix(.88,.97,black));}`;
const CORE_F = `uniform float uHot,uAlpha;varying vec3 vP,vN,vW;void main(){vec3 V=normalize(cameraPosition-vW);float f=abs(dot(normalize(vN),V));
vec3 c=mix(vec3(1.,.35,.2),vec3(1.,.86,.62),f);gl_FragColor=vec4(c*f*(.6+uHot)*uAlpha,1.);}`;
const RING_F = `uniform float uTime,uAlpha;varying vec2 vUv;${NOISE}
void main(){vec2 p=vUv*2.-1.;float r=length(p),a=atan(p.y,p.x);float band=1.-smoothstep(.0,.35,abs(r-.82));
float fl=vnoise(vec3(a*7.,r*6.-uTime*3.,uTime*.7))*.7+vnoise(vec3(a*19.,r*12.,uTime*2.))*.3;float m=band*smoothstep(.35,.75,fl+band*.25);
vec3 c=mix(vec3(.5,.35,1.),vec3(.85,.9,1.),smoothstep(.6,.95,fl));gl_FragColor=vec4(c*m*uAlpha*1.3,1.);}`;

const clamp = (v, a, b) => v < a ? a : v > b ? b : v, ease = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const outCubic = x => 1 - Math.pow(1 - clamp(x, 0, 1), 3);

export function createZarkhaelBeastVFX(T, scene) {
  const root = new T.Group(); root.name = 'ZarkhaelFeraVFX'; scene.add(root); let time = 0;
  const geos = [], mats = [];
  const keep = (g) => (geos.push(g), g), keepM = (m) => (mats.push(m), m);
  /* -------- geometria auxiliar -------- */
  function attrs(g, edge = 0, red = 0) { const n = g.attributes.position.count; if (!g.attributes.aEdge) g.setAttribute('aEdge', new T.BufferAttribute(new Float32Array(n).fill(edge), 1)); if (!g.attributes.aRed) g.setAttribute('aRed', new T.BufferAttribute(new Float32Array(n).fill(red), 1)); return g; }
  function merge(list) { let nv = 0, ni = 0; for (const g of list) { nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
    const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), E = new Float32Array(nv), R = new Float32Array(nv), I = new Uint32Array(ni); let ov = 0, oi = 0;
    for (const g of list) { const c = g.attributes.position.count; P.set(g.attributes.position.array, ov * 3); N.set(g.attributes.normal.array, ov * 3); E.set(g.attributes.aEdge.array, ov); R.set(g.attributes.aRed.array, ov);
      if (g.index) for (let i = 0; i < g.index.count; i++) I[oi++] = g.index.array[i] + ov; else for (let i = 0; i < c; i++) I[oi++] = i + ov; ov += c; g.dispose(); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(P, 3)); g.setAttribute('normal', new T.BufferAttribute(N, 3)); g.setAttribute('aEdge', new T.BufferAttribute(E, 1)); g.setAttribute('aRed', new T.BufferAttribute(R, 1)); g.setIndex(new T.BufferAttribute(I, 1)); return g; }
  /** Loft fechado: seções (anel de pontos [x,y]) ao longo de z; red(i,j) marca palato/língua. */
  function loft(stations, ring, red = () => 0) { const S = stations.length, M = ring(0, 0).length, P = [], R = [], I = [];
    for (let i = 0; i < S; i++) { const u = i / (S - 1), pts = ring(u, stations[i]); for (let j = 0; j < M; j++) { P.push(pts[j][0], pts[j][1], stations[i]); R.push(red(u, j)); } }
    for (let i = 0; i < S - 1; i++) for (let j = 0; j < M; j++) { const a = i * M + j, b = i * M + (j + 1) % M, c = a + M, d = b + M; I.push(a, c, b, b, c, d); }
    const cap = (i, flip) => { const base = P.length / 3; let cx = 0, cy = 0; for (let j = 0; j < M; j++) { cx += P[(i * M + j) * 3]; cy += P[(i * M + j) * 3 + 1]; } P.push(cx / M, cy / M, stations[i]); R.push(red(i / (S - 1), 0));
      for (let j = 0; j < M; j++) { const a = i * M + j, b = i * M + (j + 1) % M; if (flip) I.push(base, b, a); else I.push(base, a, b); } };
    cap(0, true); cap(S - 1, false);
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setIndex(I); g.computeVertexNormals(); g.setAttribute('aRed', new T.Float32BufferAttribute(R, 1)); return attrs(g); }
  const zs = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));
  /* -------- materiais -------- */
  const U = { uBurn: { value: 0 }, uTime: { value: 0 }, uGlow: { value: 0 }, uRim: { value: new T.Color(0x8c8098) } };
  const flesh = keepM(new T.ShaderMaterial({ uniforms: U, vertexShader: FLESH_V, fragmentShader: FLESH_F, side: T.DoubleSide }));
  const eyeU = { uTime: U.uTime, uBurn: U.uBurn, uLid: { value: 1 } };
  const eyeMat = keepM(new T.ShaderMaterial({ uniforms: eyeU, vertexShader: EYE_V, fragmentShader: EYE_F }));
  const toothMat = keepM(new T.ShaderMaterial({ uniforms: { uBurn: U.uBurn }, vertexShader: FLESH_V, fragmentShader: TOOTH_F }));
  /* -------- placa-lâmina (folha pontiaguda com nervura, gume = aEdge 1) -------- */
  const plateGeo = keep((() => { const SN = 13, CN = 7, P = [], E = [], I = [];
    const w = s => .5 * (s < .32 ? Math.sin(s / .32 * Math.PI / 2) ** .8 : Math.pow((1 - s) / .68, 1.15)) + .04 * (1 - s);
    for (let side = 0; side < 2; side++) for (let i = 0; i < SN; i++) for (let j = 0; j < CN; j++) { const s = i / (SN - 1), c = j / (CN - 1) * 2 - 1, th = .07 * (1 - c * c) * (1 - s * .7);
      P.push(c * w(s), (side ? -th * .55 : th) + .16 * s * s, s); E.push(Math.abs(c)); }
    for (let side = 0; side < 2; side++) { const o = side * SN * CN; for (let i = 0; i < SN - 1; i++) for (let j = 0; j < CN - 1; j++) { const a = o + i * CN + j, b = a + 1, c = a + CN, d = c + 1; if (side) I.push(a, b, c, b, d, c); else I.push(a, c, b, b, c, d); } }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setIndex(I); g.computeVertexNormals(); g.setAttribute('aEdge', new T.Float32BufferAttribute(E, 1)); return attrs(g); })());
  /* -------- massa orgânica (icosaedro deformado) -------- */
  const lumpGeo = keep((() => { const g = new T.IcosahedronGeometry(1, 2), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + .13 * Math.sin(x * 5.1 + z * 3.3) * Math.cos(y * 4.2) + .06 * Math.sin(z * 9 + x * 7); p.setXYZ(i, x * k, y * k * (y < 0 ? .85 : 1), z * k); } g.computeVertexNormals(); return attrs(g); })());
  /* -------- segmento de pata (prisma afilado com crista) e garra curva -------- */
  const limbGeo = keep((() => { const g = new T.CylinderGeometry(.55, 1, 1, 6, 3); g.translate(0, .5, 0); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i), z = p.getZ(i); if (z < -.3) p.setZ(i, z - .5 * Math.sin(Math.PI * y)); } g.computeVertexNormals(); return attrs(g); })());
  const clawGeo = keep((() => { const g = new T.ConeGeometry(.5, 1, 5, 4); g.translate(0, .5, 0); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setZ(i, p.getZ(i) + .55 * y * y); } g.computeVertexNormals(); return attrs(g, .9); })());
  const toothGeo = keep((() => { const g = new T.ConeGeometry(1, 1, 5, 3); g.translate(0, .5, 0); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setZ(i, p.getZ(i) - .35 * y * y); } g.computeVertexNormals(); return attrs(g); })());
  /* -------- olho: calota convexa amendoada (encara +Z), xy normalizado em [-1,1] -------- */
  const eyeGeo = keep((() => { const g = new T.SphereGeometry(1, 14, 7, 0, Math.PI * 2, 0, Math.PI * .34); g.rotateX(Math.PI / 2); const p = g.attributes.position, R0 = Math.sin(Math.PI * .34);
    for (let i = 0; i < p.count; i++) { const x = p.getX(i) / R0, y = p.getY(i) / R0, zc = p.getZ(i) - Math.cos(Math.PI * .34); p.setXYZ(i, x, y * Math.pow(Math.max(0, 1 - x * x), .3), zc * 1.6); } g.computeVertexNormals(); return g; })());
  /* -------- cabeça: crânio+maxila (grupo superior) e mandíbula (grupo inferior) -------- */
  const LJ = .66;
  const upperGeo = keep(merge([
    loft(zs(-.26, LJ, 16), (u, z) => { const t = clamp(z / LJ, 0, 1), w = z < 0 ? .19 + .05 * Math.sin((z + .26) / .26 * Math.PI) : .19 * Math.pow(1 - t, .55) + .028, h = z < 0 ? .27 : .2 * Math.pow(1 - t, .7) + .035, hook = .05 * Math.pow(t, 6);
      return [[-w, -hook], [-w * .98, h * .35], [-w * .78, h * .78], [-w * .35, h * 1.02], [0, h * 1.08], [w * .35, h * 1.02], [w * .78, h * .78], [w * .98, h * .35], [w, -hook], [w * .55, .004 - hook], [-w * .55, .004 - hook]]; },
    (u, j) => j >= 9 ? 1 : 0),
  ]));
  const lowerGeo = keep(merge([
    loft(zs(-.08, LJ * .96, 14), (u, z) => { const t = clamp(z / LJ, 0, 1), w = .17 * Math.pow(1 - t, .5) + .026, d = .13 * Math.pow(1 - t * .85, .8) + .025;
      return [[-w, 0], [-w * .45, -.004], [w * .45, -.004], [w, 0], [w * .95, -d * .45], [w * .6, -d * .9], [0, -d], [-w * .6, -d * .9], [-w * .95, -d * .45]]; },
    (u, j) => j <= 2 ? 1 : 0),
    attrs((() => { const g = loft(zs(-.02, LJ * .7, 8), (u, z) => { const w = .075 * (1 - u * .6), h = .03; return [[-w, 0], [0, h], [w, 0], [0, -.01]]; }); g.translate(0, .0, 0); g.attributes.aRed.array.fill(1); return g; })())
  ]));
  /* -------- montagem -------- */
  const rig = new T.Group(); rig.visible = false; root.add(rig);
  const inst = new T.Group(); inst.visible = false; root.add(inst); // instâncias guardam matriz de MUNDO: ficam fora do rig (sem transformação dupla)
  const head = new T.Group(), upper = new T.Group(), lower = new T.Group(); rig.add(head); head.add(upper, lower);
  const upperMesh = new T.Mesh(upperGeo, flesh), lowerMesh = new T.Mesh(lowerGeo, flesh); upper.add(upperMesh); lower.add(lowerMesh);
  // garganta: cone aberto voltado para trás, interior vermelho-negro
  const gulletGeo = keep(attrs((() => { const g = new T.CylinderGeometry(.16, .06, .34, 12, 1, true); g.rotateX(-Math.PI / 2); g.translate(0, -.02, -.12); return g; })(), 0, 1));
  const gullet = new T.Mesh(gulletGeo, flesh); head.add(gullet);
  // membranas laterais (dinâmicas): K pares superior/inferior por lado
  const MK = 7, memPos = new Float32Array(2 * 2 * MK * 3), memIdx = [];
  for (let s = 0; s < 2; s++) for (let i = 0; i < MK - 1; i++) { const o = s * 2 * MK, a = o + i * 2, b = a + 1, c = a + 2, d = a + 3; memIdx.push(a, b, c, b, d, c); }
  const memGeo = keep(new T.BufferGeometry()); memGeo.setAttribute('position', new T.BufferAttribute(memPos, 3).setUsage(T.DynamicDrawUsage)); memGeo.setIndex(memIdx);
  memGeo.setAttribute('normal', new T.BufferAttribute(new Float32Array(memPos.length).fill(0).map((_, i) => i % 3 === 0 ? 1 : 0), 3)); attrs(memGeo, 0, 1);
  const membrane = new T.Mesh(memGeo, flesh); membrane.frustumCulled = false; head.add(membrane);
  // dentes: 2 fileiras alternadas + caninos, por arcada (malhas reais instanciadas)
  function teeth(top) { const L = []; const edge = (t, inner) => { const z = -.02 + t * (LJ - .05), w = (top ? .19 * Math.pow(1 - z / LJ, .55) + .028 : .17 * Math.pow(1 - z / LJ, .5) + .026) - (inner ? .045 : .012); return [w, z]; };
    for (const s of [-1, 1]) { for (let i = 0; i < 19; i++) { const t = (i + .5) / 19, [w, z] = edge(t, false), big = (i === 15 || i === 4); L.push({ x: s * w, z, h: (big ? .135 : .055 + .03 * ((i * 7) % 3) / 2) * (top ? 1 : .9), r: big ? .02 : .011, tilt: s * .18 }); }
      for (let i = 0; i < 13; i++) { const t = (i + 1) / 15, [w, z] = edge(t, true); L.push({ x: s * w, z, h: .04 + .018 * ((i * 5) % 3) / 2, r: .008, tilt: -s * .12 }); } }
    for (const s of [-1, 1]) L.push({ x: s * .035, z: LJ - .035, h: .07, r: .012, tilt: s * .05 });
    const m = new T.InstancedMesh(toothGeo, toothMat, L.length), M = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler();
    L.forEach((d, i) => { e.set(top ? Math.PI : 0, 0, d.tilt * (top ? -1 : 1)); q.setFromEuler(e); M.compose(new T.Vector3(d.x, top ? -.004 : .004 - .002, d.z), q, new T.Vector3(d.r, d.h, d.r)); m.setMatrixAt(i, M); });
    m.frustumCulled = false; return m; }
  const teethU = teeth(true), teethL = teeth(false); upper.add(teethU); lower.add(teethL);
  /* ---- coluna: juntas em repouso (local da fera, z para frente) ---- */
  const SP = [[.62, .84], [.38, .88], [.12, .84], [-.18, .76], [-.48, .74], [-.78, .67], [-1.04, .6], [-1.28, .53], [-1.5, .46], [-1.72, .4], [-1.92, .34]];
  const LUMPS = [[0, .24, .23, .25], [1, .33, .32, .33], [2, .36, .34, .4], [3, .3, .27, .36], [4, .31, .29, .32], [5, .2, .19, .27], [6, .15, .15, .22], [7, .11, .11, .2], [8, .085, .085, .18], [9, .06, .06, .15], [10, .04, .04, .11]];
  const lumps = new T.InstancedMesh(lumpGeo, flesh, LUMPS.length + 6); lumps.frustumCulled = false; lumps.instanceMatrix.setUsage(T.DynamicDrawUsage); inst.add(lumps);
  // placas: [junta ou 'h' (cabeça), x, y, z, pitch, yaw, roll, comprimento, largura, olho?]
  const PL = [];
  // crista dorsal: duas fileiras de lâminas largas viradas para FORA (face com olho visível de lado, como na ref.)
  for (const s of [-1, 1]) {
    [[0, .05, .2, .02, -.55, .08, 1.05, .62, .3], [1, .06, .27, .02, -.62, .1, 1.1, .86, .36], [2, .06, .3, 0, -.7, .1, 1.12, .95, .38], [3, .06, .26, 0, -.74, .12, 1.15, .82, .34], [4, .06, .24, 0, -.78, .12, 1.15, .72, .3],
     [5, .04, .15, 0, -.65, .12, 1.1, .54, .24], [6, .03, .11, 0, -.55, .1, 1.05, .44, .2], [7, .03, .08, 0, -.45, .08, 1.0, .36, .17], [8, .02, .06, 0, -.35, .06, .95, .3, .14], [9, .02, .04, 0, -.3, .05, .9, .24, .11]]
      .forEach(([j, x, y, z, pi, ya, ro, l, w]) => PL.push([j, s * x, y, z, pi, s * ya, -s * ro, l, w, 1]));
    // flancos: lâminas deitadas para trás e para fora, em duas alturas
    [[1, .2, .14, .06, -.25, .32, 1.35, .5, .26], [2, .25, .1, .05, -.22, .34, 1.4, .56, .28], [3, .22, .08, -.02, -.2, .36, 1.42, .52, .26], [4, .22, .1, 0, -.22, .36, 1.4, .48, .24],
     [2, .27, -.08, .1, -.05, .3, 1.5, .4, .2], [3, .23, -.1, 0, -.05, .32, 1.5, .38, .19], [4, .22, -.06, -.04, -.06, .32, 1.5, .36, .18], [5, .14, .04, 0, -.25, .3, 1.3, .36, .17], [6, .1, .03, 0, -.25, .28, 1.25, .3, .14]]
      .forEach(([j, x, y, z, pi, ya, ro, l, w]) => PL.push([j, s * x, y, z, pi, s * ya, -s * ro, l, w, 1]));
    // cabeça: lâminas da nuca e das bochechas, também viradas para fora
    [['h', .08, .2, -.18, -.42, .12, 1.0, .74, .3], ['h', .1, .25, -.06, -.58, .1, 1.05, .95, .34], ['h', .17, .12, .1, -.15, .4, 1.4, .36, .18], ['h', .15, .1, .28, -.1, .35, 1.45, .28, .14]]
      .forEach(([j, x, y, z, pi, ya, ro, l, w]) => PL.push([j, s * x, y, z, pi, s * ya, -s * ro, l, w, 1]));
  }
  PL.push(['h', 0, .3, -.12, -.66, 0, 1.57, 1.15, .4, 1]); // grande lâmina da nuca (ref.: espinho mais alto com olho)
  const LEGP = []; for (let i = 0; i < 4; i++) LEGP.push([i, 0, 0, 0, -.9, 0, 0, .34, .18, 1]);
  const NP = PL.length + LEGP.length, plates = new T.InstancedMesh(plateGeo, flesh, NP); plates.frustumCulled = false; plates.instanceMatrix.setUsage(T.DynamicDrawUsage); inst.add(plates);
  const eyeIdx = []; [...PL, ...LEGP].forEach((p, i) => { if (p[9]) eyeIdx.push(i); });
  const SNOUT_EYES = [[.12, .05], [.25, .044], [.37, .037], [.48, .03], [.57, .024]];
  const NE = eyeIdx.length + SNOUT_EYES.length * 2, eyes = new T.InstancedMesh(eyeGeo, eyeMat, NE); eyes.frustumCulled = false; eyes.instanceMatrix.setUsage(T.DynamicDrawUsage); inst.add(eyes);
  const limbs = new T.InstancedMesh(limbGeo, flesh, 12), claws = new T.InstancedMesh(clawGeo, flesh, 16);
  for (const m of [limbs, claws]) { m.frustumCulled = false; m.instanceMatrix.setUsage(T.DynamicDrawUsage); inst.add(m); }
  // fitas de sombra: 3 emissores × H amostras
  const TH = 18, TE = 3, trPos = new Float32Array(TE * TH * 2 * 3), trU = new Float32Array(TE * TH * 2), trA = new Float32Array(TE * TH * 2), trI = [];
  for (let e = 0; e < TE; e++) for (let i = 0; i < TH - 1; i++) { const a = (e * TH + i) * 2; trI.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  for (let e = 0; e < TE; e++) for (let i = 0; i < TH; i++) { const a = (e * TH + i) * 2; trU[a] = trU[a + 1] = i / (TH - 1); trA[a] = 0; trA[a + 1] = 1; }
  const trGeo = keep(new T.BufferGeometry()); trGeo.setAttribute('position', new T.BufferAttribute(trPos, 3).setUsage(T.DynamicDrawUsage)); trGeo.setAttribute('aU', new T.BufferAttribute(trU, 1)); trGeo.setAttribute('aA', new T.BufferAttribute(trA, 1)); trGeo.setIndex(trI);
  const trMat = keepM(new T.ShaderMaterial({ uniforms: { uTime: U.uTime }, vertexShader: TRAIL_V, fragmentShader: TRAIL_F, transparent: true, depthWrite: false, side: T.DoubleSide }));
  const trail = new T.Mesh(trGeo, trMat); trail.frustumCulled = false; trail.renderOrder = 6; root.add(trail); trail.visible = false;
  const hist = Array.from({ length: TE }, () => Array.from({ length: TH }, () => new T.Vector3())); let histOn = false, histT = 0;
  /* -------- cúpula (pool de 2) -------- */
  const domeGeo = keep(new T.SphereGeometry(1, 56, 22, 0, Math.PI * 2, 0, Math.PI / 2));
  const shardGeo = keep(attrs((() => { const g = new T.ConeGeometry(.5, 1, 4, 2); g.translate(0, .5, 0); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) * (1 + .6 * Math.sin(i * 1.7)) ); p.setZ(i, p.getZ(i) * .35 + .25 * y * y); } g.computeVertexNormals(); return g; })(), .25));
  const ringGeo = keep(new T.PlaneGeometry(2, 2)); ringGeo.rotateX(-Math.PI / 2);
  const shardMat = keepM(new T.ShaderMaterial({ uniforms: { uBurn: { value: 0 }, uTime: U.uTime, uGlow: { value: 0 }, uRim: { value: new T.Color(0x9a6cff) } }, vertexShader: FLESH_V, fragmentShader: FLESH_F, side: T.DoubleSide }));
  const domes = Array.from({ length: 2 }, (_, k) => { const g = new T.Group(); g.visible = false; root.add(g);
    const su = { uR: { value: 1 }, uTime: { value: 0 }, uSeed: { value: k * 3.7 }, uRip: { value: 0 }, uDis: { value: 0 }, uAlpha: { value: 1 }, uHot: { value: 0 } };
    const shell = new T.Mesh(domeGeo, keepM(new T.ShaderMaterial({ uniforms: su, vertexShader: DOME_V, fragmentShader: DOME_F, transparent: true, depthWrite: false })));
    const cu = { uR: { value: 1 }, uTime: su.uTime, uSeed: su.uSeed, uHot: su.uHot, uAlpha: { value: 1 } };
    const core = new T.Mesh(domeGeo, keepM(new T.ShaderMaterial({ uniforms: cu, vertexShader: DOME_V, fragmentShader: CORE_F, transparent: true, depthWrite: false, blending: T.AdditiveBlending })));
    const ru = { uTime: su.uTime, uAlpha: { value: 1 } };
    const ring = new T.Mesh(ringGeo, keepM(new T.ShaderMaterial({ uniforms: ru, vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}', fragmentShader: RING_F, transparent: true, depthWrite: false, blending: T.AdditiveBlending })));
    const shards = new T.InstancedMesh(shardGeo, shardMat, 30); shards.instanceMatrix.setUsage(T.DynamicDrawUsage);
    shell.renderOrder = 9; core.renderOrder = 8; ring.renderOrder = 7; for (const m of [shell, core, ring, shards]) { m.frustumCulled = false; g.add(m); }
    const seeds = Array.from({ length: 30 }, (_, i) => ({ a: i / 30 * Math.PI * 2 + Math.sin(i * 12.9) * .09, h: .45 + .55 * Math.abs(Math.sin(i * 7.3)), w: .1 + .08 * Math.abs(Math.sin(i * 3.1)), lean: .35 + .4 * Math.abs(Math.sin(i * 5.7)), rr: 1.04 + .16 * Math.abs(Math.sin(i * 2.3)) }));
    return { g, su, cu, ru, shell, core, ring, shards, seeds, on: false, t: 0, R: 2.5 }; });
  let domeCur = 0;
  function startDome(x, y, z, R = 2.5) { const d = domes[domeCur++ % domes.length]; d.on = true; d.t = 0; d.R = R; d.g.position.set(x, y, z); d.g.visible = true; d.su.uSeed.value = Math.random() * 10; return d; }
  const _m = new T.Matrix4(), _q = new T.Quaternion(), _q2 = new T.Quaternion(), _e = new T.Euler(), _p = new T.Vector3(), _s = new T.Vector3(), _v = new T.Vector3(), _w = new T.Vector3(), _u = new T.Vector3(), _k = new T.Vector3(), _f = new T.Vector3(), _x = new T.Vector3(), _y = new T.Vector3(), _z = new T.Vector3(), _mb = new T.Matrix4(), _mh = new T.Matrix4();
  function updateDomes(dt) {
    for (const d of domes) { if (!d.on) continue; d.t += dt; const T1 = 1.05, u = d.t / T1;
      if (u >= 1) { d.on = false; d.g.visible = false; continue; }
      const grow = outCubic(d.t / .18), shrink = 1 - .07 * ease((u - .55) / .45), R = d.R * (.18 + .82 * grow) * shrink;
      d.su.uR.value = R; d.su.uTime.value = time; d.su.uRip.value = .1 * ease(u / .2) + .45 * ease((u - .35) / .6); d.su.uDis.value = ease((u - .62) / .38) * 1.05; d.su.uAlpha.value = 1 - ease((u - .82) / .18);
      d.su.uHot.value = Math.max(0, 1 - Math.abs(d.t - .1) / .14); d.cu.uR.value = R * .55 * (1 - .4 * ease((u - .3) / .5)); d.cu.uAlpha.value = (1 - ease((u - .25) / .45)) * (.35 + .5 * d.su.uHot.value);
      d.ring.scale.setScalar(R * 1.18); d.ru.uAlpha.value = (1 - ease((u - .6) / .4)) * Math.min(1, d.t / .1);
      const rise = outCubic(d.t / .22) * (1 - ease((u - .7) / .3));
      d.seeds.forEach((s, i) => { const r = R * s.rr; _p.set(Math.sin(s.a) * r, -.05, Math.cos(s.a) * r); _e.set(s.lean * Math.cos(0), s.a, 0, 'YXZ'); _e.set(0, s.a, 0); _q.setFromEuler(_e); _q2.setFromAxisAngle(_v.set(1, 0, 0), s.lean); _q.multiply(_q2);
        _s.set(s.w * R * .9, s.h * R * .6 * Math.max(.001, rise), s.w * R * .9); _m.compose(_p, _q, _s); d.shards.setMatrixAt(i, _m); });
      d.shards.instanceMatrix.needsUpdate = true; } }
  /* -------- estado do rig -------- */
  let cur = null, local = null; // fera em desenho; queima local quando o conjurador morre
  const legs = [{ hip: [-.2, .78, .32], l: [.4, .38, .17], front: true, ph: 0 }, { hip: [.2, .78, .32], l: [.4, .38, .17], front: true, ph: .12 }, { hip: [-.2, .7, -.5], l: [.38, .38, .19], front: false, ph: .52 }, { hip: [.2, .7, -.5], l: [.38, .38, .19], front: false, ph: .64 }];
  const burstVel = Array.from({ length: NP }, (_, i) => new T.Vector3(Math.sin(i * 12.9898) * 2.4, 1.4 + Math.abs(Math.sin(i * 4.1)) * 2.2, Math.cos(i * 78.233) * 2.4));
  const joints = SP.map(() => new T.Vector3()), jq = SP.map(() => new T.Quaternion());
  function segMatrix(out, a, b, r) { _v.subVectors(b, a); const L = _v.length() || 1e-3; _q.setFromUnitVectors(_y.set(0, 1, 0), _v.multiplyScalar(1 / L)); out.compose(a, _q, _s.set(r, L, r)); return out; }
  function ik(H, A, l1, l2, pole, K) { _v.subVectors(A, H); let d = _v.length(); d = clamp(d, Math.abs(l1 - l2) + .01, l1 + l2 - .005); _v.normalize(); const a = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), along = l1 * a, off = Math.sqrt(Math.max(0, l1 * l1 - along * along));
    _w.copy(pole).addScaledVector(_v, -pole.dot(_v)).normalize(); K.copy(H).addScaledVector(_v, along).addScaledVector(_w, off); }
  function pose(b, dt, burnLocal) {
    const B = b, ground = B.y, sp = clamp(B.v / 6.9, 0, 1), g = B.gait / 1.55 * Math.PI * 2, run = /run|stop|leap/.test(B.phase) ? 1 : 0;
    const crouch = B.crouch || 0, air = B.air || 0, burn = burnLocal;
    rig.position.set(B.x, ground, B.z); rig.rotation.set(0, B.yaw, 0); rig.updateMatrixWorld(true); _mb.copy(rig.matrixWorld);
    const bob = run * sp * .06 * Math.abs(Math.sin(g)) - crouch * .2 + air, breathe = .012 * Math.sin(time * 3.1);
    // coluna com onda lateral (cauda chicoteia com atraso)
    for (let i = 0; i < SP.length; i++) { const k = i / (SP.length - 1), sway = Math.sin(g - i * .55) * (.03 + .16 * k * k) * (.35 + sp) + Math.sin(time * 2.2 - i * .7) * .04 * k;
      joints[i].set(sway, SP[i][1] + bob + breathe * (1 - k) + (i < 3 ? B.neck * .05 : 0) - k * k * crouch * .05 + Math.sin(g + 1.2) * .025 * run * (1 - k), SP[i][0]); }
    for (let i = 0; i < SP.length; i++) { const a = joints[Math.max(0, i - 1)], c = joints[Math.min(SP.length - 1, i + 1)]; _v.subVectors(a, c).normalize(); _q.setFromUnitVectors(_z.set(0, 0, 1), _v); jq[i].copy(_q); }
    // massas
    LUMPS.forEach(([j, sx, sy, sz], i) => { _s.set(sx, sy, sz); lumps.setMatrixAt(i, _m.compose(joints[j], jq[j], _s).premultiply(_mb)); });
    // pescoço/cabeça
    const nb = joints[0], hingeZ = .86 + B.neck * .3, hingeY = .84 + bob + (B.headY - .72) * .9 + B.neck * .04;
    const neckMid = _u.set(nb.x * .5, (nb.y + hingeY) * .5 + .02, (nb.z + hingeZ) * .5 - .04);
    lumps.setMatrixAt(LUMPS.length, _m.compose(neckMid, jq[0], _s.set(.17, .17, .22)).premultiply(_mb));
    lumps.setMatrixAt(LUMPS.length + 1, _m.compose(_k.set(nb.x * .2, hingeY - .02, hingeZ - .1), jq[0], _s.set(.15, .16, .17)).premultiply(_mb));
    const pitch = -B.neck * .12 + (B.headY - .72) * -.25 + Math.sin(g * 2) * .03 * run;
    head.position.set(nb.x * .3, hingeY, hingeZ); head.rotation.set(pitch, Math.sin(g - .3) * .05 * run, 0);
    const J = clamp(B.jaw, 0, 1); upper.rotation.x = -J * .52; lower.rotation.x = J * .98;
    head.updateMatrixWorld(true); _mh.copy(head.matrixWorld);
    // membranas: borda da maxila ↔ borda da mandíbula (parte de trás da boca) — cavidade fechada, sem ver através
    upper.updateMatrix(); lower.updateMatrix();
    for (let s = 0; s < 2; s++) for (let i = 0; i < MK; i++) { const t = i / (MK - 1) * .48, z = -.04 + t * LJ, sg = s ? 1 : -1;
      _p.set(sg * (.19 * Math.pow(1 - z / LJ, .55) + .02), .0, z).applyMatrix4(upper.matrix); _w.set(sg * (.17 * Math.pow(1 - z / LJ, .5) + .018), .0, z * .96).applyMatrix4(lower.matrix);
      const fade = 1 - i / (MK - 1); _w.lerp(_p, 1 - fade * .97 - .03); const o = (s * 2 * MK + i * 2) * 3; memPos[o] = _p.x; memPos[o + 1] = _p.y; memPos[o + 2] = _p.z; memPos[o + 3] = _w.x; memPos[o + 4] = _w.y; memPos[o + 5] = _w.z; }
    memGeo.attributes.position.needsUpdate = true; gullet.scale.set(1, .35 + J * 1.1, 1); gullet.position.y = -J * .05;
    // placas (matriz guardada para os olhos)
    let pi = 0;
    const putPlate = (baseM, P, flut) => { _e.set(P[4] + flut, P[5], P[6], 'YXZ'); _q.setFromEuler(_e); _p.set(P[1], P[2], P[3]); _s.set(P[8], Math.max(P[8], .2) * .9, P[7]);
      _m.compose(_p, _q, _s).premultiply(baseM); if (burn > 0) { const bv = burstVel[pi], k = burn * burn * .55; _m.elements[12] += bv.x * k; _m.elements[13] += bv.y * k - burn * burn * .4; _m.elements[14] += bv.z * k; }
      plates.setMatrixAt(pi, _m); _m.toArray(PLM[pi]); pi++; };
    for (const P of PL) { const flut = Math.sin(time * 9 + pi * 1.7) * .05 * (run * sp + .2);
      if (P[0] === 'h') _mbTmp.copy(_mh); else _mbTmp.compose(joints[P[0]], jq[P[0]], ONE).premultiply(_mb);
      putPlate(_mbTmp, P, P[0] === 'h' ? flut * .5 : flut); }
    // patas: IK de 2 ossos (anca→tornozelo) + pé + garras
    let li = 0, ci = 0;
    legs.forEach((L, n) => { const H = _p.set(L.hip[0], L.hip[1] + bob * .9, L.hip[2]); const c = ((g / (Math.PI * 2)) + L.ph) % 1, stance = .56, S = (.15 + .85 * sp) * .62 * run;
      let fz, lift; if (c < stance) { fz = S / 2 - S * (c / stance); lift = 0; } else { const u = (c - stance) / (1 - stance); fz = -S / 2 + S * ease(u); lift = Math.sin(Math.PI * u) * (.08 + .2 * sp) * run; }
      if (air > 0) { fz = n < 2 ? .22 : -.22; lift = .25; } if (crouch > 0) fz += (n < 2 ? .08 : -.06) * crouch;
      const toe = _k.set(L.hip[0] * 1.15, Math.max(0, lift) + air * .2, L.hip[2] + (n < 2 ? .12 : -.02) + fz);
      const ank = _f.copy(toe).add(_w.set(0, L.front ? .15 : .17, L.front ? -.05 : -.11));
      const K = _u; ik(H, ank, L.l[0], L.l[1], _x.set(0, 0, L.front ? -1 : 1), K);
      Hw.copy(H).applyMatrix4(_mb); Kw.copy(K).applyMatrix4(_mb); Aw.copy(ank).applyMatrix4(_mb); Tw.copy(toe).applyMatrix4(_mb);
      _v.addVectors(Hw, Kw).multiplyScalar(.5); _w.subVectors(Kw, Hw).normalize(); _q.setFromUnitVectors(_y.set(0, 1, 0), _w); lumps.setMatrixAt(LUMPS.length + 2 + n, _m.compose(_v, _q, _s.set(.15, .25, .17)));
      limbs.setMatrixAt(li++, segMatrix(_m, Hw, Kw, L.front ? .12 : .14)); limbs.setMatrixAt(li++, segMatrix(_m, Kw, Aw, .085)); limbs.setMatrixAt(li++, segMatrix(_m, Aw, Tw, .06));
      _e.set(-.9, 0, (n % 2 ? 1 : -1) * .3, 'YXZ'); _q.setFromEuler(_e); _q2.setFromEuler(_e.set(0, B.yaw, 0)); _q2.multiply(_q); _e.set(-.75, 0, (n % 2 ? -1 : 1) * 1.3, 'YXZ'); _q.setFromEuler(_e); _q2.setFromEuler(_e.set(0, B.yaw, 0)); _q2.multiply(_q); _m.compose(Kw, _q2, _s.set(.18, .18, .34)); plates.setMatrixAt(PL.length + n, _m); _m.toArray(PLM[PL.length + n]);
      for (let c2 = 0; c2 < 4; c2++) { const sx = (c2 - 1.5) * .045; _e.set(1.25 + (c2 % 2) * .12, B.yaw + sx * 2.2, 0, 'YXZ'); _q.setFromEuler(_e); _m.compose(_v.set(Tw.x + Math.cos(B.yaw) * sx, Tw.y + .02, Tw.z - Math.sin(B.yaw) * sx), _q, _s.set(.032, .17, .032)); claws.setMatrixAt(ci++, _m); } });
    // olhos: na parte larga de cada placa (eixo longo do olho ao longo da lâmina) e na lateral do focinho
    let ei = 0;
    for (const i of eyeIdx) { _mbTmp.fromArray(PLM[i]); _m.compose(_v.set(0, .07, .3), EYE_ON_PLATE, _s.set(.2, .36, .2)).premultiply(_mbTmp); eyes.setMatrixAt(ei++, _m); }
    for (let s = 0; s < 2; s++) for (const [z, r] of SNOUT_EYES) { const t = z / LJ, x = (.19 * Math.pow(1 - t, .55) + .028) * .93, y = (.2 * Math.pow(1 - t, .7) + .035) * .5;
      _m.compose(_v.set(s ? x : -x, y, z), s ? EYE_R : EYE_L, _s.set(r * 1.7, r, r * .55)).premultiply(upper.matrixWorld); eyes.setMatrixAt(ei++, _m); }
    for (const m of [lumps, plates, eyes, limbs, claws]) m.instanceMatrix.needsUpdate = true;
  }
  const _mbTmp = new T.Matrix4(), ONE = new T.Vector3(1, 1, 1), Hw = new T.Vector3(), Kw = new T.Vector3(), Aw = new T.Vector3(), Tw = new T.Vector3(), PLM = Array.from({ length: NP }, () => new Float32Array(16));
  const basisQ = (x, y, z) => new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(new T.Vector3(...x), new T.Vector3(...y), new T.Vector3(...z)));
  const EYE_ON_PLATE = basisQ([0, 0, 1], [1, 0, 0], [0, 1, 0]), EYE_R = basisQ([0, 0, 1], [0, -1, 0], [1, 0, 0]), EYE_L = basisQ([0, 0, 1], [0, 1, 0], [-1, 0, 0]);
  function hist0(b) { histOn = true; for (const h of hist) for (const v of h) v.set(b.x, b.y + .6, b.z); }
  function trailUpdate(b, dt, cam) { if (!histOn) return; histT += dt; const run = /run|stop|leap|open|close/.test(b.phase);
    if (histT > .028) { histT = 0; for (let e = 0; e < TE; e++) { const h = hist[e]; for (let i = TH - 1; i > 0; i--) h[i].copy(h[i - 1]); } }
    const ems = [[0, .46, -.55], [0, .66, -1.1], [0, .44, -1.86]]; for (let e = 0; e < TE; e++) { _v.set(ems[e][0], ems[e][1] + (b.air || 0), ems[e][2]).applyMatrix4(_mb); hist[e][0].copy(_v); }
    if (!cam) return; for (let e = 0; e < TE; e++) { const h = hist[e]; for (let i = 0; i < TH; i++) { const a = h[i], nb = h[Math.min(TH - 1, i + 1)], pb = h[Math.max(0, i - 1)]; _v.subVectors(pb, nb); if (_v.lengthSq() < 1e-6) _v.set(0, 0, 1); _w.subVectors(cam.position, a); _u.crossVectors(_v, _w).normalize();
      const wdt = (run ? 1 : .5) * (e === 1 ? .34 : .24) * (1 - i / TH * .55) * (1 + .3 * Math.sin(time * 7 + i + e)); const o = ((e * TH + i) * 2) * 3; trPos[o] = a.x - _u.x * wdt; trPos[o + 1] = a.y - _u.y * wdt; trPos[o + 2] = a.z - _u.z * wdt; trPos[o + 3] = a.x + _u.x * wdt; trPos[o + 4] = a.y + _u.y * wdt; trPos[o + 5] = a.z + _u.z * wdt; } }
    trGeo.attributes.position.needsUpdate = true; }
  let domeFor = 0, stats = { beasts: 0, domes: 0, bites: 0 };
  return {
    root,
    /** Sincroniza com a fera lógica (ou null). ownerAlive=false → queima local sem dano. */
    sync(b, ownerAlive, dt, cam) {
      if (b && b !== cur) { cur = b; local = null; rig.visible = true; inst.visible = true; trail.visible = true; hist0(b); stats.beasts++; }
      if (!cur) return; const B = cur;
      if (!ownerAlive && !/burst|dome|done/.test(B.phase) && !local) local = { t: 0 };
      if (local) { local.t += dt; }
      const ph = local ? (local.t < .34 ? 'burst' : 'dome') : B.phase;
      let burn = ph === 'burst' ? (local ? local.t / .34 : B.burn) : ph === 'dome' || ph === 'done' ? 1 : 0;
      if (ph === 'summon') burn = Math.max(0, 1 - B.pt / .5) * .9; // corpo se forma da matéria negra
      U.uBurn.value = clamp(burn, 0, 1); U.uGlow.value = B.jaw; eyeU.uLid.value = ph === 'summon' ? clamp(B.pt / .5, .05, 1) : 1;
      if ((ph === 'dome' || ph === 'done') && domeFor !== B.id) { domeFor = B.id; const m = { x: B.x + Math.sin(B.yaw) * .7, z: B.z + Math.cos(B.yaw) * .7 }; startDome(m.x, B.y, m.z, 2.5); stats.domes++; }
      if (ph === 'dome' || ph === 'done' || (b === null && !local)) { rig.visible = false; inst.visible = false; trail.visible = false; histOn = false; if (b === null || ph === 'done' || (local && local.t > 1.4)) { cur = null; local = null; } return; }
      pose(B, dt, U.uBurn.value * (ph === 'burst' ? 1 : 0)); trailUpdate(B, dt, cam);
    },
    update(dt, quality, cam) { time += dt; U.uTime.value = time; updateDomes(dt); },
    dome: startDome,
    stats() { return { ...stats, rig: rig.visible, domeOn: domes.filter(d => d.on).length, plates: NP, eyes: NE, teeth: teethU.count + teethL.count }; },
    clear() { cur = null; local = null; rig.visible = false; inst.visible = false; trail.visible = false; histOn = false; for (const d of domes) { d.on = false; d.g.visible = false; } },
    dispose() { this.clear(); scene.remove(root); for (const g of geos) g.dispose(); for (const m of mats) m.dispose(); for (const m of [lumps, plates, eyes, limbs, claws, teethU, teethL, ...domes.map(d => d.shards)]) m.dispose?.(); }
  };
}
