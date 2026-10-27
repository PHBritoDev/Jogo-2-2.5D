# Mod 217 — Revisão de jogabilidade e cenas dos Atos II e III

**Fonte:** `CLAUDE-REVISAO-ATOS-2-3.md`, a missão do autor com oito capturas.

## O que entrou

### Prioridade 0 — bloqueios

| Item | Correção |
|---|---|
| Barreira invisível ao seguir o Anjo (Ato III) | A boca da caverna de gelo ficava fora da área andável: o limite arredondado do vale acabava antes dela, e o gatilho ENTRAR pede 5 m.<br>• `SNOW_CITY.caveApproach` estende o chão até a entrada e mantém a montanha atrás do arco.<br>• O caminho do Anjo desvia da guilhotina e termina a menos de 5 m da caverna. |
| PULAR repetido | `cutscenes3d.js`: `skip()` só age uma vez, porque trava a reentrada.<br>• As ações `do` que ainda não rodaram vão para `flush`, e o jogo as aplica uma vez, sem sons nem flashes. Assim, pular chega ao mesmo estado que assistir a cena inteira.<br>• O botão ignora toques nos primeiros 700 ms de cada cena.<br>• **A purificação não pode ser pulada:** a cena `laboratorio` é marcada como não pulável. |
| Bandidos e pagamento ao pular | O pagamento (`jogar-moedas`) acontece uma única vez, com o aviso "−10 MOEDAS".<br>• Os bandidos saem na hora.<br>• A missão avança. |
| NPCs andando de costas | O `Npc-lod2.glb` já olha para +Z (os dedos dos pés ficam à frente). O giro de 180° em `makeTownsfolk` fazia bandidos, moradores e o estalajadeiro andarem e olharem de costas. |
| Câmera atravessando paredes | **Interiores** (estalagem, esgoto, vulcão, caverna): a câmera para antes da parede do cômodo e, na estalagem, fica abaixo do teto.<br>**Mundo:** a câmera não entra nas casas da cidade. |

### Ato II

| Item | Correção |
|---|---|
| Cidade (Cinzária) | `cityLayout()` monta a rua principal, uma rua de trás, a casa da guilda de frente para a praça e um beco sem saída.<br>• Casas de alturas e larguras variadas, com telhado de duas águas, porta, janelas acesas e chaminés.<br>• Tudo é instanciado, então são poucas chamadas de desenho, e cada casa tem colisão. |
| Bandidos | Só atacam dentro do beco sem saída.<br>• Três fecham a boca do beco atrás do herói, e o resto vem do fundo.<br>• O gatilho dispara uma única vez. |
| Guardas e entrada do vulcão | O portão de basalto fica no pé do cone, com runas, boca escura e braseiros, e os guardas esperam nele.<br>• Depois da vitória, só a interação ENTRAR leva para dentro.<br>• A área andável chega até o portão. |
| Inimigos derrotados | `foeFinalBlow`: o herói ataca e o golpe acerta, com som e tremor.<br>• O inimigo cai com o clipe de morte do rig (ou tomba para trás), fica no chão um instante e afunda devagar.<br>• Não encolhe mais até sumir. |
| VÉRAXION e destruição | Planos amplos mostram VÉRAXION inteiro, o herói, o Anjo, a cidade e o vulcão.<br>• O buraco negro nasce bem acima dele, cresce durante o encantamento e é lançado sobre a cidade, com quadro de impacto e raios.<br>• O abismo não tem mais os pontos quadrados no chão: agora tem névoa e brasas na borda. |
| Portal de VORGAZHEK | Arco ogival de obsidiana com um único olho na pedra-chave, correntes com moedas e almas subindo.<br>• Saíram os 26 olhos espalhados e a lua com rosto, que dentro do vulcão parecia uma "bola com olhos". |

### Ato III

