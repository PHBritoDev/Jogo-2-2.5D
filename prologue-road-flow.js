/**
 * MOD 291 — Missão P1 "Passageiros da estrada" (docs/narrativa/ato-1-eldoria-roteiro-v1.md).
 * Regras puras (sem Three.js): etapas da estrada, falas, viagem de carroça e migração de saves.
 *
 * Etapas (localStorage `seven-sins-3d-road`):
 *   0 — a pé no prado; Teren encontra os dois na estrada
 *   1 — lona presa; falta subir na carroça
 *   2 — bandidos detidos; viagem retomada até Eldória (amanhecer)
 *   3 — chegada concluída (a missão 1 da vila começa)
 * Saves antigos que já passaram do despertar começam em 3 (ninguém é obrigado a repetir o prólogo).
 */
import { CART_ROUTE, TEREN_STOP, BANDIT_AMBUSH, ELDORIA_DROP, ORIGIN_LIMIT, nearestAlong, polylineLength } from './act1-world-layout.js';
import { SPEAKERS } from './act1-flow.js';

export const ROAD_STORE = 'seven-sins-3d-road';
export const ROAD = {
  meet: 0, boarded: 1, freed: 2, done: 3,
  banditHp: 70, bandits: 5,
  rideSpeed: 5.2, dawnSpeed: 9,
  meetRadius: 9, cartReach: 3.4
};
export const ROAD_SPEAKERS = { teren: 'Teren · cocheiro', chief: 'Chefe dos bandidos', bandit: 'Bandido faminto' };

/** Distâncias (metros ao longo da rota da carroça) dos marcos da viagem. */
export const RIDE = (() => {
  const total = polylineLength(CART_ROUTE);
  const start = nearestAlong(CART_ROUTE, TEREN_STOP.x, TEREN_STOP.z).s;
  const ambush = nearestAlong(CART_ROUTE, BANDIT_AMBUSH.x, BANDIT_AMBUSH.z).s - 3.5;
  const end = nearestAlong(CART_ROUTE, ELDORIA_DROP.x, ELDORIA_DROP.z).s;
  // Mod 317: a carroça espera fora de vista na garganta de origem (curva) até ser ouvida
  // a carroça espera ALÉM do limite a pé da garganta (o jogador a ouve antes de poder vê-la)
  const limit = nearestAlong(CART_ROUTE, ORIGIN_LIMIT.x, ORIGIN_LIMIT.z).s;
  return { total, start, ambush, end, dozeAt: start + 26, revealAt: end - 46, origin: Math.max(0, limit - 16), limit };
})();
/** Onde a carroça fica quando a cena carrega: na garganta (ainda não chegou), no prado, ou parada após a emboscada. */
export function cartRestS(stage, arrived) {
  if (stage >= ROAD.freed) return RIDE.ambush;
  if (stage === ROAD.meet && !arrived) return RIDE.origin;
  return RIDE.start;
}

export function initialRoadStage(questStep, stored, sub = 0) {
  if (!(questStep >= 1)) return ROAD.meet;            // jogo novo (ou reiniciado): o prólogo começa do prado
  if (questStep >= 2 || sub >= 1) return ROAD.done;   // já passou da chegada à vila
  const v = Number.parseInt(stored, 10);
  // Sem registro = save anterior ao Mod 291: não obriga a repetir o prólogo. Recarregar no meio da viagem
  // retoma do último ponto seguro (Teren espera de novo / estrada já livre).
  return Number.isFinite(v) && v >= 0 && v <= 3 ? v : ROAD.done;
}

export function roadPresentation(stage) {
  if (stage === ROAD.meet) return { title: 'PRÓLOGO · PASSAGEIROS DA ESTRADA', objective: 'Siga a estrada de terra: uma carroça se aproxima' };
  if (stage === ROAD.boarded) return { title: 'PRÓLOGO · PASSAGEIROS DA ESTRADA', objective: 'Ajude Teren com a lona e suba na carroça' };
  if (stage === ROAD.freed) return { title: 'PRÓLOGO · ATÉ O AMANHECER', objective: 'Volte à carroça de Teren' };
  return null;
}

const S = { ...SPEAKERS, guide: 'Vaelthar' }, T = ROAD_SPEAKERS; // Mod 317: diante de Teren o guia usa o nome público
const say = (who, text, extra) => Object.assign({ type: 'say', who, text }, extra || {});
const shot = (id, dur, args, extra) => Object.assign({ type: 'shot', id, dur, args: args || {} }, extra || {});
const act = (id, args) => ({ type: 'do', id, args: args || {} });

export function terenMeetScene() {
  return [
    shot('carroca-chega', 3.2, { cam: 'look', on: 'cart', off: [6.5, 3.5, 7.5], at: [0, 1.4, 1.5] }, { with: [act('carroca-frear')] }),
    say(T.teren, 'Vocês vieram daquela trilha? Não é boa ideia andar por aqui.', { actor: 'teren' }),
    say(S.hero, 'Estamos procurando uma cidade.'),
    say(T.teren, 'Vou até Eldória. Se ajudarem a segurar as cargas, podem vir.', { actor: 'teren' }),
    shot('lona', 2.2, { cam: 'look', on: 'cart', off: [-4.2, 2.6, -5.2], at: [0, 1.4, -1.2] })
  ];
}

