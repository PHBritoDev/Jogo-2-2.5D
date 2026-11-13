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
