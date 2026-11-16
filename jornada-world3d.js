import { inJourney, inAbyss, journeyHeight, volcanoHeight, journeyBoundary, polyProject, fbm2, ROUTE, RIVER2, BRIDGE, ABYSS, CITY2, VOLCANO2, GATE2, WATERFALL, CITY_PROPS, cinzariaLayout, riverDepth, JOURNEY_BOUNDS } from './jornada3d.js';
/**
 * Mod 321 — o MUNDO VISÍVEL da jornada (o relevo e as regras vêm de jornada3d.js; a física usa a mesma função).
 *  • Terreno em BLOCOS com LOD e streaming: blocos finos de 64 m (célula 2 m, saia contra frestas) perto do herói e
 *    blocos grossos de 256 m (célula 8 m) até ~560 m, construídos aos poucos (≤ 1 fino + 1 grosso por quadro) e
 *    descartados ao se afastar. O bloco grosso esconde só as células cobertas por blocos finos ativos (sem sobreposição).
 *  • Capim alto com vento no shader, flores e árvores em InstancedMesh ÚNICOS repovoados por bloco (poucas chamadas).
 *  • Rio raso com cachoeira na serra norte; ponte do abismo (tábuas, cordas, postes, âncoras de pedra); névoa profunda
 *    no abismo (dois planos, sem sprites); vulcão em cone com cratera (malha própria, visível de muito longe com bruma);
 *    fumaça limitada; aurora azul-violeta só à noite; Cinzária modular (pedra vulcânica + reboco + madeira + telhas).
 *  • Sólidos simples: casas (retângulo girado), fonte, bancas, torre, postes, árvores e rochas grandes (círculos).
 */
const smooth = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
const NEAR = 64, FAR = 256, NEAR_CELL = 2, FAR_CELL = 8, NEAR_R = 110, FAR_R = 560, X0 = JOURNEY_BOUNDS.x1 - 6, Z0 = JOURNEY_BOUNDS.z0; // X0 = -118 alinhado à malha antiga
function hash(a, b, s = 1) { let h = (a * 374761393 + b * 668265263 + s * 974711) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }

