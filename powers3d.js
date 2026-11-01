/**
 * MOD 212 — Marco 10: poderes de todos os inimigos, refeitos do zero (prompt do autor, seção "Combate", e documento
 * mestre, seção "Poderes"). Cada família tem Habilidade 1, 2 e 3, um golpe de espada e uma ultimate. Este arquivo
 * só tem regras e números; os efeitos visuais ficam em mundo-3d-prototype.js (MOD 212).
 *
 * Referências do autor (inspiração, sem copiar): Nanatsu no Taizai (Hellblaze/orbes negros do Meliodas, sol do
 * Escanor), Fate (portais que despejam espadas), Bleach (corte negro em lua crescente), Black Clover (grimórios),
 * Demon Slayer (cortes de respiração), Fire Force (lanças e furacões de fogo), Re:Zero (mãos e sombras), Tensei Slime
 * (raios do céu), Sword Art Online (combos de espada). Ganância usa a SUPERNOVA (pedido "I Am Atomic") e o Bispo 4
 * usa o BURACO NEGRO (pedido do autor).
 *
 * Tipos de efeito (arquétipos): circles (marcas no chão que explodem), orbs (esferas que perseguem), rain (chuva de
 * lâminas numa área), wave (corte em lua crescente), line (lança/raio em linha), ring (onda de choque que se expande),
 * vortex (furacão que persegue), grab (mãos/correntes que prendem), dash (investida), cone (varrida em leque).
 */
