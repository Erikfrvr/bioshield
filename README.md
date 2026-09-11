# BioShield

> Aplicativo de saúde preventiva e segurança medicamentosa. Um QR Code que mostra as informações vitais de alguém quando essa pessoa não consegue falar por si.

![Status](https://img.shields.io/badge/status-em%20desenvolvimento-yellow)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?logo=express&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?logo=mysql&logoColor=white)

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
│   ├── config/            conexão com o banco
│   ├── routes/            caminhos da API
│   ├── controllers/       entrada e saída HTTP
│   ├── services/          regra de negócio
│   ├── repository/        interfaces dos repositórios
│   ├── infrastructure/    implementações MySQL
│   ├── models/            entidades, value objects e DTOs
│   └── server.ts
├── database/              schema e dados de teste
└── frontEnd/              telas do app
```

## Como rodar

Pré requisitos: Node.js 20 ou superior e MySQL 8.0.16 ou superior.

```bash
git clone https://github.com/Erikfrvr/bioshield.git
cd bioshield/backend
npm install
```

Crie o banco executando, nesta ordem, os scripts `database/bioshield.sql` e `database/dados_teste.sql`.

Configure o ambiente:

```bash
cp .env.example .env
```

Preencha o `.env` com os dados do seu MySQL e suba o servidor:

```bash
npm run dev
```

A API responde em `http://localhost:3000/api`.

Para o front, abra `frontEnd/index.html` com a extensão Live Server do VS Code.

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

Em desenvolvimento. O andamento por fase está em [`ROADMAP.md`](ROADMAP.md).

- [x] Estrutura do projeto
- [x] Modelagem e dicionário de dados
- [ ] Banco de dados
- [ ] Cadastro e autenticação
- [ ] Ficha médica
- [ ] QR Code de emergência
- [ ] Medicamentos e doses
- [ ] Modo cuidador
- [ ] Interface

## Contexto

Projeto desenvolvido para o Empreenda Senac 2026, na categoria Cursos Técnicos, dentro do Curso Técnico em Informática do Senac SP.

Áreas de atuação: Saúde Preventiva e Segurança Medicamentosa. Alinhado aos ODS 3 (Saúde e Bem Estar), 10 (Redução das Desigualdades) e 17 (Parcerias e Meios de Implementação).

## Equipe

**Erik Mauricio Silva** — [@Erikfrvr](https://github.com/Erikfrvr)
**Daiane Duarte**

## Licença

MIT
