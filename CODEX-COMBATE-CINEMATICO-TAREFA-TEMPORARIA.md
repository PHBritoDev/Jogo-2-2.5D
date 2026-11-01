# CODEX — TAREFA TEMPORÁRIA: RECONSTRUIR COMBATE 3D

**Leia este arquivo inteiro antes de alterar código.** O criador também enviará um ZIP compacto com storyboard de CINCO vídeos de referência e uma especificação detalhada chamada INSTRUCOES-CODEX.md. O ZIP não está neste repositório: solicite-o caso ainda não tenha recebido. Este arquivo no GitHub é o ponto de entrada da tarefa.

Projeto: PHBritoDev/Jogo-2-2.5D, branch main. Você deve pesquisar, implementar, testar e abrir PR. Trabalhe em branch separada. Não faça alterações destrutivas na main nem anuncie êxito sem teste. Preserve a dimensão de VHAZRAEL, o mundo 3D, GLBs, habilidades, VFX, cooldowns, save, controles mobile e colisões. Não substitua os três personagens por uma mesma animação.

## Escopo exato
1. **Protagonista:** espadachim celestial fluido. Combos variados (diagonal com avanço, estocada, launcher, giro, finalização), ataque correndo, dash-attack, salto+ataque, ataque aéreo, plunge. Cada Rito de Espada existente recebe coreografia própria que combine com sua função.
2. **Mini-boss Enemy1:** predador agressivo de garras; ataques rápidos, investida, salto ofensivo, giro curto, recuo e pressão com telegraphs justos.
3. **Mini-boss Enemy2:** executor pesado de foice; cortes amplos, giros pesados, avanço com foice, salto esmagador, combo de 2–3 etapas e recuperação vulnerável.
Não alterar todos os Enemy1/Enemy2 comuns sem necessidade.

## Arquitetura
Inspecione o código e os AnimationClips reais de cada GLB antes de selecionar clipes. Use AnimationMixer/AnimationAction, crossfade, state machine data-driven, windup/active/recovery, input buffer, cancelamentos seguros, hitlag/hitmark, traces da arma, movimento sincronizado à cápsula física, root motion/motion warping limitado quando aplicável. Sem teleportes, pés deslizando, escala GLB gigante, ataques no ar virando idle, colisões falsas, múltiplos hits indevidos, travamento de câmera ou VFX fora do golpe. Ajustar performance Android e fallback gráfico.

## Referências visuais
ZIP do usuário: 1000362753.mp4 = jogo atual e HUD; 1000362754.mp4 = RPG de ação com combos avançando, saltos e impacto; 1000362755.mp4 = duelo e ritmo; 1000362756.mp4 = cortes com trilhas azuis; 1000362757.mp4 = cortes variados com arcos amarelos. ZIP compacto contém quadros, não os MP4 originais. Solicite vídeos completos para timings exatos.

Pesquise e adapte técnicas de Genshin Impact, Devil May Cry, Sekiro e Elden Ring, sem copiar assets. Fontes:
- https://threejs.org/docs/pages/AnimationAction.html
- https://threejs.org/docs/pages/AnimationMixer.html
- https://dev.epicgames.com/documentation/en-us/unreal-engine/locomotion-in-unreal-engine
- https://library.keqingmains.com/combat-mechanics/frames
- https://keqingmains.com/q/xiao-quickguide/
- https://www.youtube.com/watch?v=WN7K415Tbdk

## Execução e aceitação
1. Auditar arquivos, GLBs, clips e sistemas de combate existentes. Registrar inventário real.
2. Propor/implementar coreografias distintas por personagem e rito; criar animações originais/procedurais quando faltar clip, sem fingir que há animações inexistentes.
3. Sincronizar corpo, deslocamento, rotação, hitboxes, VFX, SFX, câmera, física e reação ao dano.
4. Criar modo de teste/arena para todos os golpes; testes de console, import, shader, colisão, dano, IA, câmera, mobile FPS e regressão do jogo.
5. Abrir PR, fornecer relatório, vídeos de demonstração e link de teste. Atualizar Mod visível só após integração real.
6. **APÓS TUDO VALIDADO**, excluir ESTE arquivo temporário no último commit. Se incompleto, manter arquivo e registrar pendências.

Leia também o ZIP enviado pelo usuário: INSTRUCOES-CODEX.md é a especificação principal e mais detalhada.
