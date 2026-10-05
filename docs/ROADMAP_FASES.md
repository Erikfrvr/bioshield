# Roadmap BioShield por fases

Lista detalhada, tarefa por tarefa, com quem fez cada uma. O resumo do projeto concluído está em [`ROADMAP.md`](ROADMAP.md).

Ordem de construção do projeto. Cada fase depende da anterior.
Marque o `[ ]` conforme terminar. Se travar numa fase, não pule: o que vem depois usa ela.

Quase todas as fases estão fechadas. O que sobrou é, principalmente, a preparação do dia do evento e os testes num celular de verdade.

**Regra que vale para tudo:** construa uma fatia vertical de cada vez. Um domínio inteiro do value object até a rota, testado no `requests.http`, antes de começar o próximo. Nada de fazer todos os controllers e depois todos os services.

**Regra nova, agora que são dois:** cada fase tem dono. Quem é dono escreve, o outro revisa. Duas pessoas editando o mesmo arquivo no mesmo dia é onde projeto de dupla morre.

---

# Como a dupla se divide

O projeto foi feito em fatias verticais: um domínio inteiro de cada vez, do value object até a rota, testado no `requests.http` antes de começar o próximo. As telas ficaram prontas antes do backend. O backend tinha um gargalo: a Fase 3 é o molde de todas as outras camadas. Enquanto o molde não existisse, não dava para duas pessoas escreverem service e repository em paralelo, porque cada uma ia inventar um padrão diferente.

Por isso a divisão teve três tempos:

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

- [x] Rodar o ALTER em `pacientes`:

```sql
ALTER TABLE pacientes
  ADD COLUMN qr_ativo BOOLEAN NOT NULL DEFAULT TRUE AFTER token_gerado_em,
  ADD COLUMN qr_cancelado_em TIMESTAMP NULL AFTER qr_ativo;
```

- [x] Levar essas duas colunas para dentro do `database/bioshield.sql`, para quem clonar o repositório já criar o banco certo
- [x] Acrescentar as duas linhas no `database/DICIONARIO_DADOS.md`
- [x] Rodar o `bioshield.sql` num banco limpo de novo e conferir que não quebrou

Por que coluna nova e não apagar o token: o índice único impede token nulo repetido, e apagar o token destrói o rastro de qual código foi impresso. Marcar como inativo mantém a auditoria e deixa o cancelamento reversível por um token novo.

**Marco 2.5:** banco preparado para o cancelamento. **Feito.**

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

**Marco 3:** consigo criar conta pela API. O molde das camadas está fechado. É aqui que a Daiane destrava. **Feito.**

---

## Fase 4 — Autenticação  ·  **Erik**

- [x] Método de login no `UsuarioService` comparando o hash
- [x] Gerar o token JWT com o id do usuário dentro
- [x] **Devolver `idPaciente` na resposta do login**, com `null` quando a pessoa ainda não preencheu a ficha
- [x] Criar `middleware/autenticacao.ts` que lê o header e libera ou barra
- [x] Aplicar o middleware nas rotas que precisam de login
- [x] Deixar `GET /api/status` e `GET /api/emergencia/:token` **fora** do middleware
- [x] Testar rota protegida sem token (tem que dar 401) e com token (tem que passar)
- [x] `services/AutorizacaoService.ts`: quem pode ver qual paciente, com `403` (dúvida 9 do `docs/DUVIDAS_CONTRATO.md`)
- [x] Colunas `codigo_cuidador` e `codigo_valido_ate` em `pacientes` (dúvida 8)
- [x] Conferir que o login real funciona na tela · testado no navegador, contra o servidor, com o `MODO` em `auto`

O `idPaciente` no login não é firula. Sem ele o front precisa de uma rota extra só para descobrir qual ficha é do usuário logado, o que é uma ida a mais no servidor em toda abertura de tela.

**Marco 4:** login funcionando e rotas protegidas. **Feito.**

---

## Tempo 1 da Daiane — enquanto o molde não fica pronto  ·  **Daiane**

Isto não depende da Fase 3 e economiza horas depois. Consulta testada no Workbench é a parte difícil do infrastructure. Quando o molde sair, é só colar dentro.

