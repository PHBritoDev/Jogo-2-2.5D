# MISSÃO — REVISÃO DA ABERTURA CINEMATOGRÁFICA DOS PECADOS
## Mod alvo: próximo Mod de gameplay após o Mod 374
## Responsável: Claude
## Estado: briefing em preparação; aguardar o criador completar este arquivo antes de executar

> **IMPORTANTE:** O criador vai complementar este briefing em outra conversa, incluindo requisitos visuais adicionais (especialmente olhos e explosões de fundo) e poderá anexar imagens de referência. Não iniciar implementação, não abrir PR de código e não consumir trabalho de agentes até o criador confirmar que terminou de complementar o briefing e enviar a instrução de execução.

---

## 1. Objetivo

Refinar a abertura cinematográfica já existente, conhecida como **“A Marcha dos Pecados”**, sem reconstruí-la do zero e sem quebrar o carregamento real, a barra de progresso, o READY, o retry, o portão de entrada ou a desmontagem da cena.

A versão atual foi introduzida no Mod 374. Antes de alterar qualquer coisa, leia integralmente:
- `docs/loading/LOADING-CINEMATICO-MOD374.md`
- `loading-cinematic3d.js`
- a integração atual em `mundo-3d-prototype.html`
- os testes relacionados e o harness `tools/visual-lab/loading-cinematic-qa.html`

Confirme os caminhos reais no repositório; não presuma que os arquivos continuam exatamente nos mesmos locais.

## 2. Corrigir o momento em que a cinemática aparece

**Problema atual:** a marcha dos Bispos e de Ganância aparece imediatamente quando o jogador entra no jogo.

**Comportamento desejado:** a cinemática deve aparecer **depois da página/tela de seleção dos planetas**, e não antes dela.

Regras:
- Primeiro o jogador vê a página dos planetas já existente.
- Somente depois de escolher/avançar a partir dessa página, no ponto correto do fluxo atual, a marcha cinematográfica deve ser exibida.
- Investigue o fluxo real de navegação e identifique o evento/estado correto. Não use atrasos artificiais (setTimeout) para tentar adivinhar quando a página dos planetas terminou.
- Não deixe a cinemática aparecer simultaneamente por dois caminhos, nem piscar por um frame antes da página dos planetas.
- Não prejudique o carregamento dos assets, o progresso real, o READY, o retry ou o tratamento de erros.
- O jogador ainda deve conseguir entrar somente quando o mundo estiver pronto e pelo mecanismo de entrada já existente.
- **Futuro previsto:** o criador pretende adicionar uma tela inicial anterior, com opções como login. Portanto, mantenha a arquitetura modular: a cinemática deve ser uma etapa explícita do fluxo, fácil de reposicionar quando a futura tela inicial for criada. Não implemente login nem uma nova tela inicial nesta missão.

## 3. Direção visual: somente silhuetas

A versão atual usa olhos, sorrisos/dentes e sangue. O criador não quer mais esses elementos nesta etapa.

Remover completamente da cinemática:
- olhos visíveis, brilhos ou desenhos faciais;
- sorrisos, bocas, dentes ou qualquer recorte facial que pareça expressão;
- sangue, fios de sangue, gotas, manchas e partículas de sangue;
- qualquer vinheta/efeito que revele rostos ou expressões.

**Manter apenas as silhuetas** dos personagens. A identidade deve vir da forma geral do corpo, cabelo/capuz/chifres, postura, armas, proporções e iluminação de recorte — nunca de olhos, dentes ou sangue.

Atenção:
- Não basta escurecer os olhos ou reduzir a opacidade: remova os sistemas e geometrias desnecessários da cena.
- Não remova nem altere olhos/rostos dos modelos usados no gameplay; a mudança é exclusiva da abertura cinematográfica.
- Não transforme os personagens em cinco bonecos genéricos iguais. Preserve a leitura visual individual de cada silhueta.
- Não adicione detalhes faciais novos para compensar a remoção.

## 4. Poses das armas e linguagem corporal

As poses atuais das armas parecem genéricas e pouco naturais. Refaça a coreografia com pesquisa visual e inspeção do rig real. O objetivo é obter poses deliberadas, ameaçadoras, elegantes e anatomicamente plausíveis.

### 4.1 Ganância — duas foices

**Foice da mão esquerda:**
- A lâmina deve ficar baixa, com a ponta/lâmina encostando ou quase encostando no chão durante a caminhada.
- A ponta deve ser arrastada pelo chão de maneira controlada.
- Criar um efeito discreto de contato/raspagem no solo, sincronizado com o movimento e sem parecer faísca genérica exagerada.
- O contato deve respeitar a altura do chão e acompanhar a passada sem atravessar o piso nem flutuar.

