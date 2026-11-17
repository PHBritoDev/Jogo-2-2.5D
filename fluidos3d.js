/**
 * Mod 326 — fluidos de jogo: água, cachoeiras e lava que se MOVEM e RESPONDEM ao mundo.
 *
 * O que é simulado de verdade (CPU, domínio local, custo fixo):
 *  • createRippleSim — equação de onda 2D (águas rasas linearizadas) numa grade 64×64 de 0,5 m (32×32 m) que acompanha o
 *    herói. Pés, gotas e o impacto da cachoeira empurram a superfície; as ondas se propagam (c ≈ 3 m/s), refletem
 *    nada (o domínio é aberto) e se amortecem. 30 passos/s, ~4 mil células: <0,2 ms. O resultado (altura, inclinação e
 *    espuma) vai para uma textura RGBA8 lida pelo shader da água (deslocamento do vértice + normal + espuma).
 *  • createSpray — gotículas balísticas (gravidade, arrasto) num pool fixo de pontos; ao cair na água viram ondas.
 * O que é aproximação visual (shader, sem custo de CPU):
 *  • fluxo da água por "flow map" em duas fases (normais que correm na direção do rio/da saída do poço sem esticar),
 *    anéis do impacto da cachoeira, cor por PROFUNDIDADE real (atributo aDepth = superfície − leito, calculado do relevo),
 *    borda que some na margem (sem disco/placa), fresnel com a cor do céu;
 *  • cortina da cachoeira: largura e balanço variando no tempo, véus que se rompem ao cair, bordas que se desfazem;
 *  • lava: placas de crosta (Voronoi) arrastadas pelo campo de fluxo, fissuras incandescentes, borda que esfria em
 *    basalto, pulsação de calor. O contorno da poça/canal é o MESMO usado para o dano (heatAt).
 */

// ---------------------------------------------------------------- simulação de ondulações
export function createRippleSim(T, { res = 64, cell = .5, speed = 3, damping = .984, hz = 30 } = {}) {
  const N = res, size = N * cell; let h0 = new Float32Array(N * N), h1 = new Float32Array(N * N), h2 = new Float32Array(N * N);
  const data = new Uint8Array(N * N * 4); for (let i = 0; i < N * N; i++) { data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = 128; data[i * 4 + 3] = 0; }
  const tex = new T.DataTexture(data, N, N, T.RGBAFormat); tex.magFilter = tex.minFilter = T.LinearFilter; tex.wrapS = tex.wrapT = T.ClampToEdgeWrapping; tex.needsUpdate = true;
  const texU = { value: tex }, originU = { value: new T.Vector3(-1e5, -1e5, size) };
  let ox = -1e5, oz = -1e5, acc = 0, active = 0; const c2 = (speed * (1 / hz) / cell) ** 2;
  const idx = (i, j) => j * N + i;
  function shift(di, dj) { // recentra sem perder as ondas que continuam dentro do domínio
    for (const a of [h0, h1]) { h2.fill(0); for (let j = 0; j < N; j++) { const sj = j + dj; if (sj < 0 || sj >= N) continue; for (let i = 0; i < N; i++) { const si = i + di; if (si >= 0 && si < N) h2[idx(i, j)] = a[idx(si, sj)]; } } a.set(h2); }
  }
  return {
    texU, originU, size,
    /** mantém o domínio centrado no ponto (em passos inteiros de célula). */
    follow(x, z) { const nx = Math.round((x - size / 2) / cell) * cell, nz = Math.round((z - size / 2) / cell) * cell; if (Math.abs(nx - ox) < 4 * cell && Math.abs(nz - oz) < 4 * cell) return;
      const di = Math.round((nx - ox) / cell), dj = Math.round((nz - oz) / cell); if (Math.abs(di) < N && Math.abs(dj) < N) shift(di, dj); else { h0.fill(0); h1.fill(0); } ox = nx; oz = nz; originU.value.set(ox, oz, size); },
    /** empurra a superfície (m; negativo afunda) num raio (m) em torno de (x,z). */
    disturb(x, z, amount, radius = .6) { const ci = (x - ox) / cell, cj = (z - oz) / cell, r = Math.max(1, radius / cell); if (ci < -r || cj < -r || ci > N + r || cj > N + r) return;
      for (let j = Math.max(1, Math.floor(cj - r)); j <= Math.min(N - 2, Math.ceil(cj + r)); j++) for (let i = Math.max(1, Math.floor(ci - r)); i <= Math.min(N - 2, Math.ceil(ci + r)); i++) { const d2 = ((i - ci) ** 2 + (j - cj) ** 2) / (r * r); if (d2 < 1) h1[idx(i, j)] += amount * (1 - d2) * (1 - d2); } active = 2.5; },
    inside(x, z) { return x > ox && z > oz && x < ox + size && z < oz + size; },
    step(dt) { acc = Math.min(acc + dt, 3 / hz); let stepped = false; if (active <= 0) return false;
      while (acc >= 1 / hz) { acc -= 1 / hz; stepped = true; active -= 1 / hz;
        for (let j = 1; j < N - 1; j++) for (let i = 1; i < N - 1; i++) { const k = idx(i, j), lap = h1[k - 1] + h1[k + 1] + h1[k - N] + h1[k + N] - 4 * h1[k]; h2[k] = (2 * h1[k] - h0[k] + c2 * lap) * damping; }
        const t = h0; h0 = h1; h1 = h2; h2 = t; }
      if (!stepped) return false;
      let peak = 0; for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const k = idx(i, j), h = h1[k], sx = (h1[idx(Math.min(N - 1, i + 1), j)] - h1[idx(Math.max(0, i - 1), j)]) / (2 * cell), sz = (h1[idx(i, Math.min(N - 1, j + 1))] - h1[idx(i, Math.max(0, j - 1))]) / (2 * cell), v = Math.abs(h - h0[k]) * hz;
        data[k * 4] = Math.max(0, Math.min(255, 128 + h * 512)); data[k * 4 + 1] = Math.max(0, Math.min(255, 128 + sx * 160)); data[k * 4 + 2] = Math.max(0, Math.min(255, 128 + sz * 160)); data[k * 4 + 3] = Math.min(255, (Math.abs(h) * 14 + v * .9) * 255); if (Math.abs(h) > peak) peak = Math.abs(h); }
      if (peak > .002) active = Math.max(active, .5); tex.needsUpdate = true; return true; },
    peakAt(x, z) { const i = Math.round((x - ox) / cell), j = Math.round((z - oz) / cell); return i >= 0 && j >= 0 && i < N && j < N ? h1[idx(i, j)] : 0; }
  };
}

