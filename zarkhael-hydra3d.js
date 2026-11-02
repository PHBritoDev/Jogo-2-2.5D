/**
 * BISPO 3 (ZAR'KHAEL) — SKILL 1: HIDRA DO JUÍZO.
 *
 * Um relógio só para lógica, pose e VFX (createHydraJudgment = lógica pura e testável; hydraPose = pose pura;
 * createHydraVFX = desenho):
 *   circle  0–2,4 s  o selo vermelho/preto/osso se DESENHA no chão: aro em pinceladas, disco claro do centro para
 *                    fora, olho-losango com contornos rubros, coroa de espinhos negros crescendo, crescentes e escorridos.
 *   emerge  1,6–4,6 s a Hidra sobe do selo (o que está abaixo do chão não existe): corpo, depois os três pescoços em S
 *                    e as cabeças se erguem uma a uma, com aura violeta e fumaça de chama nas cristas.
 *   charge  4,6–7,0 s cada cabeça abre a mandíbula e CONSTRÓI a sua esfera: nasce um núcleo, raios convergem, energia
 *                    começa a orbitar, camadas em espiral fecham, brilho e densidade sobem; fica estável um instante.
 *   fire    7,2 s +  cabeça 1, depois 2, depois 3 (0,55 s entre elas), cada uma com recuo; a mira é a posição prevista
 *                    do herói NO DISPARO (antecipação limitada) e depois fica travada.
 *   impact          explosão no ponto real (herói ou chão): clarão, cúpula rubro-magenta rasgada, onda de choque,
 *                    espinhos negros, rachadura, resíduos; dano uma vez por esfera, i-frames respeitados.
 *   dissolve        depois da 3ª, a Hidra se desfaz em pó violeta de baixo para cima e some.
 */
export const HYDRA_BUILD = '268-hydra-grounded';
export const HYDRA = {
  circleR: 8.5, circle: [0, 2.4], emerge: [1.6, 4.6], charge: [4.6, 7.0], fireAt: 7.2, fireGap: .55, orbSpeed: 22, lead: .15, leadCap: 2,
  orbR: .62, blastR: 2.8, dmg: 18, minHitGap: .3, life: 2.2, impactDur: 1.2, dissolveDelay: .45, dissolveDur: 1.6, headStagger: [0, .28, .52], rootGrounding: .45
};
const clamp01 = x => Math.max(0, Math.min(1, x)), sm = x => { x = clamp01(x); return x * x * (3 - 2 * x); }, eo = x => 1 - (1 - clamp01(x)) ** 3;

/** Pose pura da Hidra no referencial dela (frente = +f). Devolve, por cabeça, 6 pontos de controle do pescoço (mundo),
 *  posição/direção da cabeça, abertura da mandíbula e o quanto ela já se ergueu. */
export function hydraPose(st, i, out = {}) {
  const T = HYDRA, t = st.t, C = st.C, f = st.f, r = [f[1], -f[0]], gy = C.y; /* r = direita */
  const side = i - 1, em = sm((t - T.emerge[0] - .25 - i * .35) / 1.9), body = sm((t - T.emerge[0]) / 1.4);
  const ch = sm((t - T.charge[0]) / .8), fire = st.fired ? st.fired[i] : -1, rec = fire >= 0 ? Math.exp(-(t - fire) / .22) * Math.sin(clamp01((t - fire) / .5) * Math.PI) : 0;
  const dis = st.dissolve || 0, sag = sm(dis * 1.4) * 1.5, sink = -12 * (1 - sm((t - T.emerge[0]) / 2.6)); /* abaixo do selo até emergir: o chão recorta */
  const sw = Math.sin(t * 1.3 + i * 2.1), sw2 = Math.sin(t * .9 + i * 1.3 + 1);
  /* cabeças diferentes: esquerda mais baixa e aberta, central mais alta, direita intermediária, todas em S */
  const H = [6.6, 8.9, 7.4][i] * (.25 + .75 * em) - sag, lat = [-4.6, .3, 4.4][i], fwd = [2.2, 1.4, 2.6][i] - 1.1 * ch - 1.6 * rec;
  /* MOD 268: a base dos pescoços acompanha o corpo ao afundar suavemente no piso do selo. Cabeças, bocas e disparos não mudam. */
  const base = [C.x + r[0] * side * 1.3 - f[0] * .6, gy + (1.6 - T.rootGrounding) * body - 2.2 * (1 - body), C.z + r[1] * side * 1.3 - f[1] * .6];
  const head = [C.x + r[0] * (lat + .35 * sw) + f[0] * fwd, gy + H + .3 * sw2, C.z + r[1] * (lat + .35 * sw) + f[1] * fwd];
  const P = out.ctrl || (out.ctrl = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]]);
  for (let k = 0; k < 6; k++) { const u = k / 5, s = Math.sin(u * Math.PI * 1.25 + i * .7 + t * .8) * (1 - u) * .9; /* S-curve vivo */
    const lx = side * 1.3 + (lat - side * 1.3) * (u * u * (3 - 2 * u)) + s * (side ? -side : 1) + .25 * sw * u;
    const ly = (base[1] - gy) + (H - (base[1] - gy)) * Math.pow(u, .85) + Math.sin(u * Math.PI) * .9 * em - (k === 4 ? .5 : 0);
    const lf = -.6 + (fwd + .6) * u * u - Math.sin(u * Math.PI) * 1.2 * (1 - ch * .5);
    P[k][0] = C.x + r[0] * lx + f[0] * lf; P[k][1] = gy + ly + sink * (1 - .35 * u); P[k][2] = C.z + r[1] * lx + f[1] * lf; }
  head[1] += sink * .65; P[5][0] = head[0]; P[5][1] = head[1]; P[5][2] = head[2];
  /* a cabeça olha para o alvo (o herói) com a boca um pouco para baixo; no recuo, levanta */
  const tg = st.aim || [C.x + f[0] * 12, gy + 1, C.z + f[1] * 12]; let dx = tg[0] - head[0], dy = tg[1] - head[1] + 2 * rec, dz = tg[2] - head[2]; const dl = Math.hypot(dx, dy, dz) || 1;
  out.head = head; out.dir = [dx / dl, dy / dl, dz / dl]; out.emerged = em; out.jaw = (.25 + .65 * ch) * (1 - .6 * rec) * (1 - sm((t - (fire >= 0 ? fire + .2 : 1e9)) / .6) * .5) * (1 - dis);
  out.mouth = [head[0] + out.dir[0] * 2.1, head[1] + out.dir[1] * 2.1 - .25, head[2] + out.dir[2] * 2.1];
  return out;
}

