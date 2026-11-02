/**
 * MOD 262 — ULTIMATE de VORGAZHEK (Bispo 2): O JUÍZO DA ESPADA CÓSMICA.
 *
 * Quatro fases num ÚNICO relógio de tempo real (as durações e a saída do congelamento não dependem do timeScale):
 *  1. boss_aura 3,3 s — câmera baixa 3/4 de frente para o bispo, com dolly-in; duas criaturas colossais de energia
 *     rubro-negra (juba de traços negros, olhos brancos incandescentes, sorriso de dentes negros, garras) crescem atrás
 *     dele, mais as fitas que sobem do corpo. Microtremor de pressão só no fim.
 *  2. circle_build 4,4 s — corte limpo para trás do herói, que olha para cima; três círculos mágicos HORIZONTAIS em
 *     pilha (raios 15 / 7,5 / 3,75 m = 1 : 0,5 : 0,25, a 15 / 23 / 30 m do chão) se DESENHAM: traços, glifos, polígonos
 *     e estrelas aparecem aos poucos, girando em sentidos alternados. No fim a ponta da espada desponta no C1.
 *  3. sword_emerge_and_fall 4,0 s — a MESMA espada cósmica da mão, ampliada 7×, ponta para baixo, atravessa o C1 por
 *     recorte real (o que está acima do plano não existe) e desce até o PONTO FIXO no chão, acelerando. O controle volta
 *     ao jogador aos 1,3 s, com o anel de perigo no chão: dá para sair correndo ou com dash.
 *  4. impact_and_return 3,2 s — contato: congelamento de 0,11 s (relógio real), câmera com tranco direcional, tremor
 *     por trauma com ruído suave e decaimento, FOV punch, núcleo branco-amarelo, 3 anéis de fogo, domo, feixe, crateras,
 *     blocos de rocha, raios e onda de choque. Depois o branco se expande do núcleo e devolve a arena limpa.
 */
export const COSMIC_ULT_BUILD = '262-cosmic-judgment';
export const COSMIC_ULT = {
  phases: [['boss_aura', 3.3], ['circle_build', 4.4], ['sword_emerge_and_fall', 4.0], ['impact_and_return', 3.2]],
  circles: [{ r: 15, h: 15, spin: .14, from: .2, to: 3.2 }, { r: 7.5, h: 23, spin: -.24, from: .9, to: 3.8 }, { r: 3.75, h: 30, spin: .38, from: 1.5, to: 4.2 }],
  swordScale: 7, swordTip: 1.43, swordTotal: 1.95, embed: 1.4, impactR: 6.5, dmg: 40, release: 1.3, freeze: .11, slowMo: .45,
  whiteAt: 2.25, whiteIn: .22, whiteHold: .1, whiteOut: .6, edge: 6
};
const clamp01 = x => Math.max(0, Math.min(1, x)), sm = x => { x = clamp01(x); return x * x * (3 - 2 * x); };
/** Ruído 1D suave (valor com interpolação suave) — nunca jitter aleatório por quadro. */
export function smoothNoise(t, seed = 0) { const i = Math.floor(t), f = t - i, h = n => { const s = Math.sin((n + seed * 57.3) * 127.1) * 43758.5453; return (s - Math.floor(s)) * 2 - 1; }, u = f * f * (3 - 2 * f); return h(i) * (1 - u) + h(i + 1) * u; }
/** Tremor por trauma: offset = A·τ²·ruído(t·freq) + tranco direcional amortecido; roll pequeno. */
export function shakeAt(trauma, t, kickT = 99, o = {}) {
  const A = o.amp ?? .42, R = o.roll ?? .045, f = o.freq ?? 13, k = trauma * trauma;
  const kick = kickT < 0 ? 0 : Math.exp(-kickT / .1) * Math.cos(kickT * 22) * (o.kick ?? .55);
  return { x: A * k * smoothNoise(t * f, 1), y: A * k * smoothNoise(t * f, 2) - kick * .55, z: A * k * smoothNoise(t * f, 3), back: kick, roll: R * k * smoothNoise(t * f * .8, 4) + kick * .03 };
}
/** Altura da ponta da espada gigante na fase 3 (k = 0..1): começa no C1 devagar e acelera até cravar no chão. */
export function swordTipY(k, c1y, groundY, embed = COSMIC_ULT.embed) { const e = .32 * k + .68 * k * k * k; return c1y - (c1y - groundY + embed) * e; }

