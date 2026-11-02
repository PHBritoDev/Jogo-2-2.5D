/**
 * MOD 261 — VORGAZHEK (Bispo 2), ESPECIAL DE ESPADA: ECLIPSE DA DÍVIDA.
 *
 * Três etapas no MESMO relógio (lógica pura `createEclipseSword`, testável em node; VFX em `createEclipseVFX`):
 *  A) charge 3,2 s — no primeiro quadro um eclipse anular escuro surge no céu, composto atrás/acima do bispo pela
 *     direção câmera→bispo (moonPlacement); a EspadaBispo2.glb real aparece na mão direita, erguida, e uma tempestade
 *     violeta-negra com NÚCLEO branco-lilás cresce em 4 estágios por todo o corpo e pela arma (fitas, chicotes negros,
 *     feixe acima da ponta, coroa de farpas no chão).
 *  B) release ≤ 2,0 s — antecipação curta (0,42 s), golpe para baixo e um corte crescente enorme (núcleo branco, corpo
 *     violeta, manto negro rasgado) que voa rápido até o ponto previsto do herói NO LANÇAMENTO; depois o rumo é fixo.
 *     Colisão por varredura (sem túnel), um único acerto, i-frames respeitados. Errou: bate no chão (ou no cenário) no
 *     ponto real da trajetória.
 *  C) impact 2,4 s — colapso esférico em espiral (faixas largas girando à volta de um centro brilhante), no ponto real do
 *     choque, sem dano contínuo. Depois tudo se desfaz (fade 0,45 s) e o cenário volta ao que era.
 */
export const ECLIPSE_SWORD_BUILD = '261-eclipse-sword';
export const ECLIPSE = { charge: 3.2, windup: .42, releaseMax: 2.0, impact: 2.4, fade: .45, abortFade: .3, speed: 30, lead: .3, leadCap: 2.5, hitHalfW: 1.25, hitHalfH: 1.15, heroH: 1.8, dmg: 22, maxRange: 46, stages: [.6, 1.5, 2.5], swordScale: 1.05, grip: -.3, moonDist: 45, moonAng: .135 };

const clamp01 = x => Math.max(0, Math.min(1, x));
/**
 * Composição do eclipse: a partir da câmera, mira um ponto acima do bispo (sobre a ponta da espada erguida), sobe um
 * pouco mais e desloca para o lado da espada, para a lua ficar logo atrás/acima do ombro sem tapar a silhueta.
 * Devolve posição no mundo e raio (tamanho angular fixo), sempre acima do chão.
 */
export function moonPlacement(cam, boss, o = {}) {
  const E = { ...ECLIPSE, ...o }, side = o.side || 1, ground = o.ground ?? boss.y;
  let tx = boss.x - cam.x, ty = (boss.y + (o.aimH ?? 4.6)) - cam.y, tz = boss.z - cam.z; const hl = Math.hypot(tx, tz) || 1, hx = tx / hl, hz = tz / hl;
  let elev = Math.atan2(ty, hl) + (o.up ?? .12), yaw = Math.atan2(hx, hz) - side * (o.lat ?? .14); // pitch acima do bispo, lateral para o lado da espada
  elev = Math.max(.12, Math.min(1.05, elev));
  const D = o.dist ?? Math.max(14, Math.min(E.moonDist, hl + 6)), /* logo além do bispo: entre ele e as construções do fundo, nunca escondida atrás delas */ c = Math.cos(elev), x = cam.x + Math.sin(yaw) * c * D, y = cam.y + Math.sin(elev) * D, z = cam.z + Math.cos(yaw) * c * D, r = Math.tan(E.moonAng) * D;
  return { x, y: Math.max(y, ground + r + 3), z, r, elev, yaw, dist: D };
}

/**
 * Pose dos braços (direções no referencial do bispo: [frente, cima, direita]) por cima do clipe: a espada é erguida
 * acima da cabeça na carga, sobe um pouco mais na antecipação e desce num corte para a frente. w = peso da camada.
 */
export function eclipseArms(st) {
  if (!st || st.phase === 'idle' || st.done) return null; const T = ECLIPSE, sm = x => { x = clamp01(x); return x * x * (3 - 2 * x); }, L = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
  const UP = { rua: [.12, 1, .22], rla: [.04, 1, .06], lua: [.35, -.15, -.9], lla: [.55, .2, -.75], lean: -.12 }, BACK = { rua: [-.3, 1, .18], rla: [-.35, .95, .08], lua: [.3, .1, -.9], lla: [.5, .4, -.7], lean: -.22 }, DOWN = { rua: [.9, -.35, .2], rla: [.95, -.45, .05], lua: [.4, -.6, -.6], lla: [.6, -.4, -.5], lean: .3 };
  const mix = (A, B, k) => ({ rua: L(A.rua, B.rua, k), rla: L(A.rla, B.rla, k), lua: L(A.lua, B.lua, k), lla: L(A.lla, B.lla, k), lean: A.lean + (B.lean - A.lean) * k });
  if (st.phase === 'charge') return { ...UP, w: sm(st.pt / .25), shake: st.pt > T.stages[2] ? .025 : 0 };
  if (st.phase === 'release') { const p = st.pt; if (p < T.windup - .12) return { ...mix(UP, BACK, sm(p / (T.windup - .12))), w: 1 }; if (p < T.windup + .1) return { ...mix(BACK, DOWN, sm((p - T.windup + .12) / .22)), w: 1 }; return { ...DOWN, w: 1 - sm((p - T.windup - .45) / .4) }; }
  return null;
}

