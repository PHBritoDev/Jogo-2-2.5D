/**
 * Eldória — gera EldoriaArvoresTropicais.glb (Mod 292): 5 espécies × LOD0/LOD1 (+ LOD2 impostor quando
 * houver o atlas assado), 3 materiais compartilhados (Casca, Folhas, Impostor) e 3 texturas próprias.
 *
 *   python3 paint-textures.py build                       # folhas.png + cascas.jpg
 *   node build-trees.mjs build ../../../EldoriaArvoresTropicais.glb          # LOD0/LOD1 (para assar)
 *   node bake-impostors.mjs <glb> build                   # build/impostor-raw.png, impostor-normal-raw.png, impostor.json
 *   python3 finish-impostors.py build                     # sangria + PNG-8 / JPEG (impostor.png, impostor-normal.jpg)
 *   node build-trees.mjs build ../../../EldoriaArvoresTropicais.glb          # de novo: agora com LOD2
 *
 * Dependências (fora do repositório): npm i @gltf-transform/core @gltf-transform/functions
 * Nós: <espécie>_LOD0 | _LOD1 | _LOD2, com extras { especie, lod, height, crownRadius, trunkRadius, collision }.
 */
import fs from 'fs'; import path from 'path';
import { Document, NodeIO, TextureInfo } from '@gltf-transform/core';
import { quantize } from '@gltf-transform/functions';
import { SPECIES, SPECIES_INFO, buildSpecies } from './tree-species.mjs';

const [dir = 'build', out = 'EldoriaArvoresTropicais.glb'] = process.argv.slice(2);
const doc = new Document(); const buffer = doc.createBuffer();
doc.getRoot().getAsset().generator = 'Eldoria tree generator (Mod 292)';
const tex = (name, file, mime) => doc.createTexture(name).setImage(fs.readFileSync(path.join(dir, file))).setMimeType(mime).setURI(name + (mime === 'image/png' ? '.png' : '.jpg'));
const barkTex = tex('cascas', 'cascas.jpg', 'image/jpeg'), leafTex = tex('folhas', 'folhas.png', 'image/png');
const casca = doc.createMaterial('Casca').setBaseColorTexture(barkTex).setRoughnessFactor(.95).setMetallicFactor(0);
casca.getBaseColorTextureInfo().setWrapS(TextureInfo.WrapMode.CLAMP_TO_EDGE).setWrapT(TextureInfo.WrapMode.REPEAT);
const folhas = doc.createMaterial('Folhas').setBaseColorTexture(leafTex).setAlphaMode('MASK').setAlphaCutoff(.5).setDoubleSided(true).setRoughnessFactor(1).setMetallicFactor(0);
folhas.getBaseColorTextureInfo().setWrapS(TextureInfo.WrapMode.CLAMP_TO_EDGE).setWrapT(TextureInfo.WrapMode.CLAMP_TO_EDGE);
const impPng = path.join(dir, 'impostor.png'), impJson = path.join(dir, 'impostor.json');
let impostor = null, impMat = null;
if (fs.existsSync(impPng) && fs.existsSync(impJson)) {
  impostor = JSON.parse(fs.readFileSync(impJson, 'utf8'));
  impMat = doc.createMaterial('Impostor').setBaseColorTexture(tex('impostor', 'impostor.png', 'image/png')).setAlphaMode('MASK').setAlphaCutoff(.5).setRoughnessFactor(1).setMetallicFactor(0);
  impMat.setNormalTexture(tex('impostor-normal', 'impostor-normal.jpg', 'image/jpeg'));
  impMat.getBaseColorTextureInfo().setWrapS(TextureInfo.WrapMode.CLAMP_TO_EDGE).setWrapT(TextureInfo.WrapMode.CLAMP_TO_EDGE);
}

function prim(mb, material) {
  const n = mb.count, col = mb.linearColors(), c8 = new Uint8Array(n * 4);
  for (let i = 0; i < n; i++) { c8[i * 4] = Math.round(Math.min(1, col[i * 3]) * 255); c8[i * 4 + 1] = Math.round(Math.min(1, col[i * 3 + 1]) * 255); c8[i * 4 + 2] = Math.round(Math.min(1, col[i * 3 + 2]) * 255); c8[i * 4 + 3] = 255; }
  const acc = (type, arr, norm = false) => doc.createAccessor().setType(type).setArray(arr).setBuffer(buffer).setNormalized(norm);
  if (n > 65535) throw new Error('primitiva grande demais para índice de 16 bits');
  return doc.createPrimitive().setMaterial(material)
    .setAttribute('POSITION', acc('VEC3', new Float32Array(mb.pos))).setAttribute('NORMAL', acc('VEC3', new Float32Array(mb.nrm)))
    .setAttribute('TEXCOORD_0', acc('VEC2', new Float32Array(mb.uv))).setAttribute('COLOR_0', acc('VEC4', c8, true))
    .setIndices(acc('SCALAR', new Uint16Array(mb.idx)));
}

