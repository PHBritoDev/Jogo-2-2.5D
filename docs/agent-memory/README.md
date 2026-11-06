# Memória técnica dos agentes (V5)

Memória técnica versionada do projeto, não memória privada do ChatGPT.

- known-issues.json contém decisões e fatos confirmados.
- O agente produz memoria-candidata.json no artefato do CI; não comita suspeitas automaticamente.
- programador-plano.json contém propostas e evidências, nunca patches automáticos.
- performance.json mede WebGL em Chromium/SwiftShader, NÃO mede FPS real de Android.
- comparativo.json só compara relatórios equivalentes se AGENT_PERF_BASELINE apontar baseline legítimo.
- Adaptar URL, requiredPaths e protectedPaths para projetos futuros.
- Não gerar gastos nem alterar contas, credenciais, publicação ou fazer merge automaticamente.