export function createEclipseSword(opts = {}) {
  const T = { ...ECLIPSE, ...(opts.T || {}) }, ground = opts.ground || (() => 0), blocked = opts.blocked || (() => false), dmg = opts.dmg || T.dmg;
  const st = { phase: 'idle', t: 0, pt: 0, level: 0, stage: 0, released: false, slash: null, impact: null, hits: 0, done: false, aborted: false, moon: 0, aura: 0 };
  const api = {
    T, st,
    get done() { return st.done; },
    /** Bispo está canalizando/golpeando (fica parado de frente, sem outros golpes). */
    get holdBoss() { return st.phase === 'charge' || (st.phase === 'release' && st.pt < T.windup + .35); },
    start() { Object.assign(st, { phase: 'charge', t: 0, pt: 0, level: 0, stage: 1, released: false, slash: null, impact: null, hits: 0, done: false, aborted: false, moon: 1, aura: 0 }); return api; },
    abort() { if (st.done || st.aborted || st.phase === 'idle') return; st.aborted = true; st.phase = 'abort'; st.pt = 0; st.slash = null; },
    /** hero {x,y,z,vx,vz,iframes}; ctx {from:{x,y,z} (ponta da espada no lançamento), boss:{x,y,z}}. */
    step(dt, hero, ctx = {}) {
      const ev = []; if (st.done || st.phase === 'idle') return ev; st.t += dt; st.pt += dt;
      if (st.phase === 'charge') {
        if (st.t === dt) ev.push({ type: 'start' });
        st.level = clamp01(st.pt / T.charge); st.aura = st.level; const sg = 1 + T.stages.filter(s => st.pt >= s).length; if (sg !== st.stage) { st.stage = sg; ev.push({ type: 'stage', n: sg }); }
        if (st.pt >= T.charge) { st.phase = 'release'; st.pt = 0; ev.push({ type: 'swing' }); }
        return ev;
      }
      if (st.phase === 'release') {
        st.aura = st.released ? Math.max(0, 1 - (st.pt - T.windup) / .7) : 1;
        if (!st.released && st.pt >= T.windup) { // lança: mira na posição prevista do herói AGORA e trava
          st.released = true; const f = ctx.from || { x: ctx.boss?.x || 0, y: (ctx.boss?.y || 0) + 2.6, z: ctx.boss?.z || 0 };
          const sp = Math.hypot(hero.vx || 0, hero.vz || 0), dist0 = Math.hypot(hero.x - f.x, hero.z - f.z), lead = Math.min(T.leadCap, sp * Math.min(T.lead, dist0 / T.speed));
          const ax = hero.x + (sp > .1 ? hero.vx / sp : 0) * lead, az = hero.z + (sp > .1 ? hero.vz / sp : 0) * lead, ay = ground(ax, az);
          let dx = ax - f.x, dy = ay - f.y, dz = az - f.z; const l = Math.hypot(dx, dy, dz) || 1; dx /= l; dy /= l; dz /= l;
          st.slash = { x: f.x, y: f.y, z: f.z, dx, dy, dz, target: { x: ax, y: ay, z: az }, travelled: 0, path: [[f.x, f.y, f.z]] };
          ev.push({ type: 'release', x: f.x, y: f.y, z: f.z, dx, dy, dz, target: { x: ax, y: ay, z: az } });
        }
        const s = st.slash;
        if (s) {
          const px = s.x, py = s.y, pz = s.z, step = T.speed * dt; s.x += s.dx * step; s.y += s.dy * step; s.z += s.dz * step; s.travelled += step; s.path.push([s.x, s.y, s.z]); if (s.path.length > 24) s.path.shift();
          // varredura contra o herói: retângulo do corte (largura ±hitHalfW, altura ±hitHalfH) do quadro anterior ao atual
          let hit = null;
          if (!hero.iframes && !st.hits) { const hx = s.dx, hz = s.dz, hl = Math.hypot(hx, hz) || 1, fx = hx / hl, fz = hz / hl, rx = fz, rz = -fx, seg = Math.hypot(s.x - px, s.z - pz);
            const along = (hero.x - px) * fx + (hero.z - pz) * fz, lat = (hero.x - px) * rx + (hero.z - pz) * rz, gy = Number.isFinite(hero.y) ? hero.y : ground(hero.x, hero.z);
            if (along >= -.45 && along <= seg + .45 && Math.abs(lat) <= T.hitHalfW) { const u = seg > 1e-6 ? clamp01(along / seg) : 0, cy = py + (s.y - py) * u;
              if (cy - T.hitHalfH <= gy + T.heroH && cy + T.hitHalfH >= gy) hit = { x: hero.x - fx * .45, y: Math.max(gy + .3, Math.min(gy + 1.4, cy)), z: hero.z - fz * .45 }; } } /* frente do corpo, no lado de onde o corte veio */
          const g = ground(s.x, s.z);
          if (hit) { st.hits = 1; st.slash = null; st.impact = { ...hit, kind: 'hero', t: 0 }; ev.push({ type: 'hit', dmg, ...hit }, { type: 'impact', kind: 'hero', ...hit }); }
          else if (s.y <= g + .05) { const pg = ground(px, pz), k = clamp01((py - pg) / Math.max(1e-6, (py - pg) - (s.y - g))), ix = px + (s.x - px) * k, iz = pz + (s.z - pz) * k; st.slash = null; st.impact = { x: ix, y: ground(ix, iz), z: iz, kind: 'ground', t: 0 }; ev.push({ type: 'impact', kind: 'ground', x: ix, y: st.impact.y, z: iz }); }
          else if (blocked(s.x, s.z)) { st.slash = null; st.impact = { x: px, y: Math.max(ground(px, pz), py - 1), z: pz, kind: 'wall', t: 0 }; ev.push({ type: 'impact', kind: 'wall', ...st.impact }); }
          else if (s.travelled > T.maxRange || st.pt >= T.releaseMax) { const ix = s.x, iz = s.z; st.slash = null; st.impact = { x: ix, y: ground(ix, iz), z: iz, kind: 'ground', t: 0 }; ev.push({ type: 'impact', kind: 'ground', x: ix, y: st.impact.y, z: iz, late: true }); }
          if (st.impact) { st.phase = 'impact'; st.pt = 0; }
        }
        return ev;
      }
      if (st.phase === 'impact') { st.aura = 0; st.impact.t = st.pt; if (st.pt >= T.impact) { st.phase = 'fade'; st.pt = 0; } return ev; }
      if (st.phase === 'fade' || st.phase === 'abort') { const d = st.phase === 'fade' ? T.fade : T.abortFade; st.moon = 1 - clamp01(st.pt / d); st.aura *= Math.max(0, 1 - dt * 8); if (st.pt >= d) { st.done = true; st.moon = 0; st.aura = 0; st.impact = null; ev.push({ type: 'end', aborted: st.aborted, hits: st.hits }); } }
      return ev;
    }
  };
  return api;
}

