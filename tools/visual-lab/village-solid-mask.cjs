"use strict";
/**
 * Gera eldoria-village-solids.js (colisão ajustada à forma da Vila da Clareira) a partir do JOGO REAL.
 *   VISUAL_BASE_URL=http://127.0.0.1:4173 node tools/visual-lab/village-solid-mask.cjs
 * Abre ?debug3d=1&solidos=0, espera a vila carregar, chama SevenSinsDebug3D.villageSolidMask (raios verticais em grade)
 * e pós-processa: descarta componentes < 3 células, dilata 1 célula (raio do corpo) e grava RLE base36 + assinatura.
 * Exclusões por desenho: flores e gotas da fonte (passáveis). THREE_LOCAL=/caminho/three serve o three sem CDN.
 */
const fs = require("node:fs"), path = require("node:path");
const EXCLUDE = "flowers|LastDrops";
function postprocess(m) {
  const N = m.N, raw = Buffer.from(m.b64, "base64"), g = new Uint8Array(N * N);
  for (let k = 0; k < N * N; k++) g[k] = (raw[k >> 3] >> (k & 7)) & 1;
  const keep = new Uint8Array(N * N), seen = new Uint8Array(N * N);
  for (let k = 0; k < N * N; k++) {
    if (!g[k] || seen[k]) continue; const st = [k], cl = []; seen[k] = 1;
    while (st.length) { const c = st.pop(); cl.push(c); const i = Math.floor(c / N), j = c % N;
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const x = i + a, y = j + b, kk = x * N + y; if (x >= 0 && y >= 0 && x < N && y < N && g[kk] && !seen[kk]) { seen[kk] = 1; st.push(kk); } } }
    if (cl.length >= 3) for (const c of cl) keep[c] = 1;
  }
  const d = new Uint8Array(N * N);
  for (let k = 0; k < N * N; k++) if (keep[k]) { const i = Math.floor(k / N), j = k % N; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const x = i + a, y = j + b; if (x >= 0 && y >= 0 && x < N && y < N) d[x * N + y] = 1; } }
  const runs = []; let cur = 0, n = 0; for (const b of d) { if (b === cur) n++; else { runs.push(n); cur = b; n = 1; } } runs.push(n);
  return { rle: runs.map(r => r.toString(36)).join(","), count: d.reduce((a, b) => a + b, 0) };
}
async function main() {
  const { chromium } = require("playwright"), base = (process.env.VISUAL_BASE_URL || "http://127.0.0.1:4173").replace(/\/$/, "");
  const b = await chromium.launch({ headless: true, args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const p = await (await b.newContext({ viewport: { width: 320, height: 180 } })).newPage();
  if (process.env.THREE_LOCAL) await p.route(/cdn\.jsdelivr\.net\/npm\/three@0\.160\.0\/(.*)/, async r => { const rel = r.request().url().split("three@0.160.0/")[1].split("?")[0]; await r.fulfill({ path: path.join(process.env.THREE_LOCAL, rel), contentType: "text/javascript" }); });
  await p.goto(base + "/mundo-3d-prototype.html?debug3d=1&solidos=0", { timeout: 60000 });
  await p.waitForFunction(() => window.SevenSinsDebug3D && SevenSinsDebug3D.riteState && SevenSinsDebug3D.riteState().ready, null, { timeout: 300000 });
  await p.evaluate(() => { const D = SevenSinsDebug3D; D.freeRoam(); D.setHour(14); D.teleport(-12, -44, Math.PI); });
  await p.waitForFunction(() => window.EldoriaLiveCityQA && window.SevenSinsVillagerReport && SevenSinsVillagerReport.life, null, { timeout: 300000 });
  await p.waitForTimeout(6000);
  const m = await p.evaluate(ex => SevenSinsDebug3D.villageSolidMask(.25, 36, ex), EXCLUDE); await b.close();
  const { rle, count } = postprocess(m);
  const { villageLayoutSignature } = await import(path.resolve("eldoria-village-solids.js"));
  const L = await import(path.resolve("eldoria-live-village3d.js"));
  const sig = villageLayoutSignature([L.ELDORIA_PLOTS, L.ELDORIA_MARKET, L.ELDORIA_PROPS, { x: m.cx, z: m.cz }]);
  const file = path.resolve("eldoria-village-solids.js"); let src = fs.readFileSync(file, "utf8");
  src = src.replace(/cx: [^,]+, cz: [^,]+, R: [^,]+, step: [^,]+, N: [^,]+, sig: '[^']*'/, `cx: ${m.cx}, cz: ${m.cz}, R: ${m.R}, step: ${m.step}, N: ${m.N}, sig: '${sig}'`).replace(/rle: '[^']*'/, `rle: '${rle}'`);
  fs.writeFileSync(file, src);
  console.log(`máscara: ${count} células sólidas de ${m.N * m.N}; assinatura ${sig}; malhas: ` + Object.entries(m.names).sort((a, b) => b[1] - a[1]).slice(0, 8).map(e => e[0] + "×" + e[1]).join(", "));
}
if (require.main === module) main().catch(e => { console.error(e); process.exitCode = 1; });
module.exports = { postprocess, EXCLUDE };
