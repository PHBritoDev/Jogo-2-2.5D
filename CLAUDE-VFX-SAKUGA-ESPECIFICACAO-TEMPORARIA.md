# TAREFA TEMPORÁRIA PARA CLAUDE — DIREÇÃO DE VFX SAKUGA 2.5D / THREE.JS

**Projeto:** https://github.com/PHBritoDev/Jogo-2-2.5D (main atual, Mod 241 verificada no HTML). **Prioridade:** VFX de qualidade premium, leitura clara e performance Android. **Não executar alterações destrutivas na main.**

## 0. Missão, entradas e saída
Atue como engenheiro sênior de WebGL/Three.js/GLSL, animador técnico e diretor de efeitos anime sakuga. Investigue o projeto REAL antes de programar. O usuário enviará junto desta tarefa **duas imagens** (esfera rubro-negra de Dragon Ball Heroes; golpe X carmim de manhwa) e **um vídeo MP4** de referência. Use-os como direção de arte, NÃO copie frames, personagens, logos, texturas ou assets protegidos. Se os anexos não estiverem acessíveis, peça-os; não invente análise visual.

**Entregável obrigatório:** entrega na branch do GitHub com commits e Pull Request, com `INSTRUCOES-CODEX.md`, 5 storyboards detalhados em `storyboards/`, implementações modulares em `src/` ou caminhos originais espelhados, testes e manifesto de integração. NÃO despejar arquivos de código no chat; NÃO criar ZIP. Se tiver acesso de escrita ao GitHub, use **branch própria**, sem tocar na branch do Codex nem mesclar na main. Entregue Pull Request com commits reais. Nunca declarar conclusão sem testar.

## 1. Preservação e integração concorrente
- Codex está trabalhando separadamente no combate, cinco espadas, protagonista e mini-bosses Enemy1/Enemy2. Não editar sistemas de animação, state machine, GLBs, cinco espadas, hitboxes e movimento do Codex sem acordo explícito. Propor interfaces de eventos de impacto e cast (não substituir implementação).
- Preservar a dimensão de Valério, mundo 3D, saves, missões, IA, controles mobile, habilidades existentes fora dos três slots, colisões, som, cooldowns, economia, fallback de qualidade.
- **Versão:** o HTML na main mostra 241. Há relato de 258 testes aprovados e 1 teste obsoleto esperando 238. Corrigir o teste para a versão efetivamente publicada/configurada, preservando a verificação; NÃO trocar o marcador para 238 nem forçar 259/259 sem executar testes.
- A main pode mudar durante a tarefa. Registrar SHA-base e fornecer diff/patch aplicável e instruções de cherry-pick/rebase; resolver conflitos manualmente, sem sobrescrever o trabalho do Codex.
- Fazer inventário dos módulos atuais antes de substituir: `vfx-flow3d.js`, `vfx-trail3d.js`, `celestial-fxkit3d.js`, `vfx-impact3d.js`, `skill-x-rupture3d.js`, `skill-x-rupture-vfx3d.js`, `skill-twin-portals3d.js`, `skill-twin-portals-vfx3d.js`, `skill-judgment-dragon3d.js`, `skill-judgment-dragon-vfx3d.js`, `mundo-3d-prototype.js`, `mundo-3d-prototype.html`, loader e testes. Verificar nomes reais antes de editar.

## 2. Padrão visual obrigatório
Proibidos efeitos dominados por fumaça translúcida plana, círculos difusos genéricos, esferas plásticas uniformes, planos 2D sem espessura, magenta lavado e VFX que atravessam cenário sem colisão.
- Construir **silhuetas 3D legíveis** (malhas extrudadas, ribbons com largura, volumes de energia, rachaduras angulares, detritos reais), núcleo de emissão, cor intermediária, contorno escuro, linhas de velocidade e sparks de alta frequência.
- Dissolução por **alpha erosion** com ruído Perlin/Voronoi/fBm, threshold temporal e bordas emissivas; evitar `smoothstep` com bordas invertidas e shader incompatível com WebGL1. Fazer fallback sem pós-processamento obrigatório.
- Separar animação de VFX de aplicação autoritativa de dano. Hitstop visual 40–60 ms apenas no impacto confirmado, nunca congelar a simulação física/IA inteira. Shake amortecido com opção de redução de movimento; flash/whiteout configuráveis para acessibilidade.
- Geometrias e materiais reutilizados, `InstancedMesh` para pedras/partículas, buffers limitados, `dispose()`, limpeza de timers/eventos, `deltaTime` e bounds; sem crescimento de memória por casts repetidos.

