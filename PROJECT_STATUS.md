# Estado do projeto

**Regra vigente após a submissão:** preservar a main de backend-ballance-jungle (referência da submissão 22d06c6; HEAD atual 7b21208 após duas correções Mermaid de 29/10/2026); nenhuma nova alteração direta nessa branch. Desenvolver primeiro em backend-ballance-final. Transferência à entrega apenas quando necessária, mediante solicitação e issue/PR; alterações por PR, sem merge automático. Política completa em [docs/DELIVERY.md](docs/DELIVERY.md). Esta regra substitui as autorizações anteriores de publicação direta.

Atualizado em 27/10/2026.

## Resumo atual

205 testes passaram (110 unitários + 95 integração, 819 assertions) em 18 arquivos. Typecheck e build aprovados. Entrega Docker Compose e provisionamento de runtime restrito validados em projeto/volume isolados, agora com imagens de origem fixadas por digest verificado. Scheduler automático de referências e observabilidade obrigatória implementados: logs JSON, métricas Prometheus, indicadores duráveis DB/SQS e endpoints da API/workers.

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

Núcleo financeiro, HTTP, SQS/inbox/outbox, scheduler e observabilidade obrigatória implementados. As seções abaixo preservam o histórico em cada etapa. Entrega reproduzível com Dockerfile, Compose da aplicação, provisionamento explícito e README final concluída; ativação sobre o volume de desenvolvimento existente permanece opcional e não foi executada. IdP real continua adiado com modo local explícito e ponto de extensão. Não há benchmark, OTel ou dashboard. Jobs concluídos são retidos; o primeiro piloto de histórico/coleta está em docs/LOAD_RESULTS.md, sem estabelecer capacidade sob carga de produção.


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


## Licença e política de segurança — 26/10/2026

- Adicionada licença MIT para código/documentação autorais de Harlem Silvas; README distingue enunciado Jungle Gaming, dependências e marcas de terceiros.
- Adicionado SECURITY.md com canal privado de reporte, escopo na main e limites da demonstração local, sem promessa de SLA ou suporte a versões anteriores.
- Autenticação segue somente documentada. Sem alteração de código, dependências, banco ou filas.
- Validação documental: links locais, texto MIT e diff revisados; suíte de testes não repetida, pois a alteração é somente documental. Última validação de código: 203 testes/799 assertions; typecheck/build/unidade repetidos na publicação inicial.
- Reporte privado de vulnerabilidades habilitado no GitHub e confirmado via API (`enabled=true`). Nenhum relato ou mensagem enviado.


## Análise do levantamento de correções — 26/10/2026

- Lido docs/CORRECOES.md e confrontado com enunciado, arquitetura, migrations, outbox/testes de mensageria e coleta de métricas. Levantamento original preservado.
- Criado docs/PLANO_CORRECOES.md com classificação, evidência, sequência e critérios de aceite; at-least-once é requisito, OTel/dashboard e carga são opcionais.
- Identificados candidatos para medição: validações completas repetidas por trigger, ausência de índice geral de wager_transactions por wallet e agregações por scrape. Nenhum impacto/ganho foi quantificado.
- Digests, medição, otimizações condicionais, contrato downstream e experimento de persistência do emulador foram propostos; particionamento não é correção automática.
- Nenhuma alteração de runtime/configuração/migration; nenhum teste de carga, banco ou fila executado, sem commit/push/deploy. Validação apenas documental e inspeção do código; última suíte completa registrada permanece 203 testes/799 assertions. Autenticação continua somente documentada.


## Pacote 1 — digests e coerência documental — 26/10/2026

