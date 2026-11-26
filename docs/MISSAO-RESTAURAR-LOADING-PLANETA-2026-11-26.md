# Missão — Restaurar a tela cinematográfica de carregamento do planeta

Data: 2026-11-26
Repositório: PHBritoDev/Jogo-2-2.5D
Branch de trabalho: criar uma branch própria a partir de `main`; entregar por PR.

## Objetivo obrigatório

A tela que aparece antes de entrar no planeta, enquanto o jogo baixa os módulos, modelos, texturas e animações, está visualmente genérica e desatualizada. O criador quer recuperar a versão anterior que era bonita, cinematográfica e bem organizada — não quer manter o visual genérico atual.

**Prioridade máxima: localizar e restaurar a implementação visual anterior aprovada pelo criador. Não inventar outro layout antes de investigar o histórico.**

## Investigação antes de editar

1. Inspecione o histórico Git de `mundo-3d-prototype.html`, `mod181-loader.js`, `module-warm.js`, CSS, arquivos de arte/galáxias e quaisquer componentes de loading.
2. Procure commits, branches e PRs anteriores que tenham implementado ou refinado a tela de carregamento do planeta. Use diffs e versões antigas dos arquivos para encontrar a última versão visual completa e não genérica.
3. Diferencie a tela de seleção das sete galáxias da tela de carregamento dos recursos do planeta. O pedido é sobre a tela de carregamento que aparece enquanto o planeta está sendo preparado.
4. O criador já descreveu a versão desejada como bonita, organizada e cinematográfica, alinhada à identidade de “A Batalha Contra os 7 Pecados Capitais”: fantasia sombria, mistério, anjos/demônios e atmosfera infernal. Em conversa anterior, aprovou uma direção visual com planeta principal em destaque, composição galáctica e elementos secundários organizados. Preserve a identidade e a versão histórica que encontrar; não faça uma tela genérica de barra/progresso.
5. Se encontrar mais de uma versão, prefira a mais recente que represente o visual aprovado e funcional. Registre no PR o commit/arquivo histórico usado como referência.

## Requisitos de implementação

- Restaurar a tela visual anterior; substituir a aparência genérica atual.
- Manter informação de progresso real, usando os eventos/contagem reais de `warmModuleGraph` (ex.: módulos baixados de total), sem inventar porcentagens ou progresso falso.
- Mostrar com hierarquia visual clara o estado atual: preparando planeta, baixando módulos/recursos e carregando modelos/animações, conforme os dados reais disponíveis.
- Manter feedback de erro legível, arquivo/URL real quando disponível e botão de tentar novamente.
- Não esconder nem bloquear erros reais.
- Animações leves, sem loop pesado, sem carregar modelos 3D adicionais só para decorar a tela e sem causar queda de FPS no celular.
- Layout responsivo: Android em retrato e paisagem, além de desktop. Nada pode ficar cortado atrás das barras do sistema ou do botão de entrar.
- A tela deve permanecer visível até o mundo estar realmente pronto; não liberar entrada antes da condição de prontidão já existente.
- Respeitar acessibilidade básica: contraste, texto legível e estados anunciados sem excesso.

## Limites críticos — não quebrar o carregamento

- **Não remover nem enfraquecer** `warmModuleGraph`, `fetchText`, tentativas limitadas, cache-busting, reescrita de imports/paths, tratamento de falhas, `import(blob)` ou a lógica de prontidão.
- Não alterar o grafo de módulos, a ordem de inicialização, a lógica do mundo, combate, campanha, save ou painel ADM para fazer a tela parecer pronta.
- Não substituir progresso real por timer, porcentagem estimada ou animação que finja estar carregando.
- Não apagar a tela de carregamento inteira: remover somente o visual genérico e restaurar a apresentação correta.
- Não reverter arquivos inteiros para um commit antigo. Faça port seletivo apenas do componente visual e integre-o à implementação atual.
- Não tocar em mudanças de outros agentes fora do escopo.

## QA obrigatório

1. Rodar testes existentes relacionados ao carregamento e adicionar testes para atualização de progresso, estado de conclusão, falha e retry se necessário.
2. Validar que o jogo continua esperando a prontidão real antes de liberar a entrada.
3. Verificar que um erro de módulo continua exibindo diagnóstico e permite tentar novamente.
4. Conferir visualmente Android retrato/paisagem e desktop com capturas/evidências. Se não houver navegador/dispositivo real disponível, declarar isso claramente; não alegar validação visual não executada.
5. Confirmar que nenhum arquivo de mundo/combate/save foi alterado fora do necessário.

## Entrega

- Criar PR para `main`, sem fazer merge automático.
- Descrever o commit histórico que serviu de base e listar arquivos alterados.
- Anexar evidências visuais e resultados dos testes.
- Atualizar `build-info.js` e cache-busters somente quando a alteração estiver integrada na branch de publicação, usando o próximo Mod livre.
- Não encerrar com apenas análise ou briefing: implementar, testar e abrir a PR.