// ---------------------------------------------------------------- material da água
const NOISE = 'float wh(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float wn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(wh(i),wh(i+vec2(1,0)),f.x),mix(wh(i+vec2(0,1)),wh(i+1.),f.x),f.y);}vec2 wg(vec2 p){float e=.2;return vec2(wn(p+vec2(e,0.))-wn(p-vec2(e,0.)),wn(p+vec2(0.,e))-wn(p-vec2(0.,e)))/(2.*e);}';
/** Água rasa/rio/poço. Geometria precisa de aDepth (m, superfície − leito; negativo = margem seca) e aFlow (m/s em xz). */
export function createWaterMaterial(T, { sim, time, shallow = 0x3f7a74, deep = 0x0a2c38, sky = 0x9fb8cc } = {}) {
  const m = new T.MeshStandardMaterial({ color: 0xffffff, roughness: .07, metalness: .02, transparent: true, depthWrite: false });
  const imp = [0, 1, 2].map(() => new T.Vector4(0, 0, 0, 0));
  const u = { uT: time, uRip: sim.texU, uRipO: sim.originU, uShallow: { value: new T.Color(shallow) }, uDeep: { value: new T.Color(deep) }, uSky: { value: new T.Color(sky) }, uImp: { value: imp } };
  m.userData.water = u;
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aDepth;attribute vec2 aFlow;uniform float uT;uniform sampler2D uRip;uniform vec3 uRipO;varying float vDepth;varying vec2 vFlow;varying vec3 vWp;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
vec4 wp0=modelMatrix*vec4(transformed,1.);vec2 ruv=(wp0.xz-uRipO.xy)/uRipO.z;float rh=0.;
if(ruv.x>.01&&ruv.x<.99&&ruv.y>.01&&ruv.y<.99)rh=(texture2D(uRip,ruv).r-.5)*.5;
float sw=smoothstep(0.,.3,aDepth);transformed.y+=(rh+.02*sin(dot(wp0.xz,vec2(.31,.17))+uT*1.3)+.014*sin(dot(wp0.xz,vec2(-.23,.41))-uT*1.7))*sw;vDepth=aDepth;vFlow=aFlow;`)
      .replace('#include <project_vertex>', '#include <project_vertex>\nvWp=(modelMatrix*vec4(transformed,1.)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform float uT;uniform sampler2D uRip;uniform vec3 uRipO,uShallow,uDeep,uSky;uniform vec4 uImp[3];varying float vDepth;varying vec2 vFlow;varying vec3 vWp;${NOISE}
vec2 flowG(vec2 p,vec2 fl){float a=fract(uT*.22),b=fract(uT*.22+.5);float w=abs(a*2.-1.);vec2 g0=wg(p*.8-fl*a*1.6)*.65+wg(p*2.1-fl*a*2.4+3.1)*.35;vec2 g1=wg(p*.8-fl*b*1.6+7.3)*.65+wg(p*2.1-fl*b*2.4+1.7)*.35;return mix(g0,g1,w);}
vec3 wN;float wFoam;float wFres;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
{vec2 p=vWp.xz;vec2 fl=vFlow;float sp=length(fl);vec2 g=flowG(p*.55,fl*1.4)*(.18+.25*min(sp,1.5))+wg(p*.35+uT*.04)*.08;
vec2 ruv=(p-uRipO.xy)/uRipO.z;vec4 rp=vec4(.5,.5,.5,0.);if(ruv.x>.01&&ruv.x<.99&&ruv.y>.01&&ruv.y<.99)rp=texture2D(uRip,ruv);g+=(rp.gb-.5)*1.6;
float impF=0.;for(int i=0;i<3;i++){vec4 I=uImp[i];if(I.z<=0.)continue;vec2 d=p-I.xy;float r=length(d)+.001;float env=exp(-r*I.w)*I.z;float ph=r*2.6-uT*5.2+wn(p*.6+uT*.3)*2.;g+=d/r*cos(ph)*env*.35;impF+=env*smoothstep(.42,.78,wn(p*1.3-d/r*uT*1.2)+.35*exp(-r*.8));}
float dep=max(vDepth,0.);float shore=smoothstep(0.,.16,vDepth);
float sf=smoothstep(.2,.0,dep)*smoothstep(.38,.7,wn(p*1.6+fl*uT*.6+uT*.15))*shore;
vec2 fd=normalize(fl+1e-4);float strk=smoothstep(.7,.95,wn(vec2(dot(p,fd)*.45-uT*sp*.9,dot(p,vec2(-fd.y,fd.x))*1.3))*.6+wn(p*1.9-fl*uT)*.4)*smoothstep(.3,1.2,sp);
wFoam=clamp(sf+rp.a*.9+impF+strk*.18,0.,1.);
wN=normalize(vec3(-g.x,1.,-g.y));vec3 vd=normalize(cameraPosition-vWp);wFres=.03+.97*pow(1.-max(dot(wN,vd),0.),5.);
vec3 wc=mix(uShallow,uDeep,1.-exp(-dep*.85));
diffuseColor.rgb=mix(wc,vec3(.93,.97,1.),wFoam);
diffuseColor.a=shore*clamp(mix(.38,.9,1.-exp(-dep*1.3))+wFres*.45+wFoam*.6,0.,.97);}`)
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal=normalize((viewMatrix*vec4(wN,0.)).xyz);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance+=uSky*wFres*.55*(1.-wFoam);');
  };
  m.customProgramCacheKey = () => 'agua-mod326';
  return m;
}

