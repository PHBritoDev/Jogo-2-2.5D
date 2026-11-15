/**
 * Caverna de Eldória — C3: material, espeleotemas e água (sem Three no topo: os construtores recebem THREE).
 *
 * Antes, toda a rocha usava o mesmo `triplanarRock` com faceta plana e cor teal quase uniforme. A rocha parecia
 * "plástico escuro". Agora um único shader de rocha (paredes, abóbada, piso, ponte e pilares, 1 programa) junta:
 *  - **Estratos inclinados:** a mesma função do volume 3D da C2. A cor alterna calcário quente e frio, com juntas
 *    escuras finas, e acompanha as bancadas da geometria.
 *  - **Escorrimentos de calcita:** veios verticais claros nas paredes íngremes. A água que escorreu desenha a rocha.
 *  - **Umidade:** perto das poças e sob as frestas a rocha fica mais escura e brilhante (roughness baixa).
 *  - **Musgo:** só onde a luz das frestas chega e a face olha para cima.
 *  - **Relevo:** bump por derivadas de campos suaves (estratos, escorrimentos, ruído grande), sem textura extra nem
 *    tangentes. A textura não entra: em resolução reduzida (celular) a derivada por bloco 2×2 virava mosaico.
 *  - **Gradiente pintado de grande escala:** topo mais quente, base mais fria, para dar profundidade estilizada.
 * A oclusão nas reentrâncias vem da C2 (amostrada no SDF, no Worker) e entra pela cor de vértice. Não custa nada no shader.
 */
import { CAVE, caveFloor, caveWalk, hash2 } from './ascension-layout.js';

/** Frestas do teto (x, z, inclinação, intensidade, largura). Usadas pelos feixes, pela umidade e pelo musgo. */
export const CAVE_SHAFTS = Object.freeze([
  [-7, -52, .12, .42, 1.2], [9, -66, -.08, .3, .9], [-45, -60, .1, .5, 1], [-6, -128, -.06, .22, .8], [-60, -104, .07, .55, 1.4],
]);

const GLSL_NOISE = `
float cvH3(vec3 p){ p = fract(p * .3183099 + .1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float cvN3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(cvH3(i), cvH3(i + vec3(1,0,0)), f.x), mix(cvH3(i + vec3(0,1,0)), cvH3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(cvH3(i + vec3(0,0,1)), cvH3(i + vec3(1,0,1)), f.x), mix(cvH3(i + vec3(0,1,1)), cvH3(i + vec3(1,1,1)), f.x), f.y), f.z); }`;

/**
 * Material de rocha da caverna. `floor: true` muda só uniformes (mesmo programa).
 * origin: posição do grupo da caverna no mundo (o ruído usa coordenadas locais, sem perder precisão em x = −3600).
 */
