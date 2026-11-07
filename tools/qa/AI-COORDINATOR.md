# Coordenador de IAs — QA consultivo

Ferramenta independente para o RPG: **não muda gameplay, modelos, segurança, enredo, deploy nem branch main**.

## O que entrega
- Para cada PR, classifica os arquivos tocados e recomenda verificações específicas (carregamento, visual/WebGL, segurança, Ato 1, GLBs).
- Compara os caminhos alterados com até **40 outros PRs abertos** e aponta possíveis sobreposições entre trabalhos de Claude, Codex e outros agentes.
- Grava `report.md`, `report.json` e `overlaps.json` no artifact de **Actions → Coordenador de IAs - riscos e conflitos** (retenção 14 dias).
- Os resultados também aparecem no resumo da execução do workflow.

## Garantias e limites
- Trabalha no evento `pull_request` com permissões **somente leitura**; não grava comentário em PR, não mescla, não troca configuração, não altera arquivos de produção.
- A sobreposição é **por nome de arquivo**, não por linha. Duas IAs podem editar o mesmo arquivo sem conflito, ou quebrar uma dependência em arquivos diferentes.
- A classificação usa heurísticas, **não detecta** de fato todos os bugs e vazamentos. Se houver arquivo de credencial indicado, é preciso revisão humana imediata.
- O workflow não substitui CI, Playwright, análise visual dos vídeos, nem testes reais no Android. Uma aprovação de Actions não equivale a jogo aprovado.
- No fluxo manual, compara HEAD com seu primeiro pai, não toda a história de uma branch.
- Analisa no máximo 40 PRs adicionais por execução para evitar chamadas excessivas à API.
- Se o workflow falhar, não elimine testes de proteção para deixá-lo verde. Corrija a causa.

## Para IAs trabalhando em paralelo
1. Trabalhe em **branch/PR separado** e consulte os PRs abertos antes de modificar arquivos compartilhados.
2. Leia o resumo `Coordenador de IAs` no Actions do seu PR. Se aparecer outro PR com o mesmo arquivo, **coordene manualmente**, sem sobrescrever as alterações dele.
3. Execute os testes relevantes e valide cenas reais. Separe evidências de hipóteses.
4. Não faça merge automático; peça revisão antes de integrar.

## Execução local
Com Node.js 22+ e git disponível:

```sh
node tools/qa/ai-change-guard.mjs "$(git rev-parse main)"
```

Saída local em `artifacts/ai-coordinator/` (gerada, não adicionar ao Git).

## Planejador de testes por alteração
O arquivo `tools/qa/ai-test-router.mjs` lê o relatório de caminhos e gera `test-plan.json` com verificações específicas para Ato 1, personagens, inimigos, Bispos, bootstrap, mobile e segurança. Ele **só recomenda** testes; não reivindica execuções, não cria falsos resultados nem roda cenas pesadas sem necessidade. O próprio workflow roda `node --test tools/qa/ai-test-router.test.mjs` e mostra o plano no resumo.

**Como aproveitar com Claude/Codex:** ao abrir PR, acompanhe o Actions `Coordenador de IAs - riscos e conflitos`, leia `report.md` e `test-plan.json` no artifact. Se dois trabalhos tocarem o mesmo arquivo, acordem a ordem de integração e revisem o diff em vez de sobrescrever código. Em seguida execute os testes recomendados no ambiente adequado; o coordenador não substitui os laboratórios existentes.

**Custo e segurança:** não há chamadas pagas de IA nem segredos adicionais, apenas GitHub Actions; execução usa minutos da conta conforme o plano. Os resultados são consultivos e sujeitos a limitação de tempo e quantidade de PRs analisados.

## Proteção de coexistência — novembro de 2026
- O workflow tem grupo de concorrência **próprio**, sem cancelar jobs de segurança, Ato 1 ou laboratório visual.
- A pesquisa de sobreposição com PRs é **consultiva** (`continue-on-error`): instabilidades na API do GitHub não impedem que outras IAs avancem.
- Testes do detector de alterações usam repositórios temporários com Git; os testes do roteador usam diretórios temporários. Nenhum teste manipula arquivos do jogo.
- **Não habilitar este workflow como status obrigatório de proteção de branch** sem avaliar seu valor e possíveis custos. Ele não deve substituir as verificações reais de compilação, segurança e gameplay.

## Passagem entre Claude, ChatGPT e outras IAs
O workflow também gera **`HANDOFF.md`**, uma página curta, extraída dos arquivos realmente modificados no PR: SHA de base e cabeça, áreas afetadas, arquivos, testes sugeridos e instruções para consultar outros PRs. É um documento **por execução**, no artifact, não uma instrução permanente editando `AGENTS.md`.

Ao trocar de IA, forneça o link do PR e do artifact ao novo desenvolvedor. Ele deve ler o `HANDOFF.md`, **confirmar o estado atual do GitHub** e conferir os últimos pedidos do criador. O documento não conhece o progresso fora do GitHub e **não pode** afirmar que o Claude terminou uma tarefa ou que testes WebGL/Android passaram.

Não cria automações concorrentes nem scripts que editam código ou acionam testes de navegador automaticamente. Aproveita apenas o workflow já existente.