- [x] Fase 2.5 inteira (o ALTER)
- [x] Ler o `frontEnd/CONTRATO_API.md` inteiro e anotar dúvida (em `docs/DUVIDAS_CONTRATO.md`)
- [x] Escrever e testar no Workbench o SQL de listar medicamentos de um paciente
- [x] Escrever e testar o SQL de inserir medicamento
- [x] Escrever e testar o SQL das doses de hoje, com join trazendo o nome do remédio
- [x] Escrever e testar o SQL do cálculo de adesão dos últimos 7 dias
- [x] Guardar essas consultas num arquivo de rascunho, comentadas (`database/rascunho_medicamentos_doses.sql`)
- [x] Preencher os blocos do `requests.http` nas seções MEDICAMENTOS e DOSES, com corpo de exemplo

---

## Fase 5 — Ficha médica  ·  **Erik**

- [x] `valueObjects/Telefone.ts`
- [x] `valueObjects/TipoSanguineo.ts`
- [x] `entidade/Alergia.ts`
- [x] `entidade/ContatoEmergencia.ts`
- [x] `entidade/Paciente.ts`
- [x] Os três DTOs de paciente
- [x] `repository/PacienteRepository.ts`
- [x] `infrastructure/pacienteInfrastructure.ts` com o join de alergias e contato
- [x] `services/PacienteService.ts`
- [x] `controllers/pacienteController.ts`
- [x] `routes/pacienteRoutes.ts`
- [x] **`POST /api/pacientes/:id/codigo`**, que gera o código de autorização do cuidador e grava em `codigo_cuidador` e `codigo_valido_ate` · value object `CodigoCuidador`, validade de 24 horas, só o dono gera
- [x] Chamar `autorizacaoService.garantirDono` em todas as rotas de paciente · GET, PUT e as três do QR. O POST usa o id do token como dono. `/codigo` e `/acessos` chamam quando forem criadas
- [x] Tratar alergias e contatos como substituição completa no PUT, dentro de uma transação · lista que não vem no PUT fica intocada, com os mesmos ids
- [x] Testar criar, ler e atualizar a ficha pelo `requests.http`
- [x] Conferir que o `PacienteResponseDTO` não está devolvendo senha nem nada de fora · só os 13 campos do contrato, sem email, senha nem `codigo_cuidador`
- [x] Abrir a tela de perfil no navegador e ver a ficha real carregando nos campos

O endpoint do código do cuidador fica aqui, e não na Fase 9, de propósito: ele mexe no `pacienteController`, que é arquivo do Erik. Assim a Daiane não precisa encostar nele.

**Marco 5:** ficha médica completa salvando e lendo. **Feito.**

---

## Fase 6 — QR Code e emergência  ·  **Erik e Daiane**

O coração do produto. Sem isso o BioShield é só mais um app de lembrete.

- [x] `valueObjects/TokenQR.ts` com token aleatório grande e imprevisível
- [x] Gerar o token no `PacienteService` na hora de criar a ficha · o `criar` chama o `gerarTokenQR` com o INSERT dentro
- [x] Método de rotacionar o token (gera novo e invalida o antigo) · `POST /pacientes/:id/qr/rotacionar`
- [x] **Método de cancelar:** marca `qr_ativo = FALSE` e grava `qr_cancelado_em`, sem apagar o token · `DELETE /pacientes/:id/qr`
- [x] **Método de reativar:** gera token novo e volta `qr_ativo = TRUE` · `POST /pacientes/:id/qr/reativar`
- [x] `entidade/FichaEmergencia.ts` (já ordena alergias e contatos e descarta remédio inativo)
- [x] `models/dto/emergencia/FichaEmergenciaResponseDTO.ts` com o mínimo necessário
- [x] `repository/EmergenciaRepository.ts`
- [x] `infrastructure/emergenciaInfrastructure.ts` com a busca por token e o log de acesso
- [x] `services/EmergenciaService.ts` montando a versão pública filtrada
- [x] Ordenar alergias por gravidade, grave primeiro
- [x] Trazer só medicamento com `ativo = TRUE`
- [x] Ordenar contatos por prioridade
- [x] `controllers/emergenciaController.ts`
- [x] `routes/emergenciaRoutes.ts` sem o middleware de autenticação · `GET /api/emergencia/:token`
- [x] **Devolver 404 para token que não existe e 410 para token cancelado.** O front tem tela diferente para cada um
- [x] `GET /api/pacientes/:id/acessos` devolvendo o histórico da LGPD, mais recente primeiro · só o dono (`garantirDono`)
- [x] Revisar campo por campo do que sai: nenhum email, senha, id ou token sobrando
- [x] Testar com token inválido, token válido e token cancelado · 404, 200 e 410, com o acesso gravado em `acessos_qr`

