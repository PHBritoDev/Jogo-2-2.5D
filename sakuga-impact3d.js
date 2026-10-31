/**
 * Impacto "sakuga" reutilizável (Enemy2, Mini-chefe Enemy2 e os poderes do herói atrás da flag ?vfxSakuga=1).
 * Só apresentação: recebe registros de colisão já confirmados pela lógica; não decide dano, não escreve save.
 *
 *  • Casca volumétrica com expansão AGRESSIVA (≈90% do raio nos 2–3 primeiros quadros a 60 FPS, depois desacelera),
 *    núcleo branco, cor intermediária e contorno escuro; some por erosão alfa (fBm com limiar temporal e borda acesa).
 *  • Anéis de pressão NÃO circulares (raio serrilhado e assimétrico) assentados na normal do terreno.
 *  • Rachaduras poligonais emissivas projetadas no terreno amostrado (cada segmento lê a altura nas duas pontas),
 *    radiais e ao longo do vetor real do golpe/dash (sulco), que expiram.
 *  • Placas de terra levantadas e 8–15 pedras com gravidade, quique no relevo e atrito (orçamento fixo).
 * Tudo instanciado e alocado uma vez (capacidade fixa, slots reaproveitados): repetir casts não cresce memória.
 * GLSL compatível com WebGL1 (sem derivadas, sem texturas externas).
 */
const NOISE = `float hs(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float ns(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(hs(i),hs(i+vec3(1,0,0)),f.x),mix(hs(i+vec3(0,1,0)),hs(i+vec3(1,1,0)),f.x),f.y),mix(mix(hs(i+vec3(0,0,1)),hs(i+vec3(1,0,1)),f.x),mix(hs(i+vec3(0,1,1)),hs(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){return ns(p)*.5+ns(p*2.1)*.3+ns(p*4.3)*.2;}`;
export const SAKUGA_PALETTES = Object.freeze({
  abyss: { core: [1, 1, 1], mid: [1, .157, .847], rim: [.145, 0, .18], dark: [.031, .008, .051] },
  ember: { core: [1, .95, .85], mid: [1, .32, .5], rim: [.35, .02, .08], dark: [.05, .005, .01] },
  crimson: { core: [1, 1, 1], mid: [.851, 0, .153], rim: [.353, 0, .094], dark: [.04, 0, .01] },
  celestial: { core: [1, 1, 1], mid: [1, .776, .18], rim: [.788, .196, .157], dark: [.12, .05, .02] }
});
const SHELL_VERT = `attribute vec4 aFx; attribute vec3 aMid; attribute vec3 aRim; varying vec3 vN; varying vec3 vV; varying vec3 vP; varying vec4 vFx; varying vec3 vMid; varying vec3 vRim;
void main(){ vFx=aFx; vMid=aMid; vRim=aRim; vP=position; mat4 m=modelMatrix*instanceMatrix; vec4 w=m*vec4(position,1.); vN=normalize(mat3(m)*normal); vV=normalize(cameraPosition-w.xyz); gl_Position=projectionMatrix*viewMatrix*w; }`;
const SHELL_FRAG = `${NOISE} uniform float time; varying vec3 vN; varying vec3 vV; varying vec3 vP; varying vec4 vFx; varying vec3 vMid; varying vec3 vRim;
void main(){ float f=1.-abs(dot(normalize(vN),vV)); float n=fbm(vP*2.6+vFx.z*7.+vec3(0.,time*1.5,0.));
 float cut=vFx.x; if(n<cut) discard;                                  // erosão alfa com limiar temporal
 float edge=1.-smoothstep(cut,cut+.08,n);                               // borda acesa onde a erosão come
 vec3 c=mix(vMid,vec3(1.),pow(1.-f,3.)*vFx.y); c=mix(c,vRim,smoothstep(.55,.95,f)); c+=vMid*edge*1.6;
 float a=clamp((.55+.45*f)*vFx.w+edge*.6,0.,1.); gl_FragColor=vec4(c*a,a); }`;
