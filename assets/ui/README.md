# Menu cinematográfico das sete galáxias

Uma cena Three.js, com controles HTML acessíveis. Ordem visual: Luxúria, Ira, Gula, Ganância, Soberba, Avareza, Inveja; IDs, desbloqueio e cálculo de progresso continuam canônicos. A capa usa arco partido, correntes instanciadas, Ganância maior, forças celeste/infernal, herói de costas, tecido ao vento e quedas d'água. O fallback SVG mantém a composição e os controles.

`galaxies-three-scene.js` integra planetas/câmera/qualidade; `galaxies-cinematic-stage.js` constrói cenário e tecido; `galaxies-cinematic-models.js` carrega os atores. `galaxies-infernal-reference.css` concentra o layout. DPR e partículas diminuem em telas pequenas/dispositivos modestos; movimento reduzido mantém a cena estática. Aba oculta suspende rAF. Fechar libera timers, observers, mixers, esqueletos e recursos GPU, inclusive cargas GLB tardias.

Modelos existentes: `AnjoGuiador-otimizado.glb`, `Asas.glb`, `Protagonista.glb` e `Misteriosa-rig.glb`. A misteriosa permanece em Luxúria. `menu/storm-effigy.glb` é cenário estático derivado de `Demonio1.glb`, sem identidade de novo chefe; exportação reproduzível em `tools/visual-lab/galaxy-menu-storm-export.py` (Blender 4.3.2, pose Alert, redução para 22%, sem texturas/animações). Nenhum GLB original foi alterado. Nenhuma imagem gerada paga ou bitmap da referência é usado no runtime.

QA: `node --test galaxies3d.test.mjs`; `node tools/visual-lab/galaxy-menu-qa.cjs`; `node tools/visual-lab/galaxy-menu-world-qa.cjs`. Servir a raiz em 4173; instalar dependências em `tools/visual-lab`. Overrides: `CHROMIUM_PATH`, `GALAXY_QA_BASE_URL`, `GALAXY_QA_OUTPUT`. O workflow publica imagens e JSON. O teste integrado usa um perfil isolado, entra pelo botão real e verifica o gate do mundo e os valores de campanha.

[Evidência antes/depois, métricas e limitações](qa/menu-cinematico-2026-11-15/README.md). Chromium/SwiftShader e viewport móvel não medem Samsung A55 físico. A referência anexada foi examinada visualmente; não há comparação pixel a pixel. O resultado permanece estilizado: equivalência ao realismo da arte de referência **não está demonstrada**. A aprovação artística e qualquer merge continuam manuais.
