import { sweptCapsule } from './skill-x-rupture3d.js';
/**
 * MOD 233 — Dragão do Julgamento (lógica de combate, passo fixo de 120 Hz).
 *
 * channel (espirais de luz sobem do herói) → form (a cabeça nasce e sobe em espiral; o corpo segue o histórico da
 * cabeça) → advance (avanço serpentino em direção ao alvo; a boca abre ao chegar) → engulf (a cabeça envolve o alvo e a
 * mandíbula FECHA: dano da mordida exatamente no fechamento) → compress (energia comprimida) → explode (esfera de luz:
 * segundo dano) → dissipate.
 *
 * Nunca move, esconde ou destrói o alvo. Chefes (target.resist) recebem a variante de superfície: a cabeça para na frente
 * do torso e fecha a boca ao redor de um volume de energia, sem alterar posição/rig do chefe. Dano total 30 + 36.
 */
export const DRAGON = Object.freeze({ channel: .9, form: 1, speed: 15, maxAdvance: 3.2, wave: 1.25, freq: 2.1, cruise: 5.2,
  open: .3, engulf: .42, compress: .38, dissipate: 1.4, bite: 30, blast: 36, trail: 360 });
const smooth = k => { k = Math.min(1, Math.max(0, k)); return k * k * (3 - 2 * k); };

