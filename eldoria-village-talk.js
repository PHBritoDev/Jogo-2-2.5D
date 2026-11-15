/**
 * Vila da Clareira — conversas jogáveis com os moradores (Mod 319+). Puro, sem Three: testável em Node.
 *
 * Não é IA conversacional ilimitada nem LLM: é diálogo ramificado curto, escrito por personagem, que muda com o
 * momento do Ato I (fase da missão), a hora (noite), e uma memória leve por NPC (quantas conversas, tópicos já
 * perguntados, desconfiança de Téo). Nada aqui avança missão, dá moedas ou altera recompensas: a sequência canônica
 * do vendedor (PERGUNTAR · TÉO, saco de ouro, vendorScene) continua no act1-flow e tem prioridade no jogo.
 *
 * Fases (a partir de questStep): chegada (0–1, antes de Téo falar), floresta (2–5: crianças, gaiola, esgoto),
 * portal (6–7), depois (8+: VHAZRAEL caiu). Nenhuma fala contradiz o roteiro: quem sabe do Pecado e de VHAZRAEL antes
 * da cena é só Téo, e ele só conta na cena canônica.
 */
export const TALK_STORE = 'seven-sins-3d-village-talk';

export function talkPhase(questStep = 0) {
  return questStep <= 1 ? 'chegada' : questStep <= 5 ? 'floresta' : questStep <= 7 ? 'portal' : 'depois';
}
const isNight = h => h >= 19 || h < 5.5;
const pick = (arr, n) => arr[((n % arr.length) + arr.length) % arr.length];

