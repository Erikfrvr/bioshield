# Contrato da API do BioShield

Todas as rotas da API, com o formato de cada requisição e de cada resposta. Foi a partir deste contrato que as telas e o backend foram escritos, cada um de um lado, e é ele que diz o que cada campo significa.

A API fica em `/api`, no mesmo endereço e na mesma porta em que o backend entrega as telas, por exemplo `http://localhost:3000/api`.

---

## Como as telas escolhem entre a API e a demonstração

`frontEnd/js/config.js` tem três modos:

| MODO | O que acontece |
|---|---|
| `auto` | Padrão. Procura o servidor. Se achar, usa a API. Se nenhum responder, cai na demonstração e avisa na tela |
| `api` | Sempre a API. Se ela cair, aparece erro na tela |
| `demo` | Sempre a demonstração, mesmo com a API no ar. Serve para gravar vídeo |

O front não tem endereço de API fixo. O `js/api.js` procura o servidor nesta ordem e fica com o primeiro que responder em `GET /api/status`:

1. o endereço que a pessoa salvou no quadro Servidor da tela de entrada (é assim que o app Android acha o servidor)
2. o campo `SERVIDOR` do `config.js`, se estiver preenchido
3. o endereço da própria página, quando as telas são entregues pelo backend
4. `http://localhost:3000`

Quem está logado em uma conta de verdade não cai na demonstração, e a ficha de emergência de quem escaneou o QR nunca mostra dado fictício.

Um `401` em rota protegida apaga a sessão guardada e manda a pessoa de volta para a tela de entrada, com o aviso de que a sessão terminou.

---

## Formato geral

Todo corpo vai e volta em JSON. As rotas protegidas esperam o header:

```
Authorization: Bearer <token>
```

Erro devolve o status HTTP certo e um corpo com uma frase pronta para mostrar na tela:

```json
{ "mensagem": "Email ou senha não conferem." }
```

Datas e horas seguem uma regra só:

- Todo momento exato (`horarioPrevisto`, `horarioConfirmado`, `proximaDose`, `acessadoEm`, `validoAte` e afins) vai e volta em ISO com `Z`, ou seja, em UTC. `"2026-09-18T23:00:00.000Z"` é 20h em Brasília. O front converte para a hora do aparelho na hora de mostrar
- `horarioInicial` (`"08:00"`) e as datas sem hora (`dataInicio`, `dataFim`, como `"2026-09-18"`) são hora e dia de Brasília, e vão como texto, sem conversão
- "Hoje" nas rotas de dose é o dia de Brasília. O backend inteiro trabalha nesse fuso

Status que o front trata de forma diferente:

| Status | Como o front reage |
|---|---|
| 401 no login | Mostra "Email ou senha não conferem" |
| 401 em rota protegida | Token faltando, vencido ou adulterado |
| 403 em rota protegida | Logado, mas pedindo dado de paciente que não é dele |
| 409 no cadastro | Mostra "Esse email já tem conta" |
| 404 na emergência | Tela de código não encontrado |
| 410 na emergência | Tela de código cancelado |
| 404 no vínculo de cuidador | Mostra "Esse código não corresponde a ninguém" |

---

## Para quem criou o banco antes

O `database/bioshield.sql` atual já cria tudo certo. Os comandos abaixo servem só para quem criou o banco numa versão antiga e não quer recriar do zero.

As duas colunas do cancelamento do QR Code:

```sql
ALTER TABLE pacientes
  ADD COLUMN qr_ativo BOOLEAN NOT NULL DEFAULT TRUE AFTER token_gerado_em,
  ADD COLUMN qr_cancelado_em TIMESTAMP NULL AFTER qr_ativo;
```

Por que coluna nova, em vez de apagar o token: o índice único em `token_qr` impede token nulo repetido, e apagar o token destrói o rastro de qual código foi impresso. Marcar como inativo mantém a auditoria e deixa o cancelamento reversível pela geração de um token novo.

As colunas do código do cuidador (`POST /api/pacientes/:id/codigo`):

