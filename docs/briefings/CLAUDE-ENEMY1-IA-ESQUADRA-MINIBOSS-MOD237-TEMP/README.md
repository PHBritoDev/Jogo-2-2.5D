# MISSÃO CLAUDE — Enemy1: três poderes sombrios, IA tática, combate simultâneo e mini-boss

> **BRIEFING TEMPORÁRIO**. Pedido do criador em 30/10/2026. Executar implementação real no jogo, não apenas apresentar plano. Ao concluir, testar, fazer commits, merge seguro na `main` e **excluir SOMENTE esta pasta temporária**. Preserve os documentos permanentes. A numeração sugerida é **Mod 237**, mas confirme a Mod vigente antes de atribuir.

## 0. Antes de programar — leitura, arquitetura e trabalho paralelo

**Repositório:** `PHBritoDev/Jogo-2-2.5D`, `main`. Jogo Three.js/JavaScript, GLB, GLSL, HTML/CSS, com teste mobile via GitHub Pages.

1. Leia integralmente `AGENTS.md`, `PROMPT_MESTRE_DO_JOGO.md`, `docs/VISAO-MESTRA-QUALIDADE-VISUAL-E-GAMEPLAY.md`, `docs/PROTOCOLO-BUG-ESCALA-GLB-PROTAGONISTA.md` e a arquitetura disponível.
2. Inspecione `mundo-3d-prototype.js`, `mundo-3d-prototype.html`, `progression3d.js`, os sistemas de rig/animação, `celestial-fxkit3d.js`, `skill-impact3d.js` e módulos de VFX existentes. Reaproveite a infraestrutura do jogo; não crie um segundo motor gráfico.
3. **Existe Codex trabalhando paralelamente na Mod 236**, com briefing `docs/briefings/CODEX-MOD236-VFX-ENGINE-DRAGAO-PORTAIS-X-TEMP/README.md`. Pode estar editando `main`/arquivos compartilhados. **Crie branch própria**, ex. `claude/enemy1-ai-squad-miniboss`, faça commits frequentes e não mexa na branch/arquivos temporários do Codex. Preferir módulos novos Enemy1 e alterações mínimas de integração. **Não faça merge destrutivo**: antes de integrar, sincronize com a `main` mais recente, incorpore a VFX Engine 2.0 da Mod 236 se já existir, resolva conflitos, teste tudo. Se a Mod 236 ainda não tiver sido publicada, mantenha o PR pronto e faça merge somente quando a integração for segura; não finja conhecer alterações locais não publicadas.
4. O usuário enviará **diretamente a Claude quatro imagens**. Elas são referências visuais de direção de arte, não arquivos que se presume existirem no repositório:
   - **Imagem 1:** círculo arcano roxo/negro no chão com várias mãos/garras sombrias enormes emergindo, fumaça, rochas e raios roxos.
   - **Imagem 2:** massa de energia violeta/branca com faixas/fitas negras em espiral, corpo volumoso, partículas/estilhaços e movimento direcional; referência do segundo poder.
   - **Imagem 3:** estudo de formas para orbe, raio, coluna de energia e explosão violeta, com anéis negros; referência do terceiro poder.
   - **Imagem 4:** conceito de arma de haste/foice/lança dupla demoníaca, metal preto/prateado, lâminas angulares vermelho-sangue, centro de caveira e ornamentos. Criar **arma original inspirada na silhueta**, sem reproduzir um asset de terceiro.
5. O usuário quer liberdade criativa: melhore o que julgar necessário, pesquise técnicas e referências de IA/VFX/gameplay se surgirem dúvidas; não improvise placeholders genéricos. Se usar recursos externos, respeite licenças.


## 0-A. INSTRUÇÃO CRÍTICA — CODEX MOD 236 EM ANDAMENTO, LIMITE ÀS 18h34

