/**
 * MOD 291 — Prado da queda (roteiro v1, Cena P0) e a estrada de Teren.
 *
 * Referência do criador: campo ensolarado aberto, rochedos enormes cobertos de musgo, flores brancas e
 * amarelas, trilha de terra e montanhas ao fundo; nada de mata colada nem cidade à vista.
 * Tudo é geometria procedural própria e instanciada (poucos draw calls): rochedos deformados por ruído com
 * musgo pela normal, tufos de capim com vento, flores em manchas e vestígios de saque na estrada
 * (roda quebrada, sacos vazios). Nenhum asset de terceiros.
 */

function hash(x, z, s = 1) { const v = Math.sin(x * 127.1 + z * 311.7 + s * 74.7) * 43758.5453; return v - Math.floor(v); }
function vnoise(x, z, s) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, u = fx * fx * (3 - 2 * fx), w = fz * fz * (3 - 2 * fz);
  const a = hash(ix, iz, s), b = hash(ix + 1, iz, s), c = hash(ix, iz + 1, s), d = hash(ix + 1, iz + 1, s);
  return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w;
}
export function makeRng(seed) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }

/** Rochedo arredondado e erodido: base achatada, faces irregulares, musgo no topo e líquen nas laterais. */
export function boulderGeometry(THREE, seed = 1, detail = 3) {
  const g = new THREE.IcosahedronGeometry(1, detail), p = g.attributes.position, v = new THREE.Vector3();
  const cols = new Float32Array(p.count * 3), moss = new THREE.Color(0x56703a), mossDark = new THREE.Color(0x3a5230), stone = new THREE.Color(0x8a8a84), stoneDark = new THREE.Color(0x5d5f5c), lichen = new THREE.Color(0xa8a37e), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize();
    const n = vnoise(v.x * 2.1 + seed, v.z * 2.1 - seed, seed) * .55 + vnoise(v.x * 5.3 + v.y * 3, v.z * 5.3, seed + 3) * .22;
    let r = .78 + n * .42;
    const y = v.y < -.25 ? -.25 - (v.y + .25) * .18 : v.y; // base achatada (assenta no chão, sem flutuar)
    v.set(v.x * r * 1.08, y * r * .82, v.z * r);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  const nrm = g.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    const ny = nrm.getY(i), x = p.getX(i), y = p.getY(i), z = p.getZ(i), n = vnoise(x * 3.7 + seed, z * 3.7 + y * 2, seed + 9);
    const mossAmt = Math.min(1, Math.max(0, (ny - .28 + (n - .5) * .5) * 2.6));
    c.copy(stoneDark).lerp(stone, Math.min(1, Math.max(0, .45 + y * .5 + (n - .5) * .4)));
    if (n > .72 && ny < .5) c.lerp(lichen, .45);
    c.lerp(n > .5 ? moss : mossDark, mossAmt);
    const ao = Math.min(1, .62 + (y + .25) * .6); // oclusão barata na base
    cols[i * 3] = c.r * ao; cols[i * 3 + 1] = c.g * ao; cols[i * 3 + 2] = c.b * ao;
  }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  g.computeBoundingSphere();
  return g;
}

/** Tufo de capim: 6 lâminas finas com gradiente base escura → ponta clara. */
export function grassTuftGeometry(THREE) {
  const pos = [], col = [], base = [.16, .27, .1], tip = [.55, .66, .3];
  for (let b = 0; b < 6; b++) {
    const a = b / 6 * Math.PI * 2 + b * .7, r = .05 + (b % 3) * .03, lean = .12 + (b % 2) * .1, h = .45 + (b % 3) * .16, w = .028;
    const cx = Math.cos(a) * r, cz = Math.sin(a) * r, tx = cx + Math.cos(a) * lean, tz = cz + Math.sin(a) * lean, px = -Math.sin(a) * w, pz = Math.cos(a) * w;
    pos.push(cx - px, 0, cz - pz, cx + px, 0, cz + pz, tx, h, tz);
    col.push(...base, ...base, ...tip);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  // Normais para cima: o capim recebe luz como o chão e não "pisca" conforme o ângulo.
  const n = g.attributes.normal; for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0);
  g.computeBoundingSphere(); return g;
}

