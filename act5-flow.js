/**
 * MOD 208 — Marco 6: Ato V como no roteiro original do autor (docs/roteiro/M6-ATO5.md). Dados e transições puras;
 * as cenas são passos do diretor (cutscenes3d.js). O torneio do coliseu decide quem vira o próximo Bispo.
 *
 * Etapa 25 (sub-etapas salvas em act1Sub):
 *  0 a jornada atrás da pessoa misteriosa · 1 a chegada ao coliseu · 2 a 9 os rounds 1 a 8
 * Depois do coliseu, o jogo segue para o Ato VI (passo 27) até o Marco 7 trocar esse trecho.
 */
export const ACT5N = { step: 25, journey: 0, arrival: 1, firstRound: 2, next: 27, celestialCost: 220 };
/** Os oito rounds do roteiro (auras de "evoluídos": cor por tipo; rig = modelo do inimigo). */
export const ROUNDS = [
  { n: 1, foes: [{ rig: 'enemy1', name: 'SEGUIDOR EVOLUÍDO', profile: 'evo1', hp: 200, scale: 1 }], aura: 0xff3a30 },
  { n: 2, foes: [{ rig: 'enemy2', name: 'DEMÔNIO EVOLUÍDO', profile: 'evo2', hp: 220, scale: 1 }], aura: 0xff8a20 },
  { n: 3, foes: [{ rig: 'enemy3', name: 'CARRASCO EVOLUÍDO', profile: 'evo3', hp: 240, scale: 1 }], aura: 0x3a8aff },
  { n: 4, foes: [{ rig: 'enemy1', name: 'ELITE DOS SEGUIDORES', profile: 'elite1', hp: 420, scale: 1.6 }], aura: 0xd0102a },
  { n: 5, foes: [{ rig: 'enemy2', name: 'ELITE DOS DEMÔNIOS', profile: 'elite2', hp: 460, scale: 1.6 }], aura: 0xffc23a },
  { n: 6, foes: [{ rig: 'enemy3', name: 'ELITE DOS CARRASCOS', profile: 'elite3', hp: 500, scale: 1.6 }], aura: 0xa040ff },
  { n: 7, foes: [{ rig: 'enemy4', name: 'ELITE DOS GUARDIÕES', profile: 'elite4', hp: 560, scale: 1.6 }], aura: 0x7ae8ff },
  { n: 8, ally: true, aura: 0xff2a6a, foes: [
    { rig: 'enemy1', name: 'ELITE DOS SEGUIDORES', profile: 'elite1', hp: 380, scale: 1.6, aura: 0xd0102a },
    { rig: 'enemy2', name: 'ELITE DOS DEMÔNIOS', profile: 'elite2', hp: 380, scale: 1.6, aura: 0xffc23a },
    { rig: 'enemy3', name: 'ELITE DOS CARRASCOS', profile: 'elite3', hp: 380, scale: 1.6, aura: 0xa040ff },
    { rig: 'enemy4', name: 'ELITE DOS GUARDIÕES', profile: 'elite4', hp: 380, scale: 1.6, aura: 0x7ae8ff }] }
];
export function roundForSub(sub) { const i = sub - ACT5N.firstRound; return i >= 0 && i < ROUNDS.length ? ROUNDS[i] : null; }
export function subForRound(n) { return ACT5N.firstRound + n - 1; }
export function act5Presentation(sub = 0) {
  if (sub <= ACT5N.journey) return { title: 'ATO V · A JORNADA', objective: 'Acompanhe a pessoa misteriosa' };
  if (sub === ACT5N.arrival) return { title: 'ATO V · O COLISEU', objective: 'Entre na arena do coliseu' };
  const r = roundForSub(sub);
  return r ? { title: 'ATO V · ROUND ' + r.n + ' DE ' + ROUNDS.length, objective: r.n === 8 ? 'Vença as quatro elites ao mesmo tempo' : 'Vença o seu oponente' } : null;
}

/** Inventário: a melhor espada que o jogador tem (maior dano). */
export function bestSword(swords, owned) {
  let best = 'prota';
  for (const id of Object.keys(swords)) if ((id === 'prota' || owned.has(id)) && swords[id].damage > swords[best].damage) best = id;
  return best;
}

export const SPEAKERS5 = { hero: 'heroi', rival: 'Pessoa Misteriosa', e1: 'Seguidor Evoluído', e2: 'Demônio Evoluído', e3: 'Carrasco Evoluído',
  m1: 'Elite dos Seguidores', m2: 'Elite dos Demônios', m3: 'Elite dos Carrascos', m4: 'Elite dos Guardiões' };
