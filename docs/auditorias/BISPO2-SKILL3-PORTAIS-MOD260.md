# Mod 260 — VORGAZHEK (Bispo 2): poderes genéricos removidos + Skill 3 "DOMÍNIO DAS LÂMINAS ENDIVIDADAS"

## Remoção dos poderes genéricos antigos
- **`powers3d.js`:**
  - `s2` ("Lâminas de Metal Líquido"), o especial de espada ("Golpe da Forja") e a ultimate ("FORNALHA DA DÍVIDA") viraram poderes reservados: tipo `reserved`, `disabled: true`, sem substitutos;
  - `pickMove` ignora poderes desligados;
  - `ultimateFor` devolve `null` quando a ultimate está desligada, então `ultimateDue` nunca dispara.
- **`mundo-3d-prototype.js`:**
  - saiu o ramo `forge` de `startKitUlt`;
  - saíram `BOSS_POWERS.vorgazhek` e o alias `fallen2`;
  - as correntes continuam só na Avareza III (`greedChains`);
  - `case 'reserved'` não executa nada;
  - `kitMove` recusa poderes desligados.
- **Preservado sem mudança:**
  - a Skill 1 (Vórtices, Mods 256–259), cujo módulo `vorgazhek-tornado3d.js` não foi tocado. Na integração, só o aborto passou a aceitar `vorgazhek` e `fallen2` (`isVorgazhekProfile`);
  - ataques básicos, rig e animações;
  - os outros perfis.
- O perfil `fallen2` (finale) usa o mesmo kit.

## DOMÍNIO DAS LÂMINAS ENDIVIDADAS (`portal_swords`, s3)
**Módulo:** `vorgazhek-portal-swords3d.js`, com lógica pura e VFX no mesmo relógio e nos mesmos pontos de colisão.

**Portais**
- 20 a 24 portais abrem quase juntos (atraso de 0–0,22 s).
- Ficam a 6–14 m do chão, em três camadas (≈7 / 9,8 / 12,6 m, com variação).
- Distribuição: atrás do bispo, atrás do herói e dos dois lados do meio, dentro da arena real (raio − 3 m), com no mínimo 2,8 m entre portais.
- Ficam fixos depois de abrir, virados para a arena e o herói.
- Visual: núcleo quase preto, espirais índigo, azul elétrico e violeta, borda lilás, transparente por fora.

**Espadas**
- Cada portal faz **exatamente 3** espadas, ou seja, 60–72 no total.
- A espada atravessa o portal com a **ponta primeiro**. Durante a extração (0,55 s), o que ainda está atrás do plano do portal é recortado no shader, sem escala.
- Depois fica armada à frente do portal, apontando para o herói.
- **Fila global:** uma espada lançada por vez, com no mínimo 0,12 s entre lançamentos, alternando lado e altura.
- A próxima espada do mesmo portal só começa a sair quando a anterior termina (acerto, chão ou tempo-limite). Nunca há duas armadas por portal nem uma 4ª.
- **Voo:**
  - 34 m/s, alinhada à velocidade;
  - mira na posição prevista do herói no lançamento (antecipação ≤ 0,35 s e ≤ 2,6 m);
  - rumo travado depois do lançamento.
- **Colisão e dano:**
  - colisão por segmento contra a cápsula do herói e o chão, sem atravessar;
  - um acerto por espada;
  - 5 de dano base (4 após o multiplicador de chefe), com no mínimo 0,55 s entre acertos;
  - i-frames e dash respeitados.
- O ataque dura cerca de 10 s. Os portais fecham depois da 3ª espada, e o bispo espera tudo terminar antes da próxima magia.
- Não empilha com os Vórtices: um não começa enquanto o outro está ativo.

**Arte**
- **Espada:** montante 3D procedural de 1,75 m, cerca de 1,6× uma espada comum. Lâmina larga e angulosa de aço preto com seção losango, gume vermelho incandescente, 18 inscrições claras, guarda com espinhos, gemas escarlates e cabo longo com pomo.
- **Hitbox:** 0,5 m de raio, menor que o ornamento.
- **Rastro:** três fitas pelo trajeto real (manto negro recortado, carmim e núcleo quente). Somem em 0,35 s depois do impacto.
- **Impacto:**
  - núcleo lilás quase branco rente ao chão;
  - cúpula de sombra rasgada com veias violeta;
  - farpas negras radiais e estilhaços;
  - dissolução em cerca de 0,7 s;
  - tremor leve (respeita `reduceShake`);
  - no corpo do herói, a escala cai para 45% para não cobrir a câmera.
- **Custo:** cerca de 12 chamadas de desenho, tudo instanciado e em pool, sem alocação de objetos por quadro. Na qualidade baixa caem tendões, estilhaços e segmentos de rastro; a quantidade de portais e espadas e a mecânica não mudam.
- **Limpeza:** pausa (só desenha), morte, saída da dimensão, cinematografia, troca de perfil e `resetEnemyAfterDimension`.

## Testes
- **`node --test`:** 325 testes passando. Os novos estão em `vorgazhek-portal-swords.test.mjs` e cobrem:
  - 20–24 portais altos, em 3 camadas, distribuídos e dentro da arena;
  - exatamente 3 por portal (60–72), em sequência e nunca 2 armadas por portal;
  - ponta antes do corpo;
  - mira travada e antecipação limitada;
  - dificuldade (parado, correndo, dash);
  - um acerto por espada e sem empilhar;
  - impacto no chão e no herói, e colisão sem túnel;
  - limpeza e interrupção;
  - kit só com s1 e s3, sem rota secundária antiga, e outros perfis intactos.

**Simulação de dano (4 sementes)**

| Situação | Acertos em 60 espadas |
|---|---|
| Parado | 12–13 |
| Andando | 11–12 |
| Correndo em arco | 2–6 |
| Dash com i-frames | 0 |

- **Prévia isolada:** `vorgazhek-portal-preview.html?t=…&cam=wide|near|sword|impact|top`.
- **Jogo em Chromium headless (SwiftShader), `?testeDimensao=bishop2`:**
  - o selo mostra 260;
  - `kitMove('s2'|'sw'|'ult')` devolve `null`;
  - s3 abre 20–24 portais a 5,5–13 m (antes do ajuste final da altura mínima para 6 m);
  - disparos em sequência e dano aplicado;
  - "Reiniciar" limpa tudo;
  - 0 erros.
- **Evidências:** `docs/evidencias/mod260/`.

## Limitações
- Não testado em Android físico. FPS real não medido.
- Sem bloom.
- As referências foram usadas como direção de arte.
