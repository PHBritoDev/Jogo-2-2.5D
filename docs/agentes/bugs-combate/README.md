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
