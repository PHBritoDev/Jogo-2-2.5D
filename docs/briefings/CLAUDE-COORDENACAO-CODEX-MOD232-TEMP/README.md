# Instruções de execução para Claude — novas habilidades e espada Quantum (TEMPORÁRIO)

> Este documento complementa o briefing de implementação, não o substitui. Leia tudo antes de editar. Sua missão é implementar de verdade, testar e, se seguro, fazer merge. **Não apague os documentos mestres permanentes.**

## 1. Leituras obrigatórias, nesta ordem
1. [AGENTS.md](../../../AGENTS.md)
2. [PROMPT_MESTRE_DO_JOGO.md](../../../PROMPT_MESTRE_DO_JOGO.md)
3. [Visão Mestra de Qualidade Visual e Gameplay](../../VISAO-MESTRA-QUALIDADE-VISUAL-E-GAMEPLAY.md)
4. [ARQUITETURA.md](../../../ARQUITETURA.md)
5. [Briefing completo das novas habilidades e Quantum](../CODEX-NOVAS-SKILLS-X-PORTAIS-DRAGAO-QUANTUM-TEMP/README.md)
6. [Protocolo do bug de escala GLB](../../PROTOCOLO-BUG-ESCALA-GLB-PROTAGONISTA.md)
7. [Briefing da Mod 232 — apenas para entender os arquivos e sistemas que outro agente está alterando](../CODEX-MOD232-CAMERA-ESPADAS-VFX-TEMP/README.md)

**As seis imagens que o usuário enviar são referências visuais para as habilidades e a espada.** Não presuma que as imagens estão no repositório: examine os anexos da conversa.

## 2. Missão
Implemente, sem substituir habilidades antigas: (1) Ruptura em X — corte X tridimensional vermelho, viagem horizontal, colisão real, explosão e dissipação; (2) Portais da Perseguição — dois portais com cores diferentes, múltiplas trajetórias independentes e convergência no alvo; (3) Dragão do Julgamento — dragão dourado de fogo celestial, corpo serpentino, cabeça e mandíbula reconhecíveis, engolir/fechar e explosão esférica; (4) espada Quantum — modelo 3D com núcleo escuro, órbitas douradas/roxas, lâmina luminosa e empunhadura avermelhada, **comprável somente a partir da metade do Ato III**, após verificar a progressão real. Integrar loja, equipar, persistência, combate, VFX, áudio, balanceamento e controles mobile. As especificações detalhadas, restrições e testes constam no briefing principal; não simplifique ou substitua por partículas genéricas.

## 3. Coordenação crítica com Codex (Mod 232)
O Codex estava implementando a **Mod 232** quando foi interrompido temporariamente por limite de uso. Segundo o registro enviado pelo usuário, identificou bugs de locomoção/corrida em combate, primeira pessoa sem braços, animações e ondas das espadas; relatou **192 verificações automatizadas passando**, teste de corrida de 35,34 m/5 s, 16 cortes da Passagem, e estava ajustando onda em primeira pessoa e seta de objetivo. **Esses relatos NÃO provam que os arquivos foram enviados ao GitHub.** Parte do trabalho pode estar somente no ambiente de execução privado do Codex.

- Trabalhe em **branch própria** (por exemplo `claude/skills-x-portais-dragao-quantum`), nunca na branch do Codex. Não altere/exclua commits, branches ou pastas de trabalho dele.
- Não edite diretamente `main` enquanto desenvolve; faça commits isolados e testes. Não reverta a Mod 232 nem reintroduza seus bugs.
- Áreas potencialmente compartilhadas: `mundo-3d-prototype.js`, câmera de primeira pessoa, controles, locomotion/animation rigs, espadas, `skills3d.js`, `progression3d.js`, `sword-rites3d.js`, loaders e build marker. Leia o código atual antes de mudar, prefira adições modulares, preserve APIs e compatibilidade de saves.
- O usuário **QUER MERGE AUTOMÁTICO NA MAIN QUANDO TERMINAR**, se seguro. Antes do merge, sincronize sua branch com a main mais recente, revise o diff, confira que nenhum arquivo do Codex foi apagado ou sobrescrito e execute testes reais de regressão. Se Mod 232 ainda não estiver publicada, **não finja conhecer as alterações locais do Codex**: evite modificar código compartilhado desnecessariamente e mantenha a integração compatível.
- É permitido fazer merge antes de o Codex retomar **somente se** os testes passarem, não houver conflitos ou regressões e o merge não sobrescrever trabalho já publicado. Explique no resumo que o Codex precisará sincronizar sua branch/ambiente com a nova main antes de continuar. **Não é possível garantir ausência de conflitos com alterações privadas não publicadas.**
- Se identificar conflito material, risco de perda do trabalho do Codex, ou não conseguir verificar integração segura, **NÃO force merge**: deixe PR aberto e relate bloqueio real ao usuário. A integridade do jogo prevalece sobre o merge imediato.

## 4. Critérios de qualidade
Leia a visão mestra integralmente. Efeitos tridimensionais cinematográficos coerentes, antecipação, lançamento, trajetória, impacto, dissipação, shaders/trails/ribbons com direção correta, hitboxes e danos reais, áudio, sincronização das animações e câmera, pool de partículas e desempenho estável no Android. Não crie VFX genéricos nem efeitos que apenas pareçam funcionar em screenshots. Teste primeira e terceira pessoa, ataque em movimento, colisões, inimigos/bispos, loja, economia, desbloqueio no Ato III, equipar/desequipar, saves antigos, FPS e carregamento. Corrija bugs encontrados sem desfazer funcionalidades. Atualize o indicador numérico da Mod. Se não conseguir executar testes visuais reais, diga isso com precisão; não invente resultados.

## 5. Conclusão e limpeza
Após testes e merge seguro, exclua **apenas** a pasta deste briefing temporário `docs/briefings/CLAUDE-COORDENACAO-CODEX-MOD232-TEMP/` e a pasta do briefing principal das novas habilidades `docs/briefings/CODEX-NOVAS-SKILLS-X-PORTAIS-DRAGAO-QUANTUM-TEMP/`, desde que ambas já tenham cumprido seu propósito. **Não exclua** `docs/VISAO-MESTRA-QUALIDADE-VISUAL-E-GAMEPLAY.md`, `AGENTS.md`, `PROMPT_MESTRE_DO_JOGO.md` ou o briefing da Mod 232 que o Codex ainda usa. Se não puder fazer merge, preserve os briefings até a integração.

**Economia de mensagens:** não envie progresso, planos ou status intermediários, exceto bloqueio real. Ao terminar, dê um único resumo em português, **máximo 10 linhas**, com Mod, habilidades, Quantum, testes verdadeiros, status do merge e link direto do jogo.
