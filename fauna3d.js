/** Fauna do Ato I. Uma semente por célula mantém a clareira de cada animal.
 * Os quatro vertebrados da main têm rig sem clipes. Cada clone mantém seu
 * esqueleto; o grilo sem rig compartilha uma InstancedMesh. Apenas a textura
 * de cor reduzida é decodificada. Os bandos distantes continuam independentes.
 */
export const FAUNA = Object.freeze({
  coelho: { file: 'Coelhinho.glb', len: .42, turn: -Math.PI/2, max: 2, near: 34, density: .52, biomes: ['prado','floresta','vale'], active: h => h>=5 && h<=20, tex:128, skinned:true },
  montanha: { file: 'PassaroMontanha.glb', len:.52, turn:Math.PI/2, max:2, near:48, density:.45, biomes:['serra'], active:h=>h>=6&&h<=19, tex:128, skinned:true, wings:['bone_18','tripo::Spine_5'] },
  lava: { file:'PassaroLava.glb', len:.36, turn:Math.PI/2, max:2, near:42, density:.4, biomes:['cinzas','vulcao'], active:()=>true, tex:128, skinned:true, wings:['bone_14','tripo::Spine_4'] },
  dourado: { wings:['bone_32','bone_33'], file: 'Passaro_Vale_Dourado.glb', len: .17, turn: Math.PI / 2, max: 3, near: 30, density: .5, biomes: ['vale', 'prado', 'floresta'], active: h => h >= 6 && h <= 19, tex: 128, skinned: true, perch: true },
  grilo: { file: 'Grilo.glb', len: .085, turn: Math.PI / 2, max: 2, near: 12, density: .7, biomes: ['vale', 'prado', 'floresta'], active: h => h >= 18.5 || h <= 5.2, tex: 128 }
});
export const FAUNA_CELL = 40;

/** Retry limitado para GLBs de fauna: falha transitória não desativa a espécie até recarregar o jogo. */
export const FAUNA_LOAD_RETRY = Object.freeze({
  attemptsPerCycle: 3,
  backoffSeconds: Object.freeze([.75, 2]),
  cycleCooldownSeconds: 30,
  maxCycles: 2
});
/** Mantém o streaming responsivo se uma requisição de espécie ficar lenta. */
export const FAUNA_MAX_CONCURRENT_LOADS = 2;
/** Evita que fetch, leitura do GLB ou parse pendente ocupem uma vaga indefinidamente. */
export const FAUNA_LOAD_TIMEOUT_MS = 20000;
function assetHttpStatus(error) {
  const message = String(error && error.message || error);
  const match = message.match(/(?:\bHTTP\s*|\bresponded with\s*|\bstatus(?:\s+code)?\s*[:=]?\s*)(\d{3})\b/i);
  return match ? Number(match[1]) : null;
}
function isPermanentAssetError(error) {
  const status = assetHttpStatus(error);
  return status !== null && status >= 400 && status < 500 && status !== 408 && status !== 429;
}

