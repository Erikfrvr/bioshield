# Roadmap do BioShield, fase por fase

Este é o registro, tarefa por tarefa, do caminho que nós, Erik e Daiane, seguimos para construir o BioShield entre 11/09 e 06/10/2026. Cada fase diz quem foi o dono, quando aconteceu, o que fizemos e o que ela entregou. Caixa marcada é tarefa feita; caixa vazia é o que ainda falta para o Empreenda.

O resumo, com todas as fases numa tabela só e a lista do que falta, está em [`ROADMAP.md`](ROADMAP.md).

---

## Como nos organizamos

Duas regras guiaram o projeto inteiro:

1. **Uma fatia vertical de cada vez.** Construímos um domínio inteiro, do value object até a rota, e testamos no `requests.http` antes de começar o próximo. Nunca fizemos todos os controllers primeiro e todos os services depois.
2. **Cada fase com um dono.** Quem era dono escrevia, e o outro revisava. Assim os dois nunca editavam o mesmo arquivo no mesmo dia.

As telas ficaram prontas antes do backend (Fase 10, em 19/09). No backend havia um gargalo: a Fase 3 seria o molde de todas as outras camadas, e enquanto ela não existisse, cada um inventaria um padrão diferente. Por isso dividimos o trabalho em três tempos:

- **Tempo 1, o molde.** O Erik fez as Fases 3 e 4 sozinho. Enquanto isso, a Daiane preparou o que não dependia do molde: o ajuste do banco para o cancelamento do QR, as consultas de remédios e doses testadas no Workbench e os blocos do `requests.http`. Quando o molde ficou pronto, as consultas dela já estavam prontas para entrar na camada de infraestrutura.
- **Tempo 2, em paralelo.** O Erik ficou com a ficha médica e o QR Code, que são o caminho crítico do produto. A Daiane ficou com remédios e doses, uma fatia fechada que não esbarra no QR.
- **Tempo 3, o que sobrou.** O modo cuidador e o acabamento.

Três arquivos eram usados pelos dois, e para eles combinamos uma regra própria:

| Arquivo | O que combinamos |
|---|---|
| `server.ts` | O Erik registrou os seis routers de uma vez na Fase 3, mesmo os que ainda estavam vazios. Depois disso ninguém mais precisou mexer nele |
| `package.json` | Instalamos as bibliotecas juntos, num commit só, para não dar conflito no `package-lock.json` |
| `requests.http` | Dividimos o arquivo em seções por domínio, e cada um escreveu só na sua |

Cada um trabalhou na sua branch (`Erik` e `Daiane`), e juntamos tudo na `main` por pull request.

---

## Fase 0. Preparar o terreno

**Quem:** os dois · **Quando:** 11/09

- [x] Criamos o repositório `bioshield` no GitHub, na conta do Erik
- [x] Subimos o esqueleto de pastas no primeiro commit
- [x] Conferimos se o `.gitignore` deixava de fora o `node_modules/` e o `.env`
- [x] Instalamos as dependências do backend com `npm install`
- [x] Cada um copiou o `.env.example` para `.env` e preencheu com o seu MySQL
- [x] Criamos o banco vazio `bioshield` no Workbench

**Entregou:** o repositório no ar e o ambiente pronto nos dois computadores.

---

## Fase 1. Banco de dados

**Quem:** os dois · **Quando:** 11/09 a 15/09 · **Arquivo:** `database/bioshield.sql`

- [x] `usuarios` (id, nome, email único, senha)
- [x] `pacientes` (id, id_usuario, tipo_sanguineo, condicoes, observacoes, token_qr único, criado_em)
- [x] `alergias` (id, id_paciente, substancia, gravidade)
- [x] `contatos_emergencia` (id, id_paciente, nome, telefone, parentesco)
- [x] `medicamentos` (id, id_paciente, nome, dosagem, unidade, frequencia_horas, horario_inicial, data_inicio, data_fim)
- [x] `doses` (id, id_medicamento, horario_previsto, horario_confirmado, status)
- [x] `cuidador_paciente` (id, id_cuidador, id_paciente, autorizado_em)
- [x] `acessos_qr` (id, id_paciente, acessado_em, ip), o registro de leituras que a LGPD pede
- [x] Chaves estrangeiras com `ON DELETE CASCADE` onde fazia sentido
- [x] Índice único em `pacientes.token_qr`
- [x] Rodamos o script inteiro do zero num banco limpo para conferir que não quebrava
- [x] Inserimos alguns registros falsos para ter o que testar

**Entregou:** o banco criado e com dados de teste. Cada tabela e cada coluna estão explicadas no [`DICIONARIO_DADOS.md`](../database/DICIONARIO_DADOS.md).

---

## Fase 2. Fundação do backend

**Quem:** Erik · **Quando:** 16/09

- [x] `config/db.ts`: o pool do mysql2 lendo o `.env`, com teste de conexão na subida
- [x] `server.ts`: Express, dotenv, cors, `express.json()` e o listen
- [x] Subimos com `npm run dev` e vimos a mensagem de conexão no terminal
- [x] Criamos a rota `GET /api/status`, só para confirmar que a API respondia
- [x] Testamos essa rota pelo `requests.http`

