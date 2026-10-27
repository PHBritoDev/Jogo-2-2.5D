/**
 * MOD 206 — Marco 4: Ato III como no roteiro original do autor (docs/roteiro/M4-ATO3.md). Dados e transições puras;
 * as cenas são passos do diretor (cutscenes3d.js). Terceiro Bispo: ZAR'KHAEL. Quarto Bispo: VÉRAXION.
 * A cidade de neve ocupa o vale leste (o antigo Vale do Altar); os lugares estão em snow3d.js.
 *
 * Etapas (questStep) e sub-etapas (salvas em act1Sub):
 *  15 a estrada até a cidade de neve (o vendedor de casacos no caminho)
 *  16 a cidade: 0 o pescador · 1 o morador (anoitece) · 2 a estalagem · 3 o estalajadeiro · 4 o quarto
 *  17 a armadilha: 0 o porão (3 Enemy3) · 1 subir a escada · 2 a cidade em chamas (4 Enemy3) · 3 seguir o Anjo
 *  18 a caverna de gelo: 0 entrar · 1 o fundo (o portal) · 2 a dimensão distorcida (mini-chefe + 2 Enemy3) · 3 o portal de ZAR'KHAEL
 *  19 ZAR'KHAEL: 0 a luta · 1 de volta à cidade (o Anjo)
 * Depois da Ganância levar o Anjo, o jogo segue para o Ato IV (passo 21).
 */
export const ACT3N = {
  road: 15, city: 16, trap: 17, cave: 18, boss: 19, next: 21,
  cellarFoes: 3, raidFoes: 4, dimFoes: 2,
  enemy3Hp: 170, minibossHp: 520, angelHp: 360, bossHp: 640, reward: 80, xp: 320
};
export const SPEAKERS3 = {
  hero: 'heroi', guide: 'Anjo-Guia', seller: 'Vendedor de Casacos', fisher: 'Pescador', villager: 'Moradora', keeper: 'Estalajadeiro',
  demon: 'Demônio da Ganância', miniboss: 'Guardião da Distorção', boss: "ZAR'KHAEL", greed: 'Ganância'
};
import { SNOW_CITY } from './snow3d.js';
const S = SPEAKERS3;
const say = (who, text, extra) => Object.assign({ type: 'say', who, text }, extra || {});
const shot = (id, dur, args, extra) => Object.assign({ type: 'shot', id, dur, args: args || {} }, extra || {});
const act = (id, args) => ({ type: 'do', id, args: args || {} });
const ask = id => ({ type: 'ask', id });
const wait = dur => ({ type: 'wait', dur });

export function act3Presentation(step, sub = 0, city = 'Invernália') {
  const C = city.toUpperCase();
  const pages = {
    15: ['ATO III · A CIDADE DE NEVE', 'Siga a leste, pela passagem, até a cidade de neve'],
    16: [['ATO III · ' + C, 'Pergunte pelo Anjo na cidade'], ['ATO III · ' + C, 'Ninguém viu o Anjo. Fale com os moradores'],
      ['ATO III · A NOITE', 'Ache um lugar para dormir: a estalagem'], ['ATO III · A ESTALAGEM', 'Fale com o estalajadeiro'], ['ATO III · A ESTALAGEM', 'Suba para o quarto e descanse']][Math.max(0, Math.min(4, sub))],
    17: [['ATO III · O PORÃO', 'Liberte-se'], ['ATO III · O PORÃO', 'Suba a escada e saia da estalagem'],
      ['ATO III · A CIDADE EM CHAMAS', 'Os demônios atacam a cidade'], ['ATO III · O ANJO VOLTOU', 'Siga o Anjo']][Math.max(0, Math.min(3, sub))],
    18: [['ATO III · A CAVERNA DE GELO', 'Entre na caverna de gelo'], ['ATO III · A CAVERNA DE GELO', 'Vá até o fundo da caverna'],
      ['ATO III · A DIMENSÃO DISTORCIDA', 'Entre no portal'], ["ATO III · ZAR'KHAEL", "Atravesse o portal de ZAR'KHAEL"]][Math.max(0, Math.min(3, sub))],
    19: sub >= 1 ? ['ATO III · A VERDADE', 'Fale com o Anjo'] : ["ATO III · ZAR'KHAEL", "Enfrente ZAR'KHAEL"]
  };
  const pair = pages[step];
  return pair ? { title: pair[0], objective: pair[1] } : null;
}
export function isAct3Step(step) { return step >= ACT3N.road && step <= ACT3N.boss; }

