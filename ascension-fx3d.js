/**
 * Mod 311 — efeitos compartilhados da caverna e da ascensão (tudo animado na GPU por uniform de tempo; CPU ≈ 0).
 *  - triplanarRock: rocha procedural com a textura assada do maciço, sem costura de UV.
 *  - vortexPortal: disco GLSL em coordenadas polares + ruído (braços em espiral), anéis aditivos e partículas instanciadas.
 *  - lightShaft: feixe volumétrico falso (cone aditivo com degradê e poeira).
 *  - dustField: poeira/partículas suspensas (Points com deriva no vertex shader).
 */
export function triplanarRock(THREE, { map = null, color = 0xffffff, scale = .05, roughness = .93, tint = 1.3, emissive = 0x000000, flat = true, key = 'rocha' } = {}) {
  const mat = new THREE.MeshStandardMaterial({ color, vertexColors: true, flatShading: flat, roughness, metalness: 0, emissive });
  mat.map = map; // pode chegar depois (GLB carregado): o patch só age com USE_MAP
  mat.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vTpW; varying vec3 vTpN;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvTpW = (modelMatrix * vec4(transformed, 1.0)).xyz; vTpN = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vTpW; varying vec3 vTpN;')
      .replace('#include <map_fragment>', `#ifdef USE_MAP
        vec3 tpB = pow(abs(normalize(vTpN)), vec3(4.0)); tpB /= (tpB.x + tpB.y + tpB.z);
        vec3 tpP = vTpW * ${scale.toFixed(4)};
        vec4 tpC = texture2D(map, tpP.zy) * tpB.x + texture2D(map, tpP.xz + 0.37) * tpB.y + texture2D(map, tpP.xy + 0.71) * tpB.z;
        diffuseColor *= vec4(tpC.rgb * ${tint.toFixed(3)}, 1.0);
        #endif`);
  };
  mat.customProgramCacheKey = () => 'triplanar-' + key;
  return mat;
}
/** Dá às malhas procedurais um atributo uv vazio (o shader padrão com map exige o atributo). */
export function ensureUv(THREE, geo) { if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2)); return geo; }

const NOISE = `
float hsh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hsh(i), hsh(i + vec2(1, 0)), u.x), mix(hsh(i + vec2(0, 1)), hsh(i + vec2(1, 1)), u.x), u.y); }
float fb(vec2 p){ float v = 0.0, a = .5; for (int i = 0; i < 4; i++) { v += a * vn(p); p = p * 2.03 + 7.1; a *= .5; } return v; }`;

/**
 * Portal-vórtice 3D. Plano do disco = plano XY local (atravessa-se ao longo de Z).
 * opts: radius, colors {deep, mid, hot}, particles
 */
