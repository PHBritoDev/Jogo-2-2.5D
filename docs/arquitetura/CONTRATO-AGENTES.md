# Contrato de trabalho paralelo — Claude, Codex e outros

## Regra essencial
Cada IA trabalha em **branch independente**, cria PR de escopo limitado e jamais faz push/merge na branch de outra. A main só muda por merge aprovado. **Não rebase/force-push de trabalho de outra IA**. Antes do merge, atualizar branch e testar o conjunto. A autonomia não autoriza remover testes, proteger regressões por mocks falsos nem inventar screenshots.

## Domínios e zonas de responsabilidade
- Eldória: `eldoria-*.js`, modelos/assets da vila, roteiro de Eldória, `docs/eldoria/`. **Não atualizar IDs de build nos carregadores**.
- Dimensões: `dimension-arenas3d.js` apenas quando necessário registrar nova dimensão; o conteúdo de cada uma em `zarkhael-*.js`, `vorgazhek-*.js` etc.; testes dedicados. Não editar assets da cidade.
- Combate: módulos `combat-*.js`, `sword-*.js` e testes; modificações no controlador principal só se estritamente necessárias, com diff pequeno. Não reescrever habilidades de outros bispos.
- Arquivos de **integração compartilhada**: `mundo-3d-prototype.js`, `mundo-3d-prototype.html`, `mod181-loader.js`, `index.html`, `laboratorio-inimigos.html`, `dimension-arenas3d.js`. **Nenhum agente deve sobrescrever o arquivo inteiro com versão antiga**; usar patches mínimos por função/bloco, base atualizada e comparar com main antes de PR. Considerar módulos exportando funções e 1 hook de chamada onde cabível.
- **A versão da publicação passa a existir SOMENTE em `build-info.js`** (`MOD`, `BUILD`, `DESCRIPTION`). Apenas o responsável pela integração final atualiza esse arquivo, preferencialmente depois de mesclar outras alterações; Claude e Codex NÃO devem alterar o número de versão em HTML, carregadores, arquivos de testes ou em `mundo-3d-prototype.js`.

## Protocolo de integração
1. Implementar funcionalidade no módulo específico; evitar editar global `BUILD`, título/marker da página ou números de URL de cache.
2. Se precisar alterar um ponto de integração, fazer **patch mínimo**, justificar no PR e testar todos os fluxos afetados.
3. Revisar PRs paralelos que tocam os mesmos pontos de integração, **não sobrepor alterações sem mesclar semanticamente**.
4. Validar testes de domínio, parse JS, abrir jogo real (PC + viewport mobile), regressão de entrada/saída em dimensões e avanço de campanha. Android físico é validação adicional, não substituível por SwiftShader.
5. Não mesclar se o PR contiver conflitos, assets não auditados, falhas novas de teste ou perda de outra branch.
6. Depois do merge, **um único commit de release** atualiza `build-info.js` para invalidar cache. Não alterar cinco arquivos para trocar `296`.

## Status
Isto reduz **conflitos por versão e cache**; não elimina conflitos lógicos quando duas IAs alteram o controlador do mundo 3D. A migração completa do controlador em módulos é futura, incremental e exige regressões; proibido refatorar 7 mil linhas em uma PR só.
