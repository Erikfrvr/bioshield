# Contrato da API do BioShield

Este documento é o combinado entre o front e o backend. O front já foi escrito contra tudo que está aqui, então toda rota desta lista existe do lado de cá esperando resposta.

Enquanto o backend não sobe, o front roda em modo demonstração. Assim que a API responder em `GET /api/status`, ele passa a usar a API sozinho.

Base: `http://localhost:3000/api` (configurável em `frontEnd/js/config.js`).

---

## Como o front escolhe entre API e demonstração

`frontEnd/js/config.js` tem três modos:

| MODO | O que acontece |
|---|---|
| `auto` | Padrão. Chama `GET /api/status` uma vez. Se responder, usa a API. Se não, cai na demonstração e mostra uma faixa amarela avisando |
| `api` | Sempre a API. Se ela cair, aparece erro na tela |
| `demo` | Sempre a demonstração, mesmo com a API no ar. Serve para gravar vídeo |

Se mudar a porta ou publicar o backend, o único arquivo a mexer é o `config.js`.

---

## Formato geral

Todo corpo vai e volta em JSON. As rotas protegidas esperam o header:

```
Authorization: Bearer <token>
```

Erro devolve o status HTTP certo e um corpo com uma frase explicando. O front lê qualquer um destes campos, então escolham um e sigam:

```json
{ "mensagem": "Email ou senha não conferem." }
```

Status que o front trata de forma diferente:

| Status | Como o front reage |
|---|---|
| 401 no login | Mostra "Email ou senha não conferem" |
| 409 no cadastro | Mostra "Esse email já tem conta" |
| 404 na emergência | Tela de código não encontrado |
| 410 na emergência | Tela de código cancelado |
| 404 no vínculo de cuidador | Mostra "Esse código não corresponde a ninguém" |

---

## Mudança necessária no banco

O cancelamento do QR Code precisa de duas colunas que ainda não existem em `pacientes`:

```sql
ALTER TABLE pacientes
  ADD COLUMN qr_ativo BOOLEAN NOT NULL DEFAULT TRUE AFTER token_gerado_em,
  ADD COLUMN qr_cancelado_em TIMESTAMP NULL AFTER qr_ativo;
```

O `DICIONARIO_DADOS.md` precisa ganhar essas duas linhas também.

Por que coluna nova e não apagar o token: o índice único em `token_qr` impede token nulo repetido, e apagar o token destrói o rastro de qual código foi impresso. Marcar como inativo mantém a auditoria e deixa o cancelamento reversível pela geração de um token novo.

---

## Status

### GET /api/status

Rota pública, sem token. É ela que decide se o front usa a API ou a demonstração.

```json
{ "status": "ok" }
```

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

Atenção: reativar **não** é ressuscitar o código antigo. Se o chaveiro perdido voltasse a funcionar, o cancelamento não teria servido para nada. Gere token novo sempre.

### GET /api/pacientes/:id/acessos

Protegida. Histórico da LGPD, o que responde "quem andou olhando a minha ficha".

```json
[
  { "id": 2, "acessadoEm": "2026-09-18T07:10:00.000Z", "ip": "200.147.35.12", "userAgent": "Mozilla/5.0 (iPhone; iOS 17)" }
]
```

Mais recente primeiro.

### POST /api/pacientes/:id/codigo

Protegida. Gera o código de autorização que o paciente entrega ao cuidador. Sugestão: 7 caracteres, letras e números, com validade.

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

Regras desta rota, que valem mais que a pressa de entregar:

1. **Ordene as alergias por gravidade**, grave primeiro. O front confia nessa ordem e mostra na ordem que vier.
2. **Só medicamentos com `ativo = TRUE`.** Remédio encerrado no meio da lista atrapalha quem está socorrendo.
3. **Ordene os contatos por `prioridade`.**
4. **Nada de `id`, `email`, `senha`, `idUsuario` ou `tokenQr` na resposta.** Este DTO é o filtro de privacidade: se um campo não está escrito aqui, ele não sai.
5. **Registre o acesso** em `acessos_qr` com ip e user agent antes de responder.
6. **Não logue o corpo da resposta** no console. É dado de saúde.

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

### POST /api/medicamentos

