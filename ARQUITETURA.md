# Estrutura do jogo — Galáxia 1 (mundo 3D)

O jogo é **100% 3D** (Three.js 0.160). O antigo mundo 2D em Canvas foi removido no Mod 202:
a dimensão de VHAZRAEL e as dos demais Bispos acontecem dentro do mesmo mundo 3D, com os mesmos
HUDs, combate, câmera, habilidades, vida e corações.

## Arquivos

- `index.html` — hospeda o mundo em um iframe (repassa `?debug3d=1`, `?galaxias=1`, `?resetGalaxy1=1`).
- `mundo-3d-prototype.html` / `.js` / `hud3d.css` — mundo, combate, HUD, loja, mapa, perfil. `mod181-loader.js`
  carrega o `.js` como texto, reescreve caminhos de módulos/ativos com o token de cache (`BUILD`) e o importa por Blob.
- Regras puras (testadas com `node --test`): `world3d-terrain.js`, `skills3d.js`, `map3d.js`, `progression3d.js`,
  `galaxies3d.js`, `hearts3d.js`, `sidequests3d.js`, `act1-flow.js`, `act2-flow.js`, `acts34-flow.js`,
  `finale-flow.js`, `dimensions3d.js`, `prologue-flow.js` + `cutscenes3d.js` (diretor de cenas), `sewer3d.js` (esgoto do Ato I).
- `dimension-arenas3d.js` — geometria procedural das arenas e dos portais (recebe o `THREE` por parâmetro e só cria
  objetos quando a dimensão é aberta).
- `shop-icons3d.js` — arte própria (SVG) das Palavras, ultimates, espadas e categorias da Loja e do HUD.

## Dimensões dos Bispos

`DIMENSIONS` (em `dimensions3d.js`) define nome, fala, foto, arena e tema de cada uma:
1 VHAZRAEL (câmara macabra de moedas), 2 VORGAZHEK (vazio de olhos vermelhos e lua sorridente),
3 ZAR'KHAEL (cogumelos de olhos sobre piso xadrez), 4 VÉRAXION (corredor torto de claraboias) e
5 Ganância (caverna de raízes e olhos; é o Pecado, não um quinto Bispo).

Fluxo: portal no mundo → `startDimensionBattle(key)` → cartão **jogador VS Bispo** (foto do herói, foto do Bispo,
nome e fala) → arena abaixo do mundo (`voidMode` + `voidSpec`) → luta com o motor normal → vitória/sem corações →
volta ao portal. Durante o cartão (mundo parado) a arena, o modelo e as texturas são preparados e os shaders
compilados, para a luta nunca travar. Quedas gastam um coração; sem corações o portal expulsa o jogador.

## Ato I (Mod 204)

Roteiro do autor em `docs/roteiro/M2-ATO1.md`. As cenas são dados em `act1-flow.js` e rodam no diretor (`cutscenes3d.js`)
com câmera por atores; etapas 1–8 com sub-etapas (`act1Sub`). Lutas em grupo: um inimigo luta e os demais esperam
visíveis (`startPack`). O esgoto é uma área abaixo do mundo (tema `sewer`, colisão por `sewerWalkable`) com o portal de
VHAZRAEL no fim. Modelos: `VilaKit.glb`, `MoradoresPose.glb`, `Enemy2-rig.glb` (scripts em `tools/blender/`).

## Ato II (Mod 205)

Roteiro do autor em `docs/roteiro/M3-ATO2.md`. Cenas em `act2-flow.js` (etapas 8–14, sub-etapas em `act1Sub`).
Cidade Cinzária a oeste (`DISTRICT_SPOTS`); depois de VORGAZHEK ela vira ruína e abismo (`act2Abyss`, bloqueado).
O interior do vulcão é uma área abaixo do mundo (dimensão `vulcao`, tema `volcano`, colisão por `volcanoWalkable`,
porta liberada pela chave) com laboratório, sala do ouro, salão, trono e o portal de VORGAZHEK. A visão da erupção
mostra o mundo por alguns segundos no meio da luta (`visao-inicio`/`visao-fim`). Modelo novo: `Misteriosa-rig.glb`.

## Ato III (Mod 206)

Roteiro do autor em `docs/roteiro/M4-ATO3.md`. Cenas em `act3-flow.js` (etapas 15–19); lugares, colisão, frio e casaco
em `snow3d.js`. A cidade de neve (Invernália) ocupa o vale leste; o motor antigo de etapas (`acts34-flow.js`) ignora
15–20 e o jogo volta a ele no passo 21 (Ato IV). Três áreas abaixo do mundo: estalagem (`inn`), caverna de gelo
(`icecave`) e dimensão distorcida (`distorted`, controles invertidos). Casaco: `Casaco.glb` sem esqueleto, ligado ao
esqueleto do herói em tempo de execução (`attachCoat`). Rig `anjo`: AnjoGuia com clipes emprestados do Protagonista
(`RIG_DEFS.*.extra`). Modelos novos: `NeveKit.glb`, `Casaco.glb` (scripts em `tools/blender/m4_*.py`).