**Entregou:** o servidor de pé, conversando com o banco.

A rota de status começou como teste e virou peça central: é ela que diz às telas se existe servidor ou se é hora de entrar no modo demonstração. Na Fase 17 ela passou a dizer também se o banco respondeu.

---

## Fase 2.5. Banco pronto para o cancelamento do QR

**Quem:** Daiane · **Quando:** 24/09

Esta fase nasceu das telas: o cancelamento do QR Code precisava de duas colunas que o banco ainda não tinha.

- [x] Rodamos o ALTER em `pacientes`:

```sql
ALTER TABLE pacientes
  ADD COLUMN qr_ativo BOOLEAN NOT NULL DEFAULT TRUE AFTER token_gerado_em,
  ADD COLUMN qr_cancelado_em TIMESTAMP NULL AFTER qr_ativo;
```

- [x] Levamos as duas colunas para o `database/bioshield.sql`, para quem clonar o repositório já criar o banco certo
- [x] Acrescentamos as duas no `DICIONARIO_DADOS.md`
- [x] Rodamos o `bioshield.sql` num banco limpo de novo

Por que uma coluna nova, em vez de apagar o token: o índice único não deixa repetir token nulo, e apagar o token destruiria o rastro de qual código foi impresso. Marcar como inativo mantém a auditoria e deixa o cancelamento reversível com um token novo.

**Entregou:** o banco preparado para o cancelamento.

---

## Fase 3. Usuário, a fatia molde

**Quem:** Erik · **Quando:** 24/09 a 25/09

Foi a fase mais importante do roadmap, porque virou o molde de todas as outras. A Daiane não mexeu nela; leu quando ficou pronta e seguiu o mesmo padrão.

- [x] Instalamos `bcryptjs` e `jsonwebtoken` com os tipos, os dois juntos
- [x] `models/valueObjects/Email.ts`
- [x] `models/valueObjects/Senha.ts`
- [x] `models/entidade/Usuario.ts`
- [x] `models/dto/usuario/CadastrarUsuarioDTO.ts`
- [x] `models/dto/usuario/LoginUsuarioDTO.ts`
- [x] `models/dto/usuario/UsuarioResponseDTO.ts`
- [x] `repository/UsuarioRepository.ts`, só a interface
- [x] `infrastructure/usuarioInfrastructure.ts`, o SQL
- [x] `services/UsuarioService.ts`, com o hash da senha e a checagem de email repetido
- [x] `controllers/usuarioController.ts`
- [x] `routes/usuarioRoutes.ts`
- [x] Registramos de uma vez os seis routers no `server.ts`, mesmo os vazios
- [x] Escrevemos o bloco de teste no `requests.http`
- [x] Cadastramos um usuário e conferimos no Workbench que a senha gravou como hash
- [x] Tentamos cadastrar o mesmo email duas vezes e vimos o erro sair com status 409

**Entregou:** criar conta pela API, e o molde das camadas fechado. Foi aqui que a Daiane pôde começar o backend dela.

---

## Fase 4. Autenticação

**Quem:** Erik · **Quando:** 27/09 a 29/09

- [x] Login no `UsuarioService`, comparando o hash
- [x] Token JWT com o id do usuário dentro
- [x] `idPaciente` na resposta do login, com `null` quando a pessoa ainda não preencheu a ficha
- [x] `middleware/autenticacao.ts`, que lê o cabeçalho e libera ou barra
- [x] O middleware aplicado nas rotas que pedem login
- [x] `GET /api/status` e `GET /api/emergencia/:token` deixados de fora dele
- [x] Testamos rota protegida sem token (401) e com token (passa)
- [x] `services/AutorizacaoService.ts`: quem pode ver qual paciente, com 403 (dúvida 9 do [`DUVIDAS_CONTRATO.md`](DUVIDAS_CONTRATO.md))
- [x] Colunas `codigo_cuidador` e `codigo_valido_ate` em `pacientes` (dúvida 8)
- [x] Conferimos o login de verdade na tela, contra o servidor

O `idPaciente` no login evita uma rota extra só para descobrir qual ficha é de quem entrou, o que seria uma ida a mais ao servidor em toda abertura de tela.

**Entregou:** login funcionando e rotas protegidas.

---

## Tempo 1 da Daiane: enquanto o molde não ficava pronto

**Quem:** Daiane · **Quando:** 24/09 a 28/09

Nada disto dependia da Fase 3, e economizou horas depois: a consulta testada no Workbench é a parte difícil da camada de infraestrutura.

