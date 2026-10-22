/**
 * MOD 189/202 — Tela das sete galáxias, presas por correntes cósmicas.
 * A Galáxia 1 é jogável; as outras aparecem como mundos acorrentados (nome do pecado, sem revelar chefes nem cenários).
 * O progresso vem do mundo 3D (passos do Ato I em diante) e é salvo no aparelho.
 * MOD 202: layout redesenhado (menu lateral, planetas desenhados em SVG próprio, painel de detalhe com condições de acesso).
 */
export const GALAXIES = [
  { id: 1, name: 'Ganância', tag: 'Nada é suficiente. Sempre mais.', subtitle: 'Onde vidas viraram moeda', hue: 42, color: '#f3c25a', glow: '#ffcf6a',
    lore: 'O primeiro pecado. O início de todos os outros. Neste mundo, tudo tem um preço — e você não é exceção. A ganância consome, corrompe e transforma até o mais puro em algo descartável.',
    quote: 'A ganância nunca é saciada.', quoteBy: 'O Anjo Caído', access: ['Nível mínimo: 1', 'Conclua a missão inicial'] },
  { id: 2, name: 'Inveja', tag: 'O que é do outro, também me pertence.', hint: 'Olhos que contam o que é dos outros', hue: 140, color: '#4f9a62', glow: '#7fe09a',
    lore: 'Um mundo de raízes e olhares. Aqui ninguém possui nada — todos desejam o que o vizinho tem.', access: ['Liberte a Galáxia 1', 'Quebre a corrente da Ganância'] },
  { id: 3, name: 'Avareza', tag: 'Tudo guardado. Nada partilhado.', hint: 'Mesas que nunca se esvaziam', hue: 25, color: '#c97a3a', glow: '#ffae6a',
    lore: 'Cofres sobre cofres, correntes sobre correntes. O que entra aqui nunca mais sai.', access: ['Liberte a Galáxia 2'] },
  { id: 4, name: 'Soberba', tag: 'Acima de tudo. Acima de todos.', hint: 'Uma coroa acima de todas as coroas', hue: 220, color: '#b8c4d8', glow: '#dfe8ff',
    lore: 'Torres de prata que tocam o vazio. Quem sobe demais esquece de onde veio.', access: ['Liberte a Galáxia 3'] },
  { id: 5, name: 'Gula', tag: 'Nunca é o bastante para a boca.', hint: 'Um banquete que devora quem se senta', hue: 320, color: '#c0487e', glow: '#ff7ab8',
    lore: 'Um mundo de bocas abertas. Tudo cresce, tudo apodrece, tudo é consumido.', access: ['Liberte a Galáxia 4'] },
  { id: 6, name: 'Ira', tag: 'Queime tudo. Comece de novo.', hint: 'Fogo que não aquece ninguém', hue: 8, color: '#b8322a', glow: '#ff5a44',
    lore: 'Rachaduras de lava e punhos de ferro. A raiva aqui já esqueceu o que a provocou.', access: ['Liberte a Galáxia 5'] },
  { id: 7, name: 'Luxúria', tag: 'Desejo sem fim, sem rosto.', hint: 'Um sono mais pesado que correntes', hue: 275, color: '#8a5ad0', glow: '#c39aff',
    lore: 'Véus roxos sobre um abismo. Tudo é belo — até que se toca.', access: ['Liberte a Galáxia 6'] }
];

