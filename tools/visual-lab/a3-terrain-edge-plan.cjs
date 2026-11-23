"use strict";
// Coordenadas do preset mobile real: center=(-2,-126), fineHalf=(206,166), cell=2.5.
// fineSteps=(82,66), logo os últimos vértices finos ficam em X=(203,-207), Z=(39,-291).
const TERRAIN_EDGE_SHOTS = Object.freeze([
  Object.freeze({name:"transicao-x-leste",axis:"x",x:203,z:-126,fineEdge:203,firstOuter:205.5,fineCell:2.5,cameraOffset:Object.freeze([14,24,14]),targetOffset:Object.freeze([0,2,0])}),
  Object.freeze({name:"transicao-x-oeste",axis:"x",x:-207,z:-126,fineEdge:-207,firstOuter:-209.5,fineCell:2.5,cameraOffset:Object.freeze([-14,24,14]),targetOffset:Object.freeze([0,2,0])}),
  Object.freeze({name:"transicao-z-norte",axis:"z",x:-2,z:39,fineEdge:39,firstOuter:41.5,fineCell:2.5,cameraOffset:Object.freeze([14,24,14]),targetOffset:Object.freeze([0,2,0])}),
  Object.freeze({name:"transicao-z-sul",axis:"z",x:-2,z:-291,fineEdge:-291,firstOuter:-293.5,fineCell:2.5,cameraOffset:Object.freeze([14,24,-14]),targetOffset:Object.freeze([0,2,0])}),
]);
module.exports = { TERRAIN_EDGE_SHOTS };
