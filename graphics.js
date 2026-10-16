'use strict';

/* MOD 97 — qualidade gráfica configurável e ajuste automático com histerese. */
(function () {
  const STORAGE_KEY = 'batalha7-graphics-v1';
  const PROFILE_NAMES = {
    'very-low': 'Muito Baixo',
    low: 'Baixo',
    medium: 'Médio',
    high: 'Alto',
    ultra: 'Ultra',
    custom: 'Personalizado',
    auto: 'Automático'
  };
  const PROFILES = {
    'very-low': { resolutionScale: 0.55, shadowQuality: 0, particles: 0.2, effects: 0.4 },
    low:       { resolutionScale: 0.7,  shadowQuality: 1, particles: 0.4, effects: 0.6 },
    medium:    { resolutionScale: 0.85, shadowQuality: 2, particles: 0.7, effects: 0.8 },
    high:      { resolutionScale: 1,    shadowQuality: 3, particles: 1,   effects: 1 },
    ultra:     { resolutionScale: 1.35, shadowQuality: 4, particles: 1.4, effects: 1.35 }
  };
  const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
  const copy = value => ({
    resolutionScale: value.resolutionScale,
    shadowQuality: value.shadowQuality,
    particles: value.particles,
    effects: value.effects
  });
  const validMode = value => value === 'auto' || value === 'custom' || Object.prototype.hasOwnProperty.call(PROFILES, value);

  function detectBaseline() {
    const memory = Number(navigator.deviceMemory) || 0;
    const cores = Number(navigator.hardwareConcurrency) || 0;
    if ((memory && memory <= 3) || (cores && cores <= 4)) return 'low';
    if (memory >= 8 && cores >= 8) return 'ultra';
    if (memory >= 4 && cores >= 4) return 'high';
    return 'medium';
  }

  let mode = 'auto';
  let custom = copy(PROFILES.high);
  let autoCeilingName = detectBaseline();
  let autoCeiling = copy(PROFILES[autoCeilingName]);
  let automatic = copy(autoCeiling);
  let initialized = false;
  let currentFps = 0;
  let sampleElapsed = 0;
  let sampleFrames = 0;
  let lowFpsSeconds = 0;
  let highFpsSeconds = 0;
  let lastAdjustment = -Infinity;

  function currentSettings() {
    if (mode === 'custom') return custom;
    if (mode === 'auto') return automatic;
    return PROFILES[mode] || PROFILES.high;
  }

  function persist() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode: mode, custom: custom }));
    } catch (err) {
      // Local storage can be disabled in private browsing; graphics still work for this session.
    }
  }

  function profileLabel() {
    return PROFILE_NAMES[mode] || PROFILE_NAMES.medium;
  }

  function describeShadows(value) {
    return ['Desligadas', 'Muito baixas', 'Baixas', 'Altas', 'Ultra'][Math.round(value)] || 'Altas';
  }

  function updateUI() {
    const profile = document.getElementById('graphics-profile');
    if (!profile) return;
    const settings = currentSettings();
    const customMode = mode === 'custom';
    profile.value = mode;

    const controls = [
      ['graphics-resolution', 'resolutionScale', value => Math.round(value * 100)],
      ['graphics-shadows', 'shadowQuality', value => Math.round(value)],
      ['graphics-particles', 'particles', value => Math.round(value * 100)],
      ['graphics-effects', 'effects', value => Math.round(value * 100)]
    ];
    controls.forEach(function (entry) {
      const input = document.getElementById(entry[0]);
      if (!input) return;
      input.value = String(entry[2](settings[entry[1]]));
      input.disabled = !customMode;
    });

    const resolutionValue = document.getElementById('graphics-resolution-value');
    const shadowsValue = document.getElementById('graphics-shadows-value');
    const particlesValue = document.getElementById('graphics-particles-value');
    const effectsValue = document.getElementById('graphics-effects-value');
    if (resolutionValue) resolutionValue.textContent = Math.round(settings.resolutionScale * 100) + '%';
    if (shadowsValue) shadowsValue.textContent = describeShadows(settings.shadowQuality);
    if (particlesValue) particlesValue.textContent = Math.round(settings.particles * 100) + '%';
    if (effectsValue) effectsValue.textContent = Math.round(settings.effects * 100) + '%';

    const status = document.getElementById('graphics-status');
    if (status) {
      const fpsText = currentFps > 0 ? Math.round(currentFps) + ' FPS' : 'medindo FPS';
      status.textContent = mode === 'auto'
        ? 'Automático · base estimada: ' + PROFILE_NAMES[autoCeilingName] + ' · ' + fpsText
        : 'Perfil ' + profileLabel() + ' · ' + fpsText;
    }
  }

  function emitChange() {
    persist();
    updateUI();
    window.dispatchEvent(new Event('graphics-quality-change'));
  }

  function setProfile(nextMode) {
    if (!validMode(nextMode)) return;
    if (nextMode === 'auto') {
      autoCeilingName = detectBaseline();
      autoCeiling = copy(PROFILES[autoCeilingName]);
      automatic = copy(autoCeiling);
      lowFpsSeconds = 0;
      highFpsSeconds = 0;
      sampleElapsed = 0;
      sampleFrames = 0;
    } else if (nextMode === 'custom' && mode !== 'custom') {
      custom = copy(currentSettings());
    }
    mode = nextMode;
    emitChange();
  }

  function setCustomValue(key, value) {
    if (!Object.prototype.hasOwnProperty.call(custom, key)) return;
    if (mode !== 'custom') {
      custom = copy(currentSettings());
      mode = 'custom';
    }
    if (key === 'resolutionScale') custom[key] = clamp(value, 0.5, 1.5);
    else if (key === 'shadowQuality') custom[key] = Math.round(clamp(value, 0, 4));
    else if (key === 'particles') custom[key] = clamp(value, 0, 1.5);
    else if (key === 'effects') custom[key] = clamp(value, 0.25, 1.5);
    emitChange();
  }

  function reduceAutomaticQuality() {
    // Remova primeiro efeitos atmosféricos e partículas; só depois sombras e resolução.
    if (automatic.effects > 0.45) automatic.effects = Math.max(0.45, automatic.effects - 0.15);
    else if (automatic.particles > 0.25) automatic.particles = Math.max(0.25, automatic.particles - 0.2);
    else if (automatic.shadowQuality > 0) automatic.shadowQuality -= 1;
    else if (automatic.resolutionScale > 0.62) automatic.resolutionScale = Math.max(0.62, automatic.resolutionScale - 0.08);
    else return false;
    return true;
  }

  function emergencyQualityDrop() {
    // Uma queda severa (ex.: entrada na arena 3D) exige resposta mais rápida
    // que o ajuste normal, que espera vários segundos para evitar oscilações.
    let changed = false;
    if (automatic.effects > 0.45) { automatic.effects = Math.max(0.45, automatic.effects - 0.25); changed = true; }
    if (automatic.particles > 0.25) { automatic.particles = Math.max(0.25, automatic.particles - 0.3); changed = true; }
    if (automatic.shadowQuality > 0) { automatic.shadowQuality = Math.max(0, automatic.shadowQuality - 1); changed = true; }
    if (automatic.resolutionScale > 0.62) { automatic.resolutionScale = Math.max(0.62, automatic.resolutionScale - 0.12); changed = true; }
    return changed;
  }

  function restoreAutomaticQuality() {
    // Recupera gradualmente, sem alternar presets inteiros nem criar oscilações.
    if (automatic.resolutionScale < autoCeiling.resolutionScale) {
      automatic.resolutionScale = Math.min(autoCeiling.resolutionScale, automatic.resolutionScale + 0.08);
    } else if (automatic.shadowQuality < autoCeiling.shadowQuality) {
      automatic.shadowQuality += 1;
    } else if (automatic.particles < autoCeiling.particles) {
      automatic.particles = Math.min(autoCeiling.particles, automatic.particles + 0.15);
    } else if (automatic.effects < autoCeiling.effects) {
      automatic.effects = Math.min(autoCeiling.effects, automatic.effects + 0.12);
    } else return false;
    return true;
  }

  function observeFrame(dt, isPlaying) {
    if (!isPlaying || document.hidden || !Number.isFinite(dt) || dt <= 0 || dt > 0.25) return;
    sampleElapsed += dt;
    sampleFrames++;
    if (sampleElapsed < 1.25) return;

    currentFps = sampleFrames / sampleElapsed;
    const measuredSeconds = sampleElapsed;
    sampleElapsed = 0;
    sampleFrames = 0;
    if (mode !== 'auto') {
      updateUI();
      return;
    }

    if (currentFps < 48) {
      lowFpsSeconds += measuredSeconds;
      highFpsSeconds = 0;
    } else if (currentFps > 58) {
      highFpsSeconds += measuredSeconds;
      lowFpsSeconds = 0;
    } else {
      lowFpsSeconds = 0;
      highFpsSeconds = 0;
    }

    const now = performance.now();
    // Se a luta cai para perto de 20 FPS, não esperar os 4,5 s do ajuste comum.
    // Atua apenas no modo automático e mantém os limites seguros de qualidade.
    if (mode === 'auto' && currentFps < 30 && now - lastAdjustment >= 1800) {
      lastAdjustment = now;
      lowFpsSeconds = 0;
      if (emergencyQualityDrop()) { emitChange(); return; }
    }
    if (lowFpsSeconds >= 4.5 && now - lastAdjustment >= 6000) {
      lowFpsSeconds = 0;
      lastAdjustment = now;
      if (reduceAutomaticQuality()) emitChange();
    } else if (highFpsSeconds >= 12 && now - lastAdjustment >= 10000) {
      highFpsSeconds = 0;
      lastAdjustment = now;
      if (restoreAutomaticQuality()) emitChange();
    }
    updateUI();
  }

  function bindRange(id, key, convert) {
    const input = document.getElementById(id);
    if (!input) return;
    input.addEventListener('input', function () {
      setCustomValue(key, convert(Number(input.value)));
    });
  }

  function init() {
    if (initialized) return;
    initialized = true;
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved && validMode(saved.mode)) {
        mode = saved.mode;
        if (saved.custom && typeof saved.custom === 'object') {
          custom = {
            resolutionScale: clamp(saved.custom.resolutionScale, 0.5, 1.5),
            shadowQuality: Math.round(clamp(saved.custom.shadowQuality, 0, 4)),
            particles: clamp(saved.custom.particles, 0, 1.5),
            effects: clamp(saved.custom.effects, 0.25, 1.5)
          };
        }
      }
    } catch (err) {
      // Ignore malformed or inaccessible saved settings.
    }
    if (mode === 'auto') {
      autoCeilingName = detectBaseline();
      autoCeiling = copy(PROFILES[autoCeilingName]);
      automatic = copy(autoCeiling);
    }

    const profile = document.getElementById('graphics-profile');
    if (profile) profile.addEventListener('change', function () { setProfile(profile.value); });
    bindRange('graphics-resolution', 'resolutionScale', value => value / 100);
    bindRange('graphics-shadows', 'shadowQuality', value => value);
    bindRange('graphics-particles', 'particles', value => value / 100);
    bindRange('graphics-effects', 'effects', value => value / 100);
    updateUI();
  }

  window.GraphicsQuality = {
    init: init,
    get: function (key) {
      const settings = currentSettings();
      return Object.prototype.hasOwnProperty.call(settings, key) ? settings[key] : 0;
    },
    getSettings: function () { return copy(currentSettings()); },
    getMode: function () { return mode; },
    setProfile: setProfile,
    setCustomValue: setCustomValue,
    pixelRatio: function (maxDpr) {
      const deviceRatio = Math.max(0.5, Number(window.devicePixelRatio) || 1);
      return clamp(deviceRatio * currentSettings().resolutionScale, 0.5, Number(maxDpr) || 3);
    },
    webglPowerPreference: function () {
      const settings = currentSettings();
      return (mode === 'high' || mode === 'ultra' || (mode === 'auto' && autoCeilingName === 'ultra') ||
        (mode === 'custom' && settings.resolutionScale >= 1.25))
        ? 'high-performance'
        : 'low-power';
    },
    observeFrame: observeFrame,
    profileName: profileLabel
  };
})();
