# A Batalha Contra os 7 Pecados Capitais

RPG de ação **3D para navegador**, desenvolvido com Three.js, com foco em Android. A Galáxia 1 inclui campanha, combate, dimensões de chefes, poderes e cenas cinematográficas.

**[Abrir o jogo](https://phbritodev.github.io/Jogo-2-2.5D/)** · [Dimensões de teste](https://phbritodev.github.io/Jogo-2-2.5D/laboratorio-inimigos.html)

## Para desenvolver — humanos e IAs

1. **Comece por [AGENTS.md](AGENTS.md)** (regras permanentes).
2. **Veja o [Guia rápido de arquitetura e arquivos](docs/GUIA-PARA-IAS.md)** para encontrar o módulo correto, o teste e o fluxo de PR.
3. Consulte [ARQUITETURA.md](ARQUITETURA.md) para a campanha; [Visão Mestra](docs/VISAO-MESTRA-QUALIDADE-VISUAL-E-GAMEPLAY.md) para a direção artística; e [Prompt Mestre](PROMPT_MESTRE_DO_JOGO.md) para objetivos e histórico. **Se houver divergência com o histórico 2D, o código atual/ARQUITETURA.md prevalecem.**

## Pontos de entrada e testes

- Entrada: `index.html` → `mundo-3d-prototype.html` → `mod181-loader.js` → `mundo-3d-prototype.js`.
- Biblioteca de sistemas e poderes: módulos `*.js` na raiz. Modelos `*.glb` e imagens também estão na raiz por dependências históricas de caminhos relativos.
- Testes de regras: `node --test` (Node.js 22+).
- Contrato do guia para IAs: `node tools/qa/check-ai-onboarding.mjs`.
- Evidência visual no [laboratório GitHub Actions](https://github.com/PHBritoDev/Jogo-2-2.5D/actions/workflows/laboratorio-visual.yml); instruções em [tools/visual-lab/README.md](tools/visual-lab/README.md).

**Importante:** não mova modelos, módulos ou páginas indiscriminadamente. O carregador reescreve caminhos no runtime e o projeto contém testes e URLs de prévias que dependem da estrutura atual. Refatorações devem ser graduais, com PR, regressão e teste no navegador. O teste WebGL em nuvem **não** equivale a FPS/controles no Android real.
