# Mod 302 — Combate do protagonista reconstruído

Escopo: **somente o protagonista** (`Prota_otimizado_2K.glb`, padrão do jogo). Bispos, NPCs, inimigos, o protagonista antigo
(`?prota=antigo`) e as outras espadas do inventário continuam com o comportamento anterior. `Protagonista.glb` não foi removido.

Arquivos: `prota-combat3d.js` (parâmetros e funções puras), `prota-vfx3d.js` (dash e volumes de energia visíveis),
`sword-rites3d.js` (gancho `moveset`/`drive`, volumes de energia, cancelamento no follow-through), `sword-design3d.js`
(espada branca), `experiments/aerial-combat/world-protagonist.js` (`protaClips`: recortes + root motion), integração em
`mundo-3d-prototype.js` (bloco `MOD 302`). Testes: `tests/prota-combat302.test.mjs`.

## 1. Diagnóstico da Mod 301 (causas medidas, não suposições)

| Sintoma relatado | Causa encontrada | Correção |
|---|---|---|
| Mão/braço torto, espada "grudada" | A espada era presa no eixo **+Y da mão** (direção dos dedos). No `Prota_otimizado_2K` o punho fechado tem os nós dos dedos no eixo **+X**; a lâmina saía pelos dedos, entortando o pulso visualmente. | Empunhadura nova: lâmina no eixo +X da mão, cabo no centro do punho (−0,07; 0,085; 0,02 em unidades do rig, rotação −90° em Z). Validada em close de `Combat_Stance`, `Weapon_Combo`, `Triple_Combo_Attack`, `Walking`, `Running`. Golpes assados/ritos antigos (calibrados em +Y) mantêm o encaixe antigo com transição suave. |
| Corrida estranha / corre sem querer | `updatePlayerMovement` tocava `Running` sempre que a velocidade passava de 2,6 m/s, e a velocidade-base sem CORRER era 4,3 m/s → o herói "corria" com o analógico. | Andar é o padrão (2,2 m/s, clipe `Walking`); correr só com CORRER/Shift (6,8 m/s, clipe `Running`). A cadência do clipe segue a velocidade real medida pelo pé de apoio (Walking 1,63 m/s, Running 5,48 m/s) → sem patinar. |
| Salto alto demais | Gravidade 15 e impulso 6,2 → apogeu ≈ 1,28 m (dois terços da altura do corpo). | Gravidade 22, impulso 5,2 → apogeu ≈ 0,61 m, 0,47 s no ar; clipe `Jump_Over_Obstacle_2` em fases (impulso/ar) com tempo ajustado ao tempo no ar, pouso com `Prota302_land` só em quedas reais. |
| Dash rígido | 0,16 s a 18 m/s com o clipe `Quick_Step` cortado (0–0,2 s) e um fantasma escuro. | Dash 3900 (abaixo). |
| Combos sem fluidez | Recortes de 0,6 s com recuperação inteira antes do próximo golpe; buffer só depois da janela. | Cada golpe tem startup/ativo/follow-through/recuperação medidos no clipe; buffer desde metade do startup; com golpe enfileirado, o follow-through vira o startup do próximo (`cancelAt`). Mexer o analógico depois do follow-through cancela a recuperação. |
| Ataques que erram (cortam o vento) | A sonda mediu a lâmina passando a **0,62 m** da superfície do alvo no 1.º golpe: o golpe do clipe passa ao lado do corpo (o arco real fica 30° à esquerda), e o avanço não alinhava o herói. | Aquisição de alvo + "motion warping" com o **ponto de contato medido em cada clipe** (`aim`), hitbox varrida na lâmina real e volumes de energia. Resultado na mesma sonda: 5/5 golpes acertando alvo parado e alvo em movimento (tabela 6). |
| Pouco impacto/câmera | Hitstop fixo e quase nenhum enquadramento do alvo. | Hitstop por golpe (45–90 ms), tremor só nos golpes grandes, FOV de impacto no finalizador, enquadramento que puxa para o alvo (também no esquadrão). |

## 2. Inventário dos 19 clipes do `Prota_otimizado_2K.glb`

