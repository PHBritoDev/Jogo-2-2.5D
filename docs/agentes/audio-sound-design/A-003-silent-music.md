# A-003 — Evitar síntese de música inaudível no modo silencioso (13/11/2026)

## Evidência de código
Em `audio3d.js`, `music.set('silent')` reduz o ganho do bus de exploração a zero, mas `music.tick()` antes criava a cada 7,5 segundos oito osciladores de pad (e possivelmente um sino) mesmo no modo silencioso. Cada voz possui `stop()` agendado, então não há prova de vazamento permanente; o custo transitório de nós e agendamento é evitável em mobile. Em modo silencioso, a trilha não precisa criar essas vozes.

## Intervenção isolada
`music.tick()` agora deixa de agendar `pad()` em `silent` e mantém `chordAt = t`, permitindo que a música retorne no primeiro `update()` após sair do silêncio. Preserva a lógica de tambores, os envelopes existentes e todos os eventos de gameplay. Nenhum arquivo de áudio, sample, licença externa ou dependência foi adicionado.

## Escopo e conflitos
- Branch exclusiva a partir da `main`. Somente `audio3d.js`, este registro e teste estático novo.
- PR #490 altera `burst()` em `audio3d.js`; PR #492 altera pausa/visibilidade no mesmo arquivo. Regiões distintas, mas integração deve ser revisada manualmente antes de qualquer merge.
- PRs #473, #486, #487, #489, #493 e #494 foram consultados na triagem. Não alterar arquivos desses agentes.
- Não há autorização de merge nem auto-merge.

## Validação e pendências
- Teste de contrato estático verifica o ramo `silent` e preservação do modo combate. Não é teste auditivo ou medição de CPU.
- Testar no navegador real: alternar exploração → silent → exploração e combate → silent → combate; confirmar ausência de música residual, fade correto e retomada sem atraso audível.
- Medir número de AudioNodes ativos, tempo de CPU e possíveis cliques em dispositivo Android real. Nenhum benchmark foi realizado nesta rodada.
- A-001 (PR #490) e A-002 (PR #492) permanecem pendentes de QA/integração. Não duplicar suas alterações nesta branch.