export function vortexPortal(THREE, { radius = 3, deep = 0x1a0b4a, mid = 0x5b3cff, hot = 0xc8b8ff, rim = 0x8f6bff, particles = 420, lowSpec = false } = {}) {
  const group = new THREE.Group(); group.name = 'portal-vortice';
  const uniforms = { uTime: { value: 0 }, uDeep: { value: new THREE.Color(deep) }, uMid: { value: new THREE.Color(mid) }, uHot: { value: new THREE.Color(hot) }, uPulse: { value: 0 } };
  const disk = new THREE.Mesh(new THREE.CircleGeometry(radius, lowSpec ? 48 : 96), new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uTime; uniform vec3 uDeep, uMid, uHot; uniform float uPulse; varying vec2 vUv; ${NOISE}
      void main(){
        vec2 p = vUv * 2.0 - 1.0; float r = length(p); if (r > 1.0) discard;
        float a = atan(p.y, p.x);
        float lr = log(max(r, 1e-3));
        // espiral logarítmica: o ângulo gira mais perto do centro (rotação diferencial), escoando para dentro com o tempo
        float sw = a + lr * 2.6 + uTime * 1.15;
        float arms = fb(vec2(cos(sw) * 2.2 + sin(sw * 3.0) * .25, lr * 3.2 - uTime * .9));
        float arms2 = fb(vec2(sin(sw * 2.0 + 1.3) * 1.6, lr * 5.0 - uTime * 1.6 + 3.0));
        float band = smoothstep(.35, .9, arms) * .8 + smoothstep(.45, .95, arms2) * .5;
        float core = smoothstep(.55, 0.0, r);
        float edge = smoothstep(1.0, .82, r) * smoothstep(.0, .25, r + .05);
        vec3 col = mix(uDeep, uMid, band) + uHot * (pow(core, 2.2) * 1.4 + band * band * .55);
        col *= edge * (1.0 + uPulse * .35);
        // olho escuro no centro (profundidade) com halo quente
        col *= mix(.35, 1.0, smoothstep(.0, .16, r));
        gl_FragColor = vec4(col, 1.0);
      }`,
  }));
  group.add(disk);
  const ringMat = (w, speed, phase) => new THREE.ShaderMaterial({
    uniforms: { uTime: uniforms.uTime, uRim: { value: new THREE.Color(rim) }, uHot: uniforms.uHot }, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uTime; uniform vec3 uRim, uHot; varying vec2 vUv; ${NOISE}
      void main(){ float t = vUv.x; float k = 1.0 - abs(vUv.y * 2.0 - 1.0);
        float n = fb(vec2(t * 18.0 + uTime * ${speed.toFixed(2)}, vUv.y * 2.0 + ${phase.toFixed(1)}));
        float a = pow(k, ${w.toFixed(1)}) * (.35 + n * 1.1);
        gl_FragColor = vec4(mix(uRim, uHot, n * n) * a, 1.0); }`,
  });
  const ring1 = new THREE.Mesh(new THREE.RingGeometry(radius * .97, radius * 1.16, 96, 1), ringMat(1.6, 2.4, 0)); ring1.geometry.attributes.uv && remapRingUv(ring1.geometry, radius * .97, radius * 1.16); group.add(ring1);
  const ring2 = new THREE.Mesh(new THREE.RingGeometry(radius * 1.2, radius * 1.42, 96, 1), ringMat(2.4, -1.5, 4)); remapRingUv(ring2.geometry, radius * 1.2, radius * 1.42); ring2.position.z = .05; group.add(ring2);
  // partículas: cada instância tem semente; o vertex shader calcula a espiral (entra no vórtice e renasce na borda)
  const N = lowSpec ? Math.round(particles * .45) : particles, seeds = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { seeds[i * 3] = Math.random(); seeds[i * 3 + 1] = Math.random(); seeds[i * 3 + 2] = Math.random(); }
  const pg = new THREE.InstancedBufferGeometry(); pg.index = new THREE.PlaneGeometry(1, 1).index; pg.setAttribute('position', new THREE.PlaneGeometry(1, 1).attributes.position);
  pg.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 3)); pg.instanceCount = N;
  const parts = new THREE.Mesh(pg, new THREE.ShaderMaterial({
    uniforms: { uTime: uniforms.uTime, uR: { value: radius }, uHot: uniforms.uHot, uMid: uniforms.uMid }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    vertexShader: `attribute vec3 aSeed; uniform float uTime, uR; varying float vA; varying vec2 vQ;
      void main(){
        float life = fract(aSeed.x + uTime * (.12 + aSeed.y * .14));
        float r = uR * mix(1.65, .05, life * life);
        float ang = aSeed.z * 6.2832 + life * (5.0 + aSeed.y * 4.0) + uTime * .4;
        float z = (aSeed.y - .5) * 1.4 * (1.0 - life) + sin(ang * 2.0) * .12;
        vec3 c = vec3(cos(ang) * r, sin(ang) * r, z);
        vec4 mv = modelViewMatrix * vec4(c, 1.0);
        float s = mix(.09, .03, life) * (.6 + aSeed.x);
        mv.xy += position.xy * s;
        vA = smoothstep(0.0, .15, life) * smoothstep(1.0, .8, life); vQ = position.xy;
        gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uHot, uMid; varying float vA; varying vec2 vQ;
      void main(){ float d = length(vQ) * 2.0; float a = smoothstep(1.0, 0.0, d) * vA; gl_FragColor = vec4(mix(uMid, uHot, .6) * a * 1.6, 1.0); }`,
  }));
  parts.frustumCulled = false; group.add(parts);
  // halo atrás (luz falsa no ar ao redor)
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(radius * 4.4, radius * 4.4), new THREE.ShaderMaterial({
    uniforms: { uMid: uniforms.uMid, uTime: uniforms.uTime }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 uMid; uniform float uTime; varying vec2 vUv; void main(){ float d = length(vUv * 2.0 - 1.0); float a = pow(max(0.0, 1.0 - d), 2.4) * (.32 + .05 * sin(uTime * 2.0)); gl_FragColor = vec4(uMid * a, 1.0); }',
  }));
  halo.position.z = -.08; group.add(halo);
  disk.renderOrder = ring1.renderOrder = ring2.renderOrder = parts.renderOrder = 5; halo.renderOrder = 4;
  let t = 0;
  return {
    group, uniforms,
    update(dt) { t += Math.min(dt, .1); uniforms.uTime.value = t; ring1.rotation.z = t * .35; ring2.rotation.z = -t * .22; uniforms.uPulse.value = Math.max(0, uniforms.uPulse.value - dt * 1.5); },
    pulse() { uniforms.uPulse.value = 1; },
  };
}
function remapRingUv(geo, r0, r1) {
  const p = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); uv.setXY(i, (Math.atan2(y, x) / 6.2832 + 1) % 1, (Math.hypot(x, y) - r0) / (r1 - r0)); }
  uv.needsUpdate = true;
}

