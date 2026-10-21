# Documento de visão — Galáxia 1
## A Batalha Contra os 7 Pecados Capitais

**Status:** especificação de design e roteiro de implementação. Não significa que as funcionalidades descritas já estejam implementadas.

## 1. Objetivo e regras de trabalho

Construir a primeira galáxia como uma campanha 3D de ação e fantasia sombria, com narrativa bíblica, combate responsivo, exploração, personagens memoráveis e progressão justa. A experiência deve funcionar em Android, celular potente ou fraco, notebook e PC.

Este documento é a referência de design para IAs e colaboradores. Antes de alterar código:
1. Ler AGENTS.md, PROMPT_MESTRE_DO_JOGO.md, ARQUITETURA.md e os arquivos envolvidos.
2. Inspecionar o estado real do repositório e do jogo; identificar o que já existe, o que funciona, o que está incompleto e o que está quebrado.
3. Reutilizar e melhorar sistemas existentes. Não duplicar HUD, missões, diálogos, controles, portais, lojas, NPCs ou combate se já houver implementação aproveitável.
4. Não presumir que algo funciona apenas porque existe no código. Testar, registrar o que foi verificado e nunca alegar teste visual não realizado.
5. Preservar os sistemas estáveis e a dimensão 3D do Primeiro Bispo, que deu muito trabalho. Integrar o portal para ela; não reconstruí-la nem substituí-la por um cenário genérico.
6. Fazer mudanças pequenas, isoladas e testáveis. Atualizar o marcador de modificação e o cache dos arquivos quando alterar código.
7. Não apagar arquivos, reescrever histórico Git, alterar a main ou fazer force-push como parte de uma limpeza sem backup e autorização explícita do criador.
8. Não criar placeholders para substituir assets reais nem inventar nomes de arquivos, IDs, funções ou APIs sem verificar.
9. Antes de construir algo novo, procurar se já foi implementado no mundo antigo, no protótipo 3D ou em módulos compartilhados. Migrar/adaptar o sistema, não duplicá-lo.

## 2. Migração 2D para 3D

A intenção final é substituir o mundo principal 2D pelo mundo 3D atual. A campanha, porém, contém sistemas importantes que não podem ser perdidos: missões, diálogos, NPCs, moedas, casino/pistas existentes, combate, recompensas, progresso e desbloqueios.

**A migração só está concluída quando os sistemas reais da campanha estiverem integrados e testados no mundo 3D.** Um iframe ou uma página 3D isolada não conta como migração completa.

- Auditar os sistemas 2D e o protótipo 3D antes de decidir o que reaproveitar.
- Migrar os sistemas úteis e manter um caminho de recuperação durante o desenvolvimento.
- Só retirar o mundo 2D da experiência principal depois de confirmar que nenhum conteúdo essencial ficou para trás.
- Preservar a dimensão 3D existente do Primeiro Bispo. Criar/ligar o portal no mundo de exploração que leve exatamente a essa dimensão.
- Não mexer em escala, rig, colisão, chão, animações ou câmera estáveis sem motivo comprovado.

### Atenção ao cânone do Primeiro Bispo
O histórico contém referências antigas diferentes para o Primeiro Bispo. A dimensão e o personagem 3D atualmente estabelecidos são a referência visual prioritária. Verificar diálogos e dados de campanha legados antes de reutilizá-los; não reintroduzir silenciosamente nomes antigos que contradigam o cânone atual. O nome vigente deve ser consistente em HUD, catálogo, diálogos, missões e loja.

## 3. Tela inicial das sete galáxias

Ao iniciar o jogo, apresentar sete mundos/galáxias conectados por correntes cósmicas. A Galáxia 1 é jogável; as outras ficam bloqueadas, com silhuetas e pistas visuais que despertem curiosidade sem revelar chefes ou cenários secretos.

- Mostrar nome, estado de desbloqueio e progresso de cada galáxia.
- As correntes devem conectar visualmente os mundos, sem criar uma tela poluída.
- Ao derrotar o chefe final da galáxia, executar uma cena curta e legível em que o próximo mundo se liberta das correntes.
- A animação deve ter alternativa em tempo real dentro do jogo; vídeo gerado por IA é opcional e não pode ser requisito para o fluxo funcionar.
- Salvar a progressão para que mundos já desbloqueados continuem disponíveis após fechar o jogo.

## 4. Prólogo e começo da jornada

Antes da exploração, mostrar uma abertura cinematográfica curta: o protagonista é chamado para uma missão divina para enfrentar a corrupção ligada aos sete pecados. Ele não deve parecer um herói genérico; sua fé, dúvidas, coragem e personalidade devem aparecer gradualmente.

Se for usado vídeo externo gerado por IA, preparar também uma versão feita com cenas, câmera, luz e animações do próprio jogo. Não bloquear o jogador numa tela vazia se o vídeo falhar ou não carregar.

