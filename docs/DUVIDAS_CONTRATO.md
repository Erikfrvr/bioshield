# Dúvidas sobre o CONTRATO_API.md

Anotadas pela Daiane na leitura do `frontEnd/CONTRATO_API.md`, comparando com o `database/bioshield.sql` e o front.
Cada item tem uma proposta. Onde estiver **Decisão**, preencham juntos e depois atualizem o contrato.

As que travam código: **1, 2, 3 e 8**. Resolver antes de começar as Fases 7 e 8.

Situação: **1, 2, 7, 8 e 9 decididas**. Faltam 3, 4, 5 e 6.

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
- Na tela de doses, antes da primeira dose do dia não existe conta para mostrar. Em vez de `0%` aparece um traço e o texto "Nenhuma dose até agora"

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

**Decisão:**

---

## Regras que o contrato não cobre

### 4. Fuso horário

O `horarioInicial` chega como `"08:00"` (hora local), o `proximaDose` sai em UTC (`"2026-09-18T23:00:00.000Z"`, 20:00 em Brasília) e `doses.horario_previsto` é `DATETIME`, que não guarda fuso. Se servidor e MySQL estiverem em fusos diferentes, a dose das 22h cai no dia seguinte em `GET /doses/hoje`.

**Proposta:** fixar `America/Sao_Paulo` no pool do mysql2 (`timezone`) e no Node, gravar hora local e converter para ISO só no DTO. Isso vale também para os `TIMESTAMP` da Fase 6.

**Decisão:**

### 5. PUT de medicamento que muda horário ou frequência

A agenda futura precisa acompanhar.

**Proposta:** dentro de uma transação, apagar as doses `prevista` com horário no futuro e gerar de novo. As `tomada` e `perdida` ficam, porque são histórico.

**Decisão:**

### 6. Quando `medicamentos.ativo` vira FALSE

A coluna existe e a emergência filtra por ela, mas nenhuma rota muda esse valor. O `DELETE` apaga a linha de verdade.

**Proposta:** tratar como inativo quando `data_fim < CURDATE()`, direto na consulta da emergência (`ativo = TRUE AND (data_fim IS NULL OR data_fim >= CURDATE())`).

**Decisão:**

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
