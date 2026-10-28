/**
 * MOD 229 — kit de VFX compartilhado pelas Skills 2, 3 e pela Ultimate.
 *
 * Tudo é instanciado (uma chamada de desenho por sistema), com buffers fixos alocados uma vez e reaproveitados a cada
 * quadro: nenhuma alocação por quadro, nenhuma luz dinâmica e nenhuma textura externa. Os formatos (brilho, fumaça,
 * cintilação de 4 pontas, brasa alongada, onda de choque, marca queimada) são desenhados no fragment shader, então as
 * partículas nunca aparecem como quadrados.
 */
const SOFT_VERT = `
attribute vec4 aColor; attribute vec3 aMeta; varying vec4 vC; varying vec2 vUv; varying float vKind; varying float vSeed;
void main(){
 vUv=uv; vC=aColor; vKind=aMeta.x; vSeed=aMeta.z;
 vec4 c=modelViewMatrix*instanceMatrix*vec4(0.,0.,0.,1.);
 float sx=length(instanceMatrix[0].xyz), sy=length(instanceMatrix[1].xyz);
 float r=aMeta.y; vec2 p=mat2(cos(r),sin(r),-sin(r),cos(r))*position.xy;
 c.xy+=p*vec2(sx,sy);
 gl_Position=projectionMatrix*c;
}`;
const SOFT_FRAG = `
varying vec4 vC; varying vec2 vUv; varying float vKind; varying float vSeed;
float h(vec2 p){return fract(sin(dot(p,vec2(41.3,289.1)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
void main(){
 vec2 p=vUv*2.-1.; float d=length(p); float a=0.;
 if(vKind<.5){ a=exp(-d*d*4.5); }                                            // brilho gaussiano
 else if(vKind<1.5){ float n=n2(p*2.7+vSeed*13.)*.6+n2(p*5.3-vSeed*7.)*.4; a=smoothstep(1.,.15,d+(n-.5)*.75); a*=a; } // fumaça/poeira
 else if(vKind<2.5){ vec2 q=abs(p); float rays=max(0.,1.-q.x*q.y*60.)*pow(max(0.,1.-max(q.x,q.y)),1.6); a=max(rays,exp(-d*d*14.)); } // cintilação
 else { float s=exp(-p.x*p.x*22.)*smoothstep(1.,.2,abs(p.y)); a=s; }           // brasa/faísca alongada
 if(a<.004) discard;
 gl_FragColor=vec4(vC.rgb*a*vC.a, a*vC.a);
}`;
const SOFT_FRAG_NORMAL = SOFT_FRAG.replace('gl_FragColor=vec4(vC.rgb*a*vC.a, a*vC.a);', 'gl_FragColor=vec4(vC.rgb, a*vC.a);');

/** Partículas billboard instanciadas. kind: 0 brilho, 1 fumaça, 2 cintilação, 3 brasa alongada (gira por rot). */
export function softParticles(T, max, { additive = true } = {}) {
  const geo = new T.PlaneGeometry(1, 1);
  const color = new Float32Array(max * 4), meta = new Float32Array(max * 3);
  geo.setAttribute('aColor', new T.InstancedBufferAttribute(color, 4).setUsage(T.DynamicDrawUsage));
  geo.setAttribute('aMeta', new T.InstancedBufferAttribute(meta, 3).setUsage(T.DynamicDrawUsage));
  const mat = new T.ShaderMaterial({ vertexShader: SOFT_VERT, fragmentShader: additive ? SOFT_FRAG : SOFT_FRAG_NORMAL, transparent: true, depthWrite: false,
    blending: additive ? T.CustomBlending : T.NormalBlending, blendSrc: T.OneFactor, blendDst: T.OneFactor, toneMapped: false, fog: false });
  if (!additive) mat.blending = T.NormalBlending;
  const mesh = new T.InstancedMesh(geo, mat, max); mesh.frustumCulled = false; mesh.count = 0; mesh.renderOrder = additive ? 4 : 3;
  const m = mesh.instanceMatrix.array; let n = 0;
  return {
    mesh, get count() { return n; },
    begin() { n = 0; },
    add(x, y, z, sx, sy, r, g, b, a, kind = 0, rot = 0, seed = 0) {
      if (n >= max || a <= .002 || sx <= 0) return;
      const o = n * 16; m.fill(0, o, o + 16); m[o] = sx; m[o + 5] = sy; m[o + 10] = 1; m[o + 12] = x; m[o + 13] = y; m[o + 14] = z; m[o + 15] = 1;
      color[n * 4] = r; color[n * 4 + 1] = g; color[n * 4 + 2] = b; color[n * 4 + 3] = a; meta[n * 3] = kind; meta[n * 3 + 1] = rot; meta[n * 3 + 2] = seed; n++;
    },
    end() { mesh.count = n; mesh.instanceMatrix.needsUpdate = true; geo.attributes.aColor.needsUpdate = true; geo.attributes.aMeta.needsUpdate = true; },
    dispose() { geo.dispose(); mat.dispose(); mesh.dispose(); }
  };
}

