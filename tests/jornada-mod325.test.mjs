/**
 * Mod 325 — auditoria de costuras, água, vulcão e aurora: as correções de causa raiz ficam travadas por teste.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as J from '../jornada3d.js';
import { auroraLevel } from '../ceu-atmosfera3d.js';

const w = fs.readFileSync(new URL('../jornada-world3d.js', import.meta.url), 'utf8');
const m = fs.readFileSync(new URL('../mundo-3d-prototype.js', import.meta.url), 'utf8');
const sky = fs.readFileSync(new URL('../ceu-atmosfera3d.js', import.meta.url), 'utf8');
const fl = fs.readFileSync(new URL('../fluidos3d.js', import.meta.url), 'utf8'); // Mod 326: água/quedas/lava migraram para cá

test('costuras: faixa leste cobre a fresta da malha antiga; blocos finos E grossos têm saia; o cone entra no chão', () => {
  assert.ok(w.includes("m.name = 'jornada-costura-leste'") && /h = g0 - \.05 - sl \* 1\.6/.test(w), 'faixa da costura leste 5 cm abaixo do relevo');
  assert.ok(/kind === 'far' \? FAR_CELL : NEAR_CELL, true\)/.test(w), 'saia também nos blocos grossos');
  assert.ok(/pos\[k \* 3 \+ 1\] - cell \* 1\.75 - 1\.5/.test(w), 'saia proporcional à célula');
  assert.ok(/for \(const v of g\.userData\.skirt\) keep\.push\(v\)/.test(w), 'máscara do bloco grosso preserva a saia');
  assert.ok(/pos\.push\(pos\[k\], pos\[k \+ 1\] - 10, pos\[k \+ 2\]\)/.test(w), 'saia na borda do cone');
});

test('cor: atributos de cor convertidos para linear (antes o chão saía ~3× mais claro que Eldória)', () => {
  assert.ok(/const lin = c => \[c\[0\] \*\* 2\.2, c\[1\] \*\* 2\.2, c\[2\] \*\* 2\.2\]/.test(w));
  assert.ok((w.match(/= lin\(c\)|return lin\(c\)/g) || []).length >= 3, 'chão, paredões e cone');
});

test('água: cortinas volumétricas com listras em metros, quedas largas no abismo e espuma na linha d\'água', () => {
  assert.ok(/export function curtainGeometry\(T, path, side, width, bulge, segs = 8, out = null\)/.test(fl));
  assert.ok(/xm=x\*uW,yy=y-uT\*uV/.test(fl), 'listras alongadas na direção da queda (em metros)');
  assert.ok(J.ABYSS_FALLS.some(f => f.w >= 35) && J.ABYSS_FALLS.every(f => f.w >= 15), 'quedas largas, uma delas marco');
  for (const f of J.ABYSS_FALLS) assert.ok(Math.abs(f.z - J.BRIDGE.z) > 40, 'longe da ponte');
  assert.ok(/sim\.disturb\(px, pz,/.test(w), 'Mod 326: os pés abrem ondas simuladas (substitui o anel fixo)');
  assert.ok(/s\.y = m; \}/.test(w) && /\(s\.y \?\? height\(s\.x, s\.z\)\) \+ s\.s \* \.15/.test(w), 'pedras apoiadas no ponto mais baixo da pegada');
});

test('vulcão: malha densa com saia, relevo de detalhe, afloramentos com a mesma bruma, pluma em nuvem, geologia do entorno', () => {
  assert.ok(/const A = low \? 176 : 288, R = low \? 56 : 84/.test(w));
  assert.ok(/bumpMap: detail, bumpScale: 1\.2/.test(w));
  assert.ok(/idx\.push\(p, p \+ 1, q, p \+ 1, q \+ 1, q\); \} \/\/ Mod 325: faces para fora/.test(w), 'faces do cone voltadas para fora (sem avesso/"buraco" no flanco)');
  assert.ok(!/smoothstep\(\.1,\.04,k\)\*uGlowK/.test(w), 'sem brilho emissivo de cratera atravessando o flanco');
  assert.ok(/'jornada-vulcao-afloramentos'/.test(w) && /om\.onBeforeCompile = coneHaze/.test(w));
  assert.ok(/const puffTex = canvasTex/.test(w) && /s\.scale\.setScalar\(34 \+ 260 \* k \*\* \.8\)/.test(w), 'pluma larga e alta');
  assert.ok(/'jornada-laminas-basalto'/.test(w) && /'jornada-poca-lava'/.test(fl));
  assert.ok(J.journeyBlocked(J.VOLCANO2.x, J.VOLCANO2.z, 999), 'topo continua inacessível');
});

test('aurora: dois arcos pelo céu (presente em quase todos os rumos) e tinge levemente o ambiente', () => {
  assert.ok(/for \(int i = 0; i < 2; i\+\+\)/.test(sky) && /float win = \.3 \+ \.7 \*/.test(sky), 'nunca zera por direção');
  assert.ok(auroraLevel(1, 1) > .99 && auroraLevel(0, 1) === 0);
  assert.ok(/hemiLight\.color\.lerp\(AUR_TINT_SKY,ak\*\.4\)/.test(m) && /scene\.fog\.color\.lerp\(AUR_TINT_FOG,ak\*\.2\)/.test(m), 'influência ambiental (Mod 326: perceptível)');
});
