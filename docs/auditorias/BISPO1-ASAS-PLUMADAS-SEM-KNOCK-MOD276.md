# Mod 276 — Bispo 1: asas de anjo sombrio e retirada de empurrão

## Mudança 1 — Asas substituídas, não apenas bloqueadas

A referência enviada pelo criador mostra duas asas negras enormes, arqueadas e curvadas, nascendo dos ombros e descendo em penas longas e pontiagudas, com contorno violeta e interiores escuros. A imagem é orientação artística, não uma textura a ser colada sobre o personagem.

O arquivo vhazrael-feather-wings3d.js cria um par de asas espelhadas com geometria 3D original: arco anatômico, membrana escura com profundidade, plumas primárias e secundárias trianguladas e nervuras de borda violeta. As penas são agrupadas em uma malha por lado, para desempenho móvel; LOD baixo reduz contagem mas mantém a silhueta. A camada anterior com wingGeo e os shaders WING_V/WING_F foram EXCLUÍDOS do VFX de espada, não ocultados.

## Mudança 2 — Sem knockback no corte nem na onda de choque

Em vhazrael3d.js, o ataque throne tinha knock 1.8 no corte e 1.4 na onda de choque. Ambos passaram a 0; o handler de dano só cria uma força de afastamento quando info.knock é diferente de zero. Assim o protagonista permanece no local atingido e não é arremessado para fora do restante dos efeitos da Ruptura.

Dano, colisões, tempos, defesa, janela de esquiva e a animação permanecem intactos. Os outros golpes de espada e os outros bispos conservam seus empurrões. Assim como antes, a mesma habilidade não dá dano duplicado ao mesmo alvo: as explosões subsequentes são fases visuais e a onda de choque pode atingir outros alvos.

## Verificações

- vhazrael.test.mjs: simulação real da Ruptura, checando knock 0 para corte e choque com dano preservado;
- vhazrael-reference-sakuga.test.mjs: pares simétricos, pontas curvas, asas mais altas/baixas que o boss, LOD mobile e exclusão das asas antigas;
- tools/visual-lab/vhazrael-reference-qa.cjs: Chromium/WebGL; inspeção das malhas visíveis e das posições em cada fase, comparação do mesmo frame com efeito anterior e novo, gravação até o fim;
- Resultados artísticos e FPS físico Android dependem de exame de imagens/vídeos. Testes verdes não significam fidelidade visual 100%.

Sem modelos GLB novos, dependências novas, prompts externos, APIs pagas ou mudanças nos ataques dos demais chefes.
