# Estrutura da demo — Galáxia 1

O jogo continua em Canvas 2D e mantém os sistemas existentes. Cada arquivo
deve cuidar de uma área, usando os dados/handlers da campanha para conectar
as etapas, em vez de colocar lógica de missão nos módulos de desenho.

## Módulos

- `world.js` — mapa, biomas, trilhas, distribuição procedural, colisões e
  consultas de decoração. As clareiras de missão devem ser pequenas; cenas
  isoladas ocultam temporariamente a decoração que fica sob elas.
- `render.js` — ordem de desenho do mundo, objetos, personagens e efeitos.
- `ruined-city.js` — região exterior das ruínas, seus caminhos/estruturas e
  a instância isolada da Casa da Moeda. A decoração do salão fica em
  `_drawArena`/`_drawWorkshopRuin`, sem alterar entrada, área de combate,
  colisões ou apresentação do Bispo 2.
- `mist-valley.js` — identidade visual do Vale das Lanternas Afundadas e o
  Posto de Medição instanciado. A região não contém o Bispo 3 nem inicia luta;
  a campanha controla descoberta, entrada e saída.
- `casino.js` — sala instanciada e entrada/saída do Casino. O piso interno não
  exige remover vegetação do mapa exterior.
- `climate.js` e `campaign.css` — estados de clima, transição para neblina,
  iluminação, chuva e relâmpagos. Presets não controlam missões.
- `storm-events.js` — perigos/efeitos ocasionais da tempestade, incluindo
  aviso, redemoinho, dano, knockback e respingos. Só atualiza durante o jogo;
  não aparece dentro de locais instanciados.
- `campaign.js` — dados das missões e handlers (`acceptMission`, `goto`,
  `investigate`, `followerAmbush`, `bishopEnter`, `bishop`, descoberta e entrada
  no vale). Adicione etapas com handlers reutilizáveis antes de criar um tipo novo.
- `bishops.js` — perfis, apresentação e combate compartilhado dos Bispos.
- `quest.js`, `combat.js`, `player.js`, `input.js` — HUD/diálogos, combate,
  física do jogador e controles desktop/mobile.

## Fluxo atual da missão do Bispo 2

`mandado no Casino → viagem e emboscada → descoberta do distrito sudoeste →
encontros e investigação → selo → ENTRAR → apresentação → combate → retorno`

O distrito foi colocado no sudoeste do mapa (aprox. 966 unidades do ponto
inicial). O Casino permanece no leste. A trilha de campanha é declarada em
`world.js` e a sequência jogável em `GALAXIES.greed.missions` dentro de
`campaign.js`.

## Para continuar

Para adicionar outra região, defina geometria/entrada em seu módulo de local,
coordenadas e caminho em `world.js`, e etapas de progressão em `campaign.js`.
Para adicionar um perigo climático, mantenha ciclo de vida e dano em
`storm-events.js`; deixe `climate.js` responsável pelos presets visuais.
Preserve `Campaign.next()` como dono da progressão e os perfis de
`BISHOP_PROFILES` como dados de combate.

## Continuação após o Bispo 2

O fim da missão `m6` inicia `m7` e mostra o diálogo fictício em
`BISHOP2_AFTER_NODES`. A etapa `acceptMission` libera o terceiro selo e chama
`Climate.transitionTo('fog', 8)`. A trilha distante, os quatro encontros
reutilizam `followerAmbush`; pistas e descobertas usam `investigate` e
`mistRegionDiscover`/`mistEntryDiscover`.

`MistValley` cuida somente da região, do posto isolado e do reposicionamento.
`mistEnter` permite entrar; `mistSite` mantém a exploração aberta e permite
sair. A missão fica em espera dentro do local: nenhuma apresentação ou luta
do Bispo 3 foi adicionada. O status do torneio continua exigindo quatro Bispos
derrotados.