Cortado deste roadmap: o `npm install qrcode`. O front tem gerador próprio de QR Code em `js/qrcode.js`, sem CDN e sem biblioteca. O backend não precisa gerar imagem nenhuma, só entregar o token.

Cuidado com o reativar: ele **não** ressuscita o código antigo, gera outro. Se o chaveiro perdido voltasse a funcionar, cancelar não teria servido para nada.

**Marco 6:** escaneio o QR com o celular e a ficha abre. **Feito.**

---

## Fase 7 — Medicamentos  ·  **Daiane**

Começa depois do Marco 4. Roda em paralelo com as Fases 5 e 6 do Erik.

- [x] `valueObjects/Dosagem.ts`
- [x] `valueObjects/HorarioDose.ts`
- [x] `entidade/Medicamento.ts`
- [x] Os três DTOs de medicamento
- [x] `repository/MedicamentoRepository.ts`
- [x] `infrastructure/medicamentoInfrastructure.ts` (cole aqui o SQL que você já testou no Workbench)
- [x] `services/MedicamentoService.ts`, chamando `autorizacaoService.garantirDono` antes de ler ou gravar
- [x] Campo `proximaDose` na resposta: primeira dose prevista com horário no futuro, ou `null`
- [x] `controllers/medicamentoController.ts`
- [x] `routes/medicamentoRoutes.ts`
- [x] Testar o CRUD inteiro pelo `requests.http`
- [x] Abrir a tela de remédios no navegador e ver a lista real aparecendo

---

## Fase 8 — Doses e adesão  ·  **Daiane**

- [x] `entidade/Dose.ts` com os status previsto, tomada e perdida
- [x] Geração automática da agenda quando um medicamento é cadastrado
- [x] Os três DTOs de dose
- [x] `repository/DoseRepository.ts`
- [x] `infrastructure/doseInfrastructure.ts`
- [x] `services/DoseService.ts` com a janela de tolerância e o cálculo de adesão, chamando `autorizacaoService.garantirAcompanhamento`
- [x] Deixar confirmar dose com status `perdida` também. O front tem o botão "Tomei mesmo assim"
- [x] Dose no futuro **não** entra no cálculo de adesão, senão o dia começa em 0% e assusta o usuário à toa
- [x] `controllers/doseController.ts`
- [x] `routes/doseRoutes.ts` · `GET /doses/hoje`, `GET /doses/adesao` e `POST /doses/:id/confirmar`
- [x] Cadastrar um remédio, confirmar uma dose e conferir se a adesão mudou · testado pela API em um banco separado
- [x] Abrir a tela de doses no navegador e ver a barra de adesão mexendo

As nove dúvidas do `DUVIDAS_CONTRATO.md` estão decididas e implementadas no backend: tolerância de 60 minutos para a dose virar perdida, confirmação a partir de 60 minutos antes do horário e o "Tomei mesmo assim" para dose perdida. O que sobrou delas:

- [x] Rodar no banco de quem já tem ele criado o `ALTER TABLE doses` que está no `CONTRATO_API.md` (índice único da agenda) · **Erik e Daiane**
- [x] Na Fase 9, a lista do cuidador chama `doseService.prepararAgenda(idPaciente, agora)` antes de ler as doses de cada paciente · **Daiane**
- [x] Botão de suspender e reativar remédio na tela de remédios, usando o `ativo` do `PUT /medicamentos/:id`

