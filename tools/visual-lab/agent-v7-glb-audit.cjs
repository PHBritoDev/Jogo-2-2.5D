"use strict";
/**
 * Asset Auditor V7: reads GLB metadata WITHOUT Blender / GPU / paid APIs.
 * Never modifies meshes or claims that animation/skin works in-game.
 */
const fs=require("node:fs"),path=require("node:path");
const CATEGORIES=Object.freeze({
 idle:/idle|breath|respir|rest|parado/i,
 walk:/walk|andar|caminh/i,
 run:/run|correr|sprint/i,
 attack:/attack|ataque|slash|swing|strike|combo/i,
 hurt:/hurt|damage|hit|dano/i,
 fall:/fall|knockdown|queda/i,
 getup:/getup|rise|levantar|erguer/i,
 jump:/jump|pulo|saltar/i,
 dash:/dash|dodge|esquiva/i,
 death:/death|dying|dead|morte|morto/i
});
const FACIAL=/face|facial|jaw|mouth|boca|lip|tongue|eye|olho|blink|express|viseme|phoneme|fala|talk|speech/i;
function parseGlb(bytes){
 if(!Buffer.isBuffer(bytes))throw new TypeError("Expected GLB Buffer");
 if(bytes.length<20)throw Error("GLB truncated");
 if(bytes.toString("ascii",0,4)!=="glTF")throw Error("GLB magic invalid");
 const version=bytes.readUInt32LE(4),size=bytes.readUInt32LE(8);
 if(version!==2)throw Error("Only GLB v2 supported");
 if(size!==bytes.length)throw Error("GLB declared size differs from actual bytes");
 let at=12,json=null,binBytes=0;
 while(at+8<=bytes.length){
  const length=bytes.readUInt32LE(at),type=bytes.readUInt32LE(at+4);at+=8;
  if(length%4!==0||at+length>bytes.length)throw Error("Invalid GLB chunk size");
  if(type===0x4e4f534a){
   if(json!==null)throw Error("Duplicate JSON chunk");
   try{json=JSON.parse(bytes.subarray(at,at+length).toString("utf8").trim());}
   catch{throw Error("Invalid JSON chunk");}
  }else if(type===0x004e4942)binBytes+=length;
  at+=length;
 }
 if(at!==bytes.length||!json)throw Error("Invalid GLB chunks");
 if(json.asset?.version!=="2.0")throw Error("Missing glTF 2.0 asset metadata");
 return {json,binBytes,size};
}
function inspectModel(glb,{file="model.glb",maxBytes=16*1024*1024,maxTriangles=50000}={}){
 const {json:g,binBytes,size}=parseGlb(glb);
 const nodes=g.nodes||[],meshes=g.meshes||[],anims=g.animations||[],skins=g.skins||[];
 const names=anims.map((x,i)=>x.name||"unnamed#"+i);
 const matched=Object.fromEntries(Object.entries(CATEGORIES).map(([kind,re])=>[kind,names.filter(n=>re.test(n))]));
 const morphMeshes=meshes.filter(m=>(m.primitives||[]).some(p=>Array.isArray(p.targets)&&p.targets.length));
 const morphNames=meshes.flatMap(m=>Object.keys(m.extras?.targetNames||{}).map(k=>m.extras.targetNames[k])).filter(x=>typeof x==="string");
 const facialNodes=nodes.filter(n=>FACIAL.test(n.name||"")).map(n=>n.name);
 const facialMorphs=morphNames.filter(n=>FACIAL.test(n));
 let exactTriangles=0,unknownTopology=0;
 for(const m of meshes)for(const p of m.primitives||[]){
  const topology=p.mode??4;
  if(topology!==4){unknownTopology++;continue;}
  const idx=p.indices!=null?g.accessors?.[p.indices]:null;
  const pos=p.attributes?.POSITION!=null?g.accessors?.[p.attributes.POSITION]:null;
  if(idx?.count!=null)exactTriangles+=Math.floor(idx.count/3);
  else if(pos?.count!=null)exactTriangles+=Math.floor(pos.count/3);
  else unknownTopology++;
 }
 const issues=[];
 if(!skins.length)issues.push({code:"NO_SKIN",severity:"review",detail:"Sem skin: pode ser estatico ou animado por transforms"});
 if(!anims.length)issues.push({code:"NO_ANIMATIONS",severity:"review",detail:"Nenhum clipe exportado"});
 if(!matched.idle.length)issues.push({code:"IDLE_NOT_NAMED",severity:"review",detail:"Nenhuma animação idle reconhecida pelo nome"});
 if(!facialNodes.length&&!facialMorphs.length)issues.push({code:"FACE_NOT_DETECTED",severity:"info",detail:"Não detectamos nós ou morphs faciais por nomes; inspeção visual necessária"});
 if(size>maxBytes)issues.push({code:"HEAVY_GLB",severity:"review",detail:"GLB excede orçamento inicial de tamanho"});
 if(exactTriangles>maxTriangles)issues.push({code:"TRIANGLE_BUDGET",severity:"review",detail:"Triângulos acima do orçamento inicial para mobile"});
 if(unknownTopology)issues.push({code:"TOPOLOGY_UNKNOWN",severity:"info",detail:"Contagem parcial: geometria não triangular ou sem accessors"});
 if((g.textures||[]).length>12)issues.push({code:"MANY_TEXTURES",severity:"review",detail:"Mais de 12 texturas podem pesar no celular"});
 return {file,bytes:size,binBytes,meshes:meshes.length,nodes:nodes.length,skins:skins.length,animations:names,
  animationCoverage:Object.fromEntries(Object.entries(matched).map(([k,v])=>[k,!!v.length])),
  facial:{namedNodes:facialNodes,namedMorphs:facialMorphs,morphMeshes:morphMeshes.length},
  textures:(g.textures||[]).length,images:(g.images||[]).length,
  triangles:exactTriangles,trianglesPartial:!!unknownTopology,issues,
  note:"Análise estática por metadados: NÃO confirma deformação, sincronia labial, tamanho real na cena nem qualidade visual."};
}
function inspectFile(root,rel,options={}){
 const full=path.resolve(root,rel);
 if(!full.startsWith(path.resolve(root)+path.sep))throw Error("Path outside project");
 if(!/\.glb$/i.test(rel))throw Error("Not a GLB file");
 return inspectModel(fs.readFileSync(full),{...options,file:rel});
}
module.exports={parseGlb,inspectModel,inspectFile,CATEGORIES};
