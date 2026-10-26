# Testes manuais pelo Bash

Executar na raiz do projeto. Os comandos abaixo usam scripts existentes; a suíte de casos de uso inclui concorrência real PostgreSQL com três processos. Testes de crash/ack e publishers SQS também estão implementados em messaging.test.ts.

## 1. Preparar terminal e dependências

```bash
cd /home/harlem/projetos/backend-challenge
export PATH="$HOME/.bun/bin:$PATH"
bun --version
bun install --frozen-lockfile
```

Esperado: Bun 1.4.4 e instalação sem mudar bun.lock. A exportação vale apenas para o terminal atual. Não é necessário copiar .env para rodar a configuração local padrão; `.env.example` lista portas e valores de desenvolvimento. Se já houver .env, conferir seus DB_* e TEST_SQS_ENDPOINT antes da integração, sem divulgar credenciais.

## 2. Unidade — sem Docker

Todos os testes de domínio:

```bash
bun run test
```

Por arquivo:

```bash
bun test tests/unit/money.test.ts
bun test tests/unit/wallet.test.ts
bun test tests/unit/wallet-ledger-entry.test.ts
bun test tests/unit/wager-transaction.test.ts
bun test tests/unit/wager-request.test.ts
bun test tests/unit/integration-events.test.ts
bun test tests/unit/money-mapper.test.ts
bun test tests/unit/telemetry.test.ts
```

Durante desenvolvimento, repetir automaticamente ao salvar (Ctrl+C encerra):

```bash
bun test --watch tests/unit
```

Relatório de cobertura no terminal:

```bash
bun test --coverage tests/unit
```

Cobertura mede execução de linhas/branches, não demonstra correção distribuída. O resultado esperado de qualquer suíte é zero falhas e código de saída 0. O total atualizado está em PROJECT_STATUS.md.

## 3. TypeScript e build

```bash
bun run typecheck
bun run build
```

Typecheck inclui testes/scripts; build gera dist com código da aplicação. Um teste passando não substitui checagem de tipos, pois Bun transpila TypeScript para executar.

## 4. Subir infraestrutura local

```bash
docker compose config --services
docker compose up -d postgres localstack
docker compose ps
```

Aguardar ambos saudáveis. Defaults: PostgreSQL 127.0.0.1:5546 e LocalStack 127.0.0.1:4567. O teste usa esses endpoints, conforme configuração documentada em DEVELOPMENT.md.

## 5. Integração real em containers

```bash
bun run test:integration
```

Para apenas o schema financeiro:

```bash
bun test tests/integration/financial-schema.test.ts
```

Para abertura, processamento, replay e concorrência com três processos Bun:

```bash
bun test tests/integration/financial-use-cases.test.ts
```

Para endpoints, contratos, cursor e reconciliação HTTP:

```bash
bun test tests/integration/financial-http.test.ts
```

Para inbox, DLQ, publishers e crashes reais:

```bash
bun test tests/integration/messaging.test.ts
bun test tests/integration/messaging.test.ts -t SIGKILL
```

Para scheduler, métricas e entrypoint/SIGTERM:

```bash
bun test tests/integration/reference-scheduler.test.ts
bun test tests/integration/observability.test.ts
bun test tests/integration/worker-entrypoint.test.ts
```

O teste roda Bun no host e acessa PostgreSQL/LocalStack publicados. Confere precisão decimal, rollback, FIFO/redelivery/DLQ e migrations up/down/up em schema de prova. Cria somente schemas `bb_test_<uuid>`, filas `bb-test-<uuid>` e um papel NOLOGIN `bb_role_<uuid>` para teste de privilégios, removidos ao final; não usa nem limpa filas financeiras. A tabela temporária é revertida. Não interromper forçadamente enquanto cria recursos; em caso de interrupção, identificar recursos pelo UUID antes de qualquer remoção manual.

A fila de teste tem visibility timeout zero para obter cinco recebimentos sem sleeps arbitrários. O próximo recebimento dispara redrive e o teste lê a mensagem na DLQ. Isso verifica comportamento no LocalStack, sem afirmar equivalência completa com AWS ou duração real dos retries.

## 6. Executar todas as suítes existentes

Com containers saudáveis:

```bash
bun test tests/unit tests/integration
bun run typecheck
bun run build
```

Não existem scripts separados `test:concurrency` ou `test:load`; concorrência financeira atual roda em financial-use-cases.test.ts. Não executar migrations do banco de desenvolvimento para preparar esta suíte: ela gerencia seus próprios objetos de prova.

## 7. Smoke HTTP da aplicação compilada

No primeiro terminal, depois do build:

```bash
PORT=3000 bun run start
```

No segundo:

```bash
curl --fail --silent --show-error http://127.0.0.1:3000/health/live
```

Esperado: `{"status":"ok"}` e HTTP 200. Encerrar a API com Ctrl+C no primeiro terminal. No modo padrão, apenas liveness é exposto. Rotas financeiras/readiness foram implementadas, mas a ativação exige runtime de banco preparado; os testes HTTP independem dessa ativação.

## 8. Diagnóstico e encerramento

Se containers não ficarem saudáveis:

```bash
docker compose ps
docker compose logs --tail=80 postgres localstack
```

Revise logs antes de compartilhar. Conexão recusada normalmente pede conferir estado/porta; não corrigir removendo volume ou resetando banco. Erros de permission denied no socket Docker exigem acesso ao Docker na sessão.

Para apenas parar os serviços ao terminar (opcional):

```bash
docker compose stop
```

Esse comando preserva volumes. Não é preciso parar serviços entre execuções de teste.

## Registro para revisão

Anotar data, comando, versão Bun, total de testes e falhas, além do erro relevante. Como ainda não há commit inicial, não existe revisão Git identificável por hash. Não publicar números de throughput ou provas de concorrência antes de implementar e executar essas suítes.

Hash, vetor conhecido e eventos explicados em [EVENTS_AND_HASH.md](EVENTS_AND_HASH.md).

Schema financeiro real e permissões: [FINANCIAL_SCHEMA.md](FINANCIAL_SCHEMA.md). Não aplicar migration:down manualmente ao desenvolvimento para testar: ele remove tabelas/dados.

Casos de uso e protocolo dos processos filhos: [FINANCIAL_PROCESSING.md](FINANCIAL_PROCESSING.md).

Rotas, status e inicialização: [HTTP_API.md](HTTP_API.md).

Workers, leases, shutdown e limites: [MESSAGING.md](MESSAGING.md).

Guias atuais: [scheduler](REFERENCE_SCHEDULER.md) e [observabilidade](OBSERVABILITY.md). O teste do entrypoint usa login temporário restrito e o remove no final; não provisiona runtime persistente.
