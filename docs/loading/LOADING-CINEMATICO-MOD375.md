# Mod 375 — abertura depois dos planetas: a Marcha refinada e o Campo da Última Guerra

Registro permanente da missão MOD 375 (26/11/2026). Substitui as partes do [Mod 374](LOADING-CINEMATICO-MOD374.md) que
mudaram: rostos com sorriso/sangue, as duas vinhetas antigas e a abertura no boot foram **removidos**.

## 1. Fluxo em etapas (sem temporizador)

`game-flow.js` define `STEPS = ['boot', 'planets', 'cinematic', 'world']`:

| etapa | o que aparece | quem avança |
|---|---|---|
| `boot` | `#loading` discreto, com o progresso REAL do grafo de módulos (`mod181-loader.js`, até 90 %) | o mundo chama `__sinsFlow.planets()` ao montar a tela |
| `planets` | o portão do primeiro acesso ou a tela das galáxias (o que já existia). A abertura é pré-carregada em segundo plano | o jogador toca em COMEÇAR/ENTRAR → `flow.enter(continuaçãoOriginal, prontidãoExtra)` |
| `cinematic` | `#cine`: a abertura 3D + a barra com o que falta do mundo (texturas na GPU e shaders, medidos) | `flow.worldReady()` (mundo pronto de verdade) + prontidão extra (céu do prólogo) → convite; só um toque/clique/Enter/espaço entra, uma vez |
| `world` | a continuação ORIGINAL roda dentro do gesto (áudio destrava, prólogo ou despertar) | — |

- O gesto que abriu a etapa (pointerdown no planeta) não entra: a entrada exige `pointerdown` **dentro** da abertura já
  pronta (`arm`) seguido do `pointerup` (`go`).
- Uma futura tela de login entra como nova etapa antes de `planets`; a abertura continua presa à transição planets → world.
- Automação (`navigator.webdriver`) mantém o fluxo clássico, a menos que a URL peça `?loadingcine=1`; `?loadinggate=1`
  impede a entrada automática. Erro de módulo continua no cartão de erro/retry do boot.

## 2. Prontidão real e o "congelamento em 90–100 %"

Causa medida (perfil de CPU, Chromium + SwiftShader, 412×915): o mundo se dizia pronto e o PRIMEIRO desenho real fazia
`texSubImage2D` de ~60 texturas 2K (~6 s) e o primeiro uso de dezenas de programas (`onFirstUse`, ~2,3 s), além de uma
compilação síncrona duplicada da cena inteira. Correção (`mundo-3d-prototype.js` `finishWorldPrep`):

1. **texturas** enviadas à GPU com `renderer.initTexture` em fatias de ~8 ms, cedendo a vez entre fatias; GLBs que chegam
   durante o envio entram em passagens extras (só o que ainda não está na GPU);
2. **shaders**: `precompileWorld()` (compileAsync, sem a compilação síncrona duplicada);
3. **aquecimento** `warmJourneyPrograms()` fatiado em ~45 grupos de objetos, desenho de 1 px por grupo (buffers e
   uniformes do primeiro uso), cedendo a vez entre grupos; um desenho completo final confirma;
4. só então `flow.worldReady()` — 100 % e o convite.

Sem o fluxo em etapas (automação, `?noloadingcine`), o `#loading` some no tempo clássico (~5,5 s no SwiftShader) e a
mesma preparação fatiada segue por trás, sem as tarefas longas de 8,65 s do Mod 374 (maior: ~1 s).

| medida (SwiftShader, 412×915, sem throttle) | Mod 374 (main) | Mod 375 |
|---|---|---|
| "pronto" | 10,2 s | 26,0 s (real: texturas + shaders + aquecimento) |
| tarefas longas DEPOIS do pronto | 8,65 s + 3,16 s (os primeiros quadros do jogo travavam) | 3,7 s no primeiro quadro (ver abaixo) e nada depois |
| maior tarefa longa durante a preparação | — | ~0,94 s (uma textura 2K ou um programa) |

A tarefa de ~3,7 s no primeiro quadro real é trabalho do **processo de GPU** (`CommandBuffer::Flush`, trace do Chrome):
a rasterização por software do SwiftShader do primeiro quadro em resolução cheia; já existia (3,16 s) no Mod 374.
Não há medição em Android físico nesta missão. Com a abertura e o mundo dividindo a CPU no SwiftShader, a abertura
avança pouco enquanto o mundo prepara (fps baixíssimo no emulador); em GPU real o envio de texturas não passa pela CPU.

## 3. A Marcha (21 s, três atos de 7 s)

