# Features e revisão para uma próxima versão

**Local de evolução:** backend-ballance-final. A main entregue em backend-ballance-jungle tem como referência da submissão 22d06c6 (HEAD atual 7b21208, com duas correções Mermaid de 29/10/2026); propostas só serão transferidas quando necessárias, via issue/PR solicitado, nunca por alteração direta. Ver [política de entrega](DELIVERY.md).

Registrado em 28/10/2026 para retomada em 29/10/2026. Este documento pertence ao desenvolvimento e não foi incluído no repositório da avaliação. É um roteiro de análise; não representa funcionalidades implementadas ou ganhos comprovados.

## Referência entregue

Repositório público: https://github.com/harlemsilvas/backend-ballance-jungle. Versão de referência: commit 2dcf2f1. Validação anterior: 215 testes, 857 assertions, zero falhas, typecheck/build/smoke aprovados. Esses resultados não validam futuras alterações. Preservar os commits e resultados da submissão; desenvolver evolução em branch própria após a revisão, sem reescrever o histórico entregue.

## Objetivo da próxima sessão

Revisar criticamente o projeto, incluindo correção geral, concorrência, modelagem, observabilidade e documentação. Para cada achado registrar requisito, evidência em código/teste, impacto, proposta, alternativa, risco, esforço estimado e critério de aceite. Distinguir defeito confirmado, dívida técnica, hipótese de desempenho e melhoria opcional. Definir o escopo da nova versão somente depois dessa análise.

| Prioridade inicial | Frente | Análise proposta | Evidência necessária para aceitar uma mudança |
| --- | --- | --- | --- |
| P0 se houver defeito | Correção geral | Rever transições terminais, referências, limites monetários, atomicidade, idempotência, leases, ack e recuperação. Não há novo defeito confirmado por este roteiro. | Reprodução mínima do defeito e regressão que demonstre a correção sem efeitos duplicados. |
| P1 | Concorrência e histórico | Identificar custo dos SELECTs/triggers sob lock, por volume, e diferenciar contenção de custo de validação. Avaliar índices e verificações incrementais sem enfraquecer SQL. | Comparação controlada antes/depois, tempo de população separado e testes SQL adversariais, replay, rollback e três ou mais processos intactos. |
| P1 | Modelagem | Revisar responsabilidades de ProcessWagerTransaction, FinancialSession, stores e mapeadores. Avaliar classes InboxMessage/OutboxMessage apenas se encapsularem regras úteis. | Fronteiras mais claras e menor duplicação; mesmas garantias persistentes e suíte aprovada. Criar classes por nome não basta. |
| P1 | Documentação para avaliador | Remover referências a estudos pessoais e materiais de desenvolvimento não distribuídos; substituir por documentos realmente presentes. Distinguir históricos de estado atual. | Links válidos, instruções reproduzíveis e ausência de dependência de documentos externos ao repositório entregue. Preservar enunciado e dados históricos. |
| P2 | Observabilidade | Avaliar custo de /metrics e qualidade dos códigos de diagnóstico sem expor segredos/payloads. | Comparação com coleta em intervalos realistas; falhas de coleta sinalizadas e valores antigos identificáveis; logs úteis e sem informações sensíveis. |
| P2 | Testes e manutenção | Rever barreiras, dependência de temporização e reprodução em ambiente limpo; avaliar integração contínua. | Repetições justificadas e resultados registrados; distinguir flutuação de ambiente de defeito. |

## Referências editoriais já localizadas

Na edição entregue existem expressões como “material complementar do repositório de desenvolvimento” em docs/DECISIONS.md, docs/TEST_STRATEGY.md, docs/LOAD_TESTS.md, docs/EVENTS_AND_HASH.md e docs/IMAGES.md. Algumas apontam para MANUAL_TESTS.md, PROJECT_STATUS.md ou PLANO_CORRECOES.md, ausentes nessa edição. Substituir referências relevantes por README, registro de validação e documentação incluída; remover as que apenas descrevem o processo interno. Títulos de estudo em guias de Swagger/PromQL podem ser convertidos em exemplos de uso. Não excluir arquitetura, decisões, limites ou evidências necessárias à avaliação.

## Protocolo para desempenho

Usar a mesma origem de código, host, recursos disponíveis, configuração do banco, distribuição de wallets, transporte, concorrência e quantidade de amostras. Alternar ordem e repetir. Preservar resultados anteriores e registrar novas rodadas em sequência; não comparar medições da VPS e de outra máquina como evidência causal. Os perfis existentes oferecem ponto de partida, não critérios universais de capacidade. Definir perfil/SLO antes de prometer ganho ou suportar determinado número de usuários.

## Proposta: classes de domínio para Inbox e Outbox

O enunciado (§6.5) descreve `InboxMessage` e `OutboxMessage` com factories (`receive`, `enqueue`, `rehydrate`) e transições (`markProcessed`, `markPublished`, `scheduleRetry`). A entrega usa registros persistentes e stores especializados, com as regras garantidas pelo SQL; a adaptação está documentada em ARCHITECTURE.md, mas reduz a uniformidade de modelagem. Proposta, não implementada: extrair essas regras para classes de domínio sem decorators, mantendo os stores e os testes de mensageria como prova de equivalência. Contexto em [ANALISE_ENTREGA.md](ANALISE_ENTREGA.md).

## Como apresentar os aprendizados

Para cada evolução aprovada: problema observado → decisão original e trade-off → hipótese de melhoria → experimento → resultado → limites e próximos passos. Se não houver ganho consistente ou a mudança piorar simplicidade/correção, registrar e manter a implementação anterior. A apresentação deve distinguir a versão submetida das propostas e da eventual nova versão implementada.

## Estado

Análise aprofundada e implementação pendentes da próxima sessão. Não houve mudança de código, nova medição, agendamento automático ou publicação deste roteiro.

## Atualização editorial

Limpeza das referências internas autorizada e publicada em 22d06c6. A revisão técnica permanece pendente; usar esse commit como referência documental da submissão, preservando os anteriores; o HEAD atual do jungle é 7b21208.
