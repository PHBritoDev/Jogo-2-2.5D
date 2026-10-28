import { softParticles, ribbons, lightningBolt, hash } from './celestial-fxkit3d.js';
/**
 * MOD 229 — Tempestade apocalíptica da Ultimate (clima global VISUAL, recursos locais à câmera).
 *
 *  • Céu: cúpula de gradiente carmesim desenhada antes de tudo (o terreno e o mundo continuam por cima).
 *  • Nuvens: cumulonimbus em fatias empilhadas (slice-based volume rendering). Cada fatia avalia fBm 2D com deslocamento
 *    por altura e erosão, então o conjunto tem espessura, bordas recortadas e paralaxe de verdade; a parte de baixo recebe
 *    brilho vermelho e a de cima fica negra. Uma abertura luminosa acompanha o White Hole e os relâmpagos iluminam por dentro.
 *    Escolha para WebGL/celular: sem raymarching por pixel (caro), sem texturas 3D; 5/7/9 fatias por preset.
 *  • Chuva: caixa de gotas centrada na câmera, animada inteiramente na GPU (posição = semente + vento·t, com repetição),
 *    esticada na direção da queda; só aparece abaixo da base das nuvens. Respingos no terreno real em volta do jogador.
 *  • Vento: poeira, folhas e brasas cruzando a tela; as árvores e a grama aceleram pelo uniforme de vento já existente.
 *  • Relâmpagos ramificados dentro das nuvens com clarão difuso (sem luzes reais); `onBolt` é o gancho de áudio (trovão).
 * Nada aqui causa dano. `update(k)` com k=0 esconde tudo: a restauração é progressiva e não deixa sobras.
 */
const SKY_VERT = 'varying vec3 vD; void main(){ vD=normalize(position); vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position=vec4(p.xy,p.w*.99995,p.w); }';
const SKY_FRAG = `varying vec3 vD; uniform float k, flash;
void main(){ float y=vD.y; vec3 top=vec3(.035,.0,.006), mid=vec3(.24,.012,.018), hor=vec3(.62,.07,.04);
 vec3 c=mix(hor,mid,smoothstep(-.05,.25,y)); c=mix(c,top,smoothstep(.25,.8,y)); c+=vec3(.9,.85,.9)*flash*.25*smoothstep(-.1,.5,y);
 gl_FragColor=vec4(c,k); }`;
