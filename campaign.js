'use strict';

/* ============================================================
   CAMPAIGN — progressão da Galáxia 1 · Terra / Ganância

   Fluxo de cada missão (dados em GALAXIES.greed.missions):
     EXPLORAÇÃO -> EVENTO -> CONFRONTO/INVESTIGAÇÃO -> INIMIGO
       -> VITÓRIA -> RECOMPENSA -> PRÓXIMA MISSÃO

   Uma missão é uma lista de ETAPAS. Tipos de etapa:
     goto         ir até um lugar
     npc          encontrar e falar com um NPC
     investigate  chegar perto e apertar o botão (diálogo)
     ambush       evento: tremor/omen -> Cobiçoso(s) surgem -> luta
     guard        evento: diálogo do guarda -> luta com o inimigo base

   Para criar uma etapa nova de um tipo existente basta adicionar
   um objeto na lista "steps". Para criar um TIPO novo, adicione
   uma entrada em HANDLERS (enter / obj / target / update / prompt
   / interact).

   Usa o que já existe: Quest (HUD, moedas, diálogo), Dialog,
   Traveler, Greedling, Enemy, Combat, Ambient e Sfx.
   ============================================================ */

/* ---------------- Locais do mapa (unidades de mundo) ---------------- */
const LOC = {
  trailNW:  { x: 1130, y: 800 },    // entrada da trilha noroeste
  clearing: { x: 850,  y: 620 },    // clareira do monte de ouro (NO)
  tollWay:  { x: 1000, y: 1550 },   // trilha sudoeste
  toll:     { x: 800,  y: 1625 },   // posto de pedágio abandonado (SO)
  aurelio2: { x: 2420, y: 1690 },   // onde Aurélio se esconde (SE)
  guard:    { x: 2830, y: 1900 },   // guarda do portão (floresta escura)
  seal:     { x: 2910, y: 1935 }    // selo do Primeiro Bispo
};

/* ---------------- Diálogos das missões 2 a 4 ---------------- */
const INV_PILE = {
  p1: { who: 'Narrador', text: 'O monte de ouro era só isca. Entre as moedas espalhadas, um pergaminho chamuscado.', next: 'p2' },
  p2: { who: 'Pergaminho', text: '"Todo viajante paga o pedágio da ilha. Quem não paga, é cobrado. — Ordem do Primeiro Bispo". O selo aponta para um posto ao sudoeste.' }
};

const INV_TOLL = {
  t1: { who: 'Narrador', text: 'Um posto de pedágio abandonado. A placa diz: "TODO VIAJANTE PAGA. SEM EXCEÇÃO."', next: 't2' },
  t2: { who: 'Narrador', text: 'A caixa de moedas está aberta... e vazia. Algo se mexe lá dentro!' }
};

const AUR2_NODES = {
  a1: {
    who: 'Aurélio',
    text: function () {
      const c = Quest.flags.choice;
      if (c === 'all')    return 'Você! O generoso! Ainda sinto aquela bênção... Escute, estou assustado.';
      if (c === 'half')   return 'Ah, o das metades. Escute, estou assustado demais para reclamar.';
      if (c === 'refuse') return 'Você... Hmpf. Esqueça o empurrão, estou assustado demais para guardar rancor.';
      return 'Ah, é você! Escute, estou assustado.';
    },
    next: 'a2'
  },
  a2: { who: 'Aurélio', text: 'Além da floresta escura existe um portão. Atrás dele, a Torre das Moedas, onde o Primeiro Bispo da Ganância empilha tudo o que a ilha perdeu.', next: 'a3' },
  a3: { who: 'Aurélio', text: 'Um capanga guarda o portão. Só passa quem paga... ou quem vence. Eu pagaria. Você, por sorte, tem uma espada.' }
};

const GUARD_NODES = {
  g1: { who: 'Guarda do Bispo', text: 'Alto lá! O selo do Primeiro Bispo só se abre para quem paga o pedágio.', next: 'g2' },
  g2: { who: 'Guarda do Bispo', text: 'Sem moedas suficientes? Então você paga com o couro!' }
};

const SEAL_NODES = {
  s1: { who: 'Narrador', text: 'O guarda tomba. O selo no chão vibra e as runas douradas despertam.', next: 's2' },
  s2: {
    who: 'Narrador',
    enter: function () { Campaign.openSeal(); },
    text: 'Além da floresta, a Torre das Moedas brilha. O Primeiro Bispo da Ganância espera por você.'
  }
};

