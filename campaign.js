'use strict';

/* ============================================================
   CAMPAIGN — missões, eventos e progresso da Galáxia 1 · Terra

   Fluxo de cada missão (dados em GALAXIES.greed.missions):
     EXPLORAÇÃO -> EVENTO -> CONFRONTO/INVESTIGAÇÃO -> INIMIGO
       -> VITÓRIA -> RECOMPENSA -> PRÓXIMA MISSÃO

   Uma missão é uma lista de ETAPAS. Tipos de etapa:
     goto         ir até um lugar
     npc          encontrar e falar com um NPC
     investigate  chegar perto e apertar o botão (diálogo)
     ambush       evento: tremor/omen -> Cobiçoso(s) surgem -> luta
      guard        evento: diálogo do guarda -> luta com o inimigo base
      casinoFind / casinoEnter / casinoExplore
      bishop       encontro configurado com apresentação e chefe próprios

   Para criar uma etapa nova de um tipo existente basta adicionar
   um objeto na lista "steps". Para criar um TIPO novo, adicione
   uma entrada em HANDLERS (enter / obj / target / update / prompt
   / interact).

   Usa o que já existe: Quest (HUD, moedas, diálogo), Dialog,
    Traveler, Greedling, Enemy, Combat, Ambient, Casino e Bishops.
   ============================================================ */

/* ---------------- Locais do mapa (unidades de mundo) ---------------- */
const LOC = {
  trailNW:  { x: 1130, y: 800 },    // entrada da trilha noroeste
  clearing: { x: 850,  y: 620 },    // clareira do monte de ouro (NO)
  tollWay:  { x: 1000, y: 1550 },   // trilha sudoeste
  toll:     { x: 800,  y: 1625 },   // posto de pedágio abandonado (SO)
  aurelio2: { x: 2420, y: 1690 },   // onde Aurélio se esconde (SE)
  guard:    { x: 2830, y: 1900 },   // guarda do portão (floresta escura)
  seal:     { x: 2910, y: 1935 },  // selo na floresta
  casinoClue: Casino.clue,
  casinoDoor: Casino.door,
  missionOrder: { x: Casino.door.x + 32, y: Casino.door.y + 18 },
  cityApproach: { x: 1370, y: 1490 },
  cityRaid: { x: 970, y: 1735 },
  cityLedger: { x: 820, y: 1580 },
  cityInner: { x: 690, y: 1515 },
  citySeal: { x: 640, y: 1520 },
  bishop3Order: { x: 620, y: 1535 },
  mistTrailhead: { x: 1750, y: 1400 },
  mistFirstBlock: { x: 2110, y: 1240 },
  mistEasternRoad: { x: 2440, y: 1030 },
  mistSignal: { x: 2560, y: 920 },
  mistPass: { x: 2690, y: 830 },
  mistLedger: { x: 2960, y: 465 },
  mistGateApproach: { x: 3020, y: 355 }
};

/* ---------------- Diálogos das missões 2 a 4 ---------------- */
const INV_PILE = {
  p1: { who: 'Narrador', text: 'O monte de ouro era só isca. Entre as moedas espalhadas, um pergaminho chamuscado.', next: 'p2' },
  p2: { who: 'Pergaminho', text: '"Todo viajante paga o pedágio da ilha. Quem não paga, é cobrado. — Ordem do Primeiro Bispo". O selo aponta para um posto ao sudoeste.' }
};

const INV_TOLL = {
  t1: { who: 'Narrador', text: 'Um posto de pedágio abandonado. A placa diz: "TODO VIAJANTE PAGA. SEM EXCEÇÃO."', next: 't2' },
  t2: { who: 'Narrador', text: 'A caixa está vazia. No fundo, uma anotação: “três moedas antigas, na margem leste do lago, marcam uma porta que não aparece nos mapas.”' }
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
  a2: { who: 'Aurélio', text: 'O Bispo não guarda uma torre aberta. Ele se esconde num cassino secreto, na margem leste do lago. A ilha inteira paga a conta dele.', next: 'a3' },
  a3: { who: 'Aurélio', text: 'O selo da floresta é a última pista. Procure as três moedas antigas junto ao lago; a porta só aparece para quem descobriu o rastro.' }
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
    text: 'A runa revela o mesmo desenho da anotação do pedágio: três moedas sob a margem leste do lago. O cassino secreto existe — e o Bispo está lá.'
  }
};

const CASINO_NODES = {
  c1: { who: 'Anfitrião', text: 'Bem-vindo. Aqui ninguém perde por acaso; a casa sempre cobra a dívida inteira.', next: 'c2' },
  c2: { who: 'Anfitrião', text: 'O dono do cofre é Valério, o Primeiro Bispo da Ganância. Ele já sabe que você entrou. A porta do salão está aberta.' }
};

