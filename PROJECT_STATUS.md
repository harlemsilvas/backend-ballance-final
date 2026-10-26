# Estado do projeto

Atualizado em 26/10/2026.

## Resumo atual

203 testes passaram (110 unitários + 93 integração, 799 assertions) em 17 arquivos. Typecheck e build aprovados. Entrega Docker Compose e provisionamento de runtime restrito validados em projeto/volume isolados.  Scheduler automático de referências e observabilidade obrigatória implementados: logs JSON, métricas Prometheus, indicadores duráveis DB/SQS e endpoints da API/workers.

Guias: [scheduler](docs/REFERENCE_SCHEDULER.md), [observabilidade](docs/OBSERVABILITY.md), [mensageria](docs/MESSAGING.md) e [comandos Bash](docs/MANUAL_TESTS.md).

Na etapa anterior, o entrypoint de scheduler foi validado com login temporário e SIGTERM/saída zero. Nesta entrega, runtime persistente foi provisionado apenas no volume isolado de validação; o ambiente original e public foram preservados.

## Implementado

- Repositório próprio, branch main; destino da entrega inicial: https://github.com/harlemsilvas/backend-ballance-final.
- Nome de trabalho: Backend Ballance. README/enunciado preservado.
- Bun 1.4.4, NestJS 11.2.8, TypeScript 5.9.3 e decimal.js 10.6.0; dependências exatas e bun.lock.
- Bootstrap NestJS, GET /health/live e shutdown hooks. Readiness financeiro implementado nas etapas abaixo.
- Money imutável, entradas não negativas e reidratação assinada; numeric com CHECKs de escala/limites, sem arredondamento implícito.
- Compose PostgreSQL/LocalStack e inicialização das filas; containers iniciados pelo usuário e conexão/atributos verificados.

- Eventos/hash canônico, ExactAmountType, MoneyMapper/WalletMapper e records das cinco tabelas.
- Migration financeira com imutabilidade, unicidade, referências e saldo/ledger/version/chain verificados no commit; testes up/down/up e grants restritos.

## Histórico de validação inicial

- 18 testes unitários de Money passaram, 32 assertions.
- Typecheck e build passaram.
- Smoke da API compilada: GET /health/live retornou 200 e status ok; processo encerrado após teste.
- docker compose config --services e bash -n do script de filas passaram.

## Verificação da infraestrutura — 26/10/2026

- Containers iniciados pelo usuário; ambos reportados healthy.
- Consulta somente de leitura confirmou banco/usuário ballance e PostgreSQL 17.6.
- LocalStack: três filas existentes e FIFO; fila de comandos com visibility timeout de 30s e redrive para a DLQ correta após cinco recebimentos.
- Reexecução: 18 testes unitários passaram (32 assertions) e typecheck passou.
- A inspeção inicial foi somente de leitura. Na etapa seguinte, testes automatizados pelo host confirmaram conexão, precisão numeric, rollback, redelivery e entrega efetiva à DLQ usando recursos exclusivos e descartáveis.

## Persistência e integração — etapa concluída em 26/10/2026

- Bun local confirmado: `/home/harlem/.bun/bin/bun`, versão 1.4.4. Instalação temporária `/tmp/backend-ballance-tooling` removida a pedido do usuário.
- MikroORM core/postgresql/migrations 6.6.17 e cliente SQS 3.1156.0 fixados.
- Configuração de persistência explícita, sem conexão por import ou criação automática de schema; runner de migrations up/down/pending.
- Três testes reais de infraestrutura passaram (33 assertions): numeric(20,2) e rollback, FIFO/redelivery/DLQ após cinco recebimentos, migrations up/down/up em schema exclusivo.
- 18 testes unitários passaram novamente; typecheck e build passaram.
- Filas e schema criados pelos testes foram removidos; filas de aplicação e dados existentes preservados.

## Limitações e continuidade

Núcleo financeiro, HTTP, SQS/inbox/outbox, scheduler e observabilidade obrigatória implementados. As seções abaixo preservam o histórico em cada etapa. Entrega reproduzível com Dockerfile, Compose da aplicação, provisionamento explícito e README final concluída; ativação sobre o volume de desenvolvimento existente permanece opcional e não foi executada. IdP real continua adiado com modo local explícito e ponto de extensão. Não há benchmark, OTel ou dashboard. Jobs concluídos são retidos; agregações/triggers ainda não foram medidos sob carga.


## Revisão do plano e testes de domínio — 26/10/2026

