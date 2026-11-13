# Diretoria de Áudio — auditoria e histórico

## 2026-11-13 — A-002: retomada indevida ao alternar abas

**Inspeção estática:** `audio3d.js` tem `pause(on)` que suspende o `AudioContext` durante uma dimensão de bispo, mas o listener de `visibilitychange` retomava o contexto incondicionalmente ao voltar à aba. `unlock()` também retomava um contexto suspenso sem respeitar a pausa do jogo. Assim, havia risco de ouvir o mundo sobre a dimensão.

**Correção isolada:** estado `pausedByGame` passa a prevalecer sobre o retorno de visibilidade e desbloqueio; `pause(false)` só retoma quando a aba está visível. O estado é lembrado mesmo antes de o contexto existir. Não muda efeitos, mix, volumes, assets, eventos ou gameplay.

**Teste:** contrato de regressão com simulação da alternância de aba e chamada de `pause`; sem teste de áudio capturado ou Android físico. O teste deve ser executado no CI com `node --test tests/audio-pause-visibility.test.mjs`. Risco residual: suspensões externas do navegador, corridas de promises `suspend/resume`, comportamento do sistema de dimensão em integração. Confirmar em navegador e Android antes do merge.

**Coordenação:** PR #490 altera `audio3d.js` no helper `burst`; este PR altera exclusivamente pausa/desbloqueio/visibilidade, sem mesclar ou rebasear o #490. PRs #473 (Eldória), #486 (combate), #487 (VFX), #488 (iluminação), #489 (arte ambiental) e #491 (mapa) foram consultados. Revisar conflitos antes de eventual integração.

**Licenças:** nenhuma gravação ou biblioteca nova; somente lógica Web Audio existente. **Medições:** nenhum benchmark de CPU, memória, latência, loudness ou escuta real foi executado nesta rodada.

**Próximos passos:** QA da transição mundo/dimensão, verificar chamadas reais de `pause` e possíveis efeitos em navegação; executar teste automatizado e escuta real. Nenhum merge autorizado.
