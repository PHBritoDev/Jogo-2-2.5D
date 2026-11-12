/**
 * Mod 316 — lugares da floresta expandida (Ato I), todos instanciados (3 draw calls no total):
 *  - Círculo de Pedras (mistério): 7 menires musgosos em anel + laje central com runas que só despertam à noite;
 *  - Mirante do Planalto: mureta baixa de pedra em arco na borda oeste (vista para a mata, o lago e a serra);
 *  - Recanto do Remanso (calma): tronco caído que serve de banco e pedras de beira.
 * Pedras altas viram obstáculos (rockObstacles do jogo); o tronco é baixo e pisável.
 */
import { FOREST_CLEARINGS } from './act1-world-layout.js';

const hash = (i, s) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };

export function buildForestPlaces(THREE, { ground, obstacles = [], lowSpec = false } = {}) {
  const group = new THREE.Group(); group.name = 'lugares-floresta-mod316';
  const by = id => FOREST_CLEARINGS.find(c => c.id === id);
  const stones = [];   // {x,z,y,sx,sy,sz,yaw,tilt,moss}
  const circle = by('circulo-pedras'), mir = by('mirante'), rem = by('remanso');
  // Círculo: 7 menires (um "caído"), abertura voltada para o caminho que chega do nordeste
  for (let i = 0; i < 7; i++) {
    const a = -2.2 + i / 7 * Math.PI * 2 * .86, R = 3.6 + hash(i, 1) * .5, x = circle.x + Math.cos(a) * R, z = circle.z + Math.sin(a) * R;
    const fallen = i === 4, h = fallen ? .7 : 1.9 + hash(i, 2) * 1.1;
    stones.push({ x, z, y: ground(x, z) - .15, sx: .7 + hash(i, 3) * .25, sy: h, sz: .45 + hash(i, 4) * .2, yaw: a + Math.PI / 2, tilt: fallen ? 1.35 : (hash(i, 5) - .5) * .12, moss: .75 });
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
  const log = new THREE.Mesh(new THREE.CylinderGeometry(.32, .38, 3.6, 10, 1), new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 1 }));
  log.rotation.set(0, .6, Math.PI / 2); log.position.set(rem.x - 1, ground(rem.x - 1, rem.z + .6) + .3, rem.z + .6); log.castShadow = !lowSpec; log.receiveShadow = true; log.name = 'tronco-banco'; group.add(log);

  const update = (t, night) => { runeMat.opacity = Math.max(0, night - .35) * (.55 + .2 * Math.sin(t * 1.3)); runes.visible = runeMat.opacity > .01; };
  return { group, update, stones: stones.length };
}
