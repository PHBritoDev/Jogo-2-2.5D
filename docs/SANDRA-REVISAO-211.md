# Sandra — revisão da fonte (Mod 211, rascunho)

## Estado real

Esta revisão altera o gerador Blender `tools/blender/m8_sandra.py`. **Sandra-rig.glb ainda é o modelo do Mod 210. A aparência no jogo ainda não mudou.** O PR não está pronto para merge.

Base conferida: main em 4fab6a627bde50609a889f5f6a4af5e4dc323e4e. Referências visuais: imagem enviada pelo autor em 26/10/2026 e `docs/roteiro/M8-sandra.png` (prévia anterior, não evidência desta revisão).

## Ajustes na fonte

- Olhos: reduzir os alvos de ampliação e a abertura vertical, coordenando a curva dos cílios; preservar a pupila em cruz. Concentrar a emissão na cruz, reduzindo a emissão da íris.
- Rosto: reduzir o volume adicional dos lábios e trocar o vermelho vivo por vinho suave.
- Cabelo: carmesim mais escuro, sem emissão própria, mechas mais estreitas e achatadas, pontas afiladas, franja diagonal e comprimento maior nas costas. Aumentar segmentos longitudinais de 20/22 para 28 nas mechas traseiras, sem aumentar o número de mechas ou materiais.
- Coroa: espinhos mais curtos e finos; manter o aro e as gemas.
- Roupa: couro menos metálico, meias mais foscas, prata escurecida e gemas menos luminosas.

Esqueleto, pesos, clipes, narrativa e pessoa misteriosa não foram editados. Isso não substitui verificar deformações no modelo gerado. O corte pintado da roupa e a ausência de física de pano continuam sendo limitações.

## Evidências e pendências

Realizado: leitura do gerador e inspeção visual da prévia do Mod 210 pelo conector GitHub; verificação de que cada trecho substituído existe na fonte base.

**Não executado:** gerador Blender, compilação Python, exportação/reimportação GLB, render da revisão, animações, testes do jogo, navegador e Android. O terminal não foi usado após a instrução do autor. O conector forneceu a prévia PNG, mas não conseguiu fornecer o conteúdo binário de Sandra-rig.glb.

Antes de sair do rascunho:

1. Gerar o GLB com o script e os dados MPFB2 já exigidos pelo gerador; manter o modelo 210 disponível no histórico.
2. Renderizar frente, perfil, costas e rosto sob luz neutra; comparar com a referência. Conferir se os olhos estão encaixados, sem interseções nas pálpebras, e se a franja deixa os olhos legíveis.
3. Reimportar o GLB e comparar nomes/duração dos clipes e ossos; verificar idle, caminhada e ataques, especialmente cabelo atravessando ombros e saia atravessando pernas.
4. Contar triângulos, materiais e bytes antes/depois; verificar custo no navegador e Android real quando disponível.
5. Substituir Sandra-rig.glb somente após essas verificações, garantir cache novo para o GLB e publicar capturas e evidências reais. Os marcadores 211 desta branch são preparação, não atestado de modelo entregue.
