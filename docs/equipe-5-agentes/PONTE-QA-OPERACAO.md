# QA visual entre rodadas

A cada despertar, leia integralmente o contrato do seu agente. Retome o último comentário de checkpoint na PR do item e confira o HEAD. A issue [#519](https://github.com/PHBritoDev/Jogo-2-2.5D/issues/519) coordena prioridades. O agendamento do ChatGPT inicia a rodada seguinte. Um comentário apenas conserva o estado.

## Captura dirigida

1. Abra a PR da sua branch para main. Registre SHA completo, hipótese visível e enquadramento. Consulte uma vez a execução já associada ao SHA. Use uma PR por item.
2. No [Agente de cenas](https://github.com/PHBritoDev/Jogo-2-2.5D/actions/workflows/agente-cenas.yml), escolha **Run workflow**, selecione a **branch da PR**, informe agente, cenário e número da PR. O modo legado conserva o fotógrafo JSON original. Para o piloto A1 use `floresta-percurso` e marque vídeo para avaliar a caminhada. Para uma foto da praça ou dos comerciantes use `vila-praca` ou `vila-vendedores`. O campo `cenas` é exclusivo do legado.
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
