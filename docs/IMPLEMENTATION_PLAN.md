# Plano de implementação

Plano sequencial, sem datas ou prazo de entrega definido. Bootstrap e conectividade local validados; Money, Wallet e ledger têm testes unitários. Configuração ORM e mecanismo de migrations foram antecipados para validar infraestrutura. WagerTransaction também implementado e testado; eventos e hash canônico também implementados. Inbox/Outbox serão desenvolvidos nas etapas de mensageria. Priorizar os 70 pontos de correção financeira, concorrência, idempotência e mensageria antes dos opcionais.

| Etapa | Entrega | Critério de conclusão | Estado revisado |
|---|---|---|---|
| 1 | Bootstrap Bun/Nest/strict, dependências fixadas e Compose isolado | Instalação reproduzível, build e conectividade local | Concluída; instalação do zero ainda deve ser reproduzida na entrega |
| 2 | Money, entidades, eventos e estados | Unidade cobrindo contratos e invariantes | Núcleo financeiro e quatro eventos concluídos; Inbox/Outbox nas etapas 6/7 |
| 3 | MikroORM, migrations up/down, constraints e permissões | SQL adversarial e reversibilidade em banco descartável | Schema financeiro, up/down/up e grants restritos validados em schema isolado; provisionar runtime persistente antes da API |
| 4 | Criar wallet, processamento transacional e replay | Atomicidade, abertura, regras e saldo histórico comprovados | Implementado/testado diretamente no PostgreSQL; controllers na etapa 5 |
| 5 | HTTP, consultas, paginação e reconciliação | Contratos e status consistentes | Implementada/testada em schema isolado; ativação operacional depende de runtime restrito |
| 6 | Inbox e consumidor SQS | Redelivery, conflito de hash, ack após commit e DLQ | Consumidor/inbox atômica, retry/DLQ e redelivery testados; ativação operacional pendente |
| 7 | Outbox e referências pendentes | Dois publishers, leases, expiração e crash recovery | Publisher e scheduler com leases/claims, backoff/TTL e recuperação testados |
| 8 | Observabilidade e shutdown | Métricas obrigatórias, readiness e drenagem | Requisitos obrigatórios implementados/testados; OTel/dashboard opcionais não adicionados |
| 9 | Prova multiprocesso e entrega | Três instâncias, evidências e setup reproduzido do zero | Três processos, crashes e entrypoint/SIGTERM com runtime temporário provados; entrega reproduzível persistente pendente |

Em cada etapa atualizar estado, testes executados e decisões. Não implementar autenticação, dashboard, double-entry ou benchmark antes dos requisitos obrigatórios. Uma sessão de entrega deve reproduzir setup limpo sem depender do banco do desenvolvedor.

## Estrutura planejada

Código em `src/{domain,application,infrastructure,interfaces,bootstrap}`; testes em `tests/{unit,integration,concurrency,support}`; migrations em `src/infrastructure/persistence/migrations`; scripts em `scripts/`; infraestrutura local em `docker/`; decisões adicionais em `docs/adr/` quando houver uma mudança relevante. Criar os diretórios junto com seus arquivos úteis.
