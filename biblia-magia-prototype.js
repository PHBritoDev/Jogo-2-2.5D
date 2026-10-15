/* Mod 69 — Bíblia Celestial integrada em página isolada de combate.
 * Ativado somente com ?bibliaTest=1 para não alterar o combate normal.
 * Usa a cena/câmera Three.js compartilhada do protagonista e do Bispo.
 */
(function () {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  if (params.get('bibliaTest') !== '1') return;

  const CLOSED_URL = './biblia_celestial_fechada.glb?v=mod69-biblia-20261014';
  const OPEN_URL = './biblia_celestial_aberta.glb?v=mod69-biblia-20261014';
  const TARGET_SIZE = 0.82;
  const BOOK_FORWARD = 1.08;
  const CAST_VISIBLE_MS = 1850;

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
    if (!started || !closedBook || !openBook || castRequested) return;
    castRequested = true; opened = false; opening = false;
    hideAt = performance.now() + CAST_VISIBLE_MS;
    openAt = performance.now() + 250;
    closedBook.visible = true; openBook.visible = false;
    closedBook.rotation.y = 0; closedBook.scale.setScalar(1);
    openBook.rotation.y = 0; openBook.scale.setScalar(1);
    group.visible = true;
    if (flash) { flash.material.opacity = 0.78; flash.scale.setScalar(0.18); }
    window.BibliaCelestialDiagnostics = 'encantamento iniciado';
  }

  function begin() {
    if (started) return;
    api = window.ValerioThreeAPI;
    if (!api || !api.THREE || !api.scene || !api.THREE.GLTFLoader) {
      requestAnimationFrame(begin);
      return;
    }
    started = true;
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
    if (magicButton) magicButton.addEventListener('click', summon);
    window.castBibliaCelestial = summon;
    window.addEventListener('biblia-cast', summon);
    requestAnimationFrame(update);
  }

  function update(now) {
    requestAnimationFrame(update);
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
        window.BibliaCelestialDiagnostics = 'Bíblia integrada à dimensão do Valério e aberta';
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