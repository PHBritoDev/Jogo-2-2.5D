'use strict';

/* ============================================================
   GREED — o COBIÇOSO, primeiro inimigo comum da Ganância.
   Usa o sistema de combate existente (Combat/Player.hurt/Sfx)
   e reaproveita a física do Enemy.

   Identidade:
   - goblin esverdeado com saco de moedas nas costas, anda aos pulinhos
   - ataque: agarrão. Se acertar sem você defender, ROUBA moedas
     e foge com o saco; derrotá-lo devolve tudo + recompensa
   - ao morrer, vira uma explosão de moedas

   Estados: gone, emerge, idle, chase, windup, attack, recover,
            flee, stagger, dead
   ============================================================ */
const Greedling = {
  type: 'greedling',
  x: 0, y: 0, z: 0,
  vx: 0, vy: 0, vz: 0,
  kx: 0, ky: 0,
  r: 11,
  hp: 1, maxHp: 1, trail: 1, trailDelay: 0,
  state: 'gone',
  stateT: 0,
  flashT: 0,
  alpha: 0,
  hitDone: false,
  hitId: -1,
  fx: -1, fy: 0,
  anim: 0, speed: 0,
  onGround: true, floor: 0,
  sy: 0,
  hopT: 0,
  loot: 0,          // moedas roubadas do jogador
  fleeLeft: 0,
  _solids: [],

  _setup(x, y) {
    const G = CFG.GREED;
    this.x = x; this.y = y; this.z = 0; this.sy = y;
    this.vx = this.vy = this.vz = 0;
    this.kx = this.ky = 0;
    this.r = G.radius;
    this.maxHp = G.hp; this.hp = G.hp; this.trail = G.hp; this.trailDelay = 0;
    this.flashT = 0; this.hitDone = false; this.hitId = -1;
    this.fx = -1; this.fy = 0.3;
    this.onGround = true; this.floor = 0;
    this.hopT = 0; this.fleeLeft = 0;
  },

  _go(s) {
    this.state = s;
    this.stateT = 0;
    if (s === 'attack') this.hitDone = false;
  },

  // Surge do monte de ouro (acontecimento)
  emerge(x, y) {
    this._setup(x, y);
    this.loot = 0;
    this.alpha = 0;
    this.vz = 330;
    this.onGround = false;
    this._go('emerge');
    Ambient.spawnSpark(x, y - 12, 14, '#ffe066');
    Ambient.spawnSpark(x, y - 12, 6, '#ffffff');
    Ambient.spawnDust(x, y, 8, '#cdb58a', 1.5);
  },

  // Chamado em Combat.reset (jogador morreu): se a luta estava em andamento, volta ao monte
  reset() {
    if (typeof Quest !== 'undefined' && Quest.step === 'fight' && Quest.pile) {
      const keep = this.loot;
      this._setup(Quest.pile.x, Quest.pile.y);
      this.loot = keep;       // continua com as moedas roubadas
      this.alpha = 1;
      this._go('idle');
    } else {
      this.state = 'gone';
      this.alpha = 0;
      this.loot = 0;
    }
  },

  hurt(dmg, dx, dy, kb) {
    if (this.state === 'dead' || this.state === 'gone') return;
    const C = CFG.COMBAT;
    this.hp = Math.max(0, this.hp - dmg);
    this.trailDelay = 0.45;
    this.flashT = 0.14;
    this.kx = dx * kb; this.ky = dy * kb;
    this.vx = 0; this.vy = 0;
    this.vz = Math.max(this.vz, C.hurtPop);
    this.onGround = false;
    this.alpha = 1;

    const gy = this.y - this.z - 14;
    Ambient.spawnSpark(this.x, gy, 8, '#ffe066');
    Ambient.spawnSpark(this.x, gy, 4, '#ffffff');
    Combat.addText(this.x, this.y - this.z - 40, String(dmg), '#ffd34d');
    Camera.shake = Math.min(6, Camera.shake + 3);
    Game.hitstop = C.hitstop;

    if (this.hp <= 0) {
      this._go('dead');
      this.kx *= 1.3; this.ky *= 1.3;
      this.vz = 200;
      Ambient.spawnSpark(this.x, gy, 18, '#ffd34d');
      Ambient.spawnSpark(this.x, gy, 6, '#ffffff');
      Sfx.death();
      Sfx.coin();
      Quest.onGreedDefeated(this);
    } else {
      this._go('stagger');
      Sfx.hit();
    }
  },

  // Rouba moedas do jogador e foge
  _steal() {
    const G = CFG.GREED;
    const n = Math.min(Quest.coins, G.steal);
    if (n <= 0) return;
    Quest.coins -= n;
    this.loot += n;
    this.fleeLeft = G.fleeTime;
    this._go('flee');
    Combat.addText(Player.x, Player.y - Player.z - 56, '-' + n + ' moedas!', '#ffd34d');
    Ambient.spawnSpark(Player.x, Player.y - Player.z - 20, 8, '#ffe066');
    Sfx.coin();
    Quest.toast('O Cobiçoso roubou suas moedas! Derrote-o para recuperá-las.', 3);
  },

  update(dt) {
    if (this.state === 'gone') return;
    const G = CFG.GREED;
    this.stateT += dt;
    this.flashT = Math.max(0, this.flashT - dt);
    this.hopT -= dt;

    const dx = Player.x - this.x, dy = Player.y - this.y;
    const d = Math.hypot(dx, dy) || 0.001;
    const alive = !Player.dead;
    let tvx = 0, tvy = 0;

    switch (this.state) {
      case 'emerge':
        this.alpha = Math.min(1, this.stateT / 0.2);
        this.fx = dx / d; this.fy = dy / d;
        if (this.stateT >= 0.65) this._go('chase');
        break;

      case 'idle':
        if (alive && d < G.sight) this._go('chase');
        break;

      case 'chase': {
        if (!alive || d > G.giveUp) { this._go('idle'); break; }
        this.fx = dx / d; this.fy = dy / d;
        if (d < G.attackRange) { this._go('windup'); break; }
        if (this.onGround && this.hopT <= 0) {   // pulinho: avança mais rápido no ar
          this.vz = G.hopV; this.onGround = false; this.hopT = 0.36;
        }
        const m = this.onGround ? 0.3 : 1.25;
        tvx = this.fx * G.speed * m;
        tvy = this.fy * G.speed * m;
        break;
      }

      case 'windup':   // telegrafa o agarrão (dá tempo de defender ou desviar)
        this.fx = dx / d; this.fy = dy / d;
        if (this.stateT >= G.windup) {
          this._go('attack');
          this.kx += this.fx * G.lunge;
          this.ky += this.fy * G.lunge;
        }
        break;

      case 'attack':
        if (!this.hitDone && this.stateT >= 0.05) {
          this.hitDone = true;
          if (alive && d < G.hitRange && Math.abs(Player.z - this.z) < CFG.COMBAT.bodyH) {
            const blocking = Player.blocking;
            const dealt = Player.hurt(G.damage, this.x, this.y, G.kb);
            if (dealt > 0 && !blocking) this._steal();   // defendendo = não perde moedas
          }
        }
        if (this.state === 'attack' && this.stateT >= G.attackDur) this._go('recover');
        break;

      case 'recover':
        if (this.stateT >= G.cooldown) this._go(alive && d < G.sight ? 'chase' : 'idle');
        break;

      case 'flee': {   // foge com o saco (o jogador é mais rápido: dá para alcançar)
        this.fleeLeft -= dt;
        const ax = -dx / d, ay = -dy / d;
        const side = 0.5 * Math.sin(this.stateT * 3);
        const lx = ax - ay * side, ly = ay + ax * side;
        const ll = Math.hypot(lx, ly) || 1;
        this.fx = lx / ll; this.fy = ly / ll;
        if (this.onGround && this.hopT <= 0) {
          this.vz = G.hopV; this.onGround = false; this.hopT = 0.3;
        }
        const m = this.onGround ? 0.45 : 1.2;
        tvx = this.fx * G.fleeSpeed * m;
        tvy = this.fy * G.fleeSpeed * m;
        if (this.fleeLeft <= 0 || !alive) this._go('chase');
        break;
      }

      case 'stagger':
        if (this.stateT >= G.stagger) this._go(this.loot > 0 && this.fleeLeft > 0 ? 'flee' : 'chase');
        break;

      case 'dead':   // dissolve em moedas
        this.alpha = U.clamp(1 - (this.stateT - 0.55) / 0.4, 0, 1);
        if (this.stateT >= 0.95) { this.state = 'gone'; this.alpha = 0; return; }
        break;
    }

    const k = Math.min(1, dt * 10);
    this.vx += (tvx - this.vx) * k;
    this.vy += (tvy - this.vy) * k;

    Enemy._physics.call(this, dt);   // mesma física do inimigo base

    this.speed = Math.hypot(this.vx, this.vy);
    this.anim += dt * this.speed * 0.09;
    this.sy = this.y;
  },

  draw(ctx, t) {
    if (this.alpha <= 0 || this.state === 'gone') return;
    const st = this.state;
    const G = CFG.GREED;
    const h = this.z - this.floor;
    const ss = 1 - Math.min(h, 120) / 240;
    const flash = this.flashT > 0;
    const portraitHeight = TerritoryEnemyVisuals.commonHeight();

    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = 'rgba(10,30,15,' + (0.3 * ss).toFixed(3) + ')';
    ctx.beginPath();
    ctx.ellipse(
      this.x, this.y - this.floor,
      (portraitHeight ? 18 : 11) * ss + 2,
      (portraitHeight ? 7 : 4.6) * ss + 1,
      0, 0, 6.2832
    );
    ctx.fill();

    const s = Math.sin(this.anim);
    const moving = this.speed > 8;
    const bob = moving && this.onGround ? Math.abs(s) * 1.5 : (st === 'idle' ? Math.sin(t * 3) * 0.6 : 0);

    ctx.save();
    ctx.translate(this.x, this.y - this.z);

    // Deformação: agacha ao preparar, estica ao pular/atacar, achata ao morrer
    let sx = 1, sy = 1;
    if (st === 'windup') { const p = Math.min(1, this.stateT / G.windup); sy = 1 - 0.16 * p; sx = 1 + 0.14 * p; }
    else if (st === 'attack') { sy = 1.1; sx = 0.92; }
    else if (st === 'dead') { const p = Math.min(1, this.stateT / 0.3); sy = 1 - 0.75 * p; sx = 1 + 0.5 * p; }
    else if (!this.onGround) { const v = U.clamp(this.vz / 900, -0.1, 0.16); sy = 1 + v; sx = 1 - v * 0.6; }
    else if (st === 'idle') { sy = 1 + Math.sin(t * 3) * 0.02; }
    ctx.scale(sx, sy);

    // O Cobiçoso usa o mesmo visual comum definido para o território ativo.
    // Com arte disponível, nenhum elemento vetorial antigo é desenhado por baixo.
    const usesTerritorySprite = TerritoryEnemyVisuals.drawCommon(ctx, this, bob);
    if (!usesTerritorySprite) {
      ctx.translate(0, -bob);

    // Cores (branco ao levar dano; dourado pulsante ao preparar o golpe)
    let body = '#7d8a2e', skin = '#93a336', belly = '#a9b84a', vest = '#d9a521';
    if (flash) { body = skin = belly = vest = '#ffffff'; }
    else if (st === 'windup' && ((this.stateT * 14) | 0) % 2 === 0) { skin = '#c4cf4a'; belly = '#e6e87a'; }

    // Pés
    ctx.fillStyle = flash ? '#ffffff' : '#4f5a22';
    ctx.beginPath(); ctx.ellipse(-4.5, -1.5 - (moving && this.onGround ? Math.max(0, s) * 2 : 0), 4, 2.5, 0, 0, 6.2832); ctx.fill();
    ctx.beginPath(); ctx.ellipse(4.5, -1.5 - (moving && this.onGround ? Math.max(0, -s) * 2 : 0), 4, 2.5, 0, 0, 6.2832); ctx.fill();

    // ----- Saco de moedas nas costas (cresce com o roubo) -----
    const sr = 7.5 + Math.min(this.loot, 12) * 0.45;
    const wob = Math.sin(t * 12) * (st === 'flee' ? 1.4 : 0.4);
    const front = this.fy < -0.3;   // de costas para a câmera: saco fica na frente
    const fxv = this.fx;
    const drawSack = function () {
      const bx = -fxv * 8 + wob, by = -15 - (front ? 0 : 3);
      ctx.fillStyle = flash ? '#ffffff' : '#b98f2e';
      ctx.beginPath(); ctx.arc(bx, by, sr, 0, 6.2832); ctx.fill();
      ctx.fillStyle = flash ? '#ffffff' : '#8a6a1d';
      ctx.beginPath(); ctx.arc(bx + sr * 0.35, by + sr * 0.2, sr * 0.55, 0, 6.2832); ctx.fill();
      // laço
      ctx.fillStyle = flash ? '#ffffff' : '#6b4a14';
      ctx.fillRect(bx - 3, by - sr - 1, 6, 3);
      // moedas aparecendo no topo quando tem saque
      if (Greedling.loot > 0) {
        ctx.fillStyle = flash ? '#ffffff' : '#ffd34d';
        const n = Math.min(4, 1 + (Greedling.loot / 3 | 0));
        for (let i = 0; i < n; i++) {
          ctx.beginPath(); ctx.ellipse(bx - 4 + i * 3, by - sr - 2 - (i % 2), 2.6, 1.6, 0, 0, 6.2832); ctx.fill();
        }
      }
      ctx.fillStyle = flash ? '#ffffff' : '#fff0b0';
      ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('$', bx, by + 3);
    };
    if (!front) drawSack();

    ctx.translate(0, -(moving && this.onGround ? Math.abs(s) * 1.5 : 0));

    // Corpo + colete dourado
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.ellipse(0, -11, 9.5, 9.5, 0, 0, 6.2832); ctx.fill();
    ctx.fillStyle = belly;
    ctx.beginPath(); ctx.ellipse(0, -9, 5.5, 6, 0, 0, 6.2832); ctx.fill();
    ctx.fillStyle = vest;
    ctx.fillRect(-8.5, -13, 17, 2.6);

    // Braços longos e mãos grandes (agarram)
    ctx.strokeStyle = flash ? '#ffffff' : '#6f7b28';
    ctx.lineWidth = 3.4; ctx.lineCap = 'round';
    ctx.fillStyle = skin;
    if (st === 'windup' || st === 'attack') {
      const ext = st === 'windup' ? 9 + 5 * Math.min(1, this.stateT / G.windup) : 24;
      const hx = this.fx * ext, hy = -13 + this.fy * ext * 0.6;
      ctx.beginPath(); ctx.moveTo(this.fx * 6, -13); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.beginPath(); ctx.arc(hx, hy, 4.4, 0, 6.2832); ctx.fill();
      // garras
      ctx.strokeStyle = flash ? '#ffffff' : '#ffe066'; ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(hx + this.fx * 3, hy - 3); ctx.lineTo(hx + this.fx * 7, hy - 4);
      ctx.moveTo(hx + this.fx * 3, hy); ctx.lineTo(hx + this.fx * 8, hy);
      ctx.moveTo(hx + this.fx * 3, hy + 3); ctx.lineTo(hx + this.fx * 7, hy + 4);
      ctx.stroke();
      ctx.beginPath(); ctx.arc(-10, -9, 3, 0, 6.2832); ctx.fill();
    } else {
      const sw = moving && this.onGround ? s * 2 : 0;
      const up = st === 'flee' ? -4 : 0;   // levanta os braços ao fugir com o saque
      ctx.beginPath(); ctx.arc(-11, -9 + sw + up, 3.2, 0, 6.2832); ctx.fill();
      ctx.beginPath(); ctx.arc(11, -9 - sw + up, 3.2, 0, 6.2832); ctx.fill();
    }

    // Cabeça grande com orelhas pontudas
    ctx.fillStyle = skin;
    ctx.beginPath(); ctx.moveTo(-8, -26); ctx.lineTo(-16, -29); ctx.lineTo(-8, -21); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(8, -26); ctx.lineTo(16, -29); ctx.lineTo(8, -21); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, -23, 9.5, 8, 0, 0, 6.2832); ctx.fill();

    // Coroinha torta de moedas
    ctx.fillStyle = flash ? '#ffffff' : '#ffd34d';
    ctx.beginPath();
    ctx.moveTo(-6, -29); ctx.lineTo(-5, -35); ctx.lineTo(-2, -30); ctx.lineTo(0, -36);
    ctx.lineTo(2, -30); ctx.lineTo(5, -35); ctx.lineTo(6, -29); ctx.closePath(); ctx.fill();

    // Rosto (some quando de costas): olhos com pupila de moeda + sorriso com dente de ouro
    if (this.fy > -0.5 && st !== 'dead') {
      const ex = this.fx * 2;
      ctx.fillStyle = flash ? '#ffffff' : '#ffe066';
      ctx.beginPath(); ctx.arc(-4 + ex, -24, 3.3, 0, 6.2832); ctx.fill();
      ctx.beginPath(); ctx.arc(4 + ex, -24, 3.3, 0, 6.2832); ctx.fill();
      ctx.fillStyle = '#5a3d0c';
      ctx.fillRect(-4.5 + ex + this.fx * 1, -26, 1, 4);
      ctx.fillRect(3.5 + ex + this.fx * 1, -26, 1, 4);
      ctx.strokeStyle = '#3a2a08'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(ex, -20.5, 4.5, 0.15, Math.PI - 0.15);
      ctx.stroke();
      ctx.fillStyle = flash ? '#ffffff' : '#ffd34d';
      ctx.fillRect(ex + 1.5, -20.5, 2, 2.4);
    }

    // De costas: saco por cima
    if (front) drawSack();

    // Alerta antes do golpe ($ quando fugindo com o saque)
    if (st === 'windup' || st === 'flee') {
      const gold = st === 'flee';
      ctx.fillStyle = '#ffdd33';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      const ch = gold ? '$' : '!';
      const by = -42 + (gold ? Math.sin(t * 10) * 2 : 0);
      ctx.strokeText(ch, 0, by);
      ctx.fillText(ch, 0, by);
    }
    } else if (st === 'windup' || st === 'flee') {
      // Mantém o aviso de ataque/roubo como indicador de combate, fora do corpo.
      const ch = st === 'flee' ? '$' : '!';
      ctx.fillStyle = '#ffdd33';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      const by = -portraitHeight - 32 + (st === 'flee' ? Math.sin(t * 10) * 2 : 0);
      ctx.strokeText(ch, 0, by);
      ctx.fillText(ch, 0, by);
    }

    ctx.restore();

    // Barra de vida + nome sobre a cabeça
    if (st !== 'dead' && st !== 'emerge' && (this.hp < this.maxHp || (st !== 'idle'))) {
      const w = portraitHeight ? 50 : 34;
      const bx = this.x - w / 2;
      const by = this.y - this.z - (portraitHeight ? portraitHeight + 15 : 50);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(bx - 1, by - 1, w + 2, 6);
      ctx.fillStyle = '#ffb347';
      ctx.fillRect(bx, by, w * (this.trail / this.maxHp), 4);
      ctx.fillStyle = this.hp / this.maxHp < 0.3 ? '#e04040' : '#c9d93a';
      ctx.fillRect(bx, by, w * (this.hp / this.maxHp), 4);
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'rgba(0,0,0,0.75)';
      ctx.fillStyle = '#ffe066';
      ctx.strokeText('COBIÇOSO', this.x, by - 3);
      ctx.fillText('COBIÇOSO', this.x, by - 3);
    }

    ctx.globalAlpha = 1;
  }
};
