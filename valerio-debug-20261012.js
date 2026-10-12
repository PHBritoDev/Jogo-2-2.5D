'use strict';

/* Diagnóstico temporário da dimensão de Valério. Só ativa com ?valerioTest=1. */
(function () {
  if (new URLSearchParams(window.location.search).get('valerioTest') !== '1') return;

  const panel = document.createElement('div');
  panel.id = 'valerio-runtime-diagnostic';
  panel.style.cssText = [
    'position:fixed','left:8px','top:8px','z-index:2147483647',
    'max-width:min(340px,78vw)','max-height:38vh','overflow:hidden',
    'padding:8px 10px','border:1px solid #ffcf5a','border-radius:8px',
    'background:rgba(12,12,18,.94)','color:#fff','font:11px/1.4 monospace',
    'white-space:pre-wrap','pointer-events:none','box-shadow:0 2px 12px #0008'
  ].join(';');
  panel.textContent = 'VALÉRIO DIAGNÓSTICO · BUILD 2026-10-12-D1\nInicializando instrumentação…';
  document.body.appendChild(panel);

  const events = [];
  function log(message) {
    events.unshift(new Date().toLocaleTimeString() + ' ' + message);
    if (events.length > 5) events.length = 5;
  }

  if (typeof Player !== 'undefined' && typeof Player.hurt === 'function') {
    const originalPlayerHurt = Player.hurt;
    Player.hurt = function (dmg, fromX, fromY, kb, options) {
      const hpBefore = this.hp;
      const invulnBefore = this.invuln;
      const result = originalPlayerHurt.call(this, dmg, fromX, fromY, kb, options);
      log('PLAYER HIT: dano=' + result + ', HP ' + hpBefore + '→' + this.hp +
        ', invuln ' + invulnBefore + '→' + this.invuln +
        ', bypass=' + !!(options && options.ignoreInvuln));
      return result;
    };
  }

  if (typeof BishopBoss !== 'undefined' && typeof BishopBoss.hurt === 'function') {
    const originalBossHurt = BishopBoss.hurt;
    BishopBoss.hurt = function () {
      const hpBefore = this.hp;
      const result = originalBossHurt.apply(this, arguments);
      log('VALÉRIO RECEBEU GOLPE: HP ' + hpBefore + '→' + this.hp);
      return result;
    };
  }

  setInterval(function () {
    const p = typeof Player !== 'undefined' ? Player : null;
    const b = typeof BishopBoss !== 'undefined' ? BishopBoss : null;
    const dimension = typeof BishopDimension !== 'undefined' && BishopDimension.isBattleActive();
    const bossLine = b ? ('Valério: ' + b.state +
      (b.attack ? ' / ' + b.attack.id : '') +
      ', t=' + Number(b.stateT || 0).toFixed(2) +
      ', combo=' + !!b.hitDonePrimary + '/' + !!b.hitDoneSecondary) : 'Valério: indisponível';
    const playerLine = p ? ('Jogador HP: ' + p.hp + '/' + p.maxHp +
      ', invuln=' + Number(p.invuln || 0).toFixed(2) +
      ', z=' + Number(p.z || 0).toFixed(1)) : 'Jogador: indisponível';
    panel.textContent = 'VALÉRIO DIAGNÓSTICO · BUILD 2026-10-12-D1\n' +
      'DIMENSÃO 3D: ' + (dimension ? 'ATIVA' : 'INATIVA') + '\n' +
      playerLine + '\n' + bossLine + '\n' +
      'EVENTOS RECENTES:\n' + (events.length ? events.join('\n') : 'Aguardando golpes…');
  }, 180);
})();
