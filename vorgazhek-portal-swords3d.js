/**
 * MOD 260 — VORGAZHEK (Bispo 2), Habilidade 3: DOMÍNIO DAS LÂMINAS ENDIVIDADAS.
 *
 * Lógica pura (createPortalSwords, testável em node) + VFX (createPortalSwordsVFX) no MESMO relógio e com os MESMOS
 * pontos de colisão. 20–24 portais abrem quase juntos NO ALTO (6–14 m, três camadas) à volta do herói e do bispo,
 * dentro da arena. Cada portal faz EXATAMENTE 3 espadas: a espada atravessa o portal com a PONTA primeiro (o que ainda
 * está atrás do plano do portal é recortado no shader), fica armada à frente dele e entra numa fila GLOBAL: uma espada
 * lançada por vez, alternando lado/altura. A mira é a posição do herói com antecipação curta e limitada NO LANÇAMENTO;
 * depois o rumo fica travado (nada teleguiado). Colisão por segmento (sem atravessar por velocidade) contra o herói e o
 * chão; um acerto por espada; o impacto (preto-violeta) nasce no ponto real. Só quando a espada daquele portal termina
 * (acerto, chão ou tempo-limite) a próxima começa a sair do MESMO portal. Depois da 3ª, o portal fecha.
 *
 * Arte (referências do criador): portal = poço com núcleo quase preto e espirais índigo/azul elétrico/violeta com borda
 * lilás, recortado no ar; espada = montante demoníaco escuro (lâmina larga de aço preto, gume vermelho incandescente,
 * inscrições claras, guarda com espinhos e gema escarlate, cabo longo), 3D e ~1,6× uma espada comum; rastro em fitas
 * (núcleo quente, carmim, manto negro recortado); impacto = cúpula de sombra rasgada com núcleo lilás quase branco
 * rente ao chão, farpas/chicotes negros radiais e estilhaços.
 */
export const PORTAL_SWORDS_BUILD = '260-portal-swords';
export const PORTAL_SWORDS = { min: 20, max: 24, shots: 3, openStagger: .22, open: .5, draw: .55, cadence: .12, speed: 34, lead: .35, leadCap: 2.6, life: 1.6, hitR: .5, heroH: 1.75, close: .45, dmg: 5, minHitGap: .55, alt: [7, 9.8, 12.6], len: 1.75 };

