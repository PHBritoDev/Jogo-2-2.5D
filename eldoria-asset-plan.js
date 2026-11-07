/**
 * Eldória — inventário dos modelos autorais de cenário (PR #407).
 * Escalas são metas de tamanho máximo em unidades do estudo, NÃO escalas finais do jogo.
 * As cenas da caverna e ritual são apenas estudos do lugar: sem NPCs/inimigos.
 * Assets de personagens antigos foram deliberadamente excluídos.
 */
export const ELDORIA_ZONES=Object.freeze({
  chegada:{target:[5,13,-102],distance:64,heading:'Estrada da chegada'},
  cidade:{target:[5,8,-44],distance:61,heading:'Cidade 1 — Eldória'},
  aguas:{target:[0,3,-10],distance:43,heading:'Águas da floresta'},
  lago:{target:[-42,-.4,24],distance:32,heading:'Lago escondido da floresta'},
  floresta:{target:[-38,13,5],distance:65,heading:'Floresta ancestral'},
  ritual:{target:[76,9,76],distance:49,heading:'Clareira do ritual — estudo'},
  caverna:{target:[-79,11,75],distance:54,heading:'Encosta da caverna — estudo'},
  interior:{target:[-80,14,290],distance:40,heading:'Caverna ancestral — salão de cristais'},
  abismo:{target:[-106,8,307],distance:28,heading:'Caverna ancestral — ala obscura'}
});
const at=(x,z,size,rotation=0)=>({x,z,size,rotation});
export const ELDORIA_ASSETS=Object.freeze([
  {file:'ArvoreAncestralEldoria.glb',stage:'core',placements:[at(55,-36,45,.3),at(-53,-28,43,-.5),at(-40,-88,39,.65),at(46,-85,42,-.35),at(-19,42,93,-.15),at(34,48,88,.4)]},
  {file:'ArvoreFloresta01.glb',stage:'core',placements:[at(-62,-37,14),at(62,-42,13,.4),at(-50,-75,10),at(-67,14,19,.7),at(-66,42,18),at(-19,13,17,-.3),at(-13,30,15,.5),at(39,24,14,-.4),at(-80,-65,15,.5),at(72,-65,16,-.3)]},
  {file:'CasaEldoria01.glb',stage:'core',placements:[at(-19,-51,10,.2),at(-7,-52,9,-.4),at(18,-53,10,.15),at(29,-43,9,-.3)]},
  {file:'CasaEldoria02.glb',stage:'core',placements:[at(-23,-32,10,-.2),at(-9,-29,9,.3),at(15,-28,10,-.3),at(29,-29,9,.45)]},
  {file:'BarracaFrutasEldoria.glb',stage:'core',placements:[at(8,-39,6)]},
  {file:'PocoEldoria.glb',stage:'core',placements:[at(3,-47,5)]},
  {file:'FerreiroEldoria.glb',stage:'core',placements:[at(20,-63,7)]},
  {file:'PassarelaSuspensaEldoria.glb',stage:'core',placements:[at(0,-10,12,-.72)]},
  {file:'RochedoMusgoEldoria.glb',stage:'core',placements:[at(37,-78,6),at(-30,-93,7),at(-64,26,7,-.4),at(-23,37,6,.6)]},
  {file:'Carroça.glb',stage:'core',placements:[at(3,-108,5,1.1)]},
  {file:'Ponte.glb',stage:'core',placements:[at(-21,-6,9,-.4)]},
  {file:'CristalCaverna01.glb',stage:'interior',placements:[at(-63,302,11,.55),at(-104,277,8,-.6),at(-105,318,7,.2)]},
  {file:'JaulaRitualAto1.glb',stage:'ritual',placements:[at(75,73,10,0)]},
  {file:'EntradaCavernaAto1.glb',stage:'caverna',placements:[at(-79,78,20,2)]},
  {file:'MontanhaEldoria01.glb',stage:'caverna',placements:[at(-100,90,58,1.5),at(-55,108,44,-.4)]}
]);
export const ELDORIA_STAGES=Object.freeze(['core','ritual','caverna','interior']);
export function assetsForStage(stage){return ELDORIA_ASSETS.filter(a=>a.stage===stage);}
export function isSceneryOnly(file){return ELDORIA_ASSETS.some(a=>a.file===file);}
