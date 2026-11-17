/**
 * Mod 316 — lugares da floresta expandida (Ato I), todos instanciados (3 draw calls no total):
 *  - Círculo de Pedras (mistério): 7 menires musgosos em anel + laje central com runas que só despertam à noite;
 *  - Mirante do Planalto: mureta baixa de pedra em arco na borda oeste (vista para a mata, o lago e a serra);
 *  - Recanto do Remanso (calma): tronco caído que serve de banco e pedras de beira.
 * Pedras altas viram obstáculos (rockObstacles do jogo); o tronco é baixo e pisável.
 */
import { FOREST_CLEARINGS } from './act1-world-layout.js';

const hash = (i, s) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };

/**
 * Centro do tronco acompanha o terreno em vez de erguer ambas as pontas
 * quando encontra uma lombada. Cada anel da malha usa a altura do chão
 * sob seus vértices: sem pilares invisíveis nem novas draw calls.
 */
export function planRemansoLog(ground, { x, z, yaw = .6, length = 3.6, radius = .42 }) {
  const dirX = Math.cos(yaw), dirZ = -Math.sin(yaw);
  const point = t => {
    const px = x + dirX * length * (t - .5);
    const pz = z + dirZ * length * (t - .5);
    return { x: px, y: ground(px, pz) + radius, z: pz };
  };
  const a = point(0), b = point(1);
  return { a, b, center: point(.5), length, yaw, radius, point };
}