/** LOD2: dois planos verticais cruzados (frente e lado, cada um com face e verso de normais próprias) + plano de topo. */
function impostorPrim(id, meta) {
  const cells = impostor.cells[id]; if (!cells) return null;
  const pos = [], nrm = [], uv = [], col = [], idx = [];
  const quad = (corners, n, cell, flipU) => {
    const [u0, v0, u1, v1] = cell, b = pos.length / 3, uvs = [[flipU ? u1 : u0, v1], [flipU ? u0 : u1, v1], [flipU ? u0 : u1, v0], [flipU ? u1 : u0, v0]];
    corners.forEach((p, i) => { pos.push(...p); nrm.push(...n); uv.push(...uvs[i]); col.push(255, 255, 255, 255); });
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  };
  // normais = normal do PLANO: o mapa de normais assado (referencial da câmera = espaço tangente) dá o volume
  const f = impostor.frames[id], S = f.size, y0 = f.cy - S / 2, y1 = f.cy + S / 2, h = S / 2;
  // frente (vista de +Z olhando para -Z): plano XY
  quad([[-h, y0, 0], [h, y0, 0], [h, y1, 0], [-h, y1, 0]], [0, 0, 1], cells.front, false);
  quad([[h, y0, 0], [-h, y0, 0], [-h, y1, 0], [h, y1, 0]], [0, 0, -1], cells.front, true);
  // lado (vista de +X): plano ZY
  quad([[0, y0, h], [0, y0, -h], [0, y1, -h], [0, y1, h]], [1, 0, 0], cells.side, false);
  quad([[0, y0, -h], [0, y0, h], [0, y1, h], [0, y1, -h]], [-1, 0, 0], cells.side, true);
  // topo, na altura média da copa
  const T = f.top / 2, ty = f.topY;
  quad([[-T, ty, T], [T, ty, T], [T, ty, -T], [-T, ty, -T]], [0, 1, 0], cells.top, false);
  const acc = (type, arr, norm = false) => doc.createAccessor().setType(type).setArray(arr).setBuffer(buffer).setNormalized(norm);
  return doc.createPrimitive().setMaterial(impMat).setAttribute('POSITION', acc('VEC3', new Float32Array(pos))).setAttribute('NORMAL', acc('VEC3', new Float32Array(nrm)))
    .setAttribute('TEXCOORD_0', acc('VEC2', new Float32Array(uv))).setAttribute('COLOR_0', acc('VEC4', new Uint8Array(col), true)).setIndices(acc('SCALAR', new Uint16Array(idx)));
}

const scene = doc.createScene('Arvores'); const report = {};
SPECIES.forEach((id, si) => {
  report[id] = {};
  for (const lod of [0, 1]) {
    const { bark, leaves, meta } = buildSpecies(id, lod);
    const mesh = doc.createMesh(id + '_LOD' + lod).addPrimitive(prim(bark, casca)).addPrimitive(prim(leaves, folhas));
    const node = doc.createNode(id + '_LOD' + lod).setMesh(mesh).setTranslation([si * 34, 0, lod * 34]);
    node.setExtras({ especie: id, nome: SPECIES_INFO[id].nome, lod, ...meta });
    scene.addChild(node); report[id]['LOD' + lod] = meta.triangles;
    if (lod === 0) report[id].meta = meta;
  }
  if (impostor) {
    const p = impostorPrim(id, report[id].meta); if (p) {
      const node = doc.createNode(id + '_LOD2').setMesh(doc.createMesh(id + '_LOD2').addPrimitive(p)).setTranslation([si * 34, 0, 68]);
      node.setExtras({ especie: id, lod: 2, ...report[id].meta }); scene.addChild(node); report[id].LOD2 = 10;
    }
  }
});
await doc.transform(quantize({ pattern: /^NORMAL$/, quantizeNormal: 8 }));
const io = new NodeIO(); await io.write(out, doc);
const size = fs.statSync(out).size;
console.log(JSON.stringify({ out, kb: Math.round(size / 1024), impostor: !!impostor, triangles: Object.fromEntries(Object.entries(report).map(([k, v]) => [k, { LOD0: v.LOD0, LOD1: v.LOD1, LOD2: v.LOD2 || 0 }])) }));
