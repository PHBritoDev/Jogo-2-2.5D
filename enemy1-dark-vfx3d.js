import { softParticles, groundDecals, groundNormal, ribbons, lightningBolt, smooth, easeOut, easeIn, hash } from './celestial-fxkit3d.js';
/**
 * MOD 237 — VFX dos poderes sombrios do Enemy1 (Garras do Abismo, Espiral Devoradora, Juízo Violeta, Contra-selo) e
 * rastro da foice do Guardião. Só desenha o estado da lógica (enemy1-squad3d.js): nada aqui decide dano.
 *
 * Tudo instanciado e alocado uma vez: membros de sombra (antebraço, palma, falanges) e garras são duas InstancedMesh com
 * shader próprio (negro com borda violeta, veias que pulsam, dissolução com borda acesa); fitas espirais são uma malha
 * dinâmica de faixas que abraçam um eixo (não cartões virados para a câmera); orbes, núcleos, cascas de choque e a coluna
 * do Juízo são instâncias de esfera/cilindro com shader de energia; o círculo arcano e a marca de perigo são decalques
 * procedurais no shader (anéis, runas, estrela de oito pontas, rachaduras). As partículas e fitas vêm do kit compartilhado.
 * Os detritos são calculados pela idade do efeito (sem estado por partícula): repetir a magia não vaza memória.
 */
const NOISE = `float h3(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float n3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}`;
// membros de sombra: aFx = (dissolução 0..1, brilho, semente, calor)
const LIMB_VERT = `attribute vec4 aFx; varying vec3 vN; varying vec3 vV; varying vec3 vP; varying vec4 vFx;
void main(){ vFx=aFx; vP=position; mat4 m=modelMatrix*instanceMatrix; vec4 w=m*vec4(position,1.); vN=normalize(mat3(m)*normal); vV=normalize(cameraPosition-w.xyz); gl_Position=projectionMatrix*viewMatrix*w; }`;
const LIMB_FRAG = `${NOISE} uniform float time; uniform vec3 rim; uniform vec3 vein; varying vec3 vN; varying vec3 vV; varying vec3 vP; varying vec4 vFx;
void main(){ vec3 q=vP*vec3(3.2,5.5,3.2)+vFx.z*11.; float n=n3(q)*.65+n3(q*2.3)*.35; float cut=vFx.x*1.15-.08; if(n<cut) discard;
 float burn=(1.-smoothstep(cut,cut+.1,n))*step(.001,vFx.x);
 vec3 N=normalize(vN); float fr=pow(1.-abs(dot(N,vV)),2.4); float lit=max(0.,dot(N,normalize(vec3(.35,.85,.3))));
 float rv=1.-abs(n3(vP*vec3(3.,7.,3.)+vec3(0.,-time*.7,vFx.z*3.))*2.-1.); float v=smoothstep(.88,.97,rv)*smoothstep(.35,.7,n3(vP*1.3+vFx.z*5.));
 vec3 col=vec3(.02,.008,.035)+vec3(.07,.035,.1)*lit+rim*fr*(.75+vFx.y)+vein*v*(.45+vFx.y*1.1)+vec3(.95,.62,1.)*burn*2.2+vec3(.6,.3,1.)*vFx.w*fr;
 gl_FragColor=vec4(col,1.); }`;
// energia (orbes, núcleos, cascas): aFx = (modo 0 orbe/1 casca/2 núcleo, alfa, semente, ruptura)
const ENERGY_VERT = `attribute vec4 aFx; varying vec3 vN; varying vec3 vV; varying vec3 vP; varying vec4 vFx;
void main(){ vFx=aFx; vP=position; mat4 m=modelMatrix*instanceMatrix; vec4 w=m*vec4(position,1.); vN=normalize(mat3(m)*normal); vV=normalize(cameraPosition-w.xyz); gl_Position=projectionMatrix*viewMatrix*w; }`;
const ENERGY_FRAG = `${NOISE} uniform float time; varying vec3 vN; varying vec3 vV; varying vec3 vP; varying vec4 vFx;
void main(){ float f=1.-abs(dot(normalize(vN),vV)); float sw=n3(vP*2.6+vec3(time*1.3,-time*.7,vFx.z*5.))*.6+n3(vP*6.+vec3(0.,time*2.,vFx.z))*.4; float a=0.; vec3 c;
 if(vFx.x<.5){ float core=pow(1.-f,3.); a=(pow(f,1.6)*1.1+core*.9)*(.65+.55*sw); c=mix(vec3(.55,.18,1.),vec3(1.,.9,1.),core*.85+smoothstep(.65,.9,sw)*.4); }
 else if(vFx.x<1.5){ float br=smoothstep(vFx.w-.1,vFx.w+.1,sw); a=pow(f,2.2)*1.4*br; c=mix(vec3(.45,.12,.95),vec3(1.,.85,1.),pow(f,6.)); }
 else { a=pow(1.-f,1.4)*1.2; c=vec3(1.,.93,1.); }
 a*=vFx.y; if(a<.004) discard; gl_FragColor=vec4(c*a,a); }`;
// coluna do Juízo: cilindro aberto com bordas orgânicas e fluxo descendo
const BEAM_FRAG = `${NOISE} uniform float time; varying vec3 vN; varying vec3 vV; varying vec3 vP; varying vec4 vFx;
void main(){ float ang=atan(vP.x,vP.z); float n=n3(vec3(ang*2.,vP.y*3.-time*9.,vFx.z))*.6+n3(vec3(ang*5.,vP.y*8.-time*15.,vFx.z+3.))*.4;
 float f=1.-abs(dot(normalize(vN),vV)); float edge=smoothstep(.25,.6,n); float core=pow(1.-f,2.5);
 float a=(core*1.3+pow(f,2.)*.6*edge)*vFx.y; vec3 c=mix(vec3(.5,.15,1.),vec3(1.,.95,1.),core); if(a<.004) discard; gl_FragColor=vec4(c*a,a); }`;
// faixas espirais: aBand = (u ao longo, v na largura, brilho, alfa)
const BAND_VERT = `attribute vec4 aBand; varying vec4 vB; varying vec3 vN; varying vec3 vV; void main(){ vB=aBand; vN=normalize(mat3(modelMatrix)*normal); vec4 w=modelMatrix*vec4(position,1.); vV=normalize(cameraPosition-w.xyz); gl_Position=projectionMatrix*viewMatrix*w; }`;
const BAND_FRAG = `${NOISE} uniform float time; varying vec4 vB; varying vec3 vN; varying vec3 vV;
void main(){ float e=abs(vB.y*2.-1.); float n=n3(vec3(vB.x*14.-time*3.,vB.y*3.,vB.z*7.)); if(vB.w<.02||n<(1.-vB.w)*1.1-.05) discard;
 float rimE=smoothstep(.55,1.,e); float hot=vB.z*(1.-smoothstep(0.,.32,e));
 vec3 c=vec3(.015,.006,.03)+vec3(.55,.2,1.)*rimE*1.4+vec3(1.,.85,1.)*hot*1.6+vec3(.4,.15,.8)*pow(1.-abs(dot(normalize(vN),vV)),3.)*.6;
 gl_FragColor=vec4(c,1.); }`;