Ao entrar no mundo, criar uma breve sensação de despertar: câmera observa o ambiente, olha para um lado e para o outro e revela a floresta, o céu e a lua. Manter a sequência curta, permitir pular após a primeira visualização e não tirar o controle do jogador por tempo excessivo.

O Anjo-Guia aproxima-se e inicia o diálogo. Exemplo de direção de fala, a ser refinado com personalidade e contexto:
- Anjo-Guia: “Despertaste. Este lugar já não reconhece a diferença entre necessidade e cobiça. Antes de seguirmos, preciso saber: como devo chamar-te?”
- Jogador: o nome escolhido pelo jogador.
- Anjo-Guia: “Então guarda esse nome. Haverá quem tente comprá-lo, apagá-lo ou usá-lo contra ti. Eu caminharei contigo, mas as escolhas e a coragem serão tuas.”

Permitir nome personalizado, com validação de tamanho e caracteres, sem aceitar texto ofensivo em sistemas públicos caso futuramente haja multiplayer.

Exibir a entrada do **Ato I** com um título próprio e o nome do Primeiro Bispo. Usar a mesma linguagem visual para os atos seguintes, mas não repetir a mesma animação mecanicamente: cada abertura deve refletir a gravidade crescente da história.

## 5. Interface, controles e configurações

### HUD de combate
O HUD deve ser compacto, claro e adaptável. O jogador começa apenas com espada, ataque, defesa/esquiva e dash/pulo que já estiverem definidos como parte do controle inicial. Habilidades ainda não desbloqueadas não podem ser usadas.

- Quando um poder for desbloqueado, revelar o botão correspondente com uma animação discreta.
- Mostrar cooldown como contagem/anel no próprio botão, sem cobrir o ícone.
- Mostrar custo de mana antes e durante o uso quando relevante.
- No PC, mostrar a tecla correspondente junto ao botão/ícone da ação. Não manter uma lista grande de controles ocupando permanentemente a tela.
- Ataque de espada também deve funcionar pelo clique esquerdo do mouse. Mapear câmera, interação, esquiva, defesa, pulo, dash, magia e pausa com consistência e sem conflitos.
- Mobile deve manter botões táteis confortáveis, sem interferir em zoom, rolagem ou gestos de câmera.
- Oferecer câmera em primeira e terceira pessoa. Primeira pessoa precisa ter combate legível, mira, colisão e feedback; não pode ser apenas esconder o modelo.
- Configurações: qualidade automática e níveis manuais; idioma (começar em PT-BR, preparar inglês e estrutura para outros idiomas); sensibilidade da câmera; volume/música/efeitos; vibração se suportada; tamanho/opacidade dos controles; assistência de navegação; alternância de dicas e acessibilidade.
- A qualidade automática deve escolher um perfil inicial por capacidade do aparelho e poder reduzir efeitos, sombras, resolução interna e distância de desenho se houver queda sustentada de desempenho. Não trocar configurações agressivamente a cada pequena oscilação.
- Não exibir painéis de debug na experiência normal.

## 6. Mapa, navegação e pontos de teleporte

Criar um mapa de exploração com **névoa de guerra**: mostrar com clareza as áreas visitadas e descobertas, enquanto áreas ainda desconhecidas aparecem encobertas. Não revelar localização de chefes, NPCs secretos ou objetivos que o jogador ainda não descobriu.

- Registrar cidades, trilhas, florestas, ruínas, montanhas, cavernas e pontos de interesse à medida que forem explorados.
- A seta de orientação é opcional e pode ser desativada. Com ela desligada, o mapa e o ambiente ainda precisam permitir orientação natural.
- O menu “TP” lista apenas pontos de viagem rápida desbloqueados. Não listar todos os spawns internos ou locais secretos desde o início.
- O jogador precisa descobrir um ponto de viagem rápida e ativá-lo explicitamente (“Registrar ponto”/“Marcar abrigo”) para poder retornar a ele.
- Não permitir teleportar durante combate, cenas cinematográficas, quedas, arenas de chefe ou estados que quebrem a missão.
- Ao morrer, reaparecer no checkpoint seguro mais recente e manter o progresso permitido pela missão. Explicar claramente o que é mantido ou perdido.

## 7. Estrutura narrativa da Galáxia 1

A Galáxia 1 trata da Ganância: uma sociedade na qual pessoas passaram a tratar vidas, juramentos e dignidade como moeda. O Primeiro Bispo controla a etapa inicial desse sistema. O Pecado da Ganância verdadeiro é uma ameaça posterior e distinta; não confundir os dois.

### Ato I — O preço de uma vida
Tema: sacrifícios, crianças desaparecidas, medo e exploração de pessoas vulneráveis.

