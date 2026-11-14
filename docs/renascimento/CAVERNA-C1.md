# Caverna de Eldória — etapa C1 (câmera em passagem estreita e lábio do abismo)

Primeira etapa do plano `PLANO-CAVERNA-ELDORIA.md` (#515). Branch `claude/eldoria-caverna-c1`, criada a partir da `main`
(`805cadc`). **Sem merge sem aceite.** Medições em SwiftShader, viewport mobile 852×393. Não é FPS de Android.

## O que muda

- **Câmera a ombro nas passagens estreitas** (`mundo-3d-prototype.js`):
  - Quando o braço reto ficaria com menos de 3,2 m, a câmera gira ±31° para o lado mais livre. Antes, ela só
    encurtava e o herói tomava a tela.
  - O lado escolhido é suavizado (sem troca a cada quadro) e passa pelo mesmo teste de sólido (`caveArmLimit`).
  - Fora da caverna o ajuste zera.
- **Lábio do abismo** (`ascension-layout.js` `CHASM_RIM`, `ascension-cave3d.js`):
  - 41 pedras meio enterradas logo fora da borda, na mesma rocha triplanar e numa só malha.
  - **A colisão vem dos mesmos dados.** Há vãos, então a borda continua alcançável e o salto continua possível.
  - As cabeceiras da ponte ficam livres (folga de 3,6 m).

## Medições

| Ponto | Antes | C1 |
|---|---|---|
| Braço da câmera, passagem eco–cristal (−30, −120) | herói colado na tela (no instantâneo a medida saiu inválida: 49 m) | **6,9 m**, sem rocha na frente |
| Braço da câmera, galeria do eco (26, −88) | 3,5 m | **5,2 m** |
| Andar rumo à borda em (9, −46) e (−11, −50) | **cai** no abismo sem aviso | para no lábio (a queda segue possível pelos vãos) |
| Ponte natural (0, −44 → −74) | atravessa | atravessa |
| Draw calls na caverna (entrada/salão/cristal) | 80 / 69 / 74 | 81 / 70 / 75 (+1: malha do lábio) |
| Tempo de render (`perfProbe`, salão) | 2,1–2,4 ms | 1,7–2,5 ms |

**Correção do plano (bug 1):**
- O plano contava 25–40 draw calls do mundo de fora dentro da caverna. A contagem saiu do `drawList`, que registra
  cada `renderBufferDirect`, inclusive lotes instanciados com 0 instâncias.
- Pelo `renderer.info` (chamadas reais à GPU), essas chamadas **não** acontecem.
- Testei esconder os lotes vazios no próprio corte por distância. O tempo de render não mudou (2,1–2,4 ms →
  1,7–2,5 ms), então **revertei** a mudança: não havia problema comprovado.

## Testes

| Teste | Resultado |
|---|---|
| `tests/caverna-c1.test.mjs` | 2/2. Cobre: pedras fora do vazio, dentro do volume, longe da ponte e sólidas; vãos na borda; ponte caminhável; integração |
| `ascension311` e `mod316` | Passam (caverna, portal e jaulas intactos) |
| Suíte completa | Só falham os 2 testes que já falham na `main` (`Mod 262`, `Mod 278`) |

Evidências: `evidencias/caverna-c1/antes-depois-camera.jpg` e `evidencias/caverna-c1/labio-do-abismo.jpg`.

## Próximas etapas (plano)

- **C2:** SDF 3D + malha em worker, com colisão e câmera saindo da mesma fonte.
- **C3:** material e espeleotemas.
- **C4:** luz por câmara.
- **C5:** galeria alta, saída alternativa e entrada contínua.
