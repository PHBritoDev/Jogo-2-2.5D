/**
 * MOD 202 — Arte própria (SVG) das Palavras, ultimates, espadas e categorias da Loja e do HUD.
 * Nenhuma imagem externa: tudo é desenhado aqui, escala em qualquer tela e não pesa no carregamento.
 */
let uid = 0;

const GOLD = ['#fff6cf', '#f3c25a', '#a8741c'];
const ICE = ['#ffffff', '#9fd0ff', '#3b6fc4'];

function defs(id, light, dark) {
  return '<defs>' +
    '<radialGradient id="bg' + id + '" cx="50%" cy="58%" r="70%"><stop offset="0" stop-color="' + dark[0] + '"/><stop offset="1" stop-color="#05060c"/></radialGradient>' +
    '<linearGradient id="bl' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + light[0] + '"/><stop offset=".55" stop-color="' + light[1] + '"/><stop offset="1" stop-color="' + light[2] + '"/></linearGradient>' +
    '<radialGradient id="gl' + id + '" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="' + light[1] + '" stop-opacity=".75"/><stop offset="1" stop-color="' + light[1] + '" stop-opacity="0"/></radialGradient>' +
    '</defs>';
}

/** Lâmina apontando para cima, pivô na base (cx, cy). */
function blade(id, cx, cy, len, w, angle, extra = '') {
  const t = cy - len, g = cy - len * .16;
  return '<g transform="rotate(' + angle + ' ' + cx + ' ' + cy + ')"' + extra + '>' +
    '<path d="M' + cx + ' ' + t + ' L' + (cx + w) + ' ' + (t + len * .16) + ' L' + (cx + w * .7) + ' ' + g + ' L' + (cx - w * .7) + ' ' + g + ' L' + (cx - w) + ' ' + (t + len * .16) + 'Z" fill="url(#bl' + id + ')" stroke="#fff8dc" stroke-opacity=".7" stroke-width=".8"/>' +
    '<path d="M' + cx + ' ' + (t + 3) + ' L' + cx + ' ' + (g - 1) + '" stroke="#fff" stroke-opacity=".75" stroke-width=".9"/>' +
    '<rect x="' + (cx - w * 1.5) + '" y="' + (cy - len * .16 + 1) + '" width="' + (w * 3) + '" height="2.6" rx="1.2" fill="#7a5410"/>' +
    '<rect x="' + (cx - 1.4) + '" y="' + (cy - len * .16 + 3.5) + '" width="2.8" height="' + (len * .1) + '" fill="#5a3d0a"/>' +
    '</g>';
}

function sparks(color, n, seed) {
  let s = '', r = seed;
  for (let i = 0; i < n; i++) { r = (r * 9301 + 49297) % 233280; const x = 6 + (r / 233280) * 84; r = (r * 9301 + 49297) % 233280; const y = 6 + (r / 233280) * 84;
    s += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (0.7 + (i % 3) * .45) + '" fill="' + color + '" opacity="' + (0.45 + (i % 4) * .13) + '"/>'; }
  return s;
}

