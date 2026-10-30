# MISSÃO CODEX — MOD 234 · Refinamento cinematográfico das 3 skills + corrida e espada

> **BRIEFING TEMPORÁRIO.** Criado após teste real do usuário no Android, Mod 233, em 29/10/2026. **Executar as alterações no jogo**, não apenas analisar. Quando tudo estiver implementado, testado, integrado e publicado, **excluir SOMENTE esta pasta temporária**. Não excluir a visão mestra, outros briefings ou arquivos do jogo.

## 0. Leia antes de mexer

- Visão permanente: [VISAO-MESTRA-QUALIDADE-VISUAL-E-GAMEPLAY](../../VISAO-MESTRA-QUALIDADE-VISUAL-E-GAMEPLAY.md), e [AGENTS.md](../../../AGENTS.md).
- Página atual: `mundo-3d-prototype.html` e `mundo-3d-prototype.js`. Repositório: `PHBritoDev/Jogo-2-2.5D`, branch `main`. URL de treino existente: `https://phbritodev.github.io/Jogo-2-2.5D/mundo-3d-prototype.html?testeQuantum233=1`.
- Base Mod 233: `skill-x-rupture3d.js`, `skill-x-rupture-vfx3d.js`, `skill-twin-portals3d.js`, `skill-twin-portals-vfx3d.js`, `skill-judgment-dragon3d.js`, `skill-judgment-dragon-vfx3d.js`, `celestial-fxkit3d.js`; revisar os pontos de integração no mundo 3D, `progression3d.js`, HUD, áudio, viewmodel e testes.
- Mod 232: `locomotion-rig3d.js`, `sword-viewmodel3d.js`, `sword-design3d.js`, montagem de espada na mão, retarget de animações e FPS. Não desfazer suas correções.
- O usuário forneceu **4 vídeos reais de teste** e **1 imagem de referência**. Os vídeos originais são `Screen_Recording_20261029_230113_Chrome.mp4` (corrida), `...230324...` (X), `...230411...` (portais), `...230545...` (dragão); foi preparado um **único vídeo reduzido de ~1,2 MB** chamado `referencias_mod234_compactas.mp4` para upload manual, se necessário. **Esses arquivos ainda não estão no repositório; não inventar que foram anexados.** A descrição dos quadros e problemas abaixo é suficiente para começar. Se os arquivos forem posteriormente enviados ao repo ou ao Codex, inspecioná-los.
- Referência visual do dragão (imagem enviada pelo usuário): gigantesco dragão de energia celestial dourada, corpo longo e espiralado ocupando a maior parte do enquadramento, contorno orgânico flamejante, cabeça imponente com mandíbulas amplas; NÃO imitar a boca de jacaré nem usar tubos/peças rígidas.

## 1. Diagnóstico visual confirmado nos vídeos

- **Vídeo 23:01:13, corrida (~4,8 s):** herói encapuzado se desloca segurando espada em posição elevada/quase vertical, braços/ombro com pose rígida e desconfortável, passada pouco convincente. O usuário descreve corrida "parece que está cagado". Resolver a **pose de locomocão**, não simplesmente acelerar clipe.
- **Vídeo 23:03:24, Skill 1 (~3,1 s):** X rosa/avermelhado aparece e chega rápido ao inimigo; pequena escala em relação à cena; o círculo/impacto no chão parece decal genérico. Falta peso, distorção de energia e acabamento.
- **Vídeo 23:04:11, Skill 2 (~6,0 s):** dois portais vermelhos/roxos ficam próximos do protagonista; poucas linhas luminosas chegam ao alvo e quase não demonstram reação física; a sequência termina rápido. Há clarão no fim, mas ataques intermediários parecem "água" no inimigo.
- **Vídeo 23:05:45, Skill 3 (~5,4 s):** cast inicial dourado curto; dragão dourado de aparência segmentada e pequena cabeça/boca estreita, pequeno em relação ao ideal. Falta ascensão épica, bombardeio superior e mordida monumental; o usuário notou espada visualmente congelada/descolada da mão durante conjuração.

