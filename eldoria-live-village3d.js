/**
 * Eldória — cidade jogável (Mod 291).
 * GLBs autorais normalizados como na prévia, agora com:
 *  - LOD geométrico (<Nome>-lod1.glb, ~5k triângulos, reaproveita o material/textura do LOD0);
 *  - aterramento pelo PONTO MAIS BAIXO da pegada (nada flutua) e soleira de pedra nas casas;
 *  - plano revisado: casa que ocupava a trilha principal e ferreiro colado nela foram afastados, árvores
 *    ancestrais extras para a silhueta da referência (cidade ENTRE árvores gigantes) e fonte seca do roteiro.
 * NPCs, lojas, checkpoints e gatilhos continuam nas coordenadas originais (módulo só de cenário).
 */
import { housePlots, ELDORIA_HOUSES, ELDORIA_SMITHY, ELDORIA_MAIN_TREE, ELDORIA_SIDE_TREE, ANCESTRAL_ROOT_SINK, yawFacing } from './eldoria-city-layout.js';
/* Mod 292 — plano urbano refeito em dados estruturados (eldoria-city-layout.js): casas em bairros (Entrada, Praça,
   Norte, Leste, Oeste), cada uma com função e porta voltada para a rua; a árvore colossal ao fundo da praça e uma
   árvore lateral com a casa da árvore. As árvores menores saíram do núcleo urbano (a mata fica no cinturão). */
export const ELDORIA_PLOTS = housePlots();
export const ELDORIA_MARKET = [[2.85, -2.5, 3.65, .15], [-2.05, 3.75, 3.55, Math.PI], [4.5, 3, 3.7, .2], [1.8, -7.6, 3.5, Math.PI]];
const S = ELDORIA_SMITHY, MT = ELDORIA_MAIN_TREE, ST = ELDORIA_SIDE_TREE;
export const ELDORIA_PROPS = [
  ['PocoEldoria.glb', -1.4, -.6, 3.15, 0, 1.2],
  [S.file, S.x, S.z, S.size, yawFacing(S.file, S.faceTo[0] - S.x, S.faceTo[1] - S.z), S.collision],
  ['Carroça.glb', 17.7, 23.4, 3.6, -.35, 1.45],            // estacionada no largo depois da ponte
  ['RochedoMusgoEldoria.glb', -23, -19, 3.8, .2, 1.75],
  ['RochedoMusgoEldoria.glb', 30, 23, 4.1, .8, 2],          // na margem norte do rio, fora da rua
  [MT.file, MT.x, MT.z, MT.size, MT.rotation, 3.9],         // árvore colossal (fundo da praça)
  [ST.file, ST.x, ST.z, ST.size, ST.rotation, 3.4],         // árvore lateral com a casa da árvore
];
export const ELDORIA_DRY_FOUNTAIN = { x: -7.5, z: 7.5, r: 1.55 };
export { ELDORIA_HOUSES };
const LOD_FILES = new Set(['CasaEldoria01.glb', 'CasaEldoria02.glb', 'ArvoreAncestralEldoria.glb', 'RochedoMusgoEldoria.glb', 'PocoEldoria.glb', 'BarracaFrutasEldoria.glb', 'FerreiroEldoria.glb', 'Carroça.glb', 'ArvoreFloresta01.glb']);