**Atualização enviada pelo criador após a criação deste briefing. Leia esta seção como regra obrigatória.** O Codex atingiu limite de uso enquanto finalizava a **Mod 236** e informou que poderá continuar **às 18h34 (horário indicado pelo próprio Codex)**. **NÃO presuma que suas mudanças estão salvas em commit, publicadas ou integradas.**

Último relatório real do Codex, fornecido pelo criador:
- Leu briefing mestre e referências de vídeo, inspecionou arquivos e rodou testes-base.
- Alterou a lógica dos portais para **exatamente dois ataques simultâneos** com direção fixa e pressão no ponto de contato.
- Fez a bola de fogo sair da boca do dragão e seguir trajetória física.
- Trabalhou no corpo flamejante, na cabeça/crina, na silhueta e no enquadramento da mordida; ainda corrigia aspecto metálico do dragão.
- Relatou testes de lógica aprovados, testes das três fases de dano, retorno à câmera em primeira pessoa e testes visuais em viewport mobile.
- Houve **falhas** nos últimos comandos, seguidas de limite de uso. **Não houve confirmação de commit, PR, merge, deploy ou conclusão.**

### Procedimento obrigatório para Claude

1. **COMECE AGORA** a missão Enemy1 em **branch própria**, com workspace/worktree isolado do Codex. Não aguarde até 18h34 para iniciar. Verifique `git status`, `git branch`, `git log` e `git worktree list` antes de escrever. **Se a área de trabalho for compartilhada e houver mudanças locais do Codex, NÃO faça checkout/reset/clean/stash/overwrite nessas mudanças; crie worktree separado em diretório novo e branch própria a partir de commit limpo.**
2. Implemente poderes, IA, grupo simultâneo e mini-boss em módulos separados, fazendo **commits frequentes NA SUA BRANCH**, sem tocar na branch/worktree/arquivos locais do Codex e **sem fazer merge na main enquanto a Mod 236 não estiver confirmada e integrada**. Um arquivo de briefing criado na `main` não é autorização para publicar código de Enemy1 por cima de mudanças incompletas.
3. **Não dependa de arquivos da VFX Engine 2.0 que ainda não existam na `main`**. Faça módulos com adaptadores e interfaces compatíveis, reutilizando componentes já publicados; depois integre os componentes novos da Mod 236 assim que forem publicados. Não reimplemente a mesma engine nem substitua o sistema do Codex.
4. **Quando Codex concluir e publicar Mod 236**, atualize sua branch com a `main` mais recente, resolva conflitos manualmente, rode testes completos das skills do protagonista e do Enemy1, e **só então faça merge seguro**. Se Codex não publicar ou houver conflito sem solução segura, mantenha PR/branch com commits preservados e informe o bloqueio no final, sem forçar.
5. O criador pediu **economia extrema de chat**: todas essas regras ficam neste arquivo; não repita estas instruções em respostas, não envie plano nem status intermediário. Trabalhe silenciosamente e entregue apenas o resultado final, salvo bloqueio realmente incontornável.

**Regra de ouro:** é proibido perder ou sobrescrever trabalho local não commitado do Codex. Não alegar que a Mod 236 terminou só porque existem alterações em arquivos ou porque os testes passaram.

## 1. Problemas reais já encontrados no código (verifique novamente)

