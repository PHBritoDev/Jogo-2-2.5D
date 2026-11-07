# MISSÃO CLAUDE — CONTINUAR trabalho do Codex (PR #404)

**Leia primeiro:** `docs/missoes/claude-migracao-demonio1-otimizacao-glb.md`, `docs/animacoes/enemy1-rework.md` e a PR #404. **Trabalhe na mesma branch `codex/demonio1-migracao-ab`**, reaproveitando a auditoria já criada. Não recomece do zero.

## Estado verificado antes desta missão
- A PR #404 está aberta e **não foi mesclada**; seu commit inicial adicionou `.github/workflows/enemy1-migration.yml` e `tools/visual-lab/enemy1-migration-audit.cjs`. Os checks iniciais passaram, **mas nenhuma substituição visual nem teste de combate foi comprovado**.
- `main` contém `Demonio1.glb`; `Enemy1.glb` e `Enemy1-lod.glb` ainda existem. Não confundir scripts Enemy1 (IA/poderes) com modelos obsoletos.
- O objetivo é ficar com **um único modelo visual oficial, `Demonio1.glb`**, sem perder nenhum poder ou comportamento.

## EXECUTE (não apenas analise)
1. Rode/consulte a auditoria existente. Catalogue **todas** as referências e carregadores do Enemy1 antigo, incluindo mapa, missões, esquadra, spawns e laboratório. Documente em `docs/migracao-demonio1-auditoria.md`.
2. Troque efetivamente as dependências visuais por `Demonio1.glb`, preservando integralmente IA, golpes, magias, cooldowns, danos, eventos, VFX e estados. Investigue especialmente `enemy1-squad3d.js`, `enemy1-squad-runtime3d.js`, `enemy1-dark-vfx3d.js`, loaders e demais referências. **Não reescreva poderes ou o estilo de combate agora.**
3. Inspecione os clips REAIS de `Demonio1.glb`, não presuma que nomes do Meshy == nomes GLB. Mapeie idle, andar, correr, alerta, dano, combos, esquiva, queda, levantar, magia e morte conforme clips existentes; inclua fallback explícito para faltantes. Corrija escala, pés no chão, orientação, sockets/hitboxes e rigging; clones animados com skeletons independentes.
4. Teste em navegador WebGL real com nosso agente (incluindo celular): carregamento, esquadra, caminhada, ataques, conjuração, dano, morte, performance, animações e todos os poderes originais. Faça screenshots/vídeo, rode testes existentes, capture resultados **com evidências reais**. Corrija regressões.
5. **Somente com a substituição comprovadamente funcional**, remova `Enemy1.glb`, `Enemy1-lod.glb` e quaisquer outros GLBs visuais antigos desse inimigo, eliminando referências quebradas. **Nunca apague** a lógica de poderes/VFX só por ter Enemy1 no nome. Se não passar nos testes, não apague e relate o bloqueio.
6. Abra/atualize a mesma PR #404 com mudanças, relatório de verificação, riscos e resultados. **Não faça merge automático**.
7. Depois, **se ainda houver tempo**, inicie a otimização em lotes dos demais modelos grandes e documente resultados em `docs/glb-otimizacao-mobile.md`; conserve originais recuperáveis na história do Git e preserve armaturas, animações, UV e qualidade, com comparação visual e medição de tamanho. Não tente substituir todos os modelos de uma vez sem testes.

**Critério de conclusão:** `Demonio1.glb` em uso real, poderes intactos, animações bem mapeadas, testes e imagens comprovando, e remoção dos GLBs antigos apenas após validação. Não confunda check de auditoria verde com migração concluída.

**Higiene:** quando finalizar, apague este arquivo de prompt da branch na mesma PR (sem apagar os documentos permanentes de auditoria/resultado). Responda ao usuário com breve resumo, PR e links das evidências.
