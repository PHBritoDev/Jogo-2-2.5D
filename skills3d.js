/**
 * MOD 186 — Habilidades celestiais do mundo 3D: desbloqueio por progressão, mana e recarga.
 * Regras puras (testadas em skills3d.test.mjs); o mundo só desenha e chama.
 *
 * Até a loja central existir, as duas primeiras habilidades são ensinadas pelo Anjo-Guia
 * em marcos do Ato I (o documento pede Skill 1 e 2 antes do Primeiro Bispo). Sol da Justiça
 * e o Julgamento Divino continuam bloqueados até a vitória sobre Valério.
 */
export const MANA = { max: 100, regenCalm: 6, regenCombat: 2.4, hitGain: 5, hitGainInterval: 650 };

export const SKILLS = {
  magic: { id: 'magic', name: 'Espadas da Palavra', key: '1', mana: 18, cooldown: 1800, unlockStep: 4,
    lockReason: 'O Anjo-Guia ensina esta Palavra depois que as crianças estiverem a salvo.' },
  magic2: { id: 'magic2', name: 'Julgamento Celestial', key: '2', mana: 32, cooldown: 4200, unlockStep: 6,
    lockReason: 'Liberada ao vencer o guarda da passagem.' },
  magic3: { id: 'magic3', name: 'Sol da Justiça', key: '3', mana: 45, cooldown: 6200, unlockBishops: 1,
    lockReason: 'Disponível após derrotar Valério, o Primeiro Bispo.' },
  ultimate: { id: 'ultimate', name: 'Julgamento Divino', key: '4', mana: 80, cooldown: 14000, unlockBishops: 2,
    lockReason: 'Disponível antes do Segundo Bispo, com nível e missão próprios.' }
};
export const SKILL_ORDER = ['magic', 'magic2', 'magic3', 'ultimate'];

/** Conjunto de habilidades liberadas para um estado de campanha. */
export function unlockedSkills({ questStep = 0, bishopsDefeated = 0, testAll = false } = {}) {
  const out = new Set();
  for (const id of SKILL_ORDER) {
    const s = SKILLS[id];
    if (testAll || (s.unlockStep !== undefined && questStep >= s.unlockStep) || (s.unlockBishops !== undefined && bishopsDefeated >= s.unlockBishops)) out.add(id);
  }
  return out;
}

/** Habilidades que acabaram de ser liberadas entre dois estados (para a animação de revelação). */
export function newlyUnlocked(before, after) {
  return SKILL_ORDER.filter(id => after.has(id) && !before.has(id));
}

/** Pode lançar agora? Retorna o motivo legível quando não. */
export function canCast(id, { unlocked, mana, cooldownUntil = {}, now = 0 }) {
  const s = SKILLS[id];
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
