# Galáxia 1 — Marco 0: auditoria, mapa de dependências e marcos

Fonte da verdade narrativa: [`GALAXIA-1-ROTEIRO-INTEGRAL-E-DIRECAO.pdf`](GALAXIA-1-ROTEIRO-INTEGRAL-E-DIRECAO.pdf), guardado no repositório sem alterações. O documento tem 21 páginas: a direção criativa e o roteiro original do autor, com 15 páginas.
Este arquivo **não substitui** o roteiro. Ele só organiza a execução, um marco por vez, cada um num branch e PR próprio, sem merge automático.

Legenda de evidência: **CONFIRMADO POR CÓDIGO** · **TESTADO EM NAVEGADOR** (Chromium/SwiftShader no servidor) · **TESTADO EM ANDROID** · **SUSPEITA** · **NÃO TESTADO**.

## 1. Backup

- Branch `backup/mod202-antes-do-roteiro-integral` criado a partir do `main` (commit 39a3a51, Mod 202 já mesclado).
- O GitHub recusou o envio de tag pelo proxy, então o backup ficou em forma de branch. Para restaurar, basta abrir um PR desse branch.
- Nenhum GLB original foi alterado ou removido. As versões leves (`*-lod*.glb`, `*-ui.webp`) são arquivos novos ao lado dos originais.

## 2. Estado atual (auditoria)

| Item | Situação | Evidência |
|---|---|---|
| Nomes dos Bispos | 1 = **VHAZRAEL**, 2 = **VORGAZHEK**, 3 = **ZAR'KHAEL**, 4 = **VÉRAXION** (`dimensions3d.js`, `progression3d.js`, `acts34-flow.js`). KHRAVAZOTH não existe mais | CONFIRMADO POR CÓDIGO |
| Mundo | Só 3D (Three.js 0.160). O mundo 2D foi removido no Mod 202 | CONFIRMADO POR CÓDIGO |
| Dimensão de VHAZRAEL | Portal → cartão VS → arena → vitória (etapa 8, volta ao portal). Queda gasta coração; sem corações, volta ao portal | TESTADO EM NAVEGADOR (25/10). Android: NÃO TESTADO |
| Dimensões 2–4 e Ganância | Portal → VS → luta → etapas 14/20/26; arena do Pecado ok | TESTADO EM NAVEGADOR |
| Testes unitários | `node --test`: 59/59 | TESTADO |
| Desempenho | ~1,5 M → ~0,4 M triângulos por quadro; shaders pré-compilados | TESTADO EM NAVEGADOR (contagem). FPS em Android: NÃO TESTADO |
| Bug de escala do AnjoGuia | Há protocolo em `PROTOCOLO-BUG-ESCALA-GLB-PROTAGONISTA.md`; sem regressão nas capturas atuais | SUSPEITA (sem teste dedicado) |
| Nome do jogador | `playerName` é usado nas falas; não há "Paulo" fixo | CONFIRMADO POR CÓDIGO |

### Comparação roteiro original × jogo atual

| Parte do roteiro | Hoje no jogo | Distância |
|---|---|---|
| Prólogo: vídeo do céu, trono de Deus, asas e aura retiradas; tela dos 7 planetas; despertar olhando as mãos; nome; apresentação do Anjo | Sobrevoo de 14 s com 3 frases, tela de galáxias, despertar e nome | Faltam o céu/trono, a perda das asas e o "olhar as mãos" |
| Ato 1: vila grande; vendedor com suborno animado; floresta à noite; Enemy1 (1, depois 2); chave; crianças que viram Enemy1; desmaio e manhã; esgotos; caverna (5 Enemy1 comendo); queda; jaula com 10; dois caminhos; mini-chefe no portal; VHAZRAEL | Vila pequena, suborno de 5 moedas, 3 captores, gaiolas (crianças libertadas sem transformação), 2 sentinelas, guarda (mini-chefe), portal, VHAZRAEL | **Grande**: faltam transformação, desmaio, esgoto, caverna, queda, jaula, dois caminhos e vila maior |
| Ato 2: cidade no vulcão; bandidos; duelo com NPC misterioso (Sandra); 2 Enemy2 na entrada; purificação dos corpos; laboratório; chave; sala do ouro; 5 Enemy2; mini-chefe no trono; VORGAZHEK; erupção; ataque do Bispo 4 (buraco negro); Anjo some | "Distrito da Ferrugem" com chuva, família Arruda, 3 livros-caixa, selo, VORGAZHEK | **Total**: o ato precisa ser refeito; aproveitar motor de etapas, rigs e dimensão 2 |
| Ato 3: cidade nevada; casaco (buff/debuff); lago congelado; pousada armadilha; porão; Enemy3; cidade em chamas; guilhotina; Anjo resgata; caverna de gelo; dimensão distorcida (controles invertidos); mini-chefe; ZAR'KHAEL; revelação de identidade; Anjo 5%; Ganância fase 1 leva o Anjo | "Vale do Altar" com névoa, zelotes, ídolos, ZAR'KHAEL | **Total** |
| Ato 4: Sandra volta; torre de 7 andares (pergaminho +20%, sala de descanso, mini-chefes); revelação de que eram humanos; passado do Bispo 4; torre cai; Sandra era o 5º Bispo | "Serra sem Ecos", cartas, servos, VÉRAXION | **Total** |
| Ato 5: coliseu em rounds; 4 mini-chefes Elite; Sandra luta junto; Espada Celestial na loja; inventário com "Equipar melhor"; coliseu desaba | Arena opcional do Vale (torneio simples) | Grande |
| Ato 6: deserto; estátua; fragmentos espaciais; ritual (vídeo de referência); revanche dos 4 Bispos nas dimensões com marcas X; Ganância em 3 fases (ultimate "I Am Atomic"); Anjo + Sandra; Inveja; revelação de Sandra; planeta da Inveja liberado | Portal reaberto, 4 guardiões em sequência, vazio com Ganância em 3 formas, epílogo, Galáxia 2 liberada | Média: falta deserto, fragmentos, ritual, marcas X, Inveja e Sandra |

