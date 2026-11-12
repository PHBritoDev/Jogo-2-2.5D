/**
 * MOD 204 — Marco 2: Ato I como no roteiro original do autor (docs/roteiro/M2-ATO1.md).
 * Dados e transições puras. As cenas são listas de passos do diretor (cutscenes3d.js);
 * o jogo cuida de câmera, animações, inimigos e cenários. O nome digitado entra no lugar de {nome}.
 *
 * Etapas (questStep) e sub-etapas (act1Sub):
 *  1 vila: 0 a caminho · 1 chegou (procurar o vendedor)
 *  2 floresta à noite: luta 1 + 2 Seguidores (journeyEnemyIndex 0..3)
 *  3 a chave: 0 gaiola fechada · 1 crianças transformadas (luta 2) · 2 desmaio
 *  4 esgotos: 0 a caminho (massacre, 3 Enemy2) · 1 pista (ir à caverna) · 2 dentro (5 Seguidores) · 3 o buraco
 *  5 o lugar estranho: o Guardião do Portal
 *  6 portal liberado · 7 dimensão de VHAZRAEL · 8 Ato I concluído
 */
export const ACT1 = {
  version: 6,
  rev: 2,
  purse: 8,
  bribe: 5,
  rescueReward: 12,
  portalReward: 8,
  wardenReward: 18,
  enemyTotal: 3,
  childEnemies: 2,
  massacreEnemies: 3,
  feedingEnemies: 5,
  cellEnemies: 10,
  pathEnemies: 12,
  mountainSentries: 2,
  sentryHp: 100,
  enemy2Hp: 140,
  wardenHp: 300,
  vhazraelReward: 40
};

const BANNED = ['porra', 'merda', 'caralho', 'fdp', 'puta', 'viado', 'cuzao', 'buceta'];

export function sanitizePlayerName(raw) {
  const name = String(raw || '').replace(/\s+/g, ' ').trim();
  if (name.length < 3 || name.length > 12) return { ok: false, error: 'Use de 3 a 12 caracteres, em uma única linha.' };
  if (!/^[\p{L}][\p{L} '\-.]{2,11}$/u.test(name)) {
    return { ok: false, error: 'Use letras, espaço, apóstrofo ou hífen.' };
  }
  const folded = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
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
    act1Rev: ACT1.rev,
    questStep: 0,
    act1Sub: 0,
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
    vhazraelRewardClaimed: false,
    ...progressionFields(null, 0)
  };
}

const STAT_KEYS = ['kills', 'rescues', 'perfectBlocks', 'flawless', 'places', 'ruins', 'bishops'];
const SKILL_IDS = ['magic', 'magic2', 'magic3', 'ultimate'];
const ITEM_IDS = SKILL_IDS.concat(['aurora', 'vigilia', 'celeste', 'magic_plus', 'magic2_plus']);
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
    sword: ['aurora', 'vigilia', 'celeste'].includes(r.sword) && owned.includes(r.sword) ? r.sword : 'prota',
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
    finaleClaimed: !!r.finaleClaimed,
    // MOD 206 — casaco de frio do Ato III (comprado na estrada da cidade de neve).
    coatOwned: !!r.coatOwned,
    coatOn: !!r.coatOwned && !!r.coatOn,
    zarkhaelClaimed: !!r.zarkhaelClaimed,
    // MOD 207 — pergaminho de encantamento do Ato IV.
    scrollOwned: !!r.scrollOwned,
    veraxionClaimed: !!r.veraxionClaimed
  };
}

/**
 * MOD 247 — nome canônico VHAZRAEL. Saves anteriores guardavam a recompensa do Bispo 1 numa chave `*RewardClaimed`
 * com o nome antigo e o id antigo no bestiário. A detecção é ESTRUTURAL (o nome antigo não existe mais no código): em
 * toda a história do projeto só existiram três chaves `*RewardClaimed` (portal, Bispo 1, VORGAZHEK) e um único id de
 * bestiário foi renomeado, então a chave desconhecida e o id fora do catálogo são do Bispo 1. Nenhum progresso se perde.
 */
