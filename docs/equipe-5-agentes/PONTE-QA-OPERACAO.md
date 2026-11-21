# QA visual entre rodadas

## Protocolo executivo prioritário — conclusão de captura e continuidade (21/11/2026)

**Esta seção prevalece sobre instruções antigas de encerrar a rodada apenas por solicitar um vídeo, por falha inicial de DNS ou por falta temporária de artefatos.** A entrega só está completa quando o resultado da mudança foi realmente validado e a PR avançou, ou quando um bloqueio incontornável foi demonstrado e o estado foi persistido. Não é possível manter uma execução ChatGPT acordada indefinidamente: permaneça ativo enquanto houver chamadas e trabalho útil disponíveis na execução atual; se o limite da sessão chegar, faça checkpoint e retome automaticamente na próxima ativação horária, **sem recomeçar o diagnóstico**.

### Máquina de estados operacional — consultar sempre o SHA exato

1. **ANTES DE DISPARAR:** confira PR aberta, branch, HEAD SHA completo e se já existe execução/artefato desse SHA. Não peça captura duplicada. A varredura de push/PR pode gerar evidência suficiente — utilize-a se mostrar o problema e o SHA correto, ainda que não seja o botão manual.
2. **CAPTURA SOLICITADA:** se tiver ferramenta de workflow_dispatch com autorização e parâmetros compatíveis, inicie na branch da PR; se não tiver, inclua na PR uma única solicitação operacional com URL do workflow, branch, agente, cenário e vídeo, e prossiga na mesma rodada fazendo testes, inspecionando código, corrigindo falhas ou preparando análise. Não afirme que disparou se não disparou.
3. **CAPTURA EM EXECUÇÃO:** cheque status da execução e jobs; enquanto roda, use tempo em outras etapas úteis da MESMA PR (testes, revisão do diff, comparação com main, instrumentação, análise do relatório anterior). Faça ao menos uma nova consulta antes de terminar a execução atual, se ferramentas permitirem, sem spam/polling incessante. Se terminar, vá IMEDIATAMENTE para artefatos; não conclua com a frase obsoleta "a gravação ainda está rodando".
4. **CAPTURA CONCLUÍDA:** verifique `conclusion`, `head_sha`, branch e artefatos; **sucesso de Actions não é aprovação visual**. Baixe e abra fotos em resolução legível, vídeo completo ou quadros representativos de início/meio/fim, manifest e relatório. Se a ferramenta só fornecer referência de ZIP e não acesso ao conteúdo visual, registre exatamente essa limitação e peça inspeção pelo canal compatível; não invente avaliação das imagens. Se uma varredura do HEAD já trouxe mídia suficiente, não imponha novo vídeo manual sem necessidade.
5. **DECISÃO:** compare antes/depois no mesmo cenário, ângulo, clima e parâmetros, verifique gameplay e regressões, ajuste o código na mesma branch se necessário, execute testes e peça captura do NOVO SHA somente quando necessário. Resultados visuais falsos positivos ou queda de densidade/iluminação/câmera devem bloquear a promoção. Com visual, testes e conflitos aprovados, marque PR pronta para revisão; merge somente conforme autorização do criador/regras do agente.
6. **SE A RODADA PRECISAR PARAR:** comentário único na PR: `A# | estado | SHA | run URL | artefato/link | evidência vista | pendência objetiva | próxima ação`. **Primeira ação útil da rodada seguinte é retomar essa execução ou artefato**, não escolher outra tarefa. A tarefa permanece pendente; não diga "concluído" por ter solicitado QA. Não reforce o horário fazendo espera por relógio em segundo plano.

**Eficiência:** consulta orientada a evento e status, sem loop infinito, sleeps longos, relançamentos ou custo repetido; máximo uma captura por SHA e dois pedidos por PR por rodada. Implemente primeiro, capture depois, corrija conforme evidência, não deixe um vídeo impedir desenvolvimento independente seguro. Se a captura não puder ser iniciada sem ação humana, informar precisamente uma única ação que o operador deve fazer; não ficar esperando por um comando impossível.

### Prioridade por especialidade

