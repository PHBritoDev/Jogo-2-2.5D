# Mod 218 — VHAZRAEL e polimento para os jogadores

**Fonte:** confirmação do autor: o Primeiro Bispo se chama **VHAZRAEL — O Ceifador dos Condenados**. Pedido: continuar as pendências da Mod 217, pensando no lançamento na Play Store.

| Item | O que mudou |
|---|---|
| Nome do Primeiro Bispo | "VHAZRAEL" virou **VHAZRAEL** em todos os textos visíveis: falas, cartão VS, bestiário, conquistas, mapa, HUD e final.<br>• Epíteto: *O Ceifador dos Condenados*.<br>• Dimensão: *A Câmara dos Condenados*.<br>• Fúria na metade da vida: "FÚRIA DO CEIFADOR".<br>• Os identificadores internos (`vhazrael`, `bishop1`) não mudaram, para manter os saves. |
| Figurantes | `dressTownsfolk`: cada morador tem porte próprio (altura e largura), cor da paleta e acessórios presos aos ossos (capa curta, faixa, cachecol, bolsa).<br>• Os bandidos usam lenço vermelho e faixa; o líder, que é quem fala, tem chapéu de aba e é mais corpulento. |
| Cinzária viva | `CITY_ROUTES`: moradores andam pela rua principal, pela rua de trás e pela praça, param para conversar e dão passagem ao herói.<br>• Somem quando a cidade cai. |
| Asas do Anjo | Cada asa tem um osso próprio (`AsaEsq`/`AsaDir`).<br>• No jogo, as asas respiram devagar, batem mais quando o Anjo anda e tremulam com o vento. |

## Evidência

- **CONFIRMADO POR CÓDIGO:** `node --test` passando.
- **TESTADO EM NAVEGADOR:** cartão VS e luta de VHAZRAEL (nome, epíteto, falas); cidade com moradores e emboscada no beco; Anjo no Ato I sem erros de página.
- **Android: NÃO TESTADO.**

## Pendências

- O cabelo do Anjo continua em mechas rígidas.
- Revisão de câmera e roteiro em todas as cenas que não foram citadas.
