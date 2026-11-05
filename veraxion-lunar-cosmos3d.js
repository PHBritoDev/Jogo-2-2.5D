/**
 * BISPO 4 (VÉRAXION) · ULTIMATE — cena cósmica separada, com escala artística (não altera o mundo do jogo).
 * Sistema solar estilizado (Sol com granulação e coroa, planetas com bandas/anéis/terminador, nebulosa e estrelas em
 * camadas), Lua com crateras em relevo e Terra no céu, o DEVORADOR LUNAR (DevoradorLunar.glb, com esqueleto) com shader
 * de gravura (hachuras lilás, borda rosa), buraco negro (núcleo que recorta, disco de acreção em 3 camadas, halo de
 * lente, matéria sugada), travessia Lua → Terra e a explosão em domo sobre a superfície curva da Terra com anel de
 * choque que corre pela esfera. Tudo criado uma vez (pool); a câmera é guiada pelo relógio de veraxion-lunar-ultimate3d.js.
 */
import { enhanceLunarMonster } from './veraxion-lunar-facial3d.js';
export const LUNAR_COSMOS_BUILD = '289-colossal-horror-gravity';
const clamp01 = x => Math.max(0, Math.min(1, x)), sm = x => { x = clamp01(x); return x * x * (3 - 2 * x); }, lerp = (a, b, k) => a + (b - a) * k;
const R3 = i => { const s = Math.sin(i * 12.9898 + 4.1) * 43758.5453; return s - Math.floor(s); };
const NOISE = `float h1(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h1(i),h1(i+vec2(1,0)),f.x),mix(h1(i+vec2(0,1)),h1(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*n2(p);p*=2.03;a*=.5;}return s;}`;
const N3 = `float hs(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float n3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hs(i),hs(i+vec3(1,0,0)),f.x),mix(hs(i+vec3(0,1,0)),hs(i+vec3(1,1,0)),f.x),f.y),mix(mix(hs(i+vec3(0,0,1)),hs(i+vec3(1,0,1)),f.x),mix(hs(i+vec3(0,1,1)),hs(i+vec3(1,1,1)),f.x),f.y),f.z);}
float f3(vec3 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*n3(p);p*=2.02;a*=.5;}return s;}`;

/* ---------- monstro: gravura cósmica (hachuras), skinning ---------- */
export const MONSTER_V = `#include <common>
#include <skinning_pars_vertex>
attribute vec3 color; varying vec3 vC,vN,vW; varying vec2 vU;
void main(){ vC=color; vU=uv;
 #include <skinbase_vertex>
 #include <beginnormal_vertex>
 #include <skinnormal_vertex>
 vec3 transformed=vec3(position);
 #include <skinning_vertex>
 vec4 w=modelMatrix*vec4(transformed,1.); vW=w.xyz; vN=normalize(mat3(modelMatrix)*objectNormal); gl_Position=projectionMatrix*viewMatrix*w; }`;
export const MONSTER_F = `${NOISE} uniform float time,uGlow,uReveal; uniform vec3 uKey,uRim; varying vec3 vC,vN,vW; varying vec2 vU;
void main(){ float part=vC.r, along=vC.g; vec3 N=normalize(vN), V=normalize(cameraPosition-vW); float ndv=clamp(dot(N,V),0.,1.), fres=pow(1.-ndv,2.2);
 float key=clamp(dot(N,normalize(uKey))*.5+.5,0.,1.), rimL=pow(clamp(dot(N,normalize(uRim)),0.,1.),2.);
 /* revelação de baixo para cima (silhueta se ergue) */ if(vW.y>uReveal) discard;
 float u=vU.x, v=vU.y; vec3 c;
 if(part<.12){ /* corpo: preto quase absoluto; hachuras de gravura só onde a luz/borda pega, crostas e fendas */
  float wav=fbm(vec2(u*7.,v*5.)), wav2=fbm(vec2(u*21.+5.,v*17.));
  float K=39.48*max(.05,vC.b)*6.5; /* densidade constante no mundo: ~7 traços por metro de circunferência */
  float hatch=smoothstep(.62,.97,sin(u*K+wav*22.+sin(v*14.+u*9.)*4.)*.5+.5)*(.5+.5*wav2); float cross2=smoothstep(.8,1.,sin(v*K*1.6+u*K*.3+wav*7.)*.5+.5)*.7;
  float crack=smoothstep(.64,.7,fbm(vec2(u*24.+3.,v*28.)));
  float lit=pow(key,2.)*.75+pow(fres,1.2)*1.2+rimL*.9; float lines=(hatch*.9+cross2*.35)*smoothstep(.12,.9,lit)+crack*.3*lit;
  c=vec3(.015,.006,.04)+vec3(.12,.05,.3)*pow(key,2.)*.5; c+=mix(vec3(.32,.18,.9),vec3(.95,.6,1.),clamp(fres*1.3,0.,1.))*lines*(.55+.9*fres)*1.15;
  c+=vec3(1.,.6,1.)*pow(fres,4.)*.55;
 } else if(part<.37){ /* chifres: escuros com anéis de crescimento; contorno rosa-claro forte (como no desenho) */
  float ring=smoothstep(.6,1.,sin(along*190.+fbm(vec2(u*6.,along*9.))*4.)*.5+.5)*(1.-along); float lit=pow(key,2.)*.5+pow(fres,1.);
  c=vec3(.06,.025,.12)+vec3(.5,.3,.9)*lit*.6+vec3(.7,.45,1.)*ring*.12*lit; c+=vec3(1.,.78,1.)*pow(fres,1.1)*1.35; float sc=smoothstep(.55,.95,fbm(vec2(u*14.,along*80.)))*.25; c+=vec3(.8,.55,1.)*sc*lit; c+=vec3(1.,.85,1.)*smoothstep(.9,1.,along)*.6;
 } else if(part<.62){ c=mix(vec3(.6,.45,.85),vec3(1.,.95,1.),fres)*(.6+.4*key); /* dentes */
 } else if(part<.87){ c=vec3(.95,.5,1.)*(1.4+uGlow); /* olhos */
 } else { c=mix(vec3(.08,.04,.16),vec3(.85,.6,1.),pow(fres,1.4)); }
 c*=1.+.35*uGlow; float grain=h1(gl_FragCoord.xy*.73+time)*.08; gl_FragColor=vec4(c+grain*vec3(.5,.3,.8),1.); }`;

export function monsterMaterial(T) {
  return new T.ShaderMaterial({ vertexShader: MONSTER_V, fragmentShader: MONSTER_F, toneMapped: false, fog: false,
    uniforms: { time: { value: 0 }, uGlow: { value: 0 }, uReveal: { value: 999 }, uKey: { value: new T.Vector3(.4, .6, .7) }, uRim: { value: new T.Vector3(-.3, .4, -.9) } } });
}

/* ---------- céu: nebulosa e estrelas (seguem a câmera, com parallax entre camadas) ---------- */
const SKY_V = `varying vec3 vD; void main(){ vD=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position.z=gl_Position.w*.9999; }`;
const SKY_F = `${N3} uniform float time; uniform vec3 uSun,uTint; varying vec3 vD;
void main(){ vec3 d=normalize(vD); float n=f3(d*2.2+3.), m=f3(d*5.+n*2.), sunA=pow(max(0.,dot(d,normalize(uSun))),3.);
 float band=exp(-pow(d.y*2.6+.4*sin(d.x*3.),2.)); /* faixa da galáxia */ float dust=smoothstep(.45,.8,m)*band;
 vec3 c=vec3(.004,.004,.012)+vec3(.12,.05,.22)*smoothstep(.45,.85,n)*(.5+band)+vec3(.05,.08,.22)*dust*.8+vec3(.9,.45,.1)*sunA*smoothstep(.35,.8,n)*.55*uTint.x+vec3(.25,.12,.04)*sunA*.25*uTint.x;
 c=mix(c,c*.25,smoothstep(.55,.75,f3(d*9.+1.))*band*.6); /* poeira escura recortando */ gl_FragColor=vec4(c,1.); }`;
