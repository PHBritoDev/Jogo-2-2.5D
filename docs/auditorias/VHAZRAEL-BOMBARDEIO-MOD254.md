# Mod 254 — VHAZRAEL: Terror e Ninhada removidos; entra o Bombardeio Abissal Perseguidor

## Kit final
`throne` (Ruptura do Trono, preservada), `thorns` (espinhos, preservados), **`bombard`** (novo) e `orbital` (Extinção Orbital, preservada).

## Remoção completa
- **`vhazrael3d.js`:**
  - saíram `TERROR`, `BROOD`, `STOMP`, `registerSkill('terror' | 'brood' | 'stomp')`, os tipos `crawler` e `colossus` e o cérebro de lacaios;
  - `VZ` agora exporta só `boss`.
- **`vhazrael-vfx3d.js`:**
  - saíram o kit anatômico instanciado (segmentos, garras, dentes, lábios, palmas, olhos), as mãos, a entidade, as criaturas, a fenda da ninhada e o pisão;
  - saiu também `buildCrawler`.
- **`enemy1-squad-runtime3d.js`:** saíram os corpos procedurais (`PROC`).
- **`enemy3-runtime3d.js`:** saíram as poses de `terror` e `brood`; entrou a pose de comando do `bombard`.
- **`mundo-3d-prototype.js`:**
  - nomes, eventos (`handRise`, `bite`, `summon`, `stompBlast`), o ramo "Mãos Devoradoras" do aviso de agarrão e o "DEF solta" do Terror;
  - `grab` continua para as Garras do Enemy1;
  - rótulos NINHADA e COLOSSO do HUD do laboratório.
- O seletor do laboratório lê `T.kit`, então só lista os 4 poderes.
- Nenhuma invocação provisória ficou no lugar.

## Bombardeio Abissal Perseguidor (`bombard`)
**Lógica**
- O ataque dura 0,6 s de formação mais 5,6 s de disparos (6,2 s), com uma rajada a cada ~0,44 s (12 no total).
- **Mira:**
  - recalculada antes de cada disparo, a partir da posição atual mais uma previsão curta (0,12 s, no máximo 1,6 m);
  - padrões alternados: previsão, lateral ±2,6 m, posição atual e adiante;
  - erro aleatório de até 0,5 m.
- **Rajada travada:** depois de disparada, o ponto de impacto não muda (testado). A queda dura 0,62 s, e a marca no chão fica visível durante toda a queda.
- **Dano no contato:**
  - 6 por explosão, raio de 1,45 m (ajustado pelo tamanho da rajada);
  - uma vez por alvo e por rajada, com respeito a i-frames e linha de visão.
- **Fogo residual:**
  - no máximo 8 manchas, que duram 2,6 s cada;
  - 2 de dano por tique, com no mínimo 0,6 s entre tiques por alvo (somando todas as manchas) e nunca no mesmo instante de uma explosão.
- **Cleanup:** se o bispo morre, não há dano fantasma e o fogo some.

**Dificuldade simulada (12 rajadas, 4 sementes)**

| Situação | Rajadas que acertam |
|---|---|
| Parado | 8 |
| Andando em linha | 4–8 |
| Correndo em arco | 0–2 |
| Dash com i-frames | 1–2 |

**Ultimate:** `needSkills = 3` continua. Em lutas simuladas de 120 s, a Extinção saiu por volta de 22 s, depois dos três poderes, e só uma vez.

**VFX (`vhazrael-bombard3d.js`)**
- **Emissor suspenso:** núcleo denso, anel de plasma quebrado em lâminas e cruz de lâminas de borda negra, girando. Recua a cada disparo, com um raio de vez em quando.
- **Descarga:** corpo opaco alongado com núcleo, rastro curto e trajetória reta.
- **Aviso:** anel vermelho que se fecha e uma cruz no ponto real do chão.
- **Impacto:**
  - clarão curto;
  - domo-núcleo branco/amarelo com casca negra recortada;
  - anel de choque com espessura e anel de pressão no ar;
  - coluna e cogumelo em faixas que esfriam para fuligem;
  - pedras e placas saindo do epicentro e, às vezes, um relâmpago;
  - marca queimada temporária.
- **Fogo:** lâminas de chama e brasas sobre a mancha.
- **Áudio:** conjuração, rajada, impacto e crepitar.
- **Tremor:** moderado e opcional.
- **Custo:** 4 chamadas de desenho instanciadas, sem alocação por quadro.

## Testes
- `node --test`, com os testes novos do Mod 254:
  - duração de 4–7 s;
  - pontos travados;
  - dano só no contato;
  - curva de dificuldade (parado, andando, correndo, dash);
  - tique do fogo;
  - nada sobra no fim nem com o bispo morto;
  - kit sem Terror e Ninhada.
- Prévia isolada (`vhazrael-preview.html?k=bombard&t=…`) e jogo no laboratório em Chromium headless (SwiftShader), com capturas em `docs/evidencias/mod254/`.

## Limitações
- Não testado em Android físico. FPS real não medido.
- Sem bloom.
- O vídeo de referência foi visto quadro a quadro como direção de arte (fonte no céu, descargas e chão em chamas). Nada foi copiado.
