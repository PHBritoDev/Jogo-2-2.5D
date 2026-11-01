import { smooth, easeOut, hash, groundNormal } from './celestial-fxkit3d.js';
/**
 * MOD 254 — BOMBARDEIO ABISSAL PERSEGUIDOR do VHAZRAEL (só desenha o estado de vhazrael3d.js; dano é da lógica).
 * Direção de arte: a cadência de muitos impactos controlados (referência de anime fornecida pelo criador) adaptada ao
 * rubro-negro/branco incandescente do bispo, e cada impacto como uma versão PEQUENA e otimizada de uma explosão com
 * massa (referência GIF): núcleo → anel de choque → coluna/cogumelo → fumaça só no resfriamento → fogo residual.
 *  • Emissor suspenso: núcleo denso branco/carmim, anel de plasma QUEBRADO em lâminas e quatro lâminas em cruz de borda
 *    negra cortante, girando; recua e solta um clarão a cada disparo.
 *  • Descarga: corpo opaco alongado com núcleo, rastro curto, desce em reta até o ponto TRAVADO (nunca persegue).
 *  • Aviso: anel vermelho que se fecha + cruz no ponto real do chão desde o disparo (= tempo de queda, ~0,6 s).
 *  • Impacto: clarão curtíssimo, domo-núcleo branco/amarelo com casca laranja/negra recortada, anel de choque com
 *    espessura, anel de pressão no ar, coluna e cogumelo de fogo em faixas que esfriam para fuligem, pedras e placas
 *    saindo do MESMO epicentro, às vezes um relâmpago; marca queimada temporária.
 *  • Fogo residual: chamas em lâminas e brasas sobre a mancha, limitado e expirando (a lógica controla o dano).
 * Tudo instanciado (4 chamadas próprias + os sistemas compartilhados do VFX do bispo), sem alocação por quadro.
 */
