/**
 * MOD 289 — detalhes autorais de rosto e patas para o Devorador Lunar.
 * Prende os volumes aos ossos do GLB original: não precisa de novos downloads binários.
 * Sem luzes adicionais, geometrias compartilhadas, nenhuma alocação por quadro.
 */
export const LUNAR_FACE_BUILD = '289-face-nightmare';
export function enhanceLunarMonster(T, root, { low = false } = {}) {
  const head = root.getObjectByName('head'), jaw = root.getObjectByName('jaw');
  if (!head || !jaw) return { update(){}, dispose(){} };
  const parts = [], materials = [], geometries = [];
  const g = x => (geometries.push(x), x);
  const m = (color, emissive = 0x000000, intensity = 0) => {
    const mat = new T.MeshStandardMaterial({ color, emissive, emissiveIntensity: intensity, metalness: .14, roughness: .82, side: T.DoubleSide });
    materials.push(mat); return mat;
  };
  const dark = m(0x090414), bone = m(0xae72eb, 0x371078, .14), ivory = m(0xdbc2eb, 0x4b155f, .1);
  const lip = m(0x35164e, 0x691caf, .25), pit = m(0x010004);
  const eyeSocket = m(0x010004), iris = m(0x8d36ee, 0x9f32ff, 2.1);
  const eyeCore = m(0x05020a), eyeRim = m(0xb579ff, 0x7324cf, .7);
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
    const base = ellipse(head, eyeSocket, [s*.67, .02, .58], [.36,.23,.27], low ? 12 : 20);
    base.rotation.z = -s*.2;
    ellipse(head, eyeRim, [s*.72, .035, .783], [.24,.156,.055], low ? 10 : 16);
    const e = ellipse(head, iris, [s*.72, .026, .824], [.162,.112,.039], low ? 10 : 16);
    ellipse(head, eyeCore, [s*.72, .028, .851], [.056,.105,.024], 12);
    ellipse(head, ivory, [s*.76, .078, .875], [.029,.025,.018], 10);
    curve(head, [[s*.35,.19,.65],[s*.59,.25,.75],[s*.89,.17,.71],[s*1.0,.07,.57]], .082, dark, 14);
    curve(head, [[s*.42,-.12,.71],[s*.68,-.19,.77],[s*.91,-.1,.63]], .036, lip, 12);
    eyes.push(e);
  }
  // Grin ameaçador: fenda larga com cantos altos, gengivas curvas e dentes cônicos irregulares.
  ellipse(head, pit, [0,-1.08,1.27], [1.03,.315,.19], low ? 18 : 28);
  const top = [], bottom = [];
  for (let i=0;i<=14;i++) {
    const x = (i/14*2-1)*1.07, arc = Math.pow(Math.abs(x)/1.07,1.8);
    top.push([x, -.92+.16*arc, 1.31-.11*arc]);
    bottom.push([x, -1.32+.1*arc, 1.33-.1*arc]);
  }
  curve(head, top, .058, lip, 32); curve(head, bottom, .045, bone, 32);
  const fangs = [];
  for (let i=0;i<15;i++) {
    const x = (i/14*2-1)*.94, edge=Math.pow(Math.abs(x),1.6);
    const len=(i%5===2?.32:.15)+(i%3)*.018;
    const tooth = new T.Mesh(g(new T.ConeGeometry(.064+(i%4)*.008,len,5,1)), ivory);
    tooth.position.set(x,-.94+.14*edge-len*.40,1.39-.11*edge); tooth.rotation.z = -.13*x;
    head.add(tooth); parts.push(tooth); fangs.push(tooth);
  }
  for(let i=0;i<13;i++){
    const x=(i/12*2-1)*.87, edge=Math.pow(Math.abs(x),1.6);
    const len=(i%4===1?.21:.13)+(i%3)*.016;
    const tooth = new T.Mesh(g(new T.ConeGeometry(.05,len,5,1)), ivory);
    tooth.position.set(x,-1.31+.11*edge+len*.35,1.39-.1*edge);
    tooth.rotation.z=Math.PI+.1*x; jaw.add(tooth); parts.push(tooth);
  }
  // Nariz pequeno e baixo para que a boca domine a expressão, com fendas escuras minúsculas.
  ellipse(head, dark, [0,-1.47,1.58],[.17,.10,.12], 12);
  for(const s of [-1,1])ellipse(head,pit,[s*.078,-1.47,1.679],[.04,.022,.014],10);
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
      for(let i=0;i<eyes.length;i++)eyes[i].material.emissiveIntensity = 1.8 + charge*.85 + .25*Math.sin(t*2.4+i);
      eyeRim.emissiveIntensity=.65+charge*.3;
    },
    dispose(){
      for(const x of parts) x.parent?.remove(x);
      geometries.forEach(x=>x.dispose()); materials.forEach(x=>x.dispose());
    }
  };
}
