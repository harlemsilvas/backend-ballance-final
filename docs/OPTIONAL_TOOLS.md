# Ferramentas opcionais

Recursos de apoio para visualizar e explorar o sistema. **Não fazem parte do escopo básico do desafio**: o código financeiro, a API, o worker, as migrations e o `docker compose` principal funcionam sem eles, e nenhum é iniciado por padrão.

| Ferramenta | Para que serve | Como usar |
| --- | --- | --- |
| Swagger local | Consultar o contrato HTTP e executar requisições nos endpoints financeiros | [SWAGGER_LOCAL.md](SWAGGER_LOCAL.md) |
| Painel de relatórios | Visualizar resultados dos experimentos de carga: gráficos, filtros, tabela e exportação CSV | Abaixo |
| Runner de carga | Gerar novos resultados de carga em infraestrutura exclusiva | [LOAD_TESTS.md](LOAD_TESTS.md) |

## Segurança e limites

- Uso local, com dados sintéticos. Swagger não tem autenticação real e recusa `NODE_ENV=production`.
- O painel é estático: não acessa banco, fila nem o repositório; serve somente `dashboard.html` em `127.0.0.1`, apenas com GET/HEAD.
- O painel mostra observações medidas em experimentos locais. Não é monitoramento ao vivo, OpenTelemetry nem estimativa de capacidade de produção.
- Dependências do Swagger UI ficam isoladas em `scripts/swagger/` e não entram no `package.json` principal. Os arquivos gerados do painel ficam em `reports/`, ignorada pelo Git.

## Painel de relatórios

Requer Bun e Python 3 no host.

```bash
bun run tools:reports:build   # gera reports/dashboard.html a partir de docs/benchmarks/results-NNN.json
bun run tools:reports         # serve em http://127.0.0.1:8080 (REPORT_PORT altera a porta)
```

- O gerador inclui todos os `results-NNN.json` presentes em `docs/benchmarks/` e recusa sobrescrever um painel existente; para atualizar, remova `reports/dashboard.html` antes de gerar de novo.
- Resultados novos podem ser carregados no navegador pelo botão de importação (`summary.json` ou `results-NNN.json`), sem envio ao servidor. Recarregar a página restaura os dados embutidos.
- Dados ausentes aparecem como desconhecidos, nunca como zero. HTTP e SQS medem caminhos diferentes e o painel não combina seus percentis.
- Modelo de dados do painel testado em `tests/unit/load-reports.test.ts`.

Verificado em 29/10/2026: geração do painel, resposta HTTP 200 em `/`, `/health` com `ok` e HTTP 404 para `/.env`.
