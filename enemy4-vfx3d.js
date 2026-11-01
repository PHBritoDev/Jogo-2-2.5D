import { softParticles, groundDecals, groundNormal, ribbons, smooth, easeOut, hash } from './celestial-fxkit3d.js';
/**
 * MOD 246 — VFX do Enemy4 e do mini-chefe Enemy4. Só desenha o estado da lógica (enemy4-squad3d.js). Estética sakuga:
 * volumes sólidos recortados (discard com corte duro), três camadas — núcleo branco/amarelo, corpo magenta/roxo/carmim,
 * casca preta (#040008) recortada. Transparência só onde é técnica (brilho aditivo, marcas no chão).
 *  • Santuário: marca com o raio REAL que se enche no aviso; pilar = núcleo branco-magenta + casca negra rasgada em
 *    lâminas verticais; anéis concêntricos na base e flares cruciformes.
 *  • Constelação: globo magenta com estrela branca de 4 pontas e flare horizontal, garras negras em volta; impacto =
 *    cúpula magenta rasgada por tinta preta que erode, detritos e decalque.
 *  • Perfurador: broca helicoidal de fitas negras com veios magenta/violeta (não é um cone liso), anéis de vento
 *    angulares e placas de pedra; versão subterrânea com marca antes de emergir.
 *  • Jaula/Mandíbula: correntes espinhosas vermelho-preto que mergulham no solo, rotas de fuga marcadas, mordida
 *    gigante de dentes negros/carmim; correntes flutuando nas costas do mini-chefe.
 * Buffers fixos e instanciados (~14 chamadas de desenho); qualidade baixa só reduz quantidade.
 */
const NOISE = `float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){return n2(p)*.5+n2(p*2.03+1.7)*.3+n2(p*4.1+3.1)*.2;}`;
const TONE = `
 #include <tonemapping_fragment>
 #include <colorspace_fragment>`;
