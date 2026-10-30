/**
 * MOD 233 — Ruptura em X (lógica de combate, sem Three/DOM). Passo fixo de 120 Hz: o dano nunca depende do FPS.
 *
 * cast (as duas lâminas nascem e se cruzam diante do herói) → travel (o X viaja RETO no plano horizontal, rente ao
 * terreno, com leve correção de rumo para alvos que se mexem) → impact (um único acerto por colisão contínua do segmento
 * percorrido contra a cápsula do alvo) | wall (bate no obstáculo e não atravessa) | fade (alcance esgotado, sem dano).
 */
export const XRUP = Object.freeze({ cast: .45, speed: 24, range: 28, height: 1.3, halfSize: .6, damage: 38, turn: 1.1, impact: .75, fade: .6 });
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
/** Distância de um ponto ao segmento a–b (3D). */
export function pointSegment(p, a, b) {
  const x = b.x - a.x, y = b.y - a.y, z = b.z - a.z, l = x * x + y * y + z * z, t = l ? clamp(((p.x - a.x) * x + (p.y - a.y) * y + (p.z - a.z) * z) / l, 0, 1) : 0;
  return Math.hypot(p.x - a.x - x * t, p.y - a.y - y * t, p.z - a.z - z * t);
}
/** Varredura contínua: o segmento a–b passou a menos de `r` da cápsula vertical do alvo? Devolve o ponto de contato. */
export function sweptCapsule(a, b, target, r) {
  if (!target) return null; const h = target.height || 1.8, R = r + (target.radius || .5);
  for (let j = 0; j <= 5; j++) {
    const p = { x: target.x, y: target.y + h * (.12 + .76 * j / 5), z: target.z };
    if (pointSegment(p, a, b) <= R) return { x: (a.x + b.x) / 2, y: clamp((a.y + b.y) / 2, target.y + .3, target.y + h), z: (a.z + b.z) / 2 };
  }
  return null;
}
export class XRupture {
  constructor({ hit = () => {}, blocked = () => false, ground = () => 0, event = () => {} } = {}) {
    Object.assign(this, { hit, blocked, ground, event, active: false, phase: 'idle', time: 0, age: 0, p: { x: 0, y: 0, z: 0 }, dir: { x: 0, z: 1 }, at: { x: 0, y: 0, z: 0 }, traveled: 0 });
  }
  start(source, target, yaw = 0, mul = 1) {
    if (this.active) return false;
    this.active = true; this.time = this.age = this.acc = this.traveled = 0; this.phase = 'cast'; this.mul = mul; this.hitDone = false;
    this.id = target?.alive ? target.id : null;
    let dx = Math.sin(yaw), dz = Math.cos(yaw);
    if (target?.alive) { const tx = target.x - source.x, tz = target.z - source.z, d = Math.hypot(tx, tz); if (d > .3 && d < XRUP.range * 1.2) { dx = tx / d; dz = tz / d; } }
    this.dir = { x: dx, z: dz };
    this.p = { x: source.x + dx * .9, y: this.ground(source.x + dx * .9, source.z + dz * .9) + XRUP.height, z: source.z + dz * .9 };
    this.event('cast'); return true;
  }
  cancel() { if (!this.active) return; this.active = false; this.phase = 'idle'; this.event('cancel'); }
  phaseTo(p) { this.phase = p; this.age = 0; this.event(p, this); }
  update(dt, target, { valid = true, paused = false } = {}) {
    if (!this.active || paused) return;
    if (!valid) { this.cancel(); return; }
    // Alvo que morre ou é trocado no meio do voo: o X segue até dissipar, mas não acerta mais ninguém.
    const t = this.id !== null && target?.alive && target.id === this.id ? target : null;
    this.acc += Math.max(0, dt);
    while (this.acc >= 1 / 120 && this.active) { this.acc -= 1 / 120; this.step(1 / 120, t); }
  }
  step(dt, t) {
    this.time += dt; this.age += dt; const p = this.p;
    if (this.phase === 'cast') { if (this.age >= XRUP.cast) this.phaseTo('travel'); return; }
    if (this.phase === 'travel') {
      if (t) { // correção de rumo limitada: segue um alvo que anda, sem virar míssil teleguiado
        const want = Math.atan2(t.x - p.x, t.z - p.z), cur = Math.atan2(this.dir.x, this.dir.z), d = Math.atan2(Math.sin(want - cur), Math.cos(want - cur));
        const a = cur + clamp(d, -XRUP.turn * dt, XRUP.turn * dt); this.dir = { x: Math.sin(a), z: Math.cos(a) };
      }
      const prev = { ...p }, step = XRUP.speed * dt;
      p.x += this.dir.x * step; p.z += this.dir.z * step;
      const gy = this.ground(p.x, p.z) + XRUP.height; p.y += (gy - p.y) * Math.min(1, dt * 10);
      this.traveled += step;
      const hitAt = t && sweptCapsule(prev, p, t, XRUP.halfSize);
      if (hitAt) { Object.assign(this.at, hitAt); this.hitDone = true; this.hit(Math.round(XRUP.damage * this.mul), this.id, 'x'); this.phaseTo('impact'); return; }
      if (this.blocked(p)) { Object.assign(this.at, prev); Object.assign(p, prev); this.phaseTo('wall'); return; }
      if (this.traveled >= XRUP.range) { Object.assign(this.at, p); this.phaseTo('fade'); }
      return;
    }
    if ((this.phase === 'impact' || this.phase === 'wall') && this.age >= XRUP.impact) { this.finish(); return; }
    if (this.phase === 'fade' && this.age >= XRUP.fade) this.finish();
  }
  finish() { this.active = false; this.phase = 'idle'; this.event('finish'); }
}
