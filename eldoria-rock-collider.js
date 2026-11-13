/**
 * Renascimento de Eldória — Fase 1: colisão de rochas coerente com o que se vê (lógica pura, testável em Node).
 *
 * Antes, cada rocha era um cilindro infinito de raio 0,74·r. Rochas até 0,68 m eram ignoradas, e o herói
 * atravessava a malha delas. As acima disso viravam paredes com raio menor que o visual, e o corpo entrava um
 * quarto da rocha.
 *
 * Agora cada rocha é um domo (meio elipsoide) com base, altura e raio do próprio registro:
 *  - Apoio: os pés sobem no domo quando o degrau até ele é baixo (STEP). Pedrinhas viram relevo e não somem por
 *    dentro do corpo.
 *  - Bloqueio: um ponto do domo mais alto que pés + STEP é parede. A rocha média bloqueia andando, mas aceita o
 *    herói que pula por cima (os pés acima do domo não colidem e pousam no topo). A rocha grande não se escala.
 *  - Quem ficou dentro de um domo (por empurrão ou teleporte) sempre pode sair: só o movimento para fora é aceito.
 * Só o herói usa estas regras. NPCs, câmera e IA continuam com o teste antigo e barato (sem mudança de
 * comportamento).
 */
export const ROCK_STEP = .42;

/** Raio de colisão do domo (o registro já guarda ~0,9 do raio visual). */
export function rockRadius(rock) { return rock.radius; }

/** Altura do domo em (x,z) ou null fora dele. `groundAt` só é usado quando a rocha não tem base registrada. */
export function rockDomeHeight(rock, x, z, groundAt) {
  const R = rockRadius(rock), dx = x - rock.x, dz = z - rock.z, d2 = dx * dx + dz * dz;
  if (d2 >= R * R) return null;
  const base = rock.base !== undefined && rock.base !== null ? rock.base : (groundAt ? groundAt(rock.x, rock.z) : 0);
  return base + rock.height * Math.sqrt(1 - d2 / (R * R));
}

/** Rocha baixa: o herói sobe por cima andando. Rocha alta: só por cima (pulo), nunca escalando a parede.
 *  Na rocha alta vale o limite de declive: onde o flanco é mais íngreme que ROCK_MAX_SLOPE e está acima dos pés, é
 *  parede (mesmo que a base enterrada faça o domo "nascer" rente ao chão). No topo, mais suave, dá para andar. */
export const LOW_ROCK = .6, TALL_SKIN = .01, ROCK_MAX_SLOPE = 1.2; // ~50° — no flanco íngreme nem 1 cm de subida (impede o avanço milimétrico)

/** Inclinação do domo (dh/dd) a uma distância d do centro. */
export function rockSlope(rock, d) {
  const R = rockRadius(rock), u = Math.min(.9995, d / R);
  return rock.height * u / (R * Math.sqrt(1 - u * u));
}
export function isLowRock(rock) { return rock.height <= LOW_ROCK; }

/** O ponto (x,z) bloqueia o herói com os pés em `feetY`? `fromX/fromZ` = posição atual (para sair de dentro). */
export function rockBlocks(rock, x, z, feetY, groundAt, fromX = null, fromZ = null) {
  const h = rockDomeHeight(rock, x, z, groundAt); if (h === null) return false;
  const low = isLowRock(rock), lim = low ? ROCK_STEP : TALL_SKIN;
  if (h - feetY <= lim) return false;
  if (!low && rockSlope(rock, Math.hypot(x - rock.x, z - rock.z)) <= ROCK_MAX_SLOPE && h - feetY <= ROCK_STEP) return false; // topo suave

  if (fromX !== null) { const h0 = rockDomeHeight(rock, fromX, fromZ, groundAt); if (h0 !== null && h0 - feetY > lim && h < h0) return false; } // já dentro: deixa sair
  return true;
}

/** Apoio mais alto entre as rochas sob (x,z), até `step` acima de refY. `steep` = pousou no flanco íngreme de uma rocha
 *  alta (o chamador faz o herói escorregar para fora, na direção nx/nz). */
export function rockSupportAt(rocks, x, z, refY, groundAt, step = ROCK_STEP) {
  let best = null;
  for (const r of rocks) {
    const h = rockDomeHeight(r, x, z, groundAt); if (h === null) continue;
    const d = Math.hypot(x - r.x, z - r.z), steep = !isLowRock(r) && rockSlope(r, d) > ROCK_MAX_SLOPE;
    if (h > refY + (isLowRock(r) ? step : (steep ? 0 : step))) continue; // flanco íngreme não ergue ninguém
    if (!best || h > best.y) best = { y: h, rock: r, steep, nx: d > 1e-4 ? (x - r.x) / d : 1, nz: d > 1e-4 ? (z - r.z) / d : 0 };
  }
  return best;
}

/** Alguma rocha bloqueia (x,z) para pés em feetY? */
export function rocksBlock(rocks, x, z, feetY, groundAt, fromX = null, fromZ = null) {
  for (const r of rocks) if (rockBlocks(r, x, z, feetY, groundAt, fromX, fromZ)) return r;
  return null;
}
