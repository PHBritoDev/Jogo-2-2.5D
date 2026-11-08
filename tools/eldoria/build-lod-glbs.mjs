/**
 * MOD 291 → 292 — LODs geométricos dos GLBs de Eldória (sem texturas: o jogo reaproveita o material do LOD0).
 * Uso (fora do repositório, com dependências temporárias):
 *   npm i @gltf-transform/core @gltf-transform/functions meshoptimizer
 *   node tools/eldoria/build-lod-glbs.mjs <pasta-do-repo> [--write]
 *
 * Mod 292 — CORREÇÃO da causa das cores erradas ao longe: a versão do Mod 291 soldava vértices só por posição antes de
 * simplificar. Como o atlas assado desses GLBs tem costura de UV em quase todo vértice, cada triângulo resultante
 * ligava ilhas diferentes do atlas (68–97 % dos triângulos com UV esticada > 6×): a casa virava mancha cáqui/cinza.
 * Agora a simplificação roda na malha ORIGINAL (o meshoptimizer preserva as costuras de atributo), e cada LOD passa
 * por duas travas antes de ser gravado:
 *   1) estiramento: < 2 % dos triângulos com |ΔUV|/|Δposição| acima de 6× a mediana do LOD0;
 *   2) economia: o LOD precisa tirar pelo menos 35 % dos triângulos — senão não vale o download nem a troca.
 * Medição atual (Mod 292): nenhum dos 9 modelos passa a trava 2 (economia de 6–31 %), então nenhum LOD1 é gravado e
 * o jogo usa o LOD0 (cor certa). Só com --write e as duas travas OK o arquivo <Nome>-lod1.glb é escrito.
 */
import { NodeIO } from '@gltf-transform/core';
import { prune, dedup, compactPrimitive } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import path from 'path';

const root = process.argv[2] || '.', write = process.argv.includes('--write');
export const LOD_PLAN = [
  ['CasaEldoria01.glb', .3], ['CasaEldoria02.glb', .3], ['ArvoreAncestralEldoria.glb', .3],
  ['RochedoMusgoEldoria.glb', .3], ['PocoEldoria.glb', .4], ['BarracaFrutasEldoria.glb', .4],
  ['FerreiroEldoria.glb', .4], ['Carroça.glb', .4], ['ArvoreFloresta01.glb', .5]
];
export function stretchedShare(idx, P, U, med) {
  let n = 0, bad = 0;
  for (let t = 0; t < idx.length; t += 3) {
    let su = 0, sp = 0;
    for (let e = 0; e < 3; e++) { const a = idx[t + e], b = idx[t + (e + 1) % 3]; su += Math.hypot(U[a * 2] - U[b * 2], U[a * 2 + 1] - U[b * 2 + 1]); sp += Math.hypot(P[a * 3] - P[b * 3], P[a * 3 + 1] - P[b * 3 + 1], P[a * 3 + 2] - P[b * 3 + 2]); }
    n++; if (sp > 1e-9 && su / sp > med * 6) bad++;
  }
  return n ? bad / n : 0;
}
export function medianRatio(idx, P, U) {
  const r = [];
  for (let t = 0; t < idx.length; t += 3) { let su = 0, sp = 0; for (let e = 0; e < 3; e++) { const a = idx[t + e], b = idx[t + (e + 1) % 3]; su += Math.hypot(U[a * 2] - U[b * 2], U[a * 2 + 1] - U[b * 2 + 1]); sp += Math.hypot(P[a * 3] - P[b * 3], P[a * 3 + 1] - P[b * 3 + 1], P[a * 3 + 2] - P[b * 3 + 2]); } if (sp > 1e-9) r.push(su / sp); }
  r.sort((a, b) => a - b); return r[r.length >> 1] || 1;
}

if (import.meta.url === 'file://' + path.resolve(process.argv[1])) {
  await MeshoptSimplifier.ready;
  const io = new NodeIO();
  for (const [file, ratio] of LOD_PLAN) {
    const doc = await io.read(path.join(root, file));
    let before = 0, after = 0, worst = 0;
    for (const mesh of doc.getRoot().listMeshes()) for (const prim of mesh.listPrimitives()) {
      const idx = prim.getIndices(), pos = prim.getAttribute('POSITION'), uv = prim.getAttribute('TEXCOORD_0'); if (!idx || !pos || !uv) continue;
      const I = new Uint32Array(idx.getArray()), P = new Float32Array(pos.getArray()), U = new Float32Array(uv.getArray()), med = medianRatio(I, P, U);
      const [dst] = MeshoptSimplifier.simplify(I, P, 3, Math.max(3, Math.floor(I.length * ratio / 3) * 3), .05, []); // sem solda: costuras preservadas
      before += I.length / 3; after += dst.length / 3; worst = Math.max(worst, stretchedShare(dst, P, U, med));
      if (dst.length >= 3) { idx.setArray(dst); compactPrimitive(prim); }
    }
    const saving = 1 - after / before, ok = worst < .02 && saving >= .35;
    console.log(file, before, '->', after, 'economia', (saving * 100).toFixed(1) + '%', 'UV esticada', (worst * 100).toFixed(1) + '%', ok ? (write ? 'GRAVADO' : 'ok (use --write)') : 'NÃO gravado');
    if (!ok || !write) continue;
    for (const t of doc.getRoot().listTextures()) t.dispose();
    for (const m of doc.getRoot().listMaterials()) { m.setBaseColorTexture(null); m.setNormalTexture(null); m.setMetallicRoughnessTexture(null); m.setOcclusionTexture(null); m.setEmissiveTexture(null); }
    await doc.transform(prune({ keepAttributes: true }), dedup()); // nunca remover TEXCOORD_0 (o jogo usa a textura do LOD0)
    await io.write(path.join(root, file.replace(/\.glb$/, '-lod1.glb')), doc);
  }
}