export function caveRockMaterial(THREE, { origin = { x: 0, z: 0 }, floor = false, roughness = .9, scale = .085, tint = 1.25 } = {}) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, flatShading: false, roughness, metalness: 0 });
  const pools = CAVE.pools.map(p => new THREE.Vector4(p.x, caveFloor(p.x, p.z) - .32, p.z, p.r));
  while (pools.length < 6) pools.push(new THREE.Vector4(0, -999, 0, 0));
  const shafts = CAVE_SHAFTS.map(([x, z, , I, w]) => new THREE.Vector4(x, z, 3.2 * w + 1.5, I));
  while (shafts.length < 6) shafts.push(new THREE.Vector4(0, 0, 0, 0));
  const U = { uOrigin: { value: new THREE.Vector3(origin.x, 0, origin.z) }, uPools: { value: pools.slice(0, 6) }, uShafts: { value: shafts.slice(0, 6) }, uFloor: { value: floor ? 1 : 0 } };
  mat.userData.caveUniforms = U;
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vCvW; varying vec3 vCvN;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvCvW = (modelMatrix * vec4(transformed, 1.0)).xyz; vCvN = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vCvW; varying vec3 vCvN; uniform vec3 uOrigin; uniform vec4 uPools[6]; uniform vec4 uShafts[6]; uniform float uFloor;
      float cvWet = 0.0, cvHgt = 0.0; ${GLSL_NOISE}`)
      .replace('#include <map_fragment>', `
        vec3 cvP = vCvW - uOrigin; vec3 cvNn = normalize(vCvN);
        #ifdef USE_MAP
        vec3 tpB = pow(abs(cvNn), vec3(4.0)); tpB /= (tpB.x + tpB.y + tpB.z);
        vec3 tpP = cvP * ${scale.toFixed(4)};
        vec4 tpC = texture2D(map, tpP.zy) * tpB.x + texture2D(map, tpP.xz + 0.37) * tpB.y + texture2D(map, tpP.xy + 0.71) * tpB.z;
        diffuseColor.rgb *= tpC.rgb * ${tint.toFixed(3)};
        #endif`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          float wallness = 1.0 - abs(cvNn.y), up = smoothstep(.35, .85, cvNn.y);
          float sn = cvN3(cvP * .06);
          float s = cvP.y + .22 * cvP.x - .12 * cvP.z;
          float band = sin(s * 1.55 + sn * 4.0);
          float seam = smoothstep(.95, .995, abs(sin(s * 3.1 + sn * 5.0 + 1.3))) * wallness * (1.0 - uFloor) * smoothstep(.35, .7, cvN3(cvP * vec3(.18, .5, .18) + 3.7)); // juntas interrompidas, não tijolo
          vec3 warm = vec3(1.08, 1.0, .86), cool = vec3(.84, .93, 1.04);
          diffuseColor.rgb *= mix(cool, warm, band * .5 + .5) * (1.0 - seam * .3);
          // escorrimentos de calcita: veios verticais nas paredes íngremes
          float st = cvN3(vec3((cvP.x + cvP.z) * 1.7, cvP.y * .09, (cvP.x - cvP.z) * .4));
          float flow = smoothstep(.58, .82, st) * wallness * (1.0 - uFloor);
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.18, 1.14, 1.04) + vec3(.03), flow * .7);
          // umidade: poças e frestas (a água que entra pelo teto escorre)
          float lit = 0.0;
          for (int i = 0; i < 6; i++) { vec4 q = uPools[i]; float d = length(cvP.xz - q.xz);
            cvWet = max(cvWet, smoothstep(q.w + 3.2, q.w + .2, d) * smoothstep(3.5, 0.0, cvP.y - q.y)); }
          for (int i = 0; i < 6; i++) { vec4 q = uShafts[i]; if (q.w <= 0.0) continue; float d = length(cvP.xz - q.xy);
            float k = smoothstep(q.z * 1.6, q.z * .35, d); lit = max(lit, k * q.w * 2.0); cvWet = max(cvWet, k * .45); }
          cvWet = max(cvWet, smoothstep(-.35, -.85, cvNn.y) * .25 * smoothstep(.4, .7, st));
          diffuseColor.rgb *= mix(1.0, .6, cvWet);
          // musgo só onde a luz das frestas chega e a face olha para cima
          float moss = clamp(lit, 0.0, 1.0) * up * smoothstep(.35, .65, sn + .25 * st);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.2, .3, .13) * (.8 + .5 * sn), moss * .75);
          // gradiente pintado de grande escala: alto quente, fundo frio
          float g = smoothstep(-10.0, 16.0, cvP.y);
          diffuseColor.rgb *= mix(vec3(.88, .96, 1.06), vec3(1.07, 1.0, .92), g);
          cvHgt = (band * .5 + .5) * .3 * wallness + flow * .1 + sn * .5; // só campos suaves: a derivada por bloco 2×2 não aparece
        }`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, mix(.4, .55, uFloor), cvWet); // úmido brilha, sem virar faixa branca na borda das poças')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        {
          vec3 sp = -vViewPosition; vec3 sx = dFdx(sp), sy = dFdy(sp); vec2 dh = vec2(dFdx(cvHgt), dFdy(cvHgt)) * (1.0 - .6 * uFloor);
          vec3 r1 = cross(sy, normal), r2 = cross(normal, sx); float det = dot(sx, r1);
          vec3 grad = sign(det) * (dh.x * r1 + dh.y * r2); normal = normalize(abs(det) * normal - grad);
        }`);
  };
  mat.customProgramCacheKey = () => 'caverna-rocha-c3';
  return mat;
}