- PostgreSQL 17.6-alpine, LocalStack 4.8.1 e Bun 1.4.4 fixados por tag + digest de índice multiplataforma em compose.yaml e ambos os FROM do Dockerfile. Versões nominais mantidas.
- Manifestos consultados no registry oficial; hash dos bytes conferido contra Docker-Content-Digest. docs/IMAGES.md registra referências, método, plataformas e atualização. Validação operacional somente linux/amd64; arm64 não executado.
- ARCHITECTURE.md reorganizado como estado atual, com propostas futuras explícitas. Guias corrigem pendências obsoletas de HTTP, inbox/outbox, scheduler, métricas e entrega; números de etapas anteriores foram mantidos como registros históricos. Links do enunciado apontam para docs/CHALLENGE.md.
- Build Docker real (builder clássico), typecheck/build do host, stack saudável e smoke HTTP/SQS/replay/publicação/reconciliação/métricas aprovados em ballance-digests-check.
- Suíte completa contra PostgreSQL/SQS com os digests: 203 pass/0 fail/799 assertions em 17 arquivos (41,63s). Sem novo benchmark.
- Shutdown concluído: worker/provisionador/PostgreSQL/LocalStack com saída 0; API com 143/SIGTERM conforme NestJS. Containers isolados encerrados, volume e /tmp/ballance-digests.env preservados para reprodução. Ambiente original continua saudável, sem recriação/migração.
- Digests/referências, links locais, Markdown e diff verificados. Nenhuma mudança em src/tests, migrations, package.json, bun.lock, enunciado ou estudo do usuário. docs/CORRECOES.md preservado. Sem commit/push/deploy.
- Próximo pacote: medição de histórico, locks e custo de scrape, antes de índices ou redesign. [Relatório](docs/DELIVERY.md) e [plano](docs/PLANO_CORRECOES.md).


## Pacote 2 — primeiro piloto de medição — 27/10/2026

- Criado bun run test:load em scripts/load, separado de src/build/Dockerfile da aplicação. Reutiliza casos de uso/HTTP/consumidor/publisher existentes sem alterar código financeiro ou migrations. Sem novas dependências ou alteração do bun.lock.
- Recursos por cenário: schema e login restrito gerados, três filas FIFO exclusivas e três processos Bun reais. População pelos casos de uso com constraints ativas; ANALYZE/sondas EXPLAIN antes da janela, aquecimento separado e off/on de /metrics.
- Rodada pequena de verificação: oito cenários com histórico 10. Em seguida, piloto default com 16 cenários, históricos 100/1.000, hot/spread de 1/3 wallets, HTTP/SQS, concorrência seis, 120 comandos por caso e uma repetição.
- Piloto: 1.920 operações PROCESSED, 19.616 lançamentos/transações auditados em 32 wallets, replay histórico preservado, inbox/outbox conferidas e DLQ vazia. Zero erros técnicos, rejeições inesperadas, falhas de scrape, retries ou conflitos SQL nos counters. Houve espera de lock, registrada separadamente de timeout/conflito.
- Relatório em docs/LOAD_RESULTS.md, método em docs/LOAD_TESTS.md e resumo revisado em docs/benchmarks/baseline-20261027.json; brutos locais em /tmp/ballance-load-baseline-20261027. Hashes do código/configuração medidos registrados e conferidos; commit-base com worktree suja explicitado.
- Evidência sugere investigar histórico/locks/coleta, sem provar ganho de índice ou custo causal isolado. Uma repetição, 120 amostras, caches aquecidos, carga BET-only e topologia combinada de teste não permitem estimar capacidade de produção. Histórico 10.000 não executado.
- Novo teste de integração interrompe a janela e verifica limpeza de schema/login/filas, preservando schema de controle. Primeira tentativa após retomada falhou por conexão recusada, com containers isolados parados; stack exclusiva foi retomada e o teste passou.
- Suíte funcional final: 204 pass/0 fail/806 assertions em 18 arquivos (44,18s), contra PostgreSQL/SQS isolados. Typecheck e build aprovados. Autenticação continua somente documentada. Sem commit/push/deploy.
- Conferência final no ambiente exclusivo: zero schemas de teste, zero logins/conexões bb_load e nenhuma fila temporária remanescente. Containers ballance-load-check encerrados com código 0 e volume preservado. Os containers originais backend-ballance já estavam parados nesta retomada e permaneceram assim, sem alteração dos dados.
- Links/Markdown, diff e hashes do código medido revisados; src, migrations, fixtures existentes, enunciado e arquivos de estudo preservados. Próxima decisão: ampliar/repetir a medição antes de aplicar otimizações.


