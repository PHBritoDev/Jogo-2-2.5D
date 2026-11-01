# Mod 253 — Extinção Orbital do VHAZRAEL refeita como cutscene

## Antes
O vídeo do jogo descrito no briefing mostrava:
- o boss pequeno na tela;
- um planeta liso com redemoinho rosado;
- o meteoro como uma pedra marrom poligonal com uma linha vermelha;
- o HUD cobrindo as tomadas.

Também havia um bug na câmera: no jogo, a câmera de 3ª pessoa fica a no máximo 760 m (far plane), e o meteoro da arena (a 600–1500 m) era cortado.

## Arquitetura

| Arquivo | Papel |
|---|---|
| `vhazrael3d.js` | Lógica. Fases `awaken 2,6 → orbit 3 → entry 4 → arrival 1,6 → choice 2,6 → impact 2 → after 2,2` s, na mesma linha do tempo de tudo. Na janela `choice`: guarda (`guardT ≥ .35`), duelo de ultimates e evento `orbitalGuard` antes do impacto. `s.dim` escurece a luz da arena para criar a silhueta e a sombra do meteoro. Dano inalterado: nada 95, escudo 14, duelo 0. |
| `vhazrael-extinction3d.js` | VFX e câmeras. Tudo procedural (shaders e geometria gerada no carregamento, sem texturas externas). |
| `vhazrael-vfx3d.js` | Remove o planeta, o meteoro e o domo antigos e delega ao módulo novo. Expõe `orbitShot` e `sceneTint`. |
| `enemy1-squad-runtime3d.js` | Passa o osso `Head` do Bispo1 ao VFX, para o X ficar no rosto real. |
| `mundo-3d-prototype.js` | Detalhado logo abaixo. |

**`mundo-3d-prototype.js`:**
- A tomada vale só para o quadro desenhado: salva, mistura (blend), desenha e restaura. Não se acumula na câmera do jogador.
- Corrigido o aliasing de `slerpQuaternions`, que impedia a câmera de mirar.
- HUD de cinematografia:
  - nas tomadas travadas fica só o botão PULAR;
  - na escolha ficam só DEF (ampliado), ULTIMATE e um indicador com o tempo restante e "GUARDA FIRME".
- PULAR cobre todas as tomadas travadas.
- Luz carmim/laranja temporária com restauração integral.
- Áudio por tomada.

## Tomadas
1. **Despertar**
   - close baixo e frontal, com o bispo em silhueta;
   - aura carmim estruturada: fundo com linhas verticais, cortes negros e lâminas atrás da silhueta;
   - X de luz rubra (duas diagonais finas com núcleo e halo) preso ao osso da cabeça.
2. **Terra**
   - câmera alta sobre o lado noturno, com o limbo cortando o meio da tela e o sol estourando no horizonte;
   - continentes, oceano com reflexo especular, gelo, nuvens com parallax, luzes urbanas e limbo azul que avermelha no terminador.
3. **Ameaça**
   - um ponto quente surge longe e cresce;
   - é o mesmo corpo do caminho, não um orbe.
4. **Reentrada** — montagem guiada pela posição real do meteoro:
   - tracking 3/4;
   - plano rente à crosta;
   - plano aberto mirando a Terra;
   - horizonte;
   - câmera distal.

   O meteoro é rocha irregular com crateras, fendas finas incandescentes por ruído com domain warping, bump por derivadas e face de ataque fundida. A camada de plasma e a cauda são envelopes deformados no vertex shader, sempre opostos à velocidade.
5. **Arena**
   - plano aberto; o meteoro (raio de 30 m) entra pelo céu além do bispo, sempre a menos de 760 m;
   - sombra crescente e brasas empurradas pelo vento.
6. **POV jogável** — over-the-shoulder na altura dos olhos, olhando o meteoro crescer. DEF funciona no celular (testado por toque simulado).
7. **Impacto**, nesta ordem:
   1. contato;
   2. clarão curto (atenuado com "reduzir flashes") e hitstop discreto;
   3. núcleo branco-amarelo com casca laranja/negra recortada;
   4. anel de choque com espessura;
   5. lâminas de fogo saindo da casca, fissuras radiais, placas e detritos.

   Tudo irradia do epicentro, e a câmera fica aberta, fora do domo.
8. **Depois** — tudo erode e esfria, e a câmera, o HUD, a luz e os controles voltam.

## Testes
- **`node --test`:** 314 aprovados, incluindo os testes novos do Mod 253:
  - fases;
  - silhueta e luz devolvida;
  - nenhum meteoro fantasma;
  - PULAR, HUD, trava e tomada aplicada só no quadro desenhado;
  - guarda confirmada antes do impacto.
- **Chromium headless (SwiftShader), jogo em paisagem 900×405 e prévia isolada:**
  - capturas de todas as tomadas;
  - DEF segurado por toque na janela: o herói perdeu 4 de 100 HP;
  - sem DEF: perdeu 95;
  - 0 erros de console;
  - classes do HUD conferidas por fase.
- **Evidências:** `docs/evidencias/mod253/`.

## Limitações
- Não testado em Android físico. FPS real não medido (SwiftShader não serve para isso).
- Sem bloom: o jogo não tem pós-processamento. O brilho vem de núcleos aditivos e cores em faixas.
- Terra e meteoro são procedurais (sem texturas fotográficas), para caber no celular sem downloads.
- A Ruptura do Trono não foi alterada.
