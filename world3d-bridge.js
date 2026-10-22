/**
 * MOD 187 — Ponte entre o mundo 3D e a dimensão de Valério (que continua sendo a dimensão original).
 *
 * Dois caminhos, sem trocar de link:
 * 1. index.html?mundo3d=1 → o mundo 3D roda num iframe desta página. Ao entrar no portal, o iframe
 *    pede SEVEN_SINS_ENTER_VALERIO; esta página esconde o iframe (o mundo fica pausado, intacto),
 *    abre a dimensão aqui mesmo e, na vitória, devolve SEVEN_SINS_BISHOP_RESULT.
 * 2. index.html?valerioTest=1&embedded3d=1 → esta página é a sobreposição criada pelo próprio mundo 3D;
 *    na vitória ela avisa a janela-mãe.
 */
(function () {
  const params = new URLSearchParams(window.location.search);
  const hostMode = params.get('mundo3d') === '1' && params.get('mundo2d') !== '1';
  const embedded = params.get('embedded3d') === '1' && window.parent !== window;
  if (!hostMode && !embedded) return;

  let watching = false, reported = false, timer = 0;

  function victoryReached() {
    const flags = (typeof Campaign !== 'undefined' && Campaign.flags) || {};
    if (!flags.bishop1Defeated) return false;
    // Espera a saída da arena (animação de queda + faixa de vitória) antes de devolver o jogador.
    return typeof BishopDimension === 'undefined' || !BishopDimension.isBattleActive();
  }

  function report(target) {
    if (reported) return;
    reported = true; watching = false; clearInterval(timer);
    try { target.postMessage({ type: 'SEVEN_SINS_BISHOP_RESULT', bishop: 1, result: 'victory' }, window.location.origin); } catch (_) {}
  }

  function watch(onVictory) {
    if (watching) return;
    watching = true; reported = false;
    timer = setInterval(function () { if (victoryReached()) onVictory(); }, 400);
  }

  if (embedded) {
    watch(function () { report(window.parent); });
    return;
  }

  // Modo anfitrião: a dimensão abre nesta mesma página, por cima do mundo 3D pausado.
  window.addEventListener('message', function (e) {
    if (e.origin !== window.location.origin) return;
    const data = e.data || {};
    const frame = document.getElementById('primary-3d-frame');
    if (data.type !== 'SEVEN_SINS_ENTER_VALERIO' || !frame || e.source !== frame.contentWindow) return;
    if (typeof Campaign !== 'undefined' && Campaign.flags) Campaign.flags.bishop1Defeated = false;
    if (typeof window.SevenSinsStartValerio !== 'function' || !window.SevenSinsStartValerio()) {
      frame.contentWindow.postMessage({ type: 'SEVEN_SINS_VALERIO_FAILED' }, window.location.origin);
      return;
    }
    document.documentElement.classList.add('valerio-from-3d');
    frame.style.visibility = 'hidden';
    frame.contentWindow.postMessage({ type: 'SEVEN_SINS_VALERIO_STARTED' }, window.location.origin);
    watch(function () {
      document.documentElement.classList.remove('valerio-from-3d');
      frame.style.visibility = 'visible';
      try { frame.focus(); } catch (_) {}
      report(frame.contentWindow);
    });
  });
})();
