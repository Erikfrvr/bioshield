# Dúvidas sobre o CONTRATO_API.md

Anotadas pela Daiane na leitura do `frontEnd/CONTRATO_API.md`, comparando com o `database/bioshield.sql` e o front.
Cada item tem uma proposta. Onde estiver **Decisão**, preencham juntos e depois atualizem o contrato.

As que travam código: **1, 2, 3 e 8**. Resolver antes de começar as Fases 7 e 8.

Situação: **as nove estão decididas e implementadas no backend.** Onde uma decisão ainda lista "o que falta fazer", a tabela abaixo diz o que sobrou de verdade.

| Dúvida | Decisão | No código |
|---|---|---|
| 1. Adesão | Dose do futuro não conta | Pronto: `DoseService.calcularAdesao` |
| 2. Dose perdida | 60 minutos, na leitura | Pronto: `DoseService.prepararAgenda` |
| 3. Dias de agenda | 7 dias, completando antes de toda leitura de dose | Pronto nas rotas de dose. Falta a lista do cuidador chamar o `prepararAgenda` (Fase 9) e rodar o `ALTER` no banco de quem já tem ele criado |
| 4. Fuso | Brasília fixo nos três relógios, API em UTC | Pronto: `config/fuso.ts` e `config/db.ts` |
| 5. PUT de remédio | Refaz a agenda futura em transação | Pronto no backend. Nenhuma tela chama o `PUT` ainda |
| 6. `ativo` | Suspenso é a coluna, encerrado é o `data_fim` | Pronto no backend. Falta o botão de suspender na tela de remédios |
| 7. Confirmar adiantado | Até 60 minutos antes | Pronto: `DoseService.confirmar` |
| 8. Código do cuidador | Colunas em `pacientes` | Pronto |
| 9. Quem vê o quê | `AutorizacaoService` | Pronto |

---

## Medicamentos e doses (fatia da Daiane)

### 1. O cálculo de adesão se contradiz

O contrato diz que dose no futuro não entra na conta, mas o exemplo conta:

- `hoje`: 6 previstas, 4 tomadas, 0 perdidas, 67%. Sobram 2 doses que ainda não chegaram, e 4/6 = 67%, então elas entraram na conta.
- `semana`: 36/42 = 86%, mas 36 + 4 = 40, então também tem 2 futuras nas 42.
- `frontEnd/js/demo.js`, função `contar`, faz `tomadas / lista.length` com a lista inteira.

**Proposta:** seguir a regra escrita. `previstas` e `percentual` contam só dose com `horario_previsto <= NOW()`. Corrigir o exemplo do contrato e o `contar` do `demo.js`.

**Decisão (Erik):** aceita como proposto. Vale a regra escrita, o exemplo é que estava errado.

- `previstas` é o total de doses com horário previsto até agora, seja qual for o status. `tomadas` e `perdidas` saem dessas mesmas doses, e `percentual` é `tomadas / previstas`. Vale igual para `hoje` e para `semana`
- No backend não precisa de SQL novo: o `contarPorPeriodo` do `DoseRepository` já recebe início e fim por parâmetro, com o fim inclusive. O `DoseService` passa `agora` como fim nas duas janelas (início do dia até agora, e sete dias atrás até agora)
- Dose confirmada adiantado (dúvida 7) só entra na conta quando o horário dela chega, senão `tomadas` passaria de `previstas`
- Dose atrasada há menos de 60 minutos (dúvida 2) já conta em `previstas`, mas ainda não em `perdidas`
- Exemplo do `CONTRATO_API.md` corrigido: `hoje` com 4 previstas, 3 tomadas, 1 perdida, 75%. `semana` com 40 previstas, 36 tomadas, 4 perdidas, 90%. A seção ganhou a explicação da conta
- `demo.js` corrigido: o problema não era o `contar`, era a lista do dia, que ia até 23:59. Agora ela para em agora, como a da semana já fazia
- Na tela de doses, antes da primeira dose do dia não existe conta para mostrar. Aparece `0%`, igual ao painel do cuidador, com o texto "Nenhuma dose até agora" explicando o motivo

