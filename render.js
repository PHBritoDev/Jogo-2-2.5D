'use strict';

/* ============================================================
   RENDER — desenha céu, ilha, tiles, objetos e partículas.
   Tudo é desenhado via Canvas 2D (sem imagens externas).
   ============================================================ */
const Render = {
  ctx: null,
  dt: 0,
  tiles: {},
  flat: [],
  tall: [],
  cliff: null,

  init(ctx) {
    this.ctx = ctx;
    this._buildTiles();
    this._buildCliff();
  },

  // ---------- Pré-renderização dos tiles (4 variações por tipo) ----------
  _buildTiles() {
    const PAL = {};
    PAL[T.GRASS]  = { base: '#63b24d', dots: ['#58a643', '#72c05a', '#4e9b3c'] };
    PAL[T.DARK]   = { base: '#2f7a3c', dots: ['#286b34', '#3a8947', '#245f30'] };
    PAL[T.DIRT]   = { base: '#a98a5a', dots: ['#97794c', '#bfa171', '#8c6f45'] };
    PAL[T.SAND]   = { base: '#e6d59c', dots: ['#d6c58c', '#f2e5b4', '#dccb92'] };
    PAL[T.WATER]  = { base: '#2f86c9', dots: ['#2a79b8', '#3c94d4', '#2570ad'] };
    PAL[T.FLOWER] = { base: '#6cbb54', dots: ['#62b04c', '#7fcb64', '#58a643'] };
    PAL[T.STONE]  = { base: '#8d9193', dots: ['#7b7f82', '#a1a5a7', '#6f7376'] };

    const fl = ['#ffffff', '#ffe36b', '#ff8fb1', '#b79bff'];
    const S = 64;

    for (let type = 0; type <= 6; type++) {
      this.tiles[type] = [];
      for (let v = 0; v < 4; v++) {
        const c = document.createElement('canvas');
        c.width = c.height = S;
        const g = c.getContext('2d');
        const r = U.rng(type * 977 + v * 131 + 5);
        const pal = PAL[type];

        g.fillStyle = pal.base;
        g.fillRect(0, 0, S, S);

        // Manchas de cor
        g.globalAlpha = 0.55;
        for (let i = 0; i < 30; i++) {
          g.fillStyle = pal.dots[r() * 3 | 0];
          const sz = 2 + r() * 6;
          g.fillRect(r() * S, r() * S, sz, sz * (0.5 + r() * 0.6));
        }
        g.globalAlpha = 1;

        // Detalhes por tipo
        if (type === T.GRASS || type === T.DARK || type === T.FLOWER) {
          g.lineWidth = 1.6;
          for (let i = 0; i < 8; i++) {
            g.strokeStyle = pal.dots[r() * 3 | 0];
            const x = r() * S, y = 6 + r() * (S - 6);
            g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 4, y - 4 - r() * 4); g.stroke();
          }
        }
        if (type === T.FLOWER) {
          for (let i = 0; i < 4; i++) {
            g.fillStyle = fl[r() * fl.length | 0];
            g.beginPath(); g.arc(r() * S, r() * S, 1.8, 0, 6.2832); g.fill();
          }
        }
        if (type === T.DIRT) {
          g.fillStyle = '#86693f';
          for (let i = 0; i < 5; i++) {
            g.beginPath(); g.ellipse(r() * S, r() * S, 2 + r() * 2, 1.3 + r(), 0, 0, 6.2832); g.fill();
          }
        }
        if (type === T.SAND) {
          g.strokeStyle = '#d3c288'; g.lineWidth = 1.4;
          for (let i = 0; i < 3; i++) {
            const x = r() * S, y = r() * S;
            g.beginPath(); g.arc(x, y, 6 + r() * 6, 3.6, 5.6); g.stroke();
          }
        }
        if (type === T.STONE) {
          g.strokeStyle = '#6a6e71'; g.lineWidth = 1.3;
          for (let i = 0; i < 2; i++) {
            let x = r() * S, y = r() * S;
            g.beginPath(); g.moveTo(x, y);
            for (let j = 0; j < 3; j++) { x += (r() - 0.5) * 16; y += (r() - 0.3) * 12; g.lineTo(x, y); }
            g.stroke();
          }
        }
        this.tiles[type].push(c);
      }
    }
  },

  // Contorno inferior da ilha flutuante
  _buildCliff() {
    const r = U.rng(5), W = World.w, H = World.h;
    const pts = [];
    for (let x = W; x >= 0; x -= 80) {
      const u = x / W;
      const taper = 1 - Math.pow(u * 2 - 1, 2);
      pts.push([x, H + 30 + taper * 250 * (0.8 + r() * 0.4)]);
    }
    this.cliff = pts;
  },

  // ---------- Quadro completo ----------
  frame(dt) {
    const ctx = this.ctx, cam = Camera, t = Game.time;
    this.dt = dt;

    ctx.setTransform(cam.scale, 0, 0, cam.scale, 0, 0);

    // Céu e nuvens (espaço da tela)
    Ambient.drawSky(ctx, cam);
    Ambient.drawClouds(ctx, cam);

    // Câmera "encaixada" nos pixels reais para evitar tremidas
    const cx = Math.round(cam.x * cam.scale) / cam.scale;
    const cy = Math.round(cam.y * cam.scale) / cam.scale;

    ctx.save();
    ctx.translate(-cx, -cy);

    this._drawCliff(ctx);
    this._drawGround(ctx, cx, cy, cam, t);
    Ambient.drawCloudShadows(ctx);

    // Objetos visíveis
    World.query(cx - 60, cy - 20, cx + cam.viewW + 60, cy + cam.viewH + 150, this.flat, this.tall);

    for (let i = 0; i < this.flat.length; i++) this._drawFlat(ctx, this.flat[i], t);

    this.tall.push(Player);
    this.tall.sort(function (a, b) { return a.sy - b.sy; });
    for (let i = 0; i < this.tall.length; i++) {
      const o = this.tall[i];
      switch (o.type) {
        case 'tree':   this._drawTree(ctx, o, t); break;
        case 'pine':   this._drawPine(ctx, o, t); break;
        case 'rock':   this._drawRock(ctx, o); break;
        case 'bush':   this._drawBush(ctx, o); break;
        case 'player': Player.draw(ctx); break;
      }
    }

    Ambient.drawDust(ctx);
    Ambient.drawLeaves(ctx, t);

    ctx.restore();

    // Nuvens altas e vento (por cima de tudo)
    Ambient.drawHighClouds(ctx, cam);
    Ambient.drawStreaks(ctx);
  },

  // ---------- Terreno ----------
  _drawCliff(ctx) {
    const W = World.w, H = World.h;
    const g = ctx.createLinearGradient(0, H, 0, H + 300);
    g.addColorStop(0, '#8a6a42');
    g.addColorStop(1, '#4a3622');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(W, H - 2);
    for (const p of this.cliff) ctx.lineTo(p[0], p[1]);
    ctx.lineTo(0, H - 2);
    ctx.closePath();
    ctx.fill();

    // Veios de rocha
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 1; i < this.cliff.length - 1; i += 2) {
      const p = this.cliff[i];
      ctx.moveTo(p[0], H);
      ctx.lineTo(p[0] + 8, (H + p[1]) / 2);
    }
    ctx.stroke();
  },

  _drawGround(ctx, cx, cy, cam, t) {
    const S = World.ts, cols = World.cols, tiles = World.tiles;
    const x0 = Math.max(0, Math.floor(cx / S));
    const y0 = Math.max(0, Math.floor(cy / S));
    const x1 = Math.min(cols - 1, Math.floor((cx + cam.viewW) / S));
    const y1 = Math.min(World.rows - 1, Math.floor((cy + cam.viewH) / S));

    ctx.beginPath(); // brilhos da água
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const type = tiles[ty * cols + tx];
        const v = (tx * 7 + ty * 13 + ((tx * ty) % 5)) & 3;
        ctx.drawImage(this.tiles[type][v], tx * S, ty * S, S + 1, S + 1);
        if (type === T.WATER) {
          const j = tx * 31 + ty * 17;
          if (j % 3 === 0) {
            const ox = 8 + Math.sin(t * 0.9 + j) * 6;
            const oy = 6 + (j % 5) * 5;
            ctx.moveTo(tx * S + ox, ty * S + oy);
            ctx.lineTo(tx * S + ox + 10, ty * S + oy);
          }
        }
      }
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Borda da ilha
    ctx.fillStyle = '#3b7f33';
    ctx.fillRect(0, World.h - 4, World.w, 4);
  },

  // ---------- Objetos ----------
  _disc(ctx, x, y, r, col) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 6.2832);
    ctx.fill();
  },

  _drawFlat(ctx, o, t) {
    const w = Ambient.wind;
    const sway = Math.sin(t * 2 + o.ph + o.x * 0.01) * w;
    if (o.type === 'tuft') {
      const h = 9 * o.s, bend = sway * 4 + w * 2;
      ctx.strokeStyle = o.col;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let i = -1; i <= 1; i++) {
        const bx = o.x + i * 2.6 * o.s;
        ctx.moveTo(bx, o.y);
        ctx.quadraticCurveTo(bx + i * 1.5 + bend * 0.3, o.y - h * 0.6, bx + i * 2.5 + bend, o.y - h * (1 - Math.abs(i) * 0.2));
      }
      ctx.stroke();
    } else {
      const fx = o.x + sway * 1.5, fy = o.y - 7 * o.s;
      ctx.strokeStyle = '#3b8a3a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(o.x, o.y);
      ctx.lineTo(fx, fy);
      ctx.stroke();
      this._disc(ctx, fx, fy, 2.3 * o.s, o.col);
      this._disc(ctx, fx, fy, 0.9 * o.s, '#e8a600');
    }
  },

  _drawTree(ctx, o, t) {
    const s = o.s, sw = Math.sin(t * 1.7 + o.ph) * Ambient.wind, sx = sw * 4 * s;

    // Some a copa quando o jogador está atrás dela
    let target = 1;
    if (Player.y < o.y && Math.abs(Player.x - o.x) < 40 * s) {
      const hy = Player.y - Player.z;
      if (hy > o.y - 100 * s && hy < o.y - 10 * s) target = 0.45;
    }
    o.fade += (target - o.fade) * Math.min(1, this.dt * 10);

    ctx.fillStyle = 'rgba(15,40,20,0.22)';
    ctx.beginPath(); ctx.ellipse(o.x + 8 * s, o.y + 2, 30 * s, 10 * s, 0, 0, 6.2832); ctx.fill();

    ctx.fillStyle = '#6a4529';
    ctx.fillRect(o.x - 4.5 * s, o.y - 34 * s, 9 * s, 34 * s);
    ctx.fillStyle = '#55371f';
    ctx.fillRect(o.x + 1 * s, o.y - 34 * s, 3.5 * s, 34 * s);

    const PALS = [
      ['#2f7d3a', '#3d9444', '#52ac52', '#74c46a'],
      ['#3a8438', '#4c9c3e', '#68b448', '#8ccb5c'],
      ['#27766a', '#348c7a', '#4aa58c', '#6cc0a4'],
      ['#b4682a', '#cc7f30', '#e0993a', '#f0b856']
    ];
    const p = PALS[o.pal];
    const cx = o.x + sx, cy = o.y - 58 * s;
    if (o.fade < 1) ctx.globalAlpha = o.fade;
    this._disc(ctx, cx, cy + 6 * s, 31 * s, p[0]);
    this._disc(ctx, cx - 12 * s + sx * 0.3, cy - 2 * s, 24 * s, p[1]);
    this._disc(ctx, cx + 13 * s + sx * 0.3, cy - 3 * s, 22 * s, p[1]);
    this._disc(ctx, cx - 5 * s + sx * 0.6, cy - 14 * s, 20 * s, p[2]);
    this._disc(ctx, cx - 9 * s + sx * 0.8, cy - 18 * s, 9 * s, p[3]);
    if (o.fade < 1) ctx.globalAlpha = 1;
  },

  _drawPine(ctx, o, t) {
    const s = o.s, sw = Math.sin(t * 1.5 + o.ph) * Ambient.wind, sx = sw * 3 * s;

    let target = 1;
    if (Player.y < o.y && Math.abs(Player.x - o.x) < 28 * s) {
      const hy = Player.y - Player.z;
      if (hy > o.y - 100 * s && hy < o.y - 10 * s) target = 0.5;
    }
    o.fade += (target - o.fade) * Math.min(1, this.dt * 10);

    ctx.fillStyle = 'rgba(10,30,20,0.25)';
    ctx.beginPath(); ctx.ellipse(o.x + 7 * s, o.y + 2, 24 * s, 8 * s, 0, 0, 6.2832); ctx.fill();

    ctx.fillStyle = '#5a3b22';
    ctx.fillRect(o.x - 3 * s, o.y - 14 * s, 6 * s, 14 * s);

    const cols = ['#1d5232', '#256239', '#2f7647'];
    if (o.fade < 1) ctx.globalAlpha = o.fade;
    for (let i = 0; i < 3; i++) {
      const by = o.y - 10 * s - i * 24 * s;
      const hw = (30 - i * 7) * s;
      ctx.fillStyle = cols[i];
      ctx.beginPath();
      ctx.moveTo(o.x - hw, by);
      ctx.lineTo(o.x + sx * (i + 1) * 0.5, by - 36 * s);
      ctx.lineTo(o.x + hw, by);
      ctx.closePath();
      ctx.fill();
    }
    if (o.fade < 1) ctx.globalAlpha = 1;
  },

  _drawBush(ctx, o) {
    const s = o.s;
    ctx.fillStyle = 'rgba(15,40,20,0.2)';
    ctx.beginPath(); ctx.ellipse(o.x + 3, o.y + 1, 18 * s, 6 * s, 0, 0, 6.2832); ctx.fill();
    this._disc(ctx, o.x - 9 * s, o.y - 8 * s, 11 * s, '#3f8f3a');
    this._disc(ctx, o.x + 8 * s, o.y - 9 * s, 12 * s, '#4aa044');
    this._disc(ctx, o.x, o.y - 14 * s, 12 * s, '#5cb856');
    if (o.berries) {
      this._disc(ctx, o.x - 6 * s, o.y - 12 * s, 1.8, '#d8344a');
      this._disc(ctx, o.x + 6 * s, o.y - 15 * s, 1.8, '#d8344a');
      this._disc(ctx, o.x + 1 * s, o.y - 7 * s, 1.8, '#d8344a');
    }
  },

  _drawRock(ctx, o) {
    const r = o.r, h = o.h, P = o.pts;
    ctx.fillStyle = 'rgba(15,35,20,0.24)';
    ctx.beginPath(); ctx.ellipse(o.x + r * 0.25, o.y + r * 0.12, r * 1.2, r * 0.62, 0, 0, 6.2832); ctx.fill();

    // Camadas empilhadas dão volume (lado escuro embaixo, topo claro)
    const n = Math.max(3, Math.round(h / 4));
    for (let i = 0; i <= n; i++) {
      const tt = i / n, k = 1 - 0.14 * tt, yo = -h * tt;
      ctx.fillStyle = 'hsl(' + o.hue + ',' + o.sat + '%,' + (36 + tt * 24).toFixed(1) + '%)';
      ctx.beginPath();
      for (let j = 0; j < P.length; j++) {
        const px = o.x + P[j][0] * r * k, py = o.y + yo + P[j][1] * r * k;
        if (j) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }

    // Brilho no topo
    ctx.fillStyle = 'hsla(' + o.hue + ',' + o.sat + '%,80%,0.35)';
    ctx.beginPath();
    for (let j = 0; j < P.length; j++) {
      const px = o.x - r * 0.08 + P[j][0] * r * 0.6, py = o.y - h - r * 0.06 + P[j][1] * r * 0.6;
      if (j) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }
};
