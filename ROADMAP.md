# Roadmap BioShield

Ordem de construção do projeto. Cada fase depende da anterior.
Marque o `[ ]` conforme terminar. Se travar numa fase, não pule: o que vem depois usa ela.

**Regra que vale para tudo:** construa uma fatia vertical de cada vez. Um domínio inteiro do value object até a rota, testado no `requests.http`, antes de começar o próximo. Nada de fazer todos os controllers e depois todos os services.

---

## Fase 0 — Preparar o terreno

- [x] Criar o repositório `bioshield` no GitHub (conta Erikfrvr), privado por enquanto
- [x] Jogar o esqueleto dentro e fazer o primeiro commit
- [x] Conferir se o `.gitignore` está pegando `node_modules/` e `.env`
- [X] `cd backend && npm install`
- [X] Copiar `.env.example` para `.env` e preencher com os dados do seu MySQL
- [X] Criar o banco vazio `bioshield` no Workbench

**Marco 0:** repositório no ar e ambiente pronto.

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

**Marco 1:** banco criado e populado com dado de teste.

---

## Fase 2 — Fundação do backend

- [x] `config/db.ts`: pool do mysql2 lendo o `.env` e teste de conexão no boot
- [ ] `server.ts`: express, dotenv, cors, `express.json()` e o listen
- [ ] Subir com `npm run dev` e ver a mensagem de conexão bem sucedida no terminal
- [ ] Criar uma rota boba `GET /api/status` só para confirmar que a API responde
- [ ] Testar essa rota pelo `requests.http`

**Marco 2:** servidor de pé conversando com o banco.

---

## Fase 3 — Usuário (a fatia molde)

Esta é a fase mais importante do roadmap. Ela vira o molde de todas as outras. Capriche aqui.

- [ ] `models/valueObjects/Email.ts`
- [ ] `models/valueObjects/Senha.ts`
- [ ] `models/entidade/Usuario.ts`
- [ ] `models/dto/usuario/CadastrarUsuarioDTO.ts`
- [ ] `models/dto/usuario/LoginUsuarioDTO.ts`
- [ ] `models/dto/usuario/UsuarioResponseDTO.ts`
- [ ] `repository/UsuarioRepository.ts` (só a interface)
- [ ] `infrastructure/usuarioInfrastructure.ts` (o SQL)
- [ ] `npm install bcryptjs` e os tipos
- [ ] `services/UsuarioService.ts` com hash da senha e checagem de email repetido
- [ ] `controllers/usuarioController.ts`
- [ ] `routes/usuarioRoutes.ts` e registrar no `server.ts`
- [ ] Bloco de teste no `requests.http`
- [ ] Cadastrar um usuário e conferir no Workbench se a senha gravou como hash
- [ ] Tentar cadastrar o mesmo email duas vezes e ver se o erro sobe direito

**Marco 3:** consigo criar conta pela API. O molde das camadas está fechado.

---

## Fase 4 — Autenticação

- [ ] `npm install jsonwebtoken` e os tipos
- [ ] Método de login no `UsuarioService` comparando o hash
- [ ] Gerar o token JWT com o id do usuário dentro
- [ ] Criar `middleware/autenticacao.ts` que lê o header e libera ou barra
- [ ] Aplicar o middleware nas rotas que precisam de login
- [ ] Testar rota protegida sem token (tem que dar 401) e com token (tem que passar)

**Marco 4:** login funcionando e rotas protegidas.

---

## Fase 5 — Ficha médica

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
- [ ] Testar criar, ler e atualizar a ficha pelo `requests.http`
- [ ] Conferir que o `PacienteResponseDTO` não está devolvendo senha nem nada de fora

**Marco 5:** ficha médica completa salvando e lendo.

---

## Fase 6 — QR Code e emergência

O coração do produto. Sem isso o BioShield é só mais um app de lembrete.

- [ ] `valueObjects/TokenQR.ts` com token aleatório grande e imprevisível
- [ ] Gerar o token no `PacienteService` na hora de criar a ficha
- [ ] Método de rotacionar o token (gera novo e invalida o antigo)
- [ ] `entidade/FichaEmergencia.ts`
- [ ] `models/dto/emergencia/FichaEmergenciaResponseDTO.ts` com o mínimo necessário
- [ ] `repository/EmergenciaRepository.ts`
- [ ] `infrastructure/emergenciaInfrastructure.ts` com a busca por token e o log de acesso
- [ ] `services/EmergenciaService.ts` montando a versão pública filtrada
- [ ] `controllers/emergenciaController.ts`
- [ ] `routes/emergenciaRoutes.ts` sem o middleware de autenticação
- [ ] `npm install qrcode` e gerar a imagem do QR apontando para a URL da ficha
- [ ] Revisar campo por campo do que sai: nenhum email, senha ou dado sobrando
- [ ] Testar com um token inválido e ver se devolve 404 limpo

