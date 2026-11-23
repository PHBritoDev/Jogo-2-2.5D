# Matriz de reaproveitamento — Galáxia 1

**Base:** main 1e17b61253db7bcc443820382f41597d53248f9a (Mod 355).  
**Status:** inventário para revisão; não autoriza mudanças em arquivos reservados.

## 1. Ambientes e estruturas

| Ambiente / região | Evidência atual | Estado | Decisão de reaproveitamento |
|---|---|---|---|
| Reino Celestial e trono | prologue-flow.js, prologue-road-flow.js, cutscenes3d.js, Anjo-rig.glb | Existe no runtime | Preservar a sequência do trono, a retirada das asas e a escolha dos mundos; revisar apenas falas após aprovação |
| Prado e despertar | eldoria-prologue-meadow.js, act1-world-layout.js | Existe | Preservar a sensação de acordar, mãos, foco e descoberta gradual do ambiente |
| Eldória / Vila da Clareira | eldoria-village-talk.js, eldoria-npc-life.js, eldoria-village-solids.js, NPCs e casas | Existe e tem rotinas | Preservar geometria e elenco físico; reescrever papéis e falas só após revisão |
| Floresta, lago, jaulas e círculo | act1-world-layout.js, act1-flow.js, map3d.js | Existe | Preservar trilha, lago, jaulas e ritual; revisar clareza do ritual e consequência |
| Esgoto/caverna e cristais | sewer3d.js, dimensões e arquivos de caverna | Existe, com áreas protegidas | Preservar; não alterar a caverna protegida nesta proposta |
| Garganta, vale, serra e ponte | jornada3d.js, act2-flow.js, map3d.js | Existe | Preservar travessia longa e marcos; não ressuscitar o distrito antigo |
| Cinzária e vulcão | jornada3d.js, volcano3d.js, act2-flow.js | Existe no Mod 355 | Preservar cidade, entrada escondida, laboratório, galeria e dimensão de VORGAZHEK |
| Caminho das Pétalas / dojo / pinhal | arquivos sakura-*.js na PR #673 | Em PR aberta, não integrado na main | Preservar a geometria e o trabalho de Ato III; não criar fatos de história novos nesta PR |
| Invernália / cidade de neve | snow3d.js, act3-flow.js | Existe na main; recebe mudanças na #673 | Preservar clima, pescador, estalagem, armadilha, incêndio, guilhotina e caverna; alinhar com a #673 após revisão |
| Dimensão de ZAR'KHAEL | act3-flow.js, dimensions3d.js, dimension-arenas3d.js e arquivos ZAR'KHAEL | Existe | Preservar arena e chefe; revisar diálogo e motivo sem tocar no VFX reservado |
| Serra e torre de sete pisos | tower3d.js, act4-flow.js | Existe | Preservar sete pisos, descanso, mini-chefe, líder e dimensão de VÉRAXION |
| Coliseu da Ascensão | coliseum3d.js, act5-flow.js | Existe | Preservar arena, arquibancada e oito rounds; resolver a discrepância de quatro elites simultâneas antes de alterar |
| Deserto e estátua | desert3d.js, act6-flow.js | Existe | Preservar quatro encaixes, portal e rota de revanche |
| Dimensões dos quatro Bispos | dimensions3d.js, dimension-arenas3d.js e módulos de cada Bispo | Existe | Preservar geometrias e habilidades; narrativa não pode renomear ou reescrever sem revisão |
| Arena da Ganância | act6-flow.js, rigs greed1/2/3, ultimates3d.js | Existe | Preservar três formas e a Supernova; não copiar linguagem de outra obra |
| Tela dos sete mundos | galaxies3d.js, galaxies3d.test.mjs | Existe | Preservar seleção e desbloqueio; Inveja é o segundo mundo explícito |
| Mundos 2–7 | sem mapa/roteiro completo no material consultado | Não especificados | Planejar como novos marcos, usando assets existentes apenas se fizer sentido e sem fingir que já existem |

## 2. Personagens e NPCs