/** Faixa de água ao longo de uma curva (rio): aDepth do relevo, aFlow pela tangente. */
export function riverGeometry(T, curve, { height, level, halfW = 5.6, cross = 8, N = 160, speed = .9 } = {}) {
  const pos = [], dep = [], flow = [], idx = [];
  const lv = []; for (let i = 0; i <= N; i++) { const y = level(i / N, curve.getPoint(i / N)); lv.push(i ? Math.min(y, lv[i - 1] + .08) : y); } // o nível acompanha as ondulações do leito (até +8 cm por amostra), mas não sobe o morro do fim do rio como uma fita
  for (let i = 0; i <= N; i++) { const u = i / N, c = curve.getPoint(u), t = curve.getTangent(u), sx = -t.z, sz = t.x, y = lv[i];
    for (let k = 0; k <= cross; k++) { const o = (k / cross * 2 - 1) * halfW, x = c.x + sx * o, z = c.z + sz * o, g = height(x, z); pos.push(x, y, z); dep.push(y - g); const v = speed * (1 - .55 * (o / halfW) ** 2); flow.push(t.x * v, t.z * v); } }
  const W = cross + 1; for (let i = 0; i < N; i++) for (let k = 0; k < cross; k++) { const a = i * W + k, b = a + W; if (dep[a] < -.4 && dep[a + 1] < -.4 && dep[b] < -.4 && dep[b + 1] < -.4) continue; idx.push(a, a + 1, b, a + 1, b + 1, b); } // face para cima
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('aDepth', new T.Float32BufferAttribute(dep, 1)); g.setAttribute('aFlow', new T.Float32BufferAttribute(flow, 2));
  g.setIndex(idx); g.computeVertexNormals(); g.computeBoundingSphere(); return g;
}
/** Poço/lago com superfície plana em `level`: grade polar irregular que vai além da margem (aDepth negativo = seco, some). */
export function poolGeometry(T, { x, z, r, level, height, flowAt = () => [0, 0], rings = 14, segs = 56 } = {}) {
  const pos = [], dep = [], flow = [], idx = [];
  for (let j = 0; j <= rings; j++) for (let i = 0; i < segs; i++) { const a = i / segs * Math.PI * 2, rr = r * Math.pow(j / rings, .8), px = x + Math.cos(a) * rr, pz = z + Math.sin(a) * rr; pos.push(px, level, pz); dep.push(level - height(px, pz)); const f = flowAt(px, pz); flow.push(f[0], f[1]); }
  for (let j = 0; j < rings; j++) for (let i = 0; i < segs; i++) { const a = j * segs + i, b = j * segs + (i + 1) % segs, c = a + segs, d = b + segs; if (Math.max(dep[a], dep[b], dep[c], dep[d]) < -.3) continue; idx.push(a, b, c, b, d, c); } // face para cima
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('aDepth', new T.Float32BufferAttribute(dep, 1)); g.setAttribute('aFlow', new T.Float32BufferAttribute(flow, 2));
  g.setIndex(idx); g.computeVertexNormals(); g.computeBoundingSphere(); return g;
}

