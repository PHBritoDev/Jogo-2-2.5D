// Track physical movement keys independently so either Shift can sustain sprint.
export function bindMovementKeys(win, doc) {
  const state = Object.create(null);
  const held = new Map();
  const bindings = {KeyW:'w',KeyA:'a',KeyS:'s',KeyD:'d',ArrowUp:'arrowup',ArrowDown:'arrowdown',ArrowLeft:'arrowleft',ArrowRight:'arrowright',ShiftLeft:'shift',ShiftRight:'shift'};
  function clear() {
    held.clear();
    for (const key of Object.keys(state)) state[key]=false;
  }
  const editable = target => target?.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"])');
  win.addEventListener('keydown', event => {
    const key=bindings[event.code];
    if (!key || event.isComposing || event.ctrlKey || event.metaKey || event.altKey || editable(event.target)) return;
    held.set(event.code,key);
    state[key]=true;
    if (event.code.startsWith('Arrow')) event.preventDefault();
  });
  win.addEventListener('keyup', event => {
    const key=held.get(event.code);
    if (!key) return;
    held.delete(event.code);
    state[key]=Array.from(held.values()).includes(key);
  });
  win.addEventListener('blur',clear);
  doc.addEventListener('focusin',e=>{if(editable(e.target))clear();});
  doc.addEventListener('visibilitychange',()=>{if(doc.hidden)clear();});
  doc.addEventListener('fullscreenchange',clear);
  doc.addEventListener('pointerlockchange',()=>{if(!doc.pointerLockElement)clear();});
  return state;
}