- `mundo-3d-prototype.js` concentra lógica do combate e Enemy1. O Enemy1 é carregado de `Enemy1-lod.glb` com fallback `Enemy1.glb`; existe uma tabela de clipes com nomes UUID mapeados para `idle`, `cast`, `attack`, `block` etc. Não presumir nomes convencionais nem destruir o mapeamento validado.
- Existem `startPack`, `nextPack`, `clearPack`, `makeFoeClone`, `loadRig`, `useRig`, `revealEncounter`, `spawnEnemyProjectile` e fluxo de `enemyHP`/alvo único. Em diversas missões, `startPack({rig:'enemy1', spots:[...]})` percorre inimigos **sequencialmente**: derrotar um para começar o seguinte. **O usuário quer os 2–4 inimigos da mesma cena combatendo SIMULTANEAMENTE.**
- Existem clones de NPC/inimigos para cinemáticas, mas nem todos têm lógica de combate independente. Não confundir clones decorativos com atores combatentes. Evitar refatoração global cega que quebre Ato II–VI e Bispos.
- Enemy1 normal costuma ter `hp:100` ou `hp:110` em trechos de Ato I; mini-boss Enemy1 é o `warden`/Guardião do Portal, com `ACT1.wardenHp` e escala especial `1.35`. Outros mini-bosses pertencem a outros inimigos e **não devem receber a arma nem as skills do Enemy1**.
- A Mod 236 em paralelo está construindo VFX Engine 2.0 para protagonista. Quando disponível, **reutilizar seus componentes** (ImpactDirector, EnergyFlow, trails, pooling, crateras temporárias) para os poderes sombrios. Se ainda não estiver integrada, criar adaptadores/modularização compatíveis, sem sobrescrever o trabalho do Codex.

## 2. Direção de combate e animação — qualidade obrigatória

**O poder não pode surgir instantaneamente.** Toda habilidade deve ter sequência legível: intenção/telegraph → postura/gesto do Enemy1 → concentração/crescimento gradual → liberação física do projétil ou manifestação → deslocamento/colisão → impacto/dano → dissipação/recuperação. Nem tão rápido que não se vê, nem lento a ponto de tornar o inimigo inofensivo. Animar mãos, braços, tronco e arma coerentemente, mantendo o rig GLB estável, escala correta, pés no chão e rotação suave.

- Reaproveitar animações reais `cast`, `attack`, `block`, `dash`, `walk`, `run`, `idle` quando existirem; analisar visualmente os clipes e sincronizar eventos no momento certo, sem congelar ou deslizar o personagem. Se faltar clipe, construir camada procedural leve de upper-body e transições, sem retarget inseguro.
- **VFX com massa**: malhas orgânicas, ribbons volumosos, turbulência em shader, faíscas, rochas 3D, rachaduras/crateras temporárias, sombras e ondas de pressão, áudio e reação ao dano. Sem círculos planos chapados, braços de papelão, bolinhas brilhantes sem corpo, feixes minúsculos ou efeitos que apenas piscam.
- Dano autoritativo e deduplicado por alvo/instante; hitbox/hurtbox alinhadas à geometria visual, colisão com chão, paredes, obstáculos e personagens; animação de hit/knockback proporcional. Regras de stamina/cooldown/cancelamento.
- O sistema deve funcionar quando **Enemy1 ou Bispo lutar contra NPCs aliados**, não apenas contra o protagonista. Não hardcodar `player.position` como alvo: usar entidade genérica `CombatTarget` com posição, raio, equipe/facção, HP, estado, recebimento de dano, prioridade, LOS e eventos. Preparar integração futura para Bispos, sem modificar IA de outros tipos agora.

## 3. Skill 1 Enemy1 — GARRAS DO ABISMO (imagem 1)

**Escolha de design:** controle de área e imobilização breve, **não agarrão inevitável**.

1. Enemy1 recua/levanta braço, desenha círculo arcano violeta-negro **na posição prevista do alvo** (protagonista ou NPC), não teletransporta mãos diretamente sob os pés sem aviso. Círculo emerge em ~0,7–1,0 s, fissuras e sombras se expandem, dedos gigantes se formam em estágios e sobem do chão em tempos ligeiramente diferentes.
2. **Múltiplas mãos negras articuladas**, com dedos/garras curvos e superfície irregular, escala visual de ameaça, raízes de sombra conectadas ao solo, filamentos roxos e detritos. Evitar cinco palitos estáticos ou recortes 2D. Braços crescem do solo com animação física crível, agarram a área por ~1,5–2,5 s e recuam/desmancham.
3. Se alvo ainda estiver na zona após telegraph, mãos **puxam/seguram brevemente** (ex. 0,6–1,0 s) e aplicam dano moderado; corrente/ligadura de energia aparece como consequência visual. O alvo pode escapar com **dash no timing certo**, pulo quando fizer sentido ou esquiva lateral; considerar resistência a CC para chefes, inimigos grandes e NPCs, e cooldown de imunidade temporária para não haver prisão infinita.
4. Ao prender o alvo, Enemy1 pode tentar **um golpe de follow-up**, mas sem dano injusto garantido: tempo de reação e contrajogo. Outros Enemy1 não podem empilhar quatro prisões simultâneas sobre o mesmo alvo.
5. Ao falhar, mãos ainda são perigosas por contato/arranhão, mas têm recuperação e expiram. Marca de chão e rachaduras somem depois, sem deformar permanentemente a malha.