1. O Anjo-Guia envia o protagonista à cidade para investigar rumores, disfarçando a busca como uma visita comum.
2. A cidade deve parecer habitada: NPCs caminham, conversam, trabalham e vendem itens. Evitar multidões falsas que pesem no aparelho; usar rotinas simples e grupos de NPCs distantes com menor detalhe.
3. O protagonista conversa com um informante. Inicialmente ele nega saber algo. Uma pequena quantia de ouro muda sua disposição, mas a conversa deve mostrar o conflito moral, não transformar todos os NPCs em máquinas de diálogo.
4. O informante revela que crianças estão sendo levadas à floresta como oferendas. O Anjo-Guia explica a gravidade da missão; a missão é aceita automaticamente para manter o ritmo narrativo, sem fingir que há uma escolha real.
5. Ao aceitar, o tempo passa para uma noite mais longa que o dia. A lua 3D com sorriso macabro deve ser grande e detalhada o suficiente para ser vista, sem dominar toda a tela ou prejudicar o desempenho. Incluir vento, folhas, grama, insetos noturnos e áudio espacial discreto.
6. O jogador segue a trilha, encontra crianças presas em gaiolas e inicia uma cena de confronto com três Enemy1.
7. Antes da luta, os inimigos provocam o protagonista com falas cruéis e específicas à situação, sem humor involuntário ou frases genéricas. O protagonista responde com convicção e inspiração bíblica, sem soar como uma lista aleatória de versículos.
8. Após a vitória, uma sequência cinematográfica controlada mostra o protagonista recolhendo a chave, abrindo as gaiolas e libertando as crianças. O jogador não deve conseguir acionar ataques ou interromper a cena de forma acidental; permitir pular cenas já vistas.
9. Um mapa rasgado ou pista deixada pelos inimigos revela uma rota para uma área elevada, ruínas ou passagem escondida. O Anjo-Guia ajuda a interpretar a pista, mas não entrega tudo imediatamente.
10. O jogador escolta as crianças de volta às famílias. NPCs reagem de forma diferente conforme a situação e a ajuda recebida. A missão deve ter consequência emocional, não apenas conceder moedas.
11. Ao longo do ato, introduzir missões opcionais, segredos e pequenas histórias que ampliem o mundo sem desviar do objetivo principal.

### Ato II — A dívida dos vivos
Tema: pobreza extrema, disputa por recursos, roubo e exploração econômica. O mundo torna-se mais perigoso e chuvoso. O dia e a noite voltam a alternar normalmente; se o cenário escolhido for desértico, tempestades de areia podem substituir a chuva.

O Segundo Bispo é **VORGAZHEK — O Arauto das Almas Endividadas**. Frase de direção: “Ouro compra riquezas. Sangue compra tempo. Mas a tua alma… essa já me pertence. Só vieste tarde demais para descobrir.”

A região deve contrastar claramente com a floresta inicial: sugerir um distrito arruinado de comércio, minas e canais de drenagem, ou outra região que se encaixe no código atual sem apagar conteúdo existente. Mostrar como a dívida afeta famílias e escolhas. A chuva precisa afetar som, visibilidade e atmosfera sem esconder inimigos ou reduzir a leitura do combate.

### Ato III — O altar da cobiça
Tema: idolatria do poder e culto público aos Bispos. Neblina e visibilidade reduzida, com cuidado para não cobrir toda a tela com uma camada opaca.

O Terceiro Bispo é **ZAR’KHAEL — O Carrasco do Juízo Eterno**. Frase de direção: “Sobreviveste aos meus irmãos e confundiste isso com força. Ajoelha-te… para que tua última visão seja a mão que apagará tua existência.”

Incluir objetivos para descobrir e derrubar símbolos de idolatria, revelar quem financia o culto e proteger pessoas que ainda resistem. Não fazer todas as missões serem apenas ondas de inimigos; combinar investigação, travessia, escolhas e combate.

A partir deste ato, desbloquear um torneio/coliseu opcional com dez combates individuais e recompensas crescentes. Deve ser rejogável, ter limites de recompensa para não quebrar a economia e usar inimigos progressivamente mais fortes.

### Ato IV — Quando ninguém mais se lembra de amar
Tema: desumanização. Pessoas tornaram-se máquinas de matar; alguns NPCs são corrompidos e transformados em inimigos. Distinguir inimigos realmente corrompidos de civis para evitar mortes injustas. O Quarto Bispo deve ter identidade e ambiente exclusivos, escolhidos após avaliar os assets e as regiões existentes.

Nome provisório sugerido: **VÉRAXION — O Custódio do Último Selo**. É uma sugestão de design, não cânone fechado; pode ser refinada sem copiar os outros Bispos.

