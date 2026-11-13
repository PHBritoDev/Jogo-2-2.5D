/**
 * Renascimento de Eldória — Fase 1: apresentação do clima (THREE). A lógica e os números ficam em eldoria-weather.js.
 *
 *  - Nuvens: uma cúpula que acompanha a câmera (1 draw call). O shader projeta a direção de visão num plano de
 *    nuvens (perspectiva real: as nuvens se achatam no horizonte) e amostra duas vezes uma textura de ruído
 *    periódica gerada por código (fBm 256²). A cobertura, a base escura, a cor pelo sol e o deslocamento pelo vento
 *    vêm do clima. Substitui as bolhas de esferas antigas, que pareciam algodão colado no céu.
 *  - Chuva: segmentos numa caixa em volta da câmera, animados só na GPU. A quantidade sai do drawRange (zero custo
 *    quando não chove) e a inclinação vem do vento. Some dentro de dimensões/cavernas (o chamador decide).
 *  - Relâmpago: fita em zigue-zague com ramos, regenerada só quando cai um raio. Clarão via uniforms (sem luz
 *    dinâmica nova, sem recompilar shader).
 *  - Superfícies molhadas: materiais registrados ficam mais escuros e menos ásperos com a umidade (valores base
 *    guardados e restaurados).
 */
import { celestialVisibility } from './eldoria-weather.js';

/** Textura de ruído periódica (tileable): value-noise com 5 oitavas, gerada uma vez. */
function cloudNoiseTexture(THREE, size = 256) {
  const data = new Uint8Array(size * size * 4);
  const lat = (p, s) => { const g = new Float32Array(p * p); let x = s >>> 0; for (let i = 0; i < g.length; i++) { x = (x * 1664525 + 1013904223) >>> 0; g[i] = x / 4294967296; } return g; };
  const octs = [[4, .5], [8, .25], [16, .14], [32, .07], [64, .04]].map(([p, a], i) => ({ p, a, g: lat(p, 917 + i * 131) }));
  const sm = t => t * t * (3 - 2 * t);
  const vals = new Float32Array(size * size); let lo = 1e9, hi = -1e9;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let v = 0;
    for (const o of octs) {
      const fx = x / size * o.p, fy = y / size * o.p, ix = Math.floor(fx), iy = Math.floor(fy), tx = sm(fx - ix), ty = sm(fy - iy);
      const P = o.p, g = o.g, a = g[(iy % P) * P + ix % P], b = g[(iy % P) * P + (ix + 1) % P], c = g[((iy + 1) % P) * P + ix % P], d = g[((iy + 1) % P) * P + (ix + 1) % P];
      v += o.a * (a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty);
    }
    vals[y * size + x] = v; if (v < lo) lo = v; if (v > hi) hi = v;
  }
  // normaliza para 0..1 (a soma das oitavas se concentra no meio; sem isto a cobertura não "abre" nem "fecha")
  for (let i = 0; i < vals.length; i++) { const n = Math.round((vals[i] - lo) / Math.max(1e-6, hi - lo) * 255); data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = n; data[i * 4 + 3] = 255; }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true; tex.needsUpdate = true;
  return tex;
}

const CLOUD_VERT = `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.); gl_Position = vec4(p.xy, p.w * .99990, p.w); }`;
const CLOUD_FRAG = `uniform sampler2D uNoise; uniform vec2 uOff, uOff2; uniform float uCover, uDark, uNight, uFlash, uOpacity, uDetail;
uniform vec3 uLit, uShade, uSunDir, uHorizon; varying vec3 vDir;
void main(){
  vec3 d = normalize(vDir); if (d.y < .015) discard;
  vec2 uv = d.xz / (d.y + .12) * .55;                       // plano das nuvens em perspectiva
  float n = texture2D(uNoise, uv * .23 + uOff).r;
  if (uDetail > .5) n = n * .68 + texture2D(uNoise, uv * .61 + uOff2).r * .32;
  float edge = 1. - uCover;
  float dens = smoothstep(edge - .02, edge + .26, n);
  float thick = smoothstep(edge + .05, edge + .55, n);       // núcleo mais denso = base mais escura
  float horizon = smoothstep(.015, .2, d.y);
  float toward = max(0., dot(normalize(vec3(d.x, .35, d.z)), normalize(vec3(uSunDir.x, .35, uSunDir.z))));
  vec3 lit = uLit * (1. + toward * .35 * (1. - uNight));
  vec3 col = mix(lit, uShade, clamp(thick * (.45 + uDark * .55), 0., 1.));
  col = mix(col, uHorizon, (1. - horizon) * .55);            // perspectiva aérea perto do horizonte
  col += vec3(.62, .66, .8) * uFlash * (.2 + thick * .55);  // relâmpago acende as nuvens por dentro
  gl_FragColor = vec4(col, dens * horizon * uOpacity);
}`;

