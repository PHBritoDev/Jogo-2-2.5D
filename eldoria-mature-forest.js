/**
 * MOD 291 — Mata fechada de Eldória com o modelo do criador (ArvoreFloresta01.glb: tronco grosso, raízes expostas,
 * musgo e copa em folhas). Referência: floresta densa ao redor do lago turquesa, copas cruzadas e visão curta.
 *
 * - Plano puro (testável): árvores maduras em espaçamento de Poisson aproximado, em manchas, na faixa entre o rio e a
 *   serra e num anel em volta do lago; nunca em trilha, água, jaula ou ponte.
 * - Render: 1 InstancedMesh com a geometria LOD1 (≈4 mil triângulos, textura do LOD0) perto da câmera e 1 InstancedMesh
 *   barata (copa + tronco, ~100 triângulos) longe; o corte por distância/direção do jogo escolhe quem vai para a GPU.
 */
import { makeRng } from './eldoria-prologue-meadow.js';

export function planMatureForest({ lake, zone, isFree, lowSpec = false, seed = 5513 }) {
  const rnd = makeRng(seed), out = [], target = lowSpec ? 150 : 220, minGap = lowSpec ? 5.8 : 5.2;
  const ok = (x, z, h) => isFree(x, z) && !out.some(t => (t.x - x) ** 2 + (t.z - z) ** 2 < (minGap * (t.h + h) / 32) ** 2 + minGap * minGap * .5);
  // Anel do lago: árvores grandes debruçadas na margem (enquadram a água, como na referência).
  for (let i = 0; i < 70 && out.length < target * .35; i++) {
    const a = rnd() * Math.PI * 2, r = lake.r + 3.5 + rnd() * 16, x = lake.x + Math.cos(a) * r, z = lake.z + Math.sin(a) * r, h = 13 + rnd() * 9;
    if (ok(x, z, h)) out.push({ x, z, h, rot: rnd() * 6.28, lean: (rnd() - .5) * .12, w: .9 + rnd() * .5 });
  }
  // Faixa de mata fechada: manchas por ruído barato (sem fileiras), densidade maior longe das trilhas.
  for (let i = 0; i < 9000 && out.length < target; i++) {
    const x = zone.x0 + rnd() * (zone.x1 - zone.x0), z = zone.z0 + rnd() * (zone.z1 - zone.z0);
    const patch = .5 + .5 * Math.sin(x * .07 + Math.sin(z * .05) * 2.1) * Math.cos(z * .06 - x * .02);
    if (rnd() > .35 + patch * .65) continue;
    const h = 11 + rnd() * 10;
    if (ok(x, z, h)) out.push({ x, z, h, rot: rnd() * 6.28, lean: (rnd() - .5) * .1, w: .8 + rnd() * .55 });
  }
  return out;
}

/** Junta as malhas do GLB (já com a matriz de cada nó) numa geometria só, base no chão e altura 1. */
function bakeUnitTree(THREE, scene) {
  scene.updateMatrixWorld(true); let geo = null, material = null;
  scene.traverse(o => { if (!geo && o.isMesh) { geo = o.geometry.clone(); geo.applyMatrix4(o.matrixWorld); material = o.material; } });
  if (!geo) return null;
  geo.computeBoundingBox(); const b = geo.boundingBox, h = Math.max(.01, b.max.y - b.min.y);
  geo.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2); geo.scale(1 / h, 1 / h, 1 / h); geo.computeBoundingSphere();
  return { geo, material, width: Math.max(b.max.x - b.min.x, b.max.z - b.min.z) / h };
}

/** Árvore distante: copa irregular de 3 volumes (sem bola única) que cobre o tronco escuro e fino — evita a
    "parede de troncos claros" que o tronco cilíndrico largo criava atrás das copas (revisão 19:42). */
function farTreeGeometry(THREE) {
  const parts = [[.36, .62, 0, 0, .34], [.26, .74, .2, .08, .28], [.24, .7, -.18, -.1, .26]].map(([r, y, x, z, sy], i) => { const g = new THREE.IcosahedronGeometry(1, 1).toNonIndexed(); g.scale(r * 1.25, sy, r * 1.1); g.rotateY(i * 1.3); g.translate(x, y, z); return g; });
  const trunk = new THREE.CylinderGeometry(.022, .04, .42, 5).toNonIndexed(); trunk.translate(0, .21, 0);
  const pos = [], col = [];
  for (const [g, c] of [...parts.map((g, i) => [g, [[.13, .24, .1], [.16, .27, .11], [.11, .21, .09]][i]]), [trunk, [.12, .09, .06]]]) {
    const p = g.attributes.position; for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); const k = .75 + .4 * Math.max(0, p.getY(i) - .45); col.push(c[0] * k, c[1] * k, c[2] * k); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
}

