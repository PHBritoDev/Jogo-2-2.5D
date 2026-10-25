/**
 * MOD 209 — Marco 7: Ato VI como no roteiro original do autor (docs/roteiro/M7-ATO6.md). Dados e transições puras;
 * as cenas são passos do diretor (cutscenes3d.js). Substitui o arco final antigo (finale-flow.js) nos passos 27–29.
 *
 * Etapas (questStep) e sub-etapas (salvas em act1Sub):
 *  27 o deserto: 0 a jornada com a pessoa misteriosa · 1 a estátua (os fragmentos) · 2 o portal fechado · 3 o portal misterioso
 *  28 a revanche: sub = quantos Bispos já caíram de novo (0 a 4), na dimensão de cada um
 *  29 a Ganância: 0 a estátua de novo (só o herói é puxado) e as três formas · 1 o epílogo (Sandra, o portal dos anjos)
 *  30 Galáxia 1 libertada (o planeta da Inveja é desbloqueado)
 */
export const ACT6N = { desert: 27, rematch: 28, greed: 29, done: 30, reward: 250, xp: 800 };
export const REMATCH = [
  { key: 'bishop1', name: 'VALÉRIO', hp: 340 },
  { key: 'bishop2', name: 'VORGAZHEK', hp: 380 },
  { key: 'bishop3', name: "ZAR'KHAEL", hp: 420 },
  { key: 'bishop4', name: 'VÉRAXION', hp: 460 }
];
export const GREED_FORMS = [
  { rig: 'greed1', profile: 'greed1', name: 'GANÂNCIA · PRIMEIRA FORMA', hp: 540 },
  { rig: 'greed2', profile: 'greed2', name: 'GANÂNCIA · SEGUNDA FORMA', hp: 640 },
  { rig: 'greed3', profile: 'greed3', name: 'GANÂNCIA · FORMA FINAL', hp: 900 }
];
export function act6Presentation(step, sub = 0) {
  if (step === 27) return [{ title: 'ATO VI · O DESERTO', objective: 'Acompanhe a pessoa misteriosa até o deserto' }, { title: 'ATO VI · A ESTÁTUA', objective: 'Coloque os quatro fragmentos espaciais na estátua' },
    { title: 'ATO VI · O PORTAL FECHOU', objective: 'Vá até a estátua' }, { title: 'ATO VI · O PORTAL MISTERIOSO', objective: 'Encontre um portal misterioso no deserto' }][Math.max(0, Math.min(3, sub))];
  if (step === 28) return { title: 'ATO VI · A REVANCHE (' + Math.min(4, sub) + '/4)', objective: sub >= 4 ? 'Volte à estátua' : 'Derrote de novo os quatro Bispos' };
  if (step === 29) return sub >= 1 ? { title: 'ATO VI · O PRÓXIMO MUNDO', objective: 'Siga com o Anjo e Sandra' } : { title: 'ATO VI · A GANÂNCIA', objective: 'Coloque os fragmentos na estátua e enfrente a Ganância' };
  return null;
}
export function isAct6Step(step) { return step >= ACT6N.desert && step <= ACT6N.greed; }
/** Próximo Bispo da revanche (ou null quando os quatro caíram). */
export function nextRematch(defeated) { return defeated >= 0 && defeated < REMATCH.length ? REMATCH[defeated] : null; }
export function greedReward(claimed) { return claimed ? { coins: 0, xp: 0 } : { coins: ACT6N.reward, xp: ACT6N.xp }; }

export const SPEAKERS6 = { hero: 'heroi', guide: 'Anjo-Guia', rival: 'Pessoa Misteriosa', sandra: 'Sandra', greed: 'Ganância', greedSky: 'Ganância (voz)', envy: 'Inveja',
  b1: 'VALÉRIO', b2: 'VORGAZHEK', b3: "ZAR'KHAEL", b4: 'VÉRAXION' };
const S = SPEAKERS6;
const say = (who, text, extra) => Object.assign({ type: 'say', who, text }, extra || {});
const shot = (id, dur, args, extra) => Object.assign({ type: 'shot', id, dur, args: args || {} }, extra || {});
const act = (id, args) => ({ type: 'do', id, args: args || {} });
const wait = dur => ({ type: 'wait', dur });