/** Arte própria de cada planeta (SVG): esfera iluminada + detalhes do pecado. */
const PLANET_DETAILS = {
  1: c => '<path d="M16 62 Q60 74 104 62 Q96 98 60 112 Q24 98 16 62Z" fill="#3a2410"/><path d="M30 62 L30 40 L36 34 L42 40 L42 62Z M46 62 L46 28 L53 18 L60 28 L60 62Z M64 62 L64 36 L70 30 L76 36 L76 62Z M80 62 L80 46 L86 40 L92 46 L92 62Z" fill="#6a4a18" stroke="#ffe7a0" stroke-width=".8"/><path d="M53 18 L53 10 M70 30 L70 24" stroke="#ffe7a0" stroke-width="1.2"/><rect x="50" y="36" width="3" height="5" fill="#fff3c0"/><rect x="68" y="42" width="3" height="5" fill="#fff3c0"/><rect x="34" y="48" width="3" height="5" fill="#fff3c0"/><path d="M96 68 Q99 84 96 100" stroke="#e8f6ff" stroke-width="2.4" fill="none" opacity=".8"/>',
  2: c => '<path d="M20 70 Q40 40 60 60 T100 50" stroke="#0a2a14" stroke-width="5" fill="none"/><path d="M26 92 Q50 70 70 84 T104 76" stroke="#0a2a14" stroke-width="4" fill="none"/><path d="M40 30 Q50 44 44 60" stroke="#0a2a14" stroke-width="4" fill="none"/><circle cx="46" cy="52" r="5" fill="#d8ffe0"/><circle cx="46" cy="52" r="2.4" fill="#06180c"/><circle cx="78" cy="68" r="4" fill="#d8ffe0"/><circle cx="78" cy="68" r="1.9" fill="#06180c"/><circle cx="62" cy="36" r="3" fill="#d8ffe0"/><circle cx="62" cy="36" r="1.4" fill="#06180c"/>',
  3: c => '<ellipse cx="60" cy="62" rx="50" ry="14" fill="none" stroke="#3a2a10" stroke-width="4"/><ellipse cx="60" cy="62" rx="50" ry="14" fill="none" stroke="#ffd070" stroke-width="1.4" stroke-dasharray="6 5"/><ellipse cx="60" cy="40" rx="40" ry="10" fill="none" stroke="#3a2a10" stroke-width="3.4" transform="rotate(-14 60 40)"/><path d="M26 92 Q40 70 52 86 Q64 66 78 88 Q92 74 98 92 Q60 112 26 92Z" fill="#ffc850" stroke="#8a5a10" stroke-width="1"/><circle cx="46" cy="84" r="2.4" fill="#fff3c0"/><circle cx="70" cy="82" r="2.4" fill="#fff3c0"/><circle cx="86" cy="86" r="2" fill="#fff3c0"/>',
  4: c => '<path d="M30 80 L36 36 L42 80Z M44 84 L52 14 L60 84Z M62 84 L70 28 L78 84Z M80 80 L86 44 L92 80Z" fill="#e8eef8" stroke="#3a4a6a" stroke-width="1"/><path d="M52 14 L52 4 M70 28 L70 20" stroke="#cfe0ff" stroke-width="1.4"/><path d="M44 84 L52 14 L56 84Z M62 84 L70 28 L74 84Z" fill="#9aa8c4" opacity=".6"/><path d="M22 90 Q60 78 98 90 Q60 108 22 90Z" fill="#c8d4e8"/>',
  5: c => '<path d="M24 76 Q38 52 54 76Z" fill="#8a1a50" stroke="#ffc0e0" stroke-width="1"/><rect x="36" y="76" width="6" height="16" fill="#e8c8b0"/><path d="M58 70 Q76 38 96 70Z" fill="#a82060" stroke="#ffc0e0" stroke-width="1"/><rect x="72" y="70" width="8" height="24" fill="#e8c8b0"/><circle cx="44" cy="66" r="2.6" fill="#ffe0ee"/><circle cx="78" cy="58" r="3.2" fill="#ffe0ee"/><circle cx="68" cy="64" r="2" fill="#ffe0ee"/><circle cx="44" cy="66" r="1" fill="#300818"/><circle cx="78" cy="58" r="1.3" fill="#300818"/>',
  6: c => '<path d="M30 50 L44 62 L38 76 L56 84 L50 100" stroke="#ff7a30" stroke-width="3" fill="none" stroke-linejoin="round"/><path d="M70 30 L66 52 L82 60 L76 80 L92 92" stroke="#ff9a50" stroke-width="2.6" fill="none" stroke-linejoin="round"/><path d="M52 14 L58 40 L46 40Z M84 22 L88 44 L78 44Z" fill="#2a0806" stroke="#ff5a44" stroke-width=".8"/><circle cx="60" cy="68" r="10" fill="#ff5a30" opacity=".55"/>',
  7: c => '<ellipse cx="60" cy="62" rx="58" ry="14" fill="none" stroke="#d8a8ff" stroke-width="2.4" transform="rotate(-16 60 62)"/><path d="M52 90 L58 18 L64 90Z M40 92 L46 44 L52 92Z M66 92 L72 40 L78 92Z" fill="#1a0a2a" stroke="#c39aff" stroke-width="1"/><path d="M58 18 L58 8" stroke="#e8d0ff" stroke-width="1.4"/><circle cx="58" cy="30" r="2.4" fill="#e8d0ff"/>'
};
let planetUid = 0;
export function planetSvg(id, locked) {
  const g = GALAXIES[id - 1], u = 'pl' + (++planetUid);
  const c = g.color, hi = locked ? g.glow : '#ffffff';
  return '<svg class="gx-planet" viewBox="0 0 120 120" aria-hidden="true"><defs>' +
    '<radialGradient id="' + u + 's" cx="36%" cy="30%" r="75%"><stop offset="0" stop-color="' + hi + '"/><stop offset=".38" stop-color="' + c + '"/><stop offset="1" stop-color="#05030a"/></radialGradient>' +
    '<radialGradient id="' + u + 'g" cx="50%" cy="50%" r="50%"><stop offset=".62" stop-color="' + g.glow + '" stop-opacity="' + (locked ? '.3' : '.55') + '"/><stop offset="1" stop-color="' + g.glow + '" stop-opacity="0"/></radialGradient>' +
    '<clipPath id="' + u + 'c"><circle cx="60" cy="60" r="46"/></clipPath></defs>' +
    '<circle cx="60" cy="60" r="60" fill="url(#' + u + 'g)"/>' +
    '<circle cx="60" cy="60" r="46" fill="url(#' + u + 's)"/>' +
    '<g clip-path="url(#' + u + 'c)"' + (locked ? ' opacity=".82"' : '') + '>' + PLANET_DETAILS[id](c) + '</g>' +
    '<circle cx="60" cy="60" r="46" fill="none" stroke="' + g.glow + '" stroke-opacity="' + (locked ? '.5' : '.7') + '" stroke-width="1.2"/>' +
    '<ellipse cx="60" cy="60" rx="56" ry="15" fill="none" stroke="' + g.glow + '" stroke-opacity="' + (locked ? '.35' : '.5') + '" stroke-width="1" transform="rotate(-18 60 60)"/>' +
    '</svg>';
}

