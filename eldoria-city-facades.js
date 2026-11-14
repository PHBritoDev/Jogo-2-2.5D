/**
 * Renascimento de Eldória — Fase 2: fachadas e sinais de vida da cidade (plano puro, testável em Node).
 *
 * Auditoria dos GLBs (tools/visual-lab/facade-audit.html): normaliza cada casa como o jogo (maior medida = 1,
 * centro da caixa, base no chão), lança raios horizontais nas 4 faces e lê a textura assada. Assim acha o
 * plano da parede e a porta (madeira escura entre reboco claro). Resultado, em unidades normalizadas (× size da casa):
 *  - CasaEldoria01: porta na face −X (bate com ELDORIA_DOOR_LOCAL), centro z = −0,054, meia-largura ≈ 0,054,
 *    parede em x = −0,334; parede lateral +Z em z = +0,155.
 *  - CasaEldoria02: porta em arco no centro da face +Z (confirmado em captura), parede em z = +0,287, soleira de
 *    pedra à frente; parede lateral +X em x = +0,351.
 *  - FerreiroEldoria: forja aberta na face −X (recuo de 0,347), parede em x = −0,153; lateral −Z em z = −0,26.
 * Os detalhes NUNCA ficam no vão da porta (folga ≥ 0,5 m de cada lado) nem na frente dela (faixa de acesso de 1,6 m).
 */
import { ELDORIA_CENTER } from './act1-world-layout.js';
import { ELDORIA_HOUSES, yawFacing } from './eldoria-city-layout.js';

export const FACADE_AUDIT = Object.freeze({
  'CasaEldoria01.glb': { door: { face: '-x', wall: -.334, center: -.054, half: .054 }, side: { face: '+z', wall: .155 } },
  'CasaEldoria02.glb': { door: { face: '+z', wall: .287, center: 0, half: .1 }, side: { face: '+x', wall: .351 } },
  'FerreiroEldoria.glb': { door: { face: '-x', wall: -.153, center: 0, half: .3 }, side: { face: '-z', wall: -.26 } },
});

/** Ponto local (normalizado) → mundo, com a mesma montagem do jogo (rotation.y = yaw). */
export function houseToWorld(h, lx, lz) { const yaw = yawFacing(h.file, h.faceTo[0] - h.x, h.faceTo[1] - h.z), c = Math.cos(yaw), s = Math.sin(yaw), x = lx * h.size, z = lz * h.size;
  return { x: ELDORIA_CENTER.x + h.x + x * c + z * s, z: ELDORIA_CENTER.z + h.z - x * s + z * c, yaw }; }
/** Pontos de um lado da porta: `along` (m) ao longo da parede a partir do centro da porta, `out` (m) para fora. */
export function besideDoor(h, along, out) {
  const A = FACADE_AUDIT[h.file].door, n = A.face === '-x' ? [-1, 0] : A.face === '+x' ? [1, 0] : A.face === '+z' ? [0, 1] : [0, -1];
  const t = [-n[1], n[0]], wallX = n[0] ? A.wall : A.center, wallZ = n[1] ? A.wall : A.center;
  return houseToWorld(h, wallX + (t[0] * along + n[0] * out) / h.size, wallZ + (t[1] * along + n[1] * out) / h.size);
}
export function doorFront(h, out = .8) { return besideDoor(h, 0, out); }

/** Casas que recebem jardineiras ao lado da porta (as voltadas para a praça e a entrada), varais e lenha. */
const PLANTER_HOUSES = ['A4', 'B1', 'B2', 'B3', 'C1'];
const FIREWOOD_HOUSES = ['B1', 'C1', 'W2'];
export function planFacadeDetails() {
  const H = Object.fromEntries(ELDORIA_HOUSES.map(h => [h.id, h])), out = [];
  for (const id of PLANTER_HOUSES) { const h = H[id], A = FACADE_AUDIT[h.file].door, gap = A.half * h.size + .62;
    for (const side of [-1, 1]) { const p = besideDoor(h, side * gap, .3); out.push({ kind: 'trough', house: id, x: p.x, z: p.z, rot: p.yaw + (A.face.endsWith('x') ? Math.PI / 2 : 0), sparse: (id.charCodeAt(0) + side) % 2 === 0 }); } }
  for (const id of FIREWOOD_HOUSES) { const h = H[id], S = FACADE_AUDIT[h.file].side, n = S.face.endsWith('x') ? [S.face[0] === '-' ? -1 : 1, 0] : [0, S.face[0] === '-' ? -1 : 1];
    const lx = n[0] ? S.wall + n[0] * .32 / h.size : -.08, lz = n[1] ? S.wall + n[1] * .32 / h.size : -.08, p = houseToWorld(h, lx, lz);
    out.push({ kind: 'firewood', house: id, x: p.x, z: p.z, rot: p.yaw + (n[0] ? Math.PI / 2 : 0) }); }
  // varais: da quina lateral da casa até um poste no quintal (roupas remendadas e desbotadas)
  for (const [id, along, len] of [['B1', -1, 4.2], ['W2', 1, 3.8]]) { const h = H[id], S = FACADE_AUDIT[h.file].side, n = S.face.endsWith('x') ? [S.face[0] === '-' ? -1 : 1, 0] : [0, S.face[0] === '-' ? -1 : 1];
    const a = houseToWorld(h, n[0] ? S.wall : along * .25, n[1] ? S.wall : along * .25), b = houseToWorld(h, (n[0] ? S.wall : along * .25) + n[0] * len / h.size, (n[1] ? S.wall : along * .25) + n[1] * len / h.size);
    out.push({ kind: 'clothesline', house: id, ax: a.x, az: a.z, bx: b.x, bz: b.z }); }
  return out;
}

/** Rota do carregador: do largo da ponte (onde a carga chega) até a mesa de ração da praça, pela Rua da Entrada. */
export const PORTER_ROUTE = Object.freeze([[-1.2, -29.9], [-3.8, -31.8], [-8.2, -35.2], [-9.6, -38], [-8.4, -45.1]]);
/** Posição ao longo de uma rota de ida e volta (pausa nas pontas). t em segundos. Devolve {x,z,dirX,dirZ,loaded,moving}. */
export function routeAt(route, t, speed = .9, pause = 2.5) {
  const seg = []; let L = 0; for (let i = 0; i < route.length - 1; i++) { const l = Math.hypot(route[i + 1][0] - route[i][0], route[i + 1][1] - route[i][1]); seg.push(l); L += l; }
  const cycle = 2 * (L / speed + pause); let u = ((t % cycle) + cycle) % cycle; const goT = L / speed;
  let forward = true, d; if (u < goT) d = u * speed; else if (u < goT + pause) { d = L; } else if (u < 2 * goT + pause) { forward = false; d = L - (u - goT - pause) * speed; } else d = 0;
  const moving = (u < goT) || (u >= goT + pause && u < 2 * goT + pause);
  let acc = 0; for (let i = 0; i < seg.length; i++) { if (d <= acc + seg[i] || i === seg.length - 1) { const k = Math.max(0, Math.min(1, (d - acc) / seg[i])), a = route[i], b = route[i + 1], dx = (b[0] - a[0]) / seg[i], dz = (b[1] - a[1]) / seg[i];
      return { x: a[0] + (b[0] - a[0]) * k, z: a[1] + (b[1] - a[1]) * k, dirX: forward ? dx : -dx, dirZ: forward ? dz : -dz, loaded: forward, moving }; } acc += seg[i]; }
  return { x: route[0][0], z: route[0][1], dirX: 0, dirZ: 1, loaded: true, moving: false };
}
