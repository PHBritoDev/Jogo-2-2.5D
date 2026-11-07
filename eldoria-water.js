/**
 * MOD 291 — Água de Eldória: rio com correnteza real e lago integrado (substitui o disco azul parado).
 *
 * Rio: malha em fita ao longo de uma Catmull-Rom; a UV.x é a distância percorrida (m) e a UV.y vai de −1 a 1
 * entre as margens. O fragment shader rola duas camadas de ruído ao longo da tangente (flow alinhado à curva),
 * mais rápido no centro do que na margem, gera normais de ondulação, Fresnel com a cor do céu, brilho do sol,
 * cor por profundidade (turquesa raso → verde-azulado fundo), espuma nas margens e anéis de espuma nas pedras.
 * Lago: mesmo shader em coordenadas radiais, com correnteza fraca vinda da foz do rio.
 * Custo: 1 draw call por corpo d'água, sem render target, sem reflexo em tempo real (orçamento mobile).
 */
export const WATER_MAX_ROCKS = 10;

const VERT = /* glsl */`
#include <common>
#include <fog_pars_vertex>
varying vec2 vUv; varying vec3 vWorld;
void main(){
  vUv = uv; vec4 wp = modelMatrix * vec4(position, 1.0); vWorld = wp.xyz;
  vec4 mvPosition = viewMatrix * wp; gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const FRAG = /* glsl */`
#include <common>
#include <fog_pars_fragment>
uniform float uTime, uFlow, uNight, uRadial, uAlpha;
uniform vec3 uDeep, uShallow, uSky, uSkyNight, uSun, uFoam;
uniform vec4 uRocks[${WATER_MAX_ROCKS}];
uniform int uRockCount;
varying vec2 vUv; varying vec3 vWorld;
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p){ float s = 0.0, a = .5; for (int i = 0; i < 4; i++){ s += vn(p) * a; p = p * 2.03 + 11.7; a *= .5; } return s; }
void main(){
  float across = uRadial > .5 ? clamp(vUv.y, 0.0, 1.0) : abs(vUv.y);            // 0 centro → 1 margem
  float speed = uFlow * (1.0 - across * across * .65);                            // mais rápido no meio
  vec2 q = uRadial > .5 ? vWorld.xz * .32 : vec2(vUv.x * .42, vUv.y * 1.6);
  vec2 dir = uRadial > .5 ? normalize(vec2(.6, .8)) : vec2(1.0, 0.0);
  vec2 a = q * 1.0 - dir * uTime * speed * .42, b = q * 2.3 - dir * uTime * speed * .9 + 7.1;
  float e = .06;
  float n0 = fbm(a) * .65 + fbm(b) * .35;
  float nx = fbm(a + vec2(e, 0)) * .65 + fbm(b + vec2(e, 0)) * .35;
  float nz = fbm(a + vec2(0, e)) * .65 + fbm(b + vec2(0, e)) * .35;
  vec3 N = normalize(vec3((n0 - nx) * 3.2 * (.35 + .65 * (1.0 - smoothstep(15.0, 80.0, length(cameraPosition - vWorld)))), 1.0, (n0 - nz) * 3.2 * (.35 + .65 * (1.0 - smoothstep(15.0, 80.0, length(cameraPosition - vWorld))))));
  vec3 V = normalize(cameraPosition - vWorld);
  float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 4.0) * .5 + .04;
  vec3 body = mix(uDeep, uShallow, smoothstep(.15, .95, across) * .8 + (n0 - .5) * .25);
  vec3 sky = mix(mix(uSky, uDeep, .3), uSkyNight, uNight);
  vec3 col = mix(body, sky, fres);
  vec3 L = normalize(uSun); float spec = pow(max(dot(reflect(-L, N), V), 0.0), 90.0) * (1.0 - uNight * .7);
  col += vec3(1.0, .96, .86) * spec * 1.4;
  // Espuma: margens recortadas por ruído e riscos que descem com a correnteza.
  float streak = fbm(vec2(vUv.x * .9 - uTime * speed * 1.3, vUv.y * 5.0));
  float camDist = length(cameraPosition - vWorld), near = (1.0 - smoothstep(18.0, 70.0, camDist)); // longe: sem cintilar
  float foam = smoothstep(.8, .99, across + (streak - .5) * .3 * near);
  foam += smoothstep(.78, .93, streak) * .1 * (1.0 - across) * near;
  // Lago parado nao tem faixa de arrebentacao: preserve transparencia e reflexos suaves.
  // Rio mantem espuma de margem; lago recebe somente vestigios discretos de espuma.
  if (uRadial > .5) foam *= .06;
  for (int i = 0; i < ${WATER_MAX_ROCKS}; i++){ if (i >= uRockCount) break;
    vec4 r = uRocks[i]; float d = length(vWorld.xz - r.xy) - r.z;
    float ring = (1.0 - smoothstep(0.0, .9, d)) * (.55 + .45 * fbm(vWorld.xz * 2.0 - vec2(uTime * speed, 0.0)));
    foam = max(foam, ring * r.w); }
  col = mix(col, uFoam * (1.0 - uNight * .55), clamp(foam, 0.0, 1.0) * .85);
  float alpha = mix(uAlpha, .97, clamp(foam, 0.0, 1.0)) * (1.0 - smoothstep(.97, 1.0, across) * .6);
  gl_FragColor = vec4(col, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

export function createFlowWaterMaterial(THREE, o = {}) {
  const rocks = []; for (let i = 0; i < WATER_MAX_ROCKS; i++) rocks.push(new THREE.Vector4(0, 0, 0, 0));
  const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
    uTime: { value: 0 }, uFlow: { value: o.flow ?? 1 }, uNight: { value: 0 }, uRadial: { value: o.radial ? 1 : 0 }, uAlpha: { value: o.alpha ?? .86 },
    uDeep: { value: new THREE.Color(o.deep ?? 0x0d4f55) }, uShallow: { value: new THREE.Color(o.shallow ?? 0x37a9a2) },
    uSky: { value: new THREE.Color(o.sky ?? 0xbfdbe0) }, uSkyNight: { value: new THREE.Color(0x24344e) },
    uSun: { value: new THREE.Vector3(.4, .8, .3) }, uFoam: { value: new THREE.Color(0xeef6f2) },
    uRocks: { value: rocks }, uRockCount: { value: 0 }
  }]);
  const m = new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, fog: true, side: THREE.DoubleSide });
  m.name = o.radial ? 'eldoria-lake-water' : 'eldoria-river-water';
  m.setRocks = list => { const n = Math.min(WATER_MAX_ROCKS, list.length); for (let i = 0; i < n; i++) rocks[i].set(list[i].x, list[i].z, list[i].r, list[i].foam ?? 1); uniforms.uRockCount.value = n; };
  return m;
}

