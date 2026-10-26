# Entrega local e validação — 26/10/2026

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

Nenhum reset, remoção de volumes, commit, push ou deploy foi executado. Arquivos de estudo/configurações locais foram preservados. O ambiente de desenvolvimento original não recebeu migrations nem login financeiro nesta validação.
