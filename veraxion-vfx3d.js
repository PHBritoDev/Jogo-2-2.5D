/**
 * MISSÃO 20/11 — VFX próprios do VÉRAXION (Bispo 4). Nada recolorido do slash comum:
 *  • Impacto do ARREMESSO (ref. explosão escura do criador): núcleo violeta curto, estilhaços NEGROS fraturados em leque,
 *    riscos escuros e poeira cinza — no acerto e, menor, no fim do voo. Rastro de fumaça violeta atrás da espada voadora.
 *  • TELEPORTE: implosão escura no ponto de saída e anel + estilhaços na chegada (sem flash de tela).
 *  • (21/11) o Corte Ascendente foi substituído pelo Florescer Abissal — ver veraxion-bloom-vfx3d.js.
 *  • APARO (Guarda das Lâminas): faíscas rosa-douradas (A) e violetas (B) no ponto de cruzamento.
 * Pools fixos, uma InstancedMesh de estilhaços escuros e uma de faíscas claras, sem luz dinâmica nem alocação por quadro.
 */
const V = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
export function createVeraxionVFX(T, scene) {
  const root = new T.Group(); root.name = 'VeraxionVFX'; scene.add(root); let time = 0, low = false;
  const _m = new T.Matrix4(), _q = new T.Quaternion(), _e = new T.Euler(), _s = new T.Vector3(), _v = new T.Vector3();
  // ---- partículas instanciadas: estilhaços escuros (normal) e faíscas/pétalas claras (aditivas) ----
  function pool(N, geo, mat) { const m = new T.InstancedMesh(geo, mat, N); m.frustumCulled = false; m.instanceMatrix.setUsage(T.DynamicDrawUsage); m.instanceColor = new T.InstancedBufferAttribute(new Float32Array(N * 3), 3); root.add(m);
    return { m, N, P: Array.from({ length: N }, () => ({ on: false, p: new T.Vector3(), v: new T.Vector3(), age: 0, life: .4, s: 1, spin: 0, g: 0 })), c: 0 }; }
  const shardS = new T.Shape(); shardS.moveTo(0, 0); shardS.lineTo(.22, .04); shardS.lineTo(.07, .1); shardS.lineTo(.12, -.05); shardS.closePath();
  const shardGeo = new T.ExtrudeGeometry(shardS, { depth: .012, bevelEnabled: false }); shardGeo.center();
  const dark = pool(64, shardGeo, new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false }));
  const sparkGeo = new T.PlaneGeometry(.05, .16); const bright = pool(72, sparkGeo, new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, toneMapped: false }));
  const C = { black: new T.Color(0x0c0610), smoke: new T.Color(0x3a3440), vio: new T.Color(0xa24cff), vioHot: new T.Color(0xe0b0ff), rose: new T.Color(0xff6aa0), gold: new T.Color(0xffd27a), white: new T.Color(0xfff2f6), ruby: new T.Color(0xff2a48) };
  function emit(pl, p, v, life, s, col, g = 0) { const q = pl.P[pl.c % pl.N]; pl.m.instanceColor.setXYZ(pl.c % pl.N, col.r, col.g, col.b); pl.c++; q.on = true; q.p.copy(p); q.v.copy(v); q.age = 0; q.life = life; q.s = s; q.spin = Math.random() * 6; q.g = g; }
  function stepPool(pl, dt) { for (let i = 0; i < pl.N; i++) { const q = pl.P[i]; if (!q.on) { _m.makeScale(0, 0, 0); pl.m.setMatrixAt(i, _m); continue; } q.age += dt / q.life; if (q.age >= 1) { q.on = false; _m.makeScale(0, 0, 0); pl.m.setMatrixAt(i, _m); continue; }
      q.v.y -= q.g * dt; q.v.multiplyScalar(1 - dt * 1.8); q.p.addScaledVector(q.v, dt); q.spin += dt * 9; _e.set(q.spin, q.spin * .6, q.spin * .3); _q.setFromEuler(_e); const s = q.s * (1 - q.age * q.age); _s.set(s, s, s); _m.compose(q.p, _q, _s); pl.m.setMatrixAt(i, _m); }
    pl.m.instanceMatrix.needsUpdate = true; pl.m.instanceColor.needsUpdate = true; }
  // ---- flash/núcleo curto e anel (pool de 3) ----
  const coreMat = () => new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false, uniforms: { k: { value: 1 }, col: { value: new T.Color() } }, vertexShader: V,
    fragmentShader: 'uniform float k;uniform vec3 col;varying vec2 vUv;void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float a=(exp(-r*r*7.)*1.4+exp(-r*r*2.)*.35)*(1.-k);if(a<.01)discard;gl_FragColor=vec4(mix(col,vec3(1.),exp(-r*r*16.)),a);}' });
  const ringMat = () => new T.ShaderMaterial({ transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending, toneMapped: false, uniforms: { k: { value: 1 }, col: { value: new T.Color() } }, vertexShader: V,
    fragmentShader: 'uniform float k;uniform vec3 col;varying vec2 vUv;void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float ring=exp(-pow((r-.25-.7*k)*13.,2.));float a=ring*(1.-k);if(a<.01)discard;gl_FragColor=vec4(col*1.3,a);}' });
  const flashes = Array.from({ length: 3 }, () => { const f = new T.Mesh(new T.PlaneGeometry(1, 1), coreMat()); f.visible = false; f.frustumCulled = false; f.renderOrder = 13; root.add(f); const r = new T.Mesh(new T.PlaneGeometry(1, 1), ringMat()); r.rotation.x = -Math.PI / 2; r.visible = false; r.frustumCulled = false; r.renderOrder = 8; root.add(r); return { f, r, age: 9, life: .35, size: 1 }; });
  let fC = 0;
  function flash(p, col, size, gy, life = .32) { const F = flashes[fC++ % flashes.length]; F.f.position.copy(p); F.f.material.uniforms.col.value.copy(col); F.r.material.uniforms.col.value.copy(col); F.r.position.set(p.x, gy + .05, p.z); F.size = size; F.age = 0; F.life = life; F.f.visible = F.r.visible = true; }
  // ---- impacto fraturado (ref. explosão escura) ----
  function fracture(p, gy, big = true) { const n = (big ? 26 : 14) >> (low ? 1 : 0); flash(_v.copy(p), C.vio, big ? 2.2 : 1.4, gy);
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, e = Math.random() * .9 + .1, sp = 5 + Math.random() * 7; emit(dark, p, _s.set(Math.cos(a) * sp * e, 1.5 + Math.random() * 5, Math.sin(a) * sp * e), .5 + Math.random() * .35, 1.2 + Math.random() * 1.4, i % 4 ? C.black : C.smoke, 6); }
    for (let i = 0; i < (big ? 18 : 8); i++) { const a = Math.random() * 6.283; emit(bright, p, _s.set(Math.cos(a) * 6, 1 + Math.random() * 4, Math.sin(a) * 6), .3 + Math.random() * .2, .9, i % 3 ? C.vio : C.vioHot, 2); } }
  // ---- rastro de fumaça da espada voadora ----
  let trailAcc = 0; function swordTrail(p, dt) { trailAcc += dt * (low ? 25 : 55); while (trailAcc >= 1) { trailAcc--; emit(dark, _v.set(p.x + (Math.random() - .5) * .3, p.y + (Math.random() - .5) * .3, p.z + (Math.random() - .5) * .3), _s.set(0, .4, 0), .4, .6, Math.random() < .5 ? C.smoke : C.black, -1);
      if (Math.random() < .5) emit(bright, _v, _s.set((Math.random() - .5), (Math.random() - .5), (Math.random() - .5)), .3, .7, C.vio, 0); } }
  // ---- teleporte ----
  function teleport(from, to, gyF, gyT) { for (const [p, gy, s] of [[from, gyF, .8], [to, gyT, 1.2]]) { _v.set(p.x, gy + 1.1, p.z); flash(_v, s > 1 ? C.vio : C.black.clone().lerp(C.vio, .4), 1.6 * s, gy, .4);
      for (let i = 0; i < 12 * s; i++) { const a = Math.random() * 6.283; emit(dark, _v, _s.set(Math.cos(a) * 3 * (s > 1 ? 1 : -1), (Math.random() - .3) * 3, Math.sin(a) * 3 * (s > 1 ? 1 : -1)), .45, 1, C.black, 0); } } }
  // ---- aparo ----
  function parry(p) { flash(p, C.gold, .9, p.y - 1.3, .2); for (let i = 0; i < (low ? 8 : 16); i++) { const a = Math.random() * 6.283, e = Math.random() - .3; emit(bright, p, _s.set(Math.cos(a) * 6, e * 6, Math.sin(a) * 6), .22, .7, i % 2 ? C.gold : C.vio, 6); } }
  function update(dt, quality = 1, cam = null) { time += dt; low = quality === 0; stepPool(dark, dt); stepPool(bright, dt);
    for (const F of flashes) { if (!F.f.visible) continue; F.age += dt / F.life; const k = F.age; F.f.material.uniforms.k.value = k; F.r.material.uniforms.k.value = k; F.f.scale.setScalar(F.size * (.6 + k * .8)); F.r.scale.setScalar(F.size * 2.2); if (cam) F.f.quaternion.copy(cam.quaternion); if (k >= 1) F.f.visible = F.r.visible = false; }
  }
  function stats() { return { dark: dark.P.filter(p => p.on).length, bright: bright.P.filter(p => p.on).length, flashes: flashes.filter(f => f.f.visible).length }; }
  function clear() { for (const pl of [dark, bright]) for (const q of pl.P) q.on = false; for (const F of flashes) F.f.visible = F.r.visible = false; }
  return { fracture, swordTrail, teleport, parry, update, stats, clear, root };
}
