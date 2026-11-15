/**
 * Caverna de Eldória — C4: luz por câmara (puro, testável em Node).
 *
 * Referência de direção (estudada, não copiada): cavernas de RPGs de mundo aberto estilizados, como as grutas de
 * Genshin Impact. O que se aproveita é a gramática, não os recursos:
 *  - Cada câmara tem **uma cor dominante** e **uma luz-chave** com motivo na cena: o sol dourado da fresta do salão, o
 *    verde-água da gruta, o violeta dos cristais, o fogo da prisão.
 *  - **Contraste quente × frio:** chave quente, preenchimento frio e névoa colorida mais clara que as sombras. A
 *    profundidade lê em camadas e a silhueta do herói nunca some.
 *  - **Escuridão é escolha de cena,** não falta de luz: o piso tem valor mínimo garantido (hemisfério ≥ 1,05, chão
 *    nunca preto).
 *  - Feixes volumétricos falsos (cone aditivo), poça de luz no chão e poeira dourada. Sem pós-processamento.
 * O ambiente (névoa, hemisfério, exposição) mistura as câmaras pela posição do herói, com transição suave. Isso
 * substitui o ambiente único azul-petróleo de antes.
 */
import { CAVE } from './ascension-layout.js';

const M = (bg, fog, fogNear, fogFar, sky, ground, hemi, sunC, sunI, exposure) => ({ bg, fog, fogNear, fogFar, hemi: [sky, ground, hemi], sun: [sunC, sunI], exposure });
/** Humores por câmara (cores sRGB em hex). */
export const CAVE_MOODS = Object.freeze({
  entrada: M(0x0b1612, 0x1f3a33, 10, 80, 0xcfe3c8, 0x2b2a22, 1.3, 0xffe7c2, .55, 1.28),
  salao: M(0x050b12, 0x15293b, 11, 95, 0x86aee0, 0x221b14, 1.42, 0xffd9a8, .42, 1.4),
  gruta: M(0x03100f, 0x10302c, 8, 72, 0x7fd8c8, 0x14241e, 1.38, 0xbfffe8, .35, 1.38),
  eco: M(0x04080f, 0x121e34, 7, 62, 0x8aa2e4, 0x17171f, 1.15, 0xa9c4ff, .3, 1.42),
  prisao: M(0x0b0604, 0x25180e, 7, 62, 0xdcab7c, 0x21160e, 1.08, 0xffb070, .3, 1.38),
  cristal: M(0x07051a, 0x1e1742, 9, 86, 0xab98ff, 0x19122d, 1.3, 0xd2c4ff, .4, 1.42),
  portal: M(0x080418, 0x1b1038, 9, 86, 0x9d88ff, 0x170e28, 1.25, 0xc8b8ff, .38, 1.38),
  galeria: M(0x0a0d0b, 0x23302a, 9, 70, 0xd9e6c4, 0x272319, 1.3, 0xffe2b0, .45, 1.34), // C5: luz do dia da fenda da serra, quente
});
/** Onde cada humor manda (câmaras do layout + a boca do túnel). */
export const MOOD_ZONES = Object.freeze([
  { id: 'entrada', x: 0, z: 2, r: 12 }, { id: 'entrada', x: 0, z: -18, r: 6 },
  ...CAVE.chambers.map(c => ({ id: c.id, x: c.x, z: c.z, r: c.r })),
]);
export const MIN_HEMI = 1.05;

const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const hx = h => [(h >> 16 & 255) / 255, (h >> 8 & 255) / 255, (h & 255) / 255];
const toHex = c => (Math.round(Math.max(0, Math.min(1, c[0])) * 255) << 16) | (Math.round(Math.max(0, Math.min(1, c[1])) * 255) << 8) | Math.round(Math.max(0, Math.min(1, c[2])) * 255);

