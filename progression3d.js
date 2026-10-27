/**
 * MOD 188 — Progressão da Galáxia 1 no mundo 3D (regras puras; testes em progression3d.test.mjs).
 * Nível/XP, Loja Central (setores, requisitos de ato + nível + ouro), conquistas e catálogo de inimigos.
 * O ouro sozinho nunca libera um item: cada oferta declara etapa da campanha e nível mínimos.
 */
export const LEVELS = [0, 60, 150, 280, 450, 680, 980, 1350, 1800, 2350, 3000, 3750];
export const XP_REWARDS = { captor: 22, demon2: 40, sentry: 32, warden: 70, rescue: 50, ruin: 15, valerio: 160, zealot: 45, hollow: 55 };

export function levelFromXp(xp) {
  let lvl = 1;
  for (let i = 1; i < LEVELS.length; i++) if (xp >= LEVELS[i]) lvl = i + 1;
  return lvl;
}
export function levelProgress(xp) {
  const lvl = levelFromXp(xp), cur = LEVELS[lvl - 1], next = LEVELS[lvl];
  return { level: lvl, into: xp - cur, need: next === undefined ? 0 : next - cur, max: next === undefined };
}
/** Bônus por nível: vida e mana máximas crescem pouco, para o combate não ficar trivial. */
export function statsForLevel(level) {
  return { maxHP: 100 + (level - 1) * 10, maxMana: 100 + (level - 1) * 6, damageBonus: (level - 1) * .04 };
}

/** Etapas da campanha usadas como requisito (questStep do Ato I). */
export const STEP_NAMES = {
  4: 'libertar as crianças das gaiolas', 5: 'vencer as sentinelas da subida', 6: 'derrotar o guarda da passagem', 8: 'purificar VHAZRAEL, o Primeiro Bispo'
};

export const SHOP_SECTORS = [
  { id: 'escrituras', name: 'Câmara das Escrituras', blurb: 'Palavras celestiais que despertam com a jornada.' },
  { id: 'arsenal', name: 'Arsenal das Lâminas', blurb: 'Espadas forjadas para quem não se vende.' },
  { id: 'conquistas', name: 'Salão das Conquistas', blurb: 'Feitos que o céu registra e recompensa.' },
  { id: 'arquivo', name: 'Arquivo dos Inimigos', blurb: 'O que você já enfrentou — e o que ainda se esconde.' },
  { id: 'fragmentos', name: 'Câmara dos Fragmentos', blurb: 'Selada até a Galáxia 4.', lockedUntilGalaxy: 4 }
];

export const SHOP_ITEMS = [
  { id: 'magic', sector: 'escrituras', kind: 'skill', name: 'Cerco das Cinco Lâminas Celestiais', cost: 20, level: 2, step: 4,
    desc: 'Cinco cópias da espada cercam o inimigo por até 12 s. Toque GOLPE para disparar uma por vez. 18 de mana.' },
  { id: 'magic2', sector: 'escrituras', kind: 'skill', name: 'Chuva de Estrelas Celestiais', cost: 35, level: 3, step: 5,
    desc: 'Lance luz ao céu para abrir um círculo e chover 90 estrelas em ondas durante 10 s. 32 de mana; recarga de 5,2 s.' },
  { id: 'magic3', disabled: true, sector: 'escrituras', kind: 'skill', name: 'Sol da Justiça', cost: 70, level: 4, step: 8,
    desc: 'Um sol pequeno e lento que queima o que toca. 45 de mana.' },
  { id: 'ultimate', disabled: true, sector: 'escrituras', kind: 'skill', name: 'Julgamento Divino', cost: 160, level: 6, step: 11,
    desc: 'A espada colossal. Recurso raro: 80 de mana e recarga longa.', stepText: 'ouvir a família Arruda no Ato II — A Dívida dos Vivos' },
  { id: 'magic_plus', sector: 'escrituras', kind: 'upgrade', name: 'Cerco Celestial II', cost: 90, level: 7, step: 16, stepText: 'chegar ao Vale do Altar (Ato III)',
    desc: 'Aprimora o dano de cada lâmina de 14 para 16. Requer Cerco das Cinco Lâminas Celestiais.', requires: 'magic' },
  { id: 'magic2_plus', sector: 'escrituras', kind: 'upgrade', name: 'Chuva de Estrelas II', cost: 120, level: 8, step: 16, stepText: 'chegar ao Vale do Altar (Ato III)',
    desc: 'Aumenta o dano de cada estrela de 6 para 8. Requer Chuva de Estrelas Celestiais.', requires: 'magic2' },
  { id: 'magic3_plus', disabled: true, sector: 'escrituras', kind: 'upgrade', name: 'Espada do Círculo', cost: 160, level: 9, step: 21, stepText: 'chegar à Torre (Ato IV)',
    desc: 'Nova Palavra do Ato IV: um círculo mágico se abre sob o inimigo e uma espada gigante irrompe do chão. Requer Sol da Justiça.', requires: 'magic3' },
  { id: 'aurora', sector: 'arsenal', kind: 'sword', name: 'Lâmina da Aurora', cost: 30, level: 3, step: 4,
    desc: 'Lâmina clara e mais longa: +20% de dano e rastro dourado. Sem habilidade ativa.' },
  { id: 'vigilia', sector: 'arsenal', kind: 'sword', name: 'Lâmina da Vigília', cost: 110, level: 7, step: 16, stepText: 'encontrar quem resiste no Vale do Altar (Ato III)',
    desc: 'Aço azul-pálido para quem não dorme diante do mal: +44% de dano e alcance maior.' },
  // MOD 208 — a relíquia do torneio do coliseu (Ato V): desbloqueada ao vencer o 8º round.
  { id: 'celeste', sector: 'arsenal', kind: 'sword', name: 'Espada Celestial', cost: 220, level: 6, step: 27, stepText: 'vencer o torneio do coliseu (Ato V)', unlock: 'celeste',
    desc: 'Caiu do céu e desintegra demônios que a tocam: +92% de dano, alcance longo e rastro branco.' }
];

