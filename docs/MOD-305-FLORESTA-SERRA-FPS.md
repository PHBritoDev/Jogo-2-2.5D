# Mod 305 — Floresta contínua até a serra, gaiolas na mata e FPS

## Onde era o "círculo vermelho"
A captura do criador (quest "Investigue o choro de crianças", marcador a 107 m e **atrás** da câmera) foi reproduzida no
jogo: herói na trilha da serra (≈ −20, −205) olhando para o vale ao norte. O círculo vermelho é o antigo **Observatório da
Serra** (anel de 9 pedras altas, 3 luzes azuis), o abrigo com lampião e os três moradores/pastor Tomé da antiga
"Serra sem Ecos" (Ato IV anterior), mais 5 braseiros. A lógica desse evento já estava desligada (`lateDef` devolve
`null` dos passos 18–25); só os objetos continuavam no mundo antes do Ato IV. Tudo isso foi removido (objetos, luzes,
NPCs, colisores, braseiros e as cartas ocultas). O Ato IV atual (torre de Véraxion) não dependia deles.

## Gaiolas e Demônio 1
`CAGE_CLEARING` (−46, −216), em `act1-world-layout.js`: clareira plana na encosta oeste do vale, dentro da nova mata
(o "X" da captura). As duas gaiolas, as crianças, os braseiros, os três Seguidores (`JOURNEY_ENEMIES`, mesmos
deslocamentos relativos de antes), os captores do resgate, o gatilho (13 m), o marcador, o ponto do mapa e o
aplainamento do terreno acompanham a clareira. Nenhuma clareira/colisor/gatilho ficou no lugar antigo (−12, −97),
que agora é mata.

## Mata contínua
`serraForestPlan`: mesmo plano/espécies/LOD/impostor do cinturão (`planTropicalBelt` + `mountTropicalForest`),
da borda reta da mata sul (z −149) até o fim do vale (z −268), incluindo as encostas laterais visíveis além da borda
jogável (só não as muito íngremes). Ficam livres: trilhas existentes, a clareira das gaiolas, o caminho da
"pessoa misteriosa", o mirante e os bandidos do Ato IV. O lugar da torre é mata até o Ato III; ao montar o Ato IV
(`clearSerraTowerSite`) essas árvores e seus troncos saem. Sub-bosque e cipós vêm pelos mesmos módulos.

## Causa do lag e correções (medidas no mesmo ponto/câmera, paisagem 854×384, perfil Automático)
| Medida | Antes | Depois |
|---|---|---|
| Luzes pontuais calculadas em cada fragmento | 19 | 4 (fixas) |
| GPU+CPU de um quadro (SwiftShader, `gl.finish`) — mata | 5,3 ms | 1,8 ms |
| idem — vila | 4,5 ms | 2,2 ms |
| Envio de matrizes de instância ao mover a câmera | buffer inteiro | só o trecho alterado |

1. **Orçamento de luzes** (`light-budget3d.js`): o three.js percorre *todas* as luzes visíveis em cada pixel de cada
   material iluminado. Agora as fontes continuam animadas numa camada ignorada pelo renderizador e 4 luzes-slot copiam
   as mais relevantes para a câmera, com troca suave; o número de luzes do shader é constante (sem recompilar).
   `?luzesTodas=1` desliga para comparação A/B no aparelho.
2. **Upload parcial** das instâncias visíveis (`addUpdateRange`).
3. **Automático sem oscilar**: um nível que cai menos de 40 s depois de subir fica bloqueado por 150 s.
4. Os cinco modos continuam (Baixo/Médio/Alto/Máximo/Automático); nenhuma textura, resolução ou espécie foi reduzida.

Medições em navegador sem GPU servem para comparar antes/depois; o FPS real precisa ser confirmado no Samsung A55.
Evidências: `docs/evidencias/mod305/`. Testes: `tests/forest-fps305.test.mjs`, `graphics-adaptive.test.mjs`.
