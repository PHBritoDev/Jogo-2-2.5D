/**
 * Mod 315 — camada única de resolução de dano + escudo esférico hexagonal (protagonista, Demônio1 e futuros).
 *
 * Lógica pura (sem Three/DOM, relógio injetado em segundos): o mesmo resultado a 20, 60 ou 144 FPS. Todo dano que
 * chega a uma entidade com escudo — golpe físico, espada, arco de energia, projétil, magia em área — passa por
 * resolveHit(); o desenho (shield-vfx3d.js) só lê o estado.
 *
 * Regras (pedido do criador):
 *  - duração máxima 2,7 s desde a ativação; termina ao expirar OU ao quebrar;
 *  - recarga de 8,0 s começa quando o escudo DESAPARECE (nunca na ativação);
 *  - golpes normais drenam durabilidade e são mitigados; o que sobra passa ao corpo;
 *  - magias em área: no máximo um tique por fonte a cada `areaTick` s (independente do FPS), drenagem reduzida;
 *  - golpe direto acima do limiar `breakAt` rompe o escudo na hora e transmite o dano INTEGRAL;
 *  - durabilidade zerada por acúmulo: quebra, e só o excedente passa;
 *  - i-frames do corpo têm prioridade (o escudo não é drenado por quem não acertaria); escudo não dá i-frames;
 *  - escudo não imobiliza: nada aqui trava movimento.
 */
export const SHIELD_SPECS = Object.freeze({
  hero: Object.freeze({ id: 'hero', duration: 2.7, cooldown: 8.0, durability: 120, mitigation: .85, drain: 1, areaDrain: .55, areaTick: .3, breakAt: 46, radiusK: .6, skin: 'celeste',
    colors: { core: 0x9fe6ff, edge: 0xe9fbff, glow: 0x5fb8ff, crack: 0xffffff } }),
  demon1: Object.freeze({ id: 'demon1', duration: 2.7, cooldown: 9.5, durability: 70, mitigation: .75, drain: 1.1, areaDrain: .6, areaTick: .3, breakAt: 38, radiusK: .6, skin: 'abismo',
    colors: { core: 0x2a0b3d, edge: 0xb04dff, glow: 0x7a2cff, crack: 0xe6b3ff } }),
});

const AREA_KINDS = new Set(['area', 'aoe', 'judgment', 'beam', 'claws', 'zone', 'field', 'burn', 'tick']);
/** Classifica um golpe: área (tiques deduplicados) ou direto (pode romper). */
export function isArea(hit) { return !!(hit && (hit.area || AREA_KINDS.has(hit.kind))); }

