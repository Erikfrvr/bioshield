# Roadmap BioShield

Ordem de construção do projeto. Cada fase depende da anterior.
Marque o `[ ]` conforme terminar. Se travar numa fase, não pule: o que vem depois usa ela.

**Regra que vale para tudo:** construa uma fatia vertical de cada vez. Um domínio inteiro do value object até a rota, testado no `requests.http`, antes de começar o próximo. Nada de fazer todos os controllers e depois todos os services.

**Regra nova, agora que são dois:** cada fase tem dono. Quem é dono escreve, o outro revisa. Duas pessoas editando o mesmo arquivo no mesmo dia é onde projeto de dupla morre.

---

## Como a dupla se divide

O front está pronto e testado. O que sobrou é backend, e ele tem um gargalo: a Fase 3 é o molde de todas as outras camadas. Enquanto o molde não existir, não dá para duas pessoas escreverem service e repository em paralelo, porque cada uma vai inventar um padrão diferente.

Por isso a divisão tem três tempos:

**Tempo 1, o molde.** Erik faz as Fases 3 e 4 sozinho. Daiane trabalha em coisa que não depende do molde: o ALTER no banco, o SQL cru de medicamentos e doses testado no Workbench, e os blocos do `requests.http`. Quando o molde ficar pronto, ela já vai ter as consultas prontas para colar dentro do infrastructure.

**Tempo 2, paralelo de verdade.** Erik pega ficha médica e QR, que é o caminho crítico do produto. Daiane pega medicamentos e doses, que é uma fatia fechada e não esbarra no QR.

**Tempo 3, o que sobrar.** Cuidador e o acabamento, com quem terminar primeiro puxando o resto.

### Os três arquivos que vocês vão disputar

| Arquivo | Combinado |
|---|---|
| `server.ts` | Erik registra **todas** as seis rotas de uma vez na Fase 3, apontando para routers vazios. Depois disso ninguém mais toca nele |
| `package.json` | Instalem `bcryptjs` e `jsonwebtoken` juntos, no mesmo dia, antes de começar. Instalação separada dá conflito no `package-lock.json` |
| `requests.http` | As seções já estão separadas por domínio. Cada um escreve só dentro da sua seção |

Trabalhem em branch por fatia (`erik/ficha-qr`, `daiane/medicamentos-doses`) e façam pull antes de cada push. Commit pequeno e frequente dói menos que merge grande.

---

## Fase 0 — Preparar o terreno

- [x] Criar o repositório `bioshield` no GitHub (conta Erikfrvr), privado por enquanto
- [x] Jogar o esqueleto dentro e fazer o primeiro commit
- [x] Conferir se o `.gitignore` está pegando `node_modules/` e `.env`
- [x] `cd backend && npm install`
- [x] Copiar `.env.example` para `.env` e preencher com os dados do seu MySQL
- [x] Criar o banco vazio `bioshield` no Workbench

**Marco 0:** repositório no ar e ambiente pronto. **Feito.**

---

## Fase 1 — Banco de dados

Arquivo: `database/bioshield.sql`

- [x] `usuarios` (id, nome, email único, senha)
- [x] `pacientes` (id, id_usuario, tipo_sanguineo, condicoes, observacoes, token_qr único, criado_em)
- [x] `alergias` (id, id_paciente, substancia, gravidade)
- [x] `contatos_emergencia` (id, id_paciente, nome, telefone, parentesco)
- [x] `medicamentos` (id, id_paciente, nome, dosagem, unidade, frequencia_horas, horario_inicial, data_inicio, data_fim)
- [x] `doses` (id, id_medicamento, horario_previsto, horario_confirmado, status)
- [x] `cuidador_paciente` (id, id_cuidador, id_paciente, autorizado_em)
- [x] `acessos_qr` (id, id_paciente, acessado_em, ip) para o log da LGPD
- [x] Chaves estrangeiras com `ON DELETE CASCADE` onde faz sentido
- [x] Índice único em `pacientes.token_qr`
- [x] Rodar o script inteiro do zero num banco limpo e conferir se não quebra
- [x] Inserir dois ou três registros falsos para você ter o que testar

**Marco 1:** banco criado e populado com dado de teste. **Feito.**

---

## Fase 2 — Fundação do backend