/** Renderiza a árvore de frente e de lado lado a lado numa textura RGBA (fundo transparente). */
export function renderImpostor(THREE, renderer, geo, material, size = 256) {
  const rt = new THREE.WebGLRenderTarget(size * 2, size, { depthBuffer: true }); // dados lineares (o render target não converte para sRGB)
  const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight(0xffffff, 0x556644, 3.2)); const sun = new THREE.DirectionalLight(0xfff2d8, 2.2); sun.position.set(.4, 1, .6); sc.add(sun);
  const mesh = new THREE.Mesh(geo, material); sc.add(mesh);
  geo.computeBoundingBox(); const b = geo.boundingBox, half = Math.max(b.max.x - b.min.x, b.max.z - b.min.z, b.max.y - b.min.y) / 2;
  const cam = new THREE.OrthographicCamera(-half, half, b.max.y - (b.max.y - b.min.y) / 2 + half, b.min.y + (b.max.y - b.min.y) / 2 - half, .01, 10);
  const prevRT = renderer.getRenderTarget(), prevClear = renderer.getClearColor(new THREE.Color()), prevAlpha = renderer.getClearAlpha(), prevVp = new THREE.Vector4(); renderer.getViewport(prevVp);
  const prevAuto = renderer.autoClear; renderer.autoClear = false; renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear();
  const cy = (b.max.y + b.min.y) / 2;
  for (const [i, dir] of [[0, [0, 0, 3]], [1, [3, 0, 0]]]) { cam.position.set(dir[0], cy, dir[2]); cam.lookAt(0, cy, 0); cam.top = half; cam.bottom = -half; cam.position.y = cy; cam.updateProjectionMatrix(); rt.viewport.set(i * size, 0, size, size); rt.scissor.set(i * size, 0, size, size); rt.scissorTest = true; renderer.setRenderTarget(rt); renderer.render(sc, cam); } // setRenderTarget de novo: o viewport do alvo só vale quando ele é ativado
  rt.scissorTest = false;
  if (typeof window !== 'undefined' && window.SevenSinsDebug3D) { const px = new Uint8Array(size * 2 * size * 4); renderer.readRenderTargetPixels(rt, 0, 0, size * 2, size, px); let opaque = 0; for (let i = 3; i < px.length; i += 4) if (px[i] > 115) opaque++; window.SevenSinsImpostorDump = { w: size * 2, h: size, opaqueRatio: +(opaque / (size * 2 * size)).toFixed(3), sample: Array.from(px.slice(0, 16)) }; window.SevenSinsImpostorPixels = px; }
  renderer.setRenderTarget(prevRT); renderer.setClearColor(prevClear, prevAlpha); renderer.autoClear = prevAuto; renderer.setViewport(prevVp);
  rt.texture.userData.centerY = cy; rt.texture.userData.half = half; return rt.texture;
}
/** Dois planos cruzados (frente/lado) com UVs nas duas metades da textura; base no chão, altura 1. */
export function impostorGeometry(THREE, width = 1) {
  const w = .5 * Math.max(1, width), pos = [], uv = [], idx = [];
  // A textura é quadrada por vista e centrada no meio da árvore (altura 1): cobre y ∈ [0.5−w, 0.5+w].
  const y0 = .5 - w, y1 = .5 + w;
  [[1, 0, 0], [0, 0, 1]].forEach(([ax, , az], k) => { const b = pos.length / 3, u0 = k * .5, u1 = u0 + .5;
    pos.push(-ax * w, y0, -az * w, ax * w, y0, az * w, ax * w, y1, az * w, -ax * w, y1, -az * w); uv.push(u0, 0, u1, 0, u1, 1, u0, 1); idx.push(b, b + 1, b + 2, b, b + 2, b + 3); });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const n = g.attributes.normal; for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0); g.computeBoundingSphere(); return g;
}