## 3. Chefe: Enemy2 e Mini-boss Enemy2 — Julgamento do Vórtice Abissal
Problema reportado: fumaça magenta translúcida e manchas pretas redondas sem massa. Primeiro localizar a habilidade verdadeira no projeto, confirmar se pertence ao boss e não confundir com outras fases.
- Paleta: núcleo branco `#FFFFFF`, magenta incandescente `#FF28D8`, roxo escuro `#25002E`, abismo `#08020D`; ajustar no jogo sob iluminação noturna.
- Impacto com expansão agressiva (primeiros 2–3 frames em 60 FPS, depois desaceleração), núcleo volumétrico, fraturas, ondas de pressão não circulares uniformes, 8–15 fragmentos de pedra com gravidade/quique e orçamento de física.
- Trilhas no solo: rachaduras poligonais emissivas, placas de terra levantadas, sulcos alinhados ao vetor real do dash. Projetar no terreno amostrado, não apenas plano y=0. Decais expiram/limpam.
- Sincronizar hitstop/shake/hitmark **somente com hit confirmado** e cooldown antiduplo.

## 4. Skill 1 — RUPTURA / IMPACTO CRUZADO
Substituir o aspecto atual de onda rosa achatada por **duas lâminas de energia 3D formando X**, inclinadas no plano do alvo, com espessura, ponta e serrilhas assimétricas. Núcleo `#FFFFFF`, vermelho carmim `#D90027`, borda `#5A0018`, manchas negras via erosão. Duas fitas helicoidais cruzando o centro, arcos elétricos vermelhos, speed lines radiais, impact frame de ~0,15s **sem apagar HUD nem impedir controles**. Fazer hitbox seguir a geometria/alcance verdadeiro da skill e conservar lógica de dano e cooldown.

## 5. Skill 2 — ESFERA DA DESTRUIÇÃO (substitui PORTAIS/CORTE NEGRO no slot 2)
**Migrar sem destruir dados:** localizar IDs, save, testes, nomes, UI, cooldowns, ícones e dependências; manter compatibilidade de saves e possível alias para habilidade antiga se necessário. Remover o efeito antigo do slot, mas NÃO apagar módulos que outras partes do jogo utilizem.
- Esfera com 3 volumes: centro rosa-branco `#FFE4FC`; casca vermelho-rubro `#B90019` com manchas pretas orgânicas `#0B000B`; borda Fresnel magenta `#FC1FD8`. Material com ruído advectado, volume aparente e irregularidade.
- Raios negros em zig-zag com núcleo preto e halo magenta; evitar linhas finas de baixa visibilidade.
- Cast: personagem ergue a mão por ~0,4s, pedrinhas se elevam, esfera concentra e é arremessada. Se o GLB não tem animação apropriada, fazer pose procedural segura ou pedir criação de clip; **não afirmar que clip inexistente foi encontrado**. Movimento físico e cast controlados pelo sistema do Codex.
- Ao acertar: contração ~3 frames, cúpula rubro-negra, fendas emissivas e detritos com colisão. Evitar explosão no ponto errado.