/* ---------- Falas (texto revisado; original em docs/roteiro/M7-ATO6.md) ---------- */
export function desertArrivalScene() {
  return [
    shot('deserto', 6, { cam: 'crane', anchor: 'statue', from: [-26, 5, -18], to: [-14, 13, -26], lookFrom: [0, 14, 0], lookTo: [0, 22, 0] }, { with: [act('titulo', { kicker: 'GALÁXIA 1 · ATO VI', title: 'O Deserto dos Fragmentos' }), act('som-descoberta')] }),
    say(S.rival, 'É ela. A estátua gigante que eu vi.', { actor: 'rival' }),
    say(S.hero, 'Uma esfera com quatro encaixes… Os fragmentos espaciais que os Bispos deixaram cair! Com os quatro, abrimos o portal para a dimensão da Ganância.')
  ];
}
export function statueScene() {
  return [
    shot('fragmentos', 3.2, { cam: 'crane', anchor: 'statue', from: [-10, 6, -30], to: [-6, 12, -27], lookFrom: [0, 12, -4], lookTo: [0, 20, -6] }, { with: [act('fragmentos')] }),
    act('caos'), wait(1.2),
    shot('caos', 4.5, { cam: 'crane', anchor: 'statue', from: [-26, 8, -48], to: [-20, 18, -40], lookFrom: [0, 16, 0], lookTo: [0, 10, -8] }, { with: [act('caos-forte')] }),
    shot('puxar', 2.2, { cam: 'crane', anchor: 'statue', from: [-26, 9, -46], to: [-21, 10, -42], lookFrom: [0, 5, -14], lookTo: [0, 6, -11] }, { with: [act('puxar-misteriosa')] }),
    shot('ganancia-surge', 2.8, { cam: 'look', on: 'greed', off: [5, 4, 13], at: [0, 3.4, 0] }, { with: [act('ganancia-aparece')] }),
    act('ganancia-some'), wait(1.2), act('calma')
  ];
}
export function closedPortalScene() {
  return [
    act('aviso-fragmentos'), wait(2.8),
    say(S.hero, 'O que eu faço agora? Além de o Anjo ter sido sequestrado, o meu único aliado também foi embora…'),
    say(S.greedSky, 'Se você quer resgatar os seus amigos, prove-me que é digno. Derrote novamente os quatro Bispos e venha até mim.', { actor: 'sky' }),
    say(S.hero, 'Como assim, os quatro Bispos? Eles já não foram derrotados?'),
    say(S.greedSky, 'Eu os revivi. Esta será a sua última missão.', { actor: 'sky' }),
    act('encontre-portal')
  ];
}
export function mysteryPortalScene() {
  return [say(S.hero, 'Um portal no meio do deserto? Deixa isso para depois. Não posso perder mais tempo.')];
}
const RM = {
  bishop1: { intro: [say(S.b1, 'Eu ganhei mais uma chance da Ganância, e desta vez não vou desperdiçá-la.'), say(S.hero, 'Até onde a Ganância vai brincar com as almas dos mortos?')], outro: [say(S.b1, 'Salve as nossas almas…')] },
  bishop2: { intro: [say(S.b2, 'Nos vemos novamente. Mas, desta vez, vai ser diferente: eu me sinto mais forte do que antes.')], outro: [say(S.b2, 'Fui derrotado novamente… Acho que nunca vou te vencer.')] },
  bishop3: { intro: [say(S.b3, 'Desta vez, a vitória é garantida.'), say(S.hero, 'Não vou pegar leve.')], outro: [say(S.b3, 'Pegue o meu fragmento espacial e suma daqui, já que é isso o que você deseja.')] },
  bishop4: { intro: [say(S.b4, 'Então você voltou. Desculpe, mas não posso deixar você passar daqui.')],
    outro: [say(S.b4, 'Que destino cruel… Se você se importa com a sua vida, vá embora daqui imediatamente. Não vale a pena arriscar a sua vida por humanos imundos.')] }
};
export function rematchIntroScene(key) { return RM[key].intro.slice(); }
export function rematchOutroScene(key) { return RM[key].outro.concat([act('fragmento-cai')]); }
export function returnStatueScene() {
  return [shot('fragmentos', 3.0, { cam: 'crane', anchor: 'statue', from: [-10, 6, -30], to: [-6, 12, -27], lookFrom: [0, 12, -4], lookTo: [0, 20, -6] }, { with: [act('fragmentos')] }), act('caos'), wait(1.6), act('puxar-heroi'), wait(1.8)];
}
export function greedIntroScene() {
  return [say(S.hero, 'Cadê os meus companheiros?'), say(S.greed, 'Se quiser descobrir, vença-me primeiro.')];
}
export function greedPhase2Scene() {
  return [act('transformar', { rig: 'greed2' }), wait(1.6), say(S.greed, 'Agora é que a batalha de verdade começa.')];
}
export function greedPhase3Scene() {
  return [
    act('transformar', { rig: 'greed3' }), wait(1.8),
    say(S.greed, 'Você é a segunda pessoa que me obriga a usar esta forma. Mas agora você não tem a mínima chance.'),
    say(S.hero, 'É impossível eu vencer isso…'),
    act('aliados-chegam'), wait(1.4),
    say(S.guide, 'Não desista. Isso ainda não acabou.', { actor: 'guide' }),
    say(S.rival, 'Nós estamos aqui. Vamos lutar até o fim.', { actor: 'rival' }),
    say(S.greed, 'Como vocês escaparam da cela? Bem, não que eu me importe. Isso não vai mudar o resultado. A vitória é minha.')
  ];
}
export function greedFallScene() {
  return [
    act('ultimate-heroi'), wait(1.8), act('ultimate-anjo'), wait(1.6), act('ultimate-sandra'), wait(1.6),
    act('tudo-branco'), wait(1.6), act('ganancia-caida'), wait(1),
    say(S.greed, 'Não, não, nãooooo! Fui derrotado por meros anjos de baixo escalão e por um simples Bispo que eu descartei? Não acredito nisso…'),
    say(S.hero, 'Finalmente acabou… Isso graças a vocês.'),
    say(S.rival, 'Na verdade, sem você isso seria impossível.', { actor: 'rival' }),
    say(S.guide, 'Agora este mundo estará a salvo.', { actor: 'guide' }),
    say(S.greed, 'Ahahaha! Vocês acham que acabou? Vocês salvaram este mundo… e os outros seis? Os outros Pecados não serão vencidos. Comparada a eles, eu sou apenas um simples Pecado fraco…'),
    shot('inveja', 3, { cam: 'look', on: 'envy', off: [3, 3, 8], at: [0, 3, 0] }, { with: [act('rachadura'), act('inveja-surge')] }),
    say(S.greed, 'Isso não é possível! O que o Pecado da Inveja está fazendo nesta dimensão?'),
    say(S.hero, 'Pecado da Inveja?'),
    say(S.rival, 'Como assim? Existem outros Pecados?', { actor: 'rival' }),
    say(S.guide, 'Temos que fugir! Ainda não temos a mínima chance!', { actor: 'guide' }),
    say(S.envy, 'Ganância, como ousa manchar a reputação dos Pecados e perder para esses vermes? Eu vim aqui te destruir e roubar a sua alma para me fortalecer. Não precisamos de gente fraca como você.', { actor: 'envy' }),
    say(S.greed, 'Não faça isso! Me dê mais uma chance!'),
    say(S.envy, 'Desapareça!', { actor: 'envy' }),
    act('roubar-alma'), wait(2.6),
    say(S.envy, 'Espero vocês no meu mundo.', { actor: 'envy' }),
    act('inveja-some'), wait(1.2)
  ];
}
export function epilogueScene() {
  return [
    say(S.hero, 'O que a gente faz agora?'),
    say(S.guide, 'Vamos salvar o próximo mundo.', { actor: 'guide' }),
    say(S.rival, 'Não estou entendendo nada. Essa história de anjo… e como assim existem outros Pecados e outros mundos?', { actor: 'rival' }),
    say(S.guide, 'Vou dar uma explicação resumida. Existem sete mundos, e em cada um habita um Pecado. Esses Pecados trazem destruição a esses mundos, e o nosso objetivo é salvar todos eles.', { actor: 'guide' }),
    say(S.guide, 'Nós somos anjos enviados por Deus. O nosso próximo objetivo é salvar o mundo onde habita a Inveja, um dos sete pecados capitais.', { actor: 'guide' }),
    say(S.rival, 'Isso é muito difícil de acreditar… Bem que eu suspeitei da força de vocês, que está além do nível humano.', { actor: 'rival' }),
    act('sandra-revela'), wait(1.8),
    say(S.sandra, 'A propósito, eu me chamo Sandra.', { actor: 'rival' }),
    say(S.hero, 'Pera aí… você era mulher esse tempo todo?'),
    say(S.sandra, 'Sim. Você não percebeu?', { actor: 'rival' }),
    say(S.guide, 'Chega de conversa fiada. Parece que o mundo já voltou ao normal. Agora temos que ir o mais rápido possível para o próximo mundo.', { actor: 'guide' }),
    say(S.hero, 'E a Sandra?'),
    say(S.sandra, 'Por acaso… eu posso ir com vocês?', { actor: 'rival' }),
    say(S.guide, 'A nossa jornada será muito perigosa. Você tem certeza?', { actor: 'guide' }),
    say(S.sandra, 'Simm! Eu também posso ajudar com equipamentos e, não parece, mas sou bastante inteligente: posso fazer várias estratégias.', { actor: 'rival' }),
    say(S.hero, 'Então vamos.'),
    shot('portal-anjos', 5, { cam: 'crane', anchor: 'angels', from: [56, 7, 8], to: [48, 10, 7], lookFrom: [0, 12, 0], lookTo: [0, 16, 0] }, { with: [act('portal-anjos')] }),
    act('entrar-portal'), wait(3.2), act('escuro6'), wait(1.2)
  ];
}