export function tarpScene() {
  return [
    shot('prender-lona', 2.4, { cam: 'look', on: 'cart', off: [-4, 2.6, -5], at: [0, 1.5, -1.2] }, { with: [act('lona-presa')] }),
    say(T.teren, 'Isso. Assim os sacos não voam na curva. Subam.', { actor: 'teren' })
  ];
}

/** Viagem até o cochilo: balanço, vento e piscadas levam ao sono (sem teleporte: a carroça anda pela estrada). */
export function rideDozeScene() {
  return [
    act('embarcar'),
    shot('embarque', 3.6, { cam: 'look', on: 'cart', off: [5.2, 2.4, -2.2], at: [.6, 1.5, -.4] }),
    act('viagem-partir'),
    // plano de situação curto (fora) e depois o interior: rostos, conversa, balanço
    shot('estrada-larga', 3.6, { cam: 'look', on: 'cart', off: [6.2, 3.4, 3], at: [0, 1.4, 3] }),
    shot('interior', 3, { cam: 'interior', look: 'guide' }),
    say(S.hero, 'Você já esteve neste mundo antes?', { actor: 'hero' }),
    shot('interior-anjo', .1, { cam: 'interior', look: 'guide' }),
    say(S.guide, 'Não assim. Daqui de baixo tudo parece mais pesado.', { actor: 'guide' }),
    shot('interior-heroi', .1, { cam: 'interior', look: 'hero' }),
    say(S.hero, 'E o Teren? Ele não perguntou nada sobre nós.', { actor: 'hero' }),
    say(S.guide, 'Quem passa fome aprende a não fazer perguntas. Descanse um pouco.', { actor: 'guide' }),
    shot('interior-sono', 2.6, { cam: 'interior', look: 'hero', doze: true }, { with: [act('piscadas')] }),
    act('dormir'),
    { type: 'wait', dur: 1.2 },
    act('tres-horas'),
    { type: 'wait', dur: 2.2 }
  ];
}

export function ambushScene() {
  return [
    shot('parada', 2.4, { cam: 'interior', look: 'hero', wake: true }, { with: [act('acordar')] }),
    say(S.guide, '{NOME}. Acorde.'),
    say(T.teren, 'Eu não tenho o que vocês querem!', { actor: 'teren' }),
    shot('cerco', 3, { cam: 'orbit', on: 'cart', r: 9, h: 3.6, from: -.6, to: .7 }, { with: [act('bandidos-cercam')] }),
    say(T.chief, 'Saia da frente. Não vamos pedir duas vezes.', { actor: 'bandit' }),
    say(S.hero, 'Ele disse que não tem nada. Deixem a estrada.'),
    act('descer-carroca')
  ];
}

export function hungerScene() {
  return [
    shot('desarmados', 2.6, { cam: 'two', a: 'hero', b: 'bandit', side: 1, dist: 4.2 }, { with: [act('bandidos-rendidos')] }),
    say(T.bandit, 'Não comemos há dois dias. A carroça parecia ter comida.', { actor: 'bandit' }),
    shot('saco-vazio', 2.2, { cam: 'look', on: 'bandit', off: [1.4, 1.2, 1.8], at: [0, .5, -.6] }),
    say(T.teren, 'Não sou o primeiro que vocês param.', { actor: 'teren' }),
    { type: 'ask', id: 'bandidos-escolha' }
  ];
}

/** Escolha de expressão, não de punição: os dois caminhos terminam com os homens vivos e a estrada livre. */
export function choiceScene(helpRepair) {
  const lines = helpRepair
    ? [say(S.hero, 'Antes de irem, ajudem a consertar o que quebraram.'), say(T.bandit, '…Tudo bem. É o mínimo.', { actor: 'bandit' }), act('bandidos-reparam')]
    : [say(S.hero, 'Vão. Ninguém precisa morrer nesta estrada.'), act('bandidos-partem')];
  return lines.concat([
    say(T.teren, 'Obrigado. Antes, eu teria perdido tudo.', { actor: 'teren' }),
    say(S.hero, 'Quanto falta?'),
    say(T.teren, 'Se a estrada continuar livre, chegamos ao amanhecer.', { actor: 'teren' })
  ]);
}

export function dawnRideScene() {
  return [
    act('viagem-retomar'),
    shot('madrugada', 4.6, { cam: 'look', on: 'cart', off: [-6.5, 3.2, 1.5], at: [0, 1.2, 4] }, { with: [act('timelapse-amanhecer')] }),
    act('pular-madrugada'),
    shot('chegada', 6.2, { cam: 'look', on: 'cart', off: [1.2, 2.8, -4.6], at: [0, 2.4, 14] }),
    act('carroca-parar'),
    say(T.teren, 'Eldória. Já foi um lugar bonito de viver.', { actor: 'teren' }),
    say(T.teren, 'Preciso seguir viagem. Volto em alguns dias, se a estrada deixar.', { actor: 'teren' }),
    act('descer-chegada')
  ];
}

/** Interpolação suave de hora para o time-lapse noturno → amanhecer (hora do jogo). */
export function dawnHourAt(k) {
  const t = Math.max(0, Math.min(1, k)), e = t * t * (3 - 2 * t);
  return 2.2 + (6.75 - 2.2) * e;
}
