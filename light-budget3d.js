/**
 * Mod 305 — orçamento de luzes pontuais.
 *
 * O three.js calcula TODAS as luzes visíveis da cena em cada fragmento de cada material iluminado (forward rendering):
 * com 19 PointLights espalhadas pelo mundo (tochas da vila, braseiros, portal, efeitos), cada pixel de folha, grama e
 * terreno percorria 19 luzes — mesmo as que estavam a centenas de metros. Em GPU de celular isso multiplica o custo de
 * preenchimento pela sobreposição das copas.
 *
 * Aqui as luzes do jogo continuam existindo e sendo animadas normalmente (intensidade, posição, cor), mas ficam numa
 * camada que o renderizador ignora; um número FIXO de "luzes-slot" copia as fontes mais relevantes para a câmera.
 * O número de luzes do shader nunca muda (sem recompilação, sem travadas) e as trocas são suavizadas (sem piscar).
 */
export function createLightBudget(T, scene, { slots = 4, hiddenLayer = 31, rescanEvery = 45 } = {}) {
  // Configurações externas inválidas não podem quebrar o carregamento do mundo
  // nem gerar dezenas de luzes extras no shader mobile.
  const safeSlots = Number.isSafeInteger(slots) && slots >= 1 && slots <= 8 ? slots : 4;
  // Camada 0 é a câmera padrão; índice inválido pode deixar as fontes no shader.
  const safeHiddenLayer = Number.isInteger(hiddenLayer) && hiddenLayer >= 1 && hiddenLayer <= 31 ? hiddenLayer : 31;
  const pool = Array.from({ length: safeSlots }, (_, i) => {
    const l = new T.PointLight(0xffffff, 0, 10, 2); l.name = 'orcamento-luz-' + i; l.userData.budgetSlot = true; scene.add(l);
    return { light: l, src: null, next: undefined };
  });
  const sources = new Set(), sourceScore = new Map(), originalLayers = new WeakMap(), ranked = [], chosen = [], free = [];
  // Intervalos 0, negativos, fracionários ou NaN não podem desativar o scan
  // (frame % NaN nunca é zero) nem deixar fontes antigas sem orçamento.
  const scanInterval = Number.isSafeInteger(rescanEvery) && rescanEvery > 0 ? rescanEvery : 45;
  let frame = 0;
  /* Mod 316 — guarda imediata: antes, uma PointLight nova (tocha GLB que termina de carregar, efeito, zona) ficava até
     45 quadros na camada 0 até o próximo scan. Nesse intervalo o número de luzes do shader mudava (+1) e TODOS os
     materiais iluminados recompilavam — e de novo quando o scan a escondia: duas travadas de 0,3–0,5 s no celular.
     Agora qualquer add() que traga uma PointLight a registra na hora, antes do próximo render. */
  function adopt(o) { if (o.isPointLight && !o.userData.budgetSlot && !o.castShadow && !sources.has(o)) { sources.add(o); sourceScore.set(o, { s: o, score: 0 });
      // Guardar a máscara original para não ocultar a luz se ela migrar para outra cena.
      if (Number.isInteger(o.layers?.mask)) originalLayers.set(o, o.layers.mask);
      o.layers.set(safeHiddenLayer); } }
  const Obj = T.Object3D && T.Object3D.prototype, rawAdd = Obj && Obj.add;
  // Restaurar imediatamente as layers de fontes movidas para outra cena.
  // Esperar pelo scan periódico deixava a luz invisível no HUD/preview por até 45 frames.
  function release(o, force = false) {
    if (!sources.has(o) || (!force && attachedToScene(o))) return;
    sources.delete(o); sourceScore.delete(o);
    if (originalLayers.has(o) && o.layers) o.layers.mask = originalLayers.get(o);
    originalLayers.delete(o);
  }
  if (Obj && !Obj.__budgetGuard) {
    Obj.__budgetGuard = [];
    // só conta o que entra NA cena do orçamento (cenas auxiliares, como o retrato do HUD, mantêm as luzes delas)
    Obj.add = function (...objs) {
      const r = rawAdd.apply(this, objs);
      let root = this; while (root.parent) root = root.parent;
      for (const o of objs) if (o && o.isObject3D) {
        // Primeiro liberar a máscara de qualquer orçamento anterior; depois adotar na nova cena.
        for (const g of Obj.__budgetGuard) if (g.scene !== root)
          (o.isPointLight ? g.release(o) : o.traverse(g.release));
        for (const g of Obj.__budgetGuard) if (g.scene === root)
          (o.isPointLight ? g.adopt(o) : o.traverse(g.adopt));
      }
      return r;
    };
  }
  // Object3D.remove() não chama add(): liberar a camada no mesmo frame,
  // inclusive para grupos removidos e usados em previews sem novo parent.
  // Instalar apenas uma vez por classe Three.js, como o guard de add().
  if (Obj && !Obj.__budgetRemoveGuard && typeof Obj.remove === 'function') {
    const rawRemove = Obj.remove;
    Obj.__budgetRemoveGuard = true;
    Obj.remove = function (...objs) {
      const r = rawRemove.apply(this, objs);
      for (const o of objs) if (o && o.isObject3D) {
        for (const g of Obj.__budgetGuard)
          (o.isPointLight ? g.release(o) : o.traverse(g.release));
      }
      return r;
    };
  }
  if (Obj) Obj.__budgetGuard.push({ scene, adopt, release });
  const v = new T.Vector3(), cam = new T.Vector3(), lastCamera = new T.Vector3();
  // Uma fonte pode continuar com parent dentro de um grupo já removido da cena.
  // Nunca permitir que esse grupo ocupe slots de luz ou retenha fontes no cadastro.
  function attachedToScene(o) {
    let root = o;
    while (root.parent) root = root.parent;
    return root === scene;
  }
  function scan() {
    scene.traverse(adopt);
    // fontes removidas da cena saem do conjunto (sem crescer para sempre com efeitos descartados)
    for (const o of sources) if (!attachedToScene(o) || o.castShadow) {
      // scan() também é API pública: uma luz que ganhou sombra não pode
      // permanecer registrada/oculta até update() ser chamado.
      release(o, o.castShadow);
    }
  }
  function effectiveVisible(o) { for (let q = o; q; q = q.parent) if (!q.visible) return false; return true; }
  function finiteColor(o) {
    const c = o.color;
    return !!c && Number.isFinite(c.r) && Number.isFinite(c.g) && Number.isFinite(c.b) && c.r >= 0 && c.g >= 0 && c.b >= 0;
  }
  function finitePosition(o) {
    v.setFromMatrixPosition(o.matrixWorld);
    return Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z);
  }
  function update(camera, dt = 1 / 60) {
    if (frame++ % scanInterval === 0) scan();
    // castShadow pode mudar entre scans (tochas/efeitos dinâmicos).
    // Uma fonte com sombra não pertence ao pool e deve recuperar sua layer
    // no próprio frame, sem esperar o próximo scan periódico.
    for (const o of sources) if (o.castShadow) release(o, true);
    // Uma câmera com transformação transitória inválida não deve apagar todas as
    // tochas nem contaminar o ranking; conservar a última posição válida.
    camera.getWorldPosition(cam);
    if (!Number.isFinite(cam.x) || !Number.isFinite(cam.y) || !Number.isFinite(cam.z)) {
      cam.x = lastCamera.x; cam.y = lastCamera.y; cam.z = lastCamera.z;
    } else {
      lastCamera.x = cam.x; lastCamera.y = cam.y; lastCamera.z = cam.z;
    }
    ranked.length=0;
    for (const s of sources) {
      // Fontes com matriz inválida não podem roubar um slot de uma tocha válida.
      if (!attachedToScene(s) || !Number.isFinite(s.intensity) || s.intensity <= .001 || !finiteColor(s) || !effectiveVisible(s) || !finitePosition(s)) continue;
      v.setFromMatrixPosition(s.matrixWorld);
      // No Three.js distance=0 significa alcance ilimitado. Manter score finito
      // (raio de prioridade 40), mas não descartar a fonte por distância.
      const unlimited = s.distance === 0;
      const d = v.distanceTo(cam), reach = Number.isFinite(s.distance) && s.distance > 0 ? s.distance : 40;
      if (!Number.isFinite(d) || (!unlimited && d > reach + 30)) continue;
      // Reaproveita o mesmo objeto por luz (sem milhares de alocacoes por minuto).
      const item=sourceScore.get(s);
      // Histerese espacial: fontes quase empatadas não devem alternar a cada passo da câmera.
      // Dar pequena preferência à fonte já acesa/selecionada (sem adicionar luzes ou shaders).
      // A concorrente ainda vence quando se torna perceptivelmente mais próxima.
      const incumbent = pool.some(p => p.src === s || p.next === s);
      item.score=d-reach*.5-Math.min(6,s.intensity)*1.5-(incumbent ? 0.75 : 0);
      ranked.push(item);
    }
    ranked.sort((a, b) => a.score - b.score);
    // Reaproveita a lista temporária: evitar dois arrays novos por frame no mobile.
    chosen.length = 0;
    for (let i = 0; i < Math.min(safeSlots, ranked.length); i++) chosen.push(ranked[i].s);
    // histerese: quem já ocupa um slot e continua entre os escolhidos fica no mesmo slot
    free.length = 0;
    // A fonte pendente pode ter saído do alcance ou perdido prioridade durante o fade.
    // Só promover fontes que ainda constam na seleção deste quadro; isso também
    // exclui clarões destacados, ocultos ou com posição/intensidade inválida.
    for (const p of pool) if (p.next !== undefined && p.next !== null &&
      !chosen.includes(p.next)) p.next = undefined;
    // Se a fonte atual voltou a ser prioritária durante o fade, cancelar a troca pendente.
    for (const p of pool) { if (p.src && chosen.includes(p.src)) { chosen.splice(chosen.indexOf(p.src), 1); p.next = undefined; } else free.push(p); }
    // troca sem piscar: o slot apaga a fonte antiga suavemente e só então acende a nova no lugar dela
    for (const p of free) { const s = chosen.shift() || null; if (s !== p.src) { if (p.src && p.light.intensity > .05) p.next = s; else { p.src = s; p.next = undefined; } } }
    // dt pode vir inválido ou muito alto após pausa/retomada do navegador mobile.
    // Limitar a interpolação evita NaN/Infinity e saltos bruscos de luz no retorno.
    const safeDt = Number.isFinite(dt) ? Math.max(0, Math.min(dt, 0.1)) : 0;
    const k = 1 - Math.exp(-safeDt * 10);
    for (const p of pool) {
      const s = p.src, l = p.light, live = s && !s.castShadow && attachedToScene(s) && effectiveVisible(s) && Number.isFinite(s.intensity) && s.intensity > .001 && finiteColor(s) && finitePosition(s);
      // Não copiar distância/decay inválidos para os uniforms do shader.
      // A posição da fonte também pode mudar após o ranking do quadro anterior.
      if (live) {
        l.position.setFromMatrixPosition(s.matrixWorld);
        l.color.copy(s.color);
        // Cores HDR finitas mas extremas também estouram uniforms Float32.
        // Preservar a cor da fonte; limitar apenas a cópia enviada ao shader.
        l.color.r = Math.min(l.color.r, 16);
        l.color.g = Math.min(l.color.g, 16);
        l.color.b = Math.min(l.color.b, 16);
        l.distance = Number.isFinite(s.distance) && s.distance >= 0 ? s.distance : 40;
        l.decay = Number.isFinite(s.decay) && s.decay >= 0 ? s.decay : 2;
      }
      // Limitar clarões extremos: intensidade finita pode exceder o alcance Float32 dos uniforms GPU.
      const target = p.next !== undefined || !live ? 0 : Math.min(s.intensity, 64);
      // Não propagar NaN/Infinity de efeitos transitórios para os shaders do jogo.
      if (!Number.isFinite(l.intensity)) l.intensity = 0;
      l.intensity += (target - l.intensity) * k;
      if (p.next !== undefined && l.intensity < .05) { p.src = p.next; p.next = undefined; }
      else if (!live && l.intensity < .02) p.src = null;
    }
  }
  function activePosition(source) {
    if (typeof source.getWorldPosition === 'function') {
      source.getWorldPosition(v);
      return [v.x, v.y, v.z];
    }
    const e = source.matrixWorld?.elements;
    return e?.length >= 16 ? [e[12], e[13], e[14]] : null;
  }
  function stats() {
    const selected = pool.filter(p => p.src);
    return {
      slots: safeSlots,
      sources: sources.size,
      active: selected.map(p => p.src.name || 'luz'),
      // Debug/QA only: identify the actual source behind each fixed shader slot.
      activeDetails: selected.map(p => {
        const s = p.src;
        return {
          name: s.name || 'luz',
          intensity: s.intensity,
          distance: s.distance,
          decay: s.decay,
          color: s.color ? [s.color.r, s.color.g, s.color.b] : null,
          position: activePosition(s),
          slotIntensity: p.light.intensity,
          slotColor: p.light.color ? [p.light.color.r, p.light.color.g, p.light.color.b] : null,
          slotDistance: p.light.distance,
          slotDecay: p.light.decay
        };
      })
    };
  }
  return { update, stats, scan };
}
