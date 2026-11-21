"use strict";
/**
 * Núcleo do agente de cenas (fotos/vídeos do JOGO REAL) — puro, testável sem navegador.
 *
 * O que este módulo decide:
 *  - classificar um quadro capturado só por PIXELS (preto, branco, uniforme, escuro demais, válido). Isso é
 *    "métrica de pixels", nunca reconhecimento de objetos: o relatório separa o que foi OBSERVADO (arquivos,
 *    números, estado do debug) do que seria INFERIDO (não há inferência semântica automática aqui);
 *  - quando repetir a captura (o WebGL pode ainda não ter desenhado o quadro válido), sem laço infinito;
 *  - validar a lista de cenas pedida (presets do jogo ou coordenadas), sem criar teleporte/controle novo;
 *  - montar o índice navegável (index.html + index.md) e o report.json que outro agente consome sem conversar.
 */
const SCHEMA = "scene-agent/v1";

/** Estatística de um buffer RGBA (Uint8Array/Buffer, w*h*4) amostrado em grade. */
function pixelStats(rgba, width, height, step = 4) {
  let n = 0, sum = 0, sum2 = 0, dark = 0, bright = 0, sat = 0; const lum = [];
  for (let y = 0; y < height; y += step) for (let x = 0; x < width; x += step) {
    const i = (y * width + x) * 4, r = rgba[i], g = rgba[i + 1], b = rgba[i + 2], l = .2126 * r + .7152 * g + .0722 * b;
    n++; sum += l; sum2 += l * l; if (l < 12) dark++; if (l > 243) bright++; if (Math.max(r, g, b) - Math.min(r, g, b) > 60) sat++; lum.push(l);
  }
  const mean = sum / Math.max(1, n), sd = Math.sqrt(Math.max(0, sum2 / Math.max(1, n) - mean * mean));
  return { samples: n, mean: +mean.toFixed(2), stdev: +sd.toFixed(2), darkFrac: +(dark / n).toFixed(4), brightFrac: +(bright / n).toFixed(4), saturatedFrac: +(sat / n).toFixed(4) };
}
/** Classificação por pixels. status: 'ok' | 'suspeita'; reason explica o critério numérico. */
function classifyFrame(stats) {
  if (!stats || !stats.samples) return { status: "suspeita", reason: "sem amostras (captura vazia ou ilegível)" };
  if (stats.darkFrac > .97) return { status: "suspeita", reason: `quase todo preto (${(stats.darkFrac * 100).toFixed(1)} % < 12/255): canvas sem render, véu de transição ou câmera dentro de objeto` };
  if (stats.brightFrac > .97) return { status: "suspeita", reason: `quase todo branco (${(stats.brightFrac * 100).toFixed(1)} %): flash, overlay ou render queimado` };
  if (stats.stdev < 4) return { status: "suspeita", reason: `uniforme (desvio ${stats.stdev} < 4): carregamento, tela de espera ou render travado` };
  if (stats.mean < 18) return { status: "suspeita", reason: `muito escuro (média ${stats.mean}/255): pode ser cena noturna legítima ou câmera tapada — conferir a imagem` };
  return { status: "ok", reason: "pixels variados (critério estrutural apenas, não semântico)" };
}
/** Repetir a captura? Só enquanto o quadro for suspeito por motivo transitório e houver tentativas. */
function shouldRetry(cls, attempt, max = 5) {
  if (attempt + 1 >= max || cls.status === "ok") return false;
  return /preto|branco|uniforme|vazia/.test(cls.reason); // "muito escuro" pode ser legítimo: não insiste
}
/** Distância entre assinaturas 8x4 de luminância (0..255). Quadros quase idênticos indicam câmera/render travado. */
function signatureDistance(a, b) { if (!a || !b || a.length !== b.length) return Infinity; let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length; }
function signature(rgba, width, height) { const out = []; for (let gy = 0; gy < 4; gy++) for (let gx = 0; gx < 8; gx++) { let s = 0, n = 0; for (let y = Math.floor(gy * height / 4); y < Math.floor((gy + 1) * height / 4); y += 3) for (let x = Math.floor(gx * width / 8); x < Math.floor((gx + 1) * width / 8); x += 3) { const i = (y * width + x) * 4; s += .2126 * rgba[i] + .7152 * rgba[i + 1] + .0722 * rgba[i + 2]; n++; } out.push(+(s / Math.max(1, n)).toFixed(1)); } return out; }

