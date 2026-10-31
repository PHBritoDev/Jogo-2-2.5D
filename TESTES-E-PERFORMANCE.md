# Testes e desempenho — VFX sakuga

## Ambiente medido

- **Navegador:** Chromium headless com SwiftShader (WebGL por software).
- **Tela:** viewport de celular 851×393, DPR 1,5, toque.
- **Qualidade:** Auto (pixel ratio ~1,02).
- **Hardware:** contêiner de nuvem, sem GPU.
- **FPS:** 0–3, inútil como referência de desempenho. **Android físico não testado; FPS em celular não medido.**

## Automatizados (`node --test`)

**264/264 aprovados.** Destaques:
- `sakuga-skills.test.mjs`:
  - Esfera: fases, voo real, acerto único, cúpula só perto do contato; parede e chão sem dano; cancelamento sem dano.
  - Explosão: círculos travam e dá para sair do raio; pilar só no núcleo; onda saltável.
  - 20 lançamentos seguidos de cada poder sem acumular estado.
  - Integração atrás da flag.
- `enemy1-integration.test.mjs`: coerência de versão (marcador, loader, BUILD e index = 241).
- `enemy2-squad.test.mjs` e demais: sem regressão.

## No navegador (medido)

| Situação | Chamadas de desenho | Incremento sobre a base |
|---|---|---|
| Base: laboratório da Mod 236, sem poder ativo | 545 | — |
| Impacto Cruzado (pico) | 584 | **+39** |
| Esfera da Destruição (pico) | 595 | **+50** |
| Explosão Celestial (pico) | 591 | **+46** (meta < 120) |

- **Memória** (`renderer.info`):

  | Momento | Geometrias | Texturas | Programas |
  |---|---|---|---|
  | Base | 420 | 24 | 122 |
  | Depois do 1º ciclo dos 3 poderes | 448 | 25 | 133 |
  | Depois de **60 lançamentos seguidos** (20 de cada) | **448** | **25** | **133** |

  Não há crescimento por lançamento.
- **Enemy2 e mini-chefe** (`?testeEnemy2=1`):
  - grupo de 3 e mini-chefe lutando com Vórtice, Trindade e Colapso;
  - impactos sakuga visíveis;
  - sem erros de página nem de shader. Um nome reservado de GLSL (`patch`) foi encontrado e corrigido antes da medição final.
- **Sem a flag:** o laboratório da Mod 236 continua com Portais e Dragão (teste de integração).

## Capturas

As capturas foram tiradas no ambiente acima e não estão versionadas. Para gerar de novo, abra os links de teste.

## Não feito ou limitações

- **Android físico:** sem medição de FPS, tempo de quadro de GPU/CPU nem memória real.
- **Morte durante o cast e volta da dimensão de Valério com a flag:** sem teste automatizado no navegador. A lógica cancela com `valid: false`, como as outras skills.
- **Pedras do impacto:** colidem com o terreno, não com troncos ou paredes.
- **Referências do criador:** chegaram depois e foram comparadas (esfera rubro-negra, X carmim e vídeo da explosão). Ajustes feitos depois da comparação:
  - **Esfera:** muito maior, erguida acima da mão; vermelho manchado com rede de rachaduras negras **na superfície** com halo magenta, brilho magenta no centro e aura vermelha.
  - **X:** bordas de fogo rasgadas, clarão branco de 4 pontas no cruzamento, clarão do impacto e mais linhas de velocidade.
  - **Explosão:** círculos laranja com espirais de fogo e magenta com anel de corrente, maiores e mais intensos; faixas azuis em redemoinho na carga; cúpula final dourada.
  - O custo continuou o mesmo (+39/+50/+46 chamadas de desenho) e não houve erros de shader.

## Mod 243 — ritmo e massa

Mudanças pedidas pelo criador depois de testar:

- **Herói: formação mais lenta, sem exagero.**
  - **X:** o cast foi de 0,45 para 0,75 s; a velocidade de voo continua 16 m/s.
  - **Esfera:** a mão fica erguida por 0,7 s, a concentração leva 0,9 s e o voo é de 13 m/s.
  - **Explosão:**
    - **Ritmo:** carga de 0,9 s e círculos de 0,9 s.
    - **Descida:** o feixe agora **desce do céu até o alvo** em 0,45 s antes da explosão.
    - **Explosão maior:** cúpula de ~10 m, anéis no ar de 13–19 m, dois impactos sakuga (tamanhos 6 e 4,2), brasas em esfera e onda de choque de 10 m.
- **Enemy2: os volumes não leem mais como fumaça.**
  - Corrente, funis e coluna usam um material sólido: textura rolando com torção, erosão alfa de corte duro e faixas de cor por limiar estreito.
  - Raios negros, com núcleo preto e halo magenta, saem da corrente do Vórtice, enrolam os furacões e correm pelas rachaduras do Colapso.
  - O Colapso forma mais devagar: fissura de 1,5 s, convergência de 1 s e erupção de 0,6 s. A Trindade sobe em 1,3 s.
- **Referências técnicas:**
  - Realtime VFX: tornado com malha e textura rolando, alfa nas pontas e erosão de borda;
  - Realtime VFX: raios em menos traços porém mais fortes, com bordas duras por `smoothstep`.

**Medido:**
- `node --test`: 264/264.
- **Custo extra:** X +39, Esfera +46, Explosão +46 chamadas de desenho.
- Sem erros de página nem de shader.

## Mod 245 — Enemy3 e mini-chefe do Ato III

- **`node --test`:** 290 aprovados. Inclui 15 testes novos do Enemy3 e 1 de integração.
- **Navegador (SwiftShader, 430×860 com toque):** sem erros de página/shader no laboratório `?testeEnemy3=1` (comum e mini-chefe) e no caminho real `startPack` com `demon3`/`miniboss3`.
- **Escurecimento da tempestade:** reversível. Medido: 1,55/2,10 → 0,90/0,95 → 1,55/2,10.
- **Chamadas de desenho:** com a mesma câmera, as magias somam de +1 a +6 chamadas.
- **Memória:** estável após 48 encontros (82 geometrias, 8 texturas, 39 programas). Isso só depois de corrigir o vazamento da textura de ossos dos clones.
- **Não testado:** Android físico, FPS real e áudio.
