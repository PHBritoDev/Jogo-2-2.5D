# Agente Autocorretor V6 — modo seguro

**Objetivo:** identificar erros locais simples, preparar correções determinísticas e testar sintaxe sem alterar a versão publicada do jogo.

## O que realmente faz
1. Varre imports relativos nos JavaScript do laboratório visual.
2. Identifica caminhos que erraram somente a extensão `.js` ou maiúsculas/minúsculas do nome **quando existe um único arquivo correspondente**.
3. Aplica a sugestão em uma cópia temporária, confere sintaxe com Node e descarta a cópia.
4. Salva `diagnostico.json` e `correcoes-para-revisao.json` como artefatos da execução no GitHub Actions.
5. Testes regressivos cobrem ambiguidades, traversal, escopo limitado, sintaxe e ausência de merge automático.

**Ainda não é:** uma IA que entende o jogo inteiro, corrige qualquer bug ou garante qualidade artística. Não cria patches no jogo nem abre PR sozinho. Para erros de gameplay, o próximo nível é conectar relatório visual + stack traces a propostas revisadas e reproduzir no navegador.

## Como usar
```sh
node --test tools/visual-lab/agent-v6-autofix.test.cjs
node tools/visual-lab/agent-v6-run.cjs
```

O laboratório do jogo 3D e os agentes V5 continuam independentes. Não se exige PC do criador, Blender, fal pago nem chaves de API. O GitHub Actions executa tudo.

## Segurança
Não tocar em `DevoradorLunar.glb`, poderes pendentes de Bispo 4/Ganância, nem substituir personagens. **Toda sugestão precisa de revisão, teste real e PR antes da publicação.** A automação nunca cobra créditos nem instala conectores.