| Personagem / grupo | Fonte original | Presença no runtime/documentos | Estado de cânone |
|---|---|---|---|
| Deus | Trono e envio aos sete mundos | Cena de prólogo e modelo de luz | Original |
| Protagonista | Nome escolhido pelo jogador; natureza humana e angelical revelada depois | Save de nome, rig, combate e cutscenes | Original |
| Anjo-Guia | Nome funcional no original | Prologue-flow usa Aethraziel/Vaelthar; M12 descreve visual | Papel original; nomes provisórios |
| VHAZRAEL | Primeiro Bispo no projeto atual; “Valério” aparece em anotação antiga | Módulos e dimensão próprios | VHAZRAEL é nome de produção atual; não reintroduzir Valério |
| VORGAZHEK | Segundo Bispo | act2-flow, dimensão, machado e VFX | Original como segundo Bispo |
| ZAR'KHAEL | Terceiro Bispo | act3-flow, dimensão e hidra | Original como terceiro Bispo |
| VÉRAXION | Quarto Bispo, mais antigo na origem da ordem | act4-flow, torre, dimensão e ultimate | Original como quarto Bispo |
| Ganância | Primeiro Pecado | Três formas, arena, ultimate | Original |
| Inveja | Rouba a alma da Ganância e abre o mundo 2 | Silhueta/voz e tela de galáxias | Original no cliffhanger; mundo ainda não desenvolvido |
| Pessoa Misteriosa / Sandra | Ex-5ª Bispo, expulsa, revela nome no epílogo | Modelo Sandra-rig.glb, disfarce, falas e ataques | Original; arco moral precisa ser desenvolvido |
| Teren | Não está no PDF original | v1, estrada e layout | Proposta/runtime derivado; não canônico |
| Ilyan | Não está no PDF original | v1 e documentos de produção; não é personagem de runtime confirmado | Proposta; não canonizar nem matar para motivar |
| Osren | Não está no PDF original | v1 e matriz de fidelidade | Proposta; não canônico |
| Varkhen, Drazek, Zarkun | Não estão no PDF original | v1 | Proposta; não canônicos |
| Bento, Téo, Lia | Não têm histórias aprovadas no PDF original | Modelos, rotinas e conversas jogáveis na vila | NPCs físicos reais; papéis narrativos e missões são provisórios |
| Morador da praça, moradora do balde, carregador | Não têm arcos no PDF original | NPCs com rotinas e conversas | Ambientação jogável; criar história só após revisão |
| Pescador, moradora, vendedor de casacos, estalajadeiro | Funções do Ato III | act3-flow e snow3d.js | Papéis do ato; nomes e relações ainda precisam de aprovação |
| Bandits, guardas, prisioneiros, elites do Coliseu | Grupos funcionais do roteiro | Sistemas e rigs existentes | Reutilizar com contexto; não tratar todos como vilões sem história |
| Auren | Não é o nome do guia no PDF | Epílogo do finale-flow.js legado | Não canônico; motor final legado |

## 3. Preservar, reescrever, retirar de circulação ou manter em mistério

| Ação | Conteúdo |
|---|---|
| **PRESERVAR** | Sete mundos; Ganância primeiro; Inveja segundo; retirada de asas/aura; retorno no quarto mundo; quatro Bispos subordinados à Ganância; passado de VÉRAXION; Sandra como ex-5ª Bispo; oito rounds do Coliseu; quatro fragmentos; revanche; Ganância em três formas; roubo da alma pela Inveja |
| **REESCREVER APÓS APROVAÇÃO** | Motivações dos três primeiros Bispos; diálogo de VÉRAXION; limites e segredo do Anjo-Guia; relação com Sandra; vendedores e sidequests; transição Cinzária → Sakura/Neve; consequências do ritual das jaulas; explicação do sistema de fragmentos |
| **NÃO PROMOVER A CÂNONE** | Teren, Ilyan, Osren, Varkhen, Drazek, Zarkun, Aethraziel, Vaelthar, nomes/parentescos das missões laterais #670 e qualquer fato novo para dojo/castelo antes de revisão |
| **MANTER EM MISTÉRIO** | Origem exata do protagonista; quanto o guia realmente sabe; por que Sandra foi expulsa além do rótulo de fraqueza; se as almas das crianças podem ser recuperadas; identidade e motivação completa da Inveja; forma final do Pecado 7 |

## 4. Fluxo atual e fronteiras de save

| Marco | Etapas atuais | Subestado | Observação |
|---|---:|---|---|
| Prólogo / Ato I | 0–8 | act1Sub e flags de ritual/portal | Não renumerar; Ato II começa no limite 8/9 |
| Ato II — Cinzária | 8–14 | act2Sub guardado em act1Sub | Passo 10 de saves antigos migra para entrada do vulcão |
| Ato III — Invernália | 15–19 | act3Sub em act1Sub | Ato III novo da PR #673 altera a travessia; aguardar integração |
| Ponte entre atos | 20 | legado / transição | Não reutilizar sem auditar os saves |
| Ato IV — Torre | 21–24 | act1Sub representa o piso 1–7 | O 4º mundo dos sete Pecados não é este Ato IV |
| Ato V — Coliseu | 25–26 | rounds 1–8 em act1Sub e transição | Verificar exatamente o passo 26 antes de migrar |
| Ato VI — Deserto/Final | 27–30 | fragmentos, revanche e fases | act6-flow substitui finale-flow antigo |

### Dados que devem sobreviver a qualquer migração

- Nome do jogador, moedas, XP, inventário, espada, atributos, conquistas e bestiário.
- Flags de chefes/recompensas já pagas, para impedir duplicação.
- QuestStep e act1Sub até existir mapeamento aprovado.
- Névoa, POIs e abrigos do mapa; aliases antigos de POI/waystone.
- Memória local das conversas da vila, sem usar essa memória como prova de cânone.
- Missões opcionais concluídas não podem ser pagas novamente; as missões não aprovadas podem ser congeladas, mas não apagadas sem política de migração.

## 5. Áreas de outros agentes — não tocar nesta proposta

- PR #673: Ato III, Sakura/Neve/Castelo, mapa e integração do mundo.
- PR #675: câmera e HUD de VORGAZHEK.
- PR #674: iluminação de ZAR'KHAEL.
- PR #672: retry de carregamento da fauna.
- PR #656: combate multi-alvo.
- PR #515: documentação/área protegida da caverna.
- PR #670: integração técnica de missões opcionais; draft, conteúdo ainda não aprovado.

A presente entrega cria apenas documentação em docs/narrativa. Nenhum arquivo de runtime, build, loader, controlador, VFX, fauna, câmera, HUD, caverna ou save foi alterado.