**Conflito principal (precisa da sua aprovação):** os Atos II–IV atuais foram escritos por mim antes do roteiro integral e **não seguem** o seu texto. Pela regra do documento, o roteiro original vence. Proposta: substituir os Atos II–IV atuais pelos do roteiro, marco a marco, reaproveitando os sistemas que já funcionam (motor de etapas, rigs, dimensões, VS, corações, loja, mapa, clima). O conteúdo atual seria removido só no marco que o substitui.

## 3. Mapa de dependências

```
Diretor de cutscenes (dados) ──┬─> Prólogo (M1) ──> Ato 1 (M2) ──> Ato 2 (M3) ──> Ato 3 (M4) ──> Ato 4 (M5) ──> Ato 5 (M6) ──> Ato 6 (M7)
Câmera (livre/lock-on/cinemática) ─┘        │              │              │              │              │              │
Inventário + equipamentos + buffs ─────────────────────────┼──────────(casaco M4)───(pergaminho M5)──(Espada M6)───(fragmentos M7)
Novo kit de poderes (jogador/inimigos) ────── começa em M2 (VHAZRAEL) e cresce por ato ─────────────────────── ultimates M7
Cidades modulares + streaming/LOD ─────────── vila M2 · vulcão M3 · neve M4 · torre M5 · coliseu M6 · deserto M7
Companheiros (Anjo acompanha; Sandra) ─────── Anjo M2+ · Sandra M3 (duelo) · M5 · M6 · M7
Save (missões, checkpoints, NPCs, equipamentos, fragmentos, cutscenes) ── estendido em todo marco
Animações próprias (Blender por script) ───── personagens novos e cenas; validar qualidade antes de escalar
```

Pré-requisitos transversais, feitos **dentro** do primeiro marco que precisar deles (sem PR só de infraestrutura):
- **Diretor de cutscenes:** sequência de câmera, falas, animação, áudio e eventos em dados; bloqueia combate; avança diálogo por toque; pular com confirmação.
- **Câmera:** já existem livre, primeira pessoa, lock-on e cinemática da ultimate. Faltam colisão com paredes em cidades fechadas, troca de alvo e retorno suave padronizado.
- **Corrida com animação própria:** `Protagonista.glb` não tem clipe de corrida (tem Idle, Walk, Hit, Throw, Kip Up). Precisa de um clipe novo.

## 4. Marcos (um por vez, branch/PR isolado)

