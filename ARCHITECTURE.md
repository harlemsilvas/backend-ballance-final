# Arquitetura — Backend Ballance

Estado em 29/10/2026: domínio, persistência financeira, HTTP, SQS/inbox/outbox, scheduler e observabilidade obrigatória implementados e testados. Runtime restrito e entrega Docker Compose validados em projeto/volume isolados. O [enunciado original](docs/CHALLENGE.md) é a referência dos requisitos; [PROJECT_STATUS.md](PROJECT_STATUS.md) registra validações e histórico. IdP real, OTel e dashboard permanecem fora da implementação; os experimentos de carga estão no [índice sequencial](docs/LOAD_RESULTS_INDEX.md), sem estimativa de capacidade de produção.

## Estrutura e limites

Monólito modular com processos separados para API, consumidor SQS, publisher da outbox e scheduler de referências. O worker suporta consumer, publisher, scheduler, both e all; o Compose usa all. Compartilham casos de uso e PostgreSQL. A unidade financeira confirma em um único banco, sem transação distribuída com SQS.

```text
src/
  domain/             # Money, Wallet, WagerTransaction, ledger, eventos
  application/        # casos de uso, contratos e portas
  infrastructure/     # MikroORM, migrations, SQS e telemetria
  interfaces/http/    # controllers, identidade e health/metrics
  bootstrap/          # API, workers e provisionador administrativo
```

Testes existentes em tests/unit, tests/integration e tests/support; as provas de concorrência usam processos Bun reais a partir da suíte de integração. Domínio sem decorators NestJS/ORM, construtores privados/protegidos, factories create/open/rehydrate. Rehydrate reconstrói estado persistido sem reaplicar transições. Cada operação usa EntityManager isolado; não há Identity Map global compartilhado entre requisições.

## Dinheiro e modelo

Money é imutável, com decimal.js e transporte string de duas casas. Colunas PostgreSQL usam numeric sem typmod, com CHECK de escala <= 2 e limites equivalentes a numeric(20,2). Isso rejeita escala excedente em vez de arredondar antes do CHECK. Mapper/driver mantêm strings; dinheiro não passa por number. Entradas são não negativas; resultados internos, como diferença de reconciliação, admitem sinal. Money modela moedas diferentes; contratos públicos aceitam somente BRL.

Abertura zero não gera transação/ledger/evento financeiro; abertura positiva persiste OPENING interno, crédito e outbox atomicamente. Wallet começa na versão 1 nos dois casos. Movimentos posteriores incrementam versão somente quando o saldo muda; LOSS/rejeição/replay não incrementam. BET/WIN/REFUND/ROLLBACK exigem valor positivo; LOSS exige zero, interpretação registrada em [DECISIONS.md](docs/DECISIONS.md).

Inbox e outbox têm classes de domínio (`InboxMessage`, `OutboxMessage`, sem decorators), com `receive`/`enqueue`/`rehydrate` e as transições `markProcessed`, `markPublished` e `scheduleRetry`; o backoff da outbox (1s·2^n, teto 5min, jitter) existe só em `OutboxMessage.retryDelayMs`. Adaptação em relação ao enunciado: o claim com `FOR UPDATE SKIP LOCKED` e o lease/token continuam em SQL (`OutboxStore`) por serem atômicos entre processos, e `attempts` é incrementado nesse claim, não em `scheduleRetry`. A unicidade e a imutabilidade continuam garantidas pelo banco. Wallet retorna um ledger válido antes de alterar o estado em memória. Ledger é imutável e valida aritmética/moeda. O caso de uso persiste as entidades na mesma sessão; a entidade isolada não estabelece idempotência nem concorrência. MikroORM/records/mapeadores ficam na infraestrutura, preservando independência do domínio.

## Unidade transacional e concorrência

Implementado READ COMMITTED com SELECT FOR UPDATE na wallet e constraints de unicidade. O lock serializa a mesma wallet entre processos, enquanto wallets distintas avançam em paralelo. A capacidade de uma hot wallet é limitada por essa serialização; throughput e custo do histórico foram explorados em experimentos de 100/1.000 entradas e uma tentativa maior interrompida por orçamento em 7.977, sem comprovar capacidade sob carga de produção.

