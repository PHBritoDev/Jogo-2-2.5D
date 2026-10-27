/**
 * MOD 203 — Diretor de cutscenes orientado a dados (testes em cutscenes3d.test.mjs).
 * Uma cena é uma lista de passos executados em ordem. O motor do jogo fornece os "executores"
 * (câmera, fala, animação, efeitos); este módulo só cuida do tempo, da ordem, do toque para avançar e do pular.
 *
 * Tipos de passo:
 *   { type:'shot', id, dur }           câmera/plano contínuo por `dur` segundos (executor recebe o progresso 0..1)
 *   { type:'say', who, text, auto? }   fala; avança por toque (ou sozinha após `auto` segundos)
 *   { type:'do', id, args? }           ação instantânea (tocar animação, mostrar efeito, som…)
 *   { type:'wait', dur }               pausa
 *   { type:'ask', id }                 espera o jogo chamar director.resume() (ex.: digitar o nome, aceitar a missão)
 * Passos podem ter `with: [passos 'do']` para disparar ações no início do passo.
 */
export function createDirector(handlers = {}) {
  let steps = [], i = -1, t = 0, running = false, waitingTap = false, waitingAsk = false, onEnd = null, sceneId = '', skippable = true;
  const h = { shot() {}, say() {}, hideSay() {}, do() {}, ask() {}, end() {}, ...handlers };

  function enter() {
    t = 0; waitingTap = false; waitingAsk = false;
    const s = steps[i];
    if (!s) { finish(false); return; }
    for (const w of s.with || []) h.do(w.id, w.args || {}, sceneId);
    if (s.type === 'say') { h.say(s.who, s.text, s); waitingTap = !s.auto; }
    else if (s.type === 'do') { h.do(s.id, s.args || {}, sceneId); next(); }
    else if (s.type === 'ask') { waitingAsk = true; h.ask(s.id, s.args || {}, sceneId); }
    else if (s.type === 'shot') h.shot(s.id, 0, s.args || {}, sceneId);
  }
  function next() {
    const s = steps[i];
    if (s && s.type === 'say') h.hideSay();
    i++;
    if (i >= steps.length) { finish(false); return; }
    enter();
  }
  function finish(skipped) {
    if (!running) return;
    running = false; waitingTap = false; waitingAsk = false; h.hideSay();
    const cb = onEnd; onEnd = null;
    h.end(sceneId, skipped);
    if (cb) cb(skipped);
  }

  return {
    /** Começa uma cena. done(skipped) é chamado no fim (ou ao pular). */
    play(id, list, done, options = {}) {
      skippable = options.skippable !== false;
      sceneId = id; steps = list.slice(); i = 0; running = true; onEnd = done || null;
      if (!steps.length) { finish(false); return; }
      enter();
    },
    update(dt) {
      if (!running) return;
      const s = steps[i];
      if (!s) return;
      t += dt;
      if (s.type === 'shot') {
        const u = Math.min(1, t / Math.max(.001, s.dur));
        h.shot(s.id, u, s.args || {}, sceneId);
        if (u >= 1) next();
      } else if (s.type === 'wait') {
        if (t >= s.dur) next();
      } else if (s.type === 'say' && s.auto && t >= s.auto) next();
    },
    /** Toque/tecla: avança a fala atual (planos e esperas não são cortados). */
    tap() {
      if (!running || !waitingTap) return false;
      next(); return true;
    },
    /** O jogo terminou o que um passo 'ask' pediu. */
    resume() {
      if (!running || !waitingAsk) return false;
      next(); return true;
    },
    /** Pula a cena uma única vez: as ações 'do' que ainda não rodaram são entregues a handlers.flush (o jogo aplica
     *  os efeitos de estado — pagamento, NPCs que saem, itens), então pular chega ao mesmo estado final da cena inteira. */
    skip() {
      if (!skippable || !running) return false;
      const rest = [];
      for (let k = i + 1; k < steps.length; k++) {
        const s = steps[k];
        for (const w of s.with || []) rest.push({ id: w.id, args: w.args || {} });
        if (s.type === 'do') rest.push({ id: s.id, args: s.args || {} });
      }
      running = false;                                     // trava reentrada enquanto os efeitos são aplicados
      if (h.flush) h.flush(rest, sceneId);
      running = true; finish(true); return true;
    },
    get skippable() { return running && skippable; },
    get running() { return running; },
    get scene() { return sceneId; },
    get index() { return i; },
    get step() { return steps[i] || null; },
    get waitingTap() { return waitingTap; },
    get waitingAsk() { return waitingAsk; }
  };
}

/** Duração mínima (sem contar falas, que dependem de toque) — útil para conferir o ritmo de uma cena. */
export function sceneDuration(list) {
  return list.reduce((s, x) => s + (x.type === 'shot' || x.type === 'wait' ? x.dur : x.type === 'say' && x.auto ? x.auto : 0), 0);
}
