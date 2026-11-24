// Combate de referência (25b05adf duelo com câmera às costas; 7cd9ab51 esgrima rápida com dashes e rastros longos).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PROTA_SPEED, protaMoveDef } from '../prota-combat3d.js';
import { SwordRites } from '../sword-rites3d.js';
import { createSlashVFX } from '../slash-vfx3d.js';

let THREE = null;
for (const dir of [process.env.COMBAT_THREE_DIR, process.env.AERIAL_THREE_DIR, new URL('../node_modules/three', import.meta.url).pathname]) {
  if (!dir) continue; try { THREE = await import(dir.replace(/\/$/, '') + '/build/three.module.js'); break; } catch { /* tenta o próximo */ }
}
const m = fs.readFileSync(new URL('../mundo-3d-prototype.js', import.meta.url), 'utf8');
const vz = fs.readFileSync(new URL('../vhazrael3d.js', import.meta.url), 'utf8');

test('golpes mais rápidos: o relógio do golpe corre na velocidade do repertório e as janelas continuam proporcionais', () => {
  assert.ok(PROTA_SPEED.ground >= 1.3 && PROTA_SPEED.dash >= 1.3 && PROTA_SPEED.plunge > 1);
  const def = protaMoveDef('ground', 0); assert.equal(def.speed, PROTA_SPEED.ground);
  assert.ok(protaMoveDef('ground', 4).speed < def.speed, 'finalizador um pouco mais pesado que os cortes leves');
  const blade = { base: { x: 0, y: 1, z: .4 }, tip: { x: 0, y: 1, z: 1.4 } };
  const run = (speed) => {
    const r = new SwordRites({ choreography: true, moveset: (s, mo, st) => ({ ...protaMoveDef(mo, st), speed }), drive: () => {}, pose: () => blade, hit: () => {}, blocked: () => false });
    r.attack('prota', { damage: 10, yaw: 0, target: { id: 't', x: 0, y: 0, z: 2, alive: true, radius: .5 }, mode: 'ground' });
    let t = 0; while (r.active && t < 3) { r.update(1 / 60, { valid: true, grounded: true, from: { x: 0, y: 0, z: 0 }, sword: 'prota' }); t += 1 / 60; }
    return t;
  };
  const slow = run(1), fast = run(PROTA_SPEED.ground);
  assert.ok(Math.abs(fast - slow / PROTA_SPEED.ground) < .05, `duração ${fast.toFixed(2)} s contra ${slow.toFixed(2)} s`);
  assert.ok(/attackCooldown=performance\.now\(\)\+e\.duration\*1000\/\(e\.def\?\.speed\|\|1\)/.test(m));
});

