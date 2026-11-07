# Publicação separada — código privado, jogo público

**Estado:** a infraestrutura de empacotamento foi adicionada, mas **não converteu o repositório atual em privado e não migrou a URL pública**. A publicação em segundo repositório só funciona depois da configuração manual do destino e do token. Preserve o jogo publicado até validar o novo endereço.

## Problema resolvido (e limites)

O código original hoje vive no repositório público `PHBritoDev/Jogo-2-2.5D`. Uma cópia desse repositório expõe scripts de criação, roteiros de produção, testes, documentos de direção e também o código/browser assets. Não é possível apagar cópias que terceiros já fizeram.

O script `tools/public-release/build.cjs` produz `dist-public/` com somente **arquivos estáticos da raiz necessários/compatíveis com o jogo e seus testes visuais**: HTML, JS minificado levemente, CSS, GLB, imagens, áudio, vídeo e outros formatos para navegador. Ele **não** publica `docs/`, `tools/`, `.github/`, arquivos .md, `.mjs`, `.py`, arquivos de edição e outros conteúdos internos.

**O script não criptografa nem esconde GLBs, scripts ou texturas carregados pelo jogo**. Eles seguem acessíveis no navegador e a proteção é parcial. Minificação é otimização/obstáculo leve, NÃO DRM. Copyright e SHA-256 ajudam na rastreabilidade, não bloqueiam cópias.

O `release-manifest.json` do build registra a origem e hashes SHA-256 de todos os arquivos publicados; o workflow valida todos os hashes antes de liberar o artefato. Não é assinatura criptográfica de identidade: quem reedita o projeto pode gerar um novo manifesto.

## Passos para ativar a separação com segurança

1. No GitHub, crie um **novo repositório PÚBLICO** separado, por exemplo `PHBritoDev/Jogo-2-Distribuicao`, inicializado com README. Esse repo conterá **somente o conteúdo gerado** pelo workflow. Não importe o código-fonte ou histórico do repo antigo.
2. Em `PHBritoDev/Jogo-2-2.5D` > Settings > Secrets and variables > Actions:
   - Repository **variable** `PUBLIC_GAME_REPO` = `PHBritoDev/Jogo-2-Distribuicao`;
   - Repository **secret** `PUBLIC_GAME_DEPLOY_TOKEN`: token de acesso **fine-grained**, limitado apenas ao repo público de distribuição, com **Contents: Read and write**. Nunca enviar token no chat, em código, prints ou commits.
3. Na aba Actions do repositório-fonte, executar **Private-source readiness / public game build** manualmente com `publish=false`, verificar os testes, baixar o artifact e validar na hospedagem de teste. Esse é o modo padrão.
4. Executar o mesmo workflow com **`publish=true`**. Ele copia o artefato validado para o branch `gh-pages` do repo público de destino, com commit normal, **sem force push** e sem enviar arquivos do Git-fonte.
5. No repositório de distribuição, Settings > Pages > Deploy from a branch > `gh-pages` > `/(root)`. Abra a nova URL `https://phbritodev.github.io/Jogo-2-Distribuicao/`; teste o jogo no Android, scripts, GLBs, controles, saves, áudio, roteiros, lab e cenas. **A nova URL é diferente** de `Jogo-2-2.5D` (os dados guardados no navegador podem ficar separados por origem/caminho).
6. Somente quando o destino estiver **realmente funcionando**, converta o repositório **fonte antigo** em privado, respeitando o plano do GitHub, e mantenha as próximas publicações pelo workflow. Este passo requer controle de Settings e pode interromper o link antigo; comunicar aos jogadores a nova URL ou usar domínio próprio sob seu controle. Não privar repo durante testes apenas porque o workflow passou.
7. Para continuar desenvolvendo com Claude/Codex, conceda acesso **somente ao repositório privado fonte** a colaboradores/integrações que precisam dele. Não dê permissão ao token do repositório de distribuição para escrever no código-fonte.

**Nota:** em planos GitHub Free, Pages de repositórios privados pode não estar disponível. O repositório público de distribuição mantém a publicação acessível, e o privado guarda fontes que NÃO precisam rodar no Chrome. Veja [GitHub Pages docs](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site).

## Execução técnica e verificação

```bash
npm install --no-save --no-package-lock --ignore-scripts esbuild@0.25.12
node tools/public-release/build.cjs
node --test tools/public-release/verify-release.test.mjs
python3 -m http.server 4173 --directory dist-public
```

O script faz build a partir dos arquivos de primeiro nível do repo: **é deliberadamente conservador**, preserva as páginas HTML de laboratório e todos os assets principais, mesmo que nem todos sejam usados no jogo principal. Melhorar o grafo de dependências antes de reduzir GLBs ou imagens: excluir assets referenciados dinamicamente pode causar tela preta e perda de modelos. Repositórios contendo scripts legados não modulares podem quebrar se forem agressivamente empacotados em um único bundle.

### O que foi intencionalmente evitado

- Não tornamos o repo atual privado nem trocamos Settings > Pages automaticamente.
- Não criamos login de jogador nem exigimos pagamento para jogar.
- Não instalamos DRM invasivo, bloqueio de DevTools ou script antidebug; isso é facilmente contornado e pode derrubar o FPS Android.
- Não removemos arquivos do código-fonte nem reescrevemos o histórico existente.
- Não colocamos senhas, chaves de API ou segredos no JavaScript do navegador.
- Não afirmamos que arquivos entregues ao Chrome se tornaram impossíveis de copiar.

## Próxima arquitetura de segurança, se o jogo tiver multiplayer/economia real

Para validações críticas (compras, moedas, inventário online, rankings), criar backend com autenticação, autorização por usuário, validação no servidor e limites de requisição. O jogo **não** deve confiar em valores de moeda enviados diretamente pelo Chrome. Isso é uma fase separada; não deve ser implementada só para esconder assets 3D.
