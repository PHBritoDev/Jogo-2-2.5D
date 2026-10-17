/* MOD 122 — grimório sombrio e escarlate, invocado automaticamente durante magia do Bispo.
 * Artefato visual independente; reutiliza a cena/câmera Three.js já carregada.
 * Não implementa poderes, dano, cooldowns ou comportamento de combate.
 */
(function () {
  'use strict';
  const params = new URLSearchParams(window.location.search);
  const enabled = params.get('valerioTest') === '1' || params.get('protagonista3D') === '1' || params.get('valerioGrimoire') === '1';
  if (!enabled) return;

  let api = null, root = null, leftHinge = null, rightHinge = null;
  let pages = [], pageLeaves = [], runes = [], darkSparks = [], darkSmoke = [], darkTendrils = [], crimsonTendrils = [], opened = false, targetOpen = 0, angle = 0;
  let lastTime = 0, ready = false, attachedScene = null, autoCloseAt = 0;
  const GOLD = 0xe7a6b2, DARK_GOLD = 0x32101b, EMERALD = 0xff1744;
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
    root = new T.Group(); root.name = 'BishopGrimoire3D_Mod122';
    const leather = material('leather', 0x08050b, .48, .42, 0x430010, .42);
    const leatherEdge = material('leatherEdge', 0x250711, .38, .62, 0x8b0022, .58);
    const pagesMat = material('parchment', 0x251018, .88, .08, 0x5a0018, .16);
    const pageShadow = material('pageShadow', 0x10060d, .9, .04, 0x2d000b, .12);
    const gold = material('gold', 0x9c1736, .28, .82, 0xff002e, .75);
    const green = material('greenGem', 0xff1744, .18, .58, 0xff003c, 1.8);
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
    // MOD 118: magia proibida — fumaça negra, filamentos orgânicos e veias escarlates.
    // Sem círculos mágicos: a energia parece escapar das páginas e enrolar-se no ar.
    const smokeColors = [0x020105, 0x08020a, 0x16020a, 0x27000d, 0x4a0015];
    for (let i = 0; i < 22; i++) {
      const smokeMat = new T.MeshBasicMaterial({
        color: smokeColors[i % smokeColors.length], transparent: true,
        opacity: .20 + (i % 4) * .035, blending: T.NormalBlending,
        depthWrite: false, side: T.DoubleSide
      });
      const cloud = new T.Mesh(new T.SphereGeometry(1, 10, 8), smokeMat);
      const size = .065 + (i % 6) * .012;
      cloud.scale.set(size * 1.5, size * (1.8 + (i % 3) * .3), .025 + (i % 3) * .008);
      cloud.userData = {
        phase: i * Math.PI * 2 / 22, radius: .35 + (i % 6) * .045,
        height: -.22 + (i % 9) * .07, speed: .42 + (i % 5) * .13,
        drift: .035 + (i % 4) * .012, baseScale: size
      };
      cloud.name = 'Véu de energia negra ' + i;
      root.add(cloud); darkSmoke.push(cloud);
    }
    // Tentáculos de sombra: curvas afiladas e irregulares, sem geometria circular.
    for (let i = 0; i < 7; i++) {
      const phase = i * Math.PI * 2 / 7;
      const points = [];
      for (let j = 0; j < 7; j++) {
        const t = j / 6;
        const radius = .12 + t * (.37 + (i % 3) * .045);
        points.push(new T.Vector3(
          Math.cos(phase + t * (1.3 + (i % 3) * .25)) * radius,
          -.16 + t * (.38 + (i % 4) * .035) + Math.sin(phase + t * 4) * .065,
          .04 + Math.sin(phase + t * 3.1) * (.035 + t * .09)
        ));
      }
      const curve = new T.CatmullRomCurve3(points);
      const mesh = new T.Mesh(new T.TubeGeometry(curve, 24, .009 + (i % 3) * .002, 5, false),
        new T.MeshBasicMaterial({color: 0x090006, transparent:true, opacity:.92, depthWrite:false}));
      mesh.name = 'Tentáculo de sombra ' + i;
      mesh.userData = {phase, speed: .35 + (i % 4) * .12};
      root.add(mesh); darkTendrils.push(mesh);
    }
    // Fissuras escarlates dentro da sombra: finas, irregulares e pulsantes, nunca um halo redondo.
    for (let i = 0; i < 5; i++) {
      const phase = i * Math.PI * 2 / 5 + .3;
      const points = [];
      for (let j = 0; j < 6; j++) {
        const t = j / 5;
        const radius = .13 + t * (.31 + (i % 2) * .06);
        points.push(new T.Vector3(
          Math.cos(phase + t * 1.6) * radius,
          -.10 + t * (.26 + (i % 3) * .04) + Math.sin(phase + t * 5) * .04,
          .14 + Math.sin(phase + t * 2.8) * .045
        ));
      }
      const vein = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points), 20, .0045, 4, false),
        new T.MeshBasicMaterial({color: i % 2 ? 0xff1744 : 0xff4268, transparent:true, opacity:.88, depthWrite:false, blending: T.AdditiveBlending}));
      vein.name = 'Fissura escarlate ' + i;
      vein.userData = {phase, speed: .6 + (i % 3) * .15};
      root.add(vein); crimsonTendrils.push(vein);
    }
    // Brasas vermelhas e lascas negras sobem em trajetórias tortas, como energia instável.
    const sparkColors = [0x8f0714, 0xc51d2b, 0x31050a, 0x161616];
    for (let i = 0; i < 18; i++) {
      const red = i % 3 !== 0;
      const sparkMat = new T.MeshBasicMaterial({
        color: sparkColors[i % sparkColors.length], transparent: true,
        opacity: red ? .72 : .5, blending: red ? T.AdditiveBlending : T.NormalBlending,
        depthWrite: false
      });
      const spark = new T.Mesh(new T.SphereGeometry(.006 + (i % 4) * .0025, 6, 5), sparkMat);
      spark.userData = {
        phase: i * Math.PI * 2 / 18, radius: .22 + (i % 7) * .045,
        height: -.34 + (i % 9) * .085, speed: .55 + (i % 5) * .16,
        rise: .08 + (i % 4) * .035
      };
      spark.name = red ? 'Brasa escarlate ' + i : 'Fragmento de sombra ' + i;
      root.add(spark); darkSparks.push(spark);
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
    root.scale.setScalar(1.24);
    root.visible = false;
    api.scene.add(root);
    attachedScene = api.scene;
    ready = true;
    window.BishopGrimoire3D = {
      version: 122,
      invoke: function(duration){
        if (!ready || !root) return false;
        targetOpen = 1; opened = true; root.visible = true;
        autoCloseAt = performance.now() + (Number(duration) > 0 ? Number(duration) : 2600);
        return true;
      },
      open: function(){ return window.BishopGrimoire3D.invoke(2600); },
      close: function(){ targetOpen = 0; opened = false; autoCloseAt = 0; },
      isOpen: function(){ return opened; },
      ready: true
    };
    window.ValerioGrimoire3D = window.BishopGrimoire3D;
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
    if (autoCloseAt && now >= autoCloseAt) {
      targetOpen = 0; opened = false; autoCloseAt = 0;
    }
    root.visible = targetOpen > 0 || angle > .01;
    // MOD 119: grimório só fica visível durante uma conjuração do Bispo.
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
    // A fumaça se enrola e sobe; as fissuras vermelhas pulsam dentro dos tentáculos negros.
    darkSmoke.forEach((cloud) => {
      const u = cloud.userData;
      const t = now * .001 * u.speed + u.phase;
      const rise = ((now * .00014 * u.speed + u.phase / (Math.PI * 2)) % 1);
      cloud.position.set(
        Math.cos(t) * u.radius + Math.sin(t * .73) * u.drift,
        u.height + rise * .18 + Math.sin(t * .8) * .035,
        .02 + Math.sin(t * 1.2) * .13
      );
      cloud.rotation.z = t * .48;
      const swell = .8 + .28 * Math.sin(t * 1.4);
      cloud.scale.set(u.baseScale * 1.5 * swell, u.baseScale * (1.8 + (Math.sin(t) + 1) * .25), .025 + (Math.sin(t * .9) + 1) * .008);
      cloud.material.opacity = .18 + .16 * (.5 + .5 * Math.sin(t * 1.7));
    });
    darkTendrils.forEach((mesh) => {
      const u = mesh.userData;
      mesh.rotation.z = Math.sin(now * .0007 * u.speed + u.phase) * .16;
      mesh.rotation.y = Math.sin(now * .00055 * u.speed + u.phase) * .22;
      mesh.material.opacity = .64 + .2 * (.5 + .5 * Math.sin(now * .0012 * u.speed + u.phase));
    });
    crimsonTendrils.forEach((mesh) => {
      const u = mesh.userData;
      mesh.rotation.z = Math.sin(now * .001 * u.speed + u.phase) * .11;
      mesh.rotation.y = Math.sin(now * .0008 * u.speed + u.phase) * .12;
      mesh.material.opacity = .28 + .52 * (.5 + .5 * Math.sin(now * .002 * u.speed + u.phase));
    });
    darkSparks.forEach((spark) => {
      const u = spark.userData;
      const t = now * .001 * u.speed + u.phase;
      const rise = ((now * .00028 * u.speed + u.phase / (Math.PI * 2)) % 1);
      spark.position.set(
        Math.cos(t) * u.radius + Math.sin(t * 1.7) * .035,
        u.height + rise * u.rise + Math.sin(t * 1.9) * .045,
        .12 + Math.sin(t * 1.3) * .13
      );
      const red = spark.name.indexOf('Brasa') === 0;
      spark.material.opacity = red ? .35 + .55 * (.5 + .5 * Math.sin(t * 2.2)) : .2 + .36 * (.5 + .5 * Math.sin(t * 1.8));
      spark.scale.setScalar(.72 + .55 * (.5 + .5 * Math.sin(t * 2.5)));
    });
    runes.forEach((r, i) => { r.rotation.z = Math.sin(now * .0015 + i) * .06; });
    if (angle < .01 && targetOpen === 0) root.visible = false;
  }
  function init() {
    function waitForSharedScene() {
      api = window.ValerioThreeAPI;
      if (!api || !api.THREE || !api.scene || !api.camera) {
        setTimeout(waitForSharedScene, 180); return;
      }
      try { buildBook(); requestAnimationFrame(tick); }
      catch (err) {
        console.error('MOD 119: falha ao montar o grimório 3D do Bispo.', err);
      }
    }
    waitForSharedScene();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
