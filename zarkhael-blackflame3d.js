/**
 * BISPO 3 (ZAR'KHAEL) — SKILL 2: LUA TENEBROSA — O FOGO QUE NÃO MORRE.
 *
 * Lógica pura e testável (createBlackMoonFlames = sequência; createFlameHazards = manchas no chão e queimadura NÃO
 * acumulativa) + VFX (createBlackFlameVFX) num relógio só:
 *   moon        0–1,4 s   a lua-máscara de horror da referência (crânio pálido de aquarela, vazio negro colossal à direita,
 *                         olhos esbugalhados olhando de lado em órbitas negras, nariz em cunha branca, sorriso de dentes
 *                         pontudos e rosados, sombra do queixo) se revela alta no céu. ESTÁTICA: não segue o herói.
 *   10 chamas   1,9 s +   exatamente 10 chamas negras (línguas fluidas, contorno prata/violeta), uma a cada 0,85 s, cada
 *                         uma com o tamanho da antiga colossal e antecipação de 0,36 s na mão; mira travada, arco curto,
 *                         colisão varrida. Acerto: dano + queimadura 3,4 s. Chão: mancha viva 4,0 s; tocar: queimadura 4,0 s.
 *   colossal    10,0 s +  carga em etapas (faísca → fluxo → núcleo → muralha de línguas) por 2,5 s, 3× maior que a antiga,
 *                         aviso no chão e LANÇAMENTO de verdade, mais lento (esquiva com dash). Acerto: dano grande + aura
 *                         negra e queimadura 6,0 s. Chão: incêndio gigante 7,0 s; tocar: queimadura 6,0 s.
 *   moon fade             a lua só começa a sumir DEPOIS do lançamento da colossal.
 * Queimadura: uma instância só por herói; recontato renova até a maior duração; a forte substitui a fraca; nunca soma ticks.
 */
export const BLACKFLAME_BUILD = '270-black-moon-flames-refino';
export const BF = {
  moonIn: 1.4, firstShot: 1.9, shotGap: .85, windup: .36, shots: 10, finalAt: 10.0, finalCharge: 2.5, moonOut: 1.1,
  smallSpeed: 18, bigSpeed: 13, lead: .2, leadCap: 2, smallR: .9, bigR: 2.4, life: 3.4,
  smallDmg: 3, bigDmg: 20, burnSmallHit: 3.4, fieldSmall: 4.0, burnSmallField: 4.0, burnBig: 6.0, fieldBig: 7.0,
  fieldSmallR: 1.8, fieldBigR: 6.5, tick: .6, tickWeak: 1, tickStrong: 2, heroR: .45, maxFields: 12, releaseAfter: .45,
  smallScale: 1.05, bigScale: 3.15 /* cada chama menor tem o tamanho da antiga colossal; a colossal é 3× maior */
};
const clamp01 = x => Math.max(0, Math.min(1, x)), sm = x => { x = clamp01(x); return x * x * (3 - 2 * x); };

/** Manchas no chão + queimadura do herói (não acumulativa). Persiste depois da habilidade. */
export function createFlameHazards(opts = {}) {
  const T = { ...BF, ...(opts.T || {}) }, ground = opts.ground || (() => 0);
  const st = { fields: [], burn: null, id: 0 };
  const api = {
    T, st,
    get active() { return st.fields.length > 0 || !!st.burn; },
    addField(x, z, big) { const y = ground(x, z); if (st.fields.length >= T.maxFields) { const i = st.fields.findIndex(f => !f.big); st.fields.splice(i >= 0 ? i : 0, 1); }
      const f = { id: ++st.id, x, y, z, big: !!big, r: big ? T.fieldBigR : T.fieldSmallR, dur: big ? T.fieldBig : T.fieldSmall, t: 0 }; st.fields.push(f); return f; },
    /** aplica/renova queimadura: 'weak' | 'strong'. A forte substitui a fraca; a fraca nunca encurta nem enfraquece a forte. */
    burn(tier, dur) { const b = st.burn;
      if (!b) { st.burn = { tier, left: dur, tickT: 0, total: dur }; return 'start'; }
      if (tier === 'strong' && b.tier === 'weak') { b.tier = 'strong'; b.left = Math.max(b.left, dur); b.total = Math.max(b.total, b.left); return 'upgrade'; }
      if (tier === b.tier) { if (dur > b.left) { b.left = dur; b.total = Math.max(b.total, dur); return 'refresh'; } return 'keep'; }
      return 'keep'; },
    clearBurn() { st.burn = null; },
    clear() { st.fields.length = 0; st.burn = null; },
    /** hero {x,y,z,alive}. Eventos: field_end, burn(tier,res), tick(dmg,tier), burn_end. */
    step(dt, hero) {
      const ev = [];
      for (let i = st.fields.length - 1; i >= 0; i--) { const f = st.fields[i]; f.t += dt; if (f.t >= f.dur + .6) { st.fields.splice(i, 1); ev.push({ type: 'field_end', id: f.id, big: f.big }); } }
      if (hero && hero.alive !== false) { /* contato consolidado: a mancha mais forte que toca decide; nunca dois ticks */
        let touch = null; for (const f of st.fields) { if (f.t > f.dur) continue; const d = Math.hypot(hero.x - f.x, hero.z - f.z), gy = Number.isFinite(hero.y) ? hero.y : f.y; if (d <= f.r + T.heroR && gy < f.y + (f.big ? 5 : 2)) { if (!touch || f.big) touch = f; } }
        if (touch) { const res = touch.big ? api.burn('strong', T.burnBig) : api.burn('weak', T.burnSmallField); if (res !== 'keep') ev.push({ type: 'burn', tier: st.burn.tier, res, from: 'field' }); } }
      const b = st.burn;
      if (b) { b.left -= dt; b.tickT += dt; if (b.tickT >= T.tick) { b.tickT -= T.tick; ev.push({ type: 'tick', dmg: b.tier === 'strong' ? T.tickStrong : T.tickWeak, tier: b.tier }); }
        if (b.left <= 0) { st.burn = null; ev.push({ type: 'burn_end' }); } }
      return ev;
    }
  };
  return api;
}