## 4. Skill 2 Enemy1 — ESPIRAL DEVORADORA (imagem 2)

**Escolha de design:** um **grande projétil de matéria sombria em rotação**, não bolinhas e não cilindro rígido.

1. Enemy1 concentra energia entre mãos/arma, formando núcleo violeta/branco e **faixas negras torcidas em espiral** que se unem progressivamente. Antecipação legível ~0,6–1,1 s, sem flash cegante.
2. Dispara um corpo 3D volumoso de energia com **fitas espessas, filamentos, detritos e cauda turbulenta**, que viaja à frente em velocidade intermediária, ajustada à distância; **não** brota já em cima do alvo. Pode ter leve correção de direção nos primeiros instantes, mas não perseguição impossível de evitar.
3. Colisão com personagem ou obstáculo cria **explosão giratória** e impacto físico: empurrão curto ou quebra de guarda, fragmentos/poeira, hit reaction, onda de choque e dano. Evitar tela branca e geometria atravessando o alvo sem dano.
4. Desviar por dash lateral, bloquear com custo de stamina ou interromper conjuração quando houver abertura. Um único impacto autoritativo por alvo; não multiplicar dano pela quantidade de faixas visuais.

## 5. Skill 3 Enemy1 — JUÍZO VIOLETA (imagem 3)

**Escolha de design:** **orbe de energia negra/violeta no alto → coluna/raio sombrio que desce → esfera explosiva**.

1. Enemy1 prepara o feitiço por ~0,9–1,3 s, conjura um **orbe volumoso** com anéis escuros, descargas e faixas que se enrolam, acima dele ou da região-alvo. O orbe se forma pouco a pouco, com orientação e brilho que tornam a ameaça legível.
2. Aparece no solo do alvo uma **marca irregular de perigo** que cresce e acompanha a previsão da posição **apenas durante a preparação**, depois fica travada para permitir esquiva. NPCs aliados devem reagir ao telegraph se possuírem IA de esquiva.
3. Um **raio/coluna de energia sombria desce visivelmente do orbe até o solo**, com largura real, bordas orgânicas, arcos elétricos, compressão e som. Não fazer spawn instantâneo da explosão.
4. Impacto causa **esfera de choque grande** com núcleo, raios ramificados, anéis quebrados, lascas do terreno, mini-cratera temporária e dissipação; dano em área com queda por distância. Evitar impacto que parece só luz ou círculo no chão.
5. É a habilidade mais perigosa do Enemy1 comum: cooldown maior, telegraph mais evidente, custo/limitação para uso em grupos, sem spam e sem stun-lock.

## 6. IA tática Enemy1 — comportamento que aprende dentro do combate

Implementar **FSM hierárquica / utility AI + blackboard** (ou equivalente leve e determinístico). Não usar modelo de IA online nem API paga em cada frame. "Estudar o jogador" significa observar sinais recentes em memória curta: frequência de ataques corpo a corpo, distância preferida, dash, bloqueio, conjuração, padrão de fuga, HP/stamina e oportunidades; **não ler input futuro**, não ter reflexos sobrenaturais nem antecipar sem pista visual.