Protegida. Cadastra o remédio **e gera a agenda de doses** a partir do horário inicial e do intervalo.

```json
{
  "idPaciente": 1, "nome": "Losartana", "dosagem": 50, "unidade": "mg",
  "frequenciaHoras": 12, "horarioInicial": "08:00",
  "dataInicio": "2026-09-18", "dataFim": null
}
```

Devolve o remédio criado no mesmo formato do `GET`.

### PUT /api/medicamentos/:id

Protegida. Campos opcionais, atualização parcial.

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

### POST /api/doses/:id/confirmar

Protegida. O front manda a hora real da confirmação:

```json
{ "horarioConfirmado": "2026-09-18T11:03:00.000Z" }
```

Resposta:

```json
{ "id": 7, "status": "tomada", "horarioConfirmado": "2026-09-18T11:03:00.000Z" }
```

O front permite confirmar dose com status `perdida` também, com o botão "Tomei mesmo assim". Não bloqueie isso no backend.

### GET /api/doses/adesao?idPaciente=1

Protegida.

```json
{
  "hoje":   { "previstas": 6, "tomadas": 4, "perdidas": 0, "percentual": 67 },
  "semana": { "previstas": 42, "tomadas": 36, "perdidas": 4, "percentual": 86 }
}
```

`percentual` é inteiro, já arredondado, de 0 a 100. `semana` são os últimos 7 dias até agora, não a semana do calendário. Dose no futuro não entra na conta, senão a adesão começa o dia em 0% e assusta o usuário à toa.

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

Código que não bate com ninguém devolve `404`. O vínculo só nasce a partir do código que o paciente gerou: é essa a autorização explícita.

### GET /api/cuidadores/:id/pacientes

Protegida. `:id` é o id do usuário cuidador.

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

Protegida. Marca `ativo = FALSE`. Não apague a linha: quem teve acesso a dado de saúde precisa ficar registrado.

---

## Ordem sugerida de implementação

O front foi escrito para degradar bem. Cada rota que vocês entregam já acende uma parte da tela, e o resto continua na demonstração. A ordem que libera mais valor por hora de trabalho:

1. `GET /api/status` (uma linha, e é ela que faz o front trocar de modo)
2. `POST /api/usuarios` e `POST /api/usuarios/login`
3. `GET` e `POST /api/pacientes`
4. `GET /api/emergencia/:token` com o `410`
5. `POST /api/pacientes/:id/qr/rotacionar` e `DELETE /api/pacientes/:id/qr`
6. Medicamentos
7. Doses e adesão
8. Cuidador

Depois do passo 4 vocês já conseguem escanear o QR com o celular e ver a ficha abrir de verdade, que é o marco 6 do roadmap e o coração da demonstração.

---

## Mapa das telas do front

| Arquivo | O que faz | Rotas que usa |
|---|---|---|
| `index.html` | Login | `POST /usuarios/login` |
| `pages/cadastro.html` | Criar conta | `POST /usuarios`, `POST /usuarios/login` |
| `pages/perfil.html` | Ficha médica, QR Code, cancelamento, acessos, código do cuidador | `GET/POST/PUT /pacientes`, as três rotas de QR, `/acessos`, `/codigo` |
| `pages/imprimir.html` | Folha A4 com as etiquetas | `GET /pacientes/:id` |
| `pages/medicamentos.html` | Lista e cadastro de remédios | `GET/POST/DELETE /medicamentos` |
| `pages/doses.html` | Agenda do dia e adesão | `GET /doses/hoje`, `POST /doses/:id/confirmar`, `GET /doses/adesao` |
| `pages/cuidador.html` | Painel do cuidador | `POST /cuidadores/vincular`, `GET /cuidadores/:id/pacientes`, `DELETE /cuidadores/vinculo/:id` |
| `pages/emergencia.html` | Ficha pública do QR | `GET /emergencia/:token` |

Arquivos de apoio em `frontEnd/js/`:

| Arquivo | O que é |
|---|---|
| `config.js` | URL da API e escolha do modo |
| `api.js` | Todas as chamadas em um lugar só |
| `ui.js` | Guarda de sessão, navegação, recados e formatação |
| `qrcode.js` | Gerador de QR Code próprio, sem CDN |
| `demo.js` | Dados fictícios do modo demonstração |
