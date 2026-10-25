/**
 * MOD 196 — Atos III e IV da Galáxia 1 (dados puros; testes em acts34-flow.test.mjs).
 * Cada ato é uma lista de etapas executadas pelo mundo 3D com o mesmo motor:
 *   talk    → conversar com alguém (guia/NPC) num ponto
 *   reach   → chegar a um local
 *   fight   → enfrentar inimigos comuns um de cada vez (rig e perfil próprios)
 *   collect → tocar/recolher objetos espalhados (investigação, derrubar ídolos, memórias)
 *   boss    → Bispo com apresentação, fúria na metade da vida e falas de derrota
 * Os passos continuam a numeração dos Atos I e II (14 = Ato II concluído).
 */
// MOD 206 — o Vale do Altar virou a cidade de neve do Ato III (snow3d.js): chão coberto de neve.
export const ALTAR_VALLEY = { cx: 150, cz: -40, hx: 42, hz: 38, tint: [[.80, .84, .9], [.93, .95, .98]], tintStrength: .92 };
export const ALTAR_PASS = [[70, -32], [88, -30], [104, -36], [114, -38]];
export const SERRA = { cx: -36, cz: -238, hx: 44, hz: 34, tint: [[.34, .37, .38], [.46, .47, .45]], tintStrength: .55 };
export const SERRA_PASS = [[-4, -146], [-10, -170], [-22, -192], [-30, -208]];
export const EXTRA_REGIONS = [ALTAR_VALLEY, SERRA];
export const EXTRA_PASSES = [ALTAR_PASS, SERRA_PASS];

const say = (who, text) => ({ who, text });

export const ACT3 = {
  id: 3, first: 14, title: 'O altar da cobiça', kicker: 'GALÁXIA 1 · GANÂNCIA · ATO III', bishop: "ZAR'KHAEL — O Carrasco do Juízo Eterno", weather: 'fog',
  steps: [
    { step: 14, type: 'talk', who: 'guide', at: { x: -21, z: -41.5 }, label: 'FALAR · ANJO', title: 'ATO II · CONCLUÍDO', objective: 'Fale com o Anjo-Guia na vila',
      lines: name => [say('Anjo-Guia', 'A leste, além da colina do portal, um vale inteiro se ajoelha. Constroem estátuas dos Bispos e agradecem pela corrente.'), say('Anjo-Guia', 'A névoa de lá não vem do céu: vem do incenso. Cuidado — quem enxerga pouco obedece mais.'), say(name || 'Protagonista', 'Então eu vou lá abrir janelas.')] },
    { step: 15, type: 'reach', at: { x: 140, z: -38 }, radius: 18, title: 'ATO III · A ROTA DO INCENSO', objective: 'Siga a leste pela Passagem do Incenso', toast: 'VALE DO ALTAR' },
    { step: 16, type: 'talk', who: 'npc', npc: 'resistente', at: { x: 132, z: -22 }, label: 'FALAR · IRMÃ CELESTE', title: 'ATO III · OS QUE RESISTEM', objective: 'Encontre quem ainda não se ajoelhou',
      lines: name => [say('Irmã Celeste', 'Você não se curvou na entrada. Faz tempo que ninguém atravessa aquele portão de pé.'), say('Irmã Celeste', 'Três zelotes guardam os ídolos. Enquanto as estátuas de pé, as pessoas acham que o Bispo as vê. Derrube-as — e veja quem paga o incenso.'), say(name || 'Protagonista', 'Fique perto das casas. Ninguém precisa assistir.')] },
    { step: 17, type: 'fight', rig: 'enemy3', profile: 'zealot', name: 'ZELOTE DO ALTAR', hp: 160, spots: [{ x: 162, z: -18 }, { x: 176, z: -48 }, { x: 140, z: -64 }], title: 'ATO III · OS ZELOTES', objective: 'Vença os três zelotes que guardam os ídolos',
      taunt: 'ZELOTE: “Ajoelha-te, e talvez ele te esqueça. De pé, tu és só mais uma oferta.”' },
    { step: 18, type: 'collect', kind: 'idol', label: 'DERRUBAR', items: [{ x: 164, z: -21 }, { x: 179, z: -51 }, { x: 137, z: -66 }], title: 'ATO III · OS ÍDOLOS', objective: 'Derrube os três ídolos do Bispo',
      lines: [say('Anjo-Guia', 'Ouro sobre barro. Ninguém olhou por baixo.'), say('Anjo-Guia', 'Esta tem um brasão de família gravado na base: Ourives.'), say('Anjo-Guia', 'Os Ourives pagam o incenso — e cobram ingresso para rezar. O altar fica no centro do vale.')] },
    { step: 19, type: 'boss', rig: 'bishop3', profile: 'zarkhael', name: "ZAR'KHAEL · TERCEIRO BISPO", hp: 640, at: { x: 152, z: -42 }, label: 'ENFRENTAR', title: "ATO III · ZAR'KHAEL", objective: 'Suba ao altar e enfrente o Carrasco do Juízo Eterno',
      intro: name => [say("ZAR'KHAEL", 'Sobreviveste aos meus irmãos e confundiste isso com força. Ajoelha-te… para que tua última visão seja a mão que apagará tua existência.'), say("ZAR'KHAEL", 'Valério contava moedas. Vorgazhek contava dívidas. Eu conto joelhos — e todos neste vale já me pagaram.'), say(name || 'Protagonista', '“Ao Senhor teu Deus adorarás, e só a ele servirás.” Os teus joelhos de pedra acabam hoje.')],
      rage: 'O juízo não tem pressa — mas agora tem fome.',
      defeat: name => [say("ZAR'KHAEL", 'Eles… estão se levantando. Sem ninguém mandar.'), say("ZAR'KHAEL", 'O Quarto não quer joelhos, ' + (name || 'viajante') + '. Ele quer que ninguém se lembre por que se levantaria. Ao sul, onde a serra não devolve o eco.'), say('Irmã Celeste', 'Ninguém mais precisa pagar para rezar.'), say('Anjo-Guia', 'Três selos. Agora o torneio do vale também está aberto, se quiser provar a lâmina.')],
      reward: { coins: 80, xp: 320 } }
  ]
};

