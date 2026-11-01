/**
 * MOD 186 — carrega mundo-3d-prototype.js (e seus módulos locais: Ato I, terreno), reescreve caminhos relativos dos GLB
 * e o módulo do Ato I, aplica Mod 181 se faltar e correções de combate do Enemy1.
 */
async function loadText(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('Falha ao carregar ' + url + ' (' + r.status + ')');
  return r.text();
}

function rewriteAssetPaths(code, baseHref) {
  return code.replace(/(['"])\.\/([^'"]+\.(?:glb|png|jpg|jpeg|webp))\1/gi, function(_, q, path) {
    return q + new URL(path, baseHref).href + q;
  });
}

function applyCombatFixes(code) {
  const playOld = "function playEnemyAnimation(role,fade=.1,once=false){\n const next=enemyActions[role];if(!next)return false;";
  const playNew = "function playEnemyAnimation(role,fade=.1,once=false){\n if(role==='jump')return false;\n const next=enemyActions[role];if(!next)return false;";
  if (code.indexOf(playOld) >= 0) code = code.replace(playOld, playNew);

  const atkEndOld = "if(enemyAttackElapsed<enemyAttackDuration)return;playEnemyAnimation('idle',.08);";
  const atkEndNew = "if(enemyAttackElapsed<enemyAttackDuration)return;enemyAttackCooldown=Math.max(enemyAttackCooldown,.55);playEnemyAnimation('idle',.1);";
  if (code.indexOf(atkEndOld) >= 0) code = code.replace(atkEndOld, atkEndNew);

  const hitGuard = " if(enemyCurrentRole==='hit'){";
  const jumpGuard = " if(enemyCurrentRole==='jump'){playEnemyAnimation('idle',.08);return;}\n if(enemyCurrentRole==='hit'){";
  if (code.indexOf(hitGuard) >= 0 && code.indexOf("enemyCurrentRole==='jump'") < 0) {
    code = code.replace(hitGuard, jumpGuard);
  }

  const roleReport = "window.Enemy1AnimationRoleReport=Object.fromEntries(Object.entries(clipsByRole).map(([role,clip])=>[role,clip?clip.name:null]));";
  const sanitize = "for(const bad of ['idle','walk','run']){if(clipsByRole[bad]&&/(jump|pulo|saltar|salto)/.test(String(clipsByRole[bad].name||'').toLowerCase()))clipsByRole[bad]=null;}\n " + roleReport;
  if (code.indexOf(roleReport) >= 0 && code.indexOf("for(const bad of ['idle','walk','run'])") < 0) {
    code = code.replace(roleReport, sanitize);
  }

  const hitIsRunning = "if(enemyCurrentRole==='hit'&&enemyCurrentAction&&!enemyCurrentAction.isRunning()&&enemyAlive)playEnemyAnimation('idle',.08);";
  const hitTimed = "if(enemyCurrentRole==='hit'&&enemyCurrentAction&&enemyAlive){const hc=enemyCurrentAction.getClip();if(!hc||enemyCurrentAction.time>=hc.duration-.02||!enemyCurrentAction.isRunning())playEnemyAnimation('idle',.08);}";
  if (code.indexOf(hitIsRunning) >= 0) code = code.replace(hitIsRunning, hitTimed);

  return code;
}

async function applyMod181(code) {
  if (code.indexOf('MOD 181 — Lua 3D') >= 0) return applyCombatFixes(code);

  const moonBlock = await loadText(new URL('./mod181-moon-snippet.js?v=mod182', import.meta.url).href);
  const ruinBlock = await loadText(new URL('./mod181-ruin-snippet.js?v=mod182', import.meta.url).href);

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

  return applyCombatFixes(code);
}

const BUILD = 'mod255-bombardeio-dobro';
const statusEl = document.getElementById('status');
const baseHref = new URL('./', import.meta.url).href;
try {
  if (statusEl) statusEl.textContent = 'Preparando o mundo 3D…';
  let code = await loadText(new URL('./mundo-3d-prototype.js?v=' + BUILD, import.meta.url).href);
  code = await applyMod181(code);
  // Módulos locais importados pelo mundo (o código roda a partir de um blob, então os caminhos precisam ser absolutos).
  code = code.replace(/from '\.\/([a-z0-9-]+\.js)'/gi, function(_, file) {
    return "from '" + new URL('./' + file + '?v=' + BUILD, import.meta.url).href + "'";
  });
  code = rewriteAssetPaths(code, baseHref);
  const blob = new Blob([code], { type: 'text/javascript' });
  await import(URL.createObjectURL(blob));
} catch (err) {
  console.error(err);
  if (statusEl) statusEl.textContent = 'Erro na Mod 186: ' + (err && err.message ? err.message : err);
  const loading = document.getElementById('loading');
  if (loading) loading.innerHTML = 'Falha ao montar o mundo 3D (Mod 186).<br><br>' + (err && err.message ? err.message : String(err));
}