export const FAMILY = {
  captor: 'seguidor', warden: 'seguidor', evo1: 'seguidor', elite1: 'seguidor',
  demon2: 'demonio', miniboss2: 'demonio', evo2: 'demonio', elite2: 'demonio',
  demon3: 'carrasco', miniboss4: 'carrasco', zealot: 'carrasco', evo3: 'carrasco', elite3: 'carrasco',
  demon4: 'guardiao', leader4: 'guardiao', miniboss3: 'guardiao', hollow: 'guardiao', elite4: 'guardiao',
  vhazrael: 'vhazrael', fallen1: 'vhazrael', vorgazhek: 'vorgazhek', fallen2: 'vorgazhek',
  zarkhael: 'zarkhael', fallen3: 'zarkhael', veraxion: 'veraxion', fallen4: 'veraxion',
  greed1: 'greed1', greed2: 'greed2', greed3: 'greed3'
};
const BOSSES = new Set(['vhazrael', 'vorgazhek', 'zarkhael', 'veraxion', 'greed1', 'greed2', 'greed3', 'fallen1', 'fallen2', 'fallen3', 'fallen4']);
const ELITES = new Set(['warden', 'leader4', 'miniboss2', 'miniboss3', 'miniboss4', 'elite1', 'elite2', 'elite3', 'elite4']);
export function tierOf(profile) { return BOSSES.has(profile) ? 'boss' : ELITES.has(profile) ? 'elite' : FAMILY[profile] ? 'common' : null; }
/** Multiplicadores por nível: comuns batem menos e soltam poderes com menos frequência. */
export const TIER = {
  common: { dmg: .55, cd: 1.4, ult: [.3] },
  elite: { dmg: .7, cd: 1.15, ult: [.5] },
  boss: { dmg: .8, cd: 1, ult: [.6, .25] }
};
const S = (id, name, type, o) => Object.assign({ id, name, type }, o);
export const KITS = {
  seguidor: { color: 0x8a2be2, color2: 0x2a0a40, book: false, skills: [
    S('s1', 'Orbes do Culto', 'orbs', { n: 3, dmg: 10, cd: 7, speed: 7 }),
    S('s2', 'Mãos do Abismo', 'grab', { n: 1, dmg: 12, cd: 9, r: 1.6, root: 1.2 }),
    S('s3', 'Selos Profanos', 'circles', { n: 3, dmg: 12, cd: 10, r: 1.7 })],
    sword: S('sw', 'Lâmina Ritual', 'dash', { dmg: 14, cd: 6, len: 7 }),
    ult: S('ult', 'RITUAL DO ÚLTIMO SACRIFÍCIO', 'ritual', { dmg: 26 }) },
  demonio: { color: 0xff4a12, color2: 0x5a0a00, book: false, skills: [
    S('s1', 'Hálito Infernal', 'cone', { dmg: 12, cd: 7, r: 6, arc: 1.1 }),
    S('s2', 'Erupções', 'circles', { n: 4, dmg: 13, cd: 9, r: 1.8 }),
    S('s3', 'Bolas de Fogo', 'orbs', { n: 5, dmg: 9, cd: 10, speed: 8 })],
    sword: S('sw', 'Corte Flamejante', 'wave', { n: 1, dmg: 14, cd: 6 }),
    ult: S('ult', 'FURACÃO INFERNAL', 'inferno', { dmg: 28 }) },
  carrasco: { color: 0xff2a3a, color2: 0x200008, book: false, skills: [
    S('s1', 'Investida do Carrasco', 'dash', { dmg: 15, cd: 7, len: 8 }),
    S('s2', 'Tremor', 'ring', { dmg: 14, cd: 9, r: 7 }),
    S('s3', 'Corrente da Forca', 'line', { dmg: 13, cd: 10, len: 11, w: 1.2 })],
    sword: S('sw', 'Corte Negro', 'wave', { n: 2, dmg: 13, cd: 6 }),
    ult: S('ult', 'EXECUÇÃO', 'execution', { dmg: 32 }) },
  guardiao: { color: 0x6a7aff, color2: 0x0a0a30, book: false, skills: [
    S('s1', 'Lança Sombria', 'line', { dmg: 14, cd: 7, len: 12, w: 1.1 }),
    S('s2', 'Chuva de Lanças', 'rain', { n: 18, dmg: 12, cd: 10, r: 3.2, dur: 1.6 }),
    S('s3', 'Pulso do Bastião', 'ring', { dmg: 13, cd: 9, r: 6.5 })],
    sword: S('sw', 'Varrida', 'cone', { dmg: 14, cd: 6, r: 4.5, arc: 1.6 }),
    ult: S('ult', 'BASTIÃO DAS SOMBRAS', 'barrage', { dmg: 30 }) },
  vhazrael: { color: 0x9d4dff, color2: 0x120018, book: true, skills: [
    S('s1', 'Mãos do Contrato', 'grab', { n: 3, dmg: 14, cd: 8, r: 1.7, root: 1.3 }),
    S('s2', 'Orbes das Almas', 'orbs', { n: 6, dmg: 11, cd: 9, speed: 7.5 }),
    S('s3', 'Moedas das Almas', 'rain', { n: 26, dmg: 13, cd: 11, r: 3.6, dur: 1.8, gold: true })],
    sword: S('sw', 'Espadas Sombrias', 'wave', { n: 3, dmg: 13, cd: 6 }),
    ult: S('ult', 'CONTRATO FINAL: O CEIFADOR', 'reaper', { dmg: 34 }) },
  vorgazhek: { color: 0xffb020, color2: 0x5a1a00, book: true, skills: [
    S('s1', 'Correntes da Dívida', 'grab', { n: 3, dmg: 15, cd: 8, r: 1.9, root: 1.4, chain: true }),
    S('s2', 'Lâminas de Metal Líquido', 'wave', { n: 5, dmg: 11, cd: 9 }),
    S('s3', 'Explosões da Forja', 'circles', { n: 5, dmg: 15, cd: 10, r: 2 })],
    sword: S('sw', 'Golpe da Forja', 'dash', { dmg: 16, cd: 6, len: 8 }),
    ult: S('ult', 'FORNALHA DA DÍVIDA', 'forge', { dmg: 36 }) },
  zarkhael: { color: 0x7ad8ff, color2: 0x08223a, book: true, skills: [
    S('s1', 'Selos do Juízo', 'circles', { n: 4, dmg: 16, cd: 8, r: 1.8 }),
    S('s2', 'Gelo Distorcido', 'line', { n: 3, dmg: 14, cd: 9, len: 12, w: 1 }),
    S('s3', 'Sentença Espectral', 'orbs', { n: 4, dmg: 13, cd: 10, speed: 5.5 })],
    sword: S('sw', 'Lua de Gelo', 'cone', { dmg: 15, cd: 6, r: 5, arc: 1.4 }),
    ult: S('ult', 'SENTENÇA INVERTIDA', 'sentence', { dmg: 34 }) },
  veraxion: { color: 0x9a2cff, color2: 0xff5a1a, book: true, skills: [
    S('s1', 'Fogo Abissal', 'abyss', { n: 5, dmg: 18, cd: 8 }),
    S('s2', 'Furacão Negro', 'vortex', { dmg: 9, cd: 11, dur: 4, speed: 3.2 }),
    S('s3', 'Orbes do Abismo', 'orbs', { n: 6, dmg: 12, cd: 9, speed: 7 })],
    sword: S('sw', 'Corte do Abismo', 'wave', { n: 2, dmg: 15, cd: 6 }),
    ult: S('ult', 'BURACO NEGRO', 'void', { dmg: 28 }) },
  greed1: { color: 0xffd040, color2: 0x3a2400, book: true, skills: [
    S('s1', 'Portões do Tesouro', 'rain', { n: 30, dmg: 13, cd: 9, r: 3.8, dur: 1.8, gold: true }),
    S('s2', 'Orbes de Ouro', 'orbs', { n: 5, dmg: 12, cd: 8, speed: 8 }),
    S('s3', 'Correntes da Cobiça', 'grab', { n: 3, dmg: 14, cd: 10, r: 1.9, root: 1.3, chain: true })],
    sword: S('sw', 'Corte Dourado', 'wave', { n: 2, dmg: 15, cd: 6 }),
    ult: S('ult', 'PORTÕES DA AVAREZA', 'gate', { dmg: 34 }) },
  greed2: { color: 0xffb030, color2: 0x200800, book: true, skills: [
    S('s1', 'Furacão de Moedas', 'vortex', { dmg: 10, cd: 10, dur: 4.5, speed: 3.6, gold: true }),
    S('s2', 'Gêiseres de Ouro', 'circles', { n: 6, dmg: 15, cd: 9, r: 1.9 }),
    S('s3', 'Raio da Ganância', 'line', { n: 2, dmg: 16, cd: 9, len: 14, w: 1.3 })],
    sword: S('sw', 'Leque Voraz', 'cone', { dmg: 16, cd: 6, r: 5.5, arc: 1.5 }),
    ult: S('ult', 'MÃOS DA AVAREZA', 'hands', { dmg: 36 }) },
  greed3: { color: 0xc070ff, color2: 0xffe08a, book: true, skills: [
    S('s1', 'Orbes do Vazio', 'orbs', { n: 8, dmg: 12, cd: 8, speed: 8 }),
    S('s2', 'Chuva de Espadas Negras', 'rain', { n: 36, dmg: 14, cd: 10, r: 4.2, dur: 2 }),
    S('s3', 'A Fome da Ganância', 'blackhole', { dmg: 30, cd: 12 })],
    sword: S('sw', 'Corte Triplo', 'wave', { n: 3, dmg: 16, cd: 6 }),
    ult: S('ult', 'SUPERNOVA DA GANÂNCIA', 'nova', { dmg: 46 }) }
};
export function kitFor(profile) { const f = FAMILY[profile]; return f ? KITS[f] : null; }
/** Números finais de um poder para este perfil (dano e recarga ajustados pelo nível). */
export function powerStats(profile, move) {
  const t = TIER[tierOf(profile)]; if (!t || !move) return null;
  return Object.assign({}, move, { dmg: Math.round(move.dmg * t.dmg), cd: +(move.cd * t.cd).toFixed(2) });
}
/**
 * Escolhe o próximo poder. `cds` = recargas restantes por id, `dist` = distância até o herói.
 * O golpe de espada só sai de perto (até 4,5 m); as habilidades saem de 3 a 16 m, em rodízio.
 */
export function pickMove(profile, cds, dist, lastId = '') {
  const k = kitFor(profile); if (!k) return null;
  if (dist <= 4.5 && !(cds.sw > 0)) return k.sword;
  if (dist < 3 || dist > 16) return null;
  const ready = k.skills.filter(s => !(cds[s.id] > 0));
  if (!ready.length) return null;
  return ready.find(s => s.id !== lastId) || ready[0];
}
/** Limiares de vida em que a ultimate sai (fração da vida máxima), na ordem. */
export function ultThresholds(profile) { const t = TIER[tierOf(profile)]; return t ? t.ult : []; }