- Estados: patrulhar/alertar, investigar, escolher alvo, posicionar, aproximar, circular/strafe, atacar corpo a corpo, preparar magia, defender/parry, desviar, recuar, recuperar, cooperar, reagir a dano, perseguir dentro do território, perder alvo, retornar e morrer.
- **Min/max de alcance por ação** (distância real e LOS, raio do alvo e comprimento do golpe): exemplo inicial para calibrar, melee efetivo ~1,4–2,7 m; habilidades de média distância ~3–12 m; habilidade de longo alcance ~5–18 m; distância de recuo ~2,5–5 m; limites não são dogma, ajustar ao alcance do protagonista e aos GLBs reais. Ataque só causa dano se hitbox alcança alvo, não porque animação ocorreu. Inimigo não cola na câmera/player.
- Escolha de ataque depende de distância, ângulo, cooldown, stamina, cobertura, telegraph, HP, aliados e oportunidades; com **tempo de decisão/histerese** para não tremer, girar como beyblade ou mudar de ideia a cada frame.
- Defender e esquivar **com probabilidade e janela realista**, conforme ameaça visível; inimigo não defende tudo, não esquiva infinitamente, pode errar, fica vulnerável após ação e aprende tendências sem "roubar". Não ficar parado tomando dano.
- **Contra-magia / clash:** se o jogador ou NPC lançar skill, um Enemy1 que a percebe a tempo, está de frente, tem mana e cooldown pode lançar **um contrafeitiço original**, com formação visível, trajetória e colisão **magia x magia** no mundo 3D. O encontro gera núcleo de choque, faíscas e onda de pressão; resolver potência/energia/direção para vitória de um projétil, anulação mútua ou explosão neutra, **sem desviar dano automaticamente**. Probabilidade baixa a moderada para Enemy1 comum; mais competente no mini-boss. Não cancelar skills instantaneamente ou forçar clash em toda tentativa. Interação deve funcionar entre facções e ser extensível a Bispos, incluindo **futura** mecânica de cortar magia com espada (apenas preparar interfaces; NÃO implementar para Bispos nesta missão).
- Navegação: desvio de pedras/árvores/NPCs, separação entre inimigos, colisão entre corpos, evitar empilhar, não atravessar obstáculos, não sair da arena sem propósito; usar steering/LOS/nav simplificado ou pathfinding leve conforme terreno, sem custo excessivo no Android.
- Dificuldade justa: telegraphs, cooldowns e pausas reais, janelas de ataque para o protagonista; não deixar 4 inimigos atacarem em simultâneo sem intervalo. Ajustar vida dos Enemy1 normais **para cima** (ponto inicial 150–220 HP no Ato I, calibrar pelo DPS real, nível e atos); mini-boss bem mais resistente, mas sem esponja de dano. Balancear grupo com multiplicadores e limites; dificuldade progressiva e opção de teste.

## 7. Vários Enemy1 SIMULTÂNEOS — refatorar combate, não só clones decorativos

**Requisito central:** quando missão prevê 2, 3 ou 4 Enemy1, os 2–4 devem estar **vivos, visíveis, atacando e podendo receber dano ao mesmo tempo**. Não é aceitável continuar `startPack` sequencial ou criar apenas figurantes sem hitbox.

