# Plano de correções e evolução

Análise em 26/10/2026 do levantamento [CORRECOES.md](CORRECOES.md), confrontado com o [enunciado original](CHALLENGE.md), a arquitetura e a implementação. Estado atual: pacote 1 (digests e revisão documental) implementado e validado; o pacote 2 agora tem runner e um piloto exploratório concluído (LOAD_RESULTS.md), e os demais pacotes continuam propostos. A análise original foi preservada. Evidências atuais em [DELIVERY.md](DELIVERY.md) e [IMAGES.md](IMAGES.md).

## Critério de prioridade

As seções 3, 5, 6, 8, 10, 11 e 13 tornam obrigatórios precisão, consistência SQL, idempotência, concorrência e recuperação. Nenhuma otimização pode reduzir essas garantias. A seção 12 exige logs/métricas/health e declara OpenTelemetry/dashboard opcionais. A seção 14 também torna carga um diferencial opcional, sem meta de RPS.

O levantamento mistura riscos operacionais, hipóteses de desempenho e decisões exigidas pelo contrato. A ordem abaixo prioriza mudanças pequenas e evidência antes de alterações estruturais.

| Ponto do levantamento | Conclusão da leitura | Encaminhamento |
|---|---|---|
| Crescimento do ledger/constraints | Custo estrutural confirmado no SQL; magnitude e limite de capacidade não medidos | Medir, avaliar índice e só então discutir redesign/particionamento |
| At-least-once/outbox | Comportamento previsto e exigido, com dedup persistente já testada | Preservar semântica e reforçar contrato/exemplo downstream |
| Imagens sem digest (levantamento inicial) | Corrigido no pacote 1: referências de origem agora usam tag + digest | Manter atualização explícita e validação conforme IMAGES.md |
| Estado SQS após recriação | Limite documentado da configuração local; não confundir com queda de worker | Definir ciclo de vida do ambiente e testar persistência em configuração compatível |
| Ausência de OTel/dashboard | Extensão opcional, sem evidência por si só de requisito obrigatório ausente | Manter métricas atuais; evoluir coleta e depois visualização/tracing |

## Pacote 1 — reprodução e documentação coerentes

**Implementado no pacote 1:** fixar as imagens PostgreSQL 17.6-alpine, LocalStack 4.8.1 e Bun 1.4.4 por tag + digest verificado no registry. Aplicar ao Compose e aos dois FROM do Dockerfile. Registrar se o digest é de manifesto multiplataforma ou específico de plataforma; validar nas arquiteturas declaradas como suportadas. Registrar procedimento de atualização e nova validação, pois digest fixo também impede receber correções silenciosamente.