// decalques arcanos: aMeta = (tipo 0 círculo/1 marca de perigo/2 cratera, progresso, semente, intensidade)
const ARC_VERT = `attribute vec4 aColor; attribute vec4 aMeta; varying vec4 vC; varying vec4 vM; varying vec2 vUv; void main(){ vUv=uv; vC=aColor; vM=aMeta; gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.); }`;
const ARC_FRAG = (dark) => `${NOISE} uniform float time; varying vec4 vC; varying vec4 vM; varying vec2 vUv;
float ring(float d,float r,float w){return exp(-pow((d-r)/w,2.));}
float sg(vec2 p,vec2 a,vec2 b,float w){vec2 pa=p-a,ba=b-a;float t=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return exp(-pow(length(pa-ba*t)/w,2.));}
vec2 rot(vec2 p,float a){float c=cos(a),s=sin(a);return vec2(c*p.x-s*p.y,s*p.x+c*p.y);}
float cracks(vec2 p,float s){vec2 g=floor(p*s),f=fract(p*s);float m1=8.,m2=8.;for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){vec2 o=vec2(i,j);vec2 r=o+vec2(h3(vec3(g+o,1.)),h3(vec3(g+o,2.)))-f;float d=dot(r,r);if(d<m1){m2=m1;m1=d;}else if(d<m2)m2=d;}return 1.-smoothstep(0.,.07,sqrt(m2)-sqrt(m1));}
void main(){ vec2 p=vUv*2.-1.; float d=length(p), k=vM.x, prog=vM.y, sd=vM.z, I=vM.w, a=0.;
 float jag=(n3(vec3(p*3.,sd))-.5)*.12; float reveal=smoothstep(prog*1.25-.08,prog*1.25-.2,d+jag);
 ${dark ? `
 if(k<1.5){ a=smoothstep(1.02,.55,d+jag)*.8*reveal; a=max(a,cracks(p,4.+sd)*.5*reveal*smoothstep(1.1,.4,d)); }
 else { a=smoothstep(1.,.25,d+jag*2.)*.85*(1.-prog*.6); }
 a*=I; if(a<.004) discard; gl_FragColor=vec4(vC.rgb,a);` : `
 if(k<.5){ vec2 q=rot(p,time*.12+sd); float an=atan(q.y,q.x);
  float lines=ring(d,.93,.012)+ring(d,.86,.009)+ring(d,.58,.011)*.9+ring(d,.34,.008)*.7;
  float cell=floor((an+3.1416)*36./6.2832); float u=fract((an+3.1416)*36./6.2832), v=(d-.865)/.06;
  float glyph=(v>0.&&v<1.)?max(step(.5,h3(vec3(cell,sd,1.)))*smoothstep(.12,0.,abs(u-.5)),step(.6,h3(vec3(cell,sd,2.)))*smoothstep(.1,0.,abs(v-.5))*step(.2,u)*step(u,.8)):0.;
  float star=0.; for(int i=0;i<4;i++){float t0=float(i)*1.5708,t1=t0+1.5708;star+=sg(q,.86*vec2(cos(t0),sin(t0)),.86*vec2(cos(t1),sin(t1)),.012);star+=sg(q,.86*vec2(cos(t0+.785),sin(t0+.785)),.86*vec2(cos(t1+.785),sin(t1+.785)),.012);}
  float sp=0.; for(int i=0;i<8;i++){float t0=float(i)*.785+.3927;vec2 dir=vec2(cos(t0),sin(t0));float along=dot(q,dir);float side=abs(dot(q,vec2(-dir.y,dir.x)));sp+=step(.93,along)*smoothstep(.05*(1.2-along)*4.,0.,side)*step(along,1.2);}
  float cr=cracks(p,4.+sd)*smoothstep(1.,.2,d)*(.45+.35*sin(time*3.+d*9.));
  a=(lines*1.1+glyph*.9+star*.8+sp*.9+cr+exp(-d*d*5.)*.25)*reveal; }
 else if(k<1.5){ float an=atan(p.y,p.x); float edge=ring(d+jag*1.5,.9,.04)*(.7+.3*sin(an*9.+time*6.));
  float hatch=smoothstep(.08,0.,abs(fract((p.x+p.y)*6.+time*.8)-.5)-.38)*smoothstep(.95,.3,d)*.25; float cr=cracks(p,3.+sd)*smoothstep(1.,.3,d)*.6;
  a=(edge*1.3+hatch+cr+exp(-d*d*4.)*.3*prog)*reveal*(.75+.25*sin(time*(10.+prog*14.))); }
 else { float cr=cracks(p,5.+sd)*smoothstep(.9,.1,d); a=(cr*1.2+ring(d,.75,.08)*.4)*(1.-prog); }
 a*=I; if(a<.004) discard; gl_FragColor=vec4(vC.rgb*a,a);`}
}`;
// fita escura (normal blending) para fumaça/filamentos negros
const DRIB_FRAG = `varying vec4 vC; varying vec2 vUv; void main(){ float e=1.-abs(vUv.y*2.-1.); float a=pow(e,1.3)*vC.a; if(a<.01) discard; gl_FragColor=vec4(vC.rgb,a); }`;
const DRIB_VERT = `attribute vec4 aColor; attribute vec2 aUv2; varying vec4 vC; varying vec2 vUv; void main(){ vC=aColor; vUv=aUv2; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;

const VIOLET = [.62, .28, 1], WHITE = [1, .92, 1], LILAC = [.85, .6, 1], BLOOD = [1, .12, .16];
const c4 = (c, a) => [c[0], c[1], c[2], a];

export function createDarkPowersVFX(T, scene, { ground = () => 0 } = {}) {
  const root = new T.Group(); root.name = 'Enemy1DarkVFX'; scene.add(root);
  const uTime = { value: 0 };
  const mkInst = (geo, mat, max, attr = 'aFx') => { const a = new Float32Array(max * 4); geo.setAttribute(attr, new T.InstancedBufferAttribute(a, 4).setUsage(T.DynamicDrawUsage)); const m = new T.InstancedMesh(geo, mat, max); m.frustumCulled = false; m.count = 0; m.instanceMatrix.setUsage(T.DynamicDrawUsage); root.add(m); return { m, a, n: 0, max }; };
  // membros (antebraço/palma/falanges), garras, anéis
  const limbGeo = new T.CylinderGeometry(.7, 1, 1, 8, 4); limbGeo.translate(0, .5, 0);
  { const p = limbGeo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + (hash(i * 3.1) - .5) * .18 + Math.sin(y * 9 + x * 4) * .05; p.setXYZ(i, x * k, y, z * k); } limbGeo.computeVertexNormals(); }
  const limbMat = new T.ShaderMaterial({ vertexShader: LIMB_VERT, fragmentShader: LIMB_FRAG, uniforms: { time: uTime, rim: { value: new T.Color(.62, .25, 1) }, vein: { value: new T.Color(.75, .3, 1) } } });
  const limbs = mkInst(limbGeo, limbMat, 420);
  const clawGeo = new T.ConeGeometry(.5, 1, 6, 3); clawGeo.translate(0, .5, 0);
  { const p = clawGeo.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setZ(i, p.getZ(i) + y * y * .55); } clawGeo.computeVertexNormals(); } // ponta curva
  const claws = mkInst(clawGeo, limbMat, 120);
  const ringGeo = new T.TorusGeometry(1, .032, 6, 56);
  const ringMat = new T.ShaderMaterial({ vertexShader: LIMB_VERT, fragmentShader: LIMB_FRAG, uniforms: { time: uTime, rim: { value: new T.Color(.7, .3, 1) }, vein: { value: new T.Color(.9, .5, 1) } } });
  const rings = mkInst(ringGeo, ringMat, 40);
  // rochas (iluminadas pela cena)
  const rockGeo = new T.DodecahedronGeometry(1, 0), rockMat = new T.MeshStandardMaterial({ color: 0x241f2a, roughness: .92, metalness: 0, flatShading: true, emissive: 0x12051e, emissiveIntensity: .6 });
  const rocks = new T.InstancedMesh(rockGeo, rockMat, 160); rocks.frustumCulled = false; rocks.count = 0; rocks.castShadow = false; root.add(rocks); let rockN = 0;
  // energia e coluna
  const energyMat = new T.ShaderMaterial({ vertexShader: ENERGY_VERT, fragmentShader: ENERGY_FRAG, uniforms: { time: uTime }, transparent: true, depthWrite: false, blending: T.CustomBlending, blendSrc: T.OneFactor, blendDst: T.OneFactor, toneMapped: false, fog: false });
  const energy = mkInst(new T.SphereGeometry(1, 28, 18), energyMat, 24); energy.m.renderOrder = 6;
  const beamGeo = new T.CylinderGeometry(1, 1, 1, 18, 6, true); beamGeo.translate(0, .5, 0);
  const beamMat = new T.ShaderMaterial({ vertexShader: ENERGY_VERT, fragmentShader: BEAM_FRAG, uniforms: { time: uTime }, transparent: true, depthWrite: false, blending: T.CustomBlending, blendSrc: T.OneFactor, blendDst: T.OneFactor, side: T.DoubleSide, toneMapped: false, fog: false });
  const beams = mkInst(beamGeo, beamMat, 6); beams.m.renderOrder = 6;
  // faixas espirais (malha dinâmica)
  const BQ = 900, bPos = new Float32Array(BQ * 4 * 3), bNrm = new Float32Array(BQ * 4 * 3), bAtt = new Float32Array(BQ * 4 * 4), bIdx = new Uint32Array(BQ * 6);
  for (let i = 0; i < BQ; i++) bIdx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 2, i * 4 + 1, i * 4 + 3], i * 6);
  const bandGeo = new T.BufferGeometry(); bandGeo.setAttribute('position', new T.BufferAttribute(bPos, 3).setUsage(T.DynamicDrawUsage)); bandGeo.setAttribute('normal', new T.BufferAttribute(bNrm, 3).setUsage(T.DynamicDrawUsage));
  bandGeo.setAttribute('aBand', new T.BufferAttribute(bAtt, 4).setUsage(T.DynamicDrawUsage)); bandGeo.setIndex(new T.BufferAttribute(bIdx, 1));
  const bands = new T.Mesh(bandGeo, new T.ShaderMaterial({ vertexShader: BAND_VERT, fragmentShader: BAND_FRAG, uniforms: { time: uTime }, side: T.DoubleSide })); bands.frustumCulled = false; root.add(bands); let bq = 0;
  // decalques arcanos (escuro + brilho)
  const decalSet = dark => { const g = new T.PlaneGeometry(2, 2); g.rotateX(-Math.PI / 2); const col = new Float32Array(16 * 4), meta = new Float32Array(16 * 4);
    g.setAttribute('aColor', new T.InstancedBufferAttribute(col, 4).setUsage(T.DynamicDrawUsage)); g.setAttribute('aMeta', new T.InstancedBufferAttribute(meta, 4).setUsage(T.DynamicDrawUsage));
    const mat = new T.ShaderMaterial({ vertexShader: ARC_VERT, fragmentShader: ARC_FRAG(dark), uniforms: { time: uTime }, transparent: true, depthWrite: false, toneMapped: false, fog: false, polygonOffset: true, polygonOffsetFactor: dark ? -1 : -3, polygonOffsetUnits: dark ? -1 : -3,
      ...(dark ? {} : { blending: T.CustomBlending, blendSrc: T.OneFactor, blendDst: T.OneFactor }) });
    const m = new T.InstancedMesh(g, mat, 16); m.frustumCulled = false; m.count = 0; m.renderOrder = dark ? 1 : 2; root.add(m); return { m, col, meta, n: 0 }; };
  const arcDark = decalSet(true), arcGlow = decalSet(false);
  // fitas escuras
  const DR = 500, dPos = new Float32Array(DR * 12), dCol = new Float32Array(DR * 16), dUv = new Float32Array(DR * 8), dIdx = new Uint32Array(DR * 6);
  for (let i = 0; i < DR; i++) dIdx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 2, i * 4 + 1, i * 4 + 3], i * 6);
  const dGeo = new T.BufferGeometry(); dGeo.setAttribute('position', new T.BufferAttribute(dPos, 3).setUsage(T.DynamicDrawUsage)); dGeo.setAttribute('aColor', new T.BufferAttribute(dCol, 4).setUsage(T.DynamicDrawUsage)); dGeo.setAttribute('aUv2', new T.BufferAttribute(dUv, 2).setUsage(T.DynamicDrawUsage)); dGeo.setIndex(new T.BufferAttribute(dIdx, 1));
  const dRib = new T.Mesh(dGeo, new T.ShaderMaterial({ vertexShader: DRIB_VERT, fragmentShader: DRIB_FRAG, transparent: true, depthWrite: false, side: T.DoubleSide, fog: false })); dRib.frustumCulled = false; dRib.renderOrder = 3; root.add(dRib); let dq = 0;
  const glow = softParticles(T, 900), smoke = softParticles(T, 260, { additive: false }), rib = ribbons(T, 900, { flow: 18 }), decals = groundDecals(T, 24);
  root.add(glow.mesh, smoke.mesh, rib.mesh, decals.mesh);
  // auxiliares
  const M = new T.Matrix4(), Q = new T.Quaternion(), S = new T.Vector3(), P = new T.Vector3(), up = new T.Vector3(0, 1, 0), V = new T.Vector3(), V2 = new T.Vector3(), eye = new T.Vector3();
  const nrm = [0, 1, 0], bolt = Array.from({ length: 40 }, () => [0, 0, 0, 0, 0, 0, 0]);
  let time = 0, low = false;
  function inst(set, px, py, pz, dir, sx, sy, sz, f0, f1, f2, f3, spin = 0) {
    if (set.n >= set.max) return; P.set(px, py, pz); V.copy(dir).normalize(); Q.setFromUnitVectors(up, V); if (spin) { V2.set(0, 1, 0).applyQuaternion(Q); const q2 = new T.Quaternion().setFromAxisAngle(V2, spin); Q.premultiply(q2); }
    S.set(sx, sy, sz); M.compose(P, Q, S); set.m.setMatrixAt(set.n, M); set.a.set([f0, f1, f2, f3], set.n * 4); set.n++;
  }
  function instQ(set, px, py, pz, q, sx, sy, sz, f0, f1, f2, f3) { if (set.n >= set.max) return; P.set(px, py, pz); S.set(sx, sy, sz); M.compose(P, q, S); set.m.setMatrixAt(set.n, M); set.a.set([f0, f1, f2, f3], set.n * 4); set.n++; }
  function rock(px, py, pz, s, rx, ry) { if (rockN >= 160 || s <= .005) return; P.set(px, py, pz); Q.setFromEuler(new T.Euler(rx, ry, rx * .7)); S.set(s, s * .8, s); M.compose(P, Q, S); rocks.setMatrixAt(rockN++, M); }
  function arc(set, x, y, z, size, col, kind, prog, seed, I, normal) {
    if (set.n >= 16 || I <= .002) return; P.set(x, y + .05, z); if (normal) { V.set(normal[0], normal[1], normal[2]); Q.setFromUnitVectors(up, V); } else Q.identity(); S.set(size, 1, size); M.compose(P, Q, S); set.m.setMatrixAt(set.n, M);
    set.col.set([col[0], col[1], col[2], 1], set.n * 4); set.meta.set([kind, prog, seed, I], set.n * 4); set.n++;
  }
  function dseg(ax, ay, az, bx, by, bz, wa, wb, ca, cb) {
    if (dq >= DR) return; const side = (x0, y0, z0, x1, y1, z1, w) => { V.set(x1 - x0, y1 - y0, z1 - z0); V2.set(x0 - eye.x, y0 - eye.y, z0 - eye.z); V.cross(V2); const l = V.length() || 1; return V.multiplyScalar(w / l).clone(); };
    const s0 = side(ax, ay, az, bx, by, bz, wa), s1 = side(ax, ay, az, bx, by, bz, wb), o = dq * 12;
    dPos.set([ax - s0.x, ay - s0.y, az - s0.z, ax + s0.x, ay + s0.y, az + s0.z, bx - s1.x, by - s1.y, bz - s1.z, bx + s1.x, by + s1.y, bz + s1.z], o);
    dCol.set(ca, dq * 16); dCol.set(ca, dq * 16 + 4); dCol.set(cb, dq * 16 + 8); dCol.set(cb, dq * 16 + 12); dUv.set([0, 0, 0, 1, 1, 0, 1, 1], dq * 8); dq++;
  }
  /** Faixa que abraça um eixo: centro c(u), direção do eixo t, raio r(u), ângulo th(u), largura w(u) ao longo do eixo. */
  function band(n, fn, seed) {
    let prev = null;
    for (let i = 0; i <= n && bq < BQ; i++) {
      const u = i / n, s = fn(u); if (!s) { prev = null; continue; }
      const { cx, cy, cz, tx, ty, tz, bx, by, bz, nx, ny, nz, r, th, w, hot, a } = s, c = Math.cos(th), sn = Math.sin(th);
      const rx = (bx * c + nx * sn) * r, ry = (by * c + ny * sn) * r, rz = (bz * c + nz * sn) * r;
      const cur = [cx + rx - tx * w, cy + ry - ty * w, cz + rz - tz * w, cx + rx + tx * w, cy + ry + ty * w, cz + rz + tz * w, rx / (r || 1), ry / (r || 1), rz / (r || 1), u, hot, a];
      if (prev) {
        const o = bq * 12; bPos.set([prev[0], prev[1], prev[2], prev[3], prev[4], prev[5], cur[0], cur[1], cur[2], cur[3], cur[4], cur[5]], o);
        bNrm.set([prev[6], prev[7], prev[8], prev[6], prev[7], prev[8], cur[6], cur[7], cur[8], cur[6], cur[7], cur[8]], o);
        bAtt.set([prev[9], 0, prev[10], prev[11], prev[9], 1, prev[10], prev[11], cur[9], 0, cur[10], cur[11], cur[9], 1, cur[10], cur[11]], bq * 16); bq++;
      }
      prev = cur;
    }
    void seed;
  }
  function boltRib(seed, ax, ay, az, bx, by, bz, w, col, a, opts) { const n = lightningBolt(seed, ax, ay, az, bx, by, bz, bolt, opts); for (let i = 0; i < n; i++) { const s = bolt[i]; rib.seg(s[0], s[1], s[2], s[3], s[4], s[5], w * s[6], w * s[6] * .8, c4(col, a), c4(col, a * .8)); } }
  const frame = (dx, dz) => { const l = Math.hypot(dx, dz) || 1, tx = dx / l, tz = dz / l; return { tx, ty: 0, tz, bx: -tz, by: 0, bz: tx, nx: 0, ny: 1, nz: 0 }; };

  /* ---------- Garras do Abismo ---------- */
  function drawClaws(s) {
    const T0 = s.T, big = s.kind === 'warden' ? 1.25 : 1, gy = s.y;
    let tel = 0, rise = 0, grab = 0, sink = 0, lash = 0;
    if (s.phase === 'telegraph') tel = s.t / T0.telegraph; else { tel = 1; if (s.phase === 'rise') rise = s.t / T0.rise; else { rise = 1; if (s.phase === 'grab') grab = Math.min(1, s.t / .2); else if (s.phase === 'lash') lash = s.t / T0.lashT; else if (s.phase === 'sink') { sink = s.t / T0.sink; grab = s.wasHeld ? 1 : 0; } } }
    if (s.held) s.wasHeld = true;
    const fadeAll = 1 - smooth(sink), circ = smooth(tel * 1.1) * (1 - smooth((sink - .3) / .7));
    groundNormal(ground, s.x, s.z, nrm);
    arc(arcDark, s.x, gy, s.z, s.r * 1.18, [.03, .0, .05], 0, circ, s.id % 7, .9 * fadeAll, nrm);
    arc(arcGlow, s.x, gy, s.z, s.r * 1.12, [.72, .3, 1], 0, circ, s.id % 7, (.8 + .5 * Math.sin(time * 14) * (s.phase === 'telegraph' ? tel : 0)) * fadeAll, nrm);
    if (s.phase === 'telegraph' && tel > .5 && !low) decals.add(s.x, gy, s.z, s.r * (1.3 - tel * .3), .6, .25, 1, (tel - .5) * .6, 1, tel, s.id, nrm);
    // fumaça e filetes subindo do círculo
    const nSm = low ? 6 : 14;
    for (let i = 0; i < nSm; i++) { const a = hash(s.id + i * 1.7) * 6.283, rr = s.r * Math.sqrt(hash(s.id * 3 + i)), life = (time * .6 + hash(i + s.id)) % 1, hgt = life * (1.2 + rise * 2.4) * big;
      smoke.add(s.x + Math.cos(a) * rr, gy + .2 + hgt, s.z + Math.sin(a) * rr, (.5 + life) * big, (.7 + life * 1.2) * big, .08, .02, .13, .55 * (1 - life) * circ * fadeAll, 1, a, i);
      glow.add(s.x + Math.cos(a) * rr, gy + .1 + hgt * 1.3, s.z + Math.sin(a) * rr, .07, .22, .7, .35, 1, .8 * (1 - life) * circ * fadeAll, 3, 0, i); }
    // mãos: nascem em estágios, sobem com sobra, abrem, fecham sobre o alvo e afundam se desfazendo
    for (let h = 0; h < s.hands.length; h++) {
      const H = s.hands[h], k = smooth((rise - H.delay * 2.2) / (1 - H.delay * 2.2 + 1e-3)), poke = s.phase === 'telegraph' ? smooth((tel - .7 - H.delay) / .3) * .18 : 0;
      const grow = Math.max(poke, k <= 0 ? 0 : easeOut(k) + Math.sin(k * Math.PI) * .12);
      if (grow <= .002) continue;
      const hx = s.x + Math.cos(H.a) * H.d, hz = s.z + Math.sin(H.a) * H.d, hy = ground(hx, hz) - .25;
      const cx = s.x - hx, cz = s.z - hz, cl = Math.hypot(cx, cz) || 1, ix = cx / cl, iz = cz / cl;
      const sway = lash > 0 ? Math.sin(time * 5 + h) * .25 : 0, lean = .42 + grab * .5 + sway, sc = H.s * big * (1 - sink * .35);
      const len = 2.05 * sc * grow, dsc = sink > 0 ? -sink * 1.9 * sc : 0;
      // antebraço em dois segmentos (curva para dentro)
      const d1 = V.set(ix * Math.sin(lean * .25), Math.cos(lean * .25), iz * Math.sin(lean * .25)).clone(), d2 = new T.Vector3(ix * Math.sin(lean * .75), Math.cos(lean * .75), iz * Math.sin(lean * .75));
      const dis = Math.max(smooth(sink * 1.2), s.phase === 'telegraph' ? .25 : 0), seed = s.id * 7 + h;
      inst(limbs, hx, hy + dsc, hz, d1, .2 * sc, len * .55, .2 * sc, dis, .3, seed, 0, H.a);
      const ex = hx + d1.x * len * .55, ey = hy + dsc + d1.y * len * .55, ez = hz + d1.z * len * .55;
      inst(limbs, ex, ey, ez, d2, .15 * sc, len * .5, .15 * sc, dis, .35, seed + .3, 0, H.a);
      const wx = ex + d2.x * len * .5, wy = ey + d2.y * len * .5, wz = ez + d2.z * len * .5;
      // raízes de sombra presas ao chão
      if (!low) for (let r = 0; r < 3; r++) { const ra = H.a + (r - 1) * .9, rl = .55 * sc * grow; inst(limbs, hx, hy + .18, hz, new T.Vector3(Math.cos(ra) * .9, -.25, Math.sin(ra) * .9), .07 * sc, rl, .07 * sc, dis, .2, seed + r, 0); }
      // palma voltada para o centro, dedos abrem na subida e fecham na mordida
      const palmDir = new T.Vector3(ix * Math.sin(lean * 1.05), Math.cos(lean * 1.05), iz * Math.sin(lean * 1.05));
      inst(limbs, wx, wy, wz, palmDir, .2 * sc, .34 * sc * grow, .11 * sc, dis, .45, seed + .7, 0, Math.atan2(ix, iz) + Math.PI / 2);
      const px = wx + palmDir.x * .32 * sc * grow, py = wy + palmDir.y * .32 * sc * grow, pz = wz + palmDir.z * .32 * sc * grow;
      const curl = Math.min(1.25, (s.phase === 'telegraph' ? .2 : .15 + grab * 1.05 + (lash > 0 ? .35 + .35 * Math.sin(time * 7 + h) : 0)) + sink * .4);
      const side = new T.Vector3(-iz, 0, ix);
      for (let f = 0; f < 5; f++) {
        const thumb = f === 4, spread = thumb ? -1.25 : (f - 1.5) * (.34 - grab * .14), fl = (thumb ? .34 : [.46, .54, .5, .4][f]) * sc * grow;
        let dir = palmDir.clone().applyAxisAngle(side, 0).add(side.clone().multiplyScalar(Math.sin(spread) * (thumb ? 1 : .9))).normalize();
        let x = px + side.x * (thumb ? -.2 : (f - 1.5) * .12) * sc, y = py - (thumb ? .18 * sc : 0), z = pz + side.z * (thumb ? -.2 : (f - 1.5) * .12) * sc;
        const segs = thumb ? 2 : 3;
        for (let j = 0; j < segs; j++) {
          const l = fl * (j === 0 ? .42 : j === 1 ? .32 : .26) * 1.9;
          inst(limbs, x, y, z, dir, (.07 - j * .012) * sc, l, (.065 - j * .011) * sc, dis, .45 + j * .1, seed + f * .1 + j, 0);
          x += dir.x * l; y += dir.y * l; z += dir.z * l;
          dir.applyAxisAngle(side, curl * (.55 + j * .2));
        }
        inst(claws, x, y, z, dir, .045 * sc, .26 * sc * grow, .045 * sc, dis, 1, seed + f, .8, 0);
      }
      // detritos da erupção
      if (rise > 0 && rise < 1.6 && !low) for (let r = 0; r < 4; r++) { const age = s.phase === 'rise' ? s.t : T0.rise + (s.phase === 'grab' || s.phase === 'lash' ? s.t : T0.lashT); const va = H.a + r * 1.6, vs = 2 + hash(seed + r) * 2.5, vy = 3.5 + hash(seed * 2 + r) * 3;
        if (age < 1.3) { const ry = hy + .3 + vy * age - 9 * age * age * .5, gy2 = ground(hx + Math.cos(va) * vs * age, hz + Math.sin(va) * vs * age); rock(hx + Math.cos(va) * vs * age, Math.max(gy2 + .03, ry), hz + Math.sin(va) * vs * age, (.04 + hash(r + seed) * .06) * (1 - smooth((age - 1) / .3)), age * 7 + r, va); } }
      if (k > 0 && k < 1) for (let q = 0; q < (low ? 2 : 5); q++) glow.add(wx + (hash(q + seed) - .5) * .6, wy + (hash(q * 3 + seed) - .5) * .6, wz + (hash(q * 7 + seed) - .5) * .6, .05, .25, .9, .5, 1, 1 - k, 3, hash(q) * 6, q);
      // ligadura: correntes de energia das mãos até o alvo preso
      if (s.held || (s.phase === 'sink' && s.wasHeld && sink < .5)) { const tx = s.held ? s.held.ax : s.x, tz = s.held ? s.held.az : s.z, ty = ground(tx, tz) + 1.1; const a2 = s.held ? 1 : 1 - sink * 2;
        boltRib(seed * 13 + Math.floor(time * 16), px, py, pz, tx, ty, tz, .07, LILAC, .9 * a2, { depth: 1, jag: .3, branches: .2 }); }
    }
    if (s.held) { const x = s.held.ax, z = s.held.az, y = ground(x, z); for (let i = 0; i < (low ? 2 : 4); i++) { const yy = y + .35 + i * .38, rr = .55 - i * .05, ph = time * 3 + i; for (let j = 0; j < 12; j++) { const a0 = j / 12 * 6.283 + ph, a1 = (j + 1) / 12 * 6.283 + ph; rib.seg(x + Math.cos(a0) * rr, yy, z + Math.sin(a0) * rr, x + Math.cos(a1) * rr, yy, z + Math.sin(a1) * rr, .035, .035, c4(VIOLET, .9), c4(LILAC, .9)); } } }
  }

  /* ---------- Espiral Devoradora ---------- */
  function spiralBody(x, y, z, dx, dz, R, L, spin, alpha, scale, unravel = 0) {
    const F = frame(dx, dz), K = low ? 3 : 5;
    for (let k = 0; k < K; k++) band(low ? 14 : 22, u => {
      const along = -u * L, rad = R * (.2 + .8 * Math.sin(Math.min(1, Math.pow(u, .55) * 1.05) * Math.PI * .5)) * (1 + unravel * (.7 + u * .5)) * scale;
      return { cx: x + F.tx * along, cy: y, cz: z + F.tz * along, tx: F.tx, ty: 0, tz: F.tz, bx: F.bx, by: 0, bz: F.bz, nx: 0, ny: 1, nz: 0, r: rad, th: spin * (1 + k * .12) + k / K * 6.283 + u * (5.5 + k * .4), w: (.1 + .36 * Math.sin(u * Math.PI)) * R * scale * (k % 2 ? .65 : 1), hot: k % 2 ? .75 : .12, a: alpha * (1 - Math.pow(u, 3)) };
    }, k);
  }
  function drawSpiral(s, burstK) {
    const big = s.kind === 'warden' ? 1.35 : 1, R = .95 * big, L = 3.4 * big, live = s.phase === 'fly';
    if (live) {
      spiralBody(s.x, s.y, s.z, s.dx, s.dz, R, L, -s.spin, 1, 1);
      // núcleo violeta/branco com ponta brilhante e massa interna
      instQ(energy, s.x - s.dx * .35, s.y, s.z - s.dz * .35, Q.setFromUnitVectors(up, V.set(s.dx, 0, s.dz)), .42 * big, .9 * big, .42 * big, 0, 1, s.id, 0);
      instQ(energy, s.x - s.dx * L * .45, s.y, s.z - s.dz * L * .45, Q.setFromUnitVectors(up, V.set(s.dx, 0, s.dz)), R * .62, L * .5, R * .62, 0, .55, s.id + 3, 0);
      instQ(energy, s.x, s.y, s.z, Q.identity(), .22 * big, .22 * big, .22 * big, 2, 1, s.id, 0);
      glow.add(s.x, s.y, s.z, 1.2 * big, 1.2 * big, .7, .4, 1, .9, 0); glow.add(s.x + s.dx * .2, s.y, s.z + s.dz * .2, 1.6 * big, .25 * big, 1, .9, 1, .8, 2, time * 3);
      // cauda turbulenta, filamentos claros e estilhaços
      for (let i = 0; i < (low ? 8 : 18); i++) { const u = ((time * 2.2 + i / 18) % 1), off = L * (.6 + u * 1.1), a = i * 2.4 + time * 4, rr = R * (.4 + u * .9);
        smoke.add(s.x - s.dx * off + Math.cos(a) * rr * F2(s).bx, s.y + Math.sin(a) * rr * .8, s.z - s.dz * off + Math.cos(a) * rr * F2(s).bz, (.4 + u) * big, (.6 + u) * big, .06, .02, .1, .5 * (1 - u), 1, a, i);
        if (i % 3 === 0) rib.seg(s.x - s.dx * off * .6, s.y + Math.sin(a) * rr * .5, s.z - s.dz * off * .6, s.x - s.dx * (off + .9), s.y + Math.sin(a + .5) * rr * .7, s.z - s.dz * (off + .9), .05, .01, c4(WHITE, .45 * (1 - u)), c4(LILAC, 0)); }
      if (!low) for (let i = 0; i < 9; i++) { const a = s.spin * 1.4 + i * .7, u = (i / 9 + time * .3) % 1, rr = R * (.9 + hash(i) * .5), F = F2(s);
        rock(s.x - s.dx * u * L + (F.bx * Math.cos(a)) * rr, s.y + Math.sin(a) * rr, s.z - s.dz * u * L + (F.bz * Math.cos(a)) * rr, .05 + hash(i * 3) * .06, a, i); }
      groundNormal(ground, s.x, s.z, nrm); decals.add(s.x, ground(s.x, s.z), s.z, 1.3 * big, .5, .2, 1, .35, 2, 0, s.id, nrm);
    } else {
      // explosão giratória: as faixas se desenrolam para fora, clarão contido, onda e detritos
      const k = burstK, e = easeOut(k), clash = s.why === 'clash';
      spiralBody(s.x, s.y, s.z, s.dx, s.dz, R * (.8 + e * .6), L * (1 - e * .7), -s.spin - k * 9, 1 - smooth(k), 1, e);
      instQ(energy, s.x, s.y, s.z, Q.identity(), (.6 + e * 1.5) * big, (.6 + e * 1.5) * big, (.6 + e * 1.5) * big, 1, (1 - k) * 1.3, s.id, k * .8);
      if (k < .3) instQ(energy, s.x, s.y, s.z, Q.identity(), .5 * big * (1 - k), .5 * big * (1 - k), .5 * big * (1 - k), 2, 1, s.id, 0);
      glow.add(s.x, s.y, s.z, 3.2 * big * (1 - k * .5), 3.2 * big * (1 - k * .5), clash ? 1 : .7, clash ? .8 : .35, 1, (1 - k) * .7, 0);
      for (let i = 0; i < (low ? 10 : 26); i++) { const a = i * 2.39996, el = (hash(i + s.id) - .4) * 1.4, d = (1.5 + hash(i * 3) * 2.5) * e * big;
        glow.add(s.x + Math.cos(a) * Math.cos(el) * d, s.y + Math.sin(el) * d, s.z + Math.sin(a) * Math.cos(el) * d, .05, .35, 1, .7, 1, 1 - k, 3, a, i);
        if (i < 14 && !low) rock(s.x + Math.cos(a) * d * .9, s.y + Math.sin(el) * d - 4 * k * k, s.z + Math.sin(a) * d * .9, (.06 + hash(i) * .08) * (1 - k * .5), k * 9 + i, a); }
      const gy = ground(s.x, s.z); if (s.y - gy < 2.5) { groundNormal(ground, s.x, s.z, nrm); decals.add(s.x, gy, s.z, (1 + e * 3.2) * big, .6, .3, 1, (1 - k) * .9, 0, k, s.id, nrm); arc(arcDark, s.x, gy, s.z, 1.4 * big, [.04, .01, .05], 2, k, s.id % 5, .7 * (1 - k), nrm); }
      for (let i = 0; i < 6; i++) smoke.add(s.x + (hash(i) - .5) * 2 * e, s.y + e * (.5 + hash(i * 2)), s.z + (hash(i * 5) - .5) * 2 * e, (1 + e * 1.4) * big, (1 + e * 1.4) * big, .07, .02, .1, .55 * (1 - k), 1, i, i);
    }
  }
  const F2 = s => frame(s.dx, s.dz);

  /* ---------- Juízo Violeta ---------- */
  function orb(x, y, z, r, seed, a, rot) {
    instQ(energy, x, y, z, Q.identity(), r, r, r, 0, a, seed, 0);
    instQ(energy, x, y, z, Q.identity(), r * .45, r * .45, r * .45, 2, a, seed, 0);
    for (let i = 0; i < 3; i++) { Q.setFromEuler(new T.Euler(rot * (1 + i * .3) + i * 1.1, rot * .6 + i * 2.1, i * .7)); instQ(rings, x, y, z, Q, r * (1.35 + i * .22), r * (1.35 + i * .22), r * (1.35 + i * .22), 0, .5, seed + i, .3); }
    glow.add(x, y, z, r * 3.4, r * 3.4, .6, .3, 1, .55 * a, 0);
    if (!low) for (let i = 0; i < 3; i++) { const a0 = time * 3 + i * 2.1, a1 = a0 + 1.6 + Math.sin(time * 7 + i); boltRib(seed * 31 + i + Math.floor(time * 12), x + Math.cos(a0) * r * 1.05, y + Math.sin(a0 * 1.3) * r, z + Math.sin(a0) * r * 1.05, x + Math.cos(a1) * r * 1.2, y + Math.sin(a1) * r * .9, z + Math.sin(a1) * r * 1.2, .05, LILAC, .8 * a, { depth: 1, jag: .35 }); }
  }
  function drawJudgment(s) {
    const T0 = s.T, big = s.kind === 'warden' ? 1.3 : 1, R = .95 * big, ph = s.phase; let k = 0;
    const gy = s.my; groundNormal(ground, s.mx, s.mz, nrm);
    const prog = ph === 'prep' ? s.t / T0.prep : 1, lockK = ph === 'lock' ? s.t / T0.lock : ph === 'prep' ? 0 : 1;
    const fade = ph === 'fade' ? s.t / T0.fade : 0, alive = 1 - smooth(fade);
    // marca de perigo irregular: cresce e acompanha só na preparação; travada pulsa mais rápido
    if (ph === 'prep' || ph === 'lock' || ph === 'beam') { arc(arcDark, s.mx, gy, s.mz, s.r * 1.12, [.05, 0, .05], 1, prog, s.id % 9, .75, nrm); arc(arcGlow, s.mx, gy, s.mz, s.r * 1.05, lockK > 0 ? [1, .35, .9] : [.7, .3, 1], 1, Math.min(1, prog * 1.2) * (.6 + lockK * .4), s.id % 9, .9, nrm); }
    // orbe: forma-se aos poucos e comprime antes de soltar a coluna
    const orbR = ph === 'prep' ? R * easeOut(prog) * (.3 + .7 * prog) : ph === 'lock' ? R * (1 - .28 * smooth(lockK)) : ph === 'beam' ? R * .72 * (1 - s.t / T0.beam * .6) : 0;
    if (orbR > .01) { orb(s.ox, s.oy, s.oz, orbR, s.id, 1, time * 1.6);
      if (ph === 'prep' && !low) for (let i = 0; i < 10; i++) { const a = i * 2.4 + time * 2, u = (time * 1.4 + i / 10) % 1, rr = (1 - u) * 2.6 * big; glow.add(s.ox + Math.cos(a) * rr, s.oy + Math.sin(a * 1.7) * rr * .6, s.oz + Math.sin(a) * rr, .05, .3, .8, .45, 1, u, 3, a + 1.57, i); } }
    if (ph === 'beam' || ph === 'blast') {
      const bt = ph === 'beam' ? s.beamY : gy, top = s.oy, bw = (ph === 'beam' ? .55 : .9 * (1 - s.t / .35)) * big;
      if (bw > .02) { P.set(s.mx, bt, s.mz); S.set(bw, Math.max(.01, top - bt), bw); M.compose(P, Q.identity(), S); if (beams.n < beams.max) { beams.m.setMatrixAt(beams.n, M); beams.a.set([0, 1, s.id, 0], beams.n * 4); beams.n++; }
        P.set(s.mx, bt, s.mz); S.set(bw * .35, Math.max(.01, top - bt), bw * .35); M.compose(P, Q.identity(), S); if (beams.n < beams.max) { beams.m.setMatrixAt(beams.n, M); beams.a.set([0, 1.6, s.id + 5, 0], beams.n * 4); beams.n++; }
        for (let i = 0; i < (low ? 1 : 3); i++) boltRib(s.id * 17 + i + Math.floor(time * 20), s.mx + (hash(i) - .5) * bw * 2, top, s.mz + (hash(i * 3) - .5) * bw * 2, s.mx + (hash(i * 5) - .5) * bw * 3, bt, s.mz + (hash(i * 7) - .5) * bw * 3, .08 * big, LILAC, .9, { depth: 2, jag: .18 });
        // anéis de compressão na frente da coluna
        for (let i = 0; i < 2; i++) { Q.setFromEuler(new T.Euler(Math.PI / 2, 0, time * 4 + i)); const rr = bw * (1.6 + i * .7); instQ(rings, s.mx, bt + .25 + i * .35, s.mz, Q, rr, rr, rr, 0, 1, s.id + 9 + i, 1); } }
    }
    if (ph === 'blast' || ph === 'fade') {
      const age = ph === 'blast' ? s.t : .35 + s.t, kk = Math.min(1, age / (.35 + T0.fade)), e = easeOut(Math.min(1, age / .55)), cy = gy + .9 * big;
      // esfera de choque com núcleo, raios ramificados, anéis quebrados, lascas e mini-cratera
      instQ(energy, s.mx, cy, s.mz, Q.identity(), (.6 + e * s.r * .95), (.6 + e * s.r * .85), (.6 + e * s.r * .95), 1, (1 - smooth(kk * 1.6)) * 1.1, s.id, kk);
      if (age < .25) instQ(energy, s.mx, cy, s.mz, Q.identity(), 1.4 * big * (1 - age * 2), 1.4 * big * (1 - age * 2), 1.4 * big * (1 - age * 2), 2, 1, s.id, 0);
      glow.add(s.mx, cy, s.mz, s.r * 3.4 * (1 - kk * .5), s.r * 3.4 * (1 - kk * .5), .8, .45, 1, .8 * (1 - smooth(kk * 2)), 0);
      for (let i = 0; i < 4; i++) { Q.setFromEuler(new T.Euler(hash(i + s.id) * 1.2 - .6 + Math.PI / 2, hash(i * 9) * 6, kk * 2 * (i % 2 ? 1 : -1))); const rr = .6 + e * s.r * (1 + i * .22); instQ(rings, s.mx, cy + (i - 1.5) * .25, s.mz, Q, rr, rr, rr, Math.min(1, kk * 1.6), .9 * (1 - kk), s.id + 20 + i, .6); }
      if (age < .5 && !low) for (let i = 0; i < 6; i++) { const a = i * 1.047 + s.id, l = s.r * (1.2 + hash(i) * .8) * e; boltRib(s.id * 41 + i, s.mx, cy, s.mz, s.mx + Math.cos(a) * l, gy + hash(i * 4) * 1.5, s.mz + Math.sin(a) * l, .09 * big, LILAC, 1 - age * 2, { depth: 2, jag: .3 }); }
      for (let i = 0; i < (low ? 10 : 24); i++) { const a = i * 2.39996, vs = (2.5 + hash(i * 3 + s.id) * 4) * big, vy = 3 + hash(i * 7) * 5, t2 = Math.min(age, 1.5);
        rock(s.mx + Math.cos(a) * vs * t2, Math.max(gy + .05, gy + .2 + vy * t2 - 9.8 * t2 * t2 * .5), s.mz + Math.sin(a) * vs * t2, (.06 + hash(i) * .12) * (1 - smooth((age - 1.2) / .4)), t2 * 8 + i, a); }
      arc(arcDark, s.mx, gy, s.mz, s.r * .9, [.04, .01, .05], 2, kk, s.id % 5, 1, nrm); arc(arcGlow, s.mx, gy, s.mz, s.r * .8, [.8, .35, 1], 2, kk, s.id % 5, .9, nrm);
      decals.add(s.mx, gy, s.mz, .6 + e * s.r * 2.1, .7, .35, 1, 1 - kk, 0, kk, s.id, nrm);
      for (let i = 0; i < (low ? 5 : 12); i++) { const a = i * 1.9, d = s.r * (.3 + hash(i) * .8) * e; smoke.add(s.mx + Math.cos(a) * d, gy + .4 + kk * (1.5 + hash(i) * 2), s.mz + Math.sin(a) * d, (1.2 + kk * 1.6) * big, (1.4 + kk * 2) * big, .06, .02, .09, .6 * (1 - kk), 1, a, i); }
    }
    void alive;
  }

  /* ---------- Contra-selo e choque magia × magia ---------- */
  function drawCounter(s, k) {
    const big = s.kind === 'warden' ? 1.3 : 1;
    if (s.phase === 'fly') {
      instQ(energy, s.x, s.y, s.z, Q.identity(), .3 * big, .3 * big, .3 * big, 0, 1, s.id, 0);
      Q.setFromEuler(new T.Euler(s.spin, s.spin * .7, 0)); instQ(rings, s.x, s.y, s.z, Q, .45 * big, .45 * big, .45 * big, 0, .8, s.id, .5);
      rib.seg(s.x, s.y, s.z, s.x - s.dx * 1.6, s.y, s.z - s.dz * 1.6, .16 * big, .02, c4(VIOLET, .9), c4(VIOLET, 0));
      dseg(s.x, s.y + .05, s.z, s.x - s.dx * 1.2, s.y + .1, s.z - s.dz * 1.2, .1, .01, [.02, 0, .04, .8], [.02, 0, .04, 0]);
    } else {
      const e = easeOut(k), clash = s.why === 'clash';
      instQ(energy, s.x, s.y, s.z, Q.identity(), .4 + e * 1.8, .4 + e * 1.8, .4 + e * 1.8, 1, (1 - k) * 1.3, s.id, k);
      glow.add(s.x, s.y, s.z, 2.6 * (1 - k * .4), 2.6 * (1 - k * .4), clash ? 1 : .7, clash ? .85 : .4, clash ? .7 : 1, (1 - k) * .9, 0);
      for (let i = 0; i < (low ? 8 : 18); i++) { const a = i * 2.39996, el = (hash(i) - .5) * 1.5, d = 2.2 * e; glow.add(s.x + Math.cos(a) * Math.cos(el) * d, s.y + Math.sin(el) * d, s.z + Math.sin(a) * Math.cos(el) * d, .05, .3, i % 2 ? 1 : .7, i % 2 ? .82 : .4, i % 2 ? .45 : 1, 1 - k, 3, a, i); }
      if (clash) decals.add(s.x, ground(s.x, s.z), s.z, 1 + e * 2.5, 1, .7, .6, .7 * (1 - k), 0, k, s.id);
    }
  }
  /** Carga nas mãos do conjurador antes do lançamento (a magia nasce na fonte certa). */
  function drawCharge(c) {
    const k = c.k, big = c.kind === 'warden' ? 1.3 : 1, x = c.x, y = c.y, z = c.z;
    if (c.skill === 'spiral') { spiralBody(x, y, z, c.dx, c.dz, .55 * big * easeOut(k), 1.2 * big * k, -time * 9, smooth(k * 1.4), 1); instQ(energy, x, y, z, Q.identity(), .25 * k * big, .25 * k * big, .25 * k * big, 0, 1, 77, 0);
      for (let i = 0; i < (low ? 4 : 10); i++) { const a = i * 2.4 + time * 5, rr = (1 - ((time * 2 + i / 10) % 1)) * 1.6; glow.add(x + Math.cos(a) * rr, y + Math.sin(a * 1.3) * rr * .6, z + Math.sin(a) * rr, .04, .22, .8, .45, 1, k, 3, a + 1.57, i); } }
    else if (c.skill === 'claws') { groundNormal(ground, c.gx, c.gz, nrm); arc(arcGlow, c.gx, ground(c.gx, c.gz), c.gz, .9 * big * k, [.7, .3, 1], 0, k, 3, .7, nrm); for (let i = 0; i < 6; i++) { const a = i * 1.047 + time * 3; dseg(x, y, z, x + Math.cos(a) * .5 * k, y - .9 * k, z + Math.sin(a) * .5 * k, .05, .01, [.03, 0, .05, .8 * k], [.03, 0, .05, 0]); } glow.add(x, y, z, .6 * k, .6 * k, .7, .3, 1, .8, 0); }
    else if (c.skill === 'judgment') { instQ(energy, x, y + .3, z, Q.identity(), .18 * k * big, .18 * k * big, .18 * k * big, 0, 1, 99, 0); glow.add(x, y + .3, z, .9 * k, .9 * k, .7, .35, 1, .8, 0); for (let i = 0; i < 2; i++) boltRib(i + Math.floor(time * 14), x, y + .3, z, x + (hash(i + time) - .5) * .8, y + .9 + hash(i) * .5, z + (hash(i * 3 + time) - .5) * .8, .03, LILAC, .7 * k, { depth: 1 }); }
    else if (c.skill === 'counter') { glow.add(x, y, z, .8 * k, .8 * k, .65, .3, 1, .9, 0); Q.setFromEuler(new T.Euler(time * 6, time * 4, 0)); instQ(rings, x, y, z, Q, .32 * k, .32 * k, .32 * k, 0, 1, 5, .5); }
  }
  /** Rastro da foice: fita vermelho-sangue com núcleo negro amostrando as duas lâminas. */
  const scy = Array.from({ length: 14 }, () => ({ a: new T.Vector3(), b: new T.Vector3(), t: -9 })); let si = 0;
  function drawScythe() {
    for (let k = 0; k < scy.length - 1; k++) { const a = scy[(si - k + scy.length) % scy.length], b = scy[(si - k - 1 + scy.length) % scy.length]; if (b.t < 0 || time - b.t > .2) break;
      const fa = 1 - (time - a.t) / .2, fb = 1 - (time - b.t) / .2;
      rib.seg(a.a.x, a.a.y, a.a.z, b.a.x, b.a.y, b.a.z, .14 * fa, .14 * fb, c4(BLOOD, fa), c4(BLOOD, fb * .6), k / 8, (k + 1) / 8);
      rib.seg(a.b.x, a.b.y, a.b.z, b.b.x, b.b.y, b.b.z, .1 * fa, .1 * fb, c4(BLOOD, fa * .8), c4(BLOOD, fb * .5), k / 8, (k + 1) / 8);
      dseg(a.a.x, a.a.y, a.a.z, b.a.x, b.a.y, b.a.z, .06 * fa, .06 * fb, [.03, 0, 0, .8 * fa], [.03, 0, 0, .6 * fb]); }
  }
  const burstK = s => Math.min(1, s.t / (s.T.burst || .55));
  return {
    root,
    /** Amostra das lâminas da foice durante o golpe. */
    scythe(tipA, tipB) { si = (si + 1) % scy.length; scy[si].a.copy(tipA); scy[si].b.copy(tipB); scy[si].t = time; },
    /** spells: lista da lógica; charges: [{skill, k, x,y,z, dx,dz, gx,gz, kind}] (mãos dos conjuradores). */
    update(dt, camera, spells, charges = [], quality = 1) {
      time += dt; uTime.value = time; low = quality === 0; eye.copy(camera.position);
      limbs.n = claws.n = rings.n = energy.n = beams.n = 0; rockN = 0; bq = 0; dq = 0; arcDark.n = arcGlow.n = 0;
      glow.begin(); smoke.begin(); rib.begin(camera, time); decals.begin();
      for (const s of spells) { if (s.type === 'claws') drawClaws(s); else if (s.type === 'spiral') drawSpiral(s, s.phase === 'burst' ? burstK(s) : 0); else if (s.type === 'judgment') drawJudgment(s); else if (s.type === 'counter') drawCounter(s, s.phase === 'burst' ? burstK(s) : 0); }
      for (const c of charges) drawCharge(c);
      drawScythe();
      for (const set of [limbs, claws, rings, energy, beams]) { set.m.count = set.n; set.m.instanceMatrix.needsUpdate = true; set.m.geometry.attributes.aFx.needsUpdate = true; }
      rocks.count = rockN; rocks.instanceMatrix.needsUpdate = true;
      for (const set of [arcDark, arcGlow]) { set.m.count = set.n; set.m.instanceMatrix.needsUpdate = true; set.m.geometry.attributes.aColor.needsUpdate = true; set.m.geometry.attributes.aMeta.needsUpdate = true; }
      bandGeo.setDrawRange(0, bq * 6); bandGeo.attributes.position.needsUpdate = bandGeo.attributes.normal.needsUpdate = bandGeo.attributes.aBand.needsUpdate = true;
      dGeo.setDrawRange(0, dq * 6); dGeo.attributes.position.needsUpdate = dGeo.attributes.aColor.needsUpdate = dGeo.attributes.aUv2.needsUpdate = true;
      glow.end(); smoke.end(); rib.end(); decals.end(time);
      return { limbs: limbs.n, claws: claws.n, rings: rings.n, energy: energy.n, beams: beams.n, rocks: rockN, bands: bq, dark: dq, arcs: arcGlow.n };
    },
    clear() { for (const s of scy) s.t = -9; },
    dispose() { scene.remove(root); root.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); glow.dispose(); smoke.dispose(); rib.dispose(); decals.dispose(); }
  };
}
