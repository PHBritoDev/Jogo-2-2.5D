# A-005 — Trovão: cauda de ruído truncada (13/11/2026)

## Recuperação e coordenação
- Revisados `audio3d.js` da `main`, auditoria inicial em `docs/agentes/audio-sound-design/README.md` da branch do PR #490 e PRs abertos.
- PRs de áudio ativos: #490 (helper `burst`), #492 (pausa), #495 (trilha silenciosa), #496 (Skill 1), #498 (cachoeira), #500 (diagnóstico A-005). Outros agentes: #473 (Eldória), #486 (combate), #487/#493/#494/#497/#499/#501 (VFX), #488 (iluminação), #489 (ambiente).
- **Conflito potencial:** #490, #492 e #495 alteram o mesmo arquivo `audio3d.js`; esta branch muda somente o trecho da função `thunder`. Reavaliar o diff e executar testes após rebase/integração, sem merge automático.

## Achado e correção isolada
- `makeNoise()` cria um buffer mono de 2 s.
- `thunder()` usava `AudioBufferSourceNode` com `noiseBuf` sem loop, mas agendava envelope até t+3 s e stop em t+3,1 s. A fonte termina naturalmente em t+2 s, cortando o último segundo da cauda.
- Correção: `src.loop = true` antes de `src.start(t)`. A mesma amostra é reutilizada; o envelope e o stop continuam limitando a duração; não há download, novos buffers, alteração de gameplay ou mudanças de volume.
- Verificação: contrato estático em `tests/audio-thunder-tail.test.mjs` confirma buffer, loop antes de start, envelope e stop. Não é evidência de qualidade acústica.
- **Risco:** descontinuidade na junção do loop pode causar textura ou clique; validar ouvindo em fones e Android e, idealmente, capturando sinal de Web Audio em teste offline. Sem benchmark de CPU/latência ou medição de clipping nesta rodada.
- Licença: nenhuma gravação externa utilizada; síntese procedural existente.
- Próxima ação: comparar antes/depois no jogo real com tempestade, conferir política de autoplay, estados de pausa e interferência de música/efeitos simultâneos.

## Estado
Branch exclusiva; PR em rascunho; **não mesclar** sem autorização explícita.
