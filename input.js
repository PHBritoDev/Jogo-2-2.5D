'use strict';

/* ============================================================
   INPUT — joystick analógico (lado esquerdo), botões de pulo,
   ataque e defesa (lado direito), teclado e câmera livre por arrasto
   ============================================================ */
const Input = (function () {
  const zone = document.getElementById('joy-zone');
  const base = document.getElementById('joy-base');
  const knob = document.getElementById('joy-knob');
  const gameCanvas = document.getElementById('game');

  const R = CFG.JOY.radius;
  const keys = {};
  const joy = { x: 0, y: 0 };
  const out = { x: 0, y: 0 };
  const cameraDrag = { active: false, pointerId: null, lastX: 0, lastY: 0 };

  let joyId = null;
  let cx = 0, cy = 0;
  let touchJump = false, touchDefend = false;
  let jumpQueued = false, attackQueued = false, interactQueued = false, aimToggleQueued = false;

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
    if (cameraDrag.active) return;
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
  bindButton('btn-defend', function () { touchDefend = true; }, function () { touchDefend = false; });
  bindButton('btn-aim', function () { aimToggleQueued = true; }, function () {});

  // ----- Câmera exclusiva da dimensão 3D de Valério -----
  const cameraPointers = new Map();
  let pinchDistance = 0;
  function pointerDistance(){const p=Array.from(cameraPointers.values());return p.length<2?0:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);}
  function beginCameraDrag(e) {
    if (!gameCanvas || e.target !== gameCanvas || !BishopDimension.isBattleActive()) return;
    if (e.pointerType === 'mouse' && e.button !== 2) return;
    e.preventDefault();cameraPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(cameraPointers.size===2){pinchDistance=pointerDistance();cameraDrag.active=false;return;}
    cameraDrag.active=true;cameraDrag.pointerId=e.pointerId;cameraDrag.lastX=e.clientX;cameraDrag.lastY=e.clientY;
    try { gameCanvas.setPointerCapture(e.pointerId); } catch (err) {}
  }
  function moveCameraDrag(e) {
    if(!cameraPointers.has(e.pointerId)||!BishopDimension.isBattleActive())return;
    const prev=cameraPointers.get(e.pointerId);cameraPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(cameraPointers.size>=2){const d=pointerDistance();if(pinchDistance>0&&d>0)BishopDimension.addCameraZoom((pinchDistance-d)*.035);pinchDistance=d;cameraDrag.active=false;return;}
    if(!cameraDrag.active||e.pointerId!==cameraDrag.pointerId)return;
    BishopDimension.addCameraLook(e.clientX-prev.x,e.clientY-prev.y);cameraDrag.lastX=e.clientX;cameraDrag.lastY=e.clientY;
  }
  function endCameraDrag(e) {
    cameraPointers.delete(e.pointerId);if(e.pointerId===cameraDrag.pointerId){cameraDrag.active=false;cameraDrag.pointerId=null;}pinchDistance=pointerDistance();
  }
  gameCanvas.addEventListener('pointerdown', beginCameraDrag);
  gameCanvas.addEventListener('pointermove', moveCameraDrag);
  gameCanvas.addEventListener('pointerup', endCameraDrag);
  gameCanvas.addEventListener('pointercancel', endCameraDrag);
  gameCanvas.addEventListener('lostpointercapture', endCameraDrag);
  gameCanvas.addEventListener('contextmenu', function (e) { if (cameraDrag.active) e.preventDefault(); });

  // ----- Teclado (teste no PC) -----
  const JUMP_KEYS = { Space: 1, KeyZ: 1, KeyK: 1 };
  const ATTACK_KEYS = { KeyJ: 1, KeyX: 1 };
  const INTERACT_KEYS = { KeyE: 1, Enter: 1 };
  const AIM_KEYS = { KeyF: 1, Button5: 1 };   // alterna a mira direcional
  window.addEventListener('keydown', function (e) {
    if (e.code === 'Space' || e.code.indexOf('Arrow') === 0) e.preventDefault();
    if (!keys[e.code]) {
      if (JUMP_KEYS[e.code]) jumpQueued = true;
      if (ATTACK_KEYS[e.code]) attackQueued = true;
      if (INTERACT_KEYS[e.code]) interactQueued = true;
      if (AIM_KEYS[e.code]) aimToggleQueued = true;
    }
    keys[e.code] = true;
  });
  window.addEventListener('keyup', function (e) { keys[e.code] = false; });
  window.addEventListener('blur', function () {
    for (const k in keys) keys[k] = false;
    touchJump = false; touchDefend = false;
    aimToggleQueued = false;
    releaseJoy();
    cameraDrag.active = false;
    cameraDrag.pointerId = null;
    cameraPointers.clear();pinchDistance=0;
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
    // Retornam true uma vez por apertar (segurar o botão NÃO repete)
    consumeJump() { const j = jumpQueued; jumpQueued = false; return j; },
    consumeAttack() { const a = attackQueued; attackQueued = false; return a; },
    consumeInteract() { const a = interactQueued; interactQueued = false; return a; },
    consumeAimToggle() { const a = aimToggleQueued; aimToggleQueued = false; return a; },
    relayout: layoutIdle,   // reposiciona o joystick (chamado pelo resize do main.js)
    isKey(code) { return !!keys[code]; },
    isCameraDragging() { return cameraDrag.active; },
    resetCamera() { Camera.resetLook(); }
  };
})();