- [x] A Fase 2.5 inteira
- [x] Leitura do [`CONTRATO_API.md`](../frontEnd/CONTRATO_API.md) inteiro, com as dúvidas anotadas no [`DUVIDAS_CONTRATO.md`](DUVIDAS_CONTRATO.md)
- [x] SQL de listar os remédios de um paciente, testado no Workbench
- [x] SQL de cadastrar remédio
- [x] SQL das doses de hoje, com o nome do remédio
- [x] SQL da adesão dos últimos 7 dias
- [x] As consultas guardadas e comentadas em `database/rascunho_medicamentos_doses.sql`
- [x] Os blocos de MEDICAMENTOS e DOSES do `requests.http`, com corpo de exemplo

---

## Fase 5. Ficha médica

**Quem:** Erik · **Quando:** 29/09 a 02/10

- [x] `valueObjects/Telefone.ts`
- [x] `valueObjects/TipoSanguineo.ts`
- [x] `entidade/Alergia.ts`
- [x] `entidade/ContatoEmergencia.ts`
- [x] `entidade/Paciente.ts`
- [x] Os três DTOs de paciente
- [x] `repository/PacienteRepository.ts`
- [x] `infrastructure/pacienteInfrastructure.ts`, com as alergias e os contatos
- [x] `services/PacienteService.ts`
- [x] `controllers/pacienteController.ts`
- [x] `routes/pacienteRoutes.ts`
- [x] `POST /api/pacientes/:id/codigo`, que gera o código de autorização do cuidador: value object `CodigoCuidador`, validade de 24 horas, e só o dono da ficha gera
- [x] `autorizacaoService.garantirDono` em todas as rotas de paciente
- [x] Alergias e contatos substituídos inteiros no PUT, dentro de uma transação
- [x] Testamos criar, ler e atualizar a ficha pelo `requests.http`
- [x] Conferimos que o `PacienteResponseDTO` devolve só os campos do contrato, sem email, senha nem código do cuidador
- [x] Abrimos a tela da ficha no navegador e vimos a ficha real carregando

O código do cuidador ficou nesta fase, e não na do cuidador, porque mexe no `pacienteController`, que era arquivo do Erik. Assim a Daiane não precisou encostar nele.

**Entregou:** a ficha médica completa, salvando e lendo.

---

## Fase 6. QR Code e emergência

**Quem:** Erik e Daiane · **Quando:** 29/09 a 01/10

O coração do produto. Sem isto, o BioShield seria só mais um app de lembrete.

- [x] `valueObjects/TokenQR.ts`, com token aleatório de 128 bits
- [x] Token gerado na hora de criar a ficha
- [x] Trocar o token, invalidando o anterior na hora: `POST /pacientes/:id/qr/rotacionar`
- [x] Cancelar: marca `qr_ativo = FALSE` e grava `qr_cancelado_em`, sem apagar o token: `DELETE /pacientes/:id/qr`
- [x] Reativar: gera um token novo e volta `qr_ativo = TRUE`: `POST /pacientes/:id/qr/reativar`
- [x] `entidade/FichaEmergencia.ts`, que ordena alergias e contatos e descarta remédio fora de uso
- [x] `models/dto/emergencia/FichaEmergenciaResponseDTO.ts`, só com o necessário para socorrer
- [x] `repository/EmergenciaRepository.ts`
- [x] `infrastructure/emergenciaInfrastructure.ts`, com a busca pelo token e o registro da leitura
- [x] `services/EmergenciaService.ts`, montando a versão pública
- [x] Alergias em ordem de gravidade, a grave primeiro
- [x] Só remédio em uso
- [x] Contatos em ordem de prioridade
- [x] `controllers/emergenciaController.ts`
- [x] `routes/emergenciaRoutes.ts`, sem autenticação: `GET /api/emergencia/:token`
- [x] 404 para token que não existe e 410 para token cancelado, cada um com a sua tela
- [x] `GET /api/pacientes/:id/acessos`, com o histórico de leituras, mais recente primeiro, só para o dono
- [x] Revisamos campo por campo o que sai: nenhum email, senha, id ou token
- [x] Testamos com token inválido, válido e cancelado: 404, 200 e 410, com a leitura gravada em `acessos_qr`

O backend não gera imagem de QR. As telas têm o próprio gerador de QR Code (`js/qrcode.js`), sem biblioteca externa, e o backend só entrega o token.

O reativar **não** ressuscita o código antigo: gera outro. Se o chaveiro perdido voltasse a funcionar, cancelar não teria servido para nada.

**Entregou:** escanear o QR com o celular e ver a ficha abrir.

---

## Fase 7. Remédios

**Quem:** Daiane · **Quando:** 29/09 a 01/10

Começou depois da Fase 4 e correu em paralelo com as Fases 5 e 6 do Erik.

- [x] `valueObjects/Dosagem.ts`
- [x] `valueObjects/HorarioDose.ts`
- [x] `entidade/Medicamento.ts`
- [x] Os três DTOs de remédio
- [x] `repository/MedicamentoRepository.ts`
- [x] `infrastructure/medicamentoInfrastructure.ts`, com o SQL que já estava testado no Workbench
- [x] `services/MedicamentoService.ts`, chamando `autorizacaoService.garantirDono` antes de ler ou gravar
- [x] Campo `proximaDose` na resposta: a primeira dose prevista com horário no futuro, ou `null`
- [x] `controllers/medicamentoController.ts`
- [x] `routes/medicamentoRoutes.ts`
- [x] Testamos o cadastro, a leitura, a alteração e a remoção pelo `requests.http`
- [x] Abrimos a tela de remédios no navegador e vimos a lista real

