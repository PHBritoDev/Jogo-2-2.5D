# Contrato futuro — troca dos personagens por GLB melhorados

Decisão do criador: primeiro expandir o mapa e depois substituir modelos atuais por personagens 3D com **rosto/boca visíveis e mais animações**. Não implementar novos ataques do Bispo 4 ou da Ganância nesta etapa.

## Para os novos modelos
- Respeitar nomes de nós, pivô da raiz, escala em metros e ponto de contato dos pés com o chão.
- Entregar GLB/GLTF texturizado com os clipes básicos: idle/respirar, andar, correr, atacar, receber dano, cair, levantar, pular, dash, morrer.
- Para rosto expressivo: blendshapes/morph targets ou ossos faciais para boca, olhos, expressões e fala; sem assumir que todos os GLBs tenham isso.
- Versão mobile: limites de triângulos, texturas compactadas quando suportadas, redução de draw calls e LOD conforme testes reais.
- Compatibilidade: criar adaptador de animações por nome e fallback para modelo antigo. Não reescrever sistema de combate para trocar a malha.
- Testes: verificar clipes, não flutuar, orientação do modelo, sincronização espada/mãos, colisões, FPS do aparelho e consumo de memória.

Este arquivo é um **plano técnico**, não afirma que modelos foram criados ou integrados.
