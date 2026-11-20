/**
 * MISSÃO 20/11 — VFX da ESPIRAL DO CARRASCO (ZAR'KHAEL). Módulo próprio (não recicla Bispo 1/2):
 *  • Carga: a cada volta, fragmentos angulares de lâmina são ATRAÍDOS para a ponta real da foice e riscos orbitais
 *    seguem a trajetória da lâmina; a densidade cresce volta a volta (fogo violeta + costuras quentes).
 *  • Projétil (20/11, ref. GIF do criador): núcleo pontiagudo branco-violeta, garras/esquirlas negras-roxas curvas em leque
 *    para trás, filamentos elétricos e rastro com gradiente temporal. Nasce na CABEÇA real da foice; viaja reto na direção travada.
 *  • Explosão em CÚPULA (ref. meia-esfera violeta/rosa): no contato válido (herói/obstáculo) OU no fim do alcance — expande
 *    rápido, segura, contrai e dissolve com rasgos escuros. Só visual; o dano é aplicado uma única vez pela lógica.
 * Pools fixos (2 massas, 72 estilhaços instanciados), geometria compartilhada, sem luz dinâmica, sem alocação por quadro;
 * qualidade baixa corta estilhaços pela metade e uma das fitas, sem perder a leitura do golpe.
 */