// ---------------------------------------------------------------- gotículas balísticas
export function createSpray(T, { max = 220, color = 0xeef6ff, size = .16 } = {}) {
  const P = new Float32Array(max * 3), V = new Float32Array(max * 3), L = new Float32Array(max), LS = new Float32Array(max), S = new Float32Array(max), F = new Float32Array(max);
  const g = new T.BufferGeometry(); const pa = new T.BufferAttribute(P, 3), la = new T.BufferAttribute(L, 1), sa = new T.BufferAttribute(S, 1); pa.setUsage(T.DynamicDrawUsage); la.setUsage(T.DynamicDrawUsage); sa.setUsage(T.DynamicDrawUsage);
  g.setAttribute('position', pa); g.setAttribute('aLife', la); g.setAttribute('aSize', sa); g.setDrawRange(0, max);
  const mat = new T.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uC: { value: new T.Color(color) }, uPx: { value: 380 } },
    vertexShader: 'attribute float aLife,aSize;uniform float uPx;varying float vA;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;gl_PointSize=aLife>0.?clamp(aSize*uPx/-mv.z,1.,48.):0.;vA=aLife;}',
    fragmentShader: 'uniform vec3 uC;varying float vA;void main(){vec2 q=gl_PointCoord-.5;float d=dot(q,q)*4.;if(d>1.)discard;gl_FragColor=vec4(uC,(1.-d)*smoothstep(0.,.25,vA)*.75);}' });
  const pts = new T.Points(g, mat); pts.frustumCulled = false; pts.name = 'fluido-gotas'; pts.renderOrder = 6;
  let next = 0;
  return {
    points: pts,
    emit(x, y, z, vx, vy, vz, life = 1, sz = size, floorY = -1e9) { const i = next; next = (next + 1) % max; P[i * 3] = x; P[i * 3 + 1] = y; P[i * 3 + 2] = z; V[i * 3] = vx; V[i * 3 + 1] = vy; V[i * 3 + 2] = vz; L[i] = 1; LS[i] = 1 / life; S[i] = sz; F[i] = floorY; },
    /** onLand(x,z,energia): gota que tocou o nível do chão/água (vira onda). */
    update(dt, onLand) { let any = false; for (let i = 0; i < max; i++) { if (L[i] <= 0) continue; any = true; V[i * 3 + 1] -= 9.8 * dt; const drag = 1 - .35 * dt; V[i * 3] *= drag; V[i * 3 + 2] *= drag;
        P[i * 3] += V[i * 3] * dt; P[i * 3 + 1] += V[i * 3 + 1] * dt; P[i * 3 + 2] += V[i * 3 + 2] * dt; L[i] -= dt * LS[i];
        if (P[i * 3 + 1] < F[i]) { if (onLand && L[i] > .05) onLand(P[i * 3], P[i * 3 + 2], -V[i * 3 + 1]); L[i] = 0; } }
      if (any) { pa.needsUpdate = la.needsUpdate = sa.needsUpdate = true; } pts.visible = any; }
  };
}

