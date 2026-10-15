/* Mod 69 — Bíblia Celestial integrada em página isolada de combate.
 * Ativado somente com ?bibliaTest=1 para não alterar o combate normal.
 * Usa a cena/câmera Three.js compartilhada do protagonista e do Bispo.
 */
(function () {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  if (params.get('bibliaTest') !== '1' && !document.getElementById('btn-magic')) return;

  const CLOSED_URL = './biblia_celestial_fechada.glb?v=mod69-biblia-20261014';
  const OPEN_URL = './biblia_celestial_aberta.glb?v=mod69-biblia-20261014';
  const TARGET_SIZE = 0.82;
  const BOOK_FORWARD = 1.08;
  const CAST_VISIBLE_MS = 2450;

  let api = null;
  let group = null;
  let closedBook = null;
  let openBook = null;
  let goldRing = null;
  let whiteRing = null;
  let flash = null;
  let started = false;
  let opened = false;
  let openAt = 0;
  let opening = false;
  let transitionStart = 0;
  const OPEN_TRANSITION_MS = 520;
  let lastWarning = 0;
  let hideAt = 0;
  let castRequested = false;
  let lastSummonInput = 0;
  let lastSpellCast = 0;

  function prepareBook(sceneModel) {
    const THREE = api.THREE;
    sceneModel.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(sceneModel);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    bounds.getSize(size);
    bounds.getCenter(center);

    const largest = Math.max(size.x, size.y, size.z, 0.001);
    const fit = TARGET_SIZE / largest;
    const holder = new THREE.Group();
    sceneModel.scale.setScalar(fit);
    sceneModel.position.set(-center.x * fit, -center.y * fit, -center.z * fit);
    holder.add(sceneModel);

    sceneModel.traverse(function (object) {
      if (!object.isMesh) return;
      object.castShadow = false;
      object.receiveShadow = false;
      object.frustumCulled = true;
    });
    return holder;
  }

  function addAura() {
    const THREE = api.THREE;
    goldRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.53, 0.012, 6, 48),
      new THREE.MeshBasicMaterial({ color: 0xf3cc72, transparent: true, opacity: 0.62, depthWrite: false })
    );
    whiteRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.43, 0.006, 5, 40),
      new THREE.MeshBasicMaterial({ color: 0xfff5d8, transparent: true, opacity: 0.46, depthWrite: false })
    );
    goldRing.position.z = -0.045;
    whiteRing.position.z = -0.035;
    group.add(goldRing, whiteRing);

    flash = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xfff3c2, transparent: true, opacity: 0, depthWrite: false })
    );
    group.add(flash);
  }

  function loadModel(url, callback) {
    const loader = new api.THREE.GLTFLoader();
    loader.load(url, function (gltf) {
      try {
        callback(prepareBook(gltf.scene));
      } catch (error) {
        console.warn('Bíblia Celestial: não foi possível preparar o modelo.', error);
      }
    }, undefined, function (error) {
      console.warn('Bíblia Celestial: falha ao carregar ' + url, error);
    });
  }

  function summon() {
    if (!started || !closedBook || !openBook) return;
    const stamp = performance.now();
    if (stamp - lastSummonInput < 280 || (lastSpellCast && stamp - lastSpellCast < SPELL_COOLDOWN_MS)) return;
    lastSummonInput = stamp;
    lastSpellCast = stamp;
    castRequested = true; opened = false; opening = false;
    hideAt = stamp + CAST_VISIBLE_MS;
    openAt = stamp + 250;
    closedBook.visible = true; openBook.visible = false;
    closedBook.rotation.y = 0; closedBook.scale.setScalar(1);
    openBook.rotation.y = 0; openBook.scale.setScalar(1);
    group.visible = true;
    if (flash) { flash.material.opacity = 0.78; flash.scale.setScalar(0.18); }
    window.BibliaCelestialDiagnostics = 'Espadas Celestiais: Bíblia abrindo';
  }


  // Magia 2 — Invocação das Três Espadas Celestiais.
  // Reutiliza o mesmo GLB da espada equipada pelo protagonista.
  const SWORD_MODEL_URL = './EspadaProta.glb?v=mod75-espadas-celestiais';
  const SWORD_DAMAGE = 12;
  const SPELL_COOLDOWN_MS = 3000;
  let swordTemplate = null;
  let flyingSwords = [];
  let swordLoadStarted = false;

  function loadSwordTemplate() {
    if (swordLoadStarted || !api || !api.THREE || !api.THREE.GLTFLoader) return;
    swordLoadStarted = true;
    new api.THREE.GLTFLoader().load(SWORD_MODEL_URL, function (gltf) {
      swordTemplate = gltf.scene;
      swordTemplate.updateMatrixWorld(true);
      window.BibliaCelestialDiagnostics = 'Espadas Celestiais: espada reutilizada carregada';
    }, undefined, function (err) {
      console.warn('Espadas Celestiais: falha ao carregar a espada reutilizada.', err);
      window.BibliaCelestialDiagnostics = 'Espadas Celestiais: modelo da espada indisponível';
    });
  }

  function clearFlyingSwords() {
    if (!api || !api.scene) return;
    flyingSwords.forEach(function (entry) {
      if (entry.root && entry.root.parent) entry.root.parent.remove(entry.root);
      if (entry.light && entry.light.parent) entry.light.parent.remove(entry.light);
    });
    flyingSwords = [];
  }

  function makeSwordGlowMaterial(original) {
    const material = original.clone();
    if ('emissive' in material) {
      material.emissive.set(0xffdf52);
      material.emissiveIntensity = 3.4;
    }
    material.transparent = true;
    material.opacity = 0.96;
    material.depthWrite = true;
    return material;
  }

  function createFlyingSword(position, direction, target, index, now) {
    const THREE = api.THREE;
    const root = new THREE.Group();
    root.name = 'EspadaCelestial_Projetil_' + (index + 1);
    const aura = swordTemplate.clone(true);
    aura.name = 'AuraDourada_Espada_' + (index + 1);
    aura.scale.setScalar(1.16);
    aura.traverse(function (obj) {
      if (!obj.isMesh) return;
      obj.castShadow = false;
      obj.receiveShadow = false;
      const sourceMaterials = Array.isArray(obj.material) ? obj.material : [obj.material];
      const auraMaterials = sourceMaterials.filter(Boolean).map(function () {
        return new THREE.MeshBasicMaterial({
          color: 0xffd52e,
          transparent: true,
          opacity: 0.3,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
          depthWrite: false
        });
      });
      obj.material = Array.isArray(obj.material) ? auraMaterials : auraMaterials[0];
    });
    const blade = swordTemplate.clone(true);
    blade.name = 'EspadaLuminosa_' + (index + 1);
    blade.traverse(function (obj) {
      if (!obj.isMesh) return;
      obj.castShadow = false;
      obj.receiveShadow = false;
      if (Array.isArray(obj.material)) {
        obj.material = obj.material.map(function (m) { return makeSwordGlowMaterial(m); });
      } else if (obj.material) {
        obj.material = makeSwordGlowMaterial(obj.material);
      }
    });
    root.add(aura, blade);
    const bounds = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3();
    bounds.getSize(size);
    const longest = Math.max(size.x, size.y, size.z, 0.001);
    const baseScale = 0.72 / longest;
    root.scale.setScalar(baseScale);
    root.position.copy(position);
    root.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), direction.clone().normalize());
    api.scene.add(root);
    const light = new THREE.PointLight(0xffd43b, 3.0, 3.4);
    light.position.copy(position);
    api.scene.add(light);
    root.userData.startX = position.x;
    root.userData.startY = position.y;
    root.userData.startZ = position.z;
    root.userData.baseScale = baseScale;
    flyingSwords.push({
      root: root,
      light: light,
      velocity: direction.clone().normalize().multiplyScalar(4.1),
      launchAt: now + 650,
      target: target ? target.clone() : position.clone().addScaledVector(direction, 6),
      bossTarget: !!target,
      index: index,
      startedAt: now,
      hit: false,
      damage: SWORD_DAMAGE
    });
  }

  function launchCelestialSwords(view, now) {
    if (!Array.isArray(view.position) || view.position.length < 3 || !swordTemplate) {
      window.BibliaCelestialDiagnostics = swordTemplate
        ? 'Espadas Celestiais: posição do protagonista indisponível'
        : 'Espadas Celestiais: carregando a espada';
      return;
    }
    clearFlyingSwords();
    const THREE = api.THREE;
    const yaw = Number(view.yaw) || 0;
    const origin = new THREE.Vector3(view.position[0], view.position[1] + 1.25, view.position[2]);
    const bossAlive = typeof BishopBoss !== 'undefined' &&
      typeof BishopDimension !== 'undefined' && BishopDimension.isBattleActive() &&
      BishopBoss.state !== 'inactive' && BishopBoss.state !== 'dead' &&
      Number.isFinite(BishopBoss.x) && Number.isFinite(BishopBoss.y);
    let target = null;
    if (bossAlive && typeof Casino !== 'undefined' && Casino.room) {
      const cx = (Casino.room.left + Casino.room.right) / 2;
      const cy = (Casino.room.top + Casino.room.bottom) / 2;
      target = new THREE.Vector3((BishopBoss.x - cx) / 72, origin.y - 0.08, (BishopBoss.y - cy) / 72);
    } else {
      target = origin.clone().add(new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).multiplyScalar(6));
    }
    const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const side = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const starts = [
      origin.clone().addScaledVector(forward, 0.88).add(new THREE.Vector3(0, 0.12, 0)),
      origin.clone().addScaledVector(forward, 0.22).addScaledVector(side, 0.72).add(new THREE.Vector3(0, 0.04, 0)),
      origin.clone().addScaledVector(forward, 0.22).addScaledVector(side, -0.72).add(new THREE.Vector3(0, 0.04, 0))
    ];
    starts.forEach(function (start, index) {
      const aim = target.clone().sub(start).normalize();
      createFlyingSword(start, aim, bossAlive ? target.clone() : null, index, now);
    });
    window.BibliaCelestialDiagnostics = 'Três Espadas Celestiais lançadas';
  }

  function updateFlyingSwords(now, dt) {
    if (!flyingSwords.length) return;
    const THREE = api.THREE;
    flyingSwords = flyingSwords.filter(function (entry) {
      if (!entry.root || !entry.root.parent) return false;
      if (now >= entry.launchAt) {
        entry.root.position.addScaledVector(entry.velocity, dt);
        entry.root.rotateY(dt * 0.45);
      } else {
        entry.root.position.y += Math.sin(now * 0.004 + entry.index * 2) * dt * 0.09;
        entry.root.rotation.y += dt * 0.28;
      }
      entry.light.position.copy(entry.root.position);
      entry.light.intensity = 2.6 + (Math.sin(now * 0.012 + entry.index) + 1) * 0.65;
      const pulse = 1 + Math.sin(now * 0.018 + entry.index) * 0.07;
      entry.root.scale.setScalar((entry.root.userData.baseScale || 0.01) * pulse);
      if (!entry.hit && entry.bossTarget && typeof BishopBoss !== 'undefined' &&
          BishopBoss.state !== 'inactive' && BishopBoss.state !== 'dead' &&
          typeof Casino !== 'undefined' && Casino.room) {
        const cx = (Casino.room.left + Casino.room.right) / 2;
        const cy = (Casino.room.top + Casino.room.bottom) / 2;
        const bx = (BishopBoss.x - cx) / 72;
        const bz = (BishopBoss.y - cy) / 72;
        if (Math.hypot(entry.root.position.x - bx, entry.root.position.z - bz) < 0.78) {
          entry.hit = true;
          const dx = BishopBoss.x - Player.x, dy = BishopBoss.y - Player.y;
          const d = Math.hypot(dx, dy) || 1;
          BishopBoss.hurt(entry.damage, dx / d, dy / d, 145);
          window.BibliaCelestialDiagnostics = 'Espada Celestial acertou: ' + entry.damage + ' de dano';
          if (entry.root.parent) entry.root.parent.remove(entry.root);
          if (entry.light.parent) entry.light.parent.remove(entry.light);
          return false;
        }
      }
      if (now - entry.startedAt > 4200 ||
          entry.root.position.distanceTo(new THREE.Vector3(entry.root.userData.startX, entry.root.userData.startY, entry.root.userData.startZ)) > 8) {
        if (entry.root.parent) entry.root.parent.remove(entry.root);
        if (entry.light.parent) entry.light.parent.remove(entry.light);
        return false;
      }
      return true;
    });
  }

  function begin() {
    if (started) return;
    api = window.ValerioThreeAPI;
    if (!api || !api.THREE || !api.scene || !api.THREE.GLTFLoader) {
      requestAnimationFrame(begin);
      return;
    }
    started = true;
    loadSwordTemplate();
    const THREE = api.THREE;
    group = new THREE.Group();
    group.visible = false;
    api.scene.add(group);
    addAura();

    let loaded = 0;
    function onLoaded(model, isOpen) {
      if (isOpen) openBook = model;
      else closedBook = model;
      model.visible = false;
      group.add(model);
      loaded++;
      if (loaded !== 2) return;
      closedBook.visible = true;
      group.visible = false;
      openAt = 0;
      window.BibliaCelestialDiagnostics = 'modelos fechado e aberto carregados';
    }

    loadModel(CLOSED_URL, function (model) { onLoaded(model, false); });
    loadModel(OPEN_URL, function (model) { onLoaded(model, true); });
    window.BibliaCelestialDiagnostics = 'Bíblia carregada; aguardando botão MAGIA';
    const magicButton = document.getElementById('btn-magic');
    if (magicButton) {
      magicButton.style.touchAction = 'none';
      // pointerdown responde imediatamente no celular, inclusive enquanto o outro dedo move o joystick.
      magicButton.addEventListener('pointerdown', function (event) {
        event.preventDefault();
        summon();
      }, { passive: false });
      // Fallback para navegadores que não disparam Pointer Events.
      magicButton.addEventListener('click', summon);
    }
    window.castBibliaCelestial = summon;
    window.addEventListener('biblia-cast', summon);
    requestAnimationFrame(update);
  }

  let previousFrame = 0;
  function update(now) {
    requestAnimationFrame(update);
    const dt = previousFrame ? Math.min(0.05, (now - previousFrame) / 1000) : 0;
    previousFrame = now;
    updateFlyingSwords(now, dt);
    if (!group || !api) return;

    const view = window.PlayerModelView;
    if (!view || !view.active || view.dead || !Number.isFinite(view.yaw)) {
      group.visible = false;
      return;
    }
    if (!closedBook || !openBook) return;

    if (!castRequested) { group.visible = false; return; }
    if (hideAt && now >= hideAt) {
      castRequested = false; opened = false; opening = false; hideAt = 0;
      group.visible = false; closedBook.visible = false; openBook.visible = false;
      window.BibliaCelestialDiagnostics = 'Bíblia recolhida após o encantamento';
      return;
    }
    group.visible = true;
    if (!opened && !opening && now >= openAt) {
      opening = true;
      transitionStart = now;
      closedBook.visible = true;
      openBook.visible = true;
      openBook.scale.set(0.001, 1, 1);
      flash.material.opacity = 0.72;
      flash.scale.setScalar(0.16);
    }

    if (!Array.isArray(view.position) || view.position.length < 3) return;
    if (opening) {
      const progress = Math.max(0, Math.min(1, (now - transitionStart) / OPEN_TRANSITION_MS));
      const eased = progress * progress * (3 - 2 * progress);
      closedBook.rotation.y = eased * Math.PI * 0.5;
      closedBook.scale.x = Math.max(0.001, 1 - eased);
      openBook.rotation.y = -Math.PI * 0.5 + eased * Math.PI * 0.5;
      openBook.scale.x = Math.max(0.001, eased);
      if (progress >= 1) {
        opening = false;
        opened = true;
        closedBook.visible = false;
        openBook.visible = true;
        closedBook.rotation.y = 0;
        closedBook.scale.setScalar(1);
        openBook.rotation.y = 0;
        openBook.scale.setScalar(1);
        window.BibliaCelestialDiagnostics = 'Bíblia aberta; conjurando Três Espadas Celestiais';
        launchCelestialSwords(view, now);
      }
    }

    const yaw = Number(view.yaw) || 0;
    const bob = Math.sin(now * 0.0032) * 0.045;
    const forward = BOOK_FORWARD;
    let bookX = view.position[0] + Math.sin(yaw) * forward;
    let bookZ = view.position[2] + Math.cos(yaw) * forward;
    if (typeof BishopDimension !== 'undefined' && typeof BishopDimension.resolveBiblePosition === 'function') {
      const resolved = BishopDimension.resolveBiblePosition(bookX, bookZ, 0.42);
      bookX = resolved.x; bookZ = resolved.z;
    }
    group.position.set(bookX, view.position[1] + 1.62 + bob, bookZ);
    group.rotation.y = yaw;

    const pulse = 1 + Math.sin(now * 0.004) * 0.045;
    goldRing.rotation.z = now * 0.00042;
    whiteRing.rotation.z = -now * 0.00065;
    goldRing.scale.setScalar(pulse);
    whiteRing.scale.setScalar(1 + Math.sin(now * 0.005) * 0.035);

    if ((opened || opening) && flash.material.opacity > 0) {
      flash.material.opacity = Math.max(0, flash.material.opacity - 0.035);
      const s = flash.scale.x + 0.085;
      flash.scale.setScalar(s);
    }
  }

  if (document.readyState === 'complete') begin();
  else window.addEventListener('load', begin, { once: true });
})();