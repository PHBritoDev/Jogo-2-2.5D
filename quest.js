'use strict';

/* ============================================================
   QUEST — ferramentas da campanha: moedas, caixa de diálogo com
   escolhas, HUD de objetivo, marcador de objetivo, Aurélio (NPC)
   e o acontecimento da Ganância da missão 1.

   A ORDEM das missões/etapas fica no campaign.js (Campaign).
   Aqui ficam as peças que as etapas usam.
   O gancho do conflito é Quest.pending (ver "refuse" abaixo).
   ============================================================ */

/* ---------------- Diálogo (nós com texto, próximo e escolhas) ----------------
   Nó: { who, text (string ou função), next: 'id', choices: [ {t, act, next} ] | função }
   Sem "next" e sem "choices" = fim do diálogo. */
const Dialog = {
  open: false,
  nodes: null, cur: null, list: [], onEnd: null, t0: 0,
  el: null, elWho: null, elText: null, elChoices: null, elHint: null,

  init() {
    this.el = document.getElementById('dialog');
    this.elWho = document.getElementById('dlg-who');
    this.elText = document.getElementById('dlg-text');
    this.elChoices = document.getElementById('dlg-choices');
    this.elHint = document.getElementById('dlg-hint');
    const self = this;
    this.el.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('.dlg-choice')) return;
      self.advance();
    });
    window.addEventListener('keydown', function (e) {
      if (!self.open) return;
      const m = /^Digit([1-4])$/.exec(e.code);
      if (m) self.choose(+m[1] - 1);
    });
  },

  start(nodes, id, onEnd) {
    this.nodes = nodes;
    this.onEnd = onEnd || null;
    this.open = true;
    Game.talking = true;
    this.el.classList.remove('hidden');
    this.show(id);
  },

  show(id) {
    const n = this.nodes[id];
    if (!n) { this.close(); return; }
    this.cur = n;
    if (n.enter) n.enter();
    this.elWho.textContent = n.who || '';
    this.elText.textContent = typeof n.text === 'function' ? n.text() : n.text;
    this.list = n.choices ? (typeof n.choices === 'function' ? n.choices() : n.choices) : [];

    this.elChoices.textContent = '';
    const self = this;
    for (let i = 0; i < this.list.length; i++) {
      const b = document.createElement('button');
      b.className = 'dlg-choice';
      b.textContent = (i + 1) + '. ' + this.list[i].t;
      b.addEventListener('click', (function (k) { return function () { self.choose(k); }; })(i));
      this.elChoices.appendChild(b);
    }
    this.elHint.classList.toggle('hidden', this.list.length > 0);
    this.t0 = performance.now();
    Sfx.blip();
  },

  // Avança nós sem escolha (toque no painel ou tecla E/Enter)
  advance() {
    if (!this.open || this.list.length) return;
    if (performance.now() - this.t0 < 180) return;
    if (this.cur.next) this.show(this.cur.next); else this.close();
  },

  choose(i) {
    if (!this.open || performance.now() - this.t0 < 150) return;
    const c = this.list[i];
    if (!c) return;
    if (c.act) c.act();
    if (c.next) this.show(c.next); else this.close();
  },

  close() {
    this.open = false;
    Game.talking = false;
    this.el.classList.add('hidden');
    const f = this.onEnd;
    this.onEnd = null;
    if (f) f();
  }
};

