# MISSÃO CODEX — RECONSTRUÇÃO TOTAL DA CAVERNA SUBTERRÂNEA DO VULCÃO
**Projeto:** PHBritoDev/Jogo-2-2.5D  
**Data:** 20/11/2026  
**Executor:** Codex  
**Status:** briefing temporário, **NÃO IMPLEMENTADO**. Executar, testar e só então excluir este arquivo.

## 0. Ordem de trabalho e fronteiras obrigatórias
O proprietário REPROVOU a caverna subterrânea atual do vulcão da ilha/Cinzária (Ato II). A ordem é reconstruir o ambiente, não fazer retoques cosméticos. Preservar a entrada física da ilha e a continuidade da campanha; não alterar a caverna de Eldória (Ato I), caverna da serra, os Bispos, HUD, armas, modelos do protagonista ou outras áreas.

**Conflito de trabalho:** o Claude tem missão ativa em `CLAUDE_TEMP_MISSAO_BISPO3_BISPO4_20261120.md` (Bispos 3 e 4). NÃO editar esse arquivo nem arquivos de combate/rig/VFX de Bispos 3/4. Trabalhar em branch própria; usar no máximo uma PR da missão, sem merge automático enquanto houver interferência ou CI/QA pendentes. Pode integrar quando comprovadamente seguro, concluído e sem interferir com o Claude; se a missão do Claude ainda estiver modificando arquivos compartilhados, deixar a PR pronta e esperar a integração/coordenação.

Antes de editar: ler a versão ATUAL da main, o `volcano3d.js`, a renderização real do tema `volcano`, as transições para `act2`, módulos de física/câmera/lava/portais, testes existentes, e os acordos/ownership vigentes dos agentes. **Fato inspecionado na main em 20/11:** `volcano3d.js` contém `VOLCANO.approach`, `magma`, `tunnel`, `cells`, `lab`, `gold`, `hall`, `throne`, `miniboss` e `portal`; alguns trechos de encontro/roteiro dependem desses marcadores. Não apagar simplesmente os dados sem migrar consumidores, checkpoints, save, vitória e test hooks. Primeiro identificar a fonte geométrica REAL do interior — `volcano3d.js` é ao menos dados de layout, não necessariamente a malha completa.

**Referências visuais a serem encaminhadas pelo proprietário ao Codex:** 
1. Câmara monumental com cristais violeta, cachoeiras de lava, pontes e ruínas em níveis (imagem panorâmica).
2. Floresta retorcida de madeira negra com veios incandescentes de magma (imagem vertical).
3. Abismo cinza com plataformas partidas, torres colossais, espinhos orgânicos gigantes e fissuras vermelhas (imagem vertical).

Não alegar ter recebido anexos ausentes. Se não receber, implementar arquitetura/código verificáveis e registrar pendência de comparação visual; não encerrar afirmando equivalência.

## 1. Direção artística: três macroambientes, uma jornada contínua
A caverna é um espaço **subterrâneo de escala monumental**, navegável em 3D, composto por **TRÊS biomas/atos espaciais conectados organicamente**, cada um com silhueta, luz, ritmo e riscos próprios:

**A. O Santuário das Cataratas de Fogo — primeira vista colossal.**
- Logo após a entrada real pela rocha da ilha, revelar câmara imensa em múltiplos níveis: arcos e templos parcialmente soterrados, passarelas acima de profundos vales, escadarias que serpenteiam penhascos, torres quebradas, grandes desníveis, **rios e cachoeiras de lava** cuidadosamente distribuídos, formações de basalto e teto rochoso coberto de estalactites/cristais.
- Dar ao jogador perspectiva: vista de alto para baixo e longe, com primeiro plano, médio plano e silhueta de fundo, sem corredor estreito e sem usar apenas paredes planas ou textura de cavernas.
- Usar o **cristal azul GLB já existente** como fonte de geometria onde apropriado: identificar arquivo real pelo inventário do repositório, inspecionar dimensões/orientação/materiais e **instanciar clusters** com variações controladas de cor azul, lilás, magenta, violeta, rosa e ciano, escala e orientação, sem mesh genérico triangular substituto. Emissões bonitas, sem dezenas de point lights dinâmicas. Os cristais devem existir em paredões, teto, afloramentos, nichos e bordas da lava, com composição intencional.
- Piso majoritariamente de rocha/cinza sólida com áreas localizadas de magma (fendas, calhas, placas vítreas): NUNCA 100% do chão incandescente. Várias plataformas e clareiras realmente servem a circulação e combate.
- **Luz SOMENTE com fonte física plausível subterrânea:** lava, cristais, fogueiras e tochas raras. Proibido sol, luz direcional de céu azul ou claridade branca sem origem. Atmosfera com nostalgia, tons quentes da lava contra cores frias dos cristais, sombra legível, profundidade e névoa volumétrica falsa/barata.
- Tochas poucas e posicionadas com intenção; chama azul, vermelho-alaranjada e eventualmente violeta. Preferir reutilização do modelo 3D de tocha existente, sem sprites/triângulos de fogo genérico. Evitar ritmos regulares de postes/objetos.

