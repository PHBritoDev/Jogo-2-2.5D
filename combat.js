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
  let ambientSource = null, ambientFilter = null, ambientGain = null;
  let ambientDrone = null, ambientDroneGain = null, ambientProfileName = '';
  let footstepTimer = 0, lastEvadeT = 0;

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

  function ensureAmbient() {
    if (!ready() || ambientSource) return;
    ambientSource = ac.createBufferSource();
    ambientSource.buffer = nbuf;
    ambientSource.loop = true;
    ambientFilter = ac.createBiquadFilter();
    ambientFilter.type = 'lowpass';
    ambientFilter.frequency.value = 520;
    ambientFilter.Q.value = 0.35;
    ambientGain = ac.createGain();
    ambientGain.gain.value = 0;
    ambientSource.connect(ambientFilter);
    ambientFilter.connect(ambientGain);
    ambientGain.connect(master);
    ambientSource.start();

    ambientDrone = ac.createOscillator();
    ambientDrone.type = 'sine';
    ambientDrone.frequency.value = 62;
    ambientDroneGain = ac.createGain();
    ambientDroneGain.gain.value = 0;
    ambientDrone.connect(ambientDroneGain);
    ambientDroneGain.connect(master);
    ambientDrone.start();
  }

  function ramp(param, value, seconds) {
    if (!param || !ac) return;
    const now = ac.currentTime;
    param.cancelScheduledValues(now);
    param.setTargetAtTime(value, now, seconds || 0.8);
  }

  function worldAmbience() {
    if (typeof BishopDimension !== 'undefined' &&
        typeof BishopDimension.isBattleActive === 'function' && BishopDimension.isBattleActive()) return 'arena';
    if (typeof Casino !== 'undefined' && Casino.inside) return 'casino';
    if (typeof RuinedCity !== 'undefined' && RuinedCity.arenaInside) return 'city';
    if (typeof MistValley !== 'undefined' && MistValley.siteInside) return 'mist';
    if (typeof NightSanctum !== 'undefined' && NightSanctum.siteInside) return 'sanctum';
    const climate = typeof Climate !== 'undefined' ? Climate.state : 'clear';
    if (climate === 'storm') return 'storm';
    if (climate === 'fog' || climate === 'fogging') return 'mist';
    if (climate === 'night' || climate === 'nightfall') return 'night';
    return 'forest';
  }

  const AMBIENCE = {
    forest:  { noise: 0.014, cutoff: 1050, drone: 0.0000, pitch: 62 },
    storm:   { noise: 0.020, cutoff: 540,  drone: 0.0025, pitch: 48 },
    mist:    { noise: 0.009, cutoff: 370,  drone: 0.0018, pitch: 58 },
    night:   { noise: 0.006, cutoff: 620,  drone: 0.0015, pitch: 112 },
    city:    { noise: 0.009, cutoff: 260,  drone: 0.0015, pitch: 52 },
    sanctum: { noise: 0.007, cutoff: 420,  drone: 0.0028, pitch: 66 },
    casino:  { noise: 0.005, cutoff: 320,  drone: 0.0026, pitch: 48 },
    arena:   { noise: 0.006, cutoff: 300,  drone: 0.0030, pitch: 54 }
  };

  function ambienceSurface() {
    const profile = worldAmbience();
    if (profile === 'city' || profile === 'casino' || profile === 'arena') return 'stone';
    if (profile === 'mist' || profile === 'sanctum' || profile === 'night') return 'soft';
    if (profile === 'storm') return 'wet';
    return 'grass';
  }

  function updateWorld(dt, player) {
    if (!ac) return;
    ensureAmbient();
    if (ready() && ambientGain && ambientDroneGain) {
      const profileName = worldAmbience();
      if (profileName !== ambientProfileName) {
        ambientProfileName = profileName;
        const profile = AMBIENCE[profileName] || AMBIENCE.forest;
        ramp(ambientGain.gain, profile.noise, 1.1);
        ramp(ambientFilter.frequency, profile.cutoff, 0.9);
        ramp(ambientDroneGain.gain, profile.drone, 1.1);
        ramp(ambientDrone.frequency, profile.pitch, 1.1);
      }
    }
    if (!player) return;
    const evadeT = Number(player.evadeT) || 0;
    if (evadeT > 0 && lastEvadeT <= 0) this.dash();
    lastEvadeT = evadeT;
    footstepTimer = Math.max(0, footstepTimer - Math.max(0, dt || 0));
    const speed = Math.hypot(Number(player.vx) || 0, Number(player.vy) || 0);
    if (!player.dead && player.onGround && !player.blocking && evadeT <= 0 && speed > 72) {
      if (footstepTimer <= 0) {
        this.footstep(ambienceSurface());
        footstepTimer = Math.max(0.29, Math.min(0.48, 82 / speed));
      }
    } else if (speed < 35 || !player.onGround || player.blocking || evadeT > 0) {
      footstepTimer = Math.min(footstepTimer, 0.08);
    }
  }

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
    swing() {
      noise(0.20, 0.22, 420, 2600);
      tone(720, 180, 0.16, 'triangle', 0.045);
      tone(1450, 560, 0.11, 'sine', 0.025);
    },
    hit() {
      tone(155, 48, 0.19, 'triangle', 0.24);
      noise(0.13, 0.28, 2100, 260);
      tone(920, 380, 0.075, 'square', 0.055);
    },
    hurt() {
      tone(245, 72, 0.26, 'sawtooth', 0.13);
      noise(0.18, 0.20, 1050, 180);
      tone(620, 230, 0.16, 'triangle', 0.045);
    },
    block() {
      tone(1040, 710, 0.09, 'triangle', 0.12);
      tone(1580, 980, 0.07, 'sine', 0.07);
      noise(0.08, 0.17, 3200, 900);
    },
    dash() {
      noise(0.19, 0.12, 2100, 260);
      tone(510, 95, 0.21, 'triangle', 0.065);
      tone(1250, 420, 0.13, 'sine', 0.025);
    },
    footstep(surface) {
      const level = surface === 'stone' ? 0.062 : (surface === 'wet' ? 0.052 : 0.046);
      const pitch = surface === 'stone' ? 118 : (surface === 'wet' ? 102 : 158);
      tone(pitch + Math.random() * 18, pitch * 0.58, 0.10, 'triangle', level);
      noise(surface === 'grass' ? 0.075 : 0.055, level * 0.58, surface === 'grass' ? 1450 : 780, 150);
      if (surface === 'grass') noise(0.035, 0.018, 2400, 950);
    },
    powerCast(kind) {
      const pitch = kind === 'sun' ? 330 : (kind === 'ultimate' ? 190 : 270);
      tone(pitch, pitch * 2.35, kind === 'ultimate' ? 0.72 : 0.38, 'sine', kind === 'ultimate' ? 0.11 : 0.075);
      tone(pitch * 0.52, pitch * 1.2, kind === 'ultimate' ? 0.9 : 0.52, 'triangle', 0.045);
      noise(kind === 'ultimate' ? 0.48 : 0.24, 0.055, 680, 2400);
    },
    powerImpact(strong) {
      const level = strong ? 0.19 : 0.12;
      tone(strong ? 118 : 168, 34, strong ? 0.48 : 0.29, 'sawtooth', level);
      noise(strong ? 0.38 : 0.23, strong ? 0.17 : 0.105, 1250, 130);
    },
    death() { tone(420, 50, 0.45, 'sawtooth', 0.22); noise(0.35, 0.3, 1200, 200); },
    coin()  { tone(990, 1320, 0.08, 'square', 0.1); tone(1480, 1760, 0.12, 'square', 0.08); },
    blip()  { tone(520, 640, 0.05, 'triangle', 0.09); },
    thunder() { tone(95, 32, 1.05, 'sawtooth', 0.18); noise(0.9, 0.22, 220, 52); },
    updateWorld: updateWorld
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
  attackModifiers: new Map(),
  _reportedModifierErrors: new Set(),
  _w: -1, _tw: -1, _ko: false,
  elFill: null, elTrail: null, elText: null, elFlash: null, elKo: null,

  // Effects (future enchantments/powers) can alter a typed melee hit without
  // replacing the combat loop. Modifiers should be pure; return changed fields.
  registerAttackModifier(id, modifier) {
    const key = String(id || '');
    if (!key || typeof modifier !== 'function') throw new TypeError('Efeito de ataque requer id e função.');
    this.attackModifiers.set(key, modifier);
    return key;
  },

  removeAttackModifier(id) {
    return this.attackModifiers.delete(String(id));
  },

  playerAttackProfile(target) {
    const C = CFG.COMBAT;
    const stage = Math.max(0, Math.min(2, Number(Player.comboStage) || 0)) | 0;
    const stages = Array.isArray(C.comboStages) ? C.comboStages : [];
    const combo = stages[stage] || {};
    const factor = function (key, fallback) {
      const value = Number(combo[key]);
      return Number.isFinite(value) && value > 0 ? value : fallback;
    };
    const profile = {
      source: 'player', kind: 'melee', damageType: 'physical', stage: stage,
      tags: ['weapon', 'melee', 'combo-' + (stage + 1)],
      damage: Math.round(C.damage * factor('damageScale', [1, 1.12, 1.32][stage])),
      reach: C.reach * factor('reachScale', [1, 1.04, 1.10][stage]),
      bladeReach: C.bladeReach * factor('bladeReachScale', [1, 1.06, 1.15][stage]),
      hitRadius: C.hitR * factor('hitRadiusScale', [1, 1.02, 1.08][stage]),
      knockback: C.kb * factor('knockbackScale', [1, 1.05, 1.25][stage]),
      hitstop: C.hitstop * factor('hitstopScale', [1, 1.15, 1.65][stage]),
      cameraShake: Number.isFinite(Number(combo.cameraShake)) ? Number(combo.cameraShake) : [0, 0.4, 1.2][stage]
    };
    for (const [id, modifier] of this.attackModifiers) {
      try {
        const changed = modifier(Object.assign({}, profile, { tags: profile.tags.slice() }), target);
        if (changed && typeof changed === 'object') Object.assign(profile, changed);
      } catch (error) {
        if (!this._reportedModifierErrors.has(id)) {
          this._reportedModifierErrors.add(id);
          console.error('Modificador de combate removido após erro:', id, error);
        }
        this.attackModifiers.delete(id);
      }
    }
    const defaults = { damage: C.damage, reach: C.reach, bladeReach: C.bladeReach, hitRadius: C.hitR, knockback: C.kb, hitstop: C.hitstop, cameraShake: 0 };
    Object.keys(defaults).forEach(function (key) {
      const value = Number(profile[key]);
      profile[key] = Number.isFinite(value) ? Math.max(0, value) : defaults[key];
    });
    if (!Array.isArray(profile.tags)) profile.tags = ['weapon', 'melee'];
    return profile;
  },

  // MOD 55: cápsula ao longo da lâmina, com tolerância calibrada apenas para o Bispo.
  // O GLB visual e a física 2D usam espaços distintos; a pequena margem compensa a diferença
  // sem transformar os ataques contra inimigos comuns em golpes de longo alcance.
  _swordTouches(E, strike, C) {
    const isBishop = E === BishopBoss || (E.profile && E.profile.id === 'bishop1');
    const verticalTolerance = isBishop ? Math.max(C.hitZ, 56) : C.hitZ;
    if (Math.abs((Number(E.z) || 0) - (Number(Player.z) || 0)) >= verticalTolerance) return false;
    const rawDirX=Number(Player.atkDirX),rawDirY=Number(Player.atkDirY);
    const dirX=Number.isFinite(rawDirX)?rawDirX:0,dirY=Number.isFinite(rawDirY)?rawDirY:1;
    const tx = E.x - Player.x, ty = E.y - Player.y;
    const targetDistance = Math.hypot(tx, ty);
    // Alvos comuns continuam exigindo que estejam à frente; contra o Bispo permitimos
    // um pequeno erro lateral de mira, pois a foice/espada visual tem largura e arco.
    if (tx * dirX + ty * dirY < 0 && (!isBishop || targetDistance > (strike.reach + strike.bladeReach + (E.r || 0)))) return false;
    const start = Math.min(Math.max(4, (Number(Player.r) || 0) * 0.35), strike.reach * 0.45);
    const tipAssist = isBishop ? 16 : 0;
    const end = Math.max(start, strike.reach + (Number(strike.bladeReach) || 0) + tipAssist);
    const ax = Player.x + dirX * start, ay = Player.y + dirY * start;
    const bx = Player.x + dirX * end, by = Player.y + dirY * end;
    const sx = bx - ax, sy = by - ay;
    const lengthSq = sx * sx + sy * sy || 1;
    const t = Math.max(0, Math.min(1, ((E.x - ax) * sx + (E.y - ay) * sy) / lengthSq));
    const dx = E.x - (ax + sx * t), dy = E.y - (ay + sy * t);
    const bishopContactGrace = isBishop ? 12 : 0;
    const radius = Math.max(0, Number(strike.hitRadius) || 0) + Math.max(0, Number(E.r) || 0) + bishopContactGrace;
    if (dx * dx + dy * dy <= radius * radius) return true;
    // MOD 56: assistência de contato para o Bispo. O golpe 3D pode encostar com a ponta
    // mesmo quando a projeção 2D da lâmina fica alguns pixels ao lado. Só vale na frente
    // do jogador, durante a janela ativa, e continua protegido por hitId em _foe().
    if (isBishop && targetDistance <= end + Math.max(0, Number(E.r) || 0) + 28) {
      const forward = tx * dirX + ty * dirY;
      return forward >= -Math.max(0, Number(E.r) || 0) * 0.35;
    }
    return false;
  },

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

    // MOD 55: pequena janela extra no Bispo para alinhar o contato visual da lâmina
    // com a animação 3D; cada ataque continua causando dano no máximo uma vez.
    const bishopTarget = E === BishopBoss || (E.profile && E.profile.id === 'bishop1');
    const attackWindowGrace = bishopTarget && Player.attackT >= 0 &&
      Player.attackT >= Math.max(0, Player.attackHitStartCurrent - 0.06) &&
      Player.attackT <= Player.attackHitEndCurrent + 0.10;
    // Só acerta durante o golpe (com tolerância curta no chefe) e uma vez por attackId.
    if ((Player.isAttackActive() || attackWindowGrace) && E.hitId !== Player.attackId) {
      const strike = this.playerAttackProfile(E);
      if (this._swordTouches(E, strike, C)) {
        E.hitId = Player.attackId;
        let kx = E.x - Player.x, ky = E.y - Player.y;
        const m = Math.hypot(kx, ky);
        if (m > 0.001) { kx /= m; ky /= m; } else { kx = Player.atkDirX; ky = Player.atkDirY; }
        E.hurt(strike.damage, kx, ky, strike.knockback);
        if(typeof Sfx!=='undefined')Sfx.hit();
        if(typeof BishopDimension!=='undefined'&&typeof BishopDimension.impact==='function'&&BishopDimension.isBattleActive())BishopDimension.impact(strike.cameraShake||.6);
        Game.hitstop = Math.max(Game.hitstop, strike.hitstop);
        Camera.shake = Math.max(Camera.shake, strike.cameraShake);
        // Sinal simples para o protótipo 3D acender o núcleo ao confirmar um acerto real.
        window.CelestialSwordHitSerial=(Number(window.CelestialSwordHitSerial)||0)+1;
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
