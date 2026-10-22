/**
 * MOD 192 — Missões opcionais do Ato I (regras puras; testes em sidequests3d.test.mjs).
 * Pequenas histórias da vila que ampliam o mundo sem desviar do objetivo principal.
 * Estados: 'locked' → 'available' → 'active' → 'ready' → 'done'.
 */
export const SIDE_QUESTS = [
  {
    id: 'ervas', giver: 'ERVAS', title: 'Flores de Vigília', minStep: 1,
    goal: { type: 'collect', item: 'flor', count: 4 },
    reward: { coins: 10, xp: 30 },
    offer: [
      { who: 'Mara · Ervas', text: 'Há uma flor que só abre quando o medo está acordado. Flor de Vigília. Faz chá para quem não dorme desde que as crianças sumiram.' },
      { who: 'Mara · Ervas', text: 'Elas brilham entre as árvores, longe da trilha. Traz quatro e eu te pago com o pouco que tenho.' }
    ],
    progressLine: 'Encontre Flores de Vigília (brilham entre as árvores)',
    turnIn: [
      { who: 'Mara · Ervas', text: 'Quatro… e ainda frescas. Hoje alguém nesta vila vai fechar os olhos sem ouvir unhas na porta.' }
    ]
  },
  {
    id: 'pingente', giver: 'FRUTAS', title: 'O Pingente de Lia', minStep: 2,
    goal: { type: 'collect', item: 'pingente', count: 1 },
    reward: { coins: 14, xp: 35 },
    offer: [
      { who: 'Lia · Frutas', text: 'Meu filho estava entre os que levaram para a mata. Quando correram com ele, o pingente da mãe dele caiu perto do lago escuro.' },
      { who: 'Lia · Frutas', text: 'Não é ouro. É a única coisa dela que sobrou. Se você passar por lá…' }
    ],
    progressLine: 'Procure o pingente perto do Lago Escuro',
    turnIn: [
      { who: 'Lia · Frutas', text: 'É ele. Ela gravou o nome dele atrás, para que ninguém pudesse dizer que ele era de outra pessoa.' },
      { who: 'Lia · Frutas', text: 'Toma. Não é pagamento — é o que se faz quando alguém devolve um nome.' }
    ]
  },
  {
    id: 'abrigos', giver: 'ARTESANATO', title: 'Pedras que Lembram', minStep: 1,
    goal: { type: 'waystones', count: 3 },
    reward: { coins: 12, xp: 40 },
    offer: [
      { who: 'Nara · Artesanato', text: 'Meu avô talhou as pedras de abrigo da mata. Diziam que quem as tocasse nunca se perderia.' },
      { who: 'Nara · Artesanato', text: 'Registre as três e me conte. Quero saber se ainda reconhecem um viajante honesto.' }
    ],
    progressLine: 'Registre as três pedras de abrigo',
    turnIn: [
      { who: 'Nara · Artesanato', text: 'As três acenderam? Então a mata ainda lembra quem é bem-vindo. Leve isto — foi ele quem fez.' }
    ]
  }
];

export function createSideState(saved) {
  const out = {};
  for (const q of SIDE_QUESTS) {
    const s = saved && saved[q.id];
    out[q.id] = { state: ['active', 'ready', 'done'].includes(s && s.state) ? s.state : 'locked', progress: Math.max(0, Math.floor(Number(s && s.progress) || 0)) };
  }
  return out;
}

/** Atualiza disponibilidade e prontidão. ctx: { questStep, waystones }. */
export function refreshSide(state, ctx) {
  for (const q of SIDE_QUESTS) {
    const s = state[q.id];
    if (s.state === 'locked' && ctx.questStep >= q.minStep) s.state = 'available';
    if (q.goal.type === 'waystones' && s.state === 'active') s.progress = Math.min(q.goal.count, ctx.waystones || 0);
    if (s.state === 'active' && s.progress >= q.goal.count) s.state = 'ready';
  }
  return state;
}

export function acceptSide(state, id) {
  const s = state[id];
  if (!s || s.state !== 'available') return false;
  s.state = 'active';
  return true;
}

/** Coleta um item; só conta se a missão correspondente estiver ativa. */
export function collectSide(state, item) {
  for (const q of SIDE_QUESTS) {
    const s = state[q.id];
    if (q.goal.type === 'collect' && q.goal.item === item && s.state === 'active') {
      s.progress = Math.min(q.goal.count, s.progress + 1);
      if (s.progress >= q.goal.count) s.state = 'ready';
      return q;
    }
  }
  return null;
}

/** Entrega: devolve a recompensa uma única vez. */
export function turnInSide(state, id) {
  const q = SIDE_QUESTS.find(x => x.id === id), s = state[id];
  if (!q || !s || s.state !== 'ready') return null;
  s.state = 'done';
  return q.reward;
}

export function questForGiver(state, giver) {
  return SIDE_QUESTS.find(q => q.giver === giver && ['available', 'active', 'ready'].includes(state[q.id].state)) || null;
}

export function activeSideLines(state) {
  return SIDE_QUESTS.filter(q => ['active', 'ready'].includes(state[q.id].state)).map(q => {
    const s = state[q.id];
    return s.state === 'ready' ? q.title + ' · volte a ' + q.offer[0].who.split(' · ')[0] : q.title + ' · ' + s.progress + '/' + q.goal.count;
  });
}
