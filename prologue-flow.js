/**
 * MOD 203 — Marco 1: prólogo no céu, despertar e chamado do Ato I.
 * Texto revisado a partir do roteiro original do autor (comparação em docs/roteiro/M1-PROLOGO.md).
 * O nome digitado pelo jogador é usado nas falas; nenhum nome fixo.
 */
import { createDirector } from './cutscenes3d.js';
export { createDirector };

export const SPEAKERS = { god: 'Deus', guide: 'Anjo-Guia' };

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

/** C08–C12 · Despertar no Mundo da Ganância: olhos abrindo, as mãos, o redor, o nome e o chamado. */
export function awakeningScene() {
  return [
    { type: 'shot', id: 'olhos-abrem', dur: 3.2, with: [{ id: 'palpebras' }, { id: 'heroi-olha-maos' }] },
    { type: 'shot', id: 'maos', dur: 3.4 },
    { type: 'shot', id: 'olhar-em-volta', dur: 5.2, with: [{ id: 'heroi-repouso' }] },
    { type: 'shot', id: 'anjo-chega', dur: 2.6, with: [{ id: 'anjo-aparece' }] },
    { type: 'say', who: SPEAKERS.guide, text: 'Finalmente acordaste. Antes de qualquer passo neste mundo… como devo te chamar?' },
    { type: 'ask', id: 'nome' },
    { type: 'say', who: 'heroi', text: 'Pode me chamar de {nome}.' },
    { type: 'say', who: SPEAKERS.guide, text: 'Eu sou o Anjo Guiador. Serei eu quem irá te guiar nesta jornada. Bem-vindo, {nome}, ao Mundo da Ganância.' },
    { type: 'say', who: 'heroi', text: 'Então… por onde devo começar?' },
    { type: 'say', who: SPEAKERS.guide, text: 'Procure uma pequena vila. Fale com algum vendedor e descubra onde o Pecado da Ganância está.' },
    { type: 'ask', id: 'aceitar-missao' },
    { type: 'do', id: 'ato-1' },
    { type: 'wait', dur: 3.2 },
    { type: 'do', id: 'escuro' },
    { type: 'wait', dur: 2.4 }
  ];
}

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
