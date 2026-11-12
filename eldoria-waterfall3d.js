/**
 * Mod 316 — Cachoeira em degraus da nascente do rio (Ato I).
 *
 * Hidrologia: o rio de Eldória começa no pé da crista leste (x ≈ 78). No alto da crista (x ≈ 100, y ≈ 8,6 m) há uma
 * nascente; a água desce para oeste, cai num degrau de rocha de ~1,6 m (x ≈ 91) e escorre pela encosta até entrar no
 * rio — o mesmo leito, a mesma direção da correnteza. A malha segue o relevo real (amostrado do terreno), então não há
 * água flutuando nem atravessando a rocha.
 *
 * Custo: 1 fita de água (mesmo shader do rio, com água branca), 2 cartões de névoa, 1 disco de espuma no encontro com o
 * rio, 1 camada de som posicional (Web Audio, atenuada por distância). Sem luzes, sem render target, sem partículas por
 * CPU: tudo animado por uniform de tempo.
 */
import { buildRiverMesh } from './eldoria-water.js';

export const WATERFALL = Object.freeze({
  points: [[101, -9.2], [97.5, -9.1], [94, -9.05], [91.6, -9], [90.2, -8.95], [87.5, -8.9], [84, -8.8], [80.5, -8.7], [77.2, -8.6]],
  halfWidth: .95,
  spring: { x: 101, z: -9.2 },
  ledge: { x: 90.8, z: -9 },
  base: { x: 77.8, z: -8.6 },
});

const mistVert = 'varying vec2 vUv; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0); mv.xy += position.xy; gl_Position = projectionMatrix * mv; }';
const mistFrag = `uniform float uTime, uNight, uSeed; varying vec2 vUv;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), u.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), u.x), u.y); }
void main(){ vec2 p = vUv - .5; float r = length(p * vec2(1.0, 1.4));
  float m = n(vUv * 4.0 + vec2(uSeed, -uTime * .45)) * .6 + n(vUv * 9.0 + vec2(-uTime * .3, uSeed)) * .4;
  float a = smoothstep(.5, .1, r) * smoothstep(.25, .75, m) * .32 * (1.0 - uNight * .45);
  gl_FragColor = vec4(mix(vec3(.93, .97, .98), vec3(.55, .62, .74), uNight), a); }`;

/** height(x,z) = altura do terreno. Devolve { group, material, update(t, night), distanceTo(x,z), routes }. */
export function buildWaterfall(THREE, { height, lowSpec = false } = {}) {
  const group = new THREE.Group(); group.name = 'cachoeira-nascente-mod316';
  const W = WATERFALL;
  const fall = buildRiverMesh(THREE, W.points, { width: W.halfWidth, level: 0, step: lowSpec ? .9 : .55, flow: 3.4, white: .62, alpha: .93, sample: (x, z) => height(x, z) + .14 });
  fall.mesh.name = 'cachoeira-agua'; fall.mesh.renderOrder = 3; group.add(fall.mesh);
  // espuma onde a cascata encontra o rio e ao pé do degrau
  fall.material.setRocks([{ x: W.base.x, z: W.base.z, r: 1.1, foam: 1 }, { x: W.ledge.x - .9, z: W.ledge.z, r: .7, foam: .9 }]);
  // névoa: ao pé do degrau e no encontro com o rio (billboards, sem escrever profundidade)
  const mistU = { uTime: { value: 0 }, uNight: { value: 0 } };
  const mists = [[W.ledge.x - 1.2, W.ledge.z, 1.1, 3.4, 1.7], [W.base.x + .4, W.base.z, .55, 4.2, 4.1]].map(([x, z, dy, s, seed]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s * .7), new THREE.ShaderMaterial({ uniforms: { ...mistU, uSeed: { value: seed } }, vertexShader: mistVert, fragmentShader: mistFrag, transparent: true, depthWrite: false }));
    m.position.set(x, height(x, z) + dy, z); m.renderOrder = 4; m.name = 'cachoeira-nevoa'; group.add(m); return m;
  });
  const update = (t, night = 0) => { fall.material.uniforms.uTime.value = t; fall.material.uniforms.uNight.value = night; mistU.uTime.value = t; mistU.uNight.value = night; };
  const distanceTo = (x, z) => { let best = 1e9; for (const p of W.points) best = Math.min(best, Math.hypot(x - p[0], z - p[1])); return best; };
  return { group, material: fall.material, mists, update, distanceTo, ribbon: fall.ribbon, route: { points: W.points, width: W.halfWidth * 2 + 1 } };
}