/** Quem é quem: nome mostrado, abertura por fase/memória e tópicos (rótulo, falas por fase, gesto). */
export const VILLAGE_TALK = Object.freeze({
  bento: {
    name: 'Bento · Alimentos', gesture: 'inspect',
    open: {
      first: ['Hm? Um rosto novo. Chegue perto, forasteiro, que meus olhos já não alcançam longe.'],
      again: ['Voltou para ouvir um velho? Pouca gente faz isso hoje em dia.', 'Ainda por aqui. Bom. Sente o cheiro? É o que sobrou da colheita.'],
      night: ['Tão tarde… Não devia andar por aí a esta hora. A mata não dorme.'],
      depois: ['Dizem que a mata ficou quieta de novo. Faz tempo que não durmo assim.'],
    },
    topics: [
      { id: 'vila', label: 'Como está a vila?', gesture: 'none', say: {
        chegada: ['Já foi a vila mais farta da clareira. Hoje a gente divide o pouco que tem e finge que basta.', 'Os cobradores levaram o dinheiro. As casas ficaram, a fome também.'],
        floresta: ['Desde que você foi para a mata, o povo cochicha. Uns têm esperança, outros têm mais medo ainda.'],
        portal: ['Há uma luz estranha para os lados do penhasco. Ninguém aqui ousa olhar muito tempo.'],
        depois: ['Respira-se melhor. Não é fartura, mas é alívio. E alívio, na minha idade, é muito.'] } },
      { id: 'barraca', label: 'E a sua barraca?', gesture: 'inspect', say: {
        chegada: ['Arroz miúdo, raiz seca e um pão que já foi pão. Separo o que presta; o resto vira ração.', 'Ninguém mais cuida desta barraca, só eu. As costas reclamam, mas as mãos ainda obedecem.'],
        floresta: ['Guardei um pouco do que sobrou para as famílias das crianças. É o que posso fazer.'],
        portal: ['Hoje não abri o saco de cevada. Melhor guardar, se as coisas piorarem.'],
        depois: ['Talvez semana que vem chegue farinha de outra aldeia. Talvez.'] } },
      { id: 'conselho', label: 'Algum conselho?', gesture: 'none', hint: true },
    ],
  },
  teo: {
    name: 'Téo · Provisões', gesture: 'alert',
    open: {
      first: ['Vai comprar ou vai só olhar?'],
      again: ['De novo você. Fale baixo.', 'Hm. Você não desiste, né?'],
      suspicious: ['Você pergunta demais, forasteiro. Gente que pergunta demais some.'],
      night: ['Fecho já. De noite eu não vendo, não converso e não vejo ninguém.'],
      depois: ['Fale baixo. Uma queda não é a guerra inteira.'],
    },
    topics: [
      { id: 'provisoes', label: 'O que você vende?', gesture: 'inspect', say: {
        chegada: ['Provisões… se é que dá pra chamar isso de comida. Carne seca, sal, corda. Tudo caro, tudo pouco.'],
        floresta: ['Corda e tocha, se vai voltar pra mata. O resto não vai te salvar.'],
        portal: ['Não sobrou corda. Alguém andou comprando tudo. Não pergunte quem.'],
        depois: ['Os preços vão baixar. Ou não. Aqui ninguém aposta em nada.'] } },
      { id: 'rumores', label: 'Ouviu algum rumor?', gesture: 'alert', suspicion: 1, say: {
        chegada: ['Rumor não enche barriga, forasteiro.', 'Já disse: rumor não enche barriga. Agora some, antes que alguém nos veja.'],
        floresta: ['Eu já te disse o que sabia. Agora some, antes que alguém nos veja.'],
        portal: ['Você ainda está vivo? Então ande depressa.'],
        depois: ['VHAZRAEL caiu? Fale baixo… ainda há outros.'] } },
      { id: 'cobradores', label: 'Quem são os cobradores?', gesture: 'alert', suspicion: 1, say: {
        chegada: ['Gente que cobra em nome de quem ninguém viu. Paga-se, ou não se acorda no dia seguinte.'],
        floresta: ['Andam mais nervosos. Algo os incomodou na mata. Se foi você… cuidado.'],
        portal: ['Sumiram dois dias. Quando somem, é pior.'],
        depois: ['Ainda passam por aqui. Menos cheios de si, é verdade.'] } },
    ],
  },
  lia: {
    name: 'Lia · Frutas', gesture: 'inspect',
    open: {
      first: ['Olá. Estou separando as frutas que ainda podem alimentar alguém. Fique à vontade.'],
      again: ['Você de novo! Quer ajuda para escolher?', 'Que bom ver você inteiro.'],
      night: ['Ainda acordado? As mães da vila nem acendem a lamparina mais.'],
      depois: ['As crianças voltaram a brincar perto da fonte. Ouviu? Que som bonito.'],
    },
    topics: [
      { id: 'frutas', label: 'Como estão as frutas?', gesture: 'inspect', say: {
        chegada: ['Metade está podre antes de amadurecer. A terra anda cansada… ou triste, minha avó diria.', 'As boas vão primeiro para quem está doente. As outras eu corto e salvo o que dá.'],
        floresta: ['Guardei estas para as famílias das crianças desaparecidas. Não é muito, mas é doce.'],
        portal: ['Hoje nem consegui arrumar a banca. As mãos tremem.'],
        depois: ['Brotou um galho novo na pereira do adro. Pequeno, mas verde.'] } },
      { id: 'doentes', label: 'Há muitos doentes?', gesture: 'none', say: {
        chegada: ['Fome adoece mais que febre. Os velhos e os pequenos primeiro, sempre.'],
        floresta: ['Mais do que ontem. O medo também adoece, sabe?'],
        portal: ['Uma mãe não come há dois dias. Diz que só come quando o filho voltar.'],
        depois: ['Menos. A esperança cura um pouco, eu juro que cura.'] } },
      { id: 'mata', label: 'E a mata?', gesture: 'alert', say: {
        chegada: ['Ninguém tem coragem de sair à noite. Téo conhece histórias da mata, se tiver paciência com ele.'],
        floresta: ['Então é verdade, o choro? Que os céus te guardem lá dentro.'],
        portal: ['A caverna é um lugar perigoso. Prometa que volta.'],
        depois: ['Quero colher amoras lá de novo. Um dia. Com você por perto, talvez.'] } },
    ],
  },
  morador: {
    name: 'Morador da praça', gesture: 'alert',
    open: {
      first: ['…Desculpe, levei um susto. Pouca gente de fora passa por aqui agora.'],
      again: ['Você ainda por aqui? Fico mais tranquilo, até.'],
      night: ['Procure um teto, moço. À noite a praça não é de ninguém.'],
      depois: ['Eu vi você voltar. A praça inteira viu.'],
    },
    topics: [
      { id: 'praca', label: 'O que aconteceu aqui?', gesture: 'none', say: {
        chegada: ['Vieram cobrar o tributo e não sobrou moeda em casa nenhuma. Nem a da fonte dos desejos.'],
        floresta: ['Falam de crianças vendidas. Eu não acredito… não quero acreditar.'],
        portal: ['Os mais velhos rezam virados para o penhasco. Dizem que é de lá que vem o frio.'],
        depois: ['Vamos limpar a praça no domingo. Se quiser ajudar, traga as mãos.'] } },
      { id: 'fonte', label: 'Por que a fonte secou?', gesture: 'none', say: {
        chegada: ['Secou no ano do tributo. Coincidência, dizem. Eu não acho.', 'Ainda pinga às vezes, à noite. Como se chorasse.'],
        floresta: ['Hoje de manhã tinha um fio d’água. Só um fio.'],
        portal: ['Seca de novo. Nem gota.'],
        depois: ['Pingou a noite inteira. A moça do balde até sorriu.'] } },
      { id: 'cobradores', label: 'E os cobradores?', gesture: 'alert', say: {
        chegada: ['Não diga essa palavra alto. Eles têm ouvidos em toda parte.'],
        floresta: ['Passaram ontem, mais apressados. Algo os deixou nervosos.'],
        portal: ['Não apareceram. O silêncio deles me assusta mais que a visita.'],
        depois: ['Vão voltar, eu sei. Mas a gente também aprendeu a não baixar a cabeça.'] } },
    ],
  },
  moradora: {
    name: 'Moradora com balde', gesture: 'inspect',
    open: {
      first: ['Ah! Não me assuste assim. Estou indo até a fonte… mesmo sabendo que está seca.'],
      again: ['Outra volta, outro balde vazio. Mas eu vou, todo dia.'],
      night: ['Shh. Vou só até a fonte e volto. Hábito.'],
      depois: ['Ouvi dizer que a fonte pingou a noite toda! Vou ver com meus olhos.'],
    },
    topics: [
      { id: 'ajuda', label: 'Precisa de ajuda?', gesture: 'none', say: {
        chegada: ['Gentileza sua. Mas o balde vazio não pesa — é o vazio que pesa.'],
        floresta: ['Ajude as crianças, isso sim. O meu balde espera.'],
        portal: ['Se for para o penhasco, leve água. Eu não tenho, mas alguém tem.'],
        depois: ['Já ajudou. Mais do que imagina.'] } },
      { id: 'fonte', label: 'Por que vai à fonte seca?', gesture: 'inspect', say: {
        chegada: ['Minha mãe ia todo dia, a mãe dela também. Se eu parar, parece que desisti.'],
        floresta: ['Hoje vi umidade na pedra. Pode ser nada. Pode ser começo.'],
        portal: ['Seca. Mas eu volto amanhã.'],
        depois: ['Se encher, a primeira caneca é sua.'] } },
      { id: 'familia', label: 'Mora sozinha?', gesture: 'none', say: {
        chegada: ['Com meu irmão. Ele carrega sacos do largo da ponte até a mesa de ração. Pouco pagamento, muito peso.'],
        floresta: ['Meu irmão não dorme desde que falaram das crianças. Ele tem dois filhos pequenos.'],
        portal: ['Estamos todos em casa cedo agora. Todos.'],
        depois: ['Meu irmão riu ontem. Fazia tanto tempo que estranhei o som.'] } },
    ],
  },
  carregador: {
    name: 'Carregador', gesture: 'none',
    open: {
      first: ['Ufa… Licença, forasteiro. Esse saco não espera.'],
      again: ['De novo no meu caminho? Brincadeira. Fale, enquanto eu respiro.'],
      night: ['Última viagem do dia. Depois, casa.'],
      depois: ['O saco hoje parece mais leve. Deve ser o humor.'],
    },
    topics: [
      { id: 'saco', label: 'O que você carrega?', gesture: 'none', say: {
        chegada: ['Ração, do largo da ponte até a mesa da praça. Volto vazio, levo de novo. Assim o dia todo.'],
        floresta: ['Menos ração esta semana. Os cobradores levaram parte.'],
        portal: ['Hoje só palha para as camas. Ninguém quis sair para buscar grão.'],
        depois: ['Grão de verdade! Pouco, mas de verdade.'] } },
      { id: 'ponte', label: 'E a ponte?', gesture: 'none', say: {
        chegada: ['É o único caminho seguro pelo rio. A correnteza leva quem tenta atravessar a pé.'],
        floresta: ['Vi luzes do outro lado, à noite. Não fui ver. Não sou tolo.'],
        portal: ['Ninguém cruza mais. Só eu, com o saco.'],
        depois: ['Gente de outra aldeia cruzou ontem. Pela primeira vez em meses.'] } },
    ],
  },
});
export const TALK_IDS = Object.freeze(Object.keys(VILLAGE_TALK));