- Revisado README seção 13, plano e estratégia: testes acompanham cada etapa, com concorrência real após schema/caso de uso.
- Corrigidos relatos antigos de conectividade e scripts ainda ausentes no plano/estratégia.
- Wallet implementada com abertura zero/positiva, retorno de ledger, débito/crédito, versão, códigos distintos de insuficiência e cópias defensivas de datas.
- Ledger imutável com factories create/rehydrate, validação aritmética e moeda.
- 14 testes novos; suíte total de 32 unitários/85 assertions passou. Typecheck e build passaram.
- Integração de infraestrutura não foi repetida nesta mudança de domínio puro; última execução registrada: três testes aprovados.
- Etapa 2 parcial: WagerTransaction, regras das operações e eventos ainda pendentes. Não há prova de idempotência persistente, atomicidade financeira ou concorrência multiprocesso.


## WagerTransaction e documentação para estudo — 26/10/2026

- Implementados factories pública/interna para separar OPENING, create/rehydrate, estados terminais, failureCode, payload matching e regras de referências/direção.
- REFUND/ROLLBACK validam valor integral, provider/player/wallet/moeda/rodada e tipo/status da referência. LOSS sem movimentação; WIN admite referência opcional com payout diferente.
- 29 testes novos de transação: 61 unitários/182 assertions passaram. Integração com três testes/33 assertions passou; execução conjunta anterior aos três últimos casos: 61 testes (58 unitários + 3 integração), sem falhas.
- Typecheck e build passaram; typecheck repetido após os três últimos casos. Comando de cobertura validado antes desses três casos: 99,06% das linhas dos arquivos de domínio carregados; não é cobertura de todos os requisitos.
- Criados docs/MANUAL_TESTS.md e docs/DECISIONS.md; decisões distinguem implementação, propostas e limites.
- Naquele momento estavam pendentes eventos/hash; concluídos na etapa abaixo. Permanecem dedup persistente, schema financeiro, processamento/ledger atômico e provas de concorrência. A comparação de hash em entidade não é idempotência persistente.


## Eventos e hash canônico — 26/10/2026

- Implementadas IntegrationEvent<T> e quatro subclasses exigidas, envelope versão 1 e snapshots JSON imutáveis. aggregateId=walletId, dinheiro em MoneyProps e eventId explícito do contexto.
- Preparação de comandos HTTP/SQS compartilha normalização, rejeita campos desconhecidos e usa SHA-256 de JSON com chaves recursivamente ordenadas. Normaliza amount para duas casas e exclui metadados/chave idempotente do hash.
- Entradas preparadas aceitam somente BRL; Money continua multi-moeda. Formato SQS exige timestamp ISO UTC canônico.
- 28 novos testes (107 assertions), total de 89 unitários/289 assertions sem falhas. Testes novos repetidos após ajuste de comparação de enum; typecheck e build aprovados.
- Vetor SHA-256 conferido independentemente com Python; Markdown com links/blocos verificados.
- Sem alteração de banco ou filas nesta etapa; nenhuma publicação de evento. Integração não repetida porque a alteração ficou em domínio/aplicação sem acesso à infraestrutura.
- Persistência financeira, inbox/outbox, dedup concorrente e snapshot da resposta continuam pendentes. Hash em memória não estabelece idempotência persistente.


## Mapeamento monetário e schema financeiro — 26/10/2026

- Money.rehydrate canônico assinado, tipo ORM string exato, mapeamento Money/Wallet e cinco EntitySchemas.
- Migration inicial com FKs, CHECKs, índices parciais, proteção de identidade/terminais, ledger append-only e constraints diferidas para saldo/ledger/version/cadeia/referências.
- Revisada representação física para numeric sem typmod + scale <= 2 + limites, rejeitando 0.001/0.000 sem arredondar. Sem conversões monetárias para number.
- Grants para papel existente não proprietário; teste cria/remova papel NOLOGIN próprio e prova movimento válido e negação de UPDATE/DELETE/TRUNCATE no ledger.
- Execução completa: 125 pass, 0 fail, 398 assertions em nove arquivos (105 unitários, 20 integração). Typecheck e build aprovados.
- SQL adversarial cobre unicidade, montantes inválidos, referências e reversões, wallet version, cadeia, imutabilidade, regressão de estado e envelope outbox. Falha de consistência reverte também inbox/outbox.
- Aplicação/reversão da migration real ocorreu somente em schema descartável. Schema/role/filas temporários removidos; public não migrado.
- O caso de uso precisa adquirir wallet antes de reservar transação; locks do schema motivaram revisão da ordem inicialmente proposta.
- Não foi demonstrada ainda concorrência com três processos, replay ou publicação após commit. Não há benchmark dos triggers sobre histórico longo.


## Casos de uso e replay persistente — 26/10/2026

