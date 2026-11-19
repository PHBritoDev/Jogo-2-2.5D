/** Treino SÓ FÍSICO (criado como teste temporário em 17/11/2026) — agora OPCIONAL e EXPLÍCITO.
 * Antes ele ficava ligado por padrão no jogo público e desligava salto, escudo, magias e ultimates de todos os
 * inimigos e Bispos (por isso o VHAZRAEL "não pulava nem conjurava"). Missão 19/11: o padrão é o kit canônico completo.
 * Para treinar só esgrima, abra o jogo com ?treinoFisico=1 (alias legado: ?somenteFisico=1).
 * O antigo ?fullCombatQA=1 continua aceito e não muda nada (já é o padrão).
 */
const params = typeof window !== 'undefined' && window.location ? new URLSearchParams(window.location.search) : null;
export const TEMP_MELEE_ONLY_TEST = !!params && !params.has('fullCombatQA') && (params.has('treinoFisico') || params.has('somenteFisico'));
export const MELEE_ONLY_PROFILES = Object.freeze([
  'vhazrael', 'fallen1', 'vorgazhek', 'fallen2', 'zarkhael', 'fallen3',
  'veraxion', 'fallen4', 'greed1', 'greed2', 'greed3',
  'captor', 'warden', 'evo1', 'elite1',
  'demon2', 'miniboss2', 'evo2', 'elite2',
  'demon3', 'miniboss4', 'zealot', 'evo3', 'elite3',
  'demon4', 'leader4', 'miniboss3', 'hollow', 'elite4'
]);
export const meleeOnlyProfile = p => TEMP_MELEE_ONLY_TEST && MELEE_ONLY_PROFILES.includes(p);

/**
 * TREINO TEMPORÁRIO DOS QUATRO BISPOS (19/11/2026):
 * true por padrão no jogo publicado: sem magia/ultimate dos Bispos, preservando
 * ataques físicos, dash, bloqueio/escudo e salto que cada rig realmente possui.
 * ?fullCombatQA=1 ou ?bisposComPoderes=1 restaura o combate completo.
 * Não confundir com treinoFisico (legado), que também altera outros inimigos.
 */
export const BISHOP_DUEL_ONLY = !!params && !params.has('fullCombatQA') && !params.has('bisposComPoderes');
