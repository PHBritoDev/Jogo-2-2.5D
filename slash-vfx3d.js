/**
 * Mod 315 — cortes cinematográficos reutilizáveis (espada do protagonista e garras do Demônio1).
 *
 *  • Crescente varrido: a cada passo da janela ATIVA o host entrega a base e a ponta reais da arma no mundo; a malha é
 *    uma faixa larga que vai da metade da lâmina até ALÉM da ponta (halo de energia), com nascimento por amostra —
 *    o rastro nasce na lâmina, acompanha o braço e se desfaz pela cauda. Nada aparece antes do golpe nem fica parado.
 *  • Onda: crescente destacado que viaja (o MESMO volume de dano de prota-combat3d/energyTouches), com núcleo branco,
 *    bordas prateadas e franjas da paleta; some ao bater em parede.
 *  • Estilhaços e faíscas instanciados (uma InstancedMesh, quads esticados pela velocidade), estrela de impacto de 4
 *    pontas com anel de choque. Tudo em pools fixos: nenhuma malha criada durante o combate.
 *
 * Estilos: 'prota' (branco intenso, prata, toques de ouro pálido/ciano) e 'demon' (núcleo escuro, borda violeta
 * elétrica, três riscos paralelos de garra). Um golpe comum nunca usa o tamanho/brilho de ultimate.
 */
const STYLES = {
  /* Combate de referência (7cd9ab51): crescente larga de núcleo branco com borda carmesim e esteira escura — lê em
     cenário claro, dura o bastante para o arco inteiro ficar na tela, e passa bem da ponta da lâmina. */
  prota: { core: 0xffffff, body: 0xfff1f4, rim: 0xff2346, accent: 0xffd6de, dark: 0x16030a, blend: 'add', rakes: 1, width: 1.3, ext: 1.7, inner: .06, life: .36, sparks: 0xfff4f6, spark2: 0xff3a5a, star: 0xffffff },
  /* Esteira do dash: fita carmesim rente ao corpo, do ponto de partida ao de chegada (risco vermelho longo da referência) */
  dash: { core: 0xffe8ec, body: 0xff1b3d, rim: 0x6a0016, accent: 0xffffff, dark: 0x1a0008, blend: 'normal', rakes: 1, width: 1, ext: .25, inner: 0, life: .42, sparks: 0xff4d6a, spark2: 0xffffff, star: 0xffe0e6 },
  // Mod 320: VHAZRAEL — crescente grossa de núcleo branco-amarelo, corpo carmesim e borda violeta escura (referência: rastros largos dos vídeos do criador, identidade própria)
  vhazrael: { core: 0xfff3dc, body: 0xd8142e, rim: 0x5c0b86, accent: 0xffc46a, dark: 0x2a0208, blend: 'normal', rakes: 1, width: 1.15, ext: .8, inner: .12, life: .4, sparks: 0xff5a4a, spark2: 0x8a1cff, star: 0xffe2c8 },
  /* missão 19/11: VORGAZHEK — crescente FINA de núcleo branco-gelo, corpo índigo-violeta e borda ciano glacial (lê sobre a água escura da Dimensão II) */
  vorgazhek: { core: 0xeefcff, body: 0x3a2aa8, rim: 0x5fe8ff, accent: 0xb68cff, dark: 0x05040f, blend: 'add', rakes: 1, width: .8, ext: .95, inner: .12, life: .3, sparks: 0x9ff4ff, spark2: 0x7a5cff, star: 0xe8fbff },
  veraxionA: { core: 0xfff4f0, body: 0xe0204a, rim: 0xffc86a, accent: 0xff8ab4, dark: 0x200208, blend: 'add', rakes: 1, width: .85, ext: .9, inner: .12, life: .3, sparks: 0xffe0a0, spark2: 0xff4f7a, star: 0xfff2f6 }, // missão 20/11: Rosário Carmesim (rubi/dourado)
  veraxionB: { core: 0xe8d0ff, body: 0x5a12a8, rim: 0x14041e, accent: 0xb44dff, dark: 0x050008, blend: 'normal', rakes: 3, width: .9, ext: .95, inner: .1, life: .28, sparks: 0xb44dff, spark2: 0x1a0626, star: 0xe0c0ff }, // Abismo Voraz (violeta/negro, rasgos)
  // missão 21/11 — Ganância: um rastro próprio por arma (nunca o mesmo)
  greedCosmic: { core: 0xf0e4ff, body: 0x5b2bd8, rim: 0x150a3a, accent: 0x9f7bff, dark: 0x05020f, blend: 'normal', rakes: 2, width: .95, ext: 1, inner: .1, life: .32, sparks: 0xc8b4ff, spark2: 0x3a1a9a, star: 0xffffff },
  greedBlood: { core: 0xffd8d0, body: 0xc8101e, rim: 0x3a0004, accent: 0xff4a3a, dark: 0x120002, blend: 'normal', rakes: 3, width: .9, ext: .95, inner: .1, life: .3, sparks: 0xff2a1a, spark2: 0x5a0006, star: 0xffe0d8 },
  greedSolar: { core: 0xffffff, body: 0xffc23a, rim: 0xff7a10, accent: 0xfff0a8, dark: 0x2a1200, blend: 'add', rakes: 1, width: .7, ext: 1.1, inner: .08, life: .26, sparks: 0xffe08a, spark2: 0xff8a20, star: 0xffffff },
  greedHybrid: { core: 0xfff0d0, body: 0x3a1018, rim: 0xd8a040, accent: 0xb04aff, dark: 0x0a0204, blend: 'normal', rakes: 4, width: .85, ext: .9, inner: .14, life: .28, sparks: 0xffc860, spark2: 0x8a2aff, star: 0xfff0c0 },
  zarkhael: { core: 0xffe1fb, body: 0x7a16e8, rim: 0xff4a1e, accent: 0xff4fb4, dark: 0x0c0210, blend: 'add', rakes: 1, width: 1.05, ext: 1, inner: .12, life: .34, sparks: 0xff6a3a, spark2: 0xb44dff, star: 0xffd6f6 }, // missão 20/11: foice do Carrasco (violeta com borda rubra)
  demon: { core: 0xf3d9ff, body: 0x8b2cff, rim: 0x4a0f8f, accent: 0x1a0626, dark: 0x07010d, blend: 'add', rakes: 3, width: .55, ext: .9, inner: .1, life: .22, sparks: 0xc57cff, spark2: 0x2b0a40, star: 0xe7c2ff },
};
const byStyle = f => Object.fromEntries(Object.keys(STYLES).map(k => [k, f(STYLES[k])]));
const NOISE = 'float h1(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h1(i),h1(i+vec2(1,0)),f.x),mix(h1(i+vec2(0,1)),h1(i+1.),f.x),f.y);}';