**Entregou:** os remédios completos, sempre conferindo o dono da ficha.

---

## Fase 8. Doses e adesão

**Quem:** Daiane, com as regras de dose decididas junto com o Erik · **Quando:** 01/10 a 02/10

- [x] `entidade/Dose.ts`, com as situações prevista, tomada e perdida
- [x] A agenda gerada sozinha quando um remédio é cadastrado
- [x] Os três DTOs de dose
- [x] `repository/DoseRepository.ts`
- [x] `infrastructure/doseInfrastructure.ts`
- [x] `services/DoseService.ts`, com a tolerância e o cálculo de adesão, chamando `autorizacaoService.garantirAcompanhamento`
- [x] Confirmar dose perdida também, que é o botão "Tomei mesmo assim"
- [x] Dose do futuro fora da conta da adesão, senão o dia começaria em 0% e assustaria a pessoa à toa
- [x] `controllers/doseController.ts`
- [x] `routes/doseRoutes.ts`: `GET /doses/hoje`, `GET /doses/adesao` e `POST /doses/:id/confirmar`
- [x] Cadastramos um remédio, confirmamos uma dose e vimos a adesão mudar, num banco separado
- [x] Abrimos a tela de doses e vimos a barra de adesão andar
- [x] Rodamos nos nossos bancos o `ALTER TABLE doses` que tornou a agenda única, sem dose repetida
- [x] O painel do cuidador completa a agenda de cada paciente antes de ler as doses
- [x] Botão de suspender e reativar remédio na tela de remédios

As nove dúvidas do [`DUVIDAS_CONTRATO.md`](DUVIDAS_CONTRATO.md) foram decididas e implementadas aqui, entre elas a tolerância de 60 minutos para a dose virar perdida e a confirmação a partir de 60 minutos antes do horário.

**Entregou:** o lembrete de remédio funcionando de ponta a ponta.

---

## Fase 9. Modo cuidador

**Quem:** Daiane · **Quando:** 28/09 a 02/10

- [x] `entidade/Cuidador.ts`
- [x] Os dois DTOs de cuidador
- [x] `repository/CuidadorRepository.ts`
- [x] `infrastructure/cuidadorInfrastructure.ts`
- [x] `services/CuidadorService.ts`, com o vínculo aceito só por um código válido e o cuidador sempre igual a quem está logado
- [x] Desfazer o vínculo marca `ativo = FALSE` em vez de apagar a linha, porque quem teve acesso a dado de saúde precisa ficar registrado
- [x] `controllers/cuidadorController.ts`
- [x] `routes/cuidadorRoutes.ts`
- [x] Testamos que um cuidador sem vínculo não vê nada
- [x] Conferimos que o cuidador recebe adesão e próxima dose, mas **não** recebe a ficha médica nem o histórico de acessos

**Entregou:** o backend completo, com as três funcionalidades existindo de verdade.

---

## Fase 10. Telas

**Quem:** Erik · **Quando:** 19/09 a 24/09

Oito telas: entrada, cadastro, ficha (com as abas QR Code, Ficha médica e Privacidade), etiquetas, remédios, doses, cuidador e a ficha pública de emergência. Passaram por uma bateria automática no navegador, sem erro de JavaScript e sem nada estourando a tela em larguras de 320, 390, 768 e 1280 pixels.

- [x] `js/api.js`, que concentra as chamadas à API
- [x] `js/config.js`, com o modo (auto, api ou demo)
- [x] `js/ui.js`, com a guarda de sessão, a navegação, os recados e a formatação
- [x] `js/demo.js`, com os dados fictícios do modo demonstração
- [x] `js/qrcode.js`, o gerador de QR Code do projeto
- [x] `style.css`, com a paleta e os componentes
- [x] `index.html` e `js/login.js`
- [x] `pages/cadastro.html` e `js/cadastro.js`
- [x] `pages/perfil.html` e `js/perfil.js`, com o QR em destaque
- [x] Cancelamento e troca do QR Code na tela da ficha
- [x] `pages/imprimir.html` e `js/imprimir.js`, com a folha A4 de etiquetas
- [x] `pages/medicamentos.html` e `js/medicamentos.js`
- [x] `pages/doses.html` e `js/doses.js`, com a barra de adesão
- [x] `pages/cuidador.html` e `js/cuidador.js`
- [x] `pages/emergencia.html` e `js/emergencia.js`
- [x] `frontEnd/CONTRATO_API.md`, com o contrato de todas as rotas, escrito antes do backend
- [x] Testamos a página de emergência num celular de verdade, e não só no navegador do computador

**Entregou:** o app navegável de ponta a ponta, primeiro com dados fictícios e depois com o backend.

---

