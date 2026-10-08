'use strict';

/* ============================================================
   NIGHT SANCTUM — região exterior e instância isolada da jornada
   do Quarto Bispo. A campanha controla descoberta e progressão;
   este módulo cuida apenas da geometria, atmosfera e entrada.
   ============================================================ */
const NightSanctum = {
  bounds: { left: 1580, right: 2410, top: 1650, bottom: 2280 },
  center: { x: 2020, y: 1965 },
  threshold: { x: 2370, y: 1460 },
  ridge: { x: 2150, y: 1780 },
  marker: { x: 1920, y: 1925 },
  outerGate: { x: 2045, y: 2130 },
  order: { x: 3040, y: 385 },
  room: { left: 120, right: 1480, top: 300, bottom: 1320 },
  start: { x: 790, y: 800 },
  exit: { x: 380, y: 1245 },
  returnPoint: { x: 2085, y: 2150 },
  siteInside: false,

  contains(x, y) {
    const b = this.bounds;
    return x >= b.left && x <= b.right && y >= b.top && y <= b.bottom;
  },

  prepare() {
    this.siteInside = false;
    World.clearArea(this.threshold.x, this.threshold.y, 42);
    World.clearArea(this.ridge.x, this.ridge.y, 45);
    World.clearArea(this.marker.x, this.marker.y, 34);
    World.clearArea(this.outerGate.x, this.outerGate.y, 58);
  },

  enterSite() {
    this.siteInside = true;
    Climate.setInterior(true);
    this._placePlayer(this.start.x, this.start.y);
    Camera.snap(Player);
    Sfx.blip();
    Quest.toast('Observatório do Silêncio — as mesas estão prontas, mas o responsável não veio.', 3.5);
  },

  exitSite() {
    this.siteInside = false;
    Climate.setInterior(false);
    this._placePlayer(this.outerGate.x + 38, this.outerGate.y + 22);
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
    if (this.siteInside) {
      this._drawSite(ctx, t);
      return;
    }
    this._drawExterior(ctx, t);
  },

  _drawExterior(ctx, t) {
    const b = this.bounds, c = this.center;
    ctx.save();
    const plateau = ctx.createRadialGradient(c.x, c.y, 65, c.x, c.y, 610);
    plateau.addColorStop(0, 'rgba(41,48,62,.97)');
    plateau.addColorStop(.62, 'rgba(48,56,67,.9)');
    plateau.addColorStop(.86, 'rgba(48,55,64,.48)');
    plateau.addColorStop(1, 'rgba(48,55,64,0)');
    ctx.fillStyle = plateau;
    ctx.fillRect(b.left, b.top, b.right - b.left, b.bottom - b.top);

    // Uma faixa de basalto acompanha o caminho até um platô exposto.
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(13,18,27,.78)';
    ctx.lineWidth = 56;
    ctx.beginPath();
    ctx.moveTo(2520, 1170);
    ctx.quadraticCurveTo(2350, 1430, 2240, 1640);
    ctx.quadraticCurveTo(2180, 1760, 2070, 1880);
    ctx.quadraticCurveTo(1960, 1990, this.outerGate.x, this.outerGate.y);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(91,93,97,.74)';
    ctx.lineWidth = 32;
    ctx.beginPath();
    ctx.moveTo(2520, 1170);
    ctx.quadraticCurveTo(2350, 1430, 2240, 1640);
    ctx.quadraticCurveTo(2180, 1760, 2070, 1880);
    ctx.quadraticCurveTo(1960, 1990, this.outerGate.x, this.outerGate.y);
    ctx.stroke();

    this._drawRocks(ctx, t);
    this._drawWaystones(ctx, t);
    this._drawGate(ctx, t);
    ctx.restore();
  },

  _drawRocks(ctx, t) {
    const rocks = [
      [1708, 1820, 45, 22], [1810, 2148, 62, 27], [1900, 1736, 48, 25],
      [2188, 1982, 54, 29], [2307, 1870, 37, 21], [1725, 2032, 40, 24],
      [2220, 2220, 64, 28], [1954, 2218, 42, 21], [2316, 2132, 40, 24]
    ];
    for (let i = 0; i < rocks.length; i++) {
      const p = rocks[i];
      ctx.fillStyle = 'rgba(0,0,0,.26)';
      ctx.beginPath(); ctx.ellipse(p[0] + 5, p[1] + 7, p[2], p[3] * .46, -.12, 0, 6.2832); ctx.fill();
      ctx.fillStyle = i % 2 ? '#343b45' : '#414650';
      ctx.beginPath();
      ctx.moveTo(p[0] - p[2], p[1] + 3);
      ctx.lineTo(p[0] - p[2] * .64, p[1] - p[3] * .72);
      ctx.lineTo(p[0] - 4, p[1] - p[3]);
      ctx.lineTo(p[0] + p[2] * .5, p[1] - p[3] * .72);
      ctx.lineTo(p[0] + p[2], p[1] + 3);
      ctx.quadraticCurveTo(p[0], p[1] + p[3] * .92, p[0] - p[2], p[1] + 3);
      ctx.fill();
      ctx.strokeStyle = 'rgba(183,193,206,.13)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(p[0] - p[2] * .42, p[1] - p[3] * .42);
      ctx.lineTo(p[0] - 2, p[1] - p[3] * .86);
      ctx.lineTo(p[0] + p[2] * .42, p[1] - p[3] * .38); ctx.stroke();
    }

    // Grãos de cinza cruzam o platô sem virar uma cortina sobre a cena.
    ctx.fillStyle = 'rgba(200,207,214,.18)';
    for (let i = 0; i < 18; i++) {
      const x = 1640 + ((i * 97 + t * 7) % 710);
      const y = 1710 + ((i * 61 + Math.sin(t * .23 + i) * 13) % 520);
      ctx.beginPath(); ctx.arc(x, y, 1 + (i % 3) * .35, 0, 6.2832); ctx.fill();
    }
  },

  _drawWaystones(ctx, t) {
    const stones = [[2307, 1518], [2185, 1778], [1952, 1960]];
    for (let i = 0; i < stones.length; i++) {
      const p = stones[i], pulse = .45 + Math.sin(t * .8 + i * 1.7) * .08;
      ctx.fillStyle = 'rgba(0,0,0,.28)';
      ctx.beginPath(); ctx.ellipse(p[0], p[1] + 8, 17, 6, 0, 0, 6.2832); ctx.fill();
      ctx.fillStyle = '#55575b';
      ctx.beginPath(); ctx.moveTo(p[0] - 8, p[1] + 3); ctx.lineTo(p[0] - 6, p[1] - 22);
      ctx.lineTo(p[0], p[1] - 29); ctx.lineTo(p[0] + 8, p[1] - 20);
      ctx.lineTo(p[0] + 9, p[1] + 3); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(189,174,130,' + pulse.toFixed(2) + ')';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(p[0], p[1] - 18); ctx.lineTo(p[0], p[1] - 4);
      ctx.moveTo(p[0] - 4, p[1] - 11); ctx.lineTo(p[0] + 4, p[1] - 11); ctx.stroke();
    }
  },

  _drawGate(ctx, t) {
    const x = this.outerGate.x, y = this.outerGate.y;
    const discovered = typeof Campaign !== 'undefined' && Campaign.flags.bishop4EntryFound;
    const glow = discovered ? .22 + .06 * Math.sin(t * 1.6) : .07;
    ctx.fillStyle = 'rgba(0,0,0,.42)';
    ctx.beginPath(); ctx.ellipse(x, y + 9, 70, 18, 0, 0, 6.2832); ctx.fill();
    ctx.fillStyle = '#292d35';
    ctx.fillRect(x - 47, y - 73, 19, 80);
    ctx.fillRect(x + 28, y - 66, 19, 73);
    ctx.fillStyle = '#464952';
    ctx.beginPath();
    ctx.moveTo(x - 55, y - 63); ctx.lineTo(x - 42, y - 89);
    ctx.lineTo(x - 15, y - 101); ctx.lineTo(x + 14, y - 95);
    ctx.lineTo(x + 56, y - 68); ctx.lineTo(x + 47, y - 53);
    ctx.lineTo(x + 10, y - 76); ctx.lineTo(x - 22, y - 78);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#111722';
    ctx.fillRect(x - 28, y - 62, 55, 69);
    ctx.strokeStyle = 'rgba(171,158,127,.62)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y - 64, 16, .15, 3.03); ctx.stroke();
    ctx.fillStyle = 'rgba(169,190,207,' + glow.toFixed(2) + ')';
    ctx.beginPath(); ctx.ellipse(x, y - 26, 28, 39, 0, 0, 6.2832); ctx.fill();
    if (discovered) {
      ctx.fillStyle = '#d5d1bd';
      ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('OBSERVATÓRIO DO SILÊNCIO', x, y - 112);
      ctx.strokeStyle = 'rgba(191,183,155,.8)';
      ctx.beginPath(); ctx.arc(x, y - 62, 7, 0, 6.2832); ctx.stroke();
      ctx.fillStyle = '#ded3b0'; ctx.fillText('IV', x, y - 58);
    }
  },

  _drawSite(ctx, t) {
    const r = this.room, cx = (r.left + r.right) * .5;
    const cy = (r.top + r.bottom) * .5;
    ctx.save();
    ctx.fillStyle = '#090d15';
    ctx.fillRect(0, 0, World.w, World.h);
    ctx.fillStyle = '#242a33';
    ctx.fillRect(r.left, r.top, r.right - r.left, r.bottom - r.top);
    const floor = ctx.createLinearGradient(r.left, r.top, r.right, r.bottom);
    floor.addColorStop(0, '#414550');
    floor.addColorStop(.5, '#333945');
    floor.addColorStop(1, '#1c222d');
    ctx.fillStyle = floor;
    ctx.fillRect(r.left + 24, r.top + 24, r.right - r.left - 48, r.bottom - r.top - 48);

    ctx.strokeStyle = 'rgba(184,195,203,.13)';
    ctx.lineWidth = 1;
    for (let x = r.left + 45; x < r.right - 20; x += 72) {
      ctx.beginPath(); ctx.moveTo(x, r.top + 26); ctx.lineTo(x, r.bottom - 26); ctx.stroke();
    }
    for (let y = r.top + 48; y < r.bottom - 20; y += 66) {
      ctx.beginPath(); ctx.moveTo(r.left + 25, y); ctx.lineTo(r.right - 25, y); ctx.stroke();
    }

    // Instrumentos astronômicos cobertos e mesas abandonadas; corredor central livre.
    this._drawArmillary(ctx, 360, 470, t, .74);
    this._drawArmillary(ctx, 1225, 1000, t, .46);
    this._drawDesk(ctx, 1135, 515);
    this._drawLamp(ctx, 230, 1000, t);
    this._drawLamp(ctx, 1330, 765, t);

    ctx.strokeStyle = 'rgba(174,164,133,.25)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(cx, cy + 30, 118, 58, -.08, 0, 6.2832); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 78, cy + 30); ctx.lineTo(cx + 78, cy + 30);
    ctx.moveTo(cx, cy - 26); ctx.lineTo(cx, cy + 86); ctx.stroke();
    ctx.fillStyle = 'rgba(190,176,140,.45)';
    ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('IV', cx, cy + 34);

    ctx.fillStyle = '#131923';
    ctx.fillRect(this.exit.x - 48, r.bottom - 47, 96, 35);
    ctx.strokeStyle = '#9d9277'; ctx.lineWidth = 3;
    ctx.strokeRect(this.exit.x - 48, r.bottom - 47, 96, 35);
    ctx.fillStyle = '#d0c7ae'; ctx.font = 'bold 10px sans-serif';
    ctx.fillText('SAÍDA', this.exit.x, r.bottom - 24);
    this._drawWalls(ctx, r.left + 14, r.top + 18, r.bottom - r.top - 36);
    this._drawWalls(ctx, r.right - 14, r.top + 18, r.bottom - r.top - 36);
    ctx.restore();
  },

  _drawArmillary(ctx, x, y, t, scale) {
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
    ctx.fillStyle = 'rgba(0,0,0,.34)';
    ctx.beginPath(); ctx.ellipse(0, 5, 47, 12, 0, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = '#7c786d'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.ellipse(0, -31, 36, 26, Math.sin(t * .18) * .05, 0, 6.2832); ctx.stroke();
    ctx.strokeStyle = '#a99a73'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, -31, 22, 31, .55, 0, 6.2832); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-39, -31); ctx.lineTo(39, -31);
    ctx.moveTo(0, -57); ctx.lineTo(0, -5); ctx.stroke();
    ctx.fillStyle = '#494944'; ctx.fillRect(-45, -7, 90, 10);
    ctx.restore();
  },

  _drawDesk(ctx, x, y) {
    ctx.fillStyle = 'rgba(0,0,0,.32)'; ctx.fillRect(x - 4, y + 13, 82, 11);
    ctx.fillStyle = '#48433c'; ctx.fillRect(x, y - 4, 76, 19);
    ctx.fillStyle = '#77705d'; ctx.fillRect(x - 4, y - 9, 84, 7);
    ctx.fillStyle = '#c4b99e'; ctx.fillRect(x + 10, y - 14, 28, 9);
    ctx.strokeStyle = '#766647'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x + 14, y - 11); ctx.lineTo(x + 34, y - 11);
    ctx.moveTo(x + 49, y - 11); ctx.lineTo(x + 67, y - 11); ctx.stroke();
  },

  _drawLamp(ctx, x, y, t) {
    const glow = .2 + Math.sin(t * 1.2 + x) * .035;
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath(); ctx.ellipse(x, y + 5, 17, 6, 0, 0, 6.2832); ctx.fill();
    ctx.fillStyle = '#292c31'; ctx.fillRect(x - 7, y - 46, 14, 47);
    ctx.fillStyle = '#77715e'; ctx.fillRect(x - 13, y - 50, 26, 8);
    ctx.fillStyle = 'rgba(225,192,123,' + glow.toFixed(2) + ')';
    ctx.beginPath(); ctx.arc(x, y - 48, 13, 0, 6.2832); ctx.fill();
    ctx.fillStyle = '#d7bd87'; ctx.beginPath(); ctx.arc(x, y - 48, 3, 0, 6.2832); ctx.fill();
  },

  _drawWalls(ctx, x, y, h) {
    ctx.fillStyle = '#303640';
    ctx.fillRect(x - 13, y, 27, h);
    ctx.fillStyle = '#555b63';
    ctx.fillRect(x - 18, y - 8, 37, 14);
    ctx.fillStyle = 'rgba(7,10,15,.72)';
    ctx.fillRect(x - 5, y + 32, 10, h - 55);
  }
};
