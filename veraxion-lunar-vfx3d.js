/**
 * BISPO 4 (VÉRAXION) · ULTIMATE — plano 1: aura escarlate viva presa aos ossos do GLB real e o X rubro no olho.
 * Cópia independente da família de aura da Skill 1 (nenhum material/uniform da S1 é tocado), mais intensa e com plumas
 * maiores; o "X" nasce em dois traços sobre o olho e segue o osso da cabeça (escondido pela própria cabeça de costas).
 */
export const VERAXION_LUNAR_VFX_BUILD = '288-aura-escarlate-x';
const R3 = i => { const s = Math.sin(i * 12.9898 + 4.1) * 43758.5453; return s - Math.floor(s); };
const clamp01 = x => Math.max(0, Math.min(1, x)), sm = x => { x = clamp01(x); return x * x * (3 - 2 * x); };
const NOISE = `float h1(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h1(i),h1(i+vec2(1,0)),f.x),mix(h1(i+vec2(0,1)),h1(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*n2(p);p*=2.03;a*=.5;}return s;}`;
const HULL_V = `#include <common>
#include <skinning_pars_vertex>
uniform float uThick,uShift,time; varying vec3 vN,vV; varying float vY;
void main(){
 #include <skinbase_vertex>
 #include <beginnormal_vertex>
 #include <skinnormal_vertex>
 vec3 transformed=vec3(position);
 #include <skinning_vertex>
 float wob=.75+.25*sin(position.y*9.+time*4.)+.2*sin(position.x*13.-time*5.);
 transformed+=normalize(objectNormal)*uThick*wob; vec4 mv=modelViewMatrix*vec4(transformed,1.); vN=normalize(normalMatrix*objectNormal); vV=-mv.xyz; vY=(modelMatrix*vec4(transformed,1.)).y;
 gl_Position=projectionMatrix*mv; gl_Position.x+=uShift*gl_Position.w; }`;
const HULL_F = `uniform vec3 uCol; uniform float uInt,time; varying vec3 vN,vV; varying float vY;
void main(){ float f=pow(1.-abs(dot(normalize(vN),normalize(vV))),3.5); float fl=.6+.4*sin(vY*7.-time*6.)*sin(vY*3.1+time*2.3);
 float a=f*uInt*fl; if(a<.01) discard; gl_FragColor=vec4(uCol*a,1.); }`;
const TONGUE_V = `uniform vec3 uAnchor[14]; uniform float time,uInt; attribute vec4 aF; attribute vec4 aA; varying vec2 vU; varying float vS;
void main(){ vU=uv; vS=aF.z; int idx=int(aA.x+.5); vec3 base=uAnchor[0];
 for(int i=0;i<14;i++){ if(i==idx) base=uAnchor[i]; }
 vec3 off=vec3(aA.y,0.,aA.z)*aA.w; float h=uv.y, L=aF.x*(.55+.45*uInt), t=time*(1.2+.6*aF.w);
 vec3 V=normalize(cameraPosition-base); vec3 side=normalize(cross(vec3(0.,1.,0.),V)); vec3 fw=normalize(cross(side,vec3(0.,1.,0.)));
 float sway=(sin(h*3.4-t*2.2+aF.z*6.)*.32+sin(h*7.-t*3.4+aF.z*11.)*.1)*h*L, curl=sin(h*2.6-t*1.5+aF.z*3.)*.22*h*L;
 float w=aF.y*pow(1.-h,1.1)*(.6+.4*smoothstep(0.,.15,h))*(.7+.3*uInt);
 vec3 p=base+off*(1.+h*.6)+vec3(0.,h*L,0.)+side*(sway+(uv.x-.5)*2.*w)+fw*curl+normalize(off+vec3(1e-4))*h*h*L*.25;
 gl_Position=projectionMatrix*viewMatrix*vec4(p,1.); }`;