## 6. Skill 3 — EXPLOSÃO CELESTIAL (substitui DRAGÃO no slot 3)
Migrar com compatibilidade de save e não excluir assets de dragão usados em outros sistemas. Referência estética: grandiosidade de magia Explosion de KonoSuba, mas **geometria, runas, padrões e animações originais**.
- 0–0,6s: ponta da arma magenta, estrelas de quatro pontas verde `#78FFB8`, ouro `#FFD86A`, azul `#7BC8FF`, rosa `#FF8ADD`, convergência espiral e anéis ascendentes.
- 0,6–1,2s: 3–4 círculos mágicos horizontais escalonados sobre o alvo, laranja `#FF7B24` e magenta `#E32DCE`, hélices, triângulos/rúnicas **originais** e correntes orbitais inclinadas. Geometria leve e boa leitura a distância.
- 1,2–2,5s: pilar colossal vertical de núcleo branco `#FFFFFF`, dourado `#FFC62E` e vermelho `#C93228`, domo de pressão branco-azulado, ondas de choque no ar e no solo, flash máximo ~2 frames com acessibilidade, cratera, detritos, fumaça residual mínima e estilizada.
- **Performance:** usuário reportou 468 draw calls / 437k triângulos / 31 FPS no Dragão. Tratar como MEDIÇÕES A VERIFICAR, não números comprovados. Meta de efeito isolado **<120 draw calls**, medir com `renderer.info.render.calls` e comparar baseline vs ativo (não confundir contagem total da cena com custo incremental); 60 FPS é alvo aspiracional no Android, não promessa. Escalonar LOD e quality preset, evitar shader compilation no primeiro cast.

## 7. Qualidade, sincronização e aceitação
- Antes/depois por skill: screenshots e vídeo, números de draw calls, triangles, GPU/CPU frame time quando disponível, memória e FPS em celular; registrar hardware, resolução e quality. Sem screenshots inventadas.
- Testar pelo menos 20 casts consecutivos por habilidade, reentrância, morte/interrupção durante cast, cancelamentos, troca de qualidade, ausência de alvo, alvo em movimento, colisão em relevo, câmera, Android touch, save antigo e volta da dimensão de Valério.
- Verificar parse de todos os JS, importações, compilação de shaders no navegador real, erros de console, descarte e regressão dos testes existentes. Falhas bloqueiam merge.
- Deixar modo de demonstração acessível por URL de teste sem mudar experiência padrão; usar feature flag para novos VFX, fallback para legado e rollback simples.
- **Não alterar main.** Entregar branch/PR isolado + relatório de pendências e instruções de integração pelo Codex. Não apagar este arquivo temporário antes de aprovação explícita do usuário e merge validado.

## 8. Estrutura de arquivos na branch do GitHub
```text
branch claude/vfx-sakuga-enemy2
  INSTRUCOES-CODEX.md
  MANIFESTO-ARQUIVOS.md
  TESTES-E-PERFORMANCE.md
  storyboards/
    01-chefe-vortice-abissal.md
    02-impacto-colisao-destruicao.md
    03-skill1-impacto-cruzado.md
    04-skill2-esfera-destruicao.md
    05-skill3-explosao-celestial.md
  src/ [arquivos JS/GLSL/CSS/HTML alterados em caminhos espelhados]
  tests/ [testes criados ou atualizados]
```
Cada storyboard: tempo em segundos, frames assumindo 60 FPS, curvas de easing, câmeras, mesh/rig, paleta hex, material GLSL, eventos de dano, SFX, shake, detritos, custo estimado, fallback, limpeza e critérios visuais. `INSTRUCOES-CODEX.md` deve incluir SHA-base, tabela de arquivos, APIs/contratos de integração, riscos de conflito, testes e passos exatos de merge seguro.

**Critério principal:** impressionar visualmente pela massa, direção e timing, sem sacrificar combate jogável e estabilidade. Pesquise documentação oficial Three.js e técnicas de VFX anime, documente links consultados, diferencie inspiração de reprodução literal e faça propostas adicionais quando tecnicamente justificadas.


## CORREÇÃO PRIORITÁRIA DO CRIADOR (PREVALECE SOBRE TODO O TEXTO ACIMA)
1. NÃO gerar ou pedir ZIP. Claude deve implementar diretamente numa branch própria do GitHub, fazer commits de código e documentação e abrir PR; não mesclar sem aprovação.
2. Os alvos são Enemy2 comum e Mini-boss Enemy2, NÃO o chefe Demônio da Ganância. Auditar habilidades e VFX reais de cada um e tratar os dois separadamente; não inventar que Julgamento do Vórtice Abissal pertence a eles.
3. Storyboards e INSTRUCOES-CODEX.md são arquivos versionados na branch, não pacote para baixar.