| # | Marco | Entrega verificável |
|---|---|---|
| 0 | Auditoria, backup, inventário de GLBs, validação de VHAZRAEL | **Este documento** |
| 1 | Prólogo (céu, trono, asas retiradas), escolha do nome, planetas, despertar "olhando as mãos", diretor de cutscenes v1 | Cena jogável do início ao Ato 1, pulável; roteiro revisado ORIGINAL→REVISADO das cenas |
| 2 | Vila ampliada (mercado, becos, NPCs pobres), Ato 1 completo como no roteiro até VHAZRAEL; Anjo acompanha; poderes v1 do jogador | Todas as cenas do Ato 1 jogáveis e testadas; regressão da dimensão de VHAZRAEL |
| 3 | Ato 2: cidade vulcânica, Sandra (duelo), laboratório, sala do ouro, mini-chefe, VORGAZHEK, erupção, ataque do Bispo 4 | Ato 2 completo |
| 4 | Ato 3: cidade nevada, casaco e debuffs, armadilha, guilhotina, caverna de gelo, dimensão distorcida, ZAR'KHAEL, revelação, Ganância leva o Anjo | Ato 3 completo |
| 5 | Ato 4: torre de 7 andares, revelação dos humanos, passado do Bispo 4, VÉRAXION (ultimate Black Hole) | Ato 4 completo |
| 6 | Ato 5: coliseu, Elites, Sandra, Espada Celestial, inventário "Equipar melhor" | Ato 5 completo |
| 7 | Ato 6: deserto, fragmentos, ritual, revanche com marcas X, Ganância 3 fases ("I Am Atomic"), Inveja, Sandra revelada, planeta liberado | Galáxia 1 encerrada |
| 8 | Polimento, otimização e testes completos (Android real) | Relatório de FPS, memória e regressão |

## 5. Inventário de GLBs

Gerado por script (`@gltf-transform/core`) em 25/10. "Usado no código" = carregado pelo jogo atual (busca exata pelo nome do arquivo).

| Arquivo | MB | Triângulos | Vértices | Esqueleto | Texturas | Anim. | Usado no código |
|---|---|---|---|---|---|---|---|
| AnjoGuia-lod.glb | 2.3 | 39.865 | 33.033 | sim | 1024x1024 | 5 | sim |
| AnjoGuia.glb | 11.1 | 265.788 | 154.657 | sim | 1024x1024 | 5 | não |
| Arvore.glb | 0.2 | 12.436 | 8.086 | não | — | 0 | sim |
| Bispo1-lod.glb | 1.4 | 8.180 | 15.467 | sim | 1024x1024 | 5 | sim |
| Bispo1.0.glb | 7.7 | 10.035 | 17.554 | sim | 1024x1024 | 5 | não |
| Bispo2-lod.glb | 2.1 | 37.004 | 26.857 | sim | 1024x1024 | 6 | sim |
| Bispo2.glb | 5.6 | 123.348 | 72.381 | sim | 1024x1024 | 6 | não |
| Bispo3-lod.glb | 3.8 | 69.329 | 53.275 | sim | 1024x1024 | 6 | sim |
| Bispo3.glb | 10.3 | 231.102 | 140.408 | sim | 1024x1024 | 6 | não |
| Bispo4-lod.glb | 4.9 | 90.057 | 66.903 | sim | 1024x1024 | 6 | sim |
| Bispo4.glb | 12.8 | 300.190 | 178.186 | sim | 1024x1024 | 6 | não |
| Enemy1-lod.glb | 2.1 | 30.035 | 25.186 | sim | 1024x1024 | 9 | sim |
| Enemy1.glb | 8.9 | 200.248 | 118.902 | sim | 1024x1024 | 9 | sim |
| Enemy2.glb | 8.4 | 272.484 | 163.049 | não | 1024x1024 | 0 | não |
| Enemy3.glb | 1.8 | 9.546 | 19.891 | sim | 1024x1024 | 8 | sim |
| Enemy4.glb | 1.7 | 10.069 | 20.003 | sim | 1024x1024 | 8 | sim |
| Espada1.glb | 1.5 | 38.324 | 23.549 | não | 1024x1024 | 0 | não |
| EspadaBispo2.glb | 1.6 | 54.732 | 33.411 | não | 1024x1024 | 0 | não |
| EspadaBispo3.glb | 1.2 | 37.166 | 23.079 | não | 1024x1024 | 0 | não |
| EspadaBispo4.glb | 0.7 | 18.480 | 12.243 | não | 1024x1024 | 0 | não |
| EspadaProta.glb | 0.6 | 12.672 | 8.667 | não | 1024x1024 | 0 | sim |
| Ganancia1-lod.glb | 4.1 | 61.651 | 51.170 | sim | 1024x1024 | 11 | sim |
| Ganancia1.glb | 14.0 | 308.258 | 186.422 | sim | 1024x1024 | 11 | não |
| Ganancia2-lod.glb | 4.0 | 72.209 | 58.398 | sim | 1024x1024 | 10 | sim |
| Ganancia2.glb | 15.4 | 361.048 | 215.012 | sim | 1024x1024 | 10 | não |
| Ganancia3-lod.glb | 5.4 | 86.761 | 73.647 | sim | 1024x1024 | 9 | sim |
| Ganancia3.glb | 18.9 | 433.810 | 266.116 | sim | 1024x1024 | 9 | não |
| Grama.glb | 0.0 | 384 | 480 | não | — | 0 | sim |
| Lua.glb | 2.1 | 82.498 | 46.252 | não | 1024x1024 | 0 | sim |
| Montanha.glb | 0.3 | 12.222 | 6.713 | não | — | 0 | não |
| Npc-lod.glb | 2.7 | 38.236 | 33.527 | sim | 1024x1024 | 5 | sim |
| Npc-lod2.glb | 1.3 | 8.402 | 10.464 | sim | 512x512 | 5 | sim |
| Npc.glb | 16.3 | 382.406 | 223.989 | sim | 1024x1024 | 5 | não |
| Protagonista.glb | 1.2 | 10.148 | 9.431 | sim | 1024x1024 | 6 | sim |
| biblia_celestial_aberta.glb | 0.0 | 588 | 392 | não | — | 0 | não |
| biblia_celestial_fechada.glb | 0.0 | 360 | 240 | não | — | 0 | não |

