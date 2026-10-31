import { softParticles, groundDecals, groundNormal, ribbons, lightningBolt, smooth, easeOut, hash } from './celestial-fxkit3d.js';
/**
 * MOD 245 — VFX do Enemy3 e do mini-chefe do Ato III. Só desenha o estado da lógica (enemy3-squad3d.js).
 *
 *  • Singularidade Abissal: núcleo de absorção NEGRO (esfera opaca), halo escuro de "lente", aro fotônico branco-dourado
 *    fino e disco de acreção achatado laranja/carmim com fluxo kepleriano advectado no shader (gira sempre, em todos os
 *    estágios). Linhas horizontais de energia atravessam o disco (referência do vídeo de conjuração). Detritos sobem em
 *    espiral até ela. Rastro segmentado no voo. Implosão de 1–2 quadros e DOMO hemisférico opaco lilás/rosa com rasgos
 *    de tinta preta, interior branco/laranja e coroa negra recortada na base; dissipa por erosão (não por fade).
 *  • Barragem Abissal: fendas VERTICAIS/OBLÍQUAS irregulares (não círculos): centro absolutamente preto, contorno quebrado
 *    magenta e rachaduras que se ramificam; galáxia só como detalhe lá dentro. As espadas (negras com fio carmim) são
 *    recortadas pelo PLANO DA FENDA num shader próprio (plano por instância — material.clippingPlanes seria um plano
 *    global por material e não serve para 8–16 fendas diferentes), então saem de dentro dela ponta primeiro.
 *  • Tempestade de Nadir: redemoinho colossal visto de baixo (três camadas com paralaxe), vazio central com luz rosa na
 *    borda interna, veios elétricos carmesim; cobertura escura do céu só ao redor da arena. Cada raio tem marca no chão
 *    com o RAIO REAL da colisão que se enche até o golpe; raio negro ramificado com halo magenta, cratera com rachaduras
 *    e arco residual.
 *  • Katana: rastro de chamas carmim/preto de bordas recortadas; Fúria do Dragão: silhueta de dragão de energia original
 *    que sai da lâmina ao longo da fissura.
 * Tudo com buffers fixos alocados uma vez; ~17 chamadas de desenho no total; qualidade baixa só reduz quantidade.
 */
const NOISE = `float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){return n2(p)*.5+n2(p*2.03+1.7)*.3+n2(p*4.1+3.1)*.2;}`;
const TONE = `
 #include <tonemapping_fragment>
 #include <colorspace_fragment>`;
const INST_VERT = `attribute vec4 aFx; varying vec2 vUv; varying vec4 vFx; void main(){ vUv=uv; vFx=aFx; gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.); }`;
/** quad virado para a câmera (escala no instanceMatrix) */
const BILL_VERT = `attribute vec4 aFx; varying vec2 vUv; varying vec4 vFx; void main(){ vUv=uv; vFx=aFx; vec4 c=modelViewMatrix*instanceMatrix*vec4(0.,0.,0.,1.); float s=length(instanceMatrix[0].xyz); c.xy+=position.xy*s; gl_Position=projectionMatrix*c; }`;
// halo escuro da lente (absorve o fundo) e aro fotônico + brilho quente (aditivo)
const LENS_FRAG = `varying vec2 vUv; varying vec4 vFx; void main(){ float d=length(vUv*2.-1.); float a=smoothstep(.95,.32,d)*.62*vFx.w; if(a<.01) discard; gl_FragColor=vec4(0.,0.,0.,a); }`;
const RING_FRAG = `${NOISE} uniform float time; varying vec2 vUv; varying vec4 vFx;
void main(){ vec2 p=vUv*2.-1.; float d=length(p), a=atan(p.y,p.x), k=vFx.x;
 float streak=n2(vec2(a*5.-time*4.5-vFx.y,d*14.))*.6+n2(vec2(a*11.+time*3.,d*30.))*.4;           // fluxo girando sem parar
 float ring=exp(-pow((d-.335)/(.012+.01*streak),2.))*(1.1+.6*streak);                              // aro fotônico fino
 float halo=exp(-pow((d-.36)/.09,2.))*.55*(.6+.6*streak)+exp(-pow((d-.42)/.22,2.))*.22;
 vec3 c=vec3(1.,.93,.75)*ring+vec3(1.,.5,.12)*halo*(1.+k*.4); float A=clamp(ring+halo,0.,1.)*vFx.w; if(A<.004) discard; gl_FragColor=vec4(c*A,A); }`;
// disco de acreção achatado: anel horizontal, fluxo kepleriano (mais rápido por dentro), quente por dentro → carmim por fora
const DISK_FRAG = `${NOISE} uniform float time; varying vec2 vUv; varying vec4 vFx;
void main(){ vec2 p=vUv*2.-1.; float r=length(p), a=atan(p.y,p.x); if(r>1.||r<.3) discard;
 float u=(r-.3)/.7, adv=a+time*(1.6/(r+.08))+vFx.y; float s=fbm(vec2(adv*3.,u*9.))*.65+n2(vec2(adv*9.,u*22.))*.35;
 float band=smoothstep(.35,.85,s); float edge=smoothstep(1.,.72,r+(s-.5)*.22)*smoothstep(.3,.36,r);
 vec3 c=mix(vec3(1.,.95,.78),vec3(1.,.48,.08),smoothstep(0.,.35,u)); c=mix(c,vec3(.82,.04,.1),smoothstep(.35,.9,u));
 float A=edge*(.35+.75*band)*vFx.w; if(A<.006) discard; gl_FragColor=vec4(c*A*(1.2+vFx.x*.5),A); }`;