## Fase 11. Acabamento e acessibilidade

**Quem:** Erik · **Quando:** 01/10 a 02/10

- [x] Letra grande e contraste alto em tudo, pensando no idoso
- [x] Recado amigável no lugar do `alert`
- [x] Estado de carregando nas telas que buscam dado
- [x] Ficha de emergência legível em três segundos, com alergia em vermelho
- [x] Revisão de LGPD no backend: nada de registrar corpo de ficha médica, e o registro de leituras gravando
- [x] Só dado fictício no repositório
- [x] `README.md` com prints, descrição e instruções de instalação
- [x] O modo demonstração explicado no README
- [x] Repositório público

### Acessibilidade

- [x] `frontEnd/js/acessibilidade.js`, com o botão de acessibilidade em todas as telas, menos a de etiquetas
- [x] Botão pequeno e redondo, com o símbolo de acessibilidade, que abre as opções ao toque
- [x] Botões A menos e A mais, com quatro tamanhos de letra, guardando a escolha no aparelho
- [x] Contraste reforçado: texto preto, bordas mais escuras e coral mais fechado
- [x] Classe `letra-grande` no `style.css`: com a letra aumentada, os blocos lado a lado viram coluna
- [x] Passamos por todas as telas com a letra no tamanho máximo e com o contraste ligado
- [x] Conferimos as janelas que abrem por cima da tela (novo remédio e cancelar QR) com a letra aumentada, e corrigimos a data cortada e os cartões de período passando da borda
- [x] Conferimos num celular de verdade

Antes do ajuste, o nome do paciente e o da alergia quebravam letra por letra na ficha de emergência, e o botão Sair saía da tela. A leitura em voz alta chegou a ser testada e foi retirada: ficou só o que a pessoa controla com um toque.

**Entregou:** o app pronto para quem tem baixa visão.

---

## Fase 12. Demonstração e mesa de QR Codes

**Quem:** os dois · **Quando:** a partir de 03/10

Os dados fictícios do `database/dados_ficticios.sql` contam a história da apresentação: a Maria em dia, o Lucas com doses perdidas, a Joana com alergias graves, o Roberto com o QR cancelado e a Patrícia como cuidadora.

- [x] Banco com um caso de exemplo bom para gravar · Daiane
- [x] Três perfis fictícios novos para a mesa, com código de QR fixo no script (06/10): o Davi, autista que não fala e pode se perder; o Diego, motoboy; e a Renata, ciclista com diabetes tipo 1
- [x] O `dados_ficticios.sql` passou a apagar e recriar só as contas `@exemplo.com`. Antes ele apagava todas, e rodar o script na véspera teria trocado o QR das fichas reais da equipe
- [x] Escolhemos os cinco QR Codes da apresentação: Maria, Davi, Renata, Erik e Daiane, com o Diego de reserva (lista no README)
- [x] Daiane criar a ficha dela no app, no servidor do evento
- [x] Imprimir a folha de etiquetas e colar uma num chaveiro para aparecer na demonstração · Erik
- [x] Gravar o fluxo completo: cadastro, ficha, QR, escanear com o celular, remédio, alarme e dose · Erik
- [x] Gravar o corte do cancelamento: escaneia e abre, cancela no app, escaneia de novo e aparece o aviso · Erik
- [ ] Guardar o vídeo, que serve para a apresentação, para o portfólio e para o LinkedIn

O corte do cancelamento é o melhor momento do vídeo: é ele que mostra que existe um produto pensado ali, e não só um cadastro com QR Code em cima.

### Mesa de QR Codes no dia do evento

A ideia é deixar QR Codes de pacientes fictícios na mesa para o visitante escanear com o próprio celular. O plano completo está no [`DIA_DO_EVENTO.md`](DIA_DO_EVENTO.md).

- [x] Servidor no notebook do Erik com o Tailscale Funnel (Fase 17)
- [x] Nome da máquina e da rede escolhidos no Tailscale: o endereço ficou `https://bioshield.bonito-tench.ts.net`
- [x] Endereço público no QR, no histórico de acessos e no app, pelo `URL_PUBLICA` do `.env`
- [x] Endereço do QR montado sozinho a partir do servidor, sem precisar mexer no `config.js`
- [x] BioShield aberto pelo 4G antes de gerar qualquer QR (o app no celular do Erik, com o wifi desligado)
- [x] Trocar a senha das contas fictícias: desde 07/10, todas as contas de demonstração usam a senha padrão `@Senac_empreenda2026`, já gravada no `dados_ficticios.sql` · Erik
- [x] Criar as contas do Erik e da Daiane no servidor do evento (`erik@bioshield.com` e `daiane@bioshield.com`), com a mesma senha padrão · Erik
- [x] Trocar os emails das contas fictícias para o primeiro nome com `@bioshield.com` (`maria@bioshield.com`, `davi@bioshield.com`, `renata@bioshield.com` e as outras), no banco do evento, no script e no modo demonstração. Como agora as fictícias e as da equipe terminam igual, o `dados_ficticios.sql` passou a apagar as fictícias pela lista exata dos oito emails, e não mais pelo final do email · Erik
- [x] Só então gerar e imprimir os QR Codes
- [x] Testar cada papel com dois celulares no 4G
- [x] Depois de impresso, ninguém troca, cancela nem recria paciente da mesa
- [x] Separar o papel do Roberto, com o QR cancelado, para mostrar o aviso
- [x] Deixar o plano B pronto: vídeo, modo demonstração no notebook e prints

