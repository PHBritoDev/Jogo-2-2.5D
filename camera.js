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
  zoom: 1.2,
  zoomTarget: 1.2,
  pixelW: 0,
  pixelH: 0,
  lookX: 0,
  lookY: 0,

  // Tremor de impacto (decai sozinho)
  shake: 0,
  shakeX: 0,
  shakeY: 0,

  // Chamado quando a tela muda de tamanho (pixels reais do canvas)
  resize(pxW, pxH) {
    this.pixelW = pxW;
    this.pixelH = pxH;
    this._applyViewport();
  },

  _applyViewport() {
    this.viewH = CFG.VIEW_H * this.zoom;
    this.scale = this.pixelH / this.viewH;
    this.viewW = this.pixelW / this.scale;
  },

  setZoom(value) {
    this.zoomTarget = U.clamp(value, 0.82, 1.55);
  },

  panBy(dx, dy) {
    // Pan curto e limitado: permite olhar ao redor sem perder o jogador.
    this.lookX = U.clamp(this.lookX + dx / this.scale, -this.viewW * 0.2, this.viewW * 0.2);
    this.lookY = U.clamp(this.lookY + dy / this.scale, -this.viewH * 0.16, this.viewH * 0.16);
  },

  resetLook() {
    this.lookX = 0;
    this.lookY = 0;
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

  _goalX(p) {
    const target = FirstPerson.aiming && !FirstPerson.active ? FirstPerson.target : null;
    const focusX = target
      ? p.x * 0.55 + target.x * 0.45
      : p.x + p.vx * CFG.CAM.look;
    return this._clampX(focusX + this.lookX - this.viewW / 2);
  },

  _goalY(p) {
    const target = FirstPerson.aiming && !FirstPerson.active ? FirstPerson.target : null;
    const focusY = target
      ? (p.y - 18) * 0.55 + target.y * 0.45
      : p.y - 18 + p.vy * CFG.CAM.look;
    return this._clampY(focusY + this.lookY - this.viewH / 2);
  },

  snap(p) {
    this.x = this._goalX(p);
    this.y = this._goalY(p);
  },

  update(dt, p) {
    const aimZoom = FirstPerson.aiming && !FirstPerson.active
      ? U.clamp(FirstPerson.modeZoom - 0.18, 0.82, 1.55)
      : FirstPerson.modeZoom;
    this.zoomTarget = aimZoom;
    this.zoom += (this.zoomTarget - this.zoom) * (1 - Math.exp(-4 * dt));
    this._applyViewport();

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
