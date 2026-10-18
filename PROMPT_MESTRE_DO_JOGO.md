# PROMPT MESTRE — A BATALHA CONTRA OS 7 PECADOS CAPITAIS

> Documento de continuidade para qualquer IA, programador ou colaborador que trabalhar neste projeto. Leia antes de propor ou alterar código.

## 1. Visão do jogo

Estamos criando **A Batalha Contra os 7 Pecados Capitais**, um jogo de ação e fantasia sombria com identidade própria, inspirado na qualidade de combate, apresentação cinematográfica e progressão de jogos como Shadow Fight — sem copiar personagens, artes ou conteúdo protegido.

O protagonista é um personagem de aparência celestial, inicialmente misterioso, com capuz e sem asas. Ele foi enviado por Deus para enfrentar os sete pecados capitais. Ao longo da jornada, poderá conquistar asas, auréolas, equipamentos e poderes celestiais. O universo mistura anjos, demônios, céu, inferno, dimensões próprias para chefes e encantamentos com inspiração bíblica.

O objetivo não é fazer um protótipo genérico: queremos um jogo bonito, imersivo, polido, com personalidade visual e mecânicas que pareçam intencionais.

## 2. Direção visual e de experiência

- Buscar qualidade visual marcante e identidade exclusiva do jogo: iluminação, sombras, efeitos, animações fluidas, cenário vivo e composição cinematográfica.
- Personagens e chefes precisam ter silhuetas, roupas, armas, efeitos e comportamento reconhecíveis — nada de trocar apenas uma skin genérica e considerar o personagem pronto.
- O cenário deve parecer um lugar real e coerente: árvores, raízes, pedras, vegetação, céu, estrelas, água, vento e clima quando fizer sentido. Os efeitos devem ser bonitos, mas sem prejudicar a leitura da luta.
- A câmera, os controles, a interface e as conversas precisam funcionar bem em celular Android, inclusive em telas menores.
- Efeitos de habilidades devem ter impacto e clareza. Não cobrir o protagonista ou o chefe sem necessidade, não deixar objetos/effects presos no cenário e não sacrificar desempenho por enfeites.
- A interface deve ser elegante e compacta, sem painéis de debug ou textos técnicos expostos ao jogador.

## 3. Prioridade atual: migrar o mundo principal para 3D

O projeto tem um mundo/campanha antiga em 2D e um protótipo de mundo 3D separado. **A intenção é substituir o mundo 2D pelo mundo 3D que já construímos**, integrando-o à campanha real — não simplesmente manter o protótipo isolado nem apagar a campanha e suas mecânicas.

Antes de integrar, inspecione a arquitetura existente e identifique o que já funciona em cada lado. Faça a migração por etapas seguras e verificáveis.

Preservar e integrar, conforme a progressão atual do jogo:
- campanha, missões, diálogos e estado de progresso;
- NPCs, pistas, moedas, pedágio, cassino e seus anfitriões;
- portais e dimensões dos chefes;
- inimigos comuns, mini-líderes, bispos, chefes, combate e recompensas;
- colisões, movimentação, câmera e controles mobile;
- desbloqueios e condições de progressão.

Não declare a migração concluída enquanto o mundo 3D não estiver ligado aos sistemas reais da campanha e os caminhos essenciais não tiverem sido testados. Não use uma troca rápida de página que abandone missões, NPCs ou progresso.

## 4. Personagens e narrativa

### Protagonista e Anjo-Guia
O jogador começa como um herói celestial encapuzado e misterioso. O Anjo-Guia explica a missão e orienta o jogador sem interromper desnecessariamente a ação. A narrativa deve ser compreensível, ter peso emocional e aparecer no momento certo.

### Aurélio
Aurélio não pode continuar parecendo um personagem aleatório com uma skin 3D genérica. Investigue seu papel já presente no código e preserve os fatos da campanha que funcionam; depois, dê a ele uma identidade clara, original e coerente com o mundo e com o tema da Ganância, se essa ligação continuar confirmada pela história.

Definir e implementar com intenção:
- aparência/silhueta e elementos visuais únicos;
- personalidade, voz narrativa e motivação;
- por que pede moedas, como reage às escolhas do jogador e que pistas/recompensas oferece;
- como a cena e a conversa introduzem o personagem sem confundir o jogador.

Não inventar uma mudança de história que quebre missões ou diálogos existentes sem conferir primeiro as dependências.

## 5. Conversas cinematográficas exclusivas

Queremos conversas com impacto de quadrinhos/cenas cinematográficas, lembrando a clareza e o ritmo de apresentação de jogos de luta narrativos, mas com **direção artística própria** para este jogo.

As conversas devem:
- ter retratos/expressões, composição, enquadramento, balões ou painéis e transições com propósito;
- usar tipografia, cores, ornamentos e movimento coerentes com o personagem e a cena;
- ser rápidas de ler e fáceis de avançar no celular;
- deixar a ação e o cenário visíveis sempre que possível, sem tapar o jogador ou ocupar a tela toda sem motivo;
- mostrar opções de escolha de forma clara, acessível e consistente;
- adaptar o ritmo a falas curtas e cenas importantes, sem animações demoradas em cada linha;
- continuar funcionando com teclado, toque e os fluxos de diálogo que a campanha já utiliza.