**Foice da outra mão:**
- Deve repousar sobre a região do pescoço/ombro, como uma pose de força e domínio: o cabo atravessa a região superior do corpo e a arma termina apoiada no ombro oposto.
- A lâmina fica voltada para cima.
- A pose deve lembrar alguém que sustenta a arma sobre os ombros com naturalidade, sem atravessar pescoço, cabeça ou corpo.
- A mão precisa segurar o cabo de forma convincente; não basta posicionar a arma sem ajustar a mão/antebraço.

Não espelhe as duas foices nem deixe ambas penduradas ao lado do corpo. As duas devem ter silhuetas e funções visuais claramente diferentes.

### 4.2 Bispo que usa foice (ZAR'KHAEL / Bispo 3)

- Identifique no código e no elenco qual é a foice correta e confirme o personagem/arma antes de editar.
- Use uma pose semelhante à foice apoiada entre pescoço e ombro, mas **com a lâmina apontada para baixo**.
- A pose deve ser distinta da de Ganância, mesmo usando a mesma família de postura.
- Corrija a iluminação/material da foice: atualmente ela parece estranha por causa da iluminação. A lâmina precisa ser legível como arma, com volume e recorte coerentes, sem brilho estourado, sem aparência plástica e sem desaparecer na silhueta.
- Não invente uma nova arma nem substitua o asset/construtor real.

### 4.3 Bispo que usa machado (VORGAZHEK / Bispo 2)

- Pesquise referências de poses de marcha com machado pesado e escolha uma postura que transmita peso, ameaça e controle.
- A pose deve parecer confortável para o personagem caminhar carregando o peso do machado, sem braço quebrado, pulso torcido ou arma flutuando.
- Não copie simplesmente a pose da foice.
- O machado deve continuar reconhecível e proporcional. Ajuste mão, punho, cotovelo e ombro em conjunto.

### 4.4 Pesquisa e escolha das poses

Antes de implementar:
- Pesquise referências visuais de poses de foice e machado em fontes públicas, incluindo Pinterest quando acessível, concept art, jogos e fotografia/escultura de referência.
- Busque referências de linguagem corporal de personagens carregando armas grandes durante uma caminhada lenta.
- Use a pesquisa como orientação de postura, equilíbrio e silhueta; não copie arte protegida nem reproduza um personagem específico.
- Registre no relatório quais referências/conceitos influenciaram cada pose e por quê.
- Se uma referência não estiver acessível, não invente que a consultou.

## 5. Ritmo da caminhada e espaçamento

**Problema atual:** os personagens caminham rápido demais, com sensação de pressa e movimento apressado.

Desejado:
- Marcha calma, pesada, controlada e natural.
- Sensação de que os personagens avançam com confiança e ameaça, sem correr nem parecer atrasados.
- Ajustar a velocidade do avanço do chão, o timeScale dos clipes e a sincronização dos pés em conjunto.
- Não reduzir apenas o timeScale de forma isolada: isso pode gerar deslize dos pés, moonwalk ou personagens flutuando.
- Preservar o ciclo de passada e o contato dos pés com o chão.
- Fazer cada personagem caminhar com pequenas diferenças naturais de fase e cadência, sem parecer uma fila sincronizada de robôs.

**Espaçamento:**
- Os personagens estão próximos demais, praticamente colados.
- Separar melhor os cinco personagens tanto horizontalmente quanto em profundidade.
- Manter Ganância como figura central e preservar uma composição equilibrada, com os Bispos legíveis dos dois lados.
- Evitar que armas, braços, pernas ou silhuetas se sobreponham visualmente.
- Conferir a composição em retrato de celular e paisagem/desktop; não resolver o espaçamento em uma proporção e estragar a outra.
- Não afastar tanto a ponto de perder o grupo ou cortar personagens do quadro.

## 6. Iluminação: macabra, aterrorizante e contida

Melhorar a iluminação para transmitir uma atmosfera mais assustadora, sombria, ameaçadora e cinematográfica, **sem exagero**.

Direção:
- Silhuetas predominantemente escuras.
- Recortes de luz discretos e controlados para separar cada personagem do fundo.
- Contraste suficiente para reconhecer as armas e a anatomia externa.
- Evitar luz frontal que revele rostos ou detalhes faciais.
- Evitar brilho estourado, neon gratuito, saturação excessiva, contornos artificiais grossos e aparência de material plástico.
- Luz e sombra devem ajudar a contar a história, não competir com os personagens.
- A foice do Bispo 3 precisa de atenção especial para deixar de parecer estranha sob a iluminação.
- Manter atmosfera ameaçadora, mas legibilidade em telas pequenas.

