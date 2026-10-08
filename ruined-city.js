'use strict';

/* Distrito abandonado no sudoeste. A arena do Bispo é uma instância à parte. */
const RuinedCity = {
  bounds: { left: 340, right: 1190, top: 1270, bottom: 2020 },
  center: { x: 760, y: 1630 },
  outerGate: { x: 1090, y: 1760 },
  innerGate: { x: 575, y: 1515 },
  room: { left: 80, right: 1380, top: 310, bottom: 1280 },
  start: { x: 420, y: 1110 },
  bossStart: { x: 1030, y: 770 },
  exit: { x: 430, y: 1210 },
  returnPoint: { x: 620, y: 1535 },
  arenaInside: false,
  exteriorReturn: null,
  buildings: [
    { x: 390, y: 1325, w: 180, h: 176, seed: 0, broken: 0 },
    { x: 805, y: 1310, w: 190, h: 190, seed: 1, broken: 1 },
    { x: 370, y: 1810, w: 176, h: 154, seed: 2, broken: 1 },
    { x: 875, y: 1855, w: 194, h: 125, seed: 3, broken: 0 },
    { x: 940, y: 1510, w: 128, h: 145, seed: 4, broken: 1 }
  ],

  contains(x, y) {
    const b = this.bounds;
    return x >= b.left && x <= b.right && y >= b.top && y <= b.bottom;
  },

  prepare() {
    // Não remove árvores nem pedras do mapa: a decoração da cidade é
    // desenhada como uma camada regional e os encontros usam clareiras locais.
    World.clearArea(this.outerGate.x, this.outerGate.y, 42);
    World.clearArea(this.innerGate.x, this.innerGate.y, 54);
    World.clearArea(820, 1580, 48);
    World.clearArea(970, 1740, 52);
    World.clearArea(690, 1515, 48);
  },

  enter() {
    if (!this.arenaInside) this.exteriorReturn = { x: Player.x, y: Player.y };
    this.arenaInside = true;
    Climate.setInterior(true);
    this._placePlayer(this.start.x, this.start.y);
    Camera.snap(Player);
    Sfx.blip();
    Quest.toast('Casa da Moeda — a porta se fecha atrás de você.', 3);
  },

  exit() {
    this.arenaInside = false;
    Climate.setInterior(false);
    const point = this.exteriorReturn || this.returnPoint;
    this._placePlayer(point.x, point.y);
    this.exteriorReturn = null;
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

  drawGround(ctx, t, discovered) {
    if (this.arenaInside) {
      this._drawArena(ctx, t);
      return;
    }
    const b = this.bounds;
    ctx.save();

    // Distrito elevado de pedra escura, com duas ruas e um pátio transitável.
    ctx.fillStyle = '#323438';
    ctx.fillRect(b.left, b.top, b.right - b.left, b.bottom - b.top);
    ctx.fillStyle = '#474449';
    ctx.fillRect(500, b.top, 154, b.bottom - b.top);
    ctx.fillRect(b.left, 1640, b.right - b.left, 142);
    ctx.fillStyle = '#393a3e';
    ctx.fillRect(660, 1470, 270, 282);

    // Lajes e juntas irregulares, com rachaduras mais concentradas nas bordas.
    ctx.strokeStyle = 'rgba(190,174,149,.14)';
    ctx.lineWidth = 1;
    for (let x = b.left + 9; x < b.right; x += 39) {
      ctx.beginPath(); ctx.moveTo(x, b.top); ctx.lineTo(x, b.bottom); ctx.stroke();
    }
    for (let y = b.top + 5; y < b.bottom; y += 35) {
      ctx.beginPath(); ctx.moveTo(b.left, y); ctx.lineTo(b.right, y); ctx.stroke();
    }
    this._drawCracks(ctx);
    this._drawDebris(ctx, t);
    for (let i = 0; i < this.buildings.length; i++) this._drawBuilding(ctx, this.buildings[i], t);
    this._drawMintGate(ctx, t);
    this._drawOuterMark(ctx, t, discovered);
    if (Climate.state === 'storm') this._drawPuddles(ctx, t);
    ctx.restore();
  },

  _drawCracks(ctx) {
    const cracks = [
      [681, 1360, 699, 1381, 689, 1403], [733, 1775, 714, 1798, 728, 1820],
      [1020, 1602, 1004, 1621, 1016, 1644], [454, 1690, 471, 1710, 460, 1731],
      [845, 1890, 828, 1912, 843, 1930], [1125, 1828, 1108, 1845, 1117, 1868]
    ];
    ctx.strokeStyle = 'rgba(15,17,20,.75)';
    ctx.lineWidth = 2;
    for (const c of cracks) {
      ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.lineTo(c[2], c[3]); ctx.lineTo(c[4], c[5]); ctx.stroke();
    }
  },

  _drawDebris(ctx, t) {
    // Entulho, placas caídas e vegetação rala delimitam o caminho sem fechá-lo.
    const piles = [
      [621, 1377, 26, 12], [739, 1862, 33, 13], [1060, 1598, 28, 12],
      [422, 1776, 31, 11], [908, 1792, 24, 10], [575, 1918, 35, 12]
    ];
    for (let i = 0; i < piles.length; i++) {
      const p = piles[i];
      ctx.fillStyle = 'rgba(0,0,0,.24)';
      ctx.beginPath(); ctx.ellipse(p[0] + 4, p[1] + 7, p[2], p[3] * .55, 0, 0, 6.2832); ctx.fill();
      ctx.fillStyle = i % 2 ? '#625d57' : '#777068';
      ctx.beginPath();
      ctx.moveTo(p[0] - p[2], p[1] + 5); ctx.lineTo(p[0] - p[2] * .54, p[1] - p[3]);
      ctx.lineTo(p[0] - 2, p[1] - p[3] * .5); ctx.lineTo(p[0] + p[2] * .44, p[1] - p[3] * .9);
      ctx.lineTo(p[0] + p[2], p[1] + 3); ctx.closePath(); ctx.fill();
    }
    const sway = Math.sin(t * 2 + 1) * 2;
    ctx.strokeStyle = 'rgba(119,139,91,.65)';
    ctx.lineWidth = 2;
    for (const p of [[754, 1438], [1120, 1688], [425, 1870], [826, 1970]]) {
      ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0] + sway, p[1] - 12);
      ctx.lineTo(p[0] + 7, p[1] - 18); ctx.stroke();
    }
  },

  _drawBuilding(ctx, building, t) {
    const b = building, wobble = Math.sin(t * 1.2 + b.seed) * 0.35;
    ctx.fillStyle = 'rgba(0,0,0,.34)';
    ctx.fillRect(b.x + 10, b.y + b.h - 5, b.w, 16);
    ctx.fillStyle = '#29292d';
    ctx.fillRect(b.x, b.y + 18, b.w, b.h - 18);
    ctx.fillStyle = '#57504a';
    ctx.beginPath();
    ctx.moveTo(b.x - 2, b.y + 22); ctx.lineTo(b.x + 6, b.y + 2);
    ctx.lineTo(b.x + b.w * .42, b.y + 10);
    if (!b.broken) ctx.lineTo(b.x + b.w * .61, b.y - 6);
    else ctx.lineTo(b.x + b.w * .58, b.y + 30);
    ctx.lineTo(b.x + b.w - 8, b.y + 12); ctx.lineTo(b.x + b.w + 3, b.y + 28);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#9b7948';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(b.x + 5, b.y + b.h - 5); ctx.lineTo(b.x + 5, b.y + 30);
    ctx.lineTo(b.x + b.w * .34, b.y + 30); ctx.lineTo(b.x + b.w * .34, b.y + 55);
    ctx.moveTo(b.x + b.w - 6, b.y + b.h - 5); ctx.lineTo(b.x + b.w - 6, b.y + 43);
    if (b.broken) {
      ctx.moveTo(b.x + b.w * .58, b.y + 42); ctx.lineTo(b.x + b.w * .7, b.y + 76);
      ctx.lineTo(b.x + b.w * .82, b.y + 64);
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(9,13,18,.7)';
    ctx.fillRect(b.x + 27, b.y + 57, 29, 42);
    ctx.fillRect(b.x + b.w - 52, b.y + 49, 25, 35);
    ctx.fillStyle = 'rgba(182,134,63,' + (0.38 + wobble * 0.1).toFixed(2) + ')';
    ctx.fillRect(b.x + 68, b.y + b.h - 27, 34, 3);
    ctx.fillStyle = '#51473d';
    ctx.beginPath(); ctx.ellipse(b.x + b.w * .62, b.y + b.h - 3, 27, 8, 0, 0, 6.2832); ctx.fill();
    ctx.fillStyle = '#746c62';
    ctx.fillRect(b.x + 18, b.y + b.h - 14, 17, 8);
    ctx.fillRect(b.x + b.w - 33, b.y + b.h - 19, 21, 11);
  },

  _drawMintGate(ctx, t) {
    const x = this.innerGate.x, y = this.innerGate.y, pulse = .38 + .18 * Math.sin(t * 2.4);
    ctx.fillStyle = 'rgba(0,0,0,.48)';
    ctx.beginPath(); ctx.ellipse(x, y + 12, 76, 21, 0, 0, 6.2832); ctx.fill();
    ctx.fillStyle = '#20252a';
    ctx.fillRect(x - 52, y - 84, 104, 94);
    ctx.fillStyle = '#10161b';
    ctx.fillRect(x - 33, y - 62, 66, 71);
    ctx.strokeStyle = '#786342';
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(x - 50, y + 6); ctx.lineTo(x - 50, y - 47);
    ctx.quadraticCurveTo(x, y - 102, x + 50, y - 47); ctx.lineTo(x + 50, y + 6); ctx.stroke();
    ctx.fillStyle = 'rgba(195,145,65,' + pulse.toFixed(2) + ')';
    ctx.beginPath(); ctx.arc(x, y - 35, 10, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = '#a97d3e'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y - 35, 20, 0, 6.2832); ctx.stroke();
    ctx.fillStyle = '#d4bd8f';
    ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('CASA DA MOEDA', x, y - 108);
  },

  _drawOuterMark(ctx, t, discovered) {
    const x = this.outerGate.x, y = this.outerGate.y, pulse = .45 + .35 * Math.sin(t * 3);
    ctx.fillStyle = '#4a4135';
    ctx.fillRect(x - 18, y - 34, 36, 34);
    ctx.strokeStyle = discovered ? 'rgba(217,165,72,' + pulse.toFixed(2) + ')' : '#716452';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y - 18, 15, 0, 6.2832); ctx.stroke();
    ctx.fillStyle = '#d2a34e';
    ctx.font = 'bold 17px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('¢', x, y - 12);
    if (discovered) {
      ctx.font = 'bold 10px sans-serif';
      ctx.fillStyle = '#e4c276';
      ctx.fillText('DISTRITO ABANDONADO', x, y - 43);
    }
  },

  _drawPuddles(ctx, t) {
    const shimmer = .12 + .07 * Math.sin(t * 4);
    ctx.fillStyle = 'rgba(117,153,177,' + shimmer.toFixed(2) + ')';
    ctx.beginPath(); ctx.ellipse(760, 1708, 45, 12, -.12, 0, 6.2832); ctx.fill();
    ctx.beginPath(); ctx.ellipse(1015, 1660, 30, 9, .16, 0, 6.2832); ctx.fill();
    ctx.beginPath(); ctx.ellipse(575, 1842, 24, 8, -.2, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = 'rgba(210,226,238,' + (.18 + .08 * Math.sin(t * 3.5)).toFixed(2) + ')';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(760, 1708, 27, 5, -.12, 0, 6.2832); ctx.stroke();
  },

  _drawArena(ctx, t) {
    const r = this.room, cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2;
    ctx.save();
    // Fundo escuro fora da arena e pavimento molhado no interior.
    ctx.fillStyle = '#11171b';
    ctx.fillRect(0, 0, World.w, World.h);
    ctx.fillStyle = '#252a2d';
    ctx.fillRect(r.left, r.top, r.right - r.left, r.bottom - r.top);
    const floor = ctx.createLinearGradient(r.left, r.top, r.right, r.bottom);
    floor.addColorStop(0, '#383b3b');
    floor.addColorStop(.5, '#4a4843');
    floor.addColorStop(1, '#252a2d');
    ctx.fillStyle = floor;
    ctx.fillRect(r.left + 22, r.top + 22, r.right - r.left - 44, r.bottom - r.top - 44);

    ctx.strokeStyle = 'rgba(188,176,151,.18)';
    ctx.lineWidth = 1;
    for (let x = r.left + 42; x < r.right; x += 76) {
      ctx.beginPath(); ctx.moveTo(x, r.top + 25); ctx.lineTo(x, r.bottom - 25); ctx.stroke();
    }
    for (let y = r.top + 44; y < r.bottom; y += 62) {
      ctx.beginPath(); ctx.moveTo(r.left + 25, y); ctx.lineTo(r.right - 25, y); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(15,17,19,.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(490, 500); ctx.lineTo(535, 540); ctx.lineTo(520, 590);
    ctx.moveTo(1190, 930); ctx.lineTo(1154, 960); ctx.lineTo(1175, 1005);
    ctx.moveTo(722, 1060); ctx.lineTo(748, 1028); ctx.lineTo(739, 990);
    ctx.stroke();

    this._drawWorkshopRuin(ctx, t);

    // Poças e um anel rúnico discreto reservam espaço para combate e eventos.
    ctx.fillStyle = 'rgba(125,158,176,' + (.15 + .04 * Math.sin(t * 3)).toFixed(2) + ')';
    ctx.beginPath(); ctx.ellipse(610, 920, 62, 14, -.12, 0, 6.2832); ctx.fill();
    ctx.beginPath(); ctx.ellipse(1190, 560, 42, 10, .1, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = 'rgba(176,137,75,.5)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(cx, cy + 65, 154, 78, 0, 0, 6.2832); ctx.stroke();
    ctx.strokeStyle = 'rgba(198,161,99,.2)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(cx, cy + 65, 133, 64, 0, 0, 6.2832); ctx.stroke();

    this._drawArenaWall(ctx, r.left + 10, r.top + 20, r.bottom - r.top - 40, 0);
    this._drawArenaWall(ctx, r.right - 10, r.top + 20, r.bottom - r.top - 40, 1);
    ctx.fillStyle = '#141a1d';
    ctx.fillRect(this.exit.x - 42, r.bottom - 44, 84, 34);
    ctx.strokeStyle = '#9e7945';
    ctx.lineWidth = 3;
    ctx.strokeRect(this.exit.x - 42, r.bottom - 44, 84, 34);
    ctx.fillStyle = '#c3a36e';
    ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('SAÍDA', this.exit.x, r.bottom - 22);
    ctx.restore();
  },

  _drawWorkshopRuin(ctx, t) {
    // A Casa da Moeda foi um posto de trabalho antes de virar salão de cobrança.
    // Todo o maquinário fica junto às paredes; a área central segue livre para lutar.
    ctx.fillStyle = 'rgba(8,12,15,.27)';
    ctx.fillRect(255, 365, 1055, 151);
    ctx.fillStyle = '#303438';
    ctx.fillRect(278, 352, 1008, 18);
    ctx.fillStyle = '#625743';
    ctx.fillRect(286, 371, 10, 128);
    ctx.fillRect(1267, 371, 10, 128);
    ctx.fillStyle = '#45423b';
    ctx.fillRect(300, 464, 952, 13);
    ctx.strokeStyle = 'rgba(184,157,103,.38)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(296, 377); ctx.lineTo(1268, 377);
    ctx.moveTo(304, 480); ctx.lineTo(1250, 480);
    ctx.stroke();

    // Balcões de contagem antigos, encostados à parede do fundo.
    const counters = [
      { x: 360, y: 505, w: 190 },
      { x: 870, y: 505, w: 210 },
      { x: 1110, y: 584, w: 150 }
    ];
    for (let i = 0; i < counters.length; i++) {
      const c = counters[i];
      ctx.fillStyle = 'rgba(0,0,0,.3)';
      ctx.fillRect(c.x + 6, c.y + 12, c.w, 13);
      ctx.fillStyle = i === 1 ? '#514333' : '#4a4135';
      ctx.fillRect(c.x, c.y - 13, c.w, 22);
      ctx.fillStyle = '#82704e';
      ctx.fillRect(c.x - 5, c.y - 18, c.w + 10, 7);
      ctx.fillStyle = '#2d2d2b';
      ctx.fillRect(c.x + 17, c.y + 8, 8, 38);
      ctx.fillRect(c.x + c.w - 25, c.y + 8, 8, 38);
      ctx.strokeStyle = 'rgba(195,170,116,.45)';
      ctx.lineWidth = 1;
      for (let mark = 0; mark < 4; mark++) {
        const mx = c.x + 22 + mark * ((c.w - 48) / 4);
        ctx.beginPath(); ctx.moveTo(mx, c.y - 10); ctx.lineTo(mx + 12, c.y - 10); ctx.stroke();
      }
    }

    // Arquivos, caixas e uma prensa manual sugerem a rotina interrompida.
    const boxes = [
      [315, 576, 37, 30], [356, 580, 29, 25], [1190, 660, 39, 31],
      [1244, 1054, 41, 32], [177, 1042, 49, 37]
    ];
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      ctx.fillStyle = 'rgba(0,0,0,.26)';
      ctx.fillRect(b[0] + 4, b[1] + b[3] - 2, b[2], 8);
      ctx.fillStyle = i % 2 ? '#514534' : '#625039';
      ctx.fillRect(b[0], b[1], b[2], b[3]);
      ctx.strokeStyle = 'rgba(173,145,98,.58)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(b[0] + 3, b[1] + 4, b[2] - 6, b[3] - 8);
      ctx.beginPath(); ctx.moveTo(b[0] + 5, b[1] + 8); ctx.lineTo(b[0] + b[2] - 5, b[1] + b[3] - 7); ctx.stroke();
    }

    // Armários de fichas e arquivos caídos ocupam somente as laterais.
    ctx.fillStyle = '#292e30';
    ctx.fillRect(153, 565, 74, 151);
    ctx.fillStyle = '#5d5648';
    ctx.fillRect(148, 560, 84, 8);
    ctx.fillRect(148, 711, 84, 8);
    for (let drawer = 0; drawer < 5; drawer++) {
      const dy = 576 + drawer * 26;
      ctx.fillStyle = drawer % 2 ? '#45433b' : '#3a3b37';
      ctx.fillRect(160, dy, 60, 19);
      ctx.strokeStyle = 'rgba(178,153,106,.38)';
      ctx.lineWidth = 1;
      ctx.strokeRect(163, dy + 2, 54, 15);
      ctx.fillStyle = '#a58a58';
      ctx.fillRect(185, dy + 8, 10, 3);
    }
    ctx.fillStyle = '#292e30';
    ctx.fillRect(1290, 702, 46, 143);
    ctx.fillStyle = '#635946';
    for (let shelf = 0; shelf < 4; shelf++) {
      const sy = 714 + shelf * 34;
      ctx.fillRect(1285, sy, 56, 6);
      ctx.fillStyle = shelf % 2 ? '#614d34' : '#746044';
      ctx.fillRect(1295, sy - 15, 9, 14);
      ctx.fillRect(1306, sy - 19, 12, 18);
      ctx.fillRect(1321, sy - 12, 8, 11);
      ctx.fillStyle = '#635946';
    }

    // Prensa de cunhagem desligada: o símbolo da Ganância aparece só em detalhes.
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath(); ctx.ellipse(731, 531, 58, 15, 0, 0, 6.2832); ctx.fill();
    ctx.fillStyle = '#3e4141';
    ctx.fillRect(701, 460, 60, 67);
    ctx.fillStyle = '#786346';
    ctx.fillRect(690, 453, 82, 13);
    ctx.fillStyle = '#9a7946';
    ctx.fillRect(724, 430, 14, 33);
    ctx.strokeStyle = '#a17e48';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(707, 489); ctx.lineTo(755, 489); ctx.moveTo(731, 478); ctx.lineTo(731, 504); ctx.stroke();
    ctx.fillStyle = '#d0aa5e';
    ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('II', 731, 519);

    // Uma balança de arquivo, sem moedas suficientes para esconder seu abandono.
    ctx.strokeStyle = '#86724f';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(1056, 537); ctx.lineTo(1056, 580); ctx.moveTo(1037, 545); ctx.lineTo(1076, 545);
    ctx.moveTo(1042, 545); ctx.lineTo(1034, 565); ctx.moveTo(1071, 545); ctx.lineTo(1078, 562);
    ctx.stroke();
    ctx.strokeStyle = '#a08b62';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(1027, 565); ctx.quadraticCurveTo(1034, 575, 1041, 565);
    ctx.moveTo(1072, 562); ctx.quadraticCurveTo(1079, 572, 1086, 562); ctx.stroke();
    ctx.fillStyle = '#c7a654';
    ctx.beginPath(); ctx.ellipse(1034, 567, 5, 2.5, 0, 0, 6.2832); ctx.fill();

    // Colunas e vigas danificadas marcam as laterais sem criar obstáculos de combate.
    for (const p of [[185, 690, 1], [1298, 845, -1], [250, 1121, 1], [1320, 1100, -1]]) {
      ctx.fillStyle = 'rgba(0,0,0,.32)';
      ctx.fillRect(p[0] + 8, p[1] + 11, 35, 13);
      ctx.fillStyle = '#33373a';
      ctx.fillRect(p[0], p[1] - 38, 32, 48);
      ctx.fillStyle = '#60584a';
      ctx.fillRect(p[0] - 5, p[1] - 43, 42, 9);
      ctx.fillRect(p[0] - 4, p[1] + 3, 40, 8);
      ctx.strokeStyle = 'rgba(168,145,103,.46)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p[0] + 7, p[1] - 28); ctx.lineTo(p[0] + 20, p[1] - 10);
      if (p[2] < 0) ctx.lineTo(p[0] + 10, p[1] - 1);
      ctx.stroke();
    }

    // Raízes e musgo entram pelas juntas do telhado e pelas poças antigas.
    ctx.strokeStyle = 'rgba(50,75,48,.8)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(326, 361); ctx.quadraticCurveTo(343, 400, 334, 431); ctx.lineTo(352, 452);
    ctx.moveTo(1244, 361); ctx.quadraticCurveTo(1221, 401, 1235, 427); ctx.lineTo(1217, 448);
    ctx.moveTo(203, 1170); ctx.quadraticCurveTo(233, 1147, 250, 1175);
    ctx.moveTo(1274, 1190); ctx.quadraticCurveTo(1302, 1160, 1330, 1186);
    ctx.stroke();
    ctx.fillStyle = 'rgba(67,91,52,.75)';
    for (const p of [[335, 419], [348, 437], [1230, 417], [1221, 440], [232, 1170], [1305, 1178], [313, 1042], [1208, 1004]]) {
      ctx.beginPath(); ctx.ellipse(p[0], p[1], 9, 3, -.55, 0, 6.2832); ctx.fill();
    }
    ctx.fillStyle = 'rgba(59,83,48,.23)';
    ctx.beginPath(); ctx.ellipse(275, 1060, 74, 20, -.18, 0, 6.2832); ctx.fill();
    ctx.beginPath(); ctx.ellipse(1271, 957, 63, 15, .12, 0, 6.2832); ctx.fill();

    // Feixes de luz antiga e poeira dourada bem baixa, concentrados nas bordas.
    const glow = ctx.createRadialGradient(438, 537, 8, 438, 537, 170);
    glow.addColorStop(0, 'rgba(209,169,95,.13)');
    glow.addColorStop(1, 'rgba(209,169,95,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(260, 360, 360, 330);
    const glowRight = ctx.createRadialGradient(1213, 607, 5, 1213, 607, 145);
    glowRight.addColorStop(0, 'rgba(192,152,83,.1)');
    glowRight.addColorStop(1, 'rgba(192,152,83,0)');
    ctx.fillStyle = glowRight;
    ctx.fillRect(1060, 450, 300, 300);

    // Moedas perdidas e marcas de botas seguem a rota para o salão, não o centro da luta.
    ctx.fillStyle = '#b88e3d';
    for (const p of [[367, 1090], [398, 1076], [453, 1057], [1194, 1094], [1240, 1068]]) {
      ctx.beginPath(); ctx.ellipse(p[0], p[1], 4, 2.2, -.18, 0, 6.2832); ctx.fill();
    }
    ctx.fillStyle = 'rgba(14,17,18,.3)';
    for (const p of [[472, 1095], [493, 1087], [511, 1078], [1178, 1090]]) {
      ctx.beginPath(); ctx.ellipse(p[0], p[1], 3, 5, -.3, 0, 6.2832); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(157,142,108,' + (.12 + .035 * Math.sin(t * 1.4)).toFixed(3) + ')';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(454, 602); ctx.lineTo(479, 620); ctx.lineTo(470, 642);
    ctx.moveTo(1163, 895); ctx.lineTo(1146, 913); ctx.lineTo(1158, 930);
    ctx.stroke();
  },

  _drawArenaWall(ctx, x, y, h, side) {
    ctx.fillStyle = '#191f22';
    ctx.fillRect(x - 10, y, 36, h);
    ctx.fillStyle = '#675b49';
    for (let i = 0; i < 5; i++) {
      const yy = y + 35 + i * (h / 5);
      ctx.fillRect(x + (side ? -3 : 5), yy, 22, 8);
    }
    ctx.strokeStyle = 'rgba(196,162,107,.25)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + (side ? -3 : 5), y); ctx.lineTo(x + (side ? -3 : 5), y + h); ctx.stroke();
  }
};