- **Ritmo**: `MARCH_SPEED = 0,72 m/s`; chão, cenários (deslocamento integrado do chão) e passada usam o mesmo fator
  (`timeScale = velocidade ÷ velocidade nativa medida do clipe`), com pequenas diferenças de cadência por personagem.
  Formação mais espaçada (Ganância 0/0; VHAZRAEL −1,9/−0,9; VORGAZHEK −3,7/−2,0; ZAR'KHAEL 1,9/−0,85; VÉRAXION 3,6/−1,9).
  Retrato mostra o trio central inteiro e corta as pontas na borda (silhuetas legíveis em vez de miniaturas).
- **Rostos**: só olhos (`loading-kit3d.js` `EYES`), finos, halo curto, baixa intensidade:
  Ganância — duas fendas curtas assimétricas; VHAZRAEL — um único olho carmesim concentrado (o outro apagado);
  VORGAZHEK — uma fissura estreita e fraca; ZAR'KHAEL — dois núcleos pequenos com pulso sutil; VÉRAXION — olhos escuros.
  Sorrisos, dentes, lábios, fios e gotas de sangue, manchas, o arco de corte e o orbe espinhoso foram removidos do código.
- **Armas** (as do jogo em silhueta; acentos foscos, FX de energia ocultos; escala pela extensão do cabo), carregadas por
  **IK de dois ossos** (`twoBoneIK`) com a empunhadura medida no jogo:
  - Ganância, mão esquerda: Foice Sanguínea **arrastada**, ponta rente ao chão (inclinação do cabo resolvida por bisseção
    a cada quadro), sulco incandescente + centelhas curtas só enquanto anda (`createScrape`);
  - Ganância, mão direita: Foice Cósmica **atrás do pescoço, sobre os ombros**, lâmina para cima sobre o ombro oposto;
  - ZAR'KHAEL: foice **no ombro**, cabeça atrás e acima, **lâmina para baixo** e para fora;
  - VORGAZHEK: machado pesado **atravessado no peito**, duas mãos (direita baixa no cabo, esquerda sob a cabeça);
  - VHAZRAEL: lâmina do trono pendendo da mão (empunhadura calibrada do jogo, balança com o braço).
- **Luz**: contraluz de fogo + lua pálida por trás, quase nada pela frente (rostos nunca iluminados).
- **Lua**: o MESMO `Lua.glb?v=mod181-moon` do mundo (sem segundo sistema de céu), pálida, distante, com nuvens passando.
- **Explosões em camadas** (`loading-fx3d.js` `createExplosions`): núcleo branco-dourado curto → massas de fogo
  turbulentas e alongadas (bordas erodidas, calor que esfria) → filamentos finos direcionais → volumes secundários →
  fumaça escura → brasas. Um draw call por camada para todas as explosões; pico limitado com `prefers-reduced-motion`.
- **Ameaça implícita** (substitui as duas vinhetas): um adulto ajoelhado e trêmulo ao lado do caminho; a formação inteira
  desacelera e para; atrás dele, contra a luz, fumaça baixa cobre o instante, um acento carmesim breve e os olhos da
  Ganância acendem; quando a fumaça passa, o vulto cai inteiro; a formação retoma sem olhar para trás.

## 4. Campo da Última Guerra (53 s) — `loading-battle3d.js`

Um pano rasgado atravessa a lente (com escurecimento breve) e revela o campo: céu vermelho com nuvens pesadas, lua pálida,
névoa vermelha baixa e distante, terra escura, montes, bandeiras rasgadas (onda no vértice), árvores mortas, espadas
fincadas, escudos partidos, elmos, poucos ossos discretos e a **espada monumental** no horizonte (tudo InstancedMesh /
malhas únicas). Linha do tempo (s):

| trecho | conteúdo | VFX original |
|---|---|---|
| 0–3,2 | revelação: os cinco de costas encarando o campo e a horda distante | — |
| 3,2–12,4 | VHAZRAEL cercado por seis: giro, combo curto, e o fim pelo próprio selo | `makeJudgmentSeal` |
| 12,4–24,2 | VORGAZHEK pressionado; o Juízo da Espada Cósmica comprimido (8 s), câmera da própria ultimate | `createCosmicUlt` + `createCosmicUltVFX` + `buildCosmicSword` |
| 24,2–34,6 | ZAR'KHAEL em combate circular, pausa intencional, Seis Selos (5,3 s); termina sereno | `createZarkhaelSixSeals` + `createSixSealsVFX` |
| 34,6–45 | Ganância agressiva; fase II (asas por ossos) sobe ~4 m; inimigos saltam; câmera lenta de UM tempo; liberação | `createCorona` (preparação → concentração → liberação; consequência com fumaça/brasas) |
| 45–53 | os quatro Bispos no chão, a Ganância acima; "A Batalha Contra os 7 Pecados Capitais" nasce de partículas | `createTitle` |

- Só VHAZRAEL, VORGAZHEK e ZAR'KHAEL lutam sozinhos; VÉRAXION aparece no grupo final.
- Homenagem à intenção de um poder absoluto contido, sem copiar enquadramento, falas, música, coreografia ou efeitos de
  outra obra: a coroa, as cores e a escala são as da Ganância do jogo.
- Sem violência gráfica: derrotas = tranco, queda inteira e **dissolve** em brasas pela borda (shader da silhueta).
- **NPCs**: pool fixo de 10 clones da silhueta adulta (`NPC_Masculino_Animado_Otimizado_1K` — o "NPC.jbl" do briefing
  não existe no repositório; o GLB adulto animado é este), alturas variadas, três famílias de recorte de baixa intensidade,
  espada/lança/sem arma, líderes maiores com chifres; reforços entram nos cortes ou de dentro da névoa.
- Ao terminar, o pano atravessa a lente de novo e a marcha recomeça (a entrada continua dependendo só do READY + toque).
- Tudo da batalha é **pré-compilado** (compileAsync com visibilidade forçada só dentro da chamada) e aquecido por grupos em
  1 px antes do primeiro quadro dela.

### Silhuetas e clipes (derive-silhouettes.mjs)
Clipes reais de combate foram acrescentados às silhuetas (sem texturas; malha simplificada; meshopt). Nova
`ganancia2-silhueta.glb` (fase II: `Dive_Down_and_Land_2`, `Arise` → `GK_cast`, asas 100 % procedurais como em
`greed-boss3d.js`). Total do elenco + NPC + fase II ≈ 5,1 MB.

### Orçamento medido (SwiftShader 1365×768, `api.stats()`)
Marcha ~129 draw calls / ~172 k triângulos (cenários reais em silhueta); batalha ~73 draw calls / ~153 k triângulos com
até 10 NPCs ativos (telemetria `battle.stats().npcsActive/npcsMax`). Explosões: até 6 simultâneas em 5 draw calls.
Pools fixos (explosões, arcos, sulco, centelhas, brasas, NPCs); 30 fps no celular; DPR limitado e reduzido se o fps cair.

## 5. PRs dos agentes (revisadas em 26/11/2026)
Nenhuma foi mesclada ou portada nesta missão: todas estão em Draft e os próprios agentes registram o QA visual do HEAD
atual como pendente.
- **#714 A1** (câmera do abrigo da Mata): checks verdes, mas o autor reprova o gate visual (protagonista pequeno demais
  ou parcialmente atrás do pilar). Mantida em Draft.