// ---------------------------------------------------------------- cortina de cachoeira
/** Material das quedas: largura/balanço no tempo (vértice), véus que se rompem ao cair, bordas vivas, espuma no lábio e no pé. */
export function createFallMaterial(T, { time, tint = [.72, .86, .95], alpha = .95, speed = 7, fade = [1e9, 1e9], sway = .25 } = {}) {
  return new T.ShaderMaterial({ transparent: true, depthWrite: false, side: T.DoubleSide,
    uniforms: { uT: time, uLen: { value: 1 }, uW: { value: 10 }, uV: { value: speed }, uTint: { value: new T.Color(...tint) }, uA: { value: alpha }, uF: { value: new T.Vector2(...fade) }, uSide: { value: new T.Vector3(1, 0, 0) }, uSway: { value: sway } },
    vertexShader: 'attribute float aL;uniform float uT,uLen,uW,uSway;uniform vec3 uSide;varying vec2 vU;varying float vL;void main(){vU=uv;vL=aL;vec3 p=position;float y=uv.y,s=uv.x-.5,k=smoothstep(0.,uLen*.25,y);' +
      'p+=uSide*s*uW*(.09*sin(uT*1.9+y*.33+aL*2.)+.06*sin(uT*3.1-y*.7))*k;p+=uSide*uSway*(sin(uT*.9+y*.14)+.5*sin(uT*2.3+y*.41))*k;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}',
    fragmentShader: 'uniform float uT,uLen,uA,uW,uV;uniform vec3 uTint;uniform vec2 uF;varying vec2 vU;varying float vL;' + NOISE +
      'void main(){float x=vU.x,y=vU.y,xm=x*uW,yy=y-uT*uV*(1.+vL*.35);float n1=wn(vec2(xm*1.1+vL*5.,yy*.055)),n2=wn(vec2(xm*2.9+7.,yy*.14)),n3=wn(vec2(xm*.3-3.+vL*2.,yy*.02-uT*.05));' +
      'float streak=smoothstep(.3,.9,n1*.55+n2*.45);float fall=smoothstep(0.,uLen,y);' +
      'float mass=smoothstep(.18,.62,wn(vec2(xm*.42+vL*3.,yy*.012+uT*.04))+.28);' +
      'float br=wn(vec2(xm*.75+vL*4.,yy*.085));float hole=smoothstep(.2+.38*fall,.62+.2*fall,br+.38);' +
      'float en=wn(vec2(yy*.12,vL*9.+x*3.));float ew=.05+.22*en;float edge=smoothstep(0.,ew,x)*smoothstep(1.,1.-ew,x);' +
      'float drops=step(.86,wn(vec2(xm*5.,yy*.9)))*(1.-edge)*smoothstep(.0,.3,min(x,1.-x)+.25)*fall;' +
      'float top=smoothstep(3.5,0.,y),foot=smoothstep(uLen-6.,uLen-1.,y);' +
      'float churn=0.;for(int k=0;k<3;k++){float f=.3+.24*float(k);churn+=exp(-pow((y-uLen*f)/(1.1+.3*float(k)),2.))*smoothstep(.35,.75,wn(vec2(xm*1.7+float(k)*5.,yy*.3)));}' +
      'vec3 c=mix(uTint*.7,vec3(1.),clamp(streak*.75+foot*.8+top*.5+drops+churn*.9,0.,1.));' +
      'float a=(edge*mass*hole*(.58+.42*streak)+drops*.7+churn*edge*.35)*uA*(1.-.42*vL)*(1.-smoothstep(uF.x,uF.y,y))*smoothstep(0.,1.5,y);gl_FragColor=vec4(c,min(a,.97));}' });
}
/** Faixa curva (duas camadas) ao longo do caminho da água; o fundo acaba ABAIXO da superfície do poço (sem ponta seca). */
export function curtainGeometry(T, path, side, width, bulge, segs = 8, out = null) {
  const pos = [], uv = [], al = [], idx = []; let len = 0; const cum = [0]; for (let i = 1; i < path.length; i++) { len += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y, path[i].z - path[i - 1].z); cum.push(len); }
  for (const L of [0, 1]) { const base = pos.length / 3;
    for (let i = 0; i < path.length; i++) { const P = path[i], Q = path[Math.min(path.length - 1, i + 1)], R0 = path[Math.max(0, i - 1)], tx = Q.x - R0.x, ty = Q.y - R0.y, tz = Q.z - R0.z, tl = Math.hypot(tx, ty, tz) || 1;
      let nx = side[1] * ty / tl, ny = (side[0] * tz - side[1] * tx) / tl, nz = -side[0] * ty / tl; const nl = (Math.hypot(nx, ny, nz) || 1) * (out && nx * out[0] + ny * out[1] + nz * out[2] < 0 ? -1 : 1); nx /= nl; ny /= nl; nz /= nl;
      const w = width(cum[i] / len), off = L ? -.45 : 0;
      for (let k = 0; k <= segs; k++) { const sx = k / segs - .5, b = Math.sin(Math.PI * (k / segs)) * bulge * (L ? .6 : 1) + off; pos.push(P.x + side[0] * sx * w + nx * b, P.y + ny * b, P.z + side[1] * sx * w + nz * b); uv.push(k / segs, cum[i]); al.push(L); } }
    for (let i = 0; i < path.length - 1; i++) for (let k = 0; k < segs; k++) { const a = base + i * (segs + 1) + k, b2 = a + segs + 1; idx.push(a, b2, a + 1, a + 1, b2, b2 + 1); } }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setAttribute('aL', new T.Float32BufferAttribute(al, 1)); g.setIndex(idx); g.computeBoundingSphere();
  return { g, len };
}
export function makeFall(T, path, side, width, bulge, mat, segs = 8, out = null) {
  const { g, len } = curtainGeometry(T, path, side, width, bulge, segs, out); mat.uniforms.uLen.value = len; mat.uniforms.uW.value = width(.5); mat.uniforms.uSide.value.set(side[0], 0, side[1]); return new T.Mesh(g, mat);
}

