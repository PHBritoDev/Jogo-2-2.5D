/**
 * Continuação legítima de combo do VÉRAXION.
 * Autoriza SOMENTE furar a graça de 850 ms criada por golpe anterior do MESMO ataque.
 * Dash/i-frames reais, esquiva perfeita, escudo e invulnerabilidade de habilidades seguem protegidos no mundo.
 */
export function vxComboFollowupAllowed(last, info, { now, until, dash, perfectDodge } = {}) {
  return !!(
    last && info && info.kind === 'melee' && info.attackToken &&
    last.attackToken === info.attackToken && last.actor === info.actor &&
    Number.isInteger(info.combo) && info.combo === last.combo + 1 && info.combo >= 2 &&
    Number.isFinite(now) && now >= last.at && now - last.at <= 2300 &&
    until === last.until && now < until &&
    !dash && !perfectDodge
  );
}
