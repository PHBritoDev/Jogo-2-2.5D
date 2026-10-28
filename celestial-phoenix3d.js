/**
 * MOD 229 — Tornado da Fênix Celestial: máquina de estados explícita, combate a 120 Hz fixos (o render nunca aplica dano)
 * e uma única identidade de alvo durante todo o lançamento.
 *
 * cast → form → flight → capture → burst → orbit (2 voltas) → ascend (sobe e pausa no ápice) → dive → impact → burn → fade
 *
 * Orçamento de dano (base 77, igual ao da versão anterior, multiplicado pelo nível): captura 6×3, explosão do tornado 16,
 * mergulho 28, queimadura 3×5. Na captura o alvo é preso num ciclone ancorado no ponto do encontro: `hold` diz ao jogo o
 * deslocamento visual em espiral (o jogo pausa a IA e restaura posição, física e animação ao soltar). Chefes resistem:
 * recebem o dano inteiro, mas `hold.resist` mantém o corpo no chão, só com tremor.
 */
export const PHOENIX = Object.freeze({
  cast: .7, form: .8, flight: 2.4, speed: 8,
  capture: 3, captureTicks: 6, captureTick: 3,
  burst: .8, burstDamage: 16,
  orbit: 2.4, turns: 2,
  ascend: 1.15, apex: 14, apexHold: .35,
  dive: .55, final: 28, impact: .6,
  burn: 3, burnTicks: 3, tick: 5
});
export const PHOENIX_TOTAL = PHOENIX.captureTicks * PHOENIX.captureTick + PHOENIX.burstDamage + PHOENIX.final + PHOENIX.burnTicks * PHOENIX.tick;
const smooth = k => { k = Math.min(1, Math.max(0, k)); return k * k * (3 - 2 * k); };

