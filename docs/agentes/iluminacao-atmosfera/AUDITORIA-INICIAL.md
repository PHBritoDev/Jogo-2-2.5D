# Auditoria inicial — iluminação e atmosfera (2026-11-12)

## Escopo e segurança
Auditoria estática inicial; **nenhuma medição real de FPS, GPU, screenshots antes/depois ou execução jogável foi realizada**. Não alegar melhora visual ou desempenho. Não modificar main nem arquivos do PR #481. Branch exclusiva.

## Evidências verificadas
- `eldoria-light-water.js`: luz direcional com PCFSoftShadowMap; autoUpdate=false; shadow map 1024 (lowSpec) / 2048 (outros); volume de sombra ±52 / ±65; atualização quando foco se desloca ≥10 unidades em X ou Z, ou forçada; ambiente PMREM gerado uma vez em perfil superior.
- Água: normais procedurais e animação no shader, sem render target de reflexão por frame; duas variantes de material.
- `eldoria-cenario-preview.html`: cena **isolada**, Three.js 0.170, sRGB, ACESFilmicToneMapping, exposição 1.14 dia / .99 noite; cavernas usam 1.35; neblina FogExp2; um HemisphereLight e um DirectionalLight na cena base; renderer.info expõe draw calls/triângulos. A prévia não é prova do renderizador da campanha.
- PR #481 altera `mundo-3d-prototype.js`, `map3d.js`, prólogo, cena e testes; preservar sem alterações concorrentes.

## Riscos e hipóteses (não bugs confirmados)
1. Atualização seletiva de sombras pode deixar sombras obsoletas após movimentação de objetos que projetam sombra; verificar no jogo antes de mudar.
2. Trocas dia/noite e exposição de caverna devem ser avaliadas com capturas reproduzíveis, evitando mudanças globais.
3. PMREM inicial pode provocar pico de compilação/inicialização; não confundir com custo por frame.
4. Valores de FogExp2 e exposição na prévia devem ser julgados visualmente em cenas reais.

## Plano de baseline obrigatório antes de editar renderização
- Capturar build/commit, viewport, DPR, perfil gráfico, GPU real e browser.
- Em celular físico, repetir rota e movimento de câmera em floresta, vila, entrada de caverna e interior, com período de aquecimento fixo.
- Registrar p50/p95/p99 de frame time, FPS, stutters, renderer.info.render.calls/triangles, programas, texturas e geometrias, e contagem de sombras/render passes quando observável.
- Capturar PNGs antes/depois nas mesmas posições, horário e configurações. Separar SwiftShader (QA funcional) de GPU real (performance).
- Só depois experimentar em módulo isolado ajuste **local** de composição de luz/exposição na caverna ou floresta, sem novos passes; manter apenas com ganhos comprovados.

## Técnicas a avaliar
- Ajuste da composição existente e temperatura de cor antes de criar luzes novas.
- Lightmaps estáticos onde houver geometria estável, considerando memória de textura.
- Fog atmosférico localizado e transição de exposição sem pós-processamento extra.
- Evitar bloom, SSAO, volumetria e sombras extras sem orçamento de GPU.

## Referências técnicas
- https://threejs.org/docs/#api/en/renderers/WebGLRenderer
- https://threejs.org/docs/#api/en/lights/shadows/LightShadow
- https://threejs.org/manual/#en/shadows
- https://threejs.org/manual/#en/color-management

## Status
**Auditoria parcial, sem alteração visual, sem benchmark real e sem validação de regressão.** Próxima etapa: verificar implementação da campanha, instrumentar baseline sem afetar gameplay e medir em GPU mobile.