export const ACT4 = {
  id: 4, first: 20, title: 'Quando ninguém mais se lembra de amar', kicker: 'GALÁXIA 1 · GANÂNCIA · ATO IV', bishop: 'VÉRAXION — O Custódio do Último Selo', weather: 'night',
  steps: [
    { step: 20, type: 'talk', who: 'guide', at: { x: -21, z: -41.5 }, label: 'FALAR · ANJO', title: 'ATO III · CONCLUÍDO', objective: 'Fale com o Anjo-Guia na vila',
      lines: name => [say('Anjo-Guia', 'Ao sul, na Serra sem Ecos, pessoas viraram ferramentas. Algumas ainda são gente. Outras esqueceram que eram.'), say('Anjo-Guia', 'Lá, olhe duas vezes antes de golpear. O inimigo veste o rosto de quem você veio salvar.'), say(name || 'Protagonista', 'Então vou lembrar por eles.')] },
    { step: 21, type: 'reach', at: { x: -34, z: -226 }, radius: 18, title: 'ATO IV · A SERRA SEM ECOS', objective: 'Desça ao sul pela trilha da serra', toast: 'SERRA SEM ECOS' },
    { step: 22, type: 'talk', who: 'npc', npc: 'civil', at: { x: -50, z: -224 }, label: 'FALAR · TOMÉ', title: 'ATO IV · OS QUE AINDA LEMBRAM', objective: 'Fale com o pastor Tomé no abrigo',
      lines: name => [say('Tomé', 'Não toque nos que andam de olhos vazios — alguns ainda respondem pelo nome. Os outros… já trabalham para o Custódio.'), say('Tomé', 'Três servos guardam a estrada do observatório. Eles carregam cartas que nunca foram entregues. Cartas de amor, imagine.'), say(name || 'Protagonista', 'Então eu entrego.')] },
    { step: 23, type: 'fight', rig: 'enemy4', profile: 'hollow', name: 'SERVO SEM ECO', hp: 190, spots: [{ x: -20, z: -236 }, { x: -48, z: -252 }, { x: -12, z: -258 }], title: 'ATO IV · OS SERVOS SEM ECO', objective: 'Vença os três servos corrompidos (os civis não lutam)',
      taunt: 'SERVO: “…não lembro… do meu nome… não importa… o Custódio guarda…”' },
    { step: 24, type: 'collect', kind: 'letter', label: 'RECOLHER CARTA', items: [{ x: -18, z: -240 }, { x: -52, z: -255 }, { x: -9, z: -261 }], title: 'ATO IV · CARTAS NÃO ENTREGUES', objective: 'Recolha as três cartas que os servos carregavam',
      lines: [say('Anjo-Guia', '“Volto antes do inverno.” Assinada por alguém que agora não sabe o próprio nome.'), say('Anjo-Guia', 'Esta é de uma mãe. Ela pede desculpas por ter vendido o tempo que tinha com o filho.'), say('Anjo-Guia', 'A última fala do Custódio: ele guarda o selo que tranca o Pecado. O observatório fica no alto da serra.')] },
    { step: 25, type: 'boss', rig: 'bishop4', profile: 'veraxion', name: 'VÉRAXION · QUARTO BISPO', hp: 760, at: { x: -36, z: -246 }, label: 'ENFRENTAR', title: 'ATO IV · VÉRAXION', objective: 'Enfrente o Custódio do Último Selo',
      intro: name => [say('VÉRAXION', 'Tu lês cartas como se fossem promessas. Eu as guardo como provas: o amor também tem preço, e todos aqui pagaram.'), say('VÉRAXION', 'Meus irmãos cobravam. Eu apenas tranco. Sem mim, aquilo que dorme abaixo de nós acordaria com fome de tudo.'), say(name || 'Protagonista', '“O amor não procura os seus interesses.” Não vim tirar teu selo por cobiça. Vim devolver os nomes.')],
      rage: 'Se não posso guardar, ninguém guardará.',
      defeat: name => [say('VÉRAXION', 'Os ecos… voltaram. Estão chamando os próprios nomes.'), say('VÉRAXION', 'Agora escuta, ' + (name || 'viajante') + ': nós quatro não servíamos a Ganância. Nós a prendíamos. E o preço de prendê-la… éramos nós.'), say('Tomé', 'A serra está respondendo. Pela primeira vez em anos, alguém gritou e o vale gritou de volta.'), say('Anjo-Guia', 'Quatro selos. O caminho até o Pecado está aberto — e eu não sei se estamos prontos. Ainda não.')],
      reward: { coins: 100, xp: 400 } },
    { step: 26, type: 'end', title: 'ATO IV · CONCLUÍDO', objective: 'Os quatro selos caíram. O Pecado da Ganância aguarda' }
  ]
};

