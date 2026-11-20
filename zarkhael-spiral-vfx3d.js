/**
 * MISSÃO 20/11 — VFX da ESPIRAL DO CARRASCO (ZAR'KHAEL). Módulo próprio (não recicla Bispo 1/2):
 *  • Carga: a cada volta, fragmentos angulares de lâmina são ATRAÍDOS para a ponta real da foice e riscos orbitais
 *    seguem a trajetória da lâmina; a densidade cresce volta a volta (fogo violeta + costuras quentes).
 *  • Massa helicoidal: três fitas espirais recortadas (roxo-negro com fissura rubra/magenta) torcendo em volta de um eixo,
 *    duas meias-luas de energia na frente (silhueta de foice de execução, não cone/esfera) e lâminas em órbita.
 *    Nasce no ponto REAL da lâmina e cresce nos primeiros 0,2 s; gira no próprio eixo, viaja na direção travada.
 *  • Impacto/dissipação: estilhaços de lâmina radiais, anel rubro curto e as fitas se abrindo.
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
  // ---- fitas helicoidais (3 fios numa geometria; u = ao longo, v = largura, aStrand = fio) ----
  const L = 2.6, SEG = 40, turns = 1.6, ribGeo = new T.BufferGeometry(), pos = [], uv = [], strand = [], idx = [];
  for (let k = 0; k < 3; k++) for (let i = 0; i <= SEG; i++) for (let j = 0; j < 2; j++) { pos.push(0, 0, 0); uv.push(i / SEG, j); strand.push(k); }
  for (let k = 0; k < 3; k++) for (let i = 0; i < SEG; i++) { const a = k * (SEG + 1) * 2 + i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  ribGeo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); ribGeo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); ribGeo.setAttribute('aStrand', new T.Float32BufferAttribute(strand, 1)); ribGeo.setIndex(idx);
  ribGeo.boundingSphere = new T.Sphere(new T.Vector3(), 3);
  const ribVert = `attribute float aStrand;uniform float time,grow,spread,lowQ;varying vec2 vUv;varying float vS;void main(){vUv=uv;vS=aStrand;float u=uv.x;
    float r=(.12+.75*sin(3.14159*pow(u,.8)))*grow*(1.+spread*u);float a=u*${(turns * 6.2832).toFixed(4)}+aStrand*2.0944-time*9.;
    float w=(.05+.22*sin(3.14159*u))*grow*(uv.y-.5);vec3 p=vec3(cos(a)*r,sin(a)*r,(.5-u)*${L.toFixed(2)}*grow);vec3 rad=normalize(vec3(cos(a),sin(a),0.));
    p+=rad*w+vec3(0.,0.,w*.6);if(lowQ>.5&&aStrand>1.5)p*=0.;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`;
  const ribFrag = `uniform float time,fade;varying vec2 vUv;varying float vS;float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    void main(){float u=vUv.x,v=abs(vUv.y-.5)*2.;float cut=step(.22,fract(u*7.+vS*.33-time*1.5));if(cut<.5&&u>.25)discard;
      float seam=exp(-pow((vUv.y-.5)*9.,2.));float edge=smoothstep(.6,1.,v);float a=(.55+seam*.9+edge*.6)*smoothstep(0.,.12,u)*smoothstep(1.,.7,u)*fade;
      vec3 c=mix(vec3(.12,.0,.22),vec3(.55,.08,.95),1.-v);c=mix(c,vec3(1.,.32,.12),seam*.85);c=mix(c,vec3(1.,.45,.9),edge*.7);if(a<.02)discard;gl_FragColor=vec4(c*1.25,min(1.,a));}`;
  // meia-lua de energia na frente da massa (silhueta de execução)
  const moonS = new T.Shape(); moonS.absarc(0, 0, .75, -1.25, 1.25, false); moonS.absarc(.32, 0, .58, 1.1, -1.1, true);
  const moonGeo = new T.ShapeGeometry(moonS, 16), moonMat = () => new T.ShaderMaterial({ transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending, toneMapped: false, uniforms: { fade: { value: 1 } }, vertexShader: V,
    fragmentShader: 'uniform float fade;varying vec2 vUv;void main(){float r=length(vUv-vec2(.5));float a=(.5+smoothstep(.3,.5,r)*1.2)*fade;gl_FragColor=vec4(mix(vec3(.6,.1,1.),vec3(1.,.75,1.),smoothstep(.35,.5,r))*1.3,min(1.,a));}' });
  const bolts = Array.from({ length: 2 }, () => { const g = new T.Group(); g.visible = false; root.add(g);
    const mat = new T.ShaderMaterial({ transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending, toneMapped: false, uniforms: { time: { value: 0 }, grow: { value: 0 }, spread: { value: 0 }, fade: { value: 1 }, lowQ: { value: 0 } }, vertexShader: ribVert, fragmentShader: ribFrag });
    const rib = new T.Mesh(ribGeo, mat); rib.frustumCulled = false; rib.renderOrder = 11; g.add(rib);
    const spin = new T.Group(); g.add(spin); const mm = moonMat(); const m1 = new T.Mesh(moonGeo, mm), m2 = new T.Mesh(moonGeo, mm); m1.position.z = L * .45; m2.position.z = L * .3; m2.rotation.z = Math.PI; m1.renderOrder = m2.renderOrder = 12; spin.add(m1, m2);
    return { g, rib, mat, spin, mm, ref: null, age: 0, dying: -1, dir: 0 }; });
  // ---- anel de impacto ----
  const ringMat = new T.ShaderMaterial({ transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending, toneMapped: false, uniforms: { k: { value: 1 } }, vertexShader: V,
    fragmentShader: 'uniform float k;varying vec2 vUv;void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float ring=exp(-pow((r-.3-.65*k)*12.,2.));float a=ring*(1.-k);if(a<.01)discard;gl_FragColor=vec4(mix(vec3(1.,.3,.1),vec3(.8,.3,1.),k)*1.4,a);}' });
  const ring = new T.Mesh(new T.PlaneGeometry(1, 1), ringMat); ring.visible = false; ring.frustumCulled = false; ring.renderOrder = 10; root.add(ring); let ringAge = 9;

  /** Carga durante as voltas: atrai estilhaços para a ponta real da lâmina (base→ponta do mundo). k = 0..1 */
  let chargeAcc = 0;
  function charge(base, tip, k, dt) {
    chargeAcc += dt * (low ? 18 : 36) * (.35 + k);
    while (chargeAcc >= 1) { chargeAcc--; const a = Math.random() * 6.283, r = 1.3 + Math.random() * 1.1, u = .4 + Math.random() * .6;
      _v.set(base.x + (tip.x - base.x) * u + Math.cos(a) * r, base.y + (tip.y - base.y) * u + (Math.random() - .3) * 1.1, base.z + (tip.z - base.z) * u + Math.sin(a) * r);
      emit(_v, _s.set(0, 0, 0), .28 + Math.random() * .16, .7 + k * .7, 1, tip, Math.random() < .3 + k * .3 ? HOT : Math.random() < .5 ? MAG : VIO); }
  }
  /** Liberação: a massa nasce em `from` (ponta real da lâmina) e passa a seguir o objeto lógico `ref` (x,y,z,dx,dz). */
  function release(ref, from) { const B = bolts.find(b => !b.g.visible) || bolts[0]; B.ref = ref; B.age = 0; B.dying = -1; B.dir = Math.atan2(ref.dx, ref.dz); B.g.visible = true; B.from = from ? from.clone ? from.clone() : new T.Vector3(from.x, from.y, from.z) : null; B.mat.uniforms.fade.value = 1; B.mm.uniforms.fade.value = 1; B.mat.uniforms.lowQ.value = low ? 1 : 0;
    for (let i = 0; i < (low ? 8 : 16); i++) { const a = Math.random() * 6.283; emit(B.from || _v.set(ref.x, ref.y, ref.z), _s.set(Math.cos(a) * 4, (Math.random() - .3) * 3, Math.sin(a) * 4), .35, 1.1, 0, null, i % 3 ? MAG : HOT); }
    return B; }
  function impact(ref, { wall = false, fade = false } = {}) { const B = bolts.find(b => b.ref === ref); if (B) B.dying = 0;
    const p = _v.set(ref.x, ref.y, ref.z); if (!fade) { ring.position.copy(p); ring.quaternion.identity(); ring.rotation.x = -Math.PI / 2; ring.position.y = ref.y - .9; ring.scale.setScalar(4.6); ring.visible = true; ringAge = 0;
      for (let i = 0; i < (low ? 14 : 28); i++) { const a = Math.random() * 6.283, e = (Math.random() - .2) * 1.2; emit(p, _s.set(Math.cos(a) * 7, e * 4 + 1, Math.sin(a) * 7), .45 + Math.random() * .2, 1.2, 0, null, i % 2 ? HOT : MAG); } } }
  function update(dt, quality = 1) { time += dt; low = quality === 0;
    let n = 0;
    for (let i = 0; i < N; i++) { const q = P[i]; if (!q.on) { _m.makeScale(0, 0, 0); shards.setMatrixAt(i, _m); continue; } q.age += dt / q.life; if (q.age >= 1) { q.on = false; _m.makeScale(0, 0, 0); shards.setMatrixAt(i, _m); continue; }
      if (q.mode === 1 && q.tgt) { q.v.set(q.tgt.x - q.p.x, q.tgt.y - q.p.y, q.tgt.z - q.p.z).multiplyScalar(5.5 * (q.age + .2)); } else q.v.multiplyScalar(1 - dt * 2.5);
      q.p.addScaledVector(q.v, dt); q.spin += dt * 14; _e.set(q.spin, q.spin * .7, q.spin * .3); _q.setFromEuler(_e); const s = q.s * (1 - q.age * q.age); _s.set(s, s, s); _m.compose(q.p, _q, _s); shards.setMatrixAt(i, _m); n++; }
    shards.instanceMatrix.needsUpdate = true; shards.instanceColor.needsUpdate = true; shards.count = N;
    for (const B of bolts) { if (!B.g.visible) continue; B.age += dt; const r = B.ref, k = Math.min(1, B.age / .2);
      const px = B.from ? B.from.x + (r.x - B.from.x) * k : r.x, py = B.from ? B.from.y + (r.y - B.from.y) * k : r.y, pz = B.from ? B.from.z + (r.z - B.from.z) * k : r.z;
      B.g.position.set(px, py, pz); B.g.rotation.set(0, B.dir, 0); B.spin.rotation.z = time * 7; const u = B.mat.uniforms; u.time.value = time; u.grow.value = .35 + .65 * k;
      if (B.dying >= 0) { B.dying += dt / .45; u.spread.value = B.dying * 2.5; u.fade.value = Math.max(0, 1 - B.dying); B.mm.uniforms.fade.value = u.fade.value; if (B.dying >= 1) { B.g.visible = false; B.ref = null; } }
      else if (!low && Math.random() < dt * 30) emit(_v.set(px, py, pz), _s.set((Math.random() - .5) * 3, (Math.random() - .5) * 3, (Math.random() - .5) * 3), .3, .8, 0, null, Math.random() < .4 ? HOT : VIO); }
    if (ring.visible) { ringAge += dt / .4; ringMat.uniforms.k.value = ringAge; if (ringAge >= 1) ring.visible = false; }
    return n;
  }
  function stats() { return { shards: P.filter(p => p.on).length, bolts: bolts.filter(b => b.g.visible).length, ring: ring.visible }; }
  function clear() { for (const q of P) q.on = false; for (const B of bolts) { B.g.visible = false; B.ref = null; } ring.visible = false; }
  function dispose() { scene.remove(root); shardGeo.dispose(); shardMat.dispose(); ribGeo.dispose(); moonGeo.dispose(); ringMat.dispose(); ring.geometry.dispose(); for (const B of bolts) { B.mat.dispose(); B.mm.dispose(); } }
  return { charge, release, impact, update, stats, clear, dispose, root };
}
