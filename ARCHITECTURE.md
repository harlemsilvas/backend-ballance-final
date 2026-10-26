# Arquitetura proposta — Backend Ballance

Estado em 26/10/2026: domínio, persistência financeira, HTTP, SQS/inbox/outbox, scheduler e observabilidade obrigatória implementados e testados. Runtime restrito e entrega Docker Compose validados em volume isolado; ativação no volume de desenvolvimento existente não executada. O enunciado original permanece no [enunciado](docs/CHALLENGE.md).

## Limites e estrutura

Monólito modular com processos escaláveis para API, consumidor SQS, publicação da outbox e referências pendentes. Compartilham casos de uso e PostgreSQL, mas podem executar separadamente. Evita transações distribuídas e mantém a unidade financeira em um único banco.

```text
src/
  domain/             # Money, Wallet, WagerTransaction, ledger, eventos
  application/        # casos de uso e portas transacionais
  infrastructure/     # MikroORM, migrations, SQS, relógio, logs e métricas
  interfaces/         # HTTP, consumidores e agendadores
  bootstrap/          # composição NestJS e entradas dos processos
```

Usar `tests/unit`, `tests/integration`, `tests/concurrency` e `tests/support`. A árvore é planejada; diretórios vazios não demonstram implementação. Dependências apontam para domínio/aplicação; adaptadores implementam portas. Request context/EntityManager isolado por operação, sem Identity Map compartilhado entre requisições.

## Dinheiro e persistência

Implementado: Money imutável com decimal.js e colunas `numeric` mais moeda, com CHECKs de escala <= 2 e limite equivalente a numeric(20,2), sem arredondamento implícito. Configurar precisão suficiente e rejeitar valores fora da capacidade antes de persistir; o driver/mapper deve manter strings, sem coerção numérica. Não arredondar entrada com mais de duas casas: rejeitar. Normalizar entradas aceitas para duas casas. Valores negativos são permitidos para resultados internos, como diferença de reconciliação, mas proibidos nos DTOs de entrada. Quantia zero: abertura permitida sem lançamento; BET/WIN/REFUND/ROLLBACK exigem valor positivo; LOSS exige zero. Esta última regra é uma interpretação a testar e explicar.

MikroORM atende à preferência do enunciado e permite transação e locks explícitos. Entidades persistentes e mapeadores ficam fora do domínio. O custo é manter mapeamento explícito, em troca de independência do domínio.

## Transação e concorrência

Proposta: READ COMMITTED com `SELECT ... FOR UPDATE` na wallet e constraints de unicidade. O lock serializa a wallet entre processos; wallets distintas avançam em paralelo. Uma hot wallet terá throughput limitado, uma troca aceitável pela clareza inicial.

Fluxo proposto revisado: validar contrato; iniciar transação; adquirir lock da wallet; reservar identidade idempotente; reconsultar estado da operação/referência; aplicar regra; persistir resultado, saldo, ledger, inbox se aplicável e eventos na outbox; commit; responder ou fazer ack. Todas as rotas de escrita financeira seguem a mesma ordem de locks. Workers não devem bloquear transações pendentes antes da wallet de modo a inverter essa ordem; claims podem usar leases em transações curtas e revalidar tudo após o lock financeiro.

Conflito de unicidade exige rollback ou tratamento com savepoint/ON CONFLICT, seguido de leitura do registro vencedor; não continuar uma transação PostgreSQL abortada. Deadlock/timeout pode repetir a transação inteira com limite e jitter, sempre mantendo a mesma identidade. Configurar timeout de lock e não manter chamada de rede dentro da transação financeira.

Criação: wallet inicia em versão 1, inclusive com OPENING positivo. Cada mudança posterior de saldo incrementa a versão uma vez. LOSS, rejeição e replay não incrementam. Reconciliação usa snapshot consistente (por exemplo REPEATABLE READ) para comparar saldo e ledger sem falsa divergência por commit concorrente; nunca corrige automaticamente.

## Garantias no schema

