/**
 * MOD 205 — Marco 3: Ato II como no roteiro original do autor (docs/roteiro/M3-ATO2.md). Dados e transições puras;
 * as cenas são passos do diretor (cutscenes3d.js). Passos continuam a numeração do Ato I (8 = Ato I concluído).
 * Segundo Bispo: VORGAZHEK. A cidade do vulcão ocupa o antigo distrito; o interior do vulcão está em volcano3d.js.
 *
 * Etapas (questStep) e sub-etapas (act2Sub, salvas em act1Sub):
 *  9  viagem até a cidade do vulcão
 *  10 cidade: 0 atravessar (bandidos) · 1 a pessoa misteriosa (duelo)
 *  11 a entrada do vulcão: 2 Demônios
 *  12 dentro do vulcão: 0 laboratório · 1 a chave (procurar a porta) · 2 o ouro (seguir) · 3 a galeria (5 Demônios) · 4 a sala do trono
 *  13 o portal de VORGAZHEK · 14 Ato II concluído
 */
export const ACT2 = {
  start: 8, talkGuide: 8, travel: 9, city: 10, gate: 11, volcano: 12, boss: 13, done: 14,
  bandits: 5, gateEnemies: 2, labEnemies: 3, deepEnemies: 5,
  enemy2Hp: 150, minibossHp: 480, rivalHp: 220, bossHp: 520, reward: 60, xp: 260, bribe: 10
};

