/**
 * Mod 316 — silhuetas de serras distantes (perspectiva atmosférica) para a composição do horizonte do Ato I.
 *
 * O relevo jogável (colisão, trilhas, missões) não muda. Atrás dele, três anéis de cristas com perfis distintos
 * (ruído "ridged": picos agudos e selas, não ondas regulares) a 470/550/630 m, cada um mais claro e mais azulado com a
 * distância — como camadas de montanha numa manhã enevoada. As cores vêm da paleta da hora (horizonte/névoa), então
 * as cristas douram no fim de tarde e viram recortes escuros contra o céu à noite.
 *
 * Custo: 1 malha (≈ 1,1 mil triângulos), 1 draw call, sem textura, sem neblina por fragmento (cor já atmosférica),
 * desenhada logo após o céu (renderOrder −9) e sem escrever profundidade: o terreno real sempre fica na frente.
 */
const LAYERS = [
  { R: 470, base: 26, amp: 46, freq: 5.0, seed: 3.1, k: .58 },
  { R: 550, base: 34, amp: 62, freq: 3.4, seed: 7.7, k: .38 },
  { R: 630, base: 44, amp: 80, freq: 2.3, seed: 12.9, k: .2 },
];
const fract = x => x - Math.floor(x);
const h1 = n => fract(Math.sin(n * 127.1) * 43758.5453);
function vnoise(x, seed) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return h1(i + seed * 57) * (1 - u) + h1(i + 1 + seed * 57) * u; }
/** Perfil de crista periódico em θ (fecha o anel sem costura): 0..1. */
export function ridgeProfile(theta, freq, seed) {
  let v = 0, a = .55, f = freq;
  for (let o = 0; o < 4; o++) {
    // amostra periódica: projeta θ num círculo de raio f para não haver emenda em 2π
    const n = vnoise(Math.cos(theta) * f + seed * 3 + o * 11, seed + o) * .5 + vnoise(Math.sin(theta) * f + seed * 5 + o * 17, seed + o + 9) * .5;
    v += a * (1 - Math.abs(n * 2 - 1)); a *= .5; f *= 2.1;
  }
  return Math.pow(v / .97, 1.6);
}

export function buildFarRidges(THREE, { segments = 220, lowSpec = false } = {}) {
  const seg = lowSpec ? Math.round(segments * .6) : segments, pos = [], lay = [], top = [], idx = [];
  LAYERS.forEach((Ly, li) => {
    const start = pos.length / 3;
    for (let s = 0; s <= seg; s++) {
      const th = s / seg * Math.PI * 2, h = Ly.base + Ly.amp * ridgeProfile(th, Ly.freq, Ly.seed), x = Math.sin(th) * Ly.R, z = Math.cos(th) * Ly.R;
      pos.push(x, -40, z, x, h, z); lay.push(li, li); top.push(0, 1);
    }
    for (let s = 0; s < seg; s++) { const a = start + s * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aLayer', new THREE.Float32BufferAttribute(lay, 1)); g.setAttribute('aTop', new THREE.Float32BufferAttribute(top, 1)); g.setIndex(idx);
  const uniforms = { uHaze: { value: new THREE.Color(0xc7d3cb) }, uSky: { value: new THREE.Color(0xd6e3d8) }, uShade: { value: new THREE.Color(0x46596a) }, uRim: { value: new THREE.Color(0xffe1b0) }, uRimK: { value: .15 }, uK: { value: new THREE.Vector3(LAYERS[0].k, LAYERS[1].k, LAYERS[2].k) } };
  const mat = new THREE.ShaderMaterial({
    uniforms, depthWrite: false, fog: false, side: THREE.DoubleSide,
    vertexShader: 'attribute float aLayer; attribute float aTop; varying float vL; varying float vT; void main(){ vL = aLayer; vT = aTop; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 uHaze, uSky, uShade, uRim; uniform float uRimK; uniform vec3 uK; varying float vL; varying float vT;
      void main(){ float k = vL < .5 ? uK.x : vL < 1.5 ? uK.y : uK.z;
        vec3 body = mix(mix(uSky, uHaze, .55), uShade, k);                 // mais longe = mais céu (perspectiva atmosférica)
        body = mix(uHaze, body, smoothstep(.0, .55, vT));                   // pé da serra afunda na bruma
        body += uRim * uRimK * smoothstep(.82, 1.0, vT) * (1.0 - k * .6);   // borda iluminada pelo sol baixo
        gl_FragColor = vec4(body, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(g, mat); mesh.name = 'serras-distantes-mod316'; mesh.renderOrder = -9; mesh.frustumCulled = false;
  /** Atualiza cores da hora (cores THREE.Color lineares) e acompanha a câmera. */
  function update(camera, { haze, sky, shade, sun, rimK }) {
    mesh.position.set(camera.position.x, 0, camera.position.z);
    uniforms.uHaze.value.copy(haze); uniforms.uSky.value.copy(sky); uniforms.uShade.value.copy(shade); uniforms.uRim.value.copy(sun); uniforms.uRimK.value = rimK;
  }
  return { mesh, update, layers: LAYERS };
}