export const SWORDS = {
  prota: { id: 'prota', name: 'Espada do Chamado', damage: 25, reach: 2.0, trail: 0xffe2a0 },
  aurora: { id: 'aurora', name: 'Lâmina da Aurora', damage: 30, reach: 2.25, trail: 0xfff1b8 },
  vigilia: { id: 'vigilia', name: 'Lâmina da Vigília', damage: 36, reach: 2.4, trail: 0xbfe0ff },
  celeste: { id: 'celeste', name: 'Espada Celestial', damage: 48, reach: 2.6, trail: 0xffffff }
};

/** Requisito de compra com motivo legível. owned: Set de ids. */
export function shopStatus(item, { questStep = 0, level = 1, coins = 0, owned = new Set() } = {}) {
  if (item.disabled) return { state: 'locked', reason: 'Em desenvolvimento.' };
  if (owned.has(item.id)) return { state: 'owned', reason: 'Já é seu.' };
  if (questStep < item.step) {
    const what = item.stepText || STEP_NAMES[item.step] || 'avançar na campanha';
    return { state: 'locked', reason: 'Disponível após ' + what + '.' };
  }
  if (item.requires && !owned.has(item.requires)) return { state: 'locked', reason: 'Requer ' + (SHOP_ITEMS.find(i => i.id === item.requires) || {}).name + '.' };
  if (level < item.level) return { state: 'level', reason: 'Requer nível ' + item.level + '.' };
  if (coins < item.cost) return { state: 'gold', reason: 'Faltam ' + (item.cost - coins) + ' moedas.' };
  return { state: 'buyable', reason: '' };
}

export function buyItem(item, ctx) {
  const st = shopStatus(item, ctx);
  if (st.state !== 'buyable') return { ok: false, reason: st.reason };
  return { ok: true, coins: ctx.coins - item.cost };
}

export const ACHIEVEMENTS = [
  { id: 'primeiro-golpe', name: 'Primeira Luz', desc: 'Derrote o primeiro captor.', reward: 6, goal: 1, stat: 'kills' },
  { id: 'libertador', name: 'Libertador', desc: 'Liberte as crianças das gaiolas.', reward: 10, goal: 1, stat: 'rescues' },
  { id: 'defesa-perfeita', name: 'Escudo da Fé', desc: 'Faça uma Defesa Perfeita.', reward: 8, goal: 1, stat: 'perfectBlocks' },
  { id: 'intocavel', name: 'Intocável', desc: 'Vença um combate sem ser atingido.', reward: 12, goal: 1, stat: 'flawless' },
  { id: 'explorador', name: 'Explorador', desc: 'Descubra 5 locais da floresta.', reward: 10, goal: 5, stat: 'places' },
  { id: 'ruina', name: 'O Que Foi Esquecido', desc: 'Encontre a ruína escondida.', reward: 6, goal: 1, stat: 'ruins' },
  { id: 'cacador', name: 'Mão Firme', desc: 'Derrote 6 servos da Ganância.', reward: 15, goal: 6, stat: 'kills' },
  { id: 'purificacao', name: 'Primeiro Selo', desc: 'Purifique VHAZRAEL, o Primeiro Bispo.', reward: 25, goal: 1, stat: 'bishops' }
];

