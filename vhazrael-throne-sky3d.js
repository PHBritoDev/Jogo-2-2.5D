/**
 * Mod 320 — Ruptura do Trono: EVENTO NO CÉU durante a carga + SEGUNDA EXPLOSÃO no mesmo epicentro.
 * Só desenha o estado de vhazrael3d.js (o dano da segunda explosão é resolvido lá, pela frente `T.second`).
 *
 * Céu (raise → charge → slash, devolvido em ~1,6 s depois do impacto):
 *   uma casca esférica distante (raio 560, atrás de tudo, sem escrever profundidade) desenha sobre o céu real uma
 *   FISSURA carmim recortada acima do bispo, HALOS concêntricos que respiram em volta dela e escurece a abóbada ao redor;
 *   RAIOS geométricos estreitos descem de pontos do halo e CONVERGEM no centro da lâmina (fitas do kit, pooled).
 *   A luz da arena já cai por `s.dim` (mundo aplica); aqui nada muda no clima global, e tudo some quando o feitiço acaba.
 *
 * Segunda explosão (referência de ESCALA do GIF do criador — bola de fogo colossal com núcleo branco/amarelo, casca laranja
 * escura, anéis de pressão, veios de raio, coluna em cogumelo e poeira — com identidade ORIGINAL do VHAZRAEL: obsidiana,
 * rachaduras rubras incandescentes, raios violeta e chama recortada):
 *   impacto → anel de AVISO no chão (raio real do dano) + compressão do núcleo (sucção) → em T.blast (.6 s) DETONAÇÃO:
 *   esfera que cresce até o raio do dano em T.second.grow, sobe e se achata em CAPUZ sobre uma COLUNA, esfria de
 *   branco→laranja→carmim→obsidiana rachada; anel de pressão largo rente ao chão, veios violeta; sem flash que cega.
 * Três malhas + um disco: nenhuma alocação por quadro.
 */
const NOISE = `float h3(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float n3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fb(vec3 p){return n3(p)*.55+n3(p*2.07+3.1)*.3+n3(p*4.3+7.7)*.15;}`;

/* bola de fogo / capuz / coluna: casca deslocada por ruído que sobe; heat 1 = branco, 0 = obsidiana fria */
const FIRE_V = `${NOISE} uniform float time, heat, seed, puff; varying vec3 vN; varying vec3 vV; varying vec3 vP; varying float vD;
void main(){ vec3 p=position; float d=fb(normalize(p)*2.6+vec3(0.,-time*1.6,seed)); vD=d; p+=normal*(d-.45)*puff;
 vec4 w=modelMatrix*vec4(p,1.); vN=normalize(mat3(modelMatrix)*normal); vV=cameraPosition-w.xyz; vP=position; gl_Position=projectionMatrix*viewMatrix*w; }`;
const FIRE_F = `${NOISE} uniform float time, heat, seed, alpha, crack; varying vec3 vN; varying vec3 vV; varying vec3 vP; varying float vD;
void main(){ if(length(vV)<3.2) discard; vec3 n=normalize(vN), v=normalize(vV); float f=clamp(dot(n,v),0.,1.);
 float g=fb(vP*3.1+vec3(seed,-time*2.2,0.)), cr=smoothstep(.62,.7,fb(vP*5.3+vec3(0.,-time*.6,seed*2.)));
 float t=clamp(heat*(.3+.62*f*f)+(g-.5)*.32,0.,1.); /* branco só no miolo voltado à câmera: casca laranja/carmim domina, sem estourar a tela */
 vec3 obs=vec3(.035,.012,.03), crim=vec3(.62,.02,.07), ora=vec3(1.,.38,.07), yel=vec3(1.,.86,.45), wht=vec3(1.,.97,.9);
 vec3 c=t<.25?mix(obs,crim,t/.25):t<.5?mix(crim,ora,(t-.25)/.25):t<.78?mix(ora,yel,(t-.5)/.28):mix(yel,wht,(t-.78)/.22);
 c+=vec3(1.,.12,.08)*cr*crack*(1.-heat*.6)*1.6; c+=vec3(.5,.18,1.)*pow(1.-f,3.)*.35*heat;
 float a=alpha*smoothstep(.04,.2,g+.25*f); if(a<.02) discard; gl_FragColor=vec4(c*(.85+.3*heat),a); }`;