export function createPortalSwords(opts = {}) {
  const T = { ...PORTAL_SWORDS, ...(opts.T || {}) }, rand = opts.rand || Math.random, ground = opts.ground || (() => 0), dmg = opts.dmg || T.dmg;
  const st = { phase: 'idle', t: 0, portals: [], swords: [], order: [], cursor: 0, nextFire: 0, fired: 0, lastHit: -9, done: false, aborted: false };
  function layout(hero, boss, arena) { // portais altos, à volta dos dois, em camadas, dentro da arena e sem se atravessar
    const n = T.min + Math.floor(rand() * (T.max - T.min + 1)), mx = (hero.x + boss.x) / 2, mz = (hero.z + boss.z) / 2, ax = boss.x - hero.x, az = boss.z - hero.z, al = Math.hypot(ax, az) || 1, fx = ax / al, fz = az / al;
    const out = [], A = arena || { x: mx, z: mz, r: 22 }, safeR = Math.max(6, A.r - 3);
    const anchors = [[boss.x, boss.z, 1], [hero.x, hero.z, -1], [mx, mz, 0]];
    for (let i = 0, k = 0; out.length < n && k < n * 40; k++) {
      const [cx, cz, side] = anchors[i % 3], baseAng = Math.atan2(fz, fx) + (side === 1 ? 0 : side === -1 ? Math.PI : (i % 2 ? 1.5708 : -1.5708)), ang = baseAng + (rand() - .5) * 2.4, d = 3 + rand() * 9;
      let x = cx + Math.cos(ang) * d, z = cz + Math.sin(ang) * d; const dd = Math.hypot(x - A.x, z - A.z); if (dd > safeR) { x = A.x + (x - A.x) / dd * safeR; z = A.z + (z - A.z) / dd * safeR; }
      const layer = out.length % 3, y = ground(x, z) + T.alt[layer] + (rand() - .5) * 1.6;
      if (out.some(o => Math.hypot(o.x - x, o.y - y, o.z - z) < 2.8)) continue;
      out.push({ i: out.length, x, y, z, layer, seed: rand(), state: 'closed', t: 0, fired: 0, sword: null, openAt: rand() * T.openStagger, k: 0, closeT: 0 }); i++;
    }
    for (const p of out) { const dx = hero.x - p.x, dy = (ground(hero.x, hero.z) + 1) - p.y, dz = hero.z - p.z, l = Math.hypot(dx, dy, dz) || 1; p.nx = dx / l; p.ny = dy / l; p.nz = dz / l; } // olha para a arena/herói ao abrir; depois fixo
    // ordem de disparo alternando lado/altura: intercala por ângulo em volta do meio e por camada
    const byAng = out.map(p => ({ p, a: Math.atan2(p.z - mz, p.x - mx) })).sort((a, b) => a.a - b.a).map(o => o.p), half = Math.ceil(byAng.length / 2), order = [];
    for (let i = 0; i < half; i++) { order.push(byAng[i]); if (byAng[i + half]) order.push(byAng[i + half]); }
    return { portals: out, order: order.map(p => p.i) };
  }
  const api = {
    T, st,
    get done() { return st.done; },
    start(hero, boss, arena) { const L = layout(hero, boss, arena); Object.assign(st, { phase: 'open', t: 0, portals: L.portals, order: L.order, swords: [], cursor: 0, nextFire: T.open + T.draw + .05, fired: 0, done: false, aborted: false }); return api; },
    abort() { if (st.done || st.aborted) return; st.aborted = true; st.swords = st.swords.filter(s => s.state === 'impact'); for (const p of st.portals) if (p.state !== 'gone') { p.state = 'close'; p.closeT = 0; p.sword = null; } },
    /** hero {x,y,z,vx,vz,iframes}. Devolve eventos: open | draw | fire | impact{kind:'hero'|'ground'} | hit{dmg} | close | end. */
    step(dt, hero) {
      const ev = []; if (st.done) return ev; st.t += dt; const gy = Number.isFinite(hero.y) ? hero.y : ground(hero.x, hero.z);
      for (const p of st.portals) {
        if (p.state === 'closed' && st.t >= p.openAt && !st.aborted) { p.state = 'opening'; p.t = 0; ev.push({ type: 'open', i: p.i }); }
        if (p.state === 'opening') { p.t += dt; p.k = Math.min(1, p.t / T.open); if (p.k >= 1) { p.state = 'armed'; } }
        if (p.state === 'armed' && !p.sword && p.fired < T.shots && !st.aborted) { // a próxima espada atravessa o portal: ponta primeiro
          p.sword = { portal: p.i, n: p.fired, state: 'draw', t: 0, draw: 0, x: p.x, y: p.y, z: p.z, dx: p.nx, dy: p.ny, dz: p.nz }; st.swords.push(p.sword); ev.push({ type: 'draw', i: p.i, n: p.fired }); }
        if (p.state === 'close') { p.closeT += dt; p.k = Math.max(0, 1 - p.closeT / T.close); if (p.closeT >= T.close) { p.state = 'gone'; ev.push({ type: 'close', i: p.i }); } }
      }
      for (const s of st.swords) {
        const p = st.portals[s.portal];
        if (s.state === 'draw') { s.t += dt; s.draw = Math.min(1, s.t / T.draw); const out = s.draw * (T.len + .15); s.x = p.x + p.nx * (out - T.len); s.y = p.y + p.ny * (out - T.len); s.z = p.z + p.nz * (out - T.len); // a ponta (s + dir*len) sai primeiro
          if (s.draw >= 1) { s.state = 'ready'; } }
        if (s.state === 'ready') { // armada à frente do portal, apontando para o herói até a sua vez
          const tx = hero.x - s.x, ty = gy + 1 - s.y, tz = hero.z - s.z, l = Math.hypot(tx, ty, tz) || 1; s.dx += (tx / l - s.dx) * Math.min(1, dt * 10); s.dy += (ty / l - s.dy) * Math.min(1, dt * 10); s.dz += (tz / l - s.dz) * Math.min(1, dt * 10); const n = Math.hypot(s.dx, s.dy, s.dz) || 1; s.dx /= n; s.dy /= n; s.dz /= n; }
        if (s.state === 'fly') { const px = s.x, py = s.y, pz = s.z; s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt; s.trail.push([s.x, s.y, s.z]); if (s.trail.length > 16) s.trail.shift();
          // colisão por SEGMENTO com o herói (cápsula vertical) — nunca atravessa por velocidade
          let hitHero = false, hx = 0, hy = 0, hz = 0;
          if (!hero.iframes && !st.aborted) { const sx = s.x - px, sz = s.z - pz, sl2 = sx * sx + sz * sz; let u = sl2 > 1e-9 ? ((hero.x - px) * sx + (hero.z - pz) * sz) / sl2 : 0; u = Math.max(0, Math.min(1, u)); const cx = px + sx * u, cy = py + (s.y - py) * u, cz = pz + sz * u;
            if (Math.hypot(cx - hero.x, cz - hero.z) < T.hitR && cy > gy - .1 && cy < gy + T.heroH + .2) { hitHero = true; hx = cx; hy = cy; hz = cz; } }
          const g = ground(s.x, s.z);
          if (hitHero) { s.state = 'impact'; s.t = 0; s.ix = hx; s.iy = hy; s.iz = hz; s.kind = 'hero'; ev.push({ type: 'impact', kind: 'hero', i: s.portal, x: hx, y: hy, z: hz });
            if (st.t - st.lastHit >= T.minHitGap) { st.lastHit = st.t; ev.push({ type: 'hit', dmg, i: s.portal, x: hx, y: hy, z: hz }); } }
          else if (s.y <= g) { const k = (py - ground(px, pz)) / Math.max(1e-6, (py - ground(px, pz)) - (s.y - g)), ix = px + (s.x - px) * k, iz = pz + (s.z - pz) * k; s.state = 'impact'; s.t = 0; s.ix = ix; s.iz = iz; s.iy = ground(ix, iz); s.kind = 'ground'; ev.push({ type: 'impact', kind: 'ground', i: s.portal, x: ix, y: s.iy, z: iz }); }
          else if (s.t > T.life) { s.state = 'impact'; s.t = 0; s.ix = s.x; s.iy = s.y; s.iz = s.z; s.kind = 'timeout'; }
          if (s.state === 'impact' && p && p.sword === s) { p.sword = null; p.fired = Math.max(p.fired, s.n + 1); if (p.fired >= T.shots && !st.aborted) { p.state = 'close'; p.closeT = 0; } } // libera o portal para a próxima
        } else if (s.state === 'impact') { s.t += dt; if (s.t > .7) s.state = 'gone'; }
      }
      st.swords = st.swords.filter(s => s.state !== 'gone');
      // fila global: uma espada lançada por vez, alternando lados/alturas
      if (!st.aborted && st.t >= st.nextFire && st.order.length) {
        for (let k = 0; k < st.order.length; k++) { const idx = st.order[(st.cursor + k) % st.order.length], p = st.portals[idx], s = p.sword;
          if (s && s.state === 'ready') { st.cursor = (st.cursor + k + 1) % st.order.length;
            const sp = Math.hypot(hero.vx || 0, hero.vz || 0), dist = Math.hypot(hero.x - s.x, gy + 1 - s.y, hero.z - s.z), lead = Math.min(T.leadCap, sp * Math.min(T.lead, dist / T.speed));
            const ax = hero.x + (sp > .1 ? hero.vx / sp : 0) * lead, az = hero.z + (sp > .1 ? hero.vz / sp : 0) * lead, ay = ground(ax, az) + .9, dx = ax - s.x, dy = ay - s.y, dz = az - s.z, l = Math.hypot(dx, dy, dz) || 1;
            s.dx = dx / l; s.dy = dy / l; s.dz = dz / l; s.vx = s.dx * T.speed; s.vy = s.dy * T.speed; s.vz = s.dz * T.speed; s.state = 'fly'; s.t = 0; s.trail = [[s.x, s.y, s.z]]; s.target = { x: ax, y: ay, z: az };
            st.fired++; st.nextFire = st.t + T.cadence; ev.push({ type: 'fire', i: idx, n: s.n, x: s.x, y: s.y, z: s.z }); break; } }
      }
      if (st.portals.length && st.portals.every(p => p.state === 'gone') && !st.swords.length) { st.done = true; st.phase = 'end'; ev.push({ type: 'end', fired: st.fired, aborted: st.aborted }); }
      return ev;
    }
  };
  return api;
}

