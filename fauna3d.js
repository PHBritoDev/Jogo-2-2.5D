/**
 * Mod 327 — fauna com os GLBs do autor (Grilo, Passaro_Vale_Dourado).
 *
 *  - UM controlador para todas as espécies. Spawn com semente estável por célula (40 m) e por espécie: o mesmo coelho
 *    "mora" na mesma clareira; só existe perto da câmera (LOD por distância), nunca nasce na cara do jogador.
 *  - Carregamento preguiçoso: um GLB só é baixado quando um habitat dele entra no raio de interesse, um de cada vez,
 *    fora do quadro. Só a COR BASE é decodificada, já reduzida (createImageBitmap 256/128 px); os mapas 2048² de
 *    normal/rugosidade não são decodificados (3 × 16 MB por bicho economizados). Material Lambert (barato no celular).
 *  - O grilo usa InstancedMesh; o pássaro dourado é
 *    skinned: clones com SkeletonUtils, ossos animados à mão (cabeça, cauda, asas) — os GLBs não têm clipes.
 *  - Inspeção dos arquivos (Mod 327): todos vêm em pose de POUSO (asas fechadas). Pela regra do briefing, nenhuma
 *    ave-modelo voa com asas rígidas: o dourado deixa
 *    o poleiro abrindo as asas pelos ossos de ombro. Planadores no céu continuam sendo as silhuetas de
 *    eldoria-birds3d.js (bandos distantes), sem duplicar na mesma distância.
 *  - Grilos: SÓ do anoitecer à madrugada (regra do autor), no capim de clareira/beira de mata/água, nunca em estrada,
 *    cidade, cinza ou vulcão. O canto continua no audio3d (intermitente), agora ponderado pelo habitat.
 */
export const FAUNA = Object.freeze({
  dourado: { file: 'Passaro_Vale_Dourado.glb', len: .17, turn: 0, max: 3, near: 30, density: .5, biomes: ['vale', 'prado', 'floresta'], active: h => h >= 6 && h <= 19, tex: 128, skinned: true, perch: true },
  grilo: { file: 'Grilo.glb', len: .085, turn: Math.PI / 2, max: 2, near: 12, density: .7, biomes: ['vale', 'prado', 'floresta'], active: h => h >= 18.5 || h <= 5.2, tex: 128 }
});
export const FAUNA_CELL = 40;