- Porta FinancialUnitOfWork/FinancialSession, adaptador MikroORM e mapeadores completos de transação/ledger.
- OpenWallet confirma wallet, OPENING positivo, ledger e eventos outbox em um commit. Zero não gera transação/ledger/evento financeiro; duplicidade concorrente vira WALLET_ALREADY_EXISTS.
- Processamento valida contrato, trava wallet, reconsulta identidades, aplica domínio e grava resultado terminal histórico. Replay altera somente idempotentReplay; não consulta saldo atual para reconstruir resposta.
- Rejeições auditáveis sem ledger, referências pendentes com agendamento persistido, resume explícito e TTL de 24h. Evento de pendência não se repete por tentativa.
- Retry limitado de transação completa para conflitos SQL recuperáveis, sempre após rollback. Updates preservam campos imutáveis.
- Nova migration de taxonomia adiciona BALANCE_LIMIT_EXCEEDED; down preserva auditoria recusando estado incompatível. Migration inicial não alterada.
- 24 novos testes reais; suíte final 149 pass/0 fail/509 assertions em dez arquivos. Typecheck/build aprovados.
- Três processos Bun com barreira READY provam dedup, disputa de saldo e replay histórico após reinício. Teste separado demonstra B avançando com A travada. Falha injetada antes do commit não deixa efeitos financeiros parciais.
- Schemas, papel/filas temporários e processos filhos foram limpos/encerrados. Sem DDL no public, publicação, controller financeiro ou alterações em docs/ESTUDO.md.


## Integração HTTP e consultas — 26/10/2026

- Endpoints de wallet/submissão/consultas/ledger/reconciliação, com contratos estritos, status distintos e correlação de erros.
- Extensão ProviderIdentityPort/guard, adaptador local explícito e comparação de provider verificado. Sem IdP real ou autorização completa de wallets; modo local recusado em produção.
- Cursor keyset preserva microssegundos em texto SQL; valida wallet, versão e limites. Reconciliação REPEATABLE READ, sem reparo; divergência gera log/métrica/resposta.
- Health live/ready separados na API financeira; readiness verifica PostgreSQL/SQS. Contador de divergência Prometheus disponível.
- Startup exige flag, modo local, schema migrado e papel não proprietário/restrito. Nenhuma migração ou criação de papel ocorre automaticamente.
- 14 testes HTTP novos; suíte completa 163 pass/0 fail/589 assertions em 11 arquivos. Typecheck e build aprovados.
- Smoke do build: modo liveness retornou 200, processo encerrado; ativação financeira com conta administrativa recusada conforme esperado. Teste positivo com runtime restrito executado em pool/schema/papel exclusivos.
- Nenhum DDL aplicado ao public nem credencial persistente criada. Recursos de teste/servidores foram limpos/encerrados. Arquivos de estudo do usuário preservados.


## Consumidor/inbox e publisher — 26/10/2026

- InboxReceipt opcional integra a mesma FinancialSession do caso de uso. acceptInbox/completeInbox confirmam junto com efeito financeiro, ledger e outbox; nenhum wrapper de transação independente.
- transportHash cobre envelope completo; hash financeiro mantém subconjunto de negócio. Mesma identidade de transporte com chave alterada vai à DLQ, sem sobrescrever a inbox.
- Consumidor tem heartbeat, ack após commit, tratamento de rejeição/pendência confirmada, retry limitado e envio à DLQ antes de apagar origem. Falha de DLQ preserva mensagem; atributos seguros registram motivo.
- OutboxStore usa SKIP LOCKED, lease/token e updates condicionais. Publisher envia fora do commit financeiro, renova posse e agenda retry persistente com jitter sem descartar eventos.
- Startup worker consumer/publisher/both e drenagem SIGINT/SIGTERM preparados; nenhuma migration/credencial/fila provisionada automaticamente.
- 17 testes de mensageria adicionados. Suite final: 180 pass/0 fail/680 assertions em 12 arquivos. Typecheck/build aprovados.
- SIGKILL real após SQL commit e antes do ack não duplica débito. SIGKILL após envio e antes de publishedAt republica mesmo eventId; teste Standard demonstra duplicata e dedup downstream persistente.
- Testes de deadline/graceful drain, publishers concorrentes, lease antigo, referência pendente, rollback de inbox e DLQ confirmados. Teste de falha da DLQ corrigido para aguardar visibilidade por long polling.
- Smoke do worker compilado recusou conta administrativa e encerrou antes de consumir/publicar. Schemas/filas/filhos temporários foram removidos/encerrados; public e filas de desenvolvimento preservados.


## Scheduler e observabilidade — 26/10/2026