### 2. Quem marca a dose como `perdida`

Não existe job nem rotina que mude `prevista` para `perdida`. O roadmap fala em janela de tolerância, mas não diz o tamanho.

**Proposta:** tolerância de 60 minutos, aplicada na hora da leitura. Antes de `GET /doses/hoje` e `GET /doses/adesao`, rodar:

```sql
UPDATE doses d
JOIN medicamentos m ON m.id = d.id_medicamento
SET d.status = 'perdida'
WHERE m.id_paciente = ?
  AND d.status = 'prevista'
  AND d.horario_previsto < NOW() - INTERVAL 60 MINUTE;
```

**Decisão (Erik):** aceita como proposto, 60 minutos, aplicada na hora da leitura. Sem job e sem rotina agendada.

- O número mora em um lugar só: a constante `TOLERANCIA_ATRASO_MINUTOS` da entidade `Dose`
- A única diferença para o SQL de cima é o `NOW()`. O `DoseRepository` já combinou que quem manda a hora é o service, então o `marcarPerdidas(idPaciente, limite)` recebe o limite pronto. O service calcula com `Dose.limiteDePerdidas(agora)`
- O `DoseService` chama o `marcarPerdidas` antes de `GET /doses/hoje` e de `GET /doses/adesao`. Na Fase 9, antes de montar a lista do cuidador também, senão o familiar vê "em dia" para quem não abriu o app
- Confirmar uma dose `perdida` continua liberado, é o "Tomei mesmo assim"
- O `demo.js` agora faz a mesma coisa (função `marcarPerdidas`), então a demonstração se comporta igual à API
- Regra descrita no `CONTRATO_API.md`, em `GET /api/doses/hoje`

### 3. Quantos dias de agenda gerar

Com `dataFim: null` o remédio não acaba, e não dá para inserir dose infinita. O `demo.js` gera 3 dias à frente (`gerarAgenda(banco, remedio, 3)`), mas não diz quem gera os dias seguintes.

**Proposta:** gerar 7 dias no cadastro (ou até `dataFim`, o que vier antes). No `GET /doses/hoje`, completar a agenda se o último dia gerado estiver a menos de 7 dias.

**Decisão (Erik):** aceita, com três ajustes na parte de completar. A parte do cadastro já está pronta.

O que já existe: o `MedicamentoService` gera 7 dias no cadastro (`DIAS_DE_AGENDA`), pelo `gerarHorariosDaAgenda` da entidade `Medicamento`, que já para no `dataFim` e só gera de agora para a frente.

Completar é do `DoseService`. Regra: para cada remédio em uso do paciente, continuar a agenda de onde a última dose parou até agora mais 7 dias, ou até o `dataFim`.

Os três ajustes em relação à proposta:

1. **Não é só no `GET /doses/hoje`.** Completar roda antes de toda leitura de dose: `/doses/hoje`, `/doses/adesao` e a lista do cuidador. Se rodasse só na tela de doses, o paciente que para de abrir o app ficaria sem dose nenhuma no banco, e o familiar veria "em dia" justamente quando a pessoa sumiu. Fica uma função só no service, que completa a agenda e depois chama o `marcarPerdidas` da dúvida 2, nessa ordem
2. **O buraco do passado também é preenchido, até 7 dias para trás.** Se a agenda acabou há 3 dias, esses 3 dias de dose são gerados, e o `marcarPerdidas` logo em seguida marca como `perdida`. É o certo: ninguém confirmou essas doses. O limite de 7 dias é porque a adesão só olha a última semana, então gerar mais que isso seria linha à toa. Isso não contradiz a regra do cadastro: lá não se gera dose antiga porque o remédio ainda não existia no app
3. **Sem dose repetida.** A grade de horários sai sempre de `dataInicio` mais `horarioInicial`, andando de `frequenciaHoras` em `frequenciaHoras`. Completar usa o `gerarHorariosEntre` da entidade `Medicamento`, que é a mesma conta do `gerarHorariosDaAgenda`, e só insere horário depois da última dose que já existe. Para duas requisições ao mesmo tempo não duplicarem, o índice `idx_doses_agenda` vira `UNIQUE` e o insert passa a ser `INSERT IGNORE`:

