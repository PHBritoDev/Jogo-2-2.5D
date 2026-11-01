# Protocolo de recuperação — personagem GLB fica gigante

Este documento registra a causa e a solução confirmada em 12/10/2026 para o bug em que o protagonista 3D aumentava absurdamente de tamanho durante o uso de animações.

## Estado confirmado
- O usuário testou a Modificação 23 e confirmou: **o tamanho voltou ao normal**.
- Não reverter essa correção nem substituir os arquivos pela versão anterior só para tentar “voltar ao normal”.
- Arquivos principais: `protagonista-model-20261012.js`, `index.html`, `vhazrael-test.html`.
- A página de teste usa o GLB `Protagonista.glb).
- PR de referência da correção original para o mesmo tipo de bug no Bispo VHAZRAEL: https://github.com/PHBritoDev/Jogo-2-2.5D/pull/49

## Causa técnica
Havia dois problemas relacionados, e resolver só um não bastava:

1. **As animações GLB podem substituir a escala de qualquer nó/ossos do rig.** Como o modelo recebe uma escala de ajuste (*fit*) para atingir a altura-alvo, um clip que altera a escala de um nó pode multiplicar esse ajuste e transformar o personagem num gigante.
2. **O cálculo inicial do tamanho do protagonista usava `THREE.Box3().setFromObject(root)`.** Na versão antiga do Three.js usada pelo projeto, isso pode usar limites brutos da geometria e não medir corretamente a malha deformada pelo esqueleto (*skinning*). Um fator de escala calculado com altura errada normaliza o modelo de maneira incorreta.

## Correções que funcionaram
1. Adicionar `measureModelBounds(model)`: atualizar matrizes e esqueleto, medir vértices de `SkinnedMesh` após aplicar `boneTransform`, e usar esses limites para calcular a altura real.
2. Substituir as medições `new THREE.Box3().setFromObject(root)` usadas no ajuste inicial por `measureModelBounds(root)`.
3. Manter o bloqueio de escala inspirado no PR #49: guardar a escala-base de **todos** os nós do modelo depois do ajuste e restaurá-la após cada `mixer.update(dt)`. Não bloquear posição/rotação; caminhada e ataques precisam continuar animados.
4. Atualizar a versão de cache no HTML para forçar o navegador a baixar o JS novo. A Modificação 23 usa `protagonista-model-20261012.js?v=mod6-skinned-bounds-scale-lock-20261012`.
5. Manter `window.ProtagonistaScaleDiagnostics` para ajudar a investigar o fator e a altura medidos.

## Se o bug voltar
- Primeiro confirmar que a página está carregando o JS atual e que o parâmetro de cache mudou; evitar concluir que o patch falhou antes de verificar cache e arquivo publicado.
- Ler os arquivos atuais do branch `main`; não confiar em lembranças, trechos antigos ou código de outra branch.
- Comparar com o PR #49 e preservar as duas partes da solução: medição esquelética correta + restauração de escala de todos os nós após o mixer.
- Conferir se há outro script, grupo pai, escala de `pivot`/raiz ou outro GLB alterando a escala.
- Não mexer no código de combate/câmera sem evidência de que ele causa o problema.
- Não dizer que está corrigido sem teste visual real. Depois de alterar, entregar link com cache atualizado e pedir confirmação do usuário.
- Não apagar nem reescrever a correção que já funciona; fazer mudanças pequenas, verificáveis e compatíveis com o estado atual.

## Link de teste
https://phbritodev.github.io/Jogo-2-2.5D/vhazrael-test.html?vhazraelTest=1&vhazraelFloorOffset=-0.35&refresh=2010130&protagonista3D=1