function hash(a, b, s) { let h = (a * 374761393 + b * 668265263 + s * 974711) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
const SEED = { coelho:61, montanha:79, lava:97, dourado: 23, grilo: 53 };
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
// A dry foothold within beak reach of shallow water. Sample only at spawn.
export function drinkingBank(x, z, ctx) {
  if (!ctx.water) return null;
  for (let i = 0; i < 8; i++) {
    const yaw = i * Math.PI / 4, dx = Math.sin(yaw), dz = Math.cos(yaw);
    for (const offset of [0, .35, .7]) {
      const bx = x + dx * offset, bz = z + dz * offset;
      const depth = ctx.water(bx + dx * .17, bz + dz * .17);
      if (depth > .02 && depth < .35 && habitatOk('dourado', bx, bz, ctx)) return {x:bx, z:bz, yaw};
    }
  }
  return null;
}
/** Quantos de cada espécie podem estar ativos agora (por qualidade): baixa = metade, sem grilo visual. */
export function budget(kind, low) { const m = FAUNA[kind].max; return low ? (kind === 'grilo' ? 0 : Math.max(1, m >> 1)) : m; }
/** Fator 0..1 do coro de grilos para o áudio (hora + habitat próximo); dia = 0 (regra do autor). */
export function insectLevel(hour, nearHabitat) { const dusk = hour >= 18.5 || hour <= 5.2 ? 1 : hour >= 17.8 ? (hour - 17.8) / .7 : 0; return dusk * (nearHabitat ? 1 : .25); }

/**
 * Controlador no jogo. opts: { T, scene, GLTFLoader, skClone, base (URL da raiz), ground(x,z), ctx (habitatOk), low }.
 */
export function createFauna({ T, scene, GLTFLoader, skClone, base = './', ground, ctx, low = false, fetchImpl = (url, options) => fetch(url, options), loadTimeoutMs = FAUNA_LOAD_TIMEOUT_MS }) {
  const root = new T.Group(); root.name = 'fauna-mod327'; scene.add(root);
  const assets = {}, live = new Map(), stats = { loaded: [], live: 0, draws: 0, tris: 0, loads: 0, loadRetries: 0, loadFailures: 0, permanentFailures: 0, retryExhausted: 0, loadTimeouts: 0, activeLoads: 0, peakActiveLoads: 0, lastLoadError: null, lastLoadRecovery: null, loadMs: [] };
  const mx = new T.Object3D(), forward = new T.Vector3(); let activeLoads = 0, scanT = 0, t = 0;
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
  const pending = {}, loadState = Object.create(null), activeControllers = new Set();
  let disposed = false;
  function releaseGltf(gltf) {
    const loadedScene = gltf?.scene;
    if (!loadedScene?.traverse) return;
    const geometries = new Set(), materials = new Set(), textures = new Set(), skeletons = new Set();
    loadedScene.traverse(o => {
      if (o.geometry && !geometries.has(o.geometry)) { geometries.add(o.geometry); o.geometry.dispose?.(); }
      const list = Array.isArray(o.material) ? o.material : [o.material];
      for (const material of list) {
        if (!material || materials.has(material)) continue;
        materials.add(material);
        for (const value of Object.values(material)) {
          if (value?.isTexture && !textures.has(value)) {
            textures.add(value);
            value.dispose?.();
            value.image?.close?.();
          }
        }
        material.dispose?.();
      }
      if (o.skeleton && !skeletons.has(o.skeleton)) { skeletons.add(o.skeleton); o.skeleton.dispose?.(); }
    });
  }
  const requestTimeoutMs = Number.isFinite(loadTimeoutMs) && loadTimeoutMs > 0 ? loadTimeoutMs : FAUNA_LOAD_TIMEOUT_MS;
  // Three.js 0.160.0 não expõe abort no GLTFLoader. Buscar o GLB com AbortController
  // e entregar os bytes ao parseAsync permite liberar a vaga se a rede ficar pendurada.
  async function loadGLB(loader, url) {
    if (disposed) throw Object.assign(new Error('fauna controller disposed before GLB load'), { name: 'AbortError' });
    const controller = new AbortController();
    let timer = null, timedOut = false, abandoned = false, settled = false, cancelLoad = null;
    // GLTFLoader.parseAsync não é cancelável. Separar o cancelamento do controlador
    // da interrupção do fetch permite liberar a vaga imediatamente durante o parse.
    const cancelled = new Promise((_, reject) => {
      cancelLoad = () => {
        abandoned = true;
        reject(Object.assign(new Error('fauna GLB load aborted because controller was disposed'), { name: 'AbortError' }));
      };
    });
    const active = { controller, cancel: cancelLoad };
    activeControllers.add(active);
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => {
        timedOut = true;
        abandoned = true;
        const error = new Error(`fauna GLB load timed out after ${requestTimeoutMs} ms: ${url}`);
        error.code = 'FAUNA_LOAD_TIMEOUT';
        reject(error);
        controller.abort();
      }, requestTimeoutMs);
    });
    const operation = Promise.resolve().then(async () => {
      if (disposed) throw Object.assign(new Error('fauna controller disposed before GLB request'), { name: 'AbortError' });
      // O fallback mantém compatibilidade com loaders antigos/mocks, mas também
      // fica sob o mesmo limite total e descarta o GLB se terminar tarde.
      if (typeof loader.parseAsync !== 'function') return loader.loadAsync(url);
      const response = await fetchImpl(url, { signal: controller.signal });
      if (response.ok === false) {
        // Cancelar o corpo de respostas HTTP não utilizáveis libera a conexão sem consumir o payload.
        controller.abort();
        throw new Error(`fetch for ${url} responded with ${response.status}: ${response.statusText || 'HTTP error'}`);
      }
      const data = await response.arrayBuffer();
      if (timedOut || disposed) throw Object.assign(new Error('fauna GLB load aborted before parsing'), { name: 'AbortError' });
      return loader.parseAsync(data, base);
    });
    // Se timeout/dispose vencerem a corrida, parseAsync/loadAsync pode terminar depois.
    // O resultado órfão só é liberado aqui quando o cancelamento já chegou ao chamador;
    // se a operação vencer a corrida, load() cuida do dispose sem dupla liberação.
    operation.then(gltf => { if (abandoned && settled) releaseGltf(gltf); }, () => {});
    try {
      return await Promise.race([operation, timeout, cancelled]);
    } finally {
      settled = true;
      if (timer !== null) clearTimeout(timer);
      activeControllers.delete(active);
    }
  }
  function load(kind) {
    if (disposed || !FAUNA[kind] || !budget(kind, low)) return Promise.resolve(null);
    if (assets[kind]) return Promise.resolve(assets[kind]);
    if (pending[kind]) return pending[kind];
    if (activeLoads >= FAUNA_MAX_CONCURRENT_LOADS) return Promise.resolve(null);
    const state = loadState[kind] || (loadState[kind] = { attempts: 0, cycles: 0, retryAt: 0, permanent: false });
    if (state.permanent || state.exhausted || t < state.retryAt) return Promise.resolve(null);
    if (state.attempts >= FAUNA_LOAD_RETRY.attemptsPerCycle) state.attempts = 0;
    const attempt = ++state.attempts, S = FAUNA[kind], t0 = performance.now();
    if (attempt > 1 || state.cycles > 0) stats.loadRetries++;
    stats.loads++;
    activeLoads++;
    stats.activeLoads = activeLoads;
    stats.peakActiveLoads = Math.max(stats.peakActiveLoads, activeLoads);
    const request = Promise.resolve().then(() => {
      const L = new GLTFLoader(); L.register(liteTex(low ? Math.min(128, S.tex) : S.tex));
      return loadGLB(L, base + S.file);
    });
    return pending[kind] = request.then(g => {
      if (disposed) { releaseGltf(g); return null; }
      let mesh = null; g.scene.traverse(o => { if (o.isMesh && !mesh) mesh = o; });
      const old = mesh.material, mat = new T.MeshLambertMaterial({ map: old.map || null, color: old.map ? 0xffffff : old.color }); old.dispose();
      const box = new T.Box3().setFromBufferAttribute(mesh.geometry.attributes.position), size = box.getSize(new T.Vector3()), k = S.len / Math.max(size.x, size.z);
      const A = { kind, k, mat, tris: (mesh.geometry.index ? mesh.geometry.index.count : mesh.geometry.attributes.position.count) / 3 };
      if (S.skinned) { mesh.material = mat; mesh.frustumCulled = false; A.proto = g.scene; A.bones = n => { const b = {}; n.traverse(o => { if (o.isBone) b[o.name] = o; }); return b; }; g.scene.updateMatrixWorld(true); A.rigFrames = Object.fromEntries(Object.entries(A.bones(g.scene)).map(([name, joint]) => [name, joint.getWorldQuaternion(new T.Quaternion()).invert()])); }
      else { A.im = new T.InstancedMesh(mesh.geometry, mat, budget(kind, low) || 1); A.im.count = 0; A.im.frustumCulled = false; A.im.name = 'fauna-' + kind; root.add(A.im); }
      assets[kind] = A; delete loadState[kind];
      const loadMs = Math.round(performance.now() - t0);
      if (attempt > 1 || state.cycles > 0) stats.lastLoadRecovery = { kind, attempt, cycle: state.cycles + 1, loadMs };
      stats.loaded.push(kind); stats.loadMs.push(loadMs);
      return A;
    }).catch(e => {
      const message = String(e && e.message || e), status = assetHttpStatus(e);
      stats.loadFailures++;
      const timeout = e?.code === 'FAUNA_LOAD_TIMEOUT';
      if (timeout) stats.loadTimeouts++;
      stats.lastLoadError = { kind, message, status, timeout, attempt, cycle: state.cycles + 1 };
      if (isPermanentAssetError(e)) {
        state.permanent = true; stats.permanentFailures++;
      } else if (attempt >= FAUNA_LOAD_RETRY.attemptsPerCycle) {
        if (state.cycles + 1 >= FAUNA_LOAD_RETRY.maxCycles) {
          state.exhausted = true; stats.retryExhausted++;
        } else {
          state.cycles++;
          state.retryAt = t + FAUNA_LOAD_RETRY.cycleCooldownSeconds;
        }
      } else {
        state.retryAt = t + FAUNA_LOAD_RETRY.backoffSeconds[attempt - 1];
      }
      return { failed: message, retryAt: state.retryAt, permanent: state.permanent };
    }).finally(() => {
      delete pending[kind];
      activeLoads = Math.max(0, activeLoads - 1);
      stats.activeLoads = activeLoads;
    });
  }
  // Only inspect rendered rocks when a bird is created. Intersect one nearby
  // instance at a time; a ray through the entire instanced world is expensive.
  const perchGroups = ['jornada-rochas', 'vale-afloramentos', 'prado-rochedos-renascimento'];
  const rockMatrix = new T.Matrix4(), rockCenter = new T.Vector3();
  const perchRay = new T.Raycaster(), down = new T.Vector3(0, -1, 0);
  function nearestPerch(c) {
    const biome = ctx.biome(c.x,c.z);
    let best = null, radius = 3.5;
    for (const name of perchGroups) {
      const rocks = scene.getObjectByName(name);
      if (!rocks?.visible || !rocks.count) continue;
      for (let i = 0; i < rocks.count; i++) {
        rocks.getMatrixAt(i, rockMatrix);
        rockMatrix.premultiply(rocks.matrixWorld);
        rockCenter.setFromMatrixPosition(rockMatrix);
        const {x, z} = rockCenter, distance = Math.hypot(x - c.x, z - c.z);
        if (distance >= radius || ctx.biome(x,z) !== biome ||
            ctx.road?.(x,z) || ctx.water?.(x,z) > .02 || ctx.lava?.(x,z) > 0) continue;
        const floor = ground(x,z);
        const surface = new T.Mesh(rocks.geometry, rocks.material);
        surface.matrixWorld.copy(rockMatrix);
        perchRay.ray.origin.set(x, floor + 5, z);
        perchRay.ray.direction.copy(down);
        const hit = perchRay.intersectObject(surface, false)[0];
        if (!hit || hit.point.y < floor + .12 || hit.point.y > floor + 3) continue;
        best = {x, z, y:hit.point.y}; radius = distance;
      }
    }
    return best;
  }
  function spawn(c) {
    const id = c.cell + c.kind;
    if (live.has(id)) despawn(id);
    const A = assets[c.kind], S = FAUNA[c.kind], y = ground(c.x, c.z);
    const a = { ...c, hx: c.x, hz: c.z, y, by: y, state: 'idle', st: 0, cooldown: 0, poseAt: 0, hop: 0, vx: 0, vz: 0, fly: 0, look: 0 };
    if (S.wings) {
      a.perch = nearestPerch(c);
      if (!a.perch && c.kind === 'dourado') {
        const bank = drinkingBank(c.x, c.z, ctx);
        if (bank) a.perch = {...bank, y:ground(bank.x, bank.z), bank:true};
      }
      if (a.perch) Object.assign(a, a.perch, {by:a.perch.y});
    }
    if (S.skinned) { const n = skClone(A.proto); n.scale.setScalar(A.k); root.add(n); a.node = n; a.bones = A.bones(n); n.updateMatrixWorld(true); a.axes = {}; a.rest = Object.fromEntries(Object.entries(a.bones).map(([k, b]) => [k, b.quaternion.clone()])); }
    live.set(id, a);
  }
  function despawn(key) { const a = live.get(key); if (a?.node) { root.remove(a.node); a.node.traverse(o => { if (o.isSkinnedMesh) o.skeleton.dispose(); }); } live.delete(key); }
  const near = (a, px, pz) => Math.hypot(a.x - px, a.z - pz);
  function scan(px, pz, hour, cam) {
    const wanted = {};
    for (const kind of Object.keys(FAUNA)) {
      const S = FAUNA[kind], B = budget(kind, low); if (!B || !S.active(hour)) { for (const [k, a] of live) if (a.kind === kind) despawn(k); continue; }
      const R = S.near, c0x = Math.floor((px - R) / FAUNA_CELL), c1x = Math.floor((px + R) / FAUNA_CELL), c0z = Math.floor((pz - R) / FAUNA_CELL), c1z = Math.floor((pz + R) / FAUNA_CELL), list = [];
      for (let cx = c0x; cx <= c1x; cx++) for (let cz = c0z; cz <= c1z; cz++) { const c = cellCandidate(kind, cx, cz); if (!c) continue; const d = Math.hypot(c.x - px, c.z - pz); if (d > R || !habitatOk(kind, c.x, c.z, ctx)) continue; list.push([d, c]); }
      list.sort((p, q) => p[0] - q[0]); wanted[kind] = list.slice(0, B);
      const retry = loadState[kind];
      if (list.length && !assets[kind] && !pending[kind] && activeLoads < FAUNA_MAX_CONCURRENT_LOADS && (!retry || (!retry.permanent && !retry.exhausted && t >= retry.retryAt))) load(kind);
    }
    for (const [k, a] of live) { const S = FAUNA[a.kind]; if (near(a, px, pz) > S.near * 1.25 || !a.qa && !(wanted[a.kind] || []).some(([, c]) => c.cell + c.kind === k)) despawn(k); }
    const population = {};
    for (const a of live.values()) population[a.kind] = (population[a.kind] || 0) + 1;
    if (cam) cam.getWorldDirection(forward); else forward.set(0,0,0);
    const horizontal = Math.hypot(forward.x, forward.z) || 1;
    const fx = forward.x / horizontal, fz = forward.z / horizontal;
    for (const kind of Object.keys(wanted)) { if (!assets[kind] || assets[kind].failed) continue;
      for (const [d, c] of wanted[kind]) { if ((population[kind] || 0) >= budget(kind, low)) break; if (live.has(c.cell + c.kind)) continue; const dx = c.x - px, dz = c.z - pz, inView = (dx * fx + dz * fz) / (d || 1) > .55;
        if (d < 10 || (inView && d < 22)) continue; // nunca aparece na cara do jogador
        spawn(c); population[kind] = (population[kind] || 0) + 1; } }
  }
  const tmpQ = new T.Quaternion();
  function bone(a, name, axis, ang, additive = false) { const key = T.PropertyBinding.sanitizeNodeName(name), b = a.bones[key];
    if (!b) return;
    const id = key + axis.join(',');
    // The exported rigs use different local joint axes. Express the requested
    // axis in the unposed model frame, independent of the animal's heading.
    if (!a.axes[id]) {
      const original = assets[a.kind].rigFrames[key];
      a.axes[id] = new T.Vector3(...axis).applyQuaternion(original).normalize();
    }
    tmpQ.setFromAxisAngle(a.axes[id], ang);
    if (!additive) b.quaternion.copy(a.rest[key]);
    b.quaternion.multiply(tmpQ); }
  function step(a, dt, px, pz) {
    const S = FAUNA[a.kind], d = near(a, px, pz); a.st += dt; a.cooldown = Math.max(0, a.cooldown - dt);
    if (S.wings) {
      if (a.state === 'idle' && !a.cooldown && (d < 4.5 || a.st > 14 + a.seed * 18)) {
        const away = Math.atan2(a.x - px, a.z - pz);
        // Probe a short fan once. A cliff or wall at the first heading should
        // not make the bird hover vertically at its starting point.
        let reach = 0, heading = away;
        for (const angle of [away, away + .7, away - .7]) {
          for (let i = 1; i <= 8; i++) {
            const x = a.hx + Math.sin(angle) * i, z = a.hz + Math.cos(angle) * i;
            if (!habitatOk(a.kind, x, z, ctx) || ground(x, z) > a.by + i * .8) break;
            if (i > reach) { reach = i; heading = angle; }
          }
          if (reach === 8) break;
        }
        a.cooldown = 1;
        if (reach >= 1) {
          a.reach = reach; a.heading = heading; a.state = 'flight'; a.st = 0;
        }
      }
      if (a.state === 'flight') {
        const phase = Math.min(1, a.st / (4.2 + a.seed * 2)), arc = Math.sin(Math.PI * phase);
        const side = Math.sin(phase * 2 * Math.PI) * arc * Math.min(.9, a.reach / 4);
        const sin = Math.sin(a.heading), cos = Math.cos(a.heading);
        const travel = a.perch ? Math.max(0, (arc - .25) / .75) : arc;
        const nx = a.hx + sin * travel * a.reach + cos * side * travel;
        const nz = a.hz + cos * travel * a.reach - sin * side * travel;
        const lift = Math.min(1, arc * 4);
        if (a.perch && lift < 1) {
          a.x = a.perch.x + (a.hx - a.perch.x) * lift;
          a.z = a.perch.z + (a.hz - a.perch.z) * lift;
        } else if (habitatOk(a.kind, nx, nz, ctx)) { a.x = nx; a.z = nz; }
        const height = ground(a.x, a.z);
        a.y = Math.max(height, a.by) + arc * (2 + a.seed * 2);
        a.yaw = a.heading + Math.PI * Math.min(1, Math.max(0, (phase - .4) * 5));
        if (phase === 1) { a.state = 'idle'; a.st = 0; a.cooldown = 2 + a.seed * 2; }
      }
      return true;
    }
    const fleeR=a.kind==='coelho'?4:1.6;
    if(d<fleeR&&a.state!=='flee'){a.state='flee';a.st=0;a.hop=0;}
    if (a.state === 'idle' && a.st > 1.5 + a.seed * 3) { a.state = Math.random() < .45 ? 'hop' : 'idle'; a.st = 0; if (a.state === 'hop') {
      const homeDistance = Math.hypot(a.hx - a.x, a.hz - a.z);
      a.yaw = homeDistance > 3 ? Math.atan2(a.hx - a.x, a.hz - a.z) : a.yaw + (Math.random() - .5) * 2.2;
      // Forage along the margin, turning parallel when the next hop faces water.
      if (ctx.water?.(a.x + Math.sin(a.yaw), a.z + Math.cos(a.yaw)) > .02) a.yaw += Math.PI / 2;
    } }
    if (a.state === 'hop' || a.state === 'flee') {
      const len = a.kind==='coelho'?.44:.3, dist = a.kind==='coelho'?(a.state==='flee'?1.15:.65):.35;
      if (a.state === 'flee' && a.hop === 0) a.yaw = Math.atan2(a.x - px, a.z - pz) + (Math.random() - .5) * .6;
      a.hop += dt / len; const u = Math.min(1, a.hop), nx = a.x + Math.sin(a.yaw) * dist * dt / len, nz = a.z + Math.cos(a.yaw) * dist * dt / len;
      if (habitatOk(a.kind, nx, nz, ctx) && Math.hypot(nx - a.hx, nz - a.hz) < 14) { a.x = nx; a.z = nz; } else a.yaw += Math.PI * .6 * dt / len;
      a.by = ground(a.x, a.z); a.y = a.by + Math.sin(Math.PI * u) * (a.kind === 'grilo' ? .07 : .1);
      if (a.hop >= 1) { a.hop = 0; if (a.state === 'hop' || (a.state === 'flee' && d > fleeR * 2.2) || a.st > 4) { a.state = 'idle'; a.st = 0; } }
    } else a.y = a.by = ground(a.x, a.z);
    return true;
  }
  function pose(a, idx) {
    const S = FAUNA[a.kind], A = assets[a.kind], bob = a.state === 'idle' ? Math.sin(t * (a.kind === 'grilo' ? 9 : 2.1) + a.seed * 9) : 0;
    if (S.skinned) { const n = a.node; n.position.set(a.x, a.y, a.z); n.rotation.set(0, a.yaw + S.turn, 0);
      if (t < a.poseAt) return;
      a.poseAt = t + (a.far ? .18 : 0);
      const look = Math.sin(t * .9 + a.seed * 7) * .6 * (a.state === 'idle' ? 1 : .2); bone(a, 'tripo::Head_0', [0, 1, 0], look); bone(a, 'tripo::Tail_0', [1, 0, 0], .15 * Math.sin(t * 3 + a.seed * 5) * (a.state === 'idle' ? 1 : 0));
      if(S.wings){
        const flying = a.state === 'flight', duration = 4.2 + a.seed * 2;
        const glide = Math.max(0, 1 - Math.abs(a.st - duration / 2) / .9);
        const envelope = Math.min(1, a.st * 5, Math.max(0, duration - a.st) * 4);
        const flap = flying ? envelope * (.51 + .24 * glide + .38 * (1 - glide) * Math.sin(a.st * 18)) : 0;
        const lift = a.kind === 'lava' ? -flap : flap;
        for (let side = 0; side < 2; side++) {
          const sign = side === 0 ? 1 : -1;
          bone(a, S.wings[side], [1,0,0], lift * sign);
          // Fan the folded trailing feathers outward before banking into a glide.
          bone(a, S.wings[side], [0,1,0], lift * sign * .68, true);
        }
        if (!flying && Math.sin(a.st * .8) > .5) {
          if (a.perch?.bank) a.yaw = a.perch.yaw;
          const dip = a.perch?.bank ? .44 : .22;
          bone(a, 'tripo::Head_0', [0,0,1], dip * Math.max(0, Math.sin(a.st * 3.2)));
        }
      }else if(a.kind==='coelho'){
        const stride=Math.sin(Math.PI*Math.min(1,a.hop));
        for(const leg of ['bone_18','bone_22'])bone(a,leg,[0,0,1],stride*.55);
        for(const leg of ['bone_9','bone_13'])bone(a,leg,[0,0,1],-stride*.35);
        if (a.state === 'idle') {
          n.scale.y = A.k * (1 + .012 * bob);
          if (Math.sin(t * .45 + a.seed) > 0) bone(a,'tripo::Head_0',[0,0,1],-.24*Math.abs(Math.sin(t*2.2)));
        } else n.scale.y = A.k;
      }
      return; }
    const pitch = a.state === 'hop' || a.state === 'flee' ? -.25 * Math.sin(Math.PI * Math.min(1, a.hop)) : .03 * bob;
    mx.position.set(a.x, a.y, a.z); mx.rotation.set(0, a.yaw + S.turn, 0); mx.rotateZ(a.kind === 'grilo' ? -pitch : 0);
    const sq = a.state === 'hop' || a.state === 'flee' ? 1 + .1 * Math.sin(Math.PI * Math.min(1, a.hop)) : 1; mx.scale.set(A.k / sq, A.k * sq, A.k); mx.updateMatrix(); A.im.setMatrixAt(idx, mx.matrix);
  }
  return {
    root, stats,
    update(dt, { px, pz, hour = 12, camera = null, hidden = false }) {
      if (disposed) return;
      t += dt; root.visible = !hidden; if (hidden) return;
      scanT -= dt; if (scanT <= 0) { scanT = .6; scan(px, pz, hour, camera); }
      const counts = {}; let draws = 0, tris = 0;
      for (const [k, a] of live) { a.far = near(a, px, pz) > 20; if (!step(a, dt, px, pz)) { despawn(k); continue; } const A = assets[a.kind]; const i = counts[a.kind] = (counts[a.kind] || 0); counts[a.kind]++; pose(a, i); if (a.node) { draws++; tris += A.tris; } }
      for (const kind of Object.keys(assets)) { const A = assets[kind]; if (!A.im) continue; A.im.count = Math.min(counts[kind] || 0, A.im.instanceMatrix.count); A.im.instanceMatrix.needsUpdate = true; if (A.im.count) { draws++; tris += A.tris * A.im.count; } }
      stats.live = live.size; stats.draws = draws; stats.tris = Math.round(tris); stats.counts = counts;
    },
    /** QA: força o carregamento e o spawn imediato (ignora o "não nascer na cara"). */
    debugSpawnAt(kind, x, z, yaw = 0) { if (disposed || !assets[kind] || assets[kind].failed || !budget(kind, low) || !habitatOk(kind, x, z, ctx)) return false;
      const same = [...live].filter(([, a]) => a.kind === kind);
      if (same.length >= budget(kind, low)) despawn(same[0][0]);
      spawn({ kind, cell: 'qa' + x.toFixed(1) + z.toFixed(1), x, z, yaw, seed: .5, qa: true }); return true; },
    load,
    list() { return [...live.values()].map(a => ({ kind: a.kind, state: a.state, yaw: a.yaw, qa: !!a.qa, perch:!!a.perch, x: +a.x.toFixed(2), z: +a.z.toFixed(2), y: +a.y.toFixed(2) })); },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const active of activeControllers) {
        active.cancel();
        active.controller.abort();
      }
      activeControllers.clear();
      for (const k of [...live.keys()]) despawn(k);
      for (const A of Object.values(assets)) {
        if (A.im) {
          root.remove(A.im);
          A.im.dispose?.();
          releaseGltf({ scene: A.im });
        }
        // O GLB pode conter meshes auxiliares não skinned e materiais próprios.
        // Reutilizar a liberação completa evita deixar geometria/textura órfã.
        if (A.proto) releaseGltf({ scene: A.proto });
      }
      scene.remove(root);
    }
  };
}