```sql
ALTER TABLE doses
  DROP INDEX idx_doses_agenda,
  ADD CONSTRAINT uk_doses_agenda UNIQUE (id_medicamento, horario_previsto);
```

Como ficou no código:

- `DoseService.prepararAgenda(idPaciente, agora)` completa a agenda e depois marca as perdidas. As rotas `/doses/hoje` e `/doses/adesao` chamam antes de ler
- `DoseRepository.ultimoHorarioPorMedicamento` devolve a última dose de cada remédio, e o `registrar` usa `INSERT IGNORE`. O índice único já está no `bioshield.sql` e no `DICIONARIO_DADOS.md`. Quem já tem o banco criado roda o `ALTER` de cima
- Falta só a lista do cuidador, na Fase 9, chamar o `prepararAgenda` de cada paciente
- O `proximaDose` do `GET /medicamentos` pode vir `null` para quem ficou mais de 7 dias sem abrir a tela de doses. O contrato já diz que pode vir `null` e o front trata
- O `demo.js` gera 3 dias e não completa. Como os dados dele ficam só na aba e somem ao fechar, não precisa mudar

---

## Regras que o contrato não cobre

### 4. Fuso horário

O `horarioInicial` chega como `"08:00"` (hora local), o `proximaDose` sai em UTC (`"2026-09-18T23:00:00.000Z"`, 20:00 em Brasília) e `doses.horario_previsto` é `DATETIME`, que não guarda fuso. Se servidor e MySQL estiverem em fusos diferentes, a dose das 22h cai no dia seguinte em `GET /doses/hoje`.

**Proposta:** fixar `America/Sao_Paulo` no pool do mysql2 (`timezone`) e no Node, gravar hora local e converter para ISO só no DTO. Isso vale também para os `TIMESTAMP` da Fase 6.

**Decisão (Erik):** aceita a ideia, com uma correção técnica. O BioShield inteiro trabalha no horário de Brasília, e a API continua devolvendo todo horário em ISO com `Z` (UTC).

A correção: a opção `timezone` do mysql2 **não aceita nome de fuso**. Só aceita `local`, `Z` ou um deslocamento como `-03:00`. Escrever `America/Sao_Paulo` ali não funciona. Como o Brasil não tem horário de verão desde 2019, `-03:00` é sempre Brasília.

São três relógios, e os três precisam concordar:

| Relógio | Onde aparece | Como fixar |
|---|---|---|
| Node | `new Date(ano, mes, dia, hora, minuto)` do `gerarHorariosDaAgenda`, início do dia do `GET /doses/hoje` | `process.env.TZ = "America/Sao_Paulo"` na primeira linha do `server.ts`, antes de qualquer import que use data |
| mysql2 | Conversão entre `Date` do JavaScript e `DATETIME`/`TIMESTAMP` do banco | `timezone: "-03:00"` no `createPool` do `config/db.ts` |
| MySQL | `NOW()`, `CURDATE()`, `CURRENT_TIMESTAMP` e a leitura das colunas `TIMESTAMP` | `SET time_zone = '-03:00'` em cada conexão nova do pool (evento `connection`). Com deslocamento, e não com nome, porque o MySQL do XAMPP não vem com a tabela de nomes de fuso carregada |

