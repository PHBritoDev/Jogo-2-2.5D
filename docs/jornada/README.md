# Jornada Eldória → Cinzária (Mod 321)

Registro permanente da missão de 15/11/2026. O briefing temporário foi removido na mesma PR.

Eldória (Cidade 1) não foi tocada. A antiga Cidade 2, que ficava a 150 m de Eldória, foi substituída por uma
jornada contínua e caminhável até a nova Cinzária e o vulcão. A antiga Cidade 2 tinha:

- o Distrito da Ferrugem;
- o beco dos bandidos;
- a mina e o canal;
- o altar do selo e os livros-caixa;
- um cone de 50 m.

## Arquivos

| arquivo | papel |
|---|---|
| `jornada3d.js` | Regras puras, testadas sem navegador. Define o percurso, o relevo, os limites caminháveis, o abismo, o tabuleiro da ponte, o cone do vulcão, o layout modular da cidade, as rotas dos moradores, os pontos de TP e os checkpoints, os POIs e as áreas reservadas. |
| `jornada-world3d.js` | Parte visual. Terreno em blocos com LOD e streaming, vegetação instanciada, rio e cachoeira, ponte, névoa do abismo, vulcão, entrada da caverna, Cinzária e aurora. Também guarda os sólidos simples. |
| `mundo-3d-prototype.js` | Recebe só integrações pontuais (detalhadas na seção seguinte). |
| `act2-flow.js` | Coordenadas do Ato II apontando para a nova cidade e para o sopé, mais a migração `migrateAct2Step`. |
| `map3d.js` | Limites novos, POIs e abrigos da jornada, alias `distrito → cinzaria` e conversão da névoa v3 (`migrateLegacyFog`). |

Integrações em `mundo-3d-prototype.js`:

- invólucro de `terrain3D.height`, `boundaryDistance` e `waterDepth` a oeste de x = −112, com mistura entre −112 e −150 para a saída ficar orgânica;
- recorte `JOURNEY_HOLES` na malha antiga;
- tabuleiro da ponte em `terrainHeightAt`;
- sólidos em `blockedAt`;
- `updateJourney`, que cuida da queda, dos checkpoints e do streaming;
- `journeyTeleport` e o painel ADM.

## Percurso (≈ 1,3 km de caminho medido pela polilinha `ROUTE`)

1. **Saída de Eldória**: a Garganta (x ≈ −70) continua como portão do Ato II. A estrada desce para o vale sem degrau.
2. **Vale do Entardecer** (x −112 … −620):
   - capim alto com vento no shader e flores agrupadas;
   - bosques naturais (nunca em grade) e pedras;
   - um rio raso de até 0,7 m, que se atravessa a pé, nascendo numa cachoeira na serra norte;
   - montanhas por relevo *ridged*.
3. **Subida da Serra** (x −620 … −806): estrada em zigue-zague até cerca de 62 m de altitude. O Mirante (x −748) mostra o vulcão ao longe.
4. **Ponte do Abismo** (x −806 … −930):
   - 124 m de tábuas, postes e cordas, com âncoras de pedra nas duas pontas firmes;
   - abaixo dela só existe névoa (dois planos com ruído, sem sprites), sobre um chão a −320 m.
5. **Terras de Cinza** (x −930 … −1205):
   - a grama dá lugar, aos poucos, à cinza e ao basalto, com rochas escuras;
   - o vulcão cresce de silhueta a marco monumental.
6. **Cinzária** (centro −1262, −66):
   - **Estrutura**: anéis de casas modulares formando a praça e os bairros mercado, oficinas e alto. A rua principal leste–oeste e as radiais norte–sul ficam livres.
   - **Casas**: embasamento de pedra vulcânica escura, reboco claro, esteios de madeira e telhado de telhas.
   - **Praça**: fonte, bancas, lanternas, torre do sino e caixotes.
   - **Moradores**: o sistema de moradores existente percorre as `CITY_ROUTES2`.
7. **Sopé do vulcão**:
   - **Cone**: cerca de 290 m acima da cidade, com cratera legível, ravinas incandescentes discretas e fumaça limitada a 8–16 sprites.
   - **Portal de basalto** (−1327, −66): os **2 guardas Enemy2** do Ato II ficam nele. A caverna é o interior já existente (`volcano3d.js`); nada da dimensão de VORGAZHEK foi refeito.

