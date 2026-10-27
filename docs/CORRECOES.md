1. Gargalos de Performance e Escalabilidade
- Custo das Constraints e Crescimento do Ledger (Append-Only):

    - O problema: O projeto adota uma abordagem estrita de Ledger imutável e transações atômicas com constraints rígidas no PostgreSQL para garantir consistência financeira. No entanto, a documentação aponta que o custo dessas constraints e índices sobre históricos longos ainda não foi medido. À medida que o volume de apostas cresce, o tamanho das tabelas de histórico e ledger aumenta drasticamente, o que pode degradar a performance de consultas e locks por carteira se não houver estratégias de particionamento de tabelas (table partitioning).

- Garantia de Entrega no Broker (At-Least-Once vs Exactly-Once):

    - O problema: O padrão Outbox publica mensagens fora da transação utilizando um token/lease, permitindo duplicatas controladas com eventId estável. A arquitetura assume explicitamente que não há promessa de exactly-once no broker (SQS), exigindo que os consumidores downstream façam deduplicação. Se os serviços consumidores não estiverem preparados para isso, picos de tráfego podem gerar reprocessamento acidental de transações.
---
2. Segurança e Controle de Acesso

- Fixação de Versões de Imagens Docker:

    - O problema: As imagens utilizadas nos arquivos de configuração do Docker Compose fixam tags de versão, mas não são fixadas por digest (SHA-256), o que deixa o ambiente vulnerável a alterações silenciosas de imagens upstream caso uma tag seja re-enviada ao registro.
---
3. Resiliência e Operacionalidade
- Durabilidade do Emulador de Fila (LocalStack):

    - O problema: Embora o banco de dados PostgreSQL possua persistência via volumes Docker que sobrevivem a reinícios, a documentação alerta que a fila local (LocalStack) não garante durabilidade das mensagens caso o container seja recriado. Isso é adequado para desenvolvimento e testes de integração, mas representa um ponto de atenção crítico para ambientes de homologação ou testes automatizados pesados de CI/CD.

- Falta de Observabilidade Avançada (OpenTelemetry / APM):

    - O problema: Métricas e health checks básicos (/health/ready, /metrics) foram implementados para os processos da API e workers, mas ferramentas de rastreamento distribuído (Distributed Tracing com OpenTelemetry) e dashboards centralizados ficaram de fora da entrega, dificultando o diagnóstico de gargalos de latência em cenários assíncronos complexos.