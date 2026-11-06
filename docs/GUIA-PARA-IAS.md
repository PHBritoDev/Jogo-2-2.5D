# Guia operacional para IAs e desenvolvedores (06/11/2026)

**Objetivo:** permitir que um agente novo encontre o arquivo certo sem reescrever o RPG, romper importações ou repetir bugs. Este guia é de navegação; o código verificado no commit/branch do trabalho é a fonte de verdade técnica.

## Leia nesta ordem

1. [AGENTS.md](../AGENTS.md) — limites, padrões, instruções para agentes e prevenção de regressões.
2. [ARQUITETURA.md](../ARQUITETURA.md) — topologia do jogo e roteiro técnico da Galáxia 1.
3. [Visão Mestra](VISAO-MESTRA-QUALIDADE-VISUAL-E-GAMEPLAY.md) — fidelidade visual, identidade própria e limites mobile.
4. [Prompt Mestre](../PROMPT_MESTRE_DO_JOGO.md) — direção histórica, **não** documentação infalível do estado atual; a parte de migração 2D está obsoleta.
5. Roteiro integral em `docs/GALAXIA-1-ROTEIRO-INTEGRAL-E-DIRECAO.pdf` se a tarefa for narrativa; material de histórico em `docs/roteiro` e `docs/auditorias`.

## Mapa de navegação do código

| O que você quer alterar | Comece por | Validação inicial |
| --- | --- | --- |
| Página pública, tela inicial e cache | `index.html`, `mundo-3d-prototype.html`, `mod181-loader.js` | `enemy1-integration.test.mjs`; abrir HTML real |
| Mundo/câmera/combate integrado | `mundo-3d-prototype.js`, `world3d-terrain.js`, `combat-rig3d.js` | testes de terreno e combate + WebGL |
| Campanha e atos 1–6 | `act1-flow.js` … `act6-flow.js`, `prologue-flow.js`, `cutscenes3d.js` | testes `act*-flow.test.mjs` e cenários |
| Regras de poderes/loja/progressão | `powers3d.js`, `skills3d.js`, `progression3d.js`, `ultimates3d.js` | testes homônimos + integração |
| Combate de esquadras e inimigos | `enemy1-squad3d.js`, `enemy1-squad-runtime3d.js`, `enemy2-squad3d.js`, `enemy3-squad3d.js`, `enemy4-squad3d.js` | testes `enemy*-squad.test.mjs` |
| Bispo 1 — VHAZRAEL | `vhazrael3d.js`, `vhazrael-rupture3d.js`, `vhazrael-vfx3d.js` | `vhazrael.test.mjs` + preview |
| Bispo 2 — VORGAZHEK | `vorgazhek-*.js` | testes `vorgazhek-*.test.mjs` + preview |
| Bispo 3 — ZAR’KHAEL | `zarkhael-hydra3d.js`, `zarkhael-blackflame3d.js`, `zarkhael-six-seals-ultimate3d.js` | testes `zarkhael-*.test.mjs` + fase WebGL |
| Bispo 4 — VÉRAXION | `veraxion-four-swords3d.js`, `veraxion-blue-cyclone3d.js`, `veraxion-lunar-ultimate3d.js` | testes `veraxion-*.test.mjs` + cinematográfica |
| Render, VFX e efeitos compartilhados | `celestial-fxkit3d.js`, `vfx-flow3d.js`, `sakuga-impact3d.js`, `*-vfx3d.js` | testes da família + câmera e pixels |
| Dimensões e arenas | `dimensions3d.js`, `dimension-arenas3d.js` | `dimensions3d.test.mjs` + gameplay |
| HUD, áudio e controles | `hud3d.css`, `cine3d.css`, `audio3d.js`, `mundo-3d-prototype.html` | teste em retrato/paisagem e toque |
| Modelos GLB e animação | GLBs na raiz, `tools/blender/`, `combat-rig3d.js` | auditar clips/rig/escala + browser + Android |
| Agente de testes e gravações | `tools/visual-lab/`, `.github/workflows/laboratorio-visual.yml` | `node --test tools/visual-lab/*.test.cjs`; artifacts |

