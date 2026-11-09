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
  const pool = Array.from({ length: slots }, (_, i) => {
    const l = new T.PointLight(0xffffff, 0, 10, 2); l.name = 'orcamento-luz-' + i; l.userData.budgetSlot = true; scene.add(l);
    return { light: l, src: null, next: undefined };
  });
  const sources = new Set();
  let frame = 0;
  const v = new T.Vector3(), cam = new T.Vector3();
  function scan() {
    scene.traverse(o => {
      if (!o.isPointLight || o.userData.budgetSlot || o.castShadow || sources.has(o)) return;
      sources.add(o); o.layers.set(hiddenLayer);
    });
  }
  function effectiveVisible(o) { for (let q = o; q; q = q.parent) if (!q.visible) return false; return true; }
  function update(camera, dt = 1 / 60) {
    if (frame++ % rescanEvery === 0) scan();
    camera.getWorldPosition(cam);
    const ranked = [];
    for (const s of sources) {
      if (!s.parent || s.intensity <= .001 || !effectiveVisible(s)) continue;
      v.setFromMatrixPosition(s.matrixWorld);
      const d = v.distanceTo(cam), reach = (s.distance || 40);
      if (d > reach + 30) continue;
      ranked.push({ s, score: d - reach * .5 - Math.min(6, s.intensity) * 1.5 });
    }
    ranked.sort((a, b) => a.score - b.score);
    const chosen = ranked.slice(0, slots).map(r => r.s);
    // histerese: quem já ocupa um slot e continua entre os escolhidos fica no mesmo slot
    const free = [];
    for (const p of pool) { if (p.src && chosen.includes(p.src)) chosen.splice(chosen.indexOf(p.src), 1); else free.push(p); }
    // troca sem piscar: o slot apaga a fonte antiga suavemente e só então acende a nova no lugar dela
    for (const p of free) { const s = chosen.shift() || null; if (s !== p.src) { if (p.src && p.light.intensity > .05) p.next = s; else { p.src = s; p.next = undefined; } } }
    const k = 1 - Math.exp(-dt * 10);
    for (const p of pool) {
      const s = p.src, l = p.light, live = s && s.parent && effectiveVisible(s);
      if (s && s.parent) { l.position.setFromMatrixPosition(s.matrixWorld); l.color.copy(s.color); l.distance = s.distance; l.decay = s.decay; }
      const target = p.next !== undefined || !live ? 0 : s.intensity;
      l.intensity += (target - l.intensity) * k;
      if (p.next !== undefined && l.intensity < .05) { p.src = p.next; p.next = undefined; }
      else if (!live && l.intensity < .02) p.src = null;
    }
  }
  function stats() { return { slots, sources: sources.size, active: pool.filter(p => p.src).map(p => p.src.name || 'luz') }; }
  return { update, stats, scan };
}