/** Feixe de luz falso: cone aberto, aditivo, mais forte no topo, com faixas de poeira lentas. */
export function lightShaft(THREE, { top = 1.2, bottom = 4, height = 20, color = 0x9fe6ff, intensity = .35, segments = 18 } = {}) {
  const geo = new THREE.CylinderGeometry(top, bottom, height, segments, 1, true); geo.translate(0, -height / 2, 0);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uI: { value: intensity }, uTime: { value: 0 }, uH: { value: height } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: `uniform vec3 uColor; uniform float uI, uTime; varying vec2 vUv; varying vec3 vN; varying vec3 vV; ${NOISE}
      void main(){ float facing = pow(abs(dot(vN, vV)), 1.6);
        float fall = pow(vUv.y, 1.1) * smoothstep(0.02, .22, vUv.y) * (1.0 - smoothstep(.84, 1.0, vUv.y)); // some no alto: luz sem emissor visível
        float dust = .65 + .7 * fb(vec2(vUv.x * 9.0, vUv.y * 3.0 - uTime * .05));
        gl_FragColor = vec4(uColor * facing * fall * dust * uI, 1.0); }`,
  });
  const mesh = new THREE.Mesh(geo, mat); mesh.renderOrder = 3; mesh.name = 'feixe-luz';
  return { mesh, update(t) { mat.uniforms.uTime.value = t; }, material: mat };
}

/** Poeira/brilhos suspensos numa caixa (deriva e cintilação no vertex shader). */
export function dustField(THREE, { count = 600, box = [40, 20, 40], color = 0xcfefff, size = 2.2, center = [0, 0, 0] } = {}) {
  const pos = new Float32Array(count * 3), seed = new Float32Array(count);
  for (let i = 0; i < count; i++) { pos[i * 3] = (Math.random() - .5) * box[0]; pos[i * 3 + 1] = Math.random() * box[1]; pos[i * 3 + 2] = (Math.random() - .5) * box[2]; seed[i] = Math.random(); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(color) }, uSize: { value: size }, uH: { value: box[1] } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    vertexShader: `attribute float aSeed; uniform float uTime, uSize, uH; varying float vA;
      void main(){ vec3 p = position; p.y = mod(p.y + uTime * (.15 + aSeed * .25), uH); p.x += sin(uTime * .3 + aSeed * 20.0) * .6; p.z += cos(uTime * .25 + aSeed * 13.0) * .6;
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_PointSize = uSize * (8.0 / -mv.z) * (.6 + aSeed);
        vA = (.35 + .65 * abs(sin(uTime * (.6 + aSeed) + aSeed * 30.0))) * smoothstep(0.0, 2.0, p.y) * smoothstep(uH, uH - 3.0, p.y);
        gl_Position = projectionMatrix * mv; }`,
    fragmentShader: 'uniform vec3 uColor; varying float vA; void main(){ float d = length(gl_PointCoord - .5) * 2.0; gl_FragColor = vec4(uColor * smoothstep(1.0, 0.0, d) * vA, 1.0); }',
  });
  const pts = new THREE.Points(g, mat); pts.position.set(...center); pts.frustumCulled = false; pts.renderOrder = 6;
  return { points: pts, update(t) { mat.uniforms.uTime.value = t; } };
}

/** Libera geometrias/materiais/texturas próprios de um grupo (texturas compartilhadas de GLB ficam: são do cache). */
export function disposeGroup(root, keep = new Set(), textures = false) {
  const seen = new Set();
  root.traverse(o => {
    if (o.geometry && !seen.has(o.geometry) && !keep.has(o.geometry)) { seen.add(o.geometry); o.geometry.dispose(); }
    for (const m of o.material ? [].concat(o.material) : []) if (m && !seen.has(m) && !keep.has(m)) {
      seen.add(m);
      if (textures) for (const k of ['map', 'emissiveMap', 'normalMap', 'roughnessMap', 'metalnessMap']) { const t = m[k]; if (t && !seen.has(t) && !keep.has(t)) { seen.add(t); t.dispose(); } }
      m.dispose();
    }
  });
}