| Clipe | Duração | Uso na Mod 302 |
|---|---:|---|
| `Combat_Stance` | 1,67 s | Parado (guarda) |
| `Walking` | 1,03 s | Andar (1,63 m/s natural) |
| `Running` | 0,63 s | Correr (5,48 m/s natural) |
| `Walk_Backward` | 0,87 s | — (reservado) |
| `Jump_Over_Obstacle_2` | 0,87 s | Salto: impulso/ar 0,10–0,52 s; pouso 0,60–0,80 s |
| `Quick_Step_and_Spin_Dodge` | 1,17 s | Rematerialização do dash 0,82–1,16 s |
| `Weapon_Combo` | 3,67 s | Golpe 1 — Fenda diagonal 0,52–1,08 s |
| `Triple_Combo_Attack` | 4,33 s | Golpe 2 — Lua horizontal 1,10–1,76 s; Golpe 3 — Ascensão 1,95–2,45 s |
| `Weapon_Combo_1` | 3,50 s | Golpe 4 — Estocada 0,88–1,45 s (também na corrida); Queda do julgamento 0,30–0,95 s |
| `_360_Power_Spin_Jump` | 3,03 s | Golpe 5 — Sentença giratória 0,70–1,80 s |
| `Skill_03` | 1,63 s | Corte do retorno (saída do dash) 0,35–1,30 s |
| `Weapon_Combo_2` | 4,50 s | Arco aéreo 2,60–3,15 s |
| `Roll_Dodge_1`, `Run_Jump_and_Roll`, `slide_right`, `Walk_Forward_with_Bow_Aimed`, `Dead`, `_01a1b3e4…` (parado alternativo), `_01a1b3e6…` (reação) | — | Morte/reação já usados pelo jogo; os demais não entram (rolamento longo demais para o dash 3900; arco não é espada). |

Janelas ativas: trechos com velocidade da ponta da espada > 45 % do pico (amostrado a 30 Hz com a empunhadura nova).
Root motion: deslocamento real do quadril no chão de cada trecho (`protaClips`), aplicado na cápsula **com colisão**.

## 3. Repertório e hitboxes (matriz físico / energia / híbrido)

| # | Golpe | Trecho | Startup → ativo → recuperação | Hitbox | Energia (forma, alcance, quando) | Contato medido (`aim`) |
|---|---|---|---|---|---|---|
| 1 | Fenda diagonal | `Weapon_Combo` 0,52–1,08 | 0,19 → 0,36 → 0,56 s | **Físico** (lâmina varrida) | — | 1,4 m a 30° |
| 2 | Lua horizontal | `Triple_Combo_Attack` 1,10–1,76 | 0,22 → 0,46 → 0,66 s | **Energia** (só o volume causa dano) | setor 150°, raio 0,9→7,2 m, 26 m/s, nasce em 0,38 s | 1,9 m a −35° |
| 3 | Ascensão (lançador) | `Triple_Combo_Attack` 1,95–2,45 | 0,10 → 0,33 → 0,50 s | **Híbrido** | onda vertical, 4,6 m, 15 m/s, em 0,24 s | 1,5 m a 70° |
| 4 | Estocada | `Weapon_Combo_1` 0,88–1,45 | 0,15 → 0,36 → 0,57 s | **Físico** | — | 1,8 m a 35° |
| 5 | Sentença giratória (finalizador) | `_360_Power_Spin_Jump` 0,70–1,80 | 0,40 → 0,56 → 1,10 s | **Híbrido** | anel 360°, raio 1→5,6 m, em 0,78 s (pouso) | 1,6 m a −25° |
| — | Estocada em corrida | `Weapon_Combo_1` 0,88–1,45 | 0,12 → 0,34 s | Físico | — | 1,8 m a 35° |
| — | Corte do retorno (após o dash) | `Skill_03` 0,35–1,30 | 0,20 → 0,34 s | Híbrido | onda diagonal, 8,5 m, 22 m/s, em 0,84 s | 2,2 m a 0° |
| — | Arco aéreo (×2 no ar) | `Weapon_Combo_2` 2,60–3,15 | 0,10 → 0,40 s | Híbrido | setor 126° inclinado, 4,2 m | 1,6 m a −70° |
| — | Queda do julgamento | `Weapon_Combo_1` 0,30–0,95 | 0,17 → 0,46 s | Híbrido | anel no chão 3,6 m | 1,8 m a −30° |

Regras de dano (`sword-rites3d.js`):
- **Físico**: varredura da lâmina real (base acima da coroa → ponta), interpolada entre subpassos de 1/120 s, contra a cápsula do
  alvo; precisa de linha de visão (parede entre os dois = sem dano).
- **Energia**: o volume nasce na altura do meio da lâmina no instante do swing e se expande (setor/anel) ou viaja (onda). O dano
  sai quando a **frente** do volume encosta no corpo (banda radial + arco + altura inclinada pelo `roll`), com linha de visão; a
  onda morre na primeira parede. O efeito visual (`prota-vfx3d.js`) usa exatamente raio, banda, inclinação e alcance do volume.
