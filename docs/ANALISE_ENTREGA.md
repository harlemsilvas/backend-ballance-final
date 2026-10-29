# Análise crítica da entrega — 29/10/2026

Revisão do repositório entregue ([backend-ballance-jungle](https://github.com/harlemsilvas/backend-ballance-jungle), HEAD `7b21208` na data da análise) contra o [enunciado](CHALLENGE.md) e contra este repositório. Escopo: documentação e empacotamento. As correções da Fase A foram aplicadas aqui (`0caa669`) e a Fase B entrou no jungle por PR (#1, `b26f82c`).

## O que foi conferido

- `src/` e `tests/` do jungle são idênticos aos deste repositório (comparação por blob; só falta `src/infrastructure/persistence/migrations/README.md` no jungle).
- A suíte reproduz o registro `docs/VALIDACAO_CANDIDATA.md` do jungle: 215 testes (120 unitários e 95 de integração), 857 assertions, 0 falhas, contra PostgreSQL e LocalStack reais.
- Links relativos entre arquivos Markdown: nenhum quebrado. Sem `.env` versionado.
- Requisitos obrigatórios do enunciado: nenhuma lacuna de código identificada.

## Achados

| # | Achado | Gravidade | Fase A (este repositório) | Fase B (jungle, via PR) |
|---|---|---|---|---|
| 1 | `SHA256SUMS` não confere para `docs/FINANCIAL_PROCESSING.md` e `docs/MESSAGING.md`, editados depois do manifesto | Alta | Não se aplica (o manifesto só existe no jungle) | Regenerar por último |
| 2 | `ARCHITECTURE.md` não justificava a escolha do ORM, o mapeamento do `Money` e a estratégia transacional (§4 do enunciado) | Alta | Corrigido: seção "ORM, Money e estratégia transacional" | Aplicar o mesmo texto |
| 3 | Sem classes de domínio `InboxMessage`/`OutboxMessage` (§6.5); adaptação documentada | Média | Corrigido neste repositório em 29/10/2026 (`src/domain/inbox-message.ts` e `outbox-message.ts`, commit `4513fcc`); ver [FEATURES_PROXIMA_VERSAO.md](FEATURES_PROXIMA_VERSAO.md) | Não aplicado: o jungle permanece como entregue |
| 4 | Comandos com `cd /home/harlem/...`, `export PATH` e `bun test tests/...` em 8 documentos | Média | Corrigido: comandos relativos à raiz e `./tests/...` | Aplicar |
| 5 | Referências a artefatos ausentes: `entrega_teste`, `package-delivery.py --experimental`, `DELIVERY`/`PROJECT_STATUS`; expressão "ambiente de desenvolvimento original" | Média | Expressão reescrita; os demais artefatos já não existem aqui | Remover ou reescrever `EXPERIMENTAL_DELIVERY.md` e `SWAGGER_LOCAL.md` |
| 6 | Resíduos de processo: `VALIDACAO.md` duplicado, termo "candidata", nomes internos de projeto e `reports/dashboard.html` gerado (942 KB) | Baixa | Não se aplica | Avaliar |
| 7 | Política de [DELIVERY.md](DELIVERY.md) apontava `22d06c6`, mas o jungle estava em `7b21208` após duas correções Mermaid feitas diretamente pelo autor | Média | Corrigido: referência atualizada para `b26f82c` | Não se aplica |
| 8 | O jungle mantém o experimento 004, o JSON da VPS e a edição experimental; este repositório os excluiu | Baixa | Registrado aqui | Documentar qual é a referência |

## Fase B (concluída)

PR #1 do jungle, mesclado em `b26f82c`: somente arquivos `.md` e `SHA256SUMS` (achados 1, 2, 4 e 5; `sha256sum -c` sem falhas após o merge). Sem alteração em `src/`, `tests/`, `compose*` nem `.env.example`. Ficaram sem mudança, por decisão do autor: as classes de domínio de inbox/outbox (achado 3, mudança de código) e o nome `VALIDACAO_CANDIDATA.md` (achado 6, apenas estético).
