# Combate cinematográfico — auditoria inicial, sem implementação

Base remota: `7f1c07da698da417191107f46a6975e20f6b500c` (main, Mod **241**), inspecionada em 31/10/2026. Branch local isolada: `codex/combat-cinematic-audit`. Nenhuma alteração de gameplay, exclusão do briefing ou publicação na main nesta etapa.

## Material recebido e dependência pendente

Foi recebido `31ea6d7721398ed9eb2772c06c0877d5.mp4`: 13,233 s, 1024×576, 30 FPS. Foram inspecionados quadros a cada segundo: cortes amplos brancos/vermelhos, aproximações, elevação e retorno ao solo, alternância de direção e impacto. Esses quadros orientam linguagem visual, mas não estabelecem timings exatos de contato. Não é uma gravação do jogo deste repositório.

**Escopo esclarecido pelo criador em 31/10/2026:** usar o briefing do GitHub, os quatro vídeos anexados e animações diferentes para cada espada. Essa confirmação substitui a dependência do ZIP/INSTRUCOES-CODEX.md mencionada no briefing. Não usar o ZIP antigo da Mod 234 para esta tarefa.

Foram inspecionados também `df86b04c4a15f5d592cc1ddf28da979a.mp4` (9,690 s, duelo e recuperação), `Roblox Studio - Sword Combat.mp4` (10,691 s, cortes dourados, avanço e alternância diagonal/vertical) e `Roblox Studio - Sword Combat 2.mp4` (9,630 s, arcos azuis curtos e transições de guarda). Foram extraídos e vistos 20 quadros por vídeo, até 2 FPS. São referências de direção corporal e ritmo, não medições quadro a quadro de hitmarks nem assets para copiar.

## Estado técnico confirmado

- Cinco espadas: `prota` (Chamado), `aurora`, `vigilia`, `quantum`, `celeste`. O pedido do usuário exige animações de combate diferentes para **cada uma**, não apenas VFX recoloridos.
- `sword-rites3d.js`: apenas Chamado e Aurora possuem ritos (`Rite_Judgment` e `Rite_Eclipse`). Compartilham o mesmo `SWORD_COMBO` de três clipes. As outras três espadas seguem o caminho legado de ataque em `tryPlayerAttack`.
- `tryRiteAttack` retorna sem atacar se o herói está no ar ou em dash; `action('jump')` e `action('dash')` cancelam o rito. Portanto, ataques aéreos e dash-attack precisam de estados e transições próprios; não basta adicionar VFX.
- O kit 232 já fornece camadas de tronco/pernas, buffer, varredura da lâmina e dois ritos. A corrida 235 e a montagem da espada após a pose estão presentes e devem ser preservadas.
- Mods 237/238 migraram Enemy1/Enemy2 para esquadras, incluindo mini-chefes. `enemy1-squad3d.js` contém a simulação; `enemy2-squad3d.js` registra espécies/poderes; `enemy1-squad-runtime3d.js` apresenta ambos. Alterar o runtime inteiro indiscriminadamente também mudaria inimigos comuns.
- Mini-chefes são `warden` e `e2boss`. Ambos recebem foices atualmente. O briefing novo define Enemy1 como predador de garras e Enemy2 como executor de foice; as coreografias deverão selecionar o papel/mini-chefe explicitamente e preservar poderes/esquadras existentes.
- O runtime usa `AnimationMixer`, crossfade e restauração de escala. Há fallback de `attack2` para `attack`: nomes de ações distintos não garantem animações distintas.
- A main também contém VFX 236 e revisões até 241. Os portais atuais são dois corpos retos, não a antiga sequência de 24 projéteis. Não restaurar versões 235 sobre esse trabalho.

## Inventário real dos GLBs

Metadados extraídos do JSON interno dos GLBs, sem inventar nomes de clipes; hashes Git dos seis arquivos conferem com a árvore remota. Inventário completo em `COMBATE-CINEMATICO-GLBS.json`.

| Asset | Clipes relevantes/limite |
| --- | --- |
| `Protagonista.glb` | 6: Idle, Walk, Lift Air Hit Right, Hit Knockback, Overhand Throw, Kip Up; não contém um catálogo completo de ataques de espada |
| `Protagonista-ritos-232.glb` | Crescent, Reverse, Ascendant, Judgment, Eclipse e Hero_Run; sem canais de escala |
| `Protagonista-corrida-235.glb` | Hero_Run, 0,68 s, 53 canais, sem escala |
| `Enemy1.glb` / `Enemy1-lod.glb` | 9 clipes em cada; Running, Walking, Skill_03 e seis nomes UUID. Os UUIDs precisam de inspeção animada antes de ganhar nomes semânticos novos |
| `Enemy2-rig.glb` | 8: Attack (2,792 s), Triple_Combo_Attack (4,292 s), Dead, Running, Walking, Skill_03 e dois UUIDs; possui tracks de escala, cuja trava deve ser mantida |

Isso é inspeção estrutural, não validação visual das animações existentes ou de novas animações.

## Pesquisa técnica inicial

- [Three.js AnimationAction](https://threejs.org/docs/pages/AnimationAction.html): ações, crossfade, pesos, loop e clamp; aproveitar ações por clipe e evitar interromper um ataque aéreo com idle por fallback.
- [Three.js AnimationMixer](https://threejs.org/docs/pages/AnimationMixer.html): mixer por ator e reaproveitamento de ações; parar ações antes de liberar recursos.
- [Epic — Locomotion](https://dev.epicgames.com/documentation/en-us/unreal-engine/locomotion-in-unreal-engine): separar animação, movimento e sincronização; adaptar princípios de root motion/warping limitado ao Three.js, sem adicionar Unreal ao projeto.
- [KQM — Frames](https://library.keqingmains.com/combat-mechanics/frames): distinguir preparação, contato, hitlag e recuperação. Não copiar contagens de frames de outro jogo como timings já medidos neste projeto.

## Verificação de base executada

`node --test`: **259 testes, 258 passaram e 1 falhou antes de qualquer alteração de combate**. Falha: `Mod visível e cache atualizado (238)` em `enemy1-integration.test.mjs`, que ainda exige 238 enquanto o HTML e o loader estão em 241. Não corrigida nem escondida nesta auditoria. Nenhuma nova animação ou coreografia foi implementada/testada. Sem ensaio Android físico nesta etapa.

## Próxima etapa após receber o ZIP

Ler integralmente a especificação principal; conferir os cinco storyboards; fechar matriz de movimentos por cinco espadas + dois mini-chefes; inspecionar clipes ambíguos renderizados; gerar os clipes faltantes nos rigs corretos; integrar estados/cápsula/contato e laboratório; testar gameplay/visual/regressão e abrir PR de implementação. Manter o briefing temporário enquanto qualquer critério permanecer pendente. Não fazer merge nem alterar main nesta tarefa.
