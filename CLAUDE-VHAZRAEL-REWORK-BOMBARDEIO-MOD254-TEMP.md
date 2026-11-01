# INSTRUÇÃO TEMPORÁRIA AO CLAUDE CODE — MOD 254 — REWORK DO VHAZRAEL
**Repositório:** `PHBritoDev/Jogo-2-2.5D`, branch base `main`.
**Atenção:** este arquivo deve ser **LIDO integralmente**, executado e **APAGADO do GitHub após a implementação e validação**. Não copiar este documento para o chat. Autoriza-se melhoria artística/técnica fundamentada e compatível com os requisitos, mas nada de alterar poderes fora do escopo.

## Objetivo e kit final do Bispo1
O criador quer **APAGAR COMPLETAMENTE** duas skills atuais de VHAZRAEL:
- `terror`: mãos demoníacas / mãos que agarram o jogador.
- `brood`: invocação atual de inimigos, ninhada e criatura colossal associada à skill.

Deixar somente estes poderes principais de VHAZRAEL:
1. `throne`: **Ruptura do Trono Abissal**, espada de energia. PRESERVAR o trabalho das Mods 249–252, sem refatorar casualmente.
2. `thorns`: **espinhos de sangue** saindo do chão. PRESERVAR inteiramente seu ataque/telegráfico.
3. **NOVA SKILL**: **Bombardeio Abissal Perseguidor** — chuva/rajadas controladas de energia que explodem no chão à volta da posição atual e futura do jogador por **4–7 segundos**, com fogo residual. Implementar agora.
4. `orbital`: **Extinção Orbital**, ultimate do meteoro; preservar. Se a Mod 253 da ultimate estiver em desenvolvimento, **não sobrescrever nem conflitar** com as alterações do Claude. Inspecionar `main` antes de iniciar e preservar quaisquer merges recentes.

**Importante:** o criador deseja **uma futura invocação totalmente nova, com modelo 3D e animações próprias**, mas **NÃO IMPLEMENTAR ESSA INVOCAÇÃO AGORA**, não deixar invocação provisória, placeholder ativo ou chamada para assets inexistentes. O espaço fica livre para a skill futura.