Hoje funciona sem nada disso porque o computador de desenvolvimento e o MySQL do XAMPP já estão em Brasília, e o padrão do mysql2 é `local`. Quebra no dia em que o backend for publicado em um servidor em UTC: o `"08:00"` viraria 5h da manhã em Brasília, e o `NOW()` do `SELECT_MEDICAMENTO` deixaria de bater com os horários gravados.

Como fica cada dado:

- `horarioInicial` (`"08:00"`), `dataInicio` e `dataFim` (`"2026-09-18"`) são hora e dia de parede em Brasília. Entram e saem como texto, sem conversão
- `horarioPrevisto`, `horarioConfirmado`, `proximaDose` e os `TIMESTAMP` saem em ISO com `Z`, pelo `toISOString()` no DTO, como já é hoje. O exemplo do contrato está certo: `23:00Z` é 20h em Brasília
- O front converte para a hora do aparelho na hora de mostrar (`UI.formatarHora`), então não muda nada lá
- "Hoje" no `GET /doses/hoje` e na adesão é o dia de Brasília, da meia noite até a meia noite seguinte

Limite conhecido, que fica para depois do Empreenda: o app assume um fuso só. Um paciente em Manaus, que está uma hora atrás, cadastrando `"08:00"`, recebe a dose às 7h do relógio dele. Resolver de verdade pede guardar o fuso de cada paciente.

Como ficou no código: o arquivo novo `config/fuso.ts` guarda o nome e o deslocamento do fuso e acerta o Node. O `config/db.ts` usa o deslocamento no `timezone` do pool e no `SET time_zone` de cada conexão. Testado subindo o servidor com o relógio do processo forçado para UTC: a dose das 8h continuou gravada às 8h e o código do cuidador continuou valendo 24 horas.

### 5. PUT de medicamento que muda horário ou frequência

A agenda futura precisa acompanhar.

**Proposta:** dentro de uma transação, apagar as doses `prevista` com horário no futuro e gerar de novo. As `tomada` e `perdida` ficam, porque são histórico.

**Decisão (Erik):** aceita como proposto, com o detalhe de quando refazer. Hoje o `PUT` grava o remédio e não toca nas doses, então a agenda fica com os horários antigos.

- **Refaz a agenda** quando muda `horarioInicial`, `frequenciaHoras`, `dataInicio`, `dataFim` ou `ativo`. Encurtar o `dataFim` precisa apagar as doses depois dele, e mudar o `dataInicio` desloca a grade inteira
- **Não refaz** quando muda só `nome`, `dosagem` ou `unidade`. A dose busca esses dados no remédio na hora de listar, então já aparecem atualizados
- Refazer é: apagar as doses `prevista` com `horario_previsto` maior que agora e inserir o resultado de `gerarHorariosDaAgenda(agora, 7)` com os dados novos
- Ficam como estão: `tomada`, `perdida`, e a `prevista` atrasada dentro dos 60 minutos de tolerância, que ainda pode ser confirmada
- Tudo em uma transação só, junto com o `UPDATE` do remédio, porque mexe em duas tabelas. O `atualizar` do `MedicamentoRepository` passa a receber a agenda nova (ou `null` quando não é para refazer), no mesmo desenho do `cadastrar`
- Uma dose confirmada adiantado (dúvida 7) é `tomada` com horário no futuro e não é apagada. Se a grade nova cair no mesmo horário, o `UNIQUE` com `INSERT IGNORE` da dúvida 3 impede a repetição

Como ficou no código: o `atualizar` do `MedicamentoService` compara horário, período e `ativo` de antes e de depois, e só então manda a agenda nova para o `atualizar` do repository, que faz tudo em uma transação. Hoje nenhuma tela chama o `PUT` de medicamento: o `api.js` tem a função, mas a tela de remédios só cadastra e apaga.

### 6. Quando `medicamentos.ativo` vira FALSE

A coluna existe e a emergência filtra por ela, mas nenhuma rota muda esse valor. O `DELETE` apaga a linha de verdade.

