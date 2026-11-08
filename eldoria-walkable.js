/**
 * MOD 292 — superfícies caminháveis elevadas (deques, escadas, passarelas) SEM tocar na altura do terreno.
 *
 * O terreno continua sendo a função global de altura; isto é uma camada à parte, só para o JOGADOR:
 *  - superfícies: retângulos orientados com altura variando ao longo do eixo (lances de escada, patamares,
 *    plataformas, vãos de passarela) e anéis (deque em volta do tronco);
 *  - apoio: a superfície mais alta sob (x,z) que esteja no máximo um "degrau" acima dos pés (nunca teleporta
 *    para cima de um deque quando se anda por baixo dele);
 *  - paredes: guarda-corpos e paredes só bloqueiam na faixa de altura em que existem (por baixo do deque o
 *    caminho fica livre); círculos internos impedem entrar no tronco pelo anel;
 *  - sólidos: a lateral/baixo de uma escada bloqueia enquanto a altura livre for menor que a de uma pessoa.
 * Puro JS (testável sem WebGL).
 */
export const STEP_UP = .55, HEADROOM = 2.05, WALL_PAD = .3;

function rectLocal(r, x, z) { const dx = x - r.cx, dz = z - r.cz; return [dx * r.ux + dz * r.uz, -dx * r.uz + dz * r.ux]; }
function rectHeight(r, along) { const t = (along + r.hl) / (2 * r.hl); return r.y0 + (r.y1 - r.y0) * Math.max(0, Math.min(1, t)); }

export function createWalkables() {
  const surfaces = [], walls = [], solids = [];
  const api = {
    surfaces, walls, solids,
    /** Retângulo de a→b (centros das bordas curtas), largura w, alturas ya/yb nas pontas. */
    addSpan(a, b, w, ya, yb, name = 'span', solidBelow = false) {
      const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1;
      const r = { type: 'rect', name, cx: (a[0] + b[0]) / 2, cz: (a[1] + b[1]) / 2, ux: dx / L, uz: dz / L, hl: L / 2, hw: w / 2, y0: ya, y1: yb };
      surfaces.push(r); if (solidBelow) solids.push(r); return r;
    },
    addRect(cx, cz, hx, hz, y, name = 'deck', yaw = 0) {
      const r = { type: 'rect', name, cx, cz, ux: Math.cos(yaw), uz: Math.sin(yaw), hl: hx, hw: hz, y0: y, y1: y };
      surfaces.push(r); return r;
    },
    addRing(cx, cz, r0, r1, y, name = 'ring') { const r = { type: 'ring', name, cx, cz, r0, r1, y }; surfaces.push(r); return r; },
    /** Parede/guarda-corpo vertical de a→b, ativa entre yb e yt (alturas absolutas). */
    addWall(a, b, yb, yt, name = 'rail', thick = .22) { const w = { type: 'seg', name, ax: a[0], az: a[1], bx: b[0], bz: b[1], yb, yt, thick }; walls.push(w); return w; },
    /** Arco de guarda-corpo (anel externo) com aberturas [ângulo0, ângulo1] (rad, atan2(dz,dx)). */
    addArcWall(cx, cz, r, yb, yt, openings = [], name = 'arc') { const w = { type: 'arc', name, cx, cz, r, yb, yt, openings, thick: .22 }; walls.push(w); return w; },
    /** Círculo que não se pode atravessar entre yb e yt (tronco visto do deque). */
    addPillar(cx, cz, r, yb, yt, name = 'pillar') { const w = { type: 'circle', name, cx, cz, r, yb, yt }; walls.push(w); return w; },
    heightOn(s, x, z) {
      if (s.type === 'ring') { const d = Math.hypot(x - s.cx, z - s.cz); return d >= s.r0 && d <= s.r1 ? s.y : null; }
      const [along, side] = rectLocal(s, x, z); if (Math.abs(along) > s.hl || Math.abs(side) > s.hw) return null; return rectHeight(s, along);
    },
    /** Apoio: a superfície mais alta sob (x,z) até STEP_UP acima de refY. */
    supportAt(x, z, refY, step = STEP_UP) {
      let best = null;
      for (const s of surfaces) { const h = api.heightOn(s, x, z); if (h === null || h > refY + step) continue; if (!best || h > best.y) best = { y: h, s }; }
      return best;
    },
    /** Bloqueio do jogador em (x,z) com os pés em y. ground(x,z) = altura do terreno (para a altura livre). */
    blocked(x, z, y, ground = () => 0) {
      for (const w of walls) {
        if (y < w.yb - WALL_PAD || y > w.yt) continue;
        if (w.type === 'circle') { if (Math.hypot(x - w.cx, z - w.cz) < w.r) return w; continue; }
        if (w.type === 'arc') {
          const dx = x - w.cx, dz = z - w.cz, d = Math.hypot(dx, dz); if (Math.abs(d - w.r) > w.thick) continue;
          const a = Math.atan2(dz, dx); if (w.openings.some(([a0, a1]) => angIn(a, a0, a1))) continue; return w;
        }
        const dx = w.bx - w.ax, dz = w.bz - w.az, L = dx * dx + dz * dz, t = L ? Math.max(0, Math.min(1, ((x - w.ax) * dx + (z - w.az) * dz) / L)) : 0;
        if (Math.hypot(x - w.ax - dx * t, z - w.az - dz * t) < w.thick) return w;
      }
      for (const s of solids) {
        const h = api.heightOn(s, x, z); if (h === null) continue;
        if (h - y > STEP_UP && h - ground(x, z) < HEADROOM + .1) return s; // lateral/baixo da escada sem altura livre
      }
      return null;
    },
  };
  return api;
}
function angIn(a, a0, a1) { const n = v => ((v % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI; a = n(a); a0 = n(a0); a1 = n(a1); return a0 <= a1 ? a >= a0 && a <= a1 : a >= a0 || a <= a1; }

/**
 * Passo vertical do jogador (puro, para o jogo e os testes):
 *  - no chão: pisa na superfície/terreno; se o apoio sumir mais de 0,6 m abaixo (borda do deque), começa a cair;
 *  - no ar: gravidade e pouso no primeiro apoio abaixo dos pés.
 */
export function stepVertical(st, dt, { gravity = 24, terrain, support }) {
  const t = terrain, s = support(st.y), floor = s && s.y > t ? s.y : t;
  if (st.grounded) {
    if (floor < st.y - .6) { st.grounded = false; st.vy = 0; }
    else { st.y = floor; return st; }
  }
  st.vy -= gravity * dt; st.y += st.vy * dt;
  const s2 = support(st.y + .05), f2 = s2 && s2.y > t ? s2.y : t;
  if (st.y <= f2 && st.vy <= 0) { st.y = f2; st.vy = 0; st.grounded = true; st.landed = true; }
  return st;
}
