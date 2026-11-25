import { POIS as SAKURA_POIS, SHELTERS } from './sakura-route3d.js';
import { JOURNEY_POIS } from './jornada3d.js';
/**
 * MOD 186 — Mapa com névoa de guerra e abrigos de viagem rápida (regras puras, testadas em map3d.test.mjs).
 * O mapa só mostra o que o jogador já viu; abrigos precisam ser encontrados e registrados
 * explicitamente antes de aparecerem no menu de viagem.
 */
/* Mod 321 — o mapa cobre a jornada a oeste (vale, serra, ponte, terras de cinza, Cinzária e o vulcão). A névoa antiga
   (v3: 80×80 sobre 430 m) é convertida célula a célula para a grade nova (migrateLegacyFog), sem perder o que foi visto. */
export const LEGACY_MAP_BOUNDS = Object.freeze({ x0: -215, z0: -290, size: 430, cells: 80 });
export const V4_MAP_BOUNDS = Object.freeze({x0:-1760,z0:-1090,size:1980,cells:220});
export const MAP_BOUNDS = { x0:-2080, z0:-2290, size:3360 };
/** Chave de armazenamento da névoa: muda quando os limites do mapa mudam (Mod 195). */
export const MAP_STORE_KEY = 'seven-sins-3d-map-v5';
export const LEGACY_MAP_STORE_KEY = 'seven-sins-3d-map-v3';
export const FOG_CELLS = 374;
export const REVEAL_RADIUS = 24;

export const MAP_POIS = [
  { id: 'inicio', name: 'Despertar', x: 52, z: 10, kind: 'camp' },
  { id: 'vila', name: 'Vila da Clareira', x: -12.2, z: -44.5, kind: 'village' },
  { id: 'clareira', name: 'Clareira do Tronco', x: 0, z: -29, kind: 'clearing' },
  { id: 'loja', name: 'Loja Central', x: -33, z: -45, kind: 'shop', revealRadius: 26 },
  { id: 'gaiolas', name: 'Gaiolas da Floresta', x: 66, z: -70, kind: 'danger' }, // Mod 305: clareira na mata da serra
  { id: 'esgoto', name: 'Entrada do Esgoto', x: 22, z: -106, kind: 'danger' },
  { id: 'lago', name: 'Lago Escuro', x: -27, z: -88, kind: 'water' },
  { id: 'ruina', name: 'Ruína Esquecida', x: -18.5, z: -52, kind: 'secret', secret: true },
  { id: 'portal', name: 'Portal de VHAZRAEL', x: 44, z: -119, kind: 'portal', revealRadius: 34 },
  { id: 'garganta', name: 'Garganta da Dívida', x: -72, z: -60, kind: 'danger' },
  // Mod 321 — a jornada substitui o antigo Distrito/Mina/Canal (ver POI_ALIASES)
  ...JOURNEY_POIS, ...SAKURA_POIS,
  { id: 'incenso', name: 'Passagem do Incenso', x: 96, z: -32, kind: 'danger' },
  { id: 'altar', name: 'Invernália', x: 150, z: -40, kind: 'village', revealRadius: 26 }, // MOD 206 — a cidade de neve do Ato III
  { id: 'serra', name: 'Torre de VÉRAXION', x: -36, z: -238, kind: 'village', revealRadius: 26 }, // MOD 207
  { id: 'coliseu', name: 'Coliseu da Ascensão', x: 150, z: -215, kind: 'village', revealRadius: 40 }, // MOD 208
  { id: 'deserto', name: 'Deserto dos Fragmentos', x: 152, z: -124, kind: 'village', revealRadius: 30 }, // MOD 209
  { id: 'arena-vale', name: 'Arena do Vale', x: 168, z: -70, kind: 'danger' }
];

/* Mod 317 — POUCOS abrigos, cada um com função de rota: cidade, mata e caverna. O antigo Abrigo do Sopé ficava a 14 m do
   da Mata Funda (redundante): saves que o tinham registrado ganham o da Mata (WAYSTONE_ALIASES), sem perder progresso.
   Abrigos são viagem rápida/retorno; checkpoints de história e de chefe continuam separados. */
export const WAYSTONES = [
  { id: 'abrigo-vila', name: 'Abrigo da Vila', x: -4.6, z: -36.5 },
  { id: 'abrigo-mata', name: 'Abrigo da Mata Funda', x: 6.5, z: -79 },
  { id: 'abrigo-caverna', name: 'Abrigo da Fronteira', x: -40, z: -219 },
  // Mod 321 — abrigos da jornada: vale, antes da ponte e na nova cidade
  { id: 'abrigo-vale', name: 'Abrigo do Vale', x: -236, z: -46 },
  { id: 'abrigo-serra', name: 'Abrigo da Serra', x: -790, z: -54 },
  { id: 'abrigo-cinzaria', name: 'Abrigo de Cinzária', x: -1228, z: -74 },
  ...SHELTERS
];
export const WAYSTONE_ALIASES = Object.freeze({ 'abrigo-sope': 'abrigo-mata' });
/** Mod 321 — POIs da Cidade 2 antiga: quem já tinha o Distrito descoberto ganha Cinzária; Mina/Canal deixam de existir. */
export const POI_ALIASES = Object.freeze({ distrito: 'cinzaria' });

export function worldToCell(x, z) {
  const cx = Math.floor((x - MAP_BOUNDS.x0) / MAP_BOUNDS.size * FOG_CELLS);
  const cz = Math.floor((z - MAP_BOUNDS.z0) / MAP_BOUNDS.size * FOG_CELLS);
  return [cx, cz];
}