| Objeto | Garantia proposta |
|---|---|
| Wallet | UNIQUE(player_id, currency), CHECK(balance >= 0), versão >= 1 |
| Transação | UNIQUE(idempotency_key) global; UNIQUE(provider_id, external_transaction_id); FKs; enums/checks de estado e valor |
| Ledger | UNIQUE(wallet_id, transaction_id), FKs, CHECK de valor positivo, saldos não negativos e aritmética por direção |
| Reversão | índice único parcial (reference_transaction_id, kind) para REFUND/ROLLBACK PROCESSED; referências rejeitadas não consomem reversão |
| Inbox | UNIQUE(consumer_name, message_id), hash persistido |
| Outbox | event_id único, índices de pendência/próxima tentativa e leases |

Ledger deve bloquear UPDATE/DELETE por trigger e permissões do papel de execução, separado do papel de migrations. FKs devem impedir cascatas destrutivas. Estados terminais e campos de identidade/resultados devem ser protegidos de alteração no banco. A imutabilidade precisa de testes SQL diretos.

CHECKs de linha não garantem consistência entre tabelas. Implementadas constraint triggers diferidas para validar, ao commit, correspondência de transação financeira processada/ledger, mesma wallet/moeda/valor/direção, ausência de ledger para LOSS/rejeições e saldo materializado igual ao ledger. Incluir validação para criação e alteração de wallet, ledger e transação. Avaliar custo de agregação sob lock e medir antes de otimizar; qualquer alternativa deve preservar a garantia no banco. Migrações devem provar essas regras com escrita SQL adversarial e rollback. Essas regras já foram testadas em schema isolado com SQL adversarial. Casos de uso financeiros e provas com três processos já estão implementados; integração HTTP já validada; consumidor/publisher também implementados; scheduler e observabilidade completa pendentes.

## Idempotência e replay

Header obrigatório no HTTP; campo explícito na mensagem. Chave global opaca: não reconstruir nem substituir silenciosamente pelo default recomendado. A identidade (provider, externalTransactionId) também é única: outra chave para a mesma identidade retorna conflito, evitando dupla execução.

Hash SHA-256 de JSON UTF-8 com chaves recursivamente ordenadas e sem espaços: providerId, externalTransactionId, playerId, walletId, roundId, gameId, kind, money normalizado e referência quando presente. Ausência de referência omite o campo; null é inválido. Não incluir chave idempotente, messageId, timestamps de transporte ou correlationId. Rejeitar campos desconhecidos e tipos inválidos antes do hash. HTTP e SQS usam o mesmo normalizador.

Persistir snapshot do resultado e saldo observado para replay terminal; nunca buscar saldo atual para reconstruí-lo. Para pendentes, replay reflete o estado persistido vigente; após terminalização, o resultado terminal fica congelado. Apenas `idempotentReplay` muda. Inbox duplicada com hash divergente é erro permanente de transporte, sem nova operação financeira.

## Referências e estados

PENDING pode ir para PENDING_REFERENCE, PROCESSED, REJECTED ou FAILED. PENDING_REFERENCE pode ir para PROCESSED, REJECTED ou FAILED; reagendamento mantém estado sem emitir novamente o evento de entrada nesse estado. Terminais não transitam.

REFUND referencia BET; ROLLBACK referencia BET/WIN/REFUND. Validar mesmo provider/player/wallet/moeda/rodada, valor igual e referência PROCESSED. Referência ausente ou ainda pendente aguarda; referência terminal sem sucesso rejeita. WIN com referência opcional informada segue validação de BET e aguarda se necessário. Não impor unicidade de resultado por rodada não exigida pelo enunciado.

A regra de reversão é por tipo: um REFUND e um ROLLBACK da mesma BET são permitidos pelo texto, mas dois do mesmo tipo não. Registrar essa interpretação, incluindo seu impacto financeiro, na apresentação; não substituir por uma regra global sem decisão explícita.

