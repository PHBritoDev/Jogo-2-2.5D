/** Audita atributos UV dos LODs de Eldória diretamente no cabeçalho glTF de cada GLB. */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.argv[2] || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const names = [
  'CasaEldoria01', 'CasaEldoria02', 'ArvoreAncestralEldoria',
  'RochedoMusgoEldoria', 'PocoEldoria', 'BarracaFrutasEldoria',
  'FerreiroEldoria', 'Carroça', 'ArvoreFloresta01'
];
let failures = 0;
for (const name of names) {
  const filename = path.join(root, name + '-lod1.glb');
  try {
    const b = readFileSync(filename);
    if (b.toString('ascii', 0, 4) !== 'glTF' || b.readUInt32LE(16) !== 0x4e4f534a) throw new Error('GLB inválido');
    const len = b.readUInt32LE(12), gltf = JSON.parse(b.toString('utf8', 20, 20 + len));
    const prims = (gltf.meshes || []).flatMap(m => m.primitives || []);
    const missing = prims.filter(p => p.attributes?.POSITION !== undefined && p.attributes?.TEXCOORD_0 === undefined).length;
    if (!prims.length || missing) { failures++; console.error('FALHA', name, 'primitivas sem TEXCOORD_0:', missing, 'de', prims.length); }
    else console.log('OK', name, prims.length, 'primitiva(s) com UVs');
  } catch (error) { failures++; console.error('FALHA', name, error.message); }
}
if (failures) { console.error('LODs precisam ser regenerados antes de incorporar:', failures, 'arquivo(s)'); process.exitCode = 1; }
