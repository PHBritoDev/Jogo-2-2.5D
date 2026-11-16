/**
 * Mod 323 — atmosfera do céu para o mundo aberto (Eldória, jornada, Cinzária e o vulcão por fora):
 *  • brilho do sol baixo: halo quente em volta do sol e faixa laranja/rosa no horizonte do lado do sol no amanhecer e
 *    no fim de tarde (o lado oposto continua azul-lilás); some ao meio-dia e à noite, sem pintar a tela de amarelo;
 *  • aurora de verdade NO CÉU: cortinas violeta/rosa/azuis suspensas entre ~14° e ~60° de elevação, numa faixa de
 *    azimute limitada (não é um anel em volta do mapa), com raios verticais que ondulam devagar; a base da cortina fica
 *    sempre acima das serras e a intensidade acompanha a noite e o céu aberto (nuvens e chuva apagam).
 * Uma única esfera que acompanha a câmera (1 draw), sem luzes nem partículas. O céu base (cúpula em gradiente), as
 * nuvens do clima, a lua e as estrelas continuam nos seus módulos; isto só soma por cima deles.
 */
const VERT = `varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.); gl_Position = vec4(p.xy, p.w * .99995, p.w); }`;
const FRAG = `uniform vec3 uSun, uAurDir; uniform float uGold, uNight, uAur, uT, uClear;
varying vec3 vDir;
float h1(float p){ return fract(sin(p * 127.1) * 43758.5453); }
float n1(float x){ float i = floor(x), f = fract(x); f = f * f * (3. - 2. * f); return mix(h1(i), h1(i + 1.), f); }
void main(){
  vec3 d = normalize(vDir);
  vec3 col = vec3(0.); float a = 0.;
  // ---- sol baixo: halo e faixa quente no horizonte do lado do sol
  if (uGold > .001) {
    float cs = max(0., dot(d, uSun));
    vec2 hz = normalize(d.xz + 1e-4), sz = normalize(uSun.xz + 1e-4);
    float side = max(0., dot(hz, sz));
    float band = exp(-max(d.y, -.05) * 7.) * pow(side, 2.2);
    float halo = pow(cs, 24.) * .9 + pow(cs, 5.) * .28;
    vec3 warm = mix(vec3(1., .46, .3), vec3(1., .72, .38), smoothstep(.0, .25, d.y));
    vec3 g = warm * (band * .55 + halo) * uGold + vec3(.62, .42, .7) * exp(-max(d.y, 0.) * 5.) * (1. - side) * .16 * uGold;
    col += g; a += 0.;
  }
  // ---- aurora: cortinas na faixa de azimute uAurDir (±~65°), base acima das serras
  if (uAur > .001 && d.y > .1) {
    vec2 hz = normalize(d.xz), ad = normalize(uAurDir.xz);
    float rel = atan(hz.x * ad.y - hz.y * ad.x, dot(hz, ad));      // azimute relativo ao centro da aurora
    float win = smoothstep(1.2, .45, abs(rel));
    float el = asin(clamp(d.y, 0., 1.));
    float az = rel * 1.6;
    float base = .27 + .07 * sin(az * 2.1 + uT * .035) + .05 * n1(az * 3. + uT * .02);   // pé da cortina ondulando
    float fold = sin(az * 4.3 + 1.7 * sin(az * 1.3 + uT * .05) + uT * .03);            // dobras da cortina
    float rays = n1(az * 46. + fold * 4. + uT * .06) * .6 + n1(az * 97. - uT * .09) * .4;
    rays = .35 + .65 * pow(rays, 1.6);
    float lowEdge = smoothstep(base - .015, base + .035, el);
    float up = exp(-(el - base) * 3.2);
    float body = lowEdge * up * (.55 + .45 * (fold * .5 + .5));
    // segunda cortina mais alta e fraca
    float base2 = base + .16 + .04 * sin(az * 1.7 - uT * .03);
    float body2 = smoothstep(base2 - .02, base2 + .05, el) * exp(-(el - base2) * 4.) * .45 * (n1(az * 31. + uT * .05) * .7 + .3);
    float k = (body * rays + body2) * win * uAur;
    vec3 c = mix(vec3(.95, .38, .82), vec3(.58, .36, 1.), smoothstep(base, base + .22, el));   // rosa no pé, violeta acima
    c = mix(c, vec3(.36, .58, 1.), smoothstep(base + .22, base + .5, el) * .6);               // azul no alto
    col += c * k * .85;
  }
  gl_FragColor = vec4(col, a);
}`;

/** Fator de entardecer/amanhecer 0..1 pela elevação do sol (graus). */
export function goldenFactor(elev) { return elev < 16 && elev > -9 ? Math.min(1, (16 - elev) / 10) * Math.min(1, (elev + 9) / 6) : 0; }
/** Intensidade da aurora pela noite (0..1) e céu aberto (0..1): entra devagar depois do crepúsculo. */
export function auroraLevel(night, clear) { const n = Math.max(0, Math.min(1, (night - .55) / .35)); return n * n * (3 - 2 * n) * Math.max(0, Math.min(1, clear)); }

export function createSkyAtmosphere(THREE, scene, { lowSpec = false } = {}) {
  const uniforms = { uSun: { value: new THREE.Vector3(0, 1, 0) }, uAurDir: { value: new THREE.Vector3(-.82, 0, .57).normalize() }, uGold: { value: 0 }, uNight: { value: 0 }, uAur: { value: 0 }, uT: { value: 0 }, uClear: { value: 1 } };
  const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, depthTest: true, side: THREE.BackSide, fog: false, toneMapped: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, lowSpec ? 32 : 48, lowSpec ? 16 : 24), mat);
  mesh.name = 'ceu-atmosfera-mod323'; mesh.frustumCulled = false; mesh.renderOrder = -8; mesh.scale.setScalar(600); scene.add(mesh);
  return {
    mesh,
    /** sunDir: direção do sol (normalizada); elev: graus; night 0..1; clear: céu aberto 0..1 (1 − nuvens/chuva); radius: raio do céu. */
    update(dt, { camera, sunDir, elev = 30, night = 0, clear = 1, visible = true, radius = 600 }) {
      mesh.visible = visible; if (!visible) return;
      mesh.position.copy(camera.position); mesh.scale.setScalar(radius);
      uniforms.uT.value += dt; if (sunDir) uniforms.uSun.value.copy(sunDir);
      uniforms.uGold.value = goldenFactor(elev) * (.4 + .6 * clear); uniforms.uNight.value = night; uniforms.uAur.value = auroraLevel(night, clear); uniforms.uClear.value = clear;
    },
    get aurora() { return uniforms.uAur.value; }
  };
}
