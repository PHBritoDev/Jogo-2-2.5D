# Mod 247 — VHAZRAEL (Bispo 1): nome canônico, IA adaptativa, kit novo e Extinção Orbital

Base: `main` em `4219724`. Implementa o briefing temporário do Bispo 1, incluindo a seção 11. As referências (6 imagens + 2 vídeos) vieram do criador na conversa e não foram copiadas para o repositório.

## Renomeação total
- **Arquivos ajustados:** 21, entre código, testes e documentação ativa.
- **O que mudou:** todas as variantes do nome antigo passaram a `vhazrael`/`VHAZRAEL`:
  - funções, cenas, falas e speaker;
  - perfil de luta e `XP_REWARDS`;
  - bestiário;
  - chave de save `vhazraelRewardClaimed`;
  - URL de handoff `vhazraelTest`;
  - id CSS.
- **Busca final:** `git grep -i` não encontra o nome em nenhum arquivo do repositório. Isso vale também para binários (`git grep -a`) e é coberto pelo teste `Mod 247` em `enemy1-integration.test.mjs`. O briefing temporário é apagado depois do merge.
- **Migração de save sem a string antiga:** `migrateBishopOneName` em `act1-flow.js` faz a detecção pela forma das chaves.
  - Em toda a história do repositório só existiram três chaves `*RewardClaimed`, e só um id do bestiário mudou de nome.
  - A chave desconhecida vira `vhazraelRewardClaimed`, e o id fora do catálogo vira `vhazrael`.
  - Moedas, etapa e recompensas são preservadas, conforme o teste de migração.
- **URLs antigas:** nenhum código lia o parâmetro antigo, então nada precisava de redirecionamento.

## Luta
- **Dimensão do Bispo 1:** a luta agora roda na esquadra (`pack.dim`) com o rig `Bispo1-lod.glb`. Ficam iguais:
  - cartão VS e arena;
  - fala de entrada e de derrota;
  - `dimensionVictory`, recompensa e saída;
  - corações: ao cair, o bispo volta com vida cheia e a ultimate continua consumida.
- **Kit antigo:** o ataque de moedas saiu do kit jogável. Os kits legados só rodam com `?esquadraLegada=1`.
- **IA adaptativa (`vhazraelBrain`):** guarda uma memória de ~8 s do estilo VISÍVEL do jogador — dash e lado preferido, guarda, agressão, distância e magia. Essa memória ajusta, com teto:
  - espinhos que interceptam o lado preferido, com a segunda onda atrasada;
  - quebra de guarda contra quem bloqueia;
  - dash de aproximação contra quem foge;
  - mais defesa e esquiva, mais contra-ataque, contra quem ataca sem parar;
  - strafe que fecha a rota favorita.

  A ficha base também é a mais rápida e defensiva do jogo: decide a cada 0,16–0,26 s, com bloqueio 0,32 e esquiva 0,40. Há penalidade para repetir poder e bônus para mostrar o kit inteiro. Os testes provam mudança real de decisão em cada estilo, sem alterar os outros inimigos.
- **Ruptura do Trono Abissal:**
  - carga de 1 s com fitas negras/carmim na lâmina, depois erguer;
  - onda achatada e larga rente ao chão, que pode ser saltada;
  - impacto com domo, coluna e linhas radiais.
- **Floresta de Espinhos:** ondas de espinhos finos e diagonais, entrecruzados, com arestas violeta. A rachadura aparece no chão 0,85 s antes. Os arcos são assimétricos, com vãos, e cada onda dá no máximo um dano.
- **Entidade do Terror + Mãos Devoradoras:**
  - Silhueta colossal atrás do bispo, com olhos vermelhos e bocarra serrilhada.
  - Mãos negras com boca saem de rachaduras marcadas, e a 1ª tenta agarrar onde o jogador vai estar.
  - A mordida é periódica e limitada. DASH ou DEF soltam, com imunidade curta depois.
- **Ninhada:**
  - Criaturas de oito patas com boca em losango e dois olhos brancos, com HP próprio.
  - Não expiram, respeitam um teto de vivas (2, ou 3 na fúria) e o Colosso aparece uma vez abaixo de 45%.
  - Todas morrem com o bispo.
- **Extinção Orbital, ultimate ÚNICA:** só depois de mostrar 3 poderes (ou com 35% de vida). Duração de 17,8 s:
  - **Despertar (0–3 s):** câmera baixa e coluna de aura.
  - **Orbital (3–6,5 s):** cena ISOLADA com planeta estilizado, ciclone vermelho e meteoro vindo do espaço.
  - **Entrada (6,5–11,5 s):** meteoro com fendas de magma e plasma.
  - **Escolha (11,5–14 s):** controle devolvido e o meteoro dominando o céu.
  - **Impacto e dissipação.**

  Não existe ponto seguro, e os i-frames de dash não valem contra o meteoro. O resultado depende da resposta:
  - DEF: 14 de dano e o escudo quebra;
  - ULTIMATE: duelo, o meteoro se parte;
  - nada: 95 de dano.

  Ataque ou pulo pula as tomadas e vai direto para a janela de resposta. Durante a cinematografia ninguém ataca, e depois não há exaustão nem fraqueza.

## Testes executados
- **`node --test`:** 307 aprovados, 0 falhas. Inclui `vhazrael.test.mjs` (8 testes: estilos, variedade, ultimate única e respostas, onda, espinhos, mãos, ninhada, determinismo) e o teste de migração.
- **Chromium headless (SwiftShader), 430×860 com toque, sem erros de página:**
  - laboratório `?testeVhazrael=1` com os 4 poderes e a Extinção completa, com as fases na ordem e o controle devolvido;
  - fluxo REAL da dimensão (`vhazraelDimQA`): cartão VS, luta em esquadra, fala de derrota e `onVictory`.
- **Evidência:** [capturas](../evidencias/mod247/vhazrael-poderes-e-extincao-orbital.jpg).

## Limites
- Não testado em Android físico, nem FPS real, nem áudio ouvido.
- O `Bispo1-lod.glb` tem só Idle, Walk, Sword Aerial Combo, Sword Regular B e Hit Knockback. Por isso:
  - conjurações, carga e arremesso são camadas procedurais;
  - a lâmina do bispo é procedural, porque o GLB não traz espada.
- A cena orbital é estilizada: não há planeta real nem textura grande.
