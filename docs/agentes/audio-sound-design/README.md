# Diretoria de Áudio — auditoria inicial (12/11/2026)

## Escopo e fontes
- Código consultado: `audio3d.js` da `main`; referências de integração em `docs/MOD-302-COMBATE-PROTAGONISTA.md`, `docs/auditorias/ENEMY3-MINIBOSS3-IMPLEMENTACAO.md` e `vorgazhek-ultimate.test.mjs`.
- PRs abertos no momento da auditoria: #473 (Eldória/Claude), #486 (combate), #487 (VFX), #488 (iluminação), #489 (arte ambiental), além de outros PRs antigos. Não editar arquivos desses agentes.
- Nenhuma licença externa foi necessária nesta rodada: a melhoria reutiliza o ruído procedural já gerado pelo jogo.
- Auditoria **estática**: não houve reprodução capturada, teste auditivo em alto-falantes/fones ou benchmark no Android.

## Inventário confirmado no código
- `createWorldAudio()` usa Web Audio API, liberação após gesto do usuário, `ambient`, `sfx`, `music`, master, compressor e armazenamento local de volumes.
- Síntese procedural sem gravações externas no módulo: ruído de 2 s reutilizado em filtros, osciladores e pads.
- Música procedural com modos exploração/combate; camadas de floresta, água/cachoeira, portal, chuva, torcida e passos.
- Eventos de combate `swing`, `hit`, `energyImpact`, `magic`, `dark`, `abyss3`, `voidCharge`, `novaCharge` e `novaBlast`.
- `swing` alterna entre apenas três perfis; `magic` compartilha estrutura de quatro parciais. Potencial de repetição **a confirmar ouvindo**.
- Há atenuação de algumas fontes calculada com distância enviada pelo mundo; não foi identificado `AudioListener` do Three.js neste módulo. Não afirmar que o jogo inteiro não usa áudio posicional sem auditoria de todos os demais arquivos.

## Achado A-001 — ruído pode ser truncado (corrigido na branch)
**Causa comprovada por leitura:** `noiseBuf` tem 2 s; `burst()` inicia um `AudioBufferSourceNode` com deslocamento aleatório de até 1,6 s, sem `loop`. Isso deixa entre ~0,4 e 2,0 s até o fim do buffer mesmo que o código agende duração maior. Ex.: `voidCharge` solicita 5,5 s e `novaBlast` 2,8 s. A fonte pode terminar antes do envelope e seu `stop()`.
**Mudança:** `src.loop = true` somente no helper `burst()`, mantendo buffer original, filtros, ganhos e tempos do efeito. Permite cumprir a duração solicitada sem downloads, novos buffers ou mudanças de gameplay.
**Risco:** continuidade do ruído no ponto do loop; por ser ruído filtrado, pode ocorrer textura perceptível. Exige escuta com a carga do buraco negro e supernova em celular/fones antes do merge.
**Verificação:** teste estático de contrato acompanha a alteração; medição de forma de onda, LUFS/true peak, memória, CPU e latência ainda pendente.

## Próximas prioridades
1. QA auditivo do `voidCharge` e `novaBlast` (antes/depois, sem clipping, caudas e sincronização de eventos).
2. Verificar se `pause(on)` e o listener de `visibilitychange` podem reativar o áudio quando uma dimensão ainda solicita pausa; investigar antes de mudar.
3. Identificar todos os disparadores reais e fontes adicionais de áudio no repositório, inclusive sobreposição por PRs de Claude.
4. Criar identidade individual e original de habilidades após gravações controladas; escolher materiais originais/licenciados com crédito e licenças em tabela.
5. Medir orçamento de vozes simultâneas, heap, latência e transições no Android e desktop; não assumir resultados.

## Histórico
- 2026-11-12: primeira auditoria estática e correção A-001 em branch exclusiva. Nenhum merge autorizado ou realizado.

## Integração A-002 — Pausa do jogo e visibilidade (13/11/2026)
- Origem: PR #492. Ao mudar de aba, `visibilitychange` podia executar `ctx.resume()` mesmo enquanto o jogo solicitava pausa; `unlock()` também podia reativar indevidamente.
- Correção transportada para branch criada da `main` *após* integrações #490, #495 e #502, preservando caudas de áudio, trilha silenciosa e trovão.
- Novo indicador `pausedByGame`: `pause(on)`, `unlock()` e evento de visibilidade respeitam simultaneamente a pausa e aba oculta.
- Teste de regressão reaproveitado de #492: `tests/audio-pause-visibility.test.mjs`.
- QA auditivo em aparelho real ainda pendente; não interpretar CI como validação da mixagem.

## Rodada de integração — regressões de áudio (13/11/2026)
- A `main` consultada já contém as mudanças de `burst()` (#490), `thunder()` (#502), modo musical `silent` (#495) e pausa/visibilidade (integração #505 da #492). Não repetir correções já integradas.
- PRs de trabalho de outras equipes ainda abertos incluem #473 (Claude/Eldória) e #506 (mobile); nenhum arquivo desses trabalhos foi alterado.
- Foi acrescentado `tests/audio-integrated-regressions.test.mjs` para proteger quatro contratos em um só teste de integração estática: ruído longo, trovão, pausa ao mudar de aba e trilha silenciosa.
- Verificação manual de padrões de fonte: condições de pausa e posição do loop confirmadas. **Não equivale a executar `node --test`**, nem a ouvir a saída Web Audio.
- Sem novos arquivos sonoros, licenças externas, alterações de gameplay ou aumento de custo de áudio em tempo de execução. A suíte acrescenta somente trabalho ao CI.
- Pendente: executar `node --test tests/audio-integrated-regressions.test.mjs`, revisar falhas se houver, comparar forma de onda e artefatos de loop, medir Android real.
- Risco: contratos estáticos podem falhar em refatorações equivalentes; revisar sem alterar produção cegamente. Nenhum merge autorizado.