/* anel de pressão / aviso: disco no chão com uv radial */
const RING_F = `uniform float time, r0, r1, alpha, warn; varying vec2 vUv;
void main(){ float r=length(vUv-.5)*2.; float edge=smoothstep(r0-.05,r0,r)*(1.-smoothstep(r1,r1+.04,r));
 float ticks=step(.5,fract(atan(vUv.y-.5,vUv.x-.5)*7.6394+time*warn*2.));
 vec3 c=mix(vec3(1.,.55,.25),vec3(1.,.08,.12),warn); float a=edge*alpha*(warn>.5?(.55+.45*ticks):1.); if(a<.01) discard; gl_FragColor=vec4(c,a); }`;
const RING_V = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;

/* céu: casca esférica BackSide, fissura e halos em volta da direção dir */
const SKY_V = `varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz-cameraPosition; gl_Position=projectionMatrix*viewMatrix*w; }`;
const SKY_F = `${NOISE} uniform float time, k, crackK; uniform vec3 dir, side; varying vec3 vW;
void main(){ vec3 d=normalize(vW); float c=dot(d,dir); if(c<.15) discard; vec3 up=normalize(cross(side,dir)); vec2 q=vec2(dot(d,side),dot(d,up))/max(c,.2);
 float r=length(q); float dark=k*.62*smoothstep(1.9,.2,r);
 float halo=0.; for(int i=0;i<3;i++){ float R=.16+float(i)*.17+.025*sin(time*1.7+float(i)*2.); halo+=exp(-pow((r-R)*60.,2.))*(1.-float(i)*.3); }
 float jag=(fb(vec3(q.x*6.,time*.4,1.))-.5)*.16+(fb(vec3(q.x*19.,2.,time*.2))-.5)*.05;
 float L=crackK*1.6, along=smoothstep(L,L*.6,abs(q.x)); float w=(.008+.045*(1.-abs(q.x)/max(L,.01)))*along;
 float fis=smoothstep(w,0.,abs(q.y-jag)); float glow=smoothstep(w*8.,0.,abs(q.y-jag))*along;
 vec3 col=vec3(.02,0.,.012)*dark; col+=vec3(.9,.03,.1)*halo*k*.55+vec3(1.,.92,.85)*fis*crackK+vec3(.85,.02,.08)*glow*crackK*.9;
 float a=clamp(dark+halo*k*.45+fis*crackK+glow*crackK*.6,0.,1.); if(a<.01) discard; gl_FragColor=vec4(col,a); }`;