## 2. Skill 1 — RUPTURA EM X: maior, mais lenta, mais violenta

**Intenção:** corte em X de energia 3D, orgânico, imponente e pesado; núcleo quente, lâminas vermelhas/carmesim, bordas magenta/violeta, **raios negros** e filamentos escuros em volta, em movimento contínuo. Nada de "papelão" duro, sprites planos, placas ou linhas pretas estáticas.

- **Dobrar aproximadamente a dimensão visual** do X (2x a largura/altura atuais, calibrar em comparação com a altura do inimigo e tela do celular). Ajustar volume de colisão coerentemente, sem permitir hits fora da lâmina visual nem atravessar paredes.
- **Diminuir moderadamente a velocidade**: hoje `XRUP.speed=24` unidades/s; testar ~14–17 unidades/s como ponto de partida, mantendo sensação de ameaça e distância útil; dar mais tempo para enxergar a geometria do X.
- Os dois cortes se formam em tempos ligeiramente diferentes, depois convergem; bordas agitadas por ruído procedural, pequenas descargas negras seguindo trajetórias de arco, rachaduras de luz e rastro volumétrico. Material vivo com emissivo controlado; não estourar tudo em branco.
- **Decisão de design:** o X deve **ATRAVESSAR o inimigo** após acertar, em vez de desaparecer imediatamente. No ponto de interseção há **um único dano por alvo** + forte explosão local, pausa de impacto curta, resposta de hit e rastro residual; depois a onda continua alguns metros, com energia decaindo. Se atravessar outros alvos, política explícita de múltiplos alvos e atenuação; não repetir dano por frame no mesmo alvo. Contra cenário sólido, interromper/estilhaçar. Reestruturar o estado `impact` da simulação para preservar movimento após o hit e evitar duplicação.
- **Substituir impacto no chão** por VFX espacial: fissuras curtas e irregulares alinhadas aos dois cortes, fragmentos 3D com espessura, poeira e brasas, ondas de pressão que deformam a leitura do terreno. Marca residual sutil e temporária; nunca um anel chapado genérico. A cratera pode ser ilusória (mesh/decal/parallax/fragmentos), sem alterar permanentemente malha/colisões do mundo.
- Não fazer a explosão esconder o próprio X ou o alvo.

## 3. Skill 2 — PORTAIS DA PERSEGUIÇÃO: duração, quantidade e peso

**Intenção:** um bombardeio mágico **longo e memorável** vindo de dois portais distintos (carmesim e violeta), com ataques em trajetórias diferentes, pressão crescente e finalizador colossal.

- Hoje o código contém `THREADS` com **8 disparos** e tempo muito curto; redesenhar para **~20–32 disparos visualmente distintos ao longo de ~6–9 segundos** (calibrar ritmo e FPS; a duração percebida deve aumentar muito). Não gerar todos no mesmo frame; padrões em ondas, algumas curvas por trás, mergulhos do alto, órbitas e convergências alternadas. Evitar linhas idênticas repetidas em loop.
- **Cada projétil precisa parecer massa/energia real:** cabeça volumétrica (não fio fino), cauda 3D turbulenta com corpo e fragmentos, rastro persistente e comportamento de aceleração/frenagem; escala legível no celular.
- **Cada colisão causa impacto visível**, com microexplosão própria, empurrão visual/flash local, onda de choque, faíscas direcionais, poeira, estilhaços de solo, hit reaction do inimigo. **Impactos menores por disparo, mas fortes o suficiente para não parecer água**. Evitar câmera tremendo exageradamente 30 vezes, flashes cegantes ou travar animações de hit em todo frame.
- Finalizador: **explosão MUITO maior que os impactos intermediários**, com 2–3 fases (convergência/compressão, esfera de energia, expansão/colapso), ondas de pressão e cratera temporária. Mais impacto audiovisual, mas não congelar a câmera por segundos.
- **Dano balanceado:** o aumento de projéteis NÃO pode multiplicar o DPS de forma absurda. Redistribuir dano total entre impactos e finalizador; manter um teto de dano/cooldown/mana por ato e nível. Aplicar no máximo 1 dano por projétil por alvo, com deduplicação e colisão contínua.
- Solo: pequenas lascas/fissuras/crateras **temporárias** em impactos, reabsorvidas/limpas após segundos, sem editar permanentemente terreno ou impedir movimento. Preferir decals proceduralmente irregulares, meshes leves e pools.
- Garantir que portais abram, sustentem disparos e fechem com animações coerentes, mesmo com alvo se movendo/morrendo.

