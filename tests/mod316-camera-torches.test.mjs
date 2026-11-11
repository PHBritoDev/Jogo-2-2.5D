import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const source=readFileSync(new URL('../mundo-3d-prototype.js',import.meta.url),'utf8');
const cave=readFileSync(new URL('../ascension-cave3d.js',import.meta.url),'utf8');
const dressing=readFileSync(new URL('../eldoria-city-dressing.js',import.meta.url),'utf8');

test('Mod 316: nunca renderizar fogo/chamas procedurais no lugar do GLB de tocha',()=>{
 assert.ok(!existsSync(new URL('../eldoria-torch-fire3d.js',import.meta.url)),'shader generico de tochas nao pode reaparecer');
 assert.doesNotMatch(source,/createVillageTorchFire\s*\(/);
 assert.doesNotMatch(cave,/createVillageTorchFire\s*\(/);
 assert.match(source,/TochaMedievalTripo\.glb/);
 assert.match(cave,/TochaMedievalTripo\.glb/);
 assert.doesNotMatch(source,/const pole=new THREE\.Mesh\(new THREE\.CylinderGeometry\(\.06,\.08,2\.6,5\)/);
 assert.doesNotMatch(dressing,/const fenceParts = \[\]/);
 assert.doesNotMatch(dressing,/new THREE\.InstancedMesh\(new THREE\.BoxGeometry\(\.24, \.32, \.24\)/);
 assert.match(dressing,/TochaMedievalTripo-Cidade-/);
 assert.match(source,/torchAsset:authoredTorchAsset/);
});
test('Mod 316: caverna nao pode herdar altura do terreno exterior',()=>{
 assert.match(source,/function keepCameraAboveTerrain\(\)\{[\s\S]{0,340}if\(ascKey==='cave'\)return;/);
 assert.match(source,/const camDistUse=ascKey==='cave'[^;]*Math\.min\(naturalDistance,4\.25\)/);
 assert.match(source,/firstPerson\?1\.42:1\.15/);
 assert.match(source,/camera\.fov=fp\?62:56/);
});