export function createCosmicUlt(opts = {}) {
  const U = { ...COSMIC_ULT, ...(opts.U || {}) }, ground = opts.ground || (() => 0), dmg = opts.dmg || U.dmg;
  const st = { phase: 'idle', pi: -1, t: 0, pt: 0, rt: 0, P: null, circles: [], tipY: 0, freeze: 0, trauma: 0, kickT: 99, hits: 0, done: false, aborted: false, impactAt: -1, white: 0, flash: 0, fovAdd: 0, lock: false, telegraph: 0, impacted: false };
  const api = {
    U, st, get done() { return st.done; }, get lockPlayer() { return st.lock; },
    /** hero/boss {x,z}; arena {x,z,r}. O ponto de impacto fica fixo daqui em diante (no chão, dentro da arena). */
    start(hero, boss, arena) {
      let px = hero.x, pz = hero.z; if (arena) { const dx = px - arena.x, dz = pz - arena.z, d = Math.hypot(dx, dz), lim = arena.r - U.edge; if (d > lim) { px = arena.x + dx / d * lim; pz = arena.z + dz / d * lim; } }
      const gy = ground(px, pz); Object.assign(st, { phase: U.phases[0][0], pi: 0, t: 0, pt: 0, rt: 0, P: { x: px, y: gy, z: pz }, boss: { x: boss.x, z: boss.z }, circles: U.circles.map(c => ({ ...c, y: gy + c.h, k: 0 })), tipY: gy + U.circles[0].h, freeze: 0, trauma: 0, kickT: 99, hits: 0, done: false, aborted: false, impactAt: -1, white: 0, flash: 0, fovAdd: 0, lock: true, telegraph: 0, impacted: false });
      return api;
    },
    abort() { if (st.done || st.phase === 'idle') return; st.aborted = true; st.done = true; st.lock = false; st.white = 0; st.flash = 0; st.trauma = 0; st.fovAdd = 0; st.phase = 'aborted'; },
    /** rdt = tempo REAL do quadro. hero {x,y,z,iframes}. Eventos: phase, circle, release, impact{hit}, hit, ring, white, end. */
    step(rdt, hero) {
      const ev = []; if (st.done || st.phase === 'idle') return ev; st.rt += rdt;
      let dt = rdt; if (st.freeze > 0) { st.freeze -= rdt; dt = rdt * .06; } // congelamento de impacto: medido no relógio real, nunca prende
      st.t += dt; st.pt += dt; if (st.t === dt) ev.push({ type: 'phase', n: 1, name: st.phase });
      st.kickT += rdt; st.trauma = Math.max(0, st.trauma - rdt / 1.15);
      const [, dur] = U.phases[st.pi];
      if (st.pi === 0) { st.trauma = Math.max(st.trauma, .16 * sm((st.pt - 2.6) / .7)); }
      if (st.pi === 1) { for (const c of st.circles) { const k = clamp01((st.pt - c.from) / (c.to - c.from)); if (k >= 1 && c.k < 1) ev.push({ type: 'circle', r: c.r }); c.k = k; } }
      if (st.pi === 2) { const k = clamp01(st.pt / dur); st.tipY = swordTipY(k, st.circles[0].y, st.P.y); st.telegraph = sm(st.pt / .35); st.trauma = Math.max(st.trauma, .05 + .2 * k * k);
        if (st.lock && st.pt >= U.release) { st.lock = false; ev.push({ type: 'release' }); } }
      if (st.pi === 3) { const p = st.pt;
        st.fovAdd = p < .06 ? -7 * p / .06 : -7 * Math.max(0, 1 - (p - .06) / .7);
        st.flash = p < .12 ? 1 - p / .12 : 0;
        const w0 = U.whiteAt, w1 = w0 + U.whiteIn, w2 = w1 + U.whiteHold, w3 = w2 + U.whiteOut; st.white = p < w0 ? 0 : p < w1 ? sm((p - w0) / U.whiteIn) : p < w2 ? 1 : 1 - sm((p - w2) / U.whiteOut);
        if (p >= w1 && !st.whiteDone) { st.whiteDone = true; ev.push({ type: 'white' }); } // VFX some por trás do branco
        for (const [i, at] of [[1, .05], [2, .18], [3, .32]]) if (p >= at && !st['ring' + i]) { st['ring' + i] = true; st.trauma = Math.min(1, st.trauma + .18); ev.push({ type: 'ring', n: i }); } }
      if (st.pt >= dur) {
        if (st.pi === 2 && !st.impacted) { // contato: explosão SEMPRE no ponto fixo do chão; dano só dentro do raio legível
          st.impacted = true; st.tipY = st.P.y - U.embed; const d = Math.hypot(hero.x - st.P.x, hero.z - st.P.z), hit = !hero.iframes && d <= U.impactR + .35;
          st.freeze = U.freeze; st.trauma = 1; st.kickT = 0; st.impactAt = st.t; ev.push({ type: 'impact', x: st.P.x, y: st.P.y, z: st.P.z, hit, dist: d }); if (hit) { st.hits = 1; ev.push({ type: 'hit', dmg }); }
        }
        st.pi++; st.pt = 0;
        if (st.pi >= U.phases.length) { st.done = true; st.phase = 'done'; st.lock = false; st.white = 0; st.fovAdd = 0; st.trauma = 0; ev.push({ type: 'end', hits: st.hits }); }
        else { st.phase = U.phases[st.pi][0]; ev.push({ type: 'phase', n: st.pi + 1, name: st.phase }); }
      }
      return ev;
    },
    /** Plano de câmera (cinematografia) — {w, pos, look, fov}; w=0 devolve a câmera de jogo. ctx: {boss:{x,y,z,yaw}, hero:{x,y,z}, camYaw}. */
    camera(ctx) {
      const B = ctx.boss, H = ctx.hero, P = st.P, fx = Math.sin(B.yaw), fz = Math.cos(B.yaw), rx = -fz, rz = fx, out = { w: 0, pos: [0, 0, 0], look: [0, 0, 0], fov: 0 };
      if (st.done || st.pi < 0) return out; const p = st.pt;
      if (st.pi === 0) { const k = sm(p / 3.3), d = 7 - 2.2 * k; out.w = sm(p / .3); out.pos = [B.x + fx * d + rx * 2.4, B.y + .7 + .25 * k, B.z + fz * d + rz * 2.4]; out.look = [B.x + rx * .4, B.y + 2.1 + 1.6 * k, B.z + rz * .4]; out.fov = 14; }
      else if (st.pi === 1) { const hx = B.x - H.x, hz = B.z - H.z, hl = Math.hypot(hx, hz) || 1, ux = hx / hl, uz = hz / hl, lx = -uz, lz = ux, up = sm((p - .35) / 1.3);
        out.w = 1; out.pos = [H.x - ux * 4.4 + lx * 1.5, H.y + 1.05, H.z - uz * 4.4 + lz * 1.5];
        out.look = [H.x + (P.x - H.x) * up + ux * 2 * (1 - up), H.y + 1.6 + (st.circles[1].y - H.y - 1.6) * up * .78, H.z + (P.z - H.z) * up + uz * 2 * (1 - up)]; out.fov = 10 + 14 * up; }
      else if (st.pi === 2) { const hx = B.x - P.x, hz = B.z - P.z, hl = Math.hypot(hx, hz) || 1, sx = -hz / hl, sz = hx / hl; out.w = p < U.release ? 1 : 1 - sm((p - U.release) / .5);
        out.pos = [P.x + sx * 21 - hx / hl * 4, P.y + 2.6, P.z + sz * 21 - hz / hl * 4]; out.look = [P.x, Math.max(P.y + 6, st.tipY + 3), P.z]; out.fov = 14; }
      return out;
    }
  };
  return api;
}

/* ============================== VFX ============================== */
const NOISE = `float h1(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h1(i),h1(i+vec2(1,0)),f.x),mix(h1(i+vec2(0,1)),h1(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*n2(p);p*=2.03;a*=.5;}return s;}`;
/* Círculo mágico procedural (referência 4): contorno arco-íris, anéis com microglifos, heptágono, hexagrama, pentagrama,
   triângulos e escrita; tudo se DESENHA (reveal) por ângulo e por camada; núcleo branco-dourado. */
