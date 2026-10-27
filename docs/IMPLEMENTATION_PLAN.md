# Plano de implementação e estado da entrega

As nove etapas obrigatórias abaixo foram implementadas e validadas. O histórico detalhado está em [PROJECT_STATUS.md](../PROJECT_STATUS.md); o [enunciado](CHALLENGE.md) permanece a referência dos requisitos. O plano de evolução após a entrega está em [PLANO_CORRECOES.md](PLANO_CORRECOES.md).

| Etapa | Entrega | Critério de conclusão | Estado atual |
|---|---|---|---|
| 1 | Bun/Nest/strict, versões e Compose | Build e infraestrutura reproduzíveis | Implementada; setup limpo da entrega validado em projeto/volume isolados |
| 2 | Money, entidades, eventos e estados | Unidade cobrindo contratos e invariantes | Domínio e quatro eventos implementados; inbox/outbox integradas à persistência nas etapas 6/7 |
| 3 | MikroORM, migrations e permissões | SQL adversarial e reversibilidade em banco exclusivo | Três migrations, grants restritos e provisionador explícito implementados |
| 4 | Wallet, processamento e replay | Atomicidade, abertura e resultado histórico | Implementada e testada no PostgreSQL, inclusive multiprocesso |
| 5 | HTTP, consultas e reconciliação | Contratos/status, cursor e snapshot consistente | Implementada; API operacional validada com runtime restrito no Compose isolado |
| 6 | Inbox e consumidor SQS | Commit/ack, redelivery e DLQ | Implementada; entrypoint real e fluxo Compose validados |
| 7 | Outbox e referências pendentes | Publishers concorrentes, leases e recuperação | Publisher e scheduler implementados; crashes, backoff/TTL e claims testados |
| 8 | Observabilidade e shutdown | Métricas obrigatórias, readiness e drenagem | Implementada em API/workers; OTel/dashboard não adicionados |
| 9 | Prova multiprocesso e entrega | Três processos e setup limpo | Implementada; smoke HTTP/SQS, reinício e persistência validados em projeto exclusivo |

A validação isolada não migrou o volume de desenvolvimento original. Aplicar a entrega a outro banco/volume exige conferir o alvo; não é pendência de implementação da aplicação. Autenticação externa permanece somente documentada por decisão do usuário. Double-entry, dashboard e OTel não estão implementados; o runner de medição tem um piloto documentado em LOAD_RESULTS.md. Esses opcionais não são apresentados como requisitos obrigatórios concluídos.

## Estrutura existente

Código em src/{domain,application,infrastructure,interfaces,bootstrap}; testes em tests/{unit,integration,support}, com filhos Bun para concorrência/crash. Não existe diretório separado de testes/concurrency: as provas estão na integração. Migrations em src/infrastructure/persistence/migrations; scripts em scripts/; infraestrutura local em docker/. Criar novos diretórios somente junto de arquivos úteis.

O primeiro pacote de correções fixa imagens por digest e revisa documentação; os pacotes seguintes dependem de medição e critérios de aceite, sem retirar invariantes financeiras.