/** Flor silvestre: haste + 5 pétalas + miolo (uma geometria por cor de pétala). */
export function flowerGeometry(THREE, petal = [.95, .95, .9], center = [.95, .78, .2]) {
  const pos = [], col = [], stem = [.24, .38, .15], H = .34;
  pos.push(-.008, 0, 0, .008, 0, 0, 0, H, 0); col.push(...stem, ...stem, ...stem);
  for (let k = 0; k < 5; k++) {
    const a0 = k / 5 * Math.PI * 2, a1 = a0 + .55, a2 = a0 - .55, R = .085;
    pos.push(0, H + .01, 0, Math.cos(a1) * R, H + .02, Math.sin(a1) * R, Math.cos(a2) * R, H + .02, Math.sin(a2) * R);
    col.push(...center, ...petal, ...petal);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const n = new Float32Array(pos.length); for (let i = 1; i < n.length; i += 3) n[i] = 1; g.setAttribute('normal', new THREE.BufferAttribute(n, 3));
  g.computeBoundingSphere(); return g;
}

/** Plano de distribuição puro (testável sem WebGL). */
export function planMeadow({ meadow, road, fall, wheel, stop, lowSpec = false, isFree = () => true, seed = 2911 }) {
  const rnd = makeRng(seed), boulders = [], tufts = [], flowers = [];
  const inM = (x, z, pad = 0) => { const qx = (x - meadow.cx) / (meadow.hx + pad), qz = (z - meadow.cz) / (meadow.hz + pad); return qx * qx + qz * qz; };
  const roadDist = (x, z) => { let best = Infinity; for (let i = 1; i < road.length; i++) { const a = road[i - 1], b = road[i], dx = b[0] - a[0], dz = b[1] - a[1], L = dx * dx + dz * dz, t = L ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L)) : 0; best = Math.min(best, Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t)); } return best; };
  // Rochedos altos: grupos que enquadram o ponto da queda (P0) e a orla do campo.
  const anchors = [[fall.x - 9, fall.z + 4, 4.6], [fall.x + 8.5, fall.z + 7, 3.8], [fall.x - 4, fall.z + 13, 3.1], [fall.x + 15, fall.z - 6, 5.2], [fall.x - 17, fall.z - 8, 4.2]];
  for (let i = 0; i < 26; i++) {
    const a = rnd() * Math.PI * 2, k = .72 + rnd() * .3;
    anchors.push([meadow.cx + Math.cos(a) * meadow.hx * k, meadow.cz + Math.sin(a) * meadow.hz * k, 1.6 + rnd() * 3.4]);
  }
  for (const [x, z, r] of anchors) {
    if (roadDist(x, z) < r + 3.2 || Math.hypot(x - fall.x, z - fall.z) < r + 3.5 || Math.hypot(x - stop.x, z - stop.z) < r + 6) continue;
    if (boulders.some(b => Math.hypot(b.x - x, b.z - z) < b.r + r + .8)) continue;
    boulders.push({ x, z, r, sy: .62 + rnd() * .34, rot: rnd() * Math.PI * 2, v: (rnd() * 3) | 0 });
    // Satélites: pedras menores ao pé dos grandes, como na referência.
    const sats = 1 + ((rnd() * 3) | 0);
    for (let s = 0; s < sats; s++) { const aa = rnd() * Math.PI * 2, rr = r * (.25 + rnd() * .22), d = r + rr * .6; const sx = x + Math.cos(aa) * d, sz = z + Math.sin(aa) * d; if (roadDist(sx, sz) > rr + 2.2) boulders.push({ x: sx, z: sz, r: rr, sy: .55 + rnd() * .3, rot: rnd() * 6.28, v: (rnd() * 3) | 0 }); }
  }
  const nT = lowSpec ? 1500 : 3000, nF = lowSpec ? 1300 : 2600;
  for (let i = 0; i < nT * 2 && tufts.length < nT; i++) {
    const x = meadow.cx + (rnd() * 2 - 1) * (meadow.hx + 6), z = meadow.cz + (rnd() * 2 - 1) * (meadow.hz + 6);
    if (inM(x, z, 6) > 1 || roadDist(x, z) < 2.1 || !isFree(x, z)) continue;
    if (boulders.some(b => Math.hypot(b.x - x, b.z - z) < b.r * .92)) continue;
    tufts.push({ x, z, s: .7 + rnd() * .9, rot: rnd() * 6.28 });
  }
  for (let i = 0; i < nF * 3 && flowers.length < nF; i++) {
    const x = meadow.cx + (rnd() * 2 - 1) * meadow.hx, z = meadow.cz + (rnd() * 2 - 1) * meadow.hz;
    const patch = vnoise(x * .09, z * .09, 77);
    if (inM(x, z) > 1 || rnd() > (patch - .3) * 2.2 || roadDist(x, z) < 2.4 || !isFree(x, z)) continue;
    if (boulders.some(b => Math.hypot(b.x - x, b.z - z) < b.r)) continue;
    flowers.push({ x, z, s: 1.1 + rnd() * .8, rot: rnd() * 6.28, tilt: (rnd() - .5) * .5, yellow: vnoise(x * .21, z * .21, 5) > .55 });
  }
  const debris = [{ kind: 'wheel', x: wheel.x, z: wheel.z, rot: .7 }, { kind: 'sack', x: wheel.x + 1.6, z: wheel.z - 1.1, rot: .3 }, { kind: 'sack', x: wheel.x - 1.2, z: wheel.z + 2.3, rot: 1.9 }, { kind: 'plank', x: wheel.x + .6, z: wheel.z + 1.4, rot: 2.4 }];
  return { boulders, tufts, flowers, debris };
}

