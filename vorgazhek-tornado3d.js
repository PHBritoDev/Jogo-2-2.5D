/**
 * MOD 256 — VORGAZHEK (Bispo 2), Habilidade 1: VÓRTICES DO PACTO ESCARLATE.
 *
 * Lógica pura (createTornadoRitual, testável em node) + VFX (createTornadoVFX) dirigidos pelo MESMO relógio.
 * Estados: windup → onda 1 (selos → formação 1,3 s → plenitude 1,3 s → dissipação) → pausa → onda 2 → fim.
 * Cada onda: 5 selos/tornados recalculados em volta da posição ATUAL do jogador (só entre ondas); um deles pressiona
 * perto (força a reagir), os outros cercam em arco deixando saída. Dano assim que a formação começa, nunca no pré-aviso;
 * sucção progressiva em até 9,5 m prioriza a fonte mais forte (não acumula 5 forças), dash reduz a pressão;
 * hitbox acompanha o corpo visível, tique com recarga por alvo (sem acumular por sobreposição),
 * i-frames do dash respeitados. Duas ondas por ativação, nunca infinitas.
 *
 * Arte (referências do criador): o selo é a PRÓPRIA arte enviada (vorgazhek-selo-ritual.png: recorte de alfa do fundo
 * preto, interior escuro preservado), revelada do centro para fora e girando devagar; o tornado é 3D: 4 faixas largas
 * helicoidais preto-carmim de bordas recortadas com fios vermelhos e cortes brancos/rosados, em volta de um NÚCLEO
 * helicoidal escuro com fendas incandescentes (contra-rotação). Base estreita, topo largo e irregular; gira desde o
 * primeiro quadro, compõe-se de baixo para cima e se desfaz de cima para baixo pelas próprias fitas.
 */
export const VORGAZHEK_TORNADO_BUILD = '259-suction-range-9p5';
export const TORNADO = { windup: .6, form: 1.3, hold: 1.3, dissolve: .8, gap: .5, waves: 2, min: 5, max: 5, R: 1.55, H: 7.2, ring: [3, 5.6], near: [1, 1.8], activeAt: 0, tick: .6, dmg: 10, pullRange: 9.5, pullSpeed: 6.1, dashResistance: .17 };
const sm = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };

