#!/usr/bin/env node
/**
 * Inventário AUTOMÁTICO de clipes (missão combate cinematográfico): lê o JSON + buffers dos GLB reais usados no
 * runtime, mede duração, ossos do esqueleto e deslocamento do quadril (root motion XZ/Y) e procura o nome de cada
 * clipe no código do jogo (*.js da raiz e experiments/aerial-combat). Saída: Markdown (stdout).
 * Uso: node tools/combat/clip-inventory.mjs [GLB ...]
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const MODELS = process.argv.slice(2).length ? process.argv.slice(2) : [
  ['Protagonista (Prota_otimizado_2K.glb)', 'Prota_otimizado_2K.glb'], ['VHAZRAEL (VHAZRAEL.glb)', 'VHAZRAEL.glb'],
  ['VORGAZHEK (Bispo2.glb)', 'Bispo2.glb'], ['ZARKHAEL (Bispo3.glb)', 'Bispo3.glb'], ['VERAXION (Bispo4.glb)', 'Bispo4.glb']];

function readGlb(file) {
  const b = fs.readFileSync(file), jl = b.readUInt32LE(12), j = JSON.parse(b.subarray(20, 20 + jl).toString('utf8'));
  const bin = b.subarray(20 + jl + 8);
  const acc = (i) => { const a = j.accessors[i], bv = j.bufferViews[a.bufferView], n = { SCALAR: 1, VEC3: 3, VEC4: 4 }[a.type], o = (bv.byteOffset || 0) + (a.byteOffset || 0), st = bv.byteStride || 4 * n, out = [];
    for (let k = 0; k < a.count; k++) { const v = []; for (let c = 0; c < n; c++) v.push(bin.readFloatLE(o + k * st + c * 4)); out.push(v); } return out; };
  return { j, acc };
}
const code = (() => {
  const files = fs.readdirSync(root).filter(f => f.endsWith('.js')).map(f => path.join(root, f))
    .concat(fs.readdirSync(path.join(root, 'experiments/aerial-combat')).filter(f => f.endsWith('.js')).map(f => path.join(root, 'experiments/aerial-combat', f)));
  return files.map(f => fs.readFileSync(f, 'utf8')).join('\n');
})();

let md = '';
for (const [label, file] of MODELS.map(m => Array.isArray(m) ? m : [m, m])) {
  const { j, acc } = readGlb(path.join(root, file));
  const nodes = j.nodes || [], hips = nodes.findIndex(n => /hips/i.test(n.name || '')), bones = (j.skins?.[0]?.joints || []).length;
  const rows = [];
  for (const a of j.animations || []) {
    let dur = 0, tr = null;
    for (const c of a.channels) { const s = a.samplers[c.sampler], inp = j.accessors[s.input]; dur = Math.max(dur, inp.max?.[0] || 0); if (c.target.node === hips && c.target.path === 'translation') tr = acc(s.output); }
    const xz = tr ? Math.hypot(tr.at(-1)[0] - tr[0][0], tr.at(-1)[2] - tr[0][2]) : 0, dy = tr ? Math.max(...tr.map(v => v[1])) - Math.min(...tr.map(v => v[1])) : 0;
    const name = a.name || '', used = code.includes(`'${name}'`) || code.includes(`"${name}"`);
    rows.push({ name, dur, xz, dy, used });
  }
  const pct = rows.length ? Math.round(100 * rows.filter(r => r.used).length / rows.length) : 0;
  md += `\n### ${label} — ${rows.length} clipes, ${bones} ossos, ${pct} % referenciados no código\n\n| Clipe | Duração | Quadril XZ (root motion) | Quadril Y (variação) | No código |\n|---|---:|---:|---:|---|\n`;
  for (const r of rows) md += `| \`${r.name}\` | ${r.dur.toFixed(2)} s | ${r.xz.toFixed(2)} | ${r.dy.toFixed(2)} | ${r.used ? 'sim' : '**não**'} |\n`;
}
process.stdout.write(md);
