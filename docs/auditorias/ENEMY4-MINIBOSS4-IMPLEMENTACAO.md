# Mod 246 — Enemy4, mini-chefe Enemy4 e raio carmim do Enemy3

Base: `main` em `e81d2d8`. Origem: briefing temporário `docs/TEMP-CLAUDE-ENEMY4-VFX-SKILLS.md` e Issue #332. O briefing foi removido ao concluir; o histórico fica no PR. As sete referências visuais vieram do criador na conversa e não foram copiadas para o repositório.

## Auditoria e modelos
- **Mini-chefe 3:** passou a usar o `Enemy3.glb`, o mesmo modelo do Enemy3 comum, só que maior e com a Katana Dragão Carmim.
  - Mudaram o `startPack` e os dois clones de cena do Ato III.
  - A katana e os combos foram verificados no novo esqueleto, que tem os mesmos ossos exigidos pelo assador de IK.
- **Enemy4 (`demon4`, kind `e4`) e mini-chefe Enemy4 (`miniboss4`, kind `e4boss`):** ambos usam o `Enemy4.glb`; o chefe fica 1,37× mais alto.
  - O mini-chefe do Ato IV usava o `Enemy3.glb`; agora usa o `Enemy4.glb`.
- **Líder da torre (`leader4`):** continua no pacote antigo.
- **Isolamento:** `e3boss` e `e4boss` são espécies distintas, com mapeamentos separados (`e3SquadPack`/`e4SquadPack`).
- **Arma:** o `Enemy4.glb` não traz arma, então a Espada-Mandíbula (`jaw-sword3d.js`) é procedural e presa ao osso `RightHand`.

## Implementado
- **Raio carmim do Enemy3** (só aparência; telegraph, hitbox, dano e raio pesado intactos):
  - fita larga em zigue-zague, desenhada virada para a câmera em cada segmento;
  - massa #1A0004, contorno #FF0015 e filamento #FFF275→#FF5500;
  - coroa de espinhos vermelho-preto, placas de solo e núcleo laranja.
- **Erupção do Santuário Carmim:**
  - Quantidade: 12 marcas (mini-chefe 20) escalonadas em 4 s.
  - Aviso de 1 s (0,9 s no mini-chefe) + carga de 0,3 s antes do pilar.
  - Marcas fixas, separadas e com teto de marcas vivas.
  - O pilar dá dano pelo volume, uma vez por alvo.
  - Teste: quem sai das marcas nunca leva dano.
- **Constelação da Ruína:**
  - Quantidade: 7 esferas (mini-chefe 12) em coroa, com preparação de 0,7 s.
  - Disparo um a um a cada 0,26 s (0,22 s no mini-chefe), com mira calculada no disparo e travada.
  - Varredura contra herói, chão e parede; cúpula no primeiro impacto e nunca duas explosões.
- **Perfurador do Abismo:**
  - Modo frontal: rajada de 4/s (mini-chefe 6/s).
  - Modo subterrâneo: marcas fixas sob a posição prevista, 0,65 s antes da broca emergir.
  - A escolha do modo vem do movimento lateral observado, com chance de errar.
  - Teto de acertos por conjuração (3, ou 4 no mini-chefe).
- **Jaula das Correntes e Mandíbula Abissal** (exclusiva do mini-chefe, quando o herói foge):
  - Anel parcial de 8 correntes, com duas rotas de fuga marcadas no chão.
  - Lentidão de até 1,2 s só para quem é atingido.
  - Mordida no ponto travado, com aviso de 1 s, salto curto do chefe e nenhum teleporte.
- **Espada-Mandíbula:**
  - Modelo: lâminas serrilhadas abertas, dentes ósseos voltados para dentro, tecido carmim pulsante, olho vermelho na guarda e chamas de tinta negra com contorno magenta.
  - Correntes espinhosas flutuam nas costas do chefe, fora da hitbox.
  - Três golpes nativos por IK (Varredura, Estocada à média distância e Queda com salto); rastro violeta/preto com borda branca.
- **IA:** usa recargas e alternância de poderes. Conjurações são canceladas por atordoamento ou morte. A fúria do mini-chefe começa a 45%.
- **Animação:** poses procedurais por cima dos clipes reais:
  - braços abertos na Constelação;
  - mãos ao alto e golpe ao chão no Santuário e na Jaula;
  - estocada no Perfurador.
- **Laboratório:** `?testeEnemy4=1`, com opção "Enemy4 / Mini-boss 4" em `laboratorio-inimigos.html`.

## Testes executados
- **`node --test`:** 297 aprovados, 0 falhas. Inclui 7 testes novos em `enemy4-squad.test.mjs` e o teste de integração atualizado.
- **Chromium headless (SwiftShader), 430×860 com toque, sem erros de página:**
  - laboratório Enemy4 com 3 inimigos e com o mini-chefe: 4 poderes e 3 golpes;
  - caminhos reais `startPack` com `demon4`, `miniboss4` e `miniboss3` (Enemy3.glb), além de `leader4` no modo antigo.
- **Memória:** estável em 8 ciclos com Enemy4 na qualidade alta (90 geometrias, 4 texturas, 47 programas).
- **Evidência:** [capturas](../evidencias/mod246/enemy4-e-raio-carmim.jpg).

## Não testado ou limitações
- Não testado em Android físico, nem FPS real, nem áudio ouvido.
- Não houve passagem manual completa da campanha dos Atos III/IV.
- A medição de memória em qualidade baixa ficou sem resultado: o carregamento estourou o tempo na segunda rodada. A Mod 245 já tinha medido a qualidade baixa para o Enemy3.