## Ato IV (Mod 207)

Roteiro do autor em `docs/roteiro/M5-ATO4.md`. Cenas em `act4-flow.js` (etapas 21–24; na torre, `act1Sub` = piso);
lugares e colisão em `tower3d.js`. A torre (`TorreKit.glb`, script `tools/blender/m5_torre.py`) fica na antiga Serra;
cada piso é a mesma área abaixo do mundo (tema `tower`), redecorada. O motor antigo ignora 15–25; depois do Ato IV vem
o Ato V (passo 25). Pergaminho: `scrollMul()` no dano da espada.

## Ato V (Mod 208)

Roteiro do autor em `docs/roteiro/M6-ATO5.md`. Cenas e rounds em `act5-flow.js` (etapa 25; `act1Sub` 0 jornada,
1 chegada, 2–9 rounds 1–8); lugar e colisão em `coliseum3d.js` (região nova a leste da torre, ligada por uma passagem
longa). Coliseu, plateia instanciada, estandartes e braseiros: `Coliseu.glb` (`tools/blender/m6_coliseu.py`).
Auras dos evoluídos: `makeAura()`. Aliada no último round: `updateAlly()`. Torcida: `worldAudio.setCrowd/roar`.
Inventário: painel `#inv-panel` (tecla I) com "Equipar melhor" (`bestSword`). Espada Celestial em `progression3d.js`.

## Ato VI (Mod 209)

Roteiro do autor em `docs/roteiro/M7-ATO6.md`. Cenas em `act6-flow.js` (etapas 27–29; 30 = galáxia libertada); lugar,
colisão e contagem de fragmentos em `desert3d.js` (deserto entre o coliseu e a neve). Revanche: painel `#rematch-panel`
(X em quem caiu) e as dimensões antigas dos Bispos. Ganância em três formas (`act6GreedDefeat` encadeia as fases);
aliados em `startAllies6`. O arco final antigo (`finale-flow.js`) fica desligado de 25 a 29. Modelos: `DesertoKit.glb`
(estátua, portais, rochas) e `Sandra-rig.glb` (scripts `tools/blender/m7_*.py`).

## Marco 8 — polimento (Mod 210)

Notas em `docs/roteiro/M8-POLIMENTO.md`. Sandra nova (`Sandra-rig.glb`, `tools/blender/m8_sandra.py`): corpo do MakeHuman
(MPFB2, CC0) ajustado ao esqueleto da Misteriosa, então usa os mesmos clipes. Ultimates dos chefes: regras em `ultimates3d.js`
(quando cada uma sai); efeitos em `startVoidUlt`/`startSupernova` (`updateBossUltimates`), câmera dramática em
`applyUltCam` (mesmo giro, volta suave), câmera lenta curta (`slowMo`). Luz da ultimate criada uma vez (`ultLight`).

## Marco 9 — poderes (Mod 211)

`docs/roteiro/M9-PODERES.md`. Corte de Luz/Negro no 3º golpe do combo (`spawnHolyProjectile('arc')`); Espada do Círculo
(`circleSword`, aprimoramento `magic3_plus`).

## Marco 10 — poderes de todos (Mod 212)

`docs/roteiro/M10-PODERES.md`. Regras puras em `powers3d.js` (famílias, kits com Hab. 1–3, espada e ultimate, nível,
escolha do poder) e `ultimates3d.js` (quando a ultimate sai). Efeitos no MOD 212: arquétipos `fxOrbs`, `fxGrab`,
`fxErupt`, `fxRain` (malha instanciada), `fxWave`, `fxLine`, `fxRing`, `fxCone`, `fxDash`, `fxVortex`; kit em
`updateFoeKit`; ultimates de família em `startKitUlt`; grimório/Bíblia em `showGrimoire`. Os antigos `BOSS_POWERS`
e `updateFoeWeaponSkills` não são mais chamados.

## Marco 11 — animações e impacto (Mod 213)

`docs/roteiro/M11-ANIMACOES.md`. Poses de poder sobre os clipes (`playPose`/`updatePoses`, ossos apontados no
espaço do mundo; `POSE_BONES` cobre os nomes mixamo e humanoides). Corrida: `Protagonista-corrida.glb`
(`tools/blender/m11_corrida.py`) convertido no navegador por `bakeRunClip`; botão `#run`/Shift (`isSprinting`).
Impacto: `impactFrame` (filtro no canvas), `lightning`, `scorch`.

## Marco 12 — Anjo-Guia novo (Mod 215)

`docs/roteiro/M12-ANJO.md`. `Anjo-rig.glb` (`tools/blender/m12_anjo.py`): MakeHuman masculino no esqueleto da Misteriosa,
usado pelo Anjo-Guia do mundo e por `RIG_DEFS.anjo` (clipes próprios, sem `extra`). `AnjoGuia-lod.glb` não é mais carregado.

## Mod 217 — revisão dos Atos II e III

