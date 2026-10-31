import { energyMaterial } from './vfx-flow3d.js';
import { softParticles, groundDecals, groundNormal, ribbons, lightningBolt, smooth, easeOut, hash } from './celestial-fxkit3d.js';
/**
 * MOD 238 — VFX do Enemy2 ("Trindade"): Vórtice Abissal (portal sobre a cabeça + UMA corrente grossa que investe três
 * vezes), Trindade do Caos (três funis turbulentos) e Colapso do Abismo (fissura → coluna → implosão → onda baixa).
 * Só desenha o estado da lógica (enemy2-squad3d.js).
 *
 * Volume de verdade, não cartões: a corrente é um TUBO 3D reconstruído a cada quadro sobre o caminho real da ponta,
 * com o material de energia da VFX Engine 2.0 (ruído advectado, filamentos, borda) em paleta própria — núcleo preto,
 * plasma magenta e veios carmesim — e uma segunda camada carmesim mais fina girando por fora. Os furacões e a coluna
 * são funis/colunas de anéis deformados por torção e balanço; o portal e a fissura são discos com braços espirais e
 * rachaduras desenhados no shader. Buffers fixos, alocados uma vez; tudo em poucas chamadas de desenho.
 */
const ABYSS = { deep: [.004, 0, .008], body: [.3, .005, .24], hot: [1, .28, .7] };
// Vórtice (especificação sakuga): abismo #08020D, roxo escuro #25002E, magenta incandescente #FF28D8, núcleo branco.
const VORTEX_PAL = { deep: [.031, .008, .051], body: [.145, 0, .18], hot: [1, .157, .847] }, VORTEX_EMBER = { deep: [.04, .004, .02], body: [.3, .01, .12], hot: [1, .42, .3] };
const VEIN = { deep: [.02, 0, .01], body: [.62, 0, .07], hot: [1, .12, .32] };
const DISC_VERT = `attribute vec4 aFx; varying vec2 vUv; varying vec4 vFx; void main(){ vUv=uv; vFx=aFx; gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.); }`;
const DISC_FRAG = `uniform float time; varying vec2 vUv; varying vec4 vFx;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float cracks(vec2 p,float s){vec2 g=floor(p*s),f=fract(p*s);float m1=8.,m2=8.;for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){vec2 o=vec2(i,j);vec2 r=o+vec2(h(g+o),h(g+o+7.1))-f;float d=dot(r,r);if(d<m1){m2=m1;m1=d;}else if(d<m2)m2=d;}return 1.-smoothstep(0.,.06,sqrt(m2)-sqrt(m1));}
void main(){ vec2 p=vUv*2.-1.; float r=length(p), a=atan(p.y,p.x), k=vFx.x, prog=vFx.y, sd=vFx.z, al=vFx.w;
 float n=n2(p*3.+sd*9.+time*.4)*.6+n2(p*7.-time*.7)*.4; vec3 col; float A;
 if(k<.5){ // portal: braços em espiral logarítmica girando para dentro, centro profundo, borda rasgada
  float arms=sin(a*3.+log(r+.03)*6.5+time*4.5+n*2.); float band=smoothstep(-.1,.9,arms+(n-.5)*.8);
  float hotL=pow(max(0.,1.-abs(arms-.55)*3.),6.)*smoothstep(.15,.5,r); float edge=1.-smoothstep(.78,1.,r+(n-.5)*.25);
  float veins=pow(max(0.,1.-abs(sin(a*7.-log(r+.03)*9.+time*3.))*4.),3.)*smoothstep(.3,.9,r);
  col=mix(vec3(.01,0.,.02),vec3(.55,.03,.42),band*smoothstep(.08,.45,r)); col=mix(col,vec3(.85,.04,.12),veins*.8); col+=vec3(1.,.4,.75)*hotL*1.4;
  float hole=1.-smoothstep(.0,.3,r); col=mix(col,vec3(0.),hole*.85); A=edge*(.55+band*.45)*prog*al; A=max(A,hole*prog*al*.95);
 } else { // fissura no solo: rachaduras radiais, anel de runas e centro sendo sugado
  float rad=pow(max(0.,1.-abs(sin(a*9.+sd*3.+n*1.5))*6.),2.)*smoothstep(1.,.1,r); float cr=cracks(p+vec2(time*.02),4.+sd);
  float ring=exp(-pow((r-.86)/.025,2.))+exp(-pow((r-.74)/.015,2.))*.6; float cell=floor((a+3.1416)*30./6.2832); float u=fract((a+3.1416)*30./6.2832), v=(r-.77)/.08;
  float glyph=(v>0.&&v<1.)?step(.45,h(vec2(cell,sd)))*smoothstep(.15,0.,abs(u-.5)):0.;
  float swirl=pow(max(0.,sin(a*4.-log(r+.02)*8.+time*3.)),6.)*smoothstep(.65,.05,r);
  float reveal=smoothstep(prog*1.2-.05,prog*1.2-.25,r+(n-.5)*.2);
  vec3 glow=mix(vec3(.95,.05,.18),vec3(.95,.25,.85),n); col=vec3(.01,0.,.015)+glow*(rad*1.1+cr*.6*smoothstep(1.,.2,r)+ring+glyph*.9+swirl*.8)*(.6+.4*sin(time*8.+r*12.));
  A=(smoothstep(1.02,.6,r+(n-.5)*.3)*.85+ring*.4)*reveal*al;
 }
 if(A<.01) discard; gl_FragColor=vec4(col,A); }`;