**Marco 7:** lembrete de medicamento fechado de ponta a ponta. **Feito.**

---

## Fase 9 — Modo cuidador  ·  **Daiane**

- [x] `entidade/Cuidador.ts`
- [x] Os dois DTOs de cuidador
- [x] `repository/CuidadorRepository.ts`
- [x] `infrastructure/cuidadorInfrastructure.ts`
- [x] `services/CuidadorService.ts` com a checagem de autorização pelo código (`codigo_cuidador` válido até `codigo_valido_ate`), pegando o cuidador de `req.idUsuario`
- [x] O desvincular marca `ativo = FALSE`, não apaga a linha: quem teve acesso a dado de saúde fica registrado
- [x] `controllers/cuidadorController.ts`
- [x] `routes/cuidadorRoutes.ts`
- [x] Testar se um cuidador sem vínculo consegue ver dados (não pode)
- [x] Conferir que o cuidador recebe adesão e próxima dose, mas **não** recebe a ficha médica nem o log de acessos

A geração do código de autorização saiu daqui e foi para a Fase 5, para não misturar dono de arquivo.

**Marco 8:** backend completo. As três funcionalidades existem de verdade. **Feito.**

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
- [x] **Testar a página de emergência no celular de verdade, não só no navegador do PC** · Erik, depois do Marco 6

**Marco 9:** app navegável de ponta a ponta. **Feito.**

---

## Fase 11 — Acabamento

- [x] Fonte grande e contraste alto em tudo, pensando no idoso
- [x] Mensagem de erro amigável no lugar de `alert` seco
- [x] Estado de carregando nas telas que buscam dado
- [x] Tela de emergência legível em três segundos, alergia em vermelho
- [x] Revisar LGPD no backend: nada de logar corpo de ficha médica, log de acesso gravando · **Erik**
- [x] Trocar todo dado de teste real por dado fictício antes de publicar
- [x] Corrigir o `README.md`: ele manda rodar `database/dados_teste.sql`, mas o arquivo chama `dados_ficticios.sql` · **Erik**
- [x] `README.md` com print, descrição e instruções de instalação · **Erik**
- [x] Documentar no README que o front cai em modo demonstração se a API não responder · **Erik**
- [x] Deixar o repositório público · **Erik**

### Acessibilidade  ·  **Erik**

Dois recursos pensados para idoso e baixa visão, só no front, sem mexer no backend.

- [x] `frontEnd/js/acessibilidade.js` com o botão de acessibilidade, carregado em todas as telas menos a de imprimir
- [x] Botão pequeno e redondo com o símbolo de acessibilidade, que abre as opções ao toque
- [x] Botões A- e A+ com quatro tamanhos de letra, guardando a escolha no navegador
- [x] Botão de contraste reforçado: texto preto, bordas mais escuras e coral mais fechado
- [x] Passar por todas as telas com a letra no tamanho máximo e ver se algum texto fica apertado
- [x] Passar por todas as telas com o contraste ligado e ver se alguma cor ficou estranha
- [x] Classe `letra-grande` no `style.css`: com a letra aumentada, os blocos lado a lado viram coluna
- [x] Conferir com a letra aumentada as janelas que abrem por cima da tela (novo remédio e cancelar QR, que são as duas que existem) · na de novo remédio a data aparecia sem o fim do ano e os cartões de período passavam da borda; corrigido na classe `letra-grande`
- [x] Conferir em um celular de verdade, e não só por print

O teste foi feito por print, em largura de celular (360 px), nas sete telas. Antes do ajuste, o nome do paciente e o nome da alergia quebravam letra por letra na ficha de emergência, e o botão Sair saía da tela.

A leitura em voz alta foi testada e retirada. Ficou só o que o usuário controla com um toque.

---

## Fase 12 — Demonstração

Os dados fictícios do `database/dados_ficticios.sql` já contam a história da apresentação: a Maria em dia, o Lucas com doses perdidas, a Joana com alergias graves, o Roberto com o QR cancelado e a Patrícia como cuidadora.

