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
  const overlayPause = document.getElementById('overlay-pause');
  const overlayRotate = document.getElementById('overlay-rotate');

  // ---------- Tamanho / orientação ----------
  // UM único sistema de resize. Ele mede a janela de novo a cada chamada
  // (nunca confia em tamanho guardado) e é acionado por vários eventos
  // e também por uma checagem a cada quadro: alguns WebViews (como o do
  // Acode) disparam o evento de rotação ANTES do layout ter o tamanho novo.
  let appliedW = 0, appliedH = 0, appliedDpr = 0;

  function updateStopped() {
    Game.stopped = Game.paused || Game.rotate;
  }

  function checkOrientation(w, h) {
    Game.rotate = h > w;
    overlayRotate.classList.toggle('hidden', !Game.rotate);
    updateStopped();
  }

  function resize(force) {
    const w = window.innerWidth || document.documentElement.clientWidth || 0;
    const h = window.innerHeight || document.documentElement.clientHeight || 0;
    const dpr = Math.min(window.devicePixelRatio || 1, CFG.MAX_DPR);
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
    btnPause.textContent = v ? '▶' : '❚❚';
    updateStopped();
  }

  btnPause.addEventListener('click', function () { setPaused(!Game.paused); });
  btnResume.addEventListener('click', function () { setPaused(false); });

  window.addEventListener('keydown', function (e) {
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
  if (screen.orientation && screen.orientation.addEventListener) {
    screen.orientation.addEventListener('change', scheduleResize);
  }
  if (window.visualViewport) window.visualViewport.addEventListener('resize', scheduleResize);
  if (window.ResizeObserver) new ResizeObserver(function () { resize(); }).observe(document.documentElement);

  // ---------- Inicialização ----------
  World.build();
  Render.init(ctx);
  Player.spawn(World.spawn.x, World.spawn.y);
  resize(true);
  Ambient.init(Camera);

  // ---------- Atualização (um passo de física) ----------
  function step(dt, jumpPressed) {
    Game.time += dt;
    Player.update(dt, Input.axis(), jumpPressed, Input.jumpHeld());
    Camera.update(dt, Player);
    Ambient.update(dt, Game.time, Camera);
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

    const jump = Input.consumeJump();

    try {
      if (!Game.stopped) {
        // Divide quadros longos em passos menores para a física ficar estável
        const sdt = Math.min(dt, 0.1);
        const steps = Math.max(1, Math.ceil(sdt * 60 - 0.05));
        const h = sdt / steps;
        for (let i = 0; i < steps; i++) step(h, i === 0 && jump);
      }
      Render.frame(dt);
    } catch (err) {
      // Mostra o erro no lugar do FPS (ajuda a diagnosticar no celular)
      console.error(err);
      fpsEl.textContent = 'ERRO: ' + (err && err.message ? err.message : err);
      canvas.width = canvas.width;   // limpa o estado do canvas (transform/save)
    }
  }

  requestAnimationFrame(frame);
})();
