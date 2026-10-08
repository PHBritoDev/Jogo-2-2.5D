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
  indoor: false,
  flashFor: 0,
  thunderIn: -1,
  nextFlash: 0,
  transition: null,

  init() {
    this.el = document.getElementById('climate-layer');
    this.set('clear', true);
  },

  set(name, force) {
    const preset = CLIMATE_PRESETS[name];
    if (!preset) return false;
    if (!force && this.state === name) return true;
    this.state = name;
    this.transition = null;
    this.flashFor = 0;
    this.thunderIn = -1;
    this.nextFlash = name === 'storm' ? 2.2 + Math.random() * 2.6 : 0;
    if (!this.el) this.el = document.getElementById('climate-layer');
    if (this.el) {
      this.el.classList.remove('clear', 'storm', 'fog', 'fogging', 'night', 'lightning');
      this.el.classList.add(preset.className);
      this.el.style.removeProperty('--mist-progress');
      this.el.style.removeProperty('--storm-residual');
      this.el.style.removeProperty('--rain-opacity');
      this.el.setAttribute('aria-label', name === 'storm' ? 'Tempestade forte' : 'Clima ' + name);
    }
    return true;
  },

  transitionTo(name, duration) {
    if (!CLIMATE_PRESETS[name]) return false;
    if (this.state === name) return true;
    if (!this.el) this.el = document.getElementById('climate-layer');
    this.state = 'fogging';
    this.transition = {
      target: name,
      duration: Math.max(.1, duration || 6),
      elapsed: 0
    };
    this.flashFor = 0;
    this.thunderIn = -1;
    if (this.el) {
      this.el.classList.remove('clear', 'storm', 'fog', 'fogging', 'night', 'lightning');
      this.el.classList.add('fogging');
      this.el.style.setProperty('--mist-progress', '0');
      this.el.style.setProperty('--storm-residual', '1');
      this.el.style.setProperty('--rain-opacity', '.3');
      this.el.setAttribute('aria-label', 'O clima está mudando para neblina');
    }
    return true;
  },

  setInterior(value) {
    this.indoor = !!value;
    if (!this.el) this.el = document.getElementById('climate-layer');
    if (this.el) this.el.classList.toggle('indoor', this.indoor);
    if (this.indoor && this.el) this.el.classList.remove('lightning');
    if (!this.indoor && this.state === 'storm') {
      this.nextFlash = 1.5 + Math.random() * 2.5;
    }
  },

  frame(dt) {
    const step = Math.max(0, Math.min(dt || 0, 0.1));
    if (this.transition) {
      this.transition.elapsed = Math.min(this.transition.duration, this.transition.elapsed + step);
      const progress = this.transition.elapsed / this.transition.duration;
      if (this.el) {
        this.el.style.setProperty('--mist-progress', progress.toFixed(3));
        this.el.style.setProperty('--storm-residual', (1 - progress).toFixed(3));
        this.el.style.setProperty('--rain-opacity', (.3 * (1 - progress)).toFixed(3));
      }
      if (progress >= 1) {
        const target = this.transition.target;
        this.set(target, true);
      }
    }
    if (this.state !== 'storm' || this.indoor || !this.el) return;
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