/* ---------------- VFX ---------------- */
const NOISE = `float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}`;
/* portal: poço com núcleo quase preto, espirais índigo/azul elétrico/violeta, borda lilás; recortado no ar (aP = abertura, semente) */
const PORTAL_V = `attribute vec2 aP; varying vec2 vU; varying vec2 vP; void main(){ vU=uv; vP=aP; vec3 p=position*(.15+.85*aP.x); gl_Position=projectionMatrix*viewMatrix*modelMatrix*instanceMatrix*vec4(p,1.); }`;
const PORTAL_F = `${NOISE} uniform float time; varying vec2 vU; varying vec2 vP;
void main(){ vec2 c=vU*2.-1.; float r=length(c), a=atan(c.y,c.x); if(r>1.) discard;
 float sw=a*3.+r*9.-time*(2.6+vP.y)+vP.y*6.283, band=.5+.5*sin(sw)*(.6+.4*n2(vec2(a*4.+time,r*6.))), ring=n2(vec2(a*2.5-time*1.4+r*7.,r*14.-time*3.));
 vec3 col=mix(vec3(.12,.05,.55),vec3(.32,.38,1.),band); col=mix(col,vec3(.62,.32,1.),smoothstep(.55,.9,ring)*.6); col=mix(col,vec3(.86,.72,1.),smoothstep(.78,.98,r)*(.6+.4*band));
 float core=1.-smoothstep(.22,.55,r+(ring-.5)*.12); col=mix(col,vec3(.01,0.,.03),core); // núcleo quase preto
 float a2=(1.-smoothstep(.86,1.,r+(band-.5)*.06))*vP.x; if(a2<.02) discard; gl_FragColor=vec4(col,a2); }`;
