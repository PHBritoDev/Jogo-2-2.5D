'use strict';

/* ============================================================
   MAIN — inicialização, loop do jogo, pausa, FPS e orientação
   ============================================================ */
(function () {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false });

  const fpsEl = document.getElementById('fps');
  const btnPause = document.getElementById('btn-pause');
  const btnFs = document.getElementById('btn-fs');
  const btnResume = document.getElementById('btn-resume');
  const btnGraphics = document.getElementById('btn-graphics');
  const btnGraphicsBack = document.getElementById('btn-graphics-back');
  const overlayPause = document.getElementById('overlay-pause');
  const pauseMenu = document.getElementById('pause-menu');
  const graphicsPanel = document.getElementById('graphics-panel');
  const overlayRotate = document.getElementById('overlay-rotate');
  const showFpsDebug = new URLSearchParams(window.location.search).get('debug') === '1';
  fpsEl.classList.toggle('debug-visible', showFpsDebug);

  // ---------- Tamanho / orientação ----------
  // UM único sistema de resize. Ele mede a janela de novo a cada chamada
  // (nunca confia em tamanho guardado) e é acionado por vários eventos
  // e também por uma checagem a cada quadro: alguns WebViews (como o do
  // Acode) disparam o evento de rotação ANTES do layout ter o tamanho novo.
  let appliedW = 0, appliedH = 0, appliedDpr = 0;

  function updateStopped() {
    Game.stopped = Game.paused || Game.rotate || Game.talking;
  }

  function checkOrientation(w, h) {
    // Só exigir horizontal em aparelhos de toque; janelas estreitas de PC continuam jogáveis.
    const touchDevice = window.matchMedia ? window.matchMedia('(pointer: coarse)').matches : ('ontouchstart' in window);
    Game.rotate = touchDevice && h > w && Math.min(w, h) < 900;
    overlayRotate.classList.toggle('hidden', !Game.rotate);
    updateStopped();
  }

  function resize(force) {
    const w = window.innerWidth || document.documentElement.clientWidth || 0;
    const h = window.innerHeight || document.documentElement.clientHeight || 0;
    const dpr = window.GraphicsQuality
      ? window.GraphicsQuality.pixelRatio(CFG.MAX_DPR)
      : Math.min(window.devicePixelRatio || 1, CFG.MAX_DPR);
    if (w < 2 || h < 2) return;                       // medida transitória durante a rotação
    if (!force && w === appliedW && h === appliedH && dpr === appliedDpr) return;
    appliedW = w; appliedH = h; appliedDpr = dpr;

    // Tamanho visual (CSS) explícito + resolução interna do canvas
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));

    // Viewport e câmera recalculados; jogador/HP/estado NÃO são alterados
    Camera.resize(canvas.width, canvas.height);
    Camera.snap(Player);
    Input.relayout();
    checkOrientation(w, h);
  }

  // Várias tentativas após girar, para pegar o tamanho final do layout
  function scheduleResize() {
    resize();
    setTimeout(resize, 80);
    setTimeout(resize, 250);
    setTimeout(resize, 600);
    setTimeout(resize, 1200);
  }

  // ---------- Pausa ----------
  function setPaused(v) {
    Game.paused = v;
    overlayPause.classList.toggle('hidden', !v);
    if (!v) {
      if (graphicsPanel) graphicsPanel.classList.add('hidden');
      if (pauseMenu) pauseMenu.classList.remove('hidden');
    }
    btnPause.textContent = v ? '▶' : '❚❚';
    updateStopped();
  }

  function openGraphicsSettings() {
    setPaused(true);
    if (pauseMenu) pauseMenu.classList.add('hidden');
    if (graphicsPanel) graphicsPanel.classList.remove('hidden');
    if (window.GraphicsQuality) window.GraphicsQuality.init();
  }

  function closeGraphicsSettings() {
    if (graphicsPanel && !graphicsPanel.classList.contains('hidden')) {
      graphicsPanel.classList.add('hidden');
      if (pauseMenu) pauseMenu.classList.remove('hidden');
      return true;
    }
    return false;
  }

  btnPause.addEventListener('click', function () { setPaused(!Game.paused); });
  btnResume.addEventListener('click', function () { setPaused(false); });
  if (btnGraphics) btnGraphics.addEventListener('click', openGraphicsSettings);
  if (btnGraphicsBack) btnGraphicsBack.addEventListener('click', closeGraphicsSettings);

  window.addEventListener('keydown', function (e) {
    if (e.code === 'Escape' && closeGraphicsSettings()) return;
    if (e.code === 'KeyP' || e.code === 'Escape') setPaused(!Game.paused);
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) setPaused(true);
  });

  // ---------- Tela cheia (opcional) ----------
  btnFs.addEventListener('click', function () {
    try {
      const el = document.documentElement;
      if (!document.fullscreenElement) {
        const p = el.requestFullscreen ? el.requestFullscreen() : null;
        if (p && p.then) {
          p.then(function () {
            if (screen.orientation && screen.orientation.lock) {
              screen.orientation.lock('landscape').catch(function () {});
            }
          }).catch(function () {});
        }
      } else if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    } catch (err) { /* ignora: nem todo navegador suporta */ }
  });

  window.addEventListener('resize', scheduleResize);
  window.addEventListener('orientationchange', scheduleResize);
  window.addEventListener('pageshow', scheduleResize);
  window.addEventListener('graphics-quality-change', function () { resize(true); });
  if (screen.orientation && screen.orientation.addEventListener) {
    screen.orientation.addEventListener('change', scheduleResize);
  }
  if (window.visualViewport) window.visualViewport.addEventListener('resize', scheduleResize);
  if (window.ResizeObserver) new ResizeObserver(function () { resize(); }).observe(document.documentElement);

  // ---------- Inicialização ----------
  if (window.GraphicsQuality) window.GraphicsQuality.init();
  World.build();
  Render.init(ctx);
  BishopDimension.init();
  Combat.init();
  Combat.reset();   // reinicia Player e a coleção de Enemy
  resize(true);
  Ambient.init(Camera);
  Quest.init();

  // Modo de teste direto: pula a introdução e prepara a arena do Primeiro Bispo.
  // A inicialização é síncrona para não depender de temporizadores ou do evento load.
  const valerioTestMode = new URLSearchParams(window.location.search).get('valerioTest') === '1';
  if (valerioTestMode) {
    let missionIndex = -1;
    let stepIndex = -1;
    if (Campaign.galaxy && Array.isArray(Campaign.galaxy.missions)) {
      for (let mi = 0; mi < Campaign.galaxy.missions.length; mi++) {
        const steps = Campaign.galaxy.missions[mi].steps || [];
        const si = steps.findIndex(function (s) {
          return s.type === 'bishop' && s.boss === 'greedFirst';
        });
        if (si >= 0) { missionIndex = mi; stepIndex = si; break; }
      }
    }

    if (missionIndex >= 0) {
      Campaign.finished = false;
      Campaign.mi = missionIndex;
      Campaign.enemyTerritory = Campaign.galaxy.missions[missionIndex].territory || 1;
      Campaign.flags.casinoDiscovered = true;
      Campaign.flags.casinoClue = true;
      Casino.discovered = true;
      Campaign.fightLive = false;

      const bishop = Campaign.galaxy.bishops && Campaign.galaxy.bishops[0];
      if (bishop && bishop.status !== 'defeated') bishop.status = 'available';

      // Casino.enter prepara o interior; a etapa do Bispo muda o cenário para a dimensão 3D.
      Casino.enter();
      Campaign.enterStep(stepIndex);
      if (BishopDimension.isBattleActive()) {
        Quest.toast('DIMENSÃO DE VALÉRIO — modo de teste direto.', 5);
      } else {
        Quest.toast('Falha ao ativar a dimensão de Valério. Confira o carregamento.', 6);
      }
    } else {
      Quest.start();
      Quest.toast('Modo de teste: etapa do Primeiro Bispo não encontrada.', 6);
    }
  } else {
    Quest.start();   // abre a introdução da missão 1
  }

  // ---------- Atualização (um passo de física) ----------
  function step(dt, jumpPressed, attackPressed) {
    Game.time += dt;
    const cinematicLock = !!window.CelestialUltimateActive;
    const moveAxis = cinematicLock ? { x: 0, y: 0 } : BishopDimension.transformAxis(Input.axis());
    Player.update(dt, moveAxis, cinematicLock ? false : jumpPressed, cinematicLock ? false : Input.jumpHeld(), cinematicLock ? false : attackPressed, cinematicLock ? false : Input.defendHeld());
    Enemy.update(dt);
    Greedling.update(dt);
    Combat.update(dt);
    Quest.update(dt);
    Camera.update(dt, Player);
    Ambient.update(dt, Game.time, Camera);
    if (typeof Sfx !== 'undefined' && typeof Sfx.updateWorld === 'function') Sfx.updateWorld(dt, Player);
    StormEvents.update(dt);
  }

  // ---------- Loop ----------
  let last = performance.now();
  let fpsT = 0, fpsN = 0;

  function frame(now) {
    requestAnimationFrame(frame);

    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.25) dt = 0.25;

    // FPS (atualiza a cada meio segundo)
    fpsN++;
    fpsT += dt;
    if (fpsT >= 0.5) {
      fpsEl.textContent = Math.round(fpsN / fpsT) + ' FPS';
      fpsN = 0;
      fpsT = 0;
    }

    // Vigia: se o tamanho da janela mudou e nenhum evento avisou, corrige agora
    resize();
    updateStopped();   // diálogo abre/fecha fora do passo de física
    if (window.GraphicsQuality) {
      window.GraphicsQuality.observeFrame(dt, !Game.stopped && Game.hitstop <= 0);
    }

    const jump = Input.consumeJump();

    // O botão de mira vira esquiva na dimensão de Valério; fora dela mantém a mira direcional.
    const aimAction = Input.consumeAimToggle();
    if (!Game.stopped && aimAction) {
      if (BishopDimension.isBattleActive()) Player.evade(BishopDimension.transformAxis(Input.axis()));
      else Player.setAimMode(!Player.aimLocked);
    }

    // Ataque: descarta toques durante pausa/hitstop para não "vazarem" depois
    let attack = false;
    if (Game.stopped) Input.consumeAttack();
    else if (Game.hitstop <= 0) attack = Input.consumeAttack();

    try {
      if (!Game.stopped) {
        if (Game.hitstop > 0) {
          // Hitstop: micro-pausa ao acertar/levar dano (só renderiza)
          Game.hitstop = Math.max(0, Game.hitstop - dt);
        } else {
          // Divide quadros longos em passos menores para a física ficar estável
          const sdt = Math.min(dt, 0.1);
          const steps = Math.max(1, Math.ceil(sdt * 60 - 0.05));
          const h = sdt / steps;
          for (let i = 0; i < steps; i++) step(h, i === 0 && jump, i === 0 && attack);
        }
      }
      Quest.frame(dt);
      Combat.updateHud();
      Render.frame(dt);
      BishopDimension.frame(dt);
    } catch (err) {
      // Mostra o erro no lugar do FPS (ajuda a diagnosticar no celular)
      console.error(err);
      fpsEl.classList.add('error');
      fpsEl.textContent = 'ERRO: ' + (err && err.message ? err.message : err);
      canvas.width = canvas.width;   // limpa o estado do canvas (transform/save)
    }
  }

  requestAnimationFrame(frame);
})();