const CITY_LEDGER_NODES = {
  l1: {
    who: 'Narrador',
    text: 'O livro de caixa foi encharcado pela chuva. Os nomes desapareceram, mas alguém arrancou as páginas que registravam para onde a dívida foi enviada.',
    next: 'l2'
  },
  l2: {
    who: 'Nota no livro',
    text: '“A casa do cofre era apenas a vitrine. A cobrança verdadeira segue para a Casa da Moeda, sob o selo do Contador.”'
  }
};

const CITY_SEAL_NODES = {
  e1: {
    who: 'Narrador',
    text: 'Sob a ferrugem, o selo mostra quatro marcas de bispo. A de Valério está riscada; a segunda aponta para a entrada da antiga Casa da Moeda.',
    next: 'e2'
  },
  e2: {
    who: 'Nérion',
    text: '“Valério guardava as moedas. Eu guardo os nomes. Há contas que passam de pai para filho e um livro que nenhum cobrador pode abrir.”'
  }
};

const BISHOP2_AFTER_NODES = {
  b1: {
    who: 'Narrador · diálogo fictício',
    text: 'O livro da Casa da Moeda não registrava apenas valores. Suas colunas dividiam tarefas: guardar, cobrar e decidir quem podia passar.'
  },
  b2: {
    who: 'Narrador · diálogo fictício',
    text: 'Na margem, quatro marcas organizavam o trabalho. A terceira não tinha nome — só o desenho de um instrumento sobre um vale coberto de neblina.',
    next: 'b3'
  },
  b3: {
    who: 'Narrador · diálogo fictício',
    text: 'A anotação termina ali. Alguém arrancou o restante da página antes que o destino fosse registrado.'
  }
};

const MIST_SIGNAL_NODES = {
  m1: {
    who: 'Caderno de campo · registro fictício',
    text: '“A névoa apaga os marcos de longe. Os cobradores seguem as lanternas baixas; a passagem fica onde o som não retorna.”',
    next: 'm2'
  },
  m2: {
    who: 'Narrador · diálogo fictício',
    text: 'Há uma terceira marca no verso, mas o nome foi raspado. O bilhete não explica quem está no vale — apenas confirma que alguém protege a passagem.'
  }
};

