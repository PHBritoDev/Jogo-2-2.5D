/**
 * Caverna de Eldória — C5: a fenda da serra no mundo (saída alternativa da Galeria Alta).
 *
 * Uma fenda estreita no pé da muralha, ~31 m ao norte da boca: duas lajes altas encostadas uma na outra, um bloco
 * travado no alto e o escuro entre elas. A passagem é uma transição, como a boca. As pedras ficam dentro da faixa da
 * muralha que já não se pisa (`frontierBlocked`), então não há colisão nova nem corpo atravessando pedra.
 * Luz casada: a fenda sopra o mesmo ar frio da galeria (névoa escura dentro) e, do lado de dentro, a galeria vê a luz
 * do dia quente da encosta.
 */
import { SERRA_CLEFT } from './ascension-layout.js';
import { boulderGeometry } from './eldoria-prologue-meadow.js';

export function buildSerraCleft(THREE, { ground, lowSpec = false } = {}) {
  const C = SERRA_CLEFT, g = new THREE.Group(); g.name = 'fenda-da-serra';
  const y0 = Math.min(ground(C.x + .6, C.z), ground(C.x + 1.6, C.z)) - .2; g.position.set(C.x, y0, C.z); g.scale.setScalar(1.45); // legível de longe, sem sair da faixa da muralha
  const rock = new THREE.MeshStandardMaterial({ color: 0x77736a, roughness: .95, metalness: 0, flatShading: true });
  const slab = (sx, sy, sz, x, y, z, rx, ry, rz, seed) => { const geo = boulderGeometry(THREE, seed, lowSpec ? 1 : 2); const m = new THREE.Mesh(geo, rock);
    m.scale.set(sx, sy, sz); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = !lowSpec; m.receiveShadow = true; g.add(m); return m; };
  // lajes laterais inclinadas uma para a outra (a fenda se fecha no alto), bloco travado e pedras no pé
  slab(1.3, 3.4, 1.1, -.5, 1.6, -1.35, .12, .2, -.08, 981);
  slab(1.2, 3.1, 1.2, -.45, 1.45, 1.3, -.14, -.3, .1, 982);
  slab(1.1, .8, 2.1, -.7, 3.25, 0, .05, .4, .1, 983);
  slab(.55, .4, .6, .35, .12, -1.7, 0, 1, 0, 984); slab(.45, .35, .5, .25, .1, 1.75, 0, 2, 0, 985);
  // o escuro da fenda (sem se ver dentro): plano escuro com névoa
  const dark = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 3.6), new THREE.MeshBasicMaterial({ color: 0x030403 }));
  dark.position.set(-.05, 1.7, 0); dark.rotation.y = Math.PI / 2; dark.name = 'fenda-escuro'; g.add(dark);
  return { group: g, cleft: C };
}