- [x] `config/db.ts`: pool do mysql2 lendo o `.env` e teste de conexão no boot
- [x] `server.ts`: express, dotenv, cors, `express.json()` e o listen
- [x] Subir com `npm run dev` e ver a mensagem de conexão bem sucedida no terminal
- [x] Criar uma rota boba `GET /api/status` só para confirmar que a API responde
- [x] Testar essa rota pelo `requests.http`

**Marco 2:** servidor de pé conversando com o banco. **Feito.**

Observação: essa rota deixou de ser boba. O front chama ela para decidir se usa a API ou o modo demonstração. Se ela cair, o app inteiro cai para dados fictícios.

---

## Fase 2.5 — Ajuste no banco para o cancelamento do QR  ·  **Daiane**

Fase nova, que nasceu do front. O cancelamento do QR Code precisa de duas colunas que o schema atual não tem.

- [ ] Rodar o ALTER em `pacientes`:

```sql
ALTER TABLE pacientes
  ADD COLUMN qr_ativo BOOLEAN NOT NULL DEFAULT TRUE AFTER token_gerado_em,
  ADD COLUMN qr_cancelado_em TIMESTAMP NULL AFTER qr_ativo;
```

- [x] Levar essas duas colunas para dentro do `database/bioshield.sql`, para quem clonar o repositório já criar o banco certo
- [x] Acrescentar as duas linhas no `database/DICIONARIO_DADOS.md`
- [x] Rodar o `bioshield.sql` num banco limpo de novo e conferir que não quebrou

Por que coluna nova e não apagar o token: o índice único impede token nulo repetido, e apagar o token destrói o rastro de qual código foi impresso. Marcar como inativo mantém a auditoria e deixa o cancelamento reversível por um token novo.

**Marco 2.5:** banco preparado para o cancelamento.

---

## Fase 3 — Usuário (a fatia molde)  ·  **Erik**

Esta é a fase mais importante do roadmap. Ela vira o molde de todas as outras. Capriche aqui.

Daiane não mexe nesta fase. Ela lê quando estiver pronta e copia o padrão.

- [x] `npm install bcryptjs jsonwebtoken` e os tipos, **junto com a Daiane na mesma hora**
- [x] `models/valueObjects/Email.ts`
- [x] `models/valueObjects/Senha.ts`
- [x] `models/entidade/Usuario.ts`
- [x] `models/dto/usuario/CadastrarUsuarioDTO.ts`
- [x] `models/dto/usuario/LoginUsuarioDTO.ts`
- [x] `models/dto/usuario/UsuarioResponseDTO.ts`
- [x] `repository/UsuarioRepository.ts` (só a interface)
- [x] `infrastructure/usuarioInfrastructure.ts` (o SQL)
- [x] `services/UsuarioService.ts` com hash da senha e checagem de email repetido
- [x] `controllers/usuarioController.ts`
- [x] `routes/usuarioRoutes.ts` e registrar no `server.ts`
- [x] **Registrar de uma vez os seis routers no `server.ts`**, mesmo os vazios (paciente, emergencia, medicamento, dose, cuidador), para ninguém mais precisar abrir esse arquivo
- [x] Bloco de teste no `requests.http`
- [x] Cadastrar um usuário e conferir no Workbench se a senha gravou como hash
- [x] Tentar cadastrar o mesmo email duas vezes e ver se o erro sobe com status 409

**Marco 3:** consigo criar conta pela API. O molde das camadas está fechado. É aqui que a Daiane destrava.
 
---

## Fase 4 — Autenticação  ·  **Erik**

- [ ] Método de login no `UsuarioService` comparando o hash
- [ ] Gerar o token JWT com o id do usuário dentro
- [ ] **Devolver `idPaciente` na resposta do login**, com `null` quando a pessoa ainda não preencheu a ficha
- [ ] Criar `middleware/autenticacao.ts` que lê o header e libera ou barra
- [ ] Aplicar o middleware nas rotas que precisam de login
- [ ] Deixar `GET /api/status` e `GET /api/emergencia/:token` **fora** do middleware
- [ ] Testar rota protegida sem token (tem que dar 401) e com token (tem que passar)
- [ ] Trocar o `config.js` do front para `MODO: "api"` e conferir que o login real funciona na tela