const MIST_LEDGER_NODES = {
  v1: {
    who: 'Placa de medição · inscrição fictícia',
    text: '“Não medir o ouro. Medir quem se curva quando a luz aparece.”',
    next: 'v2'
  },
  v2: {
    who: 'Narrador · diálogo fictício',
    text: 'A placa aponta para uma porta entre as lanternas. Não há nome de bispo nem instruções além do sinal da terceira marca.'
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
    endText: 'A Casa da Moeda foi alcançada. Dois dos quatro selos da Ganância foram quebrados.',

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
            nodes: INV_TOLL, first: 't1',
            onDone: function () { Campaign.flags.casinoClue = true; } },
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
      },
      {
        id: 'm5',
        title: 'Missão 5 · O Cassino Secreto',
        reward: BISHOP_PROFILES.greedFirst.reward,
        steps: [
          { type: 'casinoFind' },
          { type: 'casinoEnter' },
          { type: 'casinoExplore' },
          { type: 'bishop', boss: 'greedFirst' }
        ]
      },
      {
        id: 'm6',
        title: 'Missão 6 · As Ruínas da Dívida',
        reward: BISHOP_PROFILES.greedSecond.reward,
        trail: { pts: [[2630, 820], [2320, 980], [2000, 1160], [1690, 1330], [1370, 1490], [1050, 1740]], n: 12, v: 1 },
        steps: [
          {
            type: 'acceptMission',
            obj: 'Leia o mandado deixado junto ao cassino',
            target: LOC.missionOrder,
            radius: 82,
            prompt: 'ACEITAR MISSÃO',
            climate: 'storm'
          },
          {
            type: 'goto',
            obj: 'Siga o livro de cobranças até o antigo distrito comercial',
            target: LOC.cityApproach,
            radius: 105
          },
          {
            type: 'followerAmbush',
            obj: 'Siga a estrada alagada; os cobradores podem estar à espreita',
            omenObj: 'Há movimento entre as ruínas da estrada...',
            fightObj: 'Derrote os cobradores da estrada!',
            target: LOC.cityApproach,
            radius: 130,
            omenText: 'Uma emboscada bloqueia a estrada para o distrito.',
            nextText: 'Mais seguidores vêm pela trilha!',
            spawns: [
              { x: 1300, y: 1435 },
              { x: 1450, y: 1540 }
            ],
            hpScale: 0.68,
            speedScale: 1.06
          },
          {
            type: 'cityDiscover',
            obj: 'Explore as ruínas e encontre a trilha dos cobradores',
            target: RuinedCity.outerGate,
            radius: 155
          },
          {
            type: 'followerAmbush',
            obj: 'Investigue as ruas alagadas',
            omenObj: 'Passos cercam as ruínas...',
            fightObj: 'Derrote os Seguidores da Ganância!',
            target: LOC.cityRaid,
            radius: 125,
            omenText: 'Um sinal de cobrança riscado na parede começa a brilhar.',
            nextText: 'Outros cobradores bloqueiam a rua!',
            spawns: [
              { x: 930, y: 1700 },
              { x: 1030, y: 1785 },
              { x: 875, y: 1780 }
            ],
            hpScale: 0.72,
            speedScale: 1.08
          },
          {
            type: 'investigate',
            obj: 'Leia o livro de caixa abandonado',
            target: LOC.cityLedger,
            radius: 72,
            prompt: 'LER',
            nodes: CITY_LEDGER_NODES,
            first: 'l1',
            done: 'Nova pista: a Casa da Moeda fica sob o selo do Contador'
          },
          {
            type: 'goto',
            obj: 'Encontre a entrada da antiga Casa da Moeda',
            target: LOC.cityInner,
            radius: 95
          },
          {
            type: 'followerAmbush',
            immediate: true,
            omenText: 'O selo da Casa da Moeda desperta os últimos guardiões.',
            omenObj: 'Os guardiões estão se aproximando...',
            fightObj: 'Derrote o guardião da Casa da Moeda!',
            target: LOC.cityInner,
            spawns: [{ x: 750, y: 1480 }],
            hpScale: 0.9,
            speedScale: 1.12
          },
          {
            type: 'investigate',
            obj: 'Examine o selo quebrado na entrada',
            target: LOC.citySeal,
            radius: 74,
            prompt: 'EXAMINAR',
            nodes: CITY_SEAL_NODES,
            first: 'e1',
            onDone: function () { Campaign.flags.secondBishopFound = true; }
          },
          {
            type: 'bishopEnter',
            obj: 'A entrada da Casa da Moeda leva ao salão isolado do Bispo',
            target: RuinedCity.innerGate,
            radius: 72
          },
          { type: 'bishop', boss: 'greedSecond' }
        ]
      },
      {
        id: 'm7',
        title: 'Missão 7 · O Vale das Lanternas Afundadas',
        trail: {
          pts: [[620, 1535], [1250, 1500], [1750, 1400], [2200, 1200],
            [2560, 990], [2760, 790], [2870, 590], [3020, 355]],
          n: 8,
          v: 1
        },
        steps: [
          {
            type: 'story',
            obj: 'Leia as páginas recuperadas da Casa da Moeda',
            nodes: BISHOP2_AFTER_NODES,
            first: 'b1'
          },
          {
            type: 'acceptMission',
            obj: 'Aceite o mandado para investigar o terceiro selo',
            target: LOC.bishop3Order,
            radius: 70,
            prompt: 'ACEITAR MISSÃO',
            climate: 'fog',
            climateTransition: 8,
            acceptedFlag: 'bishop3MissionAccepted',
            unlockBishop: 3,
            acceptedToast: 'Missão aceita. A tempestade perde força; um silêncio frio vem do outro lado da ilha.'
          },
          {
            type: 'goto',
            obj: 'Atravesse a ilha pela estrada para o nordeste',
            target: LOC.mistTrailhead,
            radius: 105
          },
          {
            type: 'followerAmbush',
            obj: 'Os seguidores da Ganância vigiam a estrada alta',
            omenObj: 'Passos acompanham você na névoa...',
            fightObj: 'Afaste os cobradores da estrada!',
            target: LOC.mistFirstBlock,
            radius: 130,
            omenText: 'Um grupo de cobradores sai da estrada e fecha a passagem.',
            nextText: 'Outro seguidor toma o lugar do primeiro.',
            spawns: [
              { x: 2045, y: 1190 },
              { x: 2190, y: 1275 }
            ],
            hpScale: 0.66,
            speedScale: 1.02
          },
          {
            type: 'goto',
            obj: 'Siga a trilha para além da margem leste do lago',
            target: LOC.mistEasternRoad,
            radius: 105
          },
          {
            type: 'investigate',
            obj: 'Investigue o marco de estrada derrubado',
            target: LOC.mistSignal,
            radius: 76,
            prompt: 'LER',
            nodes: MIST_SIGNAL_NODES,
            first: 'm1'
          },
          {
            type: 'followerAmbush',
            obj: 'Recupere a passagem entre as pedras molhadas',
            omenObj: 'As lanternas se apagam uma a uma...',
            fightObj: 'Derrote os seguidores que bloqueiam a passagem!',
            target: LOC.mistPass,
            radius: 118,
            omenText: 'Seguidores da Ganância protegem o caminho para o vale.',
            nextText: 'Mais um cobrador surge entre as pedras.',
            spawns: [
              { x: 2645, y: 790 },
              { x: 2740, y: 865 }
            ],
            hpScale: 0.68,
            speedScale: 1.04
          },
          {
            type: 'mistRegionDiscover',
            obj: 'Entre no Vale das Lanternas Afundadas',
            target: MistValley.threshold,
            radius: 120
          },
          {
            type: 'followerAmbush',
            obj: 'Procure a trilha entre as lanternas antigas',
            omenObj: 'Algo se move por trás da névoa...',
            fightObj: 'Afaste os guardiões do vale!',
            target: MistValley.outerCheckpoint,
            radius: 118,
            omenText: 'Dois guardiões tentam conduzir você para fora do vale.',
            nextText: 'Um último guardião avança pela passarela.',
            spawns: [
              { x: 2820, y: 555 },
              { x: 2910, y: 630 }
            ],
            hpScale: 0.7,
            speedScale: 1.04
          },
          {
            type: 'investigate',
            obj: 'Leia a inscrição no antigo posto de medição',
            target: LOC.mistLedger,
            radius: 72,
            prompt: 'EXAMINAR',
            nodes: MIST_LEDGER_NODES,
            first: 'v1'
          },
          {
            type: 'goto',
            obj: 'Siga os marcos até a passagem escondida',
            target: LOC.mistGateApproach,
            radius: 125
          },
          {
            type: 'followerAmbush',
            obj: 'Os últimos cobradores guardam a passagem',
            omenObj: 'A luz dourada pulsa atrás da neblina...',
            fightObj: 'Abra caminho até a porta!',
            target: LOC.mistGateApproach,
            radius: 95,
            omenText: 'Um pequeno grupo tenta impedir sua aproximação.',
            nextText: 'Outro guardião bloqueia a porta.',
            spawns: [
              { x: 2960, y: 390 },
              { x: 3070, y: 430 }
            ],
            hpScale: 0.7,
            speedScale: 1.05
          },
          {
            type: 'mistEntryDiscover',
            obj: 'Descubra a entrada isolada entre as lanternas',
            target: MistValley.outerGate,
            radius: 88
          },
          {
            type: 'mistEnter',
            obj: 'A entrada leva a um local isolado',
            target: MistValley.outerGate,
            radius: 70
          },
          {
            type: 'mistSite',
            obj: 'Local isolado encontrado. O encontro do Terceiro Bispo ainda não foi iniciado.'
          }
        ]
      }
    ],

    /* ----- GANCHOS PARA O FUTURO (ainda NÃO implementados) -----
       Cada item abaixo é só um espaço reservado para as próximas etapas. */
    bishops: [
      { id: 'bishop1', name: 'Primeiro Bispo da Ganância', status: 'locked' },
      { id: 'bishop2', name: 'Segundo Bispo da Ganância',  status: 'locked' },
      { id: 'bishop3', name: 'Terceiro Bispo da Ganância', status: 'locked' },
      { id: 'bishop4', name: 'Quarto Bispo da Ganância',   status: 'locked' }
    ],
    progression: {
      bishopsRequiredForTournament: 4,
      tournament: { status: 'locked', requires: 'four_bishops_defeated' },
      finalSin: { status: 'locked', requires: 'tournament_won' }
    },
    shop: null,          // loja
    tournament: null,    // torneio
    finalBoss: null,     // chefe final Ganância
    unlocks: null        // id da próxima Galáxia
  }
};