/** Calcita (espeleotemas e cortinas): mais clara, levemente translúcida na leitura (emissivo mínimo na ponta), úmida. */
export function calciteMaterial(THREE) {
  return new THREE.MeshStandardMaterial({ color: 0xe9e1d0, vertexColors: true, roughness: .48, metalness: 0, side: THREE.DoubleSide });
}

/** Normais suaves em geometria não indexada (soldando vértices pela posição). */
export function smoothNormals(THREE, g, eps = 1e-3) {
  g.computeVertexNormals(); const P = g.attributes.position, N = g.attributes.normal, map = new Map(), acc = [];
  const key = i => Math.round(P.getX(i) / eps) + ',' + Math.round(P.getY(i) / eps) + ',' + Math.round(P.getZ(i) / eps);
  for (let i = 0; i < P.count; i++) { const k = key(i); let a = map.get(k); if (!a) { a = [0, 0, 0]; map.set(k, a); } a[0] += N.getX(i); a[1] += N.getY(i); a[2] += N.getZ(i); acc.push(a); }
  for (let i = 0; i < P.count; i++) { const a = acc[i], l = Math.hypot(a[0], a[1], a[2]) || 1; N.setXYZ(i, a[0] / l, a[1] / l, a[2] / l); }
  N.needsUpdate = true; return g;
}

/** Perfil de estalactite (t: 0 base no teto → 1 ponta): base alargada, corpo afunilado com anéis de crescimento. */
export function stalactiteRadius(t) { const flare = t < .14 ? 1 + (1 - t / .14) ** 2 * .7 : 1; return Math.max(.035, (1 - t) ** 1.55 * flare * (1 + .07 * Math.sin(t * 23))); }
/** Perfil de estalagmite (t: 0 chão → 1 topo): base larga, topo arredondado (gota que cai espalha). */
export function stalagmiteRadius(t) { return Math.max(.06, Math.sqrt(Math.max(0, 1 - t ** 2.2)) * (1 - .35 * t) * (1 + .06 * Math.sin(t * 19))); }

/** Lathe ao longo de y (0 → -1 para estalactite; 0 → 1 para estalagmite), com gradiente de cor base→ponta. */
export function speleoGeometry(THREE, { down = true, radial = 8, rings = 7 } = {}) {
  const pts = []; for (let k = 0; k <= rings; k++) { const t = k / rings; pts.push(new THREE.Vector2(down ? stalactiteRadius(t) : stalagmiteRadius(t), down ? -t : t)); }
  if (down) pts.push(new THREE.Vector2(0, -1.02)); else pts.push(new THREE.Vector2(0, 1.0));
  const g = new THREE.LatheGeometry(pts, radial); g.computeVertexNormals();
  const P = g.attributes.position, cc = new Float32Array(P.count * 3);
  for (let i = 0; i < P.count; i++) { const t = Math.abs(P.getY(i)); const v = down ? .62 + .38 * t : .78 - .22 * t; cc[i * 3] = v; cc[i * 3 + 1] = v * .98; cc[i * 3 + 2] = v * .93; }
  g.setAttribute('color', new THREE.BufferAttribute(cc, 3)); return g;
}

/**
 * Cortinas de calcita: fitas onduladas penduradas do teto junto às paredes altas. Pure: devolve a lista de cortinas
 * { x, z, yaw, w, L, top } a partir de amostras { x, z, f, floor, roof } (f = distância à parede no campo 2D).
 * Regra: na abóbada inclinada junto à parede (f entre 1,4 e 4,5 m), teto alto (≥ 7 m), e a ponta fica ≥ 3,4 m acima
 * do piso (não toca no herói nem na câmera de ombro). `roof` é o teto REAL (marcha no SDF da C2), sem fresta flutuante.
 */