// domo hemisférico: corpo lilás/rosa com manchas que fluem, rasgos de tinta preta recortados, interior branco/laranja
const DOME_VERT = `varying vec3 vP; varying vec3 vN; varying vec3 vV; void main(){ vP=position; vec4 w=modelMatrix*vec4(position,1.); vN=normalize(mat3(modelMatrix)*normal); vV=cameraPosition-w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
const DOME_FRAG = `${NOISE} uniform float time, erode, heat, seed; varying vec3 vP; varying vec3 vN; varying vec3 vV;
void main(){ vec3 n=normalize(vN), v=normalize(vV); float f=1.-abs(dot(n,v)); float lat=clamp(vP.y,0.,1.), ang=atan(vP.z,vP.x);
 float er=fbm(vec2(ang*3.2+seed,lat*5.)+vec2(0.,-time*.3)); if(er<erode) discard; float burn=smoothstep(erode+.08,erode,er)*step(.001,erode);
 float body=fbm(vec2(ang*2.4+time*.5+lat*1.7,lat*3.4-time*.9+seed)*1.5);
 float ink=1.-abs(fbm(vec2(ang*3.+lat*4.6+seed*3.,lat*1.3+time*.22)*vec2(1.3,5.6))*2.-1.); ink=smoothstep(.82,.87,ink)*smoothstep(.02,.22,lat);
 vec3 c=mix(vec3(.3,.08,.58),vec3(.66,.42,.98),smoothstep(.32,.6,body)); c=mix(c,vec3(1.,.36,.82),smoothstep(.58,.74,body));
 float core=pow(1.-f,1.8)*smoothstep(.85,.05,lat)*heat; c=mix(c,vec3(1.,.62,.28),clamp(core*1.5,0.,1.)); c=mix(c,vec3(1.,.95,.82),clamp(pow(1.-f,6.)*smoothstep(.6,0.,lat)*heat*1.3,0.,1.));
 c=mix(c,vec3(.025,0.,.045),ink); c+=vec3(.75,.35,1.)*smoothstep(.62,1.,f)*.55; c+=vec3(1.,.32,.92)*burn*1.6;
 gl_FragColor=vec4(c,1.);${TONE}
}`;
// fenda irregular no tecido do espaço: vazio negro, contorno magenta quebrado, rachaduras ramificadas
const RIFT_FRAG = `${NOISE} uniform float time; varying vec2 vUv; varying vec4 vFx;
void main(){ vec2 p=vUv*2.-1.; float open=vFx.x, sd=vFx.y, y=p.y;
 float jag=n2(vec2(y*6.5+sd*13.,sd))*.55+n2(vec2(y*17.+sd*5.,sd*2.))*.45;
 float W=pow(max(0.,1.-y*y),.6)*(.26+.24*jag)*open, dx=abs(p.x+sin(y*3.1+sd)*.07*open), e=dx-W;
 vec2 q=p*vec2(2.6,1.7)+sd; float r1=abs(n2(q*1.8)-.5), r2=abs(n2(q*4.2+4.)-.5);
 float cr=(smoothstep(.035,0.,r1)*smoothstep(.5,0.,e)+smoothstep(.025,0.,r2)*smoothstep(.26,0.,e)*.8)*open*step(0.,e);
 vec3 col; float A;
 if(e<0.){ float rr=length(p*vec2(2.4,1.)), an=atan(p.y,p.x*2.4);
  float sw=pow(max(0.,sin(an*2.+log(rr+.05)*5.-time*2.4+sd)),5.)*smoothstep(.9,.1,rr), st=step(.986,h(floor(p*36.+vec2(time*1.5,sd))));
  col=vec3(0.,0.,.004)+vec3(.32,.02,.3)*sw*.4+vec3(.7,.3,.9)*st*sw; float rim=smoothstep(-.1,0.,e); col=mix(col,vec3(1.,.3,.86),rim*rim); col+=vec3(1.,.9,1.)*smoothstep(-.02,0.,e); A=1.;
 } else { float g=exp(-e*24.)*open; col=vec3(1.,.18,.78)*g*1.5+vec3(1.,.35,.9)*cr*1.4; A=clamp(g*.95+cr,0.,1.); if(A<.02) discard; }
 gl_FragColor=vec4(col,A*vFx.z); }`;
// espada da barragem: corpo negro brilhante, fio carmim; recortada pelo plano da fenda (aClip por instância)
const SWORD_VERT = `attribute vec4 aClip; attribute float aEdge; attribute float aGlow; varying vec3 vW; varying vec4 vClip; varying float vEdge; varying float vGlow; varying vec3 vN; varying vec3 vV;
void main(){ vec4 w=modelMatrix*instanceMatrix*vec4(position,1.); vW=w.xyz; vClip=aClip; vEdge=aEdge; vGlow=aGlow; vN=normalize(mat3(modelMatrix*instanceMatrix)*normal); vV=cameraPosition-w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
const SWORD_FRAG = `varying vec3 vW; varying vec4 vClip; varying float vEdge; varying float vGlow; varying vec3 vN; varying vec3 vV;
void main(){ if(dot(vClip.xyz,vW)+vClip.w<0.) discard; vec3 n=normalize(vN), v=normalize(vV); float f=1.-abs(dot(n,v)); float l=max(0.,dot(n,normalize(vec3(.3,1.,.2))));
 vec3 c=vec3(.03,.008,.014)+vec3(.12,.05,.08)*l+vec3(.5,.02,.08)*pow(f,3.); c=mix(c,vec3(1.,.08,.2)*(1.3+vGlow),vEdge); gl_FragColor=vec4(c,1.);${TONE}
}`;
// céu da tempestade: redemoinho visto de baixo
const SKY_FRAG = `${NOISE} uniform float time; varying vec2 vUv; varying vec4 vFx;
void main(){ vec2 p=vUv*2.-1.; float r=length(p), a=atan(p.y,p.x), L=vFx.y, sd=vFx.z; if(r>1.) discard;
 float cl=fbm(vec2(a*2.6+time*.08*(1.+L)+sd,r*5.5-time*.25)), sp=a*3.+log(r+.02)*4.4-time*(.32+L*.16)+cl*2.4;
 float arms=.5+.5*sin(sp); float hole=1.-smoothstep(.11,.19,r+(cl-.5)*.06); float inner=exp(-pow((r-.2-.025*sin(a*5.+time))/.04,2.));
 float vn=1.-abs(n2(vec2(a*13.+time*.4+sd,r*26.))-.5)*2.; float veins=smoothstep(.955,.99,vn)*step(.42,h(vec2(floor(time*7.+a),sd)))*smoothstep(.25,.7,r);
 float v=arms*(.55+.7*cl); float b1=smoothstep(.42,.45,v), b2=smoothstep(.66,.68,v), b3=smoothstep(.86,.875,v)*smoothstep(.16,.5,r);
 vec3 c=mix(vec3(.012,0.,.02),vec3(.2,.01,.17),b1); c=mix(c,vec3(.72,.04,.42),b2); c=mix(c,vec3(1.,.42,.8),b3);
 float rim=smoothstep(.035,.0,abs(r-.2-.025*sin(a*5.+time))); c=mix(c,vec3(1.,.55,.9),rim); c=mix(c,vec3(0.),hole); c=mix(c,vec3(1.,.08,.2),veins);
 float A=(b1*.35+.62)*smoothstep(1.,.7,r+(cl-.5)*.12); A=max(A,hole)*vFx.x; if(A<.01) discard; gl_FragColor=vec4(c,A); }`;
// marca no chão do raio (raio REAL) e cratera queimada
const MARK_FRAG = `${NOISE} uniform float time; varying vec2 vUv; varying vec4 vFx;
void main(){ vec2 p=vUv*2.-1.; float r=length(p), kind=vFx.w, k=vFx.y; vec3 c; float A;
 if(kind<.5){ float E=.87, ring=1.-smoothstep(.012,.03,abs(r-E)), fill=step(r,E*k)*(.22+.14*sin(r*42.-time*14.)), seg=step(.5,fract(atan(p.y,p.x)*3.183+time*.6));
  c=mix(vec3(1.,.06,.28),vec3(1.,.92,1.),k*k); A=(ring*(.75+.25*seg)+fill+step(r,E)*.1)*vFx.z; if(r>.95) discard;
 } else { float n=fbm(p*3.+vFx.x*7.); float cr=1.-smoothstep(0.,.06,abs(n-.5)); c=mix(vec3(.02,0.,.02),vec3(1.,.22,.55),cr*k); A=smoothstep(1.,.55,r+(n-.5)*.35)*vFx.z*.92; }
 if(A<.01) discard; gl_FragColor=vec4(c,A); }`;
// rastro da katana: chama carmim/preta de bordas recortadas (opaco, corte duro)
const SLASH_FRAG = `${NOISE} uniform float time; varying vec2 vUv; varying vec4 vFx;
void main(){ float u=vUv.x, v=vUv.y, n=n2(vec2(u*7.-time*3.,v*6.+vFx.y))*.6+n2(vec2(u*15.,v*13.-time*4.))*.4;
 float shape=(1.-u)*.95-abs(v-.66)*1.55+(n-.5)*.55; if(shape<0.) discard;
 vec3 c=mix(vec3(.003,0.,.001),vec3(.55,0.,.015),smoothstep(.02,.14,shape)); c=mix(c,vec3(1.,.04,.06)+vFx.x*vec3(0.,.06,.02),smoothstep(.36,.44,shape)); c+=vec3(1.,.35,.25)*smoothstep(.62,.68,shape)*.5; gl_FragColor=vec4(c,1.);${TONE}
}`;
const CEL_VERT = `varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv=uv; vec4 w=modelMatrix*vec4(position,1.); vN=normalize(mat3(modelMatrix)*normal); vV=cameraPosition-w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
const CEL_FRAG = `${NOISE} uniform float time, alpha; uniform vec3 deep, body, hot; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main(){ vec2 uv=vec2(vUv.x*9.-time*3.,vUv.y*4.+vUv.x*2.); float n=n2(uv)*.6+n2(uv*2.3+vec2(time,0.))*.4; float ends=smoothstep(0.,.05,vUv.x)*smoothstep(1.,.92,vUv.x);
 if(n<(1.-alpha)*1.05+(1.-ends)*.6) discard; float f=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
 vec3 c=mix(deep,body,smoothstep(.5,.55,n)); c=mix(c,hot,smoothstep(.72,.76,n)); c+=hot*smoothstep(.5,.95,f)*.9; gl_FragColor=vec4(c,1.);${TONE}
}`;

export function createAbyssVFX(T, scene, { ground = () => 0 } = {}) {
  const root = new T.Group(); root.name = 'Enemy3AbyssVFX'; scene.add(root);
  const uTime = { value: 0 }, mats = [], geos = [];
  const inst = (geo, mat, n, order) => { const m = new T.InstancedMesh(geo, mat, n); m.frustumCulled = false; m.count = 0; if (order !== undefined) m.renderOrder = order; root.add(m); mats.push(mat); geos.push(geo); return m; };
  const fxAttr = (geo, n) => { const a = new Float32Array(n * 4); geo.setAttribute('aFx', new T.InstancedBufferAttribute(a, 4).setUsage(T.DynamicDrawUsage)); return a; };
  const shader = (v, f, o = {}) => new T.ShaderMaterial({ vertexShader: v, fragmentShader: f, uniforms: { time: uTime, ...(o.uniforms || {}) }, transparent: !!o.transparent, depthWrite: o.depthWrite ?? !o.transparent, side: o.side ?? T.FrontSide,
    blending: o.add ? T.CustomBlending : T.NormalBlending, blendSrc: T.OneFactor, blendDst: T.OneFactor, toneMapped: false, fog: false, polygonOffset: !!o.poly, polygonOffsetFactor: o.poly ? -2 : 0, polygonOffsetUnits: o.poly ? -2 : 0 });
  const M = new T.Matrix4(), Q = new T.Quaternion(), S = new T.Vector3(), P = new T.Vector3(), E = new T.Euler(), A3 = new T.Vector3(), B3 = new T.Vector3(), C3 = new T.Vector3(), up = new T.Vector3(0, 1, 0), cam = new T.Vector3();
  // --- singularidade
  const coreGeo = new T.SphereGeometry(1, 24, 16), cores = inst(coreGeo, new T.MeshBasicMaterial({ color: 0x000000, toneMapped: false, fog: false }), 4, 6);
  const qGeo = () => new T.PlaneGeometry(2, 2);
  const lensGeo = qGeo(), lensFx = fxAttr(lensGeo, 4), lens = inst(lensGeo, shader(BILL_VERT, LENS_FRAG, { transparent: true }), 4, 5);
  const ringGeo = qGeo(), ringFx = fxAttr(ringGeo, 4), rings = inst(ringGeo, shader(BILL_VERT, RING_FRAG, { transparent: true, add: true }), 4, 8);
  const diskGeo = qGeo(); diskGeo.rotateX(-Math.PI / 2); const diskFx = fxAttr(diskGeo, 8), disks = inst(diskGeo, shader(INST_VERT, DISK_FRAG, { transparent: true, add: true, side: T.DoubleSide }), 8, 7);
  const domeGeo = new T.SphereGeometry(1, 48, 20, 0, Math.PI * 2, 0, Math.PI / 2); geos.push(domeGeo);
  const domes = [0, 1].map(i => { const m = new T.ShaderMaterial({ vertexShader: DOME_VERT, fragmentShader: DOME_FRAG, uniforms: { time: uTime, erode: { value: 0 }, heat: { value: 1 }, seed: { value: i * 3.7 } }, side: T.DoubleSide, toneMapped: false, fog: false });
    mats.push(m); const mesh = new T.Mesh(domeGeo, m); mesh.frustumCulled = false; mesh.visible = false; root.add(mesh); return { mesh, m, used: false }; });
  // --- barragem
  const riftGeo = new T.PlaneGeometry(1, 1), riftFx = fxAttr(riftGeo, 40), rifts = inst(riftGeo, shader(INST_VERT, RIFT_FRAG, { transparent: true, side: T.DoubleSide }), 40, 4);
  const swordGeo = buildSwordGeo(T), NS = 48, clipA = new Float32Array(NS * 4), glowA = new Float32Array(NS);
  swordGeo.setAttribute('aClip', new T.InstancedBufferAttribute(clipA, 4).setUsage(T.DynamicDrawUsage)); swordGeo.setAttribute('aGlow', new T.InstancedBufferAttribute(glowA, 1).setUsage(T.DynamicDrawUsage));
  const swords = inst(swordGeo, shader(SWORD_VERT, SWORD_FRAG, { side: T.DoubleSide }), NS);
  // --- tempestade
  const skyGeo = new T.PlaneGeometry(2, 2); skyGeo.rotateX(Math.PI / 2); const skyFx = fxAttr(skyGeo, 6), sky = inst(skyGeo, shader(INST_VERT, SKY_FRAG, { transparent: true, side: T.DoubleSide }), 6, 1);
  const coverMat = new T.MeshBasicMaterial({ color: 0x0b0210, transparent: true, opacity: 0, side: T.BackSide, depthWrite: false, fog: false, toneMapped: false }); mats.push(coverMat);
  const cover = new T.Mesh(new T.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI * .56), coverMat); geos.push(cover.geometry); cover.visible = false; cover.frustumCulled = false; cover.renderOrder = -1; root.add(cover);
  const markGeo = new T.PlaneGeometry(2, 2); markGeo.rotateX(-Math.PI / 2); const markFx = fxAttr(markGeo, 40), marks = inst(markGeo, shader(INST_VERT, MARK_FRAG, { transparent: true, poly: true }), 40, 2);
  // --- katana / dragão
  const SQ = 28, sPos = new Float32Array(SQ * 12), sUv = new Float32Array(SQ * 8), sIdx = new Uint32Array(SQ * 6); for (let i = 0; i < SQ; i++) sIdx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 2, i * 4 + 1, i * 4 + 3], i * 6);
  const slashGeo = new T.BufferGeometry(); slashGeo.setAttribute('position', new T.BufferAttribute(sPos, 3).setUsage(T.DynamicDrawUsage)); slashGeo.setAttribute('uv', new T.BufferAttribute(sUv, 2).setUsage(T.DynamicDrawUsage)); slashGeo.setIndex(new T.BufferAttribute(sIdx, 1));
  const slashFx = new Float32Array(4), slashMat = shader(`varying vec2 vUv; varying vec4 vFx; uniform vec4 fx; void main(){ vUv=uv; vFx=fx; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`, SLASH_FRAG, { side: T.DoubleSide, uniforms: { fx: { value: new T.Vector4() } } });
  const slashMesh = new T.Mesh(slashGeo, slashMat); slashMesh.frustumCulled = false; root.add(slashMesh); mats.push(slashMat); geos.push(slashGeo); void slashFx;
  const DR = 30, DS = 8, dV = (DR + 1) * (DS + 1), dPosT = new Float32Array(dV * 3), dNor = new Float32Array(dV * 3), dUv = new Float32Array(dV * 2), dIx = [];
  for (let j = 0; j <= DR; j++) for (let k = 0; k <= DS; k++) { dUv.set([j / DR, k / DS], (j * (DS + 1) + k) * 2); if (j < DR && k < DS) { const a = j * (DS + 1) + k, b = a + DS + 1; dIx.push(a, b, a + 1, a + 1, b, b + 1); } }
  const dragonGeo = new T.BufferGeometry(); dragonGeo.setAttribute('position', new T.BufferAttribute(dPosT, 3).setUsage(T.DynamicDrawUsage)); dragonGeo.setAttribute('normal', new T.BufferAttribute(dNor, 3).setUsage(T.DynamicDrawUsage)); dragonGeo.setAttribute('uv', new T.BufferAttribute(dUv, 2)); dragonGeo.setIndex(dIx);
  const dragonMat = new T.ShaderMaterial({ vertexShader: CEL_VERT, fragmentShader: CEL_FRAG, uniforms: { time: uTime, alpha: { value: 1 }, deep: { value: new T.Color(.003, 0, .001) }, body: { value: new T.Color(.3, 0, .01) }, hot: { value: new T.Color(1, .04, .06) } }, side: T.DoubleSide, toneMapped: false, fog: false });
  const dragonMesh = new T.Mesh(dragonGeo, dragonMat); dragonMesh.frustumCulled = false; dragonMesh.visible = false; root.add(dragonMesh); mats.push(dragonMat); geos.push(dragonGeo);
  // --- compartilhados
  const shardGeo = new T.OctahedronGeometry(1, 0); shardGeo.scale(.42, 1.35, .42); const shards = inst(shardGeo, new T.MeshStandardMaterial({ color: 0x0c0610, roughness: .35, metalness: .3, emissive: 0x4a0640, emissiveIntensity: .9, flatShading: true }), 320);
  const glow = softParticles(T, 900), rib = ribbons(T, 900, { flow: 16 }), decals = groundDecals(T, 32); root.add(glow.mesh, rib.mesh, decals.mesh);
  const DQ = 360, dPos = new Float32Array(DQ * 12), dIdx = new Uint32Array(DQ * 6); for (let i = 0; i < DQ; i++) dIdx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 2, i * 4 + 1, i * 4 + 3], i * 6);
  const dGeo = new T.BufferGeometry(); dGeo.setAttribute('position', new T.BufferAttribute(dPos, 3).setUsage(T.DynamicDrawUsage)); dGeo.setIndex(new T.BufferAttribute(dIdx, 1));
  const darkMat = new T.MeshBasicMaterial({ color: 0x020003, side: T.DoubleSide, toneMapped: false, fog: false }), darkBolts = new T.Mesh(dGeo, darkMat); darkBolts.frustumCulled = false; root.add(darkBolts); mats.push(darkMat); geos.push(dGeo);
  const bolt = Array.from({ length: 40 }, () => [0, 0, 0, 0, 0, 0, 0]), nrm = [0, 1, 0];
  let time = 0, low = false, dq = 0, nc = 0, nl = 0, nr = 0, nd = 0, nf = 0, nsw = 0, nsk = 0, nm = 0, sn = 0;
  const MAG = [1, .25, .82], RED = [1, .08, .2], HOT = [1, .62, .2], VIO = [.7, .35, 1], c4 = (c, a) => [c[0], c[1], c[2], a];
  function dseg(ax, ay, az, bx, by, bz, w) { if (dq >= DQ) return; A3.set(bx - ax, by - ay, bz - az); B3.set(ax - cam.x, ay - cam.y, az - cam.z); A3.cross(B3).normalize().multiplyScalar(w); dPos.set([ax - A3.x, ay - A3.y, az - A3.z, ax + A3.x, ay + A3.y, az + A3.z, bx - A3.x, by - A3.y, bz - A3.z, bx + A3.x, by + A3.y, bz + A3.z], dq * 12); dq++; }
  /** raio negro: núcleo preto e halo magenta aditivo mais largo */
  function darkBolt(seed, ax, ay, az, bx, by, bz, w, a = 1, o = { depth: 2, jag: .3, branches: .5 }) { const n = lightningBolt(seed, ax, ay, az, bx, by, bz, bolt, o); for (let i = 0; i < n; i++) { const q = bolt[i]; dseg(q[0], q[1], q[2], q[3], q[4], q[5], w * q[6]); rib.seg(q[0], q[1], q[2], q[3], q[4], q[5], w * 3 * q[6], w * 2.4 * q[6], c4(MAG, .9 * a), c4(MAG, .7 * a)); } }
  function boltRib(seed, ax, ay, az, bx, by, bz, w, col, a, o) { const n = lightningBolt(seed, ax, ay, az, bx, by, bz, bolt, o); for (let i = 0; i < n; i++) { const s = bolt[i]; rib.seg(s[0], s[1], s[2], s[3], s[4], s[5], w * s[6], w * s[6] * .8, c4(col, a), c4(col, a * .8)); } }
  function shard(x, y, z, s, rx, ry, rz) { if (sn >= 320 || s <= .01) return; P.set(x, y, z); Q.setFromEuler(E.set(rx, ry, rz)); S.set(s, s, s); M.compose(P, Q, S); shards.setMatrixAt(sn++, M); }
  function bill(mesh, fx, i, x, y, z, s, a, b, c, d) { P.set(x, y, z); Q.identity(); S.set(s, s, s); M.compose(P, Q, S); mesh.setMatrixAt(i, M); fx.set([a, b, c, d], i * 4); }
  const camFade = (x, y, z, r) => { const d = Math.hypot(cam.x - x, cam.y - y, cam.z - z) - r; return d > 2 ? 1 : Math.max(0, d / 2); };
  const trails = new Map(), sProxy = {}; // id → últimas posições (rastro segmentado)

  /* ---------- Singularidade ---------- */
  function drawSingularity(s0, boss) {
    const ph0 = s0.phase; let s = s0;
    if (s0.hand && (ph0 === 'form' || ph0 === 'raise')) { const k = ph0 === 'form' ? 1 : 1 - smooth(s0.t / s0.T.raise); s = Object.assign(sProxy, s0); s.x = s0.x + (s0.hand.x - s0.x) * k; s.y = s0.y + (s0.hand.y - s0.y) * k; s.z = s0.z + (s0.hand.z - s0.z) * k; }
    const T0 = s.T, ph = s.phase, big = boss ? 1.3 : 1, gy = ground(s.x, s.z);
    if (ph === 'dome' || ph === 'erode') return drawDome(s, boss, gy);
    let rc = Math.max(.04, s.r * .92); const fade = ph === 'fizzle' ? 1 - smooth(s.t / .45) : 1, imp = ph === 'implode' ? s.t / T0.implode : 0;
    if (ph === 'fizzle') rc *= 1 - smooth(s.t / .45) * .9; if (imp) rc *= 1 - imp * .75;
    const k = ph === 'form' ? s.grow / .7 : 1, cf = camFade(s.x, s.y, s.z, rc * 2);
    if (nc < 4) { P.set(s.x, s.y, s.z); Q.identity(); S.setScalar(rc); M.compose(P, Q, S); cores.setMatrixAt(nc++, M); }
    if (nl < 4) bill(lens, lensFx, nl++, s.x, s.y, s.z, rc * 2.4, 0, 0, 0, fade * cf);
    if (nr < 4) bill(rings, ringFx, nr++, s.x, s.y, s.z, rc * 3.1, boss ? 1 : 0, s.id, 0, fade * Math.min(1, k * 1.4) * (1 + imp * 2));
    // disco de acreção: dois anéis achatados levemente inclinados para a câmera, girando sempre
    const tx = cam.x - s.x, tz = cam.z - s.z, tl = Math.hypot(tx, tz) || 1;
    for (let i = 0; i < 2 && nd < 8; i++) { C3.set(tx / tl * (i ? -.22 : .3), 1, tz / tl * (i ? -.22 : .3)).normalize(); Q.setFromUnitVectors(up, C3); const dr = rc * (i ? 2.05 : 2.75) * (.35 + .65 * Math.min(1, k)) * (1 - imp * .6);
      P.set(s.x, s.y, s.z); S.set(dr, 1, dr); M.compose(P, Q, S); disks.setMatrixAt(nd, M); diskFx.set([boss ? 1 : 0, s.id * 1.7 + i * 2, 0, (i ? .7 : 1) * fade * cf], nd * 4); nd++; }
    // linhas de energia horizontais que atravessam o disco (referência do vídeo)
    const lines = low ? 1 : 3; for (let i = 0; i < lines; i++) { const L = rc * (3.4 + 1.6 * hash(i + s.id)) * Math.min(1, k * 1.2), sl = Math.sin(time * (3 + i) + i * 2) * rc * .5, oy = (i - 1) * rc * .18, w = rc * (.05 + .04 * (i === 1)), rx = -tz / tl, rz = tx / tl;
      rib.seg(s.x - rx * L + rx * sl, s.y + oy, s.z - rz * L + rz * sl, s.x + rx * L + rx * sl, s.y + oy, s.z + rz * L + rz * sl, w, w, c4(i === 1 ? [1, .95, .8] : HOT, .9 * fade), c4(i === 1 ? [1, .95, .8] : HOT, .9 * fade)); }
    glow.add(s.x, s.y, s.z, rc * 5, rc * 5, 1, .35, .08, .35 * fade, 0);
    // formação: centelhas entram na palma; detritos sobem em arcos/espirais até ela
    if (ph === 'form' || ph === 'raise' || ph === 'throw') {
      for (let i = 0; i < (low ? 6 : 14); i++) { const u = (time * .9 + i / 14) % 1, a = i * 2.39996 + time * 4, rr = (1 - u) * 1.6 * big; glow.add(s.x + Math.cos(a) * rr, s.y + Math.sin(a * 1.3) * rr * .5, s.z + Math.sin(a) * rr, .05, .28, 1, i % 2 ? .45 : .2, i % 2 ? .1 : .5, u, 3, a + 1.57, i); }
      for (let i = 0; i < (low ? 5 : 12); i++) { const u = (time * .35 + hash(i + s.id)) % 1, a = i * 2.39996 + u * 7 + time, rr = (2.6 - u * 2.2) * big, gy2 = ground(s.x + Math.cos(a) * rr, s.z + Math.sin(a) * rr);
        shard(s.x + Math.cos(a) * rr, gy2 + (s.y - gy2) * smooth(u) + Math.sin(u * 3.14) * .6, s.z + Math.sin(a) * rr, (.07 + .06 * hash(i)) * big * (1 - u * .5), a, u * 6, i); }
      if (!low && ph !== 'form') darkBolt(s.id * 7 + Math.floor(time * 12), s.x, s.y, s.z, s.x + Math.sin(time * 9) * rc * 4, s.y + rc * 3, s.z + Math.cos(time * 7) * rc * 4, .03 * big, .8);
    }
    // voo: rastro segmentado (núcleo escuro + traço quente), e sinal de atração do mini-chefe
    if (ph === 'fly' || ph === 'fall' || ph === 'implode') {
      let tr = trails.get(s.id); if (!tr) trails.set(s.id, tr = []); const last = tr[tr.length - 1];
      if (!last || Math.hypot(last[0] - s.x, last[1] - s.y, last[2] - s.z) > .35) { tr.push([s.x, s.y, s.z]); if (tr.length > 18) tr.shift(); }
      for (let i = 1; i < tr.length; i++) { const a = tr[i - 1], b = tr[i], u = i / tr.length; if (i % 2) dseg(a[0], a[1], a[2], b[0], b[1], b[2], rc * .35 * u); rib.seg(a[0], a[1], a[2], b[0], b[1], b[2], rc * 1.1 * u, rc * 1.1 * u, c4(i % 2 ? RED : HOT, .75 * u), c4(i % 2 ? RED : HOT, .75 * u)); }
      if (T0.pull && !low) for (let i = 0; i < 10; i++) { const u = (time * 1.2 + i / 10) % 1, a = i * 2.4 + time, rr = T0.pullR * (1 - u); glow.add(s.x + Math.cos(a) * rr, s.y - 1 + u, s.z + Math.sin(a) * rr, .05, .4, .7, .35, 1, u * .8, 3, a + 1.57, i); }
      if (T0.pull) { groundNormal(ground, s.x, s.z, nrm); decals.add(s.x, gy, s.z, T0.pullR, .45, .18, .7, .35, 0, (time * .6) % 1, s.id, nrm); }
    }
    if (imp) { glow.add(s.x, s.y, s.z, rc * 9 * (1 - imp), rc * 9 * (1 - imp), 1, .9, .7, .9, 0); glow.add(s.x, s.y, s.z, rc * 3, rc * 3, 1, 1, 1, 1, 2, time); }
  }
  function drawDome(s, boss, gy) {
    const T0 = s.T, d = domes.find(x => !x.used); if (!d) return; d.used = true; trails.delete(s.id);
    const R = Math.max(.1, s.dome || T0.R * .1), er = s.phase === 'erode' ? smooth(s.t / T0.erode) : 0, inside = Math.hypot(cam.x - s.x, cam.z - s.z) < R && cam.y - gy < R;
    d.mesh.visible = true; d.mesh.position.set(s.x, gy - .05, s.z); d.mesh.scale.set(R, R * .92, R); d.m.uniforms.erode.value = Math.min(1.01, er * 1.05 + (inside ? .55 : 0)); d.m.uniforms.heat.value = 1 - er * .7;
    const g = s.phase === 'dome' ? s.t / T0.grow : 1;
    // coroa negra recortada na base, espinhos inclinados para fora
    const n = low ? 14 : 28; for (let i = 0; i < n; i++) { const a = i / n * 6.283 + hash(i + s.id) * .2, hh = (.35 + .55 * hash(i * 3 + s.id)) * R * .32 * (1 - er) * (.6 + .4 * Math.sin(time * 6 + i)), x = s.x + Math.cos(a) * R, z = s.z + Math.sin(a) * R;
      shard(x, ground(x, z) + hh * .5, z, hh, Math.sin(a) * .7, -a, Math.cos(a) * -.7); }
    groundNormal(ground, s.x, s.z, nrm);
    decals.add(s.x, gy, s.z, R * (1.2 + g * .9), .75, .3, 1, (1 - g) * .9, 0, Math.min(1, g), s.id, nrm); decals.add(s.x, gy, s.z, R * 1.05, .6, .15, .8, .6 * (1 - er), 2, 0, s.id + 1, nrm);
    glow.add(s.x, gy + R * .25, s.z, R * 1.6, R * 1.1, 1, .82, .55, .45 * (1 - er), 0);
    for (let i = 0; i < (low ? 8 : 18); i++) { const a = i * 2.39996, u = (time * .7 + hash(i)) % 1, rr = R * (1.02 + u * .4); glow.add(s.x + Math.cos(a) * rr, gy + u * R * .5, s.z + Math.sin(a) * rr, .07, .45, .75, .3, 1, (1 - u) * (1 - er), 3, a, i); }
  }

  /* ---------- Barragem ---------- */
  const _n = new T.Vector3(), _r = new T.Vector3(), _u = new T.Vector3();
  function portalBasis(p, focus) {
    if (p.dx) _n.set(p.dx, p.dy * .5, p.dz); else if (focus) _n.set(focus.x - p.x, 0, focus.z - p.z); else _n.set(0, 0, 1);
    if (_n.lengthSq() < 1e-6) _n.set(0, 0, 1); _n.normalize(); _u.set(Math.sin(p.tilt) * .9, 1, 0); _r.crossVectors(_u, _n).normalize(); _u.crossVectors(_n, _r).normalize(); return _n;
  }
  function drawBarrage(s, boss, focus) {
    const T0 = s.T, sc = boss ? 1.3 : 1.15, L = T0.len * sc;
    for (const p of s.portals) {
      if (nf >= 40) break; const nrmv = portalBasis(p, focus), op = Math.max(0, p.open), w = (.8 + .7 * hash(p.i + s.id)) * sc, h = (1.5 + 1.4 * hash(p.i * 3 + s.id)) * sc;
      if (op <= .01) continue; M.makeBasis(_r, _u, nrmv); M.scale(S.set(w * 1.5, h * (.25 + .75 * op), 1)); M.setPosition(p.x, p.y, p.z); rifts.setMatrixAt(nf, M);
      riftFx.set([op, (p.i * 7.31 + s.id) % 50, 1, 0], nf * 4); nf++;
      glow.add(p.x + nrmv.x * .1, p.y, p.z + nrmv.z * .1, w * 1.6, h * 1.1, 1, .2, .75, .22 * op, 0);
      // espada ainda na fenda: emerge ponta primeiro, recortada pelo plano da fenda
      if ((p.state === 'emerge' || p.state === 'aim' || p.state === 'ready' || p.state === 'retract') && nsw < NS) {
        const e = p.state === 'retract' ? Math.max(0, (p.e || 0) * (1 - s.t / T0.close * 1.6)) : (p.e || 0); if (e > .01) {
          const dir = p.dx ? C3.set(p.dx, p.dy, p.dz) : C3.copy(nrmv); const tipOut = e * L;
          swordAt(p.x + dir.x * (tipOut - L), p.y + dir.y * (tipOut - L), p.z + dir.z * (tipOut - L), dir, sc, [nrmv.x, nrmv.y, nrmv.z, -(nrmv.x * p.x + nrmv.y * p.y + nrmv.z * p.z) + .02], p.state === 'ready' ? .6 + .4 * Math.sin(time * 14 + p.i) : .2);
          if (!low && e < 1) glow.add(p.x, p.y, p.z, .5 * sc, .5 * sc, 1, .3, .7, .7, 2, time + p.i);
        }
      }
    }
    if (!low && s.phase !== 'close') for (let i = 0; i < 2; i++) { const a = s.portals[Math.floor(hash(i + Math.floor(time * 7) + s.id) * s.portals.length)], b = s.portals[(a.i + 1 + i) % s.portals.length]; if (a && b && a.open > .6 && b.open > .6 && Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) < 4.5) darkBolt(s.id * 13 + i + Math.floor(time * 7), a.x, a.y, a.z, b.x, b.y, b.z, .05, .8, { depth: 1, jag: .35, branches: .3 }); }
    for (const w of s.swords) {
      const dir = C3.set(w.dx, w.dy, w.dz), tip = w.phase === 'stuck' ? .5 * sc : 0, gone = w.phase === 'gone' ? 1 - w.t / .25 : 1;
      if (gone <= 0 || nsw >= NS) continue;
      swordAt(w.x + dir.x * tip - dir.x * L, w.y + dir.y * tip - dir.y * L, w.z + dir.z * tip - dir.z * L, dir, sc * (w.phase === 'gone' ? .4 + .6 * gone : 1), [0, 0, 0, 1], w.phase === 'fly' ? 1 : .3);
      if (w.phase === 'fly') { rib.seg(w.x - dir.x * L * 1.6, w.y - dir.y * L * 1.6, w.z - dir.z * L * 1.6, w.x - dir.x * L * .4, w.y - dir.y * L * .4, w.z - dir.z * L * .4, .02, .12 * sc, c4(RED, 0), c4(RED, .8)); }
      if (w.phase === 'stuck') { const k = w.t / T0.stick; groundNormal(ground, w.x, w.z, nrm); decals.add(w.x, w.y, w.z, (.9 + easeOut(w.t / .2) * .5) * sc, .9, .1, .4, (1 - k) * .8, 1, Math.min(1, w.t * 5), w.id, nrm);
        if (w.t < .35) for (let i = 0; i < (low ? 2 : 5); i++) { const a = i * 1.7 + w.id, u = w.t / .35; shard(w.x + Math.cos(a) * u * .9, w.y + Math.sin(u * 3.14) * .5, w.z + Math.sin(a) * u * .9, .07 * (1 - u * .5), a, u * 5, i); } }
    }
  }
  const _sx = new T.Vector3(), _sy = new T.Vector3();
  function swordAt(x, y, z, dir, sc, clip, glowK) { // a geometria aponta +Z do cabo (z=0) até a ponta (z=len)
    _sy.set(0, 1, 0); if (Math.abs(dir.y) > .95) _sy.set(1, 0, 0); _sx.crossVectors(_sy, dir).normalize(); _sy.crossVectors(dir, _sx).normalize();
    M.makeBasis(_sx, _sy, dir); M.scale(S.set(sc, sc, sc)); M.setPosition(x, y, z); swords.setMatrixAt(nsw, M); clipA.set(clip, nsw * 4); glowA[nsw] = glowK; nsw++;
  }

  /* ---------- Tempestade de Nadir ---------- */
  function drawNadir(s, boss) {
    const T0 = s.T, k = s.dim || 0, H = T0.height, cy = s.cy, R = T0.R * 1.15;
    if (k > .01) {
      const layers = low ? 1 : 3; for (let i = 0; i < layers && nsk < 6; i++) { const rr = R * (1 - i * .18); P.set(s.cx + Math.sin(time * .1 + i) * 1.5, cy + H - i * 2.6, s.cz + Math.cos(time * .12 + i) * 1.5); Q.identity(); S.set(rr, 1, rr); M.compose(P, Q, S); sky.setMatrixAt(nsk, M); skyFx.set([k * (i ? .8 : 1), i, s.id * 3.3 + i * 11, 0], nsk * 4); nsk++; }
      cover.visible = true; cover.position.set(s.cx, cy - 4, s.cz); cover.scale.setScalar(70); coverMat.opacity = Math.max(coverMat.opacity, .58 * k);
      // veios elétricos carmesim correndo dentro das nuvens
      if (!low) for (let i = 0; i < (boss ? 4 : 3); i++) { const sd = Math.floor(time * 6) * 7 + i * 31 + s.id, a = hash(sd) * 6.283, r0 = 6 + hash(sd + 1) * (R * .55), r1 = r0 + 4 + hash(sd + 2) * 8, a1 = a + .3 + hash(sd + 3) * .6;
        if (hash(sd + 4) < .7) boltRib(sd, s.cx + Math.cos(a) * r0, cy + H - 1.5, s.cz + Math.sin(a) * r0, s.cx + Math.cos(a1) * r1, cy + H - 2.5, s.cz + Math.sin(a1) * r1, .35, i % 2 ? RED : MAG, .9 * k, { depth: 1, jag: .35, branches: .4 }); }
    }
    for (const b of s.bolts) {
      if (nm >= 40) break; groundNormal(ground, b.x, b.z, nrm); const gy = b.y, R0 = b.r * 1.15;
      Q.setFromUnitVectors(up, C3.set(nrm[0], nrm[1], nrm[2])); P.set(b.x, gy + .05, b.z);
      if (b.phase === 'warn') {
        const kk = b.t / b.warn; S.set(R0, 1, R0); M.compose(P, Q, S); marks.setMatrixAt(nm, M); markFx.set([b.seed, kk, Math.min(1, b.t * 6), 0], nm * 4); nm++;
        // eletricidade subindo da marca nos últimos instantes (aviso), e um fio fino ligando ao céu
        if (kk > .55 && !low) for (let i = 0; i < 2; i++) { const a = hash(i + Math.floor(time * 20) + b.id) * 6.283, rr = b.r * hash(i * 3 + b.id); boltRib(b.id * 17 + i + Math.floor(time * 20), b.x + Math.cos(a) * rr, gy + .05, b.z + Math.sin(a) * rr, b.x + Math.cos(a + 1) * rr * .4, gy + .4 + kk * .6, b.z + Math.sin(a + 1) * rr * .4, .05, MAG, .9, { depth: 0, jag: .5 }); }
        if (kk > .7) rib.seg(b.x, gy + 18, b.z, b.x, gy + .2, b.z, .015 * (b.heavy ? 2 : 1), .015, c4(MAG, .25 * kk), c4(MAG, .45 * kk));
      } else {
        const st = b.phase === 'strike', kk = st ? b.t / .12 : b.t / T0.scar, w = (b.heavy ? .42 : .26) * (boss ? 1.1 : 1);
        if (st || b.t < .08) { const n = b.heavy ? 3 : 1; for (let i = 0; i < n; i++) darkBolt(b.seed * 13 + i + Math.floor(time * 30), b.x + (hash(b.id + i) - .5) * 6, cy + H - 2, b.z + (hash(b.id * 3 + i) - .5) * 6, b.x + (i ? (hash(i) - .5) * b.r : 0), gy, b.z + (i ? (hash(i * 5) - .5) * b.r : 0), i ? w * .5 : w, 1, { depth: 2, jag: .26, branches: .55 });
          glow.add(b.x, gy + .6, b.z, b.r * 4, b.r * 3, 1, .55, .9, .9 * (1 - kk * .5), 0); glow.add(b.x, gy + .2, b.z, b.r * 1.6, b.r * 1.6, 1, 1, 1, 1, 2, time); }
        S.set(R0 * (b.heavy ? 1.2 : 1), 1, R0 * (b.heavy ? 1.2 : 1)); M.compose(P, Q, S); marks.setMatrixAt(nm, M); markFx.set([b.seed, 1 - (st ? 0 : kk), st ? 1 : 1 - kk, 1], nm * 4); nm++;
        if (!st && b.t < .3) { decals.add(b.x, gy, b.z, b.r * (1.3 + kk * 2.5), 1, .2, .6, (1 - kk) * .8, 0, kk, b.id, nrm); for (let i = 0; i < (low ? 3 : 7); i++) { const a = i * 2.4 + b.id, u = b.t / .3; shard(b.x + Math.cos(a) * u * b.r * 1.4, gy + Math.sin(u * 3.14) * (b.heavy ? 1.1 : .6), b.z + Math.sin(a) * u * b.r * 1.4, (.08 + hash(i) * .08) * (b.heavy ? 1.5 : 1), a, u * 6, i); } }
        if (!st && !low && hash(Math.floor(time * 18) + b.id) < .5 * (1 - kk)) { const a = hash(b.id + Math.floor(time * 18)) * 6.283; boltRib(b.id * 5 + Math.floor(time * 18), b.x, gy + .05, b.z, b.x + Math.cos(a) * b.r, gy + .3, b.z + Math.sin(a) * b.r, .04, MAG, .8 * (1 - kk), { depth: 0, jag: .5 }); }
      }
    }
  }

  /* ---------- Katana: rastro e dragão ---------- */
  const slash = []; let slashFury = 0;
  function pushSlash(a, b, fury) { slash.push({ ax: a.x, ay: a.y, az: a.z, bx: b.x, by: b.y, bz: b.z, t: time }); if (slash.length > SQ + 1) slash.shift(); slashFury = fury ? 1 : 0; }
  function drawSlash() {
    while (slash.length && time - slash[0].t > .22) slash.shift(); let q = 0;
    for (let i = 1; i < slash.length && q < SQ; i++) { const p0 = slash[i - 1], p1 = slash[i], u0 = (time - p0.t) / .22, u1 = (time - p1.t) / .22;
      sPos.set([p0.ax, p0.ay, p0.az, p0.bx, p0.by, p0.bz, p1.ax, p1.ay, p1.az, p1.bx, p1.by, p1.bz], q * 12); sUv.set([u0, 0, u0, 1, u1, 0, u1, 1], q * 8); q++; }
    slashGeo.setDrawRange(0, q * 6); slashGeo.attributes.position.needsUpdate = slashGeo.attributes.uv.needsUpdate = true; slashMesh.visible = q > 0; slashMat.uniforms.fx.value.set(slashFury, 0, 0, 0);
  }
  const dragons = [];
  function drawDragon() {
    for (let i = dragons.length - 1; i >= 0; i--) if (time - dragons[i].t0 > 1.25) dragons.splice(i, 1);
    const d = dragons[dragons.length - 1]; dragonMesh.visible = !!d; if (!d) return;
    const u0 = (time - d.t0) / 1.25, grow = easeOut(u0 / .45), fx = Math.sin(d.yaw), fz = Math.cos(d.yaw), rx = fz, rz = -fx, big = d.boss ? 1.25 : 1;
    const center = u => { const along = u * 6.5 * grow * big, lift = Math.sin(u * Math.PI * .9) * 2.4 * big * grow + .3, wig = Math.sin(u * 9 - time * 9) * .45 * u; return [d.x + fx * along + rx * wig, d.y + lift + Math.cos(u * 7 - time * 6) * .2, d.z + fz * along + rz * wig]; };
    const radius = u => (u > .86 ? .55 - (u - .86) / .14 * .45 : .08 + .4 * Math.pow(u / .86, .8)) * big;
    for (let j = 0; j <= DR; j++) { const u = j / DR, c = center(u), cn = center(Math.min(1, u + 1 / DR)), cp = center(Math.max(0, u - 1 / DR)); A3.set(cn[0] - cp[0], cn[1] - cp[1], cn[2] - cp[2]).normalize(); B3.crossVectors(up, A3).normalize(); C3.crossVectors(A3, B3);
      for (let k2 = 0; k2 <= DS; k2++) { const a = k2 / DS * 6.283, r = radius(u) * (1 + .18 * ((k2 + j) % 2)), ca = Math.cos(a), sa = Math.sin(a), nx = B3.x * ca + C3.x * sa, ny = B3.y * ca + C3.y * sa, nz = B3.z * ca + C3.z * sa, o = (j * (DS + 1) + k2) * 3;
        dPosT[o] = c[0] + nx * r; dPosT[o + 1] = c[1] + ny * r; dPosT[o + 2] = c[2] + nz * r; dNor[o] = nx; dNor[o + 1] = ny; dNor[o + 2] = nz; } }
    dragonGeo.attributes.position.needsUpdate = dragonGeo.attributes.normal.needsUpdate = true; dragonMat.uniforms.alpha.value = u0 < .7 ? 1 : 1 - (u0 - .7) / .3;
    // cabeça: chifres, mandíbula e espinhos dorsais (estilhaços), olhos acesos
    const hd = center(1), nk = center(.9), hx = hd[0] - nk[0], hy = hd[1] - nk[1], hz = hd[2] - nk[2], yaw = Math.atan2(hx, hz), pitch = Math.atan2(hy, Math.hypot(hx, hz)), al = dragonMat.uniforms.alpha.value;
    for (const sd of [-1, 1]) { shard(hd[0] + rx * sd * .3 * big - fx * .3, hd[1] + .4 * big, hd[2] + rz * sd * .3 * big - fz * .3, .32 * big * al, -1.2, yaw, sd * .5); glow.add(hd[0] + rx * sd * .18 * big + fx * .25, hd[1] + .12, hd[2] + rz * sd * .18 * big + fz * .25, .14, .14, 1, .2, .2, al, 0); }
    shard(hd[0] + fx * .45 * big, hd[1] - .22 * big, hd[2] + fz * .45 * big, .3 * big * al, 1.9 + pitch, yaw, 0);
    for (let i = 0; i < (low ? 5 : 11); i++) { const u = .15 + i / 11 * .7, c = center(u); shard(c[0], c[1] + radius(u) * .9, c[2], .16 * big * (1 - u * .4) * al, .3, yaw, 0); }
    for (let i = 0; i < (low ? 6 : 14); i++) { const u = (time * 1.5 + i / 14) % 1, c = center(u * .95); glow.add(c[0] + (hash(i) - .5), c[1] + (hash(i * 3) - .5), c[2] + (hash(i * 7) - .5), .06, .34, 1, .15, .25, al * (1 - u), 3, i, i); }
  }
  function drawRift(s, boss) {
    const k = s.phase === 'fade' ? 1 - s.t / s.T.fade : 1, n = Math.ceil(s.front / .6);
    for (let i = 0; i < n; i++) { const d = i * .6 + .3, x = s.x0 + s.dx * d, z = s.z0 + s.dz * d, gy = ground(x, z); groundNormal(ground, x, z, nrm); decals.add(x, gy, z, (boss ? .95 : .8), 1, .08, .22, .85 * k, 1, 1, s.id + i, nrm);
      if (i % 2 === 0 && s.phase === 'run' && d > s.front - 1.4) { shard(x + (hash(i) - .5) * .8, gy + .35, z + (hash(i * 3) - .5) * .8, .2, hash(i) * 3, i, 0); glow.add(x, gy + .4, z, .9, 1.4, 1, .1, .2, .7, 0); } }
    if (!low && s.phase === 'run') { const x = s.x0 + s.dx * s.front, z = s.z0 + s.dz * s.front, gy = ground(x, z); darkBolt(s.id * 9 + Math.floor(time * 20), x, gy + .1, z, x + s.dx * .8, gy + 1.4, z + s.dz * .8, .05, .9, { depth: 1, jag: .4, branches: .4 }); }
  }
  function drawCharge(c) {
    const k = c.k, big = c.kind === 'e3boss' ? 1.3 : 1;
    glow.add(c.x, c.y, c.z, .7 * k * big, .7 * k * big, 1, .3, .6, .8, 0);
    for (let i = 0; i < (low ? 4 : 10); i++) { const a = i * 2.4 + time * 6, rr = (1 - ((time * 2 + i / 10) % 1)) * 1.3 * big; glow.add(c.x + Math.cos(a) * rr, c.y + Math.sin(a * 1.4) * rr * .5, c.z + Math.sin(a) * rr, .045, .25, 1, i % 2 ? .1 : .3, i % 2 ? .25 : .85, k, 3, a + 1.57, i); }
  }

  return {
    root,
    /** Rastro da katana: chamar a cada quadro do golpe com a base/ponta da lâmina em mundo. */
    slash(a, b, fury) { pushSlash(a, b, fury); },
    /** Silhueta do dragão de energia que sai da lâmina (Fúria do Dragão). */
    dragon(x, y, z, yaw, boss = true) { dragons.push({ x, y, z, yaw, boss, t0: time }); if (dragons.length > 2) dragons.shift(); },
    update(dt, camera, spells, charges = [], quality = 1, focus = null) {
      time += dt; uTime.value = time; low = quality === 0; cam.copy(camera.position);
      dq = nc = nl = nr = nd = nf = nsw = nsk = nm = sn = 0; for (const d of domes) { d.used = false; d.mesh.visible = false; }
      cover.visible = false; coverMat.opacity = 0; let dim = 0;
      glow.begin(); rib.begin(camera, time); decals.begin();
      for (const s of spells) { const boss = s.kind === 'e3boss';
        if (s.type === 'singularity') drawSingularity(s, boss); else if (s.type === 'barrage') drawBarrage(s, boss, focus); else if (s.type === 'nadir') { drawNadir(s, boss); dim = Math.max(dim, s.dim || 0); } else if (s.type === 'rift') drawRift(s, boss); }
      for (const id of trails.keys()) if (!spells.some(s => s.id === id && s.type === 'singularity')) trails.delete(id);
      for (const c of charges) if (c.skill === 'nadir' || c.skill === 'barrage' || c.skill === 'singularity') drawCharge(c);
      drawSlash(); drawDragon();
      for (const [m, n, fx] of [[cores, nc], [lens, nl, lensGeo], [rings, nr, ringGeo], [disks, nd, diskGeo], [rifts, nf, riftGeo], [sky, nsk, skyGeo], [marks, nm, markGeo], [shards, sn]]) { m.count = n; m.instanceMatrix.needsUpdate = true; if (fx) fx.attributes.aFx.needsUpdate = true; }
      swords.count = nsw; swords.instanceMatrix.needsUpdate = true; swordGeo.attributes.aClip.needsUpdate = swordGeo.attributes.aGlow.needsUpdate = true;
      dGeo.setDrawRange(0, dq * 6); dGeo.attributes.position.needsUpdate = true; glow.end(); rib.end(); decals.end(time);
      return { dim, swords: nsw, rifts: nf, marks: nm, shards: sn };
    },
    clear() { slash.length = 0; dragons.length = 0; trails.clear(); for (const d of domes) d.mesh.visible = false; cover.visible = false; dragonMesh.visible = false; slashMesh.visible = false;
      for (const m of [cores, lens, rings, disks, rifts, sky, marks, shards, swords]) m.count = 0; dGeo.setDrawRange(0, 0); },
    dispose() { scene.remove(root); for (const g of geos) g.dispose(); for (const m of mats) m.dispose(); shardGeo.dispose(); swordGeo.dispose(); glow.dispose(); rib.dispose(); decals.dispose(); }
  };
}

/** Espada da barragem: lâmina longa com seção em losango e fios (aEdge=1), guarda, cabo e pomo. +Z = ponta. */
function buildSwordGeo(T) {
  const pos = [], edge = [], idx = [], push = (x, y, z, e) => { pos.push(x, y, z); edge.push(e); return pos.length / 3 - 1; };
  const L = 1.7, G = .36, N = 8; // cabo 0..G, lâmina G..L
  let prev = null;
  for (let j = 0; j <= N; j++) { const u = j / N, z = G + u * (L - G), w = (.075 * (1 - u * .55)) * (u > .86 ? (1 - u) / .14 : 1) + .002, t = .018 * (1 - u * .6) + .002;
    const ring = [push(w, 0, z, 1), push(0, t, z, 0), push(-w, 0, z, 1), push(0, -t, z, 0)];
    if (prev) for (let k = 0; k < 4; k++) { const k1 = (k + 1) % 4; idx.push(prev[k], ring[k], prev[k1], prev[k1], ring[k], ring[k1]); } prev = ring; }
  const box = (x0, x1, y0, y1, z0, z1, e) => { const b = pos.length / 3, c = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]]; for (const v of c) push(v[0], v[1], v[2], e);
    for (const f of [[0, 1, 2, 3], [5, 4, 7, 6], [4, 0, 3, 7], [1, 5, 6, 2], [3, 2, 6, 7], [4, 5, 1, 0]]) idx.push(b + f[0], b + f[1], b + f[2], b + f[0], b + f[2], b + f[3]); };
  box(-.2, .2, -.03, .03, G - .045, G, .35); box(-.022, .022, -.022, .022, .06, G - .045, 0); box(-.038, .038, -.038, .038, 0, .06, .6);
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('aEdge', new T.Float32BufferAttribute(edge, 1)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
