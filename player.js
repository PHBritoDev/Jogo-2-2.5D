'use strict';

/* ============================================================
   PLAYER — movimento analógico, gravidade, pulo, colisão e
   COMBATE (ataque corpo a corpo, defesa, vida, knockback, morte)
   Coordenadas: x/y = chão do mundo, z = altura acima do chão
   ============================================================ */
const Player = {
  type: 'player',
  x: 0, y: 0, z: 0,
  vx: 0, vy: 0, vz: 0,   // velocidade de movimento (input)
  kx: 0, ky: 0,          // velocidade de knockback/impulso (decai sozinha)
  r: CFG.PLAYER.radius,
  onGround: true,
  floor: 0,
  fx: 0, fy: 1,
  speed: 0,
  anim: 0,
  squash: 0,
  coyote: 0,
  buffer: 0,
  dustT: 0,
  sy: 0,
  _solids: [],

  // ----- combate -----
  hp: 1, maxHp: 1, trail: 1, trailDelay: 0,
  attackT: -1,           // -1 = não está atacando
  attackId: 0,           // identifica cada golpe (evita dano repetido)
  atkBuf: 0, atkCool: 0,
  atkDirX: 0, atkDirY: 1,
  blocking: false, blockFlash: 0,
  hurtT: 0, blinkT: 0, invuln: 0, stun: 0,
  dead: false, deadT: 0,

  spawn(x, y) {
    this.x = x; this.y = y; this.z = 0;
    this.vx = this.vy = this.vz = 0;
    this.kx = this.ky = 0;
    this.onGround = true;
    this.floor = 0;
    this.sy = y;
    this.fx = 0; this.fy = 1;
    this.squash = 0;
    this.maxHp = CFG.COMBAT.playerHP;
    this.hp = this.maxHp; this.trail = this.hp; this.trailDelay = 0;
    this.attackT = -1; this.atkBuf = 0; this.atkCool = 0;
    this.blocking = false; this.blockFlash = 0;
    this.hurtT = 0; this.blinkT = 0; this.invuln = 0; this.stun = 0;
    this.dead = false; this.deadT = 0;
  },

  _dustColor() {
    switch (World.tileAt(this.x, this.y)) {
      case T.DIRT: return '#cdb58a';
      case T.SAND: return '#efe0b0';
      case T.STONE: return '#cfcfcf';
      case T.DARK: return '#8fbf80';
      default: return '#b9e0a0';
    }
  },

  // A hitbox do ataque só existe nesta janela de tempo
  isAttackActive() {
    return this.attackT >= CFG.COMBAT.hitStart && this.attackT <= CFG.COMBAT.hitEnd;
  },

  _startAttack(ax, ay) {
    const C = CFG.COMBAT;
    let dx = ax, dy = ay;
    const m = Math.hypot(dx, dy);
    if (m > 0.3) { dx /= m; dy /= m; }
    else { const f = Math.hypot(this.fx, this.fy) || 1; dx = this.fx / f; dy = this.fy / f; }
    this.atkDirX = dx; this.atkDirY = dy;
    this.fx = dx; this.fy = dy;
    this.attackT = 0;
    this.attackId++;
    this.atkBuf = 0;
    this.kx += dx * C.lunge;
    this.ky += dy * C.lunge;
  },

  // Chamado pelo inimigo. Retorna o dano aplicado.
  hurt(dmg, fromX, fromY, kb) {
    if (this.dead || this.invuln > 0) return 0;
    const C = CFG.COMBAT;
    let dx = this.x - fromX, dy = this.y - fromY;
    const d = Math.hypot(dx, dy) || 1;
    dx /= d; dy /= d;
    const gy = this.y - this.z - 16;

    if (this.blocking) {
      dmg = Math.max(1, Math.round(dmg * (1 - C.blockReduce)));
      kb *= C.blockKb;
      this.blockFlash = 0.2;
      this.invuln = 0.25;
      Ambient.spawnSpark(this.x + dx * -8, gy, 7, '#9fd4ff');
      Combat.addText(this.x, this.y - this.z - 42, '-' + dmg, '#9fd4ff');
    } else {
      this.stun = C.playerStun;
      this.hurtT = 0.18;
      this.blinkT = C.invuln;
      this.invuln = C.invuln;
      this.attackT = -1;
      this.atkBuf = 0;
      this.vz = Math.max(this.vz, C.hurtPop);
      this.onGround = false;
      Ambient.spawnSpark(this.x, gy, 9, '#ff9a8a');
      Combat.addText(this.x, this.y - this.z - 42, '-' + dmg, '#ff5a5a');
      Camera.shake = Math.min(6, Camera.shake + 4);
      Game.hitstop = C.hitstop;
      Combat.hurtFlash();
    }

    this.kx = dx * kb;
    this.ky = dy * kb;
    this.hp = Math.max(0, this.hp - dmg);
    this.trailDelay = 0.45;

    if (this.hp <= 0) {
      this.dead = true;
      this.deadT = 0;
      this.blocking = false;
      this.kx *= 1.3; this.ky *= 1.3;
      this.vz = Math.max(this.vz, 160);
      this.onGround = false;
    }
    return dmg;
  },

  update(dt, axis, jumpPressed, jumpHeld, attackPressed, defendHeld) {
    const P = CFG.PLAYER, C = CFG.COMBAT;
    let ax = axis.x, ay = axis.y;

    // ----- Timers -----
    this.hurtT = Math.max(0, this.hurtT - dt);
    this.blinkT = Math.max(0, this.blinkT - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    this.blockFlash = Math.max(0, this.blockFlash - dt);
    this.stun = Math.max(0, this.stun - dt);
    this.atkCool = Math.max(0, this.atkCool - dt);

    const canAct = !this.dead && this.stun <= 0;
    if (this.dead) this.deadT += dt;
    if (!canAct) { ax = 0; ay = 0; jumpPressed = false; jumpHeld = false; attackPressed = false; defendHeld = false; }

    // ----- Defesa e ataque (nunca ao mesmo tempo) -----
    this.blocking = defendHeld && this.attackT < 0;
    if (attackPressed) this.atkBuf = C.attackBuffer; else this.atkBuf = Math.max(0, this.atkBuf - dt);
    if (this.blocking) this.atkBuf = 0;
    if (this.atkBuf > 0 && canAct && !this.blocking && this.attackT < 0 && this.atkCool <= 0) {
      this._startAttack(ax, ay);
    }
    if (this.attackT >= 0) {
      this.attackT += dt;
      if (this.attackT >= C.attackDur) { this.attackT = -1; this.atkCool = C.attackCooldown; }
    }

    // ----- Velocidade horizontal (analógica e suavizada) -----
    let mul = 1;
    if (this.blocking) mul = C.blockSpeed;
    else if (this.attackT >= 0) mul = C.atkSpeed;
    const k = 1 - Math.exp(-(this.onGround ? P.accelGround : P.accelAir) * dt);
    this.vx += (ax * P.speed * mul - this.vx) * k;
    this.vy += (ay * P.speed * mul - this.vy) * k;

    // ----- Pulo (com coyote time e buffer) -----
    if (jumpPressed) this.buffer = P.buffer; else this.buffer = Math.max(0, this.buffer - dt);
    this.coyote = this.onGround ? P.coyote : Math.max(0, this.coyote - dt);
    if (this.buffer > 0 && this.coyote > 0) {
      this.vz = P.jumpV;
      this.onGround = false;
      this.coyote = 0;
      this.buffer = 0;
      this.squash = 0.22;
      Ambient.spawnDust(this.x, this.y - this.floor, 5, this._dustColor(), 1);
    }

    // ----- Gravidade (soltar o botão encurta o pulo) -----
    if (!jumpHeld && this.vz > 0 && !this.dead && this.stun <= 0) this.vz -= P.gravity * 1.2 * dt;
    this.vz -= P.gravity * dt;
    this.z += this.vz * dt;

    // ----- Movimento + knockback, com colisão de água (eixo por eixo) -----
    let nx = this.x + (this.vx + this.kx) * dt;
    let ny = this.y + (this.vy + this.ky) * dt;
    if (World.blocked(nx, this.y, this.r)) { nx = this.x; this.vx = 0; this.kx = 0; }
    if (World.blocked(nx, ny, this.r)) { ny = this.y; this.vy = 0; this.ky = 0; }
    this.x = nx;
    this.y = ny;
    const kd = Math.exp(-9 * dt);
    this.kx *= kd; this.ky *= kd;

    // ----- Limites do mapa -----
    const pad = CFG.BOUNDS_PAD;
    this.x = U.clamp(this.x, pad, World.w - pad);
    this.y = U.clamp(this.y, pad, World.h - pad);

    // ----- Colisão com objetos sólidos -----
    World.solidsNear(this.x, this.y, this._solids);
    const list = this._solids;
    for (let it = 0; it < 2; it++) {
      for (let i = 0; i < list.length; i++) {
        const o = list[i];
        if (o.type === 'rock' && this.z + 6 >= o.h) continue;
        let dx = this.x - o.x, dy = this.y - o.y;
        const minD = o.r + this.r;
        const d2 = dx * dx + dy * dy;
        if (d2 < minD * minD) {
          const d = Math.sqrt(d2);
          if (d < 0.001) { dx = 1; dy = 0; } else { dx /= d; dy /= d; }
          this.x = o.x + dx * minD;
          this.y = o.y + dy * minD;
        }
      }
    }
    this.x = U.clamp(this.x, pad, World.w - pad);
    this.y = U.clamp(this.y, pad, World.h - pad);

    // ----- Superfície sob os pés (chão ou topo de pedra) -----
    let floor = 0;
    let sortY = this.y;
    for (let i = 0; i < list.length; i++) {
      const o = list[i];
      if (o.type !== 'rock') continue;
      const d = Math.hypot(this.x - o.x, this.y - o.y);
      if (d < o.r + 3 && o.h > floor) floor = o.h;
      if (d < o.r + this.r + 4 && this.z + 6 >= o.h) sortY = Math.max(sortY, o.y + 1);
    }
    this.floor = floor;
    this.sy = sortY;

    // ----- Pouso -----
    const wasAir = !this.onGround;
    const prevVz = this.vz;
    if (this.z <= floor + 0.001 && this.vz <= 0) {
      if (wasAir && prevVz < -180) {
        this.squash = -0.28 * Math.min(1, -prevVz / 700);
        Ambient.spawnDust(this.x, this.y - floor, 7, this._dustColor(), 1.3);
      }
      this.z = floor;
      this.vz = 0;
      this.onGround = true;
    } else {
      this.onGround = false;
    }

    // ----- Animação -----
    this.speed = Math.hypot(this.vx, this.vy);
    if (this.speed > 8 && this.attackT < 0 && !this.dead) {
      const f = Math.min(1, dt * 14);
      this.fx += (this.vx / this.speed - this.fx) * f;
      this.fy += (this.vy / this.speed - this.fy) * f;
    }
    if (this.onGround) this.anim += dt * this.speed * 0.075;
    this.squash *= Math.exp(-12 * dt);

    // Poeira ao correr
    if (this.onGround && this.speed > 90 && !this.dead) {
      this.dustT -= dt;
      if (this.dustT <= 0) {
        this.dustT = 0.11;
        Ambient.spawnDust(this.x, this.y - floor, 1, this._dustColor(), 0.4);
      }
    }
  },

  draw(ctx) {
    const C = CFG.COMBAT;
    const h = this.z - this.floor;
    const gy = this.y - this.floor;

    // Sombra no chão/superfície
    const ss = 1 - Math.min(h, 120) / 240;
    ctx.fillStyle = 'rgba(10,30,15,' + (0.3 * ss).toFixed(3) + ')';
    ctx.beginPath();
    ctx.ellipse(this.x, gy, 11 * ss + 2, 4.5 * ss + 1, 0, 0, 6.2832);
    ctx.fill();

    const moving = this.onGround && this.speed > 8 && !this.dead;
    const s = Math.sin(this.anim);
    const bob = moving ? Math.abs(s) * 2 : 0;
    const flash = this.hurtT > 0;

    ctx.save();
    ctx.translate(this.x, this.y - this.z);

    // Pisca enquanto está invulnerável após levar dano
    if (this.blinkT > 0 && !this.dead && ((Game.time * 20) | 0) % 2 === 0) ctx.globalAlpha = 0.45;

    // Caído ao morrer
    if (this.dead) {
      ctx.rotate(Math.min(1, this.deadT * 3) * (this.fx >= 0 ? 1 : -1) * 1.5);
      ctx.globalAlpha = 0.9;
    }

    ctx.scale(1 - this.squash * 0.7, 1 + this.squash - (this.blocking ? 0.08 : 0));

    // Pés
    let lf = 0, rf = 0;
    if (moving) { lf = -Math.max(0, s) * 3; rf = -Math.max(0, -s) * 3; }
    else if (!this.onGround) { lf = rf = -2; }
    ctx.fillStyle = '#3a2a20';
    ctx.beginPath(); ctx.ellipse(-4, -1.5 + lf, 4, 2.6, 0, 0, 6.2832); ctx.fill();
    ctx.beginPath(); ctx.ellipse(4, -1.5 + rf, 4, 2.6, 0, 0, 6.2832); ctx.fill();

    ctx.translate(0, -bob);

    // Corpo (túnica)
    ctx.fillStyle = flash ? '#ffffff' : '#3d6fd1';
    ctx.beginPath(); ctx.ellipse(0, -14, 8.5, 9, 0, 0, 6.2832); ctx.fill();
    ctx.fillStyle = flash ? '#ffffff' : '#f0c040';
    ctx.fillRect(-7.6, -12, 15.2, 2.4);

    // Braços
    const sw = moving ? s * 2.5 : (this.onGround ? 0 : -2.5);
    ctx.fillStyle = flash ? '#ffffff' : '#2f58ac';
    ctx.beginPath(); ctx.arc(-9.5, -14 + sw, 2.8, 0, 6.2832); ctx.fill();
    ctx.beginPath(); ctx.arc(9.5, -14 - sw, 2.8, 0, 6.2832); ctx.fill();

    // Cabeça
    ctx.fillStyle = flash ? '#ffffff' : '#f4cba3';
    ctx.beginPath(); ctx.arc(0, -28, 8, 0, 6.2832); ctx.fill();

    // Cabelo (cobre tudo quando está de costas)
    ctx.fillStyle = flash ? '#ffffff' : '#4a2e1a';
    ctx.beginPath();
    if (this.fy < -0.4) ctx.arc(0, -28, 8.4, 0, 6.2832);
    else ctx.arc(0, -28.4, 8.4, Math.PI, 6.2832);
    ctx.fill();

    // Olhos (indicam a direção)
    if (this.fy > -0.4 && !this.dead) {
      const ex = this.fx * 3.2, ey = -27 + this.fy * 1.5;
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.arc(ex - 2.6, ey, 1.1, 0, 6.2832); ctx.fill();
      ctx.beginPath(); ctx.arc(ex + 2.6, ey, 1.1, 0, 6.2832); ctx.fill();
    }

    // ----- Soco: braço estica na direção do ataque + arco de impacto -----
    if (this.attackT >= 0) {
      const p = this.attackT / C.attackDur;
      const dx = this.atkDirX, dy = this.atkDirY;
      const ext = Math.sin(Math.min(1, p / 0.7) * Math.PI) * (C.reach + 6);
      const fxp = dx * ext, fyp = dy * ext * 0.6 - 14;
      ctx.strokeStyle = '#2f58ac';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(dx * 8, -14); ctx.lineTo(fxp, fyp); ctx.stroke();
      ctx.fillStyle = '#f4cba3';
      ctx.beginPath(); ctx.arc(fxp, fyp, 4.4, 0, 6.2832); ctx.fill();

      const fade = 1 - (this.attackT - C.hitStart) / (C.hitEnd + 0.12 - C.hitStart);
      if (fade > 0 && this.attackT >= C.hitStart - 0.02) {
        const a = Math.atan2(dy, dx);
        ctx.globalAlpha = Math.min(1, fade) * 0.9;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(dx * C.reach, dy * C.reach * 0.6 - 12, C.hitR, C.hitR * 0.75, 0, a - 1.2, a + 1.2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    // ----- Escudo de defesa -----
    if (this.blocking) {
      const bright = this.blockFlash > 0;
      ctx.fillStyle = bright ? 'rgba(220,240,255,0.55)' : 'rgba(120,190,255,0.25)';
      ctx.strokeStyle = bright ? 'rgba(255,255,255,0.95)' : 'rgba(150,210,255,0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(this.fx * 11, this.fy * 6 - 15, 15, 19, 0, 0, 6.2832);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }
};
