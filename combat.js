'use strict';

/* ============================================================
   COMBAT — sons, inimigo de teste, hitbox do ataque do jogador
   (vale para todos os inimigos: Enemy e Greedling),
   colisão entre personagens, textos de dano e HUD de vida
   ============================================================ */

/* ---------------- Sons (sintetizados, sem arquivos nem URLs) ----------------
   Usa Web Audio. O navegador só libera o áudio depois do primeiro toque,
   então o som começa a funcionar a partir do primeiro botão que você apertar. */
const Sfx = (function () {
  let ac = null, master = null, nbuf = null;

  function create() {
    if (ac) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      ac = new AC();
      master = ac.createGain();
      master.gain.value = 0.55;
      master.connect(ac.destination);
      nbuf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.4), ac.sampleRate);
      const d = nbuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ac = null; }
  }

  const EVENTS = ['pointerdown', 'touchend', 'keydown', 'click'];
  function unlock() {
    create();
    if (ac && ac.state === 'suspended') { try { ac.resume(); } catch (e) {} }
    if (ac && ac.state === 'running') {
      for (let i = 0; i < EVENTS.length; i++) window.removeEventListener(EVENTS[i], unlock);
    }
  }
  for (let i = 0; i < EVENTS.length; i++) window.addEventListener(EVENTS[i], unlock, { passive: true });

  function ready() { return ac && ac.state === 'running'; }

  // Tom com variação de frequência (f0 -> f1)
  function tone(f0, f1, dur, type, vol) {
    if (!ready()) return;
    const t = ac.currentTime;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  // Ruído filtrado (vento / impacto)
  function noise(dur, vol, f0, f1) {
    if (!ready()) return;
    const t = ac.currentTime;
    const s = ac.createBufferSource();
    s.buffer = nbuf;
    const f = ac.createBiquadFilter();
    f.type = 'bandpass'; f.Q.value = 1.2;
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t); s.stop(t + dur + 0.02);
  }

  return {
    swing() { noise(0.14, 0.35, 500, 2200); },
    hit()   { tone(260, 60, 0.13, 'square', 0.22); noise(0.09, 0.4, 1800, 500); },
    hurt()  { tone(320, 110, 0.22, 'sawtooth', 0.2); noise(0.12, 0.3, 900, 300); },
    block() { tone(880, 620, 0.07, 'square', 0.12); tone(1320, 900, 0.05, 'triangle', 0.1); noise(0.05, 0.25, 3000, 1500); },
    death() { tone(420, 50, 0.45, 'sawtooth', 0.22); noise(0.35, 0.3, 1200, 200); },
    coin()  { tone(990, 1320, 0.08, 'square', 0.1); tone(1480, 1760, 0.12, 'square', 0.08); },
    blip()  { tone(520, 640, 0.05, 'triangle', 0.09); },
    thunder() { tone(95, 32, 1.05, 'sawtooth', 0.18); noise(0.9, 0.22, 220, 52); }
  };
})();

