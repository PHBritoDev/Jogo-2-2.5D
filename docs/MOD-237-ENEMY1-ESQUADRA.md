# Mod 237 — Enemy1: esquadra simultânea, IA tática, três poderes sombrios e o Guardião com a Ceifadora

Os Enemy1 de uma mesma cena agora lutam **ao mesmo tempo**: todos ficam vivos, visíveis, atacando e recebendo dano juntos. A missão só avança quando todos caem. Bispos, Pecados, outros inimigos e as habilidades do herói continuam como estavam.

## Arquivos

| Arquivo | O que faz |
|---|---|
| `enemy1-squad3d.js` | Lógica pura, sem Three.js. Atores, cérebro por utilidade, estudo do alvo, diretor da esquadra, os três poderes, contra-selo e Guardião. Passo fixo de 120 Hz e aleatoriedade com semente, então o resultado é o mesmo em qualquer FPS. |
| `enemy1-dark-vfx3d.js` | VFX dos poderes, sobre o kit `celestial-fxkit3d.js`, mais malhas instanciadas próprias (membros de sombra, garras, anéis, rochas), faixas espirais 3D, orbe/coluna/esfera com shader de energia e decalques arcanos. |
| `enemy1-squad-runtime3d.js` | Corpos visuais: um clone do Enemy1 por ator, com mixer, materiais e animação próprios. A altura é medida pelo esqueleto deformado e a escala de todos os nós é restaurada depois do mixer (protocolo de escala GLB). |
| `warden-scythe3d.js` | **Ceifadora do Limiar**, arma original do Guardião. Geometria procedural presa ao osso `RightHand`. |
| `enemy1-preview.html` | Prévia isolada dos poderes e da arma. |
| `mundo-3d-prototype.js` | Integração: bloco "MOD 237 — Enemy1 em esquadra simultânea", junto do laboratório e dos ganchos de dano. |

## Como o combate simultâneo convive com o motor antigo

O motor de combate do herói foi escrito para um único inimigo (`enemy`, `enemyHP`) e tem dano espalhado por cerca de 15 pontos. Em vez de reescrever tudo, o inimigo antigo virou um **procurador invisível do ator em foco**:

- **Foco e mira.**
  - Golpes, magias, mira (MIRAR) e a barra de vida continuam apontando para `enemy`, que fica sempre sobre o ator em foco.
  - O foco é escolhido sozinho pelo inimigo à frente e mais perto, com histerese para não ficar trocando.
  - MIRAR trava o foco e, com vários inimigos, **alterna o alvo** a cada toque; depois do último, solta. A tecla Q/Tab faz o mesmo.
- **Dano repassado.** A vida que o procurador perde em cada quadro vai para o ator em foco. Esse ator pode defender, esquivar ou entrar em fase 2.
- **Outros atores também tomam dano:**
  - **Espada:** o golpe pega quem estiver no arco e no alcance, com 60% do dano.
  - **Projéteis:** acertam qualquer ator no caminho.
  - **Magias em área** (Buraco Branco, Fênix, Estrelas, Dragão, Portais): atingem quem estiver no raio.
- **Partes antigas desligadas.** A IA antiga (`updateEnemyAI`) e o kit antigo do Enemy1 (`updateFoeKit`) ficam desligados durante a esquadra. As mortes do procurador não disparam `advanceAfterEnemyDefeat` antes da hora.
- **Encontros migrados:** todos os `startPack({rig:'enemy1'})`: floresta, gaiolas das crianças, esgoto e Guardião.
  - `onEach` roda a cada inimigo derrotado, como antes.
  - `onDone`, perfil e rig voltam como no pacote antigo, quando o último cai.
  - Encontros com outros tipos de inimigo continuam como estavam.
  - `?esquadraLegada=1` volta ao modo antigo (um por vez).

## IA tática

- **Estados:**
  - patrulha;
  - alerta;
  - investigar o último ponto visto;
  - escolher alvo, com histerese;
  - aproximar, flanquear, circular ou recuar;
  - golpear, conjurar, defender ou esquivar;
  - contra-selo;
  - recuperar e reagir a dano (postura);
  - voltar ao território, se o alvo foge além do limite;
  - morrer.
- **Decisão:** por utilidade, a cada 0,3–0,45 s, com histerese. Pesam distância real até a borda do alvo, linha de visão, recargas, estamina, papel, vida, o que o alvo está fazendo e a memória curta.
- **Estudo do alvo:** médias que decaem em cerca de 6 s, sobre golpes, dashes, defesa, magias e distância preferida.
  - **Quem golpeia muito:** mais defesa.
  - **Quem dá dash:** depois do dash vem a garra.
  - **Quem conjura:** mais contra-selo.
  - **Quem fica longe:** mais espiral.
  - **Quem defende:** mais Juízo e espiral, que quebra a guarda.
- **Sem trapaça:** a IA não lê comando futuro e só reage a sinais visíveis, com 0,12–0,3 s de reação e chance de errar.
- **Alcances:**

  | Ação | Alcance |
  |---|---|
  | Golpe | Até 2,4 m de alcance real (3,15 m no Guardião), com arco do golpe, altura e linha de visão |
  | Garras | 2,4–11 m |
  | Espiral | 3–14 m |
  | Juízo | 4,5–17 m |

- **Diretor da esquadra:**
  - **Papéis:** agressor, flanqueador, controle e distância, reatribuídos por posição e vida.
  - **Fichas por alvo:** no máximo um golpe e uma magia de cada vez.
  - **Intervalo do grupo:** 0,85 s entre ataques, ou 1,06 s com 3 ou mais inimigos.
  - **Limites:** uma prisão de garras por alvo, um Juízo por vez e imunidade de 3,5 s depois de solto.
  - **Dano por tamanho do grupo:** ×0,84 com 3 inimigos e ×0,72 com 4.
