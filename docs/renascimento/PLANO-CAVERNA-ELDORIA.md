# Renascimento de Eldória — plano da reconstrução da caverna (Gruta da Fronteira)

Planejamento técnico e visual, sem código de produção nesta etapa. Pedido dos diretores após a revisão integrada
#510–#514. Prioridades: **naturalidade, exploração, iluminação cinematográfica e correção dos bugs antigos**.
Escopo: a caverna jogável do Ato I (boca em `CAVE_MOUTH` (−72,6; −236), zona interna `ZONES.cave`, malha
`ascension-cave3d.js`, formas e colisão `ascension-layout.js`). A "caverna cristalina" isolada
(`eldoria-crystal-cavern.js`, fora da campanha) só entra como fonte de peças.

## 1. Auditoria do estado atual (runtime, mobile 852×393, SwiftShader)

Baseline: `evidencias/caverna-baseline/baseline-9-pontos.jpg`, com 9 pontos fixos: entrada, corredor, salão/ponte,
salão alto, gruta das poças, eco, prisão, cristal e portal.

| Tema | Hoje | Leitura |
|---|---|---|
| Forma | Campo 2D (`caveField`): câmaras circulares e corredores-cápsula com ruído. O piso é `caveFloor(x,z)` e o teto, `caveCeil` | Um único nível. A "verticalidade" é só altura de teto e abismo. Paredes sem saliências, nichos ou pátamos |
| Material | `triplanarRock` com cor quase uniforme azul-acinzentada e facetas | Lê-se como "plástico escuro": sem estratos, umidade, sedimento ou espeleotemas |
| Luz | 4 luzes pontuais da caverna + tochas (9 no total), feixes como planos, poças emissivas ciano | Tudo na mesma meia-luz. Não há luz-chave por câmara e as poças brilham demais e parecem artificiais |
| Entrada | A boca GLB no mundo leva para outra zona (x = −3600) com véu/teleporte | O corte quebra a continuidade da jornada |
| Câmera | `caveArmLimit` com `camSolid`: nos 4 pontos testados não entra na rocha, mas o braço cai a **2,4 m** na passagem eco-cristal (r = 2,7) | Na passagem estreita, o herói ocupa a tela |
| Colisão | `caveWalk` booleano no mesmo campo da malha (coerente). Pilares e poças são círculos | Sem degraus, bordas ou plataformas. Não há onde subir |
| Custo | 116–125 draw calls e 173–233 k triângulos dentro da caverna | **Cerca de 25–40 draw calls são do mundo de fora** (vegetação, tochas, margens do rio), desenhados com 0 instâncias enquanto o herói está na caverna |

## 2. Bugs antigos e comprovados a corrigir nesta reconstrução

1. **O mundo de fora continua no laço de desenho dentro da caverna.** Os `InstancedMesh` cortados por distância
   ficam com `count = 0` e ainda passam pelo `renderBufferDirect`. Visto no `drawList`: `eldoria-ferns`,
   `broadleaf`, `vines`, `rio-pedras-*`, tochas da vila. Correção: partição de cena. Ao entrar numa zona, as raízes
   do mundo (Eldória, vila, margens, praça) ficam com `visible = false`. Opcional: mesh com 0 instâncias vira
   `visible = false` no próprio culler, guardando a visibilidade de quem a desligou por outro motivo.
2. **Corte de entrada.** O teleporte com véu na boca deve virar um túnel contínuo: a transição de zona acontece
   numa curva fechada do túnel, fora da vista, com a luz casada dos dois lados.
3. **Câmera comprimida em passagens < 3 m.** Nelas a câmera deve passar a ombro (lateral e mais alta), em vez de só
   encurtar o braço. Também é preciso um mínimo de 3,2 m entre paredes onde houver combate.
4. **Poças "neon".** As poças hoje são emissivas e opacas. Devem ganhar profundidade com reflexo, absorção pela
   profundidade, borda úmida e brilho só onde um feixe toca a água.
5. **Escuridão usada para esconder.** A escuridão deve ser escolha de cena, com silhueta legível sempre: luz de
   recorte na saída de cada passagem e piso com valor mínimo garantido no mobile.
6. **Leitura de bordas no abismo.** Hoje a queda é resolvida pela física. A borda precisa de lábio de rocha
   visível, poeira caindo e aviso sonoro, para não parecer parede invisível nem queda injusta.

## 3. Visão (o que o jogador deve sentir)

Uma **gruta calcária viva**, cavada pela água ao longo de muito tempo, que se abre em escalas diferentes:

| Lugar | O que é |
|---|---|
| Boca | Mata invade a pedra, raízes descem pela parede e a luz do dia morre em ~20 m |
| Salão do Abismo | Vertical (40 m), com estratos inclinados, uma ponte natural sobre o vazio e um **feixe de luz de uma fenda do teto** com poeira suspensa. É o plano cinematográfico da caverna |
| Gruta das Poças | Água parada verde-azulada, espeleotemas (estalactites/estalagmites, cortinas de calcita) e gotejamento audível |
| Galeria Alta (**novo nível**) | Pátamar a +6 m, alcançado por uma rampa de sedimento e degraus naturais. Dá vista para o salão e leva a uma **saída alternativa** pela encosta da serra |
| Prisão | Ocupação humana recente: jaulas GLB, restos da vigília e a única fonte de fogo |
| Salão de Cristal | Os cristais são **a** luz da câmara (emissão + 1 luz pontual fraca), e a água-espelho devolve o violeta |
| Câmara do Portal | Mantida (narrativa/dimensões intocadas) |

