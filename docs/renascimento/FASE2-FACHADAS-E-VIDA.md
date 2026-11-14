# Renascimento de Eldória — Fase 2: fachadas e sinais de vida

Direção dos diretores no #512 (13/11). Branch `claude/eldoria-renascimento-fase2-fachadas`, empilhada sobre
#512 → #511 → #510. **Sem merge sem aceite.** Capturas do runtime (SwiftShader). O "antes" é `?fachadas=0`. Não é
medição de Android.

## 1. Auditoria (portas, paredes e clipes)

- **`tools/visual-lab/facade-audit.html`.** Normaliza cada GLB como o jogo (maior medida = 1, centro da caixa, base
  no chão), lança raios nas 4 faces e lê a textura assada.
  - **CasaEldoria01:** porta na face −X. Bate com `ELDORIA_DOOR_LOCAL`.
  - **CasaEldoria02:** porta em arco no centro da face +Z. Confirmado em captura.
  - **FerreiroEldoria:** forja aberta em −X.
  - Os planos de parede ficam em `FACADE_AUDIT`, em `eldoria-city-facades.js`.
- **Clipes dos NPCs** (lidos dos GLBs):
  - homem: `Running`, `Walking`, `Alert`, `Arise`, `Regular_Jump`, `Triple_Combo_Attack`, `Wave_One_Hand`,
    `falling_down` e `victory`;
  - mulher: `Running`, `Walking`, `SideLying_Reach_Help` e `Wave_One_Hand`.
  - Não há clipe de varrer nem de carregar.

## 2. O que entrou

- **Jardineiras de tábuas** ao lado das portas das casas A4, B1, B2, B3 e C1. Têm ervas e poucas flores; algumas
  estão mais vazias que outras. Ficam fora do vão e da faixa de acesso.
- **Pilhas de lenha** nas laterais de B1, C1 e W2, com o corte à vista e um cepo de rachar. A pilha é obstáculo.
- **Varais** da quina da casa até um poste no quintal (B1 e W2). As roupas estão desbotadas e uma tem remendo, e
  balançam no vertex shader. Os postes são obstáculos.
- **Carregador de mantimentos.** Usa o clipe verificado `Walking` e vai do largo da ponte até a mesa de ração, pela
  Rua da Entrada:
  - leva um saco no ombro na ida e volta sem ele;
  - para quando o herói está à frente e não é obstáculo, então nunca trava a rua.
- **Rollback:** `?fachadas=0`.

## 3. Bloqueios (não improvisados)

| Ação pedida | Situação |
|---|---|
| Varrer | Nenhum clipe de varrer no rig |
| Guarda do tributo | Testado com o morador comum na pose `Alert`, ao lado do edital, e removido: sem traje nem arma de guarda, ele lia como um morador parado. Falta um modelo de guarda |

## 4. QA

| Teste | Resultado |
|---|---|
| `tests/renascimento-f2-fachadas.test.mjs` | 4/4. Cobre: auditoria × layout; nada no vão nem na frente das portas; nada na rua; determinismo; clipes reais; rota cheia/vazia termina na mesa; integração e rollback |
| Suíte completa | Só falham os 2 testes que já falham na `main` (`Mod 262`, `Mod 278`) |
| QA jogável (CI `renascimento-f1-qa`) | Novos casos `porta-casa-A4` e `porta-casa-B3`: aproximação até a soleira |

Navegação local (viewport mobile 852×393):
- A4, B3, C1 e W2 alcançam a soleira.
- B1 e B2 já eram limitados antes desta etapa (resultado idêntico com `?fachadas=0`):
  - em B1, um obstáculo antigo fica a 3,5 m da porta;
  - em B2, a moradora passa pela frente da porta.

## 5. Custo (SwiftShader, 852×393)

| Local | draw calls antes → depois | triângulos |
|---|---|---|
| Praça | 110 → 114 | 431 k → 449 k (inclui o carregador) |
| Casa de Lia | 152 → 156 | 570 k → 588 k |
| Quintal | 142 → 144 | 546 k → 549 k |

Os detalhes ocupam 2 malhas novas. O carregador é um NPC Meshy a mais.

## 6. Evidências

`docs/renascimento/evidencias/f2-fachadas/`: 8 ângulos × 2 condições (15 h e 18:12), antes|depois.
