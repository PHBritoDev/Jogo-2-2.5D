/**
 * MOD 207 — Marco 5: Ato IV como no roteiro original do autor (docs/roteiro/M5-ATO4.md). Dados e transições puras;
 * as cenas são passos do diretor (cutscenes3d.js). Quarto Bispo: VÉRAXION. A torre ocupa a antiga Serra sem Ecos.
 *
 * Etapas (questStep) e sub-etapas (salvas em act1Sub):
 *  21 a estrada: 0 os bandidos · 1 a pessoa misteriosa (seguir) · 2 a porta da torre
 *  22 a torre: sub = piso (1 a 7); o 5º é a sala de descanso
 *  23 VÉRAXION (dentro do portal do 7º piso)
 *  24 a torre cai; a pessoa misteriosa conta quem é
 * Depois, o jogo segue para o Ato V (passo 27) até o Marco 6 trocar esse trecho.
 */
export const ACT4N = {
  road: 21, tower: 22, boss: 23, after: 24, next: 27,
  bandits: 3, banditHp: 140, enemy4Hp: 190, minibossHp: 560, leaderHp: 640, bossHp: 760, reward: 100, xp: 400, scrollBonus: .2
};
/** Os sete pisos: quantos Enemy4, se há mini-chefe/líder e se é a sala de descanso. */
export const FLOORS = [
  null,
  { foes: 1 }, { foes: 2 }, { foes: 3 }, { foes: 4 }, { rest: true }, { miniboss: true }, { leader: true, foes: 2 }
];
export const SPEAKERS4 = { hero: 'heroi', rival: 'Pessoa Misteriosa', bandit: 'Bandido', demon: 'Demônio', miniboss: 'Guardião do 6º Piso', leader: 'Líder dos Guardiões', boss: 'VÉRAXION', greed: 'Ganância (lembrança)' };
const S = SPEAKERS4;
const say = (who, text, extra) => Object.assign({ type: 'say', who, text }, extra || {});
const shot = (id, dur, args, extra) => Object.assign({ type: 'shot', id, dur, args: args || {} }, extra || {});
const act = (id, args) => ({ type: 'do', id, args: args || {} });
const ask = id => ({ type: 'ask', id });
const wait = dur => ({ type: 'wait', dur });

export function act4Presentation(step, sub = 0) {
  const pages = {
    21: [['ATO IV · A ESTRADA DA SERRA', 'Siga ao sul, pela serra, procurando o Quarto Bispo'], ['ATO IV · UM ROSTO CONHECIDO', 'Siga a pessoa misteriosa'], ['ATO IV · A TORRE', 'Entre na torre']][Math.max(0, Math.min(2, sub))],
    22: sub === 5 ? ['ATO IV · 5º PISO', 'Descanse na sala de descanso'] : ['ATO IV · ' + Math.max(1, Math.min(7, sub)) + 'º PISO', sub >= 7 ? 'Vença o líder e os dois guardiões' : sub === 6 ? 'Vença o guardião do 6º piso' : 'Vença os guardiões do piso e suba'],
    23: ['ATO IV · VÉRAXION', 'Enfrente o Quarto Bispo'],
    24: ['ATO IV · A TORRE CAIU', 'Ouça a pessoa misteriosa']
  };
  const pair = pages[step];
  return pair ? { title: pair[0], objective: pair[1] } : null;
}
export function isAct4Step(step) { return step >= ACT4N.road && step <= ACT4N.after; }
/** Inimigos de um piso: lista de {kind, scale} (o motor luta um por vez). */
export function floorFoes(n) {
  const f = FLOORS[n];
  if (!f || f.rest) return [];
  if (f.miniboss) return [{ kind: 'miniboss' }];
  const list = [];
  for (let i = 0; i < (f.foes || 0); i++) list.push({ kind: 'enemy4' });
  if (f.leader) list.push({ kind: 'leader' });
  return list;
}
export function nextFloor(n) { return n >= 7 ? 7 : n + 1; }
export function scrollMultiplier(owned) { return owned ? 1 + ACT4N.scrollBonus : 1; }
export function afterVeraxion(progress) {
  const p = progress || {}, first = !p.claimed;
  return { coinsGained: first ? ACT4N.reward : 0, xpGained: first ? ACT4N.xp : 0, bishopsDefeated: Math.max(4, Math.floor(Number(p.bishopsDefeated) || 0)) };
}