const S = SPEAKERS5;
const say = (who, text, extra) => Object.assign({ type: 'say', who, text }, extra || {});
const shot = (id, dur, args, extra) => Object.assign({ type: 'shot', id, dur, args: args || {} }, extra || {});
const act = (id, args) => ({ type: 'do', id, args: args || {} });
const wait = dur => ({ type: 'wait', dur });

/* ---------- Falas (texto revisado; original em docs/roteiro/M6-ATO5.md) ---------- */
export function journeyScene() {
  return [say(S.rival, 'Me siga. O caminho é longo, e o lugar fica a leste da torre.', { actor: 'rival' })];
}
export function arrivalScene() {
  return [
    shot('coliseu', 6, { cam: 'crane', anchor: 'colosseum', from: [-86, 10, -14], to: [-80, 28, -11], lookFrom: [0, 12, 0], lookTo: [0, 4, 0] }, { with: [act('titulo', { kicker: 'GALÁXIA 1 · ATO V', title: 'O Coliseu da Ascensão' }), act('som-descoberta'), act('torcida', { level: .6 })] }),
    say(S.hero, 'Que lugar é este?'),
    say(S.rival, 'É um coliseu onde vários demônios lutam para decidir quem vai se tornar o próximo Bispo.', { actor: 'rival' }),
    say(S.hero, 'Eu lutei contra demônios de alta patente, que poderiam destruir um país inteiro sozinhos. Como vou evoluir contra esses demônios de baixo escalão?'),
    say(S.rival, 'É aí que você se engana. Os demônios daqui não são tão fortes quanto os Bispos, mas não estamos aqui para treinar com eles. Estamos aqui pela recompensa deste ano.', { actor: 'rival' }),
    say(S.rival, 'A cada cinco anos, uma relíquia perdida é sorteada neste torneio. Quem chegar até a final pode ganhar uma Espada Celestial que caiu do céu.', { actor: 'rival' }),
    say(S.hero, 'Uma Espada Celestial que caiu do céu? Mas para que demônios querem uma arma que não podem usar? Se um demônio tocar numa espada dessas, é desintegrado na hora.'),
    say(S.rival, 'Exatamente. Eles não querem isso. Fiquei sabendo que a Ganância está usando a espada para te atrair até aqui, e o demônio que te derrotar poderá se tornar um Bispo na hora. Então, este ano, vão aparecer os demônios mais fortes que existem.', { actor: 'rival' }),
    say(S.rival, 'Estarei torcendo por você no palco.', { actor: 'rival' }),
    say(S.hero, 'Mas só tem demônios aqui. Você vai se sentar com eles?'),
    say(S.rival, 'Vou usar o meu poder de Bispo para me transformar em um demônio. Por mais fraco que seja, vai ser útil.', { actor: 'rival' }),
    act('misteriosa-demonio')
  ];
}
const R = {
  1: { intro: [say(S.e1, 'Eu vou te derrotar e me tornar um Bispo!'),
    say(S.hero, 'Uma pergunta: vocês estão aqui porque foram obrigados a se tornar demônios, ou quiseram por vontade própria?'),
    say(S.e1, 'Nós ficamos sabendo que alguém estava dando poder de graça e fomos atrás. Não existe ser humano que resista a obter tanto poder apenas em troca da alma.'),
    say(S.hero, 'Vocês não sabem o quanto as suas almas valem. Mas fico feliz em ouvir isso. Agora posso matar sem hesitar.')],
    outro: [say(S.e1, 'Vamos ver quanto tempo você vai durar. Estarei te esperando no inferno.')] },
  2: { intro: [say(S.e2, 'Agora o seu oponente serei eu. Eu mereço me tornar um Bispo mais do que todos.'), say(S.hero, 'Todos estão desesperados para me matar.')],
    outro: [say(S.e2, 'Drogaaa! O cargo de Bispo era para ser meu.')] },
  3: { intro: [say(S.e3, 'O seu fim chega aqui, humano orgulhoso.'), say(S.hero, 'Já cansei desses insetos falando em me derrotar.')],
    outro: [say(S.e3, 'Tenha piedadeee! Eu ainda não quero morrer.'), say(S.hero, 'Você vendeu a sua alma por poder. Agora aceite as consequências.')] },
  4: { intro: [say(S.m1, 'É aqui que a sua jornada acaba. Não ouse me comparar com aqueles insetos.'), say(S.hero, 'O líder dos Seguidores. Bem, não vai mudar nada: você terá o mesmo destino trágico dos outros.')],
    outro: [say(S.m1, 'Eu me recuso a aceitar a minha derrota! Ele trapaceou! Um humano não pode vencer um demônio!'), say(S.hero, 'Apenas desapareça.')] },
  5: { intro: [say(S.m2, 'Não sei como você chegou tão longe, mas agradeço por estar vivo. Assim eu poderei me tornar um Bispo!'), say(S.hero, 'Todos vêm com a mesma conversa de me derrotar para se tornar um Bispo. Já estou cansado disso.')],
    outro: [say(S.m2, 'Por favor, não me mate! Eu fui manipulado!'), say(S.hero, 'Não minta para mim. Apenas pereça.')] },
  6: { intro: [say(S.m3, 'Você é forte, mas eu comi centenas de almas para chegar até aqui. Aqui a sua jornada acaba.'), say(S.hero, 'Vamos ver até onde essa sua confiança vai te levar.')],
    outro: [say(S.m3, 'Eu errei, me perdoa! Estou arrependido! Já sei: vou me tornar o seu subordinado!'),
      say(S.hero, 'Nunca. Depois de ter matado centenas de pessoas, você acha que eu vou te perdoar? Quantas pessoas pediram misericórdia para você… e, no final, você as matou.')] },
  7: { intro: [say(S.m4, 'Vou dar o meu máximo logo de início. Não sou igual aos outros, que brincam com o oponente. Seja uma mosca ou um dragão, darei o meu máximo desde o início.'), say(S.hero, 'Finalmente, um demônio inteligente.')],
    outro: [say(S.m4, 'Mesmo dando o meu máximo, eu ainda perdi… Me mate logo.'),
      say(S.hero, 'Se você não tivesse vendido a sua alma para a Ganância, eu poderia te deixar viver. Mas, como um ato de misericórdia, vou te matar com um único golpe, para que não sinta dor.')] },
  8: { intro: [say(S.hero, 'Quanto mais Elites existem, mais elas não param de vir. E isso não é trapaça? Quatro contra um?'),
    say(S.m1, 'Você é que está usando alguma trapaça para ter vencido os nossos irmãos.'),
    say(S.m4, 'Você vai pagar por ter matado o meu irmão.'),
    say(S.m3, 'É aqui que o seu fim chega. Quando você morrer, vou fazer um banquete com a sua carne para os meus subordinados.'),
    say(S.m2, 'Você acha mesmo que pode derrotar quatro Elites ao mesmo tempo?'),
    say(S.hero, 'Pode juntar os quatro. Não dão nem para um de mim.'),
    act('misteriosa-entra'),
    say(S.rival, 'Eu vou me juntar a essa batalha.', { actor: 'rival' }),
    say(S.hero, 'O que você está fazendo aqui?'),
    say(S.m1, 'Eu não ligo. Podem vir quantos humanos quiserem. No final, ainda são apenas humanos: não podem fazer nada.')],
    outro: [] }
};
export function roundIntroScene(n) { return [act('round', { n }), wait(1.6)].concat(R[n].intro); }
export function roundOutroScene(n) { return R[n].outro.slice(); }
export function finalScene() {
  return [
    say(S.hero, 'Como você é tão forte assim? Naquela batalha, você se segurou de propósito, não é?'),
    say(S.rival, 'Ahaha, você percebeu. Eu estava apenas te testando, para ver se podia confiar em você.', { actor: 'rival' }),
    act('espada-celestial'), wait(2.2),
    act('tremor'),
    say(S.rival, 'Vamos sair daqui, está tudo desmoronando!', { actor: 'rival' }),
    act('correr-saida'), wait(2.6),
    shot('coliseu-cai', 5.5, { cam: 'crane', anchor: 'colosseum', from: [-86, 14, -14], to: [-84, 18, -12], lookFrom: [0, 14, 0], lookTo: [0, 2, 0] }, { with: [act('coliseu-cai')] }),
    say(S.hero, 'O que faremos agora?'),
    say(S.rival, 'Agora chegou a hora. Vamos derrotar a Ganância e salvar o seu amigo.', { actor: 'rival' }),
    say(S.hero, 'Mas você sabe onde ele está?'),
    say(S.rival, 'Eu tenho uma pista. Avistei algo suspeito: uma estátua gigante em um deserto, não muito longe daqui.', { actor: 'rival' }),
    say(S.hero, 'Então vamos. Não podemos perder muito tempo.'),
    act('escuro5'), wait(1.2), act('ato-6'), wait(3.4), act('fecha-cartao')
  ];
}
