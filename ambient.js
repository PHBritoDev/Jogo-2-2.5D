
'use strict';

/* ============================================================
   AMBIENT — céu, nuvens, sombras de nuvens, vento visual,
   folhas, pólen, poeira e faíscas de impacto (combate)
   ============================================================ */
const Ambient = {
  wind: 0.6,
  cloudT: 0,
  clouds: [],
  high: [],
  streaks: [],
  leaves: [],
  dust: [],
  sparks: [],
  shadows: [],

  init(cam) {
    const r = U.rng(77);

    // Nuvens de fundo (duas camadas com parallax)
    for (let i = 0; i < 18; i++) {
      const far = i < 9;
      this.clouds.push({
        x: r() * 3000, y: r() * 1600,
        s: far ? 0.5 + r() * 0.4 : 0.8 + r() * 0.7,
        par: far ? 0.18 : 0.38,
        v: far ? 3 + r() * 3 : 7 + r() * 7,
        a: far ? 0.6 : 0.9
      });
    }

    // Nuvens altas e translúcidas passando por cima do mapa
    for (let i = 0; i < 4; i++) {
      this.high.push({ x: r() * 3000, y: r() * 1600, s: 1.6 + r() * 0.9, par: 1.35, v: 26 + r() * 20, a: 0.22 });
    }

    // Sombras de nuvens no chão
    for (let i = 0; i < 7; i++) {
      this.shadows.push({ x: r() * World.w, y: r() * World.h, rx: 150 + r() * 160, ry: 80 + r() * 70, v: 8 + r() * 8 });
    }

    // Riscos de vento
    for (let i = 0; i < 14; i++) {
      this.streaks.push({ x: r() * cam.viewW, y: r() * cam.viewH, len: 20 + r() * 40, sp: 0.7 + r() * 0.8 });
    }

    // Folhas e pólen
    const leafCols = ['#8cc84b', '#e4c13c', '#d9822b', '#6fb04a'];
    for (let i = 0; i < 52; i++) {
      const leaf = i % 3 !== 0;
      this.leaves.push({
        x: cam.x + r() * cam.viewW, y: cam.y + r() * cam.viewH,
        leaf, k: 0.6 + r() * 0.8, ph: r() * 6.28,
        rot: r() * 6.28, vr: (r() - 0.5) * 4,
        sz: leaf ? 2.6 + r() * 1.6 : 1.1 + r() * 0.8,
        col: leaf ? leafCols[r() * leafCols.length | 0] : '#fff6c8'
      });
    }
  },

  update(dt, t, cam) {
    // Vento com rajadas
    const hush = Climate.state === 'fog' || Climate.state === 'fogging' ||
      Climate.state === 'night' || Climate.state === 'nightfall';
    const breeze = 0.55 + 0.3 * Math.sin(t * 0.35) +
      0.15 * Math.sin(t * 1.1 + 1.7) + 0.1 * Math.sin(t * 2.7);
    this.wind = hush ? U.clamp(breeze * 0.42, 0.08, 0.46) : U.clamp(breeze, 0.15, 1);
    const w = this.wind;
    this.cloudT += dt * (hush ? 0.2 + w * 0.25 : 0.5 + w);

    // Riscos de vento (espaço da tela)
    for (const s of this.streaks) {
      s.x += (60 + 160 * w) * s.sp * dt;
      if (s.x > cam.viewW + s.len) {
        s.x = -s.len;
        s.y = Math.random() * cam.viewH;
      }
    }

    // Folhas e pólen (espaço do mundo, reciclados ao redor da câmera)
    const L = cam.x - 30, TOP = cam.y - 30;
    const SW = cam.viewW + 60, SH = cam.viewH + 60;
    for (const p of this.leaves) {
      if (p.leaf) {
        p.x += (w * 70 * p.k + Math.sin(t * 1.5 + p.ph) * 12) * dt;
        p.y += (16 + Math.cos(t * 1.2 + p.ph) * 22 + w * 8) * dt;
        p.rot += p.vr * dt;
      } else {
        p.x += (w * 22 * p.k + Math.sin(t * 0.9 + p.ph) * 8) * dt;
        p.y += Math.cos(t * 0.7 + p.ph) * 9 * dt;
      }
      p.x = ((p.x - L) % SW + SW) % SW + L;
      p.y = ((p.y - TOP) % SH + SH) % SH + TOP;
    }

    // Poeira
    for (let i = this.dust.length - 1; i >= 0; i--) {
      const d = this.dust[i];
      d.age += dt;
      if (d.age >= d.life) {
        this.dust[i] = this.dust[this.dust.length - 1];
        this.dust.pop();
        continue;
      }
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vx *= 0.92;
    }

    // Faíscas de impacto (vida curta, limite de 70 no total)
    const damp = Math.exp(-4 * dt);
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.age += dt;
      if (s.age >= s.life) {
        this.sparks[i] = this.sparks[this.sparks.length - 1];
        this.sparks.pop();
        continue;
      }
      s.vy += 520 * dt;
      s.vx *= damp;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
    }
  },

  spawnDust(x, y, n, col, spread) {
    const sp = spread || 1;
    for (let i = 0; i < n; i++) {
      if (this.dust.length > 90) this.dust.shift();
      this.dust.push({
        x: x + (Math.random() - 0.5) * 6, y: y,
        vx: (Math.random() - 0.5) * 60 * sp, vy: -(5 + Math.random() * 22),
        age: 0, life: 0.35 + Math.random() * 0.25,
        r: 2 + Math.random() * 2, col: col
      });
    }
  },

  // Faíscas que saem em todas as direções (impacto, defesa, morte)
  spawnSpark(x, y, n, col) {
    for (let i = 0; i < n; i++) {
      if (this.sparks.length >= 70) this.sparks.shift();
      const a = Math.random() * 6.2832;
      const sp = 60 + Math.random() * 140;
      this.sparks.push({
        x: x, y: y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
        age: 0, life: 0.25 + Math.random() * 0.2,
        r: 1.2 + Math.random() * 1.6, col: col
      });
    }
  },

  // ---------- Desenho (espaço da tela, antes do mundo) ----------
  drawSky(ctx, cam) {
    const g = ctx.createLinearGradient(0, 0, 0, cam.viewH);
    g.addColorStop(0, '#4fa9ec');
    g.addColorStop(1, '#cdeeff');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cam.viewW, cam.viewH);

    const sx = cam.viewW * 0.8, sy = cam.viewH * 0.15;
    const s = ctx.createRadialGradient(sx, sy, 0, sx, sy, 150);
    s.addColorStop(0, 'rgba(255,248,200,0.85)');
    s.addColorStop(1, 'rgba(255,248,200,0)');
    ctx.fillStyle = s;
    ctx.fillRect(sx - 150, sy - 150, 300, 300);
  },

  _cloud(ctx, x, y, s, alpha) {
    const parts = [[-48, 6, 22], [-22, -6, 30], [8, -14, 34], [40, -4, 28], [66, 6, 20], [0, 8, 28]];
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#d6e9fa';
    ctx.beginPath();
    for (const p of parts) {
      ctx.moveTo(x + (p[0]) * s + p[2] * s, y + (p[1] + 6) * s);
      ctx.arc(x + p[0] * s, y + (p[1] + 6) * s, p[2] * s, 0, 6.2832);
    }
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    for (const p of parts) {
      ctx.moveTo(x + p[0] * s + p[2] * s, y + p[1] * s);
      ctx.arc(x + p[0] * s, y + p[1] * s, p[2] * s, 0, 6.2832);
    }
    ctx.fill();
    ctx.globalAlpha = 1;
  },

  _drawCloudList(ctx, cam, list) {
    const SX = cam.viewW + 500, SY = cam.viewH + 260;
    for (const c of list) {
      let x = c.x - cam.x * c.par + this.cloudT * c.v;
      let y = c.y - cam.y * c.par * 0.6;
      x = ((x % SX) + SX) % SX - 250;
      y = ((y % SY) + SY) % SY - 130;
      this._cloud(ctx, x, y, c.s, c.a);
    }
  },

  drawClouds(ctx, cam) { this._drawCloudList(ctx, cam, this.clouds); },
  drawHighClouds(ctx, cam) { this._drawCloudList(ctx, cam, this.high); },

  // ---------- Desenho (espaço do mundo) ----------
  drawCloudShadows(ctx) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, World.w, World.h);
    ctx.clip();
    ctx.fillStyle = 'rgba(15,45,60,0.10)';
    ctx.beginPath();
    for (const s of this.shadows) {
      const span = World.w + s.rx * 2;
      const x = (((s.x + this.cloudT * s.v * 4) % span) + span) % span - s.rx;
      ctx.moveTo(x + s.rx, s.y);
      ctx.ellipse(x, s.y, s.rx, s.ry, 0, 0, 6.2832);
    }
    ctx.fill();
    ctx.restore();
  },

  drawDust(ctx) {
    for (const d of this.dust) {
      const k = d.age / d.life;
      ctx.globalAlpha = (1 - k) * 0.55;
      ctx.fillStyle = d.col;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r * (1 + k), 0, 6.2832);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  },

  drawSparks(ctx) {
    const list = this.sparks;
    if (!list.length) return;
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      const k = s.age / s.life;
      const sz = s.r * 2 * (1 - k * 0.6);
      ctx.globalAlpha = 1 - k;
      ctx.fillStyle = s.col;
      ctx.fillRect(s.x - sz / 2, s.y - sz / 2, sz, sz);
    }
    ctx.globalAlpha = 1;
  },

  drawLeaves(ctx, t) {
    const night = Climate.state === 'night' || Climate.state === 'nightfall';
    for (let i = 0; i < this.leaves.length; i++) {
      const p = this.leaves[i];
      if (night && p.leaf && i % 4 !== 0) continue;
      ctx.fillStyle = night ? (p.leaf ? '#64717b' : '#c0c3bd') : p.col;
      ctx.beginPath();
      if (p.leaf) {
        ctx.ellipse(p.x, p.y, p.sz, p.sz * 0.5, p.rot, 0, 6.2832);
        ctx.globalAlpha = night ? 0.18 : 0.9;
      } else {
        ctx.arc(p.x, p.y, p.sz, 0, 6.2832);
        ctx.globalAlpha = night ? 0.16 : 0.45 + 0.4 * Math.sin(t * 2 + p.ph);
      }
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  },

  // Riscos de vento (espaço da tela, depois do mundo)
  drawStreaks(ctx) {
    if (this.wind < 0.25 || Climate.state === 'fog' || Climate.state === 'fogging' ||
        Climate.state === 'night' || Climate.state === 'nightfall') return;
    ctx.globalAlpha = 0.1 + 0.3 * this.wind;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (const s of this.streaks) {
      ctx.moveTo(s.x, s.y);
      ctx.quadraticCurveTo(s.x + s.len * 0.5, s.y - 3, s.x + s.len, s.y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
};
