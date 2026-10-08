'use strict';

/* ============================================================
   CAMERA — segue o jogador suavemente e respeita os limites
   do mapa (com uma margem de céu além da borda).
   Também faz um tremor curto (shake) quando há impacto.
   ============================================================ */
const Camera = {
  x: 0,
  y: 0,
  viewW: 800,
  viewH: CFG.VIEW_H,
  scale: 1,

  // Tremor de impacto (decai sozinho)
  shake: 0,
  shakeX: 0,
  shakeY: 0,

  // Chamado quando a tela muda de tamanho (pixels reais do canvas)
  resize(pxW, pxH) {
    this.scale = pxH / CFG.VIEW_H;
    this.viewW = pxW / this.scale;
    this.viewH = CFG.VIEW_H;
  },

  _clampX(v) {
    const m = CFG.CAM.margin;
    const min = -m, max = World.w + m - this.viewW;
    return max < min ? (World.w - this.viewW) / 2 : U.clamp(v, min, max);
  },

  _clampY(v) {
    const m = CFG.CAM.margin;
    const min = -m, max = World.h + m - this.viewH;
    return max < min ? (World.h - this.viewH) / 2 : U.clamp(v, min, max);
  },

  _goalX(p) { return this._clampX(p.x + p.vx * CFG.CAM.look - this.viewW / 2); },
  _goalY(p) { return this._clampY(p.y - 18 + p.vy * CFG.CAM.look - this.viewH / 2); },

  snap(p) {
    this.x = this._goalX(p);
    this.y = this._goalY(p);
  },

  update(dt, p) {
    const k = 1 - Math.exp(-CFG.CAM.follow * dt);
    this.x += (this._goalX(p) - this.x) * k;
    this.y += (this._goalY(p) - this.y) * k;
    // Garante que continue dentro dos limites mesmo após redimensionar
    this.x = this._clampX(this.x);
    this.y = this._clampY(this.y);

    // Tremor: deslocamento aleatório que diminui rápido
    if (this.shake > 0.05) {
      this.shake *= Math.exp(-12 * dt);
      this.shakeX = (Math.random() * 2 - 1) * this.shake;
      this.shakeY = (Math.random() * 2 - 1) * this.shake;
    } else {
      this.shake = 0;
      this.shakeX = 0;
      this.shakeY = 0;
    }
  }
};