const FLAT_VERT = `attribute vec4 aFx; attribute vec3 aMid; varying vec2 vUv; varying vec4 vFx; varying vec3 vMid; void main(){ vUv=uv; vFx=aFx; vMid=aMid; gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.); }`;
const RING_FRAG = `${NOISE} varying vec2 vUv; varying vec4 vFx; varying vec3 vMid;
void main(){ float n=fbm(vec3(vUv.x*24.,vUv.y*3.,vFx.z)); if(n<vFx.x) discard; float band=1.-abs(vUv.y*2.-1.); float a=pow(band,1.5)*vFx.w*(.6+.4*n);
 vec3 c=mix(vMid,vec3(1.),pow(band,6.)*.8); gl_FragColor=vec4(c*a,a); }`;
const CRACK_FRAG = `${NOISE} varying vec2 vUv; varying vec4 vFx; varying vec3 vMid;
void main(){ float y=abs(vUv.y*2.-1.); float n=ns(vec3(vUv.x*9.,vFx.z,0.)); float core=exp(-y*y*10.); float dark=smoothstep(.55,1.,y);
 float grow=step(vUv.x,vFx.y); if(grow<.5||n<vFx.x) discard; vec3 c=mix(vMid*1.4,vec3(1.,.97,1.),core*.7)*(1.-dark*.85);
 float a=vFx.w*(core*.9+.35); gl_FragColor=vec4(c,a); }`;

