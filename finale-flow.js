/**
 * MOD 197 — Arco final da Galáxia 1: os quatro Bispos no portal e o Pecado da Ganância (três formas).
 * Dados e regras puras; testes em finale-flow.test.mjs. Passos 26–30.
 */
const say = (who, text) => ({ who, text });
export const FINALE = { talk: 26, gauntlet: 27, sin: 28, epilogue: 29, done: 30, reward: { coins: 250, xp: 800 } };
export const FINAL_PORTAL = { x: 44, z: -116 };
/** Arena do vazio: abaixo do mundo, longe do alcance da câmera. */
export const VOID = { x: 0, z: 0, y: -2000, radius: 30 };

export const GAUNTLET = [
  { rig: 'bishop1', profile: 'fallen1', name: 'VHAZRAEL · O PRIMEIRO', hp: 260, line: 'Eu contava moedas para não ouvir o que dorme lá embaixo. Volta, enquanto ainda tens um nome.' },
  { rig: 'bishop2', profile: 'fallen2', name: 'VORGAZHEK · O SEGUNDO', hp: 300, line: 'Endividamos o mundo inteiro para que a Ganância nunca tivesse fome. Tu queres pagar a conta de uma vez?' },
  { rig: 'bishop3', profile: 'fallen3', name: "ZAR'KHAEL · O TERCEIRO", hp: 340, line: 'Ajoelhamos todos para que ninguém se levantasse até o selo. Não abras a porta que nós mesmos trancamos.' },
  { rig: 'bishop4', profile: 'fallen4', name: 'VÉRAXION · O QUARTO', hp: 380, line: 'Eu guardei o último selo com o amor dos outros. Se caíres lá dentro, ninguém mais o fecha.' }
];
export const SIN_FORMS = [
  { rig: 'greed1', profile: 'greed1', name: 'GANÂNCIA · PRIMEIRA FORMA', hp: 520, line: 'Quatro guardas, quatro almas vendidas — e todas para mim. Obrigado por abrir a porta.' },
  { rig: 'greed2', profile: 'greed2', name: 'GANÂNCIA · SEGUNDA FORMA', hp: 620, line: 'Tu me feres e eu cresço. Tudo o que é tirado de mim, eu cobro em dobro.' },
  { rig: 'greed3', profile: 'greed3', name: 'GANÂNCIA · FORMA FINAL', hp: 760, line: 'Então devoro a própria fome. Não sobrará ninguém para desejar coisa alguma.' }
];

export function finaleTalkLines(name) {
  return [
    say('Anjo-Guia', 'Antes de seguirmos, preciso te contar o que eu suspeitava desde a primeira gaiola. Os Bispos e seus servos eram gente — venderam a alma em troca de poder, riqueza e controle.'),
    say('Anjo-Guia', 'Cada selo que caiu deixou uma fenda. As quatro juntas reabriram o portal da montanha — agora ele leva ao lugar onde a Ganância verdadeira foi presa.'),
    say(name || 'Protagonista', 'Então não vencemos quatro inimigos. Abrimos quatro fechaduras.'),
    say('Anjo-Guia', 'Sim. Por isso, ouça a regra: se você cair no caminho, recomeçamos desde o primeiro guardião. O resto da jornada continua seu — mas essa porta exige tudo de uma vez.')
  ];
}
export function gauntletIntroLines() {
  return [
    say('VHAZRAEL', 'Para. Não por ódio — por medo. Nós quatro nos unimos contra ela, há muito tempo. O preço do selo fomos nós.'),
    say('VÉRAXION', 'Se tu atravessares e caíres, o mundo inteiro vira moeda. Não podemos deixar.'),
    say('Anjo-Guia', 'Eles não mentem. Mas a prisão deles também é a do mundo. Um de cada vez — e sem ódio.')
  ];
}
export function sinIntroLines(name) {
  return [
    say('GANÂNCIA', 'Olha ao redor. Cada olho é um desejo que alguém alimentou. Eu não precisei mentir para nenhum deles.'),
    say(name || 'Protagonista', '“Pois o amor ao dinheiro é a raiz de todos os males.” Eu não vim te negociar. Vim arrancar a raiz.')
  ];
}
export function epilogueLines(name) {
  return [
    say('Anjo-Guia', 'Acabou. Os olhos se fecharam, a fenda se dobrou como papel molhado. Você voltou — e a floresta também.'),
    say('VHAZRAEL', '…Eu lembro do meu nome de antes. Era Elias. Eu vendia pão. Me perdoem as gaiolas.'),
    say('Dona Arruda', 'O homem que cobrava a gente está ajudando a erguer a ponte do canal. Não sei se perdoo. Mas ele está ajudando.'),
    say('Irmã Celeste', 'O vale reza sem ingresso. E alguns dos zelotes rezam junto, envergonhados.'),
    say('Tomé', 'A serra devolve o eco. Ontem alguém gritou o nome da esposa — e ela respondeu.'),
    say('Anjo-Guia', (name || 'Viajante') + ', quando nos conhecemos eu pedi teu nome para que ninguém o comprasse. Ninguém comprou. Eu… me chamo Auren. Agora você pode me chamar assim.'),
    say('Auren', 'Há outra galáxia gemendo nas correntes. Venha — a passagem está aberta.')
  ];
}

/** Morte durante o arco final: recomeça do primeiro guardião (regra anunciada antes). */
export function finaleAfterDeath(state) {
  return { questStep: FINALE.gauntlet, gauntletIndex: 0, sinForm: 0, inVoid: false };
}
export function nextGauntlet(index) {
  const next = index + 1;
  return next >= GAUNTLET.length ? { done: true, index: GAUNTLET.length } : { done: false, index: next };
}
export function nextSinForm(form) {
  const next = form + 1;
  return next >= SIN_FORMS.length ? { done: true, form: SIN_FORMS.length } : { done: false, form: next };
}
export function finaleReward(claimed) { return claimed ? { coins: 0, xp: 0 } : { ...FINALE.reward }; }
