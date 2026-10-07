# Decisões de regra de negócio

Na leitura do [`CONTRATO_API.md`](../frontEnd/CONTRATO_API.md), comparando com o `database/bioshield.sql` e com as telas, a Daiane anotou nove pontos que o contrato deixava em aberto ou em que ele se contradizia. Para cada um ela propôs uma saída, e o Erik decidiu. As nove decisões estão implementadas e testadas.

A numeração ficou a mesma da época, porque vários comentários do backend apontam para ela (por exemplo, "dúvida 4" no `config/fuso.ts`).

| Dúvida | Decisão | Onde está no código |
|---|---|---|
| 1. Adesão | Dose do futuro não entra na conta | `DoseService.calcularAdesao` |
| 2. Dose perdida | Vira perdida 60 minutos depois do horário, na hora da leitura | `Dose.limiteDePerdidas` e `DoseService.prepararAgenda` |
| 3. Dias de agenda | 7 dias, completados antes de toda leitura de dose | `Medicamento.gerarHorariosEntre` e `DoseService.prepararAgenda` |
| 4. Fuso horário | Tudo no horário de Brasília, com a API respondendo em UTC | `config/fuso.ts` e `config/db.ts` |
| 5. Alterar remédio | A agenda futura é refeita, numa transação | `MedicamentoService.atualizar` |
| 6. Remédio inativo | Suspenso é a coluna `ativo`; encerrado é o `data_fim` | `MedicamentoService` e `emergenciaInfrastructure` |
| 7. Confirmar adiantado | A partir de 60 minutos antes do horário | `Dose.confirmar` |
| 8. Código do cuidador | Duas colunas novas em `pacientes` | `CodigoCuidador` e `CuidadorService.vincular` |
| 9. Quem vê o quê | Uma regra única de permissão, no service | `AutorizacaoService` |

## Remédios e doses

### 1. Como calcular a adesão

O contrato dizia que dose no futuro não entra na conta, mas o exemplo dele contava. Com 6 doses no dia, 4 tomadas e 2 ainda por vir, o exemplo dava 67%, ou seja, 4 de 6.

**Decisão:** vale a regra escrita; o exemplo é que estava errado. Nas duas janelas (hoje e os últimos 7 dias):

- `previstas` é o total de doses com horário previsto até agora, seja qual for a situação delas
- `tomadas` e `perdidas` saem dessas mesmas doses, e o `percentual` é `tomadas / previstas`, arredondado
- dose confirmada adiantado só entra na conta quando o horário dela chega, senão `tomadas` passaria de `previstas`
- dose atrasada há menos de 60 minutos já conta em `previstas`, mas ainda não em `perdidas`
- janela sem nenhuma dose dá `percentual` 0

Não precisou de SQL novo: o `contarPorPeriodo` já recebe início e fim, e o service passa "agora" como fim. O exemplo do contrato foi corrigido (4 previstas, 3 tomadas, 1 perdida, 75%), e a demonstração passou a parar a conta do dia em agora.

Na tela de doses, antes da primeira dose do dia aparece 0% com o texto "Nenhuma dose até agora". Quando há dose confirmada antes da hora, a tela explica que ela entra na conta quando o horário dela chegar.

### 2. Quando a dose vira perdida

Nada no sistema mudava uma dose de prevista para perdida, e o roteiro falava em "janela de tolerância" sem dizer o tamanho.

**Decisão:** 60 minutos, aplicados na hora da leitura, sem rotina rodando no servidor.

O número mora num lugar só, a constante `TOLERANCIA_ATRASO_MINUTOS` da entidade `Dose`. Antes de responder qualquer leitura de dose (as doses de hoje, as próximas doses do alarme, a adesão, a lista de remédios e o painel do cuidador), o service marca como perdida toda dose prevista do paciente com horário anterior a "agora menos 60 minutos". Quem calcula a hora é o service, e não o `NOW()` do banco. Confirmar uma dose perdida continua liberado: é o botão "Tomei mesmo assim".

O alarme do celular segue a mesma janela: os lembretes repetem até 60 minutos depois do horário, quando a dose passa a contar como perdida.

