/* MOD 117 — restaura a orientação natural e refina a aura em fumaça sombria.
 * Artefato visual independente; reutiliza a cena/câmera Three.js já carregada.
 * Não implementa poderes, dano, cooldowns ou comportamento de combate.
 */
(function () {
  'use strict';
  const params = new URLSearchParams(window.location.search);
  const enabled = params.get('valerioGrimoire') === '1' || !!document.getElementById('btn-valerio-grimoire');
  if (!enabled) return;

  let api = null, root = null, leftHinge = null, rightHinge = null;
  let pages = [], pageLeaves = [], runes = [], darkSparks = [], darkSmoke = [], darkAura = null, darkAuraCore = null, opened = false, targetOpen = 0, angle = 0;
  let button = null, lastTime = 0, ready = false, attachedScene = null;
  const GOLD = 0xc9a34a, DARK_GOLD = 0x62421b, EMERALD = 0x087c5b;
  const MAT = {};
  function material(key, color, roughness, metalness, emissive, emissiveIntensity) {
    if (!MAT[key]) MAT[key] = new api.THREE.MeshStandardMaterial({
      color, roughness: roughness == null ? .68 : roughness,
      metalness: metalness == null ? .45 : metalness,
      emissive: emissive || 0x000000,
      emissiveIntensity: emissiveIntensity || 0
    });
    return MAT[key];
  }
  function box(parent, name, size, pos, mat, bevelSegments) {
    const T = api.THREE;
    const mesh = new T.Mesh(new T.BoxGeometry(size[0], size[1], size[2], 1, 1, 1), mat);
    mesh.name = name;
    mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.castShadow = false; mesh.receiveShadow = false;
    parent.add(mesh);
    return mesh;
  }
  function makeRune(parent, x, y, z, scale) {
    const T = api.THREE;
    const group = new T.Group();
    group.position.set(x, y, z);
    group.scale.setScalar(scale || 1);
    const gold = material('runeGold', GOLD, .32, .78, 0x6b4300, .22);
    const emerald = material('runeEmerald', EMERALD, .34, .55, 0x00a46c, .5);
    // Emblema geométrico abstrato, sem representar uma habilidade.
    const diamond = new T.Mesh(new T.OctahedronGeometry(.075, 0), emerald);
    diamond.scale.set(.72, 1.45, .34);
    group.add(diamond);
    const ring = new T.Mesh(new T.TorusGeometry(.13, .012, 5, 20), gold);
    ring.rotation.z = Math.PI / 4; group.add(ring);
    const vertical = new T.Mesh(new T.BoxGeometry(.018, .25, .012), gold);
    group.add(vertical);
    parent.add(group); runes.push(group);
    return group;
  }
  function buildBook() {
    const T = api.THREE;
    root = new T.Group(); root.name = 'ValerioGrimoire3D_Mod117';
    const leather = material('leather', 0x171d18, .82, .18);
    const leatherEdge = material('leatherEdge', 0x30251a, .75, .35);
    const pagesMat = material('parchment', 0xc8b88a, .94, .04);
    const pageShadow = material('pageShadow', 0x766345, .92, .04);
    const gold = material('gold', GOLD, .28, .82, 0x503100, .18);
    const green = material('greenGem', 0x087c5b, .22, .58, 0x00a86d, .8);
    const w = .92, h = .68, thick = .105;
    // Miolo real, com espessura e várias folhas finas.
    box(root, 'Lombada reforçada', [.12, h + .045, thick + .025], [0, 0, 0], leatherEdge);
    box(root, 'Bloco de páginas', [w - .10, h - .045, thick * .62], [0, 0, .006], pagesMat);
    for (let i = 0; i < 7; i++) {
      const z = -.027 + i * .009;
      box(root, 'Borda de páginas ' + i, [w - .13, h - .075, .003], [0, 0, z], i % 2 ? pagesMat : pageShadow);
    }
    // Duas capas articuladas por dobradiças: abrem de verdade em 3D.
    leftHinge = new T.Group(); leftHinge.position.set(-.045, 0, .025); root.add(leftHinge);
    box(leftHinge, 'Capa esquerda', [w / 2, h, .045], [-w / 4, 0, .025], leather);
    box(leftHinge, 'Friso dourado esquerdo', [w / 2 - .055, h - .055, .009], [-w / 4, 0, .052], gold);
    box(leftHinge, 'Forro esmeralda esquerdo', [w / 2 - .078, h - .078, .008], [-w / 4, 0, .058], material('insideGreen', 0x17382b, .72, .25));
    rightHinge = new T.Group(); rightHinge.position.set(.045, 0, .025); root.add(rightHinge);
    box(rightHinge, 'Capa direita', [w / 2, h, .045], [w / 4, 0, .025], leather);
    box(rightHinge, 'Friso dourado direito', [w / 2 - .055, h - .055, .009], [w / 4, 0, .052], gold);
    box(rightHinge, 'Forro esmeralda direito', [w / 2 - .078, h - .078, .008], [w / 4, 0, .058], material('insideGreen', 0x17382b, .72, .25));
    // Placas, cantos metálicos, fecho e pedra central: identidade da Ganância.
    for (const side of [-1, 1]) {
      for (const yy of [-1, 1]) {
        box(root, 'Canto dourado', [.085, .055, .018], [side * .395, yy * .292, .078], gold);
      }
    }
    box(root, 'Placa central', [.24, .31, .025], [.0, .015, .083], gold);
    const gem = new T.Mesh(new T.OctahedronGeometry(.095, 1), green);
    gem.name = 'Selo esmeralda'; gem.position.set(0, .02, .105); gem.scale.set(.82, 1.22, .56); root.add(gem);
    const sealRing = new T.Mesh(new T.TorusGeometry(.145, .012, 6, 32), gold);
    sealRing.position.set(0, .02, .103); root.add(sealRing);
    makeRune(root, 0, -.205, .092, .55);
    // Pequenas nervuras de lombada reforçam a silhueta de um volume encadernado.
    for (let i = -1; i <= 1; i++) {
      const rib = new T.Mesh(new T.TorusGeometry(.055, .009, 4, 16, Math.PI), gold);
      rib.rotation.y = Math.PI / 2; rib.position.set(0, i * .19, .018); root.add(rib);
    }
    // MOD 117: aura de sombra em camadas — anéis finos, névoa irregular e partículas orbitais.
    // A fumaça usa alpha blending e tons neutros de carvão/cinza, sem brilho roxo ou branco.
    const darkMat = new T.MeshBasicMaterial({
      color: 0x292929, transparent: true, opacity: .28,
      blending: T.NormalBlending, depthWrite: false, side: T.DoubleSide
    });
    const darkCoreMat = new T.MeshBasicMaterial({
      color: 0x101010, transparent: true, opacity: .34,
      blending: T.NormalBlending, depthWrite: false, side: T.DoubleSide
    });
    darkAura = new T.Mesh(new T.TorusGeometry(.55, .012, 5, 64), darkMat);
    darkAura.name = 'Filamento externo da aura sombria';
    darkAura.position.set(0, 0, .015);
    darkAura.rotation.x = .22;
    root.add(darkAura);
    darkAuraCore = new T.Mesh(new T.TorusGeometry(.47, .007, 4, 56), darkCoreMat);
    darkAuraCore.name = 'Filamento interno de sombra';
    darkAuraCore.position.set(0, 0, .02);
    darkAuraCore.rotation.set(-.18, .32, 0);
    root.add(darkAuraCore);
    // Nuvens elípticas sobrepostas dão volume à fumaça, em vez de simples bolinhas ou aros grossos.
    const smokeColors = [0x171717, 0x292929, 0x3a3a3a, 0x202020, 0x484848];
    for (let i = 0; i < 18; i++) {
      const tone = smokeColors[i % smokeColors.length];
      const smokeMat = new T.MeshBasicMaterial({
        color: tone, transparent: true,
        opacity: .11 + (i % 4) * .025,
        blending: T.NormalBlending, depthWrite: false,
        side: T.DoubleSide
      });
      const cloud = new T.Mesh(new T.SphereGeometry(1, 9, 7), smokeMat);
      const size = .075 + (i % 5) * .012;
      cloud.scale.set(size * 1.45, size * (1.7 + (i % 3) * .25), .018 + (i % 3) * .006);
      cloud.userData = {
        phase: i * Math.PI * 2 / 18,
        radius: .43 + (i % 5) * .035,
        height: -.29 + (i % 7) * .095,
        speed: .34 + (i % 4) * .11,
        drift: .025 + (i % 3) * .012,
        baseScale: size
      };
      cloud.name = 'Nuvem de fumaça sombria ' + i;
      root.add(cloud);
      darkSmoke.push(cloud);
    }
    // Pontos escuros muito discretos quebram a silhueta e dão movimento à aura.
    const sparkColors = [0x202020, 0x383838, 0x111111];
    for (let i = 0; i < 10; i++) {
      const sparkMat = new T.MeshBasicMaterial({
        color: sparkColors[i % sparkColors.length], transparent: true,
        opacity: .3, blending: T.NormalBlending, depthWrite: false
      });
      const spark = new T.Mesh(new T.SphereGeometry(.009 + (i % 3) * .003, 6, 5), sparkMat);
      spark.userData = {
        phase: i * Math.PI * 2 / 10,
        radius: .44 + (i % 4) * .035,
        height: -.34 + (i % 6) * .13,
        speed: .48 + (i % 4) * .13
      };
      spark.name = 'Fragmento de sombra ' + i;
      root.add(spark);
      darkSparks.push(spark);
    }
    // Folhas articuladas 3D: espalham suavemente quando a capa abre.
    for (let i = 0; i < 4; i++) {
      const spread = (i - 1.5) * .012;
      const leftPage = new T.Group();
      leftPage.position.set(-.045, 0, .026 + spread);
      const leftLeaf = new T.Mesh(new T.BoxGeometry(.365, .59, .0035), pagesMat);
      leftLeaf.position.set(-.184, 0, 0);
      leftLeaf.castShadow = false; leftLeaf.receiveShadow = false;
      leftPage.add(leftLeaf); root.add(leftPage);
      pageLeaves.push({ hinge: leftPage, side: -1, offset: i * .025 });
      const rightPage = new T.Group();
      rightPage.position.set(.045, 0, .026 + spread);
      const rightLeaf = new T.Mesh(new T.BoxGeometry(.365, .59, .0035), pagesMat);
      rightLeaf.position.set(.184, 0, 0);
      rightLeaf.castShadow = false; rightLeaf.receiveShadow = false;
      rightPage.add(rightLeaf); root.add(rightPage);
      pageLeaves.push({ hinge: rightPage, side: 1, offset: i * .025 });
    }
    // Marcadores de página finos; ficam no miolo e não são poderes.
    for (let i = 0; i < 5; i++) {
      const page = box(root, 'Marcador de página ' + i, [.014, .13, .012], [.29 + i * .025, -.28, .065], i % 2 ? green : gold);
      pages.push(page);
    }
    root.scale.setScalar(1.12);
    root.visible = false;
    api.scene.add(root);
    attachedScene = api.scene;
    ready = true;
    window.ValerioGrimoire3D = {
      version: 117,
      open: function(){ targetOpen = 1; opened = true; },
      close: function(){ targetOpen = 0; opened = false; },
      toggle: function(){ targetOpen = targetOpen > .5 ? 0 : 1; opened = targetOpen > .5; },
      isOpen: function(){ return opened; },
      ready: true
    };
    if (button) {
      button.disabled = false;
      button.setAttribute('aria-pressed', 'false');
      button.textContent = 'GRIMÓRIO';
    }
  }
  function syncButton() {
    if (!button) return;
    button.setAttribute('aria-pressed', opened ? 'true' : 'false');
    button.textContent = opened ? 'FECHAR GRIMÓRIO' : 'GRIMÓRIO';
  }
  function toggle() {
    if (!ready) return;
    targetOpen = targetOpen > .5 ? 0 : 1;
    opened = targetOpen > .5;
    syncButton();
    if (root) root.visible = true;
  }
  function tick(now) {
    requestAnimationFrame(tick);
    const dt = lastTime ? Math.min(.05, (now - lastTime) / 1000) : 0;
    lastTime = now;
    if (!ready || !root || !api || !api.scene || api.scene !== attachedScene) return;
    const view = window.ValerioModelView;
    if (!view || !view.active || !Array.isArray(view.position) || !api.camera) {
      root.visible = false; return;
    }
    root.visible = true;
    // MOD 117: preserva a posição aprovada e usa uma inclinação discreta, próxima da orientação natural.
    // view.yaw usa outra convenção no renderer 2D; reutilizá-lo colocava o livro atrás do modelo.
    const p = view.position;
    const playerPos = Array.isArray(view.playerPosition) ? view.playerPosition : null;
    let facingYaw = Number.isFinite(Number(view.yaw)) ? Number(view.yaw) : 0;
    if (playerPos && Number.isFinite(playerPos[0]) && Number.isFinite(playerPos[2])) {
      const dx = playerPos[0] - p[0];
      const dz = playerPos[2] - p[2];
      if (Math.hypot(dx, dz) > 0.001) facingYaw = Math.atan2(dx, dz);
    }
    const frontDistance = 1.05;
    const bob = Math.sin(now * .0018) * .018;
    root.position.set(
      p[0] + Math.sin(facingYaw) * frontDistance,
      p[1] + 1.78 + bob,
      p[2] + Math.cos(facingYaw) * frontDistance
    );
    // Inclinação para cima: a face do grimório ergue-se ligeiramente.
    root.rotation.set(.12, facingYaw, 0);
    // Capa esquerda e direita abrem em sentidos opostos com easing suave.
    const desired = targetOpen * 1.28;
    angle += (desired - angle) * Math.min(1, dt * 7.5);
    if (leftHinge) leftHinge.rotation.y = -angle;
    if (rightHinge) rightHinge.rotation.y = angle;
    pageLeaves.forEach(function(page) {
      const pageOpen = Math.max(0, angle - page.offset);
      page.hinge.rotation.y = page.side < 0 ? -pageOpen * .28 : pageOpen * .28;
    });
    // Fumaça deriva para cima enquanto gira em volta do grimório, com pulsação suave.
    const pulse = .5 + .5 * Math.sin(now * .0017);
    if (darkAura) {
      darkAura.rotation.z = now * .00028;
      darkAura.scale.set(1 + .025 * pulse, 1 + .045 * pulse, 1);
      darkAura.material.opacity = .19 + .08 * pulse;
    }
    if (darkAuraCore) {
      darkAuraCore.rotation.z = -now * .00036;
      darkAuraCore.scale.set(1 + .035 * (1 - pulse), 1 + .025 * pulse, 1);
      darkAuraCore.material.opacity = .24 + .09 * pulse;
    }
    darkSmoke.forEach((cloud) => {
      const u = cloud.userData;
      const t = now * .001 * u.speed + u.phase;
      const rise = ((now * .00011 * u.speed + u.phase / (Math.PI * 2)) % 1);
      cloud.position.set(
        Math.cos(t) * u.radius + Math.sin(t * .65) * u.drift,
        u.height + rise * .13 + Math.sin(t * .7) * .025,
        .035 + Math.sin(t * 1.3) * .11
      );
      cloud.rotation.z = t * .38;
      const swell = .88 + .18 * Math.sin(t * 1.35);
      cloud.scale.set(u.baseScale * 1.45 * swell, u.baseScale * (1.7 + (Math.sin(t) + 1) * .2), .02 + (Math.sin(t * .9) + 1) * .006);
      cloud.material.opacity = .09 + (.07 * (.5 + .5 * Math.sin(t * 1.6)));
    });
    darkSparks.forEach((spark) => {
      const u = spark.userData;
      const t = now * .001 * u.speed + u.phase;
      spark.position.set(Math.cos(t) * u.radius, u.height + Math.sin(t * .72) * .055, .055 + Math.sin(t) * .13);
      spark.material.opacity = .18 + .2 * (.5 + .5 * Math.sin(t * 1.8));
    });
    runes.forEach((r, i) => { r.rotation.z = Math.sin(now * .0015 + i) * .06; });
    if (angle < .01 && targetOpen === 0) root.visible = false;
  }
  function init() {
    button = document.getElementById('btn-valerio-grimoire');
    if (button) {
      button.disabled = true;
      button.textContent = 'CARREGANDO…';
      button.addEventListener('click', toggle);
    }
    window.addEventListener('keydown', function(e) {
      if (e.repeat || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.code !== 'KeyG') return;
      const target = e.target;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      e.preventDefault(); toggle();
    });
    function waitForSharedScene() {
      api = window.ValerioThreeAPI;
      if (!api || !api.THREE || !api.scene || !api.camera) {
        setTimeout(waitForSharedScene, 180); return;
      }
      try { buildBook(); requestAnimationFrame(tick); }
      catch (err) {
        console.error('MOD 117: falha ao montar o grimório 3D de Valério.', err);
        if (button) { button.disabled = true; button.textContent = 'GRIMÓRIO INDISPONÍVEL'; }
      }
    }
    waitForSharedScene();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
