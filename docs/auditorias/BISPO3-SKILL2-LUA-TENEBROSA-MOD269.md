# Mod 269 — ZAR'KHAEL (Bispo 3): Skill 2 "LUA TENEBROSA — O FOGO QUE NÃO MORRE"

## Integração
- **Kit (`powers3d.js`):** `KITS.zarkhael.s2` (o perfil `fallen3` usa o mesmo kit) é `zarkhael_black_moon_flames`, com dano base 4 (o multiplicador é aplicado por `powerStats`), recarga de 32 s e alcance de 5–28 m.
- **Continua como estava:** a Skill 1 (Hidra), a ausência de espada e de ultimate genéricas (Mod 267) e a remoção global dos projéteis legados (Mod 264).
- **Ligação no código:** `runFoeMove` → `startMoonFlames`; `updateMoonFlames(dt)` no laço; `stopMoonFlames()` no reset da dimensão.
- **Exclusividade:** a Lua não começa durante a Hidra, e nenhuma outra magia do kit sai durante a Lua.
- **Bispo durante o ritual:**
  - fica parado conjurando, virado para o herói, até 0,45 s depois do lançamento da colossal;
  - continua levando dano normalmente;
  - faz pose de estocada a cada antecipação, pose de canalização na carga final e estocada no lançamento.
- **IA (`zarkhael-brain3d.js`):**
  - nova faixa de distância para a Skill 2 (5–28 m) e peso 1,15;
  - ×1,15 com o herói correndo;
  - ×0,6 com o herói em dash;
  - ×1,1 logo depois da Hidra (alterna as duas);
  - colado, nenhuma magia é escolhida (só combate físico).
- **Interrupção:** morte do bispo ou do herói, troca de perfil ou cinematografia abortam a sequência, sem novos disparos. A morte do herói e a saída da dimensão também apagam manchas e queimadura. A pausa congela tudo, porque o laço do jogo para.
- **Teste:**
  - `?testeDimensao=bishop3&testLuaNegra=1` repete a habilidade (a Hidra fica em espera);
  - botão "🌑 Testar LUA TENEBROSA (Bispo 3)" no painel das dimensões e no laboratório;
  - o teste da Hidra continua.

## Linha do tempo (`zarkhael-blackflame3d.js`, um relógio só)

| Momento | O que acontece |
|---|---|
| 0–1,4 s | A lua se revela no alto por dissolução de ruído. |
| 1,9 s + 0,95 s × i | Exatamente 7 chamas, cada uma com antecipação de 0,38 s na mão. O contador é determinístico, de 1 a 7. |
| 8,9 s | Começa a carga da colossal (2,5 s): faísca → fluxo → núcleo → muralha de línguas, com rumor de tremor e aviso no status. |
| 11,4 s | Lançamento da colossal (14 m/s), com anel de aviso no chão onde ela vai cair. |
| A partir do lançamento | A lua começa a sumir (1,1 s). |

- **Trajetória:** cada projétil sai da mão real do bispo (osso `RightHand`) num arco curto até o chão no ponto mirado.
- **Mira:** a posição do herói no disparo, com antecipação de até 0,2 s / 2 m, e fica travada.
- **Colisão:** varredura por segmento contra a cápsula do herói, sem atravessar; i-frames e dash respeitados.

**Durações**

| Fonte | Efeito | Duração |
|---|---|---:|
| Chama pequena acerta o herói | dano + queimadura fraca | 3,4 s |
| Chama pequena cai no chão | mancha viva | 4,0 s |
| Herói toca a mancha | queimadura fraca | 4,0 s |
| Colossal acerta o herói | dano grande + aura e queimadura forte | 6,0 s |
| Colossal cai no chão | incêndio gigante (5,5 m) | 7,0 s |
| Herói toca o incêndio | aura e queimadura forte | 6,0 s |

**Queimadura (`createFlameHazards`)**
- Uma única instância por herói.
- O mesmo nível só renova se a nova duração for maior.
- A forte substitui a fraca e fica com a maior duração.
- A fraca nunca enfraquece nem prolonga a forte.
- O contato é consolidado: a mancha mais forte que toca decide, e há um tick a cada 0,6 s, sem somar manchas. Basta tocar a borda (raio da mancha + 0,45 m do herói).
- **Dano por tick:** 1 (fraca) ou 2 (forte). Os ticks não dão i-frames nem interrompem o herói; só o tick que mataria passa pelo caminho completo de dano.
- **Limites:** no máximo 9 manchas. As manchas e a queimadura continuam depois da habilidade.

**Equilíbrio:** parado o tempo todo, o herói recebe cerca de 70–85 de dano no total (vida 100), sem morte instantânea. Correndo de lado e usando dash, foge da maior parte.