/* ============================== VFX ============================== */
const NOISE = `float h1(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h1(i),h1(i+vec2(1,0)),f.x),mix(h1(i+vec2(0,1)),h1(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*n2(p);p*=2.03;a*=.5;}return s;}`;
/* Eclipse anular: halo branco-azulado por trás, nuvens escuras com bordas acesas, corpo escuro em crescente, interior claro. */
const MOON_V = `varying vec2 vU; void main(){ vU=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const MOON_F = `${NOISE} uniform float time,show,side; varying vec2 vU;
void main(){ vec2 p=(vU*2.-1.)*2.6; p.x*=side; float r=length(p), a=atan(p.y,p.x); vec2 o=vec2(-.13,.07); float r2=length(p-o);
 float k=smoothstep(0.,1.,show); float reveal=smoothstep(r-.25,r+.05,k*2.8); if(reveal<.01) discard;
 // nuvens escuras ao redor, com bordas acesas pela luz atrás do eclipse
 float cl=fbm(p*1.35+vec2(time*.03,0.)), cl2=fbm(p*2.6-vec2(0.,time*.05));
 float cloud=smoothstep(.42,.7,cl*.75+cl2*.35+(r-1.)*.08);
 vec3 halo=vec3(.75,.82,1.)*exp(-(r-1.)*1.7)*1.25; float rays=pow(max(0.,sin(a*13.+n2(vec2(a*3.,time*.2))*2.)),12.)*exp(-(r-1.)*.9)*.5;
 vec3 col=halo+vec3(.8,.85,1.)*rays; float al=clamp(exp(-(r-1.)*1.15)*1.15,0.,1.);
 col=mix(col,vec3(.05,.05,.08)+vec3(.85,.9,1.)*smoothstep(.55,.75,cl2)*exp(-(r-1.)*1.3)*.9,cloud*.85); al=max(al,cloud*smoothstep(2.6,1.6,r)*.9);
 // interior luminoso (nuvens claras vistas através do anel)
 if(r2<.84){ float ic=fbm(p*2.2+vec2(time*.02,1.)); col=mix(vec3(1.,1.,1.05),vec3(.55,.58,.7),smoothstep(.35,.75,ic)*.7)*(1.1-.25*r2); al=1.; }
 // corpo escuro do crescente (anel grosso de um lado, fino do outro) com aro de luz
 float ring=step(r,1.)*step(.84,r2); if(ring>.5){ col=vec3(.02,.02,.035)+vec3(.7,.75,1.)*smoothstep(.93,1.,r)*.55; al=1.; }
 // estrela na borda fina
 vec2 sp=p-vec2(-.92,.42); float star=exp(-length(sp)*9.)*1.6+exp(-abs(sp.y)*40.)*exp(-abs(sp.x)*2.5)*.6; col+=vec3(.95,.97,1.)*star; al=max(al,clamp(star,0.,1.));
 al*=reveal*smoothstep(2.6,2.1,r)*show; if(al<.01) discard; gl_FragColor=vec4(col,al); }`;
/* Fitas (aura, chicotes, feixe, rastro): uv=(ao longo, através), aK=(tipo, alfa, semente, brilho) */
const RIB_V = `attribute vec2 aUv; attribute vec4 aK; varying vec2 vU; varying vec4 vK; void main(){ vU=aUv; vK=aK; gl_Position=projectionMatrix*viewMatrix*vec4(position,1.); }`;
const RIB_F = `${NOISE} uniform float time; varying vec2 vU; varying vec4 vK;
void main(){ float e=abs(vU.y*2.-1.), kind=vK.x, s=vK.z; float n=n2(vec2(vU.x*7.-time*2.6+s*13.,vU.y*3.+s*5.)), n3=n2(vec2(vU.x*19.-time*4.+s*7.,vU.y*6.));
 float edge=.62+.38*n-.18*n3; if(e>edge) discard; float core=exp(-e*e*(kind>1.5?14.:22.)), c2=1.-smoothstep(.0,edge,e);
 vec3 c;
 if(kind<.5){ c=mix(vec3(.31,.05,.78),vec3(.66,.29,1.),c2); c=mix(c,vec3(.98,.93,1.),core*(.55+.45*vK.w)); c=mix(vec3(.03,.008,.06),c,smoothstep(edge,edge-.22,e)); } // aura: borda negra recortada, corpo violeta, núcleo branco-lilás
 else if(kind<1.5){ c=vec3(.03,.008,.06); c=mix(c,vec3(.62,.25,1.),exp(-e*e*60.)*.9*(.5+.5*n)); } // chicote negro com fio violeta
 else if(kind<2.5){ c=mix(vec3(.45,.12,1.),vec3(1.,.97,1.),core); c=mix(vec3(.08,.01,.16),c,smoothstep(edge,edge-.25,e)); } // feixe
 else { c=mix(vec3(.04,.01,.08),vec3(.55,.2,1.),c2*.8); c=mix(c,vec3(.95,.9,1.),core*.8); } // rastro do corte
 float a=vK.y*(.85+.15*n); if(a<.02) discard; gl_FragColor=vec4(c,a); }`;
/* Corte crescente: uv=(posição no arco -1..1, profundidade 0 frente..1 trás), aS = lâmina (0..2) */
const SLASH_V = `attribute float aS; varying vec2 vU; varying float vS; void main(){ vU=uv; vS=aS; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const SLASH_F = `${NOISE} uniform float time,alpha; varying vec2 vU; varying float vS;
void main(){ float u=vU.x, v=vU.y, n=n2(vec2(u*6.+time*1.5,v*4.-time*6.)), n3=n2(vec2(u*17.,v*9.-time*9.));
 float tail=.55+.45*n-(abs(u)*.35)+n3*.15; if(v>tail) discard; float tip=1.-smoothstep(.75,1.,abs(u)); if(n3*.6+tip<.35) discard;
 vec3 c=mix(vec3(1.,.97,1.),vec3(.78,.45,1.),smoothstep(.02,.16,v)); c=mix(c,vec3(.42,.08,.95),smoothstep(.14,.38,v)); c=mix(c,vec3(.03,.005,.06),smoothstep(tail-.3,tail-.05,v));
 c+=vec3(.6,.3,1.)*smoothstep(.85,.97,n3)*(1.-v)*.6; float a=alpha*(vS==1.?1.:.8); gl_FragColor=vec4(c,a); }`;
/* Faixas do colapso giratório (instanciadas): aB=(arco, velocidade, semente, tipo), aP=(progresso, raio, -, -) */
const BAND_V = `attribute vec4 aB; attribute vec4 aP; varying vec2 vU; varying vec4 vB; varying vec4 vP; varying vec3 vN; varying vec3 vW;
void main(){ vU=uv; vB=aB; vP=aP; vec4 w=modelMatrix*instanceMatrix*vec4(position,1.); vW=w.xyz; vN=normalize(mat3(modelMatrix)*mat3(instanceMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }`;
const BAND_F = `${NOISE} uniform float time; varying vec2 vU; varying vec4 vB; varying vec4 vP; varying vec3 vN; varying vec3 vW;
void main(){ float cd=length(cameraPosition-vW); if(cd<1.4) discard; float k=vP.x, kind=vB.w; float head=fract(vB.z+time*vB.y), d=fract(head-vU.x); if(d>vB.x) discard; float tl=d/vB.x; // cauda atrás da cabeça
 float e=abs(vU.y*2.-1.), n=n2(vec2(vU.x*28.+vB.z*9.,vU.y*3.-time*2.)), cut=.75+.25*n-tl*.45; float dis=smoothstep(.78,1.,k); if(e>cut||n<dis*1.1) discard;
 vec3 c; float lead=1.-smoothstep(0.,.18,tl);
 if(kind<.5){ c=mix(vec3(.55,.2,1.),vec3(.25,.04,.6),tl); c=mix(c,vec3(1.,.95,1.),lead*(1.-e)); c=mix(c,vec3(.03,.005,.06),smoothstep(cut-.22,cut,e)*.9); }
 else if(kind<1.5){ c=mix(vec3(.04,.01,.08),vec3(.5,.15,.95),exp(-e*e*30.)*(1.-tl)); } // lâmina negra
 else { c=mix(vec3(1.,.72,.5),vec3(.9,.4,.8),tl)*(1.-tl*.5); } // trilha quente
 float f=abs(dot(normalize(vN),normalize(cameraPosition-vW))); c*=.75+.35*f; float a=(1.-tl*.7)*(1.-smoothstep(.85,1.,k))*smoothstep(1.4,3.2,cd); if(a<.03) discard; gl_FragColor=vec4(c,a); }`;
const CORE_F = `${NOISE} uniform float time; varying vec2 vU; varying vec4 vB; varying vec4 vP; varying vec3 vN; varying vec3 vW;
void main(){ float k=vP.x; vec3 n=normalize(vN), v=normalize(cameraPosition-vW); float f=abs(dot(n,v)); float sw=n2(vec2(atan(n.z,n.x)*3.+time*5.,n.y*4.-time*2.));
 if(sw<smoothstep(.7,1.,k)) discard; vec3 c=mix(vec3(.3,.05,.75),vec3(1.,.95,1.),pow(f,2.2)); c=mix(c,vec3(.04,0.,.08),smoothstep(.62,.8,sw)*(1.-f)); gl_FragColor=vec4(c,1.); }`;
const GLOW_V = `attribute vec4 aG; varying vec4 vG; varying vec2 vU; void main(){ vG=aG; vU=uv; vec4 c=viewMatrix*modelMatrix*instanceMatrix*vec4(0.,0.,0.,1.); vG.a*=smoothstep(1.2,4.5,-c.z); /* brilho colado na câmera (1ª pessoa) some */ c.xy+=position.xy*length(instanceMatrix[0].xyz); gl_Position=projectionMatrix*c; }`;
const GLOW_F = `varying vec4 vG; varying vec2 vU; void main(){ vec2 p=vU*2.-1.; float d=length(p); float a=exp(-d*d*5.)*vG.a; vec3 c=mix(vG.rgb,vec3(1.,.97,1.),exp(-d*d*18.)); gl_FragColor=vec4(c*a,a); }`;
const SPIKE_V = `attribute vec4 aT; varying vec4 vT; varying vec2 vU; void main(){ vT=aT; vU=uv; gl_Position=projectionMatrix*viewMatrix*modelMatrix*instanceMatrix*vec4(position,1.); }`;
const SPIKE_F = `${NOISE} varying vec4 vT; varying vec2 vU; void main(){ float d=abs(vU.x)+(n2(vec2(vU.y*9.+vT.w*7.,vU.x*2.))-.5)*.4; if(d>.95||vU.y>vT.y) discard; vec3 c=d<.22?mix(vec3(1.,.95,1.),vec3(.6,.3,1.),vU.y*1.6):vec3(.03,.005,.06); gl_FragColor=vec4(c,1.); }`;

function bandGeo(T, seg = 56) { const pos = [], uv = [], nor = [], idx = []; for (let i = 0; i <= seg; i++) { const u = i / seg, a = u * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); for (let j = 0; j < 2; j++) { const w = j ? .5 : -.5; pos.push(c, w, s); uv.push(u, j); nor.push(c, 0, s); } if (i < seg) { const a0 = i * 2; idx.push(a0, a0 + 2, a0 + 1, a0 + 1, a0 + 2, a0 + 3); } }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); g.setIndex(idx); return g; }
function spikeGeo(T) { const pos = [], uv = [], idx = [], N = 8; for (let j = 0; j <= N; j++) { const y = j / N, w = .5 * (1 - y) ** .8 * (j % 2 ? .6 : 1) + .01; pos.push(-w, y, 0, 0, y, 0, w, y, 0); uv.push(-1, y, 0, y, 1, y); if (j < N) { const a = j * 3, c = a + 3; idx.push(a, c, a + 1, a + 1, c, c + 1, a + 1, c + 1, a + 2, a + 2, c + 1, c + 2); } }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); return g; }
/** Crescente com 3 lâminas empilhadas (espessura visível de lado). Plano XZ, frente +Z, corda em X; pontas em z≈0. */
function crescentGeo(T, Ro = 3.4, span = 1.25, seg = 40, dep = 6) {
  const pos = [], uv = [], sh = [], idx = []; let base = 0;
  for (const [yy, sc, s] of [[-.85, .62, 0], [-.45, .88, 0], [0, 1, 1], [.45, .88, 2], [.85, .62, 2]]) { const R = Ro * sc; /* 5 lâminas em cúpula: legível de frente e de lado */
    for (let i = 0; i <= seg; i++) { const u = i / seg * 2 - 1, a = u * span, th = (1.25 * (1 - Math.abs(u) ** 1.7) + .06) * sc; for (let j = 0; j <= dep; j++) { const v = j / dep, rr = R - v * th; pos.push(Math.sin(a) * rr, yy * (1 - Math.abs(u) * .6), Math.cos(a) * rr - R * Math.cos(span)); uv.push(u, v); sh.push(s); } }
    for (let i = 0; i < seg; i++) for (let j = 0; j < dep; j++) { const a = base + i * (dep + 1) + j, b = a + dep + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
    base += (seg + 1) * (dep + 1); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setAttribute('aS', new T.Float32BufferAttribute(sh, 1)); g.setIndex(idx); return g; }

export function createEclipseVFX(T, scene) {
  const root = new T.Group(); root.name = 'VorgazhekEclipse'; scene.add(root); const geos = [], mats = [], uTime = { value: 0 };
  const V = () => new T.Vector3(), M = new T.Matrix4(), Q = new T.Quaternion(), P = V(), S = V(), D = V(), E = V(), X = V(), Y = V(), Z = V(), UP = new T.Vector3(0, 1, 0), cam = V(), tmp = V(), tip = V(), right = V(), Q2 = new T.Quaternion();
  const mat = (o) => { const m = new T.ShaderMaterial({ toneMapped: false, fog: false, ...o, uniforms: { time: uTime, ...(o.uniforms || {}) } }); mats.push(m); return m; };
  /* lua */
  const moonU = { show: { value: 0 }, side: { value: 1 } }, moonG = new T.PlaneGeometry(2, 2); geos.push(moonG);
  const moon = new T.Mesh(moonG, mat({ vertexShader: MOON_V, fragmentShader: MOON_F, transparent: true, depthWrite: false, uniforms: moonU })); moon.frustumCulled = false; moon.visible = false; moon.renderOrder = 3; /* depois do portal/olhos do fundo, antes da aura: nada do cenário distante passa por cima */ root.add(moon); const moonPos = V(); let moonSet = false;
  /* fitas */
  const MAXQ = 900, rp = new Float32Array(MAXQ * 12), ru = new Float32Array(MAXQ * 8), rk = new Float32Array(MAXQ * 16), ri = new Uint32Array(MAXQ * 6); for (let i = 0; i < MAXQ; i++) ri.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 2, i * 4 + 1, i * 4 + 3], i * 6);
  const rg = new T.BufferGeometry(); rg.setAttribute('position', new T.BufferAttribute(rp, 3).setUsage(T.DynamicDrawUsage)); rg.setAttribute('aUv', new T.BufferAttribute(ru, 2).setUsage(T.DynamicDrawUsage)); rg.setAttribute('aK', new T.BufferAttribute(rk, 4).setUsage(T.DynamicDrawUsage)); rg.setIndex(new T.BufferAttribute(ri, 1)); geos.push(rg);
  const ribbons = new T.Mesh(rg, mat({ vertexShader: RIB_V, fragmentShader: RIB_F, transparent: true, depthWrite: false, side: T.DoubleSide })); ribbons.frustumCulled = false; ribbons.renderOrder = 4; root.add(ribbons); let q = 0;
  const pts = []; for (let i = 0; i < 32; i++) pts.push(V()); const sideA = V(), sideB = V();
  function strip(n, kind, alpha, seed, glow, width) { // pts[0..n-1] → quads com largura width(u)
    for (let i = 1; i < n && q < MAXQ; i++) { const a = pts[i - 1], b = pts[i], u0 = (i - 1) / (n - 1), u1 = i / (n - 1);
      D.subVectors(b, a); E.subVectors(a, cam); sideA.crossVectors(D, E); let l = sideA.length(); if (l < 1e-6) sideA.set(1, 0, 0); else sideA.multiplyScalar(width(u0) / l);
      E.subVectors(b, cam); sideB.crossVectors(D, E); l = sideB.length(); if (l < 1e-6) sideB.set(1, 0, 0); else sideB.multiplyScalar(width(u1) / l);
      const o = q * 12; rp[o] = a.x - sideA.x; rp[o + 1] = a.y - sideA.y; rp[o + 2] = a.z - sideA.z; rp[o + 3] = a.x + sideA.x; rp[o + 4] = a.y + sideA.y; rp[o + 5] = a.z + sideA.z;
      rp[o + 6] = b.x - sideB.x; rp[o + 7] = b.y - sideB.y; rp[o + 8] = b.z - sideB.z; rp[o + 9] = b.x + sideB.x; rp[o + 10] = b.y + sideB.y; rp[o + 11] = b.z + sideB.z;
      const w = q * 8; ru[w] = u0; ru[w + 1] = 0; ru[w + 2] = u0; ru[w + 3] = 1; ru[w + 4] = u1; ru[w + 5] = 0; ru[w + 6] = u1; ru[w + 7] = 1;
      const al = typeof alpha === 'function' ? null : alpha; for (let k = 0; k < 4; k++) { const kk = q * 16 + k * 4, uu = k < 2 ? u0 : u1; rk[kk] = kind; rk[kk + 1] = al === null ? alpha(uu) : al; rk[kk + 2] = seed; rk[kk + 3] = glow; } q++; } }
  /* instâncias */
  const inst = (geo, vs, fs, n, attrs, o = {}) => { const arrs = {}; for (const [k, sz] of attrs) { arrs[k] = new Float32Array(n * sz); geo.setAttribute(k, new T.InstancedBufferAttribute(arrs[k], sz).setUsage(T.DynamicDrawUsage)); }
    const mesh = new T.InstancedMesh(geo, mat({ vertexShader: vs, fragmentShader: fs, ...o }), n); geos.push(geo); mesh.frustumCulled = false; mesh.count = 0; root.add(mesh); return { mesh, arrs, n: 0, max: n, attrs }; };
  const put = (I, vals) => { if (I.n >= I.max) return; I.mesh.setMatrixAt(I.n, M); let o = 0; for (const [k, sz] of I.attrs) { for (let j = 0; j < sz; j++) I.arrs[k][I.n * sz + j] = vals[o + j]; o += sz; } I.n++; };
  const bands = inst(bandGeo(T), BAND_V, BAND_F, 30, [['aB', 4], ['aP', 4]], { transparent: true, depthWrite: false, side: T.DoubleSide }); bands.mesh.renderOrder = 5;
  const coreSph = new T.SphereGeometry(1, 24, 16), cores = inst(coreSph, BAND_V, CORE_F, 2, [['aB', 4], ['aP', 4]], {}); cores.mesh.renderOrder = 4;
  const glows = inst(new T.PlaneGeometry(1, 1), GLOW_V, GLOW_F, 16, [['aG', 4]], { transparent: true, depthWrite: false, blending: T.AdditiveBlending }); glows.mesh.renderOrder = 7;
  const spikes = inst(spikeGeo(T), SPIKE_V, SPIKE_F, 40, [['aT', 4]], { side: T.DoubleSide });
  const shardG = new T.OctahedronGeometry(1, 0); shardG.scale(.55, 1, .4); geos.push(shardG); const shardM = new T.MeshStandardMaterial({ color: 0x06020c, emissive: 0x3a1080, emissiveIntensity: .7, roughness: .7, flatShading: true }); mats.push(shardM);
  const shards = new T.InstancedMesh(shardG, shardM, 40); shards.frustumCulled = false; shards.count = 0; root.add(shards);
  /* corte */
  const slashU = { alpha: { value: 1 } }, slashG = crescentGeo(T); geos.push(slashG);
  const slash = new T.Mesh(slashG, mat({ vertexShader: SLASH_V, fragmentShader: SLASH_F, transparent: true, depthWrite: false, side: T.DoubleSide, uniforms: slashU })); slash.frustumCulled = false; slash.visible = false; slash.renderOrder = 6; root.add(slash);
  /* espada real (EspadaBispo2.glb) presa à mão */
  const holder = new T.Group(); holder.name = 'EspadaBispo2Holder'; holder.visible = false; root.add(holder); let swordMats = [], swordReady = false; const swordTip = V();
  function setSwordModel(model, scale = ECLIPSE.swordScale) { if (swordReady) return; const m = model.clone(true); m.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; o.material.emissive = new T.Color(0x6a20ff); o.material.emissiveIntensity = 0; swordMats.push(o.material); o.frustumCulled = false; o.castShadow = true; } });
    m.scale.setScalar(scale); m.position.y = -ECLIPSE.grip * scale; holder.add(m); holder.userData.len = (.95 - ECLIPSE.grip) * scale; swordReady = true; }
  let time = 0; const trail = []; for (let i = 0; i < 12; i++) trail.push([V(), V()]); let trailN = 0;
  const sm = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }, eo = x => 1 - (1 - Math.max(0, Math.min(1, x))) ** 3;
  function aura(B, L, A, low, yaw) { // tempestade no corpo inteiro: fitas-chama, chicotes negros, feixe da espada, farpas no chão
    if (A < .01) return; const NS = low ? 12 : 18, NG = low ? 9 : 14;
    for (let i = 0; i < NS; i++) { const r0 = Math.sin(i * 12.9898) * .5 + .5, r1 = Math.sin(i * 78.233) * .5 + .5, th0 = i / NS * 6.283 + r0, om = (1.1 + .9 * r1) * (i % 3 ? 1 : -1), H = (2.4 + 6.6 * L) * (.72 + .5 * r1), R0 = .75 + 3.1 * L * (.55 + .45 * r0);
      for (let j = 0; j < NG; j++) { const u = j / (NG - 1), th = th0 + om * time + u * (1.3 + 1.9 * L) * (i % 2 ? 1 : -1), rr = (R0 * Math.pow(Math.sin(Math.PI * (.12 + .78 * u)), .7) * (1 - .45 * u) + .45) * (1 + .14 * Math.sin(time * 4 + u * 7 + i)); pts[j].set(B.x + Math.cos(th) * rr, B.y + .05 + u * H, B.z + Math.sin(th) * rr); }
      const w0 = (.1 + .4 * L) * (.7 + .6 * r0) * A; strip(NG, 0, u => A * (1 - u * u) * (.75 + .25 * L), i * .37, L, u => w0 * Math.pow(1 - u, .55) + .02); }
    if (L > .25) { const NW = low ? 5 : 8, wk = sm((L - .25) / .4) * A; for (let i = 0; i < NW; i++) { const r0 = Math.sin(i * 41.3) * .5 + .5, a0 = i / NW * 6.283 + time * .35 * (i % 2 ? 1 : -1) + r0, Lw = (1.2 + 3.6 * L) * (.7 + .5 * r0), h0 = .9 + 2.4 * r0, curl = (i % 2 ? 1 : -1) * (1.6 + r0);
      for (let j = 0; j < 14; j++) { const u = j / 13, a = a0 + curl * u * u, rr = .35 + u * Lw; pts[j].set(B.x + Math.cos(a) * rr, B.y + h0 + u * (1.2 + 2 * r0) * (L + .3) + Math.sin(u * 5 + time * 3 + i) * .35 * u, B.z + Math.sin(a) * rr); }
      strip(14, 1, u => wk * (1 - u * .4), i * .71, 0, u => (.32 * (1 - u) + .03) * (.6 + .6 * L)); } }
    if (swordReady && holder.visible) { const len = holder.userData.len, ext = .4 + 4.2 * Math.pow(L, 1.4); D.set(0, 1, 0).applyQuaternion(holder.quaternion); E.set(1, 0, 0).applyQuaternion(holder.quaternion); Z.set(0, 0, 1).applyQuaternion(holder.quaternion);
      for (let s = 0; s < 3; s++) { for (let j = 0; j < 14; j++) { const u = j / 13, along = -.1 + u * (len + ext), a = s * 2.09 + time * (5 + s) + u * 9, rr = (.1 + .3 * L) * (1 - u * .5); pts[j].copy(holder.position).addScaledVector(D, along).addScaledVector(E, Math.cos(a) * rr).addScaledVector(Z, Math.sin(a) * rr); }
        strip(14, 0, u => A * (1 - u * .7), s * 3.1, 1, u => (.07 + .2 * L) * (1 - u * .6)); }
      for (let j = 0; j < 8; j++) { const u = j / 7; pts[j].copy(holder.position).addScaledVector(D, len * .25 + u * (len * .75 + ext)); }
      strip(8, 2, u => A * (.6 + .4 * L) * (1 - u * u * .8), 5.5, 1, u => (.08 + .32 * L) * (1 - u * .85) + .02);
      tip.copy(holder.position).addScaledVector(D, len); P.copy(tip); Q.identity(); S.setScalar((1.1 + 3.2 * L) * A); M.compose(P, Q, S); put(glows, [.75, .45, 1, .85 * A]); }
    P.set(B.x, B.y + .25, B.z); Q.identity(); S.setScalar((1.2 + 4.5 * L) * A); M.compose(P, Q, S); put(glows, [.6, .3, 1, .75 * A]); // núcleo no chão
    if (L > .45) { const k = sm((L - .45) / .55) * A, n = low ? 10 : 16; for (let i = 0; i < n; i++) { const a = i / n * 6.283 + Math.sin(i * 3.7) * .25, el = .55 + .55 * Math.abs(Math.sin(i * 2.3)), len = (.7 + 2.6 * k) * (.6 + .5 * Math.abs(Math.sin(i * 5.1 + time * 2))) * (.9 + .1 * Math.sin(time * 9 + i));
      D.set(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el)); E.set(cam.x - B.x, cam.y - B.y, cam.z - B.z); X.crossVectors(D, E).normalize(); Z.crossVectors(X, D); M.makeBasis(X, D, Z); Q.setFromRotationMatrix(M);
      P.set(B.x + D.x * .5, B.y + .02, B.z + D.z * .5); S.set(.3 + .12 * k, len, 1); M.compose(P, Q, S); put(spikes, [1, 1, 0, i * .17]); } }
  }
  function vortex(I, k, low) { // colapso esférico girando (k: 0..1 em 2,4 s)
    const t = k * 2.4, grow = t < .15 ? .35 * t / .15 : t < .55 ? .35 + .65 * eo((t - .15) / .4) : t < 1.9 ? 1 + .06 * Math.sin(t * 6) : 1 - .55 * sm((t - 1.9) / .5), R = I.R * grow, cy = I.y + I.R * .55 * Math.min(1, grow);
    const NB = low ? 12 : 22; for (let i = 0; i < NB; i++) { const r0 = Math.sin(i * 12.9898) * .5 + .5, r1 = Math.sin(i * 78.233) * .5 + .5, r2 = Math.sin(i * 39.34) * .5 + .5;
      Y.set(Math.sin(i * 2.4) * .8, 1, Math.cos(i * 1.7) * .8).normalize(); Q.setFromUnitVectors(UP, Y); Q.multiply(Q2.setFromAxisAngle(UP, r2 * 6.283 + t * (.5 + r1)));
      const rr = R * (.35 + .75 * r0), w = R * (.12 + .22 * r1) * (i % 4 === 0 ? .55 : 1); P.set(I.x, cy + (r1 - .5) * R * .35, I.z); S.set(rr, w, rr); M.compose(P, Q, S);
      put(bands, [.45 + .45 * r2, (.55 + 1.1 * r1) * (i % 2 ? 1 : -1.2), r0, i % 7 === 3 ? 2 : i % 3 === 1 ? 1 : 0, k, R, 0, 0]); }
    P.set(I.x, cy, I.z); Q.identity(); S.setScalar(R * (.28 + .05 * Math.sin(t * 9))); M.compose(P, Q, S); put(cores, [0, 0, 0, 0, k, R, 0, 0]);
    const fl = t < .15 ? 1 : Math.max(0, 1 - (t - .15) / 1.6); S.setScalar(R * (1.5 + 1.8 * fl)); M.compose(P, Q, S); put(glows, [.62, .3, 1, .55 + .45 * fl * (1 - sm((t - 1.9) / .5))]);
    S.setScalar(R * .9); M.compose(P, Q, S); put(glows, [1, .9, 1, .9 * (1 - sm((t - 1.9) / .5))]);
    // anel de pressão no chão + farpas negras radiais no início
    P.set(I.x, I.y + .05, I.z); Q.setFromAxisAngle(tmp.set(1, 0, 0), 0); const ring = Math.min(1, t / .5); S.set(R * (.6 + 1.4 * ring), .25 * (1 - ring) + .05, R * (.6 + 1.4 * ring)); M.compose(P, Q, S); if (t < .7) put(bands, [1, .3, .2, 1, Math.max(k, ring * .8), R, 0, 0]);
    if (t < .9) { const n = low ? 8 : 14; for (let i = 0; i < n; i++) { const a = i / n * 6.283 + I.seed * 6, el = .2 + .7 * Math.abs(Math.sin(i * 3.1 + I.seed)), len = R * (.6 + .8 * Math.abs(Math.sin(i * 1.7))) * eo(t / .2) * (1 - sm((t - .5) / .4));
      D.set(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el)); E.set(cam.x - I.x, cam.y - I.y, cam.z - I.z); X.crossVectors(D, E).normalize(); Z.crossVectors(X, D); M.makeBasis(X, D, Z); Q.setFromRotationMatrix(M); P.set(I.x + D.x * .3, I.y + .05, I.z + D.z * .3); S.set(.35, len, 1); M.compose(P, Q, S); put(spikes, [1, 1, 0, I.seed + i * .1]); } }
    if (t < 1) for (let i = 0; i < (low ? 8 : 16); i++) { const a = I.seed * 6.283 + i * .73, v = 4 + 4 * Math.abs(Math.sin(i * 2.3)), vy = 4 + 5 * Math.abs(Math.sin(i * 1.3)), yy = vy * t - 4.9 * t * t; if (yy < -.2) continue;
      P.set(I.x + Math.cos(a) * v * t, I.y + .2 + yy, I.z + Math.sin(a) * v * t); Q.setFromAxisAngle(UP, t * 8 + i); S.setScalar(.09 + .05 * (i % 3)); M.compose(P, Q, S); shards.setMatrixAt(shards.count++, M); }
  }
  return {
    root, holder, setSwordModel, get swordReady() { return swordReady; },
    /** Posição da ponta da espada (para o lançamento). */
    swordTip(out) { if (swordReady && holder.visible) { D.set(0, 1, 0).applyQuaternion(holder.quaternion); return out.copy(holder.position).addScaledVector(D, holder.userData.len); } return null; },
    /** ctx: {camera, boss:{x,y,z,yaw}, hand:Vector3|null, armDir:Vector3|null, low, moonGround, oldMoon} */
    update(es, ctx, dt) {
      time += dt; uTime.value = time; const camera = ctx.camera; cam.copy(camera.position); const low = !!ctx.low, st = es && es.st;
      q = 0; for (const I of [bands, cores, glows, spikes]) I.n = 0; shards.count = 0;
      if (st && !st.done) {
        // lua: aparece já no 1º quadro, composta atrás/acima do bispo pelo lado da espada
        const B = ctx.boss; right.set(-Math.cos(B.yaw), 0, Math.sin(B.yaw)); tmp.set(camera.matrixWorld.elements[0], 0, camera.matrixWorld.elements[2]); const sideSign = right.dot(tmp) >= 0 ? 1 : -1; // lado da mão direita do bispo, visto da câmera
        const mp = moonPlacement(cam, B, { side: sideSign, ground: ctx.moonGround ?? B.y }); tmp.set(mp.x, mp.y, mp.z);
        if (!moonSet) { moonPos.copy(tmp); moonSet = true; } else moonPos.lerp(tmp, Math.min(1, dt * (st.t < 1.1 ? 3 : .8)));
        moon.visible = st.moon > .001; moon.position.copy(moonPos); moon.lookAt(cam); moon.scale.setScalar(mp.r * 2.6); moonU.show.value = Math.min(1, st.t / .35) * st.moon; moonU.side.value = sideSign;
        // espada real na mão direita, ao longo do antebraço
        if (swordReady && ctx.hand && ctx.armDir) { holder.position.copy(ctx.hand); Y.copy(ctx.armDir).normalize(); X.set(-Math.cos(B.yaw), 0, Math.sin(B.yaw)); X.addScaledVector(Y, -X.dot(Y)); if (X.lengthSq() < 1e-6) X.set(1, 0, 0); X.normalize(); Z.crossVectors(X, Y); M.makeBasis(X, Y, Z); holder.quaternion.setFromRotationMatrix(M);
          const show = st.phase === 'charge' ? Math.min(1, st.pt / .3) : st.phase === 'release' || st.phase === 'impact' ? 1 : st.moon; holder.visible = show > .01; for (const m of swordMats) { m.opacity = show; m.emissiveIntensity = .2 + 1.6 * st.aura; m.depthWrite = show > .95; } } else holder.visible = false;
        if (!ctx.qaHide || !ctx.qaHide.includes('aura')) aura(B, sm(st.level), st.aura * (st.phase === 'abort' ? st.moon : 1), low, B.yaw);
        const s = st.slash; slash.visible = !!s;
        if (s) { D.set(s.dx, 0, s.dz).normalize(); Z.set(s.dx, s.dy, s.dz).normalize(); X.crossVectors(UP, Z).normalize(); Y.crossVectors(Z, X); M.makeBasis(X, Y, Z); Q.setFromRotationMatrix(M); Q.multiply(Q2.setFromAxisAngle(tmp.set(0, 0, 1), .45)); // corte diagonal
          slash.position.set(s.x, s.y, s.z); slash.quaternion.copy(Q); const sc = 1 + .15 * Math.sin(time * 30); slash.scale.set(sc, 1, 1); slashU.alpha.value = 1; Q.identity(); S.setScalar(3.4); M.compose(slash.position, Q, S); put(glows, [.7, .4, 1, .9]);
          // pontas deixam rastro
          if (trailN < trail.length) trailN++; for (let i = trailN - 1; i > 0; i--) { trail[i][0].copy(trail[i - 1][0]); trail[i][1].copy(trail[i - 1][1]); } const R = 3.4, sp = 1.25; trail[0][0].set(Math.sin(sp) * R * .95, 0, 0).applyQuaternion(Q).add(slash.position); trail[0][1].set(-Math.sin(sp) * R * .95, 0, 0).applyQuaternion(Q).add(slash.position); }
        else if (trailN > 0 && st.phase !== 'release') trailN = Math.max(0, trailN - 2);
        if (trailN > 2 && !(ctx.qaHide && ctx.qaHide.includes('trail'))) for (const side of [0, 1]) { for (let i = 0; i < trailN; i++) pts[i].copy(trail[i][side]); strip(trailN, 3, u => (1 - u) * .9, side * 3.3, 1, u => .55 * (1 - u) + .04); }
        if (st.impact && st.phase === 'impact') vortex({ x: st.impact.x, y: st.impact.y, z: st.impact.z, R: st.impact.kind === 'hero' ? 2.3 : 3, seed: (st.impact.x * 7.13) % 1 }, Math.min(1, st.impact.t / 2.4), low);
        if (ctx.oldMoon) ctx.oldMoon.visible = false;
      } else { moon.visible = false; slash.visible = false; holder.visible = false; moonSet = false; trailN = 0; }
      rg.setDrawRange(0, q * 6); rg.attributes.position.needsUpdate = rg.attributes.aUv.needsUpdate = rg.attributes.aK.needsUpdate = true;
      for (const I of [bands, cores, glows, spikes]) { I.mesh.count = I.n; I.mesh.instanceMatrix.needsUpdate = true; for (const [k] of I.attrs) I.mesh.geometry.attributes[k].needsUpdate = true; }
      shards.instanceMatrix.needsUpdate = true;
    },
    clear(oldMoon) { moon.visible = false; slash.visible = false; holder.visible = false; moonSet = false; trailN = 0; q = 0; rg.setDrawRange(0, 0); for (const I of [bands, cores, glows, spikes]) { I.n = 0; I.mesh.count = 0; } shards.count = 0; if (oldMoon) oldMoon.visible = true; },
    dispose() { scene.remove(root); for (const g of geos) g.dispose(); for (const m of mats) m.dispose(); for (const m of swordMats) m.dispose(); }
  };
}