const CLOUD_VERT = 'varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }';
const CLOUD_FRAG = `varying vec3 vW; uniform float time, k, layer, layers, flash; uniform vec3 flashPos, holePos, cam; uniform float holeR;
float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float a=.55,s=0.;for(int i=0;i<OCT;i++){s+=a*n2(p);p=mat2(1.6,1.2,-1.2,1.6)*p;a*=.5;}return s;}
float dens(vec2 p,float h){
 vec2 w=vec2(fbm(p*.6+vec2(time*.02,0.)),fbm(p*.6+vec2(5.2,1.3)-time*.015));
 float base=fbm(p+w*1.7+vec2(time*.05,time*.02)+h*.35);
 float erode=fbm(p*3.1-w*2.+h*1.7+time*.08)*.35;
 float profile=1.-pow(abs(h*2.-1.),2.)*.55;                // mais denso no meio da camada (cumulonimbus)
 return smoothstep(.3,.58,base*profile-erode*.5+.3);
}
void main(){
 vec2 p=vW.xz*.012; float h=layer/max(1.,layers-1.);
 float d=dens(p,h); float dl=dens(p+vec2(.03,.02),h-.18);   // amostra "abaixo" e deslocada: sombra própria aproximada
 float lit=clamp(dl-d*.6,0.,1.);
 float dist=length(vW.xz-cam.xz); float edge=smoothstep(700.,420.,dist);
 vec3 dark=vec3(.025,.008,.01), red=vec3(.5,.04,.03), rim=vec3(.95,.2,.08);
 vec3 c=mix(dark,red,(1.-h)*.65*lit+ (1.-h)*.12); c=mix(c,rim,pow(lit,3.)*(1.-h)*.6);
 float fl=flash*exp(-length(vW-flashPos)/55.); c+=vec3(.95,.9,1.)*fl*(.4+.6*d);
 float hole=length(vW.xz-holePos.xz)/max(1.,holeR); float open=smoothstep(.75,1.15,hole);
 c+=vec3(1.)*exp(-pow((hole-1.)/.18,2.))*1.2*(holeR>1.?1.:0.);   // borda luminosa da abertura (luz divina atravessando)
 float a=d*k*edge*mix(1.,open,holeR>1.?1.:0.)*(.7+.3*h);
 if(a<.01) discard; gl_FragColor=vec4(c,a);
}`;
const RAIN_VERT = `attribute vec4 aSeed; uniform float time; uniform vec3 cam; uniform vec2 wind; uniform float box, top, groundY; varying float vA; varying vec2 vUv;
void main(){
 vUv=uv; float sp=26.+aSeed.w*10.;
 vec3 base=aSeed.xyz*box; vec3 off=vec3(wind.x*time, -sp*time, wind.y*time);
 vec3 rel=mod(base+off-cam+box*.5, box)-box*.5;               // gotas sempre em volta da câmera
 vec3 pos=cam+rel; pos.y=cam.y+rel.y*.6+box*.15;
 vec3 vel=normalize(vec3(wind.x,-sp,wind.y));
 vec3 toCam=normalize(cameraPosition-pos); vec3 side=normalize(cross(vel,toCam));
 vec3 p=pos+side*position.x*.025+vel*position.y*(.9+aSeed.w*.6);
 float dc=length(pos-cameraPosition); vA=step(groundY-.6,pos.y)*step(pos.y,top)*(.12+.16*aSeed.w)*smoothstep(2.5,7.,dc)*smoothstep(40.,22.,dc);
 gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);
}`;
const RAIN_FRAG = `varying float vA; varying vec2 vUv; uniform float k; void main(){ float a=vA*k*(1.-abs(vUv.x*2.-1.))*smoothstep(0.,.3,vUv.y); if(a<.01) discard; gl_FragColor=vec4(vec3(.78,.6,.6)*a,a); }`;

