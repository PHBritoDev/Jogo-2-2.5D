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
/** Mod 316 — ondulações de passos/aterrissagens: pool fixo de anéis (uniform), nenhum objeto criado por passo. */
export const WATER_MAX_RIPPLES = 6;
export const RIPPLE_LIFE = 2.2;

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
uniform float uTime, uFlow, uNight, uRadial, uAlpha, uFoamEnd, uWhite;
uniform vec2 uLakeC;
uniform vec3 uDeep, uShallow, uSky, uSkyNight, uSun, uFoam, uSkyZen, uSunCol;
uniform vec4 uRipples[${WATER_MAX_RIPPLES}];
uniform vec4 uRocks[${WATER_MAX_ROCKS}];
uniform int uRockCount;
uniform vec4 uFord; // F2 vau: início, fim (m ao longo do rio), transição, intensidade
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
  // Mod 316 — anéis de ondulação (passos na água rasa / aterrissagem): perturbam a normal e deixam um fio de espuma.
  float rippleFoam = 0.0;
  for (int i = 0; i < ${WATER_MAX_RIPPLES}; i++){ vec4 rp = uRipples[i]; float age = uTime - rp.z; if (rp.w <= 0.0 || age < 0.0 || age > ${RIPPLE_LIFE.toFixed(2)}) continue;
    vec2 dv = vWorld.xz - rp.xy; float d = length(dv) + 1e-4, rad = .25 + age * 1.15, fade = (1.0 - age / ${RIPPLE_LIFE.toFixed(2)}) * rp.w;
    float band = exp(-pow((d - rad) * 4.5, 2.0)) * fade, band2 = exp(-pow((d - rad * .62) * 6.0, 2.0)) * fade * .55;
    N.xz += dv / d * (sin((d - rad) * 22.0) * band + sin((d - rad * .62) * 26.0) * band2) * .55; rippleFoam = max(rippleFoam, band * .45); }
  N = normalize(N);
  vec3 V = normalize(cameraPosition - vWorld);
  float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 4.0) * .5 + .04;
  vec3 body = mix(uDeep, uShallow, smoothstep(.15, .95, across) * .8 + (n0 - .5) * .25);
  // Renascimento F2 — vau: lâmina rasa sobre cascalho (cor de areia molhada, mais transparente, corredeira).
  float ford = uRadial > .5 ? 0.0 : uFord.w * smoothstep(uFord.x - uFord.z, uFord.x, vUv.x) * (1.0 - smoothstep(uFord.y, uFord.y + uFord.z, vUv.x));
  body = mix(body, vec3(.27, .33, .24) + (n0 - .5) * .1, ford * .62);
  // Mod 316 — reflexo do céu da HORA atual: horizonte perto da incidência rasante, zênite quando se olha de cima.
  vec3 R = reflect(-V, N); vec3 skyRef = mix(uSky, uSkyZen, smoothstep(.05, .6, R.y));
  vec3 sky = mix(mix(skyRef, uDeep, .22), uSkyNight, uNight * .5);
  // Reflexo aproximado da mata (lago cercado de árvores): verde-escuro na faixa da margem, recortado por ruído
  // que imita troncos/copas refletidos; sem render target.
  if (uRadial > .5) { float trunks = .55 + .45 * sin(atan(vWorld.z - uLakeC.y, vWorld.x - uLakeC.x) * 23.0 + n0 * 3.0); sky = mix(sky, vec3(.05, .11, .07) * (1.0 - uNight * .5), smoothstep(.35, .95, across) * (.45 + .4 * trunks)); }
  vec3 col = mix(body, sky, fres);
  vec3 L = normalize(uSun); float spec = pow(max(dot(reflect(-L, N), V), 0.0), 90.0) * (1.0 - uNight * .7);
  col += uSunCol * spec * 1.4;
  // Espuma: margens recortadas por ruído e riscos que descem com a correnteza.
  float streak = fbm(vec2(vUv.x * .9 - uTime * speed * 1.3, vUv.y * 5.0));
  float camDist = length(cameraPosition - vWorld), near = (1.0 - smoothstep(18.0, 70.0, camDist)); // longe: sem cintilar
  float foam = smoothstep(.8, .99, across + (streak - .5) * .3 * near);
  foam += smoothstep(.78, .93, streak) * .1 * (1.0 - across) * near;
  // Lago parado nao tem faixa de arrebentacao: preserve transparencia e reflexos suaves.
  // Rio mantem espuma de margem; lago recebe somente vestigios discretos de espuma.
  if (uRadial > .5) foam *= .06;
  // Foz: a espuma do rio some nos últimos metros, onde a fita entra no lago parado.
  if (uRadial < .5 && uFoamEnd > 0.0) foam *= 1.0 - smoothstep(uFoamEnd - 14.0, uFoamEnd - 2.0, vUv.x);
  for (int i = 0; i < ${WATER_MAX_ROCKS}; i++){ if (i >= uRockCount) break;
    vec4 r = uRocks[i]; float d = length(vWorld.xz - r.xy) - r.z;
    float ring = (1.0 - smoothstep(0.0, .9, d)) * (.55 + .45 * fbm(vWorld.xz * 2.0 - vec2(uTime * speed, 0.0)));
    foam = max(foam, ring * r.w); }
  foam = max(foam, rippleFoam);
  if (ford > 0.0) foam = max(foam, ford * smoothstep(.62, .9, fbm(vec2(vUv.x * 2.4 - uTime * speed * 2.2, vUv.y * 7.0 + n0))) * (.16 + .3 * near));
  // Mod 316 — água branca (cascata): riscos longos que descem com a correnteza + bolhas; uWhite = 0 no rio/lago.
  if (uWhite > 0.0) { float w = smoothstep(.38, .82, fbm(vec2(vUv.x * .55 - uTime * speed * 1.7, vUv.y * 3.2)) + (n0 - .5) * .35); foam = max(foam, uWhite * (.35 + .65 * w)); }
  col = mix(col, uFoam * (1.0 - uNight * .55), clamp(foam, 0.0, 1.0) * .85);
  float alpha = mix(uAlpha, .97, clamp(foam, 0.0, 1.0)) * (1.0 - smoothstep(.97, 1.0, across) * .6);
  // Margem rasa do lago mais transparente (o fundo aparece): a água deixa de parecer uma placa sobreposta.
  if (uRadial > .5) alpha *= mix(1.0, .55, smoothstep(.7, 1.0, across));
  // Mod 316 — rio raso nas margens: absorção menor, o leito aparece (água translúcida como na referência).
  else alpha *= mix(1.0, .72, smoothstep(.72, .97, across) * (1.0 - foam));
  alpha *= 1.0 - ford * .3 * (1.0 - clamp(foam, 0.0, 1.0));
  gl_FragColor = vec4(col, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

export function createFlowWaterMaterial(THREE, o = {}) {
  const rocks = []; for (let i = 0; i < WATER_MAX_ROCKS; i++) rocks.push(new THREE.Vector4(0, 0, 0, 0));
  const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
    uTime: { value: 0 }, uFoamEnd: { value: 0 }, uLakeC: { value: new THREE.Vector2() }, uFlow: { value: o.flow ?? 1 }, uNight: { value: 0 }, uRadial: { value: o.radial ? 1 : 0 }, uAlpha: { value: o.alpha ?? .86 },
    uDeep: { value: new THREE.Color(o.deep ?? 0x0d4f55) }, uShallow: { value: new THREE.Color(o.shallow ?? 0x37a9a2) },
    uSky: { value: new THREE.Color(o.sky ?? 0xbfdbe0) }, uSkyNight: { value: new THREE.Color(0x24344e) },
    uSun: { value: new THREE.Vector3(.4, .8, .3) }, uFoam: { value: new THREE.Color(0xeef6f2) },
    uRocks: { value: rocks }, uRockCount: { value: 0 }, uFord: { value: new THREE.Vector4(0, 0, 1, 0) },
    uSkyZen: { value: new THREE.Color(o.skyZen ?? 0x6aa5d3) }, uWhite: { value: o.white ?? 0 }, uSunCol: { value: new THREE.Color(1, .96, .86) },
    uRipples: { value: Array.from({ length: WATER_MAX_RIPPLES }, () => new THREE.Vector4(0, 0, -99, 0)) }
  }]);
  const m = new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, fog: true, side: THREE.DoubleSide });
  m.name = o.radial ? 'eldoria-lake-water' : 'eldoria-river-water';
  /** Pool circular: reaproveita o anel mais antigo (sem alocação). */
  let rippleNext = 0;
  m.addRipple = (x, z, time, amp = 1) => { const r = uniforms.uRipples.value[rippleNext]; r.set(x, z, time, amp); rippleNext = (rippleNext + 1) % WATER_MAX_RIPPLES; };
  m.setFord = (s0, s1, fade = 3, k = 1) => uniforms.uFord.value.set(s0, s1, fade, k);
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
  const material = createFlowWaterMaterial(THREE, { flow: o.flow ?? 1.15, white: o.white ?? 0, alpha: o.alpha });
  material.uniforms.uFoamEnd.value = r.length;
  const mesh = new THREE.Mesh(g, material); mesh.name = 'eldoria-river-mod291'; mesh.renderOrder = 2; mesh.frustumCulled = true;
  return { mesh, material, ribbon: r };
}

/** Lago: disco com UV.y = raio normalizado (0 centro → 1 margem). */
export function buildLakeMesh(THREE, { x, z, r, level }) {
  const g = new THREE.CircleGeometry(r, 64, 0, Math.PI * 2); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) { const d = Math.hypot(p.getX(i), p.getZ(i)) / r; uv.setXY(i, 0, d); }
  const material = createFlowWaterMaterial(THREE, { radial: true, flow: .28, deep: 0x0b4a52, shallow: 0x3fb4ad, alpha: .9 });
  material.uniforms.uLakeC.value.set(x, z);
  const mesh = new THREE.Mesh(g, material); mesh.position.set(x, level, z); mesh.name = 'eldoria-lake-mod291'; mesh.renderOrder = 2;
  return { mesh, material };
}