export function createHydraJudgment(opts = {}) {
  const T = { ...HYDRA, ...(opts.T || {}) }, ground = opts.ground || (() => 0), dmg = opts.dmg || T.dmg;
  const st = { phase: 'idle', t: 0, C: null, f: [0, 1], orbs: [], fired: [-1, -1, -1], aim: null, dissolve: 0, lastHit: -9, hits: 0, done: false, aborted: false, trauma: 0, kickT: 99, flash: 0 };
  const poses = [{}, {}, {}];
  const api = {
    T, st, poses, get done() { return st.done; },
    get holdBoss() { return st.phase !== 'idle' && !st.done && st.t < T.emerge[1]; },
    /** boss {x,z,yaw?}; hero {x,z}; arena {x,z,r}. O selo nasce ao lado do bispo, virado para o herói, dentro da arena. */
    start(boss, hero, arena) {
      const hx = hero.x - boss.x, hz = hero.z - boss.z, hl = Math.hypot(hx, hz) || 1, fx = hx / hl, fz = hz / hl, rx = fz, rz = -fx;
      let cx = boss.x + rx * 4.2 - fx * 2.2, cz = boss.z + rz * 4.2 - fz * 2.2;
      if (arena) { const dx = cx - arena.x, dz = cz - arena.z, d = Math.hypot(dx, dz), lim = arena.r - T.circleR * .55; if (d > lim) { cx = arena.x + dx / d * lim; cz = arena.z + dz / d * lim; } }
      const ex = hero.x - cx, ez = hero.z - cz, el = Math.hypot(ex, ez) || 1;
      Object.assign(st, { phase: 'circle', t: 0, C: { x: cx, y: ground(cx, cz), z: cz }, f: [ex / el, ez / el], orbs: [0, 1, 2].map(i => ({ i, state: 'none', k: 0, x: 0, y: 0, z: 0 })), fired: [-1, -1, -1], aim: null, dissolve: 0, lastHit: -9, hits: 0, done: false, aborted: false, trauma: 0, kickT: 99, flash: 0, ended: false });
      return api;
    },
    abort() { if (st.done || st.phase === 'idle') return; st.aborted = true; for (const o of st.orbs) if (o.state !== 'impact') o.state = 'gone'; if (st.phase !== 'dissolve') { st.phase = 'dissolve'; st.dissolveAt = st.t; } },
    /** hero {x,y,z,vx,vz,iframes}. Eventos: phase, roar, orb_start, orb_ready, fire, impact{kind,hit}, hit, dissolve, end. */
    step(dt, hero) {
      const ev = []; if (st.done || st.phase === 'idle') return ev; const t0 = st.t; st.t += dt; const t = st.t;
      st.trauma = Math.max(0, st.trauma - dt / .9); st.kickT += dt; st.flash = Math.max(0, st.flash - dt * 6);
      const cross = a => t0 < a && t >= a, gy = Number.isFinite(hero.y) ? hero.y : ground(hero.x, hero.z);
      if (t0 === 0) ev.push({ type: 'phase', name: 'circle' });
      if (!st.aborted) {
        if (cross(T.emerge[0])) { st.phase = 'emerge'; ev.push({ type: 'phase', name: 'emerge' }); }
        for (let i = 0; i < 3; i++) if (cross(T.emerge[0] + 1.2 + i * .35)) ev.push({ type: 'roar', i });
        if (t > T.emerge[0] && t < T.emerge[1]) st.trauma = Math.max(st.trauma, .12 * sm((t - T.emerge[0]) / 1.5)); /* rumor do chão enquanto ela sobe */
        if (cross(T.charge[0])) { st.phase = 'charge'; ev.push({ type: 'phase', name: 'charge' }); }
      }
      st.aim = [hero.x, gy + .9, hero.z];
      for (let i = 0; i < 3; i++) hydraPose(st, i, poses[i]);
      for (const o of st.orbs) {
        const ps = poses[o.i], s0 = T.charge[0] + T.headStagger[o.i], s1 = T.charge[1] - .3 + T.headStagger[o.i] * .4;
        if (!st.aborted && o.state === 'none' && t >= s0) { o.state = 'build'; ev.push({ type: 'orb_start', i: o.i }); }
        if (o.state === 'build' || o.state === 'ready') { o.k = clamp01((t - s0) / (s1 - s0)); o.x = ps.mouth[0]; o.y = ps.mouth[1]; o.z = ps.mouth[2]; if (o.k >= 1 && o.state === 'build') { o.state = 'ready'; ev.push({ type: 'orb_ready', i: o.i }); } }
        const fa = T.fireAt + o.i * T.fireGap;
        if (!st.aborted && o.state === 'ready' && t >= fa && st.orbs.slice(0, o.i).every(p => p.state !== 'ready' && p.state !== 'build')) { /* em sequência: só depois da anterior */
          const sp = Math.hypot(hero.vx || 0, hero.vz || 0), d0 = Math.hypot(hero.x - o.x, hero.z - o.z), lead = Math.min(T.leadCap, sp * Math.min(T.lead, d0 / T.orbSpeed));
          const ax = hero.x + (sp > .1 ? hero.vx / sp : 0) * lead, az = hero.z + (sp > .1 ? hero.vz / sp : 0) * lead, ay = ground(ax, az) + .5;
          let dx = ax - o.x, dy = ay - o.y, dz = az - o.z; const l = Math.hypot(dx, dy, dz) || 1; dx /= l; dy /= l; dz /= l;
          Object.assign(o, { state: 'fly', ft: 0, vx: dx * T.orbSpeed, vy: dy * T.orbSpeed, vz: dz * T.orbSpeed, target: [ax, ay, az], path: [[o.x, o.y, o.z]] }); st.fired[o.i] = t; ev.push({ type: 'fire', i: o.i, x: o.x, y: o.y, z: o.z, target: o.target });
        }
        if (o.state === 'fly') { const px = o.x, py = o.y, pz = o.z; o.ft += dt; o.x += o.vx * dt; o.y += o.vy * dt; o.z += o.vz * dt; o.path.push([o.x, o.y, o.z]); if (o.path.length > 22) o.path.shift();
          let hit = false; if (!hero.iframes) { const sx = o.x - px, sy = o.y - py, sz = o.z - pz, L2 = sx * sx + sy * sy + sz * sz; let u = L2 > 1e-9 ? ((hero.x - px) * sx + (gy + .9 - py) * sy + (hero.z - pz) * sz) / L2 : 0; u = clamp01(u);
            const cx = px + sx * u, cy = py + sy * u, cz = pz + sz * u; if (Math.hypot(cx - hero.x, cz - hero.z) < .5 + T.orbR && cy > gy - .2 && cy < gy + 2) hit = true; }
          const g = ground(o.x, o.z);
          if (hit || o.y <= g + .1 || o.ft > T.life) { const ix = hit ? hero.x : o.x, iz = hit ? hero.z : o.z, iy = ground(ix, iz); Object.assign(o, { state: 'impact', it: 0, ix, iy, iz, kind: hit ? 'hero' : 'ground' });
            const d = Math.hypot(hero.x - ix, hero.z - iz), dmgHit = !hero.iframes && (hit || d <= T.blastR) && t - st.lastHit >= T.minHitGap;
            st.trauma = Math.min(1, st.trauma + .62); st.kickT = 0; st.flash = 1; ev.push({ type: 'impact', i: o.i, kind: o.kind, x: ix, y: iy, z: iz, hit: dmgHit, dist: d });
            if (dmgHit) { st.lastHit = t; st.hits++; ev.push({ type: 'hit', dmg, i: o.i }); } } }
        else if (o.state === 'impact') { o.it += dt; if (o.it > T.impactDur) o.state = 'gone'; }
      }
      const last = st.fired[2];
      if (!st.aborted && st.phase !== 'dissolve' && last >= 0 && t >= last + T.dissolveDelay) { st.phase = 'dissolve'; st.dissolveAt = t; ev.push({ type: 'dissolve' }); }
      if (st.phase === 'dissolve') { st.dissolve = clamp01((t - st.dissolveAt) / (st.aborted ? .5 : T.dissolveDur)); }
      if (st.phase === 'dissolve' && st.dissolve >= 1 && st.orbs.every(o => o.state === 'gone' || o.state === 'none' || o.state === 'build' || o.state === 'ready')) { st.done = true; st.phase = 'done'; ev.push({ type: 'end', hits: st.hits, aborted: st.aborted }); }
      return ev;
    },
    /** progresso de formação do selo (0..1) por camada: aro, disco, olho, coroa, crescentes. */
    circleK() { const k = clamp01(st.t / T.circle[1]); return { rim: sm(k / .3), disc: sm((k - .15) / .45), eye: sm((k - .3) / .4), crown: sm((k - .45) / .45), cres: sm((k - .6) / .4), pulse: sm((k - .85) / .15), fade: st.phase === 'dissolve' ? 1 - st.dissolve : 1 }; }
  };
  return api;
}

/* ============================== VFX ============================== */
const NOISE = `float h1(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h1(i),h1(i+vec2(1,0)),f.x),mix(h1(i+vec2(0,1)),h1(i+vec2(1,1)),f.x),f.y);}
float n3(vec3 p){ return n2(p.xz+p.y*1.7)*.6+n2(p.yx*1.3-p.z)*.4; }`;
/* Selo (referência A): aro rubro/negro em pinceladas, disco claro com grão, coroa de espinhos negros, olho-losango
   com contornos rubros, crescentes laterais e inferior com orbe, escorridos. Tudo revelado por camadas. */