- Migration202610260003ReferenceJobs cria claims separados da tabela financeira; migrations anteriores preservadas. Wallet é travada antes de validar/travar o token no processamento.
- Scheduler seleciona vencidas, aplica jitter/backoff/TTL persistentes, trata lease perdido e recupera queda após claim. Stop devolve claims disponíveis sem bloquear numa seção financeira.
- Logs JSON com correlationId/messageId/transactionId/walletId/providerId e whitelist sem payload financeiro/credenciais/SQL. Identificadores não aplicáveis são null; IDs não viram labels.
- Métricas de status, duplicatas, retries, DLQ, locks, latência, outbox lag/backlog e scheduler. Gauges DB/SQS complementam counters por processo e sinalizam falha de coleta preservando última amostra.
- /metrics e health da API e workers; WORKER_MODE=all inclui scheduler. Portas separadas para múltiplos workers; DB_SCHEMA validado, default public.
- Novos testes: 5 unitários de telemetria, 5 integração de observabilidade, 10 scheduler, 1 instrumentação SQS e 1 entrypoint operacional.
- Suíte final: 202 pass/0 fail/788 assertions em 16 arquivos. Typecheck/build aprovados. Relatório local temporário: /tmp/backend-ballance-validation.log.
- Testes reais: dois schedulers, SIGKILL após claim, token antigo, TTL, rollback/retomada, ausência de inversão de locks e timeout PostgreSQL real com retry medido.
- Entry point source real executado com login restrito temporário e senha gerada em memória; processou referência, expôs health/métricas e encerrou por SIGTERM com código zero. Login/grants/fila/schema removidos; credencial não registrada em logs/artefatos.
- Nenhuma migration aplicada ao public nem runtime persistente criado. Documentos de estudo do usuário preservados.


## Runtime persistente e entrega Compose — 26/10/2026

- Dockerfile multi-stage Bun 1.4.4, lockfile congelado, dependências de produção e usuário bun; contexto allowlist exclui .env e arquivos locais.
- Overlay compose.app.yaml com provisionamento one-shot, API, worker all, healthchecks, bind local no host e prazo de shutdown de 45s. Compose base preservado.
- Provisionador cria schema dedicado/login restrito, aplica três migrations e grants, verifica conexão runtime, recusa schema não gerenciado/estado parcial e não rotaciona senha em reruns.
- Paths de migrations relativos ao módulo corrigem execução compilada sem diretório src. HTTP_HOST configura bind interno; SQS permite hostname localstack além de loopback.
- README agora documenta solução/setup/exemplos/limites; enunciado integral preservado em docs/CHALLENGE.md. Smoke reproduzível em scripts/smoke-delivery.ts.
- Novo teste real de provisionamento; suíte final 203 pass/0 fail/799 assertions. Typecheck/build aprovados.
- Imagem construída e stack limpa saudável em projeto ballance-delivery-check, portas/volume exclusivos. Buildx ausente: builder clássico validado.
- Smoke HTTP, replay histórico, SQS, publicação, reconciliação e métricas passou após SIGKILL/retomada do worker. O cenário não substitui os testes das janelas commit/ack.
- Sem alteração de docs/ESTUDO.md, configurações locais, public ou dados de desenvolvimento originais. Sem commit/push/deploy ou remoção de volumes. [Relatório](docs/DELIVERY.md).
- Stop/up completo preservou saldo 85.00 e restaurou health/métricas; financial tem sete tabelas e public nenhuma no banco isolado. Worker saiu com 0; API com 143/SIGTERM. Containers de validação encerrados ao final, volume e arquivo privado /tmp/ballance-delivery.env retidos para reprodução.


## Desenho de autenticação — 26/10/2026

Criado docs/AUTHENTICATION.md, com fluxos M2M/humano, validação JWT/JWKS, autorização de recursos, fronteira SQS/IAM, escala/revogação e critérios de aceite. ARCHITECTURE.md e README referenciam a proposta. A integração real continua adiada; sem mudança de código, serviços, credenciais ou migrations. Testes não repetidos nesta alteração documental; última validação permanece 203 testes/799 assertions da entrega. Alta escala ainda não medida.


## Preparação da publicação inicial — 26/10/2026

- Usuário autorizou primeiro commit e envio da branch main para harlemsilvas/backend-ballance-final, repositório público existente e inicialmente vazio.
- Autenticação permanece somente documentada por decisão explícita do usuário; nenhuma integração IdP adicionada.
- README inclui o endereço de entrega e obtenção do código. AGENTS/NEXT_TASK atualizados para o estado de entrega.
- Arquivos de estudo, .env/credenciais, configuração local da IDE, node_modules, dist e logs ficam fora do commit. Revisão de conteúdo antes do envio; sem deploy.
- Última suíte de integração: 93 testes reais, total com unidade de 203 testes/799 assertions na etapa de entrega. Nesta etapa de publicação, validação local de typecheck/build/unidade repetida; sem alteração do runtime financeiro.
- Verificação anterior ao commit: typecheck/build aprovados, 110 testes unitários/329 assertions sem falhas; diff staged sem erros de whitespace. Documentos e seleção de 97 arquivos revisados, com estudos/configurações locais e credencial privada de validação excluídos.