`docs/roteiro/M13-REVISAO-ATOS-2-3.md`. Pular cena: `skip()` do diretor entrega as ações pendentes a `flush`; cenas
obrigatórias usam `playStory(...,{skippable:false})`. Golpe final: `foeFinalBlow`/`updateFallen`. Cidade: `cityLayout()`
(act2-flow) instanciada no bloco `district`; emboscada por `inAlley`. Câmera: colisão com cômodos internos e casas.

## Mod 218 — VHAZRAEL e figurantes

`docs/roteiro/M14-VHAZRAEL-E-POLIMENTO.md`. Primeiro Bispo: VHAZRAEL (chaves internas `valerio`/`bishop1` mantidas).
Figurantes: `dressTownsfolk`; moradores de Cinzária: `CITY_ROUTES`/`updateCityFolk`. Asas do Anjo: ossos `AsaEsq`/`AsaDir`.

## Mod 229 — habilidades cinematográficas

`docs/MOD-229-HABILIDADES-CINEMATOGRAFICAS.md`. Kit de VFX compartilhado em `celestial-fxkit3d.js` (partículas, decalques,
fitas, raios). Skill 3: FSM com captura (`phoenix.hold` + lease `phoenixHold` no jogo). Ultimate: asas `Asas.glb`,
tempestade `celestial-storm3d.js` (céu, nuvens em fatias, chuva na GPU, vento, raios) restaurada pelo `whiteLease`.

## Mod 233 — Palavras novas e Quantum

`docs/MOD-233-PALAVRAS-NOVAS-E-QUANTUM.md`. Lógica: `skill-x-rupture3d.js`, `skill-twin-portals3d.js`,
`skill-judgment-dragon3d.js`; VFX: `*-vfx3d.js` correspondentes; espada: `quantum-sword3d.js`. Espaços 1–3 (`skillLoadout`,
`slotSkill`, regras em `skills3d.js`), ultimate separada. Prévia: `skills-mod233-preview.html`.

## Dia e noite

Relógio contínuo (`gameClock`): 24 h de jogo = 16 min reais, 12 h de dia + 12 h de noite. Nenhuma etapa força a
noite. Braseiros (`BRAZIER_SPOTS`) iluminam os pontos de luta com 4 chamadas de desenho e uma única luz móvel.

## Desempenho (regras do projeto)

- Nunca ligar/desligar luzes ou sombras em jogo (recompila shaders). No modo Auto só a resolução varia.
- Shaders do mundo compilam em `precompileWorld()` enquanto a tela de galáxias está aberta.
- Instâncias de árvores passam por `registerInstanceCull` (raio + frente da câmera, com LOD distante para carvalhos);
  moradores e modelos pesados são ocultados longe do jogador; a grama usa tufos de ~30 triângulos.
- Ativos grandes têm versão leve (`*-lod.glb`, `*-ui.webp`); os originais permanecem no repositório.
- Use `?debug3d=1` e `SevenSinsDebug3D.triBreakdown()` para ver onde estão os triângulos.

## Marcadores de versão

Ao mudar código: incremente o número visível (`#marker`), `BUILD` em `mod181-loader.js`, `?v=` em
`mundo-3d-prototype.html` e `refresh/build` em `index.html`.

## Mod 231 — ritos das duas espadas iniciais

`sword-rites3d.js` simula combos e skills; `sword-rites-animation3d.js` valida clipes e isola saves de teste;
`sword-rites-vfx3d.js` mantém trilhas, cortes e partículas em pools. `Protagonista-ritos-231.glb` contém cinco
clipes autorais em cima do rig original, gerados por `tools/blender/mod231_sword_rites.py` (Blender 5.0.1).
Somente `prota`/`aurora`, botão contextual e tecla R. As quatro magias permanecem separadas.
`?todasHabilidades=1&treinoEspadas=1&v=231` abre o treino sem gravar a campanha.
Auditoria, balanceamento e evidências: `docs/MOD-231-RITOS-DE-ESPADA.md`.

## Mod 237 — Enemy1 em esquadra simultânea

`enemy1-squad3d.js` (lógica pura, 120 Hz, semente): atores, IA por utilidade com estudo do alvo, diretor da esquadra
(papéis, fichas de ataque, intervalo do grupo), Garras do Abismo, Espiral Devoradora, Juízo Violeta, contra-selo
(magia × magia) e Guardião (combo, finta, fase 2). `enemy1-squad-runtime3d.js` desenha um clone por ator (altura pelo
esqueleto, escala travada após o mixer) e prende a `warden-scythe3d.js` na mão do Guardião; VFX em
`enemy1-dark-vfx3d.js`. No `mundo-3d-prototype.js`, todo `startPack({rig:'enemy1'})` vira esquadra: o `enemy` legado é
o procurador invisível do ator em foco (dano, mira e HUD repassados), `updateEnemyAI`/`updateFoeKit` ficam desligados
e `finishSquad()` fecha o encontro como o pacote antigo. `?esquadraLegada=1` volta ao modo antigo;
`?testeEnemy1=1&todasHabilidades=1` abre o laboratório isolado. Detalhes: `docs/MOD-237-ENEMY1-ESQUADRA.md`.
