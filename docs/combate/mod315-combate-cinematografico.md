# Mod 315: combate cinematográfico (espada inicial e Demônio1)

Este é o registro técnico da missão `docs/missoes/CLAUDE-COMBATE-CINEMATOGRAFICO-PROTA-ENEMY1.md`. As evidências ficam no CI: o workflow **Combate cinematográfico (Mod 315)**, job `evidence`, guarda o vídeo, as capturas e o `resultado.json` como artifact.

## Auditoria (antes de editar)
- **Caminho real do herói:** `mundo-3d-prototype.js` chama `SwordRites` (`sword-rites3d.js`), que recebe o repertório de `prota-combat3d.js`. A pose real vem de `api.pose`, com as pontas da lâmina tiradas do `EspadaProta.glb`.
- **Caminho real do Demônio1:** o mundo usa `enemy1-squad-runtime3d.js` sobre `enemy1-squad3d.js` (a IA por utilidade). `experiments/aerial-combat/controller.js` é um protótipo isolado. Não há outro cérebro: tudo foi integrado na IA existente.
- **Dash:** havia dois caminhos divergentes. O jogo usava `PROTA_DASH.cooldown=.48` e o protótipo, `MOBILITY.dashCooldown=.400`. Agora o jogo tem um valor único de **0,50 s contado desde a ativação** (`combat-mobility3d.js`), e `PROTA_DASH.cooldown` aponta para ele. O protótipo continua isolado.
- **Clipes reais do Demonio1.glb:** foram medidos com `SevenSinsDebug3D.enemyClipProbe` (velocidade de mãos e pés, 20 amostras/s). Os picos definem as janelas de dano:
  - `Left_Hook_from_Guard`: mão esquerda a 13 m/s aos 0,33 s.
  - `Weapon_Combo_2`: mão direita a 9,6 m/s aos 2,00 s e 7,4 m/s aos 3,00 s. O Demônio1 não tem arma, então esse trecho vira rasgo de garra.
  - `Roundhouse_Kick`: braços girando entre 0,95 e 1,05 s.
  - `Sweep_Kick`: as duas mãos a 11–12 m/s aos 0,92 s; o quadril desce até 0,48 m.
  - `Run_Jump_and_Roll`: impulso entre 0,9 e 1,2 s.
  - Os clipes de golpe são aplicados **no lugar** (sem deslocar o quadril), e o avanço vem da IA. Isso evita que os pés patinem.

