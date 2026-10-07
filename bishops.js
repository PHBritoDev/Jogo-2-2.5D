'use strict';

/* ============================================================
   BISHOPS — dados do primeiro Bispo e estrutura compartilhada de
   apresentação. O conteúdo do encontro é dado; o fluxo pode ser
   reutilizado por outros oponentes sem reutilizar seu combate.
   ============================================================ */
const BISHOP_PROFILES = {
  greedFirst: {
    id: 'bishop1',
    theme: 'greed',
    name: 'Valério',
    title: 'Primeiro Bispo da Ganância',
    identity: 'O Tesoureiro da Torre',
    quote: '“Tudo tem um preço. Até a sua coragem.”',
    quoteLabel: 'FALA FICTÍCIA DO PERSONAGEM · NÃO É VERSÍCULO',
    preparation: 'Valério encurta a distância antes de atacar. Espere o golpe terminar para contra-atacar.',
    hp: 240,
    damage: 1,
    defense: 0.24,
    radius: 18,
    speed: 76,
    visualScale: 1.22,
    deathDuration: 1.2,
    reward: { coins: 120, unlocks: ['greed_bishop_1_defeated'] },
    arena: Casino.bossStart,
    attacks: [
      { id: 'tax', name: 'Cobrança', windup: 0.62, duration: 0.28, cooldown: 0.72, range: 58, damage: 16, kb: 260, lunge: 70, hitAt: 0.08 },
      { id: 'vault', name: 'Cofre Esmagador', windup: 0.9, duration: 0.36, cooldown: 1.02, range: 82, damage: 24, kb: 360, lunge: 105, hitAt: 0.12 },
      { id: 'sweep', name: 'Varredura de Ouro', windup: 0.72, duration: 0.32, cooldown: 0.84, range: 72, damage: 19, kb: 310, lunge: 92, hitAt: 0.09 }
    ]
  },
  greedSecond: {
    id: 'bishop2',
    theme: 'greed',
    name: 'Nérion',
    title: 'Segundo Bispo da Ganância',
    identity: 'O Contador das Ruínas',
    quote: '“A conta atravessa gerações. O selo só muda quem pode cobrar.”',
    quoteLabel: 'FALA FICTÍCIA DO PERSONAGEM · NÃO É VERSÍCULO',
    preparation: 'Nérion pressiona com golpes curtos e rápidos. Afaste-se durante o aviso dourado e ataque na recuperação.',
    hp: 300,
    damage: 1.08,
    defense: 0.2,
    radius: 20,
    speed: 88,
    visualScale: 1.3,
    deathDuration: 1.25,
    palette: {
      robe: '#202936',
      phaseTwoRobe: '#6b2c33',
      gold: '#b88e4b',
      armor: '#56616a',
      skin: '#8d766b',
      mask: '#151a22',
      flash: '#eed4a0'
    },
    reward: { coins: 150, unlocks: ['greed_bishop_2_defeated'] },
    arena: RuinedCity.bossStart,
    exitPoint: RuinedCity.returnPoint,
    attacks: [
      { id: 'ledger', name: 'Conta Vencida', windup: 0.52, duration: 0.24, cooldown: 0.68, range: 60, damage: 18, kb: 270, lunge: 86, hitAt: 0.07 },
      { id: 'seal', name: 'Selo de Cobrança', windup: 0.82, duration: 0.35, cooldown: 0.92, range: 86, damage: 26, kb: 370, lunge: 110, hitAt: 0.11 },
      { id: 'chain', name: 'Corrente de Penhores', windup: 0.64, duration: 0.3, cooldown: 0.76, range: 74, damage: 20, kb: 320, lunge: 94, hitAt: 0.08 }
    ]
  }
};