/** Ritual puro: opts { rand, ground(x,z), blocked(x,z), dmg, R } */
export function createTornadoRitual(opts = {}) {
  const T = { ...TORNADO, ...(opts.T || {}) }, rand = opts.rand || Math.random, ground = opts.ground || (() => 0), blocked = opts.blocked || (() => false), R = opts.R || T.R, dmg = opts.dmg || T.dmg;
  const st = { phase: 'idle', t: 0, wave: 0, tornados: [], lastHit: -9, clock: 0, done: false, aborted: false };
  function layout(px, pz) { // 5 posições em volta do jogador, com pressão perto e saídas abertas
    const n = T.min + Math.floor(rand() * (T.max - T.min + 1)), out = [], a0 = rand() * Math.PI * 2, gap = Math.PI * (.55 + .25 * rand());
    const tryPut = (x, z) => { if (blocked(x, z)) return false; for (const o of out) if (Math.hypot(o.x - x, o.z - z) < R * 1.8) return false; out.push({ x, z }); return true; };
    for (let k = 0; k < 10; k++) { const a = a0 + rand() * 6.283, d = T.near[0] + rand() * (T.near[1] - T.near[0]); if (tryPut(px + Math.cos(a) * d, pz + Math.sin(a) * d)) break; } // um pressiona perto
    const span = Math.PI * 2 - gap, ring = n - out.length; // os outros cercam em arco, deixando uma saída (gap)
    for (let s = 0; s < ring; s++) for (let k = 0; k < 6; k++) { const a = a0 + gap / 2 + span * (s + .5) / ring + (rand() - .5) * .3, d = T.ring[0] + rand() * (T.ring[1] - T.ring[0]); if (tryPut(px + Math.cos(a) * d, pz + Math.sin(a) * d)) break; }
    for (let k = 0; out.length < T.min && k < 40; k++) { const a = rand() * 6.283, d = T.ring[0] + rand() * (T.ring[1] - T.ring[0]); tryPut(px + Math.cos(a) * d, pz + Math.sin(a) * d); }
    for (let k = 0; out.length < T.min; k++) { const a = a0 + k * 2.1; out.push({ x: px + Math.cos(a) * T.ring[1], z: pz + Math.sin(a) * T.ring[1] }); } // terreno muito bloqueado: nunca menos de 3
    return out.slice(0, T.max).map((p, i) => ({ ...p, y: ground(p.x, p.z), i, seed: rand(), t: 0, grow: 0, dis: 0, seal: 0, active: false, state: 'seal', delay: i * .06 }));
  }
  function radiusOf(o) { return R * .78 * (.35 + .65 * sm(o.grow)) * (1 - .6 * o.dis); }
  const api = {
    T, R, st, radiusOf,
    /** Sucção (m/s): escolhe o tornado mais forte, sem somar cinco forças.
     * O dash vence a pressão; o motor aplica deslocamento com colisões. */
    pullAt(x, z, dashing = false) {
      if (st.done || st.aborted || st.phase !== 'wave') return null;
      let strongest = 0, pullX = 0, pullZ = 0;
      for (const o of st.tornados) {
        if (!o.active || (o.state !== 'form' && o.state !== 'hold' && o.state !== 'dissolve')) continue;
        const dx = o.x - x, dz = o.z - z, dist = Math.hypot(dx, dz);
        const maturity = sm(o.grow), fade = 1 - sm(o.dis);
        const reach = T.pullRange * (.78 + .22 * maturity) * fade;
        if (dist < .08 || dist >= reach || reach < .1) continue;
        const attenuation = Math.pow(1 - dist / reach, .65);
        const speed = T.pullSpeed * (.42 + .58 * maturity) * attenuation * fade;
        if (speed <= strongest) continue;
        strongest = speed;
        // Componente tangencial discreta: rotação sem anular a fuga.
        const swirl = .13 * maturity;
        pullX = (dx - dz * swirl) / dist * speed;
        pullZ = (dz + dx * swirl) / dist * speed;
      }
      if (!strongest) return null;
      const factor = dashing ? T.dashResistance : 1;
      return { x: pullX * factor, z: pullZ * factor, strength: strongest * factor };
    },
    get done() { return st.done; },
    start(p) { st.phase = 'windup'; st.t = 0; st.wave = 0; st.done = false; st.aborted = false; st.tornados = []; st.anchor = { x: p.x, z: p.z }; return api; },
    /** Encerramento sistêmico (morte, saída, troca de dimensão): tudo se desfaz rápido, sem dano e sem nova onda. */
    abort() { if (st.done || st.aborted) return; st.aborted = true; for (const o of st.tornados) if (o.state !== 'gone') { o.state = 'dissolve'; o.fast = true; } if (!st.tornados.length) st.done = true; st.phase = 'end'; },
    /** Um passo. player {x,z,iframes,radius}. Devolve eventos: {type:'hit',dmg} | 'wave' | 'active' | 'end'. */
    step(dt, player) {
      const ev = []; if (st.done) return ev; st.t += dt; st.clock += dt;
      if (st.phase === 'windup' && st.t >= T.windup) { st.phase = 'wave'; st.t = 0; st.wave = 1; st.tornados = layout(player.x, player.z); ev.push({ type: 'wave', n: st.wave, count: st.tornados.length }); }
      else if (st.phase === 'gap' && st.t >= T.gap) { st.phase = 'wave'; st.t = 0; st.wave++; st.tornados = layout(player.x, player.z); ev.push({ type: 'wave', n: st.wave, count: st.tornados.length }); }
      for (const o of st.tornados) {
        o.t += dt; const k = o.t - o.delay; if (k < 0) continue;
        if (o.state === 'seal') { o.seal = Math.min(1, k / .55); o.grow = 0; if (o.seal >= 1 && !st.aborted) { o.state = 'form'; o.ft = 0; o.active = true; ev.push({ type: 'active', i: o.i }); } } // o selo se completa antes do vórtice
        else if (o.state === 'form') { o.ft += dt; o.grow = Math.min(1, o.ft / T.form); if (o.ft >= T.form) { o.state = 'hold'; o.ht = 0; } }
        else if (o.state === 'hold') { o.ht += dt; o.grow = 1; if (o.ht >= T.hold) { o.state = 'dissolve'; o.dt = 0; } }
        else if (o.state === 'dissolve') { o.dt = (o.dt || 0) + dt; o.dis = Math.min(1, o.dt / (o.fast ? .4 : T.dissolve)); if (o.dis > .4 || o.fast) o.active = false; o.seal = 1 - sm(o.dis); if (o.dis >= 1) o.state = 'gone'; }
      }
      // dano: hitbox = raio atual do tornado; um tique por alvo a cada T.tick (sobreposições não somam)
      if (!st.aborted && !player.iframes && st.clock - st.lastHit >= T.tick) {
        for (const o of st.tornados) { if (!o.active) continue; if (Math.hypot(player.x - o.x, player.z - o.z) < radiusOf(o) + (player.radius || .4) * .5) { st.lastHit = st.clock; ev.push({ type: 'hit', dmg, i: o.i, x: o.x, z: o.z }); break; } }
      }
      if (st.phase === 'wave' && st.tornados.length && st.tornados.every(o => o.state === 'gone')) { // a próxima onda só depois que TODOS sumiram
        if (st.wave >= T.waves) { st.phase = 'end'; st.done = true; st.tornados = []; ev.push({ type: 'end' }); } else { st.phase = 'gap'; st.t = 0; st.tornados = []; }
      }
      if (st.aborted && (!st.tornados.length || st.tornados.every(o => o.state === 'gone'))) { st.done = true; st.tornados = []; ev.push({ type: 'end', aborted: true }); }
      return ev;
    }
  };
  return api;
}