## Experimentos sequenciais 002/003 e plano posterior — 27/10/2026

- Runner ampliado apenas em scripts/load: múltiplos intervalos de coleta, seleção de distribuições/transportes, ordem completa invertida na segunda repetição, sondas SQL repetidas e limite auditado de população. Nenhuma alteração em src, migrations, dependências ou bun.lock.
- Controle pequeno comprovou off/50ms/1s seguido da ordem inversa e duas sondas por SELECT. Novos controles de interrupção e orçamento passaram antes da extensão maior. Exportador recusa sobrescrever RESULTS/JSON existentes e exige sequência anterior.
- Experimento 002 concluído: 48 pontos, históricos 100/1.000, 1/6 wallets, HTTP/SQS, três processos, concorrência seis, 360 comandos, duas repetições e off/5s/15s. 17.280 operações medidas, 109.968 lançamentos/transações auditados em 168 wallets, 186 scrapes e zero erros técnicos, rejeições inesperadas, falhas de fonte, retries ou conflitos SQL registrados.
- População do 002 somou 1.768,64s, fora das janelas medidas; maior população individual 140,71s. Resultados individuais e agregações estão em docs/LOAD_RESULTS_002.md e docs/benchmarks/results-002.json, com brutos locais em /tmp/ballance-load-experiment-002.
- Experimento 003 focado mirou 10.000 numa wallet/HTTP. A população parou por orçamento em 7.977 entradas aos 600,002s, com saldo/ledger/versão/saldo esperado consistentes. Diagnóstico posterior de aproximadamente 682,37ms preservou ANALYZE e cinco execuções dos SELECTs por consulta. Não houve janela HTTP de 10.000, comparação off/5s ou publicação desse ponto; não se anuncia throughput inexistente.
- 003 registrado como population-budget-exceeded em docs/LOAD_RESULTS_003.md e docs/benchmarks/results-003.json; trajetória em population-003.json e brutos em /tmp/ballance-load-experiment-003. É limite operacional escolhido, não teto universal ou falha financeira.
- Fontes/configurações medidas preservadas em sources-002.tar.gz e sources-003.tar.gz; 49 arquivos por bundle conferidos contra os hashes do respectivo ambiente. Fontes financeiras iguais entre rodadas. O 001 e seu JSON foram preservados sem alteração.
- Regressão final posterior às medições: 205 pass/0 fail/819 assertions em 18 arquivos (42,00s), inclusive SQL adversarial, replay, concorrência, crashes e controles do runner. Typecheck/build aprovados.
- Plano de melhorias escrito somente após essa regressão, em docs/LOAD_IMPROVEMENT_PLAN.md: atribuição de custo, A/B de índice por wallet, validação histórica/incremental condicionada e coleta conforme evidência. Não há implementação imediata nem migration/índice/trigger/coletor de produção alterado.
- Índice dos relatórios em docs/LOAD_RESULTS_INDEX.md. Nenhum commit/push/deploy nesta etapa. Autenticação permanece somente documentada.
- Conferência final: zero schemas temporários, zero logins/conexões de carga e nenhuma fila de teste remanescente. Containers ballance-load-check encerrados com código 0, volume preservado; ambiente original já parado foi mantido no mesmo estado. Relatórios antigos 001/002 não foram sobrescritos.


## Consolidação local em Git — 27/10/2026

Usuário autorizou consolidar as alterações concluídas em commit local: digests, coerência documental, runner/controles, relatórios sequenciais e fontes medidas, além do plano posterior aos testes. Conteúdo, links, arquivos locais e bundles foram revisados; os hashes dos arquivos nos bundles foram conferidos. Código financeiro, migrations, bun.lock e enunciado permanecem preservados. Última validação de código: 205 testes/819 assertions, typecheck/build aprovados; não repetida nesta etapa de revisão/commit, sem nova mudança de runtime. Envio remoto e deploy não fazem parte desta solicitação.


