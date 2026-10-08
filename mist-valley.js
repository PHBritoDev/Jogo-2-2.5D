'use strict';

/* ============================================================
   MIST VALLEY — região exterior, atmosfera e arena instanciada do
   antigo posto de medição. Descobertas e progressão ficam na campanha.
   ============================================================ */
const MistValley = {
  bounds: { left: 2520, right: 3190, top: 80, bottom: 850 },
  center: { x: 2860, y: 465 },
  threshold: { x: 2770, y: 720 },
  outerCheckpoint: { x: 2890, y: 575 },
  outerGate: { x: 3020, y: 355 },
  room: { left: 150, right: 1450, top: 300, bottom: 1280 },
  start: { x: 740, y: 885 },
  exit: { x: 390, y: 1212 },
  bossStart: { x: 825, y: 745 },
  returnPoint: { x: 3054, y: 377 },
  siteInside: false,

  contains(x, y) {
    const b = this.bounds;
    return x >= b.left && x <= b.right && y >= b.top && y <= b.bottom;
  },

  prepare() {
    this.siteInside = false;
    // Clareiras curtas para os dois primeiros encontros, fora da região.
    World.clearArea(2045, 1190, 28);
    World.clearArea(2190, 1275, 28);
    World.clearArea(this.threshold.x, this.threshold.y, 38);
    World.clearArea(this.outerCheckpoint.x, this.outerCheckpoint.y, 40);
    World.clearArea(this.outerGate.x, this.outerGate.y, 52);
  },

  enterSite() {
    this.siteInside = true;
    Climate.setInterior(true);
    this._placePlayer(this.start.x, this.start.y);
    Camera.snap(Player);
    Sfx.blip();
    Quest.toast('Posto de Medição — as marcas no piso formam um terceiro selo.', 3.6);
  },

  exitSite() {
    this.siteInside = false;
    Climate.setInterior(false);
    this._placePlayer(this.outerGate.x + 34, this.outerGate.y + 22);
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
    const b = this.bounds;
    ctx.save();

    // O vale entra no terreno em manchas irregulares, sem uma borda retangular.
    const ground = ctx.createRadialGradient(
      this.center.x, this.center.y, 45,
      this.center.x, this.center.y, 510
    );
    ground.addColorStop(0, 'rgba(41,61,61,.91)');
    ground.addColorStop(.58, 'rgba(54,70,68,.77)');
    ground.addColorStop(.88, 'rgba(60,75,72,.35)');
    ground.addColorStop(1, 'rgba(60,75,72,0)');
    ctx.fillStyle = ground;
    ctx.fillRect(b.left, b.top, b.right - b.left, b.bottom - b.top);

    // Solo enpoçado, ilhas de turfa e valas rasas.
    this._drawPool(ctx, 2678, 342, 98, 42, -.24);
    this._drawPool(ctx, 2803, 531, 72, 31, .12);
    this._drawPool(ctx, 2918, 741, 119, 37, -.1);
    this._drawPool(ctx, 3121, 535, 66, 28, .18);
    this._drawPool(ctx, 2740, 177, 69, 25, .08);

    // Caminho de terra antiga e passarelas: deixam a rota legível sem fechá-la.
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(30,43,41,.46)';
    ctx.lineWidth = 44;
    ctx.beginPath();
    ctx.moveTo(2580, 930); ctx.quadraticCurveTo(2700, 845, 2770, 720);
    ctx.quadraticCurveTo(2825, 655, 2890, 575);
    ctx.quadraticCurveTo(2950, 490, 3020, 355);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(111,106,80,.58)';
    ctx.lineWidth = 26;
    ctx.beginPath();
    ctx.moveTo(2580, 930); ctx.quadraticCurveTo(2700, 845, 2770, 720);
    ctx.quadraticCurveTo(2825, 655, 2890, 575);
    ctx.quadraticCurveTo(2950, 490, 3020, 355);
    ctx.stroke();
    this._drawBoardwalk(ctx);
    this._drawFootprints(ctx);
    this._drawReeds(ctx, t);
    this._drawOldMarkers(ctx, t);
    this._drawEntrance(ctx, t);
    ctx.restore();
  },

  _drawPool(ctx, x, y, rx, ry, rot) {
    ctx.fillStyle = 'rgba(10,24,28,.72)';
    ctx.beginPath(); ctx.ellipse(x, y + 4, rx + 5, ry + 4, rot, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(48,76,80,.78)';
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(166,180,170,.22)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(x - 4, y - 2, rx * .68, ry * .43, rot, .2, 2.6); ctx.stroke();
  },

  _drawBoardwalk(ctx) {
    const sections = [
      [2702, 807, 2781, 706],
      [2815, 668, 2871, 597],
      [2914, 548, 2973, 448]
    ];
    for (const s of sections) {
      const dx = s[2] - s[0], dy = s[3] - s[1];
      const len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len;
      ctx.strokeStyle = 'rgba(26,32,30,.7)';
      ctx.lineWidth = 34;
      ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.lineTo(s[2], s[3]); ctx.stroke();
      ctx.strokeStyle = '#68583e';
      ctx.lineWidth = 25;
      ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.lineTo(s[2], s[3]); ctx.stroke();
      ctx.strokeStyle = 'rgba(173,148,99,.52)';
      ctx.lineWidth = 2;
      for (let d = 7; d < len; d += 15) {
        const x = s[0] + dx * d / len, y = s[1] + dy * d / len;
        ctx.beginPath();
        ctx.moveTo(x - nx * 10, y - ny * 10);
        ctx.lineTo(x + nx * 10, y + ny * 10);
        ctx.stroke();
      }
    }
  },

  _drawFootprints(ctx) {
    const marks = [
      [2635, 891, -.5], [2662, 869, -.5], [2703, 838, -.55],
      [2761, 759, -.35], [2851, 623, -.62], [2928, 514, -.5]
    ];
    ctx.fillStyle = 'rgba(24,30,27,.28)';
    for (const p of marks) {
      ctx.beginPath(); ctx.ellipse(p[0], p[1], 3.2, 5.5, p[2], 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(p[0] + 7, p[1] - 4, 3.2, 5.5, p[2], 0, Math.PI * 2); ctx.fill();
    }
  },

  _drawReeds(ctx, t) {
    const clusters = [
      [2607, 269], [2732, 610], [2848, 348], [2872, 760],
      [2961, 703], [3101, 680], [3141, 414], [2815, 171],
      [2672, 533], [3053, 236], [2928, 250], [2602, 714]
    ];
    const sway = Math.sin(t * .75) * 2.2;
    ctx.lineWidth = 2;
    for (let i = 0; i < clusters.length; i++) {
      const p = clusters[i];
      const count = 3 + i % 3;
      ctx.strokeStyle = i % 2 ? 'rgba(105,128,105,.74)' : 'rgba(129,137,104,.7)';
      for (let j = 0; j < count; j++) {
        const x = p[0] + j * 5 - count * 2.5;
        const h = 13 + ((i * 7 + j * 5) % 12);
        ctx.beginPath();
        ctx.moveTo(x, p[1]);
        ctx.quadraticCurveTo(x + sway * .4, p[1] - h * .6, x + sway + (j - 1) * 2, p[1] - h);
        ctx.stroke();
      }
    }
  },

  _drawOldMarkers(ctx, t) {
    // Postes, caixas de ferramentas e uma balança de medição abandonada.
    const posts = [
      [2648, 502, -13], [2851, 438, 9], [2940, 675, -8], [3117, 325, 11]
    ];
    for (let i = 0; i < posts.length; i++) {
      const p = posts[i];
      ctx.fillStyle = 'rgba(0,0,0,.26)';
      ctx.beginPath(); ctx.ellipse(p[0] + 5, p[1] + 4, 15, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.save();
      ctx.translate(p[0], p[1]);
      ctx.rotate(p[2] * Math.PI / 180);
      ctx.fillStyle = '#493f31';
      ctx.fillRect(-3, -28, 6, 29);
      ctx.fillStyle = '#766443';
      ctx.fillRect(-12, -30, 24, 10);
      ctx.strokeStyle = 'rgba(202,174,112,.55)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-7, -25); ctx.lineTo(6, -25); ctx.stroke();
      ctx.restore();
    }

    const pulse = .26 + Math.sin(t * 1.7) * .035;
    ctx.fillStyle = 'rgba(200,155,76,' + pulse.toFixed(2) + ')';
    ctx.beginPath(); ctx.ellipse(2850, 470, 16, 7, -.2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(174,146,95,.8)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(2835, 466); ctx.lineTo(2865, 466); ctx.moveTo(2850, 452); ctx.lineTo(2850, 480); ctx.stroke();

    // Tábua de registro e um recipiente de moedas, ambos quase cobertos pelo lodo.
    ctx.fillStyle = 'rgba(27,29,26,.35)';
    ctx.fillRect(2927, 581, 33, 15);
    ctx.fillStyle = '#62533b';
    ctx.fillRect(2930, 577, 27, 12);
    ctx.strokeStyle = 'rgba(194,176,137,.5)';
    ctx.beginPath(); ctx.moveTo(2935, 581); ctx.lineTo(2950, 581); ctx.moveTo(2935, 585); ctx.lineTo(2946, 585); ctx.stroke();
    ctx.fillStyle = '#9e7834';
    ctx.beginPath(); ctx.ellipse(2965, 598, 7, 3.5, -.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d3ab56';
    ctx.beginPath(); ctx.ellipse(2965, 596, 5, 2.5, -.2, 0, Math.PI * 2); ctx.fill();
  },

  _drawEntrance(ctx, t) {
    const x = this.outerGate.x, y = this.outerGate.y;
    const discovered = typeof Campaign !== 'undefined' && Campaign.flags.bishop3EntryFound;
    const pulse = .32 + .1 * Math.sin(t * 2.1);
    ctx.fillStyle = 'rgba(0,0,0,.38)';
    ctx.beginPath(); ctx.ellipse(x, y + 8, 64, 18, 0, 0, Math.PI * 2); ctx.fill();

    // Arco de pedra do posto, afundado de um lado e parcialmente tomado por raízes.
    ctx.fillStyle = '#343b38';
    ctx.fillRect(x - 42, y - 58, 18, 64);
    ctx.fillRect(x + 24, y - 46, 18, 52);
    ctx.fillStyle = '#50554d';
    ctx.beginPath();
    ctx.moveTo(x - 49, y - 48); ctx.lineTo(x - 39, y - 73);
    ctx.lineTo(x - 9, y - 82); ctx.lineTo(x + 18, y - 72);
    ctx.lineTo(x + 48, y - 52); ctx.lineTo(x + 39, y - 40);
    ctx.lineTo(x + 11, y - 56); ctx.lineTo(x - 16, y - 62);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#182020';
    ctx.fillRect(x - 22, y - 43, 45, 49);
    ctx.strokeStyle = 'rgba(161,137,88,.54)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x + 1, y - 51, 14, .25, 2.85); ctx.stroke();

    ctx.fillStyle = 'rgba(195,148,75,' + (discovered ? .32 + pulse : .1).toFixed(2) + ')';
    ctx.beginPath(); ctx.ellipse(x, y - 6, 25, 34, 0, 0, Math.PI * 2); ctx.fill();
    if (discovered) {
      ctx.fillStyle = '#d2bd8d';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('POSTO DE MEDIÇÃO', x, y - 91);
      ctx.strokeStyle = 'rgba(206,169,98,.64)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y - 48, 8, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#e2bb6e';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText('III', x, y - 45);
    }
  },

  drawMistForeground(ctx, t) {
    if (Climate.state !== 'fog' && Climate.state !== 'fogging') return;
    const inside = this.siteInside;
    if (!inside && !this.contains(Player.x, Player.y)) return;
    ctx.save();
    const transition = Climate.transition
      ? Climate.transition.elapsed / Climate.transition.duration : 1;
    const mistAlpha = Climate.state === 'fogging' ? .07 + .11 * transition : .19;
    ctx.globalAlpha = Math.max(.055, Math.min(.2, mistAlpha));
    const offsets = inside
      ? [[440, 880, 118, 17], [1010, 635, 92, 14]]
      : [[2730, 690, 96, 14], [2940, 505, 128, 19], [3110, 355, 84, 13]];
    for (let i = 0; i < offsets.length; i++) {
      const p = offsets[i];
      const drift = Math.sin(t * .13 + i * 1.9) * 22;
      const breathe = .78 + Math.sin(t * .31 + i * 2.2) * .12;
      const lobes = [
        [0, 0, 1, 1],
        [-.42, 5, .58, .74],
        [.39, -4, .66, .82]
      ];
      for (let j = 0; j < lobes.length; j++) {
        const l = lobes[j], x = p[0] + drift + p[2] * l[0], y = p[1] + l[1];
        const rx = p[2] * l[2], ry = p[3] * l[3] * breathe;
        const grad = ctx.createRadialGradient(x, y, 2, x, y, rx);
        grad.addColorStop(0, 'rgba(146,171,173,.22)');
        grad.addColorStop(.48, 'rgba(132,157,161,.08)');
        grad.addColorStop(1, 'rgba(127,151,156,0)');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.ellipse(x, y, rx, ry, -.025 + i * .02, 0, Math.PI * 2); ctx.fill();
      }
    }

    // Pontos de luz espaçados sugerem lanternas distantes, sem virar chuva de partículas.
    const lights = inside
      ? [[310, 972], [1280, 835]]
      : [[2675, 670], [2888, 522], [3050, 372]];
    for (let i = 0; i < lights.length; i++) {
      const p = lights[i], pulse = .26 + .13 * Math.sin(t * .72 + i * 2.4);
      const x = p[0] + Math.sin(t * .16 + i) * 8;
      const y = p[1] + Math.cos(t * .21 + i * 1.5) * 5;
      const glow = ctx.createRadialGradient(x, y, 0, x, y, 15);
      glow.addColorStop(0, 'rgba(202,173,112,' + pulse.toFixed(3) + ')');
      glow.addColorStop(1, 'rgba(202,173,112,0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(x, y, 15, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(225,203,153,' + (pulse * .8).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(x, y, 1.35, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  },

  _drawSite(ctx, t) {
    const r = this.room;
    const cx = (r.left + r.right) / 2;
    const cy = (r.top + r.bottom) / 2;
    ctx.save();
    ctx.fillStyle = '#101717';
    ctx.fillRect(0, 0, World.w, World.h);
    ctx.fillStyle = '#27302d';
    ctx.fillRect(r.left, r.top, r.right - r.left, r.bottom - r.top);
    const floor = ctx.createLinearGradient(r.left, r.top, r.right, r.bottom);
    floor.addColorStop(0, '#3c4540');
    floor.addColorStop(.46, '#4a4b41');
    floor.addColorStop(1, '#252e2b');
    ctx.fillStyle = floor;
    ctx.fillRect(r.left + 24, r.top + 24, r.right - r.left - 48, r.bottom - r.top - 48);

    // Lajes, infiltrações e marcas de ferramentas sugerem um posto usado por gente.
    ctx.strokeStyle = 'rgba(179,187,165,.12)';
    ctx.lineWidth = 1;
    for (let x = r.left + 50; x < r.right - 20; x += 78) {
      ctx.beginPath(); ctx.moveTo(x, r.top + 26); ctx.lineTo(x, r.bottom - 26); ctx.stroke();
    }
    for (let y = r.top + 48; y < r.bottom - 20; y += 64) {
      ctx.beginPath(); ctx.moveTo(r.left + 25, y); ctx.lineTo(r.right - 25, y); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(14,24,23,.65)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(520, 487); ctx.lineTo(544, 523); ctx.lineTo(535, 553);
    ctx.moveTo(1200, 1060); ctx.lineTo(1172, 1081); ctx.lineTo(1187, 1118);
    ctx.moveTo(749, 1010); ctx.lineTo(780, 989); ctx.lineTo(791, 951);
    ctx.stroke();

    // Ferramentas e arquivos encostados às paredes. O centro fica livre.
    this._drawShelf(ctx, 255, 428, 1);
    this._drawShelf(ctx, 1260, 1040, -1);
    this._drawDesk(ctx, 1125, 491);
    this._drawLantern(ctx, 310, 972, t);
    this._drawLantern(ctx, 1280, 835, t);

    // Marca de medição no piso: uma pista visual, não uma arena nem um chefe.
    const pulse = .29 + .06 * Math.sin(t * 1.4);
    ctx.strokeStyle = 'rgba(187,151,91,' + pulse.toFixed(2) + ')';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(cx + 30, cy + 58, 76, 36, -.08, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 15, cy + 58); ctx.lineTo(cx + 75, cy + 58); ctx.stroke();
    ctx.fillStyle = 'rgba(184,145,80,.34)';
    ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('III', cx + 30, cy + 62);

    // Porta de saída, sem qualquer apresentação do Bispo.
    ctx.fillStyle = '#171f1d';
    ctx.fillRect(this.exit.x - 50, r.bottom - 48, 100, 36);
    ctx.strokeStyle = '#9a865d';
    ctx.lineWidth = 3;
    ctx.strokeRect(this.exit.x - 50, r.bottom - 48, 100, 36);
    ctx.fillStyle = '#d1c19b';
    ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('SAÍDA', this.exit.x, r.bottom - 25);

    this._drawRoomWalls(ctx, r.left + 14, r.top + 18, r.bottom - r.top - 36, 0);
    this._drawRoomWalls(ctx, r.right - 14, r.top + 18, r.bottom - r.top - 36, 1);
    ctx.restore();
  },

  _drawShelf(ctx, x, y, flip) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(flip, 1);
    ctx.fillStyle = 'rgba(0,0,0,.28)';
    ctx.fillRect(-4, 2, 104, 14);
    ctx.fillStyle = '#4b4436';
    ctx.fillRect(0, -38, 92, 38);
    ctx.fillStyle = '#746448';
    ctx.fillRect(-4, -41, 102, 7);
    ctx.fillRect(4, -20, 84, 4);
    ctx.fillStyle = '#b9aa84';
    ctx.fillRect(12, -34, 18, 12);
    ctx.fillRect(43, -34, 21, 12);
    ctx.fillRect(68, -34, 13, 12);
    ctx.strokeStyle = 'rgba(31,28,23,.7)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(17, -30); ctx.lineTo(25, -30); ctx.moveTo(47, -30); ctx.lineTo(60, -30); ctx.stroke();
    ctx.restore();
  },

  _drawDesk(ctx, x, y) {
    ctx.fillStyle = 'rgba(0,0,0,.28)';
    ctx.fillRect(x - 4, y + 14, 74, 10);
    ctx.fillStyle = '#594a36';
    ctx.fillRect(x, y - 5, 68, 18);
    ctx.fillStyle = '#8a7048';
    ctx.fillRect(x - 3, y - 9, 74, 7);
    ctx.fillStyle = '#c3b48d';
    ctx.fillRect(x + 11, y - 14, 27, 9);
    ctx.strokeStyle = '#6d5639';
    ctx.beginPath(); ctx.moveTo(x + 15, y - 11); ctx.lineTo(x + 33, y - 11); ctx.stroke();
    ctx.fillStyle = '#9b7531';
    ctx.beginPath(); ctx.ellipse(x + 54, y - 11, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
  },

  _drawLantern(ctx, x, y, t) {
    const glow = .14 + .045 * Math.sin(t * 2.4 + x);
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath(); ctx.ellipse(x + 5, y + 3, 19, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#554b39';
    ctx.fillRect(x - 2, y - 42, 4, 43);
    ctx.fillStyle = '#786542';
    ctx.fillRect(x - 10, y - 51, 20, 12);
    ctx.fillStyle = 'rgba(226,185,104,' + glow.toFixed(2) + ')';
    ctx.beginPath(); ctx.arc(x, y - 45, 25, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d4a951';
    ctx.fillRect(x - 3, y - 48, 6, 6);
  },

  _drawRoomWalls(ctx, x, y, h, side) {
    ctx.fillStyle = '#1b2422';
    ctx.fillRect(x - 9, y, 32, h);
    ctx.fillStyle = '#555448';
    for (let i = 0; i < 5; i++) {
      const yy = y + 38 + i * (h / 5);
      ctx.fillRect(x + (side ? -2 : 5), yy, 19, 9);
    }
    ctx.strokeStyle = 'rgba(183,154,102,.24)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + (side ? -2 : 5), y); ctx.lineTo(x + (side ? -2 : 5), y + h); ctx.stroke();
  }
};
