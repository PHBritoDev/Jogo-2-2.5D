/**
 * Eldória — cidade jogável (Mod 291).
 * GLBs autorais normalizados como na prévia, agora com:
 *  - LOD geométrico (<Nome>-lod1.glb, ~5k triângulos, reaproveita o material/textura do LOD0);
 *  - aterramento pelo PONTO MAIS BAIXO da pegada (nada flutua) e soleira de pedra nas casas;
 *  - plano revisado: casa que ocupava a trilha principal e ferreiro colado nela foram afastados, árvores
 *    ancestrais extras para a silhueta da referência (cidade ENTRE árvores gigantes) e fonte seca do roteiro.
 * NPCs, lojas, checkpoints e gatilhos continuam nas coordenadas originais (módulo só de cenário).
 */
export const ELDORIA_PLOTS = [
  [-16, -16, 'CasaEldoria01.glb', 5.7, .3], [-5, -18, 'CasaEldoria02.glb', 5.9, -.3],
  // Mod 291: (9,-17) ficava em cima da trilha principal → (3,-15); (18,-9) encostava nela → (20.5,-8).
  [3, -15, 'CasaEldoria01.glb', 6.0, .18], [20.5, -8, 'CasaEldoria02.glb', 5.9, -.22],
  [-18, 13, 'CasaEldoria02.glb', 6.3, .16], [-8, 17, 'CasaEldoria01.glb', 5.7, -.32],
  [5, 20.5, 'CasaEldoria01.glb', 6.0, .4], [18, 12, 'CasaEldoria02.glb', 6.1, -.22], // (8,17) encostava na trilha da clareira
  // Mod 291: (-19,-3) ficava encostada na Loja Central (agora com GLB e visível) → (-24,8).
  [-24, 8, 'CasaEldoria01.glb', 5.1, .23], [19, 2.5, 'CasaEldoria02.glb', 5.4, -.34]
];
export const ELDORIA_MARKET = [[2.85, -2.5, 3.65, .15], [-2.05, 3.75, 3.55, Math.PI], [4.5, 3, 3.7, .2], [1.8, -7.6, 3.5, Math.PI]];
export const ELDORIA_PROPS = [
  ['PocoEldoria.glb', -1.4, -.6, 3.15, 0, 1.2],
  ['FerreiroEldoria.glb', 16, -17.5, 5.6, Math.PI * .3, 2.4], // Mod 291: fora da trilha e da margem do rio
  ['Carroça.glb', -10, -27, 3.6, .7, 1.45],
  ['RochedoMusgoEldoria.glb', -23, -19, 3.8, .2, 1.75],
  ['RochedoMusgoEldoria.glb', 22, 17, 4.1, .8, 2],
  // Árvores ancestrais: a principal além da praça e três que fecham a silhueta (nunca no spawn nem nas trilhas).
  ['ArvoreAncestralEldoria.glb', -34, 5, 32, -.18, 3.9],
  ['ArvoreAncestralEldoria.glb', -24, -24, 27, 1.9, 3.4],
  ['ArvoreAncestralEldoria.glb', 24, 24, 29, 3.4, 3.6],
  ['ArvoreFloresta01.glb', 30, -28, 14, .4, 2.5],
];
export const ELDORIA_DRY_FOUNTAIN = { x: -7.5, z: 7.5, r: 1.55 };
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
  /** LOD1 sem textura: herda o material do LOD0 (mesma ordem de malhas). */
  function fetchLod(file, asset) {
    if (!LOD_FILES.has(file)) return Promise.resolve(null);
    if (!lods.has(file)) lods.set(file, new Promise(resolve => loader.load('./' + file.replace(/\.glb$/, '-lod1.glb'), gltf => {
      const mats = []; asset.src.traverse(o => { if (o.isMesh) mats.push(o.material); });
      let k = 0; gltf.scene.traverse(o => { if (o.isMesh) { o.material = mats[Math.min(k, mats.length - 1)] || o.material; k++; } });
      resolve(gltf.scene);
    }, undefined, () => resolve(null))));
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
      // Base no chão mais baixo da pegada: nenhum canto fica no ar; árvores afundam as raízes.
      const y = spec.kind === 'tree' ? lo - .3 : lo - .03;
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
    return { loaded: results.filter(Boolean).length, expected: specs.length, failures: [...failures], root, grounding, overlaps: planOverlaps(specs), lodDistance };
  });
  return { root, complete, expected: specs.length, failures, fetchModel };
}
