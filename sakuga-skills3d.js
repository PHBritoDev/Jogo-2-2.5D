/**
 * Poderes sakuga do herói (atrás da flag ?vfxSakuga=1): lógica pura, passo fixo de 120 Hz, mesma interface de
 * XRupture/TwinPortals/JudgmentDragon (start, update, cancel, active, phase, time, age). O VFX só lê este estado.
 *
 *  • Esfera da Destruição (slot 2, mesmo id/save de skill_twin_portals): mão erguida 0,4 s com pedrinhas subindo →
 *    a esfera concentra na mão → arremesso físico com leve correção → contato real (cápsula do alvo, obstáculo com
 *    altura, chão) → contração de ~3 quadros → cúpula rubro-negra (segundo dano, só perto do ponto de contato).
 *  • Explosão Celestial (slot 3, mesmo id/save de skill_judgment_dragon): estrelas convergem na ponta da arma (0–0,6 s)
 *    → círculos mágicos sobre o alvo, que só seguem o alvo até 0,9 s e depois travam (0,6–1,2 s) → pilar colossal
 *    (dano no núcleo) → onda de choque horizontal no chão (dá para saltar ou sair do raio) → dissipação.
 * Dano autoritativo aqui, uma vez por alvo por fase; nada de dano por temporizador global.
 */
const STEP = 1 / 120;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v, wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const copy = p => ({ x: p.x, y: p.y, z: p.z });

export const SPHERE = Object.freeze({ raise: .7, charge: .9, speed: 13, turn: 1.4, range: 32, r: 1.25, lift: 3.6, hit: 30, dome: 14, domeR: 3, contract: .05, domeT: .9, fade: .55 });
export class DestructionSphere {
  constructor({ ground = () => 0, blocked = () => false, hit = () => {}, event = () => {} } = {}) {
    Object.assign(this, { ground, blocked, hit, event, active: false, phase: 'idle', time: 0, age: 0, acc: 0, p: { x: 0, y: 0, z: 0 }, dir: { x: 0, y: 0, z: 1 }, at: { x: 0, y: 0, z: 0 }, hand: { x: 0, y: 0, z: 0 }, hitAt: -1, travel: 0 });
  }
  start(source, target, yaw = 0, mul = 1) {
    if (this.active) return false;
    Object.assign(this, { active: true, phase: 'raise', time: 0, age: 0, acc: 0, mul, id: target?.alive ? target.id : null, contact: false, travel: 0, hitAt: -1, yaw });
    this.source = copy(source); this.hand = { x: source.x + Math.sin(yaw) * .35, y: source.y + SPHERE.lift, z: source.z + Math.cos(yaw) * .35 };
    Object.assign(this.p, this.hand); this.event('raise', this); return true;
  }
  cancel() { if (!this.active) return; this.active = false; this.phase = 'idle'; this.event('cancel', this); }
  phaseTo(p) { this.phase = p; this.age = 0; this.event(p, this); }
  update(dt, target, { valid = true } = {}) {
    if (!this.active) return; if (!valid) { this.cancel(); return; }
    const t = this.id !== null && target?.alive && target.id === this.id ? target : null;
    this.acc += Math.max(0, Math.min(dt, .25)); while (this.acc >= STEP && this.active) { this.acc -= STEP; this.step(STEP, t); }
  }
  step(dt, t) {
    this.time += dt; this.age += dt; const A = this.age;
    if (this.phase === 'raise') { if (A >= SPHERE.raise) this.phaseTo('charge'); return; }
    if (this.phase === 'charge') {
      if (A >= SPHERE.charge) { const aim = t ? { x: t.x, y: t.y + (t.height || 1.8) * .5, z: t.z } : { x: this.hand.x + Math.sin(this.yaw) * 20, y: this.hand.y - 1, z: this.hand.z + Math.cos(this.yaw) * 20 };
        const dx = aim.x - this.p.x, dy = aim.y - this.p.y, dz = aim.z - this.p.z, l = Math.hypot(dx, dy, dz) || 1; this.dir = { x: dx / l, y: dy / l, z: dz / l }; this.phaseTo('fly'); }
      return;
    }
    if (this.phase === 'fly') {
      if (t) { const rx = t.x - this.p.x, rz = t.z - this.p.z, want = Math.atan2(rx, rz), cur = Math.atan2(this.dir.x, this.dir.z), turn = clamp(wrap(want - cur), -SPHERE.turn * dt, SPHERE.turn * dt), h = Math.hypot(this.dir.x, this.dir.z); this.dir.x = Math.sin(cur + turn) * h; this.dir.z = Math.cos(cur + turn) * h; }
      const a = copy(this.p), s = SPHERE.speed * dt; this.p.x += this.dir.x * s; this.p.y += this.dir.y * s; this.p.z += this.dir.z * s; this.travel += s;
      if (t) { const ex = this.p.x - a.x, ez = this.p.z - a.z, l2 = ex * ex + ez * ez || 1, u = clamp(((t.x - a.x) * ex + (t.z - a.z) * ez) / l2, 0, 1), cx = a.x + ex * u, cz = a.z + ez * u;
        if (Math.hypot(t.x - cx, t.z - cz) <= (t.radius || .6) + SPHERE.r && this.p.y >= t.y - .3 && this.p.y <= t.y + (t.height || 1.8) + SPHERE.r) { this.p.x = cx; this.p.z = cz; this.contact = true; this.hit(Math.round(SPHERE.hit * this.mul), this.id, 'sphere'); return this.impact('target'); } }
      if (this.p.y <= this.ground(this.p.x, this.p.z) + .2) return this.impact('ground');
      if (this.blocked(this.p)) return this.impact('wall');
      if (this.travel >= SPHERE.range) return this.impact('fizzle');
      return;
    }
    if (this.phase === 'contract') { if (A >= SPHERE.contract) { if (t && this.contact && Math.hypot(t.x - this.at.x, t.z - this.at.z) <= SPHERE.domeR + (t.radius || .6)) this.hit(Math.round(SPHERE.dome * this.mul), this.id, 'dome'); this.phaseTo('dome'); } return; }
    if (this.phase === 'dome') { if (A >= SPHERE.domeT) this.phaseTo('fade'); return; }
    if (this.phase === 'fade' && A >= SPHERE.fade) { this.active = false; this.phase = 'idle'; this.event('finish', this); }
  }
  impact(why) { Object.assign(this.at, this.p); this.why = why; this.hitAt = this.time; this.phaseTo('contract'); this.event('impact', this); }
}