export function createStorm(T, scene, { ground = () => 0, onBolt = () => {} } = {}) {
  const group = new T.Group(); group.name = 'TempestadeCarmesim'; group.visible = false; scene.add(group);
  const sky = new T.Mesh(new T.SphereGeometry(400, 32, 16), new T.ShaderMaterial({ vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: T.BackSide, depthWrite: false, depthTest: true, transparent: true, fog: false, toneMapped: false, uniforms: { k: { value: 0 }, flash: { value: 0 } } }));
  sky.renderOrder = -100; sky.frustumCulled = false; group.add(sky);
  const cloudUniforms = { time: { value: 0 }, k: { value: 0 }, flash: { value: 0 }, flashPos: { value: new T.Vector3() }, holePos: { value: new T.Vector3() }, holeR: { value: 0 }, cam: { value: new T.Vector3() }, layers: { value: 9 } };
  const cloudGeo = new T.PlaneGeometry(1500, 1500, 1, 1); cloudGeo.rotateX(-Math.PI / 2);
  const slices = []; let preset = -1;
  function buildSlices(q) {
    if (q === preset) return; preset = q;
    for (const s of slices) { group.remove(s); s.material.dispose(); } slices.length = 0;
    const n = q === 0 ? 5 : q === 1 ? 7 : 9, oct = q === 0 ? 3 : 4; cloudUniforms.layers.value = n;
    for (let i = 0; i < n; i++) {
      const m = new T.ShaderMaterial({ vertexShader: CLOUD_VERT, fragmentShader: CLOUD_FRAG, defines: { OCT: oct }, transparent: true, depthWrite: false, side: T.DoubleSide, fog: false, toneMapped: false,
        uniforms: { ...cloudUniforms, layer: { value: i } } });
      const mesh = new T.Mesh(cloudGeo, m); mesh.renderOrder = -50 + i; mesh.frustumCulled = false; group.add(mesh); slices.push(mesh);
    }
  }
  // chuva (GPU)
  const RAIN_MAX = 5200, quad = new T.PlaneGeometry(1, 1); quad.translate(0, .5, 0);
  const rainGeo = new T.InstancedBufferGeometry(); rainGeo.setIndex(quad.index); rainGeo.setAttribute('position', quad.attributes.position); rainGeo.setAttribute('uv', quad.attributes.uv);
  const seeds = new Float32Array(RAIN_MAX * 4); for (let i = 0; i < RAIN_MAX; i++) seeds.set([hash(i * 1.3), hash(i * 2.7 + 1), hash(i * 3.1 + 2), hash(i * 4.9 + 3)], i * 4);
  rainGeo.setAttribute('aSeed', new T.InstancedBufferAttribute(seeds, 4)); rainGeo.instanceCount = RAIN_MAX;
  const rainMat = new T.ShaderMaterial({ vertexShader: RAIN_VERT, fragmentShader: RAIN_FRAG, transparent: true, depthWrite: false, blending: T.CustomBlending, blendSrc: T.OneFactor, blendDst: T.OneFactor, fog: false, toneMapped: false,
    uniforms: { time: { value: 0 }, cam: { value: new T.Vector3() }, wind: { value: new T.Vector2(7, 3) }, box: { value: 46 }, top: { value: 60 }, groundY: { value: 0 }, k: { value: 0 } } });
  const rain = new T.Mesh(rainGeo, rainMat); rain.frustumCulled = false; rain.renderOrder = 6; group.add(rain);
  const fx = softParticles(T, 700), dust = softParticles(T, 220, { additive: false }), bolts = ribbons(T, 900, { flow: 30 }); group.add(fx.mesh, dust.mesh, bolts.mesh);
  const SPL = 90, splash = Array.from({ length: SPL }, (_, i) => ({ x: 0, y: 0, z: 0, t: -1, life: .25 + hash(i) * .15 }));
  const DEB = 140, debris = Array.from({ length: DEB }, (_, i) => ({ x: 0, y: 0, z: 0, s: hash(i * 3) })); let debrisInit = false;
  const boltSegs = Array.from({ length: 120 }, () => null); let bolt = null, nextBolt = .8, seedN = 1;
  function update(k, camera, time, dt, { quality = 1, hole = null, holeR = 0, groundY = 0 } = {}) {
    group.visible = k > .002; if (!group.visible) return;
    buildSlices(quality);
    const c = camera.position; sky.position.copy(c); sky.material.uniforms.k.value = k;
    const cloudBase = Math.max(c.y + 16, groundY + 34);
    slices.forEach((s, i) => { s.position.set(c.x, cloudBase + i * 3.2, c.z); });
    Object.assign(cloudUniforms.time, { value: time }); cloudUniforms.k.value = k; cloudUniforms.cam.value.copy(c);
    if (hole) { cloudUniforms.holePos.value.copy(hole); cloudUniforms.holeR.value = holeR; } else cloudUniforms.holeR.value = 0;
    // relâmpagos
    nextBolt -= dt;
    if (k > .5 && nextBolt <= 0) {
      seedN++; const a = hash(seedN) * 6.283, r = 40 + hash(seedN + 1) * 120, x = c.x + Math.cos(a) * r, z = c.z + Math.sin(a) * r, y = cloudBase + 6;
      const toGround = hash(seedN + 2) < .35, ex = x + (hash(seedN + 3) - .5) * 60, ez = z + (hash(seedN + 4) - .5) * 60;
      bolt = { t: 0, n: lightningBolt(seedN, x, y, z, ex, toGround ? ground(ex, ez) : y - 8 - hash(seedN + 5) * 10, ez, boltSegs, { depth: 3, jag: .3, branches: .5 }), x, y, z };
      cloudUniforms.flashPos.value.set(x, y, z); nextBolt = .7 + hash(seedN + 6) * 1.8; onBolt({ x, y, z, toGround });
    }
    let flash = 0; bolts.begin(camera, time);
    if (bolt) { bolt.t += dt; const b = bolt.t < .08 ? 1 : bolt.t < .14 ? .3 : bolt.t < .2 ? .9 : Math.max(0, 1 - (bolt.t - .2) / .25); flash = b;
      for (let i = 0; i < bolt.n; i++) { const s = boltSegs[i]; bolts.seg(s[0], s[1], s[2], s[3], s[4], s[5], .9 * s[6], .9 * s[6], [.85, .8, 1, b], [1, 1, 1, b]); }
      if (bolt.t > .5) bolt = null; }
    cloudUniforms.flash.value = flash * k; sky.material.uniforms.flash.value = flash * k; bolts.end();
    // chuva
    rainMat.uniforms.time.value = time; rainMat.uniforms.cam.value.copy(c); rainMat.uniforms.top.value = cloudBase; rainMat.uniforms.groundY.value = groundY; rainMat.uniforms.k.value = k;
    rainGeo.instanceCount = quality === 0 ? 1600 : quality === 1 ? 3200 : RAIN_MAX;
    // respingos no chão real em volta do jogador e poeira/folhas/brasas levadas pelo vento
    fx.begin(); dust.begin(); const nS = quality === 0 ? 30 : SPL;
    for (let i = 0; i < nS; i++) { const s = splash[i]; s.t += dt;
      if (s.t < 0 || s.t > s.life) { const a = hash(seedN * 7 + i + time) * 6.283, r = 1.5 + hash(i * 3 + time) * 18; s.x = c.x + Math.cos(a) * r; s.z = c.z + Math.sin(a) * r; s.y = ground(s.x, s.z) + .05; s.t = 0; }
      const u = s.t / s.life; fx.add(s.x, s.y + u * .25, s.z, .35 * u + .08, .22 * (1 - u) + .05, .8, .78, .85, .55 * (1 - u) * k, 2, 0, i); }
    if (!debrisInit) { for (const d of debris) { d.x = c.x + (d.s - .5) * 70; d.z = c.z + (hash(d.s * 99) - .5) * 70; d.y = groundY + 1 + hash(d.s * 7) * 8; } debrisInit = true; }
    const nD = quality === 0 ? 50 : DEB;
    for (let i = 0; i < nD; i++) { const d = debris[i], sp = 9 + d.s * 9; d.x += sp * dt * .92; d.z += sp * dt * .4; d.y += Math.sin(time * 3 + i) * dt * 1.5;
      if (d.x - c.x > 35) { d.x -= 70; d.z = c.z + (hash(i + time) - .5) * 70; d.y = groundY + 1 + hash(i * 1.7 + time) * 8; }
      if (Math.abs(d.z - c.z) > 35) d.z = c.z - Math.sign(d.z - c.z) * 34;
      if (i % 4 === 0) fx.add(d.x, d.y, d.z, .06, .22, 1, .35, .08, .8 * k, 3, Math.PI / 2 + .4, i);
      else if (i % 4 === 1) dust.add(d.x, d.y, d.z, .16, .1, .18, .14, .08, .85 * k, 1, time * 6 + i, i);
      else dust.add(d.x, d.y * .4 + groundY * .6, d.z, 2.2, 1.2, .35, .2, .18, .14 * k, 1, 0, i); }
    fx.end(); dust.end();
  }
  return { group, update, hide() { group.visible = false; bolt = null; debrisInit = false; nextBolt = .8; },
    dispose() { scene.remove(group); sky.geometry.dispose(); sky.material.dispose(); for (const s of slices) s.material.dispose(); cloudGeo.dispose(); quad.dispose(); rainGeo.dispose(); rainMat.dispose(); fx.dispose(); dust.dispose(); bolts.dispose(); } };
}
