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
