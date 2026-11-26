# Mod 374 — abertura cinematográfica do carregamento: "A Marcha dos Pecados"

Registro permanente da FASE 1 da missão de 26/11/2026 (loading cinematográfico + auditoria de merges).

## O que o jogador vê
- Enquanto o mundo é baixado e montado, cinco **silhuetas** caminham na direção da câmera: **Ganância** no centro com as duas foices do arsenal real (Cósmica e Sanguínea), **VHAZRAEL** (Bispo 1, Lâmina do Trono) e **VORGAZHEK** (Bispo 2, Machado do Abismo) à esquerda, **ZAR'KHAEL** (Bispo 3, foice do carrasco) e **VÉRAXION** (Bispo 4, de mãos vazias) à direita. A formação é escalonada: profundidade, fase da passada e posição das armas são diferentes para cada personagem.
- Cada silhueta é sombra quase preta com **dois acentos**: o carmesim dos olhos, do sorriso e do sangue, e um recorte fino próprio (dourado, violeta, verde-abissal, osso e azul-lunar).
- **Olhos** (traços finos com núcleo e halo curto): X no Bispo 1; cruz latina no Bispo 2; X num olho e cruz no outro no Bispo 3; orbe pontiagudo com agulhas, casca girando e pulsação no Bispo 4; vórtice de filamentos espirais na Ganância. Todos estão presos ao osso `Head` e posicionados a partir de `headfront`.
- **Sorrisos individuais**: largura, curva, assimetria, espessura, número de dentes e irregularidade são diferentes por personagem. O lábio é um fio carmesim e o esmalte dos dentes recebe reflexo concentrado. O conceito parte da fenda curva de espaço negativo da Dimensão do Bispo 2 (`vorgazhek-ultimate3d.js`).
- **Sangue**: fios finos nascem entre os dentes e nos cantos, escorrem até o queixo e, ao fim de cada período, uma gota física se desprende, cai com gravidade e deixa uma mancha no chão. O sistema usa pool fixo de 40 gotas e 40 manchas.
- **Fundo em destruição, três atos de 12 s**:
  1. vila de Eldória em chamas (VilaKit, CasaEldoria LOD1, Ferreiro LOD1);
  2. arena e muralhas (Coliseu, TorreKit, estandartes, braseiros);
  3. vilarejo da neve (NeveKit: Estalagem, CasasNeve, Pinheiros, Guilhotina).

  As peças entram fora do quadro e recuam com o chão (travelling). Atrás da formação elas desabam (tombo + afundamento), com explosão em estágios: antecipação, clarão, bola de fogo turbulenta, estilhaços e fumaça. Cada ato tem chamas no telhado, fumaça, brasas e cinzas. As trocas acontecem atrás de uma parede de fumaça (névoa sobe e desce) e de um clarão.
- **Vinheta A** (~7,2 s): um passante adulto (NPC_Masculino, silhueta) cruza diante do VÉRAXION. O Bispo sai da esteira, investe e perfura o abdômen com o clipe nativo `Charged_Upward_Slash` de mãos vazias. O contato coincide com um clarão carmesim, poucas gotas e uma explosão ao fundo que recorta as silhuetas. O passante executa `falling_down`, fica para trás e o Bispo volta à formação sem olhar.
- **Vinheta B** (~19 s): outro passante cruza diante da Ganância. Ela executa um corte único (`Left_Slash`) com a Foice Sanguínea presa ao osso (empunhadura do jogo), com arco de fita carmesim e poeira de estrelas gravado da lâmina real.
  - O impacto vem de um clarão e de um corte de câmera lateral baixo (~1 s). O corpo cai; a cabeça aparece só como forma distante, um clone em que só o osso da cabeça mantém escala. Não há close anatômico.
  - Ao fim, a foice volta à marcha.
  - Nas duas vinhetas a mesma câmera aproxima e enquadra o agressor sem corte, e depois volta.
- **Barra inferior**:
  - O trilho é escuro e o preenchimento carmesim.
  - O protagonista canônico (`Prota_otimizado_2K.glb` → silhueta clara) corre em miniatura sobre a barra. A posição dele nunca passa do progresso real.
  - A versão aparece discreta no canto inferior direito ("MOD 374"), sem descrição nem changelog.
