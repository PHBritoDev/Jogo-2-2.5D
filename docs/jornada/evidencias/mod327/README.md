# Mod 327 — revisão jogável: água, dash, entrada do vulcão, chafariz, fauna, aurora e mortes em cinza

Capturas: Chromium headless + SwiftShader (CPU), 960×540 (comparativos) e 800×360 móvel low-spec (desempenho).
**Antes** = `main` em `f098ce0`; **depois** = este ramo. Mesmas posições, horas e câmera em cada par.
SwiftShader **não** mede o FPS do Galaxy A55: os tempos abaixo só comparam antes/depois na mesma máquina.

## P0 — água suspensa no Vale (`agua-poco-rio-antes-depois.jpg`)
- **Causa reproduzida e medida:** o poço era um disco plano no nível 1,32 m; na saída sudeste o chão é mais baixo,
  então a lâmina ficava até **1,19 m acima do terreno**, terminando no ar; as bordas do rio também ficavam acima da margem.
- **Correção na origem:** `riverGeometry`/`poolGeometry` recebem `maxDepth` = profundidade FÍSICA (`riverDepth`, 0,7 m):
  a superfície segue o chão + a água real e a borda encosta no terreno (só o anel por onde o rio continua fica aberto).
- Teste: `tests/mod327.test.mjs` reproduz o defeito (sem `maxDepth` > 0,8 m no ar) e trava 0 bordas penduradas.

## P1 — dash
- **Pose (`dash-reaparicao-antes-depois.jpg` / `.mp4`, quadros de 1/30 s):** o clipe de chegada era a cauda do
  `Quick_Step_and_Spin_Dodge` (0,82–1,16 s), que começa no **meio do giro** — quadril a −131° contra −52° da postura e
  ~0° da corrida (medido no GLB). O herói reaparecia de lado e girando. Agora a chegada é o amortecimento do pouso do
  próprio `Jump_Over_Obstacle_2` (mesmo esqueleto, quadril a ±15° da frente). Teste lê o GLB e trava a diferença.
- **Física:** a varredura em substeps de 7 cm já segurava parede/fonte/guarda-corpo (QA no navegador: igual antes e
  depois — `qa-dash-boca.json`). Corrigido o que faltava: o fim do dash recua pelo **trajeto já validado**
  (`dashSettle`; antes recuava 2,8 m em linha reta às cegas) e morte/cena/portal/teletransporte no meio do dash fazem o
  corpo reaparecer sem pose de chegada por cima do clipe de morte e sem impulso residual.

## P0/P1 — entrada do vulcão e praça
- `sope-frontal-antes-depois.jpg`: os pilares + lintel + plano negro na frente da cidade sumiram.
- `boca-caverna-antes-depois.jpg` / `boca-caverna-dia-noite.jpg`: boca de caverna no **flanco sul, já atrás do cone**
  (abertura voltada para longe da estrada), maciço de basalto instanciado (1 draw), garganta escura com profundidade,
  calor fraco no fundo, fumaça rala, soleira gasta e **pegadas na cinza** (trilha parcial desde a saída sudoeste de Cinzária).
- Fonte única em `jornada3d.js` (`CAVE2`, `GATE2`, `GUARDS2`, `TRAIL2`); remapeados botão, marcador, POI do mapa (mesmo
  id), saída do interior (`DISTRICT_SPOTS.volcanoExit`, de costas para a boca), abortos do Bispo e salto de QA.
  O chão da garganta é recortado na MESMA altura para física e malha; o fundo escuro não é caminhável.
- QA no navegador: trilha 100% caminhável (degrau máx. 0,16 m), botão do lábio até 3 m dentro, andar para dentro
  para no escuro (lz −4,2), saída fora do alcance do botão. Saves guardam só a etapa: os antigos seguem o novo marcador.
- Guarda futuro: só o ponto reservado `CAVE2.futureGuard` (sem NPC, diálogo ou cânone).
- `fonte-praca-antes-depois.jpg`: o "portal" da praça era a fonte (aro de toro + cilindro + coluna). Virou um chafariz
  inequívoco (bacia, pedestal, taça, pináculo e oito bicas), mesma colisão.

