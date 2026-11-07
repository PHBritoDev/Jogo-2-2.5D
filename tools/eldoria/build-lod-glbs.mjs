/**
 * MOD 291 — LODs geométricos dos GLBs de Eldória (sem texturas: o jogo reaproveita o material do LOD0).
 * Uso (fora do repositório, com dependências temporárias):
 *   npm i @gltf-transform/core @gltf-transform/functions meshoptimizer
 *   node tools/eldoria/build-lod-glbs.mjs <pasta-do-repo>
 * Gera <Nome>-lod1.glb ao lado do original. A malha mantém UVs (meshoptimizer só colapsa vértices existentes),
 * então a textura do modelo completo continua alinhada.
 */
import { NodeIO } from '@gltf-transform/core';
import { weld, prune, dedup, compactPrimitive } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import path from 'path';

const root = process.argv[2] || '.';
export const LOD_PLAN = [
  ['CasaEldoria01.glb', .16], ['CasaEldoria02.glb', .16], ['ArvoreAncestralEldoria.glb', .22],
  ['RochedoMusgoEldoria.glb', .18], ['PocoEldoria.glb', .3], ['BarracaFrutasEldoria.glb', .28],
  ['FerreiroEldoria.glb', .28], ['Carroça.glb', .25], ['ArvoreFloresta01.glb', .4]
];
await MeshoptSimplifier.ready;
const io = new NodeIO();
for (const [file, ratio] of LOD_PLAN) {
  const src = path.join(root, file), out = path.join(root, file.replace(/\.glb$/, '-lod1.glb'));
  const doc = await io.read(src);
  const before = count(doc);
  // As malhas "output_unwrapped" têm costuras de UV em quase todo vértice e o simplificador trava nelas.
  // Solda só por posição numa malha auxiliar, simplifica e volta para um vértice original de cada grupo
  // (a UV vem desse representante: borra só os triângulos de costura, invisível na distância do LOD1).
  for (const mesh of doc.getRoot().listMeshes()) for (const prim of mesh.listPrimitives()) {
    const idx = prim.getIndices(), pos = prim.getAttribute('POSITION'); if (!idx || !pos) continue;
    const src = idx.getArray(), P = pos.getArray(), n = pos.getCount(), wid = new Uint32Array(n), rep = [], wpos = [], key = new Map();
    for (let i = 0; i < n; i++) { const k = Math.round(P[i * 3] * 1e4) + ',' + Math.round(P[i * 3 + 1] * 1e4) + ',' + Math.round(P[i * 3 + 2] * 1e4); let w = key.get(k); if (w === undefined) { w = rep.length; key.set(k, w); rep.push(i); wpos.push(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); } wid[i] = w; }
    const wi = new Uint32Array(src.length); for (let i = 0; i < src.length; i++) wi[i] = wid[src[i]];
    const target = Math.max(3, Math.floor(src.length * ratio / 3) * 3);
    const [dst] = MeshoptSimplifier.simplify(wi, new Float32Array(wpos), 3, target, .03, []);
    const out = new Uint32Array(dst.length); for (let i = 0; i < dst.length; i++) out[i] = rep[dst[i]];
    if (out.length >= 3) { idx.setArray(out); compactPrimitive(prim); }
  }
  for (const t of doc.getRoot().listTextures()) t.dispose();
  for (const m of doc.getRoot().listMaterials()) { m.setBaseColorTexture(null); m.setNormalTexture(null); m.setMetallicRoughnessTexture(null); m.setOcclusionTexture(null); m.setEmissiveTexture(null); }
  // Retirar as texturas do arquivo LOD evita duplicar imagens no download, mas NÃO
  // podemos retirar TEXCOORD_0: o runtime reutiliza material/textura do LOD0.
  // prune() sem keepAttributes remove UVs tidas como não utilizadas após remover mapas.
  await doc.transform(prune({ keepAttributes: true }), dedup());
  for (const mesh of doc.getRoot().listMeshes()) for (const prim of mesh.listPrimitives()) {
    if (prim.getAttribute('POSITION') && !prim.getAttribute('TEXCOORD_0')) {
      throw new Error('LOD sem TEXCOORD_0: ' + file + ' — não publicar sem UVs');
    }
  }
  await io.write(out, doc);
  console.log(file, before, '->', count(doc));
}
function count(doc) { let t = 0; for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) { const i = p.getIndices(); t += i ? i.getCount() / 3 : p.getAttribute('POSITION').getCount() / 3; } return t; }
