/**
 * MOD 262 — ESPADA CÓSMICA de VORGAZHEK (Bispo 2), modelada em 3D a partir da referência do criador:
 * lâmina longa, estreita e gótica, de metal escuro prateado, com o corpo VAZADO; dentro da cavidade, um vazio estelar
 * com uma fita prateada serpenteando e um núcleo de galáxia espiral branco-quente. Bordas serrilhadas com farpas,
 * ponta finíssima. Guarda enorme com duas asas em crescente cheias de farpas, curvadas para o lado da ponta, e um olho
 * negro-violeta no centro. Cabo comprido com espirais e pomo em orbe negro-violeta cercado de pontas.
 *
 * Eixo: +Y = ponta; origem = ponto da pega (mão). Dimensões em metros (escala 1): lâmina 1,32, cabo+pomo 0,52.
 * `buildCosmicSword(T, {clip})`: com clip, todas as malhas descartam o que estiver ACIMA de `userData.clipY.value`
 * (y de mundo) — é assim que a versão gigante atravessa o círculo mágico com a ponta primeiro (recorte real).
 */
export const COSMIC_SWORD = { blade: 1.32, guardY: .06, grip: .4, pommel: .12, wing: .44 };

const GALAXY_V = `uniform float clipOn; varying vec2 vU; varying float vWy; void main(){ vU=uv; vec4 w=modelMatrix*vec4(position,1.); vWy=w.y; gl_Position=projectionMatrix*viewMatrix*w; }`;
const GALAXY_F = `uniform float time, clipY, glow; varying vec2 vU; varying float vWy;
float h1(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h1(i),h1(i+vec2(1,0)),f.x),mix(h1(i+vec2(0,1)),h1(i+vec2(1,1)),f.x),f.y);}
void main(){ if(vWy>clipY) discard;
 vec2 p=vU; /* x: -1..1 através da lâmina, y: 0 guarda .. 1 ponta */
 vec3 c=vec3(.006,.004,.02)+vec3(.05,.02,.1)*n2(p*vec2(3.,9.)+time*.05);
 // estrelas
 vec2 sc=p*vec2(14.,60.); vec2 id=floor(sc); float st=h1(id); vec2 f=fract(sc)-.5; float star=step(.93,st)*exp(-dot(f,f)*60.)*(.6+.4*sin(time*3.+st*40.)); c+=vec3(.85,.85,1.)*star;
 // fita prateada serpenteando
 float sx=.55*sin(p.y*10.-time*.6+1.2)*(1.-p.y*.5), rib=exp(-pow((p.x-sx)*7.,2.)); c=mix(c,vec3(.78,.78,.86),rib*.85); c+=vec3(.5,.45,.7)*exp(-pow((p.x-sx)*3.,2.))*.25;
 // núcleo de galáxia espiral, branco-quente, na metade de baixo da lâmina
 vec2 g=vec2(p.x*.9,(p.y-.42)*5.2); float r=length(g), a=atan(g.y,g.x), arm=.5+.5*sin(a*2.-log(r+.02)*5.-time*1.4);
 float disk=exp(-r*2.2)*(.35+.65*arm), core=exp(-r*r*14.);
 c+=vec3(.55,.42,.9)*disk*1.1*glow+vec3(1.,.95,.86)*core*2.4*glow;
 gl_FragColor=vec4(c,1.); }`;

function shapeGeo(T, sh, depth, bevel = .004) { const g = new T.ExtrudeGeometry(sh, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, curveSegments: 10 }); g.translate(0, 0, -depth / 2); return g; }
function merge(T, list) { // junta geometrias não indexadas (mesma lista de atributos: position, normal)
  let n = 0; const parts = list.map(g => { g = g.index ? g.toNonIndexed() : g; g.deleteAttribute('uv'); g.computeVertexNormals(); n += g.attributes.position.count; return g; });
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let o = 0; for (const g of parts) { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; g.dispose(); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('normal', new T.BufferAttribute(nor, 3)); return g;
}
/** recorte por y de mundo nos materiais padrão (versão gigante) */
function clipStd(mat, clipY) { mat.onBeforeCompile = sh => { sh.uniforms.clipY = clipY; sh.vertexShader = 'varying float vWy;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vWy = (modelMatrix * vec4(transformed, 1.0)).y;');
  sh.fragmentShader = 'uniform float clipY; varying float vWy;\n' + sh.fragmentShader.replace('void main() {', 'void main() {\n if (vWy > clipY) discard;'); }; mat.customProgramCacheKey = () => 'cosmicClip'; }