/** A sequência da Skill 2 (lua + 10 chamas + colossal). hazards = createFlameHazards() compartilhado. */
export function createBlackMoonFlames(opts = {}) {
  const T = { ...BF, ...(opts.T || {}) }, ground = opts.ground || (() => 0), dmgMul = opts.dmgMul || 1, hazards = opts.hazards || createFlameHazards({ ground, T: opts.T });
  const st = { phase: 'idle', t: 0, shots: [], fired: 0, final: null, moon: 0, moonGone: false, done: false, aborted: false, trauma: 0, kickT: 99, finalLaunched: -1 };
  const shotAt = i => T.firstShot + i * T.shotGap;
  const api = {
    T, st, hazards, get done() { return st.done; },
    /** o bispo está preso no ritual (conjurando) até um instante depois do lançamento da colossal */
    get holdBoss() { return !st.done && st.phase !== 'idle' && !st.aborted && (st.finalLaunched < 0 || st.t < st.finalLaunched + T.releaseAfter); },
    start() { Object.assign(st, { phase: 'moon', t: 0, shots: [], fired: 0, final: null, moon: 0, moonGone: false, done: false, aborted: false, trauma: 0, kickT: 99, finalLaunched: -1 }); return api; },
    abort() { if (st.done || st.phase === 'idle') return; st.aborted = true; for (const s of st.shots) if (s.state === 'fly') s.state = 'gone'; if (st.final && st.final.state !== 'impact') st.final.state = 'gone'; if (st.finalLaunched < 0) st.finalLaunched = st.t; },
    /** wind-up atual (0..1) da mão para a i-ésima chama, ou da colossal (i=T.shots) */
    windup(i) { if (i < T.shots) { const a = shotAt(i) - T.windup; return clamp01((st.t - a) / T.windup); } return clamp01((st.t - T.finalAt) / T.finalCharge); },
    /** ctx {from:{x,y,z} (mão), hero:{x,y,z,vx,vz,iframes}}. Eventos: moon, windup, fire{i}, impact{i,big,kind,x,y,z}, hit{dmg,big}, final_charge, final_fire, moon_fade, end. */
    step(dt, ctx) {
      const ev = [], h = ctx.hero, from = ctx.from; if (st.done || st.phase === 'idle') return ev; const t0 = st.t; st.t += dt; const t = st.t, cross = a => t0 < a && t >= a;
      st.trauma = Math.max(0, st.trauma - dt / .7); st.kickT += dt;
      if (t0 === 0) ev.push({ type: 'moon' });
      const gy = Number.isFinite(h.y) ? h.y : ground(h.x, h.z);
      if (!st.aborted) {
        for (let i = 0; i < T.shots; i++) { if (cross(shotAt(i) - T.windup)) ev.push({ type: 'windup', i });
          if (cross(shotAt(i)) && st.fired === i) { const s = launch(from, h, gy, T.smallSpeed, false); s.i = i; st.shots.push(s); st.fired++; ev.push({ type: 'fire', i, x: s.x, y: s.y, z: s.z, target: s.target }); st.phase = 'shots'; } }
        if (cross(T.finalAt)) { st.phase = 'final_charge'; ev.push({ type: 'final_charge' }); }
        if (st.phase === 'final_charge') st.trauma = Math.max(st.trauma, .15 * sm((t - T.finalAt) / T.finalCharge));
        if (cross(T.finalAt + T.finalCharge) && !st.final) { const s = launch(from, h, gy, T.bigSpeed, true); s.i = T.shots; st.final = s; st.finalLaunched = t; st.phase = 'final'; ev.push({ type: 'final_fire', x: s.x, y: s.y, z: s.z, target: s.target }); }
      }
      if (st.finalLaunched >= 0 && t >= st.finalLaunched && !st.moonGone) { if (!st.fadeEv) { st.fadeEv = true; ev.push({ type: 'moon_fade' }); } }
      st.moon = st.finalLaunched >= 0 ? 1 - clamp01((t - st.finalLaunched) / T.moonOut) : sm(t / T.moonIn);
      if (st.finalLaunched >= 0 && st.moon <= 0) st.moonGone = true;
      for (const s of [...st.shots, st.final].filter(Boolean)) { if (s.state !== 'fly') { if (s.state === 'impact') { s.it += dt; if (s.it > (s.big ? 1.4 : .7)) s.state = 'gone'; } continue; }
        const px = s.x, py = s.y, pz = s.z; s.ft += dt; const k = clamp01(s.ft / s.T); s.x = s.ox + (s.target[0] - s.ox) * k; s.z = s.oz + (s.target[2] - s.oz) * k; s.y = s.oy + (s.target[1] - s.oy) * k + s.arc * 4 * k * (1 - k);
        s.path.push([s.x, s.y, s.z]); if (s.path.length > (s.big ? 20 : 14)) s.path.shift();
        // colisão VARRIDA (segmento do quadro) contra a cápsula do herói
        let hit = false; if (!h.iframes) { const sx = s.x - px, sz = s.z - pz, L2 = sx * sx + sz * sz; let u = L2 > 1e-9 ? ((h.x - px) * sx + (h.z - pz) * sz) / L2 : 0; u = clamp01(u); const cx = px + sx * u, cz = pz + sz * u, cy = py + (s.y - py) * u;
          if (Math.hypot(cx - h.x, cz - h.z) <= s.r + T.heroR && cy > gy - .3 && cy < gy + 2.4 + (s.big ? 2.6 : 0)) hit = true; }
        const g = ground(s.x, s.z);
        if (hit || k >= 1 || s.y <= g || s.ft > T.life) { const ix = hit ? h.x : s.x, iz = hit ? h.z : s.z, iy = ground(ix, iz); Object.assign(s, { state: 'impact', it: 0, ix, iy, iz, kind: hit ? 'hero' : 'ground' });
          st.trauma = Math.min(1, st.trauma + (s.big ? .9 : .28)); st.kickT = 0; ev.push({ type: 'impact', i: s.i, big: s.big, kind: s.kind, x: ix, y: iy, z: iz });
          if (hit) { ev.push({ type: 'hit', dmg: Math.round((s.big ? T.bigDmg : T.smallDmg) * dmgMul), big: s.big, i: s.i }); const res = hazards.burn(s.big ? 'strong' : 'weak', s.big ? T.burnBig : T.burnSmallHit); ev.push({ type: 'burn', tier: hazards.st.burn.tier, res, from: 'hit' }); }
          else { const f = hazards.addField(ix, iz, s.big); ev.push({ type: 'field', id: f.id, big: s.big, x: ix, y: f.y, z: iz }); } } }
      const allDone = st.fired >= T.shots && st.final && st.shots.every(s => s.state === 'gone') && st.final.state === 'gone';
      if (!st.done && ((allDone && st.moon <= 0) || (st.aborted && st.t - st.finalLaunched > .5 && [...st.shots, st.final].filter(Boolean).every(s => s.state === 'gone' || s.state === 'impact' && s.it > .3)))) { st.done = true; st.phase = 'done'; ev.push({ type: 'end', fired: st.fired, final: !!st.final, aborted: st.aborted }); }
      return ev;
    }
  };
  function launch(from, h, gy, speed, big) {
    const sp = Math.hypot(h.vx || 0, h.vz || 0), d0 = Math.hypot(h.x - from.x, h.z - from.z), lead = Math.min(T.leadCap, sp * Math.min(T.lead, d0 / speed));
    const ax = h.x + (sp > .1 ? h.vx / sp : 0) * lead, az = h.z + (sp > .1 ? h.vz / sp : 0) * lead, ay = ground(ax, az) + (big ? .2 : .05), dist = Math.hypot(ax - from.x, az - from.z);
    return { state: 'fly', big, ox: from.x, oy: from.y, oz: from.z, x: from.x, y: from.y, z: from.z, target: [ax, ay, az], T: Math.max(.35, Math.hypot(dist, ay - from.y) / speed), arc: (big ? .12 : .16) * dist + .4, ft: 0, r: big ? T.bigR : T.smallR, path: [[from.x, from.y, from.z]] };
  }
  return api;
}

