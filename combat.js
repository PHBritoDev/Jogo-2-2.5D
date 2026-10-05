'use strict';

/* ============================================================
   COMBAT — inimigo de teste, hitbox do ataque do jogador,
   colisão entre personagens, textos de dano e HUD de vida
   ============================================================ */

/* ---------------- Inimigo de teste ---------------- */
const Enemy = {
  type: 'enemy',
  x: 0, y: 0, z: 0,
  vx: 0, vy: 0, vz: 0,
  kx: 0, ky: 0,
  r: 12,
  hp: 1, maxHp: 1, trail: 1, trailDelay: 0,
  state: 'idle',        // idle, chase, windup, attack, recover, stagger, dead
  stateT: 0,
  flashT: 0,
  alpha: 1,
  hitDone: false,
  hitId: -1,            // último golpe do jogador que me acertou
  fx: -1, fy: 0,
  anim: 0, speed: 0,
  onGround: true, floor: 0,
  sy: 0,
  _solids: [],

  spawn() {
    const E = CFG.COMBAT.enemy;
    this.x = E.x; this.y = E.y; this.z = 0;
    this.vx = this.vy = this.vz = 0;
    this.kx = this.ky = 0;
    this.r = E.radius;
    this.maxHp = E.hp; this.hp = E.hp; this.trail = E.hp; this.trailDelay = 0;
    this.state = 'idle'; this.stateT = 0;
    this.flashT = 0; this.alpha = 1;
    this.hitDone = false; this.hitId = -1;
    this.fx = -1; this.fy = 0;
    this.onGround = true; this.floor = 0;
    this.sy = this.y;
  },

  _go(state) {
    this.state = state;
    this.stateT = 0;
    if (state === 'attack') this.hitDone = false;
  },

  hurt(dmg, dx, dy, kb) {
    if (this.state === 'dead') return;
    const C = CFG.COMBAT;
    this.hp = Math.max(0, this.hp - dmg);
    this.trailDelay = 0.45;
    this.flashT = 0.14;
    this.kx = dx * kb; this.ky = dy * kb;
    this.vx = 0; this.vy = 0;
    this.vz = Math.max(this.vz, C.hurtPop);
    this.onGround = false;

    const gy = this.y - this.z - 14;
    Ambient.spawnSpark(this.x, gy, 9, '#ffe9a0');
    Ambient.spawnSpark(this.x, gy, 4, '#ffffff');
    Combat.addText(this.x, this.y - this.z - 40, String(dmg), '#ffd34d');
    Camera.shake = Math.min(6, Camera.shake + 3);
    Game.hitstop = C.hitstop;

    if (this.hp <= 0) {
      this._go('dead');
      this.kx *= 1.4; this.ky *= 1.4;
      this.vz = 200;
      Ambient.spawnSpark(this.x, gy, 12, '#ff8a6a');
    } else {
      this._go('stagger');
    }
  },

  update(dt) {
    const E = CFG.COMBAT.enemy;
    this.stateT += dt;
    this.flashT = Math.max(0, this.flashT - dt);

    const dx = Player.x - this.x, dy = Player.y - this.y;
    const d = Math.hypot(dx, dy) || 0.001;
    const alive = !Player.dead;
    let tvx = 0, tvy = 0;

    switch (this.state) {
      case 'idle':
        if (alive && d < E.sight) this._go('chase');
        break;

      case 'chase':
        if (!alive || d > E.giveUp) { this._go('idle'); break; }
        this.fx = dx / d; this.fy = dy / d;
        if (d < E.attackRange) { this._go('windup'); break; }
        tvx = this.fx * E.speed;
        tvy = this.fy * E.speed;
        break;

      case 'windup':   // telegrafa o golpe (dá tempo de defender ou desviar)
        this.fx = dx / d; this.fy = dy / d;
        if (this.stateT >= E.windup) {
          this._go('attack');
          this.kx += this.fx * E.lunge;
          this.ky += this.fy * E.lunge;
        }
        break;

      case 'attack':
        if (!this.hitDone && this.stateT >= 0.05) {
          this.hitDone = true;
          if (alive && d < E.hitRange && Math.abs(Player.z - this.z) < CFG.COMBAT.bodyH) {
            Player.hurt(E.damage, this.x, this.y, E.kb);
          }
        }
        if (this.stateT >= E.attackDur) this._go('recover');
        break;

      case 'recover':
        if (this.stateT >= E.cooldown) this._go(alive && d < E.sight ? 'chase' : 'idle');
        break;

      case 'stagger':
        if (this.stateT >= E.stagger) this._go('chase');
        break;

      case 'dead':
        this.alpha = U.clamp(1 - (this.stateT - 0.9) / 0.7, 0, 1);
        if (this.stateT >= E.respawn) { this.spawn(); return; }
        break;
    }

    const k = Math.min(1, dt * 10);
    this.vx += (tvx - this.vx) * k;
    this.vy += (tvy - this.vy) * k;

    this._physics(dt);

    this.speed = Math.hypot(this.vx, this.vy);
    this.anim += dt * this.speed * 0.09;
    this.sy = this.y;
  },

  // Gravidade, knockback, água, limites, árvores e pedras
  _physics(dt) {
    const P = CFG.PLAYER;
    this.vz -= P.gravity * dt;
    this.z += this.vz * dt;

    let nx = this.x + (this.vx + this.kx) * dt;
    let ny = this.y + (this.vy + this.ky) * dt;
    if (World.blocked(nx, this.y, this.r)) { nx = this.x; this.vx = 0; this.kx = 0; }
    if (World.blocked(nx, ny, this.r)) { ny = this.y; this.vy = 0; this.ky = 0; }
    this.x = nx; this.y = ny;
    const kd = Math.exp(-8 * dt);
    this.kx *= kd; this.ky *= kd;

    const pad = CFG.BOUNDS_PAD;
    this.x = U.clamp(this.x, pad, World.w - pad);
    this.y = U.clamp(this.y, pad, World.h - pad);

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

    let floor = 0;
    for (let i = 0; i < list.length; i++) {
      const o = list[i];
      if (o.type !== 'rock') continue;
      if (Math.hypot(this.x - o.x, this.y - o.y) < o.r + 3 && o.h > floor) floor = o.h;
    }
    this.floor = floor;
    if (this.z <= floor + 0.001 && this.vz <= 0) {
      this.z = floor; this.vz = 0; this.onGround = true;
    } else {
      this.onGround = false;
    }
  },

  draw(ctx, t) {
    if (this.alpha <= 0) return;
    const E = CFG.COMBAT.enemy;
    const h = this.z - this.floor;
    const ss = 1 - Math.min(h, 120) / 240;

    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = 'rgba(10,30,15,' + (0.3 * ss).toFixed(3) + ')';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y - this.floor, 12 * ss + 2, 5 * ss + 1, 0, 0, 6.2832);
    ctx.fill();

    const st = this.state;
    const moving = st === 'chase' && this.speed > 8;
    const s = Math.sin(this.anim);
    const bob = moving ? Math.abs(s) * 2 : (st === 'idle' ? Math.sin(t * 3) * 0.8 : 0);

    ctx.save();
    ctx.translate(this.x, this.y - this.z);

    // Deformação conforme o estado
    let sx = 1, sy = 1;
    if (st === 'windup') { const p = Math.min(1, this.stateT / E.windup); sy = 1 - 0.12 * p; sx = 1 + 0.1 * p; }
    else if (st === 'attack') { sy = 1.1; sx = 0.92; }
    else if (st === 'dead') { const p = Math.min(1, this.stateT / 0.35); sy = 1 - 0.7 * p; sx = 1 + 0.4 * p; }
    ctx.scale(sx, sy);

    // Pés
    ctx.fillStyle = '#4a1a20';
    ctx.beginPath(); ctx.ellipse(-5, -1.5 - (moving ? Math.max(0, s) * 3 : 0), 4.5, 2.8, 0, 0, 6.2832); ctx.fill();
    ctx.beginPath(); ctx.ellipse(5, -1.5 - (moving ? Math.max(0, -s) * 3 : 0), 4.5, 2.8, 0, 0, 6.2832); ctx.fill();

    ctx.translate(0, -bob);

    // Cor do corpo (branco ao levar dano, pulsa ao preparar o golpe)
    let body = '#b8404e', dark = '#8f2f3b';
    if (this.flashT > 0) { body = '#ffffff'; dark = '#ffffff'; }
    else if (st === 'windup' && ((this.stateT * 14) | 0) % 2 === 0) { body = '#ff7a4a'; dark = '#d9542c'; }

    // Chifres
    ctx.fillStyle = this.flashT > 0 ? '#ffffff' : '#e8dcc0';
    ctx.beginPath(); ctx.moveTo(-9, -22); ctx.lineTo(-6, -33); ctx.lineTo(-3, -23); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(9, -22); ctx.lineTo(6, -33); ctx.lineTo(3, -23); ctx.closePath(); ctx.fill();

    // Corpo
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.ellipse(0, -14, 11, 12, 0, 0, 6.2832); ctx.fill();

    // Braços
    ctx.fillStyle = dark;
    if (st === 'windup') {
      ctx.beginPath(); ctx.arc(-11, -23, 3.4, 0, 6.2832); ctx.fill();
      ctx.beginPath(); ctx.arc(11, -23, 3.4, 0, 6.2832); ctx.fill();
    } else if (st === 'attack') {
      ctx.beginPath(); ctx.arc(this.fx * 17, -13 + this.fy * 5, 4, 0, 6.2832); ctx.fill();
      ctx.beginPath(); ctx.arc(-11, -11, 3.2, 0, 6.2832); ctx.fill();
    } else {
      const sw = moving ? s * 2 : 0;
      ctx.beginPath(); ctx.arc(-11.5, -12 + sw, 3.2, 0, 6.2832); ctx.fill();
      ctx.beginPath(); ctx.arc(11.5, -12 - sw, 3.2, 0, 6.2832); ctx.fill();
    }

    // Rosto (some quando está de costas)
    if (this.fy > -0.5 && st !== 'dead') {
      const ex = this.fx * 2;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(-4.2 + ex, -17, 3, 3.4, 0, 0, 6.2832); ctx.fill();
      ctx.beginPath(); ctx.ellipse(4.2 + ex, -17, 3, 3.4, 0, 0, 6.2832); ctx.fill();
      ctx.fillStyle = '#400';
      ctx.beginPath(); ctx.arc(-4.2 + ex + this.fx * 1.2, -16.6 + this.fy, 1.5, 0, 6.2832); ctx.fill();
      ctx.beginPath(); ctx.arc(4.2 + ex + this.fx * 1.2, -16.6 + this.fy, 1.5, 0, 6.2832); ctx.fill();
      ctx.strokeStyle = '#3a0f14'; ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-8 + ex, -22); ctx.lineTo(-2 + ex, -19.5);
      ctx.moveTo(8 + ex, -22); ctx.lineTo(2 + ex, -19.5);
      ctx.stroke();
      if (st === 'attack' || st === 'windup') {
        ctx.fillStyle = '#3a0f14';
        ctx.beginPath(); ctx.ellipse(ex, -9, 4, 2.6, 0, 0, 6.2832); ctx.fill();
      }
    }

    // Alerta antes de atacar
    if (st === 'windup') {
      ctx.fillStyle = '#ffdd33';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeText('!', 0, -38);
      ctx.fillText('!', 0, -38);
    }

    ctx.restore();

    // Barra de vida sobre a cabeça
    if (st !== 'dead' && (this.hp < this.maxHp || st !== 'idle')) {
      const w = 36, bx = this.x - w / 2, by = this.y - this.z - 46;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(bx - 1, by - 1, w + 2, 6);
      ctx.fillStyle = '#ffb347';
      ctx.fillRect(bx, by, w * (this.trail / this.maxHp), 4);
      ctx.fillStyle = this.hp / this.maxHp < 0.3 ? '#e04040' : '#5fd35f';
      ctx.fillRect(bx, by, w * (this.hp / this.maxHp), 4);
    }

    ctx.globalAlpha = 1;
  }
};