Cada ato deve aprofundar o mistério, aumentar as consequências e dar um objetivo concreto. Os Bispos podem vangloriar-se da crueldade dos irmãos, mas cada um deve revelar uma dimensão diferente do sistema, em vez de repetir a mesma fala.

## 8. Portal e conclusão do Ato I

O portal para a dimensão do Primeiro Bispo fica no topo ou no interior de uma montanha, alcançado após uma jornada pela floresta. Deve ser um marco visual importante, visível à distância e integrado ao relevo.

Antes de entrar:
- Criar encontros em ondas bem espaçadas, com grupos e composição variados, sem colocar inimigos demais ao mesmo tempo.
- O último encontro é um mini-chefe baseado no Enemy1, maior e mais resistente, com variação de comportamento e uma habilidade extra. Não simplesmente aumentar a escala sem revisar rig, colisão e animação.
- Definir checkpoints/spawns seguros antes dos trechos longos.
- Depois da vitória, iniciar uma cena: o protagonista caminha até o portal; o Anjo-Guia deseja boa sorte e revela um detalhe pessoal que aprofunda a relação entre os dois. O portal puxa o protagonista e inicia a dimensão já existente do Primeiro Bispo.
- O portal deve levar à dimensão 3D atual, preservando-a. Não construir uma arena substituta.

## 9. Loja central e economia

Criar ou adaptar uma loja física grande, reconhecível à distância e localizada num ponto central seguro da região. Por fora, ela deve parecer importante; por dentro, a navegação precisa ser simples e sem excesso de telas.

O Anjo-Guia pode acompanhar o jogador e explicar os sistemas na primeira visita. Dividir a loja em setores distintos:
- **Câmara das Escrituras:** poderes celestiais.
- **Arsenal das Lâminas:** espadas, estilos, atributos e habilidade especial de cada espada quando aplicável.
- **Salão das Conquistas:** desafios e recompensas permanentes.
- **Arquivo dos Inimigos:** catálogo de inimigos encontrados.
- **Câmara dos Fragmentos:** visível como conteúdo futuro, bloqueada até a Galáxia 4, sem permitir compra antecipada.

Não mostrar na loja poderes de outras galáxias. Dentro da Galáxia 1, listar apenas os itens pertinentes à progressão já alcançada. Itens bloqueados podem ser apresentados em setores ainda não liberados com cadeado e explicação curta; não exibir um catálogo de conteúdo futuro que revele segredos.

### Requisitos para compra
O ouro sozinho nunca deve permitir comprar um item antes dos requisitos de ato e nível. Cada item declara:
- galáxia e ato mínimo;
- nível mínimo;
- custo em ouro e/ou outros recursos;
- condições de missão, se houver;
- cooldown, custo de mana e atributos, quando for habilidade;
- motivo claro de bloqueio.

Exemplo de mensagem: “Disponível após concluir o Ato II — A Dívida dos Vivos.” Ao completar o requisito, executar uma breve animação de cadeado abrindo e explicar o desbloqueio.

O jogador pode experimentar visualmente o poder em uma área de treino isolada da loja. O teste deve usar estado temporário, não gastar recursos, não causar dano no mundo real, não concluir missões e não transferir cooldowns ou efeitos para o combate normal.

### Conquistas
Exemplos: vencer determinado inimigo, causar certa quantidade de dano, concluir um combate sem ser atingido, executar combos, defender no momento correto, explorar uma área secreta ou salvar civis.

Recompensas possíveis: ouro, bônus modestos de dano/vida, recuperação de mana ou cosméticos. Evitar bônus permanentes tão fortes que tornem a campanha trivial. Mostrar objetivo, progresso, recompensa e condição de conclusão. Recompensar descoberta de inimigos uma vez; dar bônus adicional por completar o catálogo de um ato, se isso não criar repetição excessiva.

### Ouro, diamantes e compras
- Ouro é a moeda comum da campanha; preços e recompensas precisam escalar com ato, nível e poder aquisitivo esperado do jogador.
- Diamantes são recurso premium/futuro. Preparar a arquitetura sem exigir sistema de pagamento agora.
- Futuras compras de ouro, passes e vidas devem usar preços e pacotes proporcionais à progressão, nunca quantias absurdas ou inúteis.
- Não fazer o avanço da história depender de compra com dinheiro real. Anúncios opcionais não devem interromper combates ou cenas.
- Qualquer loja real futura deve apresentar preços, conteúdo e confirmação de compra de forma clara, sem induzir compras acidentais.

## 10. Catálogo de inimigos

O catálogo mostra grupos por ato/Bispo. Inimigos ainda não encontrados aparecem como silhuetas escuras, sem revelar aparência, nome secreto, habilidades ou lore que o jogador ainda não descobriu.