export function buildForestPlaces(THREE, { ground, obstacles = [], lowSpec = false } = {}) {
  const group = new THREE.Group(); group.name = 'lugares-floresta-mod316';
  const by = id => FOREST_CLEARINGS.find(c => c.id === id);
  const stones = [];   // {x,z,y,sx,sy,sz,yaw,tilt,moss}
  const circle = by('circulo-pedras'), mir = by('mirante'), rem = by('remanso');
  // Círculo: 7 menires (um "caído"), abertura voltada para o caminho que chega do nordeste
  for (let i = 0; i < 7; i++) {
    const a = -2.2 + i / 7 * Math.PI * 2 * .86, R = 3.6 + hash(i, 1) * .5, x = circle.x + Math.cos(a) * R, z = circle.z + Math.sin(a) * R;
    const fallen = i === 4, h = fallen ? .7 : 1.9 + hash(i, 2) * 1.1;
    stones.push({ x, z, y: ground(x, z) - .15, sx: .8 + hash(i, 3) * .3, sy: h, sz: .62 + hash(i, 4) * .25, yaw: a + Math.PI / 2 + (hash(i, 13) - .5) * .5, tilt: fallen ? 1.35 : (hash(i, 5) - .5) * .12, moss: .75 });
    if (!fallen) obstacles.push({ x, z, radius: 1.0, height: h, base: ground(x, z) });
  }
  const altar = { x: circle.x, z: circle.z, y: ground(circle.x, circle.z) - .05, sx: 1.5, sy: .32, sz: 1.1, yaw: .4, tilt: 0, moss: .55 };
  stones.push(altar);
  // Mirante: mureta em arco voltada para oeste (borda do planalto)
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * (.62 + i / 8 * .78), R = 4.2, x = mir.x + Math.cos(a) * R, z = mir.z + Math.sin(a) * R;
    stones.push({ x, z, y: ground(x, z) - .1, sx: .85, sy: .62 + hash(i, 6) * .18, sz: .5, yaw: a + Math.PI / 2, tilt: (hash(i, 7) - .5) * .08, moss: .35 });
    obstacles.push({ x, z, radius: .95, height: .9, base: ground(x, z) });
  }
  // Remanso: pedras de beira (baixas, pisáveis)
  for (let i = 0; i < 5; i++) { const a = i * 1.3 + .4, R = 3.4 + hash(i, 8), x = rem.x + Math.cos(a) * R, z = rem.z + Math.sin(a) * R; stones.push({ x, z, y: ground(x, z) - .12, sx: .5 + hash(i, 9) * .4, sy: .32, sz: .45, yaw: a, tilt: 0, moss: .6 }); }

  // pedra base: caixa subdividida com bordas gastas (deformação fixa), cor por vértice com musgo no topo
  const box = new THREE.BoxGeometry(1, 1, 1, 3, 5, 3); box.translate(0, .5, 0);
  { const P = box.attributes.position; for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i); const k = 1 - .18 * y + (hash(i, 10) - .5) * .12; P.setXYZ(i, x * k, y, z * k); } box.computeVertexNormals(); }
  const stoneMat = new THREE.MeshStandardMaterial({ roughness: .95, metalness: 0, vertexColors: true });
  // musgo no topo via cor por vértice (sem textura nova)
  { const P = box.attributes.position, c = new Float32Array(P.count * 3); for (let i = 0; i < P.count; i++) { const y = P.getY(i), m = Math.max(0, (y - .45) / .55) * (.6 + .4 * hash(i, 11)); const g = .34 + .07 * hash(i, 12); c[i * 3] = g * (1 - m) + .27 * m; c[i * 3 + 1] = g * (1 - m) + .36 * m; c[i * 3 + 2] = g * .96 * (1 - m) + .19 * m; } box.setAttribute('color', new THREE.BufferAttribute(c, 3)); }
  const im = new THREE.InstancedMesh(box, stoneMat, stones.length), o = new THREE.Object3D();
  stones.forEach((s, n) => { o.position.set(s.x, s.y, s.z); o.rotation.set(s.tilt, s.yaw, 0); o.scale.set(s.sx, s.sy, s.sz); o.updateMatrix(); im.setMatrixAt(n, o.matrix); });
  im.castShadow = !lowSpec; im.receiveShadow = true; im.name = 'pedras-lugares'; group.add(im);

  // runas da laje do círculo: decal emissivo (só acende à noite)
  const runeMat = new THREE.MeshBasicMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const runes = new THREE.Mesh(new THREE.RingGeometry(.35, .52, 24, 1), runeMat); runes.rotation.x = -Math.PI / 2; runes.position.set(altar.x, altar.y + altar.sy + .02, altar.z); runes.name = 'runas-circulo'; group.add(runes);

  // tronco caído do remanso (banco natural)
  const logPlan = planRemansoLog(ground, { x: rem.x - 1, z: rem.z + .6 });
  // Tronco antigo com silhueta e casca irregulares, sem textura externa ou draw call adicional.
  // As extremidades permanecem no mesmo eixo calculado pelo relevo.
  const bark = new THREE.CylinderGeometry(.32, .38, logPlan.length, 12, 12);
  const barkPos = bark.attributes.position;
  const barkColors = new Float32Array(barkPos.count * 3);
  const alongX = Math.cos(logPlan.yaw), alongZ = -Math.sin(logPlan.yaw);
  const acrossX = -alongZ, acrossZ = alongX;
  for (let i = 0; i < barkPos.count; i++) {
    const radialX = barkPos.getX(i), axial = barkPos.getY(i), radialY = barkPos.getZ(i);
    const angle = Math.atan2(radialY, radialX);
    const along = axial / logPlan.length;
    const ridge = Math.sin(angle * 7 + along * 8) * .022 + Math.sin(angle * 13 - along * 19) * .009;
    const taper = 1 + .035 * Math.sin(along * 11 + 1.2);
    const radius = Math.hypot(radialX, radialY);
    const k = radius > .01 ? taper + ridge / radius : 1;
    const sideways = radialX * k;
    const worldX = logPlan.center.x + axial * alongX + sideways * acrossX;
    const worldZ = logPlan.center.z + axial * alongZ + sideways * acrossZ;
    // Seguir o relevo em cada anel elimina o vão sob as extremidades.
    // Usar o raio REAL de cada anel (0.32–0.38), não 0.42 fixo:\n    // a geratriz inferior toca o chão, inclusive após a deformação da casca.
    const worldY = ground(worldX, worldZ) + (radius > .01 ? radius * k : logPlan.radius) + radialY * k;
    barkPos.setXYZ(i, worldX - logPlan.center.x, worldY, worldZ - logPlan.center.z);
    const shade = .78 + .16 * Math.sin(angle * 9 + along * 15) + .07 * Math.sin(along * 37);
    barkColors[i * 3] = .35 * shade;
    barkColors[i * 3 + 1] = .24 * shade;
    barkColors[i * 3 + 2] = .15 * shade;
  }
  bark.setAttribute('color', new THREE.BufferAttribute(barkColors, 3));
  bark.computeVertexNormals();
  const log = new THREE.Mesh(bark, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
  log.position.set(logPlan.center.x, 0, logPlan.center.z);
  log.castShadow = !lowSpec; log.receiveShadow = true; log.name = 'tronco-banco'; group.add(log);

  const update = (t, night) => { runeMat.opacity = Math.max(0, night - .35) * (.55 + .2 * Math.sin(t * 1.3)); runes.visible = runeMat.opacity > .01; };
  return { group, update, stones: stones.length };
}