- Criar **CombatActor/EnemyInstance** independente por inimigo: `id`, rig/modelo/AnimationMixer, HP/maxHP, posição/velocidade, collider, facção, alvo, IA, cooldowns, ações, hit reactions, skills, morte, loot e eventos. Compartilhar geometrias/texturas/animações quando possível, mas cada ator tem estado próprio.
- Criar **CombatEncounter / SquadDirector** para missão: `spawnGroup` de 2–4, fase/objetivo, papéis (agressor, flanqueador, suporte de controle, atacante distante), slots de ataque, reservas, cooldown coletivo e foco em jogador **ou NPC**. Evitar que todos façam o mesmo ataque na mesma hora. Revezamento inteligente de ataque e avanço; um pressiona, outro circula, outro conjura, outro protege. Podem alternar papéis conforme HP e posição.
- **Troca de alvo:** lock-on, mira e HUD mostram HP do alvo atual, mas golpes de área e projéteis podem acertar vários; alvo muda sem apagar outros inimigos. Permitir tocar/selecionar alvo no mobile ou auto-seleção por proximidade/ângulo, sem HUD com quatro barras gigantes. Ataque do protagonista precisa considerar múltiplas hurtboxes, colisão com cenário e dano por alvo; não só `enemyHP` global.
- **Progressão e saves:** missão avança apenas quando TODOS os inimigos relevantes forem derrotados, ou quando o roteiro exigir outra condição. Reentrada/reload não ressuscita duplicados indevidamente, nem pula objetivos; preservar cinematics, portas, recompensas, conquistas, contagem de mortes e eventos `onEach`/`onDone`. Auditar missões Ato I que usam `startPack`, principalmente floresta, crianças, esgoto, Guardião. **Não converter automaticamente pacotes de outros tipos/atos sem testes**: criar compatibilidade para sistema legado e migrar os encontros Enemy1 previstos, depois ampliar quando seguro.
- Cooperação de inimigos contra NPCs aliados: facções e targeting genérico; NPCs neutros não devem ser agredidos arbitrariamente fora do roteiro.
- Otimizar 4 mixers/rigs e VFX no Android, limites de processamento AI por frame, pooling, culling e LOD; evitar reprocessar centenas de ossos em clones invisíveis.

## 8. Tamanho correto de todos os inimigos (sem quebrar GLBs)

O usuário relata **inimigos muito grandes**. Criar **normalização visual por altura real e classe** no carregamento: Enemy1 comum ~1,7–2,0 m em relação ao protagonista (ajustar pela altura real do modelo e cena), mini-boss Enemy1 ~1,15–1,35x do Enemy1 comum para imponência, **sem ficar gigantesco**. Para Enemy2/3/4 e demais inimigos comuns, revisar escala e aplicar normalização segura por perfil/classe, não multiplicador global cego. **Não reduzir Bispos, Pecados, AnjoGuia, NPCs ou objetos de cenário indiscriminadamente**; preservar escala intencional de bosses. Ajustar hitboxes, sombras, offset no solo, armas, câmera e distância de ataque junto da escala; proteger o protocolo de escala de animações GLB.

## 9. MINI-BOSS ENEMY1 — GUARDIÃO DO PORTAL

- Usar Enemy1 como base com **identidade visual e comportamento próprios**, não apenas Enemy1 maior e com mais HP. Nome existente `warden` / Guardião do Portal; manter narrativa e gatilho do Ato I.
- **Arma especial (imagem 4):** modelar em 3D uma **arma original de haste/foice dupla demoníaca**, metal negro/ferro gasto, lâminas curvas simétricas vermelho-sangue e prata, núcleo de caveira ou símbolo sombrio, haste longa com runas sutis, brilho vermelho pulsante. Proporções coerentes com o personagem e visual legível no Android. Construir por Blender/export GLB **ou geometria procedimental bem acabada**, conforme ferramentas disponíveis. Não usar simplesmente textura plana da imagem, nem colar uma arma rígida no mundo.
- **Animação da arma:** attach ao osso correto da mão e acompanhar walk/run/dash/attack/cast/hit/death. Golpes amplos com alcance e arcos de colisão reais, golpes pesados com recuperação, combo curto e contra-ataque; sem clipping e sem arma flutuando. Preservar animações GLB e usar retarget/procedural seguro quando necessário.
- **IA superior ao comum:** leitura de distância mais sofisticada, esquiva/parry contextual, mudança de fase ao perder HP, fakeout ocasional, flanqueamento e contra-magia mais consistente mas justa, pausas telegráficas, sem onisciência.
- **Três poderes derivados e mais fortes:** Garras do Abismo com maior área e mais mãos, Espiral Devoradora mais volumosa/forte e Juízo Violeta com explosão maior; visual e som próprios, cooldowns e dano balanceados. Possível combo assinatura com arma + poder, sem usar todos ao mesmo tempo de modo impossível de esquivar.
- **Vida e dificuldade:** mais HP que Enemy1 normal, defesa contextual e resistência parcial a CC; não invulnerabilidade permanente. Fase 2 em HP baixo com telegraph visual. Recompensa e conclusão de missão originais preservadas.