const DECAL_VERT = `
attribute vec4 aColor; attribute vec3 aMeta; varying vec4 vC; varying vec2 vUv; varying vec3 vM;
void main(){ vUv=uv; vC=aColor; vM=aMeta; gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.); }`;
const DECAL_FRAG = `
varying vec4 vC; varying vec2 vUv; varying vec3 vM; uniform float time;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){
 vec2 p=vUv*2.-1.; float d=length(p), ang=atan(p.y,p.x), k=vM.x, u=vM.y, a=0.;
 if(k<.5){ // onda de choque: anel fino que se expande, com frente brilhante e rastro suave
  float w=.035+.06*u; float ring=exp(-pow((d-.86)/w,2.)); float wake=smoothstep(.86,.3,d)*smoothstep(.0,.5,d)*.16*(1.-u);
  float rays=.82+.18*sin(ang*23.+vM.z*9.); a=(ring*rays+wake)*smoothstep(1.,.95,d); }
 else if(k<1.5){ // marca de energia: glifos radiais e brasas que esfriam
  float cells=floor(ang*12./6.2832+12.); float glyph=step(.55,h(vec2(cells,vM.z)))*smoothstep(.06,.0,abs(fract(d*5.+h(vec2(cells,1.))*.5)-.5)-.18);
  float core=exp(-d*d*6.); float rim=exp(-pow((d-.7)/.08,2.))*(.6+.4*sin(ang*7.+vM.z*3.));
  a=(core*.9+glyph*.6*smoothstep(1.,.3,d)+rim*.5)*smoothstep(1.,.85,d); }
 else { a=exp(-d*d*3.2)*smoothstep(1.,.7,d); } // poça de luz no chão (substitui luz dinâmica)
 if(a<.004) discard;
 gl_FragColor=vec4(vC.rgb*a*vC.a,a*vC.a);
}`;