/** Compra do casaco: só com moedas suficientes e uma vez. */
export function buyCoat(coins, owned, price) {
  if (owned) return { ok: false, coins, owned, reason: 'owned' };
  if (coins < price) return { ok: false, coins, owned, reason: 'coins' };
  return { ok: true, coins: coins - price, owned: true };
}
/** Vitória sobre ZAR'KHAEL: recompensa única. */
export function afterZarkhael(progress) {
  const p = progress || {}, first = !p.claimed;
  return { coinsGained: first ? ACT3N.reward : 0, xpGained: first ? ACT3N.xp : 0, bishopsDefeated: Math.max(3, Math.floor(Number(p.bishopsDefeated) || 0)) };
}

/* ---------- Falas (texto revisado; original em docs/roteiro/M4-ATO3.md) ---------- */
export function coatOfferScene() {
  return [
    shot('vendedor', 2, { cam: 'two', a: 'hero', b: 'seller', side: 1, dist: 3.6 }),
    say(S.seller, 'Ei, forasteiro! Para onde você está indo?', { actor: 'seller' }),
    say(S.hero, 'Para a cidade de neve.'),
    say(S.seller, 'Desse jeito, sem nenhum casaco? Já houve casos de gente que morreu de frio mesmo estando bem vestida. Se quiser sobreviver, posso te vender um: 25 moedas.', { actor: 'seller' }),
    ask('casaco')
  ];
}
export function coatAcceptScene() {
  return [
    act('dar-casaco'),
    say(S.seller, 'Fez a escolha certa, rapaz. Garanto que não vai se arrepender.', { actor: 'seller' }),
    say(S.seller, 'Vá até o seu inventário, na área de equipamentos, e equipe o seu casaco.', { actor: 'seller' })
  ];
}
export function coatRefuseScene() { return [say(S.seller, 'Essa escolha pode custar a sua vida.', { actor: 'seller' })]; }
export function coatNoMoneyScene() { return [say(S.seller, 'Vinte e cinco moedas, nem uma a menos. Volte quando tiver.', { actor: 'seller' })]; }
export const COLD_LINE = 'Aqui está muito frio mesmo… recebi vários efeitos ruins. Será que devo voltar para comprar o casaco?';

