# Mod 248 (247b) — correção do VHAZRAEL: animação, Skills 1–3, Ruptura e Extinção

Base: `main` em `bff13d4`, com a Mod 247 mesclada (PRs #334/#335). O trabalho seguiu as fases do briefing temporário: transform/animação primeiro, depois as Skills 1–3 com evidência, e só então a Ruptura e a Ultimate.

## Fase 0 — bugs de animação e transform: causa real
- **Medição:** `vhazrael-preview.html` mede a inclinação do tronco (quadril → cabeça), a altura do quadril e a escala do modelo a cada quadro.
- **Antes da correção:**

  | Ação | Inclinação do tronco |
  |---|---|
  | Golpe | 56° |
  | Carga da Ruptura | 60° |
  | Despertar da Ultimate | 116° |

- **Causa:** o golpe usava o clipe acrobático `Sword Aerial Combo` (giro aéreo), e as conjurações usavam `Sword Regular B`, que termina agachado e é travado no fim. A camada procedural somava-se a essas poses extremas.
- **Bispo1-lod.glb:** o nó `Armature` tem rotação de ~99° em X e escala 0,0118, que fazem parte do rig. O root do personagem não precisa ser "desentortado". As inclinações legítimas dos ossos foram preservadas.
- **Correção:**
  - três golpes de montante nativos (`Trono_Corte`, `Trono_Estocada`, `Trono_Queda`), gerados pelo assador de IK da Mod 244 no esqueleto mixamo, com contato só pela trajetória da lâmina;
  - conjurações sobre o `Idle` com a camada procedural.
- **Depois da correção:**

  | Ação | Inclinação do tronco |
  |---|---|
  | Golpe | 8° |
  | Espinhos e Ninhada | 20–21° (gesto para o chão) |
  | Idle | 9° |

  O quadril fica estável entre 0,93 e 1,04 m, e a escala não varia.
- **Espada:** a Lâmina do Trono passou a ser um montante de seção em losango (lâmina de 1,45 m), com guarda e cabo de duas mãos e escala 1. Em repouso, a lâmina fica para baixo. Ela segue o osso da mão só nos golpes, na Ruptura e na Ultimate.
- **Cleanup:**
  - o estado da cinematografia é recalculado a cada quadro a partir da esquadra;
  - morte, pausa, troca de dimensão e queda limpam tudo (`clearPack`/`stop`).

## Fase 1 — Skills 1, 2 e 3
- **Sombreamento:** escala não uniforme distorcia as normais e deixava tudo rosado. Agora as peças instanciadas usam a matriz normal correta (`transpose(inverse(...))`).
- **Espinhos:**
  - lâminas facetadas, longas e finas, com farpas: são geometria procedural, não cones;
  - negras, com filetes violeta nas arestas;
  - perto do jogador, espinhos de dano em trio entrecruzado, com raízes rompendo o solo, rachadura de aviso e direção real;
  - por onda, uma floresta decorativa de 14–22 m que se cruza acima da arena em vários planos (22 lâminas; 8 na qualidade baixa);
  - 3 chamadas de desenho para todas as lâminas.
- **Entidade do Terror:** superfície curva gigante pintada em shader atrás do bispo:
  - massa negra de contorno que se deforma, com braços ao fundo;
  - olhos vermelhos de íris irregular, centro claro e pupila que segue o jogador;
  - bocarra com três fileiras de dentes serrilhados que abre e respira.
- **Mãos:** antebraço torcido em segmentos, palma com boca dentada, cinco dedos de três falanges com garras. Fases:
  - aviso com rachadura e tremor;
  - subida e agarrão;
  - mordidas;
  - retração.

  Vinheta vermelha curta no agarrão, abaixo do HUD. DASH ou DEF soltam.
- **Ninhada:**
  - corpo = boca horizontal em losango, com lábios, 13 dentes por fileira (16 no Colosso), garganta negra e dois pontos brancos;
  - 10 patas assimétricas de três juntas, joelhos altos e garras de três pontas;
  - marcha com pés plantados, bote, mordida, reação e morte por dissolução.

  O Colosso é 4×. Tudo é montado por cinemática direta num kit instanciado, com ~7 chamadas de desenho para todas as criaturas e mãos.

## Fase 2 — Ruptura do Trono e Extinção Orbital
- **Ruptura do Trono:**
  - fitas negras/carmim enroladas na lâmina e vento subindo;
  - pilar de 46 m com núcleo branco, faixa magenta e borda de chamas negras recortadas;
  - cruz vermelha e impact frame de contraste de 90 ms (desligado com reduzir flashes);
  - frente de energia larga e irregular, com fissura de magma e placas de rocha incandescentes;
  - domo magenta/roxo com rasgos, raios, coluna e três anéis de choque.
- **Extinção Orbital (17,8 s):**
  - **Ato 1:** close de baixo para cima e fundo de chamas sólidas vermelho-sangue com tinta negra.
  - **Atos 2–3:** CENA ISOLADA (floresta oculta) com:
    - planeta com curvatura e atmosfera fina;
    - nuvens em faixas, ciclone carmim e feixe orbital;
    - meteoro de rocha com fraturas incandescentes, acompanhado de perto entrando na atmosfera, com plasma e fragmentos.
  - **Ato 4:** controles devolvidos e o meteoro (85–110 m) cobrindo o céu; DEF ou ULTIMATE.
  - **Ato 5:** clarão curto (ou atenuado), domo em camadas com núcleo branco, coluna e anéis.

  Uma vez por encontro. Sem fraqueza depois.

## Testes executados
- **`node --test`:** 308 aprovados.
- **Chromium headless (SwiftShader):** prévia isolada e jogo em tela de celular, com capturas de cada fase em `docs/evidencias/mod247b/`.
- **Não testado:** Android físico, FPS real e áudio ouvido. Os vídeos de bug citados no briefing (`1000362896/7`) não estavam disponíveis; foram usadas as imagens e os dois vídeos de referência enviados.
- **Estresse de 20 ciclos** (todas as skills, golpes e interrupções): inclinação máxima ≤ 21°, quadril 0,93–1,01 m, deriva de escala 0, espada com escala 1, 0 erros.
- **Jogo:** laboratório (skills + Ultimate completa, boss retoma depois), dimensão completa (cartão VS → luta → vitória) e regressão dos labs Enemy1/Enemy2, todos com 0 erros de console.
- **Evidências:** `docs/evidencias/mod247b/01…07` (prévias das skills, Ruptura, Ultimate e jogo em tela de celular).
