# Combate cinematográfico + carregamento (19/11/2026)

Briefing: `docs/missoes/CLAUDE-COMBATE-CINEMATICO-E-CARREGAMENTO.md`. Material analisado: dois vídeos de referência
(duelo com câmera às costas e inimigo no centro; combate rápido com investidas e rastros longos) e a captura do erro
"Falha ao montar o mundo 3D (Mod 186) / Failed to fetch dynamically imported module: blob:…". O vídeo
`COMBATE_ATUAL_VHAZRAEL.mp4` não veio no anexo; o "antes" foi gravado aqui, a partir da `main`.

## P0 — carregamento
- **Causa reproduzida.** O mundo roda a partir de um `blob:` e importa cerca de 200 módulos locais mais o three do CDN.
  Basta UMA requisição falhar (rede móvel, CDN) para o import nativo abortar com a mensagem genérica do blob. Como o
  navegador guarda essa falha, reimportar na mesma página também não resolve. Teste: abortar só a 1ª requisição de
  `fauna3d.js` reproduz na `main` exatamente a tela do celular.
- **Correção (`module-warm.js` + `mod181-loader.js`).** Antes do import, o grafo é baixado por `fetch` controlado:
  no máximo 6 requisições simultâneas, até 3 tentativas por arquivo (as repetições ignoram o cache) e o import encontra
  tudo no cache HTTP. Um 404 não é repetido. Uma falha persistente mostra o arquivo real com o status e um botão
  **Tentar de novo**. Não há retry infinito.
- **Resultado.** Com a mesma falha de rede, o jogo abre. Um arquivo ausente mostra
  `/fauna3d.js?v=… (HTTP 404)` em vez do blob. Entrada a frio sem falha: 7,9 s contra 9,4 s na `main`, no mesmo
  ambiente (SwiftShader).

## Inventário de clipes usados no runtime
| Modelo | Clipes | Situação |
|---|---|---|
| `Prota_otimizado_2K.glb` | 19: Running, Walking, Combat_Stance, Jump_Over_Obstacle_2, Quick_Step_and_Spin_Dodge, Weapon_Combo, Triple_Combo_Attack, Weapon_Combo_1, Weapon_Combo_2, _360_Power_Spin_Jump, Skill_03, Dead, 2 idles/reação, **slide_right**, Roll_Dodge_1, Run_Jump_and_Roll, Walk_Backward, Walk_Forward_with_Bow_Aimed | `slide_right` (antes sem uso) agora é o dash. Os de arco e o rolamento longo ficam de fora (incompatíveis com espada/dash curto). |
| `VHAZRAEL.glb` | 16 (Attack, Double/Triple_Combo_Attack, Weapon_Combo, Axe_Spin_Attack, Skill_01, Basic_Jump, Running/Walking…) | Já usados pela coreografia do chefe. |
| `Bispo2/3/4.glb` | 6 cada (Sword Heavy/Light/Regular/Aerial Combo, Hit, Walk, idle) | Já usados. |

Dash (quadril medido): no `slide_right` o quadril desce de 0,9 m para 0,4 m e avança de 0,06 a 0,55 s. De 1,15 a
1,65 s volta a 0,9 m e o tronco desgira de ~50° para ~5°.

## Contato da espada — causa real da espada que "erra o inimigo à frente"
Nos chefes do esquadrão (VHAZRAEL, Enemy1–4) o `SwordRites` passava o alvo de cerco, com id igual à época do cerco,
enquanto o golpe travava o id do ator (`e1`). Os ids nunca batiam, então `protaDrive` não validava o alvo e a
aproximação curta (motion warping) **nunca rodava**: o golpe só acertava colado. Agora o alvo travado é resolvido pelo
id entre os candidatos.

Medição com a IA do chefe parada, herói a 1,4–3,8 m e ângulos de 0° a ±69°, 3 golpes por posição
(`SevenSinsDebug3D.squadPause`):

| | `main` | PR |
|---|---|---|
| VHAZRAEL — golpes que acertam | 33 % (1º golpe 0/20) | **100 % (20/20)** |
| Bispo 2 (caminho de inimigo único) | 92 % | 92 % (não muda; o "erro" é o chefe morrendo no meio do teste) |
| Inimigo único (Seguidor), 30 posições × 3 | 100 % | 100 % |

## Dash (o MESMO: botão, recarga 0,5 s, i-frames 0,30 s, fumaça)
- **Visível:** em vez de sumir, o corpo desliza baixo com o `slide_right`, deixando silhuetas escuras no caminho
  (pool já existente). Na chegada levanta com o fim do mesmo clipe, sem a pose de salto de antes. Em 1ª pessoa nada
  muda, e o rig antigo continua com o dash invisível.