const SEAL_V = `varying vec2 vU; void main(){ vU=uv*2.-1.; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const SEAL_F = `${NOISE} uniform float time,rim,disc,eye,crown,cres,pulse,fade; varying vec2 vU;
float tri(vec2 p,float x0,float w,float y0,float h){ float u=(p.y-y0)/h; if(u<0.||u>1.) return 1.; return abs(p.x-x0)-w*(1.-u); }
void main(){ vec2 p=vU; float r=length(p), a=atan(p.y,p.x), an=fract(a/6.2832+.25); if(r>1.04) discard;
 float br=n2(vec2(an*90.,r*8.)), br2=n2(vec2(an*24.,r*30.+3.));
 // aro em pinceladas, desenhado por duas varreduras opostas
 float sweep=step(min(an,1.-an)*2.,rim*1.02); float rimBand=smoothstep(.07,.0,abs(r-.95+.02*br2))*sweep; float rimDark=smoothstep(.12,.0,abs(r-.88))*sweep*step(.35,br);
 // disco claro do centro para fora
 float dsc=step(r,.87)*step(r,disc*.9+.02*br); vec3 bone=mix(vec3(.62,.56,.48),vec3(.86,.8,.7),n2(p*40.))*(.85+.15*br); bone=mix(bone,vec3(.55,.06,.05),step(.86,n2(p*55.+7.))*.6);
 vec3 col=vec3(0.); float al=0.;
 if(dsc>0.){ col=bone; al=.92; float vig=smoothstep(.55,.87,r); col=mix(col,vec3(.05,.01,.01),vig*(.55+.45*br)); }
 // coroa de espinhos negros crescendo para cima (+y)
 float cr=1.; for(int i=0;i<7;i++){ float fi=float(i)-3.; float x0=fi*.115, h=(.62-.07*abs(fi))*crown, w=.045+.01*(3.-abs(fi)); cr=min(cr,tri(p+vec2((n2(vec2(p.y*12.,fi))-.5)*.02,0.),x0,w,.02,max(h,.001))); }
 float spikes=smoothstep(.006,.0,cr)*step(.001,crown);
 // olho-losango: preto com três contornos rubros e o centro rubro
 float dia=abs(p.x)/.62+abs(p.y+.02)/.2; float eyeK=eye; float inEye=step(dia,eyeK);
 float rings=0.; for(int i=0;i<3;i++){ float rr=.95-float(i)*.22; rings=max(rings,smoothstep(.035,.0,abs(dia-rr*eyeK))); }
 float core=step(abs(p.x)/.12+abs(p.y+.02)/.1,eyeK);
 // crescentes laterais (lâminas) e o inferior com orbe
 float cl=1.; for(int s=0;s<2;s++){ float sg=s==0?-1.:1.; vec2 q=vec2(p.x*sg-.62,p.y+.05); float c1=length(q)-.26, c2=length(q-vec2(.1,.04))-.24; cl=min(cl,max(c1,-c2)); }
 vec2 qb=vec2(p.x,p.y+.58); float cb=max(length(qb)-.24,-(length(qb-vec2(0.,.1))-.22)), orb=length(vec2(p.x,p.y+.43))-.06;
 float cresM=smoothstep(.01,.0,min(cl,cb))*cres, orbM=smoothstep(.01,.0,abs(orb)-.012)*cres;
 float blackM=max(max(spikes,inEye*(1.-rings)),max(cresM,orbM)); col=mix(col,vec3(.02,0.,0.),blackM*max(dsc,.0+step(.001,blackM))); al=max(al,blackM);
 vec3 red=vec3(.85,.05,.05)*(1.+.6*pulse*(.5+.5*sin(time*5.)));
 col=mix(col,red,max(rings*step(.001,eyeK),core)); al=max(al,max(rings*step(.001,eyeK),core));
 col=mix(col,mix(vec3(.05,0.,0.),red,step(.45,br)),max(rimBand,rimDark)); al=max(al,max(rimBand,rimDark)*.95);
 col+=red*.35*pulse*smoothstep(.6,1.,1.-abs(r-.9)*6.); al*=fade; if(al<.02) discard; gl_FragColor=vec4(col,al); }`;
/* Pescoço GPU: tubo deformado por 6 pontos de controle (Catmull-Rom). Material orgânico: dorso negro-violeta, placas do
   ventre em chevron cinza-violeta, veias violeta incandescentes, aura no contorno; some abaixo do chão; dissolve em pó. */
const NECK_V = `uniform vec3 uC[6]; uniform vec3 uFwd; uniform float rBase,rTop,auraS; attribute float aT; attribute float aA; varying vec3 vN; varying vec3 vW; varying vec2 vP; varying float vT;
vec3 cr(vec3 p0,vec3 p1,vec3 p2,vec3 p3,float u){ return .5*((2.*p1)+(-p0+p2)*u+(2.*p0-5.*p1+4.*p2-p3)*u*u+(-p0+3.*p1-3.*p2+p3)*u*u*u); }
vec3 sp(float t){ float s=clamp(t,0.,1.)*5.; int i=int(min(floor(s),4.)); float u=s-float(i); vec3 p0=uC[max(i-1,0)],p1=uC[i],p2=uC[min(i+1,5)],p3=uC[min(i+2,5)]; return cr(p0,p1,p2,p3,u); }
void main(){ vT=aT; vec3 P=sp(aT), Tg=normalize(sp(aT+.01)-sp(aT-.01)); vec3 N=normalize(cross(Tg,uFwd)); if(length(cross(Tg,uFwd))<.05) N=normalize(cross(Tg,vec3(1.,0.,0.))); vec3 B=normalize(cross(N,Tg));
 float r=mix(rBase,rTop,pow(aT,.7))*(1.+.12*sin(aT*30.))*(aT>.94?1.-(aT-.94)*6.:1.); vec3 dir=N*cos(aA)+B*sin(aA); dir-=B*max(0.,sin(aA))*.18; /* ventre um pouco achatado */
 vec3 w=P+dir*r*auraS; vW=w; vN=dir; vP=vec2(aA,aT); gl_Position=projectionMatrix*viewMatrix*vec4(w,1.); }`;
const SKIN_F = `${NOISE} uniform float time,dissolve,groundY,aura; varying vec3 vN; varying vec3 vW; varying vec2 vP; varying float vT;
void main(){ if(vW.y<groundY) discard; float dn=n3(vW*1.6); if(dn<dissolve*1.15-.05) discard;
 vec3 n=normalize(vN), v=normalize(cameraPosition-vW); float f=1.-abs(dot(n,v)), l=max(0.,dot(n,normalize(vec3(.3,.9,.2))))*.6+.4;
 float belly=smoothstep(.2,.9,sin(vP.x)); float chev=step(.5,fract(vP.y*26.+abs(cos(vP.x))*.8)); vec3 c=mix(vec3(.045,.02,.075),mix(vec3(.2,.16,.28),vec3(.3,.25,.4),chev),belly)*l;
 float vein=smoothstep(.73,.8,n2(vec2(vP.x*2.+vP.y*9.,vP.y*14.-time*.25)))*(1.-belly*.7); c+=vec3(.62,.14,1.)*vein*1.1;
 c+=vec3(.5,.18,.95)*pow(f,3.)*.75; float edge=smoothstep(dissolve*1.15-.05+.08,dissolve*1.15-.05,dn)*step(.001,dissolve); c=mix(c,vec3(.85,.5,1.),edge);
 gl_FragColor=vec4(c,1.); }`;
const AURA_F = `${NOISE} uniform float time,dissolve,groundY,aura; varying vec3 vN; varying vec3 vW; varying vec2 vP; varying float vT;
void main(){ if(vW.y<groundY) discard; vec3 n=normalize(vN), v=normalize(cameraPosition-vW); float f=1.-abs(dot(n,v)); float wav=n2(vec2(vP.x*3.,vP.y*8.-time*1.6));
 float a=pow(f,2.)*(.35+.65*wav)*aura*(1.-dissolve)*.45; if(a<.02) discard; gl_FragColor=vec4(vec3(.45,.12,.95)*a,a); }`;
const HEAD_V = `varying vec3 vN; varying vec3 vW; varying vec3 vL; void main(){ vL=position; vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }`;
const HEAD_F = `${NOISE} uniform float time,dissolve,groundY,kind; varying vec3 vN; varying vec3 vW; varying vec3 vL;
void main(){ if(vW.y<groundY) discard; float dn=n3(vW*1.6); if(dn<dissolve*1.15-.05) discard;
 vec3 n=normalize(vN), v=normalize(cameraPosition-vW); float f=1.-abs(dot(n,v)), l=max(0.,dot(n,normalize(vec3(.3,.9,.2))))*.65+.35; vec3 c;
 if(kind<.5){ c=vec3(.05,.025,.085)*l; float vein=smoothstep(.84,.88,n2(vec2(vL.x*9.+vL.z*4.,vL.z*10.-time*.3))); c+=vec3(.6,.15,1.)*vein*.9; c+=vec3(.5,.18,.95)*pow(f,3.)*.7; }
 else if(kind<1.5){ c=mix(vec3(.82,.78,.92),vec3(1.,.95,1.),f)*(.75+.25*l); } /* dentes: claros, estilizados */
 else if(kind<2.5){ c=vec3(1.,.35,.95)*(1.4+.3*sin(time*7.)); } /* olhos magenta */
 else { c=mix(vec3(.25,.02,.35),vec3(.95,.4,1.),pow(1.-f,2.)); } /* interior da boca: brilho violeta */
 float edge=smoothstep(dissolve*1.15+.03,dissolve*1.15-.05,dn)*step(.001,dissolve); c=mix(c,vec3(.85,.5,1.),edge); gl_FragColor=vec4(c,1.); }`;
/* chamas violeta das cristas: línguas que sobem no eixo do mundo, presas à cabeça (aditivas) */
const WISP_V = `uniform float time; attribute vec3 aBase; attribute vec4 aF; varying vec2 vU; varying vec4 vF; void main(){ vU=uv; vF=aF; vec4 wb=modelMatrix*vec4(aBase,1.); float sc=length(modelMatrix[1].xyz), h=uv.y, L=aF.x*sc, W=aF.y*sc;
 vec3 up=vec3(0.,1.,0.), tc=normalize(cameraPosition-wb.xyz), side=normalize(cross(up,tc)+vec3(1e-4,0.,1e-4)); float t=time*(1.4+.6*aF.w), sw=(sin(h*3.4-t*2.+aF.z*6.)*.3+sin(h*7.-t*3.+aF.z*9.)*.1)*pow(h,1.5)*L;
 gl_Position=projectionMatrix*viewMatrix*vec4(wb.xyz+up*h*L+side*((uv.x*2.-1.)*W+sw),1.); }`;
const WISP_F = `${NOISE} uniform float time,dissolve,alpha; varying vec2 vU; varying vec4 vF; void main(){ float h=vU.y, x=vU.x*2.-1., t=time*(1.4+.6*vF.w), n=n2(vec2(x*2.+vF.z*9.,h*3.5-t*2.3));
 float xc=(n-.5)*.4*h, hw=pow(1.-h,1.2)*(.6+.4*smoothstep(0.,.15,h))*(.8+.3*n)+.01, d=abs(x-xc)/hw; if(d>1.) discard; float a=(1.-d*d)*(1.-h*.5)*alpha*(1.-dissolve);
 vec3 c=mix(vec3(.55,.12,1.),vec3(.95,.7,1.),(1.-d)*(1.-h)); gl_FragColor=vec4(c*a,a); }`;
/* esfera (referência B): núcleo, camadas em espiral magenta/rubro, fitas orbitando, fragmentos negros */
const ORB_V = `varying vec3 vN; varying vec3 vW; varying vec3 vL; void main(){ vL=position; vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }`;
const SWIRL_F = `${NOISE} uniform float time,k,spin,layer; varying vec3 vN; varying vec3 vW; varying vec3 vL;
void main(){ vec3 n=normalize(vL); float a=atan(n.z,n.x), y=n.y; float arms=sin(a*3.-y*5.-time*spin*4.+log(1.2-abs(y))*3.)*.5+.5; float tear=n2(vec2(a*4.+time*spin,y*5.));
 float cov=mix(.95,.25,k); if(arms<cov-.2*tear) discard; vec3 v=normalize(cameraPosition-vW); float f=abs(dot(normalize(vN),v));
 vec3 c=mix(vec3(.55,.02,.12),vec3(1.,.15,.45),arms); c=mix(c,vec3(1.,.7,.9),pow(arms,6.)*.8); c=mix(c,vec3(.04,0.,.02),smoothstep(.55,.95,tear)*.7*(1.-layer)); c*=.7+.5*(1.-f);
 gl_FragColor=vec4(c,1.); }`;
const CORE_F = `${NOISE} uniform float time,k; varying vec3 vN; varying vec3 vW; varying vec3 vL;
void main(){ vec3 v=normalize(cameraPosition-vW); float f=abs(dot(normalize(vN),v)); float n=n2(vec2(atan(vL.z,vL.x)*3.+time*3.,vL.y*4.-time*2.));
 vec3 c=mix(vec3(.08,0.,.05),vec3(1.,.45,.85),pow(f,1.8)*(.7+.3*n)); c=mix(c,vec3(1.,.92,1.),pow(f,6.)*k); gl_FragColor=vec4(c*1.2,1.); }`;
const BAND_V = `attribute vec4 aB; varying vec2 vU; varying vec4 vB; void main(){ vU=uv; vB=aB; gl_Position=projectionMatrix*viewMatrix*modelMatrix*instanceMatrix*vec4(position,1.); }`;
const BAND_F = `${NOISE} uniform float time; varying vec2 vU; varying vec4 vB; void main(){ float head=fract(vB.z+time*vB.y), d=fract(head-vU.x); if(d>vB.x) discard; float tl=d/vB.x, e=abs(vU.y*2.-1.);
 if(e>.85-tl*.5+(n2(vec2(vU.x*30.,time*3.))-.5)*.2) discard; vec3 c=mix(vec3(1.,.75,.95),vec3(.9,.08,.35),tl); c=mix(c,vec3(.05,0.,.03),step(.5,vB.w)*.85*(1.-exp(-e*e*20.)));
 float a=(1.-tl)*vB.w*0.+(1.-tl*.7); gl_FragColor=vec4(c,a); }`;
const GLOW_V = `attribute vec4 aG; varying vec4 vG; varying vec2 vU; void main(){ vG=aG; vU=uv; vec4 c=viewMatrix*modelMatrix*instanceMatrix*vec4(0.,0.,0.,1.); vG.a*=smoothstep(1.,4.,-c.z); c.xy+=position.xy*length(instanceMatrix[0].xyz); gl_Position=projectionMatrix*c; }`;
const GLOW_F = `varying vec4 vG; varying vec2 vU; void main(){ vec2 p=vU*2.-1.; float d=length(p); float a=exp(-d*d*5.)*vG.a; vec3 c=mix(vG.rgb,vec3(1.,.95,1.),exp(-d*d*18.)); gl_FragColor=vec4(c*a,a); }`;
const SPIKE_V = `attribute vec4 aT; varying vec4 vT; varying vec2 vU; void main(){ vT=aT; vU=uv; gl_Position=projectionMatrix*viewMatrix*modelMatrix*instanceMatrix*vec4(position,1.); }`;
const SPIKE_F = `${NOISE} varying vec4 vT; varying vec2 vU; void main(){ float d=abs(vU.x)+(n2(vec2(vU.y*9.+vT.w*7.,vU.x*2.))-.5)*.35; if(d>.95||vU.y>vT.y) discard; vec3 c=vT.z>.5?(d<.3?vec3(1.,.6,.9):vec3(.85,.08,.35)):(d<.2&&vU.y<.4?vec3(1.,.35,.75):vec3(.03,0.,.02)); gl_FragColor=vec4(c*vT.x,1.); }`;
const DOME_V = `attribute vec2 aI; varying vec2 vI; varying vec3 vP; varying vec3 vN; varying vec3 vW; void main(){ vI=aI; vP=position; vec4 w=modelMatrix*instanceMatrix*vec4(position,1.); vW=w.xyz; vN=normalize(mat3(modelMatrix)*mat3(instanceMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }`;
const DOME_F = `${NOISE} uniform float time; varying vec2 vI; varying vec3 vP; varying vec3 vN; varying vec3 vW;
void main(){ float k=vI.x, lat=clamp(vP.y,0.,1.), ang=atan(vP.z,vP.x), f=abs(dot(normalize(vN),normalize(cameraPosition-vW))); float n=n2(vec2(ang*6.+vI.y*13.,lat*4.-k*3.)), st=n2(vec2(ang*30.,lat*2.-time*4.));
 if(n<.3+.65*smoothstep(.3,1.,k)||lat>.96-.4*st*k) discard; /* cúpula de energia escura rasgada, núcleo rosa-claro rente ao chão */
 float veins=smoothstep(.62,.7,st)*(1.-smoothstep(.7,.8,st)); vec3 c=vec3(.05,0.,.03)*(.6+.4*f); c+=vec3(1.,.15,.5)*veins*(1.-k)*1.2; c=mix(c,vec3(1.,.8,.95),smoothstep(.18,0.,lat)*(1.-k)*.9);
 gl_FragColor=vec4(c,.92); }`;
const RING_F = `uniform float k; varying vec2 vU; void main(){ vec2 p=vU*2.-1.; float r=length(p), d=abs(r-.95)/(.04+.03*(1.-k)); if(d>1.) discard; float a=(1.-d)*(1.-k); gl_FragColor=vec4(vec3(1.,.45,.75)*a,a); }`;
const PLANE_V = `varying vec2 vU; void main(){ vU=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const CRACK_F = `${NOISE} uniform float k; varying vec2 vU; void main(){ vec2 p=vU*2.-1.; float r=length(p), a=atan(p.y,p.x); if(r>1.) discard; float cr=0.; for(int i=0;i<3;i++){ float fi=float(i); cr=max(cr,1.-smoothstep(0.,.07+.03*fi,abs(sin(a*(7.+fi*4.)+n2(vec2(r*5.+fi,fi))*3.))*r)); }
 float a2=(cr*(1.-r*.7))*(1.-k); if(a2<.03) discard; vec3 c=mix(vec3(.05,0.,.02),vec3(1.,.3,.6),cr*(1.-k*1.4)); gl_FragColor=vec4(c,a2); }`;
const RIB_V = `attribute vec2 aUv; attribute vec4 aK; varying vec2 vU; varying vec4 vK; void main(){ vU=aUv; vK=aK; gl_Position=projectionMatrix*viewMatrix*vec4(position,1.); }`;
const RIB_F = `${NOISE} uniform float time; varying vec2 vU; varying vec4 vK; void main(){ float e=abs(vU.y*2.-1.), n=n2(vec2(vU.x*8.-time*3.+vK.z*9.,vU.y*3.)); if(e>.6+.4*n) discard; float core=exp(-e*e*30.);
 vec3 c=vK.x<.5?mix(vec3(.55,.02,.2),vec3(1.,.8,.95),core):mix(vec3(.3,.06,.6),vec3(.9,.7,1.),core); float a=vK.y*(1.-e*.5); if(a<.02) discard; gl_FragColor=vec4(c*a,a); }`;
const DUST_V = `attribute vec4 aD; uniform float time,dissolve; varying float vA; void main(){ float t=fract(aD.w+time*.0)*0.+dissolve; vec3 p=aD.xyz+vec3(sin(aD.w*40.+time)*.6,t*4.*(.5+aD.w),cos(aD.w*31.+time)*.6)*t; vA=(1.-t)*step(.02,dissolve)*step(fract(aD.w*7.),dissolve*1.3); vec4 mv=viewMatrix*vec4(p,1.); gl_PointSize=clamp(90./-mv.z,1.,9.); gl_Position=projectionMatrix*mv; }`;
const DUST_F = `varying float vA; void main(){ vec2 p=gl_PointCoord*2.-1.; float d=dot(p,p); if(d>1.||vA<.02) discard; gl_FragColor=vec4(vec3(.7,.4,1.)*vA*(1.-d),vA*(1.-d)); }`;

function spikeGeo(T) { const pos = [], uv = [], idx = [], N = 8; for (let j = 0; j <= N; j++) { const y = j / N, w = .5 * (1 - y) ** .8 * (j % 2 ? .6 : 1) + .01; pos.push(-w, y, 0, 0, y, 0, w, y, 0); uv.push(-1, y, 0, y, 1, y); if (j < N) { const a = j * 3, c = a + 3; idx.push(a, c, a + 1, a + 1, c, c + 1, a + 1, c + 1, a + 2, a + 2, c + 1, c + 2); } }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); return g; }
function bandGeo(T, seg = 48) { const pos = [], uv = [], idx = []; for (let i = 0; i <= seg; i++) { const u = i / seg, a = u * Math.PI * 2; for (let j = 0; j < 2; j++) { pos.push(Math.cos(a), j ? .5 : -.5, Math.sin(a)); uv.push(u, j); } if (i < seg) { const a0 = i * 2; idx.push(a0, a0 + 2, a0 + 1, a0 + 1, a0 + 2, a0 + 3); } }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); return g; }
function tubeGeo(T, segT = 44, segA = 14) { const pos = [], at = [], aa = [], idx = []; for (let i = 0; i <= segT; i++) for (let j = 0; j <= segA; j++) { pos.push(0, 0, 0); at.push(i / segT); aa.push(j / segA * Math.PI * 2); }
  for (let i = 0; i < segT; i++) for (let j = 0; j < segA; j++) { const a = i * (segA + 1) + j, b = a + segA + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('aT', new T.Float32BufferAttribute(at, 1)); g.setAttribute('aA', new T.Float32BufferAttribute(aa, 1)); g.setIndex(idx); return g; }
/** Cabeça de dragão-serpente (+Z = focinho): crânio em cunha com sobrancelhas e crista, mandíbula articulada, dentes nítidos. */
function headParts(T, variant) {
  const v = [{ w: 1, horns: 4, snout: 1.05 }, { w: 1.12, horns: 5, snout: 1.12 }, { w: .95, horns: 3, snout: 1 }][variant];
  const skull = new T.SphereGeometry(1, 28, 18), p = skull.attributes.position;
  for (let i = 0; i < p.count; i++) { let x = p.getX(i), y = p.getY(i), z = p.getZ(i); const zf = (z + 1) / 2; /* 0 trás .. 1 focinho */
    const taper = .95 - .55 * Math.pow(zf, 1.4); x *= .62 * v.w * taper; y = (y > 0 ? y * (.48 - .2 * zf) : y * .18) + .05; z = z * 1.15 * v.snout + .25;
    y += .14 * Math.exp(-((Math.abs(x) - .32) ** 2) / .01 - ((zf - .55) ** 2) / .03) * (y > 0 ? 1 : 0); /* sobrancelhas */
    if (zf > .85 && y > 0) y -= .05; p.setXYZ(i, x, y, z); }
  skull.computeVertexNormals();
  const jaw = new T.SphereGeometry(1, 22, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), q = jaw.attributes.position; /* metade de baixo, pivô na dobradiça (z=-.45) */
  for (let i = 0; i < q.count; i++) { let x = q.getX(i), y = q.getY(i), z = q.getZ(i); const zf = (z + 1) / 2, taper = .85 - .5 * Math.pow(zf, 1.3); x *= .5 * v.w * taper; y *= .2; z = z * 1.05 * v.snout + .7; q.setXYZ(i, x, y, z - .45 - .25); }
  jaw.computeVertexNormals();
  const teethU = [], teethL = []; const N = 9;
  for (const sd of [-1, 1]) for (let k = 0; k < N; k++) { const u = k / (N - 1), z = -.05 + u * 1.25 * v.snout, x = sd * (.34 * v.w * (1 - .55 * u) + .02), L = (k === N - 2 ? .32 : .12 + .08 * Math.sin(k * 1.7)) * (u > .2 ? 1 : .7);
    const c = new T.ConeGeometry(.035 + .02 * (k === N - 2), L, 5); c.rotateX(Math.PI); c.rotateZ(sd * .12); c.translate(x, .02 - L / 2, z + .25); teethU.push(c);
    const c2 = new T.ConeGeometry(.03 + .015 * (k === N - 3), L * .85, 5); c2.rotateZ(-sd * .12); c2.translate(x * .9, .04 + L * .42, z - .25 - .45 + .7 * 0 + .02); teethL.push(c2); }
  const horns = []; for (let k = 0; k < v.horns; k++) { const sd = k % 2 ? 1 : -1, lvl = Math.floor(k / 2), L = .9 - lvl * .2 + (k === v.horns - 1 && v.horns % 2 ? .3 : 0), c = new T.ConeGeometry(.08 - lvl * .015, L, 6); c.translate(0, L / 2, 0); c.rotateX(-1.95 + lvl * .25); c.rotateZ(sd * (.35 + lvl * .25) * (v.horns % 2 && k === v.horns - 1 ? 0 : 1)); c.translate(sd * (.18 + lvl * .1) * (v.horns % 2 && k === v.horns - 1 ? 0 : 1), .32 - lvl * .05, -.35 - lvl * .25); horns.push(c); }
  return { v, skull, jaw, teethU, teethL, horns };
}
function mergeGeos(T, list) { let n = 0; const parts = list.map(g => { g = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k); g.computeVertexNormals(); n += g.attributes.position.count; return g; });
  const P = new Float32Array(n * 3), N = new Float32Array(n * 3); let o = 0; for (const g of parts) { P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; g.dispose(); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(P, 3)); g.setAttribute('normal', new T.BufferAttribute(N, 3)); return g; }

export function createHydraVFX(T, scene) {
  const root = new T.Group(); root.name = 'ZarkhaelHidra'; root.visible = false; scene.add(root); const geos = [], mats = [], uTime = { value: 0 }, shared = { dissolve: { value: 0 }, groundY: { value: -1e9 }, aura: { value: 0 } };
  const V = () => new T.Vector3(), M = new T.Matrix4(), Q = new T.Quaternion(), P = V(), S = V(), D = V(), E = V(), X = V(), Y = V(), Z = V(), UP = new T.Vector3(0, 1, 0), cam = V();
  const mat = o => { const m = new T.ShaderMaterial({ toneMapped: false, fog: false, ...o, uniforms: { time: uTime, ...(o.uniforms || {}) } }); mats.push(m); return m; };
  const mesh = (g, m, ro = 0, parent = root) => { geos.push(g); const x = new T.Mesh(g, m); x.frustumCulled = false; x.renderOrder = ro; parent.add(x); return x; };
  const inst = (geo, m, n, attrs, ro = 0) => { const arrs = {}; for (const [k, sz] of attrs) { arrs[k] = new Float32Array(n * sz); geo.setAttribute(k, new T.InstancedBufferAttribute(arrs[k], sz).setUsage(T.DynamicDrawUsage)); } geos.push(geo); const x = new T.InstancedMesh(geo, m, n); x.frustumCulled = false; x.count = 0; x.renderOrder = ro; root.add(x); return { mesh: x, arrs, n: 0, max: n, attrs }; };
  const put = (I, vals) => { if (I.n >= I.max) return; I.mesh.setMatrixAt(I.n, M); let o = 0; for (const [k, sz] of I.attrs) { for (let j = 0; j < sz; j++) I.arrs[k][I.n * sz + j] = vals[o + j]; o += sz; } I.n++; };
  /* selo */
  const sealU = { rim: { value: 0 }, disc: { value: 0 }, eye: { value: 0 }, crown: { value: 0 }, cres: { value: 0 }, pulse: { value: 0 }, fade: { value: 1 } };
  const seal = mesh(new T.PlaneGeometry(2, 2).rotateX(-Math.PI / 2), mat({ vertexShader: SEAL_V, fragmentShader: SEAL_F, transparent: true, depthWrite: false, uniforms: sealU, polygonOffset: true, polygonOffsetFactor: -2 }), 1);
  /* corpo (monte de onde saem os pescoços) */
  const bodyG = new T.SphereGeometry(1, 30, 18), bp = bodyG.attributes.position; for (let i = 0; i < bp.count; i++) { const x = bp.getX(i), y = bp.getY(i), z = bp.getZ(i), n = 1 + .12 * Math.sin(x * 5 + z * 3) + .08 * Math.cos(z * 7); bp.setXYZ(i, x * n * 2.6, y * n * 1.6, z * n * 2.2); } bodyG.computeVertexNormals();
  const headU = k => mat({ vertexShader: HEAD_V, fragmentShader: HEAD_F, uniforms: { ...shared, kind: { value: k } } });
  const skinM = headU(0), toothM = headU(1), eyeM = headU(2), mouthM = headU(3); const body = mesh(bodyG, skinM, 1);
  /* pescoços (GPU) + aura */
  const necks = [0, 1, 2].map(i => { const ctrl = []; for (let k = 0; k < 6; k++) ctrl.push(V()); const u = { uC: { value: ctrl }, uFwd: { value: V() }, rBase: { value: [1.1, 1.2, 1.05][i] }, rTop: { value: [.55, .62, .52][i] }, auraS: { value: 1 } };
    const g = tubeGeo(T); const m = mesh(g, mat({ vertexShader: NECK_V, fragmentShader: SKIN_F, uniforms: { ...u, ...shared } }), 1);
    const am = mesh(g, mat({ vertexShader: NECK_V, fragmentShader: AURA_F, transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.BackSide, uniforms: { ...u, ...shared, auraS: { value: 1.3 } } }), 3); geos.pop(); return { u, m, am, ctrl }; });
  /* cabeças */
  const heads = [0, 1, 2].map(i => { const hp = headParts(T, i), g = new T.Group(); root.add(g); const sk = mesh(hp.skull, skinM, 1, g), jawPivot = new T.Group(); jawPivot.position.set(0, -.02, -.45 + .25); g.add(jawPivot);
    const jaw = mesh(hp.jaw, skinM, 1, jawPivot); jaw.position.set(0, 0, .45 - .25 + 0); const tU = mesh(mergeGeos(T, hp.teethU), toothM, 1, g), tL = mesh(mergeGeos(T, hp.teethL), toothM, 1, jawPivot); tL.position.copy(jaw.position);
    const hr = mesh(mergeGeos(T, hp.horns), skinM, 1, g); const mouth = mesh(new T.PlaneGeometry(.55 * hp.v.w, 1.2), mouthM, 1, g); mouth.rotation.x = -Math.PI / 2 + .25; mouth.position.set(0, -.08, .65);
    for (const sd of [-1, 1]) { const e = mesh(new T.SphereGeometry(.075, 10, 8), eyeM, 2, g); e.scale.set(1.6, .7, 1); e.position.set(sd * .27 * hp.v.w, .2, .62); }
    /* chamas violeta da crista */
    const B = [], U = [], F = [], I = [], NN = 10; let o = 0; for (let k = 0; k < 7; k++) { const b = [(k % 2 ? 1 : -1) * (.1 + .05 * k), .3 + .03 * k, -.25 - k * .14]; for (let j = 0; j <= NN; j++) for (let s = 0; s < 2; s++) { B.push(...b); U.push(s, j / NN); F.push(.7 + .5 * ((k * 7) % 5) / 5, .13, k * .37 + i, (k * .53) % 1); } for (let j = 0; j < NN; j++) { const a = o + j * 2; I.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } o += (NN + 1) * 2; }
    const wg = new T.BufferGeometry(); wg.setAttribute('position', new T.Float32BufferAttribute(B, 3)); wg.setAttribute('aBase', new T.Float32BufferAttribute(B, 3)); wg.setAttribute('uv', new T.Float32BufferAttribute(U, 2)); wg.setAttribute('aF', new T.Float32BufferAttribute(F, 4)); wg.setIndex(I);
    const wisps = mesh(wg, mat({ vertexShader: WISP_V, fragmentShader: WISP_F, transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, uniforms: { ...shared, alpha: { value: 1 } } }), 4, g);
    g.scale.setScalar([1.75, 1.95, 1.65][i]); /* cabeças grandes, legíveis no celular */ for (const x of [hp.skull, hp.jaw]) geos.push(x); return { g, jawPivot, wisps }; });
  /* esferas */
  const coreG = new T.SphereGeometry(1, 24, 16); geos.push(coreG);
  const orbs = [0, 1, 2].map(i => { const cU = { k: { value: 0 } }, core = new T.Mesh(coreG, mat({ vertexShader: ORB_V, fragmentShader: CORE_F, uniforms: cU })); const s1U = { k: { value: 0 }, spin: { value: 1 }, layer: { value: 0 } }, s2U = { k: { value: 0 }, spin: { value: -1.4 }, layer: { value: 1 } };
    const sh1 = new T.Mesh(coreG, mat({ vertexShader: ORB_V, fragmentShader: SWIRL_F, side: T.DoubleSide, uniforms: s1U })), sh2 = new T.Mesh(coreG, mat({ vertexShader: ORB_V, fragmentShader: SWIRL_F, side: T.DoubleSide, uniforms: s2U }));
    for (const x of [core, sh1, sh2]) { x.frustumCulled = false; x.visible = false; root.add(x); } return { core, sh1, sh2, cU, s1U, s2U }; });
  const bands = inst(bandGeo(T), mat({ vertexShader: BAND_V, fragmentShader: BAND_F, transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending }), 24, [['aB', 4]], 5);
  const glows = inst(new T.PlaneGeometry(1, 1), mat({ vertexShader: GLOW_V, fragmentShader: GLOW_F, transparent: true, depthWrite: false, blending: T.AdditiveBlending }), 24, [['aG', 4]], 7);
  const spikes = inst(spikeGeo(T), mat({ vertexShader: SPIKE_V, fragmentShader: SPIKE_F, side: T.DoubleSide }), 120, [['aT', 4]], 3);
  const shardG = new T.OctahedronGeometry(1, 0); shardG.scale(.5, 1, .4); const shardM = new T.MeshStandardMaterial({ color: 0x08020a, emissive: 0x5a0a30, emissiveIntensity: .8, roughness: .7, flatShading: true }); mats.push(shardM); geos.push(shardG);
  const shards = new T.InstancedMesh(shardG, shardM, 90); shards.frustumCulled = false; shards.count = 0; root.add(shards);
  const domes = inst(new T.SphereGeometry(1, 28, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat({ vertexShader: DOME_V, fragmentShader: DOME_F, side: T.DoubleSide, transparent: true, depthWrite: false }), 3, [['aI', 2]], 4);
  const ringM = [0, 1, 2].map(() => { const u = { k: { value: 0 } }; return { m: mesh(new T.PlaneGeometry(2, 2).rotateX(-Math.PI / 2), mat({ vertexShader: PLANE_V, fragmentShader: RING_F, transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: u }), 5), u }; });
  const crackM = [0, 1, 2].map(() => { const u = { k: { value: 0 } }; return { m: mesh(new T.PlaneGeometry(2, 2).rotateX(-Math.PI / 2), mat({ vertexShader: PLANE_V, fragmentShader: CRACK_F, transparent: true, depthWrite: false, uniforms: u, polygonOffset: true, polygonOffsetFactor: -3 }), 2), u }; });
  /* rastros das esferas */
  const MAXQ = 160, rp = new Float32Array(MAXQ * 12), ru = new Float32Array(MAXQ * 8), rk = new Float32Array(MAXQ * 16), ri = new Uint32Array(MAXQ * 6); for (let i = 0; i < MAXQ; i++) ri.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 2, i * 4 + 1, i * 4 + 3], i * 6);
  const rg = new T.BufferGeometry(); rg.setAttribute('position', new T.BufferAttribute(rp, 3).setUsage(T.DynamicDrawUsage)); rg.setAttribute('aUv', new T.BufferAttribute(ru, 2).setUsage(T.DynamicDrawUsage)); rg.setAttribute('aK', new T.BufferAttribute(rk, 4).setUsage(T.DynamicDrawUsage)); rg.setIndex(new T.BufferAttribute(ri, 1));
  mesh(rg, mat({ vertexShader: RIB_V, fragmentShader: RIB_F, transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide }), 5); let q = 0; const sa = V(), sb = V(), A0 = V(), B0 = V();
  function strip(path, width, kind) { const n = path.length; for (let i = 1; i < n && q < MAXQ; i++) { A0.fromArray(path[i - 1]); B0.fromArray(path[i]); const u0 = (i - 1) / (n - 1), u1 = i / (n - 1); D.subVectors(B0, A0); E.subVectors(A0, cam); sa.crossVectors(D, E); let l = sa.length(); if (l < 1e-6) continue; sa.multiplyScalar(width * u0 / l); E.subVectors(B0, cam); sb.crossVectors(D, E); l = sb.length(); sb.multiplyScalar(width * u1 / l);
      rp.set([A0.x - sa.x, A0.y - sa.y, A0.z - sa.z, A0.x + sa.x, A0.y + sa.y, A0.z + sa.z, B0.x - sb.x, B0.y - sb.y, B0.z - sb.z, B0.x + sb.x, B0.y + sb.y, B0.z + sb.z], q * 12); ru.set([u0, 0, u0, 1, u1, 0, u1, 1], q * 8); for (let k = 0; k < 4; k++) rk.set([kind, k < 2 ? u0 : u1, i * .37, 1], q * 16 + k * 4); q++; } }
  /* pó da dissolução */
  const DN = 900, dA = new Float32Array(DN * 4); const dustG = new T.BufferGeometry(); dustG.setAttribute('position', new T.BufferAttribute(new Float32Array(DN * 3), 3)); dustG.setAttribute('aD', new T.BufferAttribute(dA, 4).setUsage(T.DynamicDrawUsage)); geos.push(dustG);
  const dust = new T.Points(dustG, mat({ vertexShader: DUST_V, fragmentShader: DUST_F, transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: { dissolve: shared.dissolve } })); dust.frustumCulled = false; root.add(dust); let dustSeeded = false;
  let time = 0; const R3 = i => { const s = Math.sin(i * 12.9898 + 4.1) * 43758.5453; return s - Math.floor(s); };
  return {
    root,
    /** ctx: {camera, low} */
    update(hj, ctx, dt) {
      const st = hj && hj.st; time += dt; uTime.value = time; cam.copy(ctx.camera.position); const low = !!ctx.low; q = 0;
      for (const I of [bands, glows, spikes, domes]) I.n = 0; shards.count = 0;
      root.visible = !!(st && !st.done && st.C); if (!root.visible) { dustSeeded = false; return; }
      const C = st.C, T2 = hj.T, t = st.t, ck = hj.circleK();
      shared.groundY.value = C.y - .02; shared.dissolve.value = st.dissolve; shared.aura.value = sm((t - T2.emerge[0] - .8) / 1.2);
      // selo
      seal.position.set(C.x, C.y + .05, C.z); seal.scale.setScalar(T2.circleR); seal.rotation.y = Math.atan2(st.f[0], st.f[1]); /* coroa para o lado oposto ao herói, crescente com orbe perto dele (como a referência) */ for (const k of ['rim', 'disc', 'eye', 'crown', 'cres', 'pulse', 'fade']) sealU[k].value = ck[k];
      P.set(C.x, C.y + .6, C.z); Q.identity(); S.setScalar(7 * ck.pulse * ck.fade + 2 * ck.rim * ck.fade); M.compose(P, Q, S); put(glows, [.9, .08, .1, .5 * ck.fade]);
      // corpo e pescoços
      const em0 = sm((t - T2.emerge[0]) / 1.4); /* MOD 268: corpo encosta no selo; a raiz do pescoço usa o mesmo abatimento. */ body.position.set(C.x - st.f[0] * .6, C.y - 2.4 + (2.4 - T2.rootGrounding) * em0, C.z - st.f[1] * .6); body.rotation.y = Math.atan2(st.f[0], st.f[1]);
      for (let i = 0; i < 3; i++) { const ps = hj.poses[i], N = necks[i]; for (let k = 0; k < 6; k++) N.ctrl[k].fromArray(ps.ctrl[k]); N.u.uFwd.value.set(st.f[0], 0, st.f[1]);
        // cabeça: posição no fim do pescoço, olhando para a direção da pose (com yaw/pitch)
        const H = heads[i]; H.g.position.fromArray(ps.head); D.fromArray(ps.dir); Z.copy(D); X.crossVectors(UP, Z).normalize(); Y.crossVectors(Z, X); M.makeBasis(X, Y, Z); H.g.quaternion.setFromRotationMatrix(M); H.jawPivot.rotation.x = ps.jaw * .75;
        H.g.visible = ps.emerged > .02 || st.phase === 'dissolve'; }
      // esferas: núcleo → órbita → camadas → brilho; voo com rastro; impacto
      for (const o of st.orbs) { const O = orbs[o.i]; const vis = o.state === 'build' || o.state === 'ready' || o.state === 'fly'; for (const x of [O.core, O.sh1, O.sh2]) x.visible = vis;
        if (vis) { const k = o.state === 'build' ? o.k : 1, kc = sm(k / .3), ko = sm((k - .2) / .4), ks = sm((k - .5) / .4), kb = sm((k - .8) / .2), R = T2.orbR * (.35 + .65 * kc) * (o.state === 'fly' ? 1.1 : 1);
          O.core.position.set(o.x, o.y, o.z); O.core.scale.setScalar(R * .55); O.cU.k.value = kb; O.sh1.position.copy(O.core.position); O.sh1.scale.setScalar(R * (.8 + .2 * ks)); O.s1U.k.value = ks; O.sh1.visible = ks > .02;
          O.sh2.position.copy(O.core.position); O.sh2.scale.setScalar(R * (1.05 + .25 * (1 - ks))); O.s2U.k.value = ks * .85; O.sh2.visible = ks > .1; O.sh1.rotation.set(time * .7, time * 1.3, 0); O.sh2.rotation.set(-time * .5, -time * 1.7, .4);
          for (let b = 0; b < 3; b++) { if (ko < .02) break; Y.set(Math.sin(b * 2.1 + o.i), 1, Math.cos(b * 1.7)).normalize(); Q.setFromUnitVectors(UP, Y); P.set(o.x, o.y, o.z); S.set(R * (1.5 + .3 * b) * (2 - ko), R * .3, R * (1.5 + .3 * b) * (2 - ko)); M.compose(P, Q, S); put(bands, [.55, (1.2 + .5 * b) * (b % 2 ? -1 : 1), b * .3 + o.i * .1, b === 1 ? 1 : 0]); }
          P.set(o.x, o.y, o.z); Q.identity(); S.setScalar(R * (2.2 + 2 * kb) * (o.state === 'fly' ? 1.2 : 1)); M.compose(P, Q, S); put(glows, [1, .2, .55, .45 + .5 * kb]);
          if (o.state === 'build' && k < .85) { const n = low ? 8 : 14; for (let r = 0; r < n; r++) { const a = r / n * 6.283 + R3(r + o.i * 7) * .4, el = (R3(r * 3 + o.i) - .5) * 2, dist = R * (4.5 - 3.5 * ((time * 1.6 + R3(r)) % 1)); /* raios que convergem para o núcleo */
              D.set(-Math.cos(a) * Math.cos(el), -Math.sin(el), -Math.sin(a) * Math.cos(el)); E.set(cam.x - o.x, cam.y - o.y, cam.z - o.z); X.crossVectors(D, E).normalize(); Z.crossVectors(X, D); M.makeBasis(X, D, Z); Q.setFromRotationMatrix(M); P.set(o.x - D.x * dist, o.y - D.y * dist, o.z - D.z * dist); S.set(R * .3, R * 1.2, 1); M.compose(P, Q, S); put(spikes, [1, 1, 1, r * .1]); } }
          for (let s = 0; s < (low ? 4 : 7) && ko > .1; s++) { const a = time * (1.5 + s * .2) + s * .9, rr = R * (1.6 + .4 * Math.sin(s)); P.set(o.x + Math.cos(a) * rr, o.y + Math.sin(a * 1.3 + s) * rr * .5, o.z + Math.sin(a) * rr); Q.setFromAxisAngle(UP, a * 2); S.setScalar(R * .12 * ko); M.compose(P, Q, S); shards.setMatrixAt(shards.count++, M); }
          if (o.state === 'fly' && o.path && o.path.length > 2) strip(o.path, T2.orbR * .9, 0); }
        const ri = ringM[o.i], ci = crackM[o.i]; ri.m.visible = ci.m.visible = o.state === 'impact';
        if (o.state === 'impact') { const k = o.it / T2.impactDur, e1 = eo(k / .3), ks = o.kind === 'hero' ? .6 : 1; /* clarão, cúpula, onda, espinhos, rachadura, estilhaços; menor no corpo do herói para não cobrir a câmera */
          P.set(o.ix, o.iy - .05, o.iz); Q.identity(); S.set(T2.blastR * (.5 + .6 * e1) * ks, T2.blastR * (.45 + .5 * e1) * ks, T2.blastR * (.5 + .6 * e1) * ks); M.compose(P, Q, S); put(domes, [k, o.i * .37]);
          if (k < .25) { P.set(o.ix, o.iy + .8, o.iz); S.setScalar(T2.blastR * 3 * (1 - k / .25) + 1); M.compose(P, Q, S); put(glows, [1, .5, .8, 1 - k / .25]); }
          ri.m.position.set(o.ix, o.iy + .08, o.iz); ri.m.scale.setScalar(1 + T2.blastR * 3.2 * eo(k / .6)); ri.u.k.value = clamp01(k / .6); ci.m.position.set(o.ix, o.iy + .03, o.iz); ci.m.scale.setScalar(T2.blastR * 1.3); ci.u.k.value = sm((k - .5) / .5);
          const n = low ? 9 : 16; for (let r = 0; r < n && k < .8; r++) { const a = r / n * 6.283 + o.i, el = .25 + .9 * R3(r * 5 + o.i), len = T2.blastR * (.7 + .8 * R3(r * 3)) * eo(k / .2) * (1 - sm((k - .45) / .35));
            D.set(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el)); E.set(cam.x - o.ix, cam.y - o.iy, cam.z - o.iz); X.crossVectors(D, E).normalize(); Z.crossVectors(X, D); M.makeBasis(X, D, Z); Q.setFromRotationMatrix(M); P.set(o.ix + D.x * .4, o.iy + .1, o.iz + D.z * .4); S.set(.45, len, 1); M.compose(P, Q, S); put(spikes, [1, 1, 0, r * .13 + o.i]); }
          const tt = o.it; for (let s = 0; s < (low ? 8 : 16); s++) { const a = s * .79 + o.i, v = 4 + 4 * R3(s), vy = 4 + 6 * R3(s * 2), y = vy * tt - 9.8 * tt * tt; if (y < -.2) continue; P.set(o.ix + Math.cos(a) * v * tt, o.iy + .2 + y, o.iz + Math.sin(a) * v * tt); Q.setFromAxisAngle(UP, tt * 9 + s); S.setScalar(.1 + .07 * (s % 3)); M.compose(P, Q, S); shards.setMatrixAt(shards.count++, M); } } }
      // aura no corpo e brilhos nos olhos/bocas
      for (let i = 0; i < 3; i++) { const ps = hj.poses[i]; if (ps.emerged < .05) continue; P.fromArray(ps.mouth); Q.identity(); S.setScalar(1.2 * ps.jaw * (1 - st.dissolve)); M.compose(P, Q, S); put(glows, [.6, .15, 1, .5]); }
      // pó: semeado nos pontos do corpo quando começa a se desfazer
      if (st.phase === 'dissolve' && !dustSeeded) { dustSeeded = true; for (let k = 0; k < DN; k++) { const i = k % 3, ps = hj.poses[i], u = R3(k * 1.3); const c = ps.ctrl, s = Math.min(4, Math.floor(u * 5)), w = u * 5 - s; const a = c[s], b = c[s + 1]; dA.set([a[0] + (b[0] - a[0]) * w + (R3(k) - .5) * .9, a[1] + (b[1] - a[1]) * w + (R3(k * 2) - .5) * .9, a[2] + (b[2] - a[2]) * w + (R3(k * 3) - .5) * .9, R3(k * 7)], k * 4); } dustG.attributes.aD.needsUpdate = true; }
      dust.visible = st.phase === 'dissolve';
      rg.setDrawRange(0, q * 6); rg.attributes.position.needsUpdate = rg.attributes.aUv.needsUpdate = rg.attributes.aK.needsUpdate = true;
      for (const I of [bands, glows, spikes, domes]) { I.mesh.count = I.n; I.mesh.instanceMatrix.needsUpdate = true; for (const [k] of I.attrs) I.mesh.geometry.attributes[k].needsUpdate = true; }
      shards.instanceMatrix.needsUpdate = true;
    },
    clear() { root.visible = false; dustSeeded = false; },
    dispose() { scene.remove(root); for (const g of geos) g.dispose(); for (const m of mats) m.dispose(); }
  };
}
