import { abyssEdge, inJourney, inAbyss, journeyHeight, volcanoHeight, volcanoGully, craterFloor, journeyBoundary, polyProject, fbm2, ROUTE, RIVER2, BRIDGE, ABYSS, CITY2, VOLCANO2, GATE2, CAVE2, TRAIL2, trailDistance, WATERFALL, FALL_POOL, ABYSS_FALLS, CITY_PROPS, cinzariaLayout, cinzariaStyle, cinzariaLandmarks, riverDepth, JOURNEY_BOUNDS } from './jornada3d.js';
import { auroraUniforms, patchAuroraGround } from './aurora-luz3d.js';
import { createRippleSim, createWaterMaterial, riverGeometry, poolGeometry, createSpray, createFallMaterial, makeFall, createLava, lavaChannelPath } from './fluidos3d.js';
import { diffInstanceBlocks, markInstanceUpload } from './instance-upload3d.js';
/**
 * Mod 321/323 — o MUNDO VISÍVEL da jornada (o relevo e as regras vêm de jornada3d.js; a física usa a mesma função).
 *  • Terreno em BLOCOS com LOD e streaming: blocos finos de 64 m (célula 2 m, saia contra frestas) perto do herói e
 *    blocos grossos de 256 m (célula 8 m) até ~560 m, construídos aos poucos (≤ 1 fino + 1 grosso por quadro) e
 *    descartados ao se afastar. O bloco grosso esconde só as células cobertas por blocos finos ativos.
 *  • Mod 323: o capim/flores de cada bloco fino são calculados UMA vez, quando o bloco nasce (altura lida da própria
 *    malha do bloco); repovoar ao andar só copia arrays — antes eram ~15 mil chamadas da função de relevo num quadro
 *    (travada de 0,3–0,5 s a cada 30 m). Capim em manchas (alto/baixo, verde/dourado), flores em canteiros naturais.
 *  • Árvores: espécies do acervo (EldoriaArvoresTropicais.glb, LOD/impostor) montadas pelo jogo a partir de treePlan;
 *    até o GLB chegar, copas simples. Rochas: malha irregular instanciada; colisão como DOMO (sobe/pula pedra baixa).
 *  • Cachoeira com poço, espuma e névoa; rio; ponte pênsil (torres, cabos, pendurais, longarinas, encontros de pedra);
 *    névoa do abismo em camadas (a mais funda é opaca: o fundo nunca aparece) e quedas d'água das paredes do abismo.
 *  • Vulcão: malha própria até o avental do sopé (o terreno some por baixo, sem degrau), bruma com a mesma névoa do
 *    mundo (atenuada só no alto), canais de lava estreitos e irregulares desenhados no shader, lago de lava na cratera.
 *  • Cinzária: casas com feitio e função (estalagem, ferraria com forja, armazém, casas de pedra e de reboco com andar
 *    em balanço), telhados de 5 cores e inclinações variadas, calçamento de pedra, barris, caixotes e canteiros.
 */
