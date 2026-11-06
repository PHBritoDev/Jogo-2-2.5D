/**
 * MOD 289 — detalhes autorais de rosto e patas para o Devorador Lunar.
 * Prende os volumes aos ossos do GLB original: não precisa de novos downloads binários.
 * Sem luzes adicionais, geometrias compartilhadas, nenhuma alocação por quadro.
 */
export const LUNAR_FACE_BUILD = '290-expression-reconstruction';
export function enhanceLunarMonster(T, root, { low = false } = {}) {
  const head = root.getObjectByName('head'), jaw = root.getObjectByName('jaw');
  if (!head || !jaw) return { update(){}, dispose(){} };
  const parts = [], materials = [], geometries = [];
  const g = x => (geometries.push(x), x);
  const m = (color, emissive = 0x000000, intensity = 0) => {
    const mat = new T.MeshStandardMaterial({ color, emissive, emissiveIntensity: intensity, metalness: .14, roughness: .82, side: T.DoubleSide });
    materials.push(mat); return mat;
  };
  const dark = m(0x090414), bone = m(0x8866b2, 0x260d46, .1), ivory = m(0xe7dce8, 0x421b56, .07);
  const lip = m(0x241031, 0x491062, .13), pit = m(0x010004);
  const eyeSocket = m(0x010004), iris = m(0x7345af, 0x9d68ef, .95);
  const eyeCore = m(0x05020a), eyeRim = m(0x765698, 0x4e237b, .3);
  const ellipse = (parent, mat, pos, scale, detail = 16) => {
    const o = new T.Mesh(g(new T.SphereGeometry(1, detail, detail >> 1)), mat);
    o.position.set(...pos); o.scale.set(...scale); parent.add(o); parts.push(o); return o;
  };
  const curve = (parent, pts, radius, mat, seg = 25) => {
    const path = new T.CatmullRomCurve3(pts.map(p => new T.Vector3(...p)));
    const mesh = new T.Mesh(g(new T.TubeGeometry(path, seg, radius, 5, false)), mat);
    parent.add(mesh); parts.push(mesh); return mesh;
  };
  // Olhos grandes, afundados e levemente puxados para trás, com íris e pupila legíveis mesmo em perfil.
  const eyes = [];
  for (const s of [-1, 1]) {
    const base = ellipse(head, eyeSocket, [s*.67, .04, .62], [.42,.28,.31], low ? 12 : 20);
    base.rotation.z = -s*.2;
    ellipse(head, eyeRim, [s*.72, .035, .84], [.26,.17,.063], low ? 10 : 16);
    const e = ellipse(head, iris, [s*.72, .035, .875], [.185,.136,.043], low ? 10 : 16);
    ellipse(head, eyeCore, [s*.72, .04, .912], [.065,.116,.026], 12);
    ellipse(head, ivory, [s*.764, .09, .943], [.036,.033,.018], 10);
    curve(head, [[s*.35,.19,.65],[s*.59,.25,.75],[s*.89,.17,.71],[s*1.0,.07,.57]], .082, dark, 14);
    curve(head, [[s*.42,-.12,.71],[s*.68,-.19,.77],[s*.91,-.1,.63]], .036, lip, 12);
    eyes.push(e);
  }
  // Grin ameaçador: fenda larga com cantos altos, gengivas curvas e dentes cônicos irregulares.
  ellipse(head, pit, [0,-1.07,1.62], [1.26,.42,.29], low ? 18 : 28);
  const top = [], bottom = [];
  for (let i=0;i<=14;i++) {
    const x = (i/14*2-1)*1.19, arc = Math.pow(Math.abs(x)/1.19,1.65);
    top.push([x, -.86+.22*arc, 1.79-.14*arc]);
    bottom.push([x, -1.39+.19*arc, 1.78-.14*arc]);
  }
  curve(head, top, .058, lip, 32); curve(head, bottom, .045, bone, 32);
  const fangs = [];
  for (let i=0;i<13;i++) {
    const x = (i/12*2-1)*1.02, edge=Math.pow(Math.abs(x),1.7);
    const len=(i%4===2?.47:.23)+(i%3)*.038;
    const tooth = new T.Mesh(g(new T.ConeGeometry(.07+(i%4)*.007,len,5,1)), ivory);
    tooth.position.set(x,-.90+.19*edge-len*.41,1.84-.12*edge); tooth.rotation.z = -.13*x;
    head.add(tooth); parts.push(tooth); fangs.push(tooth);
  }
  for(let i=0;i<11;i++){
    const x=(i/10*2-1)*.94, edge=Math.pow(Math.abs(x),1.6);
    const len=(i%4===1?.31:.18)+(i%3)*.03;
    const tooth = new T.Mesh(g(new T.ConeGeometry(.065,len,5,1)), ivory);
    tooth.position.set(x,-1.27+.14*edge+len*.38,1.66-.09*edge);
    tooth.rotation.z=Math.PI+.1*x; jaw.add(tooth); parts.push(tooth);
  }
  // Dobras nas maçãs do rosto criam um sorriso ameaçador, assimétrico e legível em close.
  for(const side of [-1,1]){
    curve(head,[[side*.9,-.94,1.49],[side*1.18,-.72,1.28],[side*1.27,-.5,1.03]],.067,lip,18);
    curve(head,[[side*.64,.37,.68],[side*.89,.35,.68],[side*1.08,.19,.48]],.082,dark,15);
  }
  // Nariz pequeno e baixo para que a boca domine a expressão, com fendas escuras minúsculas.
  ellipse(head, dark, [0,-1.51,1.84],[.16,.095,.09], 12);
  for(const s of [-1,1])ellipse(head,pit,[s*.078,-1.51,1.932],[.04,.022,.014],10);
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
      for(let i=0;i<eyes.length;i++)eyes[i].material.emissiveIntensity = 1.1 + charge*.7 + .17*Math.sin(t*2.4+i);
      eyeRim.emissiveIntensity=.22+charge*.2;
    },
    dispose(){
      for(const x of parts) x.parent?.remove(x);
      geometries.forEach(x=>x.dispose()); materials.forEach(x=>x.dispose());
    }
  };
}
