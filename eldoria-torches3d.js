/**
 * Mod 316 — tochas de Eldória: ÚNICA estrutura física permitida é o modelo do criador `TochaMedievalTripo.glb` (Meshy).
 *
 *  - Nenhuma haste, bacia, poste, lanterna ou chama de geometria primitiva é criada aqui ou em qualquer fallback: se o GLB
 *    falhar, nada aparece (e o erro é registrado) — nunca uma tocha genérica.
 *  - O GLB traz o fogo PINTADO na mesma malha do ferro (triângulo plano chapado). Esse trecho é recortado no shader
 *    (só acima da bacia e só nas cores de fogo), preservando haste e bacia 3D originais.
 *  - Fogo: uma chama autoral pequena por tocha, em GPU (ruído turbulento, borda macia, núcleo quente, oscila com o vento),
 *    do tamanho da bacia — não um cone/triângulo. Todas as chamas de um grupo dividem material e geometria.
 *  - Luz: no máximo uma PointLight por tocha, sem sombra; o orçamento global (light-budget3d) escolhe as 4 relevantes.
 *
 * TORCH_SITES documenta onde cada tocha existe e POR QUÊ (poucas, justificadas).
 */
export const TORCH_HEIGHT = 2.05;
/** Altura (fração da altura do modelo) da boca da bacia — medida no GLB: haste até ~0,58, fogo pintado acima. */
export const TORCH_BOWL = .6;

const flameVert = `attribute float aSeed;uniform float uTime;varying vec2 vUv;varying float vSeed;varying float vFlick;
void main(){vUv=uv;vSeed=aSeed;
  float f=.86+.14*sin(uTime*11.+aSeed*17.)*sin(uTime*7.3+aSeed*5.);vFlick=f;
  vec4 c=modelViewMatrix*vec4(position.x*0.,position.y*0.,0.,1.);
  // billboard cilíndrico (sempre de frente, sem girar com o pitch da câmera)
  vec2 q=vec2(position.x*(.9+.1*f),position.y*f);
  vec4 mv=modelViewMatrix*vec4(0.,0.,0.,1.);mv.xy+=q;gl_Position=projectionMatrix*mv;}`;
const flameFrag = `precision highp float;uniform float uTime;uniform float uNight;varying vec2 vUv;varying float vSeed;varying float vFlick;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}
float fb(vec2 p){return n(p)*.55+n(p*2.07+3.1)*.3+n(p*4.3+7.7)*.15;}
void main(){vec2 p=vUv;float y=p.y;
  // coluna turbulenta que sobe; largura afina com a altura e é recortada pelo ruído (sem silhueta de triângulo)
  float t=uTime*1.6+vSeed*9.;float sway=(fb(vec2(y*2.+t*.6,vSeed))-.5)*.28*y;
  float x=(p.x-.5-sway)*2.;float w=mix(.62,.06,pow(y,.8));
  float body=1.-smoothstep(w*.55,w,abs(x));
  float turb=fb(vec2(p.x*3.+vSeed,y*3.2-t));body*=smoothstep(.05,.5,turb+ .55-y*.75);
  body*=smoothstep(0.,.08,y)*(1.-smoothstep(.62,1.,y+ (turb-.5)*.25));
  float core=(1.-smoothstep(.0,w*.55,abs(x)))*(1.-smoothstep(.0,.55,y));
  vec3 col=mix(vec3(1.,.38,.08),vec3(1.,.72,.3),body)+vec3(1.,.93,.7)*core*.9;
  float a=body*(.8+.2*vFlick)*mix(.85,1.,uNight);if(a<.02)discard;gl_FragColor=vec4(col*a*1.25,a);}`;

/** Recorta o fogo pintado no GLB (mesma malha do ferro): só acima da bacia e só pixels com cor de fogo. */
export function maskBakedFlame(source) {
  let n = 0; const seen = new Set();
  source.traverse(o => {
    if (!o.isMesh) return;
    for (const mat of [].concat(o.material)) {
      if (!mat || seen.has(mat)) continue; seen.add(mat); n++;
      const prev = mat.onBeforeCompile;
      mat.onBeforeCompile = (sh, r) => {
        prev && prev(sh, r);
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vTorchY;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvTorchY=position.y;');
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vTorchY;uniform float uTorchTop;uniform float uTorchCut;')
          .replace('#include <map_fragment>', `#include <map_fragment>
            { float k=(vTorchY-uTorchCut)/max(1e-4,uTorchTop-uTorchCut);
              bool hot=diffuseColor.r>diffuseColor.b*1.5&&diffuseColor.r>.3&&diffuseColor.g>.12;
              if(k>.02&&(hot||k>.35))discard; }`);
        sh.uniforms.uTorchTop = { value: mat.userData.torchTop ?? 1 }; sh.uniforms.uTorchCut = { value: mat.userData.torchCut ?? .58 };
      };
      mat.customProgramCacheKey = () => 'tocha-meshy-sem-fogo-pintado';
      mat.needsUpdate = true;
    }
  });
  return n;
}

