"use strict";
// Preset mobile real: center=(-2,-126), fineHalf=(206,166), cell=2.5.
// Pontos fora dos recortes/retalhos e fora da Jornada em streaming.
// Câmera a 2 m para dentro, 18 m acima do maior dos dois pontos amostrados.
const TERRAIN_EDGE_SHOTS = Object.freeze([
  Object.freeze({name:"transicao-x-leste",axis:"x",x:203,z:-126,fineEdge:203,firstOuter:205.5,fineCell:2.5,cameraOffset:Object.freeze([-2,18,0]),targetOffset:Object.freeze([0,0.35,0])}),
  Object.freeze({name:"transicao-x-oeste",axis:"x",x:-207,z:-260,fineEdge:-207,firstOuter:-209.5,fineCell:2.5,cameraOffset:Object.freeze([2,18,0]),targetOffset:Object.freeze([0,0.35,0])}),
  Object.freeze({name:"transicao-z-norte",axis:"z",x:-100,z:39,fineEdge:39,firstOuter:41.5,fineCell:2.5,cameraOffset:Object.freeze([0,18,-2]),targetOffset:Object.freeze([0,0.35,0])}),
  Object.freeze({name:"transicao-z-sul",axis:"z",x:100,z:-291,fineEdge:-291,firstOuter:-293.5,fineCell:2.5,cameraOffset:Object.freeze([0,18,2]),targetOffset:Object.freeze([0,0.35,0])}),
]);
module.exports = { TERRAIN_EDGE_SHOTS };