**Vai entregar:** a apresentação e a mesa de QR Codes funcionando no Empreenda.

---

## Fase 13. Testes com Jest

**Quem:** Daiane e Erik · **Quando:** 03/10 a 04/10

Testes no mesmo formato da aula (`describe`, `test` e `expect`), testando value objects e entidades. Eles não falam com o banco, então não precisam de nada falso. São 8 arquivos e 45 testes, e rodam com `npm test` na pasta `backend`.

### Preparação

- [x] Instalamos juntos, num commit só, o `jest`, o `@types/jest` e o transformador de TypeScript. O `ts-jest` da aula não aceitou o TypeScript 7 do projeto, então usamos o `@swc/core` com o `@swc/jest`
- [x] Script `"test": "jest"` no `backend/package.json`
- [x] Pasta `backend/tests/`, com o primeiro arquivo rodando

### Os testes

- [x] `tests/valueObjects/Email.test.ts` · Erik
  - [x] Aceita email válido e guarda em minúsculo (`" Maria@Exemplo.COM "` vira `"maria@exemplo.com"`)
  - [x] Recusa email inválido (`"semarroba"`, `"a@b.c"`, `"maria teste@exemplo.com"`)
  - [x] `igualA` compara pelo valor
- [x] `tests/valueObjects/Senha.test.ts` · Erik
  - [x] Aceita senha com 8 caracteres, maiúscula, minúscula, número e caractere especial
  - [x] Recusa senha curta, sem maiúscula, sem minúscula, sem número e sem caractere especial
  - [x] `String(senha)` mostra só `********`, nunca a senha
- [x] `tests/valueObjects/TipoSanguineo.test.ts` · Erik
  - [x] Aceita os oito tipos e normaliza `" ab- "` para `"AB-"`
  - [x] Recusa `"0+"` com zero, `"C+"` e `"A"`
  - [x] `TipoSanguineo.opcional("")` devolve `null`
- [x] `tests/valueObjects/Telefone.test.ts` · Erik
  - [x] `"(11) 98765-4321"`, com a máscara, vira `"11987654321"`
  - [x] Recusa número curto, DDD `01` e celular sem o 9
- [x] `tests/valueObjects/TokenQR.test.ts` · Daiane
  - [x] `gerar()` devolve 32 caracteres hexadecimais
  - [x] Dois tokens gerados são diferentes
  - [x] `aPartirDoValor` recusa texto que não é token (`"abc"`)
- [x] `tests/entidade/Alergia.test.ts` · Daiane
  - [x] Sem gravidade, a alergia fica `"moderada"`
  - [x] Recusa gravidade `"fatal"` e substância vazia
- [x] `tests/entidade/FichaEmergencia.test.ts` · Daiane
  - [x] Alergia grave aparece antes da leve
  - [x] Remédio com `ativo: false` não aparece na ficha
- [x] `tests/entidade/Cuidador.test.ts` · Daiane
  - [x] `desvincular()` deixa o vínculo inativo
  - [x] Desvincular duas vezes dá erro

**Entregou:** `npm test` passando com os oito arquivos. Conferido de novo em 06/10: 45 de 45.

---

## Fase 14. App Android

**Quem:** Erik e Daiane · **Quando:** 02/10 a 04/10

As telas empacotadas como app com o Capacitor. O passo a passo está no [`GUIA_APK.md`](GUIA_APK.md).

- [x] Capacitor instalado na raiz, com o `capacitor.config.json` e a pasta `android/`
- [x] Ícone e tela de abertura do BioShield no projeto Android
- [x] Backend entregando as telas e a API na mesma porta, para o site, o app e o QR usarem um endereço só
- [x] Quadro Servidor na tela de entrada, para escrever dentro do app o endereço do servidor
- [x] QR Code sempre com o endereço de rede do servidor, nunca com `localhost`
- [x] Sessão vencida volta para a tela de entrada, com aviso
- [x] Abrimos a pasta `android/` no Android Studio e compilamos; o APK rodou num celular virtual
- [x] Instalamos o APK num celular de verdade e passamos por todas as telas
- [x] Testamos o botão Voltar do celular em cada tela
- [x] Notificação na hora do remédio com o `@capacitor/local-notifications`, que virou o alarme dos remédios da Fase 15

**Entregou:** o app Android instalado e funcionando.

---

## Fase 15. Versão 1.0

**Quem:** Erik · **Quando:** 04/10

Uma revisão geral do app, de ponta a ponta, antes da apresentação.

