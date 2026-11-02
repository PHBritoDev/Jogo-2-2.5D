/**
 * MOD 262 — ULTIMATE de VORGAZHEK (Bispo 2): O JUÍZO DA ESPADA CÓSMICA.
 *
 * Quatro fases num ÚNICO relógio de tempo real (as durações e a saída do congelamento não dependem do timeScale):
 *  1. boss_aura 3,3 s — câmera baixa 3/4 de frente para o bispo, com dolly-in; atrás e acima dele cresce UMA presença
 *     gigante feita só de energia e luz (refino Mod 262): campo rubro com raias negras de pressão convergindo e, por
 *     espaço negativo, dois rasgos brancos inclinados no alto e uma fenda curva enorme embaixo — olhos e sorriso
 *     sugeridos, nunca modelados. Línguas vermelhas sobem do corpo. Microtremor de pressão só no fim.
 *  2. circle_build 4,4 s — corte limpo para trás do herói, que olha para cima; três círculos mágicos HORIZONTAIS em
 *     pilha (raios 15 / 7,5 / 3,75 m = 1 : 0,5 : 0,25, a 15 / 23 / 30 m do chão) se DESENHAM: traços, glifos, polígonos
 *     e estrelas aparecem aos poucos, girando em sentidos alternados. No fim a ponta da espada desponta no C1.
 *  3. sword_emerge_and_fall 4,0 s — a MESMA espada cósmica da mão, ampliada 7×, ponta para baixo, atravessa o C1 por
 *     recorte real (o que está acima do plano não existe) e desce até o PONTO FIXO no chão, acelerando. O controle volta
 *     ao jogador aos 1,3 s, com o anel de perigo no chão: dá para sair correndo ou com dash.
 *  4. impact_and_return 3,2 s — a explosão NASCE do ponto de contato em estágios (refino Mod 262):
 *     CONTATO 0–0,12 s (ponta crava, congelamento de 0,11 s em tempo real, tranco, fissura pequena e faísca);
 *     COMPRESSÃO 0,12–0,55 s (fissuras luminosas crescem, núcleo pequeno e nítido no chão, linhas convergem, placas vibram);
 *     FORMAÇÃO 0,55–1,05 s (o núcleo sobe e abre, a casca do domo ganha espessura, primeiro halo, rochas começam a subir);
 *     DETONAÇÃO 1,05–1,8 s (anéis 1→2→3, domo, feixe, rochas radiais, onda de choque, luz e tremor secundário);
 *     CAUDA 1,8–3,2 s (vento, resíduo, decaimento e o branco nascendo do núcleo que devolve a arena limpa).
 */