| Item | Correção |
|---|---|
| Captura e decapitação | Os quatro Enemy3 cercam e atacam o herói, que só então apaga.<br>• No cadafalso, eles viram guardas.<br>• O Anjo derruba o carrasco e os guardas com raios de luz visíveis.<br>• Pular não deixa inimigos órfãos. |
| Jaula (Ato I) | Diálogo: "Me tira daqui!" e "Fala baixo, eles podem te ouvir."<br>• O Anjo olha em volta, abre a jaula e o herói sai.<br>• Só depois vem "Nunca mais seja imprudente…". |

### Também entrou

| Item | Correção |
|---|---|
| Interior do vulcão e vítimas (10) | **Caminho mais fundo:** o túnel tem 78 m (antes eram 34). No meio fica a cela das correntes, com grilhões vazios, jaulas abertas, roupas largadas, marcas de arrasto e manchas escuras, sem nada explícito. O herói comenta os rastros.<br>**Vítimas:** no laboratório há homens de Cinzária vivos, sem camisa, sujos e machucados (`Vitima-rig.glb`). Um prisioneiro explica quem são (devedores de VORGAZHEK) e o que os demônios fazem, e pede descanso.<br>**Purificação (obrigatória):** acalma cada um, as almas sobem e os corpos somem em paz. Depois chegam os demônios. |
| Jornada até a neve (13) | O vendedor de casacos foi para o começo da subida (x 64). No caminho há fogueira dos viajantes, placa para Invernália, carroça quebrada, santuário congelado e bosques de pinheiros, com colisão. |
| ESTALAGEM (14) | Há uma escada de verdade, com 14 degraus e corrimão, que sobe por um corredor com teto até a porta do quarto, no andar de cima. A porta abre ao chegar perto e o quarto tem paredes, teto, cama e janela. Acabou o teletransporte "SUBIR AO QUARTO". |
| Porão (15) | Passou de 12×9 m para 18×14 m, com pilares e tochas. Os inimigos ficam longe das paredes. |
| Anjo da Mod 215 (18) | **Asas:** penas com haste, curvatura e espessura; as primárias têm ponta dourada e a asa negra tem bordas cristalinas.<br>**Cabeça e rosto:** a auréola foi recuada (cortava a cabeça e o cabelo) e os olhos ficaram menos exagerados.<br>**Corpo:** totalmente masculino, sem volume no peito.<br>**Braços:** no jogo, `relaxGuideArms` baixa braços e antebraços depois do clipe parado, com um balanço leve. |

## Pendências (não feitas nesta entrega)

- **Bispo 1:** o documento mestre do autor diz "Bispo 1 = VHAZRAEL", e o histórico do repositório só tem esse nome. Não há outro nome registrado, então ele **não foi trocado**. Falta o autor confirmar o nome original. A dimensão 3D do Bispo 1 continua ligada ao portal (`startDimensionBattle('bishop1')`).
- **Revisão geral de roteiro e câmera em todas as cenas (19):** feita só nas cenas citadas.
- **Variedade de figurantes e aparência própria dos bandidos (parte do 7):** hoje é o mesmo modelo, com cores diferentes.
- **Anjo:** o cabelo continua em mechas rígidas. As asas não têm movimento secundário, porque estão presas ao peito, sem ossos próprios.
- **Ato II:** a cidade não tem NPCs com rotina.

## Evidência

- **CONFIRMADO POR CÓDIGO:** `node --test` (inclui `cutscenes-skip.test.mjs` e `act2-flow.test.mjs` com a área do vulcão).
- **TESTADO EM NAVEGADOR (Chromium com SwiftShader, sem GPU):**
  - Pular os bandidos, tocando várias vezes: as moedas caem de 20 para 10, uma vez só, sobram 0 bandidos e a missão avança.
  - Câmera no porão sempre dentro do cômodo.
  - Caminho do Anjo e boca da caverna andáveis.
  - Captura, guilhotina e resgate até "Siga o Anjo".
  - Sequência de VÉRAXION até o bilhete.
  - Cidade, beco e emboscada.
  - Portal de VORGAZHEK em visualização isolada.
- **Android: NÃO TESTADO.** FPS e memória em aparelho real não foram medidos; no SwiftShader o FPS não é representativo.