## 4. Skill 3 — DRAGÃO DO JULGAMENTO: REFAZER O ESPETÁCULO

**Problema crítico:** dragão atual é pequeno e parece jacaré/cobra segmentada. O usuário quer um **dragão celestial colossal** com silhueta fluida e cabeça expressiva. Prioridade visual máxima. NÃO resolver só aumentando `scale` do modelo existente.

**Direção de arte:**
- Referência: dragão de fogo dourado, serpentino, imenso, formado por chamas com filamentos finos, crista e cabeça majestosa; boca abre mais que a altura de vários inimigos. Corpo em espiral no céu, com curvaturas orgânicas e cauda, sem aparência de cilindros/aneis empilhados ou dentes de jacaré.
- Proporções iniciais: cabeça **~3–5x maior visualmente** que a atual e comprimento/corpo **~4–6x**, ajustar pela câmera/FOV, não recortar a ação. Cabeça expressiva com maxilar superior e inferior animados, olhos, chifres, bigodes e chamas com flow/noise. Se procedural atual não permitir qualidade, reconstruir geometria/rig por código ou usar modelo apropriado com licença válida; nunca usar placeholder genérico.
- **Cores:** manter o **dragão principal dourado/branco-celestial** como na imagem, mas fazer a **invocação inicial** mais rica com preto + carmesim + magenta/violeta, que convergem e se transmutam em ouro. Evitar tornar o dragão inteiro rosa/preto ou uma bola luminosa sem forma.
- **Nova sequência cinematográfica funcional**:
  1. Herói assume pose de conjuração **legível por ~1–1,5 s**, braço e espada acompanhando o rig, aura preto/carmesim/violeta envolvendo o solo e subindo em espirais; sem pose de milésimos de segundo.
  2. Dragão **sobe alto ao céu** em espiral majestosa, com câmera que enquadra sem tirar o controle do usuário desnecessariamente.
  3. Lá de cima, o dragão **dispara uma esfera de fogo negro/carmesim** para o inimigo: projétil 3D com trajetória, colisão real, explosão de impacto e dano de fase 1. Não apenas spawnar um efeito no chão.
  4. Depois, o dragão **mergulha de volta** em arco; desacelera diante do alvo, **abre a boca ENORMEMENTE**, enquadra/engole o alvo visualmente, fecha mandíbula e causa dano de mordida. Para bosses grandes, simular envolver a hitbox sem teletransportar, mover ou deformar o boss/rig.
  5. **Final:** esfera de compressão interna e **explosão colossal** com luz em camadas, choque no solo, crateras/fissuras/fragmentos temporários, fumaça volumétrica otimizada e dissolução do dragão em chamas, com hitstop curto e áudio pesado.
- Duração-alvo inicial ~7–11 s (testar pacing). Cuidado com uso em combate real: não deixar o herói preso/vulnerável por 10 s; prever cancelamento seguro por morte, pausa, troca de cena, perda de alvo e mudança de câmera.
- Manter lógica de colisão independente do FPS (120 Hz ou equivalente), 1 evento de dano por fase; equilibrar dano total (não triplicar simplesmente porque há bola + mordida + explosão). Limpar VFX e restaurar estado.

## 5. Corrida, braços e espada