- [x] Botão Voltar do Android funcionando (antes ele fechava o app em qualquer tela)
- [x] Ficha médica salvando sem alergia ou sem contato (antes o navegador barrava as linhas em branco)
- [x] Aviso quando um contato fica sem telefone
- [x] Aviso claro quando o servidor está fora do ar
- [x] Alarme dos remédios: aviso no celular na hora da dose, repetido a cada 5 minutos até a confirmação, com os botões Tomei e Lembrar em 5 min, funcionando com o app fechado, no servidor e na demonstração
- [x] Rota `GET /api/doses/proximas`, que alimenta o alarme
- [x] APK compilado e testado num celular virtual, incluindo o alarme com o app fechado

**Entregou:** a versão 1.0, com as três funcionalidades completas no site e no app.

---

## Fase 16. Aviso de dose perdida no celular do cuidador

**Quem:** Erik · **Quando:** 05/10

Até aqui, o cuidador só via as doses perdidas se abrisse o painel. Para quem acompanha um pai idoso de longe, isso não basta: o celular precisava avisar sozinho.

- [x] Rota `GET /api/cuidadores/:id/alertas`: as doses perdidas das últimas 24 horas de quem o cuidador acompanha, só as de depois do vínculo, e os próximos momentos em que vale conferir de novo
- [x] Sai só quem, qual remédio e de que horário. Nada da ficha médica
- [x] `DosePerdidaCuidadorDTO` e `AlertasCuidadorResponseDTO`
- [x] Plugin nativo do projeto, o `BioShieldCuidador` (`CuidadorPlugin.java`), com `configurar`, `mostrarAlertas` e `desligar`
- [x] `VerificadorCuidador.java`: consulta o servidor, mostra um aviso por dose perdida e marca um alarme exato para o momento em que cada dose vira perdida
- [x] Checagem periódica pelo agendador do Android (`CuidadorChecagem.java`), que volta sozinha depois que o celular reinicia
- [x] `CuidadorAlarme.java`, que roda quando um alarme exato toca
- [x] `frontEnd/js/avisosCuidador.js`, que liga o lado nativo e, no navegador, mostra o aviso enquanto a tela está aberta
- [x] Cartão dos avisos na tela do Cuidador, com o estado da permissão
- [x] O modo demonstração responde do mesmo jeito
- [x] Testamos: 27 de 27 conferências no celular virtual e 16 de 16 no navegador

Escolhemos não usar o plugin oficial de tarefa em segundo plano porque ele só roda com internet, e o aviso precisa funcionar também com o servidor numa rede local.

**Entregou:** o celular do cuidador avisando, mesmo com o app fechado, quando alguém passa 1 hora sem confirmar uma dose.

---

## Fase 17. Servidor na internet com o Tailscale Funnel

**Quem:** Erik, com o plano decidido pelos dois · **Quando:** 05/10 e 06/10

**Por que fizemos.** Até a versão 1.0, o QR Code só abria para quem estivesse no mesmo wifi do servidor. Na mesa do Empreenda, o visitante escaneia com o próprio celular, quase sempre no 4G, e não ia entrar numa rede antes. Precisávamos de um endereço na internet, sem pagar hospedagem.

**O que escolhemos.** O Tailscale Funnel. Ele dá ao notebook do Erik um endereço público, já com HTTPS, e leva os acessos até a porta 3000. É grátis, não precisa abrir porta no roteador e, o mais importante, o endereço não muda quando a rede muda: o notebook pode estar no wifi do Senac, num cabo ou no 4G de um celular, e os QR Codes impressos continuam abrindo. O preço é depender da internet do notebook e de um serviço de fora.

### Preparação no código (05/10)

- [x] `URL_PUBLICA` no `.env`: o endereço que vai dentro do QR Code
- [x] `/api/status` passou a dizer se o banco respondeu, para conferir o servidor abrindo o endereço no celular
- [x] O backend confia no aviso de IP só quando o acesso vem do próprio notebook, que é como o Funnel entrega. Assim o histórico de leituras grava o IP verdadeiro de quem escaneou, e um celular do wifi não consegue inventar um IP
- [x] Aviso no terminal quando o `JWT_SECRET` está fraco, porque com o Funnel o login fica aberto na internet
- [x] O app aceita endereço terminado em `.ts.net`, com ou sem `https://`
- [x] A ficha e a folha de etiquetas avisam quando o QR sairia com um endereço que só abre no wifi
- [x] O guia completo, passo a passo, no [`SERVIDOR_ONLINE.md`](SERVIDOR_ONLINE.md)

### Montagem no notebook (05/10 e 06/10)

