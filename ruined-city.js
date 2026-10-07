'use strict';

/* Distrito comercial destruído: cenário leve e coordenadas do encontro 2. */
const RuinedCity = {
  bounds: { left: 1410, right: 2050, top: 625, bottom: 1160 },
  center: { x: 1730, y: 890 },
  outerGate: { x: 1985, y: 1035 },
  innerGate: { x: 1660, y: 850 },
  bossStart: { x: 1530, y: 760 },
  returnPoint: { x: 1850, y: 1080 },
  buildings: [
    { x: 1448, y: 662, w: 164, h: 165, seed: 0 },
    { x: 1838, y: 646, w: 170, h: 172, seed: 1 },
    { x: 1438, y: 1006, w: 154, h: 122, seed: 2 },
    { x: 1842, y: 1020, w: 164, h: 118, seed: 3 }
  ],

  prepare() {
    World.clearArea(this.center.x, this.center.y, 485);
  },

  drawGround(ctx, t, discovered) {
    const b = this.bounds;
    ctx.save();

    // Calçamento gasto e avenidas que conduzem ao pátio da Casa da Moeda.
    ctx.fillStyle = '#37383a';
    ctx.fillRect(b.left, b.top, b.right - b.left, b.bottom - b.top);
    ctx.fillStyle = '#484346';
    ctx.fillRect(b.left + 176, b.top, 190, b.bottom - b.top);
    ctx.fillRect(b.left, b.top + 204, b.right - b.left, 128);
    ctx.strokeStyle = 'rgba(190,174,149,.2)';
    ctx.lineWidth = 1;
    for (let x = b.left + 8; x < b.right; x += 38) {
      ctx.beginPath(); ctx.moveTo(x, b.top); ctx.lineTo(x, b.bottom); ctx.stroke();
    }
    for (let y = b.top + 6; y < b.bottom; y += 34) {
      ctx.beginPath(); ctx.moveTo(b.left, y); ctx.lineTo(b.right, y); ctx.stroke();
    }

    // Trincas e manchas de água dão leitura de abandono sem adicionar colisões.
    ctx.strokeStyle = 'rgba(19,20,23,.7)';
    ctx.lineWidth = 2;
    const cracks = [
      [1656, 739, 1673, 761, 1663, 784],
      [1787, 932, 1770, 952, 1780, 976],
      [1596, 1028, 1614, 1041, 1608, 1062],
      [1900, 876, 1885, 891, 1898, 911]
    ];
    for (let i = 0; i < cracks.length; i++) {
      const c = cracks[i];
      ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.lineTo(c[2], c[3]); ctx.lineTo(c[4], c[5]); ctx.stroke();
    }

    for (let i = 0; i < this.buildings.length; i++) this._drawBuilding(ctx, this.buildings[i], t);
    this._drawMintGate(ctx, t);
    this._drawOuterMark(ctx, t, discovered);
    if (Climate.state === 'storm') this._drawPuddles(ctx, t);
    ctx.restore();
  },

  _drawBuilding(ctx, building, t) {
    const b = building, wobble = Math.sin(t * 1.2 + b.seed) * 0.35;
    ctx.fillStyle = 'rgba(0,0,0,.32)';
    ctx.fillRect(b.x + 10, b.y + b.h - 5, b.w, 15);
    ctx.fillStyle = '#29292d';
    ctx.fillRect(b.x, b.y + 18, b.w, b.h - 18);
    ctx.fillStyle = '#57504a';
    ctx.beginPath();
    ctx.moveTo(b.x - 2, b.y + 22); ctx.lineTo(b.x + 6, b.y + 2);
    ctx.lineTo(b.x + b.w * .42, b.y + 10);
    ctx.lineTo(b.x + b.w * .61, b.y - 6);
    ctx.lineTo(b.x + b.w - 8, b.y + 12); ctx.lineTo(b.x + b.w + 3, b.y + 28);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#9b7948';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(b.x + 5, b.y + b.h - 5); ctx.lineTo(b.x + 5, b.y + 30);
    ctx.lineTo(b.x + b.w * .34, b.y + 30); ctx.lineTo(b.x + b.w * .34, b.y + 55);
    ctx.moveTo(b.x + b.w - 6, b.y + b.h - 5); ctx.lineTo(b.x + b.w - 6, b.y + 43);
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
    const x = this.innerGate.x, y = this.innerGate.y, pulse = .45 + .2 * Math.sin(t * 2.4);
    ctx.fillStyle = 'rgba(0,0,0,.38)';
    ctx.beginPath(); ctx.ellipse(x, y + 12, 71, 20, 0, 0, 6.2832); ctx.fill();
    ctx.fillStyle = '#20252a';
    ctx.fillRect(x - 49, y - 83, 98, 93);
    ctx.fillStyle = '#11171c';
    ctx.fillRect(x - 31, y - 61, 62, 70);
    ctx.strokeStyle = '#786342';
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(x - 48, y + 6); ctx.lineTo(x - 48, y - 46);
    ctx.quadraticCurveTo(x, y - 100, x + 48, y - 46); ctx.lineTo(x + 48, y + 6); ctx.stroke();
    ctx.fillStyle = 'rgba(195,145,65,' + pulse.toFixed(2) + ')';
    ctx.beginPath(); ctx.arc(x, y - 35, 9, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = '#a97d3e'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y - 35, 19, 0, 6.2832); ctx.stroke();
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
      ctx.fillText('DISTRITO COMERCIAL', x, y - 43);
    }
  },

  _drawPuddles(ctx, t) {
    const shimmer = .12 + .07 * Math.sin(t * 4);
    ctx.fillStyle = 'rgba(117,153,177,' + shimmer.toFixed(2) + ')';
    ctx.beginPath(); ctx.ellipse(1720, 1040, 38, 10, -.12, 0, 6.2832); ctx.fill();
    ctx.beginPath(); ctx.ellipse(1885, 865, 27, 8, .16, 0, 6.2832); ctx.fill();
    ctx.beginPath(); ctx.ellipse(1550, 941, 22, 7, -.2, 0, 6.2832); ctx.fill();
  }
};
