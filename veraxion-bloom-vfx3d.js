/**
 * MISSÃO 21/11 — VFX do FLORESCER ABISSAL (VÉRAXION). Ref. do criador: dezenas de arcos-lâmina curvos rosa-magenta com
 * interior negro/vermelho profundo, irradiando de um núcleo forte, riscos de luz no chão. Tudo é malha 3D real:
 *  • arco = fita-lâmina com seção em losango (4 faces, espessura real) ao longo de um chifre/crescente paramétrico;
 *    gumes rosa-magenta quase brancos no fio, miolo negro translúcido com vermelho profundo, torção e curvatura por
 *    instância; 2 “ecos” por arco desenham a trilha temporal; desintegração por ruído no fim (sem cortar em seco);
 *  • núcleo de carga ENTRE as duas espadas (Fresnel carmim, centro escuro) que cresce até o pulso;
 *  • chão: poça carmim com riscos radiais finos e anel na frente de onda; raios curtos 2–5 ramos com jitter suave.
 * O desenho lê a posição/raio REAL de cada arco da lógica (veraxion-squad3d.js): o que se vê é o que acerta.
 * Orçamento: 5 draws, pools fixos, sem alocação por quadro, sem luz dinâmica; qualidade baixa corta os ecos.
 */
const NOISE = `float h31(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float vnoise(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x),mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y),mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x),mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x),f.y),f.z);}`;
const ARC_V = `attribute float aS,aC;attribute vec4 iA;varying float vS,vC,vA,vU,vSeed;varying vec3 vN,vW;
void main(){vS=aS;vC=aC;vU=iA.x;vSeed=iA.y;vA=iA.w;vec3 p=position;float tw=iA.z*aS*aS*.9;float c=cos(tw),s=sin(tw);p.xz=mat2(c,-s,s,c)*p.xz;
vec4 w=modelMatrix*instanceMatrix*vec4(p,1.);vN=normalize(mat3(modelMatrix)*mat3(instanceMatrix)*normal);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`;
const ARC_F = `uniform float uTime;varying float vS,vC,vA,vU,vSeed;varying vec3 vN,vW;${NOISE}
void main(){vec3 V=normalize(cameraPosition-vW),N=normalize(vN);float fr=pow(1.-abs(dot(N,V)),2.);float e=abs(vC);
float n=vnoise(vec3(vS*9.-uTime*3.,vC*3.,vSeed*13.))*.7+vnoise(vec3(vS*31.,vSeed,uTime*2.))*.3;
float dis=smoothstep(.55,1.,vU);if(n<dis*1.05||vA<.01)discard; // desintegração no fim do arco
float vein=smoothstep(.62,.7,vnoise(vec3(vS*22.,vC*6.,vSeed*7.+uTime*.5)));
vec3 core=vec3(.012,0.,.008)+vec3(.32,0.,.035)*(vein*.8+smoothstep(.45,.8,n)*.35)*(1.-e*.6);
vec3 edgeC=mix(vec3(1.,.1,.55),vec3(1.,.9,.97),pow(smoothstep(.86,1.,e),2.));
float edge=smoothstep(.62,.95,e)+fr*.15;vec3 col=mix(core,edgeC*1.3,clamp(edge,0.,1.));col+=vec3(.9,.1,.45)*smoothstep(dis*1.05,dis*1.05+.06,n)*dis*1.5;
float a=vA*mix(.86,1.,clamp(edge,0.,1.))*(1.-smoothstep(.93,1.,vS)*.5);gl_FragColor=vec4(col,a);}`;
const CORE_V = `varying vec3 vN,vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vN=normalize(mat3(modelMatrix)*normal);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`;
const CORE_F = `uniform float uK,uFlash;varying vec3 vN,vW;void main(){float f=1.-abs(dot(normalize(vN),normalize(cameraPosition-vW)));
vec3 c=mix(vec3(.05,0.,.02),vec3(1.,.15,.45),pow(f,1.4))+vec3(1.,.8,.92)*uFlash*(1.-f);gl_FragColor=vec4(c,clamp(.35+f*.9+uFlash,0.,1.)*uK);}`;
const GROUND_F = `uniform float uTime,uR,uK,uSeed;varying vec2 vUv;${NOISE}
void main(){vec2 p=(vUv*2.-1.)*16.;float r=length(p),a=atan(p.y,p.x);float pool=(1.-smoothstep(.0,2.4,r))*.75;
float rays=pow(max(0.,vnoise(vec3(a*9.,uSeed,0.))*1.3-.3),5.)*smoothstep(uR+.4,uR-1.,r)*smoothstep(.6,1.6,r)*(1.-r/16.);
float ring=smoothstep(.35,0.,abs(r-uR))*.7*(1.-uR/16.);float cr=smoothstep(.93,.97,1.-abs(vnoise(vec3(p*1.3,uSeed))*2.-1.))*smoothstep(uR,uR-2.,r)*.35*(1.-r/16.);
vec3 c=vec3(.35,0.,.05)*pool+vec3(1.,.3,.72)*(rays*1.6+ring)+vec3(.6,0.,.1)*cr;float al=clamp(pool*.8+rays+ring+cr,0.,1.)*uK;gl_FragColor=vec4(c,al);}`;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v, ease = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };

