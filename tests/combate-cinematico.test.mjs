/** Missão combate cinematográfico + carregamento: dash visível/aproximação, contra-ataque, alvo do chefe e lock-on opcional. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PROTA_DASH, dashApproach, protaSegments, pickTarget } from '../prota-combat3d.js';
import { MOBILITY } from '../combat-mobility3d.js';

const m = fs.readFileSync(new URL('../mundo-3d-prototype.js', import.meta.url), 'utf8');

test('dash: o MESMO dash (recarga, i-frames, distância livre) com pose visível do slide_right e levantada do mesmo clipe', () => {
  assert.equal(PROTA_DASH.cooldown, MOBILITY.dashCooldown); assert.equal(PROTA_DASH.distance, 5.4); assert.equal(PROTA_DASH.iframes, .30);
  const seg = Object.fromEntries(protaSegments().map(s => [s.id, s]));
  assert.ok(seg.Prota302_dash.vertical && seg.Prota302_dash.clip === 'slide_right' && seg.Prota302_rise.clip === 'slide_right');
  assert.ok(seg.Prota302_rise.start > seg.Prota302_dash.end, 'levanta com o fim do deslize (sem pose de salto)');
  assert.equal((m.match(/function protaDashStart\(/g) || []).length, 1, 'sem segundo dash');
  assert.equal((m.match(/heroMob\.dash\(combatClock\)/g) || []).length, 1, 'mesma recarga/callback');
  assert.ok(/playOnce\('Prota302_dash',\.04\)/.test(m) && /heroShadows\?\.emit\(\);\}/.test(m), 'corpo visível com silhuetas no caminho');
});
test('dash de aproximação: vai ao inimigo à frente e para na distância de golpe; para o lado ou sem alvo, 5,4 m livres', () => {
  const t = { id: 'b', x: 0, z: 7, alive: true, radius: .8 };
  const a = dashApproach({ x: 0, z: 0 }, { x: .2, z: .98 }, [t]);
  assert.equal(a.target, t); assert.ok(Math.abs(a.dist - (7 - .8 - PROTA_DASH.approach.stop)) < 1e-9); assert.ok(Math.abs(a.dir.z - 1) < 1e-9);
  assert.equal(dashApproach({ x: 0, z: 0 }, { x: 1, z: 0 }, [t]).dist, PROTA_DASH.distance, 'dash lateral não é puxado');
  assert.equal(dashApproach({ x: 0, z: 0 }, { x: 0, z: 1 }, [{ ...t, z: 20 }]).target, null, 'longe demais');
  assert.equal(dashApproach({ x: 0, z: 0 }, { x: 0, z: 1 }, [t], { blocked: () => true }).target, null, 'parede no meio');
  const near = dashApproach({ x: 0, z: 0 }, { x: .3, z: .95 }, [{ ...t, z: 1.6 }]);
  assert.equal(near.target, null, 'já no alcance: sem aproximação forçada'); assert.equal(near.dist, PROTA_DASH.distance);
  assert.ok(Math.abs(near.dir.x - .3) < 1e-9, 'colado: dash livre na direção pedida, não puxado para o alvo');
});
test('dash de aproximação nunca termina dentro da distância de parada (raios 0,5/0,8/1,5, alvos de 0,3 a 9 m, ângulos no cone)', () => {
  const { stop, min, max, cone } = PROTA_DASH.approach;
  let approached = 0;
  for (const radius of [.5, .8, 1.5]) for (let d = .3; d <= 9; d += .1) for (const ang of [0, .3, -.3, cone - .01]) {
    const t = { id: 'b', x: Math.sin(ang) * d, z: Math.cos(ang) * d, alive: true, radius };
    const a = dashApproach({ x: 0, z: 0 }, { x: 0, z: 1 }, [t]);
    if (!a.target) { assert.equal(a.dist, PROTA_DASH.distance); assert.ok(d - radius - stop < min || d > PROTA_DASH.approach.range); continue; }
    approached++;
    const ex = a.dir.x * a.dist, ez = a.dir.z * a.dist, left = Math.hypot(t.x - ex, t.z - ez);
    assert.ok(a.dist >= min - 1e-9 && a.dist <= max + 1e-9, `distância ${a.dist}`);
    assert.ok(left >= radius + stop - 1e-9, `r=${radius} d=${d.toFixed(1)}: termina a ${left.toFixed(2)} m do centro`);
  }
  assert.ok(approached > 100);
});
test('esquiva perfeita → contra-ataque: golpe absorvido pelos i-frames do dash abre a janela; o próximo golpe sai mais forte', () => {
  assert.ok(/if\(now<playerInvulnerableUntil\)\{protaPerfectDodge\(\);return false;\}/.test(m));
  assert.ok(/prota302\.counterUntil=prota302\.clock\+PROTA_DASH\.counter\.window/.test(m) && /\(counter\?PROTA_DASH\.counter\.damage:1\)/.test(m));
  assert.ok(/if\(!newHero\|\|prota302\.dodged\|\|/.test(m), 'uma vez por dash');
});
test('chefes/esquadrão: o golpe resolve o alvo travado pelo id do ator (antes a aproximação nunca rodava e a espada cortava o vento)', () => {
  assert.ok(/if\(a\.lockId!=null&&\(!target\|\|target\.id!==a\.lockId\)\)\{const c=protaCandidates\(\)\.find\(x=>x\.id===a\.lockId\);if\(c\)target=c;\}/.test(m));
});
test('lock-on opcional: tocar no inimigo trava/solta (celular), R ou botão do meio (PC); câmera enquadra os dois', () => {
  assert.ok(/function tapLock\(x,y\)/.test(m) && /e\.timeStamp-tap\.t<320\)tapLock/.test(m));
  assert.ok(/e\.code==='KeyR'&&!e\.repeat/.test(m) && /e\.button===1\)\{e\.preventDefault\(\);toggleLockOn\(\);\}/.test(m));
  assert.ok(/else if\(lockOnActive&&foeOn\)\{[^}]*k=Math\.min\(\.35,4\/fd\)/.test(m) && /lockOnActive&&cameraDistance>=1\.05\?Math\.min\(3\.2/.test(m));
  assert.ok(!/id="aim"/.test(fs.readFileSync(new URL('../mundo-3d-prototype.html', import.meta.url), 'utf8')), 'sem botão MIRAR de volta');
});
test('duelo em lock-on: herói de frente para o alvo e recuo com Walk_Backward (clipe antes sem uso); inventário automático', () => {
  const seg = Object.fromEntries(protaSegments().map(s => [s.id, s])); assert.equal(seg.Prota302_back.clip, 'Walk_Backward');
  assert.ok(/const duel=newHero&&lockOnActive&&enemy\.visible&&enemyAlive&&!isSprinting\(\)/.test(m) && /protaLocomotion\(sp,duel&&/.test(m));
  assert.ok(fs.existsSync(new URL('../tools/combat/clip-inventory.mjs', import.meta.url)));
});
test('mira automática (estilo Genshin, sem botão): sem analógico o golpe acha o inimigo em volta, até às costas; com analógico, a direção pedida manda', () => {
  assert.ok(/pickTarget\(from,intent\.yaw,cands,\{blocked:protaBlocked,range:9,cone:intent\.input\?1\.0:Math\.PI,/.test(m));
  const back = { id: 'b', x: 0, z: -2.5, y: 1, alive: true }, ahead = { id: 'a', x: 0, z: 6, y: 1, alive: true };
  assert.equal(pickTarget({ x: 0, y: 1, z: 0 }, 0, [back], { range: 9, cone: Math.PI }), back, 'inimigo às costas é encontrado');
  assert.equal(pickTarget({ x: 0, y: 1, z: 0 }, 0, [back, ahead], { range: 9, cone: Math.PI }), ahead, 'a frente pesa no desempate');
  assert.equal(pickTarget({ x: 0, y: 1, z: 0 }, 0, [back], { range: 9, cone: 1.0 }), null, 'com analógico para frente, não vira para trás');
});