export function snowArrivalScene() {
  return [
    shot('cidade-neve', 6.5, { cam: 'crane', anchor: 'snowcity', from: [-40, 34, 46], to: [-22, 15, 26], lookFrom: [12, 0, -12], lookTo: [4, 2, -4] },
      { with: [act('titulo', { kicker: 'GALÁXIA 1 · ATO III', title: SNOW_CITY.name }), act('som-descoberta'), act('neve-forte')] })
  ];
}
export function fisherScene() {
  return [
    say(S.hero, 'Ei, por acaso você não viu um homem com asas por aqui?'),
    say(S.fisher, 'Ahahaha! Asas? Por acaso ele é um anjo? Ahaha! Garoto, acho que esse frio está te fazendo delirar.', { actor: 'fisher' })
  ];
}
export function villagerScene() {
  return [
    say(S.villager, 'Você é novo por aqui?', { actor: 'villager' }),
    say(S.hero, 'Como você percebeu?'),
    say(S.villager, 'Pelas suas vestes. Não parece ser daqui. Está precisando de ajuda?', { actor: 'villager' }),
    say(S.hero, 'Me responda uma coisa: o mundo não está em caos? Por que as pessoas estão sorrindo normalmente, como se nada estivesse acontecendo?'),
    say(S.villager, "Ah, rapaz, você deve estar falando do rumor de que ZAR'KHAEL está aqui. É verdade que muitas cidades e países estão em caos, mas a nossa cidade não foi afetada.", { actor: 'villager' }),
    say(S.villager, 'Enfim, eu tenho que ir. Logo vai anoitecer.', { actor: 'villager' }),
    say(S.hero, 'Mas que desespero é esse?'),
    say(S.villager, 'É que, quando chega a noite, coisas muito esquisitas acontecem. É melhor você achar um lugar para dormir o mais rápido possível.', { actor: 'villager' }),
    shot('todos-entram', 4.2, { cam: 'crane', anchor: 'snowcity', from: [-14, 12, 22], to: [-10, 9, 16], lookFrom: [0, 1, -4], lookTo: [0, 1, -4] }, { with: [act('todos-entram'), act('ato3-anoitecer')] }),
    say(S.hero, 'Tem algo de estranho nesta cidade… Parece que estão escondendo alguma coisa. Preciso descobrir.')
  ];
}
export function innScene() {
  return [
    say(S.hero, 'Quanto custa para me hospedar por uma noite?'),
    say(S.keeper, 'Meu amigo, hoje é o seu dia de sorte! A hospedagem está de graça.', { actor: 'keeper' }),
    say(S.hero, 'Sério?'),
    say(S.keeper, 'Isso mesmo!', { actor: 'keeper' })
  ];
}
export function bedScene() {
  return [
    say(S.hero, 'Isso está me cheirando mal…'),
    say(S.hero, 'Enfim, preciso descansar.'),
    act('dormir'), wait(1.6)
  ];
}
export function cellarScene() {
  return [
    act('acordar-preso'), wait(1.4),
    say(S.hero, 'Que lugar é este? Eu não estava na cama?'),
    shot('porao', 2.4, { cam: 'look', on: 'keeper', off: [2.6, 1.8, 3.4], at: [0, 1.2, 0] }, { with: [act('olhar-correntes')] }),
    say(S.keeper, 'Nãooo! Você prometeu que ia soltar a minha filha se eu fizesse isso!', { actor: 'keeper' }),
    say(S.demon, 'Você achou mesmo que eu ia fazer isso? Quem você pensa que é para me dar ordens?'),
    act('matar-estalajadeiro'), wait(1.1),
    say(S.hero, 'Eu sabia que tinha algo de estranho nesta cidade. Estava bom demais para ser verdade.'),
    say(S.demon, 'Agora é a sua vez. Você não é grande coisa, sabia? Não esperava que quem derrotou Valério e VORGAZHEK fosse cair num truque tão fácil.'),
    say(S.hero, 'Cadê o Anjo-Guia?'),
    say(S.demon, 'Anjo-Guia? Quem é esse? Você está tentando ganhar tempo, mas isso não vai funcionar. A sua morte será aqui, neste porão.'),
    act('romper-correntes')
  ];
}
export function cellarDefeatScene() {
  return [
    say(S.demon, "Tá bom, tá bom, eu falo tudo! ZAR'KHAEL previu a sua chegada e armou a hospedagem para te prender aqui e fazer experimentos."),
    say(S.hero, 'Experimentos?'),
    say(S.demon, 'Sim. Depois da derrota do primeiro e do segundo Bispo, a Ganância está tentando transformar novas pessoas num novo Bispo. E você atendia a todos os requisitos.'),
    say(S.hero, 'Vocês, demônios imundos, brincando com a vida dessas pessoas… Vou exterminar todos vocês.'),
    say(S.demon, 'Não faça issoooo!'),
    act('eliminar3')
  ];
}
export function raidScene() {
  return [
    shot('cidade-em-chamas', 3.4, { cam: 'crane', anchor: 'snowcity', from: [-16, 14, 20], to: [-9, 7, 13], lookFrom: [0, 1, -2], lookTo: [0, 1, -2] }, { with: [act('cidade-em-chamas')] }),
    say(S.hero, 'O que vocês estão fazendo com esta cidade?'),
    say(S.demon, 'Você não é digno de saber do nosso plano.'),
    act('surgir-quatro')
  ];
}
export function guillotineScene() {
  return [
    act('golpe-por-tras'), wait(1.2), act('na-guilhotina'), wait(1),
    act('ato3-piscar'), wait(1.4),
    say(S.hero, 'Onde eu estou? O que aconteceu?'),
    shot('carrasco', 1.8, { cam: 'look', on: 'enemy', off: [1.6, 1.6, 2.8], at: [0, 1.4, 0] }),
    say(S.demon, 'Morra.'),
    say(S.hero, 'Nãooooo!'),
    act('anjo-salva'), wait(1.4),
    say(S.hero, 'Anjo! Onde você estava? Pensei que tinha morrido…'),
    say(S.guide, 'Eu, morrer? Hahaha, que piada. Esqueceu quem eu sou?'),
    say(S.guide, "Isso fazia parte do plano para achar o esconderijo de ZAR'KHAEL. Me siga.")
  ];
}
export function caveArrivalScene() {
  return [
    say(S.guide, 'Chegamos!'),
    say(S.hero, 'Como você achou este lugar?'),
    say(S.guide, "Quando fingi a minha própria morte, segui VÉRAXION. Eu o vi conversando com ZAR'KHAEL nesta caverna."),
    say(S.hero, 'Isso foi muito arriscado. Por que você fez isso?'),
    say(S.guide, "Se não fosse assim, nunca acharíamos ZAR'KHAEL. Ele é o Bispo mais difícil de encontrar.")
  ];
}
export function caveEndScene() {
  return [
    say(S.hero, 'Ué… mas não tem nada nesta caverna.'),
    say(S.guide, 'Olhe para trás.'),
    shot('portal-atras', 2.6, { cam: 'look', on: 'portal', off: [3, 2.6, 7], at: [0, 2.5, 0] }, { with: [act('portal-atras')] }),
    say(S.hero, 'Um portal? Mas nós não viemos por aí? Como ele foi parar ali?'),
    say(S.guide, 'Esta caverna é uma dimensão distorcida, que não faz parte deste mundo.'),
    say(S.hero, 'Mas não é perigoso entrar aí?'),
    say(S.guide, 'Apenas vá, sem medo. Preciso investigar outra coisa. Adeus.'),
    act('anjo-some')
  ];
}
export function distortedScene() {
  return [
    act('ato3-piscar'), wait(1.2),
    say(S.hero, 'Minha percepção parece distorcida.'),
    shot('guardiao', 2.2, { cam: 'look', on: 'enemy', off: [2, 2.2, 4.6], at: [0, 2, 0] }, { with: [act('ato3-surgir-guardiao')] }),
    say(S.miniboss, 'Então foi você que derrotou Valério e VORGAZHEK. Mesmo assim, fico surpreso por ter conseguido chegar até aqui. Mas é aqui que a sua jornada acaba.'),
    say(S.miniboss, 'Vou comer os seus ossos e roubar a sua alma para fortalecer a minha.'),
    say(S.hero, "Vocês não passam de vermes, usados como fantoches por ZAR'KHAEL.")
  ];
}
export function distortedDefeatScene() {
  return [
    say(S.miniboss, "Fui derrotado… Você é forte, mas ainda não o suficiente para enfrentar ZAR'KHAEL. Ele é de outro nível. Se ama a sua vida, então fuja."),
    say(S.hero, 'Não pretendo fugir. Só tenho um objetivo: salvar este planeta.'),
    say(S.miniboss, 'Eu tenho uma dica… Não, espere!'),
    say(S.boss, 'Você falou demais. Morra!', { actor: 'sky' }),
    act('queimar'), wait(1.8),
    say(S.hero, 'Como você pode fazer isso com os seus próprios aliados?'),
    say(S.boss, 'Eles não passam de demônios de baixo nível. Não preciso de seres tão inúteis. Se quiser saber mais, venha me enfrentar.', { actor: 'sky' }),
    act('portal-zarkhael')
  ];
}
export function zarkhaelIntroScene() {
  return [
    say(S.boss, "Eu admito: você é realmente forte. Mas eu, ZAR'KHAEL, sou o mais forte entre todos os demônios de alto nível, perdendo só para dois."),
    say(S.hero, 'O meu objetivo é derrotar a Ganância. Você não passa de uma mosca no meu caminho.')
  ];
}
export function zarkhaelDefeatScene() {
  return [
    say(S.boss, "Não… não é possível. Como eu, ZAR'KHAEL, fui derrotado…? Quem é você?"),
    say(S.hero, 'Quais são as suas últimas palavras?'),
    say(S.boss, 'Vou te revelar algo sobre VÉRAXION. Nem se eu me juntasse a Valério e VORGAZHEK nós teríamos chance contra ele. Ele é uma aberração divina. Se quisesse, poderia até desafiar a Ganância.'),
    say(S.hero, 'Hmm, interessante. Já que você me revelou algo tão importante, vou retribuir: a minha verdadeira identidade.'),
    say(S.hero, 'Sou {nome}, um dos anjos de Deus, escolhido para salvar os sete mundos.'),
    say(S.boss, 'Um anjo? Isso não é possível. Pensei que seres celestiais não pudessem interferir neste mundo… a não ser que você não seja completamente um anjo.'),
    say(S.hero, 'Como assim?'),
    act('anjo-magia'), wait(1.6),
    say(S.hero, 'Anjo?'),
    say(S.guide, 'Vamos, não temos tempo a perder.'),
    act('dimensao-desaba'), wait(1.2)
  ];
}
export function angelQuestionScene() {
  return [
    say(S.hero, 'Anjo, por que eu, um dos anjos mais baixos da hierarquia, fui mandado para uma missão tão importante: salvar os sete mundos dos pecados? E não você?'),
    say(S.guide, 'Você realmente acreditou no que aquele demônio imundo disse?'),
    say(S.hero, 'Não minta para mim.'),
    act('lutar-anjo')
  ];
}
export function angelTruthScene() {
  return [
    say(S.hero, 'Como assim? Você é um dos anjos mais fortes do Reino Celestial. Como perdeu para mim?'),
    say(S.guide, 'Vou te dizer a verdade… Todos os anjos são fortes no Reino Celestial e podem usar a sua capacidade máxima. Mas, neste mundo, não podemos vir com o nosso poder máximo.'),
    say(S.guide, 'Nós, anjos, só podemos vir com um corpo físico e com apenas cinco por cento do nosso poder real.'),
    say(S.hero, 'Cinco por cento?'),
    say(S.guide, 'Sim.'),
    say(S.hero, 'Mas por que eu consigo usar o meu verdadeiro poder neste mundo?'),
    say(S.guide, 'Porque você já foi humano. Nós, anjos, nascemos em espírito: todo o nosso poder está no espírito. Mas você nasceu com um corpo físico, então pode usar todo o seu poder na forma humana ou em espírito.'),
    shot('ganancia', 2.6, { cam: 'look', on: 'greed', off: [2.4, 2.4, 4.6], at: [0, 2, 0] }, { with: [act('ganancia-surge')] }),
    say(S.greed, 'Interessante. Como eu previa, era impossível um simples humano derrotar os Bispos. Então vocês realmente são anjos.', { actor: 'greed' }),
    say(S.hero, 'Não é possível… O que a Ganância está fazendo aqui?'),
    say(S.guide, 'Corra!'),
    act('ganancia-leva'), wait(1.6),
    say(S.hero, 'Anjoooooooo!'),
    say(S.greed, 'Se quiser ele de volta, venha até mim.', { actor: 'sky' }),
    act('ato3-escuro'), wait(1.4),
    act('ato-4'), wait(3.4), act('fecha-cartao')
  ];
}