/* ---------------- VFX ---------------- */
const NOISE = `float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}`;
const SEAL_V = `varying vec2 vU; void main(){ vU=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const SEAL_F = `${NOISE} uniform sampler2D map; uniform float reveal, alpha, pulse, rot, time; varying vec2 vU;
void main(){ vec2 c=vU-.5; float r=length(c)*2., a=atan(c.y,c.x); if(r>1.) discard;
 float edge=reveal*1.08+.06*(n2(vec2(a*6.,time*2.))-.5); if(r>edge) discard; // traçado nasce do centro para fora
 float cs=cos(rot), sn=sin(rot); vec2 q=vec2(c.x*cs-c.y*sn, c.x*sn+c.y*cs)+.5; vec4 t=texture2D(map,q);
 vec3 col=t.rgb; float red=step(col.g*1.6+.05,col.r); col=mix(col,col*vec3(1.6,.6,.7)+vec3(.25,0.,.02),red*pulse);
 col+=vec3(.6,0.,.05)*smoothstep(edge-.06,edge,r)*step(reveal,.99); float a2=t.a*alpha; if(a2<.03) discard; gl_FragColor=vec4(col,a2); }`;
const TOR_V = `attribute float aU, aV, aK, aCore; uniform float time, grow, dis, H, R, seed, spin; varying float vU, vV, vCore, vK; varying vec3 vN, vVw;
void main(){ float u=aU, g=smoothstep(0.,1.,grow); vU=u; vV=aV; vCore=aCore; vK=aK;
 float ph=aK*1.0472+seed*6.283+aCore*1.1+sin(aK*2.7)*.4, turns=aCore>.5?2.6:1.35+.12*sin(aK*1.9);
 float lay=.86+.14*sin(aK*2.1); float Hn=H*(.18+.82*g)*(1.-.25*dis), base=aCore>.5?R*(.2+.25*u):R*(.36+1.55*pow(u,1.1))*lay;
 float rr=base*(.38+.62*g)*(1.+.16*sin(u*8.+aK*2.3+time*2.6)+.08*sin(u*23.+seed*9.));
 float ang=ph+u*turns*6.2832-time*spin*(aCore>.5?-1.25:1.)+(aV-.5)*(aCore>.5?.5:.32);
 float bw=(aCore>.5?.8:1.)*(.55+.45*g)*(1.-u*.15)*H*(aCore>.5?.16:.22)*(.55+.45*smoothstep(.0,.3,u));
 vec3 p=vec3(cos(ang)*rr, u*Hn+(aV-.5)*bw, sin(ang)*rr);
 vec4 w=modelMatrix*vec4(p,1.); vN=normalize(mat3(modelMatrix)*vec3(cos(ang),.25,sin(ang))); vVw=cameraPosition-w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
const TOR_F = `${NOISE} uniform float time, grow, dis, seed; varying float vU, vV, vCore, vK; varying vec3 vN, vVw;
void main(){ float n=n2(vec2(vU*14.+vK*3.,vV*3.+time*2.)), n2b=n2(vec2(vU*40.-time*6.+vK*7.,vV*9.));
 float reveal=min(1.,grow*1.18)+.05*(n-.5); if(vU>reveal) discard; // compõe-se de baixo para cima
 if(vU>1.-dis*1.15+.08*(n-.5)) discard; // desfaz de cima para baixo pelas fitas
 float e=min(vV,1.-vV); if(e<.06+.2*n2(vec2(vU*34.+vK*5.,time*3.))) discard; // bordas afiadas e recortadas
 if(vCore<.5&&n2(vec2(vU*48.+vK*11.,vV*3.))>.78&&e<.34) discard; // rasgos de pincel
 if(vU<.02) discard;
 float f=abs(dot(normalize(vN),normalize(vVw)));
 vec3 c;
 if(vCore>.5){ c=vec3(.04,0.,.01); float fis=smoothstep(.78,.95,n2(vec2(vU*26.-time*7.,vV*4.+vK))); c=mix(c,vec3(1.,.1,.12),fis); c=mix(c,vec3(1.,.92,.94),smoothstep(.9,.99,n2b)); c=mix(c,vec3(1.,.7,.78),(1.-smoothstep(0.,.4,vU))*.7); }
 else { float body=smoothstep(.15,.55,e); c=mix(vec3(.012,0.,.004),vec3(.3,0.,.035),body*(.25+.75*n)); // preto → carmim
  float thread=smoothstep(.9,.99,sin((vV*6.+n*.9+n2(vec2(vU*9.,vK))*.6)*3.1416))*smoothstep(.25,.6,n2(vec2(vU*7.+vK*3.,vV*2.))); c=mix(c,vec3(.95,.04,.08),thread*.95); // fios vermelhos ao longo da faixa
  float hot=smoothstep(.8,.96,n2b)*smoothstep(.2,.45,e); c=mix(c,vec3(1.,.82,.88),hot); // cortes brancos/rosados
  float glowBase=(1.-smoothstep(.0,.35,vU))*smoothstep(.3,.6,e)*.75; c=mix(c,vec3(1.,.55,.65),glowBase*(.5+.5*n)); // base quente branco-rosada (referência)
  c*=.6+.55*f; c=mix(c,vec3(.005,0.,0.),smoothstep(.2,.06,e)); }
 gl_FragColor=vec4(c,1.); }`;

/** VFX: { T (three), scene, base (URL dos assets) }. update(ritual, camera, quality) a cada quadro; clear(); dispose(). */
export function createTornadoVFX(T, scene, { base = './' } = {}) {
  const root = new T.Group(); root.name = 'VorgazhekTornados'; scene.add(root); const geos = [], mats = [], uTime = { value: 0 };
  const tex = new T.TextureLoader().load(base + 'vorgazhek-selo-ritual.png?v=mod257'); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 4;
  const sealG = new T.PlaneGeometry(1, 1); sealG.rotateX(-Math.PI / 2); geos.push(sealG);
  const sealMat = new T.ShaderMaterial({ vertexShader: SEAL_V, fragmentShader: SEAL_F, uniforms: { map: { value: tex }, reveal: { value: 0 }, alpha: { value: 1 }, pulse: { value: 0 }, rot: { value: 0 }, time: uTime }, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, toneMapped: false, fog: false });
  /** faixas: 4 externas + 2 do núcleo, N segmentos ao longo da altura, 2 bordas */
  function torGeo(N) { const pos = [], aU = [], aV = [], aK = [], aC = [], idx = []; let base = 0;
    for (const [k, core] of [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [0, 1], [3, 1]]) { for (let i = 0; i <= N; i++) for (let j = 0; j < 2; j++) { pos.push(0, 0, 0); aU.push(i / N); aV.push(j); aK.push(k); aC.push(core); }
      for (let i = 0; i < N; i++) { const a = base + i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } base += (N + 1) * 2; }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('aU', new T.Float32BufferAttribute(aU, 1)); g.setAttribute('aV', new T.Float32BufferAttribute(aV, 1));
    g.setAttribute('aK', new T.Float32BufferAttribute(aK, 1)); g.setAttribute('aCore', new T.Float32BufferAttribute(aC, 1)); g.setIndex(idx); g.boundingSphere = new T.Sphere(new T.Vector3(0, 4, 0), 9); return g; }
  const torHi = torGeo(56), torLo = torGeo(30); geos.push(torHi, torLo);
  const torMat = new T.ShaderMaterial({ vertexShader: TOR_V, fragmentShader: TOR_F, uniforms: { time: uTime, grow: { value: 0 }, dis: { value: 0 }, H: { value: 7 }, R: { value: 1.5 }, seed: { value: 0 }, spin: { value: 6.0 } }, side: T.DoubleSide, toneMapped: false, fog: false });
  const pool = []; for (let i = 0; i < 5; i++) { const sm2 = sealMat.clone(); sm2.uniforms.time = uTime; sm2.uniforms.map.value = tex; const tm = torMat.clone(); tm.uniforms.time = uTime; mats.push(sm2, tm);
    const seal = new T.Mesh(sealG, sm2); seal.renderOrder = 2; seal.frustumCulled = false; seal.visible = false; const tor = new T.Mesh(torHi, tm); tor.frustumCulled = false; tor.visible = false; root.add(seal, tor); pool.push({ seal, tor }); }
  mats.push(sealMat, torMat);
  const debG = new T.OctahedronGeometry(1, 0); debG.scale(.6, 1, .5); geos.push(debG); const debM = new T.MeshStandardMaterial({ color: 0x150406, emissive: 0x500008, emissiveIntensity: .8, roughness: .7, flatShading: true }); mats.push(debM);
  const deb = new T.InstancedMesh(debG, debM, 40); deb.frustumCulled = false; deb.count = 0; root.add(deb);
  const M = new T.Matrix4(), Q = new T.Quaternion(), P = new T.Vector3(), S = new T.Vector3(), E = new T.Euler(), UP = new T.Vector3(0, 1, 0); let time = 0;
  const sm3 = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
  return {
    root,
    update(ritual, dt, quality = 1, slope) {
      time += dt; uTime.value = time; let dn = 0; const low = quality === 0, list = ritual ? ritual.st.tornados : [];
      for (let i = 0; i < pool.length; i++) { const p = pool[i], o = list[i]; if (!o || o.state === 'gone') { p.seal.visible = p.tor.visible = false; continue; }
        const R = ritual.R, H = ritual.T.H, k = Math.max(0, o.t - o.delay); p.seal.visible = true; p.seal.position.set(o.x, o.y + .05, o.z); const sz = R * 2.9; p.seal.scale.set(sz, 1, sz);
        if (slope) { const n = slope(o.x, o.z); P.set(n[0], n[1], n[2]).normalize(); Q.setFromUnitVectors(UP, P); p.seal.quaternion.copy(Q); }
        const su = p.seal.material.uniforms; su.reveal.value = o.state === 'seal' ? sm3(o.seal) : 1; su.alpha.value = o.state === 'dissolve' ? 1 - sm3(o.dis) : 1; su.pulse.value = o.active ? .6 + .4 * Math.sin(time * 9) : o.state === 'form' ? .25 : 0; su.rot.value = time * .35 + o.seed * 6.28;
        p.tor.visible = o.state !== 'seal'; p.tor.geometry = low ? torLo : torHi; p.tor.position.set(o.x, o.y, o.z); const tu = p.tor.material.uniforms; tu.grow.value = o.grow; tu.dis.value = o.dis; tu.H.value = H * (.92 + .16 * o.seed); tu.R.value = R; tu.seed.value = o.seed; tu.spin.value = 5.8 + o.seed * 1.2;
        if (p.tor.visible) for (let j = 0; j < (low ? 3 : 7) && dn < 40; j++) { const u = (time * (.45 + .2 * Math.sin(j + o.seed * 9)) + j / 7 + o.seed) % 1, a = j * 2.4 + time * (2.6 + j * .2), r = R * (.6 + 1.2 * u) * (.4 + .6 * sm3(o.grow));
          P.set(o.x + Math.cos(a) * r, o.y + .2 + u * H * .55 * sm3(o.grow), o.z + Math.sin(a) * r); E.set(time * 3 + j, a, j); Q.setFromEuler(E); const s = (.07 + .06 * ((j * 7) % 3)) * (1 - u) * (1 - o.dis); S.set(s, s, s); M.compose(P, Q, S); deb.setMatrixAt(dn++, M); } }
      deb.count = dn; deb.instanceMatrix.needsUpdate = true;
    },
    clear() { for (const p of pool) p.seal.visible = p.tor.visible = false; deb.count = 0; },
    dispose() { scene.remove(root); for (const g of geos) g.dispose(); for (const m of mats) m.dispose(); tex.dispose(); deb.dispose(); }
  };
}
