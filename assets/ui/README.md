# Menu cinematográfico das sete galáxias

O menu usa arte original autorizada pelo criador, projetada em camadas 2.5D e sete malhas curvas independentes. Cenário: anjo pérola, demônio orgânico, arco partido, ruínas e cachoeiras. Ganância domina o centro; o herói aparece de costas, com vento aplicado somente à capa. Correntes são geometria 3D instanciada. Seleção, giros Y discretos, névoa e movimento reduzido usam o renderer Three.js existente.

[Assets, origem e contrato técnico](menu/cinematic/README.md). [Cinzel local e licença OFL](menu/fonts/SOURCES.md). Não é uma captura da referência com regiões de clique: os mundos são objetos separados e os controles HTML mantêm IDs canônicos, moedas, progresso, requisitos, foco, toque, configurações e entrada real no mundo.

`galaxies-cinematic-art.js` implementa as camadas e relevos; `galaxies-three-scene.js` controla câmera, seleção, qualidade e ciclo de vida; `galaxies-cinematic-stage.js` mantém correntes e reserva geométrica. `galaxies-infernal-reference.css` concentra o layout. Sem WebGL, as mesmas regiões de arte aparecem com controles HTML e correntes SVG. Se a arte não carregar, `galaxies-cinematic-models.js` e `galaxies-scanned-scenery.js` carregam a reserva independente GLB/PBR/CC0. [Fontes da reserva](menu/polyhaven/LICENSE-SOURCES.md). Nenhum GLB original, campanha, HUD ou arquivo de versão foi alterado.

QA: `node --test galaxies3d.test.mjs`, `node tools/visual-lab/galaxy-menu-qa.cjs`, `node tools/visual-lab/galaxy-menu-world-qa.cjs`. Servir a raiz em 4173 e instalar dependências de `tools/visual-lab`. Overrides: `CHROMIUM_PATH`, `GALAXY_QA_BASE_URL`, `GALAXY_QA_OUTPUT`. O workflow publica imagens e JSON.

[Evidência real, antes/depois e limites de medição](qa/menu-cinematico-2026-11-15/README.md). Chromium/SwiftShader e viewport móvel não equivalem a um Samsung A55 físico. A comparação com a referência é visual, sem porcentagem inventada de similaridade.
