# Caverna de Eldória — C4: luz por câmara, névoa/exposição e áudio por câmara

Etapa C4 do `PLANO-CAVERNA-ELDORIA.md`, empilhada sobre a C3 (#537).

## Direção (referência estudada, não copiada)

A referência foi a gramática de luz das grutas de RPGs de mundo aberto estilizados, como Genshin Impact. Nenhum
recurso, cor exata ou forma foi copiado. O que se aproveitou:

1. **Uma cor dominante e uma luz-chave com motivo por câmara.**
   - Entrada: luz do dia quente que morre no túnel.
   - Salão: **sol dourado** da fresta, com poeira dourada e poça de luz no chão. É o plano cinematográfico.
   - Gruta: verde-água das poças.
   - Eco: recorte frio na saída da passagem.
   - Prisão: fogo da única tocha (quente).
   - Cristal: os **cristais são a luz** (violeta) mais a fresta fria.
   - Portal: o vórtice.
2. **Contraste quente × frio:** chave quente, preenchimento frio e névoa colorida mais clara que as sombras. A
   profundidade lê em camadas e a silhueta não some.
3. **Escuridão como escolha** (bug 5 do plano): o hemisfério nunca fica abaixo de 1,05 e o chão do hemisfério nunca
   é preto.
4. Sem pós-processamento: feixes falsos (cone aditivo), poça de luz **no shader da rocha** (segue o relevo, sem malha
   extra) e emissivos.

## Técnica

- `ascension-cave-light.js` (puro):
  - `CAVE_MOODS`: humor de cada câmara (névoa, hemisfério, sol, exposição).
  - `moodWeights`/`moodAt`: misturam as câmaras pela posição do herói.
  - `easeEnv`: transição suave com constante de 0,9 s, em ponto flutuante. Em 8 bits, a névoa parava até 14 níveis
    longe do alvo; a falha foi achada no teste e corrigida.
  - `CAVE_KEYS`: 8 fontes de luz com papel descrito.
  - `SHAFT_COLORS`: uma cor por fresta.
  - `caveAudioAt`: tamanho da sala, gotas e corrente de ar.
- O `env` da zona agora é **vivo**: o jogo já o lia a cada quadro, e a caverna o atualiza em `update`. Num salto maior
  que 15 m (teleporte ou reentrada), o humor aplica na hora.
- Luzes: todas passam pelo **orçamento de 4 luzes** do jogo (camada 31). A sonda mostra no máximo 4 no shader.
- Áudio (`audio3d.js`), motor existente:
  - eco por convolução com resposta de sala procedural (2,6 s, sem arquivo) e envio pelo tamanho da câmara;
  - tom de sala grave;
  - gotas perto das poças;
  - corrente de ar na boca;
  - sem pássaros, grilos nem folhas dentro da caverna;
  - os passos continuam;
  - fora da caverna o envio volta a 0.

## Validação (mobile 852×393, SwiftShader; contagem, não FPS de Android)

| Item | Resultado |
|---|---|
| Quadros com câmera na rocha (8 pontos × 120, giro completo) | **0** (braço mínimo 2,38 m, igual à C2) |
| Navegação (`navWalk`, 8 trechos: túnel, ponte nos dois sentidos, gruta, norte, eco, galeria leste, eco–cristal) | todos completos, sem queda e sem trava |
| Draw calls / triângulos (entrada, salão, gruta, cristal) | 69/163 k · 63/152 k · 51/161 k · 62/194 k |
| Luzes no shader | 4 (orçamento) |
| Render (`perfProbe`) | 1,6–2,5 ms |
| Erros de página com o AudioContext liberado | nenhum |
| Testes | C1–C4: 17/17. Suíte inteira sem falha nova (só `Mod 262`/`Mod 278`, como na `main`) |

O som foi verificado só como ausência de erro. A audição e o FPS no A55 ficam para o aparelho real.

## Evidências (`evidencias/caverna-c4/`)

- `jogo-9-pontos-c2-c3-c4.jpg`: os 9 pontos da baseline lado a lado (C2 | C3 | C4).
- `desktop-4-camaras.jpg`: entrada, salão, gruta e cristal no desktop.
