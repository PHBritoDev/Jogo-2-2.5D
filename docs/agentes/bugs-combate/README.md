# Auditoria de combate — registro permanente

Responsável: **Chat 2 — Engenharia de Combate**. Repositório `PHBritoDev/Jogo-2-2.5D`.
Branch de trabalho: `combat/fix-energy-wave-final-frame-20261113`. PR: [#486](https://github.com/PHBritoDev/Jogo-2-2.5D/pull/486).

## Estado inicial e coordenação (2026-11-13 UTC)
- `main`: `88217cc9e67777aa4a6573a0a3dd1472c7ced841` no início desta rodada (PR #481 do Claude, prólogo/Eldória, **já mesclado**).
- PR #473 permanece aberto e modifica `mundo-3d-prototype.js`, `act1-flow.js` e testes de história.
- PR #468 permanece aberto e altera `mundo-3d-prototype.js`, `mundo-3d-prototype.html`, `prota-combat3d.js` e `demon1-combat3d.js`.
- PR #485 documenta bugs gerais, sob responsabilidade de outro agente.
- Não modificar arquivos de outros agentes; nenhuma alteração direta na `main`; nenhum merge sem autorização expressa.

## BUG-COMB-001 — Inimigo secundário perde acerto no limite da onda
- **Gravidade:** média; provoca dano inconsistente de golpes com energia quando o alvo secundário está na extremidade do alcance.
- **Arquivo/causa:** `sword-rites3d.js`, laço `this.energies` de `SwordRites.tick`. Após `energyStep` sinalizar `e.done=true` por `travel >= range`, o teste de contato secundário era condicionado a `!e.done`. Isso descartava a hitbox no último quadro. O teste de alvo principal já verificava o estado anterior ao avanço.
- **Reprodução:** `node --test tests/combat-energy-last-frame.test.mjs`: onda com `travel=2.9`, `range=3`, `speed=12`, avanço `1/120 s`; inimigo secundário vivo em `z=3` e sem paredes. O golpe finaliza, mas antes da correção `hits=[]`. Execução GitHub Actions [43350256238](https://github.com/PHBritoDev/Jogo-2-2.5D/actions/runs/43350256238) confirmou **1 falha / 1 aprovação**, sendo que o caso de parede passou.
- **Correção:** preservar `unblockedThisFrame` após a varredura de obstáculos e antes da atualização terminal; verificar inimigos secundários nesse quadro, mantendo bloqueios e deduplicação.
- **Commit de código:** `4b36c73388a67e67320c03745497507a3aaeadfe`.
- **Evidência antes:** log do teste de regressão vermelho na execução acima.
- **Evidência depois:** [GitHub Actions 43350662210](https://github.com/PHBritoDev/Jogo-2-2.5D/actions/runs/43350662210): **35/35 testes aprovados**, incluindo o contato terminal em 20/30/60/120 FPS, parede e os 30 testes de combos/hitboxes/ultimates. O mesmo cenário antes falhava no CI 43350256238.
- **Status:** correção comprovada em testes determinísticos; testes visuais/integração de WebGL em execução no momento do registro; **sem merge, aguardando autorização**.

## Pendências de combate (não consideradas corrigidas)
| ID | Área | Severidade | Situação / próximo teste |
| --- | --- | --- | --- |
| BUG-COMB-002 | DASH intermitente durante animação | média | Testes anteriores de clique/toque passam; investigar estados `rites.canCancel`, cooldown e input real durante combo, sem tocar no `mundo-3d-prototype.js` ocupado por #473/#468 |
| BUG-COMB-003 | Mobiles: baixa taxa de quadros ao executar ultimates | alta | Reproduzir por vídeo e medir `renderer.info`/frametimes; não reduzir VFX ou qualidade por hipótese |
| BUG-COMB-004 | Combos aéreos, saltos e hits no Demônio1 | média | Existe alteração concorrente no PR #468 sobre `prota-combat3d.js` e `demon1-combat3d.js`; aguardar coordenação antes de corrigir |
| BUG-COMB-005 | Câmera em ataques cinematográficos | média | Validar WebGL/Android e vídeos, sem alterar arquivos centrais do Claude antes de coordenar |

## Rotina de cada nova rodada
1. Confirmar `main`, PRs, arquivos ocupados e registros anteriores.
2. Escolher falha nova ou regressão concreta, reproduzir via teste e preservar fotos/vídeos quando houver interface visual.
3. Alterar apenas na branch própria de combate, executar testes unitários, integração e agente WebGL quando aplicável.
4. Registrar erro, localização, gravidade, reprodução, evidências, causa, commits, testes, PR e status.
5. **Não mesclar nem ativar auto-merge sem autorização explícita do criador.**

## Execuções da rodada
- Teste inicial com falha reproduzida: [43350256238](https://github.com/PHBritoDev/Jogo-2-2.5D/actions/runs/43350256238).
- Testes após a correção (5 novos + 30 regressões): [43350662210](https://github.com/PHBritoDev/Jogo-2-2.5D/actions/runs/43350662210), **35 aprovados, 0 falhas**.
- Testes visuais adicionais e combate cinematográfico: acompanhar os workflows associados ao PR #486; não confundir aprovação de testes lógicos com uma captura do efeito final na tela.
- Commit adicional de testes 20/30/60/120 FPS: `4cd8231fc84be69ca4612b0410599105abf272ce`.

## Revisão horária — 2026-11-13 09:12 BRT
- `main` conferida em `88217cc9e67777aa4a6573a0a3dd1472c7ced841`; PRs concorrentes #468, #473, #485, #487 e #491 continuam abertos. Não editar arquivos de HUD/salto, história, VFX/dash ou mapa sob outros agentes.
- PR #486 permanece aberto em rascunho, sem merge.
- Quatro workflows do commit do PR concluíram **success**: [QA da onda](https://github.com/PHBritoDev/Jogo-2-2.5D/actions/runs/43350807458), [combate cinematográfico](https://github.com/PHBritoDev/Jogo-2-2.5D/actions/runs/43350807345), [regressão/performance](https://github.com/PHBritoDev/Jogo-2-2.5D/actions/runs/43350807448) e [laboratório visual](https://github.com/PHBritoDev/Jogo-2-2.5D/actions/runs/43350807418).
- Laboratório visual gerou artefatos `mundo3d-smoke-837` e `bispo3-ultimate-mod281`, mas **não foram inspecionados quadro a quadro nesta revisão**. Sucesso de workflow não comprova qualidade visual, FPS real de Android nem ausência de falhas no dash.
- **Nenhum bug novo reproduzido nesta revisão**; portanto não houve alteração adicional de gameplay. Próxima prioridade: inspecionar artefatos e reproduzir BUG-COMB-002 sem conflito com PR #487 (VFX de dash).

## Revisão horária — 2026-11-13 10:14 BRT
- `main` atualizada para `981606e338c53257adf9612ac74c96168888afe1` (upload de arquivos); mudança desde a revisão anterior, exigindo rebase e testes antes de qualquer merge.
- PRs abertos conferidos: #468 (salto/HUD), #473 (história), #487 (VFX do dash), #493 (VFX Enemy1) e #494 (VFX Enemy2), entre outros. Não tocar nesses escopos.
- Inspeção estática de `sword-rites3d.js` na branch deste PR: a correção BUG-COMB-001 continua presente. Não foi reproduzida falha nova nesta rodada; nenhum teste executado ou screenshot WebGL inspecionado aqui. Não declarar aprovação nova de CI ou Android.
- **Hipótese a testar (não é bug confirmado):** `SwordRites.update(dt)` limita o tempo processado a 0,25 s após travamentos longos, inclusive cooldowns e janelas de animação. Investigar se a política é deliberada e se provoca atraso perceptível no combo após stutter, sem modificar código antes de teste reproduzível.
- **Próximo experimento:** teste determinístico de pausa/stutter (dt=0,5 s) comparado a 60 atualizações de 1/120 s, registrando diferença esperada de relógio e eventos; depois testar no WebGL e Android. O PR permanece sem merge e sem auto-merge.

## Revisão horária — 2026-11-13 11:21 BRT
- Main atual: `981606e338c53257adf9612ac74c96168888afe1`. PRs recentes #493–#497 ocupam VFX e áudio; não houve edição nesses arquivos, nem no código de gameplay.
- Adicionado teste de caracterização `tests/combat-stutter-clock.test.mjs` no commit `8c6f6ed11fc4fd942c2f7deaf46f0509c3ab3a31`: 500 ms de travamento contabilizam 250 ms no relógio de combate e cooldown, enquanto 60 quadros de 1/120 s contabilizam 500 ms; pausa explícita mantém o relógio parado.
- **Classificação:** diferença temporal determinística por leitura de `SwordRites.update`, mas ainda NÃO é defeito de jogabilidade comprovado; o limite pode ser uma proteção intencional contra simulações longas após travamento. Não remover o cap sem avaliar segurança, hitboxes e Android.
- **Validação pendente:** executar `node --test tests/combat-stutter-clock.test.mjs` no CI e observar resultado, depois medir comportamento real em WebGL/Android. Nenhuma captura WebGL nova foi inspecionada nesta rodada.
- **Próxima ação:** verificar se os cooldowns deveriam seguir relógio real enquanto eventos de hitbox seguem relógio simulado; reproduzir percepção do jogador antes de alterar a política de tempo. PR #486 permanece sem merge/auto-merge.

## Revisão horária — 2026-11-13 12:15 BRT
- `main` confirmada em `981606e338c53257adf9612ac74c96168888afe1`; PR #486 continua aberto e em rascunho. Conferidos PRs ativos #468, #473, #487, #491, #493–#499; evitar os arquivos de outros agentes (HUD/salto, VFX, áudio, história).
- Inspecionados os três testes de caracterização de `tests/combat-stutter-clock.test.mjs` e o workflow `.github/workflows/combat-energy-last-frame.yml`. Os testes existiam, mas **não estavam ligados ao workflow**, portanto não havia evidência de execução automática.
- Commit `820e438fa57ee5976a9db9d5e50308856e7fff10`: adiciona o arquivo de teste ao filtro de caminhos e a etapa `node --test tests/combat-stutter-clock.test.mjs` ao CI do PR. **Nenhum código de gameplay alterado.**
- Consulta imediata aos workflows associados ao commit retornou lista vazia; **não afirmar testes aprovados ou executados**. Aguardar criação/conclusão do CI e revisar logs; se o workflow não disparar, verificar políticas de GitHub Actions e evento do PR.
- A divergência de 250 ms em pausa de 500 ms permanece **comportamento determinístico a validar**, não bug comprovado. Próximo passo: confirmar resultado dos três testes e investigar se cooldowns devem usar tempo real separado do tempo simulado, com WebGL/Android e sem afetar hitboxes.
- Sem merge/auto-merge.

## Revisão horária — 2026-11-13 13:12 BRT
- `main` confirmada em `981606e338c53257adf9612ac74c96168888afe1`. PR #486 aberto em rascunho; outros agentes mantêm PRs ativos de áudio, VFX, história e controles. Nenhuma alteração em arquivos compartilhados.
- **Validação nova confirmada:** [Actions 43450802915](https://github.com/PHBritoDev/Jogo-2-2.5D/actions/runs/43450802915), commit `25c837dad437d5a1deff94fc27cb129753e39e73`: job `terminal-wave` concluído com `success`. Etapas individuais `Reproduzir contatos em alcance máximo e paredes`, `Caracterizar relógio de combate após travamentos` e `Regressão de golpes e combos` concluídas com `success`. Assim, os três testes de stutter agora foram executados no CI, resolvendo a pendência de integração da revisão anterior.
- Também concluíram `success` os workflows [laboratório visual](https://github.com/PHBritoDev/Jogo-2-2.5D/actions/runs/43450802910), [performance/regressão](https://github.com/PHBritoDev/Jogo-2-2.5D/actions/runs/43450802913) e [combate cinematográfico](https://github.com/PHBritoDev/Jogo-2-2.5D/actions/runs/43450802974). Não houve inspeção de imagens, vídeo ou FPS Android nesta rodada; `success` não comprova qualidade visual.
- O limite de 250 ms de tempo simulado por atualização de 500 ms permanece comportamento **confirmado pelos testes**, porém **não classificado como bug de jogabilidade** sem evidência perceptual e validação WebGL/Android. Não alterar cap nem hitboxes por hipótese.
- Nenhum defeito novo reproduzido; sem mudança de gameplay. Próximas prioridades: inspecionar capturas e investigar DASH durante combos em teste isolado, evitando PR #487. Sem merge/auto-merge.

## Revisão horária — 2026-11-13 15:17 BRT
- PR #486 continua aberto, em rascunho, com head `3952149d22052ee2b3f161194051291967e81759`, sem merge. A branch de combate mantém a correção terminal da onda e os testes de stutter; `README.md` da main não existe, pois a documentação segue isolada neste PR.
- Consulta atual aos workflows do head retornou quatro execuções concluídas com `success`: QA onda [43460419192](https://github.com/PHBritoDev/Jogo-2-2.5D/actions/runs/43460419192), combate cinematográfico [43460419006](https://github.com/PHBritoDev/Jogo-2-2.5D/actions/runs/43460419006), regressão/performance [43460418975](https://github.com/PHBritoDev/Jogo-2-2.5D/actions/runs/43460418975) e laboratório visual [43460419532](https://github.com/PHBritoDev/Jogo-2-2.5D/actions/runs/43460419532). Não inspecionadas imagens ou métricas Android; não extrapolar o resultado do CI.
- PR #468 (controles/salto/HUD) segue aberto com `mergeable=false`, portanto mudanças nesses sistemas exigem coordenação. PR #487 toca `prota-vfx3d.js` e seu laboratório de DASH, sem compartilhar os arquivos do PR de combate. Novos PRs de VFX #501 e #504 seguem em rascunho.
- Revisão estática de `SwordRites`: `canCancel` só libera cancelamento fora da janela central do golpe básico; isso é comportamento definido no código, não reprodução de DASH intermitente. Nenhum bug novo reproduzido; sem alteração especulativa em mecânicas. Próximo teste: simular solicitação de DASH em cada fronteira temporal (`open*.65` e `close+.04`) e correlacionar com a integração real de input no navegador.
- Nenhum merge nem auto-merge.
