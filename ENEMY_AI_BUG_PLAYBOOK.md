# Playbook de correção — IA de inimigos e animações 3D

Este documento registra causas já encontradas no protótipo 3D para evitar reintroduzir os mesmos bugs em Enemy1, mini-chefes e Bispos.

## 1. Inimigo anda em cima do jogador sem atacar
**Causa comum:** a IA escolhe perseguir antes de testar a faixa de ataque, ou um ataque especial fica priorizado/esperando a animação e impede a decisão seguinte.

**Regras obrigatórias:**
- Calcular distância 2D entre inimigo e jogador antes de escolher a ação.
- Quando estiver dentro do alcance corpo a corpo, parar de deslocar-se e tentar iniciar um ataque válido.
- Se a animação de ataque não existir ou falhar, não deixar o inimigo andando dentro do alcance: usar idle/recuperação e reavaliar no próximo tick.
- Ataques à distância precisam de cooldowns separados e prioridade alternada; não deixar um ataque com cooldown curto monopolizar todos os turnos.
- Depois de dash, recalcular a distância no próximo frame; nunca continuar perseguindo com a direção antiga.
- Ao morrer o jogador, parar imediatamente walk/run/dash/cast/attack do inimigo e voltar para idle. Ao respawn, a IA deve reavaliar a distância atual.

## 2. Animação fica presa na pose final
- Animações de ação devem usar `LoopOnce` e `clampWhenFinished` somente quando o estado de gameplay tiver um caminho garantido para sair da ação.
- Não usar apenas `action.isRunning()` para decidir se uma ação terminou: com `clampWhenFinished=true`, a ação pode ficar pausada no último quadro.
- Usar duração do clipe, evento `finished` do `AnimationMixer` ou timer de estado com limite máximo.
- Em interrupções (morte, respawn, stun, diálogo, troca de fase), limpar o estado de ataque/dash/cast e iniciar idle explicitamente.

## 3. Jogador flutua após morrer/respawn
- A animação de morte pode deixar ações/trilhas de root transform ativas.
- No respawn, parar todas as ações do mixer do protagonista, limpar a referência da ação ativa, zerar velocidade vertical e movimento, colocar o root na altura do terreno e só então iniciar idle.
- Não corrigir a altura apenas uma vez enquanto a animação de morte continua tocando; confirmar que o mixer foi limpo.

## 4. Respiração do Anjo-Guia
- Não presumir que o GLB contém um clipe com nome `Breath` ou `Idle`.
- Registrar no console todos os nomes/durações de `gltf.animations` antes de selecionar um clipe.
- Se não houver um clipe de repouso identificado, usar respiração procedural sutil no pivô externo (escala vertical e movimento muito pequenos), em vez de deixar o personagem completamente imóvel ou escolher corrida/pulo aleatoriamente.
- Evitar animar a escala do modelo importado se isso entrar em conflito com o ajuste automático de tamanho.

## 5. Ataques à distância legíveis
- Um corte de energia deve ter direção de viagem clara, forma alongada e leitura visual distinta; não usar anéis giratórios se a intenção é um corte reto.
- Usar raios finos e breves como detalhe de silhueta, sem cobrir o projétil inteiro.
- O projétil deve ter velocidade, tempo de vida, distância máxima, colisão e dano próprios.
- A colisão precisa respeitar a altura do jogador; não deixar o projétil causar dano repetidamente a cada frame.
- Separar a animação de apontar a mão do efeito lançado: a animação prepara o poder; o efeito precisa ser criado explicitamente e ter cooldown.

## 6. Não adivinhar animações
- Ler os nomes reais de `gltf.animations` no console (por exemplo, `window.Enemy1AnimationReport` e `window.GuideAnimationReport`).
- Preferir correspondência exata normalizada para nomes conhecidos e correspondência semântica documentada para variantes.
- Não mapear um clipe desconhecido como ataque/respiração por ser o primeiro da lista.
- Se não houver um clipe compatível, usar fallback seguro e registrar aviso; não afirmar que a animação foi validada visualmente.

## 7. Checklist antes de publicar uma modificação
1. Validar sintaxe JavaScript.
2. Verificar que o marcador/cache e a versão da página apontam para a mesma Mod.
3. Verificar cada estado: idle, perseguir, corpo a corpo, cada ataque à distância, dash, dano, morte e respawn.
4. Testar com jogador parado perto do inimigo, longe, após tomar dano e após respawn.
5. Não declarar teste visual/mobile concluído sem realmente executar o jogo no navegador.


## 8. Mod 172 — ataques múltiplos e distância de combate
- O golpe especial de cortes agora cria três projéteis em leque, em vez de apenas um. O golpe de tornado também lança três projéteis com abertura angular.
- A IA pode tentar um ataque à distância quando o ataque corpo a corpo ainda está em recarga, desde que exista espaço mínimo. Isso evita ficar parada sem fazer nada só porque o golpe básico está em cooldown.
- Os papéis `cast` e `attack2` precisam usar clipes distintos. Se os nomes reais não forem claros, consultar `window.Enemy1AnimationReport` no console; não presumir que o clipe de habilidade 3 também é o de apontar a mão.
- Testar especificamente em três distâncias: corpo a corpo, média e longa. Confirmar que o inimigo usa ataque básico, corte triplo e tornado triplo; se um especial não aparecer, inspecionar a lista real de clipes e o estado de cooldown, não apenas aumentar a chance aleatória.

