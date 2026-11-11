/**
 * MOD 292 — plano urbano de Eldória (dados estruturados, sem WebGL).
 *
 * Assentamento orgânico: chega-se pela FLORESTA ao sul, cruza-se OBRIGATORIAMENTE a ponte de pedra sobre o rio
 * (que agora corre ao sul da cidade, de leste a oeste) e a rua de entrada sobe até a praça com o poço, a fonte
 * seca e as bancas. Ao fundo da praça, no eixo de quem atravessa a ponte, a árvore colossal; a leste, outra árvore
 * ancestral com a casa da árvore (deque, escada caminhável) e a passarela suspensa que cruza a rua principal.
 *
 * Coordenadas das casas: RELATIVAS ao centro da praça (ELDORIA_CENTER). Ruas: coordenadas do MUNDO.
 * Cada casa tem função, bairro, orientação calculada a partir do ponto da rua para onde a PORTA se volta, e um
 * caminho de acesso da soleira até a rua mais próxima (nada de porta virada para parede, árvore ou barranco).
 */
import { ELDORIA_CENTER } from './act1-world-layout.js';

/** Direção da porta no espaço do modelo (medida nas vistas dos GLBs do criador: Casa01 porta no oitão −X com
 *  degrau; Casa02 porta com escada em +Z; Ferreiro: forja aberta e bigorna em −X). */
export const ELDORIA_DOOR_LOCAL = { 'CasaEldoria01.glb': [-1, 0], 'CasaEldoria02.glb': [0, 1], 'FerreiroEldoria.glb': [-1, 0] };

/** Rotação Y que vira a porta do modelo para a direção (dx,dz) do mundo. */
export function yawFacing(file, dx, dz) { const [lx, lz] = ELDORIA_DOOR_LOCAL[file] || [0, 1]; return Math.atan2(dx, dz) - Math.atan2(lx, lz); }
/** Direção da porta no mundo para uma rotação (inversa de yawFacing). */
export function doorDirection(file, yaw) { const [lx, lz] = ELDORIA_DOOR_LOCAL[file] || [0, 1], c = Math.cos(yaw), s = Math.sin(yaw); return [lx * c + lz * s, -lx * s + lz * c]; }

/** Ponte de entrada (centro no mundo) e ruas. A rua principal é a trilha principal do Ato I, agora passando pela ponte. */
export const ELDORIA_BRIDGE_SPOT = { x: -.4, z: -12.3 };
export const ELDORIA_STREETS = {
  // praça → árvore colossal (para ao pé das raízes)
  norte: [[-12.2, -44.5], [-12, -51.5], [-11.6, -57.5]],
  // largo da entrada → praça (atalho diagonal de quem vem da ponte)
  entrada: [[0, -29], [-3.8, -31.8], [-8.2, -35.2], [-11.6, -41.6]], // contorna o Abrigo da Vila (−4,6; −36,5)
  // rua principal → pé da escada da casa da árvore (árvore lateral, leste)
  // rua do altar → pé da escada da casa da árvore
  leste: [[9.6, -40.4], [10.4, -42.6], [10.9, -44.4]],
  // fonte seca → casas do oeste (sapateiro)
  oeste: [[-19.4, -39.2], [-25, -38.8], [-30.5, -37.5]],
};
export const ELDORIA_MAIN_TREE = { x: -1, z: -26, size: 34, rotation: -.18, file: 'ArvoreAncestralEldoria.glb', funcao: 'Árvore colossal ao fundo da praça (marco visual de quem cruza a ponte)' };
export const ELDORIA_SIDE_TREE = { x: 27, z: -14, size: 28, rotation: 1.9, file: 'ArvoreAncestralEldoria.glb', funcao: 'Árvore ancestral lateral com casa da árvore, escada e passarela' };
/** Profundidade de enterramento das raízes ancestrais. Ajuste isolado para evitar arcos de raízes acima do solo; validar visualmente ambos os exemplares e os acessos elevados antes de mesclar. */
export const ANCESTRAL_ROOT_SINK = .075;
/** Raio de raízes (fração da altura): casas não ficam em cima delas. */
export const ANCESTRAL_ROOT_SPREAD = .42;

