/**
 * BISPO 4 (VÉRAXION) — VFX das "Quatro Sentenças do Abismo" (o relógio e os eventos vêm de veraxion-four-swords3d.js).
 *
 *  aura      chamas viscosas pretas com borda rubra e franja cromática presas aos ossos (um draw call) + casca rubra no
 *            corpo (inverted hull na própria malha com skinning).
 *  espadas   EspadaVeraxion.glb (geometria autoral) com shader de obsidiana, canais e rubis acesos, materialização por fenda
 *            rúnica vertical, fitas negro-rubras em espiral e halo vermelho local.
 *  voo       rastro em fita com memória de posições (corpo preto, borda rubra) + fragmentos de raio violeta quebrado.
 *  impacto   a espada crava, a energia é SUGADA (arcos e brasas convergem, anel fecha, núcleo compacta) e então explode.
 *  explosão  coluna e copa de fogo volumétrico em billows instanciados (núcleo branco-dourado, laranja, bordas rubro-
 *            negras), anéis de choque de fumaça com borda flamejante, brasas, raios violeta na base e dissipação.
 * Tudo em pool: geometrias/materiais criados uma vez; nenhum mesh por quadro.
 */
export const VERAXION_VFX_BUILD = '285-quatro-sentencas-vfx';
const clamp01 = x => Math.max(0, Math.min(1, x)), sm = x => { x = clamp01(x); return x * x * (3 - 2 * x); };
const R3 = i => { const s = Math.sin(i * 12.9898 + 4.1) * 43758.5453; return s - Math.floor(s); };
const NOISE = `float h1(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h1(i),h1(i+vec2(1,0)),f.x),mix(h1(i+vec2(0,1)),h1(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*n2(p);p*=2.03;a*=.5;}return s;}`;

/* ---------------- espada: obsidiana, canais rubros, rubis ---------------- */
const SWORD_V = `varying vec3 vN,vW,vC;varying vec2 vUv;varying vec3 vL;
void main(){vUv=uv;vC=color;vL=position;vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;vN=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*w;}`;
const SWORD_F = `${NOISE} uniform float time,uReveal,uGlow,uAlpha,uSeed;varying vec3 vN,vW,vC;varying vec2 vUv;varying vec3 vL;
void main(){
 float v=vUv.y, u=vUv.x;
 /* materialização: do pomo para a ponta, com borda ardente */
 float th=1.-uReveal*1.12, nz=fbm(vec2(u*9.+uSeed,v*30.))*.08, edge=v-th+nz; if(edge<0.) discard;
 vec3 N=normalize(vN), V=normalize(cameraPosition-vW); if(!gl_FrontFacing) N=-N;
 float ndv=clamp(dot(N,V),0.,1.), fres=pow(1.-ndv,3.);
 vec3 L=normalize(vec3(-.35,.75,.55)); float dif=clamp(dot(N,L),0.,1.), spec=pow(clamp(dot(reflect(-L,N),V),0.,1.),38.);
 float env=.5+.5*N.y; /* reflexo do céu escuro em cima, chão rubro embaixo */
 vec3 L2=normalize(vec3(.6,-.5,.4)); float spec2=pow(clamp(dot(reflect(-L2,N),V),0.,1.),14.);
 vec3 base=mix(vec3(.012,.009,.012),vec3(.045,.036,.042),vC.r)*(.5+.8*dif);
 float sheen=pow(clamp(dot(reflect(-V,N),normalize(vec3(-.2,1.,.3))),0.,1.),6.); /* metal polido: reflexo cinza-prateado do céu */
 vec3 col=base+vec3(.78,.76,.8)*spec*(.4+.6*vC.r)+vec3(.5,.49,.54)*sheen*.55*vC.r+vec3(.36,.35,.4)*fres*.6*env+vec3(.7,.03,.04)*spec2*.6+vec3(.35,.01,.02)*fres*(1.-env)*.6;
 /* canais e veios rubros da lâmina (u através da largura) */
 float glow=0.;
 if(vC.g>.95&&vC.b<.5){ float x=abs(u-.5);
  float fuller=smoothstep(.034,.0,x)*(.75+.25*sin(v*90.-time*5.));
  float side=smoothstep(.012,.0,abs(x-.14))*step(.18,v)*step(v,.66)*(.6+.4*step(.45,fract(v*26.+uSeed)));
  float chev=smoothstep(.015,0.,abs(fract(v*7.+x*2.6)-.5)*.08-.0)*step(x,.2)*step(.2,v)*step(v,.68)*.35;
  float rim=smoothstep(.38,.47,x)*.35; col+=vec3(.75,.74,.8)*smoothstep(.34,.46,x)*(.35+.65*pow(1.-ndv,1.2)); /* fio prateado */
  float tipg=smoothstep(.25,.0,v)*smoothstep(.2,.0,x)*.9, crack=step(.8,fbm(vec2(u*14.+uSeed,v*55.)))*step(x,.42)*.6;
  glow=fuller*1.7+side*.9+chev+rim*(.6+.4*fbm(vec2(v*40.,time)))+tipg+crack;
 } else if(vC.b<.5){ glow=vC.g*(.15+1.4*pow(fres,1.6))*(.55+.45*sin(v*60.+time*3.)); col+=vec3(.7,.69,.75)*pow(fres,1.8)*vC.r+vec3(.5,.49,.55)*pow(spec,.5)*.35*vC.r; /* chifres: aresta prateada, brasa só na borda */ }
 vec3 red=vec3(1.,.06,.05)*glow*(.6+.9*uGlow);
 col+=red; col+=vec3(.9,.03,.03)*.18*uGlow*(1.-ndv);
 if(vC.b>.5){ float facet=.5+.5*dot(N,normalize(vec3(.3,.8,.5))); col=mix(vec3(.45,0.,.02),vec3(1.,.15,.1),facet)*(1.1+.7*uGlow)+vec3(1.,.7,.6)*pow(facet,12.)*.8; }
 /* borda da materialização: fio de brasa */
 float burn=1.-smoothstep(0.,.045,edge); col=mix(col,vec3(1.,.25,.1)*2.,burn*step(uReveal,.999));
 gl_FragColor=vec4(col,uAlpha); }`;

export function swordMaterial(T, opts = {}) {
  return new T.ShaderMaterial({ vertexShader: SWORD_V, fragmentShader: SWORD_F, vertexColors: true, side: T.DoubleSide, toneMapped: false, fog: false,
    transparent: !!opts.transparent, uniforms: { time: { value: 0 }, uReveal: { value: 1 }, uGlow: { value: .6 }, uAlpha: { value: 1 }, uSeed: { value: opts.seed || 0 } } });
}

