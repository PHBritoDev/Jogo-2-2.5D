# VORGAZHEK — Machado do Abismo, mira dos cortes, dashes em sequência e Ascensão da Maré Abissal (20/11/2026)

Briefing temporário: `CLAUDE_TEMP_VORGAZHEK_MACHADO_MIRA_SALTO_DASH_QA_20261120.md`, removido no último commit desta branch.
Anexos analisados: GIF (personagem erguendo lâmina azul e concentrando energia → preparo da Maré Abissal) e imagem do machado
de lâmina dupla (silhueta dupla, canais hexagonais, orbe no topo → Machado do Abismo). **O vídeo `1000365604.mp4` não chegou
nesta sessão**: nada aqui foi tirado dele.

## P0 — arma invisível (todos os chefes com katana)
- Causa: na missão 19/11 um comentário `//` foi colado na mesma linha de `scene.add(root); scene.add(fx)` dentro de
  `attachKatana` (`enemy3-runtime3d.js`). A raiz da arma de **todos** os chefes que usam essa função (Katana Carmim do
  e3boss, Espada-Mandíbula do e4boss, lâmina do VHAZRAEL e a do VORGAZHEK) nunca entrava na cena.
- Correção: as chamadas voltaram para a linha própria (commit 1, isolado) + teste que monta os quatro chefes numa
  `THREE.Scene` real e exige a arma na cena, uma por corpo, e falha se `scene.add(root)` voltar a ficar dentro de comentário.
- Também corrigido: a arma antiga do VORGAZHEK não tinha `dispose()` → `stop()` do runtime lançaria exceção ao limpar a luta.

## Machado do Abismo (`vorgazhek-axe3d.js`)
Arma 3D original, procedural, volumétrica (extrusões biseladas, não planos):
- **Silhueta assimétrica de lâmina dupla**: frontal maior em crescente com chifre e barba em gancho; traseira menor, angulosa.
- Metal grafite/obsidiana PBR; **recessos índigo com canais hexagonais** (textura gerada por código, sem imagem); **gumes
  ciano-glaciais** em faixa fina à frente do corpo; **orbe-núcleo** branco-azulado contido, preso por garras, com halo
  Fresnel; espinho superior, colares hexagonais na haste e ponta inferior em espinho. Nada roxo.
- 1 775 triângulos, **7 chamadas de desenho** (as 25 peças são fundidas por material), sem luz dinâmica.
- 2,1 m do espinho inferior ao espinho do topo (o chefe tem ~2,1 m); o centro da cabeça fica a 0,69 m da palma.
- `userData.edges`: 4 segmentos de dano (haste alta, gume frontal, gume traseiro, ponta do gume frontal) → o traço de
  dano cobre **as duas lâminas**. `charge(k)` acende núcleo, canais e a **lâmina de energia longa** ao longo da cabeça.

**Empunhadura medida no GLB** (a mão não tem dedos): o eixo Y do osso RightHand segue o antebraço; varri as direções
possíveis da haste e só **−Z da mão** deixa a cabeça À FRENTE no quadro de contato da Queda, da Sentença e da Órbita
(+Z invertia o corte). O gume aponta para onde os nós dos dedos apontam. Fora dos golpes:
- idle e golpes: preso ao osso (mão × empunhadura constante), sem flutuar;
- marcha/corrida/dash: “arrastado”, cabeça baixa atrás-à-direita, gume à frente (mistura suave);
- cabeça nunca abaixo do piso (gira em torno da mão o mínimo necessário).

Prova em 4 vistas e 11 poses: `docs/combate/evidencias/vorgazhek/machado-poses-4-vistas.jpg` (página
`tools/visual-lab/vorgazhek-rig-qa.html`, mesma empunhadura do jogo).

## Golpes desalinhados — causa medida e correção
Medição do traço da cabeça do machado (30 Hz, clipe real) e da raiz de cada clipe:

| clipe | quadril no quadro 0 (x, z) | efeito antes |
|---|---|---|
| Attack, Triple, Weapon_Combo_2, Spin, Running, Walking, Jump_Over | ≈ (0, 0,1–0,15) | ok |
| **Double_Combo_Attack** | **(−0,02, −1,20)** | corpo inteiro desenhado **1,3 m atrás** do ator na Sentença de Dois Tempos (golpe de abertura) |

