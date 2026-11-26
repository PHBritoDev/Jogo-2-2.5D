/**
 * MOD 186 — carrega mundo-3d-prototype.js (e seus módulos locais: Ato I, terreno), reescreve caminhos relativos dos GLB
 * e o módulo do Ato I, aplica Mod 181 se faltar e correções de combate do Enemy1.
 */
const { fetchText, warmModuleGraph, pageImportMap, describeFailure } = await import('./module-warm.js' + new URL(import.meta.url).search);

// Download com tentativas limitadas e erro com a URL real (ver module-warm.js).
async function loadText(url) { return fetchText(url); }

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

  // Tochas de código removidas definitivamente: nenhum patch legado deve recriar postes ou esferas.\n\n  const clearing = '// Clareira natural com tronco caído e pedras pequenas: sem runas e sem personagem freira.';
  if (code.indexOf(clearing) >= 0) code = code.replace(clearing, ruinBlock + clearing);

  const aiHook = 'updateEnemyAI(dt);updateEnemyHud();updatePlayerHud();';
  const aiNew = 'updateEnemyAI(dt);updateEnemyHud();updatePlayerHud();updateDayNight(dt);checkSecretRuin();';
  if (code.indexOf(aiHook) >= 0 && code.indexOf('updateDayNight(dt)') < 0) {
    code = code.replace(aiHook, aiNew);
  }

  return applyCombatFixes(code);
}

// O HTML passa ?v=BUILD ao carregar este módulo; execução direta usa metadata central.
const BUILD = new URL(import.meta.url).searchParams.get('v') || (await import('./build-info.js?stamp='+Date.now())).BUILD;
const statusEl = document.getElementById('status');
const loadingPanel = document.getElementById('loading');
const loadingCopy = document.getElementById('loading-copy');
const loadingState = document.getElementById('loading-state');
const loadingProgress = document.getElementById('loading-progress');
const loadingFill = document.getElementById('loading-progress-fill');
const loadingPercent = document.getElementById('loading-percent');
const loadingProgressLabel = document.getElementById('loading-progress-label');
const loadingError = document.getElementById('loading-error');
const loadingRetry = document.getElementById('load-retry');

// Barra: os módulos baixados valem até 90%; os 10% finais só chegam quando o mundo confirma que está pronto
// (#loading.hidden → estado READY no HTML). Nunca regride, mesmo quando o grafo descobre mais módulos.
let shownPercent = 0;
function setLoadingProgress(done, total, stateLabel) {
  const count = Math.max(0, Number(done) || 0);
  const maximum = Math.max(0, Number(total) || 0);
  const percent = shownPercent = Math.max(shownPercent, maximum > 0 ? Math.max(0, Math.min(90, Math.round(count / maximum * 90))) : 0);
  if (loadingFill) loadingFill.style.width = percent + '%';
  if (loadingPercent) loadingPercent.textContent = percent + '%';
  if (loadingProgress) loadingProgress.setAttribute('aria-valuenow', String(percent));
  if (loadingProgressLabel) loadingProgressLabel.textContent = maximum > 0
    ? count + ' DE ' + maximum + ' MÓDULOS'
    : 'PREPARANDO RECURSOS';
  if (loadingState && stateLabel) loadingState.textContent = stateLabel;
  if (window.__sinsFlow) window.__sinsFlow.setProgress(percent, stateLabel); // espelha na barra da abertura (Mod 375)
}
const baseHref = new URL('./', import.meta.url).href;
let warm = null;
try {
  if (statusEl) statusEl.textContent = 'Preparando o mundo 3D…';
  if (loadingPanel) loadingPanel.dataset.state = 'loading';
  if (loadingCopy) loadingCopy.textContent = 'Organizando os módulos e recursos necessários para abrir este mundo.';
  setLoadingProgress(0, 0, 'PREPARANDO O MUNDO');
  let code = await loadText(new URL('./mundo-3d-prototype.js?v=' + BUILD, import.meta.url).href);
  code = await applyMod181(code);
  // Módulos locais importados pelo mundo (o código roda a partir de um blob, então os caminhos precisam ser absolutos).
  // Este mundo roda a partir de blob:, portanto NENHUM import relativo
  // sobrevive. Aceita imports com ?v=... para futuras mods, além de aspas duplas
  // e import side-effect. Reescreve para URLs HTTPS absolutos da pasta do jogo.
  code = code.replace(/\b(from\s+|import\s+)(['"])\.\/([a-z0-9-]+\.js)(?:\?[^'"]*)?\2/gi,
    function(_, prefix, quote, file) {
      return prefix + quote + new URL('./' + file + '?v=' + BUILD, import.meta.url).href + quote;
    });
  code = rewriteAssetPaths(code, baseHref);
  // P0 carregamento: baixa o grafo inteiro com tentativas limitadas ANTES do import nativo (que falha de uma vez só,
  // sem dizer qual arquivo, e guarda a falha). O import abaixo encontra tudo no cache HTTP.
  if (statusEl) statusEl.textContent = 'Baixando os módulos do mundo 3D…';
  warm = await warmModuleGraph(code, new URL('./mundo-3d-prototype.js?v=' + BUILD, import.meta.url).href, {
    importMap: pageImportMap(),
    onProgress: (d, t) => {
      setLoadingProgress(d, t, 'CARREGANDO MÓDULOS DO PLANETA');
      if (statusEl && (d % 5 === 0 || d === t)) statusEl.textContent = 'Baixando os módulos do mundo 3D… ' + d + '/' + t;
    }
  });
  setLoadingProgress(warm.modules || 0, warm.modules || 0, 'MONTANDO O MUNDO');
  if (loadingCopy) loadingCopy.textContent = 'Os módulos foram preparados. Finalizando a montagem do mundo 3D.';
  if (warm.failures.length) console.warn('[Mod 186] módulos que falharam ao baixar:', warm.failures);
  const blob = new Blob([code], { type: 'text/javascript' });
  await import(URL.createObjectURL(blob));
} catch (err) {
  const failures = (warm && warm.failures) || (err && err.url ? [{ url: err.url, reason: err.reason || err.message }] : []);
  console.error('[Mod 186]', err, failures);
  const msg = describeFailure(err, failures);
  if (statusEl) statusEl.textContent = 'Erro na Mod 186: ' + msg;
  if (loadingPanel) {
    loadingPanel.dataset.state = 'error';
    if (loadingState) loadingState.textContent = 'NÃO FOI POSSÍVEL PREPARAR O PLANETA';
    if (loadingCopy) loadingCopy.textContent = 'O carregamento foi interrompido. Confira o diagnóstico abaixo e tente novamente.';
    if (loadingError) loadingError.textContent = 'Falha ao montar o mundo 3D (Mod 186).\n' + msg;
    if (loadingRetry) loadingRetry.addEventListener('click', () => location.reload(), { once: true });
  }
}