## P1/P2 — fauna com os GLBs do autor
- `fauna-glbs-inspecao.jpg`: os cinco arquivos vêm em **pose de pouso**; só o `Passaro_Vale_Dourado` tem esqueleto;
  nenhum tem clipe; texturas 3 × 2048². Decisão (regra do briefing): nenhuma ave voa com asas rígidas — rapina e corvo
  ficam pousados (olham, saltitam, fogem saltando); o dourado deixa o poleiro abrindo as asas pelos ossos de ombro.
  Os bandos distantes continuam nas silhuetas de `eldoria-birds3d.js`.
- `fauna-no-jogo.jpg`: coelho (vale), pássaro dourado, grilo (só à noite), rapina na encosta da serra, corvo nas cinzas.
- Só a cor base é decodificada, já reduzida (256/128 px); normal/rugosidade 2048² não. Carregamento por espécie
  48–141 ms no SwiftShader, um por vez, só com habitat no raio. Estáticos = 1 draw por espécie (InstancedMesh).
- Orçamento: 3 coelhos, 3 pássaros, 1 rapina, 2 corvos, 2 grilos; qualidade baixa = metade e sem grilo visual.
  Grilos e o canto deles: só do anoitecer à madrugada e onde há habitat (coro intermitente, baixo).

## Adendo — a aurora ilumina mundo e água (`aurora-luz-sem-com.jpg`, mesma build, luz da aurora desligada/ligada)
- Antes só havia um tom chapado no hemisfério/névoa. Agora: luz colorida que segue a cor viva da aurora no relevo,
  cone e águas, com **faixas** largas e lentas e **oclusão artística** pela inclinação; reflexo violeta animado na
  água pela direção refletida (visão + ondulação), sem espelho/planar reflection, sem luz nem passe extra.
- Uniforms compartilhados (1 atualização por quadro), zerados sem aurora e em lugar fechado (dimensões, caverna).
- Bug encontrado no caminho: o carregador importa o mundo com `?v=BUILD` e os módulos aninhados sem — o módulo da
  aurora existia em DUAS instâncias e o terreno da jornada nunca recebia a luz. Os uniforms moram no `globalThis`.
- Elevação média medida (pixels, cena inteira): vale 31→38, poço 35→51, rio 24→33, cinzas 15→21 (sutil).

## P2 — morte → cinzas (`cinzas-demonio-heroi.jpg`)
- `cinzas3d.js`: depois do clipe de morte, dissolve de baixo para cima com borda incandescente e fuligem; poucas
  partículas em pool (nenhuma em qualidade baixa); clona o material (os vivos nunca mudam); uma vez por entidade;
  limpeza em cancelamento/descarte. Variantes: demônio, chefe (rachaduras), humano (pó claro), herói (partículas
  celestiais + rematerialização no checkpoint), animal (só para o futuro: o jogo não mata animais).
- Ligado em: esquadrão do Demônio1, clones de horda, inimigo principal no caminho genérico de derrota (antes sumia de
  uma vez aos 0,85 s) e herói. Chefes com cena de derrota (Vorgazhek, Zarkhael, Veraxion, revanches) continuam
  pelas cenas, sem cinza antes delas. Humanos/NPCs não morrem no roteiro atual: nada foi desintegrado à toa.

## Desempenho (`perf-pontos-fixos.json`)
Draw calls iguais ou menores em vale/poço/praça/Eldória; +7 na boca da caverna (40→47). Heap JS +2–4 MB.
Tempos de quadro dentro do ruído do SwiftShader (variam ±5 ms nos dois sentidos). Medir no aparelho é com o criador.

## Testes
`tests/mod327.test.mjs` (19 casos: água, pose do GLB, varredura do dash, fim do dash, boca/trilha/saída, chafariz,
fauna, aurora, cinzas). Suíte completa: 814 passam; as 9 falhas restantes são as mesmas da `main` (ambiente).