**Proposta:** tratar como inativo quando `data_fim < CURDATE()`, direto na consulta da emergência (`ativo = TRUE AND (data_fim IS NULL OR data_fim >= CURDATE())`).

**Decisão (Erik):** aceita, e completada. São duas coisas diferentes que estavam misturadas na mesma coluna:

- **Suspenso** é decisão de alguém: o médico mandou parar. É a coluna `ativo`
- **Encerrado** é o calendário: o tratamento tinha data para acabar e ela passou. É o `data_fim`, e não precisa de coluna nem de rotina para virar nada

Regras:

1. **Emergência.** Só sai remédio em uso hoje. Além da proposta, entra o começo do tratamento, porque remédio que só começa semana que vem também não está em uso, e na emergência informação errada é pior que informação faltando:

```sql
WHERE id_paciente = ?
  AND ativo = TRUE
  AND data_inicio <= CURDATE()
  AND (data_fim IS NULL OR data_fim >= CURDATE())
```

   O `CURDATE()` só é confiável depois da dúvida 4, que põe o MySQL no fuso de Brasília.

2. **Quem muda a coluna `ativo`.** O `PUT /api/medicamentos/:id` passa a aceitar `ativo: false` (suspender) e `ativo: true` (reativar). A entidade `Medicamento` já tem `suspender()` e `reativar()`, e o `atualizar` do infrastructure já grava a coluna. Falta o campo no `AtualizarMedicamentoDTO` e o tratamento no service. Suspender apaga as doses `prevista` futuras e reativar gera de novo, pela mesma rotina da dúvida 5. O `gerarHorariosDaAgenda` já devolve lista vazia para remédio inativo

3. **O campo `ativo` na resposta do `GET /medicamentos`.** Vem `false` quando o remédio está suspenso **ou** quando o `dataFim` já passou. Assim a tela de remédios, que já mostra o selo de encerrado quando `ativo === false`, funciona para os dois casos sem mudar o front. Remédio que ainda vai começar continua `ativo: true`

4. **`DELETE` continua apagando de verdade**, com as doses junto. É para remédio cadastrado por engano. Para remédio que a pessoa parou de tomar, o caminho é suspender, que guarda o histórico de adesão

5. **Agenda.** Não gera dose depois do `dataFim` (já é assim) nem para remédio suspenso

Como ficou no código:

- O `WHERE` da consulta de medicamentos no `emergenciaInfrastructure.ts` já é o de cima
- `ativo` entrou no `AtualizarMedicamentoDTO` e no `atualizar` do `MedicamentoService`, que só aceita verdadeiro ou falso de verdade. A conta do item 3 está no `paraResposta`, com o método `tratamentoEncerradoEm` da entidade
- Falta a tela de remédios ganhar o botão de suspender. Sem ele a regra 2 só é alcançável pelo `requests.http`

### 7. Confirmar dose no futuro

O contrato libera confirmar dose `perdida`, mas não diz nada sobre confirmar uma dose das 20h às 10h da manhã.

**Proposta:** aceitar até 60 minutos antes do horário e devolver `400` fora disso.

**Decisão (Erik):** aceita como proposto. Dá para confirmar a partir de 60 minutos antes do horário previsto. Mais cedo que isso, `400`.

- A regra está na entidade `Dose`: constante `ANTECEDENCIA_CONFIRMACAO_MINUTOS`, método `podeSerConfirmadaEm(agora)` e a checagem dentro do `confirmar(horarioConfirmado, agora)`, que joga `Error` com a mensagem "Ainda é cedo para confirmar essa dose. Dá para confirmar a partir de 1 hora antes do horário."
- Quem decide se está cedo é o relógio do servidor (`agora`), não o `horarioConfirmado` do corpo. Se valesse o que vem do celular, bastava mandar uma hora inventada. O `horarioConfirmado` continua sendo gravado como a hora real da tomada
- O `DoseService` só precisa chamar `dose.confirmar(...)` e traduzir o `Error` para erro de validação, como os outros services fazem
- Para o lado do atraso não tem limite: dose `perdida` pode ser confirmada a qualquer hora
- Na tela de doses, a dose que ainda não pode ser confirmada aparece sem botão, com o aviso "Dá para confirmar a partir das 19:00". O `demo.js` recusa igual à API
- Regra descrita no `CONTRATO_API.md`, em `POST /api/doses/:id/confirmar`

