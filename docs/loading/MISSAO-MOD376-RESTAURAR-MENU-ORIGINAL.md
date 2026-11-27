# MISSÃO TEMPORÁRIA — MOD 376
## Restaurar o menu original das galáxias, corrigir a tela preta e preservar a ordem da abertura cinematográfica

**Repositório:** PHBritoDev/Jogo-2-2.5D  
**Base:** main no commit `3cac2f16e1d5e73ef4142abf4758069437ccda9e` (Mod 375)  
**Branch de trabalho:** `claude/mod376-restaurar-menu-original-corrigir-boot`

## ORDEM PRINCIPAL

O criador testou o Mod 375 em um Galaxy A55 e encontrou dois defeitos visíveis:

1. Ao abrir o jogo, aparece uma tela praticamente toda preta, com apenas o botão pequeno **“TESTAR”** no canto superior esquerdo. A captura mostra o navegador carregado, mas a área do jogo não renderiza o conteúdo esperado.
2. Depois, aparece um menu de planetas/galáxias visualmente genérico e indesejado (captura com anjo branco simplificado à esquerda, demônio preto à direita, título no topo, ícones pequenos e painel de Ganância no canto inferior direito). O criador rejeita essa tela e exige restaurar a composição cinematográfica original, já existente no histórico e nos assets do repositório.

A abertura com Ganância e os quatro Bispos caminhando **NÃO pode aparecer no boot nem antes/durante a tela original dos planetas**. Ela deve ser apresentada somente depois que o jogador concluir a etapa original dos planetas e acionar a entrada no mundo.

Não trate isso como pedido para redesenhar a tela genérica. O objetivo é recuperar a implementação original aprovada, não inventar uma terceira interface.

## 1. Recuperar a tela ORIGINAL aprovada — prioridade máxima

Há evidência e documentação no próprio repositório. Leia integralmente:

- `assets/ui/menu/cinematic/README.md`
- `assets/ui/qa/menu-cinematico-2026-11-15/README.md`
- `galaxies3d.js`
- `galaxies-cinematic-art.js`
- `galaxies-cinematic-models.js`
- `galaxies-cinematic-stage.js`
- `galaxies-gothic-depth.js`
- `galaxies-infernal-art.js`
- `galaxies-infernal-reference.css`
- `galaxies-three-scene.js`
- HTML/CSS/JS atuais que montam o menu e o fluxo de entrada.

Assets originais de arte aprovados:
- `assets/ui/menu/cinematic/environment.webp`
- `assets/ui/menu/cinematic/worlds-hero.webp`

Referências de QA visual real da versão original:
- `assets/ui/qa/menu-cinematico-2026-11-15/before-desktop.png`
- `assets/ui/qa/menu-cinematico-2026-11-15/after-desktop.png`
- `assets/ui/qa/menu-cinematico-2026-11-15/before-mobile.png`
- `assets/ui/qa/menu-cinematico-2026-11-15/after-mobile.png`
- `assets/ui/qa/menu-cinematico-2026-11-15/world-after-enter.png`

A documentação descreve a composição original: anjo pérola à esquerda, demônio orgânico na tempestade à direita, arco fraturado, sete mundos distintos presos por correntes cósmicas, Ganância em destaque no centro, protagonista encapuzado de costas, ruínas e cachoeiras. É uma composição 2.5D original, com os mundos em malhas 3D, correntes instanciadas e controles funcionais. Preserve os controles, progresso real, moedas, requisitos de acesso, configurações e callback de entrada.

**Obrigatório:**
- Descubra por que o menu genérico está sendo exibido no dispositivo em vez da tela original aprovada.
- Restaure a implementação original usando os assets e módulos já existentes. Não substitua por SVGs genéricos, placeholders, ícones planos ou nova arte improvisada.
- Não basta alterar cores, aumentar ícones ou fazer retoques na tela genérica. A composição original precisa voltar.
- Verifique os caminhos de importação, condições de fallback, detecção de WebGL, carregamento dos dois WebP, cache, inicialização do renderer e qualquer flag/branch que esteja escolhendo a interface antiga/genérica.
- A reserva sem WebGL/sem arte deve continuar funcional e elegante, mas não pode ser escolhida quando os assets originais carregarem normalmente.
- Não apagar os assets originais nem a implementação aprovada.