**Atenção:** os sistemas podem ter chamadas de integração em `mundo-3d-prototype.js`. Edite tanto o módulo específico quanto seu chamador somente após verificar assinaturas, ciclo de vida e limpeza.

## Como o jogo carrega

`index.html` cria o iframe → o HTML 3D carrega `mod181-loader.js` → o loader reescreve URLs de módulos e assets antes da importação. **A raiz plana é uma dependência histórica de URLs relativas, não uma sugestão para colocar novos arquivos sem critério.** Não mova pastas/GLBs só para melhorar a aparência do GitHub: exija inventário de dependências, prova de carregamento, análise de cache e plano de rollback.

O arquivo `mundo-3d-prototype.js` é grande; **não reescreva tudo**. Para cada nova função, prefira um módulo coeso com contrato exportado e teste, ligado ao mundo principal por uma integração pequena. Evite duplicar lógica de VFX/câmera, criar magias fallback genéricas ou adicionar downloads pesados desnecessários.

## Processo mínimo de mudança

1. Confirme `main`, commit, PRs em curso e as ordens **mais recentes** do criador. Use branch específica; evite modificar em paralelo o mesmo arquivo.
2. Ache o caminho real de importação/call-site e os módulos afetados. Preserve nomes de GLB/clipes, dimensões, cooldowns, colisões, saves, câmera e performance.
3. Adicione teste reproduzível; execute `node --test` quando possível e **não invente resultado**. Valide syntax/imports, cena no navegador, capturas e console.
4. Se **mudar código servido ao jogador**, atualize juntos marcador da Mod em `mundo-3d-prototype.html`, `mod181-loader.js` (`BUILD`), URL do loader e `index.html` (`refresh/build`), conforme `ARQUITETURA.md`. Mudanças **só de documentação não exigem** nova Mod.
5. Para mudanças visuais, use [o laboratório](../tools/visual-lab/README.md), compare **imagens/vídeos**; sucesso de CI não prova arte boa, nem FPS no Android.
6. Submeta PR pequeno e reversível; explique arquivos, testes executados, pendências e risco. Não mescle trabalho não validado nem corrija falhas apagando testes.

### Comandos úteis

```sh
node --test
node --test tools/visual-lab/*.test.cjs
node tools/qa/check-ai-onboarding.mjs
node --input-type=module --check < mundo-3d-prototype.js
```

Testes Playwright em nuvem: [GitHub Actions](https://github.com/PHBritoDev/Jogo-2-2.5D/actions/workflows/laboratorio-visual.yml). Em caso de falha, baixe o artifact e leia `rodadas/rodadas.json`, `rodada-N/executor.log`, `agente/agente-relatorio.json`, PNGs e vídeo. Nunca classifique uma habilidade como validada apenas porque `kitMove()` retornou um nome: exija fase observada no runtime.

## Segurança para a próxima expansão

- Não mudar sistemas estáveis sem regressão: jogo publicado precisa continuar funcionando.
- **Não trocar ou mover modelos agora.** Há uma futura fase de modelos com mais animações/faces, mas isso exige um contrato de GLB e performance; consulte `docs/agent-memory/CONTRATO-MODELOS-3D-FUTUROS.md`.
- Congelamentos artísticos definidos pelo criador prevalecem (como o monstro da ultimate lunar, quando indicado). Não reintroduza poderes genéricos removidos.
- Revisão atual de QA: [issue #399](https://github.com/PHBritoDev/Jogo-2-2.5D/issues/399). PRs em aberto devem ser consultados no momento da mudança; este documento não garante estados futuros.
- Nunca colar prompts enormes no chat do criador: briefings extensos devem ficar em arquivo e receber link.
