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

export const SIDE_QUEST_WAYSTONES = Object.freeze([
  'abrigo-vila',
  'abrigo-mata',
  'abrigo-caverna'
]);

// Uma entrega cruza dois saves (campanha e vila); o pending evita perder ou pagar duas vezes em crash.
function normalizePendingReward(value, quests) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const q = SIDE_QUESTS.find(item => item.id === value.questId);
  if (!q || quests[q.id]?.state !== 'done' || quests[q.id]?.progress !== q.goal.count || value.claimId !== 'side:' + q.id + ':v2') return null;
  const { coins, xp, beforeCoins, afterCoins, beforeXp, afterXp } = value;
  if (![coins, xp, beforeCoins, afterCoins, beforeXp, afterXp].every(Number.isSafeInteger)) return null;
  if (coins !== q.reward.coins || xp !== q.reward.xp || coins < 0 || xp <= 0 || beforeCoins < 0 || beforeXp < 0) return null;
  if (afterCoins !== beforeCoins + coins || afterXp !== beforeXp + xp) return null;
  return { claimId: value.claimId, questId: q.id, coins, xp, beforeCoins, afterCoins, beforeXp, afterXp };
}

// Progresso salvo/em memória acima da meta é corrupção, não uma missão concluída.
function safeSideProgress(value, max) {
  // Saves antigos podem guardar números como texto, mas só inteiros decimais são contadores válidos.
  let n;
  if (typeof value === 'number') n = value;
  else if (typeof value === 'string' && /^\d+$/.test(value.trim())) n = Number(value.trim());
  else return 0;
  if (!Number.isSafeInteger(n) || n < 0 || n > max) return 0;
  return n;
}

export function createSideState(saved) {
  const out = {};
  for (const q of SIDE_QUESTS) {
    const s = saved && saved[q.id];
    const state = ['available', 'active', 'ready', 'done'].includes(s && s.state) ? s.state : 'locked';
    // Uma missão apenas disponível ainda não foi aceita; não restaure coleta anterior ao aceite.
    const progress = ['locked', 'available'].includes(state) ? 0 : safeSideProgress(s && s.progress, q.goal.count);
    // Um save corrompido não pode entregar recompensa sem cumprir a meta.
    // Missões já concluídas permanecem concluídas para não duplicar pagamentos.
    out[q.id] = { state: state === 'ready' && progress < q.goal.count ? 'active' : state, progress };
  }
  out.pendingReward = normalizePendingReward(saved && saved.pendingReward, out);
  return out;
}

export function settleSideReward(state, persistedCampaign, applyReward) {
  const pending = state && state.pendingReward;
  if (!pending) return 'none';
  // Saldos são fungíveis: vitórias/loja podem elevá-los e compras podem reduzi-los.
  // Só o claimId gravado no mesmo snapshot V6 de moedas/XP prova esta transação.
  const hasClaim = snapshot =>
    !!pending.claimId && Array.isArray(snapshot?.sideRewardClaims) &&
    snapshot.sideRewardClaims.includes(pending.claimId);
  if (hasClaim(persistedCampaign)) {
    state.pendingReward = null;
    return 'already-applied';
  }
  if (typeof applyReward !== 'function') return 'pending';
  let nextCampaign = null;
  try { nextCampaign = applyReward(pending); } catch (_) { return 'pending'; }
  if (hasClaim(nextCampaign)) {
    state.pendingReward = null;
    return 'applied';
  }
  return 'pending';
}