/** Geometria pura da fita do rio (testável): posições, UVs (u = metros ao longo, v = −1..1) e índices. */
export function riverRibbon(points, { width = 3.4, level = -.5, step = 1.2, sample } = {}) {
  // Catmull-Rom centrípeta simplificada em 2D, amostrada por comprimento.
  const P = points.map(p => ({ x: p[0], z: p[1] })), dense = [];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    const segLen = Math.hypot(p2.x - p1.x, p2.z - p1.z), n = Math.max(2, Math.ceil(segLen / step));
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => .5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      dense.push({ x: f(p0.x, p1.x, p2.x, p3.x), z: f(p0.z, p1.z, p2.z, p3.z) });
    }
  }
  dense.push({ ...P[P.length - 1] });
  const pos = [], uv = [], idx = []; let u = 0;
  for (let i = 0; i < dense.length; i++) {
    const a = dense[Math.max(0, i - 1)], b = dense[Math.min(dense.length - 1, i + 1)];
    let tx = b.x - a.x, tz = b.z - a.z; const L = Math.hypot(tx, tz) || 1; tx /= L; tz /= L;
    if (i > 0) u += Math.hypot(dense[i].x - dense[i - 1].x, dense[i].z - dense[i - 1].z);
    const nx = -tz, nz = tx, w = width * (i === dense.length - 1 ? 1.25 : 1);
    for (const s of [-1, 1]) { const x = dense[i].x + nx * w * s, z = dense[i].z + nz * w * s; pos.push(x, sample ? sample(x, z, level) : level, z); uv.push(u, s); }
    if (i < dense.length - 1) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
  }
  return { positions: new Float32Array(pos), uvs: new Float32Array(uv), indices: idx, length: u, centerline: dense };
}

export function buildRiverMesh(THREE, points, o = {}) {
  const r = riverRibbon(points, o), g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(r.positions, 3)); g.setAttribute('uv', new THREE.BufferAttribute(r.uvs, 2)); g.setIndex(r.indices);
  g.computeVertexNormals(); g.computeBoundingSphere();
  const material = createFlowWaterMaterial(THREE, { flow: o.flow ?? 1.15 });
  const mesh = new THREE.Mesh(g, material); mesh.name = 'eldoria-river-mod291'; mesh.renderOrder = 2; mesh.frustumCulled = true;
  return { mesh, material, ribbon: r };
}

/** Lago: disco com UV.y = raio normalizado (0 centro → 1 margem). */
export function buildLakeMesh(THREE, { x, z, r, level }) {
  const g = new THREE.CircleGeometry(r, 64, 0, Math.PI * 2); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) { const d = Math.hypot(p.getX(i), p.getZ(i)) / r; uv.setXY(i, 0, d); }
  const material = createFlowWaterMaterial(THREE, { radial: true, flow: .28, deep: 0x0b4a52, shallow: 0x3fb4ad, alpha: .9 });
  const mesh = new THREE.Mesh(g, material); mesh.position.set(x, level, z); mesh.name = 'eldoria-lake-mod291'; mesh.renderOrder = 2;
  return { mesh, material };
}