Quando o jogador encontra e derrota um inimigo pela primeira vez, sua silhueta é substituída pela imagem desbloqueada, com descrição curta, classe e registro de descoberta. Não revelar o modelo completo apenas por abrir o menu.

Regras de hierarquia:
- Ato I: Enemy1 e suas variações pertencentes ao Primeiro Bispo.
- Ato II: Enemy2 e variações do Segundo Bispo.
- Ato III: Enemy3 e variações do Terceiro Bispo.
- Ato IV: Enemy4 e variações do Quarto Bispo.
- O Pecado da Ganância é um chefe distinto, reservado para o arco final. Não introduzir Enemy2/3/4 como inimigos comuns do Ato I, exceto se a história justificar explicitamente uma pista visual sem combate.

## 11. Perfil, salvamento e conta

O perfil mostra retrato do protagonista, nome, nível, vida, mana e tempo de jogo. Ao abrir o perfil, permitir alterar o nome e, futuramente, escolher uma imagem apropriada. Se houver limite de mudanças gratuitas, informar antes de confirmar; não implementar limite pago sem um motivo de design claro.

Primeiro, usar salvamento local confiável para progresso, missões, itens, configurações, pontos de viagem e galáxias desbloqueadas. Depois integrar Supabase com migração e sincronização testadas, autenticação Google/Facebook conforme as políticas atuais dos provedores e recuperação de conta.

Adicionar opção de excluir conta apenas quando a autenticação estiver implementada. Exigir confirmação explícita, explicar que a exclusão é permanente e cumprir as regras de privacidade e exclusão dos dados. Não simular login nem afirmar que o progresso está na nuvem enquanto isso não existir.

## 12. Sistema de corações

Proposta inicial para teste de balanceamento: dez corações; perder um ao morrer em um combate de chefe ou evento de alto risco; regenerar um a cada três minutos, com o temporizador claramente visível. Ajustar após playtests.

- Morte contra inimigos comuns não deve bloquear o jogador de continuar explorando e aprendendo.
- Sem corações, o jogador pode continuar explorar e enfrentar inimigos comuns, mas precisa recuperar ao menos um coração antes de desafiar um Bispo ou o Pecado.
- Explicar o sistema por meio do Anjo-Guia sem quebrar o clima narrativo.
- Permitir aguardar regeneração; anúncios opcionais podem conceder uma recuperação limitada se a plataforma permitir. Compras futuras são opcionais.
- Nunca obrigar compra ou anúncio para concluir a campanha principal. Não incluir passe de vidas infinitas até haver análise de equilíbrio e de plataforma.
- Evitar que o sistema transforme uma derrota em longos períodos sem gameplay. Considerar itens conquistáveis dentro do jogo como recuperação alternativa.

## 13. Progressão de nível, espadas e poderes

A progressão deve ensinar as mecânicas em etapas. Os números abaixo são uma direção de design inicial; validar no combate antes de fixá-los.

- Início: espada inicial e combate básico. Ensinar ataque, defesa/esquiva, dash, pulo, câmera e interação.
- Antes do Primeiro Bispo: desbloquear e comprar uma segunda espada e duas habilidades celestiais (Skill 1 e Skill 2), com níveis e missões adequados. A luta deve ser vencível sem Skill 3 ou ultimate.
- Após derrotar o Primeiro Bispo: liberar Skill 3 para compra e mostrar a transição para o próximo ato.
- Antes do Segundo Bispo: liberar a ultimate da Galáxia 1 por nível, missão e custo altos, para ser uma ferramenta rara, não um botão de spam.
- Após derrotar o Segundo Bispo / início do Ato III: desbloquear nova espada e novas Skill 1 e Skill 2 correspondentes à etapa atual.
- No Ato IV: liberar Skill 3 e ultimate da etapa avançada, de acordo com nível, missão e economia.
- A terceira espada da Galáxia 1 deve ficar disponível antes da luta do Terceiro Bispo, conforme os requisitos definidos na campanha.
- O desbloqueio de cada item deve depender do ato e do nível, não apenas do ouro. O ato desbloqueia a oferta; o nível e o custo podem continuar necessários para a compra.
- Não usar cooldown ou custo de mana iguais para tudo. Habilidades leves têm recuperação curta; habilidades de grande área ou alto dano custam mais mana e têm cooldown maior. A ultimate deve exigir recurso raro, condição clara e recuperação longa.
- Mana deve ter máximo, custo por habilidade, regeneração controlada e feedback visual. Ataques básicos podem recuperar uma quantidade pequena em acertos confirmados, com limite por intervalo para impedir exploração.
- Cada espada tem silhueta, postura, ritmo e efeito próprios. A primeira não tem habilidade especial ativa; a partir da segunda espada, cada espada pode ter uma habilidade própria.
- Inimigos a partir do Enemy3 podem ter habilidade própria de arma, com telegraph e contrajogo.
- Espadas celestiais usam rastros de luz próprios; armas sombrias usam rastros escuros e diferentes por classe. Efeitos não podem ocultar o contato da lâmina ou impedir leitura de golpes.