O `idPaciente` no login não é firula. Sem ele o front precisa de uma rota extra só para descobrir qual ficha é do usuário logado, o que é uma ida a mais no servidor em toda abertura de tela.

**Marco 4:** login funcionando e rotas protegidas.

---

## Tempo 1 da Daiane — enquanto o molde não fica pronto  ·  **Daiane**

Isto não depende da Fase 3 e economiza horas depois. Consulta testada no Workbench é a parte difícil do infrastructure. Quando o molde sair, é só colar dentro.

- [ ] Fase 2.5 inteira (o ALTER)
- [ ] Ler o `frontEnd/CONTRATO_API.md` inteiro e anotar dúvida
- [ ] Escrever e testar no Workbench o SQL de listar medicamentos de um paciente
- [ ] Escrever e testar o SQL de inserir medicamento
- [ ] Escrever e testar o SQL das doses de hoje, com join trazendo o nome do remédio
- [ ] Escrever e testar o SQL do cálculo de adesão dos últimos 7 dias
- [ ] Guardar essas consultas num arquivo de rascunho, comentadas
- [ ] Preencher os blocos do `requests.http` nas seções MEDICAMENTOS e DOSES, com corpo de exemplo

---

## Fase 5 — Ficha médica  ·  **Erik**

- [ ] `valueObjects/Telefone.ts`
- [ ] `valueObjects/TipoSanguineo.ts`
- [ ] `entidade/Alergia.ts`
- [ ] `entidade/ContatoEmergencia.ts`
- [ ] `entidade/Paciente.ts`
- [ ] Os três DTOs de paciente
- [ ] `repository/PacienteRepository.ts`
- [ ] `infrastructure/pacienteInfrastructure.ts` com o join de alergias e contato
- [ ] `services/PacienteService.ts`
- [ ] `controllers/pacienteController.ts`
- [ ] `routes/pacienteRoutes.ts`
- [ ] **`POST /api/pacientes/:id/codigo`**, que gera o código de autorização do cuidador
- [ ] Tratar alergias e contatos como substituição completa no PUT, dentro de uma transação
- [ ] Testar criar, ler e atualizar a ficha pelo `requests.http`
- [ ] Conferir que o `PacienteResponseDTO` não está devolvendo senha nem nada de fora
- [ ] Abrir a tela de perfil no navegador e ver a ficha real carregando nos campos

O endpoint do código do cuidador fica aqui, e não na Fase 9, de propósito: ele mexe no `pacienteController`, que é arquivo do Erik. Assim a Daiane não precisa encostar nele.

**Marco 5:** ficha médica completa salvando e lendo.

---

## Fase 6 — QR Code e emergência  ·  **Erik**

O coração do produto. Sem isso o BioShield é só mais um app de lembrete.

- [ ] `valueObjects/TokenQR.ts` com token aleatório grande e imprevisível
- [ ] Gerar o token no `PacienteService` na hora de criar a ficha
- [ ] Método de rotacionar o token (gera novo e invalida o antigo)
- [ ] **Método de cancelar:** marca `qr_ativo = FALSE` e grava `qr_cancelado_em`, sem apagar o token
- [ ] **Método de reativar:** gera token novo e volta `qr_ativo = TRUE`
- [ ] `entidade/FichaEmergencia.ts`
- [ ] `models/dto/emergencia/FichaEmergenciaResponseDTO.ts` com o mínimo necessário
- [ ] `repository/EmergenciaRepository.ts`
- [ ] `infrastructure/emergenciaInfrastructure.ts` com a busca por token e o log de acesso
- [ ] `services/EmergenciaService.ts` montando a versão pública filtrada
- [ ] Ordenar alergias por gravidade, grave primeiro
- [ ] Trazer só medicamento com `ativo = TRUE`
- [ ] Ordenar contatos por prioridade
- [ ] `controllers/emergenciaController.ts`
- [ ] `routes/emergenciaRoutes.ts` sem o middleware de autenticação
- [ ] **Devolver 404 para token que não existe e 410 para token cancelado.** O front tem tela diferente para cada um
- [ ] `GET /api/pacientes/:id/acessos` devolvendo o histórico da LGPD, mais recente primeiro
- [ ] Revisar campo por campo do que sai: nenhum email, senha, id ou token sobrando
- [ ] Testar com token inválido, token válido e token cancelado

