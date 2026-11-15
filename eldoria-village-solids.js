/**
 * Vila da Clareira — colisão AJUSTADA À FORMA de tudo o que é sólido na altura do corpo (Mod 319+).
 *
 * Antes: cada GLB da vila tinha um único círculo (barraca: raio 1,22 m no centro de uma peça de ~3,5 m; casas: círculo
 * dentro de um retângulo) e cercas vivas, bancos, mesas e adereços da praça não tinham colisão — o herói atravessava as
 * pontas das barracas, balcões, sebes e o banco. Esta máscara foi MEDIDA no jogo real: raios verticais em grade de
 * 0.25 m sobre a vila; célula sólida quando há malha entre 0,3 e 1,7 m acima do chão que não é piso caminhável (adro,
 * deques e escadas continuam pisáveis). Flores e gotas da fonte ficam de fora por desenho; NPCs não entram (eles têm
 * colisão própria). Ruído < 3 células é descartado e a máscara é dilatada 1 célula (raio do corpo).
 *
 * Regerar depois de mudar a vila: `node tools/visual-lab/village-solid-mask.cjs` (Chromium + jogo real, ?debug3d=1).
 * O teste tests/vila-solida.test.mjs falha se o layout mudar sem regerar (assinatura abaixo).
 * Custo em jogo: decodificação única de ~83 mil células; consulta O(1) por chamada.
 */