export function createChaosVFX(T, scene, { ground = () => 0 } = {}) {
  const root = new T.Group(); root.name = 'Enemy2ChaosVFX'; scene.add(root);
  const uTime = { value: 0 };
  const recolor = (m, P) => { for (const k of ['deep', 'body', 'hot']) m.uniforms[k].value.setRGB(...P[k]); return m; };
  const mat = (P, o) => recolor(energyMaterial(T, 'violet', o), P);
  // --- tubos dinâmicos (corrente do vórtice, funis, coluna): anéis × lados, reconstruídos sobre o caminho real
  function tubePool(n, rings, sides, P, opts) {
    return Array.from({ length: n }, (_, i) => {
      const V = (rings + 1) * (sides + 1), pos = new Float32Array(V * 3), nor = new Float32Array(V * 3), uv = new Float32Array(V * 2), ix = [];
      for (let j = 0; j <= rings; j++) for (let k = 0; k <= sides; k++) { uv.set([j / rings, k / sides], (j * (sides + 1) + k) * 2); if (j < rings && k < sides) { const a = j * (sides + 1) + k, b = a + sides + 1; ix.push(a, b, a + 1, a + 1, b, b + 1); } }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3).setUsage(T.DynamicDrawUsage)); g.setAttribute('normal', new T.BufferAttribute(nor, 3).setUsage(T.DynamicDrawUsage)); g.setAttribute('uv', new T.BufferAttribute(uv, 2)); g.setIndex(ix);
      const m = mat(P, { seed: i * 3.1, ...opts }), mesh = new T.Mesh(g, m); mesh.frustumCulled = false; mesh.visible = false; root.add(mesh);
      return { mesh, g, m, pos, nor, rings, sides, used: false };
    });
  }
  const C = new T.Vector3(), Tg = new T.Vector3(), B = new T.Vector3(), N = new T.Vector3(), up = new T.Vector3(0, 1, 0);
  /** Preenche um tubo a partir de uma função centro(u) e raio(u, ângulo). */
  function fillTube(tb, center, radius, twist = 0) {
    const { rings, sides, pos, nor } = tb; let px = 0, py = 0, pz = 0;
    for (let j = 0; j <= rings; j++) {
      const u = j / rings, c = center(u), cn = center(Math.min(1, u + 1 / rings)), cp = center(Math.max(0, u - 1 / rings));
      Tg.set(cn[0] - cp[0], cn[1] - cp[1], cn[2] - cp[2]); if (Tg.lengthSq() < 1e-8) Tg.set(0, 1, 0); Tg.normalize();
      B.crossVectors(Math.abs(Tg.y) > .95 ? C.set(1, 0, 0) : up, Tg).normalize(); N.crossVectors(Tg, B);
      for (let k = 0; k <= sides; k++) {
        const a = k / sides * Math.PI * 2 + twist * u, r = radius(u, a), ca = Math.cos(a), sa = Math.sin(a), nx = B.x * ca + N.x * sa, ny = B.y * ca + N.y * sa, nz = B.z * ca + N.z * sa, o = (j * (sides + 1) + k) * 3;
        pos[o] = c[0] + nx * r; pos[o + 1] = c[1] + ny * r; pos[o + 2] = c[2] + nz * r; nor[o] = nx; nor[o + 1] = ny; nor[o + 2] = nz;
      }
      px = c[0]; py = c[1]; pz = c[2];
    }
    tb.g.attributes.position.needsUpdate = true; tb.g.attributes.normal.needsUpdate = true; tb.mesh.visible = true; tb.used = true; void px; void py; void pz;
  }
  const streams = tubePool(2, 46, 12, VORTEX_PAL, { warp: .06, alpha: 1, frequency: 1.6 }), streamsBoss = tubePool(1, 46, 12, VORTEX_EMBER, { warp: .07, alpha: 1, frequency: 1.5 }),
    coreMat = new T.ShaderMaterial({ vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 w=modelMatrix*vec4(position,1.); vN=normalize(mat3(modelMatrix)*normal); vV=cameraPosition-w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }', fragmentShader: 'varying vec3 vN; varying vec3 vV; uniform float alpha; void main(){ float f=abs(dot(normalize(vN),normalize(vV))); float a=alpha*pow(f,1.6); gl_FragColor=vec4(mix(vec3(1.,.157,.847),vec3(1.),pow(f,3.))*a,a); }', uniforms: { alpha: { value: 1 } }, transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false, fog: false }),
    cores = tubePool(2, 46, 8, VORTEX_PAL, {}), streamVeins = tubePool(2, 46, 10, VEIN, { warp: .16, alpha: .7, frequency: 2.2 });
  const funnels = tubePool(5, 22, 16, ABYSS, { warp: .14, alpha: .94, frequency: 1.1 }), funnelVeins = tubePool(5, 22, 14, VEIN, { warp: .2, alpha: .62, frequency: 1.8 });
  const columns = tubePool(2, 20, 16, ABYSS, { warp: .18, alpha: .95, frequency: 1.2 }), columnVeins = tubePool(2, 20, 14, VEIN, { warp: .22, alpha: .66, frequency: 2 }), waves = tubePool(2, 2, 48, VEIN, { warp: .12, alpha: .8, frequency: 3 });
  for (const c of cores) { c.mesh.material.dispose(); c.mesh.material = coreMat; c.m = coreMat; }
  const allTubes = [streams, streamsBoss, cores, streamVeins, funnels, funnelVeins, columns, columnVeins, waves];
  // --- discos (portal/fissura)
  const discGeo = new T.PlaneGeometry(2, 2); discGeo.rotateX(-Math.PI / 2); const discFx = new Float32Array(8 * 4); discGeo.setAttribute('aFx', new T.InstancedBufferAttribute(discFx, 4).setUsage(T.DynamicDrawUsage));
  const discs = new T.InstancedMesh(discGeo, new T.ShaderMaterial({ vertexShader: DISC_VERT, fragmentShader: DISC_FRAG, uniforms: { time: uTime }, transparent: true, depthWrite: false, side: T.DoubleSide, toneMapped: false, fog: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), 8);
  discs.frustumCulled = false; discs.count = 0; discs.renderOrder = 2; root.add(discs); let dn = 0;
  // --- cristais/detritos (iluminados pela cena)
  const shardGeo = new T.OctahedronGeometry(1, 0); shardGeo.scale(.45, 1.4, .45);
  const shards = new T.InstancedMesh(shardGeo, new T.MeshStandardMaterial({ color: 0x14070f, roughness: .35, metalness: .3, emissive: 0x5a0428, emissiveIntensity: .9, flatShading: true }), 260);
  shards.frustumCulled = false; shards.count = 0; root.add(shards); let sn = 0;
  const glow = softParticles(T, 700), smoke = softParticles(T, 240, { additive: false }), rib = ribbons(T, 700, { flow: 16 }), decals = groundDecals(T, 16);
  root.add(glow.mesh, smoke.mesh, rib.mesh, decals.mesh);
  const M = new T.Matrix4(), Q = new T.Quaternion(), S = new T.Vector3(), P = new T.Vector3(), E = new T.Euler(), nrm = [0, 1, 0], bolt = Array.from({ length: 30 }, () => [0, 0, 0, 0, 0, 0, 0]);
  let time = 0, low = false; const cam = new T.Vector3();
  /** Volumes grandes esmaecem quando a câmera está dentro/perto deles: não cobrem a tela inteira (1ª pessoa, celular). */
  const camFade = (x, z, r) => { const d = Math.hypot(cam.x - x, cam.z - z) - r; return d > 3 ? 1 : Math.max(.22, d / 3); };
  const MAG = [1, .3, .8], RED = [1, .1, .2], VIO = [.6, .25, 1], c4 = (c, a) => [c[0], c[1], c[2], a];
  function disc(x, y, z, size, kind, prog, seed, a, normal) {
    if (dn >= 8 || a <= .005 || size <= .01) return; P.set(x, y, z); if (normal) { C.set(normal[0], normal[1], normal[2]); Q.setFromUnitVectors(up, C); } else Q.identity(); S.set(size, 1, size); M.compose(P, Q, S); discs.setMatrixAt(dn, M); discFx.set([kind, prog, seed, a], dn * 4); dn++;
  }
  function shard(x, y, z, s, rx, ry, rz) { if (sn >= 260 || s <= .01) return; P.set(x, y, z); Q.setFromEuler(E.set(rx, ry, rz)); S.set(s, s, s); M.compose(P, Q, S); shards.setMatrixAt(sn++, M); }
  function boltRib(seed, ax, ay, az, bx, by, bz, w, col, a, o) { const n = lightningBolt(seed, ax, ay, az, bx, by, bz, bolt, o); for (let i = 0; i < n; i++) { const s = bolt[i]; rib.seg(s[0], s[1], s[2], s[3], s[4], s[5], w * s[6], w * s[6] * .8, c4(col, a), c4(col, a * .8)); } }
  const take = pool => pool.find(t => !t.used);

  /* ---------- Vórtice Abissal ---------- */
  function drawVortex(s) {
    const T0 = s.T, big = s.kind === 'e2boss' ? 1.35 : 1, R = T0.portal, open = s.phase === 'open' ? smooth(s.t / .35) : s.phase === 'retract' ? 1 - smooth(s.t / T0.retract) : 1;
    // portal horizontal acima da cabeça: disco espiral + aros + correntes orbitais
    // três camadas do redemoinho em alturas e inclinações diferentes: o portal tem espessura vista de lado
    disc(s.px, s.py, s.pz, R * (.4 + .6 * open), 0, open, s.id % 9, 1);
    disc(s.px, s.py + .22, s.pz, R * 1.18 * (.4 + .6 * open), 0, open, s.id % 9 + 3, .55, [Math.sin(time * .7) * .2, .97, Math.cos(time * .6) * .2]);
    disc(s.px, s.py - .25, s.pz, R * .75 * (.4 + .6 * open), 0, open, s.id % 9 + 5, .8, [-Math.sin(time * .9) * .25, .96, Math.cos(time * .8) * .25]);
    { const fun = take(funnels); if (fun && open > .05) { fillTube(fun, u => [s.px, s.py - .1 - u * 1.3 * open, s.pz], (u, a) => R * (.55 - u * .4) * open * (1 + .2 * Math.sin(a * 3 - u * 8 + time * 9)), 6); fun.m.uniforms.time.value = time; fun.m.uniforms.alpha.value = .9 * open; } }
    for (let i = 0; i < 2; i++) { const rr = R * (1.02 + i * .14) * open, sp = (i ? -1 : 1) * time * (2.4 + i), seg = 26; for (let j = 0; j < seg; j++) { const a0 = j / seg * 6.283 + sp, a1 = (j + 1) / seg * 6.283 + sp, w = .05 + .04 * Math.sin(j * 1.7 + time * 6); rib.seg(s.px + Math.cos(a0) * rr, s.py + .02 * i, s.pz + Math.sin(a0) * rr, s.px + Math.cos(a1) * rr, s.py + .02 * i, s.pz + Math.sin(a1) * rr, w, w, c4(i ? RED : MAG, .8 * open), c4(i ? RED : MAG, .8 * open)); } }
    if (!low) for (let i = 0; i < 14; i++) { const u = (time * .5 + i / 14) % 1, a = i * 2.4 - time * 3 - u * 4, rr = R * (1.3 - u * 1.1); glow.add(s.px + Math.cos(a) * rr, s.py + .1 - u * .3, s.pz + Math.sin(a) * rr, .06, .3, 1, .3, .7, (1 - u) * open, 3, a + 1.57, i); }
    // a corrente: tubo grosso do centro do portal até a ponta, seguindo o caminho real (curvas orgânicas, sem fragmentar)
    const path = s.path; if (path.length < 2) return;
    const pts = [[s.px, s.py - .1, s.pz], ...path.map(p => [p.x, p.y, p.z]), [s.x, s.y, s.z]];
    const L = pts.length - 1, at = u => { const f = u * L, i = Math.min(L - 1, Math.floor(f)), k = f - i, a = pts[i], b = pts[i + 1]; return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]; };
    const fade = s.phase === 'retract' ? 1 - smooth(s.t / T0.retract) : 1, rB = T0.r * big, burst = s.phase === 'burst' ? Math.sin(Math.min(1, s.t / T0.burst) * Math.PI) : 0;
    // corpo opaco escuro com veios magenta; mini-chefe com brasas na paleta (diferente do comum); núcleo branco por dentro
    const tb = take(s.kind === 'e2boss' ? streamsBoss : streams), tv = take(streamVeins), tc = take(cores);
    if (tb) { fillTube(tb, at, (u, a) => rB * (.42 + .58 * Math.pow(u, .7)) * (1 + .14 * Math.sin(a * 3 + u * 18 - time * 9) + .25 * burst * u * u) * fade, 2.5); tb.m.uniforms.time.value = time; tb.m.uniforms.alpha.value = Math.min(1, fade * 1.4) * camFade(s.x, s.z, rB); tb.m.uniforms.detail.value = low ? .65 : 1; }
    if (tc) { fillTube(tc, at, u => rB * .2 * (.4 + .6 * u) * fade, 0); coreMat.uniforms.alpha.value = .9 * fade * camFade(s.x, s.z, rB); tc.mesh.renderOrder = 7; }
    if (s.kind === 'e2boss' && !low) for (let i = 0; i < 10; i++) { const u = (time * .8 + i / 10) % 1, p = at(u), a = i * 2.4 + time * 7; glow.add(p[0] + Math.cos(a) * rB * 1.4, p[1] + Math.sin(a) * rB, p[2] + Math.sin(a) * rB * 1.4, .07, .35, 1, .45, .1, .9 * fade, 3, a + 1.57, i); }
    if (tv) { fillTube(tv, at, (u, a) => rB * (.55 + .7 * Math.pow(u, .7)) * (1 + .22 * Math.sin(a * 2 - u * 26 + time * 12)) * fade, -6); tv.m.uniforms.time.value = time * 1.4; tv.m.uniforms.alpha.value = .6 * fade; }
    // cabeça: massa comprimida com núcleo quente e filamentos; veios elétricos ao longo do corpo
    glow.add(s.x, s.y, s.z, 2.2 * rB, 2.2 * rB, 1, .25, .65, .6 * fade, 0); glow.add(s.x, s.y, s.z, .9 * rB, .9 * rB, 1, .8, .95, .9 * fade, 0);
    if (!low) for (let i = 0; i < 3; i++) { const u0 = ((time * 1.7 + i / 3) % 1) * .8, p0 = at(u0), p1 = at(Math.min(1, u0 + .18)); boltRib(s.id * 7 + i + Math.floor(time * 18), p0[0], p0[1], p0[2], p1[0], p1[1], p1[2], .08 * big, i % 2 ? RED : MAG, .9 * fade, { depth: 1, jag: .4 }); }
    // estilhaços angulares escuros arrastados pela corrente (no lugar das manchas redondas de fumaça)
    for (let i = 0; i < (low ? 5 : 12); i++) { const u = (hash(i + s.id) * .9 + time * .35) % 1, p = at(u), a = i * 2.4 + time * 6; shard(p[0] + Math.cos(a) * rB * 1.25, p[1] + Math.sin(a * 1.3) * rB, p[2] + Math.sin(a) * rB * 1.25, .09 * big * fade, a, u * 9, i); }
    if (s.phase === 'burst') { const k = s.t / T0.burst, e = easeOut(k), gy = ground(s.x, s.z);
      for (let i = 0; i < (low ? 8 : 20); i++) { const a = i * 2.39996, el = hash(i + s.id) * 1.2, d = (1 + hash(i * 3) * 2.5) * e * big; glow.add(s.x + Math.cos(a) * Math.cos(el) * d, s.y + Math.sin(el) * d, s.z + Math.sin(a) * Math.cos(el) * d, .06, .4, 1, i % 2 ? .1 : .35, i % 2 ? .25 : .8, 1 - k, 3, a, i); }
      if (s.y - gy < 2) { groundNormal(ground, s.x, s.z, nrm); decals.add(s.x, gy, s.z, (1 + e * 3) * big, 1, .2, .6, (1 - k) * .9, 0, k, s.id, nrm); } }
  }

  /* ---------- Trindade do Caos ---------- */
  function drawTrinity(s) {
    const big = s.kind === 'e2boss' ? 1.25 : 1, fadeK = s.phase === 'fade' ? 1 - smooth(s.t / s.T.fade) : 1;
    for (const h of s.storms) {
      const H = (s.reap ? 3.6 : h.role === 'press' ? 5.6 : 4.7) * big * Math.max(.05, h.h), top = (s.reap ? .85 : h.role === 'press' ? 1.15 : .95) * big, gy = h.y, ph = time * 3.2 + h.i * 2.1;
      const center = u => [h.x + Math.sin(ph + u * 3.4) * .35 * u * big, gy + u * H, h.z + Math.cos(ph * .8 + u * 2.9) * .35 * u * big];
      const tb = take(funnels), tv = take(funnelVeins);
      if (tb) { fillTube(tb, center, (u, a) => (.16 + top * Math.pow(u, 1.8)) * (1 + .22 * Math.sin(a * 4 + u * 14 - time * 8)), 7); tb.m.uniforms.time.value = time + h.i; tb.m.uniforms.alpha.value = .94 * fadeK * camFade(h.x, h.z, top); tb.m.uniforms.detail.value = low ? .65 : 1; }
      if (tv && !low) { fillTube(tv, center, (u, a) => (.22 + top * 1.12 * Math.pow(u, 1.7)) * (1 + .3 * Math.sin(a * 3 - u * 18 + time * 11)), -10); tv.m.uniforms.time.value = time * 1.5 + h.i; tv.m.uniforms.alpha.value = .42 * fadeK; }
      // topo em espiral, base com cristais e poeira, detritos subindo em órbita
      disc(h.x, gy + H * .98, h.z, top * 1.5 * h.h, 0, h.h, h.i + s.id, .75 * fadeK);
      groundNormal(ground, h.x, h.z, nrm); decals.add(h.x, gy, h.z, 1.4 * big * h.h, .9, .1, .4, .7 * fadeK, 2, 0, h.i, nrm);
      for (let i = 0; i < (low ? 4 : 8); i++) { const a = i / 8 * 6.283 + h.i, rr = (.6 + hash(i + h.i) * .5) * big; shard(h.x + Math.cos(a) * rr, gy + .15 * h.h, h.z + Math.sin(a) * rr, (.12 + hash(i * 3) * .1) * h.h * big, Math.cos(a) * .7, a, Math.sin(a) * .7); }
      for (let i = 0; i < (low ? 5 : 12); i++) { const u = (time * .45 + i / 12 + h.i * .3) % 1, a = ph * 1.6 + i * 2.4, c = center(u), rr = (.25 + top * Math.pow(u, 1.5)) * 1.15; shard(c[0] + Math.cos(a) * rr, c[1], c[2] + Math.sin(a) * rr, .07 * big * (1 - u * .5) * fadeK, a, u * 6, i); }
      for (let i = 0; i < (low ? 3 : 6); i++) smoke.add(h.x + (hash(i + h.i) - .5) * 2, gy + .3 + hash(i * 2) * .6, h.z + (hash(i * 5 + h.i) - .5) * 2, 1.6 * big, 1.2 * big, .07, .01, .06, .22 * fadeK * h.h, 1, i + time, i);
    }
    // correntes ligam os furacões que se aproximam (mini-tempestade breve)
    if (!low && s.phase === 'hunt') for (let i = 0; i < s.storms.length; i++) for (let j = i + 1; j < s.storms.length; j++) { const a = s.storms[i], b = s.storms[j]; if (Math.hypot(a.x - b.x, a.z - b.z) < 4.5) boltRib(s.id * 13 + i * 3 + j + Math.floor(time * 12), a.x, a.y + 3.4 * big, a.z, b.x, b.y + 3.4 * big, b.z, .1, j % 2 ? RED : MAG, .85, { depth: 2, jag: .3 }); }
  }

  /* ---------- Colapso do Abismo ---------- */
  function drawCollapse(s) {
    const T0 = s.T, big = s.kind === 'e2boss' ? 1.3 : 1, gy = s.y, ph = s.phase; groundNormal(ground, s.x, s.z, nrm);
    const fis = ph === 'fissure' ? s.t / T0.fissure : 1, fadeK = ph === 'fade' ? 1 - smooth(s.t / T0.fade) : 1;
    disc(s.x, gy, s.z, s.r * 1.08, 1, fis, s.id % 7, fadeK);
    if (ph === 'fissure' || ph === 'gather') { // detritos levantando e correntes convergindo para o centro
      const g = ph === 'gather' ? s.t / T0.gather : 0;
      for (let i = 0; i < (low ? 10 : 22); i++) { const a = i * 2.39996 + time * (1.5 + g * 3), u = (time * (.6 + g) + i / 22) % 1, rr = s.r * (1 - u); glow.add(s.x + Math.cos(a) * rr, gy + .15 + Math.sin(u * 3.14) * .5, s.z + Math.sin(a) * rr, .05, .3, 1, .2, .6, u * fis, 3, a + 1.57, i); }
      for (let i = 0; i < (low ? 6 : 14); i++) { const a = i / 14 * 6.283 + hash(i + s.id), rr = s.r * (.55 + hash(i * 3) * .45), rise = smooth(fis * 1.4 - hash(i) * .4) * (.3 + g * .7); shard(s.x + Math.cos(a) * rr * (1 - g * .25), gy + rise * .9, s.z + Math.sin(a) * rr * (1 - g * .25), (.14 + hash(i * 7) * .16) * big, Math.cos(a) * .6, a, Math.sin(a) * .6); }
      if (g > 0 && !low) for (let i = 0; i < 4; i++) { const a = i * 1.57 + time * 2, rr = s.r * (1 - g * .8); boltRib(s.id + i + Math.floor(time * 14), s.x + Math.cos(a) * rr, gy + .2, s.z + Math.sin(a) * rr, s.x, gy + .4, s.z, .07, i % 2 ? RED : MAG, .8 * g, { depth: 1 }); }
    }
    if (ph === 'erupt' || ph === 'implode' || (ph === 'wave' && s.t < .2)) { // coluna turbulenta que sobe e depois implode
      const H = (7 + (big - 1) * 6) * Math.max(.05, s.col), rad = s.r * .42 * (ph === 'implode' ? s.col : ph === 'wave' ? .2 : 1);
      const center = u => [s.x + Math.sin(time * 5 + u * 4) * .25 * u, gy + u * H, s.z + Math.cos(time * 4 + u * 3) * .25 * u];
      const tb = take(columns), tv = take(columnVeins);
      if (tb) { fillTube(tb, center, (u, a) => rad * (1 + .3 * Math.sin(u * 9 - time * 14) + .15 * Math.sin(a * 5 + u * 20)) * (1 - u * .35), 8); tb.m.uniforms.time.value = time; tb.m.uniforms.alpha.value = .95 * camFade(s.x, s.z, rad * 1.3); }
      if (tv) { fillTube(tv, center, (u, a) => rad * 1.25 * (1 + .25 * Math.sin(a * 3 - u * 22 + time * 16)), -11); tv.m.uniforms.time.value = time * 1.6; tv.m.uniforms.alpha.value = .62 * camFade(s.x, s.z, rad * 1.6); }
      for (let i = 0; i < (low ? 8 : 18); i++) { const u = (time * 1.4 + i / 18) % 1, a = i * 2.4 + time * 6; const c = center(u); shard(c[0] + Math.cos(a) * rad * 1.6, c[1], c[2] + Math.sin(a) * rad * 1.6, .1 * big * (1 - u), a, u * 7, i); }
      glow.add(s.x, gy + H * .3, s.z, rad * 4, H * .9, 1, .2, .6, .55, 0); glow.add(s.x, gy + .3, s.z, rad * 3.2, rad * 3.2, 1, .7, .95, .9, 0);
    }
    if (ph === 'wave' || (ph === 'fade' && s.t < .3)) { // onda de choque horizontal baixa: parede de energia que avança, na altura do salto
      const k = ph === 'wave' ? s.t / T0.wave : 1, a = ph === 'wave' ? 1 - k * .45 : (1 - s.t / .3) * .55, F = s.front || .6;
      const tw = take(waves); if (tw) { fillTube(tw, u => [s.x, gy + u * T0.waveH * 1.1, s.z], (u) => F * (1 - u * .04), 0); tw.m.uniforms.time.value = time * 2; tw.m.uniforms.alpha.value = .85 * a; }
      decals.add(s.x, gy, s.z, F * 1.05, 1, .15, .5, a, 0, k, s.id, nrm); decals.add(s.x, gy, s.z, F * .9, .6, .1, 1, a * .6, 0, k, s.id + 1, nrm);
      for (let i = 0; i < (low ? 12 : 28); i++) { const an = i / 28 * 6.283 + hash(i), rr = F * (.95 + hash(i * 3) * .1); shard(s.x + Math.cos(an) * rr, gy + .1 + hash(i) * .4 * (1 - k), s.z + Math.sin(an) * rr, .09 * big * a, an, k * 6, i); glow.add(s.x + Math.cos(an) * rr, gy + .25, s.z + Math.sin(an) * rr, .07, .4, 1, i % 2 ? .1 : .4, i % 2 ? .2 : .9, a, 3, an + 1.57, i); }
    }
    if (ph === 'fade') for (let i = 0; i < (low ? 4 : 9); i++) { const an = i * 1.9, d = s.r * (.3 + hash(i) * .9); smoke.add(s.x + Math.cos(an) * d, gy + .4 + (s.t / T0.fade) * 2, s.z + Math.sin(an) * d, 1.6 * big, 1.6 * big, .06, .01, .07, .25 * fadeK, 1, an, i); }
  }
  function drawCharge(c) {
    const k = c.k, big = c.kind === 'e2boss' ? 1.3 : 1;
    glow.add(c.x, c.y, c.z, .9 * k * big, .9 * k * big, 1, .25, .7, .85, 0);
    for (let i = 0; i < (low ? 5 : 12); i++) { const a = i * 2.4 + time * 6, rr = (1 - ((time * 2 + i / 12) % 1)) * 1.4 * big; glow.add(c.x + Math.cos(a) * rr, c.y + Math.sin(a * 1.4) * rr * .5, c.z + Math.sin(a) * rr, .045, .25, 1, i % 2 ? .1 : .35, i % 2 ? .25 : .85, k, 3, a + 1.57, i); }
    if (c.skill === 'vortex') disc(c.x, c.y + 1.2, c.z, .9 * k * big, 0, k, 3, .9);
    if (c.skill === 'collapse' || c.skill === 'trinity') { groundNormal(ground, c.gx, c.gz, nrm); decals.add(c.gx, ground(c.gx, c.gz), c.gz, 1.6 * k, 1, .1, .5, .7 * k, 1, k, 5, nrm); }
  }
  return {
    root,
    update(dt, camera, spells, charges = [], quality = 1) {
      time += dt; uTime.value = time; low = quality === 0; dn = 0; sn = 0; cam.copy(camera.position);
      for (const pool of allTubes) for (const t of pool) { t.used = false; t.mesh.visible = false; }
      glow.begin(); smoke.begin(); rib.begin(camera, time); decals.begin();
      for (const s of spells) { if (s.type === 'vortex') drawVortex(s); else if (s.type === 'trinity') drawTrinity(s); else if (s.type === 'collapse') drawCollapse(s); }
      for (const c of charges) if (c.skill === 'vortex' || c.skill === 'trinity' || c.skill === 'collapse') drawCharge(c);
      discs.count = dn; discs.instanceMatrix.needsUpdate = true; discGeo.attributes.aFx.needsUpdate = true; shards.count = sn; shards.instanceMatrix.needsUpdate = true;
      glow.end(); smoke.end(); rib.end(); decals.end(time);
      return { discs: dn, shards: sn, tubes: allTubes.reduce((n, p) => n + p.filter(t => t.used).length, 0) };
    },
    clear() { for (const pool of allTubes) for (const t of pool) t.mesh.visible = false; discs.count = 0; shards.count = 0; },
    dispose() { scene.remove(root); root.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); glow.dispose(); smoke.dispose(); rib.dispose(); decals.dispose(); }
  };
}
