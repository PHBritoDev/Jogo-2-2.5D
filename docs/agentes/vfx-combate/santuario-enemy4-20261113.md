# Auditoria VFX — Santuário do Enemy4 (13/11/2026)

## Escopo e conflitos
- PRs abertos consultados em 13/11: VFX #487, #493, #494, #497, #499; combate #486; áudio #490, #492, #495, #496, #498, #500; ambiente #489 e iluminação #488. Este trabalho toca somente arquivos novos de QA/documentação e **não altera** `enemy4-vfx3d.js` até confirmar evidências.
- Código principal em `enemy4-vfx3d.js`, `drawSanctum(s,boss)`, com quatro estados: `warn`, `charge`, `pillar`, `fade`. A lógica e o raio real pertencem a `enemy4-squad3d.js`; jamais modificar hitbox, dano, cooldown ou tempo.
- A marca usa `InstancedMesh` com shader `MARK`; há pilar de núcleo e casca separados, fitas e brilho. A marca preenche de 0 a 0.8 no aviso e 0.8 a 1 na carga. Risco a verificar: contraste do círculo contra pisos claros, leitura lateral do pilar e clareza de transição `charge → pillar`.

## Protocolo
- Laboratório WebGL com seis capturas: `warn-early`, `warn-late`, `charge`, `pillar`, `pillar-side`, `fade`. Workflow [VFX Enemy4 Sanctum QA](https://github.com/PHBritoDev/Jogo-2-2.5D/actions/workflows/vfx-enemy4-sanctum-qa.yml).
- Relatório JSON por frame: draw calls, triângulos, geometrias, texturas, contagens instanciadas. Orçamento inicial de alerta: >18 draw calls ou texturas não previstas; valores são da cena isolada, não do jogo inteiro.
- Fontes técnicas: [InstancedMesh](https://threejs.org/docs/#api/en/objects/InstancedMesh), [WebGLRenderer.info](https://threejs.org/docs/#api/en/renderers/WebGLRenderer), [ShaderMaterial](https://threejs.org/docs/#api/en/materials/ShaderMaterial).
- **Ainda não há comparação antes/depois** nem ganho de FPS validado. Somente implementar alteração visual se fotos demonstrarem defeito. Não afirmar desempenho Android a partir de SwiftShader.

## Próxima ação
Aguardar execução do workflow, inspecionar PNGs e JSON; decidir se o efeito deve ser preservado ou se cabe melhoria visual pequena. Manter PR em rascunho sem merge.

## Resultado do agente WebGL (execução 13/11)
- [Execução #43470300703](https://github.com/PHBritoDev/Jogo-2-2.5D/actions/runs/43470300703): **sucesso**; artefato `vfx-enemy4-sanctum-qa` com 6 PNG e `report.json`.
- Imagens inspecionadas: `warn-late.png` mostra círculo completo, runas e preenchimento progressivo legíveis em piso cinza; `pillar.png` mostra núcleo rosa e lâminas negras verticais com anéis no solo. Silhueta volumétrica e raio do aviso reconhecíveis.
- Métricas por estágio: aviso 4 draw calls / 4 triângulos; carga 5 / 22; pilar oblíquo e lateral 7 / 92; dissipação 7 / 90. Geometrias 14 e texturas 0 em todos. Contagem de triângulos é do renderizador na cena isolada, não o total geométrico carregado.
- Decisão: **preservar o Santuário existente**. Não foi constatado defeito visual inequívoco nas fotos que justifique alterar o shader ou criar efeitos extras. Nenhum arquivo de produção alterado.
- Limitações: laboratório não tem personagem nem bioma real; não comprova contraste em toda iluminação, FPS Android ou qualidade durante múltiplos ataques. Próxima rodada deve escolher outro poder não auditado, sem repetir este QA.