/* Aurélio é o único NPC por enquanto */
const NPCS = { aurelio: Traveler };

/* ---------------- Dados da Galáxia 1 ---------------- */
const GALAXIES = {
  greed: {
    id: 'greed',
    name: 'Galáxia 1 · Terra',
    sin: 'Ganância',
    endText: 'O selo está aberto. O Primeiro Bispo da Ganância espera na Torre das Moedas. (em breve)',

    missions: [
      {
        id: 'm1',
        title: 'Missão 1 · Primeiros Passos',
        reward: { coins: 5 },
        steps: [
          // Aurélio já é colocado no mapa pelo Quest.init (trilha leste)
          { type: 'npc', npc: 'aurelio',
            obj: 'Siga a trilha a leste e encontre o viajante',
            talkObj: 'Fale com o viajante (botão FALAR)',
            nodes: GREED_NODES, first: 'hail' },
          { type: 'goto', obj: 'Siga a trilha a noroeste', target: LOC.trailNW, radius: 90 }
        ]
      },
      {
        id: 'm2',
        title: 'Missão 2 · O Monte Suspeito',
        reward: { coins: 15 },
        trail: { pts: [[1150, 820], [880, 640]], n: 5, v: 1 },
        steps: [
          // Evento: chegar perto do monte faz ele tremer e o Cobiçoso surgir
          { type: 'ambush', prop: 'pile',
            obj: 'Siga a trilha até a clareira do monte de ouro',
            omenObj: 'O monte de ouro está tremendo...',
            fightObj: 'Derrote o Cobiçoso!',
            target: LOC.clearing, radius: CFG.GREED.triggerDist,
            omenText: 'O monte de ouro começou a tremer...',
            spawns: [{ x: LOC.clearing.x, y: LOC.clearing.y }], loot: [0] },
          { type: 'investigate', obj: 'Investigue o que sobrou do monte de ouro',
            target: LOC.clearing, radius: 70, prompt: 'INVESTIGAR',
            nodes: INV_PILE, first: 'p1', done: 'Pista encontrada: o Posto de Pedágio' }
        ]
      },
      {
        id: 'm3',
        title: 'Missão 3 · O Pedágio do Bispo',
        reward: { coins: 25 },
        trail: { pts: [[1350, 1350], [1000, 1550], [760, 1650]], n: 6, v: 1 },
        steps: [
          { type: 'goto', obj: 'Siga a trilha ao sudoeste', target: LOC.tollWay, radius: 110 },
          { type: 'investigate', obj: 'Investigue o Posto de Pedágio abandonado',
            target: LOC.toll, radius: 80, prompt: 'INVESTIGAR',
            nodes: INV_TOLL, first: 't1' },
          // Emboscada com duas ondas (o mesmo Cobiçoso, um depois do outro)
          { type: 'ambush', prop: 'toll', immediate: true,
            omenObj: 'Cuidado! A caixa de moedas está se mexendo...',
            fightObj: 'Derrote os Cobiçosos!',
            target: LOC.toll, omenTime: 1.2,
            omenText: 'Emboscada! Moedas voam da caixa...',
            nextText: 'Tem mais um!',
            spawns: [{ x: LOC.toll.x + 55, y: LOC.toll.y + 15 }, { x: LOC.toll.x - 50, y: LOC.toll.y + 25 }],
            loot: [4, 8] }
        ]
      },
      {
        id: 'm4',
        title: 'Missão 4 · O Selo do Bispo',
        reward: { coins: 40 },
        trail: { pts: [[1850, 1350], [2150, 1550], [2450, 1700]], n: 6, v: 1 },
        steps: [
          // Aurélio reaparece escondido na trilha sudeste
          { type: 'npc', npc: 'aurelio', place: LOC.aurelio2, leaveTo: { x: 2200, y: 1450 },
            obj: 'Siga a trilha ao sudeste: Aurélio foi visto por lá',
            talkObj: 'Fale com Aurélio (botão FALAR)',
            nodes: AUR2_NODES, first: 'a1' },
          // Evento: o guarda barra o caminho e ataca
          { type: 'guard', obj: 'Siga pela floresta escura até o selo do Bispo',
            fightObj: 'Derrote o Guarda do Bispo!',
            target: LOC.guard, radius: 420, reward: 15 },
          { type: 'investigate', obj: 'Ative o selo do Primeiro Bispo',
            target: LOC.seal, radius: 90, prompt: 'ATIVAR',
            nodes: SEAL_NODES, first: 's1' }
        ]
      }
    ],

    /* ----- GANCHOS PARA O FUTURO (ainda NÃO implementados) -----
       Cada item abaixo é só um espaço reservado para as próximas etapas. */
    bishops: [
      { id: 'bispo1', name: 'Primeiro Bispo da Ganância', status: 'locked' },
      { id: 'bispo2', name: 'Segundo Bispo da Ganância',  status: 'locked' },
      { id: 'bispo3', name: 'Terceiro Bispo da Ganância', status: 'locked' },
      { id: 'bispo4', name: 'Quarto Bispo da Ganância',   status: 'locked' }
    ],
    shop: null,          // loja
    tournament: null,    // torneio
    finalBoss: null,     // chefe final Ganância
    unlocks: null        // id da próxima Galáxia
  }
};