const CIRCLE_V = `varying vec2 vU; void main(){ vU=uv*2.-1.; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const CIRCLE_F = `${NOISE} uniform float time,reveal,charge,alpha,seed; varying vec2 vU;
vec3 hue(float h){ return clamp(abs(mod(h*6.+vec3(0.,4.,2.),6.)-3.)-1.,0.,1.); }
float seg(vec2 p,vec2 a,vec2 b){ vec2 pa=p-a,ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h); }
float poly(vec2 p,float n,float k,float R,float rot,float prog){ float d=1e3; for(int i=0;i<9;i++){ if(float(i)>=n) break; float a0=rot+6.2832*float(i)*k/n, a1=rot+6.2832*float(i+1)*k/n; float vis=step(float(i)/n,prog); if(vis<.5) continue; vec2 A=R*vec2(cos(a0),sin(a0)), B2=R*vec2(cos(a1),sin(a1)); float part=clamp(prog*n-float(i),0.,1.); d=min(d,seg(p,A,mix(A,B2,part))); } return d; }
float ring(float r,float R,float w){ return abs(r-R)-w; }
void main(){ vec2 p=vU; float r=length(p); if(r>1.02) discard; float a=atan(p.y,p.x), an=fract(a/6.2832+.5);
 float px=fwidth(r)*1.2+.0015, line=0.; vec3 col=vec3(0.); float rv=reveal;
 #define ADD(d,c,k) { float L=(1.-smoothstep(0.,px,d))*(k); line=max(line,L); col=max(col,(c)*L); }
 float sweep=step(an,clamp(rv*1.25,0.,1.)); // varredura angular
 // contorno arco-íris (vermelho→amarelo→verde→ciano→azul→roxo)
 ADD(ring(r,.985,.012), hue(an+seed)*1.4, sweep)
 ADD(ring(r,.935,.004), hue(an+seed+.1)*1.2, step(an,clamp(rv*1.25-.08,0.,1.)))
 // banda de microglifos entre .94 e .975
 float cells=96., ci=floor(an*cells), cf=fract(an*cells), gh=h1(vec2(ci,seed*9.)), gr=(r-.94)/.035;
 if(gr>0.&&gr<1.&&ci/cells<rv*1.2-.15){ float g=0.; if(gh<.33) g=step(abs(cf-.5),.08)*step(.15,gr)*step(gr,.85); else if(gh<.66) g=step(abs(gr-.5-(cf-.5)*.8),.1)*step(.2,cf)*step(cf,.8); else g=max(step(abs(cf-.5),.07),step(abs(gr-.5),.09))*step(.25,cf)*step(cf,.75); ADD(1.-g-.5, mix(vec3(1.,.95,.75),hue(an+seed+.3),.55)*1.3, g) }
 ADD(ring(r,.84,.0035), vec3(1.,.9,.6)*1.2, step(an,clamp(rv*1.4-.2,0.,1.)))
 // ticks e cruzes entre .84 e .9
 float tk=floor(an*48.), tf=fract(an*48.); if(r>.85&&r<.9&&tk/48.<rv*1.3-.25){ float cross=max(step(abs(tf-.5),.06)*step(abs(r-.875),.02),step(abs(r-.875),.004)*step(abs(tf-.5),.25)); ADD(.5-cross, hue(an*2.+seed+.5)*1.2, cross) }
 float pr=clamp((rv-.2)/.45,0.,1.), pr2=clamp((rv-.35)/.45,0.,1.), pr3=clamp((rv-.5)/.45,0.,1.);
 ADD(poly(p,7.,1.,.84,1.5708,pr)-.004, hue(.7+seed)*1.3, 1.)            // heptágono
 ADD(poly(p,7.,3.,.84,1.5708,pr2)-.003, hue(.1+seed)*1.2, 1.)           // estrela {7/3}
 ADD(ring(r,.55,.004), vec3(.9,.95,1.)*1.2, step(an,clamp(rv*1.6-.45,0.,1.)))
 ADD(poly(p,3.,1.,.55,1.5708,pr2)-.004, hue(.33+seed)*1.3, 1.)          // triângulo
 ADD(poly(p,3.,1.,.55,-1.5708,pr2)-.004, hue(.55+seed)*1.3, 1.)         // triângulo invertido (hexagrama)
 ADD(poly(p,5.,2.,.32,1.5708,pr3)-.004, vec3(1.,.85,.45)*1.5, 1.)       // pentagrama
 ADD(ring(r,.32,.003), hue(an+seed+.6)*1.2, step(an,clamp(rv*1.8-.7,0.,1.)))
 // inscrições na faixa .58–.8 (letras falsas)
 float wc=floor(an*40.), wf=fract(an*40.); float wr=(r-.62)/.14; if(wr>0.&&wr<1.&&wc/40.<rv*1.4-.4){ float hh=h1(vec2(wc,seed)); float s=step(abs(wf-.3-.4*hh),.05)+step(abs(wr-.5-.3*(hh-.5)),.06)*step(abs(wf-.5),.3); ADD(.5-min(1.,s), hue(an+.2+seed)*1.1, min(1.,s)*.85) }
 // núcleo branco-dourado firme
 float core=exp(-r*r*90.)*smoothstep(.55,1.,rv), halo=exp(-r*7.)*.25*smoothstep(.6,1.,rv);
 col+=vec3(1.,.93,.7)*(core*2.+halo*(1.+charge)); line=max(line,core+halo*.6);
 col*=1.+charge*.8+.15*sin(time*6.+r*20.)*charge; float al=clamp(line,0.,1.)*alpha; if(al<.01) discard; gl_FragColor=vec4(col*al,al); }`;
/* Fitas de energia (aura da fase 1) — uv=(ao longo, através), aK=(tipo, alfa, semente, brilho) */
const RIB_V = `attribute vec2 aUv; attribute vec4 aK; varying vec2 vU; varying vec4 vK; void main(){ vU=aUv; vK=aK; gl_Position=projectionMatrix*viewMatrix*vec4(position,1.); }`;
const RIB_F = `${NOISE} uniform float time; varying vec2 vU; varying vec4 vK;
void main(){ float e=abs(vU.y*2.-1.), s=vK.z, n=n2(vec2(vU.x*7.-time*3.+s*13.,vU.y*3.)), n3=n2(vec2(vU.x*19.-time*5.+s*7.,vU.y*6.));
 float edge=.6+.4*n-.2*n3; if(e>edge) discard; float core=exp(-e*e*22.);
 vec3 c=mix(vec3(.5,.02,.03),vec3(1.,.15,.08),1.-e/edge); c=mix(c,vec3(1.,.92,.85),core*(.5+.5*vK.w)); c=mix(vec3(.02,0.,0.),c,smoothstep(edge,edge-.25,e));
 if(vK.x>.5) c=mix(vec3(.02,0.,0.),vec3(.9,.1,.05),exp(-e*e*50.)*.9);
 float a=vK.y; if(a<.02) discard; gl_FragColor=vec4(c,a); }`;
/* Traço da juba da criatura (instanciado): preto com veia vermelha, recortado */
const STROKE_V = `attribute vec4 aS; varying vec4 vS; varying vec2 vU; void main(){ vS=aS; vU=uv; gl_Position=projectionMatrix*viewMatrix*modelMatrix*instanceMatrix*vec4(position,1.); }`;
const STROKE_F = `${NOISE} uniform float time; varying vec4 vS; varying vec2 vU;
void main(){ float d=abs(vU.x)+(n2(vec2(vU.y*8.+vS.w*7.,vU.x*2.+time*.5))-.5)*.35; if(d>.95||vU.y>vS.y) discard;
 vec3 c=vec3(.025,.004,.006); float vein=exp(-d*d*30.)*(1.-vU.y)*vS.z; c=mix(c,vec3(.95,.12,.06),vein); c=mix(c,vec3(1.,.85,.75),exp(-d*d*120.)*(1.-vU.y)*vS.z*.6);
 gl_FragColor=vec4(c,1.); }`;
const EYE_F = `uniform float time,show; varying vec2 vU; void main(){ vec2 p=vU*2.-1.; float tri=max(abs(p.x)*.9+p.y*.55,-p.y-.45); if(tri>.55) discard; float k=1.-smoothstep(.0,.55,tri);
 vec3 c=mix(vec3(.9,.05,.02),vec3(1.,.98,.95),smoothstep(.15,.6,k)); gl_FragColor=vec4(c*(1.+.3*sin(time*9.)),1.); if(show<.02) discard; }`;
const EYE_V = `varying vec2 vU; void main(){ vU=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const GLOW_V = `attribute vec4 aG; varying vec4 vG; varying vec2 vU; void main(){ vG=aG; vU=uv; vec4 c=viewMatrix*modelMatrix*instanceMatrix*vec4(0.,0.,0.,1.); vG.a*=smoothstep(1.,4.,-c.z); c.xy+=position.xy*length(instanceMatrix[0].xyz); gl_Position=projectionMatrix*c; }`;
const GLOW_F = `varying vec4 vG; varying vec2 vU; void main(){ vec2 p=vU*2.-1.; float d=length(p); float a=exp(-d*d*5.)*vG.a; vec3 c=mix(vG.rgb,vec3(1.,.98,.92),exp(-d*d*18.)); gl_FragColor=vec4(c*a,a); }`;
/* Explosão: núcleo/domo/anéis/feixe/cratera */
const FIRE_V = `varying vec3 vN; varying vec3 vW; varying vec2 vU; varying vec3 vP; void main(){ vU=uv; vP=position; vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }`;
const CORE_F = `${NOISE} uniform float time,k,heat; varying vec3 vN; varying vec3 vW; varying vec2 vU; varying vec3 vP;
void main(){ vec3 v=normalize(cameraPosition-vW); float f=abs(dot(normalize(vN),v)); float n=fbm(vec2(atan(vP.z,vP.x)*3.+time*2.,vP.y*3.-time*4.));
 vec3 c=mix(vec3(1.,.42,.05),vec3(1.,.85,.35),smoothstep(.2,.7,f)); c=mix(c,vec3(1.,1.,.94),smoothstep(.55,.95,f)*heat); c=mix(c,vec3(.75,.12,.02),smoothstep(.55,.8,n)*(1.-f)*.8);
 if(n<k*.9-.1) discard; gl_FragColor=vec4(c*1.25,1.); }`;
const DOME_F = `${NOISE} uniform float time,k; varying vec3 vN; varying vec3 vW; varying vec2 vU; varying vec3 vP;
void main(){ float lat=clamp(vP.y,0.,1.), ang=atan(vP.z,vP.x); float streak=n2(vec2(ang*24.,lat*2.-time*3.)), n=fbm(vec2(ang*5.,lat*4.-time*1.5));
 float tear=n+lat*.35-k*.8; if(tear>.95||lat>.97-.3*streak) discard;
 vec3 c=mix(vec3(1.,.95,.6),vec3(1.,.55,.08),smoothstep(.1,.6,lat)); c=mix(c,vec3(.55,.1,.02),smoothstep(.5,.85,n)); c+=vec3(1.,.8,.4)*smoothstep(.75,.95,streak)*(1.-lat);
 float a=(1.-smoothstep(.7,.97,tear))*(1.-k*.6); gl_FragColor=vec4(c,a); }`;
const RINGF_F = `${NOISE} uniform float time,k; varying vec3 vN; varying vec3 vW; varying vec2 vU; varying vec3 vP;
void main(){ float r=vU.y, a=vU.x; float n=n2(vec2(a*60.,r*3.-time*6.)), n3=n2(vec2(a*150.,time*8.));
 float flame=.55+.45*n+.15*n3; if(r>flame) discard; vec3 c=mix(vec3(1.,1.,.85),vec3(1.,.75,.15),smoothstep(.05,.3,r)); c=mix(c,vec3(1.,.35,.03),smoothstep(.3,.7,r)); c=mix(c,vec3(.35,.05,.01),smoothstep(flame-.12,flame,r));
 float al=(1.-smoothstep(.75,1.,k)); if(al<.02) discard; gl_FragColor=vec4(c*1.3,al); }`;
const BEAM_F = `${NOISE} uniform float time,k; varying vec3 vN; varying vec3 vW; varying vec2 vU; varying vec3 vP;
void main(){ vec3 v=normalize(cameraPosition-vW); float f=abs(dot(normalize(vN),v)); float n=n2(vec2(vU.x*20.,vU.y*8.-time*12.));
 float a=pow(f,1.5)*(1.-vU.y*.7)*(.7+.3*n)*(1.-k); if(a<.02) discard; vec3 c=mix(vec3(1.,.7,.2),vec3(1.,1.,.95),pow(f,3.)); gl_FragColor=vec4(c*a,a); }`;
const CRATER_F = `${NOISE} uniform float time,k,cool; varying vec3 vN; varying vec3 vW; varying vec2 vU; varying vec3 vP;
void main(){ vec2 p=vU*2.-1.; float r=length(p), a=atan(p.y,p.x); if(r>1.) discard;
 float cr=0.; for(int i=0;i<3;i++){ float fi=float(i); float aa=a*(9.+fi*5.)+fbm(vec2(r*4.+fi,fi))*3.; cr=max(cr,1.-smoothstep(0.,.06+.03*fi,abs(sin(aa))*r)); }
 float ringc=1.-smoothstep(0.,.04,abs(r-.55-.05*n2(vec2(a*6.,0.)))); float glow=max(cr*(1.-r*.6),ringc*.8);
 vec3 c=vec3(.06,.03,.02)*(1.-r*.5); c=mix(c,mix(vec3(1.,.85,.4),vec3(.9,.2,.02),cool),glow*(1.-cool*.6));
 float al=(1.-smoothstep(.85,1.,r))*(1.-smoothstep(.8,1.,k)); if(al<.02) discard; gl_FragColor=vec4(c,al); }`;
const SPIKE_V = `attribute vec4 aT; varying vec4 vT; varying vec2 vU; void main(){ vT=aT; vU=uv; gl_Position=projectionMatrix*viewMatrix*modelMatrix*instanceMatrix*vec4(position,1.); }`;
const SPIKE_F = `${NOISE} varying vec4 vT; varying vec2 vU; void main(){ float d=abs(vU.x)+(n2(vec2(vU.y*9.+vT.w*7.,vU.x*2.))-.5)*.3; if(d>.95||vU.y>vT.y) discard; vec3 c=d<.35?mix(vec3(1.,1.,.9),vec3(1.,.6,.1),vU.y):vec3(1.,.4,.05)*(1.-vU.y*.5); gl_FragColor=vec4(c*vT.x,1.); }`;
const PLANE_RING_F = `uniform float k,R; varying vec3 vN; varying vec3 vW; varying vec2 vU; varying vec3 vP; void main(){ vec2 p=vU*2.-1.; float r=length(p); float w=.03+.02*(1.-k); float d=abs(r-.97)/w; if(d>1.) discard; float a=(1.-d)*(1.-k); gl_FragColor=vec4(vec3(1.,.95,.8)*a,a); }`;
const TELE_F = `uniform float time,k; varying vec3 vN; varying vec3 vW; varying vec2 vU; varying vec3 vP; void main(){ vec2 p=vU*2.-1.; float r=length(p); if(r>1.) discard;
 float edge=1.-smoothstep(0.,.035,abs(r-.965)), inner=step(r,.96)*(.12+.1*sin(time*8.)), tick=step(.7,fract(atan(p.y,p.x)*6.+time*.8))*step(.85,r)*step(r,.93)*.6, cross=(1.-smoothstep(0.,.02,abs(p.x)*step(r,.4)+.02))*0.;
 float a=(edge+inner+tick)*k; vec3 c=mix(vec3(1.,.15,.05),vec3(1.,.85,.3),edge); gl_FragColor=vec4(c*a,a); }`;

function spikeGeo(T) { const pos = [], uv = [], idx = [], N = 8; for (let j = 0; j <= N; j++) { const y = j / N, w = .5 * (1 - y) ** .8 * (j % 2 ? .6 : 1) + .01; pos.push(-w, y, 0, 0, y, 0, w, y, 0); uv.push(-1, y, 0, y, 1, y); if (j < N) { const a = j * 3, c = a + 3; idx.push(a, c, a + 1, a + 1, c, c + 1, a + 1, c + 1, a + 2, a + 2, c + 1, c + 2); } }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); return g; }
function annulusGeo(T, seg = 96) { const pos = [], uv = [], nor = [], idx = []; for (let i = 0; i <= seg; i++) { const a = i / seg * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); for (let j = 0; j < 2; j++) { const r = j ? 1 : .55; pos.push(c * r, 0, s * r); uv.push(i / seg, 1 - j); nor.push(0, 1, 0); } if (i < seg) { const a0 = i * 2; idx.push(a0, a0 + 2, a0 + 1, a0 + 1, a0 + 2, a0 + 3); } }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); g.setIndex(idx); return g; }