- A corrida atual mostra **espada alta/vertical**, braço da espada artificial, outra mão/ombro contorcidos; pernas/pelve com passada estranha, sensação de corpo travado. Reavaliar o clipe `Protagonista-corrida-216.glb`, seu retarget, rotação do tronco, foot sliding, root motion, velocidade e ciclo de passos.
- Corrida com arma em **postura natural de deslocamento** (espada controlada junto ao corpo, inclinada de forma segura; não apontada verticalmente no ar o tempo todo). Braço livre faz contrabalanço sutil e anatomicamente coerente, cotovelos e punhos estáveis. Ombros não torcem para trás.
- **A espada deve estar SEMPRE presa ao osso da mão correta**, inclusive conjuração do dragão, transições idle/walk/run/dash/attack/cast, 1ª e 3ª pessoa. Proibido congelar espada em posição do mundo durante pose ou esconder bug com modelo duplicado. Inspecionar `updatePlayerSwordMount`, `swordHand`, `swordMount`, ordem de `mixer.update`/pose/mount e viewmodel.
- Conservar ataque em movimento, corrida contínua e câmera livre da Mod 232. Testar transições com a espada Quantum e outras espadas, sem duplicar mão/arma ou estourar escala dos GLBs. Usar protocolo de escala `docs/PROTOCOLO-BUG-ESCALA-GLB-PROTAGONISTA.md`.

## 6. Critérios técnicos inegociáveis

- **Não substituir/remover** skills anteriores, espadas, chefes, portais, loja, saves, mapa, missões, HUD e dimensões. A melhoria deve funcionar no modo treino e na campanha real, inclusive no Android.
- Sem soluções "genéricas": não trocar o dragão por uma serpente de cilindros, impactos por círculos chapados, crateras por círculos pretos, nem o X por planos duros. Fazer shaders/meshes orgânicos, ruído animado, curvas, ribbons com espessura, luz e som. Boa direção de arte > quantidade bruta de partículas.
- **Desempenho Android**: pooling de projéteis/partículas/fragmentos, `InstancedMesh` quando útil, limites de draw calls/overdraw, materiais compartilhados, nenhuma alocação excessiva por frame, cleanup de `geometry/material`, níveis de qualidade automática/manual, efeitos reduzidos em celulares lentos. Não sacrificar legibilidade da HUD.
- Testar colisão com inimigo parado, móvel, morto, grande/boss, múltiplos alvos, paredes, sem alvo, cancelamento, perda de foco, câmera em 1ª/3ª pessoa, rotação, FPS baixo, reentrada no treino, repetição das skills, recarregamento, cooldown e mana. Evitar hits duplicados e leaks.
- Adicionar/atualizar testes automatizados de simulação: X atravessa com um hit por alvo, projéteis de portais sem duplicar hits, duração/contagem, dragão ordem bola→mordida→explosão, reset/cancelamento, espada sempre segue a mão. Validar `npm test`/scripts do repositório e inspecionar console do navegador.
- **Obrigatório testar visualmente** as três skills e corrida em navegador (capturas/vídeos próprios) e comparar com as referências; teste unitário sozinho não comprova qualidade visual. Se não houver navegador disponível, declarar a limitação e não afirmar que viu.
- Manter `Mod` visível atualizado (sugestão Mod 234, ou próxima numeração real se mudou), alterar cache-busting de scripts e confirmar GitHub Pages.
- Trabalhar em branch/PR própria se outra IA estiver editando `main`. **Nunca sobrescrever trabalho paralelo, forçar push, resetar alterações alheias nem apagar arquivos temporários de outras tarefas.** Fazer merge somente depois de validar integração e conflitos.

## 7. Entrega e limpeza

1. Inspecionar código e referências, definir plano breve internamente, implementar todas as melhorias (não apenas escrever outro prompt).
2. Testar e corrigir regressões; atualizar versão, integrar/publicar quando seguro.
3. **Apagar apenas `docs/briefings/CODEX-MOD234-REFINO-X-PORTAIS-DRAGAO-CORRIDA-TEMP/` ao final**, após as alterações reais estarem prontas. Não apagar a documentação mestra.
4. Responder ao usuário em PT-BR, objetivamente, com Mod, resumo do que mudou, status real dos testes/merge e link direto de teste. Não enviar relatórios de progresso intermediários se não forem necessários.

**Prioridade:** 1) Dragão realmente colossal e nova sequência com bola negra; 2) portais longos e impactos por projétil; 3) X 2x com travessia e fissuras; 4) corrida natural + espada rigidamente presa à mão. Todas são exigidas.