/* ---------- Falas (texto revisado; original em docs/roteiro/M5-ATO4.md) ---------- */
export function banditScene4() {
  return [say(S.bandit, 'Ei, forasteiro! Daqui ninguém passa sem pagar pedágio.'), say(S.hero, 'Não tenho tempo para isso. Saiam do meu caminho.')];
}
export function rivalReturnScene() {
  return [
    shot('reencontro', 2.2, { cam: 'look', on: 'rival', off: [1.6, 1.7, 3.2], at: [0, 1.3, 0] }),
    say(S.rival, 'E aí, garoto? Fiquei sabendo das suas conquistas…', { actor: 'rival' }),
    say(S.hero, 'Você de novo? O que está fazendo aqui? Deixa pra lá, estou sem tempo. Saia do meu caminho.'),
    say(S.rival, 'Calma. Você quer saber onde o Quarto Bispo está?', { actor: 'rival' }),
    say(S.hero, 'Espera aí… você sabe onde ele está?'),
    say(S.rival, 'Me siga.', { actor: 'rival' })
  ];
}
export function towerViewScene() {
  return [
    shot('torre', 5.5, { cam: 'crane', anchor: 'tower', from: [-18, 6, 46], to: [-10, 26, 34], lookFrom: [0, 10, 0], lookTo: [0, 50, 0] }, { with: [act('titulo', { kicker: 'GALÁXIA 1 · ATO IV', title: 'A Torre de VÉRAXION' }), act('som-descoberta')] }),
    say(S.hero, 'Espera… o que é aquela torre gigante?'),
    say(S.rival, 'Só posso te trazer até aqui, rapaz. Esta é a torre onde VÉRAXION vive. Para chegar até ele, você precisa subir a torre.', { actor: 'rival' }),
    say(S.rival, 'Já vou avisando: quanto mais você sobe, mais inimigos fortes aparecem. Leve isto aqui com você.', { actor: 'rival' }),
    ask('pergaminho'),
    say(S.hero, 'Obrigado pela ajuda. Eu prometo que vou derrotá-lo.'),
    say(S.rival, 'Estarei torcendo por você.', { actor: 'rival' }),
    act('misteriosa-parte4')
  ];
}
export function floorIntroScene(n) {
  const L = {
    1: [say(S.demon, 'Estava te esperando. Você será o meu oponente.'), say(S.hero, 'Aquele VÉRAXION… ele está brincando comigo.')],
    2: [say(S.demon, 'Daqui você não vai passar.'), say(S.hero, 'Então, quanto mais eu avanço, mais inimigos aparecem.')],
    3: [say(S.demon, 'Vamos ver até onde a sua determinação vai te levar.')],
    4: [say(S.demon, 'Daqui você não passa.'), say(S.hero, 'Como se meros vermes pudessem me vencer.')],
    5: [say(S.hero, 'Então VÉRAXION fez até uma sala de descanso para mim? Vou destruir o orgulho dele. Vou fazê-lo se arrepender.')],
    6: [say(S.miniboss, 'Que demora. Estive te esperando esse tempo todo. Quando eu te derrotar, vou comer a sua carne e beber o seu sangue.')],
    7: [say(S.leader, 'Então parece que nem o meu subordinado mais forte deu conta de vencer. Parabéns por ter chegado ao último andar. Mas daqui você não passará.'),
      say(S.hero, 'Eu não tenho mais tempo. Preciso acabar com isso o mais rápido possível!')]
  };
  return (L[n] || []).slice();
}
export function floorClearScene(n) {
  const L = {
    1: [act('escada'), say(S.hero, 'Preciso andar o mais rápido possível. Enquanto eu estou aqui, o Anjo está em perigo.')],
    2: [say(S.demon, 'Tenha piedadeee!'), say(S.hero, 'O que é isso?'), act('escada')],
    3: [say(S.hero, 'Isso está ficando cada vez mais difícil.'), act('escada')],
    4: [say(S.hero, 'Estou muito cansado… preciso descansar. Estou há vários dias sem dormir.'), act('escada')],
    6: [say(S.miniboss, 'Salve-nos…'), say(S.hero, 'O quê?'), act('queimar4'), wait(1.8),
      say(S.hero, 'O que está acontecendo? Por que aquele demônio pediu ajuda e logo em seguida pegou fogo? Faz pouco tempo que percebi… mas esses demônios agem como se fossem humanos.'), act('escada')]
  };
  return (L[n] || []).slice();
}
export function restScene() {
  return [act('descansar'), wait(2.2), act('piscar4'), wait(1.4), say(S.hero, 'Agora que eu descansei, posso voltar a lutar.'), act('escada')];
}
export function leaderDefeatScene() {
  return [
    say(S.leader, 'Então aqui é o nosso fim… O resto, deixo em suas mãos.'),
    act('queimar4'), wait(1.4),
    say(S.hero, 'Eles realmente são demônios?'),
    say(S.boss, 'Então você realmente conseguiu chegar até aqui. Você percebeu, não é?', { actor: 'sky' }),
    say(S.hero, 'Percebi?'),
    say(S.boss, 'Que esses demônios, na verdade, eram humanos. E você matou centenas deles.', { actor: 'sky' }),
    say(S.hero, 'Não é possível… Esse tempo todo eles eram humanos?'),
    say(S.boss, 'Sim. Foram feitos experimentos para transformar humanos em demônios. Os que vocês chamam de mini-chefes são demônios que evoluíram comendo almas humanas. E nós, os quatro Bispos, comemos milhões e milhões de almas para obter este poder.', { actor: 'sky' }),
    say(S.hero, 'Então é por isso que não vejo muitos humanos neste planeta… Mas por que vocês fizeram isso? Qual é o objetivo de vocês?'),
    say(S.boss, 'Se quiser mais respostas, entre no portal e venha me enfrentar.', { actor: 'sky' }),
    shot('portal-torre', 2.6, { cam: 'look', on: 'portal', off: [3, 2.4, 6], at: [0, 2.2, 0] }, { with: [act('portal-torre')] }),
    say(S.hero, 'Então, finalmente, vamos acabar com isso…')
  ];
}
export function veraxionIntroScene() {
  return [say(S.boss, 'Você acha que pode vencer um deus?')];
}
export function veraxionDefeatScene() {
  return [
    say(S.boss, 'Impossíveeeel! Eu, VÉRAXION, o mais forte entre os quatro Bispos, comi centenas de milhões de almas para chegar até aqui… para ser derrotado por um humano?'),
    say(S.hero, 'Bom… eu não sou completamente humano. Me fale tudo o que você sabe!'),
    say(S.boss, 'Quem diabos é você? Só pode ser um demônio igual a mim… Mas, como prometido, vou te contar tudo o que sei.'),
    say(S.boss, 'Há cinquenta anos, este mundo era o planeta Terra, onde as pessoas viviam tranquilamente. Mas, um dia, caiu um meteoro que destruiu três terços do mundo.'),
    say(S.boss, 'Eu era um humano fraco, sempre humilhado pelas pessoas mais fortes. Até que, um dia, a minha mãe foi assassinada. Os assassinos foram presos, mas dois dias depois pagaram para sair da cadeia.'),
    say(S.boss, 'Depois disso, comecei a odiar a justiça comprada pelo dinheiro, pela ganância das pessoas. Até que, um dia, uma pessoa misteriosa chegou até mim e perguntou…'),
    shot('lembranca', 2.2, { cam: 'look', on: 'enemy', off: [0, 2.6, 5], at: [0, 2, 0] }, { with: [act('lembranca')] }),
    say(S.greed, 'Ei, garoto. Você está cansado da ganância das pessoas? Não quer ter poder para mudar este mundo? Eu posso te dar isso. Mas, em troca, quero a sua alma. Abra mão da sua humanidade.'),
    say(S.boss, 'Sim, eu quero mudar a injustiça deste mundo. Me dê poder, eu te dou tudo o que tenho.'),
    act('fim-lembranca'),
    say(S.boss, 'Depois disso, ela me transformou no demônio mais forte. Eu fui o primeiro Bispo a ser criado. Fui atrás daqueles assassinos e os matei.'),
    say(S.boss, 'Depois matei centenas de milhões de pessoas para saciar a minha ganância por mais poder. Mas percebi que estava errado: deixei a minha ganância por vingança me consumir. Matei pessoas inocentes. Eu não mereço viver.'),
    say(S.boss, 'Derrote a Ganância. Só tome cuidado com uma coisa: a Ganância tem três transformações, e a cada uma ganha uma quantidade enorme de poder.'),
    say(S.hero, 'Venha derrotar a Ganância comigo!'),
    say(S.boss, 'Infelizmente eu não posso. Usei poder demais… minha alma não aguenta mais. Adeus.'),
    act('dimensao-desaba4'), act('correr-mao'), wait(2.4)
  ];
}
export function towerFallScene() {
  return [
    shot('torre-cai', 5.5, { cam: 'crane', anchor: 'tower', from: [-30, 10, 60], to: [-26, 14, 56], lookFrom: [0, 30, 0], lookTo: [0, 6, 0] }, { with: [act('torre-cai')] }),
    say(S.hero, 'Então esse tempo todo eu estava lutando contra humanos, em vez de demônios… Não terei piedade da Ganância. Vou destruí-la por completo.')
  ];
}
export function rivalRevealScene() {
  return [
    act('misteriosa-volta'),
    say(S.rival, 'Parece que você saiu vitorioso de novo, não é?', { actor: 'rival' }),
    say(S.hero, 'Quem é você de verdade? Como sabe onde estão os Bispos? E por que está me seguindo?'),
    say(S.rival, 'Calma, não precisa tirar conclusões precipitadas. Não sou subordinada da Ganância; pelo contrário, eu quero destruí-la. Estou de olho em você desde a sua primeira vitória, contra Valério.', { actor: 'rival' }),
    say(S.hero, 'Mas como você sabe tão bem onde os Bispos estavam?'),
    say(S.rival, 'Antes existia um quinto Bispo. Mas esse Bispo era tão fraco que foi expulso. Essa era eu.', { actor: 'rival' }),
    say(S.hero, 'Espera… você era um Bispo?!'),
    say(S.rival, 'Sim.', { actor: 'rival' }),
    say(S.hero, 'Espera, não tenho tempo para conversa fiada. Você sabe onde está a Ganância?'),
    say(S.rival, 'Sei. Mas ainda não é a hora.', { actor: 'rival' }),
    say(S.hero, 'Como assim? Eu não tenho tempo a perder. Preciso salvar o Anjo, ele está em perigo!'),
    say(S.rival, 'Eu vi a luta do Segundo Bispo contra a Ganância. A Ganância destruiu um continente inteiro apenas movendo a mão. Você acha que, neste estado, consegue vencê-la? Nem eu nem os quatro Bispos conseguiríamos arranhar a forma final dela.', { actor: 'rival' }),
    say(S.hero, 'Então o que você quer que eu faça? Fugir?'),
    say(S.rival, 'Óbvio que não. Conheço um lugar perfeito para te deixar preparado.', { actor: 'rival' }),
    act('escuro4'), wait(1.2), act('ato-5'), wait(3.4), act('fecha-cartao')
  ];
}
