import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=readFileSync(new URL('./Sandra-rig.glb',import.meta.url));
const jsonLength=file.readUInt32LE(12);
const doc=JSON.parse(file.subarray(20,20+jsonLength));
const bin=file.subarray(28+jsonLength);
const components={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};
function data(index){
 const a=doc.accessors[index],v=doc.bufferViews[a.bufferView],n=components[a.type];
 const sizes={5121:1,5123:2,5125:4,5126:4},size=sizes[a.componentType];
 const read={5121:'readUInt8',5123:'readUInt16LE',5125:'readUInt32LE',5126:'readFloatLE'}[a.componentType];
 assert.ok(read,`tipo de accessor suportado: ${a.componentType}`);
 return Array.from({length:a.count},(_,i)=>Array.from({length:n},(_,k)=>bin[read]((v.byteOffset||0)+(a.byteOffset||0)+i*(v.byteStride||size*n)+k*size)));
}
const primitives=doc.meshes.flatMap(m=>m.primitives);
test('Sandra: GLB completo, autocontido e limitado a 8 MB',()=>{
 assert.equal(file.readUInt32LE(0),0x46546c67);assert.equal(file.readUInt32LE(4),2);assert.equal(file.readUInt32LE(8),file.length);
 assert.ok(file.length<8*1024*1024);assert.ok(doc.buffers.every(b=>!b.uri));assert.ok(doc.images.every(i=>Number.isInteger(i.bufferView)));
});
test('Sandra: todas as malhas têm posições finitas e pesos normalizados',()=>{
 for(const p of primitives){const positions=data(p.attributes.POSITION),weights=data(p.attributes.WEIGHTS_0),joints=data(p.attributes.JOINTS_0);
 assert.equal(positions.length,weights.length);
 for(let i=0;i<positions.length;i++){assert.ok(positions[i].every(n=>Number.isFinite(n)&&Math.abs(n)<3));assert.ok(Math.abs(weights[i].reduce((a,b)=>a+b,0)-1)<.0001);assert.ok(joints[i].every(j=>j<doc.skins[0].joints.length));}
 }
});
test('Sandra: clipes usados pela campanha permanecem disponíveis',()=>{
 const names=doc.animations.map(a=>a.name);assert.equal(new Set(names).size,names.length);
 for(const n of ['Walking','Running','Attack','Dead','Skill_03','Triple_Combo_Attack','_01a15ab5_eeba_71ae_a438_b85a938940fc','_01a15ab0_deed_76a9_818c_47f5fc81ba40'])assert.ok(names.includes(n),n);
 for(const a of doc.animations)assert.ok(a.channels.length>0);
});
test('Sandra: esquiva preserva altura do quadril e movimento dos membros',()=>{
 const a=doc.animations.find(a=>a.name==='_01a15ab0_deed_76a9_818c_47f5fc81ba40');
 const ch=a.channels.find(c=>c.target.path==='translation'&&doc.nodes[c.target.node].name==='Hips');
 const points=data(a.samplers[ch.sampler].output);assert.ok(points.length>2);
 assert.ok(Math.max(...points.map(p=>p[1]))-Math.min(...points.map(p=>p[1]))<.00001);
 assert.ok(a.channels.some(c=>c.target.path==='rotation'&&new Set(data(a.samplers[c.sampler].output).map(p=>p.join(','))).size>2));
});
test('Sandra: íris e brilho usam UVs preenchidas, mesmo com UVs distintas na roupa',()=>{
 const p=primitives.find(p=>doc.materials[p.material].name==='Olho'),m=doc.materials[p.material];
 for(const texture of [m.pbrMetallicRoughness.baseColorTexture,m.emissiveTexture]){assert.ok(texture);const uv=data(p.attributes[`TEXCOORD_${texture.texCoord||0}`]);assert.ok(Math.max(...uv.map(p=>p[0]))-Math.min(...uv.map(p=>p[0]))>.8);}
});
test('Sandra: cortes próximos dos ombros não criam saltos nos pesos',()=>{
 const p=primitives.find(p=>doc.materials[p.material].name==='Pele');const pos=data(p.attributes.POSITION),w=data(p.attributes.WEIGHTS_0),j=data(p.attributes.JOINTS_0),indices=data(p.indices).flat();let checked=0;
 for(let i=0;i<indices.length;i+=3)for(let k=0;k<3;k++){const a=indices[i+k],b=indices[i+(k+1)%3];const d=Math.hypot(...pos[a].map((n,k)=>n-pos[b][k]));if(d<.0001||d>.002||pos[a][1]<1.23||pos[a][1]>1.43||Math.abs(pos[a][0])<.1||Math.abs(pos[a][0])>.23)continue;
 const delta=new Map();for(let q=0;q<4;q++){delta.set(j[a][q],(delta.get(j[a][q])||0)+w[a][q]);delta.set(j[b][q],(delta.get(j[b][q])||0)-w[b][q]);}
 assert.ok([...delta.values()].reduce((s,v)=>s+Math.abs(v),0)<.3,`pesos descontínuos ${a}/${b}`);checked++;
 }assert.ok(checked>10);
});