**B. Bosque das Veias Ardentes — floresta de magma labiríntica.**
- O jogador desce da câmara para um **bioma amplo**, mais íntimo, sombrio e silencioso, com árvores negras queimadas e tortuosas, troncos de fissuras vivas de lava, raízes expostas, ramos entrelaçados, solo de cinza, leitos de magma e névoa baixa.
- Não reproduzir um túnel estreito nem um labirinto aleatório sem propósito. Criar 3–5 rotas/loops curtos inteligíveis, pequenos atalhos, becos visuais e clareiras seguras para combate, com pontos de referência únicos (árvore colossal bifurcada, cristal lilás, rio cruzado, arco soterrado, tronco oco etc.). Principal rota jamais depende de salto cego, de decorar maze ou de RNG.
- Árvores com espessuras/torções/ramificações e intensidades de veios variadas, cluster por habitat, espaço de navegação, colisão simplificada e instancing/LOD. Não usar uma árvore clonada centenas de vezes sem variedade legível.
- A lava aqui serve também como guia de direção e obstáculo; nada de inundar 100% do espaço. Iluminação mais escura e opressiva que a câmara, com manchas laranja/vermelho entre a fuligem; transição emocional gradual.

**C. O Abismo das Coroas Mortas — final monumental e mortal.**
- Saída do bosque em uma abertura colossal para um vazio de aparente profundidade sem fundo: **plataformas de pedra partidas, arcos impossíveis, estruturas/cidadelas antigas gigantes, torres distantes no nevoeiro cinza, raízes/espinhos negros colossais e rachaduras vermelhas internas**. Arquitetura integrada à rocha, não prédios copiados/soltos.
- Escala deve ser vista em múltiplas distâncias; uma passarela principal legível e plataformas secundárias danificadas com bordas perigosas. Quedas reais nos buracos = morte com fluxo de respawn correto; sem chão invisível de segurança. Evitar que o jogador caia por borda impossível de enxergar ou ângulo de câmera injusto.
- **Iluminação igual na intenção da terceira referência:** cinza frio/escuro difuso, volumetria atmosférica de profundidade e fontes rubras profundas nas fendas. Sem sol visível, sem luz externa de dia e sem céu azul; a claridade residual pode ser de neblina/rocha luminescente difusa ARTIFICIAL, não origem solar.
- Portal verdadeiro para prosseguir e **mini-chefe** em arena sólida dentro desta região. Preservar identidade/fluxo/cutscenes/recompensas do encontro existente onde houver contrato; apenas migrar local e revalidar. Arena deve ter bordas seguras, espaço para dash/esquiva e indicação de onde o combate se inicia; o mini-chefe não deve cair no abismo acidentalmente.

## 2. Layout e progressão — SÓ BASE AGORA
A ordem de exploração é **entrada real → Santuário → Bosque → Abismo → mini-chefe → portal**. Não inventar nova história, NPCs canônicos, missões, falas, diálogos ou eventos narrativos. A jornada detalhada será escrita DEPOIS pelo criador. Preservar as dependências da campanha antiga temporariamente por adaptadores/checkpoints até decisão autoral posterior, sem colocar um laboratório antigo de cenário genérico aparecendo no meio da nova ambientação. Onde o novo layout conflitar com gatilhos antigos, resolver tecnicamente e registrar as decisões.