### Animações por arquivo

- **AnjoGuia-lod.glb** (5): Running, Walking, Skill_01, Skill_03, Unsteady_Walk
- **AnjoGuia.glb** (5): Running, Walking, Skill_01, Skill_03, Unsteady_Walk
- **Bispo1-lod.glb** (5): Idle, Walk, Hit Knockback Root Motion, Sword Aerial Combo, Sword Regular B
- **Bispo1.0.glb** (5): Idle, Walk, Hit Knockback Root Motion, Sword Aerial Combo, Sword Regular B
- **Bispo2-lod.glb** (6): Swim Idle, Walk, Hit Knockback, Hit Shoulder Right, Sword Heavy Combo, Culturalibre Wizard With Sceptre 2
- **Bispo2.glb** (6): Swim Idle, Walk, Hit Knockback, Hit Shoulder Right, Sword Heavy Combo, Culturalibre Wizard With Sceptre 2
- **Bispo3-lod.glb** (6): Swim Idle, Walk Backward, Lift Air Fall Root Motion, Lift Air Hit Left, Sword Light Combo, Sword Regular Combo
- **Bispo3.glb** (6): Swim Idle, Walk Backward, Lift Air Fall Root Motion, Lift Air Hit Left, Sword Light Combo, Sword Regular Combo
- **Bispo4-lod.glb** (6): Idle Torch, Walk, Lift Air Fall Root Motion, Hit Chest, Sword Aerial Combo, Sword Light Combo
- **Bispo4.glb** (6): Idle Torch, Walk, Lift Air Fall Root Motion, Hit Chest, Sword Aerial Combo, Sword Light Combo
- **Enemy1-lod.glb** (9): Running, Walking, 01a14b4d-06e7-7100-a90e-f7462489c8b9, 01a14b4e-e964-72e9-9e35-9c0c586edbec, 01a14b51-9352-70b9-8540-e7713d7152b1, 01a14b57-0772-77b2-9da3-b6644a5d1cae, 01a14b5a-2ee6-75dc-982f-8965372f192b, 01a14b5c-5fd2-74f9-b256-af9f522f53cb, Skill_03
- **Enemy1.glb** (9): Running, Walking, 01a14b4d-06e7-7100-a90e-f7462489c8b9, 01a14b4e-e964-72e9-9e35-9c0c586edbec, 01a14b51-9352-70b9-8540-e7713d7152b1, 01a14b57-0772-77b2-9da3-b6644a5d1cae, 01a14b5a-2ee6-75dc-982f-8965372f192b, 01a14b5c-5fd2-74f9-b256-af9f522f53cb, Skill_03
- **Enemy3.glb** (8): Running, Walking, _01a15ab0_deed_76a9_818c_47f5fc81ba40, _01a15ab5_eeba_71ae_a438_b85a938940fc, Attack, Dead, Skill_03, Triple_Combo_Attack
- **Enemy4.glb** (8): Running, Walking, _01a15ace_9e83_7761_a901_661f649d465a, _01a15ad2_c637_77d6_b5f4_1b96b9e71d4b, Attack, Dead, Skill_03, Triple_Combo_Attack
- **Ganancia1-lod.glb** (11): Running, Walking, _01a15a96_67a9_773a_89e1_3990f76b968d, _01a15a9a_6e6b_7033_9379_efb3a7974d29, _01a15a9f_d25c_70e1_bcee_3b20cf78b1d2, Agree_Gesture, Arise, Attack, Dead, Skill_03, Triple_Combo_Attack
- **Ganancia1.glb** (11): Running, Walking, _01a15a96_67a9_773a_89e1_3990f76b968d, _01a15a9a_6e6b_7033_9379_efb3a7974d29, _01a15a9f_d25c_70e1_bcee_3b20cf78b1d2, Agree_Gesture, Arise, Attack, Dead, Skill_03, Triple_Combo_Attack
- **Ganancia2-lod.glb** (10): Running, Walking, _01a156cd_69c5_76fe_b170_51aba82e74db, _01a156d1_257b_7614_b379_e28ddb9f6052, Arise, Attack, Dead, Skill_01, Skill_03, Triple_Combo_Attack
- **Ganancia2.glb** (10): Running, Walking, _01a156cd_69c5_76fe_b170_51aba82e74db, _01a156d1_257b_7614_b379_e28ddb9f6052, Arise, Attack, Dead, Skill_01, Skill_03, Triple_Combo_Attack
- **Ganancia3-lod.glb** (9): Running, Walking, _01a156df_e232_77c3_9887_dc9edce1e064, _01a156e1_4e78_7159_8f95_3fb168a222f7, Arise, Dead, Skill_03, Slow_Orc_Walk, Unsteady_Walk
- **Ganancia3.glb** (9): Running, Walking, _01a156df_e232_77c3_9887_dc9edce1e064, _01a156e1_4e78_7159_8f95_3fb168a222f7, Arise, Dead, Skill_03, Slow_Orc_Walk, Unsteady_Walk
- **Npc-lod.glb** (5): Running, Walking, _01a156a3_6952_769b_94bf_2cf0e9d19b46, Agree_Gesture, Alert
- **Npc-lod2.glb** (5): Running, Walking, _01a156a3_6952_769b_94bf_2cf0e9d19b46, Agree_Gesture, Alert
- **Npc.glb** (5): Running, Walking, _01a156a3_6952_769b_94bf_2cf0e9d19b46, Agree_Gesture, Alert
- **Protagonista.glb** (6): Idle, Walk, Lift Air Hit Right, Hit Knockback, Overhand Throw, Kip Up

