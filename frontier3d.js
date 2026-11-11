/**
 * Mod 311 — muralha montanhosa da fronteira (vale da serra) e boca da caverna.
 *
 * O pé do penhasco é gerado EXATAMENTE sobre FRONTIER_LINE — a mesma linha que a colisão usa (ascension-layout.js) —
 * então não existe parede invisível desalinhada nem rocha atravessável. Por cima, maciços MontanhaEldoria01.glb
 * instanciados (1 draw call) dão a silhueta monumental; a boca EntradaCavernaAto1.glb fica fundida no vão do penhasco,
 * sobre o terreno rebaixado em rampa, com o túnel escurecendo até o breu.
 */
import { FRONTIER_LINE, CAVE_MOUTH, insidePoly, fbm, hash2 } from './ascension-layout.js';

export function buildFrontier(THREE, { scene, groundHeightAt, GLTFLoader, registerCull, lowSpec = false, prepareBaked } = {}) {
  const group = new THREE.Group(); group.name = 'fronteira-serra'; scene.add(group);
  const m = CAVE_MOUTH, gapHalf = m.scale * .9;
  // ---------- penhasco contínuo (malha facetada, cor por vértice) ----------
  const L = FRONTIER_LINE, n = L.length, rows = lowSpec ? 9 : 13;
  const inward = [], arc = [0];
  for (let i = 0; i < n; i++) {
    const a = L[Math.max(0, i - 1)], b = L[Math.min(n - 1, i + 1)], tx = b[0] - a[0], tz = b[1] - a[1], l = Math.hypot(tx, tz) || 1;
    let nx = -tz / l, nz = tx / l; if (!insidePoly(L[i][0] + nx * 2, L[i][1] + nz * 2)) { nx = -nx; nz = -nz; }
    inward.push([nx, nz]); if (i) arc.push(arc[i - 1] + Math.hypot(L[i][0] - L[i - 1][0], L[i][1] - L[i - 1][1]));
  }
  const runs = []; let cur = [];
  for (let i = 0; i < n; i++) { const gap = Math.hypot(L[i][0] - m.x, L[i][1] - m.z) < gapHalf; if (gap) { if (cur.length > 1) runs.push(cur); cur = []; } else cur.push(i); }
  if (cur.length > 1) runs.push(cur);
  const pos = [], col = [], idx = [];
  const rock = new THREE.Color(), moss = new THREE.Color(0x5d7a33), dark = new THREE.Color(0x1d1b18), tmp = new THREE.Color();
  for (const run of runs) {
    const base = pos.length / 3;
    for (const i of run) {
      const [x, z] = L[i], [nx, nz] = inward[i], u = arc[i], g = groundHeightAt(x, z);
      const H = 15 + 13 * fbm(u * .013, 3.3, 811, 3) + 7 * Math.max(0, Math.sin(u * .023 + 1.3));
      const gully = Math.pow(Math.abs(Math.sin(u * .19 + 3 * fbm(u * .04, 1, 818, 2))), 6) * 2.6; // fendas verticais
      for (let r = 0; r <= rows; r++) {
        const v = r / rows, y0 = g - 2.2 + v * H;
        const strata = .55 * (fbm(u * .03, y0 * .32, 812, 2) - .5);
        const lump = (fbm(u * .11, y0 * .09, 813, 3) - .5) * 2, fine = (fbm(u * .45, y0 * .4, 819, 2) - .5);
        const back = H * (.05 * v + .42 * v * v) + (r === 0 ? 0 : (r === 1 ? Math.max(0, lump) * .7 : lump * 3.8 + strata * 2.2 + fine * 1.3 + gully));
        pos.push(x + nx * back, y0 + (r ? (fbm(u * .2, v * 5, 814, 2) - .5) * 1.4 : 0), z + nz * back);
        const k = hash2(i, r, 815);
        rock.setRGB(.74 + .2 * k, .72 + .17 * k, .68 + .14 * k).multiplyScalar(.75 + .35 * fbm(u * .03, y0 * .05, 816, 2));
        col.push(rock.r, rock.g, rock.b);
      }
    }
    for (let a = 0; a < run.length - 1; a++) for (let r = 0; r < rows; r++) {
      const i0 = base + a * (rows + 1) + r, i1 = i0 + rows + 1;
      idx.push(i0, i1, i0 + 1, i1, i1 + 1, i0 + 1);
    }
  }
  let cliffGeo = new THREE.BufferGeometry();
  cliffGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); cliffGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); cliffGeo.setIndex(idx);
  cliffGeo = cliffGeo.toNonIndexed(); cliffGeo.computeVertexNormals();
  // musgo nas saliências voltadas para cima e sombra de contato no pé (oclusão barata embutida na cor)
  { const p = cliffGeo.attributes.position, nr = cliffGeo.attributes.normal, c = cliffGeo.attributes.color;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); tmp.setRGB(c.getX(i), c.getY(i), c.getZ(i));
      const up = nr.getY(i), g = groundHeightAt(x, z), foot = Math.max(0, Math.min(1, (y - g) / 5));
      if (up > .45) tmp.lerp(moss, Math.min(1, (up - .45) * 2.2) * (.55 + .45 * fbm(x * .1, z * .1, 817, 2)));
      tmp.lerp(dark, (1 - foot) * .55); c.setXYZ(i, tmp.r, tmp.g, tmp.b); } }
  cliffGeo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(cliffGeo.attributes.position.count * 2), 2));
  const cliffMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .96, metalness: 0, color: 0x6f6a62 });
  /* Triplanar com a textura assada do próprio maciço (mesma rocha das montanhas): sem costura de UV na malha procedural. */
  function triplanar(tex) {
    cliffMat.map = tex; cliffMat.color.set(0xffffff); cliffMat.needsUpdate = true;
    cliffMat.onBeforeCompile = sh => {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vTpW; varying vec3 vTpN;')
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvTpW = (modelMatrix * vec4(transformed, 1.0)).xyz; vTpN = normalize(mat3(modelMatrix) * objectNormal);');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vTpW; varying vec3 vTpN;')
        .replace('#include <map_fragment>', `vec3 tpB = pow(abs(normalize(vTpN)), vec3(4.0)); tpB /= (tpB.x + tpB.y + tpB.z);
          vec3 tpP = vTpW * 0.045;
          vec4 tpC = texture2D(map, tpP.zy) * tpB.x + texture2D(map, tpP.xz + 0.37) * tpB.y + texture2D(map, tpP.xy + 0.71) * tpB.z;
          diffuseColor *= vec4(tpC.rgb * 1.35, 1.0);`);
    };
    cliffMat.customProgramCacheKey = () => 'penhasco-triplanar';
  }

  const cliff = new THREE.Mesh(cliffGeo, cliffMat); cliff.name = 'penhasco-fronteira'; cliff.receiveShadow = true; cliff.castShadow = false; group.add(cliff);
  // ---------- boca da caverna: túnel escurecendo até o breu (cartões pretos crescentes) e luz fria vinda de dentro ----------
  const tunnel = new THREE.Group(); tunnel.name = 'tunel-boca'; group.add(tunnel);
  const veilMat = d => new THREE.MeshBasicMaterial({ color: 0x010203, transparent: true, opacity: d, depthWrite: false, fog: false, side: THREE.DoubleSide });
  for (let k = 0; k < 5; k++) {
    const x = m.x - 5 - k * 2.6, card = new THREE.Mesh(new THREE.PlaneGeometry(m.width + 3, 9), veilMat(.2 + k * .14));
    card.position.set(x, mouthFloorAt(x) + 3.6, m.z); card.rotation.y = Math.PI / 2; card.renderOrder = 2; tunnel.add(card);
  }
  const back = new THREE.Mesh(new THREE.PlaneGeometry(m.width + 6, 11), new THREE.MeshBasicMaterial({ color: 0x000000, fog: false }));
  back.position.set(m.x - m.depth - .4, mouthFloorAt(m.x - m.depth) + 4, m.z); back.rotation.y = Math.PI / 2; tunnel.add(back);
  const coldLight = new THREE.PointLight(0x7fd8e8, 2.4, 15, 1.6); coldLight.name = 'boca-luz-fria'; coldLight.position.set(m.x - 7, m.floor + 2.6, m.z); tunnel.add(coldLight);
  function mouthFloorAt(x) { return m.floor - Math.max(0, Math.min(1, (m.x - x) / m.depth)) * m.drop; }
  // ---------- GLBs: maciços, fachada da boca, cristais e rochedos de transição ----------
  const loader = new GLTFLoader(), stats = { mountains: 0, cliffTris: cliffGeo.attributes.position.count / 3 };
  const loadGLB = url => new Promise((res, rej) => loader.load(url, g => res(g.scene), undefined, rej));
  const firstMesh = root => { let f = null; root.traverse(o => { if (!f && o.isMesh) f = o; }); return f; };
  const ready = Promise.all([loadGLB('./MontanhaEldoria01.glb'), loadGLB('./EntradaCavernaAto1.glb'), loadGLB('./CristalCaverna01.glb'), loadGLB('./RochedoMusgoEldoria.glb')]).then(([mont, ent, cri, roc]) => {
    for (const r of [mont, ent, cri, roc]) prepareBaked && prepareBaked(r);
    // maciços ao longo da linha, recuados para dentro da rocha (cobrem o topo do penhasco e a caixa do túnel)
    const mm = firstMesh(mont), spots = []; if (mm.material.map) triplanar(mm.material.map);
    for (let u = 6; u < arc[n - 1] - 4; u += 31 + 9 * hash2(Math.round(u), 1, 821)) {
      let i = 0; while (i < n - 1 && arc[i] < u) i++;
      const s = 62 + 46 * hash2(i, 2, 822), [x, z] = L[i], [nx, nz] = inward[i], back = s * .9 + 4; // base inteira atrás da linha
      spots.push({ x: x + nx * back, z: z + nz * back, s, yaw: hash2(i, 3, 823) * 6.283 });
    }
    // anel médio: maciços menores logo atrás do pé do penhasco — silhueta natural escondendo o topo da malha procedural
    for (let u = 3; u < arc[n - 1] - 2; u += 13 + 7 * hash2(Math.round(u), 8, 828)) {
      let i = 0; while (i < n - 1 && arc[i] < u) i++; const [x, z] = L[i]; if (Math.hypot(x - m.x, z - m.z) < gapHalf + 3) continue;
      const s = 22 + 16 * hash2(i, 9, 829), [nx, nz] = inward[i], back = s * .62 + 3;
      spots.push({ x: x + nx * back, z: z + nz * back, s, yaw: hash2(i, 10, 830) * 6.283, lift: .18 });
    }
    const inst = new THREE.InstancedMesh(mm.geometry, mm.material, spots.length), o = new THREE.Object3D();
    spots.forEach((p, i) => { o.position.set(p.x, groundHeightAt(p.x, p.z) - p.s * (p.lift || .12), p.z); o.rotation.set(0, p.yaw, 0); o.scale.set(p.s, p.s * (.78 + .3 * hash2(i, 4, 824)), p.s); o.updateMatrix(); inst.setMatrixAt(i, o.matrix); });
    inst.name = 'macicos-fronteira'; inst.castShadow = false; inst.receiveShadow = true; inst.instanceMatrix.needsUpdate = true; group.add(inst);
    if (registerCull) registerCull(inst, 900, 120); stats.mountains = spots.length;
    // fachada da boca: o GLB tem o arco em +Z; giramos para +X (vale). x_w = px + z_l·s ; z_w = pz − x_l·s
    const S = m.scale, face = ent; face.scale.setScalar(S); face.rotation.y = Math.PI / 2;
    face.position.set(m.x - m.glb.front * S, m.floor - m.glb.base * S - .35, m.z + m.glb.lateral * S);
    face.traverse(q => { if (q.isMesh) { q.castShadow = true; q.receiveShadow = true; } }); face.name = 'boca-caverna'; group.add(face);
    // cristais na soleira (prenúncio da gruta): emissivo, sem luz extra
    const cm = firstMesh(cri); cm.material.emissive = new THREE.Color(0x6a4cff); cm.material.emissiveMap = cm.material.map; cm.material.emissiveIntensity = .55;
    for (const [dx, dz, s, yaw] of [[-3.2, 2.6, .9, .4], [-6.4, -2.75, .7, 2.2], [-1.2, -3.6, .55, 4.1]]) {
      const c = cri.clone(); c.scale.setScalar(s); c.rotation.y = yaw; const x = m.x + dx, z = m.z + dz; c.position.set(x, mouthFloorAt(x) + .55 * s - .2, z); tunnel.add(c);
    }
    // rochedos de transição no pé da fachada e do penhasco (sem invadir a folga de colisão)
    const rm = firstMesh(roc), rocks = [];
    for (const side of [-1, 1]) rocks.push({ x: m.x + 1.2, z: m.z + side * (S * .9 + 1.4), s: 3.6 });
    for (let u = 14; u < arc[n - 1]; u += 23 + 14 * hash2(Math.round(u), 5, 825)) {
      let i = 0; while (i < n - 1 && arc[i] < u) i++; const [x, z] = L[i]; if (Math.hypot(x - m.x, z - m.z) < gapHalf + 6) continue;
      const s = 2.2 + 2.6 * hash2(i, 6, 826), [nx, nz] = inward[i], r = s * .95; rocks.push({ x: x + nx * (r + .2), z: z + nz * (r + .2), s });
    }
    const ri = new THREE.InstancedMesh(rm.geometry, rm.material, rocks.length);
    rocks.forEach((p, i) => { o.position.set(p.x, groundHeightAt(p.x, p.z) + p.s * .22, p.z); o.rotation.set(0, hash2(i, 7, 827) * 6.283, 0); o.scale.setScalar(p.s); o.updateMatrix(); ri.setMatrixAt(i, o.matrix); });
    ri.name = 'rochedos-fronteira'; ri.receiveShadow = true; group.add(ri); if (registerCull) registerCull(ri, 260, 40);
    stats.rocks = rocks.length;
    return stats;
  });
  return { group, cliff, ready, stats, mouthFloorAt, coldLight };
}
