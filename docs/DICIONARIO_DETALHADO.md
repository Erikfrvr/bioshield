# Dicionário detalhado do código

Um mapa do backend e das telas do BioShield: o que cada classe guarda, que regra ela faz valer e quem chama quem. Serve para achar rápido onde mora uma regra sem abrir dez arquivos. As tabelas e colunas do banco estão no [`DICIONARIO_DADOS.md`](../database/DICIONARIO_DADOS.md), e o formato de cada rota no [`CONTRATO_API.md`](../frontEnd/CONTRATO_API.md).

## O caminho de uma requisição

```
rota  ->  middleware  ->  controller  ->  service  ->  repository (interface)  ->  infrastructure (SQL)  ->  banco
                                            |
                                            v
                                 entidades e value objects
```

Na volta, a entidade vira DTO de resposta dentro do service, campo por campo, e o controller só escolhe o status HTTP. Se um campo não está escrito no DTO de resposta, ele não sai: é assim que a senha e o token do QR nunca escapam por acidente.

## Value objects

Um value object valida o próprio valor quando é criado. Se o valor for inválido, ele nem chega a existir, e a mensagem do erro é a que a pessoa vê na tela.

| Arquivo | O que representa | Regras |
|---|---|---|
| `Email.ts` | Email da conta | Obrigatório, até 120 caracteres, formato com arroba, domínio e terminação. Guardado em minúsculo e sem espaço |
| `Senha.ts` | Senha da conta | Senha nova: pelo menos 8 caracteres, até 72 bytes (o limite do bcrypt), com maiúscula, minúscula, número e um de `@ $ ! % * ? & #`. `aPartirDoHash` carrega o hash do banco sem regra. Impressa em log ou JSON, aparece só `********` |
| `Telefone.ts` | Telefone de contato | Aceita com ou sem máscara e guarda só os dígitos. 10 dígitos (fixo) ou 11 (celular, com 9 depois do DDD). DDD de 11 a 99, sem zero |
| `TipoSanguineo.ts` | Tipo sanguíneo | Só os oito tipos, aceitando minúscula e espaço. `0+` com zero é recusado. `opcional` transforma vazio em nulo, porque muita gente não sabe o próprio tipo |
| `TokenQR.ts` | Código do QR Code | 16 bytes aleatórios do `crypto` do Node, em 32 caracteres hexadecimais. `aPartirDoValor` recusa qualquer coisa fora desse formato antes de consultar o banco |
| `Dosagem.ts` | Quantidade e unidade do remédio | Maior que zero, até 99.999.999,99 e com no máximo 2 casas decimais (dose de remédio não se arredonda escondido). Aceita "2,5". Unidade: `mg`, `ml`, `g`, `gota`, `comprimido` ou `unidade`, com `mg` por padrão |
| `HorarioDose.ts` | Primeira dose e intervalo | Horário no formato HH:mm, de 00:00 a 23:59. Frequência inteira de 1 a 168 horas |
| `CodigoCuidador.ts` | Código de autorização do cuidador | 7 caracteres sorteados pelo `crypto`, sem 0, O, 1, I e L, que se confundem ao ditar. Vale 24 horas |

## Entidades

| Entidade | O que é | Regras que ela faz valer |
|---|---|---|
| `Usuario` | A conta, de paciente ou de cuidador | Nome obrigatório, até 80 caracteres. Email e senha entram já como value objects |
| `Paciente` | A ficha médica | Condições e observações até 1.000 caracteres. No máximo 30 alergias e 5 contatos. A mesma substância não pode aparecer duas vezes, nem dois contatos com a mesma prioridade. Os contatos ficam em ordem de prioridade. Alergias e contatos são substituídos inteiros no PUT |
| `Alergia` | Uma alergia | Substância até 100 caracteres, gravidade `leve`, `moderada` ou `grave` (moderada por padrão), reação até 200 caracteres |
| `ContatoEmergencia` | Quem avisar | Nome até 80, parentesco até 40, prioridade de 1 a 127 (1 é o primeiro a ser chamado) |
| `Medicamento` | Um remédio | Nome até 100. Datas no formato `AAAA-MM-DD`, com o fim nunca antes do início. `suspender` e `reativar`. `tratamentoEncerradoEm` diz se o fim já passou. `gerarHorariosDaAgenda` e `gerarHorariosEntre` montam a grade de doses a partir do início e do horário da primeira dose, parando no fim do tratamento. `DIAS_DE_AGENDA` vale 7 |
| `Dose` | Uma tomada | Situação `prevista`, `tomada` ou `perdida`. `TOLERANCIA_ATRASO_MINUTOS` e `ANTECEDENCIA_CONFIRMACAO_MINUTOS` valem 60. `confirmar` recusa dose já tomada e dose cedo demais, usando o relógio do servidor. `limiteDePerdidas` calcula o momento a partir do qual a dose prevista vira perdida |
| `Cuidador` | O vínculo entre cuidador e paciente | `desvincular` marca como inativo (desvincular duas vezes é erro). `reativar` aproveita a linha antiga quando a mesma dupla volta a se vincular |
| `FichaEmergencia` | A versão pública da ficha | Ordena alergias da grave para a leve, mostra só remédio em uso e ordena contatos por prioridade. Não tem campo para id, email, senha ou token |

