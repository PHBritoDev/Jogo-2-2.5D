/**
 * Missão combate/câmera/movimento/áudio (briefing 17/11/2026) — regras travadas por teste.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PROTA_LOCO, protaMoveDef, BASIC_TRAIL } from '../prota-combat3d.js';
import { MOBILITY } from '../combat-mobility3d.js';
import { BOSS_MOVES } from '../boss-choreography3d.js';
import '../vhazrael3d.js';
import { bossGap } from '../enemy1-squad3d.js';

const m = fs.readFileSync(new URL('../mundo-3d-prototype.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../mundo-3d-prototype.html', import.meta.url), 'utf8');

test('P1: canvas acompanha resize/zoom/rotação (sem faixa de fundo); estilo controlado pelo CSS', () => {
  assert.ok(/renderer\.setSize\(innerWidth,innerHeight,false\);/.test(m), 'o setSize inicial não grava px no estilo');
  assert.ok(/function resize\(\)\{[^}]*renderer\.setSize\(w,h,false\)/.test(m), 'todo resize ajusta o buffer');
  assert.ok(/addEventListener\('orientationchange'/.test(m) && /visualViewport\.addEventListener\('resize',resize\)/.test(m));
  assert.ok(/#scene\{position:fixed;inset:0;width:100%;height:100%/.test(html));
});
test('P1: mouse no PC — pointer lock, yaw 360° contínuo, pitch só sem inverter, mesma sensibilidade 1ª/3ª pessoa', () => {
  assert.ok(/requestPointerLock/.test(m) && /document\.addEventListener\('mousemove',e=>\{if\(!mouseLocked\)return;/.test(m));
  assert.ok(/function lookDelta\(dx,dy\)\{const s=\.004\*userSettings\.sensitivity;[^}]*cameraYaw-=dx\*s;cameraPitch=THREE\.MathUtils\.clamp\(cameraPitch\+dy\*s,-1\.32,1\.32\);\}/.test(m));
  assert.ok(!/cameraYaw=THREE\.MathUtils\.clamp/.test(m), 'yaw nunca é limitado');
  assert.ok(/if\(cineActive\|\|dialogueOpen\|\|namePromptOpen\|\|gamePaused\|\|menuGate\)\{try\{document\.exitPointerLock\(\);/.test(m), 'cena/diálogo/pausa soltam o ponteiro');
});
test('P2: sem botão MIRAR; trava suave automática com histerese; golpe sempre orientado ao alvo válido', () => {
  assert.ok(!/id="aim"/.test(html) && !/MIRAR<\/span>/.test(html));
  assert.ok(/if\(!t&&prota302\.lockId!=null\)\{const cur=cands\.find\(c=>c\.id===prota302\.lockId\);/.test(m) && /d<10&&\(!intent\.input\|\|off<1\.35\)/.test(m));
  assert.ok(/assist:true,range:lockOnActive\?18:9/.test(m));
  assert.ok(/function cycleSoftTarget\(\)/.test(m) && /cycleSoftTarget\(\);\}/.test(m));
});
test('P3: VHAZRAEL — cadência por golpe (leve/médio/pesado), telegraph legível, cadeia de 3–4 e pausa tática', () => {
  const pool = BOSS_MOVES.vhazrael; assert.ok(pool.length >= 6);
  for (const mv of pool) {
    const real = mv.duration / mv.rate, first = mv.hits[0] / mv.rate;
    assert.ok(mv.rate >= 1 && mv.rate <= 1.7, mv.id);
    assert.ok(first >= .32, `${mv.id}: 1º impacto em ${first.toFixed(2)} s (precisa dar para ler)`);
    if (mv.fast) assert.ok(real <= .8, mv.id); else if (mv.heavy) assert.ok(real >= 1 && real <= 1.6, mv.id); else assert.ok(real <= 1.75, mv.id);
    for (let i = 1; i < mv.hits.length; i++) assert.ok((mv.hits[i] - mv.hits[i - 1]) / mv.rate >= .2, `${mv.id}: golpes distintos (sem dano duplo no mesmo arco)`);
  }
  const a = { id: 'vz' }; const gaps = Array.from({ length: 12 }, () => bossGap(a));
  assert.ok(gaps.filter(g => g < .2).length >= 8 && gaps.some(g => g > .6), 'quase colados, com respiração');
  const src = fs.readFileSync(new URL('../enemy1-squad3d.js', import.meta.url), 'utf8');
  assert.ok(/act\.t \+= dt \* \(act\.move\?\.rate \|\| 1\)/.test(src), 'janelas/traço/avanço/clipe no mesmo relógio');
  const rt = fs.readFileSync(new URL('../enemy1-squad-runtime3d.js', import.meta.url), 'utf8'); assert.ok(/b\.cur\.time=a\.act\.t/.test(rt), 'o clipe segue act.t (sem timeScale solto)');
});
test('P4: golpe básico sem projétil, dano pelo rastro colado à lâmina', () => {
  for (const mode of ['ground', 'run', 'dash', 'air', 'plunge']) for (let i = 0; i < (mode === 'ground' ? 5 : 1); i++) { const d = protaMoveDef(mode, i); assert.equal(d.energy, null); assert.equal(d.hit, 'physical'); assert.equal(d.trail, BASIC_TRAIL); }
});
test('P5: andar mais ágil (corrida só com comando) e 2º salto mais alto; 1º salto intacto', () => {
  assert.ok(PROTA_LOCO.walk >= 2.8 && PROTA_LOCO.walk <= 3.5 && PROTA_LOCO.run >= 6 && PROTA_LOCO.run <= 7.5);
  assert.ok(MOBILITY.airJumpK ** 2 / .92 ** 2 >= 1.25 && MOBILITY.airJumpK ** 2 / .92 ** 2 <= 1.45 && MOBILITY.maxJumps === 2);
});