Após validação do contrato, a sessão financeira reserva/deduplica inbox quando a entrada é SQS, adquire wallet, reconsulta identidades/referência, aplica a regra e grava saldo, transação, ledger, resultado e outbox; commit antecede resposta/ack. A reserva inbox integra essa mesma sessão. Escritas financeiras seguem wallet antes de transação/ledger; claims de outbox e scheduler são curtos e separados. Scheduler trava somente o job no claim; resume adquire wallet antes de validar/travar o token do job.

Conflitos recuperáveis SQL repetem a transação completa após rollback, até quatro tentativas, com backoff/jitter. Não há chamada de rede na transação financeira, lock global, nem publicação antes do commit. A criação concorrente de wallet depende de UNIQUE(player_id,currency). Detalhes em [FINANCIAL_PROCESSING.md](docs/FINANCIAL_PROCESSING.md).

## ORM, Money e estratégia transacional

**Escolha do ORM.** MikroORM 6.6.17, a opção preferencial do enunciado. Razões: Unit of Work e Identity Map explícitos, `EntityManager.fork().transactional()` com nível de isolamento declarado, `LockMode.PESSIMISTIC_WRITE` para o lock da wallet e Migrator com `up`/`down` versionados e reversíveis. O adaptador usa `allowGlobalContext: false`: cada tentativa cria seu próprio `EntityManager`, de modo que nenhum Identity Map é compartilhado entre requisições (`mikro-financial-unit-of-work.ts`). TypeORM era aceito, mas oferece esses controles de forma menos explícita para o padrão adotado; Prisma está fora do escopo. A comparação é uma justificativa de projeto, não uma medição entre os dois ORMs.

**Mapeamento do Money.** O domínio não conhece o ORM. Na persistência, `money-mapper.ts` converte entre `Money` e string; o tipo da coluna é `numeric` e o valor nunca passa por `number`. O schema aplica CHECK de escala <= 2 e limite máximo; excesso de casas é rejeitado em vez de arredondado. Moeda fica em coluna própria, reidratada junto com o valor.

**Estratégia transacional.** READ COMMITTED com `SELECT ... FOR UPDATE` na wallet (lock pessimista), `lock_timeout` de 5s e repetição limitada da transação completa para conflitos recuperáveis. A unidade de concorrência é a wallet; os demais invariantes ficam no banco (UNIQUE, CHECK e triggers). Alternativas descartadas: locking otimista com retry ou update condicionado, válidos, mas com mais tratamento de conflito sob disputa na mesma wallet. Detalhes e custo em [DECISIONS.md](docs/DECISIONS.md).

## Garantias no schema

| Objeto | Garantia implementada |
|---|---|
| Wallet | UNIQUE(player_id,currency), saldo não negativo e versão coerente |
| Transação | Chave idempotente global e identidade provider/external únicas; terminais e identidade imutáveis |
| Ledger | Append-only, FKs, uma entrada por wallet/transação e por versão; aritmética exata |
| Reversão | Unicidade parcial por (reference_transaction_id,kind) para reversões PROCESSED |
| Inbox | Chave (consumer_name,message_id), hash e identidade preservados |
| Outbox | eventId/envelope estáveis, índice de pendência e lease/token |
| Reference jobs | Claims recuperáveis separados do registro financeiro |

Constraint triggers diferidas verificam ao commit a correspondência transação/ledger, saldo agregado, versão, cadeia e referências. CHECKs/FKs/UNIQUE e proteção contra UPDATE/DELETE/TRUNCATE complementam a validação. Runtime restrito não é proprietário e não pode alterar/excluir ledger. Conta administrativa não é usada pela API/workers. SQL adversarial, rollback e permissões foram testados em schemas exclusivos.

