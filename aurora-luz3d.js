/**
 * Mod 327 (adendo do criador) — a aurora ILUMINA o mundo e a água, sem luz extra, passe extra nem sombra física.
 *
 *  Antes: só um tom chapado no hemisfério/névoa (o mapa inteiro tingido por igual, nada no relevo nem na água).
 *  Agora, com UM conjunto de uniforms compartilhado (atualizado 1× por quadro e zerado quando a aurora some ou o
 *  herói está em lugar fechado):
 *   • solo/rochas: irradiância colorida que segue a cor viva da aurora, multiplicada pelo albedo (luz, não tinta),
 *     com FAIXAS largas e lentas que correm pelo chão na direção dos arcos e "oclusão" artística pelas formas
 *     (encostas íngremes e ravinas recebem menos que o chão aberto voltado para o céu);
 *   • água: reflexo colorido animado pelo fresnel e pela normal ondulada (a direção da visão importa), sem espelho.
 *  O shader só trabalha quando uAurK > 0 (ramo uniforme). Mesma chave de programa sempre (sem recompilar à noite).
 */
let U = null;
let graphicsModeCache = null, graphicsModeCheckedAt = -Infinity;
function readAuroraGraphicsMode(time) {
  if (!Number.isFinite(time) || time < graphicsModeCheckedAt || time - graphicsModeCheckedAt >= .5) {
    graphicsModeCheckedAt = Number.isFinite(time) ? time : 0;
    try { graphicsModeCache = globalThis.localStorage?.getItem('seven-sins-3d-graphics') || null; }
    catch { graphicsModeCache = null; }
  }
  return graphicsModeCache;
}
/** Uniforms compartilhados (singleton por THREE). */
export function auroraUniforms(T) {
  // o carregador do jogo (mod181-loader) importa o mundo com ?v=BUILD e os módulos aninhados sem: o MESMO arquivo vira
  // duas instâncias. Os uniforms moram no globalThis para que mundo, jornada e água leiam o mesmo objeto.
  if (!U) {
    U = globalThis.__aurora327U || (globalThis.__aurora327U = { uAurC: { value: new T.Color(0, 0, 0) }, uAurK: { value: 0 }, uAurT: { value: 0 }, uAurD: { value: new T.Vector2(1, 0) }, uAurLow: { value: 0 } });
    // Também cobre uma segunda instância do módulo que encontre uniforms criados antes desta variante.
    if (!U.uAurLow) U.uAurLow = { value: 0 };
  }
  return U;
}
/** Cor viva da aurora no tempo (mesma paleta do céu: rosa → violeta → azul, com pulsos esverdeados raros). Pura. */
export function auroraColor(t) {
  const a = .5 + .5 * Math.sin(t * .045), b = .5 + .5 * Math.sin(t * .031 + 2.1), g = Math.max(0, Math.sin(t * .019 + 4)) ** 3;
  const pink = [.95, .36, .82], vio = [.56, .34, 1], blue = [.34, .56, 1], green = [.3, .95, .62];
  const c = [0, 1, 2].map(i => { const pv = pink[i] + (vio[i] - pink[i]) * a; return pv + (blue[i] - pv) * b * .55; });
  return c.map((v, i) => v + (green[i] - v) * g * .35);
}
/** Intensidade efetiva: nível do céu × céu aberto; 0 em lugar fechado (caverna, interior, dimensão). Pura. */
export function auroraLightK(level, closed, low) { return closed || !(level > .01) ? 0 : level * (low ? .75 : 1); }
/** Perfil explícito sempre vence o hint compacto; auto mantém o fallback móvel já usado pelo mundo. */
export function auroraLowProfile(lowHint, mode) {
  if (mode === 'low') return true;
  if (mode === 'medium' || mode === 'high' || mode === 'max') return false;
  return !!lowHint;
}
export function updateAuroraLight(T, { level = 0, time = 0, closed = false, low = false, dir = null }) {
  const lowMode = auroraLowProfile(low, readAuroraGraphicsMode(time));
  const u = auroraUniforms(T), k = auroraLightK(level, closed, lowMode); u.uAurK.value = k; u.uAurT.value = time; u.uAurLow.value = lowMode ? 1 : 0;
  if (k > 0) { const c = auroraColor(time); u.uAurC.value.setRGB(c[0], c[1], c[2]); if (dir) u.uAurD.value.set(dir.x, dir.z).normalize(); }
  return k;
}
const PARS = 'uniform vec3 uAurC;uniform float uAurK,uAurT;uniform vec2 uAurD;';
/** GLSL: luz da aurora num ponto do chão (wp mundo, n normal mundo). */
const GROUND = `vec3 aurGround(vec3 wp,vec3 n){
 vec2 q=wp.xz;float along=dot(q,uAurD),side=dot(q,vec2(-uAurD.y,uAurD.x));
 float band=.5+.5*sin(along*.016+uAurT*.045+1.6*sin(side*.0055+uAurT*.017));
 float band2=.5+.5*sin(along*.041-uAurT*.07+side*.01);
 float open=smoothstep(.35,.95,n.y);
 return uAurC*uAurK*(.3+.7*band*band)*(.75+.25*band2)*open;}`;
/** Injeta a luz da aurora num MeshStandard/Lambert/Phong existente (encadeia onBeforeCompile e a chave do programa). */
export function patchAuroraGround(T, material, strength = .8) {
  const u = auroraUniforms(T), prev = material.onBeforeCompile, baseKey = material.customProgramCacheKey(); // chave do ORIGINAL (fogLift etc.), lida antes de trocar o onBeforeCompile
  material.onBeforeCompile = (sh, r) => {
    if (prev) prev(sh, r); Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vAurWp;').replace('#include <project_vertex>', '#include <project_vertex>\n{vec4 aw=vec4(transformed,1.);\n#ifdef USE_INSTANCING\naw=instanceMatrix*aw;\n#endif\nvAurWp=(modelMatrix*aw).xyz;}');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vAurWp;' + PARS + GROUND)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\nif(uAurK>.001){vec3 aurN=normalize((vec4(normal,0.)*viewMatrix).xyz);totalEmissiveRadiance+=aurGround(vAurWp,aurN)*(diffuseColor.rgb*${strength.toFixed(3)}+${(strength * .0075).toFixed(4)});}`);
  };
  material.customProgramCacheKey = () => baseKey + '|aurora327';
  material.needsUpdate = true;
  return material;
}
/** GLSL para a água: reflexo colorido animado (wN normal ondulada em mundo, vd direção da câmera, fres fresnel). */
export const AURORA_WATER_PARS = PARS;
export const AURORA_WATER = `if(uAurK>.001){vec3 avd=normalize(cameraPosition-vWp);vec3 aR=reflect(-avd,wN);float up=smoothstep(.04,.5,aR.y);
 float curt=.5+.5*sin(dot(aR.xz/(aR.y+.25),uAurD)*3.1+uAurT*.11+wn(vWp.xz*.05+uAurT*.03)*2.4);
 float rays=.55+.45*sin(dot(aR.xz,vec2(-uAurD.y,uAurD.x))*19.+uAurT*.23);
 totalEmissiveRadiance+=uAurC*uAurK*up*curt*curt*rays*(.25+.95*wFres)*(1.-wFoam)*.9;}`;