/* ---------------- Inimigo de teste ---------------- */
const Enemy = {
  type: 'enemy',
  instances: [],

  // Cria uma entidade nova; o objeto retornado mantém o mesmo comportamento
  // de Enemy, mas possui estado, física e configuração próprios.
  spawn(config) {
    const enemy = Object.create(this);
    enemy._solids = [];
    enemy._spawn(config || CFG.COMBAT.enemy);
    this.instances.push(enemy);
    return enemy;
  },

  // Reinicia cada entidade em seu próprio ponto/configuração de spawn.
  // É usado quando o jogador morre, como o spawn original do inimigo único.
  resetAll(config) {
    if (config) {
      this.instances.length = 0;
      return this.spawn(config);
    }
    if (!this.instances.length) return this.spawn();
    for (let i = 0; i < this.instances.length; i++) {
      const enemy = this.instances[i];
      enemy._spawn(enemy.spawnConfig);
    }
  },

  remove(enemy) {
    const index = this.instances.indexOf(enemy);
    if (index >= 0) this.instances.splice(index, 1);
  },

  _spawn(config) {
    const E = Object.assign({}, CFG.COMBAT.enemy, config || {});
    this.stats = E;
    this.spawnConfig = Object.assign({}, E);
    this.x = E.x; this.y = E.y; this.z = 0;
    this.vx = this.vy = this.vz = 0;
    this.kx = this.ky = 0;
    this.r = E.radius;
    this.maxHp = E.hp; this.hp = E.hp; this.trail = E.hp; this.trailDelay = 0;
    this.state = 'idle'; this.stateT = 0;
    this.flashT = 0; this.alpha = 1;
    this.hitDone = false; this.hitId = -1;
    this.fx = -1; this.fy = 0;
    this.anim = 0; this.speed = 0;
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
      Sfx.death();
    } else {
      this._go('stagger');
      Sfx.hit();
    }
  },

  update(dt) {
    const enemies = this.instances;
    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i];
      enemy._update(dt);
      if (enemy.removeWhenDead && enemy.state === 'dead' && enemy.alpha <= 0) {
        this.remove(enemy);
      }
    }
  },

  _update(dt) {
    const E = this.stats;
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
        if (this.stateT >= E.respawn) { this._spawn(this.spawnConfig); return; }
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
    const E = this.stats;
    const h = this.z - this.floor;
    const ss = 1 - Math.min(h, 120) / 240;
    const portraitHeight = TerritoryEnemyVisuals.commonHeight();

    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = 'rgba(10,30,15,' + (0.3 * ss).toFixed(3) + ')';
    ctx.beginPath();
    ctx.ellipse(
      this.x, this.y - this.floor,
      (portraitHeight ? 18 : 12) * ss + 2,
      (portraitHeight ? 7 : 5) * ss + 1,
      0, 0, 6.2832
    );
    ctx.fill();

    const st = this.state;
    const moving = st === 'chase' && this.speed > 8;
    const s = Math.sin(this.anim);
    const bob = moving ? Math.abs(s) * 2 : (st === 'idle' ? Math.sin(t * 3) * 0.8 : 0);
    const follower = typeof Campaign !== 'undefined' && Campaign.followerActive;

    ctx.save();
    ctx.translate(this.x, this.y - this.z);

    // Deformação conforme o estado
    let sx = 1, sy = 1;
    if (st === 'windup') { const p = Math.min(1, this.stateT / E.windup); sy = 1 - 0.12 * p; sx = 1 + 0.1 * p; }
    else if (st === 'attack') { sy = 1.1; sx = 0.92; }
    else if (st === 'dead') { const p = Math.min(1, this.stateT / 0.35); sy = 1 - 0.7 * p; sx = 1 + 0.4 * p; }
    ctx.scale(sx, sy);

    const usesTerritorySprite = TerritoryEnemyVisuals.drawCommon(ctx, this, bob);
    if (!usesTerritorySprite) {
      // Visual vetorial original: continua disponível para territórios sem arte integrada.
      ctx.fillStyle = '#4a1a20';
      ctx.beginPath(); ctx.ellipse(-5, -1.5 - (moving ? Math.max(0, s) * 3 : 0), 4.5, 2.8, 0, 0, 6.2832); ctx.fill();
      ctx.beginPath(); ctx.ellipse(5, -1.5 - (moving ? Math.max(0, -s) * 3 : 0), 4.5, 2.8, 0, 0, 6.2832); ctx.fill();

      ctx.translate(0, -bob);

      // Cor do corpo (branco ao levar dano, pulsa ao preparar o golpe)
      let body = follower ? '#c08b42' : '#b8404e';
      let dark = follower ? '#765126' : '#8f2f3b';
      if (this.flashT > 0) { body = '#ffffff'; dark = '#ffffff'; }
      else if (st === 'windup' && ((this.stateT * 14) | 0) % 2 === 0) {
        body = follower ? '#f0cd77' : '#ff7a4a';
        dark = follower ? '#b27a32' : '#d9542c';
      }

      // Chifres
      ctx.fillStyle = this.flashT > 0 ? '#ffffff' : (follower ? '#e2bb69' : '#e8dcc0');
      ctx.beginPath(); ctx.moveTo(-9, -22); ctx.lineTo(-6, -33); ctx.lineTo(-3, -23); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(9, -22); ctx.lineTo(6, -33); ctx.lineTo(3, -23); ctx.closePath(); ctx.fill();

      // Corpo
      ctx.fillStyle = body;
      ctx.beginPath(); ctx.ellipse(0, -14, 11, 12, 0, 0, 6.2832); ctx.fill();
      if (follower && this.flashT <= 0) {
        ctx.fillStyle = '#f2d28a';
        ctx.beginPath(); ctx.arc(0, -14, 3, 0, 6.2832); ctx.fill();
        ctx.strokeStyle = '#734d23'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(0, -14, 4.5, 0, 6.2832); ctx.stroke();
      }

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
    }

    if (st === 'windup') {
      ctx.fillStyle = '#ffdd33';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      const alertY = usesTerritorySprite ? -portraitHeight - 8 : -38;
      ctx.strokeText('!', 0, alertY);
      ctx.fillText('!', 0, alertY);
    }

    ctx.restore();

    // Barra de vida sobre a cabeça
    if (st !== 'dead' && (this.hp < this.maxHp || st !== 'idle')) {
      const w = usesTerritorySprite ? 50 : 36;
      const bx = this.x - w / 2;
      const by = this.y - this.z - (usesTerritorySprite ? portraitHeight + 12 : 46);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(bx - 1, by - 1, w + 2, 6);
      ctx.fillStyle = '#ffb347';
      ctx.fillRect(bx, by, w * (this.trail / this.maxHp), 4);
      ctx.fillStyle = this.hp / this.maxHp < 0.3 ? '#e04040' : '#5fd35f';
      ctx.fillRect(bx, by, w * (this.hp / this.maxHp), 4);
    }
    if (follower && st !== 'dead') {
      ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center';
      ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(25,17,9,.9)';
      ctx.fillStyle = '#f0d18d';
      const labelY = this.y - this.z - (usesTerritorySprite ? portraitHeight + 22 : 51);
      ctx.strokeText('SEGUIDOR', this.x, labelY);
      ctx.fillText('SEGUIDOR', this.x, labelY);
    }

    ctx.globalAlpha = 1;
  }
};