> **Não usados hoje:** Bispo1.0.glb, Bispo2.glb, Bispo3.glb, Bispo4.glb, Ganancia1–3.glb, Npc.glb, AnjoGuia.glb (o jogo carrega as versões `-lod`), Enemy2.glb, Espada1.glb, EspadaBispo2–4.glb, Montanha.glb, biblia_celestial_aberta/fechada.glb.

**Achados:**
- **Enemy2.glb** (272 mil triângulos, **sem esqueleto e sem animação**) é obrigatório para o Ato 2 (cidade vulcânica). Precisa de rig e animações: Mixamo pelo autor, ou rig por script no Blender (qualidade a validar).
- **Protagonista.glb** não tem clipes de corrida nem de ataque com espada. O roteiro pede corrida própria.
- **Espadas dos Bispos** (EspadaBispo2–4) e as **Bíblias** existem, mas não estão em uso: candidatas para os poderes (grimório) no M2.
- **Nomes de clipes com códigos** (`_01a15…`) em Enemy/Ganância/Npc: o mapeamento de papéis está em `RIG_DEFS` e precisa ser revalidado a cada GLB novo.
- **Faltam modelos** para: Sandra (mulher de cabelo vermelho e olhos vermelhos), Inveja (silhueta preta), Deus/trono, crianças, bandidos, cidades (casas, pontes, torre, estátua, coliseu, portais). Para cada um: modelo pronto licenciado (fornecido pelo autor) ou construção procedural/Blender por script.

## 6. Ferramentas e limites (honesto)

- Blender 5.2.3 (módulo `bpy`) roda nesta sessão por script: criar cena, animar e exportar GLB **funciona** (teste com cubo animado). A qualidade de personagem modelado e animado por script **não foi validada**.
- Pinterest e assets sem licença: não serão importados. Referências servem só de direção.
- Android: não há aparelho aqui. Tudo que depende de toque, FPS e temperatura fica NÃO TESTADO até você testar.

## 7. Decisões que preciso de você antes do Marco 1

1. Aprovar a **substituição dos Atos II–IV atuais** pelos do roteiro (seção 2).
2. Modelos 3D de **Sandra, Inveja, Deus/trono, crianças e Enemy2 com animações**: você fornece (Mixamo ou loja) ou eu tento por script no Blender?
3. Nomes provisórios das cidades, a aprovar no marco de cada uma.
