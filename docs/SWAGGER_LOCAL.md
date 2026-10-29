# Swagger local (ferramenta opcional)

Swagger UI é uma página para consultar o contrato HTTP e executar requisições. Não faz parte do escopo básico do desafio: é uma ferramenta local de apoio à exploração. Visão geral das ferramentas opcionais em [OPTIONAL_TOOLS.md](OPTIONAL_TOOLS.md).

## Estado

- Entrypoint próprio, `scripts/swagger/main.ts`: monta a mesma API financeira de produção (`createFinancialHttpApp`) e acrescenta somente `/docs` e `/openapi.json`. O bootstrap, os controllers e o schema não são alterados.
- A especificação OpenAPI 3.0.3 é mantida manualmente em `scripts/swagger/openapi.json`; mudanças nos controllers precisam ser refletidas nela. Não há geração por decorators.
- Swagger UI **5.34.0** fica fixado em `scripts/swagger/package.json` e `bun.lock` próprios. Nada é adicionado ao `package.json` principal e não há CDN: os assets são servidos localmente.
- Recusa iniciar com `NODE_ENV=production` ou sem `FINANCIAL_API_ENABLED=true` e `AUTH_MODE=local-development`, antes de abrir o banco. Exige o login restrito de runtime, como a API normal.
- Não há autenticação real. O "Try it out" envia requisições reais: os POSTs criam dados no banco usado. Use apenas dados sintéticos e uma infraestrutura local.

## Iniciar

1. Suba a infraestrutura e provisione o login restrito (`.env` com `RUNTIME_DB_PASSWORD`, conforme o [README](../README.md)):

   ```bash
   docker compose -f compose.yaml -f compose.app.yaml up -d --build --wait localstack provision
   ```

2. Instale os assets do Swagger UI (uma vez):

   ```bash
   bun run tools:swagger:install
   ```

3. Inicie o servidor. Use a mesma senha do `RUNTIME_DB_PASSWORD` e uma porta diferente de 3000 se a API do Compose estiver ativa:

   ```bash
   DB_PORT=5546 DB_USER=ballance_runtime DB_PASSWORD='<RUNTIME_DB_PASSWORD>' DB_SCHEMA=financial \
   SQS_ENDPOINT=http://127.0.0.1:4567 FINANCIAL_API_ENABLED=true AUTH_MODE=local-development \
   PORT=3100 bun run tools:swagger
   ```

Endereços: **http://127.0.0.1:3100/docs** (interface), `/openapi.json` (contrato) e `/health/ready`. Para encerrar, `Ctrl+C`: o servidor trata o sinal e fecha o ORM.

Sem o worker (`up ... worker`), eventos do outbox ficam pendentes e nenhuma mensagem SQS é consumida; isso não afeta a exploração dos endpoints.

## Roteiro de estudo

1. Abra `GET /health/live`, clique **Try it out** e depois **Execute**: espere HTTP 200.
2. Em `POST /wallets`, use um playerId UUID novo e saldo `"100.00"`. Execute e copie o `id` da resposta.
3. Em `POST /wagering/transactions`, preencha a carteira e o mesmo jogador; use BET `"25.00"`, provedor/identidade externa próprios e uma chave idempotente, por exemplo `swagger-local:bet-002`.
4. Execute: saldo esperado `75.00`. Repita chave/corpo sem alterações: replay true, sem outro débito.
5. Mude a quantia mantendo chave/identidade: HTTP 409, sem reaplicar efeito. Não troque apenas a chave da mesma identidade externa esperando uma operação nova.
6. Consulte carteira, ledger e reconciliação; a consulta atual reflete o saldo presente e o replay preserva seu resultado histórico.

Os valores de exemplo do formulário não são gerados a cada envio. Repetir jogador/moeda na criação resulta em conflito 409; para outra rodada, use novas identidades. Dinheiro é texto decimal, como `"25.00"`. LOSS exige zero; demais tipos externos exigem positivo. REFUND/ROLLBACK exigem referência integral válida; WIN pode ter referência opcional. OPENING é somente interno.

## Validação

- Três testes unitários (`tests/unit/swagger-local.test.ts`): contrato textual de dinheiro, cabeçalho obrigatório e status distintos, cobertura de dez caminhos/identidades e recusa em produção antes de conectar ao banco.
- Execução em 29/10/2026 contra uma pilha isolada (PostgreSQL 5560, LocalStack 4570, login restrito provisionado): `/docs`, `/openapi.json`, `/docs/swagger-ui-bundle.js`, `/health/live` e `/health/ready` responderam HTTP 200 e `POST /wallets` criou uma carteira com saldo `100.00` e versão 1. A interface não foi aberta em navegador nesta execução.

O uso do pacote de assets segue a [instalação oficial do Swagger UI](https://swagger.io/docs/open-source-tools/swagger-ui/usage/installation/) e sua [configuração](https://swagger.io/docs/open-source-tools/swagger-ui/usage/configuration/).
