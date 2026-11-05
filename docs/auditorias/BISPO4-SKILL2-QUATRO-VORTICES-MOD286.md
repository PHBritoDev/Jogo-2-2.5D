# Mod 286 — VÉRAXION (Bispo 4): Skill 2 "QUATRO VÓRTICES DO JUÍZO AZUL" + kit só com as magias autorais

## Kit do Bispo 4 (`powers3d.js`)
- O kit `veraxion` (também usado pelo `fallen4`) agora tem **exatamente**:
  - s1 `veraxion_four_swords`: QUATRO SENTENÇAS DO ABISMO, da Mod 285, preservada sem alteração visual;
  - s2 `veraxion_four_blue_tornadoes`: QUATRO VÓRTICES DO JUÍZO AZUL.
- `sword: null` e `ult: null`. A ultimate autoral ainda será criada com o autor; não há substituto.
- **Excluídos** do Bispo 4: Orbes do Abismo (s3), Corte do Abismo especial, BURACO NEGRO, Fogo Abissal (já excluído na Mod 285) e Furacão Negro. Eles saíram do kit e de `ULTIMATES.veraxion`; `startVoidUlt` e `tickVoidUlt`, que só o Bispo 4 usava, foram removidos do código.
- **Roteamento:** depois das duas magias autorais, `runFoeMove` encerra (`if(isVeraxionProfile(...))return;`), então nenhum fallback genérico sai.
- **Preservado:** a função global `fxVortex` (usada pela Ganância II), os ataques NORMAIS de espada, a defesa, o dash e os poderes dos Bispos 1–3.

## Linha do tempo (`veraxion-blue-cyclone3d.js`, determinística e testável)
| s | Fase |
|---|---|
| 0–0,6 | O bispo **aponta a espada** (pose `vxcy`, braço real) e a aura ciano cresce. A aura fica até o fim (12,95 s). |
| 0,4–1,9 | A mandala é **desenhada traço a traço** sob **p0**, a posição do herói no início, fixa no mundo: contorno e runas → filigranas → flor central → ligações → quatro selos. |
| 1,9–3,2 | Um tornado nasce em cada selo diagonal (com 0,12 s entre eles). |
| 3,2–5,9 | Os quatro andam ao mesmo tempo, em arco, até perto de p0, deixando **fogo azul** com vida de 4 s **por segmento**. |
| 5,9–7,0 | Os quatro espiralam para o centro e o mega vórtice cresce por baixo deles, sem *pop* (3,5× maior visualmente). |
| 7,0–9,6 | Mega sucção: giro acelerado, poeira e destroços. |
| 9,6–10,15 | Implosão: a coluna é comprimida e a energia é sugada de fora para dentro. |
| 10,15–10,45 | Pausa quase vazia, com micro-pulso de aviso na mandala. |
| 10,45 | **UMA** explosão azul em lóbulos, com veios escuros, colarinho, anel largo com franja cromática e onda no chão. |
| 10,45–12,35 | Campo de fogo azul residual. A aura se dissolve só no fim. |

## Física e dano
- **Mandala:** 25 m de diâmetro (42% da arena de 60 m). Os quatro selos ficam nas diagonais, dentro da arena (são recuados ao longo da diagonal se p0 estiver perto da borda).
- **Sucção** (`pullAt`), sem teleporte e sem travar o controle:
  - usa a maior das influências, **nunca a soma das quatro**;
  - componente tangencial leve;
  - teto global de 6 m/s;
  - no mega vórtice, 6 m/s com alcance de 15 m e queda radial;
  - **o dash reduz a força a 18%**;
  - respeita `playerBlockedAt` e nunca puxa para dentro do bispo;
  - não interfere com `portalPull` nem com a cinematografia.
  - Testado: correndo a 7,2 m/s o herói escapa do mega a partir de 5 m, e com dashes repetidos escapa até do centro.
- **Riscos separados:**
  - sucção: não fere;
  - contato com tornado: 5 de dano, 7 no mega, com recarga global de 0,9 s;
  - **queimadura de 3,7 s** que renova a cada contato, até **3 acúmulos** (um novo acúmulo só a cada 0,9 s), com um tick canônico a cada 0,95 s de 2 × acúmulos;
  - fogo: só queimadura, e perde o dano no mesmo instante em que some;
  - explosão: dano único de 20 em raio de 8,5 m.
- **Pipeline:** tudo passa por `pHit` (i-frames, dash, defesa). Nenhum evento tem empurrão.
- **Parado no centro o tempo todo:** cerca de 85 de dano (vida 100), sem morte de uma vez.
- **Interrupção:** morte, troca de perfil ou dimensão, ou cinematografia abortam e limpam a queimadura e o fogo. O reset da dimensão chama `stopVeraxionCyclone()`.
- **Exclusividade:** S1 e S2 nunca acontecem juntas (`if(vxSwords||cySkill)` e `if(cySkill||vxSwords)`). As ultimates esperam as duas, e o `kitState` segura a próxima magia.

## VFX (`veraxion-blue-cyclone-vfx3d.js`, isolado da S1)
- **Aura:** a mesma família da aura rubra (línguas presas a 14 ossos e casca com skinning), em ciano/violeta e um pouco mais intensa.
- **Mandala:**
  - CanvasTexture autoral em que o canal R é o traço e G/R é a **ordem do traço**; o shader revela por progresso, com uma frente luminosa;
  - glifos autorais (não copiados), flor de cristal central, seis filigranas e quatro selos com textura própria;
  - camada escura por baixo para as linhas lerem em qualquer piso.