**Respaldo:** seções 4 e 14 (stack, Compose e entrega documentada); melhoria de reprodução, não requisito textual de digest. [Docker recomenda pinning por digest](https://docs.docker.com/build/building/best-practices/#pin-base-image-versions).

**Aceite:** resolução dos digests e build real; stack isolada saudável; smoke HTTP/SQS, publicação, métricas e shutdown. Atualizar README/DELIVERY sem anunciar garantia de ausência de vulnerabilidades. Não trocar a versão do emulador nem remover volumes existentes para validar.

Também revisar o texto atual de ARCHITECTURE.md e guias: existem parágrafos que ainda dizem que scheduler, workers ou observabilidade estão pendentes, apesar das implementações descritas depois. Distinguir decisões históricas de estado atual e corrigir links que chamam o README de enunciado. Não alterar o enunciado nem os arquivos pessoais de estudo.

## Pacote 2 — medir a rota financeira e o custo da observabilidade

**Evidência no código:** `check_financial_consistency`, em Migration202610260001FinancialSchema, soma ledger, conta mudanças, verifica transações/referências e percorre a cadeia histórica. Constraint triggers diferidos por linha são registrados em wallets, wager_transactions e wallet_ledger; uma mesma operação pode disparar a validação completa várias vezes no commit. DEFERRED adia execução, não significa uma única execução por wallet.

Há índices úteis no ledger: (wallet_id,transaction_id), (wallet_id,wallet_version) e (wallet_id,created_at,id). Em wager_transactions, não há índice geral começando por wallet_id: o índice opening_once é parcial e não cobre o predicado geral da validação. Isso é uma oportunidade concreta de investigação; ainda não há plano SQL medido que prove o ganho de um índice novo.

`MetricsCollector.scrape()` executa consultas de backlog/lag e GROUP BY status sobre transações a cada requisição; cada processo pode repetir a coleta. O custo do scrape merece medição junto com o processamento. A observabilidade atual vai além de healthchecks: já inclui status, duplicatas, retry, DLQ, locks, lag e histogramas.

**Primeiro experimento implementado:** `bun run test:load` foi criado e verificado conforme seção 14; método em [LOAD_TESTS.md](LOAD_TESTS.md) e piloto em [LOAD_RESULTS.md](LOAD_RESULTS.md). Continuidade proposta: Usar PostgreSQL/SQS reais e recursos exclusivos. Variar histórico por wallet (por exemplo, 100/1.000/10.000 lançamentos) e número de wallets; separar população do histórico da janela medida. Registrar também o custo da população, sem desativar invariantes para gerar a evidência de ponta a ponta.

Comparar uma wallet disputada com muitas wallets independentes, três ou mais processos e carga HTTP/SQS, com coleta de métricas ligada/desligada ou em diferentes frequências. Registrar hardware, versões, digests, concorrência, duração, aquecimento e distribuição de operações. Reportar throughput, p50/p95/p99, rejeições de negócio separadas de falhas técnicas, conflitos/retries, outbox lag/backlog e consumo de recursos.

Usar EXPLAIN (ANALYZE, BUFFERS) das consultas relevantes e medição do commit/transação completa; SQL isolado não representa todo o custo dos triggers. Executar ANALYZE após população e registrar condições de cache. Qualquer EXPLAIN ANALYZE que escreva deve ocorrer somente no ambiente exclusivo, com efeitos controlados. Perfis com instrumentação adicional devem ser identificados, pois ela também tem custo.

**Aceite:** relatório reproduzível e reconciliação final de todas as wallets exercitadas, ausência de efeito duplicado e preservação de saldo/ledger/version/replay. Nenhum ganho de desempenho será anunciado antes da comparação. Até então não há novo limite de capacidade conhecido.

## Pacote 3 — otimizações limitadas pelos resultados

**Primeira candidata:** migration nova e reversível com índice geral `wager_transactions(wallet_id)`, se os planos e a comparação justificarem. Não editar a migration inicial já publicada/provisionada. Validar custo de escrita/armazenamento, planos com distribuição representativa e up/down/up em schema descartável. Não exigir artificialmente Index Scan em tabelas pequenas; o otimizador pode escolher outra estratégia válida.

**Segunda candidata:** limitar/coalescer coletas globais de métricas, mantendo counters por processo. Uma solução pequena é compartilhar uma atualização em andamento e manter amostra por intervalo configurável. Explicitar idade da amostra, timeout e erro de coleta; preservar última amostra sem apresentá-la como saudável/recente após falha. Não substituir gauges duráveis apenas por counters locais. Não criar contadores globais transacionais ou novos locks financeiros sem necessidade medida.

**Se o histórico continuar dominando o custo:** desenhar validação incremental no banco e/ou reduzir verificações completas repetidas na mesma unidade de trabalho, com prova das invariantes. A solução deve funcionar para escrita SQL direta, múltiplas operações na mesma transação, abertura zero/positiva, LOSS, rejeição, pendência e reversões; não pode depender só da disciplina do caso de uso. Qualquer estratégia de coalescência deve respeitar SET CONSTRAINTS e rollback/savepoints. Reconciliação periódica sozinha não substitui a garantia no commit.

**Particionamento fica condicionado à evidência.** Por tempo, as verificações por wallet ainda podem percorrer muitas partições. Por wallet, o histórico de uma wallet quente continua crescendo. Além disso, no PostgreSQL 17, PK/UNIQUE de tabela particionada deve incluir a chave de particionamento; as identidades globais e FKs atuais precisam de desenho explícito. Não acrescentar data/wallet à idempotência para acomodar a partição e permitir duplicatas que hoje seriam conflito. [Limitações oficiais do PostgreSQL 17](https://www.postgresql.org/docs/17/ddl-partitioning.html#DDL-PARTITIONING-DECLARATIVE-LIMITATIONS).

**Respaldo e aceite:** seções 5, 6, 8 e 13. Repetir SQL adversarial, atomicidade financeira/inbox/outbox, concorrência entre três processos, replay histórico, referências e crashes. Qualquer substituição de triggers exige migration nova, plano de reversão compatível com dados e comparação de carga. Não arquivar/apagar ledger ou remover constraints para melhorar números.

## Pacote 4 — fortalecer contrato downstream e testes de duplicação

O desenho de outbox segue as seções 3, 5.3, 10 e 11. O teste `SIGKILL after send before mark recovers stable eventId; downstream inbox dedups duplicate`, em messaging.test.ts, usa fila Standard para tornar duplicatas observáveis e insere eventIds numa inbox persistente. Também há teste de queda após commit antes do ack e dois publishers concorrentes.

**Proposta:** explicitar contrato de consumo: deduplicar por (consumerName,eventId), validar envelope/hash e confirmar inbox + efeito/projeção do consumidor no mesmo commit; ack depois. Provar com consumidor de exemplo/teste que uma projeção persistente recebe um único efeito diante de duplicatas, reinício e queda antes/depois do commit. O consumidor de exemplo não deve encaminhar eventos da fila de saída de volta ao caso de uso de comandos financeiros.

FIFO e MessageDeduplicationId=eventId continuam como otimização; a [AWS documenta uma janela de deduplicação de cinco minutos](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues-exactly-once-processing.html). Isso não elimina a janela entre efeito no banco e ack do consumidor nem substitui idempotência persistente.

**Aceite:** mesmo eventId mantém efeito único e resultado persistente após reinício; replay de evento não cria nova movimentação financeira. Documentar a responsabilidade dos consumidores externos. Não substituir o broker nem anunciar exactly-once ponta a ponta.

## Pacote 5 — ciclo de vida e durabilidade do ambiente de filas

Distinguir: queda de API/worker, indisponibilidade temporária do broker, restart gracioso do mesmo container, recriação com armazenamento preservado e perda do armazenamento. São cenários diferentes. A suíte atual cobre recuperação de processos e redelivery, mas não estabelece durabilidade SQS após recriação do emulador.

Para CI efêmero, criar recursos por execução é apropriado; não depender de mensagens de um job anterior. Para homologação local persistente, verificar na versão/edição realmente utilizada o suporte a persistência SQS, snapshots, volume e comportamento em SIGKILL; não assumir que adicionar um volume ou PERSISTENCE=1 basta. A [documentação de persistência do LocalStack](https://docs.localstack.cloud/aws/developer-tools/snapshots/persistence/) descreve snapshots e limitações; a documentação atual não prova compatibilidade integral com a imagem 4.8.1 fixada no projeto.

**Experimento/aceite:** em outro projeto Compose, publicar comandos/eventos identificáveis, recriar o emulador sem remover seu armazenamento e verificar filas, atributos, mensagens e recuperação da aplicação. Separar resultados de shutdown gracioso e crash. Se a versão/edição não atender, registrar a limitação e avaliar opção compatível com o enunciado, custo e licença antes de mudar a stack.

Eventos com published_at já confirmado não são automaticamente republicados se o broker perder seus dados depois. Preservar a outbox PostgreSQL ajuda auditoria, mas não recupera sozinho essa perda; comandos ainda não aceitos no banco também podem ser perdidos. Não resetar published_at em massa como reparo. Um eventual replay operacional exige escopo, eventId original, consumidores idempotentes e trilha de auditoria. Isso é uma extensão de recuperação de desastre, distinta da recuperação normal após crash do publisher prevista no desafio.

## Pacote 6 — observabilidade opcional

Depois da medição e das correções justificadas, considerar um perfil opcional Prometheus/Grafana aproveitando métricas existentes. Alerts podem cobrir lag/backlog, DLQ, falha de coleta e conflitos. Não somar gauges globais repetidos por instância; separar esse caso dos counters locais, como já documentado em OBSERVABILITY.md.

OpenTelemetry pode vir depois, com exportação para collector e contexto propagado entre HTTP, outbox, SQS e scheduler. Deve definir contexto persistido/versionamento, sampling, retries e comportamento de falha, sem gravar dados financeiros sensíveis nem publicar durante a transação financeira. Não presumir compatibilidade automática de instrumentação com Bun/NestJS/MikroORM: verificar versões na implementação. Tracing por si só não elimina gargalos.

**Respaldo:** seção 12, opcional. **Aceite:** um fluxo assíncrono correlacionável, custo medido, inicialização/shutdown corretos e falha de exportador sem impacto no commit/ack. Nenhuma promessa de dashboard/APM já implementado.

## Ordem recomendada e limites desta etapa

1. Digests e revisão das contradições documentais.
2. Medição de histórico, locks e coleta de métricas.
3. Índice e coleta controlada, conforme evidência; comparar antes/depois.
4. Exemplo downstream com inbox + efeito atômicos.
5. Experimento isolado de persistência do emulador, conforme necessidade do ambiente.
6. Triggers incrementais/particionamento e OTel somente se justificados pelos resultados e pelo escopo desejado.

Autenticação continua somente documentada por decisão do usuário. Este plano não autoriza reset de banco, remoção de volumes, publicação ou deploy. A análise inicial foi documental; posteriormente o pacote 1 executou build, smoke, suíte completa (203 testes/799 assertions) e shutdown no projeto isolado ballance-digests-check. O pacote 2 executou posteriormente um piloto exploratório de 16 cenários (27/10/2026), sem benchmark de capacidade. Links locais e correspondência com código/enunciado foram revisados.


## Revisão após os experimentos sequenciais

As rodadas 002/003 foram encerradas e a regressão final passou com 205 testes/819 assertions. O [plano posterior aos testes](LOAD_IMPROVEMENT_PLAN.md) refina as prioridades deste documento usando as novas evidências: não há efeito monotônico de coleta demonstrado, o índice exige A/B, e o custo histórico merece profiling antes de redesenho. O 003 registrou limite de população, sem throughput de 10.000. Nenhuma melhoria de produção foi implementada. Relatórios em [LOAD_RESULTS_INDEX.md](LOAD_RESULTS_INDEX.md).
