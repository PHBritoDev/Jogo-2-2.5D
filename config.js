'use strict';

/* ============================================================
   CONFIGURAÇÃO CENTRAL — ajuste aqui os valores do jogo
   ============================================================ */
const CFG = {
  // Mapa (em tiles). Tamanho em pixels de mundo = TILE * COLS/ROWS
  TILE: 32,
  MAP_COLS: 100,   // 3200 px
  MAP_ROWS: 72,    // 2304 px

  // Quantas unidades de mundo cabem na altura da tela (menor = mais zoom)
  VIEW_H: 420,
  // Limite de resolução (menor = mais FPS em celular fraco). Ex.: 1.5
  MAX_DPR: 2,

  PLAYER: {
    radius: 11,
    speed: 185,        // unidades/seg
    accelGround: 11,   // aceleração gradual no chão
    accelAir: 5.5,     // aceleração no ar
    decelGround: 12,   // desacelera sem parar abruptamente
    decelAir: 5,       // mantém alguma inércia no ar
    turnGround: 9.5,   // mudanças fortes de direção são amortecidas
    turnAir: 4.5,
    gravity: 1700,
    jumpV: 560,        // força do pulo (altura ≈ jumpV² / (2*gravity))
    coyote: 0.1,       // tolerância para pular logo após sair de uma borda
    buffer: 0.12       // tolerância para apertar pulo um pouco antes de pousar
  },

  CAM: {
    follow: 5,         // suavidade da câmera (maior = mais rápida)
    margin: 130,       // quanto de céu aparece além da borda do mapa
    look: 0.2          // antecipação da câmera na direção do movimento
  },

  JOY: {
    radius: 50,        // alcance do analógico em pixels de tela
    dead: 0.12         // zona morta
  },

  COMBAT: {
    playerHP: 100,
    // Ataque do jogador
    attackDur: 0.34,       // duração total do golpe
    hitStart: 0.07,        // quando a hitbox liga
    hitEnd: 0.2,           // quando a hitbox desliga
    attackCooldown: 0.06,
    attackBuffer: 0.14,    // tolerância para apertar um pouco antes
    damage: 12,
    reach: 24,             // distância do centro da hitbox à frente do jogador
    hitR: 20,              // raio da hitbox
    hitZ: 38,              // diferença máxima de altura para acertar
    kb: 320,               // knockback no inimigo
    lunge: 110,            // impulso do jogador ao atacar
    atkSpeed: 0.55,        // velocidade enquanto ataca
    // Defesa
    blockReduce: 0.7,      // 70% menos dano
    blockKb: 0.35,         // knockback reduzido
    blockSpeed: 0.45,      // velocidade enquanto defende
    // Reação ao dano
    playerStun: 0.18,
    hurtPop: 130,          // pequeno "pulinho" ao tomar dano
    invuln: 0.6,
    hitstop: 0.06,         // micro-pausa ao acertar
    bodyH: 34,             // altura do corpo (colisão entre personagens)
    debug: false,          // true = mostra hitboxes

    enemy: {
      x: 1950, y: 1280,
      hp: 60, radius: 12, speed: 92,
      sight: 260, giveUp: 440,
      attackRange: 40, hitRange: 46,
      windup: 0.5, attackDur: 0.28, cooldown: 1.0, stagger: 0.38,
      damage: 14, kb: 300, lunge: 90,
      respawn: 4
    }
  },

  QUEST: {
    sight: 230,        // distância em que o viajante percebe o jogador e vem até ele
    giveUp: 420,       // se o jogador se afastar mais que isso, ele desiste de seguir
    stopDist: 40,      // distância em que ele para perto do jogador
    talkDist: 62,      // distância máxima para o botão FALAR aparecer
    npcSpeed: 85,
    coinR: 20          // raio para pegar moedas
  },

  // Cobiçoso (primeiro inimigo da Ganância) e o evento do monte de ouro
  GREED: {
    triggerDist: 150,  // distância do jogador ao monte de ouro que dispara o evento
    omenTime: 1.5,     // tempo de tremor antes do inimigo surgir
    hp: 48, radius: 11,
    speed: 118, hopV: 190,        // anda aos pulinhos
    sight: 300, giveUp: 520,
    attackRange: 34, hitRange: 40,
    windup: 0.42, attackDur: 0.26, cooldown: 0.9, stagger: 0.34,
    damage: 8, kb: 230, lunge: 120,
    steal: 5,          // moedas roubadas por golpe que acerta (devolvidas ao derrotá-lo)
    fleeTime: 2.4, fleeSpeed: 150,
    reward: 10         // moedas de recompensa (além das roubadas)
  },

  BOUNDS_PAD: 16,      // distância mínima do jogador até a borda do mapa
  CELL: 256            // tamanho das células da grade espacial
};

// Estado global simples
const Game = {
  time: 0,
  paused: false,
  rotate: false,
  stopped: false,
  hitstop: 0,
  talking: false   // true enquanto há diálogo aberto (congela o jogo)
};
