/**
 * MOD 292 — árvores tropicais autorais de Eldória (EldoriaArvoresTropicais.glb).
 * 5 espécies × 3 níveis: LOD0 (malha completa), LOD1 (mesmo esqueleto e mesmos tufos, menos cartões) e
 * LOD2 (impostor assado do próprio LOD0: 2 planos cruzados + topo, com mapa de normais para a luz do dia/noite).
 * Nada de troca de material por índice: cada nível usa o material do próprio GLB (mesmas texturas/UV de origem).
 *
 * Desenho: um InstancedMesh por espécie × nível × material (≤ 25 chamadas para toda a mata), com faixas de
 * distância exclusivas (nunca dois níveis da mesma árvore no mesmo quadro) e corte por setor/câmera do jogo.
 */
export const TROPICAL_TREES_URL = './EldoriaArvoresTropicais.glb';
export const TROPICAL_SPECIES = ['sumauma', 'copaLarga', 'figueira', 'palmeira', 'embauba'];
/** Faixas de distância (m) por perfil: [fim do LOD0, fim do LOD1, fim do impostor]. Espécies altas usam ×bandK. */
export const TROPICAL_BANDS = { low: [15, 44, 170], auto: [22, 60, 230], high: [28, 74, 270] };
export function speciesBandK(meta) { return Math.max(1, Math.min(1.6, (meta?.height || 15) / 18)); }

/** Shader da folhagem: normais de volume não invertem no verso (sem franja preta) + vento pela altura local. */
function foliageShader(THREE, material, windUniform, amp, key) {
  material.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_begin>', THREE.ShaderChunk.normal_fragment_begin.replace('normal *= faceDirection;', ''));
    if (windUniform && amp > 0) {
      shader.uniforms.uTropicalWind = windUniform;
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTropicalWind;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n#ifdef USE_INSTANCING\nfloat tw=clamp((position.y-2.5)*0.09,0.0,1.0);float tp=uTropicalWind*0.9+instanceMatrix[3].x*0.21+instanceMatrix[3].z*0.17;\ntransformed.x+=sin(tp+position.y*0.15)*' + amp.toFixed(3) + '*tw;transformed.z+=cos(tp*0.8+position.x*0.2)*' + (amp * .8).toFixed(3) + '*tw;\n#endif');
    }
  };
  material.customProgramCacheKey = () => key;
}

/** Impostor: some com pontilhado quando o plano fica de perfil (evita "disco" e "parede fina" ao girar a câmera). */
function impostorShader(THREE, material) {
  material.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nfloat tropHash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}')
      .replace('#include <normal_fragment_begin>', THREE.ShaderChunk.normal_fragment_begin.replace('normal *= faceDirection;', '') +
        '\n{float facing=abs(dot(normalize(vViewPosition),normalize(vNormal)));float keep=smoothstep(0.18,0.42,facing);if(tropHash(floor(gl_FragCoord.xy))>keep)discard;}');
  };
  material.customProgramCacheKey = () => 'mod292-tropical-impostor';
}

export function loadTropicalTrees(THREE, GLTFLoader, { url = TROPICAL_TREES_URL, windUniform = null, lowSpec = false } = {}) {
  return new Promise((resolve, reject) => new GLTFLoader().load(url, gltf => {
    try {
      const species = {}, mats = {};
      gltf.scene.updateMatrixWorld(true);
      for (const node of gltf.scene.children) {
        const ud = node.userData || {}; if (!ud.especie) continue;
        const sp = species[ud.especie] || (species[ud.especie] = { meta: null, lods: [] });
        if (ud.lod === 0) sp.meta = ud;
        const parts = {};
        node.traverse(o => { if (o.isMesh) { parts[o.material.name] = o.geometry; mats[o.material.name] = mats[o.material.name] || o.material; } });
        sp.lods[ud.lod] = parts;
      }
      // Materiais: os do próprio GLB (texturas sRGB pelo GLTFLoader), só com ajustes de shader/alfa.
      const bark = mats.Casca, leaves = mats.Folhas, imp = mats.Impostor;
      if (!bark || !leaves) throw new Error('GLB sem materiais Casca/Folhas');
      bark.vertexColors = true; bark.roughness = .95; bark.metalness = 0;
      leaves.vertexColors = true; leaves.alphaTest = .5; leaves.transparent = false; leaves.side = THREE.DoubleSide; leaves.roughness = 1; leaves.metalness = 0;
      foliageShader(THREE, leaves, windUniform, lowSpec ? .07 : .11, 'mod292-tropical-leaves');
      const leafDepth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: leaves.map, alphaTest: .5 });
      if (imp) { imp.alphaTest = .45; imp.transparent = false; imp.side = THREE.FrontSide; imp.roughness = 1; imp.metalness = 0; impostorShader(THREE, imp); }
      for (const t of [bark.map, leaves.map, imp?.map, imp?.normalMap]) if (t) { t.anisotropy = lowSpec ? 1 : 4; t.needsUpdate = true; }
      resolve({ species, materials: { bark, leaves, impostor: imp || null, leafDepth }, url });
    } catch (e) { reject(e); }
  }, undefined, reject));
}