A exploração sai do corredor único:
- um **laço** (salão → galeria alta → cristal → passagem do eco → salão);
- **2 desvios opcionais com recompensa real**: um nicho com relíquia (mesmo padrão do Posto do Vigia) e um mirante
  sobre o abismo;
- a saída alternativa.

## 4. Técnica

**Forma (natural e coerente com a colisão):**
- Trocar o campo 2D por uma **SDF 3D** que inclui câmaras, corredores, galeria alta, nichos e ruído com estratos
  inclinados.
- A malha sai por **marching cubes** em *chunks* de 16 m, gerados num Web Worker na carga da zona (com cache), mais
  um LOD grosso.
- Câmaras e passagens atuais servem de esqueleto. A Câmara do Portal e o gatilho `crossedCavePortal` não mudam.
- Piso caminhável vem da mesma SDF (altura por raio descendente na grade de 0,5 m). Plataformas e degraus usam
  `eldoria-walkable` (STEP_UP 0,55).
- Paredes e câmera usam a SDF: `camSolid = sdf < 0`. Assim, **visual = colisão** em toda a caverna.

**Espeleotemas e detalhe:**
- Estalactites e estalagmites instanciadas por regras (teto alto + umidade), com 3 formas procedurais e LOD.
- Cortinas de calcita como fitas e sedimento nas depressões.
- Raízes na boca (GLB das árvores em escala de raiz).
- Nada fica num caminho: há teste de distância às rotas.

**Material:**
- Triplanar procedural com **estratos** (bandas por altura + inclinação), molhado perto da água e dos feixes
  (roughness baixa) e musgo só onde há luz.
- 2 texturas de canvas (rocha e calcita), sem textura externa.

**Luz cinematográfica (orçamento mobile):**
- Por câmara:
  - 1 luz-chave (feixe do teto ou fonte narrativa);
  - 1 preenchimento muito fraco por cor de ambiente;
  - emissivos (cristais, água tocada pelo feixe).
- No máximo 4 luzes ativas por vez, alternando por câmara.
- Feixe volumétrico **falso**: cone aditivo com ruído + partículas de poeira, sem pós-processamento caro.
- Exposição e névoa por câmara, ligadas ao `nostalgic-light`.
- As tochas GLB ficam só onde há gente (prisão).

**Áudio:**
- Reverb por tamanho de câmara (convolução curta procedural).
- Gotejamento posicional perto das poças e espeleotemas.
- Vento na fenda do salão e eco dos passos.
- Tudo procedural, no motor existente.

**Desempenho:**
- Partição de cena (bug 1) e oclusão por câmara (só a câmara atual + vizinhas por portal).
- Orçamento dentro da caverna: **≤ 90 draw calls e ≤ 220 k triângulos** no mobile.
- O que conta é a medição em aparelho real. O SwiftShader serve só para contagens.

## 5. Etapas (PRs pequenos, cada um com evidência antes/depois)

| PR | Conteúdo | Aceite |
|---|---|---|
| C1 | Partição de cena (bug 1), câmera a ombro em passagem estreita (bug 3), legibilidade de bordas (bug 6) | draw calls na caverna −25 a −40; braço ≥ 3,2 m ou a ombro; QA de queda |
| C2 | SDF 3D + marching cubes em worker (forma atual como esqueleto) + colisão/câmera pela SDF | Navegação da matriz atual intacta; 0 quadros com câmera na rocha; custo dentro do orçamento |
| C3 | Material com estratos/umidade, espeleotemas, poças com profundidade (bug 4) | Capturas nos 9 pontos × 3 condições |
| C4 | Luz por câmara (feixe do salão, cristal, prisão), névoa/exposição, áudio por câmara (bug 5) | Silhueta legível em todo ponto; nenhuma luz extra além do orçamento |
| C5 | Galeria Alta, laço, 2 desvios com recompensa, saída alternativa e entrada contínua (bug 2) | Jornada boca → saída alternativa sem corte; saves e gatilhos preservados |

## 6. QA (por PR)

- Matriz `navWalk` na caverna: entrada, ponte, beira do abismo, poças, passagem estreita, degraus da galeria, prisão e
  portal.
- Câmera: quadros com câmera na rocha (8 pontos × 120 amostras), braço mínimo e 1ª pessoa.
- Capturas fixas nos 9 pontos da baseline, nas mesmas posições.
- Custo: draw calls, triângulos, programas compilados ao entrar (pré-aquecimento na boca) e heap.
- Narrativa: portal, dimensões, VHAZRAEL e jaulas inalterados (testes atuais + `ascension-zone-sweep`).

## 7. Riscos

- **Marching cubes no mobile:** geração em worker com cache por versão. Se falhar, usa a malha atual (rollback por
  flag `?caverna=0`).
- **Mudança de forma pode deslocar gatilhos:** o esqueleto é mantido e os gatilhos são testados por posição.
- **Luz bonita só no desktop:** o orçamento é por câmara e o perfil mobile é validado com captura própria.
