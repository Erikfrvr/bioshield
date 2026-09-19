# Dicionário de Dados — BioShield

Banco: `bioshield` | SGBD: MySQL 8 | Charset: `utf8mb4` | Collation: `utf8mb4_general_ci`

Documento de referência do schema. Antes de criar ou alterar qualquer tabela, atualize aqui.

---

## Visão geral

| Tabela | O que guarda | Depende de |
|---|---|---|
| `usuarios` | Contas de acesso ao app | — |
| `pacientes` | Ficha médica ligada a uma conta | `usuarios` |
| `alergias` | Alergias do paciente | `pacientes` |
| `contatos_emergencia` | Quem avisar numa emergência | `pacientes` |
| `medicamentos` | Remédios em uso | `pacientes` |
| `doses` | Cada tomada prevista de um remédio | `medicamentos` |
| `cuidador_paciente` | Vínculo autorizado entre cuidador e paciente | `usuarios`, `pacientes` |
| `acessos_qr` | Log de quem abriu a ficha pública | `pacientes` |

Relacionamentos:

```
usuarios 1 ─── 1 pacientes 1 ─── N alergias
                         1 ─── N contatos_emergencia
                         1 ─── N medicamentos 1 ─── N doses
                         1 ─── N acessos_qr
usuarios N ─── N pacientes  (via cuidador_paciente)
```

---

## usuarios

Conta de acesso. Vale tanto para o paciente quanto para o cuidador: o que diferencia os dois é ter ficha médica e ter vínculo, não um campo de tipo.

| Campo | Tipo | Nulo | Padrão | Descrição |
|---|---|---|---|---|
| `id` | BIGINT | Não | AUTO_INCREMENT | Chave primária |
| `nome` | VARCHAR(80) | Não | — | Nome completo |
| `email` | VARCHAR(120) | Não | — | Login. Único, gravado em minúsculo |
| `senha` | VARCHAR(255) | Não | — | Hash bcrypt. Nunca texto puro |
| `criado_em` | TIMESTAMP | Não | CURRENT_TIMESTAMP | Data do cadastro |

Chaves: PK `id` | UNIQUE `email`

Regras: o hash do bcrypt ocupa 60 caracteres, o campo tem 255 de folga para caso o algoritmo mude. Email passa pelo value object `Email` antes de chegar aqui.

---

## pacientes

A ficha médica. É o centro do banco: quase tudo aponta para cá.

| Campo | Tipo | Nulo | Padrão | Descrição |
|---|---|---|---|---|
| `id` | BIGINT | Não | AUTO_INCREMENT | Chave primária |
| `id_usuario` | BIGINT | Não | — | Dono da ficha. Único: uma ficha por conta |
| `tipo_sanguineo` | ENUM | Sim | NULL | `A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-` |
| `condicoes` | TEXT | Sim | NULL | Condições de saúde (epilepsia, diabetes, hipertensão) |
| `observacoes` | TEXT | Sim | NULL | Texto livre para o socorrista |
| `token_qr` | CHAR(32) | Não | — | Código do QR. Único e aleatório |
| `token_gerado_em` | TIMESTAMP | Não | CURRENT_TIMESTAMP | Quando o token atual foi criado |
| `criado_em` | TIMESTAMP | Não | CURRENT_TIMESTAMP | Criação da ficha |
| `atualizado_em` | TIMESTAMP | Não | ON UPDATE CURRENT_TIMESTAMP | Última alteração |

Chaves: PK `id` | UNIQUE `id_usuario` | UNIQUE `token_qr` | FK `id_usuario` → `usuarios(id)` ON DELETE CASCADE

Regras: `tipo_sanguineo` aceita nulo porque muita gente não sabe o próprio tipo, e obrigar isso trava o cadastro. Rotacionar o QR significa gerar um `token_qr` novo e atualizar `token_gerado_em`: o anterior deixa de existir e para de funcionar na hora.

---

## alergias

Tabela separada porque um paciente pode ter várias e elas aparecem em destaque na ficha de emergência.

| Campo | Tipo | Nulo | Padrão | Descrição |
|---|---|---|---|---|
| `id` | BIGINT | Não | AUTO_INCREMENT | Chave primária |
| `id_paciente` | BIGINT | Não | — | Dono da alergia |
| `substancia` | VARCHAR(100) | Não | — | Nome da substância (dipirona, penicilina) |
| `gravidade` | ENUM | Não | `moderada` | `leve`, `moderada`, `grave` |
| `observacao` | VARCHAR(200) | Sim | NULL | Reação que costuma ter |

Chaves: PK `id` | FK `id_paciente` → `pacientes(id)` ON DELETE CASCADE | INDEX `id_paciente`

Regras: alergia com gravidade `grave` sempre vai no topo da ficha de emergência, em vermelho.

---

## contatos_emergencia

| Campo | Tipo | Nulo | Padrão | Descrição |
|---|---|---|---|---|
| `id` | BIGINT | Não | AUTO_INCREMENT | Chave primária |
| `id_paciente` | BIGINT | Não | — | Dono do contato |
| `nome` | VARCHAR(80) | Não | — | Nome de quem ligar |
| `telefone` | VARCHAR(11) | Não | — | Só dígitos, DDD junto, sem máscara |
| `parentesco` | VARCHAR(40) | Sim | NULL | Filha, esposo, vizinho |
| `prioridade` | TINYINT | Não | 1 | Ordem de quem ligar primeiro |

Chaves: PK `id` | FK `id_paciente` → `pacientes(id)` ON DELETE CASCADE | INDEX `id_paciente`

Regras: telefone entra sem máscara e a formatação acontece na tela. O value object `Telefone` valida DDD e tamanho antes de gravar.

---

## medicamentos