/**
 * plan: [{ sp, x, y, z, rot, s, tint:[r,g,b] }] — y já é a cota do chão (a base das raízes fica levemente enterrada).
 * registerCull(mesh, raio, mantémPerto, raioMínimo) → objeto de corte (para mudar faixas no perfil gráfico).
 */
export function mountTropicalForest(THREE, lib, { group, plan, registerCull, lowSpec = false, profile = 'auto', name = 'tropical' }) {
  const root = new THREE.Group(); root.name = 'EldoriaTropicalForest-' + name; group.add(root);
  const dummy = new THREE.Object3D(), color = new THREE.Color(), meshes = [], cullers = [], obstacles = [], stats = { instances: plan.length, perSpecies: {}, triangles: [0, 0, 0] };
  const bands = TROPICAL_BANDS[profile] || TROPICAL_BANDS.auto;
  for (const id of TROPICAL_SPECIES) {
    const sp = lib.species[id], list = plan.filter(p => p.sp === id); if (!sp || !list.length) continue;
    stats.perSpecies[id] = list.length;
    const k = speciesBandK(sp.meta);
    const make = (geo, material, lod, part) => {
      if (!geo) return null;
      const m = new THREE.InstancedMesh(geo, material, list.length);
      list.forEach((p, i) => {
        dummy.position.set(p.x, p.y, p.z); dummy.rotation.set(0, p.rot || 0, 0); dummy.scale.setScalar(p.s || 1); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix);
        const t = p.tint || [1, 1, 1]; m.setColorAt(i, color.setRGB(t[0], t[1], t[2]));
      });
      m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; m.computeBoundingSphere();
      m.name = `${name}-${id}-lod${lod}-${part}`; m.userData.lod = lod; m.userData.species = id;
      m.castShadow = lod === 0 && !lowSpec; m.receiveShadow = lod < 2 && !lowSpec;
      if (part === 'leaves' && m.castShadow) m.customDepthMaterial = lib.materials.leafDepth;
      const tri = (geo.index ? geo.index.count : geo.attributes.position.count) / 3; stats.triangles[lod] += tri * list.length;
      root.add(m); meshes.push(m); return m;
    };
    const L0 = sp.lods[0], L1 = sp.lods[1], L2 = sp.lods[2];
    const near = [make(L0?.Casca, lib.materials.bark, 0, 'bark'), make(L0?.Folhas, lib.materials.leaves, 0, 'leaves')];
    const mid = [make(L1?.Casca, lib.materials.bark, 1, 'bark'), make(L1?.Folhas, lib.materials.leaves, 1, 'leaves')];
    const far = L2?.Impostor && lib.materials.impostor ? [make(L2.Impostor, lib.materials.impostor, 2, 'impostor')] : [];
    const band = (arr, lod) => { for (const m of arr) if (m && registerCull) { const c = registerCull(m, 1, 0, 0); if (c) { c.tropical = { lod, k }; cullers.push(c); } } };
    band(near, 0); band(mid, 1); band(far, 2);
    for (const p of list) obstacles.push({ x: p.x, z: p.z, radius: (sp.meta?.collision || .5) * (p.s || 1), height: (sp.meta?.height || 12) * (p.s || 1), tropical: id });
  }
  /** Aplica faixas do perfil (low/auto/high): LODs exclusivos [0,a) [a,b) [b,c), escalados pela altura da espécie. */
  function setProfile(next) {
    const b = TROPICAL_BANDS[next] || TROPICAL_BANDS.auto;
    for (const c of cullers) {
      const { lod, k } = c.tropical, a = b[0] * k, m = b[1] * k, f = b[2] * k;
      const [lo, hi] = lod === 0 ? [0, a] : lod === 1 ? [a, m] : [m, f];
      c.min2 = lo * lo; c.r2 = hi * hi; c.near2 = lod === 0 ? hi * hi : lod === 1 ? Math.min(hi, 18 * k) ** 2 : 0;
    }
    stats.profile = next; stats.bands = b;
  }
  setProfile(profile);
  return { root, meshes, obstacles, stats, setProfile };
}