const V = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
export function createZarkhaelSpiralVFX(T, scene) {
  const root = new T.Group(); root.name = 'ZarkhaelEspiralVFX'; scene.add(root); let time = 0, low = false;
  // ---- estilhaços (fragmento de lâmina em crescente) instanciados ----
  const shard = new T.Shape(); shard.moveTo(0, 0); shard.quadraticCurveTo(.09, .05, .2, 0); shard.quadraticCurveTo(.1, .02, 0, -.03); shard.closePath();
  const shardGeo = new T.ExtrudeGeometry(shard, { depth: .01, bevelEnabled: false }); shardGeo.center();
  const shardMat = new T.MeshBasicMaterial({ color: 0xff5ad0, toneMapped: false, transparent: true, opacity: .95, blending: T.AdditiveBlending, depthWrite: false });
  const N = 72, shards = new T.InstancedMesh(shardGeo, shardMat, N); shards.frustumCulled = false; shards.renderOrder = 12; shards.instanceMatrix.setUsage(T.DynamicDrawUsage); root.add(shards);
  const col = new Float32Array(N * 3); shards.instanceColor = new T.InstancedBufferAttribute(col, 3);
  const P = Array.from({ length: N }, () => ({ on: false, p: new T.Vector3(), v: new T.Vector3(), age: 0, life: .4, s: 1, spin: 0, mode: 0, tgt: null }));
  let cur = 0; const _m = new T.Matrix4(), _q = new T.Quaternion(), _e = new T.Euler(), _s = new T.Vector3(), _v = new T.Vector3(), HOT = new T.Color(0xff4a1e), MAG = new T.Color(0xff4fd8), VIO = new T.Color(0x9b3cff);
  function emit(p, v, life, s, mode, tgt, c) { const q = P[cur++ % N]; q.on = true; q.p.copy(p); q.v.copy(v); q.age = 0; q.life = life; q.s = s; q.spin = Math.random() * 6; q.mode = mode; q.tgt = tgt; c.toArray(col, (cur - 1) % N * 3); return q; }
  // ---- PROJÉTIL (missão 20/11, ref. GIF do criador): núcleo pontiagudo branco-violeta assimétrico, garras/esquirlas
  //      negras-roxas curvas varridas para trás, filamentos elétricos e rastro com gradiente no tempo (sem fita/anel/esfera lisa) ----
  const coreGeo = new T.OctahedronGeometry(1, 0); coreGeo.scale(.16, .13, .62); coreGeo.translate(0, 0, .12);
  const coreMat = () => new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false, uniforms: { k: { value: 1 }, time: { value: 0 } },
    vertexShader: 'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'uniform float k,time;varying vec3 vP;void main(){float f=clamp(vP.z*1.3+.5,0.,1.);vec3 c=mix(vec3(.55,.2,1.),vec3(1.,.95,1.),f);gl_FragColor=vec4(c*(1.4+.3*sin(time*40.)),k);}' });
  const haloGeo = new T.SphereGeometry(1, 14, 10); haloGeo.scale(.55, .45, .95);
  const haloMat = () => new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false, uniforms: { k: { value: 1 } },
    vertexShader: 'varying vec3 vN,vV;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
    fragmentShader: 'uniform float k;varying vec3 vN,vV;void main(){float f=abs(dot(vN,vV));float a=pow(f,3.)*.75*k;gl_FragColor=vec4(vec3(.62,.28,1.)*a,a);}' });
  const claw = new T.Shape(); claw.moveTo(0, 0); claw.quadraticCurveTo(.16, .14, .95, .05); claw.quadraticCurveTo(.28, .04, .02, -.09); claw.closePath();
  const clawGeo = new T.ExtrudeGeometry(claw, { depth: .018, bevelEnabled: false }); clawGeo.translate(0, 0, -.009);
  const clawDark = new T.MeshBasicMaterial({ color: 0x12041c, transparent: true, opacity: .95, depthWrite: false });
  const clawRim = new T.MeshBasicMaterial({ color: 0xa65cff, transparent: true, opacity: 1, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false });
  const TR = 18, FIL = 4, FSEG = 6;
  const bolts = Array.from({ length: 2 }, () => { const g = new T.Group(); g.visible = false; root.add(g);
    const body = new T.Group(); g.add(body); const cm = coreMat(), hm = haloMat(); const core = new T.Mesh(coreGeo, cm), halo = new T.Mesh(haloGeo, hm); core.renderOrder = 13; halo.renderOrder = 12; body.add(halo, core);
    const claws = new T.Group(); body.add(claws);
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + (i % 2) * .3, s = .6 + (i % 3) * .3, d = new T.Mesh(clawGeo, clawDark), r = new T.Mesh(clawGeo, clawRim);
      for (const m of [d, r]) { m.position.set(Math.cos(a) * .18, Math.sin(a) * .18, .05 - (i % 3) * .08); m.rotation.set(0, Math.PI / 2 + .35, a); m.scale.setScalar(s * (m === r ? 1.08 : 1)); m.renderOrder = m === r ? 11 : 10; claws.add(m); } } // garras abertas para trás, em leque assimétrico
    const fp = new Float32Array(FIL * FSEG * 6), fg = new T.BufferGeometry(); fg.setAttribute('position', new T.BufferAttribute(fp, 3).setUsage(T.DynamicDrawUsage));
    const fm = new T.LineBasicMaterial({ color: 0xc89bff, transparent: true, opacity: .9, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }), fil = new T.LineSegments(fg, fm); fil.frustumCulled = false; fil.renderOrder = 12; body.add(fil);
    // rastro: faixa em cruz (vertical + horizontal) com as últimas posições; alpha cai com a idade
    const tp = new Float32Array(TR * 4 * 3), ta = new Float32Array(TR * 4), tg = new T.BufferGeometry(), idx = [];
    for (let i = 0; i < TR - 1; i++) for (const o of [0, 2]) { const a0 = i * 4 + o, a1 = a0 + 1, b0 = a0 + 4, b1 = a1 + 4; idx.push(a0, a1, b0, a1, b1, b0); }
    tg.setAttribute('position', new T.BufferAttribute(tp, 3).setUsage(T.DynamicDrawUsage)); tg.setAttribute('aA', new T.BufferAttribute(ta, 1).setUsage(T.DynamicDrawUsage)); tg.setIndex(idx);
    const tm = new T.ShaderMaterial({ transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending, toneMapped: false, uniforms: { k: { value: 1 } },
      vertexShader: 'attribute float aA;varying float vA;void main(){vA=aA;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'uniform float k;varying float vA;void main(){vec3 c=mix(vec3(.14,.02,.3),vec3(.8,.45,1.),vA*vA);gl_FragColor=vec4(c,vA*.85*k);}' });
    const trail = new T.Mesh(tg, tm); trail.frustumCulled = false; trail.renderOrder = 9; root.add(trail); trail.visible = false;
    return { g, body, claws, cm, hm, fil, fp, fg, fm, trail, tp, ta, tg, tm, hist: [], ref: null, age: 0, dying: -1, dir: 0, filT: 0 }; });
  // ---- EXPLOSÃO EM CÚPULA (ref. meia-esfera violeta/rosa com rasgos escuros): expande rápido, segura, contrai e dissolve ----
  const domeGeo = new T.SphereGeometry(1, 36, 14, 0, Math.PI * 2, 0, Math.PI / 2);
  const domeMat = () => new T.ShaderMaterial({ transparent: true, depthWrite: false, side: T.DoubleSide, toneMapped: false, uniforms: { k: { value: 0 }, time: { value: 0 }, seed: { value: 0 } },
    vertexShader: 'varying vec3 vP,vN,vV;void main(){vP=position;vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
    fragmentShader: `uniform float k,time,seed;varying vec3 vP,vN,vV;float h(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
      float n(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z);}
      void main(){float fr=1.-abs(dot(vN,vV));vec3 q=vP*3.2+vec3(seed,time*1.6,-time*1.1);float rip=n(q*vec3(2.6,.8,2.6)+vec3(vP.y*4.))*.65+n(q*5.)*.35;
        float dissolve=smoothstep(.55,1.,k);if(rip<dissolve*1.05)discard;
        vec3 core=mix(vec3(1.,.82,.95),vec3(1.,.45,.75),smoothstep(0.,.6,vP.y+fr*.4));vec3 c=mix(core,vec3(.42,.12,.9),smoothstep(.15,.85,fr));
        float dark=smoothstep(.62,.7,rip)*(1.-smoothstep(.78,.86,rip));c=mix(c,vec3(.05,.0,.08),dark*.92);
        float base=smoothstep(.22,0.,vP.y);c+=vec3(.6,.7,1.)*base*.6;float a=(.55+fr*.4+base*.3)*(1.-smoothstep(.75,1.,k));gl_FragColor=vec4(c*1.25,clamp(a,0.,1.));}` });
  const domes = Array.from({ length: 2 }, () => { const m = new T.Mesh(domeGeo, domeMat()); m.visible = false; m.frustumCulled = false; m.renderOrder = 14; root.add(m); return { m, age: 9, R: 2.4 }; });
  let domeC = 0;
  /** Carga durante as voltas: atrai estilhaços para a ponta real da lâmina (base→ponta do mundo). k = 0..1 */
  let chargeAcc = 0;
  function charge(base, tip, k, dt) {
    chargeAcc += dt * (low ? 18 : 36) * (.35 + k);
    while (chargeAcc >= 1) { chargeAcc--; const a = Math.random() * 6.283, r = 1.3 + Math.random() * 1.1, u = .4 + Math.random() * .6;
      _v.set(base.x + (tip.x - base.x) * u + Math.cos(a) * r, base.y + (tip.y - base.y) * u + (Math.random() - .3) * 1.1, base.z + (tip.z - base.z) * u + Math.sin(a) * r);
      emit(_v, _s.set(0, 0, 0), .28 + Math.random() * .16, .7 + k * .7, 1, tip, Math.random() < .3 + k * .3 ? HOT : Math.random() < .5 ? MAG : VIO); }
  }
  /** Liberação: a massa nasce em `from` (CABEÇA real da foice) e segue o objeto lógico `ref` (x,y,z,dx,dz) em linha reta. */
  function release(ref, from) { const B = bolts.find(b => !b.g.visible) || bolts[0]; B.ref = ref; B.age = 0; B.dying = -1; B.dir = Math.atan2(ref.dx, ref.dz); B.g.visible = true; B.trail.visible = true; B.hist.length = 0;
    B.from = from ? new T.Vector3(from.x, from.y, from.z) : null; B.cm.uniforms.k.value = 1; B.hm.uniforms.k.value = 1; B.tm.uniforms.k.value = 1; B.fm.opacity = .9;
    for (let i = 0; i < (low ? 6 : 12); i++) { const a = Math.random() * 6.283; emit(B.from || _v.set(ref.x, ref.y, ref.z), _s.set(Math.cos(a) * 3.5, (Math.random() - .3) * 2.5, Math.sin(a) * 3.5), .3, 1, 0, null, i % 3 ? MAG : HOT); }
    return B; }
  /** Cúpula no ponto do contato (herói, obstáculo) OU no fim do alcance; só visual — o dano já foi aplicado uma vez pela lógica. */
  function impact(ref, { wall = false, fade = false } = {}) { const B = bolts.find(b => b.ref === ref); if (B) B.dying = 0;
    const D = domes[domeC++ % domes.length], gy = ref.gy ?? (ref.y - 1.15); D.m.position.set(ref.x, gy, ref.z); D.R = fade ? 2.1 : 2.6; D.age = 0; D.m.visible = true; D.m.scale.setScalar(.01); D.m.material.uniforms.seed.value = Math.random() * 50;
    for (let i = 0; i < (low ? 10 : 20); i++) { const a = Math.random() * 6.283, e = Math.random(); emit(_v.set(ref.x, gy + .4, ref.z), _s.set(Math.cos(a) * 6 * e + 1, 2 + e * 4, Math.sin(a) * 6 * e), .45 + Math.random() * .2, 1.1, 0, null, i % 3 ? MAG : HOT); } }
  function update(dt, quality = 1) { time += dt; low = quality === 0;
    let n = 0;
    for (let i = 0; i < N; i++) { const q = P[i]; if (!q.on) { _m.makeScale(0, 0, 0); shards.setMatrixAt(i, _m); continue; } q.age += dt / q.life; if (q.age >= 1) { q.on = false; _m.makeScale(0, 0, 0); shards.setMatrixAt(i, _m); continue; }
      if (q.mode === 1 && q.tgt) { q.v.set(q.tgt.x - q.p.x, q.tgt.y - q.p.y, q.tgt.z - q.p.z).multiplyScalar(5.5 * (q.age + .2)); } else q.v.multiplyScalar(1 - dt * 2.5);
      q.p.addScaledVector(q.v, dt); q.spin += dt * 14; _e.set(q.spin, q.spin * .7, q.spin * .3); _q.setFromEuler(_e); const s = q.s * (1 - q.age * q.age); _s.set(s, s, s); _m.compose(q.p, _q, _s); shards.setMatrixAt(i, _m); n++; }
    shards.instanceMatrix.needsUpdate = true; shards.instanceColor.needsUpdate = true; shards.count = N;
    for (const B of bolts) { if (!B.g.visible) continue; B.age += dt; const r = B.ref, k = Math.min(1, B.age / .14);
      const px = B.from ? B.from.x + (r.x - B.from.x) * k : r.x, py = B.from ? B.from.y + (r.y - B.from.y) * k : r.y, pz = B.from ? B.from.z + (r.z - B.from.z) * k : r.z;
      B.g.position.set(px, py, pz); B.g.rotation.set(0, B.dir, 0); B.body.scale.setScalar((.45 + .55 * k) * 1.6); B.claws.rotation.z = time * 5; B.cm.uniforms.time.value = time;
      if ((B.filT -= dt) <= 0) { B.filT = .045; let w = 0; for (let f = 0; f < FIL; f++) { let x = 0, y = 0, z = .3; const ax = Math.random() * 6.283; for (let i = 0; i < FSEG; i++) { const nz = z - .22, nx = Math.cos(ax + i) * (.1 + i * .07) + (Math.random() - .5) * .12, ny = Math.sin(ax + i) * (.1 + i * .07) + (Math.random() - .5) * .12; B.fp.set([x, y, z, nx, ny, nz], w); w += 6; x = nx; y = ny; z = nz; } } B.fg.attributes.position.needsUpdate = true; }
      if (B.dying < 0) { B.hist.unshift(px, py, pz); if (B.hist.length > TR * 3) B.hist.length = TR * 3; }
      const H = B.hist, nH = H.length / 3; for (let i = 0; i < TR; i++) { const j = Math.min(i, nH - 1) * 3, u = i / (TR - 1), wv = (.2 * (1 - u) * (1 - u) + .02), x = H[j] ?? px, y = H[j + 1] ?? py, z = H[j + 2] ?? pz, sx = Math.cos(B.dir) * wv, sz = -Math.sin(B.dir) * wv;
        B.tp.set([x, y - wv, z, x, y + wv, z, x - sx, y, z - sz, x + sx, y, z + sz], i * 12); const al = (1 - u) * (1 - u) * Math.min(1, B.age / .12) * (i < nH ? 1 : 0); B.ta.set([al, al, al, al], i * 4); }
      B.tg.attributes.position.needsUpdate = true; B.tg.attributes.aA.needsUpdate = true;
      if (B.dying >= 0) { B.dying += dt / .25; const f = Math.max(0, 1 - B.dying); B.cm.uniforms.k.value = f; B.hm.uniforms.k.value = f; B.tm.uniforms.k.value = f; B.fm.opacity = .9 * f; B.body.scale.multiplyScalar(f); if (B.dying >= 1) { B.g.visible = false; B.trail.visible = false; B.ref = null; } }
      else if (!low && Math.random() < dt * 24) emit(_v.set(px, py, pz), _s.set((Math.random() - .5) * 2.5, (Math.random() - .5) * 2.5, (Math.random() - .5) * 2.5), .28, .7, 0, null, Math.random() < .35 ? HOT : VIO); }
    for (const D of domes) { if (!D.m.visible) continue; D.age += dt; const t = D.age, R = D.R, u = D.m.material.uniforms; u.time.value = time;
      const sc = t < .16 ? R * (1 - Math.pow(1 - t / .16, 3)) : t < .3 ? R : R * (1 - .3 * Math.min(1, (t - .3) / .35)); D.m.scale.set(sc, sc * .78, sc);
      u.k.value = t < .3 ? 0 : Math.min(1, (t - .3) / .38); if (t > .7) D.m.visible = false; }
    return n;
  }
  function stats() { return { shards: P.filter(p => p.on).length, bolts: bolts.filter(b => b.g.visible).length, domes: domes.filter(d => d.m.visible).length }; }
  function clear() { for (const q of P) q.on = false; for (const B of bolts) { B.g.visible = false; B.trail.visible = false; B.ref = null; } for (const D of domes) D.m.visible = false; }
  function dispose() { scene.remove(root); shardGeo.dispose(); shardMat.dispose(); for (const g of [coreGeo, haloGeo, clawGeo, domeGeo]) g.dispose(); clawDark.dispose(); clawRim.dispose(); for (const B of bolts) { B.cm.dispose(); B.hm.dispose(); B.fm.dispose(); B.fg.dispose(); B.tm.dispose(); B.tg.dispose(); } for (const D of domes) D.m.material.dispose(); }
  return { charge, release, impact, update, stats, clear, dispose, root };
}
