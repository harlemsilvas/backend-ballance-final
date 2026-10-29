# Próxima tarefa

**Regra vigente após a submissão:** preservar a main de backend-ballance-jungle (referência da submissão 22d06c6; HEAD atual 7b21208 após duas correções Mermaid de 29/10/2026); nenhuma nova alteração direta nessa branch. Desenvolver primeiro em backend-ballance-final. Transferência à entrega apenas quando necessária, mediante solicitação e issue/PR; alterações por PR, sem merge automático. Política completa em [docs/DELIVERY.md](docs/DELIVERY.md). Esta regra substitui as autorizações anteriores de publicação direta.

Comparativo de volume preparado (100/1.000/3.000) com `bun run test:load:volume`, ainda sem medição de 3.000. Se executado, registrar como o próximo RESULTS sequencial (004) após revisar protocolo/auditoria; não anunciar capacidade de usuários.


Revisão documental de 28/10/2026 concluída: `docs/DECISIONS.md` consolida interpretações e soluções implementadas com referências. Continuar estudo e dúvidas; nenhuma alteração financeira autorizada. Pasta/ZIP existentes preservados; uma futura edição gerada incorporará essa revisão.

Desenvolvimento encerrado por hoje a pedido do usuário. Próximo foco: estudo do projeto e esclarecimento de dúvidas; nenhuma nova implementação deve ser iniciada sem solicitação.

Pacote essencial para avaliação por arquivo compactado montado em `entrega/` e `entrega.zip`; registro próprio em `entrega/VALIDACAO.md`. Para novas edições, preservar/renomear os artefatos anteriores e executar `python3 scripts/package-delivery.py`. O instrutor segue `entrega/README.md`; instalação/testes/smoke executam em containers. Próximo passo desta entrega: conferir as exigências de formato/tamanho do ambiente de submissão quando forem conhecidas. Não há envio externo autorizado nesta tarefa.

Pacote 1 concluído. As rodadas sequenciais 002 e 003 foram encerradas e revisadas: [índice dos RESULTS](docs/LOAD_RESULTS_INDEX.md). O [plano de melhorias posterior aos testes](docs/LOAD_IMPROVEMENT_PLAN.md) é apenas proposta. Próxima ação: revisar prioridades/critério de aceite antes de autorizar qualquer implementação; não aplicar índices, triggers ou cache automaticamente. A matriz 002 foi contrabalanceada; 003 atingiu o orçamento de população antes de 10.000 e não produziu janela medida nesse volume.

1. Revisar a entrega e, se desejado, ativá-la no volume de desenvolvimento existente seguindo README.md. Conferir o alvo antes de provisionar: schema financial/login ballance_runtime; não adotar objetos não gerenciados. A validação usou volume independente e não migrou public.
2. Preparar apresentação das garantias, decisões e limites. Por decisão do usuário, autenticação permanece fora da implementação, somente documentada em docs/AUTHENTICATION.md. Há um piloto de medição documentado; benchmark de capacidade continua fora do escopo. Não anunciar autenticação de produção ou números não medidos.
3. Destino da entrega inicial autorizado: https://github.com/harlemsilvas/backend-ballance-final, branch main. Consultar o histórico Git para os commits publicados. Novos pushes/deploys dependem do escopo solicitado.

## Concluído

Domínio, schema, casos de uso atômicos/replay, HTTP/consultas/reconciliação, consumidor/inbox, publisher, scheduler e observabilidade obrigatória. Entrega com Dockerfile/Compose, provisionamento explícito restrito, migrations, README da solução e enunciado preservado em docs/CHALLENGE.md.

Validação final: 203 testes (110 unidade + 93 integração), 799 assertions, zero falhas; typecheck/build aprovados. Imagem construída com builder clássico (Buildx ausente no host). Stack limpa isolada com API/worker saudáveis; smoke HTTP/SQS/publicação/reconciliação/métricas passou com recuperação após SIGKILL do worker. Stop/up preservou saldo e restaurou health/métricas.

Containers de validação ballance-delivery-check encerrados, volume persistente e arquivo privado /tmp/ballance-delivery.env preservados para reprodução. Ambiente original backend-ballance preservado. Não houve DDL financeiro em public, reset ou remoção de volumes. O registro acima corresponde à validação anterior à publicação inicial; publicação da main foi autorizada na etapa seguinte. Nenhum deploy solicitado.

Limites: SQS local não promete persistência entre recriações; downstream deve deduplicar eventos; IdP real adiado; custo dos triggers não medido. Detalhes em docs/DELIVERY.md. Preservar arquivos de estudo e configurações locais.


## Documentação de entrega

LICENSE (MIT) e SECURITY.md adicionados; README esclarece os direitos sobre materiais de terceiros e o uso de dados sintéticos. Relatos de vulnerabilidades devem usar o canal privado indicado em SECURITY.md. Autenticação continua fora da implementação por decisão do usuário. Mudança somente documental, sem nova execução da suíte.


## Primeiro piloto de medição — 27/10/2026

