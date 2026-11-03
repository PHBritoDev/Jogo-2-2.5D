"use strict";

/**
 * Motor decisorio do agente visual. Sem modelo de linguagem externo e sem segredos.
 * Analisa os pixels capturados do WebGL e o estado QA real do jogo, e devolve
 * decisoes reativas. As "suspeitas" visuais NAO equivalem a bugs confirmados.
 */
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const round = x => +x.toFixed(3);

function analyzePixels(pixels, width, height, previous) {
  if (!width || !height || !pixels || pixels.length < width * height * 3)
    throw Error("Captura RGB invalida");
  const N = width * height;
  let luminosity = 0, luminositySq = 0, dark = 0, bright = 0, satur = 0;
  let centerBright = 0, centerCount = 0, centerDark = 0, diff = 0;
  const cols = 3, validPrev = previous && previous.length === pixels.length;
  for (let i = 0; i < N; i++) {
    const j = i * cols, r = pixels[j] / 255, g = pixels[j + 1] / 255, b = pixels[j + 2] / 255;
    const luma = .2126 * r + .7152 * g + .0722 * b;
    luminosity += luma; luminositySq += luma * luma;
    if (luma < .105) dark++;
    if (luma > .88) bright++;
    if (Math.max(r, g, b) - Math.min(r, g, b) > .32) satur++;
    const x = i % width, y = Math.floor(i / width);
    if (x >= width * .27 && x < width * .73 && y >= height * .23 && y < height * .77) {
      centerCount++;
      if (luma > .8) centerBright++;
      if (luma < .10) centerDark++;
    }
    if (validPrev) diff += (Math.abs(pixels[j] - previous[j]) +
      Math.abs(pixels[j + 1] - previous[j + 1]) +
      Math.abs(pixels[j + 2] - previous[j + 2])) / (3 * 255);
  }
  const avg = luminosity / N, std = Math.sqrt(Math.max(0, luminositySq / N - avg * avg));
  const m = {
    brightness: round(avg), contrast: round(std),
    darkFraction: round(dark / N), brightFraction: round(bright / N),
    vividFraction: round(satur / N),
    centerBrightFraction: round(centerBright / (centerCount || 1)),
    centerDarkFraction: round(centerDark / (centerCount || 1)),
    change: validPrev ? round(diff / N) : null
  };
  const flags = [];
  if (m.brightness < .055 || m.darkFraction > .96) flags.push("quadro_escuro");
  if (m.brightFraction > .56 || m.centerBrightFraction > .78) flags.push("brilho_encobrindo_tela");
  if (m.contrast < .045) flags.push("poucos_detalhes_visiveis");
  // Na primeira gravação real, geometrias escuras próximas cobriam o centro,
  // embora brilho e contraste globais parecessem normais.
  if (m.centerDarkFraction > .45 && m.centerDarkFraction - m.darkFraction > .08 &&
      m.contrast > .11) flags.push("possivel_objeto_escuro_obstruindo_camera");
  if (m.change !== null && m.change < .002) flags.push("imagem_quase_estatica");
  return { ...m, flags };
}

function decide({tick, vision, state, seen = {}, prevPosition, lastCastTick = -99}) {
  const dim = state?.dim || {}, player = state?.player || {}, foe = player.enemy || {};
  const hp = Number(dim.hp ?? 100);
  const distance = Number.isFinite(player.x) && Number.isFinite(foe.x)
    ? Math.hypot(player.x - foe.x, player.z - foe.z) : null;
  const activeHydra = !!dim.hydra, activeFlame = !!dim.moonFlames;
  const phase = dim.hydra?.phase || dim.moonFlames?.phase || "livre";
  const flags = vision?.flags || [];
  const warnOcclusion = flags.includes("brilho_encobrindo_tela") ||
    flags.includes("quadro_escuro") || flags.includes("poucos_detalhes_visiveis") ||
    flags.includes("possivel_objeto_escuro_obstruindo_camera") ||
    flags.includes("centro_sem_visibilidade") || flags.includes("baixo_detalhe_espacial");
  const verySlow = vision?.change !== null && vision?.change < .002;
  const stuck = prevPosition?.attemptedMove && Number.isFinite(player.x) &&
    Math.hypot(player.x - prevPosition.x, player.z - prevPosition.z) < .05;
  const decision = {
    reason: [], move: null, keys: [], cast: null,
    bossSkill: null, camera: null, heal: hp > 0 && hp < 95
  };
  if (!dim.battle?.active || !dim.visible || dim.profile !== "zarkhael") {
    decision.reason.push("aguardando_batalha_real");
    return decision;
  }
  if (!seen.s1) {
    decision.bossSkill = "s1";
    decision.reason.push("testar_primeiro_poder");
  } else if (seen.hydraFinished && !seen.s2 && tick >= 7 && !activeHydra) {
    decision.bossSkill = "s2";
    decision.reason.push("hidra_terminou_trocar_poder");
  }
  if (hp < 95 && hp > 0) decision.reason.push("recuperar_vida_somente_QA");
  if (warnOcclusion) {
    decision.camera = { distance: 24, height: 10, orbit: tick % 4 };
    decision.reason.push("ajustar_visao_por_pixels");
  } else if (tick % 6 === 0) {
    decision.camera = { distance: 16, height: 7, orbit: tick / 6 };
    decision.reason.push("inspecionar_novo_angulo");
  }
  if (activeHydra || activeFlame) {
    decision.move = tick % 2 ? "a" : "d";
    if (tick % 3 === 0) decision.keys.push("f"); // dash para desviar de poder
    decision.reason.push("desviar_habilidade_" + phase);
  } else if (distance !== null && distance > 19) {
    decision.move = "w"; // avanca para tentar aproximar de ataques
    decision.reason.push("aproximar_do_bispo");
  } else if (distance !== null && distance < 6) {
    decision.move = "s";
    decision.keys.push("j");
    decision.reason.push("manter_distancia_combate");
  } else {
    decision.move = tick % 2 ? "d" : "a";
    decision.reason.push("combate_lateral");
  }
  if (stuck && tick % 4 === 0) {
    decision.keys.push(" ");
    decision.reason.push("possivel_bloqueio_testar_pulo");
  }
  if (verySlow && tick >= 4 && tick % 5 === 0) {
    decision.keys.push("j");
    decision.reason.push("imagem_quase_estatica_testar_ataque");
  }
  if (distance !== null && distance <= 23 && tick - lastCastTick >= 4 && tick >= 2) {
    decision.cast = tick % 8 < 4 ? "magic" : "magic2";
    decision.reason.push("contra_atacar_ao_alcance");
  }
  return decision;
}
module.exports = { analyzePixels, decide };