const BossPresentation = {
  open: false,
  phase: 0,
  profile: null,
  onReady: null,
  el: null,
  elTitle: null,
  elName: null,
  elSubtitle: null,
  elQuote: null,
  elPrep: null,
  elQuoteLabel: null,
  elButton: null,

  init() {
    this.el = document.getElementById('boss-intro');
    this.elTitle = document.getElementById('boss-intro-title');
    this.elName = document.getElementById('boss-intro-name');
    this.elSubtitle = document.getElementById('boss-intro-subtitle');
    this.elQuote = document.getElementById('boss-intro-quote');
    this.elQuoteLabel = document.getElementById('boss-intro-quote-label');
    this.elPrep = document.getElementById('boss-intro-prep');
    this.elButton = document.getElementById('boss-intro-button');
    if (!this.el || !this.elButton) return;
    const self = this;
    this.elButton.addEventListener('click', function () { self.advance(); });
    window.addEventListener('keydown', function (e) {
      if (!self.open || (e.code !== 'Enter' && e.code !== 'Space')) return;
      e.preventDefault();
      self.advance();
    });
  },

  start(profile, onReady) {
    if (!this.el) this.init();
    if (!this.el) { if (onReady) onReady(); return; }
    this.profile = profile;
    this.onReady = onReady || null;
    this.phase = 0;
    this.open = true;
    Game.talking = true;
    this.elTitle.textContent = profile.identity ? 'OPONENTE · ' + profile.identity : 'OPONENTE';
    this.elName.textContent = profile.name || 'Oponente';
    if (this.elSubtitle) this.elSubtitle.textContent = profile.title || '';
    this.elQuote.textContent = profile.quote || '';
    if (this.elQuoteLabel) this.elQuoteLabel.textContent = profile.quoteLabel || '';
    if (this.elPrep) this.elPrep.textContent = profile.preparation ||
      'Observe o tempo dos ataques. Seus movimentos abrem espaço para contra-atacar.';
    this.el.dataset.theme = profile.theme || 'default';
    this.el.dataset.phase = 'intro';
    this.el.classList.remove('hidden', 'ready', 'prepare');
    this.el.classList.add('entering');
    this.elButton.textContent = 'PREPARAR-SE';
    Sfx.blip();
  },

  advance() {
    if (!this.open) return;
    if (this.phase === 0) {
      this.phase = 1;
      this.el.classList.remove('entering');
      this.el.classList.add('prepare');
      this.el.dataset.phase = 'prepare';
      this.el.classList.add('ready');
      this.elButton.textContent = 'COMEÇAR A LUTA';
      Sfx.blip();
      return;
    }

    this.open = false;
    this.el.classList.add('hidden');
    this.el.classList.remove('ready', 'entering', 'prepare');
    this.el.dataset.phase = 'fight';
    Game.talking = false;
    const done = this.onReady;
    this.onReady = null;
    if (done) done();
  }
};

