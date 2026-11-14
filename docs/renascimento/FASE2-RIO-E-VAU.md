# Renascimento de Eldória — Fase 2: rio, margens e travessia (Vau das Pedras)

Diretriz: `CLAUDE-MISSAO-01-ELDORIA-2.md`, seção **DIRETRIZ EXECUTIVA — FASE 2**. Esta etapa trata **só** do rio, das
margens e da travessia. Ela parte da branch do Vale do Despertar (`claude/eldoria-renascimento-fase2`, PR #510) e
**não tem merge** sem aceite dos diretores.

> Capturas do runtime real (Chromium WebGL / SwiftShader) em posições, FOV, horários e climas fixos. O "antes" é o
> estado do PR #510. **Não é medição de Android:** nenhuma meta de FPS em aparelho foi declarada.

## 1. O que estava fraco

| Ponto | Antes | Problema |
|---|---|---|
| Margem | O gramado chegava a ~2,7 m do eixo e caía ~0,5 m na água, de uma vez | Degrau reto: o rio parecia um canal recortado |
| Leitura da água | Faixa ciano de largura constante, com a mesma cor em todo o percurso | Sem remanso, sem raso, sem leito visível |
| Peças | 9 pedras de espuma no leito; nada na margem | Sem pedra assentada, junco ou praia |
| Travessia | Só a ponte; fora dela, o herói parava (água > 1,25 m) | Nenhuma outra leitura de travessia |

## 2. O que foi construído

- **`eldoria-river-banks.js`** (lógica pura, determinística e testada em Node):
  - **Consulta do rio:** a mesma curva Catmull-Rom da fita d'água, com distância, lado, comprimento ao longo do rio e
    curvatura. A busca usa uma grade de 8 m e sai na hora fora da caixa do rio (200 mil consultas em ~17 ms no Node).
  - **Margem erodida:** de 2,6 m do eixo para fora, o terreno vira uma rampa de 1,4 a ~6 m.
    - Na curva interna, a rampa é longa e baixa e termina numa praia de cascalho a +0,07 m da lâmina.
    - No corte externo, a rampa é curta, com degrau de +0,16 m.
    - A largura varia por ruído ao longo do rio.
  - **Regras da forma:** a margem **só rebaixa terreno seco e nunca cria água nova**. A ponte (raio de 9,5 m), a
    cabeceira (pé da cachoeira) e a foz ficam intocadas.
  - **Vau das Pedras** (19, −13,2), ~19 m a leste da ponte: num trecho de ~15 m o leito sobe até ~0,5 m de lâmina,
    com ondulação de cascalho. Fora dele o canal continua fundo, e a ponte segue como passagem principal.
  - **Plano das peças:**
    - pedras na linha d'água, mais densas no corte externo;
    - blocos grandes nas curvas fortes;
    - juncos e taboas nos remansos e praias;
    - 6 pedras-degrau atravessando o vau, uma passada de ~1,05 m entre centros.
  - **`wrapTerrainForBanks`:** embrulha `height` e `waterDepth` do terreno. A lâmina é `nível − chão`, então a
    profundidade acompanha a altura nova. Isso vale para o relevo, a cor, a caminhada, `wadeMul`, o bloqueio de
    água funda e o mapa.
- **`eldoria-river-banks3d.js`** (apresentação):
  - **Pedras:** 3 variações do rochedo procedural, com musgo em cima e base molhada escurecida, em 3 `InstancedMesh`
    (as pedras-degrau entram no primeiro). Cada uma tem colisor de domo da Fase 1: as degrau ficam com o topo a
    0,16 m acima da lâmina e são pisáveis.
  - **Juncos e taboas:** tufos de lâminas com pendões, em 2 `InstancedMesh`, com vento e corte por distância.
  - **Chão das margens:** lama molhada na linha d'água e cascalho claro nas praias e no vau, pintados na cor de
    vértice do próprio terreno. É uma passada na carga, sem textura nem malha nova.
  - **Blocos grandes:** entram no **mesmo** `InstancedMesh` dos afloramentos do vale (`RochedoMusgoEldoria-lod1`),
    sem draw call nova.
- **Água (`eldoria-water.js`):** novo uniform `uFord`, um intervalo ao longo do rio. No vau, a água fica cor de
  cascalho molhado, mais translúcida, com corredeira fina. Fora do vau e no lago, nada muda.
- **Caminho do Vau:** registrado em `FOREST_TRAILS`, com chão pintado e a mata desviando. Desce da planície norte
  até o vau e segue para o sul.
- **Aviso de água funda:** quando o vau está ativo, diz "atravesse pela ponte ou pelo vau, a leste".
- **Rollback:** `?rio=0` volta ao canal antigo (sem margem, vau, peças nem trilha pintada no relevo).

## 3. Proteções

- **Mantidos:** combate, dimensões, HUD, save, narrativa, NPCs, rota da carroça, ponte (o tabuleiro e as
  cabeceiras não mudam de altura), cachoeira e lago.
- **Contrato `water-wade`:** `PLAYER_WADE_MAX` continua 1,25. O teste do lago não é afetado, porque o rio está fora
  da área dele.
- **Sem custo extra para o herói fora do rio:** fora da caixa do rio (±12 m), a consulta sai antes de qualquer
  cálculo.
- **`build-info.js` não foi alterado.**

## 4. Testes e QA

| Teste | Resultado |
|---|---|
| `tests/renascimento-f2-rio.test.mjs` | 6/6. Cobre: nunca cria água; ponte, cabeceira e foz intocadas; vau raso e o resto do canal fundo; passada das pedras-degrau; peças fora do vão da ponte; determinismo; mobile com menos peças; `waterDepth` coerente; contrato de integração; trilha; rollback |
| Suíte completa (`tests/*.test.mjs` + `*.test.mjs`) | 563 passam. Só falham os 2 testes que já falham na `main` (`Mod 262`, `Mod 278`) |
| QA jogável (`renascimento-f1-qa.cjs`, CI `renascimento-f1-qa`) | Novos casos: `vau-travessia` (atravessa a pé, sem cair), `vau-pedras-degrau` (no meio do rio os pés ficam acima da lâmina) e `margem-rampa` (desce o barranco). `ponte` e `rio-fora-da-ponte` continuam passando. Nova captura: `vau` |

Navegação medida localmente (`navWalk`, 60 Hz):

| Caso | Resultado |
|---|---|
| Vau, de (19,2, −6) a (19,2, −21) | Atravessou inteiro, sem queda nem trava |
| Sobre as pedras-degrau | Pés entre −0,35 e −0,5 durante toda a travessia (lâmina a −0,5) |
| Fora do vau (x = 30) | Para no raso, antes do canal fundo (como antes) |
| Ponte | Progresso 1,0 |

## 5. Custo (mesmo enquadramento, 15 h, céu limpo, paisagem mobile 852×393, SwiftShader)

| Local | draw calls antes → depois | triângulos antes → depois | geometrias |
|---|---|---|---|
| Vau (19,2, −6) | 155 → 157 | 697 k → 682 k | 222 → 231 |
| Margem leste (34, −5) | 122 → 128 | 579 k → 579 k | 222 → 231 |
| Ponte (−0,4, −3,5) | 178 → 186 | 655 k → 701 k | 222 → 231 |
| Margem oeste (−24, −7) | 189 → 194 | 668 k → 670 k | 222 → 231 |

O heap JS ficou estável (≈ 143 MB nos dois casos). As pedras usam o icosaedro de detalhe 2 (1 no mobile), e as
peças pequenas são cortadas por distância (46–85 m). O tempo de quadro no SwiftShader não representa Android e não
é declarado aqui.

## 6. Evidências

`docs/renascimento/evidencias/f2-rio/`. São 10 ângulos fixos × 5 condições (15 h limpo, 6:24 com neblina, 18:12 com
nuvens, 22:30 noite, 16 h tempestade), em folhas comparativas antes|depois (`comparativo-*.jpg`) e quadros de 15 h em 960×540 (`antes-15h-*`, `depois-15h-*`).

## 7. Próximo passo sugerido (não feito)

- Correnteza audível perto da margem, pelo motor procedural existente (`audio3d.js`).
- Respingo nos passos dentro do vau: o pool de ondulações já existe e só falta o gatilho.