export const VILLAGE_SOLIDS = Object.freeze({
  cx: -12.2, cz: -44.5, R: 36, step: 0.25, N: 289, sig: '6qck54',
  rle: '8ji,6,7u,7,7u,8,7t,8,7u,7,7v,6,7a,3,j,5,78,7,7t,8,l,8,6z,b,i,9,6x,e,h,9,6w,f,a,g,6w,5,2,8,a,g,6w,5,1,9,8,i,6w,f,8,3,1,e,6x,d,9,i,6y,b,a,i,6y,9,b,k,6x,a,9,l,6x,a,9,l,6x,a,9,l,6y,8,a,l,70,5,b,l,2d,3,50,l,2c,6,4r,3,4,l,2c,6,4r,6,2,k,2b,9,4p,6,2,k,2b,a,4l,9,2,k,2b,a,4l,9,2,k,2c,9,4l,v,2c,8,4m,v,2d,7,4m,v,77,9,1,k,29,3,4t,9,8,6,2i,5,4p,6,2z,8,4m,9,2y,9,4l,9,2x,b,4k,9,f,4,2e,4,3,4,4k,9,c,7,2d,5,4,3,4k,8,b,9,2c,5,a,3,4f,7,c,a,2a,5,b,4,4f,6,b,b,29,5,c,5,4g,3,c,b,29,5,d,6,4t,b,28,5,f,5,4h,4,8,9,2a,4,h,4,4f,6,7,a,2,3,25,5,f,5,4f,7,4,8,5,5,24,6,d,5,4g,8,3,8,5,6,24,6,c,5,4k,4,3,8,4,8,23,6,b,5,4l,4,4,6,5,9,23,5,a,5,4m,4,4,5,4,5,1,5,2h,5,4o,4,5,3,3,4,4,4,2a,5,2,4,3,5,4i,4,4,3,2,5,5,6,27,b,3,8,4f,4,8,5,8,5,26,a,4,8,3w,6,d,5,6,5,9,6,25,a,4,8,3v,7,e,4,6,4,b,6,26,7,5,7,3w,8,d,5,2,6,d,5,24,3,2,3,7,6,3w,8,d,5,1,5,g,4,22,6,c,3,3z,7,b,d,f,5,22,6,c,3,3z,7,b,6,1,5,g,5,k,4,1d,9,4d,7,9,6,2,7,c,6,3,6,c,6,1b,9,4e,6,3,4,2,6,3,7,a,7,3,6,c,8,19,9,4e,6,1,6,2,3,6,8,8,7,3,7,c,9,18,8,4i,a,8,b,7,5,6,7,c,9,18,8,4j,8,8,d,5,5,7,7,b,a,19,7,4j,8,8,e,4,4,8,7,b,9,1a,7,4j,6,a,f,1,5,a,6,b,9,1b,3,52,l,b,4,b,9,6i,6,1,d,b,3,c,9,6i,7,4,8,q,9,z,9,5a,8,5,5,s,9,y,b,59,8,6,3,s,a,x,d,58,8,11,9,x,7,1,7,58,6,12,9,x,f,58,5,15,6,y,f,6k,4,y,f,7m,3,1,7,1,3,7m,f,7m,f,7m,f,7m,7,1,7,7n,d,7p,b,7a,3,4,7,3,9,7b,3,4,7,6,3,7e,3,4,7,7n,3,4,7,g,7,70,3,4,7,g,7,3q,4,6,4,2w,3,4,7,g,7,3p,h,2u,3,4,7,g,7,3o,j,2t,3,4,7,g,7,3n,k,17,m,10,3,4,7,g,6,3o,d,2,6,16,m,10,3,4,7,i,3,7,5,3a,9,a,5,16,m,10,3,4,7,s,7,37,8,d,4,16,5,1,3,8,5,10,3,4,7,r,a,33,9,e,7,13,5,1,3,8,5,10,3,4,7,r,c,30,9,f,8,12,3,3,3,z,7,7,3,4,7,n,7,2,9,2y,7,i,7,12,3,3,3,y,9,6,3,4,7,n,7,4,7,2y,6,l,5,12,3,3,3,x,a,16,7,7,5,2,7,2p,5,n,4,12,3,3,3,x,a,16,7,7,4,3,7,2p,5,n,5,17,3,x,a,15,7,8,4,3,8,2o,5,n,5,17,3,x,a,15,7,7,4,2,a,2p,4,n,6,26,a,15,6,8,4,2,a,2p,5,n,5,27,9,17,3,8,4,3,a,2p,5,n,6,26,8,17,4,8,4,4,9,2p,5,o,5,28,3,1a,4,8,3,6,8,a,6,28,5,p,5,15,3,2c,4,8,4,6,7,b,7,26,5,p,6,15,3,2b,6,6,4,9,3,c,8,26,4,p,7,z,3,3,3,1o,4,j,8,4,4,o,9,25,5,n,8,z,3,3,3,1o,4,j,a,2,3,p,9,25,6,m,6,11,3,3,3,1o,4,k,e,q,8,25,8,k,5,12,3,3,3,1o,4,m,b,s,7,25,8,k,4,13,5,1,3,8,5,1b,4,p,8,s,7,27,6,j,5,13,5,1,3,8,5,1b,4,q,6,39,5,g,7,13,m,1b,4,t,3,3a,5,e,8,13,m,1b,4,46,6,a,a,14,m,2p,e,2i,6,2,4,3,b,26,5,24,e,3,3,2d,d,1,7,1o,3,j,5,24,e,3,4,2d,i,1q,3,j,5,24,3,e,4,2e,g,1r,4,i,6,23,3,e,4,2h,3,2,7,1s,5,h,6,23,3,e,4,2n,3,1v,5,h,6,1u,5,4,3,e,4,4l,5,h,7,1q,9,3,3,e,3,5a,5,1q,9,3,3,f,3,4p,3,i,4,1q,9,4,3,e,3,4p,4,h,4,1r,8,3,4,e,3,4p,5,g,4,1s,7,3,4,e,3,4p,5,2c,7,3,4,e,3,4p,5,2d,5,4,4,d,4,4m,3,2r,9,3,9,4l,4,2s,8,3,8,4k,6,2s,8,3,7,4l,5,2t,4,4z,4,fr,4,3h,6,49,5,1i,4,1u,7,49,5,1h,6,1t,7,49,3,1h,8,1s,8,5s,a,1r,8,5s,a,1r,8,5s,b,1q,7,5v,9,1s,3,5x,a,7s,9,7t,9,7s,9,7t,9,7s,9,7t,8,7t,5,7x,3,3ue,6,7s,9,7r,a,7r,b,7q,b,7r,a,7s,a,7r,a,7s,9,7s,a,7r,a,66,3,1i,b,65,5,1g,b,65,5,1h,a,65,5,3,5,19,7,68,d,19,5,6a,d,7o,d,7o,d,7q,7,ml,3,7y,3,7y,3,1h,3,6e,3,1h,4,6d,3,1g,5,6d,3,19,4,1,8,6c,3,18,e,6c,3,18,e,b,5,4m,5,15,3,18,e,b,6,4j,8,2f,e,a,7,4d,f,2e,d,b,7,4c,g,2e,8,f,8,4b,h,31,8,4b,a,3,a,2v,9,4a,4,a,9,2x,7,48,6,a,9,2x,7,47,6,d,7,2y,3,4a,6,e,6,7b,5,g,5,7b,4,i,4,7b,4,i,5,7a,4,i,5,2u,3,4d,4,i,5,2u,6,4a,4,j,4,2u,6,4a,4,j,5,2t,6,4a,4,i,6,2y,3,48,4,i,6,2y,3,48,6,f,6,2z,3,48,7,e,5,30,3,m,a,3d,6,d,5,31,3,l,d,3d,4,d,4,32,3,l,d,3d,5,8,8,3q,d,3d,a,1,9,3r,4,2,7,3e,j,3q,4,3,8,3d,j,3q,f,3h,8,1,4,3r,g,3k,4,3x,g,7l,g,7l,g,7l,e,7n,9,7t,8,7t,7,7v,5,3lx',
});

/** Assinatura do layout que a máscara mediu (casas, barracas, adereços, centro da vila). */
export function villageLayoutSignature(parts) {
  const s = JSON.stringify(parts); let h = 5381; for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) >>> 0; return h.toString(36);
}

export function decodeVillageSolids(d = VILLAGE_SOLIDS) {
  const bits = new Uint8Array(d.N * d.N); let k = 0, v = 0;
  for (const t of d.rle.split(',')) { const n = parseInt(t, 36); if (v) bits.fill(1, k, k + n); k += n; v ^= 1; }
  return bits;
}

/** (x, z) do mundo → sólido? Fora do quadro da vila devolve false. */
export function createVillageSolidQuery(d = VILLAGE_SOLIDS) {
  const bits = decodeVillageSolids(d), x0 = d.cx - d.R, z0 = d.cz - d.R, inv = 1 / d.step, N = d.N;
  const at = (x, z) => { const i = Math.round((x - x0) * inv), j = Math.round((z - z0) * inv); return i >= 0 && j >= 0 && i < N && j < N && bits[i * N + j] === 1; };
  at.count = bits.reduce((a, b) => a + b, 0); at.data = d; return at;
}