/* ---------------- Comportamento de cada tipo de etapa ---------------- */
const HANDLERS = {
  goto: {
    obj: function (s) { return s.obj; },
    target: function (s) { return s.target; },
    ring: function () { return true; },
    update: function (s) {
      if (Campaign.near(s.target, s.radius)) Campaign.next();
    }
  },

  npc: {
    enter: function (s, st) {
      const n = NPCS[s.npc];
      if (s.place) n.place(s.place.x, s.place.y, s.leaveTo);
      else n.leaveTo = s.leaveTo || null;
      st.phase = 'find';
    },
    obj: function (s, st) { return st.phase === 'find' ? s.obj : s.talkObj; },
    target: function (s) { return NPCS[s.npc]; },
    ring: function () { return false; },
    update: function (s, st) {
      const n = NPCS[s.npc];
      if (st.phase === 'find' && n.state === 'approach') {   // ele percebeu o jogador
        st.phase = 'talk';
        Campaign.refresh();
        Sfx.blip();
        Quest.toast('"Ei, você aí!"', 2);
      }
    },
    prompt: function (s, st) {
      return st.phase === 'talk' && NPCS[s.npc].canTalk ? 'FALAR' : null;
    },
    interact: function (s) { Quest.talk(s.nodes, s.first); }
  },

  investigate: {
    obj: function (s) { return s.obj; },
    target: function (s) { return s.target; },
    ring: function () { return true; },
    update: function () {},
    prompt: function (s) {
      return Campaign.near(s.target, s.radius) ? (s.prompt || 'INVESTIGAR') : null;
    },
    interact: function (s) {
      Dialog.start(s.nodes, s.first, function () {
        if (s.onDone) s.onDone();
        Campaign.next();
      });
    }
  },

  ambush: {
    enter: function (s, st) {
      st.wave = 0; st.alive = false; st.t = 0; st.sparkT = 0;
      if (s.immediate) Campaign._omen(s, st, s.omenText);
      else st.phase = 'approach';
    },
    obj: function (s, st) {
      if (st.phase === 'approach') return s.obj;
      if (st.phase === 'omen') return s.omenObj;
      const n = s.spawns.length;
      return s.fightObj + (n > 1 ? ' (' + Math.max(1, st.wave) + '/' + n + ')' : '');
    },
    target: function (s, st) {
      return st.phase === 'fight' && st.alive && Greedling.state !== 'gone' ? Greedling : s.target;
    },
    ring: function (s, st) { return st.phase === 'approach'; },
    update: function (s, st, dt) {
      const P = Campaign.props[s.prop];
      if (st.phase === 'approach') {
        if (Campaign.near(s.target, s.radius) && !Player.dead) Campaign._omen(s, st, s.omenText);
      } else if (st.phase === 'omen') {
        st.t += dt;
        P.state = 'omen';
        Camera.shake = Math.max(Camera.shake, 1.6);
        st.sparkT -= dt;
        if (st.sparkT <= 0) { st.sparkT = 0.18; Ambient.spawnSpark(P.x, P.y - 12, 3, '#ffe066'); }
        if (st.t >= (s.omenTime || CFG.GREED.omenTime)) Campaign._spawn(s, st);
      } else if (st.phase === 'fight' && !st.alive) {
        // A onda caiu: espera o inimigo sumir e segue (próxima onda ou fim da etapa)
        if (Greedling.state === 'gone') {
          st.t += dt;
          if (st.t >= 0.8) {
            if (st.wave < s.spawns.length) Campaign._omen(s, st, s.nextText || 'Mais um!');
            else { P.state = 'spent'; Campaign.next(); }
          }
        }
      }
    },
    prompt: function () { return null; }
  },

  guard: {
    enter: function (s, st) { st.phase = 'approach'; },
    obj: function (s, st) { return st.phase === 'fight' ? s.fightObj : s.obj; },
    target: function (s, st) {
      return st.phase === 'fight' && Enemy.state !== 'dead' ? Enemy : s.target;
    },
    ring: function (s, st) { return st.phase === 'approach'; },
    update: function (s, st) {
      if (st.phase === 'approach') {
        if (Campaign.near(s.target, s.radius) && !Player.dead) {
          st.phase = 'event';
          Dialog.start(GUARD_NODES, 'g1', function () {
            st.phase = 'fight';
            if (Enemy.state !== 'dead') Enemy._go('chase');
            Campaign.refresh();
          });
        }
      } else if (st.phase === 'fight') {
        if (Enemy.state === 'dead') {
          Campaign.flags.guardDown = true;
          Campaign.retireGuard = true;   // o guarda não volta mais
          Quest.coins += s.reward;
          Quest.toast('Guarda derrotado! +' + s.reward + ' moedas', 3);
          Sfx.coin();
          Campaign.next();
        }
      }
    },
    prompt: function () { return null; }
  }
};