const RAIN_VERT = `attribute vec4 aSeed; uniform float uTime, uSpeed, uLen; uniform vec3 uCenter, uBox, uWind; varying float vA;
void main(){
  vec3 s = aSeed.xyz; float tail = aSeed.w;
  vec3 v = vec3(uWind.x, -uSpeed, uWind.z);
  vec3 p = fract(s + v * uTime / uBox) - .5;                // caixa repetida em volta da câmera
  vec3 w = uCenter + p * uBox;
  w -= normalize(v) * uLen * tail;                          // cauda da gota ao longo da queda
  vA = (1. - tail * .85) * smoothstep(.5, .3, abs(p.y));
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.);
}`;
const RAIN_FRAG = `uniform vec3 uColor; uniform float uAlpha; varying float vA; void main(){ gl_FragColor = vec4(uColor, uAlpha * vA); }`;

export function createWeatherView(THREE, { scene, lowSpec = false } = {}) {
  const noise = cloudNoiseTexture(THREE, lowSpec ? 128 : 256);
  // ---- nuvens
  const cloudMat = new THREE.ShaderMaterial({
    uniforms: {
      uNoise: { value: noise }, uOff: { value: new THREE.Vector2() }, uOff2: { value: new THREE.Vector2() },
      uCover: { value: .12 }, uDark: { value: 0 }, uNight: { value: 0 }, uFlash: { value: 0 }, uOpacity: { value: .92 }, uDetail: { value: lowSpec ? 0 : 1 },
      uLit: { value: new THREE.Color(1, 1, 1) }, uShade: { value: new THREE.Color(.5, .52, .56) }, uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uHorizon: { value: new THREE.Color(.8, .85, .9) },
    },
    vertexShader: CLOUD_VERT, fragmentShader: CLOUD_FRAG, transparent: true, depthWrite: false, depthTest: true, side: THREE.BackSide, fog: false, toneMapped: false,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 12, 0, Math.PI * 2, 0, Math.PI * .52), cloudMat);
  dome.name = 'eldoria-nuvens-renascimento'; dome.frustumCulled = false; dome.renderOrder = -7; dome.scale.setScalar(560); scene.add(dome);

  // ---- chuva
  const MAX = lowSpec ? 1400 : 3200;
  const pos = new Float32Array(MAX * 2 * 3), seed = new Float32Array(MAX * 2 * 4);
  let s = 4242; const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  for (let i = 0; i < MAX; i++) { const a = r(), b = r(), c = r(); for (let k = 0; k < 2; k++) { const j = (i * 2 + k) * 4; seed[j] = a; seed[j + 1] = b; seed[j + 2] = c; seed[j + 3] = k; } }
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); rg.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4)); rg.setDrawRange(0, 0);
  const rainMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uSpeed: { value: 15 }, uLen: { value: .55 }, uCenter: { value: new THREE.Vector3() }, uBox: { value: new THREE.Vector3(34, 22, 34) }, uWind: { value: new THREE.Vector3() }, uColor: { value: new THREE.Color(.72, .78, .86) }, uAlpha: { value: 0 } },
    vertexShader: RAIN_VERT, fragmentShader: RAIN_FRAG, transparent: true, depthWrite: false, fog: false,
  });
  const rain = new THREE.LineSegments(rg, rainMat); rain.name = 'eldoria-chuva-renascimento'; rain.frustumCulled = false; rain.renderOrder = 4; rain.visible = false; scene.add(rain);

  // ---- relâmpago (fita com ramos; geometria fixa, posições regeneradas a cada raio)
  const SEG = 16, BR = 2, BSEG = 6, VERTS = (SEG + BR * BSEG) * 6;
  const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(VERTS * 3), 3));
  const boltMat = new THREE.MeshBasicMaterial({ color: 0xeef2ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false, side: THREE.DoubleSide });
  const bolt = new THREE.Mesh(bg, boltMat); bolt.name = 'eldoria-raio'; bolt.frustumCulled = false; bolt.visible = false; bolt.renderOrder = -6; scene.add(bolt);
  let boltLife = 0, flash = 0;
  function buildBolt(origin, az, dist, power) {
    const P = bg.attributes.position.array; let o = 0;
    const gx = origin.x + Math.sin(az) * Math.min(dist, 520), gz = origin.z + Math.cos(az) * Math.min(dist, 520);
    const top = 120 + Math.random() * 40, w = (1.4 + Math.min(dist, 520) / 520 * 3.2) * (.6 + power * .5);
    const sx = Math.cos(az), sz = -Math.sin(az); // eixo lateral da fita (perpendicular à direção de visão)
    const quad = (ax, ay, az2, bx, by, bz, ww) => { const v = [[ax - sx * ww, ay, az2 - sz * ww], [ax + sx * ww, ay, az2 + sz * ww], [bx + sx * ww * .8, by, bz + sz * ww * .8], [ax - sx * ww, ay, az2 - sz * ww], [bx + sx * ww * .8, by, bz + sz * ww * .8], [bx - sx * ww * .8, by, bz - sz * ww * .8]]; for (const q of v) { P[o++] = q[0]; P[o++] = q[1]; P[o++] = q[2]; } };
    let px = gx + (Math.random() - .5) * 30, py = top, pz = gz + (Math.random() - .5) * 30; const pts = [];
    for (let i = 1; i <= SEG; i++) { const k = i / SEG, nx = gx + (px - gx) * (1 - k) * .3 + (Math.random() - .5) * 22 * (1 - k * .5), ny = top * (1 - k) + origin.y * k, nz = gz + (pz - gz) * (1 - k) * .3 + (Math.random() - .5) * 22 * (1 - k * .5); quad(px, py, pz, nx, ny, nz, w * (1 - k * .55)); pts.push([px, py, pz]); px = nx; py = ny; pz = nz; }
    for (let b = 0; b < BR; b++) { let [bx, by, bz] = pts[2 + Math.floor(Math.random() * (SEG * .5))]; const dx = (Math.random() - .5) * 2, dz = (Math.random() - .5) * 2; for (let i = 0; i < BSEG; i++) { const nx = bx + dx * 9 + (Math.random() - .5) * 8, ny = by - 7 - Math.random() * 6, nz = bz + dz * 9 + (Math.random() - .5) * 8; quad(bx, by, bz, nx, ny, nz, w * .45 * (1 - i / BSEG)); bx = nx; by = ny; bz = nz; } }
    bg.attributes.position.needsUpdate = true; bg.computeBoundingSphere();
  }

  // ---- superfícies molhadas
  const wetList = [];
  function registerWet(material, { darken = .22, rough = .4 } = {}) {
    if (!material || wetList.some(w => w.m === material)) return;
    wetList.push({ m: material, color: material.color ? material.color.clone() : null, rough: material.roughness, darken, roughK: rough });
  }

  const tmp = new THREE.Color(), tmp2 = new THREE.Color();
  return {
    dome, rain, bolt, registerWet,
    /** strike: chamado pelo integrador quando o diretor emite um raio */
    strike(origin, ev, reduceFlash = false) { const vis = ev.dist < 2200; if (vis) { buildBolt(origin, ev.az, ev.dist, ev.power); boltLife = .22 + Math.random() * .12; bolt.visible = true; } flash = Math.max(flash, (reduceFlash ? .45 : 1) * ev.power); },
    get flash() { return flash; },
    /**
     * W: parâmetros do diretor; L: estado de luz já modulado (cores sRGB); opts: { camera, dt, time, night, sunDir, wind, wetness, active, allowRain }
     */
    update(W, L, { camera, dt, time, night = 0, sunDir, wind = 0, windDir = 0, wetness = 0, active = true, allowRain = true, lowFps = false } = {}) {
      flash = Math.max(0, flash - dt * 3.4); if (boltLife > 0) { boltLife -= dt; boltMat.opacity = Math.max(0, Math.min(1, boltLife * 6)) * (.7 + Math.random() * .3); if (boltLife <= 0) bolt.visible = false; }
      dome.visible = active; if (!active) { rain.visible = false; bolt.visible = false; return; }
      dome.position.copy(camera.position);
      const u = cloudMat.uniforms;
      const drift = (.0035 + wind * .012) * dt;
      u.uOff.value.x += Math.sin(windDir) * drift; u.uOff.value.y += Math.cos(windDir) * drift;
      u.uOff2.value.x += Math.sin(windDir + .4) * drift * 1.6; u.uOff2.value.y += Math.cos(windDir + .4) * drift * 1.6;
      u.uCover.value = W.cover; u.uDark.value = W.dark; u.uNight.value = night; u.uFlash.value = flash;
      // cor das nuvens: iluminadas pelo sol do horário (quentes no amanhecer/pôr), sombra puxada para o céu e escurecida pelo clima
      tmp.setRGB(L.sun[0], L.sun[1], L.sun[2], THREE.SRGBColorSpace); tmp2.setRGB(L.skyH[0], L.skyH[1], L.skyH[2], THREE.SRGBColorSpace);
      // céu fechado perde o tom quente do sol (nuvem de chuva é cinza, não bege)
      u.uLit.value.copy(tmp2).lerp(tmp, (.55 - night * .3) * (1 - W.cover * .65)).multiplyScalar((1.05 - night * .72) * (1 - W.dark * .45));
      { const g = u.uLit.value, l = g.r * .2126 + g.g * .7152 + g.b * .0722, k = Math.min(1, W.dark * 1.1 + Math.max(0, W.cover - .6)); g.r += (l - g.r) * k; g.g += (l - g.g) * k; g.b += (l * 1.05 - g.b) * k; }
      u.uShade.value.copy(tmp2).multiplyScalar((.62 - W.dark * .38) * (1 - night * .55));
      u.uHorizon.value.setRGB(L.fog[0], L.fog[1], L.fog[2], THREE.SRGBColorSpace);
      if (sunDir) u.uSunDir.value.copy(sunDir);
      u.uOpacity.value = .9 - night * .25 + W.dark * .1;
      // chuva
      const rainK = allowRain ? W.rain : 0;
      const n = Math.round(MAX * Math.min(1, rainK) * (lowFps ? .6 : 1));
      rg.setDrawRange(0, n * 2); rain.visible = n > 8;
      if (rain.visible) {
        const ru = rainMat.uniforms; ru.uTime.value = time; ru.uCenter.value.copy(camera.position); ru.uCenter.value.y += 4;
        ru.uSpeed.value = 13 + rainK * 6; ru.uLen.value = .35 + rainK * .5;
        ru.uWind.value.set(Math.sin(windDir) * wind * 6, 0, Math.cos(windDir) * wind * 6);
        ru.uAlpha.value = (.22 + rainK * .3) * (1 - night * .35) + flash * .25;
        ru.uColor.value.setRGB(L.fog[0], L.fog[1], L.fog[2], THREE.SRGBColorSpace).lerp(tmp.setRGB(.8, .84, .9), .5);
      }
      // superfícies molhadas
      for (const w of wetList) {
        if (w.color) w.m.color.copy(w.color).multiplyScalar(1 - w.darken * wetness);
        if (w.rough !== undefined) w.m.roughness = w.rough * (1 - w.roughK * wetness);
      }
    },
    /** fração visível do disco do sol/lua sob as nuvens */
    celestial: celestialVisibility,
    dispose() { for (const o of [dome, rain, bolt]) { scene.remove(o); o.geometry.dispose(); o.material.dispose(); } noise.dispose(); for (const w of wetList) { if (w.color) w.m.color.copy(w.color); if (w.rough !== undefined) w.m.roughness = w.rough; } },
  };
}