/* CHAMAS NEGRAS (refino Mod 262): línguas fluidas presas à lâmina e às asas da guarda. A base nasce na superfície da
   espada e a língua sobe no eixo VERTICAL DO MUNDO (fogo sobe, não importa como a espada está), afinando até uma ponta
   finíssima. A SILHUETA vem de uma máscara de chama (base larga → topo fino) que o ruído só deforma; o ondular é contínuo
   no tempo (senos + ruído com fase por língua, sem partículas que pulam). Núcleo preto profundo, contorno prata/cinza
   frio e raras fissuras claras — legível no escuro, sem virar fumaça nem bloco. */
const FLAME_V = `uniform float time, flameScale; attribute vec3 aBase; attribute vec4 aF; varying vec2 vU; varying vec4 vF; varying float vWy;
void main(){ vU=uv; vF=aF; vec4 wb=modelMatrix*vec4(aBase,1.); float sc=length(modelMatrix[1].xyz)*flameScale, h=uv.y, L=aF.x*sc, W=aF.y*sc;
 vec3 up=vec3(0.,1.,0.), toCam=normalize(cameraPosition-wb.xyz), side=normalize(cross(up,toCam)+vec3(1e-4,0.,1e-4));
 float t=time*(1.5+.7*aF.w); float sway=(sin(h*3.4-t*2.2+aF.z*6.)*.3+sin(h*7.3-t*3.4+aF.z*11.)*.1)*pow(h,1.6)*L; /* S que se retorce, maior na ponta */
 vec3 p=wb.xyz+up*(h*L)+side*((uv.x*2.-1.)*W+sway)-toCam*(.04*h*L*sin(t+aF.z*4.));
 vWy=p.y; gl_Position=projectionMatrix*viewMatrix*vec4(p,1.); }`;
const FLAME_F = `uniform float time, clipY; varying vec2 vU; varying vec4 vF; varying float vWy;
float h1(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h1(i),h1(i+vec2(1,0)),f.x),mix(h1(i+vec2(0,1)),h1(i+vec2(1,1)),f.x),f.y);}
void main(){ if(vWy>clipY) discard; float h=vU.y, x=vU.x*2.-1., t=time*(1.5+.7*vF.w);
 float n=n2(vec2(x*2.2+vF.z*9.,h*3.6-t*2.4)), n3=n2(vec2(x*5.+vF.z*3.,h*8.-t*3.8));
 float xc=(n-.5)*.45*h+.25*sin(h*5.-t*2.6+vF.z*7.)*h*h; /* eixo da língua ondula */
 float hw=pow(1.-h,1.25)*(.55+.45*smoothstep(0.,.14,h))*(.8+.32*n)+.01; /* máscara de chama: base larga, ponta finíssima */
 float d=abs(x-xc)/hw; if(d>1.) discard;
 float rim=smoothstep(.62,.98,d), streak=smoothstep(.75,.95,n2(vec2(x*9.+vF.z,h*12.-t*5.)))*(1.-rim);
 float inner=1.-smoothstep(.0,.07,abs(x-xc-.42*hw*sin(h*6.5-t*3.1+vF.z*5.))); /* fio prateado interno que acompanha a curva */
 vec3 c=vec3(.006,.006,.012); c=mix(c,vec3(.13,.13,.16),streak*.6); c=mix(c,vec3(.6,.62,.7),inner*.55*(1.-h*.6)); c=mix(c,vec3(.72,.74,.82),rim*(.65+.35*n3));
 c+=vec3(.55,.45,.95)*smoothstep(.93,.985,n3)*(1.-rim)*.7*(1.-h); /* fissura rara */
 gl_FragColor=vec4(c,1.); }`;

