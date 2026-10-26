# Backend Ballance

Repositório: [harlemsilvas/backend-ballance-final](https://github.com/harlemsilvas/backend-ballance-final).

Distributed Wagering Processor do desafio Jungle Gaming. Bun 1.4.4, TypeScript strict, NestJS 11.2.8, PostgreSQL 17.6, MikroORM 6.6.17 e SQS via LocalStack 4.8.1.

O [enunciado integral](docs/CHALLENGE.md) foi preservado. [Arquitetura](ARCHITECTURE.md), [decisões](docs/DECISIONS.md) e [estado/limitações](PROJECT_STATUS.md) detalham as garantias e evidências.

## Execução local com Docker Compose

Para obter o projeto:

```bash
git clone https://github.com/harlemsilvas/backend-ballance-final.git
cd backend-ballance-final
```

Requer Docker com Compose e Buildx. O Compose base continua disponível apenas para infraestrutura; o overlay adiciona provisionamento, API e worker (consumer, publisher e scheduler). Antes de usar um volume existente, confira banco, schema `financial` e papel `ballance_runtime`. O provisionador recusa schema sem sua marca de gerenciamento e estados parciais; não adota objetos existentes nem troca senha em reexecuções.

Crie `.env` privado, ignorado pelo Git, com `RUNTIME_DB_PASSWORD` aleatória de pelo menos 16 caracteres. Use a mesma senha nas próximas execuções. `.env.example` descreve as demais variáveis; os defaults administrativos são apenas locais. Não use credenciais reais. Para gerar a senha, com Python instalado:

```bash
python3 -c 'import secrets; from pathlib import Path; p=Path(".env"); p.touch(mode=0o600, exist_ok=False); p.write_text("RUNTIME_DB_PASSWORD="+secrets.token_hex(24)+"\n")'
docker compose -f compose.yaml -f compose.app.yaml up -d --build --wait
```

O serviço `provision` cria um login sem privilégios administrativos e schema dedicado, aplica as três migrations e concede permissões mínimas. API e worker recebem somente o login restrito; `public` não recebe tabelas financeiras. O bootstrap da aplicação não executa DDL. O volume PostgreSQL conserva saldo, ledger, inbox, outbox e jobs em reinícios. A fila local é recriada pelo hook quando necessário; esta configuração não promete durabilidade das mensagens do emulador após recriar o LocalStack. Eventos já publicados devem ter retenção/durabilidade adequada no broker em produção.

Portas restritas ao localhost do host: API 3000, métricas/health worker 9101, PostgreSQL 5546 e LocalStack 4567. Dentro da rede Compose, os processos escutam em `0.0.0.0`. Não há IdP: o modo `local-development` é explícito e recusado em NODE_ENV=production.

```bash
curl --fail http://127.0.0.1:3000/health/ready
curl --fail http://127.0.0.1:9101/health/ready
curl --fail http://127.0.0.1:3000/metrics
curl --fail http://127.0.0.1:9101/metrics
curl --fail -X POST http://127.0.0.1:3000/wallets \
  -H 'Content-Type: application/json' \
  -d '{"playerId":"0192f28f-5dc0-7d58-bdb2-814ad6a0f4a1","initialBalance":{"amount":"100.00","currency":"BRL"}}'
docker compose -f compose.yaml -f compose.app.yaml stop
```

`stop` preserva containers/volume e envia SIGTERM com 45s para drenagem. Não remova volumes para atualizar. O provisionador reaplica apenas migrations pendentes/grants e verifica a conexão restrita; mudar a senha no arquivo não rotaciona o login existente. Para testar uma instalação independente, use `-p outro-projeto` em todos os comandos e portas livres (`POSTGRES_PORT`, `LOCALSTACK_PORT`, `PORT`, `WORKER_METRICS_PORT`).

## Desenvolvimento e testes

Com Bun 1.4.4 instalado:

```bash
bun install --frozen-lockfile
bun run typecheck
bun run build
bun test tests/unit
```

Para integração, suba PostgreSQL/LocalStack pelo Compose base e execute `bun run test:integration`. A suíte usa schemas, filas e papéis exclusivos, PostgreSQL real e SQS no emulador. O usuário de testes precisa criar esses recursos; não execute a suíte com o login restrito da API. [Comandos completos](docs/MANUAL_TESTS.md). [Validação da entrega e fallback sem Buildx](docs/DELIVERY.md).

[HTTP](docs/HTTP_API.md) descreve payloads, Idempotency-Key, identidade local e códigos de resposta. [Mensageria](docs/MESSAGING.md) descreve envelopes e filas; [scheduler](docs/REFERENCE_SCHEDULER.md) e [observabilidade](docs/OBSERVABILITY.md) cobrem operação e recuperação.

## Garantias e limites

Saldo/ledger/transação/inbox/outbox confirmam juntos. Lock por wallet e constraints SQL sustentam concorrência e idempotência entre processos. Replay terminal retorna o saldo original. Ledger é append-only. Ack ocorre após commit; outbox publica fora da transação com lease/token, permitindo duplicatas com eventId estável. Referências pendentes têm backoff/TTL persistentes.

Autenticação externa, benchmark, OTel e dashboard permanecem fora desta entrega. Não há promessa de exactly-once no broker; consumidores downstream devem deduplicar. O custo das constraints sobre históricos longos ainda não foi medido. A imagem usa versões fixas e lockfile; tags de imagem não são fixadas por digest.


O [desenho de autenticação e autorização](docs/AUTHENTICATION.md) descreve a integração externa proposta e os critérios para implementá-la. Atualmente há ponto de extensão e modo local; validação JWT/OIDC e políticas completas de acesso ainda não foram implementadas.