/* ---------------- Orquestração ---------------- */
const Campaign = {
  galaxy: null,
  mi: -1,            // índice da missão atual
  si: -1,            // índice da etapa atual
  step: null,        // etapa atual
  st: null,          // estado interno da etapa atual
  finished: false,
  completed: {},     // id da missão -> true
  unlocked: [],      // GANCHO: itens/habilidades liberados por recompensas (futuro)
  flags: { gateOpen: false, guardDown: false },
  props: {},
  fightLive: false,  // há um Cobiçoso da campanha vivo
  retireGuard: false,
  bannerT: 0,
  elBanner: null, elTop: null, elName: null, elReward: null, elNext: null,

  init() {
    this.galaxy = GALAXIES.greed;
    this.props = {
      pile: { kind: 'pile', x: LOC.clearing.x, y: LOC.clearing.y, state: 'idle' },
      toll: { kind: 'toll', x: LOC.toll.x,     y: LOC.toll.y,     state: 'idle' },
      seal: { kind: 'seal', x: LOC.seal.x,     y: LOC.seal.y,     state: 'sealed' }
    };
    this.elBanner = document.getElementById('mission-banner');
    this.elTop = document.getElementById('mb-top');
    this.elName = document.getElementById('mb-name');
    this.elReward = document.getElementById('mb-reward');
    this.elNext = document.getElementById('mb-next');

    // Abre clareiras onde a campanha acontece (sem árvores/pedras no caminho)
    World.clearArea(LOC.clearing.x, LOC.clearing.y, 95);
    World.clearArea(LOC.toll.x, LOC.toll.y, 95);
    World.clearArea(LOC.seal.x - 30, LOC.seal.y - 10, 140);

    // O inimigo base vira o Guarda do Bispo: fica de sentinela no selo
    // (Combat.reset usa essa posição toda vez que o jogador renasce)
    CFG.COMBAT.enemy.x = LOC.guard.x;
    CFG.COMBAT.enemy.y = LOC.guard.y;
    Enemy.spawn();
  },

  start() {
    this.finished = false;
    this.startMission(0);
  },

  startMission(i) {
    this.mi = i;
    const m = this.galaxy.missions[i];
    if (m.trail) Quest.addTrail(m.trail.pts, m.trail.n, m.trail.v);
    this.enterStep(0);
  },

  mission() { return this.galaxy.missions[this.mi]; },

  enterStep(i) {
    const m = this.mission();
    this.si = i;
    this.step = m.steps[i];
    this.st = { phase: '', t: 0, wave: 0, alive: false, sparkT: 0 };
    const h = HANDLERS[this.step.type];
    if (h.enter) h.enter(this.step, this.st);
    this.refresh();
  },

  // Conclui a etapa atual e avança
  next() {
    if (this.finished || !this.step) return;
    const m = this.mission(), s = this.step;
    if (this.si >= m.steps.length - 1) {
      this.completeMission();
    } else {
      if (s.done) Quest.toast('✔ ' + s.done, 3);
      this.enterStep(this.si + 1);
    }
  },

  completeMission() {
    const m = this.mission();
    this.completed[m.id] = true;
    const rew = this.grant(m.reward);
    Sfx.coin();
    Ambient.spawnSpark(Player.x, Player.y - Player.z - 20, 14, '#ffe066');
    Ambient.spawnSpark(Player.x, Player.y - Player.z - 20, 6, '#ffffff');

    const next = this.galaxy.missions[this.mi + 1];
    if (next) {
      this.showBanner('✔ MISSÃO CONCLUÍDA', m.title, rew, '▸ Nova missão: ' + next.title);
      this.startMission(this.mi + 1);
    } else {
      this.finish(m, rew);
    }
  },

  // Fim da campanha atual (fundação da Galáxia 1)
  finish(m, rew) {
    this.finished = true;
    this.step = null;
    this.st = null;
    this.galaxy.bishops[0].status = 'available';   // GANÂNCIA: 1º Bispo liberado (luta ainda não existe)
    this._sync();
    Quest.hud('✔ ' + this.galaxy.name + ' · ' + this.galaxy.sin, this.galaxy.endText);
    this.showBanner('✔ MISSÃO CONCLUÍDA', m.title, rew, 'O caminho até o Primeiro Bispo está aberto!');
  },

  // Entrega recompensas de missão (moedas agora; itens/habilidades no futuro)
  grant(r) {
    if (!r) return '';
    const parts = [];
    if (r.coins) {
      Quest.coins += r.coins;
      parts.push('+' + r.coins + ' moedas');
      Combat.addText(Player.x, Player.y - Player.z - 56, '+' + r.coins, '#ffd34d');
    }
    if (r.unlocks) {
      for (let i = 0; i < r.unlocks.length; i++) {
        if (this.unlocked.indexOf(r.unlocks[i]) < 0) this.unlocked.push(r.unlocks[i]);
      }
    }
    return parts.join(' · ');
  },

  openSeal() {
    this.flags.gateOpen = true;
    this.props.seal.state = 'open';
    Ambient.spawnSpark(LOC.seal.x, LOC.seal.y - 10, 16, '#ffe066');
    Sfx.coin();
  },

  // ----- utilidades -----
  near(p, r) {
    return Math.hypot(Player.x - p.x, Player.y - p.y) < r;
  },

  // Mantém o Quest.step compatível com o greed.js ('fight' = Cobiçoso vivo)
  _sync() {
    Quest.step = this.fightLive ? 'fight' : (this.finished ? 'done' : (this.step ? this.step.type : 'none'));
  },

  // Atualiza o texto do objetivo no HUD
  refresh() {
    this._sync();
    if (!this.step) return;
    const m = this.mission(), h = HANDLERS[this.step.type];
    const title = m.title + '  [' + (this.si + 1) + '/' + m.steps.length + ']';
    Quest.hud(title, h.obj(this.step, this.st));
  },

  // ----- eventos do ambush -----
  _omen(s, st, text) {
    st.phase = 'omen';
    st.t = 0;
    st.sparkT = 0;
    this.props[s.prop].state = 'omen';
    Sfx.blip();
    Camera.shake = Math.max(Camera.shake, 3);
    if (text) Quest.toast(text, 2.4);
    this.refresh();
  },

  _spawn(s, st) {
    const p = s.spawns[st.wave];
    st.wave++;
    Greedling.emerge(p.x, p.y);
    Greedling.loot = (s.loot && s.loot[st.wave - 1]) || 0;
    st.alive = true;
    st.phase = 'fight';
    st.t = 0;
    this.props[s.prop].state = 'spent';
    this.fightLive = true;
    Quest.pile = { x: p.x, y: p.y };   // o greed.js volta o Cobiçoso para cá se o jogador morrer
    this.refresh();
  },

  // Chamado por Quest.onGreedDefeated
  onGreedDefeated() {
    if (!this.st || !this.fightLive) return;
    this.st.alive = false;
    this.st.t = 0;
    this.fightLive = false;
    Quest.pile = null;
    this.refresh();
  },

  // ----- por passo de física (não roda em pausa/diálogo) -----
  update(dt) {
    if (this.retireGuard) {   // mantém o guarda derrotado fora do mapa
      Enemy.state = 'dead';
      Enemy.stateT = 0;
      Enemy.alpha = 0;
    }
    if (this.finished || !this.step) return;
    HANDLERS[this.step.type].update(this.step, this.st, dt);
  },

  // ----- por quadro (sempre roda) -----
  frame(dt) {
    if (this.bannerT > 0) {
      this.bannerT -= dt;
      if (this.bannerT <= 0 && this.elBanner) this.elBanner.classList.remove('on');
    }
  },

  showBanner(top, name, reward, next) {
    if (!this.elBanner) return;
    this.elTop.textContent = top;
    this.elName.textContent = name;
    this.elReward.textContent = reward || '';
    this.elNext.textContent = next || '';
    this.elBanner.classList.add('on');
    this.bannerT = 4.2;
  },

  // ----- botão de interação -----
  prompt() {
    if (this.finished || !this.step) return null;
    const h = HANDLERS[this.step.type];
    return h.prompt ? h.prompt(this.step, this.st) : null;
  },

  interact() {
    if (this.finished || !this.step) return;
    const h = HANDLERS[this.step.type];
    if (h.interact) h.interact(this.step, this.st);
  },

  // ----- marcador do objetivo -----
  markerTarget() {
    if (this.finished || !this.step) return null;
    const h = HANDLERS[this.step.type];
    return h.target ? h.target(this.step, this.st) : null;
  },

  ringTarget() {
    if (this.finished || !this.step) return null;
    const h = HANDLERS[this.step.type];
    return h.ring && h.ring(this.step, this.st) ? h.target(this.step, this.st) : null;
  },

  // ----- desenho no chão: props da campanha e anel do destino -----
  drawGround(ctx, t) {
    const cam = Camera;
    const x0 = cam.x - 90, x1 = cam.x + cam.viewW + 90;
    const y0 = cam.y - 90, y1 = cam.y + cam.viewH + 90;
    for (const k in this.props) {
      const p = this.props[k];
      if (p.x < x0 || p.x > x1 || p.y < y0 || p.y > y1) continue;
      if (p.kind === 'pile') this._drawPile(ctx, p, t);
      else if (p.kind === 'toll') this._drawToll(ctx, p, t);
      else this._drawSeal(ctx, p, t);
    }

    const tg = this.ringTarget();
    if (tg) {
      const k = (t * 0.8) % 1;
      ctx.strokeStyle = 'rgba(255,224,102,' + (0.8 * (1 - k)).toFixed(3) + ')';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(tg.x, tg.y, 20 + k * 50, (20 + k * 50) * 0.6, 0, 0, 6.2832); ctx.stroke();
    }
  },

  _glint(ctx, x, y, t, ph) {
    const a = Math.max(0, Math.sin(t * 4 + ph));
    if (a < 0.2) return;
    ctx.strokeStyle = 'rgba(255,255,255,' + a.toFixed(2) + ')';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x - 4, y); ctx.lineTo(x + 4, y);
    ctx.moveTo(x, y - 4); ctx.lineTo(x, y + 4);
    ctx.stroke();
  },

  _coinDot(ctx, x, y) {
    ctx.fillStyle = '#f5c63a';
    ctx.strokeStyle = '#a8771a';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(x, y, 3.4, 2.2, 0, 0, 6.2832); ctx.fill(); ctx.stroke();
  },

  _drawPile(ctx, p, t) {
    const omen = p.state === 'omen', spent = p.state === 'spent';
    const sh = omen ? Math.sin(t * 55) * 2.4 : 0;
    const x = p.x + sh, y = p.y;

    ctx.fillStyle = 'rgba(10,30,15,0.3)';
    ctx.beginPath(); ctx.ellipse(p.x, y + 2, 28, 9, 0, 0, 6.2832); ctx.fill();

    if (omen) {   // brilho pulsante antes do inimigo surgir
      ctx.fillStyle = 'rgba(255,224,102,' + (0.22 + 0.12 * Math.sin(t * 20)).toFixed(3) + ')';
      ctx.beginPath(); ctx.ellipse(p.x, y - 4, 40, 20, 0, 0, 6.2832); ctx.fill();
    }

    if (!spent) {
      ctx.fillStyle = '#b98a22';
      ctx.beginPath(); ctx.ellipse(x, y - 5, 24, 12, 0, 0, 6.2832); ctx.fill();
      ctx.fillStyle = '#d9a82e';
      ctx.beginPath(); ctx.ellipse(x - 3, y - 11, 17, 9, 0, 0, 6.2832); ctx.fill();
      ctx.fillStyle = '#f0c040';
      ctx.beginPath(); ctx.ellipse(x - 5, y - 16, 10, 6, 0, 0, 6.2832); ctx.fill();
      this._coinDot(ctx, x + 8, y - 12);
      this._coinDot(ctx, x - 12, y - 7);
      this._coinDot(ctx, x + 14, y - 4);
      this._glint(ctx, x - 4, y - 18, t, 0);
      this._glint(ctx, x + 10, y - 10, t, 2.1);
    } else {      // monte vazio: só moedas espalhadas
      ctx.fillStyle = 'rgba(70,45,10,0.35)';
      ctx.beginPath(); ctx.ellipse(x, y - 2, 20, 8, 0, 0, 6.2832); ctx.fill();
      this._coinDot(ctx, x - 9, y - 3);
      this._coinDot(ctx, x + 6, y);
      this._coinDot(ctx, x + 15, y - 5);
      this._coinDot(ctx, x - 1, y - 7);
    }
  },

  _drawToll(ctx, p, t) {
    const omen = p.state === 'omen';
    const sh = omen ? Math.sin(t * 55) * 1.8 : 0;
    const x = p.x, y = p.y;

    ctx.fillStyle = 'rgba(10,30,15,0.3)';
    ctx.beginPath(); ctx.ellipse(x, y + 3, 34, 9, 0, 0, 6.2832); ctx.fill();

    // Cancela caída no chão
    ctx.fillStyle = '#6a4529';
    ctx.fillRect(x - 34, y - 3, 56, 5);
    ctx.fillStyle = '#c8402e';
    for (let i = 0; i < 4; i++) ctx.fillRect(x - 32 + i * 14, y - 3, 7, 5);

    // Placa baixa com $
    ctx.fillStyle = '#55371f';
    ctx.fillRect(x - 28, y - 16, 3, 14);
    ctx.fillStyle = '#8a6236';
    ctx.fillRect(x - 38, y - 22, 24, 11);
    ctx.fillStyle = '#ffe066';
    ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('$ PEDÁGIO', x - 26, y - 14);

    // Caixa de moedas (treme no omen)
    const cx = x + 24 + sh, cy = y - 2;
    if (omen) {
      ctx.fillStyle = 'rgba(255,224,102,' + (0.22 + 0.12 * Math.sin(t * 20)).toFixed(3) + ')';
      ctx.beginPath(); ctx.ellipse(cx, cy - 6, 26, 14, 0, 0, 6.2832); ctx.fill();
    }
    ctx.fillStyle = '#7a4b2a';
    ctx.fillRect(cx - 11, cy - 12, 22, 12);
    ctx.fillStyle = '#4a2c16';
    ctx.fillRect(cx - 11, cy - 12, 22, 3);
    ctx.fillStyle = '#f0c040';
    ctx.fillRect(cx - 2, cy - 9, 4, 5);
    if (p.state === 'idle') this._glint(ctx, cx + 4, cy - 14, t, 1);
  },

  _drawSeal(ctx, p, t) {
    const open = p.state === 'open';
    const x = p.x, y = p.y;
    const pulse = 0.5 + 0.5 * Math.sin(t * 3);

    // Disco de pedra com runas
    ctx.fillStyle = open ? 'rgba(80,60,20,0.55)' : 'rgba(40,40,55,0.6)';
    ctx.beginPath(); ctx.ellipse(x, y, 52, 28, 0, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = open ? 'rgba(255,224,102,' + (0.7 + 0.3 * pulse).toFixed(2) + ')' : 'rgba(150,150,170,0.7)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(x, y, 46, 24, 0, 0, 6.2832); ctx.stroke();
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.ellipse(x, y, 30, 15, 0, 0, 6.2832); ctx.stroke();

    // Runas
    ctx.fillStyle = open ? '#ffe066' : '#8a8aa0';
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * 6.2832 + 0.3;
      ctx.fillRect(x + Math.cos(a) * 38 - 1.5, y + Math.sin(a) * 19 - 3, 3, 6);
    }

    // Símbolo $ no centro
    ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center';
    ctx.fillStyle = open ? '#fff0b0' : '#6c6c80';
    ctx.fillText('$', x, y + 6);

    if (open) {   // coluna de luz fraca
      ctx.fillStyle = 'rgba(255,224,102,' + (0.12 + 0.08 * pulse).toFixed(3) + ')';
      ctx.fillRect(x - 22, y - 60, 44, 60);
    }
  }
};