const REWARD_KEYS = new Set(['portalRewardClaimed', 'vhazraelRewardClaimed', 'vorgazhekRewardClaimed']);
export const BESTIARY_IDS = new Set(['captor', 'demon2', 'warden', 'vhazrael', 'vorgazhek', 'zealot', 'zarkhael', 'hollow', 'veraxion', 'ganancia', 'sentry']);
export function migrateBishopOneName(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  const out = { ...raw };
  for (const k of Object.keys(raw)) if (/RewardClaimed$/.test(k) && !REWARD_KEYS.has(k)) { if (raw[k]) out.vhazraelRewardClaimed = true; delete out[k]; }
  const fix = list => Array.isArray(list) ? [...new Set(list.map(id => typeof id === 'string' && !BESTIARY_IDS.has(id) && /^v/.test(id) ? 'vhazrael' : id))] : list;
  if (out.bestiary) out.bestiary = fix(out.bestiary); if (out.bestiaryRewarded) out.bestiaryRewarded = fix(out.bestiaryRewarded);
  return out;
}

export function migrateProgress(raw) {
  const base = baseProgress();
  if (!raw || typeof raw !== 'object') return base;
  raw = migrateBishopOneName(raw);
  const coins = Math.max(0, Math.floor(Number(raw.coins) || 0));
  // Preserva nomes de saves antigos (2–16 caracteres) sem permitir novos nomes fora do limite atual.
  const named = sanitizePlayerName(raw.playerName || '');
  const legacyName = String(raw.playerName || '').replace(/\s+/g, ' ').trim();
  const savedName = named.ok ? named.name : (legacyName.length >= 2 && legacyName.length <= 16 && /^[\p{L}][\p{L} '\-.]{1,15}$/u.test(legacyName) && !BANNED.some(word => legacyName.toLowerCase().includes(word)) ? legacyName : '');
  const shared = {
    coins,
    playerName: savedName,
    captorsTaunted: !!raw.captorsTaunted,
    childrenFreed: !!raw.childrenFreed,
    awakeningSeen: !!raw.awakeningSeen,
    actCardSeen: !!raw.actCardSeen
  };
  const version = Number(raw.version);
  if (version >= ACT1.version) {
    const step = clampInt(raw.questStep, 0, 30, 0);
    const out = {
      ...base,
      ...shared,
      questStep: step,
      act1Sub: clampInt(raw.act1Sub, 0, 9, 0),
      journeyEnemyIndex: clampInt(raw.journeyEnemyIndex, 0, ACT1.enemyTotal, 0),
      mountainIndex: clampInt(raw.mountainIndex, 0, ACT1.mountainSentries, 0),
      wardenTaunted: !!raw.wardenTaunted,
      wardenDefeated: !!raw.wardenDefeated,
      portalOpened: !!raw.portalOpened,
      portalRewardClaimed: !!raw.portalRewardClaimed,
      bishopsDefeated: clampInt(raw.bishopsDefeated, 0, 4, 0),
      vhazraelRewardClaimed: !!raw.vhazraelRewardClaimed,
      ...progressionFields(raw, step)
    };
    // Save do Ato I antigo (antes do Marco 2) parado no meio do ato: a etapa é mantida, mas a etapa recomeça
    // do jeito novo (o roteiro mudou: vendedor, floresta à noite, esgotos). Ouro, nome e compras ficam.
    if ((Number(raw.act1Rev) || 1) < ACT1.rev && step >= 1 && step <= 7) {
      Object.assign(out, { act1Sub: 0, journeyEnemyIndex: 0, mountainIndex: 0, captorsTaunted: false, childrenFreed: false });
      if (step <= 5) Object.assign(out, { wardenTaunted: false, wardenDefeated: false });
    }
    return out;
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

/** Texto do HUD de missão para cada etapa (e sub-etapa) do Ato I. */
export function questPresentation(step, sub = 0) {
  const pages = {
    0: ['ATO I · O PREÇO DE UMA VIDA', 'Fale com o Anjo-Guia'],
    1: sub >= 1
      ? ['ATO I · ELDÓRIA', 'Investigue as cargas confiscadas e converse com o vendedor']
      : ['ATO I · O PREÇO DE UMA VIDA', 'Atravesse a ponte e descubra o que aconteceu em Eldória'],
    2: ['ATO I · LUZES NA FLORESTA', 'Siga as marcas das cargas até as jaulas na floresta'],
    3: sub >= 1
      ? ['ATO I · O RITUAL', 'Derrote as crianças possuídas pelos demônios']
      : ['ATO I · AS JAULAS', 'Abra a gaiola com a chave dos Seguidores'],
    4: [['ATO I · GALERIAS DA CAVERNA', 'Ajude os moradores e siga a trilha até a montanha'],
      ['ATO I · A PISTA', 'Siga a pista até a entrada da caverna, na encosta'],
      ['ATO I · GALERIAS DA CAVERNA', 'Siga os rastros dos prisioneiros pelas galerias'],
      ['ATO I · O BURACO', 'Encontre a passagem abaixo da caverna']][Math.min(3, sub)],
    5: ['ATO I · O GUARDIÃO DO PORTAL', 'Siga pelo caminho vazio e derrote o guardião do portal'],
    6: ['ATO I · O PORTAL DE VHAZRAEL', 'Entre no portal: a dimensão de VHAZRAEL está do outro lado'],
    7: ['ATO I · DIMENSÃO ABERTA', 'VHAZRAEL espera na dimensão dele. Atravesse o portal'],
    8: ['ATO I · CONCLUÍDO', 'VHAZRAEL caiu. Uma longa jornada começa']
  };
  const pair = pages[step] || pages[8];
  return { title: pair[0], objective: pair[1] };
}

export function combatStep(step) {
  return step === 2 || step === 3 || step === 4 || step === 5;
}

/* ---------- Falas (texto revisado; o original está em docs/roteiro/M2-ATO1.md) ---------- */
export const SPEAKERS = {
  hero: 'heroi', guide: 'Anjo-Guia', vendor: 'Téo · Provisões', follower: 'Seguidor da Ganância',
  demon: 'Demônio da Ganância', child: 'Criança', warden: 'Guardião do Portal', vhazrael: 'VHAZRAEL', victim: 'Morador'
};
const S = SPEAKERS;
const say = (who, text, extra) => Object.assign({ type: 'say', who, text }, extra || {});
const shot = (id, dur, args, extra) => Object.assign({ type: 'shot', id, dur, args: args || {} }, extra || {});
const act = (id, args) => ({ type: 'do', id, args: args || {} });
const wait = dur => ({ type: 'wait', dur });

/** Chegada à vila: plano aberto mostrando a vila de longe, nome na tela e som de descoberta. */
export function villageArrivalScene() {
  return [
    shot('vila-panorama', 5.5, { cam: 'crane', anchor: 'village', from: [26, 18, 34], to: [12, 6, 20], lookFrom: [0, 2, 0], lookTo: [0, 1.5, 0] },
      { with: [act('titulo', { kicker: 'GALÁXIA 1 · MUNDO DA GANÂNCIA', title: 'Eldória' }), act('som-descoberta')] }),
    shot('vila-miseria', 3.5, { cam: 'crane', anchor: 'village', from: [4, 2.8, 9.2], to: [8.4, 2.4, 7.6], lookFrom: [12.5, .3, 2.6], lookTo: [6.2, 1, 6.4] })
  ];
}

/** Sem dinheiro: o vendedor nem conversa. */
export function vendorRefusalScene() {
  return [
    say(S.hero, 'Com licença. O senhor já ouviu algum rumor sobre o Pecado da Ganância?'),
    say(S.vendor, 'Se veio perguntar, espere. Tem gente aqui que não come desde ontem.')
  ];
}

/** Pergunta, recusa, o saco de ouro e tudo o que o vendedor sabe. */
export function vendorScene() {
  return [
    say(S.hero, 'Com licença. O senhor já ouviu algum rumor sobre o Pecado da Ganância?'),
    say(S.vendor, 'Se veio perguntar, espere. Tem gente aqui que não come desde ontem.'),
    shot('saco-de-ouro', 2.6, { cam: 'two', a: 'hero', b: 'vendor', side: 1, dist: 3.4 }, { with: [act('entregar-ouro')] }),
    say(S.vendor, 'Fale baixo. Os homens que cobram pela estrada ainda passam por aqui. Você viu como Eldória está?'),
    say(S.vendor, 'Antes, os comerciantes chegavam pela ponte. Agora levam a maior parte da carga antes que ela alcance a cidade.'),
    say(S.vendor, 'Primeiro vieram os recibos. Depois, a cobrança pela estrada. Sem mercadorias, as famílias começaram a passar fome.'),
    say(S.hero, 'Como eu posso encontrá-lo?'),
    say(S.vendor, 'Os carregamentos seguem para a mata depois de escurecer. Algumas noites, escutamos crianças pedindo ajuda.'),
    say(S.vendor, 'Vi um símbolo marcado nas caixas confiscadas. O mesmo apareceu perto da trilha onde crianças desapareceram.'),
    say(S.hero, 'Mas quem pode estar por trás disso?'),
    say(S.vendor, 'Os guardas dizem que obedecem a VHAZRAEL, um dos bispos a serviço da Ganância. Nunca vi o rosto dele.'),
    say(S.vendor, 'Se decidir ir, procure as marcas junto ao rio. E cuidado com quem disser que cobra em nome da cidade.'),
    act('anoitecer'),
    wait(2.6)
  ];
}

/** Na floresta à noite: o choro, o primeiro Seguidor e a provocação. */
export function forestFirstScene() {
  return [
    shot('gaiola-de-longe', 3.2, { cam: 'look', on: 'cage', off: [5, 2.6, 7], at: [0, .8, 0] }, { with: [act('choro')] }),
    say(S.child, 'Socorro! Alguém, por favor… tira a gente daqui!', { actor: 'cage' }),
    shot('seguidor-surge', 2.2, { cam: 'look', on: 'enemy', off: [2.2, 1.6, 3.6], at: [0, 1, 0] }, { with: [act('surgir-seguidor')] }),
    say(S.follower, 'Não dê mais um passo. Essa clareira está sob nossa guarda.'),
    say(S.hero, 'As crianças estão presas ali. Abra as jaulas.'),
    say(S.follower, 'Não é você quem decide o que acontece aqui, humano.')
  ];
}

/** Depois do primeiro: surgem mais dois. */
export function forestSecondScene() {
  return [
    shot('mais-dois', 2.4, { cam: 'look', on: 'hero', off: [-3, 2.4, -4.5], at: [0, 1, 4] }, { with: [act('surgir-dois')] }),
    say(S.follower, 'Quem é você?'),
    say(S.hero, 'Vou tirar essas crianças daqui. Saiam do caminho.'),
    say(S.follower, 'Você nem sabe para quem trabalhamos. VHAZRAEL não se incomoda com intrusos por muito tempo.')
  ];
}

export function keyFoundScene() {
  return [say(S.hero, 'A chave. Preciso abrir essas jaulas antes que o ritual avance.')];
}

/** Abrir a gaiola: as crianças viram Seguidores. */
export function cageScene() {
  return [
    shot('abrir-gaiola', 2.4, { cam: 'look', on: 'cage', off: [3.2, 1.8, 3.4], at: [0, .7, 0] }, { with: [act('abrir-gaiola')] }),
    say(S.hero, 'Vocês estão bem?'),
    say(S.child, 'Socorro! Alguém me ajuda… eu não consigo parar!', { actor: 'cage' }),
    say(S.hero, 'O que está acontecendo?'),
    shot('transformacao', 6.5, { cam: 'look', on: 'cage', off: [4.2, 2.2, 4.6], at: [0, .9, 0] }, { with: [act('transformar-criancas')] }),
    say(S.hero, 'O ritual já as alcançou... Ainda precisamos impedir que continue.'),
    say(S.hero, 'Não vou permitir que levem mais ninguém para essas jaulas.')
  ];
}

/** Desmaio na floresta e o amanhecer com o Anjo. */
export function faintScene() {
  return [
    say(S.hero, 'Eu estou me sentindo meio tonto…'),
    shot('desmaio', 2.4, { cam: 'look', on: 'hero', off: [2.4, 1.4, 2.4], at: [0, .6, 0] }, { with: [act('desmaiar')] }),
    act('amanhecer'),
    wait(2.2),
    shot('anjo-chama', 2.2, { cam: 'look', on: 'hero', off: [0, 2.6, 1.6], at: [0, .3, 0] }, { with: [act('anjo-aparece')] }),
    say(S.guide, '{nome}… {nome}! {NOME}!'),
    say(S.guide, 'O que aconteceu? Você está ferido?'),
    shot('levantar', 2.6, { cam: 'two', a: 'hero', b: 'guide', side: 1, dist: 4.2 }, { with: [act('levantar')] }),
    say(S.hero, 'Onde eu estou? Como assim, já é de manhã?'),
    say(S.guide, 'Encontrei sinais do ritual perto do rio. Diga o que viu antes de perder os sentidos.'),
    say(S.hero, 'Encontrei as jaulas e interrompi os demônios. Depois, tudo ficou escuro.'),
    say(S.guide, 'As marcas das caixas e do ritual são iguais. Segui as carroças até uma entrada na montanha. Há prisioneiros lá.'),
    say(S.hero, 'Então precisamos voltar por Eldória. Talvez alguém ainda possa nos dizer por onde elas passaram.'),
    say(S.guide, 'Irei com você até onde puder. Mas não entre sozinho numa passagem desconhecida.'),
    say(S.hero, 'Certo. Primeiro vamos encontrar quem precisa de ajuda.'),
    act('anjo-parte')
  ];
}

/** No caminho: demônios matando moradores. O herói chega tarde demais. */
export function massacreScene() {
  return [
    shot('massacre', 2.8, { cam: 'look', on: 'massacre', off: [7, 3, 6], at: [0, 1, 0] }, { with: [act('massacre-inicio')] }),
    say(S.victim, 'Por favor, deixem as provisões! Há pessoas esperando por elas!', { actor: 'victim' }),
    say(S.hero, 'Parem!'),
    shot('correndo', 2.4, { cam: 'follow', on: 'hero', off: [0, 2.2, -4.5], at: [0, 1.2, 6] }, { with: [act('correr-ate-massacre')] }),
    shot('ataque-aos-moradores', 3.2, { cam: 'look', on: 'massacre', off: [5, 2.4, 5], at: [0, .9, 0] }, { with: [act('massacre-fim')] }),
    say(S.hero, 'Por que vocês fizeram isso?'),
    say(S.demon, 'Recebemos ordens de levar tudo. Quem resiste não chega ao próximo amanhecer.'),
    say(S.hero, 'Vocês não vão levar mais ninguém daqui.')
  ];
}

export function clueScene() {
  return [
    say(S.hero, 'Um registro de carga... a mesma marca das jaulas. A rota termina numa caverna da montanha.')
  ];
}

/** Os cinco Seguidores no fundo do esgoto. */
export function feedingScene() {
  return [
    shot('rastros', 2.6, { cam: 'look', on: 'hero', off: [1.4, 1.9, -2.6], at: [0, .2, 5] }),
    shot('banquete', 2.6, { cam: 'look', on: 'feeding', off: [6, 3, 6], at: [0, .8, 0] }),
    say(S.hero, 'Afastem-se dos prisioneiros. Agora.'),
    say(S.follower, 'O bispo não tolera atrasos. Você não devia ter seguido a carga.', { actor: 'feeding' })
  ];
}

/** O buraco: o Anjo chega, o herói pula, acorda cercado, desmaia e acorda numa jaula. */
export function holeScene() {
  return [
    shot('buraco', 2.4, { cam: 'look', on: 'hole', off: [3, 4, 4], at: [0, -1, 0] }, { with: [act('anjo-aparece')] }),
    say(S.guide, 'O que aconteceu aqui?'),
    say(S.hero, 'Há pessoas presas lá embaixo. Não podemos abandoná-las.'),
    shot('correr-buraco', 1.6, { cam: 'follow', on: 'hero', off: [0, 2.4, -4], at: [0, 0, 5] }, { with: [act('correr-ao-buraco')] }),
    say(S.guide, 'Espere! Não sabemos a profundidade desse buraco!', { auto: 1.8 }),
    shot('pular', 1.6, { cam: 'look', on: 'hole', off: [0, 7, 2], at: [0, -4, 0] }, { with: [act('pular')] }),
    act('piscar'),
    wait(2.4),
    shot('cercado', 3.4, { cam: 'orbit', on: 'hero', r: 5.2, h: 2.2, from: 0, to: 2.4 }, { with: [act('acordar-cercado')] }),
    say(S.hero, 'Onde eu estou…?'),
    act('desmaiar-de-novo'),
    wait(2.6),
    shot('na-jaula', 4, { cam: 'look', on: 'cell', off: [3.4, 2.2, 3.6], at: [0, 1, 0] }, { with: [act('acordar-na-jaula')] }),
    say(S.hero, 'Me tira daqui!'),
    shot('anjo-chega', 2, { cam: 'two', a: 'hero', b: 'guide', side: -1, dist: 4.6 }, { with: [act('anjo-chega-jaula')] }),
    say(S.guide, 'Fala baixo, eles podem te ouvir.'),
    shot('anjo-vigia', 2.6, { cam: 'look', on: 'guide', off: [1.8, 1.9, 2.8], at: [0, 1.6, 0] }, { with: [act('anjo-vigia')] }),
    wait(.5),
    shot('anjo-liberta', 2.6, { cam: 'two', a: 'hero', b: 'guide', side: -1, dist: 4.4 }, { with: [act('anjo-abre-jaula')] }),
    shot('sair-da-jaula', 2, { cam: 'look', on: 'hero', off: [2.6, 1.8, 3.2], at: [0, 1, 0] }, { with: [act('heroi-sai-jaula')] }),
    say(S.guide, 'Você não pode ajudar os prisioneiros se morrer aqui. Da próxima vez, procuramos uma passagem juntos.'),
    shot('horda', 3, { cam: 'look', on: 'hero', off: [-2.2, 2.8, -3.4], at: [0, 1, 9] }, { with: [act('horda-chega')] }),
    say(S.guide, 'Vá por aquele caminho. Eu dou um jeito neles aqui.'),
    say(S.hero, 'Você tem certeza de que consegue lidar com tantos deles assim?'),
    say(S.guide, 'Consigo segurar a passagem por algum tempo. Encontre a saída e não pare até alcançá-la.'),
    shot('barreira-do-anjo', 1.6, { cam: 'look', on: 'hero', off: [-2.2, 2.8, -3.4], at: [7, 1.5, 0] }, { with: [act('anjo-luta')] })
  ];
}

/** O lugar estranho: o portal ao longe e o Guardião. */
export function wardenIntroScene() {
  return [
    shot('portal-de-longe', 3.4, { cam: 'look', on: 'hero', off: [1.2, 2.2, -3], at: [0, 2, 26] }),
    shot('guardiao', 2.4, { cam: 'look', on: 'enemy', off: [2, 1.8, 4.2], at: [0, 1.3, 0] }, { with: [act('surgir-guardiao')] }),
    say(S.hero, 'As pessoas presas aqui vão sair. Abra a passagem.'),
    say(S.warden, 'Só passa quem leva o selo do bispo.')
  ];
}

/** O Guardião derrotado implora; o herói não poupa demônios. */
export function wardenDefeatScene() {
  return [
    say(S.warden, 'Espere. Eu cumpri ordens. Não conheço outra saída.'),
    say(S.hero, 'O que é isso? E o que tem dentro desse portal?'),
    say(S.warden, 'VHAZRAEL mantém uma passagem para a própria dimensão. É por ela que as cargas e os selos chegam até ele.'),
    say(S.hero, 'Você teve a chance de parar. Não vou permitir que continue.'),
    say(S.warden, 'Nãoooooo!', { auto: 1.4 }),
    shot('guardiao-desfeito', 2, { cam: 'look', on: 'enemy', off: [2.6, 1.6, 3.6], at: [0, 1, 0] }, { with: [act('desfazer-guardiao')] }),
    say(S.hero, 'O que aconteceu aqui não pode se repetir. Precisamos alcançar quem deu as ordens.'),
    say(S.hero, 'VHAZRAEL está adiante. Ao menos agora sabemos aonde essas pessoas estavam sendo levadas.')
  ];
}

/** Dentro da dimensão, antes da luta. */
export function vhazraelIntroScene() {
  return [
    say(S.vhazrael, 'Quem permitiu sua entrada? O selo desta passagem está sob meu comando.'),
    say(S.hero, 'As pessoas da floresta e da cidade não são mercadorias. Vim encerrar isso.'),
    say(S.vhazrael, 'Você derrubou guardas e atravessou um portal. Ainda não compreendeu a quem enfrenta.'),
    say(S.hero, 'Compreendi o bastante. Você arruinou Eldória para servir à Ganância.'),
    say(S.vhazrael, 'Os outros bispos não deixarão que leve isso adiante.')
  ];
}

/** VHAZRAEL caindo. */
export function vhazraelDefeatScene() {
  return [
    say(S.vhazrael, 'Não... O primeiro selo... A Ganância não vai permitir que o levem.'),
    say(S.vhazrael, 'Que espécie de poder é esse...? Você não é como os outros.')
  ];
}

/** Epílogo jogável do Ato I: o guia acolhe a vitória, mas há cargas rumo às montanhas.
 * Ponte breve para a região vulcânica, sem antecipar a revelação da Ganância nem
 * afirmar destinos ainda pendentes de aprovação (Ilyan e crianças).
 * A sequência de eventos do diretor continua intacta para preservar saves.
 */
export function afterVhazraelScene() {
  return [
    shot('volta', 2.6, { cam: 'two', a: 'hero', b: 'guide', side: 1, dist: 4.4 }, { with: [act('anjo-aparece')] }),
    say(S.guide, 'Você voltou. Quando a passagem se fechou, temi que tivesse ficado lá dentro.'),
    say(S.hero, 'VHAZRAEL caiu. Mas o que ele fez com Eldória não desaparece com ele.'),
    say(S.guide, 'Não. Os que sobreviveram ainda precisarão de ajuda. Ao menos, agora terão uma chance.'),
    say(S.hero, 'E a Ganância? Um dos quatro bispos foi derrotado. Onde estão os outros?'),
    say(S.guide, 'Ainda não sabemos. Mas encontrei registros de cargas enviadas para as montanhas. A estrada segue até a região vulcânica.'),
    say(S.hero, 'Então começamos por lá. Antes, quero ter certeza de que ninguém ficou para trás.'),
    say(S.guide, 'É por isso que vale a pena continuar.'),
    act('escuro'),
    wait(2.4)
  ];
}

/** Troca {nome}/{NOME} pelo nome do jogador e "heroi" pelo nome como orador. */
export function personalizeLine(step, name) {
  const n = String(name || 'Viajante');
  if (!step || step.type !== 'say') return step;
  return { ...step, who: step.who === S.hero ? n : step.who, text: step.text.replace(/\{NOME\}/g, n.toUpperCase()).replace(/\{nome\}/g, n) };
}

/* ---------- Transições ---------- */
/** Floresta: o 1º Seguidor, depois mais 2 (3 no total) e a chave. */
export function afterEnemyDefeated(index, total = ACT1.enemyTotal) {
  const next = Math.max(0, Math.floor(Number(index) || 0)) + 1;
  if (next >= total) return { questStep: 3, journeyEnemyIndex: next, status: 'A chave caiu do último Seguidor. Abra a gaiola.' };
  return { questStep: 2, journeyEnemyIndex: next, status: next === 1 ? 'Mais deles saem da mata.' : 'Falta um.' };
}

export function afterWardenDefeat() {
  return { questStep: 6, wardenDefeated: true, status: 'O Guardião caiu. O portal de VHAZRAEL está aberto.' };
}

/** Avanço dentro do Ato I por sub-etapa (para salvar onde o jogador está). */
export function nextAct1Sub(step, sub) {
  const last = { 1: 1, 3: 2, 4: 3 }[step];
  if (last === undefined) return { questStep: step, act1Sub: 0 };
  if (sub < last) return { questStep: step, act1Sub: sub + 1 };
  return { questStep: step + 1, act1Sub: 0 };
}

/** A entrada usa a dimensão estável já publicada. Não cria arena nova. */
export function vhazraelHandoffPlan() {
  return { mode: 'existing-dimension', replaceDimension: false, entry: './index.html?vhazraelTest=1&fromPortal=1' };
}

export function portalBlockedLines() {
  return [{ who: S.guide, text: 'Ainda não. Há um guardião diante do portal.' }];
}

/** Volta da dimensão: a vitória sobre VHAZRAEL fecha o Ato I uma única vez. */
export function afterVhazraelVictory(progress) {
  const p = progress || {};
  const first = !p.vhazraelRewardClaimed;
  return {
    questStep: 8,
    bishopsDefeated: Math.max(1, Math.floor(Number(p.bishopsDefeated) || 0)),
    vhazraelRewardClaimed: true,
    coinsGained: first ? ACT1.vhazraelReward : 0
  };
}
