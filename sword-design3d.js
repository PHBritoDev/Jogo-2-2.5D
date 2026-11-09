import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
/** Mod 232. Original paired weapon designs in EspadaProta's measured grip frame.
 * Grip y=.75, guard y=.40, tip y=-.951; no changes to damage or inventory. */
export function buildRiteSword(T,id){
 // Mod 302: a Espada do Chamado (slot `prota`) passa a ser a espada BRANCA; o desenho antigo fica como referência de medida.
 if(id==='prota')return buildWhiteSword(T);
 const aurora=id==='aurora',root=new T.Group(),g=new T.Group();root.name=aurora?'Aurora_Rubra_232':id==='prota-legacy'?'Chamado_Referencia_232':'Chamado_Celestial_232';
 g.position.y=.75;g.rotation.z=Math.PI;root.add(g);
 const metal=new T.MeshStandardMaterial({color:aurora?0x45404c:0xcbd5de,metalness:.48,roughness:.28,emissive:aurora?0x241526:0x303536,emissiveIntensity:.45});
 const trim=new T.MeshStandardMaterial({color:aurora?0x652037:0xc3994e,metalness:.55,roughness:.27,emissive:aurora?0x30101b:0x30220a,emissiveIntensity:.4});
 const edge=new T.MeshStandardMaterial({color:aurora?0xa7354c:0xf5eee0,metalness:.7,roughness:.21,emissive:aurora?0xa40024:0x8f5d12,emissiveIntensity:.35});
 const core=new T.MeshStandardMaterial({color:aurora?0xf12b4a:0xffdb81,emissive:aurora?0xef123b:0xffbc37,emissiveIntensity:.65,metalness:.35,roughness:.3});
 const violet=new T.MeshStandardMaterial({color:aurora?0x7b48ba:0xeac983,emissive:aurora?0x6f17d3:0x975f14,emissiveIntensity:.65,roughness:.3,metalness:.55});
 const leather=new T.MeshStandardMaterial({color:aurora?0x19101f:0x40352c,roughness:.82,metalness:.08});
 const add=(geo,mat,x=0,y=0,z=0)=>{const m=new T.Mesh(geo,mat);m.position.set(x,y,z);g.add(m);return m;};
 function plate(points,depth,material,z=0){const shape=new T.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();const geo=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:.006,bevelThickness:.005,bevelSegments:2,curveSegments:8});geo.translate(0,0,-depth/2);return add(geo,material,0,0,z);}
 // Raised diamond cross-section, flared ricasso, recessed channels, distinct tip.
 const outline=aurora?[[-.072,.35],[-.103,.51],[-.066,1.36],[0,1.701],[.066,1.36],[.103,.51],[.072,.35]]:[[-.058,.35],[-.080,.46],[-.062,1.42],[0,1.701],[.062,1.42],[.080,.46],[.058,.35]];
 plate(outline,.040,metal);
 for(const side of [-1,1]){
  plate([[side*.068,.48],[side*.059,1.36],[0,1.691],[side*.045,1.36],[side*.053,.48]],.016,edge);
  for(const face of [-1,1]){
   plate([[side*.018,.48],[side*.030,.62],[side*.011,1.36],[0,1.57],[side*.004,1.27]],.007,core,face*.028);
   // Four engraved chevrons, no text or borrowed symbols.
   for(let i=0;i<4;i++)plate([[side*.025,.63+i*.14],[side*.044,.66+i*.14],[side*.023,.68+i*.14]],.004,violet,face*.030);
  }
  const guard=aurora?[[0,.31],[side*.13,.33],[side*.24,.45],[side*.31,.42],[side*.23,.30],[side*.10,.25],[0,.27]]:[[0,.29],[side*.13,.31],[side*.28,.42],[side*.30,.38],[side*.19,.26],[0,.24]];
  plate(guard,.065,trim);plate([[side*.11,.31],[side*.23,.38],[side*.19,.31]],.072,edge);
 }
 add(new T.CylinderGeometry(.031,.036,.27,12),leather,0,.12);
 for(let i=0;i<7;i++){const ring=add(new T.TorusGeometry(.034,.004,4,12),trim,0,.018+i*.032);ring.rotation.x=Math.PI/2;}
 const pom=add(new T.OctahedronGeometry(.058,1),trim,0,-.055);pom.scale.set(.85,1.35,.65);
 for(const z of [-.05,.05]){const jewel=add(new T.OctahedronGeometry(.042,1),violet,0,.29,z);jewel.scale.set(.8,1.3,.45);}
 // Batch each material once (six draws), including the engraved pieces.
 for(const material of [metal,trim,edge,core,violet,leather]){
  const meshes=g.children.filter(m=>m.material===material),geometries=meshes.map(m=>{m.updateMatrix();const geo=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();return geo.applyMatrix4(m.matrix);});
  const merged=mergeGeometries(geometries,false);for(const m of meshes){g.remove(m);m.geometry.dispose();}geometries.forEach(x=>x.dispose());if(merged)g.add(new T.Mesh(merged,material));
 }
 root.userData.blade={base:[0,.40,0],tip:[0,-.951,0]};
 root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.frustumCulled=false;}});
 return root;
}