Um painel bonito é apenas o começo: o resultado final precisa parecer parte do universo do jogo, não uma caixa genérica. Se uma conversa cinematográfica exigir tela mais fechada, use isso somente em momentos narrativos adequados.

## 6. Combate, chefes e poderes

O combate deve ter peso e resposta: ataques, alcance de armas, esquiva/bloqueio, impacto, recuperação, gravidade, colisões e efeitos devem combinar visualmente com o que acontece no jogo.

Para Valério e os outros chefes:
- preservar modelos, escalas, animações e correções que já foram estabilizadas;
- não reintroduzir bugs antigos de tamanho, flutuação, chão ou rig;
- ataques e habilidades precisam de alcance, telegraph, cooldown e recuperação legíveis;
- o chefe deve reagir de forma inteligente sem ficar colado ao jogador nem interromper injustamente todas as ações dele;
- efeitos de habilidades precisam terminar corretamente e não deixar árvores, armas, partículas ou objetos em estado quebrado;
- derrotas de chefes devem ter apresentação memorável, coerente com a purificação e com a história.

Não altere sistemas estáveis sem necessidade e sem conferir as dependências.

## 7. Regras obrigatórias de desenvolvimento

1. **Trabalhe como co-criador.** Pode sugerir e implementar melhorias de gameplay, narrativa, visual, acessibilidade, desempenho e qualidade. O criador aceita melhorias — não fique limitado a executar literalmente cada pedido quando houver uma solução claramente melhor.
2. Melhorias devem servir à visão do jogo. Explique de forma curta o benefício e sinalize mudanças grandes de direção; não mude silenciosamente pilares importantes da história.
3. Antes de editar, leia os arquivos e entenda os sistemas relacionados. Não invente IDs, classes, funções, caminhos ou APIs; confirme que existem.
4. Prefira mudanças pequenas, integradas e fáceis de testar. Evite reescritas enormes, dependências desnecessárias e análises intermináveis.
5. Preserve funcionalidades existentes. Não apague missões, NPCs, diálogos, itens, portais ou progresso para facilitar uma implementação.
6. Após cada alteração de código, atualize o marcador numérico visível de modificação, incrementando a sequência correta. Não remova esse marcador.
7. Incremente os parâmetros de cache dos arquivos modificados quando necessário para que o teste no GitHub Pages não carregue arquivos antigos.
8. Depois de alterar o código, forneça um link direto de teste do GitHub Pages, com parâmetro de atualização quando útil. O criador testa principalmente pelo celular Android, então os passos devem ser simples e compatíveis com mobile.
9. Não diga que testou visualmente ou que algo está funcionando sem realmente ter executado/verificado o teste. Diferencie código alterado, verificações estáticas e teste real.
10. Não deixe painéis de debug, logs ou rótulos de desenvolvimento na experiência normal do jogador.
11. Ao trabalhar com assets/modelos/animações, confirme nomes, arquivos e dependências antes de alterar referências. Não substitua assets exclusivos por placeholders genéricos.
12. Ao encontrar uma escolha técnica, priorize a solução mais robusta que preserve a campanha, a experiência mobile e o desempenho.

## 8. Como responder ao criador

- Fale em português brasileiro, de maneira direta, amigável e sem explicações gigantes.
- Chame-o informalmente de “chefe” apenas quando soar natural.
- Ao concluir uma mudança, diga resumidamente o que mudou, o que ainda não foi verificado e entregue o link direto para testar.
- Se encontrar uma melhoria importante, proponha-a proativamente. O criador **autoriza e aceita sugestões e melhorias** para tornar o jogo mais original, bonito, divertido e profissional.
- O criador trabalha principalmente pelo celular e não deve receber instruções que dependam de computador quando houver alternativa prática no mobile.

## 9. Estado atual conhecido — confirme antes de agir

- O repositório principal é `PHBritoDev/Jogo-2-2.5D`, branch `main`.
- A campanha principal permaneceu historicamente 2D, enquanto `mundo-3d-prototype.html` e seu JavaScript são um protótipo 3D separado. A prioridade é integrar o mundo 3D à campanha, sem perder sistemas existentes.
- A interface de diálogos recebeu uma primeira direção visual cinematográfica nas modificações 133/153; isso não significa que a migração do mundo 3D esteja concluída nem que o visual já tenha sido validado no navegador.
- Aurélio precisa de identidade e apresentação intencionais, não apenas de uma skin genérica.
- Sempre confira o estado atual do repositório antes de confiar cegamente nestas notas: o código mais recente é a fonte de verdade.

## Objetivo final

Construir um jogo 3D de fantasia sombria com mundo imersivo, combate satisfatório, personagens memoráveis, narrativa cinematográfica, poderes visualmente incríveis e progressão sólida — bonito e funcional no celular, com qualidade e identidade próprias.