export function galaxyProgress(galaxyId, { questStep = 0, bishopsDefeated = 0 } = {}) {
  if (galaxyId !== 1) return 0;
  if (questStep >= 30) return 1;
  const actI = Math.min(1, Math.max(0, questStep) / 8);
  // O Ato I vale um quarto da galáxia (quatro Bispos + o Pecado no fim).
  return Math.min(1, actI * .22 + Math.max(0, bishopsDefeated - 1) * .2);
}

export function unlockedGalaxies(save = {}) {
  const n = Math.max(1, Math.min(7, Math.floor(Number(save.unlocked) || 1)));
  return GALAXIES.filter(g => g.id <= n).map(g => g.id);
}

function el(tag, attrs = {}, html = '') {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (html) e.innerHTML = html;
  return e;
}

const NAV = [['GALÁXIAS', 'on'], ['LOJA', 'soon'], ['INVENTÁRIO', 'soon'], ['MISSÕES', 'soon'], ['CONFIGURAÇÕES', 'settings']];

/**
 * Mostra a tela. onEnter(galaxyId) é chamado ao tocar ENTRAR numa galáxia liberada.
 * isReady() informa se o mundo terminou de carregar (o botão espera por ele).
 */
export function showGalaxyScreen({ progress = {}, save = {}, onEnter, isReady = () => true, onCelebrated, coins = 0, onSettings } = {}) {
  const open = unlockedGalaxies(save);
  const root = el('section', { id: 'galaxy-screen', 'aria-label': 'Sete galáxias' });
  root.innerHTML = '<div class="gx-stars"></div><div class="gx-spiral"></div>' +
    '<header class="gx-head"><span class="gx-sigil" aria-hidden="true"></span><div><span class="gx-kicker">GALÁXIA 1</span><h1>OS 7 PECADOS CAPITAIS</h1><p>Sete mundos acorrentados. Um deles já pede por você.</p></div></header>' +
    '<div class="gx-wallet"><span class="gx-coin"></span><b>' + Number(coins || 0).toLocaleString('pt-BR') + '</b></div>' +
    '<nav class="gx-nav">' + NAV.map(([n, k]) => '<button type="button" class="gx-nav-' + k + (k === 'on' ? ' on' : '') + '"' + (k === 'soon' ? ' disabled aria-disabled="true" title="Em breve"' : '') + '><i></i><span>' + n + '</span></button>').join('') + '</nav>' +
    '<div class="gx-track"><svg class="gx-chains" viewBox="0 0 1000 200" preserveAspectRatio="none" aria-hidden="true"></svg><div class="gx-orbs"></div></div>' +
    '<div class="gx-detail"></div><footer class="gx-foot">7 GALÁXIAS · 7 PECADOS · 1 DESTINO</footer>';
  const svg = root.querySelector('.gx-chains'), orbs = root.querySelector('.gx-orbs'), detail = root.querySelector('.gx-detail');
  const settingsBtn = root.querySelector('.gx-nav-settings');
  if (settingsBtn) settingsBtn.addEventListener('click', () => { if (typeof onSettings === 'function') onSettings(); });
  // Planetas numa fila com leve ondulação; a corrente alaranjada passa por trás deles.
  const pts = GALAXIES.map((g, i) => ({ x: 70 + i * 143, y: 100 + Math.sin(i * .9 + .6) * 34 }));
  let chains = '';
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 + 10;
    const broken = open.includes(GALAXIES[i + 1].id), breaking = save.celebrate === GALAXIES[i + 1].id;
    chains += '<path class="gx-chain' + (breaking ? ' breaking' : broken ? ' broken' : '') + '" d="M' + a.x + ' ' + a.y + ' Q' + mx + ' ' + my + ' ' + b.x + ' ' + b.y + '"/>';
  }
  svg.innerHTML = chains;
  let selected = 1;
  function renderDetail() {
    const g = GALAXIES[selected - 1], unlocked = open.includes(g.id), pct = Math.round(galaxyProgress(g.id, progress) * 100);
    const playable = unlocked && g.id === 1;
    const access = '<div class="gx-access"><span class="gx-lock-ic"></span><div><strong>CONDIÇÕES DE ACESSO</strong><ul>' + g.access.map(t => '<li>' + t + '</li>').join('') + '</ul></div>' +
      (g.quote ? '<blockquote>“' + g.quote + '”<cite>— ' + g.quoteBy + '</cite></blockquote>' : '<blockquote>“' + (g.hint || g.tag) + '”</blockquote>') + '</div>';
    detail.innerHTML = '<div class="gx-art">' + planetSvg(g.id, !unlocked) + '</div>' +
      '<div class="gx-info"><span class="gx-num">GALÁXIA ' + g.id + '</span><h2>' + g.name.toUpperCase() + '</h2><span class="gx-tag">' + g.tag.toUpperCase() + '</span>' +
      '<p>' + (unlocked && g.id !== 1 ? 'As correntes caíram. Esta jornada chega numa próxima atualização.' : g.lore) + '</p>' +
      (playable ? '<span class="gx-pcap">PROGRESSO DA GALÁXIA</span><div class="gx-bar"><i style="width:' + pct + '%"></i><em>' + pct + '%</em></div><button type="button" class="gx-enter">ENTRAR</button>'
        : '<span class="gx-sealed">' + (unlocked ? 'DESPERTA' : '🔒 SELADA') + '</span>') + '</div>' + access;
    detail.classList.toggle('is-locked', !unlocked);
    const btn = detail.querySelector('.gx-enter');
    if (btn) {
      const sync = () => { const ok = isReady(); btn.disabled = !ok; btn.textContent = ok ? 'ENTRAR' : 'PREPARANDO O MUNDO…'; if (!ok) setTimeout(sync, 400); };
      sync();
      btn.addEventListener('click', () => { if (!isReady()) return; root.classList.add('leaving'); setTimeout(() => { root.remove(); if (onEnter) onEnter(g.id); }, 650); });
    }
    for (const o of orbs.children) o.classList.toggle('sel', Number(o.dataset.id) === selected);
  }
  GALAXIES.forEach((g, i) => {
    const unlocked = open.includes(g.id);
    const orb = el('button', { type: 'button', class: 'gx-orb' + (unlocked ? ' open' : ' locked'), 'data-id': String(g.id), 'aria-label': 'Galáxia ' + g.id + ' — ' + g.name + (unlocked ? '' : ' (selada)') });
    orb.style.left = (pts[i].x / 10) + '%'; orb.style.top = (pts[i].y / 2) + '%';
    orb.style.setProperty('--c', g.color); orb.style.setProperty('--g', g.glow);
    orb.innerHTML = '<span class="gx-core">' + planetSvg(g.id, !unlocked) + '</span><span class="gx-label"><b>' + g.name.toUpperCase() + '</b><small>' + (unlocked ? '' : '<i class="gx-padlock"></i>') + 'GALÁXIA ' + g.id + '</small></span>';
    orb.addEventListener('click', () => { selected = g.id; renderDetail(); });
    orbs.appendChild(orb);
  });
  renderDetail();
  document.body.appendChild(root);
  // MOD 197 — a corrente da galáxia recém-libertada se rompe (uma vez), com o próximo mundo despertando.
  const freed = Number(save.celebrate) || 0;
  if (freed >= 2 && freed <= 7) {
    const orb = orbs.querySelector('[data-id="' + freed + '"]');
    if (orb) { orb.classList.add('awakening'); setTimeout(() => { selected = freed; renderDetail(); }, 1800); }
    const banner = el('div', { class: 'gx-freed' }, 'A CORRENTE SE ROMPEU · GALÁXIA ' + freed + ' DESPERTA');
    root.appendChild(banner);
    if (typeof onCelebrated === 'function') onCelebrated(freed);
  }
  return { root, close() { root.remove(); } };
}
