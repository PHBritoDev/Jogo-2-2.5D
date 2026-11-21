/**
 * MISSÃO 20/11 — VFX da ESPIRAL DO CARRASCO (ZAR'KHAEL). Módulo próprio (não recicla Bispo 1/2):
 *  • Carga: a cada volta, fragmentos angulares de lâmina são ATRAÍDOS para a ponta real da foice e riscos orbitais
 *    seguem a trajetória da lâmina; a densidade cresce volta a volta (fogo violeta + costuras quentes).
 *  • (21/11) A massa helicoidal e a cúpula violeta foram REPROVADAS e removidas: a saída da Espiral agora conjura a Fera dos
 *    Mil Olhos (zarkhael-beast3d.js / zarkhael-beast-vfx3d.js). Aqui fica só a carga na lâmina durante as voltas.
 * Pool fixo de 72 estilhaços instanciados, sem luz dinâmica, sem alocação por quadro.
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
  let chargeAcc = 0;
  function charge(base, tip, k, dt) {
    chargeAcc += dt * (low ? 18 : 36) * (.35 + k);
    while (chargeAcc >= 1) { chargeAcc--; const a = Math.random() * 6.283, r = 1.3 + Math.random() * 1.1, u = .4 + Math.random() * .6;
      _v.set(base.x + (tip.x - base.x) * u + Math.cos(a) * r, base.y + (tip.y - base.y) * u + (Math.random() - .3) * 1.1, base.z + (tip.z - base.z) * u + Math.sin(a) * r);
      emit(_v, _s.set(0, 0, 0), .28 + Math.random() * .16, .7 + k * .7, 1, tip, Math.random() < .3 + k * .3 ? HOT : Math.random() < .5 ? MAG : VIO); }
  }
  /** Liberação: a massa nasce em `from` (CABEÇA real da foice) e segue o objeto lógico `ref` (x,y,z,dx,dz) em linha reta. */
  function update(dt, quality = 1) { time += dt; low = quality === 0;
    let n = 0;
    for (let i = 0; i < N; i++) { const q = P[i]; if (!q.on) { _m.makeScale(0, 0, 0); shards.setMatrixAt(i, _m); continue; } q.age += dt / q.life; if (q.age >= 1) { q.on = false; _m.makeScale(0, 0, 0); shards.setMatrixAt(i, _m); continue; }
      if (q.mode === 1 && q.tgt) { q.v.set(q.tgt.x - q.p.x, q.tgt.y - q.p.y, q.tgt.z - q.p.z).multiplyScalar(5.5 * (q.age + .2)); } else q.v.multiplyScalar(1 - dt * 2.5);
      q.p.addScaledVector(q.v, dt); q.spin += dt * 14; _e.set(q.spin, q.spin * .7, q.spin * .3); _q.setFromEuler(_e); const s = q.s * (1 - q.age * q.age); _s.set(s, s, s); _m.compose(q.p, _q, _s); shards.setMatrixAt(i, _m); n++; }
    shards.instanceMatrix.needsUpdate = true; shards.instanceColor.needsUpdate = true; shards.count = N;
    return n;
  }
  function stats() { return { shards: P.filter(p => p.on).length }; }
  function clear() { for (const q of P) q.on = false; }
  function dispose() { scene.remove(root); shardGeo.dispose(); shardMat.dispose(); shards.dispose(); }
  return { charge, update, stats, clear, dispose, root };
}
