# Menu cinematográfico das sete galáxias

A interface combina Three.js (modelos reais GLB, planetas, shaders de fogo, partículas, eclipse, céu e lava) com HTML/CSS (texto, botões, progresso e navegação).

**Modelos confirmados no repositório:** `AnjoGuiador-otimizado.glb` (com reserva `AnjoGuia-lod.glb` e `Anjo-rig.glb`) e `Misteriosa-rig.glb`. Não utilizar fotografias desses personagens. A NPC misteriosa aparece em silhueta escura com borda magenta e corações 3D para preservar sua identidade.

**Arquivos:** `galaxies-three-scene.js` integra a cena; `galaxies-cinematic-models.js` carrega e anima os GLBs; `galaxies-living-inferno.js` implementa chamas instanciadas e luz procedural; `galaxies-gothic-depth.js` desenha a arquitetura do horizonte.

**Verificação:** `.github/workflows/galaxies-infernal-qa.yml` executa Chromium nas resoluções desktop 1536×864 e celular 852×393, fotografa todos os planetas, valida GLBs carregados, contexto WebGL, navegação e ENTRAR. Essas capturas não provam FPS no celular físico.

**Segurança de integração:** manter em branch separada, sem alterar Eldória, narrativa ou combate. Não fazer merge antes de revisar imagens e comportamento em dispositivo real.