## 14. Combate e IA

Pesquisar e aplicar técnicas reais de game development antes de implementar habilidades: telegraph legível, janela de esquiva, hitbox consistente, recovery, prioridade de animação, máquina de estados, pooling de partículas, instancing e limites de efeitos. Não copiar diretamente habilidades, modelos, música ou personagens de outros jogos.

### Comportamento
- Enemy1: subordinado do Primeiro Bispo, luta com o kit compatível com suas animações reais. Não entrar em loop de pulo, não causar dano antes de o ataque conectar e não permanecer atacando sem intervalo.
- Enemy2/3/4: cada família pertence ao ato do seu Bispo, com identidade e dificuldade próprias.
- Hierarquia de inteligência: Enemy1 < Enemy2 < Enemy3 < Enemy4 < Primeiro Bispo < Segundo < Terceiro < Quarto < Pecado da Ganância. Isso significa decisões melhores, não simplesmente mais vida/dano ou trapaças.
- Inimigos devem alternar aproximação, ataque, defesa, esquiva e recuo conforme distância, recursos e estado. Usar cooldowns, pausas, limites de combos e vulnerabilidade após golpes fortes. Não reagir instantaneamente a todo input do jogador.
- Chefes podem ganhar agressividade em limiares de vida, com mudança de padrão anunciada visualmente. Fúria não deve remover todas as janelas de resposta.
- A câmera deve enquadrar ambos os combatentes, manter o alvo visível e evitar atravessar cenário. Oferecer alvo travado quando adequado, com controle manual de câmera.
- Combate em primeira pessoa precisa ter animações/efeitos visíveis, hit feedback, áudio espacial e mira coerente, sem perder o sentido da posição dos inimigos.

### Uso das animações existentes
Inspecionar os clips dentro de cada GLB e conferir visualmente ou por preview o movimento real; não confiar apenas no nome. Fazer uma tabela clip → ação → duração → loop → compatibilidade de rig antes de remapear.

Mapeamentos relatados pelo criador, a confirmar no asset:
- Enemy1: mover a mão, animação semelhante a falar/respirar, ataque com mão/unhas, “block” que parece dash lateral, dash frontal, caminhada, corrida e giro de corte.
- Bispo2, Bispo3 e Bispo4: respiração, caminhada, tomar dano, cair/morrer, pose de magia e dois clipes de ataque/combo, com nomes específicos a conferir.
- Pecado da Ganância formas 1/2/3: respirar, tomar dano, andar/correr, erguer-se, morrer e habilidades; a forma 3 inclui animações de caminhada extra.
- Enemy3 e Enemy4: respirar, dash, andar, atacar, combo triplo, correr, morrer e habilidade 3.
- Enemy2: ainda não há animações confirmadas.
- Protagonista e Anjo-Guia: clips relatados incluem respirar, falar, andar/correr, ataque, pulo e dash; verificar o arquivo real.
- NPCs: braços cruzados, alerta, correr, caminhar e gestos; verificar clips e evitar usar uma animação de fala como idle sem confirmar.

Usar a animação de “erguer” para transição de fase apenas se o clip realmente representar levantar-se e o timing encaixar. Não compartilhar animações entre rigs sem testar retargeting, pose, pés, escala e orientação. Se faltar animação, preferir uma adaptação curta com rig compatível ou gerar um clip novo; não forçar um clip incorreto.

## 15. Habilidades celestiais e sombrias

Poderes do protagonista devem ter identidade de luz e inspiração bíblica; poderes dos inimigos e Bispos usam linguagem visual sombria própria. Cada poder precisa de propósito de gameplay, telegraph, custo, cooldown, duração, hitbox, dano, resposta audiovisual e limpeza de efeitos.

Ideias a desenvolver com pesquisa e protótipo: chuva de meteoros celestiais, mão do abismo, múltiplas espadas invocadas, ira divina, espada celestial, ataque purificante e sombra do vazio. Não implementar tudo de uma vez; priorizar o que cabe na progressão da Galáxia 1 e reutilizar os sistemas existentes.

### Ultimate do protagonista
A versão atual relatada tem problemas: círculo mágico branco/sem identidade, impacto fraco e falta de raios/efeitos de destruição. Melhorar a composição, cores, câmera, som, telegraph e impacto. O versículo deve combinar com a situação e ser apresentado como fala narrativa, sem rótulo técnico de “versículo aleatório”. Uma direção possível para momento de luz e coragem é: “O Senhor é a minha luz e a minha salvação; de quem terei medo?” O uso final deve respeitar o texto bíblico e o contexto.