## Pacote essencial para avaliação por ZIP — 27/10/2026

- Novo gerador `python3 scripts/package-delivery.py`, com allowlist e templates versionados em `scripts/delivery/`, produz `entrega/` e `entrega.zip` ignorados pelo Git. Não sobrescreve edições existentes. Manifesto SHA-256, fontes/migrations/lockfile preservados e documentação essencial; estudos, credenciais, dependências instaladas e benchmarks excluídos.
- Destinatário usa Docker/Compose, sem Bun/Node/Python no host. Guia contempla máquina nova, instalação oficial por sistema, senha gerada em container, build, provisionamento, execução, testes e smoke. Pacote não é offline nem instalador administrativo universal.
- Testes em infraestrutura própria sem portas publicadas; loopback mantém as proteções das suítes existentes e PostgreSQL exige SCRAM. Diagnóstico inicial detectou autenticação trust em loopback; corrigida somente na configuração de testes, sem afrouxar teste ou alterar código financeiro. Volumes anteriores preservados.
- Typecheck/build aprovados; suíte funcional essencial: 203 pass, 0 fail, 799 assertions em 17 arquivos (40,17s). Os dois controles específicos do runner de carga e seu script opcional não integram o pacote; suíte ampliada do repositório segue com 205 testes e não foi alterada.
- Stack exclusiva ballance-entrega, portas 33000/39101/35546/34567: provisionamento e health aprovados; smoke HTTP/replay/SQS/publicação/reconciliação/métricas passou; stop/up preservou saldo 85.00 BRL. Runtime com tag backend-ballance-entrega:local. Builder clássico validado após falha de descoberta de plugin Buildx no host.
- Registro distribuído em entrega/VALIDACAO.md. ZIP não inclui .env nem logs privados. Containers de validação encerrados com volumes preservados; nenhum reset, commit, push ou deploy. Nenhum ajuste de src, migrations, dependências ou garantias financeiras.

## Encerramento da sessão — 27/10/2026

Usuário autorizou consolidar o pacote essencial de entrega em commit local e encerrou o desenvolvimento por hoje. Próximas interações serão voltadas ao estudo e esclarecimento de dúvidas. Gerador/templates e documentação ficam versionados; materiais pessoais e artefatos entrega/entrega.zip permanecem ignorados. As validações do pacote registradas acima não foram repetidas para este fechamento, sem alterações de runtime. Push não solicitado nesta etapa.


## Revisão das decisões implementadas — 28/10/2026

Atualizado docs/DECISIONS.md a pedido do usuário durante o estudo. Interpretações adicionais de negócio consolidadas com motivos, código e testes: LOSS zero, payout WIN, reversão por referência/tipo, BRL público, precisão/limite monetário, TTL/backoff, taxonomia e recusa de carteira inexistente. Regras já exigidas são diferenciadas das escolhas de implementação. Corrigidos registros obsoletos sobre medições/testes pendentes, quantidade de tabelas e escopo da entrega; evidências históricas de 205/819 no repositório e 203/799 no pacote essencial explicitadas sem nova execução.

Verificação desta revisão: links locais, blocos Markdown e diff. Não foram executados testes da aplicação nem alterados código, migrations, credenciais ou runtime. O ZIP/pasta de entrega existentes não foram regenerados; a próxima edição gerada incorporará o documento atualizado. Sem commit/push nesta solicitação.


## Entrega pública para avaliação — 28/10/2026

Novo repositório exclusivo publicado por autorização do usuário: https://github.com/harlemsilvas/backend-ballance-jungle (público, main, commit bbdabd4bff85471ba7da230f3ec3f4bbabb73023). Pasta local independente: avaliacao/. README enxuto, .env.example, senha gerada por entrega.sh init; .env privado não versionado. Suíte na candidata: typecheck/build aprovados, 215 testes/857 assertions/21 arquivos, 0 falhas, 45,66s; smoke DeliverySmokePassed. Readiness API/worker, Swagger/OpenAPI (dez paths) e painel responderam HTTP 200. Acesso público ao GitHub sem autenticação confirmado com HTTP 200. Canal privado de vulnerabilidades habilitado conforme SECURITY.md.