## Referências visuais fornecidas pelo criador
- **Sword Art Online: Alicization**, Alice Synthesis Thirty / Fragrant Olive Sword: a espada se fragmenta em muitos elementos dourados controlados pela usuária, atacando por várias direções (fonte explicativa: https://swordartonline.fandom.com/wiki/Fragrant_Olive_Sword ). **A ideia de referência é a cadência/controle de múltiplos impactos**, não copiar pétalas, coreografia, material autoral, ou paleta dourada. Adaptar para **energia rubro-negra e branca incandescente** do VHAZRAEL.
- **GIF fornecido na conversa**: enorme explosão brilhante amarelo-branca com forma de cogumelo, múltiplos anéis de pressão, terra/rocha projetada, relâmpagos ocasionais e fumaça densa nos estágios posteriores. **NÃO é para soltar uma bomba nuclear em miniatura a cada fração de segundo**: cada impacto local é uma *versão escalada e otimizada* do comportamento físico/artístico, com núcleo → onda → resíduos. A fumaça pode existir **como consequência da explosão**, mas NÃO substituir o núcleo.
- **Vídeo MP4 enviado pelo criador** do efeito/ataque da Alice: observar se acessível no contexto da ferramenta; se não, **não inventar análise quadro a quadro**. Já há descrição comportamental completa neste arquivo. Buscar demonstração pública do golpe se for necessário.
- Pesquisar antes de programar referências de **stylized bombardment VFX, meteor shower ground impacts, anime sakuga shockwave, procedural scorch decal, high-energy explosion core, volumetric smoke vs solid plasma**. Pesquisa de Pinterest, ArtStation, docs de Three.js e game VFX; utilizar as referências só como direção de arte, **não copiar texturas/frames de anime ou imagens protegidas diretamente para o jogo**.

## Como o novo ataque DEVE funcionar
**Conceito:** uma **fonte/canalizador de energia elevado** (fenda no ar, matriz de lâminas rubro-negras, círculo quebrado de plasma, ou outra solução de qualidade) atira rajadas SEQUENCIAIS em direção ao chão. O próprio Bispo1 **não precisa flutuar**. Pode conjurar do chão enquanto a estrutura suspensa executa o bombardeio.

- Tempo de duração recomendado: **5.5–6 s** (dentro do intervalo exigido de **4–7 s**).
- Ataque contínuo composto por múltiplos **impactos discretos e ritmados**, cada um com sua marca no chão/aviso, descida clara e explosão no local.
- O sistema **recalcula o alvo antes de cada novo disparo** com base na posição atual e previsão limitada de velocidade do jogador. **Não usar projéteis teleguiados que curvam depois de lançados**. Uma vez disparada a rajada, seu rumo e ponto de impacto ficam TRAVADOS. Enquanto a skill estiver ativa, os disparos seguintes corrigem a mira e perseguem o movimento do jogador.
- Dificuldade desejada: **parado = claramente vulnerável; andando = ainda corre risco; correndo consistentemente = melhora as chances; dash bem cronometrado = boa janela de esquiva**. Mas sem auto-hit inevitável nem 100% de acerto.
- Use antecipação de movimento **curta e limitada**, com erro controlado, dispersão variável e cadência balanceada pelo tempo de deslocamento; **não ler movimentos futuros reais** nem trapacear com ajuste da trajetória após o disparo. Alternar alvos centrais e pressão lateral para que deslocamento simples e reto não trivialize tudo. Manter caminhos viáveis de fuga.
- Cada marca de aviso aparece antes do impacto no **ponto de chão real**; idealmente ~**0.45–0.75s** de antecipação visual, calibrada por teste no Android. Não concentrar tantos impactos no mesmo instante a ponto de tornar impossível desviar. Legibilidade acima de poluição.
- A animação principal pode ser impacto no chão saindo de cima: **cada explosão deve existir no ponto de impacto do mundo**, não na posição posterior do jogador. **Nunca deslocar VFX já explodido perseguindo o alvo.**
- No contato do centro/raio de explosão com o protagonista: dano apropriado e reação coerente; `dash` e `iframes` existentes respeitados. Fogo residual é risco leve e separadamente sinalizado, com cooldown de ticks por alvo. Evitar dano duplicado pelo mesmo contato, em especial se fogo/onda atingirem no mesmo frame.

## VFX (prioridade muito alta)
### Desenho de cada descarga
1. No alto, a origem tem **silhueta de energia definida**, bordas pretas cortantes + halo rubro, centro branco/vermelho concentrado — não uma simples esfera luminosa.
2. Cada rajada **desce** em reta ou trajetória legível, rastro direcional curto, corpo **opaco/denso, com núcleo**. Não fazer tubo rosa transparente.
3. **Contato com o terreno:** *flash* muito breve (respeitar `reduceFlash`) seguido de um **núcleo incandescente branco/amarelo**, corpo vermelho/laranja energético, borda negra quente e rachada. A explosão deve ter sensação de **massa**, não ser apenas partículas rondando o local.
4. **Onda de choque**: borda dura que se expande radialmente a partir do epicentro, com espessura e tempo perceptível; pedras e placas de terreno surgem do **mesmo ponto**. Estilo GIF: forma ascendente concentrada, anéis de choque e uma pequena coluna com dimensão e volume, e só depois **fumaça cinza-escura/fuligem**.
5. **Fogo residual no mapa**: manchas com bordas recortadas e brasas, focos de chama ativos por alguns segundos após os impactos, com limite de manchas simultâneas e expiração/limpeza. O chão **não pode ficar permanentemente destruído ou queimando após reset/saída da arena**; marcas superficiais temporárias e detritos recolhidos por pooling.
6. Áudio em momentos certos: conjuração, rajada, impacto pesado, crepitação do fogo; screen shake moderado, respeitando opção de acessibilidade. Sem flashes longos e sem câmera travada.
7. **Fogo NÃO é fumaça**: usar núcleo e chamas estruturadas, fumaça como subproduto do resfriamento. Evitar bolas redondas de algodão doce, bloom exagerado, dezenas de nuvens transparentes e geometria sem silhueta.
8. Variar tamanho/intensidade moderadamente para a sequência parecer viva, sem ficar repetição de GIF idêntico. Fazer composição com contraste entre ataques **bem definidos** e terreno afetado.
9. Ajuste à escala real de `playerReferenceHeight`, distância/câmera e dimensão; detalhes visuais precisam aparecer no Android, sem atravessar árvores/jogador.

### Técnica e desempenho
- Priorizar **Three.js** já presente, materiais/shaders, instancing, *pooling*, VFX helpers do jogo; não usar Unity, assets externos não versionados ou bibliotecas gigantes.
- Manter orçamentos explícitos por qualidade (auto/baixo/alto), com redução de detritos e fumaça, **mas nunca remover o núcleo do impacto nem as marcas de aviso**. Sem alocações excessivas de geometria por quadro, vazamentos de material, texturas enormes, milhares de draw calls ou choques de shaders.
- Respeitar `dispose`, fim da habilidade, fim da luta, troca de laboratório, pausa e reset. Garantir que fogo residual não fique dando dano depois do descarte ou transição.
- Se houver obstáculos e LOS, decidir como rajadas interagem com teto/estrutura; **nunca criar hitbox fantasma através do terreno**.

## Arquitetura: remoção COMPLETA com proteção de regressão
1. Inspecionar `vhazrael3d.js`: `VZ.kit` atualmente inclui `['throne','thorns','terror','brood','orbital']`, possui `TERROR`, `BROOD`, `registerSkill('terror')` e `registerSkill('brood')` e sistema de invocações. Atualize a IA/score/condições/cooldowns para somente os quatro poderes finais.
2. Inspecionar `vhazrael-vfx3d.js`, `enemy1-squad-runtime3d.js`, `enemy1-squad3d.js`, `mundo-3d-prototype.js`, menus de laboratório, lista `SQUAD_NAMES`, testes, sons, displays, VFX e alocações. Retirar `terror` e `brood` do **Bispo1** de verdade: IA, casts, dano, marcações, HUD, VFX, eventos, invocações, loops e cleanup. **Não deixar apenas ocultos no seletor**. Se as funções forem usadas por outros inimigos, **não remover a capacidade compartilhada e não quebrar os demais**: refatorar/condicionar com evidência de uso.
3. Especial atenção: `ORBITAL.needSkills=3` e contador `showDistinct` dependem do repertório que o boss já usou. Depois de substituir os dois poderes por um, VHAZRAEL só terá **três** habilidades não-ultimate (`throne`, `thorns`, nova); validar que a ultimate continua acionável **durante uma luta real**, sem ficar praticamente impossível e sem ativar cedo demais. Ajustar condição/ordem/cooldowns conforme necessário, preservando a regra de uma ultimate por encontro.
4. A skill deve aparecer no **laboratório VHAZRAEL**, permitir acionamento pelo seletor e funcionar em modo normal de combate. Remover nomes de skills antigas do seletor. Atualizar marcador de versão/cache para forçar módulos corretos e verificar o código importado, não só o número na tela.
5. Não alterar **Throne**, **Thorns**, **Orbital** ou o jogo 3D principal além do estritamente necessário para integração; se modificar por dependência, demonstrar que não houve regressão.

## Testes obrigatórios antes do merge
- Nova skill dura de **4 a 7 s**; alterna vários tiros com trajetórias travadas por disparo; move alvo somente **entre** rajadas. Cenários: alvo parado/andando/correndo/dash: confirmar resultados coerentes sem garantir acerto, fuga possível.
- O efeito de **dano** acontece no contato com a área da explosão, **não** ao iniciar conjuração, e não segue jogador depois do impacto. Dano de fogo só se permanecer na área após impacto, com controle de hits/ticks.
- Destruição, fogo, fumaça e efeitos respondem ao mundo e **somem quando necessário**. Nenhum objeto/colisão residual após reiniciar, matar boss, sair da dimensão ou terminar a magia.
- `VZ.kit` e lab contêm espada, espinhos, bombardeio e meteoro. Nenhuma execução residual de `terror`/`brood` pelo boss, nem invocação nova placeholder.
- A ultimate continua utilizável com novo conjunto de ataques; a espada da Mod252 continua dando dano no momento correto, e espinhos mantêm comportamento anterior.
- Verificar sintaxe JS, testes de regressão existentes, perfis de qualidade, WebGL se disponível e FPS mobile se possível. **Não declarar visual testado sem de fato ter testado.**
- Se ferramenta permitir, anexar pequenas capturas reais da animação por etapas / gravação à PR, e fazer um breve comparativo com referência. Registrar limitações explícitas.
- Criar PR com código concluído, fazer merge após validação; entregar link direto do laboratório do VHAZRAEL com query/cache atual, mais link da PR.

## Regra para economizar o limite do Claude e limpeza
- Trabalhar diretamente lendo este arquivo, os módulos envolvidos e referências; **não retranscrever a especificação no chat**.
- Evitar atualizações repetitivas; só intervir caso haja bloqueio incontornável. Executar tudo na mesma sessão se possível.
- **Depois de implementar e verificar, apagar ESTE arquivo temporário do repositório**, no mesmo PR ou commit de limpeza; não apagar até terminar. Se trabalho incompleto, não apagar e não afirmar conclusão.
- Resposta final **até 10 linhas**: o que excluiu, nome da skill nova, VFX/dano/IA, testes realmente feitos, PR/merge, link do jogo e confirmação de exclusão deste arquivo.