/** Decalques no plano do terreno (instanciados): 0 onda de choque, 1 marca de energia, 2 poça de luz. Alinhados à normal. */
export function groundDecals(T, max) {
  const geo = new T.PlaneGeometry(2, 2); geo.rotateX(-Math.PI / 2);
  const color = new Float32Array(max * 4), meta = new Float32Array(max * 3);
  geo.setAttribute('aColor', new T.InstancedBufferAttribute(color, 4).setUsage(T.DynamicDrawUsage));
  geo.setAttribute('aMeta', new T.InstancedBufferAttribute(meta, 3).setUsage(T.DynamicDrawUsage));
  const mat = new T.ShaderMaterial({ vertexShader: DECAL_VERT, fragmentShader: DECAL_FRAG, uniforms: { time: { value: 0 } }, transparent: true, depthWrite: false,
    blending: T.CustomBlending, blendSrc: T.OneFactor, blendDst: T.OneFactor, toneMapped: false, fog: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const mesh = new T.InstancedMesh(geo, mat, max); mesh.frustumCulled = false; mesh.count = 0; mesh.renderOrder = 2;
  const dummy = new T.Object3D(), up = new T.Vector3(0, 1, 0), nrm = new T.Vector3(); let n = 0;
  return {
    mesh,
    begin() { n = 0; },
    /** normal: [nx,ny,nz] do terreno (opcional). */
    add(x, y, z, size, r, g, b, a, kind = 0, progress = 0, seed = 0, normal = null, spin = 0) {
      if (n >= max || a <= .002) return;
      dummy.position.set(x, y + .04, z); if (normal) { nrm.set(normal[0], normal[1], normal[2]).normalize(); dummy.quaternion.setFromUnitVectors(up, nrm); } else dummy.quaternion.identity();
      if (spin) dummy.rotateY(spin); dummy.scale.set(size, 1, size); dummy.updateMatrix(); mesh.setMatrixAt(n, dummy.matrix);
      color.set([r, g, b, a], n * 4); meta.set([kind, progress, seed], n * 3); n++;
    },
    end(time = 0) { mat.uniforms.time.value = time; mesh.count = n; mesh.instanceMatrix.needsUpdate = true; geo.attributes.aColor.needsUpdate = true; geo.attributes.aMeta.needsUpdate = true; },
    dispose() { geo.dispose(); mat.dispose(); mesh.dispose(); }
  };
}

/** Normal do terreno por diferenças finitas (para assentar decalques em encostas). */
export function groundNormal(ground, x, z, out = [0, 1, 0]) {
  const e = .6, hx = ground(x + e, z) - ground(x - e, z), hz = ground(x, z + e) - ground(x, z - e);
  const l = Math.hypot(hx, 2 * e, hz) || 1; out[0] = -hx / l; out[1] = 2 * e / l; out[2] = -hz / l; return out;
}

const RIBBON_VERT = `attribute vec4 aColor; attribute vec2 aUv2; varying vec4 vC; varying vec2 vUv;
void main(){ vC=aColor; vUv=aUv2; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const RIBBON_FRAG = `varying vec4 vC; varying vec2 vUv; uniform float time; uniform float flow;
float h(float p){return fract(sin(p*91.7)*47453.3);}
void main(){ float e=1.-abs(vUv.y*2.-1.); float core=pow(e,7.); float body=pow(e,1.4);
 float n=.65+.35*sin(vUv.x*40.-time*flow+sin(vUv.x*9.+time*2.)*2.);
 float a=body*n*vC.a; if(a<.004) discard; vec3 c=mix(vC.rgb,vec3(1.,.97,.9),core*.85);
 gl_FragColor=vec4(c*a,a); }`;

/** Fitas viradas para a câmera (rastros, raios, filamentos). Cada ponto pode ter cor/alfa e largura próprios. */
export function ribbons(T, maxQuads, { flow = 10 } = {}) {
  const pos = new Float32Array(maxQuads * 4 * 3), col = new Float32Array(maxQuads * 4 * 4), uv = new Float32Array(maxQuads * 4 * 2), idx = new Uint32Array(maxQuads * 6);
  for (let i = 0; i < maxQuads; i++) idx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 2, i * 4 + 1, i * 4 + 3], i * 6);
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.BufferAttribute(pos, 3).setUsage(T.DynamicDrawUsage));
  geo.setAttribute('aColor', new T.BufferAttribute(col, 4).setUsage(T.DynamicDrawUsage));
  geo.setAttribute('aUv2', new T.BufferAttribute(uv, 2).setUsage(T.DynamicDrawUsage));
  geo.setIndex(new T.BufferAttribute(idx, 1));
  const mat = new T.ShaderMaterial({ vertexShader: RIBBON_VERT, fragmentShader: RIBBON_FRAG, uniforms: { time: { value: 0 }, flow: { value: flow } }, transparent: true, depthWrite: false,
    blending: T.CustomBlending, blendSrc: T.OneFactor, blendDst: T.OneFactor, side: T.DoubleSide, toneMapped: false, fog: false });
  const mesh = new T.Mesh(geo, mat); mesh.frustumCulled = false; mesh.renderOrder = 5;
  const eye = new T.Vector3(), d = new T.Vector3(), v = new T.Vector3(), s0 = new T.Vector3(), s1 = new T.Vector3(); let q = 0;
  function side(out, ax, ay, az, bx, by, bz, w) { d.set(bx - ax, by - ay, bz - az); v.set(ax - eye.x, ay - eye.y, az - eye.z); out.crossVectors(d, v); const l = out.length(); if (l < 1e-6) out.set(w, 0, 0); else out.multiplyScalar(w / l); }
  return {
    mesh,
    begin(camera, time = 0) { q = 0; eye.copy(camera.position); mat.uniforms.time.value = time; },
    /** Segmento de a até b; wa/wb larguras; ca/cb cores [r,g,b,a]; ua/ub coordenada ao longo da fita. */
    seg(ax, ay, az, bx, by, bz, wa, wb, ca, cb, ua = 0, ub = 1) {
      if (q >= maxQuads) return; side(s0, ax, ay, az, bx, by, bz, wa); side(s1, ax, ay, az, bx, by, bz, wb);
      const o = q * 12; pos.set([ax - s0.x, ay - s0.y, az - s0.z, ax + s0.x, ay + s0.y, az + s0.z, bx - s1.x, by - s1.y, bz - s1.z, bx + s1.x, by + s1.y, bz + s1.z], o);
      col.set(ca, q * 16); col.set(ca, q * 16 + 4); col.set(cb, q * 16 + 8); col.set(cb, q * 16 + 12);
      uv.set([ua, 0, ua, 1, ub, 0, ub, 1], q * 8); q++;
    },
    end() { geo.setDrawRange(0, q * 6); geo.attributes.position.needsUpdate = geo.attributes.aColor.needsUpdate = geo.attributes.aUv2.needsUpdate = true; },
    get used() { return q; },
    dispose() { geo.dispose(); mat.dispose(); }
  };
}

/** Raio ramificado determinístico (semente fixa): lista de segmentos [x,y,z,X,Y,Z,largura]. Sem alocar no quadro: escreve em out. */
export function lightningBolt(seed, ax, ay, az, bx, by, bz, out, { depth = 3, jag = .22, branches = .45 } = {}) {
  let s = seed * 9301 + 49297; const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  let n = 0;
  function go(x0, y0, z0, x1, y1, z1, w, d) {
    const len = Math.hypot(x1 - x0, y1 - y0, z1 - z0), steps = Math.max(3, Math.round(len / 2.2));
    let px = x0, py = y0, pz = z0;
    for (let i = 1; i <= steps; i++) {
      const u = i / steps, j = i === steps ? 0 : len * jag / Math.sqrt(steps);
      const x = x0 + (x1 - x0) * u + (rnd() - .5) * j, y = y0 + (y1 - y0) * u + (rnd() - .5) * j * .4, z = z0 + (z1 - z0) * u + (rnd() - .5) * j;
      if (n < out.length) out[n++] = [px, py, pz, x, y, z, w * (1 - u * .55)];
      if (d > 0 && rnd() < branches * (1 - u)) { const bl = len * (.25 + rnd() * .3); go(x, y, z, x + (rnd() - .5) * bl, y - bl * (.3 + rnd() * .5), z + (rnd() - .5) * bl, w * .5, d - 1); }
      px = x; py = y; pz = z;
    }
  }
  go(ax, ay, az, bx, by, bz, 1, depth); return n;
}

export const smooth = k => { k = Math.min(1, Math.max(0, k)); return k * k * (3 - 2 * k); };
export const easeOut = k => { k = Math.min(1, Math.max(0, k)); return 1 - (1 - k) * (1 - k) * (1 - k); };
export const easeIn = k => { k = Math.min(1, Math.max(0, k)); return k * k * k; };
export function hash(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
