/**
 * MOD 184 — Ato I no mundo 3D.
 * Dados e transições puras do resgate. O protótipo 3D aplica estes estados;
 * a dimensão de Valério não é substituída nem aberta aqui.
 */
export const ACT1 = {
  version: 5,
  purse: 8,
  bribe: 5,
  rescueReward: 12,
  portalReward: 5,
  enemyTotal: 3
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

export function migrateProgress(raw) {
  const base = {
    version: ACT1.version,
    questStep: 0,
    coins: 0,
    journeyEnemyIndex: 0,
    playerName: '',
    captorsTaunted: false,
    childrenFreed: false,
    awakeningSeen: false,
    actCardSeen: false
  };
  if (!raw || typeof raw !== 'object') return base;
  const coins = Math.max(0, Math.floor(Number(raw.coins) || 0));
  const named = sanitizePlayerName(raw.playerName || '');
  if (Number(raw.version) >= ACT1.version) {
    return {
      ...base,
      questStep: clampInt(raw.questStep, 0, 5, 0),
      coins,
      journeyEnemyIndex: clampInt(raw.journeyEnemyIndex, 0, ACT1.enemyTotal, 0),
      playerName: named.ok ? named.name : '',
      captorsTaunted: !!raw.captorsTaunted,
      childrenFreed: !!raw.childrenFreed,
      awakeningSeen: !!raw.awakeningSeen,
      actCardSeen: !!raw.actCardSeen
    };
  }
  // A missão antiga (clareira genérica) não corresponde ao Ato I.
  // Mantém o ouro e recomeça a história para não pular o resgate.
  return { ...base, coins };
}

export function questPresentation(step) {
  const pages = {
    0: ['ATO I · O PREÇO DE UMA VIDA', 'Fale com o Anjo-Guia'],
    1: ['ATO I · O PREÇO DE UMA VIDA', 'Procure Téo, na banca de provisões da vila'],
    2: ['ATO I · A MATA E AS GAIOLAS', 'Siga a trilha noturna. Três captores guardam as crianças'],
    3: ['ATO I · A CHAVE', 'Abra as gaiolas e escolte as crianças de volta à vila'],
    4: ['ATO I · A ROTA RASGADA', 'Suba até o portal de Valério. Ainda não entre'],
    5: ['ATO I · RESGATE CONCLUÍDO', 'A montanha segue fechada. A dimensão de Valério permanece intacta']
  };
  const pair = pages[step] || pages[5];
  return { title: pair[0], objective: pair[1] };
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
    { who: 'Anjo-Guia', text: (name || 'Viajante') + ', a missão já é tua. Não há escolha honesta além de ir. A noite vai se alongar — a cobiça prefere trabalhar no escuro.' }
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
    { who: 'Anjo-Guia', text: 'Com os captores havia um mapa rasgado. A rota sobe a montanha, até o portal de Valério. Ainda não atravesse: a dimensão dele continua de pé, e o caminho cobra mais do que esta mata.' }
  ];
}

export function portalLines(name) {
  return [
    { who: name || 'Protagonista', text: 'O portal está no alto da trilha. Dá para sentir o outro lado, mas entrar agora seria abandonar o que ainda não enfrentamos.' },
    { who: 'Anjo-Guia', text: 'Valério espera na dimensão que já é dele — não vamos substituí-la. Antes há a subida, os encontros na montanha e um guarda maior. Quando esse caminho estiver limpo, eu te acompanho até a passagem. Até lá, o portal permanece fechado.' }
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