Cortado deste roadmap: o `npm install qrcode`. O front tem gerador próprio de QR Code em `js/qrcode.js`, sem CDN e sem biblioteca. O backend não precisa gerar imagem nenhuma, só entregar o token.

Cuidado com o reativar: ele **não** ressuscita o código antigo, gera outro. Se o chaveiro perdido voltasse a funcionar, cancelar não teria servido para nada.

**Marco 6:** escaneio o QR com o celular e a ficha abre.

---

## Fase 7 — Medicamentos  ·  **Daiane**

Começa depois do Marco 4. Roda em paralelo com as Fases 5 e 6 do Erik.

- [ ] `valueObjects/Dosagem.ts`
- [ ] `valueObjects/HorarioDose.ts`
- [ ] `entidade/Medicamento.ts`
- [ ] Os três DTOs de medicamento
- [ ] `repository/MedicamentoRepository.ts`
- [ ] `infrastructure/medicamentoInfrastructure.ts` (cole aqui o SQL que você já testou no Workbench)
- [ ] `services/MedicamentoService.ts`
- [ ] Campo `proximaDose` na resposta: primeira dose prevista com horário no futuro, ou `null`
- [ ] `controllers/medicamentoController.ts`
- [ ] `routes/medicamentoRoutes.ts`
- [ ] Testar o CRUD inteiro pelo `requests.http`
- [ ] Abrir a tela de remédios no navegador e ver a lista real aparecendo

---

## Fase 8 — Doses e adesão  ·  **Daiane**

- [ ] `entidade/Dose.ts` com os status previsto, tomada e perdida
- [ ] Geração automática da agenda quando um medicamento é cadastrado
- [ ] Os três DTOs de dose
- [ ] `repository/DoseRepository.ts`
- [ ] `infrastructure/doseInfrastructure.ts`
- [ ] `services/DoseService.ts` com a janela de tolerância e o cálculo de adesão
- [ ] Deixar confirmar dose com status `perdida` também. O front tem o botão "Tomei mesmo assim"
- [ ] Dose no futuro **não** entra no cálculo de adesão, senão o dia começa em 0% e assusta o usuário à toa
- [ ] `controllers/doseController.ts`
- [ ] `routes/doseRoutes.ts`
- [ ] Cadastrar um remédio, confirmar uma dose e conferir se a adesão mudou
- [ ] Abrir a tela de doses no navegador e ver a barra de adesão mexendo

**Marco 7:** lembrete de medicamento fechado de ponta a ponta.

---

## Fase 9 — Modo cuidador  ·  **Daiane**

- [ ] `entidade/Cuidador.ts`
- [ ] Os dois DTOs de cuidador
- [ ] `repository/CuidadorRepository.ts`
- [ ] `infrastructure/cuidadorInfrastructure.ts`
- [ ] `services/CuidadorService.ts` com a checagem de autorização pelo código
- [ ] O desvincular marca `ativo = FALSE`, não apaga a linha: quem teve acesso a dado de saúde fica registrado
- [ ] `controllers/cuidadorController.ts`
- [ ] `routes/cuidadorRoutes.ts`
- [ ] Testar se um cuidador sem vínculo consegue ver dados (não pode)
- [ ] Conferir que o cuidador recebe adesão e próxima dose, mas **não** recebe a ficha médica nem o log de acessos

A geração do código de autorização saiu daqui e foi para a Fase 5, para não misturar dono de arquivo.

**Marco 8:** backend completo. As três funcionalidades existem de verdade.

---

## Fase 10 — Front  ·  **Feito**

Oito telas, trinta e um arquivos. Passou por bateria automatizada no Chromium: 45 verificações, zero erro de JavaScript, zero estouro de layout em 320, 390, 768 e 1280 pixels.

