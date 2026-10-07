'use strict';

/* Climas de campanha reutilizáveis. Só tempestade é acionada nesta etapa. */
const CLIMATE_PRESETS = {
  clear: { className: 'clear', thunder: false },
  storm: { className: 'storm', thunder: true },
  fog: { className: 'fog', thunder: false },
  night: { className: 'night', thunder: false }
};

const Climate = {
  state: 'clear',
  el: null,
  flashFor: 0,
  thunderIn: -1,
  nextFlash: 0,

  init() {
    this.el = document.getElementById('climate-layer');
    this.set('clear', true);
  },

  set(name, force) {
    const preset = CLIMATE_PRESETS[name];
    if (!preset) return false;
    if (!force && this.state === name) return true;
    this.state = name;
    this.flashFor = 0;
    this.thunderIn = -1;
    this.nextFlash = name === 'storm' ? 2.2 + Math.random() * 2.6 : 0;
    if (!this.el) this.el = document.getElementById('climate-layer');
    if (this.el) {
      this.el.classList.remove('clear', 'storm', 'fog', 'night', 'lightning');
      this.el.classList.add(preset.className);
      this.el.setAttribute('aria-label', name === 'storm' ? 'Tempestade forte' : 'Clima ' + name);
    }
    return true;
  },

  frame(dt) {
    if (this.state !== 'storm' || !this.el) return;
    const step = Math.max(0, Math.min(dt || 0, 0.1));
    if (this.flashFor > 0) {
      this.flashFor -= step;
      if (this.flashFor <= 0) this.el.classList.remove('lightning');
    }
    if (this.thunderIn >= 0) {
      this.thunderIn -= step;
      if (this.thunderIn < 0 && typeof Sfx !== 'undefined' && Sfx.thunder) Sfx.thunder();
    }
    this.nextFlash -= step;
    if (this.nextFlash <= 0) {
      this.el.classList.remove('lightning');
      void this.el.offsetWidth;
      this.el.classList.add('lightning');
      this.flashFor = 0.48;
      this.thunderIn = 0.35 + Math.random() * 0.85;
      this.nextFlash = 4.5 + Math.random() * 7;
    }
  }
};
