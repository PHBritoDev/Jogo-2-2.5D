# VFX Engine 2.0 — contrato e uso (Mod 236)

Biblioteca de apresentação sobre Three.js r160, `celestial-fxkit3d.js` e `skill-impact3d.js`.
Usa o renderer do jogo. Não decide dano, não escreve no save e não modifica o terreno.
A lógica das três habilidades continua em módulos sem Three.js, a 120 Hz.

## Componentes

| Arquivo / API | Contrato | Limites |
| --- | --- | --- |
| `vfx-flow3d.js`: `energyMaterial(T,preset,options)` | GLSL com noise advectado, deformação normal, núcleo, transparência e dissolução. Presets `celestial`, `cinder`, `crimson`, `violet`. `flame:1` suaviza línguas até a ponta. | Duas oitavas, sem raymarch, bloom ou textura externa; `detail` ajustado por qualidade. |
| `energyBody(T,parent,preset,options)` | Corpo fechado lobado com frente em +Z e cauda em -Z. `update(time,{position,dir,radius,length,alpha,quality,dissolve})`. | Geometria criada uma vez; normalmente 30×14 anéis/lados. Portal usa 48×24 para evitar facetas. |
| `flameGeometry(T)` | Língua de chama curva; base em Y=0, ponta em +Y, curva para -Z. Própria para instancing. | 120 triângulos; não criar uma malha/material por língua. |
| `vfx-trail3d.js`: `volumeTrail(T,parent,preset,options)` | `update(time,point,emitting,quality)` amostra posições reais; seção fechada com twist, largura e vida decrescentes. | Buffer circular de 32–44 amostras nos consumidores atuais; sem geometria por frame. |
| `vfx-impact3d.js`: `impactDirector(T,parent,ground,{capacity,onImpact})` | `emit({id,time,point,size,preset,kind,dir})` recebe registro de colisão autoritativo. `update(time,quality)` expande pressão, fragmentos, fissuras, poeira, brasas e luz no solo. | 4 slots no dragão, 5 nos portais; 240 fragmentos, 96 partículas de poeira, 160 brasas. Reutiliza o slot mais antigo. |
| `skill-scenery3d.js`: `sceneryPoint(p,world)` | Consulta alturas dos troncos, rochas e construções existentes; o sweep físico fornece as amostras do volume. | Não altera colisão do jogador/NPC nem usa raycast da malha. |
| `vfx-dragon-model3d.js`: `dragonHead` / `dragonBody` | Cabeça com mandíbula articulada, sobrancelhas, crina e bigodes; corpo amostrado por distância no histórico da cabeça. | 128×16 segmentos radiais, 76 m de histórico visível; até 256 línguas instanciadas. Sem esferas encadeadas. |

Cada componente expõe `dispose()`. Trails e ImpactDirector expõem `clear()`; os wrappers das skills
fazem limpeza no cancelamento, término e reinício do relógio. `clear()` reaproveita buffers; `dispose()`
libera geometria/material quando o dono é removido definitivamente. Não chamar `dispose()` a cada cast.
IDs de impactos são únicos **dentro de um cast**; o director rejeita duplicatas e limpa os IDs entre casts.
Eventos futuros (segunda expansão da explosão) ficam invisíveis até o seu timestamp.

## Exemplo de integração

```js
const body = energyBody(THREE, root, 'crimson', {tail: 3});
const trail = volumeTrail(THREE, root, 'crimson', {capacity: 32, life: .7});
const impacts = impactDirector(THREE, root, groundHeight, {capacity: 5});
// A FSM física calcula posição e direção; a qualidade só muda apresentação.
body.update(skill.time, {position: flow.p, dir: flow.direction, quality});
trail.update(skill.time, flow.p, flow.phase === 'flight', quality);
if (flow.endAt >= 0) impacts.emit({
  id: `contact-${flow.i}`, time: flow.endAt, point: flow.at,
  size: 2.2, preset: 'crimson', kind: 'lance', dir: flow.direction
});
impacts.update(skill.time, quality);
```

Som, reação do inimigo e hitstop são conectados aos mesmos eventos da FSM no bridge de
`mundo-3d-prototype.js`. `onImpact` é uma extensão opcional para consumidores futuros, não uma segunda
fonte de dano/som. A iluminação transitória atual é um decalque conformado ao terreno: não muda a
quantidade de luzes e não recompila todos os materiais do mundo durante o ataque.

## Implementações e física

- **Portais**: duas origens, lançamento no mesmo tick, vetores capturados no lançamento e imutáveis.
  Abertura .45 s; avanço 1.5–3 s; pressão 1.35 s com três pulsos; compressão .42 s; expansão dupla e
  dissipação. Cada corpo pode contatar cápsulas sobrepostas; mapa por ID impede multiplicar o orçamento.
  Dano base máximo por alvo: 2×6 no contato + 2×3×4 na pressão + 22 no final = **58**. Arredondamento
  cumulativo preserva o total com multiplicadores. Sair do contato evita pressão; paredes bloqueiam.
- **Dragão**: canalização, espiral, ascensão, fogo físico da boca, mergulho, mandíbula, mordida e
  explosão. Bola percorre um vetor 3D capturado na emissão, com sweep a cada tick contra cápsula,
  terreno e obstáculos com altura real. Uma parede de 4 m pode ser sobrevoada; uma fachada alta intercepta o projétil. Dano base 16 + 22 + 28 = **66**. A criatura não transporta bosses. Cabeça e
  corpo são originais, sem GLB novo nem alteração no rig do herói. A câmera abre temporariamente
  inclusive em 1ª pessoa e retorna à preferência original sem gravá-la.
- **X**: preserva velocidade 16 m/s, tamanho duplo e travessia de 7 m após o primeiro contato,
  hit único e colisão com paredes. Acrescenta fluxo ao volume do X, trilha fechada e ImpactDirector.

Mana, cooldown, loja, IDs de save e regras de desbloqueio são preservados.

## Laboratório e validação

`mundo-3d-prototype.html?vfxLab236=1&v=236` abre o treino com as três skills equipadas. Seletor de
alvo parado/móvel/solo/parede, qualidade e contadores usam a cena, renderer, câmera e colisões reais.
O progresso é isolado pelo mesmo armazenamento efêmero dos outros treinos. Nenhum painel aparece
na campanha. `?debug3d=1` acrescenta `SevenSinsDebug3D.vfxState()` apenas para QA.

`skills-mod233-preview.html?skill=dragon|portals|x` é a cena reduzida para inspecionar geometria,
shaders e custos isolados, com `window.preview` para avanço determinístico e câmera livre.
Não confundir FPS dessa prévia com FPS da campanha.

Rodar `node --test *.test.mjs`. `vfx-engine236.test.mjs` cobre morte no mesmo frame, saída do contato,
alvos sobrepostos, reuse/cancelamento, ordem das fases, origem física da bola, vetor fixo, solo,
pausa e manutenção da posição de boss. Os testes anteriores continuam cobrindo X, dano/MP/CD,
colisões, câmera, espadas, saves e roteiro. Evidências de navegador e limitações de medição ficam
em `docs/evidencias/mod236/`; não equivalem a um teste em Android físico.