const STAR_V = `attribute float aS; uniform float time; varying float vB; void main(){ vB=.55+.45*sin(time*(1.+aS*3.)+aS*40.); vec4 mv=modelViewMatrix*vec4(position,1.); gl_PointSize=clamp(aS*3.2,1.,4.); gl_Position=projectionMatrix*mv; gl_Position.z=gl_Position.w*.9998; }`;
const STAR_F = `varying float vB; void main(){ vec2 p=gl_PointCoord*2.-1.; float d=dot(p,p); if(d>1.) discard; gl_FragColor=vec4(vec3(.85,.9,1.)*vB*(1.-d),1.); }`;
/* ---------- Sol ---------- */
const SUN_F = `${N3} uniform float time; varying vec3 vN,vW; void main(){ vec3 n=normalize(vN); float g=f3(n*9.+vec3(time*.12,0.,0.)), g2=f3(n*22.-time*.2); float ndv=abs(dot(n,normalize(cameraPosition-vW)));
 vec3 c=mix(vec3(1.,.42,.04),vec3(1.,.86,.35),g*.8+g2*.4); c=mix(c,vec3(1.,.98,.85),pow(ndv,3.)*.6); c*=mix(.7,1.25,pow(ndv,.6)); c-=vec3(.2,.12,0.)*smoothstep(.72,.8,g2)*.6; /* manchas */ gl_FragColor=vec4(c*1.25,1.); }`;
