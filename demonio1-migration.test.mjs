import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

/** MOD 290 — Enemy1 usa somente Demonio1.glb; os 16 clipes reais têm papel; nada carrega o modelo antigo. */
function glb(file) { const b = fs.readFileSync(new URL('./' + file, import.meta.url)); const l = b.readUInt32LE(12); return JSON.parse(b.subarray(20, 20 + l).toString('utf8')); }
const src = fs.readFileSync(new URL('./mundo-3d-prototype.js', import.meta.url), 'utf8');

test('Demonio1 — modelo único do Enemy1, sem Enemy1.glb/Enemy1-lod.glb no jogo nem no disco', () => {
  assert.ok(src.includes("const ENEMY1_MODEL_URL='./Demonio1.glb?v=mod290-demonio1';") && src.includes('new GLTFLoader().load(ENEMY1_MODEL_URL,'));
  for (const f of fs.readdirSync(new URL('./', import.meta.url)).filter(n => /\.(js|mjs|html)$/.test(n) && n !== 'demonio1-migration.test.mjs'))
    assert.ok(!/\.\/Enemy1(-lod)?\.glb/.test(fs.readFileSync(new URL('./' + f, import.meta.url), 'utf8')), f + ' não carrega o modelo antigo');
  assert.ok(!fs.existsSync(new URL('./Enemy1.glb', import.meta.url)) && !fs.existsSync(new URL('./Enemy1-lod.glb', import.meta.url)), 'GLBs antigos removidos');
});

test('Demonio1 — cada clipe real do GLB tem papel; papéis usados pelo combate atual existem; rig com mãos e cabeça', () => {
  const g = glb('Demonio1.glb'), names = g.animations.map(a => a.name);
  const table = JSON.parse(src.match(/const DEMONIO1_CLIP_TABLE=(\{[^}]*\});/)[1].replace(/'/g, '"'));
  assert.deepEqual(Object.keys(table).sort(), [...names].sort(), 'tabela cobre exatamente os clipes do arquivo');
  for (const role of ['idle', 'walk', 'run', 'attack', 'attack2', 'cast', 'block', 'dash', 'jump', 'hit', 'death', 'arise']) assert.ok(Object.values(table).includes(role), 'papel ' + role);
  const bones = new Set(g.nodes.map(n => n.name)); for (const b of ['Hips', 'Head', 'HeadEnd', 'RightHand', 'LeftHand']) assert.ok(bones.has(b), b);
  assert.equal(g.skins.length, 1);
  const rt = fs.readFileSync(new URL('./enemy1-squad-runtime3d.js', import.meta.url), 'utf8');
  assert.ok(rt.includes('/(HeadTop_End|HeadEnd)$/i') && src.includes('/(HeadTop_End|HeadEnd)$/i'), 'altura medida até o topo da cabeça do Demonio1');
  assert.ok(rt.includes('(E3K[a.kind] || b.hasDeath) && b.acts.death') && src.includes('nativeDeath:enemyHasDeathClip'), 'usa o clipe Dead real só no Demonio1');
});
