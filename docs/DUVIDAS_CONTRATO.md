# Dúvidas sobre o CONTRATO_API.md

Anotadas pela Daiane na leitura do `frontEnd/CONTRATO_API.md`, comparando com o `database/bioshield.sql` e o front.
Cada item tem uma proposta. Onde estiver **Decisão**, preencham juntos e depois atualizem o contrato.

As que travam código: **1, 2, 3 e 8**. Resolver antes de começar as Fases 7 e 8.

---

## Medicamentos e doses (fatia da Daiane)

### 1. O cálculo de adesão se contradiz

O contrato diz que dose no futuro não entra na conta, mas o exemplo conta:

- `hoje`: 6 previstas, 4 tomadas, 0 perdidas, 67%. Sobram 2 doses que ainda não chegaram, e 4/6 = 67%, então elas entraram na conta.
- `semana`: 36/42 = 86%, mas 36 + 4 = 40, então também tem 2 futuras nas 42.
- `frontEnd/js/demo.js`, função `contar`, faz `tomadas / lista.length` com a lista inteira.

**Proposta:** seguir a regra escrita. `previstas` e `percentual` contam só dose com `horario_previsto <= NOW()`. Corrigir o exemplo do contrato e o `contar` do `demo.js`.

**Decisão:**

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

**Decisão:**

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

**Decisão:**

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

**Decisão:**

### 9. Quem pode ver os dados de qual paciente

O JWT carrega só o id do usuário. Em `GET /api/medicamentos?idPaciente=1`, se ninguém conferir, qualquer usuário logado lê o remédio de qualquer paciente trocando o número. O mesmo vale para doses, ficha, acessos e QR.

**Proposta:** uma função única, usada por todos os services, que libera quando o paciente é do usuário logado ou quando existe vínculo `ativo = TRUE` em `cuidador_paciente`. Cuidador só passa nas rotas de dose e adesão. Negar com `403`.

**Decisão:** onde fica (middleware ou service) e quem escreve:

---

## Pegadinhas técnicas (não precisam de decisão)

- O mysql2 devolve `DECIMAL(10,2)` como texto: vem `"50.00"` em vez de `50`. Converter com `Number()` no DTO de resposta.
- `horario_inicial` é `TIME` e volta como `"08:00:00"`. O contrato espera `"08:00"`: cortar os segundos.
- Paciente sem dose nenhuma divide por zero na adesão. Devolver `percentual: 0`, igual ao `demo.js`.