### 3. Quantos dias de agenda gerar

Remédio sem data de fim não acaba, e não dá para gravar dose infinita.

**Decisão:** o cadastro gera 7 dias (ou até o `data_fim`, o que vier antes), só de agora para a frente. Antes de toda leitura de dose, o backend continua a agenda de cada remédio em uso a partir da última dose que já existe, até 7 dias à frente.

Três detalhes que vieram junto:

1. **Completar antes de toda leitura, e não só na tela de doses.** Se fosse só lá, quem parasse de abrir o app ficaria sem dose no banco, e o familiar veria "em dia" justamente quando a pessoa sumiu.
2. **O buraco do passado também é preenchido, até 7 dias para trás.** Se a agenda acabou há 3 dias, esses dias são gerados e logo marcados como perdidos, porque ninguém confirmou. O limite de 7 dias é o tamanho da janela da adesão.
3. **Sem dose repetida.** A grade de horários sai sempre do `data_inicio` mais o `horario_inicial`, andando de frequência em frequência. O índice `uk_doses_agenda` é único e o insert usa `INSERT IGNORE`, então duas telas completando a agenda ao mesmo tempo não duplicam nada.

O `database/bioshield.sql` já cria esse índice único; os nossos dois bancos, criados antes dele, foram ajustados com um `ALTER TABLE doses` na Fase 8. O modo demonstração faz a mesma coisa em escala menor: completa 2 dias à frente, o suficiente para o alarme.

## Regras que o contrato não cobria

### 4. Fuso horário

O `horarioInicial` chega como "08:00", a API devolve horários em UTC e a coluna `DATETIME` não guarda fuso. Com servidor e banco em fusos diferentes, a dose das 22h cairia no dia seguinte.

**Decisão:** o BioShield inteiro trabalha no horário de Brasília, e a API continua devolvendo todo momento exato em ISO com `Z` (UTC).

São três relógios, e os três precisam concordar:

| Relógio | Onde pesa | Como foi fixado |
|---|---|---|
| Node | A montagem da agenda e o "começo do dia" | `process.env.TZ = "America/Sao_Paulo"` no `config/fuso.ts`, importado primeiro pelo `server.ts` |
| mysql2 | A conversão entre a data do JavaScript e as colunas de data do banco | `timezone: "-03:00"` no pool |
| MySQL | `NOW()`, `CURDATE()` e as colunas `TIMESTAMP` | `SET time_zone = '-03:00'` em cada conexão nova |

O mysql2 e o MySQL recebem o deslocamento, e não o nome do fuso, porque o mysql2 só aceita deslocamento e o MySQL do XAMPP não vem com a tabela de nomes de fuso. Como o Brasil não tem horário de verão desde 2019, `-03:00` é sempre Brasília. Isso foi testado com o relógio do computador forçado para outros fusos (UTC e Tóquio): a dose das 8h continuou sendo às 8h de Brasília.

`horarioInicial`, `dataInicio` e `dataFim` entram e saem como texto, sem conversão. As telas convertem os horários em UTC para a hora do aparelho na hora de mostrar.

Limite conhecido: o app assume um fuso só. Um paciente em Manaus que cadastra "08:00" recebe o alarme às 7h do relógio dele. Resolver de verdade pede guardar o fuso de cada paciente.

### 5. Alterar horário ou frequência de um remédio

Quando o horário muda, a agenda futura precisa acompanhar.

**Decisão:** dentro de uma transação, junto com a alteração do remédio, as doses previstas com horário no futuro são apagadas e geradas de novo. Tomadas e perdidas ficam, porque são histórico.

- A agenda é refeita quando muda o horário, a frequência, o início, o fim ou a suspensão
- Mudar só nome, dosagem ou unidade não mexe na agenda: a dose busca esses dados no remédio na hora de listar
- A dose atrasada dentro da tolerância fica, porque ainda pode ser confirmada
- Dose confirmada adiantado no mesmo horário da grade nova não duplica, graças ao índice único da dúvida 3

A tela de remédios usa essa rota para suspender e reativar, e o alarme do celular é refeito em seguida.

### 6. Quando um remédio deixa de estar em uso