/* ---------------- NPC do acontecimento (Aurélio, o viajante da Ganância) ---------------- */
const Traveler = {
  type: 'npc',
  x: 0, y: 0, z: 0, r: 10,
  fx: -1, fy: 0.3,
  state: 'idle',        // idle, approach, talk, leave, gone
  stateT: 0,
  alpha: 1,
  anim: 0, speed: 0,
  canTalk: false,
  sy: 0,
  leaveTo: null,      // para onde ele vai ao terminar a conversa (padrão: leste)

  // Coloca o NPC num lugar novo (abre clareira em volta) para uma nova conversa
  place(x, y, leaveTo) {
    World.clearArea(x, y, 70);
    this.leaveTo = leaveTo || null;
    this.spawn(x, y);
  },

  spawn(x, y) {
    // Garante que não nasce dentro d'água
    let tries = 0;
    while (World.isWater(x, y) && tries++ < 40) {
      x += (World.spawn.x - x) * 0.05;
      y += (World.spawn.y - y) * 0.05;
    }
    this.x = x; this.y = y; this.sy = y;
    this.state = 'idle'; this.stateT = 0; this.alpha = 1; this.canTalk = false;
  },

  _go(s) { this.state = s; this.stateT = 0; },

  _move(mx, my, sp, dt) {
    const nx = this.x + mx * sp * dt, ny = this.y + my * sp * dt;
    if (!World.blocked(nx, this.y, this.r)) this.x = nx;
    if (!World.blocked(this.x, ny, this.r)) this.y = ny;
    this.speed = sp;
  },

  update(dt) {
    const Q = CFG.QUEST;
    this.stateT += dt;
    this.speed = 0;
    this.canTalk = false;

    const dx = Player.x - this.x, dy = Player.y - this.y;
    const d = Math.hypot(dx, dy) || 0.001;

    switch (this.state) {
      case 'idle':
        this.fx += (dx / d - this.fx) * Math.min(1, dt * 4);
        this.fy += (dy / d - this.fy) * Math.min(1, dt * 4);
        if (!Player.dead && d < Q.sight) { this._go('approach'); Quest.onNotice(); }
        break;

      case 'approach':   // vem até o jogador e para perto dele
        this.fx = dx / d; this.fy = dy / d;
        if (Player.dead || d > Q.giveUp) { this._go('idle'); break; }
        if (d > Q.stopDist) this._move(this.fx, this.fy, Q.npcSpeed, dt);
        this.canTalk = d <= Q.talkDist;
        break;

      case 'talk':
        this.fx = dx / d; this.fy = dy / d;
        break;

      case 'leave': {   // vai embora e some
        const L = this.leaveTo || { x: 2350, y: 1150 };
        const lx = L.x - this.x, ly = L.y - this.y, ld = Math.hypot(lx, ly) || 1;
        this.fx = lx / ld; this.fy = ly / ld;
        if (this.stateT < 2.4) this._move(this.fx, this.fy, Q.npcSpeed * 0.9, dt);
        else this.alpha = Math.max(0, 1 - (this.stateT - 2.4) / 0.8);
        if (this.alpha <= 0) this._go('gone');
        break;
      }
    }
    this.anim += dt * this.speed * 0.09;
    this.sy = this.y;
  },

  draw(ctx, t) {
    if (this.alpha <= 0) return;
    const st = this.state;
    const s = Math.sin(this.anim);
    const moving = this.speed > 8;
    const bob = moving ? Math.abs(s) * 2 : Math.sin(t * 2.5) * 0.7;

    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = 'rgba(10,30,15,0.3)';
    ctx.beginPath(); ctx.ellipse(this.x, this.y, 12, 4.8, 0, 0, 6.2832); ctx.fill();

    ctx.save();
    ctx.translate(this.x, this.y);

    // Pés
    ctx.fillStyle = '#3a2a20';
    ctx.beginPath(); ctx.ellipse(-4, -1.5 - (moving ? Math.max(0, s) * 3 : 0), 4, 2.6, 0, 0, 6.2832); ctx.fill();
    ctx.beginPath(); ctx.ellipse(4, -1.5 - (moving ? Math.max(0, -s) * 3 : 0), 4, 2.6, 0, 0, 6.2832); ctx.fill();

    ctx.translate(0, -bob);

    // Manto roxo com detalhe dourado
    ctx.fillStyle = '#7a4b9b';
    ctx.beginPath(); ctx.ellipse(0, -14, 10, 11, 0, 0, 6.2832); ctx.fill();
    ctx.fillStyle = '#f0c040';
    ctx.fillRect(-9, -12, 18, 2.4);

    // Saco de moedas (ele é guloso)
    ctx.fillStyle = '#c9a23a';
    ctx.beginPath(); ctx.arc(this.fx * 9 + 6, -8, 5.5, 0, 6.2832); ctx.fill();
    ctx.fillStyle = '#6b4a14';
    ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('$', this.fx * 9 + 6, -5.4);

    // Braços
    ctx.fillStyle = '#5d3a7a';
    ctx.beginPath(); ctx.arc(-11, -13 + (moving ? s * 2 : 0), 3, 0, 6.2832); ctx.fill();
    ctx.beginPath(); ctx.arc(11, -13 - (moving ? s * 2 : 0), 3, 0, 6.2832); ctx.fill();

    // Cabeça + chapéu
    ctx.fillStyle = '#e8b98f';
    ctx.beginPath(); ctx.arc(0, -27, 7.5, 0, 6.2832); ctx.fill();
    if (this.fy > -0.4) {
      const ex = this.fx * 3, ey = -26 + this.fy * 1.2;
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.arc(ex - 2.5, ey, 1.1, 0, 6.2832); ctx.fill();
      ctx.beginPath(); ctx.arc(ex + 2.5, ey, 1.1, 0, 6.2832); ctx.fill();
    }
    ctx.fillStyle = '#4a2260';
    ctx.beginPath(); ctx.ellipse(0, -31, 11.5, 3.2, 0, 0, 6.2832); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-6.5, -31); ctx.lineTo(0, -43); ctx.lineTo(6.5, -31); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f0c040';
    ctx.fillRect(-6.5, -34, 13, 2);

    // Balão de aviso quando aborda / pode falar
    if (st === 'approach') {
      const pop = 1 + Math.sin(t * 8) * 0.08;
      ctx.save();
      ctx.translate(0, -48);
      ctx.scale(pop, pop);
      ctx.fillStyle = this.canTalk ? '#ffd34d' : '#ffffff';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      const ch = this.canTalk ? '$' : '!';
      ctx.strokeText(ch, 0, 0);
      ctx.fillText(ch, 0, 0);
      ctx.restore();
    }

    ctx.restore();
    ctx.globalAlpha = 1;
  }
};