- **Híbrido**: lâmina e energia compartilham o "acertou" do golpe → **um acerto por alvo por golpe**, nunca dano dobrado.
- O golpe de energia não depende da lâmina: no golpe 2 a lâmina passa longe e quem acerta é a lua (teste automático).

## 4. Alvo, aproximação e câmera

- **Escolha de alvo** (`pickTarget`): cone de 57° na direção do analógico (ou 77° sem entrada), até 8,5 m, diferença de altura
  ≤ 3 m, linha de visão, ameaça (chefe) e histerese para manter o alvo atual. MIRAR (lock-on existente) mantém o travado; no
  esquadrão o alvo escolhido vira o foco.
- **Motion warping** (`warpStep`): durante o startup o herói gira (≤ 12 rad/s) e desliza no máximo `warp.max` (1–3,6 m), a no máximo
  14 m/s, até o alvo ficar no ponto de contato medido do clipe; root motion + aproximação passam pela colisão (`moveWorldHero`):
  parede, árvore e guarda-corpo param o avanço; nunca teleporta, nunca entra no corpo do alvo. Alvo atrás (> 109°) só gira.
- **Alvo aéreo**: no ar, o startup ajusta a altura até o alvo e o golpe segura a queda (gravidade a 35 % durante o ativo); dois arcos
  aéreos e o terceiro vira a Queda do julgamento.
- **Câmera**: enquadra herói + alvo (foco puxa 22 %, 30 % durante golpe), oclusão já existente (árvore, encosta, casas),
  hitstop curto no contato, tremor só nos golpes com `shake` (finalizador e queda), FOV +3,2° no finalizador, sem tirar o controle.

## 5. Dash (referência 3087d4ad ≈ "3900")

Quadro a quadro da referência (30 fps): 0:00,6 o corpo se desfaz em fiapos verticais pretos que sobem e se esticam; ~0,33 s invisível;
na chegada uma mancha horizontal escura, alongada no sentido do deslocamento, se contrai em ~3 quadros e o corpo reaparece.
Implementação: 5,4 m em 0,13 s, i-frames 0,30 s, recarga 0,48 s; o modelo some, 28 fiapos de fumaça (pool) sobem na origem
deixando a silhueta escura residual (`heroShadows`), a travessia é invisível e varrida contra parede (atravessa corpos de inimigos,
nunca obstáculos; nunca termina dentro de um corpo), na chegada o rastro horizontal se fecha no corpo e o clipe de
rematerialização toca. Golpe até 0,26 s depois do dash = Corte do retorno.

## 6. Evidências

Gravações no **mesmo cenário** do mundo principal (prado do prólogo, x 66 / z 150, mesmo inimigo, câmera de jogo), passo fixo de
1/30 s com a simulação real (`motionStep`), em `docs/evidencias/mod302/`:

- `antes_movimento.mp4` × `depois_movimento.mp4`: parado, andar sem correr, parar, correr com CORRER, parar, dash lateral, salto,
  dash de frente, giro 360.
- `antes_combo.mp4` × `depois_combo.mp4`: 5 golpes no alvo parado (câmera de jogo e lateral), close da espada.
- `depois_alvos.mp4`: alvo em movimento, dash + corte do retorno, corrida + estocada, alvo aéreo (salto, aéreos, queda).
- `espada-branca.png` (render do modelo) e `espada-close.png` (na mão, no jogo).
- `sonda-acertos.json`: log por quadro (golpe, fase, acertou, por lâmina/energia, distância mínima da lâmina ao corpo).

Resultados da sonda (mesmo cenário, alvo com vida alta):

| Situação | Antes (Mod 301) | Depois (Mod 302) |
|---|---|---|
| Distância mínima lâmina→corpo no golpe 1 | 0,62 m (erra) | −0,01 m (acerta) |
| Combo de 5, alvo parado | — (ver vídeo) | 5/5 acertos (lâmina, energia, lâmina, lâmina, lâmina+anel sem dano dobrado) |
| Combo de 5, alvo andando em círculo | — | 5/5 acertos |
| Corrida + estocada | — | acerto pela lâmina |
| Alvo aéreo a 1,5 m | — | 3/3 acertos no ar |

Testes automáticos: `node --test *.test.mjs tests/*.test.mjs` (os dois que já falhavam na main — Mod 262 e Mod 278 — seguem
falhando pelos mesmos motivos; nenhum novo).

## 7. Matriz das referências

Os vídeos chegaram com nomes de upload diferentes dos citados no brief; a correspondência abaixo é por conteúdo. O vídeo
negativo `1000364197.mp4` **não foi enviado** — não houve comparação com ele; o "antes" é a gravação do jogo atual.