- [x] `js/api.js` centralizando fetch, URL base e token
- [x] `js/config.js` com a URL da API e o modo (auto, api, demo)
- [x] `js/ui.js` com guarda de sessão, navegação, recados e formatação
- [x] `js/demo.js` com os dados fictícios do modo demonstração
- [x] `js/qrcode.js`, gerador de QR Code próprio, sem CDN
- [x] `style.css` com a paleta e os componentes base
- [x] `index.html` e `js/login.js`
- [x] `pages/cadastro.html` e `js/cadastro.js`
- [x] `pages/perfil.html`, `perfil.css` e `js/perfil.js` com o QR em destaque
- [x] Cancelamento e troca do QR Code na tela de perfil
- [x] `pages/imprimir.html`, `imprimir.css` e `js/imprimir.js` com a folha A4 de etiquetas
- [x] `pages/medicamentos.html`, `medicamentos.css` e `js/medicamentos.js`
- [x] `pages/doses.html`, `doses.css` e `js/doses.js` com a barra de adesão
- [x] `pages/cuidador.html`, `cuidador.css` e `js/cuidador.js`
- [x] `pages/emergencia.html`, `emergencia.css` e `js/emergencia.js`
- [x] `frontEnd/CONTRATO_API.md` com o contrato de todas as rotas
- [ ] **Testar a página de emergência no celular de verdade, não só no navegador do PC** · Erik, depois do Marco 6

**Marco 9:** app navegável de ponta a ponta. Navega hoje em modo demonstração. Vira real no Marco 6.

---

## Fase 11 — Acabamento

- [x] Fonte grande e contraste alto em tudo, pensando no idoso
- [x] Mensagem de erro amigável no lugar de `alert` seco
- [x] Estado de carregando nas telas que buscam dado
- [x] Tela de emergência legível em três segundos, alergia em vermelho
- [ ] Revisar LGPD no backend: nada de logar corpo de ficha médica, log de acesso gravando · **Erik**
- [x] Trocar todo dado de teste real por dado fictício antes de publicar
- [ ] Corrigir o `README.md`: ele manda rodar `database/dados_teste.sql`, mas o arquivo chama `dados_ficticios.sql` · **Daiane**
- [ ] `README.md` com print, descrição e instruções de instalação · **Daiane**
- [ ] Documentar no README que o front cai em modo demonstração se a API não responder · **Daiane**
- [x] Deixar o repositório público · **Erik**

---

## Fase 12 — Demonstração

- [ ] Popular o banco com um caso de exemplo bonito para gravar · **Daiane**
- [ ] Imprimir a folha de etiquetas de verdade e colar num chaveiro para aparecer na demo · **Erik**
- [ ] Mostrar o fluxo completo: cadastro, ficha, QR, escanear com o celular, remédio, dose · **Erik**
- [ ] Gravar o corte do cancelamento: escaneia e funciona, cancela no app, escaneia de novo e aparece o aviso · **Erik**
- [ ] Guardar esse vídeo, ele serve para apresentação, portfólio e LinkedIn

O corte do cancelamento é o melhor plano do vídeo inteiro. É o que mostra que existe produto pensado ali, e não só um CRUD com QR Code em cima.

---

## Painel de acompanhamento

| Marco | O que prova | Dono | Feito |
|---|---|---|---|
| 0 | Ambiente pronto | os dois | [x] |
| 1 | Banco criado | os dois | [x] |
| 2 | API de pé | Erik | [x] |
| 2.5 | Banco pronto para o cancelamento | Daiane | [ ] |
| 3 | Cadastro funcionando | Erik | [ ] |
| 4 | Login e rotas protegidas | Erik | [ ] |
| 5 | Ficha médica salvando | Erik | [ ] |
| 6 | QR abrindo a ficha | Erik | [ ] |
| 7 | Lembrete de dose fechado | Daiane | [ ] |
| 8 | Backend completo | Daiane | [ ] |
| 9 | App navegável | pronto no front | [x] |

---

## Se o tempo apertar

Corte nesta ordem, de trás para frente: Fase 12, depois a Fase 9 (cuidador), depois o acabamento da Fase 11.

O que não pode ser cortado de jeito nenhum: Fases 1 a 6. Sem o QR de emergência funcionando não existe BioShield, existe um app de lembrete de remédio qualquer.

E dentro das Fases 1 a 6, a mais perigosa é a 3. Ela não entrega nada visível, parece que o projeto não andou, e dá vontade de correr para a parte bonita. Se ela sair torta, as Fases 5 a 9 saem tortas junto, cada uma com um padrão diferente, e aí o retrabalho come o prazo.