/* ============================== VFX ============================== */
const NOISE = `float h1(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h1(i),h1(i+vec2(1,0)),f.x),mix(h1(i+vec2(0,1)),h1(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*n2(p);p*=2.02;a*=.5;}return s;}`;
/* Lua tenebrosa (referência B, recriada à mão no shader e comparada lado a lado com a imagem): crânio pálido de topo largo
   e queixo em diagonal, manchas de aquarela com borda escura, vazio negro colossal à direita (crescente claro fino à direita,
   grosso em cima e embaixo), dois olhos esbugalhados desiguais em órbitas negras olhando de lado, nariz em cunha branca,
   sorriso em cunha com dentes pontudos rosados sobre gengiva vermelha, sombra do queixo. Estática; revela/dissolve por ruído. */
const MOON_V = `varying vec2 vU; void main(){ vU=uv*2.-1.; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const MOON_F = `${NOISE} uniform float time,show; varying vec2 vU;
float ell(vec2 p,vec2 c,vec2 r){ return length((p-c)/r)-1.; }
float seg(vec2 p,vec2 a,vec2 b){ vec2 pa=p-a,ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h); }
vec3 stain(vec3 col,float s,float a,float k){ float m=smoothstep(a,a+.025,s), e=smoothstep(.035,0.,abs(s-a)); return mix(col,col*(1.-k),m)*(1.-e*k*.45); } /* mancha de aquarela: borda mais escura */
void main(){
 vec2 p=vec2(vU.x,vU.y*1.257); float ang=atan(p.y,p.x);
 /* contorno de crânio: topo largo e achatado, lado esquerdo quase reto, queixo cortado em diagonal, borda irregular */
 vec2 q=p/vec2(1.04,1.24); float ex=p.y>0.?2.7:2.2; float rr=pow(pow(abs(q.x),ex)+pow(abs(q.y),ex),1./ex);
 float wob=1.+.035*(n2(vec2(ang*2.4,3.1))-.5)+.02*(n2(vec2(ang*9.,1.7))-.5); float cut=dot(p,vec2(-.6,-.8))-1.02-.03*(n2(p*6.)-.5);
 float jc=mix(-1.,(length(p-vec2(-.3,-.38))-.8-.025*(n2(p*7.)-.5))*1.5,smoothstep(-.3,-.5,p.y)*smoothstep(.1,-.12,p.x)); float outl=max(rr-wob,jc); if(outl>0.) discard;
 float rev=fbm(p*2.1+3.); if(rev>show*1.3) discard;
 /* osso pálido: claro no centro do rosto, aquarela suja, papel granulado */
 float gran=n2(p*42.)*.5+n2(p*95.)*.5, brush=fbm(vec2(p.x*3.,p.y*9.)+7.), fb=fbm(p*2.3+vec2(5.,1.)), fc=fbm(p*4.6+2.), fr=fbm(p*3.+11.);
 vec3 col=mix(vec3(.42,.415,.4),vec3(.84,.83,.8),smoothstep(-.15,.75,1.-length((p-vec2(-.4,.05))/vec2(.95,1.15))+.3*(brush-.5)));
 float edgeM=smoothstep(.35,.95,rr); col*=.86+.16*gran; col=stain(col,fb+.18*edgeM-.06,.66,.4); col=stain(col,fc+.1*edgeM,.74,.3); col=mix(col,col*vec3(1.,.84,.82),smoothstep(.56,.72,fr)*.55);
 col=mix(col,col*.25,smoothstep(-.12,0.,outl)); /* borda escura contra o céu */
 col=mix(col,col*.62,smoothstep(.3,.9,fbm(p*1.3+vec2(9.,4.)))*smoothstep(-.2,-.75,p.y+.2*p.x)); col=mix(col,min(col*1.18,vec3(1.)),smoothstep(.55,.8,fbm(vec2(p.x*2.,p.y*6.)+21.))*.6);
 /* manchas escuras grandes no topo, como na pintura */
 float s1=ell(p+vec2((n2(p*7.)-.5)*.16,(n2(p*5.)-.5)*.12),vec2(-.42,1.0),vec2(.27,.18)), s2=ell(p+vec2((n2(p*9.)-.5)*.08,0.),vec2(.28,1.1),vec2(.16,.07)); vec2 pn=p+vec2(n2(p*13.)-.5,n2(p*13.+4.)-.5)*.07; float s3=ell(pn,vec2(-.66,.72),vec2(.06,.05)), s4=ell(pn,vec2(.42,-1.16),vec2(.07,.045)), s5=ell(pn,vec2(-.97,.25),vec2(.05,.2));
 col=stain(col,-s1,0.,.55); col=stain(col,-s2,0.,.45); col=stain(col,-min(s3,min(s4,s5)),0.,.6);
 float crack=seg(p+vec2((n2(p*14.)-.5)*.035,0.),vec2(-.37,.47),vec2(-.33,.14)); col=mix(col,vec3(.13,.13,.13),(1.-smoothstep(.006,.026,crack))*.75);
 /* vazio negro colossal à direita; a borda clara vira um crescente fino à direita e grosso em cima e embaixo */
 vec2 vp=p-vec2(.47,-.09); float va=atan(vp.y,vp.x); vec2 va2=abs(vp/vec2(.53,.91)); float vd=pow(pow(va2.x,2.7)+pow(va2.y,2.7),1./2.7)-1.+.045*(n2(vec2(va*3.,7.))-.5)+.02*(n2(vec2(va*11.,2.))-.5);
 col=mix(col,col*.42,smoothstep(.22,0.,vd)); col=mix(col,vec3(.006,.006,.008),smoothstep(.012,-.02,vd));
 /* queixo: crescente escuro marcado sob o sorriso, osso claro abaixo */
 vec2 jp=p-vec2(-.3,-.38); float ja=atan(jp.y,jp.x), jr=length(jp)+.025*(n2(p*9.)-.5); float jawW=smoothstep(-3.05,-2.75,ja)*smoothstep(-.55,-1.05,ja);
 col=mix(col,col*.4,(1.-smoothstep(.0,.14,.6-jr))*step(jr,.62)*jawW*.8*smoothstep(-.45,-.7,p.y)); col=mix(col,vec3(.04,.035,.035),(1.-smoothstep(.03,.085,abs(jr-.64)))*jawW);
 col=mix(col,col*.5,smoothstep(.62,.35,jr)*smoothstep(-.3,-.5,p.y)*smoothstep(-.1,-.35,p.x)*smoothstep(-2.95,-2.5,ja)*step(ja,0.)*.7);
 /* órbitas fundas (sombra pintada, não anel) e olhos esbugalhados olhando de lado */
 vec2 e1=vec2(-.69,.07), e2=vec2(-.165,.12); float nz=.06*(n2(p*11.)-.5);
 float k1=ell(p,e1+vec2(.005,0.),vec2(.225,.28))+nz, k2=ell(p,e2,vec2(.125,.245))+nz; float kk=min(k1,k2);
 col=mix(col,col*.55,(1.-smoothstep(-.05,.4,kk))*.75); col=mix(col,col*vec3(.9,.72,.72),(1.-smoothstep(.0,.3,abs(kk-.25)))*.35); col=mix(col,vec3(.03,.03,.035),1.-smoothstep(-.06,.06,kk+.05*(n2(p*23.)-.5)));
 vec2 c1=vec2(-.67,.05), c2=vec2(-.16,.09), r1=vec2(.172,.232), r2=vec2(.1,.185); float b1=ell(p,c1,r1), b2=ell(p,c2,r2);
 if(min(b1,b2)<.02){ bool L=b1<b2; vec2 ec=L?c1:c2, er=L?r1:r2; vec2 u=(p-ec)/er; float lu=length(u);
  vec3 eye=mix(vec3(.4,.4,.39),vec3(.9,.9,.87),clamp(.55+.4*u.x-.1*u.y,0.,1.))*(.84+.16*fbm(vec2(u.x*9.,u.y*3.)+(L?1.:5.))); eye=mix(eye,eye*.4,smoothstep(.45,1.,lu)*smoothstep(.3,-.9,u.x+u.y)); eye=mix(eye,eye*.5,smoothstep(.35,.95,u.y)*.8);
  float id=length((u-vec2(-.52,-.06))/vec2(.5,.74)); float iris=1.-smoothstep(.8,1.,id); eye=mix(eye,mix(vec3(.06,.07,.06),vec3(.24,.25,.21),smoothstep(.3,.95,id)),iris);
  eye+=vec3(.06)*(1.-smoothstep(0.,.3,length(u-vec2(.3,.45)))); col=mix(eye,col,smoothstep(-.02,.02,L?b1:b2)); }
 /* nariz: cunha branca afilada, ponta clara e narina escura embaixo */
 float nk=clamp((p.y+.2)/-.23,0.,1.), nx=p.x-(-.315+.025*nk), nw=.01+.055*pow(nk,1.2); float nose=min(max(abs(nx)-nw,max(p.y+.19,-p.y-.42)),ell(p,vec2(-.29,-.42),vec2(.065,.035)));
 col=mix(col,col*.55,(1.-smoothstep(0.,.08,max(abs(nx+.08)-.05,abs(p.y+.31)-.13)))*.5); col=mix(col,mix(vec3(.82,.8,.77),vec3(.97,.96,.93),nk),1.-smoothstep(-.006,.01,nose));
 col=mix(col,vec3(.1,.08,.08),(1.-smoothstep(-.2,.6,ell(p,vec2(-.28,-.47),vec2(.08,.03))))*.8);
 /* boca: sorriso em cunha que cresce até o vazio, dentes grandes, pontudos e entrelaçados, gengiva vermelha */
 float mx=(p.x+.58)/.47; float top0=-.55-.01*sin(mx*3.14), mid=-.675-.055*mx+.006*sin(mx*37.), bot0=-.8-.1*mx-.015*sin(mx*3.14), tap=sqrt(clamp(mx/.12,0.,1.)); float top=mid+(top0-mid)*tap, bot=mid+(bot0-mid)*tap;
 float inM=(p.y<top&&p.y>bot&&mx>0.&&mx<1.35)?1.:0.;
 col=mix(col,col*.5,(1.-smoothstep(0.,.1,max(max(p.y-top,bot-p.y),-mx*.53)))*(1.-inM)*.75*step(-.01,vd)); col=mix(col,col*.45,step(p.y,bot)*(1.-smoothstep(.0,.12,bot-p.y))*smoothstep(-.1,.15,mx)*(1.-inM)*.8);
 if(inM>.5&&vd>-.03){
   float NU=7., NL=6.5; vec2 pj=p+vec2(n2(p*60.)-.5,n2(p*60.+3.)-.5)*.012; float mj=(pj.x+.58)/.47; float tu=fract(mj*NU), tl=fract(mj*NL+.5); vec2 iu=vec2(floor(mx*NU),1.), il=vec2(floor(mx*NL+.5),2.);
   float gT=top-.022, gB=bot+.02; float hU=(gT-mid)*(.96+.16*h1(iu)), hL=(mid-gB)*(.98+.16*h1(il));
   float dU=clamp((gT-p.y)/hU,0.,2.), dL=clamp((p.y-gB)/hL,0.,2.); float wU=.5*pow(max(0.,1.-dU),.6), wL=.5*pow(max(0.,1.-dL),.6);
   wU*=.9+.15*h1(iu+7.); wL*=.9+.15*h1(il+7.); float aU=abs(tu-.5+.08*(h1(iu+3.)-.5)*dU)-wU, aL=abs(tl-.5+.1*(h1(il+3.)-.5)*dL)-wL; float tU=(p.y<gT)?1.-smoothstep(-.06,-.025,aU):0., tL=(p.y>gB)?1.-smoothstep(-.06,-.025,aL):0.; /* vão fino escuro entre os dentes */
   vec3 gum=vec3(.47,.17,.17), dark=vec3(.24,.08,.08), th=mix(vec3(.8,.62,.6),vec3(.94,.85,.82),n2(p*70.))*(.9+.1*n2(p*150.));
   vec3 c=mix(dark,gum*.6,smoothstep(.0,.03,abs(p.y-mid))*.5); c=mix(c,gum*.9,smoothstep(gB+.04,gB-.01,p.y)*.45); c=mix(c,gum*.5,smoothstep(gT-.03,gT+.01,p.y)*.5);
   float t=max(tU,tL); vec3 tc=th*(.75+.25*(tU>tL?1.-dU:1.-dL))*(.85+.15*(1.-abs((tU>tL?tu:tl)-.5)*2.)); tc=mix(tc,vec3(.62,.3,.3),smoothstep(-.12,-.03,tU>tL?aU:aL)*.5); tc=mix(tc,vec3(.6,.28,.28),(tU>tL?1.-dU:1.-dL)*.35);
   c=mix(c,tc,t); vec3 cc=mix(c,col*.35,smoothstep(.6,1.,1.-min(top-p.y,p.y-bot)/.025)*.5); col=mix(col*.45,cc,smoothstep(0.,.014,min(top-p.y,p.y-bot))); }
 col=mix(col,vec3(.6,.6,.6),smoothstep(show*1.3-.06,show*1.3,rev)*.4);
 gl_FragColor=vec4(col,1.); }`;
/* Fogo negro (referência A): línguas que sobem/arrastam no mundo, núcleo de tinta preta, contorno prata frio e violeta
   sombrio, ondulação contínua; tipo 1 = fio de fumaça cinza translúcido. */
const FL_V = `uniform float time,grow,lenMul,widthMul; uniform vec3 flow; attribute vec3 aBase; attribute vec4 aF; varying vec2 vU; varying vec4 vF; varying float vWy;
void main(){ vU=uv; vF=aF; vec4 wb=modelMatrix*vec4(aBase,1.); float sc=length(modelMatrix[0].xyz), h=uv.y, L=aF.x*sc*lenMul*grow, W=aF.y*sc*widthMul*(.6+.4*grow);
 vec3 dir=normalize(vec3(0.,1.,0.)+flow), tc=normalize(cameraPosition-wb.xyz), side=normalize(cross(dir,tc)+vec3(1e-4,0.,1e-4)), bin=normalize(cross(side,dir));
 float t=time*(1.3+.7*aF.w); float sw=(sin(h*3.3-t*2.1+aF.z*6.)*.3+sin(h*7.1-t*3.3+aF.z*11.)*.1)*pow(h,1.5)*L, curl=sin(h*4.-t*1.7+aF.z*3.)*.18*h*L;
 vec3 p=wb.xyz+dir*h*L+side*((uv.x*2.-1.)*W+sw)+bin*curl; vWy=p.y; gl_Position=projectionMatrix*viewMatrix*vec4(p,1.); }`;
const FL_F = `${NOISE} uniform float time,alpha,groundY; varying vec2 vU; varying vec4 vF; varying float vWy;
void main(){ if(vWy<groundY) discard; float h=vU.y, x=vU.x*2.-1., t=time*(1.3+.7*vF.w), smoke=step(.5,fract(vF.z*7.3))*step(.8,vF.w);
 float n=n2(vec2(x*2.2+vF.z*9.,h*3.6-t*2.4)), n3=n2(vec2(x*5.+vF.z*3.,h*8.-t*3.8));
 float xc=(n-.5)*.45*h+.25*sin(h*5.-t*2.6+vF.z*7.)*h*h, hw=pow(1.-h,1.2)*(.55+.45*smoothstep(0.,.14,h))*(.78+.34*n)+.012, d=abs(x-xc)/hw; if(d>1.) discard;
 float rim=smoothstep(.76,.99,d), inner=1.-smoothstep(.0,.05,abs(x-xc-.42*hw*sin(h*6.5-t*3.1+vF.z*5.)));
 vec3 c=vec3(.006,.005,.01); c=mix(c,vec3(.42,.42,.5),inner*.3*(1.-h*.5)); c=mix(c,mix(vec3(.6,.62,.7),vec3(.42,.28,.66),n3),rim*(.55+.45*n3)); /* tinta preta com contorno prata/violeta fino */
 float a=alpha*(1.-smoothstep(.75,1.,h)*.6); if(smoke>.5){ c=mix(vec3(.12,.12,.14),vec3(.5,.5,.55),rim); a*=.45*(1.-h*.6); }
 if(a<.02) discard; gl_FragColor=vec4(c,a); }`;
const SCORCH_V = `varying vec2 vU; void main(){ vU=uv*2.-1.; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const SCORCH_F = `${NOISE} uniform float time,alpha,seed; varying vec2 vU; void main(){ vec2 p=vU; float r=length(p), a=atan(p.y,p.x); float edge=.72+.2*n2(vec2(a*5.+seed*9.,seed))+.08*sin(a*11.+seed*3.);
 float spl=step(.8,n2(vec2(a*9.+seed,2.)))*step(r,1.)*smoothstep(1.,.85,r); if(r>edge&&spl<.5) discard; float swirl=n2(vec2(a*3.+r*6.-time*.6,r*4.+seed));
 vec3 c=vec3(.01,.008,.014); c=mix(c,vec3(.45,.45,.52),smoothstep(.03,.0,abs(r-edge*.97))*.6); c=mix(c,vec3(.22,.14,.35),smoothstep(.6,.9,swirl)*.4*(1.-r)); float al=alpha*.92; if(al<.02) discard; gl_FragColor=vec4(c,al); }`;
const RING_F = `uniform float k; varying vec2 vU; void main(){ float r=length(vU), d=abs(r-.95)/(.05+.04*(1.-k)); if(d>1.) discard; float a=(1.-d)*(1.-k)*.8; gl_FragColor=vec4(vec3(.55,.52,.7)*a,a); }`;
const WARN_F = `uniform float time,k; varying vec2 vU; void main(){ float r=length(vU); if(r>1.) discard; float edge=1.-smoothstep(0.,.05,abs(r-.95)), ticks=step(.6,fract(atan(vU.y,vU.x)*4.+time*.9))*step(.82,r)*step(r,.9);
 float a=(edge*.9+ticks*.5+step(r,.93)*.08)*k; gl_FragColor=vec4(mix(vec3(.4,.3,.6),vec3(.85,.85,.95),edge)*a,a); }`;
const ASH_V = `attribute vec4 aA; varying float vA; void main(){ vA=aA.w; vec4 mv=viewMatrix*vec4(aA.xyz,1.); gl_PointSize=clamp(70./-mv.z,1.,7.); gl_Position=projectionMatrix*mv; }`;
const ASH_F = `varying float vA; void main(){ vec2 p=gl_PointCoord*2.-1.; float d=dot(p,p); if(d>1.||vA<.02) discard; gl_FragColor=vec4(vec3(.45,.42,.5),vA*(1.-d)); }`;

function tongueGeo(T, bases) { const N = 10, P = [], B = [], U = [], F = [], I = []; let o = 0;
  for (const b of bases) { for (let j = 0; j <= N; j++) for (let k = 0; k < 2; k++) { P.push(...b.p); B.push(...b.p); U.push(k, j / N); F.push(b.len, b.w, b.seed, b.ph); } for (let j = 0; j < N; j++) { const a = o + j * 2; I.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } o += (N + 1) * 2; }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setAttribute('aBase', new T.Float32BufferAttribute(B, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(U, 2)); g.setAttribute('aF', new T.Float32BufferAttribute(F, 4)); g.setIndex(I); return g; }
const R3 = i => { const s = Math.sin(i * 12.9898 + 4.1) * 43758.5453; return s - Math.floor(s); };
function bases(kind) { const out = []; const add = (p, len, w, s) => out.push({ p, len, w, seed: R3(s), ph: R3(s * 3.1) });
  if (kind === 'small') { for (let i = 0; i < 11; i++) { const a = i / 11 * 6.283, r = .18 + .1 * R3(i); add([Math.cos(a) * r, -.1 + .2 * R3(i + 9), Math.sin(a) * r], .7 + .8 * R3(i + 3), .22 + .1 * R3(i + 5), i); } add([0, 0, 0], 1.7, .34, 50); add([.05, .05, 0], 2, .1, 61); }
  else if (kind === 'big') { for (let i = 0; i < 30; i++) { const a = i / 30 * 6.283 * 2.3, r = .3 + 1.3 * R3(i); add([Math.cos(a) * r, -1.3 + 1.9 * R3(i + 9) * (.5 + .5 * R3(i + 13)), Math.sin(a) * r] /* base irregular: sem corte reto embaixo */, 2.4 + 3.4 * R3(i + 3), .6 + .3 * R3(i + 5), i + 100); } for (let i = 0; i < 4; i++) add([R3(i) - .5, .3, R3(i + 1) - .5], 6 + 2 * R3(i + 7), .14, i + 300); }
  else if (kind === 'fieldS') { for (let i = 0; i < 14; i++) { const a = R3(i) * 6.283, r = Math.sqrt(R3(i + 20)) * 1.35; add([Math.cos(a) * r, 0, Math.sin(a) * r], .5 + 1.3 * R3(i + 3) * (1 - r / 2), .26 + .1 * R3(i + 5), i + 400); } }
  else if (kind === 'fieldB') { for (let i = 0; i < 40; i++) { const a = R3(i) * 6.283, r = Math.sqrt(R3(i + 20)) * 5; add([Math.cos(a) * r, 0, Math.sin(a) * r], 1.6 + 4.6 * R3(i + 3) * (1 - r / 7), .55 + .3 * R3(i + 5), i + 500); } for (let i = 0; i < 6; i++) add([(R3(i) - .5) * 4, 0, (R3(i + 3) - .5) * 4], 7 + 2 * R3(i), .12, i + 700); }
  else if (kind === 'auraW') { for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283, y = .2 + 1.2 * R3(i); add([Math.cos(a) * .32, y, Math.sin(a) * .32], .45 + .4 * R3(i + 3), .1, i + 800); } }
  else if (kind === 'auraS') { for (let i = 0; i < 20; i++) { const a = i / 20 * 6.283 * 2, y = .05 + 1.6 * R3(i); add([Math.cos(a) * .36, y, Math.sin(a) * .36], .8 + .9 * R3(i + 3), .16, i + 900); } add([0, 1.5, 0], 1.6, .2, 999); }
  return out; }

export function createBlackFlameVFX(T, scene) {
  const root = new T.Group(); root.name = 'ZarkhaelLuaTenebrosa'; scene.add(root); const geos = [], mats = [], uTime = { value: 0 };
  const mat = o => { const m = new T.ShaderMaterial({ toneMapped: false, fog: false, ...o, uniforms: { time: uTime, ...(o.uniforms || {}) } }); mats.push(m); return m; };
  const G = {}; for (const k of ['small', 'big', 'fieldS', 'fieldB', 'auraW', 'auraS']) { G[k] = tongueGeo(T, bases(k)); geos.push(G[k]); }
  const flame = (geoKey, ro = 4) => { const u = { alpha: { value: 1 }, grow: { value: 1 }, lenMul: { value: 1 }, widthMul: { value: 1 }, flow: { value: new T.Vector3() }, groundY: { value: -1e9 } };
    const m = new T.Mesh(G[geoKey], mat({ vertexShader: FL_V, fragmentShader: FL_F, transparent: true, depthWrite: false, side: T.DoubleSide, uniforms: u })); m.frustumCulled = false; m.renderOrder = ro; m.visible = false; m.userData.u = u; root.add(m); return m; };
  /* lua */
  const moonU = { show: { value: 0 } }, moonG = new T.PlaneGeometry(2, 2); geos.push(moonG);
  const moon = new T.Mesh(moonG, mat({ vertexShader: MOON_V, fragmentShader: MOON_F, transparent: true, depthWrite: false, uniforms: moonU })); moon.frustumCulled = false; moon.visible = false; moon.renderOrder = 3; root.add(moon); let moonPlaced = false;
  /* pools */
  const NS = BF.shots, shotsF = Array.from({ length: NS + 1 }, () => flame('big', 5)), handF = flame('small', 6), chargeF = flame('big', 6); /* as 10 menores usam a forma da antiga colossal; a última é a colossal 3× */
  const NF = BF.maxFields, fieldF = Array.from({ length: NF + 1 }, (_, i) => flame(i === NF ? 'fieldB' : 'fieldS', 3));
  const scorchG = new T.PlaneGeometry(2, 2).rotateX(-Math.PI / 2); geos.push(scorchG);
  const scorch = Array.from({ length: NF + 1 }, (_, i) => { const u = { alpha: { value: 0 }, seed: { value: i * .37 } }; const m = new T.Mesh(scorchG, mat({ vertexShader: SCORCH_V, fragmentShader: SCORCH_F, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, uniforms: u })); m.renderOrder = 2; m.frustumCulled = false; m.visible = false; m.userData.u = u; root.add(m); return m; });
  const ringG = new T.PlaneGeometry(2, 2).rotateX(-Math.PI / 2); geos.push(ringG);
  const rings = Array.from({ length: 4 }, () => { const u = { k: { value: 0 } }; const m = new T.Mesh(ringG, mat({ vertexShader: SCORCH_V, fragmentShader: RING_F, transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: u })); m.frustumCulled = false; m.visible = false; m.userData.u = u; m.renderOrder = 5; root.add(m); return m; });
  const warnU = { k: { value: 0 } }, warn = new T.Mesh(ringG, mat({ vertexShader: SCORCH_V, fragmentShader: WARN_F, transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: warnU })); warn.visible = false; warn.frustumCulled = false; warn.renderOrder = 5; root.add(warn);
  const burstF = Array.from({ length: 4 }, () => flame('big', 6));
  const auraW = flame('auraW', 6), auraS = flame('auraS', 6);
  const AN = 260, ashA = new Float32Array(AN * 4), ashV = new Float32Array(AN * 3), ashG = new T.BufferGeometry(); ashG.setAttribute('position', new T.BufferAttribute(new Float32Array(AN * 3), 3)); ashG.setAttribute('aA', new T.BufferAttribute(ashA, 4).setUsage(T.DynamicDrawUsage)); geos.push(ashG);
  const ash = new T.Points(ashG, mat({ vertexShader: ASH_V, fragmentShader: ASH_F, transparent: true, depthWrite: false })); ash.frustumCulled = false; root.add(ash); let ashI = 0;
  const emit = (x, y, z, n, spread) => { for (let k = 0; k < n; k++) { const i = ashI++ % AN; ashA.set([x + (R3(i + k) - .5) * spread, y + R3(i * 2) * spread * .5, z + (R3(i * 3 + k) - .5) * spread, .9], i * 4); ashV.set([(R3(i * 5) - .5) * .8, .8 + 1.4 * R3(i * 7), (R3(i * 11) - .5) * .8], i * 3); } };
  let time = 0, ashT = 0; const V = new T.Vector3(), W = new T.Vector3(), cam = new T.Vector3();
  const nearFade = (x, y, z, s) => .25 + .75 * sm((Math.hypot(x - cam.x, y - cam.y, z - cam.z) - 1.2 * s) / (3 * s)); /* chama gigante perto da câmera fica translúcida: o combate continua legível */
  const setFlame = (m, x, y, z, s, alpha, grow, flow, gy) => { m.visible = alpha > .01; if (!m.visible) return; m.position.set(x, y, z); m.scale.setScalar(s); const u = m.userData.u; u.alpha.value = alpha; u.grow.value = grow; u.flow.value.copy(flow); u.groundY.value = gy; };
  return {
    root, get moonPos() { return moon.visible ? moon.position : null; },
    /** ctx {camera, hero:{x,y,z}, boss:{x,y,z,yaw}, hand:{x,y,z}, low, arena:{x,z,r}} */
    update(seq, hz, ctx, dt) {
      time += dt; uTime.value = time; cam.copy(ctx.camera.position); const st = seq && seq.st, H = ctx.hero, low = !!ctx.low;
      for (const m of [...shotsF, handF, chargeF, ...burstF, ...rings, warn]) m.visible = false;
      // ---- lua: posição fixa no alto, escolhida no início; estática e ameaçadora (não segue o herói) ----
      const showMoon = st && !st.done && st.moon > .001; moon.visible = !!showMoon;
      if (showMoon) { if (!moonPlaced) { moonPlaced = true; const B = ctx.boss, A = ctx.arena || { x: B.x, z: B.z, r: 30 }; let dx = B.x - H.x, dz = B.z - H.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l; /* atrás do bispo visto do herói, alta e distante */
          moon.position.set(A.x + dx * 34, (ctx.groundY ?? B.y) + 15, A.z + dz * 34); moon.scale.set(8.6, 10.8, 1); /* alta, dentro do anel de cogumelos, oval como na referência */ V.set(H.x, (ctx.groundY ?? B.y) + 4, H.z); moon.lookAt(V); moon.updateMatrixWorld(); }
        moonU.show.value = Math.min(1, st.moon * 1.05); }
      else if (!st || st.done) moonPlaced = false;
      if (st && !st.done) {
        const hand = ctx.hand, gyB = ctx.groundY ?? ctx.boss.y;
        // energia na mão (antecipação de cada chama) e a carga da colossal
        let wu = 0; for (let i = 0; i < NS; i++) if (st.fired <= i) { wu = Math.max(wu, seq.windup(i)); break; }
        if (!st.aborted && wu > .02 && st.fired < NS) setFlame(handF, hand.x, hand.y, hand.z, .35 + .75 * wu, wu, wu, V.set(0, .2, 0), -1e9);
        const fc = st.phase === 'final_charge' ? seq.windup(NS) : 0; /* carga da colossal 3× maior, erguida acima do bispo */
        if (!st.aborted && fc > 0) { const yy = hand.y + 3.2 * sm(fc / .4); setFlame(chargeF, hand.x, yy, hand.z, (.2 + .85 * sm((fc - .1) / .6) + .15 * sm((fc - .7) / .3)) * 3, Math.min(1, fc * 4), sm(fc / .9), V.set(0, .3, 0), gyB); if (fc > .1 && Math.random() < .5) emit(hand.x, yy, hand.z, 3, 6 * fc); }
        // projéteis: a chama arrasta as línguas para trás do movimento
        [...st.shots, st.final].forEach(s => { if (!s) return; const m = shotsF[s.i]; if (s.state === 'fly') { const n = s.path.length, a = s.path[Math.max(0, n - 3)]; V.set(a[0] - s.x, a[1] - s.y, a[2] - s.z).multiplyScalar(s.big ? .35 : .5); setFlame(m, s.x, s.y, s.z, s.big ? BF.bigScale : BF.smallScale, nearFade(s.x, s.y, s.z, s.big ? BF.bigScale : BF.smallScale), 1, V, gyB); /* nunca atravessa o chão */ if (R3(time * 60 + s.i) > .6) emit(s.x, s.y, s.z, s.big ? 3 : 1, s.big ? 4.5 : 1.5); }
          else if (s.state === 'impact') { const k = s.it / (s.big ? 1.4 : .7); /* contato → compressão curta → ruptura que cresce → anel */
            const bf = burstF[s.big ? 3 : s.i % 3], g = s.big ? (k < .06 ? .3 : .3 + .7 * sm((k - .06) / .35)) : sm(k / .25), ks = s.kind === 'hero' ? (s.big ? .26 : .45) : 1; /* no corpo do herói a explosão é menor: não cega a câmera */ setFlame(bf, s.ix, s.iy + (s.big ? .2 : .1), s.iz, (s.big ? 4.8 : 1.6) * (1 + .4 * g) * ks, (1 - sm((k - .6) / .4)) * nearFade(s.ix, s.iy, s.iz, (s.big ? 4.8 : 1.6) * ks), g, V.set(0, .1, 0), s.iy - .02);
            const ri = rings[s.big ? 3 : s.i % 3]; ri.visible = true; ri.position.set(s.ix, s.iy + .06, s.iz); ri.scale.setScalar((s.big ? 4 : 1.4) + (s.big ? 22 : 6) * sm(k / .7)); ri.userData.u.k.value = clamp01(k / .8); } });
        // aviso no chão da colossal (durante o voo): onde ela vai cair
        if (st.final && st.final.state === 'fly') { warn.visible = true; warn.position.set(st.final.target[0], st.final.target[1] + .05, st.final.target[2]); warn.scale.setScalar(BF.fieldBigR * .9); warnU.k.value = Math.min(1, st.final.ft / .2); }
      }
      // ---- manchas no chão (persistem depois da habilidade) ----
      let si = 0, bi = NF; const fs = hz ? hz.st.fields : []; for (const m of fieldF) m.visible = false; for (const sc of scorch) sc.visible = false;
      fs.forEach((f, j) => { const m = f.big ? fieldF[bi] : fieldF[Math.min(NF - 1, si++)]; const life = f.t, k = life < .3 ? sm(life / .3) : life > f.dur ? 1 - sm((life - f.dur) / .6) : 1, flick = 1 + .05 * Math.sin(time * 3 + f.id);
        setFlame(m, f.x, f.y + .02, f.z, (f.big ? f.r / 5.5 : 1.1 * f.r / 1.6) * flick, k, k * (f.big ? 1 : .95), V.set(0, 0, 0), f.y - .01);
        const sc = scorch[f.big ? NF : Math.min(NF - 1, j)]; sc.visible = true; sc.position.set(f.x, f.y + .03, f.z); sc.scale.setScalar(f.r * 1.05); sc.userData.u.alpha.value = k; if (R3(time * 30 + f.id) > (f.big ? .3 : .75)) emit(f.x, f.y + .3, f.z, 1, f.r); });
      // ---- aura no corpo do herói (segue o corpo) ----
      const b = hz && hz.st.burn; auraW.visible = auraS.visible = false;
      if (b && H) { const fade = Math.min(1, b.left / .4); if (b.tier === 'strong') setFlame(auraS, H.x, H.y, H.z, 1, .95 * fade, fade, V.set(0, .1, 0), -1e9); else setFlame(auraW, H.x, H.y, H.z, 1, .9 * fade, fade, V.set(0, .1, 0), -1e9); if (R3(time * 40) > .5) emit(H.x, H.y + 1, H.z, 1, .7); }
      // ---- cinzas ----
      ashT += dt; for (let i = 0; i < AN; i++) { const a = ashA[i * 4 + 3]; if (a <= 0) continue; ashA[i * 4] += ashV[i * 3] * dt; ashA[i * 4 + 1] += ashV[i * 3 + 1] * dt; ashA[i * 4 + 2] += ashV[i * 3 + 2] * dt; ashA[i * 4 + 3] = Math.max(0, a - dt * .7); }
      ashG.attributes.aA.needsUpdate = true; root.visible = true;
    },
    clear() { for (const m of root.children) m.visible = false; ashA.fill(0); moonPlaced = false; },
    dispose() { scene.remove(root); for (const g of geos) g.dispose(); for (const m of mats) m.dispose(); }
  };
}