const TONGUE_F = `${NOISE} uniform float time,uInt; varying vec2 vU; varying float vS;
void main(){ float h=vU.y, x=vU.x*2.-1.; float n=fbm(vec2(x*2.+vS*7.,h*4.-time*2.2));
 float e=abs(x)+.14*(n-.5); if(e>1.) discard; float a=uInt*(1.-smoothstep(.65,1.,h))*(.6+.4*smoothstep(0.,.08,h)); if(a<.02) discard;
 vec3 c=vec3(.03,.002,.004); float rim=smoothstep(.35,.97,e); c=mix(c,vec3(1.,.08,.04),rim*.95); c=mix(c,vec3(1.,.55,.4),smoothstep(.9,1.,e)*.5); /* corpo da chama translúcido, contorno rubro como pincelada */
 c=mix(c,vec3(.15,.85,.85),smoothstep(.85,.99,e)*step(x,0.)*.55); c=mix(c,vec3(.75,.15,.9),smoothstep(.85,.99,e)*step(0.,x)*.35); /* franja cromática discreta */
 gl_FragColor=vec4(c,a*mix(.38,.8,rim)*(1.-smoothstep(.9,1.,e))); }`;
const X_V = `varying vec2 vU; void main(){ vU=uv*2.-1.; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const X_F = `uniform float uA,uS1,uS2,time; varying vec2 vU; void main(){ vec2 p=vU; float d1=abs(p.x-p.y)/1.4142, d2=abs(p.x+p.y)/1.4142; float l1=(p.x+p.y)/2.83+.5, l2=(p.x-p.y)/2.83+.5;
 float s1=step(l1,uS1)*smoothstep(.12,.0,d1)*smoothstep(1.,.85,length(p)), s2=step(l2,uS2)*smoothstep(.12,.0,d2)*smoothstep(1.,.85,length(p)); float core=max(s1*smoothstep(.04,.0,d1),s2*smoothstep(.04,.0,d2));
 float glow=exp(-dot(p,p)*3.)*.35*max(uS1,uS2); float a=uA*(max(s1,s2)+glow+core); if(a<.01) discard; gl_FragColor=vec4(mix(vec3(1.,.05,.04),vec3(1.,.85,.8),core)*a*(1.+.2*sin(time*20.)),1.); }`;
export function createLunarBossVFX(T, scene) {
  const root = new T.Group(); root.name = 'VeraxionUltimateAura'; scene.add(root); const geos = [], mats = [], uTime = { value: 0 };
  const mat = o => { const m = new T.ShaderMaterial({ toneMapped: false, fog: false, ...o, uniforms: { time: uTime, ...(o.uniforms || {}) } }); mats.push(m); return m; };
  const ANCH = 14, tongueG = (() => { const g = new T.BufferGeometry(), N = 10, P = [], U = [], F = [], AA = [], I = []; let o = 0; const W = [5, 5, 2, 0, 3, 3, 2, 2, 2, 2, 3, 3, 2, 2], /* nada na cabeça: o rosto e o X ficam legíveis */ RAD = [.3, .3, .14, .16, .12, .12, .1, .1, .07, .07, .16, .16, .11, .11];
    let id = 0; for (let a = 0; a < ANCH; a++) for (let q = 0; q < W[a]; q++) { const ang = (q / W[a] + .17 * R3(id)) * 6.283, rr = RAD[a] * (.85 + .3 * R3(id + 7)), len = (a < 4 ? .62 : .38) + .45 * R3(id + 11), w = (a < 4 ? .17 : .11) + .06 * R3(id + 13);
      for (let j = 0; j <= N; j++) for (let k = 0; k < 2; k++) { P.push(0, 0, 0); U.push(k, j / N); F.push(len, w, R3(id + 17), R3(id + 19)); AA.push(a, Math.cos(ang), Math.sin(ang), rr); }
      for (let j = 0; j < N; j++) { const b = o + j * 2; I.push(b, b + 2, b + 1, b + 1, b + 2, b + 3); } o += (N + 1) * 2; id++; }
    g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(U, 2)); g.setAttribute('aF', new T.Float32BufferAttribute(F, 4)); g.setAttribute('aA', new T.Float32BufferAttribute(AA, 4)); g.setIndex(I); return g; })(); geos.push(tongueG);
  const anchorU = Array.from({ length: ANCH }, () => new T.Vector3()), auraU = { uAnchor: { value: anchorU }, uInt: { value: 0 } };
  const tongues = new T.Mesh(tongueG, mat({ vertexShader: TONGUE_V, fragmentShader: TONGUE_F, transparent: true, depthWrite: false, side: T.DoubleSide, uniforms: auraU })); tongues.frustumCulled = false; tongues.renderOrder = 5; tongues.visible = false; root.add(tongues);
  const xU = { uA: { value: 0 }, uS1: { value: 0 }, uS2: { value: 0 } }; const xm = new T.Mesh(new T.PlaneGeometry(1, 1), mat({ vertexShader: X_V, fragmentShader: X_F, transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: xU })); geos.push(xm.geometry); xm.renderOrder = 9; xm.visible = false; root.add(xm);
  let hulls = [], hullRoot = null, bones = [], head = null;
  const hullMat = (col, shift, thick) => mat({ vertexShader: HULL_V, fragmentShader: HULL_F, transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: { uCol: { value: new T.Color(col) }, uInt: { value: 0 }, uShift: { value: shift }, uThick: { value: thick } } });
  function attach(bossRoot) { if (hullRoot === bossRoot) return; detach(); if (!bossRoot) return; hullRoot = bossRoot;
    const names = ['mixamorigSpine1', 'mixamorigSpine2', 'mixamorigNeck', 'mixamorigHead', 'mixamorigLeftArm', 'mixamorigRightArm', 'mixamorigLeftForeArm', 'mixamorigRightForeArm', 'mixamorigLeftHand', 'mixamorigRightHand', 'mixamorigLeftUpLeg', 'mixamorigRightUpLeg', 'mixamorigLeftLeg', 'mixamorigRightLeg'];
    bones = names.map(n => bossRoot.getObjectByName(n) || null); head = bones[3];
    bossRoot.traverse(o => { if (o.isSkinnedMesh && hulls.length < 4) { o.updateWorldMatrix(true, false); const ws = new T.Vector3(); o.getWorldScale(ws); const sc = Math.max(1e-4, (ws.x + ws.y + ws.z) / 3);
      for (const [col, sh, th] of [[0xff1206, .0028, .06], [0x22d0ff, -.0028, .035]]) { const h = new T.SkinnedMesh(o.geometry, hullMat(col, sh, th / sc)); h.bind(o.skeleton, o.bindMatrix); h.bindMode = o.bindMode; h.frustumCulled = false; h.renderOrder = 5; h.visible = false; h.position.copy(o.position); h.quaternion.copy(o.quaternion); h.scale.copy(o.scale); o.parent.add(h); hulls.push(h); } } }); }
  function detach() { for (const h of hulls) { h.parent && h.parent.remove(h); h.material.dispose(); } hulls = []; hullRoot = null; bones = []; head = null; }
  const V = new T.Vector3(), F = new T.Vector3();
  return { root, attach, detach,
    /** k = intensidade da aura (0..1.4), xk = progresso do X (0..1), boss {x,y,z,yaw,h} */
    update(k, xk, boss, dt) { uTime.value += dt; auraU.uInt.value = k; tongues.visible = k > .02 && bones.length > 0; if (tongues.visible) bones.forEach((b, i) => { if (b) b.getWorldPosition(anchorU[i]); else anchorU[i].set(boss.x, boss.y + boss.h * .6, boss.z); });
      for (const h of hulls) { h.visible = k > .02; h.material.uniforms.uInt.value = k * (h.material.uniforms.uShift.value < 0 ? .25 : .8); }
      xm.visible = xk > .001 && !!head; if (xm.visible) { head.getWorldPosition(V); F.set(Math.sin(boss.yaw), 0, Math.cos(boss.yaw)); const R = new T.Vector3(F.z, 0, -F.x);
        xm.position.copy(V).addScaledVector(F, boss.h * .09).addScaledVector(R, -boss.h * .022).addScaledVector(new T.Vector3(0, 1, 0), boss.h * .012); xm.lookAt(V.copy(xm.position).add(F)); xm.scale.setScalar(boss.h * (.08 + .05 * sm(xk))); xU.uA.value = Math.min(1, xk * 2.2); xU.uS1.value = sm(xk / .45); xU.uS2.value = sm((xk - .4) / .45); } },
    clear() { tongues.visible = xm.visible = false; for (const h of hulls) h.visible = false; },
    dispose() { detach(); scene.remove(root); for (const g of geos) g.dispose(); for (const m of mats) m.dispose(); } };
}
