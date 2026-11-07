# Enemy1 Rework — registro de animações

> Registro de produção para a nova versão de Enemy1. **Estes nomes são convenções planejadas**; não confirmam que arquivos foram enviados ao GitHub ou que os clipes já estejam implementados. Ao exportar do Meshy, renomear/mapear os clipes conforme esta tabela para evitar ambiguidades.

| Nome canônico no jogo | Nome da animação no Meshy | Finalidade | Duração alvo | Loop | Estado |
|---|---|---|---|---|---|
| `enemy1_breathing_idle` | **Demonic Breathing Idle** | Respiração lenta e antinatural, expansão do tórax, contração, inclinação sutil da cabeça e leve movimento das garras, pés imóveis | 5 s | Sim | Prompt definido; arquivo/clipe ainda não verificado |
| `enemy1_hit_reaction` | **Enemy1 — Hit Reaction** | Recuo do torso e da cabeça após impacto frontal, tensão das garras, recuperação da postura de combate | 2 s (reprodução ajustável para ~0,6–0,9 s no combate) | Não | Prompt definido; arquivo/clipe ainda não verificado |

## Diretrizes para integração

- Reutilizar o mesmo esqueleto/rig entre as animações do novo Enemy1; evitar retargeting inadequado e root motion involuntário.
- Não mexer nos arquivos/ataques do Enemy1 antigo até o novo modelo e as animações passarem por teste.
- A espiral dos olhos e as quatro lâminas articuladas nas costas exigem animações/VFX próprios no Three.js; **não** pressupor que movimentos esqueléticos do Meshy animem automaticamente esses elementos.
- Antes de integrar, inspecionar os nomes reais dos clipes no GLB exportado e confirmar compatibilidade com o controlador de animação do jogo.
- Animações adicionais (andar, correr, ataques, morte etc.) ainda **não têm prompt final aprovado nesta etapa**; registrar aqui apenas quando forem definidas ou recebidas.

## Prompts usados

### Demonic Breathing Idle

```text
Seamless 5-second horror idle loop. A sinister humanoid stands rooted, breathing slowly and unnaturally. Ribcage expands deeply, shoulders rise slightly, then chest contracts with a faint shudder. Head hangs low, then tilts subtly toward the viewer. Long clawed fingers twitch once. Slight irregular body sway, tense posture, feet firmly planted, no walking, no large gestures. Return smoothly to starting pose.
```

### Enemy1 — Hit Reaction

```text
A terrifying humanoid demon takes a powerful frontal hit to the chest. His torso snaps backward, shoulders recoil and head jerks violently. Long clawed hands tense and spread, one foot slides slightly backward to absorb the impact. He briefly hunches forward in pain, then regains his menacing combat stance. Heavy, realistic body weight, sharp impact followed by controlled recovery. Feet remain grounded, no falling, no spinning, no exaggerated flailing.
```
