/**
 * Mod 316 — pássaros de Eldória: bandos PEQUENOS e RAROS cruzando o céu de dia (não um enxame permanente).
 *
 *  - 1 InstancedMesh (1 draw call) com no máximo FLOCKS × PER_FLOCK silhuetas; asas batem no vertex shader
 *    (fase por instância), planam de vez em quando — sem esqueleto, sem animação por CPU além de 14 matrizes.
 *  - Um bando aparece a cada 35–80 s (só de dia/crepúsculo leve), nasce fora da vista a 70–95 m do herói, voa em V
 *    frouxo numa curva suave a 9–12 m/s, 16–30 m acima do chão, e some do outro lado. Nada é criado por quadro.
 *  - Quando passa perto (≤ 45 m) chama onCall(nível) uma vez — o áudio procedural toca o chilreio do bando.
 */
export const BIRDS = Object.freeze({ FLOCKS: 2, PER_FLOCK: 7, minGap: 35, maxGap: 80 });

const VERT = /* glsl */`
#include <common>
#include <fog_pars_vertex>
attribute float aWing; attribute float aPhase;
uniform float uTime;
void main(){
  vec3 p = position;
  float glide = smoothstep(.55, .85, sin(uTime * .37 + aPhase * 1.7));        // trechos planando
  float flap = sin(uTime * 13.0 + aPhase * 6.2831) * (1.0 - glide * .85);
  p.y += flap * .2 * abs(aWing) + abs(aWing) * glide * .03;
  p.x *= 1.0 - .12 * abs(flap) * abs(aWing);
  vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const FRAG = /* glsl */`
#include <common>
#include <fog_pars_fragment>
uniform vec3 uColor;
void main(){ gl_FragColor = vec4(uColor, 1.0);
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

/** Silhueta: corpo + duas asas (6 triângulos). aWing: 0 corpo, ±1 ponta da asa. */
function birdGeometry(THREE) {
  const P = [
    // asa esquerda (raiz no corpo, ponta em x = -1)
    0, 0, .12, -1, .04, -.06, 0, 0, -.14,
    0, 0, .12, -.55, .02, .1, -1, .04, -.06,
    // asa direita
    0, 0, .12, 0, 0, -.14, 1, .04, -.06,
    0, 0, .12, 1, .04, -.06, .55, .02, .1,
    // corpo
    -.08, 0, .32, .08, 0, .32, 0, -.04, -.36,
    -.12, 0, -.3, .12, 0, -.3, 0, .01, -.46,
  ];
  const W = [0, -1, 0, 0, -.55, -1, 0, 0, 1, 0, 1, .55, 0, 0, 0, 0, 0, 0];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('aWing', new THREE.Float32BufferAttribute(W, 1));
  g.computeVertexNormals(); return g;
}

/**
 * opts: { ground(x,z), random(), onCall(level) }. update(dt, t, focus{x,z}, daylight 0..1).
 */
export function createBirdFlocks(THREE, { ground = () => 0, random = Math.random, onCall = () => {}, scale = .55 } = {}) {
  const N = BIRDS.FLOCKS * BIRDS.PER_FLOCK, geo = birdGeometry(THREE);
  const phase = new Float32Array(N); for (let i = 0; i < N; i++) phase[i] = random();
  const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, uColor: { value: new THREE.Color(0x2b2a2e) } }]);
  const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG, fog: true, side: THREE.DoubleSide });
  const mesh = new THREE.InstancedMesh(geo, mat, N); mesh.geometry.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phase, 1));
  mesh.name = 'passaros-bandos-mod316'; mesh.frustumCulled = false; mesh.count = 0; mesh.visible = false;
  const flocks = Array.from({ length: BIRDS.FLOCKS }, () => ({ active: false, t: 0, life: 0, x: 0, z: 0, y: 0, dx: 0, dz: 0, speed: 10, curve: 0, n: 0, called: false, offs: new Float32Array(BIRDS.PER_FLOCK * 3) }));
  const o = new THREE.Object3D();
  let nextAt = 8 + random() * 14, clock = 0;
  function spawn(f, focus, near = 0) {
    const a = random() * Math.PI * 2, R = near || 70 + random() * 25, head = a + Math.PI + (random() - .5) * .9;
    f.x = focus.x + Math.cos(a) * R; f.z = focus.z + Math.sin(a) * R; f.dx = Math.cos(head); f.dz = Math.sin(head);
    f.speed = 9 + random() * 3; f.curve = (random() - .5) * .12; f.y = 16 + random() * 14; f.t = 0; f.life = (R * 2.1) / f.speed; f.called = false;
    f.n = 3 + Math.floor(random() * (BIRDS.PER_FLOCK - 2));
    for (let i = 0; i < f.n; i++) { const side = i % 2 ? 1 : -1, rank = Math.ceil(i / 2); f.offs[i * 3] = side * rank * (1.1 + random() * .6); f.offs[i * 3 + 1] = (random() - .5) * 1.2; f.offs[i * 3 + 2] = -rank * (1.2 + random() * .8); }
    f.active = true;
  }
  function update(dt, t, focus, daylight = 1) {
    uniforms.uTime.value = t; clock += dt;
    if (daylight > .45 && clock > nextAt) { const f = flocks.find(q => !q.active); if (f) spawn(f, focus); nextAt = clock + BIRDS.minGap + random() * (BIRDS.maxGap - BIRDS.minGap); }
    let k = 0;
    for (const f of flocks) {
      if (!f.active) continue;
      f.t += dt; if (f.t > f.life) { f.active = false; continue; }
      const c = Math.cos(f.curve * dt), s = Math.sin(f.curve * dt), ndx = f.dx * c - f.dz * s, ndz = f.dx * s + f.dz * c; f.dx = ndx; f.dz = ndz;
      f.x += f.dx * f.speed * dt; f.z += f.dz * f.speed * dt;
      const baseY = ground(f.x, f.z) + f.y, yaw = Math.atan2(f.dx, f.dz);
      const d = Math.hypot(f.x - focus.x, f.z - focus.z); if (!f.called && d < 45) { f.called = true; onCall(Math.max(.35, 1 - d / 45) * daylight); }
      const rx = Math.cos(yaw), rz = -Math.sin(yaw);
      for (let i = 0; i < f.n; i++, k++) {
        const ox = f.offs[i * 3], oy = f.offs[i * 3 + 1] + Math.sin(t * .9 + i) * .25, oz = f.offs[i * 3 + 2];
        o.position.set(f.x + rx * ox + f.dx * oz, baseY + oy, f.z + rz * ox + f.dz * oz);
        o.rotation.set(0, yaw, Math.sin(t * .7 + i) * .12); o.scale.setScalar(scale); o.updateMatrix(); mesh.setMatrixAt(k, o.matrix);
      }
    }
    mesh.count = k; mesh.visible = k > 0; if (k) mesh.instanceMatrix.needsUpdate = true;
    return k;
  }
  return { mesh, update, flocks, forceSpawn(focus, near = 0) { const f = flocks.find(q => !q.active); if (f) spawn(f, focus, near); return !!f; } };
}