export function planCurtains(samples, { max = 26, seed = 951 } = {}) {
  const out = [];
  for (let n = 0; n < samples.length && out.length < max; n++) {
    const s = samples[n]; if (s.f < 1.4 || s.f > 4.5) continue; const room = s.roof - s.floor; if (room < 7) continue;
    if (hash2(Math.round(s.x * 3), Math.round(s.z * 3), seed) > .2) continue;
    if (out.some(c => Math.hypot(c.x - s.x, c.z - s.z) < 6)) continue;
    const L = Math.min(room - 3.4, 1.6 + 2.8 * hash2(n, 2, seed)); if (L < 1.2) continue;
    out.push({ x: s.x, z: s.z, yaw: s.yaw, w: 1.4 + 1.6 * hash2(n, 3, seed), L, top: s.roof + .5 });
  }
  return out;
}
export function curtainGeometry(THREE, list, { cols = 12, rows = 5 } = {}) {
  const pos = [], col = [], idx = [];
  list.forEach((c, n) => {
    const base = pos.length / 3, cs = Math.cos(c.yaw), sn = Math.sin(c.yaw), folds = 2.5 + 2 * hash2(n, 4, 952);
    for (let r = 0; r <= rows; r++) for (let q = 0; q <= cols; q++) {
      const u = q / cols - .5, v = r / rows, edge = 1 - Math.abs(u) * 2;
      const len = c.L * (.55 + .45 * (Math.sin(u * 7 + n) * .5 + .5)) * (.4 + .6 * edge); // borda inferior recortada
      const y = c.top - v * len, fold = Math.sin(u * Math.PI * 2 * folds + n) * .22 * (.4 + .6 * v);
      const lx = u * c.w, lz = fold - .05 * v;
      pos.push(c.x + lx * cs + lz * sn, y, c.z - lx * sn + lz * cs);
      const k = .7 + .3 * v + .06 * Math.sin(u * 31 + n); col.push(k, k * .96, k * .88);
    }
    for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) { const a = base + r * (cols + 1) + q, b = a + 1, d = a + cols + 1, e = d + 1; idx.push(a, d, b, b, d, e); }
  });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}

