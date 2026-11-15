/**
 * Mod 320 — trajetória ÚNICA da Extinção Orbital, compartilhada pela lógica (dano por contato) e pelo desenho (meteoro,
 * sombra, explosão): o que o jogador vê é exatamente o volume que fere. Sem dependências (módulo puro).
 */
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
/** Direção de chegada (unitária, descendo) e ponto de impacto travado: as MESMAS para a lógica e o desenho. */
export function orbitalPath(s) {
  if (!s.path) return null; const T = s.T, P = s.path, out = { ix: P.ix, iy: P.iy, iz: P.iz, dx: P.dx, dy: P.dy, dz: P.dz, r: T.meteorR };
  // distância do centro do meteoro ao ponto final ao longo da trajetória: chega a 0 no fim da queda (centro enterrado sink·R)
  const u = s.phase === 'fall' ? clamp(s.t / T.fall, 0, 1) : s.phase === 'impact' || s.phase === 'after' ? 1 : 0;
  out.dist = s.phase === 'entry' ? T.approach * (1 + 1.6 * (1 - clamp(s.t / T.entry, 0, 1))) : T.approach * (1 - u) ** 1.35;
  out.u = u; return out;
}
export function orbitalMeteorAt(s, dist, o = {}) { const P = s.path; o.x = P.ix - P.dx * dist; o.y = P.iy + s.T.meteorR * (1 - 2 * s.T.sink) - P.dy * dist; o.z = P.iz - P.dz * dist; return o; }
/** Distância entre os segmentos [p0,p1] e [q0,q1] (3D): teste contínuo (swept) esfera×cápsula. */
export function segSegDist(p0, p1, q0, q1) {
  const ux = p1.x - p0.x, uy = p1.y - p0.y, uz = p1.z - p0.z, vx = q1.x - q0.x, vy = q1.y - q0.y, vz = q1.z - q0.z, wx = p0.x - q0.x, wy = p0.y - q0.y, wz = p0.z - q0.z;
  const a = ux * ux + uy * uy + uz * uz, b = ux * vx + uy * vy + uz * vz, c = vx * vx + vy * vy + vz * vz, d = ux * wx + uy * wy + uz * wz, e = vx * wx + vy * wy + vz * wz, D = a * c - b * b;
  let sN, sD = D, tN, tD = D;
  if (D < 1e-9) { sN = 0; sD = 1; tN = e; tD = c; } else { sN = b * e - c * d; tN = a * e - b * d; if (sN < 0) { sN = 0; tN = e; tD = c; } else if (sN > sD) { sN = sD; tN = e + b; tD = c; } }
  if (tN < 0) { tN = 0; if (-d < 0) sN = 0; else if (-d > a) sN = sD; else { sN = -d; sD = a; } } else if (tN > tD) { tN = tD; if (-d + b < 0) sN = 0; else if (-d + b > a) sN = sD; else { sN = -d + b; sD = a; } }
  const sc = Math.abs(sN) < 1e-9 ? 0 : sN / sD, tc = Math.abs(tN) < 1e-9 ? 0 : tN / tD;
  const x = wx + sc * ux - tc * vx, y = wy + sc * uy - tc * vy, z = wz + sc * uz - tc * vz; return Math.hypot(x, y, z);
}
/** Raio da frente da explosão t s depois do impacto (o domo desenhado usa este MESMO raio; altura = blastH/blastR). */
export function orbitalBlastR(T, t) { const k = clamp(t / T.blastGrow, 0, 1); return T.blastR * (1 - (1 - k) ** 2.2); }
