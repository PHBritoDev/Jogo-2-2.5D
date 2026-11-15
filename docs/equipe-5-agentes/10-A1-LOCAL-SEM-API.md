# Piloto A1 externo — IA local, sem chave, sem assinatura paga

**Complemento** dos seis chats A1–A6, não os substitui. **Não está ativo na main** enquanto esta PR não for integrada.

## Funcionamento
- GitHub Actions verifica a cada **15 minutos**, ou quando uma Issue recebe o rótulo `agente-local-a1`. É uma checagem, **não um despertar de chat**.
- Sem Issue pendente com essa etiqueta, **não baixa modelo e não executa IA**.
- Com uma Issue pendente, GitHub Actions baixa/cacheia o modelo Qwen2.5-Coder 1.5B Instruct Q4_K_M (~1 GB; Apache-2.0), compila/carrega `llama.cpp` e gera um diagnóstico de bugs, comentando na Issue.
- Um relatório por Issue; até **uma Issue por execução**. Issue e saída do modelo são dados não confiáveis. O agente **não edita código, não abre PR, não faz merge, não roda comandos sugeridos pela IA**. O modelo pequeno pode errar e precisa de revisão humana/ChatGPT.
- Os testes de validação de correção automática serão a **próxima fase**, se este piloto provar funcionalidade real. Não alegar conserto se só houver comentário.
- Uma tarefa de verificação de GitHub Actions a cada 15 min está sujeita a atrasos, políticas e limites. Runner padrão é gratuito para repositório público; isso não é promessa de recursos ilimitados nem funcionamento 24/7.
- Mantém Claude/caverna isolados e não interfere na central #519.

## Teste depois do merge
1. Abra GitHub → Issues → New issue. Documente um bug reproduzível **fora da caverna do Claude**.
2. Crie/aplique rótulo `agente-local-a1`.
3. GitHub → Actions → **A1 local gratuito - triagem por modelo aberto** → Run workflow, ou aguarde execução programada.
4. Verifique Actions e comentário na Issue. Se houver erro de download, compilação, cache ou inferência, registre o log e corrija a PR antes de expandir.
5. Para parar: Actions → workflow → Disable workflow. Não precisa cadastrar chave nem cartão.

## Aviso de implementação
A ferramenta usa modelo compacto de ~1 GB e CPU, podendo ser lento. A primeira execução pode consumir tempo com download e compilação. Os testes reais de execução ainda não ocorreram; este é um piloto. Não usar diagnósticos como autorização para merge.

## Fontes
- Modelo: https://huggingface.co/bartowski/Qwen2.5-Coder-1.5B-Instruct-GGUF
- Motor de inferência: https://github.com/ggml-org/llama.cpp
- Runner público: https://docs.github.com/en/actions/concepts/billing-and-usage
