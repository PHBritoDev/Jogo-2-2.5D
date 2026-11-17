/** TESTE TEMPORÁRIO DO CRIADOR (17/11/2026).
 * true = inimigos 1–4, bispos 1–4 e Ganância usam apenas combate físico normal;
 * false = restaura todos os poderes originais, sem apagar implementações.
 * IMPORTANTE: não usar esta configuração como balanceamento final.
 */
export const TEMP_MELEE_ONLY_TEST = true;
export const meleeOnlyProfile = p => TEMP_MELEE_ONLY_TEST && [
  'vhazrael', 'fallen1', 'vorgazhek', 'fallen2', 'zarkhael', 'fallen3',
  'veraxion', 'fallen4', 'greed1', 'greed2', 'greed3',
  'captor', 'warden', 'evo1', 'elite1',
  'demon2', 'miniboss2', 'evo2', 'elite2',
  'demon3', 'miniboss4', 'zealot', 'evo3', 'elite3',
  'demon4', 'leader4', 'miniboss3', 'hollow', 'elite4'
].includes(p);
