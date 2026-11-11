/**
 * Mod 314 — mobilidade compartilhada (protagonista e Demônio1): dash com recarga ÚNICA de 0,50 s contada desde a
 * ativação e dois saltos por sequência aérea (chão + um no ar). Lógica pura, relógio injetado em segundos.
 *
 *  - O dash não consome salto e pode sair no chão, entre os saltos, depois do segundo e em janelas de cancelamento.
 *  - O segundo salto só existe no ar e só volta ao tocar o chão de verdade (land()); bordas/declives que fazem
 *    "grounded" piscar sem pouso real não devolvem saltos (land exige queda/contato confirmado pelo host).
 *  - O salto não cancela um dash em andamento de forma abrupta: o host decide a transição (dashThenJump).
 */
export const MOBILITY = Object.freeze({ dashCooldown: .5, maxJumps: 2, airJumpK: .92, coyote: .09 });

export class Mobility2 {
  constructor({ dashCooldown = MOBILITY.dashCooldown, maxJumps = MOBILITY.maxJumps } = {}) { this.dashCooldown = dashCooldown; this.maxJumps = maxJumps; this.reset(); }
  reset() { this.jumps = 0; this.airborne = false; this.lastDash = -1e9; this.dashes = 0; this.leftGroundAt = -1e9; }
  /** Recarga contada DESDE A ATIVAÇÃO. */
  canDash(now) { return now - this.lastDash >= this.dashCooldown - 1e-9; }
  dash(now) { if (!this.canDash(now)) return false; this.lastDash = now; this.dashes++; return true; }
  dashReadiness(now) { return Math.max(0, Math.min(1, (now - this.lastDash) / this.dashCooldown)); }
  dashLeft(now) { return Math.max(0, this.dashCooldown - (now - this.lastDash)); }
  /** grounded: o host diz se há piso sob os pés AGORA. Caiu de uma borda sem pular: salto "do chão" ainda vale por
   *  `coyote` s; depois disso a queda conta como o primeiro salto e resta só o aéreo. */
  canJump(grounded, now = 0) {
    if (!this.airborne) return true;
    return this.jumps === 0 || this.jumps < this.maxJumps;
  }
  /** Devolve 1 (salto do chão), 2 (salto aéreo) ou 0 (negado). */
  jump(grounded, now = 0) {
    if (!this.canJump(grounded, now)) return 0;
    if (!this.airborne) { this.airborne = true; this.jumps = 1; return 1; }
    if (this.jumps === 0) { if (now - this.leftGroundAt <= MOBILITY.coyote) { this.jumps = 1; return 1; } this.jumps = this.maxJumps; return this.maxJumps; }
    this.jumps++; return this.jumps;
  }
  /** Saiu do chão sem pular (caiu de uma borda). */
  leaveGround(now) { if (!this.airborne) { this.airborne = true; this.leftGroundAt = now; this.jumps = 0; } }
  /** Pouso real: devolve os saltos. */
  land() { this.airborne = false; this.jumps = 0; }
  get jumpsLeft() { return this.airborne ? (this.jumps === 0 ? 1 : Math.max(0, this.maxJumps - this.jumps)) : this.maxJumps; }
}