const smooth = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
const NEAR = 64, FAR = 256, NEAR_CELL = 2, FAR_CELL = 8, NEAR_R = 110, FAR_R = 560, X0 = JOURNEY_BOUNDS.x1 - 6, Z0 = JOURNEY_BOUNDS.z0; // X0 = -118 alinhado à malha antiga
function hash(a, b, s = 1) { let h = (a * 374761393 + b * 668265263 + s * 974711) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
function canvasTex(T, size, draw, repeat = true) { const cv = document.createElement('canvas'); cv.width = cv.height = size; draw(cv.getContext('2d'), size); const t = new T.CanvasTexture(cv); if (repeat) t.wrapS = t.wrapT = T.RepeatWrapping; t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t; }
function rngOf(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }

export function createJourneyWorld(T, scene, opts = {}) {
  const height = opts.height || ((x, z) => journeyHeight(x, z) ?? 0), low = !!opts.lowSpec, root = new T.Group(); root.name = 'jornada-mod321'; scene.add(root);
  const C = new T.Color(), windU = { value: 0 }, V = VOLCANO2;
  const mx = new T.Object3D();
  /* ---------------- texturas procedurais (canvas, uma vez) ---------------- */
  const detail = canvasTex(T, 256, (g, S) => { const r = rngOf(11); g.fillStyle = '#e4e4e4'; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 2600; i++) { const v = 195 + r() * 60 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(r() * S, r() * S, 1 + r() * 3, 1 + r() * 3); }
    for (let i = 0; i < 70; i++) { const v = 196 + r() * 40 | 0, x = r() * S, y = r() * S, w = 1.5 + r() * 3; g.fillStyle = `rgb(${v},${v - 3},${v - 6})`; g.beginPath(); g.ellipse(x, y, w, w * (.5 + r() * .5), r() * 3, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.ellipse(x - w * .2, y - w * .2, w * .45, w * .3, 0, 0, 7); g.fill(); } });
  const cobble = canvasTex(T, 256, (g, S) => { const r = rngOf(23); g.fillStyle = '#4a4440'; g.fillRect(0, 0, S, S); // calçamento irregular: pedras de tamanhos variados, rejunte escuro, pouco contraste
    let y = 0; while (y < S) { const rh = 14 + r() * 12; let x = -r() * 14; while (x < S) { const w = 12 + r() * 22, v = 104 + r() * 34 | 0, t = r() * 10 - 5;
        for (const [ox, oy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) { g.fillStyle = `rgb(${v + t | 0},${v - 2 | 0},${v - 8 - t | 0})`; g.beginPath(); const cx = x + w / 2 + ox, cy = y + rh / 2 + oy; g.moveTo(cx - w / 2 + 2 + r() * 2, cy - rh / 2 + 1.5); g.lineTo(cx + w / 2 - 2 - r() * 2, cy - rh / 2 + 1 + r() * 2); g.lineTo(cx + w / 2 - 1.5, cy + rh / 2 - 2 - r() * 2); g.lineTo(cx - w / 2 + 1.5 + r() * 2, cy + rh / 2 - 1.5); g.closePath(); g.fill(); }
        x += w; } y += rh; } });
  const plasterTex = canvasTex(T, 128, (g, S) => { const r = rngOf(31); const gr = g.createLinearGradient(0, 0, 0, S); gr.addColorStop(0, '#f4f0e8'); gr.addColorStop(.75, '#e6ded0'); gr.addColorStop(1, '#a89c8a'); g.fillStyle = gr; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 260; i++) { const v = 200 + r() * 55 | 0; g.fillStyle = `rgba(${v},${v - 6},${v - 14},.35)`; g.fillRect(r() * S, r() * S, 2 + r() * 6, 1 + r() * 4); }
    for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(110,98,84,.18)'; const x = r() * S; g.fillRect(x, S * .55 + r() * S * .2, 3 + r() * 10, S); } }, false);
  const stoneTex = canvasTex(T, 128, (g, S) => { const r = rngOf(41); g.fillStyle = '#2a2523'; g.fillRect(0, 0, S, S); const rows = 7;
    for (let row = 0; row < rows; row++) { let x = -r() * 20; while (x < S) { const w = 14 + r() * 18, v = 70 + r() * 50 | 0; g.fillStyle = `rgb(${v},${v - 5},${v - 9})`; g.fillRect(x + 1.2, row * S / rows + 1.2, w - 2.4, S / rows - 2.4); x += w; } } });
  const tileTex = canvasTex(T, 128, (g, S) => { const r = rngOf(53); g.fillStyle = '#5a5a5a'; g.fillRect(0, 0, S, S); const rows = 10;
    for (let row = 0; row < rows; row++) for (let c = 0; c < 9; c++) { const x = (c + (row & 1) * .5) * S / 9, y = row * S / rows, v = 175 + r() * 70 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.beginPath(); g.ellipse(x, y + S / rows * .55, S / 18 - 1, S / rows * .62, 0, 0, Math.PI); g.fill(); } });
  /* ---------------- cor do chão por bioma ---------------- */
  const GRASS = [.34, .44, .16], GRASS2 = [.5, .55, .2], GOLD = [.66, .58, .3], CLOVER = [.25, .36, .14], DIRT = [.45, .37, .26], ROCK = [.4, .4, .41], ROCK2 = [.3, .29, .3], FOREST = [.2, .28, .14], ASH = [.31, .29, .285], BASALT = [.13, .12, .12], SULFUR = [.5, .43, .25], PAVE = [.36, .33, .31], SAND = [.52, .48, .4], WET = [.22, .27, .16];
  // Mod 325: as cores de vértice eram escritas em sRGB mas o Three as lê como LINEARES (chão ~3× mais claro que Eldória,
  // "bege" e sem contraste). Tudo que vira atributo de cor passa por lin().
  const lin = c => [c[0] ** 2.2, c[1] ** 2.2, c[2] ** 2.2];
  const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const RIVER_CUM = (() => { const c = [0]; for (let i = 1; i < RIVER2.length; i++) c.push(c[i - 1] + Math.hypot(RIVER2[i][0] - RIVER2[i - 1][0], RIVER2[i][1] - RIVER2[i - 1][1])); return c; })();
  const ROUTE_CUM = (() => { const c = [0]; for (let i = 1; i < ROUTE.length; i++) c.push(c[i - 1] + Math.hypot(ROUTE[i][0] - ROUTE[i - 1][0], ROUTE[i][1] - ROUTE[i - 1][1])); return c; })();
  function groundColor(x, z, h, ny) {
    const ash = smooth(-930, -1010, x), n = fbm2(x * .05, z * .05, 3, 61), q = polyProject(x, z, ROUTE, ROUTE_CUM), bd = journeyBoundary(x, z);
    // prado: manchas de capim verde, trevo escuro e campo dourado (nada de cor única)
    let c = mix3(GRASS, GRASS2, n); c = mix3(c, GOLD, smooth(.52, .78, fbm2(x * .011, z * .011, 2, 7)) * .7); c = mix3(c, CLOVER, smooth(.6, .8, fbm2(x * .07 + 9, z * .07, 2, 63)) * .5);
    // encostas: mata baixa nas fraldas, rocha fria com estratos e sombra nas fendas no alto (sem bege chapado)
    const up = smooth(2, 30, bd), alt = smooth(55, 170, h), scrub = smooth(.38, .62, fbm2(x * .025 + 4, z * .025, 3, 66));
    c = mix3(c, mix3(FOREST, GRASS, n * .6), up * (1 - alt) * (.45 + .45 * scrub));
    const strata = .5 + .5 * Math.sin(h * .21 + fbm2(x * .02, z * .02, 2, 65) * 6);
    c = mix3(c, mix3(ROCK, ROCK2, strata * .7), Math.max(alt * .85, smooth(.8, .55, ny) * (.6 + .4 * (1 - scrub))));
    c = mix3(c, mix3(ASH, BASALT, smooth(.38, .75, n)), ash);
    if (ash > .5) { const flow = smooth(.5, .6, fbm2(x * .012 + z * .004, z * .03, 3, 67)), rip = .5 + .5 * Math.sin(x * .9 + z * .35 + fbm2(x * .05, z * .05, 2, 68) * 6); c = mix3(c, BASALT, flow * .9); c = mix3(c, [.4, .38, .37], rip * .12 * (1 - flow)); c = mix3(c, SULFUR, smooth(.78, .86, fbm2(x * .04, z * .04, 2, 69)) * .45 * (1 - flow)); }
    if (inAbyss(x, z) || inAbyss(x - 5, z) || inAbyss(x + 5, z)) c = mix3([.2, .19, .2], [.06, .06, .08], smooth(40, -60, h));
    else if (inAbyss(x - 14, z) || inAbyss(x + 14, z)) c = mix3(c, ROCK2, .7);
    const road = smooth(3.4, 1.6, q.d) * (.75 + .25 * fbm2(x * .3, z * .3, 2, 71)); c = mix3(c, ash > .5 ? [.3, .28, .26] : DIRT, road * .85);
    const cd = Math.hypot(x - CITY2.x, z - CITY2.z); if (cd < CITY2.r + 4) c = mix3(c, PAVE, smooth(CITY2.r + 4, CITY2.r - 6, cd) * (.75 + .25 * n));
    if (x > -165) c = mix3(c, [.25, .35, .2], smooth(-165, -122, x) * .85); // costura com o prado de Eldória: mesmo tom de verde na emenda das malhas
    const rd = riverDepth(x, z); if (rd > .05) c = mix3(c, SAND, .6); else { const pd = Math.hypot(x - FALL_POOL.x, z - FALL_POOL.z); if (pd < FALL_POOL.r + 4) c = mix3(c, WET, smooth(FALL_POOL.r + 4, FALL_POOL.r, pd) * .7); }
    return lin(c);
  }
  /* ---------------- blocos de terreno ---------------- */
  // perspectiva aérea com relevo: as serras altas não viram uma silhueta chapada da cor da névoa (o pé some, o cume fica legível)
  const fogLift = sh => { sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vWY;').replace('#include <fog_vertex>', '#include <fog_vertex>\nvWY=(modelMatrix*vec4(transformed,1.)).y;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vWY;').replace('#include <fog_fragment>', '#ifdef USE_FOG\nfloat fogFactor=smoothstep(fogNear,fogFar,vFogDepth)*(1.-.5*smoothstep(28.,190.,vWY-20.));gl_FragColor.rgb=mix(gl_FragColor.rgb,fogColor,fogFactor);\n#endif'); };
  const terrainMat = new T.MeshStandardMaterial({ color: 0xffffff, map: detail, vertexColors: true, roughness: 1, metalness: 0 }); terrainMat.onBeforeCompile = fogLift; patchAuroraGround(T, terrainMat); // Mod 327: a aurora ilumina o relevo (faixas + oclusão por inclinação)
  // sob o cone (malha própria) o chão afunda alguns decímetros: sem disputa de profundidade nem degrau na borda
  // fora das bordas oeste/norte/sul o bloco grosso continua a jornada (antes amostrava o relevo antigo do mundo e erguia uma "parede" de serra no horizonte)
  const JB = JOURNEY_BOUNDS, baseH = (x, z) => { if (inJourney(x, z) || x > JB.x1 || (x > -240 && z < -175)) return height(x, z); const cx = Math.min(JB.x1 - 1, Math.max(JB.x0 + 1, x)), cz = Math.min(JB.z1 - 1, Math.max(JB.z0 + 1, z)); return (journeyHeight(cx, cz) ?? CITY2.y) - Math.hypot(x - cx, z - cz) * .15; };
  const renderH = (x, z) => { const vr = Math.hypot(x - V.x, z - V.z); return baseH(x, z) - volcanoHeight(x, z) - (vr < V.r * 1.17 ? .9 * smooth(V.r * 1.17, V.r * 1.05, vr) : 0); };
  function* tileGeometryGen(x0, z0, S, cell, skirt) { // gerador: o bloco é montado aos pedaços, dentro de um orçamento de ms por quadro
    const n = Math.round(S / cell) + 1, verts = n * n, sk = skirt ? 4 * n : 0, pos = new Float32Array((verts + sk) * 3), col = new Float32Array((verts + sk) * 3), uv = new Float32Array((verts + sk) * 2);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const k = j * n + i, x = x0 + i * cell, z = z0 + j * cell; pos[k * 3] = x; pos[k * 3 + 1] = renderH(x, z); pos[k * 3 + 2] = z; uv[k * 2] = x * .12; uv[k * 2 + 1] = z * .12; if (i === n - 1) yield; }
    if (cell < FAR_CELL) { // Mod 326: borda do bloco fino costurada à grade grossa (8 m): sem T-junction com o bloco grosso vizinho (fendas pretas/brancas em diagonal nos morros)
      const r = FAR_CELL / cell, H = k => pos[k * 3 + 1];
      for (let e = 0; e < n; e++) { const t = e % r, e0 = e - t; if (!t) continue; const w = t / r;
        for (const [ka, kb, k] of [[e0, e0 + r, e], [(n - 1) * n + e0, (n - 1) * n + e0 + r, (n - 1) * n + e], [e0 * n, (e0 + r) * n, e * n], [e0 * n + n - 1, (e0 + r) * n + n - 1, e * n + n - 1]]) pos[k * 3 + 1] = H(ka) + (H(kb) - H(ka)) * w; }
    }
    const idx = [];
    for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) { const a = j * n + i, b = a + 1, c = a + n, d = c + 1; if ((i + j) & 1) idx.push(a, c, b, b, c, d); else idx.push(a, c, d, a, d, b); }
    if (skirt) { // saia vertical nas 4 bordas: esconde frestas entre blocos finos e grossos
      const edges = [[...Array(n).keys()].map(i => i), [...Array(n).keys()].map(i => (n - 1) * n + i), [...Array(n).keys()].map(j => j * n), [...Array(n).keys()].map(j => j * n + n - 1)]; let s = verts;
      for (const e of edges) { const start = s; for (const k of e) { pos[s * 3] = pos[k * 3]; pos[s * 3 + 1] = pos[k * 3 + 1] - cell * 1.75 - 1.5; pos[s * 3 + 2] = pos[k * 3 + 2]; uv[s * 2] = uv[k * 2]; uv[s * 2 + 1] = uv[k * 2 + 1]; s++; }
        for (let m = 0; m < e.length - 1; m++) { const a = e[m], b = e[m + 1], c = start + m, d = start + m + 1; idx.push(a, c, b, b, c, d, a, b, c, b, d, c); } }
    }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('uv', new T.BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const nr = g.attributes.normal.array; for (let k = 0; k < verts + sk; k++) { const x = pos[k * 3], z = pos[k * 3 + 2], c = groundColor(x, z, pos[k * 3 + 1], k < verts ? nr[k * 3 + 1] : .6); col[k * 3] = c[0]; col[k * 3 + 1] = c[1]; col[k * 3 + 2] = c[2]; if (k % 48 === 47) yield; }
    g.setAttribute('color', new T.BufferAttribute(col, 3)); g.computeBoundingSphere(); g.userData = { n, full: g.index.array.slice(0, (n - 1) * (n - 1) * 6), skirt: g.index.array.slice((n - 1) * (n - 1) * 6) };
    return g;
  }
  const runGen = (g, deadline) => { for (;;) { const r = g.next(); if (r.done) return { done: true, value: r.value }; if (performance.now() > deadline) return { done: false }; } };
  function tileGeometry(x0, z0, S, cell, skirt) { return runGen(tileGeometryGen(x0, z0, S, cell, skirt), Infinity).value; }
  const tileOverlaps = (x0, z0, S) => { for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) if (inJourney(x0 + S * i / 4, z0 + S * j / 4)) return true; return false; };
  const near = new Map(), far = new Map(), queue = { near: [], far: [] };
  const keyOf = (i, j) => i + ',' + j;
  const nearOrigin = (i, j) => [X0 - (i + 1) * NEAR, Z0 + j * NEAR], farOrigin = (i, j) => [X0 - (i + 1) * FAR, Z0 + j * FAR];
  function maskFar(t) { // células grossas cobertas por blocos finos ativos saem do desenho
    const g = t.mesh.geometry, n = g.userData.n, [x0, z0] = farOrigin(t.i, t.j), full = g.userData.full, keep = [];
    for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) { const cx = x0 + (i + .5) * FAR_CELL, cz = z0 + (j + .5) * FAR_CELL, ni = Math.floor((X0 - cx) / NEAR), nj = Math.floor((cz - Z0) / NEAR), nt = near.get(keyOf(ni, nj)); if (nt && nt.mesh.visible) continue; const o = (j * (n - 1) + i) * 6; for (let q = 0; q < 6; q++) keep.push(full[o + q]); }
    for (const v of g.userData.skirt) keep.push(v); g.setIndex(keep); t.masked = true;
  }
  function wanted(px, pz) {
    const wn = new Set(), wf = new Set();
    const ni0 = Math.floor((X0 - px) / NEAR), nj0 = Math.floor((pz - Z0) / NEAR), rN = Math.ceil(NEAR_R / NEAR);
    for (let i = ni0 - rN; i <= ni0 + rN; i++) for (let j = nj0 - rN; j <= nj0 + rN; j++) { if (i < 0 || j < 0) continue; const [x0, z0] = nearOrigin(i, j); if (Math.hypot(x0 + NEAR / 2 - px, z0 + NEAR / 2 - pz) > NEAR_R + NEAR * .7 || !tileOverlaps(x0, z0, NEAR)) continue; wn.add(keyOf(i, j)); }
    const fi0 = Math.floor((X0 - px) / FAR), fj0 = Math.floor((pz - Z0) / FAR), rF = Math.ceil(FAR_R / FAR);
    for (let i = fi0 - rF; i <= fi0 + rF; i++) for (let j = fj0 - rF; j <= fj0 + rF; j++) { if (i < 0 || j < 0) continue; const [x0, z0] = farOrigin(i, j); if (Math.hypot(x0 + FAR / 2 - px, z0 + FAR / 2 - pz) > FAR_R + FAR * .7 || !tileOverlaps(x0, z0, FAR)) continue; wf.add(keyOf(i, j)); }
    return { wn, wf };
  }
  let lastKey = '', nearDirty = false, vegDirty = true, built = 0, job = null;
  function streamTiles(px, pz, budget = 1, force = false) {
    const ck = Math.floor(px / 16) + ':' + Math.floor(pz / 16);
    if (ck !== lastKey || force) { lastKey = ck; const { wn, wf } = wanted(px, pz);
      for (const [k, t] of near) if (!wn.has(k)) { root.remove(t.mesh); t.mesh.geometry.dispose(); near.delete(k); nearDirty = true; vegDirty = true; }
      for (const [k, t] of far) if (!wf.has(k)) { root.remove(t.mesh); t.mesh.geometry.dispose(); far.delete(k); vegDirty = true; }
      const dist = (k, S, o) => { const [i, j] = k.split(',').map(Number), [x0, z0] = o(i, j); return Math.hypot(x0 + S / 2 - px, z0 + S / 2 - pz); };
      if (job && !(job.kind === 'far' ? wf : wn).has(job.k)) { if (job.t) { root.remove(job.t.mesh); job.t.mesh.geometry.dispose(); (job.kind === 'far' ? far : near).delete(job.k); } job = null; }
      queue.near = [...wn].filter(k => !near.has(k) && !(job && job.kind === 'near' && job.k === k)).sort((a, b) => dist(a, NEAR, nearOrigin) - dist(b, NEAR, nearOrigin));
      queue.far = [...wf].filter(k => !far.has(k) && !(job && job.kind === 'far' && job.k === k)).sort((a, b) => dist(a, FAR, farOrigin) - dist(b, FAR, farOrigin));
    }
    const deadline = budget >= 999 ? Infinity : performance.now() + (low ? 3 : 5);
    while (performance.now() < deadline || deadline === Infinity) {
      if (!job) { const kind = queue.far.length && (!queue.near.length || far.size < 2) ? 'far' : queue.near.length ? 'near' : null; if (!kind) break;
        const k = (kind === 'far' ? queue.far : queue.near).shift(); if ((kind === 'far' ? far : near).has(k)) continue; const [i, j] = k.split(',').map(Number), [x0, z0] = (kind === 'far' ? farOrigin : nearOrigin)(i, j);
        job = { kind, k, i, j, x0, z0, gen: tileGeometryGen(x0, z0, kind === 'far' ? FAR : NEAR, kind === 'far' ? FAR_CELL : NEAR_CELL, true), t: null }; }
      const r = runGen(job.gen, deadline); if (!r.done) break;
      if (!job.t) { const m = new T.Mesh(r.value, terrainMat); m.receiveShadow = true; m.name = job.kind === 'far' ? 'jornada-bloco-grosso' : 'jornada-bloco-fino'; root.add(m); built++; nearDirty = true; job.t = { mesh: m, i: job.i, j: job.j };
        if (job.kind === 'far') { far.set(job.k, job.t); job = null; continue; }
        near.set(job.k, job.t); job.gen = tileVegetationGen(job.t, job.x0, job.z0); continue; }
      vegDirty = true; job = null;
    }
    if (nearDirty) { nearDirty = false; for (const t of far.values()) maskFar(t); }
  }

  /* horizonte: malha grossa (célula 24 m) da jornada inteira, desenhada só além de ~480 m da câmera */
  const horizonCam = { value: new T.Vector3() };
  { const B = JOURNEY_BOUNDS, cell = 24, nx = Math.ceil((B.x1 - B.x0) / cell) + 1, nz = Math.ceil((B.z1 - B.z0) / cell) + 1, pos = [], col = [], idx = [];
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const x = B.x0 + i * cell, z = B.z0 + j * cell, h = (inJourney(x, z) ? renderH(x, z) : 0) - 2.5, c = groundColor(x, z, h, .8); pos.push(x, h, z); col.push(c[0], c[1], c[2]); }
    for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1; if (inJourney(B.x0 + (i + .5) * cell, B.z0 + (j + .5) * cell)) idx.push(a, c, b, b, c, d); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new T.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new T.MeshLambertMaterial({ vertexColors: true }); m.onBeforeCompile = sh => { fogLift(sh); sh.uniforms.uCamXZ = horizonCam; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vHW;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvHW=(modelMatrix*vec4(transformed,1.)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uCamXZ;varying vec3 vHW;').replace('void main() {', 'void main() {\nif(distance(vHW.xz,uCamXZ.xz)<480.)discard;'); };
    const hz = new T.Mesh(g, m); hz.name = 'jornada-horizonte'; hz.frustumCulled = false; hz.renderOrder = -2; root.add(hz); }

  /* Mod 325 — costura leste: a malha antiga de Eldória termina na 1ª célula INTEIRA depois de x = −118 (no perfil leve a
     célula é de 2,5 m), deixando uma fresta de até ~1 m por onde o céu vazava ("faixa branca" na descida da floresta).
     Uma faixa fina segue a mesma função de relevo 5 cm abaixo: onde a malha antiga existe ela vence a profundidade, na
     fresta a faixa aparece. */
  { const xs = [], zs = []; for (let x = X0; x <= X0 + 10.001; x += 1) xs.push(x); for (let z = -178; z <= 90; z += 2) zs.push(z); // Mod 326: só no vale (na serra norte a faixa aflorava na silhueta)
    const nx = xs.length, nz = zs.length, pos = new Float32Array(nx * nz * 3), col = new Float32Array(nx * nz * 3), uv = new Float32Array(nx * nz * 2), idx = [];
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const k = j * nx + i, x = xs[i], z = zs[j], g0 = height(x, z), sl = Math.abs(height(x + 1.25, z) - height(x - 1.25, z)) / 2.5 + Math.abs(height(x, z + 1.25) - height(x, z - 1.25)) / 2.5, h = g0 - .05 - sl * 1.6, c = groundColor(x, z, h, .9); /* Mod 326: em encosta a faixa afunda (antes aparecia como "fita" cinza acima da serra norte) */ pos.set([x, h, z], k * 3); col.set(c, k * 3); uv[k * 2] = x * .12; uv[k * 2 + 1] = z * .12; }
    for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1; idx.push(a, c, b, b, c, d); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('color', new T.BufferAttribute(col, 3)); g.setAttribute('uv', new T.BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const m = new T.Mesh(g, terrainMat); m.name = 'jornada-costura-leste'; m.receiveShadow = true; root.add(m); }
  /* ---------------- capim e flores: calculados por bloco fino (uma vez) ---------------- */
  const grassGeo = (() => { const g = new T.BufferGeometry(), p = [], u = []; for (let k = 0; k < 3; k++) { const a = k * Math.PI / 3, cx = Math.cos(a) * .5, sz = Math.sin(a) * .5; p.push(-cx, 0, -sz, cx, 0, sz, cx, 1, sz, -cx, 0, -sz, cx, 1, sz, -cx, 1, -sz); u.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1); } g.setAttribute('position', new T.Float32BufferAttribute(p, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(u, 2)); g.computeVertexNormals(); for (let i = 0; i < g.attributes.normal.count; i++) g.attributes.normal.setXYZ(i, 0, 1, 0); return g; })();
  // lâminas de comprimentos, larguras e curvas diferentes, base escura e ponta clara, algumas espigas (capim alto)
  const bladeTex = canvasTex(T, 128, (g, S) => { const r = rngOf(77); g.clearRect(0, 0, S, S);
    for (let i = 0; i < 30; i++) { const x = 6 + r() * (S - 12), w = 1.2 + r() * 2.6, h = S * (.35 + r() * .62), lean = (r() - .5) * 34, gr = g.createLinearGradient(0, S, 0, S - h); gr.addColorStop(0, '#9aa868'); gr.addColorStop(.55, `rgb(${215 + r() * 40 | 0},${222 + r() * 33 | 0},${170 + r() * 50 | 0})`); gr.addColorStop(1, '#fffbe6'); g.fillStyle = gr;
      g.beginPath(); g.moveTo(x - w, S); g.quadraticCurveTo(x + lean * .35, S - h * .6, x + lean, S - h); g.quadraticCurveTo(x + lean * .35 + .8, S - h * .6, x + w, S); g.fill();
      if (r() < .3) { g.fillStyle = '#f2e3a8'; g.beginPath(); g.ellipse(x + lean, S - h + 5, 1.8, 6, lean * .02, 0, 7); g.fill(); } } }, false);
  const windShader = sh => { sh.uniforms.uWind = windU; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uWind;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvec4 wp=instanceMatrix*vec4(0.,0.,0.,1.);float gust=.6+.4*sin(uWind*.35+wp.x*.013);float sw=(sin(uWind*1.6+wp.x*.17+wp.z*.13)*.5+sin(uWind*2.7+wp.x*.41)*.25)*gust;transformed.x+=sw*.24*uv.y*uv.y;transformed.z+=sw*.13*uv.y*uv.y;'); };
  const liftU = { value: .35 }, liftShader = sh => { windShader(sh); sh.uniforms.uLift = liftU; sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uLift;').replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\nreflectedLight.indirectDiffuse += diffuseColor.rgb * uLift;'); };
  const grassMat = new T.MeshLambertMaterial({ map: bladeTex, alphaTest: .42, side: T.DoubleSide }); grassMat.onBeforeCompile = liftShader; // capim translúcido: luz que atravessa as lâminas (o sol baixo não as deixa pretas)
  const GRASS_MAX = low ? 7000 : 18000, grass = new T.InstancedMesh(grassGeo, grassMat, GRASS_MAX); grass.count = 0; grass.frustumCulled = false; grass.name = 'jornada-capim'; root.add(grass);
  const flowerGeo = (() => { const g = new T.PlaneGeometry(.26, .26); g.translate(0, .55, 0); const g2 = g.clone().rotateY(Math.PI / 2); const p = [...g.attributes.position.array, ...g2.attributes.position.array], u = [...g.attributes.uv.array, ...g2.attributes.uv.array], i = [...g.index.array, ...[...g2.index.array].map(v => v + 4)], m = new T.BufferGeometry(); m.setAttribute('position', new T.Float32BufferAttribute(p, 3)); m.setAttribute('uv', new T.Float32BufferAttribute(u, 2)); m.setIndex(i); m.computeVertexNormals(); return m; })();
  const flowerTex = canvasTex(T, 64, (g, S) => { g.clearRect(0, 0, S, S); g.strokeStyle = '#4e6a2a'; g.lineWidth = 2; g.beginPath(); g.moveTo(32, 64); g.lineTo(32, 30); g.stroke(); g.fillStyle = '#fff'; for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; g.beginPath(); g.ellipse(32 + Math.cos(a) * 9, 22 + Math.sin(a) * 9, 7, 4.5, a, 0, 7); g.fill(); } g.fillStyle = '#f4c64a'; g.beginPath(); g.arc(32, 22, 4.5, 0, 7); g.fill(); }, false);
  const flowerMat = new T.MeshLambertMaterial({ map: flowerTex, alphaTest: .5, side: T.DoubleSide }); flowerMat.onBeforeCompile = liftShader;
  const FLOWER_MAX = low ? 1100 : 2800, flowers = new T.InstancedMesh(flowerGeo, flowerMat, FLOWER_MAX); flowers.count = 0; flowers.frustumCulled = false; flowers.name = 'jornada-flores'; root.add(flowers);
  const FLOWER_COLORS = [0xf3e9f7, 0xd9a2e0, 0x9f8ce8, 0xfff1a8, 0xf6b6c6, 0xffffff, 0xf0a060, 0x8fb4f0];
  let grassPlan = [], flowerPlan = [];
  const onRoad = (x, z, w) => polyProject(x, z, ROUTE, ROUTE_CUM).d < w;
  const tmpM = new T.Matrix4(), tmpQ = new T.Quaternion(), tmpS = new T.Vector3(), tmpP = new T.Vector3(), UP = new T.Vector3(0, 1, 0);
  function* tileVegetationGen(t, x0, z0) {
    // grades grossas (9×9, 8 m) de limite, estrada e rio: o capim consulta por interpolação (≈240 chamadas caras em vez de ~6 mil)
    const GN = 9, GS = NEAR / (GN - 1), gB = new Float32Array(GN * GN), gR = new Float32Array(GN * GN), gW = new Float32Array(GN * GN);
    for (let j = 0; j < GN; j++) { for (let i = 0; i < GN; i++) { const x = x0 + i * GS, z = z0 + j * GS, k = j * GN + i; gB[k] = inJourney(x, z) ? journeyBoundary(x, z) : 99; gR[k] = polyProject(x, z, ROUTE, ROUTE_CUM).d; gW[k] = Math.min(polyProject(x, z, RIVER2, RIVER_CUM).d, Math.hypot(x - FALL_POOL.x, z - FALL_POOL.z) - FALL_POOL.r + 5.5); } yield; }
    const lerpG = (A, x, z) => { const fx = Math.min(GN - 1.001, Math.max(0, (x - x0) / GS)), fz = Math.min(GN - 1.001, Math.max(0, (z - z0) / GS)), i = fx | 0, j = fz | 0, u = fx - i, v = fz - j, k = j * GN + i; return (A[k] * (1 - u) + A[k + 1] * u) * (1 - v) + (A[k + GN] * (1 - u) + A[k + GN + 1] * u) * v; };
    const pos = t.mesh.geometry.attributes.position.array, n = t.mesh.geometry.userData.n, hAt = (x, z) => { const fx = (x - x0) / NEAR_CELL, fz = (z - z0) / NEAR_CELL, i = Math.min(n - 2, Math.max(0, Math.floor(fx))), j = Math.min(n - 2, Math.max(0, Math.floor(fz))), u = fx - i, v = fz - j, k = j * n + i; return (pos[k * 3 + 1] * (1 - u) + pos[(k + 1) * 3 + 1] * u) * (1 - v) + (pos[(k + n) * 3 + 1] * (1 - u) + pos[(k + n + 1) * 3 + 1] * u) * v; };
    const per = low ? 520 : 1250, G = new Float32Array(per * 16), GC = new Float32Array(per * 3); let g = 0;
    for (let k = 0; k < per * 1.6 && g < per; k++) { const x = x0 + hash(t.i * 977 + k, t.j, 31) * NEAR, z = z0 + hash(t.i, t.j * 977 + k, 32) * NEAR;
      if (x < -935 || !inJourney(x, z) || Math.hypot(x - CITY2.x, z - CITY2.z) < CITY2.r) continue;
      const dens = .25 + .75 * smooth(.32, .62, fbm2(x * .03, z * .03, 2, 81)); if (hash(k, t.i + t.j, 82) > dens) continue;
      if (lerpG(gR, x, z) < 2.1 + hash(k, 3, 83) || lerpG(gW, x, z) < 4.6 || lerpG(gB, x, z) > 9) continue; if (k % 160 === 159) yield;
      const h = hAt(x, z), tall = smooth(.45, .72, fbm2(x * .021 + 3, z * .021, 2, 84)), s = .55 + hash(k, t.i, 33) * .5, sy = s * (.7 + tall * 1.5 + hash(k, 1, 35) * .45);
      tmpQ.setFromAxisAngle(UP, hash(k, t.j, 34) * 6.28); tmpM.compose(tmpP.set(x, h - .06, z), tmpQ, tmpS.set(s * 1.15, sy, s * 1.15)); tmpM.toArray(G, g * 16);
      const gold = smooth(.5, .76, fbm2(x * .011, z * .011, 2, 7)); C.setHSL(.2 - gold * .07 + hash(k, 2, 36) * .04, .42 + gold * .12, .45 + hash(k, 3, 37) * .14 + tall * .06); GC[g * 3] = C.r; GC[g * 3 + 1] = C.g; GC[g * 3 + 2] = C.b; g++; }
    const pf = low ? 50 : 120, F = new Float32Array(pf * 16), FC = new Float32Array(pf * 3); let f = 0;
    for (let k = 0; k < pf * 2 && f < pf; k++) { const patch = k >> 4, cx = x0 + hash(t.i * 31 + patch, t.j, 42) * NEAR, cz = z0 + hash(t.i, t.j * 31 + patch, 44) * NEAR, rr = 1.5 + hash(patch, t.i, 49) * 4, a = hash(k, t.i, 43) * 6.28, d = rr * Math.sqrt(hash(k, t.j, 45)), x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d; // canteiros naturais
      if (hash(t.i + patch, t.j, 40) > .62 || x < -935 || !inJourney(x, z) || lerpG(gR, x, z) < 2.4 || lerpG(gW, x, z) < 5.6 || Math.hypot(x - CITY2.x, z - CITY2.z) < CITY2.r || lerpG(gB, x, z) > 4) continue;
      const sc = .7 + hash(k, 5, 47) * .8; tmpQ.setFromAxisAngle(UP, hash(k, 4, 46) * 6.28); tmpM.compose(tmpP.set(x, hAt(x, z) - .02, z), tmpQ, tmpS.set(sc, sc * (.8 + hash(k, 6, 48) * .7), sc)); tmpM.toArray(F, f * 16);
      C.setHex(FLOWER_COLORS[(hash(t.i + patch, t.j, 48) * FLOWER_COLORS.length) | 0]); FC[f * 3] = C.r; FC[f * 3 + 1] = C.g; FC[f * 3 + 2] = C.b; f++; }
    t.veg = { G, GC, g, F, FC, f };
  }
  function fillInstances(px, pz) {
    const list = [...near.values()].filter(t => t.veg).map(t => { const [x0, z0] = nearOrigin(t.i, t.j); return { t, d: Math.hypot(x0 + 32 - px, z0 + 32 - pz) }; }).filter(o => o.d < 118);
    const grassBlocks = list.map(({ t, d }) => ({ id: t.i + ':' + t.j, count: t.veg.g, distance: d }));
    const flowerBlocks = list.map(({ t, d }) => ({ id: t.i + ':' + t.j, count: t.veg.f, distance: d }));
    const gPlan = diffInstanceBlocks(grassPlan, grassBlocks, GRASS_MAX);
    const fPlan = diffInstanceBlocks(flowerPlan, flowerBlocks, FLOWER_MAX);
    if (!gPlan.changed && !fPlan.changed) return;
    const byId = new Map(list.map(({ t }) => [t.i + ':' + t.j, t]));
    if (!grass.instanceColor) grass.setColorAt(0, C.setRGB(1, 1, 1)); if (!flowers.instanceColor) flowers.setColorAt(0, C.setRGB(1, 1, 1));
    const GA = grass.instanceMatrix.array, FA = flowers.instanceMatrix.array, GCA = grass.instanceColor.array, FCA = flowers.instanceColor.array;
    if (gPlan.changed) {
      let g = 0;
      for (const item of gPlan.order) { const v = byId.get(item.id).veg; GA.set(v.G.subarray(0, item.count * 16), g * 16); GCA.set(v.GC.subarray(0, item.count * 3), g * 3); g += item.count; }
      grass.count = g; grassPlan = gPlan.order; markInstanceUpload(grass.instanceMatrix, 0, g * 16); markInstanceUpload(grass.instanceColor, 0, g * 3);
    }
    if (fPlan.changed) {
      let f = 0;
      for (const item of fPlan.order) { const v = byId.get(item.id).veg; FA.set(v.F.subarray(0, item.count * 16), f * 16); FCA.set(v.FC.subarray(0, item.count * 3), f * 3); f += item.count; }
      flowers.count = f; flowerPlan = fPlan.order; markInstanceUpload(flowers.instanceMatrix, 0, f * 16); markInstanceUpload(flowers.instanceColor, 0, f * 3);
    }
  }

  /* ---------------- árvores (plano para o acervo de espécies) e rochas ---------------- */
  const solids = new Map(); // grade 16 m → sólidos {x,z,r} ou caixas giradas
  const cellKey = (x, z) => Math.floor(x / 16) + ':' + Math.floor(z / 16);
  let cityGone = false;
  function addSolid(o) { const k = cellKey(o.x, o.z); let a = solids.get(k); if (!a) solids.set(k, a = []); a.push(o); }
  function solidAt(x, z, y = null) { for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const a = solids.get((Math.floor(x / 16) + i) + ':' + (Math.floor(z / 16) + j)); if (a) for (const o of a) { if (o.city && cityGone) continue; if (y !== null && o.top !== undefined && y > o.top) continue;
    if (o.box) { const dx = x - o.x, dz = z - o.z, c = Math.cos(o.ry), s = Math.sin(o.ry), lx = dx * c - dz * s, lz = dx * s + dz * c; /* inverso da rotação Y do objeto */ if (Math.abs(lx) < o.hx && Math.abs(lz) < o.hz) return o; } else if ((x - o.x) ** 2 + (z - o.z) ** 2 < o.r * o.r) return o; } } return null; }
  const treeSpots = [], rockSpots = [];
  const freeSpot = (x, z, road = 7) => inJourney(x, z) && !onRoad(x, z, road) && riverDepth(x, z) === 0 && Math.hypot(x - FALL_POOL.x, z - FALL_POOL.z) > FALL_POOL.r + 10 && !(Math.abs(x - WATERFALL.x) < 12 && z > FALL_POOL.z - 4 && z < WATERFALL.zTop + 6) && Math.hypot(x - CITY2.x, z - CITY2.z) > CITY2.r + 10;
  for (let i = 0; i < 7; i++) for (let j = 0; j < 3; j++) { // bosques naturais no vale (agrupados, nunca em grade)
    const gx = -170 - i * 64 - hash(i, j, 3) * 30, gz = -150 + j * 72 + hash(i, j, 5) * 40;
    for (let k = 0; k < 7; k++) { const x = gx + (hash(i * 9 + k, j, 7) - .5) * 26, z = gz + (hash(i, j * 9 + k, 8) - .5) * 26; if (!freeSpot(x, z) || journeyBoundary(x, z) > -2 || x < -900 || (hash(i, k, 11) < .25)) continue; const s = .8 + hash(k, i, 12) * .7; treeSpots.push({ x, z, s, sp: hash(k, j, 13) < .6 ? 'copaLarga' : 'figueira' }); addSolid({ x, z, r: .45 * s + .2 }); }
  }
  for (let k = 0; k < 14; k++) { const x = -180 - hash(k, 1, 14) * 420, z = -140 + hash(k, 2, 15) * 190; if (!freeSpot(x, z, 9) || journeyBoundary(x, z) > -6 || treeSpots.some(t => Math.hypot(t.x - x, t.z - z) < 25)) continue; treeSpots.push({ x, z, s: 1.1 + hash(k, 3, 16) * .4, sp: 'copaLarga', lone: 1 }); addSolid({ x, z, r: .7 }); } // árvores solitárias no campo
  for (let k = 0; k < (low ? 200 : 380); k++) { const cl = k >> 3, x = -130 - hash(cl, 4, 17) * 700 + (hash(k, 8, 17) - .5) * 40, z = -330 + hash(cl, 5, 18) * 560 + (hash(k, 9, 18) - .5) * 40, b = journeyBoundary(x, z); if (!inJourney(x, z) || b < 4 || b > 90 || !(Math.abs(x - WATERFALL.x) > 12 || z < FALL_POOL.z - 4 || z > WATERFALL.zTop + 6) || inAbyss(x, z) || inAbyss(x + 16, z) || inAbyss(x - 16, z) || x < -800) continue; treeSpots.push({ x, z, s: .9 + hash(k, 6, 19) * .6, sp: hash(k, 7, 20) < .5 ? 'figueira' : 'copaLarga', slope: 1 }); } // mata nas fraldas das serras (fora do caminhável)
  for (let k = 0; k < 160; k++) { const x = -940 - hash(k, 1, 21) * 270, z = -150 + hash(k, 2, 22) * 180; if (!freeSpot(x, z, 5) || journeyBoundary(x, z) > 4) continue; rockSpots.push({ x, z, s: .5 + hash(k, 3, 23) ** 2 * 2.6, dark: 1 }); }
  for (let k = 0; k < 90; k++) { const x = -150 - hash(k, 4, 24) * 460, z = -160 + hash(k, 5, 25) * 210; if (!freeSpot(x, z, 5) || journeyBoundary(x, z) > 2) continue; rockSpots.push({ x, z, s: .35 + hash(k, 6, 26) ** 2 * 1.7, dark: 0 }); }
  for (let k = 0; k < 70; k++) { const s0 = 600 + hash(k, 1, 27) * 330, q = (() => { let acc = 0; for (let i = 0; i < ROUTE.length - 1; i++) { const L = Math.hypot(ROUTE[i + 1][0] - ROUTE[i][0], ROUTE[i + 1][1] - ROUTE[i][1]); if (acc + L >= s0) { const u = (s0 - acc) / L; return [ROUTE[i][0] + (ROUTE[i + 1][0] - ROUTE[i][0]) * u, ROUTE[i][1] + (ROUTE[i + 1][1] - ROUTE[i][1]) * u]; } acc += L; } return ROUTE[0]; })();
    const a = hash(k, 2, 28) * 6.28, d = 4.5 + hash(k, 3, 29) * 9, x = q[0] + Math.cos(a) * d, z = q[1] + Math.sin(a) * d; if (x > -620 || inAbyss(x, z) || inAbyss(x + 4, z) || inAbyss(x - 4, z) || onRoad(x, z, 3.2) || Math.abs(z - BRIDGE.z) < 5 && x < BRIDGE.x0 + 6 && x > BRIDGE.x1 - 6) continue; rockSpots.push({ x, z, s: .4 + hash(k, 4, 30) ** 2 * 1.9, dark: .5 }); } // pedras que margeiam a subida e a ponte
  const treePlan = treeSpots.map((s, i) => ({ sp: s.sp, x: s.x, z: s.z, rot: hash(i, 1, 55) * 6.28, s: s.s, tint: s.slope ? [.82, .9, .78] : [.95, 1, .9] }));
  // copas simples (só até as espécies do acervo carregarem)
  const trunkGeo = new T.CylinderGeometry(.18, .32, 1, 6); trunkGeo.translate(0, .5, 0);
  const crownGeo = new T.IcosahedronGeometry(1, 1);
  const trunkMat = new T.MeshStandardMaterial({ color: 0x4a3828, roughness: 1 }), crownMat = new T.MeshStandardMaterial({ color: 0x4e6a2c, roughness: .95 });
  const TREE_MAX = 600, trunks = new T.InstancedMesh(trunkGeo, trunkMat, TREE_MAX), crowns = new T.InstancedMesh(crownGeo, crownMat, TREE_MAX * 3); trunks.count = crowns.count = 0; trunks.castShadow = crowns.castShadow = !low; trunks.frustumCulled = crowns.frustumCulled = false; trunks.name = 'jornada-arvores'; root.add(trunks, crowns);
  let speciesTrees = false;
  // rochas irregulares (icosaedro deformado por ruído, sem cara de dado)
  const rockGeo = (() => { const g = new T.IcosahedronGeometry(1, 1), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = .78 + .44 * fbm2(x * 1.7 + 3, z * 1.7 + y * 1.3, 2, 91); p.setXYZ(i, x * k, Math.max(-.35, y) * k * (y > 0 ? 1 : .6), z * k); } g.computeVertexNormals(); g.computeBoundingBox(); return g; })();
  const rockTopK = rockGeo.boundingBox.max.y;
  const rockMat = new T.MeshStandardMaterial({ color: 0xffffff, roughness: .95, map: detail });
  const basaltBlade = new T.MeshStandardMaterial({ color: 0x2c2826, roughness: .9, map: detail });
  const ROCK_MAX = 760, rocks = new T.InstancedMesh(rockGeo, rockMat, ROCK_MAX); rocks.count = 0; rocks.frustumCulled = false; rocks.castShadow = !low; rocks.receiveShadow = true; rocks.name = 'jornada-rochas'; root.add(rocks);
  // colisão das rochas: domo com base, altura e raio do que se vê (pedra baixa: sobe andando; média: só pulando)
  const rockColliders = rockSpots.map(s => { const h = height(s.x, s.z), top = h + s.s * .25 + s.s * .8 * rockTopK; return { x: s.x, z: s.z, radius: s.s * 1.02, height: Math.max(.15, top - (h - .1)), base: h - .1, journey: 1 }; });
  function fillTreesAndRocks(px, pz) {
    let tr = 0, cr = 0;
    if (!speciesTrees) for (const s of treeSpots) { if (Math.hypot(s.x - px, s.z - pz) > 330 || tr >= TREE_MAX) continue; const h = height(s.x, s.z), th = 3.4 * s.s;
      mx.position.set(s.x, h - .1, s.z); mx.rotation.set(0, 0, 0); mx.scale.set(s.s, th, s.s); mx.updateMatrix(); trunks.setMatrixAt(tr++, mx.matrix);
      for (const [oy, sc, ox, oz] of [[th + 1.2 * s.s, 2.2 * s.s, 0, 0], [th + 2.3 * s.s, 1.6 * s.s, .6 * s.s, .3 * s.s], [th + 1.7 * s.s, 1.5 * s.s, -.7 * s.s, -.4 * s.s]]) { if (cr >= TREE_MAX * 3) break; mx.position.set(s.x + ox, h + oy, s.z + oz); mx.scale.set(sc, sc * .8, sc); mx.updateMatrix(); crowns.setMatrixAt(cr, mx.matrix); C.setHSL(.24 + hash(cr, 1, 51) * .06, .42, .28 + hash(cr, 2, 52) * .08); crowns.setColorAt(cr, C); cr++; } }
    trunks.count = tr; crowns.count = cr; markInstanceUpload(trunks.instanceMatrix, 0, tr * 16); markInstanceUpload(crowns.instanceMatrix, 0, cr * 16); if (crowns.instanceColor) markInstanceUpload(crowns.instanceColor, 0, cr * 3);
    let rk = 0; rockSpots.forEach((s, i) => { if (Math.hypot(s.x - px, s.z - pz) > 300 || rk >= ROCK_MAX) return; mx.position.set(s.x, (s.y ?? height(s.x, s.z)) + s.s * .15, s.z); mx.rotation.set((hash(i, 1, 61) - .5) * .5, hash(i, 2, 62) * 6.28, (hash(i, 3, 63) - .5) * .4); mx.scale.set(s.s * 1.2, s.s * .8, s.s); mx.updateMatrix(); rocks.setMatrixAt(rk, mx.matrix);
      C.setHex(s.dark >= 1 ? 0x57504b : s.dark > 0 ? 0x77716c : 0x9a9284).multiplyScalar(.85 + hash(i, 4, 64) * .3); rocks.setColorAt(rk, C); rk++; });
    rocks.count = rk; markInstanceUpload(rocks.instanceMatrix, 0, rk * 16); if (rocks.instanceColor) markInstanceUpload(rocks.instanceColor, 0, rk * 3);
  }

  /* grupos com LOD por distância (o plano de corte da jornada é longo: o que está longe e é pequeno não vai para a GPU) */
  const gFall = new T.Group(), gBridge = new T.Group(), gAbyss = new T.Group(); gFall.name = 'jornada-cachoeira-grupo'; gBridge.name = 'jornada-ponte-grupo'; gAbyss.name = 'jornada-abismo-grupo'; root.add(gFall, gBridge, gAbyss);
  /* ---------------- rio, cachoeira e poço ---------------- */
  const fallT = { value: 0 };
  const water = opts.waterMaterial || new T.MeshStandardMaterial({ color: 0x23505c, roughness: .08, metalness: .2, transparent: true, opacity: .85 });
  /* Mod 326 — água de jogo: ondulações simuladas em volta do herói (pés, gotas, cachoeira), fluxo na direção do rio,
     cor e transparência pela profundidade real (o leito aparece no raso, a margem some sem borda) e espuma onde há
     contato. O rio e o poço usam o MESMO material; o Eldória continua com a água dele. */
  const sim = createRippleSim(T), waterMat = createWaterMaterial(T, { sim, time: fallT, aurora: auroraUniforms(T) }), spray = createSpray(T); root.add(spray.points);
  const riverCurve = new T.CatmullRomCurve3(RIVER2.map(p => new T.Vector3(p[0], 0, p[1])));
  { const lvl = (u, c) => { const t = riverCurve.getTangent(u), sx = -t.z, sz = t.x; let y = Infinity; for (const o of [-1.5, 0, 1.5]) y = Math.min(y, height(c.x + sx * o, c.z + sz * o)); return y + .55; };
    const m = new T.Mesh(riverGeometry(T, riverCurve, { height, level: lvl, halfW: 6.2, cross: 8, N: low ? 120 : 170, speed: .85, maxDepth: riverDepth }), waterMat); m.renderOrder = 2; m.name = 'jornada-rio'; root.add(m); }
  // Mod 326: sem anel fixo nas pernas — a superfície simulada abre ondas e espuma reais onde o herói pisa
  const fallParts = { mist: [] }, simLast = [0, 0]; let simAcc = 0, sprayAcc = 0;
  { const W = WATERFALL, N = 30, pos = [], uv = [], idx = [], lip = height(W.x, W.zTop); // queda: lábio de pedra no alto, cortina afastada da encosta no meio, alarga ao cair no poço
    // queda livre curta do lábio (sai da encosta), depois cascata sobre a rocha até o poço; dois véus laterais menores
    const lvl0 = journeyHeight(FALL_POOL.x, FALL_POOL.z) + .7, path = []; for (let i = 0; i <= N; i++) { const u = i / N, z = W.zTop + 1 - (W.zTop + 1 - (FALL_POOL.z + 7.5)) * u, slope = height(W.x, z), free = Math.max(0, 1 - u / .32), y = Math.max(lip + .6 - (lip - slope) * Math.min(1, u / .32) ** 1.6, slope + .9 + 1.6 * Math.sin(Math.PI * u) * (1 - free)); path.push({ x: W.x + Math.sin(u * 5.3) * .8, y: i === N ? lvl0 : y, z }); }
    // Mod 326: a queda termina ABAIXO da superfície do poço (sem ponta seca/triangular); largura e balanço variam no tempo
    path[N].y = lvl0 - .9; path[N].z -= .6;
    const main = makeFall(T, path, [1, 0], u => W.w * (.95 + .3 * u + .12 * Math.sin(u * 9)), 1.9, createFallMaterial(T, { time: fallT, speed: 7, sway: .3 }), low ? 7 : 10, [0, .4, -1]); main.name = 'jornada-cachoeira'; main.renderOrder = 3; gFall.add(main);
    // (sem véus laterais soltos: de frente eles viravam "braços" de um vulto; os filetes agora rompem da própria lâmina)
    const lvl = lvl0, impact = { x: W.x, z: FALL_POOL.z + 6.4 }, outA = Math.atan2(40 - FALL_POOL.z, -424 - FALL_POOL.x);
    fallParts.lvl = lvl; fallParts.impact = impact; waterMat.userData.water.uImp.value[0].set(impact.x, impact.z, 1, .32);
    const pool = new T.Mesh(poolGeometry(T, { x: FALL_POOL.x, z: FALL_POOL.z, r: FALL_POOL.r + 3.5, level: lvl, height, maxDepth: riverDepth, rings: low ? 10 : 14, segs: low ? 40 : 56,
      flowAt: (x, z) => { const dx = x - impact.x, dz = z - impact.z, d = Math.hypot(dx, dz) || 1, k = Math.exp(-d * .25); return [dx / d * .6 * k + Math.cos(outA) * .35 * (1 - k), dz / d * .6 * k + Math.sin(outA) * .35 * (1 - k)]; } }), waterMat);
    pool.renderOrder = 2; pool.name = 'jornada-poco'; gFall.add(pool);
    const lipRock = new T.Mesh(rockGeo, rockMat); lipRock.scale.set(W.w * .55, 2.2, 3); lipRock.position.set(W.x, lip - .4, W.zTop + 1.5); gFall.add(lipRock); // lábio de pedra de onde a água sai
    if (opts.softDot) for (let k = 0; k < 4; k++) { const s = new T.Sprite(new T.SpriteMaterial({ map: opts.softDot, color: 0xe8f2ff, transparent: true, opacity: .2, depthWrite: false })); s.position.set(W.x + (k - 1.5) * 2.4, lvl + 1.4 + k * .4, FALL_POOL.z + 3.5); s.scale.setScalar(5 + k); s.userData.k = k; gFall.add(s); fallParts.mist.push(s); }
    for (let k = 0; k < 16; k++) { const a = -.6 + k / 15 * (Math.PI * 2 - 1.6), r = FALL_POOL.r - .2 + hash(k, 1, 95) * 1.2, x = FALL_POOL.x + Math.cos(a) * r, z = FALL_POOL.z + Math.sin(a) * r * 1.0; if (Math.abs(Math.atan2(z - FALL_POOL.z, x - FALL_POOL.x) + 1.25) < .45) continue; rockSpots.push({ x, z, s: .55 + hash(k, 2, 96) * .9, dark: .5 }); } // pedras da borda (a saída do rio fica livre)
  }
  // Mod 325: pedra apoiada no ponto MAIS BAIXO da própria pegada (em encosta, o lado de baixo não fica no ar)
  for (const s of rockSpots) { const r = s.s * 1.05; let m = height(s.x, s.z); for (let a = 0; a < 6; a++) m = Math.min(m, height(s.x + Math.cos(a * 1.047) * r, s.z + Math.sin(a * 1.047) * r)); s.y = m; }
  rockColliders.length = 0; for (const s of rockSpots) { const h = s.y, top = h + s.s * .15 + s.s * .8 * rockTopK; rockColliders.push({ x: s.x, z: s.z, radius: s.s * 1.02, height: Math.max(.15, top - (h - .1)), base: h - .1, journey: 1 }); }

  /* ---------------- ponte pênsil do abismo ---------------- */
  const wood = new T.MeshStandardMaterial({ color: 0xffffff, roughness: .95, map: detail }), woodDark = new T.MeshStandardMaterial({ color: 0x3e2c1e, roughness: 1 }), rope = new T.MeshStandardMaterial({ color: 0x8a7656, roughness: 1 }), stone = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 1, map: stoneTex });
  const deckY = x => { const t = (BRIDGE.x0 - x) / (BRIDGE.x0 - BRIDGE.x1); return BRIDGE.y - BRIDGE.sag * Math.sin(Math.PI * Math.max(0, Math.min(1, t))); };
  { const L = BRIDGE.x0 - BRIDGE.x1, planks = Math.round(L / .42), board = new T.InstancedMesh(new T.BoxGeometry(.36, .07, BRIDGE.half * 2 + .3), wood, planks);
    for (let i = 0; i < planks; i++) { const x = BRIDGE.x0 - (i + .5) * L / planks; mx.position.set(x, deckY(x) - .04, BRIDGE.z + (hash(i, 1, 71) - .5) * .06); mx.rotation.set(0, (hash(i, 2, 72) - .5) * .05, (hash(i, 3, 73) - .5) * .05); mx.scale.set(1, 1, .96 + hash(i, 4, 74) * .08); mx.updateMatrix(); board.setMatrixAt(i, mx.matrix); C.setRGB(.42, .3, .2).multiplyScalar(.75 + hash(i, 5, 75) * .45); board.setColorAt(i, C); }
    board.name = 'jornada-ponte'; board.castShadow = true; board.receiveShadow = true; gBridge.add(board);
    const posts = Math.round(L / 4) + 1, post = new T.InstancedMesh(new T.BoxGeometry(.13, 1.3, .13), woodDark, posts * 2 + 2); let pi = 0;
    for (let i = 0; i < posts; i++) { const x = BRIDGE.x0 - i * L / (posts - 1); for (const sz of [-1, 1]) { mx.position.set(x, deckY(x) + .55, BRIDGE.z + sz * (BRIDGE.half + .05)); mx.rotation.set(0, 0, 0); mx.scale.set(1, 1, 1); mx.updateMatrix(); post.setMatrixAt(pi++, mx.matrix); } } post.count = pi; gBridge.add(post);
    const tube = (pts, r, m) => { const t = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 96, r, 5, false), m); gBridge.add(t); return t; };
    for (const sz of [-1, 1]) for (const hy of [1.05, .55]) { const pts = []; for (let i = 0; i <= 48; i++) { const x = BRIDGE.x0 - i * L / 48; pts.push(new T.Vector3(x, deckY(x) + hy, BRIDGE.z + sz * (BRIDGE.half + .08))); } tube(pts, .045, rope); }
    for (const sz of [-1, 1]) { const pts = []; for (let i = 0; i <= 48; i++) { const x = BRIDGE.x0 - i * L / 48; pts.push(new T.Vector3(x, deckY(x) - .2, BRIDGE.z + sz * (BRIDGE.half - .25))); } tube(pts, .11, woodDark); } // longarinas sob as tábuas
    // torres de madeira nas duas cabeceiras e cabos principais em catenária com pendurais até o corrimão
    const towerH = 6.2, cableY = x => { const t = (BRIDGE.x0 + 2 - x) / (BRIDGE.x0 - BRIDGE.x1 + 4); return BRIDGE.y + towerH - (towerH - 1.4) * Math.sin(Math.PI * Math.max(0, Math.min(1, t))) ** .8 - BRIDGE.sag * Math.sin(Math.PI * Math.max(0, Math.min(1, t))); };
    for (const x of [BRIDGE.x0 + 2, BRIDGE.x1 - 2]) { const gy = height(x, BRIDGE.z); for (const sz of [-1, 1]) { const p = new T.Mesh(new T.CylinderGeometry(.22, .28, BRIDGE.y + towerH - gy + .6, 7), woodDark); p.position.set(x, (BRIDGE.y + towerH + gy) / 2 - .3, BRIDGE.z + sz * (BRIDGE.half + .35)); p.castShadow = true; gBridge.add(p); addSolid({ x, z: BRIDGE.z + sz * (BRIDGE.half + .35), r: .32 }); }
      const beam = new T.Mesh(new T.BoxGeometry(.3, .3, BRIDGE.half * 2 + 1.2), woodDark); beam.position.set(x, BRIDGE.y + towerH - .2, BRIDGE.z); gBridge.add(beam);
      for (const sz of [-1, 1]) { const brace = new T.Mesh(new T.BoxGeometry(.14, 3.6, .14), woodDark); brace.position.set(x, BRIDGE.y + towerH - 1.8, BRIDGE.z + sz * (BRIDGE.half + .3)); brace.rotation.x = sz * .35; gBridge.add(brace); } }
    const hangers = new T.InstancedMesh(new T.CylinderGeometry(.018, .018, 1, 4), rope, 140); let hn = 0;
    for (const sz of [-1, 1]) { const pts = []; for (let i = 0; i <= 64; i++) { const x = BRIDGE.x0 + 2 - i * (L + 4) / 64; pts.push(new T.Vector3(x, cableY(x), BRIDGE.z + sz * (BRIDGE.half + .35))); } tube(pts, .06, rope);
      for (let x = BRIDGE.x0 - 2; x > BRIDGE.x1 + 2 && hn < 140; x -= 2) { const top = cableY(x), bot = deckY(x) + 1.05; if (top - bot < .25) continue; mx.position.set(x, (top + bot) / 2, BRIDGE.z + sz * (BRIDGE.half + .2)); mx.rotation.set(0, 0, 0); mx.scale.set(1, top - bot, 1); mx.updateMatrix(); hangers.setMatrixAt(hn++, mx.matrix); } }
    hangers.count = hn; gBridge.add(hangers);
    // encontros de pedra nas cabeceiras (blocos aparelhados que seguram a ponte na rocha)
    for (const [x, dir] of [[BRIDGE.x0 + 3.5, 1], [BRIDGE.x1 - 3.5, -1]]) { const gy = height(x, BRIDGE.z); for (const sz of [-1, 1]) { const b = new T.Mesh(new T.BoxGeometry(5, BRIDGE.y - gy + 2.6, 1.3), stone); b.position.set(x + dir * .5, (BRIDGE.y + gy) / 2 - .6, BRIDGE.z + sz * (BRIDGE.half + 1.4)); b.castShadow = true; gBridge.add(b); addSolid({ x: x + dir * .5, z: BRIDGE.z + sz * (BRIDGE.half + 1.4), box: true, ry: 0, hx: 2.5, hz: .65 }); } }
  }
  // blocos de rocha nas paredes do abismo: quebram a face lisa e dão massa ao penhasco (1 chamada)
  { const n = low ? 70 : 150, im = new T.InstancedMesh(rockGeo, new T.MeshStandardMaterial({ color: 0x2e2a2a, roughness: 1, map: detail }), n); let k = 0;
    for (let i = 0; i < n * 3 && k < n; i++) { const side = i % 2 ? 1 : -1, z = ABYSS.z0 + 20 + hash(i, 1, 81) * (ABYSS.z1 - ABYSS.z0 - 40); if (Math.abs(z - BRIDGE.z) < 7) continue; let x = side > 0 ? ABYSS.x1 : ABYSS.x0; for (let s2 = 0; s2 < 30; s2++) { if (inAbyss(x, z)) break; x -= side; }
      const y = -40 + hash(i, 2, 82) * 95, sc = 4 + hash(i, 3, 83) * 9; mx.position.set(x + side * sc * .35, y, z); mx.rotation.set(hash(i, 4, 84) * 3, hash(i, 5, 85) * 3, 0); mx.scale.set(sc * .6, sc * 1.3, sc); mx.updateMatrix(); im.setMatrixAt(k++, mx.matrix); }
    im.count = k; im.name = 'jornada-penhascos'; gAbyss.add(im); }
  // paredes do abismo com MATÉRIA: face de rocha projetada por ruído, estratos, veios úmidos e musgo no lado do vale
  // (cobre a face esticada do relevo, que tinha triângulos de centenas de metros e parecia um painel liso)
  { const NZ = low ? 110 : 190, NY = low ? 24 : 38, wallMat = new T.MeshStandardMaterial({ vertexColors: true, map: detail, roughness: 1, side: T.DoubleSide });
    for (const side of [1, -1]) { const pos = [], col = [], uv = [], idx = [];
      for (let j = 0; j <= NY; j++) for (let i = 0; i <= NZ; i++) { const z = ABYSS.z0 + 4 + (ABYSS.z1 - ABYSS.z0 - 8) * i / NZ, edge = side > 0 ? ABYSS.x1 + abyssEdge(z, 1) : ABYSS.x0 + abyssEdge(z, -1), rim = height(edge + side * 3, z) - .4, v = j / NY, y = rim - (rim - (ABYSS.fogY - 60)) * Math.pow(v, 1.2);
        const ledge = fbm2(z * .05, y * .045, 3, 151), d = (.8 + 4.2 * ledge + 1.6 * fbm2(z * .21, y * .17, 2, 153)) * smooth(0, .05, v), x = edge - side * d;
        pos.push(x, y, z); uv.push(z * .11, y * .11);
        const strata = .5 + .5 * Math.sin(y * .32 + fbm2(z * .03, y * .02, 2, 155) * 5), wet = smooth(.62, .8, fbm2(z * .3, y * .012, 2, 157)), moss = side > 0 ? smooth(.12, 0, v) * smooth(.45, .7, ledge) : 0;
        let c = mix3([.2, .19, .2], [.33, .31, .31], strata * .8 + ledge * .3); c = mix3(c, [.1, .1, .11], wet * .6 + v * .35); c = mix3(c, [.24, .32, .16], moss * .8); c = lin(c); col.push(c[0], c[1], c[2]); }
      for (let j = 0; j < NY; j++) for (let i = 0; i < NZ; i++) { const a = j * (NZ + 1) + i, b = a + 1, c = a + NZ + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new T.Float32BufferAttribute(col, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
      const m = new T.Mesh(g, wallMat); m.name = 'jornada-paredao-abismo'; m.receiveShadow = true; gAbyss.add(m); } }
  // névoa do abismo em camadas: as de cima com ruído e movimento, a de baixo opaca (o fundo nunca aparece, nem de dia)
  const abyssMat = new T.ShaderMaterial({ transparent: true, depthWrite: false, fog: false, uniforms: { uT: { value: 0 }, uC: { value: new T.Color(0x8a96a4) }, uA: { value: .96 }, uS: { value: 0 } },
    vertexShader: 'varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
    fragmentShader: 'uniform float uT,uA,uS;uniform vec3 uC;varying vec3 vW;float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}void main(){vec2 p=vW.xz*.022+uS*7.;float m=n(p+vec2(uT*.02,0.))*.6+n(p*2.3-vec2(0.,uT*.03))*.4;float w=smoothstep(.25,.85,m);gl_FragColor=vec4(uC*(.84+.3*m),uA<.999?uA*(.25+.75*w):1.);}' });
  const fogLayers = [];
  for (const [y, a, shade] of [[ABYSS.fogY + 34, .2, 1], [ABYSS.fogY + 18, .3, .92], [ABYSS.fogY + 2, .42, .84], [ABYSS.fogY - 16, .62, .74], [ABYSS.fogY - 36, 1, .58]]) { const mt = abyssMat.clone(); mt.uniforms.uA.value = a; mt.uniforms.uS.value = y * .013; const m = new T.Mesh(new T.PlaneGeometry(ABYSS.x1 - ABYSS.x0 + 80, ABYSS.z1 - ABYSS.z0 + 20).rotateX(-Math.PI / 2), mt); m.position.set((ABYSS.x0 + ABYSS.x1) / 2, y, (ABYSS.z0 + ABYSS.z1) / 2); m.renderOrder = a < 1 ? 1 : 0; m.name = 'jornada-nevoa-abismo'; m.userData.shade = shade; gAbyss.add(m); fogLayers.push(m); }
  // quedas d'água das paredes do abismo: nascem numa fenda da borda e somem na névoa (sem chão visível)
  for (const F of ABYSS_FALLS) { let x = F.side > 0 ? ABYSS.x1 + 30 : ABYSS.x0 - 30; for (let s2 = 0; s2 < 80; s2++) { if (inAbyss(x - F.side * .5, F.z)) break; x -= F.side * .5; }
    const top = height(x + F.side * 3, F.z) - .4, v0 = 3.2 + F.w * .06, path = []; // queda livre: sai da borda com velocidade e se afasta do paredão enquanto cai
    for (let i = 0; i <= 28; i++) { const t = i / 28 * 6.4, y = top - 4.9 * t * t; path.push({ x: x - F.side * (1.2 + v0 * t), y: Math.max(y, ABYSS.fogY - 70), z: F.z + Math.sin(t * .9) * 1.5 }); }
    const len0 = top - (ABYSS.fogY - 70), m = makeFall(T, path, [0, 1], u => F.w * (.75 + .8 * u), 2.4 + F.w * .06, createFallMaterial(T, { time: fallT, tint: [.7, .8, .9], alpha: .9, speed: 11, fade: [len0 * .62, len0 * .95], sway: .7 }), low ? 6 : 8, [-F.side, 0, 0]); m.renderOrder = 1; m.name = 'jornada-queda-abismo'; gAbyss.add(m);
    const lip = new T.Mesh(rockGeo, stone); lip.scale.set(3.2, 2.2, F.w * .62); lip.position.set(x + F.side * 1.6, top - .6, F.z); gAbyss.add(lip);
    if (opts.softDot) for (let k = 0; k < 3; k++) { const P = path[14 + k * 6], sp = new T.Sprite(new T.SpriteMaterial({ map: opts.softDot, color: 0xdfe8f2, transparent: true, opacity: .16 + k * .05, depthWrite: false })); sp.position.set(P.x, P.y, P.z); sp.scale.setScalar(F.w * (1.1 + k * .5)); gAbyss.add(sp); } } // névoa de gotículas que engole a queda
  /* ---------------- vulcão: malha própria até o avental do sopé ---------------- */
  const hazeU = { value: new T.Color(0x9aa6b4) }, glowU = { value: 1 }, coneFog = { value: new T.Vector2(46, 340) }, volcU = { value: new T.Vector3(V.x, V.z, V.r) }, lavaT = { value: 0 };
  const volcano = new T.Group(); volcano.name = 'jornada-vulcao'; root.add(volcano);
  const coneHaze = sh => { sh.uniforms.uHaze = hazeU; sh.uniforms.uFog = coneFog; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vDist;varying vec3 vWp;').replace('#include <project_vertex>', '#include <project_vertex>\nvDist=-mvPosition.z;vec4 wp4=vec4(transformed,1.);\n#ifdef USE_INSTANCING\nwp4=instanceMatrix*wp4;\n#endif\nvWp=(modelMatrix*wp4).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uHaze;uniform vec2 uFog;varying float vDist;varying vec3 vWp;').replace('#include <dithering_fragment>', '#include <dithering_fragment>\nfloat f=smoothstep(uFog.x,uFog.y*1.2,vDist)*(1.-.6*smoothstep(20.,180.,vWp.y-24.))*.62;gl_FragColor.rgb=mix(gl_FragColor.rgb,uHaze,f);'); }; // mesma bruma do cone para o que está nele
  { const A = low ? 176 : 288, R = low ? 56 : 84, RMAX = V.r * 1.15, pos = [], col = [], idx = [], uvs = []; // Mod 325: malha mais densa no sopé (de perto as facetas viravam "lâminas")
    for (let r = 0; r <= R; r++) for (let a = 0; a <= A; a++) { const rr = RMAX * Math.pow(r / R, .85), an = a / A * Math.PI * 2, x = V.x + Math.cos(an) * rr, z = V.z + Math.sin(an) * rr, h = journeyHeight(x, z) ?? (CITY2.y + volcanoHeight(x, z)), k = rr / V.r;
      pos.push(x, h, z); uvs.push(x * .07 + h * .02, z * .07 - h * .02); const n = fbm2(x * .03, z * .03, 3, 91), n2 = fbm2(x * .11, z * .11, 2, 97), ashK = smooth(.55, .25, k) * smooth(.35, .65, fbm2(x * .012, z * .012, 2, 95)), oxid = smooth(.42, .2, k) * smooth(.5, .7, n2);
      let c = [.25 + n * .1, .22 + n * .08, .2 + n * .07]; c = mix3(c, [.5, .47, .45], ashK * .8); c = mix3(c, [.3, .24, .21], oxid * .35); c = mix3(c, [.1, .09, .09], smooth(.6, .72, fbm2(x * .02 + z * .006, z * .02, 3, 99)) * .6 * smooth(.9, .5, k)); const gl = volcanoGully(an, rr) * smooth(.18, .4, k) * smooth(1, .62, k); c = mix3(c, [.07, .065, .065], gl * .6); c = mix3(c, [.46, .43, .41], smooth(.1, 0, gl) * .18 * smooth(.25, .5, k)); c = lin(c); col.push(c[0], c[1], c[2]); }
    for (let r = 0; r < R; r++) for (let a = 0; a < A; a++) { const p = r * (A + 1) + a, q = p + A + 1; idx.push(p, p + 1, q, p + 1, q + 1, q); } // Mod 325: faces para fora (antes a face da frente era descartada e via-se o avesso do lado de trás)
    { const base = R * (A + 1), sk = (R + 1) * (A + 1); for (let a = 0; a <= A; a++) { const k = (base + a) * 3; pos.push(pos[k], pos[k + 1] - 10, pos[k + 2]); uvs.push(uvs[(base + a) * 2], uvs[(base + a) * 2 + 1] + .5); col.push(col[k] * .7, col[k + 1] * .7, col[k + 2] * .7); }
      for (let a = 0; a < A; a++) { const p = base + a, q = sk + a; idx.push(p, p + 1, q, p + 1, q + 1, q); } } // saia: a borda do cone entra no chão (nenhuma fresta de céu na base, de nenhum ângulo)
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new T.Float32BufferAttribute(col, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2)); g.setIndex(idx); g.computeVertexNormals();
    const m = new T.MeshStandardMaterial({ vertexColors: true, roughness: .95, fog: false, map: detail, bumpMap: detail, bumpScale: 1.2 });
    m.onBeforeCompile = sh => { sh.uniforms.uHaze = hazeU; sh.uniforms.uGlowK = glowU; sh.uniforms.uFog = coneFog; sh.uniforms.uV = volcU; sh.uniforms.uLT = lavaT;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vDist;varying vec3 vWp;').replace('#include <project_vertex>', '#include <project_vertex>\nvDist=-mvPosition.z;vWp=(modelMatrix*vec4(transformed,1.)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform vec3 uHaze,uV;uniform float uGlowK,uLT;uniform vec2 uFog;varying float vDist;varying vec3 vWp;
float vh(float p){return fract(sin(p*91.7)*43758.5);}float vn(float x){float i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(vh(i),vh(i+1.),f);}
float chan(vec2 q,float a0,float w){float r=length(q),a=atan(q.y,q.x);float ac=a0+.08*sin(r*.045+a0*3.)+.05*(vn(r*.06+a0*7.)-.5);float d=abs(mod(a-ac+3.14159,6.28318)-3.14159)*r;return smoothstep(w,w*.15,d+(vn(r*.4+a0)-.5)*1.4);}`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
{vec2 q=vWp.xz-uV.xy;float k=length(q)/uV.z;float lane=chan(q,-.62,.8)*smoothstep(.78,.5,k)*smoothstep(.3,.42,k);float pulse=.75+.25*sin(uLT*.9+length(q)*.08);totalEmissiveRadiance+=vec3(1.,.28,.05)*lane*pulse*uGlowK*.0;}`)
        .replace('#include <dithering_fragment>', '#include <dithering_fragment>\nfloat f=smoothstep(uFog.x,uFog.y*1.2,vDist)*(1.-.6*smoothstep(20.,180.,vWp.y-24.))*.62;gl_FragColor.rgb=mix(gl_FragColor.rgb,uHaze,f);'); };
    patchAuroraGround(T, m, .6); const cone = new T.Mesh(g, m); cone.name = 'jornada-vulcao-cone'; cone.frustumCulled = false; cone.receiveShadow = true; volcano.add(cone); }
  // Mod 325 — afloramentos de basalto e escória nos flancos (quebram o "cone liso" e a silhueta de pirâmide), meio enterrados
  { const out = [], n = low ? 22 : 34; for (let k = 0; k < n * 4 && out.length < n; k++) { const a = hash(k, 1, 201) * 6.28, r = V.crater * 2.3 + hash(k, 2, 202) ** .7 * (V.r * .92 - V.crater * 2.3), x = V.x + Math.cos(a) * r, z = V.z + Math.sin(a) * r;
      if (Math.hypot(x - GATE2.x, z - GATE2.z) < 30) continue; out.push({ x, z, a, r, s: (6 + hash(k, 3, 203) * 12) * (1.2 - r / V.r * .5) }); }
    const om = new T.MeshStandardMaterial({ color: 0x2c2826, roughness: .9, map: detail, fog: false }); om.onBeforeCompile = coneHaze; const im = new T.InstancedMesh(rockGeo, om, out.length); out.forEach((o, i) => { const y = journeyHeight(o.x, o.z) ?? CITY2.y; mx.position.set(o.x, y - o.s * .5, o.z); mx.rotation.set((hash(i, 4, 204) - .5) * .8, o.a + hash(i, 5, 205), (hash(i, 6, 206) - .5) * .6); mx.scale.set(o.s * .8, o.s * .6, o.s * 1.15); mx.updateMatrix(); im.setMatrixAt(i, mx.matrix); });
    im.castShadow = false; im.receiveShadow = true; im.name = 'jornada-vulcao-afloramentos'; volcano.add(im); }
  const CF = craterFloor(), craterTop = new T.Vector3(V.x, journeyHeight(V.x + V.crater, V.z), V.z);
  const lavaSpec = { pools: [{ x: CF.x, z: CF.z, r: CF.r * .9, seed: 7.7, light: false }], channels: [] }; // lago da cratera: mesmo sistema de lava (contorno irregular)
  const smokeTex = opts.softDot || null;
  // Mod 325 — pluma do vulcão: nuvens "couve-flor" (textura própria de bolhas) que sobem da cratera, abrem em cogumelo e
  // derivam com o vento; a base é iluminada pela lava, o alto fica cinza-escuro. 9–14 sprites (um draw cada, sem luzes).
  const puffTex = canvasTex(T, 128, (g, S) => { const r = rngOf(131); g.clearRect(0, 0, S, S); for (let k = 0; k < 22; k++) { const a = r() * 6.28, d = r() * S * .26, x = S / 2 + Math.cos(a) * d, y = S / 2 + Math.sin(a) * d * .8, rr = S * (.12 + r() * .16), gr = g.createRadialGradient(x, y - rr * .3, rr * .1, x, y, rr); const v = 200 + r() * 55 | 0; gr.addColorStop(0, `rgba(${v},${v},${v},.85)`); gr.addColorStop(.6, `rgba(${v - 40},${v - 40},${v - 40},.45)`); gr.addColorStop(1, 'rgba(120,120,120,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill(); } }, false);
  const smoke = []; for (let i = 0; i < (low ? 9 : 14); i++) { const s = new T.Sprite(new T.SpriteMaterial({ map: puffTex, color: 0x6d625c, transparent: true, opacity: 0, depthWrite: false, fog: false })); s.userData.t = i / (low ? 9 : 14); s.userData.o = hash(i, 1, 99); s.material.rotation = hash(i, 2, 98) * 6.28; volcano.add(s); smoke.push(s); }
  const craterGlow = new T.Sprite(new T.SpriteMaterial({ map: smokeTex, color: 0xff6a24, transparent: true, opacity: .55, depthWrite: false, fog: false, blending: T.AdditiveBlending })); craterGlow.position.set(CF.x, CF.y + 8, CF.z); craterGlow.scale.setScalar(30); craterGlow.material.opacity = .32; /* Mod 325: sem sprite de brilho (de longe virava um "buraco iluminado"); a luz da lava fica no lago e na base da pluma */

  /* ---------------- entrada subterrânea no sopé, anel de basalto e terras de cinza ---------------- */
  const basalt = new T.MeshStandardMaterial({ color: 0x45403c, roughness: .95, map: detail });
  /* Mod 327 — boca de caverna escondida no flanco SUL, já atrás do cone (antes: pilares + lintel + plano negro na frente da
   * cidade, lido como "portal"). Garganta escavada com volume (tubo irregular, visto por dentro, que escurece até o breu),
   * maciço de basalto em volta (ombreiras, verga, domo que se funde à encosta), chão recortado na MESMA altura da física
   * (journeyHeight/caveCarve), calor fraco no fundo, fumaça rala, rocha gasta na soleira e pegadas na cinza pela trilha. */
  const caveFx = []; let caveGate = null;
  { const M = CAVE2.mouth, ca = Math.cos(CAVE2.a), sa = Math.sin(CAVE2.a), gy = height(M.x, M.z), gate = new T.Group(); gate.position.set(M.x, gy, M.z); gate.rotation.y = GATE2.face; gate.name = 'jornada-boca-caverna-vulcao'; root.add(gate); caveGate = gate;
    const W = (lx, lz) => ({ x: M.x + ca * lz - sa * lx, z: M.z + sa * lz + ca * lx }); // local (lx ao longo do flanco, lz para fora) → mundo
    { const L = 10, N = low ? 7 : 10, A = low ? 10 : 16, F = 3, pos = [], col = [], idx = [], ring = A + 1 + F;
      for (let k = 0; k <= N; k++) { const t = k / N, lz = .7 - t * L, hw = 2.55 - .55 * t, ht = 3.9 - 1.15 * t, fy = .03 + .06 * Math.min(0, lz), dark = Math.pow(1 - t, 1.7);
        const put = (x, y, floor) => { const n = fbm2(x * .9 + k * .7, y * .9 + lz * .3, 2, 333) - .5; pos.push(x * (1 + n * .35), y + (floor ? 0 : n * .45), lz + n * .4); const w = floor ? .55 : .42 + .25 * (fbm2(x * 2.1, y * 2.1 + lz, 2, 337)); col.push(Math.pow(w * dark + .05 * t * t * (floor ? 1 : .2), 2.2), Math.pow(w * .92 * dark + .012 * t * t, 2.2), Math.pow(w * .86 * dark, 2.2)); };
        for (let j = 0; j <= A; j++) { const a = j / A * Math.PI; put(Math.cos(a) * hw, fy + Math.sin(a) * ht, false); } // arco (direita → topo → esquerda)
        for (let j = 1; j <= F; j++) put(-hw + 2 * hw * j / (F + 1), fy, true); }                                  // chão (esquerda → direita)
      for (let k = 0; k < N; k++) for (let j = 0; j < ring; j++) { const a = k * ring + j, b = k * ring + (j + 1) % ring, c = a + ring, d = b + ring; idx.push(a, c, b, b, c, d); }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new T.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
      const throat = new T.Mesh(g, new T.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: T.DoubleSide, map: detail })); throat.name = 'jornada-garganta-caverna'; gate.add(throat);
      const cap = new T.Mesh(new T.CircleGeometry(3.2, 10), new T.MeshBasicMaterial({ color: 0x020101 })); cap.position.set(0, 1.2, .7 - L + .3); gate.add(cap); }
    const rocks = [], rock = (lx, lz, y, sx, sy, sz, ry = 0, rx = 0, solid = true) => { rocks.push([-lx, y, lz, sx, sy, sz, ry, rx]); if (solid) { const w = W(lx, lz); addSolid({ x: w.x, z: w.z, r: Math.min(sx, sz) * .85, top: gy + y + sy }); } }; // (instanciadas: 1 draw)
    /* grupo girado por GATE2.face: +z local aponta para fora do cone; lx do mundo (W) corresponde a −x local */
    rock(-4.3, -.9, -.4, 2.2, 4.6, 3.2, .3); rock(4.5, -1.3, -.5, 2.5, 5.2, 3.4, -.4);         // ombreiras no lábio
    rock(.2, -1.5, 3.45, 4.3, 1.9, 2.4, .1, .08, false); rock(0, -4.6, 3.05, 4.6, 2.2, 3, -.2, 0, false); rock(.4, -7.8, 2.55, 4.2, 2.4, 3.2, .5, 0, false); // verga e teto da garganta
    rock(0, -17.5, -1.5, 9.5, 8, 8.5, .7, 0, false);                                                 // domo que se funde à encosta (atrás do fundo)
    rock(-7.2, -4.5, -.8, 3.4, 4.2, 4.8, 1.1); rock(7.6, -5.2, -.9, 3.6, 3.8, 4.4, -.9);          // flancos
    rock(-6.4, 1.6, -.15, 1.4, 1, 1.2, .6); rock(6.1, 2.2, -.15, 1.1, .8, 1, 2.1);               // blocos soltos fora
    { const im = new T.InstancedMesh(rockGeo, basalt, rocks.length); rocks.forEach(([x, y, z, sx, sy, sz, ry, rx], i) => { mx.position.set(x, y, z); mx.rotation.set(rx, ry, 0); mx.scale.set(sx, sy, sz); mx.updateMatrix(); im.setMatrixAt(i, mx.matrix); }); im.castShadow = !low; im.receiveShadow = true; im.name = 'jornada-macico-caverna'; gate.add(im); }
    const sill = new T.Mesh(rockGeo, new T.MeshStandardMaterial({ color: 0x6d655e, roughness: .8, map: detail })); sill.scale.set(2.3, .22, 1.5); sill.position.set(-.1, -.12, 1.4); sill.receiveShadow = true; gate.add(sill); // soleira gasta (mais clara, polida pelos pés)
    // marca de calor na soleira e brilho fraco lá no fundo (só visível pela abertura)
    if (smokeTex) { const scorch = new T.Mesh(new T.PlaneGeometry(6.5, 7).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ map: smokeTex, color: 0x170b06, transparent: true, opacity: .7, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })); scorch.position.set(0, .05, .6); gate.add(scorch);
      const heat = new T.Sprite(new T.SpriteMaterial({ map: smokeTex, color: 0xff5a18, transparent: true, opacity: .2, depthWrite: false, blending: T.AdditiveBlending })); heat.position.set(0, .7, -6.2); heat.scale.set(3.6, 2.2, 1); gate.add(heat); heat.userData.heat = true; caveFx.push(heat);
      for (let k = 0; k < (low ? 2 : 3); k++) { const w = W((k - 1) * 1.6, -1.5 - k), sm = new T.Sprite(new T.SpriteMaterial({ map: smokeTex, color: 0xbab2aa, transparent: true, opacity: 0, depthWrite: false })); sm.userData = { x: w.x, z: w.z, y: gy + 4.2, t: k / 3 }; root.add(sm); caveFx.push(sm); } }
    // pegadas na cinza: trilha PARCIAL (trechos por ruído) e contínua só nos últimos ~55 m antes da boca
    { const steps = [], cum = [0]; for (let i = 1; i < TRAIL2.length; i++) cum.push(cum[i - 1] + Math.hypot(TRAIL2[i][0] - TRAIL2[i - 1][0], TRAIL2[i][1] - TRAIL2[i - 1][1])); const total = cum[cum.length - 2];
      for (let sd = 6, i = 0, side = 1; sd < total - 1; sd += .78, side = -side) { while (cum[i + 1] < sd) i++; const u = (sd - cum[i]) / (cum[i + 1] - cum[i]), a = TRAIL2[i], b = TRAIL2[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz), x = a[0] + dx * u - dz / l * side * .17, z = a[1] + dz * u + dx / l * side * .17;
        if (total - sd > 55 && fbm2(sd * .02, 3, 2, 341) < .5) continue; if (low && (steps.length & 1)) continue; steps.push({ x, z, a: Math.atan2(dx, dz) + (hash(steps.length, 1, 343) - .5) * .3 }); }
      const fg = new T.CircleGeometry(.12, 7).rotateX(-Math.PI / 2); fg.scale(1, 1, 2); const im = new T.InstancedMesh(fg, new T.MeshBasicMaterial({ color: 0x1d1916, transparent: true, opacity: .55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), steps.length);
      steps.forEach((f, i) => { mx.position.set(f.x, height(f.x, f.z) + .03, f.z); mx.rotation.set(0, f.a, 0); mx.scale.setScalar(1); mx.updateMatrix(); im.setMatrixAt(i, mx.matrix); }); im.name = 'jornada-pegadas-cinza'; root.add(im); } }
  { const ring = [], n = 26; for (let i = 0; i < n; i++) { const a = -.95 + i / (n - 1) * 1.9, r = V.block + 4 + hash(i, 1, 101) * 7, x = V.x + Math.cos(a) * r, z = V.z + Math.sin(a) * r; if (Math.hypot(x - GATE2.x, z - GATE2.z) < 9) continue; ring.push({ x, z, s: 1.1 + hash(i, 2, 102) * 1.7 }); }
    const im = new T.InstancedMesh(rockGeo, basalt, ring.length); ring.forEach((b, i) => { const y = height(b.x, b.z); mx.position.set(b.x, y - b.s * .15, b.z); mx.rotation.set((hash(i, 3, 103) - .5) * .6, hash(i, 4, 104) * 6.28, (hash(i, 5, 105) - .5) * .5); mx.scale.set(b.s * 1.3, b.s * 1.1, b.s); mx.updateMatrix(); im.setMatrixAt(i, mx.matrix); addSolid({ x: b.x, z: b.z, r: b.s * 1.1, top: y + b.s * 1.2 }); });
    im.castShadow = !low; im.name = 'jornada-basalto-sope'; root.add(im); }
  // Mod 325 — geologia do entorno do vulcão (fora das ruas): lâminas e colunas de basalto inclinadas, poucas poças de lava
  // incandescente com borda de crosta; distribuição por ruído (aglomerados), nunca em grade; as do caminhável são sólidas.
  { const blade = (() => { const g = new T.CylinderGeometry(.18, 1, 1, 5, 4), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = .75 + .5 * fbm2(x * 3 + y * 2, z * 3, 2, 171); p.setXYZ(i, x * k * (1.4 - (y + .5) * .5), y, z * k * .7); } g.translate(0, .5, 0); g.computeVertexNormals(); return g; })();
    const list = [], pools = [];
    for (let k = 0; k < 420 && list.length < (low ? 34 : 56); k++) { const x = -980 - hash(k, 1, 181) * 640, z = -260 + hash(k, 2, 182) * 400, vr = Math.hypot(x - V.x, z - V.z), cd = Math.hypot(x - CITY2.x, z - CITY2.z);
      if (!inJourney(x, z) || cd < CITY2.r + 16 || vr < V.block - 6 || onRoad(x, z, 9) || trailDistance(x, z) < 9 || fbm2(x * .018, z * .018, 2, 183) < .48 || Math.hypot(x - GATE2.x, z - GATE2.z) < 26) continue;
      const b = journeyBoundary(x, z), hgt = (b > 6 ? 7 : 3) + hash(k, 3, 184) * (b > 6 ? 13 : 6); list.push({ x, z, h: hgt, w: .9 + hash(k, 4, 185) * 1.6, a: hash(k, 5, 186) * 6.28, lean: (hash(k, 6, 187) - .5) * .5, solid: b < 6 }); }
    const im = new T.InstancedMesh(blade, basaltBlade, list.length); list.forEach((L, i) => { const y = height(L.x, L.z) - .6; mx.position.set(L.x, y, L.z); mx.rotation.set(L.lean, L.a, L.lean * .6); mx.scale.set(L.w, L.h, L.w); mx.updateMatrix(); im.setMatrixAt(i, mx.matrix); if (L.solid) addSolid({ x: L.x, z: L.z, r: L.w * .9, top: y + L.h }); });
    im.castShadow = !low; im.name = 'jornada-laminas-basalto'; root.add(im);
    for (let k = 0; k < 200 && pools.length < (low ? 6 : 10); k++) { const x = -1010 - hash(k, 7, 188) * 560, z = -230 + hash(k, 8, 189) * 330, cd = Math.hypot(x - CITY2.x, z - CITY2.z);
      if (!inJourney(x, z) || cd < CITY2.r + 20 || onRoad(x, z, 12) || trailDistance(x, z) < 12 || journeyBoundary(x, z) > 30 || Math.hypot(x - V.x, z - V.z) < V.block - 10 || list.some(L => Math.hypot(L.x - x, L.z - z) < 6)) continue; pools.push({ x, z, r: 2.2 + hash(k, 9, 190) * 3.5 }); }
    for (const P of pools) lavaSpec.pools.push({ x: P.x, z: P.z, r: P.r * .85, seed: P.x * .37 + P.z * .11 }); // Mod 326: contorno irregular, fluida, com dano (não é mais um sólido)
  }
  // fendas no chão de cinza: rachas escuras e poucas com brilho de magma; respiradouros de vapor
  const vents = [];
  { const crack = [], glow = []; for (let k = 0; k < 70; k++) { const x = -960 - hash(k, 1, 111) * 330, z = -150 + hash(k, 2, 112) * 180; if (!inJourney(x, z) || onRoad(x, z, 3.5) || Math.hypot(x - CITY2.x, z - CITY2.z) < CITY2.r + 6 || journeyBoundary(x, z) > 3) continue; const L = 3 + hash(k, 3, 113) * 9, a = hash(k, 4, 114) * 3.14; crack.push({ x, z, L, a, w: .25 + hash(k, 5, 115) * .4 }); if (hash(k, 6, 116) < .35 && x < -1000) glow.push({ x, z, L: L * .8, a, w: .12 }); }
    /* Mod 326: as antigas "fendas" (caixas pretas retas e faixas laranja aditivas) viraram canais de lava de verdade:
       nascem num respiradouro, descem o relevo com meandro e largura variável, crosta que corre e borda de basalto. */
    const avoid = (x, z) => !inJourney(x, z) || onRoad(x, z, 4.5) || trailDistance(x, z) < 5 || Math.hypot(x - CITY2.x, z - CITY2.z) < CITY2.r + 8 || journeyBoundary(x, z) > 4 || Math.hypot(x - GATE2.x, z - GATE2.z) < 22;
    for (const c of glow.slice(0, low ? 3 : 5)) { const ch = lavaChannelPath(height, c.x, c.z, { steps: low ? 18 : 26, step: 1.6, w0: 1.3 + (c.L % 1) * .9, seed: c.a * 3 + c.x * .01, avoid }); if (ch.pts.length > 5) lavaSpec.channels.push(ch); }
    if (smokeTex) for (let k = 0; k < (low ? 3 : 6); k++) { const c = glow[k * 2 % Math.max(1, glow.length)] || crack[k]; if (!c) break; const s = new T.Sprite(new T.SpriteMaterial({ map: smokeTex, color: 0xcfc8c0, transparent: true, opacity: 0, depthWrite: false })); s.userData = { x: c.x, z: c.z, y: height(c.x, c.z), t: k / 6 }; root.add(s); vents.push(s); } }

  const lavaSys = createLava(T, { height, time: lavaT, pools: lavaSpec.pools, channels: lavaSpec.channels, lowSpec: low }); root.add(lavaSys.group);

  /* ---------------- Cinzária ---------------- */
  const city = new T.Group(); city.name = 'cinzaria-mod321'; root.add(city);
  const L = cinzariaLayout(), LM = cinzariaLandmarks(L), lit = { wins: null, lamps: [], forge: null };
  const camBoxes = []; // caixas altas (casas/torre/portal) para o braço da câmera não entrar nos prédios
  { // calçamento de pedra vulcânica (um disco que segue o relevo, borda irregular misturada ao chão)
    const N = 56, RS = 48, pos = [], uv = [], cl = [], idx = []; pos.push(CITY2.x, height(CITY2.x, CITY2.z) + .05, CITY2.z); uv.push(0, 0); cl.push(1, 1, 1, 1);
    for (let r = 1; r <= 16; r++) for (let a = 0; a < N; a++) { const an = a / N * Math.PI * 2, edge = CITY2.r - 3 + (fbm2(Math.cos(an) * 3, Math.sin(an) * 3, 2, 121) - .5) * 8, rr = edge * r / 16, x = CITY2.x + Math.cos(an) * rr, z = CITY2.z + Math.sin(an) * rr; pos.push(x, height(x, z) + .05, z); uv.push((x - CITY2.x) / 6.4, (z - CITY2.z) / 6.4); cl.push(1, 1, 1, r < 14 ? 1 : r < 16 ? .6 : 0); }
    for (let a = 0; a < N; a++) idx.push(0, 1 + (a + 1) % N, 1 + a);
    for (let r = 1; r < 16; r++) for (let a = 0; a < N; a++) { const p = 1 + (r - 1) * N + a, p2 = 1 + (r - 1) * N + (a + 1) % N, q = p + N, q2 = p2 + N; idx.push(p, p2, q, p2, q2, q); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new T.Float32BufferAttribute(cl, 4)); g.setIndex(idx); g.computeVertexNormals();
    const m = new T.Mesh(g, new T.MeshStandardMaterial({ map: cobble, vertexColors: true, transparent: true, roughness: .95, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, depthWrite: true })); m.receiveShadow = true; m.renderOrder = 1; m.name = 'cinzaria-calcamento'; city.add(m); void RS; }
  { const box = new T.BoxGeometry(1, 1, 1);
    const stoneM = new T.MeshStandardMaterial({ color: 0xffffff, roughness: .95, map: stoneTex }), plasterM = new T.MeshStandardMaterial({ color: 0xffffff, roughness: .92, map: plasterTex }), beamM = new T.MeshStandardMaterial({ color: 0x3f2c1f, roughness: .95 }), plankM = new T.MeshStandardMaterial({ color: 0x6a4e34, roughness: .95, map: detail });
    const roofM = new T.MeshStandardMaterial({ color: 0xffffff, roughness: .85, side: T.DoubleSide, map: tileTex }), doorM = new T.MeshStandardMaterial({ color: 0x2c1e14, roughness: 1 }), winM = new T.MeshStandardMaterial({ color: 0x22160e, emissive: 0xffa04a, emissiveIntensity: .25 }), shutM = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 1 });
    const roofGeo = new T.BufferGeometry(); { const v = [-.5, 0, -.5, .5, 0, -.5, .5, 1, 0, -.5, 1, 0, .5, 0, .5, -.5, 0, .5, -.5, 1, 0, .5, 1, 0, -.5, 0, -.5, -.5, 1, 0, -.5, 0, .5, .5, 0, -.5, .5, 0, .5, .5, 1, 0]; roofGeo.setAttribute('position', new T.Float32BufferAttribute(v, 3));
      roofGeo.setAttribute('uv', new T.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, .5, 1, 1, 0, 0, 0, 1, 0, .5, 1], 2)); roofGeo.setIndex([0, 3, 1, 1, 3, 2, 4, 7, 5, 5, 7, 6, 8, 10, 9, 11, 13, 12]); roofGeo.computeVertexNormals(); }
    const ROOFS = [0x9a4c34, 0x4e4a4c, 0x7a3b2a, 0xa06a3c, 0x5c5a4a], SHUT = [0x3c5a4a, 0x5a3a2a, 0x2e4058, 0x6a5a3a];
    const lists = { stone: [], plaster: [], beam: [], plank: [], roof: [], door: [], win: [], chim: [], shut: [] };
    const put = (list, x, y, z, sx, sy, sz, ry, color) => list.push({ x, y, z, sx, sy, sz, ry, color });
    L.forEach((h, idx) => { const [hx, hz, w0, d0, fl0, ry] = h, st = cinzariaStyle(h, idx), inn = idx === LM.inn, smith = idx === LM.smith;
      const floors = inn ? 3 : fl0, w = inn ? w0 + 1.4 : st.kind === 'armazem' ? w0 + 1 : w0, d = d0;
      const y0 = Math.min(height(hx - 2, hz), height(hx + 2, hz), height(hx, hz - 2), height(hx, hz + 2)) - .15, fh = 2.8, base = st.kind === 'pedra' ? 0 : 1.1 + hash(idx, 1, 131) * .6, H = base + floors * fh - (st.kind === 'armazem' ? .4 : 0), c = Math.cos(ry), s = Math.sin(ry), loc = (lx, lz) => [hx + lx * c + lz * s, hz - lx * s + lz * c];
      const allStone = st.kind === 'pedra' || smith, wood = st.kind === 'armazem';
      put(lists.stone, hx, y0 + (allStone ? H / 2 : (base + .4) / 2), hz, w + .2, allStone ? H : base + .4, d + .2, ry);
      if (!allStone) { const groundH = fh - (st.kind === 'armazem' ? .4 : 0); put(wood ? lists.plank : lists.plaster, hx, y0 + base + groundH / 2, hz, w, groundH, d, ry);
        for (let f = 1; f < floors; f++) { const j = st.jetty ? .5 : 0; put(lists.plaster, hx, y0 + base + f * fh + fh / 2, hz, w + j * .4, fh, d + j, ry); put(lists.beam, hx, y0 + base + f * fh, hz, w + j * .4 + .12, .24, d + j + .12, ry); }
        for (const [lx, lz] of [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]]) { const [px, pz] = loc(lx, lz); put(lists.beam, px, y0 + (base + H) / 2, pz, .26, H - base, .26, ry); } }
      const pitch = st.pitch * Math.min(w, d) * .55 + .8, rw = w + .9 + (st.jetty ? .4 : 0), rd = d + .9 + (st.jetty ? .5 : 0); put(lists.roof, hx, y0 + H, hz, rw, pitch, rd, ry, ROOFS[st.roof]);
      put(lists.beam, hx, y0 + H + pitch, hz, rw + .1, .18, .18, ry);
      { const dw = smith || wood ? 2.6 : 1.2, [px, pz] = loc(0, d / 2 + .06); put(lists.door, px, y0 + (smith || wood ? 1.3 : 1.15), pz, dw, smith || wood ? 2.6 : 2.3, .14, ry); }
      const winY = (f) => y0 + base + f * fh + 1.35;
      for (let f = 0; f < floors; f++) for (const o of (w > 6.5 ? [-1, 0, 1] : [-1, 1])) { if (f === 0 && Math.abs(o) < .5) continue; const off = o * Math.min(w * .32, 2.3), [px, pz] = loc(off, d / 2 + .06 + (f > 0 && st.jetty ? .5 : 0)); put(lists.win, px, winY(f), pz, .72, .95, .1, ry);
        if (st.shutters > .4 && !allStone) for (const sd of [-1, 1]) { const [qx, qz] = loc(off + sd * .62, d / 2 + .1 + (f > 0 && st.jetty ? .5 : 0)); put(lists.shut, qx, winY(f), qz, .42, .98, .06, ry, SHUT[(idx + f) % SHUT.length]); } }
      if (st.chimney || smith || inn) { const [px, pz] = loc((hash(1, idx, 84) - .5) * w * .5, -d * .2); put(lists.chim, px, y0 + H + pitch * .6 + 1.2, pz, smith ? 1.1 : .7, 2.8, smith ? 1.1 : .7, ry); }
      const top = y0 + H + pitch; addSolid({ x: hx, z: hz, box: true, ry, hx: (w + .4) / 2, hz: (d + .4 + (st.jetty ? .5 : 0)) / 2, city: 1 }); camBoxes.push({ x: hx, z: hz, ry, hx: rw / 2 + .2, hz: rd / 2 + .2, top: top + .3 });
      if (smith) { const [px, pz] = loc(0, d / 2 + 1.6); lit.forge = { x: px, y: y0 + .9, z: pz, ry }; }
      if (inn) { const [px, pz] = loc(w / 2 + .1, d / 2 + .9); lit.sign = { x: px, y: y0 + base + fh + .5, z: pz, ry }; } });
    const inst = (geo, m, items, name, cast = !low) => { const im = new T.InstancedMesh(geo, m, Math.max(1, items.length)); items.forEach((it, i) => { mx.position.set(it.x, it.y, it.z); mx.rotation.set(0, it.ry || 0, 0); mx.scale.set(it.sx, it.sy, it.sz); mx.updateMatrix(); im.setMatrixAt(i, mx.matrix); if (it.color !== undefined) im.setColorAt(i, C.setHex(it.color)); }); im.count = items.length; im.castShadow = cast; im.receiveShadow = true; im.name = name; im.computeBoundingSphere(); city.add(im); return im; };
    inst(box, stoneM, lists.stone, 'cinzaria-pedra'); const pl = inst(box, plasterM, lists.plaster, 'cinzaria-reboco'); lists.plaster.forEach((p, i) => pl.setColorAt(i, C.setHex([0xf2ebdd, 0xe6dccb, 0xefe1c8, 0xdcd2c0, 0xe9d8c0][(hash(Math.round(p.x), Math.round(p.z), 81) * 5) | 0]))); if (pl.instanceColor) pl.instanceColor.needsUpdate = true;
    inst(box, beamM, lists.beam, 'cinzaria-madeira'); inst(box, plankM, lists.plank, 'cinzaria-tabuado'); inst(roofGeo, roofM, lists.roof, 'cinzaria-telhados'); inst(box, doorM, lists.door, 'cinzaria-portas', false); lit.wins = inst(box, winM, lists.win, 'cinzaria-janelas', false); inst(box, stoneM, lists.chim, 'cinzaria-chamines'); inst(box, shutM, lists.shut, 'cinzaria-venezianas', false);
    // praça: fonte, bancas, postes de lanterna e a torre do sino
    const P = CITY_PROPS, fy = height(P.fountain.x, P.fountain.z);
    /* Mod 327 — fonte inequívoca (antes: aro de toro + cilindro aberto + coluna lisa = "portal" de longe). Um só torno de
     * pedra (bacia baixa de borda larga, pedestal, taça superior e pináculo: silhueta clássica de chafariz, 1 draw),
     * espelho d'água na bacia e na taça e oito bicas caindo da taça para a bacia (1 draw instanciado). */
    { const R = P.fountain.r, v = (r, y) => new T.Vector2(r, y), prof = [v(R + .25, 0), v(R + .25, .52), v(R + .32, .6), v(R + .3, .7), v(R - .18, .7), v(R - .22, .2), v(.78, .18), v(.62, .34), v(.46, 1.05), v(.4, 1.32), v(.72, 1.44), v(1.12, 1.6), v(1.18, 1.72), v(1.06, 1.76), v(.96, 1.66), v(.32, 1.62), v(.24, 1.72), v(.17, 2.08), v(.3, 2.28), v(.13, 2.5), v(0, 2.62)];
      const ft = new T.Mesh(new T.LatheGeometry(prof, low ? 12 : 20), stoneM); ft.position.set(P.fountain.x, fy, P.fountain.z); ft.castShadow = !low; ft.receiveShadow = true; ft.name = 'cinzaria-fonte'; city.add(ft);
      const fw = new T.Mesh(new T.CircleGeometry(R - .2, 24).rotateX(-Math.PI / 2), water); fw.position.set(P.fountain.x, fy + .55, P.fountain.z); city.add(fw);
      const bw = new T.Mesh(new T.CircleGeometry(.98, 14).rotateX(-Math.PI / 2), water); bw.position.set(P.fountain.x, fy + 1.69, P.fountain.z); city.add(bw);
      const arc = new T.TubeGeometry(new T.QuadraticBezierCurve3(new T.Vector3(1.15, 1.72, 0), new T.Vector3(1.75, 1.7, 0), new T.Vector3(2.05, .55, 0)), 10, .04, 4, false);
      const jets = new T.InstancedMesh(arc, new T.MeshStandardMaterial({ color: 0xd8ecf6, emissive: 0x30424c, roughness: .1, transparent: true, opacity: .62, depthWrite: false }), 8);
      for (let i = 0; i < 8; i++) { mx.position.set(P.fountain.x, fy, P.fountain.z); mx.rotation.set(0, i / 8 * Math.PI * 2 + .2, 0); mx.scale.setScalar(1); mx.updateMatrix(); jets.setMatrixAt(i, mx.matrix); } jets.name = 'cinzaria-fonte-bicas'; city.add(jets);
      addSolid({ x: P.fountain.x, z: P.fountain.z, r: R + .35, city: 1, top: fy + .72 }); }
    const cloth = [0x8a2a24, 0x2e5a6a, 0xa07a2a, 0x5a3a6a, 0x7a3a22];
    { const parts = { counter: [], post: [], can: [] }; P.stalls.forEach(([x, z, ry], i) => { const y = height(x, z), c = Math.cos(ry), sn = Math.sin(ry), at = (lx, lz) => [x + lx * c + lz * sn, z - lx * sn + lz * c];
        parts.counter.push({ x, y: y + .45, z, sx: 2.4, sy: .9, sz: 1, ry }); for (const sx of [-1.1, 1.1]) for (const sz of [-.45, .45]) { const [px, pz] = at(sx, sz); parts.post.push({ x: px, y: y + 1.15, z: pz, sx: .1, sy: 2.3, sz: .1, ry }); }
        const [cx, cz] = at(0, .1); parts.can.push({ x: cx, y: y + 2.3, z: cz, sx: 2.7, sy: .06, sz: 1.5, ry, color: cloth[i % cloth.length] }); addSolid({ x, z, box: true, ry, hx: 1.35, hz: .65, city: 1 }); });
      inst(box, plankM, parts.counter, 'cinzaria-bancas'); inst(box, beamM, parts.post, 'cinzaria-bancas-postes'); inst(box, new T.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }), parts.can, 'cinzaria-toldos'); }
    const lampHead = new T.MeshStandardMaterial({ color: 0x2a2018, emissive: 0xffb056, emissiveIntensity: .3 });
    { const posts = [], heads = [], glow = []; for (const [x, z] of P.lamps) { const y = height(x, z); posts.push({ x, y: y + 1.6, z, sx: 1, sy: 1, sz: 1 }); heads.push({ x, y: y + 3.3, z, sx: 1, sy: 1, sz: 1 }); glow.push(x, y + 3.3, z); addSolid({ x, z, r: .25, city: 1 }); camBoxes.push({ x, z, ry: 0, hx: .35, hz: .35, top: y + 3.7 }); }
      inst(new T.CylinderGeometry(.08, .11, 3.2, 6), beamM, posts, 'cinzaria-postes'); inst(new T.BoxGeometry(.38, .5, .38), lampHead, heads, 'cinzaria-lanternas', false);
      const gg = new T.BufferGeometry(); gg.setAttribute('position', new T.Float32BufferAttribute(glow, 3)); const pm = new T.PointsMaterial({ map: smokeTex, color: 0xffb060, size: 2.6, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending }); const pts = new T.Points(gg, pm); pts.name = 'cinzaria-lanternas-brilho'; city.add(pts); lit.lampPts = pm; }
    lit.lampMat = lampHead;
    { const tw = P.tower, y = height(tw.x, tw.z), t = new T.Group(); t.position.set(tw.x, y, tw.z); city.add(t); const body = new T.Mesh(box, stoneM); body.scale.set(tw.w, tw.h, tw.w); body.position.y = tw.h / 2; t.add(body);
      const bel = new T.Mesh(box, plasterM); bel.scale.set(tw.w * .9, 3, tw.w * .9); bel.position.y = tw.h + 1.5; t.add(bel); const cap = new T.Mesh(new T.ConeGeometry(tw.w * .8, 3.4, 4), roofM); cap.rotation.y = Math.PI / 4; cap.position.y = tw.h + 4.7; t.add(cap);
      const bell = new T.Mesh(new T.CylinderGeometry(.35, .7, .9, 10, 1, true), new T.MeshStandardMaterial({ color: 0x8a6a34, metalness: .7, roughness: .4, side: T.DoubleSide })); bell.position.y = tw.h + 1.4; t.add(bell); addSolid({ x: tw.x, z: tw.z, box: true, ry: 0, hx: tw.w / 2 + .2, hz: tw.w / 2 + .2, city: 1 }); camBoxes.push({ x: tw.x, z: tw.z, ry: 0, hx: tw.w / 2 + .3, hz: tw.w / 2 + .3, top: y + tw.h + 6.5 }); }
    // forja da ferraria (brasa que acende a fachada à noite) e placa da estalagem
    if (lit.forge) { const F = lit.forge, g = new T.Group(); g.position.set(F.x, F.y - .9, F.z); g.rotation.y = F.ry; city.add(g); const hearth = new T.Mesh(box, stoneM); hearth.scale.set(1.6, .9, 1.1); hearth.position.y = .45; g.add(hearth);
      const coals = new T.Mesh(new T.BoxGeometry(1.1, .1, .7), new T.MeshBasicMaterial({ color: 0xff6a1a })); coals.position.y = .95; g.add(coals); const anvil = new T.Mesh(box, new T.MeshStandardMaterial({ color: 0x2c2c30, metalness: .6, roughness: .5 })); anvil.scale.set(.8, .55, .35); anvil.position.set(1.6, .3, .2); g.add(anvil);
      lit.forgeGlow = new T.Sprite(new T.SpriteMaterial({ map: smokeTex, color: 0xff7a2a, transparent: true, opacity: .5, depthWrite: false, blending: T.AdditiveBlending })); lit.forgeGlow.position.set(F.x, F.y + .4, F.z); lit.forgeGlow.scale.setScalar(4); city.add(lit.forgeGlow);
      const [sx, sz] = [F.x - Math.sin(F.ry) * .1, F.z - Math.cos(F.ry) * .1]; addSolid({ x: sx, z: sz, box: true, ry: F.ry, hx: 1.2, hz: .7, city: 1 }); }
    if (lit.sign) { const S = lit.sign, g = new T.Group(); g.position.set(S.x, S.y, S.z); g.rotation.y = S.ry; city.add(g); const arm = new T.Mesh(box, beamM); arm.scale.set(1.2, .1, .1); arm.position.x = .6; g.add(arm); const board = new T.Mesh(box, new T.MeshStandardMaterial({ color: 0x7a4a24, roughness: 1 })); board.scale.set(.9, .6, .06); board.position.set(.9, -.45, 0); g.add(board); }
    // barris, caixotes e canteiros encostados nas casas (nunca no meio da rua)
    const crates = [], barrels = [], bushes = []; L.forEach((h, i) => { const c = Math.cos(h[5]), s = Math.sin(h[5]); for (let k = 0; k < 2; k++) { const side = hash(i, k, 141) < .5 ? -1 : 1, lx = side * (h[2] / 2 + .7), lz = (hash(i, k, 142) - .5) * h[3] * .6, x = h[0] + lx * c + lz * s, z = h[1] - lx * s + lz * c; if (solidAt(x, z) || Math.abs(z - CITY2.z) < 4) continue; const r = hash(i, k, 143), y = height(x, z);
      if (r < .4) { crates.push({ x, y: y + .4, z, sx: .8, sy: .8, sz: .8, ry: h[5] + r }); addSolid({ x, z, r: .55, city: 1, top: y + .8 }); } else if (r < .75) { barrels.push({ x, y: y + .5, z, sx: 1, sy: 1, sz: 1, ry: 0 }); addSolid({ x, z, r: .45, city: 1, top: y + 1 }); } else bushes.push({ x, y: y + .35, z, sx: .9, sy: .7, sz: .9, ry: r * 6 }); } });
    inst(box, plankM, crates, 'cinzaria-caixotes'); inst(new T.CylinderGeometry(.4, .36, 1, 10), plankM, barrels, 'cinzaria-barris'); const bm = inst(new T.IcosahedronGeometry(.8, 1), new T.MeshStandardMaterial({ color: 0x4a5a2c, roughness: 1 }), bushes, 'cinzaria-canteiros'); void bm;
  }

  let vegAt = [1e9, 1e9], vegWait = 0, t = 0, active = false;
  return {
    root, volcano, city, craterTop, deckY, treePlan, rockColliders,
    /** px,pz: herói; camera; night 0..1; fog: cor da névoa do mundo; hidden: área interna (dimensão/vulcão). */
    update(dt, { px, pz, camera, night = 0, fog = null, hidden = false, eruption = 0 }) {
      t += dt; windU.value = t; lavaT.value = t; lavaSys.update(t, night); if (camera) horizonCam.value.copy(camera.position); fallT.value = t; for (const m of fogLayers) m.material.uniforms.uT.value = t;
      root.visible = !hidden; const near2 = px < -40 && px > JOURNEY_BOUNDS.x0 - 600; active = near2;
      if (hidden) return;
      if (near2) streamTiles(px, pz, 1);
      { const dB = Math.hypot(px - (BRIDGE.x0 + BRIDGE.x1) / 2, pz - BRIDGE.z), dC = Math.hypot(px - CITY2.x, pz - CITY2.z), dF = Math.hypot(px - WATERFALL.x, pz - WATERFALL.z);
        gBridge.visible = dB < 420; gAbyss.visible = dB < 520; gFall.visible = dF < 380; city.visible = dC < 460 && !cityGone; /* a cidade destruída no Ato II continua oculta */ for (const s of vents) s.visible = dC < 330; const dM = Math.hypot(px - CAVE2.mouth.x, pz - CAVE2.mouth.z); caveGate.visible = dM < 280; for (const s of caveFx) s.visible = dM < 240; }
      vegWait -= dt; if (near2 && vegWait <= 0 && (vegDirty || Math.hypot(px - vegAt[0], pz - vegAt[1]) > 24)) { vegDirty = false; vegWait = .35; vegAt = [px, pz]; fillInstances(px, pz); fillTreesAndRocks(px, pz); }
      if (scene.fog) coneFog.value.set(scene.fog.near, scene.fog.far);
      if (fog) { for (const m of fogLayers) m.material.uniforms.uC.value.copy(fog).lerp(C.setRGB(.86, .9, .96), .18 * (1 - night)).multiplyScalar(m.userData.shade * (1 - night * .35)); hazeU.value.copy(fog); }
      glowU.value = .55 + .45 * night + eruption * 2; liftU.value = .22 - .16 * night; // Mod 326: capim menos "aceso" (antes brilhava mais que o chão)
      { const lit = .35 + .65 * night; for (const s of smoke) { s.userData.t = (s.userData.t + dt * .011) % 1; const k = s.userData.t, o = s.userData.o, rise = k ** .75; // sobe rápido, abre e deriva com o vento no alto
          s.position.set(CF.x + Math.sin(k * 5 + o * 9) * (6 + 30 * k) + k * k * 160, craterTop.y + 4 + rise * 260, CF.z + Math.cos(k * 4 + o * 7) * (5 + 22 * k) + k * k * 40);
          s.scale.setScalar(34 + 260 * k ** .8); s.material.opacity = (.62 - .25 * k) * Math.min(1, k * 7) * (1 - smooth(.75, 1, k)); s.material.rotation += dt * (.02 + o * .03);
          s.material.color.setRGB(.36 + (1 - k) * .5 * lit * (1 - smooth(0, .35, k)) * 1.4, .32 + (1 - k) * .18 * lit * (1 - smooth(0, .35, k)), .3).multiplyScalar(.75 + .25 * (1 - night)); } }
      for (const s of caveFx) { const u = s.userData; if (!s.visible) continue; if (u.heat) { s.material.opacity = .16 + .06 * Math.sin(lavaT.value * 2.3) + .03 * Math.sin(lavaT.value * 7.1); continue; } u.t = (u.t + dt * .07) % 1; s.position.set(u.x + u.t * 1.5, u.y + u.t * 9, u.z); s.scale.setScalar(1.2 + u.t * 4.5); s.material.opacity = .14 * Math.sin(Math.PI * u.t); } // Mod 327: fumaça rala e calor da boca
      for (const s of vents) { const u = s.userData; u.t = (u.t + dt * .12) % 1; s.position.set(u.x + u.t * 2, u.y + .5 + u.t * 7, u.z); s.scale.setScalar(1.5 + u.t * 5); s.material.opacity = .22 * Math.sin(Math.PI * u.t); }
      { const wd = Math.max(riverDepth(px, pz), fallParts.lvl !== undefined && Math.hypot(px - FALL_POOL.x, pz - FALL_POOL.z) < FALL_POOL.r + 3 ? fallParts.lvl - height(px, pz) : 0), mv = Math.hypot(px - simLast[0], pz - simLast[1]) / Math.max(dt, 1e-3); simLast[0] = px; simLast[1] = pz;
        if (!hidden && (wd > .06 || gFall.visible)) { sim.follow(px, pz); const wy = height(px, pz) + wd;
          if (wd > .06) { simAcc += dt; if (mv > .4 && simAcc > .09) { simAcc = 0; sim.disturb(px, pz, -.035 - Math.min(mv, 7) * .006, .55 + Math.min(mv, 7) * .05); const n = mv > 4 ? 4 : 2; for (let k = 0; k < n; k++) { const a = Math.random() * 6.28, sp = .6 + Math.random() * (.8 + mv * .12); spray.emit(px + Math.cos(a) * .3, wy + .05, pz + Math.sin(a) * .3, Math.cos(a) * sp, 1.2 + Math.random() * (1 + mv * .15), Math.sin(a) * sp, .9, .09 + Math.random() * .06, wy); } } else if (simAcc > .8) { simAcc = 0; sim.disturb(px, pz, -.012, .5); } }
          if (gFall.visible && fallParts.impact) { const I = fallParts.impact, dC = camera ? Math.hypot(camera.position.x - I.x, camera.position.z - I.z) : 0; if (sim.inside(I.x, I.z)) for (let k = 0; k < 2; k++) sim.disturb(I.x + (Math.random() - .5) * WATERFALL.w * 1.2, I.z + (Math.random() - .5) * 2, -.04, .7);
            if (dC < 140) { sprayAcc += dt * (low ? 22 : 40); while (sprayAcc > 1) { sprayAcc--; const x = I.x + (Math.random() - .5) * WATERFALL.w * 1.4; spray.emit(x, fallParts.lvl + .1, I.z + (Math.random() - .5) * 2, (Math.random() - .5) * 2.4, 1.5 + Math.random() * 3.2, -.6 - Math.random() * 2.4, 1.1, .14 + Math.random() * .12, fallParts.lvl); } } }
          sim.step(dt); }
        spray.update(dt, (x, z, e) => sim.disturb(x, z, -Math.min(.03, e * .006), .4));
        if (fog) waterMat.userData.water.uSky.value.copy(fog).lerp(C.setRGB(.7, .82, .92), .35 * (1 - night)).multiplyScalar(1 - night * .55); }
      for (const s of fallParts.mist) { s.material.opacity = .14 + .07 * Math.sin(t * 1.3 + s.userData.k * 2); }
      if (lit.wins) lit.wins.material.emissiveIntensity = .04 + night * 1.8; if (lit.lampMat) lit.lampMat.emissiveIntensity = .3 + night * 2.2; if (lit.lampPts) lit.lampPts.opacity = night * .75;
      if (lit.forgeGlow) { lit.forgeGlow.material.opacity = .35 + .25 * night + .08 * Math.sin(t * 7) * Math.sin(t * 3.1); lit.forgeGlow.scale.setScalar(4 + night * 2.5); }
    },
    /** sólidos da jornada (casas, fonte, bancas, postes, torre, árvores, pilares da ponte, portal). y: pés do herói (sólidos baixos com topo deixam passar por cima). */
    /** Mod 326: 1 se (x,z) está dentro do contorno visível de lava (poça, canal ou cratera), 0 fora. */
    lavaHeat(x, z) { return lavaSys.heatAt(x, z); }, lavaSpec,
    solidAt, blockedAt(x, z, y = null) { return !!solidAt(x, z, y); }, setCityGone(v) { cityGone = !!v; if (cityGone) city.visible = false; },
    /** o ponto (x,y,z) do braço da câmera está dentro de um prédio da cidade (ou de um poste alto)? */
    camBlocked(x, y, z) { if (cityGone || Math.hypot(x - CITY2.x, z - CITY2.z) > CITY2.r + 12) return false; for (const o of camBoxes) { if (y > o.top) continue; const dx = x - o.x, dz = z - o.z, c = Math.cos(o.ry), s = Math.sin(o.ry), lx = dx * c - dz * s, lz = dx * s + dz * c; if (Math.abs(lx) < o.hx && Math.abs(lz) < o.hz) return true; } return false; },
    /** o jogo troca as copas simples pelas espécies do acervo (LOD/impostor) quando o GLB chega. */
    useSpeciesTrees() { speciesTrees = true; trunks.count = crowns.count = 0; trunks.visible = crowns.visible = false; },
    /** carrega o terreno em volta de um destino ANTES de posicionar o herói (teleporte/viagem). */
    prefetch(x, z) { streamTiles(x, z, 999, true); fillInstances(x, z); fillTreesAndRocks(x, z); vegAt = [x, z]; vegDirty = false; },
    stats() { let tris = 0; for (const tl of [...near.values(), ...far.values()]) tris += tl.mesh.geometry.index.count / 3; return { near: near.size, far: far.size, built, tris: Math.round(tris), grass: grass.count, flowers: flowers.count, trees: speciesTrees ? treePlan.length : trunks.count, speciesTrees, rocks: rocks.count, houses: L.length, active }; },
    get aurora() { return null; }
  };
}
