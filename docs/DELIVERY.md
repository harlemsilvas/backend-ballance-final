# Entrega local e validação — 26/10/2026

## Política após a submissão — 28/10/2026

Por instrução explícita do autor, a `main` entregue em https://github.com/harlemsilvas/backend-ballance-jungle tem como referência documental da submissão `22d06c6`. Em 29/10/2026 o autor aplicou diretamente duas correções de diagrama Mermaid (`c0f6f08` e `7b21208`, somente `docs/FINANCIAL_PROCESSING.md` e `docs/MESSAGING.md`); o `SHA256SUMS` ficou desatualizado nesses dois arquivos. A correção entrou por PR (#1, somente documentação e manifesto, mesclado em `b26f82c`), e o HEAD atual é `b26f82c`. Novas alterações não devem ser feitas diretamente nessa branch. Não adicionar documentos nem implementar melhorias ali, inclusive alterações apenas editoriais, fora de PR.

Os próximos desenvolvimentos, estudos, revisões e testes devem ocorrer neste repositório de desenvolvimento: https://github.com/harlemsilvas/backend-ballance-final (workspace backend-challenge). A pasta local `avaliacao/` possui Git próprio e representa a entrega; não usá-la como ambiente de evolução automática.

Somente quando houver necessidade de atualizar a entrega, registrar a proposta em uma issue e/ou preparar uma branch com PR no repositório de avaliação, com motivação, escopo e evidências de validação. Issue registra a proposta; alteração de código ou documentação deve passar por PR. Não fazer push direto na main nem merge automático. Esta política não autoriza abrir issues/PRs ou publicar mudanças por iniciativa própria; essas ações dependem da solicitação correspondente. A aprovação anterior de publicação não autoriza novas alterações diretas na branch entregue.

O roteiro local [FEATURES_PROXIMA_VERSAO.md](FEATURES_PROXIMA_VERSAO.md) orienta a próxima análise e não integra a submissão. Registrar propostas como propostas; não apresentar melhorias futuras como já implementadas na entrega.

