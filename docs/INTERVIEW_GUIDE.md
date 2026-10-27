# Roteiro de apresentação técnica

Este roteiro descreve a implementação entregue. Usar as evidências registradas em PROJECT_STATUS.md e DELIVERY.md; identificar como propostas as extensões ainda não implementadas.

## Narrativa sugerida

1. Explicar o problema: at-least-once, reordenação, concorrência e falhas entre banco e broker.
2. Mostrar Money exato e a relação entre saldo materializado e ledger imutável.
3. Percorrer uma BET: validação, identidade persistente, lock por wallet, commit conjunto e resposta histórica.
4. Demonstrar a disputa de duas apostas e o replay 50 vezes com três processos.
5. Matar consumidor após commit, explicar ack e mostrar redelivery sem débito adicional.
6. Mostrar outbox recuperando evento e explicar por que publicação duplicada é possível.
7. Apresentar referência antecipada, reconciliação e diagnóstico por métricas.
8. Encerrar com limitações comprovadas, decisões de escopo e próximos passos.

## Perguntas para preparar

- Por que lock pessimista? Simplicidade de serialização por wallet; custo de espera em wallets quentes. Mostrar o teste de timeout real; medição de capacidade continua pendente.
- Por que FIFO não basta? Não cobre concorrência HTTP, expiração de dedup nem commit PostgreSQL.
- Como provar atomicidade? Falhas injetadas, constraints e testes com banco real.
- Por que não exatamente uma publicação? Envio e marcação não compartilham transação; eventId e dedup tornam redelivery seguro.
- Como impedir replay com saldo atual? Snapshot do resultado terminal persistido.
- Como recuperar pendências? Agendamento persistente, lease, backoff e TTL.
- Por que adiar autenticação? Não pontua; deixar extensão OIDC e declarar uso local.
- O que acontece com REFUND e ROLLBACK da mesma BET? O texto limita por tipo; explicar a interpretação adotada e pedir alinhamento de negócio em cenário real.

Evitar alegar alta performance, cobertura, consistência ou recuperação sem testes registrados. Conhecer os caminhos reais de código e migrations é mais útil que decorar termos de arquitetura.