- [x] Popular o banco com um caso de exemplo bonito para gravar · **Daiane** · `dados_ficticios.sql`
- [ ] Imprimir a folha de etiquetas de verdade e colar num chaveiro para aparecer na demo · **Erik**
- [ ] Mostrar o fluxo completo: cadastro, ficha, QR, escanear com o celular, remédio, alarme e dose · **Erik**
- [ ] Gravar o corte do cancelamento: escaneia e funciona, cancela no app, escaneia de novo e aparece o aviso · **Erik**
- [ ] Guardar esse vídeo, ele serve para apresentação, portfólio e LinkedIn

O corte do cancelamento é o melhor plano do vídeo inteiro. É o que mostra que existe produto pensado ali, e não só um CRUD com QR Code em cima.

### Mesa de QR Codes no dia do evento  ·  **Erik e Daiane**

A ideia é deixar QR Codes de pacientes fictícios na mesa para o visitante escanear com o próprio celular. As pegadinhas e a linha do tempo completa estão em `docs/DIA_DO_EVENTO.md`. Leiam antes de imprimir qualquer coisa.

- [ ] Subir o servidor no Linux Mint do professor, seguindo o `docs/SERVIDOR_LINUX.md`
- [ ] Fixar o IP do servidor no roteador, para o endereço não mudar depois de imprimir
- [ ] Abrir uma ficha com o celular no wifi do roteador, antes de gerar qualquer QR
- [x] Endereço do QR montado sozinho a partir do endereço de rede do servidor · não precisa mais preencher nada no `config.js`
- [ ] **Só então** gerar e imprimir os QR Codes
- [ ] Testar cada papel com dois celulares
- [ ] Depois de impresso, não rotacionar, cancelar nem recriar paciente da mesa
- [ ] Separar um paciente com QR cancelado para mostrar a tela de aviso
- [ ] Deixar o plano B pronto: vídeo, modo demonstração no notebook e prints

**Marco 12:** demonstração e mesa de QR Codes. **Falta.**

---

## Fase 13 — Testes com Jest  ·  **Daiane e Erik**

Poucos testes, no mesmo formato do que foi feito em aula: `describe`, `test` e `expect`, testando value object e entidade. Esses arquivos não falam com o banco, então não precisa de nada falso. São 8 arquivos e 45 testes, que rodam com `npm test` na pasta `backend`.

Atenção ao copiar o exemplo da aula: aqui os métodos se chamam `getValor()` e `igualA()`, não `getValue()` e `equals()`. E a mensagem de erro é a que está escrita em cada arquivo (no Email é `"O email informado não é válido."`), então o `toThrow` tem que usar essa.

Use o mesmo começo de arquivo da aula, `import { describe, expect, test } from '@jest/globals';`, e `test` em vez de `it`, para ficar igual ao que o professor corrige. Quando ele ensinar teste de infrastructure (o comentário `// Usar na UC de Teste` do projeto 16 indica que vem aí), acrescente aqui um teste do `usuarioInfrastructure` no mesmo formato que ele passar.

### Preparar

- [x] Instalar junto com o Erik, num commit só, por causa do `package-lock.json`: `npm install -D jest @types/jest` e o mesmo transformador de TypeScript usado em aula. Se o `ts-jest` der erro com o TypeScript 7 do projeto, troque por `@swc/core @swc/jest` · o `ts-jest` não aceitou o TypeScript 7, então ficou `jest`, `@types/jest`, `@swc/core` e `@swc/jest` no backend
- [x] Script `"test": "jest"` no `backend/package.json`
- [x] Criar a pasta `backend/tests/` e rodar `npm test` com o primeiro arquivo

### Os testes

- [x] `tests/valueObjects/Email.test.ts` · **Erik**,
  - [x] Aceita emails válidos e guarda em minúsculo (`" Maria@Exemplo.COM "` vira `"maria@exemplo.com"`) **Erik**
  - [x] Rejeita emails inválidos (`"semarroba"`, `"a@b.c"`, `"maria teste@exemplo.com"`) **Erik**
  - [x] `igualA` compara pelo valor **Erik**