/* ---------------- aura: casca rubra no corpo (skinning) com franja cromática ---------------- */
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
void main(){ float f=pow(1.-abs(dot(normalize(vN),normalize(vV))),3.5); float fl=.6+.4*sin(vY*7.-time*6.)*sin(vY*3.1+time*2.3);
 float a=f*uInt*fl; if(a<.01) discard; gl_FragColor=vec4(uCol*a,1.); }`;

/* ---------------- aura: línguas viscosas pretas com borda rubra presas aos ossos ---------------- */
const TONGUE_V = `uniform vec3 uAnchor[14]; uniform float time,uInt; attribute vec4 aF; attribute vec4 aA; varying vec2 vU; varying float vS;
void main(){ vU=uv; vS=aF.z; int idx=int(aA.x+.5); vec3 base=uAnchor[0];
 for(int i=0;i<14;i++){ if(i==idx) base=uAnchor[i]; }
 vec3 off=vec3(aA.y,0.,aA.z)*aA.w; float h=uv.y, L=aF.x*(.55+.45*uInt), t=time*(1.2+.6*aF.w);
 vec3 V=normalize(cameraPosition-base); vec3 side=normalize(cross(vec3(0.,1.,0.),V)); vec3 fw=normalize(cross(side,vec3(0.,1.,0.)));
 float sway=(sin(h*3.4-t*2.2+aF.z*6.)*.32+sin(h*7.-t*3.4+aF.z*11.)*.1)*h*L, curl=sin(h*2.6-t*1.5+aF.z*3.)*.22*h*L;
 float w=aF.y*pow(1.-h,1.1)*(.6+.4*smoothstep(0.,.15,h))*(.7+.3*uInt);
 vec3 p=base+off*(1.+h*.6)+vec3(0.,h*L,0.)+side*(sway+(uv.x-.5)*2.*w)+fw*curl+normalize(off+vec3(1e-4))*h*h*L*.25;
 gl_Position=projectionMatrix*viewMatrix*vec4(p,1.); }`;
const TONGUE_F = `${NOISE} uniform float time,uInt; varying vec2 vU; varying float vS;
void main(){ float h=vU.y, x=vU.x*2.-1.; float n=fbm(vec2(x*2.+vS*7.,h*4.-time*2.2));
 float e=abs(x)+.14*(n-.5); if(e>1.) discard; float a=uInt*(1.-smoothstep(.65,1.,h))*(.6+.4*smoothstep(0.,.08,h)); if(a<.02) discard;
 vec3 c=vec3(.012,.002,.006); float rim=smoothstep(.4,.97,e); c=mix(c,vec3(.9,.05,.05),rim*.85); /* corpo da chama translúcido, contorno rubro como pincelada */
 c=mix(c,vec3(.15,.85,.85),smoothstep(.85,.99,e)*step(x,0.)*.55); c=mix(c,vec3(.75,.15,.9),smoothstep(.85,.99,e)*step(0.,x)*.35); /* franja cromática discreta */
 gl_FragColor=vec4(c,a*mix(.38,.8,rim)*(1.-smoothstep(.9,1.,e))); }`;

/* ---------------- fitas negro-rubras em espiral em volta da lâmina ---------------- */
const RIB_V = `uniform vec3 uGuard,uDir,uSa,uSb; uniform float uL,time,uA; attribute vec3 aR; varying vec2 vU; varying float vH;
void main(){ float s=aR.x, hx=aR.z; vU=vec2(aR.y,s); vH=hx; float along=-.03+s*.74;
 float ang=hx*3.14159+s*6.2832*1.7-time*(1.4+.4*hx), rad=uL*(.06+.03*sin(s*9.+time*2.+hx*2.))*(1.-.45*s)+uL*.014;
 vec3 c=uGuard+uDir*along*uL+(uSa*cos(ang)+uSb*sin(ang))*rad; vec3 p=c+uDir*(aR.y-.5)*uL*.07*(1.-s*.5);
 gl_Position=projectionMatrix*viewMatrix*vec4(p,1.); }`;
const RIB_F = `${NOISE} uniform float time,uA; varying vec2 vU; varying float vH;
void main(){ float x=abs(vU.x*2.-1.), s=vU.y; float n=fbm(vec2(s*14.-time*2.+vH*5.,vU.x*3.));
 float brk=smoothstep(.22,.45,n2(vec2(s*5.-time*.8+vH*3.,vH*7.))); float a=uA*brk*smoothstep(0.,.08,s)*(1.-smoothstep(.82,1.,s))*smoothstep(1.,.3,x+.6*(n-.5)); if(a<.03) discard; /* fitas de fumaça partidas, não um tubo liso */
 vec3 c=mix(vec3(.015,.0,.004),vec3(1.,.07,.05),smoothstep(.25,.85,x+.35*(n-.5))*(.7+.3*n)); gl_FragColor=vec4(c,a*.9); }`;

/* ---------------- billboards alinhados a um eixo (halo, fenda rúnica) ---------------- */
const AXB_V = `uniform vec3 uC,uAx; uniform vec2 uSz; varying vec2 vU;
void main(){ vU=uv; vec3 V=normalize(cameraPosition-uC); vec3 side=normalize(cross(uAx,V)); vec3 p=uC+side*(uv.x-.5)*uSz.x+uAx*(uv.y-.5)*uSz.y; gl_Position=projectionMatrix*viewMatrix*vec4(p,1.); }`;
const HALO_F = `uniform float uA; varying vec2 vU; void main(){ vec2 q=(vU-.5)*2.; float r=length(q*vec2(1.,.55)); float a=uA*exp(-r*r*5.)*smoothstep(1.,.6,max(abs(q.x),abs(q.y)))*(.8+.2*sin(vU.y*20.)); if(a<.01) discard; gl_FragColor=vec4(vec3(1.,.05,.04)*a,1.); }`;
const RIFT_F = `${NOISE} uniform float uK,uA,time; varying vec2 vU;
void main(){ float x=abs(vU.x*2.-1.), y=vU.y; float open=uK*(.55+.45*smoothstep(0.,.5,1.-abs(y*2.-1.))); float jag=.05*(fbm(vec2(y*18.,time*2.))-.5);
 float edge=open*.35+jag; float inside=step(x,edge); float rim=smoothstep(.09,.0,abs(x-edge)); float glyph=smoothstep(.015,.0,abs(fract(y*14.)-.5)-.47)*step(.6,h1(vec2(floor(y*14.),floor(time*5.))))*smoothstep(.35,.1,abs(x-edge-.08))*uK*.7;
 float glow=exp(-pow(max(0.,x-edge),2.)*30.)*.6; float ends=smoothstep(0.,.06,y)*smoothstep(1.,.94,y);
 vec3 c=mix(vec3(1.,.08,.05)*(rim*1.4+glow+glyph),vec3(.0,0.,.004),inside); float a=uA*ends*max(inside*.95,clamp(rim+glow*.8+glyph,0.,1.)); if(a<.02) discard; gl_FragColor=vec4(c,a); }`;

/* ---------------- aviso no chão (anel rúnico rubro) ---------------- */
const GND_V = `varying vec2 vU; void main(){ vU=uv*2.-1.; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const WARN_F = `uniform float uA,time; varying vec2 vU; void main(){ float r=length(vU); if(r>1.) discard; float ang=atan(vU.y,vU.x);
 float ring=smoothstep(.05,.0,abs(r-.94)), inner=smoothstep(.025,0.,abs(r-.8))*step(.5,fract(ang*6.+time*.7)), tick=step(.82,fract(ang*14.-time*1.2))*step(.84,r)*step(r,.92);
 float a=uA*(ring*.9+inner*.5+tick*.6+step(r,.94)*.07); vec3 c=mix(vec3(.6,.02,.04),vec3(1.,.25,.15),ring); gl_FragColor=vec4(c*a,1.); }`;
/* sucção: espirais convergindo, anel externo fechando */
const SUCK_F = `uniform float uK,uA,time; varying vec2 vU; void main(){ float r=length(vU); if(r>1.) discard; float ang=atan(vU.y,vU.x), k=uK;
 float sp=pow(max(0.,sin(ang*7.+r*14.+k*22.)),10.)*smoothstep(1.,.15,r)*smoothstep(.0,.25,r); float ring=smoothstep(.06,0.,abs(r-(1.-k*.88)));
 float a=uA*(sp*.8+ring); vec3 c=mix(vec3(.65,.25,1.),vec3(1.,.08,.05),sp); gl_FragColor=vec4(c*a,1.); }`;

/* ---------------- rastro de voo: corpo preto, borda rubra, fragmentos de raio violeta ---------------- */
const TRAIL_V = `attribute vec2 aT; varying vec2 vU; void main(){ vU=aT; gl_Position=projectionMatrix*viewMatrix*vec4(position,1.); }`;
const TRAIL_F = `${NOISE} uniform float time,uSeed,uA; varying vec2 vU;
void main(){ float x=vU.x*2.-1., v=vU.y; float n=fbm(vec2(v*9.-time*4.+uSeed,x*2.));
 float e=abs(x)+.3*(n-.5)*v; if(e>1.) discard; float a=uA*pow(1.-v,1.25)*smoothstep(1.,.6,e); if(a<.02) discard;
 vec3 c=vec3(.02,.0,.006); c=mix(c,vec3(1.,.08,.05),smoothstep(.45,.85,e)); 
 float ln=(n2(vec2(v*7.-time*5.,uSeed))-.5)*1.3, bolt=smoothstep(.07,.0,abs(x-ln))*step(.45,n2(vec2(v*16.,floor(time*14.)+uSeed)));
 c=mix(c,vec3(.85,.5,1.),bolt); gl_FragColor=vec4(c,max(a*.88,bolt*uA*(1.-v))); }`;

/* ---------------- raios violeta (pool de fitas quebradas voltadas para a câmera) ---------------- */
const BOLT_V = `attribute vec2 aB; varying vec2 vB; void main(){ vB=aB; gl_Position=projectionMatrix*viewMatrix*vec4(position,1.); }`;
const BOLT_F = `varying vec2 vB; void main(){ float x=abs(vB.x*2.-1.); float core=smoothstep(.45,0.,x), glow=smoothstep(1.,0.,x); float a=vB.y*(core+glow*.5); if(a<.01) discard;
 gl_FragColor=vec4(mix(vec3(.55,.18,1.),vec3(.97,.86,1.),core)*a,1.); }`;

/* ---------------- brasas / faíscas (Points) ---------------- */
const PT_V = `attribute vec4 aC; varying vec4 vC; void main(){ vC=aC; vec4 mv=viewMatrix*vec4(position,1.); gl_PointSize=clamp(140./-mv.z,1.5,9.); gl_Position=projectionMatrix*mv; }`;
const PT_F = `varying vec4 vC; void main(){ vec2 p=gl_PointCoord*2.-1.; float d=dot(p,p); if(d>1.||vC.a<.01) discard; gl_FragColor=vec4(vC.rgb*vC.a*(1.-d),1.); }`;

/* ---------------- explosão: billows instanciados (fogo volumétrico) ---------------- */
const BILLOW_V = `attribute float aHeat,aSeed,aAlpha; uniform float time; varying float vHeat,vSeed,vAlpha; varying vec3 vN,vV,vP;
float hs(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float n3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hs(i),hs(i+vec3(1,0,0)),f.x),mix(hs(i+vec3(0,1,0)),hs(i+vec3(1,1,0)),f.x),f.y),mix(mix(hs(i+vec3(0,0,1)),hs(i+vec3(1,0,1)),f.x),mix(hs(i+vec3(0,1,1)),hs(i+vec3(1,1,1)),f.x),f.y),f.z);}
void main(){ vHeat=aHeat; vSeed=aSeed; vAlpha=aAlpha; vec3 p=position; float d=n3(p*2.6+aSeed*7.+vec3(0.,-time*.9,0.))*.55+n3(p*5.3-aSeed*3.+time*.4)*.3+n3(p*10.+aSeed)*.12; p*=.74+d*.6; vP=p;
 vec4 w=modelMatrix*instanceMatrix*vec4(p,1.); vN=normalize(mat3(modelMatrix*instanceMatrix)*position); vV=cameraPosition-w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
const BILLOW_F = `uniform float time; varying float vHeat,vSeed,vAlpha; varying vec3 vN,vV,vP;
float dith(vec2 c){return fract(52.9829189*fract(dot(c,vec2(.06711056,.00583715))));}
float hs(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float n3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hs(i),hs(i+vec3(1,0,0)),f.x),mix(hs(i+vec3(0,1,0)),hs(i+vec3(1,1,0)),f.x),f.y),mix(mix(hs(i+vec3(0,0,1)),hs(i+vec3(1,0,1)),f.x),mix(hs(i+vec3(0,1,1)),hs(i+vec3(1,1,1)),f.x),f.y),f.z);}
void main(){ vec3 N=normalize(vN), V=normalize(vV); float ndv=clamp(dot(N,V),0.,1.), top=clamp(N.y*.5+.5,0.,1.);
 float n=n3(vP*4.+vSeed*5.+vec3(0.,-time*1.3,0.))*.6+n3(vP*9.-time*.7)*.4;
 if(n>vAlpha*1.25+.05) discard; float near=smoothstep(1.5,4.5,length(vV)); if(dith(gl_FragCoord.xy)>near*1.02) discard; /* perto da câmera: transparência pontilhada, o herói continua visível */
 float h=vHeat*(.45+.55*pow(ndv,.7))*(.8+.35*top)+(n-.5)*.35;
 vec3 c=mix(vec3(.07,.05,.05),vec3(.42,.07,.03),smoothstep(.05,.3,h)); c=mix(c,vec3(.95,.3,.03),smoothstep(.25,.52,h)); c=mix(c,vec3(1.,.66,.12),smoothstep(.48,.76,h)); c=mix(c,vec3(1.,.93,.7),smoothstep(.8,1.08,h)); c*=.88+.24*n; /* fumaça escura → brasa → laranja → ouro → branco */
 c*=.75+.35*top; c=mix(c,c*.35,pow(1.-ndv,2.)*(1.-smoothstep(.5,.9,vHeat))); /* crosta rubro-negra nas bordas frias */
 gl_FragColor=vec4(c,1.); }`;
/* anéis de choque: fumaça cinza com borda flamejante */
const RING_V = `attribute vec4 aR; varying vec4 vR; varying vec2 vP; void main(){ vR=aR; vP=position.xz; gl_Position=projectionMatrix*viewMatrix*modelMatrix*instanceMatrix*vec4(position,1.); }`;
const RING_F = `${NOISE} uniform float time; varying vec4 vR; varying vec2 vP;
void main(){ float r=length(vP), ang=atan(vP.y,vP.x); float n=fbm(vec2(ang*3.+vR.z*9.,r*4.-time*.6)), n2b=fbm(vec2(ang*9.-vR.z*3.,time*.3));
 float band=smoothstep(.62,.84,r+.12*(n-.5))*smoothstep(1.,.86,r-.1*(n2b-.5)); float a=vR.y*band*(.55+.45*n); if(a<.02) discard;
 vec3 smoke=mix(vec3(.42,.36,.34),vec3(.92,.88,.82),n2b); vec3 c=mix(smoke,vec3(1.,.45,.08),smoothstep(.8,.66,r)*vR.w*(.6+.4*n)); gl_FragColor=vec4(c,a*.85); }`;

function radialTex(T, stops) { const c = typeof document !== 'undefined' ? document.createElement('canvas') : null; if (!c) return null; c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); for (const [o, col] of stops) gr.addColorStop(o, col); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new T.CanvasTexture(c); return t; }
function icoGeo(T) { return new T.IcosahedronGeometry(1, 2); }

export function createFourSwordsVFX(T, scene, opts = {}) {
  const root = new T.Group(); root.name = 'VeraxionQuatroSentencas'; scene.add(root); const geos = [], mats = [], uTime = { value: 0 };
  const mat = o => { const m = new T.ShaderMaterial({ toneMapped: false, fog: false, ...o, uniforms: { time: uTime, ...(o.uniforms || {}) } }); mats.push(m); return m; };
  const add = (m, ro = 4) => { m.frustumCulled = false; m.visible = false; m.renderOrder = ro; root.add(m); return m; };
  let swordGeo = opts.swordGeometry || null; const swords = [];
  const NB = 4;
  /* espadas + halo + fitas + fenda */
  const quadG = new T.PlaneGeometry(1, 1); geos.push(quadG);
  const ribG = (() => { const g = new T.BufferGeometry(), S = 44, A = [], I = []; for (let hx = 0; hx < 2; hx++) { const o = A.length / 3; for (let j = 0; j <= S; j++) for (let k = 0; k < 2; k++) A.push(j / S, k, hx); for (let j = 0; j < S; j++) { const a = o + j * 2; I.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } }
    g.setAttribute('aR', new T.Float32BufferAttribute(A, 3)); g.setAttribute('position', new T.Float32BufferAttribute(new Float32Array(A.length), 3)); g.setIndex(I); return g; })(); geos.push(ribG);
  for (let i = 0; i < NB; i++) {
    const sm2 = swordMaterial(T, { seed: i * 1.7, transparent: true }); mats.push(sm2);
    const mesh = add(new T.Mesh(swordGeo || quadG, sm2), 6);
    const haloU = { uC: { value: new T.Vector3() }, uAx: { value: new T.Vector3(0, 1, 0) }, uSz: { value: new T.Vector2(1, 1) }, uA: { value: 0 } };
    const halo = add(new T.Mesh(quadG, mat({ vertexShader: AXB_V, fragmentShader: HALO_F, transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: haloU })), 3);
    const ribU = { uGuard: { value: new T.Vector3() }, uDir: { value: new T.Vector3(0, -1, 0) }, uSa: { value: new T.Vector3(1, 0, 0) }, uSb: { value: new T.Vector3(0, 0, 1) }, uL: { value: 1 }, uA: { value: 0 } };
    const rib = add(new T.Mesh(ribG, mat({ vertexShader: RIB_V, fragmentShader: RIB_F, transparent: true, depthWrite: false, side: T.DoubleSide, uniforms: ribU })), 7);
    const riftU = { uC: { value: new T.Vector3() }, uAx: { value: new T.Vector3(0, 1, 0) }, uSz: { value: new T.Vector2(1, 1) }, uK: { value: 0 }, uA: { value: 0 } };
    const rift = add(new T.Mesh(quadG, mat({ vertexShader: AXB_V, fragmentShader: RIFT_F, transparent: true, depthWrite: false, uniforms: riftU })), 5);
    const warnU = { uA: { value: 0 } }; const warn = add(new T.Mesh(quadG, mat({ vertexShader: GND_V, fragmentShader: WARN_F, transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: warnU })), 2); warn.rotation.x = -Math.PI / 2;
    const suckU = { uK: { value: 0 }, uA: { value: 0 } }; const suck = add(new T.Mesh(quadG, mat({ vertexShader: GND_V, fragmentShader: SUCK_F, transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: suckU })), 5); suck.rotation.x = -Math.PI / 2;
    /* rastro: 28 amostras, fita voltada para a câmera */
    const TN = 34, tg = new T.BufferGeometry(), tp = new Float32Array(TN * 2 * 3), ta = new Float32Array(TN * 2 * 2), ti = [];
    for (let j = 0; j < TN; j++) { ta.set([0, j / (TN - 1), 1, j / (TN - 1)], j * 4); if (j < TN - 1) { const a = j * 2; ti.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } }
    tg.setAttribute('position', new T.BufferAttribute(tp, 3).setUsage(T.DynamicDrawUsage)); tg.setAttribute('aT', new T.BufferAttribute(ta, 2)); tg.setIndex(ti); geos.push(tg);
    const trailU = { uSeed: { value: i * 3.1 }, uA: { value: 0 } }; const trail = add(new T.Mesh(tg, mat({ vertexShader: TRAIL_V, fragmentShader: TRAIL_F, transparent: true, depthWrite: false, side: T.DoubleSide, uniforms: trailU })), 6);
    const flash = add(new T.Sprite(new T.SpriteMaterial({ map: radialTex(T, [[0, 'rgba(255,255,240,1)'], [.25, 'rgba(255,230,120,.95)'], [.55, 'rgba(255,120,20,.55)'], [1, 'rgba(255,40,0,0)']]), transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false, fog: false })), 8); mats.push(flash.material);
    const core = add(new T.Sprite(new T.SpriteMaterial({ map: radialTex(T, [[0, 'rgba(255,240,240,1)'], [.3, 'rgba(255,60,40,.9)'], [1, 'rgba(120,0,40,0)']]), transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false, fog: false })), 8); mats.push(core.material);
    swords.push({ mesh, mat: sm2, halo, haloU, rib, ribU, rift, riftU, warn, warnU, suck, suckU, trail, trailU, tp, TN, samples: [], lastSample: null, flash, core, wasState: 'hidden', explodeT: -1 });
  }
  /* aura: línguas (um draw) + casca no corpo */
  const ANCH = 14, tongueG = (() => { const g = new T.BufferGeometry(), N = 9, P = [], U = [], F = [], AA = [], I = []; let o = 0; const anchorsW = [3, 3, 2, 2, 2, 2, 1, 1, 1, 1, 2, 2, 1, 1]; /* nascem da silhueta: tronco, cabeça, braços, mãos e pernas */
    const RAD = [.3, .3, .14, .16, .12, .12, .1, .1, .07, .07, .16, .16, .11, .11];
    let id = 0; for (let a = 0; a < ANCH; a++) for (let q = 0; q < anchorsW[a]; q++) { const ang = (q / anchorsW[a] + .17 * R3(id)) * 6.283, rr = RAD[a] * (.85 + .3 * R3(id + 7)), len = (a < 4 ? .8 : .5) + .55 * R3(id + 11), w = (a < 4 ? .26 : .16) + .1 * R3(id + 13);
      for (let j = 0; j <= N; j++) for (let k = 0; k < 2; k++) { P.push(0, 0, 0); U.push(k, j / N); F.push(len, w, R3(id + 17), R3(id + 19)); AA.push(a, Math.cos(ang), Math.sin(ang), rr); }
      for (let j = 0; j < N; j++) { const b = o + j * 2; I.push(b, b + 2, b + 1, b + 1, b + 2, b + 3); } o += (N + 1) * 2; id++; }
    g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(U, 2)); g.setAttribute('aF', new T.Float32BufferAttribute(F, 4)); g.setAttribute('aA', new T.Float32BufferAttribute(AA, 4)); g.setIndex(I); g.userData.count = id; return g; })(); geos.push(tongueG);
  const anchorU = Array.from({ length: ANCH }, () => new T.Vector3()), auraU = { uAnchor: { value: anchorU }, uInt: { value: 0 } };
  const tongues = add(new T.Mesh(tongueG, mat({ vertexShader: TONGUE_V, fragmentShader: TONGUE_F, transparent: true, depthWrite: false, side: T.DoubleSide, uniforms: auraU })), 5);
  const bodyGlowU = { uC: { value: new T.Vector3() }, uAx: { value: new T.Vector3(0, 1, 0) }, uSz: { value: new T.Vector2(1, 1) }, uA: { value: 0 } };
  const bodyGlow = add(new T.Mesh(quadG, mat({ vertexShader: AXB_V, fragmentShader: HALO_F, transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: bodyGlowU })), 2);
  let hulls = [], hullRoot = null, anchorBones = [];
  const hullMat = (col, shift, thick) => mat({ vertexShader: HULL_V, fragmentShader: HULL_F, transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: { uCol: { value: new T.Color(col) }, uInt: { value: 0 }, uShift: { value: shift }, uThick: { value: thick } } });
  function attachBoss(bossRoot) {
    if (hullRoot === bossRoot) return; detachBoss(); if (!bossRoot) return; hullRoot = bossRoot;
    const names = ['mixamorigSpine1', 'mixamorigSpine2', 'mixamorigNeck', 'mixamorigHead', 'mixamorigLeftArm', 'mixamorigRightArm', 'mixamorigLeftForeArm', 'mixamorigRightForeArm', 'mixamorigLeftHand', 'mixamorigRightHand', 'mixamorigLeftUpLeg', 'mixamorigRightUpLeg', 'mixamorigLeftLeg', 'mixamorigRightLeg'];
    const alt = ['Chest', 'UpperChest', 'Neck', 'Head', 'LeftUpperArm', 'RightUpperArm', 'LeftLowerArm', 'RightLowerArm', 'LeftHand', 'RightHand', 'LeftUpperLeg', 'RightUpperLeg', 'LeftLowerLeg', 'RightLowerLeg'];
    anchorBones = names.map((n, k) => bossRoot.getObjectByName(n) || bossRoot.getObjectByName(alt[k]) || null);
    bossRoot.traverse(o => { if (o.isSkinnedMesh && hulls.length < 4) { o.updateWorldMatrix(true, false); const ws = new T.Vector3(); o.getWorldScale(ws); const sc = Math.max(1e-4, (ws.x + ws.y + ws.z) / 3);
      for (const [col, sh, th] of [[0xff1408, .0025, .045], [0x11c8d8, -.0025, .03]]) { if (opts.low && sh < 0) continue; const h = new T.SkinnedMesh(o.geometry, hullMat(col, sh, th / sc)); h.bind(o.skeleton, o.bindMatrix); h.bindMode = o.bindMode; h.frustumCulled = false; h.renderOrder = 5; h.position.copy(o.position); h.quaternion.copy(o.quaternion); h.scale.copy(o.scale); o.parent.add(h); hulls.push(h); } } });
  }
  function detachBoss() { for (const h of hulls) { h.parent && h.parent.remove(h); h.material.dispose(); } hulls = []; hullRoot = null; anchorBones = []; }
  /* raios violeta: pool */
  const BN = 48, BS = 10, bP = new Float32Array(BN * (BS + 1) * 2 * 3), bA = new Float32Array(BN * (BS + 1) * 2 * 2), bI = [];
  for (let b = 0; b < BN; b++) for (let j = 0; j < BS; j++) { const a = (b * (BS + 1) + j) * 2; bI.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  const boltG = new T.BufferGeometry(); boltG.setAttribute('position', new T.BufferAttribute(bP, 3).setUsage(T.DynamicDrawUsage)); boltG.setAttribute('aB', new T.BufferAttribute(bA, 2).setUsage(T.DynamicDrawUsage)); boltG.setIndex(bI); geos.push(boltG);
  const bolts = add(new T.Mesh(boltG, mat({ vertexShader: BOLT_V, fragmentShader: BOLT_F, transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide })), 9); bolts.visible = true;
  const boltSt = Array.from({ length: BN }, () => ({ life: 0, max: 0, a: new T.Vector3(), b: new T.Vector3(), w: .1, seed: 0, re: 0, amp: .3 }));
  let boltI = 0; const spawnBolt = (a, b, life, w, amp) => { const s = boltSt[boltI++ % BN]; s.a.copy(a); s.b.copy(b); s.life = s.max = life; s.w = w; s.amp = amp ?? .35; s.seed = Math.random() * 100; s.re = 0; return s; };
  /* brasas */
  const PN = opts.low ? 260 : 520, pP = new Float32Array(PN * 3), pC = new Float32Array(PN * 4), pV = new Float32Array(PN * 3), pL = new Float32Array(PN * 2);
  const ptG = new T.BufferGeometry(); ptG.setAttribute('position', new T.BufferAttribute(pP, 3).setUsage(T.DynamicDrawUsage)); ptG.setAttribute('aC', new T.BufferAttribute(pC, 4).setUsage(T.DynamicDrawUsage)); geos.push(ptG);
  const pts = add(new T.Points(ptG, mat({ vertexShader: PT_V, fragmentShader: PT_F, transparent: true, depthWrite: false, blending: T.AdditiveBlending })), 9); pts.visible = true; let pI = 0;
  const emit = (x, y, z, vx, vy, vz, r, g, b, life) => { const i = pI++ % PN; pP.set([x, y, z], i * 3); pV.set([vx, vy, vz], i * 3); pC.set([r, g, b, 1], i * 4); pL[i * 2] = life; pL[i * 2 + 1] = life; };
  /* explosões: billows instanciados (todas as quatro num draw), anéis de choque instanciados */
  /* layout das billows por explosão (cogumelo da referência): núcleo, coluna, copa em toro, topo da copa, saia no chão */
  const layout = []; { let id = 0; const push = (role, a, r, y, s) => layout.push({ role, a, r, y, s, k: id++ }); const lo = !!opts.low;
    for (let i = 0; i < (lo ? 7 : 11); i++) push(0, i * 2.39996, .42 * Math.sqrt(R3(i + 1)), .1 + .3 * R3(i + 2), .3 + .14 * R3(i + 3));
    for (let i = 0; i < (lo ? 8 : 14); i++) push(1, i * 2.39996, .12 + .14 * R3(i + 5), .12 + .78 * (i / (lo ? 8 : 14)), .2 + .09 * R3(i + 6));
    const NC = lo ? 13 : 22; for (let i = 0; i < NC; i++) push(2, i / NC * 6.283 + .2 * R3(i), .5 + .16 * R3(i + 8), .92 + .1 * Math.sin(i * 2.1), .24 + .1 * R3(i + 9));
    for (let i = 0; i < (lo ? 4 : 7); i++) push(3, i * 2.39996, .38 * Math.sqrt(R3(i + 12)), 1.06 + .05 * R3(i + 3), .26 + .08 * R3(i + 4));
    for (let i = 0; i < (lo ? 6 : 10); i++) push(4, i / (lo ? 6 : 10) * 6.283 + .4, .7 + .2 * R3(i + 3), .05, .18 + .08 * R3(i + 4)); }
  const BPE = layout.length, ico = new T.IcosahedronGeometry(1, opts.low ? 1 : 2); geos.push(ico);
  const bHeat = new Float32Array(NB * BPE), bSeed = new Float32Array(NB * BPE), bAlpha = new Float32Array(NB * BPE); for (let i = 0; i < bSeed.length; i++) bSeed[i] = R3(i * 1.37);
  ico.setAttribute('aHeat', new T.InstancedBufferAttribute(bHeat, 1).setUsage(T.DynamicDrawUsage)); ico.setAttribute('aSeed', new T.InstancedBufferAttribute(bSeed, 1)); ico.setAttribute('aAlpha', new T.InstancedBufferAttribute(bAlpha, 1).setUsage(T.DynamicDrawUsage));
  const billows = add(new T.InstancedMesh(ico, mat({ vertexShader: BILLOW_V, fragmentShader: BILLOW_F }), NB * BPE), 4); billows.instanceMatrix.setUsage(T.DynamicDrawUsage);
  const ringG = new T.RingGeometry(.55, 1, 48, 1).rotateX(-Math.PI / 2); geos.push(ringG); const RPE = 3, rA = new Float32Array(NB * RPE * 4); ringG.setAttribute('aR', new T.InstancedBufferAttribute(rA, 4).setUsage(T.DynamicDrawUsage));
  const rings = add(new T.InstancedMesh(ringG, mat({ vertexShader: RING_V, fragmentShader: RING_F, transparent: true, depthWrite: false, side: T.DoubleSide }), NB * RPE), 5); rings.instanceMatrix.setUsage(T.DynamicDrawUsage);
  const M4 = new T.Matrix4(), Q = new T.Quaternion(), SV = new T.Vector3(), PV = new T.Vector3(), V = new T.Vector3(), W = new T.Vector3(), X = new T.Vector3(), Y = new T.Vector3(), UP = new T.Vector3(0, 1, 0), DN = new T.Vector3(0, -1, 0);
  for (let i = 0; i < NB * BPE; i++) { M4.makeScale(0, 0, 0); billows.setMatrixAt(i, M4); } for (let i = 0; i < NB * RPE; i++) rings.setMatrixAt(i, M4);
  let time = 0; const cam = new T.Vector3();
  function explosionFrame(e, age, cx, cy, cz, R) {
    const H = R * 2.35, alive = age < 2.3; let n = 0;
    for (const b of layout) { const idx = e * BPE + b.k; if (!alive) { M4.makeScale(0, 0, 0); billows.setMatrixAt(idx, M4); continue; }
      let x = 0, y = 0, z = 0, s = 0, heat = 0; const fade = sm((age - .95) / 1.15), al = 1 - fade * .9, shrink = 1 - .55 * fade;
      const g = sm(age / .28), rise = sm((age - .03) / .7), roll = age * (.5 + .4 * R3(b.k)), cool = sm((age - .2) / .95);
      if (b.role === 0) { const r = R * b.r * (.35 + .9 * g); x = Math.cos(b.a) * r; z = Math.sin(b.a) * r; y = R * b.y * g + R * .25 * rise; s = R * b.s * (.4 + .8 * g); heat = 1.02 - .9 * cool; }
      else if (b.role === 1) { const r = R * b.r * (1 + .25 * rise); x = Math.cos(b.a + roll) * r; z = Math.sin(b.a + roll) * r; y = H * b.y * rise; s = R * b.s * (.55 + .55 * rise); heat = 1.1 - .9 * cool - b.y * .12; }
      else if (b.role === 2) { const cg = sm((age - .08) / .72), r = R * b.r * (.3 + .95 * cg); x = Math.cos(b.a + roll * .35) * r; z = Math.sin(b.a + roll * .35) * r; y = H * (.3 + .7 * rise) * b.y; s = R * b.s * (.3 + .9 * cg); heat = (1.05 - .85 * sm((age - .3) / 1.1)) * (.82 + .18 * Math.sin(b.a * 5 + b.k)); }
      else if (b.role === 3) { const cg = sm((age - .12) / .75); x = Math.cos(b.a) * R * b.r * cg; z = Math.sin(b.a) * R * b.r * cg; y = H * (.3 + .7 * rise) * b.y + R * .08 * cg; s = R * b.s * (.3 + .85 * cg); heat = 1.05 - .9 * cool; }
      else { const cg = sm(age / .45), r = R * b.r * (.45 + .95 * cg); x = Math.cos(b.a) * r; z = Math.sin(b.a) * r; y = R * .1 * cg; s = R * b.s * (.4 + .7 * cg); heat = .75 - .7 * sm((age - .15) / .8); }
      M4.compose(PV.set(cx + x, cy + y, cz + z), Q.setFromAxisAngle(UP, b.a + age * .3), SV.setScalar(Math.max(0, s * shrink))); billows.setMatrixAt(idx, M4); bHeat[idx] = Math.max(0, heat); bAlpha[idx] = Math.max(0, al); n++; }
    /* anéis: chão, meio da coluna, borda da copa */
    const RD = [[.05, .95, R * .7, R * 3.1, .04], [.2, 1.05, R * .5, R * 2.05, H * .5], [.34, 1.2, R * .7, R * 2.7, H * .88]];
    RD.forEach(([t0, dur, r0, r1, yy], k) => { const idx = e * RPE + k, kk = (age - t0) / dur; if (kk < 0 || kk > 1.4 || !alive) { M4.makeScale(0, 0, 0); rings.setMatrixAt(idx, M4); rA[idx * 4 + 1] = 0; return; }
      const rad = r0 + (r1 - r0) * (1 - Math.pow(1 - clamp01(kk), 2.4)); M4.compose(PV.set(cx, cy + yy + kk * R * .15, cz), Q.identity(), SV.set(rad, 1, rad)); rings.setMatrixAt(idx, M4); rA.set([kk, (1 - sm((kk - .45) / .95)) * .95, e * 1.7 + k, 1 - sm(kk / .7)], idx * 4); });
    return n;
  }
  function boltPath(s, k) { /* ponto k (0..1) de um raio quebrado com ramificações curtas */
    V.lerpVectors(s.a, s.b, k); const j = Math.sin(k * 23.1 + s.seed) * .5 + Math.sin(k * 51.7 + s.seed * 1.7) * .3; const off = (k > 0 && k < 1) ? s.amp * s.a.distanceTo(s.b) * .12 * j : 0;
    W.subVectors(s.b, s.a).normalize(); X.crossVectors(W, UP); if (X.lengthSq() < 1e-4) X.set(1, 0, 0); X.normalize(); Y.crossVectors(W, X); V.addScaledVector(X, off).addScaledVector(Y, off * .6 * Math.cos(k * 17 + s.seed)); return V; }
  const api = {
    root, get ready() { return !!swordGeo; },
    setSwordGeometry(g) { swordGeo = g; for (const s of swords) s.mesh.geometry = g; },
    attachBoss, detachBoss,
    /** ctx {camera, boss:{x,y,z,yaw,h}, groundY, low} */
    update(seq, ctx, dt) {
      time += dt; uTime.value = time; cam.copy(ctx.camera.position); const st = seq && seq.st, low = !!ctx.low;
      // ---- aura ----
      const ai = st && !st.done ? st.aura : 0; auraU.uInt.value = ai; tongues.visible = ai > .02 && anchorBones.length > 0;
      if (tongues.visible) anchorBones.forEach((b, k) => { if (b) b.getWorldPosition(anchorU[k]); else anchorU[k].set(ctx.boss.x, ctx.boss.y + ctx.boss.h * .6, ctx.boss.z); });
      bodyGlow.visible = ai > .02; if (bodyGlow.visible) { bodyGlowU.uC.value.set(ctx.boss.x, ctx.boss.y + ctx.boss.h * .55, ctx.boss.z); bodyGlowU.uSz.value.set(ctx.boss.h * 1.25, ctx.boss.h * 1.5); bodyGlowU.uA.value = .2 * ai; }
      for (const h of hulls) { h.visible = ai > .02; h.material.uniforms.uInt.value = ai * (h.material.uniforms.uShift.value < 0 ? .3 : .6); }
      // ---- espadas ----
      const L = st ? st.L : 1;
      swords.forEach((S, i) => { const s = st && st.swords[i], show = !!(s && !st.done && s.state !== 'hidden' && s.state !== 'gone');
        for (const m of [S.mesh, S.halo, S.rib, S.rift, S.warn, S.suck, S.trail, S.flash, S.core]) m.visible = false;
        if (!s) return;
        const dir = V.set(s.dir[0], s.dir[1], s.dir[2]).normalize(); const tip = W.set(s.tip[0], s.tip[1], s.tip[2]);
        let rise = 0; if (s.state === 'manifest' || s.state === 'aim') rise = (1 - s.reveal) * L * .28;
        X.copy(tip).addScaledVector(dir, -.743 * L); X.y += rise; const tipR = Y.copy(tip); tipR.y += rise; /* X = centro da guarda */
        let alpha = 1, reveal = s.reveal;
        if (s.state === 'blast') { const k = clamp01(s.bt / .45); reveal = 1 - k; alpha = 1; }
        if (show && reveal > .001 && swordGeo) { const m = S.mesh; m.visible = true; m.position.copy(X); Q.setFromUnitVectors(DN, dir); m.quaternion.copy(Q);
          /* rola em volta do eixo para mostrar a face larga à câmera */ PV.subVectors(cam, X); PV.addScaledVector(dir, -PV.dot(dir)).normalize(); SV.set(0, 0, 1).applyQuaternion(Q); const ang = Math.atan2(SV.clone().cross(PV).dot(dir), SV.dot(PV)); m.quaternion.premultiply(new T.Quaternion().setFromAxisAngle(dir, ang * .85));
          m.scale.setScalar(L); const u = S.mat.uniforms; u.uReveal.value = reveal; PV.copy(X).addScaledVector(dir, L * .35); u.uAlpha.value = alpha * (.18 + .82 * sm((PV.distanceTo(cam) - L * .25) / (L * .8))); /* lâmina perto da câmera fica translúcida: não cega o jogador */ u.uGlow.value = .55 + .35 * (st.aura || 0) + (s.state === 'stuck' ? 1.4 * sm(s.it / seq.T.implode) : 0) + (s.state === 'fly' ? .4 : 0); u.time.value = time;
          S.halo.visible = true; S.haloU.uC.value.copy(X).addScaledVector(dir, L * .32); S.haloU.uAx.value.copy(dir); S.haloU.uSz.value.set(L * .7, L * 1.3); S.haloU.uA.value = .45 * reveal * (s.state === 'fly' ? 1.3 : 1) * (1 - (s.state === 'blast' ? clamp01(s.bt / .3) : 0));
          if (!low || s.state !== 'fly') { S.rib.visible = true; const ru = S.ribU; ru.uGuard.value.copy(X); ru.uDir.value.copy(dir); ru.uSa.value.crossVectors(dir, UP); if (ru.uSa.value.lengthSq() < 1e-4) ru.uSa.value.set(1, 0, 0); ru.uSa.value.normalize(); ru.uSb.value.crossVectors(dir, ru.uSa.value).normalize(); ru.uL.value = L; ru.uA.value = reveal * (s.state === 'blast' ? 0 : 1); } }
        // fenda rúnica de onde a lâmina emerge
        if (st && (s.state === 'manifest' || s.state === 'aim') && st.released < 0) { const k = clamp01((st.t - seq.T.manifestAt - i * seq.T.manifestStagger) / .35), close = 1 - sm((st.t - seq.T.manifestEnd + .1) / .35);
          if (k * close > .01) { S.rift.visible = true; const ru = S.riftU; ru.uC.value.set(s.home.x, s.home.tipY + L * .5 + L * .1, s.home.z); ru.uAx.value.set(0, 1, 0); ru.uSz.value.set(L * .12, L * 1.05); ru.uK.value = k * close; ru.uA.value = close * .85; } }
        // aviso no chão do destino
        if (st && s.target && st.released < 0 || (s.state === 'fly' && s.target)) { const k = sm((st.t - seq.T.lockAt) / .2); S.warn.visible = k > .01; S.warn.position.set(s.target.x, s.target.y + .06, s.target.z); S.warn.scale.setScalar(seq.T.blastR * 2); S.warnU.uA.value = k * (.32 + .1 * Math.sin(time * 9)); }
        // rastro: amostras por distância (independe do FPS)
        if (s.state === 'fly') { const p = PV.copy(tipR).addScaledVector(dir, -L * .3); if (!S.lastSample || S.lastSample.distanceToSquared(p) > .09) { S.samples.unshift(p.clone()); if (S.samples.length > S.TN) S.samples.pop(); S.lastSample = p.clone(); } else S.samples[0].copy(p);
          if (R3(time * 37 + i) > (low ? .75 : .45)) { const sa = S.samples[Math.min(S.samples.length - 1, 2 + Math.floor(R3(time * 11 + i) * 6))]; if (sa) spawnBolt(sa, PV.copy(sa).add(SV.set((R3(time * 3) - .5) * 2.4, (R3(time * 5) - .5) * 1.6, (R3(time * 7) - .5) * 2.4)), .09, .09, .5); }
          if (R3(time * 53 + i) > .4) emit(tipR.x, tipR.y, tipR.z, (R3(time * 9) - .5) * 3, (R3(time * 13) - .5) * 2, (R3(time * 17) - .5) * 3, R3(time) > .5 ? .8 : 1, .15, R3(time) > .5 ? 1 : .08, .45); }
        S.trailFade = s.state === 'fly' ? 1 : Math.max(0, (S.trailFade || 0) - dt * 2.2);
        if (S.samples.length > 1 && S.trailFade > .01) { S.trail.visible = true; S.trailU.uA.value = S.trailFade; const n = S.samples.length, TN = S.TN, wid = L * .2;
          for (let j = 0; j < TN; j++) { const a = S.samples[Math.min(n - 1, j)], b = S.samples[Math.min(n - 1, j + 1)], c = S.samples[Math.min(n - 1, Math.max(0, j - 1))]; SV.subVectors(c, b); if (SV.lengthSq() < 1e-6) SV.copy(dir); PV.subVectors(cam, a); X.crossVectors(SV, PV).normalize();
            const w = wid * Math.pow(1 - j / (TN - 1), .7) * (j >= n ? 0 : 1); S.tp.set([a.x + X.x * w, a.y + X.y * w, a.z + X.z * w, a.x - X.x * w, a.y - X.y * w, a.z - X.z * w], j * 6); }
          S.trail.geometry.attributes.position.needsUpdate = true; }
        if (s.state === 'gone' || s.state === 'hidden') { S.samples.length = 0; S.lastSample = null; }
        // sucção antes da explosão
        if (s.state === 'stuck' && s.stuckAt) { const k = clamp01(s.it / seq.T.implode), [x, y, z] = s.stuckAt; S.suck.visible = true; S.suck.position.set(x, y + .08, z); S.suck.scale.setScalar(seq.T.blastR * 2.3 * (1 - .35 * k)); S.suckU.uK.value = k; S.suckU.uA.value = .9;
          const gy = y + L * .2; S.core.visible = true; S.core.position.set(x, gy, z); S.core.scale.setScalar(L * (.5 - .32 * k)); S.core.material.opacity = .4 + .6 * k;
          if (R3(time * 41 + i) > .35) { const a = R3(time * 7 + i) * 6.283, r = seq.T.blastR * 2.1; spawnBolt(PV.set(x + Math.cos(a) * r, y + .4 + R3(time) * 2, z + Math.sin(a) * r), SV.set(x, gy, z), .07, .1, .45); }
          for (let q = 0; q < (low ? 2 : 4); q++) { const a = R3(time * 19 + q + i) * 6.283, r = seq.T.blastR * (1.4 + R3(time * 23 + q)), py = y + .3 + R3(time * 29 + q) * 3; emit(x + Math.cos(a) * r, py, z + Math.sin(a) * r, -Math.cos(a) * r * 2.6, (gy - py) * 2.6, -Math.sin(a) * r * 2.6, 1, .2, .1, .36); } }
        // explosão
        if (s.state === 'blast' && s.stuckAt) { const [x, y, z] = s.stuckAt, age = s.bt, R = seq.T.blastR;
          if (S.wasState !== 'blast') { for (let q = 0; q < (low ? 40 : 90); q++) { const a = R3(q * 1.3 + i) * 6.283, el = R3(q * 2.7 + i) * 1.2, sp = 6 + R3(q * 3.1) * 12; emit(x, y + .6, z, Math.cos(a) * Math.cos(el) * sp, Math.sin(el) * sp + 4, Math.sin(a) * Math.cos(el) * sp, 1, .55 + .35 * R3(q), .12, 1.1 + R3(q * 5) * .9); } }
          explosionFrame(i, age, x, y, z, R);
          const fk = age / .32; if (fk < 1) { S.flash.visible = true; S.flash.position.set(x, y + R * .9, z); S.flash.scale.setScalar(R * (1 + 2.2 * sm(fk / .4))); S.flash.material.opacity = .85 * (1 - sm((fk - .25) / .75)); }
          if (age < .9 && R3(time * 31 + i) > .55) { const a = R3(time * 3 + i) * 6.283; spawnBolt(PV.set(x + Math.cos(a) * R * .5, y + .2, z + Math.sin(a) * R * .5), SV.set(x + Math.cos(a + .6) * R * 1.3, y + R * (.5 + R3(time) * 1.2), z + Math.sin(a + .6) * R * 1.3), .08, .12, .55); } }
        else if (S.wasState === 'blast' || (st && st.done)) explosionFrame(i, 99, 0, 0, 0, 1);
        S.wasState = s.state; });
      billows.visible = rings.visible = !!(st && st.swords.some(s => s.state === 'blast'));
      billows.instanceMatrix.needsUpdate = true; billows.geometry.attributes.aHeat.needsUpdate = true; billows.geometry.attributes.aAlpha.needsUpdate = true; rings.instanceMatrix.needsUpdate = true; ringG.attributes.aR.needsUpdate = true;
      // ---- raios ----
      for (let b = 0; b < BN; b++) { const s = boltSt[b]; s.life -= dt; s.re -= dt; const alive = s.life > 0; if (alive && s.re <= 0) { s.seed = Math.random() * 100; s.re = .035; }
        for (let j = 0; j <= BS; j++) { const o = (b * (BS + 1) + j) * 2; if (!alive) { bP.fill(0, o * 3, o * 3 + 6); bA[o * 2 + 1] = bA[o * 2 + 3] = 0; continue; }
          const k = j / BS, p = boltPath(s, k).clone(), q = boltPath(s, Math.min(1, k + .1)); W.subVectors(q, p); PV.subVectors(cam, p); X.crossVectors(W, PV).normalize(); const w = s.w * (1 - k * .7) * (.6 + .4 * Math.sin(k * 31 + s.seed));
          bP.set([p.x + X.x * w, p.y + X.y * w, p.z + X.z * w, p.x - X.x * w, p.y - X.y * w, p.z - X.z * w], o * 3); const al = (s.life / s.max) * (R3(s.seed + k * 3) > .12 ? 1 : 0); bA.set([0, al, 1, al], o * 2); } }
      boltG.attributes.position.needsUpdate = true; boltG.attributes.aB.needsUpdate = true;
      // ---- brasas ----
      for (let i = 0; i < PN; i++) { if (pL[i * 2] <= 0) { pC[i * 4 + 3] = 0; continue; } pL[i * 2] -= dt; const k = pL[i * 2] / pL[i * 2 + 1]; pV[i * 3 + 1] -= 6 * dt * (pC[i * 4 + 1] > .4 ? 1 : 0); for (let q = 0; q < 3; q++) pP[i * 3 + q] += pV[i * 3 + q] * dt; pV[i * 3] *= .985; pV[i * 3 + 2] *= .985; pC[i * 4 + 3] = Math.max(0, k); }
      ptG.attributes.position.needsUpdate = true; ptG.attributes.aC.needsUpdate = true;
    },
    clear() { for (const S of swords) { S.samples.length = 0; S.lastSample = null; S.wasState = 'hidden'; S.trailFade = 0; for (const m of [S.mesh, S.halo, S.rib, S.rift, S.warn, S.suck, S.trail, S.flash, S.core]) m.visible = false; } bodyGlow.visible = false;
      for (let e = 0; e < NB; e++) explosionFrame(e, 99, 0, 0, 0, 1); billows.visible = rings.visible = false; tongues.visible = false; for (const h of hulls) h.visible = false; for (const s of boltSt) s.life = 0; pL.fill(0); pC.fill(0); },
    dispose() { detachBoss(); scene.remove(root); for (const g of geos) g.dispose(); for (const m of mats) m.dispose(); },
    stats() { return { bolts: boltSt.filter(s => s.life > 0).length, billowsPerBlast: BPE, tongues: tongueG.userData.count }; }
  };
  return api;
}