/* ---------------- Acontecimento: o viajante pede moedas (Ganância) ---------------- */
const GREED_NODES = {
  hail: {
    who: 'Aurélio',
    text: 'Psiu, forasteiro! Ouvi moedas tilintando por aí... Eu só preciso de umas poucas. Pouquinhas mesmo.',
    next: 'ask'
  },
  ask: {
    who: 'Aurélio',
    text: function () {
      return Quest.coins > 0
        ? 'Então? Ajude este pobre viajante. Quanto você me dá?'
        : 'Nenhuma moeda? Hmpf... que inútil.';
    },
    choices: function () {
      const c = Quest.coins, list = [];
      if (c > 0) list.push({ t: 'Dar tudo (' + c + ' moedas)', act: function () { Quest.choose('all'); }, next: 'all' });
      if (c >= 2) list.push({ t: 'Dar metade (' + Math.floor(c / 2) + ' moedas)', act: function () { Quest.choose('half'); }, next: 'half' });
      if (c > 0) list.push({ t: 'Recusar', act: function () { Quest.choose('refuse'); }, next: 'refuse' });
      else list.push({ t: 'Sinto muito, não tenho nada.', act: function () { Quest.choose('broke'); }, next: 'broke' });
      return list;
    }
  },
  all:    { who: 'Aurélio', text: 'Tudo?! Ninguém nunca me deu tudo... Tome, uma bênção. Pena que eu já queira mais.', next: 'tip' },
  half:   { who: 'Aurélio', text: 'Metade? Hmpf... Aceito, mas não gostei.', next: 'tip' },
  refuse: { who: 'Aurélio', text: 'Egoísta! Todo mundo tem moedas de sobra, menos eu!', next: 'tip' },
  broke:  { who: 'Aurélio', text: 'Nem uma moeda... Que ilha miserável.', next: 'tip' },
  tip:    { who: 'Aurélio', text: 'Se quer entender a ganância, siga a trilha a noroeste. Lá a ilha já está sendo devorada...' }
};