export function createJourneyWorld(T, scene, opts = {}) {
  const height = opts.height || ((x, z) => journeyHeight(x, z) ?? 0), low = !!opts.lowSpec, root = new T.Group(); root.name = 'jornada-mod321'; scene.add(root);
  const C = new T.Color(), tmpM = new T.Matrix4(), tmpQ = new T.Quaternion(), tmpS = new T.Vector3(), tmpP = new T.Vector3(), up = new T.Vector3(0, 1, 0);
  const windU = { value: 0 }, nightU = { value: 0 };
  /* ---------------- cor do chão por bioma ---------------- */
  const GRASS = [.36, .45, .17], GRASS2 = [.52, .55, .22], DRY = [.62, .54, .32], DIRT = [.47, .38, .26], ROCK = [.42, .39, .36], ASH = [.33, .31, .30], BASALT = [.18, .16, .16], PAVE = [.55, .51, .46], SAND = [.6, .55, .45];
  const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  function groundColor(x, z, h, ny) {
    const ash = smooth(-930, -1010, x), n = fbm2(x * .05, z * .05, 3, 61), q = polyProject(x, z, ROUTE, ROUTE_CUM);
    let c = mix3(GRASS, GRASS2, n); c = mix3(c, DRY, smooth(.55, .8, fbm2(x * .012, z * .012, 2, 7)) * .6);
    c = mix3(c, mix3(ASH, BASALT, smooth(.4, .8, n)), ash);
    c = mix3(c, ash > .5 ? BASALT : ROCK, smooth(.86, .7, ny)); // encostas íngremes viram rocha
    if (inAbyss(x, z) || inAbyss(x - 5, z) || inAbyss(x + 5, z)) c = mix3([.2, .18, .18], [.07, .07, .09], smooth(40, -120, h)); // paredes do abismo: basalto escuro
    else if (inAbyss(x - 14, z) || inAbyss(x + 14, z)) c = mix3(c, ROCK, .75);
    const road = smooth(3.4, 1.6, q.d); c = mix3(c, ash > .5 ? [.36, .33, .3] : DIRT, road * .85);
    const cd = Math.hypot(x - CITY2.x, z - CITY2.z); if (cd < CITY2.r - 2) c = mix3(c, PAVE, smooth(CITY2.r - 2, CITY2.r - 9, cd) * (.75 + .25 * n));
    if (riverDepth(x, z) > .05) c = mix3(c, SAND, .6);
    return c;
  }
  /* ---------------- blocos de terreno ---------------- */
  const detail = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d'); g.fillStyle = '#e8e8e8'; g.fillRect(0, 0, 128, 128); for (let i = 0; i < 900; i++) { const v = 190 + Math.random() * 65 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 3, 1 + Math.random() * 3); } const t = new T.CanvasTexture(cv); t.wrapS = t.wrapT = T.RepeatWrapping; t.colorSpace = T.SRGBColorSpace; return t; })();
  const terrainMat = new T.MeshStandardMaterial({ color: 0xffffff, map: detail, vertexColors: true, roughness: 1, metalness: 0 });
  const renderH = (x, z) => height(x, z) - volcanoHeight(x, z); // o cone tem malha própria (visível de longe)
  function tileGeometry(x0, z0, S, cell, skirt) {
    const n = Math.round(S / cell) + 1, verts = n * n, sk = skirt ? 4 * n : 0, pos = new Float32Array((verts + sk) * 3), col = new Float32Array((verts + sk) * 3), uv = new Float32Array((verts + sk) * 2);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const k = j * n + i, x = x0 + i * cell, z = z0 + j * cell; pos[k * 3] = x; pos[k * 3 + 1] = renderH(x, z); pos[k * 3 + 2] = z; uv[k * 2] = x * .12; uv[k * 2 + 1] = z * .12; }
    const idx = [];
    for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) { const a = j * n + i, b = a + 1, c = a + n, d = c + 1; if ((i + j) & 1) idx.push(a, c, b, b, c, d); else idx.push(a, c, d, a, d, b); }
    if (skirt) { // saia vertical nas 4 bordas: esconde frestas entre blocos finos e grossos
      const edges = [[...Array(n).keys()].map(i => i), [...Array(n).keys()].map(i => (n - 1) * n + i), [...Array(n).keys()].map(j => j * n), [...Array(n).keys()].map(j => j * n + n - 1)]; let s = verts;
      for (const e of edges) { const start = s; for (const k of e) { pos[s * 3] = pos[k * 3]; pos[s * 3 + 1] = pos[k * 3 + 1] - 3.5; pos[s * 3 + 2] = pos[k * 3 + 2]; uv[s * 2] = uv[k * 2]; uv[s * 2 + 1] = uv[k * 2 + 1]; s++; }
        for (let m = 0; m < e.length - 1; m++) { const a = e[m], b = e[m + 1], c = start + m, d = start + m + 1; idx.push(a, c, b, b, c, d, a, b, c, b, d, c); } }
    }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('uv', new T.BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const nr = g.attributes.normal.array; for (let k = 0; k < verts + sk; k++) { const src = k < verts ? k : -1; const x = pos[k * 3], z = pos[k * 3 + 2], c = groundColor(x, z, pos[k * 3 + 1], src >= 0 ? nr[k * 3 + 1] : .6); col[k * 3] = c[0]; col[k * 3 + 1] = c[1]; col[k * 3 + 2] = c[2]; }
    g.setAttribute('color', new T.BufferAttribute(col, 3)); g.computeBoundingSphere(); g.userData = { n, full: g.index.array.slice(0, (n - 1) * (n - 1) * 6) };
    return g;
  }
  const tileOverlaps = (x0, z0, S) => { for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) if (inJourney(x0 + S * i / 4, z0 + S * j / 4)) return true; return false; };
  const near = new Map(), far = new Map(), queue = { near: [], far: [] };
  const keyOf = (i, j) => i + ',' + j;
  const nearOrigin = (i, j) => [X0 - (i + 1) * NEAR, Z0 + j * NEAR], farOrigin = (i, j) => [X0 - (i + 1) * FAR, Z0 + j * FAR];
  function maskFar(t) { // células grossas cobertas por blocos finos ativos saem do desenho
    const g = t.mesh.geometry, n = g.userData.n, [x0, z0] = farOrigin(t.i, t.j), full = g.userData.full, keep = [];
    for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) { const cx = x0 + (i + .5) * FAR_CELL, cz = z0 + (j + .5) * FAR_CELL, ni = Math.floor((X0 - cx) / NEAR), nj = Math.floor((cz - Z0) / NEAR), nt = near.get(keyOf(ni, nj)); if (nt && nt.mesh.visible) continue; const o = (j * (n - 1) + i) * 6; for (let k = 0; k < 6; k++) keep.push(full[o + k]); }
    g.setIndex(keep); t.masked = true;
  }
  function wanted(px, pz) {
    const wn = new Set(), wf = new Set();
    const ni0 = Math.floor((X0 - px) / NEAR), nj0 = Math.floor((pz - Z0) / NEAR), rN = Math.ceil(NEAR_R / NEAR);
    for (let i = ni0 - rN; i <= ni0 + rN; i++) for (let j = nj0 - rN; j <= nj0 + rN; j++) { if (i < 0 || j < 0) continue; const [x0, z0] = nearOrigin(i, j); if (Math.hypot(x0 + NEAR / 2 - px, z0 + NEAR / 2 - pz) > NEAR_R + NEAR * .7 || !tileOverlaps(x0, z0, NEAR)) continue; wn.add(keyOf(i, j)); }
    const fi0 = Math.floor((X0 - px) / FAR), fj0 = Math.floor((pz - Z0) / FAR), rF = Math.ceil(FAR_R / FAR);
    for (let i = fi0 - rF; i <= fi0 + rF; i++) for (let j = fj0 - rF; j <= fj0 + rF; j++) { if (i < 0 || j < 0) continue; const [x0, z0] = farOrigin(i, j); if (Math.hypot(x0 + FAR / 2 - px, z0 + FAR / 2 - pz) > FAR_R + FAR * .7 || !tileOverlaps(x0, z0, FAR)) continue; wf.add(keyOf(i, j)); }
    return { wn, wf };
  }
  let lastKey = '', nearDirty = false, vegDirty = true, built = 0;
  function streamTiles(px, pz, budget = 1, force = false) {
    const ck = Math.floor(px / 16) + ':' + Math.floor(pz / 16);
    if (ck !== lastKey || force) { lastKey = ck; const { wn, wf } = wanted(px, pz);
      for (const [k, t] of near) if (!wn.has(k)) { root.remove(t.mesh); t.mesh.geometry.dispose(); near.delete(k); nearDirty = true; vegDirty = true; }
      for (const [k, t] of far) if (!wf.has(k)) { root.remove(t.mesh); t.mesh.geometry.dispose(); far.delete(k); vegDirty = true; }
      queue.near = [...wn].filter(k => !near.has(k)).sort((a, b) => dist(a, NEAR, nearOrigin) - dist(b, NEAR, nearOrigin));
      queue.far = [...wf].filter(k => !far.has(k)).sort((a, b) => dist(a, FAR, farOrigin) - dist(b, FAR, farOrigin));
      function dist(k, S, o) { const [i, j] = k.split(',').map(Number), [x0, z0] = o(i, j); return Math.hypot(x0 + S / 2 - px, z0 + S / 2 - pz); }
    }
    for (let b = 0; b < budget && queue.far.length; b++) { const k = queue.far.shift(); const [i, j] = k.split(',').map(Number), [x0, z0] = farOrigin(i, j), m = new T.Mesh(tileGeometry(x0, z0, FAR, FAR_CELL, false), terrainMat); m.receiveShadow = true; m.name = 'jornada-far-' + k; root.add(m); far.set(k, { i, j, mesh: m }); nearDirty = true; vegDirty = true; built++; }
    for (let b = 0; b < budget && queue.near.length; b++) { const k = queue.near.shift(); const [i, j] = k.split(',').map(Number), [x0, z0] = nearOrigin(i, j), m = new T.Mesh(tileGeometry(x0, z0, NEAR, NEAR_CELL, true), terrainMat); m.receiveShadow = true; m.name = 'jornada-near-' + k; root.add(m); near.set(k, { i, j, mesh: m }); nearDirty = true; vegDirty = true; built++; }
    if (nearDirty) { nearDirty = false; for (const t of far.values()) maskFar(t); }
  }
  const ROUTE_CUM = (() => { const c = [0]; for (let i = 1; i < ROUTE.length; i++) c.push(c[i - 1] + Math.hypot(ROUTE[i][0] - ROUTE[i - 1][0], ROUTE[i][1] - ROUTE[i - 1][1])); return c; })();

  /* horizonte: malha grossa (célula 24 m) da jornada inteira, desenhada só além de ~480 m da câmera (os blocos cobrem o perto) */
  const horizonFog = { value: new T.Color(0xa6bfc4) }, horizonCam = { value: new T.Vector3() };
  { const B = JOURNEY_BOUNDS, cell = 24, nx = Math.ceil((B.x1 - B.x0) / cell) + 1, nz = Math.ceil((B.z1 - B.z0) / cell) + 1, pos = [], col = [], idx = [];
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const x = B.x0 + i * cell, z = B.z0 + j * cell, h = (inJourney(x, z) ? renderH(x, z) : 0) - 2.5, c = groundColor(x, z, h, .8); pos.push(x, h, z); col.push(c[0], c[1], c[2]); }
    for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1; if (inJourney(B.x0 + (i + .5) * cell, B.z0 + (j + .5) * cell)) idx.push(a, c, b, b, c, d); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new T.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new T.MeshLambertMaterial({ vertexColors: true }); m.onBeforeCompile = sh => { sh.uniforms.uCamXZ = horizonCam; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vHW;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvHW=(modelMatrix*vec4(transformed,1.)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uCamXZ;varying vec3 vHW;').replace('void main() {', 'void main() {\nif(distance(vHW.xz,uCamXZ.xz)<480.)discard;'); };
    const hz = new T.Mesh(g, m); hz.name = 'jornada-horizonte'; hz.frustumCulled = false; hz.renderOrder = -2; root.add(hz); }
  /* ---------------- vegetação e rochas (instâncias globais repovoadas por bloco) ---------------- */
  const grassGeo = (() => { const g = new T.BufferGeometry(), p = [], u = []; for (let k = 0; k < 3; k++) { const a = k * Math.PI / 3, cx = Math.cos(a) * .5, sz = Math.sin(a) * .5; p.push(-cx, 0, -sz, cx, 0, sz, cx, 1, sz, -cx, 0, -sz, cx, 1, sz, -cx, 1, -sz); u.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1); } g.setAttribute('position', new T.Float32BufferAttribute(p, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(u, 2)); g.computeVertexNormals(); return g; })();
  const bladeTex = (() => { const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64; const g = cv.getContext('2d'); for (let i = 0; i < 14; i++) { const x = 4 + Math.random() * 56, w = 2 + Math.random() * 2, h = 30 + Math.random() * 32, lean = (Math.random() - .5) * 18; g.fillStyle = `rgba(${200 + Math.random() * 55 | 0},${210 + Math.random() * 45 | 0},${140 + Math.random() * 60 | 0},1)`; g.beginPath(); g.moveTo(x - w, 64); g.quadraticCurveTo(x + lean * .4, 64 - h * .6, x + lean, 64 - h); g.quadraticCurveTo(x + lean * .4 + 1, 64 - h * .6, x + w, 64); g.fill(); } const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace; return t; })();
  const windShader = sh => { sh.uniforms.uWind = windU; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uWind;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvec4 wp=instanceMatrix*vec4(0.,0.,0.,1.);float sw=sin(uWind*1.6+wp.x*.17+wp.z*.13)*.5+sin(uWind*2.7+wp.x*.41)*.25;transformed.x+=sw*.22*uv.y*uv.y;transformed.z+=sw*.12*uv.y*uv.y;'); };
  const grassMat = new T.MeshLambertMaterial({ map: bladeTex, alphaTest: .4, side: T.DoubleSide, color: 0xd8d690 }); grassMat.onBeforeCompile = windShader;
  const GRASS_MAX = low ? 6000 : 15000, grass = new T.InstancedMesh(grassGeo, grassMat, GRASS_MAX); grass.count = 0; grass.frustumCulled = false; grass.name = 'jornada-capim'; root.add(grass);
  const flowerGeo = (() => { const g = new T.PlaneGeometry(.22, .22); g.translate(0, .55, 0); return g; })();
  const flowerTex = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 32; const g = cv.getContext('2d'); g.fillStyle = '#fff'; for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; g.beginPath(); g.ellipse(16 + Math.cos(a) * 7, 16 + Math.sin(a) * 7, 6, 4, a, 0, Math.PI * 2); g.fill(); } g.fillStyle = '#f2c94a'; g.beginPath(); g.arc(16, 16, 4, 0, Math.PI * 2); g.fill(); const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace; return t; })();
  const flowerMat = new T.MeshLambertMaterial({ map: flowerTex, alphaTest: .5, side: T.DoubleSide }); flowerMat.onBeforeCompile = windShader;
  const FLOWER_MAX = low ? 900 : 2200, flowers = new T.InstancedMesh(flowerGeo, flowerMat, FLOWER_MAX); flowers.count = 0; flowers.frustumCulled = false; flowers.name = 'jornada-flores'; root.add(flowers);
  const FLOWER_COLORS = [0xf3e9f7, 0xe8b9e4, 0xb9a6ec, 0xfff1a8, 0xf6c6cf, 0xffffff];
  const trunkGeo = new T.CylinderGeometry(.18, .32, 1, 6); trunkGeo.translate(0, .5, 0);
  const crownGeo = new T.IcosahedronGeometry(1, 1);
  const trunkMat = new T.MeshStandardMaterial({ color: 0x4a3828, roughness: 1 }), crownMat = new T.MeshStandardMaterial({ color: 0x4e6a2c, roughness: .95, flatShading: true });
  const TREE_MAX = 900, trunks = new T.InstancedMesh(trunkGeo, trunkMat, TREE_MAX), crowns = new T.InstancedMesh(crownGeo, crownMat, TREE_MAX * 2); trunks.count = crowns.count = 0; trunks.castShadow = crowns.castShadow = !low; trunks.frustumCulled = crowns.frustumCulled = false; trunks.name = 'jornada-arvores'; root.add(trunks, crowns);
  const rockGeo = new T.DodecahedronGeometry(1, 0), rockMat = new T.MeshStandardMaterial({ color: 0x8a8378, roughness: .95, flatShading: true });
  const ROCK_MAX = 700, rocks = new T.InstancedMesh(rockGeo, rockMat, ROCK_MAX); rocks.count = 0; rocks.frustumCulled = false; rocks.castShadow = !low; rocks.name = 'jornada-rochas'; root.add(rocks);
  const solids = new Map(); // grade 16 m → círculos sólidos {x,z,r}
  const cellKey = (x, z) => Math.floor(x / 16) + ':' + Math.floor(z / 16);
  let cityGone = false;
  function addSolid(o) { const k = cellKey(o.x, o.z); let a = solids.get(k); if (!a) solids.set(k, a = []); a.push(o); }
  function solidAt(x, z) { for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const a = solids.get((Math.floor(x / 16) + i) + ':' + (Math.floor(z / 16) + j)); if (a) for (const o of a) { if (o.city && cityGone) continue; if (o.box) { const dx = x - o.x, dz = z - o.z, c = Math.cos(o.ry), s = Math.sin(o.ry), lx = dx * c - dz * s, lz = dx * s + dz * c; /* inverso da rotação Y do objeto */ if (Math.abs(lx) < o.hx && Math.abs(lz) < o.hz) return o; } else if ((x - o.x) ** 2 + (z - o.z) ** 2 < o.r * o.r) return o; } } return null; }
  const onRoad = (x, z, w) => polyProject(x, z, ROUTE, ROUTE_CUM).d < w;
  // árvores e rochas: determinísticas por bloco grosso (as mesmas sempre), sólidas
  const treeSpots = [], rockSpots = [];
  for (let i = 0; i < 7; i++) for (let j = 0; j < 3; j++) { // bosques naturais no vale (agrupados, nunca em grade)
    const gx = -170 - i * 64 - hash(i, j, 3) * 30, gz = -150 + j * 72 + hash(i, j, 5) * 40;
    for (let k = 0; k < 7; k++) { const x = gx + (hash(i * 9 + k, j, 7) - .5) * 26, z = gz + (hash(i, j * 9 + k, 8) - .5) * 26; if (!inJourney(x, z) || onRoad(x, z, 7) || riverDepth(x, z) > 0 || journeyBoundary(x, z) > -2 || (hash(i, k, 11) < .25)) continue; const s = .8 + hash(k, i, 12) * .7; treeSpots.push({ x, z, s }); addSolid({ x, z, r: .45 * s + .2 }); }
  }
  for (let k = 0; k < 160; k++) { const x = -940 - hash(k, 1, 21) * 270, z = -150 + hash(k, 2, 22) * 180; if (!inJourney(x, z) || onRoad(x, z, 5) || Math.hypot(x - CITY2.x, z - CITY2.z) < CITY2.r + 8 || journeyBoundary(x, z) > 4) continue; const s = .5 + hash(k, 3, 23) ** 2 * 2.6; rockSpots.push({ x, z, s, dark: 1 }); if (s > 1.1) addSolid({ x, z, r: s * .8 }); }
  for (let k = 0; k < 70; k++) { const x = -150 - hash(k, 4, 24) * 460, z = -160 + hash(k, 5, 25) * 210; if (!inJourney(x, z) || onRoad(x, z, 5) || riverDepth(x, z) > 0 || journeyBoundary(x, z) > 2) continue; const s = .4 + hash(k, 6, 26) ** 2 * 1.6; rockSpots.push({ x, z, s, dark: 0 }); if (s > 1.1) addSolid({ x, z, r: s * .8 }); }
  function fillInstances(px, pz) {
    let g = 0, f = 0; const mx = new T.Object3D();
    for (const [k, t] of near) { const [x0, z0] = nearOrigin(t.i, t.j); if (Math.hypot(x0 + 32 - px, z0 + 32 - pz) > 110) continue;
      const per = low ? 420 : 1000; for (let n = 0; n < per && g < GRASS_MAX; n++) { const x = x0 + hash(t.i * 977 + n, t.j, 31) * NEAR, z = z0 + hash(t.i, t.j * 977 + n, 32) * NEAR; if (x < -935 || !inJourney(x, z) || onRoad(x, z, 2.2) || riverDepth(x, z) > .1 || Math.hypot(x - CITY2.x, z - CITY2.z) < CITY2.r) continue; const h = height(x, z); if (h < -5 || journeyBoundary(x, z) > 10) continue;
        const s = .55 + hash(n, t.i, 33) * .65; mx.position.set(x, h - .05, z); mx.rotation.set(0, hash(n, t.j, 34) * 6.28, 0); mx.scale.set(s * 1.1, s * (1.1 + hash(n, 1, 35) * .6), s * 1.1); mx.updateMatrix(); grass.setMatrixAt(g, mx.matrix); C.setHSL(.14 + hash(n, 2, 36) * .08, .5, .62 + hash(n, 3, 37) * .14); grass.setColorAt(g, C); g++; }
      const pf = low ? 40 : 90; for (let n = 0; n < pf && f < FLOWER_MAX; n++) { const cl = hash(t.i, n >> 3, 41), x = x0 + ((hash(t.i * 31 + (n >> 3), t.j, 42) + (hash(n, t.i, 43) - .5) * .12) * NEAR), z = z0 + ((hash(t.i, t.j * 31 + (n >> 3), 44) + (hash(n, t.j, 45) - .5) * .12) * NEAR); // tufos agrupados
        if (cl > .7 || x < -935 || !inJourney(x, z) || onRoad(x, z, 2.4) || riverDepth(x, z) > 0 || Math.hypot(x - CITY2.x, z - CITY2.z) < CITY2.r || journeyBoundary(x, z) > 4) continue;
        mx.position.set(x, height(x, z) - .02, z); mx.rotation.set(0, hash(n, 4, 46) * 6.28, 0); mx.scale.setScalar(.8 + hash(n, 5, 47) * .6); mx.updateMatrix(); flowers.setMatrixAt(f, mx.matrix); C.setHex(FLOWER_COLORS[(hash(t.i + (n >> 3), t.j, 48) * FLOWER_COLORS.length) | 0]); flowers.setColorAt(f, C); f++; } }
    grass.count = g; flowers.count = f; grass.instanceMatrix.needsUpdate = flowers.instanceMatrix.needsUpdate = true; if (grass.instanceColor) grass.instanceColor.needsUpdate = true; if (flowers.instanceColor) flowers.instanceColor.needsUpdate = true;
    let tr = 0, cr = 0; for (const s of treeSpots) { if (Math.hypot(s.x - px, s.z - pz) > 330 || tr >= TREE_MAX) continue; const h = height(s.x, s.z), th = 3.4 * s.s;
      mx.position.set(s.x, h - .1, s.z); mx.rotation.set(0, 0, 0); mx.scale.set(s.s, th, s.s); mx.updateMatrix(); trunks.setMatrixAt(tr++, mx.matrix);
      for (const [oy, sc, ox] of [[th + 1.2 * s.s, 2.2 * s.s, 0], [th + 2.4 * s.s, 1.5 * s.s, .4 * s.s]]) { mx.position.set(s.x + ox, h + oy, s.z); mx.scale.set(sc, sc * .8, sc); mx.updateMatrix(); crowns.setMatrixAt(cr, mx.matrix); C.setHSL(.24 + hash(cr, 1, 51) * .06, .42, .3 + hash(cr, 2, 52) * .08); crowns.setColorAt(cr, C); cr++; } }
    trunks.count = tr; crowns.count = cr; trunks.instanceMatrix.needsUpdate = crowns.instanceMatrix.needsUpdate = true; if (crowns.instanceColor) crowns.instanceColor.needsUpdate = true;
    let rk = 0; for (const s of rockSpots) { if (Math.hypot(s.x - px, s.z - pz) > 300 || rk >= ROCK_MAX) continue; mx.position.set(s.x, height(s.x, s.z) + s.s * .25, s.z); mx.rotation.set(hash(rk, 1, 61) * 3, hash(rk, 2, 62) * 6, 0); mx.scale.set(s.s * 1.2, s.s * .8, s.s); mx.updateMatrix(); rocks.setMatrixAt(rk, mx.matrix); C.setHex(s.dark ? 0x3a3432 : 0x9a9284); rocks.setColorAt(rk, C); rk++; }
    rocks.count = rk; rocks.instanceMatrix.needsUpdate = true; if (rocks.instanceColor) rocks.instanceColor.needsUpdate = true;
  }

  /* ---------------- rio e cachoeira ---------------- */
  const water = opts.waterMaterial || new T.MeshStandardMaterial({ color: 0x23505c, roughness: .08, metalness: .2, transparent: true, opacity: .85 });
  { const curve = new T.CatmullRomCurve3(RIVER2.map(p => new T.Vector3(p[0], 0, p[1]))), N = 140, pos = [], idx = [];
    for (let i = 0; i <= N; i++) { const c = curve.getPoint(i / N), t = curve.getTangent(i / N), sx = -t.z, sz = t.x, w = 4.6; let y = Infinity; for (const o of [-1.5, 0, 1.5]) y = Math.min(y, height(c.x + sx * o, c.z + sz * o)); y += .55; pos.push(c.x + sx * w, y, c.z + sz * w, c.x - sx * w, y, c.z - sz * w); if (i < N) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); const m = new T.Mesh(g, water); m.renderOrder = 2; m.name = 'jornada-rio'; root.add(m); }
  const fallMat = new T.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uT: { value: 0 } }, vertexShader: 'varying vec2 vU;void main(){vU=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'uniform float uT;varying vec2 vU;float h(vec2 p){return fract(sin(dot(p,vec2(12.9,78.2)))*43758.5);}void main(){float x=vU.x;float s=h(vec2(floor(x*40.),0.));float streak=fract(vU.y*3.+uT*(1.4+s)+s*7.);float edge=smoothstep(0.,.12,x)*smoothstep(1.,.88,x);float a=edge*(.55+.35*step(.35,streak));vec3 c=mix(vec3(.72,.84,.9),vec3(1.),step(.7,streak));gl_FragColor=vec4(c,a*.9);}' });
  { const W = WATERFALL, N = 28, pos = [], uv = [], idx = []; // cascata colada à encosta (segue o relevo, 0,7 m acima)
    for (let i = 0; i <= N; i++) { const z = W.zTop - (W.zTop - W.z - 2) * i / N, y = height(W.x, z) + .7; for (const sx of [-1, 1]) { pos.push(W.x + sx * W.w / 2 * (.7 + .3 * i / N), y, z); uv.push(sx < 0 ? 0 : 1, 1 - i / N); } if (i < N) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); } }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    fallMat.side = T.DoubleSide; const m = new T.Mesh(g, fallMat); m.name = 'jornada-cachoeira'; m.renderOrder = 3; root.add(m);
    const pool = new T.Mesh(new T.CircleGeometry(8, 28).rotateX(-Math.PI / 2), water); pool.position.set(W.x, height(W.x, W.z - 2) + .55, W.z - 2); root.add(pool);
    for (const [ox, oz, sc] of [[-7, 2, 2.4], [7.5, 6, 2], [-6, 20, 2.8], [6.5, 26, 2.2]]) { const r = new T.Mesh(new T.DodecahedronGeometry(sc, 0), rockMat); r.position.set(W.x + ox, height(W.x + ox, W.z + oz) + sc * .3, W.z + oz); root.add(r); } }

  /* ---------------- ponte do abismo ---------------- */
  const wood = new T.MeshStandardMaterial({ color: 0x6b4c32, roughness: .95 }), woodDark = new T.MeshStandardMaterial({ color: 0x3e2c1e, roughness: 1 }), rope = new T.MeshStandardMaterial({ color: 0x8a7656, roughness: 1 }), stone = new T.MeshStandardMaterial({ color: 0x5b5652, roughness: 1, flatShading: true });
  const deckY = x => { const t = (BRIDGE.x0 - x) / (BRIDGE.x0 - BRIDGE.x1); return BRIDGE.y - BRIDGE.sag * Math.sin(Math.PI * Math.max(0, Math.min(1, t))); };
  { const L = BRIDGE.x0 - BRIDGE.x1, planks = Math.round(L / .42), board = new T.InstancedMesh(new T.BoxGeometry(.36, .07, BRIDGE.half * 2 + .3), wood, planks), mx = new T.Object3D();
    for (let i = 0; i < planks; i++) { const x = BRIDGE.x0 - (i + .5) * L / planks; mx.position.set(x, deckY(x) - .04, BRIDGE.z + (hash(i, 1, 71) - .5) * .06); mx.rotation.set(0, (hash(i, 2, 72) - .5) * .05, (hash(i, 3, 73) - .5) * .05); mx.scale.set(1, 1, .96 + hash(i, 4, 74) * .08); mx.updateMatrix(); board.setMatrixAt(i, mx.matrix); }
    board.name = 'jornada-ponte'; board.castShadow = true; board.receiveShadow = true; root.add(board);
    const posts = Math.round(L / 4) + 1, post = new T.InstancedMesh(new T.BoxGeometry(.12, 1.3, .12), woodDark, posts * 2); let pi = 0;
    for (let i = 0; i < posts; i++) { const x = BRIDGE.x0 - i * L / (posts - 1); for (const sz of [-1, 1]) { mx.position.set(x, deckY(x) + .55, BRIDGE.z + sz * (BRIDGE.half + .05)); mx.rotation.set(0, 0, 0); mx.scale.set(1, 1, 1); mx.updateMatrix(); post.setMatrixAt(pi++, mx.matrix); } } root.add(post);
    for (const sz of [-1, 1]) for (const hy of [1.05, .55, -.18]) { const pts = []; for (let i = 0; i <= 48; i++) { const x = BRIDGE.x0 - i * L / 48; pts.push(new T.Vector3(x, deckY(x) + hy, BRIDGE.z + sz * (BRIDGE.half + (hy < 0 ? -.2 : .08)))); } root.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 96, hy < 0 ? .07 : .045, 5, false), rope)); }
    for (const x of [BRIDGE.x0 + 1.4, BRIDGE.x1 - 1.4]) for (const sz of [-1, 1]) { const p = new T.Mesh(new T.CylinderGeometry(.55, .75, 3.2, 7), stone); p.position.set(x, height(x, BRIDGE.z + sz * 2.4) + 1.4, BRIDGE.z + sz * 2.4); p.castShadow = true; root.add(p); addSolid({ x, z: BRIDGE.z + sz * 2.4, r: .8 }); }
  }
  // blocos de rocha nas paredes do abismo: quebram a face lisa e dão massa ao penhasco (1 chamada)
  { const n = low ? 60 : 130, im = new T.InstancedMesh(new T.DodecahedronGeometry(1, 0), new T.MeshStandardMaterial({ color: 0x2e2a2a, roughness: 1, flatShading: true }), n), mx = new T.Object3D(); let k = 0;
    for (let i = 0; i < n * 3 && k < n; i++) { const side = i % 2 ? 1 : -1, z = ABYSS.z0 + 20 + hash(i, 1, 81) * (ABYSS.z1 - ABYSS.z0 - 40); if (Math.abs(z - BRIDGE.z) < 7) continue; let x = side > 0 ? ABYSS.x1 : ABYSS.x0; for (let s2 = 0; s2 < 30; s2++) { if (inAbyss(x, z)) break; x -= side; }
      const y = -30 + hash(i, 2, 82) * 85, sc = 4 + hash(i, 3, 83) * 9; mx.position.set(x + side * sc * .35, y, z); mx.rotation.set(hash(i, 4, 84) * 3, hash(i, 5, 85) * 3, 0); mx.scale.set(sc * .6, sc * 1.3, sc); mx.updateMatrix(); im.setMatrixAt(k++, mx.matrix); }
    im.count = k; im.name = 'jornada-penhascos'; root.add(im); }
  // névoa do abismo: dois planos com ruído (sem sprites) na cor da névoa do mundo
  const abyssMat = new T.ShaderMaterial({ transparent: true, depthWrite: false, fog: false, uniforms: { uT: { value: 0 }, uC: { value: new T.Color(0x8a96a4) }, uA: { value: .96 } },
    vertexShader: 'varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
    fragmentShader: 'uniform float uT;uniform vec3 uC;uniform float uA;varying vec3 vW;float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}void main(){vec2 p=vW.xz*.025;float m=n(p+vec2(uT*.02,0.))*.6+n(p*2.3-vec2(0.,uT*.03))*.4;gl_FragColor=vec4(uC*(.85+.25*m),uA*(.82+.18*m));}' });
  for (const [y, a] of [[ABYSS.fogY, .9], [ABYSS.fogY - 50, 1]]) { const m = new T.Mesh(new T.PlaneGeometry(ABYSS.x1 - ABYSS.x0 + 30, ABYSS.z1 - ABYSS.z0).rotateX(-Math.PI / 2), a < 1 ? abyssMat : abyssMat.clone()); m.position.set((ABYSS.x0 + ABYSS.x1) / 2, y, (ABYSS.z0 + ABYSS.z1) / 2); m.renderOrder = 1; m.name = 'jornada-nevoa-abismo'; if (a === 1) m.material.uniforms.uA.value = 1; root.add(m); }

  /* ---------------- vulcão: malha própria (mesma função do relevo), visível de muito longe ---------------- */
  const hazeU = { value: new T.Color(0x9aa6b4) }, glowU = { value: 1 }, coneFog = { value: new T.Vector2(46, 340) };
  const volcano = new T.Group(); volcano.name = 'jornada-vulcao'; root.add(volcano);
  { const V = VOLCANO2, A = 128, R = 44, pos = [], col = [], glow = [], idx = [];
    for (let r = 0; r <= R; r++) for (let a = 0; a <= A; a++) { const rr = V.r * (r / R) ** 1.15, an = a / A * Math.PI * 2, x = V.x + Math.cos(an) * rr, z = V.z + Math.sin(an) * rr, h = journeyHeight(x, z) ?? 0, k = rr / V.r;
      pos.push(x, h, z); const groove = Math.pow(Math.abs(Math.sin(an * 11 + rr * .02)), 60) * smooth(.6, .2, k) * smooth(.04, .25, k) * (hash(Math.round(an * 11 / Math.PI), 1, 93) > .5 ? 1 : 0); /* poucos veios finos */ const n = fbm2(x * .04, z * .04, 2, 91);
      const band = .5 + .5 * Math.sin(h * .11 + n * 4), ash = smooth(.45, .9, fbm2(x * .015, z * .015, 2, 95)); col.push(.15 + n * .1 + band * .05 + ash * .12, .13 + n * .07 + band * .03 + ash * .11, .13 + n * .05 + ash * .1); glow.push(groove * .8 + (rr < V.crater + 4 ? .7 : 0)); }
    for (let r = 0; r < R; r++) for (let a = 0; a < A; a++) { const p = r * (A + 1) + a, q = p + A + 1; idx.push(p, q, p + 1, p + 1, q, q + 1); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new T.Float32BufferAttribute(col, 3)); g.setAttribute('aGlow', new T.Float32BufferAttribute(glow, 1)); g.setIndex(idx); g.computeVertexNormals();
    const m = new T.MeshStandardMaterial({ vertexColors: true, roughness: .95, fog: false });
    m.onBeforeCompile = sh => { sh.uniforms.uHaze = hazeU; sh.uniforms.uGlowK = glowU; sh.uniforms.uFog = coneFog;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aGlow;varying float vGlow;varying float vDist;varying float vY;').replace('#include <project_vertex>', '#include <project_vertex>\nvGlow=aGlow;vDist=-mvPosition.z;vY=(modelMatrix*vec4(transformed,1.)).y;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uHaze;uniform float uGlowK;uniform vec2 uFog;varying float vGlow;varying float vDist;varying float vY;').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vec3(1.,.22,.04)*vGlow*uGlowK*1.6;')
        .replace('#include <dithering_fragment>', '#include <dithering_fragment>\nfloat base=1.-smoothstep(40.,150.,vY-24.);float f=max(smoothstep(uFog.x,uFog.y,vDist)*base,smoothstep(180.,1100.,vDist)*.72);gl_FragColor.rgb=mix(gl_FragColor.rgb,uHaze,f);'); }; // a base some na névoa como o chão; o topo fica como silhueta
    const cone = new T.Mesh(g, m); cone.name = 'jornada-vulcao-cone'; cone.frustumCulled = false; volcano.add(cone); }
  const craterTop = new T.Vector3(VOLCANO2.x, journeyHeight(VOLCANO2.x + VOLCANO2.crater, VOLCANO2.z), VOLCANO2.z);
  const smokeTex = opts.softDot || null;
  const smoke = []; for (let i = 0; i < (low ? 8 : 16); i++) { const s = new T.Sprite(new T.SpriteMaterial({ map: smokeTex, color: 0x6d625c, transparent: true, opacity: .0, depthWrite: false, fog: false })); s.userData.t = i / 16; volcano.add(s); smoke.push(s); }
  const craterGlow = new T.Sprite(new T.SpriteMaterial({ map: smokeTex, color: 0xff6a24, transparent: true, opacity: .7, depthWrite: false, fog: false, blending: T.AdditiveBlending })); craterGlow.position.copy(craterTop).y += 6; craterGlow.scale.setScalar(70); volcano.add(craterGlow);

  /* ---------------- entrada subterrânea no sopé ---------------- */
  { const G = GATE2, gy = height(G.x, G.z), gate = new T.Group(); gate.position.set(G.x, gy, G.z); gate.rotation.y = G.face; gate.name = 'jornada-entrada-vulcao'; root.add(gate);
    const basalt = new T.MeshStandardMaterial({ color: 0x2a2220, roughness: .95, flatShading: true });
    for (const sx of [-1, 1]) { const p = new T.Mesh(new T.CylinderGeometry(1.1, 1.5, 8.5, 6), basalt); p.position.set(sx * 3.4, 3.9, 0); gate.add(p); addSolid({ x: G.x - 0, z: G.z + sx * 3.4, r: 1.4 }); }
    const lintel = new T.Mesh(new T.BoxGeometry(9.2, 1.4, 2.2), basalt); lintel.position.y = 8.2; lintel.rotation.z = .05; gate.add(lintel);
    const mouth = new T.Mesh(new T.PlaneGeometry(5.6, 7.2), new T.MeshBasicMaterial({ color: 0x060302 })); mouth.position.set(0, 3.6, -.3); gate.add(mouth);
    const ember = new T.Sprite(new T.SpriteMaterial({ map: smokeTex, color: 0xff5a14, transparent: true, opacity: .45, depthWrite: false, blending: T.AdditiveBlending })); ember.position.set(0, 1.4, -.6); ember.scale.setScalar(6); gate.add(ember);
    const hood = new T.Mesh(new T.DodecahedronGeometry(4.5, 1), basalt); hood.scale.set(1.6, 1, .9); hood.position.set(0, 7.6, -3.2); gate.add(hood); } // rocha que coroa o portal, apoiada na encosta

  /* ---------------- Cinzária ---------------- */
  const city = new T.Group(); city.name = 'cinzaria-mod321'; root.add(city);
  const L = cinzariaLayout(), lit = { wins: null, lamps: [] };
  { const box = new T.BoxGeometry(1, 1, 1), stoneM = new T.MeshStandardMaterial({ color: 0x3b3532, roughness: .95 }), plasterM = new T.MeshStandardMaterial({ color: 0xffffff, roughness: .92 }), beamM = new T.MeshStandardMaterial({ color: 0x3f2c1f, roughness: .95 }), roofM = new T.MeshStandardMaterial({ color: 0x9a4c34, roughness: .85, flatShading: true, side: T.DoubleSide }), doorM = new T.MeshStandardMaterial({ color: 0x2c1e14, roughness: 1 }), winM = new T.MeshStandardMaterial({ color: 0x22160e, emissive: 0xffa04a, emissiveIntensity: .25 });
    const roofGeo = new T.BufferGeometry(); { const v = [-.5, 0, -.5, .5, 0, -.5, .5, 0, .5, -.5, 0, .5, -.5, 1, 0, .5, 1, 0]; roofGeo.setAttribute('position', new T.Float32BufferAttribute(v, 3)); roofGeo.setIndex([0, 4, 1, 1, 4, 5, 3, 2, 5, 3, 5, 4, 0, 3, 4, 1, 5, 2]); roofGeo.computeVertexNormals(); }
    const lists = { stone: [], plaster: [], beam: [], roof: [], door: [], win: [], chim: [] }, tint = [];
    const PL = [0xe6dccb, 0xd8ccb8, 0xefe4d0, 0xcfc2ae, 0xe2d2bc];
    const put = (list, x, y, z, sx, sy, sz, ry) => list.push({ x, y, z, sx, sy, sz, ry });
    for (const [hx, hz, w, d, floors, ry] of L) {
      const y0 = Math.min(height(hx - 2, hz), height(hx + 2, hz), height(hx, hz - 2), height(hx, hz + 2)) - .15, fh = 2.9, H = 1.1 + floors * fh, c = Math.cos(ry), s = Math.sin(ry), loc = (lx, lz) => [hx + lx * c + lz * s, hz - lx * s + lz * c];
      put(lists.stone, hx, y0 + .75, hz, w + .2, 1.5, d + .2, ry);                                     // embasamento de pedra vulcânica
      put(lists.plaster, hx, y0 + 1.5 + (H - 1.5) / 2, hz, w, H - 1.5, d, ry); tint.push(PL[(hash(hx | 0, hz | 0, 81) * PL.length) | 0]);
      for (const [lx, lz] of [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]]) { const [px, pz] = loc(lx, lz); put(lists.beam, px, y0 + H / 2 + .4, pz, .28, H - .6, .28, ry); }      // esteios de madeira
      for (let f = 1; f <= floors; f++) { put(lists.beam, hx, y0 + 1.5 + (f - 1) * fh + (f > 1 ? 0 : 0), hz, w + .06, .22, d + .06, ry); }
      put(lists.roof, hx, y0 + H, hz, w + .9, 1.8 + hash(hx | 0, 3, 82) * 1.2, d + .9, ry + Math.PI / 2 * (w > d ? 0 : 1) * 0);
      { const [px, pz] = loc(0, d / 2 + .05); put(lists.door, px, y0 + 1.15, pz, 1.2, 2.3, .14, ry); }
      for (let f = 0; f < floors; f++) for (const o of [-1, 1]) { const [px, pz] = loc(o * Math.min(w * .3, 2), d / 2 + .06); put(lists.win, px, y0 + 1.9 + f * fh + (f ? .3 : 0), pz, .75, .9, .1, ry); }
      if (hash(hx | 0, hz | 0, 83) < .55) { const [px, pz] = loc((hash(1, hx | 0, 84) - .5) * w * .5, -d * .2); put(lists.chim, px, y0 + H + 1.4, pz, .7, 2.6, .7, ry); }
      addSolid({ x: hx, z: hz, box: true, ry, hx: (w + .4) / 2, hz: (d + .4) / 2, city: 1 });
    }
    const inst = (geo, m, items, name) => { const im = new T.InstancedMesh(geo, m, items.length), d = new T.Object3D(); items.forEach((it, i) => { d.position.set(it.x, it.y, it.z); d.rotation.set(0, it.ry || 0, 0); d.scale.set(it.sx, it.sy, it.sz); d.updateMatrix(); im.setMatrixAt(i, d.matrix); }); im.castShadow = !low; im.receiveShadow = true; im.name = name; city.add(im); return im; };
    inst(box, stoneM, lists.stone, 'cinzaria-pedra'); const pl = inst(box, plasterM, lists.plaster, 'cinzaria-reboco'); tint.forEach((t, i) => pl.setColorAt(i, C.setHex(t))); pl.instanceColor.needsUpdate = true;
    inst(box, beamM, lists.beam, 'cinzaria-madeira'); inst(roofGeo, roofM, lists.roof, 'cinzaria-telhados'); inst(box, doorM, lists.door, 'cinzaria-portas'); lit.wins = inst(box, winM, lists.win, 'cinzaria-janelas'); inst(box, stoneM, lists.chim, 'cinzaria-chamines');
    // praça: fonte, bancas, postes de lanterna e a torre do sino
    const P = CITY_PROPS, fy = height(P.fountain.x, P.fountain.z);
    const basin = new T.Mesh(new T.CylinderGeometry(P.fountain.r, P.fountain.r + .2, .8, 24, 1, true), stoneM); basin.position.set(P.fountain.x, fy + .4, P.fountain.z); city.add(basin);
    const rim = new T.Mesh(new T.TorusGeometry(P.fountain.r, .22, 6, 32).rotateX(Math.PI / 2), stoneM); rim.position.set(P.fountain.x, fy + .8, P.fountain.z); city.add(rim);
    const fw = new T.Mesh(new T.CircleGeometry(P.fountain.r - .1, 24).rotateX(-Math.PI / 2), water); fw.position.set(P.fountain.x, fy + .55, P.fountain.z); city.add(fw);
    const col = new T.Mesh(new T.CylinderGeometry(.35, .5, 2.6, 8), stoneM); col.position.set(P.fountain.x, fy + 1.3, P.fountain.z); city.add(col); addSolid({ x: P.fountain.x, z: P.fountain.z, r: P.fountain.r + .3, city: 1 });
    const cloth = [0x8a2a24, 0x2e5a6a, 0xa07a2a, 0x5a3a6a, 0x7a3a22];
    P.stalls.forEach(([x, z, ry], i) => { const g = new T.Group(), y = height(x, z); g.position.set(x, y, z); g.rotation.y = ry; city.add(g); const counter = new T.Mesh(box, beamM); counter.scale.set(2.4, .9, 1); counter.position.y = .45; g.add(counter);
      for (const sx of [-1.1, 1.1]) for (const sz of [-.45, .45]) { const p = new T.Mesh(box, beamM); p.scale.set(.1, 2.3, .1); p.position.set(sx, 1.15, sz); g.add(p); }
      const can = new T.Mesh(new T.PlaneGeometry(2.7, 1.5), new T.MeshStandardMaterial({ color: cloth[i % cloth.length], side: T.DoubleSide, roughness: 1 })); can.rotation.x = -Math.PI / 2 + .3; can.position.set(0, 2.3, .1); g.add(can);
      addSolid({ x, z, box: true, ry, hx: 1.35, hz: .65, city: 1 }); });
    const lampHead = new T.MeshStandardMaterial({ color: 0x2a2018, emissive: 0xffb056, emissiveIntensity: .3 });
    for (const [x, z] of P.lamps) { const y = height(x, z), post = new T.Mesh(new T.CylinderGeometry(.08, .11, 3.2, 6), beamM); post.position.set(x, y + 1.6, z); city.add(post); const head = new T.Mesh(new T.BoxGeometry(.38, .5, .38), lampHead); head.position.set(x, y + 3.3, z); city.add(head);
      const g = new T.Sprite(new T.SpriteMaterial({ map: smokeTex, color: 0xffb060, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending })); g.position.set(x, y + 3.3, z); g.scale.setScalar(2.4); city.add(g); lit.lamps.push(g); addSolid({ x, z, r: .25, city: 1 }); }
    lit.lampMat = lampHead;
    { const tw = P.tower, y = height(tw.x, tw.z), t = new T.Group(); t.position.set(tw.x, y, tw.z); city.add(t); const body = new T.Mesh(box, stoneM); body.scale.set(tw.w, tw.h, tw.w); body.position.y = tw.h / 2; t.add(body);
      const bel = new T.Mesh(box, plasterM); bel.scale.set(tw.w * .9, 3, tw.w * .9); bel.position.y = tw.h + 1.5; t.add(bel); const cap = new T.Mesh(new T.ConeGeometry(tw.w * .8, 3.4, 4), roofM); cap.rotation.y = Math.PI / 4; cap.position.y = tw.h + 4.7; t.add(cap);
      const bell = new T.Mesh(new T.CylinderGeometry(.35, .7, .9, 10, 1, true), new T.MeshStandardMaterial({ color: 0x8a6a34, metalness: .7, roughness: .4, side: T.DoubleSide })); bell.position.y = tw.h + 1.4; t.add(bell); addSolid({ x: tw.x, z: tw.z, box: true, ry: 0, hx: tw.w / 2 + .2, hz: tw.w / 2 + .2, city: 1 }); }
    // barris e caixotes nas oficinas
    const crates = []; for (let k = 0; k < 40; k++) { const a = hash(k, 1, 91) * 6.28, r = 24 + hash(k, 2, 92) * 18, x = CITY2.x + Math.cos(a) * r, z = CITY2.z + Math.sin(a) * r; if (Math.abs(z - CITY2.z) < 5 || solidAt(x, z)) continue; crates.push({ x, y: height(x, z) + .4, z, sx: .8, sy: .8, sz: .8, ry: a }); }
    inst(box, beamM, crates, 'cinzaria-caixotes');
  }

  /* ---------------- aurora (só à noite, céu da jornada inteira) ---------------- */
  const auroraMat = new T.ShaderMaterial({ transparent: true, depthWrite: false, fog: false, blending: T.AdditiveBlending, side: T.DoubleSide, uniforms: { uT: { value: 0 }, uK: { value: 0 } },
    vertexShader: 'varying vec2 vU;void main(){vU=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'uniform float uT,uK;varying vec2 vU;float h(float p){return fract(sin(p*127.1)*43758.5);}float n(float x){float i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(h(i),h(i+1.),f);}void main(){float x=vU.x*26.;float wave=n(x+uT*.12)*.6+n(x*2.3-uT*.2)*.4;float band=smoothstep(.0,.35,vU.y)*smoothstep(1.,.45,vU.y-wave*.25);float curt=.55+.45*n(x*7.+uT*.6);vec3 c=mix(vec3(.15,.85,.75),vec3(.55,.35,1.),vU.y+wave*.3);gl_FragColor=vec4(c*band*curt*uK*1.25,1.);}' });
  const aurora = new T.Mesh(new T.CylinderGeometry(560, 560, 150, 64, 1, true, -.6, 3.4), auroraMat); aurora.visible = false; aurora.renderOrder = -8; aurora.frustumCulled = false; aurora.name = 'jornada-aurora'; scene.add(aurora);

  let vegAt = [1e9, 1e9], vegWait = 0, t = 0, active = false;
  return {
    root, volcano, city, craterTop, deckY,
    /** px,pz: herói; camera; night 0..1; fog: cor da névoa do mundo; hidden: área interna (dimensão/vulcão). */
    update(dt, { px, pz, camera, night = 0, fog = null, hidden = false, eruption = 0 }) {
      t += dt; windU.value = t; if (camera) horizonCam.value.copy(camera.position); fallMat.uniforms.uT.value = t; abyssMat.uniforms.uT.value = t; auroraMat.uniforms.uT.value = t;
      root.visible = !hidden; const near2 = px < -40 && px > JOURNEY_BOUNDS.x0 - 600; active = near2;
      if (hidden) { aurora.visible = false; return; }
      if (near2) streamTiles(px, pz, 1);
      vegWait -= dt; if (near2 && vegWait <= 0 && (vegDirty || Math.hypot(px - vegAt[0], pz - vegAt[1]) > 30)) { vegDirty = false; vegWait = .4; vegAt = [px, pz]; fillInstances(px, pz); }
      if (scene.fog) coneFog.value.set(scene.fog.near, scene.fog.far);
      if (fog) { abyssMat.uniforms.uC.value.copy(fog).multiplyScalar(.55).lerp(C.setRGB(.16, .19, .27), .35); hazeU.value.copy(fog); horizonFog.value.copy(fog); }
      glowU.value = .55 + .45 * night + eruption * 2;
      for (const s of smoke) { s.userData.t = (s.userData.t + dt * .018) % 1; const k = s.userData.t; s.position.set(craterTop.x + Math.sin(k * 6 + s.id) * 8 + k * 60, craterTop.y + 10 + k * 150, craterTop.z + Math.cos(k * 5) * 6); s.scale.setScalar(30 + k * 90); s.material.opacity = .35 * Math.sin(Math.PI * k); }
      const inRegion = px < -110; aurora.visible = inRegion && night > .55; if (aurora.visible) { aurora.position.set(camera.position.x, camera.position.y + 170, camera.position.z); auroraMat.uniforms.uK.value = smooth(.55, .95, night); }
      if (lit.wins) lit.wins.material.emissiveIntensity = .25 + night * 1.6; if (lit.lampMat) lit.lampMat.emissiveIntensity = .3 + night * 2.2; for (const g of lit.lamps) g.material.opacity = night * .75;
    },
    /** sólidos da jornada (casas, fonte, bancas, postes, torre, árvores, rochas grandes, pilares da ponte, portal). */
    solidAt, blockedAt(x, z) { return !!solidAt(x, z); }, setCityGone(v) { cityGone = !!v; },
    /** carrega o terreno em volta de um destino ANTES de posicionar o herói (teleporte/viagem). */
    prefetch(x, z) { streamTiles(x, z, 999, true); fillInstances(x, z); vegAt = [x, z]; vegDirty = false; },
    stats() { let tris = 0; for (const tl of [...near.values(), ...far.values()]) tris += tl.mesh.geometry.index.count / 3; return { near: near.size, far: far.size, built, tris: Math.round(tris), grass: grass.count, flowers: flowers.count, trees: trunks.count, rocks: rocks.count, houses: L.length, active }; },
    get aurora() { return aurora; }
  };
}