export function createSlashVFX(T, scene, { segments = 40, slashes = 6, waves = 8, sparks = 220, stars = 6 } = {}) {
  const root = new T.Group(); root.name = 'CortesCinematicos314'; scene.add(root);
  let time = 0, quality = 'high';
  // ---------------- crescente varrido (faixa com nascimento por amostra) ----------------
  const slashMat = st => new T.ShaderMaterial({ transparent: true, depthWrite: false, side: T.DoubleSide, toneMapped: false, blending: st.blend === 'normal' ? T.NormalBlending : T.AdditiveBlending, /* Mod 320: 'normal' = faixa carmesim legível sobre cenário claro */
    uniforms: { uTime: { value: 0 }, uLife: { value: st.life }, uCore: { value: new T.Color(st.core) }, uBody: { value: new T.Color(st.body) }, uRim: { value: new T.Color(st.rim) }, uAccent: { value: new T.Color(st.accent) }, uRakes: { value: st.rakes }, uGain: { value: 1 }, uSeed: { value: 0 }, uHead: { value: 0 }, uLength: { value: 1 } },
    vertexShader: 'attribute float aBirth;uniform float uLength;varying vec2 vUv;varying float vBirth;varying float vNear;void main(){vUv=vec2(uv.x/max(uLength,.0001),uv.y);vBirth=aBirth;vec4 mv=modelViewMatrix*vec4(position,1.);vNear=smoothstep(.7,2.4,-mv.z);gl_Position=projectionMatrix*mv;}',
    fragmentShader: `precision highp float;varying vec2 vUv;varying float vBirth;varying float vNear;uniform float uTime,uLife,uRakes,uGain,uSeed,uHead;uniform vec3 uCore,uBody,uRim,uAccent;${NOISE}
      void main(){float age=(uTime-vBirth)/uLife;if(age>1.)discard;float u=vUv.x,v=vUv.y;
        float lead=smoothstep(uHead-.35,uHead,u);float tail=smoothstep(0.,.22,u);
        float n=vn(vec2(u*14.+uSeed,v*3.-uTime*6.)),n2=vn(vec2(u*38.+uSeed*2.,v*9.+uTime*3.));
        float edgeV=smoothstep(.2,.92,v)*(1.-smoothstep(.96,1.,v));float core=exp(-pow((v-.86)*7.,2.));
        float rake=1.;if(uRakes>1.5){float r=fract(v*3.);rake=smoothstep(.0,.18,r)*(1.-smoothstep(.42,.62,r));core=exp(-pow((r-.3)*9.,2.));edgeV=rake;}
        float erode=smoothstep(age*1.05,age*1.05+.25,n*.75+n2*.25+(1.-v)*.15);
        float halo=smoothstep(0.,.55,v)*(1.-smoothstep(.9,1.,v));
        float a=(halo*.7+edgeV*1.1+core*2.6)*tail*(.6+.4*lead)*erode*(1.-smoothstep(.6,1.,age))*uGain;
        vec3 c=mix(uRim,uBody,smoothstep(.2,.7,v));c=mix(c,uCore,clamp(core*(.7+.3*lead),0.,1.));c+=uAccent*step(.82,n2)*smoothstep(.45,.9,v)*.8;
        a*=vNear;if(a<.012)discard;gl_FragColor=vec4(c*(1.2+core*.8),min(1.,a));}` });
  /* Sombra/fumaça sob o corte (mistura normal): dá contraste em cenário claro como nas referências — núcleo claro sobre
     uma esteira escura que se esgarça, em vez de só somar luz (que some sobre grama ensolarada). */
  const smokeMat = st => new T.ShaderMaterial({ transparent: true, depthWrite: false, side: T.DoubleSide, toneMapped: false,
    uniforms: { uTime: { value: 0 }, uLife: { value: st.life * 1.25 }, uDark: { value: new T.Color(st.dark || 0x05070d) }, uGain: { value: 1 }, uSeed: { value: 0 }, uRakes: { value: st.rakes }, uLength: { value: 1 } },
    vertexShader: 'attribute float aBirth;uniform float uLength;varying vec2 vUv;varying float vBirth;varying float vNear;void main(){vUv=vec2(uv.x/max(uLength,.0001),uv.y);vBirth=aBirth;vec4 mv=modelViewMatrix*vec4(position,1.);vNear=smoothstep(.7,2.4,-mv.z);gl_Position=projectionMatrix*mv;}',
    fragmentShader: `precision highp float;varying vec2 vUv;varying float vBirth;varying float vNear;uniform float uTime,uLife,uGain,uSeed,uRakes;uniform vec3 uDark;${NOISE}
      void main(){float age=(uTime-vBirth)/uLife;if(age>1.)discard;float u=vUv.x,v=vUv.y;float n=vn(vec2(u*9.+uSeed,v*4.-uTime*3.));
        float band=uRakes>1.5?smoothstep(.0,.3,fract(v*3.))*(1.-smoothstep(.5,.8,fract(v*3.))):smoothstep(.05,.45,v)*(1.-smoothstep(.7,.92,v));
        float a=band*smoothstep(0.,.25,u)*smoothstep(age,age+.35,n)*(1.-smoothstep(.4,1.,age))*.5*uGain;a*=vNear;if(a<.02)discard;gl_FragColor=vec4(uDark,a);}` });
  function makeSlash() {
    const N = segments, pos = new Float32Array(N * 2 * 3), uv = new Float32Array(N * 2 * 2), birth = new Float32Array(N * 2), idx = [];
    for (let i = 0; i < N; i++) {
      const a = i * 2, o = i * 4, u = N > 1 ? i / (N - 1) : 0;
      uv[o] = uv[o + 2] = u; uv[o + 1] = 0; uv[o + 3] = 1;
      if (i < N - 1) idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(pos, 3).setUsage(T.DynamicDrawUsage));
    g.setAttribute('uv', new T.BufferAttribute(uv, 2));
    g.setAttribute('aBirth', new T.BufferAttribute(birth, 1).setUsage(T.DynamicDrawUsage));
    g.setIndex(idx); g.setDrawRange(0, 0);
    const mats = byStyle(slashMat);
    const m = new T.Mesh(g, mats.prota); m.frustumCulled = false; m.renderOrder = 10; m.visible = false; root.add(m);
    const smokes = byStyle(smokeMat), sm = new T.Mesh(g, smokes.prota); sm.frustumCulled = false; sm.renderOrder = 9; m.add(sm);
    return { m, sm, smokes, g, pos, birth, mats, n: 0, key: null, last: 0, style: 'prota', lastP: null, positionRange: { start: 0, count: 0 }, birthRange: { start: 0, count: 0 } };
  }
  const slashPool = Array.from({ length: slashes }, makeSlash), byKey = new Map();
  let slashCursor = 0;
  const _a = new T.Vector3(), _b = new T.Vector3(), _d = new T.Vector3();
  // Three.js r160 update ranges are component offsets; reuse one pending range per ribbon attribute.
  function publishSlashRange(attribute, reusableRange, start, count, full = false) {
    if (typeof attribute.addUpdateRange === 'function' && typeof attribute.clearUpdateRanges === 'function' && Array.isArray(attribute.updateRanges)) {
      const ranges = attribute.updateRanges;
      if (full) {
        ranges.length = 0;
        reusableRange.start = 0; reusableRange.count = attribute.array.length;
        ranges.push(reusableRange);
      } else {
        let first = start, last = start + count, merged = true;
        while (merged) {
          merged = false;
          for (let i = ranges.length - 1; i >= 0; i--) {
            const range = ranges[i], rangeEnd = range.start + range.count;
            if (range === reusableRange || (first <= rangeEnd && last >= range.start)) {
              if (range.start < first) first = range.start;
              if (rangeEnd > last) last = rangeEnd;
              ranges.splice(i, 1); merged = true;
            }
          }
        }
        reusableRange.start = first; reusableRange.count = last - first;
        ranges.push(reusableRange);
      }
    }
    attribute.needsUpdate = true;
  }

  /**
   * Amostra da arma: key identifica o golpe (serial); base/tip no mundo; style; gain (0,7 comum … 1,15 finalizador).
   * extend: quanto o halo passa da ponta (m); inner: fração da lâmina onde a faixa começa.
   */
  function sample(key, base, tip, { style = 'prota', gain = 1, extend, inner } = {}) {
    let s = byKey.get(key);
    if (!s) { s = slashPool[slashCursor++ % slashPool.length]; if (s.key !== null) byKey.delete(s.key); s.key = key; s.n = 0; s.style = style; s.m.material = s.mats[style] || s.mats.prota; s.sm.material = s.smokes[style] || s.smokes.prota; s.sm.material.uniforms.uSeed.value = Math.random() * 50; s.m.material.uniforms.uSeed.value = Math.random() * 50; s.m.material.uniforms.uGain.value = gain; s.m.visible = true; byKey.set(key, s); s.lastP = null; }
    const st = STYLES[s.style] || STYLES.prota, ext = extend ?? st.ext, inn = inner ?? st.inner;
    _d.set(tip.x - base.x, tip.y - base.y, tip.z - base.z); const L = _d.length() || 1; _d.multiplyScalar(1 / L);
    _a.set(base.x + _d.x * L * inn, base.y + _d.y * L * inn, base.z + _d.z * L * inn);
    _b.set(tip.x + _d.x * ext * st.width, tip.y + _d.y * ext * st.width, tip.z + _d.z * ext * st.width);
    if (s.lastP && s.lastP.distanceToSquared(_b) < .0009) return; // parado: não acumula amostras inúteis
    s.lastP = (s.lastP || new T.Vector3()).copy(_b);
    const full = s.n === segments;
    if (full) { s.pos.copyWithin(0, 6); s.birth.copyWithin(0, 2); s.n--; }
    const i = s.n++, offset = i * 6, birthOffset = i * 2;
    s.pos[offset] = _a.x; s.pos[offset + 1] = _a.y; s.pos[offset + 2] = _a.z;
    s.pos[offset + 3] = _b.x; s.pos[offset + 4] = _b.y; s.pos[offset + 5] = _b.z;
    s.birth[birthOffset] = s.birth[birthOffset + 1] = time; s.last = time;
    s.g.setDrawRange(0, Math.max(0, (s.n - 1) * 6));
    const position = s.g.attributes.position, aBirth = s.g.attributes.aBirth;
    publishSlashRange(position, s.positionRange, full ? 0 : offset, full ? position.array.length : 6, full);
    publishSlashRange(aBirth, s.birthRange, full ? 0 : birthOffset, full ? aBirth.array.length : 2, full);
    const denominator = Math.max(1, segments - 1), uLength = Math.max(1 / denominator, (s.n - 1) / denominator);
    s.m.material.uniforms.uLength.value = uLength;
    s.sm.material.uniforms.uLength.value = uLength;
    s.m.material.uniforms.uHead.value = 1;
    // faíscas soltas na borda de ataque (poucas por amostra, mais nos golpes grandes)
    if (quality !== 'low' && Math.random() < .55 * gain) spark(_b, { x: _d.x * 2 + (Math.random() - .5) * 3, y: _d.y * 2 + Math.random() * 1.5, z: _d.z * 2 + (Math.random() - .5) * 3 }, s.style, .22);
  }
  function end(key) { byKey.delete(key); }
  // ---------------- onda destacada (volume de dano visível) ----------------
  const waveMat = st => new T.ShaderMaterial({ transparent: true, depthWrite: false, side: T.DoubleSide, toneMapped: false, blending: T.AdditiveBlending,
    uniforms: { uAge: { value: 0 }, uLife: { value: .4 }, uFade: { value: 1 }, uSeed: { value: 0 }, uCore: { value: new T.Color(st.core) }, uBody: { value: new T.Color(st.body) }, uRim: { value: new T.Color(st.rim) }, uAccent: { value: new T.Color(st.accent) }, uRakes: { value: st.rakes }, uGain: { value: 1 } },
    vertexShader: 'varying vec2 vUv;varying float vNear;void main(){vUv=uv;vec4 mv=modelViewMatrix*vec4(position,1.);vNear=smoothstep(.7,2.4,-mv.z);gl_Position=projectionMatrix*mv;}',
    fragmentShader: `precision highp float;varying vec2 vUv;varying float vNear;uniform float uAge,uLife,uFade,uSeed,uRakes,uGain;uniform vec3 uCore,uBody,uRim,uAccent;${NOISE}
      void main(){float t=clamp(uAge/uLife,0.,1.);float x=vUv.x*2.-1.,v=vUv.y;float taper=pow(max(0.,1.-x*x),.6);
        float band=v;if(uRakes>1.5){band=fract(v*3.);}
        float front=exp(-pow((band-.8)*6./(.35+taper),2.));float body=smoothstep(0.,.75,band)*(1.-smoothstep(.85,1.,band));
        float n=vn(vec2(vUv.x*22.+uSeed,v*4.-uAge*14.)),n2=vn(vec2(vUv.x*60.+uSeed,v*12.));
        float erode=smoothstep(t*.9,t*.9+.3,n*.8+.2*(1.-v));
        float a=(front*2.1+body*.7)*taper*erode*(1.-smoothstep(.6,1.,t))*uFade*uGain;
        vec3 c=mix(uRim,uBody,body);c=mix(c,uCore,front);c+=uAccent*step(.84,n2)*front*.7;
        a*=vNear;if(a<.012)discard;gl_FragColor=vec4(c*1.25,min(1.,a));}` });
  function crescentGeo() { const pos = [], uv = [], idx = [], N = 36, M = 6;
    for (let i = 0; i <= N; i++) { const u = i / N, ang = (u - .5) * 2.3; for (let j = 0; j <= M; j++) { const v = j / M, r = .55 + .45 * v; pos.push(Math.sin(ang) * r, 0, Math.cos(ang) * r - .75); uv.push(u, v); if (i < N && j < M) { const k = i * (M + 1) + j; idx.push(k, k + M + 1, k + 1, k + 1, k + M + 1, k + M + 2); } } }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); return g; }
  /* Onda viajante: lua crescente de FRENTE para quem a vê partir (plano largura × espessura, abaulada para a frente),
     igual ao volume de energyTouches (fino no avanço, largo no "across", espessura no eixo restante). O setor usa a
     versão deitada (corte horizontal que se expande). */
  function waveGeo() { const pos = [], uv = [], idx = [], N = 40, M = 6;
    for (let i = 0; i <= N; i++) { const u = i / N, ang = (u - .5) * 2.4, taper = Math.pow(Math.max(0, Math.cos(ang * .62)), 1.6); for (let j = 0; j <= M; j++) { const v = j / M;
      pos.push(Math.sin(ang), (v - .5) * .95 * taper + (Math.cos(ang) - .55) * .55, (Math.cos(ang) - .4) * .55); uv.push(u, v); if (i < N && j < M) { const k = i * (M + 1) + j; idx.push(k, k + M + 1, k + 1, k + 1, k + M + 1, k + M + 2); } } }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); return g; }
  /* Setor (corte horizontal que se expande): arco do próprio vão do golpe, em anel fino na FRENTE do raio — curvo, com
     pontas afinando (nada de leque de triângulos). Uma geometria por vão, em cache. */
  const arcCache = new Map();
  function arcGeo(span) { const k = Math.min(6.283, span).toFixed(2); if (arcCache.has(k)) return arcCache.get(k);
    const sp = Math.min(6.283, span), N = Math.max(24, Math.ceil(sp * 18)), M = 5, pos = [], uv = [], idx = [];
    for (let i = 0; i <= N; i++) { const u = i / N, a = (u - .5) * sp; for (let j = 0; j <= M; j++) { const v = j / M, r = .78 + .22 * v; pos.push(Math.sin(a) * r, 0, Math.cos(a) * r); uv.push(u, v); if (i < N && j < M) { const q = i * (M + 1) + j; idx.push(q, q + M + 1, q + 1, q + 1, q + M + 1, q + M + 2); } } }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); arcCache.set(k, g); return g; }
  const cGeo = crescentGeo(), wGeo = waveGeo();
  const waveSmokeMat = st => new T.ShaderMaterial({ transparent: true, depthWrite: false, side: T.DoubleSide, toneMapped: false,
    uniforms: { uAge: { value: 0 }, uLife: { value: .4 }, uFade: { value: 1 }, uSeed: { value: 0 }, uDark: { value: new T.Color(st.dark || 0x05070d) }, uRakes: { value: st.rakes } },
    vertexShader: 'varying vec2 vUv;varying float vNear;void main(){vUv=uv;vec4 mv=modelViewMatrix*vec4(position,1.);vNear=smoothstep(.7,2.4,-mv.z);gl_Position=projectionMatrix*mv;}',
    fragmentShader: `precision highp float;varying vec2 vUv;varying float vNear;uniform float uAge,uLife,uFade,uSeed,uRakes;uniform vec3 uDark;${NOISE}
      void main(){float t=clamp(uAge/uLife,0.,1.);float x=vUv.x*2.-1.,v=vUv.y;float taper=pow(max(0.,1.-x*x),.8);float band=uRakes>1.5?fract(v*3.):v;
        float n=vn(vec2(vUv.x*14.+uSeed,v*3.-uAge*8.));float a=smoothstep(0.,.55,band)*(1.-smoothstep(.7,.95,band))*taper*smoothstep(t,t+.35,n)*(1.-smoothstep(.45,1.,t))*uFade*.55;
        a*=vNear;if(a<.02)discard;gl_FragColor=vec4(uDark,a);}` });
  const wavePool = Array.from({ length: waves }, () => { const g = new T.Group(), tilt = new T.Group(), mats = byStyle(waveMat), smokes = byStyle(waveSmokeMat), m = new T.Mesh(cGeo, mats.prota), halo = new T.Mesh(cGeo, smokes.prota);
    halo.scale.set(1.08, 1, 1.18); halo.position.y = -.03; m.frustumCulled = halo.frustumCulled = false; m.renderOrder = 10; halo.renderOrder = 9; tilt.add(m, halo); g.add(tilt); g.visible = false; root.add(g); return { g, tilt, m, halo, mats, smokes, e: null, after: 0 }; });
  let waveCursor = 0;
  /** e: volume de energia (prota-combat3d.makeEnergy ou equivalente das garras). */
  function wave(e, { style = 'prota', gain = 1 } = {}) {
    const w = wavePool[waveCursor++ % wavePool.length], mat = w.mats[style] || w.mats.prota;
    w.m.geometry = w.halo.geometry = e.kind === 'sector' ? arcGeo(e.span || 2.6) : wGeo; w.full = e.kind === 'sector' && (e.span || 0) > 6.2;
    w.m.material = mat; w.halo.material = w.smokes[style] || w.smokes.prota; w.halo.material.uniforms.uLife.value = e.life * 1.2; w.halo.material.uniforms.uSeed.value = Math.random() * 40; w.halo.material.uniforms.uFade.value = 1; w.e = e; w.after = 0; w.g.visible = true; w.style = style;
    const u = mat.uniforms; u.uLife.value = e.life; u.uSeed.value = Math.random() * 40; u.uGain.value = gain; u.uFade.value = 1;
    w.g.position.set(e.x, e.y, e.z); w.g.rotation.set(0, e.yaw, 0); w.tilt.rotation.set(0, 0, e.roll || 0);
  }
  function syncWave(w, dt) {
    const e = w.e; if (!e) return; const u = w.m.material.uniforms, hu = w.halo.material.uniforms;
    if (e.done) { w.after += dt; u.uFade.value = hu.uFade.value = Math.max(0, 1 - w.after / .12); if (w.after > .12) { w.g.visible = false; w.e = null; return; } }
    u.uAge.value = hu.uAge.value = e.age;
    if (e.kind === 'sector') { const r = Math.max(.05, e.radius); w.g.position.set(e.x, e.y, e.z); w.tilt.scale.set(r, 1, r); w.m.position.z = w.halo.position.z = 0; w.halo.position.y = -.03; w.halo.scale.set(.97, 1, .97); }
    else { const fx = Math.sin(e.yaw), fz = Math.cos(e.yaw), along = e.blockedAt ? Math.min(e.travel, e.blockedAt) : e.travel; w.g.position.set(e.x + fx * along, e.y, e.z + fz * along); const s = e.radius * (1 + .2 * Math.min(1, e.age / .15)); w.tilt.scale.set(s, 1.15, Math.max(.7, e.band * 1.4)); w.m.position.z = w.halo.position.z = 0; }
  }
  // ---------------- faíscas / estilhaços (instanciados) ----------------
  const quad = new T.PlaneGeometry(1, 1); quad.translate(0, .5, 0);
  const sparkGeo = new T.InstancedBufferGeometry(); sparkGeo.index = quad.index; sparkGeo.setAttribute('position', quad.attributes.position); sparkGeo.setAttribute('uv', quad.attributes.uv);
  const sp = { pos: new Float32Array(sparks * 3), vel: new Float32Array(sparks * 3), life: new Float32Array(sparks), age: new Float32Array(sparks).fill(1), size: new Float32Array(sparks), col: new Float32Array(sparks * 3) };
  const aPos = new T.InstancedBufferAttribute(new Float32Array(sparks * 3), 3).setUsage(T.DynamicDrawUsage), aVel = new T.InstancedBufferAttribute(new Float32Array(sparks * 3), 3).setUsage(T.DynamicDrawUsage), aK = new T.InstancedBufferAttribute(new Float32Array(sparks * 2), 2).setUsage(T.DynamicDrawUsage), aCol = new T.InstancedBufferAttribute(new Float32Array(sparks * 3), 3).setUsage(T.DynamicDrawUsage);
  sparkGeo.setAttribute('aPos', aPos); sparkGeo.setAttribute('aVel', aVel); sparkGeo.setAttribute('aK', aK); sparkGeo.setAttribute('aCol', aCol); sparkGeo.instanceCount = 0;
  const sparkMesh = new T.Mesh(sparkGeo, new T.ShaderMaterial({ transparent: true, depthWrite: false, toneMapped: false, blending: T.AdditiveBlending,
    vertexShader: `attribute vec3 aPos,aVel,aCol;attribute vec2 aK;varying vec2 vUv;varying float vA;varying vec3 vC;
      void main(){vUv=uv;vC=aCol;float k=aK.x;vA=(1.-k)*(1.-k);vec4 c=viewMatrix*vec4(aPos,1.);vec3 vv=(viewMatrix*vec4(aVel,0.)).xyz;vec2 d=length(vv.xy)>1e-4?normalize(vv.xy):vec2(0.,1.);
        float len=aK.y*(.25+min(2.5,length(aVel))*.09)*(1.-k*.5),wid=aK.y*.06;vec2 side=vec2(-d.y,d.x);c.xy+=d*(position.y-.5)*len*2.+side*position.x*wid*2.;gl_Position=projectionMatrix*c;}`,
    fragmentShader: 'precision highp float;varying vec2 vUv;varying float vA;varying vec3 vC;void main(){float x=abs(vUv.x-.5)*2.,y=vUv.y;float a=(1.-x*x)*smoothstep(0.,.25,y)*(1.-smoothstep(.7,1.,y))*vA;if(a<.01)discard;gl_FragColor=vec4(vC*1.8,a);}' }));
  sparkMesh.frustumCulled = false; sparkMesh.renderOrder = 11; root.add(sparkMesh);
  let sparkCursor = 0; const _c = new T.Color();
  const sparkRanges = {
    position: { start: 0, count: 0 }, velocity: { start: 0, count: 0 },
    ageSize: { start: 0, count: 0 }, color: { start: 0, count: 0 }
  };
  function publishSparkRange(attribute, reusableRange, count) {
    const ranges = attribute.updateRanges;
    if (Array.isArray(ranges)) {
      // The current write always covers [0,count); widen it to preserve any unconsumed prefix/ranges.
      let end = count;
      for (let i = 0; i < ranges.length; i++) end = Math.max(end, ranges[i].start + ranges[i].count);
      reusableRange.start = 0; reusableRange.count = end;
      ranges[0] = reusableRange; ranges.length = 1;
    }
    attribute.needsUpdate = true;
  }
  function spark(p, v, style = 'prota', life = .3, size = 1) {
    const i = sparkCursor++ % sparks, st = STYLES[style] || STYLES.prota;
    sp.pos[i * 3] = p.x; sp.pos[i * 3 + 1] = p.y; sp.pos[i * 3 + 2] = p.z; sp.vel[i * 3] = v.x; sp.vel[i * 3 + 1] = v.y; sp.vel[i * 3 + 2] = v.z;
    sp.life[i] = life * (.7 + Math.random() * .6); sp.age[i] = 0; sp.size[i] = size * (.6 + Math.random() * .8);
    _c.setHex(Math.random() < .7 ? st.sparks : st.spark2); sp.col[i * 3] = _c.r; sp.col[i * 3 + 1] = _c.g; sp.col[i * 3 + 2] = _c.b;
  }
  // ---------------- estrela de impacto (4 pontas) + anel de choque ----------------
  const starMat = () => new T.ShaderMaterial({ transparent: true, depthWrite: false, depthTest: false, toneMapped: false, blending: T.AdditiveBlending,
    uniforms: { k: { value: 1 }, col: { value: new T.Color() }, rim: { value: new T.Color() }, rot: { value: 0 } },
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `precision highp float;varying vec2 vUv;uniform float k,rot;uniform vec3 col,rim;void main(){vec2 p=(vUv-.5)*2.;float c=cos(rot),s=sin(rot);p=mat2(c,-s,s,c)*p;float r=length(p);
      float star=max(exp(-abs(p.x)*22.)*exp(-abs(p.y)*1.6),exp(-abs(p.y)*22.)*exp(-abs(p.x)*1.6));float star2=max(exp(-abs(p.x+p.y)*30.),exp(-abs(p.x-p.y)*30.))*exp(-r*3.)*.6;
      float disk=exp(-r*r*14.);float ring=exp(-pow((r-k*.95)*12.,2.))*.7*(1.-k);float v=((star+star2)*1.6+disk*1.2)*(1.-k)*(1.-k)+ring;if(v<.01)discard;gl_FragColor=vec4(mix(rim,col,clamp(disk+star,0.,1.))*1.3,min(1.,v));}` });
  const starPool = Array.from({ length: stars }, () => { const m = new T.Mesh(new T.PlaneGeometry(1, 1), starMat()); m.visible = false; m.frustumCulled = false; m.renderOrder = 13; root.add(m); return { m, age: 1, life: .18, size: 1 }; });
  let starCursor = 0;
  /** Impacto: estrela + estilhaços em leque na direção do golpe. power 0..1 (finalizador ≈ 1). */
  function impact(p, dir = { x: 0, y: 0, z: 1 }, { style = 'prota', power = .5 } = {}) {
    const s = starPool[starCursor++ % starPool.length], st = STYLES[style] || STYLES.prota, u = s.m.material.uniforms;
    s.m.position.set(p.x, p.y, p.z); s.age = 0; s.life = .14 + power * .12; s.size = 1.1 + power * 1.6; s.m.visible = true; u.col.value.setHex(st.star); u.rim.value.setHex(st.rim); u.rot.value = Math.random() * .6 - .3;
    const n = quality === 'low' ? 8 : Math.round(14 + power * 16);
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, up = Math.random() * 2.5, sp2 = 3 + Math.random() * 6 * (.6 + power);
      spark(p, { x: dir.x * sp2 * .7 + Math.cos(a) * sp2 * .6, y: up + dir.y * sp2 * .4, z: dir.z * sp2 * .7 + Math.sin(a) * sp2 * .6 }, style, .26 + power * .18, 1 + power * .6); }
  }
  // ---------------- estouro de tinta (referência 7cd9ab51 0:04/0:09: respingo branco com bordas escuras no contato) ----------------
  const splashMat = () => new T.ShaderMaterial({ transparent: true, depthWrite: false, depthTest: false, toneMapped: false,
    uniforms: { k: { value: 1 }, seed: { value: 0 }, col: { value: new T.Color(0xffffff) }, ink: { value: new T.Color(0x0b0306) }, tint: { value: new T.Color(0xff2346) } },
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `precision highp float;varying vec2 vUv;uniform float k,seed;uniform vec3 col,ink,tint;${NOISE}
      void main(){vec2 p=(vUv-.5)*2.;float r=length(p),a=atan(p.y,p.x);
        float spikes=pow(vn(vec2(a*4.+seed,seed*.3)),2.)*.75+.25*vn(vec2(a*13.+seed*2.,1.));float reach=(.25+.75*spikes)*(.35+.65*sqrt(k));
        float body=1.-smoothstep(reach-.08,reach,r);float hole=smoothstep(k*.9-.25,k*.9,r*(1.+.3*vn(vec2(a*6.,seed))));
        float rim=smoothstep(reach-.2,reach-.06,r)*body;float fade=1.-smoothstep(.55,1.,k);
        float alpha=body*mix(1.,hole,step(.15,k))*fade;if(alpha<.02)discard;
        vec3 c=mix(col,ink,rim*.85);c=mix(c,tint,smoothstep(.0,.6,rim)*.25*(1.-k));gl_FragColor=vec4(c,alpha*.95);}` });
  const splashPool = Array.from({ length: 4 }, () => { const m = new T.Mesh(new T.PlaneGeometry(1, 1), splashMat()); m.visible = false; m.frustumCulled = false; m.renderOrder = 12; root.add(m); return { m, age: 1, life: .3, size: 1 }; });
  let splashCursor = 0;
  /** Respingo branco de bordas escuras no ponto do contato (finalizadores, contra-ataques, clash). */
  function splash(p, { power = .6, tint } = {}) {
    if (quality === 'low' && power < .8) return;
    const s = splashPool[splashCursor++ % splashPool.length], u = s.m.material.uniforms;
    s.m.position.set(p.x, p.y, p.z); s.age = 0; s.life = .22 + power * .16; s.size = 1.6 + power * 2.6; s.m.visible = true; u.seed.value = Math.random() * 60; if (tint !== undefined) u.tint.value.setHex(tint); else u.tint.value.setHex(0xff2346);
    const n = quality === 'low' ? 6 : Math.round(10 + power * 14);
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, e = (Math.random() - .3) * 1.2, v = 4 + Math.random() * 7 * power; spark(p, { x: Math.cos(a) * v, y: e * v * .6 + 1.5, z: Math.sin(a) * v }, 'prota', .3 + power * .2, 1.3 + power); }
  }
  // ---------------- atualização ----------------
  const camQ = new T.Quaternion();
  function update(dt, camera, level = 'high') {
    time += dt; quality = level; camera.getWorldQuaternion(camQ);
    for (const s of slashPool) { if (!s.m.visible) continue; s.m.material.uniforms.uTime.value = time; s.sm.material.uniforms.uTime.value = time; if (time - s.last > (STYLES[s.style] || STYLES.prota).life + .05) { s.m.visible = false; if (s.key !== null) { byKey.delete(s.key); s.key = null; } s.n = 0; s.g.setDrawRange(0, 0); } }
    for (const w of wavePool) syncWave(w, dt);
    let live = 0; const P = aPos.array, V = aVel.array, K = aK.array, C = aCol.array;
    for (let i = 0; i < sparks; i++) { if (sp.age[i] >= 1) continue; sp.age[i] += dt / sp.life[i]; if (sp.age[i] >= 1) continue;
      sp.vel[i * 3 + 1] -= 9 * dt; const drag = Math.exp(-3.5 * dt); sp.vel[i * 3] *= drag; sp.vel[i * 3 + 2] *= drag;
      sp.pos[i * 3] += sp.vel[i * 3] * dt; sp.pos[i * 3 + 1] += sp.vel[i * 3 + 1] * dt; sp.pos[i * 3 + 2] += sp.vel[i * 3 + 2] * dt;
      const source3 = i * 3, target3 = live * 3, target2 = live * 2;
      P[target3] = sp.pos[source3]; P[target3 + 1] = sp.pos[source3 + 1]; P[target3 + 2] = sp.pos[source3 + 2];
      V[target3] = sp.vel[source3]; V[target3 + 1] = sp.vel[source3 + 1]; V[target3 + 2] = sp.vel[source3 + 2];
      K[target2] = sp.age[i]; K[target2 + 1] = sp.size[i];
      C[target3] = sp.col[source3]; C[target3 + 1] = sp.col[source3 + 1]; C[target3 + 2] = sp.col[source3 + 2];
      live++;
    }
    sparkGeo.instanceCount = live;
    if (live) {
      // Four stable range objects avoid replacing full-pool uploads with per-frame range allocations.
      publishSparkRange(aPos, sparkRanges.position, live * 3);
      publishSparkRange(aVel, sparkRanges.velocity, live * 3);
      publishSparkRange(aK, sparkRanges.ageSize, live * 2);
      publishSparkRange(aCol, sparkRanges.color, live * 3);
    }
    for (const s of splashPool) { if (!s.m.visible) continue; s.age += dt; const k = s.age / s.life; if (k >= 1) { s.m.visible = false; continue; } s.m.quaternion.copy(camQ); s.m.scale.setScalar(s.size); s.m.material.uniforms.k.value = k; }
    for (const s of starPool) { if (!s.m.visible) continue; s.age += dt; const k = s.age / s.life; if (k >= 1) { s.m.visible = false; continue; } s.m.quaternion.copy(camQ); s.m.scale.setScalar(s.size * (.7 + .5 * k)); s.m.material.uniforms.k.value = k; }
  }
  function clear() { for (const s of slashPool) { s.m.visible = false; s.key = null; s.n = 0; s.g.setDrawRange(0, 0); } byKey.clear(); for (const w of wavePool) { w.g.visible = false; w.e = null; } sp.age.fill(1); sparkGeo.instanceCount = 0; for (const s of starPool) s.m.visible = false; for (const s of splashPool) s.m.visible = false; }
  function stats() { return { slashes: slashPool.filter(s => s.m.visible).length, waves: wavePool.filter(w => w.g.visible).length, sparks: sparkGeo.instanceCount, stars: starPool.filter(s => s.m.visible).length, splashes: splashPool.filter(s => s.m.visible).length, capacity: { slashes, waves, sparks, stars } }; }
  return { sample, end, wave, impact, splash, spark, update, clear, stats, root };
}