- [x] Conferimos o BioShield rodando no notebook: MySQL do XAMPP ligado, `/api/status` com `"banco":"ok"` e o login da Maria funcionando
- [x] Instalamos o Tailscale (versão 1.102.4) e entramos com a conta do Erik
- [x] Trocamos o nome da máquina de `desktop-tl9qnkl` para `bioshield`, com o comando `tailscale set --hostname=bioshield`
- [x] Trocamos o nome da rede, que vinha sorteado (`tail516bc2`), por um nome amigável. No painel do Tailscale, sorteamos algumas listas de nomes e escolhemos `bonito-tench`: "bonito" é palavra nossa, fácil de lembrar e de ditar
- [x] Fizemos a troca do nome **antes** de ligar o Funnel. Pela documentação do Tailscale, depois que o nome é usado no HTTPS ele fica preso à conta e não dá para sortear outro
- [x] Colocamos o endereço no `URL_PUBLICA` do `.env` e reiniciamos o backend. O terminal passou a mostrar `https://bioshield.bonito-tench.ts.net` como o endereço do QR Code
- [x] Ligamos o Funnel com `tailscale funnel --bg 3000` e aceitamos a liberação no link que ele mostrou. O comando curto não funcionou no terminal do VS Code, porque ele tinha sido aberto antes da instalação; rodamos pelo caminho completo do programa
- [x] Conferimos o endereço pelo próprio notebook e por um servidor de fora, pela internet: `"banco":"ok"` e a tela de entrada abrindo
- [x] Deixamos o backend numa janela própria do PowerShell, sem depender de mais nada aberto
- [x] Geramos um APK novo, porque o app que estava no celular era antigo e não entendia endereço `.ts.net`
- [x] Testamos o app no celular do Erik com o wifi desligado: conectou pelo 4G e entrou na conta
- [x] Conferimos que a suspensão do notebook na tomada já estava em "Nunca"

### O que ainda falta desta fase

- [ ] Escanear um QR com outro celular, também no 4G, e ver a leitura aparecer na aba Privacidade com o IP de quem escaneou
- [x] Trocar a senha das contas fictícias (passo 8 do `SERVIDOR_ONLINE.md`): senha padrão em todas as contas de demonstração, em 07/10
- [ ] Deixar o MySQL ligando sozinho ao abrir o XAMPP e conferir o que o notebook faz ao fechar a tampa
- [ ] Pausar as atualizações do Windows na semana do evento

**Entregou:** o BioShield na internet, em `https://bioshield.bonito-tench.ts.net`, enquanto o notebook estiver ligado com o backend rodando. O QR Code passou a abrir em qualquer celular com internet.

---

## Fase 18. Etiquetas no celular e endereço pronto no app

**Quem:** Daiane (botão da ficha) e Erik (etiquetas no app e endereço) · **Quando:** 05/10 e 06/10

**Por que fizemos.** A folha de etiquetas só funcionava no navegador do computador. No app aparecia o recado "abra o BioShield no navegador de um computador", porque a janela do app não imprime nem baixa arquivo sozinha. E, a cada instalação, era preciso digitar o endereço do servidor à mão.

- [x] Botão de imprimir em destaque no cartão do QR, na tela da ficha · Daiane, 05/10
- [x] No app, o recado do computador deu lugar ao botão **Imprimir ou baixar etiquetas**
- [x] Tela de etiquetas refeita pensando primeiro no celular: o que vai escrito, os modelos, imprimir ou baixar e a prévia da folha
- [x] Frase de destaque que a pessoa escreve. Em branco, sai "EM CASO DE EMERGÊNCIA ESCANEIE ME"
- [x] Informação extra opcional, como "diabética, usa insulina", no cartão e no adesivo grande
- [x] Frase longa encolhe para caber e nunca vaza da etiqueta
- [x] Um desenhista só para as etiquetas, o `js/etiquetas.js`. A prévia, a impressão, o PDF e as imagens saem do mesmo desenho, então o que a pessoa vê na tela é o que sai no papel
- [x] **Baixar PDF da folha:** um PDF A4 no tamanho real, montado no próprio navegador, sem biblioteca
- [x] **Imagem** de cada modelo em alta resolução, para mandar para uma gráfica ou por mensagem
- [x] Plugin nativo do projeto, o `BioShieldArquivos` (`ArquivosPlugin.java`): abre a impressão do Android, salva na pasta Download/BioShield, abre o arquivo salvo e abre a janela de compartilhar
- [x] Endereço do servidor já escrito na tela de entrada do app (`SERVIDOR_SUGERIDO` no `config.js`). Com o app recém instalado, o quadro Servidor aparece no topo, com o endereço pronto, e basta tocar em **Testar e salvar**
- [x] Testamos no navegador, num celular simulado e no computador: 27 de 27 conferências, com um leitor de QR independente lendo as 17 etiquetas do PDF e as imagens dos 4 modelos
- [x] Testamos o caminho do app no navegador, com uma ponte falsa do Android: 23 de 23 conferências, com o endereço pronto conectando no servidor de verdade
- [x] Testamos o app no celular virtual: o PDF foi salvo na pasta Download/BioShield, e as 17 etiquetas do arquivo tirado do celular foram lidas; o compartilhar, o abrir e a impressão do Android também funcionaram, e o botão Voltar volta da tela de etiquetas para a ficha

**Entregou:** imprimir, salvar em PDF e baixar as etiquetas direto do celular, e o app conectando no servidor com um toque.