/**
 * Presets de cena que usam SOMENTE a API de debug existente (?debug3d=1): freeRoam, setHour, teleport, view, fly,
 * ascension('cave'), caveTo. Coordenadas tiradas do layout real (act1-world-layout.js, ascension-layout.js) ou medidas
 * no jogo. Tipos de tomada:
 *   at:   [x, z, yaw] + pitch/dist → personagem posto no mundo e câmera REAL do jogo (terceira pessoa, colisão de câmera);
 *   cave: [lx, lz, yaw] → idem dentro da caverna (coordenadas locais; só leitura: não altera a caverna);
 *   fly:  [[de], [para]] → câmera livre de QA (vista aérea; pode atravessar objetos, por isso é marcada como livre);
 *   npc:  papel → close-up na página npc-visual-qa.html (rig GLB real, métricas de cabelo × crânio).
 * 'walk' grava um percurso real (tecla segurada) — vale para vídeo e para o quadro final.
 */
const SCENES = Object.freeze({
  "vila-praca": { kind: "mundo", hour: 15, shots: [
    { name: "praca-alto", fly: [[-2, 18, -26], [-13, 0, -44]] },
    { name: "praca-rua", at: [-8, -36, -2.4], pitch: .12, dist: 7 }] },
  "vila-vendedores": { kind: "mundo", hour: 14, settle: 5000, shots: [
    { name: "bento", fly: [[-21.0, 2.25, -46.0], [-22.48, 1.25, -49.01]] },
    { name: "teo", fly: [[-3.0, 2.25, -38.2], [-1.95, 1.25, -41.04]] },
    { name: "lia", fly: [[-15.4, 2.25, -37.9], [-16.2, 1.25, -41.07]] }] },
  "floresta-percurso": { kind: "mundo", hour: 10, shots: [
    { name: "antes-do-percurso", at: [-14, -105, -Math.PI / 2], pitch: .12, dist: 5.5 }], walk: { key: "KeyW", ms: 2500 } },
  "floresta-trilha": { kind: "mundo", hour: 10, shots: [
    { name: "trilha-samambaias", at: [-14, -105, -Math.PI / 2], pitch: .1, dist: 6.5 },
    { name: "clareira-musgo", at: [-30, -120, -2.36], pitch: .14, dist: 7 }], walk: { key: "KeyW", ms: 3500 } },
  "mundo-boca-caverna": { kind: "mundo", hour: 13, shots: [
    { name: "boca", at: [-56, -236, -Math.PI / 2], pitch: .1, dist: 7 },
    { name: "boca-frente", fly: [[-61, 2.8, -233], [-72.6, 2.4, -236]] }] },
  "caverna-salao": { kind: "caverna", shots: [
    { name: "entrada", cave: [0, -6, Math.PI], pitch: .1, dist: 6 },
    { name: "salao", cave: [0, -34, Math.PI], pitch: .05, dist: 6 },
    { name: "portal", cave: [-4, -120, Math.PI], pitch: .08, dist: 6 }], walk: { key: "KeyW", ms: 3000 } },
  "caverna-gruta-cristal": { kind: "caverna", shots: [
    { name: "gruta", cave: [-30, -61, -Math.PI / 2], pitch: .08, dist: 6 },
    { name: "galeria-alta", cave: [-25, -98, -2.2], pitch: .08, dist: 5.5 },
    { name: "cristal", cave: [-46, -106, -Math.PI / 2], pitch: .08, dist: 6 }] },
  "npc-cabelos": { kind: "npc", shots: [{ name: "vendorMan", npc: "vendorMan" }, { name: "vendorWoman", npc: "vendorWoman" }, { name: "elder", npc: "elder" }] },
});
function validateRequest(raw) {
  const list = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : ["vila-praca", "caverna-salao", "npc-cabelos"];
  if (!Array.isArray(list) || !list.length || list.length > 8) throw Error("Peça de 1 a 8 cenas");
  return validateRequestShots(list.map(item => {
    const id = typeof item === "string" ? item : item && item.scene;
    if (!SCENES[id]) throw Error("Cena desconhecida: " + id + " (disponíveis: " + Object.keys(SCENES).join(", ") + ")");
    return { id, video: !!(item && item.video), ...SCENES[id], hud: !!(item && item.hud) };
  }));
}
/** Valida uma tomada isolada (útil para cenas sob medida por JSON). */
function validateShot(s, i = 0) {
  const nums = a => Array.isArray(a) && a.every(Number.isFinite);
  const name = String(s && s.name || "tomada-" + i).replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 60);
  if (s.at && nums(s.at) && s.at.length === 3) return { ...s, name, mode: "camera-do-jogo" };
  if (s.cave && nums(s.cave) && s.cave.length === 3) return { ...s, name, mode: "camera-do-jogo-caverna" };
  if (s.fly && s.fly.length === 2 && nums(s.fly[0]) && nums(s.fly[1])) return { ...s, name, mode: "camera-livre-qa" };
  if (typeof s.npc === "string" && /^[a-zA-Z]+$/.test(s.npc)) return { ...s, name, mode: "close-up-npc" };
  throw Error("Tomada inválida " + i + ": use at, cave, fly ou npc");
}
function validateRequestShots(list) {
  return list.map(scene => ({ ...scene, shots: scene.shots.map(validateShot) }));
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
/** Índice para humanos (HTML) e para agentes (Markdown): o que abrir, em que ordem, e o que foi observado. */
function buildIndex(report) {
  const rows = report.shots.map(s => `<figure class="${s.status}"><a href="${esc(s.file)}"><img src="${esc(s.file)}" loading="lazy" alt="${esc(s.scene + "/" + s.name)}"></a><figcaption><b>${esc(s.scene)}/${esc(s.name)}</b> — <span>${esc(s.status)}</span><br>${esc(s.reason)}<br><small>tentativas ${s.attempts} · média ${s.pixels.mean} · desvio ${s.pixels.stdev}</small></figcaption></figure>`).join("\n");
  const vids = (report.videos || []).map(v => `<li><a href="${esc(v.file)}">${esc(v.scene)}</a> (${esc(v.format)}, ${v.bytes} bytes)</li>`).join("");
  const html = `<!doctype html><meta charset="utf-8"><title>Agente de cenas — ${esc(report.commit || "")}</title><style>body{font:14px system-ui;background:#111;color:#eee;margin:16px}figure{display:inline-block;width:300px;margin:6px;vertical-align:top}img{width:300px}figure.suspeita{outline:3px solid #e8a33d}small{color:#aaa}</style>
<h1>Agente de cenas do jogo real</h1><p>commit <code>${esc(report.commit)}</code> · build <code>${esc(report.build)}</code> · viewport ${report.viewport.width}×${report.viewport.height} · ${esc(report.renderer)} · ${esc(report.startedAt)}</p>
<p><b>Observado</b>: PNGs, vídeos, números de pixels e estado do debug. <b>Inferido</b>: nada — a classificação é estrutural (pixels), não reconhece objetos. Imagens "suspeita" precisam de olho humano/multimodal.</p>
<p>Erros de página: ${report.pageErrors.length} · requisições falhas: ${report.failedRequests.length}</p><ul>${vids}</ul>${rows}`;
  const md = [`# Agente de cenas — ${report.commit}`, "", `- build: \`${report.build}\` · viewport ${report.viewport.width}×${report.viewport.height} · ${report.renderer}`, `- status: **${report.status}** (ok ${report.counts.ok}, suspeita ${report.counts.suspeita}, falha ${report.counts.falha})`,
    "- Observado = arquivos + métricas de pixels + estado do debug. Inferido = nenhum (sem visão semântica automática).", "", "| cena | foto | status | motivo | estado |", "|---|---|---|---|---|",
    ...report.shots.map(s => `| ${s.scene} | [${s.name}](${s.file}) | ${s.status} | ${s.reason} | ${s.stateSummary || ""} |`), "",
    ...(report.videos || []).map(v => `- vídeo ${v.scene}: [${v.file}](${v.file}) (${v.format})`), "", `Erros de página: ${report.pageErrors.length}; requisições falhas: ${report.failedRequests.length}.`].join("\n");
  return { html, md };
}
function summarize(shots, fatal) {
  const counts = { ok: 0, suspeita: 0, falha: 0 }; for (const s of shots) counts[s.status] = (counts[s.status] || 0) + 1;
  return { counts, status: fatal ? "falha" : counts.falha ? "falha" : counts.suspeita ? "suspeita" : "ok", exitCode: fatal || counts.falha ? 1 : 0 };
}
module.exports = { SCHEMA, pixelStats, classifyFrame, shouldRetry, signature, signatureDistance, SCENES, validateRequest, validateShot, buildIndex, summarize };