## 2. Corrigir a tela preta do início

Investigue a causa real; não presuma que seja apenas lentidão de rede.

A captura inicial mostra somente fundo preto e o botão “TESTAR”. Reproduza o fluxo real desde uma navegação limpa, em mobile e desktop, com cache frio e quente.

Investigue especialmente:
- estado inicial do `#loading`, `#galaxies` e demais contêineres;
- classes/atributos `hidden`, `aria-hidden`, opacity, visibility, z-index e transições;
- momento em que `game-flow.js` chama `planets()`;
- se o loader está ocultando a camada errada ou removendo a tela antes de o menu original estar pronto;
- falhas de import/export e exceções JavaScript;
- carregamento e decode dos assets `environment.webp` e `worlds-hero.webp`;
- inicialização do canvas/WebGL, resize/orientação e dimensões do viewport;
- se o botão “TESTAR” ou algum modo de QA está indevidamente visível para o jogador;
- se uma promise/rejeição deixa o jogo preso em uma etapa vazia.

Não esconda a tela preta com timeout arbitrário, tela falsa, spinner infinito ou avanço automático. A transição deve ocorrer por estado real: boot/loading → menu original pronto. Se houver erro real, apresente uma recuperação/retry legível, sem deixar a tela vazia.

Preserve o botão “TESTAR” apenas nos contextos de QA/admin em que ele já é intencional; nunca deixe esse botão solitário como único conteúdo visível no fluxo normal do jogador.

## 3. Ordem correta das etapas — sem ambiguidade

O fluxo de jogador deve obedecer:

1. **Boot:** mostrar carregamento discreto e funcional, com progresso real. Nunca mostrar a marcha dos personagens nesta etapa.
2. **Planetas:** exibir a tela ORIGINAL aprovada das sete galáxias, com sua composição 2.5D, controles, progresso e seleção reais. Não mostrar a interface genérica da captura.
3. **Ação do jogador:** ao tocar em ENTRAR na Galáxia 1 (ou no controle de entrada original correspondente), avançar para a etapa cinematográfica.
4. **Cinemática:** somente aqui mostrar a marcha de Ganância e dos quatro Bispos e, conforme a sequência atual do Mod 375, o Campo da Última Guerra.
5. **Mundo:** após prontidão real e gesto explícito do jogador, continuar a entrada original no prólogo/mundo.

A cinemática deve ser chamada exclusivamente na transição **planets → cinematic**. Não pode ser iniciada no boot, no carregamento dos módulos, na primeira pintura da página, nem antes de a tela original dos planetas ter sido exibida.

Leia e audite `game-flow.js` e `docs/loading/LOADING-CINEMATICO-MOD375.md`. O contrato documentado do Mod 375 já prevê `boot → planets → cinematic → world`; se o código real divergir, corrija a integração. Não quebre o comportamento de automação/QA documentado (`?loadingcine=1`, `?loadinggate=1`, `?noloadingcine`) nem permita que esses modos contaminem o fluxo normal do jogador.

Não introduza agora login, tela inicial nova, novas etapas ou redesenho de UX. Apenas deixe a arquitetura compatível com uma etapa futura anterior aos planetas, sem implementá-la.

## 4. Não destruir o trabalho aprovado do Mod 375

Preservar:
- marcha refinada, ritmo e sincronização de pés/chão;
- poses e IK das armas;
- silhuetas e aparência dos cinco personagens;
- Campo da Última Guerra e sequência cinematográfica;
- prontidão real do mundo, progresso e botão de entrada;
- retry/diagnóstico de erros;
- compatibilidade mobile/desktop, cache busting e performance;
- gameplay, saves, HUD, missões e sistemas das galáxias.