export const ELDORIA_HOUSES = [
  { id: 'A1', file: 'CasaEldoria02.glb', x: 4.5, z: 20, size: 5.9, faceTo: [11.6, 20.5], bairro: 'Entrada', funcao: 'Casa do guarda da ponte' },
  { id: 'A4', file: 'CasaEldoria01.glb', x: -1, z: 13, size: 5.6, faceTo: [5, 10], bairro: 'Entrada', funcao: 'Casa do padeiro (forno apagado)' },
  { id: 'B1', file: 'CasaEldoria02.glb', x: -12, z: -12, size: 6.1, faceTo: [0, 0], bairro: 'Praça', funcao: 'Casa da família de Lia' },
  { id: 'B2', file: 'CasaEldoria01.glb', x: 6, z: -9, size: 5.7, faceTo: [0, 0], bairro: 'Praça', funcao: 'Casa do conselho (sem dinheiro, mas inteira)' },
  { id: 'B3', file: 'CasaEldoria02.glb', x: -15.5, z: 11, size: 5.9, faceTo: [0, 0], bairro: 'Praça', funcao: 'Casa da curandeira' },
  { id: 'C1', file: 'CasaEldoria02.glb', x: -12.8, z: -18.5, size: 5.8, faceTo: [-.6, -13], bairro: 'Norte', funcao: 'Casa do lenhador' },
  { id: 'D2', file: 'CasaEldoria01.glb', x: 28, z: 14, size: 5.6, faceTo: [28.7, 5.6], bairro: 'Leste', funcao: 'Casa do apicultor' },
  { id: 'W2', file: 'CasaEldoria02.glb', x: -21.4, z: -13, size: 5.9, faceTo: [-21.6, -7.5], bairro: 'Oeste', funcao: 'Casa do pastor de cabras' },
];
export const ELDORIA_SMITHY = { id: 'F1', file: 'FerreiroEldoria.glb', x: 21, z: 10, size: 5.6, faceTo: [13.4, 8.8], bairro: 'Entrada', funcao: 'Ferraria (forja aberta para a rua principal)', collision: 2.4 };

/** Casas como lista [x, z, arquivo, tamanho, rotação] (contrato antigo usado pelos canteiros e testes). */
export function housePlots() {
  return ELDORIA_HOUSES.map(h => [h.x, h.z, h.file, h.size, yawFacing(h.file, h.faceTo[0] - h.x, h.faceTo[1] - h.z)]);
}
/** Soleira (ponto 1,4 m à frente da porta, fora da parede) no mundo, para caminhos e testes de acesso. */
export function doorstep(h, center = ELDORIA_CENTER, out = .5) {
  const yaw = yawFacing(h.file, h.faceTo[0] - h.x, h.faceTo[1] - h.z), [dx, dz] = doorDirection(h.file, yaw), r = h.size * .42 + out;
  return { x: center.x + h.x + dx * r, z: center.z + h.z + dz * r, dx, dz, yaw };
}
/** Caminho curto da soleira até o ponto de rua para onde a porta olha (vira trilha no terreno). */
export function doorPaths(center = ELDORIA_CENTER) {
  return [...ELDORIA_HOUSES, ELDORIA_SMITHY].map(h => { const d = doorstep(h, center, .2); return { id: h.id, points: [[+d.x.toFixed(2), +d.z.toFixed(2)], [center.x + h.faceTo[0], center.z + h.faceTo[1]]] }; });
}
export function worldOf(o, center = ELDORIA_CENTER) { return { x: center.x + o.x, z: center.z + o.z }; }

/** Casa da árvore, anel nas duas árvores ancestrais e passarela suspensa (coordenadas do MUNDO, alturas relativas
 *  à cota comum dos deques). Raios do anel medidos no GLB: tronco com raio de 0,11–0,14 da altura entre 5 e 9 m. */
export function treeStructurePlan(center = ELDORIA_CENTER) {
  const M = worldOf(ELDORIA_MAIN_TREE, center), Sd = worldOf(ELDORIA_SIDE_TREE, center), deck = 6;
  const ringM = { cx: M.x, cz: M.z, r0: ELDORIA_MAIN_TREE.size * .165, r1: ELDORIA_MAIN_TREE.size * .165 + 2.4 };
  const ringS = { cx: Sd.x, cz: Sd.z, r0: ELDORIA_SIDE_TREE.size * .165, r1: ELDORIA_SIDE_TREE.size * .165 + 2.3 };
  // plataforma da casa da árvore ao SUL do tronco lateral (7 × 7 m), encostada no anel
  const plat = { cx: Sd.x - .2, cz: Sd.z + 10, hx: 3.5, hz: 3.5 };
  // escada em "U" (dois lances de 3 m de altura, patamar a oeste) junto ao lado oeste da plataforma
  const x1 = plat.cx - plat.hx, x0 = x1 - 3.6, zA = plat.cz + 2.1, zB = plat.cz + .45, w = 1.5;
  const stair = [
    { kind: 'flight', a: [x1 - .3, zA, 0], b: [x0, zA, deck / 2], w },        // lance 1: sobe para oeste
    { kind: 'landing', a: [x0 - 1.6, (zA + zB) / 2, deck / 2], b: [x0, (zA + zB) / 2, deck / 2], w: zA - zB + w }, // patamar
    { kind: 'flight', a: [x0, zB, deck / 2], b: [x1 + .1, zB, deck], w },      // lance 2: volta para leste até a plataforma
  ];
  // passarela: do ponto NORTE do anel lateral ao ponto LESTE do anel da colossal (pilar no meio, fora da rua)
  const A = [ringS.cx, ringS.cz - ringS.r1 + .35], B = [ringM.cx + ringM.r1 - .35, ringM.cz];
  return { deck, ringM, ringS, plat, stair, walkway: { a: A, b: B, w: 1.7 }, house: { file: 'CasaEldoria02.glb', x: plat.cx + 1.2, z: plat.cz + .9, size: 4.6, door: [-1, 0], funcao: 'Casa da árvore (vigia da mata)' } };
}
