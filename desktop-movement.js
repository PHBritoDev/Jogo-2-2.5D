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
  // Quarantine keys released by a capture transition until their physical keyup.
  const suppressedUntilKeyup = new Set();
  function release(code, suppressUntilKeyup = false) {
    const binding = held.get(code);
    if (!binding) return;
    held.delete(code);
    if (suppressUntilKeyup) suppressedUntilKeyup.add(code);
    state[binding.key] = state[binding.key] && [...held.values()].some(other => other.key === binding.key);
  }
  function clear() {
    held.clear();
    for (const key of Object.keys(state)) state[key] = false;
  }
  win.addEventListener('keydown', event => {
    const key = bindings[event.code];
    if (!key || !acceptsGameKey(event)) return;
    if (suppressedUntilKeyup.has(event.code)) {
      if (event.code.startsWith('Arrow')) event.preventDefault();
      return;
    }
    if (held.has(event.code)) {
      // A second keydown is not a new press, even when repeat is false.
      // Do not overwrite the capture context of the original press.
      if (event.code.startsWith('Arrow')) event.preventDefault();
      return;
    }
    if (event.repeat) return;
    held.set(event.code, { key, fullscreen:doc.fullscreenElement, pointer:doc.pointerLockElement });
    state[key] = true;
    if (event.code.startsWith('Arrow')) event.preventDefault();
  });
  win.addEventListener('keyup', event => {
    suppressedUntilKeyup.delete(event.code);
    release(event.code);
  });
  win.addEventListener('blur', clear);
  doc.addEventListener('focusin', event => { if (editable(event.target)) clear(); });
  doc.addEventListener('visibilitychange', () => { if (doc.hidden) clear(); });
  // A change event may arrive *after* the next trusted keydown. Release only
  // presses that started in the old context, keeping the new press responsive.
  doc.addEventListener('fullscreenchange', () => {
    for (const [code, press] of held) if (press.fullscreen !== doc.fullscreenElement) release(code, true);
  });
  doc.addEventListener('pointerlockchange', () => {
    // Pointer lock can move directly from one element to another without a
    // null intermediate state. Quarantine old presses until keyup so a late
    // duplicate keydown cannot restart movement in the new context.
    for (const [code, press] of held) {
      if (press.pointer !== doc.pointerLockElement) release(code, true);
    }
  });
  return state;
}
