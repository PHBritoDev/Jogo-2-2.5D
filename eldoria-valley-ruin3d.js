/**
 * Renascimento de Eldória — Fase 2: Posto do Vigia, o desvio opcional do vale.
 *
 * Um posto de vigia antigo no topo da encosta oeste. De lá a vista se abre sobre o prado do despertar, a estrada de
 * Teren e a garganta. Tudo é autoral e procedural (sem asset externo), num só material de pedra com musgo por cor de
 * vértice:
 *  - base circular de lajes (caminhável, degrau de 0,22 m);
 *  - muro em arco com alturas quebradas, aberto para a trilha e para a vista;
 *  - duas colunas, uma caída;
 *  - um nicho com o relicário (pequeno cofre de bronze), que só brilha até ser aberto.
 * Colisão por eldoria-walkable: o anel do piso é superfície; o muro e as colunas são paredes e pilares.
 * O relicário dá uma recompensa única e o estado é guardado por aparelho (o integrador chama `claim`).
 */
import { VIGIA } from './eldoria-valley-landscape.js';

const hash = (i, s) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };

export function buildVigiaRuin(THREE, { ground, walk = null, lowSpec = false } = {}) {
  const group = new THREE.Group(); group.name = 'posto-do-vigia';
  const cx = VIGIA.x, cz = VIGIA.z, base = ground(cx, cz);
  group.position.set(cx, base, cz);
  const parts = [];
  // textura de pedra gerada por código (manchas, veios e juntas), compartilhada; a cor por vértice escurece e musgo cobre
  const cv = (typeof document !== 'undefined') ? document.createElement('canvas') : null; let tex = null;
  if (cv) { cv.width = cv.height = 128; const g2 = cv.getContext('2d'); g2.fillStyle = '#8d877c'; g2.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 900; i++) { const v = 90 + Math.floor(hash(i, 5) * 90); g2.fillStyle = `rgba(${v},${v - 6},${v - 14},${.18 + hash(i, 6) * .3})`; g2.fillRect(hash(i, 7) * 128, hash(i, 8) * 128, 1 + hash(i, 9) * 5, 1 + hash(i, 10) * 4); }
    g2.strokeStyle = 'rgba(40,36,30,.35)'; for (let i = 0; i < 9; i++) { g2.beginPath(); g2.moveTo(hash(i, 11) * 128, hash(i, 12) * 128); g2.lineTo(hash(i, 13) * 128, hash(i, 14) * 128); g2.stroke(); }
    tex = new THREE.CanvasTexture(cv); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.colorSpace = THREE.SRGBColorSpace; }
  const paint = (g, seed, moss) => {
    const p = g.attributes.position, n = g.attributes.normal, c = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const up = Math.max(0, n.getY(i)), v = .5 + .1 * hash(seed, i % 9), m = Math.min(.9, moss * (up * .8 + Math.max(0, .5 - p.getY(i)) * .5) * (.5 + .5 * hash(seed + 5, i % 13)));
      c[i * 3] = v * (1 - m) + .19 * m; c[i * 3 + 1] = v * .97 * (1 - m) + .29 * m; c[i * 3 + 2] = v * .9 * (1 - m) + .12 * m;
    }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g;
  };
  const block = (w, h, d, x, y, z, yaw, tilt, seed, moss = .7) => {
    const b = new THREE.BoxGeometry(w, h, d, 2, Math.max(1, Math.round(h / .45)), 2), P = b.attributes.position;
    for (let i = 0; i < P.count; i++) { const k = (hash(i, seed) - .5) * .06; P.setXYZ(i, P.getX(i) * (1 + k), P.getY(i), P.getZ(i) * (1 - k)); }
    b.rotateZ(tilt); b.rotateY(yaw); b.translate(x, y, z); const nb = b.toNonIndexed(); b.dispose(); nb.computeVertexNormals(); parts.push(paint(nb, seed, moss));
  };
  // piso: anel de lajes (raio 4,2) + disco central
  const R0 = 4.2, nSlab = lowSpec ? 12 : 16;
  for (let i = 0; i < nSlab; i++) { const a = (i + .5) / nSlab * Math.PI * 2, r = 3.1; block(1.75, .3, 1.15, Math.sin(a) * r, .07 - hash(i, 2) * .04, Math.cos(a) * r, a, (hash(i, 3) - .5) * .03, 10 + i, .9); }
  block(2.6, .3, 2.6, 0, .05, 0, .3, 0, 3, .6);
  // muro em arco (aberto para leste = trilha, e para norte = vista)
  const wallSegs = [];
  for (let i = 0; i < 14; i++) {
    const a = -.55 + i / 13 * (Math.PI * 1.25); // de ~SSO até ~O/NO, deixando a abertura
    const h = .5 + Math.abs(Math.sin(i * 1.7)) * 1.7 * (i % 5 === 2 ? .35 : 1), r = R0 + .2;
    // fiadas de pedras aparelhadas (0,42 m), desencontradas e quebradas no topo — nada de laje inteira
    const courses = Math.max(1, Math.round(h / .42));
    for (let c = 0; c < courses; c++) {
      const top = c === courses - 1, w = top ? .45 + hash(i * 7 + c, 31) * .5 : 1.02, off = (c % 2 ? .5 : 0) * .4, aa = a + off / r * (hash(i + c, 33) - .5);
      const rr = r + (hash(i * 5 + c, 34) - .5) * .08, x = Math.sin(aa) * rr, z = Math.cos(aa) * rr, hh = .4 + hash(i * 3 + c, 35) * .05;
      block(w, hh, .6 - c * .02, x, .14 + c * .42 + hh / 2, z, aa, (hash(i * 9 + c, 36) - .5) * (top ? .25 : .04), 40 + i * 9 + c, .9);
    }
    wallSegs.push({ a, h: courses * .42 });
  }
  // colunas: uma em pé (partida no topo) e uma caída atravessando o piso
  for (let k = 0; k < 4; k++) block(.66 - k * .03, .62, .66 - k * .03, -2.3, .43 + k * .63, -2.6, .4 + k * .3, (hash(k, 70) - .5) * .05, 70 + k, .8); // coluna em tambores, topo partido
  for (let k = 0; k < 4; k++) block(.62, .66, .62, 1.0 + k * .72, .36, -2.9 + k * .12, 1.1, Math.PI / 2 + (hash(k, 72) - .5) * .2, 74 + k, .95); // coluna caída, tambores soltos
  // nicho do relicário (no muro oeste, voltado para quem entra)
  block(1.5, .9, .7, -R0 + .55, .55, .4, Math.PI / 2, 0, 80, .5);
  // pedras soltas do desmoronamento
  for (let i = 0; i < 7; i++) { const a = hash(i, 90) * Math.PI * 2, r = 4.9 + hash(i, 91) * 2.2; block(.5 + hash(i, 92) * .6, .35 + hash(i, 93) * .4, .45 + hash(i, 94) * .5, Math.sin(a) * r, .15, Math.cos(a) * r, a, (hash(i, 95) - .5) * .4, 100 + i, 1); }
  // mescla numa malha só
  let n = 0; for (const g of parts) n += g.attributes.position.count;
  const P = new Float32Array(n * 3), N = new Float32Array(n * 3), C = new Float32Array(n * 3); let o = 0;
  for (const g of parts) { P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3); C.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; g.dispose(); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(P, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(N, 3)); geo.setAttribute('color', new THREE.BufferAttribute(C, 3));
  // UV planar simples (x/z e y) para a textura de pedra
  { const uv = new Float32Array((P.length / 3) * 2); for (let i = 0; i < P.length / 3; i++) { const nx = Math.abs(N[i * 3]), nz = Math.abs(N[i * 3 + 2]); uv[i * 2] = (nx > nz ? P[i * 3 + 2] : P[i * 3]) * .9; uv[i * 2 + 1] = (Math.abs(N[i * 3 + 1]) > .7 ? P[i * 3 + 2] : P[i * 3 + 1]) * .9; } geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); }
  const stone = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .94, metalness: 0, map: tex }));
  stone.castShadow = !lowSpec; stone.receiveShadow = true; group.add(stone);
  // relicário: cofre pequeno de bronze patinado com fecho que brilha até ser aberto
  const chest = new THREE.Group(); chest.position.set(-R0 + 1.25, .32, .4); chest.rotation.y = Math.PI / 2; group.add(chest);
  const bronze = new THREE.MeshStandardMaterial({ color: 0x6f6040, metalness: .55, roughness: .5, emissive: 0xffc870, emissiveIntensity: 0 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(.62, .34, .42), bronze); body.position.y = .17; chest.add(body);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(.21, .21, .62, 10, 1, false, 0, Math.PI), bronze); lid.rotation.z = Math.PI / 2; lid.position.y = .34; chest.add(lid);
  // colisão: piso caminhável, muro e colunas
  if (walk) {
    walk.addRing(cx, cz, 0, R0 - .3, base + .22, 'vigia-piso');
    for (const w of wallSegs) { const r = R0 + .2, x = cx + Math.sin(w.a) * r, z = cz + Math.cos(w.a) * r; walk.addPillar(x, z, .55, base - 1, base + w.h + .1, 'vigia-muro'); }
    walk.addPillar(cx - 2.3, cz - 2.6, .42, base - 1, base + 2.8, 'vigia-coluna');
    walk.addPillar(cx - R0 + .55, cz + .4, .55, base - 1, base + 1.0, 'vigia-nicho');
  }
  let opened = false, t0 = 0;
  return {
    group, chestWorld: { x: cx + (-R0 + 1.25), z: cz + .4 },
    setOpened(v) { opened = !!v; if (opened) { lid.rotation.x = -1.1; lid.position.z = -.12; } },
    get opened() { return opened; },
    update(t) { if (opened) { bronze.emissiveIntensity = 0; return; } bronze.emissiveIntensity = .18 + .14 * Math.sin(t * 2.1); },
  };
}
