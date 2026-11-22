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

/**
 * 22/11 — SEQUÊNCIA de dano declarada pelo atacante (`seqKey`/`seqN`): a 2ª janela de um giro da arma autônoma da Ganância e os
 * golpes de uma corrente (o 1º corte do golpe seguinte continua a contagem). Só fura a graça criada pelo contato ANTERIOR da MESMA
 * sequência, em ordem crescente e em até 2,3 s; dash e esquiva perfeita continuam protegendo.
 */
export function seqFollowupAllowed(last, info, { now, until, dash, perfectDodge } = {}) {
  return !!(
    last && info && info.seqKey && last.seqKey === info.seqKey &&
    Number.isFinite(info.seqN) && Number.isFinite(last.seqN) && info.seqN > last.seqN &&
    Number.isFinite(now) && now >= last.at && now - last.at <= 2300 &&
    until === last.until && now < until && !dash && !perfectDodge
  );
}
