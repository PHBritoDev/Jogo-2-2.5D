'use strict';

/* ============================================================
   INPUT — joystick analógico (lado esquerdo), botões de pulo,
   ataque e defesa (lado direito) e teclado (para testar no PC)
   ============================================================ */
const Input = (function () {
  const zone = document.getElementById('joy-zone');
  const cameraZone = document.getElementById('camera-zone');
  const base = document.getElementById('joy-base');
  const knob = document.getElementById('joy-knob');

  const R = CFG.JOY.radius;
  const keys = {};
  const joy = { x: 0, y: 0 };
  const out = { x: 0, y: 0 };

  let joyId = null;
  let cx = 0, cy = 0;
  let touchJump = false, touchDefend = false, touchAim = false;
  let jumpQueued = false, attackQueued = false, interactQueued = false, cameraQueued = false;
  const cameraPointers = new Map();
  let pinchDistance = 0;

  function placeBase(x, y) {
    base.style.left = x + 'px';
    base.style.top = y + 'px';
  }

  function setKnob(dx, dy) {
    knob.style.transform = 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px))';
  }

  // Posição de repouso do joystick (canto inferior esquerdo)
  function layoutIdle() {
    if (joyId !== null) return;
    cx = Math.max(100, window.innerWidth * 0.13);
    cy = window.innerHeight - Math.max(90, window.innerHeight * 0.26);
    placeBase(cx, cy);
    setKnob(0, 0);
  }

  function updateJoy(px, py) {
    let dx = px - cx, dy = py - cy;
    const len = Math.hypot(dx, dy);
    if (len > R) { dx = dx / len * R; dy = dy / len * R; }
    setKnob(dx, dy);

    let m = Math.min(len, R) / R;
    if (m < CFG.JOY.dead) { joy.x = 0; joy.y = 0; return; }
    m = (m - CFG.JOY.dead) / (1 - CFG.JOY.dead);
    const a = Math.atan2(dy, dx);
    joy.x = Math.cos(a) * m;
    joy.y = Math.sin(a) * m;
  }

  function releaseJoy() {
    joyId = null;
    joy.x = 0; joy.y = 0;
    base.classList.remove('active');
    layoutIdle();
  }

  // ----- Joystick (toque na metade esquerda da tela) -----
  zone.addEventListener('pointerdown', function (e) {
    if (joyId !== null) return;
    e.preventDefault();
    joyId = e.pointerId;
    try { zone.setPointerCapture(e.pointerId); } catch (err) {}
    cx = U.clamp(e.clientX, R + 10, window.innerWidth - R - 10);
    cy = U.clamp(e.clientY, R + 10, window.innerHeight - R - 10);
    placeBase(cx, cy);
    base.classList.add('active');
    updateJoy(e.clientX, e.clientY);
  });

  zone.addEventListener('pointermove', function (e) {
    if (e.pointerId !== joyId) return;
    e.preventDefault();
    updateJoy(e.clientX, e.clientY);
  });

  function endJoy(e) {
    if (e.pointerId !== joyId) return;
    releaseJoy();
  }
  zone.addEventListener('pointerup', endJoy);
  zone.addEventListener('pointercancel', endJoy);
  zone.addEventListener('lostpointercapture', endJoy);

  // ----- Olhar (área livre no lado direito; botões têm prioridade visual) -----
  function pointerDistance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  cameraZone.addEventListener('pointerdown', function (e) {
    if (cameraPointers.has(e.pointerId)) return;
    e.preventDefault();
    cameraPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { cameraZone.setPointerCapture(e.pointerId); } catch (err) {}
    pinchDistance = cameraPointers.size === 2
      ? pointerDistance.apply(null, Array.from(cameraPointers.values()))
      : 0;
  });

  cameraZone.addEventListener('pointermove', function (e) {
    const point = cameraPointers.get(e.pointerId);
    if (!point) return;
    e.preventDefault();
    const dx = e.clientX - point.x, dy = e.clientY - point.y;
    point.x = e.clientX;
    point.y = e.clientY;

    if (cameraPointers.size >= 2) {
      const points = Array.from(cameraPointers.values());
      const nextDistance = pointerDistance(points[0], points[1]);
      if (pinchDistance > 0) FirstPerson.adjustZoom((nextDistance - pinchDistance) * 0.0025);
      pinchDistance = nextDistance;
      return;
    }

    if (FirstPerson.active) FirstPerson.lookBy(dx, dy);
    else Camera.panBy(dx, dy);
  });

  function endCamera(e) {
    if (!cameraPointers.has(e.pointerId)) return;
    cameraPointers.delete(e.pointerId);
    pinchDistance = cameraPointers.size === 2
      ? pointerDistance.apply(null, Array.from(cameraPointers.values()))
      : 0;
  }
  cameraZone.addEventListener('pointerup', endCamera);
  cameraZone.addEventListener('pointercancel', endCamera);
  cameraZone.addEventListener('lostpointercapture', endCamera);

  // ----- Botões de ação (cada um com seu próprio toque) -----
  function bindButton(id, onDown, onUp) {
    const el = document.getElementById(id);
    if (!el) return;   // botão ainda não existe nesta versão da interface
    let pointerId = null;
    el.addEventListener('pointerdown', function (e) {
      if (pointerId !== null) return;
      e.preventDefault();
      pointerId = e.pointerId;
      try { el.setPointerCapture(e.pointerId); } catch (err) {}
      el.classList.add('pressed');
      onDown();
    });
    function end(e) {
      if (pointerId === null || (e && e.pointerId !== pointerId)) return;
      pointerId = null;
      el.classList.remove('pressed');
      onUp();
    }
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('lostpointercapture', end);
  }

  bindButton('btn-jump', function () { touchJump = true; jumpQueued = true; }, function () { touchJump = false; });
  bindButton('btn-attack', function () { attackQueued = true; }, function () {});
  bindButton('btn-interact', function () { interactQueued = true; }, function () {});
  bindButton('btn-camera', function () { cameraQueued = true; }, function () {});
  bindButton('btn-defend', function () { touchDefend = true; }, function () { touchDefend = false; });
  bindButton('btn-aim', function () { touchAim = true; }, function () { touchAim = false; });

  // ----- Teclado (teste no PC) -----
  const JUMP_KEYS = { Space: 1, KeyZ: 1, KeyK: 1 };
  const ATTACK_KEYS = { KeyJ: 1, KeyX: 1 };
  const INTERACT_KEYS = { KeyE: 1, Enter: 1 };
  const CAMERA_KEYS = { KeyV: 1 };   // alterna os modos de câmera
  window.addEventListener('keydown', function (e) {
    if (e.code === 'Space' || e.code.indexOf('Arrow') === 0) e.preventDefault();
    if (!keys[e.code]) {
      if (JUMP_KEYS[e.code]) jumpQueued = true;
      if (ATTACK_KEYS[e.code]) attackQueued = true;
      if (INTERACT_KEYS[e.code]) interactQueued = true;
      if (CAMERA_KEYS[e.code]) cameraQueued = true;
    }
    keys[e.code] = true;
  });
  window.addEventListener('keyup', function (e) { keys[e.code] = false; });
  window.addEventListener('blur', function () {
    for (const k in keys) keys[k] = false;
    touchJump = false; touchDefend = false; touchAim = false;
    cameraPointers.clear(); pinchDistance = 0;
    releaseJoy();
  });

  window.addEventListener('resize', layoutIdle);
  window.addEventListener('orientationchange', function () { setTimeout(layoutIdle, 200); });
  layoutIdle();

  // ----- API pública -----
  return {
    // Vetor de movimento (comprimento máx. 1). Analógico: 0..1
    axis() {
      let kx = 0, ky = 0;
      if (keys.ArrowLeft || keys.KeyA) kx -= 1;
      if (keys.ArrowRight || keys.KeyD) kx += 1;
      if (keys.ArrowUp || keys.KeyW) ky -= 1;
      if (keys.ArrowDown || keys.KeyS) ky += 1;
      let x = joy.x + kx, y = joy.y + ky;
      const len = Math.hypot(x, y);
      if (len > 1) { x /= len; y /= len; }
      out.x = x; out.y = y;
      return out;
    },
    jumpHeld() { return touchJump || !!(keys.Space || keys.KeyZ || keys.KeyK); },
    defendHeld() { return touchDefend || !!(keys.KeyL || keys.KeyC || keys.ShiftLeft); },
    aimHeld() { return touchAim || !!(keys.KeyF || keys.Button5); },
    // Retornam true uma vez por apertar (segurar o botão NÃO repete)
    consumeJump() { const j = jumpQueued; jumpQueued = false; return j; },
    consumeAttack() { const a = attackQueued; attackQueued = false; return a; },
    consumeInteract() { const a = interactQueued; interactQueued = false; return a; },
    consumeCamera() { const a = cameraQueued; cameraQueued = false; return a; },
    relayout: layoutIdle,   // reposiciona o joystick (chamado pelo resize do main.js)
    isKey(code) { return !!keys[code]; }
  };
})();