### Ultimate do Bispo
A ideia de buraco negro deve seguir uma sequência clara: núcleo pequeno, atração de árvores/grama e partículas, aumento de massa, ápice visual e lançamento/impacto contra o jogador. Objetos absorvidos precisam ser restaurados/removidos corretamente e o cenário não pode ficar quebrado por acidente. A habilidade deve causar dano real, ter contrajogo e não aprisionar a câmera ou lançar personagens para fora do mapa.

## 16. Apresentação de chefes e cenas cinematográficas

Cada Bispo precisa de apresentação, silhueta, ritmo, diálogo, música e efeitos exclusivos. O Primeiro Bispo deve preservar sua dimensão existente.

- Antes da luta: conversa curta com tensão, seguida de controle devolvido ao jogador.
- Durante a luta: provocações ocasionais em texto discreto, sem exigir clique e sem cobrir a HUD, o alvo ou o combate.
- Na vitória: travar ações de combate de forma segura, executar a cena de derrota e as últimas palavras do Bispo, com câmera intencional e possibilidade de pular cenas já vistas.
- O Bispo pode alertar sobre o seguinte, mas com informação nova e específica, não apenas chamar o próximo de “mais cruel”.
- Após a derrota: conceder a recompensa uma única vez, registrar progresso, sair da dimensão e apresentar a abertura do próximo ato.

Usar versículos com contexto e pertinência à fala do inimigo. A fala do protagonista não deve parecer aleatória ou transformar toda batalha em uma lista de citações.

## 17. Arco final: Pecado da Ganância

Após completar os quatro atos e derrotar os quatro Bispos, revelar que eles e seus subordinados eram humanos que venderam a alma em troca de poder, riqueza ou controle. A revelação deve respeitar as pistas colocadas ao longo da campanha, não surgir do nada.

Cada Bispo deixa uma fenda/fragmento espacial. Juntar os quatro permite abrir o caminho à dimensão do Pecado da Ganância.

A dimensão final deve ser um vazio escuro e vasto, povoado por olhos ameaçadores em diferentes distâncias e escalas. O chefe precisa permanecer legível e seus ataques devem contrastar com a escuridão. Não criar apenas um fundo preto: usar profundidade, silhuetas, distorção espacial e sons que deem escala sem poluir a imagem.

Antes do portal final, os quatro Bispos aparecem e tentam impedir o protagonista. Eles explicam, por falas próprias, que já se uniram contra o Pecado e precisaram selá-lo; não querem que o protagonista seja derrotado e abra caminho para a destruição do mundo. O confronto final contra eles ocorre um por vez. Se o jogador morrer, reinicia essa sequência conforme a regra de dificuldade escolhida, informada antes de entrar; não apagar o restante do progresso da campanha sem aviso claro.

Depois, enfrentar Ganância em três formas: Ganancia1 → Ganancia2 → Ganancia3. Cada forma precisa de transição visual e mecânica, não apenas trocar o modelo. A forma 2 pode usar a animação de erguer-se se o clip for compatível. Morrer durante a sequência reinicia o confronto conforme a regra anunciada.

Ao vencer, mostrar a dimensão se desfazendo, o protagonista retornando ao mundo e as rachaduras se fechando. Bispos, inimigos e Ganância retornam à forma humana; as conversas reconhecem as consequências e permitem um encerramento emocional. O Anjo-Guia parabeniza o protagonista com uma conversa pessoal, baseada na jornada vivida, e abre uma passagem para a tela das galáxias. A corrente da Galáxia 2 se rompe e uma nova jornada é apresentada, sem começar sua implementação neste escopo.

## 18. Áudio e atmosfera

Usar sons contextuais com volume controlado:
- vento, folhas, grama, galhos, insetos noturnos e sons próprios de madrugada;
- passos diferentes para solo, grama, pedra e superfícies internas;
- respiração, dash, espada, bloqueio, impacto, magia e reações de dano;
- chuva e trovões quando o ato exigir;
- música de exploração discreta e trilhas de combate próprias para mini-chefes e Bispos.

A trilha deve criar tensão sem copiar músicas de Shadow Fight ou de outras obras. Fazer fade-in/fade-out, evitar sobreposição de múltiplos loops e oferecer controles separados para música, ambiente e efeitos.

## 19. Desempenho, qualidade e assets 3D

Alvo: qualidade alta em PCs/notebooks fortes e degradação controlada em celulares fracos. Evitar picos de CPU/GPU e carregamentos de todos os assets de todos os atos de uma vez.