1. **Raiz ancorada** (`vgAnchorRoot`): todo clipe do corpo novo tem o quadril horizontal no ponto neutro do idle; a pose de
   reação recortada também. O deslocamento relativo do clipe continua (vira o avanço do golpe).
2. **Janelas pelo traço real**: cada `hit` é o quadro em que a cabeça passa rápida pela frente. Mudaram: Dois Tempos
   1,20→**1,13** (estava alto, a 33° de lado), Tripla 0,77/2,33→**0,68/2,17** (2,33 era o machado **às costas**, 175°),
   Giro 0,90/1,50→**0,80/1,60**, Órbita 1,0/1,97/3,0→1,02/1,93/2,97. A **Investida** usava o Jump_Over, com a lâmina às
   costas no quadro do golpe; agora termina no corte descendente frontal do Double_Combo.
3. **Mira por corte** (`vgAim`, gancho `moveAim` no motor, só o VORGAZHEK define): no preparo de cada corte o corpo gira
   para que a cabeça do machado (azimute medido no clipe para aquela janela) chegue no herói. **Trava 0,17 s** antes do
   contato e não persegue dentro da janela. Entre cortes de um combo, magnetismo curto (≤ 1,6 m por golpe, com colisão,
   para antes da cápsula) até o alcance real do corte.
4. O traço de dano é o **mesmo clipe** que o mixer desenha, com os 4 segmentos do machado; um acerto por janela.

**Acerto com o traço real do GLB + motor** (golpes não-recuo × 4 ângulos × 30/45/60 FPS, herói parado):

| distância | sem mira por corte | com mira por corte |
|---|---|---|
| 1,5 m | 67 % | **92 %** |
| 2,5 m | 50 % | **92 %** |
| 3,5 m | 23 % | **83 %** |

(A Órbita em recuo corta recuando de propósito: o 2º corte só pega quem persegue.)

## Dashes em sequência
- O motor “roubava” o intervalo entre passos: decisão genérica/reação no meio da sequência cortava a cadeia no 1º dash.
  Agora a sequência segura o motor até o último passo.
- Passo bloqueado espelha para o outro lado antes de desistir (nunca atravessa parede).
- A esquiva reativa do motor (1 dash) vira **Eco do Eclipse**: mais 1–2 passos com objetivo (flanco e corte, ou recuo e volta).
- Passo do Eclipse: 2–3 passos como regra (1 só em 30 % de perto); perseguição de herói fugindo: 3 passos.
- Recarga do dash (0,35 s) e orçamento (5 em 3 s) **inalterados**.

## Ascensão da Maré Abissal (`vgStartRise`/`vgStepRise`, gancho `stepRise`)
| fase | o que acontece | legibilidade/contra-jogo |
|---|---|---|
| preparo (0,52 s, no chão) | ergue o machado (início do Attack), o núcleo acende e 3 anéis de plasma giram em volta | telegrafa sem fumaça |
| salto | ~3 m de altura, pairar curto no ápice | bem acima do herói |
| trava (0,22 s após decolar) | ponto de pouso = frente do herói pela posição/velocidade VISÍVEIS, 1 ajuste ≤ 2,2 m; marca no chão muda de “mirando” para “travado” | dash depois da trava escapa |
| dash aéreo curto | só se faltar distância (> 6,2 m) | — |
| corte descendente | **antes** do pouso, lâmina de energia longa + rastro crescente; **um** teste de dano (22) | arco frontal 3,1 m |
| impacto | núcleo branco-azulado compacto, 3 arcos-lâmina, anel de choque, marcas no chão | só VFX (sem 2º dano) |
| recuperação | 0,82 s parado | janela de punição |

Recarga 9,5 s; só com o herói entre 3,2 e 9,5 m (nunca à queima-roupa). O salto evasivo do Atravessamento Aéreo continua
separado. Nada do Bispo 1 foi tocado.

## Duelos reais (Dimensão II, treino dos Bispos, IA ativa, bot com entradas reais)
Passo fixo de simulação (SwiftShader roda a 3–13 FPS reais). `aim` = erro de ângulo entre a cabeça do machado e o herói
no início de cada janela de dano (mediana); erros grandes só aparecem quando o herói dá dash para as costas depois da trava.

