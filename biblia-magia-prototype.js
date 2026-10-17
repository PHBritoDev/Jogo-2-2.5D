/* Mod 91 — Julgamento Divino 3D, alcance e câmera cinematográfica.
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
  const ARENA_PIXELS_PER_UNIT = 72;
  const ULTIMATE_SWORD_LENGTH = 14.5;
  const ULTIMATE_GROUND_CLEARANCE = 0.10;
  const ULTIMATE_CAMERA_FLOOR_Y = 0.08;
  const VALERIO_PROTAGONIST_HEIGHT = 2.15;
  const ULTIMATE_FALL_CAMERA_MIN_DISTANCE =
    (ULTIMATE_SWORD_LENGTH + ULTIMATE_GROUND_CLEARANCE - ULTIMATE_CAMERA_FLOOR_Y) /
    (2 * Math.tan(1.02 * 0.5) * 0.82);
  // A entrada da dimensão posiciona o jogador a 202 px do Bispo (202 / 72 = 2,81 u).
  // O máximo deriva do enquadramento calculado para a queda: deixa ao menos uma altura
  // do protagonista entre ele e a câmera quando ela está no ponto mais próximo do Bispo.
  const ULTIMATE_MIN_CAST_DISTANCE = 202 / ARENA_PIXELS_PER_UNIT;
  const ULTIMATE_MAX_CAST_DISTANCE = Math.floor((ULTIMATE_FALL_CAMERA_MIN_DISTANCE - VALERIO_PROTAGONIST_HEIGHT) * 10) / 10;
  const ULTIMATE_BOOK_OPEN_DELAY_MS = 1350;
  const ULTIMATE_BOOK_REVEAL_MS = 1100;
  const ULTIMATE_LOOK_SKY_MS = 2350;
  const ULTIMATE_STORM_DURATION_MS = 4100;
  const ULTIMATE_STORM_BUILD_MS = 1900;
  const ULTIMATE_PORTAL_OPEN_MS = 1250;
  const ULTIMATE_PORTAL_DURATION_MS = 3100;
  const ULTIMATE_SWORD_EMERGE_MS = 2600;
  const ULTIMATE_FALL_SETUP_MS = 650;
  const ULTIMATE_SWORD_FALL_MS = 3900;
  const ULTIMATE_IMPACT_HOLD_MS = 1650;
  const ULTIMATE_CAMERA_RETURN_MS = 1200;

  function classifyUltimateDistance(distance) {
    if (!Number.isFinite(distance)) return 'invalid';
    if (distance < ULTIMATE_MIN_CAST_DISTANCE) return 'too-close';
    if (distance > ULTIMATE_MAX_CAST_DISTANCE) return 'too-far';
    return 'in-range';
  }
  function reportUltimateBlock(message) {
    window.BibliaCelestialDiagnostics=message;
    if(typeof Quest!=='undefined'&&Quest&&typeof Quest.toast==='function')Quest.toast(message,3);
    return false;
  }
  function setUltimateBibleFade(alpha) {
    if(!group||typeof group.traverse!=='function')return;
    const value=Math.max(0,Math.min(1,alpha));
    group.traverse(function(obj){
      if(!obj.material)return;
      const materials=Array.isArray(obj.material)?obj.material:[obj.material];
      materials.forEach(function(material){
        if(!material)return;
        if(!material.userData.ultimateBibleFade)material.userData.ultimateBibleFade={opacity:material.opacity,transparent:material.transparent,depthWrite:material.depthWrite};
        const original=material.userData.ultimateBibleFade;
        material.opacity=original.opacity*value;
        material.transparent=original.transparent||value<.999;
        material.depthWrite=value<.999?false:original.depthWrite;
        material.needsUpdate=true;
      });
    });
    if(value<=0){
      group.traverse(function(obj){
        if(!obj.material)return;
        const materials=Array.isArray(obj.material)?obj.material:[obj.material];
        materials.forEach(function(material){
          const original=material&&material.userData&&material.userData.ultimateBibleFade;
          if(!original)return;
          material.opacity=original.opacity;material.transparent=original.transparent;material.depthWrite=original.depthWrite;
          delete material.userData.ultimateBibleFade;material.needsUpdate=true;
        });
      });
      group.visible=false;
    }
  }

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
    // MOD 125: sem aros dourados/brancos pequenos; energia em lâminas escarlates.
    goldRing = new THREE.Mesh(
      new THREE.BoxGeometry(0.045, 1.18, 0.025),
      new THREE.MeshBasicMaterial({ color: 0x100006, transparent: true, opacity: 0.9, depthWrite: false })
    );
    whiteRing = new THREE.Mesh(
      new THREE.BoxGeometry(0.022, 0.94, 0.03),
      new THREE.MeshBasicMaterial({ color: 0xff1238, transparent: true, opacity: 0.86, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    goldRing.position.z = -0.045;
    whiteRing.position.z = -0.035;
    whiteRing.rotation.z = Math.PI / 4;
    group.add(goldRing, whiteRing);

    flash = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xff1238, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    group.add(flash);
    bookGlowLight = new THREE.PointLight(0xff1238, 0, 4.8);
    bookGlowLight.position.set(0, 0.02, 0.18);
    group.add(bookGlowLight);
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
    // Uma conjuração por vez: impede que toques rápidos substituam a magia pendente enquanto o grimório abre.
    if (castRequested || opening || opened || stamp - lastSummonInput < 280 || (lastSpellCast && stamp - lastSpellCast < 2800)) return;
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
  const celestialImpactPool = [];
  const CELESTIAL_IMPACT_POOL_SIZE = 4;
  let celestialImpactCursor = 0;
  let celestialImpactRingGeometry = null;
  let celestialImpactFlashGeometry = null;
  let celestialImpactLight = null;
  let celestialImpactLightAt = 0;
  let celestialImpactLightStrength = 0;
  let lastCelestialImpactSoundAt = -Infinity;

  function ensureCelestialImpactPool() {
    if (!api || !api.scene || !api.THREE || celestialImpactPool.length) return;
    const THREE = api.THREE;
    celestialImpactRingGeometry = new THREE.TorusGeometry(0.42, 0.045, 5, 28);
    celestialImpactFlashGeometry = new THREE.SphereGeometry(0.34, 8, 6);
    for (let i = 0; i < CELESTIAL_IMPACT_POOL_SIZE; i++) {
      const root = new THREE.Group();
      root.name = 'ImpactoCelestial3D_' + i;
      root.visible = false;
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0xffd85b, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false
      });
      const innerMaterial = new THREE.MeshBasicMaterial({
        color: 0xfff6d5, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false
      });
      const flashMaterial = new THREE.MeshBasicMaterial({
        color: 0xffe9a1, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false
      });
      const ring = new THREE.Mesh(celestialImpactRingGeometry, ringMaterial);
      const inner = new THREE.Mesh(celestialImpactRingGeometry, innerMaterial);
      ring.rotation.x = inner.rotation.x = -Math.PI / 2;
      inner.position.y = 0.018;
      const flash = new THREE.Mesh(celestialImpactFlashGeometry, flashMaterial);
      flash.position.y = 0.28;
      root.add(ring, inner, flash);
      api.scene.add(root);
      celestialImpactPool.push({ root: root, ring: ring, inner: inner, flash: flash, startedAt: 0, life: 440, strength: 1 });
    }
    celestialImpactLight = new THREE.PointLight(0xffd56a, 0, 4.5, 2);
    celestialImpactLight.name = 'ImpactoCelestialLuz';
    celestialImpactLight.castShadow = false;
    api.scene.add(celestialImpactLight);
  }

  function showCelestialImpact(position, now, color, strong) {
    ensureCelestialImpactPool();
    if (!celestialImpactPool.length || !position) return;
    const effect = celestialImpactPool[celestialImpactCursor++ % celestialImpactPool.length];
    effect.root.position.copy(position);
    effect.root.position.y = Math.max(0.08, Number(position.y) || 0);
    effect.root.visible = true;
    effect.startedAt = now;
    effect.life = strong ? 540 : 430;
    effect.strength = strong ? 1.35 : 1;
    effect.ring.material.color.setHex(color || 0xffd85b);
    effect.inner.material.color.setHex(0xfff6d5);
    effect.flash.material.color.setHex(color || 0xffe9a1);
    effect.ring.material.opacity = 0.92;
    effect.inner.material.opacity = 0.84;
    effect.flash.material.opacity = 0.72;
    effect.ring.scale.setScalar(0.18);
    effect.inner.scale.setScalar(0.12);
    effect.flash.scale.setScalar(0.2);
    if (celestialImpactLight) {
      celestialImpactLight.position.set(position.x, Math.max(0.35, position.y + 0.45), position.z);
      celestialImpactLightAt = now;
      celestialImpactLightStrength = strong ? 3.8 : 2.5;
    }
  }

  function updateCelestialImpacts(now) {
    if (!celestialImpactPool.length) return;
    celestialImpactPool.forEach(function (effect) {
      if (!effect.root.visible) return;
      const progress = Math.max(0, Math.min(1, (now - effect.startedAt) / effect.life));
      if (progress >= 1) {
        effect.root.visible = false;
        return;
      }
      effect.ring.scale.setScalar(0.18 + progress * 2.2 * effect.strength);
      effect.inner.scale.setScalar(0.12 + progress * 1.55 * effect.strength);
      effect.flash.scale.setScalar(0.2 + progress * 0.9 * effect.strength);
      effect.ring.material.opacity = (1 - progress) * 0.92;
      effect.inner.material.opacity = (1 - progress) * 0.82;
      effect.flash.material.opacity = (1 - progress) * 0.7;
    });
    if (celestialImpactLight) {
      const progress = Math.max(0, Math.min(1, (now - celestialImpactLightAt) / 380));
      celestialImpactLight.intensity = celestialImpactLightStrength * (1 - progress);
    }
  }

  function damageBishopWithCelestialPower(damage, dx, dy, knockback, position, now, color, strong) {
    if (typeof BishopBoss === 'undefined' || !BishopBoss.profile ||
        BishopBoss.state === 'inactive' || BishopBoss.state === 'dead' || !(BishopBoss.hp > 0)) return false;
    const before = Number(BishopBoss.hp);
    const length = Math.hypot(dx, dy) || 1;
    BishopBoss.hurt(damage, dx / length, dy / length, knockback);
    const confirmed = Number(BishopBoss.hp) < before;
    if (confirmed) {
      showCelestialImpact(position, now, color, strong);
      if (now - lastCelestialImpactSoundAt >= 220 && typeof Sfx !== 'undefined' && Sfx.powerImpact) {
        Sfx.powerImpact(!!strong);
        lastCelestialImpactSoundAt = now;
      }
    }
    return confirmed;
  }

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

  function disposeCelestialClone(root) {
    if (!root) return;
    if (root.parent) root.parent.remove(root);
    root.traverse(function (object) {
      if (!object.material) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach(function (material) {
        if (material && typeof material.dispose === 'function') material.dispose();
      });
    });
  }

  function clearFlyingSwords() {
    if (!api || !api.scene) return;
    flyingSwords.forEach(function (entry) {
      disposeCelestialClone(entry.root);
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
    if (typeof Sfx !== 'undefined' && Sfx.powerCast) Sfx.powerCast('swords');
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
      if (entry.bossTarget && typeof BishopBoss !== 'undefined' && BishopBoss.profile &&
          BishopBoss.profile.id === 'bishop1' && BishopBoss.state !== 'inactive' && BishopBoss.state !== 'dead' &&
          typeof Casino !== 'undefined' && Casino.room) {
        const cxThreat=(Casino.room.left+Casino.room.right)/2,cyThreat=(Casino.room.top+Casino.room.bottom)/2;
        const bxThreat=(BishopBoss.x-cxThreat)/72,bzThreat=(BishopBoss.y-cyThreat)/72;
        const threatDistance=Math.hypot(entry.root.position.x-bxThreat,entry.root.position.z-bzThreat);
        if(threatDistance<3.6&&BishopBoss.magicCutCooldown<=0&&['approach','recover','breather'].includes(BishopBoss.state)){
          BishopBoss.magicThreatT=.58;BishopBoss.magicThreatX=entry.root.position.x*72+cxThreat;BishopBoss.magicThreatY=entry.root.position.z*72+cyThreat;
        }
        if(!entry.hit&&window.ValerioMagicCutActive&&threatDistance<1.18){
          entry.hit=true;Ambient.spawnSpark(BishopBoss.x,BishopBoss.y-25,9,'#d8dfff');Ambient.spawnSpark(BishopBoss.x,BishopBoss.y-25,4,'#ffffff');
          if(typeof Sfx!=='undefined'&&Sfx.block)Sfx.block();
          window.BibliaCelestialDiagnostics='Valério cortou uma Espada Celestial com a foice';
          disposeCelestialClone(entry.root);if(entry.light.parent)entry.light.parent.remove(entry.light);return false;
        }
      }
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
          const confirmed = damageBishopWithCelestialPower(
            entry.damage, dx, dy, 145, entry.root.position, now, 0xffd34d, false
          );
          window.BibliaCelestialDiagnostics = confirmed
            ? 'Espada Celestial acertou: ' + entry.damage + ' de dano'
            : 'Espada Celestial foi repelida';
          disposeCelestialClone(entry.root);
          if (entry.light.parent) entry.light.parent.remove(entry.light);
          return false;
        }
      }
      if (now - entry.startedAt > 4200 ||
          entry.root.position.distanceTo(new THREE.Vector3(entry.root.userData.startX, entry.root.userData.startY, entry.root.userData.startZ)) > 8) {
        disposeCelestialClone(entry.root);
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
      disposeCelestialClone(entry.root);
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
    if (typeof Sfx !== 'undefined' && Sfx.powerCast) Sfx.powerCast('judgment');
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
            landedHit = damageBishopWithCelestialPower(
              entry.damage, dx, dy, 120, impact, now, 0xffe267, false
            );
          }
        }
        // A última espada só faz a explosão maior se acertar o Bispo.
        createJudgmentParticles(impact, now, entry.index === 4 && landedHit);
        disposeCelestialClone(entry.root);
        if (entry.light.parent) entry.light.parent.remove(entry.light);
        return false;
      }
      if (now - entry.startedAt > 4300) {
        disposeCelestialClone(entry.root);
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
  let ultimateButtonBound = false;
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
    if (typeof BishopBoss !== 'undefined' && BishopBoss.profile &&
        BishopBoss.state !== 'inactive' && BishopBoss.state !== 'dead' &&
        Number.isFinite(BishopBoss.x) && Number.isFinite(BishopBoss.y) &&
        typeof Casino !== 'undefined' && Casino.room) {
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
  function startSunBurn(x,z,now) {
    if(!api||!api.scene||!api.THREE)return;
    const THREE=api.THREE;
    if(!sunBurnFlameGeometry)sunBurnFlameGeometry=new THREE.SphereGeometry(1,10,8);
    if(sunBurnStatus&&sunBurnStatus.flames){
      sunBurnStatus.flames.forEach(function(f){
        if(f.mesh.parent)f.mesh.parent.remove(f.mesh);
        f.mesh.traverse(function(child){if(child.material)child.material.dispose();});
      });
    }
    const flames=[];
    // Chamas macias em camadas, sem cones pontudos. Cada grupo acompanha a posição do Bispo.
    for(let i=0;i<9;i++){
      const angle=(i/9)*Math.PI*2,rad=.30+(i%3)*.12;
      const group=new THREE.Group();
      const outerMat=new THREE.MeshBasicMaterial({
        color:i%3===0?0xffc044:(i%2===0?0xff6818:0xe93608),
        transparent:true,opacity:.68,blending:THREE.AdditiveBlending,depthWrite:false
      });
      const innerMat=new THREE.MeshBasicMaterial({
        color:i%3===0?0xffffb0:0xffb52e,
        transparent:true,opacity:.72,blending:THREE.AdditiveBlending,depthWrite:false
      });
      const outer=new THREE.Mesh(sunBurnFlameGeometry,outerMat);
      outer.scale.set(.15,.42,.13);
      const inner=new THREE.Mesh(sunBurnFlameGeometry,innerMat);
      inner.position.y=-.045;
      inner.scale.set(.075,.24,.075);
      group.add(outer,inner);
      group.position.set(x+Math.cos(angle)*rad,.82+(i%4)*.36,z+Math.sin(angle)*rad);
      api.scene.add(group);
      flames.push({mesh:group,angle,rad,baseY:group.position.y,phase:Math.random()*6.28,outer:outer,inner:inner});
    }
    sunBurnStatus={x:x,z:z,until:now+4500,nextTickAt:now+850,flames:flames};
    window.BibliaCelestialDiagnostics='Valério em chamas: efeito suave preso ao Bispo';
  }
  function updateSunBurn(now,dt) {
    if(!sunBurnStatus)return;
    const burn=sunBurnStatus;
    if(now>=burn.until){
      burn.flames.forEach(function(f){
        if(f.mesh.parent)f.mesh.parent.remove(f.mesh);
        f.mesh.traverse(function(child){if(child.material)child.material.dispose();});
      });
      sunBurnStatus=null;return;
    }
    // Recalcula a posição do Bispo a cada quadro para o fogo não ficar abandonado no chão.
    if(typeof BishopBoss!=='undefined'&&BishopBoss.profile&&typeof Casino!=='undefined'&&Casino.room){
      const cx=(Casino.room.left+Casino.room.right)/2;
      const cy=(Casino.room.top+Casino.room.bottom)/2;
      burn.x=(BishopBoss.x-cx)/72;
      burn.z=(BishopBoss.y-cy)/72;
    }
    burn.flames.forEach(function(f){
      const wobble=Math.sin(now*.010+f.phase);
      f.mesh.position.x=burn.x+Math.cos(f.angle+now*.00055)*f.rad;
      f.mesh.position.z=burn.z+Math.sin(f.angle+now*.00055)*f.rad;
      f.mesh.position.y=f.baseY+wobble*.09;
      f.mesh.rotation.y=Math.sin(now*.002+f.phase)*.24;
      f.outer.scale.set(.13+Math.abs(wobble)*.025,.34+Math.abs(wobble)*.20,.12+Math.abs(wobble)*.02);
      f.inner.scale.set(.065,.19+Math.abs(wobble)*.10,.065);
      f.outer.material.opacity=.46+Math.abs(wobble)*.22;
      f.inner.material.opacity=.48+Math.abs(wobble)*.25;
    });
    if(now>=burn.nextTickAt){
      burn.nextTickAt=now+900;
      if(typeof BishopBoss!=='undefined'&&BishopBoss.profile&&BishopBoss.state!=='dead'&&BishopBoss.state!=='inactive'){
        if(typeof BishopBoss.burnDamage==='function')BishopBoss.burnDamage(5);
        else BishopBoss.hurt(4,0,0,0);
      }
    }
  }

  // Mod 91 — câmera enquadrada pela lâmina, portal frontal e limpeza controlada da tempestade.
  const judgmentUltimate = {active:false,stage:'',stageAt:0,startedAt:0,root:null,clouds:[],cloudMaterial:null,rain:null,lightning:null,portal:null,portalSpinner:null,portalMaterials:[],portalFacingYaw:0,sword:null,swordLength:ULTIMATE_SWORD_LENGTH,swordLight:null,flashLight:null,stormFog:null,originalSceneFog:null,shockwave:null,flash:null,impactAt:0,lastLightningAt:0,returnEye:null,returnTarget:null,returnStartEye:null,returnStartTarget:null,cameraEye:null,cameraTarget:null,cameraLastAt:0,cameraFov:1.02,originalBossUpdate:null,walkYaw:0,damageDone:false};
  let bookGlowLight = null;
  function ultimateBossPoint() {
    const THREE=api.THREE;
    const bossAlive=typeof BishopBoss!=='undefined'&&typeof BishopDimension!=='undefined'&&BishopDimension.isBattleActive()&&BishopBoss.state!=='inactive'&&BishopBoss.state!=='dead'&&Number.isFinite(BishopBoss.x)&&Number.isFinite(BishopBoss.y);
    if(!bossAlive||typeof Casino==='undefined'||!Casino.room)return null;
    const cx=(Casino.room.left+Casino.room.right)/2,cy=(Casino.room.top+Casino.room.bottom)/2;
    return new THREE.Vector3((BishopBoss.x-cx)/72,0.08,(BishopBoss.y-cy)/72);
  }
  function setUltimateCamera(now) {
    const state=judgmentUltimate, view=window.PlayerModelView, THREE=api.THREE, normal=window.ValerioModelView;
    if(!state.active)return;
    let eye,target,fov=0.92;
    const player=view&&Array.isArray(view.position)?new THREE.Vector3(view.position[0],view.position[1],view.position[2]):new THREE.Vector3(0,0,0);
    const yaw=Number(view&&view.yaw)||0,forward=new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw));
    const boss=ultimateBossPoint()||player.clone().addScaledVector(forward,5);
    const shotAxis=player.clone().sub(boss);shotAxis.y=0;
    if(shotAxis.lengthSq()<0.0001)shotAxis.copy(forward);
    shotAxis.normalize();
    const shotSide=new THREE.Vector3(-shotAxis.z,0,shotAxis.x);
    if(state.stage==='book'){
      eye=player.clone().addScaledVector(forward,-5.4).add(new THREE.Vector3(0,2.55,0));target=player.clone().add(new THREE.Vector3(0,1.25,0));fov=1.04;
    }else if(state.stage==='bookReveal'){
      eye=player.clone().addScaledVector(forward,-5.4).add(new THREE.Vector3(0,2.55,0));target=player.clone().add(new THREE.Vector3(0,1.25,0));fov=1.04;
    }else if(state.stage==='lookSky'){
      eye=player.clone().addScaledVector(forward,-5.8).add(new THREE.Vector3(0,3.0,0));
      target=player.clone().add(new THREE.Vector3(0,8.5,0));fov=1.02;
    }else if(state.stage==='storm'||state.stage==='portal'){
      // A câmera mantém o lado do jogador e enquadra o portal voltado para ele.
      eye=boss.clone().addScaledVector(shotAxis,19.5).addScaledVector(shotSide,2.4).add(new THREE.Vector3(0,16.3,0));
      target=boss.clone().add(new THREE.Vector3(0,11.8,0));fov=1.08;
    }else if(state.stage==='emerge'){
      const swordY=state.sword?state.sword.position.y:17.6;
      eye=boss.clone().addScaledVector(shotAxis,16).addScaledVector(shotSide,2).add(new THREE.Vector3(0,swordY+3.4,0));
      target=boss.clone().add(new THREE.Vector3(0,swordY,0));fov=1.05;
    }else if(state.stage==='fallSetup'||state.stage==='fall'||state.stage==='impact'){
      // Afasta conforme o comprimento real da espada: ponta e chão permanecem no quadro.
      const halfLength=(Number(state.swordLength)||ULTIMATE_SWORD_LENGTH)*.5;
      const swordY=state.sword?state.sword.position.y:17.6;
      const floorY=ULTIMATE_CAMERA_FLOOR_Y;
      const top=Math.max(4.05,swordY+halfLength);
      const bottom=Math.min(floorY,swordY-halfLength);
      const targetY=(top+bottom)*.5;
      const verticalSpan=Math.max(1,top-bottom);
      const distance=Math.max(14,verticalSpan/(2*Math.tan(1.02*.5)*.82));
      eye=boss.clone().addScaledVector(shotAxis,distance).addScaledVector(shotSide,distance*.12).add(new THREE.Vector3(0,targetY+distance*.16,0));
      target=boss.clone().add(new THREE.Vector3(0,targetY,0));fov=1.02;
      if(state.stage==='impact'){const shake=Math.max(0,1-(now-state.impactAt)/430);eye.x+=Math.sin(now*.12)*.12*shake;eye.y+=Math.cos(now*.16)*.10*shake;}
    }else if(state.stage==='return'){
      const p=Math.max(0,Math.min(1,(now-state.stageAt)/ULTIMATE_CAMERA_RETURN_MS)),e=p*p*(3-2*p);
      const fallbackEye=state.returnStartEye||state.returnEye||player.clone().add(new THREE.Vector3(0,4,9));
      const fallbackTarget=state.returnStartTarget||state.returnTarget||player;
      const ne=normal&&normal.eye?new THREE.Vector3(normal.eye[0],normal.eye[1],normal.eye[2]):fallbackEye;
      const nt=normal&&normal.target?new THREE.Vector3(normal.target[0],normal.target[1],normal.target[2]):fallbackTarget;
      eye=fallbackEye.clone().lerp(ne,e);target=fallbackTarget.clone().lerp(nt,e);fov=.86+(Number(normal&&normal.fov||1.02)-.86)*e;
      if(p>=1){window.CelestialUltimateCamera={active:false};return;}
    }
    if(!eye||!target)return;
    const cameraDt=state.cameraLastAt?Math.min(.05,Math.max(0,(now-state.cameraLastAt)/1000)):0;
    state.cameraLastAt=now;
    if(state.cameraEye&&state.cameraTarget){const blend=1-Math.exp(-cameraDt*2.35);state.cameraEye.lerp(eye,blend);state.cameraTarget.lerp(target,blend);state.cameraFov+=(fov-state.cameraFov)*blend;}
    else{state.cameraEye=eye.clone();state.cameraTarget=target.clone();state.cameraFov=fov;}
    eye=state.cameraEye;target=state.cameraTarget;fov=state.cameraFov;
    window.CelestialUltimateCamera={active:true,eye:[eye.x,eye.y,eye.z],target:[target.x,target.y,target.z],fov:fov};
    state.returnEye=eye.clone();state.returnTarget=target.clone();
  }
  function addUltimateStorm(now) {
    const THREE=api.THREE,root=new THREE.Group();root.name='JulgamentoDivino_Tempestade';api.scene.add(root);judgmentUltimate.root=root;
    const boss=ultimateBossPoint()||new THREE.Vector3(0,0,0);
    judgmentUltimate.originalSceneFog=api.scene.fog;
    judgmentUltimate.stormFog=new THREE.FogExp2(0x182238,0);
    api.scene.fog=judgmentUltimate.stormFog;
    const cloudGeo=new THREE.SphereGeometry(1,8,6),cloudMat=new THREE.MeshBasicMaterial({color:0x111a2b,transparent:true,opacity:0,depthWrite:false});
    judgmentUltimate.cloudMaterial=cloudMat;
    for(let i=0;i<12;i++){const a=i/12*Math.PI*2,rad=6.2+(i%3)*.55;const cloud=new THREE.Mesh(cloudGeo,cloudMat);cloud.position.set(boss.x+Math.cos(a)*rad,13.5+(i%4)*.34,boss.z+Math.sin(a)*rad);cloud.scale.set(1.7+(i%3)*.24,.62+(i%2)*.18,1.45);root.add(cloud);judgmentUltimate.clouds.push({mesh:cloud,angle:a,radius:rad,phase:i*.8});}
    const player=window.PlayerModelView&&Array.isArray(window.PlayerModelView.position)?window.PlayerModelView.position:[boss.x,0,boss.z+1];
    judgmentUltimate.portalFacingYaw=Math.atan2(player[0]-boss.x,player[2]-boss.z);
    const portal=new THREE.Group();portal.name='JulgamentoDivino_PortalCelestial';portal.position.set(boss.x,17.6,boss.z);portal.rotation.y=judgmentUltimate.portalFacingYaw;portal.scale.setScalar(.08);portal.visible=false;root.add(portal);judgmentUltimate.portal=portal;
    const spinner=new THREE.Group();portal.add(spinner);judgmentUltimate.portalSpinner=spinner;
    function portalMaterial(color,opacity){const material=new THREE.MeshBasicMaterial({color:color,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});material.userData.ultimateBaseOpacity=opacity;judgmentUltimate.portalMaterials.push(material);return material;}
    const aperture=new THREE.Mesh(new THREE.CircleGeometry(4.2,48),portalMaterial(0x344a78,.48));aperture.position.z=-.08;spinner.add(aperture);
    spinner.add(new THREE.Mesh(new THREE.TorusGeometry(5.15,.095,8,80),portalMaterial(0xffd66b,.98)));
    spinner.add(new THREE.Mesh(new THREE.TorusGeometry(4.38,.045,7,72),portalMaterial(0xe9f5ff,.88)));
    spinner.add(new THREE.Mesh(new THREE.TorusGeometry(3.4,.025,6,64),portalMaterial(0x84bcff,.66)));
    const runeGeo=new THREE.BoxGeometry(.15,.035,.4),runeMat=portalMaterial(0xffedac,.94),runes=new THREE.InstancedMesh(runeGeo,runeMat,16),runeTransform=new THREE.Object3D();
    for(let i=0;i<16;i++){const a=i*Math.PI/8;runeTransform.position.set(Math.cos(a)*4.78,Math.sin(a)*4.78,0);runeTransform.rotation.set(0,0,a);runeTransform.updateMatrix();runes.setMatrixAt(i,runeTransform.matrix);}
    runes.instanceMatrix.needsUpdate=true;spinner.add(runes);
    const dropCount=112,positions=new Float32Array(dropCount*6);
    for(let i=0;i<dropCount;i++){const x=boss.x+(Math.random()-.5)*19,y=3+Math.random()*18,z=boss.z+(Math.random()-.5)*18;positions[i*6]=x;positions[i*6+1]=y;positions[i*6+2]=z;positions[i*6+3]=x-.035;positions[i*6+4]=y-.24;positions[i*6+5]=z-.025;}
    const rainGeo=new THREE.BufferGeometry();rainGeo.setAttribute('position',new THREE.BufferAttribute(positions,3));rainGeo.attributes.position.setUsage(THREE.DynamicDrawUsage);
    const rain=new THREE.LineSegments(rainGeo,new THREE.LineBasicMaterial({color:0x9ac9f3,transparent:true,opacity:.42,depthWrite:false}));root.add(rain);judgmentUltimate.rain=rain;
    const lightningSegments=24,lightningGeo=new THREE.BufferGeometry();lightningGeo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(lightningSegments*6),3));
    const lightning=new THREE.LineSegments(lightningGeo,new THREE.LineBasicMaterial({color:0xc7eaff,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));lightning.visible=false;root.add(lightning);judgmentUltimate.lightning=lightning;judgmentUltimate.lastLightningAt=now-500;
    const flashLight=new THREE.PointLight(0xadcfff,0,32,2);flashLight.position.set(boss.x,14,boss.z);root.add(flashLight);judgmentUltimate.flashLight=flashLight;
    window.CelestialUltimateStormFactor=0;window.CelestialUltimateLightningFactor=0;
    window.BibliaCelestialDiagnostics='Julgamento Divino: tempestade e portal ativos';
  }
  function createUltimateSword(now) {
    if(!swordTemplate||!judgmentUltimate.root)return;
    const THREE=api.THREE,boss=ultimateBossPoint()||new THREE.Vector3(0,0,0),root=new THREE.Group();root.name='JulgamentoDivino_EspadaColossal';
    const blade=swordTemplate.clone(true);
    blade.traverse(function(obj){if(!obj.isMesh)return;obj.userData.ultimateSharedGeometry=true;obj.castShadow=false;obj.receiveShadow=false;obj.frustumCulled=false;const list=Array.isArray(obj.material)?obj.material:[obj.material];const mats=list.filter(Boolean).map(function(src){const m=src.clone();if(m.emissive){m.emissive.lerp(new THREE.Color(0xffd36b),.22);m.emissiveIntensity=Math.min(1.35,Math.max(.55,Number(m.emissiveIntensity)||.55));}return m;});obj.material=Array.isArray(obj.material)?mats:mats[0];});
    blade.updateMatrixWorld(true);
    const bounds=new THREE.Box3().setFromObject(blade),size=new THREE.Vector3(),center=new THREE.Vector3();bounds.getSize(size);bounds.getCenter(center);const longest=Math.max(size.x,size.y,size.z,.001);
    blade.position.sub(center);root.add(blade);
    const longIndex=size.y>=size.x&&size.y>=size.z?1:(size.x>=size.z?0:2);
    const longAxis=longIndex===1?new THREE.Vector3(0,-1,0):(longIndex===0?new THREE.Vector3(-1,0,0):new THREE.Vector3(0,0,-1));
    const fitScale=ULTIMATE_SWORD_LENGTH/longest,crossScales=[1.35,1.35,1.15];crossScales[longIndex]=1;
    root.quaternion.setFromUnitVectors(longAxis,new THREE.Vector3(0,-1,0));root.scale.set(fitScale*crossScales[0],fitScale*crossScales[1],fitScale*crossScales[2]);
    root.position.set(boss.x,21.5,boss.z);judgmentUltimate.root.add(root);judgmentUltimate.sword=root;
    judgmentUltimate.swordLength=ULTIMATE_SWORD_LENGTH;
    const light=new THREE.PointLight(0xffd66d,3.2,18);light.position.copy(root.position);judgmentUltimate.root.add(light);judgmentUltimate.swordLight=light;
    judgmentUltimate.swordStart=root.position.clone();judgmentUltimate.swordPortalY=17.6;judgmentUltimate.swordTarget=new THREE.Vector3(boss.x,judgmentUltimate.swordLength*.5+ULTIMATE_GROUND_CLEARANCE,boss.z);judgmentUltimate.stage='emerge';judgmentUltimate.stageAt=now;
  }
  function createUltimateImpact(now) {
    const THREE=api.THREE,boss=ultimateBossPoint()||new THREE.Vector3(0,.08,0),state=judgmentUltimate;
    state.impactAt=now;state.stage='impact';state.stageAt=now;if(state.sword)state.sword.visible=false;if(state.swordLight)state.swordLight.intensity=0;
    const flashMesh=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),new THREE.MeshBasicMaterial({color:0xfff6cf,transparent:true,opacity:.96,blending:THREE.AdditiveBlending,depthWrite:false}));flashMesh.position.copy(boss);flashMesh.position.y=1.05;flashMesh.scale.set(.6,.6,.6);state.root.add(flashMesh);state.flash=flashMesh;
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.65,.085,6,40),new THREE.MeshBasicMaterial({color:0xffd76a,transparent:true,opacity:.95,blending:THREE.AdditiveBlending,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.set(boss.x,.10,boss.z);state.root.add(ring);state.shockwave=ring;
    if(!state.damageDone&&typeof BishopBoss!=='undefined'&&BishopBoss.state!=='inactive'&&BishopBoss.state!=='dead'){
      const damage=Math.max(50,Math.round((Number(BishopBoss.maxHp)||100)*.46));
      const dx=BishopBoss.x-Player.x,dy=BishopBoss.y-Player.y;
      damageBishopWithCelestialPower(damage,dx,dy,185,boss,now,0xfff0a8,true);
      state.damageDone=true;
    }
    createSunExplosion(boss,now);damageNearbyVegetation(boss,now);
    if(typeof BishopDimension!=='undefined'){if(typeof BishopDimension.damageVegetation==='function')BishopDimension.damageVegetation(boss.x,boss.z,5.8);if(typeof BishopDimension.impact==='function')BishopDimension.impact(1.8);}
    window.BibliaCelestialDiagnostics='Julgamento Divino: impacto e dano aplicados';
  }
  function endJudgmentUltimate(now) {
    const state=judgmentUltimate;
    if(state.root){state.root.traverse(function(obj){if(obj.geometry&&obj.geometry.dispose&&!obj.userData.ultimateSharedGeometry)obj.geometry.dispose();if(obj.material){const mats=Array.isArray(obj.material)?obj.material:[obj.material];mats.forEach(function(m){if(m&&m.dispose)m.dispose();});}});if(state.root.parent)state.root.parent.remove(state.root);}
    if(api&&api.scene&&api.scene.fog===state.stormFog)api.scene.fog=state.originalSceneFog||null;
    state.active=false;state.stage='';state.root=null;state.cameraEye=null;state.cameraTarget=null;state.cameraLastAt=0;state.cameraFov=1.02;state.clouds=[];state.cloudMaterial=null;state.rain=null;state.lightning=null;state.portal=null;state.portalSpinner=null;state.portalMaterials=[];state.sword=null;state.swordLight=null;state.flashLight=null;state.stormFog=null;state.originalSceneFog=null;state.shockwave=null;state.flash=null;
    window.CelestialUltimateActive=false;window.CelestialUltimateAutoWalk=false;window.CelestialUltimatePose='';window.CelestialUltimateLookAtSky=false;window.CelestialUltimateCamera={active:false};
    window.CelestialUltimateStormFactor=0;window.CelestialUltimateLightningFactor=0;
    if(typeof BishopBoss!=='undefined'){if(state.originalBossUpdate)BishopBoss.update=state.originalBossUpdate;state.originalBossUpdate=null;if(BishopBoss.state!=='dead'&&BishopBoss.state!=='inactive'){BishopBoss.vx=BishopBoss.vy=BishopBoss.kx=BishopBoss.ky=0;if(BishopBoss.state==='attack'||BishopBoss.state==='windup'||BishopBoss.state==='approach'){BishopBoss.state='recover';BishopBoss.stateT=0;BishopBoss.attack=null;}}}
    castRequested=false;opened=false;opening=false;hideAt=0;if(group)group.visible=false;if(closedBook)closedBook.visible=false;if(openBook)openBook.visible=false;
    window.BibliaCelestialDiagnostics='Julgamento Divino concluído';
  }
  function startJudgmentUltimate() {
    const now=performance.now(),THREE=api&&api.THREE;
    if(judgmentUltimate.active)return false;
    if(!started||!api||!THREE||!swordTemplate||!closedBook||!openBook||!window.PlayerModelView||!window.PlayerModelView.active)return reportUltimateBlock('Aguarde o carregamento 3D antes de usar o Julgamento Divino.');
    if(typeof BishopDimension==='undefined'||!BishopDimension.isBattleActive()||typeof BishopBoss==='undefined'||BishopBoss.state==='inactive'||BishopBoss.state==='dead')return reportUltimateBlock('Julgamento Divino disponível durante a batalha contra o Bispo.');
    const playerPosition=window.PlayerModelView.position,bossPoint=ultimateBossPoint();
    if(!Array.isArray(playerPosition)||playerPosition.length<3||!bossPoint||!Number.isFinite(playerPosition[0])||!Number.isFinite(playerPosition[2]))return reportUltimateBlock('Não foi possível confirmar sua distância 3D do Bispo.');
    // Compara X/Z em unidades da cena 3D; não mistura os pixels 2D do combate com metros.
    const distance3D=Math.hypot(playerPosition[0]-bossPoint.x,playerPosition[2]-bossPoint.z);
    const range=classifyUltimateDistance(distance3D);
    if(range==='too-close')return reportUltimateBlock('Afaste-se: mínimo '+ULTIMATE_MIN_CAST_DISTANCE.toFixed(1)+' m do Bispo para usar o Julgamento Divino.');
    if(range==='too-far')return reportUltimateBlock('Aproxime-se: alcance máximo '+ULTIMATE_MAX_CAST_DISTANCE.toFixed(1)+' m do Bispo para usar o Julgamento Divino.');
    if(range!=='in-range')return reportUltimateBlock('Não foi possível confirmar sua distância 3D do Bispo.');
    if(window.PlayerModelView.dead||Player.dead)return reportUltimateBlock('Julgamento Divino indisponível enquanto estiver caído ou morto.');
    if(castRequested||opening||opened||(lastSpellCast&&now-lastSpellCast<6500))return;
    const normal=window.ValerioModelView;
    judgmentUltimate.active=true;judgmentUltimate.stage='book';judgmentUltimate.startedAt=now;judgmentUltimate.stageAt=now;judgmentUltimate.damageDone=false;judgmentUltimate.root=null;judgmentUltimate.returnEye=null;judgmentUltimate.returnTarget=null;judgmentUltimate.returnStartEye=null;judgmentUltimate.returnStartTarget=null;
    judgmentUltimate.cameraEye=normal&&Array.isArray(normal.eye)?new THREE.Vector3(normal.eye[0],normal.eye[1],normal.eye[2]):null;
    judgmentUltimate.cameraTarget=normal&&Array.isArray(normal.target)?new THREE.Vector3(normal.target[0],normal.target[1],normal.target[2]):null;
    judgmentUltimate.cameraLastAt=now;judgmentUltimate.cameraFov=Number(normal&&normal.fov)||1.02;
    lastSpellCast=now;window.CelestialUltimateActive=true;window.CelestialUltimateAutoWalk=false;window.CelestialUltimatePose='idle';window.CelestialUltimateLookAtSky=false;window.CelestialUltimateCamera={active:false};
    if(typeof Sfx!=='undefined'&&Sfx.powerCast)Sfx.powerCast('ultimate');
    if(typeof BishopBoss.update==='function'){judgmentUltimate.originalBossUpdate=BishopBoss.update;BishopBoss.update=function(dt){if(window.CelestialUltimateActive)return;return judgmentUltimate.originalBossUpdate.apply(this,arguments);};}
    if(bookGlowLight)bookGlowLight.intensity=0;setUltimateBibleFade(1);window.BibliaCelestialDiagnostics='Julgamento Divino: invocação iniciada';
    castRequested=true;opened=false;opening=false;pendingBookSpell='ultimate';hideAt=now+30000;openAt=now+ULTIMATE_BOOK_OPEN_DELAY_MS;
    if(closedBook&&openBook&&group){closedBook.visible=true;openBook.visible=false;closedBook.rotation.y=0;closedBook.scale.setScalar(1);openBook.rotation.y=0;openBook.scale.setScalar(1);group.visible=true;}
    if(flash){flash.material.opacity=1;flash.scale.setScalar(.32);}if(bookGlowLight)bookGlowLight.intensity=7.5;
  }
  function startJudgmentStorm(now) {
    const state=judgmentUltimate;
    state.stage='storm';state.stageAt=now;
    window.CelestialUltimatePose='idle';window.CelestialUltimateAutoWalk=false;window.CelestialUltimateLookAtSky=false;
    if(group){setUltimateBibleFade(0);group.visible=false;}
    if(closedBook)closedBook.visible=false;if(openBook)openBook.visible=false;
    castRequested=false;opened=false;opening=false;hideAt=0;pendingBookSpell='';
    addUltimateStorm(now);
    if(bookGlowLight)bookGlowLight.intensity=0;
  }
  function updateJudgmentUltimate(now,dt) {
    const state=judgmentUltimate;
    if(!state.active||!api||!api.THREE)return;
    const view=window.PlayerModelView,THREE=api.THREE;
    const ease=function(value){const p=Math.max(0,Math.min(1,value));return p*p*(3-2*p);};
    if(state.stage==='walk'&&view&&Array.isArray(view.position)){
      const yaw=Number(view.yaw)||0;state.walkYaw=yaw;
      if(typeof Player!=='undefined'){Player.x+=Math.sin(yaw)*24*dt;Player.y+=Math.cos(yaw)*24*dt;}
      window.CelestialUltimatePose='walk';window.CelestialUltimateAutoWalk=true;
      if(now-state.stageAt>900){
        window.CelestialUltimatePose='idle';window.CelestialUltimateAutoWalk=false;state.stage='book';state.stageAt=now;
        castRequested=true;opened=false;opening=false;pendingBookSpell='ultimate';hideAt=now+30000;openAt=now+ULTIMATE_BOOK_OPEN_DELAY_MS;
        if(closedBook&&openBook&&group){closedBook.visible=true;openBook.visible=false;closedBook.rotation.y=0;closedBook.scale.setScalar(1);openBook.rotation.y=0;openBook.scale.setScalar(1);group.visible=true;}
        if(flash){flash.material.opacity=1;flash.scale.setScalar(.32);}if(bookGlowLight)bookGlowLight.intensity=7.5;
      }
    }
    if(state.stage==='book'||state.stage==='bookReveal'){
      window.CelestialUltimatePose='idle';window.CelestialUltimateAutoWalk=false;
      if(bookGlowLight)bookGlowLight.intensity=(state.stage==='book'?6.5:4.8)+Math.sin(now*.018)*.65;
    }
    if(state.stage==='bookReveal'&&now-state.stageAt>=ULTIMATE_BOOK_REVEAL_MS){
      state.stage='lookSky';state.stageAt=now;window.CelestialUltimatePose='lookSky';window.CelestialUltimateLookAtSky=true;
      window.BibliaCelestialDiagnostics='Julgamento Divino: protagonista contempla o céu';
    }
    if(state.stage==='lookSky'){
      window.CelestialUltimateLookAtSky=true;
      const elapsed=now-state.stageAt;
      if(group&&group.visible){
        if(elapsed<1400)setUltimateBibleFade(1-ease((elapsed-650)/750));
        else{setUltimateBibleFade(0);castRequested=false;opened=false;opening=false;hideAt=0;pendingBookSpell='';}
      }
      if(elapsed>=ULTIMATE_LOOK_SKY_MS)startJudgmentStorm(now);
    }
    const stormStages=['storm','portal','emerge','fallSetup','fall','impact','return'];
    if(stormStages.indexOf(state.stage)>=0&&state.root){
      const boss=ultimateBossPoint()||new THREE.Vector3(0,0,0);
      const elapsed=now-state.stageAt;
      let stormFactor=0;
      if(state.stage==='storm')stormFactor=ease(elapsed/ULTIMATE_STORM_BUILD_MS);
      else if(state.stage==='impact')stormFactor=1-.5*ease((elapsed-350)/1100);
      else if(state.stage==='return')stormFactor=1-ease(elapsed/900);
      else stormFactor=1;
      window.CelestialUltimateStormFactor=stormFactor;
      if(state.stormFog)state.stormFog.density=.012*stormFactor;
      if(state.cloudMaterial)state.cloudMaterial.opacity=.52*stormFactor;
      if(state.rain)state.rain.material.opacity=.42*stormFactor;
      state.clouds.forEach(function(entry){
        const a=entry.angle+now*.00012;
        entry.mesh.position.x=boss.x+Math.cos(a)*entry.radius;
        entry.mesh.position.z=boss.z+Math.sin(a)*entry.radius;
        entry.mesh.position.y=13.5+Math.sin(now*.0014+entry.phase)*.24;
      });
      if(state.portal){
        state.portal.position.set(boss.x,17.6,boss.z);
        state.portal.rotation.y=state.portalFacingYaw;
        if(state.portalSpinner)state.portalSpinner.rotation.z=now*.00035;
        let portalOpen=0;
        if(state.stage==='portal')portalOpen=ease(elapsed/ULTIMATE_PORTAL_OPEN_MS);
        else if(state.stage==='emerge'||state.stage==='fallSetup'||state.stage==='fall'||state.stage==='impact')portalOpen=1;
        else if(state.stage==='return')portalOpen=1-stormFactor;
        state.portal.visible=portalOpen>.002;
        state.portal.scale.setScalar(.08+.92*Math.max(0,Math.min(1,portalOpen)));
        state.portalMaterials.forEach(function(material){material.opacity=material.userData.ultimateBaseOpacity*portalOpen*stormFactor;});
      }
      if(state.rain){
        const arr=state.rain.geometry.attributes.position.array;
        for(let i=0;i<arr.length;i+=6){
          arr[i]+=dt*.8;arr[i+1]-=dt*9.5;arr[i+2]+=dt*1.9;
          if(arr[i+1]<.1){arr[i]=boss.x+(Math.random()-.5)*16;arr[i+1]=5+Math.random()*16;arr[i+2]=boss.z+(Math.random()-.5)*15;}
          arr[i+3]=arr[i]-.035;arr[i+4]=arr[i+1]-.24;arr[i+5]=arr[i+2]-.025;
        }
        state.rain.geometry.attributes.position.needsUpdate=true;
      }
      let lightningFactor=0;
      const lightningStage=state.stage==='storm'||state.stage==='portal'||state.stage==='emerge'||state.stage==='fallSetup'||state.stage==='fall';
      if(state.lightning&&lightningStage){
        if(now-state.lastLightningAt>820){
          state.lastLightningAt=now;
          const arr=state.lightning.geometry.attributes.position.array,segments=arr.length/6;
          let x=boss.x+(Math.random()-.5)*8,y=19,z=boss.z+(Math.random()-.5)*7;
          for(let i=0;i<segments;i++){
            const j=i*6;arr[j]=x;arr[j+1]=y;arr[j+2]=z;
            x+=(Math.random()-.5)*.9;y-=.70;z+=(Math.random()-.5)*.75;
            arr[j+3]=x;arr[j+4]=y;arr[j+5]=z;
          }
          state.lightning.geometry.attributes.position.needsUpdate=true;
        }
        const lightningAge=now-state.lastLightningAt;
        lightningFactor=lightningAge<150?1-lightningAge/150:0;
        state.lightning.visible=lightningFactor>.01;
        state.lightning.material.opacity=.95*lightningFactor;
      }else if(state.lightning){state.lightning.visible=false;state.lightning.material.opacity=0;}
      window.CelestialUltimateLightningFactor=lightningFactor*stormFactor;
      if(state.flashLight)state.flashLight.intensity=12*lightningFactor*stormFactor;
      if(state.swordLight&&state.sword)state.swordLight.position.copy(state.sword.position);
      if(state.flash&&state.stage==='impact'){const p=Math.min(1,(now-state.impactAt)/560);state.flash.scale.setScalar(.6+p*3.7);state.flash.material.opacity=(1-p)*.92;}
      if(state.shockwave&&state.stage==='impact'){const p=Math.min(1,(now-state.impactAt)/850);state.shockwave.scale.setScalar(1+p*7.5);state.shockwave.material.opacity=(1-p)*.9;}
    }
    if(state.stage==='storm'&&now-state.stageAt>=ULTIMATE_STORM_DURATION_MS){
      state.stage='portal';state.stageAt=now;
      if(state.portal){state.portal.visible=true;state.portal.scale.setScalar(.08);}
      window.BibliaCelestialDiagnostics='Julgamento Divino: portal celestial se abre';
    }
    if(state.stage==='portal'&&now-state.stageAt>=ULTIMATE_PORTAL_DURATION_MS&&!state.sword)createUltimateSword(now);
    if(state.stage==='emerge'&&state.sword){
      const p=Math.max(0,Math.min(1,(now-state.stageAt)/ULTIMATE_SWORD_EMERGE_MS)),e=ease(p);
      state.sword.position.y=21.5+(state.swordPortalY-21.5)*e;
      if(p>=1){state.stage='fallSetup';state.stageAt=now;state.swordStart=state.sword.position.clone();}
    }
    if(state.stage==='fallSetup'&&now-state.stageAt>=ULTIMATE_FALL_SETUP_MS){
      const boss=ultimateBossPoint()||new THREE.Vector3(0,0,0);
      state.stage='fall';state.stageAt=now;state.swordStart=state.sword.position.clone();
      state.swordTarget=new THREE.Vector3(boss.x,state.swordLength*.5+ULTIMATE_GROUND_CLEARANCE,boss.z);
    }
    if(state.stage==='fall'&&state.sword){
      const p=Math.max(0,Math.min(1,(now-state.stageAt)/ULTIMATE_SWORD_FALL_MS)),e=ease(p);
      state.sword.position.lerpVectors(state.swordStart,state.swordTarget,e);
      if(state.swordLight)state.swordLight.position.copy(state.sword.position);
      if(p>=1)createUltimateImpact(now);
    }
    if(state.stage==='impact'&&now-state.impactAt>=ULTIMATE_IMPACT_HOLD_MS){
      state.stage='return';state.stageAt=now;
      state.returnStartEye=state.returnEye?state.returnEye.clone():new THREE.Vector3(0,5,9);
      state.returnStartTarget=state.returnTarget?state.returnTarget.clone():new THREE.Vector3(0,1,0);
    }
    setUltimateCamera(now);
    if(state.stage==='return'&&now-state.stageAt>ULTIMATE_CAMERA_RETURN_MS)endJudgmentUltimate(now);
  }

  function castSunOfJustice() {
    const now = performance.now();
    if (!started || !api || !api.THREE || !window.PlayerModelView ||
        !Array.isArray(window.PlayerModelView.position) || sunFlight) return;
    const view = window.PlayerModelView;
    const origin = new api.THREE.Vector3(view.position[0], view.position[1] + 1.25, view.position[2]);
    const target = currentSunTarget(origin);
    target.y = 0.12;
    ensureSunAssets();
    origin.y += 0.7;
    const peak = origin.clone(); peak.y += 3.6;
    sunOrb.position.copy(origin);
    sunOrb.visible = true;
    sunHalo.rotation.z = 0;
    sunFlight = { start: origin.clone(), peak: peak, target: target, startedAt: now, riseDuration: 650, holdDuration: 2450, duration: 1250 };
    sunLastCast = now;
    if (typeof Sfx !== 'undefined' && Sfx.powerCast) Sfx.powerCast('sun');
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
    const descentStart = sunFlight.riseDuration + sunFlight.holdDuration;
    const descentElapsed = elapsed - descentStart;
    if (descentElapsed >= 0 && descentElapsed < 850) {
      sunFlight.target.lerp(liveTarget, Math.min(1, dt * 3.2));
    }
    const riseP = Math.max(0, Math.min(1, elapsed / sunFlight.riseDuration));
    const riseEase = riseP * riseP * (3 - 2 * riseP);
    const p = Math.max(0, Math.min(1, descentElapsed / sunFlight.duration));
    const eased = p * p * (3 - 2 * p);
    if (elapsed < sunFlight.riseDuration) {
      sunOrb.position.lerpVectors(sunFlight.start, sunFlight.peak, riseEase);
    } else if (descentElapsed < 0) {
      sunOrb.position.copy(sunFlight.peak);
      sunOrb.position.y += Math.sin(now * 0.0035) * 0.12;
    } else {
      sunOrb.position.lerpVectors(sunFlight.peak, sunFlight.target, eased);
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
        landedHit = damageBishopWithCelestialPower(
          42, dx, dy, 120, impact, now, 0xff7b1a, true
        );
        if (landedHit) startSunBurn(bx, bz, now);
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
      setTimeout(begin, 120);
      return;
    }
    started = true;
    loadSwordTemplate();
    const ultimateButton = document.getElementById('btn-ultimate');
    if (ultimateButton && !ultimateButtonBound) {
      ultimateButtonBound = true;
      ultimateButton.style.touchAction = 'none';
      const triggerUltimate = function(event) {
        if (event) event.preventDefault();
        startJudgmentUltimate();
      };
      if ('PointerEvent' in window) {
        ultimateButton.addEventListener('pointerdown', triggerUltimate, { passive: false });
        // O click após pointerdown é o mesmo toque; aceitar apenas ativação por teclado/leitor.
        ultimateButton.addEventListener('click', function(event){if(event.detail===0)triggerUltimate(event);});
      } else {
        ultimateButton.addEventListener('click', triggerUltimate);
      }
    }
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

    // MOD 106 — atalhos de teclado para os poderes no computador.
    // Números não conflitam com movimento, ataque, defesa, pulo ou interação.
    window.addEventListener('keydown', function (event) {
      if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      switch (event.code) {
        case 'Digit1': event.preventDefault(); summon(); break;
        case 'Digit2': event.preventDefault(); summon('judgment'); break;
        case 'Digit3': event.preventDefault(); summon('sun'); break;
        case 'Digit4': event.preventDefault(); startJudgmentUltimate(); break;
      }
    });
    requestAnimationFrame(update);
  }

  let previousFrame = 0;
  function update(now) {
    requestAnimationFrame(update);
    const dt = previousFrame ? Math.min(0.05, (now - previousFrame) / 1000) : 0;
    previousFrame = now;
    updateCelestialImpacts(now);
    updateFlyingSwords(now, dt);
    updateJudgment(now, dt);
    updateSunOfJustice(now, dt);
    updateJudgmentUltimate(now, dt);
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
        else if (pendingBookSpell === 'ultimate') { judgmentUltimate.stage='bookReveal'; judgmentUltimate.stageAt=now; window.CelestialUltimatePose='idle'; window.CelestialUltimateLookAtSky=false; window.BibliaCelestialDiagnostics='Julgamento Divino: Bíblia celestial revelada'; }
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
    goldRing.rotation.z = Math.sin(now * 0.0014) * 0.12;
    whiteRing.rotation.z = Math.PI / 4 - Math.sin(now * 0.0011) * 0.09;
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