export function achievementState(a, stats = {}, claimed = new Set()) {
  const value = Math.min(a.goal, Math.max(0, Math.floor(Number(stats[a.stat]) || 0)));
  return { value, done: value >= a.goal, claimed: claimed.has(a.id) };
}

/** Catálogo por ato. Silhueta até a primeira vitória; descoberta rende um bônus único. */
export const BESTIARY = [
  { id: 'captor', act: 1, name: 'Seguidor da Ganância', cls: 'Servo · Enemy1', img: 'Enemy1-ui.webp', discoveryReward: 3,
    lore: 'Vendeu a voz para cobrar a de outros. Ataca com garras e recua quando ferido.' },
  { id: 'demon2', act: 1, name: 'Demônio da Ganância', cls: 'Servo · Enemy2', img: 'Enemy2-ui.webp', discoveryReward: 4,
    lore: 'Anda em bando pelas trilhas e cobra em sangue o que os vivos não pagam em ouro.' },
  { id: 'warden', act: 1, name: 'Guardião do Portal', cls: 'Mini-chefe · Enemy1', img: 'Enemy1-ui.webp', discoveryReward: 6,
    lore: 'Guarda a dimensão de VHAZRAEL no fundo do esgoto. Mais pesado, golpe largo e mais resistente. Implora quando perde.' },
  { id: 'valerio', act: 1, name: 'VHAZRAEL', cls: 'Primeiro Bispo · O Ceifador dos Condenados', img: 'Bispo1-ui.webp', discoveryReward: 10,
    lore: 'O Ceifador dos Condenados. Cobrava cada dívida com uma alma e fez da floresta um livro-caixa de vidas.' },
  { id: 'vorgazhek', act: 2, name: 'VORGAZHEK', cls: 'Segundo Bispo', img: 'Bispo2-ui.webp', discoveryReward: 14,
    lore: 'O Arauto das Almas Endividadas. Escrevia o nome dos devedores em três livros e cobrava dos vivos o que os mortos não pagaram.' },
  { id: 'zealot', act: 3, name: 'Zelote do Altar', cls: 'Servo · Enemy3', img: 'Enemy3-ui.webp', discoveryReward: 5,
    lore: 'Ajoelhou-se tanto que esqueceu como se levanta. Golpeia em trio e lança cinzas de incenso.' },
  { id: 'zarkhael', act: 3, name: "ZAR'KHAEL", cls: 'Terceiro Bispo', img: 'Bispo3-ui.webp', discoveryReward: 16,
    lore: 'O Carrasco do Juízo Eterno. Contava joelhos e cobrava ingresso para rezar.' },
  { id: 'hollow', act: 4, name: 'Servo sem Eco', cls: 'Servo · Enemy4', img: 'Enemy4-ui.webp', discoveryReward: 6,
    lore: 'Esqueceu o próprio nome. Ainda carrega cartas que nunca entregou.' },
  { id: 'veraxion', act: 4, name: 'VÉRAXION', cls: 'Quarto Bispo', img: 'Bispo4-ui.webp', discoveryReward: 18,
    lore: 'O Custódio do Último Selo. Guardava o amor como prova de dívida — e a Ganância como prisioneira.' },
  { id: 'ganancia', act: 5, name: 'GANÂNCIA', cls: 'Pecado Capital', img: 'Ganancia1-ui.webp', discoveryReward: 40,
    lore: 'Não precisava mentir. Bastava que alguém desejasse um pouco mais. Três formas, uma só fome.' }
];

export function bestiaryEntry(entry, defeated = new Set()) {
  const known = defeated.has(entry.id);
  return known ? { ...entry, known: true } : { id: entry.id, act: entry.act, known: false, name: '???', cls: 'Desconhecido', img: entry.img, lore: 'Derrote-o para registrar.' };
}