- **Tornado:**
  - corpo torcido com perfil base larga / cintura / topo alargado, eixo em S que ondula e topo rasgado;
  - shader com faixas helicoidais em várias frequências, domain-warp, veios claros e fendas escuras;
  - **casca externa aditiva** girando em outra velocidade (volume);
  - lâminas helicoidais, algumas escuras como no GIF;
  - redemoinho no chão, destroços instanciados e faíscas;
  - o mesmo corpo vira o mega vórtice.
- **Fogo azul:** cartões cruzados instanciados (um draw para tudo), com línguas por ruído, buracos, núcleo ciano-branco e vida por instância.
- **Explosão:** 84 lóbulos instanciados (44 no low) em domo com colarinho, halo, anel inclinado com franja laranja/magenta, onda no chão, flash contido e partículas.
- **Câmera e conforto:**
  - perto da câmera, o tornado fica translúcido e os lóbulos usam transparência pontilhada;
  - `ultCam` leve: vista de cima no desenho e plano aberto depois, com o mesmo yaw (joystick e câmera livres);
  - FOV pulsa na fusão, na implosão e na explosão;
  - tremor por trauma desfeito antes da câmera do quadro seguinte, respeitando `reduceShake`.
- **Som:** `abyss3` (warn, gravity, tear, storm, boom, heavy, thunder).
- **Custo:** pico de cerca de 55 draw calls e 320 mil triângulos no high, e de cerca de 203 mil triângulos no low. Tudo em pool, sem alocação de mesh por quadro.

## Testes
- **`node --test`:** 422 passando e 5 falhando. **As 5 falhas já existiam na `main`**: `tools/visual-lab` sem `sharp`, Mod 262 e Mod 278.
- **Novos** (`veraxion-blue-cyclone.test.mjs`):
  - ordem das fases, 4 tornados, uma explosão e pausa antes do clímax;
  - duração entre 8 e 15 s;
  - aura contínua;
  - p0 fixo, mandala de 24–30 m e satélites diagonais e dentro da arena;
  - convergência para p0 mesmo com o herói fugindo;
  - sucção sem soma, com teto, dash de 18% e rotas de fuga;
  - recarga de contato, queimadura de 3,7 s com no máximo 3 acúmulos, explosão única, i-frames e nada de dano longe;
  - nenhum empurrão;
  - 10/30/60 FPS sem divergência;
  - interrupção limpa;
  - kit, IA (400 escolhas, só S1 e S2), ultimate nula e roteamento.
- **Ajustados:** `powers3d.test.mjs`, `ultimates3d.test.mjs` e `veraxion-four-swords.test.mjs`, para o kit sem magias genéricas.
- **Jogo real no Chromium headless (SwiftShader), `?testeDimensao=bishop4&testCicloneAzul=1`:**
  - paisagem high, retrato e low;
  - herói parado no centro e herói fugindo;
  - **0 erros de JS ou shader e 0 respostas ≥ 400**.
  - A Skill 1 (`testQuatroEspadas=1`) foi reexecutada depois das mudanças: todas as fases e 0 erros.
- **FPS:** SwiftShader não equivale a uma GPU Android. FPS real não medido.

## Comparação com as referências (julgamento visual, não número calculado)
| Referência | Resultado |
|---|---|
| GIF do tornado | Mesma paleta ciano/branca com fendas escuras, faixas helicoidais em várias camadas que giram em velocidades diferentes, cintura e topo alargado, redemoinho na base e destroços. Ver `comparacao-tornado-gif.jpg` e `video-tornado.mp4`. |
| Quatro tornados (morfologia) | Silhueta em S que ondula e acento violeta discreto; o azul domina. |
| Círculo | Mandala central densa, anel de runas, quatro selos diagonais e ligações rúnicas em arco, desenhados traço a traço. |
| Fogo azul | Línguas orgânicas com núcleo ciano-branco que dançam, por trechos de 4 s. |
| Explosão | Massa em lóbulos ciano-brancos com veios escuros, colarinho mais largo, anel com franja cromática e halo. |

**Diferenças que restam:**
- o GIF tem bandas mais finas e numerosas e um aspecto "líquido" mais opaco;
- a explosão de referência é mais luminosa (bloom), e aqui foi contida de propósito para não estourar a tela no celular.

## Teste no navegador
- `mundo-3d-prototype.html?testeDimensao=bishop4&testCicloneAzul=1` (Skill 2 isolada);
- `?testeDimensao=bishop4&testQuatroEspadas=1` (Skill 1);
- `?testeDimensao=bishop4` (luta normal com as duas, alternando por recarga);
- prévia: `veraxion-blue-cyclone-preview.html?t=…&cam=wide|circle|tornado|mega|blast`.

## Evidências
`docs/evidencias/mod286/`:
- `comparacao-*.jpg`: referência e resultado lado a lado;
- `video-tornado.mp4` e `video-geral.mp4`: prévia em movimento;
- `jogo_*`: capturas reais do jogo (paisagem, retrato, low; parado e fugindo);
- `fases_*.jpg`.