O verificador percorre o histórico por wallet a cada disparo e pode repetir a validação na mesma transação. Este custo é conhecido estruturalmente e foi investigado em um piloto; os resultados ainda não isolam seu peso causal. O [plano de correções](docs/PLANO_CORRECOES.md) prevê medição antes de índices/redesign; nenhuma otimização pode retirar garantias do banco. Migrations já publicadas não devem ser editadas: evolução exige migration nova. [Schema e migrations](docs/FINANCIAL_SCHEMA.md).

## Idempotência e replay

Idempotency-Key HTTP/campo SQS é obrigatório, global e explícito. A identidade (providerId,externalTransactionId) também é única: outra chave para a mesma identidade é conflito. SHA-256 usa JSON UTF-8 com chaves recursivamente ordenadas do subconjunto de negócio normalizado; não inclui a chave nem metadados de transporte. Campos desconhecidos são rejeitados. [Contrato de eventos/hash](docs/EVENTS_AND_HASH.md).

Snapshot terminal preserva resultado e saldo observado no momento do processamento, inclusive após outros movimentos e reinício; apenas idempotentReplay muda. Pendências retornam estado persistido vigente até terminalizar. Inbox usa hash do envelope completo, separado do hash financeiro: mesma identidade de transporte com envelope divergente é conflito permanente, sem sobrescrita.

## Referências e estados

PENDING pode ir para PENDING_REFERENCE, PROCESSED, REJECTED ou FAILED. PENDING_REFERENCE pode ir para PROCESSED, REJECTED ou FAILED; reagendamento não emite outro evento de entrada nesse estado. Estados terminais não transitam.

REFUND exige BET processada; ROLLBACK referencia BET/WIN/REFUND processada. Conferir provider, player, wallet, moeda, rodada, valor integral e referência externa. WIN admite referência opcional a BET e payout diferente. Reversão que debitaria além do saldo usa failureCode distinto de aposta sem saldo. A regra de unicidade é por tipo: um REFUND e um ROLLBACK da mesma BET podem coexistir conforme interpretação do enunciado; não há unicidade global de resultado por rodada.

Scheduler automático usa claims com lease/token, backoff exponencial com base 1s, teto 5min, jitter e TTL de 24h desde a aceitação. Referência ausente/pendente ao avaliar a expiração resulta em REJECTED/REFERENCE_EXPIRED e outbox no mesmo commit. TTL/agendamento persistem após queda. Jobs concluídos são retidos. [Operação do scheduler](docs/REFERENCE_SCHEDULER.md).

## SQS, outbox e recuperação

Entrada FIFO wager-transactions.fifo com DLQ wager-transactions-dlq.fifo, redrive após cinco recebimentos; MessageGroupId por wallet é otimização. Consumidor reutiliza o caso de uso HTTP, confirma inbox com os efeitos financeiros e só faz ack após commit. Rejeição/pendência confirmada pode receber ack; scheduler SQL assume a continuidade da referência. Erro transitório deixa redelivery; inválidos/esgotados são enviados à DLQ antes de apagar origem. Heartbeat renova visibilidade durante processamento.

Publisher usa FOR UPDATE SKIP LOCKED em claim curto, lease/token persistidos e envio fora da transação financeira. Confirma publishedAt somente com posse válida. Backoff persiste sem descartar evento confirmado por limite de tentativas. Crash após envio e antes de publishedAt pode duplicar o mesmo eventId: consumidores downstream precisam de dedup persistente com o próprio efeito atômico. Eventos saem em wager-events.fifo, sem realimentar comandos. Claims concorrentes não garantem ordem de publicação por wallet/version.

SIGTERM para polling/claims, drena tarefas com prazo e devolve visibilidade/claims quando necessário. Há testes de queda após commit/antes do ack, envio/antes da marcação, publishers concorrentes, claims antigos e reinício. A publicação é at-least-once; não há promessa de exactly-once no broker. [Mensageria e evidências](docs/MESSAGING.md).

## HTTP e observabilidade