```sql
ALTER TABLE pacientes
  ADD COLUMN codigo_cuidador CHAR(7) NULL AFTER qr_cancelado_em,
  ADD COLUMN codigo_valido_ate TIMESTAMP NULL AFTER codigo_cuidador,
  ADD CONSTRAINT uk_pacientes_codigo UNIQUE (codigo_cuidador);
```

E o índice da agenda de doses, que virou único para o mesmo remédio nunca ter duas doses no mesmo horário:

```sql
ALTER TABLE doses
  DROP INDEX idx_doses_agenda,
  ADD CONSTRAINT uk_doses_agenda UNIQUE (id_medicamento, horario_previsto);
```


---

## Quem pode ver o quê

O token carrega só o id do usuário. O middleware `autenticar` põe esse id em `req.idUsuario`, e cada service confere o acesso com `services/AutorizacaoService.ts` antes de ler ou gravar:

| Rotas | Quem passa |
|---|---|
| `/pacientes/:id` e tudo abaixo (QR, acessos, código), `/medicamentos` | Só o dono da ficha (`garantirDono`) |
| `/doses/hoje`, `/doses/proximas`, `/doses/:id/confirmar`, `/doses/adesao` | O dono ou um cuidador com vínculo `ativo = TRUE` (`garantirAcompanhamento`) |
| `/usuarios/:id`, `/cuidadores/:id/pacientes` | Só quando `:id` é o próprio usuário logado (`garantirMesmoUsuario`) |

Fora disso a resposta é `403`. Paciente que não existe também devolve `403`, com a mesma mensagem, para que ninguém descubra quais ids existem trocando o número na URL. `404` fica para o recurso da própria rota (remédio ou dose que não existe).

---

## Status

### GET /api/status

Rota pública, sem token. É ela que decide se o front usa a API ou a demonstração.

```json
{ "status": "ok", "urlPublica": "http://192.168.0.10:3000" }
```

`urlPublica` é o endereço pelo qual os outros aparelhos da rede enxergam o servidor. O front usa esse valor para montar o QR Code quando chegou ao servidor por `localhost`, assim o código nunca sai apontando para um endereço que só abre no próprio computador. Vem do `URL_PUBLICA` do `.env` ou, sem ele, do IP da placa de rede. Vem `null` quando o computador não está em rede nenhuma.

Caminho de API que não existe devolve `404` com `{ "mensagem": "Rota não encontrada." }`.

---

## Usuários

### POST /api/usuarios

Cadastro. Público.

```json
{ "nome": "Maria Aparecida Souza", "email": "maria@exemplo.com", "senha": "123456" }
```

Resposta `201`:

```json
{ "id": 1, "nome": "Maria Aparecida Souza", "email": "maria@exemplo.com" }
```

Email repetido devolve `409`. A senha nunca volta, nem como hash.

### POST /api/usuarios/login

Público.

```json
{ "email": "maria@exemplo.com", "senha": "123456" }
```

Resposta `200`:

```json
{
  "token": "eyJhbGciOi...",
  "usuario": { "id": 1, "nome": "Maria Aparecida Souza", "email": "maria@exemplo.com" },
  "idPaciente": 1
}
```

**O campo `idPaciente` é obrigatório.** Ele é o que evita uma rota extra só para descobrir a ficha do usuário logado. Quando a pessoa ainda não preencheu a ficha, mande `null`, e o front mostra a tela de criar ficha.

Credencial errada devolve `401`.

---

## Ficha médica

### GET /api/pacientes/:id

Protegida. `:id` é o id do paciente.

```json
{
  "id": 1,
  "idUsuario": 1,
  "nome": "Maria Aparecida Souza",
  "tipoSanguineo": "O+",
  "condicoes": "Hipertensão e diabetes tipo 2",
  "observacoes": "Usa aparelho auditivo no ouvido direito. Mora sozinha.",
  "tokenQr": "a3f81c2d94be47a0b6e15d7c0f29b834",
  "qrAtivo": true,
  "tokenGeradoEm": "2026-08-19T13:00:00.000Z",
  "qrCanceladoEm": null,
  "atualizadoEm": "2026-09-16T22:20:00.000Z",
  "alergias": [
    { "id": 1, "substancia": "Dipirona", "gravidade": "grave", "observacao": "Inchaço no rosto e falta de ar" }
  ],
  "contatos": [
    { "id": 1, "nome": "Patrícia Souza Martins", "telefone": "11987654321", "parentesco": "Filha", "prioridade": 1 }
  ]
}
```

