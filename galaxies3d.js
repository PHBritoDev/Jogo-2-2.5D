/**
 * MOD 189 — Tela das sete galáxias, presas por correntes cósmicas.
 * A Galáxia 1 é jogável; as outras aparecem como silhuetas seladas, sem revelar chefes ou cenários.
 * O progresso vem do mundo 3D (passos do Ato I) e é salvo no aparelho.
 */
export const GALAXIES = [
  { id: 1, name: 'Ganância', subtitle: 'Onde vidas viraram moeda', hue: 42, color: '#f3c25a', glow: '#ffcf6a' },
  { id: 2, name: 'Selada', hint: 'Um calor que consome sem saciar', hue: 350, color: '#c0485e', glow: '#ff6f8a' },
  { id: 3, name: 'Selada', hint: 'Mesas que nunca se esvaziam', hue: 25, color: '#c97a3a', glow: '#ffae6a' },
  { id: 4, name: 'Selada', hint: 'Fogo que não aquece ninguém', hue: 8, color: '#b8322a', glow: '#ff5a44' },
  { id: 5, name: 'Selada', hint: 'Olhos que contam o que é dos outros', hue: 140, color: '#4f9a62', glow: '#7fe09a' },
  { id: 6, name: 'Selada', hint: 'Um sono mais pesado que correntes', hue: 220, color: '#5a6fb0', glow: '#8aa4ff' },
  { id: 7, name: 'Selada', hint: 'Uma coroa acima de todas as coroas', hue: 275, color: '#8a5ad0', glow: '#c39aff' }
];

/** Progresso (0..1) da Galáxia 1 a partir do passo do Ato I; Atos II–IV ainda não existem. */
export function galaxyProgress(galaxyId, { questStep = 0, bishopsDefeated = 0 } = {}) {
  if (galaxyId !== 1) return 0;
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

/**
 * Mostra a tela. onEnter(galaxyId) é chamado ao tocar ENTRAR numa galáxia liberada.
 * isReady() informa se o mundo terminou de carregar (o botão espera por ele).
 */
export function showGalaxyScreen({ progress = {}, save = {}, onEnter, isReady = () => true } = {}) {
  const open = unlockedGalaxies(save);
  const root = el('section', { id: 'galaxy-screen', 'aria-label': 'Sete galáxias' });
  root.innerHTML = '<div class="gx-stars"></div><div class="gx-head"><span class="gx-kicker">A BATALHA CONTRA OS</span><h1>7 PECADOS CAPITAIS</h1><p>Sete mundos acorrentados. Um deles já pede por você.</p></div><svg class="gx-chains" viewBox="0 0 1000 560" preserveAspectRatio="xMidYMid meet" aria-hidden="true"></svg><div class="gx-orbs"></div><div class="gx-detail"></div>';
  const svg = root.querySelector('.gx-chains'), orbs = root.querySelector('.gx-orbs'), detail = root.querySelector('.gx-detail');
  // Arco suave da esquerda para a direita, com a Galáxia 1 em destaque.
  const pts = GALAXIES.map((g, i) => ({ x: 90 + i * 136, y: 300 + Math.sin(i * .95 + .4) * 95 }));
  let chains = '';
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 + 26;
    const broken = open.includes(GALAXIES[i + 1].id);
    chains += '<path class="gx-chain' + (broken ? ' broken' : '') + '" d="M' + a.x + ' ' + a.y + ' Q' + mx + ' ' + my + ' ' + b.x + ' ' + b.y + '"/>';
  }
  svg.innerHTML = chains;
  let selected = 1;
  function renderDetail() {
    const g = GALAXIES[selected - 1], unlocked = open.includes(g.id), pct = Math.round(galaxyProgress(g.id, progress) * 100);
    detail.innerHTML = unlocked
      ? '<span class="gx-num">GALÁXIA ' + g.id + '</span><h2>' + g.name + '</h2><p>' + g.subtitle + '</p><div class="gx-bar"><i style="width:' + pct + '%"></i></div><span class="gx-pct">' + pct + '% da galáxia</span><button type="button" class="gx-enter">ENTRAR</button>'
      : '<span class="gx-num">GALÁXIA ' + g.id + '</span><h2>🔒 Selada</h2><p>“' + g.hint + '”</p><span class="gx-pct">Liberte a galáxia anterior para quebrar esta corrente.</span>';
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
    const orb = el('button', { type: 'button', class: 'gx-orb' + (unlocked ? ' open' : ' locked'), 'data-id': String(g.id), 'aria-label': 'Galáxia ' + g.id + (unlocked ? ' — ' + g.name : ' — selada') });
    orb.style.left = (pts[i].x / 10) + '%'; orb.style.top = (pts[i].y / 5.6) + '%';
    orb.style.setProperty('--c', g.color); orb.style.setProperty('--g', g.glow);
    orb.innerHTML = '<span class="gx-core"></span><span class="gx-ring"></span><span class="gx-label">' + (unlocked ? g.name : g.id) + '</span>';
    orb.addEventListener('click', () => { selected = g.id; renderDetail(); });
    orbs.appendChild(orb);
  });
  renderDetail();
  document.body.appendChild(root);
  return { root, close() { root.remove(); } };
}