## Céu, noite e aurora

O ciclo de dia e noite é o global do jogo, salvo junto com o horário e o clima. Na jornada inteira, inclusive na cidade
vulcânica, a noite ganha:

- uma aurora azul-violeta: uma faixa de shader, um único draw;
- as estrelas e a lua já existentes;
- janelas e lanternas que acendem.

## Física e sólidos

- **Chão**: vem sempre da mesma função de relevo, que também gera a malha.
- **Bloqueios**: encostas além de 7 m da borda caminhável, o cone do vulcão e os corrimãos (para quem anda no tabuleiro).
- **Sólidos simples**: casas (retângulo girado), fonte, bancas, torre, postes, árvores, rochas grandes, pilares da ponte e portal. Ficam numa grade espacial de 16 m.
- **Sem colisão**: capim e flores.
- **Queda real**: quem pula o corrimão, ou sai pela borda da rocha, cai com a gravidade normal. A 38 m abaixo do tabuleiro, morre e volta ao último checkpoint pisado: vale, serra, ponte leste, ponte oeste, cinzas ou Cinzária. Quem está abaixo do tabuleiro nunca é puxado de volta para cima.

## Desempenho

- **Blocos finos** (64 m, célula 2 m, saia contra frestas): até cerca de 150 m do herói.
- **Blocos grossos** (256 m, célula 8 m): até cerca de 560 m. Escondem as células já cobertas pelos finos.
- **Construção e descarte**: no máximo 1 bloco fino e 1 grosso por quadro; descarte (`geometry.dispose`) ao se afastar.
- **Instâncias**: capim, flores, árvores e rochas usam um `InstancedMesh` cada, repovoado só quando o herói anda cerca de 30 m.
- **Vulcão**: malha própria, sem névoa, com bruma calculada no shader para ser visto de muito longe.
- **Luzes**: nenhuma `PointLight` nova; brilho emissivo e sprites aditivos.

FPS: os números da CI e do SwiftShader não equivalem a um Android real e não foram medidos em aparelho.

## Ato II provisório e saves

A narrativa nova do Ato II será escrita depois.

- **Removido**: as cenas do beco e do Desconhecido, que dependiam da cidade antiga.
- **Fluxo provisório**:
  1. passo 9: chegar a Cinzária, com o título e a fala de chegada;
  2. passo 11: os dois guardas;
  3. passos 12–14: o interior do vulcão, que não mudou.
- **Migração**: saves parados no passo 10 vão para o 11 (`migrateAct2Step`), sem recompensa duplicada.
- **Depois de VORGAZHEK**: a sequência existente (VÉRAXION, abismo, bilhete) acontece agora sobre a nova praça.
- **Mapa**: o salvamento passa para a v4. A névoa da v3 é convertida célula a célula. O POI `distrito` vira `cinzaria`, e Mina e Canal deixam de existir.

## Painel ADM (somente `?adm=1`)

O painel tem os botões **TP Cidade 1 — Eldória** e **TP Cidade 2 — Cinzária**, e também existe
`SevenSinsDebug3D.tpCity(1|2)` no modo debug.

- **Não é autorização segura**: um site estático não valida privilégios.
- **Não altera nada**: progresso, itens, inimigos e saves continuam como estavam.
- **Quando recusa**: em dimensões, áreas internas, cenas e combates.
- **Antes de posicionar**: carrega os blocos do destino e zera queda e velocidade.

## Áreas reservadas para histórias futuras (sem conteúdo canônico)

`RESERVED_SITES` em `jornada3d.js`:

- ruína baixa no vale;
- círculo de pedras;
- abrigo de rocha no mirante;
- forja abandonada nas cinzas;
- ossada petrificada.

## QA no jogo real (Playwright + SwiftShader, `?debug3d=1&adm=1`)

Capturas em `docs/jornada/evidencias/` (01–14) e resultados brutos em `evidencias/qa-jornada.json`.