---

## Para o Erik

### 8. O código do cuidador não tem onde ser guardado

`POST /api/pacientes/:id/codigo` devolve `codigo` e `validoAte`, mas nenhuma tabela tem essas colunas. Sem isso, `POST /api/cuidadores/vincular` (Fase 9) não tem com o que comparar.

**Proposta:** ALTER no mesmo esquema da Fase 2.5, sem depender de nenhuma outra fase:

```sql
ALTER TABLE pacientes
  ADD COLUMN codigo_cuidador CHAR(7) NULL AFTER qr_cancelado_em,
  ADD COLUMN codigo_valido_ate TIMESTAMP NULL AFTER codigo_cuidador,
  ADD CONSTRAINT uk_pacientes_codigo UNIQUE (codigo_cuidador);
```

Levar também para o `bioshield.sql` e para o `DICIONARIO_DADOS.md`.

**Decisão (Erik):** aceita como proposto. As colunas `codigo_cuidador` e `codigo_valido_ate` e o `UNIQUE` já estão no `bioshield.sql` e no `DICIONARIO_DADOS.md`. O ALTER ficou no `CONTRATO_API.md` para quem já tem o banco criado. O `POST /cuidadores/vincular` pega o cuidador de `req.idUsuario` (o token), não do corpo, e recusa código vencido com `404`.

### 9. Quem pode ver os dados de qual paciente

O JWT carrega só o id do usuário. Em `GET /api/medicamentos?idPaciente=1`, se ninguém conferir, qualquer usuário logado lê o remédio de qualquer paciente trocando o número. O mesmo vale para doses, ficha, acessos e QR.

**Proposta:** uma função única, usada por todos os services, que libera quando o paciente é do usuário logado ou quando existe vínculo `ativo = TRUE` em `cuidador_paciente`. Cuidador só passa nas rotas de dose e adesão. Negar com `403`.

**Decisão (Erik):** fica no **service**. O middleware `autenticar` (Fase 4) só descobre quem está logado e grava em `req.idUsuario`. Ele não tem como saber o paciente, porque o id chega de jeitos diferentes: `?idPaciente`, `:id`, ou atrás de um id de dose ou de remédio. Erik escreveu `services/AutorizacaoService.ts`, com repository e infrastructure no molde da Fase 3:

- `garantirDono(req.idUsuario, idPaciente)`: ficha, QR, acessos, código e medicamentos
- `garantirAcompanhamento(req.idUsuario, idPaciente)`: doses e adesão, dono ou cuidador com vínculo ativo
- `garantirMesmoUsuario(req.idUsuario, id)`: `/usuarios/:id` e `/cuidadores/:id/pacientes`

As três lançam `ErroAcesso`, que o controller traduz para `403` (ver o `usuarioController`). Paciente inexistente também dá `403`, com a mesma mensagem. Cada service passa `req.idUsuario` para essas funções logo depois de validar os ids e antes de consultar o banco. O `GET /usuarios/:id` já usa isso.

---

## Pegadinhas técnicas (não precisam de decisão)

- O mysql2 devolve `DECIMAL(10,2)` como texto: vem `"50.00"` em vez de `50`. Converter com `Number()` no DTO de resposta.
- `horario_inicial` é `TIME` e volta como `"08:00:00"`. O contrato espera `"08:00"`: cortar os segundos.
- Paciente sem dose nenhuma divide por zero na adesão. Devolver `percentual: 0`, igual ao `demo.js`.