/** Atualiza disponibilidade e prontidão. ctx.waystones aceita Set/array de IDs registrados. */
export function refreshSide(state, ctx) {
  for (const q of SIDE_QUESTS) {
    const s = state[q.id];
    // Um estado ready restaurado/adulterado sem progresso suficiente não deve
    // instruir o jogador a entregar uma missão que turnInSide recusará.
    if (['active', 'ready'].includes(s.state) && (!Number.isSafeInteger(s.progress) || s.progress < 0 || s.progress > q.goal.count)) {
      s.progress = safeSideProgress(s.progress, q.goal.count);
    }
    if (s.state === 'ready' && s.progress < q.goal.count) {
      s.state = 'active';
    }
    const rawStep = ctx?.questStep;
    // Saves legados podem usar strings decimais; Number() sozinho também aceita hexadecimal e expoente.
    const decimalStep = typeof rawStep === 'string' && /^\d+$/.test(rawStep.trim());
    const step = typeof rawStep === 'number' ? rawStep : decimalStep ? Number(rawStep.trim()) : NaN;
    const hasStep = Number.isSafeInteger(step) && step >= 0;
    // Um save não pode manter uma missão disponível se a campanha foi restaurada para antes do desbloqueio.
    if (s.state === 'available' && hasStep && step < q.minStep) {
      s.state = 'locked';
      s.progress = 0;
    }
    if (s.state === 'locked' && hasStep && step >= q.minStep) {
      s.state = 'available';
      // Um desbloqueio nunca herda coleta residual de estado bloqueado/corrompido.
      s.progress = 0;
    }
    if (q.goal.type === 'waystones' && ['active', 'ready'].includes(s.state)) {
      // A missão pertence a Eldória: abrigos da jornada/Ato II não contam para ela.
      const registered = ctx?.waystones;
      const has = registered instanceof Set
        ? (id) => registered.has(id)
        : Array.isArray(registered) ? (id) => registered.includes(id) : null;
      if (has) {
        s.progress = Math.min(q.goal.count, SIDE_QUEST_WAYSTONES.reduce((count, id) => count + (has(id) ? 1 : 0), 0));
        if (s.state === 'ready' && s.progress < q.goal.count) s.state = 'active';
      }
    }
    if (s.state === 'active' && s.progress >= q.goal.count) s.state = 'ready';
  }
  return state;
}

export function acceptSide(state, id) {
  const s = state[id];
  if (!s || s.state !== 'available') return false;
  // A missão começa sem progresso: nenhum estado anterior ao aceite conta.
  s.progress = 0;
  s.state = 'active';
  return true;
}

/** Coleta um item; só conta se a missão correspondente estiver ativa. */
export function collectSide(state, item) {
  for (const q of SIDE_QUESTS) {
    const s = state[q.id];
    if (q.goal.type === 'collect' && q.goal.item === item && s.state === 'active') {
      s.progress = Math.min(q.goal.count, safeSideProgress(s.progress, q.goal.count) + 1);
      if (s.progress >= q.goal.count) s.state = 'ready';
      return q;
    }
  }
  return null;
}

/** Entrega: devolve a recompensa uma única vez. */
export function turnInSide(state, id, options) {
  const q = SIDE_QUESTS.find(x => x.id === id), s = state[id];
  if (!q || !s || s.state !== 'ready' || !Number.isSafeInteger(s.progress) || s.progress !== q.goal.count) return null;
  if (q.goal.type === 'waystones') {
    const registered = options?.waystones;
    const has = registered instanceof Set
      ? (waystoneId) => registered.has(waystoneId)
      : Array.isArray(registered) ? (waystoneId) => registered.includes(waystoneId) : null;
    if (!has || SIDE_QUEST_WAYSTONES.some(waystoneId => !has(waystoneId)) || typeof options.persistWaystones !== 'function') return null;
    let persisted = false;
    try { persisted = options.persistWaystones() === true; } catch (_) {}
    if (!persisted) return null;
  }
  s.state = 'done';
  return q.reward;
}

export function questForGiver(state, giver) {
  return SIDE_QUESTS.find(q => q.giver === giver && ['available', 'active', 'ready'].includes(state[q.id].state)) || null;
}

// Categorias expostas pelos vendedores que já têm interação ativa na vila.
// Isso não associa missões a personagens: apenas evita mandar o jogador falar com
// um giver que ainda não existe no runtime. Novos givers devem ser passados pelo call-site.
const ACTIVE_VILLAGE_VENDOR_CATEGORIES = Object.freeze(['ALIMENTOS', 'PROVISÕES', 'FRUTAS']);

export function activeSideLines(state, availableGivers = ACTIVE_VILLAGE_VENDOR_CATEGORIES) {
  const activeGivers = availableGivers instanceof Set
    ? availableGivers
    : new Set(Array.isArray(availableGivers) ? availableGivers.filter(value => typeof value === 'string') : []);
  return SIDE_QUESTS.filter(q => ['active', 'ready'].includes(state[q.id].state)).map(q => {
    const s = state[q.id];
    const progress = safeSideProgress(s.progress, q.goal.count);
    if (s.state === 'ready' && progress >= q.goal.count) {
      if (activeGivers.has(q.giver)) return q.title + ' · volte a ' + q.offer[0].who.split(' · ')[0];
      const status = q.goal.type === 'waystones'
        ? progress + '/' + q.goal.count + ' abrigos registrados'
        : progress + '/' + q.goal.count + ' itens reunidos';
      return q.title + ' · ' + status;
    }
    return q.title + ' · ' + progress + '/' + q.goal.count;
  });
}