## 9. Mod 172 — queda do protagonista e respiração do Anjo
- Quando o protagonista está no chão, a dimensão recalcula a posição vertical do modelo a partir dos ossos reais dos pés (foot/toe/ankle), depois de atualizar o mixer. Não aplicar essa correção enquanto o personagem está no ar, para não cancelar salto.
- A respiração procedural do Anjo agora usa um pulso de corpo mais visível e tenta modular suavemente ossos de tronco/peito quando disponíveis. Confirmar visualmente no aparelho; nomes de ossos podem variar entre rigs.
- Não afirmar que a respiração ou o alinhamento estão resolvidos sem teste visual.

## 10. Magias bíblicas no protótipo 3D
- O protótipo tem controles dedicados para três espadas da Palavra, cinco espadas celestiais, Sol da Justiça e ultimate, com cooldowns próprios e projéteis que podem atingir o inimigo da trilha.
- Isto é uma primeira implementação jogável do sistema de habilidades, não a integração final com a campanha inteira. Antes de trocar a dimensão 2D por padrão, integrar e testar os dados persistentes, as missões/NPCs e a entrada real para a dimensão do Primeiro Bispo. Manter `?mundo2d=1` como retorno seguro até validar a migração.


## 11. Mod 173 — por que só o golpe básico aparecia
Causa identificada no fluxo da IA:
- A decisão do golpe corpo a corpo vinha antes dos especiais. Como o jogador normalmente fica perto, a IA retornava com `Atq1` antes de escolher `Habilidade3` ou o clipe de apontar a mão.
- A verificação do dash vinha depois dos especiais de distância média/longe. Quando um especial estava disponível, a IA retornava antes de chegar ao dash; por isso o avanço/retirada quase nunca acontecia.
Correções:
- A ordem agora dá oportunidade ao dash em distância longa e à retirada quando o jogador está colado e o golpe está em recarga; depois alterna especiais distintos e só então escolhe o golpe básico.
- Os papéis especiais tentam descobrir clipes reais não utilizados do GLB caso os nomes conhecidos não existam. `window.Enemy1AnimationRoleReport` mostra o nome real que foi associado a cada papel; `window.Enemy1AnimationReport` lista todos os clipes carregados.
- Colisão recíproca: movimento do jogador respeita o raio do Enemy1; movimento do Enemy1 respeita o raio do jogador. Usar funções separadas para que a checagem não impeça o próprio inimigo de se mover.
- Validar no jogo que o relatório associa clipes diferentes a `attack2` e `cast`. Se o modelo não tiver clipes adicionais de combate, a IA não consegue inventar animações que não existam no GLB; nesse caso é necessário adicionar/importar as animações reais.

## 12. Mod 184 — Ato I no mundo 3D
- A missão jogável do protótipo deixou de ser "clareira genérica" e passou a ser o resgate do Ato I: nome, Téo, noite, três captores, gaiolas, escolta e portal ainda fechado.
- O progresso novo fica em `sevenSins3DCampaignV5`. Saves da missão antiga (V4 e anteriores) conservam as moedas e voltam ao início do Ato I, para não pular o resgate.
- Não ligar o portal à dimensão de VHAZRAEL nesta etapa. A dimensão estável continua na página principal (`BishopDimension` / `?valerioTest=1`). O portal só explica que a passagem segue fechada até a subida da montanha.
- As crianças reutilizam o rig já carregado do protagonista, em escala menor, como os vendedores da vila. Não trocar isso por `Npc.glb` sem medir o custo: o arquivo passa de 16 MiB.
- O loader `mod181-loader.js` reescreve o import de `act1-flow.js` para URL absoluta porque o protótipo é executado a partir de um blob. Se remover o loader, o import relativo volta a funcionar direto.


## 13. Mod 185 — subida, guarda e portal existente
- Depois do resgate, a trilha da montanha tem duas sentinelas espaçadas e um guarda antes do portal. Elas reutilizam o mesmo Enemy1, uma de cada vez. Não criar um segundo GLB só para parecer um grupo.
- O guarda não muda a escala do rig. A diferença é vida (180), dano corpo a corpo um pouco maior, recuo de dash e, abaixo de 55% de vida, um corte largo em leque usando o clipe de conjuração que já existir. Se esse clipe não existir, o guarda continua mais resistente, sem animação inventada.
- A barra de vida usa porcentagem (`enemyMaxHP`). Não voltar a tratar `enemyHP` como porcentagem direta, senão o guarda estoura a barra.
- O portal só abre no passo 6. Antes disso ele avisa que a passagem segue guardada e não congela a luta se o inimigo estiver vivo.
- A travessia leva a `index.html?valerioTest=1`, que entra na dimensão estável de VHAZRAEL. Não construir outra arena no protótipo 3D.
- Saves V5 no passo 4 ou 5 (portal fechado da Mod 184) voltam ao começo da subida e não recebem de novo a recompensa do portal se ela já tinha sido dada.
