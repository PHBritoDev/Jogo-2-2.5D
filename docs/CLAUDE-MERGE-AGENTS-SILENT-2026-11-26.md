# Missão Claude — integração silenciosa de melhorias dos agentes (26/11/2026)

## Objetivo
Auditar TODAS as Pull Requests abertas do repositório e integrar na `main` o máximo possível de melhorias reais, úteis e seguras para o jogo. Não faça uma integração cega: investigue código, histórico, ancestralidade, arquivos alterados, dependências, sobreposições e evidências de QA.

## Regra de comunicação — silêncio absoluto
- Trabalhe diretamente no GitHub/repositório, sem conversar com o criador durante a execução.
- Não publique resumos, relatórios em comentários de PR, comentários de commit, mensagens ou notificações desnecessárias.
- Não envie resumo final ao criador. Ao terminar, encerre silenciosamente.
- Este arquivo é sua ordem de execução; não peça confirmação para cada etapa.

## Estado conhecido na abertura da missão
- Repositório: `PHBritoDev/Jogo-2-2.5D`
- Branch principal: `main`
- Último estado consultado: main no commit `5ce0c99c58cfdf9deb5cf4429ee35e9d1d266831`, Mod 370.
- PR #707, branch `codex/integracao-eldoria-mod371`, HEAD `ef5d3280cd13273fb5832ec031fa2904223d7a38`: candidata de integração Mod 371, aberta, não mesclada, mergeable. Ela declara incorporar partes/commits das #692, #702, #703 e #704. Verifique o estado atual antes de agir; estes dados são apenas ponto de partida.
- PR #704 (A3): melhoria do prado/cipós e QA. O próprio registro diz que alguns blobs já estão idênticos à #707, mas quatro caminhos exclusivos da #704 ainda precisam ser preservados se #707 entrar primeiro.
- PR #702 (A2): não mesclar isoladamente segundo seu registro; parte final está incorporada por ancestralidade na #707. Confirmar blobs e histórico.
- PR #703 (A4): produção já está na main pela #706; esta PR ficou com QA/harness e gates próprios pendentes no último registro. Não duplicar produção nem ignorar gates pendentes.
- PR #692 (A1): melhorias de câmera/água e percurso; parte declarada incorporada na #707. Confirmar o que falta e o QA exato.
- PR #691 (A5): HUD de missões e proposta narrativa; o próprio registro informa que documentos narrativos são candidatos NÃO CANÔNICOS e precisam de aprovação do criador. Não tornar narrativa candidata em cânone nem alterar história sem autorização.
- PR #665: jornada Sakura/Invernália em desenvolvimento; estava Draft e não mergeable. Não considerar pronta sem revisar estado, evidências e gameplay.
- Existem PRs antigos de QA, diagnóstico, protótipos e branches obsoletas. Não mesclar ferramentas temporárias, prévias, diagnósticos, instruções para outros agentes ou implementações incompletas como se fossem melhorias de produção.

## Procedimento obrigatório

### 1. Inventário completo e atualizado
- Consulte novamente a lista de TODAS as PRs abertas, sem limitar a análise apenas às mais recentes.
- Leia título, descrição, commits, diff completo, arquivos, comentários/revisões relevantes, checks, workflows, artefatos e estado da branch.
- Identifique o agente/autor e o objetivo de cada PR.
- Compare cada branch com a main atual e também entre PRs candidatas.
- Classifique internamente cada PR: (A) integrar; (B) integrar após completar/corrigir; (C) já incorporada/supersedida; (D) manter separada por depender do criador; (E) rejeitar/não integrar.
- Não confie apenas em `mergeable=true`, título, descrição ou testes estáticos.

