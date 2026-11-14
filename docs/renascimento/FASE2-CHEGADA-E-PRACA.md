# Renascimento de Eldória — Fase 2: chegada e praça da cidade

Diretriz: `CLAUDE-MISSAO-01-ELDORIA-2.md`, Fase 2, item **Cidade**. A direção dos diretores no PR #511 (13/11) pede
a chegada e a praça como etapa isolada. Branch: `claude/eldoria-renascimento-fase2-cidade`, empilhada sobre o rio
(#511), que está sobre o vale (#510). **Sem merge sem aceite dos diretores.**

> Capturas do runtime real (Chromium WebGL / SwiftShader), em ângulos, horários e climas fixos. O "antes" é o mesmo
> build com `?praca=0`. **Não é medição de Android:** nenhum FPS de aparelho foi declarado.

## 1. O que estava fraco

| Ponto | Antes |
|---|---|
| Chão | A cidade inteira estava na altura 0, com trilhas de terra largas cruzando o gramado. A "praça" era só o cruzamento delas |
| Composição | Vista do alto, as casas pareciam pontos soltos. Nada marcava o centro, a borda ou a chegada |
| Níveis | Nenhum degrau, terraço ou escada no núcleo, só a casa da árvore |
| Carência | Quase não se lia: bancas e fonte seca existiam, mas sem gente nem recurso contando a falta |

As casas (GLBs autorais em enxaimel), a fonte seca, o poço, as bancas e as árvores ancestrais já eram bonitas e
**foram mantidas**: a pobreza não vem de prédio feio.

## 2. O que foi construído

- **`eldoria-city-plaza.js`** (puro, testado em Node). Define o desenho:
  - contorno orgânico da praça em volta do poço, que abraça a fonte seca e uma banca;
  - 5 aberturas no meio-fio onde chegam as ruas;
  - a Rua da Entrada;
  - o Adro da Árvore;
  - os adereços, cada um com função.
- **`eldoria-city-plaza3d.js`**:
  - **Praça calçada:** lajes em fiadas desencontradas, de pedra clara e quente, com juntas escuras e manchas de uso
    (textura de canvas). A borda e o entorno do poço são mais gastos. O meio-fio é feito de blocos, com junta e
    tom alternados.
  - **Rua da Entrada:** paralelepípedos arredondados (textura de canvas), com sarjeta e guia, do largo da Clareira do
    Tronco até a boca da praça. A rua termina no meio-fio aberto e não invade as lajes.
  - **Adro da Árvore:** terraço de pedra com 0,6 m de altura, ao norte da praça, a caminho da árvore colossal. O
    pódio é feito em fiadas e tem cimalha.
    - **Acessos:** escadaria larga de 4 degraus vinda da praça e escada estreita para a rua norte.
    - **Bordas:** parapeito baixo dos lados.
    - **Mobiliário:** bancos de pedra de frente para a praça e canteiros nos cantos.
  - **Pobreza contada pelos recursos:**
    - fila de 5 baldes vazios (um tombado) saindo da fonte seca;
    - mesa de ração do conselho com só 2 sacos, caixotes vazios e o livro de contas;
    - edital do tributo, com selo vermelho, pregado no quadro da boca da rua;
    - canteiros com mudas secas;
    - lampiões que **só acendem à noite** (contrato `torchSets`), porque o óleo é caro.
  - **Uma ação de morador:** a moradora que anda pela praça leva um balde vazio.
- **Caminhável e colisão:**
  - O adro entra no `eldoria-walkable` como piso, escadarias (rampa contínua sob os degraus visuais, com espelho de
    15 cm), pódio que não se atravessa pela lateral e parapeito que não deixa cair.
  - Mesa, quadro e lampiões são obstáculos.
  - Baldes, caixotes e sacos são baixos e não bloqueiam a passagem.
- **Rollback:** `?praca=0`.

## 3. Proteções

- **Nada mudou de coordenada:** casas, bancas, vendedores, moradores, poço, fonte, tochas, banco antigo, abrigo da
  vila, gatilhos, lojas e save.
- **Terreno intocado.** A cidade continua na altura de antes, e tudo o que já estava no chão segue no chão. O nível
  novo vem do adro, que é uma superfície caminhável própria.
- **Áreas que o adro respeita:** passeio da moradora (folga de 0,3 m), bancas, casas e o NPC deitado da praça.
- **Sem alteração:** narrativa, HUD, combate, dimensões e `build-info.js`.

## 4. Testes e QA

| Teste | Resultado |
|---|---|
| `tests/renascimento-f2-cidade.test.mjs` | 5/5. Cobre: praça abraça poço/fonte/banca e deixa as casas fora; meio-fio aberto onde a rua chega; adro longe de casas/bancas/passeio; escadas confortáveis; caminhável (sobe pela escadaria, piso a 0,6 m, lateral bloqueada no chão, parapeito no alto); adereços determinísticos e fora da rua; integração e rollback |
| Suíte completa | 568 passam. Só falham os 2 testes que já falham na `main` (`Mod 262`, `Mod 278`) |
| QA jogável (`renascimento-f1-qa`, CI) | Novos casos: `adro-atravessa`, `adro-volta`, `adro-lateral` e `rua-entrada`. Nova captura: `adro` |

Navegação medida localmente (`navWalk`, viewport mobile 852×393):

| Caso | Resultado |
|---|---|
| Praça → escadaria → adro (0,6 m) → escada norte → rua | Atravessa nos dois sentidos, sem queda nem trava |
| Andando contra a lateral do pódio, no chão | Para em x = −16,0 (a borda fica em −15,8), sem penetração |
| Sobre o adro, contra o parapeito | Para na borda, sem cair |
| Rua da Entrada até a praça | Completa |
| Atravessar a praça de oeste a leste | Completa |
| Degraus do abrigo | Continuam funcionando |

## 5. Custo (mesmo enquadramento, 15 h, céu limpo, paisagem mobile 852×393, SwiftShader)

| Local | draw calls antes → depois | triângulos antes → depois |
|---|---|---|
| Chegada (−1, −29) | 88 → 89 | 358,1 k → 358,2 k |
| Praça (−12, −38) | 106 → 110 | 428 k → 431 k |
| Adro (−12,8, −47) | 125 → 129 | 515 k → 519 k |
| Praça oeste (−21, −43) | 174 → 182 | 675 k → 678 k |

São 4 malhas novas (lajes, pedra/adereços, rua, vidro dos lampiões), com cerca de 3 mil triângulos e 2 texturas de
canvas (512 e 256 px; metade no mobile). O heap ficou estável (≈ 143 MB).

## 6. Evidências

`docs/renascimento/evidencias/f2-cidade/`: 8 ângulos fixos (ponte, largo, rua, praça, praça reversa, rua oeste, aéreo
da chegada, aéreo da praça) × 5 condições, em folhas comparativas antes|depois.

## 7. Próximo passo sugerido (não feito)

- **Mais ações de moradores**, com os ciclos de animação que existirem no rig Meshy:
  - varrer o adro;
  - carregar sacos para a mesa de ração;
  - guarda do tributo na boca da rua.
- **Fachadas:** jardineiras e roupas no varal entre as casas da praça. Exige auditoria das portas de cada GLB.
