/**
 * MOD 186 — Mapa com névoa de guerra e abrigos de viagem rápida (regras puras, testadas em map3d.test.mjs).
 * O mapa só mostra o que o jogador já viu; abrigos precisam ser encontrados e registrados
 * explicitamente antes de aparecerem no menu de viagem.
 */
export const MAP_BOUNDS = { x0: -105, z0: -169, size: 210 };
export const FOG_CELLS = 48;
export const REVEAL_RADIUS = 24;

export const MAP_POIS = [
  { id: 'inicio', name: 'Despertar', x: 0, z: 6, kind: 'camp' },
  { id: 'vila', name: 'Vila da Clareira', x: -12.2, z: -44.5, kind: 'village' },
  { id: 'clareira', name: 'Clareira do Tronco', x: 0, z: -29, kind: 'clearing' },
  { id: 'gaiolas', name: 'Gaiolas da Trilha', x: .1, z: -56.1, kind: 'danger' },
  { id: 'lago', name: 'Lago Escuro', x: -27, z: -88, kind: 'water' },
  { id: 'ruina', name: 'Ruína Esquecida', x: -18.5, z: -52, kind: 'secret', secret: true },
  { id: 'portal', name: 'Portal de Valério', x: 44, z: -119, kind: 'portal', revealRadius: 34 }
];

export const WAYSTONES = [
  { id: 'abrigo-vila', name: 'Abrigo da Vila', x: -4.6, z: -36.5 },
  { id: 'abrigo-mata', name: 'Abrigo da Mata Funda', x: 4.6, z: -70 },
  { id: 'abrigo-sope', name: 'Abrigo do Sopé', x: 9.5, z: -92.5 }
];

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
    for (const id of saved.pois || []) if (MAP_POIS.some(p => p.id === id)) pois.add(id);
    for (const id of saved.waystones || []) if (WAYSTONES.some(w => w.id === id)) waystones.add(id);
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
export function discoverPois(state, x, z, { secretsFound = {} } = {}) {
  const found = [];
  for (const p of MAP_POIS) {
    if (state.pois.has(p.id)) continue;
    if (p.secret && !secretsFound[p.id]) continue;
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
