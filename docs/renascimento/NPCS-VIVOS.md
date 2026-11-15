# Eldória — NPCs vivos (Mod 318+)

## Diagnóstico (medido)
- O cabelo era posto pelo **topo da caixa do corpo − 15 cm** e preso ao **corpo**, não à cabeça. O cabelo longo ficava
  "em pé" acima da cabeça, e o cabelo curto deixava a nuca careca e ficava parado quando a cabeça girava (olhar, caminhada).
- Os GLBs (`NPC_Masculino_Animado_Otimizado_1K.glb`, `MulherNpc-otimizado.glb`) **não têm morph targets nem ossos
  faciais** (o teste confirma): não há boca, pálpebra ou sobrancelha controláveis. Não há sorriso nem piscar, e nada disso
  é fingido. A atuação é **corporal**: cabeça, pescoço, peito, olhar, gesto e ritmo.
- Clipes reais:

| Modelo | Clipes |
|---|---|
| Homem | Walking, Running, idle (`_01a1b3e4…`), "inspecionar" (`_01a1b3e6…`: curva-se e volta), Alert, Arise, Wave_One_Hand, victory, Regular_Jump, falling_down, Triple_Combo_Attack |
| Mulher | Walking, Running, idle, inspecionar, Wave_One_Hand, SideLying_Reach_Help |

  Não existe clipe de sentar: o Arise começa deitado e rola.

## O que mudou
- **Encaixe no crânio** (`eldoria-meshy-npcs.js`):
  - mede os vértices presos ao osso `Head` na pose real e o eixo do rosto (`Head → headfront`);
  - busca escala, altura, recuo e inclinação que cobrem o couro cabeludo sem entrar na cabeça nem cobrir os olhos;
  - **prende ao osso `Head`** com `attach`, que preserva o encaixe medido;
  - guarda o resultado em cache por modelo e penteado.
  - Medido nas capturas: todo vértice do topo do crânio tem cabelo a ≤ 2–3 cm; antes eram 4–5 cm, com cabelo acima da cabeça.
- **Cor por NPC**: material clonado com mapa de gradiente sobre a luminância da textura. Os fios continuam visíveis e a
  pele não é tocada. Paleta: preto, castanho, castanho-claro, ruivo, loiro, grisalho e branco.
- **Barba e base de cabelo por casca**:
  - são os triângulos da **própria malha do rosto/crânio**, deslocados pela normal, com os mesmos ossos e pesos;
  - encaixam na anatomia e acompanham cabeça e respiração, sem flutuar;
  - bordas em degradê e fios por ruído, sem textura nova;
  - barbas: rala, curta ou cheia (desce sob o queixo); a boca fica livre;
  - couro cabeludo: base sob o cabelo curto (fecha falhas entre mechas), raspado ou calvo (topo calvo, coroa grisalha).
- **Elenco da vila** (Eldória pobre: mais vida, não multidão):

| NPC | Aparência |
|---|---|
| Bento | idoso, calvo grisalho, barba cheia grisalha |
| Téo | cabelo curto castanho, barba curta |
| Lia | cabelo longo ruivo |
| Morador da praça | cabelo curto preto, barba rala |
| Moradora do balde | cabelo longo castanho-claro |

  O carregador continua com a rota dele.
  - **Removidos:** o homem e a mulher desmaiados e as moscas sobre eles. As moscas da comida podre nas bancas ficam.
- **Rotina** (`eldoria-npc-life.js`):
  - cérebro determinístico por semente, com funções distintas;
  - motor com crossfade dos clipes reais;
  - olhar, pescoço e inclinação aplicados por cima do clipe;
  - caminhada na velocidade do passo medida no próprio clipe Walking, para não deslizar.

| NPC | Rotina |
|---|---|
| Bento | trabalha (curva-se sobre a mercadoria), descansa apoiado no balcão olhando para baixo |
| Téo | trabalha, vigia a estrada da entrada (clipe Alert, olhar para a rua) |
| Lia | separa frutas com frequência, olha em volta |
| Todos | saúdam o herói ao chegar (Wave_One_Hand, com cooldown e sem spam), atendem olhando e assentindo, voltam à tarefa quando ele sai, recuam (Alert) se houver combate perto |
| Moradora | vai da casa à fonte seca com o balde vazio, olha dentro, volta; para e dá passagem quando o herói está à frente; nunca anda no lugar (desiste do ponto se bloqueada) |

## Testes e QA
- `tests/npcs-vivos.test.mjs`:
  - inventário real dos GLBs: clipes usados existem; não há morphs nem ossos faciais;
  - encaixe sintético: cobertura alta, sem penetração;
  - rotina: determinismo, papéis distintos, ≤ 3 saudações em 2 min, retomada da tarefa, dar passagem;
  - contrato da vila: sem desmaiados, moscas só nas bancas, aparências e barbas distintas, cabelo preso ao `Head`.
- `npc-visual-qa.html` + `tools/visual-lab/npc-meshy-qa.cjs`:
  - close-ups de frente, lado, costas, olhar e caminhada de 5 NPCs reais;
  - métricas **cabelo–crânio** (`hairFit`): lacuna sobre o crânio, vértice do topo mais distante do cabelo, deslocamento;
  - **falha** se o cabelo se afastar do crânio mais de 4,5 cm em qualquer pose.

## Evidências (`evidencias/npcs-vivos/`)
- `cabelo-antes-depois-frente-lado-costas-olhar-caminhada.jpg`: main × depois, mesmas câmeras.
- `aparencias-5-npcs.jpg`: Téo, Bento, Lia, menino e menina, com olhar e caminhada.
- `jogo-vendedores-longe-chega-atende-e-moradora.jpg`: no jogo, cada vendedor de longe (trabalhando), na chegada do herói
  (saúda) e atendendo; e a moradora a caminho da fonte.

Tudo foi medido em SwiftShader, não em Android: o FPS no aparelho não foi medido.