export function createSakugaImpacts(T, scene, { ground = () => 0, capacity = 6, maxRocks = 64, maxCracks = 140, maxPlates = 48 } = {}) {
  const root = new T.Group(); root.name = 'SakugaImpacts'; scene.add(root);
  const uTime = { value: 0 };
  const attrs = (geo, max, extra = []) => { const o = {}; for (const [name, n] of [['aFx', 4], ['aMid', 3], ['aRim', 3], ...extra]) { o[name] = new Float32Array(max * n); geo.setAttribute(name, new T.InstancedBufferAttribute(o[name], n).setUsage(T.DynamicDrawUsage)); } return o; };
  const mkInst = (geo, mat, max) => { const a = attrs(geo, max), m = new T.InstancedMesh(geo, mat, max); m.frustumCulled = false; m.count = 0; m.instanceMatrix.setUsage(T.DynamicDrawUsage); root.add(m); return { m, a, n: 0, max }; };
  const add = { blending: T.CustomBlending, blendSrc: T.OneFactor, blendDst: T.OneMinusSrcAlphaFactor };
  const shells = mkInst(new T.IcosahedronGeometry(1, 3), new T.ShaderMaterial({ vertexShader: SHELL_VERT, fragmentShader: SHELL_FRAG, uniforms: { time: uTime }, transparent: true, depthWrite: false, toneMapped: false, fog: false, ...add }), capacity * 2);
  // anel serrilhado assimétrico (raio irregular embutido na geometria): pressão que não é um círculo perfeito
  const ringGeo = (() => { const N = 64, pos = [], uv = [], ix = []; for (let i = 0; i <= N; i++) { const a = i / N * Math.PI * 2, j = 1 + .14 * Math.sin(a * 5 + 1.3) + .09 * Math.sin(a * 11) + .05 * Math.sin(a * 23 + 2); for (const [k, r] of [[0, .78], [1, 1]]) { pos.push(Math.cos(a) * r * j, 0, Math.sin(a) * r * j); uv.push(i / N, k); } if (i < N) { const b = i * 2; ix.push(b, b + 1, b + 2, b + 2, b + 1, b + 3); } } const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(ix); return g; })();
  const rings = mkInst(ringGeo, new T.ShaderMaterial({ vertexShader: FLAT_VERT, fragmentShader: RING_FRAG, transparent: true, depthWrite: false, side: T.DoubleSide, toneMapped: false, fog: false, ...add, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), capacity * 2);
  const crackGeo = new T.PlaneGeometry(1, 1); crackGeo.rotateX(-Math.PI / 2); crackGeo.translate(.5, 0, 0);
  const cracks = mkInst(crackGeo, new T.ShaderMaterial({ vertexShader: FLAT_VERT, fragmentShader: CRACK_FRAG, transparent: true, depthWrite: false, side: T.DoubleSide, toneMapped: false, fog: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }), maxCracks);
  const slabMat = new T.MeshStandardMaterial({ color: 0x2b2420, roughness: .95, flatShading: true });
  const plates = new T.InstancedMesh(new T.BoxGeometry(1, .18, .7), slabMat, maxPlates); plates.frustumCulled = false; plates.count = 0; root.add(plates);
  const rockMesh = new T.InstancedMesh(new T.DodecahedronGeometry(1, 0), new T.MeshStandardMaterial({ color: 0x241c22, roughness: .9, flatShading: true, emissive: 0x16030c, emissiveIntensity: .8 }), maxRocks); rockMesh.frustumCulled = false; rockMesh.count = 0; root.add(rockMesh);
  const hits = Array.from({ length: capacity }, () => ({ id: null, t: -99, p: { x: 0, y: 0, z: 0 }, dir: { x: 0, z: 1 }, size: 1, pal: SAKUGA_PALETTES.abyss, segs: [], plates: [], seed: 0 }));
  const rocks = Array.from({ length: maxRocks }, () => ({ alive: false, p: { x: 0, y: 0, z: 0 }, v: { x: 0, y: 0, z: 0 }, s: .1, r: 0, w: 0, t: 0 }));
  const seen = new Set(); let head = 0, rockHead = 0, time = 0;
  const M = new T.Matrix4(), Q = new T.Quaternion(), S = new T.Vector3(), P = new T.Vector3(), E = new T.Euler(), A = new T.Vector3(), B = new T.Vector3(), up = new T.Vector3(0, 1, 0), nrm = new T.Vector3(), X1 = new T.Vector3(1, 0, 0), C = new T.Vector3(), Q2 = new T.Quaternion();
  const rnd = s => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const easeExpo = k => k >= 1 ? 1 : 1 - Math.pow(2, -12 * k);
  const normalAt = (x, z) => { const e = .5, hx = ground(x + e, z) - ground(x - e, z), hz = ground(x, z + e) - ground(x, z - e); return nrm.set(-hx, 2 * e, -hz).normalize(); };
  function put(set, f, mid, rim) { set.a.aFx.set(f, set.n * 4); set.a.aMid.set(mid, set.n * 3); if (rim) set.a.aRim.set(rim, set.n * 3); set.m.setMatrixAt(set.n, M); set.n++; }
  return {
    root,
    /** id único por registro; dir = vetor real do golpe/dash (plano XZ); rocks 8–15; furrow = comprimento do sulco. */
    emit({ id, time: t0 = time, point, dir = { x: 0, z: 1 }, size = 2, palette = 'abyss', rocks: nRocks = 10, furrow = 0 }) {
      if (seen.has(id)) return false; seen.add(id); if (seen.size > 96) seen.delete(seen.values().next().value);
      const h = hits[head++ % capacity], seed = head * 7.3, dl = Math.hypot(dir.x, dir.z) || 1, dx = dir.x / dl, dz = dir.z / dl;
      Object.assign(h, { id, t: t0, size, seed, pal: SAKUGA_PALETTES[palette] || SAKUGA_PALETTES.abyss }); Object.assign(h.p, point); h.dir.x = dx; h.dir.z = dz;
      // rachaduras: 7–11 radiais com quebras angulares + sulco ao longo do golpe (projetadas no terreno)
      h.segs.length = 0; const nRad = 7 + Math.floor(rnd(seed) * 5);
      for (let i = 0; i < nRad; i++) { let a = i / nRad * 6.283 + rnd(seed + i) * .6, x = point.x, z = point.z; const L = size * (.7 + rnd(seed + i * 3) * .8);
        for (let k = 0; k < 3; k++) { const l = L / 3, nx = x + Math.cos(a) * l, nz = z + Math.sin(a) * l; h.segs.push([x, z, nx, nz, .1 * size * (1 - k * .28), k / 3]); x = nx; z = nz; a += (rnd(seed + i * 5 + k) - .5) * 1.1; } }
      if (furrow > 0) for (const s of [-1, 1]) { let x = point.x - dx * furrow, z = point.z - dz * furrow; const steps = 6; for (let k = 0; k < steps; k++) { const nx = x + dx * furrow / steps + (rnd(seed + k * s) - .5) * .25, nz = z + dz * furrow / steps + (rnd(seed - k * s) - .5) * .25; h.segs.push([x + dz * s * .35 * size, z - dx * s * .35 * size, nx + dz * s * .35 * size, nz - dx * s * .35 * size, .13 * size, k / steps * .5]); x = nx; z = nz; } }
      // placas de terra levantadas ao redor e no sulco
      h.plates.length = 0; for (let i = 0; i < 6 + Math.round(size); i++) { const a = rnd(seed + i * 11) * 6.283, r = size * (.4 + rnd(seed + i) * .6); h.plates.push([point.x + Math.cos(a) * r, point.z + Math.sin(a) * r, a, .4 + rnd(seed + i * 2) * .5]); }
      for (let i = 0; i < Math.round(furrow / 1.2); i++) { const u = i / Math.max(1, Math.round(furrow / 1.2)), s = i % 2 ? 1 : -1; h.plates.push([point.x - dx * furrow * u + dz * s * .5 * size, point.z - dz * furrow * u - dx * s * .5 * size, Math.atan2(dz, dx) + s * .4, .35]); }
      // pedras com física simples (orçamento fixo, slots reaproveitados)
      const n = Math.max(8, Math.min(15, nRocks));
      for (let i = 0; i < n; i++) { const r = rocks[rockHead++ % maxRocks], a = rnd(seed + i * 13) * 6.283, sp = 3 + rnd(seed + i * 17) * 5 * Math.sqrt(size / 2);
        Object.assign(r, { alive: true, t: 0, s: (.06 + rnd(seed + i) * .12) * Math.sqrt(size), r: rnd(i) * 6, w: (rnd(i * 3) - .5) * 14 });
        Object.assign(r.p, { x: point.x + Math.cos(a) * .3, y: Math.max(point.y, ground(point.x, point.z) + .2), z: point.z + Math.sin(a) * .3 });
        Object.assign(r.v, { x: Math.cos(a) * sp + dx * 2, y: 3.5 + rnd(seed + i * 19) * 5, z: Math.sin(a) * sp + dz * 2 }); }
      return true;
    },
    update(t, camera, quality = 1) {
      const dt = Math.min(.05, Math.max(0, t - time)); time = t; uTime.value = t; const low = quality === 0;
      shells.n = rings.n = cracks.n = 0; let pn = 0;
      for (const h of hits) {
        const age = t - h.t; if (h.id === null || age < 0 || age > 2.6) continue; const S0 = h.size, pal = h.pal, p = h.p;
        if (age < .55) { // casca: ≈90% do raio em 3 quadros, depois desacelera; erosão come de fora para dentro
          const r = S0 * easeExpo(age / .5), cut = Math.max(0, (age - .12) / .43);
          P.set(p.x, p.y, p.z); Q.identity(); S.set(r, r * .82, r); M.compose(P, Q, S); put(shells, [cut * .95, 1 - cut, h.seed, 1 - cut * .5], pal.mid, pal.rim);
          if (age < .2) { const rc = S0 * .45 * (1 - age / .2); S.set(rc, rc, rc); M.compose(P, Q, S); put(shells, [0, 1, h.seed + 3, 1], pal.core, pal.mid); } }
        const gy = ground(p.x, p.z), n = normalAt(p.x, p.z);
        for (let i = 0; i < 2; i++) { const a2 = age - i * .09; if (a2 < 0 || a2 > .8) continue; const r = S0 * (.6 + 2.2 * easeExpo(a2 / .7)) * (1 + i * .25); P.set(p.x, gy + .06, p.z); Q.setFromUnitVectors(up, n); Q.multiply(Q2.setFromAxisAngle(up, h.seed + i)); S.set(r, 1, r); M.compose(P, Q, S); put(rings, [Math.max(0, a2 / .8) * .9, 0, h.seed + i, 1 - a2 / .8], pal.mid); }
        const life = 1 - Math.max(0, (age - 1.6) / 1), grow = Math.min(1, age / .18);
        for (const sg of h.segs) { if (cracks.n >= cracks.max) break; const [x0, z0, x1, z1, w, delay] = sg, g = Math.max(0, Math.min(1, (grow - delay) * 3)); if (g <= 0) continue;
          A.set(x0, ground(x0, z0) + .05, z0); B.set(x1, ground(x1, z1) + .05, z1); const L = A.distanceTo(B); if (L < .01) continue;
          P.copy(A); Q.setFromUnitVectors(X1, C.copy(B).sub(A).normalize()); S.set(L, 1, w * (low ? 1.3 : 1)); M.compose(P, Q, S); put(cracks, [Math.max(0, 1 - life) * .9, g, h.seed + x0, Math.max(0, life)], pal.mid); }
        for (const pl of h.plates) { if (pn >= maxPlates) break; const [x, z, a, s] = pl, rise = easeExpo(Math.min(1, age / .25)) * (1 - Math.max(0, (age - 1.4) / 1.2)); if (rise <= .01) continue;
          const y = ground(x, z) + .05 * rise - .1 * (1 - rise); P.set(x, y, z); Q.setFromEuler(E.set(.55 * rise * Math.sin(a * 3), -a, .5 * rise * Math.cos(a * 2))); S.set(s * S0 * .45, s * S0 * .45 * (.6 + rise), s * S0 * .45); M.compose(P, Q, S); plates.setMatrixAt(pn++, M); }
      }
      plates.count = pn; plates.instanceMatrix.needsUpdate = true;
      let rn = 0;
      for (const r of rocks) { if (!r.alive) continue; r.t += dt; if (r.t > 2.6) { r.alive = false; continue; }
        r.v.y -= 15 * dt; r.p.x += r.v.x * dt; r.p.y += r.v.y * dt; r.p.z += r.v.z * dt; r.r += r.w * dt;
        const g = ground(r.p.x, r.p.z) + r.s * .6; if (r.p.y < g) { r.p.y = g; if (r.v.y < -1) { r.v.y *= -.35; r.v.x *= .6; r.v.z *= .6; r.w *= .6; } else { r.v.y = 0; r.v.x *= .85; r.v.z *= .85; r.w *= .8; } }
        const k = 1 - Math.max(0, (r.t - 2) / .6); P.set(r.p.x, r.p.y, r.p.z); Q.setFromEuler(E.set(r.r, r.r * .7, r.r * 1.3)); S.setScalar(r.s * k); M.compose(P, Q, S); rockMesh.setMatrixAt(rn++, M); }
      rockMesh.count = rn; rockMesh.instanceMatrix.needsUpdate = true;
      for (const set of [shells, rings, cracks]) { set.m.count = set.n; set.m.instanceMatrix.needsUpdate = true; for (const k in set.a) set.m.geometry.attributes[k].needsUpdate = true; }
      return { shells: shells.n, rings: rings.n, cracks: cracks.n, plates: plates.count, rocks: rn };
    },
    clear() { for (const h of hits) { h.id = null; h.t = -99; } for (const r of rocks) r.alive = false; seen.clear(); for (const set of [shells, rings, cracks]) set.m.count = 0; plates.count = rockMesh.count = 0; },
    dispose() { scene.remove(root); root.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); }
  };
}