function flameGeo(T, bases) { const N = 12, P = [], B = [], U = [], F = [], I = []; let o = 0;
  for (const b of bases) { for (let j = 0; j <= N; j++) for (let k = 0; k < 2; k++) { P.push(b.p[0], b.p[1], b.p[2]); B.push(b.p[0], b.p[1], b.p[2]); U.push(k, j / N); F.push(b.len, b.w, b.seed, b.ph); }
    for (let j = 0; j < N; j++) { const a = o + j * 2; I.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } o += (N + 1) * 2; }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setAttribute('aBase', new T.Float32BufferAttribute(B, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(U, 2)); g.setAttribute('aF', new T.Float32BufferAttribute(F, 4)); g.setIndex(I); return g; }

export function buildCosmicSword(T, o = {}) {
  const C = COSMIC_SWORD, root = new T.Group(); root.name = 'EspadaCosmica';
  const time = { value: 0 }, clipY = { value: 1e9 }, glow = { value: 1 };
  const metal = new T.MeshStandardMaterial({ color: 0x8a8d98, metalness: .86, roughness: .3, emissive: 0x0b0716, emissiveIntensity: 1 });
  const dark = new T.MeshStandardMaterial({ color: 0x24232c, metalness: .8, roughness: .38, emissive: 0x06030c });
  const orb = new T.MeshStandardMaterial({ color: 0x120820, metalness: .55, roughness: .12, emissive: 0x3c1478, emissiveIntensity: .9 });
  const cav = new T.ShaderMaterial({ vertexShader: GALAXY_V, fragmentShader: GALAXY_F, uniforms: { time, clipY, glow, clipOn: { value: 0 } }, side: T.DoubleSide, toneMapped: false });
  const mats = [metal, dark, orb, cav]; if (o.clip) for (const m of [metal, dark, orb]) clipStd(m, clipY);
  const L = C.blade, y0 = C.guardY;
  // lâmina: contorno com farpas, VAZADA no meio (o furo é a cavidade estelar)
  const prof = u => (.074 * (1 - Math.pow(u, 1.25)) + .006) * (u < .06 ? .82 + 3 * u : 1);
  const outer = new T.Shape(), N = 40; outer.moveTo(-prof(0), y0);
  for (let i = 1; i <= N; i++) { const u = i / N, w = prof(u) + (i % 4 === 2 && u < .9 ? .02 * (1 - u) : 0); outer.lineTo(-w, y0 + u * L - (i % 4 === 2 ? .012 : 0)); }
  outer.lineTo(0, y0 + L + .05); for (let i = N; i >= 0; i--) { const u = i / N, w = prof(u) + (i % 4 === 0 && u < .9 && u > 0 ? .02 * (1 - u) : 0); outer.lineTo(w, y0 + u * L - (i % 4 === 0 ? .012 : 0)); }
  const hole = new T.Path(), HN = 30, hw = u => Math.max(0, prof(u) - .022); hole.moveTo(-hw(.08), y0 + .08 * L);
  for (let i = 1; i <= HN; i++) { const u = .08 + .8 * i / HN; hole.lineTo(-hw(u), y0 + u * L); } hole.lineTo(0, y0 + .91 * L); for (let i = HN; i >= 0; i--) { const u = .08 + .8 * i / HN; hole.lineTo(hw(u), y0 + u * L); }
  outer.holes.push(hole);
  const bladeG = shapeGeo(T, outer, .022, .004); const blade = new T.Mesh(bladeG, metal); root.add(blade);
  // cavidade: plano com o vazio estelar (uv: x através, y ao longo)
  const hs = new T.Shape(); hs.moveTo(-hw(.08), y0 + .08 * L); for (let i = 1; i <= HN; i++) { const u = .08 + .8 * i / HN; hs.lineTo(-hw(u), y0 + u * L); } hs.lineTo(0, y0 + .91 * L); for (let i = HN; i >= 0; i--) { const u = .08 + .8 * i / HN; hs.lineTo(hw(u), y0 + u * L); }
  const cg = new T.ShapeGeometry(hs, 6), cp = cg.attributes.position, uv = new Float32Array(cp.count * 2);
  for (let i = 0; i < cp.count; i++) { const y = cp.getY(i), u = (y - y0) / L, w = Math.max(1e-3, hw(Math.min(.88, Math.max(.08, u)))); uv[i * 2] = cp.getX(i) / w; uv[i * 2 + 1] = (u - .08) / .83; }
  cg.setAttribute('uv', new T.BufferAttribute(uv, 2)); const cavity = new T.Mesh(cg, cav); root.add(cavity);
  // espinha central fina (gravura) e farpas nas bordas
  const spikes = []; for (let i = 0; i < 9; i++) { const u = .12 + i * .085, w = prof(u); for (const s of [-1, 1]) { const c = new T.ConeGeometry(.008, .05 * (1 - u * .6), 4); c.rotateZ(s * (Math.PI / 2 + .55)); c.translate(s * (w + .012), y0 + u * L, 0); spikes.push(c); } }
  root.add(new T.Mesh(merge(T, spikes), metal));
  // guarda: duas asas em crescente com farpas, curvadas para a ponta, e o olho no centro
  const wings = [];
  for (const s of [-1, 1]) { const w = new T.Shape(), D = d => d * Math.PI / 180, O = th => [s * (.2 + .3 * Math.sin(D(th))), .07 - .3 * Math.cos(D(th))], I = th => [s * (.235 + .255 * Math.sin(D(th))), .045 - .255 * Math.cos(D(th))];
    /* crescente: sobe um pouco para o lado do cabo, abre para fora e curva para o lado da ponta, terminando em gancho afiado */
    const a0 = O(-95); w.moveTo(a0[0], a0[1]); for (let th = -95; th <= 160; th += 6) { const p = O(th); w.lineTo(p[0], p[1]); }
    for (let th = 150, k = 0; th >= -76; th -= 6, k++) { const p = I(th), b = k % 5 === 2 ? .014 : 0; w.lineTo(p[0] - s * b * Math.sin(D(th)), p[1] + b * Math.cos(D(th))); }
    wings.push(shapeGeo(T, w, .03, .005));
    for (let k = 0; k < 4; k++) { const th = -20 + k * 38, p = I(th), c = new T.ConeGeometry(.011, .08 - k * .01, 4); c.rotateZ(-s * (D(th) + Math.PI)); c.translate(p[0] - s * .03 * Math.sin(D(th)), p[1] + .03 * Math.cos(D(th)), 0); wings.push(c); }
    for (let k = 0; k < 3; k++) { const th = 10 + k * 45, p = O(th), c = new T.ConeGeometry(.01, .07, 4); c.rotateZ(-s * D(th)); c.translate(p[0] + s * .03 * Math.sin(D(th)), p[1] - .03 * Math.cos(D(th)), 0); wings.push(c); } }
  const crown = new T.ConeGeometry(.03, .16, 4); crown.translate(0, .14, 0); wings.push(crown);
  root.add(new T.Mesh(merge(T, wings), metal));
  const eye = new T.Mesh(new T.SphereGeometry(.045, 16, 10), orb); eye.scale.set(.75, 1.25, .55); eye.position.set(0, .08, 0); root.add(eye);
  // cabo com espirais e pomo em orbe com pontas
  const gripG = new T.CylinderGeometry(.022, .026, C.grip, 10); gripG.translate(0, -C.grip / 2 + .02, 0); const helix = [];
  for (const ph of [0, Math.PI]) { const pts = []; for (let i = 0; i <= 40; i++) { const u = i / 40, a = ph + u * 14; pts.push(new T.Vector3(Math.cos(a) * .027, .02 - u * C.grip, Math.sin(a) * .027)); } helix.push(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 60, .007, 5)); }
  root.add(new T.Mesh(merge(T, [gripG, ...helix]), dark));
  const py = -C.grip - .03, pommel = new T.Mesh(new T.SphereGeometry(.05, 16, 12), orb); pommel.position.y = py; root.add(pommel);
  const ps = []; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, c = new T.ConeGeometry(.011, .07, 4); c.rotateZ(-Math.PI / 2); c.rotateY(-a); c.translate(Math.cos(a) * .06, py, Math.sin(a) * .06); ps.push(c); }
  const top = new T.ConeGeometry(.014, .09, 4); top.rotateX(Math.PI); top.translate(0, py - .085, 0); ps.push(top); const cup = new T.CylinderGeometry(.04, .025, .04, 8); cup.translate(0, py + .045, 0); ps.push(cup);
  root.add(new T.Mesh(merge(T, ps), metal));
  /* chamas negras: bases nas bordas da lâmina, nas asas da guarda e no olho central */
  const fb = [], rs = i => { const v = Math.sin(i * 12.9898 + 7.7) * 43758.5453; return v - Math.floor(v); }; let fi = 0;
  for (let i = 0; i < 8; i++) { const u = .1 + i * .105, w = prof(u); for (const sd of [-1, 1]) { fb.push({ p: [sd * w * .95, y0 + u * L, 0], len: (.34 + .34 * rs(fi)) * (1 - u * .45), w: .04 + .025 * rs(fi + 50), seed: rs(fi + 9), ph: rs(fi + 31) }); fi++; } }
  for (const sd of [-1, 1]) for (const th of [5, 55, 105, 150]) { const a = th * Math.PI / 180, p = [sd * (.2 + .3 * Math.sin(a)), .07 - .3 * Math.cos(a), 0]; fb.push({ p, len: .36 + .26 * rs(fi), w: .05 + .025 * rs(fi + 50), seed: rs(fi + 9), ph: rs(fi + 31) }); fi++; }
  fb.push({ p: [0, .1, 0], len: .7, w: .08, seed: .37, ph: .8 }); fb.push({ p: [.05, .14, 0], len: .5, w: .05, seed: .71, ph: .3 });
  const flameScale = { value: 1 }, fm = new T.ShaderMaterial({ vertexShader: FLAME_V, fragmentShader: FLAME_F, uniforms: { time, clipY, flameScale }, side: T.DoubleSide, toneMapped: false }); mats.push(fm);
  const flames = new T.Mesh(flameGeo(T, fb), fm); flames.name = 'ChamasNegras'; flames.frustumCulled = false; flames.renderOrder = 2; root.add(flames);
  root.traverse(m => { if (m.isMesh) { m.castShadow = m !== flames; m.frustumCulled = false; } });
  root.userData = { time, clipY, glow, mats, flames, flameScale, len: C.blade + C.guardY + .05, tipY: C.blade + C.guardY + .05, gripY: 0,
    tick(t) { time.value = t; }, dispose() { root.traverse(m => { if (m.isMesh) m.geometry.dispose(); }); for (const m of mats) m.dispose(); } };
  return root;
}
