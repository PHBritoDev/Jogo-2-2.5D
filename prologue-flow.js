/**
 * MOD 203 — Marco 1: prólogo no céu, despertar e chamado do Ato I.
 * Texto revisado a partir do roteiro original do autor (comparação em docs/roteiro/M1-PROLOGO.md).
 * O nome digitado pelo jogador é usado nas falas; nenhum nome fixo.
 */
import { createDirector } from './cutscenes3d.js';
export { createDirector };

export const SPEAKERS = { god: 'Deus', guide: 'Anjo-Guia' }; // no prólogo o guia fala com o próprio nome (GUIDE_NAME)

/** C01–C06 · Reino Celestial: caminhada até o trono, ajoelhar, a missão, asas e aura retiradas. */
export function heavenScene() {
  return [
    { type: 'shot', id: 'ceu-panorama', dur: 6, with: [{ id: 'titulo', args: { kicker: 'PRÓLOGO', title: 'O Reino Celestial' } }] },
    { type: 'shot', id: 'ceu-caminhada', dur: 9, with: [{ id: 'heroi-caminha' }] },
    { type: 'shot', id: 'ceu-chegada', dur: 2.6, with: [{ id: 'heroi-ajoelha' }] },
    { type: 'shot', id: 'ceu-trono', dur: 2.2 },
    { type: 'say', who: SPEAKERS.god, text: 'Levanta os teus olhos, meu filho. Sete mundos caminham para a destruição — e em cada um deles reina um Pecado Capital.' },
    { type: 'say', who: SPEAKERS.god, text: 'Eu te envio a eles. Não como conquistador, mas como luz: salva os sete mundos antes que o pecado os consuma por inteiro.' },
    { type: 'shot', id: 'ceu-asas', dur: 1.6 },
    { type: 'say', who: SPEAKERS.god, text: 'Lá embaixo, as asas chamariam atenção demais, e a glória cegaria quem a carrega. Deixarás aqui as tuas asas e a tua aura.' },
    { type: 'shot', id: 'ceu-retirada', dur: 4.2, with: [{ id: 'retirar-asas' }] },
    { type: 'say', who: SPEAKERS.god, text: 'No quarto mundo, poderás reavê-las — se ainda te lembrares de por que as recebeste.' },
    { type: 'say', who: 'heroi', text: 'Eis-me aqui. Envia-me.' },
    { type: 'shot', id: 'ceu-luz', dur: 2.4, with: [{ id: 'clarão' }] }
  ];
}

/**
 * MOD 317 — Despertar humano (roteiro v1, cena P0): tela escura → visão do chão para o céu com piscadas → o corpo levanta
 * de verdade (clipe Arise) → a câmera sai dos olhos para a terceira pessoa. Aethraziel JÁ está ao lado desde o primeiro
 * quadro: esperou o herói acordar (nada de anjo surgindo do nada). Falas curtas do roteiro, nome escolhido pelo jogador.
 */
export const GUIDE_NAME = 'Aethraziel';
export const GUIDE_PUBLIC_NAME = 'Vaelthar';
export function awakeningScene() {
  return [
    { type: 'shot', id: 'deitado', dur: 4.4, with: [{ id: 'deitado' }, { id: 'piscar-despertar' }] },
    { type: 'say', who: GUIDE_NAME, text: 'Consegue ficar em pé?' },
    { type: 'shot', id: 'levantar', dur: 2.6, with: [{ id: 'levantar' }] },
    { type: 'say', who: 'heroi', text: 'Onde… eu estou? Quem é você?' },
    { type: 'say', who: GUIDE_NAME, text: 'Aethraziel. Fui enviado para acompanhar você.' },
    { type: 'say', who: 'heroi', text: 'Acompanhar para onde?' },
    { type: 'say', who: GUIDE_NAME, text: 'Ainda precisamos descobrir por onde começar. Antes… como devo chamá-lo?' },
    { type: 'ask', id: 'nome' },
    { type: 'say', who: GUIDE_NAME, text: 'Certo, {nome}. Ande comigo. Aqui não é seguro ficar parado.' },
    { type: 'shot', id: 'olhar-em-volta', dur: 4.2, with: [{ id: 'heroi-repouso' }] },
    { type: 'ask', id: 'aceitar-missao' },
    { type: 'do', id: 'prologo-card' },
    { type: 'wait', dur: 2.6 }
  ];
}

/** Antes de qualquer humano vê-lo: o herói repara nas asas e Aethraziel as recolhe (gesto curto + brilho que se fecha). */
export function wingsScene() {
  return [
    { type: 'shot', id: 'asas-anjo', dur: 2.2, args: { cam: 'two', a: 'hero', b: 'guide', side: -1, dist: 4.4 } },
    { type: 'say', who: 'heroi', text: 'O que aconteceu com suas asas?' },
    { type: 'shot', id: 'asas-recolher', dur: 2.6, args: { cam: 'two', a: 'hero', b: 'guide', side: 1, dist: 5.6 }, with: [{ id: 'anjo-recolhe-asas' }] },
    { type: 'say', who: GUIDE_NAME, text: 'Elas continuam aqui. Não é prudente que todos saibam.' },
    { type: 'say', who: GUIDE_NAME, text: 'Diante das pessoas, me chame de Vaelthar.' },
    { type: 'do', id: 'carroca-ouvida' },
    { type: 'say', who: GUIDE_NAME, text: 'Ouça. Rodas na estrada — alguém vem da garganta.' }
  ];
}

export const MISSION_PROLOGUE = {
  kicker: 'PRÓLOGO · O CHÃO DESCONHECIDO',
  title: 'Passageiros da estrada',
  objective: 'Siga com Aethraziel até a estrada de terra.'
};

/** Troca {nome} pelo nome do jogador e "heroi" pelo nome como orador. */
export function personalize(step, name) {
  const n = String(name || 'Viajante');
  if (step.type !== 'say') return step;
  return { ...step, who: step.who === 'heroi' ? n : step.who, text: step.text.replace(/\{nome\}/g, n) };
}

export const MISSION_ACT1 = {
  kicker: 'MISSÃO PRINCIPAL',
  title: 'O Pecado da Ganância',
  objective: 'Encontre uma pequena vila, fale com um vendedor e descubra onde o Pecado da Ganância está.'
};