| verificação | resultado |
|---|---|
| Caminhada em 8 trechos (saída de Eldória, vale, rio, subida, ponte, cinzas, rua da cidade, portão) | todos andam, sempre no chão, sem bloqueio indevido, HP intacto |
| Paredes das casas (3 casas, andando contra o centro) | param à meia-profundidade + 0,2 m |
| Corrimão da ponte | para em z −48,67, ainda no tabuleiro |
| Pulo no abismo | queda real (y 60 → −94), morte, volta ao checkpoint (−797, −50) com HP cheio |
| TP Eldória ↔ Cinzária (4 vezes) | posições seguras no chão; painel só com `?adm=1` |
| Passo 11 no sopé | 2 Enemy2 (`demon2`) surgem nos postos do portal após a cena e atacam juntos |

Correções achadas no QA: comentário de linha que engolia o retorno em `updateCityFolk` (erro
`cityFolk is not iterable` que parava o resto do quadro), gatilho dos guardas ampliado de 14 m para 20 m
(antes o jogador só chegava ao raio já entre os guardas), painel ADM abaixo do botão PULAR.

Testes: `node --test` geral com 830 aprovados; as falhas restantes já existem na `main` ou dependem do
ambiente (build-info, Mod 305 ×2, Mod 262, Mod 278, `dist-public` não gerado, `sharp` ausente no visual-lab).

## Mod 323 — revisão artística, física e de desempenho (16/11/2026)

Briefing temporário removido nesta PR. As capturas de antes e depois, nos mesmos lugares e ângulos, estão em
`evidencias/mod323/`: cada par mostra a `main` antes desta PR à esquerda e esta PR à direita. Foram feitas no jogo
real, com Playwright e SwiftShader a 960×540.

### Vulcão (marco A)

**Antes**:
- **Forma**: cone pontiagudo.
- **Lava**: 11 listras radiais iguais.
- **Malha**: a malha própria acabava antes do lóbulo, então a borda flutuava.
- **Ravinas**: o ruído angular tinha uma costura em ±π, o que gerava triângulos-espinho.
- **Névoa**: apagava a base.

**Agora** (`volcanoHeight`):

| parte | como é |
|---|---|
| Perfil | Estratovulcão côncavo, com cume truncado |
| Cratera | 60 m, em tigela, com borda irregular e o lado noroeste rebaixado |
| Ravinas | Ruído amostrado num círculo: sem costura, salto angular abaixo de 1,6 m (teste) |
| Malha | Vai até 1,15 R, e o chão afunda alguns decímetros por baixo (sem degrau nem disputa de profundidade) |
| Lava | 2 canais estreitos e irregulares desenhados no shader, e um lago de lava na cratera |
| Névoa | A mesma do mundo, atenuada só no alto |

O sopé sobe suave até o portal (cerca de 4,5 m acima da praça). Um anel de basalto marca o limite do cone, que
não se escala.

### Céu global (coordenado com A4 em #519; nenhuma paleta, luz ou névoa global foi alterada)

- **`ceu-atmosfera3d.js`**: é uma única esfera que acompanha a câmera, sempre atrás de toda a geometria. Faz duas
  coisas:
  - o halo do sol baixo e a faixa laranja/rosa no horizonte do lado do sol;
  - a **aurora no céu de verdade**: cortinas rosa, violeta e azuis com a base entre 15° e 20° de elevação, numa faixa
    de azimute de cerca de ±60°. Entra aos poucos depois do crepúsculo e se apaga com nuvens e chuva.
- **Aurora antiga**: o cilindro de 560 m em volta do jogador, que formava um anel no horizonte e ficava atrás das
  serras, foi removido.
- **`eldoria-weather3d.js`**: na hora dourada, as nuvens ganham bordas laranja/rosa e sombra lilás. A cobertura
  mínima é de 0,36, apenas visual: não muda a chuva.

### Vale (marco B)

- **Capim**:
  - manchas altas e baixas, verdes e douradas;
  - lâminas de tamanhos variados, com espigas e luz que atravessa (com o sol baixo, antes ficavam pretas);
  - flores em canteiros de 8 cores.
- **Árvores**: as espécies do acervo (`EldoriaArvoresTropicais.glb`, copa larga e figueira, com LOD e impostor) em
  bosques, árvores solitárias e mata nas fraldas das serras.
- **Encostas**: mata baixa e rocha fria com estratos (antes, bege chapado).
- **Bordas do mapa**: as serras baixam perto delas. Antes eram cortadas a pique e viravam "paredes" planas no
  horizonte.