Revisão da orientação ao avaliador: README e LOAD_TESTS da pasta avaliacao distinguem scripts Docker (infraestrutura/dependências automáticas) de Bun direto (preparação manual, conexão e LOAD_CONFIRM). Incluído load3000 na tabela curta; manifesto atualizado, diff --check aprovado. Alteração exclusivamente documental, sem nova execução da suíte. Commit e4d0023 no repositório de avaliação.


Revisão documental da avaliação: commit 2dcf2f1 em avaliacao alinha ARCHITECTURE/DECISIONS ao conteúdo entregue (Swagger, painel e carga), registra adaptação inbox/outbox e custo de histórico sob lock, atualiza estratégia de testes (dois controles do runner), migrations do worker e distinção entre evidências históricas e atuais. Links relativos, SHA256SUMS e diff --check conferidos; somente Markdown/manifesto, sem execução adicional da suíte nem alteração de código financeiro.


Retomada solicitada para a próxima sessão (29/10/2026): revisar correção geral, concorrência e modelagem, planejar próxima versão e apresentação dos aprendizados. Roteiro em docs/FEATURES_PROXIMA_VERSAO.md; inclui limpeza de referências a estudos/documentos de desenvolvimento ausentes na entrega. Versão pública de referência 2dcf2f1 preservada; roteiro somente local, sem implementação ou publicação.


Limpeza editorial autorizada e concluída no repositório de avaliação: commit 22d06c6 substitui referências a materiais internos ausentes por README, TEST_STRATEGY e registro de validação; títulos de estudo convertidos em exemplos de uso. Links, manifesto e diff --check aprovados. Somente documentação, sem alteração financeira ou nova suíte. Referência pública atualizada para 22d06c6; revisão técnica da próxima versão continua pendente.


Revisão de conformidade e limpeza documental (29/10/2026), sem alteração de código financeiro. Suíte executada contra PostgreSQL 17.6 e LocalStack 4.8.1 reais: typecheck e build aprovados; `./tests/unit` 120 testes/11 arquivos e `./tests/integration` 95 testes/10 arquivos, 0 falhas. Scripts `test` e `test:integration` passaram a usar `./tests/...` para não incluir cópias locais em entrega_teste/ e avaliacao/. README sem as seções de entrega/entrega_teste (pacote, painel, Swagger, perfis de volume), com o fallback sem Buildx. Matriz 100/1.000/3.000 continua sem rodada documentada no repositório; perfis `test:load3000` e `test:load:volume` disponíveis. Decisão do autor: experimento 004, summary da VPS e a edição experimental (pacote, painel e Swagger empacotados) foram estudos de ambiente e ficam fora do repositório; o índice de carga é 001–003 e o próximo número reservado é 004. Swagger local e painel de relatórios permanecem como ferramentas opcionais em docs/OPTIONAL_TOOLS.md. Commit d3c871f publicado em origin/main.


Análise crítica da entrega e Fase A de correções (29/10/2026), somente documentação. Diagramas Mermaid de FINANCIAL_PROCESSING.md e MESSAGING.md corrigidos (ponto e vírgula no texto da mensagem quebrava o parser). Comandos dos documentos passaram a ser relativos à raiz, com `./tests/...`, sem caminho local nem `export PATH`. Expressão "ambiente de desenvolvimento original" reescrita. ARCHITECTURE.md ganhou a seção sobre ORM, Money e estratégia transacional exigida pelo enunciado. Referência do jungle atualizada para 7b21208 (duas correções Mermaid feitas pelo autor em 29/10/2026). Achados e plano em docs/ANALISE_ENTREGA.md. Nenhuma alteração no jungle; Fase B (PR) pendente de decisão. Suíte não reexecutada nesta etapa por não haver mudança de código.
