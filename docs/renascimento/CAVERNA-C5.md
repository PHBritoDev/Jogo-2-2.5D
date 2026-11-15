# Caverna de Eldória — C5: Galeria Alta, laço, desvios, saída alternativa e entrada

Etapa C5 do `PLANO-CAVERNA-ELDORIA.md`, empilhada sobre a C4 (#538). Pilha completa: C1 #518 → C2 #534 → C3 #537 → C4 #538 → C5.

## O que muda

| Item do plano | Feito |
|---|---|
| **Galeria Alta** | Câmara a **+6 m** sobre o salão (piso 0 contra −6), entre o salão e o cristal. Sobe-se por uma **rampa de sedimento** de ~20 m (~17°) que sai da parede norte do salão |
| **Laço** | salão → rampa → Galeria Alta → descida ao cristal → passagem até o portal → corredor norte → salão. A caverna deixa de ser um corredor único: o portal se alcança pelos dois lados |
| **Desvio 1 — Nicho do Vigia Antigo** | Recanto lateral da galeria com relicário (+8 moedas, XP de ruína, conquista de ruínas). Mesmo padrão do Posto do Vigia |
| **Desvio 2 — Mirante do Abismo** | Patamar que sai da galeria e termina na crista entre o salão e a gruta, ~5 m acima dos dois. Tem lábio de pedras com vãos na borda e um relicário (+5 moedas, XP de ruína) |
| **Saída alternativa** | Túnel da galeria com luz do dia quente no fim. Dá na **fenda da serra**, no pé da muralha, ~31 m ao norte da boca. A fenda é bidirecional: entrando por ela, chega-se ao fim desse túnel |
| **Entrada contínua (bug 2)** | Parcial; ver "Limites" |

## Técnica

- **Patamares (`ledge`)**:
  - O piso da caverna é de altura única por (x, z) e as formas se misturam pela média. Um corredor com `ledge: true` tem piso **próprio**, sem média, e uma borda íngreme de 1,4 m.
  - `caveLedgeEdge` marca essa borda como **não caminhável**, como o abismo. A queda nunca é "parede invisível" nem pulo de 4 m.
  - Teste: em toda a caverna, duas células caminháveis vizinhas não passam de 1,2 m de desnível.
- **Volume 3D:** a malha (C2), o material (C3) e a luz (C4) cobrem os espaços novos sem código extra. O SDF nasce das mesmas formas. A malha desktop cresceu para 76 k triângulos e o limite do teste subiu de 75 k para 85 k. O mobile segue ≤ 30 k (29 k).
- **Câmera:** os espaços novos são estreitos e expuseram uma falha antiga, corrigida:
  - A folha antiga do teto (`ceil`) baixava a câmera para dentro da parede 3D, junto às paredes.
  - Agora, se baixar a enfia na rocha, vale o volume 3D, que já inclui a abóbada.
  - Resultado: 0 quadros na rocha em 17 pontos (os 8 antigos e 9 novos).
- **Luz e som:**
  - A galeria tem humor próprio, com luz do dia quente pela fenda.
  - Há uma luz de cena a mais, pelo orçamento de 4.
  - A corrente de ar da galeria vai para o áudio.
- **Mundo:**
  - `ascension-serra-cleft3d.js` cria a fenda: lajes encostadas, bloco travado e o escuro entre elas. As pedras ficam dentro da faixa da muralha que já não se pisa, então não há colisão nova.
  - Uma clareira diante da fenda deixa a abertura legível de fora.
  - O retorno ao mundo tem ponto e direção próprios; a câmera não fica presa contra a muralha.
- **Saves:** as relíquias guardam estado por aparelho (`seven-sins-3d-caverna-reliquia-*`), como o Posto do Vigia. Progresso, missão, gatilhos do portal e narrativa não mudam.

## Validação (mobile 852×393, SwiftShader; contagem, não FPS de Android)

| Item | Resultado |
|---|---|
| Navegação (`navWalk`, 17 trechos) | Todos completos, sem queda: túnel, ponte nos dois sentidos, gruta, rampa, galeria, mirante (ida e volta), nicho, descida ao cristal, passagem, norte, saída, galeria leste, eco |
| Laço sem o corredor norte (teste puro) | O portal é alcançado |
| Relíquias | Abrem uma vez; toast, moedas e estado salvo |
| Saída pela fenda | Herói no mundo em (−68,5; −206,7), na encosta |
| Reentrada pela fenda | Herói no fim do túnel da galeria |
| Câmera na rocha (17 pontos × 120 amostras, giro completo) | **0** (braço mínimo 2,0 m nas passagens estreitas, a ombro) |
| Draw calls / triângulos | Entrada 76/169 k · salão 70/158 k · gruta 54/167 k · cristal 69/199 k · galeria 55/194 k · mirante 61/194 k. Dentro do orçamento (≤ 90 / ≤ 220 k) |
| Testes | C1–C5 + ascensão 311: 33/33. Suíte inteira sem falha nova (só `Mod 262`/`Mod 278`, como na `main`) |

## Limites (sem fingir)

- **Entrada contínua:**
  - A boca continua com o véu de transição. O que mudou é que ele virou um **piscar curto** (160 + 60 + 360 ms em vez de 380 + 400 + 260 + 620 ms) no trecho escuro do túnel. Isso vale na entrada, na saída e na fenda.
  - Não houve curva geométrica nova no túnel do GLB da boca.
  - A troca de zona sem nenhum véu exige refazer o túnel do mundo, fora do escopo seguro desta etapa.
- **Fenda da serra:** é procedural (lajes de pedra). De perto se lê como abertura na muralha, mas a mata do cinturão em volta ainda esconde parte dela à distância.
- FPS e áudio no aparelho real (A55) não foram medidos.

## Evidências (`evidencias/caverna-c5/`)

- `planta-laco-desvios.png`: planta caminhável com a altura do piso, o laço, as relíquias, a saída e a borda do mirante.
- `jogo-novos-espacos.jpg`: rampa, mirante, Galeria Alta, nicho, túnel da saída e descida ao cristal, no jogo.
- `mundo-fenda-da-serra.jpg`: a fenda vista do vale.
- `jogo-9-pontos-c4-vs-c5.jpg`: os 9 pontos da baseline sem regressão (C4 | C5).