- **Aproximação:** com um inimigo à frente (cone de 40°, até 9 m e linha de visão), o dash vai até ele e para na
  distância de golpe (raio + 1,5 m). De lado, para trás ou sem alvo, faz os 5,4 m livres de sempre. Se o inimigo já
  estiver dentro do alcance (sem pelo menos 0,8 m livres até a parada), não há aproximação: o dash segue livre na
  direção pedida e nunca é puxado para o alvo (revisão A2).
- **Distância exata em qualquer FPS:** o trecho de cada quadro integra a curva de velocidade. Antes, a velocidade do
  início do quadro valia pelo quadro inteiro, e a 30 FPS o dash andava 6,1 m em vez de 5,4 m. O de aproximação também
  passava da parada. No jogo, com o VHAZRAEL parado: alvos a 3,2/4,5/7 m terminam a 1,91 m do centro (parada em
  2,05 m mais ~0,14 m de deslize do embalo); a 1,4–2,6 m, dash livre de 5,4 m (+0,14 m).
- **Dash + golpe:** golpe durante ou até 0,26 s depois do dash = Corte do retorno (já existia).
- **Esquiva perfeita → contra-ataque:** um golpe absorvido pelos i-frames do dash mostra ESQUIVA PERFEITA e abre
  0,8 s. O próximo golpe vira CONTRA-ATAQUE com dano ×1,5: com o alvo a mais de 2,6 m sai a Estocada em corrida,
  senão o Corte do retorno. Testado contra o VHAZRAEL: a esquiva dispara e a janela abre.

## Lock-on opcional e câmera
- No celular não há botão novo: **tocar no inimigo** trava, e tocar de novo no mesmo inimigo solta. Arrastar continua
  girando a câmera, e o toque é medido pelo horário do evento (funciona com FPS baixo).
- No PC: **R** ou **botão do meio** trava/solta; Q/Tab troca o alvo.
- Travada, a câmera gira para olhar o inimigo por trás do herói e enquadra os dois: o foco vai ~35 % para o alvo (no
  máximo 4 m) e a distância cresce até +3,2 m conforme a separação. O herói nunca sai do quadro.

## Lutas gravadas (bot com entradas reais, 16 s de jogo, passo de 1/30 s)
Vídeos em `docs/combate/evidencias/combate-cinematico/` (antes à esquerda, depois à direita). O bot só usa
`combatAction('attack'|'dash')`: se aproxima com o dash, ataca no alcance e usa o dash para esquivar quando o chefe
golpeia. O lock-on (R) só existe na PR. "Quadros com dano" conta os quadros em que o HP do chefe caiu.

| | VHAZRAEL main | VHAZRAEL PR | VORGAZHEK main | VORGAZHEK PR |
|---|---|---|---|---|
| golpes pedidos no alcance | 4 | 24 | 21 | 17 |
| quadros com dano | 0 | 2 | 20 | 33 |
| 1º acerto | nunca | 6,1 s | 1,27 s | **0,63 s** |
| esquivas perfeitas (quadros) | — | 27 | — | 0 |
| dano recebido pelo herói | 10 | 43 | 0 | 0 |
| fim | luta aberta | luta aberta | chefe cai em 14,7 s | chefe cai em 13,7 s |

Na `main` o dash não leva o herói até o VHAZRAEL e o golpe de longe não alcança. Na PR o herói chega, ataca e esquiva.
O VHAZRAEL ativo bloqueia e se esquiva da sequência repetida (IA anti-spam da Mod 316): os acertos limpos medidos com
a IA parada sobem de 33 % para 100 %.

### Duelo contínuo de 32 s contra o VHAZRAEL
Vídeo: `docs/combate/evidencias/combate-cinematico/vhazrael-duelo-32s-antes-depois.mp4`. Mesmo bot, 960 passos de
1/30 s, um quadro a cada 2 passos. Na PR: 52 golpes no alcance, 26 quadros com dano no chefe, 1º acerto aos 6,2 s,
28 dashes e 166 de dano recebido pelo herói (o bot não tem defesa além do dash). A gravação da `main` parou aos
31 s (465 quadros), por queda do processo do navegador headless, sem métricas finais. Nos quadros gravados, o golpe
da `main` não alcança o chefe, enquanto na PR o herói fica colado e os acertos aparecem (DEFENDEU/dano).

## Provas e limites
- Testes: `tests/carregamento-modulos.test.mjs` e `tests/combate-cinematico.test.mjs`. Suíte completa: falham as
  mesmas 9 da `main`.
- As gravações de luta (antes/depois, VHAZRAEL e Bispo 2) usam um bot com entradas reais (`combatAction`) em passo
  fixo de 1/30 s, porque o SwiftShader roda a 2–5 FPS. Não representam o FPS do celular. **Não testado em Android
  físico.**