| Campo | Tipo | Nulo | Padrão | Descrição |
|---|---|---|---|---|
| `id` | BIGINT | Não | AUTO_INCREMENT | Chave primária |
| `id_paciente` | BIGINT | Não | — | Quem toma |
| `nome` | VARCHAR(100) | Não | — | Nome do remédio |
| `dosagem` | DECIMAL(10,2) | Não | — | Quantidade por tomada. Sempre maior que zero |
| `unidade` | ENUM | Não | `mg` | `mg`, `ml`, `g`, `gota`, `comprimido`, `unidade` |
| `frequencia_horas` | SMALLINT | Não | — | Intervalo entre doses, de 1 a 168 |
| `horario_inicial` | TIME | Não | — | Hora da primeira dose do dia |
| `data_inicio` | DATE | Não | — | Começo do tratamento |
| `data_fim` | DATE | Sim | NULL | Fim. Nulo significa uso contínuo |
| `ativo` | BOOLEAN | Não | TRUE | Falso quando o usuário suspende sem apagar |
| `criado_em` | TIMESTAMP | Não | CURRENT_TIMESTAMP | Cadastro |

Chaves: PK `id` | FK `id_paciente` → `pacientes(id)` ON DELETE CASCADE | INDEX `id_paciente`

Regras: `dosagem` e `unidade` separados permitem comparar e somar depois. Guardar tudo como texto ("500mg") impede qualquer cálculo. `ativo` existe porque apagar remédio destrói o histórico de doses junto, e esse histórico é a adesão.

---

## doses

Cada linha é uma tomada específica. A agenda é gerada quando o medicamento é cadastrado.

| Campo | Tipo | Nulo | Padrão | Descrição |
|---|---|---|---|---|
| `id` | BIGINT | Não | AUTO_INCREMENT | Chave primária |
| `id_medicamento` | BIGINT | Não | — | Remédio da dose |
| `horario_previsto` | DATETIME | Não | — | Quando deveria ser tomada |
| `horario_confirmado` | DATETIME | Sim | NULL | Quando foi confirmada de fato |
| `status` | ENUM | Não | `prevista` | `prevista`, `tomada`, `perdida` |

Chaves: PK `id` | FK `id_medicamento` → `medicamentos(id)` ON DELETE CASCADE | INDEX `id_medicamento, horario_previsto`

Regras: guardar o horário previsto e o confirmado separados é o que permite saber se a pessoa tomou no horário ou atrasou duas horas. A dose só vira `perdida` depois da janela de tolerância definida no `DoseService`, nunca no minuto seguinte. Adesão é a contagem de `tomada` dividida pelo total de doses do período.

---

## cuidador_paciente

Vínculo autorizado. Um cuidador pode acompanhar vários pacientes, e um paciente pode ter vários cuidadores.

| Campo | Tipo | Nulo | Padrão | Descrição |
|---|---|---|---|---|
| `id` | BIGINT | Não | AUTO_INCREMENT | Chave primária |
| `id_cuidador` | BIGINT | Não | — | Conta do cuidador |
| `id_paciente` | BIGINT | Não | — | Ficha acompanhada |
| `autorizado_em` | TIMESTAMP | Não | CURRENT_TIMESTAMP | Quando o paciente liberou |
| `ativo` | BOOLEAN | Não | TRUE | Falso quando o vínculo é revogado |

Chaves: PK `id` | UNIQUE `id_cuidador, id_paciente` | FK `id_cuidador` → `usuarios(id)` ON DELETE CASCADE | FK `id_paciente` → `pacientes(id)` ON DELETE CASCADE

Regras: a linha só existe se o paciente autorizou. Revogar não apaga, marca `ativo` como falso, porque quem teve acesso a dado de saúde precisa ficar registrado.

---

## acessos_qr

Log de cada abertura da ficha pública. Existe por causa da LGPD: dado sensível acessado sem login precisa de rastro.

| Campo | Tipo | Nulo | Padrão | Descrição |
|---|---|---|---|---|
| `id` | BIGINT | Não | AUTO_INCREMENT | Chave primária |
| `id_paciente` | BIGINT | Não | — | Ficha que foi aberta |
| `acessado_em` | TIMESTAMP | Não | CURRENT_TIMESTAMP | Momento do acesso |
| `ip` | VARCHAR(45) | Sim | NULL | Origem. 45 caracteres para caber IPv6 |
| `user_agent` | VARCHAR(255) | Sim | NULL | Navegador de quem escaneou |

Chaves: PK `id` | FK `id_paciente` → `pacientes(id)` ON DELETE CASCADE | INDEX `id_paciente, acessado_em`

Regras: o paciente pode ver esse histórico dentro do app. É o que responde "quem andou olhando a minha ficha". Guardar por tempo limitado e apagar depois, já que o dado não serve para nada além de auditoria recente.

---

## Decisões de modelagem

**Por que `BIGINT` em tudo.** Consistência. Misturar `INT` e `BIGINT` em chave estrangeira é erro comum e o MySQL só reclama na hora de criar a FK.

**Por que cuidador não é um tipo de usuário.** A mesma pessoa pode ser paciente e cuidar da mãe. Um campo `tipo` na tabela `usuarios` obrigaria duas contas para a mesma pessoa.

**Por que as doses são geradas antes.** Dá para calcular o horário na hora de exibir, mas aí não existe onde marcar "tomei" nem como saber o que foi perdido. Sem linha no banco não existe histórico, e sem histórico não existe adesão.

**Por que `token_qr` é único e indexado.** A rota pública busca a ficha por esse campo. É a consulta mais crítica do app e não pode varrer a tabela inteira.

**O que não fica no banco.** Foto, documento e laudo. Aumenta muito o risco de vazamento e o BioShield não precisa disso para cumprir a função.