- **READY**:
  - Quando o mundo confirma prontidão (`#loading.hidden`), a barra vai a 100% e surge o convite "TOQUE NA TELA PARA ENTRAR".
  - A entrada **não é automática**: só um toque, clique, Enter ou espaço inicia a saída, uma única vez. A saída é um fade de 0,75 s e a cena é desmontada em seguida.
  - Toques antes do READY são ignorados.
  - Em erro não há convite: o diagnóstico e o botão "TENTAR NOVAMENTE" aparecem sobre o filme escurecido.

## Arquitetura
| Arquivo | Papel |
|---|---|
| `loading-cinematic3d.js` | cena inteira (elenco, armas, rostos, sangue, cenários, VFX, vinhetas, miniatura, desmontagem). Exporta `startLoadingCinematic`, `CAST`, `ACTS`, `VIGNETTES`, `CYCLE`. |
| `mundo-3d-prototype.html` | marcação/CSS do `#loading`, portão READY/entrada e disparo da cena **sem `await`** (nunca atrasa o loader). |
| `mod181-loader.js` | inalterado no essencial (warmModuleGraph, fetchText, retry, cache-busting, Blob import, diagnóstico). Única mudança: a barra pesa os módulos até 90% e nunca regride; os 10% finais vêm da prontidão real. |
| `assets/loading/*.glb` | silhuetas derivadas dos GLBs reais (sem texturas, malha simplificada e quantizada, só os clipes usados): 4,3 MB no total contra ~75 MB dos originais. |
| `tools/loading-cinematic/derive-silhouettes.mjs` | script reproduzível da derivação (glTF-Transform + meshoptimizer, ferramentas de desenvolvimento, sem dependência no jogo). |
| `tools/visual-lab/loading-cinematic-qa.html` | harness de QA: mesma cena sem o loader; `api.seek(t)`, `api.focus(id)`, `api.cam(pos, look)`, `api.stats()`. |
| `tests/loading-cinematico.test.mjs` | contrato da tela, do portão READY, da barra honesta, do elenco/armas, das silhuetas e da desmontagem. |

### Clipes usados (inventário real)
| Personagem | Arquivo de origem | Marcha | Vinheta |
|---|---|---|---|
| Ganância | NewGanancia1.glb | `Walking` (1,03 s) | `Left_Slash` 0,45–1,6 s, contato 0,87 s |
| VHAZRAEL | VHAZRAEL.glb | `Walking` | — |
| VORGAZHEK | NewBispo2_Otimizado.glb (corpo atual da campanha) | `Walking` | — |
| ZAR'KHAEL | NewBispo3.glb | `Walking` | — |
| VÉRAXION | NewBispo4.glb | `Walking` | `Charged_Upward_Slash` 0,35–1,55 s, contato 0,98 s |
| Passantes | NPC_Masculino_Animado_Otimizado_1K.glb (adulto) | `Walking` | `falling_down` |
| Miniatura | Prota_otimizado_2K.glb | `Running` | — |

**Esteira**: o avanço horizontal do quadril é removido de todos os clipes (o eixo Y é mantido). A velocidade nativa de cada `Walking` é medida e o `timeScale` de cada personagem iguala a passada à velocidade do chão, o que evita moonwalk e pés patinando. Nas vinhetas o agressor sai da esteira, é levado pelo chão e depois alcança a formação.

**Armas**: são os mesmos construtores procedurais do jogo (`buildCosmicScythe`, `buildBloodScythe`, `buildThroneBlade`, `buildAbyssAxe`, `buildExecutionerScythe`), importados pelas mesmas URLs que o grafo do mundo usa, o que os deixa no cache de módulos sem download extra. As armas recebem material de silhueta próprio. Na marcha, as foices ficam em pé ao lado do corpo e acompanham o balanço do braço; a lâmina e o machado pendem à frente. No golpe, a foice segue o osso com a empunhadura medida do jogo. O VÉRAXION nunca recebe arma.

**Gameplay intocado**: a cena não importa o runtime de combate nem baixa os GLBs completos. Todos os materiais são criados ali.