Design intencional: a topologia de exploração precisa ser testável com um grafo navegável/waypoints; evitar percursos inúteis de minutos sem descobertas. Preservar passagem contínua SEM tela de teleporte arbitrário entre três regiões. Usar galerias sinuosas, passagens sob arcos, quedas/descidas coerentes, ocultação natural de setores, vistas antecipadas e transições de cor/umidade/som/luz.

Criar landmarks memoráveis e 2–3 panoramas de contemplação, com descanso visual antes do clímax. Proteger visibilidade de objetivos e manter dificuldade crescente no terreno, não somente mapa maior.

## 3. Lava, burn e abismos — perigo REAL
- Identificar sistema atual de vida, dano periódico, invulnerabilidade, salvamento, morte, respawn e imunidades. NÃO inventar lógica paralela que duplique o dano.
- Entrar em volume de lava ativa **dano alto por segundo** com ticks consistentes em 30/45/60 FPS; sair da lava desativa o contato e aplica queimadura residual por **alguns segundos** (proposta inicial 3–5 s). Indicar queimadura com VFX discretos, HUD existente e som se já houver infraestrutura. Reentrada na lava renova o estado sem multiplicar queimaduras em pilhas infinitas. Respeitar pausa, troca de região, morte e invulnerabilidade sem torná-la inócua.
- Separar visual e logicamente lava decorativa longe do jogador, lava acessível letal e rachadura emissiva segura. Não aplicar dano por andar em qualquer rocha com brilho.
- Em abismo, morte ao cruzar volume/altura, nunca atravessar o mundo por segundos sem evento. Checkpoint seguro próximo suficiente, sem exploração do portal sem vencer mini-chefe.

## 4. Matéria/colisões e câmera — critérios bloqueantes
- Todas as superfícies caminháveis, escadas, pontes, plataformas, troncos grossos, rochedos, colunas e ruínas próximas à rota precisam de colisão 3D correspondente, sem atravessar paredes, encalhar em cantos, cair por degraus ou pisar em geometria invisível. Separar mesh visual de colisores simplificados, com correspondência auditada.
- A câmera 3ª pessoa deve recuar/aproximar mantendo linha de visão ocluída por rochas e arquitetura, NÃO enxergar através de paredes ou cair para dentro de malha. Primeira pessoa deve manter altura normal, rotação fluida e sem vibração/tremores; testar espaço estreito, esquinas, fendas e teto.
- Antipenetration, ground probes, degraus, salto/dash, gravidade/queda, movimento em ponte e edge cases: validar durante exploração e combate real.
- Garantir que o player e inimigos não apareçam do lado de fora da caverna, que a água/terra externa não atravesse a casca e que o portal/TP da área não aponte à caverna errada.

## 5. Engenharia Three.js e performance mobile
Arquitetura de setores: dividir em câmara, bosque, abismo e conectores; ativar/instanciar/desativar geometria, luzes, animações e partículas conforme distância, frustum e portas naturais/oclusão, sem popping perceptível; preservar estado do jogo. Preferir geometry/material compartilhados, `InstancedMesh` por combinação material/geometria, mesclagem seletiva de estruturas estáticas, LOD, impostores distantes apenas para decoração, sem simular física em milhares de objetos.

Não usar muitas luzes móveis, sombras dinâmicas em todas as tochas, bloom pesado, transparências sobrepostas maciças nem centenas de draw calls desnecessárias. Lava: animação UV/ruído shader leve, emissive bem escolhido e cachoeira baseada em malha/flow; NÃO textura estática com aparência de papel. Cristais: material original + palette emissive por instancia/malha, sem destruir a geometria.

Definir orçamento com baseline real do jogo e monitorar **FPS mediano, p95/p99 frame time, draw calls, triângulos, texturas e memória** nos três setores, em desktop e mobile emulado; **Android físico se disponível**, senão declarar limitação. Objetivo preferencial 40–60 FPS no Galaxy A55 se validável, sem alegar medição que não ocorreu; gatilhos de autoquality e fallback LOD quando necessário. Melhor ter ilusão de escala infinita com apenas setor próximo detalhado do que tentar renderizar 10 km de malha ao mesmo tempo.

Fazer testes de criação/destruição repetida para detectar vazamentos, instâncias duplicadas, shader compilation stalls e reset incorreto ao voltar do portal.