/** Poça com profundidade: disco em anéis com a profundidade real da bacia em cada vértice (aDepth). */
export function poolGeometry(THREE, p, waterY, floorAt, { rings = 7, segs = 40 } = {}) {
  const R = p.r + .5, pos = [0, 0, 0], dep = [Math.max(0, waterY - floorAt(p.x, p.z))], idx = [];
  for (let r = 1; r <= rings; r++) for (let s = 0; s < segs; s++) { const a = s / segs * Math.PI * 2, rr = R * r / rings, x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    pos.push(x, 0, z); dep.push(Math.max(0, waterY - floorAt(p.x + x, p.z + z))); }
  for (let s = 0; s < segs; s++) idx.push(0, 1 + (s + 1) % segs, 1 + s);
  for (let r = 1; r < rings; r++) for (let s = 0; s < segs; s++) { const a = 1 + (r - 1) * segs + s, b = 1 + (r - 1) * segs + (s + 1) % segs, c = a + segs, d = b + segs; idx.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aDepth', new THREE.Float32BufferAttribute(dep, 1)); g.setIndex(idx); return g;
}
/**
 * Água parada com profundidade (bug 4 do plano): absorção pela profundidade da bacia (borda rasa transparente, centro
 * verde-azulado escuro), Fresnel, reflexo do teto escuro e **brilho só onde a luz de uma fresta toca a água** (e no
 * reflexo da própria fresta). Sem emissivo "neon".
 */
export function poolMaterial(THREE, { origin = { x: 0, z: 0 }, time } = {}) {
  const shafts = CAVE_SHAFTS.map(([x, z, , I, w]) => new THREE.Vector4(x, z, 2.2 * w, I));
  while (shafts.length < 6) shafts.push(new THREE.Vector4(0, 0, 0, 0));
  return new THREE.ShaderMaterial({
    uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), uTime: time, uOrigin: { value: new THREE.Vector3(origin.x, 0, origin.z) }, uShafts: { value: shafts.slice(0, 6) },
      uShallow: { value: new THREE.Color(0x5fb7a6) }, uDeep: { value: new THREE.Color(0x041a20) }, uSky: { value: new THREE.Color(0x14262b) } },
    transparent: true, depthWrite: false, fog: true,
    vertexShader: `#include <fog_pars_vertex>
      attribute float aDepth; varying float vD; varying vec3 vW;
      void main(){ vD = aDepth; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
      }`,
    fragmentShader: `#include <fog_pars_fragment>
      uniform float uTime; uniform vec3 uOrigin, uShallow, uDeep, uSky; uniform vec4 uShafts[6]; varying float vD; varying vec3 vW;
      void main(){
        vec3 p = vW - uOrigin; vec3 V = normalize(cameraPosition - vW);
        // ondulação lenta + anéis de gota (a cada ~3 s em pontos que mudam)
        float t = uTime; vec2 q = p.xz;
        vec2 g = vec2(sin(q.x * 2.1 + t * .8) + sin((q.x + q.y) * 3.3 - t * 1.1) * .6, sin(q.y * 1.9 - t * .7) + sin((q.x - q.y) * 2.7 + t * .9) * .6) * .035;
        float cyc = floor(t / 3.1); vec2 dc = vec2(fract(sin(cyc * 12.9) * 437.5), fract(sin(cyc * 78.2) * 917.3)) * 4.0 - 2.0;
        float dr = length(q - floor(q / 6.0) * 6.0 - 3.0 - dc), ph = fract(t / 3.1);
        g += normalize(q - floor(q / 6.0) * 6.0 - 3.0 - dc + 1e-4) * sin(dr * 14.0 - ph * 30.0) * exp(-dr * 1.4) * (1.0 - ph) * .12;
        vec3 N = normalize(vec3(-g.x, 1.0, -g.y));
        float fr = .03 + .97 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
        float ab = 1.0 - exp(-vD * 2.6);
        vec3 body = mix(uShallow * .55, uDeep, ab);
        vec3 R = reflect(-V, N); vec3 refl = uSky * (.6 + .4 * R.y);
        float beam = 0.0, spark = 0.0;
        for (int i = 0; i < 6; i++) { vec4 s = uShafts[i]; if (s.w <= 0.0) continue; vec2 d = p.xz - s.xy; float k = smoothstep(s.z * 1.5, s.z * .2, length(d));
          beam += k * s.w; vec3 L = normalize(vec3(s.x, p.y + 14.0, s.y) - p); spark += pow(max(dot(R, L), 0.0), 400.0) * s.w * 1.2; } // reflexo da fresta: brilho pequeno e nítido
        float caus = sin(q.x * 3.1 + t * .9) + sin(q.y * 3.7 - t * 1.2) + sin((q.x + q.y) * 2.3 + t * .6); caus = pow(abs(caus) / 3.0, 1.5); // cáusticas sob o feixe
        vec3 col = mix(body, refl, fr) + vec3(.62, .86, .8) * beam * (.06 + .3 * caus) * (.4 + .6 * ab) + vec3(1.0, .98, .9) * spark;
        float a = mix(.18, .9, ab) + fr * .5; a = clamp(a, 0.0, .96) * smoothstep(0.0, .05, vD + .02);
        gl_FragColor = vec4(col, a);
        #include <fog_fragment>
      }`,
  });
}

/** Amostras de parede para as cortinas (pure, a partir do layout). */
export function curtainSamples(field, roofAt, { x0 = -82, x1 = 76, z0 = -160, z1 = 16, step = 1.5 } = {}) {
  const out = [];
  for (let z = z0; z <= z1; z += step) for (let x = x0; x <= x1; x += step) {
    const f = field(x, z); if (f < 1.4 || f > 4.5) continue;
    const gx = field(x + .6, z) - field(x - .6, z), gz = field(x, z + .6) - field(x, z - .6); // aponta para dentro (f cresce)
    out.push({ x, z, f, floor: caveFloor(x, z), roof: roofAt(x, z), yaw: Math.atan2(gx, gz) + Math.PI / 2, walk: caveWalk(x, z) });
  }
  return out;
}
