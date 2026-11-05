// Gera EspadaVeraxion.glb a partir da geometria autoral (veraxion-sword-model3d.js). Uso: node tools/build-veraxion-sword-glb.mjs
import fs from 'node:fs';
import { buildSwordData, swordGLB } from '../veraxion-sword-model3d.js';
const d = buildSwordData(), glb = swordGLB(d);
fs.writeFileSync(new URL('../EspadaVeraxion.glb', import.meta.url), glb);
console.log('EspadaVeraxion.glb', glb.length, 'bytes', d.positions.length / 3, 'vértices', d.indices.length / 3, 'triângulos');