## DTOs

O formato exato do que entra e do que sai. Ficam em `models/dto/`, uma pasta por domínio.

| Domínio | Entrada | Saída |
|---|---|---|
| `usuario` | `CadastrarUsuarioDTO` (nome, email, senha), `LoginUsuarioDTO` (email, senha) | `UsuarioResponseDTO` (id, nome, email), `LoginResponseDTO` (token, usuário e `idPaciente`, nulo quando ainda não há ficha) |
| `paciente` | `CriarPacienteDTO` e `AtualizarPacienteDTO` (tipo sanguíneo, condições, observações, alergias e contatos) | `PacienteResponseDTO` (a ficha completa), `QrResponseDTO`, `AcessoQrResponseDTO`, `CodigoCuidadorResponseDTO` |
| `emergencia` | o token, na URL | `FichaEmergenciaResponseDTO`: nome, tipo sanguíneo, condições, observações, data da última atualização, alergias, remédios em uso e contatos. É o filtro de privacidade do app |
| `medicamento` | `CadastrarMedicamentoDTO`, `AtualizarMedicamentoDTO` (campos opcionais, mais `ativo` para suspender e reativar) | `MedicamentoResponseDTO`, com a próxima dose |
| `dose` | `ConfirmarDoseDTO` (a hora real da tomada). `RegistrarDoseDTO` é interno, usado para gravar a agenda | `DoseResponseDTO`, `DoseConfirmadaResponseDTO`, `AdesaoResponseDTO` (hoje e semana) |
| `cuidador` | `VincularCuidadorDTO` (o código; o id do cuidador que vem no corpo é ignorado) | `VinculoResponseDTO` e `PacienteAcompanhadoResponseDTO` (adesão da semana, doses perdidas e próxima dose, sem nada da ficha médica) |

## Repositórios e SQL

Cada interface em `repository/` diz o que o service precisa do banco, e a classe de mesmo nome em `infrastructure/` faz isso com SQL. Toda consulta usa `?` nos parâmetros, toda conexão volta para o pool no `finally`, e o que grava em mais de uma tabela roda numa transação.

| Interface | Implementação | O que oferece |
|---|---|---|
| `UsuarioRepository` | `usuarioInfrastructure` | cadastrar, buscar por email, buscar por id e descobrir a ficha da conta |
| `PacienteRepository` | `pacienteInfrastructure` | criar a ficha com alergias e contatos, ler, atualizar substituindo as listas, trocar e cancelar o token do QR, listar as 100 leituras mais recentes e gravar o código do cuidador |
| `EmergenciaRepository` | `emergenciaInfrastructure` | buscar a ficha pública pelo token (dizendo se o QR está ativo ou cancelado) e registrar a leitura |
| `MedicamentoRepository` | `medicamentoInfrastructure` | cadastrar o remédio com a agenda, listar com a próxima dose, ler, atualizar refazendo a agenda futura e apagar |
| `DoseRepository` | `doseInfrastructure` | gravar doses sem repetir, achar a última dose de cada remédio, marcar perdidas, listar por período, ler, confirmar e contar para a adesão |
| `CuidadorRepository` | `cuidadorInfrastructure` | achar o paciente pelo código, criar, ler e atualizar vínculos, listar quem o cuidador acompanha e achar a próxima dose |
| `AutorizacaoRepository` | `autorizacaoInfrastructure` | dizer quem é o dono de uma ficha e se existe vínculo ativo entre cuidador e paciente |

## Services

