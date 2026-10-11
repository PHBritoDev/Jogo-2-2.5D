# Valério — checkpoint estável (2026-10-11)

## Estado confirmado pelo usuário no GitHub Pages
- O modelo 3D do Valério voltou ao tamanho/proporção corretos.
- Respiração e caminhada já funcionam.
- A caminhada está rápida demais para o deslocamento: reduzir a velocidade/ritmo da animação para combinar com a distância percorrida.
- Ainda faltam animações de ataque, receber dano e demais ações de combate.

## Regra de segurança para próximas alterações
- NÃO mexer na escala, normalização, altura ou enquadramento do modelo enquanto não houver motivo comprovado.
- NÃO substituir o GLB que está funcionando por uma versão diferente sem backup e teste isolado.
- Se o tamanho voltar a quebrar, comparar primeiro com o modelo conhecido como correto do commit `e4af770` antes de tentar novos cálculos de escala.
- Fazer mudanças pequenas e isoladas; testar a dimensão com `?valerioTest=1` antes de continuar.

## Referência de recuperação
- Repositório: https://github.com/PHBritoDev/Jogo-2-2.5D
- PR de recuperação do modelo: https://github.com/PHBritoDev/Jogo-2-2.5D/pull/79
- GLB conhecido como bom: `Bispo1.0.glb` do commit `e4af770`.
- Teste da dimensão: https://phbritodev.github.io/Jogo-2-2.5D/?valerioTest=1

## Próxima ordem de trabalho
1. Ajustar o ritmo da caminhada sem alterar a escala nem o deslocamento de movimento.
2. Implementar/analisar animação de ataque e garantir que a espada seja usada na mão direita.
3. Implementar reação ao dano e outras animações de combate.

Este arquivo registra o estado observado pelo usuário; sempre testar novamente após cada publicação.