export function createVeraxionBloomVFX(T, scene) {
  const root = new T.Group(); root.name = 'VeraxionFlorescerVFX'; scene.add(root); let time = 0, low = false;
  /* ---- fita-lâmina em crescente (local: +X radial para fora, +Y para cima, +Z tangencial) ---- */
  const arcGeo = (() => { const SN = 26, P = [], S = [], C = [], I = [], ring = [[1, 0], [0, 1], [-1, 0], [0, -1]], CN = 4;
    const curve = s => [.55 * Math.sin(Math.PI * s * .95) - .62 * s * s * s, s * (1.05 - .15 * s), 0];
    for (let i = 0; i < SN; i++) { const s = i / (SN - 1), c = curve(s), c2 = curve(Math.min(1, s + .01)), c1 = curve(Math.max(0, s - .01));
      const tx = c2[0] - c1[0], ty = c2[1] - c1[1], tl = Math.hypot(tx, ty) || 1, nx = ty / tl, ny = -tx / tl; // normal no plano radial
      const w = .11 * Math.pow(Math.sin(Math.PI * s), .85) + .003, th = .03 * Math.sin(Math.PI * s) + .002;
      for (const [u, v] of ring) { P.push(c[0] + nx * w * u, c[1] + ny * w * u, th * v); S.push(s); C.push(u); } }
    for (let i = 0; i < SN - 1; i++) for (let j = 0; j < CN; j++) { const a = i * CN + j, b = i * CN + (j + 1) % CN, c = a + CN, d = b + CN; I.push(a, c, b, b, c, d); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setAttribute('aS', new T.Float32BufferAttribute(S, 1)); g.setAttribute('aC', new T.Float32BufferAttribute(C, 1)); g.setIndex(I); g.computeVertexNormals(); return g; })();
  const MAX = 24 * 3, iA = new Float32Array(MAX * 4), arcs = new T.InstancedMesh(arcGeo, new T.ShaderMaterial({ uniforms: { uTime: { value: 0 } }, vertexShader: ARC_V, fragmentShader: ARC_F, transparent: true, depthWrite: false, side: T.DoubleSide }), MAX);
  arcGeo.setAttribute('iA', new T.InstancedBufferAttribute(iA, 4).setUsage(T.DynamicDrawUsage)); arcs.instanceMatrix.setUsage(T.DynamicDrawUsage); arcs.frustumCulled = false; arcs.renderOrder = 11; arcs.count = 0; root.add(arcs);
  /* ---- núcleo de carga + pulso ---- */
  const coreU = { uK: { value: 0 }, uFlash: { value: 0 } }, core = new T.Mesh(new T.IcosahedronGeometry(1, 3), new T.ShaderMaterial({ uniforms: coreU, vertexShader: CORE_V, fragmentShader: CORE_F, transparent: true, depthWrite: false }));
  core.visible = false; core.renderOrder = 12; root.add(core);
  /* ---- chão ---- */
  const gU = { uTime: { value: 0 }, uR: { value: 0 }, uK: { value: 0 }, uSeed: { value: 0 } }, ground = new T.Mesh(new T.PlaneGeometry(32, 32), new T.ShaderMaterial({ uniforms: gU, vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}', fragmentShader: GROUND_F, transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
  ground.rotation.x = -Math.PI / 2; ground.visible = false; ground.renderOrder = 4; root.add(ground);
  /* ---- raios curtos (2–5 ramos, jitter interpolado no tempo) ---- */
  const LB = 5, LS = 7, lp = new Float32Array(LB * LS * 2 * 3), lines = new T.LineSegments(new T.BufferGeometry(), new T.LineBasicMaterial({ color: 0xffb8e6, transparent: true, opacity: .9, blending: T.AdditiveBlending, depthWrite: false }));
  lines.geometry.setAttribute('position', new T.BufferAttribute(lp, 3).setUsage(T.DynamicDrawUsage)); lines.frustumCulled = false; lines.visible = false; root.add(lines);
  const _m = new T.Matrix4(), _q = new T.Quaternion(), _e = new T.Euler(), _p = new T.Vector3(), _s = new T.Vector3();
  let cast = null, waves = null, flash = 0, lightT = 0, origin = { x: 0, y: 0, z: 0 }, gy = 0;
  const hash = (a, b) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
  return {
    root,
    /** Carga: ponto médio REAL entre as duas espadas e intensidade 0..1. */
    charge(p, k) { core.visible = k > .01; core.position.copy(p); core.scale.setScalar(.08 + .32 * ease(k)); coreU.uK.value = clamp(k * 1.3, 0, 1); coreU.uFlash.value = 0; cast = { p: p.clone ? p.clone() : p }; },
    release(p, ground0) { flash = 1; origin = { x: p.x, y: p.y, z: p.z }; gy = ground0; core.visible = true; ground.visible = true; ground.position.set(p.x, gy + .03, p.z); gU.uSeed.value = Math.random() * 20; gU.uK.value = 1; lines.visible = true; },
    /** Lê as ondas lógicas (a.vxBloom) e desenha cada arco na sua frente de onda real. */
    sync(list) { if (list && list.length) waves = list; },
    update(dt, quality = 1) { time += dt; low = quality === 0; arcs.material.uniforms.uTime.value = time; gU.uTime.value = time;
      if (flash > 0) { flash = Math.max(0, flash - dt * 3.2); coreU.uFlash.value = flash; coreU.uK.value = Math.max(coreU.uK.value * Math.exp(-dt * 2), flash); core.scale.setScalar(.4 + (1 - flash) * 1.4); if (flash <= 0) core.visible = false; }
      let n = 0, maxR = 0;
      if (waves) for (const w of waves) for (const c of w.arcs) { if (c.age < 0 && c.alive) continue; if (!c.alive && !c.fx) { c.fx = { t: 0, r: c.r }; } const dead = c.fx; if (dead) { dead.t += dt; if (dead.t > .3) continue; }
        const r = dead ? dead.r : c.r, life = clamp((dead ? 1 : 0) * .55 + (r / 15) * .5 + (dead ? dead.t / .3 * .45 : 0), 0, 1), grow = ease((r - .3) / 2.4), big = c.big ? 1.45 : 1;
        for (let e = 0; e < (low ? 1 : 3); e++) { if (n >= MAX) break; const re = Math.max(.3, r - e * .55), al = (e === 0 ? 1 : e === 1 ? .32 : .12) * (dead ? 1 - dead.t / .3 : 1) * Math.min(1, (c.age + .05) / .08);
          const h = c.h * big * (.35 + .65 * grow) * (1 + re / 15 * .55), lean = .25 + .25 * Math.sin(c.th * 3 + w.id);
          _p.set(w.ox + Math.sin(c.th) * re, w.oy + .02, w.oz + Math.cos(c.th) * re);
          _e.set(0, c.th - Math.PI / 2, lean * c.curl * .5, 'YXZ'); _q.setFromEuler(_e); _s.set(h * (1 + e * .08), h, h);
          _m.compose(_p, _q, _s); arcs.setMatrixAt(n, _m); iA[n * 4] = life; iA[n * 4 + 1] = (c.th * 7.13) % 1; iA[n * 4 + 2] = c.curl; iA[n * 4 + 3] = al; n++; }
        maxR = Math.max(maxR, r); }
      if (waves && !n && waves.every(w => w.arcs.every(c => !c.alive))) waves = null;
      arcs.count = n; arcs.instanceMatrix.needsUpdate = true; arcGeo.attributes.iA.needsUpdate = true;
      if (ground.visible) { gU.uR.value = maxR; if (!waves || !n) { gU.uK.value = Math.max(0, gU.uK.value - dt * 2.2); if (gU.uK.value <= 0) ground.visible = false; } }
      // raios: ramos do núcleo até a base de arcos próximos, só no pico (fade rápido)
      lightT += dt; const k = waves && n ? clamp(1 - (maxR - 1) / 5, 0, 1) : 0; lines.visible = k > .02; lines.material.opacity = .9 * k;
      if (lines.visible) { const step = Math.floor(lightT / .05), u = (lightT % .05) / .05; let o = 0; const W0 = waves[0]; const nb = 2 + Math.floor(hash(step, 1) * 4);
        for (let b = 0; b < LB; b++) { const c = W0.arcs[(b * 5 + step) % W0.arcs.length], on = b < nb; let px = origin.x, py = origin.y, pz = origin.z;
          const tx = W0.ox + Math.sin(c.th) * c.r, tz = W0.oz + Math.cos(c.th) * c.r, ty = gy + .3;
          for (let i = 0; i < LS; i++) { const f = (i + 1) / LS, j = (hash(step + i, b) * (1 - u) + hash(step + 1 + i, b) * u - .5) * .5 * Math.sin(Math.PI * f);
            const nx = origin.x + (tx - origin.x) * f + j, ny = py + (ty - origin.y) / LS + j * .4, nz = origin.z + (tz - origin.z) * f - j;
            if (on) { lp[o++] = px; lp[o++] = py; lp[o++] = pz; lp[o++] = nx; lp[o++] = ny; lp[o++] = nz; } else { for (let q = 0; q < 6; q++) lp[o++] = 0; } px = nx; py = ny; pz = nz; } }
        lines.geometry.attributes.position.needsUpdate = true; }
      if (cast && !flash && core.visible && coreU.uK.value < .01) core.visible = false; },
    endCharge() { if (!flash) { core.visible = false; coreU.uK.value = 0; } },
    stats() { return { arcs: arcs.count, core: core.visible, ground: ground.visible, rays: lines.visible }; },
    clear() { waves = null; arcs.count = 0; core.visible = false; ground.visible = false; lines.visible = false; flash = 0; },
    dispose() { this.clear(); scene.remove(root); for (const m of [arcs, core, ground, lines]) { m.geometry.dispose(); m.material.dispose(); } arcs.dispose(); }
  };
}
