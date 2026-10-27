# Backend Ballance — entrega do desafio

Distributed Wagering Processor: código-fonte, configurações, migrations, testes e documentação técnica essencial. O [enunciado original](docs/CHALLENGE.md) está preservado. Comece por este arquivo após descompactar; não é necessário clonar um repositório.

## 1. Máquina nova: instalar os pré-requisitos

É necessário um sistema capaz de executar containers Linux, acesso à internet para baixar imagens/dependências na primeira execução e Docker funcionando. O pacote não é uma imagem offline e não instala componentes administrativos do sistema automaticamente.

- **Windows:** instale Docker Desktop, configure o backend WSL 2 conforme o instalador e use o terminal da distribuição Linux no WSL para os comandos abaixo. Descompacte o projeto no sistema de arquivos dessa distribuição. Execute Docker Desktop com integração WSL habilitada.
- **macOS:** instale e inicie Docker Desktop; use Terminal.
- **Linux:** instale Docker Engine, CLI, Buildx e o plugin Compose pela documentação da distribuição, ou Docker Desktop. É necessário ter permissão para acessar o daemon; configuração de grupos/permissões depende do administrador da máquina.

Instruções oficiais: [Docker Desktop](https://docs.docker.com/get-started/get-docker/), [Docker Engine por distribuição](https://docs.docker.com/engine/install/) e [Compose](https://docs.docker.com/compose/install/). Após instalar, reinicie o terminal quando necessário e confira:

```sh
docker version
docker compose version
docker buildx version
```

As validações deste pacote são registradas em [VALIDACAO.md](VALIDACAO.md). Não é preciso instalar Bun, Node, PostgreSQL, AWS CLI, Python ou dependências npm na máquina do instrutor: build, provisionamento, testes e smoke executam em containers. O ZIP já contém os arquivos; Git também não é necessário. Credenciais administrativas do PostgreSQL e AWS neste pacote são fictícias e exclusivamente locais.

## 2. Descompactar e iniciar

Descompacte `entrega.zip`, abra o terminal dentro da pasta `entrega` e execute:

```sh
sh entrega.sh init
sh entrega.sh up
```

`init` gera `.env` com senha aleatória usando Bun em um container e não sobrescreve um arquivo existente. Guarde o `.env` para reutilizar o mesmo volume. Não use `.env.example` como substituto direto desse arquivo: ele descreve também opções do fluxo de desenvolvimento.

`up` instala as dependências com lockfile congelado, compila TypeScript, provisiona banco/schema/login restrito, aplica as três migrations e aguarda API/worker saudáveis. O roteiro também restaura a permissão de execução do hook de filas, caso o descompactador não a preserve. A primeira execução leva mais tempo pelos downloads. Se falhar, confira `sh entrega.sh logs`; o comando retorna erro em vez de anunciar sucesso.

| Serviço | Endereço padrão no computador |
| --- | --- |
| API / readiness | http://127.0.0.1:3000/health/ready |
| API / métricas | http://127.0.0.1:3000/metrics |
| Worker / readiness | http://127.0.0.1:9101/health/ready |
| Worker / métricas | http://127.0.0.1:9101/metrics |
| PostgreSQL | 127.0.0.1:5546 |
| LocalStack | http://127.0.0.1:4567 |

As portas do host ficam restritas a localhost. Para resolver conflito, acrescente ao `.env`, antes de iniciar, valores livres para `PORT`, `WORKER_METRICS_PORT`, `POSTGRES_PORT` e `LOCALSTACK_PORT`. As portas internas não mudam.

O nome Compose padrão é `ballance-entrega`; para outra instalação, defina `DELIVERY_PROJECT` e mantenha o mesmo valor em todos os comandos, além de escolher portas livres. Volumes não migram automaticamente entre nomes de projeto.

```sh
sh entrega.sh status
sh entrega.sh logs
sh entrega.sh stop
sh entrega.sh up
```

`stop` preserva os dados. Não use remoção de volumes para corrigir uma instalação. Não troque a senha em `.env` supondo que isso rotacione um login existente. LocalStack não tem durabilidade de mensagens após recriação comprovada nesta configuração; PostgreSQL conserva o estado financeiro no volume.

## 3. Executar todos os testes obrigatórios

```sh
sh entrega.sh test
```

Esse comando constrói uma imagem com dependências de desenvolvimento e executa, nesta ordem:

```sh
bun run typecheck
bun run build
bun test tests/unit tests/integration
```

Os comandos Bun acima são executados **dentro do container**, não pelo terminal do computador. O resultado final e eventuais falhas aparecem no terminal; o código de saída da suíte é propagado. Não exige iniciar a API antes.

O projeto `ballance-entrega-testes-scram` contém PostgreSQL e LocalStack próprios, sem portas publicadas e sem o volume da aplicação. Os testes criam schemas/papéis/filas exclusivos e exercitam concorrência real e processos Bun independentes. A infraestrutura de testes é parada ao concluir, inclusive quando a execução falha; seu volume é preservado. `DELIVERY_TEST_PROJECT` permite mudar o nome, que deve ser diferente de `DELIVERY_PROJECT`. Não execute duas suítes simultâneas com o mesmo nome de projeto de testes.

Os containers de teste compartilham a rede do PostgreSQL para alcançar PostgreSQL e emulador por loopback. Isso preserva as proteções existentes dos testes contra alvos remotos; não requer host networking nem relaxar validações de segurança.

O pacote conserva a suíte funcional obrigatória; o runner de carga exploratória e seus dois testes específicos foram excluídos junto dos relatórios. Nenhuma regra financeira, migration, versão de dependência ou teste obrigatório foi alterado.

## 4. Smoke funcional da instalação

Com a aplicação iniciada:

```sh
sh entrega.sh smoke
```

O smoke cria dados sintéticos, abre carteira, envia BET HTTP e replay, envia WIN SQS, observa publicação, reconcilia saldo e verifica métricas. Deve ser usado somente nesta demonstração; acrescenta dados ao banco e recebe eventos temporariamente, sem apagá-los. Não é teste de carga. O resultado financeiro esperado do fluxo é saldo `85.00 BRL`.

Para testar manualmente requisições e interpretar respostas, veja [HTTP_API.md](docs/HTTP_API.md). Os contratos de [mensageria](docs/MESSAGING.md), [eventos/hash](docs/EVENTS_AND_HASH.md) e [scheduler](docs/REFERENCE_SCHEDULER.md) detalham o caminho assíncrono.

## 5. Conteúdo e decisões

```text
entrega/
  README.md                 instalação, execução, testes e limites
  ARCHITECTURE.md            desenho, decisões e trade-offs
  VALIDACAO.md               evidências desta montagem
  LICENSE / SECURITY.md
  Dockerfile / compose*.yaml / entrega.sh
  package.json / bun.lock / .bun-version / tsconfig*.json
  .env.example / .dockerignore
  src/                      implementação e migrations
  tests/                    unidade, integração e suporte de concorrência/crash
  scripts/                  migration e smoke
  docker/                   inicialização das filas
  docs/                     enunciado e documentação essencial
  SHA256SUMS                hashes dos arquivos distribuídos
```

[Arquitetura](ARCHITECTURE.md), [decisões](docs/DECISIONS.md), [schema](docs/FINANCIAL_SCHEMA.md) e [estratégia de testes](docs/TEST_STRATEGY.md) fundamentam os requisitos do desafio. Estudos pessoais, planejamento interno, histórico Git, credenciais reais, node_modules, dist, logs, volumes e benchmarks não são distribuídos. Os hashes SHA-256 podem ser conferidos com `sha256sum -c SHA256SUMS` em Linux ou ferramenta equivalente antes de gerar arquivos locais.

Autenticação externa está **somente documentada**, como permite a seção 2 do desafio: [AUTHENTICATION.md](docs/AUTHENTICATION.md). Não há login/JWT real; o modo local não representa segurança de produção. Não há promessa de capacidade ilimitada, exactly-once no broker, dashboard ou OpenTelemetry. Consulte os limites em ARCHITECTURE.md. A [licença](LICENSE) aplica-se ao material autoral; o enunciado de terceiro e dependências mantêm seus próprios direitos.

Sem internet, é necessário preparar previamente imagens e caches para a plataforma de destino; este ZIP não contém esse material. A validação em uma plataforma não comprova execução em todas as outras. Memória, espaço em disco e virtualização precisam ser suficientes para Docker, PostgreSQL, LocalStack e o build; não foi definido um mínimo de hardware por benchmark.
