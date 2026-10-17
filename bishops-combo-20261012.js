'use strict';

/* Mod 86 — HUD de vida do Bispo reage às fases sem partículas permanentes. */
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
    name: 'KHRAVAZOTH',
    title: 'O Bispo do Último Pecado',
    identity: 'O Horror Além da Criação',
    introKicker: 'ENTIDADE SELADA · AQUELE QUE NÃO DEVERIA EXISTIR',
    quote: '“Toda alma tem um último pedido. A sua terá o privilégio de morrer sem ser ouvida.”',
    quoteLabel: '',
    preparation: 'KHRAVAZOTH encurta a distância e ataca em sequências curtas. Defenda no instante exato do golpe para uma Defesa Perfeita, ataque quando ele recuperar o fôlego e esquive dos golpes pesados.',
    hp: 240,
    damage: 0.75, // MOD 51: dano de teste (0.35) substituído por valor de luta real; ajuste aqui se quiser mais fácil/difícil.
    defense: 0.24,
    radius: 18,
    speed: 80,
    engageRange: 180, // MODIFICAÇÃO 15: começa a atacar de mais longe.
    guard: { range: 185, duration: 0.52, cooldown: 3.2, damageScale: 0.28 },
    visualScale: 1.22,
    deathDuration: 1.2,
    guard: { range: 205, duration: 0.42, cooldown: 2.6, damageScale: 0.22 },
    reward: { coins: 120, unlocks: ['greed_bishop_1_defeated'] },
    arena: Casino.bossStart,
    attacks: [
      // MOD 16: alcances coerentes com a distância de início; golpes acompanham melhor quem corre.
      { id: 'tax', name: 'Cobrança', windup: 0.62, duration: 0.64, cooldown: 0.9, range: 165, damage: 16, kb: 260, lunge: 70, hitAt: 0.08, secondHitAt: 0.54, secondHitScale: 0.65, parryable: true },
      // MOD 122: magias negras e Eclipse do Abismo com alvo travado no fim da preparação e janela real para esquiva.
      { id: 'abyssHands', name: 'Mãos do Abismo', skill: true, skillCooldown: 9.5, windup: 1.18, duration: 0.72, cooldown: 1.45, range: 300, areaRadius: 94, damage: 19, kb: 325, lunge: 0, hitAt: 0.22, telegraph: 'hands' },
      { id: 'graveThorns', name: 'Sepultura de Espinhos', skill: true, skillCooldown: 11.5, windup: 1.38, duration: 0.62, cooldown: 1.65, range: 300, areaRadius: 100, damage: 24, kb: 365, lunge: 0, hitAt: 0.18, telegraph: 'spikes' },
      { id: 'blackSwordRain', name: 'Marcha das Lâminas Negras', skill: true, skillCooldown: 17, windup: 1.85, duration: 1.24, cooldown: 2.0, range: 620, areaRadius: 145, damage: 30, kb: 390, lunge: 0, hitAt: 0.72, telegraph: 'swords' },
      { id: 'abyssEclipse', name: 'Eclipse do Abismo', skill: true, skillCooldown: 28, windup: 2.8, duration: 10.2, cooldown: 3.0, range: 620, areaRadius: 115, damage: 42, kb: 520, lunge: 0, hitAt: 8.2, telegraph: 'eclipse', critical: true },
      { id: 'vault', name: 'Cofre Esmagador', skill: true, skillCooldown: 7.0, windup: 0.9, duration: 0.36, cooldown: 1.5, range: 190, damage: 24, kb: 360, lunge: 105, hitAt: 0.12 },
      { id: 'sweep', name: 'Varredura de Ouro', skill: true, skillCooldown: 8.5, windup: 0.72, duration: 0.32, cooldown: 1.05, range: 178, damage: 19, kb: 310, lunge: 92, hitAt: 0.09, parryable: true }
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

// Pré-carrega e decodifica os retratos dos Bispos em segundo plano, um por vez, logo após o carregamento do jogo.
// Antes, o PNG só começava a ser baixado/decodificado quando a apresentação abria, congelando a tela na entrada.
const BossArtPreload = (function () {
  const keep = [];
  function run() {
    Object.keys(BISHOP_PROFILES).forEach(function (key, i) {
      const asset = BISHOP_PROFILES[key].portraitAsset;
      if (!asset) return;
      setTimeout(function () {
        const img = new Image();
        img.decoding = 'async';
        img.src = asset;
        if (img.decode) img.decode().catch(function () {});
        keep.push(img);
      }, 1200 + i * 500);
    });
  }
  if (document.readyState === 'complete') run();
  else window.addEventListener('load', run, { once: true });
  return { keep: keep };
})();

// Retrato do protagonista: reaproveita o desenho real do jogador (Player.draw) em um canvas pequeno.
// É vetorial, não depende de arquivo externo nem do GLB e é gerado uma única vez (leve e confiável).
const HeroPortrait = (function () {
  let url = '', overrideUrl = '';
  function build() {
    if (overrideUrl) return overrideUrl;
    if (url) return url;
    try {
      const W = 192, H = 192, k = 4.3;
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      const g = c.getContext('2d');
      const bg = g.createRadialGradient(W / 2, H * 0.38, 8, W / 2, H * 0.5, W * 0.75);
      bg.addColorStop(0, '#5b6fa3');
      bg.addColorStop(0.55, '#262a52');
      bg.addColorStop(1, '#0f0d22');
      g.fillStyle = bg;
      g.fillRect(0, 0, W, H);
      const halo = g.createRadialGradient(W / 2, H * 0.34, 4, W / 2, H * 0.34, W * 0.42);
      halo.addColorStop(0, 'rgba(255,230,160,.38)');
      halo.addColorStop(1, 'rgba(255,230,160,0)');
      g.fillStyle = halo;
      g.fillRect(0, 0, W, H);
      const who = Object.create(Player);
      Object.assign(who, {
        x: 0, y: 0, z: 0, floor: 0, anim: 0, speed: 0, onGround: true, dead: false,
        hurtT: 0, blinkT: 0, blocking: false, blockFlash: 0, squash: 0,
        fx: 0, fy: 1, attackT: -1
      });
      g.save();
      g.translate(W / 2, H / 2 + 22 * k);
      g.scale(k, k);
      who.draw(g);
      g.restore();
      url = c.toDataURL('image/png');
    } catch (e) { url = ''; }
    return url;
  }
  function apply(el, withTag) {
    if (!el) return;
    const src = build();
    if (!src) return;
    let img = el.querySelector('img');
    if (!img) {
      img = document.createElement('img');
      img.alt = '';
      img.setAttribute('aria-hidden', 'true');
      img.draggable = false;
      el.insertBefore(img, el.firstChild);
    }
    img.src = src;
    el.classList.add('has-art');
    if (withTag && !el.querySelector('.hero-tag')) {
      el.textContent = '';
      el.appendChild(img);
      const tag = document.createElement('span');
      tag.className = 'hero-tag';
      tag.textContent = 'VOCÊ';
      el.appendChild(tag);
    }
  }
  function init() { apply(document.getElementById('hero-portrait'), false); }
  function set3D(src) {
    if (typeof src !== 'string' || !src.startsWith('data:image/')) return;
    overrideUrl = src;
    url = src;
    init();
    const mark = document.querySelector('.boss-intro-player-mark');
    if (mark) apply(mark, true);
  }
  window.SetHeroPortrait3D = set3D;
  if (document.readyState === 'complete') setTimeout(init, 300);
  else window.addEventListener('load', function () { setTimeout(init, 300); }, { once: true });
  return { build: build, apply: apply, set3D: set3D };
})();

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
        art.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 9%;pointer-events:none;';
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
    HeroPortrait.apply(this.el.querySelector('.boss-intro-player-mark'), true);
    this.phase = 0;
    this.open = true;
    Game.talking = true;
    this.elTitle.textContent = profile.introKicker || (profile.identity ? 'OPONENTE · ' + profile.identity : 'OPONENTE');
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

/* IA TÁTICA DO VALÉRIO — camada separada para evoluir depois com magias e poderes. */
const ValerioCombatAI = {
  version: 6, predictSeconds: 0.28, maxLead: 54, reset() {},
  defensiveChoice(boss, player, distance) {
    if (distance > 205 || (boss.evadeCooldown > 0 && boss.guardCooldown > 0)) return null;
    const speed=Math.hypot(player.vx||0,player.vy||0), active=Number(player.attackT)>=0, repeated=(boss.playerAttackTempo||0)>=2;
    if (!active && !repeated && boss.phase<3) return null;
    if (active && distance<92 && boss.guardCooldown<=0 && (boss.phase<3 || speed<115)) return 'guard';
    if (boss.evadeCooldown<=0 && ((distance>88 && (speed>36 || repeated || boss.phase>=2)) || (boss.phase>=3 && distance>58))) return 'evade';
    if (active && boss.guardCooldown<=0) return 'guard';
    if (boss.evadeCooldown<=0 && active) return 'evade';
    return null;
  },
  evadeVector(boss,player) {
    const dx=player.x-boss.x,dy=player.y-boss.y,d=Math.hypot(dx,dy)||1,side=boss.attackIndex%2===0?1:-1;
    return {x:(-dx/d*.42)+(-dy/d*side*.91),y:(-dy/d*.42)+(dx/d*side*.91)};
  },
  target(boss,player,dx,dy,distance) {
    const speed=Math.hypot(player.vx||0,player.vy||0);
    if(distance<95||speed<35)return{x:player.x,y:player.y};
    const t=Math.min(this.predictSeconds,this.maxLead/Math.max(speed,1));
    return{x:player.x+(player.vx||0)*t,y:player.y+(player.vy||0)*t};
  },
  chooseAttack(profile,attacks,cooldowns,index,chainCooldown,distance,playerSpeed,player) {
    const ready=attacks.filter(a=>!a.skill||(cooldowns[a.id]||0)<=0),normal=attacks.filter(a=>!a.skill),pool=ready.length?ready:normal;
    if(!pool.length)return null;
    const find=id=>pool.find(a=>a.id===id),available=id=>!!find(id)&&(!find(id).skill||(cooldowns[id]||0)<=0);
    const phase=BishopBoss.phase||1,blocking=!!(player&&player.blocking),fast=playerSpeed>100,previous=BishopBoss.lastChosenAttackId;
    const different=ids=>{const options=ids.map(find).filter(Boolean);return options.find(a=>a.id!==previous)||options[0]||null;};
    if(blocking&&distance<185){const breaker=different(['vault','tax']);if(breaker)return breaker;}
    if(fast&&distance>72&&distance<225&&available('sweep'))return find('sweep');
    if(distance<102)return different(['tax'])||normal[0]||pool[0];
    if(distance>235&&chainCooldown<=0){
      const ultimate=find('abyssEclipse');
      if(ultimate&&available('abyssEclipse')&&phase>=2&&playerSpeed<72)return ultimate;
      const ranged=distance>350?['blackSwordRain','graveThorns','abyssHands']:(fast?['blackSwordRain','graveThorns','abyssHands']:['graveThorns','blackSwordRain','abyssHands']);
      const pick=different(ranged.filter(available));if(pick)return pick;
    }
    if(distance>150&&chainCooldown<=0){
      const mid=fast?['abyssHands','blackSwordRain','vault']:['graveThorns','abyssHands','vault'];
      const pick=different(mid.filter(available));if(pick)return pick;
    }
    if(distance>112&&available('vault')&&(phase>=2||!fast))return find('vault');
    const candidates=pool.filter(a=>a.id!==previous);
    return candidates.find(a=>!a.skill)||candidates[0]||pool[0];
  }
};

const BishopBoss = {
  type: 'bishop',
  profile: null,
  x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, kx: 0, ky: 0,
  r: 18, hp: 1, maxHp: 1, trail: 1, trailDelay: 0,
  state: 'inactive', stateT: 0, flashT: 0, alpha: 0, evadeCooldown: 0,
  hitDone: false, hitDoneSecondary: false, hitDonePrimary: false, hitId: -1, fx: -1, fy: 0,
  anim: 0, speed: 0, onGround: true, floor: 0, sy: 0,
  attack: null, attackIndex: 0, phase: 1, guardCooldown: 0, skillCooldowns: Object.create(null), skillChainCooldown: 0, skillRotationIndex: 0, skillTargetX: null, skillTargetY: null, lastChosenAttackId: null, magicThreatT: 0, magicThreatX: 0, magicThreatY: 0, magicCutCooldown: 0, _solids: [],
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
    this.skillTargetX = this.skillTargetY = null;
    this.hitDone = false;
    this.hitDoneSecondary = false;
    this.hitDonePrimary = false;
    this.hitId = -1;
    this.phase = 1;
    this.guardCooldown = 0;
    this.evadeCooldown = 0;
    this.lastPlayerAttackId = Player.attackId;
    this.playerAttackTempo = 0;
    this.playerAttackWindow = 0;
    this.pendingDefense = null;
    this.pendingDefenseT = 0;
    this.skillCooldowns = Object.create(null);
    this.skillChainCooldown = 0;
    this.skillRotationIndex = 0;
    this.lastChosenAttackId = null; this.magicThreatT = 0; this.magicCutCooldown = 0;
    window.ValerioMagicCutActive = false;
    this.poise = this.poiseMax = 28; this.chain = 0; this.staggerDur = 0; this.staggerImmuneT = 0;
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
    this.hitDoneSecondary = false;
    this.hitDonePrimary = false;
    this.hitId = -1;
    this.fx = -1; this.fy = 0.2;
    this.attackIndex = 0;
    this.phase = 1;
    this.playerAttackTempo = 0;
    this.playerAttackWindow = 0;
    this.guardCooldown = 0;
    this.evadeCooldown = 0;
    this.skillCooldowns = Object.create(null);
    this.skillChainCooldown = 0;
    this.lastChosenAttackId = null; this.magicThreatT = 0; this.magicCutCooldown = 0;
    window.ValerioMagicCutActive = false;
    this.onGround = true; this.floor = 0; this.sy = this.y;
    this.poise = this.poiseMax = 28; this.chain = 0; this.staggerDur = 0; this.staggerImmuneT = 0;
    this.updateHud();
    Sfx.blip();
    Camera.shake = Math.max(Camera.shake, 4);
    Ambient.spawnSpark(this.x, this.y - 20, 22, '#f2c654');
    Ambient.spawnSpark(this.x, this.y - 20, 8, '#ffffff');
  },

  _go(state) {
    this.state = state;
    this.stateT = 0;
    if (state === 'windup') { this.skillTargetX = this.skillTargetY = null; }
    if (state === 'attack') { this.hitDone = false; this.hitDoneSecondary = false; this.hitDonePrimary = false; }
  },

  hurt(rawDamage, dx, dy, kb) {
    if (this.state === 'dead' || this.state === 'inactive' || !this.profile) return;
    window.ValerioBossHitSerial = (window.ValerioBossHitSerial || 0) + 1;
    const guarding = this.state === 'guard';
    if (this.profile.id === 'bishop1' && this.state === 'evade' && this.stateT <= 0.27) {
      Ambient.spawnSpark(this.x, this.y - 20, 3, '#d7d9c8');
      Sfx.blip();
      return;
    }
    const skillLocked = !!(this.attack && this.attack.skill && ['skillapproach','windup','attack','recover'].includes(this.state));
    // MOD 51: golpes leves não cancelam o ataque do Valério (acabou o "spam de botão").
    // Só o finalizador do combo, a quebra de postura ou uma abertura real (recuperação,
    // aproximação, respiro) o fazem tropeçar. Depois de tropeçar ele fica imune por um instante.
    const isV1 = this.profile.id === 'bishop1';
    const heavyHit = (typeof Player !== 'undefined' && Player.comboStage === 2 && Player.attackT >= 0) || rawDamage >= 15.5;
    const committed = isV1 && !skillLocked && !guarding && ['windup', 'attack', 'skillapproach'].includes(this.state);
    let poiseHeld = false;
    if (isV1 && !guarding) {
      this.poise -= rawDamage;
      if (committed && !heavyHit && this.poise > 0) poiseHeld = true;
      else if (committed || this.poise <= 0) this.poise = this.poiseMax;
    }
    const staggerImmune = isV1 && this.staggerImmuneT > 0 && this.state !== 'stagger';
    const guardScale = guarding && this.profile.guard ? this.profile.guard.damageScale : 1;
    const damage = Math.max(1, Math.round(rawDamage * (1 - this.profile.defense) * guardScale));
    this.hp = Math.max(0, this.hp - damage);
    this.trailDelay = 0.5;
    this.flashT = 0.09;
    this.kx = (guarding || skillLocked) ? 0 : dx * kb * 0.72;
    this.ky = (guarding || skillLocked) ? 0 : dy * kb * 0.72;
    if (!skillLocked && !poiseHeld) this.vx = this.vy = 0;
    if (poiseHeld) { this.kx *= 0.25; this.ky *= 0.25; }
    // O Bispo deve reagir ao golpe sem ser lançado para cima: a reação visual
    // é feita pelo clip de dano, não por uma velocidade vertical de salto.
    this.vz = 0;
    this.onGround = true;
    const gy = this.y - this.z - 24;
    Ambient.spawnSpark(this.x, gy, 10, '#ffe5a0');
    Ambient.spawnSpark(this.x, gy, 4, '#ffffff');
    Combat.addText(this.x, gy - 12, String(damage), '#ffe066');
    Camera.shake = Math.min(8, Camera.shake + 3);
    Game.hitstop = CFG.COMBAT.hitstop;
    if (this.hp <= 0) {
      this._go('dead');
      this.kx *= 1.3; this.ky *= 1.3;
      // A animação de morte já mostra a queda; não lançar o Bispo para o ar por física adicional.
      this.z = 0;
      this.vz = 0;
      this.floor = 0;
      this.onGround = true;
      Ambient.spawnSpark(this.x, gy, 24, '#f2c654');
      Ambient.spawnSpark(this.x, gy, 9, '#ffffff');
      Sfx.death();
    } else if (skillLocked || poiseHeld || staggerImmune) {
      // Recebe dano normalmente, mas não perde o golpe/skill já iniciado.
      Sfx.hit();
    } else if (guarding) {
      this._go('recover');
      Camera.shake = Math.max(Camera.shake, 2.4);
      Sfx.hit();
    } else {
      // Já em stagger (ex.: depois de uma Defesa Perfeita) a janela não é reiniciada nem encurtada.
      if (this.state !== 'stagger') { this.staggerDur = heavyHit ? 0.46 : 0.34; this._go('stagger'); }
      this.chain = 0;
      Sfx.hit();
    }
    this.updateHud();
  },

  // Queimadura: dano contínuo sem cancelar ataque, defesa ou habilidade já iniciada.
  burnDamage(rawDamage) {
    if (this.state === 'dead' || this.state === 'inactive' || !this.profile) return;
    const damage = Math.max(1, Math.round(rawDamage * (1 - this.profile.defense)));
    this.hp = Math.max(0, this.hp - damage);
    this.trailDelay = 0.5;
    this.flashT = Math.max(this.flashT, 0.055);
    const gy = this.y - this.z - 24;
    Ambient.spawnSpark(this.x, gy, 3, '#ff8a25');
    Combat.addText(this.x, gy - 13, '-' + damage, '#ff8a25');
    if (this.hp <= 0) {
      this._go('dead');
      this.kx = this.ky = 0;
      this.z = this.vz = this.floor = 0;
      this.onGround = true;
      Ambient.spawnSpark(this.x, gy, 14, '#ff8a25');
      Ambient.spawnSpark(this.x, gy, 6, '#ffe9a0');
      Sfx.death();
    }
    this.updateHud();
  },

  // MOD 51: Defesa Perfeita — o jogador bloqueou no instante do golpe.
  parried() {
    if (!this.profile || this.state === 'dead' || this.state === 'inactive') return;
    this.chain = 0;
    this.kx = this.ky = this.vx = this.vy = 0;
    this.staggerDur = 0.9;
    this.poise = this.poiseMax;
    this._go('stagger');
    Ambient.spawnSpark(this.x, this.y - 28, 16, '#bfe8ff');
    Ambient.spawnSpark(this.x, this.y - 28, 6, '#ffffff');
    Camera.shake = Math.max(Camera.shake, 3.2);
    Sfx.block();
  },

  // Duração real da preparação (considera a fase), usada pela animação 3D para sincronizar o golpe.
  windupDurationNow() {
    if (!this.attack) return 0.6;
    const s = this.profile && this.profile.id === 'bishop1' ? (this.phase >= 3 ? 0.78 : this.phase === 2 ? 0.91 : 1) : 1;
    return this.attack.windup * s;
  },

  update(dt) {
    if (this.state === 'inactive') return;
    this.stateT += dt;
    this.staggerImmuneT = Math.max(0, (this.staggerImmuneT || 0) - dt);
    if (this.poise < this.poiseMax) this.poise = Math.min(this.poiseMax, this.poise + 9 * dt);
    this.flashT = Math.max(0, this.flashT - dt);
    this.guardCooldown = Math.max(0, this.guardCooldown - dt);
    this.evadeCooldown = Math.max(0, this.evadeCooldown - dt);
    this.magicThreatT = Math.max(0, (this.magicThreatT || 0) - dt);
    this.magicCutCooldown = Math.max(0, (this.magicCutCooldown || 0) - dt);
    window.ValerioMagicCutActive = !!(!window.CelestialUltimateActive && this.profile && this.profile.id === 'bishop1' && this.state === 'intercept' && this.stateT >= 0.12 && this.stateT <= 0.72);
    Object.keys(this.skillCooldowns).forEach(id => { this.skillCooldowns[id] = Math.max(0, this.skillCooldowns[id] - dt); });
    this.skillChainCooldown = Math.max(0, this.skillChainCooldown - dt);
    const dx = Player.x - this.x, dy = Player.y - this.y;
    const d = Math.hypot(dx, dy) || 0.001;
    const alive = !Player.dead;
    if (this.profile.id === 'bishop1') {
      this.pendingDefenseT = Math.max(0, this.pendingDefenseT - dt);
      this.playerAttackWindow = Math.max(0, this.playerAttackWindow - dt);
      if (this.pendingDefenseT <= 0) this.pendingDefense = null;
      if (Player.attackId !== this.lastPlayerAttackId) {
        this.lastPlayerAttackId = Player.attackId;
        this.playerAttackTempo = this.playerAttackWindow > 0
          ? Math.min(4, this.playerAttackTempo + 1) : 0;
        this.playerAttackWindow = 1.45;
        if (alive && d <= 225) {
          const response = ValerioCombatAI.defensiveChoice(this, Player, d);
          if (response) { this.pendingDefense = response; this.pendingDefenseT = 0.82; }
        }
      } else if (this.playerAttackWindow <= 0) {
        this.playerAttackTempo = Math.max(0, this.playerAttackTempo - dt * 1.4);
      }
    }
    let tvx = 0, tvy = 0;
    if (!window.CelestialUltimateActive && this.profile.id === 'bishop1' && alive && this.magicThreatT > 0 && this.magicCutCooldown <= 0 && ['approach','recover','breather'].includes(this.state) && d > 42) {
      const tx=(this.magicThreatX||this.x)-this.x,ty=(this.magicThreatY||this.y)-this.y,td=Math.hypot(tx,ty)||1;
      this.fx=tx/td;this.fy=ty/td;this.magicThreatT=0;this.magicCutCooldown=this.phase>=3?3.8:5.2;
      this._go('intercept');Ambient.spawnSpark(this.x,this.y-25,5,'#d8dfff');
    }

    // Três fases reais: o perigo cresce conforme a vida do chefe diminui.
    const healthRatio = this.hp / this.maxHp;
    const nextPhase = healthRatio <= 0.35 ? 3 : healthRatio <= 0.70 ? 2 : 1;
    if (nextPhase > this.phase) {
      this.phase = nextPhase;
      if (this.profile.id === 'bishop1') {
        const message = nextPhase === 3
          ? this.profile.name + ' entra em fúria! Não lhe dê espaço!'
          : this.profile.name + ' abandona a cautela e aumenta a pressão!';
        Quest.toast(message, 2.7);
        Camera.shake = Math.max(Camera.shake, nextPhase === 3 ? 6 : 4);
        Ambient.spawnSpark(this.x, this.y - 28, nextPhase === 3 ? 22 : 12,
          nextPhase === 3 ? '#f07848' : '#d8a94e');
      }
    }
    switch (this.state) {
      case 'approach':
        if (!alive) break;
        const tacticalTarget = this.profile.id === 'bishop1'
          ? ValerioCombatAI.target(this, Player, dx, dy, d)
          : { x: Player.x, y: Player.y };
        const aimX = tacticalTarget.x - this.x, aimY = tacticalTarget.y - this.y;
        const aimD = Math.hypot(aimX, aimY) || 1;
        this.fx = aimX / aimD; this.fy = aimY / aimD;
        if (this.profile.id === 'bishop1') {
          const defense = this.pendingDefenseT > 0 && this.pendingDefense
            ? this.pendingDefense
            : (Player.attackT >= 0 ? ValerioCombatAI.defensiveChoice(this, Player, d) : null);
          if (defense === 'guard' && this.guardCooldown <= 0) {
            this.pendingDefense = null; this.pendingDefenseT = 0;
            this.guardCooldown = this.phase >= 3 ? 1.75 : this.phase === 2 ? 2.2 : 2.6;
            this._go('guard');
            Ambient.spawnSpark(this.x, this.y - 24, 9, '#a9c8d5');
            Sfx.block();
            break;
          }
          if (defense === 'evade' && this.evadeCooldown <= 0) {
            this.pendingDefense = null; this.pendingDefenseT = 0;
            this.evadeCooldown = this.phase >= 3 ? 1.3 : this.phase === 2 ? 1.65 : 2.0;
            const step = ValerioCombatAI.evadeVector(this, Player);
            this.fx = step.x; this.fy = step.y;
            this._go('evade');
            Ambient.spawnDust(this.x, this.y, 8, '#c9b36d', 0.9);
            break;
          }
        }
        // Escolha tática também vale longe: sem rotação cega de magias por índice.
        if (d > (this.profile.engageRange || 66) && this.profile.id === 'bishop1' && this.skillChainCooldown <= 0) {
          const tacticalSkill = ValerioCombatAI.chooseAttack(this.profile, this.profile.attacks, this.skillCooldowns,
            this.attackIndex, this.skillChainCooldown, d, Player.speed || Math.hypot(Player.vx || 0, Player.vy || 0), Player);
          if (tacticalSkill && tacticalSkill.skill && d <= Math.min(tacticalSkill.range * 0.82, 520)) {
            this.attack = tacticalSkill;
            this.lastChosenAttackId = tacticalSkill.id;
            this.attackIndex++;
            this.skillCooldowns[tacticalSkill.id] = tacticalSkill.skillCooldown || 6.5;
            this.skillChainCooldown = 2.5;
            this._go('skillapproach');
            break;
          }
        }
        if (this.profile.guard && this.guardCooldown <= 0 &&
            d <= this.profile.guard.range && Player.isAttackActive()) {
          this.guardCooldown = this.profile.guard.cooldown;
          this._go('guard');
          Ambient.spawnSpark(this.x, this.y - 24, 6, '#98aa9d');
        } else if (d <= (this.profile.engageRange || 66)) {
          const attacks = this.profile.attacks;
          const poolChoice = this.profile.id === 'bishop1'
            ? ValerioCombatAI.chooseAttack(this.profile, attacks, this.skillCooldowns,
                this.attackIndex, this.skillChainCooldown, d, Player.speed || Math.hypot(Player.vx || 0, Player.vy || 0), Player)
            : null;
          if (poolChoice) this.attack = poolChoice;
          else {
            const ready = attacks.filter(a => !a.skill || (this.skillCooldowns[a.id] || 0) <= 0);
            const pool = ready.length ? ready : attacks.filter(a => !a.skill);
            this.attack = pool[this.attackIndex % pool.length];
          }
          this.lastChosenAttackId = this.attack && this.attack.id || this.lastChosenAttackId;
          this.attackIndex++;
          if (this.attack.skill) {
            this.skillCooldowns[this.attack.id] = this.attack.skillCooldown || 6.5;
            this.skillChainCooldown = 2.5;
          }
          // A seleção já respeita as recargas; não substitua uma skill escolhida
          // por um golpe que não existe no conjunto de ataques normais.
          this._go('windup');
        } else {
          const far = d > 145;
          const phaseSpeed = this.phase >= 3 ? 1.36 : this.phase === 2 ? 1.18 : 1;
          const approachSpeed = this.profile.speed * (far ? 1.7 : 1) * phaseSpeed;
          tvx = this.fx * approachSpeed;
          tvy = this.fy * approachSpeed;
        }
        break;

      case 'skillapproach':
        if (!alive) { this._go('approach'); break; }
        this.fx = dx / d; this.fy = dy / d;
        if (!this.attack || !this.attack.skill) { this._go('approach'); break; }
        const rangedDarkSkill = ['abyssHands', 'graveThorns', 'blackSwordRain', 'abyssEclipse'].includes(this.attack.id);
        const skillStartRange = rangedDarkSkill ? Math.min(this.attack.range * 0.82, 520) : Math.min(this.attack.range * 0.78, 68);
        if (d <= skillStartRange) {
          this._go('windup');
        } else {
          tvx = this.fx * this.profile.speed * 1.7;
          tvy = this.fy * this.profile.speed * 1.7;
        }
        break;

      case 'intercept': {
        if (!alive) { window.ValerioMagicCutActive=false;this._go('approach');break; }
        const tx=(this.magicThreatX||this.x)-this.x,ty=(this.magicThreatY||this.y)-this.y,td=Math.hypot(tx,ty)||1;
        this.fx=tx/td;this.fy=ty/td;tvx=tvy=0;
        if(this.stateT>=0.82){window.ValerioMagicCutActive=false;this._go('approach');}
        break;
      }

      case 'guard':
        if (!alive) this._go('approach');
        else {
          this.fx = dx / d; this.fy = dy / d;
          if (this.stateT >= ((this.profile.guard && this.profile.guard.duration) || 0.42)) this._go('approach');
        }
        break;

      case 'evade': {
        if (!alive) { this._go('approach'); break; }
        const ev = ValerioCombatAI.evadeVector(this, Player);
        this.fx = ev.x; this.fy = ev.y;
        tvx = ev.x * this.profile.speed * 2.25;
        tvy = ev.y * this.profile.speed * 2.25;
        if (this.stateT >= 0.34) this._go('approach');
        break;
      }

      case 'windup':
        if (!alive) { this._go('approach'); break; }
        const windupScale = this.profile.id === 'bishop1'
          ? (this.phase >= 3 ? 0.78 : this.phase === 2 ? 0.91 : 1) : 1;
        const windupDuration = this.attack.windup * windupScale;
        // O chefe acompanha durante a preparação, mas trava a direção antes do impacto.
        // Isso dá uma janela legível para esquivar em vez de corrigir a mira até o último instante.
        const aimLockWindow = Math.min(0.18, windupDuration * 0.30);
        if (this.stateT < windupDuration - aimLockWindow) {
          this.fx = dx / d; this.fy = dy / d;
        }
        if (this.stateT >= windupDuration) {
          if (['abyssHands', 'graveThorns', 'blackSwordRain', 'abyssEclipse'].includes(this.attack.id)) {
            // Trava o centro no fim do aviso: mover-se depois evita o impacto.
            this.skillTargetX = Player.x;
            this.skillTargetY = Player.y;
          } else {
            this.skillTargetX = this.skillTargetY = null;
          }
          this._go('attack');
          this.kx += this.fx * this.attack.lunge;
          this.ky += this.fy * this.attack.lunge;
          Camera.shake = Math.max(Camera.shake, (this.attack.id === 'vault' || this.attack.id === 'abyssEclipse') ? 3.5 : 1.5);
          if (this.attack.id === 'vault') Ambient.spawnDust(this.x, this.y, 10, '#d8b65a', 1.4);
          if (this.attack.id === 'sealwave') Ambient.spawnDust(this.x, this.y, 15, '#89988e', 1.5);
          if (this.attack.id === 'abyssEclipse') { Camera.shake = Math.max(Camera.shake, 6); Ambient.spawnSpark(this.x, this.y - this.z - 12, 22, '#ff123f'); }
        }
        break;

      case 'attack':
        if (!this.hitDone && this.stateT >= this.attack.hitAt) {
          const isValerio = this.profile.id === 'bishop1';
          const facingDot=(this.fx*dx+this.fy*dy)/(d||1);
          // MODIFICAÇÃO 14: hitbox ampla e contato reavaliado durante quase
          // todo o movimento do golpe. Soma os raios dos corpos ao alcance nominal.
          const contactRange = this.attack.range + (Player.r || 0) + (this.r || 0);
          const contactWindowEnd = Math.min(this.attack.duration - 0.035, this.attack.hitAt + 0.46);
          const areaSkill = ['abyssHands', 'graveThorns', 'blackSwordRain', 'abyssEclipse'].includes(this.attack.id);
          const targetDistance = areaSkill && Number.isFinite(this.skillTargetX) && Number.isFinite(this.skillTargetY)
            ? Math.hypot(Player.x - this.skillTargetX, Player.y - this.skillTargetY) : Infinity;
          const canReach = alive && (areaSkill
            ? targetDistance <= (this.attack.areaRadius || 64) + (Player.r || 0)
            : d <= contactRange && facingDot > 0.12) &&
            Math.abs(Player.z - this.z) < Math.max(CFG.COMBAT.bodyH, 54);
          if (canReach) {
            const phaseDamage = this.profile.id === 'bishop1'
              ? (this.phase >= 3 ? 1.16 : this.phase === 2 ? 1.07 : 1) : 1;
            const baseDamage = this.attack.damage * this.profile.damage * phaseDamage;
            // Sem hitbox de cabeça, críticos aleatórios ficam invisíveis e injustos.
            // Só ataques explicitamente marcados podem aplicar crítico; golpes pesados
            // continuam previsíveis e são anunciados antes da animação.
            const heavyImpact = baseDamage >= 27 || this.attack.id === 'vault';
            const critical = this.attack.critical === true;
            const primaryDamage = Player.hurt(baseDamage,
              this.x, this.y, this.attack.kb,
              { critical: critical, knockdown: critical || heavyImpact, parryable: this.attack.parryable === true });
            if (primaryDamage > 0) {
              this.hitDone = true;
              this.hitDonePrimary = true;
              Ambient.spawnSpark(Player.x, Player.y - Player.z - 12, 7,
                areaSkill ? '#c91e32' : (this.profile.id === 'bishop3' ? '#b8d0c3' : '#f3c14e'));
              if (areaSkill) {
                Ambient.spawnSpark(Player.x, Player.y - Player.z - 12, 5, '#17121b');
                Camera.shake = Math.max(Camera.shake, this.attack.id === 'graveThorns' ? 5.2 : 3.8);
                if (typeof BishopDimension !== 'undefined') BishopDimension.impact(this.attack.id === 'graveThorns' ? 1.2 : .9);
              }
            } else if (!isValerio || this.stateT >= contactWindowEnd) {
              // Não mostrar impacto falso nem consumir a janela enquanto o jogador
              // estiver invulnerável; o contato pode ser reavaliado até o fim do golpe.
              this.hitDone = true;
            }
          } else if (!isValerio || this.stateT >= contactWindowEnd) {
            this.hitDone = true;
          }
          if (this.attack.id === 'vault') {
            Ambient.spawnSpark(this.x, this.y - 7, 12, '#f2c654');
            Camera.shake = Math.max(Camera.shake, 4);
          }
        }
        // Cobrança tem dois impactos visuais (espada e mão livre): cada um
        // precisa de sua própria janela de acerto, sem duplicar o primeiro dano.
        if (Number.isFinite(this.attack.secondHitAt) && !this.hitDoneSecondary &&
            this.stateT >= this.attack.secondHitAt) {
          // O segundo impacto só consome sua janela depois de tentar acertar.
          // O segundo impacto sempre precisa confirmar alcance e direção. Se o primeiro conectou,
          // ele pode atravessar apenas a invulnerabilidade desse mesmo golpe — nunca acertar de longe.
          const secondFacingDot=(this.fx*dx+this.fy*dy)/(d||1);
          const secondCanReach=alive && d <= this.attack.range + (Player.r || 0) + (this.r || 0) && secondFacingDot > 0.12 &&
            Math.abs(Player.z - this.z) < Math.max(CFG.COMBAT.bodyH, 54);
          if (!Player.dead && secondCanReach) {
            // Compatibilidade defensiva: limpar a invulnerabilidade antes do
            // segundo impacto também funciona se uma versão antiga de player.js
            // ainda estiver em cache e não reconhecer a opção ignoreInvuln.
            const previousInvuln = Player.invuln;
            if (this.hitDonePrimary) Player.invuln = 0;
            const secondaryDamage = Player.hurt(
              this.attack.damage * (this.attack.secondHitScale || 0.65) * this.profile.damage *
                (this.profile.id === 'bishop1' ? (this.phase >= 3 ? 1.16 : this.phase === 2 ? 1.07 : 1) : 1),
              this.x, this.y, this.attack.kb * 0.35,
              { ignoreInvuln: this.hitDonePrimary }
            );
            if (secondaryDamage <= 0 && !Player.dead) {
              Player.invuln = Math.max(Player.invuln || 0, previousInvuln || 0);
            }
            if (secondaryDamage > 0) {
              Ambient.spawnSpark(Player.x, Player.y - Player.z - 12, 6, '#ffffff');
            }
          }
          this.hitDoneSecondary = true;
        }
        if (this.stateT >= this.attack.duration) this._go('recover');
        break;

      case 'recover': {
        // MOD 51: recuperação nunca some por completo; é a janela de contra-ataque do jogador.
        const recoveryScale = this.phase >= 3 ? 0.62 : this.phase === 2 ? 0.8 : 1;
        const cooldown = ((this.attack && this.attack.cooldown) || 0.6) * recoveryScale;
        if (this.stateT >= cooldown) {
          if (!alive) { this._go('recover'); break; }
          if (this.profile.id === 'bishop1') {
            // Depois de 2 golpes seguidos (3 na fúria) ele para para respirar: intervalo para reagir.
            this.chain = (this.chain || 0) + 1;
            if (this.chain >= (this.phase >= 3 ? 3 : 2)) { this.chain = 0; this._go('breather'); break; }
          }
          this._go('approach');
        }
        break;
      }

      case 'breather': {
        if (!alive) { this._go('approach'); break; }
        this.fx = dx / d; this.fy = dy / d;
        const rest = this.phase >= 3 ? 0.4 : this.phase === 2 ? 0.55 : 0.75;
        if (this.stateT >= rest) this._go('approach');
        break;
      }

      case 'stagger':
        if (this.stateT >= (this.staggerDur || 0.3)) {
          this.staggerDur = 0;
          this.staggerImmuneT = 0.8; // anti-stunlock: ele não pode ser travado para sempre
          this._go(alive ? 'approach' : 'stagger');
        }
        break;

      case 'dead':
        this.alpha = U.clamp(1 - Math.max(0, this.stateT - 0.65) / 0.8, 0, 1);
        // MOD 56: congela completamente o corpo após a queda. Antes, o knockback
        // residual ainda passava pela física comum e fazia o cadáver deslizar em círculos.
        this.vx = this.vy = this.kx = this.ky = 0;
        this.speed = 0;
        this.sy = this.y;
        return;
    }

    const k = Math.min(1, dt * 9);
    this.vx += (tvx - this.vx) * k;
    this.vy += (tvy - this.vy) * k;
    this._physicsDimension(dt);
    this.speed = Math.hypot(this.vx, this.vy);
    this.anim += dt * (this.speed * 0.06 + 1.2);
    this.sy = this.y;
  },

  // Física própria da dimensão 3D: não usa as pedras/árvores invisíveis do mapa 2D
  // como plataformas, que faziam Valério pousar no ar durante a luta.
  _physicsDimension(dt) {
    const P = CFG.PLAYER;
    // Mantém o lado escolhido por alguns instantes para evitar zigue-zague junto às árvores.
    this._dimensionAvoidHold = Math.max(0, (this._dimensionAvoidHold || 0) - dt);
    this.vz -= P.gravity * dt;
    this.z += this.vz * dt;
    this.floor = 0;
    if (this.z <= 0 && this.vz <= 0) {
      this.z = 0;
      this.vz = 0;
      this.onGround = true;
    } else {
      this.onGround = false;
    }

    const pad = CFG.BOUNDS_PAD || 0;
    let nextX = U.clamp(this.x + (this.vx + this.kx) * dt, pad, World.w - pad);
    let nextY = U.clamp(this.y + (this.vy + this.ky) * dt, pad, World.h - pad);
    const bossRadius = Math.max(40, Number(this.r) || 40);
    const dimensionCollision = typeof BishopDimension !== 'undefined' &&
      typeof BishopDimension.blockedForBoss === 'function' && BishopDimension.isBattleActive();
    if (dimensionCollision) {
      const blockedAt = (x,y) => BishopDimension.blockedForBoss(x,y,bossRadius);
      const hitX = blockedAt(nextX,this.y);
      const hitY = blockedAt(nextX,nextY);
      if (hitX || hitY) {
        // Desvio local: quando o tronco bloqueia a rota direta, tenta os dois lados
        // do obstáculo e escolhe o caminho livre que mais aproxima do jogador.
        const desiredX = (this.vx + this.kx), desiredY = (this.vy + this.ky);
        const desiredLen = Math.hypot(desiredX,desiredY) || 1;
        const baseAngle = Math.atan2(desiredY,desiredX);
        const speed = Math.max(24,Math.hypot(this.vx,this.vy));
        const turnOptions = [Math.PI/3,-Math.PI/3,Math.PI/2,-Math.PI/2,Math.PI*.78,-Math.PI*.78,Math.PI];
        let best = null, bestScore = Infinity;
        const lookAhead = Math.max(34,Math.min(62,speed*.48));
        for (const turn of turnOptions) {
          const angle = baseAngle + turn;
          const tx = this.x + Math.cos(angle)*lookAhead;
          const ty = this.y + Math.sin(angle)*lookAhead;
          if (blockedAt(tx,ty)) continue;
          const targetX = typeof Player !== 'undefined' ? Player.x : this.x;
          const targetY = typeof Player !== 'undefined' ? Player.y : this.y;
          const targetDistance = Math.hypot(targetX-tx,targetY-ty);
          const alignment = (Math.cos(angle)*desiredX+Math.sin(angle)*desiredY)/desiredLen;
          const side = Math.sign(Math.sin(turn));
          const sidePenalty = this._dimensionAvoidHold > 0 && this._dimensionAvoidSide && side !== this._dimensionAvoidSide ? 24 : 0;
          const score = targetDistance - alignment*18 + Math.abs(turn)*3 + sidePenalty;
          if (score < bestScore) { bestScore=score; best={x:tx,y:ty,angle}; }
        }
        if (best) {
          this._dimensionAvoidSide = Math.sign(Math.sin(best.angle - baseAngle)) || this._dimensionAvoidSide || 1;
          this._dimensionAvoidHold = 0.85;
          this.vx = Math.cos(best.angle)*speed;
          this.vy = Math.sin(best.angle)*speed;
          this.kx = this.ky = 0;
          nextX = U.clamp(this.x + this.vx*dt,pad,World.w-pad);
          nextY = U.clamp(this.y + this.vy*dt,pad,World.h-pad);
          if (blockedAt(nextX,nextY)) { nextX=this.x; nextY=this.y; }
        } else {
          if (hitX) { nextX=this.x; this.vx=0; this.kx=0; }
          if (hitY || blockedAt(nextX,nextY)) { nextY=this.y; this.vy=0; this.ky=0; }
        }
      }
    }
    this.x = nextX;
    this.y = nextY;
    const knockbackDamping = Math.exp(-8 * dt);
    this.kx *= knockbackDamping;
    this.ky *= knockbackDamping;
  },

  updateHud() {
    if (!this.elHud) return;
    const active = !!this.profile && this.state !== 'inactive';
    this.elHud.classList.toggle('hidden', !active);
    if (!active) return;
    this.elHudName.textContent = this.profile.name;
    this.elHudTitle.textContent = this.profile.title;
    const healthRatio = Math.max(0, Math.min(1, this.hp / Math.max(1, this.maxHp)));
    this.elHudFill.style.transform = 'scaleX(' + healthRatio.toFixed(3) + ')';
    this.elHudText.textContent = Math.ceil(this.hp) + ' / ' + this.maxHp;
    this.elHud.classList.toggle('phase-two', this.phase >= 2);
    this.elHud.classList.toggle('phase-three', this.phase >= 3);
    this.elHud.classList.toggle('low-health', healthRatio <= 0.35);
    this.elHud.classList.toggle('critical-health', healthRatio <= 0.15);
    this.elHud.dataset.phase = String(this.phase);
    this.elHud.dataset.health = healthRatio <= 0.15 ? 'critical' : healthRatio <= 0.35 ? 'low' : 'stable';
  },

  draw(ctx, t) {
    if (!this.alpha || this.state === 'inactive') return;
    const st = this.state, flash = this.flashT > 0;
    const bob = st === 'approach' ? Math.sin(this.anim) * 1.4 : Math.sin(t * 2) * 0.7;
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = 'rgba(20,10,22,0.38)';
    ctx.beginPath(); ctx.ellipse(this.x, this.y - this.floor, 23, 8, 0, 0, 6.2832); ctx.fill();

    if (st === 'guard') {
      // Escudo arcano frontal, visível enquanto Valério bloqueia.
      const shieldAngle = Math.atan2(this.fy, this.fx);
      ctx.save();
      ctx.globalAlpha = 0.82;
      ctx.strokeStyle = '#b9dce8';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#7cc8e4';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(this.x + this.fx * 17, this.y - this.floor - 27 + this.fy * 8,
        25, shieldAngle - 1.08, shieldAngle + 1.08);
      ctx.stroke();
      ctx.restore();
    }

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
