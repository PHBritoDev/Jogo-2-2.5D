const editable = target => target?.isContentEditable || target?.closest?.('input,textarea,select');

export function acceptsGameKey(event) {
  return !event.isComposing && !event.ctrlKey && !event.metaKey && !event.altKey && !editable(event.target);
}

const bindings = {
  KeyW:'w', KeyA:'a', KeyS:'s', KeyD:'d',
  ArrowUp:'arrowup', ArrowDown:'arrowdown', ArrowLeft:'arrowleft', ArrowRight:'arrowright',
  ShiftLeft:'shift', ShiftRight:'shift'
};

export function bindMovementKeys(win, doc) {
  const state = Object.create(null);
  const held = new Map();
  function release(code) {
    const binding = held.get(code);
    if (!binding) return;
    held.delete(code);
    state[binding.key] = state[binding.key] && [...held.values()].some(other => other.key === binding.key);
  }
  function clear() {
    held.clear();
    for (const key of Object.keys(state)) state[key] = false;
  }
  win.addEventListener('keydown', event => {
    const key = bindings[event.code];
    if (!key || !acceptsGameKey(event)) return;
    if (event.repeat) {
      if (held.has(event.code) && event.code.startsWith('Arrow')) event.preventDefault();
      return;
    }
    held.set(event.code, { key, fullscreen:doc.fullscreenElement, pointer:doc.pointerLockElement });
    state[key] = true;
    if (event.code.startsWith('Arrow')) event.preventDefault();
  });
  win.addEventListener('keyup', event => release(event.code));
  win.addEventListener('blur', clear);
  doc.addEventListener('focusin', event => { if (editable(event.target)) clear(); });
  doc.addEventListener('visibilitychange', () => { if (doc.hidden) clear(); });
  // A change event may arrive *after* the next trusted keydown. Release only
  // presses that started in the old context, keeping the new press responsive.
  doc.addEventListener('fullscreenchange', () => {
    for (const [code, press] of held) if (press.fullscreen !== doc.fullscreenElement) release(code);
  });
  doc.addEventListener('pointerlockchange', () => {
    // Pointer lock can move directly from one element to another without a
    // null intermediate state. Keys held in the old context must not keep
    // walking the hero after the capture target changes.
    for (const [code, press] of held) {
      if (press.pointer !== doc.pointerLockElement) release(code);
    }
  });
  return state;
}
