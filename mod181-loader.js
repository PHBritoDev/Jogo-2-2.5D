/**
 * MOD 181 — carrega main, aplica trechos oficiais da mod (lua, dia/noite, ruína, tochas).
 */
async function loadText(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('Falha ao carregar ' + url + ' (' + r.status + ')');
  return r.text();
}

async function loadBaseSource() {
  try {
    const local = await loadText(new URL('./mundo-3d-prototype.js?v=mod181-try-local', import.meta.url).href);
    if (local.length > 5000 && local.indexOf('PLACEHOLDER') < 0) return local;
  } catch (e) {}
  return loadText('https://raw.githubusercontent.com/PHBritoDev/Jogo-2-2.5D/main/mundo-3d-prototype.js');
}

async function applyMod181(code) {
  if (code.indexOf('MOD 181 — Lua 3D') >= 0) return code;

  const moonBlock = await loadText(new URL('./mod181-moon-snippet.js?v=mod181', import.meta.url).href);
  const ruinBlock = await loadText(new URL('./mod181-ruin-snippet.js?v=mod181', import.meta.url).href);

  const hemiOld = 'scene.add(new THREE.HemisphereLight(0xeaf7ff,0x59684b,1.55));';
  const hemiNew = 'const hemiLight=new THREE.HemisphereLight(0xeaf7ff,0x59684b,1.55);scene.add(hemiLight);';
  if (code.indexOf(hemiOld) >= 0) code = code.replace(hemiOld, hemiNew);

  const nearOld = 'const mountainNearLayout=[[-112,-62,15,26],[-108,9,18,31],[-94,75,16,28],[-54,105,14,24],[0,117,18,31],[54,105,15,26],[96,74,18,30],[108,8,15,26],[101,-62,18,31]];';
  const nearNew = 'const mountainNearLayout=[[-112,-62,15,26],[-108,9,18,31],[-94,75,16,28],[-54,105,14,24],[0,117,18,31],[54,105,15,26],[96,74,18,30],[108,8,15,26],[101,-62,18,31],[-72,-28,12,21],[-38,88,13,22],[72,-38,14,24],[28,98,11,19],[-125,40,16,28],[118,48,15,27]];';
  if (code.indexOf(nearOld) >= 0) code = code.replace(nearOld, nearNew);

  const ridge = 'const forestMountainRidge=buildMountainRidge(mountainNearLayout,mountainNearMaterial,0x3e5b4a,0x71836a);';
  if (code.indexOf(ridge) >= 0) code = code.replace(ridge, ridge + '\n\n' + moonBlock);

  const lanternLoop = 'for(const p of [{x:VILLAGE_CENTER.x-8.4,z:VILLAGE_CENTER.z-1},{x:VILLAGE_CENTER.x+7.4,z:VILLAGE_CENTER.z+1},{x:VILLAGE_CENTER.x-1,z:VILLAGE_CENTER.z+11}]){const pole=new THREE.Mesh(new THREE.CylinderGeometry(.045,.07,2.05,5),woodMat);pole.position.set(p.x,1.02,p.z);villageGroup.add(pole);const glow=new THREE.Mesh(new THREE.SphereGeometry(.16,7,6),lanternMat);glow.position.set(p.x,1.92,p.z);villageGroup.add(glow);}';
  const torchAdd = "for(const p of [{x:VILLAGE_CENTER.x-8.4,z:VILLAGE_CENTER.z-1},{x:VILLAGE_CENTER.x+7.4,z:VILLAGE_CENTER.z+1},{x:VILLAGE_CENTER.x-1,z:VILLAGE_CENTER.z+11}]){const torch=new THREE.PointLight(0xffb060,.35,11,.9);torch.position.set(p.x,1.95,p.z);torch.castShadow=false;villageGroup.add(torch);villageTorchLights.push(torch);}";
  if (code.indexOf(lanternLoop) >= 0 && code.indexOf('villageTorchLights.push') < 0) {
    code = code.replace(lanternLoop, lanternLoop + '\n' + torchAdd);
  }

  const clearing = '// Clareira natural com tronco caído e pedras pequenas: sem runas e sem personagem freira.';
  if (code.indexOf(clearing) >= 0) code = code.replace(clearing, ruinBlock + clearing);

  const aiHook = 'updateEnemyAI(dt);updateEnemyHud();updatePlayerHud();';
  const aiNew = 'updateEnemyAI(dt);updateEnemyHud();updatePlayerHud();updateDayNight(dt);checkSecretRuin();';
  if (code.indexOf(aiHook) >= 0 && code.indexOf('updateDayNight(dt)') < 0) {
    code = code.replace(aiHook, aiNew);
  }

  return code;
}

const statusEl = document.getElementById('status');
try {
  if (statusEl) statusEl.textContent = 'Aplicando Mod 181…';
  const base = await loadBaseSource();
  const patched = await applyMod181(base);
  const blob = new Blob([patched], { type: 'text/javascript' });
  await import(URL.createObjectURL(blob));
} catch (err) {
  console.error(err);
  if (statusEl) statusEl.textContent = 'Erro na Mod 181: ' + (err && err.message ? err.message : err);
  const loading = document.getElementById('loading');
  if (loading) loading.innerHTML = 'Falha ao montar o mundo 3D (Mod 181).<br><br>' + (err && err.message ? err.message : String(err));
}