const IV = `attribute vec4 aFx; varying vec2 vUv; varying vec4 vFx; varying vec3 vN; varying vec3 vV; varying vec3 vP;
void main(){ vUv=uv; vFx=aFx; vP=position; vec4 w=modelMatrix*instanceMatrix*vec4(position,1.); vN=normalize(mat3(modelMatrix*instanceMatrix)*normal); vV=cameraPosition-w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
// marca no chão: 0 santuário (magenta), 1 broca (violeta), 2 mordida (carmim). vFx: kind, progresso, alfa, semente
const MARK = `${NOISE} uniform float time; varying vec2 vUv; varying vec4 vFx;
void main(){ vec2 p=vUv*2.-1.; float r=length(p), a=atan(p.y,p.x), k=vFx.y; if(r>.97) discard; float E=.87;
 vec3 col=vFx.x<.5?vec3(1.,.1,.7):vFx.x<1.5?vec3(.6,.2,1.):vec3(1.,.04,.1);
 float ring=1.-smoothstep(.012,.03,abs(r-E)), fill=step(r,E*k)*(.18+.12*step(.5,fract(r*9.-time*3.))), rune=step(.6,h(vec2(floor((a+3.1416)*4.)+vFx.w,0.)))*step(abs(r-.72),.05)*step(.5,fract((a+3.1416)*12.732));
 float cross=step(abs(p.x),.02)*step(r,E)+step(abs(p.y),.02)*step(r,E);
 vec3 c=mix(col,vec3(1.,.95,1.),k*k*.7); float A=(ring+fill+rune*.8+cross*.35*k+step(r,E)*.08)*vFx.z; if(A<.01) discard; gl_FragColor=vec4(c,clamp(A,0.,1.)); }`;
// pilar: núcleo (aditivo) e casca negra rasgada em lâminas verticais (opaca, corte duro)
const CORE = `varying vec2 vUv; varying vec4 vFx; varying vec3 vN; varying vec3 vV; void main(){ float f=abs(dot(normalize(vN),normalize(vV))); float a=pow(f,1.4)*vFx.x*(1.-smoothstep(.85,1.,vUv.y));
 vec3 c=mix(vec3(1.,.15,.7),vec3(1.,.97,1.),pow(f,4.)); gl_FragColor=vec4(c*a,a); }`;
const SHELL = `${NOISE} uniform float time; varying vec2 vUv; varying vec4 vFx; varying vec3 vN; varying vec3 vV;
void main(){ float s=n2(vec2(vUv.x*18.+vFx.w,vUv.y*1.5-time*3.)); float blade=step(.42,s)*step(vUv.y,1.-(1.-s)*.7*(1.-vFx.y)); if(blade<.5||vUv.y>vFx.y+(s-.5)*.3) discard;
 float e=smoothstep(.42,.48,s)*(1.-smoothstep(.48,.55,s)); float f=1.-abs(dot(normalize(vN),normalize(vV)));
 vec3 c=mix(vec3(.004,0.,.008),vec3(1.,.08,.6),e+smoothstep(.6,1.,f)*.4); gl_FragColor=vec4(c,1.);${TONE}
}`;
const ORB = `varying vec2 vUv; varying vec4 vFx; varying vec3 vN; varying vec3 vV; void main(){ float f=abs(dot(normalize(vN),normalize(vV)));
 vec3 c=mix(vec3(.35,0.,.4),vec3(1.,.2,.85),smoothstep(.15,.6,f)); c=mix(c,vec3(1.,.96,1.),smoothstep(.8,1.,f)); float a=(.45+.55*f)*vFx.x; gl_FragColor=vec4(c*a,a); }`;
const DOME = `${NOISE} uniform float time; varying vec4 vFx; varying vec3 vN; varying vec3 vV; varying vec3 vP;
void main(){ float lat=clamp(vP.y,0.,1.), ang=atan(vP.z,vP.x); float er=fbm(vec2(ang*3.+vFx.w,lat*5.-time*.4)); if(er<vFx.y) discard;
 float f=1.-abs(dot(normalize(vN),normalize(vV))); float body=fbm(vec2(ang*2.4+time*.6+lat*1.8,lat*3.5-time+vFx.w));
 float ink=smoothstep(.8,.86,1.-abs(fbm(vec2(ang*3.2+lat*4.+vFx.w*2.,lat*1.4+time*.3)*vec2(1.2,5.4))*2.-1.));
 vec3 c=mix(vec3(.42,.02,.38),vec3(1.,.2,.8),smoothstep(.35,.62,body)); c=mix(c,vec3(1.,.9,1.),pow(1.-f,7.)*.9); c=mix(c,vec3(.016,0.,.03),ink); c+=vec3(1.,.4,.9)*smoothstep(vFx.y+.07,vFx.y,er)*step(.01,vFx.y)*1.4;
 gl_FragColor=vec4(c,1.);${TONE}
}`;
// broca helicoidal: fitas negras torcidas com veios magenta/violeta e vãos recortados
const DRILL = `${NOISE} uniform float time; varying vec2 vUv; varying vec4 vFx; varying vec3 vN; varying vec3 vV;
void main(){ float u=vUv.x, v=vUv.y; float band=fract(u*3.+v*5.5-vFx.x*7.); if(band<.14) discard; if(v>.97) discard;
 float vein=smoothstep(.82,.86,band)*(1.-smoothstep(.95,.99,band)); float f=1.-abs(dot(normalize(vN),normalize(vV)));
 vec3 c=vec3(.006,0.,.014); c=mix(c,mix(vec3(1.,.15,.75),vec3(.55,.25,1.),v),vein); c+=vec3(.55,.1,.9)*smoothstep(.6,1.,f)*.5; c+=vec3(1.,.95,1.)*smoothstep(.9,1.,v)*.6;
 gl_FragColor=vec4(c,1.);${TONE}
}`;

export function createEnemy4VFX(T, scene, { ground = () => 0 } = {}) {
  const root = new T.Group(); root.name = 'Enemy4VFX'; scene.add(root);
  const uTime = { value: 0 }, mats = [], geos = [];
  const fxAttr = (g, n) => { const a = new Float32Array(n * 4); g.setAttribute('aFx', new T.InstancedBufferAttribute(a, 4).setUsage(T.DynamicDrawUsage)); return a; };
  const mk = (geo, frag, n, o = {}) => { const fx = fxAttr(geo, n), mat = new T.ShaderMaterial({ vertexShader: IV, fragmentShader: frag, uniforms: { time: uTime }, transparent: !!o.t, depthWrite: !o.t, side: o.side ?? T.FrontSide,
    blending: o.add ? T.CustomBlending : T.NormalBlending, blendSrc: T.OneFactor, blendDst: T.OneFactor, toneMapped: false, fog: false, polygonOffset: !!o.poly, polygonOffsetFactor: o.poly ? -2 : 0, polygonOffsetUnits: o.poly ? -2 : 0 });
    const m = new T.InstancedMesh(geo, mat, n); m.frustumCulled = false; m.count = 0; if (o.order !== undefined) m.renderOrder = o.order; root.add(m); mats.push(mat); geos.push(geo); return { m, fx, n: 0, max: n }; };
  const markGeo = new T.PlaneGeometry(2, 2); markGeo.rotateX(-Math.PI / 2);
  const cyl = () => { const g = new T.CylinderGeometry(1, 1, 1, 18, 1, true); g.translate(0, .5, 0); return g; };
  const cone = () => { const g = new T.CylinderGeometry(0, 1, 1, 14, 6, true); g.translate(0, .5, 0); return g; };
  const marks = mk(markGeo, MARK, 72, { t: true, poly: true, order: 2 }), cores = mk(cyl(), CORE, 24, { t: true, add: true, order: 6 }), shells = mk(cyl(), SHELL, 24, { side: T.DoubleSide });
  const orbs = mk(new T.SphereGeometry(1, 20, 14), ORB, 32, { t: true, add: true, order: 5 }), domes = mk(new T.SphereGeometry(1, 32, 14, 0, Math.PI * 2, 0, Math.PI / 2), DOME, 16, { side: T.DoubleSide });
  const drills = mk(cone(), DRILL, 48, { side: T.DoubleSide });
  const linkGeo = new T.TorusGeometry(.16, .045, 5, 8); linkGeo.scale(1, 1.6, 1); geos.push(linkGeo);
  const linkMat = new T.MeshStandardMaterial({ color: 0x1a0306, metalness: .7, roughness: .3, emissive: 0xa0000e, emissiveIntensity: .7, flatShading: true }); mats.push(linkMat);
  const links = new T.InstancedMesh(linkGeo, linkMat, 360); links.frustumCulled = false; links.count = 0; root.add(links);
  const shardGeo = new T.OctahedronGeometry(1, 0); shardGeo.scale(.42, 1.35, .42); geos.push(shardGeo);
  const blackMat = new T.MeshStandardMaterial({ color: 0x050008, roughness: .35, metalness: .35, emissive: 0x30042a, emissiveIntensity: .8, flatShading: true }); mats.push(blackMat);
  const shards = new T.InstancedMesh(shardGeo, blackMat, 420); shards.frustumCulled = false; shards.count = 0; root.add(shards);
  const toothGeo = new T.ConeGeometry(.16, 1, 5); geos.push(toothGeo); const toothMat = new T.MeshStandardMaterial({ color: 0x0a0204, roughness: .4, metalness: .3, emissive: 0x70000c, emissiveIntensity: .9, flatShading: true }); mats.push(toothMat);
  const teeth = new T.InstancedMesh(toothGeo, toothMat, 64); teeth.frustumCulled = false; teeth.count = 0; root.add(teeth);
  const glow = softParticles(T, 900), rib = ribbons(T, 900, { flow: 14 }), decals = groundDecals(T, 40); root.add(glow.mesh, rib.mesh, decals.mesh);
  const M = new T.Matrix4(), Q = new T.Quaternion(), S = new T.Vector3(), P = new T.Vector3(), E = new T.Euler(), up = new T.Vector3(0, 1, 0), D = new T.Vector3(), cam = new T.Vector3(), nrm = [0, 1, 0];
  let time = 0, low = false, ln = 0, sn = 0, tn = 0;
  const MAG = [1, .2, .8], VIO = [.6, .3, 1], RED = [1, .06, .16], WHT = [1, .95, 1], c4 = (c, a) => [c[0], c[1], c[2], a];
  const put = (B, x, y, z, sx, sy, sz, a, b, c, d, q) => { if (B.n >= B.max) return; P.set(x, y, z); S.set(sx, sy, sz); M.compose(P, q || Q.identity(), S); B.m.setMatrixAt(B.n, M); B.fx.set([a, b, c, d], B.n * 4); B.n++; };
  const mark = (x, z, r, kind, k, a, seed) => { groundNormal(ground, x, z, nrm); D.set(nrm[0], nrm[1], nrm[2]); Q.setFromUnitVectors(up, D); put(marks, x, ground(x, z) + .04, z, r * 1.15, 1, r * 1.15, kind, k, a, seed, Q); };
  function shard(x, y, z, s, rx, ry, rz, sy) { if (sn >= 420 || s <= .005) return; P.set(x, y, z); Q.setFromEuler(E.set(rx, ry, rz)); S.set(s, sy || s, s); M.compose(P, Q, S); shards.setMatrixAt(sn++, M); }
  const LR = new T.Quaternion(), TQ = new T.Quaternion();
  function link(x, y, z, dx, dy, dz, roll, s = 1) { if (ln >= 360) return; D.set(dx, dy, dz).normalize(); Q.setFromUnitVectors(up, D); E.set(0, roll, 0); LR.setFromEuler(E); Q.multiply(LR); P.set(x, y, z); S.setScalar(s); M.compose(P, Q, S); links.setMatrixAt(ln++, M); }
  function chainCurve(ax, ay, az, bx, by, bz, k, seed, s = 1, sag = 1.2) { // corrente de elos alternados com espinhos, de a até b (k = quanto já mergulhou)
    const L = Math.hypot(bx - ax, by - ay, bz - az), n = Math.max(4, Math.min(28, Math.round(L / (.36 * s))));
    let px = ax, py = ay, pz = az; for (let i = 1; i <= n; i++) { const u = i / n * k, x = ax + (bx - ax) * u, z = az + (bz - az) * u, y = ay + (by - ay) * u + Math.sin(u * Math.PI) * sag + Math.sin(time * 3 + i + seed) * .06;
      link((px + x) / 2, (py + y) / 2, (pz + z) / 2, x - px, y - py, z - pz, i * Math.PI / 2, s); if (i % 3 === 0 && !low) shard(x, y, z, .07 * s, i, seed + i, 0, .2 * s); px = x; py = y; pz = z; }
    return [px, py, pz];
  }

  /* ---------- Santuário ---------- */
  function drawSanctum(s, boss) {
    for (const m of s.marks) {
      const r = m.r, ph = m.phase;
      if (ph === 'warn' || ph === 'charge') { const k = ph === 'warn' ? m.t / m.warn * .8 : .8 + .2 * m.t / m.charge; mark(m.x, m.z, r, 0, k, Math.min(1, m.t * 5 + (ph === 'charge' ? 1 : 0)), m.seed);
        if (ph === 'charge') { for (let i = 0; i < (low ? 4 : 9); i++) { const a = i * 2.4 + time * 5, rr = r * (1 - m.t / m.charge); glow.add(m.x + Math.cos(a) * rr, m.y + .1 + i * .04, m.z + Math.sin(a) * rr, .05, .3, 1, .2, .8, .9, 3, a + 1.57, i); } } }
      else {
        const k = ph === 'pillar' ? easeOut(m.t / .12) : 1, f = ph === 'fade' ? 1 - smooth(m.t / s.T.fade) : 1, H = s.T.H * (boss ? 1.25 : 1) * k;
        put(cores, m.x, m.y, m.z, r * .5 * f, H, r * .5 * f, 1.2 * f, 0, 0, 0); put(shells, m.x, m.y, m.z, r * .92, H * (.6 + .4 * f), r * .92, 0, ph === 'fade' ? f : 1, 0, m.seed);
        groundNormal(ground, m.x, m.z, nrm); for (let i = 0; i < 3; i++) { const u = ((ph === 'pillar' ? m.t : s.T.pillar + m.t) * 1.6 + i / 3) % 1; decals.add(m.x, m.y, m.z, r * (1 + u * 1.8), 1, .15, .7, (1 - u) * .8 * f, 0, u, m.id + i, nrm); }
        if (ph === 'pillar' && m.t < .2) { glow.add(m.x, m.y + .4, m.z, r * 2.5, r * 2.5, 1, .9, 1, 1, 2, time + m.id); glow.add(m.x, m.y + H * .9, m.z, r * 1.6, r * 1.6, 1, .5, 1, .8, 2, time); rib.seg(m.x - 2.2 * r, m.y + .5, m.z, m.x + 2.2 * r, m.y + .5, m.z, .02, .02, c4(WHT, .9), c4(WHT, .9)); }
        if (!low && f > .2) for (let i = 0; i < 6; i++) { const u = (time * 1.4 + i / 6) % 1, a = i * 2.4 + m.id; glow.add(m.x + Math.cos(a) * r * .8, m.y + u * H, m.z + Math.sin(a) * r * .8, .04, .35, 1, .3, .85, (1 - u) * f, 3, 0, i); }
      }
    }
  }
  /* ---------- Constelação ---------- */
  function drawConstellation(s, boss) {
    const T0 = s.T, R = T0.r * 1.6;
    for (const o of s.orbs) {
      if (o.state === 'hold' || o.state === 'fly' || o.state === 'fizzle') {
        const g = o.state === 'hold' ? o.g : o.state === 'fizzle' ? 1 - o.t / .35 : 1, rr = R * Math.max(.05, g);
        put(orbs, o.x, o.y, o.z, rr, rr, rr, g, 0, 0, 0);
        glow.add(o.x, o.y, o.z, rr * 2.2, rr * 2.2, 1, .9, 1, .9 * g, 2, time * .5 + o.i); glow.add(o.x, o.y, o.z, rr * 3.4, rr * 3.4, 1, .1, .7, .45 * g, 0);
        rib.seg(o.x - rr * 3.2, o.y, o.z, o.x + rr * 3.2, o.y, o.z, .025 * g, .025 * g, c4(WHT, .9 * g), c4(WHT, .9 * g)); // flare horizontal
        const n = low ? 3 : 6; for (let i = 0; i < n; i++) { const a = i / n * 6.283 + time * 1.4 + o.i, b = Math.sin(time * 2 + i) * .5; shard(o.x + Math.cos(a) * rr * 1.25, o.y + Math.sin(b) * rr, o.z + Math.sin(a) * rr * 1.25, rr * .32 * g, Math.cos(a) * 1.2, a, Math.sin(a) * 1.2, rr * .9 * g); } // garras negras
        if (o.state === 'fly') rib.seg(o.x - o.dx * 2.2, o.y - o.dy * 2.2, o.z - o.dz * 2.2, o.x, o.y, o.z, .02, rr * .8, c4(MAG, 0), c4(MAG, .8));
      } else if (o.state === 'boom') {
        const k = o.t / .75, R2 = T0.R * (k < .2 ? easeOut(k / .2) : 1), er = smooth((k - .45) / .55), gy = ground(o.x, o.z), base = Math.min(o.y, gy + .2);
        put(domes, o.x, base, o.z, R2, R2 * .85, R2, 0, er, 0, o.seed); groundNormal(ground, o.x, o.z, nrm);
        decals.add(o.x, gy, o.z, R2 * 1.5, 1, .2, .75, (1 - k) * .9, 0, k, o.i, nrm); decals.add(o.x, gy, o.z, R2 * .9, .7, .05, .5, (1 - k) * .7, 1, 1, o.i + 3, nrm);
        if (k < .15) glow.add(o.x, base + .3, o.z, R2 * 2.4, R2 * 2.4, 1, .9, 1, 1 - k * 6, 2, time);
        for (let i = 0; i < (low ? 4 : 9); i++) { const a = i * 2.39996 + o.i, u = easeOut(k * 1.6); shard(o.x + Math.cos(a) * u * R2 * 1.3, gy + Math.sin(Math.min(1, k * 1.6) * 3.14) * .9, o.z + Math.sin(a) * u * R2 * 1.3, .1 * (1 - k), a, k * 7, i); }
      }
    }
  }
  /* ---------- Perfurador ---------- */
  const _q = new T.Quaternion();
  function drawDrill(s, boss) {
    const T0 = s.T, big = boss ? 1.25 : 1;
    for (const d of s.drills) {
      if (d.under) {
        if (d.phase === 'warn') { mark(d.x, d.z, T0.ur, 1, d.t / T0.warn, Math.min(1, d.t * 6), d.id); if (d.t > T0.warn * .6 && !low) for (let i = 0; i < 3; i++) { const a = hash(i + d.id + Math.floor(time * 12)) * 6.283; shard(d.x + Math.cos(a) * T0.ur * .7, d.y + .05, d.z + Math.sin(a) * T0.ur * .7, .07, a, a, 0); } continue; }
        const k = d.phase === 'active' ? easeOut(d.t / .12) : 1 - smooth(d.t / T0.retract), H = 2.6 * big * k, w = T0.ur * .75;
        _q.identity(); put(drills, d.x, d.y - .1, d.z, w, H, w, time * 2 + d.id, 0, 0, 0, _q);
        for (let i = 0; i < (low ? 3 : 7); i++) { const a = i / 7 * 6.283 + d.id; shard(d.x + Math.cos(a) * w * 1.3, d.y + .1 * k, d.z + Math.sin(a) * w * 1.3, .9 * w * k, Math.cos(a) * .8, a, Math.sin(a) * .8, .25 * k); } // placas de pedra
        windRings(d.x, d.y + H * .3, d.z, 0, 1, 0, w * 1.6, k);
      } else {
        if (d.phase === 'burst') { const k = d.t / .3; glow.add(d.x, d.y, d.z, 1.1 * (1 - k) * big, 1.1 * (1 - k) * big, .7, .2, 1, 1 - k, 0); for (let i = 0; i < (low ? 3 : 6); i++) { const a = i * 2.4 + d.id; shard(d.x + Math.cos(a) * k * .9, d.y + Math.sin(k * 3) * .4, d.z + Math.sin(a) * k * .9, .06 * (1 - k), a, k * 5, i); } continue; }
        D.set(d.dx, d.dy, d.dz); _q.setFromUnitVectors(up, D); const L = 1.5 * big, w = T0.r * 1.15; put(drills, d.x - d.dx * L, d.y - d.dy * L, d.z - d.dz * L, w, L, w, time * 3 + d.id, 0, 0, 0, _q);
        windRings(d.x - d.dx * L * .55, d.y - d.dy * L * .55, d.z - d.dz * L * .55, d.dx, d.dy, d.dz, w * 1.7, 1);
        rib.seg(d.x - d.dx * L * 2.6, d.y - d.dy * L * 2.6, d.z - d.dz * L * 2.6, d.x - d.dx * L, d.y - d.dy * L, d.z - d.dz * L, .01, w * .7, c4(VIO, 0), c4(VIO, .7));
      }
    }
  }
  const _a = new T.Vector3(), _b = new T.Vector3();
  function windRings(x, y, z, dx, dy, dz, r, a) { // anéis de vento ANGULARES (pentágonos girando), não círculos de fumaça
    if (low) return; D.set(dx, dy, dz).normalize(); _a.set(Math.abs(D.y) > .9 ? 1 : 0, Math.abs(D.y) > .9 ? 0 : 1, 0).cross(D).normalize(); _b.crossVectors(D, _a);
    for (let k = 0; k < 2; k++) { const rr = r * (1 + k * .45), off = (k - .5) * .45, sp = time * (9 - k * 3); for (let i = 0; i < 5; i++) { const a0 = i / 5 * 6.283 + sp, a1 = (i + .8) / 5 * 6.283 + sp, p0 = [Math.cos(a0) * rr, Math.sin(a0) * rr], p1 = [Math.cos(a1) * rr, Math.sin(a1) * rr];
      rib.seg(x + D.x * off + _a.x * p0[0] + _b.x * p0[1], y + D.y * off + _a.y * p0[0] + _b.y * p0[1], z + D.z * off + _a.z * p0[0] + _b.z * p0[1], x + D.x * off + _a.x * p1[0] + _b.x * p1[1], y + D.y * off + _a.y * p1[0] + _b.y * p1[1], z + D.z * off + _a.z * p1[0] + _b.z * p1[1], .03, .01, c4(k ? VIO : MAG, .8 * a), c4(k ? VIO : MAG, .2 * a)); } }
  }
  /* ---------- Jaula e Mandíbula ---------- */
  function drawCage(s) {
    const T0 = s.T, fade = s.phase === 'fade' ? 1 - smooth(s.t / T0.fade) : 1;
    for (const c of s.chains) { if (c.k <= 0) continue; const e = chainCurve(s.ox, s.oy, s.oz, c.x, c.y + (c.landed ? 0 : 0), c.z, c.k * fade + (1 - fade) * 0, c.i * 3.1, 1, 1.6);
      if (c.landed) { groundNormal(ground, c.x, c.z, nrm); decals.add(c.x, c.y, c.z, T0.chainR * 1.6, 1, .05, .15, .8 * fade, 1, 1, c.i, nrm); for (let i = 0; i < 4; i++) { const a = i * 1.57 + c.i; shard(c.x + Math.cos(a) * .3, c.y + .15, c.z + Math.sin(a) * .3, .5 * fade, Math.cos(a) * .6, a, Math.sin(a) * .6, .16 * fade); } } void e; }
    // rotas de fuga visíveis: setas de luz no chão apontando para fora pelos dois vãos
    if (s.phase === 'chains') for (const g of s.gaps) for (let i = 0; i < 3; i++) { const r0 = T0.ring * (.55 + i * .28), x = s.cx + Math.sin(g) * r0, z = s.cz + Math.cos(g) * r0, gy = ground(x, z); rib.seg(x - Math.sin(g) * .3, gy + .06, z - Math.cos(g) * .3, x + Math.sin(g) * .3, gy + .06, z + Math.cos(g) * .3, .12, .01, c4([1, .9, .6], .7), c4([1, .9, .6], .1)); }
    if (s.phase === 'bite' || (s.phase === 'fade' && s.snapped)) {
      const R = T0.biteR, k = s.phase === 'bite' ? Math.min(1, s.bt / T0.warn) : 1, snap = s.snapped ? easeOut(Math.min(1, (s.bt - T0.warn) / T0.snap)) : 0, gy = s.by;
      if (!s.snapped) mark(s.bx, s.bz, R, 2, k, Math.min(1, s.bt * 4), 7);
      const n = low ? 10 : 16, open = (1 - snap) * (1.8 + (1 - k) * 1.2);
      for (let jaw = 0; jaw < 2 && tn < 64; jaw++) for (let i = 0; i < n && tn < 64; i++) { const a = i / n * 6.283 + jaw * .2, x = s.bx + Math.cos(a) * R * .92, z = s.bz + Math.sin(a) * R * .92, L = (1 + .35 * ((i * 7) % 3) / 2) * fade * (.4 + .6 * k);
        P.set(x, jaw ? gy + .2 + open * .1 : gy + 1.2 + open, z); E.set(jaw ? -.25 : Math.PI + .25, 0, 0); Q.setFromEuler(E); TQ.setFromAxisAngle(D.set(-Math.sin(a), 0, Math.cos(a)), jaw ? .45 : -.45); Q.premultiply(TQ); S.set(1, L, 1); M.compose(P, Q, S); teeth.setMatrixAt(tn++, M); }
      if (s.snapped && snap > .5) { glow.add(s.bx, gy + .8, s.bz, R * 2.2 * fade, R * 1.4 * fade, 1, .05, .15, .8 * fade, 0); groundNormal(ground, s.bx, s.bz, nrm); decals.add(s.bx, gy, s.bz, R * 1.6, 1, .1, .2, fade, 0, 1 - fade, 9, nrm); }
    }
  }
  /** correntes espinhosas flutuando nas costas/ombros do mini-chefe (só visual, fora da hitbox) */
  function backChains(a) {
    const fx = Math.sin(a.yaw), fz = Math.cos(a.yaw), rx = fz, rz = -fx, y = a.y + a.T.height * .78, bx = a.x - fx * .55, bz = a.z - fz * .55;
    for (let k = 0; k < (low ? 1 : 2); k++) { const s0 = k ? -1 : 1, lift = .25 + k * .35;
      chainCurve(bx + rx * .7 * s0, y + lift, bz + rz * .7 * s0, bx - rx * .8 * s0 - fx * .4, y + lift - .25 + Math.sin(time * 1.7 + k) * .15, bz - rz * .8 * s0 - fz * .4, 1, k * 9 + a.x, .7, .55 + .1 * Math.sin(time * 2 + k)); }
  }
  return {
    root,
    update(dt, camera, spells, actors = [], quality = 1) {
      time += dt; uTime.value = time; low = quality === 0; cam.copy(camera.position); ln = sn = tn = 0; for (const B of [marks, cores, shells, orbs, domes, drills]) B.n = 0;
      glow.begin(); rib.begin(camera, time); decals.begin();
      for (const s of spells) { const boss = s.kind === 'e4boss'; if (s.type === 'sanctum') drawSanctum(s, boss); else if (s.type === 'constellation') drawConstellation(s, boss); else if (s.type === 'drill') drawDrill(s, boss); else if (s.type === 'cage') drawCage(s); }
      for (const a of actors) if (a.alive && a.kind === 'e4boss') backChains(a);
      for (const B of [marks, cores, shells, orbs, domes, drills]) { B.m.count = B.n; B.m.instanceMatrix.needsUpdate = true; B.m.geometry.attributes.aFx.needsUpdate = true; }
      for (const [m, n] of [[links, ln], [shards, sn], [teeth, tn]]) { m.count = n; m.instanceMatrix.needsUpdate = true; }
      glow.end(); rib.end(); decals.end(time);
      return { marks: marks.n, pillars: cores.n, orbs: orbs.n, drills: drills.n, links: ln };
    },
    clear() { for (const B of [marks, cores, shells, orbs, domes, drills]) B.m.count = 0; links.count = shards.count = teeth.count = 0; },
    dispose() { scene.remove(root); for (const g of geos) g.dispose(); for (const m of mats) m.dispose(); for (const B of [marks, cores, shells, orbs, domes, drills]) B.m.dispose(); links.dispose(); shards.dispose(); teeth.dispose(); glow.dispose(); rib.dispose(); decals.dispose(); }
  };
}