export class CelestialPhoenix {
  constructor({ hit = () => {}, blocked = () => false, ground = () => 0, event = () => {} } = {}) {
    Object.assign(this, { hit, blocked, ground, event, active: false, phase: 'idle', time: 0, age: 0,
      p: { x: 0, y: 0, z: 0 }, bird: { x: 0, y: 0, z: 0 }, aim: { x: 0, y: 0, z: 0 }, anchor: { x: 0, y: 0, z: 0 },
      hold: { active: false, x: 0, y: 0, z: 0, spin: 0, resist: false } });
  }
  start(source, target, yaw = 0, mul = 1) {
    if (this.active) return false;
    this.active = true; this.phase = 'cast'; this.age = this.time = this.acc = 0; this.id = target?.alive ? target.id : null;
    this.yaw = yaw; this.mul = mul; this.ticks = 0; this.angle = 0; this.source = { ...source }; this.resist = !!target?.resist;
    Object.assign(this.p, source);
    const spawnYaw = target?.alive && Math.hypot(target.x - source.x, target.z - source.z) < 4 ? yaw + Math.PI / 2 : yaw;
    this.p.x += Math.sin(spawnYaw) * 2; this.p.z += Math.cos(spawnYaw) * 2; this.p.y = this.ground(this.p.x, this.p.z);
    this.releaseHold(); this.event('cast'); return true;
  }
  releaseHold() { Object.assign(this.hold, { active: false, x: 0, y: 0, z: 0, spin: 0, resist: false }); }
  cancel() { if (!this.active && this.phase === 'idle') return; this.active = false; this.phase = 'idle'; this.releaseHold(); this.event('cancel'); }
  phaseTo(p) { this.phase = p; this.age = 0; this.event(p); }
  update(dt, target, { valid = true, paused = false } = {}) {
    if (!this.active || paused) return;
    if (!valid || (this.id !== null && (!target?.alive || target.id !== this.id))) { this.cancel(); return; }
    this.acc += Math.max(0, dt);
    while (this.acc >= 1 / 120 && this.active) { this.acc -= 1 / 120; this.step(1 / 120, this.id === null ? null : target); }
  }
  damage(n, kind) { this.hit(Math.round(n * this.mul), this.id, kind); }
  /** Raio do ciclone e da órbita: nunca dentro do corpo do alvo. */
  orbitRadius(t) { return Math.max(2.6, (t.radius || .6) + 1.8); }
  step(dt, t) {
    this.time += dt; this.age += dt; const p = this.p, A = this.age;
    switch (this.phase) {
      case 'cast': if (A >= PHOENIX.cast) this.phaseTo('form'); break;
      case 'form': if (this.blocked(p)) { this.phaseTo('fade'); return; } if (A >= PHOENIX.form) this.phaseTo('flight'); break;
      case 'flight': {
        if (t) { const desired = Math.atan2(t.x - p.x, t.z - p.z), diff = Math.atan2(Math.sin(desired - this.yaw), Math.cos(desired - this.yaw)); this.yaw += Math.max(-dt * 2, Math.min(dt * 2, diff)); }
        p.x += Math.sin(this.yaw) * PHOENIX.speed * dt; p.z += Math.cos(this.yaw) * PHOENIX.speed * dt; p.y = this.ground(p.x, p.z);
        if (this.blocked(p)) { this.phaseTo('fade'); return; }
        if (t && Math.hypot(p.x - t.x, p.z - t.z) < 1 + (t.radius || .6) && Math.abs(p.y - t.y) < 3) {
          // Não explode no toque: o tornado se ancora no ponto do encontro e prende o alvo.
          Object.assign(this.anchor, { x: t.x, y: t.y, z: t.z }); Object.assign(p, { x: t.x, y: this.ground(t.x, t.z), z: t.z });
          this.ticks = 0; this.hold.active = true; this.hold.resist = this.resist; this.phaseTo('capture');
        } else if (A >= PHOENIX.flight) this.phaseTo('fade');
        break;
      }
      case 'capture': {
        const k = smooth(A / .55), w = A * 2.6 + A * A * .25, r = this.resist ? 0 : Math.min(1.25, (t.radius || .6) * .5 + .7) * k;
        Object.assign(this.hold, { x: Math.cos(w) * r, z: Math.sin(w) * r, y: this.resist ? Math.abs(Math.sin(A * 23)) * .06 : (1.5 + .3 * Math.sin(A * 3.1)) * k, spin: this.resist ? Math.sin(A * 30) * .08 : w * 1.6 });
        const step = PHOENIX.capture / PHOENIX.captureTicks;
        while (this.ticks < PHOENIX.captureTicks && A >= (this.ticks + 1) * step - 1e-9) { this.ticks++; this.damage(PHOENIX.captureTick, 'cyclone'); }
        if (A >= PHOENIX.capture) { this.damage(PHOENIX.burstDamage, 'burst'); this.phaseTo('burst'); }
        break;
      }
      case 'burst': {
        const k = smooth(A / .3); this.hold.y *= 1 - k; this.hold.x *= 1 - k; this.hold.z *= 1 - k;     // o alvo cai de volta no chão
        if (A >= .3 && this.hold.active) this.releaseHold();
        if (A >= PHOENIX.burst) { this.startAngle = Math.atan2(this.bird.z - t.z, this.bird.x - t.x); this.detach = { ...this.bird }; this.phaseTo('orbit'); }
        break;
      }
      case 'orbit': {
        const u = Math.min(1, A / PHOENIX.orbit), k = Math.min(1, A / .25), R = this.orbitRadius(t);
        this.angle = u * Math.PI * 2 * PHOENIX.turns; const a = this.startAngle + this.angle, y = t.y + (t.height || 2) * .7 + Math.sin(this.angle * 1.5) * .45;
        const ox = t.x + Math.cos(a) * R, oz = t.z + Math.sin(a) * R;
        this.bird.x = this.detach.x + (ox - this.detach.x) * k; this.bird.z = this.detach.z + (oz - this.detach.z) * k; this.bird.y = this.detach.y + (y - this.detach.y) * k;
        if (A >= PHOENIX.orbit) { this.angle = Math.PI * 2 * PHOENIX.turns; this.from = { ...this.bird }; this.phaseTo('ascend'); }
        break;
      }
      case 'ascend': {
        const rise = PHOENIX.ascend - PHOENIX.apexHold, u = 1 - Math.pow(1 - Math.min(1, A / rise), 3);
        this.bird.x = this.from.x + (t.x + (this.from.x - t.x) * .25 - this.from.x) * u; this.bird.z = this.from.z + (t.z + (this.from.z - t.z) * .25 - this.from.z) * u;
        this.bird.y = this.from.y + (t.y + PHOENIX.apex - this.from.y) * u + (A > rise ? Math.sin((A - rise) / PHOENIX.apexHold * Math.PI) * .25 : 0);
        if (A >= PHOENIX.ascend) { this.from = { ...this.bird }; Object.assign(this.aim, { x: t.x, y: t.y + (t.height || 2) * .55, z: t.z }); this.phaseTo('dive'); }
        break;
      }
      case 'dive': {
        Object.assign(this.aim, { x: t.x, y: t.y + (t.height || 2) * .55, z: t.z });
        const u = Math.min(1, A / PHOENIX.dive), k = Math.pow(u, 2.4);
        this.bird.x = this.from.x + (this.aim.x - this.from.x) * k; this.bird.y = this.from.y + (this.aim.y - this.from.y) * k; this.bird.z = this.from.z + (this.aim.z - this.from.z) * k;
        if (u >= 1) { this.damage(PHOENIX.final, 'strike'); this.ticks = 0; this.phaseTo('impact'); }
        break;
      }
      case 'impact': Object.assign(this.aim, { x: t.x, y: t.y + (t.height || 2) * .5, z: t.z }); if (A >= PHOENIX.impact) this.phaseTo('burn'); break;
      case 'burn': {
        Object.assign(this.aim, { x: t.x, y: t.y + (t.height || 2) * .5, z: t.z });
        const step = PHOENIX.burn / PHOENIX.burnTicks;
        while (this.ticks < PHOENIX.burnTicks && A >= (this.ticks + 1) * step - 1e-9) { this.ticks++; this.damage(PHOENIX.tick, 'burn'); }
        if (A >= PHOENIX.burn) this.phaseTo('fade');
        break;
      }
      case 'fade': if (A >= .6) { this.cancel(); return; } break;
    }
    if (['cast', 'form', 'flight', 'capture', 'burst'].includes(this.phase)) {
      // A fênix circula o tornado enquanto ele anda e prende o alvo.
      const a = this.time * 4.2, r = this.phase === 'capture' || this.phase === 'burst' ? 3.3 : 2.4;
      Object.assign(this.bird, { x: p.x + Math.cos(a) * r, y: p.y + 4.4 + Math.sin(this.time * 2) * .55, z: p.z + Math.sin(a) * r });
    }
  }
}
