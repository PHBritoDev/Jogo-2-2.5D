import { auroraUniforms } from './aurora-luz3d.js';
/**
 * Mod 323 — atmosfera do céu para o mundo aberto (Eldória, jornada, Cinzária e o vulcão por fora):
 *  • brilho do sol baixo: halo quente em volta do sol e faixa laranja/rosa no horizonte do lado do sol no amanhecer e
 *    no fim de tarde (o lado oposto continua azul-lilás); some ao meio-dia e à noite, sem pintar a tela de amarelo;
 *  • (Mod 326: + coroa zenital — cortinas cruzando a abóbada acima do herói)
 *  • aurora de verdade NO CÉU: cortinas violeta/rosa/azuis suspensas entre ~14° e ~60° de elevação, numa faixa de
 *    azimute limitada (não é um anel em volta do mapa), com raios verticais que ondulam devagar; a base da cortina fica
 *    sempre acima das serras e a intensidade acompanha a noite e o céu aberto (nuvens e chuva apagam).
 * Uma única esfera que acompanha a câmera (1 draw), sem luzes nem partículas. O céu base (cúpula em gradiente), as
 * nuvens do clima, a lua e as estrelas continuam nos seus módulos; isto só soma por cima deles.
 */
const VERT = `varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.); gl_Position = vec4(p.xy, p.w * .99995, p.w); }`;
const FRAG = `uniform vec3 uSun, uAurDir; uniform float uGold, uNight, uAur, uT, uClear, uAurLow;
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
    // A7: faixa mais larga no horizonte do sol (âmbar) e prateleira rosa/malva do lado oposto,
    // baixa — não pinta o zênite. O disco do sol continua sendo o sunDisk do mundo (sem segundo disco).
    float band = exp(-max(d.y, -.04) * 5.2) * pow(side, 1.55);
    float halo = pow(cs, 16.) * .7 + pow(cs, 4.) * .2;
    vec3 warm = mix(vec3(1., .32, .14), vec3(1., .58, .28), smoothstep(0., .16, d.y));
    vec3 g = warm * (band * .66 + halo) * uGold;
    g += vec3(.74, .34, .56) * exp(-max(d.y, 0.) * 4.) * (1. - side) * .24 * uGold * (1. - smoothstep(.02, .34, d.y));
    col += g; a += 0.;
  }
  // ---- aurora (Mod 325): DOIS arcos em oval inclinado que atravessam o céu (presentes em quase todos os rumos, com
  //      intensidade variando por direção), cortinas altas com dobras que correm de lado, raios finos e respiração lenta.
  if (uAur > .001 && d.y > .06) {
    vec2 hz = normalize(d.xz), ad = normalize(uAurDir.xz);
    float az = atan(hz.x * ad.y - hz.y * ad.x, dot(hz, ad));
    float el = asin(clamp(d.y, 0., 1.));
    for (int i = 0; i < 2; i++) {
      float fi = float(i), ph = fi * 2.4 + uT * .004, cen = fi * 3.1;
      float base = .3 + .16 * cos(az - ph) + .05 * sin(az * 2.3 + uT * .03 + fi) + .04 * n1(az * 3. + fi * 7. + uT * .02);
      float win = .3 + .7 * smoothstep(-.2, .8, cos(az - cen));                              // mais forte de um lado, nunca some de todo
      float fold = sin(az * (4.1 + fi) + 1.7 * sin(az * 1.3 + uT * .05 + fi) + uT * (.035 + fi * .01));
      float rays;
      if (uAurLow > .5) rays = n1(az * (44. + fi * 9.) + fold * 4. + uT * .06);
      else rays = n1(az * (44. + fi * 9.) + fold * 4. + uT * .06) * .6 + n1(az * 97. - uT * .09 + fi * 3.) * .4;
      rays = .3 + .7 * pow(rays, 1.5);
      float lowEdge = smoothstep(base - .02, base + .04, el);
      float tall = .9 + .6 * n1(az * 2. + fi * 5. + uT * .01);                                   // cortinas de alturas diferentes
      float body = lowEdge * exp(-(el - base) * 2.6 / tall) * (.55 + .45 * (fold * .5 + .5));
      float breath = .78 + .22 * sin(uT * .21 + fi * 2. + az * .7);
      float k = body * rays * win * breath * uAur * (fi > .5 ? .75 : 1.);
      vec3 c = mix(vec3(.95, .36, .82), vec3(.56, .34, 1.), smoothstep(base, base + .25, el));
      c = mix(c, vec3(.34, .56, 1.), smoothstep(base + .25, base + .6, el) * .6);
      col += c * k * .8;
    }
    // Mod 326 — coroa ZENITAL: cortinas que cruzam a abóbada bem acima do herói (plano do céu projetado, perspectiva
    // converge no zênite), base mais viva e raios subindo; dobras em várias escalas que correm devagar.
    if (d.y > .22) {
      vec2 q = d.xz / d.y, r = vec2(dot(q, ad), dot(q, vec2(-ad.y, ad.x)));
      for (int j = 0; j < 2; j++) {
        float fj = float(j), cx = -.15 + fj * .55 + .12 * sin(uT * .013 + fj * 2.);
        float line = cx + .32 * sin(r.x * 1.15 + uT * .045 + fj * 1.7) + .12 * sin(r.x * 3.3 - uT * .07 + fj) + .05 * n1(r.x * 6. + uT * .05 + fj * 9.);
        float dd = r.y - line;                                   // > 0: "acima" da base da cortina
        float body = smoothstep(-.035, .02, dd) * exp(-max(dd, 0.) * (4.5 + 2. * fj));
        float rays;
        if (uAurLow > .5) rays = n1(r.x * (26. + fj * 7.) + dd * 2. + uT * .07);
        else rays = n1(r.x * (26. + fj * 7.) + dd * 2. + uT * .07) * .6 + n1(r.x * 61. - uT * .11 + fj * 4.) * .4;
        rays = .35 + .65 * pow(rays, 1.4);
        float breath = .75 + .25 * sin(uT * .17 + r.x * .9 + fj * 2.3);
        float kz = body * rays * breath * uAur * smoothstep(.22, .5, d.y) * (fj > .5 ? .7 : 1.);
        vec3 cz = mix(vec3(.98, .4, .85), vec3(.55, .36, 1.), smoothstep(0., .25, dd)); cz = mix(cz, vec3(.32, .55, 1.), smoothstep(.25, .6, dd) * .6);
        col += cz * kz * .7;
      }
    }
  }
  gl_FragColor = vec4(col, a);
}`;

/** Fator de entardecer/amanhecer 0..1 pela elevação do sol (graus). */
export function goldenFactor(elev) { return elev < 16 && elev > -9 ? Math.min(1, (16 - elev) / 10) * Math.min(1, (elev + 9) / 6) : 0; }
/** Intensidade da aurora pela noite (0..1) e céu aberto (0..1): entra devagar depois do crepúsculo. */
export function auroraLevel(night, clear) { const n = Math.max(0, Math.min(1, (night - .55) / .35)); return n * n * (3 - 2 * n) * Math.max(0, Math.min(1, clear)); }

export function createSkyAtmosphere(THREE, scene, { lowSpec = false } = {}) {
  const uniforms = { uAurLow: auroraUniforms(THREE).uAurLow, uSun: { value: new THREE.Vector3(0, 1, 0) }, uAurDir: { value: new THREE.Vector3(-.82, 0, .57).normalize() }, uGold: { value: 0 }, uNight: { value: 0 }, uAur: { value: 0 }, uT: { value: 0 }, uClear: { value: 1 } };
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