export function createThroneSkyVFX(T, { root, rib, glow, boltRib, ground }) {
  const geos = [], mats = [], uTime = { value: 0 }, A = new T.Vector3(), B = new T.Vector3(), cam = new T.Vector3();
  const fireMat = (seed, puff) => { const m = new T.ShaderMaterial({ vertexShader: FIRE_V, fragmentShader: FIRE_F, uniforms: { time: uTime, heat: { value: 1 }, seed: { value: seed }, puff: { value: puff }, alpha: { value: 1 }, crack: { value: 0 } }, transparent: true, depthWrite: false, side: T.FrontSide, toneMapped: false, fog: false }); mats.push(m); return m; };
  const ball = new T.IcosahedronGeometry(1, 4), col = new T.CylinderGeometry(.55, 1, 1, 24, 8, true); col.translate(0, .5, 0); geos.push(ball, col);
  const cap = new T.Mesh(ball, fireMat(3.1, .55)), core = new T.Mesh(ball, fireMat(7.7, .25)), stem = new T.Mesh(col, fireMat(1.3, .35));
  for (const o of [cap, core, stem]) { o.visible = false; o.frustumCulled = false; root.add(o); } cap.renderOrder = 6; core.renderOrder = 7; stem.renderOrder = 5;
  const disc = new T.PlaneGeometry(2, 2); disc.rotateX(-Math.PI / 2); geos.push(disc);
  const ringMat = warn => { const m = new T.ShaderMaterial({ vertexShader: RING_V, fragmentShader: RING_F, uniforms: { time: uTime, r0: { value: .9 }, r1: { value: 1 }, alpha: { value: 0 }, warn: { value: warn } }, transparent: true, depthWrite: false, side: T.DoubleSide, toneMapped: false, fog: false }); mats.push(m); return m; };
  const warnRing = new T.Mesh(disc, ringMat(1)), pressRing = new T.Mesh(disc, ringMat(0));
  for (const o of [warnRing, pressRing]) { o.visible = false; o.frustumCulled = false; o.renderOrder = 4; root.add(o); }
  const skyG = new T.SphereGeometry(560, 48, 24); geos.push(skyG);
  const skyM = new T.ShaderMaterial({ vertexShader: SKY_V, fragmentShader: SKY_F, uniforms: { time: uTime, k: { value: 0 }, crackK: { value: 0 }, dir: { value: new T.Vector3(0, 1, 0) }, side: { value: new T.Vector3(1, 0, 0) } }, side: T.BackSide, transparent: true, depthWrite: false, toneMapped: false, fog: false });
  mats.push(skyM); const sky = new T.Mesh(skyG, skyM); sky.visible = false; sky.frustumCulled = false; sky.renderOrder = -5; root.add(sky);
  const RED = [1, .06, .14], WHITE = [1, .95, .9], VIOL = [.62, .25, 1], c4 = (c, a) => [c[0], c[1], c[2], a];
  const smooth = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
  let skyK = 0, stats = { sky: 0, rays: 0, second: 0, warn: 0 };

  function skyEvent(s, blade, boss, low) {
    const T0 = s.T, pre = s.phase === 'raise' ? smooth(s.age / T0.raise) * .55 : s.phase === 'charge' ? .55 + .45 * smooth((s.age - T0.raise) / (T0.charge - T0.raise)) : s.phase === 'slash' ? 1 : 0;
    const post = s.phase === 'wave' ? 1 : s.phase === 'impact' ? 1 - smooth(s.t / 1.6) : 0, target = Math.max(pre, post);
    skyK = target; if (skyK < .01) return;
    const bx = boss ? boss.x : s.x, bz = boss ? boss.z : s.z;
    A.set(bx - cam.x, 0, bz - cam.z); if (A.lengthSq() < 1) A.set(s.dx, 0, s.dz); A.normalize(); // a fissura abre ACIMA do bispo, no céu que a câmera vê
    const dir = skyM.uniforms.dir.value.set(A.x * .55, .83, A.z * .55).normalize(); skyM.uniforms.side.value.set(-A.z, 0, A.x).normalize();
    skyM.uniforms.k.value = skyK; skyM.uniforms.crackK.value = s.phase === 'raise' ? .25 * smooth(s.age / T0.raise) : Math.min(1, skyK * 1.05);
    sky.position.copy(cam); sky.visible = true; stats.sky = +skyK.toFixed(2);
    // raios geométricos convergindo no CENTRO da lâmina (só enquanto a lâmina existe: carga/corte)
    if (blade && (s.phase === 'charge' || s.phase === 'slash')) {
      const mx = (blade.a.x + blade.b.x) / 2, my = (blade.a.y + blade.b.y) / 2, mz = (blade.a.z + blade.b.z) / 2, n = low ? 4 : 8, R = 140;
      const sx = skyM.uniforms.side.value, up = B.crossVectors(sx, dir).normalize();
      for (let i = 0; i < n; i++) {
        const an = i / n * 6.283 + uTime.value * .15, rr = .32 + .36 * (i % 3), px = cam.x + (dir.x + (sx.x * Math.cos(an) + up.x * Math.sin(an)) * rr) * R, py = cam.y + (dir.y + (sx.y * Math.cos(an) + up.y * Math.sin(an)) * rr) * R, pz = cam.z + (dir.z + (sx.z * Math.cos(an) + up.z * Math.sin(an)) * rr) * R;
        const flick = .55 + .45 * Math.sin(uTime.value * 9 + i * 2.1), a = skyK * flick * .8;
        rib.seg(px, py, pz, mx, my, mz, 1.6, .05, c4(RED, a * .7), c4(WHITE, a)); stats.rays++;
      }
    }
  }

  function second(s, low) {
    const T0 = s.T, S2 = T0.second; if (!S2 || s.ix === undefined) return;
    const it = s.phase === 'impact' ? s.t : s.phase === 'fade' ? T0.impact + s.t : -1; if (it < 0) return;
    const cx = s.ix, cz = s.iz, cy = s.iy ?? ground(cx, cz), tb = it - T0.blast;
    // aviso: o anel vermelho no chão marca o raio REAL do dano desde o impacto até a frente passar
    if (tb < S2.grow + .05) { const k = smooth((it) / .18); warnRing.visible = true; warnRing.position.set(cx, cy + .07, cz); warnRing.scale.setScalar(S2.r); const u = warnRing.material.uniforms; u.r0.value = .9; u.r1.value = 1; u.alpha.value = .85 * k * (tb > 0 ? 1 - smooth(tb / S2.grow) : 1); stats.warn = 1; }
    if (tb < 0) { // compressão: núcleo da primeira explosão é sugado para o centro (instante de silêncio)
      const k = smooth((it - (T0.blast - .3)) / .3); if (k > 0) { core.visible = true; core.position.set(cx, cy + 1.2, cz); core.scale.setScalar(1.6 * (1 - .6 * k)); const u = core.material.uniforms; u.heat.value = 1; u.alpha.value = .9; u.crack.value = 0; glow.add(cx, cy + 1.2, cz, 3 - 2 * k, 3 - 2 * k, 1, .8, .7, .5 * k, 0); }
      return;
    }
    stats.second = 1; const life = 3.2; if (tb > life) return;
    const grow = smooth(tb / S2.grow), rise = smooth((tb - .25) / 1.6), cool = smooth((tb - .15) / 1.9), fade = 1 - smooth((tb - 2.3) / .9);
    // núcleo branco/amarelo: nasce já no tamanho do dano e encolhe enquanto o capuz sobe
    const rc = S2.r * .5 * (.3 + .7 * grow) * (1 - .55 * rise);
    core.visible = tb < 1.6; core.position.set(cx, cy + rc * .6 + rise * 2.2, cz); core.scale.set(rc * .85, rc * .8, rc * .85);
    let u = core.material.uniforms; u.heat.value = 1 - .5 * cool; u.alpha.value = .9 * (1 - smooth((tb - .9) / .5)); u.crack.value = .2;
    // capuz em cogumelo: sobe e se achata, esfria para obsidiana com rachaduras rubras
    const rcap = S2.r * (.45 + .45 * grow + .3 * rise), hcap = S2.r * .8 + rise * S2.r * 1.8;
    cap.visible = true; cap.position.set(cx, cy + hcap, cz); cap.scale.set(rcap, rcap * (.95 - .4 * rise), rcap); cap.rotation.y = tb * .25;
    u = cap.material.uniforms; u.heat.value = .85 - .8 * cool; u.alpha.value = .97 * fade; u.crack.value = 1;
    // coluna: liga o chão ao capuz (só depois da detonação inicial)
    stem.visible = rise > .02; if (stem.visible) { stem.position.set(cx, cy, cz); stem.scale.set(S2.r * .38 * (1 + .2 * rise), hcap, S2.r * .38 * (1 + .2 * rise)); u = stem.material.uniforms; u.heat.value = .8 - .75 * cool; u.alpha.value = .9 * fade * smooth(rise / .3); u.crack.value = .8; }
    // anel de pressão largo rente ao chão (fora do raio do dano: é só visual, a frente de dano é a esfera)
    const kp = smooth(tb / 1.1); pressRing.visible = kp < 1; pressRing.position.set(cx, cy + .09, cz); pressRing.scale.setScalar(S2.r * (1 + 3.2 * kp));
    const pu = pressRing.material.uniforms; pu.r0.value = .86; pu.r1.value = .97; pu.alpha.value = .8 * (1 - kp);
    // veios/raios violeta do núcleo para fora; poeira baixa
    if (tb < 1.2 && boltRib) for (let i = 0; i < (low ? 2 : 5); i++) { const an = i * 2.4 + s.id, L = S2.r * (1.1 + .9 * grow); boltRib(s.id * 13 + i + Math.floor(tb * 10), cx, cy + 1.4 + i * .3, cz, cx + Math.cos(an) * L, cy + .4 + 3 * Math.sin(i), cz + Math.sin(an) * L, .22, VIOL, .9 * (1 - tb / 1.2)); }
    for (let i = 0; i < (low ? 6 : 14); i++) { const an = i / (low ? 6 : 14) * 6.283, r = S2.r * (1 + 1.6 * kp); glow.add(cx + Math.cos(an) * r, ground(cx + Math.cos(an) * r, cz + Math.sin(an) * r) + .5, cz + Math.sin(an) * r, 2.6, 1.2, .42, .2, .16, .35 * (1 - kp), 1); }
  }

  return {
    begin(camera, time) { uTime.value = time; cam.copy(camera.position); sky.visible = cap.visible = core.visible = stem.visible = warnRing.visible = pressRing.visible = false; stats = { sky: 0, rays: 0, second: 0, warn: 0 }; skyK = 0; },
    draw(s, blade, boss, low) { if (s.cancel) return; skyEvent(s, blade, boss, low); second(s, low); },
    get skyK() { return skyK; }, get stats() { return stats; },
    clear() { sky.visible = cap.visible = core.visible = stem.visible = warnRing.visible = pressRing.visible = false; skyK = 0; },
    dispose() { for (const g of geos) g.dispose(); for (const m of mats) m.dispose(); }
  };
}