export class EnergyShield {
  constructor(spec = SHIELD_SPECS.hero) { this.spec = spec; this.reset(); }
  reset() { this.state = 'ready'; this.hp = this.spec.durability; this.since = -1e9; this.until = -1e9; this.readyAt = -1e9; this.endedAt = -1e9; this.endReason = null; this.ticks = new Map(); this.impacts = []; this.serial = 0; }
  get active() { return this.state === 'active'; }
  /** 0 = intacto, 1 = prestes a romper (fissuras do VFX). */
  get damage() { return 1 - this.hp / this.spec.durability; }
  canActivate(now) { this.update(now); return this.state === 'ready'; }
  activate(now) {
    if (!this.canActivate(now)) return false;
    this.state = 'active'; this.hp = this.spec.durability; this.since = now; this.until = now + this.spec.duration; this.endReason = null; this.ticks.clear(); this.impacts.length = 0; this.serial++;
    return true;
  }
  /** Encerra (expirou/quebrou/cancelado) e só então começa a recarga. */
  end(now, reason = 'expired') {
    if (this.state !== 'active') return false;
    this.state = 'cooldown'; this.endedAt = now; this.readyAt = now + this.spec.cooldown; this.endReason = reason; this.ticks.clear();
    return true;
  }
  update(now) {
    if (this.state === 'active' && now >= this.until - 1e-9) this.end(this.until, 'expired');
    if (this.state === 'cooldown' && now >= this.readyAt - 1e-9) { this.state = 'ready'; this.hp = this.spec.durability; }
    for (let i = this.impacts.length - 1; i >= 0; i--) if (now - this.impacts[i].t > .6) this.impacts.splice(i, 1);
    return this.state;
  }
  /** Fração de recarga para o HUD: 1 = pronto. */
  readiness(now) { this.update(now); if (this.state === 'ready') return 1; if (this.state === 'active') return 0; return Math.max(0, Math.min(1, 1 - (this.readyAt - now) / this.spec.cooldown)); }
  remaining(now) { return this.state === 'active' ? Math.max(0, this.until - now) : 0; }
  cooldownLeft(now) { this.update(now); return this.state === 'cooldown' ? Math.max(0, this.readyAt - now) : 0; }
  /**
   * hit: { dmg, kind, source (id da fonte para deduplicar área), area?, dir?: {x,y,z} (de onde veio) }.
   * Devolve { passed, absorbed, broke, ignored, reason }.
   */
  absorb(hit, now) {
    this.update(now);
    const dmg = Math.max(0, Number(hit && hit.dmg) || 0);
    if (this.state !== 'active' || dmg <= 0) return { passed: dmg, absorbed: 0, broke: false, ignored: false, reason: 'inactive' };
    const S = this.spec, area = isArea(hit);
    if (area) {
      const key = String(hit.source ?? hit.kind ?? 'area'), last = this.ticks.get(key);
      if (last !== undefined && now - last < S.areaTick - 1e-9) return { passed: 0, absorbed: 0, broke: false, ignored: true, reason: 'tick' };
      this.ticks.set(key, now);
    } else if (dmg >= S.breakAt) {
      // impacto extremo: rompe na hora e o corpo recebe o golpe inteiro
      this.hp = 0; this.mark(hit, now, 1); this.end(now, 'broken');
      return { passed: dmg, absorbed: 0, broke: true, ignored: false, reason: 'overwhelmed' };
    }
    const drain = dmg * (area ? S.areaDrain : S.drain);
    if (drain >= this.hp) {
      const used = this.hp, overflow = (drain - used) / (area ? S.areaDrain : S.drain);
      this.hp = 0; this.mark(hit, now, 1); this.end(now, 'broken');
      const passed = Math.round(overflow + (dmg - overflow) * (1 - S.mitigation));
      return { passed, absorbed: dmg - passed, broke: true, ignored: false, reason: 'depleted' };
    }
    this.hp -= drain; this.mark(hit, now, drain / S.durability);
    const passed = Math.round(dmg * (1 - S.mitigation));
    return { passed, absorbed: dmg - passed, broke: false, ignored: false, reason: area ? 'area' : 'hit' };
  }
  mark(hit, now, power) { const d = hit && hit.dir; this.impacts.push({ t: now, x: d ? d.x : 0, y: d ? d.y : 0, z: d ? d.z : 1, power: Math.min(1, power * 4 + .2) }); if (this.impacts.length > 8) this.impacts.shift(); }
}

/**
 * Resolução única de dano numa entidade: i-frames → escudo → corpo. `body` é um objeto do jogo com
 * { invulnerable(now) → bool, apply(amount, hit) }. Devolve 'evaded' | 'shield' | 'broke' | 'hit'.
 */
export function resolveHit(hit, now, { shield = null, body }) {
  if (body.invulnerable && body.invulnerable(now)) return { result: 'evaded', passed: 0 };
  let passed = Math.max(0, Number(hit.dmg) || 0), out = null;
  if (shield) { out = shield.absorb(hit, now); passed = out.passed; }
  if (out && out.ignored) return { result: 'shield', passed: 0, shield: out };
  if (passed > 0) body.apply(passed, hit, out);
  return { result: out && out.broke ? 'broke' : out && out.absorbed > 0 ? (passed > 0 ? 'shield-chip' : 'shield') : 'hit', passed, shield: out };
}
