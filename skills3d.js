/**
 * MOD 186 — Habilidades celestiais do mundo 3D: desbloqueio por progressão, mana e recarga.
 * Regras puras (testadas em skills3d.test.mjs); o mundo só desenha e chama.
 *
 * Desde o Mod 188 as Palavras são compradas na Loja Central (Câmara das Escrituras), com requisitos
 * de etapa, nível e ouro definidos em progression3d.js.
 */
export const MANA = { max: 100, regenCalm: 6, regenCombat: 2.4, hitGain: 5, hitGainInterval: 650 };

export const SKILLS = {
  magic: { id: 'magic', name: 'Cerco das Cinco Lâminas Celestiais', key: '1', mana: 18, cooldown: 1800, unlockStep: 4,
    lockReason: 'Compre na Loja Central depois de libertar as crianças.' },
  magic2: { id: 'magic2', name: 'Chuva de Estrelas Celestiais', key: '2', mana: 32, cooldown: 5200, unlockStep: 6,
    lockReason: 'Compre na Loja Central depois de vencer as sentinelas.' },
  magic3: { id: 'magic3', name: 'Tornado da Fênix Celestial', key: '3', mana: 45, cooldown: 12000, unlockBishops: 1,
    lockReason: 'Compre na Loja Central depois de purificar VHAZRAEL.' },
  ultimate: { id: 'ultimate', name: 'Julgamento Divino — Colapso da Luz Eterna', key: '4', mana: 80, cooldown: 30000, unlockBishops: 2,
    lockReason: 'Compre na Loja Central durante o Ato II, antes do Segundo Bispo.' }
};
export const SKILL_ORDER = ['magic', 'magic2', 'magic3', 'ultimate'];

/* MOD 233 — três Palavras novas, compráveis e equipáveis nos três espaços normais (a ultimate fica separada).
   IDs novos e estáveis: as quatro magias antigas e os saves continuam iguais. */
Object.assign(SKILLS, {
  skill_x_rupture: { id: 'skill_x_rupture', name: 'Ruptura em X', key: '·', mana: 26, cooldown: 6500, extra: true,
    lockReason: 'Compre a Ruptura em X na Loja Central.' },
  skill_twin_portals: { id: 'skill_twin_portals', name: 'Portais da Perseguição', key: '·', mana: 40, cooldown: 11000, extra: true,
    lockReason: 'Compre os Portais da Perseguição na Loja Central.' },
  skill_judgment_dragon: { id: 'skill_judgment_dragon', name: 'Dragão do Julgamento', key: '·', mana: 55, cooldown: 18000, extra: true,
    lockReason: 'Compre o Dragão do Julgamento na Loja Central.' }
});
export const EXTRA_SKILLS = ['skill_x_rupture', 'skill_twin_portals', 'skill_judgment_dragon'];
/** Palavras que podem ocupar os três espaços normais (botões 1, 2 e 3). */
export const SLOT_SKILLS = ['magic', 'magic2', 'magic3', ...EXTRA_SKILLS];
export const SLOT_IDS = ['magic', 'magic2', 'magic3'];                 // ids dos botões/atalhos (posições fixas no HUD)
export const DEFAULT_LOADOUT = Object.freeze(['magic', 'magic2', 'magic3']);