**Marco 6:** escaneio o QR com o celular e a ficha abre.

---

## Fase 7 — Medicamentos

- [ ] `valueObjects/Dosagem.ts`
- [ ] `valueObjects/HorarioDose.ts`
- [ ] `entidade/Medicamento.ts`
- [ ] Os três DTOs de medicamento
- [ ] `repository/MedicamentoRepository.ts`
- [ ] `infrastructure/medicamentoInfrastructure.ts`
- [ ] `services/MedicamentoService.ts`
- [ ] `controllers/medicamentoController.ts`
- [ ] `routes/medicamentoRoutes.ts`
- [ ] Testar o CRUD inteiro pelo `requests.http`

---

## Fase 8 — Doses e adesão

- [ ] `entidade/Dose.ts` com os status previsto, tomada e perdida
- [ ] Geração automática da agenda quando um medicamento é cadastrado
- [ ] Os três DTOs de dose
- [ ] `repository/DoseRepository.ts`
- [ ] `infrastructure/doseInfrastructure.ts`
- [ ] `services/DoseService.ts` com a janela de tolerância e o cálculo de adesão
- [ ] `controllers/doseController.ts`
- [ ] `routes/doseRoutes.ts`
- [ ] Cadastrar um remédio, confirmar uma dose e conferir se a adesão mudou

**Marco 7:** lembrete de medicamento fechado de ponta a ponta.

---

## Fase 9 — Modo cuidador

- [ ] Geração do código de autorização pelo paciente
- [ ] `entidade/Cuidador.ts`
- [ ] Os dois DTOs de cuidador
- [ ] `repository/CuidadorRepository.ts`
- [ ] `infrastructure/cuidadorInfrastructure.ts`
- [ ] `services/CuidadorService.ts` com a checagem de autorização
- [ ] `controllers/cuidadorController.ts`
- [ ] `routes/cuidadorRoutes.ts`
- [ ] Testar se um cuidador sem vínculo consegue ver dados (não pode)

**Marco 8:** backend completo. As três funcionalidades existem de verdade.

---

## Fase 10 — Front

Faça na ordem abaixo. A tela de emergência é a que mais importa, mas ela precisa do resto pronto para ter o que mostrar.

- [ ] `js/api.js` centralizando fetch, URL base e token
- [ ] `style.css` com a paleta e os componentes base
- [ ] `index.html` e `js/login.js`
- [ ] `pages/perfil.html`, `perfil.css` e `js/perfil.js` com o QR em destaque
- [ ] `pages/medicamentos.html`, `medicamentos.css` e `js/medicamentos.js`
- [ ] `pages/doses.html`, `doses.css` e `js/doses.js` com a barra de adesão
- [ ] `pages/cuidador.html`, `cuidador.css` e `js/cuidador.js`
- [ ] `pages/emergencia.html`, `emergencia.css` e `js/emergencia.js`
- [ ] Testar a página de emergência no celular de verdade, não só no navegador do PC

**Marco 9:** app navegável de ponta a ponta.

---

## Fase 11 — Acabamento

- [ ] Fonte grande e contraste alto em tudo, pensando no idoso
- [ ] Mensagem de erro amigável no lugar de `alert` seco
- [ ] Estado de carregando nas telas que buscam dado
- [ ] Tela de emergência legível em três segundos, alergia em vermelho
- [ ] Revisar LGPD: nada de logar corpo de ficha médica, log de acesso funcionando
- [ ] Trocar todo dado de teste real por dado fictício antes de publicar
- [ ] `README.md` com print, descrição e instruções de instalação
- [ ] Deixar o repositório público

---

## Fase 12 — Demonstração

- [ ] Popular o banco com um caso de exemplo bonito para gravar
- [ ] Gravar o screen recording do fluxo completo: cadastro, ficha, QR, escanear, remédio
- [ ] Guardar esse vídeo, ele serve para apresentação, portfólio e LinkedIn

---

## Painel de acompanhamento

| Marco | O que prova | Feito |
|---|---|---|
| 0 | Ambiente pronto | [ ] |
| 1 | Banco criado | [ ] |
| 2 | API de pé | [ ] |
| 3 | Cadastro funcionando | [ ] |
| 4 | Login e rotas protegidas | [ ] |
| 5 | Ficha médica salvando | [ ] |
| 6 | QR abrindo a ficha | [ ] |
| 7 | Lembrete de dose fechado | [ ] |
| 8 | Backend completo | [ ] |
| 9 | App navegável | [ ] |

---

## Se o tempo apertar

Corte nesta ordem, de trás para frente: Fase 12, depois a Fase 9 (cuidador) e depois a parte visual da Fase 11.

O que não pode ser cortado de jeito nenhum: Fases 1 a 6. Sem o QR de emergência funcionando não existe BioShield, existe um app de lembrete de remédio qualquer.