/** Memória leve (localStorage): {v, npc:{id:{n, topics:{t:k}, suspicion, lastPhase}}}. Lida/gravada com try/catch. */
export function loadTalkMemory(storage) {
  try { const raw = JSON.parse(storage && storage.getItem(TALK_STORE) || 'null'); if (raw && raw.v === 1 && raw.npc && typeof raw.npc === 'object') return raw; } catch (_) { /* memória corrompida: começa limpa, nunca quebra o jogo */ }
  return { v: 1, npc: {} };
}
export function saveTalkMemory(storage, mem) { try { storage && storage.setItem(TALK_STORE, JSON.stringify(mem)); return true; } catch (_) { return false; } }
const npcMem = (mem, id) => (mem.npc[id] = mem.npc[id] || { n: 0, topics: {}, suspicion: 0, lastPhase: null });

/**
 * Abre a conversa: {who, gesture, opening:[{who,text}], options:[{id,label}]} e atualiza a memória (n++).
 * ctx: {questStep, hour, hint?: string} — hint é a pista canônica existente do vendedor (preservada como tópico).
 */
export function openConversation(id, ctx = {}, mem = { v: 1, npc: {} }) {
  const T = VILLAGE_TALK[id]; if (!T) return null;
  const m = npcMem(mem, id), phase = talkPhase(ctx.questStep), night = isNight(ctx.hour ?? 12);
  let line;
  if (id === 'teo' && m.suspicion >= 3 && phase === 'chegada') line = pick(T.open.suspicious, m.n);
  else if (night && T.open.night) line = pick(T.open.night, m.n);
  else if (phase === 'depois' && T.open.depois) line = pick(T.open.depois, m.n);
  else if (m.n === 0 && phase === 'chegada') line = pick(T.open.first, 0);
  else if (m.n === 0) line = pick(T.open.again, 0); // o herói já passou pela vila nesta fase: não se apresenta de novo
  else line = pick(T.open.again, m.n);
  // reconhece que o herói voltou de uma etapa da missão (memória de fase)
  const back = m.n > 0 && m.lastPhase && m.lastPhase !== phase && phase !== 'chegada' ? [{ who: T.name, text: phase === 'depois' ? 'Então é verdade o que contam de você.' : phase === 'portal' ? 'Você voltou da mata. Inteiro, graças aos céus.' : 'Ouvi passos na trilha da mata ontem. Eram seus?' }] : [];
  m.n++; m.lastPhase = phase;
  return { who: T.name, gesture: m.n === 1 ? 'wave' : T.gesture, opening: [...back, { who: T.name, text: line }], options: listOptions(id, ctx, mem) };
}
export function listOptions(id, ctx = {}, mem = { v: 1, npc: {} }) {
  const T = VILLAGE_TALK[id]; if (!T) return [];
  const m = npcMem(mem, id);
  const opts = T.topics.filter(t => !t.hint || ctx.hint).map(t => ({ id: t.id, label: t.label + ((m.topics[t.id] || 0) > 0 && !t.hint ? ' ·' : '') }));
  return [...opts, { id: 'tchau', label: 'Até mais.' }];
}
/** Resposta a um tópico: {pages:[{who,text}], gesture, done:boolean}. Repetições avançam pelas falas (sem repetir igual em seguida). */
export function answerTopic(id, topicId, ctx = {}, mem = { v: 1, npc: {} }) {
  const T = VILLAGE_TALK[id]; if (!T) return { pages: [], gesture: 'none', done: true };
  if (topicId === 'tchau') { const bye = id === 'teo' ? 'Hm.' : id === 'lia' ? 'Cuide-se. De verdade.' : id === 'bento' ? 'Vá com cuidado, rapaz.' : 'Até.'; return { pages: [{ who: T.name, text: bye }], gesture: 'none', done: true }; }
  const t = T.topics.find(x => x.id === topicId); if (!t) return { pages: [], gesture: 'none', done: true };
  const m = npcMem(mem, id), k = m.topics[topicId] || 0; m.topics[topicId] = k + 1;
  if (t.suspicion) m.suspicion += t.suspicion;
  const phase = talkPhase(ctx.questStep);
  const text = t.hint ? ctx.hint : pick(t.say[phase] || t.say.chegada, k);
  const pages = [{ who: T.name, text }];
  if (id === 'teo' && m.suspicion === 3 && phase === 'chegada') pages.push({ who: T.name, text: 'E pare de rondar minha banca perguntando coisa. Se quer saber algo, sabe o que fazer.' });
  return { pages, gesture: t.gesture || 'none', done: false };
}
