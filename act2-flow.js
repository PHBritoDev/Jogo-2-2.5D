/**
 * MOD 195 — Ato II · A Dívida dos Vivos (mundo 3D). Dados e transições puras; testes em act2-flow.test.mjs.
 * Passos continuam a numeração do Ato I (8 = Ato I concluído).
 * Segundo Bispo: VORGAZHEK — O Arauto das Almas Endividadas (cânone do roteiro da Galáxia 1).
 */
export const ACT2 = {
  start: 8, talkGuide: 8, travel: 9, family: 10, ledgers: 11, seal: 12, boss: 13, done: 14,
  ledgerTotal: 3, bossHp: 520, reward: 60, xp: 260
};

export const DISTRICT = { cx: -152, cz: -62, hx: 44, hz: 40 };
export const PASS_RADIUS = 13;
export const DISTRICT_PASS = [[-72, -60], [-90, -57], [-104, -62], [-114, -62]];
export const DISTRICT_SPOTS = {
  gate: { x: -112, z: -62 },
  plaza: { x: -150, z: -62 },
  family: { x: -138, z: -50 },
  seal: { x: -160, z: -70 },
  arena: { x: -158, z: -66 },
  ledgers: [{ x: -176, z: -42, where: 'mina' }, { x: -132, z: -84, where: 'armazém' }, { x: -168, z: -88, where: 'canal' }]
};
export const DISTRICT_CANAL = [[-188, -96], [-170, -82], [-156, -84], [-140, -98], [-128, -100]];

export function act2Presentation(step) {
  const pages = {
    8: ['ATO I · CONCLUÍDO', 'Fale com o Anjo-Guia na vila'],
    9: ['ATO II · A DÍVIDA DOS VIVOS', 'Atravesse a Garganta da Dívida, a oeste da vila'],
    10: ['ATO II · DISTRITO DA FERRUGEM', 'Fale com a família Arruda, perto do canal'],
    11: ['ATO II · OS LIVROS-CAIXA', 'Encontre os três livros-caixa: mina, armazém e canal'],
    12: ['ATO II · O SELO DE DÍVIDA', 'Queime o selo de dívida no altar da praça'],
    13: ['ATO II · VORGAZHEK', 'Derrote o Arauto das Almas Endividadas'],
    14: ['ATO II · CONCLUÍDO', 'As dívidas queimaram. O Ato III aguarda']
  };
  const pair = pages[step];
  return pair ? { title: pair[0], objective: pair[1] } : null;
}

export function act2Started(step) { return step >= ACT2.travel; }
export function isAct2BossStep(step) { return step === ACT2.boss; }

/** Coleta de livro-caixa: só no passo certo, sem contar duas vezes o mesmo. */
export function collectLedger(found, index, step) {
  if (step !== ACT2.ledgers || found.includes(index) || index < 0 || index >= ACT2.ledgerTotal) return { found, advanced: false };
  const next = found.concat([index]);
  return { found: next, advanced: next.length >= ACT2.ledgerTotal };
}

/** Vitória sobre Vorgazhek: recompensa única. */
export function afterVorgazhek(progress) {
  const p = progress || {};
  const first = !p.vorgazhekRewardClaimed;
  return { questStep: ACT2.done, bishopsDefeated: Math.max(2, Math.floor(Number(p.bishopsDefeated) || 0)), vorgazhekRewardClaimed: true, coinsGained: first ? ACT2.reward : 0, xpGained: first ? ACT2.xp : 0 };
}

/** Fase de fúria: anunciada uma vez, ao cruzar metade da vida. */
export function bossPhase(hp, max) { return hp <= max * .5 ? 2 : 1; }

export function act2GuideLines(name) {
  return [
    { who: 'Anjo-Guia', text: (name || 'Viajante') + ', o selo de Valério caiu, mas o livro dele não era o único. A oeste, depois da garganta, há um distrito onde ninguém morre: apenas deve.' },
    { who: 'Anjo-Guia', text: 'Lá a chuva não para. Dizem que é para que ninguém ouça as contas sendo feitas. O Segundo Bispo cobra dos vivos o que os mortos não pagaram.' },
    { who: name || 'Protagonista', text: 'Então vamos ver quem assina esses livros.' }
  ];
}
export function familyLines(name) {
  return [
    { who: 'Dona Arruda', text: 'Não chegue perto do canal. Meu marido devia três sacos de farinha. Hoje deve o próprio nome — e o do nosso filho, que ainda nem fala.' },
    { who: 'Seu Arruda', text: 'O Arauto escreve em livros. Três. Um na mina, um no armazém, um afundado no canal. Enquanto existirem, a dívida cresce até de noite.' },
    { who: name || 'Protagonista', text: 'Livros queimam. Fiquem em casa. Eu trago os três.' }
  ];
}
export function ledgerLines(count) {
  const lines = [
    { who: 'Anjo-Guia', text: 'Veja as margens: juros sobre o choro, multa por luto. Isto não é contabilidade, é liturgia.' },
    { who: 'Anjo-Guia', text: 'O segundo livro tem a letra de Valério nas primeiras páginas. Os Bispos trocam devedores como quem troca moedas.' },
    { who: 'Anjo-Guia', text: 'O último. Todos assinados com o mesmo selo — está no altar da praça. Queime-o, e ele virá cobrar pessoalmente.' }
  ];
  return [lines[Math.max(0, Math.min(2, count - 1))]];
}
export function vorgazhekIntroLines(name) {
  return [
    { who: 'VORGAZHEK', text: 'Ouro compra riquezas. Sangue compra tempo. Mas a tua alma… essa já me pertence. Só vieste tarde demais para descobrir.' },
    { who: 'VORGAZHEK', text: 'Valério guardava moedas. Eu guardo devedores. Ele morreu pobre — eu jamais morrerei, porque alguém sempre me deve.' },
    { who: name || 'Protagonista', text: '“Não devais nada a ninguém, a não ser o amor.” Esta é a única conta que eu vim pagar.' }
  ];
}
export function vorgazhekRageLine() { return 'Cada golpe teu é juros. E juros… eu cobro em dobro.'; }
export function vorgazhekDefeatLines(name) {
  return [
    { who: 'VORGAZHEK', text: 'Os livros… estão queimando sozinhos. Eu não posso cobrar de quem não tem medo.' },
    { who: 'VORGAZHEK', text: 'O Terceiro não precisa de livros, ' + (name || 'viajante') + '. Ele faz as pessoas se ajoelharem e agradecerem pela corrente. Lembra-te disso quando a névoa chegar.' },
    { who: 'Dona Arruda', text: 'O nome do meu filho voltou para a página em branco. Ele é só nosso de novo.' },
    { who: 'Anjo-Guia', text: 'Dois selos. A Ganância está ficando sem lugares para se esconder. Descanse — o Ato III ainda está sendo erguido diante de nós.' }
  ];
}