- **Névoa**: com perspectiva aérea por altitude, os cumes ficam legíveis.
- **Cachoeira**: tem lábio de pedra, cortina afastada da encosta, espuma e névoa. Cai num **poço raso de 0,7 m**
  (caminhável), com pedras na borda, que alimenta o rio.

### Ponte e abismo (marco C)

- **Ponte**:
  - ponte pênsil com torres de madeira, cabos em catenária e pendurais;
  - longarinas sob as tábuas, com tábuas de tons variados;
  - encontros de pedra aparelhada nas cabeceiras;
  - pedras margeando a subida.
- **Paredões**: faces de rocha com relevo, estratos, veios úmidos e musgo. Antes, a face do abismo era um painel
  liso de triângulos com centenas de metros.
- **Névoa**: 5 camadas. A de baixo é opaca, então **o fundo nunca aparece**.
- **Quedas d'água**: 3 delas caem das paredes e somem na névoa.
- **Vista**: a jornada usa plano de corte de 1,5 km e névoa recuada, então o vulcão aparece da ponte.

### Terras de cinza, Cinzária e moradores (marco D)

- **Terras de cinza**: cinza mais escura, línguas de basalto, ondulações, fendas escuras (algumas com brilho de
  magma), respiradouros de vapor e rochas claras o bastante para ler a forma.
- **Cinzária**:
  - **Lotes**: recuos e larguras irregulares, lotes vagos e casas de 1 a 3 pavimentos.
  - **Tipos de casa**: de reboco com andar em balanço, de pedra, oficinas e armazéns de tábua.
  - **Prédios marcantes**: a **estalagem** de 3 pavimentos, com placa, e a **ferraria** com forja acesa e bigorna.
  - **Telhados**: 5 cores e inclinações variadas, com cumeeira.
  - **Fachadas**: venezianas coloridas e chaminés.
  - **Chão e cantos**: calçamento de pedra irregular, barris, caixotes e canteiros encostados nas casas.
- **Moradores**: os NPCs Meshy do autor (`NPC_Masculino_Animado_Otimizado_1K.glb` e `MulherNpc-otimizado.glb`, com
  cabelo encaixado) e a vida de `eldoria-npc-life.js` (andar no passo do clipe, parar, olhar para o herói).
  - Antes eram clones do `Npc-lod2.glb`, que continua no repositório para outros sistemas.
  - Antes só existiam durante o Ato II. Agora a cidade é habitada em qualquer etapa.
  - Nascem um por vez e não animam a mais de 70 m do herói.
- **Câmera**: o braço da câmera não entra nos prédios. Antes, enquadrava o vão de telhados e paredes, que aparecia
  preto.

### Física

- **Pedras da jornada**: são domos (`eldoria-rock-collider.js`). A pedra baixa sobe andando: no QA, o herói passou
  por cima de duas pedras de 0,46–0,50 m. A pedra média ou alta bloqueia quem anda.
- **Sólidos com topo**: os da cidade e do sopé deixam passar por cima quem já está acima deles.

### Desempenho (SwiftShader x86; **o FPS em Android real não foi medido**)

**Travada ao andar.** A cada 30 m, o repovoamento recalculava cerca de 15 mil vezes a função de relevo num único
quadro, o que custava cerca de 205 ms de CPU em Node x86. Agora:
- o capim e as flores são calculados uma vez por bloco, com grades 9×9 interpoladas para limite, estrada e rio;
- repovoar só copia arrays (0,05 ms);
- blocos e vegetação são montados em fatias com orçamento de 3–5 ms por quadro.

**CPU por quadro** (`combatStep` sem desenho, teleporte a cada 4 m pelo vale, 572 quadros):

| | p50 | p95 | p99 | máx | quadros > 50 ms |
|---|---|---|---|---|---|
| `main` | 8,6 ms | 73,9 ms | 99,5 ms | 154,9 ms | 39 |
| Mod 323 | 8,9 ms | 15,7 ms | 19,6 ms | 21,9 ms | 0 |

**Draw calls e triângulos** (loop real, 800×450):

| lugar | `main` | Mod 323 |
|---|---|---|
| vale | 54 / 326 mil | 54 / 345 mil |
| ponte | 95 / 286 mil | 82 / 369 mil |
| cidade | 115 / 196 mil | 100 / 272 mil |

