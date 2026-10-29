# Desenvolvimento local

O [README da solução](../README.md) contém o setup atual com Docker Compose, portas, variáveis, credenciais locais e limites. O [enunciado](CHALLENGE.md) permanece integral.

Bun 1.4.4 é fixado em `.bun-version` e package.json. Dependências exatas estão no bun.lock. Com Bun no PATH:

```bash
bun install --frozen-lockfile
bun run typecheck
bun run build
bun test ./tests/unit
```

O Compose base sobe apenas PostgreSQL e LocalStack, preservando o fluxo anterior:

```bash
docker compose up -d postgres localstack
docker compose ps
bun run test:integration
```

Testes usam recursos exclusivos/descartáveis. Não apontar para produção nem usar login de runtime para a suíte: ela precisa criar schemas, papéis e filas temporários. Não remover volumes para validar uma alteração.

`compose.app.yaml` adiciona serviço administrativo one-shot, API e worker all. O schema padrão da entrega é financial, o login é ballance_runtime e o banco continua ballance. O processo administrativo é o único a aplicar migrations; API/workers apenas verificam a configuração restrita. Migrations compiladas/source usam o diretório relativo ao módulo, sem tentar criar pastas de fontes na imagem.

Se o Docker local não tiver Buildx instalado, o builder clássico foi validado com:

```bash
DOCKER_BUILDKIT=0 docker compose -f compose.yaml -f compose.app.yaml build provision
docker compose -f compose.yaml -f compose.app.yaml up -d --no-build --wait
```

Após iniciar a entrega, o smoke cria dados sintéticos, verifica processamento/replay HTTP, entrega SQS, publicação de evento, reconciliação e métricas. Recebe eventos com visibilidade temporária e não apaga mensagens:

```bash
bun scripts/smoke-delivery.ts
```

SMOKE_API_URL e SQS_ENDPOINT permitem escolher portas locais alternativas. O smoke deve usar apenas a stack de demonstração escolhida. Não é um benchmark e não injeta falha nas janelas exatas de commit/ack; esses cenários estão nos testes de integração de mensageria.

[Validação da entrega](DELIVERY.md), [HTTP](HTTP_API.md), [mensageria](MESSAGING.md), [scheduler](REFERENCE_SCHEDULER.md), [observabilidade](OBSERVABILITY.md) e [comandos de teste](MANUAL_TESTS.md).

## Imagens de origem

Dockerfile/Compose fixam Bun, PostgreSQL e LocalStack por tag + digest de índice multiplataforma. [IMAGES.md](IMAGES.md) registra referências, método de verificação, plataforma realmente testada e procedimento de atualização. Mudanças de digest precisam de nova validação; rebuild não recebe automaticamente um conteúdo diferente sob a mesma tag.