export class JudgmentDragon {
  constructor({ hit = () => {}, ground = () => 0, event = () => {} } = {}) {
    Object.assign(this, { hit, ground, event, active: false, phase: 'idle', time: 0, age: 0, mouth: 0, head: { x: 0, y: 0, z: 0 }, dir: { x: 0, y: 0, z: 1 }, at: { x: 0, y: 0, z: 0 } });
    this.trail = Array.from({ length: DRAGON.trail }, () => ({ x: 0, y: 0, z: 0 })); this.trailHead = 0; this.trailCount = 0;
  }
  start(source, target, yaw = 0, mul = 1) {
    if (this.active) return false;
    this.active = true; this.time = this.age = this.acc = 0; this.phase = 'channel'; this.mul = mul; this.mouth = 0; this.bitten = false;
    this.id = target?.alive ? target.id : null; this.resist = !!target?.resist; this.source = { ...source };
    this.yaw = target?.alive ? Math.atan2(target.x - source.x, target.z - source.z) : yaw;
    Object.assign(this.head, { x: source.x, y: source.y + 1.2, z: source.z }); this.trailCount = 0; this.trailHead = 0; this.push();
    this.event('channel'); return true;
  }
  cancel() { if (!this.active) return; this.active = false; this.phase = 'idle'; this.mouth = 0; this.event('cancel'); }
  phaseTo(p) { this.phase = p; this.age = 0; this.event(p, this); }
  push() { // só grava quando a cabeça andou: parado, o corpo continua estendido atrás dela
    if (this.trailCount) { const l = this.trail[this.trailHead]; if (Math.hypot(l.x - this.head.x, l.y - this.head.y, l.z - this.head.z) < .03) return; }
    this.trailHead = (this.trailHead + 1) % DRAGON.trail; Object.assign(this.trail[this.trailHead], this.head); this.trailCount = Math.min(DRAGON.trail, this.trailCount + 1); }
  /** k-ésima amostra do corpo (0 = cabeça). */
  sample(k) { k = Math.min(this.trailCount - 1, Math.max(0, k)); return this.trail[(this.trailHead - k + DRAGON.trail) % DRAGON.trail]; }
  update(dt, target, { valid = true, paused = false } = {}) {
    if (!this.active || paused) return;
    if (!valid || (this.id !== null && !this.bitten && (!target?.alive || target.id !== this.id))) { this.cancel(); return; }
    const t = this.id !== null && target?.alive && target.id === this.id ? target : null;
    this.acc += Math.max(0, dt);
    while (this.acc >= 1 / 120 && this.active) { this.acc -= 1 / 120; this.step(1 / 120, t); }
  }
  /** Onde a cabeça fecha a boca: centro do alvo, ou a superfície do torso de um chefe. */
  biteAt(t) {
    const c = { x: t.x, y: t.y + (t.height || 1.8) * .55, z: t.z };
    if (!this.resist) return c;
    const dx = this.head.x - t.x, dz = this.head.z - t.z, d = Math.hypot(dx, dz) || 1, R = (t.radius || .6) + .7;
    return { x: t.x + dx / d * R, y: c.y, z: t.z + dz / d * R };
  }
  step(dt, t) {
    this.time += dt; this.age += dt; const h = this.head, A = this.age, s = this.source, prev = { ...h };
    switch (this.phase) {
      case 'channel': if (A >= DRAGON.channel) this.phaseTo('form'); break;
      case 'form': { // nasce acima do herói e sobe em espiral, já apontando para o alvo
        const k = smooth(A / DRAGON.form), a = this.yaw + Math.PI + A * 5.2, r = 2.6 * (1 - k * .4);
        h.x = s.x + Math.sin(a) * r * (1 - k) + Math.sin(this.yaw) * k * 2; h.z = s.z + Math.cos(a) * r * (1 - k) + Math.cos(this.yaw) * k * 2; h.y = s.y + 1.2 + DRAGON.cruise * k;
        if (A >= DRAGON.form) { this.base = { ...h }; this.phaseTo('advance'); }
        break;
      }
      case 'advance': {
        const goal = t ? this.biteAt(t) : { x: s.x + Math.sin(this.yaw) * 22, y: s.y + 2, z: s.z + Math.cos(this.yaw) * 22 };
        const dx = goal.x - h.x, dz = goal.z - h.z, dist = Math.hypot(dx, dz) || 1, fx = dx / dist, fz = dz / dist;
        // serpenteia: deslocamento lateral senoidal que some perto do alvo (a mordida fica precisa)
        const near = smooth((dist - 1.5) / 6), wob = Math.cos(A * Math.PI * 2 * DRAGON.freq) * DRAGON.wave * near * Math.PI * 2 * DRAGON.freq * dt;
        const step = Math.min(dist, DRAGON.speed * dt);
        h.x += fx * step - fz * wob; h.z += fz * step + fx * wob;
        const wantY = dist > 7 ? Math.max(goal.y + 1.5, this.ground(h.x, h.z) + DRAGON.cruise * near + 1) : goal.y + (dist / 7) * 1.4;
        h.y += (wantY - h.y) * Math.min(1, dt * 4);
        this.mouth = smooth((4.2 - dist) / 3);
        const touch = t && (this.resist ? dist < .35 : (sweptCapsule(prev, h, t, .2) || dist < .35));
        if (touch) { Object.assign(this.at, goal); this.phaseTo('engulf'); }
        else if (A >= DRAGON.maxAdvance || (!t && dist < .5)) { Object.assign(this.at, h); this.phaseTo('compress'); }
        break;
      }
      case 'engulf': { // ataca de boca aberta e FECHA em volta do alvo: dano exatamente no fechamento
        const goal = t ? this.biteAt(t) : this.at; Object.assign(this.at, goal);
        h.x += (goal.x - h.x) * Math.min(1, dt * 14); h.y += (goal.y - h.y) * Math.min(1, dt * 14); h.z += (goal.z - h.z) * Math.min(1, dt * 14);
        this.mouth = A < DRAGON.open ? 1 : 1 - smooth((A - DRAGON.open) / (DRAGON.engulf - DRAGON.open));
        if (A >= DRAGON.engulf) { this.mouth = 0; if (t) { this.bitten = true; this.hit(Math.round(DRAGON.bite * this.mul), this.id, 'bite'); } this.phaseTo('compress'); }
        break;
      }
      case 'compress': if (t) Object.assign(this.at, this.biteAt(t)); this.mouth = 0;
        if (A >= DRAGON.compress) { if (t && this.bitten) this.hit(Math.round(DRAGON.blast * this.mul), this.id, 'blast'); this.phaseTo('explode'); } break;
      case 'explode': if (A >= DRAGON.dissipate) { this.active = false; this.phase = 'idle'; this.event('finish'); return; } break;
    }
    if (this.phase !== 'channel') {
      const dx = h.x - prev.x, dy = h.y - prev.y, dz = h.z - prev.z, l = Math.hypot(dx, dy, dz);
      if (l > 1e-5) { const k = Math.min(1, dt * 12); this.dir = { x: this.dir.x + (dx / l - this.dir.x) * k, y: this.dir.y + (dy / l - this.dir.y) * k, z: this.dir.z + (dz / l - this.dir.z) * k }; }
      this.push();
    }
  }
}