export function createMapState(saved) {
  const cells = new Uint8Array(FOG_CELLS * FOG_CELLS);
  const pois = new Set(), waystones = new Set();
  if (saved && typeof saved === 'object') {
    if (typeof saved.cells === 'string') {
      try {
        const bin = typeof atob === 'function' ? atob(saved.cells) : Buffer.from(saved.cells, 'base64').toString('binary');
        for (let i = 0; i < cells.length; i++) cells[i] = (bin.charCodeAt(i >> 3) >> (i & 7)) & 1;
      } catch (_) {}
    }
    // Saves antigos/corrompidos podem conter objetos em vez de listas; ignore apenas o campo inválido.
    for (const raw of Array.isArray(saved.pois) ? saved.pois : []) { const id = POI_ALIASES[raw] || raw; if (MAP_POIS.some(p => p.id === id)) pois.add(id); }
    for (const raw of Array.isArray(saved.waystones) ? saved.waystones : []) { const id = WAYSTONE_ALIASES[raw] || raw; if (WAYSTONES.some(w => w.id === id)) waystones.add(id); }
  }
  return { cells, pois, waystones };
}

export function serializeMapState(state) {
  const bytes = new Uint8Array(Math.ceil(state.cells.length / 8));
  for (let i = 0; i < state.cells.length; i++) if (state.cells[i]) bytes[i >> 3] |= 1 << (i & 7);
  let bin = ''; for (const b of bytes) bin += String.fromCharCode(b);
  const cells = typeof btoa === 'function' ? btoa(bin) : Buffer.from(bin, 'binary').toString('base64');
  return { cells, pois: [...state.pois], waystones: [...state.waystones] };
}

/** Revela células ao redor do jogador. Retorna quantas foram descobertas agora. */
export function revealAround(state, x, z, radius = REVEAL_RADIUS) {
  const cellSize = MAP_BOUNDS.size / FOG_CELLS, [cx, cz] = worldToCell(x, z), r = Math.ceil(radius / cellSize);
  let fresh = 0;
  for (let j = cz - r; j <= cz + r; j++) for (let i = cx - r; i <= cx + r; i++) {
    if (i < 0 || j < 0 || i >= FOG_CELLS || j >= FOG_CELLS) continue;
    const wx = MAP_BOUNDS.x0 + (i + .5) * cellSize, wz = MAP_BOUNDS.z0 + (j + .5) * cellSize;
    if (Math.hypot(wx - x, wz - z) > radius) continue;
    const k = j * FOG_CELLS + i; if (!state.cells[k]) { state.cells[k] = 1; fresh++; }
  }
  return fresh;
}

export function isRevealed(state, x, z) {
  const [i, j] = worldToCell(x, z);
  if (i < 0 || j < 0 || i >= FOG_CELLS || j >= FOG_CELLS) return false;
  return !!state.cells[j * FOG_CELLS + i];
}

/** Marca pontos de interesse próximos. Locais secretos dependem de terem sido encontrados no jogo. */
export function discoverPois(state, x, z, options = {}) {
  const secretsFound = options?.secretsFound;
  const found = [];
  for (const p of MAP_POIS) {
    if (state.pois.has(p.id)) continue;
    if (p.secret && !secretsFound?.[p.id]) continue;
    if (Math.hypot(p.x - x, p.z - z) <= (p.revealRadius || 16)) { state.pois.add(p.id); found.push(p); }
  }
  return found;
}

/** Viagem rápida só quando a cena permite. */
export function canFastTravel({ inCombat, inDialogue, inCinematic, escorting, falling, dead }) {
  if (dead) return { ok: false, reason: 'Recupere-se antes de viajar.' };
  if (inCombat) return { ok: false, reason: 'Não é possível viajar durante um combate.' };
  if (inDialogue || inCinematic) return { ok: false, reason: 'Termine a cena atual antes de viajar.' };
  if (escorting) return { ok: false, reason: 'Não abandone as crianças: leve-as a pé até a vila.' };
  if (falling) return { ok: false, reason: 'Pise em chão firme antes de viajar.' };
  return { ok: true };
}

/** Mod 321 — converte a névoa salva na grade antiga (v3) para a grade atual: cada célula vista continua vista. */
export function migrateLegacyFog(saved, legacy = LEGACY_MAP_BOUNDS) {
  if (!saved || typeof saved.cells !== 'string') return saved || null;
  let bin = ''; try { bin = typeof atob === 'function' ? atob(saved.cells) : Buffer.from(saved.cells, 'base64').toString('binary'); } catch (_) { return { pois: saved.pois, waystones: saved.waystones }; }
  const out = new Uint8Array(FOG_CELLS * FOG_CELLS), n = legacy.cells, cs = legacy.size / n, ns = MAP_BOUNDS.size / FOG_CELLS;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const k = j * n + i; if (!((bin.charCodeAt(k >> 3) >> (k & 7)) & 1)) continue;
    const x0 = legacy.x0 + i * cs, z0 = legacy.z0 + j * cs; for (let z = z0; z < z0 + cs; z += ns * .5) for (let x = x0; x < x0 + cs; x += ns * .5) { const [a, b] = worldToCell(x, z); if (a >= 0 && b >= 0 && a < FOG_CELLS && b < FOG_CELLS) out[b * FOG_CELLS + a] = 1; } }
  const state = { cells: out, pois: new Set(), waystones: new Set() };
  return Object.assign(serializeMapState(state), { pois: saved.pois, waystones: saved.waystones });
}
