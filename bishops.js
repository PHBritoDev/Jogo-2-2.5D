'use strict';

/* ============================================================
   BISHOPS — perfis de Bispo e estrutura compartilhada de
   apresentação. O conteúdo do encontro é dado; o fluxo pode ser
   reutilizado por outros oponentes sem reutilizar seu combate.
   ============================================================ */
const BISHOP_PROFILES = {
  greedFirst: {
    id: 'bishop1',
    portraitAsset: './Bispo1.png',
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
    portraitAsset: './Bispo2.png',
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
  },
  greedThird: {
    id: 'bishop3',
    portraitAsset: './Bispo3.png',
    theme: 'greed',
    introStyle: 'testimony',
    introStamp: 'TERCEIRO SELO · REGISTRO DE TESTEMUNHO',
    introPause: 1150,
    name: 'Elior',
    title: 'Terceiro Bispo da Ganância',
    identity: 'O Cartógrafo do Voto',
    personality: 'Frio e metódico; trata promessas como colunas de um registro e evita ameaças vazias.',
    motivation: 'Transformar a necessidade de proteção em consentimento para uma submissão duradoura.',
    greedRelation: 'Para Elior, a Ganância acumula dependência e silêncio, não apenas moedas.',
    quote: '“Não conto moedas. Conto quantas pessoas chamam a própria corrente de abrigo.”',
    testimony: '“O ouro era a primeira coluna. Nós registramos juramentos, compramos silêncio e medimos quem aceita ajoelhar-se em troca de proteção.”',
    quoteLabel: 'FALA FICTÍCIA DO PERSONAGEM · NÃO É VERSÍCULO',
    preparation: 'Elior mede a distância antes de atacar. O círculo de tinta anuncia o golpe amplo: saia da marca ou defenda-se antes de ela fechar.',
    hp: 350,
    damage: 1.02,
    defense: 0.18,
    radius: 21,
    speed: 70,
    engageRange: 78,
    visualScale: 1.34,
    visualStyle: 'archivist',
    deathDuration: 1.35,
    guard: { range: 94, duration: 0.48, cooldown: 2.1, damageScale: 0.42 },
    palette: {
      robe: '#263745',
      phaseTwoRobe: '#472f42',
      gold: '#c3a66c',
      armor: '#53636a',
      skin: '#927d6a',
      mask: '#192329',
      flash: '#d8e4d3'
    },
    reward: { coins: 190, unlocks: ['greed_bishop_3_defeated'] },
    arena: MistValley.bossStart,
    exitPoint: MistValley.returnPoint,
    attacks: [
      { id: 'inkline', name: 'Traço de Escritura', windup: 0.58, duration: 0.25, cooldown: 0.7, range: 61, damage: 18, kb: 255, lunge: 72, hitAt: 0.07 },
      { id: 'pledge', name: 'Risco de Penhor', windup: 0.78, duration: 0.3, cooldown: 0.86, range: 78, damage: 23, kb: 330, lunge: 86, hitAt: 0.1 },
      { id: 'sealwave', name: 'Círculo de Submissão', windup: 1.05, duration: 0.34, cooldown: 1.18, range: 116, damage: 25, kb: 390, lunge: 0, hitAt: 0.12, telegraph: 'ring' }
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
  elStamp: null,

  init() {
    this.el = document.getElementById('boss-intro');
    this.elTitle = document.getElementById('boss-intro-title');
    this.elName = document.getElementById('boss-intro-name');
    this.elSubtitle = document.getElementById('boss-intro-subtitle');
    this.elQuote = document.getElementById('boss-intro-quote');
    this.elQuoteLabel = document.getElementById('boss-intro-quote-label');
    this.elPrep = document.getElementById('boss-intro-prep');
    this.elButton = document.getElementById('boss-intro-button');
    this.elStamp = this.el.querySelector('.boss-intro-stamp');
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
    // Retratos usam a arte oficial do personagem; o SVG antigo fica como fallback.
    const portrait = document.getElementById('boss-intro-portrait');
    if (portrait) {
      const fallback = portrait.querySelector('svg');
      let art = portrait.querySelector('.boss-intro-art');
      if (!art) {
        art = document.createElement('img');
        art.className = 'boss-intro-art';
        art.alt = '';
        art.setAttribute('aria-hidden', 'true');
        art.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:contain;object-position:center bottom;pointer-events:none;';
        portrait.style.position = 'relative';
        portrait.appendChild(art);
      }
      const asset = profile.portraitAsset || '';
      if (asset) {
        art.style.display = 'block';
        art.onload = function () { if (fallback) fallback.style.display = 'none'; };
        art.onerror = function () {
          art.style.display = 'none';
          if (fallback) fallback.style.display = '';
        };
        art.src = asset;
      } else {
        art.style.display = 'none';
        if (fallback) fallback.style.display = '';
      }
    }
    this.phase = 0;
    this.open = true;
    Game.talking = true;
    this.elTitle.textContent = profile.identity ? 'OPONENTE · ' + profile.identity : 'OPONENTE';
    if (this.elStamp) this.elStamp.textContent = profile.introStamp || 'ENCONTRO';
    this.elName.textContent = profile.name || 'Oponente';
    if (this.elSubtitle) this.elSubtitle.textContent = profile.title || '';
    this.elQuote.textContent = profile.quote || '';
    if (this.elQuoteLabel) this.elQuoteLabel.textContent = profile.quoteLabel || '';
    if (this.elPrep) this.elPrep.textContent = profile.preparation ||
      'Observe o tempo dos ataques. Seus movimentos abrem espaço para contra-atacar.';
    this.el.dataset.theme = profile.theme || 'default';
    this.el.dataset.introStyle = profile.introStyle || 'standard';
    this.el.dataset.phase = 'intro';
    this.el.classList.remove('hidden', 'ready', 'prepare', 'testimony');
    this.el.classList.add('entering');
    this.elButton.disabled = false;
    this.elButton.textContent = profile.introStyle === 'testimony' ? 'OUVIR O TESTEMUNHO' : 'PREPARAR-SE';
    Sfx.blip();
  },

  advance() {
    if (!this.open || (this.elButton && this.elButton.disabled)) return;
    if (this.phase === 0) {
      this.phase = 1;
      this.el.classList.remove('entering');
      if (this.profile && this.profile.introStyle === 'testimony') {
        this.el.classList.add('testimony');
        this.el.dataset.phase = 'testimony';
        this.elQuote.textContent = this.profile.testimony || this.profile.quote || '';
        this.elQuoteLabel.textContent = this.profile.quoteLabel || '';
        const wait = this.profile.introPause || 0;
        if (wait) {
          const self = this, profile = this.profile;
          this.elButton.disabled = true;
          this.elButton.textContent = '...';
          window.setTimeout(function () {
            if (!self.open || self.profile !== profile || self.phase !== 1) return;
            self.elButton.disabled = false;
            self.elButton.textContent = 'COMEÇAR A LUTA';
            self.el.classList.add('ready');
            Sfx.blip();
          }, wait);
        } else {
          this.elButton.textContent = 'COMEÇAR A LUTA';
        }
      } else {
        this.el.classList.add('prepare');
        this.el.dataset.phase = 'prepare';
        this.el.classList.add('ready');
        this.elButton.textContent = 'COMEÇAR A LUTA';
      }
      Sfx.blip();
      return;
    }

    this.open = false;
    this.el.classList.add('hidden');
    this.el.classList.remove('ready', 'entering', 'prepare', 'testimony');
    this.el.dataset.phase = 'fight';
    this.el.dataset.introStyle = 'standard';
    this.elButton.disabled = false;
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
  attack: null, attackIndex: 0, phase: 1, guardCooldown: 0, _solids: [],
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
    this.guardCooldown = 0;
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
    this.guardCooldown = 0;
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
    const guarding = this.state === 'guard';
    const guardScale = guarding && this.profile.guard ? this.profile.guard.damageScale : 1;
    const damage = Math.max(1, Math.round(rawDamage * (1 - this.profile.defense) * guardScale));
    this.hp = Math.max(0, this.hp - damage);
    this.trailDelay = 0.5;
    this.flashT = 0.09;
    this.kx = guarding ? 0 : dx * kb * 0.72;
    this.ky = guarding ? 0 : dy * kb * 0.72;
    this.vx = this.vy = 0;
    this.vz = guarding ? 0 : Math.max(this.vz, CFG.COMBAT.hurtPop * 0.65);
    this.onGround = guarding;
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
    } else if (guarding) {
      this._go('recover');
      Camera.shake = Math.max(Camera.shake, 2.4);
      Sfx.hit();
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
    this.guardCooldown = Math.max(0, this.guardCooldown - dt);
    const dx = Player.x - this.x, dy = Player.y - this.y;
    const d = Math.hypot(dx, dy) || 0.001;
    const alive = !Player.dead;
    let tvx = 0, tvy = 0;

    if (this.hp / this.maxHp <= 0.5) this.phase = 2;
    switch (this.state) {
      case 'approach':
        if (!alive) break;
        this.fx = dx / d; this.fy = dy / d;
        if (this.profile.guard && this.guardCooldown <= 0 &&
            d <= this.profile.guard.range && Player.isAttackActive()) {
          this.guardCooldown = this.profile.guard.cooldown;
          this._go('guard');
          Ambient.spawnSpark(this.x, this.y - 24, 6, '#98aa9d');
        } else if (d <= (this.profile.engageRange || 66)) {
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

      case 'guard':
        if (!alive) this._go('approach');
        else if (this.stateT >= this.profile.guard.duration) this._go('approach');
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
          if (this.attack.id === 'sealwave') Ambient.spawnDust(this.x, this.y, 15, '#89988e', 1.5);
        }
        break;

      case 'attack':
        if (!this.hitDone && this.stateT >= this.attack.hitAt) {
          this.hitDone = true;
          if (alive && d < this.attack.range && Math.abs(Player.z - this.z) < CFG.COMBAT.bodyH) {
            Player.hurt(this.attack.damage * this.profile.damage, this.x, this.y, this.attack.kb);
            Ambient.spawnSpark(Player.x, Player.y - Player.z - 12, 7,
              this.profile.id === 'bishop3' ? '#b8d0c3' : '#f3c14e');
          }
          if (this.attack.id === 'vault') {
            Ambient.spawnSpark(this.x, this.y - 7, 12, '#f2c654');
            Camera.shake = Math.max(Camera.shake, 4);
          }
        }
        if (this.stateT >= this.attack.duration) this._go('recover');
        break;

      case 'recover': {
        const cooldown = ((this.attack && this.attack.cooldown) || 0.6) * (this.phase === 2 ? 0.72 : 1);
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

    if (st === 'windup' && this.attack && this.attack.telegraph === 'ring') {
      const progress = U.clamp(this.stateT / this.attack.windup, 0, 1);
      ctx.save();
      ctx.globalAlpha = .28 + progress * .56;
      ctx.strokeStyle = this.phase === 2 ? '#c68ba9' : '#9cbaa9';
      ctx.lineWidth = 2 + progress * 2;
      ctx.setLineDash([7, 6]);
      ctx.beginPath();
      ctx.ellipse(this.x, this.y - this.floor + 1, this.attack.range * (.48 + progress * .52),
        this.attack.range * (.3 + progress * .3), 0, 0, 6.2832);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    ctx.save();
    ctx.translate(this.x, this.y - this.z);
    ctx.scale(this.profile.visualScale || 1, this.profile.visualScale || 1);

    const colors = this.profile.palette || {};
    const robe = flash ? (colors.flash || '#f2d9aa') :
      (this.phase === 2 ? (colors.phaseTwoRobe || '#69224f') : (colors.robe || '#48254f'));
    const gold = flash ? '#fff0c8' : (colors.gold || '#e0b348');
    if (this.profile.visualStyle === 'archivist') {
      this._drawArchivist(ctx, st, bob, robe, gold, colors, flash);
    } else {
      this._drawClassicBishop(ctx, st, bob, robe, gold, colors, flash);
    }

    if (st === 'windup') {
      const warning = this.attack && this.attack.id === 'vault' ? '$' :
        (this.attack && this.attack.telegraph === 'ring' ? '◎' : '!');
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
      ctx.fillStyle = this.profile.id === 'bishop3' ? '#d4e2d6' : '#ffe69a';
      const label = this.profile.name + ' · BISPO';
      ctx.strokeText(label, this.x, this.y - this.z - 68);
      ctx.fillText(label, this.x, this.y - this.z - 68);
    }
    ctx.globalAlpha = 1;
  },

  _drawClassicBishop(ctx, st, bob, robe, gold, colors, flash) {
    // Silhueta mantida para os primeiros Bispos.
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
  },

  _drawArchivist(ctx, st, bob, robe, gold, colors, flash) {
    // Silhueta temporária exclusiva: manto de arquivo, máscara sem olhos e
    // uma placa de registro no lugar da mitra e das ombreiras tradicionais.
    ctx.fillStyle = robe;
    ctx.beginPath();
    ctx.moveTo(-14, -34 + bob); ctx.lineTo(-25, -3 + bob);
    ctx.lineTo(-20, 4 + bob); ctx.lineTo(20, 4 + bob);
    ctx.lineTo(25, -3 + bob); ctx.lineTo(14, -34 + bob);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = colors.armor || '#53636a';
    ctx.fillRect(-14, -29 + bob, 28, 12);
    ctx.fillStyle = gold;
    ctx.fillRect(-12, -13 + bob, 24, 3);
    ctx.fillRect(-8, -5 + bob, 16, 2);

    ctx.strokeStyle = flash ? '#fff0c8' : gold;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, -36 + bob, 17, Math.PI * 1.08, Math.PI * 1.92);
    ctx.stroke();
    ctx.fillStyle = flash ? (colors.flash || '#d8e4d3') : (colors.skin || '#927d6a');
    ctx.beginPath(); ctx.ellipse(0, -38 + bob, 9, 11, 0, 0, 6.2832); ctx.fill();
    ctx.fillStyle = flash ? '#344139' : (colors.mask || '#192329');
    ctx.beginPath();
    ctx.moveTo(-9, -40 + bob); ctx.lineTo(9, -40 + bob);
    ctx.lineTo(6, -32 + bob); ctx.lineTo(0, -29 + bob); ctx.lineTo(-6, -32 + bob);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = gold; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-5, -36 + bob); ctx.lineTo(5, -36 + bob); ctx.stroke();

    // Prancheta / registro visível na mão esquerda.
    ctx.save();
    const guarding = st === 'guard';
    ctx.translate(guarding ? this.fx * 17 : (st === 'attack' ? this.fx * 17 : -20),
      -20 + bob + (st === 'windup' ? -4 : 0));
    ctx.rotate(guarding ? this.fx * .32 : (st === 'attack' ? this.fx * .18 : -.12));
    ctx.fillStyle = guarding ? '#3a4b4a' : '#222d31';
    ctx.fillRect(guarding ? -9 : -6, guarding ? -13 : -9, guarding ? 18 : 12, guarding ? 25 : 19);
    ctx.strokeStyle = gold; ctx.lineWidth = guarding ? 2 : 1.3;
    ctx.strokeRect(guarding ? -9 : -6, guarding ? -13 : -9, guarding ? 18 : 12, guarding ? 25 : 19);
    ctx.strokeStyle = flash ? '#fff0c8' : '#98aa9d'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-3, -4); ctx.lineTo(3, -4);
    ctx.moveTo(-3, 0); ctx.lineTo(2, 0); ctx.moveTo(-3, 4); ctx.lineTo(3, 4); ctx.stroke();
    ctx.restore();
  }
};