16 cenários com histórico de 100/1.000 entradas, hot/spread (1/3 wallets), HTTP/SQS, três processos, concorrência seis e coleta off/on. 1.920 operações medidas e 19.616 lançamentos auditados sem divergência. Runner separado do build de produção; código financeiro, migrations e lockfile preservados.

Validação final: 204 testes/806 assertions/18 arquivos, zero falhas; typecheck/build aprovados. Novo teste interrompe carga e comprova limpeza preservando um recurso de controle. Metodologia e limites fazem parte da evidência: uma repetição, cache aquecido, BET-only e sem teste de saturação. Não executar otimizações ou publicar sem escopo específico.

Recursos temporários conferidos como ausentes; containers de medição encerrados com volume preservado. O ambiente original, já parado, permaneceu no mesmo estado. Alterações ainda locais; nenhum commit/push/deploy executado nesta etapa.


## Segunda etapa de medição encerrada

002: 48 cenários, 17.280 operações, duas repetições, seis wallets no perfil spread, coleta off/5s/15s e cinco sondas por SELECT. 003: tentativa focada até o limite de 600s, 7.977 entradas auditadas, sem alegar desempenho de 10.000. Relatórios/JSON/fontes preservados em sequência, mantendo o 001 original.

Validação posterior: 205 testes/819 assertions, zero falhas; typecheck/build aprovados. O plano de melhoria foi escrito após os testes, sem alteração imediata de produção. Nenhum commit/push/deploy.

Rodadas encerradas: recursos temporários ausentes; containers de medição parados com volume preservado. O próximo trabalho é revisão/decisão do plano, sem implementação automática de melhorias.


A consolidação das alterações concluídas em commit local foi autorizada pelo usuário. Consultar git log para a revisão resultante. Push/deploy permanecem fora do escopo desta solicitação.


## Entrega pública para avaliação — 28/10/2026

Novo repositório exclusivo publicado por autorização do usuário: https://github.com/harlemsilvas/backend-ballance-jungle (público, main, commit bbdabd4bff85471ba7da230f3ec3f4bbabb73023). Pasta local independente: avaliacao/. README enxuto, .env.example, senha gerada por entrega.sh init; .env privado não versionado. Suíte na candidata: typecheck/build aprovados, 215 testes/857 assertions/21 arquivos, 0 falhas, 45,66s; smoke DeliverySmokePassed. Readiness API/worker, Swagger/OpenAPI (dez paths) e painel responderam HTTP 200. Acesso público ao GitHub sem autenticação confirmado com HTTP 200. Canal privado de vulnerabilidades habilitado conforme SECURITY.md.


Revisão da orientação ao avaliador: README e LOAD_TESTS da pasta avaliacao distinguem scripts Docker (infraestrutura/dependências automáticas) de Bun direto (preparação manual, conexão e LOAD_CONFIRM). Incluído load3000 na tabela curta; manifesto atualizado, diff --check aprovado. Alteração exclusivamente documental, sem nova execução da suíte. Commit e4d0023 no repositório de avaliação.


Revisão documental da avaliação: commit 2dcf2f1 em avaliacao alinha ARCHITECTURE/DECISIONS ao conteúdo entregue (Swagger, painel e carga), registra adaptação inbox/outbox e custo de histórico sob lock, atualiza estratégia de testes (dois controles do runner), migrations do worker e distinção entre evidências históricas e atuais. Links relativos, SHA256SUMS e diff --check conferidos; somente Markdown/manifesto, sem execução adicional da suíte nem alteração de código financeiro.


Retomada solicitada para a próxima sessão (29/10/2026): revisar correção geral, concorrência e modelagem, planejar próxima versão e apresentação dos aprendizados. Roteiro em docs/FEATURES_PROXIMA_VERSAO.md; inclui limpeza de referências a estudos/documentos de desenvolvimento ausentes na entrega. Versão pública de referência 2dcf2f1 preservada; roteiro somente local, sem implementação ou publicação.


Limpeza editorial autorizada e concluída no repositório de avaliação: commit 22d06c6 substitui referências a materiais internos ausentes por README, TEST_STRATEGY e registro de validação; títulos de estudo convertidos em exemplos de uso. Links, manifesto e diff --check aprovados. Somente documentação, sem alteração financeira ou nova suíte. Referência pública atualizada para 22d06c6; revisão técnica da próxima versão continua pendente.

Atualização de 29/10/2026: commit d3c871f publicado em origin/main. Experimento 004, summary da VPS e a edição experimental (entrega_teste, pacote, painel e Swagger empacotados) foram estudos de ambiente e ficam fora do repositório; próximo número de carga reservado: 004. Swagger local e painel de relatórios permanecem como ferramentas opcionais (docs/OPTIONAL_TOOLS.md, scripts `tools:*`).

Atualização de 29/10/2026 (análise da entrega): Fase A concluída neste repositório (ver docs/ANALISE_ENTREGA.md). Pendente: decidir se a Fase B será feita no jungle, via branch e PR, com `SHA256SUMS` regenerado por último. Proposta de classes de domínio InboxMessage/OutboxMessage registrada em docs/FEATURES_PROXIMA_VERSAO.md.
