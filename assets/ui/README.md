# Interface 7 Pecados — totalmente procedural

A tela principal de galáxias NÃO usa imagens ou fotografias. O código Three.js em `galaxies-three-scene.js` gera sete mundos 3D, eclipse, auréola, anjo, nuvens e solo vulcânico (ShaderMaterial, geometria e CanvasTexture criada no navegador).

A seleção/progresso/entrada permanecem em `galaxies3d.js`. Apenas se WebGL não estiver disponível usa-se a arte SVG gerada em código `galaxies-infernal-art.js`.

O agente `.github/workflows/galaxies-infernal-qa.yml` testa WebGL real e captura o menu em 1536×864 e 852×393. Qualidade visual deve ser verificada contra a referência do criador antes do merge.