Controllers delegam ao mesmo processamento financeiro e oferecem abertura/consultas de wallet, submissão/consulta de transação, ledger e reconciliação. Status distinguem payload inválido, conflito, rejeição, pendência e infraestrutura transitória. Cursor keyset (created_at,id) preserva microssegundos por texto SQL, com posição/versão/wallet e limites validados. Reconciliação REPEATABLE READ compara saldo e ledger no mesmo snapshot; divergência gera resposta/log/métrica e nunca reparo automático. [HTTP](docs/HTTP_API.md).

Logs JSON filtrados contêm correlação e IDs aplicáveis, sem credenciais ou payload financeiro completo. Métricas Prometheus cobrem status, duplicatas, retries, DLQ, locks, latência, outbox e scheduler. Labels são categorias finitas; IDs ficam nos logs. Counters/histogramas são locais ao processo, gauges globais vêm de DB/SQS e não devem ser somados entre réplicas do mesmo banco. Falha de coleta mantém última amostra e sinaliza fonte indisponível. O pacote 2 comparou coleta desligada/5s/15s em duas repetições; não demonstrou efeito monotônico de frequência. Sua atribuição por fonte e variabilidade ainda exigem investigação.

API e workers expõem /metrics e health live/ready; readiness consulta PostgreSQL/SQS. API sem ativação financeira permanece liveness-only. OTel, collector externo e dashboards não estão implementados. O runner de carga é separado da aplicação, com método e limites em [LOAD_TESTS.md](docs/LOAD_TESTS.md). [Observabilidade](docs/OBSERVABILITY.md).

## Entrega e configuração operacional

Dockerfile multi-stage Bun 1.4.4 com lockfile congelado, dependências de produção e usuário bun. PostgreSQL 17.6-alpine, LocalStack 4.8.1 e ambos os estágios Bun usam tag + digest de índice multiplataforma; ver [IMAGES.md](docs/IMAGES.md) para origem, plataformas e atualização. Pinning fixa conteúdo, mas não garante ausência de vulnerabilidades nem atualização automática de segurança.

Compose base sobe infraestrutura; compose.app.yaml adiciona provisionador administrativo one-shot, API e worker all. Provisionador cria schema financial/login restrito, aplica três migrations, concede grants e verifica acesso. Recusa schema não gerenciado/estado parcial e não rotaciona senha em rerun. API/workers não fazem DDL nem recebem credencial administrativa. Banco financeiro/inbox/outbox/jobs persistem no volume PostgreSQL.

A stack de entrega foi validada em projeto/volume isolados; o ambiente local do desenvolvedor não foi migrado. LocalStack não tem durabilidade de mensagens após recriação comprovada nesta configuração. Portas do host ficam em localhost; HTTP_HOST permite bind interno dos containers e o cliente SQS aceita loopback ou hostname localstack. Prazo Compose de drenagem: 45s. [Execução](README.md) e [validação](docs/DELIVERY.md).

## Autenticação e extensões propostas

Por decisão do usuário e conforme seção 2 do desafio, autenticação externa permanece somente documentada. ProviderIdentityPort/guard e LocalDevelopmentIdentity no-op são pontos de extensão; modo local é explícito e recusado pela API financeira em NODE_ENV=production. Validação real de JWT/OIDC e autorização completa de recursos não estão implementadas.

O [desenho proposto](docs/AUTHENTICATION.md) descreve IdP externo, Client Credentials para provedores, Authorization Code/PKCE e MFA para operadores, JWT/JWKS e autorização por scopes/vínculos com recursos. Wallets pertencem a player/moeda: o vínculo de acesso do provedor exige decisão explícita. Restrições administrativas e IAM de produção descritos nessa proposta não constituem controles já implementados.

Continuidade da medição, otimizações estruturais e tracing seguem o [plano de correções](docs/PLANO_CORRECOES.md). Correção entre processos foi testada; capacidade sob alta carga e HA de produção não foram demonstradas.


O [plano posterior aos experimentos](docs/LOAD_IMPROVEMENT_PLAN.md) foi escrito após a regressão de 205 testes. Ele propõe validações futuras e não aplica índice, alteração de trigger, cache ou particionamento nesta entrega.