Medidas para não deixar os números subirem:
- grupos com LOD por distância (ponte, abismo, cachoeira, cidade e vapor);
- postes, lanternas e bancas instanciados;
- brilho das lanternas num único `Points`.

### Limitações conhecidas

- O FPS e a memória em aparelho físico (Galaxy A55) não foram medidos: os números acima são do SwiftShader.
- O pulo sobre a pedra média não foi exercitado pelo debug (a ação de pulo não dispara no passo sintético). A regra
  de domo é a mesma das rochas de Eldória, já testada.
- O interior da caverna do vulcão (`volcano3d.js`) não foi reconstruído. A entrada e os 2 Enemy2 continuam ligados
  ao fluxo do Ato II.
- **Cinzária**: as casas são um kit procedural, não GLBs autorais. Não há crianças, porque a narrativa da cidade
  ainda não foi escrita.

## Mod 325 — auditoria de costuras, água, vulcão e aurora (16/11/2026)

**Costuras / linhas brancas.** Causa medida com o modo de auditoria (`SevenSinsDebug3D.seamMode(true)`: fundo magenta, céu/névoa/nuvens/árvores ocultos, pixels magenta cercados de chão = fresta): (1) na divisa Eldória→vale (x≈−118) a malha antiga em `terrainLowSpec` tem célula de 2,5 m e terminava antes da malha da jornada, deixando até ~1 m de céu; (2) os ladrilhos distantes (256 m/8 m) não tinham saia; (3) a cor da jornada era gravada em sRGB num atributo que o r160 trata como linear (faixa clara na emenda). Correções: faixa `jornada-costura-leste` (10 m, mesma função de relevo, 5 cm abaixo), saias também nos ladrilhos distantes e preservadas no `maskFar`, `lin()` em todas as cores de vértice, saia de 10 m na base do cone. Evidência `costura-magenta-*`: banda magenta eliminada.

**Água.** Laje turquesa opaca trocada por água translúcida (opacidade .58) + anel de espuma nas pernas (`jornada-espuma-pernas`) quando a lâmina passa de 12 cm. Cachoeira do vale: cortina em duas camadas (`curtainMat`/`makeCurtain`), largura variável, abaulada, véus laterais, espuma no poço. Quedas do abismo: arco de queda livre a partir da borda, largas (`ABYSS_FALLS` 16–40 m), lábio de rocha, névoa de gotículas, somem na névoa. Pedras: apoiadas no ponto mais baixo da pegada (sem flutuar).

**Vulcão.** Causa do "buraco" no flanco (presente na main): os triângulos do cone apontavam para dentro, então a face da frente era descartada e via-se o avesso da encosta de trás com a cratera emissiva atravessando ("mancha laranja"). Winding corrigido (cone e saia), brilho emissivo da cratera removido (a luz vem do lago de lava e da base da pluma). Malha mais densa (288×84), basalto mais claro com cinza, afloramentos meio enterrados com a mesma bruma do cone, pluma em nuvem "couve-flor" iluminada por baixo, lâminas de basalto e poças de lava com crosta no entorno (fora das ruas). Topo segue bloqueado; cidade, portal, 2 Enemy2 e caverna intactos.

**Aurora.** Dois arcos em oval inclinado que atravessam o céu (visíveis em quase todos os rumos, mais fortes de um lado), dobras que correm, raios finos, respiração lenta; tinge levemente hemisfério e névoa (`AUR_TINT_*`, até 22%).

**QA (SwiftShader, 960×540).** Percurso Eldória→vale→ponte→cinzas→Cinzária→portão sem travar; queda no abismo e retorno ao checkpoint com HP cheio; step-up em pedra baixa; 11 NPCs Meshy andando; 2 guardas Enemy2; sem erros de página. Perf (mesmo roteiro, 572 quadros): main p50 7,9 / p95 13,9 / p99 14,7 / máx 21,1 ms → Mod 325 p50 7,6 / p95 13,8 / p99 16,0 / máx 19,7 ms; draw calls +0–13, triângulos +9–14%. Evidências em `evidencias/mod325/` (antes à esquerda, depois à direita).

**Limitações.** FPS em Android real não medido (SwiftShader ≠ GPU móvel). O paredão de fronteira do mundo antigo (Mod 311) segue facetado visto do início do vale (fora do escopo da jornada). Encosta leste do vulcão fica muito escura no fim da tarde (contraluz real).

