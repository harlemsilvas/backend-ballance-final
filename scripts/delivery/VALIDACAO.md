# Validação do pacote — 27/10/2026

Esta edição essencial foi executada localmente em Docker com containers Linux. API, worker, provisionador, PostgreSQL e LocalStack foram iniciados em projeto/volume exclusivos. Isso não comprova funcionamento em toda combinação de sistema operacional, arquitetura ou recursos de hardware.

## Comandos e resultados

- `sh entrega.sh init`: gerou senha aleatória em `.env` privado, sem Bun instalado no host e sem incluir a senha na distribuição.
- `sh entrega.sh up`: instalação congelada pelo bun.lock, compilação e imagem de runtime com usuário bun; provisionador aplicou as três migrations e criou schema/login restrito. API e worker atingiram estado healthy.
- `sh entrega.sh test`: **203 testes aprovados, zero falhas, 799 verificações, 17 arquivos**, em 40,17 segundos de execução Bun; typecheck e build também passaram. O roteiro terminou com código zero e parou a infraestrutura exclusiva de testes. Tempos de download/build/inicialização ficam fora desses 40,17 segundos.
- `sh entrega.sh smoke`: evento `DeliverySmokePassed`; HTTP, replay, comando SQS, publicação, reconciliação e métricas conferidos. Fluxo sintético terminou com saldo `85.00 BRL`.
- `stop` seguido de `up`: preservou a carteira e o saldo `85.00 BRL`; readiness da API e do worker voltou a responder HTTP 200. Reexecução do provisionador foi bem-sucedida.
- Conferência estática: fontes TypeScript e enunciado copiados sem alteração; sintaxe shell, links Markdown locais, seleção de arquivos, ZIP e manifesto SHA-256 conferidos na montagem.

O host tinha um caminho de plugin Buildx inválido para o Compose. A tentativa padrão falhou; o fallback explícito com `DOCKER_BUILDKIT=0` construiu as imagens e permitiu concluir a validação. O roteiro tenta esse fallback uma vez se o build padrão falhar; se ambos falharem, propaga o erro. O caminho moderno de Buildx não foi validado nesta máquina.

A primeira configuração experimental de testes utilizava autenticação trust em loopback e, por isso, falhou no teste de recusa de senha incorreta. A configuração distribuída exige `scram-sha-256` nas conexões de rede, foi inicializada em volume novo e passou a suíte completa, sem afrouxar o teste nem alterar o código do provisionador. Os volumes de diagnóstico foram preservados; nenhum volume existente foi removido.

A demonstração foi validada com portas alternativas 33000/39101/35546/34567 e nome `ballance-entrega`. A suíte final utilizou `ballance-entrega-testes-scram`, sem publicar portas do host. A configuração privada desta validação e os logs locais não são pré-requisitos e não integram o ZIP. O destinatário gera sua própria senha; as portas padrão estão no README.

## Escopo preservado

A suíte distribuída contém os testes funcionais obrigatórios, incluindo SQL adversarial, idempotência/replay, cinquenta repetições simultâneas, três processos independentes, redelivery, publishers concorrentes, referências fora de ordem e crashes controlados. Os dois testes adicionais do runner exploratório de carga ficaram fora juntamente com o runner e seus resultados. O total de 205 do repositório completo não se aplica a este subconjunto de 203.

Versões das dependências, bun.lock, lógica financeira e migrations foram preservados. Os ajustes de empacotamento são: README/arquitetura essenciais, edição documental com referências locais válidas, retirada do script opcional test:load, alvo Docker de validação, imagem com tag própria da entrega, Compose de testes/smoke, roteiro shell e manifesto.

Sem autenticação real, configuração de produção, promessa de capacidade sob carga ou garantia de durabilidade de mensagens após recriar o LocalStack. O ZIP depende de internet no primeiro build e não contém imagens offline. O Docker do sistema deve ser instalado conforme as instruções oficiais vinculadas no README. Containers criados para a validação foram encerrados, preservando volumes; outros serviços do host não foram interrompidos. Não houve commit, push ou publicação externa.
