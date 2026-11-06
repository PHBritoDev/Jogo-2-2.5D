# Instruções para agentes de IA e colaboradores

**PORTA DE ENTRADA:** [README.md](README.md) e [GUIA-PARA-IAS.md](docs/GUIA-PARA-IAS.md) mostram os sistemas, os caminhos reais e o fluxo de testes/PR. **Não inicie uma migração 2D**: ela é histórica; o runtime atual é 3D. Antes de editar, confira branch, commit e PRs pendentes. Não mova GLBs ou módulos sem auditoria dos imports e URLs do loader.

Antes de trabalhar neste repositório, leia **[PROMPT_MESTRE_DO_JOGO.md](PROMPT_MESTRE_DO_JOGO.md)**. Ele é a referência principal para a visão do criador, prioridades atuais, limites técnicos e estilo de colaboração.


**LEITURA OBRIGATÓRIA DE QUALIDADE:** leia também **[VISÃO MESTRA — QUALIDADE VISUAL, VFX, PERSONAGENS E GAMEPLAY](docs/VISAO-MESTRA-QUALIDADE-VISUAL-E-GAMEPLAY.md)** antes de criar ou alterar habilidades, personagens, espadas, animações, câmera ou efeitos. Este é um documento **permanente**, não um briefing temporário. Use-o como padrão artístico e de experiência; confirme o estado técnico no código. Quando o criador definir novas exigências duradouras, atualize-o com cuidado.

- O criador aceita melhorias proativas. Sugira e implemente melhorias coerentes com a visão, preservando os pilares da história e as funcionalidades existentes.
- Estado atual: o mundo 2D foi removido (Mod 202); o jogo é 100% 3D e as dimensões dos quatro Bispos acontecem dentro dele. Leia `ARQUITETURA.md`.
- Roteiro integral (fonte da verdade narrativa): `docs/GALAXIA-1-ROTEIRO-INTEGRAL-E-DIRECAO.pdf`. Execução em marcos, um por vez: `docs/MARCO-0-AUDITORIA-GALAXIA-1.md`.
- Próxima fase: reescrever a história, melhorar habilidades/IA de inimigos, Bispos e Pecado, combate e câmera do jogador e adicionar eventos.
- Preserve sistemas estáveis, confirme os arquivos e dependências antes de editar e prefira mudanças pequenas e testáveis.
- Após cada mudança de código, incremente o marcador numérico visível da modificação e forneça um link direto de teste compatível com celular.
- Nunca alegue que executou testes que não realizou.
- Leia também o código atual: as notas do prompt são contexto e o repositório é a fonte de verdade para o estado técnico.

## Regra permanente — melhoria proativa dos agentes e ferramentas (pedido do criador em 05/11/2026)
- O assistente e demais agentes podem identificar, criar e melhorar autonomamente ferramentas, pipelines de QA, diretores cinematográficos, agentes e integrações que beneficiem este jogo **e projetos futuros** (jogos, sites e aplicativos). Não é necessário pedir aprovação prévia para melhorias técnicas gratuitas e reversíveis no repositório.
- Avisar o criador após realizar qualquer melhoria ou mudança de ferramenta, explicando resumidamente o que mudou, benefício, testes feitos e links/PRs. Não alegar que foi validado visualmente só porque CI passou.
- Novas conexões de contas, instalação de plugins, permissões, autenticação e serviços externos exigem a ação explícita da conta quando a plataforma solicitar; **não** presumir autorização para gastos, compras, alterações de cobrança, publicação ou operações destrutivas. Não pedir credenciais em mensagens.
- Preferir agentes reutilizáveis com documentação e testes automatizados. Separar criação, medição objetiva e julgamento artístico: não inventar notas nem afirmar 80% de semelhança sem referência e avaliação comprovadas.
- Trabalhar em branches/PRs pequenos, reversíveis e com CI. Proteger jogo publicado, segurança, desempenho mobile e compatibilidade de versões. Nunca mesclar código não aprovado apenas para concluir uma tarefa.
- Se o criador congelar um elemento visual (ex.: Devorador Lunar a ser substituído futuramente por Meshy), não tocar nesse elemento; focar no restante até nova ordem.
- Para economizar o chat, **não colar prompts longos** aqui: armazenar instruções para outros agentes em arquivos do repositório e fornecer somente resumo e link.