const ART = {
  // Espadas da Palavra — três lâminas de luz em leque.
  magic(id) {
    return defs(id, GOLD, ['#3a2a0a']) + '<rect width="96" height="96" fill="url(#bg' + id + ')"/><circle cx="48" cy="54" r="38" fill="url(#gl' + id + ')"/>' + sparks('#ffe9a8', 14, 11) +
      blade(id, 48, 84, 62, 5, -24) + blade(id, 48, 84, 62, 5, 24) + blade(id, 48, 84, 70, 6, 0);
  },
  // Chuva de Estrelas — círculo celeste e três estrelas descendentes.
  magic2(id) {
    let stars='';for(const [x,y] of [[25,55],[48,73],[71,57]])stars+='<path d="M'+x+' 33 V'+y+'" stroke="#83cfff" stroke-width="2"/><path d="M'+x+' '+(y-10)+' l3 7 7 3 -7 3 -3 10 -3 -10 -7 -3 7 -3Z" fill="#fff0bd" stroke="#9bddff" stroke-width="1"/>';
    return defs(id,ICE,['#0c1c3a'])+'<rect width="96" height="96" fill="url(#bg'+id+')"/><ellipse cx="48" cy="27" rx="36" ry="14" fill="none" stroke="#9fdcff" stroke-width="2"/><ellipse cx="48" cy="27" rx="28" ry="10" fill="none" stroke="#ffe3a0" stroke-width="1.5"/><ellipse cx="48" cy="27" rx="32" ry="12" fill="none" stroke="#fff" stroke-dasharray="2 4"/>'+stars;
  },
  // Fênix com asas e coluna helicoidal: ícone da Skill 3.
  magic3(id) {
    return defs(id,['#fff2a3','#ff9d16','#d52a05'],['#240833'])+'<rect width="96" height="96" fill="url(#bg'+id+')"/><path d="M36 84 C84 74 8 67 63 54 C86 45 19 44 58 31" fill="none" stroke="#ff7616" stroke-width="6"/><path d="M48 48 L15 22 26 48 8 37 30 61 46 55 60 67 84 36 69 45 80 18 51 44 57 32 48 34Z" fill="url(#bl'+id+')" stroke="#ffd45d"/>';
  },
  // Julgamento Divino — espada colossal entre asas.
  ultimate(id) {return '<rect width="96" height="96" fill="#080b13"/><ellipse cx="48" cy="48" rx="43" ry="12" fill="#fff" opacity=".3"/><circle cx="48" cy="48" r="34" fill="#000" stroke="#fff" stroke-width="10"/><circle cx="48" cy="48" r="43" fill="none" stroke="#fff" stroke-width="1" stroke-dasharray="1 4"/>';},
  // Espadas da Palavra II — lâminas que perseguem (curvas com ponta).
  magic_plus(id) {
    let p = '';
    for (const [x, c] of [[18, -12], [33, 8], [48, -6], [63, 8], [78, -12]]) {
      p += '<path d="M' + x + ' 86 C' + (x + c * 2) + ' 62 ' + (48 + c) + ' 40 48 18" fill="none" stroke="url(#bl' + id + ')" stroke-width="3.2" stroke-linecap="round" opacity=".92"/>' +
        '<path d="M' + (48 - 4) + ' 24 L48 14 L' + (48 + 4) + ' 24Z" fill="#fff6cf" opacity=".9"/>';
    }
    return defs(id, GOLD, ['#3a2a0a']) + '<rect width="96" height="96" fill="url(#bg' + id + ')"/><circle cx="48" cy="22" r="22" fill="url(#gl' + id + ')"/><circle cx="48" cy="20" r="7" fill="none" stroke="#ffe9a8" stroke-width="1.6"/><circle cx="48" cy="20" r="2.4" fill="#fff"/>' + p +
      '<g opacity=".9">' + blade(id, 48, 90, 40, 4, 0) + '</g>' + sparks('#ffe9a8', 10, 41);
  },
  // Aprimoramento da Chuva de Estrelas.
  magic2_plus(id) { return ART.magic2(id); },
  magic3_plus(id) {
    return defs(id, ['#fff2c4', '#ffc24a', '#8a5a10'], ['#2a1a06']) + '<rect width="96" height="96" fill="url(#bg' + id + ')"/><ellipse cx="48" cy="80" rx="38" ry="10" fill="url(#gl' + id + ')"/>' +
      '<ellipse cx="48" cy="80" rx="34" ry="8" fill="none" stroke="#ffe39a" stroke-width="1.6"/><ellipse cx="48" cy="80" rx="22" ry="5" fill="none" stroke="#ffe39a" stroke-width="1"/>' +
      blade(id, 48, 82, 70, 9, 0) + sparks('#ffe9b0', 14, 31);
  },
  // Espada inicial.
  sword_prota(id) {
    return defs(id, ['#f4f4fa', '#b8c0d0', '#6c7488'], ['#1a1d2a']) + '<rect width="96" height="96" fill="url(#bg' + id + ')"/><circle cx="48" cy="52" r="34" fill="url(#gl' + id + ')" opacity=".5"/>' +
      '<g transform="rotate(35 48 48)">' + blade(id, 48, 84, 74, 6.4, 0) + '</g>' + sparks('#dfe6f5', 8, 3);
  },
  // Lâmina da Aurora — dourada, rastro de luz.
  sword_aurora(id) {
    return defs(id, ['#fffbe8', '#ffd870', '#c28a22'], ['#3a2606']) + '<rect width="96" height="96" fill="url(#bg' + id + ')"/><circle cx="52" cy="46" r="38" fill="url(#gl' + id + ')"/>' +
      '<path d="M14 76 Q40 70 72 20" fill="none" stroke="#ffe9a8" stroke-opacity=".55" stroke-width="5" stroke-linecap="round"/>' +
      '<g transform="rotate(35 48 48)">' + blade(id, 48, 86, 80, 7, 0) + '</g>' + sparks('#fff1c0', 14, 17);
  },
  // Lâmina da Vigília — aço azul-pálido, mais longa.
  sword_vigilia(id) {
    return defs(id, ['#ffffff', '#a8d4ff', '#4a78c8'], ['#0c1c3a']) + '<rect width="96" height="96" fill="url(#bg' + id + ')"/><circle cx="50" cy="46" r="38" fill="url(#gl' + id + ')"/>' +
      '<g transform="rotate(35 48 48)">' + blade(id, 48, 88, 88, 6, 0) + '</g>' +
      '<circle cx="76" cy="22" r="3.4" fill="#fff"/><circle cx="76" cy="22" r="8" fill="url(#gl' + id + ')"/>' + sparks('#cfe6ff', 12, 23);
  },
  // Categorias.
  cat_escrituras(id) {
    return defs(id, GOLD, ['#2a1c06']) + '<rect width="96" height="96" fill="none"/><path d="M48 30 C36 22 22 22 12 26 L12 72 C22 68 36 68 48 76 C60 68 74 68 84 72 L84 26 C74 22 60 22 48 30Z" fill="#1a1208" stroke="url(#bl' + id + ')" stroke-width="3"/><path d="M48 30 L48 76" stroke="url(#bl' + id + ')" stroke-width="2.4"/>' +
      '<path d="M48 8 L52 20 L48 32 L44 20Z" fill="url(#bl' + id + ')"/><path d="M28 38 C34 36 40 38 44 42 M28 48 C34 46 40 48 44 52 M68 38 C62 36 56 38 52 42 M68 48 C62 46 56 48 52 52" stroke="#c9a24d" stroke-opacity=".7" fill="none" stroke-width="1.6"/>';
  },
  cat_arsenal(id) {
    return defs(id, GOLD, ['#2a1c06']) + '<g transform="rotate(-38 48 50)">' + blade(id, 48, 82, 70, 6, 0) + '</g><g transform="rotate(38 48 50)">' + blade(id, 48, 82, 70, 6, 0) + '</g>';
  },
  cat_conquistas(id) {
    let star = '';
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / 5, b = a + Math.PI / 5; star += (i ? 'L' : 'M') + (48 + Math.cos(a) * 18).toFixed(1) + ' ' + (44 + Math.sin(a) * 18).toFixed(1) + ' L' + (48 + Math.cos(b) * 8).toFixed(1) + ' ' + (44 + Math.sin(b) * 8).toFixed(1); }
    return defs(id, GOLD, ['#2a1c06']) + '<path d="M48 8 L82 20 L82 48 C82 68 64 82 48 90 C32 82 14 68 14 48 L14 20Z" fill="#150f06" stroke="url(#bl' + id + ')" stroke-width="3"/><path d="' + star + 'Z" fill="url(#bl' + id + ')" stroke="#fff3c0" stroke-width="1"/>';
  },
  cat_arquivo(id) {
    return defs(id, GOLD, ['#2a1c06']) + '<path d="M6 48 C22 24 74 24 90 48 C74 72 22 72 6 48Z" fill="#150f06" stroke="url(#bl' + id + ')" stroke-width="3"/><circle cx="48" cy="48" r="15" fill="url(#bl' + id + ')"/><circle cx="48" cy="48" r="7" fill="#0a0604"/><circle cx="52" cy="44" r="2.6" fill="#fff"/>';
  },
  cat_fragmentos(id) {
    return defs(id, ['#ffd6d6', '#ff5a5a', '#8a1420'], ['#2a0608']) + '<path d="M48 6 L74 34 L62 90 L34 90 L22 34Z" fill="url(#bl' + id + ')" stroke="#ffd6d6" stroke-opacity=".8" stroke-width="1.6"/><path d="M48 6 L48 90 M22 34 L74 34 M34 90 L48 34 L62 90" stroke="#fff" stroke-opacity=".45" fill="none" stroke-width="1.2"/>';
  },
  // MOD 233 — Ruptura em X: duas lâminas carmesim cruzadas com núcleo branco-quente e filamentos pretos.
  skill_x_rupture(id) {
    const g = '<linearGradient id="xr' + id + '" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5a0010"/><stop offset=".5" stop-color="#ff3a6a"/><stop offset="1" stop-color="#5a0010"/></linearGradient>';
    const bladeX = r => '<g transform="rotate(' + r + ' 48 48)"><path d="M8 48 Q48 30 88 48 Q48 66 8 48Z" fill="url(#xr' + id + ')"/><path d="M14 48 Q48 42 82 48 Q48 54 14 48Z" fill="#fff2f4"/><path d="M20 46 Q34 44 44 47 M54 50 Q66 52 78 49" stroke="#1a0006" stroke-width="1.2" fill="none"/></g>';
    return '<defs>' + g + '<radialGradient id="xg' + id + '"><stop offset="0" stop-color="#ff6a9a" stop-opacity=".9"/><stop offset="1" stop-color="#ff6a9a" stop-opacity="0"/></radialGradient></defs><rect width="96" height="96" fill="#12030a"/><circle cx="48" cy="48" r="40" fill="url(#xg' + id + ')"/>' + sparks('#ff8fb0', 12, 31) + bladeX(45) + bladeX(-45) + '<circle cx="48" cy="48" r="6" fill="#fff"/>';
  },
  // MOD 233 — Portais da Perseguição: portal rubro e violeta com fios curvos convergindo.
  skill_twin_portals(id) {
    const portal = (cx, c1, c2) => '<ellipse cx="' + cx + '" cy="40" rx="15" ry="19" fill="#0a020c" stroke="' + c1 + '" stroke-width="4"/><path d="M' + (cx - 8) + ' 40 Q' + cx + ' 26 ' + (cx + 8) + ' 40 Q' + cx + ' 54 ' + (cx - 8) + ' 40Z" fill="' + c2 + '" opacity=".55"/>';
    return '<rect width="96" height="96" fill="#0b0612"/>' + sparks('#d9b0ff', 10, 41) + portal(24, '#ff2a40', '#ff6a7a') + portal(72, '#9a4aff', '#c49aff') +
      '<path d="M30 52 Q36 80 48 78" stroke="#ff4a5a" stroke-width="2.4" fill="none"/><path d="M66 52 Q60 80 48 78" stroke="#a86aff" stroke-width="2.4" fill="none"/><path d="M24 22 Q48 0 50 74" stroke="#ff8a9a" stroke-width="1.6" fill="none" opacity=".8"/><path d="M72 22 Q90 70 50 76" stroke="#c49aff" stroke-width="1.6" fill="none" opacity=".8"/><circle cx="48" cy="77" r="6" fill="#fff"/>';
  },
  // MOD 233 — Dragão do Julgamento: cabeça dourada de boca aberta, olho branco e corpo em espiral de fogo.
  skill_judgment_dragon(id) {
    return defs(id, GOLD, ['#3a1a04']) + '<rect width="96" height="96" fill="url(#bg' + id + ')"/><circle cx="52" cy="46" r="38" fill="url(#gl' + id + ')"/>' + sparks('#ffd27a', 14, 51) +
      '<path d="M10 86 C20 60 46 74 40 52 C36 36 54 30 62 38" stroke="#ff9a2a" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M10 86 C20 60 46 74 40 52 C36 36 54 30 62 38" stroke="#ffe08a" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<path d="M56 36 L84 26 L74 38 L90 42 L70 46 L60 50Z" fill="url(#bl' + id + ')" stroke="#fff6cf" stroke-width="1"/><path d="M60 50 L86 58 L66 54Z" fill="#c8861e"/><path d="M70 38 l2 4 l2 -4 M76 40 l2 4 l2 -4" stroke="#fff" stroke-width="1"/><circle cx="66" cy="34" r="2.4" fill="#fff"/><path d="M58 30 L52 12 L62 28" fill="#fff0c8"/>';
  },
  // MOD 233 — Quantum: núcleo negro, órbitas dourada e violeta, lâmina de luz e empunhadura rubra.
  sword_quantum(id) {
    return '<defs><linearGradient id="qb' + id + '" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ffd27a"/><stop offset=".6" stop-color="#ff5ab0"/><stop offset="1" stop-color="#b48aff"/></linearGradient></defs><rect width="96" height="96" fill="#0a0612"/>' + sparks('#d9b0ff', 10, 61) +
      '<path d="M48 4 L52 56 L44 56Z" fill="url(#qb' + id + ')"/><path d="M48 8 L48 54" stroke="#fff" stroke-width="1"/>' +
      '<ellipse cx="48" cy="62" rx="20" ry="7" fill="none" stroke="#ffd98a" stroke-width="2" transform="rotate(-18 48 62)"/><ellipse cx="48" cy="62" rx="18" ry="6" fill="none" stroke="#a06aff" stroke-width="2" transform="rotate(24 48 62)"/><circle cx="48" cy="62" r="7.5" fill="#000" stroke="#ffe7b0" stroke-width="1.4"/>' +
      '<rect x="45" y="70" width="6" height="18" rx="2" fill="#a0141e"/><path d="M45 74 h6 M45 79 h6 M45 84 h6" stroke="#ffc85a" stroke-width="1"/><circle cx="48" cy="90" r="3.2" fill="#ffc85a"/>';
  },
  lock(id) {
    return '<path d="M30 44 L30 34 C30 22 66 22 66 34 L66 44" fill="none" stroke="#c9a24d" stroke-width="6"/><rect x="22" y="44" width="52" height="38" rx="6" fill="#c9a24d"/><circle cx="48" cy="60" r="5" fill="#1a1208"/><rect x="46" y="62" width="4" height="12" fill="#1a1208"/>';
  }
};

/** Retorna o SVG completo (string) para o id de arte pedido, ou um selo genérico se o id for desconhecido. */
export function iconSvg(name, { size = 96 } = {}) {
  const fn = ART[name] || ART.cat_arquivo;
  const id = ++uid;
  return '<svg class="art-svg" viewBox="0 0 96 96" width="' + size + '" height="' + size + '" aria-hidden="true" focusable="false">' + fn(id) + '</svg>';
}

export const ICON_NAMES = Object.keys(ART);
