# Auditoria A-005 — espacialização da cachoeira de Eldória (13/11/2026)

## Evidências verificadas (código da main)
- `eldoria-waterfall3d.js`: `WATERFALL.points` possui 9 pontos, da nascente até a base. `distanceTo(x,z)` devolve o mínimo da distância euclidiana **aos vértices**, não aos segmentos da linha da água.
- `tests/mod316-eldoria.test.mjs` já valida o contrato de chamada `fallsDistance:eldoriaFalls.distanceTo(x,z)` no mundo.
- `audio3d.js`: `falls = pow(max(0, 1 - fallsDistance/44), 1.6)`; duas camadas de ruído contínuo `falls` e `fallsHi` usam esse ganho com suavização de 0,4 s e 0,3 s. É atenuação **por distância**, não HRTF/panning estéreo 3D confirmado.
- O trecho de água tem espaçamento entre vértices de aproximadamente 1,5 a 3,5 unidades. O cálculo atual pode superestimar a distância à fita entre vértices, sobretudo nos trechos longos, e criar pequenas depressões de ganho enquanto o jogador segue a margem. **Hipótese de artefato auditivo, não comprovada por escuta.**

## Direção proposta (sem alterar o mundo nesta rodada)
- Calcular a distância horizontal ao segmento mais próximo, usando projeção limitada `t=clamp(dot(P-A,B-A)/|B-A|²,0,1)`, em vez de somente aos vértices.
- Preservar raio de 44, expoente 1,6, níveis de ganho, curvas de fade e custos: 8 segmentos por avaliação, sem nós de áudio ou arquivos adicionais.
- Antes de integrar: medir distâncias em três posições (sobre o segmento, perto do vértice, fora da cachoeira); verificar continuidade numérica, queda monotônica ao afastar e ausência de `NaN`; depois ouvir deslocamento em movimento e medir custo mobile.
- **Não aplicar** a correção sem coordenar com Claude/arte ambiental: `eldoria-waterfall3d.js` é módulo de cenário e `mundo-3d-prototype.js` é compartilhado.

## Coordenação
- PRs ativos examinados: áudio #490, #492, #495 e #496; VFX #487, #493, #494 e #497; arte #489; iluminação #488; combate #486; Eldória/Claude #473. Nenhum deles foi mesclado nesta rodada.
- Arquivo desta rodada exclusivamente documental, isolado de `audio3d.js` e dos módulos de gameplay e cenário.
- Sem bibliotecas, sons externos ou licenças novas. Sem testes auditivos, benchmark Android ou execução do jogo nesta rodada.
- Próxima tarefa: confirmar com testes numéricos e gravação auditiva se o desnível de ganho é perceptível antes de propor correção em código.