/* ---------------- Orquestração do combate ---------------- */
const Combat = {
  texts: [],
  _w: -1, _tw: -1, _ko: false,
  elFill: null, elTrail: null, elText: null, elFlash: null, elKo: null,

  init() {
    this.elFill = document.getElementById('hp-fill');
    this.elTrail = document.getElementById('hp-trail');
    this.elText = document.getElementById('hp-text');
    this.elFlash = document.getElementById('hurt-flash');
    this.elKo = document.getElementById('ko');
    this._w = -1; this._tw = -1; this._ko = false;
  },

  // Reinicia jogador e inimigo (usado no início e ao ser derrotado)
  reset() {
    const spawn = typeof RuinedCity !== 'undefined' && RuinedCity.arenaInside
      ? RuinedCity.start
      : (Casino && Casino.inside ? Casino.start : World.spawn);
    Player.spawn(spawn.x, spawn.y);
    Enemy.resetAll();
    Greedling.reset();
    BishopBoss.reset();
    this.texts.length = 0;
    Ambient.sparks.length = 0;
    Game.hitstop = 0;
    Camera.shake = 0;
    Camera.snap(Player);
    this._w = -1; this._tw = -1;
    this._setKo(false);
  },

  _setKo(v) {
    if (!this.elKo || v === this._ko) return;
    this._ko = v;
    this.elKo.classList.toggle('on', v);
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

    // ----- Jogador derrotado: mostra aviso e reinicia depois de um instante -----
    this._setKo(Player.dead && Player.deadT > 0.6);
    if (Player.dead && Player.deadT > 2.4) { this.reset(); return; }

    // O chefe usa as mesmas hitboxes e a mesma física dos demais oponentes.
    // Atualizá-lo aqui garante que a IA rode junto com o loop de combate.
    BishopBoss.update(dt);

    // ----- Hitbox do ataque do jogador + colisão entre personagens -----
    // Cada inimigo comum usa a mesma hitbox e colisão, independentemente.
    for (let i = 0; i < Enemy.instances.length; i++) this._foe(Enemy.instances[i]);
    this._foe(Greedling);
    this._foe(BishopBoss);

    // ----- Barras (rastro do dano) e textos -----
    this._trail(Player, dt);
    for (let i = 0; i < Enemy.instances.length; i++) this._trail(Enemy.instances[i], dt);
    this._trail(Greedling, dt);
    this._trail(BishopBoss, dt);

    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.age += dt;
      t.y -= 28 * dt;
      if (t.age >= t.life) this.texts.splice(i, 1);
    }
  },

  // Ataque do jogador e colisão contra UM inimigo (mesma regra para todos)
  _foe(E) {
    const C = CFG.COMBAT;
    if (E.state === 'dead' || E.state === 'gone' || E.state === 'inactive') return;

    // Só acerta dentro da janela ativa e uma única vez por golpe (attackId)
    if (Player.isAttackActive() && E.hitId !== Player.attackId) {
      const hx = Player.x + Player.atkDirX * C.reach;
      const hy = Player.y + Player.atkDirY * C.reach;
      const dx = E.x - hx, dy = E.y - hy;
      const rr = C.hitR + E.r;
      if (dx * dx + dy * dy <= rr * rr && Math.abs(E.z - Player.z) < C.hitZ) {
        E.hitId = Player.attackId;
        let kx = E.x - Player.x, ky = E.y - Player.y;
        const m = Math.hypot(kx, ky);
        if (m > 0.001) { kx /= m; ky /= m; } else { kx = Player.atkDirX; ky = Player.atkDirY; }
        E.hurt(C.damage, kx, ky, C.kb);
        if (E.state === 'dead') return;
      }
    }

    // Colisão entre jogador e inimigo (não se atravessam)
    // Se um está bem mais alto que o outro (pulo), um passa por cima.
    if (Math.abs(Player.z - E.z) < C.bodyH) {
      let dx = Player.x - E.x, dy = Player.y - E.y;
      const d = Math.hypot(dx, dy);
      const min = Player.r + E.r;
      if (d < min) {
        if (d > 0.001) { dx /= d; dy /= d; } else { dx = 1; dy = 0; }
        const ov = min - d;
        const px = Player.x + dx * ov * 0.6, py = Player.y + dy * ov * 0.6;
        const ex = E.x - dx * ov * 0.4, ey = E.y - dy * ov * 0.4;
        const pOk = !World.blocked(px, py, Player.r);
        const eOk = !World.blocked(ex, ey, E.r);
        if (pOk) { Player.x = px; Player.y = py; }
        if (eOk) { E.x = ex; E.y = ey; }
        // Se um dos lados está travado, o outro se afasta o restante
        if (!pOk && eOk) { E.x -= dx * ov * 0.6; E.y -= dy * ov * 0.6; }
        if (!eOk && pOk) { Player.x += dx * ov * 0.4; Player.y += dy * ov * 0.4; }
      }
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
    for (let i = 0; i < Enemy.instances.length; i++) {
      const enemy = Enemy.instances[i];
      if (enemy.state === 'dead') continue;
      ctx.beginPath(); ctx.arc(enemy.x, enemy.y, enemy.r, 0, 6.2832); ctx.stroke();
    }
    if (Greedling.state !== 'gone') { ctx.beginPath(); ctx.arc(Greedling.x, Greedling.y, Greedling.r, 0, 6.2832); ctx.stroke(); }
    if (Player.attackT >= 0) {
      ctx.strokeStyle = Player.isAttackActive() ? 'rgba(255,255,0,1)' : 'rgba(255,255,0,0.3)';
      ctx.beginPath();
      ctx.arc(Player.x + Player.atkDirX * C.reach, Player.y + Player.atkDirY * C.reach, C.hitR, 0, 6.2832);
      ctx.stroke();
    }
  }
};