/* ---------------- Orquestração do combate ---------------- */
const Combat = {
  texts: [],
  _w: -1, _tw: -1,
  elFill: null, elTrail: null, elText: null, elFlash: null,

  init() {
    this.elFill = document.getElementById('hp-fill');
    this.elTrail = document.getElementById('hp-trail');
    this.elText = document.getElementById('hp-text');
    this.elFlash = document.getElementById('hurt-flash');
    this._w = -1; this._tw = -1;
  },

  reset() {
    Player.spawn(World.spawn.x, World.spawn.y);
    Enemy.spawn();
    this.texts.length = 0;
    Ambient.sparks.length = 0;
    this._w = -1; this._tw = -1;
  },

  addText(x, y, str, col) {
    if (this.texts.length > 14) this.texts.shift();
    this.texts.push({ x: x, y: y, str: str, col: col, age: 0, life: 0.8 });
  },

  // Flash vermelho nas bordas da tela
  hurtFlash() {
    const el = this.elFlash;
    if (!el) return;
    el.classList.remove('on');
    void el.offsetWidth;
    el.classList.add('on');
  },

  _trail(b, dt) {
    if (b.trailDelay > 0) b.trailDelay -= dt;
    else if (b.trail > b.hp) b.trail = Math.max(b.hp, b.trail - b.maxHp * 0.7 * dt);
    else b.trail = b.hp;
  },

  update(dt) {
    const C = CFG.COMBAT;

    // ----- Hitbox do ataque do jogador -----
    // Só acerta dentro da janela ativa e uma única vez por golpe (attackId)
    if (Player.isAttackActive() && Enemy.state !== 'dead' && Enemy.hitId !== Player.attackId) {
      const hx = Player.x + Player.atkDirX * C.reach;
      const hy = Player.y + Player.atkDirY * C.reach;
      const dx = Enemy.x - hx, dy = Enemy.y - hy;
      const rr = C.hitR + Enemy.r;
      if (dx * dx + dy * dy <= rr * rr && Math.abs(Enemy.z - Player.z) < C.hitZ) {
        Enemy.hitId = Player.attackId;
        let kx = Enemy.x - Player.x, ky = Enemy.y - Player.y;
        const m = Math.hypot(kx, ky);
        if (m > 0.001) { kx /= m; ky /= m; } else { kx = Player.atkDirX; ky = Player.atkDirY; }
        Enemy.hurt(C.damage, kx, ky, C.kb);
      }
    }

    // ----- Colisão entre jogador e inimigo (não se atravessam) -----
    // Se um está bem mais alto que o outro (pulo), um passa por cima.
    if (Enemy.state !== 'dead' && Math.abs(Player.z - Enemy.z) < C.bodyH) {
      let dx = Player.x - Enemy.x, dy = Player.y - Enemy.y;
      const d = Math.hypot(dx, dy);
      const min = Player.r + Enemy.r;
      if (d < min) {
        if (d > 0.001) { dx /= d; dy /= d; } else { dx = 1; dy = 0; }
        const ov = min - d;
        const px = Player.x + dx * ov * 0.6, py = Player.y + dy * ov * 0.6;
        const ex = Enemy.x - dx * ov * 0.4, ey = Enemy.y - dy * ov * 0.4;
        let pOk = !World.blocked(px, py, Player.r);
        let eOk = !World.blocked(ex, ey, Enemy.r);
        if (pOk) { Player.x = px; Player.y = py; }
        if (eOk) { Enemy.x = ex; Enemy.y = ey; }
        // Se um dos lados está travado, o outro se afasta o restante
        if (!pOk && eOk) { Enemy.x -= dx * ov * 0.6; Enemy.y -= dy * ov * 0.6; }
        if (!eOk && pOk) { Player.x += dx * ov * 0.4; Player.y += dy * ov * 0.4; }
      }
    }

    // ----- Barras (rastro do dano) e textos -----
    this._trail(Player, dt);
    this._trail(Enemy, dt);

    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.age += dt;
      t.y -= 28 * dt;
      if (t.age >= t.life) this.texts.splice(i, 1);
    }
  },

  updateHud() {
    if (!this.elFill) return;
    const w = Player.hp / Player.maxHp;
    const tw = Player.trail / Player.maxHp;
    if (w !== this._w) {
      this.elFill.style.transform = 'scaleX(' + w.toFixed(3) + ')';
      this.elFill.classList.toggle('low', w < 0.3);
      this.elText.textContent = Math.ceil(Player.hp) + ' / ' + Player.maxHp;
      this._w = w;
    }
    if (Math.abs(tw - this._tw) > 0.002) {
      this.elTrail.style.transform = 'scaleX(' + tw.toFixed(3) + ')';
      this._tw = tw;
    }
  },

  drawTexts(ctx) {
    if (!this.texts.length) return;
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.75)';
    for (const t of this.texts) {
      const k = t.age / t.life;
      ctx.globalAlpha = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
      ctx.fillStyle = t.col;
      ctx.strokeText(t.str, t.x, t.y);
      ctx.fillText(t.str, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  },

  // Hitboxes visíveis (CFG.COMBAT.debug = true)
  drawDebug(ctx) {
    const C = CFG.COMBAT;
    if (!C.debug) return;
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(0,255,255,0.9)';
    ctx.beginPath(); ctx.arc(Player.x, Player.y, Player.r, 0, 6.2832); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,80,80,0.9)';
    ctx.beginPath(); ctx.arc(Enemy.x, Enemy.y, Enemy.r, 0, 6.2832); ctx.stroke();
    if (Player.attackT >= 0) {
      ctx.strokeStyle = Player.isAttackActive() ? 'rgba(255,255,0,1)' : 'rgba(255,255,0,0.3)';
      ctx.beginPath();
      ctx.arc(Player.x + Player.atkDirX * C.reach, Player.y + Player.atkDirY * C.reach, C.hitR, 0, 6.2832);
      ctx.stroke();
    }
  }
};
