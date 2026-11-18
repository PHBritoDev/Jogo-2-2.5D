/**
 * Missão combate/câmera/áudio — banco de amostras REAIS (audio/audio-manifest.json) sobre o Web Audio do audio3d.js.
 *
 *  - Evento → lista de arquivos (variações): sorteio sem repetir o último, leve variação de altura (±4 %).
 *  - Carregamento preguiçoso com cache: o 1º pedido de um evento ainda não decodificado devolve false (o chamador toca o
 *    procedural antigo daquela vez) e o arquivo é baixado/decodificado em segundo plano; a partir daí só a amostra.
 *  - Limite de vozes (one-shots) para não saturar o celular; loops de ambiente com nível suave (setTargetAtTime),
 *    criados uma vez e silenciados quando não usados (sem criar/destruir fonte a cada quadro).
 *  - Sem rede/arquivo: tudo continua funcionando com o procedural (nunca silêncio por falha de carregamento).
 */
export const BANK_LIMITS = Object.freeze({ voices: 12, pitchJitter: .04 });

/** Índice puro evento → assets (testável). */
export function indexManifest(manifest) {
  const byEvent = new Map();
  for (const a of manifest?.assets || []) { if (!byEvent.has(a.evento)) byEvent.set(a.evento, []); byEvent.get(a.evento).push(a); }
  return byEvent;
}
/** Sorteio sem repetir o último (determinístico com rnd injetado). */
export function pickVariant(list, last, rnd = Math.random) {
  if (!list.length) return null; if (list.length === 1) return list[0];
  const pool = list.filter(a => a.assetId !== last); return pool[Math.floor(rnd() * pool.length) % pool.length];
}

export function createSampleBank(ctx, { base = './', manifestUrl = './audio/audio-manifest.json', fetchFn = (u) => fetch(u) } = {}) {
  let byEvent = new Map(), ready = false;
  const buffers = new Map(), loading = new Map(), lastPick = new Map(), voices = [], loops = new Map();
  const init = fetchFn(manifestUrl).then(r => r.ok ? r.json() : null).then(m => { byEvent = indexManifest(m); ready = true; }).catch(() => { ready = false; });
  function load(asset) {
    if (buffers.has(asset.assetId)) return Promise.resolve(buffers.get(asset.assetId));
    if (loading.has(asset.assetId)) return loading.get(asset.assetId);
    const p = fetchFn(base + asset.arquivo).then(r => r.arrayBuffer()).then(ab => new Promise((ok, no) => ctx.decodeAudioData(ab, ok, no)))
      .then(buf => { buffers.set(asset.assetId, buf); loading.delete(asset.assetId); return buf; }).catch(() => { loading.delete(asset.assetId); return null; });
    loading.set(asset.assetId, p); return p;
  }
  function preload(filter) { if (!ready) return init.then(() => preload(filter)); const jobs = []; for (const [ev, list] of byEvent) if (filter(ev, list[0])) for (const a of list) jobs.push(load(a)); return Promise.all(jobs); }
  return {
    init, get ready() { return ready; }, has(ev) { return byEvent.has(ev); }, preload,
    /** Toca um evento. Retorna true se a amostra tocou; false = o chamador usa o som antigo (ainda carregando/sem arquivo). */
    play(ev, out, { gain = 1, rate = 1, when = 0, pan = 0 } = {}) {
      if (!ready || !ctx || ctx.state === 'closed') return false; const list = byEvent.get(ev); if (!list) return false;
      const ready_ = list.filter(a => buffers.has(a.assetId)); if (!ready_.length) { for (const a of list) load(a); return false; }
      const a = pickVariant(ready_, lastPick.get(ev)); lastPick.set(ev, a.assetId);
      while (voices.length >= BANK_LIMITS.voices) { const v = voices.shift(); try { v.stop(); } catch (_) {} }
      const src = ctx.createBufferSource(); src.buffer = buffers.get(a.assetId); src.playbackRate.value = rate * (1 + (Math.random() * 2 - 1) * BANK_LIMITS.pitchJitter);
      const g = ctx.createGain(); g.gain.value = gain; let node = g;
      if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); g.connect(p); node = p; }
      src.connect(g); node.connect(out); src.start(ctx.currentTime + when); voices.push(src); src.onended = () => { const i = voices.indexOf(src); if (i >= 0) voices.splice(i, 1); };
      return true;
    },
    /** Loop de ambiente: cria uma vez e ajusta o nível; retorna true se a amostra está ativa (para calar o procedural). */
    loop(ev, out, level) {
      if (!ready) return false; let L = loops.get(ev);
      if (!L) { const list = byEvent.get(ev); if (!list) return false; const a = list[0]; if (!buffers.has(a.assetId)) { if (level > .001) load(a); return false; }
        const src = ctx.createBufferSource(); src.buffer = buffers.get(a.assetId); src.loop = true; const g = ctx.createGain(); g.gain.value = 0; src.connect(g); g.connect(out); src.start(0, Math.random() * src.buffer.duration); L = { src, g }; loops.set(ev, L); }
      L.g.gain.setTargetAtTime(Math.max(0, level), ctx.currentTime, .9); return level > .001 || L.g.gain.value > .01;
    },
    stats() { return { ready, eventos: byEvent.size, decodificados: buffers.size, vozes: voices.length, loops: loops.size }; }
  };
}
