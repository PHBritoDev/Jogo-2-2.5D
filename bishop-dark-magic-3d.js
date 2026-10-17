/* MOD 120 — Mãos do Abismo + Sepultura de Espinhos.
 * VFX Three.js reutilizando a cena do Bispo. Sem pós-processamento global:
 * fumaça escura/forma sólida + energia emissiva vermelha, custo baixo no mobile.
 */
(function () {
  'use strict';
  let api = null, root = null, handsGroup = null, spikesGroup = null, hands = [], spikes = [];
  let handWarning = null, spikeWarning = null, lastAttackKey = '', lastBookKey = '';
  let lastTime = 0, built = false;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function build() {
    if (!api || !api.THREE || !api.scene || built) return;
    const T = api.THREE;
    root = new T.Group();
    root.name = 'BishopDarkMagic_Mod120';
    root.visible = false;
    api.scene.add(root);

    const black = new T.MeshStandardMaterial({ color: 0x08070b, roughness: .78, metalness: .15 });
    const black2 = new T.MeshStandardMaterial({ color: 0x171219, roughness: .62, metalness: .18 });
    const red = new T.MeshBasicMaterial({ color: 0xff1834, transparent: true, opacity: .82, depthWrite: false });
    const deepRed = new T.MeshBasicMaterial({ color: 0x650714, transparent: true, opacity: .8, depthWrite: false });
    const warningMat = new T.MeshBasicMaterial({ color: 0xd10e2b, transparent: true, opacity: .3, depthWrite: false, side: T.DoubleSide });
    const darkWarningMat = new T.MeshBasicMaterial({ color: 0x08050a, transparent: true, opacity: .22, depthWrite: false, side: T.DoubleSide });

    function addClawHand(parent, idx) {
      const g = new T.Group();
      g.name = 'MaoNegra_' + idx;
      const palm = new T.Mesh(new T.SphereGeometry(.26, 9, 7), black);
      palm.scale.set(.92, 1.18, .52); palm.position.y = .48; g.add(palm);
      const wrist = new T.Mesh(new T.CylinderGeometry(.12, .19, .34, 7), black2);
      wrist.position.y = .22; g.add(wrist);
      const fingerXs = [-.18, -.06, .065, .18];
      fingerXs.forEach((x, fi) => {
        const len = fi === 1 || fi === 2 ? .36 : .29;
        const finger = new T.Mesh(new T.ConeGeometry(.072, len, 6), black);
        finger.position.set(x, .78 + len * .12, .015);
        finger.rotation.z = x * -1.25;
        g.add(finger);
        const nail = new T.Mesh(new T.ConeGeometry(.025, .11, 5), red);
        nail.position.set(x * 1.06, .78 + len * .12 + len * .48, .018);
        nail.rotation.z = x * -1.25; g.add(nail);
      });
      const thumb = new T.Mesh(new T.ConeGeometry(.085, .32, 6), black2);
      thumb.position.set(-.29, .51, .01); thumb.rotation.z = -.85; g.add(thumb);
      const fissure = new T.Mesh(new T.BoxGeometry(.018, .32, .012), red);
      fissure.position.set(.04, .49, .139); fissure.rotation.z = .12; g.add(fissure);
      parent.add(g);
      return g;
    }
    handsGroup = new T.Group(); root.add(handsGroup);
    handWarning = new T.Mesh(new T.RingGeometry(.75, 1.45, 48), warningMat);
    handWarning.rotation.x = -Math.PI / 2; handWarning.position.y = .035; handsGroup.add(handWarning);
    const handOffsets = [[-.9, -.55], [.72, -.7], [-.28, .62], [1.15, .38], [-1.25, .25]];
    handOffsets.forEach((o, i) => {
      const h = addClawHand(handsGroup, i);
      h.position.set(o[0], -1.4, o[1]);
      h.rotation.y = (i - 2) * .28;
      hands.push({ mesh: h, x: o[0], z: o[1], phase: i * .72 });
    });

    spikesGroup = new T.Group(); root.add(spikesGroup);
    spikeWarning = new T.Mesh(new T.RingGeometry(.85, 1.55, 56), warningMat.clone());
    spikeWarning.rotation.x = -Math.PI / 2; spikeWarning.position.y = .04; spikesGroup.add(spikeWarning);
    const spikeOffsets = [[0,0],[-1.05,-.45],[.9,-.65],[-.72,.76],[.95,.7],[0,-1.12],[0,1.1]];
    spikeOffsets.forEach((o, i) => {
      const group = new T.Group(); group.position.set(o[0], -2.4, o[1]); spikesGroup.add(group);
      const outer = new T.Mesh(new T.ConeGeometry(i === 0 ? .47 : .32, i === 0 ? 3.7 : 2.8, 7), black);
      outer.position.y = i === 0 ? 1.85 : 1.4; group.add(outer);
      const seam = new T.Mesh(new T.ConeGeometry(i === 0 ? .12 : .075, i === 0 ? 2.9 : 2.1, 5), red);
      seam.position.set(.035, i === 0 ? 1.47 : 1.13, .02); group.add(seam);
      const baseCrack = new T.Mesh(new T.TorusGeometry(i === 0 ? .53 : .38, .018, 4, 20), deepRed);
      baseCrack.rotation.x = -Math.PI / 2; baseCrack.position.y = .025; group.add(baseCrack);
      spikes.push({ mesh: group, x: o[0], z: o[1], phase: i * .36 });
    });
    built = true;
  }

  function hideAll() {
    if (handsGroup) handsGroup.visible = false;
    if (spikesGroup) spikesGroup.visible = false;
    if (root) root.visible = false;
  }

  function tick(now) {
    requestAnimationFrame(tick);
    const dt = lastTime ? Math.min(.05, (now - lastTime) / 1000) : 0;
    lastTime = now;
    api = window.ValerioThreeAPI || api;
    if (!built && api) { try { build(); } catch (e) { console.warn('Mod 120: VFX das magias negras não pôde ser montado.', e); return; } }
    const view = window.ValerioModelView;
    if (!built || !view || !view.active || !view.attackId || !['abyssHands', 'graveThorns'].includes(view.attackId) ||
        !['windup', 'attack', 'recover'].includes(view.combatState)) {
      hideAll(); lastAttackKey = ''; return;
    }
    const id = view.attackId, state = view.combatState;
    const key = id + ':' + (view.time || 0);
    if (state === 'windup' && lastAttackKey !== id) {
      lastAttackKey = id;
      const book = window.BishopGrimoire3D || window.ValerioGrimoire3D;
      if (book && book.ready && typeof book.invoke === 'function' && lastBookKey !== id) {
        book.invoke((Number(view.windupDuration) || 1.2) + (Number(view.attackDuration) || .7) + 1.25);
        lastBookKey = id;
      }
    }
    if (state === 'recover') {
      hideAll();
      lastAttackKey = '';
      return;
    }
    const target = Array.isArray(view.skillTargetPosition) ? view.skillTargetPosition :
      (Array.isArray(view.playerPosition) ? view.playerPosition : [0, 0, 0]);
    root.position.set(target[0], target[1] || 0, target[2]);
    root.visible = true;
    const windup = Math.max(.1, Number(view.windupDuration) || (id === 'abyssHands' ? 1.18 : 1.38));
    const duration = Math.max(.1, Number(view.attackDuration) || (id === 'abyssHands' ? .72 : .62));
    const t = Number(view.stateTime) || 0;
    const warningPulse = .25 + .2 * (.5 + .5 * Math.sin(now * .012));
    if (id === 'abyssHands') {
      handsGroup.visible = true; spikesGroup.visible = false;
      handWarning.material.opacity = warningPulse;
      const rising = state === 'windup' ? clamp(t / windup, 0, 1) : 1;
      const strike = state === 'attack' ? clamp(t / duration, 0, 1) : 0;
      hands.forEach((h, i) => {
        const stagger = clamp(rising * 1.18 - h.phase * .12, 0, 1);
        const y = state === 'windup' ? -1.45 + stagger * 1.42 : .02 - strike * .58;
        h.mesh.position.set(h.x, y, h.z);
        const punch = state === 'attack' ? 1 + Math.sin(strike * Math.PI) * .18 : 1;
        h.mesh.scale.set(punch, .84 + stagger * .16, punch);
        h.mesh.rotation.z = Math.sin(now * .006 + h.phase) * .055;
      });
    } else {
      handsGroup.visible = false; spikesGroup.visible = true;
      spikeWarning.material.opacity = state === 'windup' ? warningPulse : .05;
      spikeWarning.scale.setScalar(1 + .08 * Math.sin(now * .009));
      const rise = state === 'windup' ? 0 : clamp(t / Math.max(.12, duration * .72), 0, 1);
      spikes.forEach((s, i) => {
        const localRise = clamp(rise * 1.45 - s.phase * .11, 0, 1);
        s.mesh.position.set(s.x, -2.55 + localRise * 2.55, s.z);
        s.mesh.rotation.y = Math.sin(now * .001 + s.phase) * .08;
      });
    }
    // Evita reter efeitos entre ataques diferentes; o próximo começo reabre o grimório.
    if (state === 'attack' && lastAttackKey !== id) lastAttackKey = id;
  }

  function start() {
    requestAnimationFrame(tick);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();