const BODY_V = `varying vec3 vN,vW,vO; void main(){ vO=normalize(position); vN=normalize(mat3(modelMatrix)*normal); vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
/* planetas: 0 rochoso, 1 gasoso em faixas, 2 Terra, 3 gelo, 4 lava; luz do Sol com terminador */
const PLANET_F = `${N3} uniform float time,uType,uSeed; uniform vec3 uC1,uC2,uSunP; varying vec3 vN,vW,vO;
void main(){ vec3 N=normalize(vN), V=normalize(cameraPosition-vW), L=normalize(normalize(uSunP-vW)+V*.75), o=vO; /* luz de cinema: Sol + preenchimento do lado da câmera */ float dif=clamp(dot(N,L)*.75+.25,0.,1.), term=smoothstep(-.35,.2,dot(N,L)), ndv=clamp(dot(N,V),0.,1.); /* luz envolvente artística: o lado escuro ainda mostra as faixas */
 vec3 c; if(uType<.5){ float n=f3(o*4.+uSeed), cr=smoothstep(.62,.7,f3(o*9.+uSeed*2.)); c=mix(uC1,uC2,n)*(1.-.35*cr); }
 else if(uType<1.5){ float lat=o.y+.06*sin(o.x*6.+uSeed)+.04*f3(o*6.+vec3(time*.03,0.,0.)); float b=sin(lat*26.+f3(o*3.)*3.); c=mix(uC1,uC2,.5+.5*b); c=mix(c,vec3(.75,.35,.22),smoothstep(.06,.0,length(vec2(atan(o.z,o.x)-1.,o.y*2.+.4)))*.8); /* grande mancha */ }
 else if(uType<2.5){ float cn=f3(o*1.7+uSeed)*.7+f3(o*5.3+uSeed*2.)*.3; float land=smoothstep(.52,.545,cn); float coast=smoothstep(.49,.52,cn)*(1.-land); vec3 sea=mix(vec3(.01,.06,.26),vec3(.03,.2,.5),f3(o*7.)); sea=mix(sea,vec3(.1,.45,.65),coast*.6);
  vec3 gr=mix(vec3(.1,.26,.08),vec3(.5,.42,.24),smoothstep(.45,.7,f3(o*7.+2.))); gr=mix(gr,vec3(.75,.62,.4),smoothstep(.6,.8,f3(o*3.+9.))*.6); c=mix(sea,gr,land);
  float ice=smoothstep(.8,.9,abs(o.y)+.05*f3(o*9.)); c=mix(c,vec3(.92),ice); vec3 wo=o*3.4+vec3(f3(o*2.+1.),f3(o*2.+5.),f3(o*2.+9.))*1.6+vec3(time*.02,0.,0.); float cl=smoothstep(.5,.68,f3(wo)*.75+f3(wo*3.1)*.35); c=mix(c,vec3(.96,.97,1.),cl*.9);
  vec3 night=vec3(1.,.75,.4)*smoothstep(.55,.6,f3(o*30.))*land*(1.-cl)*.6; c=c*(.06+1.1*dif)+night*(1.-term); c+=vec3(.25,.5,1.)*pow(1.-ndv,3.)*(.3+term); gl_FragColor=vec4(c,1.); return; }
 else if(uType<3.5){ float b=sin(o.y*12.+f3(o*3.)*2.); c=mix(uC1,uC2,.5+.5*b*.4); }
 else { float n=f3(o*5.+uSeed); c=mix(uC1,uC2,smoothstep(.4,.7,n)); }
 c=c*(.07+1.1*dif*term); c+=uC2*pow(1.-ndv,3.)*.35*(.25+term); gl_FragColor=vec4(c,1.); }`;
const RINGP_V = `varying vec2 vP; varying vec3 vW; void main(){ vP=position.xy; vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
const RINGP_F = `${NOISE} uniform float uIn,uOut; varying vec2 vP; varying vec3 vW; void main(){ float r=length(vP), k=(r-uIn)/(uOut-uIn); if(k<0.||k>1.) discard; float b=n2(vec2(k*60.,1.))*.6+n2(vec2(k*190.,3.))*.4; float gap=smoothstep(.02,.0,abs(k-.62));
 float a=(.25+.65*b)*(1.-gap)*smoothstep(0.,.06,k)*smoothstep(1.,.92,k); vec3 c=mix(vec3(.72,.62,.45),vec3(.95,.88,.72),b); gl_FragColor=vec4(c*.9,a*.85); }`;
const GLOWB_V = `uniform vec3 uC; uniform float uS; varying vec2 vU; void main(){ vU=uv*2.-1.; vec3 V=normalize(cameraPosition-uC); vec3 X=normalize(cross(vec3(0.,1.,0.),V)), Y=cross(V,X); vec3 p=uC+(X*position.x+Y*position.y)*uS; gl_Position=projectionMatrix*viewMatrix*vec4(p,1.); }`;
const CORONA_F = `${NOISE} uniform float uA,time; uniform vec3 uCol; varying vec2 vU; void main(){ float r=length(vU), a=atan(vU.y,vU.x); float rays=pow(max(0.,sin(a*14.+n2(vec2(a*3.,time*.2))*4.)),6.)*smoothstep(1.,.25,r)*.5;
 float g=exp(-r*r*7.)*1.2+exp(-r*3.2)*.45+rays*.35; float al=uA*g*smoothstep(1.,.8,r); if(al<.004) discard; gl_FragColor=vec4(uCol*al,1.); }`;
/* ---------- Lua: crateras em relevo (mesma função na CPU para apoiar o monstro) ---------- */
export function craterH(x, z) { let h = 0; const C = [[18, -10, 9, 1.4], [-30, 8, 14, 2.2], [40, 30, 11, 1.6], [-8, 42, 7, 1.], [60, -40, 18, 2.6], [-55, -35, 10, 1.5], [10, -70, 22, 3.], [-90, 30, 16, 2.4], [95, 10, 9, 1.2], [30, 90, 20, 2.8]];
  for (const [cx, cz, r, d] of C) { const q = Math.hypot(x - cx, z - cz) / r; h += q < 1 ? -d * (1 - q * q) : q < 1.4 ? d * .45 * Math.sin((q - 1) / .4 * Math.PI) : 0; }
  h += 1.6 * Math.sin(x * .021 + 1.3) * Math.cos(z * .017) + .55 * Math.sin(x * .09 + z * .05) + .25 * Math.sin(x * .31 - z * .23) * Math.cos(z * .27); return h; }
const MOON_V = `${N3} varying vec3 vW,vN; varying float vH;
float ch(vec2 p){ float h=0.; vec4 C[10]; C[0]=vec4(18.,-10.,9.,1.4);C[1]=vec4(-30.,8.,14.,2.2);C[2]=vec4(40.,30.,11.,1.6);C[3]=vec4(-8.,42.,7.,1.);C[4]=vec4(60.,-40.,18.,2.6);C[5]=vec4(-55.,-35.,10.,1.5);C[6]=vec4(10.,-70.,22.,3.);C[7]=vec4(-90.,30.,16.,2.4);C[8]=vec4(95.,10.,9.,1.2);C[9]=vec4(30.,90.,20.,2.8);
 for(int i=0;i<10;i++){ float q=length(p-C[i].xy)/C[i].z; h+=q<1.?-C[i].w*(1.-q*q):(q<1.4?C[i].w*.45*sin((q-1.)/.4*3.14159):0.); }
 h+=1.6*sin(p.x*.021+1.3)*cos(p.y*.017)+.55*sin(p.x*.09+p.y*.05)+.25*sin(p.x*.31-p.y*.23)*cos(p.y*.27);
 for(int k=0;k<3;k++){ vec2 g=p*(.035+float(k)*.05)+float(k)*7.; vec2 id=floor(g); vec2 f=fract(g)-.5-(vec2(hs(vec3(id,1.)),hs(vec3(id,2.)))-.5)*.5; float rr=.18+.2*hs(vec3(id,3.)); float q=length(f)/rr; h+=(q<1.?-(1.-q*q):(q<1.35?.35*sin((q-1.)/.35*3.14159):0.))*(1.4-float(k)*.4); }
 return h+(f3(vec3(p*.15,0.))-.5)*1.2; }
void main(){ vec3 p=position; vec4 w0=modelMatrix*vec4(p,1.); float h=ch(w0.xz); float e=.6; float hx=ch(w0.xz+vec2(e,0.))-h, hz=ch(w0.xz+vec2(0.,e))-h; vN=normalize(vec3(-hx/e,1.,-hz/e)); w0.y+=h; vW=w0.xyz; vH=h; gl_Position=projectionMatrix*viewMatrix*w0; }`;
const MOON_F = `${N3} uniform vec3 uSunD,uEarthGlow,uPink; uniform vec3 uMon; varying vec3 vW,vN; varying float vH;
void main(){ vec3 N=normalize(vN); float dif=clamp(dot(N,normalize(uSunD)),0.,1.); float g=f3(vW*.12), g2=f3(vW*1.3); float albedo=.4+.22*g+.08*g2;
 vec3 c=vec3(albedo)*(.05+1.15*pow(dif,1.2)); c+=vec3(.12,.18,.35)*.06*(N.y); float far=smoothstep(60.,320.,length(vW-cameraPosition)); c=mix(c,c*.6,far);
 float dm=length(vW.xz-uMon.xz); c+=uPink*exp(-dm*dm/260.)*.55; /* luz roxa do Devorador lambendo o chão */ gl_FragColor=vec4(c,1.); }`;
/* ---------- buraco negro ---------- */
const CORE_F = `${NOISE} uniform float time,uA; uniform vec3 uC; varying vec3 vN,vW,vO; void main(){ vec3 V=normalize(cameraPosition-vW); float ndv=clamp(dot(normalize(vN),V),0.,1.), rim=pow(1.-ndv,10.); vec3 c=vec3(0.)+vec3(1.,.45,.25)*rim*1.6+vec3(.7,.3,1.)*pow(1.-ndv,18.)*2.5; /* núcleo negro que recorta: só um fio de luz na borda */ gl_FragColor=vec4(c,1.); }`;
const DISK_V = `varying vec2 vP; varying vec3 vW; void main(){ vP=position.xy; vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
const DISK_F = `${NOISE} uniform float time,uA,uSpin,uLayer,uHot; varying vec2 vP; varying vec3 vW;
void main(){ float r=length(vP), a=atan(vP.y,vP.x); if(r<1.||r>3.4) discard; float k=(r-1.)/2.4; float sw=a*2.+log(r)*6.5-time*uSpin*(1.6/r)+uLayer*2.1;
 float s=fbm(vec2(sw*1.3,r*3.-time*.5+uLayer)); float st=smoothstep(.35,.85,s)*(.6+.4*sin(sw*5.+s*4.));
 float a2=uA*(1.-smoothstep(.55,1.,k))*smoothstep(.0,.06,k)*(.35+.9*st); if(a2<.01) discard;
 vec3 hot=vec3(1.,.82,.55), mid=vec3(1.,.38,.12), cool=vec3(.55,.12,.55), deep=vec3(.25,.04,.35); vec3 c=mix(hot,mid,smoothstep(.0,.3,k)); c=mix(c,cool,smoothstep(.3,.7,k)); c=mix(c,deep,smoothstep(.7,1.,k));
 c*=.8+.5*st; c*=1.+uHot; float dop=.65+.55*sin(a+1.2); /* lado que se aproxima mais brilhante */ gl_FragColor=vec4(c*a2*dop,1.); }`;
const LENS_F = `${NOISE} uniform float uA,time; varying vec2 vU; void main(){ float r=length(vU), a=atan(vU.y,vU.x); float ring=exp(-pow((r-.33)/.025,2.))*1.2+exp(-pow((r-.36)/.08,2.))*.35; float arc=exp(-pow((r-.5)/.05,2.))*smoothstep(.2,.9,sin(a*1.+time*.3))*.35;
 float halo=exp(-r*r*5.)*.25*(1.-smoothstep(.0,.32,.32-r)); float al=uA*(ring+arc+halo)*(.8+.2*n2(vec2(a*6.,time))); if(al<.004) discard; vec3 c=mix(vec3(1.,.55,.3),vec3(.65,.35,1.),smoothstep(.3,.55,r)); gl_FragColor=vec4(c*al,1.); }`;
const PT_V = `attribute vec4 aC; varying vec4 vC; void main(){ vC=aC; vec4 mv=viewMatrix*vec4(position,1.); gl_PointSize=clamp(260./-mv.z,1.,7.); gl_Position=projectionMatrix*mv; }`;
const PT_F = `varying vec4 vC; void main(){ vec2 p=gl_PointCoord*2.-1.; float d=dot(p,p); if(d>1.||vC.a<.01) discard; gl_FragColor=vec4(vC.rgb*vC.a*(1.-d),1.); }`;
const TRAIL_V = `attribute vec2 aT; varying vec2 vT; void main(){ vT=aT; gl_Position=projectionMatrix*viewMatrix*vec4(position,1.); }`;
const TRAIL_F = `${NOISE} uniform float time,uA; varying vec2 vT; void main(){ float x=abs(vT.x*2.-1.), v=vT.y; float n=fbm(vec2(v*8.-time*6.,vT.x*3.)); float e=x+.3*(n-.5); if(e>1.) discard;
 float a=uA*pow(1.-v,1.4)*smoothstep(1.,.3,e); vec3 c=mix(vec3(.6,.1,.5),vec3(1.,.3,.2),smoothstep(.6,.0,e)); c=mix(c,vec3(.2,.05,.4),smoothstep(.5,1.,v)); gl_FragColor=vec4(c*a,1.); }`;
/* ---------- explosão sobre a Terra ---------- */
const DOME_V = `${N3} attribute float aSeed; attribute float aHeat; uniform float time; varying float vSeed,vHeat; varying vec3 vN,vV,vP;
void main(){ vSeed=aSeed; vHeat=aHeat; vec3 p=position; float d=n3(p*2.2+aSeed*7.+vec3(0.,-time*.8,0.))*.55+n3(p*5.-aSeed*3.)*.25; p*=.78+d*.5; vP=p; vec4 w=modelMatrix*instanceMatrix*vec4(p,1.); vN=normalize(mat3(modelMatrix*instanceMatrix)*position); vV=cameraPosition-w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
const DOME_F = `${N3} uniform float time; varying float vSeed,vHeat; varying vec3 vN,vV,vP;
void main(){ vec3 N=normalize(vN),V=normalize(vV); float ndv=clamp(dot(N,V),0.,1.); if(vHeat<.02) discard; float n=n3(vP*3.+vSeed*4.)*.6+n3(vP*7.-time)*.4; float fib=smoothstep(.06,0.,abs(n3(vP*4.5+vSeed)-.5));
 float h=vHeat*(.5+.6*pow(ndv,.8))+(n-.5)*.3; vec3 c=mix(vec3(.55,.05,.02),vec3(1.,.32,.04),smoothstep(.15,.45,h)); c=mix(c,vec3(1.,.72,.15),smoothstep(.4,.72,h)); c=mix(c,vec3(1.,.97,.8),smoothstep(.72,1.05,h)); c=mix(c,vec3(.45,.06,.02),fib*.45);
 c=mix(c*.6,c,smoothstep(0.,.45,ndv)); c+=vec3(1.,.3,.1)*pow(1.-ndv,2.5)*.6; /* casca vermelha nas bordas */ gl_FragColor=vec4(c*(.75+.5*vHeat),1.); }`;
const SHELL_F = `${NOISE} uniform float uTheta,uA,uW,time; uniform vec3 uImp; varying vec3 vN,vW,vO; void main(){ vec3 o=normalize(vO); float ang=acos(clamp(dot(o,normalize(uImp)),-1.,1.)); float d=(ang-uTheta)/uW;
 float band=exp(-d*d)*(.8+.4*fbm(vec2(atan(o.z,o.x)*8.,time))); float inner=smoothstep(uTheta,uTheta*.3,ang)*.35; float a=uA*(band+inner*.6); if(a<.004) discard; vec3 c=mix(vec3(1.,.95,.88),vec3(1.,.55,.2),smoothstep(.0,1.5,abs(d))); c=mix(c,vec3(1.,.4,.1),inner); gl_FragColor=vec4(c*a,1.); }`;

function strip(T, N) { const g = new T.BufferGeometry(), P = new Float32Array(N * 2 * 3), A = new Float32Array(N * 2 * 2), I = []; for (let j = 0; j < N; j++) { A.set([0, j / (N - 1), 1, j / (N - 1)], j * 4); if (j < N - 1) { const a = j * 2; I.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } }
  g.setAttribute('position', new T.BufferAttribute(P, 3).setUsage(T.DynamicDrawUsage)); g.setAttribute('aT', new T.BufferAttribute(A, 2)); g.setIndex(I); return g; }

/** opts { monsterGLTF (resultado do GLTFLoader de DevoradorLunar.glb), low } */
export function createLunarCosmos(T, opts = {}) {
  const low = !!opts.low, scene = new T.Scene(), camera = new T.PerspectiveCamera(55, 16 / 9, .1, 6000), geos = [], mats = [], uTime = { value: 0 };
  // Apenas o rosto materializado recebe luz: materiais de planetas/GLB permanecem shaders próprios.
  scene.add(new T.AmbientLight(0x7854aa,2.0));
  const faceLight=new T.DirectionalLight(0xffdbed,2.6);faceLight.position.set(18,34,24);scene.add(faceLight);
  scene.background = new T.Color(0x000002);
  const mat = o => { const m = new T.ShaderMaterial({ toneMapped: false, fog: false, ...o, uniforms: { time: uTime, ...(o.uniforms || {}) } }); mats.push(m); return m; };
  const g = x => (geos.push(x), x);
  const SS = new T.Vector3(0, 0, -4000); /* sistema solar (longe da Lua) */
  const SUN = new T.Vector3(-260, 40, -560).add(SS);
  /* céu */
  const skyU = { uSun: { value: new T.Vector3() }, uTint: { value: new T.Vector3(1, 0, 0) } }, sky = new T.Mesh(g(new T.SphereGeometry(2500, 48, 24)), mat({ vertexShader: SKY_V, fragmentShader: SKY_F, side: T.BackSide, depthWrite: false, uniforms: skyU })); sky.renderOrder = -10; scene.add(sky);
  const starLayers = [[low ? 2500 : 5000, 2300, 1], [low ? 900 : 1800, 1400, 1.4], [low ? 300 : 600, 700, 2]].map(([n, r, s], li) => { const P = new Float32Array(n * 3), S = new Float32Array(n); for (let i = 0; i < n; i++) { const u = R3(i * 3 + li * 7.1) * 2 - 1, a = R3(i * 7 + li) * 6.283, q = Math.sqrt(1 - u * u); P.set([Math.cos(a) * q * r, u * r, Math.sin(a) * q * r], i * 3); S[i] = Math.pow(R3(i * 11 + li), 3) * s + .3; }
    const gg = g(new T.BufferGeometry()); gg.setAttribute('position', new T.BufferAttribute(P, 3)); gg.setAttribute('aS', new T.BufferAttribute(S, 1)); const p = new T.Points(gg, mat({ vertexShader: STAR_V, fragmentShader: STAR_F, transparent: true, depthWrite: false, blending: T.AdditiveBlending })); p.renderOrder = -9; p.frustumCulled = false; scene.add(p); return { p, par: [1, .985, .94][li] }; });
  /* Sol */
  const sun = new T.Mesh(g(new T.SphereGeometry(70, 48, 32)), mat({ vertexShader: BODY_V, fragmentShader: SUN_F })); sun.position.copy(SUN); scene.add(sun);
  const quad = g(new T.PlaneGeometry(2, 2)); const corU = { uC: { value: SUN.clone() }, uS: { value: 260 }, uA: { value: 1 }, uCol: { value: new T.Color(1, .62, .22) } };
  const corona = new T.Mesh(quad, mat({ vertexShader: GLOWB_V, fragmentShader: CORONA_F, transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: corU })); corona.frustumCulled = false; scene.add(corona);
  /* planetas (artísticos, não em escala): posições num arco em volta do Sol */
  const PL = [[0, 9, [.55, .5, .45], [.35, .3, .28], -150, 10], [4, 14, [.95, .55, .15], [1, .8, .4], -60, 30], [2, 16, [0, 0, 0], [0, 0, 0], 40, -20], [0, 12, [.7, .3, .15], [.45, .18, .1], 120, 50],
    [1, 42, [.85, .7, .52], [.6, .38, .25], 230, -60], [1, 34, [.92, .82, .6], [.78, .66, .45], 360, 40], [3, 24, [.55, .82, .85], [.65, .9, .92], 470, -30], [3, 22, [.25, .4, .9], [.4, .55, 1], 560, 60]];
  const sphereG = g(new T.SphereGeometry(1, low ? 32 : 56, low ? 20 : 36)); const planets = PL.map(([type, r, c1, c2, x, z], i) => { const u = { uType: { value: type }, uSeed: { value: i * 3.7 }, uC1: { value: new T.Vector3(...c1) }, uC2: { value: new T.Vector3(...c2) }, uSunP: { value: SUN.clone() } };
    const m = new T.Mesh(sphereG, mat({ vertexShader: BODY_V, fragmentShader: PLANET_F, uniforms: u })); m.scale.setScalar(r); m.position.set(SUN.x + 120 + x * 1.1, SUN.y - 30 + Math.sin(i * 1.7) * 40 - i * 6, SUN.z + 260 + z * 2 + i * 55); m.rotation.z = .25 * (R3(i) - .5); scene.add(m); return m; });
  const saturn = planets[5]; const ringU = { uIn: { value: 1.25 }, uOut: { value: 2.3 } }, ring = new T.Mesh(g(new T.RingGeometry(1.25, 2.3, 128, 1)), mat({ vertexShader: RINGP_V, fragmentShader: RINGP_F, transparent: true, depthWrite: false, side: T.DoubleSide, uniforms: ringU })); ring.rotation.x = -Math.PI / 2 + .45; ring.rotation.y = .3; saturn.add(ring);
  const orbitLines = []; for (let k = 0; k < 4; k++) { const pts = []; for (let i = 0; i <= 128; i++) { const a = i / 128 * 6.2832; pts.push(new T.Vector3(Math.cos(a) * (250 + k * 140), Math.sin(a) * 18, Math.sin(a) * (180 + k * 110) * .9)); } const l = new T.Line(g(new T.BufferGeometry().setFromPoints(pts)), new T.LineBasicMaterial({ color: 0x9aa0b8, transparent: true, opacity: .14, depthWrite: false })); mats.push(l.material); l.position.copy(SUN); l.position.z += 260; l.rotation.z = .18; scene.add(l); orbitLines.push(l); }
  /* Lua + Terra no céu */
  const moonU = { uSunD: { value: new T.Vector3(.5, .45, .35).normalize() }, uEarthGlow: { value: new T.Vector3() }, uPink: { value: new T.Vector3(.5, .22, .9) }, uMon: { value: new T.Vector3() } };
  const moon = new T.Mesh(g(new T.PlaneGeometry(700, 700, low ? 160 : 260, low ? 160 : 260).rotateX(-Math.PI / 2)), mat({ vertexShader: MOON_V, fragmentShader: MOON_F, uniforms: moonU })); moon.frustumCulled = false; scene.add(moon);
  const EARTH = new T.Vector3(-150, 95, -260), earthR = 42;
  const earthU = { uType: { value: 2 }, uSeed: { value: 1.3 }, uC1: { value: new T.Vector3() }, uC2: { value: new T.Vector3() }, uSunP: { value: new T.Vector3(400, 260, 300) } };
  const earth = new T.Mesh(sphereG, mat({ vertexShader: BODY_V, fragmentShader: PLANET_F, uniforms: earthU })); earth.scale.setScalar(earthR); earth.position.copy(EARTH); scene.add(earth);
  const atmU = { uC: { value: EARTH.clone() }, uS: { value: earthR * 1.18 }, uA: { value: .75 }, uCol: { value: new T.Color(.25, .5, 1) } };
  const ATM_F = `uniform float uA; uniform vec3 uCol; varying vec2 vU; void main(){ float r=length(vU); float a=uA*exp(-pow((r-.86)/.07,2.)); if(a<.004) discard; gl_FragColor=vec4(uCol*a,1.); }`;
  const atm = new T.Mesh(quad, mat({ vertexShader: GLOWB_V, fragmentShader: ATM_F, transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: atmU })); atm.frustumCulled = false; scene.add(atm);
  /* o Devorador */
  const monster = new T.Group(); scene.add(monster); let monsterRoot = null, mixer = null, clips = {}, jawBone = null, headBone = null, monMat = null, acts = {}, facial = null;
  const dirE = new T.Vector3().subVectors(EARTH, new T.Vector3(0, 0, 0)).setY(0).normalize(); monster.rotation.y = Math.atan2(dirE.x, dirE.z); monster.position.set(0, craterH(0, 0) - .15, 0); monster.scale.setScalar(3.65);
  if (opts.monsterGLTF) { monsterRoot = opts.monsterGLTF.scene; monMat = monsterMaterial(T); mats.push(monMat); monsterRoot.traverse(o => { if (o.isSkinnedMesh) { o.material = monMat; o.frustumCulled = false; } if (o.isBone && o.name === 'jaw') jawBone = o; if (o.isBone && o.name === 'head') headBone = o; });
    monster.add(monsterRoot); facial=enhanceLunarMonster(T,monsterRoot,{low}); mixer = new T.AnimationMixer(monsterRoot); for (const c of opts.monsterGLTF.animations) { clips[c.name] = c; acts[c.name] = mixer.clipAction(c); } }
  moonU.uMon.value.copy(monster.position);
   // Névoa violeta colossal, atrás dos chifres e em volta dos ombros, sem tela inteira chapada.
   const hauntU={uC:{value:new T.Vector3(0,13,0)},uS:{value:62},uA:{value:.38},uCol:{value:new T.Color(.43,.10,.85)}};
   const haunt=new T.Mesh(quad,mat({vertexShader:GLOWB_V,fragmentShader:CORONA_F,transparent:true,depthWrite:false,blending:T.AdditiveBlending,uniforms:hauntU}));
   haunt.frustumCulled=false;haunt.renderOrder=0;scene.add(haunt);
  const shadow = new T.Mesh(g(new T.CircleGeometry(1, 40).rotateX(-Math.PI / 2)), new T.MeshBasicMaterial({ color: 0, transparent: true, opacity: .55, depthWrite: false })); mats.push(shadow.material); shadow.scale.set(13, 1, 17); shadow.position.set(0, craterH(0, 0) + .25, 0); shadow.rotation.y = monster.rotation.y; scene.add(shadow);
  /* poeira lilás em volta do monstro e partículas gerais */
  const PN = low ? 700 : 1500, pP = new Float32Array(PN * 3), pC = new Float32Array(PN * 4), pV = new Float32Array(PN * 3), pL = new Float32Array(PN * 2), ptG = g(new T.BufferGeometry());
  ptG.setAttribute('position', new T.BufferAttribute(pP, 3).setUsage(T.DynamicDrawUsage)); ptG.setAttribute('aC', new T.BufferAttribute(pC, 4).setUsage(T.DynamicDrawUsage)); const pts = new T.Points(ptG, mat({ vertexShader: PT_V, fragmentShader: PT_F, transparent: true, depthWrite: false, blending: T.AdditiveBlending })); pts.frustumCulled = false; scene.add(pts); let pI = 0;
  const emit = (x, y, z, vx, vy, vz, r, gg, b, life) => { const i = pI++ % PN; pP.set([x, y, z], i * 3); pV.set([vx, vy, vz], i * 3); pC.set([r, gg, b, 1], i * 4); pL[i * 2] = life; pL[i * 2 + 1] = life; };
  /* buraco negro */
  const bh = new T.Group(); scene.add(bh); bh.visible = false;
  const core = new T.Mesh(g(new T.SphereGeometry(1, 48, 32)), mat({ vertexShader: BODY_V, fragmentShader: CORE_F, uniforms: { uA: { value: 1 }, uC: { value: new T.Vector3() } } })); bh.add(core);
  const diskG = g(new T.RingGeometry(1, 3.4, low?72:128, 5)); const disks = [0, 1, 2].map(k => { const u = { uA: { value: 1 }, uSpin: { value: 2 + k * .9 }, uLayer: { value: k }, uHot: { value: 0 } }; const d = new T.Mesh(diskG, mat({ vertexShader: DISK_V, fragmentShader: DISK_F, transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending, uniforms: u })); d.rotation.x = .12 + k * .08; d.rotation.z = k * .08; d.scale.setScalar(1 + k * .12); bh.add(d); return { d, u }; });
  const lensU = { uC: { value: new T.Vector3() }, uS: { value: 1 }, uA: { value: 1 } }; const lens = new T.Mesh(quad, mat({ vertexShader: GLOWB_V, fragmentShader: LENS_F, transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: lensU })); lens.frustumCulled = false; scene.add(lens);
  const TN = 40, trailG = strip(T, TN); geos.push(trailG); const trailU = { uA: { value: 0 } }, trail = new T.Mesh(trailG, mat({ vertexShader: TRAIL_V, fragmentShader: TRAIL_F, transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending, uniforms: trailU })); trail.frustumCulled = false; scene.add(trail); const trailPts = [];
  /* explosão sobre a Terra: lóbulos instanciados num domo apoiado na superfície + casca com anel de choque */
  const DL = low ? 90 : 170, ico = g(new T.IcosahedronGeometry(1, low ? 1 : 2)), dSeed = new Float32Array(DL), dHeat = new Float32Array(DL); for (let i = 0; i < DL; i++) dSeed[i] = R3(i * 1.9);
  ico.setAttribute('aSeed', new T.InstancedBufferAttribute(dSeed, 1)); ico.setAttribute('aHeat', new T.InstancedBufferAttribute(dHeat, 1).setUsage(T.DynamicDrawUsage));
  const dome = new T.InstancedMesh(ico, mat({ vertexShader: DOME_V, fragmentShader: DOME_F }), DL); dome.instanceMatrix.setUsage(T.DynamicDrawUsage); dome.frustumCulled = false; dome.visible = false; scene.add(dome);
  const domeLay = Array.from({ length: DL }, (_, i) => { const yy = 1 - (i + .5) / DL * .92, r = Math.sqrt(1 - yy * yy); return { a: i * 2.39996, el: yy, r, s: .16 + .1 * R3(i + 3) }; });
  const PF = low ? 40 : 70, puffG = g(new T.IcosahedronGeometry(1, 1)); const puffHeat = new Float32Array(PF), puffSeed = new Float32Array(PF); for (let i = 0; i < PF; i++) puffSeed[i] = R3(i * 4.1); puffG.setAttribute('aSeed', new T.InstancedBufferAttribute(puffSeed, 1)); puffG.setAttribute('aHeat', new T.InstancedBufferAttribute(puffHeat, 1).setUsage(T.DynamicDrawUsage));
  const PUFF_F = `${N3} varying float vSeed,vHeat; varying vec3 vN,vV,vP; void main(){ vec3 N=normalize(vN),V=normalize(vV); float ndv=clamp(dot(N,V),0.,1.); if(vHeat<.02) discard; float n=n3(vP*3.+vSeed*5.); vec3 c=mix(vec3(1.,.55,.35),vec3(1.,.97,.93),smoothstep(.1,.8,ndv)*(.7+.3*n)); gl_FragColor=vec4(c*(.6+.5*vHeat),1.); }`;
  const puffs = new T.InstancedMesh(puffG, mat({ vertexShader: DOME_V, fragmentShader: PUFF_F }), PF); puffs.instanceMatrix.setUsage(T.DynamicDrawUsage); puffs.frustumCulled = false; puffs.visible = false; scene.add(puffs); /* anel branco de choque "fofo" que abraça a base do domo */
  const shellU = { uTheta: { value: 0 }, uA: { value: 0 }, uW: { value: .03 }, uImp: { value: new T.Vector3(0, 0, 1) } }, shell = new T.Mesh(sphereG, mat({ vertexShader: BODY_V, fragmentShader: SHELL_F, transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: shellU })); shell.visible = false; scene.add(shell);
  const CAP_F = `${N3} uniform float uA,uK,time; varying vec3 vN,vW,vO; void main(){ vec3 V=normalize(cameraPosition-vW), N=normalize(vN); float ndv=clamp(dot(N,V),0.,1.); float y=vO.y; if(y<-.02) discard;
   float n=f3(vO*3.+vec3(0.,-time*.6,0.)), n2=f3(vO*8.+time*.3); float h=pow(ndv,.7)*(.75+.35*n)*(1.-.25*uK);
   vec3 c=mix(vec3(.75,.08,.03),vec3(1.,.42,.05),smoothstep(.15,.5,h)); c=mix(c,vec3(1.,.8,.25),smoothstep(.45,.75,h)); c=mix(c,vec3(1.,.98,.86),smoothstep(.75,1.,h)); c+=vec3(1.,.25,.08)*pow(1.-ndv,2.)*.8;
   c=mix(c,c*.7,smoothstep(.06,0.,abs(n2-.5))*.6); /* fibras escuras */ float a=uA*(.55+.45*pow(ndv,.5))*smoothstep(-.02,.08,y); gl_FragColor=vec4(c*a,1.); }`;
  const capU = { uA: { value: 0 }, uK: { value: 0 } }, cap = new T.Mesh(sphereG, mat({ vertexShader: BODY_V, fragmentShader: CAP_F, transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: capU })); cap.visible = false; cap.frustumCulled = false; scene.add(cap);
  const flashU = { uC: { value: new T.Vector3() }, uS: { value: 1 }, uA: { value: 0 }, uCol: { value: new T.Color(1, .9, .7) } }, flash = new T.Mesh(quad, mat({ vertexShader: GLOWB_V, fragmentShader: CORONA_F, transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: flashU })); flash.frustumCulled = false; flash.visible = false; scene.add(flash);
  const E1 = new T.Vector3(), E2 = new T.Vector3(), M4 = new T.Matrix4(), Q = new T.Quaternion(), V1 = new T.Vector3(), V2 = new T.Vector3(), V3 = new T.Vector3(), UP = new T.Vector3(0, 1, 0), mouth = new T.Vector3(), look = new T.Vector3();
  for (let i = 0; i < DL; i++) { M4.makeScale(0, 0, 0); dome.setMatrixAt(i, M4); } for (let i = 0; i < PF; i++) puffs.setMatrixAt(i, M4);
  let time = 0, lastClip = '', bhPos = new T.Vector3(), launchFrom = new T.Vector3(), impactN = new T.Vector3(), impactP = new T.Vector3();
  const playClip = (name, fade = .35, once = false) => { if (!mixer || lastClip === name || !acts[name]) return; const a = acts[name]; a.reset(); a.setLoop(once ? T.LoopOnce : T.LoopRepeat, Infinity); a.clampWhenFinished = once; if (lastClip && acts[lastClip]) a.crossFadeFrom(acts[lastClip], fade, false); a.play(); lastClip = name; };
  const camAt = (px, py, pz, lx, ly, lz, fov) => { camera.position.set(px, py, pz); look.set(lx, ly, lz); camera.lookAt(look); if (Math.abs(camera.fov - fov) > .01) { camera.fov = fov; camera.updateProjectionMatrix(); } };
  const M = (x, y, z) => monster.localToWorld(V3.set(x, y, z)).clone();
  function mouthWorld() { if (jawBone) { jawBone.updateWorldMatrix(true, false); jawBone.getWorldPosition(mouth); const hd = M(0, 1.6, 4.65); mouth.lerp(hd, .72); } else mouth.copy(M(0, 1.7, 4.6)); return mouth; }
  const api = {
    scene, camera, get ready() { return !!monsterRoot; }, playClip,
    /** t = tempo da ultimate; T = tabela de tempos; aspect da tela */
    update(t, T2, dt, aspect) {
      time += dt; uTime.value = time; if (Math.abs(camera.aspect - aspect) > 1e-3) { camera.aspect = aspect; camera.updateProjectionMatrix(); } const portrait = aspect < 1, pf = portrait ? 1.35 : 1;
      if (mixer) mixer.update(dt); if (monMat) monMat.uniforms.time.value = time;
       if (facial) facial.update(time,t>=T2.mouth?Math.min(1,(t-T2.mouth)/3):0);
       haunt.visible=t>=T2.moon&&t<T2.launch;hauntU.uA.value=haunt.visible?.33+.10*Math.sin(time*1.8):0;
       if (haunt.visible) {hauntU.uC.value.copy(M(0,4.7,0));hauntU.uS.value=62+5*Math.sin(time*1.3);}
      moon.visible = monster.visible = shadow.visible = t >= T2.moon && t < T2.impact; bh.visible = false; lens.visible = false; trail.visible = false; dome.visible = puffs.visible = shell.visible = flash.visible = cap.visible = false; skyU.uTint.value.x = 1;
      // ---- Plano 2: o cosmos (Sol e planetas) ----
      if (t < T2.moon) { const k = clamp01((t - T2.cosmos) / (T2.moon - T2.cosmos)), e = sm(k);
        /* travelling: passa rente a Saturno e Júpiter, com o Sol ao fundo (parallax entre planetas) */ const sat = planets[5].position, jup = planets[4].position;
        const sideOf = (pl, d, h) => { const toS = V3.subVectors(SUN, pl).normalize(), perp = new T.Vector3().crossVectors(toS, UP).normalize(); return new T.Vector3().copy(pl).addScaledVector(perp, d).addScaledVector(toS, d * .35).addScaledVector(UP, h); }; /* de lado: planetas meio iluminados, Sol no quadro */
        const p0 = sideOf(sat, 170, 40), p1 = sideOf(jup, 150, 30); camera.position.lerpVectors(p0, p1, e); camera.position.y += Math.sin(k * 3) * 10;
        look.lerpVectors(V3.copy(sat).lerp(SUN, .45), new T.Vector3().copy(jup).lerp(SUN, .5), e); camera.lookAt(look); camera.fov = 62 * pf - 6 * e; camera.updateProjectionMatrix();
        for (const p of planets) p.rotation.y += dt * .15; sun.rotation.y += dt * .03; corU.uA.value = 1;
        if (R3(time * 13) > .3) emit(camera.position.x + (R3(time) - .5) * 300, camera.position.y + (R3(time * 2) - .5) * 160, camera.position.z - 200 - R3(time * 3) * 300, 0, 0, 120, .8, .6, .9, 2.5); /* poeira cósmica passando (parallax) */
        // caminho de energia rubro-violeta rumo à Lua
        trail.visible = true; trailU.uA.value = sm((k - .35) / .4) * .8; const a = V1.set(SUN.x + 200, SUN.y + 30, SUN.z + 360), b = V2.set(SUN.x + 900, SUN.y + 120, SUN.z + 1500); setTrail(a, b, 30 * (.5 + k), time * 1.5); }
      // ---- Planos 3–5: Lua, Devorador, boca e lançamento ----
      else if (t < T2.impact) {
        const tm = t - T2.moon;
        if (t < T2.mouth) { /* revelação: câmera rasante que sobe da cratera e circula até o 3/4 frontal */ const k = clamp01(tm / (T2.mouth - T2.moon)), e = sm(k); playClip('lunar_idle');
          const fwd = monster.rotation.y;
          if (k < .45) { /* rasante atrás da crista, olhando para a Terra: a silhueta se ergue contra o céu */ const kk = sm(k / .45); const ang = Math.PI - .55 + .25 * kk, rad = lerp(45, 29, kk) * pf; camera.position.set(Math.sin(fwd + ang) * rad, 2.2 + craterH(Math.sin(fwd + ang) * rad, Math.cos(fwd + ang) * rad) + 1.5 * kk, Math.cos(fwd + ang) * rad); look.copy(M(0, 5, 2)).lerp(EARTH, .18); }
          else { const kk = sm((k - .45) / .55), ang = lerp(-1.6, -.6, kk), rad = lerp(38, 26, kk) * pf; camera.position.set(Math.sin(fwd + ang) * rad, lerp(4, 9, kk) + craterH(0, 0), Math.cos(fwd + ang) * rad); look.copy(M(0, 4.5, 1.5)).lerp(EARTH, .12 * (1 - kk)); }
          camera.lookAt(look); camera.fov = lerp(46, 40, e) * (portrait ? 1.3 : 1); camera.updateProjectionMatrix(); if (monMat) monMat.uniforms.uReveal.value = lerp(-2, 40, sm(k / .55)); }
        else if (t < T2.launch) { /* boca abre; núcleo negro nasce e cresce */ const k = clamp01((t - T2.mouth) / (T2.launch - T2.mouth)); if (monMat) monMat.uniforms.uReveal.value = 99; playClip('jaw_charge', .4, true); if (monMat) monMat.uniforms.uGlow.value = .6 * k;
          const fwd = monster.rotation.y, ang = lerp(-.35, -.9, sm(k)), rad = lerp(23, 27, sm(k)) * pf; const m = mouthWorld(); camera.position.set(m.x + Math.sin(fwd + ang) * rad, m.y + lerp(3, 6, k), m.z + Math.cos(fwd + ang) * rad); look.copy(m).lerp(M(0, 7, 2), .3).lerp(EARTH, .06 * k); camera.lookAt(look); /* a câmera sai da frente para o 3/4: boca, chifres e a Terra ao fundo */ camera.fov = (46 - 4 * k) * (portrait ? 1.3 : 1); camera.updateProjectionMatrix();
          const s = .18 + 2.55 * Math.pow(k, 1.5); /* cresce até ~uma cabeça do Devorador, sem tapar chifres */ placeBH(V1.copy(m).add(V2.set(Math.sin(fwd), 0, Math.cos(fwd)).multiplyScalar(1.5 + s * .9)), s, k); bhPos.copy(bh.position);
          for (let q = 0; q < (low ? 3 : 6); q++) { const a = R3(time * 17 + q) * 6.283, r = 18 + R3(time * 5 + q) * 30, y = R3(time * 9 + q) * 10; emit(bh.position.x + Math.cos(a) * r, bh.position.y + y - 3, bh.position.z + Math.sin(a) * r, 0, 0, 0, .75, .4, 1, -1); } }
        else { /* lançamento e travessia Lua → Terra */ const k = clamp01((t - T2.launch) / (T2.impact - T2.launch)); if (monMat) monMat.uniforms.uGlow.value = .6 * (1 - k); playClip(k < .25 ? 'launch' : 'recoil', .12, true);
          if (k < .02) launchFrom.copy(bhPos); const e = Math.pow(k, 1.35), target = V2.copy(EARTH).add(V3.subVectors(launchFrom, EARTH).normalize().multiplyScalar(earthR * .98)); bh.position.lerpVectors(launchFrom, target, e); placeBH(bh.position, 2.73 + 4.2 * k, 1);
          trailPts.unshift(bh.position.clone()); if (trailPts.length > TN) trailPts.pop(); trail.visible = true; trailU.uA.value = 1; setTrailPts(trailPts, 2.8);
          const dir = V1.subVectors(EARTH, launchFrom).normalize(), side = V3.crossVectors(dir, UP).normalize();
          if (k < .45) { const kk = k / .45; camera.position.copy(bh.position).addScaledVector(side, lerp(24, 16, kk) * pf).addScaledVector(dir, -lerp(10, 30, kk)).addScaledVector(UP, 6); look.copy(bh.position).addScaledVector(dir, 25); camera.fov = 58 * (portrait ? 1.25 : 1); }
          else { const kk = (k - .45) / .55; camera.position.copy(bh.position).addScaledVector(dir, -lerp(22, 14, kk) * pf).addScaledVector(side, 6).addScaledVector(UP, 4); look.copy(EARTH); camera.fov = lerp(60, 52, kk) * (portrait ? 1.25 : 1); }
          camera.lookAt(look); camera.updateProjectionMatrix();
          for (let q = 0; q < (low ? 4 : 9); q++) { const a = R3(time * 23 + q) * 6.283, r = 6 + R3(time * 7 + q) * 16; emit(bh.position.x + Math.cos(a) * r + dir.x * 30, bh.position.y + Math.sin(a) * r, bh.position.z + dir.z * 30 + Math.sin(a * 2) * r, -dir.x * 160, -dir.y * 160, -dir.z * 160, .9, .5, 1, .35); } /* linhas de velocidade puxadas */ }
        earth.rotation.y += dt * .02;
      }
      // ---- Plano 6: impacto e explosão na Terra ----
      else { moon.visible = monster.visible = shadow.visible = false; const ta = t - T2.impact, kk = clamp01(ta / (T2.ret - T2.impact)); impactN.subVectors(launchFrom.lengthSq() ? launchFrom : V1.set(0, 0, 0), EARTH).normalize(); impactP.copy(EARTH).addScaledVector(impactN, earthR);
        const side = V3.crossVectors(impactN, UP).normalize(); const Dn = earthR * (.06 + .52 * sm(Math.max(0, ta - T2.silence) / 2.2)); camera.position.copy(impactP).addScaledVector(impactN, (Dn * .95 + 7) * pf).addScaledVector(side, -(Dn * 2.15 + 12) * pf); look.copy(impactP).addScaledVector(impactN, Dn * .35); camera.up.copy(impactN).addScaledVector(side, -.45).normalize(); camera.lookAt(look); camera.up.set(0, 1, 0); /* rasante e inclinado: a Terra vira horizonte curvo */ camera.fov = 52 * (portrait ? 1.3 : 1); camera.updateProjectionMatrix();
        const sil = T2.silence; if (ta < sil) { placeBH(V1.copy(impactP).addScaledVector(impactN, 2), 5 * (1 - sm(ta / sil)), 1); }
        else { const age = ta - sil; explosion(age); } }
      // estrelas e céu seguem a câmera (camadas com parallax)
      sky.position.copy(camera.position); skyU.uSun.value.subVectors(SUN, camera.position).normalize(); for (const L of starLayers) { L.p.position.copy(camera.position).multiplyScalar(L.par); }
      corU.uC.value.copy(SUN); atmU.uC.value.copy(EARTH);
      for (let i = 0; i < PN; i++) { if (pL[i * 2] === 0) continue; if (pL[i * 2] < 0) { /* sugada para o buraco negro em espiral */ const dx = bh.position.x - pP[i * 3], dy = bh.position.y - pP[i * 3 + 1], dz = bh.position.z - pP[i * 3 + 2], d = Math.hypot(dx, dy, dz) || 1; if (!bh.visible || d < 1.2) { pL[i * 2] = 0; pC[i * 4 + 3] = 0; continue; }
          const sp = 12 + 260 / (d + 2); pP[i * 3] += (dx / d * sp - dz / d * sp * .9) * dt; pP[i * 3 + 1] += dy / d * sp * dt; pP[i * 3 + 2] += (dz / d * sp + dx / d * sp * .9) * dt; pC[i * 4 + 3] = Math.min(1, 30 / d); continue; }
        pL[i * 2] -= dt; if (pL[i * 2] <= 0) { pL[i * 2] = 0; pC[i * 4 + 3] = 0; continue; } const k = pL[i * 2] / pL[i * 2 + 1]; for (let q = 0; q < 3; q++) pP[i * 3 + q] += pV[i * 3 + q] * dt; pC[i * 4 + 3] = k; }
      ptG.attributes.position.needsUpdate = true; ptG.attributes.aC.needsUpdate = true;
    },
    dispose() { facial?.dispose(); for (const x of geos) x.dispose(); for (const m of mats) m.dispose(); }
  };
  function placeBH(p, s, grow) { bh.visible = true; bh.position.copy(p); core.scale.setScalar(s * (1 + .03 * Math.sin(time * 9))); for (const D of disks) { const rad=s*(1+D.u.uLayer.value*.13);D.d.scale.set(rad,rad*(.35+.09*D.u.uLayer.value),rad);D.d.rotation.z=time*(D.u.uLayer.value%2?-.3:.35); D.u.uA.value = sm(grow * 3); D.u.uHot.value = .3 * grow; }
    lens.visible = true; lensU.uC.value.copy(p); lensU.uS.value = s * 3.1; lensU.uA.value = sm(grow * 2.5); bh.lookAt(camera.position); bh.rotateX(-.28); }
  function setTrail(a, b, w, ph) { const arr = []; for (let j = 0; j < TN; j++) { const k = j / (TN - 1); arr.push(new T.Vector3().lerpVectors(b, a, k).add(V3.set(Math.sin(k * 9 + ph) * 25, Math.cos(k * 7 + ph) * 18, 0))); } setTrailPts(arr, w); }
  function setTrailPts(arr, w) { const P = trailG.attributes.position.array, n = arr.length; for (let j = 0; j < TN; j++) { const a = arr[Math.min(n - 1, j)], b = arr[Math.min(n - 1, j + 1)] || a; V1.subVectors(a, b); if (V1.lengthSq() < 1e-8) V1.set(1, 0, 0); V2.subVectors(camera.position, a); const X = V3.crossVectors(V1, V2).normalize(), ww = w * (1 - j / TN) * (j >= n ? 0 : 1);
      P.set([a.x + X.x * ww, a.y + X.y * ww, a.z + X.z * ww, a.x - X.x * ww, a.y - X.y * ww, a.z - X.z * ww], j * 6); } trailG.attributes.position.needsUpdate = true; }
  function explosion(age) { const R = earthR, g1 = sm(age / .5), g2 = sm(age / 2.2), fade = 1 - sm((age - 2.6) / 1.2), Dr = R * (.06 + .52 * g2); /* raio do domo sobre a esfera */
    dome.visible = true; const nrm = impactN, t1 = E1.crossVectors(nrm, UP).normalize(), t2 = E2.crossVectors(nrm, t1).normalize();
    for (let i = 0; i < DL; i++) { const b = domeLay[i], rr = Dr * b.r * 1.25, hgt = Dr * .42 * b.el * (.35 + .65 * g1); const p = V3.copy(impactP).addScaledVector(t1, Math.cos(b.a) * rr).addScaledVector(t2, Math.sin(b.a) * rr); /* apoia na curvatura */ p.sub(EARTH).setLength(R + hgt + Dr * .05).add(EARTH);
      M4.compose(p, Q.identity(), V1.setScalar(Dr * b.s * .78 * (.55 + .4 * g1) * (1 - .3 * sm((age - 2.5) / 1.4)))); dome.setMatrixAt(i, M4); dHeat[i] = fade * (1.15 - .55 * b.r - .35 * g2 + .25 * b.el); }
    dome.instanceMatrix.needsUpdate = true; ico.attributes.aHeat.needsUpdate = true;
    puffs.visible = true; const th = (Dr * 1.32) / R; for (let i = 0; i < PF; i++) { const a = i / PF * 6.2832 + .2 * R3(i), q = new T.Vector3().copy(nrm).applyAxisAngle(V1.crossVectors(nrm, UP).normalize(), th).applyAxisAngle(nrm, a); const p = V3.copy(EARTH).addScaledVector(q, R + Dr * .06);
      M4.compose(p, Q.identity(), V2.setScalar(Dr * (.07 + .05 * R3(i + 9)) * g1)); puffs.setMatrixAt(i, M4); puffHeat[i] = fade * (.8 + .3 * R3(i)); } puffs.instanceMatrix.needsUpdate = true; puffG.attributes.aHeat.needsUpdate = true;
    cap.visible = true; cap.position.copy(impactP); cap.quaternion.setFromUnitVectors(UP, nrm); cap.scale.set(Dr * 1.28, Dr * .72 * (.4 + .6 * g1), Dr * 1.28); capU.uA.value = fade * 1.05; capU.uK.value = g2;
    shell.visible = true; shell.position.copy(EARTH); shell.scale.setScalar(R * 1.004); shellU.uImp.value.copy(nrm); shellU.uTheta.value = (Dr * 1.5 + R * .5 * sm(age / 3.2)) / R; shellU.uA.value = (1 - sm((age - 1.8) / 1.6)) * 1.1; shellU.uW.value = .035 + .05 * sm(age / 3);
    flash.visible = age < 1.4; flashU.uC.value.copy(impactP).addScaledVector(nrm, Dr * .4); flashU.uS.value = Dr * (1.2 + 2.2 * sm(age / .35)); flashU.uA.value = (age < .2 ? 1.5 : 1.35 * (1 - sm((age - .2) / 1.25)));
    if (age < .05) for (let q = 0; q < (low ? 80 : 180); q++) { const a = R3(q * 1.3) * 6.283, el = R3(q * 2.7); const dir = V1.copy(nrm).multiplyScalar(.4 + el).addScaledVector(t1, Math.cos(a)).addScaledVector(t2, Math.sin(a)).normalize(); emit(impactP.x, impactP.y, impactP.z, dir.x * 30, dir.y * 30, dir.z * 30, 1, .6 + .3 * R3(q), .25, 2 + R3(q)); } }
  return api;
}