const NOISE = `float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float h3(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float n3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}`;
/* massas (aP = calor, paleta 0 fogo / 1 carmim, dissolução, semente) — faixas duras com contorno escuro */
const PUFF_V = `${NOISE} attribute vec4 aP; uniform float time; varying vec4 vP; varying vec3 vN; varying vec3 vV; varying vec3 vO;
void main(){ vP=aP; vO=position; float d=1.+.24*(n3(position*2.3+aP.w*7.+vec3(0.,time*.9,0.))-.5); vec4 w=modelMatrix*instanceMatrix*vec4(position*d,1.); vN=normalize(mat3(modelMatrix)*mat3(instanceMatrix)*position); vV=cameraPosition-w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
const PUFF_F = `${NOISE} uniform float time; varying vec4 vP; varying vec3 vN; varying vec3 vV; varying vec3 vO;
void main(){ if(length(vV)<2.6) discard; float f=abs(dot(normalize(vN),normalize(vV))); float n=n3(vO*1.6+vP.w*11.+vec3(0.,-time*1.3,0.)); if(n3(vO*2.4+vP.w*5.)<vP.z) discard;
 float v=vP.x*(.22+.95*f)+(n-.5)*.26; vec3 c;
 if(vP.y<.5) c=v>.84?vec3(1.,.98,.86):v>.66?vec3(1.,.8,.22):v>.48?vec3(1.,.42,.06):v>.32?vec3(.7,.12,.03):v>.18?vec3(.22,.06,.04):vec3(.11,.09,.1);
 else c=v>.88?vec3(1.,.93,.95):v>.66?vec3(1.,.14,.26):v>.46?vec3(.72,0.,.07):v>.3?vec3(.24,0.,.05):vec3(.03,0.,.03);
 c*=mix(.3,1.,smoothstep(.1,.28,f)); gl_FragColor=vec4(c,1.); }`;
/* lâminas (aura do emissor, chamas do fogo residual): núcleo claro, corpo, casca negra recortada */
const BLADE_V = `attribute vec4 aP; varying vec4 vP; varying vec2 vU; void main(){ vP=aP; vU=uv; gl_Position=projectionMatrix*viewMatrix*modelMatrix*instanceMatrix*vec4(position,1.); }`;
const BLADE_F = `${NOISE} uniform float time; varying vec4 vP; varying vec2 vU;
void main(){ float n=n2(vec2(vU.y*7.-time*8.+vP.w*13.,vU.x*2.)); float d=abs(vU.x)+(n-.5)*.4+vU.y*.15; if(d>.98||n2(vU*6.+vP.w*3.)<vP.z) discard;
 vec3 c=vP.y<.5?(d<.2*vP.x?vec3(1.,.9,.9):d<.5?vec3(.95,.04,.1):d<.78?vec3(.4,0.,.03):vec3(.02,0.,.01)):(d<.22*vP.x?vec3(1.,.97,.8):d<.48?vec3(1.,.66,.15):d<.72?vec3(1.,.3,.04):d<.86?vec3(.32,.05,.02):vec3(.03,.01,.01));
 gl_FragColor=vec4(c,1.); }`;
/* domo-núcleo instanciado (aC = calor, erosão) */
const CORE_V = `${NOISE} attribute vec2 aC; uniform float time; varying vec2 vC; varying vec3 vN; varying vec3 vV; varying vec3 vP;
void main(){ vC=aC; vP=position; float a=atan(position.z,position.x); float d=1.+.18*(n3(vec3(a*2.,position.y*3.-time,time*.3))-.5); vec4 w=modelMatrix*instanceMatrix*vec4(position*d,1.); vN=normalize(mat3(modelMatrix)*mat3(instanceMatrix)*normal); vV=cameraPosition-w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
const CORE_F = `${NOISE} uniform float time; varying vec2 vC; varying vec3 vN; varying vec3 vV; varying vec3 vP;
void main(){ if(length(vV)<2.6) discard; float f=abs(dot(normalize(vN),normalize(vV))), lat=clamp(vP.y,0.,1.), ang=atan(vP.z,vP.x); if(n3(vec3(ang*3.,lat*5.,1.))<vC.y) discard;
 float v=vC.x*(.25+.95*f)+(n3(vec3(ang*2.,lat*4.-time*1.5,time*.3))-.5)*.3-lat*.12; vec3 c=v>.95?vec3(1.,.98,.88):v>.75?vec3(1.,.8,.3):v>.55?vec3(1.,.4,.06):v>.38?vec3(.62,.08,.03):vec3(.04,.01,.01);
 c*=mix(.28,1.,smoothstep(.08,.26,f)); gl_FragColor=vec4(c,1.); }`;
/* anel de choque com espessura (aS.x = progresso) */
const SHOCK_V = `attribute vec2 aS; varying vec2 vS; varying vec3 vP; void main(){ vS=aS; vP=position; gl_Position=projectionMatrix*viewMatrix*modelMatrix*instanceMatrix*vec4(position,1.); }`;
const SHOCK_F = `${NOISE} uniform float time; varying vec2 vS; varying vec3 vP; void main(){ float ang=atan(vP.z,vP.x), k=vS.x; if(n2(vec2(ang*20.+vS.y*9.,time*3.))<k*.9-.15) discard;
 float r=length(vP.xz), inner=smoothstep(1.03,.97,r); vec3 c=mix(vec3(.16,.1,.08),vec3(1.,.5,.12),inner*(1.-k)); c=mix(c,vec3(1.,.95,.82),inner*clamp(vP.y*6.+.5,0.,1.)*(1.-k)*.8); gl_FragColor=vec4(c,1.); }`;

function bladeGeo(T) { const pos = [], uv = [], idx = [], N = 9;
  for (let j = 0; j <= N; j++) { const y = j / N, w = .5 * (y < .25 ? y / .25 : (1 - y) / .75) * (j % 2 ? .6 : 1) + .01, b = y * y * .25; pos.push(-w + b, y, 0, b, y, 0, w + b, y, 0); uv.push(-1, y, 0, y, 1, y); if (j < N) { const a = j * 3, c = a + 3; idx.push(a, c, a + 1, a + 1, c, c + 1, a + 1, c + 1, a + 2, a + 2, c + 1, c + 2); } }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); return g; }