/** Ruído de valor 2D determinístico (para manchas de espécies e clareiras). */
function vnoise(x, z, seed) {
  const h = (i, j) => { let n = (i * 374761393 + j * 668265263 + seed * 2246822519) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
  const xi = Math.floor(x), zi = Math.floor(z), fx = x - xi, fz = z - zi, sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz);
  const a = h(xi, zi), b = h(xi + 1, zi), c = h(xi, zi + 1), d = h(xi + 1, zi + 1);
  return a + (b - a) * sx + (c - a) * sz + (a - b - c + d) * sx * sz;
}

/**
 * Plano da mata densa: Poisson por espécie com espaçamento próprio (emergentes raras e afastadas; dossel médio;
 * palmeiras e embaúbas preenchendo bordas e clareiras), manchas de composição por ruído (sem "muro" repetido).
 * isFree(x,z,r) decide onde pode haver tronco (fora de ruas, casas, rio, ponte e do corredor de chegada).
 */
export function planTropicalBelt({ areas, isFree, seed = 2925, density = 1, rnd: rndIn }) {
  let s = seed >>> 0; const rnd = rndIn || (() => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; });
  const kinds = [
    { sp: 'sumauma', gap: 15, share: .07, s: [.8, 1.12] },
    { sp: 'figueira', gap: 9.5, share: .16, s: [.75, 1.15] },
    { sp: 'copaLarga', gap: 7.2, share: .37, s: [.78, 1.25] },
    { sp: 'embauba', gap: 5.2, share: .2, s: [.8, 1.2] },
    { sp: 'palmeira', gap: 4.6, share: .2, s: [.78, 1.18] },
  ];
  const out = [], cell = 4, grid = new Map(), key = (x, z) => Math.floor(x / cell) + ',' + Math.floor(z / cell);
  const clear = (x, z, gap) => {
    const r = Math.ceil(16 / cell), gx = Math.floor(x / cell), gz = Math.floor(z / cell);
    for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) { const l = grid.get((gx + i) + ',' + (gz + j)); if (!l) continue; for (const o of l) { const need = Math.max(gap, o.gap) * .5 + Math.min(gap, o.gap) * .5; if ((o.x - x) ** 2 + (o.z - z) ** 2 < need * need) return false; } }
    return true;
  };
  for (const area of areas) {
    const W = area.x1 - area.x0, H = area.z1 - area.z0, tries = Math.round(W * H / 6 * density);
    for (const kind of kinds) {
      const want = Math.round(tries * kind.share);
      for (let t = 0; t < want * 3; t++) {
        const x = area.x0 + rnd() * W, z = area.z0 + rnd() * H;
        const patch = vnoise(x / 26, z / 26, seed + kind.sp.length * 17);
        // manchas: cada espécie domina onde o seu ruído é alto (composição natural, sem distribuição uniforme)
        if (rnd() > .35 + patch * .9) continue;
        const gap = kind.gap * (.85 + rnd() * .3);
        if (!isFree(x, z, gap * .35) || !clear(x, z, gap)) continue;
        const o = { sp: kind.sp, x, z, gap, rot: rnd() * Math.PI * 2, s: kind.s[0] + rnd() * (kind.s[1] - kind.s[0]) };
        const v = .9 + rnd() * .16, warm = rnd() < .25 ? .06 : 0; o.tint = [v * (1 + warm), v, v * (1 - warm)];
        out.push(o); const kk = key(x, z); if (!grid.has(kk)) grid.set(kk, []); grid.get(kk).push(o);
      }
    }
  }
  return out;
}