/* ---------------- Introdução da missão ---------------- */
const INTRO_NODES = {
  i1: { who: 'Narrador', text: 'Galáxia 1. Uma ilha flutuante onde o vento carrega moedas... e boatos.', next: 'i2' },
  i2: { who: 'Narrador', text: 'Dizem que um viajante estranho vaga pela trilha a leste, pedindo moedas a quem passa.', next: 'i3' },
  i3: { who: 'Narrador', text: 'Siga a trilha, colete moedas pelo caminho e descubra o que ele quer.' }
};

/* ---------------- Ferramentas da campanha ---------------- */
const Quest = {
  step: 'none',              // espelho da etapa atual (o greed.js lê 'fight'); quem controla é o Campaign
  coins: 0,
  coinList: [],
  flags: { choice: null },   // 'all' | 'half' | 'refuse' | 'broke'
  pending: null,             // GANCHO FUTURO: { type:'battle', id:'...' } -> conflito/batalha
  pile: null,                // onde o Cobiçoso volta se o jogador morrer na luta { x, y } (usado pelo greed.js)
  _after: null,
  _summary: '',
  toastT: 0,
  _label: null, _coinsShown: -1, _objShown: '',
  elBox: null, elTitle: null, elObj: null, elCoins: null, elToast: null, elBtn: null,

  init() {
    this.elBox = document.getElementById('quest-box');
    this.elTitle = document.getElementById('quest-title');
    this.elObj = document.getElementById('quest-obj');
    this.elCoins = document.getElementById('coin-n');
    this.elToast = document.getElementById('toast');
    this.elBtn = document.getElementById('btn-interact');
    Dialog.init();

    // Limpa árvores/pedras em volta do viajante para ele não ficar escondido
    const nx = 2000, ny = 900;
    World.clearArea(nx, ny, 70);
    Traveler.spawn(nx, ny);

    // Moedas ao longo da trilha leste (spawn -> viajante)
    this.coinList = [];
    this.addTrail([[1600, 1152], [1850, 1000], [2000, 900]], [0.18, 0.32, 0.46, 0.6, 0.74, 0.88], 2);

    Campaign.init();
  },

  // Espalha moedas ao longo de uma trilha (pontos). "fr" = quantidade ou lista de posições 0..1
  addTrail(P, fr, v) {
    const segs = [];
    let total = 0;
    for (let i = 0; i < P.length - 1; i++) {
      const l = Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]);
      segs.push(l); total += l;
    }
    if (typeof fr === 'number') {
      const n = fr, list = [];
      for (let k = 0; k < n; k++) list.push(n > 1 ? 0.12 + 0.76 * k / (n - 1) : 0.5);
      fr = list;
    }
    for (let k = 0; k < fr.length; k++) {
      let s = fr[k] * total, i = 0;
      while (i < segs.length - 1 && s > segs[i]) { s -= segs[i]; i++; }
      const u = s / segs[i];
      const ax = P[i][0], ay = P[i][1], bx = P[i + 1][0], by = P[i + 1][1];
      const px = -(by - ay) / segs[i], py = (bx - ax) / segs[i];   // perpendicular
      const off = (k % 2 ? 1 : -1) * 14;
      this.coinList.push({ x: ax + (bx - ax) * u + px * off, y: ay + (by - ay) * u + py * off, v: v, ph: k * 1.3, got: false });
    }
  },

  // Chamado uma vez ao entrar no mundo: introdução, depois a campanha começa
  start() {
    this.step = 'intro';
    this.hud('Galáxia 1 · Terra', 'Ouça o narrador...');
    Dialog.start(INTRO_NODES, 'i1', function () {
      Campaign.start();
      Quest.toast('Nova missão: Primeiros Passos');
    });
  },

  // Atualiza a caixa de objetivo (só mexe no DOM se o texto mudou)
  hud(title, obj) {
    this.elBox.classList.remove('hidden');
    if (this.elTitle.textContent !== title) this.elTitle.textContent = title;
    if (this._objShown !== obj) { this.elObj.textContent = obj; this._objShown = obj; }
  },

  toast(text, secs) {
    this.elToast.textContent = text;
    this.elToast.classList.add('on');
    this.toastT = secs || 3.2;
  },

  // Jogador apertou o botão perto do NPC: abre a conversa
  talk(nodes, first) {
    Traveler._go('talk');
    Dialog.start(nodes, first, function () { Quest.afterTalk(); });
  },

  // Registra a escolha e a consequência imediata (a consequência "física" roda ao fechar o diálogo)
  choose(opt) {
    this.flags.choice = opt;
    const c = this.coins;
    if (opt === 'all') {
      this.coins = 0;
      Player.hp = Player.maxHp;
      Combat.addText(Player.x, Player.y - Player.z - 42, 'Vida restaurada', '#8cff8c');
      Ambient.spawnSpark(Player.x, Player.y - Player.z - 16, 12, '#8cff8c');
      this._summary = 'Você deu tudo (' + c + ' moedas). Aurélio abençoou você: vida restaurada.';
    } else if (opt === 'half') {
      const h = Math.floor(c / 2);
      this.coins -= h;
      this._summary = 'Você deu ' + h + ' moedas. Aurélio aceitou, resmungando.';
    } else if (opt === 'refuse') {
      this.pending = { type: 'battle', id: 'viajante_ganancioso', from: 'refuse' };   // futuro: conflito -> batalha
      this._after = function () { Player.hurt(10, Traveler.x, Traveler.y, 240); };
      this._summary = 'Você recusou. Aurélio te empurrou, furioso. Isso ainda vai render...';
    } else {
      this._summary = 'Você não tinha moedas. Aurélio foi embora decepcionado.';
    }
  },

  // Chamado pelo greed.js quando o Cobiçoso é derrotado: devolve o saque + recompensa
  onGreedDefeated(g) {
    const back = (g.loot || 0) + CFG.GREED.reward;
    g.loot = 0;
    this.coins += back;
    this.toast('Cobiçoso derrotado! +' + back + ' moedas', 3);
    Campaign.onGreedDefeated(g);
  },

  // Fim da conversa: o NPC vai embora e a campanha avança
  afterTalk() {
    Traveler._go('leave');
    const f = this._after, sum = this._summary;
    this._after = null;
    this._summary = '';
    if (f) f();
    Campaign.next();
    if (sum) this.toast(sum, 5);
  },

  // O viajante percebeu o jogador (a etapa 'npc' do Campaign detecta pelo estado dele)
  onNotice() {},

  // ----- Atualização lógica (dentro do passo de física; não roda em pausa/diálogo) -----
  update(dt) {
    if (this.step === 'none' || this.step === 'intro') return;
    const R = CFG.QUEST.coinR;

    for (let i = 0; i < this.coinList.length; i++) {
      const c = this.coinList[i];
      if (c.got || Player.dead || Math.abs(Player.z - Player.floor) > 40) continue;
      const dx = Player.x - c.x, dy = Player.y - c.y;
      if (dx * dx + dy * dy < R * R) {
        c.got = true;
        this.coins += c.v;
        Ambient.spawnSpark(c.x, c.y - 10, 7, '#ffe066');
        Combat.addText(c.x, c.y - 20, '+' + c.v, '#ffd34d');
        Sfx.coin();
      }
    }

    Traveler.update(dt);
    Campaign.update(dt);
  },

  // ----- Por quadro (roda sempre: HUD, botão de interação, toque no diálogo) -----
  frame(dt) {
    if (this.toastT > 0) {
      this.toastT -= dt;
      if (this.toastT <= 0) this.elToast.classList.remove('on');
    }
    Campaign.frame(dt);

    const press = Input.consumeInteract();
    const live = !Game.paused && !Game.rotate;
    const label = live && !Game.talking && !Player.dead ? Campaign.prompt() : null;
    const can = !!label;

    if (press && live) {
      if (Game.talking) Dialog.advance();
      else if (can) Campaign.interact();
    }

    if (label !== this._label) {
      this._label = label;
      this.elBtn.classList.toggle('hidden', !can);
      if (can) {
        this.elBtn.textContent = label;
        this.elBtn.setAttribute('aria-label', label);
        this.elBtn.classList.toggle('long', label.length > 7);
      }
    }
    if (this.coins !== this._coinsShown) {
      this._coinsShown = this.coins;
      this.elCoins.textContent = this.coins;
    }
  },

  // ----- Desenho no mundo (moedas, props e anel do destino), antes dos personagens -----
  drawGround(ctx, t) {
    for (let i = 0; i < this.coinList.length; i++) {
      const c = this.coinList[i];
      if (c.got) continue;
      const w = Math.abs(Math.cos(t * 3 + c.ph));
      const by = c.y - 9 - Math.sin(t * 3 + c.ph) * 2;
      ctx.fillStyle = 'rgba(10,30,15,0.28)';
      ctx.beginPath(); ctx.ellipse(c.x, c.y, 5, 2, 0, 0, 6.2832); ctx.fill();
      ctx.fillStyle = '#f5c63a';
      ctx.strokeStyle = '#a8771a';
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.ellipse(c.x, by, 1.6 + 4.6 * w, 6, 0, 0, 6.2832); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.fillRect(c.x - 0.5 - w, by - 3.5, 1.4, 4);
    }

    Campaign.drawGround(ctx, t);
  },

  // ----- Marcador do objetivo (espaço da tela) -----
  drawMarker(ctx, cam, cx, cy, t) {
    if (Game.talking) return;
    const tg = Campaign.markerTarget();
    if (!tg || tg.alpha === 0) return;

    const sx = tg.x - cx, sy = tg.y - cy;
    const W = cam.viewW, H = cam.viewH;
    const inside = sx > 20 && sx < W - 20 && sy > 70 && sy < H - 60;

    ctx.save();
    ctx.lineJoin = 'round';
    ctx.fillStyle = '#ffd34d';
    ctx.strokeStyle = '#5a3a00';
    ctx.lineWidth = 2;

    if (inside) {
      const by = sy - (tg === Traveler ? 62 : 70) + Math.sin(t * 4) * 3;
      ctx.beginPath();
      ctx.moveTo(sx, by + 9); ctx.lineTo(sx - 8, by - 4); ctx.lineTo(sx + 8, by - 4);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    } else {
      const ax = U.clamp(sx, 26, W - 26), ay = U.clamp(sy, 66, H - 74);
      const ang = Math.atan2(sy - H / 2, sx - W / 2);
      ctx.translate(ax, ay);
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.moveTo(11, 0); ctx.lineTo(-7, -9); ctx.lineTo(-7, 9);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.rotate(-ang);
      const dist = Math.round(Math.hypot(tg.x - Player.x, tg.y - Player.y) / CFG.TILE);
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.75)';
      ctx.fillStyle = '#fff';
      ctx.strokeText(dist + 'm', 0, -16);
      ctx.fillText(dist + 'm', 0, -16);
    }
    ctx.restore();
  }
};