## 10. Engine e ferramentas: não misturar Unity à força

O usuário autoriza novas tecnologias para melhorar a qualidade. **Não integrar Unity runtime ao Three.js do jogo web**: criaria dois motores/renderers e risco alto de performance/compatibilidade. Pode usar **Blender offline** para modelagem/rig/export GLB, shaders **GLSL**, Three.js, ferramentas de VFX, WebAssembly/física (ex. Rapier) **somente se realmente necessário e medido**, testes e automação. Se a Mod 236 entregar VFX Engine 2.0, usar diretamente. Não migrar o projeto de engine sem aprovação expressa.

## 11. Testes de aceitação e laboratório de Enemy1

- Criar modo de teste direto e isolado do progresso (ex. `?testeEnemy1=1`), com botões para **1 Enemy1**, **2 Enemy1**, **4 Enemy1**, **mini-boss**, **NPC aliado** e, se possível, demonstrar **clash magia vs magia**. Reiniciar encontro sem reload; exibir HP por alvo e logs de hit/AI/colisão opcionais.
- Testes automatizados: 4 inimigos ativos simultaneamente, HP/dano independente, área acerta vários sem duplicar, esquiva/parry e stamina/cooldowns, telegraphs, counter-magic e colisão de projéteis, mãos agarram e soltam, NPC como alvo, mortes, cancelamento, saves, onDone após todos mortos, armas seguindo mão, scale e hitbox.
- Testes visuais reais em navegador mobile e desktop: os três poderes surgem gradualmente, têm volume e impacto, mini-boss segura a arma, 4 inimigos se coordenam sem se empilhar, protagonista consegue se mover/atacar/esquivar, inimigos não atravessam obstáculos, FPS aceitável. **Não afirmar testes visuais não executados.**
- Medir desempenho em dispositivo de classe média (alvo ideal 45–60 FPS, com fallback escalável quando não atingir), sem prometer números não medidos. Preferir CPU barata por agente e VFX pooling.

## 12. Fluxo final e economia EXTREMA de chat

1. Trabalhe **em silêncio**: não envie planos, status, comentários ou relatórios intermediários. Só interrompa se houver bloqueio real que impeça continuar. Faça pesquisa independente se tiver dúvida.
2. Implemente e teste com commits na sua branch. **Ao terminar, faça commit imediatamente**; não deixe mudanças somente locais. Sincronize `main`, resolva conflitos, faça PR e **merge automático quando seguro** (sem apagar Mod 236). Se houver bloqueio real de integração, preserve PR e informe objetivamente.
3. Atualize número visível da Mod e cache-busting; confirme GitHub Pages. Quando concluído e publicado, **exclua apenas `docs/briefings/CLAUDE-ENEMY1-IA-ESQUADRA-MINIBOSS-MOD237-TEMP/`**, preservando a visão mestra, documentos permanentes e briefings de outras tarefas.
4. Responda **somente ao final, máximo 10 linhas**: Mod, 3 poderes, IA, combate simultâneo, mini-boss/arma, testes reais, status de merge e **link direto para laboratório Enemy1 no celular**.

**Critério decisivo:** quatro Enemy1 realmente combatem juntos, usam tática justa, podem lutar contra NPCs, conjuram poderes com formação e impacto reais, e o mini-boss tem arma 3D própria. Nenhum desses itens pode ser substituído por efeito visual falso ou clone decorativo.
