/**
 * Carregamento estável do mundo 3D (missão combate cinematográfico + carregamento, P0).
 *
 * O mundo roda a partir de um blob: e importa ~200 módulos locais + three (CDN). No import nativo, UMA requisição que
 * falhe (rede móvel instável, timeout do CDN, recurso esgotado) derruba tudo com a mensagem genérica
 * "Failed to fetch dynamically imported module: blob:…", que esconde qual arquivo falhou — e o navegador guarda a
 * falha no mapa de módulos, então reimportar na mesma página não resolve.
 *
 * Aqui o grafo de módulos é percorrido ANTES do import, com fetch controlado: no máximo 6 requisições simultâneas,
 * até 3 tentativas por arquivo (a 2ª e a 3ª ignoram o cache) e erro com a URL real e o status HTTP. Depois disso o
 * import nativo encontra os arquivos no cache HTTP. Sem retry infinito: falha persistente vira mensagem precisa.
 */
export const WARM_LIMITS = Object.freeze({ concurrency: 6, tries: 3, backoffMs: 350 });

/** Especificadores de import/export estáticos e dinâmicos (literais) de um código ES module. */
export function importSpecs(code, parentSearch = '') {
  const out = new Set();
  const re = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)(['"])([^'"\n]+)\1(\s*\+\s*new\s+URL\(\s*import\.meta\.url\s*\)\.search)?/g;
  let m;
  while ((m = re.exec(code))) out.add(m[2] + (m[3] ? parentSearch : ''));
  return [...out];
}

/** Resolve um especificador como o navegador: relativo ao módulo pai, absoluto, ou pelo import map (exato ou prefixo /). */
export function resolveSpec(spec, parentUrl, importMap = {}) {
  if (/^\.{1,2}\//.test(spec) || spec.startsWith('/')) return new URL(spec, parentUrl).href;
  if (/^https?:\/\//.test(spec)) return spec;
  if (importMap[spec]) return importMap[spec];
  let best = '';
  for (const k of Object.keys(importMap)) if (k.endsWith('/') && spec.startsWith(k) && k.length > best.length) best = k;
  return best ? importMap[best] + spec.slice(best.length) : null;
}

const isScript = (url) => /\.m?js(?:[?#]|$)/i.test(url);

/** fetch com tentativas limitadas; 404/403 não são repetidos (arquivo ausente não é instabilidade). */
export async function fetchText(url, { fetchFn = fetch, tries = WARM_LIMITS.tries, backoffMs = WARM_LIMITS.backoffMs, wait = (ms) => new Promise(r => setTimeout(r, ms)) } = {}) {
  let last = '';
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetchFn(url, i ? { cache: 'reload' } : {});
      if (r.ok) return await r.text();
      last = 'HTTP ' + r.status;
      if (r.status === 404 || r.status === 403 || r.status === 410) break;
    } catch (e) { last = (e && e.message) || String(e); }
    if (i < tries - 1) await wait(backoffMs * (i + 1));
  }
  const err = new Error('Falha ao baixar ' + url + ' (' + last + ')');
  err.url = url; err.reason = last;
  throw err;
}

/**
 * Percorre o grafo a partir do código raiz (já reescrito) e baixa cada módulo uma vez.
 * Retorna { modules, failures:[{url, reason, from}] } — nunca lança: o import nativo decide, e as falhas explicam.
 */
export async function warmModuleGraph(rootCode, rootUrl, { importMap = {}, fetchFn = fetch, concurrency = WARM_LIMITS.concurrency, tries, backoffMs, wait, onProgress } = {}) {
  const seen = new Set(), failures = [];
  let queue = [];
  const enqueue = (code, parent) => {
    for (const s of importSpecs(code, new URL(parent).search)) {
      const u = resolveSpec(s, parent, importMap);
      if (!u || !isScript(u) || seen.has(u) || u.startsWith('blob:')) continue;
      seen.add(u); queue.push({ url: u, from: parent });
    }
  };
  enqueue(rootCode, rootUrl);
  let done = 0;
  while (queue.length) {
    const batch = queue; queue = [];
    let i = 0;
    const worker = async () => {
      while (i < batch.length) {
        const job = batch[i++];
        try { enqueue(await fetchText(job.url, { fetchFn, tries, backoffMs, wait }), job.url); }
        catch (e) { failures.push({ url: job.url, reason: e.reason || e.message, from: job.from }); }
        done++; if (onProgress) onProgress(done, seen.size);
      }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, batch.length) }, worker));
  }
  return { modules: seen.size, failures };
}

/** Import map da página (para resolver "three" e "three/addons/"). */
export function pageImportMap(doc = globalThis.document) {
  try {
    const el = doc && doc.querySelector('script[type="importmap"]');
    return el ? (JSON.parse(el.textContent).imports || {}) : {};
  } catch (_) { return {}; }
}

/** Mensagem legível: o arquivo real que falhou, não o blob. */
export function describeFailure(err, failures = []) {
  const base = (err && err.message) || String(err);
  if (!failures.length) return base;
  const short = (u) => u.replace(/^https?:\/\/[^/]+/, '');
  const list = failures.slice(0, 3).map(f => short(f.url) + ' (' + f.reason + ')').join('; ');
  return 'Não foi possível baixar ' + (failures.length > 1 ? failures.length + ' arquivos do jogo: ' : 'o arquivo ') + list + '. Verifique a conexão e toque em Tentar de novo.';
}