A entrega usa Dockerfile multi-stage, dependências exatas/lockfile, usuário bun e overlay `compose.app.yaml`. O [README](../README.md) contém o setup. A [orientação oficial do Bun para Docker](https://bun.sh/guides/ecosystem/docker) fundamenta o build com instalação congelada; o [formato das URLs SQS do LocalStack](https://docs.localstack.cloud/aws/services/sqs/) fundamenta SQS_ENDPOINT_STRATEGY=path e o endpoint interno localstack:4566.

## Validação executada

- Typecheck e build aprovados.
- 203 testes passaram, zero falhas, 799 assertions, 17 arquivos (110 unidade + 93 integração). PostgreSQL/LocalStack reais; recursos de teste exclusivos.
- Novo teste do provisionador: migrations, conexão restrita, negação de DELETE no ledger, reexecução, senha divergente e recusa de schema não gerenciado. Credenciais não aparecem na saída.
- Imagem oven/bun:1.4.4 obtida e imagem da aplicação construída com dependências de produção no estágio final. Buildx está ausente neste host; o builder clássico foi usado.
- Projeto Compose novo `ballance-delivery-check`, com volume próprio e portas 15546/14567/13000/19101, distinto do backend-ballance existente. Senha aleatória em arquivo privado fora do repositório.
- Schema financial e login ballance_runtime provisionados; três migrations aplicadas. API e worker all atingiram health healthy.
- Smoke criou wallet de 100.00, BET HTTP de 25.00 e replay retornando 75.00; WIN SQS de 10.00 levou saldo a 85.00, com evento publicado, reconciliação consistente e métricas disponíveis.
- Worker sofreu SIGKILL antes da submissão dos comandos; retomada processou o trabalho acumulado. Esse smoke verifica recuperação do processo/filas/outbox, sem alegar injeção nas janelas exatas commit/ack. A suíte de mensageria cobre essas janelas com processos reais.

Também foi executado stop/up completo: saldo 85.00 preservado, API/worker saudáveis e métricas acessíveis após reinício. PostgreSQL confirmou sete tabelas em financial (incluindo histórico de migrations) e nenhuma em public. No shutdown, worker saiu com código 0; API saiu com 143, correspondente ao SIGTERM propagado pelo NestJS.

Os comandos de build/start usados, com arquivo privado contendo senha e portas exclusivas:

```bash
DOCKER_BUILDKIT=0 docker compose --env-file /tmp/ballance-delivery.env -p ballance-delivery-check -f compose.yaml -f compose.app.yaml build provision
docker compose --env-file /tmp/ballance-delivery.env -p ballance-delivery-check -f compose.yaml -f compose.app.yaml up -d --no-build --wait
SMOKE_API_URL=http://127.0.0.1:13000 SQS_ENDPOINT=http://127.0.0.1:14567 bun scripts/smoke-delivery.ts
```

O arquivo em /tmp é artefato desta validação; gere o próprio `.env` como descrito no README. Não copie nem registre credenciais. Para usar builder clássico nas portas padrão, há comandos em [DEVELOPMENT.md](DEVELOPMENT.md).

## Limites operacionais

O volume PostgreSQL persiste o estado financeiro. Esta configuração não garante durabilidade SQS após recriação do emulador, nem usa credenciais/IdP de produção. O provisionamento é um job administrativo serial, separado do runtime. Se interrompido após criar papel/schema, a reexecução recupera migrations pendentes; estados parciais não gerenciados exigem inspeção, sem limpeza automática. Senha não é rotacionada por rerun.

Nenhum reset, remoção de volumes, commit, push ou deploy foi executado. Arquivos de estudo/configurações locais foram preservados. O ambiente local do desenvolvedor não recebeu migrations nem login financeiro nesta validação.


## Revalidação com digests fixados — 26/10/2026

- Os três índices foram consultados no Docker Hub e seus bytes conferidos por SHA-256 contra Docker-Content-Digest. Referências completas, tipo de manifesto, plataformas e atualização em [IMAGES.md](IMAGES.md). Versões nominais mantidas.
- Dockerfile e Compose usam tag + digest; imagens locais/containers conferidos como linux/amd64. As entradas arm64 do registry não foram executadas.
- Build real com builder clássico concluído; typecheck/build do host aprovados. Stack nova ballance-digests-check, volume exclusivo, portas PostgreSQL 25546, LocalStack 24567, API 23000 e worker 29101. Configuração privada em /tmp/ballance-digests.env, fora do Git.
- PostgreSQL/LocalStack/API/worker ficaram healthy; provisionador concluiu as três migrations e verificação de runtime com sucesso no schema financial isolado.
- Smoke reproduzível passou: HTTP, replay, comando SQS, evento publicado, saldo 85.00, reconciliação e métricas. Readiness/métricas do worker também conferidos.
- Suíte completa repetida contra PostgreSQL/SQS dessa stack: **203 pass, 0 fail, 799 assertions, 17 arquivos**, em 41,63s. Comandos e namespaces de teste exclusivos; nenhum benchmark ou alteração de lógica financeira.

Comandos executados para este projeto isolado (arquivo privado com senha aleatória e portas acima):

```bash
DOCKER_BUILDKIT=0 docker compose --env-file /tmp/ballance-digests.env -p ballance-digests-check -f compose.yaml -f compose.app.yaml build provision
docker compose --env-file /tmp/ballance-digests.env -p ballance-digests-check -f compose.yaml -f compose.app.yaml up -d --no-build --wait
SMOKE_API_URL=http://127.0.0.1:23000 SQS_ENDPOINT=http://127.0.0.1:24567 bun scripts/smoke-delivery.ts
PATH="$HOME/.bun/bin:$PATH" DB_HOST=127.0.0.1 DB_PORT=25546 DB_USER=ballance DB_PASSWORD=local-development-only DB_NAME=ballance DB_SCHEMA=public SQS_ENDPOINT=http://127.0.0.1:24567 TEST_SQS_ENDPOINT=http://127.0.0.1:24567 bun test tests/unit tests/integration
docker compose --env-file /tmp/ballance-digests.env -p ballance-digests-check -f compose.yaml -f compose.app.yaml stop
```

O .env em /tmp é artefato desta sessão, não pré-requisito distribuído. Para reproduzir, gerar seu próprio arquivo privado e escolher portas livres conforme README. Os dados/volumes originais foram preservados; sem commit/push/deploy neste pacote. Durabilidade SQS após recriação e desempenho sob carga continuam fora desta validação.

Shutdown desta revalidação concluído: worker/provisionador/PostgreSQL/LocalStack saíram com código 0; API com 143/SIGTERM conforme NestJS. Containers isolados encerrados, volume preservado. PostgreSQL e LocalStack do projeto original backend-ballance continuaram healthy, sem recriação.