- Carregar por região/ato; descarregar assets e efeitos que não são mais necessários.
- Usar instancing para vegetação repetida quando apropriado, LOD ou versões simplificadas para objetos distantes, frustum culling, pooling de partículas e limite de luzes/sombras dinâmicas.
- Não criar milhares de meshes independentes para folhas, grama, olhos ou espadas se instancing ou partículas agrupadas resolverem.
- Ajustar pixel ratio, sombras, distância de desenho, densidade de partículas e efeitos conforme perfil gráfico.
- Otimizar GLB preservando a qualidade visual: medir primeiro; identificar se o peso está em geometria, animações ou texturas; testar compressão de geometria (Meshopt/Draco quando compatível), texturas KTX2/Basis e redução de texturas apenas quando não causar perda perceptível.
- Confirmar suporte e configurar os decodificadores no GLTFLoader antes de publicar arquivos comprimidos. Manter backup e comparação visual de cada modelo otimizado.
- Não sobrescrever o GLB atual sem comparação de tamanho, materiais, rig, animações, escala e teste no jogo.
- Sombras de alta qualidade e pós-processamento devem ser opcionais e graduais; nunca presumir que todo aparelho aguenta o perfil máximo.

## 20. Testes de aceitação

Antes de marcar uma etapa como concluída, testar e registrar:

1. Início, escolha de nome, prólogo e transição para o mundo.
2. Controles mobile e PC; ataque por mouse; câmera em primeira/terceira pessoa.
3. HUD, cooldown, mana, bloqueio de habilidades não desbloqueadas e pausa.
4. Missões principais em sequência, diálogos, cenas, chaves, recompensas e persistência após recarregar.
5. NPCs, loja, prévia de habilidades, catálogo, mapa e pontos de viagem rápida.
6. Colisão com cenário, inimigos e portais; animações sem flutuar, deslizar ou ficar presas.
7. Enemy1 só recebe dano quando o golpe conecta; IA não entra em loop; chefes têm telegraph, cooldown e recuperação.
8. Derrota e retorno ao checkpoint; corações; reentrada em chefe.
9. Desbloqueio dos atos, itens, galáxias e transições cinematográficas.
10. Performance em perfil baixo e alto, com atenção a FPS, tempo de carregamento e memória.
11. Console sem erros relevantes, arquivos de assets carregando corretamente e sem efeitos presos.
12. Nunca declarar teste em dispositivo real sem realmente executá-lo.

## 21. Auditoria separada de armazenamento e histórico Git

Essa tarefa é independente do design e deve começar com inspeção, sem deletar nada.

1. Inventariar o estado atual e o histórico Git completo: caminhos, tamanhos dos blobs, arquivos grandes, duplicatas exatas, versões antigas de GLB/PNG e arquivos sem referências aparentes.
2. Verificar referências estáticas e dinâmicas, importações, loaders, URLs construídas, snippets, caminhos reescritos e carregamento de assets em páginas de teste. Uma busca textual isolada não prova que um arquivo está sem uso.
3. Calcular tamanhos atuais e históricos quando a API/histórico permitir. Separar claramente: arquivos atuais, blobs antigos só no histórico e arquivos cujo uso ainda é incerto.
4. Produzir lista de candidatos à remoção, evidências de uso/não uso, tamanho e risco. Não remover assets apenas por serem antigos ou grandes.
5. Para otimização, gerar cópias em branch/cópia separada, medir redução e comparar qualidade visual, materiais, texturas, rig, animações e funcionamento.
6. Para limpar o histórico, estudar git-filter-repo e executar análise primeiro. Criar backup recuperável independente, explicar impactos em hashes, branches, tags, forks e PRs e pedir autorização explícita antes de reescrever histórico ou forçar atualização remota.
7. Não alterar a main nem fazer force-push durante a auditoria sem autorização. Trabalhar em branch de limpeza ou clone separado.
8. Entregar relatório final com removidos (se autorizados), espaço estimado liberado, limitações da medição e testes realmente realizados.

## 22. Ordem de prioridade sugerida

1. Confirmar a arquitetura atual e proteger a dimensão do Primeiro Bispo.
2. Integrar o mundo 3D à campanha real sem perder missões e NPCs.
3. Garantir movimento, câmera, HUD e combate básico sólidos.
4. Construir o fluxo do Ato I e a sequência de resgate das crianças.
5. Integrar portal, mini-chefe e dimensão do Primeiro Bispo.
6. Implementar progressão, loja, desbloqueios, mapa, catálogo e salvamento.
7. Polir animações, habilidades, chefes, cenas, som e qualidade adaptativa.
8. Expandir atos seguintes somente após validar o Ato I.
9. Fazer auditoria de armazenamento e otimização de assets em trilha separada, sem misturar limpeza com alterações de gameplay.

**Regra final:** a visão é ambiciosa, mas a implementação deve ser incremental. Entregar um Ato I realmente jogável e consistente é mais importante do que adicionar muitos sistemas pela metade.