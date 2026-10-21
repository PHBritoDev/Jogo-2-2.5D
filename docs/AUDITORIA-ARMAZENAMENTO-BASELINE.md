# Auditoria de armazenamento — baseline inicial

**Escopo deste relatório:** inventário da árvore atual e plano seguro. **Não é uma auditoria histórica completa e não autoriza exclusões.**

## Snapshot analisado
- Repositório: PHBritoDev/Jogo-2-2.5D
- Branch consultada: main
- Commit de referência: 927286f1616c8a533ca1ee8c5145eee97d3b2f8a
- Data observada: 2026-10-21
- Arquivos rastreados na árvore atual: 95
- Assets de mídia/modelos: 43
- Tamanho bruto somado dos assets atuais: aproximadamente 166,84 MiB
- Assets com pelo menos 1.000.000 bytes: 29, somando aproximadamente 161,51 MiB

Os tamanhos acima são tamanhos dos blobs atuais informados pelo GitHub, não o tamanho de download comprimido, memória de GPU nem o tamanho total do histórico.

## Maiores arquivos atuais

| Arquivo | Tamanho aproximado |
|---|---:|
| Ganancia3.glb | 18,91 MiB |
| Npc.glb | 16,27 MiB |
| Ganancia2.glb | 15,45 MiB |
| Ganancia1.glb | 14,01 MiB |
| Bispo4.glb | 12,80 MiB |
| AnjoGuia.glb | 11,15 MiB |
| Bispo3.glb | 10,34 MiB |
| Enemy1.glb | 8,85 MiB |
| Enemy2.glb | 8,43 MiB |
| Bispo1.0.glb | 7,70 MiB |
| Bispo2.glb | 5,59 MiB |
| AnjoGuia.png | 2,51 MiB |
| Ganancia3.png | 2,31 MiB |
| Ganancia2.png | 2,13 MiB |
| Bispo4.png | 2,12 MiB |
| Lua.glb | 2,09 MiB |
| Enemy1.png | 2,00 MiB |
| Ganancia1.png | 1,93 MiB |
| Enemy3.glb | 1,84 MiB |
| Enemy4.glb | 1,73 MiB |

## Evidência de uso e cautelas iniciais

- A busca no código atual encontrou carregamentos de AnjoGuia.glb e Enemy1.glb em mundo-3d-prototype.js; não excluir esses arquivos.
- Os modelos de Bispos, Ganância, NPCs, inimigos, espadas, Lua e retratos são candidatos a otimização por tamanho, não candidatos automáticos à exclusão.
- A árvore atual contém os sistemas antigos da campanha e o protótipo 3D. Alguns assets podem ser usados por páginas de teste, snippets ou carregadores que reescrevem caminhos dinamicamente; a ausência de referência direta num único arquivo não prova que estejam sem uso.
- Ainda não há lista aprovada de arquivos sem uso. Nenhum arquivo foi excluído ou substituído nesta etapa.

## Próximas etapas obrigatórias

1. Criar um clone espelho completo e recuperável do repositório, com branches e tags.
2. Executar git filter-repo --analyze nesse clone e gerar relatórios por extensão, caminho e blob, incluindo arquivos que só aparecem no histórico.
3. Para cada asset grande, rastrear todos os commits em que apareceu, mudanças de nome e referências atuais (estáticas e dinâmicas).
4. Classificar cada arquivo: usado atualmente; histórico apenas; duplicata byte a byte; ou uso incerto.
5. Fazer otimizações de GLB em cópias de trabalho, comparar qualidade, texturas, materiais, rig e todos os clipes, testar no jogo e medir a redução.
6. Apresentar relatório com candidatos, evidências, riscos e economia estimada.
7. **Antes de reescrever histórico ou atualizar refs remotas**, criar backup independente, explicar efeitos sobre hashes, branches, tags, forks e PRs e obter autorização explícita do criador.
8. Não alterar a main, apagar arquivos nem fazer force-push sem autorização.

## Limitação desta execução

O inventário da árvore atual foi obtido pela API do GitHub. O ambiente de execução não conseguiu clonar o repositório diretamente para fazer uma análise local do histórico completo; portanto, o tamanho total do histórico e os blobs antigos ainda não foram calculados. Não declarar a auditoria histórica concluída até executar as etapas acima.
