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
  attackDurCurrent: 0, attackHitStartCurrent: 0, attackHitEndCurrent: 0, attackCooldownCurrent: 0,
  attackId: 0,           // identifica cada golpe (evita dano repetido)
  comboStage: 0,         // estágio da sequência de espada: 0, 1 ou finalizador
  lastAttackAt: -999,
  atkBuf: 0, atkCool: 0,
  atkDirX: 0, atkDirY: 1,
  aimLocked: false,
  aimDirX: 0, aimDirY: 1,
  blocking: false, blockFlash: 0,
  hurtT: 0, damageId: 0, blinkT: 0, invuln: 0, stun: 0,
  evadeT: 0, evadeCooldown: 0, evadeInvuln: 0, evadeDirX: 0, evadeDirY: 0,
  dead: false, deadT: 0,
  knockdownT: 0, gettingUp: false, getUpT: 0,

  spawn(x, y) {
    this.x = x; this.y = y; this.z = 0;
    this.vx = this.vy = this.vz = 0;
    this.kx = this.ky = 0;
    this.onGround = true;
    this.floor = 0;
    this.sy = y;
    this.fx = 0; this.fy = 1;
    this.aimLocked = false;
    this.aimDirX = this.fx; this.aimDirY = this.fy;
    this._syncAimButton();
    this.squash = 0;
    this.maxHp = CFG.COMBAT.playerHP;
    this.hp = this.maxHp; this.trail = this.hp; this.trailDelay = 0;
    this.attackT = -1; this.atkBuf = 0; this.atkCool = 0;
    this.attackDurCurrent = CFG.COMBAT.attackDur;
    this.attackHitStartCurrent = CFG.COMBAT.hitStart;
    this.attackHitEndCurrent = CFG.COMBAT.hitEnd;
    this.attackCooldownCurrent = CFG.COMBAT.attackCooldown;
    this.comboStage = 0; this.lastAttackAt = -999;
    this.blocking = false; this.blockFlash = 0;
    this.hurtT = 0; this.damageId = 0; this.blinkT = 0; this.invuln = 0; this.stun = 0;
    this.evadeT = 0; this.evadeCooldown = 0; this.evadeInvuln = 0; this.evadeDirX = 0; this.evadeDirY = 0;
    this.dead = false; this.deadT = 0;
    this.knockdownT = 0; this.gettingUp = false; this.getUpT = 0;
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
    const C = CFG.COMBAT;
    const start = this.attackDurCurrent > 0 ? this.attackHitStartCurrent : C.hitStart;
    const end = this.attackDurCurrent > 0 ? this.attackHitEndCurrent : C.hitEnd;
    return this.attackT >= start && this.attackT <= end;
  },

  _syncAimButton() {
    const button = document.getElementById('btn-aim');
    if (!button) return;
    button.classList.toggle('on', this.aimLocked);
    button.setAttribute('aria-pressed', this.aimLocked ? 'true' : 'false');
    button.setAttribute('aria-label', this.aimLocked ? 'Desativar mira direcional' : 'Ativar mira direcional');
  },

  setAimMode(locked) {
    this.aimLocked = !!locked;
    if (this.aimLocked) {
      const length = Math.hypot(this.fx, this.fy) || 1;
      this.aimDirX = this.fx / length;
      this.aimDirY = this.fy / length;
      this.fx = this.aimDirX;
      this.fy = this.aimDirY;
    }
    this._syncAimButton();
  },

  _startAttack(ax, ay) {
    const C = CFG.COMBAT;
    let dx, dy;
    if (this.aimLocked) {
      dx = this.aimDirX; dy = this.aimDirY;
    } else {
      const bossBattle = typeof BishopDimension !== 'undefined' &&
        typeof BishopDimension.isBattleActive === 'function' && BishopDimension.isBattleActive() &&
        typeof BishopBoss !== 'undefined' && BishopBoss.state !== 'inactive' &&
        BishopBoss.state !== 'dead' && !(Number.isFinite(BishopBoss.hp) && BishopBoss.hp <= 0);
      const bossDx = bossBattle ? BishopBoss.x - this.x : 0;
      const bossDy = bossBattle ? BishopBoss.y - this.y : 0;
      const bossDistance = Math.hypot(bossDx,bossDy);
      if (bossBattle && bossDistance > 0.01 && bossDistance <= Math.max(C.autoAimRange||0,420)) {
        // Na luta do Bispo, o ataque prioriza o alvo, não a direção do joystick.
        // Isso evita virar as costas e cortar o vazio enquanto o jogador se move.
        dx = bossDx / bossDistance; dy = bossDy / bossDistance;
      } else {
        dx = ax; dy = ay;
        const m = Math.hypot(dx, dy);
        if (m > 0.3) { dx /= m; dy /= m; }
        else {
          let target = null;
          let bestDistanceSq = (C.autoAimRange || 0) * (C.autoAimRange || 0);
          const consider = function (candidate) {
            if (!candidate || !Number.isFinite(candidate.x) || !Number.isFinite(candidate.y) ||
                candidate.state === 'dead' || candidate.state === 'gone' || candidate.state === 'inactive' ||
                (Number.isFinite(candidate.hp) && candidate.hp <= 0)) return;
            const tx = candidate.x - this.x, ty = candidate.y - this.y;
            const distanceSq = tx * tx + ty * ty;
            if (distanceSq > 0.01 && distanceSq <= bestDistanceSq) { bestDistanceSq = distanceSq; target = candidate; }
          }.bind(this);
          if (typeof BishopBoss !== 'undefined' && typeof BishopDimension !== 'undefined' &&
              typeof BishopDimension.isBattleActive === 'function' && BishopDimension.isBattleActive()) consider(BishopBoss);
          if (typeof Greedling !== 'undefined') consider(Greedling);
          if (typeof Enemy !== 'undefined' && Array.isArray(Enemy.instances)) Enemy.instances.forEach(consider);
          if (target) {
            const length = Math.hypot(target.x - this.x, target.y - this.y) || 1;
            dx = (target.x - this.x) / length; dy = (target.y - this.y) / length;
          } else {
            const f = Math.hypot(this.fx, this.fy) || 1; dx = this.fx / f; dy = this.fy / f;
          }
        }
      }
    }
    this.atkDirX = dx; this.atkDirY = dy;
    this.fx = dx; this.fy = dy;
    const now = Number(Game.time) || 0;
    this.comboStage = now - this.lastAttackAt > C.comboReset ? 0 : (this.comboStage + 1) % 3;
    this.lastAttackAt = now;
    const stages = Array.isArray(C.comboStages) ? C.comboStages : null;
    const stage = stages && stages[this.comboStage] ? stages[this.comboStage] : null;
    const timing = function (key, fallback) {
      const value = Number(stage && stage[key]);
      return Number.isFinite(value) && value > 0 ? value : fallback;
    };
    this.attackDurCurrent = timing('duration', C.attackDur);
    this.attackHitStartCurrent = timing('hitStart', C.hitStart);
    this.attackHitEndCurrent = Math.max(this.attackHitStartCurrent, timing('hitEnd', C.hitEnd));
    this.attackCooldownCurrent = timing('cooldown', C.attackCooldown);
    if (window.ProtagonistaAnimationTiming) window.ProtagonistaAnimationTiming.attackDuration = this.attackDurCurrent;
    this.attackT = 0;
    this.attackId++;
    this.atkBuf = 0;
    const lungeScale = Number(stage && stage.lungeScale);
    const lunge = C.lunge * (Number.isFinite(lungeScale) && lungeScale > 0 ? lungeScale : 1);
    this.kx += dx * lunge;
    this.ky += dy * lunge;
    Sfx.swing();
  },

  // Esquiva curta: atravessa a janela inicial do golpe, mas respeita recarga e atordoamento.
  evade(axis) {
    if (this.dead || this.stun > 0 || this.knockdownT > 0 || this.gettingUp || this.evadeCooldown > 0) return false;
    if (this.attackT >= 0 && this.isAttackActive()) return false;
    axis = axis || { x: 0, y: 0 };
    let dx = Number(axis.x) || 0, dy = Number(axis.y) || 0;
    let length = Math.hypot(dx, dy);
    if (length < 0.2 && typeof BishopDimension !== 'undefined' && BishopDimension.isBattleActive() && typeof BishopBoss !== 'undefined' && BishopBoss.state !== 'inactive' && BishopBoss.state !== 'dead') {
      dx = this.x - BishopBoss.x; dy = this.y - BishopBoss.y; length = Math.hypot(dx, dy);
    }
    if (length < 0.2) { dx = -(Number(this.fx) || 0); dy = -(Number(this.fy) || 1); length = Math.hypot(dx, dy); }
    length = length || 1; dx /= length; dy /= length;
    this.evadeDirX = dx; this.evadeDirY = dy;
    this.evadeT = 0.24; this.evadeInvuln = 0.18; this.evadeCooldown = 0.92;
    this.attackT = -1; this.atkBuf = 0; this.blocking = false;
    this.atkCool = Math.max(this.atkCool, 0.08);
    this.kx = 0; this.ky = 0; this.vx = dx * 430; this.vy = dy * 430;
    this.fx = dx; this.fy = dy;
    Ambient.spawnDust(this.x, this.y - this.floor, 7, '#a7b9b0', 0.75);
    if (typeof Sfx.dash === 'function') Sfx.dash();
    else Sfx.blip();
    return true;
  },

  // Chamado pelo inimigo. Retorna o dano aplicado.
  hurt(dmg, fromX, fromY, kb, options) {
    // A esquiva tem prioridade; fora dela, o segundo impacto do combo pode atravessar invulnerabilidade comum.
    if (this.dead || this.evadeInvuln > 0 || (this.invuln > 0 && !(options && options.ignoreInvuln))) return 0;
    const C = CFG.COMBAT;
    options = options || {};
    let dx = this.x - fromX, dy = this.y - fromY;
    const d = Math.hypot(dx, dy) || 1;
    dx /= d; dy /= d;
    let facingX = this.fx, facingY = this.fy;
    // Na dimensão de Valério, o modelo parado encara o chefe; a defesa deve usar essa mesma direção,
    // não a última direção em que o jogador caminhou.
    if (this.blocking && typeof BishopDimension !== 'undefined' && BishopDimension.isBattleActive() &&
        typeof BishopBoss !== 'undefined' && BishopBoss.state !== 'inactive' && BishopBoss.state !== 'dead') {
      facingX = BishopBoss.x - this.x; facingY = BishopBoss.y - this.y;
    }
    const facingLength = Math.hypot(facingX, facingY) || 1;
    const blockFacesHit = this.blocking &&
      ((facingX * -dx + facingY * -dy) / facingLength) >= C.blockFacingDot;
    const critical = !!options.critical && !blockFacesHit;
    if (critical) dmg = Math.round(dmg * 1.55);
    // A queda é exclusiva de um crítico confirmado; golpes fortes comuns não derrubam.
    const requestKnockdown = !blockFacesHit && critical && options.knockdown === true && this.knockdownT <= 0 && !this.gettingUp;
    const gy = this.y - this.z - 16;

    // MOD 51: Defesa Perfeita — defender no instante do golpe anula o dano e abre a guarda do chefe.
    if (blockFacesHit && options.parryable === true && (this.blockHeldT || 0) <= (C.parryWindow || 0.28) &&
        typeof BishopBoss !== 'undefined' && typeof BishopBoss.parried === 'function') {
      this.blockFlash = 0.35;
      this.invuln = Math.max(this.invuln, 0.4);
      Ambient.spawnSpark(this.x + dx * -8, gy, 12, '#ffffff');
      Ambient.spawnSpark(this.x + dx * -8, gy, 8, '#9fd4ff');
      Combat.addText(this.x, this.y - this.z - 46, 'DEFESA PERFEITA', '#bfe8ff');
      Camera.shake = Math.max(Camera.shake, 3);
      Game.hitstop = Math.max(Game.hitstop, 0.09);
      if (typeof BishopDimension !== 'undefined' && typeof BishopDimension.impact === 'function') BishopDimension.impact(0.9);
      BishopBoss.parried();
      return 0.01;
    }

    if (blockFacesHit) {
      dmg = Math.max(1, Math.round(dmg * (1 - C.blockReduce)));
      kb *= C.blockKb;
      this.blockFlash = 0.2;
      this.invuln = 0.25;
      Ambient.spawnSpark(this.x + dx * -8, gy, 7, '#9fd4ff');
      Combat.addText(this.x, this.y - this.z - 42, '-' + dmg, '#9fd4ff');
      Sfx.block();
    } else {
      this.stun = C.playerStun;
      this.hurtT = Math.max(0.42, Number(C.hurtDuration) || 0.42);
      this.damageId = (Number(this.damageId) || 0) + 1;
      this.blinkT = C.invuln;
      this.invuln = C.invuln;
      if (requestKnockdown) {
        this.knockdownT = Math.max(this.knockdownT, Number(window.ProtagonistaAnimationTiming && window.ProtagonistaAnimationTiming.fallDuration) || 1.05);
        this.gettingUp = false;
        this.getUpT = 0;
        this.stun = Math.max(this.stun, 0.6);
        this.invuln = Math.max(this.invuln, 1.55);
      }
      this.attackT = -1;
      this.atkBuf = 0;
      if (requestKnockdown) {
        // A derrubada é uma transição de combate no chão, não um segundo pulo.
        this.vz = 0;
        const arenaFloor = typeof BishopDimension !== 'undefined' &&
          typeof BishopDimension.isBattleActive === 'function' && BishopDimension.isBattleActive() ? 0 : this.floor;
        this.z = arenaFloor;
        this.floor = arenaFloor;
        this.onGround = true;
      } else if (this.onGround) {
        // Dano comum provoca reação, mas não lança o jogador para cima.
        this.z = this.floor;
        this.vz = 0;
        this.onGround = true;
      } else {
        // Se já estava no ar, preserva a queda sem acrescentar impulso vertical.
        this.vz = Math.min(this.vz, 0);
      }
      Ambient.spawnSpark(this.x, gy, 9, '#ff9a8a');
      Combat.addText(this.x, this.y - this.z - 42, critical ? 'CRÍTICO! -' + dmg : (requestKnockdown ? 'DERRUBADO! -' + dmg : '-' + dmg), critical ? '#ffd166' : '#ff5a5a');
      Camera.shake = Math.min(6, Camera.shake + 4);
      Game.hitstop = C.hitstop;
      Combat.hurtFlash();
      Sfx.hurt();
    }

    this.kx = dx * kb;
    this.ky = dy * kb;
    this.hp = Math.max(0, this.hp - dmg);
    this.trailDelay = 0.45;

    if (this.hp <= 0) {
      this.dead = true;
      this.deadT = 0;
      this.knockdownT = 0; this.gettingUp = false; this.getUpT = 0;
      this.blocking = false;
      this.kx *= 1.3; this.ky *= 1.3;
      // A morte não dá um salto involuntário: a animação de queda/morte termina no chão.
      const arenaFloor = typeof BishopDimension !== 'undefined' &&
        typeof BishopDimension.isBattleActive === 'function' && BishopDimension.isBattleActive() ? 0 : this.floor;
      this.floor = arenaFloor;
      if (this.z > arenaFloor + 0.001) {
        this.vz = Math.min(this.vz, 0);
        this.onGround = false;
      } else {
        this.z = arenaFloor;
        this.vz = 0;
        this.onGround = true;
      }
      Sfx.death();
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
    this.evadeT = Math.max(0, this.evadeT - dt);
    this.evadeCooldown = Math.max(0, this.evadeCooldown - dt);
    this.evadeInvuln = Math.max(0, this.evadeInvuln - dt);
    this.atkCool = Math.max(0, this.atkCool - dt);
    if (this.knockdownT > 0) {
      this.knockdownT = Math.max(0, this.knockdownT - dt);
      if (this.knockdownT <= 0 && !this.dead) { this.gettingUp = true; this.getUpT = Number(window.ProtagonistaAnimationTiming && window.ProtagonistaAnimationTiming.getupDuration) || 1.05; }
    } else if (this.gettingUp) {
      this.getUpT = Math.max(0, this.getUpT - dt);
      if (this.getUpT <= 0) this.gettingUp = false;
    }

    const cinematicLocked = !!window.CelestialEclipseLock;
    const canAct = !cinematicLocked && !this.dead && this.stun <= 0 && this.knockdownT <= 0 && !this.gettingUp && this.evadeT <= 0;
    if (this.dead) this.deadT += dt;
    if (!canAct) { ax = 0; ay = 0; jumpPressed = false; jumpHeld = false; attackPressed = false; defendHeld = false; }
    // MOD 126: bloqueia comandos, mas mantém a gravidade para não suspender o herói no ar.
    if (cinematicLocked) { this.vx = 0; this.vy = 0; this.evadeT = 0; }

    // ----- Defesa e ataque (nunca ao mesmo tempo) -----
    this.blocking = defendHeld && this.attackT < 0 && this.evadeT <= 0;
    // MOD 51: tempo desde que a defesa foi levantada; define a janela da Defesa Perfeita.
    this.blockHeldT = this.blocking ? (this.blockHeldT || 0) + dt : 0;
    if (attackPressed) {
      // Um toque durante o golpe fica guardado até ao fim da recuperação e do cooldown.
      const attackDuration = this.attackDurCurrent > 0 ? this.attackDurCurrent : C.attackDur;
      const remainingAttack = this.attackT >= 0 ? Math.max(0, attackDuration - this.attackT) : 0;
      this.atkBuf = C.attackBuffer + remainingAttack;
    } else this.atkBuf = Math.max(0, this.atkBuf - dt);
    if (this.blocking) this.atkBuf = 0;
    if (this.atkBuf > 0 && canAct && !this.blocking && this.attackT < 0 && this.atkCool <= 0) {
      this._startAttack(ax, ay);
    }
    if (this.attackT >= 0) {
      this.attackT += dt;
      const attackDuration = this.attackDurCurrent > 0 ? this.attackDurCurrent : C.attackDur;
      if (this.attackT >= attackDuration) { this.attackT = -1; this.atkCool = this.attackCooldownCurrent > 0 ? this.attackCooldownCurrent : C.attackCooldown; }
    }

    // ----- Velocidade horizontal (analógica, com curvas distintas) -----
    let mul = 1;
    if (this.blocking) mul = C.blockSpeed;
    else if (this.attackT >= 0) mul = C.atkSpeed;
    const inputLen = Math.min(1, Math.hypot(ax, ay));
    const targetX = inputLen > 0.001 ? ax / inputLen * P.speed * mul * inputLen : 0;
    const targetY = inputLen > 0.001 ? ay / inputLen * P.speed * mul * inputLen : 0;
    if (this.evadeT > 0) {
      this.vx = this.evadeDirX * 430;
      this.vy = this.evadeDirY * 430;
    } else {
      const currentLen = Math.hypot(this.vx, this.vy);
      const targetLen = Math.hypot(targetX, targetY);
      let response;
      if (targetLen < 0.001) {
        response = this.onGround ? (P.decelGround || P.accelGround) : (P.decelAir || P.accelAir);
      } else if (currentLen > 8 &&
        (this.vx * targetX + this.vy * targetY) / (currentLen * targetLen) < 0.82) {
        response = this.onGround ? (P.turnGround || P.accelGround) : (P.turnAir || P.accelAir);
      } else {
        response = this.onGround ? P.accelGround : P.accelAir;
      }
      const k = 1 - Math.exp(-response * dt);
      this.vx += (targetX - this.vx) * k;
      this.vy += (targetY - this.vy) * k;
    }

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
    if (!jumpHeld && this.vz > 0 && !this.dead && this.stun <= 0) this.vz -= P.gravity * 0.35 * dt;
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
    const inBishopArena = typeof BishopDimension !== 'undefined' &&
      typeof BishopDimension.isBattleActive === 'function' && BishopDimension.isBattleActive();
    for (let it = 0; it < 2; it++) {
      for (let i = 0; i < list.length; i++) {
        const o = list[i];
        if (o.type === 'rock' && (inBishopArena || this.z + 6 >= o.h)) continue;
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
    // A arena 3D tem seu próprio piso; rochas do mapa 2D não podem virar plataformas invisíveis.
    if (!inBishopArena) {
      for (let i = 0; i < list.length; i++) {
        const o = list[i];
        if (o.type !== 'rock') continue;
        const d = Math.hypot(this.x - o.x, this.y - o.y);
        if (d < o.r + 3 && o.h > floor) floor = o.h;
        if (d < o.r + this.r + 4 && this.z + 6 >= o.h) sortY = Math.max(sortY, o.y + 1);
      }
    }
    this.floor = floor;
    this.sy = sortY;

    // ----- Pouso -----
    const wasAir = !this.onGround;
    const prevVz = this.vz;
    if (!this.dead && (this.knockdownT > 0 || this.gettingUp)) {
      // Queda pesada e levantamento acontecem no piso real; sem gravidade extra no meio da animação.
      this.z = floor;
      this.vz = 0;
      this.onGround = true;
    } else if (this.z <= floor + 0.001 && this.vz <= 0) {
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
    if (this.speed > 8 && this.attackT < 0 && !this.dead && !this.aimLocked) {
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

    // MOD 56: escudo etéreo enquanto a defesa está pressionada.
    // Desenhado no canvas de jogo, sem criar hitbox nem alterar a redução de dano.
    if (this.blocking && !this.dead) {
      const pulse = 0.5 + 0.5 * Math.sin((Game.time || 0) * 8);
      ctx.save();
      ctx.globalAlpha = 0.22 + pulse * 0.10;
      const shield = ctx.createRadialGradient(0, -21, 5, 0, -21, 25);
      shield.addColorStop(0, 'rgba(105,205,255,0.02)');
      shield.addColorStop(0.72, 'rgba(75,175,255,0.18)');
      shield.addColorStop(1, 'rgba(170,235,255,0.02)');
      ctx.fillStyle = shield;
      ctx.beginPath(); ctx.ellipse(0, -21, 20, 28, 0, 0, 6.2832); ctx.fill();
      ctx.globalAlpha = 0.72 + pulse * 0.22;
      ctx.strokeStyle = '#8fe7ff'; ctx.lineWidth = 1.7;
      ctx.beginPath(); ctx.ellipse(0, -21, 19, 27, 0, 0, 6.2832); ctx.stroke();
      ctx.strokeStyle = 'rgba(220,250,255,0.8)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(0, -21, 22, -2.2, -0.9); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -21, 22, 0.95, 2.25); ctx.stroke();
      ctx.restore();
    }

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

    // Camiseta preta e estampa clara da referência
    ctx.fillStyle = flash ? '#ffffff' : '#171b20';
    ctx.beginPath(); ctx.ellipse(0, -14, 8.8, 9.2, 0, 0, 6.2832); ctx.fill();
    if (!flash) {
      ctx.fillStyle = '#dce9ed';
      ctx.beginPath(); ctx.moveTo(-4.8, -15); ctx.lineTo(-1.5, -18.5); ctx.lineTo(0, -15.5); ctx.lineTo(2.2, -19); ctx.lineTo(5, -14); ctx.lineTo(2.4, -13); ctx.lineTo(0, -10.5); ctx.lineTo(-2.2, -13); ctx.closePath(); ctx.fill();
    }

    // Braços e pele exposta
    const sw = moving ? s * 2.5 : (this.onGround ? 0 : -2.5);
    ctx.fillStyle = flash ? '#ffffff' : '#171b20';
    ctx.beginPath(); ctx.arc(-9.5, -14 + sw, 2.8, 0, 6.2832); ctx.fill();
    ctx.beginPath(); ctx.arc(9.5, -14 - sw, 2.8, 0, 6.2832); ctx.fill();

    // Rosto baseado na referência
    ctx.fillStyle = flash ? '#ffffff' : '#a85f3e';
    ctx.beginPath(); ctx.arc(0, -28, 8, 0, 6.2832); ctx.fill();

    // Cabelo cacheado escuro; cobre a cabeça quando visto de costas
    ctx.fillStyle = flash ? '#ffffff' : '#17151a';
    ctx.beginPath();
    if (this.fy < -0.4) ctx.arc(0, -28, 8.7, 0, 6.2832);
    else {
      ctx.arc(0, -29.5, 8.8, Math.PI, 6.2832);
      for (let i = -6; i <= 6; i += 3) {
        ctx.beginPath(); ctx.arc(i, -34 + Math.abs(i) * 0.12, 2.8, 0, 6.2832); ctx.fill();
      }
    }
    ctx.fill();

    // Olhos e traços do rosto
    if (this.fy > -0.4 && !this.dead) {
      const ex = this.fx * 3.2, ey = -27 + this.fy * 1.5;
      ctx.fillStyle = '#17151a';
      ctx.beginPath(); ctx.arc(ex - 2.6, ey, 1.1, 0, 6.2832); ctx.fill();
      ctx.beginPath(); ctx.arc(ex + 2.6, ey, 1.1, 0, 6.2832); ctx.fill();
      ctx.strokeStyle = '#633521'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(-3, -24); ctx.quadraticCurveTo(0, -22.7, 3, -24); ctx.stroke();
    }

    // ----- Soco: braço estica na direção do ataque + arco de impacto -----
    if (this.attackT >= 0) {
      const p = this.attackT / C.attackDur;
      const dx = this.atkDirX, dy = this.atkDirY;
      const ext = Math.sin(Math.min(1, p / 0.7) * Math.PI) * (C.reach + 6);
      const fxp = dx * ext, fyp = dy * ext * 0.6 - 14;
      ctx.strokeStyle = '#171b20';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(dx * 8, -14); ctx.lineTo(fxp, fyp); ctx.stroke();
      ctx.fillStyle = '#a85f3e';
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