export const DISTRICT = { cx: -152, cz: -62, hx: 44, hz: 40 };
export const PASS_RADIUS = 13;
export const DISTRICT_PASS = [[-72, -60], [-90, -57], [-104, -62], [-114, -62]];
export const DISTRICT_SPOTS = {
  gate: { x: -112, z: -62 },
  plaza: { x: -150, z: -62 },
  // MOD 217 — os bandidos esperam no fim de um beco sem saída ao sul da rua principal (antes atacavam na entrada).
  ambush: { x: -131, z: -76 },
  alley: { x: -131, z0: -66, z1: -80, half: 2.3 },
  rival: { x: -156, z: -58 },
  // MOD 217 — a entrada fica no pé do cone (antes os guardas esperavam longe dela, no meio do caminho).
  volcanoGate: { x: -189.5, z: -64 },
  volcanoGuards: [{ x: -186.5, z: -61.2 }, { x: -186.5, z: -66.8 }],
  volcanoApproach: { cx: -184, cz: -64, hx: 9, hz: 7, round: 4, wobble: 1, tint: [[.3, .24, .2], [.4, .3, .24]], tintStrength: .5 },
  volcano: { x: -228, z: -64 },
  note: { x: -121, z: -62 },
  // Pontos da versão anterior do Ato II (o cenário antigo ainda os usa; a missão não).
  family: { x: -138, z: -50 }, seal: { x: -160, z: -70 }, arena: { x: -158, z: -66 },
  ledgers: [{ x: -176, z: -42, where: 'mina' }, { x: -132, z: -84, where: 'armazém' }, { x: -168, z: -88, where: 'canal' }]
};
/** MOD 217 — Cinzária: ruas, praça e o beco sem saída. Casas: [x, z, largura (x), fundo (z), altura, frente (+1 = +z)]. */
export function cityLayout() {
  const out = [], rnd = (() => { let s = 2171; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const row = (x0, x1, zc, face) => { let x = x0; while (x - 4.4 > x1) { const w = Math.min(5.2 + rnd() * 2.4, x - x1); const cx = x - w / 2; if (!(face > 0 && x - w < -121 && x > -141)) out.push([cx, zc, w - .5, 6 + rnd() * 1.5, 3.6 + Math.floor(rnd() * 3) * 1.6, face]); x -= w + .4 + rnd() * 1.2; } };
  row(-116, -137, -52.5, -1); row(-163, -186, -52.5, -1);   // lado norte da rua principal (z = -62)
  row(-116, -137, -71.5, 1); row(-163, -186, -71.5, 1);     // lado sul (o beco abre um vão em x = -131)
  row(-118, -142, -40.5, -1);                                 // segunda fileira ao norte, numa rua de trás
  out.push([-150, -45.5, 12, 8, 8.6, -1]);                     // casa da guilda, de frente para a praça
  out.push([-168.5, -81, 6, 6, 5.2, 1], [-150, -80, 6.5, 6, 6.8, 1]);
  for (const [z, sx] of [[-69.8, -1], [-69.8, 1], [-75, -1], [-75, 1], [-80.2, -1], [-80.2, 1]]) out.push([-131 - sx * 6.2, z, 7.6, 4.8, 4.2 + (z < -77 ? 3.2 : z < -72 ? 1.6 : 0), 0, sx]);   // casas do beco, de frente para ele
  return out;
}
export function inAlley(x, z) { const A = DISTRICT_SPOTS.alley; return Math.abs(x - A.x) < A.half && z < A.z0 - 2 && z > A.z1; }

export const DISTRICT_CANAL = [[-188, -96], [-170, -82], [-156, -84], [-140, -98], [-128, -100]];
export const CITY_NAME = 'Cinzária';

export function act2Presentation(step, sub = 0) {
  const vol = [['ATO II · DENTRO DO VULCÃO', 'Desça pelo vulcão'], ['ATO II · A CHAVE', 'Procure o lugar escondido que a chave abre'],
    ['ATO II · MAIS FUNDO', 'O Anjo sente algo perto. Siga mais fundo'], ['ATO II · A GALERIA', 'Siga o corredor até a sala secreta'], ['ATO II · A SALA DO TRONO', 'Enfrente o guardião do trono']];
  const pages = {
    8: ['ATO I · CONCLUÍDO', 'Uma longa jornada começa'],
    9: ['ATO II · A CIDADE DO VULCÃO', 'Atravesse a Garganta, a oeste, até a cidade do vulcão'],
    10: sub >= 1 ? ['ATO II · O DESCONHECIDO', 'Alguém na praça diz saber onde está o Segundo Bispo'] : ['ATO II · ' + CITY_NAME.toUpperCase(), 'Atravesse a cidade e procure pistas do Segundo Bispo'],
    11: ['ATO II · A ENTRADA DO VULCÃO', 'Dois Demônios guardam a entrada do vulcão, a oeste da cidade'],
    12: vol[Math.max(0, Math.min(4, sub))],
    13: ['ATO II · VORGAZHEK', 'Entre no portal do Segundo Bispo'],
    14: ['ATO II · CONCLUÍDO', 'Vá à cidade de neve']
  };
  const pair = pages[step];
  return pair ? { title: pair[0], objective: pair[1] } : null;
}

export function act2Started(step) { return step >= ACT2.travel; }
export function isAct2BossStep(step) { return step === ACT2.boss; }

/** Vitória sobre Vorgazhek: recompensa única. */
export function afterVorgazhek(progress) {
  const p = progress || {};
  const first = !p.vorgazhekRewardClaimed;
  return { questStep: ACT2.done, bishopsDefeated: Math.max(2, Math.floor(Number(p.bishopsDefeated) || 0)), vorgazhekRewardClaimed: true, coinsGained: first ? ACT2.reward : 0, xpGained: first ? ACT2.xp : 0 };
}

/** Fase de fúria: anunciada uma vez, ao cruzar metade da vida. */
export function bossPhase(hp, max) { return hp <= max * .5 ? 2 : 1; }
export function vorgazhekRageLine() { return 'Cada golpe teu é juros. E juros… eu cobro em dobro.'; }

/* ---------- Falas (texto revisado; original em docs/roteiro/M3-ATO2.md) ---------- */
export const SPEAKERS2 = { hero: 'heroi', guide: 'Anjo-Guia', bandit: 'Bandido', rival: 'Desconhecido', demon: 'Demônio da Ganância', miniboss: 'Guardião do Trono', boss: 'VORGAZHEK', bishop4: 'VÉRAXION', note: 'Bilhete' };
const S = SPEAKERS2;
const say = (who, text, extra) => Object.assign({ type: 'say', who, text }, extra || {});
const shot = (id, dur, args, extra) => Object.assign({ type: 'shot', id, dur, args: args || {} }, extra || {});
const act = (id, args) => ({ type: 'do', id, args: args || {} });
const wait = dur => ({ type: 'wait', dur });

export function cityArrivalScene() {
  return [
    shot('cidade-panorama', 6, { cam: 'crane', anchor: 'city', from: [40, 26, 30], to: [22, 10, 14], lookFrom: [-60, 18, 0], lookTo: [-30, 4, 0] },
      { with: [act('titulo', { kicker: 'GALÁXIA 1 · ATO II', title: CITY_NAME }), act('som-descoberta'), act('anjo-aparece')] }),
    say(S.hero, 'Uma cidade em um vulcão?'),
    say(S.guide, 'Pelo que parece, esse vulcão pode entrar em erupção a qualquer momento.'),
    say(S.hero, 'Mas assim essa cidade em breve será destruída. Nós precisamos tirar esse povo daqui.'),
    act('anjo-parte')
  ];
}

export function banditScene() {
  return [
    say(S.hero, 'Parece que estou sendo seguido…'),
    shot('beco', 2.6, { cam: 'orbit', on: 'hero', r: 6, h: 2.6, from: -.8, to: .8 }, { with: [act('cercar')] }),
    say(S.bandit, 'Ei, forasteiro, parece que você não conhece bem as regras desta cidade. Vai passando tudo o que você tem, se não quiser morrer.', { actor: 'bandit' }),
    say(S.hero, 'Vocês não perceberam que o mundo está em caos? Por que estão lutando entre si?'),
    say(S.bandit, 'A gente luta pra sobreviver. Desde que VORGAZHEK chegou nesta cidade, ele levou todo o dinheiro dela pra si. Desde então, a gente luta pra conseguir sobreviver.', { actor: 'bandit' }),
    say(S.hero, 'Toma esse saco de moedas e sumam da minha frente.'),
    shot('moedas', 3, { cam: 'look', on: 'hero', off: [3, 2.2, 3.5], at: [0, .4, 1.6] }, { with: [act('jogar-moedas')] }),
    shot('pobreza', 3.4, { cam: 'look', on: 'hero', off: [-1.5, 2.4, -3.6], at: [0, 1, 8] })
  ];
}

export function rivalScene() {
  return [
    shot('psiu', 2.2, { cam: 'look', on: 'rival', off: [1.6, 1.7, 3.2], at: [0, 1.3, 0] }, { with: [act('surgir-misteriosa')] }),
    say(S.rival, 'Ei, psiu. Fiquei sabendo que você está procurando VORGAZHEK. Eu sei onde ele está.', { actor: 'rival' }),
    say(S.hero, 'Quem é você? E qual é o seu objetivo?'),
    say(S.rival, 'Calma, calma, não precisa ter medo. Eu só quero salvar esta cidade.', { actor: 'rival' }),
    say(S.rival, 'Vamos fazer o seguinte: vamos lutar. Se eu ganhar, quero a sua espada. Mas, se eu perder, te conto tudo o que sei.', { actor: 'rival' })
  ];
}

export function rivalDefeatScene() {
  return [
    shot('arma-apontada', 2, { cam: 'two', a: 'hero', b: 'rival', side: 1, dist: 3.6 }, { with: [act('apontar-arma')] }),
    say(S.rival, 'Esperaaaa! Tá bom, eu conto tudo. Ouvi rumores de que dentro do vulcão não tem lava: é um vulcão falso. Lá dentro é onde o Bispo está.', { actor: 'rival' }),
    say(S.rival, 'Mas é impossível entrar: há dois demônios de guarda na entrada do vulcão. Isso é tudo o que eu sei.', { actor: 'rival' }),
    say(S.rival, 'Antes de você ir… poderia me dizer o seu nome?', { actor: 'rival' }),
    say(S.hero, 'Não se esqueça: sou {nome}. A pessoa que irá derrotar a Ganância e salvar este mundo.'),
    act('misteriosa-parte'),
    shot('anjo-avisa', 1.4, { cam: 'two', a: 'hero', b: 'guide', side: -1, dist: 4 }, { with: [act('anjo-aparece')] }),
    say(S.guide, 'Cuidado, pode ser uma armadilha.'),
    say(S.hero, 'Mesmo que seja, eu preciso ir.'),
    act('anjo-parte')
  ];
}

export function gateScene() {
  return [
    shot('entrada', 3, { cam: 'look', on: 'hero', off: [1.4, 2.6, -3.4], at: [0, 3, 14] }),
    say(S.demon, 'Um humano? Como você chegou até aqui? Mas, como recompensa por ter chegado aqui, eu vou brincar um pouco com você antes de te matar.'),
    say(S.hero, 'Eu sou o enviado de Deus para purificar este mundo. Vou matar todos vocês, que brincam com a alma humana.')
  ];
}

export function gateDefeatScene() {
  return [
    say(S.demon, 'Isso é impossível… como nós fomos derrotados por um mero humano? Espera… você é realmente humano?'),
    say(S.demon, 'Ouvi rumores de que Valério foi derrotado por alguém, mas achei que era apenas um mito. Parece que foi você, né?'),
    shot('eliminar', 2.6, { cam: 'look', on: 'enemy', off: [2.4, 1.6, 3], at: [0, 1, 0] }, { with: [act('eliminar')] })
  ];
}

export function labScene() {
  return [
    shot('ossos', 3, { cam: 'look', on: 'hero', off: [1.2, 1.4, -2.4], at: [0, 0, 6] }),
    shot('laboratorio', 3.4, { cam: 'look', on: 'lab', off: [6.5, 3.4, 6], at: [0, .8, 0] }),
    say(S.hero, 'Que Deus tenha piedade dessas pobres almas. Pessoas que nem tiveram a chance de se proteger…'),
    say(S.hero, 'Em um ato de misericórdia, irei purificar suas almas.'),
    shot('circulo', 2.4, { cam: 'look', on: 'lab', off: [0, 7, 7], at: [0, 0, 0] }, { with: [act('circulo-magico')] }),
    say(S.hero, 'Purificação.', { auto: 1.6 }),
    shot('purificacao', 3.4, { cam: 'look', on: 'lab', off: [5, 3, 5], at: [0, 1.4, 0] }, { with: [act('purificar')] }),
    shot('mais-tres', 2.2, { cam: 'look', on: 'hero', off: [-2, 2.2, -3.6], at: [0, 1, 6] }, { with: [act('surgir-tres')] }),
    say(S.demon, 'Quem é você? E cadê os corpos que estavam aqui?'),
    say(S.hero, 'Pessoas que estão predestinadas a morrer não precisam saber.'),
    say(S.demon, 'Matem ele!')
  ];
}

export function keyScene() {
  return [
    shot('chave', 1.6, { cam: 'two', a: 'hero', b: 'guide', side: 1, dist: 4 }, { with: [act('anjo-aparece')] }),
    say(S.guide, 'Parece que essa chave deve abrir algum lugar escondido desta caverna do vulcão.'),
    act('anjo-parte')
  ];
}

export function goldScene() {
  return [
    shot('porta', 2.4, { cam: 'look', on: 'door', off: [3.4, 2.4, 2.4], at: [0, 2, 0] }, { with: [act('abrir-porta')] }),
    shot('ouro', 3, { cam: 'look', on: 'gold', off: [5, 3, 3], at: [0, .6, 0] }, { with: [act('anjo-aparece')] }),
    say(S.guide, 'Então era aí que o ouro estava escondido.'),
    say(S.hero, 'O que devemos fazer?'),
    say(S.guide, 'Estou sentindo algo bem perto daqui. Vá lá. Deixe comigo: eu vou devolver esse ouro a esta cidade.'),
    act('anjo-fica-ouro')
  ];
}

export function hallScene() {
  return [
    shot('galeria', 2.4, { cam: 'look', on: 'hero', off: [-1.6, 2.6, -3.4], at: [0, 1, 8] }, { with: [act('surgir-cinco')] }),
    say(S.demon, 'Um humano neste lugar? Isso é impossível! Peguem ele!')
  ];
}

export function hallDefeatScene() {
  return [
    say(S.demon, 'Impossível… essa força esmagadora… ele só pode ser um Arcanjo de alto nível.'),
    say(S.hero, 'Apesar de eu ser um anjo recém-nomeado, eles acham que eu sou um dos Arcanjos mais fortes…')
  ];
}

export function throneScene() {
  return [
    shot('sala-secreta', 3.6, { cam: 'look', on: 'hero', off: [1.4, 3.2, -4], at: [0, 4, 18] }),
    shot('mini-chefe', 2.4, { cam: 'look', on: 'enemy', off: [2.6, 2.4, 5.4], at: [0, 2, 0] }, { with: [act('surgir-mini-chefe')] }),
    say(S.miniboss, 'Te dou os meus parabéns por ter conseguido chegar até aqui. Sinta-se honrado de morrer em minhas mãos.'),
    say(S.hero, 'Você é apenas mais um obstáculo no meio do caminho que eu tenho que superar.'),
    say(S.miniboss, 'Ahahaha, admiro a sua coragem. Mas é apenas isso que você tem. Sinta o desespero… e MORRA.')
  ];
}

export function minibossDefeatScene() {
  return [
    say(S.miniboss, 'Eu admito a minha derrota… você realmente é muito forte. Mas não o suficiente para derrotar VORGAZHEK. Ele está em outro patamar: pode até ser considerado um deus.'),
    say(S.miniboss, 'Mas, como recompensa, vou te contar algo. Cada dimensão foi criada pelos próprios Bispos. Cada dimensão é outra realidade, que reflete a personalidade de quem a criou.'),
    say(S.miniboss, 'VORGAZHEK… houve um tempo em que foi considerado o mais forte. Mas desafiou a Ganância e perdeu feio. Depois disso, foi rebaixado de classe.'),
    say(S.miniboss, 'Te aguardo no inferno.'),
    shot('portal-surge', 2.6, { cam: 'look', on: 'portal', off: [4, 3, 8], at: [0, 4, 0] }, { with: [act('portal-surge')] })
  ];
}

export function vorgazhekIntroScene() {
  return [
    say(S.boss, 'Eu estava te esperando. Não acredito que Valério foi realmente derrotado por alguém como você. Não terei piedade.'),
    say(S.hero, 'Assim que eu te derrotar, irei salvar esta cidade.'),
    say(S.boss, 'Ahahahaha! Que cidade? Você não percebeu? Assim que você entrou aqui, o vulcão foi ativado e entrou em erupção. Você realmente achou que esse vulcão era falso?'),
    say(S.hero, 'Não pode ser… isso é impossível.'),
    say(S.boss, 'Por que você não olha com os seus próprios olhos? Presumo que você tenha habilidade para isso, certo?'),
    shot('visao', 6.5, { cam: 'crane', anchor: 'city', from: [70, 70, 60], to: [40, 46, 36], lookFrom: [-60, 22, 0], lookTo: [-20, 0, 0] }, { with: [act('visao-inicio')] }),
    act('visao-fim'),
    say(S.boss, 'Se quiser realmente salvar esta cidade, então terá que me derrotar. Mas isso é impossível.')
  ];
}

export function vorgazhekDefeatScene() {
  return [
    say(S.boss, 'Que poder extraordinário… nem a Ganância conseguiu fazer algo parecido. Deixe-me contar como eu fui derrotado por ela.'),
    say(S.boss, 'Eu usei o meu poder máximo logo de início. Mas, quando pensei que o tinha derrotado, ele estava apenas brincando comigo. Ele se transformou numa segunda fase e ficou mais forte ainda.'),
    say(S.boss, "Disse que não queria sujar as mãos e mandou ZAR'KHAEL. No final, eu não consegui fazer um único arranhão no Terceiro Bispo."),
    say(S.boss, 'Vá em paz, garoto. Um trágico destino te espera.')
  ];
}

/** De volta à cidade destruída; a sombra no céu; o buraco negro de VÉRAXION; o Anjo some; o bilhete. */
export function afterVorgazhekScene() {
  return [
    shot('volta-cidade', 2.2, { cam: 'two', a: 'hero', b: 'guide', side: 1, dist: 4.4 }, { with: [act('anjo-aparece')] }),
    say(S.guide, 'Então você conseguiu derrotar VORGAZHEK.'),
    say(S.hero, 'E a cidade?'),
    say(S.guide, 'As pessoas conseguiram fugir a tempo.'),
    shot('cidade-destruida', 4.2, { cam: 'crane', anchor: 'city', from: [26, 14, 18], to: [8, 9, 10], lookFrom: [0, 1, 0], lookTo: [-16, 1, -4] }),
    say(S.hero, 'Agora que o vulcão parou a erupção, vamos investigar todas as pistas que tem nele.'),
    say(S.guide, 'Espera… o que é aquilo no céu?'),
    act('ato-3'), wait(3.4), act('fecha-cartao'),
    shot('sombra', 3, { cam: 'look', on: 'hero', off: [1, 1.2, -3.2], at: [0, 16, 14] }, { with: [act('sombra-no-ceu')] }),
    say(S.hero, 'Quem diabos é você?'),
    say(S.bishop4, 'Droga, aquele fracote arrogante do VORGAZHEK não conseguiu lidar nem com um simples humano… e ainda fez eu, VÉRAXION, o mais forte entre os Bispos, vir limpar a bagunça dele.', { actor: 'sky' }),
    say(S.hero, 'Espera… o quê? Bispo 4?'),
    say(S.guide, 'Fujaaaa! Você ainda não está preparado para lutar contra ele!'),
    shot('feitico', 4, { cam: 'look', on: 'hero', off: [-7, 6, -12], at: [0, 17, 16] }, { with: [act('feitico')] }),
    say(S.bishop4, 'Fogo do abismo, que devora tudo pelo caminho; fogo que nunca se apaga, até que seja queimado corpo e alma.', { actor: 'sky' }),
    shot('buraco-cresce', 2.6, { cam: 'look', on: 'hero', off: [-4, 3, -9], at: [0, 32, 18] }),
    shot('buraco-negro', 3.4, { cam: 'crane', anchor: 'city', from: [46, 30, 30], to: [40, 24, 26], lookFrom: [-10, 14, 0], lookTo: [-34, 4, -2] }, { with: [act('buraco-negro')] }),
    say(S.guide, 'Saia daquiii!', { auto: 1.2 }),
    act('explosao'), wait(2.8),
    shot('silhueta', 3, { cam: 'look', on: 'hero', off: [6, 3, -10], at: [0, 16, 16] }, { with: [act('piscar-branco')] }),
    shot('acordar', 2.4, { cam: 'look', on: 'hero', off: [1.6, 1.6, 2.6], at: [0, .6, 0] }, { with: [act('acordar')] }),
    say(S.hero, 'O que aconteceu?'),
    say(S.hero, 'Espera… e a cidade? Cadê o Anjo?'),
    shot('abismo', 4, { cam: 'look', on: 'hero', off: [-.6, 2.2, -3], at: [0, -2, 16] }, { with: [act('abismo')] }),
    say(S.hero, 'Anjo… Anjo! ANJOOOO! Onde você está?'),
    shot('bilhete', 2.4, { cam: 'look', on: 'hero', off: [.8, 1.4, 1.8], at: [0, 0, 1.2] }, { with: [act('bilhete')] }),
    say(S.note, '"Vá à cidade de neve."', { actor: 'hero' })
  ];
}
