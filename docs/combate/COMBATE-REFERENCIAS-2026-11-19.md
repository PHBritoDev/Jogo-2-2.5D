# Combate de referência: esgrima rápida, dashes e câmera de duelo (19/11/2026)

Pedido do criador: luta quase igual às referências (`25b05adf`, duelo em retrato com câmera às costas; `7cd9ab51`,
esgrima rápida com rastros longos), câmera parecida com a do Genshin Impact, ataques mais rápidos, VFX melhores, Bispo 1
e protagonista melhores, combos e dashes, aproveitando as animações existentes.

## O que as referências mostram (quadros analisados)
| Referência | O que se vê | Como entrou no jogo |
|---|---|---|
| `7cd9ab51` 0:00–0:13 | crescentes enormes brancas com borda vermelha que atravessam a tela; risco vermelho longo no dash; respingos brancos com borda escura e estilhaços pretos; linhas radiais de velocidade; números de dano e cadência muito alta | crescente da espada branca/carmesim, mais larga, longa e duradoura; esteira carmesim pelo trajeto do dash; `splash()` de tinta; linhas de velocidade na tela; contador de golpes; golpes 1,2–1,4× mais rápidos |
| `25b05adf` 0:21–0:51 | câmera baixa às costas do herói com o inimigo no centro; faíscas douradas quando as lâminas se cruzam; o inimigo recua ao levar golpe forte; esquivas e respostas imediatas | câmera de duelo automática (sem travar); choque de lâminas; o chefe acusa os golpes fortes; o Bispo 1 apara e responde (riposta) e esquiva com dash |

## Câmera (estilo Genshin)
- Sem botão. Em combate (inimigo a até 12 m), depois de 1,2 s sem o jogador mexer na câmera, o ângulo desliza até o
  herói ficar entre a câmera e o inimigo. Há uma zona morta de 20°: se o inimigo já está no quadro, a câmera não mexe.
- Em duelo a câmera se aproxima (cerca de 4,6 m, abrindo até 7 m conforme a separação) e nunca passa do zoom escolhido
  pelo jogador. Arrastar a câmera sempre manda. A opção "câmera automática" dos ajustes desliga tudo isso.
- A mira automática (golpe procura o inimigo em volta, até 360°) continua valendo, sem travar a câmera.

## Protagonista
- **Velocidade:** o relógio do golpe corre 1,38× (chão), 1,32× (corrida), 1,34× (saída do dash), 1,28× (ar), 1,18×
  (mergulho) e 1,22× no finalizador. Janelas de dano, warp e clipe usam o mesmo relógio, então nada fica fora de
  sincronia. O dash continua cancelando o golpe antes do corte e depois dele.
- **Combos:** os 5 golpes do chão, a Estocada em corrida, o Corte do retorno (golpe saindo do dash), arcos aéreos,
  mergulho, contra-ataque depois da esquiva perfeita e agora depois do choque de lâminas. O contador "N GOLPES" aparece
  a partir do 2º acerto e some 2,4 s depois do último.
- **VFX:** crescente branca de borda carmesim; esteira carmesim do dash rente ao corpo; respingo branco de borda escura em
  todo acerto (grande nos golpes fortes); linhas de velocidade nos dashes, finalizadores e choques.

## Esgrima
- **Choque de lâminas:** se a lâmina do herói está ativa no mesmo instante em que o golpe do chefe está na janela ativa,
  com os dois de frente e a até 3,6 m, ninguém toma dano. Saem faíscas douradas no cruzamento, há uma pausa de 110 ms, o
  chefe é empurrado e cambaleia e o herói ganha 0,3 s de invulnerabilidade e a janela do contra-ataque.
- **Chefe acusa golpes fortes:** o finalizador, o contra-ataque e os golpes saindo do dash ou da corrida fazem o chefe
  cambalear (0,3–0,46 s) e recuar um passo. Isso nunca fura a superarmadura do golpe especial nem corta a janela ativa.
- **Aparar:** quando o chefe defende, saem faíscas douradas no ponto do bloqueio.

## Bispo 1 (VHAZRAEL), no modo de espada do jogo público
- Esquiva com dash (30 %, sobe com a agressividade do jogador até 50 %) e dash de aproximação contra quem foge. O dash é
  físico, não poder.
- Defende menos (24 %) e mais curto (0,48 s); depois de aparar, responde com riposta rápida (recarga 1,6 s).
- Cadência dos golpes 12 % maior. O 1º impacto de cada golpe continua a mais de 0,3 s (telegraph legível).
- Fora do modo de espada (kit completo) nada muda.

## Animações
Todos os golpes usam clipes existentes do `Prota_otimizado_2K.glb` (Weapon_Combo, Triple_Combo_Attack, Weapon_Combo_1/2,
_360_Power_Spin_Jump, Skill_03, slide_right, Walk_Backward, Quick_Step_and_Spin_Dodge) e os 7 golpes nativos do
VHAZRAEL. Fora: `Roll_Dodge_1` (1,27 s de rolamento não cabe nos 0,17 s do dash sem parecer acelerado) e
`Walk_Forward_with_Bow_Aimed` (arco).

## Medição (bot com entradas reais, VHAZRAEL ativo, passo de 1/30 s, SwiftShader)
Vídeo: `docs/combate/evidencias/combate-referencias/vhazrael-esgrima-20s-antes-depois.mp4` (`main` à esquerda; a `main`
grava com a câmera de antes e a mira travada pelo bot antigo). Quadros: `vhazrael-esgrima-quadros.jpg`. O bot só usa
`combatAction('attack'|'dash')`: dash para chegar, golpes em sequência no alcance (com buffer de combo) e dash quando o
chefe golpeia. O chefe luta com a IA ativa (defende, esquiva, apara e responde).

| | `main` (16 s) | PR anterior (32 s) | **PR agora (12 s)** | **PR agora (20 s)** |
|---|---|---|---|---|
| quadros com dano no chefe | 0 | 26 | 23 | **36** |
| 1º acerto | nunca | 6,2 s | 2,3 s | **2,3 s** |
| chefe cambaleou (golpes fortes) | — | — | 3 | **5** |
| dano recebido pelo herói | 10 | 166 | 10 | **20** |

Choque de lâminas: 0 nesta gravação. O bot não ataca no instante do golpe do chefe; o mecanismo está coberto pelos
testes, mas não foi demonstrado em vídeo. **Não testado em Android físico**; o SwiftShader roda a 2–5 FPS e a luta é
gravada em passo fixo de 1/30 s.