// ---------------------------------------------------------------- lava
const LAVA_FRAG = `#include <common>
#include <fog_pars_fragment>
uniform float uT;varying vec2 vP;varying float vE;varying vec2 vF;
vec2 lh(vec2 p){p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)));return fract(sin(p)*43758.5453);}
float ln(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);float a=fract(sin(dot(i,vec2(12.9,78.2)))*43758.5),b=fract(sin(dot(i+vec2(1,0),vec2(12.9,78.2)))*43758.5),c=fract(sin(dot(i+vec2(0,1),vec2(12.9,78.2)))*43758.5),d=fract(sin(dot(i+1.,vec2(12.9,78.2)))*43758.5);return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}
vec2 vor(vec2 x){vec2 n=floor(x),f=fract(x);float F1=8.,F2=8.;for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){vec2 g=vec2(float(i),float(j)),o=lh(n+g);o=.5+.42*sin(uT*.12+6.2831*o);vec2 r=g+o-f;float d=dot(r,r);if(d<F1){F2=F1;F1=d;}else if(d<F2)F2=d;}return vec2(sqrt(F1),sqrt(F2));}
void main(){
 vec2 p=vP*.45-vF*uT*.45;vec2 w=vec2(ln(p*.6+uT*.03),ln(p*.6-uT*.025+5.2));vec2 v=vor(p+(w-.5)*1.6);
 float crack=1.-smoothstep(.03,.16,v.y-v.x);float heat=clamp(vE,0.,1.);
 float pulse=.72+.28*sin(uT*1.1+ln(vP*.18)*6.283);float hot=clamp(crack*(.35+.65*heat)*pulse+heat*heat*.45*ln(p*1.7+uT*.15)+heat*.12,0.,1.);
 vec3 crust=mix(vec3(.018,.012,.01),vec3(.09,.025,.012),heat*(1.-smoothstep(0.,.5,v.x)));
 vec3 glow=mix(vec3(.75,.09,.01),vec3(1.,.42,.06),hot);glow=mix(glow,vec3(1.,.82,.4),smoothstep(.82,1.,hot));
 vec3 c=mix(crust,glow,smoothstep(.12,.75,hot));gl_FragColor=vec4(c*1.6,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 #include <fog_fragment>
}`;
const LAVA_VERT = `#include <common>
#include <fog_pars_vertex>
attribute float aEdge;attribute vec2 aFlow;uniform float uT;varying vec2 vP;varying float vE;varying vec2 vF;
void main(){vec4 wp=modelMatrix*vec4(position,1.);vP=wp.xz;vE=aEdge;vF=aFlow;wp.y+=.035*sin(uT*.7+wp.x*.6+wp.z*.45)*aEdge;vec4 mvPosition=viewMatrix*wp;gl_Position=projectionMatrix*mvPosition;
#include <fog_vertex>
}`;
const RIM_FRAG = `#include <common>
#include <fog_pars_fragment>
uniform float uT;varying vec2 vP;varying float vE;varying vec2 vF;
float ln(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);float a=fract(sin(dot(i,vec2(12.9,78.2)))*43758.5),b=fract(sin(dot(i+vec2(1,0),vec2(12.9,78.2)))*43758.5),c=fract(sin(dot(i+vec2(0,1),vec2(12.9,78.2)))*43758.5),d=fract(sin(dot(i+1.,vec2(12.9,78.2)))*43758.5);return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}
void main(){float n=ln(vP*1.7)*.6+ln(vP*5.3)*.4;float k=vE;float glow=smoothstep(.72,1.,k)*(.5+.5*sin(uT*.9+n*6.))*smoothstep(.35,.7,n);
 vec3 c=mix(vec3(.008,.007,.007),vec3(.022,.018,.016),n);c+=vec3(.9,.16,.02)*glow*.9;float a=smoothstep(.15,.85,k+n*.3-.15)*.92;gl_FragColor=vec4(c,a);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 #include <fog_fragment>
}`;
/**
 * Poças e canais de lava conformados ao relevo, com borda de basalto que esfria. heatAt(x,z) usa o MESMO contorno.
 * pools: [{x,z,r,seed}]; channels: [{pts:[[x,z]...], w:[...largura por ponto]}] (gerados por lavaChannelPath).
 */
