// Gera DevoradorLunar.glb (modelo, esqueleto e clipes autorais). Uso: node tools/build-veraxion-lunar-monster-glb.mjs
import fs from 'node:fs';
import { buildMonsterData, monsterGLB } from '../veraxion-lunar-monster-model3d.js';
const d = buildMonsterData(), glb = monsterGLB(d);
fs.writeFileSync(new URL('../DevoradorLunar.glb', import.meta.url), glb);
console.log('DevoradorLunar.glb', glb.length, 'bytes', d.P.length / 3, 'vértices', d.I.length / 3, 'triângulos');