| sessão | dash (2 / 3 seguidos / isolados) | Maré (salto→acerto) | Atravessamento | escudo/guarda | janelas: acerto / erro (motivo) | aim mediana | maior tempo parado |
|---|---|---|---|---|---|---|---|
| orgânica 60 s #1 (30 FPS) | 31 (5 / 7 / **0**) | 1 → 1 | 4 | 1 / 0 | 21 / 27 (esquiva 17, longe 9, ângulo 1) | 0,6° | 0,77 s |
| orgânica 60 s #2 (30 FPS) | 21 (7 / 2 / 1) | 3 → 2 | 4 | 1 / 0 | 17 / 27 (esquiva 18, longe 3, ângulo 6) | 1,4° | 0,67 s |
| herói parado 30 s, 30 FPS | 10 | — | 2 | 2 / 2 | 13 / 5 (esquiva 5) | 0,6° | 1,1 s |
| herói parado 30 s, 45 FPS | 8 | — | 2 | 3 / 3 | 16 / 3 (longe 2, esquiva 1) | 0,6° | 1,1 s |
| herói parado 30 s, 60 FPS | 9 | — | 2 | 2 / 1 | 17 / 3 (longe 3) | 1,3° | 0,9 s |
| herói andando em círculo 30 s | 17 (3 / 3 / 2) | 1 → 0 (saiu do arco) | 2 | 2 / 2 | 13 / 3 | 9,2° | 0,8 s |
| herói mantendo distância + dash para trás 40 s | 13 (2 / 3 / 0) | 3 → **0** (dash depois da trava) | 6 | 0 / 0 | 4 / 7 | — | — |

- “Esquiva” = o herói estava em i-frames de dash no quadro do corte (contra-jogo funcionando, não erro de mira).
- Magias do chefe: 0 em todas as sessões. Erros de console: 0. Machado (`Nucleo`) presente e visível na cena em todas.
- Render do duelo: 45–81 chamadas de desenho, 117–212 mil triângulos (arena inteira); o machado soma 7 chamadas.

Vídeos do jogo real (31,5 s cada: herói parado → luta livre → herói mantendo distância e dando dash → morte):
- arena original, sem luz extra: `docs/combate/evidencias/vorgazhek/vorgazhek-machado-duelo.mp4`;
- mesma luta com o piso neutro de QA (`combatStudio`), 960×540: `docs/combate/evidencias/vorgazhek/vorgazhek-machado-estudio.mp4`.
  Quadros recortados (machado erguido, chefe no ápice da Maré, gume ciano no corte): `machado-no-jogo-quadros.jpg`.

**Smoke da Dimensão II**: desktop 1280×720 e celular (Pixel 7) carregam a luta com o kind `vorgazhek`, machado na cena e
visível, 0 erros e sem “Failed to mount world 3D” (69 e 51 chamadas de desenho). `?bisposComPoderes=1` volta ao Bispo 2
clássico (nenhum ator `vorgazhek` na esquadra).

## Testes
`tests/vorgazhek-machado.test.mjs` (12 testes, no CI `combat315.yml`):
- P0: arma na cena para os 4 chefes, uma por corpo, `dispose`; regra contra `scene.add` comentado;
- machado: volume, assimetria, chamadas de desenho, traço das duas lâminas, lâmina de energia;
- empunhadura constante, cabeça acima do piso, carregamento na marcha;
- raiz ancorada; janelas de dano; mira e trava; ganchos que não vazam para outras espécies;
- dashes em sequência > isolados, triplas presentes; Maré: fases, altura, corte antes do pouso, dano único, trava, fuga
  depois da trava, 30/45/60 FPS, nunca à queima-roupa, morte no ar;
- **alinhamento real com o GLB** (traço do clipe + motor + mira): ≥ 85 % a 1,5/2,5/3,5 m, de frente/lado/costas, 30 e 60 FPS.

## Riscos e limites
- **Sem Android físico**: o SwiftShader roda a 3–13 FPS; a lógica foi validada em passo fixo de 30/45/60 FPS.
- A arena da Dimensão II é muito escura: o machado lê pelos gumes ciano, mas o corpo do chefe some ao fundo (iluminação
  da dimensão não foi alterada nesta missão — o briefing pede não mexer em mapa/câmera geral).
- Sentença Tripla e Órbita em avanço só aparecem abaixo de 70 % de vida (fases), como antes.