/**
 * Mod 302 — Espada Branca do Chamado: modelo 3D original (geometria procedural, sem textura chapada) no MESMO quadro
 * de empunhadura da EspadaProta (cabo y=.75, guarda y=.40, ponta y=-.951 no espaço da raiz), para não mudar hitbox,
 * escala nem primeira pessoa. Lâmina longa e estreita de marfim entalhado com bordas prateadas, olhos vermelhos
 * embutidos ao longo do eixo, coroa dourada baixa na base da lâmina, guarda em anel aberto com quatro asas brancas
 * abertas, ornamentos dourados e cabo/pomo dourados longos. Peças agrupadas por material (8 draws).
 */
export function buildWhiteSword(T){
 const root=new T.Group(),g=new T.Group();root.name='Espada_Branca_302';g.position.y=.75;g.rotation.z=Math.PI;root.add(g);
 const M=(o)=>new T.MeshStandardMaterial(o);
 const ivory=M({color:0xf2ede3,roughness:.36,metalness:.1,emissive:0x2e2b26,emissiveIntensity:.55});
 const silver=M({color:0xe9eef4,roughness:.2,metalness:.82,emissive:0x1c2128,emissiveIntensity:.4});
 const gold=M({color:0xf2c35a,roughness:.3,metalness:.62,emissive:0x5a3808,emissiveIntensity:.45});
 const goldDark=M({color:0xa86a22,roughness:.4,metalness:.6,emissive:0x2a1504,emissiveIntensity:.4});
 const feather=M({color:0xf8f8f4,roughness:.55,metalness:.05,emissive:0x34383d,emissiveIntensity:.45,side:T.DoubleSide});
 const sclera=M({color:0xfff6ee,roughness:.3,metalness:0,emissive:0x40302a,emissiveIntensity:.35});
 const iris=M({color:0xc2000e,roughness:.25,metalness:.1,emissive:0xd0000f,emissiveIntensity:.9});
 const pupil=M({color:0x150406,roughness:.2,metalness:.2});
 const add=(geo,mat,x=0,y=0,z=0)=>{const m=new T.Mesh(geo,mat);m.position.set(x,y,z);g.add(m);return m;};
 const shapeOf=pts=>{const s=new T.Shape();pts.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();return s;};
 function plate(pts,depth,mat,z=0,bevel=.004){const geo=new T.ExtrudeGeometry(shapeOf(pts),{depth,bevelEnabled:bevel>0,bevelSize:bevel,bevelThickness:bevel,bevelSegments:2,curveSegments:6});geo.translate(0,0,-depth/2);return add(geo,mat,0,0,z);}
 // ---- lâmina: perfil em segmentos "vértebra" (estreita e longa), ponta em agulha
 const B0=.47,SEG=[.47,.63,.79,.95,1.11],TIP=1.701;
 const width=y=>{if(y>=SEG[4]){const u=(y-SEG[4])/(TIP-SEG[4]);return .046*(1-u)*(1-.25*u)+.0015;}
  let i=0;while(i<3&&y>SEG[i+1])i++;const u=(y-SEG[i])/(SEG[i+1]-SEG[i]),base=.074-.0065*i;return base*(.80+.27*Math.sin(Math.PI*u)**.8);};
 const half=[];for(let k=0;k<=60;k++){const y=B0+(TIP-B0)*(k/60)**1.0;half.push([width(y),y]);}
 const outline=[...half.map(([w,y])=>[w,y]),...half.slice(0,-1).reverse().map(([w,y])=>[-w,y])];
 plate(outline.map(([x,y])=>[x*1.0,y]),.016,silver,0,.003);                                  // gume prateado (mais largo, fino)
 plate(outline.map(([x,y])=>[x*.84,Math.min(y,TIP-.02)]),.044,ivory,0,.011);                    // corpo de marfim (mais grosso)
 for(const face of [-1,1]){
  // espinha central entalhada e "vértebras" entre os segmentos
  plate([[-.010,B0+.02],[.010,B0+.02],[.006,TIP-.10],[0,TIP-.05],[-.006,TIP-.10]],.008,ivory,face*.030,.003);
  for(let i=1;i<5;i++){const y=SEG[i],w=width(y)*.78;plate([[-w,y-.012],[0,y-.028],[w,y-.012],[w*.9,y+.006],[0,y-.006],[-w*.9,y+.006]],.008,ivory,face*.031,.003);}
  // entalhes laterais em chevron (marfim em relevo)
  for(let i=0;i<4;i++)for(const s of [-1,1]){const y=(SEG[i]+SEG[i+1])/2,w=width(y)*.7;plate([[s*w*.55,y+.045],[s*w,y+.07],[s*w*.95,y+.085],[s*w*.45,y+.058]],.006,ivory,face*.031,.002);}
 }
 // ---- olhos vermelhos embutidos ao longo do eixo (dos dois lados)
 const eye=(y,r,face)=>{const z=face*.036,c=face*.041;
  plate([[-r*1.9,y],[-r*.9,y+r*.95],[0,y+r*1.15],[r*.9,y+r*.95],[r*1.9,y],[r*.9,y-r*.95],[0,y-r*1.15],[-r*.9,y-r*.95]],.006,ivory,z,.003);
  const sc=add(new T.SphereGeometry(r*1.2,16,8),sclera,0,y,c);sc.scale.set(1.3,.76,.3);
  const ir=add(new T.SphereGeometry(r*.6,16,8),iris,0,y,c+face*r*.2);ir.scale.set(1,1,.35);
  const pu=add(new T.SphereGeometry(r*.24,10,6),pupil,0,y,c+face*r*.36);pu.scale.set(.7,1.1,.35);};
 for(const face of [-1,1]){[[.555,.030],[.715,.028],[.875,.025],[1.03,.021]].forEach(([y,r])=>eye(y,r,face));eye(.425,.036,face);}
 // ---- coroa dourada baixa na base da lâmina
 const crown=add(new T.CylinderGeometry(.086,.078,.05,20,1,true),gold,0,B0+.005);crown.scale.z=.62;
 const band=add(new T.TorusGeometry(.082,.008,6,24),gold,0,B0-.018);band.rotation.x=Math.PI/2;band.scale.y=.62;
 for(let i=0;i<10;i++){const a=i/10*Math.PI*2,x=Math.sin(a)*.084,z=Math.cos(a)*.084*.62,tall=i%2?.034:.052;
  add(new T.ConeGeometry(.011,tall,5),gold,x,B0+.03+tall/2,z);if(i%2===0)add(new T.SphereGeometry(.007,6,4),iris,x,B0+.004,z*1.05);}
 // ---- medalhão de marfim sob a coroa (abriga o olho maior)
 plate([[-.10,.40],[-.075,.455],[-.04,.475],[.04,.475],[.075,.455],[.10,.40],[.06,.37],[-.06,.37]],.05,ivory,0,.01);
 // ---- guarda: anel aberto em volta do cabo + travessa dourada com volutas
 const ring=add(new T.TorusGeometry(.105,.017,8,36),ivory,0,.272);ring.scale.z=1.4;
 const ringGold=add(new T.TorusGeometry(.105,.006,6,36),gold,0,.272,.016);const ringGold2=add(new T.TorusGeometry(.105,.006,6,36),gold,0,.272,-.016);
 plate([[-.17,.355],[-.12,.375],[-.035,.372],[0,.395],[.035,.372],[.12,.375],[.17,.355],[.12,.352],[.04,.352],[0,.338],[-.04,.352],[-.12,.352]],.03,gold,0,.006);
 for(const s of [-1,1]){const curl=add(new T.TorusGeometry(.024,.0075,6,14,Math.PI*1.5),gold,s*.172,.33,0);curl.rotation.z=s>0?Math.PI*.75:-Math.PI*.25;
  const drop=add(new T.TorusGeometry(.018,.006,6,12,Math.PI*1.4),gold,s*.07,.33,.02);drop.rotation.z=s>0?-Math.PI*.2:Math.PI*1.2;}
 // ---- quatro asas brancas abertas (duas por lado), penas em leque no plano da lâmina
 function wing(side,cx,cy,feathers,len,from,to,scale){
  for(let i=0;i<feathers;i++){const u=i/(feathers-1),a=from+(to-from)*u,L=len*(1-.3*Math.abs(u-.3))*scale,w=.03*scale*(1-.25*u),z=(i%2?.007:-.007);
   // pena: haste curva com ponta arredondada levemente voltada para fora
   const pts=[[0,-w*.35],[L*.3,-w*.95],[L*.7,-w*.9],[L*.93,-w*.45],[L,w*.15],[L*.9,w*.7],[L*.55,w],[L*.2,w*.75],[0,w*.35]];
   const m=plate(pts,.008,feather,0,.0028);m.position.set(cx,cy,z);m.rotation.z=a;m.scale.x=side;if(side<0)m.rotation.z=-a;
   for(let k=1;k<4;k++){const t=.25+k*.18,b=plate([[L*t,-w*.85],[L*t+.03*scale,-w*1.25],[L*t+.035*scale,-w*.6]],.004,feather,0,.0012);b.position.set(cx,cy,z*1.6);b.rotation.z=m.rotation.z;b.scale.x=side;}
  }}
 for(const s of [-1,1]){wing(s,s*.112,.30,9,.25,1.0,.1,1);wing(s,s*.104,.22,7,.19,-.08,-.9,.95);}
 // ---- cabo dourado longo ornamentado e pomo em flor de lis
 add(new T.CylinderGeometry(.027,.029,.36,12),gold,0,.16);
 for(let i=0;i<6;i++){const r=add(new T.TorusGeometry(.03,.0055,5,14),goldDark,0,.03+i*.048);r.rotation.x=Math.PI/2;}
 for(const z of [-1,1])plate([[-.012,.02],[0,.29],[.012,.02],[0,-.02]],.006,goldDark,z*.027,.002);
 const knot=add(new T.SphereGeometry(.04,12,8),gold,0,-.045);knot.scale.set(1,1.3,.9);
 add(new T.CylinderGeometry(.018,.026,.13,10),gold,0,-.14);
 const bead=add(new T.SphereGeometry(.032,12,8),gold,0,-.215);bead.scale.set(1,.85,.9);
 add(new T.SphereGeometry(.012,8,6),iris,0,-.215,.03);add(new T.SphereGeometry(.012,8,6),iris,0,-.215,-.03);
 plate([[0,-.24],[.035,-.27],[.05,-.31],[.02,-.30],[0,-.36],[-.02,-.30],[-.05,-.31],[-.035,-.27]],.024,gold,0,.006);
 for(const s of [-1,1]){const c=add(new T.TorusGeometry(.02,.006,6,12,Math.PI*1.3),gold,s*.045,-.285,0);c.rotation.z=s>0?-Math.PI*.6:Math.PI*.3;}
 // agrupa por material (um draw por material)
 for(const material of [ivory,silver,gold,goldDark,feather,sclera,iris,pupil]){
  const meshes=g.children.filter(m=>m.material===material),geometries=meshes.map(m=>{m.updateMatrix();const geo=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();for(const k of Object.keys(geo.attributes))if(!['position','normal','uv'].includes(k))geo.deleteAttribute(k);return geo.applyMatrix4(m.matrix);});
  const merged=mergeGeometries(geometries,false);for(const m of meshes){g.remove(m);m.geometry.dispose();}geometries.forEach(x=>x.dispose());if(merged){const mesh=new T.Mesh(merged,material);mesh.name='Branca_'+(material===ivory?'marfim':material===silver?'gume':material===gold?'ouro':material===goldDark?'ouro_escuro':material===feather?'asas':material===sclera?'esclera':material===iris?'iris':'pupila');g.add(mesh);}
 }
 // base real da lâmina (acima da coroa) e ponta, no quadro da raiz; usados pela hitbox física.
 root.userData.blade={base:[0,.75-B0,0],tip:[0,-.951,0]};root.userData.white=true;
 root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.frustumCulled=false;}});
 return root;
}