## Desempenho e robustez
- Medido no SwiftShader (CPU), em desktop 1365×768: 100–150 draw calls e 75–107 mil triângulos, sem mapa de sombras (sombras de contato falsas). Há 3 luzes globais. Explosões, estilhaços, gotas, brasas e cinzas usam pools fixos; não há alocação por quadro nas partículas.
- A resolução de render (DPR) fica em ≤1,5 no desktop, ≤1,25 no celular e 1 no celular fraco. O celular roda a 30 fps. A resolução cai sozinha se o FPS medido ficar abaixo de 22/34. A cena pausa com a aba oculta.
- Desmontagem: o loop, os observadores, os mixers, as geometrias, os materiais e o contexto WebGL (`forceContextLoss`) são liberados e o canvas é removido.
- `prefers-reduced-motion`: a cena fica parada (sem marcha nem câmera), renderizada a 2 fps.
- Sem WebGL, ou se a cena falhar, sobra o fundo em CSS com a barra e o portão funcionando (o portão não depende do 3D).
- Automação (`navigator.webdriver`): a cena não roda e a entrada é automática ao ficar pronto, para não travar os workflows existentes. `?loadingcine=1&loadinggate=1` testa os dois.

## Evidências (`docs/loading/evidencias/`)
- `marcha-36s.mp4`: ciclo completo de 36 s, 640×360 a 12 fps, renderizado quadro a quadro no harness. Mostra as três trocas de cenário e as duas vinhetas. É uma captura offline em passo fixo (SwiftShader), **não** gravação em tempo real nem medição de FPS.
- `desktop-*.jpg`, `retrato-360x800.jpg`, `paisagem-844x390.jpg`, `ready-390x844.jpg`, `rostos-closeup.jpg`, `erro-retry.jpg`.

### Testes executados
- `node --test tests/*.test.mjs *.test.mjs` com three.js real: todos passam.
- E2E no Chromium (SwiftShader) na página real `mundo-3d-prototype.html?loadingcine=1&loadinggate=1`:
  - o canvas aparece em ~0,6–1,8 s e o elenco fica pronto em ~0,6–3,5 s;
  - o progresso é monotônico (68–117 amostras) e o clique antes do READY é ignorado;
  - o READY chega com 100% e o convite visível, e a cena continua animando;
  - dois cliques produzem uma única entrada, e a cena é desmontada (canvas removido, `disposed`);
  - com o `mundo-3d-prototype.js` em 404, aparecem o diagnóstico e o retry e não há convite.

## Rubrica (autoavaliação honesta, pós-iterações)
| Critério | Pontos |
|---|---|
| Silhuetas e identidade dos cinco | 18/20 |
| Iluminação, olhos, dentes e gotas | 18/20 |
| Marcha, armas e coreografia | 13/15 |
| Cenários, destruição e transições | 13/15 |
| Vinhetas de NPC | 9/10 |
| Enquadramento, responsividade e legibilidade | 9/10 |
| Desempenho, loader e transição | 10/10 |
| **Total** | **90/100** |

Iterações feitas antes de chegar aqui:
1. Os recortes saturados foram afinados.
2. As armas foram reorientadas e reescaladas.
3. Os cenários deixaram de nascer na frente da câmera.
4. As chamas, antes retângulos genéricos, foram refeitas como línguas.
5. Olhos e sorrisos foram refeitos segundo o item 2A: traços finos, dentes individuais e sorrisos individuais com sangue escorrendo.
6. As vinhetas ganharam aproximação da mesma câmera e um clarão que recorta as silhuetas.
7. Os passantes deixaram de parecer manequim.

## Limitações reais
- QA visual em Chromium/SwiftShader (CPU). **Não houve medição em GPU Android física**: o FPS real em celular não foi medido.
- Os GLBs de silhueta são simplificados (malha ~12–20% dos triângulos originais). De perto, a geometria aparece facetada; no enquadramento da abertura a silhueta preserva a forma.
- O Coliseu e a Torre leem como massas escuras. A "catedral/muralhas" é representada pela arena e pela torre do próprio jogo, sem novos assets.
- Depois do toque, o jogo ainda mostra a própria tela inicial ("Galáxia 1 · TOQUE PARA COMEÇAR") ou o menu de galáxias, que já existiam e continuam sendo do jogo.
- As referências de pesquisa do briefing guiaram as decisões (luz de recorte em low-key, pools fixos, render sob demanda/DPR, crossfade sem bloquear). Não houve leitura integral de cada link durante a execução.