## O que mudou
| Tema | Implementação |
|---|---|
| Resolução de dano | `combat-defense3d.js`. A ordem é: i-frames → escudo → corpo. Golpe, espada, arco de energia, projétil e magia passam por `damagePlayerFromEnemyAttack` (herói) e `damageActor` (Demônio1). |
| Escudo hexagonal | `EnergyShield` + `shield-vfx3d.js` (poliedro de Goldberg, ~3,8 mil triângulos compartilhados, 2 passadas). Regras: **2,7 s** no máximo; **8,0 s** de recarga contados a partir do sumiço; área por tiques de 0,3 s por fonte (o mesmo total a 30 e a 144 FPS); golpe ≥ `breakAt` rompe e passa o **dano integral**; acúmulo zera a durabilidade, quebra e só o excedente passa. Fissuras progressivas, ondas nos pontos de impacto, células apagando e estilhaçamento. O escudo não imobiliza. |
| Mobilidade | `Mobility2`: dash com recarga de 0,50 s desde a ativação; **2 saltos** por sequência aérea, que só voltam no pouso real. Cair de uma borda conta como saída do chão (tolerância de 0,09 s). O dash não gasta salto. Pular durante o dash não corta o deslocamento. O teto dos interiores limita o salto duplo. |
| Dash do herói | Saída explosiva com desaceleração (a distância é a mesma, sem freada seca). O corpo sai deslizando na direção do avanço. Sem mira travada, o herói olha para onde foi. |
| Espada inicial | **Todo golpe** solta onda de energia, que é hitbox real (`combat-energy3d.js`: setor ou crescente, testados com altura, parede e linha de visão). O dano cai com a distância (100 % até 2,5 m, 60 % a partir de 7,5 m). A onda alcança os outros inimigos da esquadra uma vez por golpe. O alvo do golpe divide um único "acertou" entre a lâmina e a onda, então nunca leva dano dobrado. |
| VFX dos cortes | `slash-vfx3d.js`: o crescente é amostrado da lâmina real **só na janela ativa** (nasce na lâmina e se desfaz pela cauda), com núcleo branco, bordas prateadas e toques de ouro pálido e ciano. Inclui a onda viajante com o mesmo volume do dano, faíscas instanciadas e estrela de impacto. Os pools são fixos (6 cortes, 8 ondas, 220 faíscas, 6 estrelas) e nada é criado durante o combate. |
| Garras do Demônio1 | Três garras curvas fundidas numa malha por mão (1 draw), ancoradas no osso `*MiddleDistal`, mais uma no polegar. Não deformam o rig. Aura violeta por fresnel no material (contorno elétrico, sem mancha preta opaca). |
| Combos do Demônio1 | `demon1-combat3d.js`: gancho, rasgo duplo (com onda de garra se o primeiro errar), garra circular e varrida rasteira. A IA escolhe pela situação: pressão, giro, rasteira contra quem defende e castigo quando o alvo está se recuperando. Também faz avanço → garras → recuo → magia e esquiva → contra-ataque. |
| Salto predatório | Salto do chão → 2º salto → dash aéreo para a posição **atual** do alvo → garra descendente no pouso. Tem recarga de 6,5 s, nunca atravessa parede e não fica flutuando. |
| Escudo do Demônio1 | É o mesmo modelo de escudo com pele própria ("abismo": preto-violeta, runas e mistura normal). A IA só defende contra golpe começando perto (< 4,6 m) ou magia vindo, com pausa mínima entre tentativas. |
| HUD | Botão **ESCUDO** (toque e tecla **G**) com recarga e integridade. O **DASH** mostra a recarga. |
| Legado do Enemy1 | Saíram `Enemy1.png` (2 MiB sem uso), o retarget morto Enemy1 → herói e o import `retargetClip`. O sprite de reserva só é baixado se o `Demonio1.glb` falhar ou se o inimigo aparecer antes do GLB terminar. |

## Testes
- `tests/combat315.test.mjs`: dash 0,50 s; 2 saltos sem terceiro; dash entre e depois dos saltos; escudo 2,7 s com recarga só após sumir; ruptura com dano integral; área independente de FPS; um único dano por golpe (lâmina + onda); onda acertando sem toque; altura, costas e parede; pools sem crescer e limpos; garras do Demônio1 (sem espada, alcançam, não acertam atrás nem no alto); salto duplo e dash aéreo da IA sem atravessar parede nem abusar; escudo do Demônio1; integração do HUD e do teclado; legado removido.
- `tools/visual-lab/combat315-qa.cjs` (CI, celular 844x390 com toque): reproduz no jogo integrado a onda acertando sem toque, o dash de 0,5 s, os 2 saltos, o escudo 2,7 s + 8 s, o escudo do Demônio1, o salto duplo do Demônio1 e as garras. Exige zero erros de console/shader e zero respostas 4xx.

## Desempenho (SwiftShader, mesma cena do laboratório; não representa o FPS de um A55)
| Cena | Antes (main) | Mod 315 |
|---|---|---|
| Laboratório, parado | 263 calls · 538k tri | 269 calls · 528k tri |
| Laboratório, golpe ativo | 274 calls · 565k tri | 284 calls · 566k tri |
| Vila | 242 calls · 624k tri | 251 calls · 607k tri |

O acréscimo é de +6 a +10 draws em combate (cortes, onda, faíscas e garras). As luzes pontuais continuam em 4 slots e nenhuma luz dinâmica nova foi criada.