export const LATE_ACTS = [ACT3, ACT4];

export function stepDef(step) {
  for (const act of LATE_ACTS) for (const s of act.steps) if (s.step === step) return { act, def: s };
  return null;
}
export function latePresentation(step) {
  const r = stepDef(step);
  return r ? { title: r.def.title, objective: r.def.objective } : null;
}
export function lateActFor(step) {
  if (step >= ACT4.first + 1) return ACT4;
  if (step >= ACT3.first + 1) return ACT3;
  return null;
}
/** Coleta genérica: só no passo certo e uma vez por item. */
export function collectItem(found, index, step, def) {
  if (!def || def.type !== 'collect' || def.step !== step || found.includes(index) || index < 0 || index >= def.items.length) return { found, advanced: false };
  const next = found.concat([index]);
  return { found: next, advanced: next.length >= def.items.length };
}
export function bossRewardOnce(claimed, def) {
  return claimed ? { coins: 0, xp: 0 } : { coins: def.reward.coins, xp: def.reward.xp };
}

/** Coliseu do vale (opcional, a partir do Ato III): dez lutas com recompensa crescente e teto diário. */
export const COLISEUM = {
  unlockStep: 20, rounds: 10, spot: { x: 168, z: -52 },
  enemyFor(round) { return round < 5 ? 'enemy3' : 'enemy4'; },
  hpFor(round) { return 100 + round * 22; },
  rewardFor(round) { return 6 + round * 3; },
  dailyCap: 120
};
export function coliseumPayout(round, paidToday) {
  const want = COLISEUM.rewardFor(round);
  return Math.max(0, Math.min(want, COLISEUM.dailyCap - paidToday));
}