- [x] `tests/valueObjects/Senha.test.ts` · **Erik**,
  - [x] Aceita senha com 8 caracteres, maiúscula, minúscula, número e caractere especial **Erik**,
  - [x] Rejeita senha curta, sem maiúscula, sem minúscula, sem número e sem caractere especial **Erik**,
  - [x] `String(senha)` mostra só `********`, nunca a senha **Erik**,
- [x] `tests/valueObjects/TipoSanguineo.test.ts` ·**Erik**,
  - [x] Aceita os oito tipos e normaliza `" ab- "` para `"AB-"` **Erik**,
  - [x] Rejeita `"0+"` com zero, `"C+"` e `"A"` **Erik**,
  - [x] `TipoSanguineo.opcional("")` devolve `null` **Erik**,
- [x] `tests/valueObjects/Telefone.test.ts` · **Erik**,
  - [x] `"(11) 98765-4321"` vira `"11987654321"` **Erik**,
  - [x] Rejeita número curto, DDD `01` e celular sem o 9
- [x] `tests/valueObjects/TokenQR.test.ts` · **Daiane**,
  - [x] `gerar()` devolve 32 caracteres hexadecimais **Daiane**,
  - [x] Dois tokens gerados são diferentes **Daiane**,
  - [x] `aPartirDoValor` rejeita texto que não é token (`"abc"`) **Daiane**,
- [x] `tests/entidade/Alergia.test.ts` · **Daiane**,
  - [x] Sem gravidade, a alergia fica `"moderada"` **Daiane**,
  - [x] Rejeita gravidade `"fatal"` e substância vazia
- [x] `tests/entidade/FichaEmergencia.test.ts` · **Daiane**,
  - [x] Alergia grave aparece antes da leve **Daiane**,
  - [x] Remédio com `ativo: false` não aparece na ficha **Daiane**,
- [x] `tests/entidade/Cuidador.test.ts` · **Daiane**
  - [x] `desvincular()` deixa o vínculo inativo **Daiane**,
  - [x] Desvincular duas vezes dá erro **Daiane**,

**Marco 10:** `npm test` passando com esses oito arquivos. **Feito.**

---

## Fase 14 — App Android  ·  **Erik e Daiane**

O front empacotado com o Capacitor. Passo a passo em [`GUIA_APK.md`](GUIA_APK.md).

- [x] Capacitor instalado na raiz, com `capacitor.config.json` e a pasta `android/`
- [x] Ícone e tela de abertura do BioShield no projeto Android
- [x] Backend entregando as telas e a API na mesma porta, para o site, o app e o QR usarem um endereço só
- [x] Quadro Servidor na tela de entrada, para escrever o endereço do servidor dentro do app
- [x] QR Code sempre com o endereço de rede do servidor, nunca com `localhost`
- [x] Sessão vencida manda de volta para a tela de entrada, com aviso
- [x] Abrir a pasta `android/` no Android Studio e compilar · APK compilado e testado num celular virtual
- [x] Instalar o APK em um celular de verdade e passar por todas as telas
- [x] Testar o botão de voltar do celular em cada tela, num celular de verdade · no celular virtual já funciona (Fase 15)
- [x] Notificação na hora do remédio com o `@capacitor/local-notifications` · virou o alarme dos remédios da Fase 15

**Marco 11:** app Android com alarme dos remédios. **Feito.**

---

## Fase 15 — Versão 1.0

Uma revisão geral do app, de ponta a ponta, antes da apresentação.

- [x] Botão Voltar do Android funcionando (antes ele fechava o app em qualquer tela)
- [x] Ficha médica salvando sem alergia ou sem contato (antes o navegador barrava as linhas em branco)
- [x] Aviso quando um contato fica sem telefone
- [x] Aviso claro quando o servidor está fora do ar
- [x] Alarme dos remédios: aviso no celular na hora da dose, repetido a cada 5 minutos até a confirmação, com os botões Tomei e Lembrar em 5 min, funcionando com o app fechado, no servidor e na demonstração
- [x] Rota `GET /api/doses/proximas`, que alimenta o alarme
- [x] APK compilado e testado num celular virtual, incluindo o alarme com o app fechado

**Feito.**