function hash(a, b, s) { let h = (a * 374761393 + b * 668265263 + s * 974711) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
const SEED = { dourado: 23, grilo: 53 };
/** Candidato determinístico de uma espécie numa célula (ou null): mesma resposta sempre, sem estado. */
export function cellCandidate(kind, cx, cz) {
  const S = FAUNA[kind], s = SEED[kind]; if (hash(cx, cz, s) > S.density) return null;
  return { kind, cell: cx + ':' + cz, x: (cx + .15 + .7 * hash(cx, cz, s + 1)) * FAUNA_CELL, z: (cz + .15 + .7 * hash(cx, cz, s + 2)) * FAUNA_CELL, yaw: hash(cx, cz, s + 3) * 6.283, seed: hash(cx, cz, s + 4) };
}
/**
 * Habitat (puro, testável): ctx = { biome(x,z) → 'vale'|'prado'|'floresta'|'serra'|'abismo'|'cinzas'|'cidade'|'vulcao'|'estrada'|'agua'|null,
 * water(x,z) → profundidade, blocked(x,z) → bool, road(x,z) → bool, lava(x,z) → calor 0..1 }.
 */
export function habitatOk(kind, x, z, ctx) {
  const S = FAUNA[kind], b = ctx.biome(x, z); if (!b || !S.biomes.includes(b)) return false;
  if ((ctx.water?.(x, z) || 0) > .02) return false;                 // nunca dentro da água (nem na rasa)
  if (ctx.road?.(x, z)) return false;          // nada no meio da estrada
  if (ctx.lava?.(x, z) > 0) return false;                           // nem sobre lava
  if (ctx.blocked?.(x, z)) return false;                            // nem dentro de rocha/casa/árvore
  return true;
}
/** Quantos de cada espécie podem estar ativos agora (por qualidade): baixa = metade, sem grilo visual. */
export function budget(kind, low) { const m = FAUNA[kind].max; return low ? (kind === 'grilo' ? 0 : Math.max(1, m >> 1)) : m; }
/** Fator 0..1 do coro de grilos para o áudio (hora + habitat próximo); dia = 0 (regra do autor). */
export function insectLevel(hour, nearHabitat) { const dusk = hour >= 18.5 || hour <= 5.2 ? 1 : hour >= 17.8 ? (hour - 17.8) / .7 : 0; return dusk * (nearHabitat ? 1 : .25); }

/**
 * Controlador no jogo. opts: { T, scene, GLTFLoader, skClone, base (URL da raiz), ground(x,z), ctx (habitatOk), low }.
 */
export function createFauna({ T, scene, GLTFLoader, skClone, base = './', ground, ctx, low = false }) {
  const root = new T.Group(); root.name = 'fauna-mod327'; scene.add(root);
  const assets = {}, live = new Map(), stats = { loaded: [], live: 0, draws: 0, tris: 0, loads: 0, loadMs: [] };
  const mx = new T.Object3D(); let loading = null, scanT = 0, t = 0;
  const liteTex = size => parser => ({ name: 'MOD327_cor_base_reduzida', loadTexture(index) {
    const json = parser.json, baseIdx = json.materials?.[0]?.pbrMetallicRoughness?.baseColorTexture?.index;
    if (index !== baseIdx) return Promise.resolve(null);              // normal/rugosidade 2048²: não decodifica
    const img = json.images[json.textures[index].source];
    return parser.getDependency('bufferView', img.bufferView).then(buf => {
      const blob = new Blob([buf], { type: img.mimeType });
      return (self.createImageBitmap ? createImageBitmap(blob, { resizeWidth: size, resizeHeight: size, resizeQuality: 'medium' })
        : new Promise((ok, no) => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = c.height = size; c.getContext('2d').drawImage(im, 0, 0, size, size); ok(c); }; im.onerror = no; im.src = URL.createObjectURL(blob); }));
    }).then(src => { const tx = new T.Texture(src); tx.flipY = false; tx.colorSpace = T.SRGBColorSpace; tx.needsUpdate = true; return tx; });
  } });
  const pending = {};
  function load(kind) {
    if (assets[kind]) return Promise.resolve(assets[kind]); if (pending[kind]) return pending[kind];
    const S = FAUNA[kind], t0 = performance.now(); stats.loads++;
    const L = new GLTFLoader(); L.register(liteTex(low ? Math.min(128, S.tex) : S.tex));
    return pending[kind] = L.loadAsync(base + S.file).then(g => {
      let mesh = null; g.scene.traverse(o => { if (o.isMesh && !mesh) mesh = o; });
      const old = mesh.material, mat = new T.MeshLambertMaterial({ map: old.map || null, color: old.map ? 0xffffff : old.color }); old.dispose();
      const box = new T.Box3().setFromBufferAttribute(mesh.geometry.attributes.position), size = box.getSize(new T.Vector3()), k = S.len / Math.max(size.x, size.z);
      const A = { kind, k, mat, tris: (mesh.geometry.index ? mesh.geometry.index.count : mesh.geometry.attributes.position.count) / 3 };
      if (S.skinned) { mesh.material = mat; mesh.frustumCulled = false; A.proto = g.scene; A.bones = n => { const b = {}; n.traverse(o => { if (o.isBone) b[o.name] = o; }); return b; }; }
      else { A.im = new T.InstancedMesh(mesh.geometry, mat, budget(kind, low) || 1); A.im.count = 0; A.im.frustumCulled = false; A.im.name = 'fauna-' + kind; root.add(A.im); }
      assets[kind] = A; stats.loaded.push(kind); stats.loadMs.push(Math.round(performance.now() - t0));
    }).catch(e => { assets[kind] = { failed: String(e && e.message || e) }; }).finally(() => { delete pending[kind]; });
  }
  function spawn(c) {
    const A = assets[c.kind], S = FAUNA[c.kind], y = ground(c.x, c.z);
    const a = { ...c, hx: c.x, hz: c.z, y, by: y, state: 'idle', st: 0, hop: 0, vx: 0, vz: 0, fly: 0, look: 0 };
    if (S.skinned) { const n = skClone(A.proto); n.scale.setScalar(A.k); root.add(n); a.node = n; a.bones = A.bones(n); a.rest = Object.fromEntries(Object.entries(a.bones).map(([k, b]) => [k, b.quaternion.clone()])); }
    live.set(c.cell + c.kind, a);
  }
  function despawn(key) { const a = live.get(key); if (a?.node) { root.remove(a.node); a.node.traverse(o => { if (o.isSkinnedMesh) o.skeleton.dispose(); }); } live.delete(key); }
  const near = (a, px, pz) => Math.hypot(a.x - px, a.z - pz);
  function scan(px, pz, hour, cam) {
    const wanted = {};
    for (const kind of Object.keys(FAUNA)) {
      const S = FAUNA[kind], B = budget(kind, low); if (!B || !S.active(hour)) { for (const [k, a] of live) if (a.kind === kind && a.state !== 'leave') despawn(k); continue; }
      const R = S.near, c0x = Math.floor((px - R) / FAUNA_CELL), c1x = Math.floor((px + R) / FAUNA_CELL), c0z = Math.floor((pz - R) / FAUNA_CELL), c1z = Math.floor((pz + R) / FAUNA_CELL), list = [];
      for (let cx = c0x; cx <= c1x; cx++) for (let cz = c0z; cz <= c1z; cz++) { const c = cellCandidate(kind, cx, cz); if (!c) continue; const d = Math.hypot(c.x - px, c.z - pz); if (d > R || !habitatOk(kind, c.x, c.z, ctx)) continue; list.push([d, c]); }
      list.sort((p, q) => p[0] - q[0]); wanted[kind] = list.slice(0, B);
      if (list.length && !assets[kind] && !loading) { loading = load(kind).finally(() => { loading = null; }); }
    }
    for (const [k, a] of live) { const S = FAUNA[a.kind]; if (near(a, px, pz) > S.near * 1.25 || !a.qa && !(wanted[a.kind] || []).some(([, c]) => c.cell + c.kind === k) && a.state !== 'leave') despawn(k); }
    const fx = cam ? -Math.sin(cam.rotation.y) : 0, fz = cam ? -Math.cos(cam.rotation.y) : 0;
    for (const kind of Object.keys(wanted)) { if (!assets[kind] || assets[kind].failed) continue;
      for (const [d, c] of wanted[kind]) { if (live.has(c.cell + c.kind)) continue; const dx = c.x - px, dz = c.z - pz, inView = (dx * fx + dz * fz) / (d || 1) > .55;
        if (d < 10 || (inView && d < 22)) continue; // nunca aparece na cara do jogador
        spawn(c); } }
  }
  const tmpQ = new T.Quaternion(), ax = new T.Vector3();
  function bone(a, name, axis, ang) { const b = a.bones[name]; if (!b) return; ax.set(...axis); tmpQ.setFromAxisAngle(ax, ang); b.quaternion.copy(a.rest[name]).multiply(tmpQ); }
  function step(a, dt, px, pz) {
    const S = FAUNA[a.kind], d = near(a, px, pz); a.st += dt;
    const fleeR = a.kind === 'grilo' ? 1.6 : a.kind === 'dourado' ? 4.5 : 0;
    if (fleeR && d < fleeR && a.state !== 'flee' && a.state !== 'leave') { a.state = a.kind === 'dourado' ? 'leave' : 'flee'; a.st = 0; a.hop = 0; }
    if (a.state === 'idle' && a.st > 1.5 + a.seed * 3) { a.state = Math.random() < (a.kind === 'rapina' ? .1 : .45) ? 'hop' : 'idle'; a.st = 0; if (a.state === 'hop') a.yaw += (Math.random() - .5) * 2.2; }
    if (a.state === 'hop' || a.state === 'flee') {
      const len = a.kind === 'grilo' ? .3 : .3, dist = a.kind === 'grilo' ? .35 : .45;
      if (a.state === 'flee' && a.hop === 0) a.yaw = Math.atan2(a.x - px, a.z - pz) + (Math.random() - .5) * .6;
      a.hop += dt / len; const u = Math.min(1, a.hop), nx = a.x + Math.sin(a.yaw) * dist * dt / len, nz = a.z + Math.cos(a.yaw) * dist * dt / len;
      if (habitatOk(a.kind, nx, nz, ctx) && Math.hypot(nx - a.hx, nz - a.hz) < 14) { a.x = nx; a.z = nz; } else a.yaw += Math.PI * .6 * dt / len;
      a.by = ground(a.x, a.z); a.y = a.by + Math.sin(Math.PI * u) * (a.kind === 'grilo' ? .07 : .1);
      if (a.hop >= 1) { a.hop = 0; if (a.state === 'hop' || (a.state === 'flee' && d > fleeR * 2.2) || a.st > 4) { a.state = 'idle'; a.st = 0; } }
    } else if (a.state === 'leave') { // dourado: abre as asas pelos ossos de ombro e some subindo
      a.fly += dt; const s = 2.2 + a.fly * 3; a.x += Math.sin(a.yaw) * s * dt; a.z += Math.cos(a.yaw) * s * dt; a.y += (1.4 + a.fly) * dt;
      if (a.fly < .05) a.yaw = Math.atan2(a.x - px, a.z - pz);
      if (a.fly > 3.5) return false;
    } else a.y = a.by = ground(a.x, a.z);
    return true;
  }
  function pose(a, idx) {
    const S = FAUNA[a.kind], A = assets[a.kind], bob = a.state === 'idle' ? Math.sin(t * (a.kind === 'grilo' ? 9 : 2.1) + a.seed * 9) : 0;
    if (S.skinned) { const n = a.node; n.position.set(a.x, a.y, a.z); n.rotation.set(0, a.yaw + S.turn, 0);
      const look = Math.sin(t * .9 + a.seed * 7) * .6 * (a.state === 'idle' ? 1 : .2); bone(a, 'tripo::Head_0', [0, 1, 0], look); bone(a, 'tripo::Tail_0', [1, 0, 0], .15 * Math.sin(t * 3 + a.seed * 5) * (a.state === 'idle' ? 1 : 0));
      const flap = a.state === 'leave' ? Math.sin(a.fly * 26) * .9 + .6 : 0; for (const [nm, sgn] of [['bone_32', 1], ['bone_33', -1], ['bone_30', 1], ['bone_31', 1]]) bone(a, nm, [0, 0, 1], sgn * flap);
      return; }
    const pitch = a.state === 'hop' || a.state === 'flee' ? -.25 * Math.sin(Math.PI * Math.min(1, a.hop)) : .03 * bob;
    mx.position.set(a.x, a.y, a.z); mx.rotation.set(0, a.yaw + S.turn, 0); mx.rotateZ(a.kind === 'grilo' ? -pitch : 0);
    const sq = a.state === 'hop' || a.state === 'flee' ? 1 + .1 * Math.sin(Math.PI * Math.min(1, a.hop)) : 1; mx.scale.set(A.k / sq, A.k * sq, A.k); mx.updateMatrix(); A.im.setMatrixAt(idx, mx.matrix);
  }
  return {
    root, stats,
    update(dt, { px, pz, hour = 12, camera = null, hidden = false }) {
      t += dt; root.visible = !hidden; if (hidden) return;
      scanT -= dt; if (scanT <= 0) { scanT = .6; scan(px, pz, hour, camera); }
      const counts = {}; let draws = 0, tris = 0;
      for (const [k, a] of live) { if (!step(a, dt, px, pz)) { despawn(k); continue; } const A = assets[a.kind]; const i = counts[a.kind] = (counts[a.kind] || 0); counts[a.kind]++; pose(a, i); if (a.node) { draws++; tris += A.tris; } }
      for (const kind of Object.keys(assets)) { const A = assets[kind]; if (!A.im) continue; A.im.count = Math.min(counts[kind] || 0, A.im.instanceMatrix.count); A.im.instanceMatrix.needsUpdate = true; if (A.im.count) { draws++; tris += A.tris * A.im.count; } }
      stats.live = live.size; stats.draws = draws; stats.tris = Math.round(tris); stats.counts = counts;
    },
    /** QA: força o carregamento e o spawn imediato (ignora o "não nascer na cara"). */
    debugSpawnAt(kind, x, z, yaw = 0) { if (!assets[kind]) return false; spawn({ kind, cell: 'qa' + x.toFixed(1) + z.toFixed(1), x, z, yaw, seed: .5, qa: true }); return true; },
    load,
    list() { return [...live.values()].map(a => ({ kind: a.kind, state: a.state, x: +a.x.toFixed(2), z: +a.z.toFixed(2), y: +a.y.toFixed(2) })); },
    dispose() { for (const k of [...live.keys()]) despawn(k); for (const A of Object.values(assets)) { if (A.im) { A.im.geometry.dispose(); root.remove(A.im); } if (A.mat) { A.mat.map?.dispose(); A.mat.dispose(); } } scene.remove(root); }
  };
}