O `nome` vem da tabela `usuarios`, por join. `gravidade` só aceita `leve`, `moderada` ou `grave`. `telefone` vai e volta só com dígitos, sem máscara: quem formata é a tela.

### POST /api/pacientes

Protegida. Cria a ficha e gera o primeiro `tokenQr`.

```json
{
  "idUsuario": 1,
  "tipoSanguineo": "O+",
  "condicoes": "Hipertensão",
  "observacoes": "Mora sozinha.",
  "alergias": [{ "substancia": "Dipirona", "gravidade": "grave", "observacao": "Falta de ar" }],
  "contatos": [{ "nome": "Patrícia", "telefone": "11987654321", "parentesco": "Filha", "prioridade": 1 }]
}
```

Devolve a mesma estrutura do `GET`, já com `tokenQr` e `qrAtivo: true`.

### PUT /api/pacientes/:id

Protegida. Recebe o mesmo corpo do `POST` e devolve a ficha inteira atualizada.

As listas são substituição completa, não diferença: o front manda o estado final das alergias e dos contatos. Do lado do backend isso vira apagar as linhas do paciente e inserir de novo, dentro de uma transação.

---

## QR Code

### POST /api/pacientes/:id/qr/rotacionar

Protegida. Gera um `token_qr` novo, atualiza `token_gerado_em` e marca `qr_ativo = TRUE`. O token anterior deixa de existir e para de funcionar na mesma hora.

```json
{ "tokenQr": "novo32caracteres...", "tokenGeradoEm": "2026-09-18T10:00:00.000Z", "qrAtivo": true, "qrCanceladoEm": null }
```

### DELETE /api/pacientes/:id/qr

Protegida. **É o cancelamento**, para o caso de perder o chaveiro, a pulseira ou a carteira. Marca `qr_ativo = FALSE` e grava `qr_cancelado_em`. Não apaga o token e não apaga a ficha.

```json
{ "qrAtivo": false, "qrCanceladoEm": "2026-09-18T10:05:00.000Z" }
```

A partir daí, `GET /api/emergencia/:token` com esse token devolve `410`.

### POST /api/pacientes/:id/qr/reativar

Protegida. Gera um token novo e volta `qr_ativo = TRUE`. Mesma resposta da rotação.

Reativar **não** ressuscita o código antigo: o token é sempre novo. Se o chaveiro perdido voltasse a funcionar, o cancelamento não teria servido para nada.

### GET /api/pacientes/:id/acessos

Protegida. Histórico da LGPD, o que responde "quem andou olhando a minha ficha".

```json
[
  { "id": 2, "acessadoEm": "2026-09-18T07:10:00.000Z", "ip": "200.147.35.12", "userAgent": "Mozilla/5.0 (iPhone; iOS 17)" }
]
```

Mais recente primeiro.

### POST /api/pacientes/:id/codigo

Protegida, só o dono. Gera o código de autorização que o paciente entrega ao cuidador: 7 caracteres, letras e números, com validade. Grava em `pacientes.codigo_cuidador` e `pacientes.codigo_valido_ate`. Gerar de novo substitui o código anterior.

```json
{ "codigo": "MARIA24", "validoAte": "2026-09-19T10:00:00.000Z" }
```

---

## Emergência

### GET /api/emergencia/:token

**Pública. É a única rota sem autenticação**, porque quem escaneia é um estranho socorrendo a pessoa.

Resposta `200`:

```json
{
  "nome": "Maria Aparecida Souza",
  "tipoSanguineo": "O+",
  "condicoes": "Hipertensão e diabetes tipo 2",
  "observacoes": "Usa aparelho auditivo no ouvido direito.",
  "atualizadoEm": "2026-09-16T22:20:00.000Z",
  "alergias": [
    { "substancia": "Dipirona", "gravidade": "grave", "observacao": "Inchaço no rosto e falta de ar" }
  ],
  "medicamentos": [
    { "nome": "Losartana", "dosagem": 50, "unidade": "mg", "frequenciaHoras": 12 }
  ],
  "contatos": [
    { "nome": "Patrícia Souza Martins", "telefone": "11987654321", "parentesco": "Filha" }
  ]
}
```

Como esta rota se comporta:

1. **As alergias vêm em ordem de gravidade**, grave primeiro. A tela mostra na ordem em que recebe.
2. **Só vêm os remédios em uso hoje:** ativos, já começados e ainda não encerrados (`ativo = TRUE`, `data_inicio` até hoje e `data_fim` nulo ou de hoje em diante). Remédio suspenso, encerrado ou que ainda vai começar só atrapalharia quem está socorrendo.
3. **Os contatos vêm em ordem de `prioridade`.**
4. **Nunca vêm `id`, `email`, `senha`, `idUsuario` ou `tokenQr`.** O `FichaEmergenciaResponseDTO` é o filtro de privacidade: se um campo não está escrito nele, não sai.
5. **Toda leitura é registrada** em `acessos_qr`, com ip e navegador, antes da resposta. Leitura de QR cancelado também.
6. **O corpo da resposta nunca vai para o log** do servidor, porque é dado de saúde.

Token inexistente devolve `404`. Token com `qr_ativo = FALSE` devolve `410`, com um corpo enxuto:

```json
{ "mensagem": "Este QR Code foi cancelado pelo titular." }
```

O front tem uma tela diferente para cada um dos dois casos.

---

## Medicamentos

### GET /api/medicamentos?idPaciente=1

Protegida.

```json
[
  {
    "id": 1, "idPaciente": 1, "nome": "Losartana",
    "dosagem": 50, "unidade": "mg", "frequenciaHoras": 12,
    "horarioInicial": "08:00", "dataInicio": "2026-08-19", "dataFim": null,
    "ativo": true, "proximaDose": "2026-09-18T23:00:00.000Z"
  }
]
```

`proximaDose` é a primeira dose com status `prevista` e horário no futuro. Pode vir `null`.

`ativo` vem `false` em dois casos: remédio suspenso (alguém mandou parar) ou tratamento encerrado (o `dataFim` já passou). Remédio que ainda vai começar vem `true`.

### POST /api/medicamentos

Protegida. Cadastra o remédio **e gera a agenda de doses** a partir do horário inicial e do intervalo.

A agenda é gerada para os próximos **7 dias**, ou até o `dataFim`, o que vier antes, e só de agora para a frente. Os dias seguintes são completados pelo backend antes de cada leitura de dose (`/doses/hoje`, `/doses/proximas`, `/doses/adesao`, `GET /medicamentos` e a lista do cuidador), então o front não precisa pedir nada.

```json
{
  "idPaciente": 1, "nome": "Losartana", "dosagem": 50, "unidade": "mg",
  "frequenciaHoras": 12, "horarioInicial": "08:00",
  "dataInicio": "2026-09-18", "dataFim": null
}
```

Devolve o remédio criado no mesmo formato do `GET`.

### PUT /api/medicamentos/:id

Protegida. Campos opcionais, atualização parcial. Devolve o remédio no mesmo formato do `GET`.

Além dos campos do `POST` (menos `idPaciente`, remédio não troca de dono), aceita `ativo`: `false` suspende o remédio e `true` reativa. Suspender guarda o histórico de doses, diferente do `DELETE`.

Quando muda `horarioInicial`, `frequenciaHoras`, `dataInicio`, `dataFim` ou `ativo`, a agenda futura é refeita: as doses `prevista` com horário no futuro são apagadas e geradas de novo com os dados novos. As `tomada` e `perdida` ficam, porque são histórico. Mudar só `nome`, `dosagem` ou `unidade` não mexe na agenda.

### DELETE /api/medicamentos/:id

Protegida. O `ON DELETE CASCADE` leva as doses junto, e o front avisa disso antes de chamar.

---

## Doses

### GET /api/doses/hoje?idPaciente=1

