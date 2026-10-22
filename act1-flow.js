/**
 * MOD 185 — Ato I no mundo 3D, com a subida da montanha.
 * Dados e transições puras. A dimensão de Valério não é reconstruída aqui:
 * o portal só pede a entrada já existente (?valerioTest=1).
 */
export const ACT1 = {
  version: 6,
  purse: 8,
  bribe: 5,
  rescueReward: 12,
  portalReward: 8,
  wardenReward: 18,
  enemyTotal: 3,
  mountainSentries: 2,
  sentryHp: 100,
  wardenHp: 180,
  valerioReward: 40
};

const BANNED = ['porra', 'merda', 'caralho', 'fdp', 'puta', 'viado', 'cuzao', 'buceta'];

export function sanitizePlayerName(raw) {
  const name = String(raw || '').replace(/\s+/g, ' ').trim();
  if (name.length < 2 || name.length > 16) return { ok: false, error: 'Use de 2 a 16 caracteres.' };
  if (!/^[\p{L}][\p{L} '\-.]{1,15}$/u.test(name)) {
    return { ok: false, error: 'Use letras, espaço, apóstrofo ou hífen.' };
  }
  const folded = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (BANNED.some((word) => folded.includes(word))) {
    return { ok: false, error: 'Escolha um nome que possa ser dito em voz alta.' };
  }
  return { ok: true, name };
}

function clampInt(value, min, max, fallback) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function baseProgress() {
  return {
    version: ACT1.version,
    questStep: 0,
    coins: 0,
    journeyEnemyIndex: 0,
    mountainIndex: 0,
    playerName: '',
    captorsTaunted: false,
    childrenFreed: false,
    awakeningSeen: false,
    actCardSeen: false,
    wardenTaunted: false,
    wardenDefeated: false,
    portalOpened: false,
    portalRewardClaimed: false,
    bishopsDefeated: 0,
    valerioRewardClaimed: false,
    ...progressionFields(null, 0)
  };
}

const STAT_KEYS = ['kills', 'rescues', 'perfectBlocks', 'flawless', 'places', 'ruins', 'bishops'];
const SKILL_IDS = ['magic', 'magic2', 'magic3', 'ultimate'];
const ITEM_IDS = SKILL_IDS.concat(['aurora', 'vigilia', 'magic_plus', 'magic2_plus']);
/** Mod 188: XP, compras, espada equipada, estatísticas, conquistas e catálogo. */
export function progressionFields(raw, questStep) {
  const r = raw && typeof raw === 'object' ? raw : {};
  let owned = Array.isArray(r.owned) ? r.owned.filter(id => ITEM_IDS.includes(id)) : null;
  if (!owned) {
    // Progresso do Mod 186/187: as Palavras vinham por etapa; quem já as tinha não perde.
    owned = [];
    if (questStep >= 4) owned.push('magic');
    if (questStep >= 6) owned.push('magic2');
    if ((Number(r.bishopsDefeated) || 0) >= 1) owned.push('magic3');
  }
  const stats = {};
  for (const k of STAT_KEYS) stats[k] = Math.max(0, Math.floor(Number(r.stats && r.stats[k]) || 0));
  const list = v => (Array.isArray(v) ? v.filter(x => typeof x === 'string').slice(0, 64) : []);
  return {
    xp: Math.max(0, Math.floor(Number(r.xp) || 0)),
    owned: [...new Set(owned)],
    sword: ['aurora', 'vigilia'].includes(r.sword) && owned.includes(r.sword) ? r.sword : 'prota',
    stats,
    achievementsClaimed: list(r.achievementsClaimed),
    bestiary: list(r.bestiary),
    bestiaryRewarded: list(r.bestiaryRewarded),
    shopVisited: !!r.shopVisited,
    playSeconds: Math.max(0, Math.floor(Number(r.playSeconds) || 0)),
    ledgersFound: Array.isArray(r.ledgersFound) ? [...new Set(r.ledgersFound.filter(i => Number.isInteger(i) && i >= 0 && i < 3))] : [],
    vorgazhekRewardClaimed: !!r.vorgazhekRewardClaimed,
    lateFound: Array.isArray(r.lateFound) ? r.lateFound.filter(i => Number.isInteger(i) && i >= 0 && i < 8) : [],
    lateFoundStep: Math.max(0, Math.floor(Number(r.lateFoundStep) || 0)),
    lateFightIndex: Math.max(0, Math.min(5, Math.floor(Number(r.lateFightIndex) || 0))),
    lateBossClaimed: r.lateBossClaimed && typeof r.lateBossClaimed === 'object' ? { zarkhael: !!r.lateBossClaimed.zarkhael, veraxion: !!r.lateBossClaimed.veraxion } : {},
    gauntletIndex: Math.max(0, Math.min(4, Math.floor(Number(r.gauntletIndex) || 0))),
    finaleClaimed: !!r.finaleClaimed
  };
}

export function migrateProgress(raw) {
  const base = baseProgress();
  if (!raw || typeof raw !== 'object') return base;
  const coins = Math.max(0, Math.floor(Number(raw.coins) || 0));
  const named = sanitizePlayerName(raw.playerName || '');
  const shared = {
    coins,
    playerName: named.ok ? named.name : '',
    captorsTaunted: !!raw.captorsTaunted,
    childrenFreed: !!raw.childrenFreed,
    awakeningSeen: !!raw.awakeningSeen,
    actCardSeen: !!raw.actCardSeen
  };
  const version = Number(raw.version);
  if (version >= ACT1.version) {
    return {
      ...base,
      ...shared,
      questStep: clampInt(raw.questStep, 0, 30, 0),
      journeyEnemyIndex: clampInt(raw.journeyEnemyIndex, 0, ACT1.enemyTotal, 0),
      mountainIndex: clampInt(raw.mountainIndex, 0, ACT1.mountainSentries, 0),
      wardenTaunted: !!raw.wardenTaunted,
      wardenDefeated: !!raw.wardenDefeated,
      portalOpened: !!raw.portalOpened,
      portalRewardClaimed: !!raw.portalRewardClaimed,
      bishopsDefeated: clampInt(raw.bishopsDefeated, 0, 4, 0),
      valerioRewardClaimed: !!raw.valerioRewardClaimed,
      ...progressionFields(raw, clampInt(raw.questStep, 0, 30, 0))
    };
  }
  if (version === 5) {
    // O fim antigo (passo 5) era o portal fechado de propósito.
    // Quem já chegou lá continua na subida, sem perder ouro nem receber de novo a recompensa do portal.
    const previousStep = clampInt(raw.questStep, 0, 5, 0);
    const alreadyPaidPortal = previousStep >= 5;
    const step = previousStep >= 4 ? 4 : previousStep;
    return {
      ...base,
      ...shared,
      questStep: step,
      journeyEnemyIndex: clampInt(raw.journeyEnemyIndex, 0, ACT1.enemyTotal, 0),
      mountainIndex: 0,
      portalRewardClaimed: alreadyPaidPortal
    };
  }
  // Missão anterior à V5: conserva o ouro e recomeça o resgate.
  return { ...base, coins };
}

export function questPresentation(step) {
  const pages = {
    0: ['ATO I · O PREÇO DE UMA VIDA', 'Fale com o Anjo-Guia'],
    1: ['ATO I · O PREÇO DE UMA VIDA', 'Procure Téo, na banca de provisões da vila'],
    2: ['ATO I · A MATA E AS GAIOLAS', 'Siga a trilha até as gaiolas. Três captores guardam as crianças'],
    3: ['ATO I · A CHAVE', 'Abra as gaiolas e escolte as crianças de volta à vila'],
    4: ['ATO I · A SUBIDA', 'Duas sentinelas guardam a montanha, bem espaçadas. Enfrente uma de cada vez'],
    5: ['ATO I · O GUARDA DA PASSAGEM', 'Derrote o guarda antes do portal. Ele resiste mais e abre um corte largo'],
    6: ['ATO I · O PORTAL DE VALÉRIO', 'Aproxime-se. A dimensão que já existe será aberta, não substituída'],
    7: ['ATO I · DIMENSÃO ABERTA', 'Valério espera na dimensão dele. Atravesse o portal'],
    8: ['ATO I · CONCLUÍDO', 'Valério foi purificado. Explore a floresta e fale com o Anjo-Guia']
  };
  const pair = pages[step] || pages[8];
  return { title: pair[0], objective: pair[1] };
}

export function combatStep(step) {
  return step === 2 || step === 4 || step === 5;
}

export function guideAwakeningLines() {
  return [
    { who: 'Anjo-Guia', text: 'Despertaste. Este lugar já não reconhece a diferença entre necessidade e cobiça. Antes de seguirmos, preciso saber: como devo chamar-te?' }
  ];
}

export function guideAfterNameLines(name) {
  return [
    { who: 'Anjo-Guia', text: name + ', guarda esse nome. Haverá quem tente comprá-lo, apagá-lo ou usá-lo contra ti. Eu caminharei contigo, mas as escolhas e a coragem serão tuas.' },
    { who: 'Anjo-Guia', text: 'Há rumores na vila. Vai como quem apenas atravessa. O homem das provisões, Téo, ouve mais do que admite. Leva estas moedas: não são para comprar uma consciência. São para que ele possa falar sem ser vendido no lugar dela.' },
    { who: 'Anjo-Guia', text: 'O Primeiro Bispo desta ganância atende por Valério. Ainda não o enfrentes. Primeiro descobre o preço que estão cobrando das vidas daqui.' }
  ];
}

export function informantPoorLines() {
  return [
    { who: 'Téo · Provisões', text: 'Crianças? Eu não vi gaiola nenhuma. E não falo de graça — quem abre a boca aqui acaba escrito no livro de alguém.' },
    { who: 'Anjo-Guia', text: 'Ele ainda mede a coragem em moedas. Volta quando tivermos o bastante para que ele fale sem se vender por inteiro.' }
  ];
}

export function informantLines(name) {
  return [
    { who: 'Téo · Provisões', text: 'Eu não sei de criança nenhuma. Perguntar isso já é perigoso.' },
    { who: 'Téo · Provisões', text: 'Cinco moedas. Não pagam uma vida. Pagam o medo de eu continuar aqui amanhã.' },
    { who: name || 'Protagonista', text: 'Então tome. Não estou comprando silêncio. Estou comprando a verdade que você tem medo de carregar.' },
    { who: 'Téo · Provisões', text: 'Levaram três pela trilha, em gaiolas, como oferenda. Valério não suja as mãos. Manda os que ainda têm unhas.' },
    { who: 'Anjo-Guia', text: (name || 'Viajante') + ', a missão já é tua. Não há escolha honesta além de ir. A cobiça trabalha melhor longe dos olhos — vá antes que a trilha esfrie.' }
  ];
}

export function captorTauntLines(name) {
  return [
    { who: 'Seguidor da Ganância', text: 'Olha só. Veio tarde, encapuzado. Estas aqui já têm preço, e o Bispo não devolve o que foi pago.' },
    { who: 'Seguidor da Ganância', text: 'Pode rezar. Ouro fala mais alto que a tua fé — e estas gaiolas já foram compradas.' },
    { who: name || 'Protagonista', text: 'Não se vende uma vida. Soltem-nas. Se a chave não abrir, a espada abre.' }
  ];
}

export function freeChildrenLines(name) {
  return [
    { who: name || 'Protagonista', text: 'A chave estava com eles. Segurem firme — estas gaiolas acabam aqui.' },
    { who: 'Criança', text: 'Eles disseram que ninguém viria. Que a gente já tinha dono.' },
    { who: name || 'Protagonista', text: 'Ninguém é preço. Vocês voltam para casa.' },
    { who: 'Anjo-Guia', text: 'Leve-as à vila. As famílias precisam ver que ainda existe quem recuse esse mercado.' }
  ];
}

export function reunionLines() {
  return [
    { who: 'Lia · Frutas', text: 'Elas voltaram... Eu tinha medo até de perguntar os nomes.' },
    { who: 'Téo · Provisões', text: 'Eu vendi o silêncio. Vocês devolveram o que o meu ouro não comprava de volta.' },
    { who: 'Anjo-Guia', text: 'Com os captores havia um mapa rasgado. A rota sobe a montanha, mas não está vazia: duas sentinelas, bem separadas, e um guarda maior antes do portal. A dimensão de Valério continua a dele. Não vamos construir outra.' }
  ];
}

export function wardenTauntLines(name) {
  return [
    { who: 'Guarda da Passagem', text: 'Três caíram na mata e ainda assim você subiu. Aqui o preço muda. Eu não sou mais um deles — sou o que sobra quando o ouro acaba.' },
    { who: name || 'Protagonista', text: 'Então cobre de mim. As crianças já não estão à venda, e este portal não é um mercado.' }
  ];
}

export function portalBlockedLines() {
  return [
    { who: 'Anjo-Guia', text: 'Ainda não. A passagem tem guarda, e entrar agora seria levar a luta para dentro da dimensão de Valério. Limpe a subida primeiro.' }
  ];
}

export function portalLines(name) {
  return [
    { who: 'Anjo-Guia', text: (name || 'Viajante') + ', eu caminhei contigo porque um dia alguém recusou me vender. Não posso dizer o meu nome verdadeiro ainda. Se eu atravessar com você, Valério vai cobrar os dois de uma vez.' },
    { who: 'Anjo-Guia', text: 'Vá. A dimensão que te espera é a que já está de pé — não uma arena feita às pressas. Eu fico na mata. Volte.' },
    { who: name || 'Protagonista', text: 'Então guarda a clareira. Eu volto com o nome que você me pediu para não vender.' }
  ];
}

/** Volta da dimensão: a vitória sobre Valério fecha o Ato I uma única vez. */
export function afterValerioVictory(progress) {
  const p = progress || {};
  const first = !p.valerioRewardClaimed;
  return {
    questStep: 8,
    bishopsDefeated: Math.max(1, Math.floor(Number(p.bishopsDefeated) || 0)),
    valerioRewardClaimed: true,
    coinsGained: first ? ACT1.valerioReward : 0
  };
}

export function valerioVictoryLines(name) {
  return [
    { who: 'Anjo-Guia', text: 'Você voltou. O portal se fechou atrás de ti como uma porta que não aceita mais suborno. Valério caiu — e com ele, o primeiro selo da Ganância.' },
    { who: name || 'Protagonista', text: 'Ele não gritou de dor. Gritou porque ninguém mais lhe devia nada. Ainda há mais deles, não há?' },
    { who: 'Anjo-Guia', text: 'Há. O Segundo Bispo cobra dívidas que nem os mortos conseguem pagar. Mas hoje, as crianças dormem em casa. Descansa um pouco. Uma nova Palavra desperta em ti: o Sol da Justiça.' }
  ];
}

export function afterEnemyDefeated(index, total = ACT1.enemyTotal) {
  const next = Math.max(0, Math.floor(Number(index) || 0)) + 1;
  if (next >= total) {
    return {
      questStep: 3,
      journeyEnemyIndex: next,
      status: 'A chave é sua. Volte às gaiolas e liberte as crianças.'
    };
  }
  return {
    questStep: 2,
    journeyEnemyIndex: next,
    status: 'Um captor caiu. Os outros ainda guardam a trilha.'
  };
}

export function afterMountainDefeat(index, total = ACT1.mountainSentries) {
  const next = Math.max(0, Math.floor(Number(index) || 0)) + 1;
  if (next >= total) {
    return {
      questStep: 5,
      mountainIndex: next,
      status: 'A subida ficou quieta. O guarda da passagem espera, sozinho, antes do portal.'
    };
  }
  return {
    questStep: 4,
    mountainIndex: next,
    status: 'Uma sentinela caiu. A próxima está mais acima — não corra para as duas de uma vez.'
  };
}

export function afterWardenDefeat() {
  return {
    questStep: 6,
    wardenDefeated: true,
    status: 'O guarda caiu. O portal pode abrir a dimensão de Valério, sem substituí-la.'
  };
}

/** A entrada usa a dimensão estável já publicada. Não cria arena nova. */
export function valerioHandoffPlan() {
  return {
    mode: 'existing-dimension',
    replaceDimension: false,
    entry: './index.html?valerioTest=1&fromPortal=1'
  };
}