## Arte
- **Lua (referência B, shader próprio, sem textura copiada):**
  - disco osso-cinza com contorno irregular, sombra de esfera, manchas, sujeira e rachaduras finas;
  - vazio negro colossal à direita;
  - olho grande cinza-claro com pupila (esquerda) e olho menor perto do vazio, em órbitas fundas;
  - nariz claro e sorriso pequeno com fileiras de dentes finos e irregulares sobre gengiva escura;
  - fica parada no alto, dentro do anel de cogumelos, para nada da arena a esconder; tem 21 m de diâmetro e fica atrás do bispo visto do herói;
  - só as pupilas seguem o herói, com deslocamento limitado e suavizado (técnica de "mover a pupila, não o disco"). No lançamento final, as pupilas centralizam e acendem em vermelho antes de sumir.
- **Câmera:** enquanto a lua existe, a câmera de jogo inclina um pouco para enquadrar o bispo e a lua (`ultCam` com peso de 0,32, mesmo yaw, controles intactos). Não acontece em 1ª pessoa.
- **Fogo negro (referência A):**
  - línguas fluidas que sobem no eixo do mundo, com base larga, topo finíssimo e ondulação em S contínua;
  - núcleo de tinta preta, fio prateado interno, contorno prata frio com tom violeta sombrio e fios de fumaça cinza;
  - cinzas em `Points`.
  - Por tipo:
    - tocha pequena: 13 línguas;
    - colossal: 34;
    - mancha pequena: 14;
    - incêndio: 46;
    - aura fraca: 9 línguas no corpo;
    - aura forte: 21.
  - Os projéteis arrastam as línguas para trás do movimento.
- **Impacto:**
  - toque, depois ruptura que cresce (a colossal comprime 0,06 s antes de abrir), depois anel;
  - no corpo do herói a explosão cai para 50%, para não cegar a câmera.
- **Impact feel:**
  - tremor por trauma aditivo (`shakeAt`, desfeito antes da câmera do próximo quadro; respeita `reduceShake`, menor em 1ª pessoa);
  - colossal: hit-stop de 90 ms, FOV −5° e vibração;
  - pequena: hit-stop de 35 ms no acerto.
- **Custo:** cerca de 30 draw calls no pico, tudo em pool e sem alocação por quadro.

## Pesquisa usada
- **Olhar que segue:** limitar e suavizar a pupila dentro do olho, mover a pupila no material em vez de girar a malha, e dar um atraso para soar sinistro ([Unity — olhos do chefe seguindo o jogador](https://discussions.unity.com/t/enemy-boss-eyes-following-the-player/814574), [Eye Animator](https://shindodev.itch.io/eye-animator-for-unity), [Target Tracking Eye FX](https://forums.unrealengine.com/t/effectscreator-target-tracking-eye-fx/2841649)).
- **Fogo estilizado:**
  - forma base distorcida por ruído e cor por gradiente ([fogo procedural estilizado, 80.lv](https://80.lv/articles/check-out-this-fully-procedural-stylized-fire-vfx-made-with-shaders/));
  - [Stylized VFX in RiME](https://www.unrealengine.com/events/unreal-fest-europe-2018/stylized-vfx-in-rime): textura simples e distorção de UV;
  - [fumaça negra estilo Spellbreak](https://realtimevfx.com/t/how-to-create-stylized-smoke-spellbreak-inspired/21571);
  - fitas que reduzem overdraw.
- **Three.js:** InstancedMesh, materiais transparentes com `depthWrite:false` e ShaderMaterial (documentação oficial).

## Testes
- **`node --test`:** suíte completa passando. Os novos estão em `zarkhael-blackflame.test.mjs` e cobrem:
  - exatamente 7 chamas com 0,8–1,1 s entre elas e antecipação, depois 1 colossal carregada e lançada (8 projéteis reais);
  - lua inteira até o disparo final e sumindo só depois dele;
  - acerto e chão, manchas apoiadas no chão real e durações exatas;
  - queimadura não acumulativa (renova, a forte substitui, ticks consolidados, a borda conta, termina sozinha, limpa);
  - colossal com dano maior, dash e incêndio;
  - interrupção, IA alternando com a Hidra, integração e Mods 264/267.
- Os testes antigos que exigiam só a Hidra no kit do Bispo 3 foram atualizados para incluir a Skill 2. Três testes que já falhavam na `main` depois da Mod 267 (espada e ultimate do Bispo 3 em listas de outros perfis, e o marcador do HTML desalinhado) foram corrigidos.
- **Prévia:** `zarkhael-blackflame-preview.html?t=…&cam=hero|wide|moon|field|close&dodge=1`.
- **Jogo em Chromium headless (SwiftShader), `?testeDimensao=bishop3`:**
  - lua, 7 chamas, queimadura fraca, carga, colossal com aura forte e fim;
  - FOV restaurado;
  - 0 erros.
- **Evidências:** `docs/evidencias/mod269/`.

## Limitações
- Não testado em Android físico nem em GPU real. FPS real não medido.
- A lua e o fogo são recriações procedurais a partir das referências, não cópias.