## Mod 326 — fluidos de jogo, terreno sem fendas, aurora zenital e caça às travadas (17/11/2026)

**Versão.** O marcador "324" nas capturas do criador era a build servida pelo cache/deploy: a `main` já tinha `build-info.js` com `MOD = 325` (commit de integração às 17:13 de 16/11, depois do merge da Mod 325). O código das fotos é o da Mod 325 (cortinas, poças circulares, fendas em caixa). `build-info.js` não foi tocado (área do integrador).

**Fendas pretas/brancas e paredão (causas medidas em low-spec/celular, `pointer: coarse`).**
1. *Paredão preto facetado no vale*: maciços `MontanhaEldoria01` da muralha da Mod 311 eram posicionados "para dentro da rocha" a partir de `FRONTIER_LINE` e caíam dentro do vale da jornada. `buildFrontier` ganhou `keepSpot`; o mundo passa `x<-100 && journeyBoundary<r` → fora.
2. *Paredão vertical listrado na serra sul*: `inJourney` excluía o retângulo x −240…−118, z < −175; ali o vale (~5 m) encostava no relevo antigo (~90 m) num degrau de dezenas de metros, desenhado como triângulos verticais. A jornada agora cobre o pé da serra (x −240…−150, z −240…−175, mesmo recorte em `JOURNEY_HOLES`) e `terrain3D.height` funde as bordas com o relevo antigo numa encosta — **só fora da área jogável** (peso por `journeyBoundary`), sem mudar onde o herói anda.
3. *Traços pretos/brancos em diagonal nos morros*: T-junction entre bloco fino (2 m) e bloco grosso (8 m): os vértices intermediários da borda do fino não ficavam sobre a aresta do grosso → fresta (céu = branco; saia escura = preto). As bordas do bloco fino agora seguem a interpolação da grade de 8 m.
4. *Fita cinza acima da serra norte*: a faixa da costura leste (Mod 325) aflorava em encostas íngremes; agora afunda proporcionalmente à inclinação.
Prova: `seamMode` (fundo magenta) e vistas reais 360° em `evidencias/mod326/`.

**Água (simulação + render).** `fluidos3d.js`:
- *Simulado*: `createRippleSim` — equação de onda 2D numa grade 64×64 de 0,5 m (32 m) que acompanha o herói, 30 passos/s (<0,2 ms). Pés (força pela velocidade), gotas e o impacto da cachoeira perturbam a superfície; as ondas se propagam (~3 m/s) e amortecem. Saída numa textura RGBA8 (altura, inclinação, espuma) lida pelo shader: desloca vértices, inclina normais e gera espuma. `createSpray` — gotículas balísticas (gravidade/arrasto) que, ao cair, viram ondas.
- *Aproximação visual*: flow map em duas fases (rio corre na direção da curva; o poço sai para o rio), anéis do impacto da cachoeira, cor e transparência pela **profundidade real** (atributo `aDepth` do relevo: leito visível no raso, margem que some sem borda), fresnel com a cor do céu.
- Removidos: disco turquesa do poço, placa de espuma 11×11, anel fixo nas pernas.
- *Causa de "água sumida" achada no caminho*: faces das malhas novas viradas para baixo (descartadas); corrigido e travado por teste.

**Cachoeiras.** Material novo (`createFallMaterial`): largura e balanço variam no tempo, véus que se rompem ao cair, bordas vivas, gotas soltas nas bordas, espuma no lábio, faixas de agitação nos degraus e no pé. A lâmina principal termina **0,9 m abaixo da superfície do poço** (sem ponta triangular seca), largura quase constante (sem leque), sem os véus laterais que viravam "braços". Quedas do abismo usam o mesmo material.

**Lava.** `createLava`: poças com contorno irregular (série de Fourier) e canais que descem o relevo (gradiente + inércia + meandro, param antes de ruas/cidade/portão), conformados ao chão, crosta em placas (Voronoi) arrastadas pelo campo de fluxo, fissuras incandescentes, centro quente e borda que esfria, borda de basalto que dissolve no chão de cinza, luz pontual por poça (passa pelo orçamento de luzes da Mod 305). Saíram: discos/anéis circulares, caixas pretas retas e faixas laranja aditivas, e a lava como sólido.
**Dano e queimadura** (`updateLavaContact`): o contato usa o contorno visível (`heatAt`, o mesmo do desenho) e o caminho de dano do jogo (`damagePlayerFromEnemyAttack`: i-frames do dash/rito, escudo, defesa, morte e volta ao checkpoint): 38 por toque a cada 0,6 s de jogo; queimadura 7 a cada 0,5 s por 5 s depois de sair; selo "QUEIMADURA" e brasa nas bordas da tela; morte/retorno apagam. Medido: 40 cm fora do contorno = 0 de dano; 30 cm dentro = dano.