| Service | O que faz | Erros que levanta |
|---|---|---|
| `UsuarioService` | Cadastro com hash da senha e email único, login com o mesmo tempo de resposta para email inexistente e senha errada (para não entregar quem tem conta), e leitura da própria conta | `ErroUsuario`: validação, conflito, não encontrado e não autorizado |
| `PacienteService` | Ficha médica, QR Code (criar, trocar, cancelar e reativar sempre com token novo), histórico de leituras e código do cuidador | `ErroPaciente`: validação, não encontrado e conflito |
| `EmergenciaService` | A ficha pública: valida o token, registra a leitura (inclusive de QR cancelado) e monta a resposta reduzida | `ErroEmergencia`: não encontrado e cancelado |
| `MedicamentoService` | Remédios, com a agenda gerada no cadastro e refeita quando horário, período ou suspensão mudam | `ErroMedicamento`: validação e não encontrado |
| `DoseService` | Doses de hoje, próximas doses do alarme, confirmação e adesão. O `prepararAgenda` completa a agenda e marca as perdidas antes de toda leitura. `DIAS_DE_LEMBRETE` vale 2 | `ErroDose`: validação e não encontrado |
| `CuidadorService` | Vínculo pelo código, painel do cuidador e desvínculo pelo próprio cuidador ou pelo dono da ficha | `ErroCuidador`: validação e não encontrado |
| `AutorizacaoService` | Quem vê o quê: `garantirDono`, `garantirAcompanhamento` e `garantirMesmoUsuario` | `ErroAcesso` |

Cada service é uma classe exportada como instância única no fim do arquivo. O repositório chega pelo construtor, com a implementação MySQL como padrão.

## Como o erro vira status HTTP

O service levanta o erro com um tipo, e o controller só traduz. Erro que nenhum service conhece vira 500, e a mensagem interna (que às vezes repete um dado do banco) não vai para a tela nem para o log.

| Status | Quando |
|---|---|
| 400 | Dado inválido (tipo validação) ou JSON quebrado |
| 401 | Login errado, ou token faltando, vencido ou adulterado |
| 403 | Logado, mas sem acesso àquele paciente (`ErroAcesso`) |
| 404 | O recurso da própria rota não existe (remédio, dose, vínculo, QR) |
| 409 | Email já cadastrado, ficha já criada ou QR já cancelado |
| 410 | QR Code cancelado, na rota de emergência |
| 413 | Corpo da requisição grande demais |
| 500 | Qualquer outro erro |

## Segurança e configuração

| Arquivo | O que faz |
|---|---|
| `middleware/autenticacao.ts` | Lê o `Authorization: Bearer`, confere o token e põe o id da conta em `req.idUsuario` |
| `infrastructure/security/JwtService.ts` | Gera e confere o token de sessão. Ele leva só o id da conta e vale 7 dias, porque pedir senha todo dia faz o idoso desistir |
| `infrastructure/security/PasswordHasher.ts` | Hash e comparação de senha com bcrypt |
| `config/db.ts` | O pool do MySQL, com até 10 conexões, e o fuso de Brasília em cada conexão |
| `config/fuso.ts` | O fuso do Node, carregado antes de qualquer outro arquivo |
| `config/rede.ts` | Descobre o endereço de rede do servidor, que vai dentro do QR Code, ou usa o `URL_PUBLICA` do `.env` |
| `server.ts` | Liga as rotas em `/api`, entrega as telas da pasta `frontEnd` na mesma porta e trata os erros gerais sem expor dado |

## Rotas por arquivo

| Arquivo | Rotas | Login |
|---|---|---|
| `usuarioRoutes.ts` | `POST /usuarios`, `POST /usuarios/login`, `GET /usuarios/:id` | só a última |
| `pacienteRoutes.ts` | ficha, QR Code, acessos e código do cuidador, tudo em `/pacientes` | todas |
| `emergenciaRoutes.ts` | `GET /emergencia/:token` | nenhuma, de propósito |
| `medicamentoRoutes.ts` | CRUD em `/medicamentos` | todas |
| `doseRoutes.ts` | `/doses/hoje`, `/doses/proximas`, `/doses/adesao` e `/doses/:id/confirmar` | todas |
| `cuidadorRoutes.ts` | `/cuidadores/vincular`, `/cuidadores/:id/pacientes` e `/cuidadores/vinculo/:id` | todas |

## Telas e scripts

As telas são HTML, CSS e JavaScript sem framework. Cada tela carrega os scripts de apoio e depois o seu.