## 6. Pesquisa e referência de qualidade
Antes de modelar: revisar as 3 imagens do criador e princípios de environmental storytelling, composição em camadas, silhouette design, landmarks e wayfinding de RPGs como Elden Ring, Genshin Impact e cavernas monumentais; estudar instancing, LOD, emissive e iluminação subterrânea no Three.js atual. Extrair princípios, NÃO copiar cenas, formas de jogos ou assets proprietários.

**Crítica artística obrigatória:** capturar frames com a MESMA composição das referências: vista ampla da câmara (profundidade/estratos/lava/cristais), vista na altura do jogador na floresta (veios, densidade, trilha), vista de entrada e de travessia do abismo (ruínas colossais, profundidade, contraste cinza/vermellho). Se o resultado for genérico, pequeno, vazio, plasticoso, repetitivo ou geometricamente raso, corrigir e RECAPTURAR. A meta não é replicar pixel a pixel, mas superar a experiência em jogabilidade, profundidade e identidade visual.

## 7. Testes e provas de conclusão
- [ ] Caminho verdadeiro desde a ilha até a entrada e toda a travessia pelos três setores sem TP mágico, quebra de checkpoint ou regressão da campanha.
- [ ] Fotos e **vídeo gameplay real**: vista ampla do Santuário, cristais, quedas de lava, toque nos cristais, passarela/escadarias; navegação/combate no Bosque; abismo, mini-chefe, morte por queda e portal funcionando.
- [ ] Cristal GLB real identificado e reaproveitado com cores diferenciadas; tochas poucas e reais; ausência de luz solar.
- [ ] Dano de lava e queimadura residual corretos, sem acumulação infinita, com teste de entrar/sair/reentrar/pausa/morte.
- [ ] Buracos e quedas letais, respawn/portal/mini-chefe corretos.
- [ ] Colisões correspondentes em rochas, ruínas, escadas, pontes, paredes; zero câmera atravessando rocha nos trajetos amostrados em 1ª/3ª pessoa.
- [ ] Testar com teclado+mouse e controles móveis (joystick, pulo, dash, ataque), combate, distâncias e 30/45/60 FPS em pelo menos rotas relevantes.
- [ ] Comparar imagens de antes/depois, testar estabilidade/performance em todas as áreas, memory/renderer leaks; regressões CI verdes.
- [ ] Verificar arquivos sobrepostos com Claude: qualquer conflito implica parar merge e isolar.
- [ ] Não declarar pronto apenas por smoke ou screenshot isolado. Se algo ficou feio, genérico ou quebrado, refazer.
- [ ] Relatório objetivo `docs/jornada/CAVERNA-VULCAO-RECONSTRUCAO.md` com evidências, limites e status do merge.

## 8. Fluxo de entrega, economia de tokens e regra de silêncio
- Trabalhar autonomamente numa única branch/PR com commits pequenos por setor, incluindo código, testes e evidências. Criar o relatório final **no GitHub**, não no chat.
- **Silêncio conversacional máximo:** não narrar cada passo, não enviar resumos imensos, perguntas não essenciais ou dumps de logs. Se a interface exigir resposta, até 1–2 linhas com status e link. Não confundir silêncio de chat com pular QA. Em Claude/Codex não há garantia de suprimir mensagens internas/ferramentas; ajustar verbosity da interface quando possível, nunca mexer em permissões só para esconder avisos.
- Economizar tokens fazendo buscas direcionadas, lendo só trechos necessários, não repetindo toda a documentação, e guardando logs extensos em artefatos/CI. Execução técnica minuciosa, comunicação mínima.
- **Somente quando TODOS os critérios forem cumpridos**, visualmente aprovados, CI correto e sem conflito com Claude: remover ESTE arquivo temporário em commit final e concluir/mesclar PR de modo seguro. Caso pendente, manter o arquivo e PR draft/não mesclar. Nunca afirmar que merge ocorreu sem resposta confirmada do GitHub.
- Não recriar nem apagar modelos binários GLB indevidamente; não tocar arquivos do Bispo 3/4 enquanto o Claude executa sua missão.

**Prompt de ativação sugerido:** “Leia e execute integralmente `CODEX_TEMP_REFAZER_CAVERNA_VULCAO_20261120.md`. Trabalhe em silêncio, sem interferir no Claude, e só conclua após QA visual real, testes e correções.”
