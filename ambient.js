
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
    const cosmic = Climate.state === 'night' || Climate.state === 'nightfall';
    const quality = window.GraphicsQuality;
    const effects = quality ? quality.get('effects') : 1;
    const g = ctx.createLinearGradient(0, 0, 0, cam.viewH);
    if (cosmic) {
      g.addColorStop(0, '#030612');
      g.addColorStop(0.48, '#10112c');
      g.addColorStop(1, '#172a31');
    } else {
      g.addColorStop(0, '#4fa9ec');
      g.addColorStop(1, '#cdeeff');
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cam.viewW, cam.viewH);

    if (cosmic) {
      // Estrelas determinísticas: sem Math.random por frame nem objetos extras.
      const starCount = Math.max(28, Math.min(128, Math.round(84 * effects)));
      for (let i = 0; i < starCount; i++) {
        const seed = i * 127.1 + 311.7;
        const nx = (Math.sin(seed) * 43758.5453) % 1;
        const ny = (Math.sin(seed * 1.73) * 24634.6345) % 1;
        const x = ((Math.abs(nx) * cam.viewW) + i * 0.17) % cam.viewW;
        const y = Math.abs(ny) * cam.viewH * 0.72;
        const radius = i % 11 === 0 ? 1.35 : 0.55 + (i % 3) * 0.22;
        ctx.globalAlpha = i % 4 === 0 ? 0.82 : 0.48;
        ctx.fillStyle = i % 7 === 0 ? '#b8eaff' : '#fff4d1';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 6.2832);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Cortinas de aurora com intensidade ligada ao perfil gráfico.
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const auroraBands = Math.max(1, Math.min(5, Math.round(3 * effects)));
      const palettes = [
        ['rgba(63,255,166,0.43)', 'rgba(79,219,255,0.33)'],
        ['rgba(63,224,220,0.40)', 'rgba(144,111,255,0.34)'],
        ['rgba(126,101,255,0.34)', 'rgba(73,241,195,0.27)']
      ];
      for (let band = 0; band < auroraBands; band++) {
        const y = cam.viewH * (0.13 + band * 0.11);
        const phase = this.cloudT * 0.14 + band * 1.7;
        const drift = Math.sin(phase) * cam.viewW * 0.045;
        const sway = Math.sin(phase * 0.68 + 1.2) * cam.viewW * 0.028;
        const height = Math.max(88, cam.viewH * 0.25);
        const pulse = 0.96 + Math.sin(this.cloudT * 0.42 + band * 1.4) * 0.04;
        const palette = palettes[band % palettes.length];
        const glow = ctx.createLinearGradient(0, y - height * 0.75, 0, y + height * 0.95);
        glow.addColorStop(0, 'rgba(35,255,177,0)');
        glow.addColorStop(0.22, palette[0]);
        glow.addColorStop(0.54, palette[1]);
        glow.addColorStop(1, 'rgba(35,255,177,0)');
        ctx.fillStyle = glow;
        ctx.globalAlpha = pulse;
        ctx.beginPath();
        ctx.moveTo(-20, y + height * 0.16);
        ctx.bezierCurveTo(cam.viewW * 0.18, y - height * 0.50 + drift, cam.viewW * 0.42, y + height * 0.66, cam.viewW * 0.68, y + height * 0.04 + sway);
        ctx.bezierCurveTo(cam.viewW * 0.84, y - height * 0.28, cam.viewW * 0.96, y + height * 0.34 + drift, cam.viewW + 20, y - height * 0.08);
        ctx.lineTo(cam.viewW + 20, y + height * 0.80);
        ctx.bezierCurveTo(cam.viewW * 0.72, y + height * 0.46, cam.viewW * 0.40, y + height * 0.92, -20, y + height * 0.68);
        ctx.closePath();
        ctx.fill();

        // Uma borda fina e poucas cortinas verticais dão volume sem blur ou partículas.
        ctx.globalAlpha = pulse * 0.76;
        ctx.strokeStyle = band % 2 === 0 ? 'rgba(181,255,222,0.48)' : 'rgba(185,184,255,0.45)';
        ctx.lineWidth = effects < 0.75 ? 1 : 1.5;
        ctx.beginPath();
        ctx.moveTo(-10, y + height * 0.2);
        ctx.bezierCurveTo(cam.viewW * 0.2, y - height * 0.28 + drift, cam.viewW * 0.47, y + height * 0.38, cam.viewW * 0.73, y + height * 0.06 + sway);
        ctx.bezierCurveTo(cam.viewW * 0.86, y - height * 0.12, cam.viewW * 0.96, y + height * 0.26, cam.viewW + 10, y - height * 0.02);
        ctx.stroke();
        if (effects >= 0.55) {
          const streamers = effects < 0.75 ? 4 : Math.min(6, Math.round(effects * 4));
          ctx.globalAlpha = pulse * 0.72;
          ctx.lineWidth = effects < 0.8 ? 1 : 1.5;
          for (let i = 0; i < streamers; i++) {
            const travel = this.cloudT * 2.6;
            const x = (((i + 0.5) * cam.viewW / streamers + drift * 0.42 + travel) % cam.viewW + cam.viewW) % cam.viewW;
            const drop = height * (0.45 + (i % 3) * 0.12);
            const bend = Math.sin(phase + i * 1.9) * cam.viewW * 0.012;
            ctx.strokeStyle = i % 2 ? 'rgba(117,255,204,0.39)' : 'rgba(141,202,255,0.34)';
            ctx.beginPath();
            ctx.moveTo(x, y + height * 0.12);
            ctx.bezierCurveTo(x + bend, y + drop * 0.3, x - bend * 0.7, y + drop * 0.72, x + bend * 0.45, y + drop);
            ctx.stroke();
          }
        }
      }
      ctx.restore();

      if (effects >= 0.55) {
        const nebula = ctx.createRadialGradient(cam.viewW * 0.72, cam.viewH * 0.28, 4, cam.viewW * 0.72, cam.viewH * 0.28, cam.viewW * 0.42);
        nebula.addColorStop(0, 'rgba(105,72,190,0.16)');
        nebula.addColorStop(1, 'rgba(105,72,190,0)');
        ctx.fillStyle = nebula;
        ctx.fillRect(0, 0, cam.viewW, cam.viewH);
      }
      return;
    }

    const sx = cam.viewW * 0.8, sy = cam.viewH * 0.15;
    const s = ctx.createRadialGradient(sx, sy, 0, sx, sy, 150);
    s.addColorStop(0, 'rgba(255,248,200,0.85)');
    s.addColorStop(1, 'rgba(255,248,200,0)');
    ctx.fillStyle = s;
    ctx.fillRect(sx - 150, sy - 150, 300, 300);
  },

  // Luz rebatida no chão durante a noite: poucos gradientes e sem sombras dinâmicas.
  drawNightLighting(ctx, cam, t) {
    if ((Climate.state !== 'night' && Climate.state !== 'nightfall') || Climate.indoor) return;
    const quality = window.GraphicsQuality;
    const effects = quality ? quality.get('effects') : 1;
    if (effects < 0.55) return;
    const x = cam.x, y = cam.y, w = cam.viewW, h = cam.viewH;
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgba(5,12,34,0.10)';
    ctx.fillRect(x, y, w, h);
    ctx.globalCompositeOperation = 'screen';

    const reflected = ctx.createLinearGradient(x, y + h * 0.36, x, y + h);
    reflected.addColorStop(0, 'rgba(53,166,255,0)');
    reflected.addColorStop(0.58, 'rgba(58,172,229,0.035)');
    reflected.addColorStop(1, 'rgba(61,255,178,0.15)');
    ctx.fillStyle = reflected;
    ctx.fillRect(x, y + h * 0.30, w, h * 0.70);

    const radius = Math.min(190, Math.max(115, w * 0.18));
    if (typeof Player !== 'undefined' && Number.isFinite(Player.x) && Number.isFinite(Player.y) &&
        Player.x + radius >= x && Player.x - radius <= x + w &&
        Player.y + radius >= y && Player.y - radius <= y + h) {
      this._drawNightPool(ctx, Player.x, Player.y, radius, 'rgba(86,255,192,0.22)');
    }
    if (effects >= 0.8 && typeof BishopBoss !== 'undefined' && BishopBoss.alpha > 0 &&
        Number.isFinite(BishopBoss.x) && Number.isFinite(BishopBoss.y) &&
        BishopBoss.x + 170 >= x && BishopBoss.x - 170 <= x + w &&
        BishopBoss.y + 170 >= y && BishopBoss.y - 170 <= y + h) {
      this._drawNightPool(ctx, BishopBoss.x, BishopBoss.y, 170, 'rgba(170,105,255,0.22)');
    }

    const beams = effects < 0.8 ? 1 : 2;
    for (let i = 0; i < beams; i++) {
      const center = x + w * (0.3 + i * 0.4) + Math.sin(t * 0.08 + i * 2.1) * w * 0.015;
      const top = y + h * (0.32 + i * 0.07);
      const beam = ctx.createLinearGradient(center, top, center, y + h);
      beam.addColorStop(0, 'rgba(110,221,255,0)');
      beam.addColorStop(0.46, 'rgba(120,231,231,0.024)');
      beam.addColorStop(1, 'rgba(119,255,190,0)');
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(center - 3, top);
      ctx.lineTo(center + 3, top);
      ctx.lineTo(center + w * 0.07, y + h);
      ctx.lineTo(center - w * 0.08, y + h);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  },

  _drawNightPool(ctx, px, py, radius, color) {
    const glow = ctx.createRadialGradient(px, py, 0, px, py, radius);
    glow.addColorStop(0, color);
    glow.addColorStop(0.42, 'rgba(91,204,255,0.075)');
    glow.addColorStop(1, 'rgba(91,204,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(px - radius, py - radius, radius * 2, radius * 2);
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
    const quality = window.GraphicsQuality;
    const shadowLevel = quality ? quality.get('shadowQuality') : 3;
    if (shadowLevel <= 0) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, World.w, World.h);
    ctx.clip();
    ctx.fillStyle = 'rgba(15,45,60,' + (0.025 + shadowLevel * 0.018).toFixed(3) + ')';
    ctx.beginPath();
    const shadowCount = Math.ceil(this.shadows.length * (0.42 + shadowLevel * 0.145));
    for (let i = 0; i < shadowCount; i++) {
      const s = this.shadows[i];
      const span = World.w + s.rx * 2;
      const x = (((s.x + this.cloudT * s.v * 4) % span) + span) % span - s.rx;
      ctx.moveTo(x + s.rx, s.y);
      ctx.ellipse(x, s.y, s.rx, s.ry, 0, 0, 6.2832);
    }
    ctx.fill();
    ctx.restore();
  },

  drawDust(ctx) {
    const quality = window.GraphicsQuality;
    const density = quality ? quality.get('particles') : 1;
    const stride = Math.max(1, Math.ceil(1 / Math.max(0.2, density)));
    for (let i = 0; i < this.dust.length; i += stride) {
      const d = this.dust[i];
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
    const quality = window.GraphicsQuality;
    const density = quality ? quality.get('particles') : 1;
    const stride = Math.max(1, Math.ceil(1 / Math.max(0.2, density)));
    for (let i = 0; i < list.length; i += stride) {
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
    const quality = window.GraphicsQuality;
    const density = quality ? quality.get('particles') : 1;
    const stride = Math.max(1, Math.ceil(1 / Math.max(0.2, density)));
    for (let i = 0; i < this.leaves.length; i += stride) {
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
    const quality = window.GraphicsQuality;
    if (quality && quality.get('effects') < 0.55) return;
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