/** Pesos normalizados {id: w} na posição local (x, z). Sempre soma 1; longe de tudo, vale a câmara mais próxima. */
export function moodWeights(x, z) {
  const w = {}; let sum = 0, best = null, bd = 1e9;
  for (const Z of MOOD_ZONES) { const d = Math.hypot(x - Z.x, z - Z.z), k = sm(Z.r + 14, Z.r * .5, d);
    if (d - Z.r < bd) { bd = d - Z.r; best = Z.id; } if (k > 0) { w[Z.id] = Math.max(w[Z.id] || 0, k); } }
  for (const k in w) sum += w[k];
  if (sum < 1e-4) return { [best]: 1 };
  for (const k in w) w[k] /= sum; return w;
}
/** Ambiente misturado (mesmo formato de `env` que o jogo aplica a cada quadro). */
export function moodAt(x, z) {
  const W = moodWeights(x, z), acc = { bg: [0, 0, 0], fog: [0, 0, 0], sky: [0, 0, 0], ground: [0, 0, 0], sun: [0, 0, 0] };
  let fogNear = 0, fogFar = 0, hemi = 0, sunI = 0, exposure = 0;
  for (const id in W) { const m = CAVE_MOODS[id], k = W[id];
    for (const [key, hex] of [['bg', m.bg], ['fog', m.fog], ['sky', m.hemi[0]], ['ground', m.hemi[1]], ['sun', m.sun[0]]]) { const c = hx(hex); for (let i = 0; i < 3; i++) acc[key][i] += c[i] * k; }
    fogNear += m.fogNear * k; fogFar += m.fogFar * k; hemi += m.hemi[2] * k; sunI += m.sun[1] * k; exposure += m.exposure * k; }
  return { bg: toHex(acc.bg), fog: toHex(acc.fog), fogNear, fogFar, hemi: [toHex(acc.sky), toHex(acc.ground), Math.max(MIN_HEMI, hemi)], sun: [toHex(acc.sun), sunI], exposure, weights: W };
}
/** Aproxima `cur` (env aplicado) de `target` com constante de tempo `tau` (s). As cores andam em ponto flutuante
 *  (`cur._f`) e só viram hex na saída: em 8 bits, passos menores que meio nível arredondavam para zero e a névoa
 *  parava até 14 níveis longe do alvo. */
export function easeEnv(cur, target, dt, tau = .9) {
  const k = 1 - Math.exp(-dt / tau), num = (a, b) => a + (b - a) * k;
  const F = cur._f || (cur._f = { bg: hx(cur.bg), fog: hx(cur.fog), sky: hx(cur.hemi[0]), ground: hx(cur.hemi[1]), sun: hx(cur.sun[0]) });
  const step = (key, hex) => { const t = hx(hex), f = F[key]; for (let i = 0; i < 3; i++) f[i] += (t[i] - f[i]) * k; return toHex(f); };
  cur.bg = step('bg', target.bg); cur.fog = step('fog', target.fog); cur.fogNear = num(cur.fogNear, target.fogNear); cur.fogFar = num(cur.fogFar, target.fogFar);
  cur.hemi = [step('sky', target.hemi[0]), step('ground', target.hemi[1]), num(cur.hemi[2], target.hemi[2])];
  cur.sun = [step('sun', target.sun[0]), num(cur.sun[1], target.sun[1])]; cur.exposure = num(cur.exposure, target.exposure);
  return cur;
}

/**
 * Luzes de cena (fontes do orçamento de 4 luzes do jogo; o orçamento escolhe as mais relevantes perto da câmera).
 * [cor, intensidade, alcance, [x, y relativo ao piso, z], papel]
 */
export const CAVE_KEYS = Object.freeze([
  [0xffcf8a, 3.4, 26, [-7, 2.2, -52], 'salão: sol dourado da fresta (chave)'],
  [0x6f9fd8, 1.1, 22, [8, 4, -64], 'salão: preenchimento frio do abismo'],
  [0x58e6c8, 2.2, 20, [-43, 2.6, -62], 'gruta: verde-água das poças'],
  [0x8a5cff, 3.2, 22, null, 'portal: vórtice'],
  [0xffe2b8, 1.6, 18, [0, 4.4, -6], 'entrada: luz do dia que morre no túnel'],
  [0xbfd6ff, 2.2, 24, [-58, 4.7, -104], 'cristal: fresta fria sobre a poça-espelho'],
  [0x9a6bff, 2.0, 18, [-62, 1.6, -97], 'cristal: os cristais são a luz da câmara'],
  [0x7d96ff, 1.3, 15, [33, 2.6, -99], 'eco: recorte frio na saída da passagem'],
  [0xffe2b8, 1.8, 18, [-37, 2.6, -91], 'galeria alta: luz do dia que entra pela fenda da serra'],
]);
/** Cor dos feixes por fresta (mesma ordem de CAVE_SHAFTS): dourado no salão, verde-água na gruta, frio no portal, lavanda no cristal. */
export const SHAFT_COLORS = Object.freeze([0xffe2a8, 0xffd9a0, 0xc6ffec, 0xbfd2ff, 0xd8ccff]);

/** Áudio por câmara: tamanho da sala (reverb) e gotejamento (poças e pontas de calcita). */
export function caveAudioAt(x, z) {
  const W = moodWeights(x, z), size = { entrada: .25, salao: 1, gruta: .6, eco: .75, prisao: .45, cristal: .85, portal: .8, galeria: .5 };
  let room = 0; for (const id in W) room += (size[id] ?? .5) * W[id];
  let drip = .15; for (const p of CAVE.pools) drip = Math.max(drip, sm(p.r + 16, p.r, Math.hypot(x - p.x, z - p.z)));
  return { room, drip, draft: (W.entrada || 0) + .6 * (W.galeria || 0) };
}
