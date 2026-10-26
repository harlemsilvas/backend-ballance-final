# Próxima tarefa

1. Revisar a entrega e, se desejado, ativá-la no volume de desenvolvimento existente seguindo README.md. Conferir o alvo antes de provisionar: schema financial/login ballance_runtime; não adotar objetos não gerenciados. A validação usou volume independente e não migrou public.
2. Preparar apresentação das garantias, decisões e limites. Por decisão do usuário, autenticação permanece fora da implementação, somente documentada em docs/AUTHENTICATION.md. Benchmark continua opcional; não anunciar autenticação de produção ou números não medidos.
3. Destino da entrega inicial autorizado: https://github.com/harlemsilvas/backend-ballance-final, branch main. Consultar o histórico Git para os commits publicados. Novos pushes/deploys dependem do escopo solicitado.

## Concluído

Domínio, schema, casos de uso atômicos/replay, HTTP/consultas/reconciliação, consumidor/inbox, publisher, scheduler e observabilidade obrigatória. Entrega com Dockerfile/Compose, provisionamento explícito restrito, migrations, README da solução e enunciado preservado em docs/CHALLENGE.md.

Validação final: 203 testes (110 unidade + 93 integração), 799 assertions, zero falhas; typecheck/build aprovados. Imagem construída com builder clássico (Buildx ausente no host). Stack limpa isolada com API/worker saudáveis; smoke HTTP/SQS/publicação/reconciliação/métricas passou com recuperação após SIGKILL do worker. Stop/up preservou saldo e restaurou health/métricas.

Containers de validação ballance-delivery-check encerrados, volume persistente e arquivo privado /tmp/ballance-delivery.env preservados para reprodução. Ambiente original backend-ballance preservado. Não houve DDL financeiro em public, reset ou remoção de volumes. O registro acima corresponde à validação anterior à publicação inicial; publicação da main foi autorizada na etapa seguinte. Nenhum deploy solicitado.

Limites: SQS local não promete persistência entre recriações; downstream deve deduplicar eventos; IdP real adiado; custo dos triggers não medido. Detalhes em docs/DELIVERY.md. Preservar arquivos de estudo e configurações locais.