export function createLava(T, { height, time, pools = [], channels = [], lowSpec = false } = {}) {
  const group = new T.Group(); group.name = 'fluido-lava';
  const uni = () => T.UniformsUtils.merge([T.UniformsLib.fog, { uT: { value: 0 } }]);
  const mat = new T.ShaderMaterial({ uniforms: uni(), vertexShader: LAVA_VERT, fragmentShader: LAVA_FRAG, fog: true }); mat.uniforms.uT = time;
  const rimMat = new T.ShaderMaterial({ uniforms: uni(), vertexShader: LAVA_VERT, fragmentShader: RIM_FRAG, fog: true, transparent: true, depthWrite: false }); rimMat.uniforms.uT = time;
  const contour = P => { const K = 7, ph = []; for (let k = 0; k < K; k++) ph.push(Math.sin(P.seed * 12.9 + k * 7.3) * 43758.5 % 1); return a => { let s = 0; for (let k = 1; k <= 4; k++) s += Math.sin(a * k + ph[k] * 6.283) * (.32 / k); return P.r * (1 + s * .9); }; };
  const lights = [], heatPools = [], heatSegs = [];
  for (const P of pools) { const rf = contour(P), R = lowSpec ? 5 : 7, S = lowSpec ? 32 : 44, pos = [], ed = [], fl = [], idx = []; heatPools.push({ x: P.x, z: P.z, rf, r: P.r * 2 });
    pos.push(P.x, height(P.x, P.z) + .09, P.z); ed.push(1); fl.push(.04, .02);
    for (let j = 1; j <= R; j++) for (let i = 0; i < S; i++) { const a = i / S * 6.283, rr = rf(a) * j / R, x = P.x + Math.cos(a) * rr, z = P.z + Math.sin(a) * rr; pos.push(x, height(x, z) + .09, z); ed.push(1 - j / R); fl.push(-Math.sin(a) * .06 + .04, Math.cos(a) * .06 + .02); }
    for (let i = 0; i < S; i++) idx.push(0, 1 + (i + 1) % S, 1 + i);
    for (let j = 1; j < R; j++) for (let i = 0; i < S; i++) { const a = 1 + (j - 1) * S + i, b = 1 + (j - 1) * S + (i + 1) % S, c = a + S, d = b + S; idx.push(a, b, c, b, d, c); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('aEdge', new T.Float32BufferAttribute(ed, 1)); g.setAttribute('aFlow', new T.Float32BufferAttribute(fl, 2)); g.setIndex(idx); g.computeBoundingSphere();
    const m = new T.Mesh(g, mat); m.name = 'jornada-poca-lava'; group.add(m);
    // borda: anel de basalto que esfria, mais largo que a poça, com o lado de fora dissolvendo no chão de cinza
    { const rp = [], re = [], rfl = [], ri = []; for (let j = 0; j <= 3; j++) for (let i = 0; i < S; i++) { const a = i / S * 6.283, rr = rf(a) * (.96 + j * .17 + (j ? .08 * Math.sin(a * 5 + P.seed) : 0)), x = P.x + Math.cos(a) * rr, z = P.z + Math.sin(a) * rr; rp.push(x, height(x, z) + .1 - j * .015, z); re.push(1 - j / 3); rfl.push(0, 0); }
      for (let j = 0; j < 3; j++) for (let i = 0; i < S; i++) { const a = j * S + i, b = j * S + (i + 1) % S, c = a + S, d = b + S; ri.push(a, b, c, b, d, c); }
      const g2 = new T.BufferGeometry(); g2.setAttribute('position', new T.Float32BufferAttribute(rp, 3)); g2.setAttribute('aEdge', new T.Float32BufferAttribute(re, 1)); g2.setAttribute('aFlow', new T.Float32BufferAttribute(rfl, 2)); g2.setIndex(ri); g2.computeBoundingSphere();
      const rim = new T.Mesh(g2, rimMat); rim.renderOrder = 2; rim.name = 'jornada-borda-lava'; group.add(rim); }
    if (P.light !== false) { const l = new T.PointLight(0xff5a1c, 2.2, 7 + P.r * 2.2, 2); l.position.set(P.x, height(P.x, P.z) + 1.4, P.z); l.userData.base = 2.2; l.userData.seed = P.seed; l.name = 'luz-lava'; group.add(l); lights.push(l); } }
  for (const C of channels) { const pts = C.pts, n = pts.length, X = 4, pos = [], ed = [], fl = [], idx = [], rp = [], re = [], rfl = [], ri = [];
    for (let i = 0; i < n; i++) { const [x, z] = pts[i], [ax, az] = pts[Math.max(0, i - 1)], [bx, bz] = pts[Math.min(n - 1, i + 1)], tl = Math.hypot(bx - ax, bz - az) || 1, tx = (bx - ax) / tl, tz = (bz - az) / tl, sx = -tz, sz = tx, w = C.w[i], v = .22 + .25 * (C.speed || 1);
      for (let k = 0; k <= X; k++) { const o = (k / X * 2 - 1) * w * .5, px = x + sx * o, pz = z + sz * o; pos.push(px, height(px, pz) + .08, pz); ed.push(1 - Math.abs(k / X * 2 - 1) * .85); fl.push(tx * v, tz * v); }
      for (const sd of [-1, 1]) for (let k = 0; k <= 2; k++) { const o = sd * (w * .5 * .92 + k * .7), px = x + sx * o, pz = z + sz * o; rp.push(px, height(px, pz) + .1 - k * .015, pz); re.push(1 - k / 2); rfl.push(0, 0); }
      if (i) heatSegs.push({ ax, az, x0: pts[i - 1][0], z0: pts[i - 1][1], x1: x, z1: z, w0: C.w[i - 1] * .5, w1: w * .5 }); }
    const W = X + 1; for (let i = 0; i < n - 1; i++) for (let k = 0; k < X; k++) { const a = i * W + k, b = a + W; idx.push(a, a + 1, b, a + 1, b + 1, b); } // face para cima
    for (let i = 0; i < n - 1; i++) for (let s = 0; s < 2; s++) for (let k = 0; k < 2; k++) { const a = i * 6 + s * 3 + k, b = a + 6; ri.push(a, b, a + 1, a + 1, b, b + 1, a, a + 1, b, a + 1, b + 1, b); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('aEdge', new T.Float32BufferAttribute(ed, 1)); g.setAttribute('aFlow', new T.Float32BufferAttribute(fl, 2)); g.setIndex(idx); g.computeBoundingSphere();
    const m = new T.Mesh(g, mat); m.name = 'jornada-canal-lava'; group.add(m);
    const g2 = new T.BufferGeometry(); g2.setAttribute('position', new T.Float32BufferAttribute(rp, 3)); g2.setAttribute('aEdge', new T.Float32BufferAttribute(re, 1)); g2.setAttribute('aFlow', new T.Float32BufferAttribute(rfl, 2)); g2.setIndex(ri); g2.computeBoundingSphere();
    const rim = new T.Mesh(g2, rimMat); rim.renderOrder = 2; rim.name = 'jornada-borda-lava'; group.add(rim);
    const mid = pts[n >> 1]; if (C.light !== false) { const l = new T.PointLight(0xff5a1c, 1.8, 12, 2); l.position.set(mid[0], height(mid[0], mid[1]) + 1.3, mid[1]); l.userData.base = 1.8; l.userData.seed = n; l.name = 'luz-lava'; group.add(l); lights.push(l); } }
  /** 1 dentro do contorno visível (poça ou canal), 0 fora. */
  function heatAt(x, z) {
    for (const P of heatPools) { const dx = x - P.x, dz = z - P.z, d = Math.hypot(dx, dz); if (d > P.r) continue; if (d < P.rf(Math.atan2(dz, dx) < 0 ? Math.atan2(dz, dx) + 6.283 : Math.atan2(dz, dx))) return 1; }
    for (const S of heatSegs) { const vx = S.x1 - S.x0, vz = S.z1 - S.z0, l2 = vx * vx + vz * vz || 1, t = Math.max(0, Math.min(1, ((x - S.x0) * vx + (z - S.z0) * vz) / l2)), d = Math.hypot(x - S.x0 - vx * t, z - S.z0 - vz * t); if (d < S.w0 + (S.w1 - S.w0) * t) return 1; }
    return 0;
  }
  return { group, heatAt, lights, mat,
    update(t, night = 0) { for (const l of lights) l.intensity = l.userData.base * (.75 + .25 * night) * (.85 + .15 * Math.sin(t * 2.3 + l.userData.seed) * Math.sin(t * 3.7 + l.userData.seed * 2)); } };
}
/** Caminho de um canal de lava que desce o relevo a partir de uma fonte (gradiente + inércia + meandro), largura variável. */
export function lavaChannelPath(height, x, z, { steps = 34, step = 1.6, w0 = 1.6, seed = 1, avoid = () => false } = {}) {
  const pts = [[x, z]], w = [w0 * .55]; let dx = Math.cos(seed * 2.1), dz = Math.sin(seed * 2.1);
  for (let i = 1; i < steps; i++) { const e = 1.2, gx = height(x + e, z) - height(x - e, z), gz = height(x, z + e) - height(x, z - e), gl = Math.hypot(gx, gz);
    let nx = dx * .72 + (gl > 1e-3 ? -gx / gl : 0) * .28, nz = dz * .72 + (gl > 1e-3 ? -gz / gl : 0) * .28; const m = Math.sin(i * .45 + seed * 3) * .35; const rx = nx - nz * m, rz = nz + nx * m, rl = Math.hypot(rx, rz) || 1; dx = rx / rl; dz = rz / rl;
    const ax = x + dx * step, az = z + dz * step; if (avoid(ax, az)) break; x = ax; z = az; pts.push([x, z]); w.push(w0 * (.75 + .45 * Math.sin(i * .7 + seed) * Math.sin(i * .23 + seed * 2)) * Math.min(1, (steps - i) / 5 + .25)); }
  return { pts, w };
}
