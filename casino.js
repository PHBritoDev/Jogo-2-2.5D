'use strict';

/* ============================================================
   CASINO — local secreto da Galáxia 1.
   A descoberta e a entrada são etapas da Campaign; esta peça cuida
   apenas do espaço, dos limites e da apresentação visual do local.
   ============================================================ */
const Casino = {
  door: { x: 2630, y: 790 },
  clue: { x: 2525, y: 890 },
  room: { left: 260, right: 1360, top: 360, bottom: 1260 },
  start: { x: 810, y: 1080 },
  dealer: { x: 810, y: 575 },
  bossStart: { x: 960, y: 835 },
  exit: { x: 430, y: 1215 },
  inside: false,
  discovered: false,
  _baseBlocked: null,

  init() {
    this.inside = false;
    this.discovered = false;
    // Só abre o espaço da porta. A sala é um cenário instanciado e não
    // precisa apagar a floresta inteira que existe sob ela.
    World.clearArea(this.door.x, this.door.y, 48);

    if (!this._baseBlocked) {
      this._baseBlocked = World.blocked;
      const self = this;
      World.blocked = function (x, y, r) {
        if (typeof BishopDimension !== 'undefined' && BishopDimension.isBattleActive()) {
          return BishopDimension.blocked(x, y, r);
        }
        const bounds = World.activeInstanceBounds();
        if (bounds) {
          if (x - r < bounds.left || x + r > bounds.right ||
              y - r < bounds.top || y + r > bounds.bottom) return true;
          // O piso desenhado da sala substitui o terreno e a água do mapa.
          return false;
        }
        return self._baseBlocked.call(World, x, y, r);
      };
    }
  },

  enter() {
    this.inside = true;
    this.discovered = true;
    Climate.setInterior(true);
    this._placePlayer(this.start.x, this.start.y);
    Camera.snap(Player);
    Sfx.blip();
    Quest.toast('Cassino Secreto — alguém observa cada moeda que entra.', 3.5);
  },

  exit() {
    this.inside = false;
    Climate.setInterior(false);
    this._placePlayer(this.door.x + 32, this.door.y + 18);
    Camera.snap(Player);
  },

  _placePlayer(x, y) {
    Player.x = x; Player.y = y; Player.z = 0;
    Player.vx = Player.vy = Player.vz = 0;
    Player.kx = Player.ky = 0;
    Player.fx = 1; Player.fy = 0;
    Player.onGround = true;
    Player.floor = 0;
    Player.sy = y;
  },

  drawGround(ctx, t) {
    if (this.inside) {
      ctx.fillStyle = '#120e17';
      ctx.fillRect(0, 0, World.w, World.h);
      this._drawInterior(ctx, t);
    }

    const step = Campaign.step;
    if (!this.inside && Campaign.flags.casinoClue &&
        step && step.type === 'casinoFind' && !this.discovered) {
      const pulse = 0.65 + Math.sin(t * 4) * 0.2;
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = '#ffe066';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(this.clue.x, this.clue.y, 16 + Math.sin(t * 3) * 3, 9, 0, 0, 6.2832);
      ctx.stroke();
      this._coin(ctx, this.clue.x, this.clue.y - 5, 1.2);
      ctx.restore();
    }

  },

  _coin(ctx, x, y, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = '#f6cb49';
    ctx.strokeStyle = '#815619';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(0, 0, 5, 3, 0, 0, 6.2832); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff0a0';
    ctx.fillRect(-0.6, -2, 1.2, 4);
    ctx.restore();
  },

  _drawInterior(ctx, t) {
    const r = this.room;
    const cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2;
    ctx.save();

    // Salão amplo em mármore escuro, molduras de latão e luz quente.
    ctx.fillStyle = '#170f16';
    ctx.fillRect(r.left - 18, r.top - 20, r.right - r.left + 36, r.bottom - r.top + 40);
    ctx.fillStyle = '#6f442c';
    ctx.fillRect(r.left, r.top, r.right - r.left, r.bottom - r.top);
    const floor = ctx.createLinearGradient(r.left, r.top, r.right, r.bottom);
    floor.addColorStop(0, '#30242a');
    floor.addColorStop(.48, '#604436');
    floor.addColorStop(1, '#241a25');
    ctx.fillStyle = floor;
    ctx.fillRect(r.left + 12, r.top + 12, r.right - r.left - 24, r.bottom - r.top - 24);

    // Brilho e placas do piso de pedra polida.
    ctx.strokeStyle = 'rgba(226,190,127,.2)';
    ctx.lineWidth = 1;
    for (let x = r.left + 28; x < r.right - 15; x += 68) {
      ctx.beginPath(); ctx.moveTo(x, r.top + 14); ctx.lineTo(x, r.bottom - 14); ctx.stroke();
    }
    for (let y = r.top + 26; y < r.bottom - 12; y += 58) {
      ctx.beginPath(); ctx.moveTo(r.left + 14, y); ctx.lineTo(r.right - 14, y); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,221,167,.075)';
    ctx.beginPath(); ctx.moveTo(r.left + 40, r.top + 80); ctx.lineTo(cx - 100, r.bottom - 35);
    ctx.lineTo(cx - 26, r.bottom - 35); ctx.lineTo(r.left + 210, r.top + 80); ctx.fill();

    // Tapete cerimonial conduz o olhar da entrada ao salão principal.
    ctx.fillStyle = '#481a2c';
    ctx.fillRect(cx - 112, r.top + 118, 224, r.bottom - r.top - 150);
    ctx.strokeStyle = '#d0a84d';
    ctx.lineWidth = 4;
    ctx.strokeRect(cx - 102, r.top + 128, 204, r.bottom - r.top - 170);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255,220,135,.72)';
    for (let y = r.top + 146; y < r.bottom - 38; y += 48) {
      ctx.beginPath(); ctx.moveTo(cx - 96, y); ctx.lineTo(cx + 96, y); ctx.stroke();
      this._casinoDiamond(ctx, cx, y + 22, 7);
    }

    // Paredes altas com painéis, arcos e colunas.
    ctx.fillStyle = '#211722';
    ctx.fillRect(r.left + 16, r.top + 18, r.right - r.left - 32, 72);
    ctx.fillStyle = '#8e632e';
    ctx.fillRect(r.left + 18, r.top + 87, r.right - r.left - 36, 5);
    for (let i = 0; i < 7; i++) {
      const ax = r.left + 92 + i * 152;
      ctx.fillStyle = '#311e2a';
      ctx.beginPath();
      ctx.moveTo(ax - 43, r.top + 88); ctx.lineTo(ax - 43, r.top + 50);
      ctx.quadraticCurveTo(ax, r.top + 2, ax + 43, r.top + 50);
      ctx.lineTo(ax + 43, r.top + 88); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#bd914a'; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(ax - 43, r.top + 88); ctx.lineTo(ax - 43, r.top + 50);
      ctx.quadraticCurveTo(ax, r.top + 2, ax + 43, r.top + 50);
      ctx.lineTo(ax + 43, r.top + 88); ctx.stroke();
      this._casinoColumn(ctx, ax - 59, r.top + 91, 11, 92);
      this._casinoColumn(ctx, ax + 59, r.top + 91, 11, 92);
      ctx.fillStyle = '#8b283c';
      ctx.fillRect(ax - 35, r.top + 39, 70, 48);
      ctx.fillStyle = 'rgba(248,194,96,.15)';
      ctx.fillRect(ax - 31, r.top + 43, 62, 40);
    }

    // Lustres suspensos e reflexos âmbar no mármore.
    this._drawChandelier(ctx, cx, r.top + 156, t, 1.12);
    this._drawChandelier(ctx, cx - 300, r.top + 210, t + 1, .72);
    this._drawChandelier(ctx, cx + 300, r.top + 210, t + 2, .72);

    // Mesas de jogo decorativas, sem acrescentar minijogos.
    this._drawTable(ctx, cx - 300, r.top + 365, 74, 27);
    this._drawTable(ctx, cx + 300, r.top + 365, 74, 27);
    this._drawTable(ctx, cx - 315, r.top + 560, 65, 24);
    this._drawTable(ctx, cx + 315, r.top + 560, 65, 24);
    this._drawTable(ctx, cx, r.bottom - 72, 76, 28);

    // Balcão do anfitrião e cofre ao fundo do salão.
    ctx.fillStyle = '#21151d';
    ctx.fillRect(this.dealer.x - 180, this.dealer.y - 57, 360, 46);
    ctx.fillStyle = '#582b32';
    ctx.fillRect(this.dealer.x - 174, this.dealer.y - 52, 348, 35);
    ctx.fillStyle = '#d4a24b';
    ctx.fillRect(this.dealer.x - 184, this.dealer.y - 14, 368, 6);
    ctx.fillStyle = '#cfaa63';
    ctx.fillRect(cx - 80, r.top + 28, 160, 7);
    ctx.fillStyle = '#261923';
    ctx.fillRect(cx - 61, r.top + 35, 122, 45);
    ctx.strokeStyle = '#d3ae63'; ctx.lineWidth = 2;
    ctx.strokeRect(cx - 61, r.top + 35, 122, 45);
    ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
    ctx.fillStyle = '#f0ce7b'; ctx.fillText('COFRE DA CASA', cx, r.top + 62);
    this._drawDealer(ctx, t);

    // Porta de saída, mantida visualmente atrás do jogador.
    ctx.fillStyle = '#241721';
    ctx.fillRect(this.exit.x - 30, r.bottom - 35, 60, 30);
    ctx.strokeStyle = '#d1a24a';
    ctx.lineWidth = 3;
    ctx.strokeRect(this.exit.x - 30, r.bottom - 35, 60, 30);
    ctx.restore();
  },

  _casinoColumn(ctx, x, y, w, h) {
    ctx.fillStyle = '#38242a';
    ctx.fillRect(x - w / 2, y, w, h);
    ctx.fillStyle = '#b88943';
    ctx.fillRect(x - w / 2 - 4, y, w + 8, 6);
    ctx.fillRect(x - w / 2 - 4, y + h - 7, w + 8, 7);
    ctx.strokeStyle = 'rgba(255,220,145,.4)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, y + 9); ctx.lineTo(x, y + h - 10); ctx.stroke();
  },

  _casinoDiamond(ctx, x, y, size) {
    ctx.fillStyle = 'rgba(220,177,82,.55)';
    ctx.beginPath(); ctx.moveTo(x, y - size); ctx.lineTo(x + size, y);
    ctx.lineTo(x, y + size); ctx.lineTo(x - size, y); ctx.closePath(); ctx.fill();
  },

  _drawChandelier(ctx, x, y, t, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    const glow = .28 + .08 * Math.sin(t * 2);
    ctx.fillStyle = 'rgba(255,193,89,' + glow.toFixed(3) + ')';
    ctx.beginPath(); ctx.ellipse(0, 8, 82, 52, 0, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = '#bd914a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, -70); ctx.lineTo(0, -13);
    ctx.moveTo(-44, -18); ctx.lineTo(44, -18);
    ctx.moveTo(-44, -18); ctx.lineTo(-66, 10); ctx.lineTo(66, 10); ctx.lineTo(44, -18);
    ctx.stroke();
    for (let i = -2; i <= 2; i++) {
      const lx = i * 24, flicker = .8 + .2 * Math.sin(t * 7 + i);
      ctx.fillStyle = 'rgba(255,226,151,' + flicker.toFixed(2) + ')';
      ctx.beginPath(); ctx.arc(lx, i === 0 ? -26 : 2, 5, 0, 6.2832); ctx.fill();
      ctx.fillStyle = 'rgba(255,209,105,.2)';
      ctx.beginPath(); ctx.arc(lx, i === 0 ? -26 : 2, 14, 0, 6.2832); ctx.fill();
    }
    ctx.fillStyle = '#d8b56a';
    ctx.beginPath(); ctx.arc(0, -72, 5, 0, 6.2832); ctx.fill();
    ctx.restore();
  },

  _drawTable(ctx, x, y, rx, ry) {
    ctx.fillStyle = 'rgba(18,12,17,0.3)';
    ctx.beginPath(); ctx.ellipse(x, y + 7, rx + 5, ry + 4, 0, 0, 6.2832); ctx.fill();
    ctx.fillStyle = '#452b23';
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 6.2832); ctx.fill();
    ctx.fillStyle = '#6a3b49';
    ctx.beginPath(); ctx.ellipse(x, y - 2, rx - 5, ry - 4, 0, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = '#d0a044';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x, y - 2, rx - 5, ry - 4, 0, 0, 6.2832); ctx.stroke();
  },

  _drawDealer(ctx, t) {
    const x = this.dealer.x, y = this.dealer.y - 16;
    ctx.save();
    ctx.translate(x, y + Math.sin(t * 2) * 0.6);
    ctx.fillStyle = '#241b25';
    ctx.beginPath(); ctx.ellipse(0, -11, 10, 12, 0, 0, 6.2832); ctx.fill();
    ctx.fillStyle = '#773d65';
    ctx.beginPath(); ctx.moveTo(-10, -12); ctx.lineTo(0, -27); ctx.lineTo(10, -12); ctx.lineTo(13, 3); ctx.lineTo(-13, 3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d6aa62';
    ctx.fillRect(-10, -12, 20, 3);
    ctx.fillStyle = '#d4b58b';
    ctx.beginPath(); ctx.arc(0, -31, 7, 0, 6.2832); ctx.fill();
    ctx.fillStyle = '#21171f';
    ctx.fillRect(-9, -38, 18, 3);
    ctx.fillRect(-5, -44, 10, 7);
    ctx.fillStyle = '#f2c654';
    ctx.fillRect(-5, -37, 10, 2);
    ctx.restore();
  }
};