### 2. Integração por conteúdo, não por número de PR
- Priorize a candidata integrada #707 se continuar íntegra e se seus gates relevantes passarem; ela pode evitar merges duplicados.
- Se #707 não contiver toda a parte útil de uma PR, integre os arquivos/commits exclusivos que faltarem, sem sobrescrever trabalho válido.
- Verifique a ancestralidade e os blobs para não aplicar duas vezes a mesma mudança.
- Preserve melhorias independentes de todas as divisões A1–A6, Codex, Claude e outros agentes.
- Não faça merge de uma PR inteira quando somente parte dela é útil; extraia seletivamente as mudanças seguras e mantenha o restante isolado.
- Resolva conflitos de verdade, linha por linha, entendendo a intenção de cada lado. Preserve o comportamento correto de ambos quando compatíveis; reimplemente a integração quando necessário. Nunca resolva conflito escolhendo automaticamente `ours` ou `theirs`.
- Se uma melhoria estiver incompleta mas for valiosa, complete a implementação, testes e documentação necessários na branch de integração. Não maquie pendências nem reduza critérios para fazer o CI passar.
- Não edite branches de agentes que ainda estejam trabalhando. Use uma branch de integração própria e deixe branches de origem intactas.

### 3. Critérios para integrar
Integre quando houver benefício claro para o jogo e a alteração:
- estiver realmente implementada, não apenas planejada;
- respeitar a visão e decisões do criador;
- não duplicar código ou comportamento já integrado;
- não introduzir regressão de gameplay, câmera, colisão, combate, mundo, carregamento ou interface;
- preservar mobile e desktop e os perfis gráficos;
- não degradar FPS, memória, draw calls, carregamento ou estabilidade sem justificativa e medição;
- possuir testes adequados e evidência compatível com o risco.

Não integre de jeito nenhum:
- trabalho sem implementação funcional, prévias isoladas, relatórios, diagnósticos temporários ou instruções destinadas a outro agente;
- conteúdo narrativo não aprovado, alterações de cânone, modelos/arte que não foram realmente gerados ou integrados;
- mudanças com falhas de gameplay, regressões, conflitos não resolvidos ou evidências insuficientes;
- alterações redundantes, inferiores à versão já presente, ou que contrariem decisões explícitas do criador.
Se não valer a pena integrar, preserve a branch/PR e não destrua o trabalho original.

### 4. Testes e segurança
- Execute os testes relevantes de cada área alterada e os gates gerais disponíveis: sintaxe, regressões Node, QA de combate, visual/browser, mobile/desktop, auditorias de cena/caverna e performance.
- Inspecione artefatos visuais e relatórios quando existirem; não aceite apenas status verde sem verificar o que o teste realmente cobriu.
- Diferencie Chromium/SwiftShader de GPU Android física. Não alegue FPS real em celular sem medição física.
- Não enfraqueça testes, não apague verificações, não esconda falhas, não transforme testes pulados em aprovados e não invente evidências.
- Se um workflow estiver apenas queued, aguarde/reavalie quando possível; queued não é sucesso.
- Antes de cada merge, confirme base, HEAD exato, ausência de conflitos, checks obrigatórios aprovados e que o conteúdo não foi alterado desde a revisão.
- Faça merges pequenos e verificáveis, na ordem de dependência correta. Após cada integração, reavalie a próxima contra a nova main.
- Não force merge para contornar bloqueios. Não feche PR de origem enquanto houver conteúdo exclusivo útil ainda não integrado.

### 5. Build, cache e preservação
- Atualize `build-info.js` e os cache-busters necessários uma única vez, no final da rodada integrada, para o próximo Mod/BUILD realmente disponível. Não reutilize número já usado por branch paralela; confira o estado atual antes de escolher.
- Preserve compatibilidade de loader, exports, assets, nomes de arquivos, controles mobile e URLs existentes.
- Não remova assets, sistemas, rotas, testes ou documentação úteis só para simplificar conflitos.
- Não toque em segredos, tokens, configurações privadas ou permissões da conta.
- Não faça force-push em branches dos agentes. Não apague branches nem feche PRs antigas sem certeza de que foram supersedidas e sem preservar seu conteúdo útil.

### 6. Entrega
- Deixe as melhorias aprovadas integradas na branch de integração e prepare PR para `main`, ou mescle diretamente apenas quando todos os critérios e proteções do repositório permitirem.
- Se não for seguro mesclar alguma parte, mantenha-a isolada e siga com as demais.
- Garanta que a main não receba uma combinação parcialmente testada.
- Não faça resumo, comentário ou anúncio ao criador. Silêncio total conforme solicitado.

**Prioridade central:** qualidade real do jogo e segurança da main acima da quantidade de merges. O objetivo é integrar o máximo que for realmente bom — não maximizar o número de PRs mescladas.
