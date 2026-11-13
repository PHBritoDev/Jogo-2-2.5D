import { registerKind, E1 } from './enemy1-squad3d.js';
/**
 * Mod 317 — bandidos famintos da estrada (Prólogo): espécie humana da esquadra simultânea da Mod 237.
 *
 *  - SÓ ESPADA: kit vazio (nenhuma Garra, Espiral, Juízo, contra-selo, salto predatório ou escudo de energia).
 *  - Cinco lutam juntos: papéis do diretor (agressor, flanqueador, controle, distância) fazem cercar e pressionar, mas no
 *    máximo DOIS golpes perigosos ao mesmo tempo no mesmo alvo (fichas), com intervalo mínimo no grupo — nada de golpe
 *    invisível pelas costas no celular. Os outros rodeiam, ameaçam, recuam e esperam a vez.
 *  - Golpe duplo (dois cortes no mesmo ataque), defesa ocasional, esquiva/dash físico curto, recuo quando ferido.
 *  - Mais fracos que demônios: vida e dano de gente com fome; a rendição (não letal) é tratada pelo jogo ao fim.
 */
const B = E1.common;
export const BANDIT = registerKind('bandit', {
  ...B,
  hp: 70, radius: .4, height: 1.8, poise: 10, flinch: 8, stamina: 90, leash: 30, sight: 24,
  speed: { walk: 1.5, run: 3.3, strafe: 1.25, back: 1.8, turn: 7.5 },
  melee: { max: 2.4, reach: 2.35, arc: .3, windup: .52, hits: [.44, .8], dur: 1.3, dmg: 7, cd: 1.9, knock: .45 },
  dash: { speed: 7.5, time: .3, cd: 3.8 },
  block: { chance: .18, dur: .7, cd: 3, cost: 26, reduce: .6 },
  dodge: { chance: .2, cd: 3.6 },
  counter: { ...B.counter, chance: 0 },
  kit: [], native: null, combos: null, leap: null, shield: null,
  decide: [.32, .5], gap: .7, meleeTokens: 2, cdMul: 1.1,
  // todos pressionam de perto (sem papel "à distância": não há magia); quem não tem ficha rodeia a ~3 m
  pref: [1.05, 2.4],
  sword: true
});