export function eldoriaSpecs() {
  const specs = [];
  for (const [x, z, file, size, rotation] of ELDORIA_PLOTS) specs.push({ file, x, z, size, rotation, collision: 2.25, kind: 'house' });
  for (const [x, z, size, rotation] of ELDORIA_MARKET) specs.push({ file: 'BarracaFrutasEldoria.glb', x, z, size, rotation, collision: 1.22, kind: 'market' });
  for (const [file, x, z, size, rotation, collision] of ELDORIA_PROPS) specs.push({ file, x, z, size, rotation, collision, kind: /Arvore/.test(file) ? 'tree' : 'prop' });
  return specs;
}
/** Raio aproximado da pegada no chão (para testes de sobreposição sem WebGL). */
export function footprintRadius(s) { return s.kind === 'tree' ? s.collision : s.kind === 'house' ? s.size * .42 : s.size * .38; }
export function planOverlaps(specs = eldoriaSpecs()) {
  const out = [];
  for (let i = 0; i < specs.length; i++) for (let j = i + 1; j < specs.length; j++) {
    const a = specs[i], b = specs[j], d = Math.hypot(a.x - b.x, a.z - b.z);
    if (d < footprintRadius(a) + footprintRadius(b) - .15) out.push([a.file + '@' + a.x + ',' + a.z, b.file + '@' + b.x + ',' + b.z, +d.toFixed(2)]);
  }
  return out;
}
/** Amostras da pegada girada (cantos, meios das bordas e centro) para achar o chão mais baixo e mais alto. */
export function footprintSamples(cx, cz, hx, hz, rot) {
  const c = Math.cos(rot), s = Math.sin(rot), pts = [];
  for (const [u, v] of [[0, 0], [1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const lx = u * hx, lz = v * hz; pts.push([cx + lx * c + lz * s, cz - lx * s + lz * c]); }
  return pts;
}

export function mountEldoriaLiveVillage({ THREE, GLTFLoader, group, groundHeightAt, center, obstacles, lowSpec = false, mergeStatic = null }) {
  if (!THREE || !GLTFLoader || !group || !groundHeightAt || !center || !obstacles) throw new Error('Eldoria: integration dependencies missing');
  const loader = new GLTFLoader();
  const promises = [], root = new THREE.Group();
  root.name = 'EldoriaCity1Live';
  group.add(root);
  const specs = eldoriaSpecs(), lodDistance = lowSpec ? 17 : 26, grounding = [];
  const sources = new Map(), lods = new Map(), failures = [];
  function fetchModel(file) {
    if (!sources.has(file)) sources.set(file, new Promise(resolve => {
      loader.load('./' + file, gltf => {
        try {
          const src = gltf.scene, bounds = new THREE.Box3().setFromObject(src);
          if (bounds.isEmpty()) throw Error('empty GLB');
          resolve({ src, size: bounds.getSize(new THREE.Vector3()), centerPoint: bounds.getCenter(new THREE.Vector3()), bottom: bounds.min.y });
        } catch (error) { failures.push(file + ': ' + error.message); resolve(null); }
      }, undefined, error => { failures.push(file + ': ' + (error?.message || String(error))); resolve(null); });
    }));
    return sources.get(file);
  }
  /** Mod 292 — LOD1 só herda o material do LOD0 depois de PROVAR que o mapeamento UV é o mesmo: amostra vértices do
   *  LOD1, acha o vértice mais próximo do LOD0 pela posição e compara as UVs (erro < 0,02). Nada de índice de
   *  travessia nem de nome cego. Se alguma malha falhar, aquele modelo fica só com o LOD0 (registrado em lodAudit). */
  function uvCompatible(src, lod) {
    const ps = src.geometry?.attributes?.position, us = src.geometry?.attributes?.uv, pl = lod.geometry?.attributes?.position, ul = lod.geometry?.attributes?.uv;
    if (!ps || !us || !pl || !ul) return { ok: false, why: 'sem UV' };
    const N = Math.min(48, pl.count), step = Math.max(1, Math.floor(pl.count / N)); let bad = 0, worst = 0;
    for (let i = 0, n = 0; n < N && i < pl.count; i += step, n++) {
      const x = pl.getX(i), y = pl.getY(i), z = pl.getZ(i); let best = Infinity, bj = -1;
      for (let j = 0; j < ps.count; j++) { const dx = ps.getX(j) - x, dy = ps.getY(j) - y, dz = ps.getZ(j) - z, d = dx * dx + dy * dy + dz * dz; if (d < best) { best = d; bj = j; if (d < 1e-12) break; } }
      const du = Math.abs(us.getX(bj) - ul.getX(i)), dv = Math.abs(us.getY(bj) - ul.getY(i)), e = Math.max(du, dv);
      worst = Math.max(worst, e); if (e > .02) bad++;
    }
    return { ok: bad <= 2, why: bad + '/' + N + ' amostras fora (pior ' + worst.toFixed(3) + ')' };
  }
  const lodAudit = [];
  function fetchLod(file, asset) {
    if (!LOD_FILES.has(file)) return Promise.resolve(null);
    // Casas: o LOD1 sem textura deixava a fachada de outra cor ao longe (PR #423); continuam só com o LOD0.
    if (specs.some(s => s.file === file && s.kind === 'house')) return Promise.resolve(null);
    if (!lods.has(file)) lods.set(file, new Promise(resolve => loader.load('./' + file.replace(/\.glb$/, '-lod1.glb'), gltf => {
      const srcMeshes = [], lodMeshes = [];
      asset.src.traverse(o => { if (o.isMesh) srcMeshes.push(o); });
      gltf.scene.traverse(o => { if (o.isMesh) lodMeshes.push(o); });
      let ok = lodMeshes.length > 0 && lodMeshes.length === srcMeshes.length; const notes = [];
      for (const mesh of lodMeshes) {
        const source = srcMeshes.find(m => m.name === mesh.name) || (srcMeshes.length === 1 ? srcMeshes[0] : null);
        const c = source ? uvCompatible(source, mesh) : { ok: false, why: 'sem malha correspondente' };
        notes.push((mesh.name || '?') + ': ' + c.why);
        if (c.ok) mesh.material = source.material; else ok = false;
      }
      lodAudit.push({ file, lod: ok, notes });
      resolve(ok ? gltf.scene : null);
    }, undefined, () => { lodAudit.push({ file, lod: false, notes: ['LOD1 não carregou'] }); resolve(null); })));
    return lods.get(file);
  }
  const plinths = [];
  for (const spec of specs) {
    promises.push(fetchModel(spec.file).then(asset => asset ? fetchLod(spec.file, asset).then(lodSrc => ({ asset, lodSrc })) : null).then(res => {
      if (!res) return false;
      const { asset, lodSrc } = res, k = spec.size / Math.max(.01, asset.size.x, asset.size.y, asset.size.z);
      const wrap = m => { m.scale.setScalar(k); m.position.set(-asset.centerPoint.x * k, -asset.bottom * k, -asset.centerPoint.z * k); const g = new THREE.Group(); g.add(m); return g; };
      const obj = lodSrc ? new THREE.LOD() : new THREE.Group();
      if (lodSrc) { obj.addLevel(wrap(asset.src.clone(true)), 0); obj.addLevel(wrap(lodSrc.clone(true)), spec.kind === 'tree' ? lodDistance * 1.6 : lodDistance); }
      else obj.add(wrap(asset.src.clone(true)));
      const cx = center.x + spec.x, cz = center.z + spec.z, hx = asset.size.x * k * .46, hz = asset.size.z * k * .46;
      const ys = footprintSamples(cx, cz, spec.kind === 'tree' ? Math.min(hx, 2.2) : hx, spec.kind === 'tree' ? Math.min(hz, 2.2) : hz, spec.rotation).map(([x, z]) => groundHeightAt(x, z));
      const lo = Math.min(...ys), hi = Math.max(...ys);
      // Base no chão mais baixo da pegada: nenhum canto fica no ar; árvores afundam 2,5 % da altura (perfil das raízes medido no GLB).
      const y = spec.kind === 'tree' ? lo - spec.size * ANCESTRAL_ROOT_SINK : lo - .03;
      obj.position.set(cx, y, cz); obj.rotation.y = spec.rotation; obj.name = 'Eldoria_' + spec.kind + '_' + spec.file;
      obj.traverse(child => { if (child.isMesh) { child.receiveShadow = true; child.castShadow = !lowSpec && (spec.kind === 'house' || spec.kind === 'tree'); } });
      root.add(obj);
      if (spec.kind === 'house') plinths.push({ x: cx, y: lo, z: cz, sx: hx * 2.08, sz: hz * 2.08, h: .26 + (hi - lo), rot: spec.rotation });
      grounding.push({ file: spec.file, kind: spec.kind, x: +cx.toFixed(1), z: +cz.toFixed(1), slope: +(hi - lo).toFixed(3), lod: !!lodSrc });
      obstacles.push({ x: cx, z: cz, radius: spec.collision, height: spec.size });
      return true;
    }));
  }
  // Fonte seca da praça (roteiro: "uma fonte seca"): bacia rachada, sem água, folhas e poeira no fundo.
  const F = ELDORIA_DRY_FOUNTAIN, fx = center.x + F.x, fz = center.z + F.z, fy = groundHeightAt(fx, fz), stoneMat = new THREE.MeshStandardMaterial({ color: 0xa39c8a, roughness: .95 });
  const fountain = new THREE.Group(); fountain.position.set(fx, fy, fz); fountain.name = 'EldoriaDryFountain';
  const rim = new THREE.Mesh(new THREE.TorusGeometry(F.r, .2, 8, 28), stoneMat); rim.rotation.x = Math.PI / 2; rim.position.y = .48; fountain.add(rim);
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(F.r + .1, F.r + .22, .5, 28, 1, true), stoneMat); wall.position.y = .25; fountain.add(wall);
  const bed = new THREE.Mesh(new THREE.CircleGeometry(F.r, 28), new THREE.MeshStandardMaterial({ color: 0x6d6250, roughness: 1 })); bed.rotation.x = -Math.PI / 2; bed.position.y = .14; fountain.add(bed);
  const col = new THREE.Mesh(new THREE.CylinderGeometry(.2, .28, 1.3, 10), stoneMat); col.position.y = .75; fountain.add(col);
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(.62, .3, .26, 14), stoneMat); bowl.position.y = 1.42; fountain.add(bowl);
  for (let i = 0; i < 7; i++) { const crack = new THREE.Mesh(new THREE.BoxGeometry(.03, .01, .5 + (i % 3) * .2), new THREE.MeshBasicMaterial({ color: 0x3a3227 })); const a = i * .9; crack.position.set(Math.cos(a) * .6, .155, Math.sin(a) * .6); crack.rotation.y = a + .6; fountain.add(crack); }
  for (let i = 0; i < 9; i++) { const leaf = new THREE.Mesh(new THREE.CircleGeometry(.07, 5), new THREE.MeshStandardMaterial({ color: i % 2 ? 0x7a5a2a : 0x5c4a24, roughness: 1, side: THREE.DoubleSide })); leaf.rotation.x = -Math.PI / 2; const a = i * 2.1; leaf.position.set(Math.cos(a) * (.3 + (i % 4) * .25), .16, Math.sin(a) * (.3 + (i % 4) * .25)); fountain.add(leaf); }
  fountain.traverse(o => { if (o.isMesh) { o.receiveShadow = true; o.castShadow = !lowSpec; } });
  if (mergeStatic) mergeStatic(fountain);
  root.add(fountain); obstacles.push({ x: fx, z: fz, radius: F.r + .25, height: .7 });
  const complete = Promise.all(promises).then(results => {
    // Soleiras de pedra das casas numa geometria só (1 draw call): base visível onde a parede toca o chão.
    if (plinths.length) {
      const pos = [], idx = [];
      for (const p of plinths) {
        const g = new THREE.BoxGeometry(p.sx, p.h, p.sz); g.rotateY(p.rot); g.translate(p.x, p.y - .2 + p.h / 2, p.z);
        const base = pos.length / 3, a = g.attributes.position; for (let i = 0; i < a.count; i++) pos.push(a.getX(i), a.getY(i), a.getZ(i));
        for (const i of g.index.array) idx.push(base + i);
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
      const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x7d776a, roughness: 1 })); m.name = 'EldoriaHousePlinths'; m.receiveShadow = true; root.add(m);
    }
    return { loaded: results.filter(Boolean).length, expected: specs.length, failures: [...failures], root, grounding, overlaps: planOverlaps(specs), lodDistance, lodAudit };
  });
  return { root, complete, expected: specs.length, failures, fetchModel };
}