| Referência (arquivo) | Brief | Timestamp | O que acontece | Câmera / VFX / contato | Equivalente implementado | Evidência |
|---|---|---|---|---|---|---|
| `3087d4ad…` (4,4 s) | 3900 | 0:00,6–0:01,4 | some em fumaça vertical, invisível, reaparece em rastro horizontal | câmera fixa; fumaça preta esticando para cima; mancha alongada no sentido do movimento | Dash 302 (fiapos + silhueta, travessia invisível, rastro que se fecha) | `depois_movimento.mp4` dash lateral/frente |
| `acf4e763…` (32 s) | 3895 | 0:02–0:03 | arco horizontal largo acerta à média distância | lua azul nasce na lâmina e viaja | Golpe 2 — Lua horizontal (energia pura) | `depois_combo.mp4` 2.º golpe |
| `acf4e763…` | 3895 | 0:04, 0:08 | corte vertical em crescente | crescente vertical | Golpe 3 — Ascensão (onda vertical híbrida) | 3.º golpe |
| `acf4e763…` | 3895 | 0:22–0:23 | golpes no ar e estouro no chão | arcos aéreos, explosão no impacto | Arco aéreo ×2 + Queda do julgamento (anel no chão) | `depois_alvos.mp4` alvo aéreo |
| `7e4b2554…` (15 s) | 3896 | 0:01, 0:05 | crescente dourado preso ao corte do corpo inteiro | arco grosso com gradiente seguindo a lâmina | Rastro da lâmina real (marfim/vermelho) + Golpe 1 | 1.º golpe |
| `0240a0f0…` (32 s) | 3897 | 0:10–0:12 | investida curta, faíscas no contato | câmera atrás, micro-pausa | Golpe 4 — Estocada com aproximação (≤ 3,6 m) e clarão no ponto do contato | 4.º golpe |
| `0240a0f0…` | 3897 | 0:03, 0:06 | golpe que lança / impacto com estouro | pilar de luz no lançamento | Ascensão (lançador do esquadrão) / Queda | 3.º golpe / queda |
| `9dacd64c…` (26 s) | 3898 | 0:03, 0:07 | crescente lançado logo após o deslocamento | crescentes preto/branco | Corte do retorno (onda de 8,5 m após o dash) | `depois_alvos.mp4` dash + golpe |
| `9dacd64c…` | 3898 | 0:24 | corte circular em espiral | anel em volta do corpo | Golpe 5 — Sentença giratória (anel 360°) | 5.º golpe |
| `523a21e1…` (10,8 s) | 3899 | 0:00, 0:08 | finalizador com explosão e micro-pausa | clarão forte, quadro dramático | Finalizador: hitstop 90 ms, tremor, FOV +3,2°, clarão maior | 5.º golpe |

Diferenças assumidas: as referências usam pós-processamento pesado (bloom, distorção); aqui o brilho é aditivo e limitado
(sem bloom extra) para não esconder a pose e para caber no orçamento mobile. Os efeitos de energia são pools fixos (8 volumes,
28 fiapos, 2 rastros, 6 clarões).

## 8. Espada branca (slot `prota`, Espada do Chamado)

Modelo 3D original procedural (8 draws, ~22 mil triângulos) baseado **apenas na espada branca à esquerda** da imagem: lâmina
longa e estreita de marfim entalhado em segmentos com gume prateado, quatro olhos vermelhos ao longo do eixo (dos dois lados) e
um maior no medalhão, coroa dourada baixa na base da lâmina, guarda em anel aberto com travessa dourada de volutas, quatro asas
brancas abertas (duas por lado) e cabo dourado longo com pomo em flor de lis. Mesmo quadro de empunhadura da EspadaProta (cabo
y=0,75, ponta y=−0,951): escala, hitbox e primeira pessoa preservadas; as outras espadas continuam medidas pelo desenho antigo
(`prota-legacy`) e não mudaram de tamanho. O rastro da lâmina do slot `prota` passou a marfim/branco com filamento vermelho.

## 9. Limitações honestas

- Gravações feitas em Chromium com SwiftShader (sem GPU): servem para pose, tempo e contato, **não** para FPS. Não houve teste em
  Android físico; o teste mobile foi por emulação de viewport/toque.
- Os SFX reutilizam os sons existentes do jogo (`worldAudio.swing/hit/whoosh`) sincronizados aos eventos novos; não há áudio novo.
- O enquadramento usa a câmera existente com ajustes; não há cortes de câmera cinematográficos durante o combo (o controle
  continua com o jogador).
