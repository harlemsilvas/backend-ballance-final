# Migrations da aplicação

Migration202610260001FinancialSchema cria o schema financeiro inicial com constraints e triggers. Validada em up/down/up somente em schema isolado; ainda não aplicada ao public de desenvolvimento.

As funções de consistency/imutabilidade são parte do contrato. Não substituir com schema sync nem editar esta migration após aplicação persistente; correções futuras devem usar nova migration. Down remove tabelas e dados e não deve ser usado rotineiramente num banco preenchido.

Detalhes e comandos em [FINANCIAL_SCHEMA.md](../../../../docs/FINANCIAL_SCHEMA.md).

Migration202610260002BalanceLimit estende os códigos de rejeição sem editar a primeira. Down recusa invalidar registros existentes de BALANCE_LIMIT_EXCEEDED; teste de reversão usa schema controlado.

Migration202610260003ReferenceJobs cria coordenação separada para referências, sem alterar ledger ou transações terminais. Runtime precisa dos grants dessa tabela; down remove apenas jobs, sem excluir história financeira. [Scheduler](../../../../docs/REFERENCE_SCHEDULER.md).
