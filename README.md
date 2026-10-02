# BioShield

> Aplicativo de saúde preventiva e segurança medicamentosa. Um QR Code que mostra as informações vitais de alguém quando essa pessoa não consegue falar por si.

![Status](https://img.shields.io/badge/status-em%20desenvolvimento-yellow)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?logo=express&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?logo=mysql&logoColor=white)

<p align="center">
  <img src="docs/img/emergencia.png" alt="Ficha de emergência aberta pelo QR Code, com alergias em vermelho, tipo sanguíneo, remédios em uso e botões para ligar" width="300">
  &nbsp;&nbsp;&nbsp;
  <img src="docs/img/login.png" alt="Tela de entrada do BioShield, com o aviso de modo demonstração" width="300">
</p>

<p align="center">
  À esquerda, a ficha que um desconhecido vê ao escanear o QR Code. À direita, a tela de entrada. As duas imagens usam dados fictícios do modo demonstração.
</p>

---

## O problema

Quando alguém desmaia, tem uma crise ou se perde na rua, quem chega primeiro não é o socorrista. É um desconhecido. E esse desconhecido não tem como saber se a pessoa é alérgica a dipirona, se tem epilepsia ou para quem ligar.

Existem pulseiras de identificação que tentam resolver isso, e Manaus chegou a criar uma lei municipal para distribuir pulseiras com QR Code a idosos e pessoas com deficiência. Mas elas são de gravação fixa: mudou o remédio, tem que trocar a pulseira.

O BioShield resolve por software. O usuário gera o próprio QR Code, atualiza os dados quando quiser e imprime onde preferir: cartão na carteira, adesivo, chaveiro ou pulseira.

## O que o app faz

**QR Code de emergência.** Quem escaneia vê alergias a medicamento, remédios em uso, tipo sanguíneo, condições de saúde e o contato de emergência com botão de ligar. Abre no navegador, sem login e sem instalar nada, porque quem escaneia é um estranho no meio de uma emergência.

**Lembrete de medicamentos.** Cadastro de remédio com dosagem e frequência, agenda de doses gerada automaticamente e confirmação de cada tomada, com percentual de adesão.

**Modo cuidador.** O familiar acompanha de longe se as doses estão sendo tomadas. O vínculo só existe depois de autorização explícita do paciente, e o cuidador vê acompanhamento sem editar a ficha médica.

## Público

Idosos, pessoas com doenças crônicas, pessoas com alergia severa a medicamento, pessoas autistas com maior necessidade de suporte e os cuidadores dessas pessoas.

Isso define as escolhas de interface: fonte grande, contraste alto, poucos passos por tela e nada de jargão médico.

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Backend | Node.js, Express, TypeScript |
| Banco | MySQL 8 com mysql2 e pool de conexão |
| Segurança | bcryptjs para o hash da senha e jsonwebtoken para a sessão |
| Front | HTML, CSS e JavaScript |
| Execução | tsx |

Sem ORM. O SQL é escrito na mão e fica isolado na camada de infraestrutura.

## Arquitetura

Arquitetura em camadas seguindo princípios de DDD e Clean Architecture. O caminho de uma requisição é sempre o mesmo:

```
rota  ->  controller  ->  service  ->  infrastructure  ->  banco
                            |
                            v
                  entidade + value object
```

| Camada | Responsabilidade |
|---|---|
| `routes/` | Mapeia o caminho HTTP para o controller |
| `middleware/` | Confere o token de sessão antes do controller |
| `controllers/` | Lê a requisição, chama o service, devolve a resposta |
| `services/` | Regra de negócio e orquestração |
| `repository/` | Interfaces que definem o contrato com o banco |
| `infrastructure/` | Implementação das interfaces com SQL |
| `models/entidade/` | Objetos de domínio |
| `models/valueObjects/` | Valores que se validam sozinhos |
| `models/dto/` | Contratos de entrada e saída |

A dependência aponta sempre para dentro. O service conhece a interface do repositório, nunca a implementação concreta.

## Estrutura de pastas

```
BioShield/
├── backend/
│   ├── config/            conexão com o banco e fuso horário
│   ├── routes/            caminhos da API
│   ├── middleware/        autenticação por token
│   ├── controllers/       entrada e saída HTTP
│   ├── services/          regra de negócio
│   ├── repository/        interfaces dos repositórios
│   ├── infrastructure/    implementações MySQL
│   ├── models/            entidades, value objects e DTOs
│   └── server.ts
├── android/               projeto do app Android, gerado pelo Capacitor
├── database/              schema e dados fictícios
├── docs/                  roadmap, dicionário detalhado e imagens
└── frontEnd/              telas do app
```

## Como rodar

### O que você precisa ter instalado

- Node.js 20 ou superior (22 ou superior para gerar o app Android)
- MySQL 8.0.16 ou superior (o do XAMPP serve)
- VS Code com a extensão REST Client, que é opcional

Estes passos são para o Windows. Para subir o servidor no Linux Mint, com os celulares acessando pelo roteador, o passo a passo está em [`docs/SERVIDOR_LINUX.md`](docs/SERVIDOR_LINUX.md).

### 1. Baixar o projeto

```bash
git clone https://github.com/Erikfrvr/bioshield.git
cd bioshield/backend
npm install
```

### 2. Criar o banco

Com o MySQL ligado, execute os dois scripts nesta ordem:

1. `database/bioshield.sql`, que cria o banco e as tabelas
2. `database/dados_ficticios.sql`, que preenche com pessoas inventadas para teste

Pode ser pelo phpMyAdmin, pelo MySQL Workbench ou pelo terminal:

```bash
mysql -u root -p < ../database/bioshield.sql
mysql -u root -p < ../database/dados_ficticios.sql
```

### 3. Configurar o ambiente

Ainda dentro da pasta `backend`:

```bash
cp .env.example .env
```

Abra o `.env` e preencha:

| Variável | Para que serve | Valor de exemplo |
|---|---|---|
| `DB_HOST` | Endereço do MySQL | `127.0.0.1` |
| `DB_USER` | Usuário do MySQL | `root` |
| `DB_PASSWORD` | Senha do MySQL | vazio no XAMPP |
| `DB_NAME` | Nome do banco | `bioshield` |
| `DB_PORT` | Porta do MySQL | `3306` |
| `PORT` | Porta do BioShield. Site, app e API usam a mesma | `3000` |
| `JWT_SECRET` | Segredo que assina o token de sessão | um texto longo e só seu |
| `URL_PUBLICA` | Opcional. Endereço de rede do servidor, o que vai dentro do QR Code. Vazio, o servidor descobre sozinho | vazio |

No XAMPP o usuário `root` vem sem senha, então nesse caso deixe `DB_PASSWORD=` vazio. O `.env` real nunca vai para o Git.

### 4. Subir o servidor

```bash
npm run dev
```

O mesmo servidor entrega a API e as telas, na mesma porta. O terminal mostra o endereço para usar neste computador e o endereço para os celulares da mesma rede:

```
Servidor rodando em http://localhost:3000
Nos celulares e nos outros computadores da mesma rede, use:
  http://192.168.0.10:3000
```

`npm run dev` reinicia sozinho quando um arquivo muda. Para deixar ligado sem isso, use `npm start`.

### 5. Abrir o BioShield

Abra `http://localhost:3000` no navegador. Não precisa de mais nada: o front é estático e quem entrega é o próprio backend.

Abrir o `frontEnd/index.html` pelo Live Server do VS Code continua funcionando. Nesse caso o front procura a API em `http://localhost:3000`.

Para testar as rotas sem o front, use o arquivo `backend/requests.http` com a extensão REST Client do VS Code. Cada bloco tem o status esperado escrito no comentário.

## Modo demonstração

O front consegue rodar sozinho, sem backend e sem banco. Nesse caso ele usa dados fictícios guardados no próprio navegador e avisa isso na tela: um cartão "Modo demonstração" na entrada e um selo no cabeçalho das outras páginas. Serve para apresentar o app, gravar vídeo ou mexer no front enquanto a API está fora do ar.

Quem decide é o campo `MODO` do arquivo `frontEnd/js/config.js`:

| MODO | O que acontece |
|---|---|
| `auto` | Padrão. O front procura o servidor. Se achar, usa a API. Se nenhum responder, cai no modo demonstração |
| `api` | Sempre a API. Se ela não responder, aparece erro na tela e o front não cai na demonstração |
| `demo` | Sempre a demonstração, mesmo com a API no ar |

O projeto vem com `MODO: "auto"`. O front procura o servidor nesta ordem: o endereço salvo no quadro Servidor da tela de entrada, o campo `SERVIDOR` do `config.js`, o endereço da própria página e, por último, `http://localhost:3000`. Só vale o endereço que responder em `GET /api/status`.

Duas proteções para a demonstração não enganar ninguém:

- Quem está logado em uma conta de verdade nunca cai nos dados fictícios. Se o servidor sumir, aparece o aviso de que não deu para falar com ele
- A ficha de emergência aberta por quem escaneou o QR nunca mostra paciente inventado. Sem servidor, aparece o aviso para ligar para a emergência

O que vale saber sobre o modo demonstração:

- Na tela de entrada aparecem contas de exemplo. Tocar numa delas preenche o formulário
- Tudo que você cadastra ou altera fica só no `sessionStorage` daquela aba do navegador e some quando ela é fechada. Nada vai para o banco
- Os dados são os mesmos personagens inventados do `database/dados_ficticios.sql`
- A página de emergência também funciona para quem está dentro de uma sessão de demonstração, então dá para mostrar a ficha aberta sem a API

## App Android

O mesmo front vira app Android com o Capacitor. O projeto nativo está na pasta `android/` e o passo a passo para gerar o APK pelo Android Studio está em [`docs/GUIA_APK.md`](docs/GUIA_APK.md).

```bash
npm install
npm run app:sync
npm run app:abrir
```

O app não leva o backend junto. Na primeira vez, a pessoa escreve o endereço do servidor no quadro Servidor da tela de entrada, e o celular precisa estar no mesmo wifi dele.

## Rotas prontas

Tirando as marcadas como públicas, todas pedem o header `Authorization: Bearer <token>`, com o token devolvido pelo login.

| Método | Rota | O que faz |
|---|---|---|
| `GET` | `/api/status` | Pública. Confirma que a API está de pé e informa o endereço de rede do servidor |
| `POST` | `/api/usuarios` | Pública. Cadastra uma conta com nome, email e senha |
| `POST` | `/api/usuarios/login` | Pública. Confere email e senha e devolve o token de sessão |
| `GET` | `/api/usuarios/:id` | Busca uma conta pelo id |
| `POST` | `/api/pacientes` | Cria a ficha médica |
| `GET` | `/api/pacientes/:id` | Busca a ficha médica |
| `PUT` | `/api/pacientes/:id` | Atualiza a ficha médica |
| `POST` | `/api/pacientes/:id/qr/rotacionar` | Gera um token novo de QR e invalida o anterior |
| `DELETE` | `/api/pacientes/:id/qr` | Cancela o QR |
| `POST` | `/api/pacientes/:id/qr/reativar` | Reativa o QR |
| `GET` | `/api/pacientes/:id/acessos` | Lista quem abriu a ficha pública |
| `POST` | `/api/pacientes/:id/codigo` | Gera o código de 7 caracteres que o paciente entrega ao cuidador, válido por 24 horas |
| `GET` | `/api/emergencia/:token` | Pública. Devolve a ficha de emergência do QR |
| `GET` | `/api/medicamentos` | Lista os medicamentos |
| `POST` | `/api/medicamentos` | Cadastra um medicamento |
| `PUT` | `/api/medicamentos/:id` | Atualiza um medicamento, suspende ou reativa, e refaz a agenda futura quando o horário muda |
| `DELETE` | `/api/medicamentos/:id` | Apaga um medicamento |
| `GET` | `/api/doses/hoje` | Lista as doses do dia, já marcando como perdida a que passou 60 minutos do horário |
| `POST` | `/api/doses/:id/confirmar` | Confirma que a dose foi tomada |
| `GET` | `/api/doses/adesao` | Percentual de adesão de hoje e dos últimos 7 dias |

A senha precisa ter pelo menos 8 caracteres, com letra maiúscula, letra minúscula, número e um caractere especial (`@ $ ! % * ? & #`). Ela é gravada só como hash bcrypt e nunca volta em nenhuma resposta. O email é guardado em minúsculo, então `Maria@Exemplo.com` e `maria@exemplo.com` são a mesma conta.

O contrato completo, com corpo de requisição, respostas e as rotas que ainda vão ser feitas, está em [`frontEnd/CONTRATO_API.md`](frontEnd/CONTRATO_API.md).

## Banco de dados

Oito tabelas. A documentação completa, campo por campo, está em [`database/DICIONARIO_DADOS.md`](database/DICIONARIO_DADOS.md).

```
usuarios 1 ─── 1 pacientes 1 ─── N alergias
                         1 ─── N contatos_emergencia
                         1 ─── N medicamentos 1 ─── N doses
                         1 ─── N acessos_qr
usuarios N ─── N pacientes  (via cuidador_paciente)
```

## Privacidade

O BioShield lida com dado sensível de saúde, e isso guia decisões de projeto:

- A ficha pública devolve apenas o que ajuda a socorrer. Email, senha e histórico completo nunca saem pela rota do QR
- Senha é armazenada com hash bcrypt
- O token do QR é aleatório e rotativo: o usuário pode invalidar o anterior quando quiser
- Todo acesso à ficha pública fica registrado e é visível para o dono da ficha
- O repositório contém apenas dados fictícios

## Status

Em desenvolvimento. O andamento por fase está em [`docs/ROADMAP.md`](docs/ROADMAP.md).

- [x] Estrutura do projeto
- [x] Modelagem e dicionário de dados
- [x] Banco de dados
- [x] Cadastro de usuário
- [x] Login e autenticação com JWT
- [x] Ficha médica
- [x] QR Code de emergência
- [x] Medicamentos
- [x] Doses e adesão
- [ ] Rotas do modo cuidador
- [x] Interface, navegável de ponta a ponta no modo demonstração

## Contexto

Projeto desenvolvido para o Empreenda Senac 2026, na categoria Cursos Técnicos, dentro do Curso Técnico em Informática do Senac SP.

Áreas de atuação: Saúde Preventiva e Segurança Medicamentosa. Alinhado aos ODS 3 (Saúde e Bem Estar), 10 (Redução das Desigualdades) e 17 (Parcerias e Meios de Implementação).

## Equipe

**Erik Mauricio Silva** — [@Erikfrvr](https://github.com/Erikfrvr)

**Daiane Duarte** — [@DaiHoss](https://github.com/DaiHoss)

## Licença

MIT