/** VFX da ultimate. makeSword() devolve a espada cósmica com recorte (buildCosmicSword(T,{clip:true})). */
export function createCosmicUltVFX(T, scene, { makeSword } = {}) {
  const root = new T.Group(); root.name = 'VorgazhekCosmicUlt'; root.visible = false; scene.add(root); const geos = [], mats = [], uTime = { value: 0 };
  const V = () => new T.Vector3(), M = new T.Matrix4(), Q = new T.Quaternion(), P = V(), S = V(), D = V(), E = V(), X = V(), Z = V(), UP = new T.Vector3(0, 1, 0), cam = V();
  const mat = o => { const m = new T.ShaderMaterial({ toneMapped: false, fog: false, ...o, uniforms: { time: uTime, ...(o.uniforms || {}) } }); mats.push(m); return m; };
  const mesh = (g, m, ro = 0) => { geos.push(g); const x = new T.Mesh(g, m); x.frustumCulled = false; x.renderOrder = ro; root.add(x); return x; };
  const inst = (geo, m, n, attrs, ro = 0) => { const arrs = {}; for (const [k, sz] of attrs) { arrs[k] = new Float32Array(n * sz); geo.setAttribute(k, new T.InstancedBufferAttribute(arrs[k], sz).setUsage(T.DynamicDrawUsage)); } geos.push(geo); const x = new T.InstancedMesh(geo, m, n); x.frustumCulled = false; x.count = 0; x.renderOrder = ro; root.add(x); return { mesh: x, arrs, n: 0, max: n, attrs }; };
  const put = (I, vals) => { if (I.n >= I.max) return; I.mesh.setMatrixAt(I.n, M); let o = 0; for (const [k, sz] of I.attrs) { for (let j = 0; j < sz; j++) I.arrs[k][I.n * sz + j] = vals[o + j]; o += sz; } I.n++; };
  /* fase 1: criaturas */
  const strokes = inst(spikeGeo(T), mat({ vertexShader: STROKE_V, fragmentShader: STROKE_F, side: T.DoubleSide }), 420, [['aS', 4]], 2);
  const teeth = inst(new T.ConeGeometry(.5, 1, 4), new T.MeshStandardMaterial({ color: 0x0a0204, emissive: 0x2a0204, roughness: .5, metalness: .3, flatShading: true }), 140, [], 2); mats.push(teeth.mesh.material);
  const eyeU = { show: { value: 0 } }, eyeG = new T.PlaneGeometry(1, 1); const eyes = []; for (let i = 0; i < 4; i++) { const e = mesh(eyeG.clone(), mat({ vertexShader: EYE_V, fragmentShader: EYE_F, side: T.DoubleSide, uniforms: eyeU }), 3); eyes.push(e); }
  const mouthM = mat({ vertexShader: EYE_V, fragmentShader: `uniform float show; varying vec2 vU; void main(){ vec2 p=vU*2.-1.; float d=length(vec2(p.x*.55,(p.y+.35+p.x*p.x*.55)*1.6)); if(d>1.) discard; vec3 c=mix(vec3(1.,.6,.4),vec3(.55,.02,.02),smoothstep(.0,.9,d)); gl_FragColor=vec4(c,1.); if(show<.02) discard; }`, side: T.DoubleSide, uniforms: eyeU });
  const mouths = [mesh(new T.PlaneGeometry(1, 1), mouthM, 1), mesh(new T.PlaneGeometry(1, 1), mouthM, 1)];
  /* fitas que sobem do corpo */
  const MAXQ = 500, rp = new Float32Array(MAXQ * 12), ru = new Float32Array(MAXQ * 8), rk = new Float32Array(MAXQ * 16), ri = new Uint32Array(MAXQ * 6); for (let i = 0; i < MAXQ; i++) ri.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 2, i * 4 + 1, i * 4 + 3], i * 6);
  const rg = new T.BufferGeometry(); rg.setAttribute('position', new T.BufferAttribute(rp, 3).setUsage(T.DynamicDrawUsage)); rg.setAttribute('aUv', new T.BufferAttribute(ru, 2).setUsage(T.DynamicDrawUsage)); rg.setAttribute('aK', new T.BufferAttribute(rk, 4).setUsage(T.DynamicDrawUsage)); rg.setIndex(new T.BufferAttribute(ri, 1));
  const ribbons = mesh(rg, mat({ vertexShader: RIB_V, fragmentShader: RIB_F, transparent: true, depthWrite: false, side: T.DoubleSide }), 4); let q = 0; const pts = []; for (let i = 0; i < 20; i++) pts.push(V()); const sa = V(), sb = V();
  function strip(n, kind, alpha, seed, glow, width) { for (let i = 1; i < n && q < MAXQ; i++) { const a = pts[i - 1], b = pts[i], u0 = (i - 1) / (n - 1), u1 = i / (n - 1); D.subVectors(b, a); E.subVectors(a, cam); sa.crossVectors(D, E); let l = sa.length(); if (l < 1e-6) sa.set(1, 0, 0); else sa.multiplyScalar(width(u0) / l); E.subVectors(b, cam); sb.crossVectors(D, E); l = sb.length(); if (l < 1e-6) sb.set(1, 0, 0); else sb.multiplyScalar(width(u1) / l);
      const o = q * 12; rp.set([a.x - sa.x, a.y - sa.y, a.z - sa.z, a.x + sa.x, a.y + sa.y, a.z + sa.z, b.x - sb.x, b.y - sb.y, b.z - sb.z, b.x + sb.x, b.y + sb.y, b.z + sb.z], o); ru.set([u0, 0, u0, 1, u1, 0, u1, 1], q * 8); for (let k = 0; k < 4; k++) rk.set([kind, alpha(k < 2 ? u0 : u1), seed, glow], q * 16 + k * 4); q++; } }
  /* fase 2: círculos */
  const circG = new T.PlaneGeometry(2, 2); circG.rotateX(-Math.PI / 2); const circles = [0, 1, 2].map(i => { const u = { reveal: { value: 0 }, charge: { value: 0 }, alpha: { value: 0 }, seed: { value: i * .17 } }; const m = mesh(circG.clone(), mat({ vertexShader: CIRCLE_V, fragmentShader: CIRCLE_F, transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending, uniforms: u, extensions: { derivatives: true } }), 5); m.userData.u = u; return m; });
  const boltPos = new Float32Array(16 * 6 * 3), boltG = new T.BufferGeometry(); boltG.setAttribute('position', new T.BufferAttribute(boltPos, 3).setUsage(T.DynamicDrawUsage)); const boltM = new T.LineBasicMaterial({ color: 0xfff2c8, transparent: true, opacity: .9, toneMapped: false, blending: T.AdditiveBlending, depthWrite: false }); mats.push(boltM); geos.push(boltG);
  const bolts = new T.LineSegments(boltG, boltM); bolts.frustumCulled = false; root.add(bolts); let boltT = 0;
  const pillarG = new T.CylinderGeometry(1, 1, 1, 24, 1, true); const pillars = [0, 1].map(() => mesh(pillarG.clone(), mat({ vertexShader: FIRE_V, fragmentShader: BEAM_F, transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending, uniforms: { k: { value: 0 } } }), 4));
  /* fase 3: espada gigante (o MESMO modelo da mão), telegráfico */
  let giant = null; function ensureGiant() { if (!giant && makeSword) { giant = makeSword(); giant.scale.setScalar(COSMIC_ULT.swordScale); giant.rotation.x = Math.PI; giant.visible = false; root.add(giant); } return giant; }
  const crossRing = mesh(new T.RingGeometry(.6, 1, 48), new T.MeshBasicMaterial({ color: 0xfff0c0, transparent: true, opacity: 0, side: T.DoubleSide, toneMapped: false, blending: T.AdditiveBlending, depthWrite: false }), 6); crossRing.geometry.rotateX(-Math.PI / 2); mats.push(crossRing.material);
  const teleU = { k: { value: 0 } }, tele = mesh(new T.PlaneGeometry(2, 2).rotateX(-Math.PI / 2), mat({ vertexShader: FIRE_V, fragmentShader: TELE_F, transparent: true, depthWrite: false, uniforms: teleU }), 3);
  /* fase 4: explosão */
  const coreU = { k: { value: 0 }, heat: { value: 1 } }, core = mesh(new T.SphereGeometry(1, 32, 20), mat({ vertexShader: FIRE_V, fragmentShader: CORE_F, uniforms: coreU }), 3);
  const domeU = { k: { value: 0 } }, dome = mesh(new T.SphereGeometry(1, 40, 14, 0, Math.PI * 2, 0, Math.PI / 2), mat({ vertexShader: FIRE_V, fragmentShader: DOME_F, transparent: true, depthWrite: false, side: T.DoubleSide, uniforms: domeU }), 4);
  const rings = [0, 1, 2].map(() => { const u = { k: { value: 0 } }; return mesh(annulusGeo(T), mat({ vertexShader: FIRE_V, fragmentShader: RINGF_F, transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending, uniforms: u }), 5); });
  const beamU = { k: { value: 0 } }, beam = mesh(pillarG.clone(), mat({ vertexShader: FIRE_V, fragmentShader: BEAM_F, transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending, uniforms: beamU }), 5);
  const craterU = { k: { value: 0 }, cool: { value: 0 } }, crater = mesh(new T.PlaneGeometry(2, 2).rotateX(-Math.PI / 2), mat({ vertexShader: FIRE_V, fragmentShader: CRATER_F, transparent: true, depthWrite: false, uniforms: craterU, polygonOffset: true, polygonOffsetFactor: -2 }), 2);
  const shockU = { k: { value: 0 }, R: { value: 1 } }, shock = mesh(new T.PlaneGeometry(2, 2).rotateX(-Math.PI / 2), mat({ vertexShader: FIRE_V, fragmentShader: PLANE_RING_F, transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: shockU }), 5);
  const rockG = new T.DodecahedronGeometry(1, 0); rockG.scale(1, .7, .85); const rockM = new T.MeshStandardMaterial({ color: 0x2a1a12, roughness: .9, emissive: 0x6a1a00, emissiveIntensity: .8, flatShading: true }); mats.push(rockM);
  const rocks = inst(rockG, rockM, 70, [], 1); const slabG = new T.BoxGeometry(1, .35, 1.4); const slabs = inst(slabG, rockM, 18, [], 1);
  const streaks = inst(spikeGeo(T), mat({ vertexShader: SPIKE_V, fragmentShader: SPIKE_F, side: T.DoubleSide }), 40, [['aT', 4]], 4);
  const glows = inst(new T.PlaneGeometry(1, 1), mat({ vertexShader: GLOW_V, fragmentShader: GLOW_F, transparent: true, depthWrite: false, blending: T.AdditiveBlending }), 12, [['aG', 4]], 7);
  let time = 0; const R3 = i => { const s = Math.sin(i * 12.9898 + 4.1) * 43758.5453; return s - Math.floor(s); };
  function creature(cx, cy, cz, fx, fz, side, g, low, seed) { // juba radial + olhos + sorriso + garras, crescendo por g (0..1)
    const rx = -fz, rz = fx, NS = low ? 90 : 150, sc = 5.5 + 2.2 * g;
    for (let i = 0; i < NS; i++) { const u = R3(i + seed), v = R3(i * 3.7 + seed), born = i / NS; if (born > g * 1.15) break;
      const th = u * Math.PI * 2, el = (v - .35) * 2.1, len = sc * (.55 + .7 * R3(i * 5.1 + seed)) * Math.min(1, (g * 1.15 - born) * 4);
      D.set(Math.cos(th) * Math.cos(el) * .9, Math.sin(el) * .6 - .25, 0).normalize(); const dx = D.x, dy = D.y; D.set(rx * dx * side + fx * -.25, dy, rz * dx * side + fz * -.25).normalize();
      P.set(cx + D.x * sc * .45, cy + D.y * sc * .45, cz + D.z * sc * .45); E.set(cam.x - P.x, cam.y - P.y, cam.z - P.z); X.crossVectors(D, E).normalize(); Z.crossVectors(X, D); M.makeBasis(X, D, Z); Q.setFromRotationMatrix(M);
      S.set(.35 + .4 * R3(i * 2.3), len, 1); M.compose(P, Q, S); put(strokes, [1, 1, .8 + .2 * Math.sin(time * 4 + i), seed + i * .1]); }
    // dentes (sorriso enorme) — fileiras superior e inferior ao longo de um arco largo
    const mY = cy - sc * .28, nT = low ? 18 : 30, open = .5 + .3 * g;
    for (const row of [1, -1]) for (let i = 0; i < nT; i++) { const t = i / (nT - 1) * 2 - 1, x = t * sc * .62, yy = mY + (t * t) * sc * .22 + row * sc * .1 * open, L = sc * (.16 + .1 * (1 - Math.abs(t))) * g;
      P.set(cx + rx * x * side + fx * .4, yy, cz + rz * x * side + fz * .4); Q.setFromAxisAngle(D.set(fx, 0, fz), row > 0 ? Math.PI : 0); S.set(sc * .028, L, sc * .028); M.compose(P, Q, S); if (g > .2) put(teeth, []); }
    return { mY, sc };
  }
  return {
    root,
    /** ctx: {camera, boss:{x,y,z,yaw}, low, swordTime} */
    update(ult, ctx, rdt) {
      const st = ult && ult.st; time += rdt; uTime.value = time; cam.copy(ctx.camera.position); const low = !!ctx.low; q = 0;
      for (const I of [strokes, teeth, rocks, slabs, streaks, glows]) I.n = 0;
      root.visible = !!(st && !st.done && st.P); if (!root.visible) { if (giant) giant.visible = false; return; }
      const B = ctx.boss, fx = Math.sin(B.yaw), fz = Math.cos(B.yaw), Pp = st.P, pi = st.pi, p = st.pt;
      // ---- fase 1 (e dissolve no começo da 2): criaturas + fitas + núcleo ----
      const g1 = pi === 0 ? sm(p / 3.1) : pi === 1 ? Math.max(0, 1 - p / .7) : 0; eyeU.show.value = g1;
      for (const [i, side] of [[0, -1], [1, 1]]) { const rx = -fz, rz = fx, cx = B.x - fx * (4.5 + i) + rx * side * 5.6, cy = B.y + 6.5 + i * 1.6, cz = B.z - fz * (4.5 + i) + rz * side * 5.6;
        if (g1 > .01) { const C = creature(cx, cy, cz, fx, fz, side, g1, low, i * 50 + 3);
          for (let e = 0; e < 2; e++) { const eo = eyes[i * 2 + e], es = e ? 1 : -1, ex = es * C.sc * .27; eo.visible = true; eo.position.set(cx + rx * ex * side + fx * .6, cy + C.sc * .12, cz + rz * ex * side + fz * .6); eo.lookAt(cam); eo.rotateZ(es * -.45); eo.scale.set(C.sc * .3 * g1, C.sc * .17 * g1, 1); }
          const mo = mouths[i]; mo.visible = true; mo.position.set(cx + fx * .3, C.mY, cz + fz * .3); mo.lookAt(cam); mo.scale.set(C.sc * 1.45 * g1, C.sc * .5 * g1, 1);
          P.set(cx + fx * .5, C.mY, cz + fz * .5); Q.identity(); S.setScalar(C.sc * 1.2 * g1); M.compose(P, Q, S); put(glows, [1, .2, .08, .55 * g1]); }
        else { eyes[i * 2].visible = eyes[i * 2 + 1].visible = false; mouths[i].visible = false; } }
      if (g1 > .01) { const NS = low ? 10 : 16; for (let i = 0; i < NS; i++) { const th0 = i / NS * 6.283 + R3(i) * 2, H = (3 + 9 * g1) * (.7 + .5 * R3(i * 3)); for (let j = 0; j < 12; j++) { const u = j / 11, th = th0 + time * (1 + R3(i * 7)) * (i % 2 ? 1 : -1) + u * 2.2, rr = (.6 + 3.2 * g1 * R3(i * 5)) * Math.sin(Math.PI * (.15 + .7 * u)) + .4; pts[j].set(B.x + Math.cos(th) * rr - fx * u * 2, B.y + u * H, B.z + Math.sin(th) * rr - fz * u * 2); }
          strip(12, i % 4 === 0 ? 1 : 0, u => g1 * (1 - u * u), i * .37, g1, u => (.15 + .45 * g1) * Math.pow(1 - u, .6) + .02); }
        P.set(B.x + fx * .3, B.y + 1.5, B.z + fz * .3); Q.identity(); S.setScalar(1 + 3.5 * g1); M.compose(P, Q, S); put(glows, [1, .25, .1, .9 * g1]); }
      // ---- círculos (fase 2 e 3; somem no impacto) ----
      const cAlpha = pi === 1 ? sm(p / .25) : pi === 2 ? 1 : pi === 3 ? Math.max(0, 1 - p / .35) : 0;
      st.circles.forEach((c, i) => { const m = circles[i], u = m.userData.u; m.visible = cAlpha > .01; m.position.set(Pp.x, c.y, Pp.z); m.scale.setScalar(c.r); m.rotation.y = time * c.spin; u.reveal.value = pi === 1 ? c.k : 1; u.alpha.value = cAlpha; u.charge.value = pi === 1 ? sm((p - 2.5) / 1.9) : pi === 2 ? 1 : 1; });
      // raios entre camadas e colunas de suporte
      boltT -= rdt; const boltOn = (pi === 1 && p > 2.3) || pi === 2; bolts.visible = boltOn;
      if (boltOn && boltT <= 0) { boltT = .07; let o = 0; for (let b = 0; b < 6; b++) { const ci = b % 2, a0 = R3(b + time * 13) * 6.283, c0 = st.circles[ci], c1 = st.circles[ci + 1]; let x0 = Pp.x + Math.cos(a0) * c0.r * .6, y0 = c0.y, z0 = Pp.z + Math.sin(a0) * c0.r * .6; const x1 = Pp.x + Math.cos(a0 + .4) * c1.r * .7, z1 = Pp.z + Math.sin(a0 + .4) * c1.r * .7;
          for (let k = 1; k <= 6 && o < boltPos.length; k++) { const t = k / 6, nx = x0 + (x1 - x0) / 6 + (k < 6 ? (R3(b * 9 + k + time) - .5) * 1.4 : 0), ny = y0 + (c1.y - c0.y) / 6, nz = z0 + (z1 - z0) / 6 + (k < 6 ? (R3(b * 7 + k * 3 + time) - .5) * 1.4 : 0); boltPos.set([x0, y0, z0, nx, ny, nz], o); o += 6; x0 = nx; y0 = ny; z0 = nz; void t; } }
        boltG.setDrawRange(0, o / 3); boltG.attributes.position.needsUpdate = true; }
      pillars.forEach((pl, i) => { const on = pi === 2 ? 1 : pi === 1 ? sm((p - 3.4) / 1) : 0; pl.visible = on > .01; const a = st.circles[i + 1], b = st.circles[i]; pl.position.set(Pp.x, (a.y + b.y) / 2, Pp.z); pl.scale.set(b.r * .14 * (1 - i * .3), a.y - b.y, b.r * .14 * (1 - i * .3)); pl.material.uniforms.k.value = 1 - on * .85; });
      // ---- espada gigante: atravessa o C1 com recorte real; anel de travessia; telegráfico ----
      const G = ensureGiant(); const c1y = st.circles[0].y;
      if (G) { const show = pi === 1 ? p > 3.7 : pi === 2 || (pi === 3 && p < (COSMIC_ULT.whiteAt + COSMIC_ULT.whiteIn)); G.visible = show; if (show) { const tip = pi === 1 ? c1y + .25 - .9 * sm((p - 3.7) / .7) : st.tipY; G.position.set(Pp.x, tip + COSMIC_ULT.swordTip * COSMIC_ULT.swordScale, Pp.z); G.rotation.y = time * .05; G.userData.clipY.value = c1y; G.userData.glow.value = 1.4 + (pi === 2 ? p * .4 : 0); G.userData.tick(time); } }
      const crossing = pi === 2 ? (st.tipY < c1y ? 1 : 0) * Math.max(0, 1 - Math.max(0, (p - 3.4)) / .6) : pi === 1 ? sm((p - 3.6) / .8) : 0; crossRing.visible = crossing > .01; crossRing.position.set(Pp.x, c1y - .05, Pp.z); crossRing.scale.setScalar(1.6 + .5 * Math.sin(time * 9)); crossRing.material.opacity = .85 * crossing;
      if (crossing > .01) { P.set(Pp.x, c1y, Pp.z); Q.identity(); S.setScalar(7 * crossing); M.compose(P, Q, S); put(glows, [1, .85, .5, .8 * crossing]); }
      if (pi === 2 && G) { // trilha cósmica acima da ponta e brilho da ponta
        P.set(Pp.x, st.tipY + 1.2, Pp.z); Q.identity(); S.setScalar(4.5); M.compose(P, Q, S); put(glows, [.7, .55, 1, .75]); }
      tele.visible = st.telegraph > .01 && pi === 2; tele.position.set(Pp.x, Pp.y + .06, Pp.z); tele.scale.setScalar(COSMIC_ULT.impactR); teleU.k.value = st.telegraph;
      // ---- fase 4: explosão (até o branco cobrir) ----
      const ex = pi === 3 && p < COSMIC_ULT.whiteAt + COSMIC_ULT.whiteIn + .05; for (const o of [core, dome, beam, crater, shock, ...rings]) o.visible = ex;
      if (ex) { const k = p / (COSMIC_ULT.whiteAt + COSMIC_ULT.whiteIn), e1 = 1 - Math.pow(1 - Math.min(1, p / .18), 3);
        core.position.set(Pp.x, Pp.y + .5, Pp.z); core.scale.setScalar(.6 + 5.4 * e1 + .6 * Math.sin(time * 14) * (1 - k)); coreU.k.value = Math.max(0, k - .55); coreU.heat.value = 1 - k * .35;
        const e2 = 1 - Math.pow(1 - Math.min(1, p / .55), 3); dome.position.set(Pp.x, Pp.y - .2, Pp.z); dome.scale.set(3 + 10 * e2, (3 + 8 * e2), 3 + 10 * e2); domeU.k.value = Math.max(0, (p - .5) / 2);
        rings.forEach((r, i) => { const at = [.05, .18, .32][i], h = [1, 4.8, 9][i], rr = [17, 13, 9][i], kk = Math.max(0, p - at) / 1.6, e = 1 - Math.pow(1 - Math.min(1, kk * 2.2), 3); r.visible = ex && p > at; r.position.set(Pp.x, Pp.y + h + e * 1.5, Pp.z); r.scale.setScalar(2 + rr * e); r.material.uniforms.k.value = Math.min(1, kk); });
        beam.position.set(Pp.x, Pp.y + 30, Pp.z); beam.scale.set(1.2 + 2 * e1, 60, 1.2 + 2 * e1); beamU.k.value = Math.min(1, p / 1.6);
        crater.position.set(Pp.x, Pp.y + .04, Pp.z); crater.scale.setScalar(12); craterU.k.value = 0; craterU.cool.value = Math.min(1, p / 2);
        shock.position.set(Pp.x, Pp.y + .1, Pp.z); const sk = Math.min(1, p / .9); shock.scale.setScalar(3 + 34 * (1 - Math.pow(1 - sk, 2))); shockU.k.value = sk;
        P.set(Pp.x, Pp.y + 2, Pp.z); Q.identity(); S.setScalar(26 * (1 - Math.min(1, p / .6)) + 6); M.compose(P, Q, S); put(glows, [1, .85, .45, 1 - Math.min(1, p / 1.2) * .7]);
        const NR = low ? 34 : 70; for (let i = 0; i < NR; i++) { const a = R3(i * 1.7) * 6.283, v = 7 + 14 * R3(i * 2.3), vy = 6 + 16 * R3(i * 3.1), t = Math.max(0, p - .03), y = Pp.y + .3 + vy * t - 9.8 * t * t; if (y < Pp.y - 1) continue; const sc = .25 + 1.1 * R3(i * 4.7) * R3(i * .3 + 1);
          P.set(Pp.x + Math.cos(a) * (1.5 + v * t), y, Pp.z + Math.sin(a) * (1.5 + v * t)); Q.setFromAxisAngle(D.set(Math.sin(i), .5, Math.cos(i)).normalize(), t * (3 + R3(i) * 6)); S.setScalar(sc); M.compose(P, Q, S); put(rocks, []); }
        const NSb = low ? 10 : 18; for (let i = 0; i < NSb; i++) { const a = i / NSb * 6.283 + R3(i) * .3, r = 7 + R3(i * 2) * 3, rise = Math.min(1, p / .25); P.set(Pp.x + Math.cos(a) * r, Pp.y + .2 * rise, Pp.z + Math.sin(a) * r); Q.setFromAxisAngle(D.set(-Math.sin(a), 0, Math.cos(a)), -.5 * rise - .3 * R3(i * 5)); S.set(1.4 + R3(i) * 1.2, 1 + R3(i * 3), 1.6 + R3(i * 7)); M.compose(P, Q, S); put(slabs, []); }
        if (p < .55) { const n = low ? 18 : 36; for (let i = 0; i < n; i++) { const a = i / n * 6.283 + R3(i * 9) * .2, el = .05 + .5 * R3(i * 4), len = (6 + 10 * R3(i * 6)) * Math.min(1, p / .12) * (1 - p / .55);
            D.set(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el)); E.set(cam.x - Pp.x, cam.y - Pp.y, cam.z - Pp.z); X.crossVectors(D, E).normalize(); Z.crossVectors(X, D); M.makeBasis(X, D, Z); Q.setFromRotationMatrix(M); P.set(Pp.x + D.x * 2, Pp.y + 1 + D.y * 2, Pp.z + D.z * 2); S.set(.5, len, 1); M.compose(P, Q, S); put(streaks, [1.3, 1, 0, i * .17]); } } }
      else rings.forEach(r => { r.visible = false; });
      rg.setDrawRange(0, q * 6); rg.attributes.position.needsUpdate = rg.attributes.aUv.needsUpdate = rg.attributes.aK.needsUpdate = true;
      for (const I of [strokes, teeth, rocks, slabs, streaks, glows]) { I.mesh.count = I.n; I.mesh.instanceMatrix.needsUpdate = true; for (const [k] of I.attrs) I.mesh.geometry.attributes[k].needsUpdate = true; }
    },
    clear() { root.visible = false; if (giant) giant.visible = false; bolts.visible = false; },
    dispose() { scene.remove(root); for (const g of geos) g.dispose(); for (const m of mats) m.dispose(); if (giant) giant.userData.dispose(); }
  };
}
