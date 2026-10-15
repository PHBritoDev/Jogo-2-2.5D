/* Mod 84 — Grimório em todas as magias, sol suspenso e queimadura divina.
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
  let pendingBookSpell = 'swords';

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

  function summon(spell) {
    if (!started || !closedBook || !openBook) return;
    const stamp = performance.now();
    const requestedSpell = spell || 'swords';
    if (stamp - lastSummonInput < 280 || (requestedSpell === 'swords' && lastSpellCast && stamp - lastSpellCast < SPELL_COOLDOWN_MS)) return;
    lastSummonInput = stamp;
    lastSpellCast = stamp;
    pendingBookSpell = requestedSpell;
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


  // Modificação 80 — Habilidade 2: Julgamento Celestial otimizado.
  // Círculo mágico 3D gerado por código; não exige modelo externo.
  const JUDGMENT_COOLDOWN_MS = 6500;
  const JUDGMENT_DAMAGE = 11;
  const JUDGMENT_FALL_MS = 1280;
  const JUDGMENT_LOCK_LEAD_MS = 300;
  const JUDGMENT_HIT_RADIUS = 0.76;
  let judgmentLastCast = 0;
  let judgmentRing = null;
  let judgmentRunes = [];
  let judgmentSwords = [];
  let judgmentParticles = [];
  let judgmentParticleGeometry = null;
  let judgmentParticleMaterials = null;
  let judgmentCastActive = false;
  let judgmentTarget = null;
  let judgmentLastFrame = 0;
  let judgmentButtonBound = false;

  function makeJudgmentCircle(center, now) {
    const THREE = api.THREE;
    if (judgmentRing && judgmentRing.parent) judgmentRing.parent.remove(judgmentRing);
    judgmentRunes.forEach(function (m) { if (m.parent) m.parent.remove(m); });
    judgmentRunes = [];
    const root = new THREE.Group();
    root.name = 'CirculoMagico_JulgamentoCelestial';
    root.position.set(center.x, 0.035, center.z);
    const outer = new THREE.Mesh(
      new THREE.TorusGeometry(1.55, 0.035, 8, 96),
      new THREE.MeshBasicMaterial({ color: 0xffff19, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    outer.rotation.x = -Math.PI / 2;
    root.add(outer);
    const inner = new THREE.Mesh(
      new THREE.TorusGeometry(1.22, 0.014, 6, 80),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    inner.rotation.x = -Math.PI / 2;
    root.add(inner);
    const pentagramPoints = [];
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + i * Math.PI * 2 / 5;
      pentagramPoints.push(new THREE.Vector3(Math.cos(a) * 1.05, 0.015, Math.sin(a) * 1.05));
    }
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffff36, transparent: true, opacity: 1 });
    const starOrder = [0, 2, 4, 1, 3, 0];
    const points = starOrder.map(function (i) { return pentagramPoints[i]; });
    const star = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), lineMat);
    root.add(star);
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + i * Math.PI * 2 / 5;
      const rune = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.018, 0.3),
        new THREE.MeshBasicMaterial({ color: 0xffff9a, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      rune.position.set(Math.cos(a) * 1.38, 0.025, Math.sin(a) * 1.38);
      rune.rotation.y = -a;
      root.add(rune);
      judgmentRunes.push(rune);
    }
    api.scene.add(root);
    judgmentRing = root;
    judgmentRing.userData.startedAt = now;
  }

  function clearJudgmentSwords() {
    judgmentSwords.forEach(function (entry) {
      if (entry.root && entry.root.parent) entry.root.parent.remove(entry.root);
      if (entry.light && entry.light.parent) entry.light.parent.remove(entry.light);
    });
    judgmentSwords = [];
  }

  function createJudgmentParticles(position, now, finalBurst) {
    const THREE = api.THREE;
    // Reutiliza geometria e materiais: evita centenas de alocações quando as duas magias coincidem.
    if (!judgmentParticleGeometry) judgmentParticleGeometry = new THREE.SphereGeometry(1, 5, 4);
    if (!judgmentParticleMaterials) {
      judgmentParticleMaterials = [
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
        new THREE.MeshBasicMaterial({ color: 0xffd53b, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
        new THREE.MeshBasicMaterial({ color: 0xfff0a1, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
      ];
    }
    const count = finalBurst ? 16 : 6;
    for (let i = 0; i < count; i++) {
      const size = finalBurst ? 0.045 : 0.028;
      const mesh = new THREE.Mesh(judgmentParticleGeometry, judgmentParticleMaterials[i % 3]);
      mesh.scale.setScalar(size);
      mesh.position.copy(position);
      mesh.position.y += 0.08;
      const angle = Math.random() * Math.PI * 2;
      const speed = (finalBurst ? 1.7 : 1.05) * (0.45 + Math.random());
      judgmentParticles.push({
        mesh: mesh,
        size: size,
        velocity: new THREE.Vector3(Math.cos(angle) * speed, 0.45 + Math.random() * speed, Math.sin(angle) * speed),
        startedAt: now,
        life: finalBurst ? 780 : 520
      });
      api.scene.add(mesh);
    }
  }

  function launchJudgmentCelestial(now) {
    if (!swordTemplate || !api || !api.THREE) {
      window.BibliaCelestialDiagnostics = 'Julgamento Celestial: carregando modelo da espada';
      return;
    }
    clearJudgmentSwords();
    const THREE = api.THREE;
    const view = window.PlayerModelView;
    if (!view || !Array.isArray(view.position) || view.position.length < 3) return;
    const origin = new THREE.Vector3(view.position[0], view.position[1], view.position[2]);
    const yaw = Number(view.yaw) || 0;
    const bossAlive = typeof BishopBoss !== 'undefined' &&
      typeof BishopDimension !== 'undefined' && BishopDimension.isBattleActive() &&
      BishopBoss.state !== 'inactive' && BishopBoss.state !== 'dead' &&
      Number.isFinite(BishopBoss.x) && Number.isFinite(BishopBoss.y);
    if (bossAlive && typeof Casino !== 'undefined' && Casino.room) {
      const cx = (Casino.room.left + Casino.room.right) / 2;
      const cy = (Casino.room.top + Casino.room.bottom) / 2;
      judgmentTarget = new THREE.Vector3((BishopBoss.x - cx) / 72, 0.08, (BishopBoss.y - cy) / 72);
    } else {
      judgmentTarget = origin.clone().add(new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).multiplyScalar(5));
      judgmentTarget.y = 0.08;
    }
    makeJudgmentCircle(judgmentTarget, now);
    const offsets = [
      [0, 0], [1.15, 0], [-1.15, 0], [0, 1.15], [0, -1.15]
    ];
    offsets.forEach(function (offset, index) {
      const target = judgmentTarget.clone().add(new THREE.Vector3(offset[0], 0, offset[1]));
      const start = target.clone().add(new THREE.Vector3(offset[0] * 0.22, 5.0 + (index % 2) * 0.35, offset[1] * 0.22));
      const root = new THREE.Group();
      root.name = 'JulgamentoCelestial_Espada_' + (index + 1);
      const blade = swordTemplate.clone(true);
      blade.traverse(function (obj) {
        if (!obj.isMesh) return;
        obj.castShadow = false; obj.receiveShadow = false;
        const list = Array.isArray(obj.material) ? obj.material : [obj.material];
        const glowing = list.filter(Boolean).map(function (mat) {
          const m = mat.clone();
          if (m.emissive) { m.emissive.set(0xffff20); m.emissiveIntensity = 6.5; }
          if ('color' in m) m.color.set(0xfff7a1);
          m.transparent = true; m.opacity = 1;
          return m;
        });
        obj.material = Array.isArray(obj.material) ? glowing : glowing[0];
      });
      root.add(blade);
      const bounds = new THREE.Box3().setFromObject(root);
      const size = new THREE.Vector3(); bounds.getSize(size);
      const longest = Math.max(size.x, size.y, size.z, 0.001);
      root.scale.setScalar(0.78 / longest);
      root.position.copy(start);
      root.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), target.clone().sub(start).normalize());
      api.scene.add(root);
      const light = new THREE.PointLight(0xffff24, 4.2, 3.8);
      light.position.copy(start);
      api.scene.add(light);
      judgmentSwords.push({
        root: root, light: light, start: start, target: target,
        launchAt: now + 750 + index * 125, lockAt: now + 750 + index * 125 + JUDGMENT_FALL_MS - JUDGMENT_LOCK_LEAD_MS,
        startedAt: now, hit: false, index: index,
        bossTarget: bossAlive, damage: JUDGMENT_DAMAGE, targetLocked: false
      });
    });
    judgmentCastActive = true;
    judgmentLastFrame = now;
    window.BibliaCelestialDiagnostics = 'Julgamento Celestial: cinco espadas invocadas';
  }

  function getCurrentJudgmentBossTarget(entry) {
    const THREE = api.THREE;
    if (!entry.bossTarget || typeof BishopBoss === 'undefined' ||
        typeof BishopDimension === 'undefined' || !BishopDimension.isBattleActive() ||
        BishopBoss.state === 'inactive' || BishopBoss.state === 'dead' ||
        !Number.isFinite(BishopBoss.x) || !Number.isFinite(BishopBoss.y) ||
        typeof Casino === 'undefined' || !Casino.room) return null;
    const cx = (Casino.room.left + Casino.room.right) / 2;
    const cy = (Casino.room.top + Casino.room.bottom) / 2;
    return new THREE.Vector3((BishopBoss.x - cx) / 72, 0.08, (BishopBoss.y - cy) / 72);
  }

  function updateJudgment(now, dt) {
    const THREE = api && api.THREE;
    if (!THREE) return;
    if (judgmentRing) {
      const age = now - (judgmentRing.userData.startedAt || now);
      judgmentRing.rotation.y += dt * 0.32;
      const pulse = 1 + Math.sin(now * 0.012) * 0.045;
      judgmentRing.scale.set(pulse, 1, pulse);
      const liveTarget = getCurrentJudgmentBossTarget({ bossTarget: true });
      if (liveTarget && age < 2100) {
        judgmentRing.position.x += (liveTarget.x - judgmentRing.position.x) * Math.min(1, dt * 5);
        judgmentRing.position.z += (liveTarget.z - judgmentRing.position.z) * Math.min(1, dt * 5);
      }
      if (age > 3400) {
        api.scene.remove(judgmentRing);
        judgmentRing = null;
        judgmentRunes = [];
      }
    }
    judgmentSwords = judgmentSwords.filter(function (entry) {
      if (!entry.root || !entry.root.parent) return false;
      const liveTarget = getCurrentJudgmentBossTarget(entry);
      if (liveTarget && now < entry.lockAt) {
        entry.target.copy(liveTarget);
        entry.targetLocked = false;
      } else if (now >= entry.lockAt) {
        entry.targetLocked = true;
      }
      const progress = Math.max(0, Math.min(1, (now - entry.launchAt) / JUDGMENT_FALL_MS));
      if (now >= entry.launchAt) {
        const eased = progress * progress * (3 - 2 * progress);
        entry.root.position.lerpVectors(entry.start, entry.target, eased);
        const direction = entry.target.clone().sub(entry.root.position).normalize();
        if (direction.lengthSq() > 0.001) {
          entry.root.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), direction);
        }
        entry.light.position.copy(entry.root.position);
      } else {
        entry.root.position.y += Math.sin(now * 0.012 + entry.index) * dt * 0.035;
        entry.light.position.copy(entry.root.position);
      }
      entry.light.intensity = 3.8 + Math.sin(now * 0.025 + entry.index) * 0.7;
      if (!entry.hit && now >= entry.launchAt + JUDGMENT_FALL_MS) {
        entry.hit = true;
        const impact = entry.root.position.clone();
        let landedHit = false;
        if (entry.bossTarget && liveTarget && typeof BishopBoss !== 'undefined' &&
            BishopBoss.state !== 'inactive' && BishopBoss.state !== 'dead') {
          const dx3 = impact.x - liveTarget.x;
          const dz3 = impact.z - liveTarget.z;
          const distance3D = Math.hypot(dx3, dz3);
          if (distance3D <= JUDGMENT_HIT_RADIUS) {
            const dx = BishopBoss.x - Player.x, dy = BishopBoss.y - Player.y;
            const d = Math.hypot(dx, dy) || 1;
            BishopBoss.hurt(entry.damage, dx / d, dy / d, 120);
            landedHit = true;
          }
        }
        // A última espada só faz a explosão maior se acertar o Bispo.
        createJudgmentParticles(impact, now, entry.index === 4 && landedHit);
        if (entry.root.parent) entry.root.parent.remove(entry.root);
        if (entry.light.parent) entry.light.parent.remove(entry.light);
        return false;
      }
      if (now - entry.startedAt > 4300) {
        if (entry.root.parent) entry.root.parent.remove(entry.root);
        if (entry.light.parent) entry.light.parent.remove(entry.light);
        return false;
      }
      return true;
    });
    judgmentParticles = judgmentParticles.filter(function (p) {
      const age = now - p.startedAt;
      if (age >= p.life) {
        if (p.mesh.parent) p.mesh.parent.remove(p.mesh);
        return false;
      }
      p.mesh.position.addScaledVector(p.velocity, dt);
      p.velocity.y -= 2.2 * dt;
      p.mesh.scale.setScalar(p.size * (1 - age / p.life * 0.8));
      return true;
    });
    if (judgmentCastActive && !judgmentSwords.length && !judgmentParticles.length) {
      judgmentCastActive = false;
      window.BibliaCelestialDiagnostics = 'Julgamento Celestial concluído';
    }
  }

  function summonJudgment() {
    const now = performance.now();
    if (!started || !swordTemplate || now - judgmentLastCast < JUDGMENT_COOLDOWN_MS) return;
    judgmentLastCast = now;
    launchJudgmentCelestial(now);
  }

  
  // Modificação 83 — Sol dourado animado e explosão divina sem anéis genéricos.
  // Uma única esfera reutilizável, explosão leve e crater visual para manter bom desempenho no celular.
  let sunOrb = null;
  let sunHalo = null;
  let sunLight = null;
  let sunFlight = null;
  let sunCrater = null;
  let sunExplosionEffects = [];
  let sunExplosionFlashGeometry = null;
  let sunDebrisGeometry = null;
  let sunSparkGeometry = null;
  let sunBurnFlameGeometry = null;
  let sunBurnEffects = [];
  let sunBurnStatus = null;
  let sunButtonBound = false;
  let sunOrbGeometry = null;
  let sunOrbMaterial = null;
  let sunHaloGeometry = null;
  let sunHaloMaterial = null;
  let sunCraterGeometry = null;
  let sunCraterMaterial = null;
  let sunCraterRingGeometry = null;
  let sunCraterRingMaterial = null;

  function ensureSunAssets() {
    const THREE = api.THREE;
    if (!sunOrbGeometry) sunOrbGeometry = new THREE.SphereGeometry(2.1, 16, 14);
    if (!sunOrbMaterial) sunOrbMaterial = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: 'varying vec3 vSunPos; void main(){vSunPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader: 'precision mediump float; uniform float uTime; varying vec3 vSunPos; void main(){vec3 p=normalize(vSunPos);float a=sin(p.x*13.0+p.y*8.0+uTime*1.5)*sin(p.z*11.0-p.y*9.0-uTime*1.1);float b=sin(p.y*24.0+p.x*7.0+uTime*0.8)*cos(p.z*19.0-uTime*1.3);float fire=clamp(0.52+0.24*a+0.18*b,0.0,1.0);vec3 deep=vec3(0.72,0.055,0.004);vec3 orange=vec3(1.0,0.22,0.008);vec3 gold=vec3(1.0,0.61,0.025);vec3 hot=vec3(1.0,0.86,0.19);vec3 c=mix(deep,orange,smoothstep(0.0,0.43,fire));c=mix(c,gold,smoothstep(0.35,0.76,fire));c=mix(c,hot,smoothstep(0.72,0.96,fire)*0.68);float limb=0.78+0.22*max(0.0,p.y*0.4+0.6);gl_FragColor=vec4(c*limb,1.0);}'
    });
    if (!sunHaloGeometry) sunHaloGeometry = new THREE.TorusGeometry(2.55, 0.11, 6, 36);
    if (!sunHaloMaterial) sunHaloMaterial = new THREE.MeshBasicMaterial({
      color: 0xffd84a, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    if (!sunCraterGeometry) sunCraterGeometry = new THREE.CircleGeometry(1.8, 24);
    if (!sunCraterMaterial) sunCraterMaterial = new THREE.MeshBasicMaterial({
      color: 0x24190c, transparent: true, opacity: 0.82, depthWrite: false
    });
    if (!sunCraterRingGeometry) sunCraterRingGeometry = new THREE.TorusGeometry(1.84, 0.075, 5, 32);
    if (!sunCraterRingMaterial) sunCraterRingMaterial = new THREE.MeshBasicMaterial({
      color: 0xffc928, transparent: true, opacity: 0.8,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    if (!sunOrb) {
      sunOrb = new THREE.Mesh(sunOrbGeometry, sunOrbMaterial);
      sunOrb.name = 'SolDaJustica_Orb';
      sunHalo = new THREE.Mesh(sunHaloGeometry, sunHaloMaterial);
      sunHalo.name = 'SolDaJustica_Corona';
      sunOrb.add(sunHalo);
      sunLight = new THREE.PointLight(0xff9b18, 4.8, 12);
      sunOrb.add(sunLight);
      sunOrb.visible = false;
      api.scene.add(sunOrb);
    }
  }

  function currentSunTarget(origin) {
    const THREE = api.THREE;
    if (typeof BishopBoss !== 'undefined' && typeof BishopDimension !== 'undefined' &&
        BishopDimension.isBattleActive() && BishopBoss.state !== 'inactive' &&
        BishopBoss.state !== 'dead' && Number.isFinite(BishopBoss.x) &&
        Number.isFinite(BishopBoss.y) && typeof Casino !== 'undefined' && Casino.room) {
      const cx = (Casino.room.left + Casino.room.right) / 2;
      const cy = (Casino.room.top + Casino.room.bottom) / 2;
      return new THREE.Vector3((BishopBoss.x - cx) / 72, 0.12, (BishopBoss.y - cy) / 72);
    }
    const view = window.PlayerModelView;
    const yaw = Number(view && view.yaw) || 0;
    return origin.clone().add(new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).multiplyScalar(4.5));
  }

  function makeSunCrater(position, now) {
    const THREE = api.THREE;
    if (sunCrater && sunCrater.parent) api.scene.remove(sunCrater);
    sunCrater = new THREE.Group();
    sunCrater.name = 'SolDaJustica_Cratera';
    const ground = new THREE.Mesh(sunCraterGeometry, sunCraterMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0.025;
    const ring = new THREE.Mesh(sunCraterRingGeometry, sunCraterRingMaterial);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.045;
    sunCrater.add(ground, ring);
    sunCrater.position.set(position.x, 0, position.z);
    sunCrater.userData.createdAt = now;
    api.scene.add(sunCrater);
  }

  let sunImpactWaves = [];
  let sunTemporaryTerrain = [];
  let sunWaveGeometry = null;
  let sunWaveMaterial = null;

  function damageNearbyVegetation(position, now) {
    const THREE = api.THREE;
    const trees = [];
    const grass = [];
    api.scene.traverse(function (obj) {
      if (obj === api.scene || !obj.visible || !obj.name || obj.userData.sunTemporarilyHidden) return;
      const tree = /(tree|arvore|árvore|trunk|pine)/i.test(obj.name);
      const lawn = /(grass|grama|tuft|groundcover|smallplant)/i.test(obj.name);
      if (!tree && !lawn) return;
      if (obj.parent && obj.parent !== api.scene && obj.parent.name && /(tree|arvore|árvore|trunk|pine)/i.test(obj.parent.name)) return;
      const world = new THREE.Vector3();
      obj.getWorldPosition(world);
      const distance = Math.hypot(world.x - position.x, world.z - position.z);
      if (tree && distance < 4.6) trees.push({ obj: obj, distance: distance });
      if (lawn && distance < 3.4) grass.push({ obj: obj, distance: distance });
    });
    trees.sort(function (a, b) { return a.distance - b.distance; });
    grass.sort(function (a, b) { return a.distance - b.distance; });
    trees.slice(0, 3).forEach(function (item) {
      item.obj.userData.sunTemporarilyHidden = true;
      item.obj.visible = false;
      sunTemporaryTerrain.push({ obj: item.obj, restoreAt: now + 18000 });
    });
    grass.slice(0, 18).forEach(function (item) {
      item.obj.userData.sunTemporarilyHidden = true;
      item.obj.visible = false;
      sunTemporaryTerrain.push({ obj: item.obj, restoreAt: now + 6000 });
    });
  }

  function createSunImpactWaves(position, now) {
    const THREE = api.THREE;
    if (!sunWaveGeometry) sunWaveGeometry = new THREE.TorusGeometry(1, 0.07, 5, 32);
    if (!sunWaveMaterial) sunWaveMaterial = new THREE.MeshBasicMaterial({
      color: 0xffe66b, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    for (let i = 0; i < 3; i++) {
      const mesh = new THREE.Mesh(sunWaveGeometry, sunWaveMaterial);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(position.x, 0.09 + i * 0.025, position.z);
      mesh.scale.setScalar(0.22 + i * 0.08);
      api.scene.add(mesh);
      sunImpactWaves.push({ mesh: mesh, startedAt: now + i * 95, life: 720, base: 0.22 + i * 0.08 });
    }
  }

  function updateSunImpactWaves(now) {
    sunImpactWaves = sunImpactWaves.filter(function (wave) {
      const age = now - wave.startedAt;
      if (age < 0) return true;
      if (age >= wave.life) {
        if (wave.mesh.parent) wave.mesh.parent.remove(wave.mesh);
        return false;
      }
      const p = age / wave.life;
      wave.mesh.scale.setScalar(wave.base + p * 2.15);
      wave.mesh.material.opacity = (1 - p) * 0.9;
      return true;
    });
    sunTemporaryTerrain = sunTemporaryTerrain.filter(function (item) {
      if (now < item.restoreAt) return true;
      item.obj.visible = true;
      delete item.obj.userData.sunTemporarilyHidden;
      return false;
    });
  }

  function createSunExplosion(position, now) {
    const THREE=api.THREE;
    if(!sunExplosionFlashGeometry)sunExplosionFlashGeometry=new THREE.SphereGeometry(1,10,8);
    if(!sunDebrisGeometry)sunDebrisGeometry=new THREE.ConeGeometry(.11,.72,5,1);
    if(!sunSparkGeometry)sunSparkGeometry=new THREE.SphereGeometry(.065,5,4);
    const flash=new THREE.Mesh(sunExplosionFlashGeometry,new THREE.MeshBasicMaterial({color:0xffa51e,transparent:true,opacity:.92,blending:THREE.AdditiveBlending,depthWrite:false}));
    flash.position.set(position.x,.65,position.z);flash.scale.setScalar(.35);api.scene.add(flash);
    sunExplosionEffects.push({mesh:flash,kind:'flash',startedAt:now,life:440,base:2.9});
    for(let i=0;i<14;i++){
      const angle=(i/14)*Math.PI*2+(Math.random()-.5)*.22,speed=2.1+Math.random()*3.8;
      const mesh=new THREE.Mesh(sunDebrisGeometry,new THREE.MeshBasicMaterial({color:i%3===0?0xffd65a:0xff7410,transparent:true,opacity:1,blending:THREE.AdditiveBlending,depthWrite:false}));
      mesh.position.set(position.x+Math.cos(angle)*.24,.18+Math.random()*.45,position.z+Math.sin(angle)*.24);
      mesh.rotation.set(Math.random()*2,Math.random()*2,angle);api.scene.add(mesh);
      sunExplosionEffects.push({mesh:mesh,kind:'shard',startedAt:now,life:520+Math.random()*260,vx:Math.cos(angle)*speed,vz:Math.sin(angle)*speed,vy:1.8+Math.random()*3.1,spin:(Math.random()-.5)*9});
    }
    for(let i=0;i<10;i++){
      const angle=Math.random()*Math.PI*2,speed=1.4+Math.random()*3.2;
      const mesh=new THREE.Mesh(sunSparkGeometry,new THREE.MeshBasicMaterial({color:0xffe18a,transparent:true,opacity:1,blending:THREE.AdditiveBlending,depthWrite:false}));
      mesh.position.set(position.x,.22+Math.random()*.35,position.z);api.scene.add(mesh);
      sunExplosionEffects.push({mesh:mesh,kind:'spark',startedAt:now,life:380+Math.random()*260,vx:Math.cos(angle)*speed,vz:Math.sin(angle)*speed,vy:1.4+Math.random()*3.6});
    }
    if(typeof BishopDimension!=='undefined'&&typeof BishopDimension.impact==='function')BishopDimension.impact(1.15);
  }
  function updateSunExplosionEffects(now,dt) {
    sunExplosionEffects=sunExplosionEffects.filter(function(e){
      const age=now-e.startedAt,p=age/e.life;
      if(p>=1){if(e.mesh.parent)e.mesh.parent.remove(e.mesh);if(e.mesh.material&&e.mesh.material.dispose)e.mesh.material.dispose();return false;}
      if(e.kind==='flash'){e.mesh.scale.setScalar(.35+p*e.base);e.mesh.material.opacity=(1-p)*.92;}
      else{
        e.mesh.position.x+=e.vx*dt;e.mesh.position.z+=e.vz*dt;e.mesh.position.y+=e.vy*dt;
        e.vy-=9.2*dt;e.mesh.rotation.x+=dt*(e.spin||3);e.mesh.rotation.z+=dt*3;
        e.mesh.material.opacity=1-p;if(e.kind==='spark')e.mesh.scale.setScalar(1-p*.72);
      }
      return true;
    });
  }
  function castSunOfJustice() {
    const now = performance.now();
    if (!started || !api || !api.THREE || !window.PlayerModelView ||
        !Array.isArray(window.PlayerModelView.position) || sunFlight) return;
    const view = window.PlayerModelView;
    const origin = new api.THREE.Vector3(view.position[0], view.position[1] + 4.8, view.position[2]);
    const target = currentSunTarget(origin);
    target.y = 0.12;
    ensureSunAssets();
    origin.y += 0.75;
    sunOrb.position.copy(origin);
    sunOrb.visible = true;
    sunHalo.rotation.z = 0;
    sunFlight = { start: origin.clone(), target: target, startedAt: now, holdDuration: 2450, duration: 1250 };
    sunLastCast = now;
    window.BibliaCelestialDiagnostics = 'Sol da Justiça invocado';
  }

  function updateSunOfJustice(now, dt) {
    updateSunImpactWaves(now);
    updateSunExplosionEffects(now, Math.min(.05, Math.max(0, dt || 0)));
    updateSunBurn(now, dt);
    if (!sunOrb || !sunFlight) {
      if (sunCrater && now - sunCrater.userData.createdAt > 5200) {
        api.scene.remove(sunCrater);
        sunCrater = null;
      }
      return;
    }
    const elapsed = now - sunFlight.startedAt;
    const liveTarget = currentSunTarget(sunFlight.start);
    if (elapsed >= sunFlight.holdDuration && elapsed < sunFlight.holdDuration + 850) {
      sunFlight.target.lerp(liveTarget, Math.min(1, dt * 3.2));
    }
    const descentElapsed = elapsed - sunFlight.holdDuration;
    const p = Math.max(0, Math.min(1, descentElapsed / sunFlight.duration));
    const eased = p * p * (3 - 2 * p);
    if (descentElapsed < 0) {
      sunOrb.position.copy(sunFlight.start);
      sunOrb.position.y += Math.sin(now * 0.0035) * 0.12;
    } else {
      sunOrb.position.lerpVectors(sunFlight.start, sunFlight.target, eased);
      sunOrb.position.y += Math.sin(now * 0.008) * 0.045;
    }
    sunHalo.rotation.z += dt * 2.5;
    const pulse = 1 + Math.sin(now * 0.018) * 0.07;
    sunOrb.scale.setScalar(pulse);
    if(sunOrbMaterial&&sunOrbMaterial.uniforms&&sunOrbMaterial.uniforms.uTime)sunOrbMaterial.uniforms.uTime.value=now*.001;
    sunLight.intensity = 4.0 + Math.sin(now * 0.02) * 0.45;
    if (descentElapsed < sunFlight.duration) return;

    const impact = sunFlight.target.clone();
    impact.y = 0.08;
    let landedHit = false;
    if (typeof BishopBoss !== 'undefined' && BishopBoss.profile &&
        BishopBoss.state !== 'inactive' && BishopBoss.state !== 'dead' && typeof Casino !== 'undefined' && Casino.room) {
      const cx = (Casino.room.left + Casino.room.right) / 2;
      const cy = (Casino.room.top + Casino.room.bottom) / 2;
      const bx = (BishopBoss.x - cx) / 72;
      const bz = (BishopBoss.y - cy) / 72;
      if (Math.hypot(impact.x - bx, impact.z - bz) <= 5.2) {
        const dx = BishopBoss.x - Player.x, dy = BishopBoss.y - Player.y;
        const d = Math.hypot(dx, dy) || 1;
        BishopBoss.hurt(42, dx / d, dy / d, 120);
        startSunBurn(bx, bz, now);
        landedHit = true;
      }
    }
    createSunExplosion(impact, now);
    damageNearbyVegetation(impact, now);
    if(typeof BishopDimension!=='undefined'&&typeof BishopDimension.damageVegetation==='function'){
      BishopDimension.damageVegetation(impact.x, impact.z, 4.6);
    }
    sunOrb.visible = false;
    sunFlight = null;
    window.BibliaCelestialDiagnostics = landedHit ? 'Sol da Justiça acertou o alvo' : 'Sol da Justiça atingiu o solo';
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
    const sunButton = document.getElementById('btn-magic3');
    if (sunButton && !sunButtonBound) {
      sunButtonBound = true;
      sunButton.style.touchAction = 'none';
      sunButton.addEventListener('pointerdown', function (event) {
        event.preventDefault();
        summon('sun');
      }, { passive: false });
      sunButton.addEventListener('click', function(){ summon('sun'); });
    }
    const judgmentButton = document.getElementById('btn-magic2');
    if (judgmentButton && !judgmentButtonBound) {
      judgmentButtonBound = true;
      judgmentButton.style.touchAction = 'none';
      judgmentButton.addEventListener('pointerdown', function (event) {
        event.preventDefault();
        summon('judgment');
      }, { passive: false });
      judgmentButton.addEventListener('click', function(){ summon('judgment'); });
    }
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
    updateJudgment(now, dt);
    updateSunOfJustice(now, dt);
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
        if (pendingBookSpell === 'judgment') summonJudgment();
        else if (pendingBookSpell === 'sun') castSunOfJustice();
        else launchCelestialSwords(view, now);
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