A coluna `ativo` existia e a emergência filtrava por ela, mas nenhuma rota mudava esse valor.

**Decisão:** eram duas coisas diferentes misturadas na mesma coluna.

- **Suspenso** é decisão de alguém, como o médico mandar parar. É a coluna `ativo`, mudada pelo `PUT /medicamentos/:id`, e as doses futuras saem da agenda
- **Encerrado** é o calendário: o tratamento tinha data para acabar e ela passou. É o `data_fim`, e não precisa de coluna nem de rotina

Consequências:

1. A ficha de emergência mostra só remédio em uso hoje: ativo, já começado e ainda não encerrado. Remédio que só começa semana que vem também fica de fora, porque na emergência informação errada é pior que informação faltando.
2. No `GET /medicamentos`, o campo `ativo` vem falso tanto para suspenso quanto para encerrado, e a tela separa os dois pela data.
3. O `DELETE` continua apagando de verdade, com as doses. É para remédio cadastrado por engano; para remédio que a pessoa parou de tomar, o caminho é suspender, que guarda o histórico de adesão.

### 7. Confirmar uma dose antes da hora

O contrato liberava confirmar dose perdida, mas não dizia nada sobre confirmar às 10h da manhã a dose das 20h.

**Decisão:** dá para confirmar a partir de 60 minutos antes do horário. Mais cedo que isso, a API responde 400 com "Ainda é cedo para confirmar essa dose. Dá para confirmar a partir de 1 hora antes do horário."

Quem decide se está cedo é o relógio do servidor, e não o horário que vem do celular; senão bastaria mandar uma hora inventada. O horário que vem do celular é gravado como a hora real da tomada. Na tela de doses, a dose que ainda não pode ser confirmada aparece sem botão, com o aviso "Dá para confirmar a partir das 19:00". Para o lado do atraso não há limite.

## Cuidador e permissões

### 8. Onde guardar o código do cuidador

A rota que gera o código devolvia `codigo` e `validoAte`, mas nenhuma tabela tinha onde guardar isso, e o vínculo não teria com o que comparar.

**Decisão:** duas colunas em `pacientes`, `codigo_cuidador` (7 caracteres, único) e `codigo_valido_ate`. Cada paciente tem no máximo um código válido por vez; gerar de novo substitui o anterior. O código vale 24 horas e evita letras e números que se confundem ao ditar (0, O, 1, I e L).

No vínculo, o cuidador é sempre quem está logado, e não um id que venha no corpo da requisição; senão daria para vincular a conta de outra pessoa. Código que não existe e código vencido respondem igual, com 404, para ninguém descobrir quais códigos já existiram.

### 9. Quem pode ver os dados de qual paciente

O token de sessão carrega só o id do usuário. Sem conferência, qualquer pessoa logada leria os remédios de qualquer paciente trocando o número na URL.

**Decisão:** a regra fica no service, num lugar só, o `AutorizacaoService`. O middleware de autenticação só descobre quem está logado; quem sabe de qual paciente é o dado é o service de cada domínio, porque o id chega de jeitos diferentes (na URL, na query ou escondido atrás de uma dose ou de um remédio).

| Função | Quem passa | Onde é usada |
|---|---|---|
| `garantirDono` | Só o dono da ficha | Ficha, QR Code, histórico de acessos, código do cuidador e remédios |
| `garantirAcompanhamento` | O dono ou um cuidador com vínculo ativo | Doses de hoje, próximas doses, confirmação e adesão |
| `garantirMesmoUsuario` | Só a própria conta | `/usuarios/:id` e a lista de pacientes do cuidador |

Todas respondem 403 quando a pessoa não tem acesso. Paciente que não existe também responde 403, com a mesma mensagem, para ninguém descobrir quais ids existem trocando o número.

## Detalhes técnicos que não precisaram de decisão

- O mysql2 devolve `DECIMAL(10,2)` como texto, "50.00". O value object `Dosagem` converte para número.
- `horario_inicial` é `TIME` e volta como "08:00:00". O SQL corta os segundos, porque o contrato usa "08:00".
- Paciente sem dose nenhuma dividiria por zero na adesão. A conta devolve 0.