| Arquivo | O que faz |
|---|---|
| `js/config.js` | Modo (`auto`, `api` ou `demo`), tempos de espera e, se precisar travar, o endereço do servidor |
| `js/api.js` | Todas as chamadas à API, a procura do servidor, a sessão e a troca automática para o modo demonstração |
| `js/demo.js` | Responde as mesmas chamadas com os dados fictícios, com as mesmas regras de dose do backend |
| `js/ui.js` | Sessão, barra de navegação, recados, formatação de data e telefone, endereço do QR e o botão Voltar do Android |
| `js/acessibilidade.js` | O botão de acessibilidade: quatro tamanhos de letra e o contraste reforçado |
| `js/qrcode.js` | O gerador de QR Code do projeto, sem biblioteca |
| `js/lembretes.js` | O alarme dos remédios (detalhes no [`GUIA_APK.md`](GUIA_APK.md)) |
| `index.html` e `js/login.js` | Entrada, com o quadro Servidor e as contas de exemplo da demonstração |
| `pages/cadastro.html` e `js/cadastro.js` | Criar conta, com o medidor de força da senha |
| `pages/perfil.html` e `js/perfil.js` | A ficha, em três abas: QR Code, Ficha médica e Privacidade (código do cuidador e histórico de leituras) |
| `pages/imprimir.html` e `js/imprimir.js` | A folha A4 com o QR em quatro tamanhos |
| `pages/medicamentos.html` e `js/medicamentos.js` | Remédios: cadastrar, suspender, reativar e remover |
| `pages/doses.html` e `js/doses.js` | Agenda do dia, adesão e o cartão do alarme |
| `pages/cuidador.html` e `js/cuidador.js` | Painel do cuidador |
| `pages/emergencia.html` e `js/emergencia.js` | A ficha pública que o QR abre, com os botões de ligar e o SAMU |

### Mensagens de validação da ficha

A tela da ficha confere as linhas de alergia e de contato antes de enviar. Linha toda em branco é ignorada; linha preenchida pela metade avisa e leva a pessoa até o campo.

| Quando | Mensagem |
|---|---|
| Alergia com reação, mas sem substância | Escreva a substância da alergia ou toque em Remover nessa linha. |
| Contato sem nome | Escreva o nome do contato de emergência ou toque em Remover nessa linha. |
| Contato sem telefone | Escreva o telefone de {nome}, com DDD. |
| Telefone com tamanho errado | O telefone de {nome} precisa ter DDD e 10 ou 11 números. |
| A conta já tem ficha criada em outro aparelho | Esta conta já tem uma ficha salva. Toque em Sair e entre de novo para carregar ela. |
| A ficha não carregou, sem servidor | Não consegui falar com o servidor. Confira a internet ou o endereço do servidor e tente de novo. |
| A ficha não carregou, sem acesso | Esta conta não tem acesso a essa ficha. Toque em Sair e entre de novo. |
| A ficha não carregou, outro motivo | Não consegui carregar a sua ficha agora. {motivo} |

Nos três últimos casos aparece também o botão **Tentar de novo**. As mensagens do alarme dos remédios estão no [`GUIA_APK.md`](GUIA_APK.md).

## Convenções de nome

| O quê | Como | Exemplo |
|---|---|---|
| Tabelas | plural, minúsculo | `contatos_emergencia` |
| Colunas | separadas por sublinhado | `horario_previsto` |
| Entidade, value object, service e interface de repositório | iniciais maiúsculas, num arquivo do mesmo nome | `DoseService.ts` |
| Controller, rota e infrastructure | começa com minúscula | `doseController.ts` |
| DTO | termina em `DTO`, numa pasta por domínio | `dto/dose/DoseResponseDTO.ts` |
| Campos na API | começa com minúscula, sem sublinhado | `horarioPrevisto` |

A tradução entre o nome da coluna (`horario_previsto`) e o nome do campo (`horarioPrevisto`) acontece só na infrastructure. Se um campo chega vazio na tela, esse é o primeiro lugar a olhar.

## Glossário

| Termo | Significado |
|---|---|
| Entidade | Objeto do domínio com identidade própria e regras, como um paciente ou uma dose |
| Value object | Valor que se valida sozinho e vale pelo conteúdo, como um email ou um tipo sanguíneo |
| DTO | O formato dos dados que entram e saem da API |
| Repository | A interface que diz o que o service precisa do banco |
| Infrastructure | A implementação dessa interface, com SQL |
| Service | Onde ficam as regras de negócio |
| Controller | Recebe a requisição HTTP e devolve a resposta |
| Adesão | Doses tomadas divididas pelas doses que já deviam ter sido tomadas |
| Tolerância | Os 60 minutos depois do horário em que a dose ainda não conta como perdida |
| Token do QR | O código aleatório que vai no fim do endereço do QR Code e identifica a ficha |