Worker consulta tentativas vencidas com claim recuperável; proposta de backoff 1s × 2^(tentativa−1), teto de 5min, jitter e TTL de 24h desde a aceitação. Ao vencer TTL, REJECTED/REFERENCE_EXPIRED e evento atômico. Relógio injetável, contadores e agendamento persistentes; reinício não reinicia TTL. Referências cíclicas também expiram.

## Inbox, SQS e outbox

Entrada: `wager-transactions.fifo`, com DLQ `wager-transactions-dlq.fifo`; MessageGroupId por wallet como otimização. Inbox e aceite PENDING_REFERENCE confirmam juntos; depois disso pode fazer ack, pois o worker SQL assume a continuidade. Negócio terminal confirma auditoria e faz ack; falhas transitórias deixam mensagem para redelivery. Proposta de redrive após 5 recebimentos. Mensagem inválida permanente vai à DLQ com envio confirmado antes de apagar a original; crash nessa janela pode duplicar DLQ e deve manter identidade estável. FAILED só é persistido quando o comando tem identidade válida e o banco está disponível; indisponibilidade do banco não pode ser falsamente auditada como commit.

Outbox: claim de lote com FOR UPDATE SKIP LOCKED, lease persistente e token de posse; commit do claim, envio fora da transação e atualização condicional pelo token. Lease expirado permite recuperação; renovar lease se necessário. Crash após envio e antes da marcação permite duplicata com mesmo eventId. Entrega é at-least-once, consumidores deduplicam persistentemente. Backoff persistente com teto; não descartar eventos financeiros por esgotamento de tentativas: alertar e continuar recuperável.

Eventos saem para fila separada `wager-events.fifo` (extensão local proposta), sem realimentar a fila de comandos. eventId estável, envelope versionado e classes concretas para os quatro eventos obrigatórios. Ordenação de publicação por wallet/version não é garantida pelo claim concorrente: consumidores devem tolerar reordenação, conforme premissa do desafio.

SIGTERM: parar polling/claims, drenar tarefas com prazo, renovar visibilidade enquanto processa e devolver visibilidade das mensagens não concluídas quando seguro; nunca ack antes de commit.

## Segurança, observabilidade e limites

Adiar integração do IdP para priorizar os critérios financeiros. Prever ProviderIdentityPort/guard local explícito e futura validação OIDC/JWKS com vínculo entre claims e providerId; health aberto e canal SQS interno com validação de domínio. Modo sem autenticação serve apenas à demonstração local e deve ficar explícito na configuração.

Logs JSON com IDs de correlação, sem payload financeiro completo. Métricas: status, replay, retries, DLQ, conflito/espera de lock, idade da outbox pendente e latência. IDs individuais ficam em logs, sem labels de alta cardinalidade. Readiness testa PostgreSQL e SQS com timeout; liveness verifica processo. Bootstrap, Money e configuração MikroORM estão implementados com versões fixadas em package.json/bun.lock. Testes reais PostgreSQL/SQS validaram infraestrutura, rollback e mecanismo de migrations up/down/up em recursos descartáveis. Há migration financeira e testes SQL/ORM isolados; há adaptador HTTP validado em schema isolado, sem ativação operacional de desenvolvimento ou benchmark. Money valida formato de moeda com três letras maiúsculas; a preparação de comandos externos aceita somente BRL; Money continua multi-moeda.


## Contrato de domínio implementado nesta etapa

`Wallet.open` recebe instante explícito e retorna `{ wallet, openingEntry }`; saldo positivo exige IDs da transação interna OPENING e do lançamento, saldo zero não gera entrada. A factory não persiste nem cria WagerTransaction: OpenWallet já grava ambos e a outbox atomicamente. A versão inicial permanece 1.

`debit`/`credit` retornam um WalletLedgerEntry válido e só depois atualizam o estado em memória. Falhas preservam saldo, versão e updatedAt. Débito de reversão recebe motivo explícito para distinguir saldo insuficiente. Essa API não deduplica IDs nem impede chamadas repetidas: unicidade e replay são garantidos pelo caso de uso transacional e schema implementados.