/**
 * Prepara a fonte compartilhada (uma vez) a partir do glTF: escala para TORCH_HEIGHT, apoio no chão, recorte do fogo pintado.
 * Devolve o Object3D-fonte (clonar por tocha; geometria/material/textura compartilhados).
 */
export function prepareTorchSource(THREE, gltfScene, { prepareBaked } = {}) {
  const src = gltfScene, box = new THREE.Box3().setFromObject(src), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
  if (box.isEmpty() || !(size.y > .001)) return null;
  prepareBaked && prepareBaked(src);
  const k = TORCH_HEIGHT / size.y; src.scale.setScalar(k); src.position.set(-c.x * k, -box.min.y * k, -c.z * k);
  // corte em coordenadas LOCAIS da malha (position.y do atributo)
  src.traverse(o => { if (!o.isMesh) return; o.geometry.computeBoundingBox(); const b = o.geometry.boundingBox; for (const m of [].concat(o.material)) { m.userData.torchCut = b.min.y + (b.max.y - b.min.y) * TORCH_BOWL; m.userData.torchTop = b.max.y; } o.castShadow = false; o.receiveShadow = true; });
  maskBakedFlame(src);
  const wrap = new THREE.Group(); wrap.add(src); wrap.name = 'fonte-tocha-glb'; return wrap;
}

/**
 * Coloca tochas GLB num grupo. sites: [{x, z, y?, why, light?}]. Devolve { holders, lights, flames, update(t, night) }.
 * Sem `source` (GLB falhou) → não cria nada.
 */
export function placeTorches(THREE, parent, source, sites, { ground = () => 0, namePrefix = 'TochaMedievalTripo-', lightIntensity = .55, lightDistance = 11, flames = true } = {}) {
  const out = { holders: [], lights: [], flames: null, update() {} };
  if (!source || !sites.length) return out;
  const geo = new THREE.InstancedBufferGeometry(), quad = new THREE.PlaneGeometry(.34, .62); quad.translate(0, .31, 0);
  geo.index = quad.index; geo.setAttribute('position', quad.attributes.position); geo.setAttribute('uv', quad.attributes.uv);
  const seeds = new Float32Array(sites.length).map((_, i) => (i * 0.6180339) % 1); geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1)); geo.instanceCount = 1;
  const uniforms = { uTime: { value: 0 }, uNight: { value: 0 } };
  const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: flameVert, fragmentShader: flameFrag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  sites.forEach((p, i) => {
    const y = p.y ?? ground(p.x, p.z), holder = new THREE.Group(); holder.name = namePrefix + (i + 1); holder.position.set(p.x, y, p.z); holder.userData.why = p.why || '';
    holder.add(source.clone(true)); parent.add(holder); out.holders.push(holder);
    if (flames) { const g = geo.clone(); g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(new Float32Array([seeds[i]]), 1)); g.instanceCount = 1; const fm = new THREE.Mesh(g, mat); fm.position.set(0, TORCH_HEIGHT * TORCH_BOWL - .03, 0); fm.frustumCulled = false; fm.renderOrder = 6; fm.name = 'chama-autoral'; holder.add(fm); }
    if (p.light !== false) { const l = new THREE.PointLight(0xffa458, lightIntensity, lightDistance, 1.4); l.castShadow = false; l.position.set(0, TORCH_HEIGHT * TORCH_BOWL + .25, 0); l.name = 'tocha-luz'; holder.add(l); out.lights.push({ l, base: lightIntensity }); }
  });
  out.flames = mat;
  out.update = (t, night = 0) => { uniforms.uTime.value = t; uniforms.uNight.value = night; for (const { l, base } of out.lights) l.intensity = base * (.35 + .65 * night) * (.9 + .1 * Math.sin(t * 9 + l.id)); };
  return out;
}

/** Carrega o GLB uma vez (Promise compartilhada). Falha → null + aviso; nunca fallback procedural. */
export function loadTorchSource(THREE, GLTFLoader, opts = {}) {
  return new Promise(res => new GLTFLoader().load('./TochaMedievalTripo.glb', g => res(prepareTorchSource(THREE, g.scene, opts)), undefined, e => { console.warn('TochaMedievalTripo.glb indisponível — nenhuma tocha genérica será criada.', e); res(null); }));
}
