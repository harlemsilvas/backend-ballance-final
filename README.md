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

Autenticação externa, OTel e dashboard permanecem fora desta entrega. Há um [runner de medição exploratória](docs/LOAD_TESTS.md), [resultados sequenciais](docs/LOAD_RESULTS_INDEX.md) e um [plano posterior aos testes](docs/LOAD_IMPROVEMENT_PLAN.md); eles não estabelecem capacidade de produção nem implementam otimizações automaticamente. Não há promessa de exactly-once no broker; consumidores downstream devem deduplicar. A matriz ampliada cobriu 100/1.000 entradas e 1/6 wallets; uma tentativa de chegar a 10.000 parou por orçamento após 7.977 entradas auditadas, sem janela medida nesse volume. As dependências usam versões exatas e lockfile. As três imagens de origem usam tag + digest de índice multiplataforma; origem, plataformas e atualização estão em [IMAGES.md](docs/IMAGES.md).


O [desenho de autenticação e autorização](docs/AUTHENTICATION.md) descreve a integração externa proposta e os critérios para implementá-la. Atualmente há ponto de extensão e modo local; validação JWT/OIDC e políticas completas de acesso ainda não foram implementadas.

## Pacote para avaliação por arquivo compactado

Para gerar uma edição essencial independente do Git, com fontes, configurações, testes obrigatórios e guia de instalação em containers:

```bash
python3 scripts/package-delivery.py
```

O comando cria `entrega/` e `entrega.zip`, ignorados pelo Git, com seleção explícita de arquivos e manifesto SHA-256. Recusa sobrescrever artefatos existentes: preserve ou renomeie a edição anterior antes de gerar outra. O destinatário segue `entrega/README.md` e não precisa instalar Bun/Node no host; precisa de Docker/Compose e internet na primeira instalação. Estudos, credenciais, dependências instaladas, resultados e runner exploratório de carga ficam fora. Templates versionados em `scripts/delivery/` mantêm instalação, testes isolados e smoke reproduzíveis. Nenhum pacote é enviado automaticamente.

## Licença e segurança

O código e a documentação autorais de Harlem Silvas estão disponíveis sob a [licença MIT](LICENSE). O enunciado da Jungle Gaming, preservado em [docs/CHALLENGE.md](docs/CHALLENGE.md), é material de terceiro e não está abrangido por essa concessão. As dependências e demais materiais de terceiros permanecem sujeitos às respectivas licenças; esta licença não concede direitos sobre marcas de terceiros.

Consulte [SECURITY.md](SECURITY.md) para reportar vulnerabilidades de forma privada e conhecer os limites de segurança desta demonstração. Utilize exclusivamente dados sintéticos no ambiente local.
