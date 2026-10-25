/**
 * MOD 202 — Dimensões dos Bispos, dentro do mundo 3D (regras puras; testes em dimensions3d.test.mjs).
 * Cada Bispo tem um portal no mundo e uma dimensão própria, abaixo dele. A luta usa o mesmo motor do mundo
 * (HUDs, câmera, habilidades, vida); só o cenário e a apresentação "jogador VS Bispo" mudam.
 * "greed" é a dimensão 5 — a do Pecado da Ganância — e não é um quinto Bispo.
 */
export const DIM_FLOOR_Y = -2000;

export const DIMENSIONS = {
  bishop1: {
    key: 'bishop1', order: 1, name: 'VALÉRIO', title: 'O Primeiro Bispo', epithet: 'O Guardião das Moedas',
    kicker: 'DIMENSÃO I · A CÂMARA DAS MOEDAS', portrait: 'Bispo1-ui.webp', rig: 'bishop1', profile: 'valerio', hp: 260,
    line: '“Toda alma tem um último pedido. A sua terá o privilégio de morrer sem ser ouvida.”',
    rage: 'Cada moeda que cai é uma alma que você não salvou.',
    center: { x: 400, z: 0 }, radius: 30, accent: '#e0b040', theme: 'vault'
  },
  bishop2: {
    key: 'bishop2', order: 2, name: 'VORGAZHEK', title: 'O Segundo Bispo', epithet: 'O Arauto das Almas Endividadas',
    kicker: 'DIMENSÃO II · O OLHO QUE COBRA', portrait: 'Bispo2-ui.webp', rig: 'bishop2', profile: 'vorgazhek', hp: 560,
    line: '“Ouro compra riquezas. Sangue compra tempo. Mas a tua alma… essa já me pertence.”',
    rage: 'Cada golpe teu é juros. E juros… eu cobro em dobro.',
    center: { x: 800, z: 0 }, radius: 30, accent: '#e0303c', theme: 'eyes'
  },
  bishop3: {
    key: 'bishop3', order: 3, name: "ZAR'KHAEL", title: 'O Terceiro Bispo', epithet: 'O Carrasco do Juízo Eterno',
    kicker: 'DIMENSÃO III · O CORREDOR DOS JOELHOS', portrait: 'Bispo3-ui.webp', rig: 'bishop3', profile: 'zarkhael', hp: 640,
    line: '“Ajoelha-te… para que tua última visão seja a mão que apagará tua existência.”',
    rage: 'O juízo não tem pressa — mas agora tem fome.',
    center: { x: 1200, z: 0 }, radius: 30, accent: '#d8d8e8', theme: 'mushrooms'
  },
  bishop4: {
    key: 'bishop4', order: 4, name: 'VÉRAXION', title: 'O Quarto Bispo', epithet: 'O Custódio do Último Selo',
    kicker: 'DIMENSÃO IV · O CORREDOR SEM FIM', portrait: 'Bispo4-ui.webp', rig: 'bishop4', profile: 'veraxion', hp: 760,
    line: '“Tu lês cartas como se fossem promessas. Eu as guardo como provas: o amor também tem preço.”',
    rage: 'Se não posso guardar, ninguém guardará.',
    center: { x: 1600, z: 0 }, radius: 30, accent: '#9ab4ff', theme: 'hall'
  },
  ceu: {
    key: 'ceu', order: 0, name: 'REINO CELESTIAL', title: 'Prólogo', epithet: 'Diante do Trono',
    kicker: 'PRÓLOGO', portrait: 'AnjoGuia-ui.webp', rig: null, profile: null, hp: 0,
    line: '', rage: '', center: { x: -400, z: 0 }, radius: 80, accent: '#f3c25a', theme: 'heaven'
  },
  esgoto: {
    key: 'esgoto', order: 0, name: 'ESGOTOS', title: 'Ato I', epithet: 'Onde o Bispo se esconde',
    kicker: 'ATO I', portrait: 'AnjoGuia-ui.webp', rig: null, profile: null, hp: 0,
    line: '', rage: '', center: { x: -800, z: 0 }, radius: 140, accent: '#9ab06a', theme: 'sewer'
  },
  vulcao: {
    key: 'vulcao', order: 0, name: 'VULCÃO', title: 'Ato II', epithet: 'O vulcão falso',
    kicker: 'ATO II', portrait: 'AnjoGuia-ui.webp', rig: null, profile: null, hp: 0,
    line: '', rage: '', center: { x: -1200, z: 0 }, radius: 140, accent: '#ff7a30', theme: 'volcano'
  },
  greed: {
    key: 'greed', order: 5, name: 'GANÂNCIA', title: 'O Pecado Capital', epithet: 'A Raiz de Todos os Males',
    kicker: 'DIMENSÃO V · A RAIZ', portrait: 'Ganancia1-ui.webp', rig: 'greed1', profile: 'greed1', hp: 520,
    line: '“Não precisei mentir. Bastou que alguém desejasse um pouco mais.”',
    rage: '', center: { x: 0, z: 0 }, radius: 30, accent: '#ff4a3a', theme: 'root'
  }
};

export const BISHOP_KEYS = ['bishop1', 'bishop2', 'bishop3', 'bishop4'];

/** Dimensão do perfil de luta (valerio → bishop1, vorgazhek → bishop2 …), ou null. */
export function dimensionForProfile(profile) {
  for (const d of Object.values(DIMENSIONS)) if (d.profile === profile) return d;
  return null;
}

/** Especificação de física/arena: centro no plano, altura do piso e raio caminhável. */
export function arenaSpec(key) {
  const d = DIMENSIONS[key];
  if (!d) return null;
  return { x: d.center.x, z: d.center.z, y: DIM_FLOOR_Y, radius: d.radius };
}

/** Dados do cartão "VS" exibido antes de cada luta. */
export function vsCard(key, playerName) {
  const d = DIMENSIONS[key];
  if (!d) return null;
  return {
    kicker: d.kicker, bishopName: d.name, bishopTitle: d.epithet, bishopImage: d.portrait,
    playerName: String(playerName || 'Protagonista').toUpperCase(), line: d.line, accent: d.accent
  };
}

/** Pontos da arena: onde o jogador nasce e onde o chefe aparece (frente a frente). */
export function arenaSpots(key) {
  const d = DIMENSIONS[key];
  if (!d) return null;
  return { player: { x: d.center.x, z: d.center.z + 10 }, boss: { x: d.center.x, z: d.center.z - 2 } };
}
