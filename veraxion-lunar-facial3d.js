/**
 * MOD 289 — detalhes autorais de rosto e patas para o Devorador Lunar.
 * Prende os volumes aos ossos do GLB original: não precisa de novos downloads binários.
 * Sem luzes adicionais, geometrias compartilhadas, nenhuma alocação por quadro.
 */
export const LUNAR_FACE_BUILD = '292-ink-horror-portrait';
export function enhanceLunarMonster(T, root, { low = false } = {}) {
  const head = root.getObjectByName('head'), jaw = root.getObjectByName('jaw');
  if (!head || !jaw) return { update(){}, dispose(){} };
  const parts = [], materials = [], geometries = [];
  const g = x => (geometries.push(x), x);
  const m = (color, emissive = 0x000000, intensity = 0) => {
    const mat = new T.MeshStandardMaterial({ color, emissive, emissiveIntensity: intensity, metalness: .14, roughness: .82, side: T.DoubleSide });
    materials.push(mat); return mat;
  };
  const dark = m(0x090414), bone = m(0x8866b2, 0x260d46, .1), ivory = m(0xf0e3f8, 0x8a64b2, .25);
  const lip = m(0x241031, 0x491062, .13), pit = m(0x010004);
  const eyeSocket = m(0x010004), iris = m(0x3c2058, 0x6f3da3, .45);
  const eyeCore = m(0x05020a), eyeRim = m(0x403057, 0x381953, .13);
  const ellipse = (parent, mat, pos, scale, detail = 16) => {
    const o = new T.Mesh(g(new T.SphereGeometry(1, detail, detail >> 1)), mat);
    o.position.set(...pos); o.scale.set(...scale); parent.add(o); parts.push(o); return o;
  };
  const curve = (parent, pts, radius, mat, seg = 25) => {
    const path = new T.CatmullRomCurve3(pts.map(p => new T.Vector3(...p)));
    const mesh = new T.Mesh(g(new T.TubeGeometry(path, seg, radius, 5, false)), mat);
    parent.add(mesh); parts.push(mesh); return mesh;
  };
  // Chifres de obsidiana com nervuras esculpidas: silhueta ampla em meia-lua e borda lilás.
  // A malha antiga dos chifres é ocultada no shader do GLB; estes novos chifres acompanham os ossos animados.
  const hornV = `varying vec3 vN,vW;varying vec2 vUv;
    void main(){vUv=uv;vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;
    vN=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*w;}`;
  const hornF = `varying vec3 vN,vW;varying vec2 vUv;
    void main(){vec3 N=normalize(vN),V=normalize(cameraPosition-vW);
    float rim=pow(1.-clamp(dot(N,V),0.,1.),3.7);
    float fine=sin(vUv.y*220.+sin(vUv.x*23.+vUv.y*35.)*.9)*.5+.5;
    float ribs=smoothstep(.94,.995,fine);
    float key=clamp(dot(N,normalize(vec3(.35,.84,.47)))*.5+.5,0.,1.);
    float hatch=smoothstep(.90,.99,sin(vUv.x*92.+vUv.y*170.)*.5+.5);
    vec3 c=vec3(.018,.006,.034)+vec3(.07,.025,.12)*key+
      vec3(.33,.15,.49)*(ribs*(.04+.18*key)+hatch*.045);
    c+=vec3(.96,.56,1.)*rim*(.44+.07*ribs);
    gl_FragColor=vec4(c,1.);}`;
  const hornMat = new T.ShaderMaterial({vertexShader:hornV,fragmentShader:hornF,side:T.DoubleSide,toneMapped:false});
  materials.push(hornMat);
  for(const side of [-1,1]){
    const bone=root.getObjectByName(side>0?'hornL':'hornR');
    if(!bone)continue;
    const base=[side*.45,3.25,3.05];
    const way=[
      [side*.42,3.30,3.0],[side*1.52,3.08,3.27],[side*2.94,3.42,3.17],
      [side*3.66,5.03,2.78],[side*3.52,6.7,2.46],[side*2.73,8.10,2.2],
      [side*1.41,9.04,2.06],[side*.35,9.37,1.98]
    ].map(p=>new T.Vector3(p[0]-base[0],p[1]-base[1],p[2]-base[2]));
    const route=new T.CatmullRomCurve3(way),v=[],uv=[],indices=[],n=112,r=16;
    const UP=new T.Vector3(0,0,1),N=new T.Vector3(),B=new T.Vector3();
    for(let j=0;j<=n;j++){
      const t=j/n,center=route.getPoint(t),tangent=route.getTangent(t).normalize();
      N.crossVectors(tangent,UP).normalize();
      if(N.lengthSq()<.1)N.set(1,0,0);
      B.crossVectors(tangent,N).normalize();
      const radius=(.56*Math.pow(1-t,.83)+.007)*(1+.012*Math.sin(t*320));
      for(let k=0;k<=r;k++){
        const a=k/r*Math.PI*2,ca=Math.cos(a),sa=Math.sin(a),
          swell=1+.025*Math.sin(a*7+t*87);
        const pos=center.clone().addScaledVector(N,Math.cos(a)*radius*swell)
          .addScaledVector(B,Math.sin(a)*radius*.95*swell);
        v.push(pos.x,pos.y,pos.z);uv.push(k/r,t);
        if(j<n&&k<r){const q=j*(r+1)+k;indices.push(q,q+r+1,q+1,q+1,q+r+1,q+r+2);}
      }
    }
    const geometry=g(new T.BufferGeometry());
    geometry.setAttribute('position',new T.Float32BufferAttribute(v,3));
    geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
    geometry.setIndex(indices);geometry.computeVertexNormals();
    const horn=new T.Mesh(geometry,hornMat);
    horn.frustumCulled=false;bone.add(horn);parts.push(horn);
  }
  // Olhos grandes, afundados e levemente puxados para trás, com íris e pupila legíveis mesmo em perfil.
  const eyes = [];
  for (const s of [-1, 1]) {
    const base = ellipse(head, eyeSocket, [s*.66, .25, 1.03], [.29,.19,.24], low ? 12 : 20);
    base.rotation.z = -s*.2;
    ellipse(head, eyeRim, [s*.68, .25, 1.295], [.21,.14,.035], low ? 10 : 16);
    const e = ellipse(head, iris, [s*.68, .25, 1.36], [.14,.085,.027], low ? 10 : 16);
    ellipse(head, eyeCore, [s*.68, .252, 1.398], [.038,.07,.018], 12);
    ellipse(head, ivory, [s*.719, .286, 1.425], [.018,.016,.012], 10);
    curve(head, [[s*.35,.19,.65],[s*.59,.25,.75],[s*.89,.17,.71],[s*1.0,.07,.57]], .082, dark, 14);
    curve(head, [[s*.42,-.12,.71],[s*.68,-.19,.77],[s*.91,-.1,.63]], .036, lip, 12);
    // Sobrancelha pesada e pálpebra angulada tornam o olhar oblíquo, não olhos redondos de desenho.
    curve(head,[[s*.42,.355,1.322],[s*.57,.355,1.397],[s*.74,.343,1.392],[s*.89,.29,1.29]],.072,dark,18);
    curve(head,[[s*.47,.16,1.32],[s*.64,.16,1.4],[s*.82,.19,1.31]],.032,lip,13);
    eyes.push(e);
  }
  // Grin ameaçador: fenda larga com cantos altos, gengivas curvas e dentes cônicos irregulares.
  ellipse(head, pit, [0,-1.21,1.72], [.79,.38,.24], low ? 18 : 28);
  const top = [], bottom = [];
  for (let i=0;i<=14;i++) {
    const x = (i/14*2-1)*.76, arc = Math.pow(Math.abs(x)/.76,1.65);
    top.push([x, -.99+.15*arc, 1.99-.085*arc]);
    bottom.push([x, -1.44+.12*arc, 1.96-.085*arc]);
  }
  curve(head, top, .058, lip, 32); curve(head, bottom, .045, bone, 32);
  const fangs = [];
  for (let i=0;i<19;i++) {
    const x = (i/18*2-1)*.685, edge=Math.pow(Math.abs(x),1.7);
    const len=(i%5===2?.37:.20)+(i%3)*.029;
    const tooth = new T.Mesh(g(new T.ConeGeometry(.030+(i%4)*.005,len,5,1)), ivory);
    tooth.position.set(x,-1.035+.12*edge-len*.40,2.035-.07*edge); tooth.rotation.z = -.13*x;
    head.add(tooth); parts.push(tooth); fangs.push(tooth);
  }
  for(let i=0;i<17;i++){
    const x=(i/16*2-1)*.64, edge=Math.pow(Math.abs(x),1.6);
    const len=(i%4===1?.30:.18)+(i%3)*.02;
    const tooth = new T.Mesh(g(new T.ConeGeometry(.028,len,5,1)), ivory);
    tooth.position.set(x,-1.45+.095*edge+len*.38,2.015-.06*edge);
    tooth.rotation.z=Math.PI+.1*x; jaw.add(tooth); parts.push(tooth);
  }
  // Dobras nas maçãs do rosto criam um sorriso ameaçador, assimétrico e legível em close.
  for(const side of [-1,1]){
    curve(head,[[side*.9,-.94,1.49],[side*1.18,-.72,1.28],[side*1.27,-.5,1.03]],.067,lip,18);
    curve(head,[[side*.64,.37,.68],[side*.89,.35,.68],[side*1.08,.19,.48]],.082,dark,15);
  }
  // Nariz pequeno e baixo para que a boca domine a expressão, com fendas escuras minúsculas.
  ellipse(head, dark, [0,-.82,1.93],[.115,.075,.065], 12);
  for(const s of [-1,1])ellipse(head,pit,[s*.065,-.83,1.995],[.025,.018,.013],10);
  // Cristas de tecido sobre as bochechas; quebram a aparência de cabeça lisa de GLB.
  for(const s of [-1,1]) {
    for(let i=0;i<3;i++)curve(head,[[s*(.48+i*.12),-.54,1.02],[s*(.84+i*.07),-.67,1.0],[s*(1.02+i*.03),-.84,.82]], .025+i*.009, i===0?bone:dark, 12);
  }
  // Dedos desiguais e garras compridas, com silhueta claramente não humana.
  for (const id of ['flF','frF','blF','brF']) {
    const foot = root.getObjectByName(id);
    if (!foot) continue;
    for(let j=0;j<3;j++) {
      const a=j-1, f=id.startsWith('f')?1:-1;
      curve(foot, [[a*.26,0,.07],[a*.36,-.15,.3*f],[a*.45,-.35,(.60+(j===1?.17:0))*f]], j===1?.09:.066, dark, 9);
      const claw=new T.Mesh(g(new T.ConeGeometry(.092,.39+j*.07,5,1)), ivory);
      claw.position.set(a*.45,-.42,(.66+(j===1?.17:0))*f); claw.rotation.x=f>0?Math.PI/2:-Math.PI/2;
      foot.add(claw); parts.push(claw);
    }
  }
  return {
    update(t, charge=0) {
      for(let i=0;i<eyes.length;i++)eyes[i].material.emissiveIntensity = .43 + charge*.36 + .08*Math.sin(t*2.4+i);
      eyeRim.emissiveIntensity=.13+charge*.12;
    },
    dispose(){
      for(const x of parts) x.parent?.remove(x);
      geometries.forEach(x=>x.dispose()); materials.forEach(x=>x.dispose());
    }
  };
}