/** Palavras disponíveis para os espaços: compradas (ou todas no modo de teste). */
export function ownedSlotSkills({ owned = [], testAll = false } = {}) {
  const have = owned instanceof Set ? owned : new Set(owned);
  return SLOT_SKILLS.filter(id => !SKILLS[id].disabled && (testAll || have.has(id)));
}
/** Saves antigos não têm loadout: começa no padrão. IDs inválidos ou repetidos voltam ao padrão daquele espaço. */
export function normalizeLoadout(loadout) {
  const out = [0, 1, 2].map(i => { const id = Array.isArray(loadout) ? loadout[i] : null; return SLOT_SKILLS.includes(id) ? id : null; });
  for (let i = 0; i < 3; i++) if (out[i] && out.indexOf(out[i]) !== i) out[i] = null;
  for (let i = 0; i < 3; i++) if (!out[i]) out[i] = !out.includes(DEFAULT_LOADOUT[i]) ? DEFAULT_LOADOUT[i] : SLOT_SKILLS.find(id => !out.includes(id));
  return out;
}
/** Equipa uma Palavra num espaço. Fora de combate apenas, só Palavras compradas; se ela já estava em outro espaço, troca. */
export function equipSlot(loadout, slot, id, { owned = [], testAll = false, inCombat = false, busy = false } = {}) {
  const cur = normalizeLoadout(loadout);
  if (inCombat) return { ok: false, reason: 'Troque as Palavras fora de combate.', loadout: cur };
  if (busy) return { ok: false, reason: 'Espere a Palavra atual terminar.', loadout: cur };
  if (!(slot >= 0 && slot < 3)) return { ok: false, reason: 'Espaço inválido.', loadout: cur };
  if (!ownedSlotSkills({ owned, testAll }).includes(id)) return { ok: false, reason: (SKILLS[id] || {}).lockReason || 'Palavra desconhecida.', loadout: cur };
  const other = cur.indexOf(id); if (other >= 0) cur[other] = cur[slot];
  cur[slot] = id; return { ok: true, loadout: cur };
}
/** Primeiro espaço cuja Palavra ainda não foi comprada (para equipar automaticamente uma Palavra recém-comprada). */
export function autoSlotFor(loadout, owned) {
  const have = owned instanceof Set ? owned : new Set(owned), cur = normalizeLoadout(loadout);
  return cur.findIndex(id => !have.has(id));
}

/** Conjunto de habilidades liberadas: as que o jogador comprou na Loja Central (Mod 188). */
export function unlockedSkills({ owned = [], testAll = false } = {}) {
  const have = owned instanceof Set ? owned : new Set(owned);
  return new Set(SKILL_ORDER.filter(id => !SKILLS[id].disabled && (testAll || have.has(id))));
}

/** Habilidades que acabaram de ser liberadas entre dois estados (para a animação de revelação). */
export function newlyUnlocked(before, after) {
  return SKILL_ORDER.filter(id => after.has(id) && !before.has(id));
}

/** Pode lançar agora? Retorna o motivo legível quando não. */
export function canCast(id, { unlocked, mana, cooldownUntil = {}, now = 0 }) {
  const s = SKILLS[id];
  if (s?.disabled) return { ok: false, reason: 'Em desenvolvimento.' };
  if (!s) return { ok: false, reason: 'Habilidade desconhecida.' };
  if (!unlocked.has(id)) return { ok: false, reason: s.lockReason };
  const left = (cooldownUntil[id] || 0) - now;
  if (left > 0) return { ok: false, reason: s.name + ' recarrega em ' + Math.ceil(left / 1000) + ' s.' };
  if (mana < s.mana) return { ok: false, reason: 'Mana insuficiente para ' + s.name + ' (' + s.mana + ').' };
  return { ok: true };
}

/** Recuperação contínua: mais lenta durante o combate. */
export function regenMana(mana, dt, inCombat) {
  return Math.min(MANA.max, mana + dt * (inCombat ? MANA.regenCombat : MANA.regenCalm));
}

/** Golpe confirmado devolve um pouco de mana, no máximo uma vez por intervalo (evita exploração). */
export function manaFromHit(mana, lastGainAt, now) {
  if (now - lastGainAt < MANA.hitGainInterval) return { mana, lastGainAt };
  return { mana: Math.min(MANA.max, mana + MANA.hitGain), lastGainAt: now };
}

/** Fração restante da recarga (1 = acabou de usar, 0 = pronta). */
export function cooldownFraction(id, cooldownUntil, now) {
  const s = SKILLS[id];
  const left = (cooldownUntil[id] || 0) - now;
  return s && left > 0 ? Math.min(1, left / s.cooldown) : 0;
}