// Mais lenta (sem exagero): carga 0,9 s, círculos 0,9 s, e o feixe DESCE do céu até o alvo (0,45 s) antes de explodir.
export const CELESTIAL = Object.freeze({ charge: .9, circles: .9, follow: .45, pillar: 2, fade: 1.1, coreR: 3.8, pillarDmg: 40, waveR: 10, waveT: .7, waveH: .5, waveDmg: 26, strike: .45, waveAt: .6 });
export class CelestialExplosion {
  constructor({ ground = () => 0, blocked = () => false, hit = () => {}, event = () => {} } = {}) {
    Object.assign(this, { ground, blocked, hit, event, active: false, phase: 'idle', time: 0, age: 0, acc: 0, at: { x: 0, y: 0, z: 0 }, tip: { x: 0, y: 0, z: 0 }, front: 0 });
  }
  start(source, target, yaw = 0, mul = 1) {
    if (this.active) return false;
    Object.assign(this, { active: true, phase: 'charge', time: 0, age: 0, acc: 0, mul, id: target?.alive ? target.id : null, struck: false, waved: false, front: 0, yaw });
    this.source = copy(source); this.tip = { x: source.x + Math.sin(yaw) * .7, y: source.y + 2.1, z: source.z + Math.cos(yaw) * .7 };
    const p = target?.alive ? target : { x: source.x + Math.sin(yaw) * 12, z: source.z + Math.cos(yaw) * 12 }; this.at = { x: p.x, y: this.ground(p.x, p.z), z: p.z };
    this.event('charge', this); return true;
  }
  cancel() { if (!this.active) return; this.active = false; this.phase = 'idle'; this.event('cancel', this); }
  phaseTo(p) { this.phase = p; this.age = 0; this.event(p, this); }
  update(dt, target, { valid = true } = {}) {
    if (!this.active) return; if (!valid) { this.cancel(); return; }
    const t = this.id !== null && target?.alive && target.id === this.id ? target : null;
    this.acc += Math.max(0, Math.min(dt, .25)); while (this.acc >= STEP && this.active) { this.acc -= STEP; this.step(STEP, t); }
  }
  step(dt, t) {
    this.time += dt; this.age += dt; const A = this.age;
    if (this.phase === 'charge') { if (t) { this.at.x = t.x; this.at.z = t.z; this.at.y = this.ground(t.x, t.z); } if (A >= CELESTIAL.charge) this.phaseTo('circles'); return; }
    if (this.phase === 'circles') { // segue o alvo só no começo, depois TRAVA: dá para sair do raio
      if (t && A < CELESTIAL.follow) { const k = Math.min(1, dt * 6); this.at.x += (t.x - this.at.x) * k; this.at.z += (t.z - this.at.z) * k; this.at.y = this.ground(this.at.x, this.at.z); }
      if (A >= CELESTIAL.circles) this.phaseTo('pillar'); return;
    }
    if (this.phase === 'pillar') {
      if (!this.struck && A >= CELESTIAL.strike) { this.struck = true; if (t && Math.hypot(t.x - this.at.x, t.z - this.at.z) <= CELESTIAL.coreR + (t.radius || .6) * .5) this.hit(Math.round(CELESTIAL.pillarDmg * this.mul), this.id, 'pillar'); this.event('strike', this); }
      if (A >= CELESTIAL.waveAt) { const prev = this.front; this.front = CELESTIAL.waveR * Math.min(1, (A - CELESTIAL.waveAt) / CELESTIAL.waveT);
        if (t && !this.waved) { const d = Math.hypot(t.x - this.at.x, t.z - this.at.z); if (d >= prev - (t.radius || .6) - .4 && d <= this.front + (t.radius || .6) && (t.y || 0) - this.ground(t.x, t.z) <= CELESTIAL.waveH) { this.waved = true; this.hit(Math.round(CELESTIAL.waveDmg * this.mul), this.id, 'wave'); } } }
      if (A >= CELESTIAL.pillar) this.phaseTo('fade'); return;
    }
    if (this.phase === 'fade' && A >= CELESTIAL.fade) { this.active = false; this.phase = 'idle'; this.event('finish', this); }
  }
}