/* ---------------- Comportamento de cada tipo de etapa ---------------- */
const HANDLERS = {
  acceptMission: {
    obj: function (s) { return s.obj; },
    target: function (s) { return s.target; },
    ring: function () { return false; },
    update: function () {},
    prompt: function (s) {
      return Campaign.near(s.target, s.radius) ? (s.prompt || 'ACEITAR') : null;
    },
    interact: function (s) {
      if (!Campaign.near(s.target, s.radius)) return;
      if (s.acceptedFlag) Campaign.flags[s.acceptedFlag] = true;
      else Campaign.flags.bishop2MissionAccepted = true;
      if (s.unlockBishop) {
        const bishop = Campaign.galaxy.bishops[s.unlockBishop - 1];
        if (bishop && bishop.status === 'locked') bishop.status = 'available';
      }
      if (s.climateTransition && Climate.transitionTo) {
        Climate.transitionTo(s.climate || 'clear', s.climateTransition);
      } else {
        Climate.set(s.climate || 'clear');
      }
      Quest.toast(s.acceptedToast || 'Missão aceita. A tempestade cobre as ruínas da cidade.', 3.5);
      Campaign.next();
    }
  },

  story: {
    obj: function (s) { return s.obj; },
    ring: function () { return false; },
    update: function () {},
    enter: function (s) {
      Dialog.start(s.nodes, s.first, function () { Campaign.next(); });
    },
    prompt: function () { return null; }
  },

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

  cityDiscover: {
    obj: function (s) { return s.obj; },
    target: function (s) { return s.target; },
    ring: function () { return true; },
    update: function (s) {
      if (Campaign.near(s.target, s.radius) && !Campaign.flags.cityDiscovered) {
        Campaign.flags.cityDiscovered = true;
        Sfx.blip();
        Quest.toast('Distrito Comercial abandonado descoberto. Há marcas de cobrança nas paredes.', 3.4);
        Campaign.next();
      }
    }
  },

  mistRegionDiscover: {
    obj: function (s) { return s.obj; },
    target: function (s) { return s.target; },
    ring: function () { return true; },
    update: function (s) {
      if (Campaign.near(s.target, s.radius) && !Campaign.flags.bishop3RegionDiscovered) {
        Campaign.flags.bishop3RegionDiscovered = true;
        Sfx.blip();
        Quest.toast('Vale das Lanternas Afundadas descoberto. As trilhas somem dentro da neblina.', 3.8);
        Campaign.next();
      }
    }
  },

  mistEntryDiscover: {
    obj: function (s) { return s.obj; },
    target: function (s) { return s.target; },
    ring: function () { return true; },
    update: function (s) {
      if (Campaign.near(s.target, s.radius) && !Campaign.flags.bishop3EntryFound) {
        Campaign.flags.bishop3EntryFound = true;
        Sfx.blip();
        Quest.toast('Uma porta isolada aparece sob as marcas de medição. A entrada foi encontrada.', 4);
        Campaign.next();
      }
    }
  },

  mistEnter: {
    obj: function (s) { return s.obj; },
    target: function (s) { return s.target; },
    ring: function () { return false; },
    update: function () {},
    prompt: function (s) {
      return Campaign.flags.bishop3EntryFound && Campaign.near(s.target, s.radius) ? 'ENTRAR' : null;
    },
    interact: function (s) {
      if (!Campaign.flags.bishop3EntryFound || !Campaign.near(s.target, s.radius)) return;
      MistValley.enterSite();
      Campaign.flags.bishop3SiteEntered = true;
      Campaign.next();
    }
  },

  mistSite: {
    obj: function (s) { return s.obj; },
    target: function () { return MistValley.exit; },
    ring: function () { return false; },
    update: function () {},
    prompt: function () {
      return MistValley.siteInside && Campaign.near(MistValley.exit, 68) ? 'SAIR' : null;
    },
    interact: function () {
      if (!MistValley.siteInside || !Campaign.near(MistValley.exit, 68)) return;
      MistValley.exitSite();
      Campaign.enterStep(Campaign.si - 1);
    }
  },

  bishopEnter: {
    obj: function (s) { return s.obj; },
    target: function (s) { return s.target; },
    ring: function () { return false; },
    update: function () {},
    prompt: function (s) {
      return Campaign.near(s.target, s.radius) ? 'ENTRAR' : null;
    },
    interact: function () {
      if (!Campaign.near(RuinedCity.innerGate, 72)) return;
      RuinedCity.enter();
      Campaign.next();
    }
  },

  followerAmbush: {
    enter: function (s, st) {
      st.phase = 'approach';
      st.wave = 0;
      st.alive = false;
      st.t = 0;
      st.sparkT = 0;
      Campaign.followerActive = false;
      Campaign.retireGuard = true;
      if (s.immediate) Campaign._followerOmen(s, st, s.omenText);
    },
    obj: function (s, st) {
      if (st.phase === 'approach') return s.obj || 'Procure sinais dos cobradores';
      if (st.phase === 'omen') return s.omenObj || 'Os Seguidores da Ganância estão chegando...';
      if (st.phase === 'fight') return s.fightObj || 'Derrote os Seguidores da Ganância!';
      return 'A rua está livre.';
    },
    target: function (s, st) {
      return st.phase === 'fight' && st.alive && Enemy.state !== 'dead' ? Enemy : s.target;
    },
    ring: function (s, st) { return st.phase === 'approach' || st.phase === 'fight'; },
    update: function (s, st, dt) {
      if (st.phase === 'approach') {
        if (Campaign.near(s.target, s.radius) && !Player.dead) {
          Campaign._followerOmen(s, st, s.omenText);
        }
      } else if (st.phase === 'omen') {
        st.t += dt;
        Camera.shake = Math.max(Camera.shake, 0.45);
        st.sparkT -= dt;
        if (st.sparkT <= 0) {
          st.sparkT = 0.34;
          const p = s.spawns[st.wave];
          Ambient.spawnSpark(p.x, p.y - 9, 3, '#d49a45');
        }
        if (st.t >= (s.omenTime || 1.15)) {
          const p = s.spawns[st.wave++];
          Campaign.spawnFollower(p, s);
          st.alive = true;
          st.phase = 'fight';
          st.t = 0;
          Campaign.refresh();
        }
      } else if (st.phase === 'fight' && st.alive && Enemy.state === 'dead') {
        st.alive = false;
        st.phase = 'between';
        st.t = 0;
        Campaign.retireGuard = true;
      } else if (st.phase === 'between') {
        st.t += dt;
        if (st.t >= 0.75) {
          if (st.wave < s.spawns.length) {
            Campaign._followerOmen(s, st, s.nextText || 'Mais cobradores se aproximam.');
          } else {
            Campaign.followerActive = false;
            Campaign.retireGuard = true;
            Campaign.restoreGuard();
            Campaign.next();
          }
        }
      }
    },
    prompt: function () { return null; }
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
  },

  casinoFind: {
    obj: function () { return 'Procure três moedas antigas na margem leste do lago'; },
    ring: function () { return false; },
    update: function () {},
    prompt: function () {
      return Campaign.flags.casinoClue && Campaign.near(Casino.clue, 48) ? 'INVESTIGAR' : null;
    },
    interact: function () {
      Campaign.flags.casinoDiscovered = true;
      Casino.discovered = true;
      Ambient.spawnSpark(Casino.clue.x, Casino.clue.y - 8, 12, '#ffe066');
      Sfx.coin();
      Quest.toast('As moedas revelam uma entrada escondida logo adiante.', 3);
      Campaign.next();
    }
  },

  casinoEnter: {
    obj: function () { return 'A entrada do Cassino Secreto foi descoberta'; },
    target: function () { return Casino.door; },
    ring: function () { return false; },
    update: function () {},
    prompt: function () {
      return Campaign.near(Casino.door, 62) ? 'ENTRAR' : null;
    },
    interact: function () {
      Casino.enter();
      Campaign.next();
    }
  },

  casinoExplore: {
    obj: function () { return 'Fale com o anfitrião e descubra quem controla o cofre'; },
    target: function () { return Casino.dealer; },
    ring: function () { return true; },
    update: function () {},
    prompt: function () {
      return Casino.inside && Campaign.near(Casino.dealer, 58) ? 'FALAR' : null;
    },
    interact: function () {
      Dialog.start(CASINO_NODES, 'c1', function () { Campaign.next(); });
    }
  },

  bishop: {
    enter: function (s, st) {
      st.phase = 'intro';
      const index = Campaign.bishopIndex(s.boss);
      if (index >= 0 && Campaign.galaxy.bishops[index].status !== 'defeated') {
        Campaign.galaxy.bishops[index].status = 'available';
      }
      Campaign.presentBishop(s, st);
    },
    obj: function (s, st) {
      if (st.phase === 'victory') {
        return s.boss === 'greedFirst' ? 'Vitória! O cofre do Bispo está aberto.' : 'Vitória! O segundo selo foi quebrado.';
      }
      if (st.phase === 'fight') return 'Derrote ' + BISHOP_PROFILES[s.boss].name + ', ' + BISHOP_PROFILES[s.boss].title + '!';
      return 'O Bispo entra no salão...';
    },
    target: function (s, st) {
      return st.phase === 'fight' ? BishopBoss : null;
    },
    ring: function (s, st) { return st.phase === 'fight'; },
    update: function (s, st, dt) {
      if (st.phase === 'fight' && BishopBoss.state === 'inactive' &&
          !BossPresentation.open && !Player.dead) {
        Campaign.presentBishop(s, st);
      } else if (st.phase === 'fight' && BishopBoss.state === 'dead') {
        // A derrota é reconhecida assim que o HP zera; a saída aguarda a
        // animação de queda sem depender de um segundo sinal de combate.
        st.phase = 'victory';
        st.t = 0;
        Campaign.flags.bishopDefeated = true;
        const boss = BISHOP_PROFILES[s.boss];
        const index = Campaign.bishopIndex(s.boss);
        if (index >= 0) {
          Campaign.galaxy.bishops[index].status = 'defeated';
          Campaign.flags['bishop' + (index + 1) + 'Defeated'] = true;
          Campaign.updateProgression();
        }
        Campaign.showBanner('VITÓRIA', boss.name + ' · ' + boss.title, '',
          boss.id === 'bishop1' ? 'O Cassino Secreto está sob seu controle.' : 'O segundo selo da Ganância foi quebrado.');
        Quest.hud('Vitória · ' + boss.name, 'O selo foi quebrado. Recompensa e campanha atualizadas.');
        Sfx.coin();
      } else if (st.phase === 'victory') {
        st.t += dt;
        if (st.t >= Math.max(3.2, (BishopBoss.profile && BishopBoss.profile.deathDuration) || 0)) {
          Campaign.leaveBossArena(BISHOP_PROFILES[s.boss]);
          BishopBoss.reset();
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
  flags: {
    gateOpen: false,
    guardDown: false,
    casinoClue: false,
    casinoDiscovered: false,
    bishopDefeated: false,
    bishop2MissionAccepted: false,
    cityDiscovered: false,
    secondBishopFound: false,
    bishop1Defeated: false,
    bishop2Defeated: false,
    bishop3MissionAccepted: false,
    bishop3RegionDiscovered: false,
    bishop3EntryFound: false,
    bishop3SiteEntered: false
  },
  props: {},
  fightLive: false,  // há um Cobiçoso da campanha vivo
  retireGuard: false,
  followerActive: false,
  baseEnemyConfig: null,
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
    RuinedCity.prepare();
    MistValley.prepare();
    Casino.init();
    Climate.init();
    BossPresentation.init();
    BishopBoss.init();

    // O inimigo base vira o Guarda do Bispo: fica de sentinela no selo
    // (Combat.reset usa essa posição toda vez que o jogador renasce)
    CFG.COMBAT.enemy.x = LOC.guard.x;
    CFG.COMBAT.enemy.y = LOC.guard.y;
    this.baseEnemyConfig = Object.assign({}, CFG.COMBAT.enemy);
    Enemy.spawn();
  },

  start() {
    this.finished = false;
    this.startMission(0);
  },

  startMission(i) {
    this.mi = i;
    const m = this.galaxy.missions[i];
    if (m.id === 'm5' && this.galaxy.bishops[0].status === 'locked') {
      this.galaxy.bishops[0].status = 'available';
    }
    if (m.id === 'm6' && this.galaxy.bishops[0].status === 'defeated' &&
        this.galaxy.bishops[1].status === 'locked') {
      this.galaxy.bishops[1].status = 'available';
    }
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
    this.updateProgression();
    this._sync();
    const defeated = this.defeatedBishopCount();
    const required = this.galaxy.progression.bishopsRequiredForTournament;
    const endText = defeated < required
      ? this.galaxy.endText + ' O torneio continua bloqueado até os quatro Bispos serem derrotados.'
      : 'Os quatro Bispos foram derrotados. O torneio ainda precisa ser vencido.';
    Quest.hud('✔ ' + this.galaxy.name + ' · ' + this.galaxy.sin, endText);
    this.showBanner('✔ MISSÃO CONCLUÍDA', m.title, rew,
      defeated + ' de ' + required + ' Bispos derrotados · torneio: ' +
        (this.galaxy.progression.tournament.status === 'unlocked' ? 'desbloqueado' : 'bloqueado'));
  },

  presentBishop(s, st) {
    const profile = BISHOP_PROFILES[s.boss];
    BossPresentation.start(profile, function () {
      if (Campaign.step !== s || Campaign.st !== st) return;
      BishopBoss.begin(profile);
      st.phase = 'fight';
      Campaign.refresh();
    });
  },

  bishopIndex(profileKey) {
    const profile = BISHOP_PROFILES[profileKey];
    if (!profile || !this.galaxy) return -1;
    return this.galaxy.bishops.findIndex(function (bishop) { return bishop.id === profile.id; });
  },

  defeatedBishopCount() {
    if (!this.galaxy) return 0;
    return this.galaxy.bishops.filter(function (bishop) { return bishop.status === 'defeated'; }).length;
  },

  updateProgression() {
    if (!this.galaxy || !this.galaxy.progression) return;
    const allBishopsDefeated = this.defeatedBishopCount() >= this.galaxy.progression.bishopsRequiredForTournament;
    this.galaxy.progression.tournament.status = allBishopsDefeated ? 'unlocked' : 'locked';
    this.galaxy.progression.finalSin.status =
      this.galaxy.progression.tournament.status === 'unlocked' &&
      this.galaxy.progression.tournament.won ? 'unlocked' : 'locked';
  },

  leaveBossArena(profile) {
    if (profile && profile.exitPoint) {
      const p = profile.exitPoint;
      if (profile.id === 'bishop2') {
        RuinedCity.arenaInside = false;
        RuinedCity.exteriorReturn = null;
        Climate.setInterior(false);
      }
      Player.x = p.x; Player.y = p.y; Player.z = 0;
      Player.vx = Player.vy = Player.vz = 0;
      Player.kx = Player.ky = 0;
      Player.floor = 0; Player.onGround = true; Player.sy = p.y;
      Camera.snap(Player);
    } else {
      Casino.exit();
    }
  },

  spawnFollower(point, step) {
    if (!this.baseEnemyConfig) this.baseEnemyConfig = Object.assign({}, CFG.COMBAT.enemy);
    const base = this.baseEnemyConfig;
    const hpScale = step.hpScale || 0.72;
    CFG.COMBAT.enemy = Object.assign({}, base, {
      x: point.x,
      y: point.y,
      hp: Math.max(1, Math.round(base.hp * hpScale)),
      radius: Math.max(11, Math.min(base.radius, 14)),
      speed: Math.round(base.speed * (step.speedScale || 1)),
      respawn: 999999
    });
    this.retireGuard = false;
    this.followerActive = true;
    Enemy.spawn();
    Enemy._go('chase');
    this.refresh();
  },

  restoreGuard() {
    if (this.baseEnemyConfig) CFG.COMBAT.enemy = Object.assign({}, this.baseEnemyConfig);
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

  _followerOmen(s, st, text) {
    st.phase = 'omen';
    st.t = 0;
    st.sparkT = 0;
    Camera.shake = Math.max(Camera.shake, 2.2);
    Sfx.blip();
    if (text) Quest.toast(text, 2.8);
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
    Climate.frame(dt);
    if (this.bannerT > 0) {
      this.bannerT -= dt;
      if (this.bannerT <= 0 && this.elBanner) this.elBanner.classList.remove('on');
    }
    BishopBoss.updateHud();
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
    Casino.drawGround(ctx, t);
    RuinedCity.drawGround(ctx, t, this.flags.cityDiscovered);
    this._drawMissionOrder(ctx, t);
    this._drawCityClues(ctx, t);
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

  _drawMissionOrder(ctx, t) {
    if (!this.step || this.step.type !== 'acceptMission') return;
    const p = this.step.target || LOC.missionOrder, pulse = 0.62 + Math.sin(t * 4) * 0.18;
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 4, 19, 6, 0, 0, 6.2832); ctx.fill();
    ctx.translate(p.x, p.y);
    ctx.rotate(-0.12);
    ctx.fillStyle = this.step.orderColor || '#c5b58f';
    ctx.fillRect(-13, -9, 26, 17);
    ctx.strokeStyle = '#6d5940';
    ctx.lineWidth = 1;
    ctx.strokeRect(-13, -9, 26, 17);
    ctx.strokeStyle = '#73513a';
    ctx.beginPath(); ctx.moveTo(-8, -4); ctx.lineTo(8, -4); ctx.moveTo(-8, 0); ctx.lineTo(5, 0);
    ctx.moveTo(-8, 4); ctx.lineTo(7, 4); ctx.stroke();
    ctx.restore();
  },

  _drawCityClues(ctx, t) {
    const currentMission = this.mi >= 0 ? this.mission() : null;
    if (!currentMission || currentMission.id !== 'm6') return;
    const ledger = LOC.cityLedger;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath(); ctx.ellipse(ledger.x, ledger.y + 5, 20, 7, 0, 0, 6.2832); ctx.fill();
    ctx.fillStyle = '#463d31';
    ctx.fillRect(ledger.x - 13, ledger.y - 8, 26, 14);
    ctx.fillStyle = '#b9aa84';
    ctx.fillRect(ledger.x - 10, ledger.y - 12, 20, 13);
    ctx.strokeStyle = '#716144'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(ledger.x, ledger.y - 10); ctx.lineTo(ledger.x, ledger.y - 1);
    ctx.moveTo(ledger.x - 6, ledger.y - 8); ctx.lineTo(ledger.x - 2, ledger.y - 7);
    ctx.moveTo(ledger.x + 3, ledger.y - 5); ctx.lineTo(ledger.x + 7, ledger.y - 4); ctx.stroke();
    const seal = LOC.citySeal, pulse = .45 + .3 * Math.sin(t * 3.1);
    ctx.fillStyle = '#363438';
    ctx.beginPath(); ctx.ellipse(seal.x, seal.y, 31, 14, -.1, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = 'rgba(198,151,66,' + pulse.toFixed(2) + ')';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(seal.x, seal.y, 24, 10, -.1, 0, 6.2832); ctx.stroke();
    ctx.fillStyle = '#d5aa5e';
    ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('II', seal.x, seal.y + 4);
    ctx.restore();
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
