# Estratégia de testes e evidências

Plano executado até scheduler/observabilidade: 202 testes passaram em 26/10/2026, 788 assertions em 16 arquivos. São 110 unitários e 92 integração. Provas reais de PostgreSQL/SQS, crashes, claims de referência, métricas/logs, timeout de lock e entrypoint com login temporário/SIGTERM. Typecheck/build aprovados. Resta reproduzir a configuração final de entrega em ambiente limpo; benchmark/OTel/dashboard não executados. Runtime/test runner obrigatório: Bun. Usar PostgreSQL e LocalStack reais em containers isolados; relógio e pontos de falha controláveis para testes determinísticos.

## Unidade

Money: entradas inválidas, escala, normalização sem arredondamento, limites, imutabilidade, operações e moedas diferentes. Wallet: saldo não negativo e versão. Transações: todos os kinds, referências, valor integral, reversão por tipo, estados terminais e rehydrate. Ledger: direção e aritmética. Hash: ordem das chaves, ausência de metadados e divergência de negócio.

## Integração

Migrations up/down/up em banco descartável; SQL direto para cada UNIQUE/CHECK/FK/trigger e papel de aplicação sem permissão de mutar ledger. Demonstrar proteção de saldo/ledger também fora do repositório ORM. Injetar falha antes do commit e verificar ausência de efeitos parciais, inclusive inbox/outbox. Testar abertura zero e positiva, replay após outras operações, rejeições sem ledger e reconciliação durante escrita.

SQS: redelivery, mesmo messageId com payload divergente, mensagens inválidas, retries, DLQ e indisponibilidade. Outbox: queda antes do envio, depois do envio e antes da marcação, lease expirado e dois publishers. Verificar eventId estável e consumidor idempotente. Referências: ausência, pendência, terminal rejeitada, ciclos, TTL e reinício mantendo agendamento.

## Concorrência obrigatória

1. Mesma BET 50 vezes em paralelo: um débito, um resultado original.
2. Duas BET de 80.00 sobre 100.00: uma PROCESSED, uma REJECTED, saldo 20.00 e um débito; distinguir crédito OPENING na contagem.
3. Wallets distintas em paralelo: progresso independente, sem lock global.
4. Pelo menos três processos reais compartilhando banco e fila, identificados nas evidências.
5. Matar worker após commit e antes de ack: redelivery sem segundo efeito.
6. Dois publishers sobre a mesma outbox: recuperação e nenhuma perda; duplicata permitida e deduplicada.
7. REFUND/ROLLBACK antes da referência: pendência seguida de resultado correto.
8. Reiniciar processos e verificar saldo, ledger, inbox, terminais e publicação eventual.

Usar barreiras para criar disputa real e hooks explícitos para a janela de crash; não substituir por chamadas sequenciais ou sleeps arbitrários. Em todos os cenários comparar saldo com SUM de créditos menos débitos, contagem por transação, versão e eventos esperados.

## Registro de resultados

Para cada execução registrar revisão do código, versões, comando existente, ambiente, processos, duração, esperado/observado e artefatos sem segredos. Comandos existentes: `bun test tests/unit` e `bun run test:integration`. Não anunciar scripts de concorrência ou cobertura financeira ainda não implementados. Benchmark é opcional e só deve reportar números medidos com metodologia, latências e outbox lag.

Guia de execução Bash: [MANUAL_TESTS.md](MANUAL_TESTS.md). Motivos das decisões e limitações: [DECISIONS.md](DECISIONS.md).

Migration real e evidências SQL em [FINANCIAL_SCHEMA.md](FINANCIAL_SCHEMA.md).

Casos de uso e provas multiprocesso: [FINANCIAL_PROCESSING.md](FINANCIAL_PROCESSING.md).

Endpoints e testes HTTP: [HTTP_API.md](HTTP_API.md).

Mensageria e testes de crash: [MESSAGING.md](MESSAGING.md).

Scheduler: [REFERENCE_SCHEDULER.md](REFERENCE_SCHEDULER.md). Telemetria: [OBSERVABILITY.md](OBSERVABILITY.md).
