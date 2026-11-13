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
- **Evidência depois:** teste e regressões devem ficar verdes no CI subsequente. Registrar o resultado antes de solicitar merge.
- **Status:** correção em branch isolada; validação pós-alteração em andamento; **sem merge**.

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
