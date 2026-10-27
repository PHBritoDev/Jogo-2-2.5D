# Mod 224 — Chuva de Estrelas Celestiais

Skill 2 substitui a chuva genérica de espadas. A referência enviada pelo autor orientou os anéis azul/branco/dourado, glifos geométricos originais, estrelas de quatro pontas, filamentos e pequenos impactos. Nenhuma imagem foi colada no cenário e nenhum GLB foi modificado.

## Combate e integração

- `celestial-starfall3d.js`: simulação em passos de 1/120 s, gesto de 0,7 s, subida até 1,5 s, formação, três ondas de seis estrelas a partir de 1,7 s, término aos 5 s. Cada estrela atravessa o espaço até o piso; varredura de colisão a cada 8 cm usa as barreiras existentes. Um impacto causa dano uma única vez; apenas o inimigo do encontro original pode recebê-lo.
- 32 de mana, recarga de 5,2 s, 6 de dano por impacto (8 com aprimoramento), multiplicador de nível existente. Dois terços das estrelas miram a região imediata do alvo; as demais espalham-se ao redor. Alvos móveis podem escapar dos tiros já lançados.
- Mão direita do rig existente, pose de braço erguido, som no lançamento, abertura e impactos espaçados. O jogador mantém os controles. A câmera habitual recebe afastamento/elevação suaves, mantendo yaw, pitch e colisões. Não é uma câmera cinematográfica bloqueada.
- Morte, desaparecimento, troca de encontro, diálogo, cena ou transição de região invalidam o efeito. Sem alvo, a chuva termina sobre a região de lançamento. Pausa congela a simulação com o mundo.
- `celestial-starfall-vfx3d.js`: buffers e instâncias persistentes, glifos em geometria, materiais aditivos sem gravação de profundidade, rastros afilados com fluxo, núcleo branco/dourado e faíscas. Perfil baixo remove filamentos e metade dos fragmentos, preservando todos os eventos de combate. Sem luz dinâmica nem pós-processamento global.

## Auditoria das habilidades antigas

O Cerco das Cinco Lâminas Celestiais já estava mesclado pelo PR #306. Seus dois módulos, recursos e controles não foram alterados. Os PRs antigos abertos foram consultados e não continham outra versão pendente da Skill 1.

Skill 2 antiga foi desconectada de `castHolyMagic`. Skill 3, ultimate e `magic3_plus` ficam indisponíveis na compra, no desbloqueio e no lançamento, inclusive com saves antigos ou comandos de desbloqueio. Itens já comprados permanecem salvos e constam no inventário como “Em desenvolvimento”. Não há substitutos genéricos.

Infraestrutura de mana, recarga, controles, salvamento, animação e hitboxes continua compartilhada. `fxRain`, projéteis e outros efeitos antigos permanecem definidos para inimigos, aliados, cenas e depuração. A ultimate narrativa do Ato VI e o terceiro golpe do combo da espada são sistemas distintos dos slots removidos e foram preservados para evitar regressões na campanha. Nenhum asset foi apagado.

## Referências técnicas consultadas

Three.js **r160**, igual ao importmap do jogo: documentação de ShaderMaterial/GLSL, BufferGeometry, InstancedMesh, AnimationMixer, Material (transparência), EffectComposer e descarte de recursos, no repositório oficial `mrdoob/three.js`, `docs/`. UnrealBloomPass foi consultado em `examples/jsm/postprocessing/UnrealBloomPass.js`: a cadeia de render targets não foi adicionada ao jogo, priorizando custo mobile e brilho local. Também foi consultada a referência MDN de `easing-function`: antecipação curta, ascensão acelerada, abertura desacelerada e dissipação posterior aos impactos.

## Verificação

Resultados e capturas em `docs/evidencias/mod224/`. `skill2-preview.html` permite inspecionar o efeito isolado e alternar perfil gráfico. O estudo usa manequins; o jogo continua usando seus GLBs originais.

Android não testado em aparelho real. Chromium com renderização por software e viewport mobile verifica integração e apresentação; não fornece uma medição representativa de FPS em Android.

## Ajuste Mod 225

A pedido do autor: 90 estrelas (5×), em nove ondas de dez, e duração total de 10 s (2×). Círculo e buffers visuais acompanham a duração e a quantidade ampliadas. Dano por estrela, mana e recarga preservados para balanceamento posterior; a proteção contra sobreposição continua ativa até terminar a chuva.
