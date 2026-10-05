'use strict';

/* ============================================================
   WORLD — mapa em tiles (biomas), objetos (árvores, pedras...)
   e grade espacial para consultas rápidas
   ============================================================ */
const T = { GRASS: 0, DARK: 1, DIRT: 2, SAND: 3, WATER: 4, FLOWER: 5, STONE: 6 };

const World = {
  ts: CFG.TILE,
  cols: CFG.MAP_COLS,
  rows: CFG.MAP_ROWS,
  w: CFG.TILE * CFG.MAP_COLS,
  h: CFG.TILE * CFG.MAP_ROWS,
  tiles: null,
  cells: [],
  gx: 0,
  gy: 0,
  _solids: [],

  spawn: { x: 1600, y: 1152 },
  pond: { x: 2300, y: 680, rx: 270, ry: 170 },

  // Caminhos de terra saindo do ponto inicial
  paths: [
    [[1600, 1152], [1400, 1000], [1150, 820], [880, 640]],
    [[1600, 1152], [1850, 1000], [2000, 900]],
    [[1600, 1152], [1350, 1350], [1000, 1550], [760, 1650]],
    [[1600, 1152], [1850, 1350], [2150, 1550], [2450, 1700]]
  ],

  build() {
    this.tiles = new Uint8Array(this.cols * this.rows);
    for (let ty = 0; ty < this.rows; ty++) {
      for (let tx = 0; tx < this.cols; tx++) {
        this.tiles[ty * this.cols + tx] = this._biome((tx + 0.5) * this.ts, (ty + 0.5) * this.ts);
      }
    }
    this.gx = Math.ceil(this.w / CFG.CELL);
    this.gy = Math.ceil(this.h / CFG.CELL);
    this.cells = [];
    for (let i = 0; i < this.gx * this.gy; i++) this.cells.push({ flat: [], tall: [], solid: [] });
    this._solids = [];
    this._populate();
  },

  // ---------- Biomas ----------
  _pathDist(px, py) {
    let best = 1e9;
    for (const p of this.paths) {
      for (let i = 0; i < p.length - 1; i++) {
        const d = U.distSeg(px, py, p[i][0], p[i][1], p[i + 1][0], p[i + 1][1]);
        if (d < best) best = d;
      }
    }
    return best;
  },

  _biome(px, py) {
    const n = U.fbm(px / 220, py / 220, 3) - 0.5;
    const wx = px + n * 300, wy = py + n * 300;
    const el = function (cx, cy, rx, ry) {
      const a = (wx - cx) / rx, b = (wy - cy) / ry;
      return a * a + b * b;
    };

    const P = this.pond;
    const pe = el(P.x, P.y, P.rx, P.ry);
    if (pe < 1) return T.WATER;
    if (pe < 1.45) return T.SAND;

    const th = 26 + U.noise(px / 50, py / 50, 5) * 14;
    if (this._pathDist(px, py) < th) return T.DIRT;
    if (Math.hypot(px - this.spawn.x, py - this.spawn.y) < 95 + n * 90) return T.DIRT;

    if (el(650, 1650, 430, 300) < 1) return T.STONE;
    if (el(2600, 1750, 780, 600) < 1) return T.DARK;
    if (el(850, 600, 460, 300) < 1) return T.FLOWER;
    return T.GRASS;
  },

  tileAt(px, py) {
    const tx = U.clamp(Math.floor(px / this.ts), 0, this.cols - 1);
    const ty = U.clamp(Math.floor(py / this.ts), 0, this.rows - 1);
    return this.tiles[ty * this.cols + tx];
  },

  isWater(px, py) { return this.tileAt(px, py) === T.WATER; },

  // Colisão com água considerando o raio do jogador
  blocked(x, y, r) {
    const k = r * 0.8;
    return this.isWater(x, y) || this.isWater(x + k, y) || this.isWater(x - k, y) ||
           this.isWater(x, y + k * 0.7) || this.isWater(x, y - k * 0.7);
  },

  // ---------- Objetos ----------
  _populate() {
    const rnd = U.rng(20240);
    const sc = (o) => this._scatter(rnd, o);
    const G = T.GRASS, D = T.DARK, F = T.FLOWER, S = T.STONE, SA = T.SAND;

    // Árvores comuns
    sc({ count: 80, tries: 1800, biomes: [G, F], make: (x, y, r) => {
      const s = 0.85 + r() * 0.45;
      return { type: 'tree', x, y, s, r: 9 * s, gap: 34, ph: r() * 6.28, pal: (r() * 9 | 0) === 0 ? 3 : (r() * 3 | 0), fade: 1 };
    } });

    // Pinheiros na floresta escura
    sc({ count: 170, tries: 3500, biomes: [D], make: (x, y, r) => {
      const s = 0.8 + r() * 0.55;
      return { type: 'pine', x, y, s, r: 8 * s, gap: 26, ph: r() * 6.28, fade: 1 };
    } });

    // Pedras na área rochosa
    const rock = (x, y, r, rmin, rspan, hmul, hadd, gap) => {
      const rad = rmin + r() * rspan;
      const pts = [];
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * 6.2832 + (r() - 0.5) * 0.5;
        const rj = 0.85 + r() * 0.25;
        pts.push([Math.cos(a) * rj, Math.sin(a) * rj * 0.72]);
      }
      const warm = r() < 0.3;
      return { type: 'rock', x, y, r: rad, h: rad * (hmul + r() * 0.9) + hadd, gap, pts, hue: warm ? 32 : 210, sat: warm ? 10 : 5 };
    };
    sc({ count: 50, tries: 2000, biomes: [S], make: (x, y, r) => rock(x, y, r, 12, 24, 0.6, 0, 6) });
    // Pedras altas (precisam de pulo para subir)
    sc({ count: 5, tries: 1000, biomes: [S], make: (x, y, r) => { const o = rock(x, y, r, 24, 8, 0, 56, 20); o.h = 56 + r() * 14; return o; } });
    // Pedras pequenas espalhadas
    sc({ count: 22, tries: 1500, biomes: [G, D, F, SA], make: (x, y, r) => rock(x, y, r, 7, 8, 0.6, 0, 12) });

    // Arbustos (sem colisão)
    sc({ count: 70, tries: 1200, biomes: [G, D, F], make: (x, y, r) => ({ type: 'bush', x, y, r: 0, s: 0.8 + r() * 0.5, berries: r() < 0.3 }) });

    // Tufos de grama (decoração plana, balançam com o vento)
    const tuftCol = {}; tuftCol[G] = '#3f8c35'; tuftCol[D] = '#2a6532'; tuftCol[F] = '#4a9c3c'; tuftCol[S] = '#5f8d4f';
    sc({ count: 900, tries: 4000, biomes: [G, D, F, S], make: (x, y, r, b) => ({ type: 'tuft', x, y, r: 0, flat: true, s: 0.7 + r() * 0.6, col: tuftCol[b], ph: r() * 6.28 }) });

    // Flores
    const fcol = ['#ffffff', '#ffe14d', '#ff7fa8', '#b48cff', '#ff9a4d'];
    const flower = (x, y, r) => ({ type: 'flower', x, y, r: 0, flat: true, s: 0.8 + r() * 0.5, col: fcol[r() * fcol.length | 0], ph: r() * 6.28 });
    sc({ count: 500, tries: 3000, biomes: [F], make: flower });
    sc({ count: 80, tries: 1500, biomes: [G], make: flower });
  },

  _scatter(rnd, opt) {
    let n = 0;
    for (let i = 0; i < opt.tries && n < opt.count; i++) {
      const x = 40 + rnd() * (this.w - 80);
      const y = 40 + rnd() * (this.h - 80);
      const b = this.tileAt(x, y);
      if (opt.biomes.indexOf(b) < 0) continue;
      if (Math.hypot(x - this.spawn.x, y - this.spawn.y) < 100) continue;
      const o = opt.make(x, y, rnd, b);
      if (o.r > 0 && !this._free(o)) continue;
      o.sy = o.y;
      this._add(o);
      n++;
    }
  },

  _free(o) {
    const list = this._solids;
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      if (Math.hypot(o.x - p.x, o.y - p.y) < o.r + p.r + (o.gap || 0)) return false;
    }
    return true;
  },

  _add(o) {
    const C = CFG.CELL;
    const cell = this.cells[((o.x / C) | 0) + ((o.y / C) | 0) * this.gx];
    if (o.flat) cell.flat.push(o); else cell.tall.push(o);
    if (o.r > 0) { cell.solid.push(o); this._solids.push(o); }
  },

  // Objetos dentro de um retângulo (separados em planos e em pé)
  query(x0, y0, x1, y1, flat, tall) {
    flat.length = 0; tall.length = 0;
    const C = CFG.CELL;
    const cx0 = Math.max(0, Math.floor(x0 / C)), cx1 = Math.min(this.gx - 1, Math.floor(x1 / C));
    const cy0 = Math.max(0, Math.floor(y0 / C)), cy1 = Math.min(this.gy - 1, Math.floor(y1 / C));
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const cell = this.cells[cx + cy * this.gx];
        let i, o;
        for (i = 0; i < cell.flat.length; i++) {
          o = cell.flat[i];
          if (o.x >= x0 && o.x <= x1 && o.y >= y0 && o.y <= y1) flat.push(o);
        }
        for (i = 0; i < cell.tall.length; i++) {
          o = cell.tall[i];
          if (o.x >= x0 && o.x <= x1 && o.y >= y0 && o.y <= y1) tall.push(o);
        }
      }
    }
  },

  // Objetos sólidos perto de um ponto (para colisão)
  solidsNear(x, y, out) {
    out.length = 0;
    const C = CFG.CELL;
    const ci = Math.floor(x / C), cj = Math.floor(y / C);
    for (let j = cj - 1; j <= cj + 1; j++) {
      for (let i = ci - 1; i <= ci + 1; i++) {
        if (i < 0 || j < 0 || i >= this.gx || j >= this.gy) continue;
        const s = this.cells[i + j * this.gx].solid;
        for (let k = 0; k < s.length; k++) out.push(s[k]);
      }
    }
  }
};