Protegida. Só as doses de hoje, ordenadas por horário.

```json
[
  {
    "id": 7, "idMedicamento": 1, "nomeMedicamento": "Losartana",
    "dosagem": 50, "unidade": "mg",
    "horarioPrevisto": "2026-09-18T11:00:00.000Z",
    "horarioConfirmado": "2026-09-18T11:03:00.000Z",
    "status": "tomada"
  }
]
```

`status` é `prevista`, `tomada` ou `perdida`.

Ninguém marca dose como `perdida` na mão e não existe rotina rodando de tempo em tempo. A troca acontece na leitura: antes de responder esta rota, a de próximas doses e a de adesão, o backend passa para `perdida` toda dose `prevista` do paciente que já passou **60 minutos** do horário sem confirmação. Por isso a dose das 8h aparece como `prevista` até as 9h e como `perdida` depois disso.

### GET /api/doses/proximas?idPaciente=1

Protegida. O dono ou um cuidador com vínculo ativo, igual ao `/doses/hoje`. É a agenda do **alarme dos remédios**: o app usa essa lista para agendar os avisos no próprio celular (`frontEnd/js/lembretes.js`).

Mesmo formato do `/doses/hoje`, com três diferenças:

- só doses com `status` `prevista` (tomada e perdida não têm mais o que lembrar)
- a janela vai de **60 minutos atrás** (a dose atrasada dentro da tolerância ainda pode ser confirmada e ainda merece lembrete) até **2 dias para a frente** (`DIAS_DE_LEMBRETE` no `DoseService`)
- ordenadas por horário, sem limite de dia do calendário

```json
[
  {
    "id": 9, "idMedicamento": 1, "nomeMedicamento": "Losartana",
    "dosagem": 50, "unidade": "mg",
    "horarioPrevisto": "2026-09-18T23:00:00.000Z",
    "horarioConfirmado": null,
    "status": "prevista"
  }
]
```

Antes de responder, o backend completa a agenda e aplica a tolerância, como nas outras leituras de dose. Remédio suspenso ou encerrado não aparece.

No modo demonstração, o `demo.js` responde a mesma lista com os dados fictícios, e também completa a agenda até 2 dias para a frente.

### POST /api/doses/:id/confirmar

Protegida. O front manda a hora real da confirmação:

```json
{ "horarioConfirmado": "2026-09-18T11:03:00.000Z" }
```

Resposta:

```json
{ "id": 7, "status": "tomada", "horarioConfirmado": "2026-09-18T11:03:00.000Z" }
```

Dose com status `perdida` também pode ser confirmada: é o botão "Tomei mesmo assim" da tela de doses.

Confirmar adiantado tem limite: o backend aceita a partir de **60 minutos antes** do horário previsto. Mais cedo que isso devolve `400` com a mensagem "Ainda é cedo para confirmar essa dose. Dá para confirmar a partir de 1 hora antes do horário.". Quem decide se está cedo é o relógio do servidor, não o `horarioConfirmado` que veio no corpo. A tela de doses segue a mesma regra e só mostra o botão quando a dose já pode ser confirmada.

Dose que já está `tomada` não pode ser confirmada de novo: `400`.

### GET /api/doses/adesao?idPaciente=1

Protegida.

```json
{
  "hoje":   { "previstas": 4, "tomadas": 3, "perdidas": 1, "percentual": 75 },
  "semana": { "previstas": 40, "tomadas": 36, "perdidas": 4, "percentual": 90 }
}
```

`percentual` é inteiro, já arredondado, de 0 a 100. `semana` são os últimos 7 dias até agora, não a semana do calendário. Dose no futuro não entra na conta, senão a adesão começa o dia em 0% e assusta o usuário à toa.

Como a conta é feita, nas duas janelas:

- `previstas` é o total de doses com horário previsto **até agora**, seja qual for o status. Não é a quantidade de doses com status `prevista`
- `tomadas` e `perdidas` saem dessas mesmas doses
- `percentual` é `tomadas / previstas`, arredondado. Janela sem nenhuma dose devolve `percentual: 0`
- No exemplo, o paciente tem 6 doses hoje, mas só 4 já chegaram no horário: 3 de 4 dá 75%. As outras 2 entram na conta quando a hora delas chegar
- Dose confirmada adiantado (dentro dos 60 minutos) também só entra na conta quando o horário previsto dela chega. Assim `tomadas` nunca passa de `previstas`
- Dose atrasada há menos de 60 minutos ainda está `prevista`: ela já conta em `previstas`, mas não em `perdidas`. Então `tomadas + perdidas` pode ser menor que `previstas`

---

## Cuidador

### POST /api/cuidadores/vincular

Protegida.

```json
{ "idCuidador": 4, "codigo": "MARIA24" }
```

Resposta:

```json
{ "idVinculo": 1, "idPaciente": 1 }
```

O cuidador é sempre quem está logado (`req.idUsuario`). O `idCuidador` do corpo continua sendo enviado pelo front, mas o backend ignora, senão daria para vincular a conta de outra pessoa.

Código que não bate com ninguém, ou que já passou do `codigo_valido_ate`, devolve `404`. O vínculo só nasce a partir do código que o paciente gerou: é essa a autorização explícita.

### GET /api/cuidadores/:id/pacientes

Protegida. `:id` é o id do usuário cuidador e precisa ser o do usuário logado, senão `403`.

```json
[
  {
    "idVinculo": 1,
    "idPaciente": 1,
    "nome": "Maria Aparecida Souza",
    "adesaoSemana": 86,
    "dosesPerdidas": 4,
    "proximaDose": { "nomeMedicamento": "Losartana", "horarioPrevisto": "2026-09-18T23:00:00.000Z" }
  }
]
```

`proximaDose` pode vir `null`. Só vínculos com `ativo = TRUE`.

O cuidador vê acompanhamento de dose. Ele **não** recebe a ficha médica nem o histórico de acessos de quem acompanha.

### DELETE /api/cuidadores/vinculo/:id

Protegida. Pode ser chamada pelo próprio cuidador ou pelo dono da ficha. Marca `ativo = FALSE` e responde `204`. A linha não é apagada, porque quem teve acesso a dado de saúde precisa ficar registrado.

---

## Telas e as rotas que cada uma usa

| Arquivo | O que faz | Rotas que usa |
|---|---|---|
| `index.html` | Login | `POST /usuarios/login` |
| `pages/cadastro.html` | Criar conta | `POST /usuarios`, `POST /usuarios/login` |
| `pages/perfil.html` | Ficha médica, QR Code, cancelamento, acessos, código do cuidador | `GET/POST/PUT /pacientes`, as três rotas de QR, `/acessos`, `/codigo` |
| `pages/imprimir.html` | Folha A4 com as etiquetas | `GET /pacientes/:id` |
| `pages/medicamentos.html` | Lista e cadastro de remédios | `GET/POST/DELETE /medicamentos` |
| `pages/doses.html` | Agenda do dia, adesão e cartão do alarme | `GET /doses/hoje`, `POST /doses/:id/confirmar`, `GET /doses/adesao`, `GET /doses/proximas` |
| `pages/cuidador.html` | Painel do cuidador | `POST /cuidadores/vincular`, `GET /cuidadores/:id/pacientes`, `DELETE /cuidadores/vinculo/:id` |
| `pages/emergencia.html` | Ficha pública do QR | `GET /emergencia/:token` |

Arquivos de apoio em `frontEnd/js/`:

| Arquivo | O que é |
|---|---|
| `config.js` | Modo (auto, api, demo), tempo limite e, se precisar travar, o endereço do servidor |
| `api.js` | Todas as chamadas em um lugar só |
| `ui.js` | Guarda de sessão, navegação, recados e formatação |
| `qrcode.js` | Gerador de QR Code próprio, sem CDN |
| `demo.js` | Dados fictícios do modo demonstração |
| `lembretes.js` | Alarme dos remédios: agenda os avisos no celular, janela de alarme com som e o cartão da tela de doses. Usa `GET /doses/proximas` e `POST /doses/:id/confirmar`. Detalhes em `docs/GUIA_APK.md` |
