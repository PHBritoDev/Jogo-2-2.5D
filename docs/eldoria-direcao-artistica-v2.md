# Eldória — direção artística 2.0 e gates de qualidade
**07/11/2026 • PR #407 • apenas prévia isolada • roteiro canônico: `docs/narrativa/ato-1-eldoria-roteiro-v1.md`**

## Referências prioritárias do criador (Biblioteca do projeto)
- `1000363692.jpg`: VILA. Não copiar a pintura: manter relações espaciais (árvores ancestrais dominam a silhueta, casas de telhado verde sob copas, branco calcário no mobiliário, ponte, caminhos sinuosos, vegetação integrada). O roteiro **exige fonte seca**, portanto não reproduzir fonte cheia de água.
- `1000363693.jpg`: FLORESTA/LAGO. Ponto de chegada pela trilha → lago azul turquesa em área ensombrada → árvores naturais e plantas nas margens → profundidade visual de troncos atrás da água. Não parecer um disco isolado em gramado aberto.
- `1000363694.jpg`: campo ensolarado e boulders no prólogo; encenação posterior.
- `1000363695.jpg`: círculo ritual à noite; priorizar suspense com luz localizada, sem violência gratuita.
- `1000363696.jpg`: entrada de caverna quase engolida pela mata, ancorada no relevo.
- `1000363697.jpg`: interior cristalino azul, ainda não implementado.
- `1793986649346.jpeg`: imagem escura/horror da história posterior, **não** usar para decorar a cidade.

## Referências técnicas externas pesquisadas
- [GDC 2021 — Genshin Impact: Crafting an Anime Style Open World](https://gdcvault.com/play/1027539/-Genshin-Impact-Crafting-an): pipeline NPR e estilo de mundo. Inspirar-se nos princípios, nunca reproduzir assets/expressão artística.
- [MiHoYo — desenvolvimento e iluminação](https://www.hoyolab.com/article/15499): luz/sombras dinâmicas, oclusão e névoa dão profundidade. Nosso orçamento de GPU mobile **não** comporta todos esses recursos simultaneamente.
- [Three.js — shadows](https://threejs.org/manual/pages/shadows.html): uma luz com sombra, frustum controlado, sombras seletivas.
- [Three.js — color management](https://threejs.org/manual/pages/color-management.html): Linear-sRGB na iluminação, saída sRGB.
- [Three.js — PMREM](https://threejs.org/docs/pages/PMREMGenerator): ambiente barato para brilho especular, diferente de refletir geometria real a cada quadro.
- [Genshin Dragonspine design](https://www.hoyodex.com/wiki/genshin-impact/dragonspine-design): integração de rochas, árvores, caminhos e momento de descoberta; a composição precisa funcionar de todos os ângulos importantes.

## Entregas deste ciclo
- `eldoria-environment-art.js`: praça com fonte seca rachada, caixotes vazios/sacas como pistas visuais da escassez, cercas claras, arco de pedra, raízes de árvores ancestrais, vegetação rasteira, rochas musgosas e plantas aquáticas em torno do lago.
- `eldoria-forest-canopy.js`: copas orgânicas com cores por vértice, troncos menos cilíndricos; instancing mantido.
- `eldoria-asset-plan.js`: árvores monumentais enquadram a vila; árvores GLB detalhadas e pedras foram posicionadas na margem do lago, evitando plantio dentro da água.
- Testes Node validam módulos novos e impedem o retorno de GLBs de floresta dentro da bacia.
- `tools/visual-lab/eldoria-visual-qa.cjs` captura 12 quadros mobile/desktop reais via Chromium/SwiftShader para cada versão do PR.

## Limites e correções futuras
1. **Fidelidade ainda insuficiente** para considerar cenário final: mundo amplo segue simples, copas auxiliares ainda possuem facetas, telhados/portas precisam de correlação mais precisa com a referência em tomadas ao nível do jogador.
2. Modelos GLB podem usar texturas e malhas caras; perfil de software QA **não é benchmark Android**. Medir memória, FPS/1% low, draw calls, tempos de download no dispositivo.
3. Lago usa material estilizado PBR com brilho procedimental, não reflexos reais das árvores. Melhorar à medida que o orçamento de GPU permitir, jamais sacrificar jogabilidade por uma cena de showcase.
4. Ponte/caverna precisam de contato/colisão e travessia jogáveis; páginas isoladas não garantem esses atributos.
5. Cidade continua sem NPCs/diálogos/missões; **não inventar execução do roteiro** nem mexer em personagens antigos. Esta é a etapa de ambiente apenas.
6. Não fazer merge para `main` antes de revisão visual e aprovação da integridade do jogo publicado.