export const COSMIC_ULT_BUILD = '265-cosmic-judgment-refino';
export const COSMIC_ULT = {
  phases: [['boss_aura', 3.3], ['circle_build', 4.4], ['sword_emerge_and_fall', 4.0], ['impact_and_return', 3.2]],
  circles: [{ r: 15, h: 15, spin: .14, from: .2, to: 3.2 }, { r: 7.5, h: 23, spin: -.24, from: .9, to: 3.8 }, { r: 3.75, h: 30, spin: .38, from: 1.5, to: 4.2 }],
  swordScale: 7, swordTip: 1.43, swordTotal: 1.95, embed: 1.4, impactR: 6.5, dmg: 40, release: 1.3, freeze: .11, slowMo: .45,
  whiteAt: 2.3, whiteIn: .2, whiteHold: .08, whiteOut: .6, edge: 6, stages: { contact: .12, compress: .55, form: 1.05, deton: 1.8 }, rings: [1.05, 1.2, 1.38], wind: 1.4
};
const clamp01 = x => Math.max(0, Math.min(1, x)), sm = x => { x = clamp01(x); return x * x * (3 - 2 * x); };
/** Ruído 1D suave (valor com interpolação suave) — nunca jitter aleatório por quadro. */
export function smoothNoise(t, seed = 0) { const i = Math.floor(t), f = t - i, h = n => { const s = Math.sin((n + seed * 57.3) * 127.1) * 43758.5453; return (s - Math.floor(s)) * 2 - 1; }, u = f * f * (3 - 2 * f); return h(i) * (1 - u) + h(i + 1) * u; }
/** Tremor por trauma: offset = A·τ²·ruído(t·freq) + tranco direcional amortecido; roll pequeno. */
export function shakeAt(trauma, t, kickT = 99, o = {}) {
  const A = o.amp ?? .36, R = o.roll ?? .04, f = o.freq ?? 8, k = trauma * trauma;
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
      const gy = ground(px, pz); Object.assign(st, { phase: U.phases[0][0], pi: 0, t: 0, pt: 0, rt: 0, P: { x: px, y: gy, z: pz }, boss: { x: boss.x, z: boss.z }, circles: U.circles.map(c => ({ ...c, y: gy + c.h, k: 0 })), tipY: gy + U.circles[0].h, freeze: 0, trauma: 0, kickT: 99, hits: 0, done: false, aborted: false, impactAt: -1, white: 0, flash: 0, fovAdd: 0, lock: true, telegraph: 0, impacted: false, detonated: false, windDone: false, whiteDone: false, ring1: false, ring2: false, ring3: false, stage: '' });
      return api;
    },
    abort() { if (st.done || st.phase === 'idle') return; st.aborted = true; st.done = true; st.lock = false; st.white = 0; st.flash = 0; st.trauma = 0; st.fovAdd = 0; st.phase = 'aborted'; },
    /** rdt = tempo REAL do quadro. hero {x,y,z,iframes}. Eventos: phase, circle, release, impact{hit}, hit, detonate, ring, wind, white, end. */
    step(rdt, hero) {
      const ev = []; if (st.done || st.phase === 'idle') return ev; st.rt += rdt;
      let dt = rdt; if (st.freeze > 0) { st.freeze -= rdt; dt = rdt * .06; } // congelamento de impacto: medido no relógio real, nunca prende
      st.t += dt; st.pt += dt; if (st.t === dt) ev.push({ type: 'phase', n: 1, name: st.phase });
      st.kickT += rdt; st.trauma = Math.max(0, st.trauma - rdt / 1.0);
      const [, dur] = U.phases[st.pi];
      if (st.pi === 0) { st.trauma = Math.max(st.trauma, .16 * sm((st.pt - 2.6) / .7)); }
      if (st.pi === 1) { for (const c of st.circles) { const k = clamp01((st.pt - c.from) / (c.to - c.from)); if (k >= 1 && c.k < 1) ev.push({ type: 'circle', r: c.r }); c.k = k; } }
      if (st.pi === 2) { const k = clamp01(st.pt / dur); st.tipY = swordTipY(k, st.circles[0].y, st.P.y); st.telegraph = sm(st.pt / .35); st.trauma = Math.max(st.trauma, .05 + .2 * k * k);
        if (st.lock && st.pt >= U.release) { st.lock = false; ev.push({ type: 'release' }); } }
      if (st.pi === 3) { const p = st.pt;
        const D0 = U.stages.form; st.stage = p < U.stages.contact ? 'contact' : p < U.stages.compress ? 'compress' : p < D0 ? 'form' : p < U.stages.deton ? 'deton' : 'tail';
        st.fovAdd = p < .06 ? -2.5 * p / .06 : p < D0 ? -2.5 * Math.max(0, 1 - (p - .06) / .4) : p < D0 + .06 ? -7 * (p - D0) / .06 : -7 * Math.max(0, 1 - (p - D0 - .06) / .7);
        st.flash = p < .12 ? .3 * (1 - p / .12) : p >= D0 && p < D0 + .14 ? .55 * (1 - (p - D0) / .14) : 0; // clarão pequeno no toque, o maior só na detonação
        if (p >= D0 && !st.detonated) { st.detonated = true; st.trauma = Math.min(1, st.trauma + .85); st.kickT = 0; ev.push({ type: 'detonate', x: st.P.x, y: st.P.y, z: st.P.z }); }
        if (p >= U.wind && !st.windDone) { st.windDone = true; ev.push({ type: 'wind' }); }
        const w0 = U.whiteAt, w1 = w0 + U.whiteIn, w2 = w1 + U.whiteHold, w3 = w2 + U.whiteOut; st.white = p < w0 ? 0 : p < w1 ? sm((p - w0) / U.whiteIn) : p < w2 ? 1 : 1 - sm((p - w2) / U.whiteOut);
        if (p >= w1 && !st.whiteDone) { st.whiteDone = true; ev.push({ type: 'white' }); } // VFX some por trás do branco
        for (let i = 1; i <= 3; i++) if (p >= U.rings[i - 1] && !st['ring' + i]) { st['ring' + i] = true; st.trauma = Math.min(1, st.trauma + .12); ev.push({ type: 'ring', n: i }); } }
      if (st.pt >= dur) {
        if (st.pi === 2 && !st.impacted) { // contato: explosão SEMPRE no ponto fixo do chão; dano só dentro do raio legível
          st.impacted = true; st.tipY = st.P.y - U.embed; const d = Math.hypot(hero.x - st.P.x, hero.z - st.P.z), hit = !hero.iframes && d <= U.impactR + .35;
          st.freeze = U.freeze; st.trauma = .7; st.kickT = 0; st.impactAt = st.t; ev.push({ type: 'impact', x: st.P.x, y: st.P.y, z: st.P.z, hit, dist: d }); if (hit) { st.hits = 1; ev.push({ type: 'hit', dmg }); }
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
      if (st.pi === 0) { const k = sm(p / 3.3), d = 11.5 - 2.6 * k; out.w = sm(p / .3); out.pos = [B.x + fx * d + rx * 3.4, B.y + .75 + .2 * k, B.z + fz * d + rz * 3.4]; out.look = [B.x + rx * .4, B.y + 2.6 + 3.4 * k, B.z + rz * .4]; out.fov = 16; } /* baixa, 3/4 frontal, dolly-in: bispo legível e criaturas por cima */
      else if (st.pi === 1) { const hx = B.x - H.x, hz = B.z - H.z, hl = Math.hypot(hx, hz) || 1, ux = hx / hl, uz = hz / hl, lx = -uz, lz = ux, up = sm((p - .35) / 1.3);
        out.w = 1; out.pos = [H.x - ux * 6.5 + lx * 1.6, H.y + .7, H.z - uz * 6.5 + lz * 1.6]; /* atrás do herói, baixo: ele fica embaixo do quadro, olhando os selos */
        const tx = P.x + ux * 9, tz = P.z + uz * 9; out.look = [H.x + ux * 2 + (tx - H.x - ux * 2) * up, H.y + 1.8 + (P.y + 15 - H.y - 1.8) * up, H.z + uz * 2 + (tz - H.z - uz * 2) * up]; out.fov = 10 + 20 * up; }
      else if (st.pi === 2) { const hx = B.x - P.x, hz = B.z - P.z, hl = Math.hypot(hx, hz) || 1, sx = -hz / hl, sz = hx / hl; out.w = p < U.release ? 1 : 1 - sm((p - U.release) / .5);
        out.pos = [P.x + sx * 21 - hx / hl * 4, P.y + 2.6, P.z + sz * 21 - hz / hl * 4]; out.look = [P.x, Math.max(P.y + 6, st.tipY + 3), P.z]; out.fov = 14; }
      else if (st.pi === 3) { /* plano aberto de fora da explosão (nunca de dentro); troca de volta para a câmera de jogo por baixo do branco */
        const hx = B.x - P.x, hz = B.z - P.z, hl = Math.hypot(hx, hz) || 1, ux = hx / hl, uz = hz / hl, pk = U.whiteAt + U.whiteIn; out.w = p < pk ? sm(p / .12) : 0;
        out.pos = [P.x - ux * 25 + uz * 6, P.y + 8.5, P.z - uz * 25 - ux * 6]; out.look = [P.x, P.y + 5, P.z]; out.fov = 12; }
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
 float core2=exp(-e*e*70.); vec3 c=mix(vec3(.06,.0,.005),vec3(.75,.05,.03),(1.-e/edge)*.8); c=mix(c,vec3(1.,.9,.8),core2*(.55+.45*vK.w)); c=mix(vec3(.01,0.,0.),c,smoothstep(edge,edge-.3,e));
 if(vK.x>.5) c=mix(vec3(.02,0.,0.),vec3(.9,.1,.05),exp(-e*e*50.)*.9);
 float a=vK.y; if(a<.02) discard; gl_FragColor=vec4(c,a); }`;
/* PRESENÇA da fase 1 (refino Mod 262): UMA manifestação feita de campo rubro, raias negras de pressão convergindo e
   espaço negativo branco-rosado — dois rasgos inclinados no alto e uma fenda curva enorme embaixo. Nada é modelado:
   a forma nasce da revelação da própria energia (k), com distorção suave do domínio e fluxo para fora do ponto focal.
   layer 0 = campo + rasgos + raias (fundo); layer 1 = só raias e línguas (plano do meio, dá profundidade). */
const PRES_V = `varying vec2 vU; void main(){ vU=uv*2.-1.; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const PRES_F = `${NOISE} uniform float time,k,layer,aspect; varying vec2 vU;
float seg(vec2 p,vec2 a,vec2 b,out float h){ vec2 pa=p-a,ba=b-a; h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h); }
float slash(vec2 p,vec2 a,vec2 b,float W,float rev){ float h; float d=seg(p,a,b,h); float w=W*pow(sin(3.1416*clamp(h,0.,1.)),.55)*(.75+.5*h); return (h>rev)?1.:d-w; }
void main(){ vec2 p=vec2(vU.x*aspect,vU.y); vec2 F=vec2(0.,-.5); vec2 q=p-F; float r=length(q), ang=atan(q.y,q.x);
 vec2 wp=p+.035*vec2(n2(p*3.+vec2(0.,time*.6)),n2(p*3.+vec2(5.,-time*.5)))-.0175; /* distorção suave */
 float grow=smoothstep(0.,1.,k);
 // campo rubro: oval alto com bordas estriadas pelas próprias raias (sem borda de placa)
 float rr=length((p-vec2(0.,.05))*vec2(.78/aspect*1.3,.92)); float sn=n2(vec2(ang*16.,r*1.5-time*1.2)); float edge=.25+.85*grow+.18*(sn-.5);
 float field=1.-smoothstep(edge-.32,edge,rr); if(layer>.5) field*=.0;
 float flow=n2(vec2(ang*38.,r*4.-time*2.6)), flow2=n2(vec2(ang*90.,r*9.-time*4.));
 vec3 col=mix(vec3(.14,.0,.008),vec3(.72,.03,.035),clamp(.35+.65*(1.-rr)+.25*flow,0.,1.)); col=mix(col,col*.55,smoothstep(.55,.85,flow2)*.6);
 // raias negras longas convergindo ao foco, esticando com a carga
 float N=layer>.5?70.:120., id=floor((ang/6.2832+.5)*N), lf=fract((ang/6.2832+.5)*N), hsh=h1(vec2(id,layer*7.)), r0=.18+.5*hsh, len=(.35+.9*h1(vec2(id,3.)))*grow;
 float wline=(.08+.18*h1(vec2(id,9.)))*(1.-r*.25); float line=(1.-smoothstep(wline*.5,wline,abs(lf-.5)))*step(.35,hsh)*smoothstep(r0,r0+.08,r)*(1.-smoothstep(r0+len-.1,r0+len,r+.06*sin(time*3.+id)));
 // espaço negativo: dois rasgos inclinados e a fenda curva (sorriso) — revelados pela energia
 float eyeRev=smoothstep(.32,.72,k), grinRev=smoothstep(.48,.95,k);
 float dE=min(slash(wp,vec2(-.13,.3),vec2(-.66,.86),.07,eyeRev),slash(wp,vec2(.13,.3),vec2(.66,.86),.07,eyeRev));
 float gx=wp.x/.98, gyc=.02-.34*(1.-gx*gx), gt=.13*pow(max(0.,1.-gx*gx),.75), dG=(abs(gx)>grinRev)?1.:abs(wp.y-gyc)-gt*(.6+.4*grinRev);
 dG+=(n2(vec2(wp.x*22.,time*2.))-.5)*.02*grinRev; dE+=(n2(vec2(wp.y*30.,time*2.5))-.5)*.012;
 float dW=min(dE,dG); float white=(1.-smoothstep(0.,.012,dW))*step(layer,.5), halo=exp(-max(dW,0.)*14.)*step(layer,.5)*max(eyeRev,grinRev);
 col=mix(col,vec3(1.,.66,.62),halo*.75); col=mix(col,vec3(1.,.95,.94),white);
 col=mix(col,vec3(.008,0.,.002),line*(1.-white)*.95);
 float a=layer>.5?line*.85*grow:max(field*(.95),white); a=max(a,line*field); a*=smoothstep(-1.,-.72,vU.y)*smoothstep(1.,.85,vU.y)*smoothstep(1.,.86,abs(vU.x)); if(a<.01) discard; /* sem borda de placa */
 gl_FragColor=vec4(col,a); }`;
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
  /* fase 1: a presença (dois planos em profundidade, virados para a câmera cinematográfica só em yaw) */
  const presU = [0, 1].map(l => ({ k: { value: 0 }, layer: { value: l }, aspect: { value: 1.2 } }));
  const pres = presU.map((u, l) => mesh(new T.PlaneGeometry(2, 2), mat({ vertexShader: PRES_V, fragmentShader: PRES_F, transparent: true, depthWrite: false, side: T.DoubleSide, uniforms: u }), l ? 2 : 1));
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
  let giant = null; function ensureGiant() { if (!giant && makeSword) { giant = makeSword(); giant.scale.setScalar(COSMIC_ULT.swordScale); if (giant.userData.flameScale) giant.userData.flameScale.value = .6; /* chamas negras da mesma espada, proporcionais à gigante */ for (const m of giant.userData.mats) if (m.isMeshStandardMaterial) { m.emissive.setHex(m.color.getHex() > 0x500000 ? 0x4a3a7a : 0x2a1450); m.emissiveIntensity = 1.4; } /* gigante: o metal brilha com a luz do selo para ler no céu escuro */ giant.rotation.x = Math.PI; giant.visible = false; root.add(giant); } return giant; }
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
  return {
    root,
    /** ctx: {camera, boss:{x,y,z,yaw}, low, swordTime} */
    update(ult, ctx, rdt) {
      const st = ult && ult.st; time += rdt; uTime.value = time; cam.copy(ctx.camera.position); const low = !!ctx.low; q = 0;
      for (const I of [rocks, slabs, streaks, glows]) I.n = 0;
      root.visible = !!(st && !st.done && st.P); if (!root.visible) { if (giant) giant.visible = false; return; }
      const B = ctx.boss, fx = Math.sin(B.yaw), fz = Math.cos(B.yaw), Pp = st.P, pi = st.pi, p = st.pt;
      // ---- fase 1: a presença (some no corte para a fase 2, sem resíduo no céu) ----
      const g1 = pi === 0 ? sm(p / 3.1) : 0;
      { const dx = B.x - cam.x, dz = B.z - cam.z, dl = Math.hypot(dx, dz) || 1, ux = dx / dl, uz = dz / dl, yaw = Math.atan2(-ux, -uz);
        const L = [[19, 18.5, 36, 33], [8, 11.5, 26, 22]]; pres.forEach((m, l) => { m.visible = g1 > .01; if (!m.visible) return; const [d, h, w, hh] = L[l]; m.position.set(B.x + ux * d, B.y + h, B.z + uz * d); m.rotation.set(0, yaw, 0); m.scale.set(w, hh, 1); presU[l].k.value = g1; presU[l].aspect.value = w / hh; }); }
      if (g1 > .01) { const NS = low ? 5 : 7; for (let i = 0; i < NS; i++) { const th0 = i / NS * 6.283 + R3(i) * 2, H = (3 + 7 * g1) * (.7 + .5 * R3(i * 3)); /* línguas vermelhas que sobem do corpo */ for (let j = 0; j < 12; j++) { const u = j / 11, th = th0 + time * (1 + R3(i * 7)) * (i % 2 ? 1 : -1) + u * 2.2, rr = (1.1 + 3.6 * g1 * (.5 + .5 * R3(i * 5))) * Math.sin(Math.PI * (.15 + .7 * u)) + .5; pts[j].set(B.x + Math.cos(th) * rr - fx * u * 2, B.y + u * H, B.z + Math.sin(th) * rr - fz * u * 2); }
          strip(12, i % 4 === 0 ? 1 : 0, u => g1 * (1 - u * u), i * .37, g1, u => (.07 + .16 * g1) * Math.pow(1 - u, .7) + .015); }
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
      // ---- fase 4: a explosão NASCE do contato — contato → compressão → formação → detonação → cauda (até o branco) ----
      const SG = COSMIC_ULT.stages, D0 = SG.form, ex = pi === 3 && p < COSMIC_ULT.whiteAt + COSMIC_ULT.whiteIn + .05; for (const o of [core, dome, beam, crater, shock, ...rings]) o.visible = false;
      if (ex) { const cmp = sm((p - SG.contact) / (SG.compress - SG.contact)), frm = sm((p - SG.compress) / (D0 - SG.compress)), dt0 = Math.max(0, p - D0), det = 1 - Math.pow(1 - Math.min(1, dt0 / .45), 3), tail = sm((p - SG.deton) / (COSMIC_ULT.whiteAt - SG.deton));
        // cratera: fissura pequena no toque → fissuras luminosas na compressão → abre na formação → cratera inteira na detonação
        crater.visible = true; crater.position.set(Pp.x, Pp.y + .04, Pp.z); crater.scale.setScalar(1.6 + 4.4 * cmp + 3 * frm + 3 * det); craterU.k.value = 0; craterU.cool.value = Math.max(0, (p - SG.deton) / 1.2);
        // núcleo: nasce pequeno e nítido no chão, sobe e abre, explode; dissolve na cauda
        if (p >= SG.contact) { core.visible = true; const R = p < SG.compress ? .35 + .85 * cmp : p < D0 ? 1.2 + 2 * frm : 3.2 + 2.3 * det; core.position.set(Pp.x, Pp.y + .25 + 1.4 * frm + .6 * det, Pp.z); core.scale.setScalar(R * (1 + .06 * Math.sin(time * 18))); coreU.heat.value = 1 - .35 * tail; coreU.k.value = .55 * tail; }
        // casca do domo: só a partir da formação, fina e rasgada, ganhando espessura; cheia na detonação
        if (p >= SG.compress) { dome.visible = true; const ds = 2 + 4 * frm + 5 * det; dome.position.set(Pp.x, Pp.y - .2, Pp.z); dome.scale.set(ds, ds * (.85 + .1 * det), ds); domeU.k.value = p < D0 ? .9 - .5 * frm : Math.max(.1, .4 - .3 * det) + .5 * tail; }
        // primeiro halo (formação) e onda de choque (detonação)
        if (p >= SG.compress) { shock.visible = true; const sk = p < D0 ? frm * .5 : Math.min(1, dt0 / .9); shock.position.set(Pp.x, Pp.y + .1, Pp.z); shock.scale.setScalar(p < D0 ? 2 + 6 * frm : 4 + 33 * (1 - Math.pow(1 - sk, 2))); shockU.k.value = p < D0 ? .6 - .2 * frm : sk; }
        // anéis 1 → 2 → 3, feixe: só na detonação
        rings.forEach((r, i) => { const at = COSMIC_ULT.rings[i], h = [1, 4.8, 9][i], rr = [17, 13, 9][i], kk = Math.max(0, p - at) / 1.6, e = 1 - Math.pow(1 - Math.min(1, kk * 2.2), 3); r.visible = p > at; r.position.set(Pp.x, Pp.y + h + e * 1.5, Pp.z); r.scale.setScalar(2 + rr * e); r.material.uniforms.k.value = Math.min(1, kk); });
        if (p >= D0) { beam.visible = true; beam.position.set(Pp.x, Pp.y + 30, Pp.z); beam.scale.set(1 + 2.2 * det, 60, 1 + 2.2 * det); beamU.k.value = Math.min(1, dt0 / 1.4); }
        // luz: faísca concentrada no toque, ponto quente na compressão, clarão grande só na detonação
        P.set(Pp.x, Pp.y + .6 + 1.4 * frm, Pp.z); Q.identity(); const gS = p < SG.contact ? 2.5 : p < D0 ? 2 + 4 * cmp + 3 * frm : 26 * (1 - Math.min(1, dt0 / .6)) + 6; S.setScalar(gS); M.compose(P, Q, S); put(glows, p < D0 ? [1, .9, .6, .85] : [1, .85, .45, 1 - Math.min(1, dt0 / 1.2) * .7]);
        // linhas de energia convergindo para o epicentro (compressão/formação) e raios saindo (detonação)
        const n = low ? 18 : 32;
        if (p >= SG.contact && p < D0) { for (let i = 0; i < n; i++) { const a = i / n * 6.283 + R3(i * 9) * .2, conv = sm((p - SG.contact) / (D0 - SG.contact)), dist = 2 + 10 * (1 - conv) * (.6 + .4 * R3(i)), len = 2.5 * (1 - conv) + .6;
            D.set(-Math.cos(a), .12, -Math.sin(a)).normalize(); E.set(cam.x - Pp.x, cam.y - Pp.y, cam.z - Pp.z); X.crossVectors(D, E).normalize(); Z.crossVectors(X, D); M.makeBasis(X, D, Z); Q.setFromRotationMatrix(M); P.set(Pp.x + Math.cos(a) * dist, Pp.y + .3, Pp.z + Math.sin(a) * dist); S.set(.35, len, 1); M.compose(P, Q, S); put(streaks, [1.1, 1, 0, i * .17]); } }
        else if (p >= D0 && dt0 < .55) { for (let i = 0; i < n; i++) { const a = i / n * 6.283 + R3(i * 9) * .2, el = .05 + .5 * R3(i * 4), len = (6 + 10 * R3(i * 6)) * Math.min(1, dt0 / .12) * (1 - dt0 / .55);
            D.set(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el)); E.set(cam.x - Pp.x, cam.y - Pp.y, cam.z - Pp.z); X.crossVectors(D, E).normalize(); Z.crossVectors(X, D); M.makeBasis(X, D, Z); Q.setFromRotationMatrix(M); P.set(Pp.x + D.x * 2, Pp.y + 1 + D.y * 2, Pp.z + D.z * 2); S.set(.5, len, 1); M.compose(P, Q, S); put(streaks, [1.3, 1, 0, i * .17]); } }
        // placas do chão: vibram na compressão, erguem na formação, tombam para fora na detonação
        const NSb = low ? 10 : 18; for (let i = 0; i < NSb; i++) { const a = i / NSb * 6.283 + R3(i) * .3, r = 4 + 4 * cmp + R3(i * 2) * 3 + 2 * det, jit = p < D0 ? .05 * Math.sin(time * 60 + i * 3) * cmp : 0, rise = .25 * frm + .3 * det;
          P.set(Pp.x + Math.cos(a) * r, Pp.y + .05 + rise + jit, Pp.z + Math.sin(a) * r); Q.setFromAxisAngle(D.set(-Math.sin(a), 0, Math.cos(a)), -(.15 * frm + .5 * det) - .3 * R3(i * 5) * det + jit); S.set(1.4 + R3(i) * 1.2, 1 + R3(i * 3), 1.6 + R3(i * 7)); M.compose(P, Q, S); put(slabs, []); }
        // blocos de rocha: começam a subir na formação e voam radialmente na detonação
        if (p >= SG.compress) { const NR = low ? 34 : 70; for (let i = 0; i < NR; i++) { const a = R3(i * 1.7) * 6.283, v = 7 + 14 * R3(i * 2.3), vy = 6 + 16 * R3(i * 3.1), r0 = 1.5 + 3 * R3(i * 8), sc = .25 + 1.1 * R3(i * 4.7) * R3(i * .3 + 1); let x, y, z;
            if (p < D0) { if (i % 3) continue; const lift = frm * (.6 + .8 * R3(i * 5)); x = Pp.x + Math.cos(a) * r0; z = Pp.z + Math.sin(a) * r0; y = Pp.y + .2 + lift + .05 * Math.sin(time * 40 + i); }
            else { const t = dt0; y = Pp.y + .3 + vy * t - 9.8 * t * t; if (y < Pp.y - 1) continue; x = Pp.x + Math.cos(a) * (r0 + v * t); z = Pp.z + Math.sin(a) * (r0 + v * t); }
            P.set(x, y, z); Q.setFromAxisAngle(D.set(Math.sin(i), .5, Math.cos(i)).normalize(), p * (3 + R3(i) * 6)); S.setScalar(sc); M.compose(P, Q, S); put(rocks, []); } } }
      else rings.forEach(r => { r.visible = false; });
      rg.setDrawRange(0, q * 6); rg.attributes.position.needsUpdate = rg.attributes.aUv.needsUpdate = rg.attributes.aK.needsUpdate = true;
      for (const I of [rocks, slabs, streaks, glows]) { I.mesh.count = I.n; I.mesh.instanceMatrix.needsUpdate = true; for (const [k] of I.attrs) I.mesh.geometry.attributes[k].needsUpdate = true; }
    },
    clear() { root.visible = false; if (giant) giant.visible = false; bolts.visible = false; },
    dispose() { scene.remove(root); for (const g of geos) g.dispose(); for (const m of mats) m.dispose(); if (giant) giant.userData.dispose(); }
  };
}
