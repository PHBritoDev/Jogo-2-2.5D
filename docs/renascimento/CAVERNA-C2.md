# Caverna de Eldória — C2: rocha em volume 3D (paredes e abóbada)

Etapa C2 do `PLANO-CAVERNA-ELDORIA.md`. Branch `claude/eldoria-caverna-c2`, empilhada sobre a C1 (#518). **Sem merge
sem validação.** Medições em SwiftShader (852×393 mobile e 1280×720 desktop). Não é FPS de Android.

## O que muda

**Antes:** paredes e abóbada eram uma folha de altura (`caveRoofAt`) que "caía" na borda. As paredes viravam saias
verticais esticadas, com serrilhado, sem reentrâncias nem bancadas.

**Agora** (`ascension-cave-sdf.js`, puro):
- **Campo 3D da rocha.** O ponto de partida é o mesmo vazio de antes (contorno `caveField` + domo `caveRoofAt`).
  Sobre ele entram ruído 3D (reentrâncias e beirais) e estratos inclinados (bancadas de calcário). Os estratos são
  fortes junto à parede e suaves no meio do domo, para as estalactites continuarem assentadas.
- **Malha por Surface Nets esparso:**
  - avalia só as colunas perto de parede e a faixa da abóbada;
  - é fechada por dentro, sem buracos (verificado em teste);
  - tem cerca de 1 m de resolução no desktop e 1,6 m no mobile.
- **Piso inalterado.** Continua a folha de altura exata de `caveFloor`, de modo que física, gatilhos, ponte, poças e
  abismo não mudam. A deformação da rocha é **zero até 0,8 m acima do piso** e cresce até 2,6 m. Na altura do corpo,
  a parede visível continua onde está a colisão de `caveWalk`.
- **Câmera pelo mesmo campo.** `caveCamSolid` passa a consultar o campo 3D por uma grade de colunas bilinear, com
  ~0,2 µs por consulta. Concorda com o campo exato em ≥ 99 % das amostras. Assim, o que se vê é o que segura a câmera.

**Integração** (`ascension-cave3d.js`):
- A malha é gerada num **Web Worker** (`ascension-cave-sdf.worker.js`).
  - Medido: ~450–550 ms no SwiftShader, fora da thread principal.
  - Se o Worker não existir ou falhar, a geração roda na thread principal.
  - A folha antiga fica visível até a malha nova chegar e depois é descartada.
- **Rollback:** `?caverna=0`.

**Por que Surface Nets e não marching cubes (o plano previa marching cubes):** malha com metade dos triângulos para a
mesma resolução, um vértice por célula (sem tabela de 256 casos) e sem buracos por ambiguidade. Gerado em cerca de
0,5 s, é a melhor relação custo/forma para o mobile.

## Medições (C1 → C2)

| | C1 | C2 |
|---|---|---|
| Quadros com câmera na rocha (8 pontos × 120, giro completo) | 0 | **0** |
| Braço mínimo da câmera no giro | 2,40 m | 2,38 m |
| Navegação: 7 trechos (entrada, ponte nos dois sentidos, gruta, norte, eco, galeria leste, eco–cristal) | percorridos | **percorridos**, sem queda nem trava |
| Draw calls (entrada/salão/cristal, mobile) | 81 / 70 / 75 | 79 / 70 / 75 |
| Triângulos desenhados (mobile) | 207 k / 177 k / 236 k | 212 k / 192 k / 252 k |
| Triângulos da rocha 3D | — | 26 k mobile · 68 k desktop |
| Tempo de render (`perfProbe`, mobile) | 1,7–2,5 ms | 1,7 ms |

## Testes

| Teste | Resultado |
|---|---|
| `tests/caverna-c2.test.mjs` | 4/4. Cobre: rocha nunca invade pés/cabeça onde se anda; malha fechada, determinística e no orçamento (≤ 30 k mobile, ≤ 75 k desktop); grade da câmera ≥ 99 % igual ao campo exato; integração (Worker, reserva, rollback, câmera) |
| Suíte completa | Só falham os 2 testes que já falham na `main` (`Mod 262`, `Mod 278`) |
| CI | `renascimento-f1-qa` passa a rodar os testes C1/C2 e a disparar com os arquivos da caverna |

## Evidências (`evidencias/caverna-c2/`)

- `forma-folha-antiga-vs-volume-3d.jpg`: só a forma, com luz neutra de inspeção (`tools/visual-lab/cave-sdf-preview.html`).
  Mostra a parede do salão, o domo, a gruta, o corredor, o salão de cristal e a prisão.
- `forma-desktop-1m-vs-mobile-1_6m.jpg`: a resolução do mobile mantém bancadas e reentrâncias.
- `jogo-9-pontos-antes-depois.jpg`: no jogo, nos 9 pontos fixos da baseline. A iluminação da caverna ainda é a antiga
  (escura); a luz é a C4.

## Próximo

- **C3:** material com estratos, umidade e espeleotemas.
- **C4:** luz por câmara. É ela que vai revelar a forma nova no jogo.