- **A1:** defeito perceptível reproduzido (câmera, colisão, dash, travadas, save), regressão de comportamento e percurso filmado.
- **A2:** contato, dano em todos os hits, IA, animação e VFX em ação completa; não aceitar quadro isolado como prova de combate.
- **A3:** PR #631 tem prioridade até revisão visual do mesmo SHA e verificação de clareiras/vegetação, inclusive usando a varredura já existente quando suficiente.
- **A4:** comparar iluminação no MESMO ponto e horário, cuidar da legibilidade e do custo mobile, evitar conflito com A7/Claude.
- **A5:** missão jogável e progressão persistente, diálogos e gatilhos; imagem bonita não comprova narrativa executável.


A cada despertar, leia integralmente o contrato do seu agente. Retome o último comentário de checkpoint na PR do item e confira o HEAD. A issue [#519](https://github.com/PHBritoDev/Jogo-2-2.5D/issues/519) coordena prioridades. O agendamento do ChatGPT inicia a rodada seguinte. Um comentário apenas conserva o estado.

## Captura dirigida

1. Abra a PR da sua branch para main. Registre SHA completo, hipótese visível e enquadramento. Consulte uma vez a execução já associada ao SHA. Use uma PR por item.
2. No [Agente de cenas](https://github.com/PHBritoDev/Jogo-2-2.5D/actions/workflows/agente-cenas.yml), escolha **Run workflow**, selecione a **branch da PR**, informe agente e cenário. Deixe o campo de confirmação vazio para usar a branch selecionada, ou informe o número da PR. O modo legado conserva o fotógrafo JSON original. Para o piloto A1 use `floresta-percurso` e marque vídeo para avaliar a caminhada. Para uma foto da praça ou dos comerciantes use `vila-praca` ou `vila-vendedores`. O campo `cenas` é exclusivo do legado.
3. Sem botão ou ferramenta de dispatch, registre `QA_SOLICITADO / aguardando_autorizacao_captura` com esse link. Um operador com Actions write pode disparar na ref indicada. Limite de uma captura por SHA e dois pedidos por PR na rodada de uma hora. Um patch abre nova possibilidade. Em status desconhecido, consulte a execução anterior. O preflight verifica PR aberta, origem, SHA e orçamento antes de instalar o navegador.
4. Abra o resumo da execução, confira SHA, baixe o ZIP pelo link do recibo. Leia `agent-qa/manifest.json` e `scene-agent/report.json`. Abra o PNG em tamanho legível; para movimento, reproduza o vídeo ou extraia quadros com tempos. Registre nome, instante, observação e decisão. Manifesto sem vídeo significa que a sequência continua sem validação quando movimento for indispensável. O recibo contém o ID atribuído após upload.
5. Corrija na mesma PR e solicite QA dirigido do novo SHA. Falta de acesso, 403, 429 ou artifact expirado exige checkpoint e alternativa. Em espera, prossiga em trabalho independente. Com DNS de git indisponível, leia a branch pelo conector, publique blob/tree/commit sobre o HEAD observado e atualize a ref com SHA esperado. Em conflito, releia o arquivo e reconcilie a mudança. Preserve o trabalho alheio.

## Checkpoint na própria PR

`A1 | QA_EXECUTANDO | sha=<40 hex> | run=<URL> | cenario=floresta-percurso | hipótese=herói permanece enquadrado ao caminhar | próximo=inspecionar antes/após`

Estados possíveis: BACKLOG → IMPLEMENTANDO → QA_SOLICITADO → QA_EXECUTANDO → EVIDENCIA_PRONTA → ANALISE_VISUAL_PENDENTE → CORRIGINDO → QA_REVALIDANDO → PR_PRONTA. Use BLOQUEADO com causa e alternativa. Se houver evidência inacessível, mantenha ANALISE_VISUAL_PENDENTE. A ferramenta local `node tools/visual-lab/agent-qa.cjs checkpoint` lê JSON pela entrada padrão (sha, runSha, http, runStatus, artifact, reviewed). A decisão final exige análise visual do HEAD e testes aplicáveis.

## Cobertura e capacidades

| Agente | Primeira evidência | Cobertura adicional existente |
|---|---|---|
| A1 movimento/câmera | floresta-percurso, antes/depois de KeyW | focus-movement-qa e world-load-smoke; colisão/save precisam de reprodução própria |
| A2 combate/VFX | laboratório visual manual | modos hidra/chamas e vorgazhek-runtime-qa; validar IA, hit e dano na luta correspondente |
| A3 cenário | vila-praca ou floresta-percurso | fotógrafo de cenas e câmera livre |
| A4 iluminação | vila-praca, hora fixa do preset | fotógrafo em coordenadas e horários; comparar o mesmo ponto em dia, tarde, noite e aurora |
| A5 história | vila-vendedores para contexto | testes de jornada/save e interação dirigida para validar diálogo, objetivo e recarga |

| Operação | Verificação nesta missão | Alternativa |
|---|---|---|
| Escrever sem clone | Commit descartável `1b548063684e7507224e8b1976a0d5d1072ea9d0` na branch; atualização por SHA esperado | Revisar conflitos antes de repetir |
| Dispatch | Conector desta sessão sem comando para iniciar workflow | Ação manual na interface, com Actions write |
| Recuperar mídia | Conector listou e baixou o ZIP de [run 44939366432](https://github.com/PHBritoDev/Jogo-2-2.5D/actions/runs/44939366432), [artifact 14720972111](https://github.com/PHBritoDev/Jogo-2-2.5D/actions/runs/44939366432/artifacts/14720972111). No PNG 01-batalha-real-paisagem o herói aparece no piso escuro e a barra de Vorgazhek na base. Prova de acesso de uma execução anterior. | Download autenticado antes da expiração e inspeção do quadro |
| Piloto A1 local | Chromium/SwiftShader na cópia Mod 337: o protagonista ocupa o centro da trilha, gira de costas e avança; fotos antes e depois e vídeo gerados. A cópia local não tem metadados Git. | Dispatch do HEAD da PR para vincular prova a commit |
| Regras de merge | Conector sem leitura de rulesets nesta sessão | Mantenedor verifica na proteção da main e na PR; manter a captura manual |

## Isolamento de CI e custos

| Caso | Comportamento do QA manual | Efeito sobre checks obrigatórios |
|---|---|---|
| Sucesso | game_ran, imagens aguardam análise | Configuração existente |
| Chromium/WebGL incompatível | environment_error, tentativa de enviar manifesto | Configuração existente |
| Timeout | captura termina, tenta publicar diagnóstico; encerramento do runner pode impedir upload | Configuração existente |
| Foto inválida ou ausente | falha de captura ou suspeita com razão registrada | Configuração existente |
| PR sem alteração visual | nenhum disparo automático | Configuração existente |
| Branch atualizada | rejeitar pedido obsoleto; SHA novo precisa de prova própria | Configuração existente |
| A1–A5 simultâneos | grupos distintos por agente e branch | Configuração existente |

A matriz descreve comportamento do workflow e testes simulados. A política de proteção efetiva e a tolerância a falha visual em PR ainda exigem verificação no GitHub antes de ativar gatilhos automáticos. Uma falha obrigatória de gameplay continua sujeita à proteção existente. Runner Ubuntu 24.04, versão de Playwright fixada pelo projeto, vídeo por pedido, captura limitada a sete minutos, retenção de sete dias. SwiftShader mede o comportamento neste renderer; FPS no Galaxy A55 exige aparelho.

## Referências

[Dispatch com ref](https://docs.github.com/en/rest/actions/workflows) · [Metadados e download](https://docs.github.com/en/rest/actions/artifacts) · [Vídeo finalizado ao fechar contexto](https://playwright.dev/docs/videos) · [Trace Viewer](https://playwright.dev/docs/trace-viewer) · [Segurança de código de PR](https://docs.github.com/en/actions/reference/security/securely-using-pull_request_target) · [Retenção de artifacts](https://docs.github.com/en/actions/concepts/workflows-and-actions/workflow-artifacts) · [Permissões e concorrência](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax).