- **#712 A2** (Passagem do Julgamento): QA do HEAD `1e6f8c0` na fila; gate de 16 marcas legíveis pendente.
- **#711 A4** (aurora no perfil baixo): validação temporal do HEAD pendente (harness de vídeo corrigido).
- **#709 A3** (cipós/sub-bosque): QA do HEAD `71f0ec8` pendente; base ainda Mod 372/373 — não aceitar build antiga.
- **#691 A5** (câmera narrativa de Téo): QA do HEAD em andamento; compartilha `mundo-3d-prototype.js` com #714
  (trechos diferentes); proposta narrativa 0.2 não canônica.
Nenhuma toca os arquivos da abertura; a #691/#714 tocam `mundo-3d-prototype.js` em trechos distintos dos alterados aqui.

## 6. Testes e QA
- `tests/loading-cinematico.test.mjs` (16 testes): etapas, comportamento do fluxo com DOM mínimo (toque antes do READY,
  gesto de abertura, entrada única, prontidão extra, automação), prontidão real, ausência de sorriso/sangue, assinaturas
  dos olhos, poses de armas, marcha sem moonwalk, ameaça implícita, batalha (duração, segmentos, VFX originais), NPCs,
  explosões, silhuetas e lua. Suíte ampla: 1409/1409.
- E2E (Chromium + SwiftShader, `?loadingcine=1&loadinggate=1`): portão do primeiro acesso em 412×915 (toque) e galáxias
  em 1365×768 (clique): planetas → abertura → toque antecipado ignorado → READY → toque → mundo (prólogo do céu / Eldória),
  cena descartada e canvas removido.
- Harness: `tools/visual-lab/loading-cinematic-qa.html` (`?t=` marcha, `?b=` batalha, `?hud=1`).
- Limitações: nada medido em Android físico; números de tempo são do SwiftShader (CPU). `prefers-reduced-motion` mostra
  um quadro parado da marcha (sem movimento nem clarões); sem WebGL a abertura não monta e o convite continua funcionando.

## 7. Evidências (`docs/loading/evidencias/`)
- `abertura-375-640x360.mp4`: 76 s (marcha + Campo da Última Guerra), 640×360 a 10 fps, renderizado quadro a quadro em
  passo fixo no harness (Chromium/SwiftShader) — mostra a composição, não o fps real.
- `375-marcha-paisagem.jpg` (marcha e ameaça implícita), `375-campo-paisagem.jpg` (os dez momentos do campo),
  `375-retrato-390x844.jpg` (retrato).