## 7. Critério de qualidade: não aceitar o genérico

O criador explicitamente pediu que o responsável não trate algo feio ou genérico como aceitável só porque funciona tecnicamente.

Antes de considerar qualquer elemento concluído, avalie:
- A pose parece natural e possível no corpo/rig real?
- A arma parece ter peso e estar realmente sendo segurada?
- A silhueta é distinta e memorável?
- A composição parece intencional ou apenas personagens enfileirados?
- A iluminação valoriza o volume ou apenas deixa tudo escuro/brilhante?
- O efeito de raspagem parece contato físico com o solo ou uma partícula aleatória?
- A caminhada transmite calma e domínio ou pressa?
- O resultado parece um RPG dark fantasy de alto nível ou um protótipo genérico?

Se algo estiver obviamente feio, artificial, desproporcional, mal posicionado ou genérico, corrija imediatamente e volte a avaliar. Não esconda defeitos com escuridão, fumaça, bloom ou efeitos extras.

Se houver dúvida sobre uma pose, faça variações no harness, compare lado a lado e escolha a mais convincente. Não escolha a primeira solução que apenas passa no teste automatizado.

## 8. Restrições técnicas e preservação

- Não modificar gameplay, combate, rigs ou animações dos personagens fora da cena de loading.
- Não substituir os modelos/armas originais por assets genéricos.
- Não importar GLBs completos pesados se a cena atual usa silhuetas otimizadas.
- Preservar o sistema de progresso real, READY, entrada manual, retry, diagnóstico, cache-busting e desmontagem.
- Preservar compatibilidade mobile e desktop.
- Evitar novas dependências em runtime e downloads extras desnecessários.
- Manter pools fixos para partículas/efeitos de raspagem, sem alocação descontrolada por frame.
- Não aumentar sombras dinâmicas ou custo de render sem medir o impacto.
- Não quebrar automação/headless.
- Não fazer merge direto na main. Trabalhar em branch própria e abrir PR para revisão.
- Não mexer em PRs, branches ou arquivos de outros agentes.
- Não atualizar `build-info.js` para alterações apenas documentais. Se houver mudança real de código do jogo, atualizar a versão conforme o padrão vigente e somente após confirmar o estado atual da main.

## 9. Plano de execução — após autorização do criador

1. Ler o registro Mod 374, código, testes e harness.
2. Mapear o fluxo de telas atual e identificar o ponto exato após a página dos planetas.
3. Pesquisar referências de poses e documentar escolhas.
4. Montar testes visuais/variações no harness para as armas e a formação.
5. Implementar a mudança de fluxo e as silhuetas sem detalhes faciais/sangue.
6. Ajustar poses, marcha, espaçamento e iluminação.
7. Corrigir todos os defeitos visuais óbvios encontrados na revisão.
8. Rodar testes unitários, contratos e E2E existentes.
9. Inspecionar capturas em retrato mobile e paisagem desktop, em diferentes tempos da marcha.
10. Verificar que a cinemática só aparece depois da tela dos planetas e que o fluxo futuro pode inserir uma tela inicial antes dela.
11. Registrar evidências e limitações reais. Não alegar teste em Android físico sem fazê-lo.
12. Abrir uma única PR própria, com resumo conciso, arquivos alterados, testes, capturas e limitações.

## 10. Relatório final obrigatório

A PR deve informar:
- Como o fluxo foi alterado e qual evento/estado inicia a cinemática após a página dos planetas.
- Quais sistemas de olhos, sorrisos e sangue foram removidos da cena.
- Posição final de cada arma e como foi validada.
- Como a velocidade da marcha foi ajustada sem deslize dos pés.
- Como o espaçamento se comporta em retrato e paisagem.
- O que foi alterado na iluminação.
- Referências realmente consultadas.
- Testes executados e resultados.
- Evidências visuais antes/depois.
- Limitações que ainda existirem.

**Não declare a missão concluída só porque os testes passaram. A qualidade visual é requisito central.**

---

## 11. Complementos do criador — NÃO EDITAR NEM ANTECIPAR

Esta seção será preenchida pelo criador em outra conversa com requisitos adicionais e referências visuais, incluindo detalhes sobre olhos e explosões de fundo. Preserve os complementos que forem adicionados. Se houver conflito entre um complemento posterior explícito do criador e este briefing, siga a instrução mais recente do criador e registre a decisão.

[AGUARDANDO COMPLEMENTOS DO CRIADOR]