WalletLedgerEntry é congelado, mantém snapshot dos campos e copia datas defensivamente. `rehydrate` reconstrói estado confiável sem repetir regras de criação. A proteção de UPDATE/DELETE/TRUNCATE foi implementada e testada no schema; controllers usam persistência financeira quando a ativação explícita e o runtime restrito forem configurados.


## WagerTransaction implementada

A entidade valida criação, referências, direção e transições, sem consultar banco ou alterar wallet. A assinatura de markProcessed recebe a referência reidratada e o instante; valida ambos antes de terminalizar. Criar OPENING exige factory interna separada. Referência ausente/pendente sinaliza espera ao caso de uso; não inicia worker na entidade. FailureCode distingue rejeição de negócio de falha permanente.

A detecção de payload divergente compara um hash fornecido; cálculo canônico já foi implementado na camada de aplicação; unicidade de chave, snapshot terminal e atomicidade persistente já foram implementados nos casos de uso e testados em PostgreSQL. AffectsBalance indica potencial efeito por kind/estado, e não comprova que um lançamento foi persistido. O caso de uso deve decidir quando aplicar, registrar e emitir os eventos.

Explicações para estudo em [DECISIONS.md](docs/DECISIONS.md); comandos de teste em [MANUAL_TESTS.md](docs/MANUAL_TESTS.md).


## Eventos e hash implementados

Preparação de comandos em `src/application/wager-request.ts`, eventos em `src/domain/events/`. Mesma normalização para corpo HTTP e dados SQS, chave explícita separada, SHA-256 com vetor conhecido. Campos extras são rejeitados e moeda pública limitada a BRL. Todas as classes de eventos usam aggregateId=walletId, version=1, IDs fornecidos pelo contexto e snapshots JSON congelados.

Algoritmo, formato exato, decisões e limites em [EVENTS_AND_HASH.md](docs/EVENTS_AND_HASH.md). Eventos já são persistidos na outbox pelos casos de uso, com idempotência de banco e resposta terminal histórica. Publicação e consumo financeiro/inbox também implementados; ver MESSAGING.md.


## Schema financeiro implementado

Records de cinco tabelas, ExactAmountType e WalletMapper separam persistência/domínio. Money.rehydrate aceita formato canônico assinado. Migration inicial adiciona constraints de unicidade, não-negatividade, referência, imutabilidade e consistência saldo/ledger/version/chain no commit. O tipo físico mudou de numeric(20,2) proposto para numeric com CHECKs, evitando coerção silenciosa de escala.

Validado em schema descartável com runtime role não proprietário, sem aplicar DDL financeiro ao public. Os locks dos triggers exigem ordem wallet → transação → ledger nos casos de uso futuros. Consultar [FINANCIAL_SCHEMA.md](docs/FINANCIAL_SCHEMA.md) para custos, grants, comportamento de rollback e limites.


## Casos de uso atômicos implementados

OpenWallet e ProcessWagerTransaction usam FinancialUnitOfWork/FinancialSession, mapeadores e adaptador MikroORM com lock por wallet, reconsulta de identidade após espera e retry da transação inteira. Snapshot terminal da resposta é congelado no banco e lido para replay, inclusive em processos novos. OUTBOX é gravada no commit; não há publicação direta.

Referências pendentes têm agendamento persistido e entrada resume explícita; worker de polling/claims ainda não existe. Nova migration adiciona BALANCE_LIMIT_EXCEEDED sem alterar o DDL inicial. Testes agora cobrem três processos reais e independência de wallets; ainda faltam crash/ack e publishers.

Garantias, limites e comandos em [FINANCIAL_PROCESSING.md](docs/FINANCIAL_PROCESSING.md).


## HTTP implementado e ativação local

Controllers delegam regras aos casos de uso, com filtros de erro e ProviderIdentityPort. Cursor preserva microssegundos por texto SQL e reconciliação usa REPEATABLE READ. Divergência sinalizada por resposta/log/contador, sem reparo. Health live/ready e /metrics disponíveis no módulo financeiro; observabilidade completa permanece pendente.