const BishopBoss = {
  type: 'bishop',
  profile: null,
  x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, kx: 0, ky: 0,
  r: 18, hp: 1, maxHp: 1, trail: 1, trailDelay: 0,
  state: 'inactive', stateT: 0, flashT: 0, alpha: 0,
  hitDone: false, hitId: -1, fx: -1, fy: 0,
  anim: 0, speed: 0, onGround: true, floor: 0, sy: 0,
  attack: null, attackIndex: 0, phase: 1, _solids: [],
  elHud: null, elHudName: null, elHudTitle: null, elHudFill: null, elHudText: null,

  init() {
    this.elHud = document.getElementById('boss-hud');
    this.elHudName = document.getElementById('boss-hud-name');
    this.elHudTitle = document.getElementById('boss-hud-title');
    this.elHudFill = document.getElementById('boss-hud-fill');
    this.elHudText = document.getElementById('boss-hud-text');
    this.reset();
  },

  reset() {
    this.profile = null;
    this.state = 'inactive';
    this.stateT = 0;
    this.alpha = 0;
    this.hp = this.maxHp = this.trail = 1;
    this.trailDelay = 0;
    this.vx = this.vy = this.vz = this.kx = this.ky = 0;
    this.attack = null;
    this.hitDone = false;
    this.hitId = -1;
    this.phase = 1;
    this.updateHud();
  },

  begin(profile) {
    this.profile = profile;
    this.x = profile.arena.x;
    this.y = profile.arena.y;
    this.z = this.vx = this.vy = this.vz = this.kx = this.ky = 0;
    this.r = profile.radius;
    this.hp = this.maxHp = this.trail = profile.hp;
    this.trailDelay = 0;
    this.state = 'approach';
    this.stateT = 0;
    this.flashT = 0;
    this.alpha = 1;
    this.hitDone = false;
    this.hitId = -1;
    this.fx = -1; this.fy = 0.2;
    this.attackIndex = 0;
    this.phase = 1;
    this.onGround = true; this.floor = 0; this.sy = this.y;
    this.updateHud();
    Sfx.blip();
    Camera.shake = Math.max(Camera.shake, 4);
    Ambient.spawnSpark(this.x, this.y - 20, 22, '#f2c654');
    Ambient.spawnSpark(this.x, this.y - 20, 8, '#ffffff');
  },

  _go(state) {
    this.state = state;
    this.stateT = 0;
    if (state === 'attack') this.hitDone = false;
  },

  hurt(rawDamage, dx, dy, kb) {
    if (this.state === 'dead' || this.state === 'inactive' || !this.profile) return;
    const damage = Math.max(1, Math.round(rawDamage * (1 - this.profile.defense)));
    this.hp = Math.max(0, this.hp - damage);
    this.trailDelay = 0.5;
    this.flashT = 0.09;
    this.kx = dx * kb * 0.72;
    this.ky = dy * kb * 0.72;
    this.vx = this.vy = 0;
    this.vz = Math.max(this.vz, CFG.COMBAT.hurtPop * 0.65);
    this.onGround = false;
    const gy = this.y - this.z - 24;
    Ambient.spawnSpark(this.x, gy, 10, '#ffe5a0');
    Ambient.spawnSpark(this.x, gy, 4, '#ffffff');
    Combat.addText(this.x, gy - 12, String(damage), '#ffe066');
    Camera.shake = Math.min(8, Camera.shake + 3);
    Game.hitstop = CFG.COMBAT.hitstop;
    if (this.hp <= 0) {
      this._go('dead');
      this.kx *= 1.3; this.ky *= 1.3;
      this.vz = 190;
      Ambient.spawnSpark(this.x, gy, 24, '#f2c654');
      Ambient.spawnSpark(this.x, gy, 9, '#ffffff');
      Sfx.death();
    } else {
      if (this.hp / this.maxHp <= 0.5 && this.phase === 1) {
        this.phase = 2;
        Quest.toast(this.profile.name + ' acelera os golpes: o selo está em risco!', 2.7);
        Camera.shake = Math.max(Camera.shake, 4);
      }
      this._go('stagger');
      Sfx.hit();
    }
    this.updateHud();
  },

  update(dt) {
    if (this.state === 'inactive') return;
    this.stateT += dt;
    this.flashT = Math.max(0, this.flashT - dt);
    const dx = Player.x - this.x, dy = Player.y - this.y;
    const d = Math.hypot(dx, dy) || 0.001;
    const alive = !Player.dead;
    let tvx = 0, tvy = 0;

    if (this.hp / this.maxHp <= 0.5) this.phase = 2;
    switch (this.state) {
      case 'approach':
        if (!alive) break;
        this.fx = dx / d; this.fy = dy / d;
        if (d <= 66) {
          const attacks = this.profile.attacks;
          this.attack = attacks[this.attackIndex % attacks.length];
          this.attackIndex++;
          if (this.phase === 2 && this.attackIndex % 3 === 0) this.attack = attacks[1];
          this._go('windup');
        } else {
          tvx = this.fx * this.profile.speed * (this.phase === 2 ? 1.22 : 1);
          tvy = this.fy * this.profile.speed * (this.phase === 2 ? 1.22 : 1);
        }
        break;

      case 'windup':
        if (!alive) { this._go('approach'); break; }
        this.fx = dx / d; this.fy = dy / d;
        if (this.stateT >= this.attack.windup) {
          this._go('attack');
          this.kx += this.fx * this.attack.lunge;
          this.ky += this.fy * this.attack.lunge;
          Camera.shake = Math.max(Camera.shake, this.attack.id === 'vault' ? 3.5 : 1.5);
          if (this.attack.id === 'vault') Ambient.spawnDust(this.x, this.y, 10, '#d8b65a', 1.4);
        }
        break;

      case 'attack':
        if (!this.hitDone && this.stateT >= this.attack.hitAt) {
          this.hitDone = true;
          if (alive && d < this.attack.range && Math.abs(Player.z - this.z) < CFG.COMBAT.bodyH) {
            Player.hurt(this.attack.damage * this.profile.damage, this.x, this.y, this.attack.kb);
            Ambient.spawnSpark(Player.x, Player.y - Player.z - 12, 7, '#f3c14e');
          }
          if (this.attack.id === 'vault') {
            Ambient.spawnSpark(this.x, this.y - 7, 12, '#f2c654');
            Camera.shake = Math.max(Camera.shake, 4);
          }
        }
        if (this.stateT >= this.attack.duration) this._go('recover');
        break;

      case 'recover': {
        const cooldown = this.attack.cooldown * (this.phase === 2 ? 0.72 : 1);
        if (this.stateT >= cooldown) this._go(alive ? 'approach' : 'recover');
        break;
      }

      case 'stagger':
        if (this.stateT >= 0.3) this._go(alive ? 'approach' : 'stagger');
        break;

      case 'dead':
        this.alpha = U.clamp(1 - Math.max(0, this.stateT - 0.65) / 0.8, 0, 1);
        break;
    }

    const k = Math.min(1, dt * 9);
    this.vx += (tvx - this.vx) * k;
    this.vy += (tvy - this.vy) * k;
    Enemy._physics.call(this, dt);
    this.speed = Math.hypot(this.vx, this.vy);
    this.anim += dt * (this.speed * 0.06 + 1.2);
    this.sy = this.y;
  },

  updateHud() {
    if (!this.elHud) return;
    const active = !!this.profile && this.state !== 'inactive';
    this.elHud.classList.toggle('hidden', !active);
    if (!active) return;
    this.elHudName.textContent = this.profile.name;
    this.elHudTitle.textContent = this.profile.title;
    this.elHudFill.style.transform = 'scaleX(' + (this.hp / this.maxHp).toFixed(3) + ')';
    this.elHudText.textContent = Math.ceil(this.hp) + ' / ' + this.maxHp;
    this.elHud.classList.toggle('phase-two', this.phase === 2);
  },

  draw(ctx, t) {
    if (!this.alpha || this.state === 'inactive') return;
    const st = this.state, flash = this.flashT > 0;
    const bob = st === 'approach' ? Math.sin(this.anim) * 1.4 : Math.sin(t * 2) * 0.7;
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = 'rgba(20,10,22,0.38)';
    ctx.beginPath(); ctx.ellipse(this.x, this.y - this.floor, 23, 8, 0, 0, 6.2832); ctx.fill();

    ctx.save();
    ctx.translate(this.x, this.y - this.z);
    ctx.scale(this.profile.visualScale || 1, this.profile.visualScale || 1);

    // Manto alto e ombreiras de metal: silhueta própria do Bispo.
    const colors = this.profile.palette || {};
    const robe = flash ? (colors.flash || '#f2d9aa') :
      (this.phase === 2 ? (colors.phaseTwoRobe || '#69224f') : (colors.robe || '#48254f'));
    const gold = flash ? '#fff0c8' : (colors.gold || '#e0b348');
    ctx.fillStyle = robe;
    ctx.beginPath();
    ctx.moveTo(-12, -31 + bob); ctx.lineTo(-22, -8 + bob);
    ctx.lineTo(-17, 1 + bob); ctx.lineTo(17, 1 + bob);
    ctx.lineTo(22, -8 + bob); ctx.lineTo(12, -31 + bob);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = gold;
    ctx.beginPath(); ctx.moveTo(-12, -26 + bob); ctx.lineTo(0, -9 + bob); ctx.lineTo(12, -26 + bob); ctx.lineTo(7, -4 + bob); ctx.lineTo(-7, -4 + bob); ctx.closePath(); ctx.fill();

    // Ombreiras e braços mudam durante o ataque.
    ctx.fillStyle = flash ? (colors.flash || '#f2d9aa') : (colors.armor || '#8c6434');
    ctx.beginPath(); ctx.ellipse(-16, -24 + bob, 7, 5, -0.4, 0, 6.2832); ctx.fill();
    ctx.beginPath(); ctx.ellipse(16, -24 + bob, 7, 5, 0.4, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = gold;
    ctx.lineWidth = st === 'attack' ? 6 : 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-15, -20 + bob);
    ctx.lineTo(st === 'attack' ? this.fx * 24 : -19, -13 + bob + this.fy * 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(15, -20 + bob);
    ctx.lineTo(st === 'attack' ? -this.fx * 12 : 19, -13 + bob);
    ctx.stroke();

    // Cabeça, máscara e mitra dourada.
    ctx.fillStyle = flash ? (colors.flash || '#ffe8bd') : (colors.skin || '#d4b18b');
    ctx.beginPath(); ctx.arc(0, -36 + bob, 9, 0, 6.2832); ctx.fill();
    ctx.fillStyle = flash ? '#624735' : (colors.mask || '#302333');
    ctx.fillRect(-8, -37 + bob, 16, 6);
    ctx.fillStyle = gold;
    ctx.beginPath();
    ctx.moveTo(-10, -42 + bob); ctx.lineTo(-8, -53 + bob); ctx.lineTo(-2, -47 + bob);
    ctx.lineTo(0, -57 + bob); ctx.lineTo(3, -47 + bob); ctx.lineTo(9, -52 + bob);
    ctx.lineTo(10, -42 + bob); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff0b0';
    ctx.fillRect(-1, -53 + bob, 2, 7);

    if (st === 'windup') {
      const warning = this.attack && this.attack.id === 'vault' ? '$' : '!';
      ctx.font = 'bold 21px sans-serif'; ctx.textAlign = 'center';
      ctx.lineWidth = 3; ctx.strokeStyle = '#20151f'; ctx.fillStyle = '#ffe066';
      ctx.strokeText(warning, 0, -65 + bob); ctx.fillText(warning, 0, -65 + bob);
    }
    ctx.restore();

    if (st !== 'dead') {
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.82)';
      ctx.fillStyle = '#ffe69a';
      const label = this.profile.name + ' · BISPO';
      ctx.strokeText(label, this.x, this.y - this.z - 68);
      ctx.fillText(label, this.x, this.y - this.z - 68);
    }
    ctx.globalAlpha = 1;
  }
};
