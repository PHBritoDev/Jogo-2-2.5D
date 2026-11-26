/**
 * MOD 375 — fluxo de entrada do jogo em ETAPAS EXPLÍCITAS (sem temporizadores):
 *
 *   boot ──(mundo monta a tela dos planetas)──▶ planets ──(jogador entra)──▶ cinematic ──(READY + toque)──▶ world
 *
 * • boot: #loading mostra o progresso REAL do grafo de módulos (mod181-loader.js). Nenhuma cinemática aqui.
 * • planets: a tela dos planetas/galáxias (ou o portão do primeiro acesso) já existente fica visível. A abertura é
 *   pré-carregada em segundo plano, sem competir com o grafo de módulos.
 * • cinematic: ao entrar a partir da tela dos planetas, a abertura ("A Marcha dos Pecados" + o Campo da Última Guerra)
 *   ocupa #cine. A barra continua mostrando o que falta do mundo (texturas enviadas à GPU e shaders, medidos de verdade).
 *   Quando o mundo confirma prontidão, surge o convite; só um toque/clique/Enter/espaço entra, uma única vez.
 * • world: a continuação original da tela dos planetas roda (destrava áudio, prólogo, despertar…).
 *
 * Para inserir uma etapa futura (ex.: tela inicial/login) antes dos planetas, basta acrescentá-la em STEPS e chamar
 * advance() a partir dela; a cinemática continua presa à transição planets → world.
 *
 * Automação (navigator.webdriver) não é jogador: o fluxo fica inativo e o mundo mantém o comportamento clássico, a menos
 * que a URL peça ?loadingcine=1 (testa a cinemática) — ?loadinggate=1 também impede a entrada automática.
 */
export const STEPS = Object.freeze(['boot', 'planets', 'cinematic', 'world']);
export const MODULES_SHARE = 90; // o grafo de módulos vale até 90%; o resto é a preparação real do mundo

export function createGameFlow({ doc = globalThis.document, params = new URLSearchParams(globalThis.location ? location.search : ''), webdriver = !!(globalThis.navigator && navigator.webdriver), loadCinematic = null, build = '' } = {}) {
  const $ = id => doc && doc.getElementById(id);
  const active = !params.has('noloadingcine') && (!webdriver || params.has('loadingcine'));
  const autoEnter = webdriver && !params.has('loadinggate');
  const flow = {
    STEPS, active, step: 'boot', progress: 0, label: '', worldIsReady: false, extraReady: true, entered: false, armed: false, cine: null, cont: null, log: [],
    /** Progresso honesto e monotônico (nunca regride), espelhado na barra do boot e na da cinemática. */
    setProgress(p, label) {
      const v = Math.max(this.progress, Math.min(100, Math.round(Number(p) || 0))); this.progress = v; if (label) this.label = label;
      for (const pre of ['loading', 'cine']) {
        const f = $(pre + '-progress-fill'), pc = $(pre + '-percent'), pb = $(pre + '-progress'), st = $(pre + '-state');
        if (f) f.style.width = v + '%'; if (pc) pc.textContent = v + '%'; if (pb) pb.setAttribute('aria-valuenow', String(v)); if (st && label) st.textContent = label;
      }
    },
    /** O mundo montou a tela dos planetas: o boot sai, a abertura começa a ser preparada em segundo plano. */
    planets() {
      if (!active || this.step !== 'boot') return false;
      this.step = 'planets'; this.log.push('planets');
      const L = $('loading'); if (L) { L.classList.add('boot-done'); L.setAttribute('aria-hidden', 'true'); }
      this.preload(); return true;
    },
    preload() { if (!this.cine && loadCinematic) this.cine = loadCinematic().catch(e => { this.log.push('cine indisponível: ' + (e && e.message)); return null; }); return this.cine; },
    /** Entrada a partir da tela dos planetas. `cont` é a continuação ORIGINAL; `extra` (Promise opcional) também precisa resolver. */
    enter(cont, extra) {
      if (!active || this.step !== 'planets') { cont && cont(); return false; }
      this.step = 'cinematic'; this.cont = cont; this.log.push('cinematic');
      if (extra && typeof extra.then === 'function') { this.extraReady = false; extra.then(() => { this.extraReady = true; this.check(); }, () => { this.extraReady = true; this.check(); }); }
      const C = $('cine'); if (C) { C.hidden = false; C.dataset.state = 'loading'; }
      this.setProgress(this.progress, this.worldIsReady ? 'O MUNDO ESTÁ PRONTO' : 'MONTANDO O MUNDO');
      Promise.resolve(this.preload()).then(m => { if (m && this.step === 'cinematic' && C && !this.player) this.player = m.startLoadingCinematic({ host: C, build }); });
      this.check(); return true;
    },
    /** O mundo confirmou prontidão real (texturas enviadas e shaders preparados). */
    worldReady() { if (this.worldIsReady) return; this.worldIsReady = true; this.log.push('worldReady'); this.setProgress(100, this.step === 'boot' ? 'PRONTO' : 'O MUNDO ESTÁ PRONTO'); this.check(); },
    check() {
      if (this.step !== 'cinematic' || !this.worldIsReady || !this.extraReady) return false;
      const C = $('cine'); if (!C || C.dataset.state === 'ready' || C.dataset.state === 'entering') return false;
      C.dataset.state = 'ready'; const b = $('cine-enter'); if (b) { b.hidden = false; try { b.focus({ preventScroll: true }); } catch (_) {} }
      const lb = $('cine-progress-label'); if (lb) lb.textContent = 'PRONTO';
      this.log.push('ready'); if (autoEnter) this.go();
      return true;
    },
    /** pointerdown dentro da abertura já pronta: arma a entrada para o pointerup seguinte. */
    arm(e) { const C = $('cine'); this.armed = !!(C && C.dataset.state === 'ready' && this.step === 'cinematic'); return this.armed; },
    /** Toque/clique/tecla do jogador. Antes do READY não faz nada; depois, entra uma única vez. */
    go(e) {
      if (this.step !== 'cinematic' || this.entered) return false;
      const C = $('cine'); if (!C || C.dataset.state !== 'ready') return false;
      if (e && e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return false;
      // um toque precisa COMEÇAR na abertura já pronta: o mesmo gesto que abriu a etapa (pointerdown no planeta) não entra
      if (e && e.type === 'pointerup' && !this.armed) return false;
      if (e && e.preventDefault) e.preventDefault();
      this.entered = true; this.step = 'world'; C.dataset.state = 'entering'; const b = $('cine-enter'); if (b) b.hidden = true;
      C.classList.add('cine-leaving'); this.log.push('enter');
      const cont = this.cont; this.cont = null; if (cont) cont(); // ainda dentro do gesto do jogador: o áudio destrava
      return true;
    }
  };
  return flow;
}
