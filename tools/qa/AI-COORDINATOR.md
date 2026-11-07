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