- **Navegação:** separação entre inimigos (ninguém empilha), desvio de obstáculos por ângulos alternados e colisão com o herói, que também colide com eles.
- **Alvos genéricos (`CombatTarget`):** o herói ou um NPC aliado. A mesma lógica funciona contra os dois.

## Os três poderes

Todos seguem o mesmo ritmo: telegraph, gesto e carga nas mãos do conjurador, liberação física, deslocamento e colisão, impacto e dissipação.

| Poder | Coreografia | Contrajogo |
|---|---|---|
| **Garras do Abismo** | 1. O Enemy1 abaixa as mãos e o círculo arcano nasce na posição **prevista** do alvo (0,9 s): anéis, runas, estrela de oito pontas e rachaduras.<br>2. As mãos sobem em estágios: antebraço em dois segmentos, palma, quatro dedos de três falanges, polegar, garras curvas e raízes presas ao chão.<br>3. Elas fecham sobre o alvo. Quem ficou é preso por 0,8 s (1 s no Guardião) e recebe 9 + 4 de dano, com correntes de energia.<br>4. Fora disso, as mãos arranham a área por 1,5 s e afundam se desfazendo. | Dash na hora do fechamento evita. Preso, o dash solta depois de 0,3 s. |
| **Espiral Devoradora** | 1. Carga nas mãos: as faixas negras se juntam num núcleo violeta.<br>2. O corpo voa a 11 m/s, com 5 faixas 3D torcidas, núcleo branco-violeta, cauda turbulenta e estilhaços. Só corrige o rumo nos primeiros 0,35 s.<br>3. Um impacto único (15 de dano, 21 no Guardião) quebra a guarda.<br>4. Na explosão giratória as faixas se desenrolam, com onda no chão e detritos. Para em paredes e obstáculos. | Dash lateral ou interromper a conjuração. |
| **Juízo Violeta** | 1. O orbe se forma aos poucos, com anéis negros e descargas, e sobe para cima da área-alvo.<br>2. A marca irregular segue a previsão só na preparação, a até 6 m/s, e **trava**.<br>3. O orbe se comprime e a coluna desce visivelmente, com raios e anéis de compressão.<br>4. Esfera de choque: anéis quebrados, raios ramificados, lascas, mini-cratera temporária e dano por distância (24 → 9; 32 → 12 no Guardião).<br>Recarga de 16 s e um por vez na esquadra. | Sair da marca travada. |
| **Contra-selo** | Se o Enemy1 vê uma magia do herói vindo de frente, pode responder com um selo que **voa e colide** com ela no mundo. A potência decide: anulação mútua (diferença ≤ 4), o selo vence e segue, ou a magia vence e chega enfraquecida. Chance baixa no comum (16%) e maior no Guardião (42%). | — |

## Guardião do Portal

**Arma:** a Ceifadora do Limiar.
- **Estrutura:** haste de ferro negro com veia vermelha em espiral e runas, máscara de caveira com chifres e duas lâminas curvas simétricas (aço escuro, fio prateado e gume vermelho que pulsa), mais uma ponta de lança.
- **Na mão:** alinhada pelos nós dos dedos do osso `RightHand`, acompanha todas as animações.
- **Rastro:** o golpe deixa um rastro vermelho-sangue amostrado nas pontas reais das lâminas.

**Combate:**
- **Golpes:** combo de dois cortes (três na fase 2), alcance de 3,15 m e arco amplo.
- **Ceifa do Abismo:** se o último corte acerta, as garras abrem sob o alvo, com telegraph mais curto, mas ainda dá para fugir com dash.
- **Finta ocasional:** começa o golpe, recua e lança a espiral.
- **Defesa:** contra-magia e defesa mais frequentes, e postura maior.
- **Fase 2 (50% da vida):** rugido com 1,15 s de armadura, recargas ×0,75 e materiais e olhos em brasa.

**Poderes maiores:**
- Garras com 7 mãos e raio de 2,6 m.
- Espiral maior e mais forte.
- Juízo com raio de 3,4 m.

**Visual e vida:** materiais mais escuros com brasa vermelha. 480 de vida (1,6× o antigo), sem invulnerabilidade.

## Vida, tamanho e balanço

- **Vida:**
  - Enemy1 comum: 100 → 180 no Ato I (110 → 198). Grupos de 3 ou mais recebem ×0,88.
  - Guardião: 300 → 480.
- **Tamanho:** a altura é normalizada pelo esqueleto deformado.
  - Comum: cerca de 1,07× o herói, de 1,72 a 1,95 m.
  - Guardião: 1,24× o comum, cerca de 2,2–2,3 m.
- **Outros inimigos:** a escala dos inimigos de outros tipos e dos chefes **não foi alterada** (ver "Limitações").

## Laboratório do Enemy1

[Abrir o laboratório](https://phbritodev.github.io/Jogo-2-2.5D/mundo-3d-prototype.html?testeEnemy1=1&todasHabilidades=1&mod=237). Ele roda isolado do progresso real, porque o save vai para a memória da página.

Botões do painel:
- **1 / 2 / 4:** número de Enemy1 no encontro.
- **GUARDIÃO:** luta contra o mini-chefe.
- **+ ALIADO:** um NPC aliado luta contra a esquadra, foge das áreas telegrafadas e pode ser preso.
- **CLASH:** o Enemy1 responde a magias do herói com o contra-selo.
- **↺:** reinicia o encontro.
- **LOG:** mostra a ação e o papel de cada inimigo.

O painel também mostra a vida de cada alvo.