const BACK_F = `varying vec2 vU; varying vec2 vP; void main(){ vec2 c=vU*2.-1.; float r=length(c); if(r>1.) discard; float a=(1.-smoothstep(.2,1.,r))*.85*vP.x; gl_FragColor=vec4(vec3(.01,0.,.04),a); }`;
/* espada: partes por vértice (aPart), recorte pelo plano do portal (aPlane) */
const SWORD_V = `attribute float aPart; attribute vec4 aPlane; varying float vPart; varying vec3 vN; varying vec3 vW; varying vec4 vPl; varying vec3 vL;
void main(){ vPart=aPart; vPl=aPlane; vL=position; vec4 w=modelMatrix*instanceMatrix*vec4(position,1.); vW=w.xyz; vN=normalize(mat3(modelMatrix)*mat3(instanceMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }`;
const SWORD_F = `uniform float time; varying float vPart; varying vec3 vN; varying vec3 vW; varying vec4 vPl; varying vec3 vL;
void main(){ if(dot(vW,vPl.xyz)<vPl.w) discard; // ainda dentro do portal
 vec3 n=normalize(vN), v=normalize(cameraPosition-vW); float l=max(0.,dot(n,normalize(vec3(.4,.9,.3))))*.85+.15, rim=pow(1.-abs(dot(n,v)),3.);
 vec3 c; if(vPart<.5){ c=vec3(.07,.065,.075)*l+vec3(.5,.05,.08)*rim*.6; } // aço preto/cinza
 else if(vPart<1.5){ c=mix(vec3(1.,.08,.06),vec3(1.,.75,.6),.25+.2*sin(time*12.+vL.y*9.)); } // gume vermelho incandescente
 else if(vPart<2.5){ c=vec3(.32,.02,.04)*l+vec3(.9,.1,.12)*rim*.5; } // guarda vermelho/negra com espinhos
 else if(vPart<3.5){ c=vec3(1.,.12,.1)*(1.2+.3*sin(time*5.)); } // gema escarlate
 else if(vPart<4.5){ c=vec3(.05,.03,.035)*l; } // cabo
 else { c=vec3(.95,.9,.86); } // inscrições claras
 gl_FragColor=vec4(c,1.); }`;
/* fitas do rastro (por vértice: cor/alfa; aditivo ou normal) */
const STRIP_V = `attribute vec4 aColor; attribute vec2 aUv2; varying vec4 vC; varying vec2 vU; void main(){ vC=aColor; vU=aUv2; gl_Position=projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.); }`;
const STRIP_ADD_F = `varying vec4 vC; varying vec2 vU; void main(){ float e=abs(vU.y*2.-1.); float a=vC.a*(1.-smoothstep(.4,1.,e)); gl_FragColor=vec4(vC.rgb*a,a); }`;
const STRIP_INK_F = `${NOISE} varying vec4 vC; varying vec2 vU; void main(){ float e=abs(vU.y*2.-1.); if(e>.55+.45*n2(vec2(vU.x*18.,vU.y*3.))) discard; float a=vC.a*(1.-smoothstep(.6,1.,e)); if(a<.03) discard; gl_FragColor=vec4(vC.rgb,a); }`;
/* impacto: cúpula de sombra rasgada com núcleo lilás (aI = progresso, semente) */
const DOME_V = `attribute vec2 aI; varying vec2 vI; varying vec3 vP; varying vec3 vN; varying vec3 vW; void main(){ vI=aI; vP=position; vec4 w=modelMatrix*instanceMatrix*vec4(position,1.); vW=w.xyz; vN=normalize(mat3(modelMatrix)*mat3(instanceMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }`;
const DOME_F = `${NOISE} uniform float time; varying vec2 vI; varying vec3 vP; varying vec3 vN; varying vec3 vW;
void main(){ float k=vI.x, lat=clamp(vP.y,0.,1.), ang=atan(vP.z,vP.x), f=abs(dot(normalize(vN),normalize(cameraPosition-vW)));
 float veins=n2(vec2(ang*7.+vI.y*13.,lat*5.)), tear=n2(vec2(ang*3.+vI.y*5.,lat*3.-k*2.)); if(tear<.25+.6*smoothstep(.45,1.,k)||lat>.95-.4*veins*k) discard;
 vec3 c=vec3(.012,0.,.02)*(.6+.4*f); float v=smoothstep(.6,.68,veins)*(1.-smoothstep(.68,.78,veins)), live=1.-smoothstep(.15,.8,k);
 c+=vec3(.5,.18,1.)*v*live*1.3; c=mix(c,vec3(.88,.74,1.),smoothstep(.16,0.,lat)*live*.85); // veias violeta finas e borda lilás rente ao chão
 gl_FragColor=vec4(c,.93); }`;
