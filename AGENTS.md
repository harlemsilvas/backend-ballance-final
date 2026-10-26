# Instruções para agentes — Backend Ballance

## Escopo e leitura

Este projeto implementará o Distributed Wagering Processor do desafio Jungle Gaming. A pasta atual chama-se `backend-challenge`; Backend Ballance é o nome de trabalho. Leia `README.md`, `docs/CHALLENGE.md` (enunciado preservado), `ARCHITECTURE.md`, `PROJECT_STATUS.md`, `NEXT_TASK.md` e os documentos da tarefa em `docs/` antes de alterar código.

O enunciado é a referência dos requisitos. Registre interpretações e mudanças de decisão; não apresente propostas como garantias implementadas. As instruções explícitas do usuário prevalecem sobre este arquivo.

## Regras de implementação

- Bun 1.x, TypeScript strict, NestJS, PostgreSQL, MikroORM e SQS local via LocalStack. Fixar versões e verificar compatibilidade na implementação.
- Domínio sem decorators NestJS/ORM; construtores privados/protegidos, factories e `rehydrate` sem reaplicar transições.
- Dinheiro somente como representação decimal exata; jamais converter valores monetários para `number`. Transporte por string com duas casas.
- Saldo, ledger, transação, inbox e outbox devem confirmar atomicamente. Nunca publicar durante a transação financeira.
- Locks por wallet, idempotência persistente e constraints SQL. FIFO e memória não substituem garantias do banco.
- Ledger append-only; preservar estados terminais, resultado original de replay e versão da wallet.
- HTTP e SQS reutilizam o mesmo caso de uso. Ack somente após commit.
- Não criar autenticação própria com senhas; manter extensão para IdP externo.

## Trabalho e validação

Inspecione o Git antes de editar. A pasta possui repositório próprio na branch `main`. Confirme a raiz Git antes de editar e restrinja alterações a este projeto. O destino da entrega é `https://github.com/harlemsilvas/backend-ballance-final`; inspecione remotes e histórico antes de operações Git.

Faça mudanças pequenas, com testes proporcionais. Testes financeiros e de concorrência exigem PostgreSQL real; mensageria exige SQS no emulador. Mocks servem para unidade e falhas controladas, sem substituir integração. Use bancos/filas exclusivos de teste. Não execute reset de banco, remoção de volumes, push ou deploy sem escopo autorizado.

Não publique segredos nem payloads financeiros completos em logs. Documente comandos apenas quando existirem e tiverem sido verificados. Antes de encerrar um pacote, atualize `PROJECT_STATUS.md` e `NEXT_TASK.md`, registrando testes executados e limitações.