**Aurora.** Coroa zenital em `ceu-atmosfera3d.js` (cortinas no plano do céu projetado, convergindo acima do herói) somada aos dois arcos; tinta ambiente mais forte no hemisfério/névoa (até 40% céu, 30% chão, 20% névoa), sem luzes extras nem pós-processamento.

**Travadas 1–5 FPS.** Causa medida: primeiro uso de shader no meio do percurso (vale, ponte, Cinzária) — 1–9 s por programa em SwiftShader (centenas de ms em GPU móvel). As peças da jornada estavam ocultas por distância no `compileAsync` inicial. `warmJourneyPrograms`: logo depois de entrar, tudo visível por um instante → `compileAsync` (paralelo onde houver `KHR_parallel_shader_compile`) → um desenho de 1 px **na própria tela** (alvo off-screen gerava outra variante: tone mapping/espaço de cor) → visibilidade restaurada. Resultado: 0 primeiros usos de programa durante o percurso (antes: 6). Ferramentas de QA: `renderStats`, `progHook`, `pick`, `meshInfo`, `lavaState`.
**Desempenho (SwiftShader, mesmo percurso Eldória→Cinzária, 394 quadros com desenho, mobile low-spec).** main: p50 18,8 / p95 1022 / p99 5184 / p99,9 8860 ms, 29 quadros >100 ms → Mod 326: p50 18,5 / p95 411 / p99 5308 / p99,9 5844 ms, 23 quadros >100 ms; primeiros usos de programa no percurso: 6 → 0. Só lógica (572 quadros): main p50 9,8 / p95 16,7 / máx 24,3 ms → 8,9 / 15,9 / 25,6 ms. Draw calls (vale/ponte/cidade): 56/98/101 → 56/117/95. Custo dos fluidos: simulação 64×64 <0,2 ms; gotas 220 pontos (1 draw); lava 1 material compartilhado + 1 de borda. JSON em `evidencias/mod326/perf-*.json`.
**QA no jogo (SwiftShader, mobile):** percurso completo andando (saída de Eldória, vale, rio, subida, ponte, cinzas, rua de Cinzária, portão) sem travar e com HP cheio; queda no abismo e volta ao checkpoint; casas, guarda-corpo, TP, 11 NPCs Meshy, 2 guardas Enemy2; 0 erros de página. Lava: 40 cm fora = 0 dano; 30 cm dentro = dano; canal também; queimadura dura 5 s depois de sair; morte → retorno com HP cheio e sem queimadura. Costuras: `seamMode` em 6 posições × 8 rumos depois de 20 s de streaming: nenhuma faixa magenta entre chão e serra (pontos isolados restantes são pedras distantes; manchas "fechadas" no topo são céu entre picos sob a pluma).
**Evidências** (`evidencias/mod326/`): `s1…s9` antes/depois (mesma câmera/hora/preset), `costura-magenta-depois.jpg`, vídeos `v1-cachoeira-poco.mp4`, `v2-rio-atravessando.mp4` (ondas e espuma nos pés), `v3-lava-contato-queimadura.mp4` (HP, números de dano, selo e brasa), `v4-canal-lava.mp4`, `v5-aurora-zenite.mp4`, `v6-quedas-abismo-ponte.mp4` — todos **simulados (SwiftShader)**.

**Limitações honestas.** FPS no Galaxy A55 precisa da validação do criador (todas as medidas aqui são SwiftShader, CPU). Em SwiftShader ainda há quadros longos periódicos ligados à rasterização em CPU com dois laços de render no teste (rAF + passo de depuração) — não reproduzem GPU móvel. O subterrâneo vulcânico (Ato II) **não foi iniciado nesta PR**: a ordem do briefing manda fazê-lo só depois de P0/P1 validados; fica como etapa seguinte em PR própria.