const TEND_V = `attribute vec4 aT; varying vec4 vT; varying vec2 vU; void main(){ vT=aT; vU=uv; gl_Position=projectionMatrix*viewMatrix*modelMatrix*instanceMatrix*vec4(position,1.); }`;
const TEND_F = `${NOISE} varying vec4 vT; varying vec2 vU; void main(){ float d=abs(vU.x)+(n2(vec2(vU.y*9.+vT.w*7.,vU.x*2.))-.5)*.45; if(d>.95||vU.y>vT.y) discard; vec3 c=d<.18&&vU.y<.35?vec3(.7,.4,1.):vec3(.01,0.,.02); gl_FragColor=vec4(c,1.); }`;
const GLOW_V = `attribute vec4 aG; varying vec4 vG; varying vec2 vU; void main(){ vG=aG; vU=uv; vec4 c=viewMatrix*modelMatrix*instanceMatrix*vec4(0.,0.,0.,1.); c.xy+=position.xy*length(instanceMatrix[0].xyz); gl_Position=projectionMatrix*c; }`;
const GLOW_F = `varying vec4 vG; varying vec2 vU; void main(){ vec2 p=vU*2.-1.; float d=length(p); float a=exp(-d*d*5.)*vG.a; vec3 c=mix(vG.rgb,vec3(1.,.97,1.),exp(-d*d*16.)); gl_FragColor=vec4(c*a,a); }`;

function swordGeo(T, len) { // montante demoníaco procedural (+Y = ponta); partes: 0 aço, 1 gume, 2 guarda, 3 gema, 4 cabo, 5 runas
  const P = [], N = [], A = [], push = (g, part) => { g = g.index ? g.toNonIndexed() : g; g.computeVertexNormals(); const p = g.attributes.position, n = g.attributes.normal; for (let i = 0; i < p.count; i++) { P.push(p.getX(i), p.getY(i), p.getZ(i)); N.push(n.getX(i), n.getY(i), n.getZ(i)); A.push(part); } g.dispose(); };
  const blade = len * .7, grip = len * .22, s = len / 1.75;
  { const prof = [[0, .11], [.18, .14], [.45, .12], [.62, .135], [.82, .09], [.96, .03], [1, 0]], pos = [], idx = []; // lâmina larga angulosa, seção losango
    for (let i = 0; i < prof.length; i++) { const [u, w] = prof[i], y = .06 * s + u * blade, W = w * s, t = .026 * s * (1 - u * .6) + .002; pos.push(-W, y, 0, 0, y, t, W * .92, y, 0, 0, y, -t); if (i) { const a = (i - 1) * 4, b = i * 4; for (let k = 0; k < 4; k++) { const k1 = (k + 1) % 4; idx.push(a + k, b + k, a + k1, a + k1, b + k, b + k1); } } }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); push(g, 0);
    const e = [], ei = []; for (let i = 0; i < prof.length; i++) { const [u, w] = prof[i], y = .06 * s + u * blade, W = w * s; e.push(W * .92, y, 0, W * .92 + .022 * s, y, 0, -W, y, 0, -W - .022 * s, y, 0); if (i) { const a = (i - 1) * 4, b = i * 4; ei.push(a, b, a + 1, a + 1, b, b + 1, a + 2, a + 3, b + 2, b + 2, a + 3, b + 3); } }
    const ge = new T.BufferGeometry(); ge.setAttribute('position', new T.Float32BufferAttribute(e, 3)); ge.setIndex(ei); push(ge, 1);
    for (let r = 0; r < 9; r++) { const g2 = new T.PlaneGeometry(.022 * s, .045 * s); g2.translate((r % 2 ? .012 : -.012) * s, .3 * s + r * .085 * s, .03 * s * (1 - .3 * r / 9)); push(g2, 5); const g3 = g2.clone(); g3.rotateY(Math.PI); push(g3, 5); } }
  { const g = new T.BoxGeometry(.5 * s, .07 * s, .09 * s); g.translate(0, .03 * s, 0); push(g, 2); // guarda
    for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) { const c = new T.ConeGeometry(.035 * s, (.16 + .05 * i) * s, 4); c.rotateZ(sd * (1.2 + i * .35)); c.translate(sd * (.18 + i * .07) * s, (.06 - i * .03) * s, 0); push(c, 2); }
    const c2 = new T.ConeGeometry(.06 * s, .22 * s, 4); c2.translate(0, .17 * s, 0); push(c2, 2);
    const gem = new T.OctahedronGeometry(.055 * s, 0); gem.translate(0, .05 * s, .07 * s); push(gem, 3); const gem2 = gem.clone(); gem2.translate(0, 0, -.14 * s); push(gem2, 3); }
  { const g = new T.CylinderGeometry(.03 * s, .036 * s, grip, 7); g.translate(0, -grip / 2, 0); push(g, 4); const pm = new T.OctahedronGeometry(.06 * s, 0); pm.scale(1, 1.5, 1); pm.translate(0, -grip - .04 * s, 0); push(pm, 2); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(N, 3)); g.setAttribute('aPart', new T.Float32BufferAttribute(A, 1)); return g;
}
function tendrilGeo(T) { const pos = [], uv = [], idx = [], N = 8; for (let j = 0; j <= N; j++) { const y = j / N, w = .5 * (1 - y) ** .8 * (j % 2 ? .65 : 1) + .01, b = y * y * .4; pos.push(-w + b, y, 0, b, y, 0, w + b, y, 0); uv.push(-1, y, 0, y, 1, y); if (j < N) { const a = j * 3, c = a + 3; idx.push(a, c, a + 1, a + 1, c, c + 1, a + 1, c + 1, a + 2, a + 2, c + 1, c + 2); } }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); return g; }

