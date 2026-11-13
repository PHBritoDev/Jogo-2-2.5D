# A-005 — trovão perde cauda do ruído (13/11/2026)

## Contexto e coordenação
- Inspecionada `main/audio3d.js`, a auditoria original de `docs/agentes/audio-sound-design/README.md` na branch do PR #490 e os PRs abertos.
- PRs de áudio ativos: #490, #492, #495, #496, #498. Os três primeiros alteram `audio3d.js`. Outros agentes também trabalham em Eldória, VFX e combate.
- Esta rodada **não modifica `audio3d.js`** para evitar concorrência; o arquivo deve ser integrado/testado com os PRs anteriores antes de novos patches.

## Evidência A-005 — cauda do trovão
- `makeNoise()` cria `noiseBuf` com `ctx.sampleRate * 2` amostras, duração **2 segundos**.
- `thunder()` usa `ctx.createBufferSource()`, `src.buffer = noiseBuf`, **sem `src.loop`**, e programa `src.start(t)` e `src.stop(t + 3.1)`.
- Envelope de ganho dura até `t + 3` e o filtro é varrido por 2,6 s, mas a fonte de ruído se encerra automaticamente após **2 s**; assim os últimos ~1 s do ruído do trovão não podem soar. Isso independe do `burst()` corrigido no PR #490: `thunder()` tem seu próprio `AudioBufferSourceNode`.
- A síntese de `tone()` ou outros efeitos simultâneos não foi analisada como parte desse evento. Não afirmar que o trovão inteiro fica silencioso.

## Proposta técnica isolada
Após integração dos PRs pendentes, configurar `src.loop = true` **antes** de `src.start(t)` apenas em `thunder()`, mantendo `stop(t + 3.1)`, envelope e filtro. Alternativa a avaliar em escuta: criar buffer de trovão original mais longo com crossfade para evitar costura do loop. Nenhum áudio de terceiros/licença adicional é necessário para a primeira opção.

## Critérios de aceite
1. Teste determinístico verifica duração do buffer, duração da fonte e envelope (sem depender de renderização).
2. Teste offline de Web Audio com análise de energia nas janelas 1,5–2,0 s e 2,2–2,8 s; confirmar ausência de clipping, descontinuidade e ruído artificial na costura.
3. Escuta A/B com volume controlado em desktop e Android; medir CPU, memória e latência se disponível.
4. Conferir se o evento de trovão é disparado no jogo real e se combina com o relâmpago; não alterar eventos ou VFX sem coordenação.

## Estado
**Defeito demonstrado estaticamente, correção ainda não aplicada.** Não houve escuta, benchmark, teste em navegador ou Android nesta rodada. Nenhum merge/automerge. O PR desta rodada contém somente documentação para evitar conflito.