export function createBombardVFX(T, kit) {
  const { root, glow, rib, decals, shard, plate, ring, ground } = kit; const geos = [], mats = [], uTime = { value: 0 };
  const up = new T.Vector3(0, 1, 0), A = new T.Vector3(), B = new T.Vector3(), D = new T.Vector3(), E = new T.Vector3(), X = new T.Vector3(), Z = new T.Vector3(), Q = new T.Quaternion(), M = new T.Matrix4(), S = new T.Vector3();
  const cam = new T.Vector3(), nrm = [0, 1, 0]; let time = 0, low = false;
  const inst = (geo, vs, fs, n, attr, size, side = T.FrontSide) => { const arr = new Float32Array(n * size); geo.setAttribute(attr, new T.InstancedBufferAttribute(arr, size).setUsage(T.DynamicDrawUsage));
    const m = new T.ShaderMaterial({ vertexShader: vs, fragmentShader: fs, uniforms: { time: uTime }, side, toneMapped: false, fog: false }); mats.push(m); geos.push(geo);
    const o = new T.InstancedMesh(geo, m, n); o.frustumCulled = false; o.count = 0; root.add(o); return { o, arr, n: 0, max: n, size }; };
  const puffs = inst(new T.IcosahedronGeometry(1, 2), PUFF_V, PUFF_F, 140, 'aP', 4), blades = inst(bladeGeo(T), BLADE_V, BLADE_F, 180, 'aP', 4, T.DoubleSide);
  const domeG = new T.SphereGeometry(1, 36, 14, 0, Math.PI * 2, 0, Math.PI / 2), cores = inst(domeG, CORE_V, CORE_F, 10, 'aC', 2, T.DoubleSide);
  const torG = new T.TorusGeometry(1, .05, 8, 64); torG.rotateX(Math.PI / 2); torG.scale(1, 3, 1); const shocks = inst(torG, SHOCK_V, SHOCK_F, 10, 'aS', 2, T.DoubleSide);
  const put = (I, p, q, sx, sy, sz, vals) => { if (I.n >= I.max) return; S.set(sx, sy, sz); M.compose(p, q, S); I.o.setMatrixAt(I.n, M); I.arr.set(vals, I.n * I.size); I.n++; };
  const puff = (x, y, z, rx, ry, heat, pal, dis, seed, dir) => { if (rx <= .02 || dis >= 1) return; A.set(x, y, z); if (dir) Q.setFromUnitVectors(up, dir); else Q.setFromAxisAngle(up, seed * 6.283); put(puffs, A, Q, rx, ry, rx, [heat, pal, dis, seed]); };
  const blade = (px, py, pz, dx, dy, dz, L, W, core, pal, dis, seed) => { if (L < .05 || dis >= 1) return; D.set(dx, dy, dz).normalize(); E.set(cam.x - px, cam.y - py, cam.z - pz); X.crossVectors(D, E).normalize(); Z.crossVectors(X, D); M.makeBasis(X, D, Z); Q.setFromRotationMatrix(M); A.set(px, py, pz); put(blades, A, Q, W, L, W, [core, pal, dis, seed]); };
  const RED = [1, .06, .12], WHT = [1, .95, .95];

  function emitter(s, boss) { // fonte suspensa: núcleo + anel quebrado + cruz de lâminas, girando
    const T0 = s.T, k = s.phase === 'rise' ? easeOut(Math.min(1, s.age / T0.rise)) : s.phase === 'fade' ? 1 - smooth(s.t / .5) : 1; if (k <= .01) return;
    const last = s.shots.length ? s.shots[s.shots.length - 1] : null, kick = last && s.age - last.tFire < .18 ? 1 - (s.age - last.tFire) / .18 : 0, ox = s.ox, oy = s.oy + kick * .5, oz = s.oz, R = 2.3 * k, sp = time * 1.7;
    puff(ox, oy, oz, (.85 + .08 * Math.sin(time * 13)) * k * (1 + .35 * kick), (.85 + .08 * Math.sin(time * 13)) * k * (1 + .35 * kick), 1, 1, 0, .3);
    for (let i = 0; i < (low ? 7 : 12); i++) { if (i % 4 === 3) continue; const a = i / 12 * 6.283 + sp, ca = Math.cos(a), sa = Math.sin(a), cx = ox + ca * R, cz = oz + sa * R; // anel de plasma quebrado
      blade(cx, oy - .15, cz, -sa, .25 * Math.sin(a * 3 + time * 4), ca, R * .5, .45, .7, 0, 0, hash(i + 3)); }
    for (let i = 0; i < 4; i++) { const a = i * 1.5708 + .785 - sp * .45, L = (2.6 + .5 * Math.sin(time * 6 + i)) * k; blade(ox + Math.cos(a) * .5, oy, oz + Math.sin(a) * .5, Math.cos(a), -.18, Math.sin(a), L, .9, .9, 0, 0, hash(i + 9)); } // cruz de lâminas
    glow.add(ox, oy, oz, 3.4 * k * (1 + kick), 3.4 * k * (1 + kick), 1, .1, .2, .75 * k, 0); glow.add(ox, oy, oz, 1.4 * k, 1.4 * k, 1, .9, .9, .8 * k, 2, time);
    if (!low && hash(Math.floor(time * 9)) > .7) { const a = hash(Math.floor(time * 9) + 1) * 6.283, b = a + 1.2; let px = ox + Math.cos(a) * R, pz = oz + Math.sin(a) * R, py = oy;
      for (let j = 1; j <= 4; j++) { const u = j / 4, aa = a + (b - a) * u, x = ox + Math.cos(aa) * R * (1 + (hash(j + time) - .5) * .3), z = oz + Math.sin(aa) * R * (1 + (hash(j * 3 + time) - .5) * .3), y = oy + (hash(j * 7 + time) - .5) * .6; rib.seg(px, py, pz, x, y, z, .05, .05, [1, .85, .95, .9 * k], [1, .3, .5, .9 * k]); px = x; py = y; pz = z; } }
    if (boss) { rib.seg(boss.x, boss.y + 2.4, boss.z, ox, oy - .5, oz, .04, .015, [1, .1, .2, .35 * k], [1, .5, .6, .2 * k]); } // vínculo tênue bispo → emissor
  }
  function drawShot(s, p) {
    const T0 = s.T, gy = p.y; groundNormal(ground, p.x, p.z, nrm);
    if (p.state === 'fall') { const u = Math.min(1, (s.age - p.tFire) / T0.fall), e = u * u; // aviso no ponto REAL + descida em reta travada
      decals.add(p.x, gy, p.z, T0.r * p.scale * (2.2 - 1.2 * u), 1, .08, .14, .55 + .45 * u, 0, u, p.n + 7, nrm);
      const cr = T0.r * p.scale * .55; rib.seg(p.x - cr, gy + .06, p.z, p.x + cr, gy + .06, p.z, .05, .05, [1, .1, .15, .8 * u + .2], [1, .1, .15, .8 * u + .2]); rib.seg(p.x, gy + .06, p.z - cr, p.x, gy + .06, p.z + cr, .05, .05, [1, .1, .15, .8 * u + .2], [1, .1, .15, .8 * u + .2]);
      A.set(p.fx, p.fy, p.fz).lerp(B.set(p.x, gy + .3, p.z), e); D.set(p.x - p.fx, gy - p.fy, p.z - p.fz).normalize();
      puff(A.x, A.y, A.z, .32 * p.scale, 1.35 * p.scale, 1, 1, 0, p.n * .37, D); // corpo opaco com núcleo
      E.copy(A).addScaledVector(D, -3.2 * Math.min(1, u * 4)); rib.seg(E.x, E.y, E.z, A.x, A.y, A.z, .02, .32 * p.scale, [1, .1, .2, 0], [1, .85, .9, .95]);
      glow.add(A.x, A.y, A.z, 1.3, 1.3, 1, .15, .25, .8, 0);
      return; }
    const bt = p.bt, sc = p.scale, R = T0.r * sc, x = p.x, z = p.z;
    if (bt < .08) { glow.add(x, gy + 1, z, 6 * sc, 6 * sc, 1, .9, .7, 1 - bt / .08, 0); glow.add(x, gy + .8, z, 3.5 * sc, 3.5 * sc, 1, 1, 1, 1 - bt / .08, 2, .4); }
    // núcleo: domo branco/amarelo com casca laranja/negra recortada, cresce rápido e erode
    const cg = easeOut(Math.min(1, bt / .16)), er = smooth((bt - .35) / .55); if (er < .99) { A.set(x, gy - .1, z); Q.identity(); const rc = R * (.55 + .7 * cg); put(cores, A, Q, rc, rc * (.9 + .3 * cg), rc, [1.05 - .6 * smooth(bt / .7), er]); }
    // anel de choque com espessura + anel de pressão no ar
    const sk = Math.min(1, bt / .55); if (sk < 1) { A.set(x, gy + .1, z); Q.identity(); const rr = R * (.8 + 2.6 * easeOut(sk)); put(shocks, A, Q, rr, 1.3 * (1 - sk) + .3, rr, [sk, p.n]); decals.add(x, gy, z, rr * 1.05, 1, .45, .15, (1 - sk) * .85, 0, sk, p.n + 3, nrm); }
    { const k = (bt - .08) / .6; if (k > 0 && k < 1) ring(x, gy + 2.2 * sc + k * 1.6, z, R * (.6 + 2 * easeOut(k)), (1 - k) * 1.6 + .3); }
    // coluna e cogumelo em faixas que sobem e esfriam (fumaça só no fim)
    const cool = smooth((bt - .5) / .9), dis = smooth((bt - 1.1) / .8), top = (1 + 2.3 * easeOut(Math.min(1, bt / .7))) * sc;
    for (let i = 0; i < 3; i++) { const yy = gy + top * (i + .5) / 3.4; puff(x + (hash(p.n + i) - .5) * .3, yy, z + (hash(p.n + i + 5) - .5) * .3, (.42 - i * .05) * sc * (.6 + .6 * cg), (.55 - i * .05) * sc, 1.02 - .85 * cool - i * .04, 0, smooth((bt - .9 - i * .08) / .6), p.n + i * .13); }
    for (let i = 0; i < (low ? 3 : 6); i++) { const a = i / 6 * 6.283 + p.n, rr = (.5 + .6 * easeOut(Math.min(1, bt / .5))) * sc, cy = gy + top; puff(x + Math.cos(a) * rr, cy + Math.sin(a * 2) * .2 * sc, z + Math.sin(a) * rr, (.55 + .2 * hash(p.n + i)) * sc * (.5 + .6 * cg), (.42 + .15 * hash(p.n + i)) * sc * (.5 + .6 * cg), 1 - .9 * cool, 0, dis, p.n + i * .29); }
    puff(x, gy + top + .25 * sc, z, .62 * sc * (.5 + .6 * cg), .5 * sc * (.5 + .6 * cg), 1.05 - .9 * cool, 0, dis, p.n + .9);
    // pedras e placas saindo do MESMO epicentro; às vezes um relâmpago
    for (let i = 0; i < (low ? 3 : 6); i++) { const a = hash(p.n * 7 + i) * 6.283, v = 3 + 4 * hash(p.n + i * 3), vy = 4 + 5 * hash(p.n * 3 + i), y = vy * bt - 4.9 * bt * bt; if (y < 0) continue; shard(x + Math.cos(a) * v * bt, gy + .3 + y, z + Math.sin(a) * v * bt, (.1 + .14 * hash(i + p.n)) * sc, bt * 7 + i, bt * 4, i, 1.3); }
    if (bt < .9) for (let i = 0; i < (low ? 2 : 4); i++) { const a = i / 4 * 6.283 + hash(p.n) * 3, u = easeOut(Math.min(1, bt / .3)), rr = R * (.7 + .5 * u); plate(x + Math.cos(a) * rr, gy - .15 + .35 * Math.sin(Math.min(1, bt / .3) * 3.14), z + Math.sin(a) * rr, .45 * sc * (1 - smooth((bt - .5) / .4)), (hash(i + p.n) - .5) * 1.2, a, .6); }
    if (!low && bt < .35 && hash(p.n * 13) > .55) { let px = x, py = gy + top * .9, pz = z; for (let j = 1; j <= 5; j++) { const xx = x + (hash(p.n + j * 3 + Math.floor(time * 20)) - .5) * 2.2 * sc, yy = gy + top * .9 * (1 - j / 5), zz = z + (hash(p.n * 2 + j + Math.floor(time * 20)) - .5) * 2.2 * sc; rib.seg(px, py, pz, xx, yy, zz, .045, .045, [.75, .5, 1, .95], [1, .85, 1, .95]); px = xx; py = yy; pz = zz; } }
    decals.add(x, gy, z, R * 1.9, .6, .14, .05, .85 * (1 - smooth((bt - 1.4) / .8)), 1, Math.min(1, bt * 2), p.n + 11, nrm); // marca queimada temporária
  }
  function drawFire(s, f) { const T0 = s.T, age = s.age - f.born, life = T0.fireLife, k = Math.min(1, age / .25) * (1 - smooth((age - (life - .8)) / .8)); if (k <= .01) return;
    groundNormal(ground, f.x, f.z, nrm); decals.add(f.x, f.y, f.z, f.r * 1.5, 1, .38, .06, .75 * k, 2, 0, Math.floor(f.x * 13 + f.z * 7), nrm);
    const n = low ? 3 : 6; for (let i = 0; i < n; i++) { const a = hash(f.x + i) * 6.283, rr = f.r * (.25 + .6 * hash(f.z + i)), fl = .65 + .35 * Math.sin(time * (9 + i) + i * 2.1);
      blade(f.x + Math.cos(a) * rr, f.y + .02, f.z + Math.sin(a) * rr, Math.cos(a) * .15, 1, Math.sin(a) * .15, (.6 + .7 * hash(f.x * 3 + i)) * fl * k, .4 + .2 * hash(i), .9, 1, 0, hash(i + f.x)); }
    if (!low) for (let i = 0; i < 4; i++) { const u = (time * (.6 + hash(i + f.z)) + hash(i * 5 + f.x)) % 1; glow.add(f.x + (hash(i + f.x) - .5) * f.r, f.y + .2 + u * 1.6, f.z + (hash(i * 3 + f.z) - .5) * f.r, .07, .2, 1, .55, .12, (1 - u) * k, 3, i, i); } }
  return {
    begin(camera, t, q) { time = t; uTime.value = t; low = q === 0; cam.copy(camera.position); puffs.n = blades.n = cores.n = shocks.n = 0; },
    draw(s, boss) { emitter(s, boss); for (const p of s.shots) drawShot(s, p); for (const f of s.fires) drawFire(s, f); },
    end() { for (const I of [puffs, blades, cores, shocks]) { I.o.count = I.n; I.o.instanceMatrix.needsUpdate = true; for (const k in I.o.geometry.attributes) if (k === 'aP' || k === 'aC' || k === 'aS') I.o.geometry.attributes[k].needsUpdate = true; } },
    clear() { for (const I of [puffs, blades, cores, shocks]) { I.n = 0; I.o.count = 0; } },
    dispose() { for (const g of geos) g.dispose(); for (const m of mats) m.dispose(); }
  };
}