export function buildPrologueMeadow(THREE, o) {
  const { scene, groundHeightAt, lowSpec, addWind, registerCull, rockObstacles = [] } = o;
  const plan = planMeadow(o);
  const group = new THREE.Group(); group.name = 'prologue-meadow-mod291'; scene.add(group);
  const dummy = new THREE.Object3D();
  // Rochedos: 3 variações instanciadas, vértice colorido (musgo/pedra/líquen), sombra seletiva só nos grandes.
  const stoneMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .93, metalness: 0, flatShading: false });
  // Rochedos grandes usam malha mais fina (silhueta arredondada da referência); os pequenos, a grossa.
  const geos = [0, 1, 2].map(i => [boulderGeometry(THREE, 11 + i * 7, 2), boulderGeometry(THREE, 11 + i * 7, 3)]);
  for (let key = 0; key < 6; key++) {
    const v = key % 3, big = key >= 3, list = plan.boulders.filter(b => b.v === v && (b.r > 2.3) === big); if (!list.length) continue;
    const m = new THREE.InstancedMesh(geos[v][big ? 1 : 0], stoneMat, list.length);
    list.forEach((b, i) => {
      const y = groundHeightAt(b.x, b.z) - b.r * .14;
      dummy.position.set(b.x, y + b.r * b.sy * .2, b.z); dummy.rotation.set(0, b.rot, 0); dummy.scale.set(b.r, b.r * b.sy, b.r * (.85 + (i % 3) * .08)); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix);
      rockObstacles.push({ x: b.x, z: b.z, radius: b.r * .9, height: b.r * b.sy * 1.05, base: y });
    });
    m.castShadow = !lowSpec || big; m.receiveShadow = true; m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); m.name = 'meadow-boulders-' + (big ? 'big-' : 'small-') + v; group.add(m);
  }
  const grassMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide });
  if (addWind) addWind(grassMat, .09, 'clamp(position.y*2.0,0.0,1.0)', 1.1, 'mod291-meadow-grass');
  const tuft = new THREE.InstancedMesh(grassTuftGeometry(THREE), grassMat, Math.max(1, plan.tufts.length));
  plan.tufts.forEach((t, i) => { dummy.position.set(t.x, groundHeightAt(t.x, t.z) - .02, t.z); dummy.rotation.set(0, t.rot, 0); dummy.scale.set(t.s, t.s * (.8 + (i % 5) * .1), t.s); dummy.updateMatrix(); tuft.setMatrixAt(i, dummy.matrix); });
  tuft.count = plan.tufts.length; tuft.instanceMatrix.needsUpdate = true; tuft.name = 'meadow-grass'; tuft.receiveShadow = true; group.add(tuft);
  const flowerMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .8, side: THREE.DoubleSide });
  if (addWind) addWind(flowerMat, .06, 'clamp(position.y*2.4,0.0,1.0)', 1.3, 'mod291-meadow-flower');
  const fl = [false, true].map(yellow => {
    const list = plan.flowers.filter(f => f.yellow === yellow);
    const m = new THREE.InstancedMesh(flowerGeometry(THREE, yellow ? [.98, .82, .22] : [.96, .96, .92], yellow ? [.85, .55, .12] : [.98, .82, .25]), flowerMat, Math.max(1, list.length));
    list.forEach((f, i) => { dummy.position.set(f.x, groundHeightAt(f.x, f.z) - .02, f.z); dummy.rotation.set(f.tilt, f.rot, f.tilt * .6); dummy.scale.setScalar(f.s); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix); });
    m.count = list.length; m.instanceMatrix.needsUpdate = true; m.name = yellow ? 'meadow-flowers-yellow' : 'meadow-flowers-white'; group.add(m); return m;
  });
  if (registerCull) { registerCull(tuft, lowSpec ? 46 : 64, 14); for (const m of fl) registerCull(m, lowSpec ? 40 : 56, 12); }
  // Vestígios de saque na estrada (P0: "uma roda velha quebrada e marcas de saque").
  const wood = new THREE.MeshStandardMaterial({ color: 0x5a4430, roughness: .95 }), cloth = new THREE.MeshStandardMaterial({ color: 0x9a8a68, roughness: 1 });
  for (const d of plan.debris) {
    const y = groundHeightAt(d.x, d.z), g = new THREE.Group(); g.position.set(d.x, y, d.z); g.rotation.y = d.rot;
    if (d.kind === 'wheel') {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(.62, .07, 6, 18, Math.PI * 1.55), wood); rim.rotation.x = -Math.PI / 2 + .12; rim.position.y = .1; g.add(rim);
      for (let k = 0; k < 6; k++) { if (k === 4) continue; const sp = new THREE.Mesh(new THREE.BoxGeometry(.05, .04, .6), wood); sp.position.y = .1; sp.rotation.y = k / 6 * Math.PI; g.add(sp); }
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(.11, .11, .14, 8), wood); hub.position.y = .1; g.add(hub);
    } else if (d.kind === 'sack') {
      const s = new THREE.Mesh(new THREE.SphereGeometry(.32, 8, 6), cloth); s.scale.set(1.1, .32, .8); s.position.y = .08; g.add(s);
    } else { const pl = new THREE.Mesh(new THREE.BoxGeometry(1.4, .06, .22), wood); pl.position.y = .04; pl.rotation.z = .05; g.add(pl); }
    g.traverse(x => { if (x.isMesh) { x.castShadow = !lowSpec; x.receiveShadow = true; } }); group.add(g);
  }
  return { group, plan, stats: { boulders: plan.boulders.length, tufts: plan.tufts.length, flowers: plan.flowers.length } };
}