test('VFX: crescente branca de borda carmesim, esteira do dash, respingo de tinta e linhas de velocidade (pools fixos)', { skip: !THREE && !process.env.CI && 'three.js indisponível (defina COMBAT_THREE_DIR)' }, () => {
  assert.ok(THREE, 'CI precisa de three.js (COMBAT_THREE_DIR)');
  const scene = new THREE.Scene(), v = createSlashVFX(THREE, scene);
  assert.equal(typeof v.splash, 'function');
  v.sample('d1', { x: 0, y: .3, z: 0 }, { x: 0, y: 1.3, z: 0 }, { style: 'dash' }); v.sample('d1', { x: 0, y: .3, z: 1 }, { x: 0, y: 1.3, z: 1 }, { style: 'dash' });
  for (let i = 0; i < 9; i++) v.splash({ x: 0, y: 1, z: 0 }, { power: 1 });
  const cam = new THREE.PerspectiveCamera(); v.update(1 / 60, cam, 'high');
  const st = v.stats(); assert.ok(st.splashes >= 1 && st.splashes <= 4 && st.slashes >= 1);
  for (let i = 0; i < 60; i++) v.update(1 / 30, cam, 'high');
  assert.equal(v.stats().splashes, 0, 'o respingo some sozinho');
  v.clear(); const c = v.stats(); assert.equal(c.slashes + c.waves + c.sparks + c.stars + c.splashes, 0);
  const src = fs.readFileSync(new URL('../slash-vfx3d.js', import.meta.url), 'utf8');
  assert.ok(/prota: \{ core: 0xffffff, body: 0xfff1f4, rim: 0xff2346/.test(src) && /dash: \{ core: 0xffe8ec, body: 0xff1b3d/.test(src));
  assert.ok(/slashVFX\.sample\(prota302\.dashKey,_dashA,_dashB,\{style:'dash'/.test(m), 'risco carmesim pelo trajeto do dash');
  assert.ok(/function speedLines\(/.test(m) && /speedLines\(\.55,\.28\)/.test(m) && /slashVFX\.splash\(p,\{power:big/.test(m));
});

test('esgrima: choque de lâminas, chefe acusa golpes fortes e aparar mostra faíscas', () => {
  assert.ok(/function tryBladeClash\(a,blade\)/.test(m) && /showCombatCallout\('CHOQUE DE LÂMINAS'\)/.test(m));
  assert.ok(/sq\.stagger\(f,\.42,false\)/.test(m) && /prota302\.counterUntil=prota302\.clock\+PROTA_DASH\.counter\.window;prota302\.clashes/.test(m), 'chefe cambaleia; herói ganha a janela do contra-ataque');
  assert.ok(/function bossFlinch\(dur\)/.test(m) && /act\.unstoppable\|\|act\.armor\|\|\(act\.type==='melee'&&act\.phase==='active'\)/.test(m), 'nunca fura a superarmadura nem corta a janela ativa');
  assert.ok(/case 'blocked':worldAudio\.block\(\);if\(a&&a\.T\?\.boss&&newHero\)/.test(m));
});

test('Bispo 1 no modo de espada: esquiva com dash, defende menos e mais curto, responde com riposta e golpeia mais rápido', () => {
  assert.ok(/block: \{ chance: VHAZRAEL_SWORD_ONLY_TEST \? \.24 : \.32, dur: VHAZRAEL_SWORD_ONLY_TEST \? \.48 : \.7/.test(vz));
  assert.ok(/dodge: \{ chance: VHAZRAEL_SWORD_ONLY_TEST \? \.3 : \.42/.test(vz));
  assert.ok(/const VZ_RATE_MUL = VHAZRAEL_SWORD_ONLY_TEST \? 1\.12 : 1;/.test(vz) && /m\.rate = \(VZ_RATE\[m\.id\] \|\| 1\) \* VZ_RATE_MUL;/.test(vz));
  assert.ok(!/if \(!VHAZRAEL_SWORD_ONLY_TEST && !a\.act && a\.alert <= 0/.test(vz), 'dash de aproximação também no modo de espada');
});

test('câmera estilo Genshin: duelo enquadrado automático (sem travar), zona morta e arrastar manda', () => {
  assert.ok(/function autoDuelCamera\(dt,now,engaged\)/.test(m));
  assert.ok(/const idleMs=portrait\?portrait\.idleMs:1200/.test(m) && /now-lastLookInputAt<idleMs/.test(m) && /dead=portrait\?portrait\.deadZone:\.35/.test(m), 'duelo genérico mantém 1,2 s/20°; o perfil retrato pode ajustar os dois valores');
  assert.ok(/engaged&&newHero&&cameraDistance>=1\.05\?duelPull:0/.test(m), 'em duelo aproxima às costas do herói (nunca além do zoom do jogador)');
  assert.ok(/Math\.min\(0,Math\.max\(3\.6,Math\.min\(7,4\.6\+/.test(m));
  assert.ok(/autoRecenterCamera\(dt,performance\.now\(\)\+i\*1000\/fps\);updatePlayerCamera\(dt\)/.test(m), 'o mesmo caminho no combatStep');
});
