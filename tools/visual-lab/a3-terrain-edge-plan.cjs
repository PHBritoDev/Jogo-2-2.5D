"use strict";
// Preset mobile real: center=(-2,-126), fineHalf=(206,166), cell=2.5.
// Pontos fora dos recortes/retalhos e fora da Jornada em streaming.
// Mira o ponto médio da primeira célula externa; câmera 8 m para dentro e 8 m acima (~45°).
const TERRAIN_EDGE_SHOTS = Object.freeze([
  Object.freeze({name:"transicao-x-leste",axis:"x",x:204.25,z:-126,fineEdge:203,firstOuter:205.5,legacyFirstOuter:206.5,fineCell:2.5,edgeSpan:1.5,cameraOffset:Object.freeze([-12,9,0]),targetOffset:Object.freeze([0,0.35,0])}),
  Object.freeze({name:"transicao-x-oeste",axis:"x",x:-208.25,z:-260,fineEdge:-207,firstOuter:-209.5,legacyFirstOuter:-210.5,fineCell:2.5,edgeSpan:1.5,cameraOffset:Object.freeze([12,9,0]),targetOffset:Object.freeze([0,0.35,0])}),
  Object.freeze({name:"transicao-z-norte",axis:"z",x:-100,z:40.25,fineEdge:39,firstOuter:41.5,legacyFirstOuter:42.5,fineCell:2.5,edgeSpan:1.5,cameraOffset:Object.freeze([0,9,-12]),targetOffset:Object.freeze([0,0.35,0])}),
  Object.freeze({name:"transicao-z-sul",axis:"z",x:100,z:-292.25,fineEdge:-291,firstOuter:-293.5,legacyFirstOuter:-294.5,fineCell:2.5,edgeSpan:1.5,cameraOffset:Object.freeze([0,9,12]),targetOffset:Object.freeze([0,0.35,0])}),
]);
module.exports = { TERRAIN_EDGE_SHOTS };