export function createPortalSwordsVFX(T, scene) {
  const root = new T.Group(); root.name = 'VorgazhekPortalSwords'; scene.add(root); const geos = [], mats = [], uTime = { value: 0 };
  const M = new T.Matrix4(), Q = new T.Quaternion(), P = new T.Vector3(), S = new T.Vector3(), D = new T.Vector3(), E = new T.Vector3(), X = new T.Vector3(), Z = new T.Vector3(), UP = new T.Vector3(0, 1, 0), cam = new T.Vector3();
  const inst = (geo, vs, fs, n, attrs, o = {}) => { const arrs = {}; for (const [k, sz] of attrs) { arrs[k] = new Float32Array(n * sz); geo.setAttribute(k, new T.InstancedBufferAttribute(arrs[k], sz).setUsage(T.DynamicDrawUsage)); }
    const m = new T.ShaderMaterial({ vertexShader: vs, fragmentShader: fs, uniforms: { time: uTime }, toneMapped: false, fog: false, ...o }); mats.push(m); geos.push(geo); const mesh = new T.InstancedMesh(geo, m, n); mesh.frustumCulled = false; mesh.count = 0; root.add(mesh); return { mesh, arrs, n: 0, max: n, attrs }; };
  const disc = new T.CircleGeometry(1.15, 40); const portals = inst(disc, PORTAL_V, PORTAL_F, 24, [['aP', 2]], { transparent: true, depthWrite: false, side: T.DoubleSide }), backs = inst(new T.CircleGeometry(1.15, 24), PORTAL_V, BACK_F, 24, [['aP', 2]], { transparent: true, depthWrite: false, side: T.DoubleSide });
  portals.mesh.renderOrder = 3; backs.mesh.renderOrder = 2;
  const swords = inst(swordGeo(T, PORTAL_SWORDS.len), SWORD_V, SWORD_F, 30, [['aPlane', 4]], { side: T.DoubleSide });
  const domeG = new T.SphereGeometry(1, 28, 10, 0, Math.PI * 2, 0, Math.PI / 2), domes = inst(domeG, DOME_V, DOME_F, 14, [['aI', 2]], { side: T.DoubleSide, transparent: true, depthWrite: false }); domes.mesh.renderOrder = 5;
  const tends = inst(tendrilGeo(T), TEND_V, TEND_F, 200, [['aT', 4]], { side: T.DoubleSide });
  const glows = inst(new T.PlaneGeometry(1, 1), GLOW_V, GLOW_F, 60, [['aG', 4]], { transparent: true, depthWrite: false, depthTest: false, blending: T.AdditiveBlending }); glows.mesh.renderOrder = 8; // núcleo do impacto aparece através da cúpula
  const fragG = new T.OctahedronGeometry(1, 0); fragG.scale(.6, 1, .45); const fragM = new T.MeshStandardMaterial({ color: 0x07030a, emissive: 0x2a0a50, emissiveIntensity: .6, roughness: .8, flatShading: true }); mats.push(fragM); geos.push(fragG);
  const frags = new T.InstancedMesh(fragG, fragM, 160); frags.frustumCulled = false; frags.count = 0; root.add(frags);
  /* rastros: fitas dinâmicas (núcleo/carmim aditivos, manto negro normal) */
  function strips(max, frag, additive) { const pos = new Float32Array(max * 12), col = new Float32Array(max * 16), uv = new Float32Array(max * 8), idx = new Uint32Array(max * 6); for (let i = 0; i < max; i++) idx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 2, i * 4 + 1, i * 4 + 3], i * 6);
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3).setUsage(T.DynamicDrawUsage)); g.setAttribute('aColor', new T.BufferAttribute(col, 4).setUsage(T.DynamicDrawUsage)); g.setAttribute('aUv2', new T.BufferAttribute(uv, 2).setUsage(T.DynamicDrawUsage)); g.setIndex(new T.BufferAttribute(idx, 1));
    const m = new T.ShaderMaterial({ vertexShader: STRIP_V, fragmentShader: frag, transparent: true, depthWrite: false, side: T.DoubleSide, toneMapped: false, fog: false, blending: additive ? T.AdditiveBlending : T.NormalBlending }); mats.push(m); geos.push(g);
    const mesh = new T.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = additive ? 6 : 4; root.add(mesh); let q = 0; const s0 = new T.Vector3(), s1 = new T.Vector3();
    const side = (out, a, b, w) => { D.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); E.set(a[0] - cam.x, a[1] - cam.y, a[2] - cam.z); out.crossVectors(D, E); const l = out.length(); if (l < 1e-6) out.set(w, 0, 0); else out.multiplyScalar(w / l); };
    return { begin() { q = 0; }, seg(a, b, wa, wb, ca, cb, ua, ub) { if (q >= max) return; side(s0, a, b, wa); side(s1, a, b, wb); const o = q * 12; pos.set([a[0] - s0.x, a[1] - s0.y, a[2] - s0.z, a[0] + s0.x, a[1] + s0.y, a[2] + s0.z, b[0] - s1.x, b[1] - s1.y, b[2] - s1.z, b[0] + s1.x, b[1] + s1.y, b[2] + s1.z], o);
        col.set(ca, q * 16); col.set(ca, q * 16 + 4); col.set(cb, q * 16 + 8); col.set(cb, q * 16 + 12); uv.set([ua, 0, ua, 1, ub, 0, ub, 1], q * 8); q++; },
      end() { g.setDrawRange(0, q * 6); g.attributes.position.needsUpdate = g.attributes.aColor.needsUpdate = g.attributes.aUv2.needsUpdate = true; } };
  }
  const tCore = strips(260, STRIP_ADD_F, true), tInk = strips(200, STRIP_INK_F, false);
  const ghosts = []; // rastros que ficam no ar depois do impacto e se apagam
  let time = 0; const sm = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }, eo = x => 1 - (1 - Math.min(1, Math.max(0, x))) ** 3;
  const put = (I, vals) => { if (I.n >= I.max) return false; I.mesh.setMatrixAt(I.n, M); let o = 0; for (const [k, sz] of I.attrs) { I.arrs[k].set(vals.slice(o, o + sz), I.n * sz); o += sz; } I.n++; return true; };
  function drawTrail(pts, life, low) { const n = pts.length; if (n < 2) return; const step = low ? 2 : 1;
    for (let i = step; i < n; i += step) { const a = pts[i - step], b = pts[i], u0 = (i - step) / (n - 1), u1 = i / (n - 1), fa = u0 * life, fb = u1 * life;
      tInk.seg(a, b, .34 * fa + .05, .34 * fb + .05, [.02, 0, .01, .85 * fa], [.02, 0, .01, .85 * fb], u0, u1);
      tCore.seg(a, b, .2 * fa + .02, .2 * fb + .02, [.85, .04, .08, .8 * fa], [1, .1, .12, .85 * fb], u0, u1);
      tCore.seg(a, b, .05 * fa + .01, .05 * fb + .01, [1, .8, .7, .95 * fa], [1, .95, .9, fb], u0, u1); } }
  function impact(x, y, z, k, seed, low, sc = 1) { // k: 0..1 em ~0,7 s; sc menor no corpo do herói (não cobre a câmera)
    const g = eo(k / .3), R = (.9 + 1.3 * g) * sc;
    Q.identity(); P.set(x, y - .05, z); S.set(R, R * (.75 + .3 * g), R); M.compose(P, Q, S); put(domes, [k, seed]);
    if (k < .4) { P.set(x, y + .25, z); S.setScalar((3.2 * (1 - k / .4) + .5) * (.5 + .5 * sc)); M.compose(P, Q, S); put(glows, [.66, .4, 1, 1 - k / .4]); }
    const nt = low ? 8 : 14; for (let i = 0; i < nt; i++) { const a = (i / nt) * 6.283 + seed * 6.283 + (Math.sin(i * 7.3 + seed * 9) * .3), el = .25 + .9 * Math.abs(Math.sin(i * 3.1 + seed * 5)), L = (1.2 + 1.6 * Math.abs(Math.sin(i * 1.7 + seed))) * sc * eo(k / .22) * (1 - .3 * sm((k - .5) / .5));
      D.set(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el)); E.set(cam.x - x, cam.y - y, cam.z - z); X.crossVectors(D, E).normalize(); Z.crossVectors(X, D); M.makeBasis(X, D, Z); Q.setFromRotationMatrix(M); P.set(x + D.x * .25, y + .05 + D.y * .2, z + D.z * .25); S.set(.18 + .1 * Math.abs(Math.sin(i * 5 + seed)), L, 1); M.compose(P, Q, S);
      put(tends, [1, 1 - sm((k - .55) / .45), 0, seed + i * .13]); }
    if (frags.count < 160) for (let i = 0; i < (low ? 4 : 8); i++) { const a = seed * 6.283 + i * .9, v = 3 + 3 * Math.abs(Math.sin(i * 2.3 + seed * 7)), vy = 3 + 4 * Math.abs(Math.sin(i * 1.3 + seed * 3)), t = k * .7, yy = vy * t - 4.9 * t * t; if (yy < -.2) continue;
      P.set(x + Math.cos(a) * v * t, y + .1 + yy, z + Math.sin(a) * v * t); Q.setFromAxisAngle(UP, t * 9 + i); const s2 = .07 + .05 * (i % 3); S.set(s2, s2, s2); M.compose(P, Q, S); frags.setMatrixAt(frags.count++, M); } }
  return {
    root,
    update(ps, camera, dt, quality = 1) {
      time += dt; uTime.value = time; cam.copy(camera.position); const low = quality === 0;
      for (const I of [portals, backs, swords, domes, tends, glows]) I.n = 0; frags.count = 0; tCore.begin(); tInk.begin();
      if (ps) {
        for (const p of ps.st.portals) { if (p.state === 'closed' || p.state === 'gone') continue; const k = sm(p.k) * (1 + .03 * Math.sin(time * 3 + p.seed * 9)); D.set(p.nx, p.ny, p.nz); Q.setFromUnitVectors(new T.Vector3(0, 0, 1), D);
          P.set(p.x, p.y + .05 * Math.sin(time * 1.3 + p.seed * 6), p.z); S.set(1, 1, 1); M.compose(P, Q, S); put(portals, [k, p.seed]);
          P.addScaledVector(D, -.18); S.set(.92, .92, .92); M.compose(P, Q, S); put(backs, [k, p.seed]); }
        for (const s of ps.st.swords) {
          if (s.state === 'draw' || s.state === 'ready' || s.state === 'fly') { const p = ps.st.portals[s.portal]; D.set(s.dx, s.dy, s.dz).normalize(); Q.setFromUnitVectors(UP, D); P.set(s.x, s.y, s.z); S.set(1, 1, 1); M.compose(P, Q, S);
            const plane = s.state === 'draw' ? [p.nx, p.ny, p.nz, p.nx * p.x + p.ny * p.y + p.nz * p.z - .02] : [0, 0, 0, -1e6]; put(swords, plane);
            if (s.state === 'ready') { P.set(s.x + s.dx * PORTAL_SWORDS.len * .7, s.y + s.dy * PORTAL_SWORDS.len * .7, s.z + s.dz * PORTAL_SWORDS.len * .7); Q.identity(); S.setScalar(.55 + .1 * Math.sin(time * 14 + s.portal)); M.compose(P, Q, S); put(glows, [1, .1, .12, .6]); } // brilho de antecipação na ponta
            if (s.state === 'fly' && s.trail) drawTrail(s.trail, 1, low); }
          else if (s.state === 'impact') { if (s.kind !== 'timeout') impact(s.ix, s.iy, s.iz, s.t / .7, (s.portal * 7.13 + s.n * 3.1) % 1, low, s.kind === 'hero' ? .45 : 1); if (s.trail && !s.ghost) { s.ghost = true; ghosts.push({ pts: s.trail.slice(), t: 0 }); } } }
      }
      for (let i = ghosts.length - 1; i >= 0; i--) { const g = ghosts[i]; g.t += dt; if (g.t > .35 || ghosts.length > 10) { ghosts.splice(i, 1); continue; } drawTrail(g.pts, 1 - g.t / .35, low); }
      for (const I of [portals, backs, swords, domes, tends, glows]) { I.mesh.count = I.n; I.mesh.instanceMatrix.needsUpdate = true; for (const [k] of I.attrs) I.mesh.geometry.attributes[k].needsUpdate = true; }
      frags.instanceMatrix.needsUpdate = true; tCore.end(); tInk.end();
    },
    clear() { ghosts.length = 0; for (const I of [portals, backs, swords, domes, tends, glows]) { I.n = 0; I.mesh.count = 0; } frags.count = 0; tCore.begin(); tCore.end(); tInk.begin(); tInk.end(); },
    dispose() { scene.remove(root); for (const g of geos) g.dispose(); for (const m of mats) m.dispose(); frags.dispose(); }
  };
}