Startup sem flag permanece liveness-only. Ativação financeira exige modo local explícito, schema migrado e papel restrito; não há migration/provisionamento automático. Testes HTTP usam schemas temporários e servidor em porta livre. [Contrato e comandos](docs/HTTP_API.md).


## Mensageria implementada

Processamento recebe InboxReceipt opcional, reserva/dedup e conclui inbox na mesma FinancialSession. Hash financeiro e de envelope têm escopos distintos. Consumidor confirma ack após commit, renova visibilidade e transfere permanentemente inválidas/esgotadas à DLQ antes de apagar origem.

Publisher usa claim SQL curto, SKIP LOCKED, lease/token e envio fora da transação. Marca somente com posse válida; atraso/crash pode duplicar envio com mesmo eventId. Drenagem retorna visibilidade/posse ao vencer prazo. Testes reais matam filhos nas duas janelas e demonstram recuperação e dedup.

Comandos, decisões e limites em [MESSAGING.md](docs/MESSAGING.md). Bootstrap requer runtime restrito e não provisiona banco/filas. Scheduler e métricas completas ainda pendentes.


## Scheduler e observabilidade implementados

Terceira migration cria reference_jobs para não reservar trabalho por UPDATE na transação financeira, evitando inversão com os triggers de wallet. Claim curto trava somente job; resume trava wallet e valida/trava token, limpando posse no mesmo commit. Leases recuperam quedas, TTL/backoff/jitter persistem e status terminal mantém idempotência.

Telemetria é uma porta da aplicação. Entry points usam logs JSON filtrados e métricas com categorias finitas. Counters/histograms são locais; coleta DB/SQS repõe indicadores duráveis após reinício e sinaliza fonte indisponível sem inventar amostra saudável. API e workers expõem health/metrics.

Teste operacional executou scheduler real com login restrito temporário e SIGTERM. Não provisionou runtime persistente/public. [Scheduler](docs/REFERENCE_SCHEDULER.md) e [observabilidade](docs/OBSERVABILITY.md).


## Entrega local com Compose

Dockerfile multi-stage com Bun 1.4.4, instalação por lockfile, build TypeScript e runtime sem dependências de desenvolvimento, sob usuário bun. `compose.app.yaml` complementa a infraestrutura existente: provisionamento one-shot separado, API e worker all. O serviço administrativo cria schema financial/login restrito, aplica migrations e grants; API/workers não recebem a credencial administrativa. A configuração recusa adoção de schema não gerenciado e não rotaciona senha em reruns.

DB financeiro, inbox/outbox/jobs persistem no volume PostgreSQL. O emulador SQS não tem garantia de persistência entre recriações nesta configuração. Portas do host ficam em localhost; HTTP_HOST permite bind interno dos containers e o cliente SQS aceita somente loopback ou o hostname localstack. Healthchecks coordenam dependências, SIGTERM tem 45s de drenagem. [Execução](README.md).


## Desenho de autenticação externa

A seção 2 do desafio foi atendida pela opção de adiar a integração, documentar a decisão e expor ProviderIdentityPort/guard no-op local. Isso não implementa validação de tokens ou autorização completa de recursos.

O [desenho proposto](docs/AUTHENTICATION.md) detalha IdP externo (Keycloak de referência), Client Credentials para provedores, Authorization Code/PKCE e MFA para operadores, JWT validado localmente por JWKS em cache e autorização por scopes e vínculos com wallets/transações. Wallets não pertencem a provider no modelo atual: esse vínculo de acesso exige decisão explícita. Criação com saldo inicial, ledger completo e reconciliação ficam restritos a serviços/operadores autorizados. SQS mantém fronteira interna protegida por IAM em produção.

Proposta documental, ainda não implementada. Tokens curtos e cache favorecem réplicas independentes, com janela de revogação explícita. Alta disponibilidade do IdP e capacidade financeira requerem dimensionamento/testes; concorrência correta não constitui benchmark de alta escala.