export function mountMatureForest(THREE, GLTFLoader, o) {
  const { scene, groundHeightAt, registerCull, obstacles = [], lowSpec = false } = o, plan = planMatureForest(o), group = new THREE.Group();
  group.name = 'eldoria-mature-forest-mod291'; scene.add(group);
  for (const t of plan) obstacles.push({ x: t.x, z: t.z, height: t.h, radius: .045 * t.h + .25 });
  const tints = plan.map((t, i) => { const v = Math.sin(i * 12.9898 + t.x * .37) * 43758.5453, r = v - Math.floor(v); return new THREE.Color().setRGB(.82 + r * .3, .88 + ((r * 7) % 1) * .26, .74 + ((r * 13) % 1) * .2); });
  const d = new THREE.Object3D(), place = (m, sx = 1) => { plan.forEach((t, i) => { d.position.set(t.x, groundHeightAt(t.x, t.z) - .25, t.z); d.rotation.set(t.lean, t.rot, t.lean * .6); d.scale.set(t.h * sx * (t.w || 1), t.h, t.h * sx * (t.w || 1) * (.9 + ((i * 7) % 5) * .05)); d.updateMatrix(); m.setMatrixAt(i, d.matrix); }); m.count = plan.length; plan.forEach((t, i) => m.setColorAt(i, tints[i])); m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; m.computeBoundingSphere(); };
  const far = new THREE.InstancedMesh(farTreeGeometry(THREE), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95 }), Math.max(1, plan.length));
  place(far, 1.25); far.name = 'mature-forest-far'; group.add(far);
  // A copa distante só começa no fim do LOD médio (PR #416): nunca dois modelos da mesma árvore no mesmo quadro.
  // O registro do corte acontece uma vez só, depois de decidir entre impostor autoral e copa simples.
  const nearLimit = lowSpec ? 15 : 24;
  const midLimit = lowSpec ? 38 : 58;
  const registerFar = () => { if (registerCull) registerCull(far, lowSpec ? 115 : 150, 0, midLimit); };
  // LOD1 é opcional: se não carregar (ou vier sem UV), a malha completa do criador serve aos dois níveis.
  const loader = new GLTFLoader(), build = (full, lod) => {
    const tex = bakeUnitTree(THREE, full.scene); if (!tex) { registerFar(); return null; }
    let geo = lod ? bakeUnitTree(THREE, lod.scene) : null; if (!geo || !geo.geo.attributes.uv) { if (lod) console.warn('ArvoreFloresta01-lod1.glb sem UV; usando a malha completa no nível médio.'); geo = tex; }
    // Copa menos "buraco negro": emissão fraca com a própria textura (meio-tom sob o dossel, sem estourar a luz).
    const mat = tex.material.clone(); if (mat.map) { mat.emissiveMap = mat.map; mat.emissive = new THREE.Color(0x3a4a2a); mat.emissiveIntensity = .55; } mat.metalness = 0;
    mat.roughness = Math.max(.92, mat.roughness ?? 1); // casca sem brilho especular de plástico
    // Dois níveis: malha completa do criador perto (sem facetas grandes no tronco) e LOD1 na faixa média.
    const near = new THREE.InstancedMesh(tex.geo, mat, Math.max(1, plan.length)); place(near, 1);
    near.castShadow = !lowSpec; near.receiveShadow = !lowSpec; near.name = 'mature-forest-near'; group.add(near);
    const mid = new THREE.InstancedMesh(geo.geo, mat, Math.max(1, plan.length)); place(mid, 1);
    mid.castShadow = false; mid.receiveShadow = !lowSpec; mid.name = 'mature-forest-mid'; group.add(mid);
    if (registerCull) { registerCull(near, nearLimit, nearLimit); registerCull(mid, midLimit, 0, nearLimit); }
    // Impostor autoral: a própria ArvoreFloresta01 renderizada uma vez (duas vistas) numa textura com alfa,
    // aplicada em dois planos cruzados por árvore — substitui a copa procedural na faixa distante (revisão 19:59).
    let impostor = false;
    if (o.renderer) try {
      const tex2 = renderImpostor(THREE, o.renderer, tex.geo, mat, lowSpec ? 192 : 256);
      const imat = new THREE.MeshLambertMaterial({ map: tex2, alphaTest: .45, side: THREE.DoubleSide, transparent: false });
      const igeo = impostorGeometry(THREE, tex.width);
      far.geometry.dispose(); far.geometry = igeo; far.material.dispose(); far.material = imat; place(far, 1); impostor = true;
    } catch (e) { console.warn('Impostor da mata não gerado; mantendo a copa simples.', e); }
    registerFar();
    return { near: plan.length, impostor, lodFallback: geo === tex, triangles: (geo.geo.index ? geo.geo.index.count : geo.geo.attributes.position.count) / 3 };
  };
  const ready = new Promise(res => loader.load('./ArvoreFloresta01.glb', full => loader.load('./ArvoreFloresta01-lod1.glb', lod => res(build(full, lod)),
    undefined, err => { console.warn('ArvoreFloresta01-lod1.glb não carregou; usando a malha completa.', err); res(build(full, null)); }),
    undefined, err => { console.warn('ArvoreFloresta01.glb não carregou; mata só com copas distantes.', err); registerFar(); res(null); }));
  // Manchas de sol filtradas pela copa: discos aditivos quentes no chão, entre os troncos (1 draw call).
  const dapples = []; { let k = 0; for (const t of plan) for (let j = 0; j < 2; j++) { const a = (k++ * 2.399) % 6.28, r = 2.5 + ((k * 3.7) % 4); dapples.push({ x: t.x + Math.cos(a) * r, z: t.z + Math.sin(a) * r, s: .9 + ((k * 1.3) % 1.6) }); } }
  const dg = new THREE.CircleGeometry(1, 14); dg.rotateX(-Math.PI / 2);
  const dm = new THREE.MeshBasicMaterial({ color: 0xffe2a0, transparent: true, opacity: .16, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const dap = new THREE.InstancedMesh(dg, dm, Math.max(1, dapples.length)); dapples.forEach((p, i) => { d.position.set(p.x, groundHeightAt(p.x, p.z) + .05, p.z); d.rotation.set(0, i, 0); d.scale.set(p.s * 1.6, 1, p.s); d.updateMatrix(); dap.setMatrixAt(i, d.matrix); });
  dap.count = dapples.length; dap.instanceMatrix.needsUpdate = true; dap.renderOrder = 1; dap.name = 'mature-forest-sun-dapples'; group.add(dap);
  if (registerCull) registerCull(dap, lowSpec ? 34 : 46, 10);
  group.userData.dapples = dm;
  return { group, plan, ready, dapples: dm };
}
