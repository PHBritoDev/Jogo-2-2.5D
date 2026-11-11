/**
 * Mod 314 — volumes de energia compartilhados (setor que se expande / crescente que viaja). Interface única de hit detection
 * para a onda da espada do protagonista e os rasgos das garras do Demônio1 — cada um com coreografia e estética próprias.
 */
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
/* Mod 314: a onda guarda o próprio raio (antes o raio era zerado e a onda só acertava por dentro do corpo do alvo,
   e o desenho escalado pelo raio ficava invisível). */
/** Cria o volume de energia de um golpe na direção do herói (setor que se expande ou onda que viaja). */
export function makeEnergy(spec, from, yaw, height = 1.05) {
  return { ...spec, x: from.x, y: from.y + height, z: from.z, yaw, age: 0, radius: spec.kind === 'sector' ? spec.r0 : (spec.radius || 1), travel: 0, done: false };
}
/** Avança o volume; devolve true quando a frente da energia alcança o corpo do alvo (dano neste quadro). */
export function energyStep(e, dt, target, { blocked = () => false } = {}) {
  e.age += dt;
  if (e.kind === 'sector') e.radius = Math.min(e.r1, e.radius + e.speed * dt);
  else e.travel = Math.min(e.range, e.travel + e.speed * dt);
  if (e.age >= e.life || (e.kind === 'sector' ? e.radius >= e.r1 : e.travel >= e.range)) e.done = true;
  if (!target || !target.alive) return false;
  return energyTouches(e, target, blocked);
}
export function energyTouches(e, target, blocked = () => false) {
  const r = target.radius || .5, h = target.height || 1.7, ty = target.y;
  if (e.kind === 'sector') {
    const dx = target.x - e.x, dz = target.z - e.z, d = Math.hypot(dx, dz);
    // banda radial da frente do setor (a energia já passou ou ainda não chegou → não acerta)
    if (d + r < e.radius - e.band || d - r > e.radius) return false;
    const a = Math.abs(wrap(Math.atan2(dx, dz) - e.yaw));
    if (e.span < Math.PI * 2 - 1e-3 && a > e.span / 2 + Math.atan2(r, Math.max(.3, d))) return false;
    // altura do disco inclinado (roll) no ponto do alvo
    const side = dx * Math.cos(e.yaw) - dz * Math.sin(e.yaw), planeY = e.y + Math.tan(e.roll || 0) * side;
    if (Math.abs(ty - planeY) > (e.half || .55) + h * .5) return false;
  } else {
    const fx = Math.sin(e.yaw), fz = Math.cos(e.yaw), cx = e.x + fx * e.travel, cz = e.z + fz * e.travel;
    const dx = target.x - cx, dz = target.z - cz, along = dx * fx + dz * fz, side = dx * fz - dz * fx, dy = ty - e.y;
    // crescente inclinado pelo roll: largura no plano do arco, espessura fina na direção do avanço
    const across = side * Math.cos(e.roll) + dy * Math.sin(e.roll);
    if (Math.abs(along) > e.band * .5 + r) return false;
    if (Math.abs(across) > e.radius + r) return false;
    if (Math.abs(-side * Math.sin(e.roll) + dy * Math.cos(e.roll)) > .5 + h * .45) return false;
  }
  return !blocked({ x: e.x, y: e.y, z: e.z }, { x: target.x, y: ty, z: target.z });
}
