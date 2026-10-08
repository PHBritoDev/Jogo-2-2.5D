'use strict';

/* Eventos ambientais da tempestade. Separado do clima visual e do combate. */
const StormEvents = {
  armed: false,
  nextIn: 0,
  hazard: null,
  splashes: [],
  splashIn: 0,

  update(dt) {
    const storm = Climate.state === 'storm';
    const inside = (typeof Casino !== 'undefined' && Casino.inside) ||
      (typeof RuinedCity !== 'undefined' && RuinedCity.arenaInside) ||
      (typeof MistValley !== 'undefined' && MistValley.siteInside);
    if (!storm) {
      this.armed = false;
      this.hazard = null;
      this.splashes.length = 0;
      return;
    }
    if (!this.armed) {
      this.armed = true;
      this.nextIn = 7 + Math.random() * 5;
      this.splashIn = .5 + Math.random() * 1.2;
    }
    if (inside || Player.dead) {
      this.hazard = null;
      this.splashes.length = 0;
      this.nextIn = Math.max(this.nextIn, 3);
      return;
    }

    this.nextIn -= dt;
    if (!this.hazard && this.nextIn <= 0) this._spawnNearPlayer();
    if (this.hazard) this._updateHazard(dt);
    this._updateSplashes(dt);
  },

  _spawnNearPlayer() {
    const angle = Math.random() * Math.PI * 2;
    const distance = 165 + Math.random() * 95;
    const x = U.clamp(Player.x + Math.cos(angle) * distance, 70, World.w - 70);
    const y = U.clamp(Player.y + Math.sin(angle) * distance, 70, World.h - 70);
    const drift = Math.random() * Math.PI * 2;
    this.hazard = {
      x: x, y: y, originX: x, originY: y,
      phase: 'warning', age: 0, warning: 1.15,
      duration: 3.8 + Math.random() * 1.4,
      phaseAngle: Math.random() * Math.PI * 2,
      spin: Math.random() < .5 ? -1 : 1,
      driftX: Math.cos(drift) * (9 + Math.random() * 11),
      driftY: Math.sin(drift) * (9 + Math.random() * 11),
      hitIn: 0
    };
    Sfx.blip();
    Quest.toast('O vento se fecha — redemoinho se aproximando!', 1.8);
  },

  _updateHazard(dt) {
    const h = this.hazard;
    h.age += dt;
    if (h.phase === 'warning' && h.age >= h.warning) {
      h.phase = 'active';
      h.age = 0;
      Sfx.blip();
    }
    if (h.phase === 'active') {
      const driftT = h.age;
      h.x = h.originX + h.driftX * driftT +
        Math.cos(h.phaseAngle + driftT * 1.7) * 18;
      h.y = h.originY + h.driftY * driftT +
        Math.sin(h.phaseAngle + driftT * 1.7) * 18;
      h.hitIn = Math.max(0, h.hitIn - dt);
      const d = Math.hypot(Player.x - h.x, Player.y - h.y);
      if (d < 32 + Player.r && h.hitIn <= 0 && !Player.dead) {
        Player.hurt(7, h.x, h.y, 215);
        h.hitIn = 1.05;
      }
      if (h.age >= h.duration) {
        this.hazard = null;
        this.nextIn = 8 + Math.random() * 7;
      }
    }
  },

  _updateSplashes(dt) {
    this.splashIn -= dt;
    if (this.splashIn <= 0) {
      this.splashIn = 1.2 + Math.random() * 1.9;
      if (Math.random() < .42 && this.splashes.length < 8) {
        const a = Math.random() * Math.PI * 2;
        const d = 45 + Math.random() * 145;
        this.splashes.push({
          x: Player.x + Math.cos(a) * d,
          y: Player.y + Math.sin(a) * d,
          age: 0, life: .55 + Math.random() * .4
        });
      }
    }
    for (let i = this.splashes.length - 1; i >= 0; i--) {
      const p = this.splashes[i];
      p.age += dt;
      if (p.age >= p.life) this.splashes.splice(i, 1);
    }
  },

  draw(ctx, t) {
    if (Climate.state !== 'storm') return;
    for (const p of this.splashes) {
      const k = p.age / p.life;
      ctx.globalAlpha = (1 - k) * .34;
      ctx.strokeStyle = '#d8e9f2';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, 3 + k * 9, 1.5 + k * 3, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    const h = this.hazard;
    if (!h) return;
    if (h.phase === 'warning') {
      const pulse = .2 + .16 * (1 + Math.sin(t * 8));
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = '#d3e3e8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(h.x, h.y, 22 + Math.sin(t * 5) * 4, 9, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      return;
    }

    const spin = h.spin, twist = t * 5 * spin;
    ctx.save();
    // Silhueta arejada: poucos arcos translúcidos em vez de uma coluna opaca.
    for (let i = 0; i < 4; i++) {
      const k = i / 4;
      const y = h.y - 4 - k * 31;
      const rx = 11 + (1 - k) * 17;
      ctx.globalAlpha = .19 + (1 - k) * .18;
      ctx.strokeStyle = i % 2 ? '#c5d5da' : '#e4ecec';
      ctx.lineWidth = 2.1 - k * .5;
      ctx.beginPath();
      ctx.ellipse(h.x + Math.sin(twist + i) * 3, y, rx, 4 + k * 3,
        Math.sin(twist + i) * .22, .2 + twist, 2.6 + twist);
      ctx.stroke();
    }
    ctx.globalAlpha = .23;
    ctx.fillStyle = '#bbcbd0';
    for (let i = 0; i < 5; i++) {
      const a = twist + i * Math.PI * .4;
      const rise = (t * 38 + i * 13) % 34;
      ctx.beginPath();
      ctx.arc(h.x + Math.cos(a) * (8 + rise * .3),
        h.y - 5 - rise, 1.4 + (i % 2), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }
};