Não remover nem simplificar a cinemática. O problema é o momento em que aparece e a tela de planetas errada, não a existência da cena cinematográfica.

## 5. Verificação visual obrigatória

Não considere testes unitários suficientes. Faça QA real em navegador com capturas/evidências da versão exata da branch.

Cobrir no mínimo:
- Android/mobile portrait (390×844 ou 412×915);
- mobile landscape (844×390 ou equivalente);
- desktop (1365×768 ou equivalente);
- primeira visita com cache frio;
- recarga com cache quente;
- WebGL normal;
- fallback sem WebGL ou com falha deliberada dos assets, sem confundir fallback com caminho principal;
- sequência completa boot → menu original → toque em ENTRAR → cinemática → READY → toque → mundo.

Evidências exigidas:
1. captura do boot sem a marcha cinematográfica;
2. captura da tela original dos planetas restaurada;
3. captura/vídeo provando que a marcha só aparece depois da ação de entrada na tela dos planetas;
4. captura da transição READY e entrada no mundo;
5. relatório com erros de console/rede e resultado por viewport.

Compare visualmente a tela restaurada com as evidências originais de 17/11 citadas acima. Não aceite regressão para a interface genérica. Inspecione as imagens; não declare aprovação visual apenas porque o script passou.

## 6. Testes e qualidade

- Corrigir a causa raiz, não mascarar sintomas.
- Adicionar/ajustar testes automatizados que garantam a ordem das etapas e impeçam a cinemática no boot.
- Testar que a tela original é selecionada quando os assets existem e que o fallback só entra quando realmente necessário.
- Executar testes relevantes do fluxo, galáxias, loading e regressões gerais.
- Verificar erros de console, recursos 404, imports quebrados e regressões.
- Se algum teste falhar, investigar e corrigir; não ignorar nem marcar como sucesso artificialmente.
- Não modificar testes para simplesmente aceitar o comportamento incorreto.
- Não declarar Android físico validado se foi usado apenas Chromium/SwiftShader emulado. Diferenciar claramente emulado de dispositivo físico.

## 7. Build, PR e limites

- Implementar em branch própria, partindo da main indicada, sem commits diretos na main.
- Criar PR para main com descrição objetiva e evidências.
- Atualizar `build-info.js` para Mod 376 somente se houver correção de código funcional efetivamente concluída; manter a descrição coerente. Não fazer bump se a mudança ficar apenas em documentação.
- Não mexer nas branches/PRs de outros agentes, não fazer force-push, não fazer merge por conta própria.
- Não adicionar GLBs pesados nem dependências desnecessárias.
- Não alterar gameplay ou assets de mundo fora do escopo.
- Ao final, informar SHA/PR, arquivos alterados, testes e evidências; separar o que foi validado em emulador do que exige o Galaxy A55.

## 8. Apagar este briefing temporário ao concluir

Este arquivo é apenas uma instrução temporária para esta execução. **Leia-o integralmente antes de começar.** Depois de concluir a implementação, os testes e a criação da PR, remova este próprio arquivo `docs/loading/MISSAO-MOD376-RESTAURAR-MENU-ORIGINAL.md` da branch de trabalho e inclua a exclusão na mesma PR. Não apague antes de terminar de executar a missão. Não deixe cópia duplicada do briefing em outro local.

## CRITÉRIO DE CONCLUSÃO

A missão só está concluída quando:
- a tela preta inicial foi corrigida por causa raiz;
- o menu original aprovado de 17/11 voltou a ser a tela principal dos planetas;
- a interface genérica da captura não aparece mais no fluxo normal;
- a marcha cinematográfica não aparece no boot e só surge após o jogador avançar da tela original dos planetas;
- a sequência até o mundo continua funcional;
- testes e evidências demonstram tudo isso;
- a PR está criada e este arquivo temporário foi removido da branch.
